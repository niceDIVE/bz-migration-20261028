const fs=require('fs');
const p='hotfix-patch/core/bz-rpc-server.js';
let t=fs.readFileSync(p,'utf8');
// 1) 拒绝码表键
t=t.replace("buyHomeCrop: { default: 2, badItem: 2, badNum: 2, insufficient: 2 },","BuyHomeCrop: { default: 2, badItem: 2, badNum: 2, insufficient: 2 },");
// 2) 收窄白名单键
t=t.replace("getBackShop: [], buyHomeCrop: [],","getBackShop: [], BuyHomeCrop: [],");
// 3) handler 键与内部引用
t=t.replace("    buyHomeCrop: function (p) {","    BuyHomeCrop: function (p) {");
t=t.replace(/noteReject\('buyHomeCrop'/g,"noteReject('BuyHomeCrop'");
t=t.replace(/return wrapped\('buyHomeCrop'/g,"return wrapped('BuyHomeCrop'");
t=t.replace(/return shaped\('buyHomeCrop'/g,"return shaped('BuyHomeCrop'");
t=t.replace(/env\.log\('buyHomeCrop /g,"env.log('BuyHomeCrop ");
t=t.replace(/shaped\('buyHomeCrop', v\) \|\| wrapped\('buyHomeCrop'/g,"shaped('BuyHomeCrop', v) || wrapped('BuyHomeCrop'");
fs.writeFileSync(p,t,'utf8');
const hits=(t.match(/[Bb]uyHomeCrop/g)||[]);
console.log('文件里 BuyHomeCrop/buyHomeCrop 出现 '+hits.length+' 次');
const bad=(t.match(/buyHomeCrop/g)||[]).length;
console.log('剩下小写 buyHomeCrop 的次数（应为 0 或只在注释里）: '+bad);
(t.split('\n')||[]).forEach((l,i)=>{ if(l.indexOf('buyHomeCrop')>=0) console.log('  L'+(i+1)+': '+l.trim().slice(0,120)); });
// 4) reject-codes.json 改名
const JP='tools/facts/reject-codes.json';
const j=JSON.parse(fs.readFileSync(JP,'utf8'));
if(j.buyHomeCrop && !j.BuyHomeCrop){ j.BuyHomeCrop=j.buyHomeCrop; delete j.buyHomeCrop; }
fs.writeFileSync(JP, JSON.stringify(j,null,1),'utf8');
console.log('reject-codes 键已改：'+(!!j.BuyHomeCrop)+' 动作数='+Object.keys(j).length);
// 5) 测试改名
const TP='hotfix-patch/test/c10-smoke.js';
let ts=fs.readFileSync(TP,'utf8');
ts=ts.split("'buyHomeCrop'").join("'BuyHomeCrop'");
fs.writeFileSync(TP,ts,'utf8');
console.log('测试里 buyHomeCrop 残留: '+((ts.match(/buyHomeCrop/g)||[]).length));
