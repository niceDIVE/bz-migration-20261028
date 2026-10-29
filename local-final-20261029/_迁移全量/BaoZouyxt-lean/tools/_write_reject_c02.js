const fs = require('fs');
const crypto = require('crypto');
const P = 'F:/BaoZouyxt/tools/facts/reject-codes.json';
const IDX = 'F:/BaoZouyxt/tools/index.js';
const L = fs.readFileSync(IDX, 'utf8').split('\n');
const sha8 = (t) => crypto.createHash('sha1').update(t, 'utf8').digest('hex').slice(0, 8);
function ev(n) {
  const raw = L[n - 1];
  if (raw === undefined) throw new Error('line not found ' + n);
  return 'index.js:' + n + '#' + sha8(raw.replace(/\r$/, '').trim());
}
const j = JSON.parse(fs.readFileSync(P, 'utf8'));
const defs = [
  ['acceptCircleTask', 6, ['default', 'badTask'], 59662,
    'taskID 非法 -> 6 -> getText(1093)（客户端 6 分支）'],
  ['circleTaskAward', 4, ['default', 'notAccepted'], 59780,
    '任务不在 accepted -> 4 -> getText(931)；只有 1==eRet 才走 SUCCESS_TASK_EVENT + addShowRewardUI1'],
  ['getCircleTaskAward', 4, ['default', 'notAccepted'], 59663,
    '同上（另一入口）；该动作客户端分支最全 4=931 5=932 9=1093 10=4320 12=8156'],
  ['getRogueFinishTaskAward', 4, ['default', 'notAccepted'], 60544,
    '肉鸽任务不在 accepted -> 4 -> getText(931)'],
  ['quickFinishTask', 2, ['default', 'payOnly'], 59777,
    '快速完成只走付费：2 -> openChargeList（**故意不回 1**，绝不免费完成）'],
];
for (const [act, code, reasons, line, note] of defs) {
  j[act] = {
    success: [1],
    handled: [1],
    promptOnly: [],
    defaultCode: code,
    codes: [{
      code, role: 'reject', reasons, tier: 2,
      tierWhy: '客户端对该码没有专属提示分支（静默或走通用 alert）-> tier 2 静默，避免弹错文案',
      ev: ev(line), note,
    }],
  };
  console.log(act + ' -> eRet ' + code + '  ' + ev(line));
}
fs.writeFileSync(P, JSON.stringify(j, null, 1) + '\n');
console.log('actions now = ' + Object.keys(j).length);
