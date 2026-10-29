'use strict';
/**
 * shop-ge-rogue.js —— 正邪商店（getGoodAndEvilShopData / buyGoodAndEvilShopItem）与
 * 江湖商店（rgGetShopData / rgShopByItem）回归（2026-10-22 商店批次）
 *
 * 契约来源（全部已回源码核对）：
 *   正邪货架：scripts3.js:36527-36540 onGetShopData（e.shop/nextRefreshTime）；
 *             元素读 id/Name/Price/rankopen/rankNum/buyCount/Data/Description（37581-37614、34950-34959）。
 *   正邪购买：scripts3.js:36511 {id,itemNum} → onBuy 36516-36523（eRet/contribution/rewardArray/id/buyCount）；
 *             货币=正邪贡献（GoodEvilBuyUI.onClickBtnBuy 比 RoleBaseInfo.goodEvilContribution，34964）。
 *   江湖货架：scripts3.js:71231-71240 onGetShopData（e.shop/rank/endTime/reputationLevelId）；
 *             元素读 id/costitem/cost/item/refresh/reputation/closetime/num/buyCount（75284-75363）。
 *   江湖购买：scripts3.js:71193 {id,itemNum} → onShopBuy 71207-71219（eRet/rewardArray/id/buyCount）；
 *             货币=实物 costitem×cost（RogueBuyUI 64795 比 getItemNum(costId)）。
 *
 * 断言：
 *   T1 getGoodAndEvilShopData：25 件、字段齐全、Data=[物品,数量]
 *   T2 buyGoodAndEvilShopItem：扣贡献、按 Data 发货、回显 contribution/id/buyCount/rewardArray
 *   T3 贡献不足 → eRet 4、账本不变
 *   T4 未知货 id → eRet 4
 *   T5 rgGetShopData：33 件、字段齐全、rank/endTime/reputationLevelId 存在
 *   T6 rgShopByItem：扣 costitem×cost、按 1 件/份发货、回显 id/buyCount/rewardArray
 *   T7 成本不足 → eRet 4、账本不变
 *   T8 未知货 id → eRet 4
 *   T9 bzGrantCur 支持 contribution（维护动作，正邪贡献唯一来源）
 *
 * 跑法：node test/shop-ge-rogue.js   退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-shapes.generated.js'), 'utf8'));
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
  save.gold = 99999; save.coins = 1000000; save.contribution = 99999;
  return s;
}
const inner = (r, k) => r['User.' + k] || {};
const bag = (s) => s.loadSave().bag || {};

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 getGoodAndEvilShopData：25 件、字段齐全、Data=[物品,数量]', () => {
  const s = mk();
  const i = inner(s.dispatch('User', 'getGoodAndEvilShopData', {}), 'getGoodAndEvilShopData');
  assert.strictEqual(i.eRet, 1);
  assert.ok(Array.isArray(i.shop), 'shop 必须是数组');
  assert.strictEqual(i.shop.length, 25, 'ge_shop 有 25 行');
  const e = i.shop[0];
  for (const f of ['id', 'Name', 'Price', 'rankopen', 'rankNum', 'buyCount', 'Data']) {
    assert.ok(Object.prototype.hasOwnProperty.call(e, f), '货品缺字段 ' + f);
  }
  assert.ok(Array.isArray(e.Data) && e.Data.length === 2, 'Data 必须是 [物品,数量]');
  assert.strictEqual(typeof i.nextRefreshTime, 'number');
});

T('T2 buyGoodAndEvilShopItem：扣贡献、按 Data 发货、回显字段', () => {
  const s = mk();
  const row = BZ_GESHOP.find((r) => r.Price > 0);
  const item = row.Data[0], per = row.Data[1];
  const i = inner(s.dispatch('User', 'buyGoodAndEvilShopItem', { id: row.id, itemNum: 2 }), 'buyGoodAndEvilShopItem');
  assert.strictEqual(i.eRet, 1);
  assert.strictEqual(s.loadSave().contribution, 99999 - row.Price * 2, '贡献按 Price×数量扣');
  assert.strictEqual(i.contribution, 99999 - row.Price * 2, '回显 contribution 必须是新余额');
  assert.strictEqual(bag(s)[item], per * 2, '按 Data[1]×数量发货');
  assert.strictEqual(i.rewardArray[item], per * 2, 'rewardArray 必须给出货品');
  assert.strictEqual(i.id, row.id);
  assert.strictEqual(i.buyCount, 2);
});

T('T3 贡献不足 → eRet 4、账本不变', () => {
  const s = mk();
  s.loadSave().contribution = 0;
  const row = BZ_GESHOP.find((r) => r.Price > 0);
  const i = inner(s.dispatch('User', 'buyGoodAndEvilShopItem', { id: row.id, itemNum: 1 }), 'buyGoodAndEvilShopItem');
  assert.strictEqual(i.eRet, 4);
  assert.strictEqual(s.loadSave().contribution, 0);
  assert.strictEqual(bag(s)[row.Data[0]], undefined);
});

T('T4 未知货 id → eRet 4', () => {
  const s = mk();
  const i = inner(s.dispatch('User', 'buyGoodAndEvilShopItem', { id: 999999, itemNum: 1 }), 'buyGoodAndEvilShopItem');
  assert.strictEqual(i.eRet, 4);
});

T('T5 rgGetShopData：33 件、字段齐全、rank/endTime/reputationLevelId 存在', () => {
  const s = mk();
  const i = inner(s.dispatch('User', 'rgGetShopData', {}), 'rgGetShopData');
  assert.strictEqual(i.eRet, 1);
  assert.ok(Array.isArray(i.shop));
  assert.strictEqual(i.shop.length, 33, 'rogue_shop 有 33 行');
  const e = i.shop[0];
  for (const f of ['id', 'item', 'costitem', 'cost', 'num', 'refresh', 'rank', 'reputation', 'closetime', 'buyCount']) {
    assert.ok(Object.prototype.hasOwnProperty.call(e, f), '货品缺字段 ' + f);
  }
  assert.strictEqual(typeof i.rank, 'number');
  assert.strictEqual(typeof i.endTime, 'number');
  assert.strictEqual(typeof i.reputationLevelId, 'number');
});

T('T6 rgShopByItem：扣 costitem×cost、回显 id/buyCount/rewardArray', () => {
  const s = mk();
  const row = BZ_ROGUESHOP.find((r) => r.cost > 0);
  s.dispatch('User', 'bzSeedBag', { itemObj: { [row.costitem]: row.cost * 2 } });
  const i = inner(s.dispatch('User', 'rgShopByItem', { id: row.id, itemNum: 2 }), 'rgShopByItem');
  assert.strictEqual(i.eRet, 1);
  assert.strictEqual(bag(s)[row.costitem] || 0, 0, '成本必须扣干净');
  assert.strictEqual(bag(s)[row.item] || 0, 2, '每份 1 件货');
  assert.strictEqual(i.id, row.id);
  assert.strictEqual(i.buyCount, 2);
  assert.strictEqual(i.rewardArray[row.item], 2);
});

T('T7 成本不足 → eRet 4、账本不变', () => {
  const s = mk();
  const row = BZ_ROGUESHOP.find((r) => r.cost > 0);
  const i = inner(s.dispatch('User', 'rgShopByItem', { id: row.id, itemNum: 1 }), 'rgShopByItem');
  assert.strictEqual(i.eRet, 4);
  assert.strictEqual(bag(s)[row.costitem] || 0, 0);
  assert.strictEqual(bag(s)[row.item] || 0, 0);
});

T('T8 未知货 id → eRet 4', () => {
  const s = mk();
  const i = inner(s.dispatch('User', 'rgShopByItem', { id: 999999, itemNum: 1 }), 'rgShopByItem');
  assert.strictEqual(i.eRet, 4);
});

T('T9 bzGrantCur 支持 contribution（正邪贡献唯一来源）', () => {
  const s = mk();
  s.loadSave().contribution = 0;
  const i = inner(s.dispatch('User', 'bzGrantCur', { contribution: 1000 }), 'bzGrantCur');
  assert.strictEqual(i.eRet, 1);
  assert.strictEqual(s.loadSave().contribution, 1000);
  assert.ok(i.applied.join(';').indexOf('contribution') >= 0);
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[shops2] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
