const fs = require('fs');
const G = 'F:/BaoZouyxt/tools/golden';

/* 第二轮：登记 REJECT_CODES 之后，narrowReject 把这 6 个新动作的拒绝应答剥成只剩 {eRet}，
 * 于是基线里这些"兜底默认值"不再出现（发→不发）。这是**有意的风险收口**，不是事故。 */
const planned = [
  { id: 'c05-narrow-UseAllBall', action: 'UseAllBall', field: ['hp', 'rewardArray'], expect: 2,
    allowSigma: [['UseAllBall', 'hp'], ['UseAllBall', 'rewardArray']], ev: 'index.js:122543' },
  { id: 'c05-narrow-UseBatchSnowBall', action: 'UseBatchSnowBall', field: ['hp'], expect: 1,
    allowSigma: [['UseBatchSnowBall', 'hp']], ev: 'index.js:122514' },
  { id: 'c05-narrow-UseSnowBall', action: 'UseSnowBall', field: ['hp'], expect: 1,
    allowSigma: [['UseSnowBall', 'hp']], ev: 'index.js:122505' },
  { id: 'c05-narrow-getSnowAward', action: 'getSnowAward', field: ['rewardArray'], expect: 1,
    allowSigma: [['getSnowAward', 'rewardArray']], ev: 'index.js:122529' },
];
fs.writeFileSync(G + '/planned-changes.json', JSON.stringify(planned, null, 1) + '\n');

const nPath = G + '/approved-narrowing.json';
const n = JSON.parse(fs.readFileSync(nPath, 'utf8'));
const add = [
  ['UseAllBall', 'hp', 122543,
    '摔炮拒绝（eRet:0，已登记 REJECT_CODES 并用 tier 2 静默）被 narrowReject 剥到只剩 {eRet}，基线里 hp:0 不再出现。逃逸结论：客户端 index.js:122544-122548 只有 1==eRet 分支读 o.hp（setFirecrackerHP），0 落 else 只弹 getText(1093) → 不存在「用到但缺席」。成功路径照常下发 hp 数字。'],
  ['UseAllBall', 'rewardArray', 122543,
    '同上：rewardArray 只在 1==eRet 分支交给 addShowRewardUI1（index.js:122546）；拒绝分支不读该字段。成功路径按工程既有口径下发 {物品id:数量}。'],
  ['UseBatchSnowBall', 'hp', 122514,
    '批量雪球拒绝（eRet:4 → getText(6126)）被收窄，基线 hp:0 不再出现。逃逸结论：index.js:122515-122528 只有 1==eRet 读 o.hp；4 分支只弹 6126 并 dispatch，不解引用 hp。成功路径下发 hp 数字。'],
  ['UseSnowBall', 'hp', 122505,
    '单发雪球拒绝（eRet:0）被收窄，基线 hp:0 不再出现。逃逸结论：index.js:122506-122513 只有 1==eRet 读 o.hp；0 落 else 弹 getText(1093)。成功路径下发 hp 数字。'],
  ['getSnowAward', 'rewardArray', 122529,
    '领雪球盒奖励拒绝（eRet:4 → getText(1098)）被收窄，基线 rewardArray:{} 不再出现。逃逸结论：index.js:122530-122542 只有 1==eRet 遍历 rewardArray；4 分支只弹 1098。成功路径下发 {物品id:数量}。'],
];
for (const [action, path, ln, reason] of add) {
  if (n.some((e) => e.action === action && e.path === path)) continue;
  n.push({ action, path, escape: 'closed', reason, ev: 'index.js:' + ln });
}
fs.writeFileSync(nPath, JSON.stringify(n, null, 2) + '\n');
console.log('planned=' + planned.length + ' narrowing=' + n.length);
