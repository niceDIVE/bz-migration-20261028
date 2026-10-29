const fs = require('fs');
const G = 'F:/BaoZouyxt/tools/golden';

/* 第 2 批 C05：雪球 4 个动作 + useItemAddition 的应答形状修正。
 * 共同根因：形状表把 hp 推成 {}（对象），而客户端一律当数字用
 * （index.js:122466 `setSnowManHp(o.hp)` / 122474 `setFirecrackerHP(o.hp)`）→ 必须在源头按数字发。
 * eRet 的 sigma 变化来自真实业务分支（雪球不够 / 盒子不够 / 道具不够），不是随手改值。 */
const planned = [
  { id: 'c05-UseAllBall', action: 'UseAllBall', field: ['eRet', 'hp'], expect: 2,
    allowSigma: [['UseAllBall', 'eRet'], ['UseAllBall', 'hp']], ev: 'index.js:122543' },
  { id: 'c05-UseBatchSnowBall', action: 'UseBatchSnowBall', field: ['eRet', 'hp'], expect: 2,
    allowSigma: [['UseBatchSnowBall', 'hp']], ev: 'index.js:122514' },
  { id: 'c05-UseSnowBall', action: 'UseSnowBall', field: ['eRet', 'hp'], expect: 2,
    allowSigma: [['UseSnowBall', 'eRet'], ['UseSnowBall', 'hp']], ev: 'index.js:122505' },
  { id: 'c05-enterSnow', action: 'enterSnow', field: ['hp', 'sTime'], expect: 2,
    allowSigma: [['enterSnow', 'hp'], ['enterSnow', 'sTime']], ev: 'index.js:122470' },
  { id: 'c05-getSnowAward', action: 'getSnowAward', field: ['eRet'], expect: 1, ev: 'index.js:122529' },
  { id: 'c05-useItemAddition', action: 'useItemAddition', field: ['eRet'], expect: 1, ev: 'index.js:56234' },
];
fs.writeFileSync(G + '/planned-changes.json', JSON.stringify(planned, null, 1) + '\n');

const wPath = G + '/approved-widening.json';
const w = JSON.parse(fs.readFileSync(wPath, 'utf8'));
if (!w.some((e) => e.action === 'enterSnow' && e.path === 'sTime')) {
  w.push({
    action: 'enterSnow',
    path: 'sTime',
    reason: '第 2 批 C05 雪球活动：客户端 enterSnow 回调 index.js:122470 读 o.sTime（面板倒计时基准），原形状表与应答均无此字段，属漏发。值取 env.now()。',
    ev: 'index.js:122470',
  });
  fs.writeFileSync(wPath, JSON.stringify(w, null, 1) + '\n');
}
console.log('planned=' + planned.length + '  widening=' + w.length);
