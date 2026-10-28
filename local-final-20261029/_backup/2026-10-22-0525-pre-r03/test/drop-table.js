'use strict';
/**
 * drop-table.js —— 打怪掉落（统一 drop 展开入口）回归
 *
 * 契约：
 *   1. `CheckBattleResult{win:1,npcID}` 按 npc.Drop 发奖；概率 >=100 必得、<100 掷点；
 *   2. 同一 npc 在 DROP_DEDUP_MS(5000ms) 内重复结算**不重复发奖**（客户端重发不该刷）；
 *   3. 输了（win=0）不发；没有掉落表的 npc 不崩、不发；
 *   4. 数据自洽：BZ_NPCDROP 的每个值都能在 BZ_DROP 里找到，且每条都是 [数量, 概率]。
 *
 * 跑法：node test/drop-table.js    退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

function makeEnv(nowRef) {
  const store = new Map();
  const logs = [];
  const clock = nowRef || { t: 1792612412000 };
  return {
    env: {
      readSave: (k) => (store.has(k) ? store.get(k) : null),
      writeSave: (k, t) => store.set(k, t),
      log: (m) => logs.push(m),
      now: () => clock.t,
      templates: TPL,
    },
    store, logs, clock,
  };
}

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

// npc 2005 → drop 9002005，必得 1301×1（装备，进 PlayerEquip）
T('T1 打赢 → 按 npc.Drop 发奖', () => {
  const { env } = makeEnv();
  const s = createBzServer(env);
  s.dispatch('User', 'CheckBattleResult', { win: 1, npcID: 2005 });
  const sv = s.loadSave();
  assert.ok(sv.playerEquip && sv.playerEquip[1301], '应拿到 1301: ' + JSON.stringify(sv.playerEquip));
});

T('T2 5 秒内重复结算不重复发', () => {
  const { env, clock } = makeEnv();
  const s = createBzServer(env);
  s.dispatch('User', 'CheckBattleResult', { win: 1, npcID: 2005 });
  const a1 = JSON.stringify(s.loadSave().playerEquip);
  clock.t += 1000;                                        // 1 秒后再发一次
  s.dispatch('User', 'CheckBattleResult', { win: 1, npcID: 2005 });
  const a2 = JSON.stringify(s.loadSave().playerEquip);
  assert.strictEqual(a2, a1, '窗口内不该重复发奖');
});

T('T3 超过窗口可以再发（换一场真战斗）', () => {
  const { env, clock } = makeEnv();
  const s = createBzServer(env);
  s.dispatch('User', 'CheckBattleResult', { win: 1, npcID: 2005 });
  const before = s.loadSave().playerEquip[1301][1];
  clock.t += 6000;                                        // 6 秒后
  s.dispatch('User', 'CheckBattleResult', { win: 1, npcID: 2005 });
  const after = s.loadSave().playerEquip[1301][1];
  assert.strictEqual(after, before + 1, '超窗口后应再发一次');
});

T('T4 输了不发', () => {
  const { env } = makeEnv();
  const s = createBzServer(env);
  s.dispatch('User', 'CheckBattleResult', { win: 0, npcID: 2005 });
  assert.deepStrictEqual(s.loadSave().playerEquip || {}, {}, '输了不该有掉落');
});

T('T5 没有掉落表的 npc 不崩', () => {
  const { env } = makeEnv();
  const s = createBzServer(env);
  const BZ = globalThis.BZ_NPCDROP;
  const noDrop = Object.keys(BZ).length ? 999999 : 1;     // 不存在的 npc
  const r = s.dispatch('User', 'CheckBattleResult', { win: 1, npcID: noDrop });
  assert.ok(r && r['User.CheckBattleResult'], '应照常回应答');
  assert.deepStrictEqual(s.loadSave().playerEquip || {}, {});
});

T('T6 数据自洽（npc→drop→条目）', () => {
  const N = globalThis.BZ_NPCDROP, D = globalThis.BZ_DROP;
  let bad = 0, entries = 0;
  for (const npc of Object.keys(N)) {
    const row = D[String(N[npc])];
    if (!row) { bad++; continue; }
    for (const k of Object.keys(row)) {
      const v = row[k];
      if (!Array.isArray(v) || v.length !== 2 || !(v[0] > 0) || !(v[1] > 0)) bad++;
      entries++;
    }
  }
  assert.strictEqual(bad, 0, '坏条目 ' + bad + ' / ' + entries);
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[drop] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
