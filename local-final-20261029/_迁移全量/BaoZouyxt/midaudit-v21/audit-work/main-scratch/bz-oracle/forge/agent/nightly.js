#!/usr/bin/env node
// 夜间生成循环：按注册表优先级取待办动作 → 调生成器写 handler → 离线回放 + 裁判 → FAIL 就把裁判意见喂回去重试（≤ --tries 次）→ 仍失败转人工。
// 每个动作都记录耗时、尝试次数、结果，tools/throughput.js 据此算真实吞吐（替代 c 单位估算）。
// node forge/agent/nightly.js --registry out/registry.json --recordings <case目录> --gen "<命令>" [--limit 20] [--tries 3]
//      [--status GEN-READY,RULE,IMPL-FAIL] [--generated forge/generated] [--dsl ...] [--tables ...] [--rules ...] [--log out/nightly.jsonl]
// 生成器命令里可用占位符：{action} {out}（要写出的 handler 文件）{feedback}（上一轮裁判意见 JSON，首轮为空文件）{attempt}
// handler 文件格式：module.exports = { action: 'User.x', handler: withProjection(function (req, save) {...}) }
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const root = path.resolve(__dirname, '../..');
const { args, readJSON } = require(path.join(root, 'host/lib/util'));
const { replay } = require('../replay/replay');

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
    const j0 = Date.now();
    let rep;
    try { rep = replay({ recordings: a.recordings, action: r.action, generated: genDir, dsl: a.dsl, tables: a.tables, rules: a.rules, templates: a.templates, contracts: a.contracts }); }
    catch (e) { rep = { verdict: 'FAIL', perCase: [{ fails: ['回放异常：' + e.message] }], regress: [] }; }
    judgeMs += Date.now() - j0;
    const viaOk = !rep.byVia || rep.byVia.generated;
    if (rep.verdict === 'PASS' && viaOk && !(a['strict-regress'] && rep.regressions)) { outcome = i === 1 ? 'PASS-FIRST' : 'PASS-RETRY'; lastFails = []; break; }
    lastFails = rep.perCase.flatMap(x => x.fails || []);
    if (!viaOk) lastFails.push('生成的文件没有被加载（action 字段不对或导出格式不对）');
    fs.writeFileSync(fb, JSON.stringify({ attempt: i, fails: lastFails, regressions: rep.regress }, null, 2));
  }
  if (outcome === 'HUMAN' && fs.existsSync(file)) fs.renameSync(file, file + '.rejected'); // 不合格的不进构建
  const rec = { ts: new Date().toISOString(), action: r.action, status: r.status, hits: r.hits, outcome, attempts, ms: Date.now() - t0, genMs, judgeMs, fails: lastFails.slice(0, 5) };
  results.push(rec);
  fs.appendFileSync(log, JSON.stringify(rec) + '\n');
  console.log(`${outcome.padEnd(10)} ${r.action}  尝试 ${attempts}  ${rec.ms} ms`);
}
const n = results.length, pass = results.filter(x => x.outcome !== 'HUMAN').length;
console.log(`\n本轮 ${n} 个动作：通过 ${pass}（一次过 ${results.filter(x => x.outcome === 'PASS-FIRST').length}），转人工 ${n - pass}`);
