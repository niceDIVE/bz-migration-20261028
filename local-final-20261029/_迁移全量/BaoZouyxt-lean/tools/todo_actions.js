const f = require('F:/BaoZouyxt/tools/action_facts3.json');
const impl = ['acceptTask','CheckBattleResult','CheckName','ChooseServer','Create','GetChatAddress','getCRAInfo','getFinishTaskAward','GetServerList','joinSchool','LoadGame','OpenNovice','quicklogin','ReqSelfBattleInfo','TellAction','upgradeSkill','OnCheckBreak','OnHookBreak','killNpc','BeginSaveNpc','EndSaveNpc','GetRoldSaveTime'].map(x => 'User.' + x);
const need = Object.keys(f).filter(k => f[k].response_fields.some(x => x !== 'hasOwnProperty'));
const todo = need.filter(k => !impl.includes(k));
console.log('需要写形状的:', need.length, '| 已实现:', need.filter(k => impl.includes(k)).length, '| 待办:', todo.length);
console.log(todo.join('\n'));
