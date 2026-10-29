'use strict';
/**
 * drop-table.js —— 打怪掉落（统一 drop 展开入口）回归
 *
 * 契约（R03 回执之后定死）：
 *   1. `CheckBattleResult{win:1,npcID}` 按 npc.Drop 发奖；概率 >=100 必得、<100 掷点；
 *   2. **不去重**：客户端只有一处结算发送点、无业务层重发，两次 win 就该发两次；
 *   3. 掉落必须进应答（`rewardArray` / `equipObj`），否则玩家看不到战利品（index.js:89553-89561）；
 *   4. 输了（win=0）不发；没有掉落表的 npc 不崩；
 *   5. 随机源可注入（`env.random`），测试用固定种子 → 概率掉落也能确定性复现；
 *   6. 数据自洽：BZ_NPCDROP 的每个值都能在 BZ_DROP 找到，且每条都是 [数量, 概率]。
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

function makeEnv(opts) {
  const o = opts || {};
  const store = new Map();
  const logs = [];
  const clock = { t: 1792612412000 };
  return {
    env: {
      readSave: (k) => (store.has(k) ? store.get(k) : null),
      writeSave: (k, t) => store.set(k, t),
      log: (m) => logs.push(m),
      now: () => clock.t,
      templates: TPL,
      random: o.random,           // undefined → 服务端退回 Math.random
    },
    store, logs, clock,
  };
}

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }
const battle = (s, p) => (s.dispatch('User', 'CheckBattleResult', p) || {})['User.CheckBattleResult'] || {};

// npc 2005 → drop 9002005，必得 1301×1（装备，进 PlayerEquip）
T('T1 打赢 → 记进账本', () => {
  const { env } = makeEnv();
  const s = createBzServer(env);
  battle(s, { win: 1, npcID: 2005 });
  const sv = s.loadSave();
  assert.ok(sv.playerEquip && sv.playerEquip[1301], '应拿到 1301: ' + JSON.stringify(sv.playerEquip));
});

T('T2 掉落写进应答（equipObj / rewardArray）', () => {
  const { env } = makeEnv();
  const s = createBzServer(env);
  const r = battle(s, { win: 1, npcID: 2005 });
  const has = (r.equipObj && r.equipObj[1301]) || (r.rewardArray && r.rewardArray[1301]);
  assert.ok(has, '应答里应有战利品: ' + JSON.stringify({ eq: r.equipObj, rw: r.rewardArray }));
  assert.strictEqual(r.win, true);
});

T('T3 不去重：两次赢就发两次', () => {
  const { env } = makeEnv();
  const s = createBzServer(env);
  battle(s, { win: 1, npcID: 2005 });
  const n1 = s.loadSave().playerEquip[1301][1];
  battle(s, { win: 1, npcID: 2005 });          // 同一 npc、立刻再来一次
  const n2 = s.loadSave().playerEquip[1301][1];
  assert.strictEqual(n2, n1 + 1, '第二场也该发（旧版 5 秒窗口会吞掉）');
});

T('T4 输了不发、应答为空', () => {
  const { env } = makeEnv();
  const s = createBzServer(env);
  const r = battle(s, { win: 0, npcID: 2005 });
  assert.deepStrictEqual(s.loadSave().playerEquip || {}, {}, '输了不该有掉落');
  assert.deepStrictEqual(r.rewardArray || {}, {}, '输了 rewardArray 应为空');
});

T('T5 没有掉落表的 npc 不崩', () => {
  const { env } = makeEnv();
  const s = createBzServer(env);
  const r = battle(s, { win: 1, npcID: 999999 });
  assert.ok(r && typeof r === 'object', '应照常回应答');
  assert.deepStrictEqual(s.loadSave().playerEquip || {}, {});
});

T('T6 概率掉落可复现（random=0 全中）', () => {
  const { env } = makeEnv({ random: () => 0 });
  const s = createBzServer(env);
  const r = battle(s, { win: 1, npcID: 1001 });        // drop 9001001 = {2001:[1,50], 2302:[1,50]}
  const got = Object.assign({}, r.equipObj || {}, r.rewardArray || {});
  assert.ok(Object.keys(got).length >= 2, 'random=0 时两条概率掉落都该中: ' + JSON.stringify(got));
});

T('T7 概率失败也可复现（random=0.999 只拿必得）', () => {
  const { env } = makeEnv({ random: () => 0.999 });
  const s = createBzServer(env);
  const r = battle(s, { win: 1, npcID: 2005 });        // 2005 的 1301 是必得
  const got = Object.assign({}, r.equipObj || {}, r.rewardArray || {});
  assert.deepStrictEqual(Object.keys(got), ['1301'], '只该有必得条目: ' + JSON.stringify(got));
});

T('T8 数据自洽（npc→drop→条目）', () => {
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
