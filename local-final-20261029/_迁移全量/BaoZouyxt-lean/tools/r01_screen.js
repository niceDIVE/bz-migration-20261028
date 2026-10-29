'use strict';
/**
 * r01_screen.js —— R01 回执第 8 节第 1 步的只读筛查（V1 / V5 / Repeat / id 分段）
 *
 * 只读：不写存档、不碰设备、不改任何既有文件；输出 tools/facts/r01-screen.json。
 * 输入：tools/cfg/tbl_tasknew.json、tbl_item.json、tbl_drop.json、npc_compact.json
 * 依据：docs/sota/inbox/R01-reply-fix.txt 第 3 节（V1/V5）、第 6 节反例 2（Repeat 刷奖励）、第 3 节 V2（id 分段）
 *
 * V1：SpRequire 里的物品 id，是否出现在同一任务行（或 Pre-Require 直接/传递上游行）的**其它列**里
 *     —— 命中即支持"物品由任务自己发放（TaskGrant）"这一解释。按列拆开报，避免把对白/语言 id 的巧合算成命中。
 * V5：以 Pre-Require 为边建图，从 Pre-Require=0 的根做 BFS；统计引用"不在 item 表"的 id 的任务有多少不可达。
 * Repeat：Repeat≠0 且 SpRequire≠0 且 Reward≠0 的任务（携带型可无限刷奖励的风险面）。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const P = (p) => path.join(ROOT, p);
const OUT = P('tools/facts/r01-screen.json');

const j = (p) => JSON.parse(fs.readFileSync(P(p), 'utf8'));
const taskRaw = j('tools/cfg/tbl_tasknew.json');
const itemRaw = j('tools/cfg/tbl_item.json');
const dropRaw = j('tools/cfg/tbl_drop.json');
const npcRaw = j('tools/cfg/npc_compact.json');

const numericRows = (raw) => Object.keys(raw.table || {}).filter((k) => /^[0-9]+$/.test(k)).map((k) => raw.table[k]);
const tasks = numericRows(taskRaw);
const items = numericRows(itemRaw);
const itemIds = new Set(items.map((r) => Number(r.ID)));
const itemById = new Map();
for (const it of items) itemById.set(Number(it.ID), it);

const isZero = (v) => v === undefined || v === null || v === '' || v === '0' || v === 0 || v === '0|0';
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** SpRequire: "id,count|id,count"（只有 id 表示不校验数量） */
function spItems(sp) {
  const s = String(sp == null ? '' : sp).trim();
  if (!s || s === '0') return [];
  return s.split('|').map((seg) => {
    const parts = String(seg).split(',');
    return { id: num(parts[0]), count: parts.length > 1 ? num(parts[1]) : null };
  }).filter((x) => x.id > 0);
}

/** Pre-Require: "flag,taskID,param|flag,taskID,param" */
function preIds(pre) {
  const s = String(pre == null ? '' : pre).trim();
  if (!s || s === '0') return [];
  const out = [];
  for (const seg of s.split('|')) {
    const parts = String(seg).split(',');
    const id = num(parts[1]);
    if (id > 0) out.push(id);
  }
  return out;
}

const byId = new Map();
for (const t of tasks) byId.set(Number(t.TaskID), t);

const COLUMNS = Object.keys(tasks[0]);           // 41 列
const SKIP_COL = new Set(['SpRequire']);

function cellText(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function hasToken(txt, id) {
  const re = new RegExp('(^|[^0-9])' + id + '([^0-9]|$)');
  return re.test(txt);
}

/** 在给定行集合里，返回命中的列名列表（排除 SpRequire） */
function hitColumns(rows, id) {
  const cols = new Set();
  const re = new RegExp('(^|[^0-9])' + id + '([^0-9]|$)');
  for (const r of rows) {
    for (const c of COLUMNS) {
      if (SKIP_COL.has(c)) continue;
      const txt = cellText(r[c]);
      if (txt && re.test(txt)) cols.add(c);
    }
  }
  return [...cols];
}

// ---------- 采集 SpRequire 物品 ----------
const needPairs = [];                 // {taskId, itemId, count}
const taskOfItem = new Map();         // itemId -> taskId[]
for (const t of tasks) {
  for (const it of spItems(t.SpRequire)) {
    needPairs.push({ taskId: Number(t.TaskID), itemId: it.id, count: it.count });
    if (!taskOfItem.has(it.id)) taskOfItem.set(it.id, []);
    taskOfItem.get(it.id).push(Number(t.TaskID));
  }
}
const needItemIds = [...taskOfItem.keys()];
const missingInItemTable = needItemIds.filter((id) => !itemIds.has(id));

// ---------- V1 ----------
const v1 = {
  pairs: needPairs.length,
  distinctItems: needItemIds.length,
  missingInItemTable: missingInItemTable.length,
  byScope: {},
  columnHistogram: {},
  missingOnly: { pairs: 0, hitDirect: 0, hitClosure: 0, columnHistogram: {}, examples: [] },
};

function preClosure(rootId) {
  const seen = new Set();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop();
    const t = byId.get(id);
    if (!t) continue;
    for (const p of preIds(t['Pre-Require'])) {
      if (!seen.has(p)) { seen.add(p); stack.push(p); }
    }
  }
  return [...seen];
}

const v1Pairs = [];
for (const pr of needPairs) {
  const t = byId.get(pr.taskId);
  if (!t) continue;
  const directRows = [t].concat(preIds(t['Pre-Require']).map((id) => byId.get(id)).filter(Boolean));
  const directCols = hitColumns(directRows, pr.itemId);
  const clo = preClosure(pr.taskId);
  const cloRows = [t].concat(clo.map((id) => byId.get(id)).filter(Boolean));
  const cloCols = clo ? hitColumns(cloRows, pr.itemId) : [];
  const missing = !itemIds.has(pr.itemId);

  v1Pairs.push({ taskId: pr.taskId, itemId: pr.itemId, count: pr.count, missing, directCols, closureCols: cloCols, ancestors: clo.length });

  // 统计（全部 pair）
  for (const c of directCols) v1.columnHistogram[c] = (v1.columnHistogram[c] || 0) + 1;
  if (!v1.byScope.direct) v1.byScope.direct = 0;
  if (directCols.length) v1.byScope.direct++;

  if (missing) {
    v1.missingOnly.pairs++;
    for (const c of directCols) v1.missingOnly.columnHistogram[c] = (v1.missingOnly.columnHistogram[c] || 0) + 1;
    if (directCols.length) v1.missingOnly.hitDirect++;
    if (cloCols.length) v1.missingOnly.hitClosure++;
    if (v1.missingOnly.examples.length < 12) {
      v1.missingOnly.examples.push({ taskId: pr.taskId, itemId: pr.itemId, directCols, closureCols: cloCols, ancestors: clo.length });
    }
  }
}
v1.byScope.closure = v1Pairs.filter((p) => p.closureCols.length).length;
v1.byScope.pairsTotal = v1Pairs.length;

// ---------- V1 对照（防"数字巧合"）：同方法跑在"能在 item 表里查到"的物品 id 上 ----------
// 若对照组命中率与缺失组相当，说明 V1 命中的只是"任务表里也出现同样的数字"，不是"任务发这个物品"。
const controls = needItemIds.filter((id) => itemIds.has(id));
const ctrl = { pairs: 0, hitDirect: 0, columnHistogram: {} };
for (const pr of needPairs) {
  if (!itemIds.has(pr.itemId)) continue;
  const t = byId.get(pr.taskId);
  if (!t) continue;
  const rows = [t].concat(preIds(t['Pre-Require']).map((id) => byId.get(id)).filter(Boolean));
  const cols = hitColumns(rows, pr.itemId);
  ctrl.pairs++;
  for (const c of cols) ctrl.columnHistogram[c] = (ctrl.columnHistogram[c] || 0) + 1;
  if (cols.length) ctrl.hitDirect++;
}

// 列值集合重叠度：某列的取值集合里，被缺失 id / 对照 id 命中的比例
function columnValueSets() {
  const sets = {};
  for (const c of COLUMNS) {
    if (SKIP_COL.has(c)) continue;
    const s = new Set();
    for (const t of tasks) {
      const txt = cellText(t[c]);
      if (!txt) continue;
      for (const m of txt.match(/[0-9]+/g) || []) s.add(Number(m));
    }
    if (s.size) sets[c] = s;
  }
  return sets;
}
const valSets = columnValueSets();
const overlap = { missing: {}, control: {} };
for (const c of Object.keys(valSets)) {
  const s = valSets[c];
  const missHits = missingInItemTable.filter((id) => s.has(id)).length;
  const ctrlHits = controls.filter((id) => s.has(id)).length;
  if (missHits || ctrlHits) {
    overlap.missing[c] = { ids: missHits, pct: +(100 * missHits / missingInItemTable.length).toFixed(1) };
    overlap.control[c] = { ids: ctrlHits, pct: +(100 * ctrlHits / controls.length).toFixed(1) };
  }
}
v1.control = {
  note: '对照组 = 能在 item 表查到的 SpRequire 物品 id；两组命中率接近 = V1 命中是数字巧合',
  controlItems: controls.length,
  pairs: ctrl.pairs,
  hitDirect: ctrl.hitDirect,
  hitPct: +(100 * ctrl.hitDirect / (ctrl.pairs || 1)).toFixed(1),
  columnHistogram: ctrl.columnHistogram,
  valueSetOverlap: overlap,
};

// ---------- V5：可达性 ----------
const children = new Map();   // parentTaskId -> [childTaskId]
const roots = [];
for (const t of tasks) {
  const id = Number(t.TaskID);
  const pres = preIds(t['Pre-Require']);
  if (!pres.length) roots.push(id);
  for (const p of pres) {
    if (!children.has(p)) children.set(p, []);
    children.get(p).push(id);
  }
}
const reach = new Set();
{
  const q = roots.slice();
  while (q.length) {
    const id = q.pop();
    if (reach.has(id)) continue;
    reach.add(id);
    for (const c of children.get(id) || []) if (!reach.has(c)) q.push(c);
  }
}
const deadTasks = tasks.map((t) => Number(t.TaskID)).filter((id) => !reach.has(id));

// 引用缺失 id 的任务中，有多少不可达
const missingTaskIds = new Set();
for (const id of missingInItemTable) for (const t of taskOfItem.get(id) || []) missingTaskIds.add(t);
const missingTasksUnreachable = [...missingTaskIds].filter((id) => !reach.has(id));
const missingItemIdsOnlyInDead = missingInItemTable.filter((id) => (taskOfItem.get(id) || []).every((t) => !reach.has(t)));

// 被"缺失 id"卡住的下游任务数（可达子图内、传递下游）
function downstreamCount(id) {
  const seen = new Set();
  const q = [id];
  while (q.length) {
    const cur = q.pop();
    for (const c of children.get(cur) || []) {
      if (seen.has(c)) continue;
      seen.add(c);
      q.push(c);
    }
  }
  return seen.size;
}

const v5 = {
  totalTasks: tasks.length,
  roots: roots.length,
  reachable: reach.size,
  unreachable: deadTasks.length,
  tasksReferencingMissingItem: missingTaskIds.size,
  missingTasksUnreachable: missingTasksUnreachable.length,
  missingItemIdsOnlyInDeadTasks: missingItemIdsOnlyInDead.length,
  missingItemIdsOnlyInDeadSample: missingItemIdsOnlyInDead.slice(0, 20),
  deadSample: deadTasks.slice(0, 20),
};

// ---------- Repeat 刷奖励面 ----------
const repeatFarms = tasks
  .filter((t) => num(t.Repeat) !== 0 && !isZero(t.SpRequire) && !isZero(t.Reward))
  .map((t) => ({
    taskId: Number(t.TaskID), Repeat: t.Repeat, SpRequire: t.SpRequire, Reward: t.Reward, Type: t.Type, TaskType: t.TaskType,
    downstream: downstreamCount(Number(t.TaskID)),
  }));
const repeatAll = tasks.filter((t) => num(t.Repeat) !== 0).length;

// ---------- id 分段（V2 线索） ----------
const prefixHist = {};
for (const id of missingInItemTable) {
  const s = String(id);
  const key = s.length >= 3 ? s.slice(0, Math.min(2, s.length - 1)) : s;
  prefixHist[key] = (prefixHist[key] || 0) + 1;
}

// ---------- 跨表线索（V2-lite）：这些 id 有没有出现在 drop / npc 表里 ----------
const dropFlat = [];
for (const k of Object.keys(dropRaw.table || {})) {
  if (!/^[0-9]+$/.test(k)) continue;
  const row = dropRaw.table[k];
  for (let i = 1; i <= 5; i++) {
    const it = row['Item' + i];
    if (it === undefined || it === null || it === '' || it === '0') continue;
    const arr = Array.isArray(it) ? it : String(it).split(',');
    dropFlat.push({ dropId: Number(k), itemId: num(arr[0]), count: num(arr[1]) });
  }
}
const dropItemIds = new Set(dropFlat.filter((d) => d.count >= 0).map((d) => d.itemId));
const npcFlat = [];
for (const k of Object.keys(npcRaw)) {
  const v = npcRaw[k] || {};
  if (!v.d || v.d === '0') continue;
  for (const seg of String(v.d).split('|')) {
    const arr = String(seg).split(',');
    npcFlat.push({ npcId: num(k), itemId: num(arr[0]), count: num(arr[1]) });
  }
}
const npcItemIds = new Set(npcFlat.map((d) => d.itemId));

const crossTable = {
  dropItemsDistinct: dropItemIds.size,
  npcDropItemsDistinct: npcItemIds.size,
  missingFoundInDrop: missingInItemTable.filter((id) => dropItemIds.has(id)).length,
  missingFoundInNpcDrop: missingInItemTable.filter((id) => npcItemIds.has(id)).length,
  missingFoundInItemTableAsOtherCol: 0,
};

// ---------- 输出 ----------
const out = {
  generatedAt: new Date().toISOString(),
  source: 'tools/cfg/tbl_tasknew.json / tbl_item.json / tbl_drop.json / npc_compact.json',
  basis: 'docs/sota/inbox/R01-reply-fix.txt §3(V1/V2/V5) §6反例2(Repeat)',
  counts: {
    tasks: tasks.length,
    columns: COLUMNS.length,
    spPairs: needPairs.length,
    spDistinctItems: needItemIds.length,
    spDistinctItemsMissingInItemTable: missingInItemTable.length,
  },
  v1,
  v5,
  repeat: { repeatTasks: repeatAll, farmRisk: repeatFarms.length, farms: repeatFarms.slice(0, 30) },
  prefixHistogram: prefixHist,
  crossTable,
  v1PairsSample: v1Pairs.slice(0, 40),
  missingItemTableIds: missingInItemTable.slice(0, 60),
};

fs.writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');

// ---------- 控制台摘要 ----------
const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) + '%' : '-');
const topCols = (h) => Object.keys(h).sort((a, b) => h[b] - h[a]).slice(0, 8).map((k) => k + '=' + h[k]).join(' ');
console.log('[V1] pairs=' + v1.pairs + '  distinctItems=' + needItemIds.length + '  missingInItemTable=' + missingInItemTable.length);
console.log('     全部 pair 有其它列命中: ' + v1.byScope.direct + '/' + v1.byScope.pairsTotal + ' (' + pct(v1.byScope.direct, v1.byScope.pairsTotal) + ')  直系上游 / 传递上游: ' + v1.byScope.direct + ' / ' + v1.byScope.closure);
console.log('     列分布: ' + topCols(v1.columnHistogram));
console.log('     【缺失 id 专属】pairs=' + v1.missingOnly.pairs + ' 直系命中 ' + v1.missingOnly.hitDirect + ' (' + pct(v1.missingOnly.hitDirect, v1.missingOnly.pairs) + ')  传递命中 ' + v1.missingOnly.hitClosure + ' (' + pct(v1.missingOnly.hitClosure, v1.missingOnly.pairs) + ')');
console.log('     缺失 id 列分布: ' + topCols(v1.missingOnly.columnHistogram));
console.log('[V1-对照] 能在 item 表查到的物品 pair=' + ctrl.pairs + ' 命中 ' + ctrl.hitDirect + ' (' + v1.control.hitPct + '%)  ← 与缺失组 97.6% 对比');
console.log('     对照列分布: ' + topCols(ctrl.columnHistogram));
console.log('     列值集合重叠(缺失% / 对照%): ' + Object.keys(overlap.missing).map((c) => c + ' ' + overlap.missing[c].pct + '/' + (overlap.control[c] ? overlap.control[c].pct : 0)).join('  '));
console.log('[V5] tasks=' + tasks.length + ' roots=' + roots.length + ' reachable=' + reach.size + ' dead=' + deadTasks.length);
console.log('     引用缺失 id 的任务=' + missingTaskIds.size + ' 其中不可达=' + missingTasksUnreachable.length + ' ；只在死任务里出现的缺失 id=' + missingItemIdsOnlyInDead.length);
console.log('[REPEAT] Repeat≠0 任务=' + repeatAll + ' ；Repeat≠0 且 SpRequire≠0 且 Reward≠0 = ' + repeatFarms.length);
console.log('[V2-lite] drop 表物品种类=' + dropItemIds.size + ' npc掉落物品种类=' + npcItemIds.size + ' 缺失 id 命中 drop=' + crossTable.missingFoundInDrop + ' 命中 npc=' + crossTable.missingFoundInNpcDrop);
console.log('[PREFIX] ' + JSON.stringify(prefixHist));
console.log('-> ' + OUT);
