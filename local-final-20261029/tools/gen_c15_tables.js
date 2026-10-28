'use strict';
/**
 * gen_c15_tables.js —— 第 16 批 C15〔七日回归〕紧凑表（2026-10-27，档 A）
 *
 * 产出 hotfix-patch/core/bz-c15.generated.js：
 *   BZ_C15 = {
 *     durationDays: 14,     // constant 360（回归期天数，客户端 countdown = triggerTime + 864e5×14）
 *     sevenDay: {1..7: [[itemId,num]...]},   // Return_SevenDay.reward1 解析
 *     tasks: [{id,liveness,items:[[id,num]]}...],  // Return_Daily 11 行（任务完成口径档 A 恒 0，仅展示）
 *     awards: [{id,liveness,items:[[id,num]]}...],  // Return_Award 5 档（档 A 恒不可领，仅展示）
 *     gifts: [{id,name,price}...],          // Return_store 3 档付费礼包（纯展示）
 *   }
 *
 * 口径依据（取证：batch16-facts-20261027\C15-取证与策略.md）：
 *   scripts3.js:63559-63626 ReturnModel 契约；63300-63450 面板渲染；63700-63865 任务项
 *   cfg\dump\constant.json 360 = 14；Return_SevenDay/Return_Daily/Return_Award/Return_store
 *
 * 用法：node tools\gen_c15_tables.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DUMP = path.join(ROOT, 'tools', 'cfg', 'dump');
const OUT = path.join(ROOT, 'hotfix-patch', 'core', 'bz-c15.generated.js');

const readJson = (n) => JSON.parse(fs.readFileSync(path.join(DUMP, n), 'utf8'));
const constant = readJson('constant.json');
const sevenDay = readJson('Return_SevenDay.json');
const daily = readJson('Return_Daily.json');
const award = readJson('Return_Award.json');
const store = readJson('Return_store.json');

function constValue(id) {
  const row = constant.data && constant.data[String(id)];
  if (!row) throw new Error('constant ' + id + ' 缺失');
  const v = row.Date != null ? row.Date : (row._data && row._data._value && row._data._value[0]);
  const n = Number(v);
  if (!(n > 0)) throw new Error('constant ' + id + ' 非法: ' + JSON.stringify(v));
  return n;
}

/** "1,50|8905,20" → [[1,50],[8905,20]]；字段值可能是数组（防表结构漂移） */
function parsePairs(str) {
  if (Array.isArray(str)) return str.map((x) => x.map(Number));
  if (!str) return [];
  return String(str).split('|').filter(Boolean).map((seg) => {
    const p = seg.split(',');
    return [parseInt(p[0], 10), parseInt(p[1], 10)];
  }).filter((p) => p[0] > 0 && p[1] > 0);
}

const durationDays = constValue(360);

const sevenDayOut = {};
for (const id of Object.keys(sevenDay.data || {})) {
  const row = sevenDay.data[id];
  if (row) sevenDayOut[String(id)] = parsePairs(row.reward1);
}

const tasks = [];
for (const id of Object.keys(daily.data || {})) {
  const row = daily.data[id];
  if (!row) continue;
  tasks.push({ id: parseInt(id, 10), liveness: parseInt(row.liveness, 10) || 0, items: parsePairs(row.reward) });
}
tasks.sort((a, b) => a.id - b.id);

const awards = [];
for (const id of Object.keys(award.data || {})) {
  const row = award.data[id];
  if (!row) continue;
  awards.push({ id: parseInt(id, 10), liveness: parseInt(row.liveness, 10) || 0, items: parsePairs(row.award1) });
}
awards.sort((a, b) => a.id - b.id);

const gifts = [];
for (const id of Object.keys(store.data || {})) {
  const row = store.data[id];
  if (!row) continue;
  gifts.push({ id: parseInt(id, 10), name: parseInt(row.name, 10) || 0, price: parseInt(row.Price, 10) || 0 });
}
gifts.sort((a, b) => a.id - b.id);

const out = {
  generatedAt: new Date().toISOString(),
  src: { constant: '360', sevenDay: 'Return_SevenDay', daily: 'Return_Daily', award: 'Return_Award', store: 'Return_store' },
  durationDays: durationDays,
  sevenDay: sevenDayOut,
  tasks: tasks,
  awards: awards,
  gifts: gifts,
};

const js = '/* C15 七日回归表（tools/gen_c15_tables.js 生成，请勿手改）\n'
  + ' * 期限 ' + durationDays + ' 天 | 七日奖励 ' + Object.keys(sevenDayOut).length + ' 档 | 任务 ' + tasks.length
  + ' 行 | 活跃度档 ' + awards.length + ' | 付费礼包 ' + gifts.length + ' 档（纯展示） */\n'
  + 'var BZ_C15 = ' + JSON.stringify(out) + ';\n';

fs.writeFileSync(OUT, js, 'utf8');
console.log('[gen_c15] wrote ' + OUT);
console.log('[gen_c15] duration=' + durationDays + ' days=' + Object.keys(sevenDayOut).length
  + ' tasks=' + tasks.length + ' awards=' + awards.length + ' gifts=' + gifts.length);
