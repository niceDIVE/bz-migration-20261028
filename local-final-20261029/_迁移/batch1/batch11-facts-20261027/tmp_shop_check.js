const fs=require('fs');
const src=fs.readFileSync('hotfix-patch/core/bz-c10.generated.js','utf8');
const m=src.match(/var BZ_PLANT = (\{[\s\S]*\});\s*$/);
const P=JSON.parse(m[1]);
console.log('shop.rows='+P.shop.rows.length+' tag='+P.shop.tag+' defaultPrice='+P.shop.defaultPrice);
console.log('前 5 条: '+JSON.stringify(P.shop.rows.slice(0,5)));
const prices=[...new Set(P.shop.rows.map(r=>r.price))];
console.log('价格种类='+JSON.stringify(prices));
console.log('作物 53 / 可买种子 '+P.shop.rows.length);
