'use strict';
/**
 * gen_c12_tables.js —— 第 13 批 C12〔管家/帮手〕的紧凑表（2026-10-27）
 *
 * 产出 `hotfix-patch\core\bz-c12.generated.js`：`var BZ_C12 = {...}`
 *
 * 数据来源：`tools\cfg\dump\helper.json`（8 管家主表）。
 * helperAct.json（90 行动作/台词库）是纯客户端表现层，档 A 不需要，不生成。
 *
 * 口径（用户 2026-10-27 拍板，改任一个都要新拍板）：
 *   ① 买管家价 = helper.price 照表、按**元宝**扣（表价 0/0/500/…；币种表里无列，拍板自定元宝）
 *   ② 月卡（BUY_BUTLER_VIP）自定 300 元宝 / 30 天，type 只认 1
 *   ③ 派遣时长自定 30 分钟（dispatchEndTime = now + 30min；到点可领 DISPATCH_AWARD）
 *   ④ 档 A：派遣落档不结算真实任务产出；DISPATCH_AWARD 奖励 = 被派管家 helper.reward 列（照表）
 *   ⑤ 并入 GET_HOUSE_KEEPER（面板开关）+ SET_TEMPLATE_DATA + RECEIVE_NOTICE（面板一层按钮全活）
 *
 * 客户端契约（batch13-facts-20261027\C12-c12-取证与策略.md）：
 *   housekeeper 22 字段（testFunc 夹具 + templates.json create 双源互证），时间戳全毫秒；
 *   回调裸读：helperId / helperIdArr / dueTime / noticeArr / noticeRtm / note.eco.yuanbao（dispatch）。
 *
 * 用法：node tools\gen_c12_tables.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DUMP = path.join(ROOT, 'tools', 'cfg', 'dump');
const OUT = path.join(ROOT, 'hotfix-patch', 'core', 'bz-c12.generated.js');

const readDump = (name) => JSON.parse(fs.readFileSync(path.join(DUMP, name), 'utf8'));
const rowsOf = (tbl) => Object.keys(tbl.data).map((k) => tbl.data[k]);
const i10 = (v) => parseInt(v, 10) || 0;
const f10 = (v) => parseFloat(v) || 0;

/* ---------- 拍板口径（集中放这里） ---------- */
const VIP_DAYS = 30;          // ② 月卡时长
const VIP_PRICE = 300;        // ② 月卡价格（元宝）
const DISPATCH_MINUTES = 30;  // ③ 派遣时长

/* ---------- helper 主表 8 行 ---------- */
const helperTbl = readDump('helper.json');
const helper = {};
rowsOf(helperTbl).forEach((r) => {
  const id = i10(r.id);
  if (!(id > 0)) return;
  // reward 列：[] 或 [物品id, 数量]（helper.json 原样），归一成 [[id,num]] 或 []
  let reward = [];
  if (Array.isArray(r.reward) && r.reward.length === 2) {
    const a = i10(r.reward[0]), b = i10(r.reward[1]);
    if (a > 0 && b > 0) reward = [[a, b]];
  }
  helper[id] = {
    id: id,
    price: i10(r.price),            // ① 元宝（0 = 免费管家，无需购买）
    task: i10(r.task),              // 任务表 id（档 A 不结算，留档）
    reward: reward,                 // DISPATCH_AWARD 的奖励来源（照表；1/2 号管家为空）
    saveTime: f10(r.saveTime),      // 留档
    act: Array.isArray(r.act) ? r.act.slice() : [],
  };
});

/* locate 列的场景集合（"1147,626,618|1119,359,588|..." 每段首元素）：
 * ★真机实证（2026-10-27）：dispatch 的 mapId 不在集合内 → 客户端 DelegateMgr.createRoute3
 *   查不到路线配置 → `Cannot read property '0' of null` **每帧崩**（index.jsc:22681）。
 *   服务端必须校验 mapId ∈ locateScenes，不合法回 eRet 2。 */
const locateScenes = [];
rowsOf(helperTbl).forEach((r) => {
  String(r.locate || '').split('|').forEach((seg) => {
    const sid = i10(seg.split(',')[0]);
    if (sid > 0 && locateScenes.indexOf(sid) < 0) locateScenes.push(sid);
  });
});
locateScenes.sort((a, b) => a - b);

/* ---------- 自检 ---------- */
const ids = Object.keys(helper).map(Number).sort((a, b) => a - b);
if (ids.length !== 8) throw new Error('helper 行数=' + ids.length + '，应为 8');
const noPrice = ids.filter((k) => !(helper[k].price >= 0));
if (noPrice.length) throw new Error('helper 缺 price: ' + noPrice.join(','));

const payload = {
  generatedAt: '2026-10-27T00:00:00.000Z',
  src: { helper: 'helper.json' },
  // —— 拍板口径（2026-10-27）——
  vipDays: VIP_DAYS,
  vipPrice: VIP_PRICE,
  vipType: 1,                       // ② BUY_BUTLER_VIP 只认 type=1
  dispatchMinutes: DISPATCH_MINUTES,
  locateScenes: locateScenes,       // ★dispatch 的 mapId 白名单（真机实证：不合法 → 客户端每帧崩）
  // —— 表事实 ——
  helper: helper,
};

const body = '/* C12 管家表（tools/gen_c12_tables.js 生成，请勿手改）' +
  '  管家=' + ids.length + '（免费=' + ids.filter((k) => helper[k].price === 0).length +
  '） 口径: 月卡=' + VIP_PRICE + '元宝/' + VIP_DAYS + '天 派遣=' + DISPATCH_MINUTES + '分钟 奖励=helper.reward照表 */\n' +
  'var BZ_C12 = ' + JSON.stringify(payload) + ';\n';

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, body, 'utf8');

console.log('管家=' + ids.length + ' 行（price: ' + ids.map((k) => helper[k].price).join('/') + '）');
console.log('口径: 月卡=' + VIP_PRICE + '元宝/' + VIP_DAYS + '天(只认type=1), 派遣=' + DISPATCH_MINUTES + '分钟, 奖励=helper.reward照表');
console.log('wrote ' + path.relative(ROOT, OUT) + '  ' + Buffer.byteLength(body) + ' B');
