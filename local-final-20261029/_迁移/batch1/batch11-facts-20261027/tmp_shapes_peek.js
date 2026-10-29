const fs=require('fs');
const s=JSON.parse(fs.readFileSync('tools/shapes.json','utf8'));
for(const a of ['getHomeList','batchSeedCrop','obtainCrop','changeSate','onKeyObtainCrop']){
  const e=s.shapes[a];
  console.log('== '+a+' : '+(e?JSON.stringify(Object.keys(e.fields||{})):'<无>'));
  if(e) for(const k of Object.keys(e.fields)) console.log('   '+k+' = '+JSON.stringify(e.fields[k]).slice(0,160));
}
