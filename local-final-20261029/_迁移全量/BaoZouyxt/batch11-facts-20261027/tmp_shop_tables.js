const fs=require('fs'),path=require('path');
const D='tools/cfg/dump';
const files=fs.readdirSync(D).filter(f=>/\.json$/i.test(f));
// 1) 哪些表里出现了种子 id 4777（或 4778）
const hit=[];
for(const f of files){
  let t;
  try{ t=fs.readFileSync(path.join(D,f),'utf8'); }catch(e){ continue; }
  if(t.includes('4777')&&t.length<3e6){ hit.push([f,t.length]); }
}
console.log('含 "4777" 的表 '+hit.length+' 张：'+hit.map(h=>h[0]).join(', '));
// 2) 表名含 shop 的
console.log('--- 表名含 shop/home/garden ---');
console.log(files.filter(f=>/shop|home|garden|seed|crop/i.test(f)).sort().join('\n'));
