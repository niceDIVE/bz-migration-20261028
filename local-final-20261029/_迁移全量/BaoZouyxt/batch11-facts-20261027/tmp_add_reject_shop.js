const fs=require('fs'), crypto=require('crypto');
const lines=fs.readFileSync('tools/index.js','utf8').split('\n');
const sha8=(t)=>crypto.createHash('sha1').update(t,'utf8').digest('hex').slice(0,8);
const ev={};
for(const n of [59853,59854]){
  const raw=lines[n-1].replace(/\r$/,'').trim();
  ev[n]='index.js:'+n+'#'+sha8(raw);
  console.log(ev[n]+'  '+raw);
}
const P='tools/facts/reject-codes.json';
const j=JSON.parse(fs.readFileSync(P,'utf8'));
if(!j.getBackShop) j.getBackShop={success:[1],handled:[1],promptOnly:[],defaultCode:2,codes:[{code:2,role:'reject',reasons:['default','noTable'],tier:2,ev:ev[59854],note:'家园种子商店货架：只在 BZ_PLANT.shop 缺失时回 2。正常路径恒 1 + shopArr 三元组数组（不给 shopArr 客户端弹 getText(3325)，57856）。',tierWhy:'回调只有 1 分支/无 else（index.js:57847-57857）→ 静默'}]};
if(!j.buyHomeCrop) j.buyHomeCrop={success:[1],handled:[1],promptOnly:[],defaultCode:2,codes:[{code:2,role:'reject',reasons:['default','badItem','badNum','insufficient'],tier:2,ev:ev[59853],note:'买种子被拒：itemID 不在货架、itemNum 非法（要求 1..99）、银两不足。口径：平价（买价=item.Price）、不限购（用户 2026-10-27 拍板）。',tierWhy:'回调只认 1==eRet、无 else（index.js:57858-57864）→ 静默'}]};
fs.writeFileSync(P, JSON.stringify(j,null,1),'utf8');
console.log('reject-codes 动作数='+Object.keys(j).length);
