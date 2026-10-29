const fs=require('fs');
const path=require('path');
// 重新取一遍最新差异
const {execFileSync}=require('child_process');
const out=execFileSync(process.execPath,['tools/check_shape_freeze.js','--diff'],{encoding:'utf8'});
const lines=out.split('\n').map(s=>s.replace(/\r$/,'')).filter(Boolean);
const items=[];
for(const ln of lines){
  const p=ln.split(' | ');
  if(p.length!==8) continue;
  const sig=p[7].split(/\u2192/);
  items.push({kind:p[0].trim(),action:p[1].trim(),path:p[2].trim(),s0:(sig[0]||'').trim(),s1:(sig[1]||'').trim()});
}
console.log('差异项 '+items.length);
const EV={
 batchSeedCrop:'index.js:57654', changeSate:'index.js:57676', cleanDeadCrop:'index.js:57811',
 dispossHomeEvent:'index.js:57979', expediteCrop:'index.js:57825', getFriendHomeList:'index.js:57951',
 getHomeList:'index.js:57585', obtainCrop:'index.js:57698', stealCrop:'index.js:58007',
 onKeyDispossHomeEvent:'index.js:57758', onKeyObtainCrop:'index.js:57726',
};
const WHY={
 batchSeedCrop:'C10：空请求（无存档）时 handler 走 eRet 2 拒绝 → 旧的 SHAPED 兜底 crops/recentSeeds 不再出现在空请求路径上；真请求由 handler 回真实地块',
 changeSate:'C10：空请求无地块 → eRet -1（回调 -1 分支 = getText(3320)，index.js:57696）；crop/sIdx 只在成功路径出现',
 cleanDeadCrop:'C10：本批无枯死模型 → 恒 eRet 2（回调只有 1 分支、无 else，57811-57824）',
 dispossHomeEvent:'C10：回调先看有没有 crop 再看 eRet（57980）→ 拒绝应答**刻意不带** crop/idx/exp/flag/rewardArray',
 expediteCrop:'C10：空请求无作物 → eRet 2（getText(1455)，57845）；成功路径才带 crop/sIdx',
 getFriendHomeList:'gen_shapes 按真实语义重抽：soilArr 是数组（客户端 e.soilArr=i.soilArr 后按 .length 用，57596）；该动作仍未实现，只纠正形状表错误默认值',
 getHomeList:'C10 必做项：soilArr 从"对象 {}"改成数组（客户端按 .length/下标用）；旧基线里的对象形态不再成立',
 obtainCrop:'C10：空请求无地块 → eRet 2（**刻意不用 3**：3 分支裸读并把 m.s 置 0，57714-57723）；exp/rewardArray/sIdx 只在成功路径',
 stealCrop:'C10：档 A 锁好友家 → 空请求也 eRet 2（3317 文案，58031-58041）',
 onKeyDispossHomeEvent:'C10：cropMap 空 → 客户端弹 6000404；旧 SHAPED 的其它字段不再出现',
 onKeyObtainCrop:'C10：obtainLands 为空 → 客户端弹 69193',
};
const widening=[], narrowing=[];
for(const it of items){
  const ev=EV[it.action], why=WHY[it.action];
  if(!ev){ console.error('缺 EV: '+it.action); process.exit(1); }
  if(it.kind==='add') widening.push({action:it.action,path:it.path,ev:ev,reason:why+'；本条是新增字段，客户端读取点见证据行'});
  else if(it.kind==='del') narrowing.push({action:it.action,path:it.path,escape:'closed',ev:ev,reason:why+'；"发→不发"的逃逸结论：该路径只在成功分支里被读，拒绝时客户端不读它（否则会 TypeError），故不发是安全方向'});
}
fs.writeFileSync(path.join('tools','golden','approved-widening.json'), JSON.stringify(widening,null,1),'utf8');
fs.writeFileSync(path.join('tools','golden','approved-narrowing.json'), JSON.stringify(narrowing,null,1),'utf8');
console.log('widening '+widening.length+' 条: '+widening.map(w=>w.action+'.'+w.path).join(' '));
console.log('narrowing '+narrowing.length+' 条');
// planned-changes 的 expect 重算
const pcPath=path.join('tools','golden','planned-changes.json');
const rules=JSON.parse(fs.readFileSync(pcPath,'utf8'));
const cnt={};
for(const it of items) cnt[it.action]=(cnt[it.action]||0)+1;
for(const r of rules){ const a=r.id.replace(/^c10-/,''); if(cnt[a]!==undefined){ r.expect=cnt[a]; const fields=Array.from(new Set(items.filter(x=>x.action===a).map(x=>x.path.replace(/\[\d+\]/g,'').split('.').pop()))); r.field=fields; r.allowSigma=items.filter(x=>x.action===a&&x.s0!==x.s1).map(x=>[a,x.path]); } }
fs.writeFileSync(pcPath, JSON.stringify(rules,null,1),'utf8');
console.log('planned-changes 已同步：'+rules.map(r=>r.id+'='+r.expect).join(' '));
