/* 一次性：按 --diff 结果生成 C08 的形状审批三件套 + 证据点
 *  ① tools\golden\planned-changes.json    （C7/C8：逐路径覆盖 + allowSigma + ev）
 *  ② tools\golden\approved-widening.json  （C2：新增路径逐条 reason + ev）
 *  ③ tools\golden\approved-narrowing.json （C3b：发→不发，escape:"closed"）
 *  ④ tools\golden\evidence-sha1.json      （C3：新字段的证据行 + sha1_12）
 * 只跑一次；跑完用 check_shape_freeze.js（校验模式）验。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = 'F:/BaoZouyxt';
const GOLD = path.join(ROOT, 'tools', 'golden');
const TOOLS = path.join(ROOT, 'tools');
const DIFF = path.join(ROOT, 'batch9-facts-20261027', 'shape-diff-c08.txt');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 1), 'utf8');
const sha1_12 = (t) => crypto.createHash('sha1').update(t, 'utf8').digest('hex').slice(0, 12);

const bundleLines = {};
function lineOf(bundle, n) {
  if (!bundleLines[bundle]) bundleLines[bundle] = fs.readFileSync(path.join(TOOLS, bundle), 'utf8').split(/\r?\n/);
  return bundleLines[bundle][n - 1];
}

/* ── 解析 diff ───────────────────────────────────────────────────── */
const items = [];
for (const raw of fs.readFileSync(DIFF, 'utf8').split(/\r?\n/)) {
  const m = raw.match(/^\s*(add|del|value)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
  if (!m) continue;
  const parts = raw.split('|').map((s) => s.trim());
  items.push({ kind: m[1], action: parts[1], path: parts[2], v0: parts[3], v1: parts[5], sigma: parts[7] || '' });
}
console.log('解析到 diff 项 =', items.length);
const leaf = (p) => p.replace(/\[\d+\]/g, '').split('.').pop();

/* ── 字段 → 证据行（都取自客户端消费端，逐条打印供人眼核） ───────────── */
const EV_LINES = {
  baseValueAy: [74921],
  skillMap: [74798],
  WeapToSkill: [74807, 74840],
  equipments: [74785],
  equips: [74788],
  gemData: [74784],
  equipTitle: [74886],
  inherit: [74791],
  itemSkill: [74842],
  buffs: [74887],
  weapToSkinData: [74889],
  fashionEffect: [74890],
  wId: [74892],
  partnerSkillMap: [74896],
  happinessNum: [74895],
  roleRound: [74766],
  sceneType: [74771],
  addAtt: [74853],
  youngTimes: [74782],
  veinObj: [74859],
  roleID: [74775],
  npcArr: [98846],
  randSeed: [98849],
  gold: [98835],
  action: [98878],
  attArr: [98855],
  AttckData: [98836],
  EnemyData: [101329],
  eRet: [101327],
  npcID: [98848],
};

/* ── ④ 证据点补齐 ─────────────────────────────────────────────────── */
const evPath = path.join(GOLD, 'evidence-sha1.json');
const evJ = readJson(evPath);
let evAdded = 0;
const needFields = Array.from(new Set(items.map((it) => leaf(it.path)))).sort();
console.log('diff 涉及的叶字段 =', needFields.join(','));
for (const f of needFields) {
  const cur = evJ.fields[f];
  if (Array.isArray(cur) && cur.length) continue;
  const lines = EV_LINES[f];
  if (!lines) { console.log('⚠ 无证据行可给:', f); continue; }
  evJ.fields[f] = lines.map((n) => {
    const text = lineOf('index.js', n);
    if (text == null) throw new Error('证据行读不到 index.js:' + n);
    console.log('  + ' + f + ' ← index.js:' + n + ' :: ' + text.trim().slice(0, 100));
    return { bundle: 'index.js', line: n, sha1: sha1_12(text.trim()) };
  });
  evAdded++;
}
writeJson(evPath, evJ);
console.log('证据字段新增 =', evAdded);

/* ── ①②③ 三件套 ─────────────────────────────────────────────────── */
const evOf = (f) => 'index.js:' + (EV_LINES[f] ? EV_LINES[f][0] : 74919);

// ① planned-changes：按 (action, leaf) 分组
const groups = new Map();
for (const it of items) {
  const key = it.action + '|' + leaf(it.path);
  if (!groups.has(key)) groups.set(key, { action: it.action, field: leaf(it.path), paths: [] });
  groups.get(key).paths.push(it.path);
}
const rules = [];
for (const [key, g] of Array.from(groups.entries()).sort()) {
  rules.push({
    id: 'c08-' + g.action + '-' + g.field,
    action: g.action,
    field: [g.field],
    expect: g.paths.length,
    allowSigma: g.paths.filter((p) => {
      const it = items.find((x) => x.action === g.action && x.path === p);
      return it && it.sigma && it.sigma.indexOf('→') >= 0 && it.sigma.split('→')[0].trim() !== it.sigma.split('→')[1].trim();
    }).map((p) => [g.action, p]),
    ev: evOf(g.field),
    why: 'C08 PVE 战斗族：' + g.action + ' 的 ' + g.field + ' 按客户端消费端取值（' + evOf(g.field) + '）',
  });
}
writeJson(path.join(GOLD, 'planned-changes.json'), rules);
console.log('planned-changes 规则数 =', rules.length);

// ② approved-widening：新增路径
const wPath = path.join(GOLD, 'approved-widening.json');
const appsW = readJson(wPath);
const wSet = new Set(appsW.map((r) => r.action + '|' + r.path));
const REASON = {
  add: 'C08 战斗开局应答：AttckData 按抓包模板内层给（客户端 createPlayerBattleEntity 裸读，缺键即 TypeError）',
  'del-X': 'n/a',
};
const reasonOf = (it) => {
  const f = leaf(it.path);
  if (f === 'npcArr') return 'C08 战斗开局：npcArr 由 BZ_NPCARR[npcID] 给真值（客户端 generateNpcData 逐项下标读，空数组会在 index.js:8118 抛错）';
  if (f === 'randSeed') return 'C08 战斗开局：randSeed 每场不同（形状默认恒 0 会让每局随机完全一样）';
  if (f === 'gold') return 'C08 复活血条：gold 置 0（客户端当复活价用 index.js:98835，复活动作未做，不能给假的 99999）';
  return REASON.add + '（' + evOf(f) + '）';
};
let wAdd = 0;
for (const it of items) {
  if (it.kind !== 'add') continue;
  const key = it.action + '|' + it.path;
  if (wSet.has(key)) continue;
  appsW.push({ action: it.action, path: it.path, reason: reasonOf(it), ev: evOf(leaf(it.path)) });
  wSet.add(key);
  wAdd++;
}
writeJson(wPath, appsW);
console.log('approved-widening 新增 =', wAdd);

// ③ approved-narrowing：发→不发
const nPath = path.join(GOLD, 'approved-narrowing.json');
const appsN = readJson(nPath);
const nSet = new Set(appsN.map((r) => r.action + '|' + r.path));
let nAdd = 0;
for (const it of items) {
  if (it.kind !== 'del') continue;
  const key = it.action + '|' + it.path;
  if (nSet.has(key)) continue;
  const f = leaf(it.path);
  let why;
  if (it.action === 'ChallengePVP') why = '拒绝应答收窄到 {eRet:3}（narrowReject 按 REJECT_CODES 白名单剔键），客户端 eRet 3 分支不读 AttckData/EnemyData（index.js:101338-101341）';
  else if (f === 'npcArr') why = 'npcArr 由空数组变成真值数组（310003 的 22 项），空数组标记 [] 随之消失';
  else if (f === 'AttckData') why = 'AttckData 由空壳 {} 变成展开的真对象（{ } 标记消失，改由 AttckData.* 逐路径覆盖）';
  else why = 'C08：' + it.action + ' 的 ' + f + ' 不再发（改为由 AttckData.* 覆盖）';
  appsN.push({ action: it.action, path: it.path, escape: 'closed', reason: why, ev: evOf(f) });
  nSet.add(key);
  nAdd++;
}
writeJson(nPath, appsN);
console.log('approved-narrowing 新增 =', nAdd);
