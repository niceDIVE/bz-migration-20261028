const fs = require('fs');
const a = JSON.parse(fs.readFileSync('F:/BaoZouyxt/tools/actions.json', 'utf8'));
const byMod = {};
for (const x of a.actions) { const m = x.split('.')[0]; byMod[m] = (byMod[m] || 0) + 1; }
console.log('按模块:', JSON.stringify(byMod));
const impl = new Set(['acceptTask','CheckBattleResult','CheckName','ChooseServer','Create','GetChatAddress','getCRAInfo','getFinishTaskAward','GetServerList','joinSchool','LoadGame','OpenNovice','quicklogin','ReqSelfBattleInfo','TellAction','upgradeSkill']);
const implA = [...impl].map(x => 'User.' + x);
const core = a.actions.filter(x => /SaveGame|OnHook|Task|Item|Bag|Battle|Skill|Level|Role|Move|Map|Npc|Shop|Market|Mail/.test(x));
console.log('核心玩法相关(粗略):', core.length);
console.log('示例:', core.slice(0, 24).join(', '));
console.log('我实现:', implA.length, implA.join(','));
