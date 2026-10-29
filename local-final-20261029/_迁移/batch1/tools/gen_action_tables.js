'use strict';
/**
 * gen_action_tables.js —— 把"动作 → 应答字段 → 配置表"的线索机器化（只读源码，不改任何东西）
 *
 * 思路（L2 地基）：
 *   客户端每个应答字段都在某一行被读取（action_facts_all.json 的 field_lines 已给了行号）；
 *   如果那一行附近（±WINDOW 行）出现 `getItem(x, "表名")`，就说明"这个动作的应答字段要靠那张表算出来"。
 *   把这层线索固化下来，之后接任何动作都不用再从头 grep。
 *
 * 输入：tools/action_facts_all.json、tools/codec-field-lines/*（无则跳过）、三个 bundle
 * 输出：tools/facts/action-tables.json
 *
 * 用法：node tools/gen_action_tables.js [--stat]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'tools', 'facts', 'action-tables.json');
const WINDOW = 40;

const facts = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'action_facts_all.json'), 'utf8'));
const bundles = {
  'index.js': fs.readFileSync(path.join(ROOT, 'tools', 'index.js'), 'utf8').split(/\r?\n/),
  'scripts2.js': fs.readFileSync(path.join(ROOT, 'tools', 'scripts2.js'), 'utf8').split(/\r?\n/),
  'scripts3.js': fs.readFileSync(path.join(ROOT, 'tools', 'scripts3.js'), 'utf8').split(/\r?\n/),
};

// field_lines 的键形如 "index.js:12345|23456" 或 "12345"；统一解析出 [bundle, line...]
const RE_GETITEM = /getItem\s*\(\s*[^,()]+,\s*["']([A-Za-z0-9_]+)["']\s*\)/g;

function parseFieldLines(v) {
  const out = [];
  const push = (bundle, line) => {
    const n = parseInt(line, 10);
    if (n > 0) out.push({ bundle: bundles[bundle] ? bundle : 'index.js', line: n });
  };
  if (Array.isArray(v)) {
    for (const x of v) push('index.js', x);
  } else if (typeof v === 'number') {
    push('index.js', v);
  } else if (typeof v === 'string') {
    for (const seg of v.split('|')) {
      const m = seg.match(/^(?:([A-Za-z0-9_.]+\.js):)?(\d+)$/);
      if (m) push(m[1] || 'index.js', m[2]);
    }
  }
  return out;
}

const result = {};
let pairs = 0, withTable = 0;

for (const action of Object.keys(facts)) {
  const f = facts[action] || {};
  const fl = f.field_lines || {};
  const lines = [];
  for (const k of Object.keys(fl)) for (const x of parseFieldLines(fl[k])) lines.push(x);
  if (!lines.length) continue;
  pairs++;
  const hits = [];
  const seen = new Set();
  for (const { bundle, line } of lines) {
    const arr = bundles[bundle];
    if (!arr) continue;
    const lo = Math.max(0, line - WINDOW), hi = Math.min(arr.length, line + WINDOW);
    for (let i = lo; i < hi; i++) {
      RE_GETITEM.lastIndex = 0;
      const m = RE_GETITEM.exec(arr[i]);
      if (!m) continue;
      const key = m[1] + '@' + bundle + ':' + (i + 1);
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({ table: m[1], file: bundle, line: i + 1, text: String(arr[i]).trim().slice(0, 160) });
    }
  }
  if (hits.length) {
    withTable++;
    // 按表名聚合
    const byTable = {};
    for (const h of hits) {
      if (!byTable[h.table]) byTable[h.table] = [];
      if (byTable[h.table].length < 5) byTable[h.table].push({ file: h.file, line: h.line, text: h.text });
    }
    result[action] = { fields: Object.keys(fl), tables: byTable };
  }
}

const out = {
  generatedAt: new Date().toISOString(),
  window: WINDOW,
  actionsWithFields: pairs,
  actionsWithTable: withTable,
  map: result,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');

if (process.argv.includes('--stat')) {
  const rows = Object.entries(result).map(([a, v]) => [a, Object.keys(v.tables).length]);
  rows.sort((x, y) => y[1] - x[1]);
  console.log('动作有字段=' + pairs + '  能连到表=' + withTable);
  rows.slice(0, 25).forEach(([a, n]) => console.log('  ' + String(n).padStart(2) + ' 表  ' + a));
  process.exit(0);
}
console.log('ACTION-TABLES  actionsWithFields=' + pairs + '  actionsWithTable=' + withTable + '  -> ' + path.relative(ROOT, OUT));
