'use strict';
/**
 * gen_task_rewards.js —— 从游戏原始配置表生成「任务奖励 / 任务所需物品」表
 *
 * 输入（tools/cfg/ 下，由 probe/dump_tables.js 从设备 startres bundle 导出，勿手改）：
 *   tbl_tasknew.json   4842 个任务：Reward（掉落表 id）/ SpRequire（"物品id,数量" 或 "id1,n1|id2,n2"）
 *   tbl_drop.json      掉落表：{ Item1:[itemID,count], probability1, Item2... }
 *   tbl_item.json      物品表：6525 条（Type=1 装备 / 2 消耗品 / 3 材料…）
 *
 * 输出：
 *   hotfix-patch/core/bz-tasks.generated.js
 *     var BZ_TASKS = { "100150": { n:{4015:1}, r:{} }, ... }
 *       n = 完成该任务所需的物品（客户端 judgeItemRequire 会查背包）
 *       r = 完成该任务应发的奖励（掉落表展开后的 {物品id:数量}）
 *
 * 约定：
 *   - 掉落表里 probability < 100 的条目不进"必得奖励"（避免凭空多发）；仍记录在 meta 里方便排查
 *   - 货币类 id（1 / 2 / 4001 / 4002 / 4003）不进奖励（客户端 setItem 对这五个 id 走特殊分支，
 *     放进 itemObj 无效；真实服务器是走 note.eco 的，我们没有那个映射表）
 *
 * 用法： node tools/gen_task_rewards.js [--stat]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CFG = path.join(ROOT, 'tools', 'cfg');
const OUT = path.join(ROOT, 'hotfix-patch', 'core', 'bz-tasks.generated.js');

const task = JSON.parse(fs.readFileSync(path.join(CFG, 'tbl_tasknew.json'), 'utf8'));
const drop = JSON.parse(fs.readFileSync(path.join(CFG, 'tbl_drop.json'), 'utf8'));
const item = JSON.parse(fs.readFileSync(path.join(CFG, 'tbl_item.json'), 'utf8'));
const npcRaw = JSON.parse(fs.readFileSync(path.join(CFG, 'npc_compact.json'), 'utf8'));

const CURRENCY = { 1: 1, 2: 1, 4001: 1, 4002: 1, 4003: 1 };

/** 只有这三种 Type 的 SpRequire 才是"要携带的物品"。
 *  依据（客户端 index.js:134394-134426 judgeTaskFinishRequire）：
 *    Type 2/12/13 → judgeItemRequire(SpRequire)  ← 真物品
 *    Type 3       → judgeFightRequire(SpRequire) ← 怪物 id，不是物品
 *    Type 1/5/9/10/11 → 只看 Require（实测全 "0"），SpRequire 是装饰
 *  2026-10-22：以前对全部 Type 都出 `n`，导致 12 条 Type1 的装饰性需求漏进叠加，
 *  会让客户端凭空看到一个幽灵物品（R02 回执的"硬伤候选一"）。 */
const NEED_TYPES = { 2: 1, 12: 1, 13: 1 };

function dropItems(dropId) {
  const d = drop.table[String(dropId)];
  if (!d) return null;
  const out = {};
  let skippedProb = 0;
  for (let i = 1; i <= 10; i++) {
    const v = d['Item' + i];
    if (!v || !Array.isArray(v) || !v.length) continue;
    const id = parseInt(v[0], 10);
    const n = parseInt(v[1], 10) || 0;
    const p = parseInt(d['probability' + i], 10);
    if (!(id > 0) || !(n > 0)) continue;
    if (CURRENCY[id]) { skippedProb++; continue; }
    if (!(p >= 100)) { skippedProb++; continue; }
    out[id] = (out[id] || 0) + n;
  }
  return { items: out, skipped: skippedProb };
}

function requireItems(sp) {
  const s = String(sp == null ? '' : sp).trim();
  if (!s || s === '0') return {};
  const out = {};
  for (const part of s.split('|')) {
    const bits = part.split(',');
    const id = parseInt(bits[0], 10);
    const n = parseInt(bits[1], 10);
    if (!(id > 0)) continue;
    if (!(n > 0)) continue;   // 只有 id 没有数量：客户端 < undefined 判为通过，不需要发
    out[id] = (out[id] || 0) + n;
  }
  return out;
}

const table = {};
const typeMap = {};   // 被奖励/要求引用到的物品 → Type（1=装备，其它=可堆叠）
const stat = { tasks: 0, withReward: 0, withNeed: 0, rewardItems: 0, needItems: 0, dropMissing: 0, probSkipped: 0, unknownItem: 0, types: 0 };

for (const id of Object.keys(task.table)) {
  if (id.indexOf('__name:') === 0) continue;
  const t = task.table[id];
  if (!t || !t.TaskID) continue;
  const r = {};
  const rw = String(t.Reward == null ? '' : t.Reward);
  if (rw && rw !== '0') {
    const d = dropItems(rw);
    if (d) {
      stat.probSkipped += d.skipped;
      for (const k of Object.keys(d.items)) {
        if (!item.table[k]) { stat.unknownItem++; continue; }
        typeMap[k] = parseInt(item.table[k].Type, 10) || 0;
        r[k] = d.items[k];
        stat.rewardItems++;
      }
    } else if (item.table[rw]) {
      // 少部分任务的 Reward 直接写物品 id
      typeMap[rw] = parseInt(item.table[rw].Type, 10) || 0;
      r[rw] = 1;
      stat.rewardItems++;
    } else {
      stat.dropMissing++;
    }
  }
  const ty = parseInt(t.Type, 10) || 0;
  const nAll = requireItems(t.SpRequire);
  // typeMap 要覆盖"所有被引用到的物品"，包括 Type1 的装饰需求（否则 BZ_ITEMTYPE 会缺项、装备分流判错）
  for (const k of Object.keys(nAll)) {
    if (!item.table[k]) { stat.unknownItem++; continue; }
    typeMap[k] = parseInt(item.table[k].Type, 10) || 0;
  }
  // 只有 Type 2/12/13 的 SpRequire 才是真·物品需求（见文件头的 NEED_TYPES 注释）
  const n = NEED_TYPES[ty] ? nAll : {};
  for (const k of Object.keys(n)) stat.needItems++;
  const isRepeat = parseInt(t.Repeat, 10) > 0;
  if (!Object.keys(r).length && !Object.keys(n).length) continue;
  stat.tasks++;
  if (Object.keys(r).length) stat.withReward++;
  if (Object.keys(n).length) stat.withNeed++;
  table[id] = { t: ty };
  if (isRepeat) table[id].p = 1;                 // p = Repeat≠0：可重复接取，客户端不记完成
  if (Object.keys(n).length) table[id].n = n;
  if (Object.keys(r).length) table[id].r = r;
}

const lines = [];
lines.push('/* bz-tasks.generated.js —— 由 tools/gen_task_rewards.js 自动生成，勿手改');
lines.push(' * 数据源：设备 startres bundle 里的 configs/tasknew + configs/drop + configs/item（原始配置表）');
lines.push(' * n = 完成任务所需携带的物品；r = 完成任务应发奖励。生成于 ' + new Date().toISOString());
lines.push(' * 只收「有奖励」或「有物品要求」的任务；概率掉落(<100)与货币 id 不收。 */');
lines.push('var BZ_TASKS = ' + JSON.stringify(table) + ';');
lines.push('BZ_TASKS.__meta = { tasks: ' + stat.tasks + ', withReward: ' + stat.withReward + ', withNeed: ' + stat.withNeed + ' };');
lines.push('/* 被引用到的物品 → Type。1 = 装备（走 PlayerEquip 账本），其它走背包 */');
lines.push('var BZ_ITEMTYPE = ' + JSON.stringify(typeMap) + ';');

// ---- 出售价：item 表 `Price` 列 ----
// 依据：客户端 InventoryModel.sellItem（index.js:65191-65208）自己算的是
//   `o += parseInt(g.Price) * h[2]`，即 **Price**（不是 BuyPrice，BuyPrice 是商店买价）。
// 它这笔 o 只用于 15e8 上限检查，客户端不会本地加钱 → 铜钱必须由服务端结算（saleItem 的应答
// 消费端 index.js:64726-64742 一个铜钱字段都不读，所以还要主动推到 RoleBaseInfo.coins）。
const priceMap = {};
let priceCount = 0, priceZero = 0;
for (const pid of Object.keys(item.table)) {
  if (pid.indexOf('__name:') === 0) continue;
  const row = item.table[pid];
  if (!row) continue;
  const p = parseInt(row.Price, 10) || 0;
  if (p > 0) { priceMap[pid] = p; priceCount++; } else priceZero++;
}
lines.push('/* 出售价：物品id -> item 表 Price 列（客户端铜钱公式 = Price × 数量，index.js:65207） */');
lines.push('var BZ_ITEMPRICE = ' + JSON.stringify(priceMap) + ';');
lines.push('BZ_ITEMPRICE.__meta = { items: ' + priceCount + ', zeroPrice: ' + priceZero + ' };');

// ---- 商店买价：item 表 `BuyPrice` 列 ----
// 依据：NormalShopUI 建货架时写的是 `price: s.BuyPrice`（scripts2.js:46443 / 46452），
//   购买时 `o = this.price * this.counts`，npcId==0 的银两商店直接比 `RoleBaseInfo.coins`（46521）。
// 所以「买价 = BuyPrice」而「卖价 = Price」是两列，不是同一列。
const buyPriceMap = {};
let buyCount = 0, buyZero = 0;
for (const bid of Object.keys(item.table)) {
  if (bid.indexOf('__name:') === 0) continue;
  const brow = item.table[bid];
  if (!brow) continue;
  const bp = parseInt(brow.BuyPrice, 10) || 0;
  if (bp > 0) { buyPriceMap[bid] = bp; buyCount++; } else buyZero++;
}
lines.push('/* 商店买价：物品id -> item 表 BuyPrice 列（NormalShopUI 货架价，scripts2.js:46443） */');
lines.push('var BZ_ITEMBUYPRICE = ' + JSON.stringify(buyPriceMap) + ';');
lines.push('BZ_ITEMBUYPRICE.__meta = { items: ' + buyCount + ', zero: ' + buyZero + ' };');

// ---- NPC 金条商店的货架：npcid -> {i:[物品id], p:[价格], l:[限购]} ----
// 依据：SpecialGoodsModel.reqGetSpGoods(npcid) → `User.getShopItem {npcid}`（index.js:123380 / 59606），
// 应答必须是 `{eRet:1, ShopArray:{item:[...], price:[...]}}`（NormalShopUI.resListSuccess，scripts2.js:46461-46474）；
// 购买走 `User.buySpecialShopItem {npcid,itemID,itemNum}`（index.js:123386 / 59607），
// 付款货币是**金条**（NormalShopUI.onBuyBtn 里 npcId>0 分支比的是 RoleBaseInfo.gold，scripts2.js:46521）。
// 数据来源：tools/cfg/shop_tables.json 的三张带 npc 的表（random_shop: item 就是 ID；lh_shop: 有 item 列）。
const shopTablesPath = path.join(CFG, 'shop_tables.json');
const npcShop = {};
const npcShopStat = { tables: 0, npcs: 0, items: 0, dupSkipped: 0 };
if (fs.existsSync(shopTablesPath)) {
  const st = JSON.parse(fs.readFileSync(shopTablesPath, 'utf8'));
  const tables = (st && st.tables) || {};
  const NPC_TABLES = ['random_shop', 'house_shop', 'lh_shop'];
  for (const tn of NPC_TABLES) {
    const tb = tables[tn];
    if (!tb) continue;
    npcShopStat.tables++;
    for (const k of Object.keys(tb)) {
      const row = tb[k];
      if (!row) continue;
      const npc = parseInt(row.npc, 10) || 0;
      const iid = parseInt(row.item !== undefined ? row.item : row.ID, 10) || 0;
      const price = parseInt(row.price, 10) || 0;
      const limit = parseInt(row.limit, 10) || 0;
      if (!(npc > 0) || !(iid > 0) || !(price > 0)) continue;
      if (!item.table[String(iid)]) continue;
      const box = npcShop[npc] || (npcShop[npc] = { i: [], p: [], l: [] });
      if (box.i.indexOf(iid) >= 0) { npcShopStat.dupSkipped++; continue; }
      box.i.push(iid); box.p.push(price); box.l.push(limit);
      // 元数据：GetSpecialShopData 的 shopData 需要 payment/page/isserver/endtime
      // （SaleShopQiUI.shopTypeData 按 `payment==2 && parseInt(page)==页号` 筛货，scripts2.js:55272-55286）。
      // 这几列只有 random_shop 完整；lh_shop/house_shop 的 pg=0（它们走 getShopItem，不读 page）。
      box.m = box.m || {};
      box.m[iid] = {
        pay: parseInt(row.payment, 10) || 0,
        pg: parseInt(row.page, 10) || 0,
        is: parseInt(row.isserver, 10) || 0,
        et: parseInt(row.saleendtime || row.endtime, 10) || 0,
      };
      npcShopStat.items++;
    }
  }
  npcShopStat.npcs = Object.keys(npcShop).length;
}
lines.push('/* NPC 金条商店货架：npcid -> {i:[物品id], p:[价格], l:[限购]}（付款货币=金条） */');
lines.push('var BZ_NPCSHOP = ' + JSON.stringify(npcShop) + ';');
lines.push('BZ_NPCSHOP.__meta = ' + JSON.stringify(npcShopStat) + ';');
stat.npcShopNpcs = npcShopStat.npcs;
stat.npcShopItems = npcShopStat.items;

// ---- 兑换商店（User.getChangeShop / User.exchangeItem） ----
// 应答 shopObj 是"数组的数组"：客户端 ExchangeShowUI.setItemEveryData 按 c[1](页)/c[5](品质)/c[8](排序) 筛，
// ExchangeRender.setData 读 n[2](物品)/n[3](数量)/n[4](成本串)/n[9](万圣标记)（scripts2.js:20696-20729、20885-20897）。
// 购买请求带的是**兑换行 id**（ExchangeBuyUI.startBuyReqCallBack 传 objectItem[0]），所以行下标：
//   0=兑换行 id  1=页(type)  2=物品  3=数量  4=成本串"物品id,数量|..."  5=品质(type1)
//   6=限购类型  7=限购数  8=排序(order)  9=万圣标记(恒 0)
const exchangePath = path.join(CFG, 'dump', 'exchange.json');
const bzExchange = {};
if (fs.existsSync(exchangePath)) {
  const ex = JSON.parse(fs.readFileSync(exchangePath, 'utf8'));
  const rows = ex && (ex.data || ex.table) || {};
  for (const k of Object.keys(rows)) {
    const r = rows[k];
    if (!r || typeof r !== 'object') continue;
    const npc = parseInt(r.npc, 10) || 0;
    const rowId = parseInt(r.id, 10) || 0;
    const iid = parseInt(r.item, 10) || 0;
    const cost = String(r.cost || '');
    if (!(npc > 0) || !(rowId > 0) || !(iid > 0) || !cost) continue;
    (bzExchange[npc] = bzExchange[npc] || []).push([
      rowId, parseInt(r.type, 10) || 0, iid, Math.max(parseInt(r.num, 10) || 1, 1), cost,
      parseInt(r.type1, 10) || 0, parseInt(r.limittype, 10) || 0, parseInt(r.limit, 10) || 0,
      parseInt(r.order, 10) || 0, 0,
    ]);
  }
}
lines.push('/* 兑换商店：npcid -> [[行id,页,物品,数量,成本串,品质,限购类型,限购,排序,0], ...] */');
lines.push('var BZ_EXCHANGE = ' + JSON.stringify(bzExchange) + ';');
stat.exchangeNpcs = Object.keys(bzExchange).length;
stat.exchangeRows = Object.keys(bzExchange).reduce((n, k) => n + bzExchange[k].length, 0);

// ---- 正邪商店（User.getGoodAndEvilShopData / User.buyGoodAndEvilShopItem） ----
// ge_shop 25 行：ID/Name/Description/Data([itemId,num])/Price/camp/rankopen/rank1Num..rank5Num。
// 应答元素客户端读 id/Name/Price/rankopen/rankNum/buyCount/Data/Description
// （scripts3.js:35922-35930 行项、37581-37614 行项刷新、34950-34959 GoodEvilBuyUI）。
const geShopPath = path.join(CFG, 'dump', 'ge_shop.json');
const bzGeShop = [];
if (fs.existsSync(geShopPath)) {
  const gs = JSON.parse(fs.readFileSync(geShopPath, 'utf8'));
  const rows = gs && (gs.data || gs.table) || {};
  for (const k of Object.keys(rows)) {
    const r = rows[k];
    if (!r || typeof r !== 'object') continue;
    const id = parseInt(r.ID, 10) || 0;
    const data = Array.isArray(r.Data) ? r.Data : [];
    const iid = parseInt(data[0], 10) || 0;
    if (!(id > 0) || !(iid > 0)) continue;
    bzGeShop.push({
      id: id,
      Name: parseInt(r.Name, 10) || 0,
      Description: parseInt(r.Description, 10) || 0,
      Data: [iid, Math.max(parseInt(data[1], 10) || 1, 1)],
      Price: parseInt(r.Price, 10) || 0,
      camp: parseInt(r.camp, 10) || 0,
      rankopen: parseInt(r.rankopen, 10) || 0,
      rankNums: [1, 2, 3, 4, 5].map((i) => parseInt(r['rank' + i + 'Num'], 10) || 0),
    });
  }
}
lines.push('/* 正邪商店（ge_shop）：[{id,Name,Description,Data:[item,num],Price,camp,rankopen,rankNums:[r1..r5]}] */');
lines.push('var BZ_GESHOP = ' + JSON.stringify(bzGeShop) + ';');
stat.geShopRows = bzGeShop.length;

// ---- 江湖商店（User.rgGetShopData / User.rgShopByItem） ----
// rogue_shop 33 行：id/item/costitem/cost/rank/num/refresh/open/close/season/reputation/...
// 应答元素客户端读 id/costitem/cost/item/refresh/reputation/closetime/buyCount/num/rank
// （scripts3.js:75284-75363 RogueShopItem）。
const rogueShopPath = path.join(CFG, 'dump', 'rogue_shop.json');
const bzRogueShop = [];
if (fs.existsSync(rogueShopPath)) {
  const rs = JSON.parse(fs.readFileSync(rogueShopPath, 'utf8'));
  const rows = rs && (rs.data || rs.table) || {};
  for (const k of Object.keys(rows)) {
    const r = rows[k];
    if (!r || typeof r !== 'object') continue;
    const id = parseInt(r.id, 10) || 0;
    const iid = parseInt(r.item, 10) || 0;
    if (!(id > 0) || !(iid > 0)) continue;
    bzRogueShop.push({
      id: id, item: iid,
      costitem: parseInt(r.costitem, 10) || 0,
      cost: Math.max(parseInt(r.cost, 10) || 0, 0),
      num: Math.max(parseInt(r.num, 10) || 0, 0),
      refresh: parseInt(r.refresh, 10) || 0,
      rank: parseInt(r.rank, 10) || 0,
      reputation: parseInt(r.reputation, 10) || 0,
      closetime: parseInt(r.closetime, 10) || 0,
    });
  }
}
lines.push('/* 江湖商店（rogue_shop）：[{id,item,costitem,cost,num,refresh,rank,reputation,closetime}] */');
lines.push('var BZ_ROGUESHOP = ' + JSON.stringify(bzRogueShop) + ';');
stat.rogueShopRows = bzRogueShop.length;

// ---- 打怪掉落：npc.Drop → drop 表 → 物品 ----
// 每条记 [数量, 概率]：概率 >= 100 的必得，< 100 的由服务端掷点（掷点是否重复由 handler 的去重窗口管）
const npcTable = (npcRaw && npcRaw.npc) || npcRaw || {};
const npcDrop = {};        // npcId -> dropId
const dropUsed = {};       // dropId -> {itemId:[count, prob]}
const npcStat = { npcsWithDrop: 0, resolved: 0, missing: 0, dropIds: 0, guaranteed: 0, random: 0 };
const dropRows = (drop && drop.table) || {};
for (const k of Object.keys(npcTable)) {
  const d = parseInt((npcTable[k] || {}).d, 10) || 0;
  if (!(d > 0)) continue;
  npcStat.npcsWithDrop++;
  const row = dropRows[String(d)];
  if (!row) { npcStat.missing++; continue; }
  npcStat.resolved++;
  if (!dropUsed[d]) {
    const got = {};
    for (let i = 1; i <= 10; i++) {
      const v = row['Item' + i];
      if (!v) continue;
      const arr = Array.isArray(v) ? v : String(v).split(',');
      const iid = parseInt(arr[0], 10) || 0;
      const cnt = parseInt(arr[1], 10) || 1;
      const p = parseInt(row['probability' + i], 10);
      if (!(iid > 0) || !(cnt > 0)) continue;
      if (CURRENCY[iid]) continue;
      if (!(p > 0)) continue;
      got[iid] = [cnt, p];
      if (p >= 100) npcStat.guaranteed++; else npcStat.random++;
    }
    if (Object.keys(got).length) dropUsed[d] = got;
  }
  if (dropUsed[d]) npcDrop[k] = d; else npcStat.missing++;
}
npcStat.dropIds = Object.keys(dropUsed).length;
lines.push('/* 打怪掉落：npcId -> dropId；dropId -> {物品id:[数量, 概率]}（概率<100 的由 handler 掷点） */');
lines.push('var BZ_NPCDROP = ' + JSON.stringify(npcDrop) + ';');
lines.push('var BZ_DROP = ' + JSON.stringify(dropUsed) + ';');
lines.push('BZ_DROP.__meta = ' + JSON.stringify(npcStat) + ';');

// ---- 战斗准备：可战斗 npc 的 26 项数值（客户端 generateNpcData 的固定顺序，见 index.js:8093-8134）----
// ⚠ 2026-10-22 事故：`npc_stats.json` 里每个 npc 只有 **22 格**，而 generateNpcData 要 26 格：
//   t[22]=经脉等级  t[23]=**HardModel（数组）**  t[24]=武器系数  t[25]=excess
//   缺 t[23] → `initRivalEntity` 的 `e.HardModel[0]` 抛 TypeError（index.js:74652）→ 战斗 0.2 秒内静默失败。
//   所以这里强制补齐 26 格，HardModel 优先取 npc 配置表的真值，取不到就 [0,0]。
const npcStatsPath = path.join(CFG, 'npc_stats.json');
let npcArrMap = {}, npcArrCount = 0;
let hardModelMap = {}, hardModelSrc = 'none';
if (fs.existsSync(npcStatsPath)) {
  npcArrMap = JSON.parse(fs.readFileSync(npcStatsPath, 'utf8'));
  // HardModel 真值来自 442 张表的 npc 导出版（tools/cfg/dump/npc.json）
  const npcDumpPath = path.join(CFG, 'dump', 'npc.json');
  if (fs.existsSync(npcDumpPath)) {
    try {
      const nd = JSON.parse(fs.readFileSync(npcDumpPath, 'utf8'));
      const ndRows = nd.data || nd.table || {};
      for (const k of Object.keys(ndRows)) {
        if (k.indexOf('__name:') === 0) continue;
        const r = ndRows[k];
        if (r && Array.isArray(r.HardModel)) hardModelMap[k] = r.HardModel;
      }
      hardModelSrc = 'dump/npc.json';
    } catch (e) { hardModelSrc = 'dump-err:' + e.message; }
  }
  const NPC_SLOTS = 26;
  let padded = 0, hmHit = 0;
  for (const nk of Object.keys(npcArrMap)) {
    if (nk === '__meta') continue;
    const arr = npcArrMap[nk];
    if (!Array.isArray(arr)) continue;
    if (arr.length >= NPC_SLOTS) { arr.length = NPC_SLOTS; continue; }
    while (arr.length < NPC_SLOTS) arr.push(0);          // 先补到 26
    arr[22] = (typeof arr[22] === 'number') ? arr[22] : 0;   // 经脉等级：0 = 不启用 acpLvDic
    const hm = hardModelMap[nk];
    arr[23] = Array.isArray(hm) && hm.length >= 2 ? hm : [0, 0];   // HardModel：必须是数组
    if (Array.isArray(hm)) hmHit++;
    arr[24] = (typeof arr[24] === 'number') ? arr[24] : 0;   // 武器系数
    if (arr[25] === undefined) arr[25] = '0';                // excess（模板里是字符串 "0"）
    padded++;
  }
  npcArrCount = Object.keys(npcArrMap).length;
  stat.npcArrPadded = padded;
  stat.npcArrHardModel = hmHit;
  stat.npcArrHardModelSrc = hardModelSrc;
}
lines.push('/* 战斗用：npcId -> [bili,shenfa,gengu,wuxing,exp,HP,MP,Attack,Hit,Defense,face,sex,Weapon,Equip,jineng,qinggong,neigong,AttributeType,Miss,AI,BreakDef,InterDamRes,acpLv,HardModel,WeaponCo,excess] —— 必须 26 项 */');
lines.push('var BZ_NPCARR = ' + JSON.stringify(npcArrMap) + ';');
lines.push('BZ_NPCARR.__meta = { npcs: ' + npcArrCount + ', hardModelSrc: ' + JSON.stringify(hardModelSrc) + ' };');
lines.push('');


stat.types = Object.keys(typeMap).length;
stat.priceItems = priceCount;
stat.buyPriceItems = buyCount;

if (process.argv.includes('--stat')) {
  console.log(JSON.stringify(stat, null, 1));
  console.log('sample 100150:', JSON.stringify(table['100150']));
  console.log('sample 100010:', JSON.stringify(table['100010']));
  process.exit(0);
}

fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(JSON.stringify({
  ok: true, ...stat,
  bytes: Buffer.byteLength(lines.join('\n')),
  wrote: path.relative(ROOT, OUT),
  sample100150: table['100150'] || null,
  sample100010: table['100010'] || null,
}, null, 1));
