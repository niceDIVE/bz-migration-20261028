const fs=require('fs');
const path=require('path');
const raw=fs.readFileSync('batch11-facts-20261027/tmp_diff.txt','utf8');
const lines=raw.split('\n');
console.log('first line raw: '+JSON.stringify(lines[0]));
const items=[];
for(const ln of lines){
  const t=ln.replace(/\r$/,'');
  if(!t) continue;
  const parts=t.split(' | ');
  if(parts.length!==8) continue;
  const s=parts[7].split('->');
  const sig=parts[7].split(/\u2192/);
  items.push({kind:parts[0].trim(),action:parts[1].trim(),path:parts[2].trim(),s0:(sig[0]||'').trim(),s1:(sig[1]||'').trim()});
}
console.log('解析差异项 '+items.length);
fs.writeFileSync('batch11-facts-20261027/tmp_diff_parsed.json', JSON.stringify(items,null,1),'utf8');
