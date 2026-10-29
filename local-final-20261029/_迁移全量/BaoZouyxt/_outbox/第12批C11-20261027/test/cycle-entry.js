'use strict';
/**
 * cycle-entry.js —— 转世入口回归（2026-10-22 转世批次）
 *
 * 为什么"不做转世"是正确实现：转世是**服务端权威的整套重置**——cycleLife 成功后客户端
 * `killRoleClear()` + `reqLoadGameServer()` 整档重放（index.js:101885-101908），新一世的
 * 等级/技能/先天全由服务端决定；而重置规则不在客户端源码里（请求只带
 * isReserved/branchId/originId/skillArr/skillID/attArr=[hpLimit,mpLimit]，101963-101969）。
 * 因此离线只做"诚实入口"：不打开 rollUI、不触发重放、不伪造新一世。
 *
 * 断言：
 *   T1 isCycleLife → eRet 2（消费端走"条件不足"提示，101932）
 *   T2 cycleLife → eRet 9（消费端走提示 101912），且不写档
 *   T3 specialCycleLife → eRet 9（**R05 Q3 更正**：原来回 4，而客户端 CYCLE_LIFE 回调
 *      只有 1/6/7/9 四个分支，2 和 4 静默丢弃 → 玩家点了没反应。见 index.js:101885-101913）
 *   T4 storyExperience → eRet 1 且 branchId 原样回显（consumer 只写 RoleBaseInfo.storyId，纯本地）
 *   T5 四个入口都不写档
 *   T6 拒绝码必须是客户端**有提示分支**的那几个（R05 Q3 第 4/5 步：不许落进静默丢弃、不许写档）
 *
 * 跑法：node test/cycle-entry.js   退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

T('T1 isCycleLife → eRet 2', () => {
  const s = createBzServer(makeEnv().env);
  const i = inner(s.dispatch('User', 'isCycleLife', {}), 'isCycleLife');
  assert.strictEqual(i.eRet, 2, '转世入口必须明确"不可用"，不能返回 1 打开 rollUI');
});

T('T2 cycleLife → eRet 9 且不写档', () => {
  const { store, env } = makeEnv();
  const s = createBzServer(env);
  const i = inner(s.dispatch('User', 'cycleLife', { isReserved: 0, branchId: 1, originId: 1, skillArr: [], skillID: 0, attArr: [100, 100] }), 'cycleLife');
  assert.strictEqual(i.eRet, 9, '必须拒绝（否则客户端会 killRoleClear + 重放一个没变的档）');
  assert.strictEqual(store.get(SAVE_KEY), undefined, '转世入口不许写档');
});

T('T3 specialCycleLife → eRet 9（不许用 4：客户端没有 4 的分支）', () => {
  const s = createBzServer(makeEnv().env);
  const i = inner(s.dispatch('User', 'specialCycleLife', { originId: 1 }), 'specialCycleLife');
  assert.strictEqual(i.eRet, 9, 'CYCLE_LIFE 回调只处理 1/6/7/9（index.js:101885-101913），4 会静默丢弃');
});

T('T4 storyExperience → eRet 1 且 branchId 回显', () => {
  const s = createBzServer(makeEnv().env);
  for (const bid of [1, 2, 7]) {
    const i = inner(s.dispatch('User', 'storyExperience', { branchId: bid }), 'storyExperience');
    assert.strictEqual(i.eRet, 1);
    assert.strictEqual(i.branchId, bid, 'branchId 必须原样回显（消费端写 storyId）');
  }
});

T('T5 四个入口都不写档', () => {
  const { store, env } = makeEnv();
  const s = createBzServer(env);
  s.dispatch('User', 'isCycleLife', {});
  s.dispatch('User', 'cycleLife', {});
  s.dispatch('User', 'specialCycleLife', {});
  s.dispatch('User', 'storyExperience', { branchId: 1 });
  assert.strictEqual(store.get(SAVE_KEY), undefined, '这些入口都是只读的');
});

T('T6 拒绝码必须落在客户端「有提示」的分支里，且不写档（R05 Q3 第 4/5 步）', () => {
  // CYCLE_LIFE 回调：1=成功 6/7/9=提示；2/4=静默丢弃。
  // IS_CYCLE_LIFE 回调：1=打开 rollUI，2/3=提示；其余静默。
  const { store, env } = makeEnv();
  const s = createBzServer(env);
  const isC = inner(s.dispatch('User', 'isCycleLife', {}), 'isCycleLife');
  const cyc = inner(s.dispatch('User', 'cycleLife', {}), 'cycleLife');
  const spc = inner(s.dispatch('User', 'specialCycleLife', {}), 'specialCycleLife');
  assert.ok([2, 3].indexOf(isC.eRet) >= 0, 'isCycleLife 必须是 2/3（有提示），实际 ' + isC.eRet);
  assert.ok([6, 7, 9].indexOf(cyc.eRet) >= 0, 'cycleLife 必须是 6/7/9（有提示），实际 ' + cyc.eRet);
  assert.ok([6, 7, 9].indexOf(spc.eRet) >= 0, 'specialCycleLife 必须是 6/7/9（有提示），实际 ' + spc.eRet);
  assert.strictEqual(store.get(SAVE_KEY), undefined, '拒绝分支一个字节都不许写（服务端断言）');
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[cycle] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
