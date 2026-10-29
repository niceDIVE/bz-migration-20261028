const fs=require('fs');
const files=['tools\\index.js','tools\\scripts3.js','tools\\scripts2.js'];
const clip=(s,n)=>s.length>n?s.slice(0,n)+' …[len='+s.length+']':s;
const out=[];
for(const rel of files){
  const lines=fs.readFileSync('F:\\BaoZouyxt\\'+rel,'utf8').split('\n');
  const hits=[];
  for(let i=0;i<lines.length;i++){
    const l=lines[i];
    if(/HttpConst\.SEED_CROP\b|SEED_CROP\s*:|sendRequest\([^)]*SEED_CROP\b/.test(l)) hits.push('L'+(i+1)+'| '+clip(l.trim(),200));
  }
  out.push('=== '+rel+' SEED_CROP_hits='+hits.length);
  hits.slice(0,20).forEach(h=>out.push(h));
}
// 回调体 57636-57654
const lines=fs.readFileSync('F:\\BaoZouyxt\\tools\\index.js','utf8').split('\n');
out.push('=== 回调体 L57636-L57654');
for(let i=57635;i<57654;i++)out.push('L'+(i+1)+'| '+clip(lines[i],200));
fs.writeFileSync('tmp_main_seed.out.txt',out.join('\n'),'utf8');
console.log('lines='+out.length);
