const fs=require('fs');
for(const rel of ['tools/index.js','tools/scripts2.js','tools/scripts3.js']){
  const lines=fs.readFileSync(rel,'utf8').split('\n');
  const hits=[];
  for(let i=0;i<lines.length;i++) if(lines[i].includes('setRoleInfo')) hits.push('L'+(i+1)+'| '+lines[i].trim().slice(0,200));
  console.log('=== '+rel+' setRoleInfo 命中 '+hits.length);
  hits.forEach(h=>console.log('  '+h));
}
