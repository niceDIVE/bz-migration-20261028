const fs=require('fs'),path=require('path');
const {execFileSync}=require('child_process');
const out=execFileSync(process.execPath,['tools/check_shape_freeze.js','--diff'],{encoding:'utf8'});
const items=[];
for(const ln of out.split('\n')){
  const p=ln.replace(/\r$/,'').split(' | ');
  if(p.length!==8) continue;
  const sig=p[7].split(/\u2192/);
  items.push({kind:p[0].trim(),action:p[1].trim(),path:p[2].trim(),s0:(sig[0]||'').trim(),s1:(sig[1]||'').trim()});
}
const META={BuyHomeCrop:{ev:'index.js:57858',why:'C10 商店：BuyHomeCrop 的**线上名是大写 B**（index.js:59853 `BUY_HOME_CROP: "User.BuyHomeCrop"`），本场先写成小写 buyHomeCrop → 客户端请求落到 SHAPED 兜底（真机日志实证 `SHAPED User.BuyHomeCrop`）。改名后空请求走 eRet 2（无 else 静默），成功路径才带 rewardArray/limit'}};
const byA={};
for(const it of items) (byA[it.action]=byA[it.action]||[]).push(it);
const W=path.join('tools','golden','approved-widening.json'), N=path.join('tools','golden','approved-narrowing.json');
const wOld=JSON.parse(fs.readFileSync(W,'utf8')), nOld=JSON.parse(fs.readFileSync(N,'utf8'));
const key=r=>r.action+'|'+r.path;
const wSet=new Set(wOld.map(key)), nSet=new Set(nOld.map(key));
for(const a of Object.keys(byA)){
  const m=META[a]; if(!m){ console.error('缺 META '+a); process.exit(1); }
  for(const it of byA[a]){
    if(it.kind==='add'&&!wSet.has(key(it))) wOld.push({action:a,path:it.path,ev:m.ev,reason:m.why});
    if(it.kind==='del'&&!nSet.has(key(it))) nOld.push({action:a,path:it.path,escape:'closed',ev:m.ev,reason:m.why+'；逃逸结论：只在 1==eRet 分支读，拒绝时不发'});
  }
}
fs.writeFileSync(W,JSON.stringify(wOld,null,1),'utf8');
fs.writeFileSync(N,JSON.stringify(nOld,null,1),'utf8');
const rules=Object.keys(byA).map(a=>{const arr=byA[a],m=META[a];return {id:'c10d-'+a,field:Array.from(new Set(arr.map(x=>x.path.replace(/\[\d+\]/g,'').split('.').pop()))),action:a,expect:arr.length,allowSigma:arr.filter(x=>x.s0!==x.s1).map(x=>[a,x.path]),ev:m.ev,why:m.why};});
fs.writeFileSync(path.join('tools','golden','planned-changes.json'),JSON.stringify(rules,null,1),'utf8');
console.log('差异 '+items.length+' 项 -> 规则 '+rules.map(r=>r.id+'='+r.expect).join(' ')+'；widening 共 '+wOld.length+' / narrowing 共 '+nOld.length);
