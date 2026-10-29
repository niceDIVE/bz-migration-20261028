'use strict';
/**
 * push-grants.js —— 「发奖/掉落必须推给客户端」回归（2026-10-22）
 *
 * 背景（用户实测）：战斗结算界面显示了战利品，但背包/装备表里没有 —— 因为服务端只写了存档，
 * 而客户端的奖励展示（showReward → RewardUI）**不写**背包模型（index.js:3395-3404），
 * 模型只在 LoadGame / sycnPlayerItemData / 我们主动推送时才更新。
 *
 * 契约：
 *   1. 交任务发奖 → `InventoryModel.setItem(id, 绝对值)`（背包物品）；
 *   2. 交任务发装备 → `InventoryModel.addEq({id,type,itemID,...})`；
 *   3. 打怪掉落 → 同样推（items 走 setItem、equips 走 addEq）；
 *   4. 沙盒实例（自检/隔离，env.sandbox）**一次都不许推**；
 *   5. push 的内容必须等于存档里的绝对值（推送不能凭空造数）。
 *
 * 跑法：node test/push-grants.js   退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

const calls = { setItem: [], addEq: [], updateEq: [] };
function fakeWindow() {
  global.window = {
    __require: (n) => (n === 'InventoryModel'
      ? { InventoryModel: {
        setItem: (id, c) => calls.setItem.push([id, c]),
        addEq: (eq) => calls.addEq.push(eq),
        updateEq: (id, arr) => calls.updateEq.push([id, arr]),
      } }
      : null),
  };
}
function clearCalls() { calls.setItem.length = 0; calls.addEq.length = 0; calls.updateEq.length = 0; }

function makeEnv(extra) {
  const store = new Map();
  const clock = { t: 1792612412000 };
  const env = {
    readSave: (k) => (store.has(k) ? store.get(k) : null),
    writeSave: (k, t) => store.set(k, t),
    log: () => {},
    now: () => clock.t,
    templates: TPL,
  };
  return { env: Object.assign(env, extra || {}), store, clock };
}

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 交任务发奖 → setItem(绝对值)', () => {
  fakeWindow(); clearCalls();
  const { env } = makeEnv();
  const s = createBzServer(env);
  s.dispatch('User', 'getFinishTaskAward', { taskID: 100010 });     // 奖励 3626×1
  const got = calls.setItem.filter((c) => c[0] === 3626);
  assert.ok(got.length === 1, '应推 setItem(3626,..)，实际 ' + JSON.stringify(calls.setItem));
  assert.strictEqual(got[0][1], s.loadSave().bag['3626'], '推的必须是存档里的绝对值');
  delete global.window;
});

T('T2 交任务发装备 → updateEq(id,[1,num])', () => {
  fakeWindow(); clearCalls();
  const { env } = makeEnv();
  const s = createBzServer(env);
  s.dispatch('User', 'getFinishTaskAward', { taskID: 100240 });     // 奖励 7535（装备）
  const eq = calls.updateEq.filter((e) => e[0] === 7535);
  assert.ok(eq.length === 1, '应推 updateEq(7535,[1,1])，实际 ' + JSON.stringify(calls.updateEq));
  assert.deepStrictEqual(eq[0][1], [1, 1], '结构必须是 [type, num]');
  delete global.window;
});

T('T3 打怪掉落 → 装备走 updateEq', () => {
  fakeWindow(); clearCalls();
  const { env } = makeEnv();
  const s = createBzServer(env);
  s.dispatch('User', 'CheckBattleResult', { win: 1, npcID: 2005 });  // 必得 1301（装备）
  assert.ok(calls.updateEq.some((e) => e[0] === 1301), '应推 updateEq(1301,[1,1])，实际 ' + JSON.stringify(calls.updateEq));
  delete global.window;
});

T('T4 沙盒实例一次都不许推', () => {
  fakeWindow(); clearCalls();
  const { env } = makeEnv({ sandbox: true });
  const s = createBzServer(env);
  s.dispatch('User', 'getFinishTaskAward', { taskID: 100010 });
  s.dispatch('User', 'CheckBattleResult', { win: 1, npcID: 2005 });
  assert.deepStrictEqual(calls.setItem, [], '沙盒不许 setItem');
  assert.deepStrictEqual(calls.updateEq, [], '沙盒不许 updateEq');
  delete global.window;
});

T('T5 没有客户端模型时不崩', () => {
  global.window = undefined;
  const { env } = makeEnv();
  const s = createBzServer(env);
  assert.ok(s.dispatch('User', 'CheckBattleResult', { win: 1, npcID: 2005 }));
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[push] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
