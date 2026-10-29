'use strict';
/**
 * achieve-data.js —— 成就面板数据回归（2026-10-22 成就批次）
 *
 * 契约来源（已回源码核对）：
 *   scripts3.js:2899-2918 GET_ACHIEVE_DATA 监听：1==eRet 时读
 *     groupPoints / rateIds / achieveIdArr / rd / taskData / srd，然后无条件加载 AFrontUI 并 setData(o)。
 *   AFrontUI 无自有 setData（基类 index.js:139706-139709 只存 this.data）；
 *   成就列表由客户端用配置表（achieve_group 19 / achieve_list 2113）渲染
 *   → 服务端给"合法空态"六件套即可开面板。
 *   账本预留 s.achieve（groupPoints/rateIds/pending/received/taskData/suitIds），将来接真实进度。
 *
 * 断言：
 *   T1 eRet=1 且六件套齐全（groupPoints/rateIds/achieveIdArr/rd/taskData/srd）
 *   T2 类型契约：groupPoints/taskData/srd 是对象，rateIds/achieveIdArr/rd 是数组
 *   T3 空账本 → 全部为空结构（诚实零进度，不造假数据）
 *   T4 账本里有成就状态时原样回放（为将来接真进度留的通道）
 *   T5 只读：调完不写档
 *
 * 跑法：node test/achieve-data.js   退出码 0 = 全绿
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

T('T3 空账本 → 空结构（groupPoints 必须有全部组 id，其余为空）', () => {
  const { env } = makeEnv();
  const s = createBzServer(env);
  const i = inner(s.dispatch('User', 'getAchieveData', {}), 'getAchieveData');
  const gids = Object.keys(i.groupPoints || {}).map(Number).sort((a, b) => a - b);
  assert.deepStrictEqual(gids, (BZ_ACHIEVE_GROUPS || []).slice().sort((a, b) => a - b), 'groupPoints 必须含全部组 id（否则面板零条目）');
  assert.ok(gids.every((k) => i.groupPoints[k] === 0), '空账本时各组点数 0');
  assert.deepStrictEqual(i.rateIds, []);
  assert.deepStrictEqual(i.achieveIdArr, []);
  assert.deepStrictEqual(i.rd, []);
  assert.deepStrictEqual(i.taskData, {});
  assert.deepStrictEqual(i.srd, {});
});

T('T4 账本里有状态时原样回放（组点数保留、缺的组补 0）', () => {
  const { env } = makeEnv();
  const s = createBzServer(env);
  s.loadSave().achieve = { groupPoints: { 1: 120 }, rateIds: [1], pending: [301], received: [302], taskData: { 301: 5 }, suitIds: { 1: [302] } };
  const i = inner(s.dispatch('User', 'getAchieveData', {}), 'getAchieveData');
  assert.strictEqual(i.groupPoints[1], 120, '账本里的组点数不许被覆盖');
  assert.ok(Object.keys(i.groupPoints).length >= (BZ_ACHIEVE_GROUPS || []).length, '缺的组必须补 0');
  assert.deepStrictEqual(i.rateIds, [1]);
  assert.deepStrictEqual(i.achieveIdArr, [301]);
  assert.deepStrictEqual(i.rd, [302]);
  assert.deepStrictEqual(i.taskData, { 301: 5 });
  assert.deepStrictEqual(i.srd, { 1: [302] });
});

T('T5 只读：调完不写档', () => {
  const { store, env } = makeEnv();
  const s = createBzServer(env);
  s.dispatch('User', 'getAchieveData', {});
  assert.strictEqual(store.get(SAVE_KEY), undefined, 'getAchieveData 不许触发写档');
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
