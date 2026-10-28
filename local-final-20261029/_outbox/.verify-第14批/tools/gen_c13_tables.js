'use strict';
/**
 * gen_c13_tables.js —— 第 14 批 C13〔UFO 夹娃娃〕的紧凑表（2026-10-27）
 *
 * 产出 `hotfix-patch\core\bz-c13.generated.js`：`var BZ_C13 = {...}`
 *
 * 数据来源：`tools\cfg\dump\package_difficulty.json`（5 行奖池物品的客户端表现表）。
 *
 * 口径（用户 2026-10-27 拍板，改任一个都要新拍板）：
 *   ① 3 个死键跳过（GET_UFO_CATCHER_TASK / REWARD_UFO_CATCHER_TASK / BUY_UFO_GAME_COIN，全 bundle 零调用点）
 *   ② 抓取判定服务端权威：忽略客户端 packages，从池子按数量加权随机判中
 *   ③ 抓取消耗对应爪子（gearType 0/1/2 → 8117/8119/8120），缺爪回 15；活动自定常开（eRet 3 通道保留）
 *   ④ signCode 先验存在（真 md5 校验留档 B）
 *   ⑤ 抓中难度 k → 发游戏币道具 8143 × package_difficulty[k].reward（照表 30/60/…，自定口径）
 *   ⑥ 刷新：freeRefreshTimes 优先、再 refreshTimes；买刷新 100 元宝/次、每日限购 3 次（对应客户端
 *      getConstByID(324)=价格文案 / (325)=每日限购 的消费语义，DollUI:26202）；新档首开赠送 1 次免费刷新
 *
 * 客户端契约（batch14-facts-20261027\C13-c13-取证与策略.md）：
 *   rewardPool = 对象 {package_difficulty 行id: 数量}（initItems 25824-25847 按 location/quality 摆放）；
 *   全字段 hasOwnProperty 守卫（崩点趋零）；eRet 3 = 活动过期（outTimeActive(37)）；REWARD_UFO 任何非 1
 *   → 恒 dispatch CATCH_DOLL_EVENT null（25767），15 → 8060；autoRefresh 存在 → 客户端用回包 rewardPool 重摆。
 *
 * 用法：node tools\gen_c13_tables.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DUMP = path.join(ROOT, 'tools', 'cfg', 'dump');
const OUT = path.join(ROOT, 'hotfix-patch', 'core', 'bz-c13.generated.js');

const readDump = (name) => JSON.parse(fs.readFileSync(path.join(DUMP, name), 'utf8'));
const rowsOf = (tbl) => Object.keys(tbl.data).map((k) => tbl.data[k]);
const i10 = (v) => parseInt(v, 10) || 0;

/* ---------- 拍板口径（集中放这里） ---------- */
const BUY_REFRESH_PRICE = 100;     // ⑥ 买刷新单价（元宝）
const BUY_REFRESH_DAILY_CAP = 3;   // ⑥ 每日限购
const FREE_REFRESH_ON_FIRST = 1;   // ⑥ 新档首开赠送免费刷新
const COIN_ITEM = 8143;            // ⑤ 抓中所发道具（游戏币，Effect 13）
const CLAW_BY_GEAR = { 0: 8117, 1: 8119, 2: 8120 };   // ③ 难度档 → 爪子道具
const POOL_COMPOSITION = { 1: 2, 2: 2, 3: 1, 4: 1, 5: 1 };   // 每次生成的池子构成（自定，≤各自 location 数）

/* ---------- package_difficulty 5 行 ---------- */
const diffTbl = readDump('package_difficulty.json');
const difficulty = {};
rowsOf(diffTbl).forEach((r) => {
  const id = i10(r.id);
  if (!(id > 0)) return;
  difficulty[id] = {
    id: id,
    reward: i10(r.reward),        // ⑤ 抓中该难度发的游戏币数量（照表 30/60/…）
    quality: i10(r.quality),      // 留档（客户端表现用）
    locCount: String(r.location || '').split('|').length,   // 摆位上限（池子数量校验用）
  };
});

/* ---------- 自检 ---------- */
const ids = Object.keys(difficulty).map(Number).sort((a, b) => a - b);
if (ids.length !== 5) throw new Error('package_difficulty 行数=' + ids.length + '，应为 5');
for (const k of Object.keys(POOL_COMPOSITION)) {
  if (!difficulty[k]) throw new Error('POOL_COMPOSITION 引用不存在的难度 ' + k);
  if (POOL_COMPOSITION[k] > difficulty[k].locCount) throw new Error('难度 ' + k + ' 池数量超摆位上限 ' + difficulty[k].locCount);
}
for (const g of Object.keys(CLAW_BY_GEAR)) if (!(CLAW_BY_GEAR[g] > 0)) throw new Error('CLAW_BY_GEAR 缺档 ' + g);

const payload = {
  generatedAt: '2026-10-27T00:00:00.000Z',
  src: { difficulty: 'package_difficulty.json' },
  // —— 拍板口径（2026-10-27）——
  buyRefreshPrice: BUY_REFRESH_PRICE,
  buyRefreshDailyCap: BUY_REFRESH_DAILY_CAP,
  freeRefreshOnFirst: FREE_REFRESH_ON_FIRST,
  coinItem: COIN_ITEM,
  clawByGear: CLAW_BY_GEAR,
  poolComposition: POOL_COMPOSITION,
  // —— 表事实 ——
  difficulty: difficulty,
};

const body = '/* C13 UFO 夹娃娃表（tools/gen_c13_tables.js 生成，请勿手改）' +
  '  难度=' + ids.length + ' 口径: 买刷新=' + BUY_REFRESH_PRICE + '元宝/次限' + BUY_REFRESH_DAILY_CAP +
  ' 抓中=8143×reward照表 爪=gear0/1/2→8117/8119/8120 */\n' +
  'var BZ_C13 = ' + JSON.stringify(payload) + ';\n';

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, body, 'utf8');

console.log('难度=' + ids.length + '（reward: ' + ids.map((k) => difficulty[k].reward).join('/') + '）');
console.log('口径: 买刷新=' + BUY_REFRESH_PRICE + '元宝/次 限' + BUY_REFRESH_DAILY_CAP + ' 抓中=8143×reward 爪=' + JSON.stringify(CLAW_BY_GEAR));
console.log('wrote ' + path.relative(ROOT, OUT) + '  ' + Buffer.byteLength(body) + ' B');
