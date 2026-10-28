const fs = require('fs');
const G = 'F:/BaoZouyxt/tools/golden';

/* 第 3 批 C02：16 个任务 handler 带来的形状差异登记。
 * 分组口径：每个动作一条规则，field 列全，allowSigma 逐项列（sigma 变了的必须逐项允许）。 */
const groups = [
  ['acceptCircleTask', ['eRet', 'taskID'], 59662,
    'taskID 非法回 6 时整包被 narrowReject 收窄到只剩 eRet，基线里 taskID:101080 不再出现；客户端 6 分支只弹 getText(1093)'],
  ['circleTaskAward', ['eRet', 'rewardObj'], 59780,
    '任务不在 accepted 回 4 时被收窄，rewardObj:{} 不再出现；客户端只有 1==eRet 才读 rewardObj 交给 addShowRewardUI1'],
  ['getCircleTaskAward', ['eRet', 'rewardArray'], 59663,
    '同上（另一入口）；4 分支只弹 getText(931)，不解引用 rewardArray'],
  ['getRogueFinishTaskAward', ['eRet'], 60544,
    '肉鸽任务不在 accepted 回 4；客户端 4 分支只弹 getText(931)'],
  ['getSchoolTask', ['currentServerTime', 'schoolTask'], 113575,
    '该动作客户端不判 eRet，直接解析字段刷新面板：schoolTask 由形状默认的 {} 改为 []（数组才是 for 循环的零次安全值，{} 会在 .length 处得到 undefined）；currentServerTime 给真实 env.now()'],
  ['onekeyCompleteSchoolTask', ['schoolTask', 'weekQuickCompleteTaskTimes', 'equipObj'], 113583,
    'schoolTask 由 {} 改为 []（同上）；weekQuickCompleteTaskTimes 现在会 +1（业务值）；equipObj 属新发出的空对象（客户端 1 分支读它给发奖窗，空对象=无装备奖）'],
  ['quickFinishTask', ['eRet', 'caidan'], 43497,
    '故意回 eRet:2（2 -> openChargeList 弹充值框），绝不免费完成；拒绝应答被收窄后 caidan:0 不再出现。caidan 只在 1==eRet 的 QUICK_FINISH_TASK_EVENT 分支被读'],
  ['schoolTaskComplete', ['schoolTask', 'equipObj'], 113578,
    'schoolTask 由 {} 改为 []（同上）；equipObj 新发出空对象（1 分支发奖窗用）'],
  ['delegateTask', ['sTime'], 43506,
    '客户端 1==eRet 时 dispatch START_ENTRUST_TASK_EVENT 并读 sTime 做起算时间；原形状表无此字段，属漏发，值取 env.now()'],
  ['rogueAcceptTask', ['skillId', 'CDTime', 'serverTime'], 133222,
    '客户端 1 分支读 skillId/CDTime/serverTime（与 acceptTask 同族形状）；原形状表无这三项，属漏发'],
];

const rules = groups.map(([act, fields, line, why]) => ({
  id: 'c02-' + act,
  action: act,
  field: fields,
  expect: fields.length,
  allowSigma: fields.map((f) => [act, f]),
  ev: 'index.js:' + line,
}));
fs.writeFileSync(G + '/planned-changes.json', JSON.stringify(rules, null, 1) + '\n');

/* ---- widening：新发出的路径 ---- */
const wPath = G + '/approved-widening.json';
const w = JSON.parse(fs.readFileSync(wPath, 'utf8'));
const wide = [
  ['delegateTask', 'sTime', 43506, '委托任务起算时间：client index.js:43506 回调 1==eRet 后读 o.sTime 记委托开始，原形状表与应答都没有该字段'],
  ['onekeyCompleteSchoolTask', 'equipObj', 113583, '一键完成门派任务：client 1 分支把 equipObj 交给发奖窗（装备奖励位），原形状表无该字段'],
  ['rogueAcceptTask', 'skillId', 133222, '肉鸽接任务：client 1 分支读 skillId（与 acceptTask 同族形状），原形状表无'],
  ['rogueAcceptTask', 'CDTime', 133222, '同上，读 CDTime 做冷却显示'],
  ['rogueAcceptTask', 'serverTime', 133222, '同上，读 serverTime 校时'],
  ['schoolTaskComplete', 'equipObj', 113578, '门派任务完成：client 1 分支把 equipObj 交给发奖窗，原形状表无'],
];
for (const [action, path, ln, reason] of wide) {
  if (w.some((e) => e.action === action && e.path === path)) continue;
  w.push({ action, path, reason, ev: 'index.js:' + ln });
}
fs.writeFileSync(wPath, JSON.stringify(w, null, 1) + '\n');

/* ---- narrowing：发 -> 不发 ---- */
const nPath = G + '/approved-narrowing.json';
const n = JSON.parse(fs.readFileSync(nPath, 'utf8'));
const narrow = [
  ['acceptCircleTask', 'taskID', 59662, 'taskID 非法（回 6）时 narrowReject 把应答剥成只剩 eRet，基线里 taskID:101080 不再出现。逃逸结论：客户端 6 分支（index.js:133218 段）只 show(getText(1093))，不解引用 e.taskID；成功路径照常下发 taskID。'],
  ['circleTaskAward', 'rewardObj', 59780, '任务不在 accepted（回 4）时被收窄，rewardObj:{} 不再出现。逃逸结论：客户端只有 1==eRet 分支读 o.rewardObj 交给 addShowRewardUI1；4 分支只 show(getText(931))。'],
  ['getCircleTaskAward', 'rewardArray', 59663, '同上：4 分支只 show(getText(931))，不读 rewardArray；成功路径照常下发 {物品id:数量}。'],
  ['quickFinishTask', 'caidan', 43497, '本动作**永远**回 eRet:2（走充值框，不免费完成），所以 caidan:0 在基线上不再出现。逃逸结论：客户端只在 1==eRet 的 QUICK_FINISH_TASK_EVENT 分支读 caidan；2 分支走 openChargeList 不读该字段。'],
];
for (const [action, path, ln, reason] of narrow) {
  if (n.some((e) => e.action === action && e.path === path)) continue;
  n.push({ action, path, escape: 'closed', reason, ev: 'index.js:' + ln });
}
fs.writeFileSync(nPath, JSON.stringify(n, null, 2) + '\n');

console.log('rules=' + rules.length + ' widening=' + w.length + ' narrowing=' + n.length);
