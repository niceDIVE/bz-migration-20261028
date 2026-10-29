// 一次性：把 ChallengePVP 的拒绝码登记进 tools\facts\reject-codes.json（格式沿用 JSON.stringify(null,1)）
const fs = require('fs');
const p = 'F:/BaoZouyxt/tools/facts/reject-codes.json';
const raw = fs.readFileSync(p, 'utf8');
const j = JSON.parse(raw);
if (j.ChallengePVP) {
  console.log('已存在，未改动');
} else {
  j.ChallengePVP = {
    success: [1],
    handled: [1],
    promptOnly: [3],
    defaultCode: 3,
    codes: [{
      code: 3,
      role: 'reject',
      reasons: ['default'],
      tier: 1,
      tierWhy: '客户端对 3 有专属分支（index.js:101338-101341：Alert.show(getText(1399)) 之后 dispose）——原服就用这个码表示"不可挑战"，有提示不静默，故第 1 档',
      ev: 'index.js:59505#1548bacc',
      note: '离线服没有真人对手（请求要 otherRoleID），不伪造 EnemyData。C08 九个动作里唯一有优雅退出的分支。',
    }],
  };
  fs.writeFileSync(p, JSON.stringify(j, null, 1), 'utf8');
  console.log('已写入，顶层键数=', Object.keys(j).length);
}
