'use strict';
/**
 * scan_weak_fields.js —— 弱证据字段的确定性核查（不用 LLM，逐行扫三个 bundle）
 *
 * 输入：tools/facts/shape-weak-evidence.json（255 个 conf ∈ {name,fallback,listener-1,usage-1} 的字段）
 * 输出：tools/facts/weak-evidence-scan.json
 *   { fields: [{action, field, conf, found, hits:[{file,line,text}]}], stat:{verified,notFound} }
 *
 * 判定：只认「属性访问」形态——
 *   obj.field            → 命中
 *   obj["field"]         → 命中
 *   'field' 字符串、fieldXxx 长名字 → 不算
 *
 * 用法：node tools\scan_weak_fields.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IN = path.join(ROOT, 'tools', 'shapes.json');          // 权威来源（不依赖工人交付）
const OUT = path.join(ROOT, 'tools', 'facts', 'weak-evidence-scan.json');
const BUNDLES = ['tools/index.js', 'tools/scripts2.js', 'tools/scripts3.js'].map((p) => ({
  name: p,
  abs: path.join(ROOT, p.split('/').join(path.sep)),
}));

const WEAK = { 'name': 1, 'fallback': 1, 'listener-1': 1, 'usage-1': 1 };
const shapes = JSON.parse(fs.readFileSync(IN, 'utf8'));
const acts = shapes.actions || shapes;
const fields = [];
for (const a of Object.keys(acts)) {
  const f = acts[a].fields || acts[a];
  if (!f || typeof f !== 'object') continue;
  for (const k of Object.keys(f)) {
    const conf = (f[k] && f[k].conf) || '?';
    if (!WEAK[conf]) continue;
    fields.push({ action: a, field: k.split('.').pop(), conf: conf, path: k });
  }
}

const wanted = new Set(fields.map((f) => f.field));
// 字段名 → 命中列表
const hits = new Map();
for (const f of wanted) hits.set(f, []);

const DOT = /\.([A-Za-z_$][\w$]*)/g;
const BRK = /\[\s*['"]([A-Za-z_$][\w$]*)['"]\s*\]/g;

for (const b of BUNDLES) {
  if (!fs.existsSync(b.abs)) { console.error('缺文件: ' + b.abs); process.exit(2); }
  const lines = fs.readFileSync(b.abs, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 400) continue;           // 压缩过的大数组行跳过（工具生成物）
    let m;
    DOT.lastIndex = 0;
    while ((m = DOT.exec(line))) {
      const name = m[1];
      if (!wanted.has(name)) continue;
      const arr = hits.get(name);
      if (arr.length < 5 && !arr.some((h) => h.file === b.name && h.line === i + 1)) {
        arr.push({ file: b.name, line: i + 1, text: line.trim().slice(0, 160) });
      }
    }
    BRK.lastIndex = 0;
    while ((m = BRK.exec(line))) {
      const name = m[1];
      if (!wanted.has(name)) continue;
      const arr = hits.get(name);
      if (arr.length < 5 && !arr.some((h) => h.file === b.name && h.line === i + 1)) {
        arr.push({ file: b.name, line: i + 1, text: line.trim().slice(0, 160) });
      }
    }
  }
}

const out = { generatedAt: new Date().toISOString(), fields: [], stat: { verified: 0, notFound: 0 } };
for (const f of fields) {
  const h = hits.get(f.field) || [];
  out.fields.push({ action: f.action, field: f.field, conf: f.conf, found: h.length > 0, hits: h.slice(0, 3) });
  if (h.length > 0) out.stat.verified++; else out.stat.notFound++;
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');
console.log('WEAK SCAN OK  fields=' + fields.length + '  verified=' + out.stat.verified + '  notFound=' + out.stat.notFound + '  -> ' + OUT);
