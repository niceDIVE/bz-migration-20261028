#!/usr/bin/env node
// 效果族分类器（路线 S6）：对每个 Effect 值，检查它的 Data1..5 能否在全部表里找到外键，自动归入
//   FK-RESOLVED     某个 Data 列 ≥ --min-hit 命中某张表的主键 → 内容在客户端表里，可生成（GEN）
//   PARAM-ONLY      没有列像 id（都是小数值参数）→ 规则自洽，可生成（GEN/RULE），但参数含义仍需读客户端
//   CAPTURE-SUSPECT 有列看起来像 id（≥ --id-floor）却 0 命中 → 内容很可能只在原服（Effect 13 的形态）
// node forge/tools/effect-classifier.js --tables <dir> --source item [--effect-col Effect] [--data-cols Data1,Data2,Data3,Data4,Data5]
//      [--families 1,11,13] [--min-hit 0.95] [--id-floor 1000] --out out/effects.json
'use strict';
const fs = require('fs');
const path = require('path');
const { args, writeJSON } = require('../../host/lib/util');

function loadTables(dir) {
  const T = {};
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.json')) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const name = f.replace(/(\.full)?\.json$/, '');
    if (Array.isArray(d)) { const m = {}; for (const r of d) { const id = r.ID ?? r.id ?? r.Id; if (id !== undefined) m[id] = r; } T[name] = m; } else T[name] = d;
  }
  return T;
}

function classify(T, o) {
  const src = T[o.source];
  if (!src) throw new Error(`源表 ${o.source} 不存在`);
  const pk = Object.fromEntries(Object.entries(T).map(([n, t]) => [n, new Set(Object.keys(t).map(String))]));
  const fam = {};
  for (const row of Object.values(src)) {
    const e = row[o.effectCol];
    if (e === undefined || e === null || e === '' || e === 0) continue;
    (fam[e] = fam[e] || []).push(row);
  }
  const want = o.families ? new Set(o.families.map(String)) : null;
  const out = {};
  for (const [e, rows] of Object.entries(fam)) {
    if (want && !want.has(String(e))) continue;
    const cols = {};
    let anyFk = false, idLikeMiss = false;
    for (const c of o.dataCols) {
      const vals = rows.map(r => r[c]).flatMap(v => typeof v === 'string' && /[,|;]/.test(v) ? v.split(/[,|;]/) : [v])
        .map(v => (typeof v === 'string' ? v.trim() : v)).filter(v => v !== undefined && v !== null && v !== '' && +v !== 0);
      if (!vals.length) continue;
      let best = null, bestHit = 0;
      for (const [n, s] of Object.entries(pk)) {
        if (n === o.source && c !== 'self') { /* 允许指回自己表，例如礼包开出物品 */ }
        const hit = vals.filter(v => s.has(String(v))).length / vals.length;
        if (hit > bestHit) { bestHit = hit; best = n; }
      }
      const idLike = vals.filter(v => Number.isInteger(+v) && +v >= o.idFloor).length / vals.length >= 0.5;
      cols[c] = { nonzero: vals.length, distinct: new Set(vals.map(String)).size, bestTable: best, hitRate: +bestHit.toFixed(3), idLike };
      if (bestHit >= o.minHit) anyFk = true;
      else if (idLike) idLikeMiss = true;
    }
    const verdict = idLikeMiss ? 'CAPTURE-SUSPECT' : anyFk ? 'FK-RESOLVED' : 'PARAM-ONLY';
    out[e] = { rows: rows.length, sampleIds: rows.slice(0, 5).map(r => r.ID ?? r.id), verdict, cols };
  }
  const tally = Object.values(out).reduce((m, x) => (m[x.verdict] = (m[x.verdict] || 0) + 1, m), {});
  return { __meta: { source: o.source, tables: Object.keys(T).length, families: Object.keys(out).length, tally, minHit: o.minHit, idFloor: o.idFloor,
    caveat: '命中率只说明值域重合，不证明语义；PARAM-ONLY 与 FK-RESOLVED 仍需读客户端使用点确认【推断】' }, families: out };
}
module.exports = { classify, loadTables };
if (require.main === module) {
  const a = args(process.argv.slice(2));
  if (!a.tables || !a.source) { console.error('需要 --tables <dir> --source <表名>'); process.exit(2); }
  const r = classify(loadTables(a.tables), {
    source: a.source, effectCol: a['effect-col'] || 'Effect',
    dataCols: (a['data-cols'] || 'Data1,Data2,Data3,Data4,Data5').split(','),
    families: a.families ? String(a.families).split(',') : null,
    minHit: +(a['min-hit'] || 0.95), idFloor: +(a['id-floor'] || 1000),
  });
  writeJSON(a.out || 'out/effects.json', r);
  console.log(JSON.stringify(r.__meta.tally));
}
