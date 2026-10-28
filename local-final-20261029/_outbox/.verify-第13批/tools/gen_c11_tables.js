'use strict';
/**
 * gen_c11_tables.js —— 第 12 批 C11〔周年通行证〕的紧凑表（2026-10-27）
 *
 * 产出 `hotfix-patch\core\bz-c11.generated.js`：`var BZ_C11 = {...}`
 *
 * 数据来源（dump 原表，逐条可复核）：
 *   · `tools\cfg\dump\anniversary_pass_award.json`    —— 主表 22 行（liveness 阶梯 + 免费/VIP 两轨奖励 + 关联任务）
 *   · `tools\cfg\dump\anniversary_pass_task.json`     —— 任务 7 行（type/value/score）
 *   · `tools\cfg\dump\anniversary_pass_liveness.json` —— 活跃度来源 5 行（窗口已过期，本批不做来源结算）
 *   · `tools\cfg\dump\anniversary_pass_gift.json`     —— 礼包货架 4 行（price 60/300/680/980）
 *   · `tools\cfg\dump\anniversary_pass_evnet.json`    —— 事件 5 行（本批沉底，只留档）
 *
 * 口径（用户 2026-10-27 拍板，改任一个都要新拍板）：
 *   ① endtime = 开启时 now + durationDays 天（表里窗口 2026-09-29→10-17 已过期，照表发会让倒计时永远空白）
 *   ② VIP 档价 = vipPrice 元宝（自定离线价，本工程不接真实付费；参照 bz-rpc-server.js:1344 先例）
 *   ③ 买活跃度 = 扣 gold，单价 livePricePerPoint / 点，上限 = 表里最大 liveness（565，客户端 7763 同值）
 *   ④ 7 个动作全做；任务进度/活跃度来源不主动累计（dv/td 只读存档，不伪造玩法）；evnet 沉底
 *
 * 客户端契约（batch12-facts-20261027\C11-c11-取证与策略.md）：
 *   anniversaryPassData = {n, vip, rd[], vrd[], td{}, dt[], dv{}}；endtime 单位=毫秒
 *   giftDatas = 对象（礼包id → 11 元数组 [ID,Name,name2,des,limitnum,award,imgname,money,num,?,endTime]）
 *               （scripts2.js:8550-8572 type 11 分支按下标取）
 *
 * 用法：node tools\gen_c11_tables.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DUMP = path.join(ROOT, 'tools', 'cfg', 'dump');
const OUT = path.join(ROOT, 'hotfix-patch', 'core', 'bz-c11.generated.js');

const readDump = (name) => JSON.parse(fs.readFileSync(path.join(DUMP, name), 'utf8'));
const rowsOf = (tbl) => Object.keys(tbl.data).map((k) => tbl.data[k]);
const i10 = (v) => parseInt(v, 10) || 0;

/* "1,60|9864,500|6658,20" → [[1,60],[9864,500],[6658,20]]；"0" → [] */
function parseAward(s) {
  const raw = String(s == null ? '' : s).trim();
  if (!raw || raw === '0') return [];
  return raw.split('|').map((seg) => {
    const [a, b] = seg.split(',');
    return [i10(a), i10(b)];
  }).filter((p) => p[0] > 0 && p[1] > 0);
}

/* ---------- 拍板口径（集中放这里，改这里就是改口径） ---------- */
const DURATION_DAYS = 30;        // ① endtime = now + 30 天
const VIP_PRICE = 300;           // ② 升 VIP 价（元宝）
const LIVE_PRICE_PER_POINT = 10; // ③ 买活跃度单价（gold / 点）

/* ---------- 1. 主表：22 行奖励阶梯 ---------- */
const awardTbl = readDump('anniversary_pass_award.json');
const award = {};
rowsOf(awardTbl).forEach((r) => {
  const id = i10(r.id);
  if (!(id > 0)) return;
  award[id] = {
    id: id,
    liveness: i10(r.liveness),
    free: parseAward(r.award1),   // 免费轨（rd）
    vip: parseAward(r.award2),    // VIP 轨（vrd）
    task: i10(r.award3),          // 关联任务 id（0 = 无；纯客户端表现，服务端不下发）
  };
});

/* ---------- 2. 任务 7 行 ---------- */
const taskTbl = readDump('anniversary_pass_task.json');
const task = {};
rowsOf(taskTbl).forEach((r) => {
  const id = i10(r.id);
  if (!(id > 0)) return;
  const sc = Array.isArray(r.score) ? r.score : [0, 0];
  task[id] = {
    id: id,
    type: i10(r.type),
    value: i10(r.value),
    score: [i10(sc[0]), i10(sc[1])],   // 完成奖励 [物品id, 数量]
  };
});

/* ---------- 3. 活跃度来源 5 行（窗口已过期，本批不做来源结算，只留档） ---------- */
const liveTbl = readDump('anniversary_pass_liveness.json');
const liveSrc = {};
rowsOf(liveTbl).forEach((r) => {
  const id = i10(r.id);
  if (!(id > 0)) return;
  liveSrc[id] = { id: id, type: i10(r.type), parameter: i10(r.parameter), liveness: i10(r.liveness), limit: i10(r.limit) };
});

/* ---------- 4. 礼包货架 4 行 + 预拼 Type-11 的 11 元数组 ---------- */
const giftTbl = readDump('anniversary_pass_gift.json');
const gift = {};
const giftRows = {};   // giftDatas 行：客户端 scripts2.js:8550-8572 按下标取
rowsOf(giftTbl).forEach((r) => {
  const id = i10(r.id);
  if (!(id > 0)) return;
  const pairs = parseAward(r.award);
  gift[id] = {
    id: id,
    name: i10(r.name),
    des: i10(r.description),
    limit: i10(r.limit),
    num: i10(r.num),
    price: i10(r.price),
    img: String(r.picture || ''),
    award: pairs,
  };
  // [0]ID [1]Name [2]name2 [3]des [4]limitnum [5]award(原串,客户端 split('|')/split(',')) [6]imgname [7]money(数字) [8]已购次数(运行时填,初始0) [9]保留 [10]endTime
  //  ⚠ [8] 不是表的 num 列：scripts2.js:67563 用 limitnum-num 显示"剩余次数"、67248 用 num>=limitnum 拒买
  //    （scoutV2-store-type11.md Q3）；购买后由回包 giftData:{id:新已购数} 刷新（scripts2.js:67466）。
  giftRows[id] = [id, i10(r.name), 0, i10(r.description), i10(r.limit), String(r.award || ''), String(r.picture || ''), i10(r.price), 0, 0, 0];
});

/* ---------- 5. 事件 5 行（本批沉底，只留档不下发） ---------- */
const evnetTbl = readDump('anniversary_pass_evnet.json');
const evnet = {};
rowsOf(evnetTbl).forEach((r) => {
  const id = i10(r.id);
  if (!(id > 0)) return;
  evnet[id] = { id: id, type: Array.isArray(r.type) ? r.type.slice() : [], require: String(r.require || ''), dialog: i10(r.dialog) };
});

/* ---------- 自检 ---------- */
const awardIds = Object.keys(award).map(Number).sort((a, b) => a - b);
const maxLive = Math.max.apply(null, awardIds.map((k) => award[k].liveness));
const noFree = awardIds.filter((k) => award[k].liveness > 0 && !award[k].free.length);
const badTask = Object.keys(task).filter((k) => !(task[k].score[0] > 0 && task[k].score[1] > 0));
const giftIds = Object.keys(gift).map(Number).sort((a, b) => a - b);
const badGift = giftIds.filter((k) => !gift[k].award.length || !(gift[k].price > 0) || !(gift[k].limit > 0));
if (awardIds.length !== 22) throw new Error('award 行数=' + awardIds.length + '，应为 22');
if (!maxLive) throw new Error('award 表 liveness 全 0');
if (noFree.length) throw new Error('有奖励行缺免费档产物: ' + noFree.join(','));
if (Object.keys(task).length !== 7) throw new Error('task 行数=' + Object.keys(task).length + '，应为 7');
if (badTask.length) throw new Error('有任务缺 score: ' + badTask.join(','));
if (giftIds.length !== 4) throw new Error('gift 行数=' + giftIds.length + '，应为 4');
if (badGift.length) throw new Error('礼包行缺 award/price/limit: ' + badGift.join(','));

const payload = {
  generatedAt: '2026-10-27T00:00:00.000Z',
  src: {
    award: 'anniversary_pass_award.json',
    task: 'anniversary_pass_task.json',
    liveSrc: 'anniversary_pass_liveness.json',
    gift: 'anniversary_pass_gift.json',
    evnet: 'anniversary_pass_evnet.json',
  },
  // —— 拍板口径（2026-10-27）——
  durationDays: DURATION_DAYS,          // ① endtime = now + N 天（毫秒下发）
  vipPrice: VIP_PRICE,                  // ② 升 VIP（元宝）
  livePricePerPoint: LIVE_PRICE_PER_POINT, // ③ 买活跃度（gold/点）
  // —— 表事实 ——
  maxLiveness: maxLive,                 // 565；客户端 scripts3.js:7763 同值
  award: award,
  task: task,
  liveSrc: liveSrc,
  gift: gift,
  giftRows: giftRows,                   // 直接可下发的 Type-11 货架
  evnet: evnet,                         // 本批不下发
};

const body = '/* C11 周年通行证表（tools/gen_c11_tables.js 生成，请勿手改）' +
  '  奖励阶=' + awardIds.length + ' 任务=' + Object.keys(task).length +
  ' 礼包=' + giftIds.length + ' 活跃度上限=' + maxLive +
  ' 口径: endtime=now+' + DURATION_DAYS + 'd vip=' + VIP_PRICE + '元宝 活跃=' + LIVE_PRICE_PER_POINT + 'gold/点 */\n' +
  'var BZ_C11 = ' + JSON.stringify(payload) + ';\n';

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, body, 'utf8');

console.log('奖励阶=' + awardIds.length + '（liveness 0…' + maxLive + '）');
console.log('任务=' + Object.keys(task).length + ' 行，type 分布=' + JSON.stringify(awardIds.reduce((m, k) => m, {}) && Object.keys(task).map((k) => task[k].type)));
console.log('礼包=' + giftIds.length + ' 行 price=' + giftIds.map((k) => gift[k].price).join('/'));
console.log('活跃度来源=' + Object.keys(liveSrc).length + ' 行（窗口已过期，本批不结算）');
console.log('事件=' + Object.keys(evnet).length + ' 行（本批沉底）');
console.log('口径: endtime=now+' + DURATION_DAYS + '天, VIP=' + VIP_PRICE + '元宝, 活跃=' + LIVE_PRICE_PER_POINT + ' gold/点, 上限=' + maxLive);
console.log('wrote ' + path.relative(ROOT, OUT) + '  ' + Buffer.byteLength(body) + ' B');
