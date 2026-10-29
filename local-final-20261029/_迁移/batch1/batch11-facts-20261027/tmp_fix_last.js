const fs=require('fs');
const p='hotfix-patch/core/bz-rpc-server.js';
let t=fs.readFileSync(p,'utf8');
const before=(t.match(/buyHomeCrop/g)||[]).length;
t=t.split("wrapped('buyHomeCrop', v, { achievement: ach() })").join("wrapped('BuyHomeCrop', v, { achievement: ach() })");
fs.writeFileSync(p,t,'utf8');
console.log('改写前小写出现 '+before+' 次，改写后 '+((t.match(/buyHomeCrop/g)||[]).length)+' 次');
