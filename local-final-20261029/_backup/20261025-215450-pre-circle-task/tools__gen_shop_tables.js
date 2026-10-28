'use strict';
/**
 * gen_shop_tables.js —— 生成 core/bz-shops.generated.js（第 1 批「商店交易」的货架/价目数据）
 *
 * 数据源：tools/cfg/dump/ 下的原始配置表。产物只被 build-handlers.js 拼进 handlers bundle。
 * 重新生成：node tools/gen_shop_tables.js
 * ⚠ 产物里不许出现真实时间戳（build 的时间戳断言只认固定时钟）。
 */
const fs = require('fs');
const path = require('path');

const dumpDir = path.join(__dirname, 'cfg', 'dump');
const outPath = path.join(__dirname, '..', 'hotfix-patch', 'core', 'bz-shops.generated.js');

/** dump 的 json 形状：{name, rows, cols, data:[{id:row,…}]}（data 是单元素数组包一个字典） */
function rowsOf(file) {
  const j = JSON.parse(fs.readFileSync(path.join(dumpDir, file), 'utf8'));
  let d = j.data;
  if (Array.isArray(d)) d = d[0];
  if (!d || typeof d !== 'object') throw new Error(file + ': 找不到 data 行字典');
  return d;
}

const inn = rowsOf('sim_shopconfig.json');        // 客栈货架：food_bag "id,数|…"、cookbook、price
const sect = rowsOf('sect_shop.json');            // 门派商店：item、price（门派贡献）
const mall = rowsOf('mall.json');                 // 元宝商城：Type 1/2/3、Price（金条）、Data[物品id,数量]
const mount = rowsOf('mount.json');               // 坐骑：price = **金条**价（2026-10-25 更正；原注"铜钱"是错的，证据 index.js:55885 区外的 scripts2.js:18754 用 RoleBaseInfo.gold 比价）
const tls = rowsOf('time_limit_sale.json');       // 弹出礼包：price1/2/3=[原价,元宝价]、treasure1/2/3="id,数|…"
const formulaRaw = rowsOf('formula.json');        // 炼丹配方：type/time/price/name（buyFormula 计价 + getAlchemyData 货架）
const shopEntrance = rowsOf('shop_entrance.json'); // 商城入口菜单：行键即 shopActiveList 成员（GetShopAllActive）
const passLevel = rowsOf('pass_level.json');       // 侠客令档位：id / price（元宝价）/ award（对应 pass_award 的哪一列）
const passAward = rowsOf('pass_award.json');       // 侠客令 12 阶：id / liveness（所需活跃度）/ award1..award4（四档各自奖励）
const passLiveness = rowsOf('pass_liveness.json'); // 侠客令活跃度来源：type / parameter / liveness / begintime / endtime
const gfRaw = rowsOf('anniversary_pass_award.json'); // 侠客令/大侠令（NewGFUI 双轨）22 阶：liveness / award1(侠客令) / award2(大侠令)

const formula = {};
for (const k of Object.keys(formulaRaw)) {
  const r = formulaRaw[k] || {};
  formula[k] = { t: parseInt(r.type, 10) || 0, tm: parseInt(r.time, 10) || 0,
                 p: parseInt(r.price, 10) || 0, n: parseInt(r.name, 10) || 0 };
}

/** 侠客令档位表：客户端 InviteCellRender 固定读 **4 个奖励位**
 *  （scripts2.js:35118 `for (var p = 0; p < 4; p++) { c.getItem(this.data[2 + p][0], "item") ... }`），
 *  且 `d = p < this.tag` 决定第 p 格是否解锁（tag = 当前档位）→ 买第 2 档开 award1+award2 … 买第 4 档四格全开。
 *  所以每一行就是 `[passID, liveness, award1, award2, award3, award4]`，
 *  长度必须 ≥6：少于 4 个奖励位会在 `this.data[2 + p][0]` 处下标越界。 */
const passRow = {};
for (const k of Object.keys(passAward)) {
  const r = passAward[k] || {};
  passRow[k] = [
    parseInt(r.id, 10) || 0,
    parseInt(r.liveness, 10) || 0,
    r.award1 || [], r.award2 || [], r.award3 || [], r.award4 || [],
  ];
}
/** 四档价目（元宝）：pass_level.price，按行键升序。客户端的 goldArr 就是这个。 */
const passPrice = Object.keys(passLevel).sort((a, b) => Number(a) - Number(b))
  .map((k) => parseInt((passLevel[k] || {}).price, 10) || 0);
/** 活动结束时间：pass_liveness 各行 endtime 取最大（只用于面板倒计时；已过期则客户端不显示倒计时）。 */
let passEnd = 0;
for (const k of Object.keys(passLiveness)) {
  const e = parseInt((passLiveness[k] || {}).endtime, 10) || 0;
  if (e > passEnd) passEnd = e;
}

/** 侠客令 / 大侠令（`NewGFUI` 双轨，22 阶，源表 anniversary_pass_award）：
 *  客户端 growthObj 每行形状由 scripts2.js:45854-45880 定死：
 *    [0] 状态（1=可领、2=已领、其他=未达成，走 btnLabel 显示 Lv）
 *    [1] 需求等级（45855 `getSkillLvData(data[1])` + 45866 显示 "Lv"+data[1]）
 *    [2] 保留位（当前客户端不读）
 *    [3..6] 奖励，**必须从 3 连续排、每格都是数组**
 *           （45879 `for (n = 0; n < 4 && t[3 + n].length > 0; n++)` —— 遇到空数组就停，
 *            而 undefined.length 会直接抛，所以四格必须都存在，不足用 [] 占位）
 *  轨道：award1 = 侠客令（免费轨，对应 dataArr[0] / getGrowupData）
 *        award2 = 大侠令（付费轨，对应 dataArr[1] / getBigGrowupData）
 *  奖励串形如 "4003,10000" 或 "6034,1|4003,200000"（多个用 | 分隔）。 */
function parseAward(s) {
  const out = [];
  if (typeof s !== 'string' || !s.length || s === '0') return out;
  for (const seg of s.split('|')) {
    const kv = seg.split(',');
    const id = parseInt(kv[0], 10) || 0;
    const n = parseInt(kv[1], 10) || 0;
    if (id > 0 && n > 0) out.push([id, n]);
  }
  return out;
}
const gfRow = {};
for (const k of Object.keys(gfRaw)) {
  const r = gfRaw[k] || {};
  gfRow[k] = { lv: parseInt(r.liveness, 10) || 0, a1: parseAward(r.award1), a2: parseAward(r.award2) };
}

/** 雪球活动（第 2 批 C05）：snowman 每行 = 一个雪人等级。
 *  hp = 雪人血量（1..99999999），type = 模型 id，consolationprize = 安慰奖串
 *  形如 "4001,10|4003,5"（4001=银两、4003=潜能，**都是货币**）。
 *  ⚠ 货币必须走 grantRewardList 才会进钱包；用 grantItem 会变成背包里一件叫「潜能」的道具。 */
const snowmanRaw = rowsOf('snowman.json');
const snowman = {};
for (const k of Object.keys(snowmanRaw)) {
  const r = snowmanRaw[k] || {};
  snowman[k] = { hp: parseInt(r.hp, 10) || 0, t: parseInt(r.type, 10) || 0, cons: parseAward(r.consolationprize) };
}

/** 摔炮奖励（UseAllBall）：square_ball 每行一个档位，
 *  rn = rewardnum（数量 7/10/13/16/18/20），ri = rewarditem（物品 id，全档 10558）。 */
const ballRaw = rowsOf('square_ball.json');
const ballAward = {};
for (const k of Object.keys(ballRaw)) {
  const r = ballRaw[k] || {};
  ballAward[k] = {
    lv: parseInt(r.level, 10) || 0,
    rn: parseInt(r.rewardnum, 10) || 0,
    ri: parseInt(r.rewarditem, 10) || 0,
    sz: Number(r.size) || 0,
  };
}

const L = [];L.push('/* bz-shops.generated.js —— 由 tools/gen_shop_tables.js 自动生成，勿手改');
L.push(' * 第 1 批「商店交易」（关联分析 C01）新 handler 的货架/价目数据。');
L.push(' * 数据源：tools/cfg/dump/{sim_shopconfig,sect_shop,mall,mount,time_limit_sale,formula,shop_entrance,pass_level,pass_award,pass_liveness}.json');
L.push(' * 重新生成：node tools/gen_shop_tables.js');
L.push(' * 证据：shop-batch1/recon/侦察.md（客户端 send/回调行号） */');
L.push('var BZ_INNSHOP = ' + JSON.stringify(inn) + ';');
L.push('BZ_INNSHOP.__meta = { shelves: ' + Object.keys(inn).length + ' };');
L.push('var BZ_SECTSHOP = ' + JSON.stringify(sect) + ';');
L.push('BZ_SECTSHOP.__meta = { goods: ' + Object.keys(sect).length + ' };');
L.push('var BZ_MALL = ' + JSON.stringify(mall) + ';');
L.push('BZ_MALL.__meta = { goods: ' + Object.keys(mall).length + ' };');
L.push('var BZ_MOUNT = ' + JSON.stringify(mount) + ';');
L.push('BZ_MOUNT.__meta = { mounts: ' + Object.keys(mount).length + ' };');
L.push('var BZ_TIMELIMITSALE = ' + JSON.stringify(tls) + ';');
L.push('BZ_TIMELIMITSALE.__meta = { gifts: ' + Object.keys(tls).length + ' };');
L.push('var BZ_FORMULA = ' + JSON.stringify(formula) + ';');
L.push('BZ_FORMULA.__meta = { formulas: ' + Object.keys(formula).length + ' };');
L.push('var BZ_SHOP_ENTRANCE = ' + JSON.stringify(shopEntrance) + ';');
L.push('BZ_SHOP_ENTRANCE.__meta = { entrances: ' + Object.keys(shopEntrance).length + ' };');
L.push('var BZ_PASS_ROW = ' + JSON.stringify(passRow) + ';');
L.push('BZ_PASS_ROW.__meta = { tiers: ' + Object.keys(passRow).length + ' };');
L.push('var BZ_PASS_PRICE = ' + JSON.stringify(passPrice) + ';');
L.push('BZ_PASS_PRICE.__meta = { levels: ' + passPrice.length + ' };');
L.push('var BZ_PASS_ENDTIME = ' + JSON.stringify(passEnd) + ';');
L.push('var BZ_GF_ROW = ' + JSON.stringify(gfRow) + ';');
L.push('BZ_GF_ROW.__meta = { tiers: ' + Object.keys(gfRow).length + ' };');
L.push('var BZ_SNOWMAN = ' + JSON.stringify(snowman) + ';');
L.push('BZ_SNOWMAN.__meta = { levels: ' + Object.keys(snowman).length + ' };');
L.push('var BZ_SQUARE_BALL = ' + JSON.stringify(ballAward) + ';');
L.push('BZ_SQUARE_BALL.__meta = { tiers: ' + Object.keys(ballAward).length + ' };');

const out = L.join('\n') + '\n';
require('vm').compileFunction(out);   // 生成即编译校验
fs.writeFileSync(outPath, out, 'utf8');
console.log('SHOPS OK  bytes=' + Buffer.byteLength(out) + '  -> ' + outPath);
console.log('  inn=' + Object.keys(inn).length + ' sect=' + Object.keys(sect).length
  + ' mall=' + Object.keys(mall).length + ' mount=' + Object.keys(mount).length
  + ' tls=' + Object.keys(tls).length + ' formula=' + Object.keys(formula).length
  + ' passTiers=' + Object.keys(passRow).length + ' passLevels=' + passPrice.length
  + ' passEnd=' + passEnd + ' gfTiers=' + Object.keys(gfRow).length);
