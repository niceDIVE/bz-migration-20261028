const fs=require('fs');
const lines=fs.readFileSync('F:\\BaoZouyxt\\tools\\index.js','utf8').split('\n');
const clip=(s,n)=>s.length>n?s.slice(0,n)+' …[len='+s.length+']':s;
const out=[];
for(const [a,b] of [[57510,57575],[58360,58395]]){out.push('=== L'+a+'-L'+b);for(let i=a-1;i<b;i++)out.push('L'+(i+1)+'| '+clip(lines[i],260));}
fs.writeFileSync('tmp_main_probe4.out.txt',out.join('\n'),'utf8');
console.log('lines='+out.length);
