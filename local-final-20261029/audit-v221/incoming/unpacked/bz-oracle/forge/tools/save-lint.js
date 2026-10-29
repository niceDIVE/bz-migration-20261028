#!/usr/bin/env node
// 存档体检：按 M3/M4 的不变式检查一份存档（设备拉回的 bz_offline_save.json 或 case 里的 saveAfter），坏档在几毫秒内定位。
// node forge/tools/save-lint.js <save.json> [--currency 1,4001,4002,4003,8888]
'use strict';
const { args, readJSON } = require('../../host/lib/util');
function lint(s, cur = [1, 4001, 4002, 4003, 8888]) {
  const E = [], W = [];
  const isInt = v => Number.isInteger(v);
  for (const k of ['coins', 'gold', 'yuanbao', 'potential', 'contribution']) if (k in s && (typeof s[k] !== 'number' || s[k] < 0)) E.push(`${k}=${JSON.stringify(s[k])} 不是非负数（M3 §1）`);
  for (const [id, v] of Object.entries(s.bag || {})) {
    if (!isInt(v) || v < 0) E.push(`bag[${id}]=${v} 不是非负整数`);
    if (v === 0) W.push(`bag[${id}]=0 应删除键（投射器按"缺省=0"处理）`);
    if (cur.includes(+id)) E.push(`货币 ${id} 进了背包（货币只走钱包，M4 §3）`);
  }
  for (const [id, v] of Object.entries(s.skills || {})) if (!Array.isArray(v) || v.length !== 3 || !v.every(isInt) || v[0] <= 0) E.push(`skills[${id}]=${JSON.stringify(v)}：必须 [lv>0,pgr,brlv]（lv=0 下发即删技能，M4 §4）`);
  for (const [slot, uid] of Object.entries(s.equipments || {})) if (!(s.playerEquip || {})[uid]) E.push(`equipments[${slot}]=${uid} 在 playerEquip 里不存在（两本账脱节，M3 §1）`);
  for (const [uid, v] of Object.entries(s.playerEquip || {})) if (!Array.isArray(v) || v.length < 2) E.push(`playerEquip[${uid}]=${JSON.stringify(v)} 形态应为 [type,num,...]`);
  if (s.baseValueAy && s.baseValueAy.length !== 44) E.push(`baseValueAy 长度 ${s.baseValueAy.length} ≠ 44（M3 §3）`);
  if (s.baseValueAy && s.name && s.baseValueAy[1] !== s.name) W.push(`baseValueAy[1]=${s.baseValueAy[1]} 与 name=${s.name} 不同源`);
  for (const k of ['accepted', 'done', 'rewarded']) if (k in s && !Array.isArray(s[k])) E.push(`${k} 应为数组`);
  const done = new Set(s.done || []);
  for (const id of s.rewarded || []) if (!done.has(id)) W.push(`任务 ${id} 已领奖但不在 done 里`);
  for (const id of s.accepted || []) if (done.has(id)) W.push(`任务 ${id} 同时在 accepted 与 done`);
  if (Array.isArray(s.bloodArr) && s.bloodArr.length !== 4) E.push('bloodArr 长度应为 4');
  if (Array.isArray(s.fosterArr) && s.fosterArr.length !== 4) E.push('fosterArr 长度应为 4');
  if ('hunger' in s && 'hungerMax' in s && s.hunger > s.hungerMax) W.push(`hunger ${s.hunger} > hungerMax ${s.hungerMax}`);
  return { errors: E, warnings: W };
}
module.exports = { lint };
if (require.main === module) {
  const a = args(process.argv.slice(2));
  let s = readJSON(a._[0]);
  if (!s) { console.error('用法：save-lint.js <save.json>'); process.exit(2); }
  if (s.saveAfter) s = s.saveAfter;
  const r = lint(s, a.currency ? String(a.currency).split(',').map(Number) : undefined);
  r.errors.forEach(x => console.log('✘ ' + x)); r.warnings.forEach(x => console.log('⚠ ' + x));
  console.log(r.errors.length ? `坏档：${r.errors.length} 个错误` : `存档健康（${r.warnings.length} 条提醒）`);
  process.exit(r.errors.length ? 1 : 0);
}
