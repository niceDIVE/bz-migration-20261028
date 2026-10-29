'use strict';
/**
 * battle-npc-arr.js —— 「战斗必须能开始」回归（2026-10-22 事故）
 *
 * 事故现象（玩家实测）：「战斗压根没开始，然后静默失效」。
 * 真因（部署日志里的客户端异常）：
 *   REQ ReqSelfBattleInfo p={"npcID":1003,...}  →  我方回声 npcID + npcArr
 *   → `TypeError: Cannot read property '0' of undefined`
 *   → frame 0 `initRivalEntity @ assets/scripts/index.jsc:74652`
 *
 * 根因：`BZ_NPCARR` 每个 npc 只有 **22 格**，而 `generateNpcData`（index.js:8093-8134）要 **26 格**，
 * 其中 `o.HardModel = t[23]`（必须是数组），`initRivalEntity` 里 `e.HardModel[0]` 直接抛异常
 * （index.js:74652），而这个回调在 MessageCenter 里 → 异常被吞 → 战斗静默失败。
 *
 * 断言：
 *   T1 BZ_NPCARR 每一项都是 26 格
 *   T2 t[23]（HardModel）必须是长度 >= 2 的数组；t[22]/t[24]/t[25] 必须存在
 *   T3 ReqSelfBattleInfo 回声请求里的 npcID
 *   T4 ReqSelfBattleInfo 的 npcArr 必须 26 格且带 HardModel（不能回模板旧的 26 格垃圾）
 *   T5 未知 npc 也要给 26 格数组（不许 undefined）
 *   T6 eRet 必须是 1（客户端 `1 === e.eRet && prepareForBattle(e)`，index.js:69157-69158）
 *
 * 跑法：node test/battle-npc-arr.js   退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

function makeEnv() {
  const store = new Map();
  return {
    readSave: (k) => (store.has(k) ? store.get(k) : null),
    writeSave: (k, t) => store.set(k, t),
    log: () => {},
    now: () => 1792612412000,
    templates: TPL,
  };
}
function mk() {
  const s = createBzServer(makeEnv());
  const save = s.loadSave();
  save.bag = {}; save.playerEquip = {}; save.equipments = {};
  save.coins = 1000; save.gold = 100000;
  return { s, save };
}
function inner(r) { return r['User.ReqSelfBattleInfo'] || {}; }

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 BZ_NPCARR 每一项都必须是 26 格（缺格 = 战斗静默失败）', () => {
  const A = (typeof BZ_NPCARR !== 'undefined') ? BZ_NPCARR : null;
  assert.ok(A, 'BZ_NPCARR 未定义');
  const bad = [];
  for (const k of Object.keys(A)) {
    if (k === '__meta') continue;
    if (!Array.isArray(A[k]) || A[k].length !== 26) bad.push(k + ':' + (Array.isArray(A[k]) ? A[k].length : typeof A[k]));
    if (bad.length >= 5) break;
  }
  assert.deepStrictEqual(bad, [], '这 5 个 npc 的数值不是 26 格：' + bad.join(', '));
});

T('T2 t[23]=HardModel 必须是数组；t[22]/t[24]/t[25] 必须存在', () => {
  const A = BZ_NPCARR;
  for (const k of ['1003', '1011', '1041', '1001']) {
    const a = A[k];
    if (!a) continue;
    assert.ok(Array.isArray(a[23]), k + ' 的 t[23] 应是数组（HardModel），实际 ' + JSON.stringify(a[23]));
    assert.ok(a[23].length >= 2, k + ' 的 HardModel 至少 2 项');
    assert.ok(a[22] !== undefined, k + ' 的 t[22]（经脉等级）缺失');
    assert.ok(a[24] !== undefined, k + ' 的 t[24]（武器系数）缺失');
    assert.ok(a[25] !== undefined, k + ' 的 t[25]（excess）缺失');
  }
});

T('T3 ReqSelfBattleInfo 必须回声请求里的 npcID', () => {
  const { s } = mk();
  for (const npc of [1003, 1011, 1041]) {
    const i = inner(s.dispatch('User', 'ReqSelfBattleInfo', { npcID: npc, isRmd: false, mp: 200, gTime: 0, hgtimes: 0 }));
    assert.strictEqual(i.npcID, npc, 'npcID 必须回声成 ' + npc + '，实际 ' + i.npcID);
  }
});

T('T4 npcArr 必须 26 格且带 HardModel（不能回模板的旧数据）', () => {
  const { s } = mk();
  const i = inner(s.dispatch('User', 'ReqSelfBattleInfo', { npcID: 1003 }));
  assert.ok(Array.isArray(i.npcArr), 'npcArr 必须是数组');
  assert.strictEqual(i.npcArr.length, 26, 'npcArr 必须 26 格，实际 ' + i.npcArr.length);
  assert.ok(Array.isArray(i.npcArr[23]), 'npcArr[23] 必须是 HardModel 数组，实际 ' + JSON.stringify(i.npcArr[23]));
  const expect = BZ_NPCARR['1003'];
  assert.deepStrictEqual(i.npcArr, expect, 'npcArr 必须等于配置表里该 npc 的 26 项');
});

T('T5 未知 npc 也要给 26 格数组', () => {
  const { s } = mk();
  const i = inner(s.dispatch('User', 'ReqSelfBattleInfo', { npcID: 999999 }));
  assert.ok(Array.isArray(i.npcArr), 'npcArr 不能是 undefined');
  assert.strictEqual(i.npcArr.length, 26, '未知 npc 也要 26 格，实际 ' + i.npcArr.length);
  assert.ok(Array.isArray(i.npcArr[23]), 'HardModel 必须是数组');
});

T('T6 eRet 必须是 1（客户端只在 1 时 prepareForBattle）', () => {
  const { s } = mk();
  const i = inner(s.dispatch('User', 'ReqSelfBattleInfo', { npcID: 1003 }));
  assert.strictEqual(i.eRet, 1, 'eRet 必须 1，实际 ' + i.eRet);
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[battle] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
