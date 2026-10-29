'use strict';
/** 第 5 批 C16〔成就〕：5 个新 handler 的冒烟。
 *
 *  覆盖三类事故形态：
 *   ① §5.1「注册名 ≠ 线上名」：照注册名注册 = 静默落进 UNKNOWN/通用 ACK（eRet 1），
 *      那样**任何 id 都能领**。这里断言 H 里没有注册名、有线上名。
 *   ② **白拿闸门**：achieve_list 2113 条里有 **421 条带实物奖励**，加上 53 档积分奖、240 套奖，
 *      一次能白领 714 份。闸门只认 `s.achieve.pending`（v2.7.1 起由服务端重算可判条件填充，
 *      登录天数这类锁死条件永远进不来）。
 *      这里用**真的有奖励的** id（354 → 4003×10000）去撞，必须被拒且不发钱。
 *   ③ 拒绝路径不许动存档（连 `s.achieve` 槽位都不许建出来）。
 *
 *  ⚠ 存档预热：`ensureLedger` 首次 touch 会规范化一批字段（contribution/schoolContribution/
 *    passCardLevel/bloodArr…）。不先预热，第一次 dispatch 的规范化会被误判成"handler 改了档"
 *    —— c02-smoke 和 c16 都踩过同一个坑。
 *
 *  用法：node test/c16-smoke.js
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

function fresh() {
  const st = new Map();
  st.set(SAVE_KEY, JSON.stringify({
    roleID: 16374, name: 'FZhou', saveVersion: 4,
    accepted: [], done: [], rewarded: [], skills: {},
    baseValueAy: [], bag: {}, playerEquip: {}, equipments: {},
    potential: 100, coins: 1000, gold: 1000, yuanbao: 500,
    bloodArr: [], fosterArr: [], contribution: 0, school: 1,
    schoolContribution: {}, hunger: 50, mounts: {}, mountShow: 0,
    marketBuyTimes: {}, passCardLevel: 0, passLiveness: 0, passAward: {},
    growthClaim: {}, growthBigPaid: 0,
  }));
  const srv = createBzServer({
    readSave: (k) => (st.has(k) ? st.get(k) : null),
    writeSave: (k, t) => st.set(k, t),
    log: () => {}, now: () => 1792612412000, templates: TPL,
  });
  const d = (a, p) => srv.dispatch('User', a, p || {});
  const pay = (r, a) => r['User.' + a];
  // 预热：让 ensureLedger 先规范化一次，后续快照才稳定
  srv.loadSave();
  pay(d('getAchieveData', {}), 'getAchieveData');
  return { srv, d, pay, save: () => srv.loadSave(), snap: () => JSON.stringify(srv.loadSave()) };
}

let pass = 0; const fails = [];
function T(n, fn) { try { fn(); pass++; console.log('  ok   ' + n); } catch (e) { fails.push(n + ': ' + e.message); console.log('  FAIL ' + n + ' -> ' + e.message); } }

/** 线上名 ↔ 注册名（本批 5 个新写的；getAchieveData 已有，不在本文件范围） */
const SHIPPED = [
  ['getAchieveMark', 'GET_ACHIEVE_MARK'],
  ['receiveAchieveReward', 'RECEIVE_ACHIEVE_REWARD'],
  ['receiveAchieveRateReward', 'RECEIVE_ACHIEVE_RATE_REWARD'],
  ['receiveAchieveSuitReward', 'RECEIVE_ACHIEVE_SUIT_REWARD'],
  ['receiveAchievementReward', 'RECEIVE_ACHIEVEMENT_REWARD'],
];

// ---------- ① 注册名 vs 线上名 ----------
T('【§5.1 原故障重现】5 个线上名都在 H 里，且注册名都不在（照注册名写 = 任何 id 都能领）', () => {
  const f = fresh();
  const H = f.srv._internal.handlers;
  const wrong = [];
  for (const [wire, reg] of SHIPPED) {
    if (typeof H[wire] !== 'function') wrong.push('缺线上名 ' + wire);
    if (Object.prototype.hasOwnProperty.call(H, reg)) wrong.push('误把注册名当键 ' + reg);
  }
  assert.deepStrictEqual(wrong, [], wrong.join(' | '));
});

// ---------- ② 生成表健全性 ----------
T('五张成就表都生成了，行数与 dump 对得上', () => {
  assert.strictEqual(BZ_ACHIEVE_META.__meta.rows, 2113, 'achieve_list 应有 2113 行');
  assert.strictEqual(BZ_ACHIEVE_RW.__meta.withReward, 421, '有实物奖励的应有 421 条');
  assert.strictEqual(BZ_ACHIEVE_RATE.__meta.rows, 53);
  assert.strictEqual(BZ_ACHIEVE_SUIT.__meta.rows, 240);
  assert.strictEqual(BZ_ACHIEVE_MARK.__meta.rows, 182);
  // 抽查：achieve_list 第 1 行 group=3 point=1；achieve_rate 第 1 行 group=6 points=1 item=4253,10
  assert.deepStrictEqual(BZ_ACHIEVE_META['1'], [3, 1]);
  assert.strictEqual(BZ_ACHIEVE_RATE['1'].g, 6);
  assert.strictEqual(BZ_ACHIEVE_RATE['1'].p, 1);
  assert.deepStrictEqual(BZ_ACHIEVE_RATE['1'].r, [[4253, 10]]);
});

T('achieve_suit 的 "档位|奖励&档位|奖励" 解析正确（抽样逐值核对）', () => {
  // dump 原文：3|6253,2&6|3325,1|6658,10&9|1,100&12|3325,1|6658,20
  const s = BZ_ACHIEVE_SUIT['1'];
  assert.deepStrictEqual(s.t['3'], [[6253, 2]]);
  assert.deepStrictEqual(s.t['6'], [[3325, 1], [6658, 10]]);
  assert.deepStrictEqual(s.t['9'], [[1, 100]]);
  assert.deepStrictEqual(s.t['12'], [[3325, 1], [6658, 20]]);
});

// ---------- ③ 白拿闸门（核心） ----------
T('【白拿】带 4003×10000 奖励的成就（354）领不到，一分钱不发', () => {
  const f = fresh();
  assert.deepStrictEqual(BZ_ACHIEVE_RW['354'], [[4003, 10000]], '前提：354 确实带奖励');
  const p0 = f.save().potential;
  const before = f.snap();
  const r = f.pay(f.d('receiveAchieveReward', { achieveId: 354 }), 'receiveAchieveReward');
  assert.strictEqual(r.eRet, 4, '没有进度模型 → 必须拒绝，实得 ' + r.eRet);
  assert.strictEqual(f.save().potential, p0, '潜能一个子儿都不许发');
  assert.strictEqual(f.snap(), before, '拒绝路径必须逐字节不动');
  // v2.7.1：getAchieveData 预热时就会建出 s.achieve（进度模型要写账），
  // 所以这里不再断言"槽位不存在"，改断言"重算没把 354 放进 pending"（354=登录天数，锁死类）。
  assert.deepStrictEqual(f.save().achieve.pending, [], '354（登录天数类）不许出现在 pending');
});

T('积分档位奖也领不到（组积分恒 0）', () => {
  const f = fresh();
  const before = f.snap();
  for (const rid of [1, 2, 3]) {
    assert.strictEqual(f.pay(f.d('receiveAchieveRateReward', { rateId: rid }), 'receiveAchieveRateReward').eRet, 4);
  }
  assert.strictEqual(f.snap(), before, '拒绝路径必须逐字节不动');
});

T('套装奖也领不到（所需成就 received 恒空）', () => {
  const f = fresh();
  const before = f.snap();
  for (const sid of [1, 2, 3]) {
    assert.strictEqual(f.pay(f.d('receiveAchieveSuitReward', { suitId: sid, index: 3 }), 'receiveAchieveSuitReward').eRet, 4);
  }
  assert.strictEqual(f.snap(), before, '拒绝路径必须逐字节不动');
});

T('技巧成就奖也领不到', () => {
  const f = fresh();
  const before = f.snap();
  assert.strictEqual(f.pay(f.d('receiveAchievementReward', { skillId: 123 }), 'receiveAchievementReward').eRet, 4);
  assert.strictEqual(f.snap(), before);
});

T('乱造 id（不在表里）同样被拒，且不动档', () => {
  const f = fresh();
  const before = f.snap();
  for (const bad of [999999, -1, 0, 2147483647]) {
    assert.strictEqual(f.pay(f.d('receiveAchieveReward', { achieveId: bad }), 'receiveAchieveReward').eRet, 4);
  }
  assert.strictEqual(f.snap(), before);
});

// ---------- ④ getAchieveMark ----------
T('getAchieveMark 回 eRet:1 且不动档（纯查询）', () => {
  const f = fresh();
  const before = f.snap();
  const r = f.pay(f.d('getAchieveMark', { markId: 1 }), 'getAchieveMark');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(f.snap(), before);
});

T('getAchieveData 仍能开面板（本批没动它，防止连带回归）', () => {
  const f = fresh();
  const r = f.pay(f.d('getAchieveData', {}), 'getAchieveData');
  assert.strictEqual(r.eRet, 1);
  assert.ok(r.groupPoints && typeof r.groupPoints === 'object', 'groupPoints 必须是对象');
  assert.ok(Array.isArray(r.achieveIdArr), 'achieveIdArr 必须是数组');
  assert.ok(Array.isArray(r.rateIds), 'rateIds 必须是数组');
});

console.log('\n[c16-smoke] 通过 ' + pass + '/' + (pass + fails.length));
if (fails.length) { console.error('失败项:\n' + fails.map((f) => ' - ' + f).join('\n')); process.exit(1); }
console.log('C16 SMOKE PASSED');
