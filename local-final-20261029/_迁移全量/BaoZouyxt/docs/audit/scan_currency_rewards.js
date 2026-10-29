'use strict';
/**
 * scan_currency_rewards.js —— 只读审计（本回合临时脚本，不改产品代码）
 *
 * 目的：§7-2 的 bug 是"奖励 id 是货币 → 被 grantItem 塞进背包"。exchangeItem 一处已确认 118 行。
 * 本脚本把**所有**生成的奖励表都扫一遍，看同样的毛病还藏在哪些表里，给出计数与样本。
 *
 * 跑法：node docs\audit\scan_currency_rewards.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const CORE = path.join(ROOT, 'hotfix-patch', 'core');
const gen = fs.readFileSync(path.join(CORE, 'bz-tasks.generated.js'), 'utf8');
vm.runInThisContext(gen);

// 客户端 getItemNum（tools/index.js:106347-106360）认定的货币 id
const CUR = { 1: 'gold', 4001: 'coins', 4002: 'exp(无存档字段)', 4003: 'potential/潜能', 8888: 'yuanbao' };
const out = {};

function tally(name, rows) {
  const hit = {};
  const samples = [];
  for (const r of rows) {
    const id = parseInt(r, 10) || 0;
    if (!CUR[id]) continue;
    hit[id] = (hit[id] || 0) + 1;
    if (samples.length < 5) samples.push(r);
  }
  out[name] = { rows: rows.length, currencyHits: hit, samples };
}

// 1) 兑换表：行[2] = 奖励 id
{
  const rows = [];
  for (const npc of Object.keys(BZ_EXCHANGE || {})) for (const row of BZ_EXCHANGE[npc]) rows.push(row[2]);
  tally('BZ_EXCHANGE 奖励id', rows);
}
// 2) 任务奖励：结构见 gen_task_rewards.js，逐表试探
for (const [name, val] of Object.entries({
  BZ_TASKS: typeof BZ_TASKS !== 'undefined' ? BZ_TASKS : null,
})) {
  if (!val) continue;
  const ids = [];
  for (const tid of Object.keys(val)) {
    const r = val[tid] && val[tid].r;   // 奖励表
    if (r && typeof r === 'object') for (const k of Object.keys(r)) ids.push(k);
  }
  tally(name + ' 奖励键', ids);
}
// 3) 掉落表
if (typeof BZ_DROP !== 'undefined') {
  const ids = [];
  for (const d of Object.keys(BZ_DROP)) for (const k of Object.keys(BZ_DROP[d])) ids.push(k);
  tally('BZ_DROP 掉落键', ids);
}
// 4) 商店货架（正邪 / 江湖）
for (const [n, v] of Object.entries({
  BZ_GESHOP: typeof BZ_GESHOP !== 'undefined' ? BZ_GESHOP : null,
  BZ_ROGUESHOP: typeof BZ_ROGUESHOP !== 'undefined' ? BZ_ROGUESHOP : null,
})) {
  if (!v) continue;
  const ids = [];
  for (const row of (Array.isArray(v) ? v : Object.values(v))) {
    if (row && row.item !== undefined) ids.push(row.item);
    if (row && row.id !== undefined) ids.push(row.id);
  }
  tally(n + ' 行 id/item', ids);
}

console.log(JSON.stringify(out, null, 2));
