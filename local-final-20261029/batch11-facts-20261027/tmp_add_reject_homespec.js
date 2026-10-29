const fs=require('fs');
const P='tools/facts/reject-codes.json';
const j=JSON.parse(fs.readFileSync(P,'utf8'));
if(!j.homeSpeicalAward){
 j.homeSpeicalAward={success:[1],handled:[1],promptOnly:[],defaultCode:2,codes:[{code:2,role:'reject',reasons:['default'],tier:2,ev:'index.js:59855#0aca536d',note:'家园特殊事件奖励：玩法未建模（第29批）。**必须回非 1**：SHAPED 兜底会回 {eRet:1,eid:0,rewardArray:{}} → 客户端 productHomeEvent(0,…) 拿 getItem(0,"home_plant_adventure")=null 后裸读 .describe → 真机 TypeError（index.js:95694）。',tierWhy:'回调里非 1 只 dispatch REMOVE_SEARCH_HOME_UI（index.js:57866）→ 静默'}]};
}
fs.writeFileSync(P, JSON.stringify(j,null,1),'utf8');
console.log('reject-codes 动作数='+Object.keys(j).length);
