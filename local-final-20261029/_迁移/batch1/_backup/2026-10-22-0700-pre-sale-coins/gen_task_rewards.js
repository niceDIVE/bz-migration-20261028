'use strict';
/**
 * gen_task_rewards.js —— 从游戏原始配置表生成「任务奖励 / 任务所需物品」表
 *
 * 输入（tools/cfg/ 下，由 probe/dump_tables.js 从设备 startres bundle 导出，勿手改）：
 *   tbl_tasknew.json   4842 个任务：Reward（掉落表 id）/ SpRequire（"物品id,数量" 或 "id1,n1|id2,n2"）
 *   tbl_drop.json      掉落表：{ Item1:[itemID,count], probability1, Item2... }
 *   tbl_item.json      物品表：6525 条（Type=1 装备 / 2 消耗品 / 3 材料…）
 *
 * 输出：
 *   hotfix-patch/core/bz-tasks.generated.js
 *     var BZ_TASKS = { "100150": { n:{4015:1}, r:{} }, ... }
 *       n = 完成该任务所需的物品（客户端 judgeItemRequire 会查背包）
 *       r = 完成该任务应发的奖励（掉落表展开后的 {物品id:数量}）
 *
 * 约定：
 *   - 掉落表里 probability < 100 的条目不进"必得奖励"（避免凭空多发）；仍记录在 meta 里方便排查
 *   - 货币类 id（1 / 2 / 4001 / 4002 / 4003）不进奖励（客户端 setItem 对这五个 id 走特殊分支，
 *     放进 itemObj 无效；真实服务器是走 note.eco 的，我们没有那个映射表）
 *
 * 用法： node tools/gen_task_rewards.js [--stat]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CFG = path.join(ROOT, 'tools', 'cfg');
const OUT = path.join(ROOT, 'hotfix-patch', 'core', 'bz-tasks.generated.js');

const task = JSON.parse(fs.readFileSync(path.join(CFG, 'tbl_tasknew.json'), 'utf8'));
const drop = JSON.parse(fs.readFileSync(path.join(CFG, 'tbl_drop.json'), 'utf8'));
const item = JSON.parse(fs.readFileSync(path.join(CFG, 'tbl_item.json'), 'utf8'));
const npcRaw = JSON.parse(fs.readFileSync(path.join(CFG, 'npc_compact.json'), 'utf8'));

const CURRENCY = { 1: 1, 2: 1, 4001: 1, 4002: 1, 4003: 1 };

/** 只有这三种 Type 的 SpRequire 才是"要携带的物品"。
 *  依据（客户端 index.js:134394-134426 judgeTaskFinishRequire）：
 *    Type 2/12/13 → judgeItemRequire(SpRequire)  ← 真物品
 *    Type 3       → judgeFightRequire(SpRequire) ← 怪物 id，不是物品
 *    Type 1/5/9/10/11 → 只看 Require（实测全 "0"），SpRequire 是装饰
 *  2026-10-22：以前对全部 Type 都出 `n`，导致 12 条 Type1 的装饰性需求漏进叠加，
 *  会让客户端凭空看到一个幽灵物品（R02 回执的"硬伤候选一"）。 */
const NEED_TYPES = { 2: 1, 12: 1, 13: 1 };

function dropItems(dropId) {
  const d = drop.table[String(dropId)];
  if (!d) return null;
  const out = {};
  let skippedProb = 0;
  for (let i = 1; i <= 10; i++) {
    const v = d['Item' + i];
    if (!v || !Array.isArray(v) || !v.length) continue;
    const id = parseInt(v[0], 10);
    const n = parseInt(v[1], 10) || 0;
    const p = parseInt(d['probability' + i], 10);
    if (!(id > 0) || !(n > 0)) continue;
    if (CURRENCY[id]) { skippedProb++; continue; }
    if (!(p >= 100)) { skippedProb++; continue; }
    out[id] = (out[id] || 0) + n;
  }
  return { items: out, skipped: skippedProb };
}

function requireItems(sp) {
  const s = String(sp == null ? '' : sp).trim();
  if (!s || s === '0') return {};
  const out = {};
  for (const part of s.split('|')) {
    const bits = part.split(',');
    const id = parseInt(bits[0], 10);
    const n = parseInt(bits[1], 10);
    if (!(id > 0)) continue;
    if (!(n > 0)) continue;   // 只有 id 没有数量：客户端 < undefined 判为通过，不需要发
    out[id] = (out[id] || 0) + n;
  }
  return out;
}

const table = {};
const typeMap = {};   // 被奖励/要求引用到的物品 → Type（1=装备，其它=可堆叠）
const stat = { tasks: 0, withReward: 0, withNeed: 0, rewardItems: 0, needItems: 0, dropMissing: 0, probSkipped: 0, unknownItem: 0, types: 0 };

for (const id of Object.keys(task.table)) {
  if (id.indexOf('__name:') === 0) continue;
  const t = task.table[id];
  if (!t || !t.TaskID) continue;
  const r = {};
  const rw = String(t.Reward == null ? '' : t.Reward);
  if (rw && rw !== '0') {
    const d = dropItems(rw);
    if (d) {
      stat.probSkipped += d.skipped;
      for (const k of Object.keys(d.items)) {
        if (!item.table[k]) { stat.unknownItem++; continue; }
        typeMap[k] = parseInt(item.table[k].Type, 10) || 0;
        r[k] = d.items[k];
        stat.rewardItems++;
      }
    } else if (item.table[rw]) {
      // 少部分任务的 Reward 直接写物品 id
      typeMap[rw] = parseInt(item.table[rw].Type, 10) || 0;
      r[rw] = 1;
      stat.rewardItems++;
    } else {
      stat.dropMissing++;
    }
  }
  const ty = parseInt(t.Type, 10) || 0;
  const nAll = requireItems(t.SpRequire);
  // typeMap 要覆盖"所有被引用到的物品"，包括 Type1 的装饰需求（否则 BZ_ITEMTYPE 会缺项、装备分流判错）
  for (const k of Object.keys(nAll)) {
    if (!item.table[k]) { stat.unknownItem++; continue; }
    typeMap[k] = parseInt(item.table[k].Type, 10) || 0;
  }
  // 只有 Type 2/12/13 的 SpRequire 才是真·物品需求（见文件头的 NEED_TYPES 注释）
  const n = NEED_TYPES[ty] ? nAll : {};
  for (const k of Object.keys(n)) stat.needItems++;
  const isRepeat = parseInt(t.Repeat, 10) > 0;
  if (!Object.keys(r).length && !Object.keys(n).length) continue;
  stat.tasks++;
  if (Object.keys(r).length) stat.withReward++;
  if (Object.keys(n).length) stat.withNeed++;
  table[id] = { t: ty };
  if (isRepeat) table[id].p = 1;                 // p = Repeat≠0：可重复接取，客户端不记完成
  if (Object.keys(n).length) table[id].n = n;
  if (Object.keys(r).length) table[id].r = r;
}

const lines = [];
lines.push('/* bz-tasks.generated.js —— 由 tools/gen_task_rewards.js 自动生成，勿手改');
lines.push(' * 数据源：设备 startres bundle 里的 configs/tasknew + configs/drop + configs/item（原始配置表）');
lines.push(' * n = 完成任务所需携带的物品；r = 完成任务应发奖励。生成于 ' + new Date().toISOString());
lines.push(' * 只收「有奖励」或「有物品要求」的任务；概率掉落(<100)与货币 id 不收。 */');
lines.push('var BZ_TASKS = ' + JSON.stringify(table) + ';');
lines.push('BZ_TASKS.__meta = { tasks: ' + stat.tasks + ', withReward: ' + stat.withReward + ', withNeed: ' + stat.withNeed + ' };');
lines.push('/* 被引用到的物品 → Type。1 = 装备（走 PlayerEquip 账本），其它走背包 */');
lines.push('var BZ_ITEMTYPE = ' + JSON.stringify(typeMap) + ';');

// ---- 打怪掉落：npc.Drop → drop 表 → 物品 ----
// 每条记 [数量, 概率]：概率 >= 100 的必得，< 100 的由服务端掷点（掷点是否重复由 handler 的去重窗口管）
const npcTable = (npcRaw && npcRaw.npc) || npcRaw || {};
const npcDrop = {};        // npcId -> dropId
const dropUsed = {};       // dropId -> {itemId:[count, prob]}
const npcStat = { npcsWithDrop: 0, resolved: 0, missing: 0, dropIds: 0, guaranteed: 0, random: 0 };
const dropRows = (drop && drop.table) || {};
for (const k of Object.keys(npcTable)) {
  const d = parseInt((npcTable[k] || {}).d, 10) || 0;
  if (!(d > 0)) continue;
  npcStat.npcsWithDrop++;
  const row = dropRows[String(d)];
  if (!row) { npcStat.missing++; continue; }
  npcStat.resolved++;
  if (!dropUsed[d]) {
    const got = {};
    for (let i = 1; i <= 10; i++) {
      const v = row['Item' + i];
      if (!v) continue;
      const arr = Array.isArray(v) ? v : String(v).split(',');
      const iid = parseInt(arr[0], 10) || 0;
      const cnt = parseInt(arr[1], 10) || 1;
      const p = parseInt(row['probability' + i], 10);
      if (!(iid > 0) || !(cnt > 0)) continue;
      if (CURRENCY[iid]) continue;
      if (!(p > 0)) continue;
      got[iid] = [cnt, p];
      if (p >= 100) npcStat.guaranteed++; else npcStat.random++;
    }
    if (Object.keys(got).length) dropUsed[d] = got;
  }
  if (dropUsed[d]) npcDrop[k] = d; else npcStat.missing++;
}
npcStat.dropIds = Object.keys(dropUsed).length;
lines.push('/* 打怪掉落：npcId -> dropId；dropId -> {物品id:[数量, 概率]}（概率<100 的由 handler 掷点） */');
lines.push('var BZ_NPCDROP = ' + JSON.stringify(npcDrop) + ';');
lines.push('var BZ_DROP = ' + JSON.stringify(dropUsed) + ';');
lines.push('BZ_DROP.__meta = ' + JSON.stringify(npcStat) + ';');

// ---- 战斗准备：可战斗 npc 的 26 项数值（客户端 generateNpcData 的固定顺序，见 index.js:8093-8134）----
const npcStatsPath = path.join(CFG, 'npc_stats.json');
let npcArrMap = {}, npcArrCount = 0;
if (fs.existsSync(npcStatsPath)) {
  npcArrMap = JSON.parse(fs.readFileSync(npcStatsPath, 'utf8'));
  npcArrCount = Object.keys(npcArrMap).length;
}
lines.push('/* 战斗用：npcId -> [bili,shenfa,gengu,wuxing,exp,HP,MP,Attack,Hit,Defense,face,sex,Weapon,Equip,jineng,qinggong,neigong,AttributeType,Miss,AI,BreakDef,InterDamRes] */');
lines.push('var BZ_NPCARR = ' + JSON.stringify(npcArrMap) + ';');
lines.push('BZ_NPCARR.__meta = { npcs: ' + npcArrCount + ' };');
lines.push('');


stat.types = Object.keys(typeMap).length;

if (process.argv.includes('--stat')) {
  console.log(JSON.stringify(stat, null, 1));
  console.log('sample 100150:', JSON.stringify(table['100150']));
  console.log('sample 100010:', JSON.stringify(table['100010']));
  process.exit(0);
}

fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(JSON.stringify({
  ok: true, ...stat,
  bytes: Buffer.byteLength(lines.join('\n')),
  wrote: path.relative(ROOT, OUT),
  sample100150: table['100150'] || null,
  sample100010: table['100010'] || null,
}, null, 1));
