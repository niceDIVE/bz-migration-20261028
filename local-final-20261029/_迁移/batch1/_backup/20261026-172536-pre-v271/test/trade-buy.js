'use strict';
/**
 * trade-buy.js —— 「买东西必须扣钱、扣对该扣的钱、买完界面上要看得到」回归（2026-10-22）
 *
 * 背景（玩家实测）：买了 1011 个糖葫芦，一分银两没扣 —— 旧实现只 `bagAdd` 加物品。
 *
 * 客户端事实（tools/facts/trade-shop.json + 主审回源码核对）：
 *   1. 货架是配置表 `shop`（shelf id → Item 列表），单价写的是 **`item.BuyPrice`**
 *      （`price: s.BuyPrice`，scripts2.js:46443 / 46452）——不是卖价 `Price`。
 *   2. 付款前客户端只做本地校验：`o = this.price * this.counts`；`npcId == 0` 的银两商店比
 *      `RoleBaseInfo.coins`，不够弹 text 124（scripts2.js:46521）。
 *   3. 银两商店走 `InventoryModel.buyItem(itemID, counts)` → `User.buyShopItem {itemID,itemNum}`
 *      （index.js:65257-65262）。
 *   4. 应答消费端（index.js:64743-64753）只读 `eRet` 与 `note.ivch/eqch`，**不读货币字段**；
 *      `eRet:4` 会弹提示。买成功后 `onBuySuccess` 只重读 `RoleBaseInfo.getItemNum`（scripts2.js:46535）
 *      → 物品必须由服务端按绝对值推回模型，否则界面不刷新。
 *
 * 断言：
 *   T1 买 1 个（3003 买价 60）→ 扣 60、bag+1、推 setItem 绝对值、note.ivch 有键
 *   T2 买 21 个 → 扣 1260（按单价×数量）
 *   T3 钱不够 → eRet:4、不扣钱、不加物品
 *   T4 无买价（3518，BuyPrice=0）→ eRet:4、不白送
 *   T5 买装备（2302 买价 750）→ 进 playerEquip、推 updateEq、note.eqch 有键
 *   T6 沙盒 → 一次都不推
 *   T7 note 必须落在 `User.buyShopItem` 里（不是信封顶层）
 *   T8 LoadGame 的 baseValueAy[35] 与账本 coins 一致
 *
 * 跑法：node test/trade-buy.js   退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

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
  for (const k of Object.keys(pushed)) pushed[k].length = 0;
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
function mk(extra) {
  const { env } = makeEnv(extra);
  const s = createBzServer(env);
  const save = s.loadSave();
  save.bag = {};
  save.playerEquip = {};
  save.equipments = {};
  save.coins = 1000;
  return { s, save };
}

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 买 1 个糖葫芦（买价 60）→ 扣 60、入账、推绝对值', () => {
  fakeWindow(); clearPushed();
  const { s, save } = mk();
  const r = s.dispatch('User', 'buyShopItem', { itemID: 3003, itemNum: 1 });
  assert.strictEqual(save.coins, 940, '应 1000-60，实际 ' + save.coins);
  assert.strictEqual(save.bag['3003'], 1, '背包应有 1 个');
  const inner = r['User.buyShopItem'];
  // note.ivch 是**绝对值**（客户端 index.js:64674 直接 setItem(n, o[n])），买 1 个 → 1
  assert.strictEqual(inner.note.ivch['3003'], 1, 'note.ivch 应为绝对值 1，实际 ' + JSON.stringify(inner.note.ivch));
  assert.strictEqual(inner.note.eco.coins, save.coins, 'note.eco.coins 应等于新余额');
  delete global.window;
});

T('T2 买 21 个 → 扣 1260', () => {
  fakeWindow(); clearPushed();
  const { s, save } = mk();
  save.coins = 5000;
  s.dispatch('User', 'buyShopItem', { itemID: 3003, itemNum: 21 });
  assert.strictEqual(save.coins, 5000 - 60 * 21, '应扣 1260，实际扣 ' + (5000 - save.coins));
  assert.strictEqual(save.bag['3003'], 21);
  delete global.window;
});

T('T3 钱不够 → eRet:4、不扣钱、不加物品', () => {
  fakeWindow(); clearPushed();
  const { s, save } = mk();
  save.coins = 10;
  const r = s.dispatch('User', 'buyShopItem', { itemID: 3003, itemNum: 1 });
  assert.strictEqual(r['User.buyShopItem'].eRet, 4, '必须回 eRet:4（客户端会弹提示）');
  assert.strictEqual(save.coins, 10, '不许扣钱');
  assert.strictEqual(save.bag['3003'], undefined, '不许加物品');
  assert.deepStrictEqual(pushed.setItem, [], '失败时不该推');
  delete global.window;
});

T('T4 无买价物品（3518 BuyPrice=0）→ eRet:4、不白送', () => {
  fakeWindow(); clearPushed();
  const { s, save } = mk();
  const r = s.dispatch('User', 'buyShopItem', { itemID: 3518, itemNum: 1 });
  assert.strictEqual(r['User.buyShopItem'].eRet, 4);
  assert.strictEqual(save.bag['3518'], undefined);
  assert.strictEqual(save.coins, 1000);
  delete global.window;
});

T('T5 买装备（2302 买价 750）→ 进 playerEquip、note.eqch 为 [1, 账本数组]', () => {
  fakeWindow(); clearPushed();
  const { s, save } = mk();
  save.coins = 2000;
  const r = s.dispatch('User', 'buyShopItem', { itemID: 2302, itemNum: 1 });
  assert.strictEqual(save.coins, 1250, '应 2000-750，实际 ' + save.coins);
  assert.ok(save.playerEquip['2302'], '装备实例必须进 playerEquip，实际 ' + JSON.stringify(save.playerEquip));
  assert.strictEqual(save.bag['2302'], undefined, 'Type=1 不能进背包账');
  const eqch = r['User.buyShopItem'].note.eqch;
  assert.deepStrictEqual(eqch['2302'], [1, [1, 1]], 'note.eqch 必须是 [1,[type,num]]，实际 ' + JSON.stringify(eqch));
  delete global.window;
});

T('T6 沙盒 → 一次都不推，但照常记账', () => {
  fakeWindow(); clearPushed();
  const { s, save } = mk({ sandbox: true });
  s.dispatch('User', 'buyShopItem', { itemID: 3003, itemNum: 2 });
  assert.strictEqual(save.coins, 1000 - 120, '沙盒也要扣钱');
  assert.strictEqual(save.bag['3003'], 2);
  assert.deepStrictEqual(pushed.setItem, [], '沙盒不许 setItem');
  assert.deepStrictEqual(pushed.updateEq, [], '沙盒不许 updateEq');
  assert.deepStrictEqual(pushed.events, [], '沙盒不许派发');
  delete global.window;
});

T('T7 note 必须落在 User.buyShopItem 里（不是信封顶层）', () => {
  fakeWindow(); clearPushed();
  const { s } = mk();
  const r = s.dispatch('User', 'buyShopItem', { itemID: 3003, itemNum: 1 });
  assert.strictEqual(r.note, undefined, '信封顶层不该有 note，实际 ' + JSON.stringify(r.note));
  assert.ok(r['User.buyShopItem'].note, 'note 必须在 User.buyShopItem 里');
  delete global.window;
});

T('T8 LoadGame 的 baseValueAy[35] 与账本 coins 一致', () => {
  const { s, save } = mk();
  s.dispatch('User', 'buyShopItem', { itemID: 3003, itemNum: 3 });
  const lg = s.dispatch('User', 'LoadGame', {});
  assert.strictEqual(lg['User.LoadGame'].baseValueAy[35], save.coins, '两处口径必须一致');
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[buy] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
