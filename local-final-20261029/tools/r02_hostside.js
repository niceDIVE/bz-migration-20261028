'use strict';
/**
 * r02_hostside.js —— R02 回执里"主审自己算"的那几条（只读，不碰设备）
 *
 * 覆盖：
 *  H1  硬伤候选一自检：BZ_TASKS 里带 `n`（需求物品）的任务，有多少条不属于 Type 2/12/13
 *      → 这些会让叠加产出"幽灵物品"（Type3 的 SpRequire 本来就是怪物 id）
 *  H2  Q4(c)：item 表里哪一列引用了 drop 表主键（"物品开启型"来源）+ 对照组排除巧合
 *  H3  反例 2：700 条真物品需求里，需求物品是装备（item.Type=1）的条数
 *  H4  Q6(b)：死任务在 Chain/ReceiveEvent/CompletionEvent/receive_action/finish_action/transfer
 *      各列里作为 token 出现的比例 vs 随机对照
 *
 * 输出 tools/facts/r02-hostside.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const P = (p) => path.join(ROOT, p);
const OUT = P('tools/facts/r02-hostside.json');
const j = (p) => JSON.parse(fs.readFileSync(P(p), 'utf8'));

const taskRaw = j('tools/cfg/tbl_tasknew.json');
const itemRaw = j('tools/cfg/tbl_item.json');
const dropRaw = j('tools/cfg/tbl_drop.json');

const numericRows = (raw) => Object.keys(raw.table || {}).filter((k) => /^[0-9]+$/.test(k)).map((k) => raw.table[k]);
const tasks = numericRows(taskRaw);
const items = numericRows(itemRaw);
const drops = numericRows(dropRaw);
const byId = new Map(tasks.map((t) => [Number(t.TaskID), t]));
const itemIds = new Set(items.map((r) => Number(r.ID)));
const itemById = new Map(items.map((r) => [Number(r.ID), r]));
const dropIds = new Set(drops.map((r) => Number(r.ID)));

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const spItems = (sp) => {
  const s = String(sp == null ? '' : sp).trim();
  if (!s || s === '0') return [];
  return s.split('|').map((x) => Number(String(x).split(',')[0])).filter((x) => x > 0);
};
const preIds = (pre) => {
  const s = String(pre == null ? '' : pre).trim();
  if (!s || s === '0') return [];
  return s.split('|').map((x) => num(String(x).split(',')[1])).filter((x) => x > 0);
};

// ---- 载入 BZ_TASKS（生成物） ----
const vm = require('vm');
vm.runInThisContext(fs.readFileSync(P('hotfix-patch/core/bz-tasks.generated.js'), 'utf8'));
const BZ = globalThis.BZ_TASKS || null;

// ---------- H1：BZ_TASKS 的 n 是否只来自真物品任务 ----------
const h1 = { total: 0, withNeed: 0, needButNotType2_12_13: 0, byType: {}, samples: [] };
if (BZ) {
  for (const k of Object.keys(BZ)) {
    if (k === '__meta') continue;
    const e = BZ[k];
    if (!e || !e.n) continue;
    h1.withNeed++;
    const t = byId.get(Number(k));
    const ty = t ? String(t.Type) : '?';
    if (!['2', '12', '13'].includes(ty)) {
      h1.needButNotType2_12_13++;
      h1.byType[ty] = (h1.byType[ty] || 0) + 1;
      if (h1.samples.length < 12) h1.samples.push({ taskId: Number(k), Type: ty, n: e.n, SpRequire: t && t.SpRequire, Fight: t && t.Fight });
    }
  }
  h1.total = Object.keys(BZ).filter((k) => k !== '__meta').length;
}

// ---------- H3：真物品需求里装备的条数 ----------
const h3 = { pairs: 0, equipPairs: 0, equipIds: [], notInItemTable: 0 };
for (const t of tasks) {
  if (!['2', '12', '13'].includes(String(t.Type))) continue;
  for (const id of spItems(t.SpRequire)) {
    h3.pairs++;
    if (!itemIds.has(id)) { h3.notInItemTable++; continue; }
    const it = itemById.get(id);
    if (String(it.Type) === '1') { h3.equipPairs++; if (h3.equipIds.length < 10) h3.equipIds.push(id); }
  }
}

// ---------- H2：item 表的列里有没有引用 drop 主键 ----------
const itemCols = Object.keys(items[0] || {});
const h2 = [];
for (const col of itemCols) {
  const vals = [];
  for (const r of items) {
    const v = r[col];
    if (v === undefined || v === null || v === '' || v === '0') continue;
    const txt = typeof v === 'object' ? JSON.stringify(v) : String(v);
    for (const m of txt.match(/[0-9]+/g) || []) vals.push(Number(m));
  }
  if (vals.length < 20) continue;
  const hit = vals.filter((x) => dropIds.has(x)).length;
  h2.push({ col, n: vals.length, hit, pct: +(100 * hit / vals.length).toFixed(1) });
}
h2.sort((a, b) => b.pct - a.pct);
// 对照组：同样数量的随机数，落在 drop 主键（1..~5000 段）里的期望比例
const dropMax = Math.max(...[...dropIds]);
const ctrlPct = +((100 * dropIds.size) / dropMax).toFixed(2);

// ---------- H4：死任务的事件列入口 ----------
const children = new Map();
const roots = [];
for (const t of tasks) {
  const id = Number(t.TaskID);
  const pres = preIds(t['Pre-Require']);
  if (!pres.length) roots.push(id);
  for (const p of pres) { if (!children.has(p)) children.set(p, []); children.get(p).push(id); }
}
const reach = new Set();
{ const q = roots.slice(); while (q.length) { const id = q.pop(); if (reach.has(id)) continue; reach.add(id); for (const c of children.get(id) || []) if (!reach.has(c)) q.push(c); } }
const dead = tasks.map((t) => Number(t.TaskID)).filter((id) => !reach.has(id));

const EVENT_COLS = ['Chain', 'ReceiveEvent', 'CompletionEvent', 'receive_action', 'finish_action', 'transfer', 'clear_task'];
const tokens = {};
for (const c of EVENT_COLS) {
  const s = new Set();
  for (const t of tasks) {
    if (!reach.has(Number(t.TaskID))) continue;
    const v = t[c];
    const txt = v === undefined || v === null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
    for (const m of txt.match(/[0-9]+/g) || []) s.add(Number(m));
  }
  tokens[c] = s;
}
// 对照组：同样多、同量级、且不在任务表里的随机 id
let seed = 20261022;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed; };
const ctrl = [];
while (ctrl.length < dead.length) { const x = 100000 + (rnd() % 900000); if (!byId.has(x)) ctrl.push(x); }
const h4 = { dead: dead.length, reach: reach.size, byCol: [] };
for (const c of EVENT_COLS) {
  const dHit = dead.filter((id) => tokens[c].has(id)).length;
  const cHit = ctrl.filter((x) => tokens[c].has(x)).length;
  h4.byCol.push({ col: c, deadPct: +(100 * dHit / dead.length).toFixed(1), ctrlPct: +(100 * cHit / ctrl.length).toFixed(1), deadHits: dHit });
}

// ---------- 输出 ----------
const out = {
  generatedAt: new Date().toISOString(),
  source: 'tools/cfg/tbl_tasknew.json / tbl_item.json / tbl_drop.json + hotfix-patch/core/bz-tasks.generated.js',
  basis: 'docs/sota/inbox/R02-reply.txt（H1=硬伤候选一、H2=Q4c、H3=反例2、H4=Q6b）',
  h1_bz_tasks_need_by_type: h1,
  h3_true_item_needs: h3,
  h2_item_columns_vs_dropids: { top: h2.slice(0, 12), ctrlExpectedPct: ctrlPct, dropIdCount: dropIds.size, dropMax },
  h4_dead_task_event_columns: h4,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');

console.log('[H1] BZ_TASKS 条目=' + h1.total + ' 带需求=' + h1.withNeed + ' 其中非Type2/12/13=' + h1.needButNotType2_12_13 + '  ' + JSON.stringify(h1.byType));
console.log('     例: ' + JSON.stringify(h1.samples.slice(0, 4)));
console.log('[H3] 真物品需求 pair=' + h3.pairs + ' 装备(Type1)=' + h3.equipPairs + ' 不在item表=' + h3.notInItemTable + '  装备id样本=' + JSON.stringify(h3.equipIds));
console.log('[H2] drop 主键数=' + dropIds.size + '（最大 id ' + dropMax + '，随机撞上的期望 ≈ ' + ctrlPct + '%）');
h2.slice(0, 8).forEach((x) => console.log('     ' + x.col.padEnd(14) + ' n=' + String(x.n).padEnd(7) + ' inDrop=' + String(x.hit).padEnd(6) + x.pct + '%'));
console.log('[H4] 可达=' + h4.reach + ' 死任务=' + h4.dead);
h4.byCol.forEach((x) => console.log('     ' + x.col.padEnd(16) + ' 死任务命中 ' + String(x.deadPct).padStart(5) + '%  对照 ' + String(x.ctrlPct).padStart(5) + '%'));
console.log('-> ' + OUT);
