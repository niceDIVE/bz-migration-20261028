'use strict';
/**
 * r18-skch-lv0.js —— Move ②：`skch` 绝不许下发 lv=0（SOTA R18 §1-3 / 反例 3）
 *
 * 【为什么这是真问题】
 *   客户端 `index.js:119832 s.SkillTable.setSkill(n, e[o][0])` **不过滤 0**；
 *   而 `120070 getSkillItem` 只判 `dic.hasOwnProperty`、`120166 isSkillLearned` 才判 `lv>0`。
 *   一旦某技能被写成 `[0,…]`：
 *     · Effect 5 的书在本地被拦（64343 `dic.hasOwnProperty(e.Data1)` → 提示 243「已学会」，不发请求）；
 *     · Effect 11 的书拿 `lv=0` 去走 ConditionUp 分支（64401 `T ? … : …`）。
 *   这条路径原实现可达：**未知技能 + 目标等级 ≤0** ⇒ `curLv=0`、`gained=0` ⇒ 写 `skills[id]=[0,…]` 且发 `skch[id]=[0,…]`。
 *
 * 【修法】`gained<=0 && curLv<=0` 时：不落账、不发 skch（删技能只能走 abolish 通道）。
 *
 * 跑法：node test/r18-skch-lv0.js   退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-tasks.generated.js'), 'utf8'));
global.BZ_ITEMFX = {};

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
  return { s: createBzServer(env), logs };
}
const inner = (r, k) => r['User.' + k] || {};

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 未知技能 + 目标 0 → 不写 skills、不发 skch（原故障：写出 [0,…] 污染 SkillTable）', () => {
  const { s, logs } = mk();
  const got = inner(s.dispatch('User', 'upgradeSkill', { skillID: 1262, skillArr: [0, 0, 1], NPCID: 0, flag: 1 }), 'upgradeSkill');
  assert.strictEqual(got.eRet, 1, '仍回 eRet:1（既有口径：不打断客户端）');
  const skch = (got.note || {}).skch || {};
  assert.deepStrictEqual(Object.keys(skch), [], 'note.skch 不许出现任何项，实际=' + JSON.stringify(skch));
  assert.ok(!s.loadSave().skills || s.loadSave().skills[1262] === undefined,
    'skills 账本不许被创建，实际=' + JSON.stringify((s.loadSave().skills || {})[1262]));
  assert.ok(logs.some((l) => l.indexOf('未知技能且目标 ≤0') >= 0), '必须留一条拒绝日志');
});

T('T2 已会技能点取消（目标=当前，带进度）→ 进度必须照存，skch 里 lv 仍 >0', () => {
  const { s } = mk();
  s.dispatch('User', 'bzPatch', { set: { skills: { 1112: [41, 0, 1] } } });
  const got = inner(s.dispatch('User', 'upgradeSkill', { skillID: 1112, skillArr: [41, 6, 1], NPCID: 0, flag: 1 }), 'upgradeSkill');
  const skch = (got.note || {}).skch || {};
  assert.ok(skch['1112'], 'skch 必须有 1112 这一项（进度要回显）');
  assert.ok(skch['1112'][0] > 0, 'skch 第 0 元素必须 >0（R18 断言），实际=' + JSON.stringify(skch['1112']));
  assert.strictEqual(skch['1112'][0], 41, '等级不变');
  assert.strictEqual(skch['1112'][1], 6, '进度必须存下来（旧坑：取消即丢）');
  assert.deepStrictEqual(s.loadSave().skills['1112'], [41, 6, 1]);
});

T('T3 真升级（41→42）→ skch lv=42 且潜能按 100/级 扣', () => {
  const { s } = mk();
  s.dispatch('User', 'bzPatch', { set: { skills: { 1112: [41, 0, 1] }, potential: 84599 } });
  const got = inner(s.dispatch('User', 'upgradeSkill', { skillID: 1112, skillArr: [42, 0, 1], NPCID: 0, flag: 1 }), 'upgradeSkill');
  const skch = (got.note || {}).skch || {};
  assert.strictEqual(skch['1112'][0], 42, 'skch lv 必须 = 目标等级');
  assert.strictEqual(s.loadSave().skills['1112'][0], 42);
  assert.strictEqual(s.loadSave().potential, 84599 - 100, '潜能扣 100×gained');
});

T('T4 缺 skillArr / skillID=0 仍走"无效请求"分支（不许写 skills["0"]）', () => {
  const { s } = mk();
  const got = inner(s.dispatch('User', 'upgradeSkill', { skillID: 0 }), 'upgradeSkill');
  assert.strictEqual(got.eRet, 1);
  assert.deepStrictEqual(Object.keys((got.note || {}).skch || {}), []);
  assert.ok(!(s.loadSave().skills || {})['0'], '不许写出 skills["0"]');
});

T('T5 全量扫描：任何 handler 产出的 skch 项，第 0 元素都必须 >0', () => {
  // 用自检口径打一遍会写技能的动作（upgradeSkill 的三个分支 + Effect 5 的学书分支）
  const { s } = mk();
  s.dispatch('User', 'bzPatch', { set: { skills: { 1112: [41, 0, 1] } } });
  const probes = [
    { skillID: 1112, skillArr: [41, 0, 1] },       // 取消
    { skillID: 1112, skillArr: [43, 0, 1] },       // 升级
    { skillID: 999999, skillArr: [0, 0, 1] },      // 未知技能目标 0
    { skillID: 999998, skillArr: [1, 0, 1] },      // 未知技能目标 1（= 学 1 级）
  ];
  for (const p of probes) {
    const got = inner(s.dispatch('User', 'upgradeSkill', p), 'upgradeSkill');
    const skch = (got.note || {}).skch || {};
    for (const k of Object.keys(skch)) {
      assert.ok(Array.isArray(skch[k]) && skch[k][0] > 0,
        'skch[' + k + '] 第 0 元素必须 >0，实际=' + JSON.stringify(skch[k]) + '（请求=' + JSON.stringify(p) + '）');
    }
  }
});

T('T6 upgradeSkill 应答不许带 returnPro（SOTA R20 Q4 纠错：客户端 119844 一读就弹窗）', () => {
  // index.js:119844 `e.hasOwnProperty("returnPro") && Alert.show(getText("6003371").replace(/\[1\]/, e.returnPro))`
  // ⇒ 不是"不读"，是"一读就弹窗"。形状表也判它是开关字段（__switch.upgradeSkill.returnPro），发 0 属非法值。
  const { s } = mk();
  s.dispatch('User', 'bzPatch', { set: { skills: { 1112: [41, 0, 1] }, potential: 84599 } });
  const probes = [
    { skillID: 0 },                                   // 无效请求分支
    { skillID: 999999, skillArr: [0, 0, 1] },          // 未知技能 + 目标 0 分支
    { skillID: 1112, skillArr: [41, 6, 1] },           // 等级不变（进度回写）分支
    { skillID: 1112, skillArr: [42, 0, 1] },           // 真升级分支
  ];
  for (const p of probes) {
    const got = inner(s.dispatch('User', 'upgradeSkill', p), 'upgradeSkill');
    assert.strictEqual(Object.prototype.hasOwnProperty.call(got, 'returnPro'), false,
      '应答不许带 returnPro（否则客户端 index.js:119844 会弹「返还潜能」），请求=' + JSON.stringify(p)
      + ' 实际=' + JSON.stringify(got.returnPro));
  }
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[r18-skch-lv0] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
