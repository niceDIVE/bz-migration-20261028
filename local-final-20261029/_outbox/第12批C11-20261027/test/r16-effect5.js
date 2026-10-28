'use strict';
/**
 * r16-effect5.js —— Effect 5（师门秘籍）落地后的回归（2026-10-23）
 *
 * 【证据】客户端 `index.js:64342-64347`：
 *   `case 5: if (h.SkillTable.dic.hasOwnProperty(e.Data1)) { s.default.show(n.getText("243")); return !0; }`
 *   `var _ = i.getItem(e.ID, "master_book");`
 *   `if (!judgeTaskCondition(_.Condition) || !this.judgeMasterSchoolState(_.Menpai)) { …提示… return !0; }`
 *   ⇒ ① `Data1` 就是**技能 id**（这一行直接读的，不是靠查表命中率推的）；
 *     ② 已学会 / 条件不满足时客户端**自己弹提示并本地拦截**，请求根本不会发出来；
 *     ③ 所以走到服务端的 Effect 5 请求 = "条件已满足且尚未学会" → 复用 ITEMSCH 的"学会 1 级"。
 *
 * 【改动】`bz-rpc-server.js` 的 useItem 里：`schSkill` 除了看 `BZ_ITEMSCH`（Effect 11），
 *   还看 `BZ_ITEMFX[id][0] === 5` 时取 `[1]`（Data1）当技能 id。
 *
 * 断言：
 *   T1 Effect 5 物品 · 未学会 → eRet 1、技能入账 1 级、note.skch 带该技能、物品 -1
 *   T2 同一件再用一次 → eRet 5（"你已经学会此配方了"）、**物品不扣**
 *   T3 非 Effect 5 的物品不受影响（Effect 11 的 ITEMSCH 路径仍然生效）
 *
 * 跑法：node test/r16-effect5.js   退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-tasks.generated.js'), 'utf8'));

// 与 build-handlers.js 用同一份压缩口径：只留 Type==2，形状 [Effect, Data1, Data2, Data3]
const FX_SRC = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'tools', 'facts', 'item-effects.json'), 'utf8'));
const ITEMFX = {};
for (const id of Object.keys(FX_SRC.effects || {})) {
  const r = FX_SRC.effects[id];
  if (r && r.t === 2) ITEMFX[id] = [r.e || 0, r.d1 || 0, r.d2 || 0, r.d3 || 0];
}
global.BZ_ITEMFX = ITEMFX;

const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');
const NOW = 1792612412000;

function mk() {
  const store = new Map();
  const logs = [];
  const env = {
    readSave: (k) => (store.has(k) ? store.get(k) : null),
    writeSave: (k, t) => store.set(k, t),
    log: (m) => logs.push(String(m)),
    now: () => NOW,
    templates: TPL,
  };
  return { s: createBzServer(env), logs, store };
}
const inner = (r, k) => r['User.' + k] || {};

function pickEffect5() {
  const ids = Object.keys(ITEMFX).map(Number);
  const id = ids.find((i) => ITEMFX[i][0] === 5 && ITEMFX[i][1] > 0);
  return id ? { id, skill: ITEMFX[id][1] } : null;
}
function pickEffect11() {
  const sch = (typeof BZ_ITEMSCH !== 'undefined' && BZ_ITEMSCH) || {};
  const k = Object.keys(sch)[0];
  return k ? { id: parseInt(k, 10), skill: sch[k] } : null;
}

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 Effect 5 未学会 → 学会 1 级 + note.skch + 物品 -1（原故障：秘籍用掉但技能没学会）', () => {
  const e5 = pickEffect5();
  assert.ok(e5, 'item-effects.json 里必须存在 Effect==5 且 Data1>0 的物品');
  const { s, logs } = mk();
  s.dispatch('User', 'bzSeedBag', { itemObj: { [e5.id]: 2 } });
  const got = inner(s.dispatch('User', 'useItem', { itemID: e5.id, itemNum: 1 }), 'useItem');
  assert.strictEqual(got.eRet, 1, '无条件（客户端已本地校验过条件）→ 成功');
  assert.deepStrictEqual(s.loadSave().skills[String(e5.skill)], [1, 0, 1], '技能必须入账 1 级（' + e5.skill + '）');
  assert.ok(got.note && got.note.skch && got.note.skch[String(e5.skill)], 'note.skch 必须带该技能（客户端弹"恭喜你学会了X"）');
  assert.strictEqual(s.loadSave().bag[e5.id], 1, '成功路径才扣物品');
  assert.ok(logs.some((l) => l.indexOf('学会技能 ' + e5.skill) >= 0), logs.slice(-2).join(' | '));
});

T('T2 同一件 Effect 5 再用一次 → eRet 5（已学会）、**物品不扣**', () => {
  const e5 = pickEffect5();
  const { s } = mk();
  s.dispatch('User', 'bzSeedBag', { itemObj: { [e5.id]: 2 } });
  s.dispatch('User', 'useItem', { itemID: e5.id, itemNum: 1 });          // 第一次：学会
  const got = inner(s.dispatch('User', 'useItem', { itemID: e5.id, itemNum: 1 }), 'useItem');
  assert.strictEqual(got.eRet, 5, '已学会必须回 5（客户端 5 分支只弹"你已经学会此配方了"）');
  assert.strictEqual(s.loadSave().bag[e5.id], 1, '拒绝 ≠ 消耗：物品数量不许变');
  assert.deepStrictEqual(s.loadSave().skills[String(e5.skill)], [1, 0, 1], '重复使用不许改技能等级');
});

T('T3 Effect 11（ITEMSCH）路径不受影响', () => {
  const e11 = pickEffect11();
  assert.ok(e11, 'BZ_ITEMSCH 不能为空');
  const { s } = mk();
  s.dispatch('User', 'bzSeedBag', { itemObj: { [e11.id]: 1 } });
  const got = inner(s.dispatch('User', 'useItem', { itemID: e11.id, itemNum: 1 }), 'useItem');
  assert.strictEqual(got.eRet, 1);
  assert.deepStrictEqual(s.loadSave().skills[String(e11.skill)], [1, 0, 1]);
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[r16-effect5] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
