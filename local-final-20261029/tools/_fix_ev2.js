const fs=require('fs'),crypto=require('crypto');
const P='F:/BaoZouyxt/tools/facts/reject-codes.json';
const L=fs.readFileSync('F:/BaoZouyxt/tools/index.js','utf8').split('\n');
const raw=L[60537].replace(/\r$/,'').trim();
const ev='index.js:60538#'+crypto.createHash('sha1').update(raw,'utf8').digest('hex').slice(0,8);
const j=JSON.parse(fs.readFileSync(P,'utf8'));
for(const c of j.rgUseItem.codes) c.ev=ev;
fs.writeFileSync(P,JSON.stringify(j,null,1)+'\n');
console.log('rgUseItem ev -> '+ev);
