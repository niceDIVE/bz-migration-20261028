'use strict';
/** 第 4 批 C03〔战斗结算〕— 本轮落地的 8 个动作的冒烟。
 *
 *  覆盖三类事故形态（每类都是**原故障重现**，不是正常路径自证）：
 *   ① §5.1「注册名 ≠ 线上名」：注册名照原样注册 = 静默落进 UNKNOWN/通用 ACK，一条都不生效。
 *      这里直接断言 H 的键里**没有**注册名、**有**线上名。
 *   ② retryOnEmpty 死锁：这些动作普遍在"回包为空"时触发客户端重发（同 getBigGrowupData 的
 *      14~15ms 重发事故）。所以断言应答非空。
 *   ③ crashOnMissing：shape-hints 标了 crashOnMissing 的字段，客户端是直读的，
 *      缺了/类型错了就抛。这里按 kind 断言类型。
 *
 *  用法：node test/c03-smoke.js
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

const SAVE_KEY = createBzServer({
  readSave: () => null, writeSave: () => {}, log: () => {}, now: () => 1792612412000, templates: TPL,
})._internal.SAVE_KEY;

const store = new Map();
store.set(SAVE_KEY, JSON.stringify({
  roleID: 16374, name: 'FZhou', saveVersion: 4,
  accepted: [], done: [], rewarded: [], skills: {},
  baseValueAy: [], bag: {}, playerEquip: {}, equipments: {},
  potential: 102499, coins: 1000, gold: 1000, yuanbao: 100,
  bloodArr: [], fosterArr: [], contribution: 99999, school: 1,
  schoolContribution: {}, hunger: 50, mounts: {}, mountShow: 0,
  marketBuyTimes: {}, passCardLevel: 0, passLiveness: 0, passAward: {},
  growthClaim: {}, growthBigPaid: 0,
}));
const srv = createBzServer({
  readSave: (k) => (store.has(k) ? store.get(k) : null),
  writeSave: (k, t) => store.set(k, t),
  log: () => {},
  now: () => 1792612412000,
  templates: TPL,
});
const d = (a, p) => srv.dispatch('User', a, p || {});
const pay = (r, a) => r['User.' + a];

let pass = 0; const fails = [];
function T(n, fn) { try { fn(); pass++; console.log('  ok   ' + n); } catch (e) { fails.push(n + ': ' + e.message); console.log('  FAIL ' + n + ' -> ' + e.message); } }

/** 本批已落地（线上名）。注册名对照见注释，**故意分开写**，防止有人顺手"统一"成注册名。 */
const SHIPPED = [
  ['GetNewSweepTowerData', 'GET_NEW_SWEEP_EVENT'],
  ['GetClimbingTowerData', 'ENTER_GET_CLIMBLING_EVENT'],
  ['lookSecretEvent', 'LOOK_SECRET_PANDA_EVENT'],
  ['newSweepTower', 'NEW_TOWER_SWEEP_EVENT'],
  ['closeNewSweepTowerByLv', 'CLOSE_NEW_SWEEP_EVENT'],
  ['chooseSecretEvent', 'SELECT_SECRET_PANDA_EVENT'],
  ['rogueBattleResult', 'SERVER_ROGUE_NPC_BATTLE_END'],
  ['NewPVPBattleResult', 'USER_PVP_OVER'],
  ['TowerBattleResult', 'SERVER_NPC_BATTLE_END'],
  ['NewRoguePVPBattleResult', 'ROGUE_PVP_BATTLE_END'],
  ['roguePveBattleResult', 'ROGUE_PVE_BATTLE_RESULT'],
  ['goodAndEvilBattleResult', 'GOOD_AND_EVIL_BATTLE_RESULT'],
  ['chanllengeTower', 'TOWER_RANDOM_EVENT'],
  ['activateTowerEvent', 'ACTIVE_TOWER_EVENT'],
  ['choosePandaEvent', 'TOWER_CHOOSE_PANDA_EVENT'],
  ['mulitiNpcBattleResult', 'REQ_MP_RESULT'],
  ['GetRandomEventAward', 'REQ_WM_ADV_RWD'],
  ['diceBattleResult', 'DICE_BATTLE_RESULT'],
];

/** crashOnMissing 字段 → 期望类型（类型全部按客户端真实消费点定，见 C1/C3 取证表）。
 *  diceBattleResult 故意回非 1 的 eRet，客户端整段跳过，所以它不需要任何字段。 */
const NEED = {
  TowerBattleResult: { awardObj: 'array', rewardArray: 'object', gemId: 'array' },
  NewRoguePVPBattleResult: { delTaskIds: 'array', mapData2: 'object' },
  roguePveBattleResult: { booksObj: 'object', mapData2: 'object', delTaskIds: 'array' },
  goodAndEvilBattleResult: { prestige: 'number', contribution: 'number' },   // 客户端 .toString()
  chanllengeTower: { npcArr: 'array', eventID: 'object', equipments: 'object' },
  activateTowerEvent: { npcArr: 'array', eventID: 'object' },
  choosePandaEvent: { batch_sweep_data: 'object', rewardArray: 'object' },
  mulitiNpcBattleResult: { equipObj: 'object', gemId: 'array' },
  GetRandomEventAward: { rewardArray: 'object', npcArr: 'array', liveness: 'number' },
  lookSecretEvent: { secret: 'array' },
  GetClimbingTowerData: { towerArray: 'array' },
};
function tyOf(v) { if (v === null) return 'null'; if (Array.isArray(v)) return 'array'; return typeof v; }

// ---------- ① 注册名 vs 线上名 ----------
T('【§5.1 原故障重现】18 个线上名都在 H 里，且 18 个注册名都不在', () => {
  const H = srv._internal.handlers;
  const wrong = [];
  for (const [wire, reg] of SHIPPED) {
    if (typeof H[wire] !== 'function') wrong.push('缺线上名 ' + wire);
    if (typeof H[reg] === 'function') wrong.push('误把注册名当键 ' + reg);
  }
  assert.deepStrictEqual(wrong, [], wrong.join(' | '));
});

T('注册名派发不会命中真 handler（否则就是 §5.1 那个静默错注册）', () => {
  const H = srv._internal.handlers;
  for (const [, reg] of SHIPPED) {
    assert.ok(!Object.prototype.hasOwnProperty.call(H, reg),
      'H 里不该有注册名键：' + reg);
  }
});

// ---------- ② retryOnEmpty：应答不许空 ----------
T('【重发死锁原故障重现】18 个动作的应答必须非空且 eRet 是数字', () => {
  for (const [wire] of SHIPPED) {
    const r = pay(d(wire, {}), wire);
    assert.ok(r && typeof r === 'object', wire + ' 没有应答对象');
    assert.strictEqual(typeof r.eRet, 'number', wire + ' 的 eRet 必须是数字（否则客户端走 resend 分支）');
    assert.ok(Object.keys(r).length > 0, wire + ' 回包为空 → 触发 retryOnEmpty 重发');
  }
});

// ---------- ③ crashOnMissing 字段类型 ----------
T('crashOnMissing 字段必须存在且类型正确（按客户端真实消费点）', () => {
  const bad = [];
  for (const [wire] of SHIPPED) {
    const need = NEED[wire];
    if (!need) continue;
    const r = pay(d(wire, {}), wire);
    for (const k of Object.keys(need)) {
      if (!Object.prototype.hasOwnProperty.call(r, k)) { bad.push(wire + '.' + k + ' 缺失'); continue; }
      const got = tyOf(r[k]);
      if (got !== need[k]) bad.push(wire + '.' + k + ' 类型=' + got + ' 期望 ' + need[k]);
    }
  }
  assert.deepStrictEqual(bad, [], bad.join(' | '));
});

T('lookSecretEvent.secret 必须是数组（客户端按 .length / 下标读）', () => {
  // scripts2.js:75376  for (var o = 0; o < t.data.secret.length; o++) e += t.data.secret[o]
  const r = pay(d('lookSecretEvent', {}), 'lookSecretEvent');
  assert.ok(Array.isArray(r.secret),
    'secret 必须是数组；给 0 或对象会让 .length 变 undefined（实得 ' + JSON.stringify(r.secret) + '）');
});

T('goodAndEvilBattleResult 的 prestige/contribution 必须是数字（客户端 .toString()）', () => {
  // scripts3.js:35349-35350  t.prestige.toString() / t.contribution.toString()
  const r = pay(d('goodAndEvilBattleResult', {}), 'goodAndEvilBattleResult');
  assert.strictEqual(typeof r.prestige, 'number', 'prestige 必须是数字，实得 ' + tyOf(r.prestige));
  assert.strictEqual(typeof r.contribution, 'number', 'contribution 必须是数字，实得 ' + tyOf(r.contribution));
});

// ---------- ④ diceBattleResult：回非 1 让客户端整段跳过 ----------
T('diceBattleResult 必须回非 1 的 eRet（该玩法未建模，假装成功会读 e.dice 抛错）', () => {
  // scripts3.js:51158-51166  1==eRet 时读 e.dice → setChirstManData，并 setCandyData/updateNpcsDatas
  const r = pay(d('diceBattleResult', {}), 'diceBattleResult');
  assert.notStrictEqual(r.eRet, 1, 'diceBattleResult 不许回 1');
  assert.strictEqual(r.eRet, 0, '按 REJECT_CODES 登记值应为 0');
});

// ---------- ⑤ 防白拿 ----------
T('GetRandomEventAward 忽略客户端自报的 award（白拿陷阱）', () => {
  // index.js:143865-143871  var o = { adventureID: t, award: e, eventID: ... }; sendRequest(REQ_WM_ADV_RWD, o)
  const bagBefore = JSON.stringify(srv.loadSave().bag);
  const r = pay(d('GetRandomEventAward', { adventureID: 1, eventID: 1, award: 999999 }), 'GetRandomEventAward');
  assert.strictEqual(JSON.stringify(srv.loadSave().bag), bagBefore,
    'award 是客户端自己传的，照它发奖就是白拿 —— 背包必须不变');
  assert.deepStrictEqual(r.rewardArray, {}, 'rewardArray 必须为空');
});

T('结算类动作即使带伪造的战果参数也不发奖（防再造一个白拿口子）', () => {
  const snap = () => JSON.stringify(srv.loadSave().bag) + '|' + srv.loadSave().coins;
  const bagBefore = snap();
  // 模拟客户端伪造大额战果。⚠ 这几个动作都**没有可校验键**（reqKeys 里无 npcID），
  //   按 v2.7 口径一律只 ack，所以背包与银两必须纹丝不动。
  //   ⚠ 不要把 rogueBattleResult 放进来：它 reqKeys 有 npcID，会按服务端掉落表掷骰，
  //     放进来这条就成了看脸（掷中就红）的 flaky 用例 —— 第一版正是这么写的。
  pay(d('NewPVPBattleResult', { win: 1, award: 999999, prestige: 999999 }), 'NewPVPBattleResult');
  pay(d('TowerBattleResult', { win: 1, lv: 1, award: 999999 }), 'TowerBattleResult');
  pay(d('goodAndEvilBattleResult', { win: 1, prestige: 999999, contribution: 999999 }), 'goodAndEvilBattleResult');
  pay(d('mulitiNpcBattleResult', { award: 999999 }), 'mulitiNpcBattleResult');
  pay(d('chanllengeTower', { lv: 1, award: 999999 }), 'chanllengeTower');
  assert.strictEqual(snap(), bagBefore, '这些无键结算口不许拿客户端提交的数值发奖');
  assert.strictEqual(srv.loadSave().contribution, 99999, 'contribution 不许被客户端数值改写');
});

T('肉鸽结算只按 npcID 走服务端掉落表（不存在的 npc 不发奖）', () => {
  const snap = () => JSON.stringify(srv.loadSave().bag) + '|' + srv.loadSave().coins;
  const bagBefore = snap();
  pay(d('NewRoguePVPBattleResult', { npcID: 999999999, win: 1 }), 'NewRoguePVPBattleResult');
  pay(d('roguePveBattleResult', { npcID: 999999999, win: 1 }), 'roguePveBattleResult');
  pay(d('rogueBattleResult', { npcID: 999999999, win: 1 }), 'rogueBattleResult');
  assert.strictEqual(snap(), bagBefore, '没有掉落表的 npc 不该发出任何东西');
});

T('rogueBattleResult 只认 npcID（v2.7 新接线）：客户端自报的战果数值绝不进钱包', () => {
  // index.js:105597-105602  var e = { npcID: t.npcID, win: t.data[0] }
  // 奖励源只能是 BZ_NPCDROP[npcID]；掉落是掷骰的，故不断言"一定发"，只断言客户端数字进不去。
  const before = JSON.parse(JSON.stringify(srv.loadSave()));
  const r = pay(d('rogueBattleResult', {
    npcID: 1002, win: 1, award: 999999, exp: 999999, gold: 999999, coins: 999999,
  }), 'rogueBattleResult');
  assert.strictEqual(r.eRet, 1, '应回成功');
  const sv = srv.loadSave();
  assert.ok(!Object.prototype.hasOwnProperty.call(sv.bag || {}, '999999'),
    '999999 不许变成背包物品');
  const coinDelta = (sv.coins || 0) - (before.coins || 0);
  assert.ok(Math.abs(coinDelta) < 100000,
    '单次结算的货币变化不可能达到客户端自称的量级（实得 Δ' + coinDelta + '）');
});

console.log('\n[c03-smoke] 通过 ' + pass + '/' + (pass + fails.length));
if (fails.length) { console.error('失败项:\n' + fails.map((f) => ' - ' + f).join('\n')); process.exit(1); }
console.log('C03 SMOKE PASSED');
