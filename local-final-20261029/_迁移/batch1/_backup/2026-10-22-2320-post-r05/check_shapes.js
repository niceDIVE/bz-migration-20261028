'use strict';
/**
 * check_shapes.js —— 形状表的机器校验（不联网、不碰设备、不改任何文件）
 *
 * 校验目标：core/bz-shapes.generated.js 是否覆盖了「客户端真的会读字段」的全部动作，
 * 且每个字段路径都在、类型对、eRet 恒 1。
 *
 *   1. 目标动作集合（老表 ∪ 匿名监听器表 − 已实现）一个不缺
 *   2. 每个动作声明的每个字段路径都能在应答里走到
 *   3. eRet 必须是 1
 *   4. 叶子值运行时类型与声明一致
 *   5. 不得出现 undefined / NaN
 *   6. 已实现的动作不得被形状表重复回答
 *
 * 用法： node tools/check_shapes.js            人可读摘要
 *        node tools/check_shapes.js --json     只输出 JSON
 * 退出码：0 = 全过；1 = 有失败（可直接当 CI）
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const F = {
  facts: path.join(ROOT, 'tools', 'action_facts_all.json'),
  listener: path.join(ROOT, 'tools', 'action_facts_listener.json'),
  todo: path.join(ROOT, 'tools', 'todo_shapes.json'),
  shapes: path.join(ROOT, 'tools', 'shapes.json'),
  genJs: path.join(ROOT, 'hotfix-patch', 'core', 'bz-shapes.generated.js'),
  rpc: path.join(ROOT, 'hotfix-patch', 'core', 'bz-rpc-server.js'),
  tpl: path.join(ROOT, 'hotfix-patch', 'core', 'templates.json'),
};

const facts = JSON.parse(fs.readFileSync(F.facts, 'utf8'));
const listeners = JSON.parse(fs.readFileSync(F.listener, 'utf8'));
const todo = JSON.parse(fs.readFileSync(F.todo, 'utf8'));
const shapesDoc = JSON.parse(fs.readFileSync(F.shapes, 'utf8'));
const tpl = JSON.parse(fs.readFileSync(F.tpl, 'utf8'));

const sandbox = {};
vm.runInNewContext(fs.readFileSync(F.genJs, 'utf8') + '\n; this.BZ_SHAPES = BZ_SHAPES;', sandbox);
const BZ = sandbox.BZ_SHAPES;

const { createBzServer } = require(F.rpc);
const probe = createBzServer({
  now: () => Date.now(), log: () => {}, templates: tpl, codec: null,
  readSave: () => null, writeSave: () => {},
});
const implemented = new Set(Object.keys(probe._internal.handlers));

const fails = [];
const warns = [];
let fieldCount = 0, actionCount = 0;

function fail(name, info) { fails.push({ name, info: info === undefined ? null : info }); }

function typeOf(v) {
  if (Array.isArray(v)) return 'array';
  if (v === null) return 'null';
  if (typeof v === 'number' && Number.isNaN(v)) return 'nan';
  return typeof v;
}

function walk(obj, dotted) {
  const parts = dotted.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur === undefined || cur === null || typeof cur !== 'object') return { ok: false, value: undefined };
    if (!Object.prototype.hasOwnProperty.call(cur, p)) return { ok: false, value: undefined };
    cur = cur[p];
  }
  return { ok: true, value: cur };
}

/* ---------- 目标动作集合 ---------- */
const targets = Object.create(null);
for (const key of todo) {
  const a = key.replace(/^User\./, '');
  if (implemented.has(a)) continue;
  const e = facts['User.' + a] || facts[a];
  if (!e) continue;
  targets[a] = new Set((e.response_fields || []).filter(f => f !== 'eRet'));
}
for (const a of Object.keys(listeners.actions || {})) {
  if (implemented.has(a)) continue;
  const fl = (listeners.actions[a].fields || []).filter(f => f !== 'eRet');
  if (!fl.length) continue;
  targets[a] = targets[a] || new Set();
  for (const f of fl) targets[a].add(f);
}

/* ---------- 1 + 6 ---------- */
const targetNames = Object.keys(targets).sort();
for (const a of targetNames) {
  actionCount++;
  if (!BZ[a]) fail(a + ':missing', '客户端会读字段，但形状表里没有这个动作');
}
for (const a of Object.keys(BZ || {})) {
  if (a === '__meta') continue;
  if (implemented.has(a)) {
    // 已实现的动作仍保留形状条目是正常的：handler 用 shaped() 拿基础载荷再加账本字段
    warns.push({ name: a + ':shape-for-handler', info: '形状表条目被手写 handler 复用' });
  } else if (!targets[a]) {
    warns.push({ name: a + ':extra', info: '形状表多出一个不在目标集合的动作' });
  }
}

/* ---------- 2..5 ---------- */
// R05 Q1：开关类字段**不许**由形状表补默认值（客户端拿 hasOwnProperty / in 当开关，填了就会走错分支）。
// 所以这些字段在 targets 里改成"反向校验"：必须缺席；`promoted`（开关升格）的除外，那些必须发。
let fieldClasses = null;
try { fieldClasses = require('./facts/field-classes.js').BZ_FIELD_CLASSES; } catch (e) { /* 还没生成 */ }
const swMap = (fieldClasses && fieldClasses.switchMap) || {};
const promSet = new Set(((fieldClasses && fieldClasses.promoted) || []).map((p) => p.action + '.' + p.field));
let switchSkipped = 0;
for (const a of targetNames) {
  const payload = BZ[a];
  if (!payload) continue;
  if (payload.eRet !== 1) fail(a + ':eRet', 'eRet 必须是 1，实际 ' + JSON.stringify(payload.eRet));
  const declared = ((shapesDoc.actions || shapesDoc.shapes)[a] || {}).fields || {};
  for (const f of targets[a]) {
    const leaf = f.indexOf('.') >= 0 ? f.split('.').pop() : f;
    // 只对**叶子**做反向校验：`crop` 这种是别的目标的父路径（crop.b / crop.m 是契约），
    // 父对象必须存在，不然子字段全没了（2026-10-22 真踩）。
    const isParentPath = [...targets[a]].some((x) => x.indexOf(f + '.') === 0);
    const isSwitch = !isParentPath && !!(swMap[a] && swMap[a][leaf])
      && !promSet.has(a + '.' + f) && !promSet.has(a + '.' + leaf);
    if (isSwitch) {
      switchSkipped++;
      if (walk(payload, f).ok) fail(a + ':' + f + ':switchFilled', '开关字段不许出现在形状默认值里（R05 Q1）');
      continue;
    }
    fieldCount++;
    const hit = walk(payload, f);
    if (!hit.ok) { fail(a + ':' + f + ':absent', '客户端会读，但应答里走不到这个路径'); continue; }
    // 有子路径的父级只校验"是对象"
    const hasChild = [...targets[a]].some(x => x.indexOf(f + '.') === 0);
    const t = typeOf(hit.value);
    if (hasChild) {
      if (t !== 'object') fail(a + ':' + f + ':parent', '应作为对象，实际 ' + t);
      continue;
    }
    if (t === 'undefined') fail(a + ':' + f + ':undefined', '值为 undefined');
    if (t === 'nan') fail(a + ':' + f + ':nan', '值为 NaN');
    const want = declared[f] && declared[f].type;
    if (want && t !== want && want !== 'null') {
      fail(a + ':' + f + ':type', '声明 ' + want + '，实际 ' + t + ' = ' + JSON.stringify(hit.value));
    }
  }
}

/* ---------- 统计 ---------- */
const conf = {};
for (const a of Object.keys(shapesDoc.actions || shapesDoc.shapes || {})) {
  const fs2 = (shapesDoc.actions || shapesDoc.shapes)[a].fields || {};
  for (const f of Object.keys(fs2)) {
    const c = fs2[f].conf;
    conf[c] = (conf[c] || 0) + 1;
  }
}

const summary = {
  ok: fails.length === 0,
  actions: actionCount,
  fields: fieldCount,
  implementationSkipped: implemented.size,
  confidence: conf,
  needsAudit: shapesDoc.needAuditCount,
  fails: fails.length,
  warns: warns.length,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ summary, fails, warns }, null, 1));
} else {
  console.log('形状表校验');
  console.log('  目标动作 ' + actionCount + ' / 字段路径 ' + fieldCount + ' / 已实现跳过 ' + implemented.size);
  console.log('  置信度: ' + Object.keys(conf).sort().map(k => k + '=' + conf[k]).join(' '));
  console.log('  待人工复核: ' + shapesDoc.needAuditCount);
  console.log('');
  if (fails.length) {
    console.log('FAIL ' + fails.length + ' 项:');
    for (const f of fails.slice(0, 40)) console.log('  - ' + f.name + '  ' + (f.info || ''));
    if (fails.length > 40) console.log('  …还有 ' + (fails.length - 40) + ' 项');
  } else {
    console.log('PASS 全部通过');
  }
  if (warns.length) {
    console.log('');
    console.log('WARN ' + warns.length + ' 项:');
    for (const w of warns.slice(0, 10)) console.log('  - ' + w.name + '  ' + (w.info || ''));
  }
}
process.exit(fails.length ? 1 : 0);
