'use strict';
/**
 * action-stats.js —— 动作计数回归（R04 Q4：save.meta.actionStats 替代会轮转的 bz_log.jsonl）
 *
 * 契约（2026-10-22 实现）：
 *   1. dispatch 时只内存累加（per-instance），不写档；
 *   2. 下一次业务 persist() 把累计值落进 save.meta.actionStats；
 *   3. 沙箱实例（自检/测试的隔离 server）**不计数、不落盘**——否则自检会把假计数写进真存档；
 *   4. meta 不参与写前守卫（guardSave）与 schema 校验（validateSave），所以不会把正常写档判成缩水。
 *
 * 断言：
 *   T1 未 persist 前只内存：store 里没有档、也没有 meta
 *   T2 业务写档后 meta.actionStats 落盘（LoadGame×2 / useItem×1 / bzSeedBag×1）
 *   T3 persist 返回 true（meta 不触发写前守卫）
 *   T4 计数跨 persist 累计（再 LoadGame 一次 → 3）
 *   T5 沙箱实例不计数、不落 meta
 *
 * 跑法：node test/action-stats.js   退出码 0 = 全绿
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
  return {
    store,
    env: {
      readSave: (k) => (store.has(k) ? store.get(k) : null),
      writeSave: (k, t) => store.set(k, t),
      log: () => {},
      now: () => 1792612412000,
      templates: TPL,
      sandbox: !!sandbox,
    },
  };
}
const SAVE_KEY = 'bz_server_save_v2';
const saveOf = (store) => { const raw = store.get(SAVE_KEY); return raw ? JSON.parse(raw) : null; };

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 未 persist 前只内存：没有档、没有 meta', () => {
  const { store, env } = makeEnv();
  const s = createBzServer(env);
  s.dispatch('User', 'LoadGame', {});
  s.dispatch('User', 'LoadGame', {});
  assert.strictEqual(store.get(SAVE_KEY), undefined, '没触发业务写档就一个字节都不该落盘');
});

T('T2 业务写档后 meta.actionStats 落盘', () => {
  const { store, env } = makeEnv();
  const s = createBzServer(env);
  s.dispatch('User', 'LoadGame', {});
  s.dispatch('User', 'LoadGame', {});
  s.dispatch('User', 'useItem', { itemID: 999999, itemNum: 1 });
  s.dispatch('User', 'bzSeedBag', { itemObj: { 3003: 2 } });
  const saved = saveOf(store);
  assert.ok(saved, 'bzSeedBag 必须写档');
  assert.ok(saved.meta && saved.meta.actionStats, 'meta.actionStats 必须落盘');
  assert.strictEqual(saved.meta.actionStats.LoadGame, 2);
  assert.strictEqual(saved.meta.actionStats.useItem, 1);
  assert.strictEqual(saved.meta.actionStats.bzSeedBag, 1);
});

T('T3 persist 返回 true（meta 不触发写前守卫）', () => {
  const { env } = makeEnv();
  const s = createBzServer(env);
  s.dispatch('User', 'LoadGame', {});
  const r = s.dispatch('User', 'bzSeedBag', { itemObj: { 3003: 1 } });
  assert.strictEqual(r['User.bzSeedBag'].eRet, 1, '写档必须成功（不许被守卫拒绝）');
});

T('T4 计数跨 persist 累计', () => {
  const { store, env } = makeEnv();
  const s = createBzServer(env);
  s.dispatch('User', 'bzSeedBag', { itemObj: { 3003: 1 } });
  s.dispatch('User', 'LoadGame', {});
  s.dispatch('User', 'bzSeedBag', { itemObj: { 3003: 2 } });
  assert.strictEqual(saveOf(store).meta.actionStats.LoadGame, 1);
  assert.strictEqual(saveOf(store).meta.actionStats.bzSeedBag, 2);
});

T('T5 沙箱实例不计数、不落 meta', () => {
  const { store, env } = makeEnv(true);
  const s = createBzServer(env);
  s.dispatch('User', 'LoadGame', {});
  s.dispatch('User', 'bzSeedBag', { itemObj: { 3003: 1 } });
  const saved = saveOf(store);
  assert.ok(saved, '沙箱也要能写自己的内存档');
  assert.strictEqual(saved.meta, undefined, '沙箱不许写 meta.actionStats');
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[stats] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
