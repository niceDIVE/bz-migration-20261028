#!/usr/bin/env node
// 状态机模型测试（fast-check）：随机生成"一串动作"在离线服务端上执行，每一步都检查
//   ① 离线 L2：按 M4 语义把 note 应用到客户端模型，结果必须等于由存档推出的模型（增量路径 == 全量路径）
//   ② 裁判 L1/L5（含 DSL 守恒式）　③ 存档体检　④ 付费货币不增
// 发现问题后 fast-check 自动把动作序列缩到最短，直接给出最小复现步骤。
// node forge/replay/model-test.js --save <基准存档或case> --actions User.buyShopItem,User.saleItem [--ids 2001,3001]
//      [--dsl ...] [--tables ...] [--generated ...] [--runs 300] [--max-steps 25] [--seed 42]
'use strict';
const path = require('path');
const fc = require('fast-check');
const root = path.resolve(__dirname, '../..');
const { args, readJSON, canon } = require(path.join(root, 'host/lib/util'));
const { loadCtx, judgeCases, loadTables } = require(path.join(root, 'host/judge'));
const { createForgeServer } = require('./server');
const { fromSave, applyNote, unmodeledSaveChanges } = require('../lib/client-model');
const { lint } = require('../tools/save-lint');

function run(a) {
  let save = readJSON(a.save); if (save && save.saveBefore) save = save.saveBefore;
  const tables = a.tables ? loadTables(a.tables) : {};
  const contracts = readJSON(a.contracts || path.join(root, 'out/contracts.json'));
  const dsl = readJSON(a.dsl, null);
  const ctx = loadCtx({ contracts: a.contracts, tables: a.tables, rules: a.rules }, root);
  if (!a.rules && dsl) ctx.rules = require('../lib/rules-dsl').toRules(dsl);
  const actions = String(a.actions).split(',');
  const ids = String(a.ids || Object.keys(tables.item || {}).join(',')).split(',').map(Number);
  const stepArb = fc.record({ action: fc.constantFrom(...actions), itemID: fc.constantFrom(...ids), num: fc.oneof(fc.integer({ min: 1, max: 5 }), fc.constantFrom(0, -1, 99)) });
  let lastFail = null;
  const prop = fc.property(fc.array(stepArb, { minLength: 1, maxLength: +(a['max-steps'] || 25) }), steps => {
    const srv = createForgeServer({ contracts, tables, dsl, generatedDir: a.generated });
    srv.setSave(save);
    const client = fromSave(srv.getSave());
    for (let i = 0; i < steps.length; i++) {
      const st = steps[i], [mod, act] = st.action.split('.');
      const before = srv.getSave();
      let r;
      try { r = srv.dispatch({ mod, do: act, p: { itemID: st.itemID, num: st.num } }); }
      catch (e) { lastFail = { step: i, why: 'SERVER_THREW ' + e.message }; return false; }
      const after = srv.getSave();
      const { unmodeled } = applyNote(client, r.resp && r.resp.note);
      unmodeled.push(...unmodeledSaveChanges(before, after));
      if (unmodeled.length) { lastFail = { step: i, why: `L2.UNMODELED 离线模型不覆盖 ${unmodeled.join(', ')}：不能判 PASS（需真机 L2）` }; return false; }
      const truth = fromSave(after);
      if (canon(client) !== canon(truth)) { lastFail = { step: i, why: `L2 离线不一致：客户端模型 ${canon(client)} ≠ 存档 ${canon(truth)}` }; return false; }
      const c = { id: 'm' + i, action: st.action, req: { mod, do: act, p: { itemID: st.itemID, num: st.num } }, resp: r.resp, saveBefore: before, saveAfter: after, envelope: r.envelope, transport: 'game', rawTransport: { code: 200 } };
      const rep = judgeCases([c], ctx, { layers: 'L1,L5' });
      const f = rep.perCase[0].findings.filter(x => x.level === 'FAIL');
      if (f.length) { lastFail = { step: i, why: f.map(x => x.code + ' ' + x.msg).join('；') }; return false; }
      const L = lint(after);
      if (L.errors.length) { lastFail = { step: i, why: '坏档：' + L.errors.join('；') }; return false; }
    }
    return true;
  });
  const out = fc.check(prop, { numRuns: +(a.runs || 300), seed: a.seed ? +a.seed : undefined });
  if (!out.failed) return { verdict: 'PASS', runs: out.numRuns, seed: out.seed };
  // 用最小反例再跑一次，拿到精确的失败原因
  prop.run(out.counterexample, false);
  return { verdict: 'FAIL', runs: out.numRuns, seed: out.seed, minimal: out.counterexample[0], failAt: lastFail };
}
module.exports = { run };
if (require.main === module) {
  const a = args(process.argv.slice(2));
  if (!a.save || !a.actions) { console.error('需要 --save 与 --actions'); process.exit(2); }
  const r = run(a);
  if (r.verdict === 'PASS') console.log(`模型测试 PASS：${r.runs} 条随机动作序列（seed ${r.seed}）`);
  else {
    console.log(`模型测试 FAIL（seed ${r.seed}，复现加 --seed ${r.seed}）。最小复现序列：`);
    r.minimal.forEach((s, i) => console.log(`  ${i + 1}. ${s.action} itemID=${s.itemID} num=${s.num}`));
    console.log(`  在第 ${r.failAt.step + 1} 步失败：${r.failAt.why}`);
  }
  process.exit(r.verdict === 'PASS' ? 0 : 1);
}
