'use strict';
/** c10-smoke.js —— 第 11 批 C10〔农作物〕冒烟（走真实 dispatch）。
 *
 *  覆盖：
 *   ① 10 个线上名都在 H 里（8 主 + `batchSeedCrop` 顺手 + `getHomeList` 必做）。
 *   ② `getHomeList` 的裸读契约：`soilArr` 必须是**数组**、每块 `s=1`、`exp` 是数字、`recentSeeds` 是数组。
 *   ③ 播种：扣种子、地块挂上 `m`、回包 `crops`/`recentSeeds` 齐（两处裸读）。
 *   ④ 播种扣光背包**不许被写前守卫回滚**（SHRINK_OK 白拿口子）。
 *   ⑤ 种子不足 / 地块已占 → eRet 2，存档逐字节不变（整单拒绝不做半单）。
 *   ⑥ 真实计时：把时钟推到成熟，`changeSate` 必须把 `m.s` 推到 4；`m.t` 不变。
 *   ⑦ 未成熟收获 → eRet 2 且**存档不变**（绝不能走 eRet 3：那一支会把 m.s 置 0 画成荒地）。
 *   ⑧ 成熟收获：发产物 + 种植经验增加 + 地块清空 + `rewardArray`/`aExp`/`exp`/`note.ivch` 齐。
 *   ⑨ 一键收获：多块一次收齐，`obtainLands` 是数组（客户端裸读 .length）。
 *   ⑩ 催熟免费：连点把作物催到成熟，背包一个字节都不动。
 *   ⑪ 偷菜（档 A）：eRet 2、应答只有 eRet、存档不变。
 *   ⑫ 驱除事件：无事件时 eRet 2 且**应答不带 crop**（客户端先看 crop 再看 eRet）。
 *   ⑬ 一键驱除：`cropMap` 是对象；无事件时 eRet 1 + 空对象（客户端自己弹 6000404）。
 *   ⑭ 事件不随机刷：播种后 `m.eid` 恒 0；`cleanDeadCrop` 无枯死 → eRet 2 且不动档。
 *
 *  取证：batch11-facts-20261027\C10-c10-取证与策略.md（含 4 处裸读崩点）。
 *  用法：node test/c10-smoke.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CORE = path.join(__dirname, '..', 'core');
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-shops.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-tasks.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-c09.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-c10.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

const PL = (typeof BZ_PLANT !== 'undefined') ? BZ_PLANT : null;
const SEED = 4777;                        // home_plant_crop 第一行（客户端立绘齐全）
const CROP = PL ? PL.crops[String(SEED)] : null;
const DAY = 86400;

function fresh(extra) {
  const clock = { t: 1792612412000 };
  const st = new Map();
  const base = {
    roleID: 16374, name: 'FZhou', saveVersion: 4,
    accepted: [], done: [], rewarded: [], skills: {},
    baseValueAy: [], bag: {}, playerEquip: {}, equipments: {},
    potential: 100, coins: 1000, gold: 1000, yuanbao: 500,
    bloodArr: [], fosterArr: [], contribution: 0, school: 1,
    schoolContribution: {}, hunger: 50, mounts: {}, mountShow: 0,
    marketBuyTimes: {}, passCardLevel: 0, passLiveness: 0, passAward: {},
    growthClaim: {}, growthBigPaid: 0,
  };
  if (extra) extra(base);
  st.set(createBzServer({ readSave: () => null, writeSave: () => {}, log: () => {}, now: () => clock.t, templates: TPL })._internal.SAVE_KEY,
    JSON.stringify(base));
  const srv = createBzServer({
    readSave: (k) => (st.has(k) ? st.get(k) : null),
    writeSave: (k, t) => st.set(k, t),
    log: () => {}, now: () => clock.t, templates: TPL,
  });
  const d = (a, p) => srv.dispatch('User', a, p || {});
  const pay = (r, a) => r['User.' + a];
  srv.loadSave();
  return { srv, d, pay, clock, save: () => srv.loadSave(), snap: () => JSON.stringify(srv.loadSave()) };
}
/** 种一块地（返回该地块的对象引用） */
function plantOne(f, landIdx, seed) {
  const r = f.pay(f.d('batchSeedCrop', { seedCrops: { [String(landIdx)]: seed || SEED } }), 'batchSeedCrop');
  assert.strictEqual(r.eRet, 1, '播种应成功：' + JSON.stringify(r));
  return f.save().plant.lands[landIdx];
}

let pass = 0; const fails = [];
function T(n, fn) { try { fn(); pass++; console.log('  ok   ' + n); } catch (e) { fails.push(n + ': ' + e.message); console.log('  FAIL ' + n + ' -> ' + e.message); } }

const IMPL = ['getHomeList', 'batchSeedCrop', 'changeSate', 'obtainCrop', 'expediteCrop',
  'cleanDeadCrop', 'dispossHomeEvent', 'onKeyObtainCrop', 'onKeyDispossHomeEvent', 'stealCrop'];

T('【⓪】作物表在产物里可见（BZ_PLANT 53 行 / 4 事件 / 加速 86400s）', () => {
  assert.ok(PL && PL.crops, 'BZ_PLANT 取不到（生成器没接进 test？）');
  assert.strictEqual(Object.keys(PL.crops).length, 53, '作物行数应为 53');
  assert.strictEqual(Object.keys(PL.events).length, 4, '家事件应为 4 行');
  assert.strictEqual(PL.boost.seconds, DAY, '每次加速 = 86400 秒（home_plant_details id=2）');
  assert.ok(CROP && CROP.st[0] > 0, '种子 ' + SEED + ' 必须带 seedtime');
});

T('【①】10 个线上名都在 H 里', () => {
  const f = fresh();
  const H = f.srv._internal.handlers;
  const bad = IMPL.filter((w) => typeof H[w] !== 'function');
  assert.deepStrictEqual(bad, [], '缺 handler: ' + bad.join(','));
});

T('【②】getHomeList：soilArr 是数组 4 块、每块 s=1、exp 数字、recentSeeds 数组', () => {
  const f = fresh();
  const r = f.pay(f.d('getHomeList', {}), 'getHomeList');
  assert.strictEqual(r.eRet, 1);
  assert.ok(Array.isArray(r.soilArr), 'soilArr 必须是数组（客户端 e.soilArr=i.soilArr 后按 .length 用）');
  assert.strictEqual(r.soilArr.length, 4, '地块数应为 4（客户端 getHomeLands 缺省 4）');
  for (const L of r.soilArr) assert.strictEqual(L.s, 1, '每块地 s 必须是 1（已开垦）');
  assert.strictEqual(typeof r.exp, 'number', 'exp 必须数字（裸读进 plantExp）');
  assert.ok(Array.isArray(r.recentSeeds), 'recentSeeds 必须是数组');
  assert.strictEqual(typeof r.dog, 'number');
  // bShop 必须是**正数**：商店入口前置是 HomePlantModel.homeShop > 0（scripts2.js:48589）
  assert.ok(r.bShop > 0, 'bShop 必须 > 0（否则家园商店按钮进不去），实得 ' + r.bShop);
});

T('【③】播种：扣种子 + 地块挂 m + crops/recentSeeds 齐', () => {
  const f = fresh((b) => { b.bag = { [SEED]: 3 }; });
  const r = f.pay(f.d('batchSeedCrop', { seedCrops: { 0: SEED } }), 'batchSeedCrop');
  assert.strictEqual(r.eRet, 1);
  assert.ok(r.crops && r.crops['0'] && r.crops['0'].m, 'crops 裸读：必须含地块 → {m}');
  assert.ok(Array.isArray(r.recentSeeds), 'recentSeeds 裸赋：必须是数组');
  assert.strictEqual(f.save().bag[SEED], 2, '应扣 1 颗种子，实余 ' + f.save().bag[SEED]);
  const m = f.save().plant.lands[0].m;
  assert.ok(m && m.id === SEED, '地块应挂上作物：' + JSON.stringify(m));
  assert.strictEqual(m.s, 1, '刚种下应是阶段 1');
  assert.strictEqual(m.eid, 0, '事件本批不随机刷（m.eid 恒 0）');
});

T('【④】播种把背包播空 → 不许被写前守卫回滚（SHRINK_OK 白拿口子）', () => {
  const f = fresh((b) => { b.bag = { [SEED]: 1 }; });
  const r = f.pay(f.d('batchSeedCrop', { seedCrops: { 0: SEED } }), 'batchSeedCrop');
  assert.strictEqual(r.eRet, 1, '应成功');
  assert.ok(!f.save().bag[SEED], '唯一的种子必须真扣掉（回滚=白拿）：' + JSON.stringify(f.save().bag));
  assert.ok(f.save().plant.lands[0].m, '地必须种上了');
});

T('【⑤】种子不足 / 地块已占 → eRet 2 且存档逐字节不变', () => {
  const f = fresh((b) => { b.bag = { [SEED]: 0 }; });
  const before = f.snap();
  const r1 = f.pay(f.d('batchSeedCrop', { seedCrops: { 0: SEED } }), 'batchSeedCrop');
  assert.strictEqual(r1.eRet, 2, '没种子应回 2');
  assert.deepStrictEqual(Object.keys(r1), ['eRet'], '拒绝应答必须收窄到只有 eRet');
  assert.strictEqual(f.snap(), before, '拒绝不许写档');
  // 已占：先种一块，再往同一块种
  const f2 = fresh((b) => { b.bag = { [SEED]: 5 }; });
  plantOne(f2, 1);
  const before2 = f2.snap();
  const r2 = f2.pay(f2.d('batchSeedCrop', { seedCrops: { 1: SEED } }), 'batchSeedCrop');
  assert.strictEqual(r2.eRet, 2, '地块已有作物应回 2');
  assert.strictEqual(f2.snap(), before2, '拒绝不许写档');
  assert.strictEqual(f2.save().bag[SEED], 4, '整单拒绝：一颗种子都不许扣');
});

T('【⑥】真实计时：时钟推到成熟后 changeSate 把 m.s 推到 4，m.t 不动', () => {
  const f = fresh((b) => { b.bag = { [SEED]: 5 }; });
  const land = plantOne(f, 0);
  const t0 = land.m.t, st0 = land.m.s;
  assert.strictEqual(st0, 1);
  const need = CROP.st[0] + CROP.st[1] + CROP.st[2] + CROP.st[3];   // 到 mature 的总秒数
  f.clock.t += (need + 3600) * 1000;
  const r = f.pay(f.d('changeSate', { sIdx: 0 }), 'changeSate');
  assert.strictEqual(r.eRet, 1);
  assert.ok(r.crop && r.crop.m, 'crop 裸读：必须含 m');
  assert.ok(r.crop.m.s >= 4 && r.crop.m.s <= 7, '阶段应推到成熟区（4..7），实得 ' + r.crop.m.s);
  assert.strictEqual(f.save().plant.lands[0].m.t, t0, 'm.t 是播种时刻，不许被改写');
  assert.strictEqual(f.save().plant.lands[0].m.s, r.crop.m.s, '阶段必须落盘（客户端只负责画）');
});

T('【⑦】未成熟收获 → eRet 2 且存档不变（绝不走 eRet 3：那支会把 m.s 置 0 画成荒）', () => {
  const f = fresh((b) => { b.bag = { [SEED]: 5 }; });
  plantOne(f, 0);
  const before = f.snap();
  const r = f.pay(f.d('obtainCrop', { sIdx: 0 }), 'obtainCrop');
  assert.strictEqual(r.eRet, 2, '未成熟应回 2（不是 3）');
  assert.deepStrictEqual(Object.keys(r), ['eRet']);
  assert.strictEqual(f.snap(), before, '未成熟不许动档（尤其 m.s）');
  assert.strictEqual(f.save().plant.lands[0].m.s, 1, 'm.s 不许被改成 0');
});

T('【⑧】成熟收获：发产物 + 种植经验 + 清地 + rewardArray/aExp/exp/note.ivch 齐', () => {
  const f = fresh((b) => { b.bag = { [SEED]: 5 }; });
  plantOne(f, 0);
  f.clock.t += (CROP.st[0] + CROP.st[1] + CROP.st[2] + CROP.st[3] + 60) * 1000;
  // 先刷一次状态，拿到"收货那一刻的真实阶段"（服务端按 (1-effect) 折让，可能已过 mature）
  const cs = f.pay(f.d('changeSate', { sIdx: 0 }), 'changeSate');
  const st = cs.crop.m.s;
  assert.ok(st >= 4, '应已成熟，实得阶段 ' + st);
  const out = CROP.out[String(st)];
  assert.ok(out, '表里阶段 ' + st + ' 必须有产物');
  const r = f.pay(f.d('obtainCrop', { sIdx: 0 }), 'obtainCrop');
  assert.strictEqual(r.eRet, 1, '成熟应可收：' + JSON.stringify(r));
  const keys = r.rewardArray ? Object.keys(r.rewardArray) : [];
  assert.ok(keys.length >= 1, 'rewardArray 必须非空');
  const itemId = Number(keys[0]), num = r.rewardArray[keys[0]];
  assert.strictEqual(itemId, out[0], '阶段 ' + st + ' 的产物应是表里的 ' + out[0]);
  assert.strictEqual(num, out[1], '数量应等于表里的数量列');
  assert.strictEqual(f.save().bag[itemId], out[1], '产物必须真进背包');
  assert.strictEqual(r.aExp, CROP.exp, 'aExp 应等于表里的 exp');
  assert.strictEqual(r.exp, CROP.exp, 'exp 应是累计种植经验');
  assert.strictEqual(f.save().plant.exp, CROP.exp, '种植经验必须落盘');
  assert.ok(r.note && r.note.ivch && r.note.ivch[String(itemId)] === out[1],
    'note.ivch 必须给绝对值（否则观察守卫刷未解释差额）');
  assert.ok(!f.save().plant.lands[0].m, '收完地块必须清空');
  assert.strictEqual(f.save().plant.lands[0].s, 1, '收完仍是已开垦地');
});

T('【⑨】一键收获：多块收齐，obtainLands 是数组', () => {
  const f = fresh((b) => { b.bag = { [SEED]: 10 }; });
  plantOne(f, 0); plantOne(f, 1);
  f.clock.t += (CROP.st[0] + CROP.st[1] + CROP.st[2] + CROP.st[3] + 120) * 1000;
  const r = f.pay(f.d('onKeyObtainCrop', { matureArr: [0, 1] }), 'onKeyObtainCrop');
  assert.strictEqual(r.eRet, 1);
  assert.ok(Array.isArray(r.obtainLands), 'obtainLands 裸读 .length：必须是数组');
  assert.deepStrictEqual(r.obtainLands.slice().sort(), [0, 1], '两块都该被收：' + JSON.stringify(r.obtainLands));
  assert.ok(r.rewardArray && Object.keys(r.rewardArray).length >= 1, '聚合 rewardArray 必须非空');
  assert.ok(Array.isArray(r.matureArr), 'matureArr 客户端会写进 DelegateModel（可选字段，但给了要给数组）');
  assert.ok(!f.save().plant.lands[0].m && !f.save().plant.lands[1].m, '两块都该清空');
  // 空手再收一次：obtainLands 空数组是合法结果（客户端弹 69193）
  const r2 = f.pay(f.d('onKeyObtainCrop', {}), 'onKeyObtainCrop');
  assert.strictEqual(r2.eRet, 1);
  assert.deepStrictEqual(r2.obtainLands, [], '没得收时应回空数组（客户端弹 69193）');
});

T('【⑩】催熟免费：连点把作物催到成熟，背包一个字节不动', () => {
  const f = fresh((b) => { b.bag = { [SEED]: 5 }; });
  plantOne(f, 0);
  const bagBefore = JSON.stringify(f.save().bag);
  let r = null, clicks = 0;
  while (clicks < 12) {
    r = f.pay(f.d('expediteCrop', { sIdx: 0, num: 1 }), 'expediteCrop');
    assert.strictEqual(r.eRet, 1, '催熟应成功');
    clicks++;
    if (r.crop.m.s >= 4) break;
  }
  assert.ok(r.crop.m.s >= 4, '每次 +24h，12 次内应到成熟，实得阶段 ' + r.crop.m.s);
  assert.strictEqual(JSON.stringify(f.save().bag), bagBefore, '加速免费：背包不许动');
  assert.strictEqual(f.save().plant.lands[0].m.c, clicks, 'm.c 应等于点击次数 ' + clicks);
});

T('【⑪】偷菜（档 A）：eRet 2、应答只有 eRet、存档不变', () => {
  const f = fresh((b) => { b.bag = { [SEED]: 5 }; });
  plantOne(f, 0);
  const before = f.snap();
  const r = f.pay(f.d('stealCrop', { fid: 777, idx: 0 }), 'stealCrop');
  assert.strictEqual(r.eRet, 2);
  assert.deepStrictEqual(Object.keys(r), ['eRet'], '拒绝应答必须收窄到只有 eRet');
  assert.strictEqual(f.snap(), before, '偷菜锁：不许动档');
});

T('【⑫】驱除事件：无事件时 eRet 2 且应答不带 crop（客户端先看 crop 再看 eRet）', () => {
  const f = fresh((b) => { b.bag = { [SEED]: 5 }; });
  plantOne(f, 0);
  const r = f.pay(f.d('dispossHomeEvent', { idx: 0 }), 'dispossHomeEvent');
  assert.strictEqual(r.eRet, 2);
  assert.ok(!Object.prototype.hasOwnProperty.call(r, 'crop'), '拒绝应答绝不能带 crop');
  assert.deepStrictEqual(Object.keys(r), ['eRet']);
  // 好友家：带 fid 也拒
  const r2 = f.pay(f.d('dispossHomeEvent', { idx: 0, fid: 9 }), 'dispossHomeEvent');
  assert.strictEqual(r2.eRet, 2);
});

T('【⑬】一键驱除：cropMap 是对象；无事件时 eRet 1 + 空对象', () => {
  const f = fresh();
  const r = f.pay(f.d('onKeyDispossHomeEvent', {}), 'onKeyDispossHomeEvent');
  assert.strictEqual(r.eRet, 1);
  assert.ok(r.cropMap && typeof r.cropMap === 'object' && !Array.isArray(r.cropMap), 'cropMap 裸读：必须是对象');
  assert.deepStrictEqual(r.cropMap, {}, '没种过地时应回空对象（客户端弹 6000404）');
  // 种了地但没事件：cropMap 里有该地块（客户端据此重画），事件数 0
  const f2 = fresh((b) => { b.bag = { [SEED]: 5 }; });
  plantOne(f2, 2);
  const r2 = f2.pay(f2.d('onKeyDispossHomeEvent', {}), 'onKeyDispossHomeEvent');
  assert.strictEqual(r2.eRet, 1);
  assert.ok(r2.cropMap['2'] && r2.cropMap['2'].m, '有作物的地块要出现在 cropMap 里');
});

T('【⑭】无枯死模型：cleanDeadCrop 回 eRet 2 且不动档；空地块 changeSate 回 -1', () => {
  const f = fresh((b) => { b.bag = { [SEED]: 5 }; });
  plantOne(f, 0);
  const before = f.snap();
  const r = f.pay(f.d('cleanDeadCrop', { sIdx: 0 }), 'cleanDeadCrop');
  assert.strictEqual(r.eRet, 2, '作物健在 → 2（回调无 else，静默）');
  assert.strictEqual(f.snap(), before, '不许动档');
  const r2 = f.pay(f.d('changeSate', { sIdx: 3 }), 'changeSate');
  assert.strictEqual(r2.eRet, -1, '空地块 → -1（回调 getText(3320) 分支）');
});

T('【⑮】家园种子商店：货架是 [itemId, tag, 单价] 三元组，缺 shopArr 客户端会弹 3325', () => {
  const f = fresh();
  const r = f.pay(f.d('getBackShop', {}), 'getBackShop');
  assert.strictEqual(r.eRet, 1);
  assert.ok(Array.isArray(r.shopArr) && r.shopArr.length >= 30, 'shopArr 必须是数组且够长，实得 ' + (r.shopArr || []).length);
  const row = r.shopArr[0];
  assert.ok(Array.isArray(row) && row.length === 3, 'shopArr[i] 必须是三元组 [itemId, 类别tag, 单价]：' + JSON.stringify(row));
  assert.strictEqual(typeof row[0], 'number');
  assert.strictEqual(row[1], 1, '类别 tag 恒 1（银两）');
  assert.ok(row[2] > 0, '单价必须 > 0');
  assert.ok(PL.shop.rows.some((x) => x.id === row[0]), '货架里的 id 必须来自 BZ_PLANT.shop');
  // 每个 id 都得是作物表里的种子（不然播种会被拒）
  const bad = r.shopArr.filter((x) => !CROP || !PL.crops[String(x[0])]).map((x) => x[0]);
  assert.deepStrictEqual(bad, [], '货架里混进了作物表没有的 id：' + bad.join(','));
});

T('【⑯】买种子：扣银两 + 进背包 + rewardArray/note 齐；钱不够 → eRet 2 且存档不变', () => {
  const f = fresh((b) => { b.coins = 1000; b.bag = {}; });
  const price = PL.shop.rows[0].price;
  const id = PL.shop.rows[0].id;
  const r = f.pay(f.d('BuyHomeCrop', { itemID: id, itemNum: 3 }), 'BuyHomeCrop');
  assert.strictEqual(r.eRet, 1, '买种子应成功：' + JSON.stringify(r));
  assert.strictEqual(f.save().coins, 1000 - price * 3, '应按平价扣银两');
  assert.strictEqual(f.save().bag[id], 3, '种子必须进背包');
  assert.strictEqual(r.rewardArray[String(id)], 3, 'rewardArray 必须能解释发放');
  assert.strictEqual(r.note.eco.coins, 1000 - price * 3, 'note.eco.coins 要给绝对值（观察守卫）');
  assert.strictEqual(r.note.ivch[String(id)], 3, 'note.ivch 要给绝对值');
  // 钱不够
  const f2 = fresh((b) => { b.coins = 1; b.bag = {}; });
  const before = f2.snap();
  const r2 = f2.pay(f2.d('BuyHomeCrop', { itemID: id, itemNum: 1 }), 'BuyHomeCrop');
  assert.strictEqual(r2.eRet, 2, '银两不足 → 2（回调无 else，静默）');
  assert.deepStrictEqual(Object.keys(r2), ['eRet'], '拒绝应答必须收窄到只有 eRet');
  assert.strictEqual(f2.snap(), before, '拒绝不许动档');
  // 不在货架的 id
  const r3 = f2.pay(f2.d('BuyHomeCrop', { itemID: 999999, itemNum: 1 }), 'BuyHomeCrop');
  assert.strictEqual(r3.eRet, 2);
  // 非法数量
  const r4 = f.pay(f.d('BuyHomeCrop', { itemID: id, itemNum: 0 }), 'BuyHomeCrop');
  assert.strictEqual(r4.eRet, 2);
  const r5 = f.pay(f.d('BuyHomeCrop', { itemID: id, itemNum: 100 }), 'BuyHomeCrop');
  assert.strictEqual(r5.eRet, 2, 'itemNum 上限 99');
});

T('【⑰】买了就能种：商店 → 播种 一条链闭合', () => {
  const f = fresh((b) => { b.coins = 5000; b.bag = {}; });
  const id = PL.shop.rows[0].id;
  assert.strictEqual(f.pay(f.d('BuyHomeCrop', { itemID: id, itemNum: 2 }), 'BuyHomeCrop').eRet, 1);
  const r = f.pay(f.d('batchSeedCrop', { seedCrops: { 0: id } }), 'batchSeedCrop');
  assert.strictEqual(r.eRet, 1, '买到的种子必须能直接种：' + JSON.stringify(r));
  assert.strictEqual(f.save().plant.lands[0].m.id, id);
});

console.log('');
if (fails.length) {  console.log('c10-smoke: ' + pass + ' ok / ' + fails.length + ' FAIL');
  for (const x of fails) console.log('  - ' + x);
  process.exit(1);
}
console.log('c10-smoke: 全部通过（' + pass + ' 条）');
