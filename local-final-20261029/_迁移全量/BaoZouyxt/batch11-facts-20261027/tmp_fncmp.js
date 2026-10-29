const fs=require('fs');
const cur=fs.readFileSync('hotfix-patch/core/bz-rpc-server.js','utf8');
const old=fs.readFileSync('_backup/20261027-040000-pre-c10/core/bz-rpc-server.js','utf8');
function slice(src,name){
  const key='\n    '+name+': function';
  const i=src.indexOf(key);
  if(i<0) return null;
  const j=src.indexOf('\n    },\n',i);
  return src.slice(i, j<0?i+4000:j+8);
}
const names=['passCardAward','BuyFashion','knackLottery','exchangeItem','buyGoodAndEvilShopItem','buySchoolShop','rgShopByItem','useItem','saleItem','killNpc','acceptTask'];
let bad=0;
for(const n of names){
  const a=slice(old,n), b=slice(cur,n);
  if(a===null||b===null){ console.log('⚠ 找不到 '+n); continue; }
  if(a===b) console.log('✔ 一致 '+n+' ('+a.length+' B)');
  else { bad++; console.log('✗ 不一致 '+n+' (旧 '+a.length+' / 新 '+b.length+')'); }
}
console.log(bad?('有 '+bad+' 个函数与备份不同'):'全部非 C10 handler 与备份逐字一致');
