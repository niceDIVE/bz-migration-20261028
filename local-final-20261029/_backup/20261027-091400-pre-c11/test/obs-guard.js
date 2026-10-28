'use strict';
/**
 * obs-guard.js —— L4 观察守卫回归（A04 回执第 4 条：记录"账本出现、应答没文档化"的差额，不拒绝）
 *
 * 契约（2026-10-22 实现）：
 *   dispatch 处理完 handler 后比对账本前后（bag / playerEquip / coins / gold / yuanbao / contribution）：
 *   - 变了但应答 note.ivch/eqch/eco 没覆盖该键 → 日志 `OBS 未解释差额 <动作>: ...`；
 *   - 覆盖了但值是"变动量"而不是账本新值（§17.2 事故：20 卖 1 被写成 1）→ 同样记一条；
 *   - **R05 改口径（2026-10-22 夜）**：带 rewardArray 的奖励类**不再豁免**，改成"差额必须等于 rewardArray"
 *     —— 那类动作恰恰是重复发奖/吞奖最容易发生的地方；另把 playerEquip 一并纳入观察。
 *   - 维护动作（bz*）豁免；沙箱实例完全不观察。只记录、不拒绝（拒绝会让玩家丢操作）。
 *
 * 断言：
 *   T1 维护动作（bz*）不观察 → 无 OBS 日志
 *   T2 useItem 文档化（note.ivch = 绝对值）→ 无 OBS 日志
 *   T3 未文档化的背包变化 → 有 OBS 日志（直接调 _internal.observeLedger 注入）
 *   T4 note.ivch 值不是账本新值（变动量）→ 有 OBS 日志
 *   T5 带 rewardArray 的奖励类：差额对齐 → 不报警，无 OBS 日志
 *   T6 货币：note.eco 值匹配 → 无 OBS；未文档化变化 → 有 OBS
 *   T7 沙箱实例 → 完全不观察
 *
 * 跑法：node test/obs-guard.js   退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

function makeEnv(sandbox) {
  const store = new Map();
  const logs = [];
  return {
    store, logs,
    env: {
      readSave: (k) => (store.has(k) ? store.get(k) : null),
      writeSave: (k, t) => store.set(k, t),
      log: (m) => logs.push(String(m)),
      now: () => 1792612412000,
      templates: TPL,
      sandbox: !!sandbox,
    },
  };
}
const obsLogs = (logs) => logs.filter((l) => l.indexOf('OBS 未解释差额') >= 0);

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 维护动作（bz*）不观察', () => {
  const { logs, env } = makeEnv();
  const s = createBzServer(env);
  s.dispatch('User', 'bzSeedBag', { itemObj: { 3003: 5 } });
  s.dispatch('User', 'bzGrantCur', { gold: 100 });
  assert.strictEqual(obsLogs(logs).length, 0, 'bz* 不该被观察：' + obsLogs(logs).join(' | '));
});

T('T2 useItem 文档化（note.ivch = 绝对值）→ 无 OBS', () => {
  const { logs, env } = makeEnv();
  const s = createBzServer(env);
  s.dispatch('User', 'bzSeedBag', { itemObj: { 3003: 20 } });
  s.dispatch('User', 'useItem', { itemID: 3003, itemNum: 1 });
  assert.strictEqual(obsLogs(logs).length, 0, '文档化写入不该报警：' + obsLogs(logs).join(' | '));
});

T('T3 未文档化的背包变化 → OBS 日志', () => {
  const { logs, env } = makeEnv();
  const s = createBzServer(env);
  s.dispatch('User', 'bzSeedBag', { itemObj: { 3003: 20 } });
  const snap = s._internal.snapshotLedger();
  s.loadSave().bag[3003] = 5;                                     // 模拟 handler 偷偷改账本
  s._internal.observeLedger('fakeWrite', snap, { 'User.fakeWrite': { eRet: 1 } });
  const hit = obsLogs(logs);
  assert.strictEqual(hit.length, 1, '未文档化变化必须记一条：' + logs.join(' | '));
  assert.ok(hit[0].indexOf('fakeWrite') >= 0 && hit[0].indexOf('bag.3003 20→5') >= 0, '日志必须带动作与差额：' + hit[0]);
});

T('T4 note.ivch 值不是账本新值（变动量）→ OBS 日志', () => {
  const { logs, env } = makeEnv();
  const s = createBzServer(env);
  s.dispatch('User', 'bzSeedBag', { itemObj: { 3003: 20 } });
  const snap = s._internal.snapshotLedger();
  s.loadSave().bag[3003] = 19;
  s._internal.observeLedger('badWrite', snap, { 'User.badWrite': { eRet: 1, note: { ivch: { 3003: -1 } } } });
  const hit = obsLogs(logs);
  assert.strictEqual(hit.length, 1, '变动量当绝对值必须报警：' + logs.join(' | '));
  assert.ok(hit[0].indexOf('note.ivch.3003=-1') >= 0 && hit[0].indexOf('账本到 19') >= 0, hit[0]);
});

T('T5 带 rewardArray 的奖励类：差额对齐 → 不报警', () => {
  const { logs, env } = makeEnv();
  const s = createBzServer(env);
  s.dispatch('User', 'bzSeedBag', { itemObj: { 3003: 20 } });
  const snap = s._internal.snapshotLedger();
  s.loadSave().bag[3003] = 30;
  s._internal.observeLedger('rewardWrite', snap, { 'User.rewardWrite': { eRet: 1, rewardArray: { 3003: 10 } } });
  assert.strictEqual(obsLogs(logs).length, 0, '奖励类不该报警：' + obsLogs(logs).join(' | '));
});

T('T6 货币：note.eco 匹配 → 无 OBS；未文档化 → 有 OBS', () => {
  const { logs, env } = makeEnv();
  const s = createBzServer(env);
  const snap = s._internal.snapshotLedger();
  s.loadSave().coins = 500;
  s._internal.observeLedger('ecoOk', snap, { 'User.ecoOk': { eRet: 1, note: { eco: { coins: 500 } } } });
  assert.strictEqual(obsLogs(logs).length, 0, '文档化货币不该报警：' + obsLogs(logs).join(' | '));
  const snap2 = s._internal.snapshotLedger();
  s.loadSave().gold = 999;
  s._internal.observeLedger('goldSecret', snap2, { 'User.goldSecret': { eRet: 1 } });
  assert.strictEqual(obsLogs(logs).length, 1, '未文档化货币必须报警');
  assert.ok(obsLogs(logs)[0].indexOf('gold') >= 0, obsLogs(logs)[0]);
});

T('T7 沙箱实例 → 完全不观察', () => {
  const { logs, env } = makeEnv(true);
  const s = createBzServer(env);
  s.dispatch('User', 'bzSeedBag', { itemObj: { 3003: 20 } });
  const snap = s._internal.snapshotLedger();
  s.loadSave().bag[3003] = 5;
  s._internal.observeLedger('sandboxWrite', snap, { 'User.sandboxWrite': { eRet: 1 } });
  assert.strictEqual(obsLogs(logs).length, 0, '沙箱不许观察（自检会刷屏）');
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[obs] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
