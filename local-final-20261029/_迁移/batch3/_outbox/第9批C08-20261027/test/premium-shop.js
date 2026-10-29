'use strict';
/**
 * premium-shop.js —— 「NPC 金条商店」与「付费货币账本」回归（2026-10-22）
 *
 * 边界（用户 2026-10-22 裁定）：**金条/元宝可以做，但不做任何真实付费渠道**。
 *   - 有些道具/武学只能用付费货币买，玩家要能体验 → 金条/元宝进我方离线账本，可增可减；
 *   - 10 个支付类动作仍一律 `eRet:4`（见 bz-rpc-server.js 的 PAY_ACTION_RE），不伪造订单。
 *
 * 客户端契约：
 *   1. 货架：`SpecialGoodsModel.reqGetSpGoods(npcid)` → `User.getShopItem {npcid}`（index.js:123380 / 59606）；
 *      应答必须带 `ShopArray:{item:[...], price:[...]}`，否则 `NormalShopUI.resListSuccess` 整段不执行
 *      （scripts2.js:46461-46474）。
 *   2. 购买：`SpecialGoodsModel.reqBuy(npcid,itemID,itemNum)` → `User.buySpecialShopItem`
 *      （index.js:123386 / 59607），付款货币是**金条**（NormalShopUI.onBuyBtn 的 npcId>0 分支比
 *      `RoleBaseInfo.gold`，scripts2.js:46521）。
 *   3. 扣款与投放走应答 note：`eco.gold`（客户端 ECONOMY_CHNG，index.js:64708）、
 *      `ivch`（绝对值→setItem）、`eqch`（[0]=删/[1,[type,num]]=更新）。
 *
 * 跑法：node test/premium-shop.js   退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

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
  save.bag = {}; save.playerEquip = {}; save.equipments = {};
  save.coins = 1000; save.gold = 1000; save.yuanbao = 0;
  return { s, save };
}

const NPC = 1009;            // 配置表 random_shop 里的一个摊贩，179 件货
const ITEM = 3016;           // 该摊贩货架第 1 件，价格 100 金条

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 货架：getShopItem 必须回 ShopArray（否则商店开出来是空白）', () => {
  const { s } = mk();
  const inner = s.dispatch('User', 'getShopItem', { npcid: NPC })['User.getShopItem'];
  assert.strictEqual(inner.eRet, 1);
  assert.ok(inner.ShopArray && Array.isArray(inner.ShopArray.item), '缺 ShopArray: ' + JSON.stringify(inner).slice(0, 200));
  assert.ok(inner.ShopArray.item.length > 0, '货架不该空');
  assert.strictEqual(inner.ShopArray.item.length, inner.ShopArray.price.length, 'item/price 必须一一对应');
});

T('T2 未知 npc → 仍然回 ShopArray（空数组），不能缺字段', () => {
  const { s } = mk();
  const inner = s.dispatch('User', 'getShopItem', { npcid: 999999 })['User.getShopItem'];
  assert.ok(inner.ShopArray && Array.isArray(inner.ShopArray.item), '缺 ShopArray');
  assert.strictEqual(inner.ShopArray.item.length, 0);
});

T('T3 金条购买：扣对单价、入账、note.eco.gold 为新余额', () => {
  const { s, save } = mk();
  const inner = s.dispatch('User', 'buySpecialShopItem', { npcid: NPC, itemID: ITEM, itemNum: 1 })['User.buySpecialShopItem'];
  assert.strictEqual(inner.eRet, 1, '应成功: ' + JSON.stringify(inner).slice(0, 200));
  assert.strictEqual(save.gold, 900, '金条应 1000-100，实际 ' + save.gold);
  assert.strictEqual(save.bag[String(ITEM)], 1, '物品应入账');
  assert.strictEqual(inner.note.eco.gold, 900, 'note.eco.gold 必须是新余额');
  assert.strictEqual(inner.note.ivch[String(ITEM)], 1, 'ivch 必须是绝对值');
});

T('T4 金条不足 → eRet:4、不扣钱、不给货', () => {
  const { s, save } = mk();
  save.gold = 10;
  const inner = s.dispatch('User', 'buySpecialShopItem', { npcid: NPC, itemID: ITEM, itemNum: 1 })['User.buySpecialShopItem'];
  assert.strictEqual(inner.eRet, 4);
  assert.strictEqual(save.gold, 10);
  assert.strictEqual(save.bag[String(ITEM)], undefined);
});

T('T5 不在该摊贩货架上的物品 → eRet:4（不许跨店买）', () => {
  const { s, save } = mk();
  const inner = s.dispatch('User', 'buySpecialShopItem', { npcid: NPC, itemID: 999999, itemNum: 1 })['User.buySpecialShopItem'];
  assert.strictEqual(inner.eRet, 4);
  assert.strictEqual(save.gold, 1000);
});

T('T6 多件按单价乘、且不越过真实余额', () => {
  const { s, save } = mk();
  save.gold = 250;
  const ok = s.dispatch('User', 'buySpecialShopItem', { npcid: NPC, itemID: ITEM, itemNum: 2 })['User.buySpecialShopItem'];
  assert.strictEqual(ok.eRet, 1, '200 金条应买得起 2 件');
  assert.strictEqual(save.gold, 50, '250-200=50，实际 ' + save.gold);
  const bad = s.dispatch('User', 'buySpecialShopItem', { npcid: NPC, itemID: ITEM, itemNum: 1 })['User.buySpecialShopItem'];
  assert.strictEqual(bad.eRet, 4, '只剩 50 金条不该买得起 100 的货');
  assert.strictEqual(save.gold, 50);
});

T('T7 装备类货品走 note.eqch（[1,[type,num]]），不进背包账', () => {
  const { s, save } = mk();
  save.gold = 10000000;
  const shelf = s.dispatch('User', 'getShopItem', { npcid: NPC })['User.getShopItem'].ShopArray;
  const TYPES = (typeof BZ_ITEMTYPE !== 'undefined') ? BZ_ITEMTYPE : {};
  let eqId = 0;
  for (const id of shelf.item) { if (TYPES[String(id)] === 1) { eqId = id; break; } }
  if (!eqId) { console.log('     （该货架没有 Type=1 装备，跳过断言）'); return; }
  const idx = shelf.item.indexOf(eqId);
  save.gold = shelf.price[idx] * 2;
  const inner = s.dispatch('User', 'buySpecialShopItem', { npcid: NPC, itemID: eqId, itemNum: 1 })['User.buySpecialShopItem'];
  assert.strictEqual(inner.eRet, 1);
  assert.ok(save.playerEquip[String(eqId)], '装备必须进 playerEquip');
  assert.strictEqual(save.bag[String(eqId)], undefined, '装备不能进背包账');
  assert.ok(Array.isArray(inner.note.eqch[String(eqId)]), 'note.eqch 必须是数组: ' + JSON.stringify(inner.note.eqch));
  assert.strictEqual(inner.note.eqch[String(eqId)][0], 1, '更新用 [1,...]');
});

T('T8 bzGrantCur：加金条/元宝，负数扣且下限 0', () => {
  const { s, save } = mk();
  s.dispatch('User', 'bzGrantCur', { gold: 5000, yuanbao: 300 });
  assert.strictEqual(save.gold, 6000, '1000+5000，实际 ' + save.gold);
  assert.strictEqual(save.yuanbao, 300);
  s.dispatch('User', 'bzGrantCur', { gold: -100000 });
  assert.strictEqual(save.gold, 0, '扣到负数必须夹到 0，实际 ' + save.gold);
});

T('T9 LoadGame 把金条/元宝投给客户端（老档也不该是 undefined）', () => {
  const { s, save } = mk();
  save.gold = 4321; save.yuanbao = 12;
  const lg = s.dispatch('User', 'LoadGame', {})['User.LoadGame'];
  assert.strictEqual(lg.userGold, 4321, 'userGold 应等于账本金条，实际 ' + lg.userGold);
  assert.strictEqual(lg.curGold, 4321);
  assert.strictEqual(lg.userYuanbao, 12, 'userYuanbao 应等于账本元宝，实际 ' + lg.userYuanbao);
  assert.ok(lg.OnhookObj && lg.OnhookObj.curGold === 4321, 'OnhookObj.curGold 也要给（面板 GoldLabel 靠它）');
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[shop] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
