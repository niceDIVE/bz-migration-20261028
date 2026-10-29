#!/usr/bin/env node
// 从 M2（客户端读点索引）+ M1（动作全集 tsv）生成 contracts.json
// 用法：node host/build-contracts.js --m2 M2.md --m1 M1.tsv [--overrides config/contract-overrides.json] --out out/contracts.json
'use strict';
const fs = require('fs');
const path = require('path');
const { args, sha8, writeJSON } = require('./lib/util');

const a = args(process.argv.slice(2));
if (!a.m2 || !a.m1 || !a.out) {
  console.error('需要 --m2 --m1 --out');
  process.exit(2);
}
const m2 = fs.readFileSync(a.m2, 'utf8');
const m1 = fs.readFileSync(a.m1, 'utf8');

// ---- M1：KEY -> VALUE（只覆盖 o.HttpConst；HttpConst3 等不在其中）
const keyToValue = {};
const m1Rows = {};
for (const line of m1.split(/\r?\n/).slice(1)) {
  if (!line.trim()) continue;
  const [KEY, VALUE, handler, on, send, code] = line.split('\t');
  keyToValue[KEY] = VALUE;
  m1Rows[KEY] = { handler: +handler, on: +on, send: +send, code: +code };
}

// ---- M2：按 "### <事件表达式>  [file:line]" 切段
const sections = m2.split(/\n(?=### )/).filter(s => s.startsWith('### '));
const contracts = {}; // id -> contract
const FK_RE = /\b[a-zA-Z_$]\.([A-Za-z_$][\w$]*)(?:\.([A-Za-z_$][\w$]*))?\]?\s*,\s*"([A-Za-z_][\w]*)"\s*\)/;

function eventInfo(expr) {
  // 返回 {ns, key}
  const m = expr.match(/(?:^|\.)((?:HttpConst\d*)|EvName\d*)\.([A-Z0-9_]+)$/);
  if (m) return { ns: m[1], key: m[2] };
  if (/^[A-Z][A-Z0-9_]+$/.test(expr)) return { ns: 'HttpConst', key: expr }; // M2 对 HttpConst 常量直接写裸名
  return null;
}

let parsedSites = 0, skipped = 0;
for (const sec of sections) {
  const head = sec.match(/^### (\S+)\s+\[([^:\]]+):(\d+)\]/);
  if (!head) { skipped++; continue; }
  const [, expr, file, line] = head;
  const ev = eventInfo(expr);
  if (!ev || ev.ns.startsWith('EvName')) { skipped++; continue; } // 只收协议动作
  parsedSites++;
  const named = /注册形态：命名处理器/.test(sec);
  const handlerName = (sec.match(/处理器：`([^`]+)`/) || [])[1] || null;
  const id = ev.ns === 'HttpConst' ? ev.key : `${ev.ns}.${ev.key}`;
  const c = contracts[id] || (contracts[id] = {
    id,
    ns: ev.ns,
    key: ev.key,
    action: ev.ns === 'HttpConst' ? (keyToValue[ev.key] || null) : null,
    m1: m1Rows[ev.key] && ev.ns === 'HttpConst' ? m1Rows[ev.key] : null,
    sites: [],
    fields: {},
    closed: true,
    openReasons: [],
  });
  c.sites.push({ file, line: +line, form: named ? 'named' : 'inline', handler: handlerName });
  if (named) {
    c.closed = false;
    c.openReasons.push(`命名处理器 ${handlerName} @${file}:${line} 函数体未展开`);
  }
  const rows = sec.split('\n').filter(l => /^\| `/.test(l));
  if (!named && rows.length === 0) {
    c.closed = false;
    c.openReasons.push(`内联但 0 读取 @${file}:${line}（可能跨函数读取，见 LoadGame 先例）`);
  }
  for (const r of rows) {
    const cells = r.split('|').map(s => s.trim());
    const field = cells[1].replace(/`/g, '');
    const ln = +cells[2];
    const mode = cells[3];
    const src = cells.slice(4, -1).join('|').replace(/^`|`$/g, '');
    const f = c.fields[field] || (c.fields[field] = { reads: [], switch: false, plain: false, fk: null, nested: null });
    f.reads.push({ file, line: ln, mode });
    if (mode === 'hasOwnProperty') f.switch = true;
    if (mode === '属性读' || mode === '方法调用') f.plain = true;
    const fk = src.match(FK_RE);
    if (fk && fk[1] === field) {
      if (fk[2]) f.nested = { path: fk[2], table: fk[3] };
      else f.fk = fk[3];
    }
  }
}

// 去重 openReasons，排序
for (const c of Object.values(contracts)) {
  c.openReasons = [...new Set(c.openReasons)];
  c.sites.sort((x, y) => (x.file + x.line).localeCompare(y.file + y.line));
}

// ---- overrides：人工/其他来源补充的必回字段、已展开的命名处理器等
let overrides = {};
// --overrides 可给多个文件，逗号分隔；靠后的覆盖靠前的（建议：自动展开结果在前，人工条目在后）
for (const f of String(a.overrides || '').split(',').filter(Boolean)) if (fs.existsSync(f)) {
  const o = JSON.parse(fs.readFileSync(f, 'utf8'));
  overrides.actions = overrides.actions || {};
  for (const [k, v] of Object.entries(o.actions || {})) {
    const prev = overrides.actions[k] || {};
    overrides.actions[k] = Object.assign({}, prev, v, { extraFields: Object.assign({}, prev.extraFields, v.extraFields) });
  }
}
for (const [id, ov] of Object.entries(overrides.actions || {})) {
  const c = contracts[id] || (contracts[id] = { id, ns: 'HttpConst', key: id, action: ov.action || keyToValue[id] || null, sites: [], fields: {}, closed: true, openReasons: [] });
  if (ov.action) c.action = ov.action;
  if (ov.required) c.required = ov.required;
  if (ov.shapes) c.shapes = ov.shapes;
  if (ov.switchZeroAllowed) c.switchZeroAllowed = ov.switchZeroAllowed;
  if (ov.extraFields) for (const [fname, fdef] of Object.entries(ov.extraFields)) {
    c.fields[fname] = Object.assign({ reads: [], switch: false, plain: true, fk: null, nested: null }, c.fields[fname] || {}, fdef, { source: 'override' });
  }
  if (ov.closed === true) { c.closed = true; c.openReasons = []; c.closedBy = ov.closedBy || 'override'; }
}

const byAction = {};
for (const c of Object.values(contracts)) if (c.action) byAction[c.action] = c.id;

const out = {
  __meta: {
    gen: new Date().toISOString(),
    m2Sha8: sha8(m2),
    m1Sha8: sha8(m1),
    overridesSha8: a.overrides ? sha8(String(a.overrides).split(',').filter(f => fs.existsSync(f)).map(f => fs.readFileSync(f, 'utf8')).join('\n')) : null,
    sites: parsedSites,
    contracts: Object.keys(contracts).length,
    closed: Object.values(contracts).filter(c => c.closed).length,
    open: Object.values(contracts).filter(c => !c.closed).length,
    byNs: Object.values(contracts).reduce((m, c) => (m[c.ns] = (m[c.ns] || 0) + 1, m), {}),
    withFk: Object.values(contracts).filter(c => Object.values(c.fields).some(f => f.fk)).length,
  },
  byAction,
  contracts,
};
writeJSON(a.out, out);
console.log(JSON.stringify(out.__meta, null, 2));
