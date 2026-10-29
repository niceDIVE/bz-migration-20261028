'use strict';
/** 一次性脚本：C14〔斗狗〕3 个实现动作登记进 reject-codes.json（ev = index.js 定义行 + sha8）。
 *  档 A：FeedDog / lookDogLog / DogBattleResult —— 客户端三处监听都只有 1 分支
 *  （index.js:58047-58057 狗日志/狗战/喂狗，58224-58243 发送），非 1 一律静默 → tier 2 取 2。 */
const fs = require('fs');
const crypto = require('crypto');
const lines = fs.readFileSync('F:/BaoZouyxt/tools/index.js', 'utf8').split('\n');
function evOf(n) {
  const l = (lines[n - 1] || '').trim();
  return 'index.js:' + n + '#' + crypto.createHash('sha1').update(l).digest('hex').slice(0, 8);
}
const p = 'F:/BaoZouyxt/tools/facts/reject-codes.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
const TIER2 = '客户端对非 1 无专属分支（监听只有 1 == eRet 一侧，无 else 提示）→ tier 2 静默，少发方向';
const acts = {
  lookDogLog: {
    line: 59862,
    reasons: ['default', 'noTable'],
    note: '狗日志被拒：面板开关级（BZ_C14 缺失才回 2）。正常 1 + log 空数组（监听 58047：1 == eRet && hasOwnProperty("log") → dispatch HOME_LOG_EVENT；HomeLogUI 对 [] 安全）。',
  },
  FeedDog: {
    line: 59865,
    reasons: ['default', 'badItem', 'badNum', 'insufficient', 'full', 'noTable'],
    note: '喂狗被拒：propID ≠ 狗粮 6285 / propnum 非法 / 背包狗粮不足 / 已喂满 10000 / 表缺失。喂狗真扣狗粮（防刷：有成本无产出）。监听 58053：1 == eRet → progress→dogData.p、bigDog→dogData.id。',
  },
  DogBattleResult: {
    line: 59863,
    reasons: ['default', 'noTable'],
    note: '狗战结算桥接：仅 startDogFight().then 可达 → 当前不可达（好友家未实现 + stealCrop 档 A 锁）。监听 58050：1 == eRet && o.win → setDogCurState(0, endTime)。',
  },
};
let added = 0;
for (const [name, a] of Object.entries(acts)) {
  if (j[name]) { console.log('skip:', name); continue; }
  j[name] = {
    success: [1], handled: [1], promptOnly: [], defaultCode: 2,
    codes: [{ code: 2, role: 'reject', reasons: a.reasons, tier: 2, tierWhy: TIER2, ev: evOf(a.line), note: a.note }],
  };
  added++;
}
fs.writeFileSync(p, JSON.stringify(j, null, 1) + '\n', 'utf8');
console.log('added', added, '; total', Object.keys(j).length);
