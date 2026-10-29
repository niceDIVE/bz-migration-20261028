/* task_chain.js —— 从导出的 tasknew 表里算任务链（只读，输出短）
 * 用途：判定"当前在办任务"往下能走到哪、前置链是不是断的。
 * 用法：node tools\task_chain.js [taskId]
 */
const fs = require('fs');
const path = require('path');

const cfgPath = path.join(__dirname, 'cfg', 'tbl_tasknew.json');
const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const T = raw.table || {};
const rows = Object.keys(T).map(function (k) { return T[k]; });
if (!rows.length) { console.log('EMPTY TABLE'); process.exit(0); }

const sample = rows[0];
const keys = Object.keys(sample);
const pick = function (cands) {
  for (let i = 0; i < cands.length; i++) if (keys.indexOf(cands[i]) >= 0) return cands[i];
  return null;
};
const K_PRE = pick(['Pre-Require', 'PreRequire', 'Pre_Require']);
const K_REQ = pick(['Require']);
const K_SPREQ = pick(['SpRequire']);
const K_TYPE = pick(['Type']);
const K_TASKID = pick(['TaskID', 'ID']);
const K_RCV = pick(['ReceiveNpc', 'ReceiveNPC']);
const K_FIN = pick(['FinishNpc', 'FinishNPC']);
const K_CHAIN = pick(['Chain']);
const K_REWARD = pick(['Reward']);

console.log('columns:', [K_TASKID, K_PRE, K_REQ, K_SPREQ, K_TYPE, K_REWARD, K_RCV, K_FIN, K_CHAIN].join(' | '));
console.log('rows:', rows.length);

/* 前置依赖：Pre-Require 列可能是 '' / '100140' / '100140,100130' / 带数量 */
function preList(r) {
  const v = String(r[K_PRE] == null ? '' : r[K_PRE]).trim();
  if (!v || v === '0') return [];
  return v.split(/[|,;]/).map(s => s.trim()).filter(s => s && s !== '0')
    .map(s => s.split(/[,:]/)[0]).filter(s => /^\d+$/.test(s));
}

const roots = rows.filter(r => preList(r).length === 0).length;
console.log('roots(no Pre-Require):', roots);

const target = String(process.argv[2] || '100150');
const me = T[target];
if (!me) { console.log('target', target, 'MISSING'); process.exit(0); }
console.log('--- target ' + target + ' ---');
console.log('  Pre-Require:', JSON.stringify(me[K_PRE]), '| Require:', JSON.stringify(me[K_REQ]),
  '| SpRequire:', JSON.stringify(me[K_SPREQ]), '| Type:', me[K_TYPE], '| Reward:', me[K_REWARD]);
console.log('  ReceiveNpc:', me[K_RCV], '| FinishNpc:', me[K_FIN], '| Chain:', me[K_CHAIN]);

const next = rows.filter(r => preList(r).indexOf(target) >= 0);
console.log('--- tasks whose Pre-Require includes ' + target + ': ' + next.length + ' ---');
next.slice(0, 12).forEach(r => {
  console.log('  ', r[K_TASKID], '| Pre=' + JSON.stringify(r[K_PRE]), '| SpRequire=' + JSON.stringify(r[K_SPREQ]),
    '| Reward=' + r[K_REWARD], '| Type=' + r[K_TYPE]);
});

/* 反向：目标自己挂在谁后面 */
console.log('--- 还有多少个任务的前置里包含已完成集合(粗算可达性) ---');
const done = new Set(['100010', '100060', '100070', '100090', '100100', '100120', '100130', '100140', '101080', '210400', '100150']);
const reachable = rows.filter(r => {
  const p = preList(r);
  return p.length === 0 || p.every(x => done.has(x));
});
console.log('  reachable from current done-set (1 层，不含递归):', reachable.length, '/', rows.length);
