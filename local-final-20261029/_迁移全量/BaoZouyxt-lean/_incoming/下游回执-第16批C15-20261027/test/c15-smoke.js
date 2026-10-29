'use strict';
/** c15-smoke.js —— 第 16 批 C15〔七日回归〕冒烟（走真实 dispatch，档 A）。
 *
 *  覆盖：
 *   ① BZ_C15 表可见（14 天期 / 七日 7 档 / 任务 11 / 活跃度 5 / 付费礼包 3）。
 *   ② 8 个活键在 H 里；4 个不做键（SevenDaysAwards / SPRING 3 键）按档 A 不在。
 *   ③ getReturnSevenDayData：门被开（eRet 1 + sevenDaysArr[1] + triggerTime），s.retAct 落档。
 *   ④ returnSevenDaysAwards：当日领取成功（sevenDaysArr 末位变 2 + rewardArray）；同日重复 → 2 不写档。
 *   ⑤ 时间旅行：+1 天 → 数组长度 2、末位 1（新一天可领）；领第 2 天；+8 天封顶 7 天。
 *   ⑥ 七日全部领完 → 2（claimed）。
 *   ⑦ getReturnTaskData：tasks 11 个诚实 0 状态、liveness 0、livenessDatas []。
 *   ⑧ 领取拒绝：receiveReturnDailyTask / receiveLivenessAward / receiveReturnGiftAward → 2 且不写档。
 *   ⑨ 礼包：giftDatas 3 档纯展示（isBuy 0 / isAward 0 / money 25,68,98）；refresh 回空数组。
 *   ⑩ 拒绝应答收窄：只 eRet。
 *
 *  取证：batch16-facts-20261027\C15-取证与策略.md。
 *  用法：node test/c15-smoke.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CORE = path.join(__dirname, '..', 'core');
['bz-shops.generated.js', 'bz-shapes.generated.js', 'bz-tasks.generated.js', 'bz-c09.generated.js',
  'bz-c10.generated.js', 'bz-c11.generated.js', 'bz-c12.generated.js', 'bz-c13.generated.js',
  'bz-c14.generated.js', 'bz-c15.generated.js'].forEach((f) =>
  vm.runInThisContext(fs.readFileSync(path.join(CORE, f), 'utf8')));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

const C15 = (typeof BZ_C15 !== 'undefined') ? BZ_C15 : null;
const NOW = 1792612412000;
const DAY = 86400000;

function fresh(extra) {
  const clock = { t: NOW };
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
  return { srv, d, pay, clock, save: () => srv.loadSave(), stored: () => [...st.values()][0] };
}

let pass = 0; const fails = [];
function T(n, fn) { try { fn(); pass++; console.log('  ok   ' + n); } catch (e) { fails.push(n + ': ' + e.message); console.log('  FAIL ' + n + ' -> ' + e.message); } }

const LIVE = ['getReturnSevenDayData', 'returnSevenDaysAwards', 'getReturnTaskData', 'receiveReturnDailyTask',
  'receiveLivenessAward', 'getReturnGift', 'refreshReturnGiftAward', 'receiveReturnGiftAward'];
const NOT_DONE = ['SevenDaysAwards', 'getSpringSevenDayData', 'springSevenDaysAwards', 'receiveSpringAccReward'];

T('【⓪】C15 表在产物里可见（14 天 / 7 档 / 11 任务 / 5 活跃度 / 3 礼包）', () => {
  assert.ok(C15, 'BZ_C15 取不到（生成器没接进 test？）');
  assert.strictEqual(C15.durationDays, 14, '回归期应 14 天（const360）');
  assert.strictEqual(Object.keys(C15.sevenDay).length, 7, '七日奖励应 7 档');
  assert.strictEqual(C15.tasks.length, 11, '任务应 11 行');
  assert.strictEqual(C15.awards.length, 5, '活跃度档应 5');
  assert.strictEqual(C15.gifts.length, 3, '付费礼包应 3 档');
});

T('【①】8 个活键在 H 里；4 个不做键按档 A 不在', () => {
  const H = createBzServer({ readSave: () => null, writeSave: () => {}, log: () => {}, now: () => NOW, templates: TPL })._internal.handlers;
  for (const a of LIVE) assert.ok(typeof H[a] === 'function', '缺活 handler: ' + a);
  for (const a of NOT_DONE) assert.ok(typeof H[a] !== 'function', '档 A 不做键不应实现: ' + a);
});

T('【②】getReturnSevenDayData：门开 + 首日可领 + triggerTime 落档', () => {
  const f = fresh();
  const r = f.pay(f.d('getReturnSevenDayData'), 'getReturnSevenDayData');
  assert.strictEqual(r.eRet, 1, '应成功（门）');
  assert.deepStrictEqual(r.sevenDaysArr, [1], '首日应 [1]（可领）');
  assert.strictEqual(r.triggerTime, NOW, 'triggerTime 应为当前时刻');
  assert.strictEqual(f.save().retAct.trigger, NOW, 'trigger 应落档');
});

T('【③】returnSevenDaysAwards：当日领取 + 重复拒绝不写档', () => {
  const f = fresh();
  f.pay(f.d('getReturnSevenDayData'), 'getReturnSevenDayData');
  const raw0 = f.stored();
  const r = f.pay(f.d('returnSevenDaysAwards'), 'returnSevenDaysAwards');
  assert.strictEqual(r.eRet, 1, '应成功');
  assert.deepStrictEqual(r.sevenDaysArr, [2], '领取后应 [2]（已领）');
  assert.ok(r.rewardArray && Object.keys(r.rewardArray).length > 0, '应带回 rewardArray');
  const again = f.pay(f.d('returnSevenDaysAwards'), 'returnSevenDaysAwards');
  assert.strictEqual(again.eRet, 2, '同日重复领应 2');
  assert.deepStrictEqual(Object.keys(again).sort(), ['eRet'], '拒绝应答只许 eRet');
});

T('【④】时间旅行：+1 天新一天可领；+8 天封顶 7', () => {
  const f = fresh();
  f.pay(f.d('getReturnSevenDayData'), 'getReturnSevenDayData');
  f.pay(f.d('returnSevenDaysAwards'), 'returnSevenDaysAwards');
  f.clock.t += DAY;
  const r2 = f.pay(f.d('getReturnSevenDayData'), 'getReturnSevenDayData');
  assert.deepStrictEqual(r2.sevenDaysArr, [2, 1], '+1 天后应 [2,1]（第 2 天可领）');
  const c2 = f.pay(f.d('returnSevenDaysAwards'), 'returnSevenDaysAwards');
  assert.strictEqual(c2.eRet, 1, '第 2 天应可领');
  assert.deepStrictEqual(c2.sevenDaysArr, [2, 2], '第 2 天领取后 [2,2]');
  f.clock.t += 8 * DAY;
  const r3 = f.pay(f.d('getReturnSevenDayData'), 'getReturnSevenDayData');
  assert.strictEqual(r3.sevenDaysArr.length, 7, '天数应封顶 7');
  assert.strictEqual(r3.sevenDaysArr[6], 1, '第 7 天应可领');
});

T('【⑤】七日全部领完 → 2（claimed）', () => {
  const f = fresh();
  f.pay(f.d('getReturnSevenDayData'), 'getReturnSevenDayData');
  for (let d = 0; d < 7; d++) {
    const r = f.pay(f.d('returnSevenDaysAwards'), 'returnSevenDaysAwards');
    assert.strictEqual(r.eRet, 1, '第 ' + (d + 1) + ' 天应可领');
    f.clock.t += DAY;
  }
  const r = f.pay(f.d('returnSevenDaysAwards'), 'returnSevenDaysAwards');
  assert.strictEqual(r.eRet, 2, '领完后应 2');
  assert.strictEqual(f.save().retAct.claimed[7], 1, '第 7 天应在 claimed 里');
});

T('【⑥】getReturnTaskData：11 任务诚实 0 状态 + liveness 0', () => {
  const f = fresh();
  const r = f.pay(f.d('getReturnTaskData'), 'getReturnTaskData');
  assert.strictEqual(r.eRet, 1, '应成功');
  assert.strictEqual(r.oldReturnData.tasks.length, 11, '任务应 11 个');
  assert.deepStrictEqual(r.oldReturnData.tasks[0], [1, 0, 0], '任务元素应 [id,0,0]');
  assert.strictEqual(r.oldReturnData.liveness, 0, 'liveness 应 0');
  assert.deepStrictEqual(r.oldReturnData.livenessDatas, [], 'livenessDatas 应空');
  assert.strictEqual(typeof r.triggerTime, 'number', 'triggerTime 应为数字');
});

T('【⑦】领取拒绝：任务 / 活跃度 / 礼包 → 2 且不写档', () => {
  const f = fresh();
  const raw0 = f.stored();
  assert.strictEqual(f.pay(f.d('receiveReturnDailyTask', { id: 1 }), 'receiveReturnDailyTask').eRet, 2, '任务领取应 2');
  assert.strictEqual(f.pay(f.d('receiveLivenessAward', { id: 1 }), 'receiveLivenessAward').eRet, 2, '活跃度领取应 2');
  assert.strictEqual(f.pay(f.d('receiveReturnGiftAward', { giftId: 1 }), 'receiveReturnGiftAward').eRet, 2, '礼包领取应 2');
  assert.strictEqual(f.stored(), raw0, '拒绝不许写档');
});

T('【⑧】礼包纯展示：3 档 isBuy 0 / isAward 0；refresh 空数组', () => {
  const f = fresh();
  const r = f.pay(f.d('getReturnGift'), 'getReturnGift');
  assert.strictEqual(r.eRet, 1, '应成功');
  assert.strictEqual(r.giftDatas.length, 3, '应 3 档');
  assert.strictEqual(r.giftDatas[0].isBuy, 0, 'isBuy 应 0（按钮禁用）');
  assert.strictEqual(r.giftDatas[0].isAward, 0, 'isAward 应 0（不自动领）');
  assert.deepStrictEqual(r.giftDatas.map((g) => g.money), [25, 68, 98], 'money 应照表 25/68/98');
  const rf = f.pay(f.d('refreshReturnGiftAward'), 'refreshReturnGiftAward');
  assert.strictEqual(rf.eRet, 1, '应成功');
  assert.deepStrictEqual(rf.giftAwards, [], 'giftAwards 应空数组');
});

T('【⑨】拒绝应答收窄：只 eRet', () => {
  const f = fresh();
  const r = f.pay(f.d('receiveReturnGiftAward', { giftId: 2 }), 'receiveReturnGiftAward');
  assert.deepStrictEqual(Object.keys(r).sort(), ['eRet'], '礼包领取拒绝只许 eRet');
});

console.log('');
if (fails.length) { console.log('c15-smoke: FAIL ' + fails.length + ' 条'); fails.forEach((x) => console.log('  - ' + x)); process.exit(1); }
console.log('c15-smoke: 全部通过（' + pass + ' 条）');
