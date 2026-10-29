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

/** ===== 环任务 / 委托任务（第 3 批 C02 欠账 §6.1）：circle_task =====
 *  源表 circle_task 的 _Money/_Exp/_Potential 是 **MadNumber 混淆对象**，形如
 *    {"offset":17995,"xo":…,"chsm":[…],"_actIntv":[125],"_value":[18120],"tag":"cfMon"}
 *  真实值 = `_value[0] - offset`（取值点 index.js:73908-73915 的 value getter：
 *  `var t = this._value[0] - this.offset; Math.floor(t); return t;`）。
 *  ⚠ `offset` 是**运行时随机生成**的（index.js:73898 `Math.floor(1e4*Math.random()+1e4)`），
 *  **绝不能硬编码**，必须逐行读 dump 里自带的那一份。
 *  交叉核验：同一对象里的 `_actIntv[0]` 恰好等于解码值（21 行 × 3 列全一致，见
 *  batch3-facts-20261025/C3-circle-task.md）；两者不一致时以 `_value[0]-offset` 为准并告警。
 */
function cfMonDecode(o, where) {
  if (!o || typeof o !== 'object' || !Array.isArray(o._value)) return 0;
  const raw = parseInt(o._value[0], 10);
  const off = parseInt(o.offset, 10);
  if (!Number.isFinite(raw) || !Number.isFinite(off)) return 0;
  const v = raw - off;
  const act = Array.isArray(o._actIntv) ? parseInt(o._actIntv[0], 10) : NaN;
  if (Number.isFinite(act) && act !== v) {
    console.warn('  ⚠ cfMon 交叉核验不一致 @ ' + where + '：_value[0]-offset=' + v + ' vs _actIntv[0]=' + act + '（以解码值为准）');
  }
  return v;
}

/** 每行一个「等级段」档位：lo/hi = 该段适用等级区间（low_limit/limit），
 *  m/e/p = 银两 / 经验 / 潜能（cfMon 解码后），
 *  talk/fight/item = 该段可用的 NPC / 装备 池（TalkNpc / FightNpc / Item）。
 *  用途：getCircleTaskList 的 taskArr 行由本表 + entrust_task/entrust_level 共同投射。 */
const circleRaw = rowsOf('circle_task.json');
const circleTask = {};
for (const k of Object.keys(circleRaw)) {
  const r = circleRaw[k] || {};
  circleTask[k] = {
    m: cfMonDecode(r._Money, 'circle_task.' + k + '._Money'),
    e: cfMonDecode(r._Exp, 'circle_task.' + k + '._Exp'),
    p: cfMonDecode(r._Potential, 'circle_task.' + k + '._Potential'),
    lo: parseInt(r.low_limit, 10) || 0,
    hi: parseInt(r.limit, 10) || 0,
    talk: Array.isArray(r.TalkNpc) ? r.TalkNpc.map((x) => parseInt(x, 10) || 0) : [],
    fight: Array.isArray(r.FightNpc) ? r.FightNpc.map((x) => parseInt(x, 10) || 0) : [],
    item: Array.isArray(r.Item) ? r.Item.map((x) => parseInt(x, 10) || 0) : [],
  };
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

/** ===== 第 5 批 C16〔成就〕：五张表 =====
 *  ⚠ 命名上这里放"成就"确实别扭（文件叫 shop_tables），但 bz-tasks.generated.js 被
 *  tools/gen_obtainable.js 做了 md5 未变断言，不动它更安全。两者都会被 build-handlers
 *  拼进同一个 bundle，放哪个文件对运行时没有区别。
 *
 *  用途：
 *    BZ_ACHIEVE_META  id → [group, point]   校验 id 存在 + 组积分累加
 *    BZ_ACHIEVE_RW    id → [[物品,数量],…]   只为 reward≠0 的 421 条生成
 *    BZ_ACHIEVE_RATE  id → {g:组, p:所需积分, r:奖励}
 *    BZ_ACHIEVE_SUIT  id → {ach:[所需成就id], t:{档位:奖励}}
 *    BZ_ACHIEVE_MARK  id → {t:type, rq:require}
 *
 *  reward 编码（已采样确认）：
 *    achieve_list.reward  "物品id,数量" 用 `|` 分隔，与既有 parseAward 同形；"0" = 无奖励
 *    achieve_suit.reward  `&` 分档，每档 = `档位|奖励|奖励…`
 *      例 "3|6253,2&6|3325,1|6658,10&9|1,100&12|3325,1|6658,20"
 *         → 档3:[[6253,2]]  档6:[[3325,1],[6658,10]]  档9:[[1,100]]  档12:[[3325,1],[6658,20]]
 *    achieve_rate.item    "物品id,数量"（单条）
 */
const achieveList = rowsOf('achieve_list.json');
const achieveSuitRaw = rowsOf('achieve_suit.json');
const achieveRateRaw = rowsOf('achieve_rate.json');
const achieveMarkRaw = rowsOf('achieve_mark.json');

const achMeta = {};
const achRw = {};
for (const k of Object.keys(achieveList)) {
  const r = achieveList[k] || {};
  achMeta[k] = [parseInt(r.group, 10) || 0, parseInt(r.point, 10) || 0];
  const rw = parseAward(String(r.reward === undefined ? '0' : r.reward));
  if (rw.length) achRw[k] = rw;
}

/** achieve_suit 的 "档位|奖励…&档位|奖励…" */
function parseSuitTiers(s) {
  const out = {};
  if (typeof s !== 'string' || !s.length || s === '0') return out;
  for (const seg of s.split('&')) {
    const parts = seg.split('|');
    const tier = parseInt(parts[0], 10);
    if (!(tier > 0)) continue;
    const rw = parseAward(parts.slice(1).join('|'));
    if (rw.length) out[String(tier)] = rw;
  }
  return out;
}
const achSuit = {};
for (const k of Object.keys(achieveSuitRaw)) {
  const r = achieveSuitRaw[k] || {};
  achSuit[k] = {
    ach: Array.isArray(r.achieve) ? r.achieve.map((x) => parseInt(x, 10) || 0) : [],
    t: parseSuitTiers(String(r.reward === undefined ? '0' : r.reward)),
  };
}
const achRate = {};
for (const k of Object.keys(achieveRateRaw)) {
  const r = achieveRateRaw[k] || {};
  achRate[k] = {
    g: parseInt(r.group, 10) || 0,
    p: parseInt(r.points, 10) || 0,
    r: parseAward(String(r.item === undefined ? '0' : r.item)),
  };
}
const achMark = {};
for (const k of Object.keys(achieveMarkRaw)) {
  const r = achieveMarkRaw[k] || {};
  achMark[k] = { t: parseInt(r.type, 10) || 0, rq: String(r.require === undefined ? '0' : r.require) };
}

/** ===== v2.7.1：adventure（随机事件领奖 GetRandomEventAward 的唯一奖励来源）=====
 *  源表 adventure.json 的 awardwin/awardfalse/award/award2 编码是 **单个扁平对 [物品id,数量]**
 *  （全表 109 行 × 4 列实证：非空列长度恒为 2，没有多对连写），负数量 = 代价/惩罚条目
 *  （如 award2=[4,-1]），服务端跳过非正数（照发负数=扣玩家没有的东西）。
 *  生成器统一归一化成 [[物品id,数量]] 对列表（空列 → []），服务端与 grantRewardList 同形。
 *  实测四列里只出现物品 id 2/3/4（善恶/筹码/幸福度，活体探针定名）—— 全部无钱包落点。
 */
function flatPair(v) {
  if (!Array.isArray(v) || v.length < 2) return [];
  const id = parseInt(v[0], 10) || 0;
  const n = parseInt(v[1], 10) || 0;
  return id > 0 ? [[id, n]] : [];
}
const adventureRaw = rowsOf('adventure.json');
const adventure = {};
for (const k of Object.keys(adventureRaw)) {
  const r = adventureRaw[k] || {};
  adventure[k] = {
    win: flatPair(r.awardwin),
    fl: flatPair(r.awardfalse),
    a: flatPair(r.award),
    a2: flatPair(r.award2),
    /** gsp_event 列：客户端请求里 adventureID 恒为 0（WMapAdvModel.advCurId 从不赋真值，
     *  index.js 三处赋值全是 0），真正的键是 eventID = gsp_event 行 id
     *  （index.js:88453-88455 onEnterAdventure: this.eventID = e; getItem(e, "gsp_event")；
     *  请求侧 index.js:143868 eventID: c.RumorModel.eventID）。服务端按 ev 反查行。 */
    ev: Array.isArray(r.gsp_event) ? r.gsp_event.map((x) => parseInt(x, 10) || 0) : [],
  };
}

/** ===== v2.7.1：成就条件列（BZ_ACHIEVE_COND）=====
 *  id → {t:type, t1:type1, rq:require, tm:times}，服务端进度重算用。
 *  键约定来自客户端（scripts3.js:3055）：进度键 `type_type1` 与 `type_type1_require`。 */
const achCond = {};
for (const k of Object.keys(achieveList)) {
  const r = achieveList[k] || {};
  achCond[k] = {
    t: parseInt(r.type, 10) || 0,
    t1: String(r.type1 === undefined ? '' : r.type1),
    rq: String(r.require === undefined ? '' : r.require),
    tm: parseInt(r.times, 10) || 0,
  };
}

/** ===== 第 6 批 C04〔婚姻子女〕：propose / make 存在性表 =====
 *  propose.json（36 行，键=Npcid）：提亲/结婚的合法 NPC 白名单。
 *  make.json（5 行，键=id 1..5）：同床动画/文案档位（makeID 只用于客户端显示）。
 *  两表都**没有奖励列**（scoutB 逐列核对）→ 本批不涉及发钱，只有状态机与锁定。 */
const proposeRaw = rowsOf('propose.json');
const bzPropose = {};
for (const k of Object.keys(proposeRaw)) bzPropose[k] = 1;
const makeRaw = rowsOf('make.json');
const bzMake = {};
for (const k of Object.keys(makeRaw)) bzMake[k] = 1;

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
L.push('/* 环任务档位表（§6.1）：键 = circle_task 行键 1..21，值 = {m,e,p,lo,hi,talk,fight,item}。');
L.push(' * 解出的是 cfMon 混淆值（_value[0]-offset），offset 逐行读、不可硬编码。 */');
L.push('var BZ_CIRCLE_TASK = ' + JSON.stringify(circleTask) + ';');
L.push('BZ_CIRCLE_TASK.__meta = { tiers: ' + Object.keys(circleTask).length + ' };');
L.push('var BZ_SNOWMAN = ' + JSON.stringify(snowman) + ';');
L.push('BZ_SNOWMAN.__meta = { levels: ' + Object.keys(snowman).length + ' };');
L.push('var BZ_SQUARE_BALL = ' + JSON.stringify(ballAward) + ';');
L.push('BZ_SQUARE_BALL.__meta = { tiers: ' + Object.keys(ballAward).length + ' };');
L.push('/* 第 5 批 C16〔成就〕。⚠ 不带 __meta 以外的多余键：handler 用 hasOwn 逐 id 查。 */');
L.push('var BZ_ACHIEVE_META = ' + JSON.stringify(achMeta) + ';');
L.push('BZ_ACHIEVE_META.__meta = { rows: ' + Object.keys(achMeta).length + ' };');
L.push('var BZ_ACHIEVE_RW = ' + JSON.stringify(achRw) + ';');
L.push('BZ_ACHIEVE_RW.__meta = { withReward: ' + Object.keys(achRw).length + ' };');
L.push('var BZ_ACHIEVE_RATE = ' + JSON.stringify(achRate) + ';');
L.push('BZ_ACHIEVE_RATE.__meta = { rows: ' + Object.keys(achRate).length + ' };');
L.push('var BZ_ACHIEVE_SUIT = ' + JSON.stringify(achSuit) + ';');
L.push('BZ_ACHIEVE_SUIT.__meta = { rows: ' + Object.keys(achSuit).length + ' };');
L.push('var BZ_ACHIEVE_MARK = ' + JSON.stringify(achMark) + ';');
L.push('BZ_ACHIEVE_MARK.__meta = { rows: ' + Object.keys(achMark).length + ' };');
L.push('/* v2.7.1：随机事件奖励表（键=adventureID，四列各自是 [物品id,数量]，负数=惩罚条目）。 */');
L.push('var BZ_ADVENTURE = ' + JSON.stringify(adventure) + ';');
L.push('BZ_ADVENTURE.__meta = { rows: ' + Object.keys(adventure).length + ' };');
L.push('/* v2.7.1：成就条件列（id → {t,t1,rq,tm}），服务端进度重算用。 */');
L.push('var BZ_ACHIEVE_COND = ' + JSON.stringify(achCond) + ';');
L.push('BZ_ACHIEVE_COND.__meta = { rows: ' + Object.keys(achCond).length + ' };');
L.push('/* 第 6 批 C04〔婚姻子女〕存在性表（两表均无奖励列）。 */');
L.push('var BZ_PROPOSE = ' + JSON.stringify(bzPropose) + ';');
L.push('BZ_PROPOSE.__meta = { npcs: ' + Object.keys(bzPropose).length + ' };');
L.push('var BZ_MAKE = ' + JSON.stringify(bzMake) + ';');
L.push('BZ_MAKE.__meta = { tiers: ' + Object.keys(bzMake).length + ' };');

const out = L.join('\n') + '\n';
require('vm').compileFunction(out);   // 生成即编译校验
fs.writeFileSync(outPath, out, 'utf8');
console.log('SHOPS OK  bytes=' + Buffer.byteLength(out) + '  -> ' + outPath);
console.log('  inn=' + Object.keys(inn).length + ' sect=' + Object.keys(sect).length
  + ' mall=' + Object.keys(mall).length + ' mount=' + Object.keys(mount).length
  + ' tls=' + Object.keys(tls).length + ' formula=' + Object.keys(formula).length
  + ' passTiers=' + Object.keys(passRow).length + ' passLevels=' + passPrice.length
  + ' passEnd=' + passEnd + ' gfTiers=' + Object.keys(gfRow).length
  + ' circleTiers=' + Object.keys(circleTask).length
  + ' adventureRows=' + Object.keys(adventure).length
  + ' achCond=' + Object.keys(achCond).length
  + ' proposeNpcs=' + Object.keys(bzPropose).length
  + ' makeTiers=' + Object.keys(bzMake).length);
console.log('  circle_task 解码样本：1→{m:' + circleTask['1'].m + ',e:' + circleTask['1'].e
  + ',p:' + circleTask['1'].p + ',lo:' + circleTask['1'].lo + ',hi:' + circleTask['1'].hi
  + ',talk:' + circleTask['1'].talk.length + ',fight:' + circleTask['1'].fight.length
  + ',item:' + circleTask['1'].item.length + '}'
  + '  21→{m:' + circleTask['21'].m + ',e:' + circleTask['21'].e + ',p:' + circleTask['21'].p + '}');
