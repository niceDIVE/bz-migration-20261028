const fs=require('fs');
const shop=JSON.parse(fs.readFileSync('tools/cfg/dump/shop.json','utf8'));
console.log('shop.json cols='+JSON.stringify(shop.cols||[]).slice(0,400));
console.log('shop.json rows='+Object.keys(shop.data).length);
const first=Object.keys(shop.data).slice(0,3).map(k=>JSON.stringify(shop.data[k]).slice(0,240));
first.forEach(s=>console.log('  '+s));
const t=fs.readFileSync('tools/cfg/dump/shop.json','utf8');
console.log('shop.json 含 4777? '+t.includes('4777'));
// 种子物品行
const item=JSON.parse(fs.readFileSync('tools/cfg/dump/item.json','utf8'));
const crops=JSON.parse(fs.readFileSync('tools/cfg/dump/home_plant_crop.json','utf8'));
const seeds=Object.keys(crops.data).map(k=>parseInt(crops.data[k].seed,10));
const rows=seeds.map(s=>item.data[String(s)]).filter(Boolean);
console.log('种子行命中 item.json: '+rows.length+'/'+seeds.length);
rows.slice(0,6).forEach(r=>console.log('  seed='+r.ID+' Name='+r.Name+' Type='+r.Type+' BuyPrice='+r.BuyPrice+' Price='+r.Price+' Limit='+r.Limit+' Effect='+r.Effect));
console.log('BuyPrice>0 的种子数='+rows.filter(r=>parseInt(r.BuyPrice,10)>0).length);
console.log('Limit 分布='+JSON.stringify([...new Set(rows.map(r=>r.Limit))]));
// shop_entrance
const se=JSON.parse(fs.readFileSync('tools/cfg/dump/shop_entrance.json','utf8'));
console.log('shop_entrance cols='+JSON.stringify(se.cols||[]).slice(0,300));
Object.keys(se.data).slice(0,12).forEach(k=>console.log('  '+k+' => '+JSON.stringify(se.data[k]).slice(0,200)));
