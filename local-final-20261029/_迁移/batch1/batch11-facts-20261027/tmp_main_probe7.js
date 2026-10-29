const fs=require('fs');
const files=['tools\\index.js','tools\\scripts3.js','tools\\scripts2.js'];
const clip=(s,n)=>s.length>n?s.slice(0,n)+' …[len='+s.length+']':s;
const out=[];
for(const rel of files){
  const lines=fs.readFileSync('F:\\BaoZouyxt\\'+rel,'utf8').split('\n');
  const hits=[];
  for(let i=0;i<lines.length;i++) if(lines[i].includes('soilArr')) hits.push('L'+(i+1)+'| '+clip(lines[i].trim(),220));
  out.push('=== '+rel+' soilArr_hits='+hits.length);
  hits.forEach(h=>out.push(h));
  for(const pat of ['recentSeeds','plantExp','productHomeEvent','PlantSystemMgr']){
    let c=0; const ex=[];
    for(let i=0;i<lines.length;i++) if(lines[i].includes(pat)){c++; if(ex.length<6)ex.push('L'+(i+1)+'| '+clip(lines[i].trim(),180));}
    out.push('--- '+rel+' '+pat+' count='+c); ex.forEach(e=>out.push(e));
  }
}
fs.writeFileSync('tmp_main_probe7.out.txt',out.join('\n'),'utf8');
console.log('lines='+out.length);
