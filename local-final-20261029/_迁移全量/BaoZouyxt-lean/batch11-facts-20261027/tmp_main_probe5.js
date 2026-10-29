const fs=require('fs');
const files=['tools\\index.js','tools\\scripts3.js','tools\\scripts2.js'];
const clip=(s,n)=>s.length>n?s.slice(0,n)+' …[len='+s.length+']':s;
const out=[];
for(const rel of files){
  const lines=fs.readFileSync('F:\\BaoZouyxt\\'+rel,'utf8').split('\n');
  const hits=[];
  for(let i=0;i<lines.length;i++){
    const l=lines[i];
    if(/soilArr|plantSeedData|recentSs/.test(l)){
      const isAssign=/soilArr\s*=|plantSeedData\s*=|recentSs\s*=/.test(l);
      const looksFromData=/o\.soilArr|data\.soilArr|\.soilArr\s*\)|plantSeedData\s*=\s*[a-z]+\./.test(l);
      if(isAssign||looksFromData) hits.push('L'+(i+1)+'| '+clip(l.trim(),240));
    }
  }
  out.push('=== '+rel+' hits='+hits.length);
  hits.slice(0,60).forEach(h=>out.push(h));
}
fs.writeFileSync('tmp_main_probe5.out.txt',out.join('\n'),'utf8');
console.log('lines='+out.length);
