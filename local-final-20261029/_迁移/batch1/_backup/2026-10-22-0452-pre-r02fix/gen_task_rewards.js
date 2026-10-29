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

const CURRENCY = { 1: 1, 2: 1, 4001: 1, 4002: 1, 4003: 1 };

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
  const n = requireItems(t.SpRequire);
  for (const k of Object.keys(n)) {
    if (!item.table[k]) { stat.unknownItem++; continue; }
    typeMap[k] = parseInt(item.table[k].Type, 10) || 0;
    stat.needItems++;
  }
  if (!Object.keys(r).length && !Object.keys(n).length) continue;
  stat.tasks++;
  if (Object.keys(r).length) stat.withReward++;
  if (Object.keys(n).length) stat.withNeed++;
  table[id] = {};
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
