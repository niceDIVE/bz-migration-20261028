#!/usr/bin/env node
// 请求参数抽取器：从客户端发送点抽出每个动作的 p 里有哪些字段（生成 handler 必需，M2 只覆盖应答读法）。
// node forge/tools/extract-req-params.js --src tools/index.js,tools/scripts2.js,tools/scripts3.js [--fns sendRequest,sendReqWithMask] [--m1 M1.tsv] --out out/req-params.json
'use strict';
const fs = require('fs');
const { args, writeJSON } = require('../../host/lib/util');
const { matchBracket, splitTop, objectKeys, lineOf } = require('../lib/jsscan');

function extract(files, fns, knownKeys) {
  const res = {};
  // 中层审计 A1-C12：不再静默跳过非 HttpConst.X 的发送点——别名常量（var H = a.HttpConst; H.X）按 M1 的 KEY 名单认领，其余计入 __unresolved
  const unresolved = [];
  Object.defineProperty(res, '__unresolved', { value: unresolved, enumerable: false });
  const re = new RegExp(`\\b(${fns.join('|')})\\s*\\(`, 'g');
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8'); const cache = {};
    for (const m of src.matchAll(re)) {
      const open = m.index + m[0].length - 1, close = matchBracket(src, open);
      if (close < 0) continue;
      const argSrc = src.slice(open + 1, close);
      let km = argSrc.match(/HttpConst\d*\.([A-Z0-9_]+)/), alias = false;
      if (!km) {
        const first = (splitTop(argSrc)[0] || '').trim();
        const am = first.match(/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\.([A-Z][A-Z0-9_]+)$/) || first.match(/^([A-Z][A-Z0-9_]{2,})$/);
        if (am && knownKeys && knownKeys.has(am[1])) { km = am; alias = true; }
        else { unresolved.push({ site: `${file}:${lineOf(src, m.index, cache)}`, first: first.slice(0, 60) }); continue; }
      }
      const key = km[1], line = lineOf(src, m.index, cache);
      const r = res[key] = res[key] || { sites: [], params: {}, dynamic: 0 };
      if (alias) r.viaAlias = (r.viaAlias || 0) + 1;
      r.sites.push(`${file}:${line}`);
      const parts = splitTop(argSrc);
      let lit = parts.find(p => p.startsWith('{'));
      if (!lit) { // 一跳回溯：参数是变量时，向前 600 字符找 "名 = {...}"
        const v = parts.slice(1).find(p => /^[A-Za-z_$][\w$]*$/.test(p));
        if (v) {
          const from = Math.max(0, m.index - 600), seg = src.slice(from, m.index);
          const dm = [...seg.matchAll(new RegExp(`\\b${v.replace('$', '\\$')}\\s*=\\s*\\{`, 'g'))].pop();
          if (dm) { const o = from + dm.index + dm[0].length - 1, c = matchBracket(src, o); if (c > 0) { lit = src.slice(o, c + 1); r.viaVar = (r.viaVar || 0) + 1; } }
        }
      }
      if (!lit) { r.dynamic++; continue; }
      for (const [k, v] of objectKeys(lit)) {
        if (!k) { r.dynamic++; continue; }
        const p = r.params[k] = r.params[k] || { samples: [], sites: 0, type: null };
        p.sites++;
        if (p.samples.length < 3 && !p.samples.includes(v)) p.samples.push(v.slice(0, 80));
        const t = /^-?\d+(\.\d+)?$/.test(v) ? 'number' : /^["']/.test(v) ? 'string' : /^\[/.test(v) ? 'array' : /^\{/.test(v) ? 'object' : /^(!0|!1|true|false)$/.test(v) ? 'bool' : 'expr';
        p.type = p.type && p.type !== t ? 'mixed' : t;
      }
    }
  }
  for (const r of Object.values(res)) for (const p of Object.values(r.params)) p.optional = p.sites < r.sites.length - r.dynamic;
  return res;
}
module.exports = { extract };
if (require.main === module) {
  const a = args(process.argv.slice(2));
  if (!a.src) { console.error('需要 --src a.js,b.js'); process.exit(2); }
  const { readM1 } = require('./registry');
  const kv = a.m1 ? Object.fromEntries(readM1(a.m1).map(r => [r.KEY, r.VALUE])) : null;
  const res = extract(String(a.src).split(','), String(a.fns || 'sendRequest,sendReqWithMask').split(','), kv ? new Set(Object.keys(kv)) : null);
  if (kv) { // 挂上协议名
    for (const [k, r] of Object.entries(res)) r.action = kv[k] || null;
  }
  writeJSON(a.out || 'out/req-params.json', Object.assign({}, res, { __unresolved: res.__unresolved }));
  const keys = Object.keys(res);
  console.log(JSON.stringify({ actions: keys.length, sites: keys.reduce((s, k) => s + res[k].sites.length, 0), withLiteral: keys.filter(k => Object.keys(res[k].params).length).length, viaAlias: keys.filter(k => res[k].viaAlias).length, unresolved: res.__unresolved.length }));
}
