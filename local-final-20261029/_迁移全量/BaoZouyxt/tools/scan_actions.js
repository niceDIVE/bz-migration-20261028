const fs = require('fs');
const s = fs.readFileSync('F:/BaoZouyxt/tools/index.js', 'utf8');
// 1) HttpConst 块（常量名 → "Mod.Action"）
const start = s.indexOf('USER_LOADGAME');
const blockStart = s.lastIndexOf('{', start - 2000);
const blockEnd = s.indexOf('};', start);
const block = s.slice(blockStart, blockEnd);
const map = {};
const re = /([A-Z][A-Z0-9_]+)\s*:\s*"(User|Guild|Chat|Mail|Rank|Team|Arena|Activity)\.([A-Za-z0-9_]+)"/g;
let m;
while ((m = re.exec(block)) !== null) map[m[1]] = m[2] + '.' + m[3];
const actions = [...new Set(Object.values(map))];
console.log('HttpConst entries:', Object.keys(map).length, 'unique actions:', actions.length);
// 2) 全文中出现过的 "Mod.Action" 形式（含动态拼接之外的）
const all = new Set();
const re2 = /"(User|Guild|Chat|Mail|Rank|Team|Arena|Activity)\.([A-Za-z0-9_]{2,40})"/g;
let m2;
while ((m2 = re2.exec(s)) !== null) all.add(m2[1] + '.' + m2[2]);
console.log('all literal Mod.Action in source:', all.size);
fs.writeFileSync('F:/BaoZouyxt/tools/actions.json', JSON.stringify({ httpConst: map, actions, all: [...all] }, null, 1));
const impl = ['acceptTask','CheckBattleResult','CheckName','ChooseServer','Create','GetChatAddress','getCRAInfo','getFinishTaskAward','GetServerList','joinSchool','LoadGame','OpenNovice','quicklogin','ReqSelfBattleInfo','TellAction','upgradeSkill'];
const implSet = new Set(impl.map(a => 'User.' + a));
const missing = actions.filter(a => !implSet.has(a));
console.log('implemented:', impl.length, '| HttpConst actions missing in impl:', missing.length);
console.log('first 40 missing:', missing.slice(0, 40).join(', '));
