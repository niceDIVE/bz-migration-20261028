const fs = require('fs');
const facts = JSON.parse(fs.readFileSync('F:/BaoZouyxt/tools/action_facts3.json', 'utf8'));
const tpl = JSON.parse(fs.readFileSync('F:/BaoZouyxt/hotfix-patch/core/templates.json', 'utf8'));
const impl = ['acceptTask','CheckBattleResult','CheckName','ChooseServer','Create','GetChatAddress','getCRAInfo','getFinishTaskAward','GetServerList','joinSchool','LoadGame','OpenNovice','quicklogin','ReqSelfBattleInfo','TellAction','upgradeSkill','OnCheckBreak','OnHookBreak','killNpc','BeginSaveNpc','EndSaveNpc','GetRoldSaveTime'];
const tplKey = { GetServerList: 'getServerList', quicklogin: 'quicklogin', Create: 'create', getCRAInfo: 'getCRAInfo', GetChatAddress: 'getChatAddress', getFinishTaskAward: 'getFinishTaskAward', ReqSelfBattleInfo: 'reqSelfBattleInfo', CheckBattleResult: 'checkBattleResult' };
console.log('动作 | 客户端读的字段 | 我们有模板?');
for (const a of impl) {
  const f = facts['User.' + a];
  if (!f) { console.log(a, '| (无切片)'); continue; }
  const tk = tplKey[a];
  const have = tk && tpl[tk] ? Object.keys(tpl[tk]).length + ' 个模板键' : '仅 ack';
  console.log(a + ' | ' + (f.response_fields.join(',') || '(无)') + ' | ' + have);
}
