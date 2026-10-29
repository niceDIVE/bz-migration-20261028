'use strict';
/**
 * gen_shapes.js —— 生成"每个动作该回哪些字段"的形状表
 *
 * 输入（全部只读）：
 *   tools/action_facts_all.json       812 动作：具名回调消费的响应字段 + 行号
 *   tools/action_facts_listener.json  249 动作：匿名监听器消费的响应字段 + 行号（extract_listeners.js 产出）
 *   tools/todo_shapes.json            120 个"上一轮已确认要补"的动作（保留，作为下限）
 *   tools/index.js                    客户端明文源码（行号 → 实际用法）
 *   hotfix-patch/core/templates.json        抓包真值模板
 *   hotfix-patch/core/bz-rpc-server.js      已实现 handler（跑一遍拿真实响应形状）
 *
 * 输出（只新建/覆盖自己生成的文件）：
 *   tools/shapes.json                            逐字段证据 + 置信度（嵌套路径用 "a.b" 表示）
 *   hotfix-patch/core/bz-shapes.generated.js     给 build-handlers 拼接的 JS 表（嵌套对象）
 *   tools/shapes_report.md                       人可读清单
 *
 * 置信度（高 → 低）：
 *   capture   抓包真值模板里的同名字段
 *   handler   已实现 handler 真实返回里的同名字段
 *   manual    主审逐条看源码后的人工判定（每条带行号）
 *   listener  匿名监听器里读到的字段（extract_listeners.js，带行号）
 *   init-N    客户端自己写的初值 `= [] / {} / 0`，N 处一致
 *   usage-N   源码里 N 处用法同类型
 *   name      只有命名启发
 *   fallback  无证据，标量 0 兜底
 *
 * 用法： node tools/gen_shapes.js           生成
 *        node tools/gen_shapes.js --stat    只打统计
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const P = {
  facts: path.join(ROOT, 'tools', 'action_facts_all.json'),
  listener: path.join(ROOT, 'tools', 'action_facts_listener.json'),
  todo: path.join(ROOT, 'tools', 'todo_shapes.json'),
  index: path.join(ROOT, 'tools', 'index.js'),
  tpl: path.join(ROOT, 'hotfix-patch', 'core', 'templates.json'),
  rpc: path.join(ROOT, 'hotfix-patch', 'core', 'bz-rpc-server.js'),
  outShapes: path.join(ROOT, 'tools', 'shapes.json'),
  outJs: path.join(ROOT, 'hotfix-patch', 'core', 'bz-shapes.generated.js'),
  outMd: path.join(ROOT, 'tools', 'shapes_report.md'),
};

const facts = JSON.parse(fs.readFileSync(P.facts, 'utf8'));
const listeners = fs.readFileSync(P.listener, 'utf8') ? JSON.parse(fs.readFileSync(P.listener, 'utf8')) : { actions: {} };
const todo = JSON.parse(fs.readFileSync(P.todo, 'utf8'));
const tpl = JSON.parse(fs.readFileSync(P.tpl, 'utf8'));
const src = fs.readFileSync(P.index, 'utf8').split(/\r?\n/);

const errv = [];
function jsonType(v) {
  if (Array.isArray(v)) return 'array';
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  return typeof v;
}

/* ============================================================
 * 证据源 A：抓包真值模板
 * ============================================================ */
const captureVals = Object.create(null);
function walkTemplate(obj, trail) {
  if (!obj || typeof obj !== 'object') return;
  for (const k of Object.keys(obj)) {
    if (k === 'achievement' || k === 'error' || k === 'p' || k === 'resultCode') continue;
    const v = obj[k];
    if (v === undefined) continue;
    const t = jsonType(v);
    (captureVals[k] = captureVals[k] || []).push({ value: v, type: t, evid: 'templates.json:' + trail + '.' + k });
    if (t === 'object') walkTemplate(v, trail + '.' + k);
  }
}
for (const name of Object.keys(tpl)) {
  const t = tpl[name];
  walkTemplate((t && t['User.' + name]) || t, name);
}

/* ============================================================
 * 证据源 B：已实现 handler 的真实返回
 * ============================================================ */
const { createBzServer } = require(P.rpc);
const probe = createBzServer({
  now: () => Date.now(), log: () => {}, templates: tpl, codec: null,
  readSave: () => null, writeSave: () => {},
});
const implemented = Object.keys(probe._internal.handlers);
const handlerVals = Object.create(null);
for (const name of implemented) {
  let r;
  try { r = probe.dispatch('User', name, {}); } catch (e) { errv.push('handler ' + name + ': ' + e); continue; }
  const inner = r && r['User.' + name];
  if (!inner || typeof inner !== 'object') continue;
  for (const k of Object.keys(inner)) {
    if (inner[k] === undefined) continue;
    (handlerVals[k] = handlerVals[k] || []).push({ value: inner[k], type: jsonType(inner[k]), evid: 'bz-rpc-server.js#' + name });
  }
}

/* ============================================================
 * 目标动作集合 = 老表待办 ∪ 监听器表（**含已实现动作**）
 *   形状是"契约"，不是"实现"：手写 handler 也必须有形状条目，
 *   由 dispatch 的 fillShape 补齐缺字段（只补缺不覆盖），自检再逐条验。
 *   唯一例外：扁平结构的账号层动作（quicklogin/Create/CheckName/GetChatAddress…），
 *   它们没有 "User.<动作>" 这一层，且本来就不读字段。
 * ============================================================ */
const FLAT_ACTIONS = new Set(['quicklogin', 'login', 'register', 'Create', 'CheckName', 'GetChatAddress', 'GetServerList']);
const implSet = new Set(implemented);
const target = Object.create(null);

function ensureAction(a) {
  return target[a] || (target[a] = { fields: Object.create(null), sources: [] });
}

for (const key of Object.keys(facts)) {
  const a = key.replace(/^User\./, '');
  if (FLAT_ACTIONS.has(a)) continue;
  const e = facts[key];
  if (!e) continue;
  if (!(e.response_fields || []).filter(f => f !== 'eRet').length) continue;
  const t = ensureAction(a);
  t.sources.push('facts');
  t.impl = implSet.has(a);
  t.constName = e.const || t.constName;
  t.consumers = (e.handlers || []).concat(t.consumers || []);
  for (const f of e.response_fields || []) {
    if (f === 'eRet') continue;
    t.fields[f] = t.fields[f] || { from: [] };
    t.fields[f].from.push('facts');
  }
}

for (const a of Object.keys(listeners.actions || {})) {
  if (FLAT_ACTIONS.has(a)) continue;
  const le = listeners.actions[a];
  const fields = (le.fields || []).filter(f => f !== 'eRet');
  if (!fields.length) continue;
  const t = ensureAction(a);
  t.sources.push('listener');
  if (implSet.has(a)) t.impl = true;
  t.constName = t.constName || le.constName;
  t.listenersAt = le.onLine;
  for (const f of fields) {
    t.fields[f] = t.fields[f] || { from: [] };
    t.fields[f].from.push('listener');
    if (le.hints && le.hints[f]) t.fields[f].hint = le.hints[f];
    if (le.fieldLines && le.fieldLines[f]) t.fields[f].line = le.fieldLines[f];
    if (le.evidence && le.evidence[f]) t.fields[f].evid = le.evidence[f];
  }
}

/* todo 清单里"只读 eRet"的动作也要有条目（客户端确实只看成功标志） */
for (const key of todo) {
  const a = key.replace(/^User\./, '');
  if (FLAT_ACTIONS.has(a) || target[a]) continue;
  const t = ensureAction(a);
  t.sources.push('todo-eRetOnly');
  const e = facts['User.' + a] || facts[a];
  t.constName = (e && e.const) || t.constName;
  t.impl = implSet.has(a);
}

/* ============================================================
 * 证据源 C/D：全源用法 + 客户端初值
 * ============================================================ */
const leafSet = new Set();
for (const a of Object.keys(target)) {
  for (const p of Object.keys(target[a].fields)) {
    const leaf = p.split('.').pop();
    leafSet.add(leaf);
    leafSet.add(p);
  }
}

const ARRAY_AFTER = /^\s*\.\s*(length|push|forEach|map|filter|join|sort|splice|concat|some|every|reduce|find|pop|shift|unshift)\b/;
const ARRAY_INDEX = /^\s*\[\s*\d/;
const STR_AFTER = /^\s*\.\s*(split|trim|toLowerCase|toUpperCase|replace|charAt|substring|substr)\b/;
const OBJ_METHOD = /^\s*\.\s*(hasOwnProperty|propertyIsEnumerable)\b/;
const OBJ_INDEX = /^\s*\[/;
const SUB_PROP = /^\s*\.\s*[A-Za-z_$][\w$]*\s*(?![(\w])/;
const METHOD_CALL = /^\s*\.\s*[A-Za-z_$][\w$]*\s*\(/;
const NUM_BEFORE = /(parseInt|parseFloat|Number)\s*\(\s*[A-Za-z_$][\w$]*\s*\.\s*$/;
const NUM_CMP_AFTER = /^\s*(===?|!==?)\s*-?\d/;
const NUM_CMP_BEFORE = /\d\s*(===?|!==?)\s*[A-Za-z_$][\w$]*\s*\.\s*$/;
const FORIN_BEFORE = /for\s*\(\s*(?:var\s+)?[A-Za-z_$][\w$]*\s+in\s+[A-Za-z_$][\w$]*\s*\.\s*$/;
const STR_CMP_AFTER = /^\s*(===?|!==?)\s*["']/;

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function classifyLine(line, name) {
  const re = new RegExp('\\.' + escapeRe(name) + '\\b', 'g');
  const hits = Object.create(null);
  let m;
  while ((m = re.exec(line)) !== null) {
    const start = m.index + m[0].length;
    const after = line.slice(start, start + 48);
    const before = line.slice(Math.max(0, m.index - 40), m.index);
    let t = null;
    if (ARRAY_AFTER.test(after) || ARRAY_INDEX.test(after)) t = 'array';
    else if (STR_AFTER.test(after) || STR_CMP_AFTER.test(after)) t = 'string';
    else if (OBJ_METHOD.test(after) || OBJ_INDEX.test(after) || FORIN_BEFORE.test(before)) t = 'object';
    else if (NUM_BEFORE.test(before) || NUM_CMP_AFTER.test(after) || NUM_CMP_BEFORE.test(before)) t = 'number';
    else if (SUB_PROP.test(after)) t = 'object';
    else if (METHOD_CALL.test(after)) t = null;
    if (t) hits[t] = (hits[t] || 0) + 1;
  }
  const keys = Object.keys(hits);
  if (!keys.length) return null;
  return keys.sort((x, y) => hits[y] - hits[x])[0];
}

const globalHits = Object.create(null);
const ACCESS_RE = /\.([A-Za-z_$][\w$]*)/g;
for (let i = 0; i < src.length; i++) {
  const line = src[i];
  if (line.indexOf('.') < 0) continue;
  ACCESS_RE.lastIndex = 0;
  let m;
  while ((m = ACCESS_RE.exec(line)) !== null) {
    const f = m[1];
    if (!leafSet.has(f)) continue;
    const arr = globalHits[f] || (globalHits[f] = []);
    if (arr.length >= 10) continue;
    if (arr[arr.length - 1] !== i + 1) arr.push(i + 1);
  }
}

const usageVotes = Object.create(null);
for (const f of Object.keys(globalHits)) {
  for (const ln of globalHits[f]) {
    const t = classifyLine(src[ln - 1] || '', f);
    if (!t) continue;
    const bucket = usageVotes[f] || (usageVotes[f] = Object.create(null));
    (bucket[t] = bucket[t] || []).push({ line: ln });
  }
}

const INIT_RE = /\.([A-Za-z_$][\w$]*)\s*=\s*(\{\}|\[\]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|!0|!1|-?\d+(?:\.\d+)?|new\s+[A-Za-z_$][\w$.]*)/g;
const initVals = Object.create(null);
function initTypeOf(lit) {
  if (lit === '{}') return 'object';
  if (lit === '[]') return 'array';
  if (lit === '!0' || lit === '!1') return 'boolean';
  if (lit[0] === '"' || lit[0] === "'") return 'string';
  if (/^-?\d/.test(lit)) return 'number';
  if (/^new\s/.test(lit)) return 'object';
  return null;
}
for (let i = 0; i < src.length; i++) {
  const line = src[i];
  if (line.indexOf('=') < 0) continue;
  INIT_RE.lastIndex = 0;
  let m;
  while ((m = INIT_RE.exec(line)) !== null) {
    const f = m[1];
    if (!leafSet.has(f)) continue;
    const t = initTypeOf(m[2]);
    if (!t) continue;
    const arr = initVals[f] || (initVals[f] = []);
    if (arr.length < 6) arr.push({ type: t, line: i + 1 });
  }
}

/* ============================================================
 * 人工判定表（主审逐条看过源码；每条必带行号）
 * ============================================================ */
const MANUAL = {
  // 2026-10-22 修正：下面 4 条的 evid 原来指错了行（行里根本不含该字段名），已换成真实的读取行。
  // 教训：manual 也要过 tools/audit_shapes_evidence.js，否则"人工判定"会变成"人工幻觉"。
  activityShows: { type: 'array', evid: ['index.js:57455  e.hasOwnProperty("activityShows") && (this.activeShowList = e.activityShows);'] },
  childName: { type: 'string', evid: ['index.js:24867  childData.childName.length（人名，字符串）'] },
  giftAwards: { type: 'array', evid: ['index.js:131097  dispatch(REFRESH_GIFT_STATE, e.giftAwards)'] },
  giftDatas: { type: 'array', evid: ['index.js:131054  data: e.giftDatas'] },
  innSimShopDatas: { type: 'array', evid: ['index.js:62598  setData(e.innSimShopDatas)'] },
  newAcc: { type: 'string', evid: ['scripts3.js:95797  ... o.hasOwnProperty("newAcc") && (s = o.newAcc);'] },
  sendurl: { type: 'string', evid: ['index.js:28126  o.oldUrlAll = e.sendurl（URL）'] },
  unlockDish: { type: 'array', evid: ['index.js:62251  for (var o = e.unlockDish, ...; o.length; ...) o[l]'] },
  FashionTimeMap: { type: 'object', evid: ['index.js:75623  1 == e.type && this.setFashionTime(e.FashionTimeMap);'] },
};

/* ============================================================
 * 命名启发 + 已知复合体
 * ============================================================ */
const NAME_ARRAY = /(List|Arr|Ary|Ids|IDs|Strs)$/;
const NAME_OBJECT = /(Obj|Map|Data|Info|Table|Dict|Config|Bag|note|Note|skch|ivch|eqch|attrch|eco)$/;
function nameHeuristic(f) {
  if (NAME_ARRAY.test(f)) return 'array';
  if (NAME_OBJECT.test(f)) return 'object';
  return null;
}
const KNOWN_OBJECT = {
  note: { eco: {}, attrch: {}, skch: {}, ivch: {}, eqch: {} },
  rewardArray: {},
  equipObj: {},
  itemObj: {},
};

function emptyFor(type, leaf) {
  if (type === 'array') return [];
  if (type === 'object') return KNOWN_OBJECT[leaf] !== undefined ? JSON.parse(JSON.stringify(KNOWN_OBJECT[leaf])) : {};
  if (type === 'string') return '';
  if (type === 'boolean') return false;
  return 0;
}

function resolveLeaf(field, spec) {
  const leaf = field.split('.').pop();
  if (captureVals[leaf] && captureVals[leaf].length) {
    const list = captureVals[leaf];
    const cnt = Object.create(null);
    for (const v of list) cnt[v.type] = (cnt[v.type] || 0) + 1;
    const type = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    const hit = list.find(v => v.type === type);
    let value = type === 'array' ? [] : type === 'object' ? emptyFor('object', leaf) : (hit ? hit.value : emptyFor(type, leaf));
    return { type, value, conf: 'capture', evid: list.slice(0, 2).map(v => v.evid) };
  }
  if (handlerVals[leaf] && handlerVals[leaf].length) {
    const list = handlerVals[leaf];
    const type = jsonType(list[0].value);
    const value = type === 'array' ? [] : type === 'object' ? emptyFor('object', leaf) : list[0].value;
    return { type, value, conf: 'handler', evid: list.slice(0, 2).map(v => v.evid) };
  }
  if (MANUAL[leaf]) return { type: MANUAL[leaf].type, value: emptyFor(MANUAL[leaf].type, leaf), conf: 'manual', evid: MANUAL[leaf].evid };
  if (spec && spec.hint === 'array') return { type: 'array', value: [], conf: 'listener', evid: ['index.js:' + spec.line + '  ' + (spec.evid || '')] };
  if (spec && spec.hint === 'object') return { type: 'object', value: emptyFor('object', leaf), conf: 'listener', evid: ['index.js:' + spec.line + '  ' + (spec.evid || '')] };
  const uv = usageVotes[leaf];
  if (uv) {
    const ranked = Object.keys(uv).sort((a, b) => uv[b].length - uv[a].length);
    const type = ranked[0];
    return { type, value: emptyFor(type, leaf), conf: 'usage-' + uv[type].length, evid: uv[type].slice(0, 2).map(x => 'index.js:' + x.line) };
  }
  const iv = initVals[leaf];
  if (iv && iv.length) {
    const cnt = Object.create(null);
    for (const x of iv) cnt[x.type] = (cnt[x.type] || 0) + 1;
    const type = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    return { type, value: emptyFor(type, leaf), conf: 'init-' + cnt[type], evid: iv.filter(x => x.type === type).slice(0, 2).map(x => 'index.js:' + x.line) };
  }
  const hv = nameHeuristic(leaf);
  if (hv) return { type: hv, value: emptyFor(hv, leaf), conf: 'name', evid: ['命名启发 ' + leaf] };
  if (spec && spec.line) return { type: 'number', value: 0, conf: 'listener-1', evid: ['index.js:' + spec.line + '  ' + (spec.evid || '')] };
  return { type: 'number', value: 0, conf: 'fallback', evid: [] };
}

/* ============================================================
 * 组装（嵌套路径 → 嵌套对象）
 * ============================================================ */
function setPath(root, dotted, value) {
  const parts = dotted.split('.');
  let cur = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (typeof cur[k] !== 'object' || cur[k] === null || Array.isArray(cur[k])) cur[k] = {};
    cur = cur[k];
  }
  const leaf = parts[parts.length - 1];
  if (cur[leaf] === undefined) cur[leaf] = value;
}

const out = Object.create(null);
const stat = { actions: 0, fields: 0, byConf: Object.create(null), byType: Object.create(null), bySource: Object.create(null) };

for (const action of Object.keys(target).sort()) {
  const t = target[action];
  const specs = Object.create(null);
  const payload = { eRet: 1 };
  specs.eRet = { type: 'number', value: 1, conf: 'capture', evid: ['所有真实响应均以 eRet:1 表示成功'] };

  // 先把父路径标成对象（note.attrch 存在 → note 是对象）
  for (const p of Object.keys(t.fields)) {
    const parts = p.split('.');
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(0, i).join('.');
      if (!t.fields[parent]) t.fields[parent] = { from: ['implied'] };
    }
  }

  for (const p of Object.keys(t.fields).sort()) {
    if (p === 'eRet') continue;
    const spec = t.fields[p];
    let r;
    if (p.indexOf('.') >= 0) {
      // 父级一定是对象
      r = { type: 'object', value: {}, conf: 'listener', evid: ['由子字段 ' + p + ' 推出'] };
      if (!Object.keys(t.fields).some(x => x.indexOf(p + '.') === 0)) {
        const leafName = p.split('.').pop();
        const sub = resolveLeaf(p, spec);
        r = { type: 'object', value: emptyFor('object', leafName), conf: sub.conf, evid: sub.evid };
      }
    } else {
      r = resolveLeaf(p, spec);
    }
    specs[p] = r;
    setPath(payload, p, r.value);
    stat.fields++;
    stat.byConf[r.conf] = (stat.byConf[r.conf] || 0) + 1;
    stat.byType[r.type] = (stat.byType[r.type] || 0) + 1;
  }

  stat.actions++;
  for (const s of t.sources) stat.bySource[s] = (stat.bySource[s] || 0) + 1;

  out[action] = {
    constName: t.constName || '',
    consumers: (t.consumers || []).filter(Boolean),
    sources: t.sources,
    impl: !!t.impl,
    fields: specs,
    payload,
  };
}

/* ---------- 待复核清单 ---------- */
const needAudit = [];
for (const action of Object.keys(out)) {
  for (const f of Object.keys(out[action].fields)) {
    const c = out[action].fields[f].conf;
    if (c === 'fallback' || c === 'name' || /^usage-1$/.test(c) || /^init-1$/.test(c) || c === 'listener-1') {
      needAudit.push({ action, field: f, conf: c, type: out[action].fields[f].type, evid: out[action].fields[f].evid });
    }
  }
}

/* ---------- 落盘 ---------- */
const result = {
  generatedAt: new Date().toISOString(),
  sources: {
    facts: 'tools/action_facts_all.json (812 具名回调)',
    listeners: 'tools/action_facts_listener.json (' + Object.keys(listeners.actions || {}).length + ' 匿名监听器)',
    todo: 'tools/todo_shapes.json (120)',
    capture: 'hotfix-patch/core/templates.json',
    handlers: 'hotfix-patch/core/bz-rpc-server.js (' + implemented.length + ' 已实现)',
    clientSource: 'tools/index.js',
  },
  stat,
  needAuditCount: needAudit.length,
  needAudit,
  actions: out,
  shapes: out,   // 兼容旧字段名（check_shapes 早先用 shapes）
  errors: errv,
};

if (process.argv.includes('--stat')) {
  console.log(JSON.stringify({ stat, needAuditCount: needAudit.length, implemented: implemented.length }, null, 1));
  process.exit(0);
}

fs.writeFileSync(P.outShapes, JSON.stringify(result, null, 1), 'utf8');

/* --- JS 表 --- */
const js = [];
js.push('/* bz-shapes.generated.js —— 由 tools/gen_shapes.js 自动生成，勿手改');
js.push(' * 覆盖 ' + stat.actions + ' 个动作 / ' + stat.fields + ' 个字段位；生成于 ' + result.generatedAt);
js.push(' * 数据源：具名回调表 + 匿名监听器表 + 抓包真值 + 真实 handler + 客户端初值与用法');
js.push(' * 规则：eRet 恒 1；其余字段按"客户端真的会读它"的类型给空值。目的只到"不崩、不乱跳分支"。 */');
js.push('var BZ_SHAPES = {');
for (const a of Object.keys(out)) {
  js.push('  ' + JSON.stringify(a) + ': ' + JSON.stringify(out[a].payload) + ',');
}
js.push('};');
js.push('BZ_SHAPES.__meta = { total: ' + stat.actions + ', fields: ' + stat.fields + ', gen: ' + JSON.stringify(result.generatedAt) + ' };');
js.push('BZ_SHAPES.__impl = ' + JSON.stringify(Object.keys(out).filter(a => out[a].impl)) + ';');
js.push('');
fs.writeFileSync(P.outJs, js.join('\n'), 'utf8');

/* --- 人可读清单 --- */
const md = [];
md.push('# 形状表清单（tools/gen_shapes.js 自动生成，勿手改）');
md.push('');
md.push('- 生成时间：' + result.generatedAt);
md.push('- 动作 **' + stat.actions + '**，字段位 **' + stat.fields + '**，已实现跳过 ' + implemented.length);
md.push('- 来源：' + Object.keys(stat.bySource).map(k => k + '=' + stat.bySource[k]).join('、'));
md.push('- 置信度：' + Object.keys(stat.byConf).sort().map(k => k + '=' + stat.byConf[k]).join('、'));
md.push('- 类型：' + Object.keys(stat.byType).map(k => k + '=' + stat.byType[k]).join('、'));
md.push('- 待复核：**' + needAudit.length + '** 条');
md.push('');
md.push('| 动作 | 来源 | 应答形状 |');
md.push('|---|---|---|');
for (const a of Object.keys(out)) {
  md.push('| ' + a + ' | ' + out[a].sources.join('+') + ' | `' + JSON.stringify(out[a].payload) + '` |');
}
md.push('');
fs.writeFileSync(P.outMd, md.join('\n'), 'utf8');

console.log(JSON.stringify({
  ok: true, actions: stat.actions, fields: stat.fields,
  bySource: stat.bySource, byConf: stat.byConf, byType: stat.byType,
  needAudit: needAudit.length,
  wrote: [P.outShapes, P.outJs, P.outMd].map(p => path.relative(ROOT, p)),
}, null, 1));
