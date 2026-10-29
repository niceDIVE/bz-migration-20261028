'use strict';
/**
 * r18/gift_scan.js —— R18 §2① 的 F1/F2/F3 判据批跑器（只读）
 * 用法: node "$out\r18\gift_scan.js"
 * 输入: tools/cfg/dump/*.json（每张 = {name,rows,cols,data:{id:row}}）+ item.full.json
 * 输出: 全表逐张判定 + 候选表清单（F1∧F2∧F3）
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'F:\\BaoZouyxt';
const D = path.join(ROOT, 'tools', 'cfg', 'dump');

const items = JSON.parse(fs.readFileSync(path.join(D, 'item.full.json'), 'utf8'));
const itemById = new Map();
for (const it of items) if (it && it.id != null) itemById.set(String(it.id), it);

const eff = e => items.filter(i => Number(i.Type) === 2 && Number(i.Effect) === e);
const e13 = eff(13), e8 = eff(8);

const d13 = [...new Set(e13.map(i => String(i.Data1)))];          // Effect13 的 Data1 集合
const famIds = new Set();
for (const i of [...e13, ...e8]) { famIds.add(String(i.id)); famIds.add(String(i.Data1)); }

// 「奖励样」字段：数组 of 数字/对象，或 "id,cnt|id,cnt" 字符串
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
      } else if (typeof el === 'number') {
        if (!itemById.has(String(el))) return null;
        out.push(String(el));
      } else return null;
    }
    return out;
  }
  if (typeof v === 'string' && PIPE.test(v) && v.length) {
    const out = [];
    for (const seg of v.split('|')) out.push(String(seg.split(',')[0]).trim());
    return out;
  }
  if (v && typeof v === 'object') {                 // {itemId:count}
    const ks = Object.keys(v);
    if (!ks.length) return null;
    if (!ks.every(k => /^\d+$/.test(k))) return null;
    return ks.map(String);
  }
  return null;
}

const files = fs.readdirSync(D).filter(f => f.endsWith('.json') && f !== 'item.full.json').sort();
const rows = [];
for (const f of files) {
  let t;
  try { t = JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')); } catch (e) { rows.push({ file: f, skip: 'bad-json' }); continue; }
  if (!t || typeof t !== 'object' || !t.data || typeof t.data !== 'object') { rows.push({ file: f, skip: 'no-data' }); continue; }
  const K = Object.keys(t.data);
  const Kset = new Set(K);
  const f1a = d13.every(k => Kset.has(k));                       // Effect13 全部 Data1 ⊂ K
  const inter = K.filter(k => famIds.has(k)).length;
  const f1b = K.length ? inter / K.length : 0;                   // (Effect8∪13 的 id∪Data1) ∩ K / |K|
  const f1 = f1a && f1b >= 0.5;

  // F2：行内有奖励样字段，且元素多为 item.id
  let f2 = null;
  for (const k of K) {
    const row = t.data[k];
    if (!row || typeof row !== 'object') continue;
    for (const fk of Object.keys(row)) {
      if (fk === 'id') continue;
      const ids = rewardIds(row[fk]);
      if (!ids || ids.length < 1) continue;
      const hit = ids.filter(x => itemById.has(x)).length;
      if (hit / ids.length >= 0.8 && hit >= 1) { f2 = { key: k, field: fk, n: ids.length, hit }; break; }
    }
    if (f2) break;
  }

  // F3：Data1==自身ID 的那几件，奖励不能只有它自己
  const selfDup = e13.filter(i => String(i.id) === String(i.Data1));
  let f3ok = true, f3note = '';
  for (const it of selfDup) {
    const k = String(it.Data1);
    if (!Kset.has(k)) { f3ok = false; f3note += ` 缺键${k};`; continue; }
    const row = t.data[k] || {};
    const ids = [];
    for (const fk of Object.keys(row)) { const r = rewardIds(row[fk]); if (r) ids.push(...r); }
    if (!ids.length) { f3ok = false; f3note += ` ${k}行无奖励字段;`; }
    else if (ids.length === 1 && ids[0] === k) { f3ok = false; f3note += ` ${k}只产出自身;`; }
  }

  rows.push({
    file: f, table: t.name || f.replace(/\.json$/, ''), keys: K.length, cols: (t.cols || []).length,
    f1a, f1b: Number(f1b.toFixed(3)), f1, f2, f3: f3ok, f3note: f3note.trim()
  });
}

const cand = rows.filter(r => r.f1 && r.f2 && r.f3);
console.log('=== 扫描表数 =', rows.filter(r => !r.skip).length, '/ 读入', files.length, '===');
console.log('Effect13 物品:', e13.map(i => `${i.id}(Data1=${i.Data1})`).join(' '));
console.log('Effect8  物品数:', e8.length, '   键集 D13 =', d13.join(','));
console.log('');
console.log('=== 候选（F1∧F2∧F3，共 ' + cand.length + ' 张）===');
for (const r of cand) {
  console.log(`[HIT] ${r.table}  keys=${r.keys} cols=${r.cols} f1b=${r.f1b} f2={key:${r.f2.key},field:${r.f2.field},n:${r.f2.n},hit:${r.f2.hit}} f3ok=${r.f3}`);
}
console.log('');
console.log('=== 只过 F1（键集吻合但无行内奖励字段）===');
for (const r of rows.filter(x => x.f1 && !x.f2)) console.log(`[F1] ${r.table} keys=${r.keys} f1b=${r.f1b} f3=${r.f3} ${r.f3note}`);
console.log('');
console.log('=== F1 未过但 f1b≥0.3 的表（供人工看是否选错表）===');
for (const r of rows.filter(x => !x.f1 && x.f1b >= 0.3).sort((a, b) => b.f1b - a.f1b)) {
  console.log(`[~] ${r.table} keys=${r.keys} f1a=${r.f1a} f1b=${r.f1b} f2=${r.f2 ? r.f2.field : '-'}`);
}
console.log('');
console.log('=== 含 6625/6810/7105/7106/7226 任一键的表（对照 F1a 失败原因）===');
for (const r of rows.filter(x => !x.skip)) {
  const t = JSON.parse(fs.readFileSync(path.join(D, r.file), 'utf8'));
  const K = Object.keys(t.data);
  const inK = d13.filter(k => K.includes(k));
  if (inK.length) console.log(`[${inK.length}/5] ${r.table} keys=${r.keys} 命中=${inK.join(',')} f1b=${r.f1b}`);
}
