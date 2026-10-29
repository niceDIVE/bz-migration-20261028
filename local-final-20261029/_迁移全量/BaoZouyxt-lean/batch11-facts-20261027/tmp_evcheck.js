const fs=require('fs');
const ev=JSON.parse(fs.readFileSync('golden/evidence-sha1.json','utf8')).fields;
const fc=JSON.parse(fs.readFileSync('facts/field-classes.json','utf8'));
console.log('evBase 字段数='+Object.keys(ev).length);
['s','eco','ivch','eqch','sIdx','crop','crops','cropMap','obtainLands','recentSeeds','soilArr','bShop','aExp','note'].forEach(k=>{
  console.log(k+' : ev='+(ev[k]?('有('+ev[k].length+'点)'):'无')+'  class='+(fc.fields[k]?JSON.stringify(fc.fields[k].cls):'无此字段'));
});
