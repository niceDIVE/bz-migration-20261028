'use strict';
/**
 * gen_c10_tables.js —— 第 11 批 C10〔农作物〕的紧凑表（2026-10-27）
 *
 * 产出 `hotfix-patch\core\bz-c10.generated.js`：`var BZ_PLANT = {...}`
 *
 * 数据来源（全部是 dump 里的表，逐条可复核）：
 *   · `tools\cfg\dump\home_plant_crop.json`      —— 主表（键 = 种子 item id，53 行）
 *   · `tools\cfg\dump\home_plant_cropevent.json` —— 家事件 4 行（type/time/probability/addtime/develop）
 *   · `tools\cfg\dump\home_plant_details.json`   —— 零碎数值（id=2 每次加速补秒数、id=31 加速道具 id、id=7 偷菜文案数）
 *   · `tools\cfg\dump\home_plant_exp.json`       —— 种植等级经验表（15 行）
 *
 * 口径（用户 2026-10-27 拍板）：
 *   ① 真实计时 + 加速免费（按表的 seedtime/seedling/grow/mature/ten/fifty/hundred 秒数）
 *   ② 收获按状态取产物：状态 4→matureitem、5→tenitem、6→fiftyitem、7→hundreditem（表怎么写就怎么发）
 *   ③ 事件本批不随机刷（m.eid 恒 0）→ 事件表只做结构留档，服务端不下发 eid
 *
 * 阶段编号（客户端 LandUI/PlantSystemMgr 一致，index.js:95572-95589 / scripts2.js:37704）：
 *   0 = 空地；1 seedtime；2 seedling；3 grow；4 mature；5 ten；6 fifty；7 hundred
 *
 * 用法：node tools\gen_c10_tables.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DUMP = path.join(ROOT, 'tools', 'cfg', 'dump');
const OUT = path.join(ROOT, 'hotfix-patch', 'core', 'bz-c10.generated.js');

const readDump = (name) => JSON.parse(fs.readFileSync(path.join(DUMP, name), 'utf8'));
const rowsOf = (tbl) => Object.keys(tbl.data).map((k) => tbl.data[k]);
const i10 = (v) => parseInt(v, 10) || 0;

/* ---------- 1. 作物主表 ---------- */
const cropTbl = readDump('home_plant_crop.json');
const crops = {};
const stageNames = ['seedtime', 'seedling', 'grow', 'mature', 'ten', 'fifty', 'hundred'];
const order = [4, 5, 6, 7];
const outCols = { 4: ['matureitem', 'maturenum'], 5: ['tenitem', 'tennum'], 6: ['fiftyitem', 'fiftynum'], 7: ['hundreditem', 'hundrednum'] };

rowsOf(cropTbl).forEach((r) => {
  const seed = i10(r.seed);
  if (!(seed > 0)) return;
  const st = stageNames.map((k) => i10(r[k]));
  // 阶段 1..7 的秒数。表里 hundred 常为 0（该作物没有第 7 阶段）→ 保留 0，状态机用它判"到顶"。
  const out = {};
  order.forEach((s) => {
    const [ci, ni] = outCols[s];
    const item = i10(r[ci]), num = i10(r[ni]);
    if (item > 0 && num > 0) out[s] = [item, num];
  });
  crops[seed] = {
    id: seed,
    n: i10(r.seednum) || 1,          // 一次播种消耗几颗种子
    plant: i10(r.plant),             // 文案 id（客户端 getText(t.plant)，不是道具）
    exp: i10(r.exp),                 // 收获给多少经验（喂 aExp / s.plant.exp）
    st: st,                          // 阶段 1..7 秒数
    out: out,                        // 状态 → [itemId, num]
    effect: Number(r.effect) || 0,   // 场景加速折扣（客户端在 speed 命中时 ×(1-effect)）
    speed: Array.isArray(r.speed) ? r.speed.slice() : [],
    weed: i10(r.weed),
    dis: i10(r.disinsection),
    follow: i10(r.follow),
    active: i10(r.active),
    start: i10(r.start),
    end: i10(r.end),
  };
});

/* ---------- 2. 家事件 4 行 ---------- */
const events = {};
rowsOf(readDump('home_plant_cropevent.json')).forEach((r) => {
  const id = i10(r.id);
  if (!(id > 0)) return;
  events[id] = {
    id: id,
    type: i10(r.type),
    time: i10(r.time),
    prob: i10(r.probability),
    addtime: i10(r.addtime),
    master: i10(r.master),
    friend: i10(r.friend),
    icon: r.icon,
    event: i10(r.event),
    develop: Array.isArray(r.develop) ? r.develop.slice() : [],
  };
});

/* ---------- 3. 零碎数值 / 种植等级经验 ---------- */
const details = {};
rowsOf(readDump('home_plant_details.json')).forEach((r) => { details[i10(r.id)] = i10(r.num); });
const levels = {};
rowsOf(readDump('home_plant_exp.json')).forEach((r) => { levels[i10(r.id)] = i10(r.exp); });

/* ---------- 4. 家园种子商店货架（用户 2026-10-27 拍板：平价 + 不限购）----------
 * 表里**没有**家园种子商店的价目（`shop.json` 只有 19 行 ID→Item 映射、不含任何种子；
 * 种子的 `BuyPrice` 列全是 0）→ 价格只能自定口径。
 * 拍板：买价 = `item.Price`（卖价，53 种里出现的是 100 银两），**平价买卖**；不限购 → 响应里不发 `limit`。
 * 客户端契约（scoutT-homeshop.md）：`shopArr[i]` 是三元组 `[itemId, 类别tag, 单价]`
 *   （scripts2.js:31545 按 [1] 分类、31337 打印 [2]、31343-31344 传 itemId/price）；
 *   买入请求是 `{itemID, itemNum}`（index.js:58153）；`CROP_SALE_SHOP` 监听器只读 `HomePlantModel.shopSaleLimit`。 */
const itemTbl = readDump('item.json');
const DEFAULT_SEED_PRICE = 100;
const shop = [];
const noItemRow = [];
seeds0().forEach((seed) => {
  const it = itemTbl.data[String(seed)];
  if (!it) { noItemRow.push(seed); return; }
  const price = i10(it.Price) > 0 ? i10(it.Price) : DEFAULT_SEED_PRICE;
  shop.push({ id: seed, price: price, buyPrice: i10(it.BuyPrice) });
});
function seeds0() { return Object.keys(crops).map(Number).sort((a, b) => a - b); }

/* ---------- 自检 ---------- */
const seeds = Object.keys(crops).map(Number).sort((a, b) => a - b);
const badStage = seeds.filter((s) => !(crops[s].st[0] > 0));
const noOut = seeds.filter((s) => !crops[s].out[4]);
const boostSeconds = details[2] || 0;
const boostItem = details[31] || 0;
if (!seeds.length) throw new Error('home_plant_crop 解析为空');
if (badStage.length) throw new Error('有作物缺 seedtime（阶段 1 时长为 0）: ' + badStage.slice(0, 8).join(','));
if (!boostSeconds) throw new Error('home_plant_details 缺 id=2（每次加速补的秒数）');

const payload = {
  generatedAt: '2026-10-27T00:00:00.000Z',
  src: {
    crop: 'home_plant_crop.json',
    event: 'home_plant_cropevent.json',
    details: 'home_plant_details.json',
    level: 'home_plant_exp.json',
  },
  // 地块数：客户端 `getHomeLands()` 缺省 4、有 soilArr 就用 soilArr.length（index.js:58333-58337）
  lands: 4,
  // 奖励框里经验落在第 7 槽：客户端 `o.hasOwnProperty("aExp") && (n[7] = o.aExp)`（index.js:57711）
  expSlot: 7,
  boost: { itemId: boostItem, seconds: boostSeconds },
  stageNames: stageNames,
  crops: crops,
  events: events,
  details: details,
  levels: levels,
  // 家园种子商店货架：`[itemId, 类别tag, 单价]`，类别 tag 固定 1（银两）
  shop: { priceSource: 'item.Price', defaultPrice: DEFAULT_SEED_PRICE, tag: 1, rows: shop },
};

const body = '/* C10 农作物表（tools/gen_c10_tables.js 生成，请勿手改）' +
  '  作物=' + seeds.length + ' 事件=' + Object.keys(events).length +
  ' 等级=' + Object.keys(levels).length + ' 加速=' + boostSeconds + 's/次(道具 ' + boostItem + ')' +
  ' 缺产物=' + noOut.length + ' */\n' +
  'var BZ_PLANT = ' + JSON.stringify(payload) + ';\n';

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, body, 'utf8');

console.log('作物=' + seeds.length + ' 个（' + seeds[0] + '…' + seeds[seeds.length - 1] + '）');
console.log('事件=' + Object.keys(events).length + ' 行 ' + JSON.stringify(Object.keys(events)));
console.log('等级表=' + Object.keys(levels).length + ' 行 最高经验=' + Math.max.apply(null, Object.keys(levels).map((k) => levels[k])));
console.log('加速：道具 ' + boostItem + '，每次 +' + boostSeconds + ' 秒（= ' + (boostSeconds / 3600) + ' 小时）');
console.log('缺成熟产物(out[4])的作物=' + (noOut.length ? noOut.slice(0, 6).join(',') : '无'));
console.log('wrote ' + path.relative(ROOT, OUT) + '  ' + Buffer.byteLength(body) + ' B');
