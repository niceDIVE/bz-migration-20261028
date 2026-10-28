'use strict';
/**
 * r13-reject-codes.js —— SOTA R13 三条代码修正的回归（2026-10-23）
 *
 * 【T1-T3 BeginTraining.isCollective：0 也必须原样回声】
 *   R13 §1 第 1 条推翻了我 R12 的规则（"请求为真才发"）。逐字证据 tools\index.js:120523：
 *     `if (n.hasOwnProperty("isCollective")) if (0 == n.isCollective) if (2 == e.isSchoolLiang) {`
 *     → 关掉门派练功界面 + load("comUI/LiangongUI")；玩家在门派练功界面里选**个人**练功时，
 *       客户端正是靠这个 0 才切界面。R12 把 0 过滤掉 = 门派界面关不掉、普通练功界面不打开（反例 1）。
 *   而且请求**永远带这个字段**（index.js:120751-120759 `start=function(t,e){void 0===e&&(e=0);…isCollective:e}`），
 *   所以"按存在性回声"在这条协议上 = "永远回声"，0/1 都要照发。
 *
 * 【T4 拒绝码落在"不进门"的码上，且绝不动时间基座】
 *   回调成功集 = `1 == n.eRet || 2 == n.eRet`（index.js:120516）→ 拒绝必须落在 1/2 之外；
 *   并且拒绝应答里**不许有 beginTime**（客户端会把它写进 startTimestamp 与 TimeMgr.sserverT）。
 *
 * 【T5 useItem 副作用原子性（R13 §1 第 3 条）】
 *   效果阶段只许算增量，`s.skills[...] = ` / `s.hunger = ` 只许出现在"一次性应用副作用"那一段之后。
 *   原故障形态：效果分支抛异常 → 内存改了一半、盘上没写、dispatch 的 catch 又把应答换成成功 ACK。
 *
 * 【T6 开关零值白名单确实是必要的】
 *   BZ_SHAPES.__switch.BeginTraining.isCollective 必须仍是 'switch'（否则 noteBadSwitches 的通用规则
 *   不会误报，白名单也就成了摆设；这条断言的作用是"白名单不许在无人察觉时失效"）。
 *
 * 【T7 不许把"选码规则"套到正常流程分支上】
 *   washAdditionalArr 的 eRet:4 是"弹选洗哪条"的正常流程（index.js:144071 load ChildWashUI），
 *   不是拒绝码 —— R13 的选码规则不适用于它，谁也不许按 R13 §2 把它改成 6。
 *
 * 跑法：node test/r13-reject-codes.js   退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

const NOW = 1792612412000;
const SRC = fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-rpc-server.js'), 'utf8');

function makeEnv(extra) {
  const store = new Map();
  const logs = [];
  const env = Object.assign({
    readSave: (k) => (store.has(k) ? store.get(k) : null),
    writeSave: (k, t) => store.set(k, t),
    log: (m) => logs.push(String(m)),
    now: () => NOW,
    templates: TPL,
  }, extra || {});
  return { store, logs, env };
}
const mk = (extra) => { const e = makeEnv(extra); return { s: createBzServer(e.env), logs: e.logs, env: e.env }; };
const inner = (r, k) => r['User.' + k] || {};

/** 一个"已学会"的技能 id（取 BZ_ITEMSCH 的某个技能，保证是合法 skill id；没有就用 1112） */
function learnedSkillId() {
  const sch = (typeof BZ_ITEMSCH !== 'undefined' && BZ_ITEMSCH) || {};
  const k = Object.keys(sch)[0];
  return k ? parseInt(sch[k], 10) : 1112;
}

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 isCollective:0 必须**原样回声 0**（原故障重现：门派练功界面切到个人练功）', () => {
  const { s, logs } = mk();
  const sid = learnedSkillId();
  s.loadSave().skills[String(sid)] = [40, 0, 1];
  const got = inner(s.dispatch('User', 'BeginTraining', { skillID: sid, isCollective: 0 }), 'BeginTraining');
  assert.strictEqual(got.eRet, 1, '已学会的技能必须进成功分支');
  assert.ok(Object.prototype.hasOwnProperty.call(got, 'isCollective'),
    '请求里带 isCollective 就必须回声（0 也要发）；实际应答字段：' + Object.keys(got).join(','));
  assert.strictEqual(got.isCollective, 0, '0 必须原样回声成数字 0，不许被过滤成缺席');
  assert.ok(typeof got.beginTime === 'number' && got.beginTime === NOW, 'beginTime 必须是请求时刻（固定时钟）');
  assert.ok(logs.some((l) => l.indexOf('isCollective=0') >= 0), '日志要能看出回声值：' + logs.slice(-2).join(' | '));
});

T('T2 isCollective:1 回声 1（集体练功要保住门派界面）', () => {
  const { s } = mk();
  const sid = learnedSkillId();
  s.loadSave().skills[String(sid)] = [40, 0, 1];
  const got = inner(s.dispatch('User', 'BeginTraining', { skillID: sid, isCollective: 1 }), 'BeginTraining');
  assert.strictEqual(got.isCollective, 1);
});

T('T3 请求里没有 isCollective → 应答里也不许出现（不许被 fillShape 补成 0）', () => {
  const { s } = mk();
  const sid = learnedSkillId();
  s.loadSave().skills[String(sid)] = [40, 0, 1];
  const got = inner(s.dispatch('User', 'BeginTraining', { skillID: sid }), 'BeginTraining');
  assert.strictEqual(got.eRet, 1);
  assert.ok(!Object.prototype.hasOwnProperty.call(got, 'isCollective'),
    '请求没这个字段就不许发（开关字段不许补默认值）；实际应答字段：' + Object.keys(got).join(','));
});

T('T4 未学会的技能 → eRet 4、beginTime 未被写成本次请求时刻、且写 REJECT 日志', () => {
  const { s, logs } = mk();
  const got = inner(s.dispatch('User', 'BeginTraining', { skillID: 999999, isCollective: 0 }), 'BeginTraining');
  assert.strictEqual(got.eRet, 4, '客户端成功集是 1/2（index.js:120516），拒绝必须落在外面');
  // 注意：fillShape 会按形状表补 beginTime/skillID（补的是默认值 0），这是既有机制、改不动也不该改。
  // 真正的不变量是"拒绝应答里不许出现**本次请求时刻**"——客户端只在 1/2 分支读它，
  // 而 0 落到 getSTimestamp() 的"回退本地时钟"分支，绝不会把时间基座写脏。
  assert.notStrictEqual(got.beginTime, NOW, '拒绝时绝不能带请求时刻（会被写进 startTimestamp/sserverT）');
  assert.ok(got.beginTime === undefined || got.beginTime === 0,
    '拒绝时 beginTime 只允许缺席或形状默认值 0，实际=' + JSON.stringify(got.beginTime));
  assert.ok(logs.some((l) => l.indexOf('REJECT BeginTraining') >= 0 && l.indexOf('notLearned') >= 0),
    '静默拒绝必须留痕（R13 §5）：' + logs.slice(-3).join(' | '));
});

T('T5 useItem 原子性（静态）：`s.skills[...] = ` / `s.hunger = ` 只许出现在"一次性应用副作用"之后', () => {
  const start = SRC.indexOf('    useItem: function (p) {');
  assert.ok(start > 0, '找不到 useItem handler');
  const marker = SRC.indexOf('// ===== 一次性应用副作用 + 扣减 + 落盘', start);
  assert.ok(marker > start, '找不到"一次性应用副作用"标记行（顺序段被删了？）');
  const effectPhase = SRC.slice(start, marker)
    .split('\n').filter((ln) => ln.trim().indexOf('//') !== 0).join('\n');   // 注释里引用的旧代码不算
  // 只禁"写"，不禁"读"（`s.skills[String(schSkill)]` 的读取是合法的，例如判断是否已学会）
  assert.ok(!/s\.skills\[[^\]]*\]\s*=[^=]/.test(effectPhase), '效果阶段不许直接写 s.skills（R13 §1 第 3 条）');
  assert.ok(effectPhase.indexOf('s.hunger =') < 0, '效果阶段不许直接写 s.hunger');
  assert.ok(!/persist\(\)/.test(effectPhase), '效果阶段不许落盘（只许最后一次性 persist）');
  const applyPhase = SRC.slice(marker, SRC.indexOf('var res = shaped', marker))
    .split('\n').filter((ln) => ln.trim().indexOf('//') !== 0).join('\n');
  assert.ok(applyPhase.indexOf('s.skills[pendingSkill]') >= 0, '一次性应用段必须真的把 pendingSkill 写进账本');
  assert.ok(applyPhase.indexOf('s.hunger = pendingHunger') >= 0, '一次性应用段必须真的把 pendingHunger 写进账本');
  assert.ok(applyPhase.indexOf('bagAdd(') >= 0 && applyPhase.indexOf('persist()') >= 0, '扣减与落盘必须同段');
});

T('T6 开关零值白名单的前提仍然成立：shapes.__switch.BeginTraining.isCollective === "switch"', () => {
  const sw = (typeof BZ_SHAPES !== 'undefined' && BZ_SHAPES.__switch) || {};
  assert.ok(sw.BeginTraining && sw.BeginTraining.isCollective === 'switch',
    '分类器把 isCollective 判成开关字段，所以 SWITCH_ZERO_OK 的豁免是必需的；这条变了要同步复核白名单');
});

T('T7 washAdditionalArr 的 eRet:4 是正常流程（弹选洗哪条），不许按选码规则改成 6', () => {
  const { s } = mk();
  const got = inner(s.dispatch('User', 'washAdditionalArr', {}), 'washAdditionalArr');
  assert.strictEqual(got.eRet, 4, '无 attrID 时必须回 4 让客户端弹 SetWashUI');
  assert.strictEqual(typeof got.attrList, 'string');
  assert.strictEqual(got.attrList.split('|').length, 4, 'attrList 必须 4 段（客户端 split("|") 后逐段取数值）');
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[r13-reject-codes] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
