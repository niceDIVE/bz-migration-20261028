const fs=require('fs');
let all=[];
for(const i of [0,1,2,3,4]){ const p=`F:/BaoZouyxt/tools/facts/batch${i}.json`; if(!fs.existsSync(p)) continue; const j=JSON.parse(fs.readFileSync(p,'utf8')); all=all.concat(Array.isArray(j)?j:(j.actions||[])); }
const byAct={}; all.forEach(a=>{ (byAct[a.action]=byAct[a.action]||[]).push(a); });
console.log('records:', all.length, 'actions:', Object.keys(byAct).length);
fs.writeFileSync('F:/BaoZouyxt/tools/field_usage.json', JSON.stringify(byAct,null,1));
const many = Object.entries(byAct).sort((a,b)=>b[1].length-a[1].length).slice(0,8);
for (const [k,v] of many) console.log(k, v.length, '→', [...new Set(v.map(x=>x.field))].join(','));
