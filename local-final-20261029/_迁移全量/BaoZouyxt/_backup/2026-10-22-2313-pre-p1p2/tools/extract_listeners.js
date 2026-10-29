'use strict';
/**
 * extract_listeners.js —— 扫客户端源码里「匿名回调」形式的响应消费者
 *
 * 为什么需要它：
 *   action_facts_all.json 只认得出「具名回调」(`on(CMD, this.foo, this)`)，
 *   而大量动作用的是匿名函数 `MessageCenter.on(a.HttpConst.X, function(t, e) { ... e.note.skch ... })`。
 *   这些动作在旧表里被误判成「只需 ACK」，实际客户端会读字段 —— 例如 User.useItem 读 e.note.skch，
 *   我们只回 {eRet:1} 就会在客户端抛 a.note.hasOwnProperty 的 TypeError。
 *
 * 做法：
 *   1) 解析 HttpConst 表：`NAME: "User.action"` → 常量名 → 动作名
 *   2) 找 `MessageCenter.on(<ns>.HttpConst.<NAME>, function(<p1>, <p2>) { ... })`
 *   3) 从回调体里抽 `p2.<字段>` 与 `p2.hasOwnProperty("<字段>")`（含两级路径，如 note.skch）
 *   4) 输出 tools/action_facts_listener.json：动作 → 字段列表 + 行号 + 源码片段
 *
 * 用法： node tools/extract_listeners.js
 *        node tools/extract_listeners.js --stat
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'tools', 'index.js');
const OUT = path.join(ROOT, 'tools', 'action_facts_listener.json');

const lines = fs.readFileSync(SRC, 'utf8').split(/\r?\n/);

/* ---------- 1. HttpConst 表 ---------- */
const constMap = Object.create(null);   // NAME -> {action, line}
const CONST_RE = /^\s*([A-Z][A-Z0-9_]*)\s*:\s*"User\.([A-Za-z0-9_]+)"\s*,?\s*$/;
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(CONST_RE);
  if (m) constMap[m[1]] = { action: m[2], line: i + 1 };
}

/* ---------- 2. 找匿名回调 ---------- */
// MessageCenter.on( <任何东西>.HttpConst.<NAME>, function ( a , b ) {
const ON_RE = /\.on\(\s*[A-Za-z_$][\w$]*\.HttpConst\.([A-Z][A-Z0-9_]*)\s*,\s*function\s*\(\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)\s*\)\s*\{/;

function bodyOf(startLine) {
  // 从起始行开始做括号配平（跳过字符串字面量里的花括号），最多 120 行
  let depth = 0, started = false;
  const buf = [];
  for (let i = startLine; i < Math.min(lines.length, startLine + 120); i++) {
    const s = lines[i];
    buf.push(s);
    let inS = 0;   // 0 无，' 单引号，'d' 双引号
    for (let j = 0; j < s.length; j++) {
      const c = s[j];
      if (inS) { if (c === inS && s[j - 1] !== '\\') inS = 0; continue; }
      if (c === '"' || c === "'") { inS = c; continue; }
      if (c === '{') { depth++; started = true; }
      else if (c === '}') { depth--; if (started && depth <= 0) return { text: buf, endLine: i + 1 }; }
    }
  }
  return { text: buf, endLine: startLine + buf.length };
}

const FIELD_RE = (p2) => new RegExp('\\b' + p2 + '\\.([A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*)?)', 'g');
const HAS_RE = (p2) => new RegExp('\\b' + p2 + '\\.hasOwnProperty\\(\\s*"([A-Za-z_$][\\w$]*)"\\s*\\)', 'g');

/** 把 `note.hasOwnProperty` / `attArr.length` 这类访问还原成「字段 + 类型提示」 */
function normalize(pathStr) {
  if (pathStr.endsWith('.hasOwnProperty')) return { field: pathStr.slice(0, -15), hint: 'object' };
  if (pathStr.endsWith('.length')) return { field: pathStr.slice(0, -7), hint: 'array' };
  return { field: pathStr, hint: null };
}

/** 噪声：压缩代码里同名参数常被当成模块别名用（a.HttpConst.X、a.EvName.Y…），一律不算响应字段 */
const NOISE_FIRST = /^(HttpConst|EvName|NetMgr|MessageCenter|RoleBaseInfo|RoleOtherInfo|TimeMgr|LocalStorageMgr|InventoryDB|InventoryModel|GuideMgr|GSceneMgr|PopUpMgr|TaskModel|TaskMgr|MarryModel|BrushNpcModel|SkillTable|ActiveModel|StoreModel|DelegateModel|EquipSplitModel|LevelBonusModel|MapBoxModel|GoodEvilModel|BattleMgr|LoginMgr|MadUtilsTS|TESDKHelper|cc|window|this|Object|JSON|Math|String|Number|Array)$/;

function isNoise(field) {
  const first = field.split('.')[0];
  return NOISE_FIRST.test(first);
}

const result = Object.create(null);   // action -> {fields:{field:{line,text,hint}}, constName, span}
let scanned = 0;

for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(ON_RE);
  if (!m) continue;
  const constName = m[1];
  const meta = constMap[constName];
  if (!meta) continue;
  const p2 = m[3];
  const { text, endLine } = bodyOf(i);
  scanned++;

  const entry = result[meta.action] || (result[meta.action] = {
    constName, onLine: i + 1, span: [i + 1, endLine], fields: Object.create(null),
  });

  const put = (raw, ln, line, isCall) => {
    // 2026-10-22 修：`o.addComponent("X")` / `o.setLabelTitle(..)` / `o.dataArr.pop()` 原来会被当成
    // 应答字段（addComponent / setLabelTitle / dataArr.pop），进形状表后污染了 10 个字段位。
    // 规则：捕获到的路径若紧跟 "("，说明它是**方法调用**：
    //   - 单段（addComponent）→ 没有父对象，整条丢弃
    //   - 多段（dataArr.pop）→ 去掉最后一段，只保留父字段（dataArr），它才可能是真的数组字段
    let path = raw;
    if (isCall) {
      const cut = path.lastIndexOf('.');
      if (cut <= 0) return;
      path = path.slice(0, cut);
    }
    const { field, hint } = normalize(path);
    if (!field || field === 'hasOwnProperty' || field === 'length' || isNoise(field)) return;
    const cur = entry.fields[field];
    if (!cur) entry.fields[field] = { line: ln, text: line.trim().slice(0, 150), hint };
    else if (!cur.hint && hint) cur.hint = hint;
  };

  for (let k = 0; k < text.length; k++) {
    const ln = i + 1 + k;
    const line = text[k];
    let mm;
    const reF = FIELD_RE(p2);
    while ((mm = reF.exec(line)) !== null) {
      const after = line.slice(mm.index + mm[0].length).replace(/^\s+/, '');
      put(mm[1], ln, line, after.charAt(0) === '(');
    }
    const reH = HAS_RE(p2);
    while ((mm = reH.exec(line)) !== null) put(mm[1], ln, line, false);
  }
}

/* ---------- 3. 输出 ---------- */
const out = Object.create(null);
let totalFields = 0;
for (const action of Object.keys(result)) {
  const e = result[action];
  const fields = Object.keys(e.fields).sort();
  totalFields += fields.length;
  out[action] = {
    constName: e.constName,
    onLine: e.onLine,
    span: e.span,
    fields,
    hints: Object.fromEntries(fields.filter(f => e.fields[f].hint).map(f => [f, e.fields[f].hint])),
    fieldLines: Object.fromEntries(fields.map(f => [f, e.fields[f].line])),
    evidence: Object.fromEntries(fields.slice(0, 6).map(f => [f, e.fields[f].text])),
  };
}

const doc = {
  generatedAt: new Date().toISOString(),
  source: 'tools/index.js',
  method: 'MessageCenter.on(<ns>.HttpConst.NAME, function(p1, p2){...}) 匿名回调 + 括号配平 + p2.字段 抽取',
  stats: { consts: Object.keys(constMap).length, listeners: scanned, actions: Object.keys(out).length, fields: totalFields },
  actions: out,
};

if (process.argv.includes('--stat')) {
  console.log(JSON.stringify(doc.stats, null, 1));
  const top = Object.keys(out).sort((a, b) => out[b].fields.length - out[a].fields.length).slice(0, 15);
  for (const a of top) console.log('  ' + a.padEnd(28) + out[a].fields.join(','));
  process.exit(0);
}

fs.writeFileSync(OUT, JSON.stringify(doc, null, 1), 'utf8');
console.log(JSON.stringify({ ok: true, ...doc.stats, wrote: path.relative(ROOT, OUT) }, null, 1));
