#!/usr/bin/env node
// 离线回放台：把录下的真实请求（case 目录）对新构建重跑一遍，产出新 case 交给裁判，并与录制时的应答做回归比对。
// node forge/replay/replay.js --recordings <case目录> [--mode isolated|chain] [--adapter forge|<适配器路径>] [--server bz-rpc-server.js]
//      [--dsl rules.dsl.json] [--tables <dir>] [--generated forge/generated] [--contracts out/contracts.json]
//      [--action User.x] [--out-cases out/replayed] [--out out/replay-report.json]
// isolated：每个 case 用它自己的 saveBefore（定位单个动作）；chain：从第一个 case 的存档起一路串下去（暴露跨动作的状态错误）
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const { args, readJSON, writeJSON, listCases, diff, canon } = require(path.join(root, 'host/lib/util'));
const { loadCtx, judgeCases, loadTables } = require(path.join(root, 'host/judge'));
const { createForgeServer } = require('./server');

function volatile(p) { return /([Tt]ime|[Ss]tamp|serverT|\.now\b|\.ts\b)/.test(p); }

function replay(a) {
  const files = listCases(a.recordings);
  let recs = files.map(f => Object.assign(readJSON(f), { __file: f }));
  if (a.action) recs = recs.filter(c => c.action === a.action);
  recs.sort((x, y) => (x.scenario || '').localeCompare(y.scenario || '') || (x.seq || 0) - (y.seq || 0));
  const contracts = readJSON(a.contracts || path.join(root, 'out/contracts.json'));
  const tables = a.tables ? loadTables(a.tables) : {};
  const mk = () => a.adapter && a.adapter !== 'forge'
    ? require(path.resolve(a.adapter)).createServer({ serverPath: a.server, initialSave: {} })
    : createForgeServer({ contracts, tables, dsl: readJSON(a.dsl, null), generatedDir: a.generated, handlers: a.handlers, strictGenerated: !!a.strictGenerated });
  let srv = mk();
  const out = [], regress = [];
  let lastScenario = null;
  for (const r of recs) {
    if (a.mode !== 'chain' || r.scenario !== lastScenario) srv.setSave(r.saveBefore || {});
    lastScenario = r.scenario;
    const saveBefore = srv.getSave();
    const t0 = process.hrtime.bigint();
    let res, err = null;
    try { res = srv.dispatch(r.req); } catch (e) { err = e.message; }
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (err) { out.push({ id: r.id + '@replay', action: r.action, req: r.req, resp: null, saveBefore, saveAfter: saveBefore, exceptions: [{ msg: 'server threw: ' + err }], __via: 'error' }); continue; }
    const c = { id: r.id + '@replay', action: r.action, scenario: r.scenario, seq: r.seq, req: r.req, resp: res.resp, saveBefore, saveAfter: srv.getSave(),
      envelope: res.envelope, transport: 'game', rawTransport: { code: 200 }, meta: r.meta /* 豁免只认 config.metaEscapes（中层审计 A2#2），透传无害 */, exceptions: [], toasts: [], probe: { mode: 'offline-replay' }, __via: res.via, __ms: ms };
    out.push(c);
    if (r.resp) {
      const d = diff(r.resp, res.resp, '$', [], volatile);
      if (d.length) regress.push({ id: r.id, action: r.action, via: res.via, diffs: d.slice(0, 5) });
    }
  }
  if (a['out-cases']) { fs.mkdirSync(a['out-cases'], { recursive: true }); out.forEach((c, i) => writeJSON(path.join(a['out-cases'], `${String(i).padStart(4, '0')}-${(c.id || 'x').replace(/[^\w.@-]/g, '_')}.json`), c)); }
  const ctx = loadCtx({ contracts: a.contracts, tables: a.tables, rules: a.rules, templates: a.templates }, root);
  // 离线没有客户端：L0/L2 不可用，只跑 L1/L3/L5（L4 有模板时也跑）
  const rep = judgeCases(out, ctx, { layers: a.layers || 'L1,L4,L5', requireSave: !!a.requireSave });
  const byVia = out.reduce((m, c) => (m[c.__via] = (m[c.__via] || 0) + 1, m), {});
  const rejected = srv.rejected || [];
  if (rejected.length) rep.verdict = 'FAIL';
  const report = { verdict: rep.verdict, cases: out.length, byVia, rejected, l0: 'not-run', l2: 'not-run', judge: rep.summary, regressions: regress.length, regress, perCase: rep.perCase.map(x => ({ id: x.id, action: x.action, verdict: x.verdict, fails: x.findings.filter(f => f.level === 'FAIL').map(f => f.code + ' ' + f.msg) })),
    totalMs: +out.reduce((s, c) => s + (c.__ms || 0), 0).toFixed(2) };
  return report;
}
module.exports = { replay };
if (require.main === module) {
  const a = args(process.argv.slice(2));
  if (!a.recordings) { console.error('需要 --recordings <case目录>'); process.exit(2); }
  const r = replay(a);
  if (a.out) writeJSON(a.out, r);
  console.log(`回放 ${r.cases} 个请求（${Object.entries(r.byVia).map(([k, v]) => k + ' ' + v).join('，')}），耗时 ${r.totalMs} ms`);
  console.log(`裁判 ${r.verdict}：${r.judge.pass}/${r.judge.cases} PASS；与录制应答不一致 ${r.regressions} 条`);
  for (const x of r.perCase.filter(x => x.verdict === 'FAIL')) console.log(`  ✘ ${x.id}\n      ${x.fails.join('\n      ')}`);
  process.exit(r.verdict === 'PASS' ? 0 : 1);
}
