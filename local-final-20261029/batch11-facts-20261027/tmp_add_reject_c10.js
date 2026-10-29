const fs=require('fs');
const P='tools/facts/reject-codes.json';
const j=JSON.parse(fs.readFileSync(P,'utf8'));
const add={
 obtainCrop:{success:[1],handled:[1],promptOnly:[],defaultCode:2,codes:[{code:2,role:'reject',reasons:['default','noCrop','notMature'],tier:2,ev:'index.js:59847#778ed870',note:'收获被拒：地块没作物，或当前阶段没有产物（本批只有 4/5/6/7 可收）。⚠ 刻意不用 eRet 3：3 那一支是 `e.soilArr[o.sIdx].m.s = 0`（index.js:57714-57723 裸读并改写地块），未成熟回 3 会把界面画成荒地。',tierWhy:'回调只有 1 / 3 两支（index.js:57698-57725），没有 2 分支 → 2 静默，少发方向'}]},
 batchSeedCrop:{success:[1],handled:[1],promptOnly:[],defaultCode:2,codes:[{code:2,role:'reject',reasons:['default','noTable','badLand','occupied','noSeed','empty'],tier:2,ev:'index.js:59848#95a8bb50',note:'播种被拒：地块号/种子不在表里、地块已有作物、背包种子不够、seedCrops 为空。整单拒绝不做半单（避免扣一半种子）。',tierWhy:'回调只有 1 分支、无 else（index.js:57654-57675）→ 静默'}]},
 changeSate:{success:[1],handled:[1],promptOnly:[-1],defaultCode:-1,codes:[{code:-1,role:'reject',reasons:['default','badLand','friendHome'],tier:1,ev:'index.js:59849#2700d295',note:'地块状态刷新被拒：地块号越界/无作物，或带 fid（好友家，第50批 enterOtherHome 未做）。⚠ 上游拼写 `changeSate`（少个 t），别纠正。',tierWhy:'-1 → Alert.show(getText(3320))（index.js:57696）——有提示不静默，故第 1 档'}]},
 expediteCrop:{success:[1],handled:[1],promptOnly:[2],defaultCode:2,codes:[{code:2,role:'reject',reasons:['default','noCrop','done'],tier:1,ev:'index.js:59852#f0214478',note:'催熟被拒：地块无作物。客户端 2/3 同一句 getText(1455)。本批加速免费（道具 6069 只记不扣）。',tierWhy:'2/3 → Alert.show(getText(1455))（index.js:57845）——有提示'}]},
 cleanDeadCrop:{success:[1],handled:[1],promptOnly:[],defaultCode:2,codes:[{code:2,role:'reject',reasons:['default','noCrop','notDead'],tier:2,ev:'index.js:59851#3399d43c',note:'清枯死被拒：地块无作物，或作物活着（本批无枯死模型：事件不刷、无枯萎计时 → 正常流程恒走这一支）。',tierWhy:'回调只有 1 分支、无 else（index.js:57811-57824）→ 静默'}]},
 dispossHomeEvent:{success:[1],handled:[1],promptOnly:[2],defaultCode:2,codes:[{code:2,role:'reject',reasons:['default','noCrop','noEvent','friendHome'],tier:1,ev:'index.js:59860#40224d48',note:'驱除家事件被拒：地块无作物、作物没有事件（本批不随机刷事件，m.eid 恒 0）、或带 fid（好友家）。⚠ 回调先看有没有 crop 再看 eRet（57980）→ 拒绝应答绝不能带 crop。',tierWhy:'2 → Alert.show(getText(3268))（index.js:58005）——有提示'}]},
 onKeyObtainCrop:{success:[1],handled:[1],promptOnly:[2],defaultCode:2,codes:[{code:2,role:'reject',reasons:['default','noTable'],tier:1,ev:'index.js:60409#e5579113',note:'一键收获被拒：只在作物表 BZ_PLANT 缺失时回 2（正常路径恒 1 + 空 obtainLands，客户端自己弹 69193）。',tierWhy:'2 → Alert.show(getText(6000449))（index.js:57756）——有提示'}]},
 onKeyDispossHomeEvent:{success:[1],handled:[1],promptOnly:[],defaultCode:2,codes:[{code:2,role:'reject',reasons:['default','noTable'],tier:2,ev:'index.js:60410#baa5a0cd',note:'一键驱除被拒：只在作物表缺失时回 2（正常路径恒 1 + 空 cropMap，客户端弹 6000404）。',tierWhy:'回调只有 1 分支、无 else（index.js:57758-57801）→ 静默'}]},
 stealCrop:{success:[1],handled:[1],promptOnly:[2],defaultCode:2,codes:[{code:2,role:'reject',reasons:['default','friendHome'],tier:1,ev:'index.js:59861#902b885a',note:'偷好友菜：**档 A 锁**——好友家 soilArr 来自 `enterOtherHome`(`User.getFriendHomeList`，第50批，未实现)，没有它就没有可偷的菜可判定，故一律 2。等第29/50批落地后在此放开并补冷却。',tierWhy:'2 → 清地 + Alert.show(getText(3317))（index.js:58031-58041）——有提示'}]}
};
let n=0;
for(const k of Object.keys(add)){ if(j[k]) { console.log('已存在，跳过 '+k); continue; } j[k]=add[k]; n++; }
fs.writeFileSync(P, JSON.stringify(j,null,1),'utf8');
console.log('新增 '+n+' 条，总动作数 '+Object.keys(j).length);
