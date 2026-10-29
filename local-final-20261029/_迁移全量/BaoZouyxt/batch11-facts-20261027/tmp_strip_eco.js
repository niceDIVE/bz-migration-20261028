const fs=require('fs');
const p='hotfix-patch/core/bz-rpc-server.js';
const lines=fs.readFileSync(p,'utf8').split('\n');
// 定位 C10 段起点（H 里的注释块）
let start=-1;
for(let i=0;i<lines.length;i++){ if(lines[i].indexOf('\u7b2c 11 \u6279 C10')>=0 && lines[i].indexOf('=============')>=0) start=i; }
console.log('C10 注释块起点 L'+(start+1)+': '+(start>=0?lines[start].slice(0,60):'?'));
let n=0;
for(let i=start;i<lines.length;i++){
  if(lines[i]==='      var note = { ivch: {}, eqch: {}, eco: {} }, i;'){ lines[i]='      var note = { ivch: {}, eqch: {} }, i;'; n++; }
  else if(lines[i]==='      var note = { ivch: {}, eqch: {}, eco: {} };'){ lines[i]='      var note = { ivch: {}, eqch: {} };'; n++; }
}
fs.writeFileSync(p, lines.join('\n'),'utf8');
console.log('改写 '+n+' 处（C10 段内）');
lines.forEach((l,i)=>{ if(i>start && l.indexOf('var note = { ivch')>=0) console.log('  L'+(i+1)+': '+l.trim()); });
