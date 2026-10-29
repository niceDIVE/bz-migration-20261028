/* 一次性：Q2（AttckData 装备改用本档）的形状审批三件套
 * 预期差异：14 del（enterPVEBattle / enterRoguePVEBattle 的 AttckData.equipments.1..7）
 *          + 2 add（AttckData.equipments 空对象标记 "{}"）
 * 理由：新存档没有装备，形状自然为空；以前那 7 个槽位来自抓包快照。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = 'F:/BaoZouyxt';
const GOLD = path.join(ROOT, 'tools', 'golden');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 1), 'utf8');
const sha1_12 = (t) => crypto.createHash('sha1').update(t, 'utf8').digest('hex').slice(0, 12);

const items = [];
for (const raw of fs.readFileSync(path.join(ROOT, 'batch9-facts-20261027', 'shape-diff-q2.txt'), 'utf8').split(/\r?\n/)) {
  const p = raw.split('|').map((s) => s.trim());
  if (p.length < 8) continue;
  if (!/^(add|del|value)$/.test(p[0])) continue;
  items.push({ kind: p[0], action: p[1], path: p[2], sigma: p[7] });
}
console.log('diff 项 =', items.length, '| 按动作:', JSON.stringify(items.reduce((a, i) => (a[i.action] = (a[i.action] || 0) + 1, a), {})));
if (!items.length) throw new Error('没解析到 diff，先重跑 --diff');

const EV_LINE = 74785;   // createPlayerBattleEntity: `for (var o in t.equipments) {`（装备链入口）
const EV = 'index.js:' + EV_LINE;

/* ① planned-changes：按**叶字段**分组（工具算 leaf = 去掉 [n] 后取最后一段，
 *   所以 `AttckData.equipments.3` 的 field 是 "3"，不是 "equipments"——C08 踩过同一个坑） */
const leaf = (p) => p.replace(/\[\d+\]/g, '').split('.').pop();
const byLeaf = {};
for (const it of items) (byLeaf[leaf(it.path)] = byLeaf[leaf(it.path)] || []).push(it);
const numLeaves = Object.keys(byLeaf).filter((k) => /^\d+$/.test(k));
const rules = [];
if (numLeaves.length) {
  rules.push({
    id: 'q2-equipments-slots',
    field: numLeaves,                       // 槽位号当字段名（工具就是这么算的）
    expect: numLeaves.reduce((n, k) => n + byLeaf[k].length, 0),
    allowSigma: numLeaves.flatMap((k) => byLeaf[k].map((i) => [i.action, i.path])),
    ev: EV,
    why: 'Q2：AttckData 的装备槽位改由本档 s.equipments 驱动；新存档没有装备 → 原来从抓包快照来的 1..7 槽位不再出现',
  });
}
const otherLeaves = Object.keys(byLeaf).filter((k) => !/^\d+$/.test(k));
if (otherLeaves.length) {
  rules.push({
    id: 'q2-equipments-obj',
    field: otherLeaves,
    expect: otherLeaves.reduce((n, k) => n + byLeaf[k].length, 0),
    allowSigma: otherLeaves.flatMap((k) => byLeaf[k].map((i) => [i.action, i.path])),
    ev: EV,
    why: 'Q2：equipments 现在是"本档无装备 → 空对象"，空对象标记属新发路径',
  });
}
writeJson(path.join(GOLD, 'planned-changes.json'), rules);
console.log('planned 规则 =', rules.length, '| field 组 =', JSON.stringify(rules.map((r) => r.field)),
  '| 条目合计 =', rules.reduce((n, r) => n + r.expect, 0));

/* ② approved-narrowing：发→不发（那 7 个槽位） */
const nPath = path.join(GOLD, 'approved-narrowing.json');
const appsN = readJson(nPath);
const nSet = new Set(appsN.map((r) => r.action + '|' + r.path));
let nAdd = 0;
for (const it of items) {
  if (it.kind !== 'del') continue;
  const key = it.action + '|' + it.path;
  if (nSet.has(key)) continue;
  appsN.push({
    action: it.action, path: it.path, escape: 'closed',
    reason: 'Q2：装备槽位改由本档存档驱动（s.equipments），新存档没有装备 → 这个槽位不再出现；客户端 `for (var o in t.equipments)` 对空对象安全（index.js:74785）',
    ev: EV,
  });
  nSet.add(key); nAdd++;
}
writeJson(nPath, appsN);
console.log('narrowing 新增 =', nAdd);

/* ③ approved-widening：新增的空对象标记 */
const wPath = path.join(GOLD, 'approved-widening.json');
const appsW = readJson(wPath);
const wSet = new Set(appsW.map((r) => r.action + '|' + r.path));
let wAdd = 0;
for (const it of items) {
  if (it.kind !== 'add') continue;
  const key = it.action + '|' + it.path;
  if (wSet.has(key)) continue;
  appsW.push({
    action: it.action, path: it.path,
    reason: 'Q2：equipments 由"有 7 个快照槽位"变成"本档无装备 → 空对象"，空对象标记属新发路径',
    ev: EV,
  });
  wSet.add(key); wAdd++;
}
writeJson(wPath, appsW);
console.log('widening 新增 =', wAdd);

/* ④ 证据点：equipments 已有就不动，没有就补一行 */
const evPath = path.join(GOLD, 'evidence-sha1.json');
const evJ = readJson(evPath);
if (!(Array.isArray(evJ.fields.equipments) && evJ.fields.equipments.length)) {
  const lines = fs.readFileSync(path.join(ROOT, 'tools', 'index.js'), 'utf8').split(/\r?\n/);
  const text = lines[EV_LINE - 1];
  evJ.fields.equipments = [{ bundle: 'index.js', line: EV_LINE, sha1: sha1_12(String(text).trim()) }];
  writeJson(evPath, evJ);
  console.log('evidence 补 equipments ← index.js:' + EV_LINE + ' :: ' + String(text).trim().slice(0, 90));
} else {
  console.log('evidence equipments 已存在，未动');
}
