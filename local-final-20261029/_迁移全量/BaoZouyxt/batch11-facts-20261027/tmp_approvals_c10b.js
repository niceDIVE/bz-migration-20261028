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
console.log('差异项 '+items.length+'：'+items.map(i=>i.kind+' '+i.action+'.'+i.path).join(' | '));
const META={
 getHomeList:{ev:'index.js:57585',why:'C10 后续修正：bShop 被形状表归为"开关"，发 0 会刷"开关字段值不合法"（真机日志实证，client 57597 用 hasOwnProperty）。改为不发 —— 客户端 homeShop 仍为默认 0，行为等价'},
 homeSpeicalAward:{ev:'index.js:59855',why:'C10 同面板修复：SHAPED 兜底的 {eRet:1,eid:0,rewardArray:{}} 会让客户端 productHomeEvent(0,…) 裸读 null 表的 .describe → 真机 TypeError（index.js:95694）。改成 eRet 2（回调里只 dispatch REMOVE_SEARCH_HOME_UI，57866），eid/rewardArray 一并收掉'},
};
const widening=[], narrowing=[];
for(const it of items){
  const m=META[it.action]; if(!m){ console.error('缺 META '+it.action); process.exit(1); }
  if(it.kind==='add') widening.push({action:it.action,path:it.path,ev:m.ev,reason:m.why});
  else if(it.kind==='del') narrowing.push({action:it.action,path:it.path,escape:'closed',ev:m.ev,reason:m.why+'；逃逸结论：该路径只在 1==eRet 分支里被读，回 2 后客户端不读它'});
}
const W=path.join('tools','golden','approved-widening.json');
const N=path.join('tools','golden','approved-narrowing.json');
// 追加（保留 C10 那一批已冻结的审批记录）
const wOld=fs.existsSync(W)?JSON.parse(fs.readFileSync(W,'utf8')):[];
const nOld=fs.existsSync(N)?JSON.parse(fs.readFileSync(N,'utf8')):[];
const key=r=>r.action+'|'+r.path;
const wSet=new Set(wOld.map(key)), nSet=new Set(nOld.map(key));
for(const r of widening) if(!wSet.has(key(r))) wOld.push(r);
for(const r of narrowing) if(!nSet.has(key(r))) nOld.push(r);
fs.writeFileSync(W, JSON.stringify(wOld,null,1),'utf8');
fs.writeFileSync(N, JSON.stringify(nOld,null,1),'utf8');
// planned-changes：按 action 分组
const byA={};
for(const it of items) (byA[it.action]=byA[it.action]||[]).push(it);
const rules=[];
for(const a of Object.keys(byA)){
  const arr=byA[a], m=META[a];
  rules.push({id:'c10b-'+a, field:Array.from(new Set(arr.map(x=>x.path.replace(/\[\d+\]/g,'').split('.').pop()))), action:a,
    expect:arr.length, allowSigma:arr.filter(x=>x.s0!==x.s1).map(x=>[a,x.path]), ev:m.ev, why:m.why});
}
fs.writeFileSync(path.join('tools','golden','planned-changes.json'), JSON.stringify(rules,null,1),'utf8');
console.log('widening 共 '+wOld.length+' 条 / narrowing 共 '+nOld.length+' 条 / planned '+rules.length+' 条');
