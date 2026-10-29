'use strict';
/** 一次性脚本：C15〔七日回归〕8 个实现动作登记进 reject-codes.json（ev = index.js 定义行 + sha8）。
 *  档 A：客户端监听都只有 1 == eRet 分支（scripts3.js:63542-63590）→ 非 1 静默，tier 2 取 2。 */
const fs = require('fs');
const crypto = require('crypto');
const lines = fs.readFileSync('F:/BaoZouyxt/tools/index.js', 'utf8').split('\n');
function evOf(n) {
  const l = (lines[n - 1] || '').trim();
  return 'index.js:' + n + '#' + crypto.createHash('sha1').update(l).digest('hex').slice(0, 8);
}
const p = 'F:/BaoZouyxt/tools/facts/reject-codes.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
const TIER2 = '客户端对非 1 无专属分支（监听只有 1 == eRet 一侧，scripts3.js:63542-63590）→ tier 2 静默，少发方向';
const acts = {
  getReturnSevenDayData: { line: 60240, reasons: ['default', 'noTable'],
    note: '七日数据/面板门被拒：BZ_C15 缺失才回 2（正常 1 + sevenDaysArr/triggerTime；eRet==1 才开 ReturnUI，scripts2:28970）' },
  getReturnTaskData: { line: 60241, reasons: ['default', 'noTable'],
    note: '回归任务数据被拒：BZ_C15 缺失才回 2（正常 1 + oldReturnData{tasks 11 个诚实 0 状态, liveness=0, livenessDatas=[]} + triggerTime）' },
  returnSevenDaysAwards: { line: 60242, reasons: ['default', 'claimed', 'notReady', 'noRow', 'noTable'],
    note: '七日奖励领取被拒：当日已领（每天一次）/ 未开面板 / 表缺行。防刷：唯一产出路径，每日上限 1、7 份封顶' },
  receiveReturnDailyTask: { line: 60243, reasons: ['default', 'notDone'],
    note: '回归任务领取被拒：档 A 任务恒未完成（离线无埋点），不伪造进度' },
  receiveLivenessAward: { line: 60244, reasons: ['default', 'noLiveness'],
    note: '活跃度奖领取被拒：档 A liveness 恒 0' },
  getReturnGift: { line: 60245, reasons: ['default', 'noTable'],
    note: '礼包拉取被拒：BZ_C15 缺失才回 2（正常 1 + giftDatas 3 档纯展示 isBuy=0/isAward=0）' },
  refreshReturnGiftAward: { line: 60247, reasons: ['default', 'noTable'],
    note: '礼包刷新被拒：BZ_C15 缺失才回 2（正常 1 + giftAwards 空数组）' },
  receiveReturnGiftAward: { line: 60246, reasons: ['default', 'notBought'],
    note: '礼包领取被拒：付费礼包（Return_store Price 25/68/…）离线无支付通道 → 防白拿恒拒 2' },
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
