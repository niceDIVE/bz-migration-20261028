'use strict';
/**
 * shop-special-exchange.js —— 流言商店（GetSpecialShopData / BuyAcitivityShop）与
 * 兑换商店（getChangeShop / exchangeItem）回归（2026-10-22 实现批次）
 *
 * 契约来源（全部已回源码核对）：
 *   流言商店：index.js:1467-1483 specialShopCallBack（判 shopData）→ scripts2.js:55231-55286
 *             SaleShopQiUI.setShowData（shopData = {物品id:{payment,page,limit,isserver,endtime,ID}}，
 *             按 payment==2 && page==页号+1 筛页）；购买 scripts2.js:7436-7457 BuyItemUI6.onBuyClick
 *             （比 RoleBaseInfo.gold）→ index.js:1635 ACTIVITE_SHOP → 应答消费 index.js:1484-1511
 *             activeShppCallBack（读 e.itemID/e.itemNum）。
 *   兑换商店：index.js:47076-47078 dispatch(EXCHANGE_SHOP_DATA, e.shopObj)；scripts2.js:20696-20729
 *             ExchangeRender.setData（n[2]=物品 n[3]=数量 n[4]=成本串 n[9]=万圣标记）；scripts2.js:20885-20897
 *             setItemEveryData（c[1]=页 c[5]=品质 c[8]=排序）；购买 index.js:47112
 *             exchangeItem {itemID(兑换行id),itemNum,npcid}，应答消费 index.js:47090-47096。
 *
 * 断言：
 *   T1 GetSpecialShopData(1009) 货架非空且带 payment/page/limit/price/ID；存在 payment=2 && page=1 的货
 *   T2 GetSpecialShopData(10163) 货架非空
 *   T3 未知 npc → eRet 仍 1、shopData 为空对象（客户端不开 UI，但不崩）
 *   T4 BuyAcitivityShop 扣金条、进背包、note.eco.gold 为绝对值
 *   T5 金条不足 → eRet 4，背包不变
 *   T6 不在任何货架的物品 → eRet 4
 *   T7 getChangeShop(10385) → shopObj 非空，行是数组且 [4] 是"id,数"成本串
 *   T8 未知 npc → shopObj 空数组
 *   T9 exchangeItem：按行[4]扣成本、按行[2]/[3]发货，note.ivch 绝对值，回显 itemID=真物品
 *   T10 成本不足 → eRet 4，账本不变
 *   T11 未知兑换行 id → eRet 4
 *
 * 跑法：node test/shop-special-exchange.js   退出码 0 = 全绿
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
  save.gold = 99999; save.coins = 1000000;
  return s;
}
const inner = (r, k) => r['User.' + k] || {};
const bag = (s) => s.loadSave().bag || {};

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 GetSpecialShopData(1009)：货架非空、字段齐全、有 payment=2/page=1 的货', () => {
  const s = mk();
  const i = inner(s.dispatch('User', 'GetSpecialShopData', { npcID: 1009 }), 'GetSpecialShopData');
  assert.strictEqual(i.eRet, 1);
  assert.ok(i.shopData && typeof i.shopData === 'object', 'shopData 必须是对象');
  const keys = Object.keys(i.shopData);
  assert.ok(keys.length > 0, '货架不能为空');
  const e = i.shopData[keys[0]];
  for (const f of ['ID', 'itemId', 'payment', 'page', 'isserver', 'limit', 'price', 'endtime']) {
    assert.ok(Object.prototype.hasOwnProperty.call(e, f), '货品缺字段 ' + f);
  }
  const ok = keys.some((k) => i.shopData[k].payment === 2 && i.shopData[k].page === 1);
  assert.ok(ok, '必须至少有一件 payment=2 && page=1 的货（否则 UI 第一页空白）');
});

T('T2 GetSpecialShopData(10163)：货架非空', () => {
  const s = mk();
  const i = inner(s.dispatch('User', 'GetSpecialShopData', { npcID: 10163 }), 'GetSpecialShopData');
  assert.strictEqual(i.eRet, 1);
  assert.ok(Object.keys(i.shopData).length > 0, '10163 货架不能为空');
});

T('T3 未知 npc：eRet 仍 1、shopData 空对象', () => {
  const s = mk();
  const i = inner(s.dispatch('User', 'GetSpecialShopData', { npcID: 999999 }), 'GetSpecialShopData');
  assert.strictEqual(i.eRet, 1);
  assert.deepStrictEqual(i.shopData, {}, '未知 npc 回空对象（客户端不开 UI，但不崩）');
});

T('T4 BuyAcitivityShop：扣金条、进背包、note.eco.gold 绝对值', () => {
  const s = mk();
  const sh = BZ_NPCSHOP['1009'];
  const itemID = sh.i.find((id) => parseInt(sh.m[id].pay, 10) === 2 && parseInt(sh.p[sh.i.indexOf(id)], 10) > 0);
  const price = parseInt(sh.p[sh.i.indexOf(itemID)], 10);
  const i = inner(s.dispatch('User', 'BuyAcitivityShop', { itemID: itemID, itemNum: 2 }), 'BuyAcitivityShop');
  assert.strictEqual(i.eRet, 1, '有钱必须买成功');
  assert.strictEqual(i.itemID, itemID);
  assert.strictEqual(i.itemNum, 2);
  assert.strictEqual(s.loadSave().gold, 99999 - price * 2, '金条必须按单价×数量扣');
  assert.strictEqual(i.note.eco.gold, 99999 - price * 2, 'note.eco.gold 必须是绝对值');
  assert.strictEqual(bag(s)[itemID], 2, '货物必须进背包');
  assert.strictEqual(i.note.ivch[itemID], 2, 'note.ivch 必须是绝对值');
});

T('T5 BuyAcitivityShop 金条不足：eRet 4、背包不变', () => {
  const s = mk();
  s.loadSave().gold = 1;
  const sh = BZ_NPCSHOP['1009'];
  const itemID = sh.i.find((id) => parseInt(sh.p[sh.i.indexOf(id)], 10) > 1);
  const i = inner(s.dispatch('User', 'BuyAcitivityShop', { itemID: itemID, itemNum: 1 }), 'BuyAcitivityShop');
  assert.strictEqual(i.eRet, 4, '没钱必须明确失败');
  assert.strictEqual(s.loadSave().gold, 1, '不许扣钱');
  assert.strictEqual(bag(s)[itemID], undefined, '不许发货');
});

T('T6 BuyAcitivityShop 不在货架：eRet 4', () => {
  const s = mk();
  const i = inner(s.dispatch('User', 'BuyAcitivityShop', { itemID: 99999999, itemNum: 1 }), 'BuyAcitivityShop');
  assert.strictEqual(i.eRet, 4);
  assert.strictEqual(s.loadSave().gold, 99999, '不许扣钱');
});

T('T7 getChangeShop(10385)：shopObj 非空、行是数组、[4] 是成本串', () => {
  const s = mk();
  const i = inner(s.dispatch('User', 'getChangeShop', { npcid: 10385 }), 'getChangeShop');
  assert.strictEqual(i.eRet, 1);
  assert.ok(Array.isArray(i.shopObj), 'shopObj 必须是数组');
  assert.ok(i.shopObj.length > 0, '货架不能为空');
  const row = i.shopObj[0];
  assert.ok(Array.isArray(row), '行必须是数组');
  assert.ok(row.length >= 10, '行至少 10 列');
  assert.ok(/^\d+,\d+/.test(String(row[4])), '行[4] 必须是 "物品id,数量" 成本串，实际 ' + JSON.stringify(row[4]));
});

T('T8 getChangeShop 未知 npc：shopObj 空数组', () => {
  const s = mk();
  const i = inner(s.dispatch('User', 'getChangeShop', { npcid: 999999 }), 'getChangeShop');
  assert.strictEqual(i.eRet, 1);
  assert.deepStrictEqual(i.shopObj, []);
});

T('T9 exchangeItem：扣成本、按行发货、note.ivch 绝对值、回显真物品 id', () => {
  const s = mk();
  const rows = BZ_EXCHANGE['10385'];
  // 找一条"单段成本 + 物品不是装备"的行，便于断言
  const row = rows.find((r) => String(r[4]).split('|').length === 1 && BZ_ITEMTYPE[String(r[2])] !== 1);
  assert.ok(row, '测试数据里必须能找到一条非装备单成本行');
  const costSeg = String(row[4]).split(',');
  const costID = parseInt(costSeg[0], 10), costN = parseInt(costSeg[1], 10) * 1;
  s.dispatch('User', 'bzSeedBag', { itemObj: { [costID]: costN } });
  // 成本 id 与物品 id 不同，避免断言互串
  const i = inner(s.dispatch('User', 'exchangeItem', { itemID: row[0], itemNum: 1, npcid: 10385 }), 'exchangeItem');
  assert.strictEqual(i.eRet, 1, '成本足够必须成功');
  assert.strictEqual(i.itemID, row[2], '回显的 itemID 必须是真物品（客户端拿它对行刷新）');
  assert.strictEqual(i.itemNum, row[3], '回显数量 = 行[3] × 1 份');
  assert.strictEqual(bag(s)[costID] || 0, 0, '成本必须扣干净');
  assert.strictEqual(bag(s)[String(row[2])], row[3], '货物必须按行[3]发放');
  assert.strictEqual(i.note.ivch[costID] || 0, 0, 'note.ivch 成本必须是绝对值 0');
  assert.strictEqual(i.note.ivch[String(row[2])], row[3], 'note.ivch 货物必须是绝对值');
});

T('T10 exchangeItem 成本不足：eRet 4、账本不变', () => {
  const s = mk();
  const rows = BZ_EXCHANGE['10385'];
  const row = rows.find((r) => String(r[4]).split('|').length === 1);
  const costID = parseInt(String(row[4]).split(',')[0], 10);
  const i = inner(s.dispatch('User', 'exchangeItem', { itemID: row[0], itemNum: 1, npcid: 10385 }), 'exchangeItem');
  assert.strictEqual(i.eRet, 4, '缺料必须失败');
  assert.strictEqual(bag(s)[costID] || 0, 0, '不许扣不存在的东西');
  assert.strictEqual(bag(s)[String(row[2])] || 0, 0, '不许发货');
});

T('T11 exchangeItem 未知行 id：eRet 4', () => {
  const s = mk();
  const i = inner(s.dispatch('User', 'exchangeItem', { itemID: 99999999, itemNum: 1, npcid: 10385 }), 'exchangeItem');
  assert.strictEqual(i.eRet, 4);
  assert.strictEqual(s.loadSave().gold, 99999);
});

// ---- T12/T13：§7-2「奖励是货币 id」的回归（2026-10-23 修） -------------------
// 原故障：奖励一律 grantItem → 货币被写进 bag，客户端 getItemNum 只认 RoleBaseInfo
// （index.js:106347-106360）→ 玩家付真道具换来一个永远不生效的假物品。
// 客户端 eco 监听器只认 coins/ptt/gold/exp/chips/yuanbao（64698-64725），潜能键是 **ptt**。
const CUR_ROWS = () => {
  const out = [];
  for (const npc of Object.keys(BZ_EXCHANGE)) {
    for (const row of BZ_EXCHANGE[npc]) {
      const id = parseInt(row[2], 10) || 0;
      if (id === 1 || id === 4001 || id === 4003 || id === 8888) out.push({ npc: parseInt(npc, 10), row });
    }
  }
  return out;
};
const CUR_META = {
  1: { field: 'gold', key: 'gold' },
  4001: { field: 'coins', key: 'coins' },
  4003: { field: 'potential', key: 'ptt' },
  8888: { field: 'yuanbao', key: 'yuanbao' },
};

T('T12 exchangeItem 奖励是货币：进钱包、不进背包、note.eco 键名正确、成本照扣', () => {
  const all = CUR_ROWS();
  assert.ok(all.length > 0, 'BZ_EXCHANGE 里必须存在奖励=货币的行（否则这条测试失去意义）');
  for (const { npc, row } of all) {
    const rewardId = parseInt(row[2], 10);
    const per = Math.max(parseInt(row[3], 10) || 1, 1);
    const meta = CUR_META[rewardId];
    assert.ok(meta, '货币 id ' + rewardId + ' 缺元数据');

    const s = mk();
    const segs = String(row[4]).split('|').filter(Boolean);
    const seed = {};
    for (const seg of segs) {
      const kv = seg.split(',');
      seed[parseInt(kv[0], 10)] = (parseInt(kv[1], 10) || 0) + 5;
    }
    s.dispatch('User', 'bzSeedBag', { itemObj: seed });
    // 钱包缺省口径与 handler 一致：yuanbao 缺省 0，其余缺省 99999
    const walletOf = (save, f) => (typeof save[f] === 'number') ? save[f] : (f === 'yuanbao' ? 0 : 99999);
    const before = walletOf(s.loadSave(), meta.field);
    const i = inner(s.dispatch('User', 'exchangeItem', { itemID: row[0], itemNum: 1, npcid: npc }), 'exchangeItem');
    const save = s.loadSave();
    const after = walletOf(save, meta.field);

    assert.strictEqual(i.eRet, 1, 'npc ' + npc + ' 行 ' + row[0] + ' 必须成功');
    assert.strictEqual(after, before + per,
      'npc ' + npc + ' 行 ' + row[0] + '：' + meta.field + ' 必须精确 +' + per);
    assert.strictEqual(bag(s)[String(rewardId)], undefined,
      'npc ' + npc + ' 行 ' + row[0] + '：货币 ' + rewardId + ' 绝不许进背包');
    assert.ok(i.note && i.note.eco && i.note.eco[meta.key] === after,
      'npc ' + npc + ' 行 ' + row[0] + '：note.eco.' + meta.key + ' 必须是新余额（客户端只认这个键）');
    assert.strictEqual(i.note.ivch[String(rewardId)], undefined,
      'npc ' + npc + ' 行 ' + row[0] + '：货币不许走 note.ivch');
    for (const seg of segs) {
      const kv = seg.split(',');
      const cid = parseInt(kv[0], 10);
      assert.strictEqual(parseInt(bag(s)[cid], 10) || 0, seed[cid] - (parseInt(kv[1], 10) || 0),
        'npc ' + npc + ' 行 ' + row[0] + '：成本 ' + cid + ' 必须真扣');
    }
  }
});

T('T13 exchangeItem 奖品是普通物品时行为不变（不许被货币分支带偏）', () => {
  const s = mk();
  const rows = BZ_EXCHANGE['10385'];
  const row = rows.find((r) => String(r[4]).split('|').length === 1 && BZ_ITEMTYPE[String(r[2])] !== 1
    && [1, 4001, 4002, 4003, 8888].indexOf(parseInt(r[2], 10)) < 0);
  assert.ok(row, '测试数据里必须能找到一条非货币非装备单成本行');
  const costID = parseInt(String(row[4]).split(',')[0], 10);
  s.dispatch('User', 'bzSeedBag', { itemObj: { [costID]: 2 } });
  const i = inner(s.dispatch('User', 'exchangeItem', { itemID: row[0], itemNum: 1, npcid: 10385 }), 'exchangeItem');
  assert.strictEqual(i.eRet, 1);
  assert.strictEqual(bag(s)[String(row[2])], row[3], '普通物品照旧进背包');
  assert.strictEqual(i.note.ivch[String(row[2])], row[3], '普通物品照旧走 note.ivch');
  assert.ok(!i.note.eco || Object.keys(i.note.eco).length === 0, '普通物品不该发 note.eco');
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[shops] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
