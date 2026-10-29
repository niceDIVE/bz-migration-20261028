'use strict';
/**
 * achieve-data.js —— 成就面板数据回归（2026-10-22 成就批次；v2.7.1 起接真实进度模型）
 *
 * 契约来源（已回源码核对）：
 *   scripts3.js:2899-2918 GET_ACHIEVE_DATA 监听：1==eRet 时读
 *     groupPoints / rateIds / achieveIdArr / rd / taskData / srd，然后无条件加载 AFrontUI 并 setData(o)。
 *   AFrontUI 无自有 setData（基类 index.js:139706-139709 只存 this.data）；
 *   成就列表由客户端用配置表（achieve_group 19 / achieve_list 2113）渲染。
 *   v2.7.1 拍板 3：服务端在 getAchieveData 里重算「可从存档直判」的条件
 *     （收集/任务数/经验/技能等级），写 pending + taskData 并落盘；其余条件锁死。
 *
 * 断言：
 *   T1 eRet=1 且六件套齐全（groupPoints/rateIds/achieveIdArr/rd/taskData/srd）
 *   T2 类型契约：groupPoints/taskData/srd 是对象，rateIds/achieveIdArr/rd 是数组
 *   T3 空存档 → pending/rd/rateIds 空；taskData 有进度键（1_3 / 6_1,0 / 6_2,0 = 0）；各组点数 0
 *   T4 账本既有状态（组点数/积分档/received/套装账）保留；pending 与 taskData 由重算给出
 *   T5 重算结果落盘，且第二次调用幂等（不产生新写盘差异）
 *   T6 白拿回归：持有收集品 2601 → 成就 137（require "0|2601"）进 pending；没持有就不进
 *
 * 跑法：node test/achieve-data.js   退出码 0 = 全绿
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

function makeEnv() {
  const store = new Map();
  return {
    store,
    env: {
      readSave: (k) => (store.has(k) ? store.get(k) : null),
      writeSave: (k, t) => store.set(k, t),
      log: () => {},
      now: () => 1792612412000,
      templates: TPL,
    },
  };
}
const inner = (r, k) => r['User.' + k] || {};
const SAVE_KEY = 'bz_server_save_v2';

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 eRet=1 且六件套齐全', () => {
  const { env } = makeEnv();
  const s = createBzServer(env);
  const i = inner(s.dispatch('User', 'getAchieveData', {}), 'getAchieveData');
  assert.strictEqual(i.eRet, 1);
  for (const f of ['groupPoints', 'rateIds', 'achieveIdArr', 'rd', 'taskData', 'srd']) {
    assert.ok(Object.prototype.hasOwnProperty.call(i, f), '缺字段 ' + f);
  }
});

T('T2 类型契约', () => {
  const { env } = makeEnv();
  const s = createBzServer(env);
  const i = inner(s.dispatch('User', 'getAchieveData', {}), 'getAchieveData');
  assert.strictEqual(typeof i.groupPoints, 'object');
  assert.ok(!Array.isArray(i.groupPoints));
  assert.ok(Array.isArray(i.rateIds));
  assert.ok(Array.isArray(i.achieveIdArr));
  assert.ok(Array.isArray(i.rd));
  assert.strictEqual(typeof i.taskData, 'object');
  assert.strictEqual(typeof i.srd, 'object');
});

T('T3 空存档 → pending/rd/rateIds 空，taskData 有进度键，各组点数 0', () => {
  const { env } = makeEnv();
  const s = createBzServer(env);
  const i = inner(s.dispatch('User', 'getAchieveData', {}), 'getAchieveData');
  const gids = Object.keys(i.groupPoints || {}).map(Number).sort((a, b) => a - b);
  assert.deepStrictEqual(gids, (BZ_ACHIEVE_GROUPS || []).slice().sort((a, b) => a - b), 'groupPoints 必须含全部组 id（否则面板零条目）');
  assert.ok(gids.every((k) => i.groupPoints[k] === 0), '空账本时各组点数 0');
  assert.deepStrictEqual(i.rateIds, []);
  assert.deepStrictEqual(i.achieveIdArr, [], '空存档不该有可领成就');
  assert.deepStrictEqual(i.rd, []);
  assert.strictEqual(i.taskData['1_3'], 0, '经验进度键（c 键）必须有');
  assert.strictEqual(i.taskData['6_1,0'], 0, '告示牌任务数进度键必须有');
  assert.strictEqual(i.taskData['6_2,0'], 0, '环任务数进度键必须有');
  assert.deepStrictEqual(i.srd, {});
});

T('T4 账本既有状态保留（组点数/积分档/received/套装账）；pending 与 taskData 由重算给出', () => {
  const { env } = makeEnv();
  const s = createBzServer(env);
  s.loadSave().achieve = { groupPoints: { 1: 120 }, rateIds: [1], pending: [301], received: [302], taskData: { 301: 5 }, suitIds: { 1: [302] } };
  const i = inner(s.dispatch('User', 'getAchieveData', {}), 'getAchieveData');
  assert.strictEqual(i.groupPoints[1], 120, '账本里的组点数不许被覆盖');
  assert.ok(Object.keys(i.groupPoints).length >= (BZ_ACHIEVE_GROUPS || []).length, '缺的组必须补 0');
  assert.deepStrictEqual(i.rateIds, [1]);
  assert.deepStrictEqual(i.rd, [302], '已领记录必须保留（重算只写 pending/taskData）');
  assert.deepStrictEqual(i.srd, { 1: [302] });
  // pending 重算：301（require "0|27012"，空背包）不该再在；302 在 received 里也不回 pending
  assert.ok(!i.achieveIdArr.includes(301), '301 条件不成立（没持有 27012），不许因为旧账残留在 pending');
  assert.strictEqual(i.taskData['1_3'], 0, 'taskData 由重算刷新（旧键 301 被替换）');
});

T('T5 重算结果落盘，且成就账本幂等', () => {
  const { store, env } = makeEnv();
  const s = createBzServer(env);
  s.dispatch('User', 'getAchieveData', {});
  const after1 = JSON.parse(store.get(SAVE_KEY));
  assert.ok(after1.achieve, 'v2.7.1 起重算结果必须落盘（进度模型要真写账）');
  s.dispatch('User', 'getAchieveData', {});
  const after2 = JSON.parse(store.get(SAVE_KEY));
  assert.deepStrictEqual(after2.achieve, after1.achieve, '第二次重算不许改成就账本（幂等）');
  assert.strictEqual(after2.meta.actionStats.getAchieveData, after1.meta.actionStats.getAchieveData + 1,
    '调用统计照常累计（与成就账本无关）');
});

T('T6 白拿回归：持有收集品才进 pending（137 = require "0|2601"）', () => {
  const { env } = makeEnv();
  const s = createBzServer(env);
  const r0 = inner(s.dispatch('User', 'getAchieveData', {}), 'getAchieveData');
  assert.ok(!r0.achieveIdArr.includes(137), '没持有 2601 → 137 不许进 pending');
  s.loadSave().bag = { 2601: 1 };
  const r1 = inner(s.dispatch('User', 'getAchieveData', {}), 'getAchieveData');
  assert.ok(r1.achieveIdArr.includes(137), '持有 2601 → 137 必须进 pending（重算生效）');
  assert.strictEqual(r1.taskData['3_2_0|2601'], 1, '逐条进度（p 键）= 持有数');
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[achieve] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
