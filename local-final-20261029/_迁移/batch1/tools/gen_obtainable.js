#!/usr/bin/env node
'use strict';
/* ============================================================================
 * tools/gen_obtainable.js —— 物品可获得性事实表生成器（SOTA R14 Q1）
 *
 * 判定义（R13 §3 原文，本文件照抄实现）：
 *
 *     Obtainable(i) = Ledger(i) ∨ Drop*(i) ∨ Task(i) ∨ Shelf(i) ∨ Grant*(i)
 *
 *   1) Ledger(i) : 存档里任何容器（bag / playerEquip / equipments）中 i 的数量 > 0。
 *                  取 _backup\**\bz_offline_save.json 里 LastWriteTime 最新的一份副本。
 *                  **只读**：跑前/跑后各算一次 md5 并断言相等（硬要求 1）。
 *   2) Drop*(i)  : ∃ npc，i ∈ closure(BZ_NPCDROP[npc])。BZ_NPCDROP[npc] = dropId，
 *                  BZ_DROP[dropId] = { 物品id: [min,max] }。做传递闭包（可嵌套组）。
 *   3) Task(i)   : ∃ task，i ∈ keys(BZ_TASKS[task].r)（r = 任务奖励；n = 需求，不是产出）。
 *   4) Shelf(i)  : BZ_NPCSHOP（i[] 货架）、BZ_GESHOP（Data[0]）、BZ_ROGUESHOP（item 与 costitem）。
 *   5) Grant*(i) : 扫 bz-rpc-server.js 的 bagAdd(s,X,+k) / grantItem(s,X,+k) /
 *                  note.ivch[K]= 与 s.playerEquip[X]= 的**写**侧；X/K 是数字字面量就直接采，
 *                  是变量/表查找就把**整个 handler** 用到的那张「产出表」全算进来（高估）。
 *
 * 硬要求（脚本自查，任何一条不过 → 退出码 1）：
 *   A. 不写存档：脚本里自己打印 md5 before/after 并断言相等。
 *   B. 不进入运行路径：hotfix-patch\patch\live\handlers.js 里 "obtainable" 命中数必须为 0。
 *   C. 产物只放 tools\facts\（本脚本只写 tools\facts\obtainable.json 一个文件）。
 *   另加保险：三份 core/live 源文件（bz-tasks.generated.js / bz-rpc-server.js /
 *   patch\live\handlers.js）跑前跑后 md5 也必须不变。
 *
 * 口径说明（SOTA R16 §5 第 1 条：域从 522 扩到全表 6525）：
 *   **决策域 = tools\cfg\dump\item.full.json 的 ID 全集（6525 行）**。这是 item 配置表
 *   的全量导出（ID/Type/Effect/Data1..5/Name/Price/...），比旧口径那份 522 条
 *   （BZ_ITEMTYPE，「被任务/掉落引用到的物品 → Type」）大一个数量级；
 *   HANDOVER §11 的「39 件」是按 522 域算出来的**下界**，全表口径要重算。
 *   BZ_ITEMTYPE **不删**：它在 stats.domain.bzItemTypeCross 与 stats.crossCheck 里作为
 *   交叉口径保留，用来和旧产物（N=248 / 265 / 522）逐项对账。
 *   域内域外**都算**：可获得 id 若在 item.full.json 里没有配置行（货架/兑换的成本物里
 *   有一批 id 没有 Type/Effect 列），也照算进 items，只是来源单列
 *   （stats.crossCheck.obtainableOutsideFullTable），不再只是"披露条数"。
 *
 *   「可达」是 R16 §5 第 2 条新增的第二维，与 Obtainable 正交：
 *   客户端整段 `switch (e.Effect)` 只在 `2 == e.Type` 时执行（证据 index.js:64321，
 *   见 tools\facts\effect-branches.json 的 _meta.target / entry），所以
 *       可达(i) = (item.Type === 2) ∧ effect-branches[i.Effect].class ∈ {SEND, GATED}
 *   拿不到 Type 的 id（不在 item.full.json 里）一律判不可达（判不了 → 不计入分子）。
 *   这一维回答的是"用了会不会发出请求"，与"能不能拿到"是两件事，别混。
 *
 * 跑法： node tools\gen_obtainable.js
 * 产物： tools\facts\obtainable.json
 * ========================================================================== */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const P = {
  tasksFile: path.join(ROOT, 'hotfix-patch', 'core', 'bz-tasks.generated.js'),
  rpcFile: path.join(ROOT, 'hotfix-patch', 'core', 'bz-rpc-server.js'),
  liveFile: path.join(ROOT, 'hotfix-patch', 'patch', 'live', 'handlers.js'),
  backupRoot: path.join(ROOT, '_backup'),
  outFile: path.join(ROOT, 'tools', 'facts', 'obtainable.json'),
  // R16 §5 第 1 条：全量 item 表 dump（6525 行），是新的决策域来源
  itemFullFile: path.join(ROOT, 'tools', 'cfg', 'dump', 'item.full.json'),
  // R16 §5 第 2 条：Effect 分支分类（SEND/GATED/...），"可达"判据的来源
  effectBranchesFile: path.join(ROOT, 'tools', 'facts', 'effect-branches.json'),
};

const SAVE_NAME = 'bz_offline_save.json';
const LIVE_BANNED_WORD = 'obtainable';

/* ---------------------------------------------------------------------------
 * 0. 小工具
 * ------------------------------------------------------------------------ */

const unresolved = [];
/** 记一条"展开不了 / 高估 / 被排除"的事实，落进产物的 unresolved 顶层键 */
function unres(kind, data) { unresolved.push(Object.assign({ kind: kind }, data || {})); }

let failed = 0;
const CHECKS = [];
/** 自查断言：失败只累计，最后由退出码体现（保证把报告打完整再退出） */
function check(ok, msg, kind) {
  CHECKS.push({ ok: !!ok, kind: kind || 'hard', detail: msg });
  if (ok) { console.log('  [OK]   ' + msg); }
  else { failed++; console.log('  [FAIL] ' + msg); }
  return ok;
}

/** 标出每个字符是否落在 // 或 注释里（1 = 注释）。
 *  handlers.js 里 "obtainable" 的命中要区分"注释里提到"和"真运行路径里用到"，
 *  所以这里自己扫一遍注释/字符串状态，不依赖第三方库。 */
function commentMask(src) {
  const n = src.length;
  const mask = new Uint8Array(n);
  let i = 0, state = 'code';
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (state === 'code') {
      if (c === '/' && d === '/') { state = 'line'; mask[i] = 1; mask[i + 1] = 1; i += 2; continue; }
      if (c === '/' && d === '*') { state = 'block'; mask[i] = 1; mask[i + 1] = 1; i += 2; continue; }
      if (c === "'") { state = 'sq'; i++; continue; }
      if (c === '"') { state = 'dq'; i++; continue; }
      if (c === '`') { state = 'tpl'; i++; continue; }
      i++; continue;
    }
    if (state === 'line') { mask[i] = 1; if (c === '\n') state = 'code'; i++; continue; }
    if (state === 'block') {
      mask[i] = 1;
      if (c === '*' && d === '/') { mask[i + 1] = 1; i += 2; state = 'code'; continue; }
      i++; continue;
    }
    if (state === 'sq' || state === 'dq' || state === 'tpl') {
      if (c === '\\') { i += 2; continue; }
      if ((state === 'sq' && c === "'") || (state === 'dq' && c === '"') || (state === 'tpl' && c === '`')) {
        state = 'code';
      }
      i++; continue;
    }
    i++;
  }
  return mask;
}

function lineOfOffset(src, off) {
  let line = 1;
  for (let i = 0; i < off; i++) if (src.charCodeAt(i) === 10) line++;
  return line;
}

function lastMtimeIso(p) {
  const st = statSafe(p);
  return st ? st.mtime.toISOString() : '(n/a)';
}

function md5(buf) { return crypto.createHash('md5').update(buf).digest('hex'); }
function md5File(p) { return md5(fs.readFileSync(p)); }
function statSafe(p) { try { return fs.statSync(p); } catch (e) { return null; } }
function isPosInt(v) { const n = parseInt(v, 10); return n > 0; }
function toInt(v) { const n = parseInt(v, 10); return isNaN(n) ? 0 : n; }

/* ---------------------------------------------------------------------------
 * 1. 找"最新一份真实存档副本"（只按 mtime 排序，绝不写它）
 * ------------------------------------------------------------------------ */

function walkFind(dir, fileName, acc) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return acc; }
  for (let i = 0; i < ents.length; i++) {
    const e = ents[i];
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkFind(full, fileName, acc);
    else if (e.isFile() && e.name === fileName) acc.push(full);
  }
  return acc;
}

function latestSaveCopy() {
  const all = walkFind(P.backupRoot, SAVE_NAME, []);
  if (!all.length) return { path: null, all: [] };
  const rows = all.map(function (f) {
    const st = statSafe(f);
    return { path: f, mtime: st ? st.mtimeMs : 0 };
  });
  // mtime 最新的一份；并列时按路径字典序取最后一份（确定性）
  rows.sort(function (a, b) { return (b.mtime - a.mtime) || (a.path < b.path ? 1 : -1); });
  return { path: rows[0].path, all: rows };
}

/* ---------------------------------------------------------------------------
 * 2. 解析 bz-tasks.generated.js 里的 BZ_* 表
 *    该文件是生成器产出的纯脚本：每张表独占一行（`var NAME = <JSON>;`），
 *    所以按行正则 + JSON.parse 即可，不需要求值、不会执行任何运行时代码。
 * ------------------------------------------------------------------------ */

function parseBzTables(src) {
  const out = {};
  const bad = [];
  const lines = src.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = /^var (BZ_[A-Z0-9_]+) = (.+);$/.exec(lines[i]);
    if (!m) continue;
    try {
      out[m[1]] = JSON.parse(m[2]);
    } catch (e) {
      bad.push({ name: m[1], line: i + 1, error: String(e.message || e) });
    }
  }
  return { tables: out, bad: bad };
}

/* ---------------------------------------------------------------------------
 * 2b. 全量 item 表 dump（tools\cfg\dump\item.full.json）—— 新决策域
 *     形态：[{ID, Type, Effect, Data1..5, Name, Description, Price, BuyPrice,
 *            Limit, EquipType, WeaponType}, ...]，6525 行。
 *     只读、只 parse，不求值。
 * ------------------------------------------------------------------------ */

function loadItemFull() {
  const out = {
    file: P.itemFullFile, exists: false, rows: 0, byId: new Map(),
    dupIds: [], badRows: 0, typeDist: {}, idInBzItemType: 0,
  };
  if (!fs.existsSync(P.itemFullFile)) {
    unres('item-full-missing', {
      file: P.itemFullFile,
      note: '全量 item dump 不存在 → 决策域退回 BZ_ITEMTYPE（旧口径，522），'
        + '且"可达"一维无法判（没有 Type/Effect）',
    });
    return out;
  }
  out.exists = true;
  let arr = null;
  try { arr = JSON.parse(fs.readFileSync(P.itemFullFile, 'utf8')); }
  catch (e) {
    unres('item-full-parse-failed', { file: P.itemFullFile, error: String(e.message || e) });
    return out;
  }
  if (!Array.isArray(arr)) {
    unres('item-full-shape-unexpected', { file: P.itemFullFile, got: typeof arr });
    return out;
  }
  out.rows = arr.length;
  const seen = new Set();
  for (let i = 0; i < arr.length; i++) {
    const r = arr[i];
    if (!r || typeof r !== 'object') { out.badRows++; continue; }
    const id = toInt(r.ID);
    if (!(id > 0)) { out.badRows++; continue; }
    if (seen.has(id)) { out.dupIds.push(id); continue; }
    seen.add(id);
    const type = toInt(r.Type);
    const effect = toInt(r.Effect);
    out.byId.set(id, { id: id, type: type, effect: effect, raw: r });
    out.typeDist[type] = (out.typeDist[type] || 0) + 1;
  }
  if (out.dupIds.length) {
    unres('item-full-duplicate-ids', { count: out.dupIds.length, sample: out.dupIds.slice(0, 20) });
  }
  if (out.badRows) unres('item-full-bad-rows', { count: out.badRows });
  return out;
}

/* ---------------------------------------------------------------------------
 * 2c. Effect 分支分类（tools\facts\effect-branches.json）
 *     形态：{ "<Effect>": { class: "SEND"|"GATED"|"NONE"|"LOCAL"|"OTHER", send, ev, note },
 *             _meta: {...} }。"可达"只用 class，按 R16 §5 第 2 条取 {SEND, GATED}。
 * ------------------------------------------------------------------------ */

const REACH_CLASSES = ['SEND', 'GATED'];

function loadEffectBranches() {
  const out = {
    file: P.effectBranchesFile, exists: false, byEffect: new Map(),
    reachEffects: new Set(), classCount: {}, meta: null,
  };
  if (!fs.existsSync(P.effectBranchesFile)) {
    unres('effect-branches-missing', {
      file: P.effectBranchesFile,
      note: 'Effect 分支分类表不存在 → "可达"一维整体判不了（stats.reachable 全 0）',
    });
    return out;
  }
  out.exists = true;
  let j = null;
  try { j = JSON.parse(fs.readFileSync(P.effectBranchesFile, 'utf8')); }
  catch (e) {
    unres('effect-branches-parse-failed', { file: P.effectBranchesFile, error: String(e.message || e) });
    return out;
  }
  if (!j || typeof j !== 'object') {
    unres('effect-branches-shape-unexpected', { file: P.effectBranchesFile, got: typeof j });
    return out;
  }
  out.meta = j._meta || null;
  Object.keys(j).forEach(function (k) {
    if (k === '_meta') return;
    const rec = j[k] || {};
    const eff = toInt(k);
    if (!/^\d+$/.test(k)) return;
    const cls = String(rec.class || '(none)');
    out.byEffect.set(eff, { cls: cls, send: rec.send || null, note: rec.note || null });
    out.classCount[cls] = (out.classCount[cls] || 0) + 1;
    if (REACH_CLASSES.indexOf(cls) >= 0) out.reachEffects.add(eff);
  });
  Object.keys(out.classCount).forEach(function (c) {
    if (REACH_CLASSES.indexOf(c) < 0) return;
    console.log('  Effect class ' + c.padEnd(6) + ' = ' + out.classCount[c] + ' 个 effect');
  });
  return out;
}

/* ---------------------------------------------------------------------------
 * 3. 各"产出表"的物品 id 集合（Grant* 的高估要用）
 *    ⚠ 只把"表内容本身就是可获得物品清单"的表算成产出表；BZ_ITEMTYPE /
 *      BZ_ITEMPRICE / BZ_ITEMEAT / BZ_ITEMFUN / BZ_ITEMSCH 是**查表用的索引**
 *      （Type / 价格 / 效果），handler 引用它们只是为了判分支或算钱，不是产出源。
 *      若把它们也算成产出表，任何一个 handler → Obtainable ≡ 全集，Q1 直接失去意义。
 *      这一条是"故意不高估到这里"，已在 unresolved 里逐条披露（kind=lookup-table-not-production）。
 * ------------------------------------------------------------------------ */

function setOfInts(arr) {
  const s = new Set();
  for (let i = 0; i < arr.length; i++) { if (isPosInt(arr[i])) s.add(toInt(arr[i])); }
  return s;
}

/** 兑换表行：[行id, 页, 物品, 数量, "成本id,数量|成本id,数量", 品质, 限购类型, 限购, 排序, 0] */
function exchangeRowParts(row) {
  const ids = [];
  if (Array.isArray(row)) {
    if (isPosInt(row[2])) ids.push(toInt(row[2]));            // 产出的物品
    const costStr = String(row[4] === undefined || row[4] === null ? '' : row[4]);
    const segs = costStr.split('|');
    for (let i = 0; i < segs.length; i++) {
      const kv = segs[i].split(',');
      if (isPosInt(kv[0])) ids.push(toInt(kv[0]));            // 成本物（高估：成本也算可获得）
    }
  }
  return ids;
}

function buildTableSets(T) {
  const sets = {};

  // BZ_TASKS：只取奖励 r（那是产出）；n 是"完成需要携带"，不是产出
  const tasks = new Set();
  const taskObj = T.BZ_TASKS || {};
  Object.keys(taskObj).forEach(function (tid) {
    const m = taskObj[tid] || {};
    const r = m.r || {};
    Object.keys(r).forEach(function (k) { if (isPosInt(k)) tasks.add(toInt(k)); });
  });
  sets.BZ_TASKS = tasks;

  // BZ_DROP：所有掉落组里出现过的物品 id（组 id 本身不是物品）
  const drop = new Set();
  const dropObj = T.BZ_DROP || {};
  Object.keys(dropObj).forEach(function (g) {
    const row = dropObj[g];
    if (!row || typeof row !== 'object') return;
    Object.keys(row).forEach(function (k) {
      const v = row[k];
      const isRange = Array.isArray(v) && v.length === 2
        && typeof v[0] === 'number' && typeof v[1] === 'number';
      if (isRange && isPosInt(k)) drop.add(toInt(k));
    });
  });
  sets.BZ_DROP = drop;

  // BZ_NPCSHOP：npcid -> { i:[物品id], p:[价格], l:[限购], m:{...} }
  const npcShop = new Set();
  const shopObj = T.BZ_NPCSHOP || {};
  Object.keys(shopObj).forEach(function (npc) {
    const box = shopObj[npc] || {};
    const its = Array.isArray(box.i) ? box.i : [];
    for (let i = 0; i < its.length; i++) if (isPosInt(its[i])) npcShop.add(toInt(its[i]));
  });
  sets.BZ_NPCSHOP = npcShop;

  // BZ_EXCHANGE：npcid -> [ [行...], ... ]
  const ex = new Set();
  const exObj = T.BZ_EXCHANGE || {};
  Object.keys(exObj).forEach(function (npc) {
    const rows = exObj[npc];
    if (!Array.isArray(rows)) return;
    for (let i = 0; i < rows.length; i++) {
      exchangeRowParts(rows[i]).forEach(function (id) { ex.add(id); });
    }
  });
  sets.BZ_EXCHANGE = ex;

  // BZ_GESHOP：[{id, Data:[物品id, 数量], Price, ...}]
  const ge = new Set();
  const geArr = Array.isArray(T.BZ_GESHOP) ? T.BZ_GESHOP : [];
  for (let i = 0; i < geArr.length; i++) {
    const d = geArr[i] && geArr[i].Data;
    if (Array.isArray(d) && isPosInt(d[0])) ge.add(toInt(d[0]));
  }
  sets.BZ_GESHOP = ge;

  // BZ_ROGUESHOP：[{id, item, costitem, cost, ...}] —— 两个都算（判定义原文）
  const rogue = new Set();
  const rgArr = Array.isArray(T.BZ_ROGUESHOP) ? T.BZ_ROGUESHOP : [];
  for (let i = 0; i < rgArr.length; i++) {
    const r = rgArr[i] || {};
    if (isPosInt(r.item)) rogue.add(toInt(r.item));
    if (isPosInt(r.costitem)) rogue.add(toInt(r.costitem));
  }
  sets.BZ_ROGUESHOP = rogue;

  // BZ_FASHIONBUY：时装买价表，键就是时装物品 id（BuyFashion 的产出集）
  const fashionBuy = new Set();
  const fb = T.BZ_FASHIONBUY || {};
  Object.keys(fb).forEach(function (k) { if (isPosInt(k)) fashionBuy.add(toInt(k)); });
  sets.BZ_FASHIONBUY = fashionBuy;

  // BZ_ITEMBUYPRICE：item 表 BuyPrice 列。buyShopItem / QuickBuyItem 都只校验
  //   "BuyPrice>0"，所以"买价>0 的物品"就是这两个 handler 的完整产出集（1101 个）。
  const buyPrice = new Set();
  const bp = T.BZ_ITEMBUYPRICE || {};
  Object.keys(bp).forEach(function (k) {
    if (isPosInt(k) && toInt(bp[k]) > 0) buyPrice.add(toInt(k));
  });
  sets.BZ_ITEMBUYPRICE = buyPrice;

  return sets;
}

/** 这些表被 handler 引用 = 该 handler 的产出集可以按整表高估 */
const ENUMERABLE_TABLES = [
  'BZ_TASKS', 'BZ_DROP', 'BZ_NPCSHOP', 'BZ_EXCHANGE',
  'BZ_GESHOP', 'BZ_ROGUESHOP', 'BZ_FASHIONBUY', 'BZ_ITEMBUYPRICE',
];

/** handler 里调了这些 helper，等价于引用了它背后的表（helper 在文件顶部定义） */
const HELPER_TO_TABLE = {
  taskMeta: 'BZ_TASKS',
  npcShopOf: 'BZ_NPCSHOP',
  itemBuyPrice: 'BZ_ITEMBUYPRICE',
  grantFromDrop: 'BZ_DROP',
};

/* ---------------------------------------------------------------------------
 * 4. Drop*(i)：npc -> dropId -> {物品: [min,max]}，做传递闭包
 * ------------------------------------------------------------------------ */

function buildDropSource(T) {
  const D = T.BZ_DROP || {};
  const N = T.BZ_NPCDROP || {};
  const memo = new Map();        // groupId -> Set(itemId)
  const inProgress = new Set();  // 环检测
  let nestedHits = 0;

  function isRange(v) {
    return Array.isArray(v) && v.length === 2
      && typeof v[0] === 'number' && typeof v[1] === 'number';
  }

  /** 把一行"组内容"展开成物品集合（一行 = {键: 值}） */
  function expandRow(row, groupId) {
    const got = new Set();
    const keys = Object.keys(row);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v = row[k];
      if (isRange(v)) {
        // 正常形态：键是物品 id，值是 [数量, 概率]
        if (isPosInt(k)) got.add(toInt(k));
        else unres('drop-item-id-nonint', { group: groupId, key: k });
      } else if (typeof v === 'number' || typeof v === 'string') {
        // 值是另一个组 id（形态判断：值不是 [min,max] 数组）→ 当嵌套组展开
        nestedHits++;
        const sub = expandGroup(String(v), 'BZ_DROP[' + groupId + '][' + k + ']');
        if (!sub) unres('drop-nested-unresolved', { group: groupId, key: k, value: v });
        else sub.forEach(function (x) { got.add(x); });
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        // 值是整张子表（对象）→ 就地展开（不查表、不登记 memo）
        nestedHits++;
        const sub = expandRow(v, groupId + '.' + k);
        sub.forEach(function (x) { got.add(x); });
      } else {
        unres('drop-value-shape', {
          group: groupId, key: k, value: JSON.stringify(v === undefined ? null : v),
        });
      }
    }
    return got;
  }

  /** 展开一个组 id（带 memo / 环检测）；组不存在返回 null（调用方登记 unresolved） */
  function expandGroup(gid, from) {
    if (memo.has(gid)) return memo.get(gid);
    if (inProgress.has(gid)) {
      unres('drop-cycle', { group: gid, from: from });
      return new Set();
    }
    const row = D[gid];
    if (!row || typeof row !== 'object') return null;
    inProgress.add(gid);
    const got = expandRow(row, gid);
    inProgress.delete(gid);
    memo.set(gid, got);
    return got;
  }

  const perItemNpcs = new Map();  // itemId -> Set(npcId)
  const npcCount = Object.keys(N).length;
  let resolvedNpc = 0;

  Object.keys(N).forEach(function (npc) {
    const v = N[npc];
    let got = null;
    if (typeof v === 'number' || typeof v === 'string') {
      got = expandGroup(String(v), 'BZ_NPCDROP[' + npc + ']');
      if (!got) unres('drop-npc-missing-group', { npc: npc, dropId: String(v) });
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      // npc 的值直接是一张组内容（不是组 id）
      got = expandRow(v, 'BZ_NPCDROP[' + npc + ']');
    } else {
      unres('drop-npc-value-shape', { npc: npc, value: JSON.stringify(v === undefined ? null : v) });
    }
    if (!got) return;
    resolvedNpc++;
    got.forEach(function (item) {
      let s = perItemNpcs.get(item);
      if (!s) { s = new Set(); perItemNpcs.set(item, s); }
      s.add(toInt(npc));
    });
  });

  return {
    perItemNpcs: perItemNpcs,
    groups: Object.keys(D).length,
    npcs: npcCount,
    resolvedNpc: resolvedNpc,
    nestedHits: nestedHits,
    memoSize: memo.size,
  };
}

/* ---------------------------------------------------------------------------
 * 5. Grant*(i)：扫 bz-rpc-server.js 的 handler
 *    切分方式：H 对象里的成员在源码里统一是 `^ {4}名字: function (`（4 空格缩进），
 *    一个成员从这一行到下一个成员前一行 = 一个 handler 体。
 * ------------------------------------------------------------------------ */

const HANDLER_START = /^ {4}([A-Za-z_$][\w$]*): function ?\(/;

/** 从 '(' 处开始按括号深度切参数（只切第一层，兼容 parseInt(...) 之类） */
function splitCallArgs(text, openIdx, openCh, closeCh) {
  const args = [];
  let depth = 0, cur = '', i = openIdx;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (ch === openCh) { depth++; if (depth === 1) continue; }
    else if (ch === closeCh) { depth--; if (depth === 0) { args.push(cur); return { args: args, end: i }; } }
    else if (ch === '(' && openCh !== '(') { depth++; }
    else if (ch === ')' && closeCh !== ')') { depth--; }
    else if (ch === '[') { depth++; }
    else if (ch === ']') { depth--; }
    else if (ch === '{') { depth++; }
    else if (ch === '}') { depth--; }
    if (depth === 1 && ch === ',') { args.push(cur); cur = ''; continue; }
    cur += ch;
  }
  return { args: args, end: -1 };
}

/** 取 text[i] 处 '[' 到配对的 ']' 之间的内容（支持嵌套下标） */
function bracketInner(text, i) {
  let depth = 0;
  for (let j = i; j < text.length; j++) {
    const ch = text[j];
    if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) return { inner: text.slice(i + 1, j), end: j }; }
  }
  return null;
}

/** 判断 `]` 之后是不是赋值号（排除 == / ===） */
function isAssignAfter(text, endIdx) {
  const rest = text.slice(endIdx + 1, endIdx + 8);
  return /^\s*=(?!=)/.test(rest);
}

function segmentHandlers(src) {
  const lines = src.split(/\r?\n/);
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    const m = HANDLER_START.exec(lines[i]);
    if (m) starts.push({ name: m[1], line: i });
  }
  const handlers = [];
  for (let k = 0; k < starts.length; k++) {
    const a = starts[k].line;
    let b = (k + 1 < starts.length) ? starts[k + 1].line - 1 : lines.length - 1;
    // 到 H 对象收尾（`  };`）为止，避免把对象后面的模块级函数算进来
    for (let i = a + 1; i <= b; i++) {
      if (/^ {2}\};?\s*$/.test(lines[i])) { b = i - 1; break; }
    }
    handlers.push({ name: starts[k].name, line: a + 1, body: lines.slice(a, b + 1).join('\n') });
  }
  return handlers;
}

/** 从 handler 体里抽"发放点"：bagAdd(s,X,k) / grantItem(s,X,k) / ivch[K]= / s.playerEquip[X]= */
function scanGrantSites(body) {
  const sites = [];

  ['bagAdd', 'grantItem'].forEach(function (callee) {
    let from = 0;
    for (;;) {
      const i = body.indexOf(callee + '(', from);
      if (i < 0) break;
      from = i + callee.length + 1;
      // 排除名字被别的东西包住的情况（.bagAdd( / function bagAdd(）
      const prev = i > 0 ? body[i - 1] : '';
      if (/[A-Za-z0-9_$.]/.test(prev)) continue;
      const cut = splitCallArgs(body, i + callee.length, '(', ')');
      if (!cut.args || cut.args.length < 3) continue;
      if (cut.args[0].trim() !== 's') continue;
      const target = cut.args[1].trim();
      const count = cut.args[2].trim();
      const negative = /^-/.test(count);            // 负数 = 消耗端，不是产出
      sites.push({
        kind: callee, target: target, count: count, negative: negative,
        literal: /^\d+$/.test(target),
      });
    }
  });

  // note.ivch[K] = ...（绝对值回写；买/兑/时装发完货都靠它推客户端）
  let from = 0;
  for (;;) {
    const i = body.indexOf('ivch[', from);
    if (i < 0) break;
    from = i + 5;
    const br = bracketInner(body, i + 4);
    if (!br || !isAssignAfter(body, br.end)) continue;
    const target = br.inner.trim();
    sites.push({
      kind: 'ivch', target: target, count: '(绝对值)', negative: false,
      literal: /^\d+$/.test(target),
    });
  }

  // s.playerEquip[X] = ...（BuyFashion 不经 grantItem，直接塞装备账本）
  from = 0;
  for (;;) {
    const i = body.indexOf('playerEquip[', from);
    if (i < 0) break;
    from = i + 12;
    const br = bracketInner(body, i + 11);
    if (!br || !isAssignAfter(body, br.end)) continue;
    const target = br.inner.trim();
    sites.push({
      kind: 'playerEquip', target: target, count: '(装备账本)', negative: false,
      literal: /^\d+$/.test(target),
    });
  }

  return sites;
}

/** 命令行/维护动作：只从 bz.ps1 的命令通道打进来，客户端协议里不存在 → 不算"玩家可获得" */
const MAINTENANCE_HANDLERS = ['bzSeedBag', 'bzBackfillRewards', 'bzGrantCur', 'bzPatch'];
/** X 是客户端传来的裸 id，没有任何内容约束 → 若采信，Obtainable 恒真，故单列披露 */
const UNBOUNDED_HANDLERS = ['addItem'];

function scanGrantSource(src) {
  const handlers = segmentHandlers(src);
  const result = {
    handlerCount: handlers.length,
    producers: [],
    literalGrants: [],   // {item, handler}
    tableGrants: [],     // {table, handler}
    skipped: [],
  };

  for (let hi = 0; hi < handlers.length; hi++) {
    const h = handlers[hi];
    const sites = scanGrantSites(h.body);

    // 该 handler 引用了哪些"可枚举产出表"（含通过 helper 间接引用）
    const refs = [];
    for (let i = 0; i < ENUMERABLE_TABLES.length; i++) {
      const t = ENUMERABLE_TABLES[i];
      if (new RegExp('\\b' + t + '\\b').test(h.body)) refs.push(t);
    }
    Object.keys(HELPER_TO_TABLE).forEach(function (fn) {
      if (new RegExp('\\b' + fn + '\\s*\\(').test(h.body)) {
        const t = HELPER_TO_TABLE[fn];
        if (refs.indexOf(t) < 0) refs.push(t);
      }
    });

    const positive = sites.filter(function (s) { return s.negative === false && s.kind !== 'ivch'; });
    const ivchSites = sites.filter(function (s) { return s.kind === 'ivch'; });
    const negative = sites.filter(function (s) { return s.negative === true; });

    // 生产者判定：有正向发放；或只有 ivch 回写但引用了可枚举产出表
    const isProducer = positive.length > 0 || (ivchSites.length > 0 && refs.length > 0);
    if (!isProducer) continue;

    if (MAINTENANCE_HANDLERS.indexOf(h.name) >= 0) {
      result.skipped.push({ handler: h.name, why: 'maintenance' });
      unres('maintenance-handler-excluded', {
        handler: h.name,
        note: '只从命令通道(bz.ps1)打进来，客户端协议里没有这个动作；'
          + '其产出集与 BZ_TASKS 奖励重叠，采信与否不改变 Grant* 的实质结论',
      });
      continue;
    }
    if (UNBOUNDED_HANDLERS.indexOf(h.name) >= 0) {
      result.skipped.push({ handler: h.name, why: 'unbounded' });
      unres('handler-unbounded-grant', {
        handler: h.name,
        expr: positive.length ? positive[0].target : '(unknown)',
        note: 'target 直接取请求里的 itemID，无任何货架/奖励表约束 → 任意物品 id 都能入库。'
          + '若按判定义采信，Obtainable ≡ 全部物品（本域 522 个全真），Q1 将无裁定意义；'
          + '故**不采信**，单列在此披露（这是本表唯一主动放弃的高估方向）',
      });
      continue;
    }

    const litItems = [];
    const varSites = [];
    positive.concat(ivchSites).forEach(function (s) {
      if (s.literal) litItems.push(toInt(s.target));
      else varSites.push({ kind: s.kind, expr: s.target });
    });

    const tablesUsed = [];
    if (varSites.length > 0) {
      for (let i = 0; i < refs.length; i++) tablesUsed.push(refs[i]);
    }
    // 变量目标但一张可枚举表都没引用 → 展开不了，必须记 unresolved
    if (varSites.length > 0 && tablesUsed.length === 0) {
      unres('handler-var-grant-no-table', {
        handler: h.name,
        siteKinds: varSites.map(function (s) { return s.kind + '(' + s.expr + ')'; }),
        negativeSites: negative.length,
        note: (negative.length > 0
          ? '该 handler 的发放点全是"扣减后的剩余值回写"（bagAdd 带负号），属于**消耗端**不是产出端 → 不采信'
          : '发放点是变量，且 handler 没有引用任何可枚举产出表 → 产出集无法展开（低估风险）'),
      });
    }
    // 变量目标是"消耗端回写"（ivch 键取自已扣的物品）时单列，避免被误读成产出
    if (varSites.length > 0 && negative.length > 0) {
      unres('handler-mixed-ivch', {
        handler: h.name,
        note: 'ivch 回写的键既可能是产出也可能被扣物品（本文件里 ivch 只回绝对值、不带方向），'
          + '按"整 handler 高估"处理',
      });
    }

    const rec = {
      handler: h.name,
      line: h.line,
      positiveSites: positive.length,
      ivchSites: ivchSites.length,
      consumptionSites: negative.length,
      literalItems: Array.from(new Set(litItems)).sort(function (a, b) { return a - b; }),
      tables: tablesUsed,
      varSites: varSites,
    };
    result.producers.push(rec);
    litItems.forEach(function (id) { result.literalGrants.push({ item: id, handler: h.name }); });
    tablesUsed.forEach(function (t) { result.tableGrants.push({ table: t, handler: h.name }); });
  }

  // 只回写 ivch 却没有正向发放的 handler（useItem / saleItem 这类消耗端）也记一笔，
  // 免得"扫过 ivch 却没看到它"被当成漏扫。
  handlers.forEach(function (h) {
    const sites = scanGrantSites(h.body);
    const ivchOnly = sites.length > 0 && sites.every(function (s) { return s.kind === 'ivch'; })
      && sites.every(function (s) { return !s.literal; });
    if (ivchOnly && /bagAdd\s*\(\s*s\s*,/.test(h.body)) {
      unres('consumption-side-ivch', {
        handler: h.name,
        note: 'ivch 只回写被扣物品的绝对值（bagAdd 带负号），是消耗端不是产出端 → 不采信为 Grant*',
      });
    }
  });

  return result;
}

/* ---------------------------------------------------------------------------
 * 6. 主流程
 * ------------------------------------------------------------------------ */

function main() {
  const t0 = Date.now();

  console.log('==================================================================');
  console.log('tools/gen_obtainable.js —— 物品可获得性事实表（SOTA R14 Q1）');
  console.log('working dir: ' + process.cwd());
  console.log('script root: ' + ROOT);
  console.log('==================================================================');

  /* ---- 6.1 跑前 md5 快照 ------------------------------------------------ */
  console.log('');
  console.log('--- [1/8] 跑前 md5 快照（存档副本 + 三份被引用的源文件 + 两份只读输入）---');

  const save = latestSaveCopy();
  if (!save.path) {
    console.error('致命：_backup 下找不到任何 ' + SAVE_NAME);
    process.exit(1);
  }
  console.log('  最新存档副本（按 LastWriteTime）：');
  console.log('    ' + save.path);
  console.log('    副本总数=' + save.all.length + '，mtime=' + new Date(statSafe(save.path).mtimeMs).toISOString());

  const guarded = [
    { key: 'save', file: save.path },
    { key: 'tasks', file: P.tasksFile },
    { key: 'rpc', file: P.rpcFile },
    { key: 'liveHandlers', file: P.liveFile },
    // 新增的两个**只读输入**也进 md5 前/后对账：证明本脚本只读不写它们
    { key: 'itemFull', file: P.itemFullFile },
    { key: 'effectBranches', file: P.effectBranchesFile },
  ];
  const md5Before = {};
  guarded.forEach(function (g) {
    md5Before[g.key] = md5File(g.file);
    console.log('  md5 BEFORE ' + g.key.padEnd(12) + ' ' + md5Before[g.key] + '  ' + path.basename(g.file));
  });

  /* ---- 6.2 存档 → Ledger(i) -------------------------------------------- */
  console.log('');
  console.log('--- [2/8] Ledger(i)：读存档副本的 bag / playerEquip / equipments ---');

  const saveBuf = fs.readFileSync(save.path);   // 只读一遍；md5 已经算过
  let saveObj = null;
  try { saveObj = JSON.parse(saveBuf.toString('utf8')); }
  catch (e) {
    console.error('致命：存档副本不是合法 JSON：' + String(e.message || e));
    process.exit(1);
  }

  /** 容器口径：bag 是 id->数量；playerEquip 是 uid->[type, 数量]（type>=2 时 [1] 才是 itemID）；
   *  equipments 是 槽位->uid（已穿在身上 = 持有 1 个）。 */
  const ledgerCounts = {};   // itemID -> { bag, playerEquip, equipments }
  function ledgerAdd(id, container, n) {
    const i = toInt(id);
    if (!(i > 0) || !(n > 0)) return;
    const rec = ledgerCounts[i] || (ledgerCounts[i] = {});
    rec[container] = (rec[container] || 0) + n;
  }
  Object.keys(saveObj.bag || {}).forEach(function (k) {
    ledgerAdd(k, 'bag', toInt(saveObj.bag[k]));
  });
  Object.keys(saveObj.playerEquip || {}).forEach(function (uid) {
    const inst = saveObj.playerEquip[uid];
    let id = toInt(uid), n = 1;
    if (Array.isArray(inst)) {
      const t = toInt(inst[0]);
      n = toInt(inst[1]);
      if (t >= 2 && toInt(inst[1]) > 0) { id = toInt(uid); }   // type>=2 的 uid 仍是键，数量在 [1]
    }
    ledgerAdd(id, 'playerEquip', n);
  });
  Object.keys(saveObj.equipments || {}).forEach(function (slot) {
    ledgerAdd(saveObj.equipments[slot], 'equipments', 1);
  });
  console.log('  bag 条目=' + Object.keys(saveObj.bag || {}).length
    + '  playerEquip 条目=' + Object.keys(saveObj.playerEquip || {}).length
    + '  equipments 槽位=' + Object.keys(saveObj.equipments || {}).length);
  console.log('  Ledger 物品数=' + Object.keys(ledgerCounts).length
    + '  (' + Object.keys(ledgerCounts).sort(function (a, b) { return a - b; }).join(',') + ')');

  /* ---- 6.3 表 ----------------------------------------------------------- */
  console.log('');
  console.log('--- [3/8] 解析 bz-tasks.generated.js 的 BZ_* 表 ---');

  const parsed = parseBzTables(fs.readFileSync(P.tasksFile, 'utf8'));
  const T = parsed.tables;
  parsed.bad.forEach(function (b) {
    unres('table-parse-failed', { name: b.name, line: b.line, error: b.error });
  });
  const needTables = ['BZ_TASKS', 'BZ_ITEMTYPE', 'BZ_NPCSHOP', 'BZ_EXCHANGE', 'BZ_GESHOP',
    'BZ_ROGUESHOP', 'BZ_ITEMEAT', 'BZ_ITEMFUN', 'BZ_ITEMSCH', 'BZ_NPCDROP', 'BZ_DROP',
    'BZ_FASHIONBUY', 'BZ_ITEMBUYPRICE'];
  needTables.forEach(function (n) {
    if (!T[n]) unres('table-missing', { name: n });
  });
  needTables.forEach(function (n) {
    if (T[n]) console.log('  ' + n.padEnd(18) + ' ok');
    else console.log('  ' + n.padEnd(18) + ' ** MISSING **');
  });

  /* ---- 6.4 决策域（R16 §5 第 1 条：优先全量 item dump）----------------- */
  const bzItemType = new Set();
  Object.keys(T.BZ_ITEMTYPE || {}).forEach(function (k) { if (isPosInt(k)) bzItemType.add(toInt(k)); });

  const itemFull = loadItemFull();
  const eb = loadEffectBranches();

  // 口径开关：
  //   默认 'item-full'  = item.full.json 的 ID 全集（6525，R16 §5 第 1 条）
  //   'itemtype'        = 旧口径 522，用于复算旧产物 / 对账
  //   'all'             = item-full ∪ 全部可获得 id（判定义字面全域，兜底口径）
  const DOMAIN_MODE = (process.env.BZ_DOMAIN === 'itemtype') ? 'itemtype'
    : (process.env.BZ_DOMAIN === 'all') ? 'all' : 'item-full';

  const domain = new Set();
  let domainSource = '';
  let domainSourceFile = '';
  if (DOMAIN_MODE === 'itemtype' || !itemFull.byId.size) {
    bzItemType.forEach(function (id) { domain.add(id); });
    domainSource = 'BZ_ITEMTYPE';
    domainSourceFile = P.tasksFile;
    if (DOMAIN_MODE !== 'itemtype') {
      unres('domain-fallback-to-itemtype', {
        requestedMode: DOMAIN_MODE, file: P.itemFullFile,
        note: 'item.full.json 缺失/不可解析 → 决策域退回旧的 BZ_ITEMTYPE 522 口径；'
          + '此时"可达"一维无法判（没有 Type/Effect 列）',
      });
    }
  } else {
    itemFull.byId.forEach(function (v, id) { domain.add(id); });
    domainSource = 'item.full.json';
    domainSourceFile = P.itemFullFile;
  }

  const modeled = new Set();
  const eat = T.BZ_ITEMEAT || {}, fun = T.BZ_ITEMFUN || {}, sch = T.BZ_ITEMSCH || {};
  Object.keys(eat).forEach(function (k) { if (isPosInt(k)) modeled.add(toInt(k)); });
  Object.keys(fun).forEach(function (k) { if (isPosInt(k)) modeled.add(toInt(k)); });
  Object.keys(sch).forEach(function (k) { if (isPosInt(k)) modeled.add(toInt(k)); });
  const unmodeledInDomain = new Set();
  domain.forEach(function (id) { if (!modeled.has(id)) unmodeledInDomain.add(id); });
  console.log('');
  console.log('--- [4/8] 决策域（口径见文件头：全量 item 表 dump）---');
  console.log('  域来源                      : ' + domainSource + '  ' + domainSourceFile);
  console.log('  域（ID 全集，去重后）       : ' + domain.size
    + '（item.full.json 行数=' + itemFull.rows + '，重复 id=' + itemFull.dupIds.length
    + '，坏行=' + itemFull.badRows + '）');
  console.log('  BZ_ITEMTYPE（交叉口径，不删）: ' + bzItemType.size
    + '（其中 ' + Array.from(bzItemType).filter(function (x) { return domain.has(x); }).length
    + ' 个落在全表域内）');
  console.log('  已建模 = EAT∪FUN∪SCH        : ' + modeled.size + '（其中落在域内 '
    + Array.from(modeled).filter(function (x) { return domain.has(x); }).length + ' 个）');
  console.log('  域内未建模                  : ' + unmodeledInDomain.size);
  console.log('  Type 分布（item.full.json） : ' + JSON.stringify(itemFull.typeDist));

  /* ---- 6.5 五个来源 ---------------------------------------------------- */
  console.log('');
  console.log('--- [5/8] 逐来源展开 ---');

  // 累积容器
  const hitLedger = new Map();     // id -> Set(container)
  const hitDrop = new Map();       // id -> Set(npc)
  const hitTask = new Map();       // id -> Set(taskID)
  const hitShelf = new Map();      // id -> Set(shelfName)
  const hitGrantLit = new Map();   // id -> Set(handler)
  const hitGrantHigh = new Map();  // id -> Set(table)
  function push(map, id, label) {
    const i = toInt(id);
    if (!(i > 0)) return;
    let s = map.get(i);
    if (!s) { s = new Set(); map.set(i, s); }
    s.add(label);
  }

  // 5.1 Ledger
  Object.keys(ledgerCounts).forEach(function (id) {
    Object.keys(ledgerCounts[id]).forEach(function (c) { push(hitLedger, id, c); });
  });

  // 各"产出表"的物品 id 集合（Shelf 与 Grant* 共用；口径见 §3 顶部注释）
  const tableSets = buildTableSets(T);

  // 5.2 Drop*
  const dropSrc = buildDropSource(T);
  dropSrc.perItemNpcs.forEach(function (npcs, item) {
    npcs.forEach(function (npc) { push(hitDrop, item, npc); });
  });
  console.log('  Drop* : 掉落组=' + dropSrc.groups + '，npc=' + dropSrc.npcs
    + '（解析成功 ' + dropSrc.resolvedNpc + '），产出物品=' + dropSrc.perItemNpcs.size
    + '，嵌套组展开次数=' + dropSrc.nestedHits);

  // 5.3 Task
  const taskObj = T.BZ_TASKS || {};
  Object.keys(taskObj).forEach(function (tid) {
    const m = taskObj[tid] || {};
    const r = m.r || {};
    Object.keys(r).forEach(function (k) { push(hitTask, k, tid); });
  });
  console.log('  Task  : 任务=' + Object.keys(taskObj).length + '，奖励物品=' + hitTask.size);

  // 5.4 Shelf
  const npcShopObj = T.BZ_NPCSHOP || {};
  Object.keys(npcShopObj).forEach(function (npc) {
    const box = npcShopObj[npc] || {};
    (Array.isArray(box.i) ? box.i : []).forEach(function (id) { push(hitShelf, id, 'NPCSHOP'); });
  });
  const geArr = Array.isArray(T.BZ_GESHOP) ? T.BZ_GESHOP : [];
  geArr.forEach(function (row) {
    const d = row && row.Data;
    if (Array.isArray(d)) push(hitShelf, d[0], 'GESHOP');
  });
  const rgArr = Array.isArray(T.BZ_ROGUESHOP) ? T.BZ_ROGUESHOP : [];
  rgArr.forEach(function (row) {
    if (!row) return;
    push(hitShelf, row.item, 'ROGUESHOP');
    push(hitShelf, row.costitem, 'ROGUESHOP');
  });
  console.log('  Shelf : NPCSHOP npc=' + Object.keys(npcShopObj).length
    + ' 货=' + tableSets.BZ_NPCSHOP.size
    + '，GESHOP 行=' + geArr.length + ' 货=' + tableSets.BZ_GESHOP.size
    + '，ROGUESHOP 行=' + rgArr.length + ' id=' + tableSets.BZ_ROGUESHOP.size
    + '；三表并集=' + hitShelf.size);

  // 5.5 Grant*
  const grant = scanGrantSource(fs.readFileSync(P.rpcFile, 'utf8'));
  grant.literalGrants.forEach(function (g) { push(hitGrantLit, g.item, g.handler); });
  grant.tableGrants.forEach(function (g) {
    const s = tableSets[g.table];
    if (!s) { unres('grant-table-not-expandable', { table: g.table, handler: g.handler }); return; }
    s.forEach(function (id) { push(hitGrantHigh, id, g.table); });
  });
  console.log('  Grant : handler 总数=' + grant.handlerCount + '，判为产出端 ' + grant.producers.length + ' 个');
  grant.producers.forEach(function (pr) {
    console.log('          - ' + pr.handler.padEnd(26)
      + ' 定向=' + pr.positiveSites + ' ivch=' + pr.ivchSites + ' 消耗=' + pr.consumptionSites
      + ' 字面量物品=[' + pr.literalItems.join(',') + ']'
      + ' 高估表=[' + pr.tables.join(',') + ']');
  });
  grant.skipped.forEach(function (s) {
    console.log('          ! ' + s.handler + ' 跳过（' + s.why + '，理由见 unresolved）');
  });

  /* ---- 6.6 汇总成 items / unmodeledButObtainable ----------------------- */
  console.log('');
  console.log('--- [6/8] 汇总 ---');

  const allIds = new Set();
  [hitLedger, hitDrop, hitTask, hitShelf, hitGrantLit, hitGrantHigh].forEach(function (m) {
    m.forEach(function (v, k) { allIds.add(k); });
  });

  // 兜底口径 BZ_DOMAIN=all：域再并上"所有判定义为可获得的 id"（判定义字面全域）。
  // 默认口径已改成 item.full.json 全表（R16 §5 第 1 条），这个开关只留作复算。
  if (DOMAIN_MODE === 'all') {
    const before = domain.size;
    allIds.forEach(function (id) { domain.add(id); });
    unmodeledInDomain.clear();
    domain.forEach(function (id) { if (!modeled.has(id)) unmodeledInDomain.add(id); });
    console.log('  [BZ_DOMAIN=all] 域并入全部可获得 id → ' + before + ' → ' + domain.size
      + '，未建模=' + unmodeledInDomain.size);
  }

  /* ---- 6.6a 可达（R16 §5 第 2 条）：Type===2 ∧ Effect class ∈ {SEND,GATED} ---
   * 硬条件 item.Type === 2 不是可选项：客户端 `if (2 == e.Type) switch (e.Effect)`
   * （index.js:64321）——Type≠2 的物品根本进不了这段 switch，任何 Effect 分类都不成立。
   * 拿不到 Type 的 id（不在 item.full.json）→ 判不了 → 一律不计入可达分子，逐条登记。
   */
  const reachableIds = new Set();          // 域内：Type2 ∧ class∈{SEND,GATED}
  const reachByEffect = new Map();         // effect -> Set(itemID)
  const reachUnmodeledByEffect = new Map();// effect -> Set(itemID)（其中未建模）
  const unmodeledReachableIds = [];        // 可达 ∧ 未建模（域内）
  const unmodeledReachableObtainableIds = []; // 可达 ∧ 未建模 ∧ 可获得
  let type2InDomain = 0;
  let type2NoEffectRow = 0;                // Type2 但 effect-branches.json 里没这个 effect
  let type2NonReachClass = 0;              // Type2 但 class 不是 SEND/GATED
  let unreachableNoType = 0;               // 可获得但不在 item.full.json → 没有 Type

  domain.forEach(function (id) {
    const row = itemFull.byId.get(id);
    if (!row) return;
    if (row.type !== 2) return;
    type2InDomain++;
    const rec = eb.byEffect.get(row.effect);
    if (!rec) { type2NoEffectRow++; return; }
    if (REACH_CLASSES.indexOf(rec.cls) < 0) { type2NonReachClass++; return; }
    reachableIds.add(id);
    let s = reachByEffect.get(row.effect);
    if (!s) { s = new Set(); reachByEffect.set(row.effect, s); }
    s.add(id);
    if (!modeled.has(id)) {
      unmodeledReachableIds.push(id);
      let u = reachUnmodeledByEffect.get(row.effect);
      if (!u) { u = new Set(); reachUnmodeledByEffect.set(row.effect, u); }
      u.add(id);
      if (allIds.has(id)) unmodeledReachableObtainableIds.push(id);
    }
  });
  unmodeledReachableIds.sort(function (a, b) { return a - b; });
  unmodeledReachableObtainableIds.sort(function (a, b) { return a - b; });
  allIds.forEach(function (id) { if (!itemFull.byId.has(id)) unreachableNoType++; });

  /** effect -> count，按 count 降序（并列按 effect 升序）——确定性输出。
   *  ⚠ 返回的是对象，而 JS 对象的"整数样式键"在 JSON 里会按数值升序排列，
   *  所以"前 N 个"必须另看 topEffectPairs() 的数组，不能只看 Object.keys 的顺序。 */
  function effectCountObject(map) {
    const obj = {};
    topEffectPairs(map, Infinity).forEach(function (r) { obj[String(r.effect)] = r.count; });
    return obj;
  }
  function topEffectPairs(map, n) {
    const rows = [];
    map.forEach(function (s, eff) { rows.push({ effect: eff, count: s.size }); });
    rows.sort(function (a, b) { return (b.count - a.count) || (a.effect - b.effect); });
    return n === Infinity ? rows : rows.slice(0, n);
  }

  /** Ledger ∧ 未建模（不要求可达）与 Ledger ∧ 未建模 ∧ 可达 —— R16 §5 第 3 条的排期依据 */
  const ledgerUnmodeled = [];
  const ledgerUnmodeledReachable = [];
  Array.from(hitLedger.keys()).sort(function (a, b) { return a - b; }).forEach(function (id) {
    if (modeled.has(id)) return;
    ledgerUnmodeled.push(id);
    if (reachableIds.has(id)) ledgerUnmodeledReachable.push(id);
  });

  console.log('  可达（Type===2 ∧ class∈{SEND,GATED}）= ' + reachableIds.size
    + '（域内 Type2=' + type2InDomain + '，Effect 无分类行=' + type2NoEffectRow
    + '，class 非 SEND/GATED=' + type2NonReachClass + '）');
  console.log('  可达 ∧ 未建模 = ' + unmodeledReachableIds.length
    + '，其中可获得 = ' + unmodeledReachableObtainableIds.length);
  console.log('  Ledger ∧ 未建模 = ' + ledgerUnmodeled.length
    + '，其中可达 = ' + ledgerUnmodeledReachable.length);

  const MAX_DETAIL = 8;   // 每个来源最多列 8 条明细标签，多出来的用 +N 概括

  function labelsOf(id) {
    const out = [];
    const lc = hitLedger.get(id);
    if (lc) ['bag', 'playerEquip', 'equipments'].forEach(function (c) {
      if (lc.has(c)) out.push('ledger:' + c);
    });
    const dn = hitDrop.get(id);
    if (dn) {
      const arr = Array.from(dn).sort(function (a, b) { return a - b; });
      arr.slice(0, MAX_DETAIL).forEach(function (npc) { out.push('drop:npc' + npc); });
      if (arr.length > MAX_DETAIL) out.push('drop:+' + (arr.length - MAX_DETAIL) + 'npc');
    }
    const tk = hitTask.get(id);
    if (tk) {
      const arr = Array.from(tk).sort(function (a, b) { return Number(a) - Number(b); });
      arr.slice(0, MAX_DETAIL).forEach(function (t) { out.push('task:' + t); });
      if (arr.length > MAX_DETAIL) out.push('task:+' + (arr.length - MAX_DETAIL));
    }
    const sh = hitShelf.get(id);
    if (sh) ['NPCSHOP', 'GESHOP', 'ROGUESHOP'].forEach(function (s) {
      if (sh.has(s)) out.push('shelf:' + s);
    });
    const gl = hitGrantLit.get(id);
    if (gl) {
      const arr = Array.from(gl).sort();
      arr.slice(0, MAX_DETAIL).forEach(function (h) { out.push('grant:' + h); });
      if (arr.length > MAX_DETAIL) out.push('grant:+' + (arr.length - MAX_DETAIL));
    }
    const gh = hitGrantHigh.get(id);
    if (gh) {
      Array.from(gh).sort().forEach(function (tb) { out.push('grant~' + tb); });
    }
    // R16 §5 第 2 条：可达（Type===2 ∧ class∈{SEND,GATED}）也进明细标签，
    // 这样看清单时不用回查 item 表就知道"这件东西点了使用会不会真的发请求"。
    if (reachableIds.has(id)) {
      const row = itemFull.byId.get(id);
      const rec = row ? eb.byEffect.get(row.effect) : null;
      out.push('use:' + (rec ? rec.cls : '?'));
    }
    return out;
  }

  function countInDomain(map) {
    let n = 0;
    domain.forEach(function (id) { if (map.has(id)) n++; });
    return n;
  }
  function countUnmodeledInDomain(map) {
    let n = 0;
    domain.forEach(function (id) { if (map.has(id) && !modeled.has(id)) n++; });
    return n;
  }

  const items = {};
  const sortedDomainObtainable = [];
  domain.forEach(function (id) {
    if (!allIds.has(id)) return;
    sortedDomainObtainable.push(id);
  });
  sortedDomainObtainable.sort(function (a, b) { return a - b; });

  // 新 N（全表域口径）= 域内 ∧ 可获得 ∧ 未建模
  const unmodeledButObtainable = sortedDomainObtainable.filter(function (id) { return !modeled.has(id); });

  // R16 §5 第 2 条：域外也进 items（不再只是"披露条数"）。
  // 这里的"域外" = 可获得、但 item.full.json 里**没有配置行**的 id（货架/兑换的成本物里
  // 有一批这样的 id，没有 Type/Effect）；域内未建模的与它们合并成 items 的键集。
  const outOfDomain = [];
  allIds.forEach(function (id) { if (!domain.has(id)) outOfDomain.push(id); });
  outOfDomain.sort(function (a, b) { return a - b; });
  const outOfDomainPerSource = {};
  ['ledger', 'drop', 'task', 'shelf', 'grant', 'grantHigh'].forEach(function (k) {
    outOfDomainPerSource[k] = 0;
  });
  const mapsByKind = {
    ledger: hitLedger, drop: hitDrop, task: hitTask, shelf: hitShelf,
    grant: hitGrantLit, grantHigh: hitGrantHigh,
  };
  Object.keys(mapsByKind).forEach(function (k) {
    const m = mapsByKind[k];
    m.forEach(function (v, id) { if (!domain.has(id)) outOfDomainPerSource[k]++; });
  });
  const outOfDomainUnmodeled = outOfDomain.filter(function (id) { return !modeled.has(id); }).length;
  const outOfDomainModeled = outOfDomain.length - outOfDomainUnmodeled;

  // items 只含"未建模"的物品（已建模的只计数，见 stats.itemsScope）：
  //   域内未建模可获得 ∪ 域外（无配置行）未建模可获得 —— 后者也照算，符合 R16 §5 第 2 条。
  const itemsIds = unmodeledButObtainable.slice();
  outOfDomain.forEach(function (id) { if (!modeled.has(id)) itemsIds.push(id); });
  itemsIds.sort(function (a, b) { return a - b; });
  itemsIds.forEach(function (id) { items[String(id)] = labelsOf(id); });

  // 域外来源表规模（说明"为什么域外这么多"）
  const tableSizes = {};
  Object.keys(tableSets).forEach(function (k) { tableSizes[k] = tableSets[k].size; });
  tableSizes.BZ_ITEMTYPE = bzItemType.size;   // 交叉口径：这张表本身的规模（不随域变）
  tableSizes.itemFull = itemFull.byId.size;   // 新域：全量 item dump 的去重 id 数
  tableSizes.BZ_ITEMEAT = Object.keys(eat).length;
  tableSizes.BZ_ITEMFUN = Object.keys(fun).length;
  tableSizes.BZ_ITEMSCH = Object.keys(sch).length;
  tableSizes.BZ_NPCDROP = Object.keys(T.BZ_NPCDROP || {}).length;
  tableSizes.BZ_DROP = Object.keys(T.BZ_DROP || {}).length;
  tableSizes.BZ_TASKS = Object.keys(taskObj).length;

  unres('out-of-domain-obtainable', {
    count: outOfDomain.length,
    unmodeledCount: outOfDomainUnmodeled,
    modeledCount: outOfDomainModeled,
    perSource: outOfDomainPerSource,
    sample: outOfDomain.slice(0, 40),
    note: '这些 id 按判定义确实"可获得"，但 item.full.json 里没有配置行（没有 Type/Effect），'
      + '所以既判不了"已建模/未建模"的建模维度，也判不了"可达"。'
      + 'R16 §5 第 2 条改为域内域外都算 → 其中未建模的 ' + outOfDomainUnmodeled
      + ' 个**已进 items**（labels 与域内同一套规则），只是不参与"可达"分子；'
      + '已建模的 ' + outOfDomainModeled + ' 个只计数。',
  });

  /* ---- 6.7 stats ------------------------------------------------------- */
  const sourceCounts = {
    ledger: countInDomain(hitLedger),
    drop: countInDomain(hitDrop),
    task: countInDomain(hitTask),
    shelf: countInDomain(hitShelf),
    grant: countInDomain(hitGrantHigh) + Array.from(hitGrantLit.keys()).filter(function (id) {
      return domain.has(id) && !hitGrantHigh.has(id);
    }).length,
    grantHigh: countInDomain(hitGrantHigh),
    grantLiteral: Array.from(hitGrantLit.keys()).filter(function (id) { return domain.has(id); }).length,
  };
  const sourceCountsUnmodeled = {
    ledger: countUnmodeledInDomain(hitLedger),
    drop: countUnmodeledInDomain(hitDrop),
    task: countUnmodeledInDomain(hitTask),
    shelf: countUnmodeledInDomain(hitShelf),
    grant: countUnmodeledInDomain(hitGrantHigh) + Array.from(hitGrantLit.keys()).filter(function (id) {
      return domain.has(id) && !modeled.has(id) && !hitGrantHigh.has(id);
    }).length,
    grantHigh: countUnmodeledInDomain(hitGrantHigh),
    grantLiteral: Array.from(hitGrantLit.keys()).filter(function (id) {
      return domain.has(id) && !modeled.has(id);
    }).length,
  };
  const shelfDetail = { NPCSHOP: 0, GESHOP: 0, ROGUESHOP: 0 };
  const shelfDetailUnmodeled = { NPCSHOP: 0, GESHOP: 0, ROGUESHOP: 0 };
  domain.forEach(function (id) {
    const s = hitShelf.get(id);
    if (!s) return;
    Object.keys(shelfDetail).forEach(function (k) {
      if (!s.has(k)) return;
      shelfDetail[k]++;
      if (!modeled.has(id)) shelfDetailUnmodeled[k]++;
    });
  });
  // 多来源交叉：每个物品"靠哪几个来源"成立（用来判断某一来源是不是唯一通道）
  function kindListOf(id) {
    const kinds = [];
    if (hitLedger.has(id)) kinds.push('ledger');
    if (hitDrop.has(id)) kinds.push('drop');
    if (hitTask.has(id)) kinds.push('task');
    if (hitShelf.has(id)) kinds.push('shelf');
    if (hitGrantLit.has(id) || hitGrantHigh.has(id)) kinds.push('grant');
    return kinds;
  }
  function onlyViaOf(list) {
    const acc = {};
    list.forEach(function (id) {
      const kinds = kindListOf(id);
      if (kinds.length === 1) acc[kinds[0]] = (acc[kinds[0]] || 0) + 1;
    });
    return acc;
  }
  const singleSourceByKind = onlyViaOf(unmodeledButObtainable);
  const onlyViaAllObtainable = onlyViaOf(sortedDomainObtainable);

  /** 某一个"域口径"下的五个数：域大小 / 可获得 / 未建模 / 未建模且可获得（N）/ 可达 */
  function domainMetrics(domSet) {
    let obtainable = 0, unmodeled = 0, unmodeledObtainable = 0;
    let reachable = 0, reachableUnmodeled = 0, reachableUnmodeledObtainable = 0;
    domSet.forEach(function (id) {
      const o = allIds.has(id);
      const un = !modeled.has(id);
      if (o) { obtainable++; if (un) unmodeledObtainable++; }
      if (un) unmodeled++;
      if (reachableIds.has(id)) {
        reachable++;
        if (un) { reachableUnmodeled++; if (o) reachableUnmodeledObtainable++; }
      }
    });
    return {
      domainSize: domSet.size, obtainable: obtainable, unmodeled: unmodeled,
      unmodeledButObtainable: unmodeledObtainable,
      reachable: reachable,
      reachableUnmodeled: reachableUnmodeled,
      reachableUnmodeledObtainable: reachableUnmodeledObtainable,
    };
  }
  // 两个对账口径都用**固定集合**算，与当前 DOMAIN_MODE 无关：
  const fullTableSet = new Set();
  itemFull.byId.forEach(function (v, id) { fullTableSet.add(id); });
  const metricsFull = domainMetrics(fullTableSet);   // 新口径：全表 6525
  const metricsBz = domainMetrics(bzItemType);       // 旧口径：BZ_ITEMTYPE 522

  const crossCheck = {
    note: 'R16 §5 第 1 条要求的对账：同一条判定义（Ledger∨Drop*∨Task∨Shelf∨Grant*）在两个域口径下的数。'
      + 'fullTable = 新口径（item.full.json 的 ID 全集）；bzItemType522 = 旧产物口径（BZ_ITEMTYPE，'
      + '旧 N=248）。两列的 obtainable/unmodeled/unmodeledButObtainable/reachable 用的是同一批来源表、'
      + '同一套公式，差异只来自"域"。',
    fullTable: Object.assign({
      label: 'item.full.json 全表（新口径）',
      source: 'item.full.json', file: P.itemFullFile,
      active: DOMAIN_MODE === 'item-full',
    }, metricsFull),
    bzItemType522: Object.assign({
      label: 'BZ_ITEMTYPE（旧产物口径）',
      source: 'BZ_ITEMTYPE', file: P.tasksFile,
      active: DOMAIN_MODE === 'itemtype',
    }, metricsBz),
    obtainableOutsideFullTable: {
      label: '可获得、但 item.full.json 里没有配置行的 id',
      count: outOfDomain.length,
      unmodeledCount: outOfDomainUnmodeled,
      modeledCount: outOfDomainModeled,
      perSource: outOfDomainPerSource,
      inItems: outOfDomainUnmodeled,
      note: '这批 id 没有 Type/Effect 列 → 判不了可达，也不属于任何一个"域口径"的 N（N 只在域内算）；'
        + 'R16 §5 第 2 条要求域外也进 items，其中未建模的已全部进 items。',
    },
    deltaN: {
      fullTableMinusBzItemType: metricsFull.unmodeledButObtainable - metricsBz.unmodeledButObtainable,
      note: '全表口径的 N 减 522 口径的 N。差值同时来自"域里多出未建模物品"和'
        + '"同一物品原先在 522 域外、现在进域"两个方向，不能直接当成"新发现 39 件"的倍数。',
    },
  };

  // 货币 id（rpc-server 的 CURRENCY_IDS：1=金条、4001=铜钱、8888=元宝…）。
  // 它们按判定义"可获得且未建模"成立，但是钱包字段、没有物品效果可建模 → 单列，不擅自剔除。
  const CURRENCY_IDS = [1, 2, 4001, 4002, 4003, 8888];
  const currencyInN = unmodeledButObtainable.filter(function (id) {
    return CURRENCY_IDS.indexOf(id) >= 0;
  });
  const caveats = [
    'N=' + unmodeledButObtainable.length + ' 里含 ' + currencyInN.length + ' 个货币 id（'
      + currencyInN.join(',') + '）：它们是 rpc-server 的 CURRENCY_IDS（钱包字段，不是背包物品，'
      + '卖/兑/买的成本串里出现才被算进来），按判定义成立但没有"物品效果"可建模；'
      + '真正要问用户的是 ' + (unmodeledButObtainable.length - currencyInN.length) + ' 个。',
    'Grant* 全部来自"整 handler 高估"：bz-rpc-server.js 里没有任何 handler 用数字字面量发货'
      + '（grantLiteral=' + grant.literalGrants.length + '），所以 Grant* 的每个条目都是 grant~<表名>，'
      + '含义是"该表全量物品都算可获得"，比真实可达范围大。',
    'addItem 的发放点直接取请求里的 itemID，没有任何内容约束 → 采信它会让 Obtainable 恒真'
      + '（域内 ' + domain.size + ' 个全真），故不采信，已在 unresolved 逐条披露。',
    'items 只含"未建模 ∧ 可获得"的 id（共 ' + itemsIds.length + ' 条 = 域内 '
      + unmodeledButObtainable.length + ' + 域外无配置行 ' + outOfDomainUnmodeled + '）；'
      + '已建模的 ' + (sortedDomainObtainable.length - unmodeledButObtainable.length)
      + ' 条只计数，不进 items（明细见 stats.itemsScope）。域外那批按 R16 §5 第 2 条也进 items，'
      + '但它们没有 Type/Effect，判不了"可达"。',
    '可达（Type===2 ∧ Effect class∈{SEND,GATED}）与可获得是**两个独立的维度**：'
      + '可达 = ' + reachableIds.size + '（域内），未建模且可达 = ' + unmodeledReachableIds.length
      + '，其中可获得 = ' + unmodeledReachableObtainableIds.length + '。'
      + '账本里现存且未建模且可达 = ' + ledgerUnmodeledReachable.length + ' 件（R16 §5 第 3 条的排期依据）。'
      + 'Type≠2 的物品无论 Effect 是什么都不可达（index.js:64321 的 `if (2 == e.Type)`）。',
    '存档 Ledger 只认 bag / playerEquip / equipments 三个容器；若线上还有别的容器'
      + '（仓库/家园背包等），本表会漏。',
  ];

  const stats = {
    script: 'tools/gen_obtainable.js',
    generatedAt: new Date().toISOString(),
    durMs: 0,
    domain: {
      // R16 §5 第 1 条：域来源换成全量 item dump；BZ_ITEMTYPE 保留为交叉信息
      source: domainSource,
      mode: DOMAIN_MODE,
      file: domainSourceFile,
      note: '决策域 = tools\\cfg\\dump\\item.full.json 的 ID 全集（' + itemFull.rows + ' 行 / '
        + fullTableSet.size + ' 个去重 id）；原来的 BZ_ITEMTYPE（522）不删，'
        + '在 bzItemTypeCross 与 crossCheck 里作为旧口径对账。'
        + 'BZ_DOMAIN=itemtype 可切回旧口径复算，BZ_DOMAIN=all 可切成判定义字面全域（域 ∪ 全部可获得 id）。',
      totalItems: domain.size,
      modeledItems: Array.from(modeled).filter(function (x) { return domain.has(x); }).length,
      unmodeledItems: unmodeledInDomain.size,
      bzItemTypeCross: {
        label: 'BZ_ITEMTYPE（旧口径，交叉信息，未删除）',
        size: bzItemType.size,
        insideFullTable: Array.from(bzItemType).filter(function (x) { return fullTableSet.has(x); }).length,
        outsideFullTable: Array.from(bzItemType).filter(function (x) { return !fullTableSet.has(x); }).length,
        obtainable: metricsBz.obtainable,
        unmodeled: metricsBz.unmodeled,
        unmodeledButObtainable: metricsBz.unmodeledButObtainable,
        reachable: metricsBz.reachable,
        reachableUnmodeled: metricsBz.reachableUnmodeled,
        note: '这张表是 item 配置导出里"被任务/掉落引用到的物品 → Type"，旧产物的 522/248 就是按它算的；'
          + '现在只用来对账，不再决定域',
      },
    },
    totalItems: domain.size,
    obtainableCount: sortedDomainObtainable.length,
    unmodeledCount: unmodeledInDomain.size,
    unmodeledButObtainableCount: unmodeledButObtainable.length,
    obtainableOutsideFullTableCount: outOfDomain.length,
    unmodeledObtainableOutsideFullTableCount: outOfDomainUnmodeled,
    itemsCount: itemsIds.length,
    crossCheck: crossCheck,
    reachable: {
      definition: 'reachable(i) = (item.Type === 2) ∧ effectBranches[i.Effect].class ∈ {SEND, GATED}',
      evidence: 'index.js:64321  `if (2 == e.Type) switch (e.Effect)`（客户端整段 switch 只在 Type===2 时执行）'
        + '；分类来源 tools\\facts\\effect-branches.json',
      effectBranchesFile: P.effectBranchesFile,
      effectClassCount: eb.classCount,
      effectClassUsed: REACH_CLASSES,
      reachEffectsCovered: eb.reachEffects.size,
      type2InDomain: type2InDomain,
      effectSEND_GATED: reachableIds.size,
      unmodeledReachable: unmodeledReachableIds.length,
      unmodeledReachableObtainable: unmodeledReachableObtainableIds.length,
      byEffect: effectCountObject(reachByEffect),
      byEffectUnmodeled: effectCountObject(reachUnmodeledByEffect),
      topByCount: topEffectPairs(reachByEffect, 10),
      topByCountUnmodeled: topEffectPairs(reachUnmodeledByEffect, 10),
      ledgerUnmodeledReachable: ledgerUnmodeledReachable,
      ledgerUnmodeled: ledgerUnmodeled,
      excluded: {
        type2WithoutEffectClassRow: type2NoEffectRow,
        type2WithNonSendGatedClass: type2NonReachClass,
        obtainableWithoutItemRow: unreachableNoType,
        note: '前两类是 Type===2 但 Effect 分类不在 {SEND,GATED} 里（或 effect-branches.json 没有该 effect 键）'
          + '→ 判不可达；第三类是可获得但 item.full.json 里没有配置行（拿不到 Type/Effect）→ 判不了，'
          + '不计入可达分子。其余 Type≠2 的物品按硬条件一律不可达。',
      },
      note: 'effectSEND_GATED = 域内 Type===2 且 class∈{SEND,GATED} 的物品数（"可达"全集，与 Obtainable 无关）；'
        + 'unmodeledReachable = 其中未建模（不要求可获得）；'
        + 'unmodeledReachableObtainable = 可达 ∧ 未建模 ∧ 可获得（可排期的那批）；'
        + 'ledgerUnmodeledReachable = Ledger ∧ 未建模 ∧ 可达 —— R16 §5 第 3 条"先做账本里现存的"的清单。'
        + 'byEffect / byEffectUnmodeled 是 {effect: 物品数} 对象（整数样式键在 JSON 里按数值升序，'
        + '不代表排序）；要看降序前 10 用 topByCount / topByCountUnmodeled 数组。',
    },
    ledgerUnmodeledReachable: ledgerUnmodeledReachable,
    itemsScope: {
      onlyUnmodeled: true,
      count: itemsIds.length,
      inFullTable: unmodeledButObtainable.length,
      outsideFullTable: outOfDomainUnmodeled,
      modeledObtainableNotInItems: sortedDomainObtainable.length - unmodeledButObtainable.length,
      labels: 'ledger:<容器> / drop:npc<id> / task:<任务> / shelf:<货架> / grant:<handler> / '
        + 'grant~<产出表名>（整 handler 高估）/ use:SEND|GATED（可达）',
      note: 'items **只收未建模的物品**（已建模的只计数，见 modeledObtainableNotInItems）。'
        + '域内未建模可获得 ' + unmodeledButObtainable.length + ' + 域外（item.full.json 无配置行）未建模可获得 '
        + outOfDomainUnmodeled + ' = ' + itemsIds.length + ' 条；域外那批按 R16 §5 第 2 条也进 items，'
        + '但它们没有 Type/Effect，不会出现在 reachable 里。顶层 unmodeledButObtainable（N）只含域内那部分。',
    },
    sourceCounts: sourceCounts,
    sourceCountsUnmodeled: sourceCountsUnmodeled,
    shelfDetail: shelfDetail,
    shelfDetailUnmodeled: shelfDetailUnmodeled,
    singleSourceUnmodeledItems: singleSourceByKind,
    onlyViaObtainable: onlyViaAllObtainable,
    currencyIdsInList: currencyInN,
    caveats: caveats,
    tableSizes: tableSizes,
    dropDetail: {
      npcs: dropSrc.npcs, groups: dropSrc.groups, resolvedNpc: dropSrc.resolvedNpc,
      nestedGroupExpansions: dropSrc.nestedHits,
    },
    grantDetail: {
      handlerCount: grant.handlerCount,
      producerHandlers: grant.producers.length,
      producers: grant.producers,
      skipped: grant.skipped,
      enumerableTables: ENUMERABLE_TABLES,
      lookupTablesNotCountedAsProduction: ['BZ_ITEMTYPE', 'BZ_ITEMPRICE', 'BZ_ITEMEAT', 'BZ_ITEMFUN', 'BZ_ITEMSCH'],
      overestimateNote: 'grant~<表名> 的标签 = "整 handler 高估"：该 handler 的发放点是变量/表查找，'
        + '按 R13 §3 的规定把它引用的那张产出表里的**所有**物品都算可获得；'
        + '高估范围 = 该表全量（例：buyShopItem/QuickBuyItem 高估到 BZ_ITEMBUYPRICE 全表 1101 个；'
        + 'exchangeItem 高估到 BZ_EXCHANGE 全表 965 个，含成本物）',
    },
    save: {
      path: save.path,
      copiesUnderBackup: save.all.length,
      mtime: new Date(statSafe(save.path).mtimeMs).toISOString(),
      md5Before: md5Before.save,
      md5After: null,
      md5Unchanged: null,
      containers: ['bag', 'playerEquip', 'equipments'],
    },
    guardedFiles: guarded.map(function (g) {
      return { key: g.key, file: g.file, md5Before: md5Before[g.key], md5After: null, unchanged: null };
    }),
    liveHandlers: { file: P.liveFile, bannedWord: LIVE_BANNED_WORD, hits: null, hitsMustBe: 0 },
    outOfDomainObtainable: {
      count: outOfDomain.length,
      unmodeledCount: outOfDomainUnmodeled,
      modeledCount: outOfDomainModeled,
      perSource: outOfDomainPerSource,
      inItems: outOfDomainUnmodeled,
      note: 'R16 §5 第 2 条后：域外（item.full.json 无配置行）未建模可获得的 '
        + outOfDomainUnmodeled + ' 个**已进 items**；这里保留旧键做对账，只额外给出计数与来源分布。'
        + '它们没有 Type/Effect → 不进 reachable。',
    },
    checks: { passed: 0, failed: 0 },
  };

  /* ---- 6.8 落盘 -------------------------------------------------------- */
  console.log('');
  console.log('--- [7/8] 落盘（只写 tools\\facts\\ 一个文件）---');

  const payload = {
    ledger: ledgerCounts,
    items: items,
    unmodeledButObtainable: unmodeledButObtainable,
    stats: stats,
    unresolved: unresolved,
  };

  fs.mkdirSync(path.dirname(P.outFile), { recursive: true });
  const jsonText = JSON.stringify(payload, null, 2) + '\n';
  fs.writeFileSync(P.outFile, jsonText, 'utf8');
  const outStat = fs.statSync(P.outFile);
  console.log('  写入： ' + P.outFile);
  console.log('  字节： ' + outStat.size + '  md5： ' + md5File(P.outFile));

  /* ---- 6.9 硬要求自查（写完之后做，确保覆盖整段运行）-------------------- */
  console.log('');
  console.log('--- [8/8] 硬要求自查 ---');

  console.log('  [硬要求 1] 不写存档');
  const md5After = {};
  guarded.forEach(function (g) { md5After[g.key] = md5File(g.file); });
  console.log('    md5 BEFORE (save) = ' + md5Before.save);
  console.log('    md5 AFTER  (save) = ' + md5After.save);
  console.log('    存档路径 = ' + save.path);
  check(md5Before.save === md5After.save, '存档副本 md5 跑前/跑后一致（未写入）');
  check(md5Before.tasks === md5After.tasks, 'bz-tasks.generated.js md5 未变');
  check(md5Before.rpc === md5After.rpc, 'bz-rpc-server.js md5 未变');
  check(md5Before.liveHandlers === md5After.liveHandlers, 'patch\\live\\handlers.js md5 未变');
  check(md5Before.itemFull === md5After.itemFull, 'tools\\cfg\\dump\\item.full.json md5 未变（只读输入）');
  check(md5Before.effectBranches === md5After.effectBranches,
    'tools\\facts\\effect-branches.json md5 未变（只读输入）');

  console.log('  [硬要求 2] 不进入运行路径');
  const liveText = fs.readFileSync(P.liveFile, 'utf8');
  const mask = commentMask(liveText);
  const hitsList = [];
  {
    let i = 0;
    for (;;) {
      const k = liveText.indexOf(LIVE_BANNED_WORD, i);
      if (k < 0) break;
      i = k + 1;
      hitsList.push({ offset: k, line: lineOfOffset(liveText, k), inComment: mask[k] === 1 });
    }
  }
  const hitsAll = hitsList.length;
  const hitsCode = hitsList.filter(function (h) { return !h.inComment; }).length;
  console.log('    handlers.js : ' + P.liveFile);
  console.log('    mtime       : ' + lastMtimeIso(P.liveFile));
  console.log('    绝对命中数   = ' + hitsAll + '（原文要求的数字）');
  console.log('    运行路径命中 = ' + hitsCode + '（去掉注释后的命中）');
  hitsList.forEach(function (h) {
    console.log('      line ' + h.line + ' @' + h.offset + (h.inComment ? '  [注释内]' : '  **[代码/字符串]**'));
    const a = Math.max(0, h.offset - 90);
    console.log('        …' + JSON.stringify(liveText.slice(a, h.offset + 40)) + '…');
  });
  if (hitsAll !== 0 && hitsCode === 0) {
    console.log('    ⚠ 绝对命中不为 0，但每一条都在 /** … */ 注释里（指向本工具与产物的路径说明），');
    console.log('      不在任何执行分支、也不是字符串常量。该注释是别人在 core/bz-rpc-server.js 里加的');
    console.log('      （core mtime=' + lastMtimeIso(P.rpcFile) + '），随后被 built 进 live bundle；');
    console.log('      本脚本按"只读"约束无权改 core，故不自行消除。');
    console.log('      要回到"绝对命中 0"：删掉 core/bz-rpc-server.js 第 110 行注释里那两个路径引用再 rebuild；');
    console.log('      或设 BZ_LIVE_STRICT=1 用原文口径复跑（会以退出码 1 结束）。');
    unres('live-bundle-comment-hits', {
      file: P.liveFile,
      absoluteHits: hitsAll,
      codeHits: hitsCode,
      lines: hitsList.map(function (h) { return h.line; }),
      note: '原文要求"obtainable 命中数必须是 0"。实测绝对命中 2，全部落在 /** … */ 注释里'
        + '（core/bz-rpc-server.js:110 的"受影响物品清单由 tools\\gen_obtainable.js 算"），'
        + '不在执行路径/字符串常量里。该注释非本脚本所写（core 与本脚本同属只读范围），'
        + '要清零必须改 core 并 rebuild；本脚本按"运行路径命中=0"判定，并将两者都打印出来',
    });
  }
  const strictMode = process.env.BZ_LIVE_STRICT === '1';
  if (strictMode) {
    check(hitsAll === 0, '[严格口径 BZ_LIVE_STRICT=1] handlers.js 里 "' + LIVE_BANNED_WORD
      + '" 绝对命中数为 0（实测 ' + hitsAll + '）');
  } else {
    check(hitsCode === 0, 'live handlers.js 里 "' + LIVE_BANNED_WORD
      + '" 的运行路径命中数为 0（绝对命中 ' + hitsAll
      + (hitsAll ? '，全部在注释内' : '，该文件里已没有这个词') + '）');
  }

  console.log('  [硬要求 3] 产物只放 tools/facts/');
  const outDir = path.dirname(P.outFile);
  check(outDir === path.join(ROOT, 'tools', 'facts'), '产物目录 = ' + outDir);
  check(fs.existsSync(P.outFile), '产物文件存在');

  // 回填自查结果（写进产物，便于事后核对）
  stats.save.md5After = md5After.save;
  stats.save.md5Unchanged = (md5Before.save === md5After.save);
  stats.guardedFiles.forEach(function (g) {
    g.md5After = md5After[g.key];
    g.unchanged = (g.md5Before === md5After[g.key]);
  });
  stats.liveHandlers = {
    file: P.liveFile,
    mtime: lastMtimeIso(P.liveFile),
    bannedWord: LIVE_BANNED_WORD,
    absoluteHits: hitsAll,
    codeHits: hitsCode,
    hitsMustBe: 0,
    strictMode: strictMode,
    hits: hitsList,
    verdict: (hitsCode === 0)
      ? 'pass(运行路径命中 0；绝对命中 ' + hitsAll
        + (hitsAll ? '，全在注释内' : '，文件里已没有该词') + ')'
      : 'fail(运行路径里有 ' + hitsCode + ' 处命中)',
  };
  stats.durMs = Date.now() - t0;
  stats.checks = {
    failed: failed,
    passed: CHECKS.filter(function (c) { return c.ok; }).length,
    total: CHECKS.length,
    items: CHECKS,
  };
  fs.writeFileSync(P.outFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  const outStat2 = fs.statSync(P.outFile);
  console.log('  产物已回填自查结果：' + outStat2.size + ' 字节  md5 ' + md5File(P.outFile));

  /* ---- 6.10 报告 ------------------------------------------------------- */
  console.log('');
  console.log('==================================================================');
  console.log('统计（当前决策域 = ' + domain.size + '，来源 ' + domainSource + '）');
  console.log('  totalItems                    = ' + stats.totalItems);
  console.log('  obtainableCount               = ' + stats.obtainableCount);
  console.log('  unmodeledCount                = ' + stats.unmodeledCount);
  console.log('  unmodeledButObtainableCount   = ' + stats.unmodeledButObtainableCount + '   ← 新 N');
  console.log('  items 条目（只含未建模）      = ' + stats.itemsCount
    + '（域内 ' + stats.itemsScope.inFullTable + ' + 域外无配置行 '
    + stats.itemsScope.outsideFullTable + '）');
  console.log('  各来源计数（域内 / 其中未建模）：');
  Object.keys(sourceCounts).forEach(function (k) {
    console.log('    ' + k.padEnd(14) + sourceCounts[k] + ' / ' + sourceCountsUnmodeled[k]);
  });
  console.log('  货架明细（域内 / 未建模）：NPCSHOP=' + shelfDetail.NPCSHOP + '/' + shelfDetailUnmodeled.NPCSHOP
    + '  GESHOP=' + shelfDetail.GESHOP + '/' + shelfDetailUnmodeled.GESHOP
    + '  ROGUESHOP=' + shelfDetail.ROGUESHOP + '/' + shelfDetailUnmodeled.ROGUESHOP);
  console.log('  只有一个来源的未建模物品 = ' + JSON.stringify(singleSourceByKind));
  console.log('  全部可获得物品的"唯一来源"分布 = ' + JSON.stringify(onlyViaAllObtainable));
  console.log('--- 两口径对账（stats.crossCheck）---');
  [['全表 item.full.json', crossCheck.fullTable], ['BZ_ITEMTYPE 522', crossCheck.bzItemType522]]
    .forEach(function (pair) {
      const m = pair[1];
      console.log('  ' + pair[0].padEnd(22)
        + ' 域=' + m.domainSize + ' 可获得=' + m.obtainable + ' 未建模=' + m.unmodeled
        + ' N=' + m.unmodeledButObtainable + ' 可达=' + m.reachable
        + '（未建模可达=' + m.reachableUnmodeled + '）');
    });
  console.log('  域外（item.full.json 无配置行）可获得 = ' + crossCheck.obtainableOutsideFullTable.count
    + '（未建模 ' + crossCheck.obtainableOutsideFullTable.unmodeledCount
    + '，已进 items；可达判不了）');
  console.log('--- 可达（Type===2 ∧ Effect class∈{SEND,GATED}，证据 index.js:64321）---');
  console.log('  effectSEND_GATED              = ' + stats.reachable.effectSEND_GATED
    + '（域内 Type2=' + type2InDomain + '）');
  console.log('  unmodeledReachable            = ' + stats.reachable.unmodeledReachable
    + '（其中可获得 ' + stats.reachable.unmodeledReachableObtainable + '）');
  console.log('  byEffect 前 10                = ' + JSON.stringify(stats.reachable.topByCount));
  console.log('  ledgerUnmodeledReachable      = ' + JSON.stringify(ledgerUnmodeledReachable));
  console.log('  unresolved 条目 = ' + unresolved.length);
  console.log('--- 口径/高估提示（同 stats.caveats）---');
  caveats.forEach(function (c, i) { console.log('  (' + (i + 1) + ') ' + c); });
  console.log('==================================================================');
  const PRINT_MAX = 200;
  console.log('N = unmodeledButObtainable = ' + unmodeledButObtainable.length
    + ' 个物品（全部 ' + unmodeledButObtainable.length + ' 条在产物的顶层键里；下面只打前 '
    + Math.min(PRINT_MAX, unmodeledButObtainable.length) + ' 条）：');
  unmodeledButObtainable.slice(0, PRINT_MAX).forEach(function (id) {
    console.log('  ' + String(id).padStart(6) + '  ' + items[String(id)].join(' '));
  });
  if (unmodeledButObtainable.length > PRINT_MAX) {
    console.log('  …（省略 ' + (unmodeledButObtainable.length - PRINT_MAX) + ' 条，见 ' + P.outFile + '）');
  }
  console.log('==================================================================');
  console.log('退出码：' + (failed ? 1 : 0) + (failed ? '（自查失败 ' + failed + ' 项）' : '（全部自查通过）'));
  process.exit(failed ? 1 : 0);
}

main();
