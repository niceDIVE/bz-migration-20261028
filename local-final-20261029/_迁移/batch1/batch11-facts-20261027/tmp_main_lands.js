const fs=require('fs');
const lines=fs.readFileSync('F:\\BaoZouyxt\\tools\\index.js','utf8').split('\n');
const clip=(s,n)=>s.length>n?s.slice(0,n)+' …[len='+s.length+']':s;
const out=[];
for(let i=58295;i<58360;i++)out.push('L'+(i+1)+'| '+clip(lines[i],220));
// LandUI 实例化点
const hits=[];
for(let i=0;i<lines.length;i++) if(lines[i].includes('LandUI')) hits.push('L'+(i+1)+'| '+clip(lines[i].trim(),200));
out.push('=== LandUI 命中 '+hits.length); hits.slice(0,25).forEach(h=>out.push(h));
fs.writeFileSync('tmp_main_lands.out.txt',out.join('\n'),'utf8');
console.log('lines='+out.length);
