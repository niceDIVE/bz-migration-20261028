'use strict';
/**
 * task_buckets.js —— 任务分桶（B01 第 2 步）
 *
 * 2026-10-22 修正两个错误：
 *   1) tbl_tasknew.json 的 table 里既有真实行（纯数字键，4840 条）也有索引行（`__name:<id>` 键，4842 条），
 *      第一版把两者一起数，总数虚报成 9682。
 *   2) 表里 **Require 列全部是 "0"**（4840 行无一例外）——任务表里没有"杀 N 只/采 N 个"这类计数字段，
 *      前置链在 `Pre-Require` 列（"flag,taskID,param|..."），完成条件在 `SpRequire`（要携带的物品）。
 *
 * 分桶维度：Type / TaskType / Pre-Require 首个 flag / SpRequire 形态
 * 输出：tools/facts/task-buckets.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IN = path.join(ROOT, 'tools', 'cfg', 'tbl_tasknew.json');
const OUT = path.join(ROOT, 'tools', 'facts', 'task-buckets.json');

const raw = JSON.parse(fs.readFileSync(IN, 'utf8'));
const table = raw.table || {};
const rows = Object.keys(table)
  .filter((k) => /^[0-9]+$/.test(k) && table[k] && typeof table[k] === 'object')
  .map((k) => table[k]);

const isZero = (v) => v === undefined || v === null || v === '' || v === '0' || v === 0 || v === '0|0';

function flagsOf(str) {
  const out = [];
  for (const seg of String(str || '').trim().split('|')) {
    const f = String(seg).split(',')[0].trim();
    if (f && f !== '0') out.push(f);
  }
  return out;
}
function spShape(sp) {
  const s = String(sp || '').trim();
  if (!s || s === '0') return 'none';
  const n = s.split('|').length;
  return n === 1 ? 'one' : 'multi(' + n + ')';
}

const buckets = { type: {}, taskType: {}, preFlag: {}, spShape: {}, reqAll: {} };
const bump = (m, k) => { m[k] = m[k] || { count: 0, sample: [] }; m[k].count++; if (m[k].sample.length < 4) m[k].sample.push(null); };

let nSp = 0, nPre = 0, nRequireNonZero = 0;
const spSamples = [], preSamples = [], reqSamples = [];
for (const r of rows) {
  for (const [m, k] of [[buckets.type, String(r.Type)], [buckets.taskType, String(r.TaskType)], [buckets.spShape, spShape(r.SpRequire)], [buckets.preFlag, (flagsOf(r['Pre-Require']).join('+') || 'none')]]) {
    bump(m, k);
    m[k].sample[m[k].sample.length - 1] = String(r.TaskID);
  }
  if (!isZero(r.SpRequire)) { nSp++; if (spSamples.length < 8) spSamples.push({ id: r.TaskID, SpRequire: r.SpRequire, Type: r.Type }); }
  if (!isZero(r['Pre-Require'])) { nPre++; if (preSamples.length < 8) preSamples.push({ id: r.TaskID, pre: r['Pre-Require'] }); }
  if (!isZero(r.Require)) { nRequireNonZero++; if (reqSamples.length < 8) reqSamples.push({ id: r.TaskID, Require: r.Require }); }
}

const flat = (m) => Object.keys(m).map((k) => ({ key: k, ...m[k] })).sort((a, b) => b.count - a.count);

const out = {
  generatedAt: new Date().toISOString(),
  source: 'tools/cfg/tbl_tasknew.json（table 里的纯数字键行）',
  totalTasks: rows.length,
  columns: raw.head,
  by: { type: flat(buckets.type), taskType: flat(buckets.taskType), preFlag: flat(buckets.preFlag), spShape: flat(buckets.spShape) },
  facts: {
    requireNonZero: { count: nRequireNonZero, note: 'Require 列：实测 4840 行全是 "0"，无计数字段', samples: reqSamples },
    spRequireNonZero: { count: nSp, samples: spSamples },
    preRequireNonZero: { count: nPre, samples: preSamples },
  },
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');

console.log('TASK BUCKETS  total=' + rows.length + '  Require≠0: ' + nRequireNonZero + '  SpRequire≠0: ' + nSp + '  Pre-Require≠0: ' + nPre);
console.log('--- Type ---'); out.by.type.slice(0, 8).forEach((x) => console.log('  Type=' + String(x.key).padEnd(3) + String(x.count).padStart(5)));
console.log('--- SpRequire 形态 ---'); out.by.spShape.forEach((x) => console.log('  ' + x.key.padEnd(12) + String(x.count).padStart(5)));
console.log('--- Pre-Require flag ---'); out.by.preFlag.slice(0, 8).forEach((x) => console.log('  ' + x.key.padEnd(12) + String(x.count).padStart(5)));
console.log('-> ' + OUT);
