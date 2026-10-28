'use strict';
/** 一次性脚本：C07 善恶 11 动作登记进 reject-codes.json（ev = index.js 定义行 + sha8）。 */
const fs = require('fs');
const crypto = require('crypto');
const lines = fs.readFileSync('F:/BaoZouyxt/tools/index.js', 'utf8').split('\n');
function evOf(n) {
  const l = (lines[n - 1] || '').trim();
  return 'index.js:' + n + '#' + crypto.createHash('sha1').update(l).digest('hex').slice(0, 8);
}
const p = 'F:/BaoZouyxt/tools/facts/reject-codes.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
const T2 = '善恶玩法未加入阵营（JOIN_GOOD_OR_EVIL 未实现）；各回调非 1 分支静默或无 else';
const acts = {
  getGoodAndEvilTaskData: 60434,
  refreshGoodAndEvilTaskData: 60435,
  getGoodAndEvilNoteData: 60436,
  getGoodAndEvilNpcData: 60439,
  refreshGoodAndEvilNpcData: 60440,
  getGoodAndEvilRankData: 60446,
  helpDoneTask: 60447,
  getGeHelpInfo: 60448,
  getGoodAndEvilData: 60449,
  getGoodAndEvilRetireList: 60450,
  getGoodAndEvilRetireData: 60451,
};
let added = 0;
for (const [name, ln] of Object.entries(acts)) {
  if (j[name]) { console.log('skip:', name); continue; }
  j[name] = {
    success: [1], handled: [1], promptOnly: [], defaultCode: 2,
    codes: [{ code: 2, role: 'reject', reasons: ['default'], tier: 2, tierWhy: T2, ev: evOf(ln),
      note: '善恶玩法 11 动作全锁：未加入阵营（JOIN_GOOD_OR_EVIL 未实现）；GoodEvilInfoUI 对 goodAndEvilData 16 字段 .toString() 直读（scripts3.js:35795-35861），缺键即 TypeError，故不给半截成功。' }],
  };
  added++;
}
fs.writeFileSync(p, JSON.stringify(j, null, 1) + '\n', 'utf8');
console.log('added', added, '; total', Object.keys(j).length);
