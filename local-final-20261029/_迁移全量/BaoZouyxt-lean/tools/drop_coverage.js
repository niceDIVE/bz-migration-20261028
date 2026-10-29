'use strict';
/**
 * drop_coverage.js —— 任务所需物品能否通过"打怪掉落"合法获得（决定能否下线自动补齐）
 *
 * 输入：
 *   tools/cfg/tbl_tasknew.json   任务表（SpRequire = 完成需携带物品）
 *   tools/cfg/npc_compact.json   npc → Drop 表 id（本次新增）
 *   tools/cfg/tbl_drop.json      掉落表（Item1..5 + probability1..5）
 *   tools/cfg/tbl_item.json      物品表（Type：1=装备 2=消耗品 3=材料…）
 * 输出：tools/facts/drop-coverage.json
 *
 * 判据（沿用 HANDOVER §4.7 的口径）：只收 probability >= 100 的条目。
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'cfg', p), 'utf8'));

const tasknew = rd('tbl_tasknew.json');
const npc = rd('npc_compact.json').npc;
const drop = rd('tbl_drop.json');
const item = rd('tbl_item.json');

const dropTable = drop.table || {};
const itemTable = item.table || {};
const taskTable = tasknew.table || {};

/* 1) 掉落表 id → 可产出的物品集合 */
function itemsOfDrop(dropId) {
  const r = dropTable[dropId] || dropTable[String(dropId)];
  const out = [];
  if (!r) return out;
  for (let i = 1; i <= 5; i++) {
    const it = r['Item' + i];
    const pr = Number(r['probability' + i]);
    if (!it || !(pr >= 100)) continue;
    const id = Array.isArray(it) ? Number(it[0]) : Number(it);
    if (id > 0) out.push(id);
  }
  return out;
}

/* 2) npc 掉落可达的物品 */
const reachable = new Map();   // itemId -> npcId 列表（最多 3 个）
let npcWithDrop = 0, npcNoDrop = 0;
for (const nid of Object.keys(npc)) {
  const d = Number(npc[nid].d);
  if (!(d > 0)) { npcNoDrop++; continue; }
  npcWithDrop++;
  for (const it of itemsOfDrop(d)) {
    const arr = reachable.get(it) || [];
    if (arr.length < 3) arr.push(Number(nid));
    reachable.set(it, arr);
  }
}

/* 3) 任务需要哪些物品 */
const need = new Map();   // itemId -> [taskId...]（最多 3）
for (const tid of Object.keys(taskTable)) {
  const sp = String(taskTable[tid].SpRequire || '').trim();
  if (!sp || sp === '0') continue;
  for (const seg of sp.split('|')) {
    const id = Number(String(seg).split(',')[0]);
    if (!(id > 0)) continue;
    const arr = need.get(id) || [];
    if (arr.length < 3) arr.push(Number(tid));
    need.set(id, arr);
  }
}

/* 4) 覆盖统计 */
const covered = [], missing = [];
for (const [id, tasks] of need) {
  const npcs = reachable.get(id);
  if (npcs && npcs.length) covered.push({ itemId: id, tasks, npcs });
  else missing.push({ itemId: id, tasks, itemType: (itemTable[id] || {}).Type === undefined ? null : itemTable[id].Type });
}

const out = {
  generatedAt: new Date().toISOString(),
  npc: { total: Object.keys(npc).length, withDrop: npcWithDrop, noDrop: npcNoDrop },
  dropItems: reachable.size,
  needItems: need.size,
  coveredItems: covered.length,
  missingItems: missing.length,
  covered,
  missing,
};
fs.writeFileSync(path.join(ROOT, 'tools', 'facts', 'drop-coverage.json'), JSON.stringify(out, null, 1), 'utf8');

console.log('DROP COVERAGE  npc=' + out.npc.total + '(有掉落 ' + npcWithDrop + ')  掉落可产物品=' + reachable.size);
console.log('任务所需物品=' + need.size + '  可打怪获得=' + covered.length + '  无法获得=' + missing.length);
console.log('--- 无法获得的（前 20）---');
missing.slice(0, 20).forEach((m) => console.log('  item=' + m.itemId + ' Type=' + m.itemType + '  任务=' + m.tasks.join(',')));
console.log('-> tools/facts/drop-coverage.json');
