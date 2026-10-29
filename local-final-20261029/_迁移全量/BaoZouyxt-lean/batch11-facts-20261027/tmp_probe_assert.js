const fs=require('fs');
const t=fs.readFileSync('hotfix-patch/core/bz-shapes.generated.js','utf8');
const m=t.match(/"homeSpeicalAward":\s*(\{.*?\}),\n/);
console.log('homeSpeicalAward shape = '+(m?m[1]:'(未找到)'));
const lines=fs.readFileSync('tools/scripts2.js','utf8').split('\n');
for(let i=48980;i<49000;i++) console.log('L'+(i+1)+'| '+(lines[i]||'').slice(0,220));
