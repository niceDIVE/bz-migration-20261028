const fs=require('fs');
const all=require('F:/BaoZouyxt/tools/action_facts_all.json');
const src=fs.readFileSync('F:/BaoZouyxt/hotfix-patch/core/bz-rpc-server.js','utf8');
const impl=new Set([...src.matchAll(/^\s{4}([A-Za-z0-9_]+): function/gm)].map(m=>'User.'+m[1]));
const need=Object.keys(all).filter(k=>all[k].response_fields.length>0);
const done=need.filter(k=>impl.has(k));
const todo=need.filter(k=>!impl.has(k));
const pay=/Pay|IphonePay|cancelPay|Order|Recharge/i;
const todoReal=todo.filter(k=>!pay.test(k));
console.log('需形状:',need.length,'| 已实现:',done.length,'| 待办:',todo.length,'（去掉支付类:',todoReal.length,'）');
fs.writeFileSync('F:/BaoZouyxt/tools/todo_shapes.json', JSON.stringify(todoReal,null,1));
const groups={
  '任务/奖励':/Task|Award|Duty|Daily|Sign|Welfare|Reward/i,
  '背包/物品':/Item|Bag|Box|Debris|Fashion|Equip|Pop/i,
  '战斗/技能':/Battle|Fight|Skill|Kill|Npc|Boss|PvP|Meditation|Training|Practice/i,
  '地图/场景':/Map|Scene|Move|Event|Fish|Dice|Snow|Copy|Wook/i,
  '社交/门派':/Friend|School|Master|Marry|Child|Guild|Team|Rank|Review|Wedding|Love|Chief|Disciple/i,
};
for(const [g,re] of Object.entries(groups)){
  const list=todoReal.filter(k=>re.test(k));
  console.log(g+': '+list.length+' → '+list.slice(0,8).map(x=>x.replace('User.','')).join(', '));
}
