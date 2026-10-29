'use strict';
/**
 * r18/gift_scan2.js —— R18 §2① 判据的可执行落地版（只读）
 * 用法: node "$out\r18\gift_scan2.js"
 *
 * 与 v1 的差别（v1 直接按 R18 字面 F1 跑，结果证明 F1 不可满足）：
 *   R18 F1 原话 =「Effect 13 全部物品的 Data1 都在表的键集 K 里」。
 *   实测 item.full.json: Effect==13 共 1780 件（Type==2），其 Data1 覆盖 1780 个不同 id。
 *   442 张表里没有一张表的键集能同时装下这 1780 个键 → F1 字面不可满足。
 *   故本版改为「逐 id 定位」：对 6625/6810/7105/7106/7226 各自列出「哪张表把它当键」并打印该行。
 * 判定顺序（R18 §2③）：键集里有 Data1(=4567) 而没有 6810 → 键=Data1；反之键=ID；都有 → 待判；都没有 → 表选错。
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'F:\\BaoZouyxt';
const D = path.join(ROOT, 'tools', 'cfg', 'dump');
const TARGETS = [6625, 6810, 7105, 7106, 7226];
const D1_OF_6810 = 4567;

const items = JSON.parse(fs.readFileSync(path.join(D, 'item.full.json'), 'utf8'));
const itemById = new Map();
for (const it of items) if (it && it.ID != null) itemById.set(String(it.ID), it);

const PIPE = /^\s*\d+\s*(,\s*\d+\s*)?(\|\s*\d+\s*(,\s*\d+\s*)?)*$/;
function rewardIds(v) {
  if (Array.isArray(v)) {
    if (!v.length) return null;
    const out = [];
    for (const el of v) {
      if (el == null) return null;
      if (typeof el === 'object') {
        const id = el.id ?? el.ID ?? el.ItemID ?? el.itemID ?? el.itemId;
        if (id == null || isNaN(Number(id))) return null;
        out.push(String(id));
      } else if (typeof el === 'number') { out.push(String(el)); }
      else return null;
    }
    return out;
  }
  if (typeof v === 'string' && v.length && PIPE.test(v)) return v.split('|').map(s => String(s.split(',')[0]).trim());
  if (v && typeof v === 'object') {
    const ks = Object.keys(v);
    if (!ks.length || !ks.every(k => /^\d+$/.test(k))) return null;
    return ks.map(String);
  }
  return null;
}
function rowRewardFields(row) {
  const hits = [];
  for (const fk of Object.keys(row)) {
    if (fk === 'id' || fk === 'ID') continue;
    const ids = rewardIds(row[fk]);
    if (!ids) continue;
    const known = ids.filter(x => itemById.has(x)).length;
    hits.push({ field: fk, n: ids.length, known, ids });
  }
  return hits;
}

const files = fs.readdirSync(D).filter(f => f.endsWith('.json') && f !== 'item.full.json').sort();
const tables = [];
for (const f of files) {
  let t;
  try { t = JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')); } catch (e) { continue; }
  if (!t || typeof t !== 'object' || !t.data || typeof t.data !== 'object') continue;
  tables.push({ file: f, name: t.name || f.replace(/\.json$/, ''), cols: t.cols || [], data: t.data });
}
console.log('=== 读入表数 =', tables.length, '／ Effect13 件数 =', items.filter(i => Number(i.Effect) === 13).length, '===');
console.log('');

// ── A. 逐 id 定位：哪些表的键集里有它
for (const id of TARGETS.concat([D1_OF_6810])) {
  const hit = tables.filter(t => Object.prototype.hasOwnProperty.call(t.data, String(id)));
  console.log(`### id ${id} 出现在 ${hit.length} 张表的键集里: ${hit.map(t => t.name + '(' + Object.keys(t.data).length + '键)').join(', ') || '—'}`);
  for (const t of hit) {
    const row = t.data[String(id)];
    const rf = row && typeof row === 'object' ? rowRewardFields(row) : [];
    console.log(`   [${t.name}] row=${JSON.stringify(row).slice(0, 300)}`);
    console.log(`       奖励样字段: ${rf.length ? rf.map(x => `${x.field}(n=${x.n},known=${x.known})`).join(' ; ') : '无'}`);
  }
  console.log('');
}

// ── B. 对 5 件礼物：在「键里有它」的表里，看 F2/F3 与 R18 §2③ 的分支
console.log('=== B. R18 §2③ 分支判定（键 = Data1 还是键 = ID）===');
const tbl6810 = tables.filter(t => Object.prototype.hasOwnProperty.call(t.data, '6810')).map(t => t.name);
const tbl4567 = tables.filter(t => Object.prototype.hasOwnProperty.call(t.data, '4567')).map(t => t.name);
console.log('有键 6810 的表:', tbl6810.join(',') || '（无）');
console.log('有键 4567 的表:', tbl4567.join(',') || '（无）');
const both = tbl6810.filter(n => tbl4567.includes(n));
const only4567 = tbl4567.filter(n => !tbl6810.includes(n));
const only6810 = tbl6810.filter(n => !tbl4567.includes(n));
console.log('两者都有的表:', both.join(',') || '（无）', ' → 若为空则不是"冲突"');
console.log('只有 4567 的表:', only4567.join(',') || '（无）');
console.log('只有 6810 的表:', only6810.join(',') || '（无）');
console.log('');
console.log('=== C. 4567 自身的 item 行（R18 辅助证据：关键 = Data1 的支持/反驳）===');
const i4567 = itemById.get('4567');
console.log(i4567 ? JSON.stringify({ ID: i4567.ID, Name: i4567.Name, Type: i4567.Type, Effect: i4567.Effect, Data1: i4567.Data1, Data2: i4567.Data2, Data3: i4567.Data3 }) : '4567 不在 item.full.json');
console.log('');
console.log('=== D. 5 件礼物自身行（ID/Data1/Effect 对照）===');
for (const id of TARGETS) {
  const it = itemById.get(String(id));
  console.log(it ? JSON.stringify({ ID: it.ID, Name: it.Name, Type: it.Type, Effect: it.Effect, Data1: it.Data1, Data2: it.Data2, Data3: it.Data3 }) : `${id} 缺行`);
}
