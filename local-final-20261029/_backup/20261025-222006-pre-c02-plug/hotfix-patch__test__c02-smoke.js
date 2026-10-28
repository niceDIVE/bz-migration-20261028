'use strict';
/** 第 3 批 C02〔任务主线〕16 个新 handler 功能冒烟。
 *  重点：任务奖励**绝不允许重复领**（重复领 = 白拿钱），以及 quickFinishTask 绝不免费完成。
 *  用法：node test/c02-smoke.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-shops.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

const SAVE_KEY = createBzServer({
  readSave: () => null, writeSave: () => {}, log: () => {}, now: () => 1792612412000, templates: TPL,
})._internal.SAVE_KEY;

function baseSave(over) {
  return Object.assign({
    roleID: 16374, name: 'FZhou', saveVersion: 4,
    accepted: [], done: [], rewarded: [], skills: {},
    baseValueAy: [], bag: {}, playerEquip: {}, equipments: {},
    potential: 102499, coins: 1000, gold: 1000, yuanbao: 100,
    bloodArr: [], fosterArr: [], contribution: 99999, school: 1,
    schoolContribution: {}, hunger: 50, mounts: {}, mountShow: 0,
    marketBuyTimes: {}, passCardLevel: 0, passLiveness: 0, passAward: {},
    growthClaim: {}, growthBigPaid: 0,
  }, over || {});
}
const store = new Map();
store.set(SAVE_KEY, JSON.stringify(baseSave()));
const logs = [];
const env = {
  readSave: (k) => (store.has(k) ? store.get(k) : null),
  writeSave: (k, t) => store.set(k, t),
  log: (m) => logs.push(m),
  now: () => 1792612412000,
  templates: TPL,
};
const s = createBzServer(env);
const d = (a, p) => s.dispatch('User', a, p || {});
const pay = (r, a) => r['User.' + a];

let pass = 0; const fails = [];
function T(n, fn) { try { fn(); pass++; console.log('  ok   ' + n); } catch (e) { fails.push(n + ': ' + e.message); console.log('  FAIL ' + n + ' -> ' + e.message); } }

/* 找若干个真有奖励的任务 id（BZ_TASKS 里 r 非空）。
 * ⚠ 不要用"手动清空 accepted/done"来隔离用例 —— guardSave 禁止 done 数量减少，
 *    persist() 会回滚内存，于是看起来像 handler 失效（第一版本测试就是这么误报的）。
 *    正确做法：每个用例用不同的任务 id。 */
const IDS = (function () {
  const out = [];
  for (const k of Object.keys(BZ_TASKS)) {
    if (k === '__meta') continue;
    const rw = BZ_TASKS[k].r;
    if (rw && Object.keys(rw).length) out.push(parseInt(k, 10));
    if (out.length >= 8) break;
  }
  return out;
})();
const TID = IDS[0];
console.log('  任务 ids = ' + IDS.join(',') + '  首个奖励 ' + JSON.stringify(BZ_TASKS[String(TID)] && BZ_TASKS[String(TID)].r));
assert.ok(IDS.length >= 6, '需要至少 6 个有奖励的任务 id 才能跑完用例');

// ---------- 只读/低风险 ----------
T('getCircleTaskList 回 cNum + taskArr(数组)', () => {
  const r = pay(d('getCircleTaskList', {}), 'getCircleTaskList');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(typeof r.cNum, 'number');
  assert.ok(Array.isArray(r.taskArr), 'taskArr 必须是数组，实得 ' + typeof r.taskArr);
});

T('getSchoolTask 字段齐全且 schoolTask 是数组（客户端不判 eRet）', () => {
  const r = pay(d('getSchoolTask', { schoolId: 1 }), 'getSchoolTask');
  assert.ok(Array.isArray(r.schoolTask), 'schoolTask 必须是数组（{} 会在 .length 处得 undefined）');
  assert.strictEqual(typeof r.weekQuickCompleteTaskTimes, 'number');
  assert.strictEqual(typeof r.affiliationSchool, 'number');
  assert.strictEqual(typeof r.xyTodaySchoolId, 'number');
  assert.ok(r.currentServerTime > 0);
});

T('hideTask 记 hTaskArr', () => {
  const r = pay(d('hideTask', { type: 1, tIDArr: [111, 222] }), 'hideTask');
  assert.strictEqual(r.eRet, 1);
  assert.deepStrictEqual(s.loadSave().hTaskArr, [111, 222]);
});

T('refreshSchoolTask / schoolTaskAward 只回 eRet:1 且不发奖', () => {
  const bagBefore = JSON.stringify(s.loadSave().bag);
  assert.strictEqual(pay(d('refreshSchoolTask', { schoolId: 1 }), 'refreshSchoolTask').eRet, 1);
  assert.strictEqual(pay(d('schoolTaskAward', { schoolId: 1, index: 0 }), 'schoolTaskAward').eRet, 1);
  assert.strictEqual(JSON.stringify(s.loadSave().bag), bagBefore, '这两个动作不许发任何东西');
});

// ---------- 防白拿：quickFinishTask ----------
T('quickFinishTask 未接过的任务 -> eRet:2 且不动档', () => {
  const snap = JSON.stringify(s.loadSave());
  const r = pay(d('quickFinishTask', { taskID: IDS[4] }), 'quickFinishTask');
  assert.strictEqual(r.eRet, 2, '没接过不许买，回 2');
  assert.strictEqual(JSON.stringify(s.loadSave()), snap, '不许动档');
});

T('quickFinishTask 元宝够 -> 扣 50 元宝、发奖、移入 done', () => {
  const id = IDS[4];
  assert.strictEqual(pay(d('acceptCircleTask', { taskID: id, flag: 0 }), 'acceptCircleTask').eRet, 1);
  const y0 = s.loadSave().yuanbao;
  const bag0 = JSON.parse(JSON.stringify(s.loadSave().bag));
  const r = pay(d('quickFinishTask', { taskID: id }), 'quickFinishTask');
  assert.strictEqual(r.eRet, 1, '元宝够就该付费完成');
  assert.strictEqual(s.loadSave().yuanbao, y0 - 50, '必须扣 50 元宝');
  assert.ok(s.loadSave().done.indexOf(id) >= 0, '任务应移入 done');
  assert.ok(s.loadSave().accepted.indexOf(id) < 0, '应从 accepted 移除');
  const bag1 = s.loadSave().bag;
  const gained = Object.keys(bag1).filter((k) => (bag1[k] || 0) > (bag0[k] || 0));
  assert.ok(gained.length > 0, '应真发任务奖励');
});

T('quickFinishTask 元宝不足 -> eRet:2 且不动档', () => {
  const id = IDS[2];
  const st = s.loadSave();
  st.yuanbao = 0;
  assert.strictEqual(pay(d('acceptCircleTask', { taskID: id, flag: 0 }), 'acceptCircleTask').eRet, 1);
  const snap = JSON.stringify(s.loadSave());
  const r = pay(d('quickFinishTask', { taskID: id }), 'quickFinishTask');
  assert.strictEqual(r.eRet, 2, '元宝不足 -> 2 -> openChargeList');
  assert.strictEqual(JSON.stringify(s.loadSave()), snap, '元宝不足不许动档');
});

// ---------- 防重复领奖（核心） ----------
T('未接过的任务领奖 -> eRet:4 且不发奖', () => {
  const bagBefore = JSON.stringify(s.loadSave().bag);
  const r = pay(d('circleTaskAward', { taskID: IDS[5] }), 'circleTaskAward');
  assert.strictEqual(r.eRet, 4);
  assert.strictEqual(JSON.stringify(s.loadSave().bag), bagBefore, '没接过就不许发奖');
});

T('接任务 -> 领奖发一次 -> 再领必须被拒（不重复发）', () => {
  const id = IDS[0];
  const a = pay(d('acceptCircleTask', { taskID: id, flag: 0 }), 'acceptCircleTask');
  assert.strictEqual(a.eRet, 1);
  assert.ok(s.loadSave().accepted.indexOf(id) >= 0, '应进 accepted');

  const bag1 = JSON.parse(JSON.stringify(s.loadSave().bag));
  const r1 = pay(d('circleTaskAward', { taskID: id }), 'circleTaskAward');
  assert.strictEqual(r1.eRet, 1, '第一次应成功');
  const bag2 = s.loadSave().bag;
  const gained = Object.keys(bag2).filter((k) => (bag2[k] || 0) > (bag1[k] || 0));
  assert.ok(gained.length > 0 || Object.keys(r1.rewardObj || {}).length > 0, '第一次应真发奖');
  assert.ok(s.loadSave().done.indexOf(id) >= 0, '应移入 done');
  assert.ok(s.loadSave().accepted.indexOf(id) < 0, '应从 accepted 移除');

  const snap = JSON.stringify(s.loadSave());
  const r2 = pay(d('circleTaskAward', { taskID: id }), 'circleTaskAward');
  assert.strictEqual(r2.eRet, 4, '第二次必须被拒（防重复领＝防白拿）');
  assert.strictEqual(JSON.stringify(s.loadSave()), snap, '第二次一个字节都不许动');
});

T('肉鸽：接任务 -> 领奖 -> 再领被拒', () => {
  const id = IDS[1];
  assert.strictEqual(pay(d('rogueAcceptTask', { taskID: id, delOrder: 0 }), 'rogueAcceptTask').eRet, 1);
  assert.ok(s.loadSave().accepted.indexOf(id) >= 0, 'rogueAcceptTask 应入 accepted');
  assert.strictEqual(pay(d('getRogueFinishTaskAward', { taskID: id }), 'getRogueFinishTaskAward').eRet, 1);
  const snap = JSON.stringify(s.loadSave());
  assert.strictEqual(pay(d('getRogueFinishTaskAward', { taskID: id }), 'getRogueFinishTaskAward').eRet, 4);
  assert.strictEqual(JSON.stringify(s.loadSave()), snap, '重复领不许动档');
});

T('getCircleTaskAward 同样防重复领', () => {
  const id = IDS[3];
  assert.strictEqual(pay(d('acceptCircleTask', { taskID: id, flag: 0 }), 'acceptCircleTask').eRet, 1);
  assert.strictEqual(pay(d('getCircleTaskAward', { taskID: id }), 'getCircleTaskAward').eRet, 1);
  const snap = JSON.stringify(s.loadSave());
  assert.strictEqual(pay(d('getCircleTaskAward', { taskID: id }), 'getCircleTaskAward').eRet, 4);
  assert.strictEqual(JSON.stringify(s.loadSave()), snap);
});

T('acceptCircleTask 非法 taskID -> eRet:6 不动档', () => {
  const snap = JSON.stringify(s.loadSave());
  assert.strictEqual(pay(d('acceptCircleTask', { taskID: 0 }), 'acceptCircleTask').eRet, 6);
  assert.strictEqual(JSON.stringify(s.loadSave()), snap);
});

T('没有非 1 的 eRet 泄漏进成功分支（eRet 必须是数字）', () => {
  for (const a of ['getCircleTaskList', 'getSchoolTask', 'delegateTask', 'changeDelegateTask', 'acceptSchoolTask', 'onekeyCompleteSchoolTask', 'schoolTaskComplete']) {
    const r = pay(d(a, { schoolId: 1, index: 0, taskID: TID }), a);
    assert.strictEqual(typeof r.eRet, 'number', a + ' 的 eRet 必须是数字');
  }
});

console.log('\n[c02-smoke] 通过 ' + pass + '/' + (pass + fails.length));
if (fails.length) { console.error('失败项:\n' + fails.map((f) => ' - ' + f).join('\n')); process.exit(1); }
console.log('C02 SMOKE PASSED');
