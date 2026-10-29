#!/usr/bin/env node
// 命名处理器展开器（路线 S2 的一部分）：把 on(EVT, this.onXxx) 与"内联但 0 读取"的注册点展开到函数体，
// 跟进 this.method(o) / this.method(o.x) 最多 --depth 跳，抽出应答对象上的字段读取，产出 contract-overrides 格式。
// node forge/tools/expand-handlers.js --contracts out/contracts.json --root <客户端根目录> [--depth 3] [--engine ast|regex]（默认 ast，解析失败自动回退正则） --out out/expanded-overrides.json
// 然后：node host/build-contracts.js ... --overrides out/expanded-overrides.json,config/contract-overrides.json（人工条目在后，优先）
'use strict';
const fs = require('fs');
const path = require('path');
const { args, writeJSON } = require('../../host/lib/util');
const { matchBracket, splitTop, lineOf } = require('../lib/jsscan');

const BUILTIN = new Set(['hasOwnProperty', 'toString', 'length', 'constructor', 'valueOf', 'call', 'apply', 'bind', 'forEach', 'map', 'filter', 'indexOf', 'push', 'concat', 'slice', 'join', 'keys']);
const esc = s => s.replace(/[$]/g, '\\$');

function fileCtx(root, rel, cache) {
  if (!cache[rel]) { const p = path.join(root, rel); cache[rel] = fs.existsSync(p) ? { src: fs.readFileSync(p, 'utf8'), lc: {} } : null; }
  return cache[rel];
}
function lineStart(fc, line) { lineOf(fc.src, 0, fc.lc); return fc.lc.nl[line - 1] || 0; }

// 找方法定义，取离 nearIdx 最近的一个
function findMethod(fc, name, nearIdx) {
  const re = new RegExp(`(?:prototype\\.${esc(name)}\\s*=\\s*function|[{,]\\s*${esc(name)}\\s*:\\s*function|\\b${esc(name)}\\s*=\\s*function)\\s*\\(([^)]*)\\)\\s*\\{`, 'g');
  let best = null;
  for (const m of fc.src.matchAll(re)) {
    const d = Math.abs(m.index - nearIdx);
    if (!best || d < best.d) best = { d, idx: m.index, params: m[1].split(',').map(s => s.trim()).filter(Boolean), open: m.index + m[0].length - 1 };
  }
  if (!best) return null;
  const close = matchBracket(fc.src, best.open);
  return close < 0 ? null : { params: best.params, body: fc.src.slice(best.open + 1, close), bodyIdx: best.open + 1, idx: best.idx };
}

// 在 body 里收集变量 P 的字段读取；返回 {fields, escapes, follows}
function scanBody(body, P) {
  const names = new Set([P]);
  for (const m of body.matchAll(new RegExp(`\\b(?:var|let|const)?\\s*([A-Za-z_$][\\w$]*)\\s*=\\s*${esc(P)}\\s*[,;)]`, 'g'))) names.add(m[1]); // 别名
  const fields = {}, escapes = [], follows = [];
  const add = (f, sw, off) => { if (BUILTIN.has(f)) return; const x = fields[f] = fields[f] || { switch: false, plain: false, offs: [] }; if (sw) x.switch = true; else x.plain = true; x.offs.push(off); };
  for (const n of names) {
    const N = esc(n);
    for (const m of body.matchAll(new RegExp(`\\b${N}\\.hasOwnProperty\\(\\s*["']([^"']+)["']`, 'g'))) add(m[1], true, m.index);
    for (const m of body.matchAll(new RegExp(`["']([^"']+)["']\\s+in\\s+${N}\\b`, 'g'))) add(m[1], true, m.index);
    for (const m of body.matchAll(new RegExp(`(?<![\\w$.])${N}\\.([A-Za-z_$][\\w$]*)`, 'g'))) if (m[1] !== 'hasOwnProperty') add(m[1], false, m.index);
    for (const m of body.matchAll(new RegExp(`(?<![\\w$.])${N}\\[\\s*["']([^"']+)["']\\s*\\]`, 'g'))) add(m[1], false, m.index);
    // 整体外泄：作为参数传给 this.method（可跟进）或其他函数（不可跟进）；被整体赋值
    for (const m of body.matchAll(new RegExp(`([\\w$.]+)\\s*\\(([^()]*(?<![\\w$.])${N}(?![\\w$])[^()]*)\\)`, 'g'))) {
      const callee = m[1], argv = splitTop(m[2]);
      const i = argv.findIndex(x => x === n);
      if (i < 0 || callee.endsWith('.hasOwnProperty')) continue;
      const tm = callee.match(/^this\.([A-Za-z_$][\w$]*)$/);
      if (tm) follows.push({ method: tm[1], argIndex: i, field: null });
      else if (!/^(cc\.log|console\.\w+|parseInt|Number|String|JSON\.stringify)$/.test(callee)) escapes.push(`传给 ${callee}()`);
    }
    for (const m of body.matchAll(new RegExp(`this\\.([A-Za-z_$][\\w$]*)\\s*\\(([^()]*)\\)`, 'g'))) {
      splitTop(m[2]).forEach((x, i) => { const fm = x.match(new RegExp(`^${N}\\.([A-Za-z_$][\\w$]*)$`)); if (fm) follows.push({ method: m[1], argIndex: i, field: fm[1] }); });
    }
    for (const m of body.matchAll(new RegExp(`[\\w$.\\]]\\s*=\\s*${N}\\s*[,;)}]`, 'g'))) if (!/\b(var|let|const)\s+\w+\s*=\s*$/.test(body.slice(Math.max(0, m.index - 12), m.index + 1))) escapes.push('被整体赋值保存');
  }
  if (/\barguments\b/.test(body)) escapes.push('使用 arguments');
  return { fields, escapes, follows };
}

function expandOne(c, root, depth, cache) {
  const out = { extraFields: {}, escapes: [], visited: [] };
  let anySite = false;
  for (const site of c.sites) {
    const fc = fileCtx(root, site.file, cache);
    if (!fc) { out.escapes.push(`缺源文件 ${site.file}`); continue; }
    let fn = null;
    const at = lineStart(fc, site.line);
    if (site.form === 'named') {
      const nm = (site.handler.match(/this\.([A-Za-z_$][\w$]*)/) || [])[1];
      fn = nm && findMethod(fc, nm, at);
      if (!fn) { out.escapes.push(`找不到 ${site.handler} 的定义`); continue; }
      out.visited.push(`${nm}@${site.file}:${lineOf(fc.src, fn.idx, fc.lc)}`);
    } else {
      const seg = fc.src.indexOf('function', at);
      if (seg < 0 || seg - at > 400) { out.escapes.push(`内联点 ${site.file}:${site.line} 找不到函数字面量`); continue; }
      const pm = fc.src.slice(seg).match(/^function\s*\(([^)]*)\)\s*\{/);
      if (!pm) { out.escapes.push(`内联点 ${site.file}:${site.line} 解析失败`); continue; }
      const open = seg + pm[0].length - 1, close = matchBracket(fc.src, open);
      fn = { params: pm[1].split(',').map(s => s.trim()).filter(Boolean), body: fc.src.slice(open + 1, close), bodyIdx: open + 1 };
    }
    anySite = true;
    // MessageCenter 回调签名 (事件名, 应答)：取第二参数（M2 口径）
    const P = fn.params[1];
    if (!P) { if (/\barguments\b/.test(fn.body)) out.escapes.push('无第二参数但用 arguments'); continue; } // 没有应答参数 = 客户端不读应答
    const queue = [{ fn, P, prefix: '', d: 0, file: site.file, fc }];
    while (queue.length) {
      const q = queue.shift();
      const r = scanBody(q.fn.body, q.P);
      for (const [f, x] of Object.entries(r.fields)) {
        const key = q.prefix ? q.prefix.split('.')[0] : f;
        const ef = out.extraFields[key] = out.extraFields[key] || { switch: false, plain: false, reads: [], nested: null };
        if (!q.prefix) { if (x.switch) ef.switch = true; if (x.plain) ef.plain = true; }
        else { ef.plain = true; (ef.subFields = ef.subFields || {})[f] = true; }
        for (const off of x.offs.slice(0, 3)) ef.reads.push({ file: q.file, line: lineOf(q.fc.src, q.fn.bodyIdx + off, q.fc.lc), mode: q.d ? `展开${q.d}跳` : '展开' });
      }
      out.escapes.push(...r.escapes.map(e => `${q.P}${q.prefix ? '.' + q.prefix : ''} ${e}`));
      for (const fl of r.follows) {
        if (q.d >= depth) { out.escapes.push(`超过深度 ${depth}：this.${fl.method}`); continue; }
        const g = findMethod(q.fc, fl.method, q.fn.bodyIdx);
        if (!g || !g.params[fl.argIndex]) { out.escapes.push(`找不到 this.${fl.method}`); continue; }
        out.visited.push(`${fl.method}@${q.file}:${lineOf(q.fc.src, g.idx, q.fc.lc)}`);
        queue.push({ fn: g, P: g.params[fl.argIndex], prefix: fl.field ? (q.prefix ? q.prefix + '.' : '') + fl.field : q.prefix, d: q.d + 1, file: q.file, fc: q.fc });
      }
    }
  }
  return { anySite, ...out };
}

function runAst(a, C) {
  const { FileIndex, expandContract } = require('../lib/ast-expand');
  const idxCache = {}, depth = +(a.depth || 3);
  const getIndex = rel => {
    if (!(rel in idxCache)) { const p = path.join(a.root, rel); idxCache[rel] = fs.existsSync(p) ? new FileIndex(fs.readFileSync(p, 'utf8'), rel) : null; }
    return idxCache[rel];
  };
  const res = { _说明: 'forge/tools/expand-handlers.js（AST 引擎）自动产出；人工条目放 config/contract-overrides.json（加载在后，优先）', actions: {} };
  const tally = { engine: 'ast', tried: 0, closed: 0, stillOpen: 0, noSource: 0, fieldsAdded: 0 };
  for (const c of Object.values(C.contracts)) {
    if (c.closed) continue;
    tally.tried++;
    const r = expandContract(c, getIndex, depth);
    if (!r.anySite) { tally.noSource++; continue; }
    const closed = r.escapes.length === 0;
    closed ? tally.closed++ : tally.stillOpen++;
    tally.fieldsAdded += Object.keys(r.fields).length;
    res.actions[c.id] = { action: c.action || undefined, extraFields: r.fields, closed: closed || undefined,
      closedBy: closed ? `expand-handlers/ast（${r.visited.join(' → ') || '内联'}）` : undefined, _open: closed ? undefined : [...new Set(r.escapes)].slice(0, 5), _notes: r.notes.length ? r.notes : undefined, _visited: r.visited };
  }
  res.__meta = { gen: new Date().toISOString(), depth, tally };
  return res;
}

function run(a) {
  const C = JSON.parse(fs.readFileSync(a.contracts, 'utf8'));
  if ((a.engine || 'ast') === 'ast') { try { return runAst(a, C); } catch (e) { if (a.engine === 'ast') throw e; console.error('AST 引擎失败，回退正则：' + e.message); } }
  const cache = {}, depth = +(a.depth || 3);
  const res = { _说明: 'forge/tools/expand-handlers.js 自动产出；人工条目放 config/contract-overrides.json（加载在后，优先）', actions: {} };
  const tally = { tried: 0, closed: 0, stillOpen: 0, noSource: 0, fieldsAdded: 0 };
  for (const c of Object.values(C.contracts)) {
    if (c.closed) continue;
    tally.tried++;
    const r = expandOne(c, a.root, depth, cache);
    if (!r.anySite) { tally.noSource++; continue; }
    const closed = r.escapes.length === 0;
    closed ? tally.closed++ : tally.stillOpen++;
    tally.fieldsAdded += Object.keys(r.extraFields).length;
    res.actions[c.id] = { action: c.action || undefined, extraFields: r.extraFields, closed: closed || undefined,
      closedBy: closed ? `expand-handlers 自动展开（${r.visited.join(' → ') || '内联'}）` : undefined, _open: closed ? undefined : r.escapes.slice(0, 5), _visited: r.visited };
  }
  res.__meta = { gen: new Date().toISOString(), depth, tally };
  return res;
}
module.exports = { run, scanBody, findMethod };
if (require.main === module) {
  const a = args(process.argv.slice(2));
  if (!a.contracts || !a.root) { console.error('需要 --contracts 与 --root'); process.exit(2); }
  const res = run(a);
  writeJSON(a.out || 'out/expanded-overrides.json', res);
  console.log(JSON.stringify(res.__meta.tally));
}
