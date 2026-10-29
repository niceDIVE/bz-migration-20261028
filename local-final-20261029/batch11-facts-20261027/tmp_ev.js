const fs=require('fs'), crypto=require('crypto');
const lines=fs.readFileSync('tools/index.js','utf8').split('\n');
const sha8=(t)=>crypto.createHash('sha1').update(t,'utf8').digest('hex').slice(0,8);
[59845,59847,59848,59849,59851,59852,59860,59861,60409,60410].forEach(n=>{
  const raw=lines[n-1].replace(/\r$/,'').trim();
  console.log(n, sha8(raw), JSON.stringify(raw.slice(0,90)));
});
