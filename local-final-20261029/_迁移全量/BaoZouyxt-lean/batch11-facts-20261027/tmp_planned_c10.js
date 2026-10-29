const fs=require('fs');
const path=require('path');
const items=JSON.parse(fs.readFileSync('batch11-facts-20261027/tmp_diff_parsed.json','utf8'));
const META={
 batchSeedCrop:{ev:'index.js:57654',why:'C10 播种：空请求走拒绝 eRet 2；旧的 SHAPED 兜底 crops:{} / recentSeeds:0 不再出现，成功路径由 handler 按真实地块生成 crops/recentSeeds'},
 changeSate:{ev:'index.js:57676',why:'C10 地块状态刷新：空请求无地块回 eRet -1（回调 -1 分支 = getText(3320)，57696）—— 签名 num+->num-；成功路径才带 crop.m/crop.b/sIdx'},
 cleanDeadCrop:{ev:'index.js:57811',why:'C10 清枯死：回调只有 1 分支、无 else（57811-57824）；本批无枯死模型 -> 恒 eRet 2，旧 SHAPED 的 sIdx:0 不再出现'},
 dispossHomeEvent:{ev:'index.js:57979',why:'C10 驱除家事件：回调先看有没有 crop 再看 eRet（57980）-> 拒绝应答不带 crop/idx/exp/flag/rewardArray'},
 expediteCrop:{ev:'index.js:57825',why:'C10 催熟：空请求无作物回 eRet 2（getText(1455) 分支，57845）-> 成功路径才带 crop'},
 getFriendHomeList:{ev:'index.js:57951',why:'gen_shapes 按真实回包语义重抽：soilArr 是数组不是对象（客户端 e.soilArr=i.soilArr 后按 .length/下标用，57596/57600）。该动作仍未实现（第50批），此处只是把形状表的错误默认值纠正为数组'},
 getHomeList:{ev:'index.js:57585',why:'C10 必做项：soilArr 改回数组（4 块预开垦地 s=1）、recentSeeds 由 0 改数组、bShop 按契约补 0（hasOwnProperty 守卫）'},
 obtainCrop:{ev:'index.js:57698',why:'C10 收获：空请求无地块回 eRet 2（刻意不用 3：3 那一支裸读并把 m.s 置 0，57714-57723）'},
 stealCrop:{ev:'index.js:58007',why:'C10 偷菜：档 A 锁好友家 -> 空请求也回 eRet 2（3317 文案）；成功路径才带 crop/idx/exp/rewardArray'},
 onKeyDispossHomeEvent:{ev:'index.js:57758',why:'C10 一键驱除：cropMap 空对象时客户端弹 6000404；空请求下的真实应答（cropMap:{} + aExp）冻进基线'},
 onKeyObtainCrop:{ev:'index.js:57726',why:'C10 一键收获：obtainLands 为空 -> 客户端弹 69193；aExp/note.* 是本批新增字段（观察守卫要能解释差额）'},
};
const byAction={};
for(const it of items) (byAction[it.action]=byAction[it.action]||[]).push(it);
const rules=[];
for(const action of Object.keys(byAction)){
  const arr=byAction[action], meta=META[action];
  if(!meta){ console.error('缺 META: '+action); process.exit(1); }
  const fields=Array.from(new Set(arr.map(x=>x.path.replace(/\[\d+\]/g,'').split('.').pop())));
  const allow=arr.filter(x=>x.s0!==x.s1).map(x=>[action,x.path]);
  rules.push({ id:'c10-'+action, field:fields, action:action, expect:arr.length, allowSigma:allow, ev:meta.ev, why:meta.why });
}
fs.writeFileSync(path.join('tools','golden','planned-changes.json'), JSON.stringify(rules,null,1),'utf8');
console.log('规则 '+rules.length+' 条，覆盖 '+rules.reduce((n,r)=>n+r.expect,0)+' 项');
for(const r of rules) console.log('  '+r.id+' expect='+r.expect+' allowSigma='+r.allowSigma.length+' fields='+r.field.join(','));
