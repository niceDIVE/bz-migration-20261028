const fs=require('fs');
const clip=(s,n)=>s.length>n?s.slice(0,n)+' …[len='+s.length+']':s;
const lines=fs.readFileSync('F:\\BaoZouyxt\\tools\\scripts2.js','utf8').split('\n');
const out=[];
for(let i=37630;i<37830;i++)out.push('L'+(i+1)+'| '+clip(lines[i],230));
fs.writeFileSync('tmp_main_plantui.out.txt',out.join('\n'),'utf8');
console.log('lines='+out.length+' bytes='+fs.statSync('tmp_main_plantui.out.txt').size);
