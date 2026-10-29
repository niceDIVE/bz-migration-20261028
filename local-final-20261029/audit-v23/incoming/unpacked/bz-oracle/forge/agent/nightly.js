#!/usr/bin/env node
// 夜间生成循环：按注册表优先级取待办动作 → 调生成器写 handler → 离线回放 + 裁判 → FAIL 就把裁判意见喂回去重试（≤ --tries 次）→ 仍失败转人工。
// 每个动作都记录耗时、尝试次数、结果，tools/throughput.js 据此算真实吞吐（替代 c 单位估算）。
// node forge/agent/nightly.js --registry out/registry.json --recordings <case目录> --gen "<命令>" [--limit 20] [--tries 3]
//      [--loose] [--no-fuzz] [--no-strict-regress]（默认：静态闸 + 严格加载 + 存档域白名单 + 输入冻结 + fuzz + 回归判死 全开）
//      [--status GEN-READY,RULE,IMPL-FAIL] [--generated forge/generated] [--dsl ...] [--tables ...] [--rules ...] [--log out/nightly.jsonl]
// 生成器命令里可用占位符：{action} {out}（要写出的 handler 文件）{feedback}（上一轮裁判意见 JSON，首轮为空文件）{attempt}
// handler 文件格式：module.exports = { action: 'User.x', handler: withProjection(function (req, save) {...}) }
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const root = path.resolve(__dirname, '../..');
const { args, readJSON } = require(path.join(root, 'host/lib/util'));
const crypto = require('crypto');
const { replay } = require('../replay/replay');
const fuzz = require('../replay/fuzz');
const { gate } = require('../lib/gen-gate');

const a = args(process.argv.slice(2));
if (!a.registry || !a.recordings || !a.gen) { console.error('需要 --registry --recordings --gen'); process.exit(2); }
const reg = readJSON(a.registry);
const want = new Set(String(a.status || 'IMPL-FAIL,RULE,GEN-READY').split(','));
const recorded = new Set();
for (const f of require(path.join(root, 'host/lib/util')).listCases(a.recordings)) recorded.add(readJSON(f).action);
// 只做有录制样本的动作：没有样本就没有离线裁判输入（L4/回归都无从谈起）
let todo = reg.rows.filter(r => want.has(r.status) && recorded.has(r.action));
todo.sort((x, y) => y.hits - x.hits);
todo = todo.slice(0, +(a.limit || 20));
const genDir = path.resolve(a.generated || path.join(root, 'forge/generated'));
fs.mkdirSync(genDir, { recursive: true });
const log = a.log || path.join(root, 'out/nightly.jsonl');
const tries = +(a.tries || 3);
const results = [];
// 中层审计 A6：默认全开的闸门（--loose 关掉，仅供调试；关掉时日志里标 loose:true）
const loose = !!a.loose;
const strictRegress = !loose && !a['no-strict-regress'];
// 输入冻结：裁判依据（表、规则、契约、DSL、录制）在循环中不得被改动
const lockFiles = [a.tables, a.rules, a.contracts || path.join(root, 'out/contracts.json'), a.dsl, a.recordings, path.join(root, 'config/oracle.config.json')].filter(Boolean);
function hashTree(p) {
  if (!fs.existsSync(p)) return 'missing';
  const h = crypto.createHash('sha256');
  const st = fs.statSync(p);
  if (st.isDirectory()) for (const f of fs.readdirSync(p).sort()) h.update(f + ':' + hashTree(path.join(p, f)));
  else h.update(fs.readFileSync(p));
  return h.digest('hex');
}
const lock = Object.fromEntries(lockFiles.map(f => [f, hashTree(f)]));
function checkLock() { for (const [f, h] of Object.entries(lock)) if (hashTree(f) !== h) { console.error(`输入被改动：${f}——停止（中层审计 A6 输入冻结）`); process.exit(3); } }
const firstRec = {};
for (const f of require(path.join(root, 'host/lib/util')).listCases(a.recordings)) { const c = readJSON(f); if (!firstRec[c.action] && c.saveBefore) firstRec[c.action] = { file: f, c }; }
for (const r of todo) {
  const file = path.join(genDir, r.action.replace(/[^\w.]/g, '_') + '.js');
  const fb = path.join(genDir, '.feedback-' + r.action + '.json');
  fs.writeFileSync(fb, '{}');
  const t0 = Date.now();
  let outcome = 'HUMAN', attempts = 0, lastFails = [], genMs = 0, judgeMs = 0;
  for (let i = 1; i <= tries; i++) {
    attempts = i;
    const cmd = a.gen.replace(/\{action\}/g, r.action).replace(/\{out\}/g, file).replace(/\{feedback\}/g, fb).replace(/\{attempt\}/g, i);
    const g0 = Date.now();
    try { execSync(cmd, { stdio: 'pipe', timeout: +(a['gen-timeout'] || 600) * 1000 }); } catch (e) { lastFails = ['生成器失败：' + String(e.stderr || e.message).slice(0, 300)]; genMs += Date.now() - g0; continue; }
    genMs += Date.now() - g0;
    checkLock();
    // 静态闸：不过闸的文件不 require
    const g = fs.existsSync(file) ? gate(fs.readFileSync(file, 'utf8'), { action: r.action }) : { ok: false, why: ['生成器没有写出文件'] };
    if (!g.ok && !loose) { lastFails = g.why.map(x => '静态闸：' + x); fs.writeFileSync(fb, JSON.stringify({ attempt: i, fails: lastFails }, null, 2)); continue; }
    const j0 = Date.now();
    let rep;
    try { rep = replay({ recordings: a.recordings, action: r.action, generated: genDir, dsl: a.dsl, tables: a.tables, rules: a.rules, templates: a.templates, contracts: a.contracts, strictGenerated: !loose, requireSave: !loose }); }
    catch (e) { rep = { verdict: 'FAIL', perCase: [{ fails: ['回放异常：' + e.message] }], regress: [] }; }
    // 边界 fuzz 闸：参数名取自录制请求，id 取录制里的值（中层审计 A6#6：防止只对录制样本过拟合）
    let fz = null;
    if (!loose && rep.verdict === 'PASS' && firstRec[r.action] && !a['no-fuzz']) {
      const p0 = (firstRec[r.action].c.req || {}).p || {};
      const params = Object.keys(p0);
      if (params.length) {
        try {
          fz = fuzz.run({ action: r.action, save: firstRec[r.action].file, params: params.join(','), ids: String(Object.entries(p0).filter(([k]) => /id$/i.test(k)).map(([, v]) => v).join(',') || ''),
            dsl: a.dsl, tables: a.tables, generated: genDir, contracts: a.contracts, strictGenerated: true });
        } catch (e) { fz = { verdict: 'FAIL', fails: [{ fails: ['fuzz 异常：' + e.message] }] }; }
      }
    }
    judgeMs += Date.now() - j0;
    checkLock();
    const nCases = rep.cases || 0;
    const viaOk = loose ? !rep.byVia || rep.byVia.generated : !!(rep.byVia && rep.byVia.generated === nCases && nCases > 0);
    const fuzzOk = !fz || fz.verdict === 'PASS';
    if (rep.verdict === 'PASS' && viaOk && fuzzOk && !(strictRegress && rep.regressions)) { outcome = i === 1 ? 'PASS-FIRST' : 'PASS-RETRY'; lastFails = []; break; }
    lastFails = rep.perCase.flatMap(x => x.fails || []);
    for (const x of rep.rejected || []) lastFails.push(`生成文件被拒：${x.why.join('；')}`);
    if (!viaOk) lastFails.push(`生成的 handler 只接管了 ${(rep.byVia || {}).generated || 0}/${nCases} 个用例（其余走了 stub/rule/hand）`);
    if (!fuzzOk) lastFails.push(...(fz.fails || []).slice(0, 5).map(x => `fuzz：p=${JSON.stringify(x.p)} ${(x.fails || []).join(',')}`));
    if (strictRegress && rep.regressions) lastFails.push(...(rep.regress || []).slice(0, 3).map(x => `与录制应答不一致 ${x.id}：${x.diffs.map(d => d.path).join(', ')}`));
    fs.writeFileSync(fb, JSON.stringify({ attempt: i, fails: lastFails, regressions: rep.regress }, null, 2));
  }
  if (outcome === 'HUMAN' && fs.existsSync(file)) fs.renameSync(file, file + '.rejected'); // 不合格的不进构建
  const rec = { ts: new Date().toISOString(), action: r.action, status: r.status, hits: r.hits, outcome, attempts, loose: loose || undefined, ms: Date.now() - t0, genMs, judgeMs, fails: lastFails.slice(0, 5) };
  results.push(rec);
  fs.appendFileSync(log, JSON.stringify(rec) + '\n');
  console.log(`${outcome.padEnd(10)} ${r.action}  尝试 ${attempts}  ${rec.ms} ms`);
}
const n = results.length, pass = results.filter(x => x.outcome !== 'HUMAN').length;
console.log(`\n本轮 ${n} 个动作：通过 ${pass}（一次过 ${results.filter(x => x.outcome === 'PASS-FIRST').length}），转人工 ${n - pass}`);
