'use strict';
/**
 * useitem-branches.js —— 「用物品不许点亮幽灵分支」回归（2026-10-22 事故复现）
 *
 * 事故（端上实测，2026-10-22 17:40 日志）：用掉 3626 吐纳法秘籍（→余 0，秘籍白吃）后
 *   TypeError: Cannot read property 'name' of null @ assets/scripts/index.jsc:64796
 *
 * 真因：客户端 useItem 消费端（index.js:64754-64888）是一整条 `hasOwnProperty` 开关链。
 *   形状表曾给 useItem 补 formulaID:0 等"分支选择器"字段 → `getItem(0,"formula")` 得 null
 *   → `n.getText(y.name)` 抛异常。同款：dogid:0 / housekeeper:{helperId:{}}（都走 getItem 后取 .name）；
 *   taskID:101080 会让客户端当成"用物品推进了真任务"（index.js:64785）。
 *   旧修复把删除写在 handler 里，而 dispatch 的 fillShape 在 handler 之后跑、会按形状表把字段补回来
 *   → 从未生效（自检的 shape:useItem:fields 也因此永远绿）。
 *
 * 所以本用例必须**加载 bz-shapes.generated.js**（旧测试没加载形状表，复现不了 fillShape 路径）。
 *
 * 断言：
 *   T1 形状表源头：BZ_SHAPES.useItem 不含任何分支选择器字段
 *   T2 实测应答：useItem 应答不含 23 个分支字段（含原故障：formulaID 必须不在）
 *   T3 eRet=1 且 itemID 回声
 *   T4 note.ivch 是绝对值（20 用 1 → 19，不是 -1；§17.2 同款事故）
 *   T5 note 的 skch/eqch 是空对象（不误派发技能/装备事件）
 *   T6 包里没有的物品：eRet 仍 1、不写负库存、不带分支字段
 *
 * 跑法：node test/useitem-branches.js   退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 设备端是「形状表 + 任务表 + 服务器」拼在一起求值的。测试必须把形状表灌成全局，
// 否则 dispatch 里的 fillShape 会因 `typeof BZ_SHAPES === 'undefined'` 直接跳过，
// 这条回归就复现不了"handler 删了、fillShape 又补回来"的真实路径。
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

// 与 bz-rpc-server.js 的 BRANCH_ONLY 同一份清单（改一处要同步另一处）
const BRANCH_ONLY = [
  'formulaID', 'mountID', 'titleID', 'bloodEndTime', 'dogid', 'hanyusuiTime', 'genGuDan', 'stealFlag',
  'endMonthCardTime', 'avatarInfo', 'itemRealgarMap', 'rewardSkillSkin', 'housekeeper', 'wId', 'wArr',
  'weaponSkinId', 'emoId', 'taskID', 'rewardArray', 'getKnackIds', 'partners', 'mpnum', 'gemId',
];

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
  s.loadSave().bag = {};
  return { s };
}
const bag = (s) => s.loadSave().bag || {};
const resp = (s, p) => s.dispatch('User', 'useItem', p)['User.useItem'] || {};
function assertNoBranches(inner, label) {
  for (const k of BRANCH_ONLY) {
    assert.ok(!Object.prototype.hasOwnProperty.call(inner, k), label + '：应答里不许出现分支开关字段 ' + k + '（实际值 ' + JSON.stringify(inner[k]) + '）');
  }
}

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 形状表源头：BZ_SHAPES.useItem 不含分支选择器字段', () => {
  const tbl = (typeof BZ_SHAPES !== 'undefined') ? BZ_SHAPES : null;
  assert.ok(tbl, 'BZ_SHAPES 未加载（本用例必须能看见形状表）');
  assert.ok(tbl.useItem, 'BZ_SHAPES.useItem 必须存在');
  for (const k of BRANCH_ONLY) {
    assert.ok(!Object.prototype.hasOwnProperty.call(tbl.useItem, k), '形状表里不该再有 ' + k + '（gen_shapes.js 的 SHAPE_OMIT 被绕过了？）');
  }
});

T('T2 实测应答不含 23 个分支字段（原故障重现：formulaID 必须不在）', () => {
  const { s } = mk();
  s.dispatch('User', 'bzSeedBag', { itemObj: { 3003: 20 } });
  const inner = resp(s, { itemID: 3003, itemNum: 1 });
  assertNoBranches(inner, 'useItem');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(inner, 'formulaID'), false,
    'formulaID 必须不在应答里（旧版带 formulaID:0 → getItem(0,"formula") 得 null → 崩溃 @64796）');
});

T('T3 eRet=1 且 itemID 回声', () => {
  const { s } = mk();
  s.dispatch('User', 'bzSeedBag', { itemObj: { 3003: 20 } });
  const inner = resp(s, { itemID: 3003, itemNum: 1 });
  assert.strictEqual(inner.eRet, 1, 'eRet 必须 1（客户端只在 1 时处理应答）');
  assert.strictEqual(inner.itemID, 3003, 'itemID 必须回声成 3003');
});

T('T4 note.ivch 是绝对值（20 用 1 → 19，不是 -1）', () => {
  const { s } = mk();
  s.dispatch('User', 'bzSeedBag', { itemObj: { 3003: 20 } });
  const inner = resp(s, { itemID: 3003, itemNum: 1 });
  assert.ok(inner.note, 'note 必须存在（客户端读 note.skch / dispatch note.ivch）');
  assert.strictEqual(inner.note.ivch['3003'], 19, 'note.ivch 必须是新数量 19（§17.2：消费端是 setItem 赋值不是累加）');
  assert.strictEqual(bag(s)['3003'], 19, '账本必须剩 19');
});

T('T5 note.skch / note.eqch 是空对象（不误派发技能/装备事件）', () => {
  const { s } = mk();
  s.dispatch('User', 'bzSeedBag', { itemObj: { 3003: 20 } });
  const inner = resp(s, { itemID: 3003, itemNum: 1 });
  assert.strictEqual(typeof inner.note.skch, 'object', 'note.skch 必须是对象');
  assert.deepStrictEqual(Object.keys(inner.note.skch), [], 'note.skch 不许有键（否则客户端学技能）');
  assert.strictEqual(typeof inner.note.eqch, 'object', 'note.eqch 必须是对象');
  assert.deepStrictEqual(Object.keys(inner.note.eqch), [], 'note.eqch 不许有键（否则客户端换装备）');
});

T('T6 包里没有的物品：eRet 仍 1、不写负库存、不带分支字段', () => {
  const { s } = mk();
  const inner = resp(s, { itemID: 999999, itemNum: 1 });
  assert.strictEqual(inner.eRet, 1, 'eRet 必须 1');
  assertNoBranches(inner, 'useItem(空库存)');
  assert.ok(!('999999' in bag(s)) || bag(s)['999999'] >= 0, '不许写出负库存');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(inner.note.ivch, '999999'), false, 'use=0 时不该带 ivch');
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[useitem] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
