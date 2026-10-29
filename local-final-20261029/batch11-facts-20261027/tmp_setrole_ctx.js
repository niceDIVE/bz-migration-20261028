const fs=require('fs');
const lines=fs.readFileSync('tools/index.js','utf8').split('\n');
for(let i=111895;i<111925;i++) console.log('L'+(i+1)+'| '+(lines[i]||'').slice(0,240));
