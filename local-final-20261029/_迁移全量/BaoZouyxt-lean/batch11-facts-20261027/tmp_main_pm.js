const fs=require('fs');
const clip=(s,n)=>s.length>n?s.slice(0,n)+' …[len='+s.length+']':s;
const out=[];
function dump(rel,a,b,tag){const lines=fs.readFileSync('F:\\BaoZouyxt\\'+rel,'utf8').split('\n');out.push('=== '+tag+' '+rel+' L'+a+'-L'+b);for(let i=a-1;i<Math.min(b,lines.length);i++)out.push('L'+(i+1)+'| '+clip(lines[i],230));}
dump('tools\\index.js',95563,95830,'PlantSystemMgr');
fs.writeFileSync('tmp_main_plantmgr.out.txt',out.join('\n'),'utf8');
console.log('lines='+out.length+' bytes='+fs.statSync('tmp_main_plantmgr.out.txt').size);
