'use strict';
/**
 * audit_shapes_evidence.js —— 形状表证据审计（确定性，不用 LLM）
 *
 * 目的：找出形状表里"证据行根本对不上"的字段——生成器把别处的同名属性当成了应答字段。
 * 典型误报：`o.addComponent("Xxx")`（UI 方法）被记成应答字段 addComponent。
 *
 * 判定（逐字段）：
 *   evid 里的 "bundle:line" → 读那一行 →
 *     A. 行里没有该字段的属性访问（.field 或 ["field"]）        → bogus:no-access
 *     B. 有，但紧跟 "(" —— 说明它是方法调用，不是数据字段        → bogus:method-call
 *     C. 有，且不是方法调用                                    → suspect（可能只是同名对象，需人工/变异测试）
 *     D. evid 里没有可解析的 bundle:line                        → unknown
 *
 * 输出：tools/facts/shapes-evidence-audit.json + 控制台汇总
 * 用法：node tools\audit_shapes_evidence.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHAPES = path.join(ROOT, 'tools', 'shapes.json');
const OUT = path.join(ROOT, 'tools', 'facts', 'shapes-evidence-audit.json');

const BUNDLES = {
  'index.js': path.join(ROOT, 'tools', 'index.js'),
  'scripts2.js': path.join(ROOT, 'tools', 'scripts2.js'),
  'scripts3.js': path.join(ROOT, 'tools', 'scripts3.js'),
};
const cache = {};
function lines(file) {
  if (!cache[file]) {
    const p = BUNDLES[file];
    cache[file] = (p && fs.existsSync(p)) ? fs.readFileSync(p, 'utf8').split(/\r?\n/) : null;
  }
  return cache[file];
}
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

const shapes = JSON.parse(fs.readFileSync(SHAPES, 'utf8'));
const acts = shapes.actions || shapes;

const rows = [];
const stat = {};
function bump(k) { stat[k] = (stat[k] || 0) + 1; }

for (const action of Object.keys(acts)) {
  const fields = acts[action].fields || acts[action];
  if (!fields || typeof fields !== 'object') continue;
  for (const fpath of Object.keys(fields)) {
    const rec = fields[fpath] || {};
    const conf = rec.conf || '?';
    const field = fpath.split('.').pop();
    const evid = Array.isArray(rec.evid) ? rec.evid : (rec.evid ? [rec.evid] : []);
    let verdict = 'unknown', detail = null;

    for (const e of evid) {
      const s = String(e || '');
      const m = /^(index\.js|scripts2\.js|scripts3\.js):(\d+)\b/.exec(s);
      if (!m) continue;
      const arr = lines(m[1]);
      if (!arr) continue;
      const text = arr[parseInt(m[2], 10) - 1] || '';
      const dot = new RegExp('\\.' + esc(field) + '\\b');
      const brk = new RegExp('\\[\\s*[\'"]' + esc(field) + '[\'"]\\s*\\]');
      const own = new RegExp('hasOwnProperty\\(\\s*[\'"]' + esc(field) + '[\'"]');
      const inOp = new RegExp('[\'"]' + esc(field) + '[\'"]\\s+in\\s+');
      const hit = dot.test(text) || brk.test(text) || own.test(text) || inOp.test(text);
      if (!hit) { verdict = 'bogus:no-access'; detail = { evid: s, text: text.trim().slice(0, 140) }; continue; }
      const call = new RegExp('\\.' + esc(field) + '\\s*\\(').test(text);
      if (call) { verdict = 'bogus:method-call'; detail = { evid: s, text: text.trim().slice(0, 140) }; continue; }
      verdict = 'suspect'; detail = { evid: s, text: text.trim().slice(0, 140) };
      break;
    }

    bump(verdict);
    if (verdict !== 'suspect') {
      rows.push({ action, field: fpath, conf, verdict, detail });
    }
  }
}

const out = { generatedAt: new Date().toISOString(), stat, suspicious: rows };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');
console.log('SHAPE EVIDENCE AUDIT  ' + JSON.stringify(stat));
console.log('可疑条目 ' + rows.length + ' 条 -> ' + OUT);
const byKind = {};
for (const r of rows) { const k = r.verdict + ' @ ' + r.conf; byKind[k] = (byKind[k] || 0) + 1; }
for (const k of Object.keys(byKind).sort()) console.log('  ' + String(byKind[k]).padStart(4) + '  ' + k);
