#!/usr/bin/env node
// 边界模糊测试：对一个动作自动构造一批"刁钻请求"（数量 0/负数/小数/巨大、不存在的 id、钱不够、重复刷），
// 在离线服务端上跑，交给裁判 L1/L5 判。专抓刷钱、负数、失败分支改存档这类漏洞——没有录制样本也能跑。
// node forge/replay/fuzz.js --action User.buyShopItem --save <基准存档.json 或 case> [--params itemID,num] [--ids 2001,3001]
//      [--dsl ...] [--tables ...] [--rules ...] [--generated ...] [--loops 20] [--out out/fuzz-report.json]
'use strict';
const path = require('path');
const root = path.resolve(__dirname, '../..');
const { args, readJSON, writeJSON } = require(path.join(root, 'host/lib/util'));
const { loadCtx, judgeCases, loadTables } = require(path.join(root, 'host/judge'));
const { createForgeServer } = require('./server');

function variants(params, ids) {
  const nums = [1, 2, 0, -1, 1.5, 1e9, '1', null];
  const idv = [...ids, 999999999, -1, '2001x', null];
  const out = [];
  const base = {}; for (const p of params) base[p] = /id$/i.test(p) ? ids[0] : 1;
  out.push({ p: base, invalid: false });
  const bad = v => v === null || v === '1' || v === '2001x' || (typeof v === 'number' && (!Number.isInteger(v) || v <= 0));
  for (const p of params) for (const v of (/id$/i.test(p) ? idv : nums)) {
    const q = Object.assign({}, base); q[p] = v;
    out.push({ p: q, invalid: bad(v) || v === 999999999 });   // 非法输入：成功即漏洞
  }
  const q = Object.assign({}, base); delete q[params[params.length - 1]]; out.push({ p: q, invalid: true }); // 缺参数
  return out;
}
function run(a) {
  const [mod, act] = a.action.split('.');
  let save = readJSON(a.save); if (save && save.saveBefore) save = save.saveBefore;
  const tables = a.tables ? loadTables(a.tables) : {};
  const contracts = readJSON(a.contracts || path.join(root, 'out/contracts.json'));
  const srv = createForgeServer({ contracts, tables, dsl: readJSON(a.dsl, null), generatedDir: a.generated, strictGenerated: !!a.strictGenerated });
  const ids = String(a.ids || Object.keys((tables.item || {})).slice(0, 3).join(',')).split(',').filter(Boolean).map(Number);
  if (!ids.length) ids.push(1);
  const params = String(a.params || 'itemID,num').split(',');
  const cases = [];
  const one = (p, sc, seq, s0, invalid) => {
    srv.setSave(s0); const before = srv.getSave();
    let r;
    try { r = srv.dispatch({ mod, do: act, p }); }
    catch (e) { cases.push({ id: `fuzz.${act}.${cases.length}`, action: a.action, req: { mod, do: act, p }, __threw: e.message }); return s0; }
    cases.push({ id: `fuzz.${act}.${cases.length}`, action: a.action, scenario: sc, seq, req: { mod, do: act, p }, resp: r.resp, saveBefore: before, saveAfter: srv.getSave(), envelope: r.envelope, transport: 'game', rawTransport: { code: 200 }, __via: r.via, __invalid: !!invalid });
    return srv.getSave();
  };
  variants(params, ids).forEach((v, i) => one(v.p, null, i, save, v.invalid));
  // 重复刷：同一请求连打 N 次，存档串起来，L5 闭环检查会看净收益
  let s = save; for (let i = 0; i < +(a.loops || 20); i++) s = one(variants(params, ids)[0].p, 'fuzz-loop', i, s);
  const ctx = loadCtx({ contracts: a.contracts, tables: a.tables, rules: a.rules }, root);
  // 默认用 DSL 自动导出的守恒式（带 when: eRet===1 与"失败不改存档"），比手写 rules.json 更贴合
  if (!a.rules && a.dsl) ctx.rules = require('../lib/rules-dsl').toRules(readJSON(a.dsl));
  const thrown = cases.filter(c => c.__threw);
  const rep = judgeCases(cases.filter(c => !c.__threw), ctx, { layers: 'L1,L5' });
  for (const c of cases.filter(c => c.__invalid && c.resp && c.resp.eRet === 1)) {
    const pc = rep.perCase.find(x => x.id === c.id);
    pc.verdict = 'FAIL'; pc.findings.push({ level: 'FAIL', code: 'FUZZ.ACCEPTED_INVALID', msg: `非法参数 ${JSON.stringify(c.req.p)} 被当成功处理` }); rep.verdict = 'FAIL';
  }
  for (const c of thrown) { rep.perCase.push({ id: c.id, verdict: 'FAIL', findings: [{ level: 'FAIL', code: 'FUZZ.SERVER_THREW', msg: c.__threw }] }); rep.verdict = 'FAIL'; }
  return { action: a.action, cases: cases.length, via: [...new Set(cases.map(c => c.__via))], verdict: rep.verdict, summary: rep.summary,
    fails: rep.perCase.filter(x => x.verdict === 'FAIL').map(x => ({ id: x.id, p: (cases.find(c => c.id === x.id) || { req: {} }).req.p, fails: x.findings.filter(f => f.level === 'FAIL').map(f => f.code) })), cross: rep.cross.filter(x => x.level === 'FAIL') };
}
module.exports = { run };
if (require.main === module) {
  const a = args(process.argv.slice(2));
  if (!a.action || !a.save) { console.error('需要 --action 与 --save'); process.exit(2); }
  const r = run(a);
  if (a.out) writeJSON(a.out, r);
  console.log(`模糊测试 ${r.action}：${r.cases} 个请求（经 ${r.via.join('/')}），${r.verdict}`);
  r.fails.forEach(x => console.log(`  ✘ p=${JSON.stringify(x.p)}  ${x.fails.join(', ')}`));
  r.cross.forEach(x => console.log(`  ✘ [跨用例] ${x.code} ${x.msg}`));
  process.exit(r.verdict === 'PASS' ? 0 : 1);
}
