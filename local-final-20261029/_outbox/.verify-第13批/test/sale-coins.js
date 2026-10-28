'use strict';
/**
 * sale-coins.js —— 「卖东西必须结算铜钱」回归（2026-10-22，R04 回执第 0 位）
 *
 * 背景（外部审计指出的不可逆损失）：
 *   我方 saleItem 以前只从背包/装备账里扣东西，**不给铜钱** —— 玩家每卖一次，价值就白丢一次。
 *
 * 客户端事实（tools/index.js，均由 tools/facts/r04-main-verdict.json 取证）：
 *   1. 客户端自己算售价是 `o += parseInt(g.Price) * h[2]`（index.js:65207）→ 用 item 表 **Price** 列，
 *      不是 BuyPrice（BuyPrice 是商店买价）。
 *   2. 这笔 o 只用于 15e8 上限检查（index.js:65209-65232），**客户端不会本地加钱**。
 *   3. 出售应答的消费端（index.js:64726-64742）只读 eRet / note.ivch / note.eqch，
 *      **一个铜钱字段都不读** → 铜钱必须服务端记账 + 主动推 RoleBaseInfo.coins。
 *   4. HUD 铜钱 Label 走 `MessageCenter.on(CHANGE_ROLE_INFO, setBaseInfo)`（scripts2.js:49715/49727）。
 *
 * 断言：
 *   T1 卖 1 件 → 加 1 件价   T2 卖 N 件 → 加 N 件价   T3 卖不存在 → 不加钱
 *   T4 装备实例按 itemID 计价  T5 零价物品（Price=0）不加钱   T6 应答带 note.ivch/eqch 的键
 *   T7 非沙盒 → 推 RoleBaseInfo.coins 并派发 CHANGE_ROLE_INFO   T8 沙盒 → 一次都不推
 *   T9 LoadGame 的 baseValueAy[35] 与账本 coins 一致           T10 卖出量按真实库存截断
 *
 * 跑法：node test/sale-coins.js   退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

// ---- 假客户端：记录推送 ----
const pushed = { coins: [], events: [], setItem: [], updateEq: [], deleteEq: [], addEq: [] };
function fakeWindow() {
  const RoleBaseInfo = { coins: 0 };
  const InventoryModel = {
    setItem: (id, c) => pushed.setItem.push([id, c]),
    updateEq: (id, arr) => pushed.updateEq.push([id, arr]),
    deleteEq: (id) => pushed.deleteEq.push(id),
    addEq: (eq) => pushed.addEq.push(eq),
  };
  global.window = {
    __require: (n) => {
      if (n === 'RoleBaseInfo') return { RoleBaseInfo };
      if (n === 'InventoryModel') return { InventoryModel };
      if (n === 'MessageCenter') return { MessageCenter: { dispatch: (e) => pushed.events.push(e) } };
      if (n === 'EvName') return { EvName: { CHANGE_ROLE_INFO: 'CHANGE_ROLE_INFO' } };
      return null;
    },
  };
  return RoleBaseInfo;
}
function clearPushed() {
  pushed.coins.length = 0; pushed.events.length = 0;
  pushed.setItem.length = 0; pushed.updateEq.length = 0; pushed.deleteEq.length = 0; pushed.addEq.length = 0;
}

function makeEnv(extra) {
  const store = new Map();
  const env = {
    readSave: (k) => (store.has(k) ? store.get(k) : null),
    writeSave: (k, t) => store.set(k, t),
    log: () => {},
    now: () => 1792612412000,
    templates: TPL,
  };
  return { env: Object.assign(env, extra || {}), store };
}

/** 造一个带账本的 server（直接改缓存里的 _save，与真实进程同一条路径） */
function mk(extra) {
  const { env } = makeEnv();
  const s = createBzServer(env);
  const save = s.loadSave();
  save.bag = { 3003: 10, 4020: 5 };      // 3003 售价 20 / 4020 售价 0（item 表 Price）
  save.playerEquip = { 2302: [1, 2] };   // 2302 售价 100
  save.equipments = { 5: 2302 };
  save.coins = 1000;
  return { s, save, env };
}

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 卖 1 件 → 加 1 件价（3003 售价 20）', () => {
  const { s, save } = mk();
  s.dispatch('User', 'saleItem', { saleArr: [[1, 3003, 1]] });
  assert.strictEqual(save.coins, 1020, '应 1000+20，实际 ' + save.coins);
  assert.strictEqual(save.bag['3003'], 9);
});

T('T2 卖 5 件 → 加 5 件价', () => {
  const { s, save } = mk();
  s.dispatch('User', 'saleItem', { saleArr: [[1, 3003, 5]] });
  assert.strictEqual(save.coins, 1100, '应 1000+20*5，实际 ' + save.coins);
  assert.strictEqual(save.bag['3003'], 5);
});

T('T3 卖不存在的东西 → 不加钱、不崩', () => {
  const { s, save } = mk();
  s.dispatch('User', 'saleItem', { saleArr: [[1, 999999, 3]] });
  assert.strictEqual(save.coins, 1000, '不该加钱，实际 ' + save.coins);
  assert.strictEqual(save.bag['999999'], undefined);
});

T('T4 装备实例按 itemID 计价（2302 售价 100）', () => {
  const { s, save } = mk();
  s.dispatch('User', 'saleItem', { saleArr: [[2, 2302, 1]] });
  assert.strictEqual(save.coins, 1100, '应 1000+100，实际 ' + save.coins);
  assert.deepStrictEqual(save.playerEquip['2302'], [1, 1], '还剩 1 件');
});

T('T5 零价物品（4020，Price=0）→ 扣东西但不加钱', () => {
  const { s, save } = mk();
  s.dispatch('User', 'saleItem', { saleArr: [[1, 4020, 2]] });
  assert.strictEqual(save.coins, 1000, '零价不该加钱，实际 ' + save.coins);
  assert.strictEqual(save.bag['4020'], 3, '仍要扣库存');
});

T('T6 应答带 note.ivch / note.eqch 的键（客户端靠它刷新格子）', () => {
  const { s } = mk();
  const r1 = s.dispatch('User', 'saleItem', { saleArr: [[1, 3003, 1]] });
  const inner1 = r1['User.saleItem'];
  assert.ok(inner1 && inner1.note && inner1.note.ivch, '缺 note.ivch：' + JSON.stringify(r1).slice(0, 200));
  assert.ok(Object.prototype.hasOwnProperty.call(inner1.note.ivch, '3003'), 'ivch 的键应是物品 id');
  const r2 = s.dispatch('User', 'saleItem', { saleArr: [[2, 2302, 1]] });
  const inner2 = r2['User.saleItem'];
  assert.ok(inner2 && inner2.note && inner2.note.eqch, '缺 note.eqch：' + JSON.stringify(r2).slice(0, 200));
  assert.ok(Object.prototype.hasOwnProperty.call(inner2.note.eqch, '2302'), 'eqch 的键应是装备 uid');
});

T('T7 铜钱走 note.eco（客户端 ECONOMY_CHNG 直接赋值 RoleBaseInfo.coins）', () => {
  const { s, save } = mk();
  const r = s.dispatch('User', 'saleItem', { saleArr: [[1, 3003, 1]] });
  const inner = r['User.saleItem'];
  assert.ok(inner.note.eco && inner.note.eco.coins === save.coins, 'note.eco.coins 必须等于账本余额，实际 ' + JSON.stringify(inner.note.eco));
});

T('T8 沙盒实例也回同样的 note（投射不再依赖进程内推送）', () => {
  const { env } = makeEnv({ sandbox: true });
  const s = createBzServer(env);
  const save = s.loadSave();
  save.bag = { 3003: 10 }; save.coins = 1000; save.playerEquip = {}; save.equipments = {};
  const r = s.dispatch('User', 'saleItem', { saleArr: [[1, 3003, 1]] });
  assert.strictEqual(save.coins, 1020, '沙盒也要照常记账');
  const inner = r['User.saleItem'];
  assert.ok(inner.note && inner.note.eco && inner.note.eco.coins === 1020, '沙盒也要回 note.eco');
  assert.strictEqual(inner.note.ivch['3003'], 9, '沙盒也要回绝对数量');
});

T('T9 LoadGame 的 baseValueAy[35] 与账本 coins 一致', () => {
  const { s, save } = mk();
  s.dispatch('User', 'saleItem', { saleArr: [[1, 3003, 2]] });
  const lg = s.dispatch('User', 'LoadGame', {});
  const inner = lg['User.LoadGame'];
  assert.ok(inner && Array.isArray(inner.baseValueAy), 'LoadGame 必须给 baseValueAy');
  assert.strictEqual(inner.baseValueAy[35], save.coins, 'baseValueAy[35] 必须等于账本 coins（两处口径一致）');
});

T('T10 卖出量按真实库存截断（有 10 卖 50 → 只结算 10）', () => {
  const { s, save } = mk();
  s.dispatch('User', 'saleItem', { saleArr: [[1, 3003, 50]] });
  assert.strictEqual(save.coins, 1000 + 20 * 10, '应按真实库存 10 结算，实际 ' + save.coins);
  assert.strictEqual(save.bag['3003'], undefined, '卖光后应从背包删除');
});

// —— 这一族断言是 2026-10-22 玩家实测"20 个月饼卖 1 个只剩 1 个"的直接回归点 ——
T('T11 note.ivch 必须是【绝对值】0（卖光），不能是本次卖出的数量', () => {
  const { s, save } = mk();
  save.bag = { 3003: 2 };
  const r = s.dispatch('User', 'saleItem', { saleArr: [[1, 3003, 2]] });
  const ivch = r['User.saleItem'].note.ivch;
  assert.strictEqual(ivch['3003'], 0, '卖光必须是 0（客户端 setItem(id,0) 才会删），实际 ' + JSON.stringify(ivch));
});

T('T12 note.ivch 必须是【绝对值】余量（20 卖 1 → 19），不是 1', () => {
  const { s, save } = mk();
  save.bag = { 3003: 20 };
  const r = s.dispatch('User', 'saleItem', { saleArr: [[1, 3003, 1]] });
  const ivch = r['User.saleItem'].note.ivch;
  assert.strictEqual(ivch['3003'], 19, '必须回 19，实际 ' + JSON.stringify(ivch) + '（回 1 就会把 20 覆盖成 1，玩家实测过）');
});

T('T13 装备卖光 → note.eqch[uid] = [0]（客户端 0 开头=deleteEq）', () => {
  const { s, save } = mk();
  save.playerEquip = { 2302: [1, 1] };
  save.equipments = { 5: 2302 };
  const r = s.dispatch('User', 'saleItem', { saleArr: [[2, 2302, 1]] });
  const eqch = r['User.saleItem'].note.eqch;
  assert.deepStrictEqual(eqch['2302'], [0], '必须是 [0]，实际 ' + JSON.stringify(eqch));
});

T('T14 装备只卖一部分 → note.eqch[uid] = [1, 账本数组]', () => {
  const { s, save } = mk();
  save.playerEquip = { 2302: [1, 2] };
  const r = s.dispatch('User', 'saleItem', { saleArr: [[2, 2302, 1]] });
  const eqch = r['User.saleItem'].note.eqch;
  assert.deepStrictEqual(eqch['2302'], [1, [1, 1]], '必须是 [1,[type,num]]，实际 ' + JSON.stringify(eqch));
});

T('T15 卖混装（物品+装备）时 note 三个子表齐全且各司其职', () => {
  const { s, save } = mk();
  save.bag = { 3003: 5 }; save.playerEquip = { 2302: [1, 1] }; save.equipments = {};
  const r = s.dispatch('User', 'saleItem', { saleArr: [[1, 3003, 2], [2, 2302, 1]] });
  const note = r['User.saleItem'].note;
  assert.strictEqual(note.ivch['3003'], 3, 'ivch 应为余额 3，实际 ' + JSON.stringify(note.ivch));
  assert.deepStrictEqual(note.eqch['2302'], [0], 'eqch 应为 [0]');
  assert.strictEqual(note.eco.coins, save.coins, 'eco 应等于账本余额');
  assert.strictEqual(save.coins, 1000 + 20 * 2 + 100, '铜钱 = 物品价 + 装备价，实际 ' + save.coins);
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[sale] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
