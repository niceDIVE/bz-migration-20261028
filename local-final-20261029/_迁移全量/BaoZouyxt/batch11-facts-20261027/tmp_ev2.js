const fs=require('fs'), crypto=require('crypto');
const lines=fs.readFileSync('tools/index.js','utf8').split('\n');
const sha8=(t)=>crypto.createHash('sha1').update(t,'utf8').digest('hex').slice(0,8);
[59855].forEach(n=>{ const raw=lines[n-1].replace(/\r$/,'').trim(); console.log(n, sha8(raw), JSON.stringify(raw)); });
