const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const out=execFileSync(process.execPath,['tools/check_shape_freeze.js','--diff'],{encoding:'utf8'});
const items=[];
for(const ln of out.split('\n')){
  const p=ln.replace(/\r$/,'').split(' | ');
  if(p.length!==8) continue;
  const sig=p[7].split(/\u2192/);
  items.push({kind:p[0].trim(),action:p[1].trim(),path:p[2].trim(),s0:(sig[0]||'').trim(),s1:(sig[1]||'').trim()});
}
const byA={};
for(const it of items) (byA[it.action]=byA[it.action]||[]).push(it);
console.log('差异 '+items.length+' 项，动作：'+Object.keys(byA).map(a=>a+'='+byA[a].length).join(' '));
const META={
 getBackShop:{ev:'index.js:57847',why:'C10 商店：新增 getBackShop 货架（35 行种子 × [itemId, tag, 单价] 三元组）。契约见 scoutT-homeshop.md（scripts2.js:31545/31337/31343）；不给 shopArr 客户端弹 3325。单价取 item.Price（用户拍板平价）'},
 buyHomeCrop:{ev:'index.js:57858',why:'C10 商店：买种子（平价扣银两、扣钱发货同一 persist）'},
 getHomeList:{ev:'index.js:57585',why:'C10 商店入口：bShop 从"不发"改回发 1 —— 商店按钮前置是 HomePlantModel.homeShop > 0（scripts2.js:48589），不发则永远进不去'},
};
const widening=[], narrowing=[];
for(const a of Object.keys(byA)){
  const m=META[a]; if(!m){ console.error('缺 META '+a); process.exit(1); }
  for(const it of byA[a]){
    if(it.kind==='add') widening.push({action:a,path:it.path,ev:m.ev,reason:m.why});
    else if(it.kind==='del') narrowing.push({action:a,path:it.path,escape:'closed',ev:m.ev,reason:m.why+'；逃逸结论：该路径只在成功分支被读，拒绝时不发'});
  }
}
const W=path.join('tools','golden','approved-widening.json');
const N=path.join('tools','golden','approved-narrowing.json');
const wOld=fs.existsSync(W)?JSON.parse(fs.readFileSync(W,'utf8')):[];
const nOld=fs.existsSync(N)?JSON.parse(fs.readFileSync(N,'utf8')):[];
const key=r=>r.action+'|'+r.path;
const wSet=new Set(wOld.map(key)), nSet=new Set(nOld.map(key));
let wn=0,nn=0;
for(const r of widening) if(!wSet.has(key(r))){ wOld.push(r); wn++; }
for(const r of narrowing) if(!nSet.has(key(r))){ nOld.push(r); nn++; }
fs.writeFileSync(W, JSON.stringify(wOld,null,1),'utf8');
fs.writeFileSync(N, JSON.stringify(nOld,null,1),'utf8');
const rules=[];
for(const a of Object.keys(byA)){
  const arr=byA[a], m=META[a];
  rules.push({id:'c10c-'+a, field:Array.from(new Set(arr.map(x=>x.path.replace(/\[\d+\]/g,'').split('.').pop()))), action:a,
    expect:arr.length, allowSigma:arr.filter(x=>x.s0!==x.s1).map(x=>[a,x.path]), ev:m.ev, why:m.why});
}
fs.writeFileSync(path.join('tools','golden','planned-changes.json'), JSON.stringify(rules,null,1),'utf8');
console.log('widening +'+wn+' (共 '+wOld.length+') / narrowing +'+nn+' (共 '+nOld.length+') / planned '+rules.length+' 条: '+rules.map(r=>r.id+'='+r.expect).join(' '));
