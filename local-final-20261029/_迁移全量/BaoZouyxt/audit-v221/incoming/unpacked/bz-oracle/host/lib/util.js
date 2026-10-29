'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) {
      const k = t.slice(2);
      const nx = argv[i + 1];
      if (nx === undefined || nx.startsWith('--')) o[k] = true;
      else { o[k] = nx; i++; }
    } else o._.push(t);
  }
  return o;
}

function canon(v) {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
function sha8(s) { return crypto.createHash('sha256').update(typeof s === 'string' ? s : canon(s)).digest('hex').slice(0, 8); }
function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
function readJSON(p, dflt) { if (!p || !fs.existsSync(p)) return dflt; return JSON.parse(fs.readFileSync(p, 'utf8')); }
function writeJSON(p, v) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v, null, 2)); }
function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function num(v) { return typeof v === 'number' && Number.isFinite(v); }

// 深比较，返回差异列表 [{path, a, b}]
function diff(a, b, p = '$', out = [], ignore) {
  if (ignore && ignore(p)) return out;
  if (a === b) return out;
  const ta = Array.isArray(a) ? 'array' : a === null ? 'null' : typeof a;
  const tb = Array.isArray(b) ? 'array' : b === null ? 'null' : typeof b;
  if (ta !== tb) { out.push({ path: p, a, b, kind: 'type' }); return out; }
  if (ta === 'array') {
    if (a.length !== b.length) out.push({ path: p + '.length', a: a.length, b: b.length, kind: 'len' });
    for (let i = 0; i < Math.min(a.length, b.length); i++) diff(a[i], b[i], `${p}[${i}]`, out, ignore);
    return out;
  }
  if (ta === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      if (!(k in a)) { if (!(ignore && ignore(`${p}.${k}`))) out.push({ path: `${p}.${k}`, a: undefined, b: b[k], kind: 'missingA' }); continue; }
      if (!(k in b)) { if (!(ignore && ignore(`${p}.${k}`))) out.push({ path: `${p}.${k}`, a: a[k], b: undefined, kind: 'missingB' }); continue; }
      diff(a[k], b[k], `${p}.${k}`, out, ignore);
    }
    return out;
  }
  out.push({ path: p, a, b, kind: 'value' });
  return out;
}

function listCases(dir) {
  const files = [];
  (function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (f.endsWith('.json')) files.push(p);
    }
  })(dir);
  return files.sort();
}

module.exports = { args, canon, sha8, clone, readJSON, writeJSON, isObj, num, diff, listCases };
