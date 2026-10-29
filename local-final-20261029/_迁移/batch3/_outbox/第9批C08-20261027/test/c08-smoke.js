'use strict';
/** c08-smoke.js —— 第 9 批 C08〔PVE 战斗族〕冒烟（走真实 dispatch）。
 *
 *  覆盖：
 *   ① 线上名 ≠ 注册名：4 个实现动作在 H 里；四个"不做"的动作**没有** handler（保留 SHAPED/UNKNOWN 兜底）。
 *   ② 琅嬛开局：npcID 回声 + npcArr 取 BZ_NPCARR 真值。
 *   ③ AttckData：baseValueAy 换成本档、roleID 本档、契约键齐（createPlayerBattleEntity 裸读，缺键即 TypeError）。
 *   ④ attArr 回空 + gold 0（用户 2026-10-27 拍板②；复活动作未做，不给假复活价）。
 *   ⑤ 未知 npcID 兜底：**原故障重现**——空 npcArr 会让客户端 index.js:8118 抛 TypeError。
 *   ⑥ 动作回声：action/paramID/paramID1/paramID2 原样回（无 else 分支，回错=这一招永远播不出）。
 *   ⑦ 肉鸽：rogueHp/rogueHpLimit/rogueMp 取请求里报的战场血。
 *   ⑧ PVP：eRet 3 且应答收窄到只有 eRet（本批唯一优雅退出的分支）。
 *   ⑨ 本批零发奖口：5 个动作跑完存档逐字节不变、钱包/背包不动。
 *
 *  取证：batch9-facts-20261027/{scoutG-c08-reqkeys.md, C7-c08-取证与策略.md}。
 *  用法：node test/c08-smoke.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CORE = path.join(__dirname, '..', 'core');
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-shops.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

function fresh(extra) {
  const st = new Map();
  const base = {
    roleID: 16374, name: 'FZhou', saveVersion: 4,
    accepted: [], done: [], rewarded: [], skills: { 1: [3, 0, 1], 7: [2, 0, 1] },
    baseValueAy: [], bag: { 5001: 3 }, playerEquip: {}, equipments: {},
    potential: 100, coins: 1000, gold: 1000, yuanbao: 500,
    bloodArr: [], fosterArr: [], contribution: 0, school: 1,
    schoolContribution: {}, hunger: 50, mounts: {}, mountShow: 0,
    marketBuyTimes: {}, passCardLevel: 0, passLiveness: 0, passAward: {},
    growthClaim: {}, growthBigPaid: 0,
  };
  if (extra) extra(base);
  st.set(createBzServer({ readSave: () => null, writeSave: () => {}, log: () => {}, now: () => 1792612412000, templates: TPL })._internal.SAVE_KEY,
    JSON.stringify(base));
  const srv = createBzServer({
    readSave: (k) => (st.has(k) ? st.get(k) : null),
    writeSave: (k, t) => st.set(k, t),
    log: () => {}, now: () => 1792612412000, templates: TPL,
  });
  const d = (a, p) => srv.dispatch('User', a, p || {});
  const pay = (r, a) => r['User.' + a];
  srv.loadSave();                        // 预热①：ensureLedger
  srv.dispatch('User', 'getAchieveData', {});   // 预热②：坑表 §4，避免第一个动作的规范化被误判成改档
  return { srv, d, pay, save: () => srv.loadSave(), snap: () => JSON.stringify(srv.loadSave()) };
}

let pass = 0; const fails = [];
function T(n, fn) { try { fn(); pass++; console.log('  ok   ' + n); } catch (e) { fails.push(n + ': ' + e.message); console.log('  FAIL ' + n + ' -> ' + e.message); } }

const IMPL = ['enterPVEBattle', 'beginPVEBattle', 'enterRoguePVEBattle', 'beginRoguePVEBattle', 'ChallengePVP'];
const NOT_DONE = [
  ['ChallengeRoguePVP', 'REQ_ROGUE_PVP_BATTLE'],
  ['beginMultiPVEBattle', 'MPPVE_ACTION'],
  ['beginRogueMultiPVEBattle', 'ROGUE_MPPVE_ACTION'],
  ['startMultiPVEBattle', 'START_MPPVE_BATTLE'],
];

T('【①】5 个线上名都在 H；4 个"不做"的没有 handler（不许误注册）', () => {
  const f = fresh();
  const H = f.srv._internal.handlers;
  const bad = [];
  for (const wire of IMPL) if (typeof H[wire] !== 'function') bad.push('缺 ' + wire);
  for (const [wire] of NOT_DONE) if (typeof H[wire] === 'function') bad.push('不该有 handler：' + wire);
  assert.deepStrictEqual(bad, [], bad.join(' | '));
});

T('【②】琅嬛开局：npcID 原样回声、npcArr 取真值（npc 1001 → 非空数组）', () => {
  const f = fresh();
  const r = f.pay(f.d('enterPVEBattle', { npcID: 1001, mp: 30, gTime: 1234, hgtimes: 2 }), 'enterPVEBattle');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(r.npcID, 1001, 'npcID 必须回声（以前恒为形状默认 310003）');
  assert.ok(Array.isArray(r.npcArr) && r.npcArr.length >= 20, 'npcArr 必须是非空数组，实得 ' + JSON.stringify(r.npcArr).slice(0, 60));
  assert.strictEqual(typeof r.npcArr[0], 'number');
});

T('【③】AttckData：baseValueAy 换成本档、roleID 本档', () => {
  const f = fresh((b) => { b.baseValueAy = new Array(48).fill(0); b.baseValueAy[27] = 777; b.baseValueAy[28] = 888; });
  const a = f.pay(f.d('enterPVEBattle', { npcID: 1001 }), 'enterPVEBattle').AttckData;
  assert.ok(a && typeof a === 'object', 'AttckData 必须是对象');
  assert.strictEqual(a.baseValueAy[27], 777, 'hpRemaining 必须来自本档 baseValueAy[27]');
  assert.strictEqual(a.baseValueAy[28], 888, 'hpLimit 必须来自本档 baseValueAy[28]');
  assert.strictEqual(a.baseValueAy[41], 0, 'baseValueAy[41]（死亡次数载体）必须是 0');
  assert.strictEqual(a.roleID, 16374, 'roleID 必须是本档（客户端拿它当 entityA.battleID）');
});

T('【③b】AttckData 契约键齐（createPlayerBattleEntity 裸读的那几个）', () => {
  const f = fresh();
  const a = f.pay(f.d('enterPVEBattle', { npcID: 1001 }), 'enterPVEBattle').AttckData;
  const need = ['skillMap', 'WeapToSkill', 'equipments', 'equips', 'gemData', 'equipTitle', 'baseValueAy'];
  const miss = need.filter((k) => !Object.prototype.hasOwnProperty.call(a, k));
  assert.deepStrictEqual(miss, [], '缺键（客户端 index.js:74766-74914 裸读）: ' + miss.join(','));
  assert.deepStrictEqual(a.skillMap['1'], [3, 0, 1], '本档技能等级要叠进 skillMap（s.skills[1]=[3,0,1]）');
  assert.strictEqual(typeof a.WeapToSkill, 'object', 'WeapToSkill 必须是对象（读 undefined 的属性会 TypeError）');
});

T('【④】attArr 回空数组 + gold 0 + randSeed 是数字', () => {
  const f = fresh();
  const r = f.pay(f.d('enterPVEBattle', { npcID: 1001 }), 'enterPVEBattle');
  assert.deepStrictEqual(r.attArr, [], 'attArr 必须是空数组（客户端所有读点都在 length>0 守卫里）');
  assert.strictEqual(r.gold, 0, 'gold 是复活价（index.js:98835），复活动作未做 → 不许给假的 99999');
  assert.strictEqual(typeof r.randSeed, 'number');
});

T('【⑤原故障重现】未知 npcID 必须兜底成真实存在的怪（空 npcArr 会在 index.js:8118 抛 TypeError）', () => {
  const f = fresh();
  for (const bad of [{ npcID: 999999 }, { npcID: 0 }, {}]) {
    const r = f.pay(f.d('enterPVEBattle', bad), 'enterPVEBattle');
    assert.strictEqual(r.eRet, 1, '不许拒绝（回调无 else 分支 → 卡战斗界面）');
    assert.ok(r.npcID > 0, 'npcID 不许是 0：' + JSON.stringify(bad));
    assert.ok(Array.isArray(r.npcArr) && r.npcArr.length >= 20,
      'npcArr 不许为空：' + JSON.stringify(bad) + ' → ' + JSON.stringify(r.npcArr).slice(0, 40));
    // generateNpcData 会读 t[14] 再取 [0]（index.js:8118），所以 t[14] 也必须是数组
    assert.ok(Array.isArray(r.npcArr[14]) && r.npcArr[14].length > 0, 'npcArr[14]（jineng）必须是数组');
  }
});

T('【⑥】动作回声：action/paramID/paramID1/paramID2 原样回，attArr 空', () => {
  const f = fresh();
  const q = { action: 1, paramID: 2001, paramID1: 1, paramID2: 16374 };
  const r = f.pay(f.d('beginPVEBattle', q), 'beginPVEBattle');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(r.action, 1);
  assert.strictEqual(typeof r.action, 'number', 'action 必须是数字（客户端 switch(o.action) 用数字 case，index.js:98878）');
  assert.strictEqual(r.paramID, 2001);
  assert.strictEqual(r.paramID1, 1);
  assert.strictEqual(r.paramID2, 16374);
  assert.deepStrictEqual(r.attArr, []);
  // 逃跑（action 0）也必须回声 0，不能因为"0 是假值"被丢掉
  const r0 = f.pay(f.d('beginPVEBattle', { action: 0 }), 'beginPVEBattle');
  assert.strictEqual(r0.action, 0);
});

T('【⑦】肉鸽开局：rogueHp/rogueHpLimit/rogueMp 取请求里报的血，exchangeNpcArr 空数组', () => {
  const f = fresh();
  const r = f.pay(f.d('enterRoguePVEBattle', { npcID: 1001, hp: 321, hplimit: 400, mp: 55 }), 'enterRoguePVEBattle');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(r.npcID, 1001);
  assert.strictEqual(r.AttckData.rogueHp, 321);
  assert.strictEqual(r.AttckData.rogueHpLimit, 400);
  assert.strictEqual(r.AttckData.rogueMp, 55);
  assert.deepStrictEqual(r.exchangeNpcArr, [], 'exchangeNpcArr 必须是数组（客户端 hasOwnProperty 后取 length）');
  assert.deepStrictEqual(r.attArr, []);
});

T('【⑧】肉鸽动作回声', () => {
  const f = fresh();
  const r = f.pay(f.d('beginRoguePVEBattle', { action: 3, paramID: 0, paramID1: 0, paramID2: 16374 }), 'beginRoguePVEBattle');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(r.action, 3);
  assert.strictEqual(r.paramID2, 16374);
  assert.deepStrictEqual(r.attArr, []);
});

T('【⑨】PVP：eRet 3（客户端弹提示后 dispose），应答收窄到只有 eRet', () => {
  const f = fresh();
  const r = f.pay(f.d('ChallengePVP', { otherRoleID: 12345, mp: 10, gTime: 1, hgtimes: 0 }), 'ChallengePVP');
  assert.strictEqual(r.eRet, 3, '3 = index.js:101338-101341 的优雅退出分支');
  assert.deepStrictEqual(Object.keys(r), ['eRet'], '拒绝应答必须收窄（不许把 AttckData/EnemyData 空壳发出去）');
});

T('【⑩】本批零发奖口：5 个动作跑完，存档逐字节不变 + 钱包/背包不动', () => {
  const f = fresh();
  const before = f.snap();
  const b = f.save();
  const wallet = JSON.stringify({ bag: b.bag, coins: b.coins, gold: b.gold, yuanbao: b.yuanbao, pe: b.playerEquip });
  f.d('enterPVEBattle', { npcID: 1001, mp: 1 });
  f.d('beginPVEBattle', { action: 1, paramID: 2001, paramID1: 1, paramID2: 16374 });
  f.d('enterRoguePVEBattle', { npcID: 1001, hp: 1, hplimit: 1, mp: 1 });
  f.d('beginRoguePVEBattle', { action: 1, paramID: 2001 });
  f.d('ChallengePVP', { otherRoleID: 1 });
  assert.strictEqual(f.snap(), before, '这 5 个动作一个字节都不许写存档');
  const a = f.save();
  assert.strictEqual(JSON.stringify({ bag: a.bag, coins: a.coins, gold: a.gold, yuanbao: a.yuanbao, pe: a.playerEquip }), wallet,
    '钱包/背包/装备一个子儿都不许动');
});

console.log('');
if (fails.length) {
  console.log('c08-smoke: ' + pass + ' ok / ' + fails.length + ' FAIL');
  for (const x of fails) console.log('  - ' + x);
  process.exit(1);
}
console.log('c08-smoke: 全部通过（' + pass + ' 条）');
