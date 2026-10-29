#!/usr/bin/env node
// 吞吐统计：读 nightly.jsonl，给出真实数据（不再用 c 单位估算）
// node forge/tools/throughput.js --log out/nightly.jsonl [--remaining <待办动作数>]
'use strict';
const fs = require('fs');
const { args } = require('../../host/lib/util');
const a = args(process.argv.slice(2));
const rows = fs.readFileSync(a.log, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const n = rows.length;
if (!n) { console.log('没有记录'); process.exit(0); }
const first = rows.filter(r => r.outcome === 'PASS-FIRST').length, retry = rows.filter(r => r.outcome === 'PASS-RETRY').length, human = n - first - retry;
const ms = rows.reduce((s, r) => s + r.ms, 0);
const att = rows.reduce((s, r) => s + r.attempts, 0) / n;
const perAction = ms / n;
const out = {
  actions: n, firstPassRate: +(first / n).toFixed(3), autoPassRate: +((first + retry) / n).toFixed(3), humanResidue: human,
  avgAttempts: +att.toFixed(2), avgMsPerAction: Math.round(perAction), autoActionsPerHour: +((first + retry) / (ms / 3.6e6)).toFixed(1),
};
if (a.remaining) {
  const R = +a.remaining;
  out.projection = { remaining: R, expectedAuto: Math.round(R * out.autoPassRate), expectedHuman: Math.round(R * (1 - out.autoPassRate)),
    machineHours: +((R * perAction) / 3.6e6).toFixed(2), caveat: '外推假设：剩余动作与样本同分布。样本少于 30 个时不要据此定周期。' };
}
console.log(JSON.stringify(out, null, 2));
