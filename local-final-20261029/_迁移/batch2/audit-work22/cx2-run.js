// cx2-run.js — 用 v2.1 审计的原始 cx-client.js 打 v2.2 展开器 + 新增子字段 for-in 反例（第 7 例）
const fs = require('fs');
const path = require('path');
const { run } = require('F:/BaoZouyxt/audit-work22/main-scratch/bz-oracle/forge/tools/expand-handlers');
const root = 'F:/BaoZouyxt/audit-work22/cx-verify';
fs.mkdirSync(root + '/client-src', { recursive: true });
// 原始 6 反例（v2.1 审计文件原样拷入）
fs.copyFileSync('F:/BaoZouyxt/midaudit-v21/audit-work/repro/cx-client.js', root + '/client-src/cx-client.js');
// 第 7 例：子字段 for-in（回执声称：字段已知、只是值是字典 → 仍允许闭合）
fs.writeFileSync(root + '/client-src/subforin.js', `// 子字段 for-in 反例（ES5）
var t = function () {};
t.prototype.onLoad = function () {
  f.MessageCenter.on(a.HttpConst.SUBFORIN, function (e, o) {
    var n = 0;
    for (var k in o.rewardObj) { n += o.rewardObj[k]; }   // 子字段 for-in：rewardObj 内任意键被消费
    this.total = n;
  }, this);
};
window.T = t;
`);
function contractsFor(file, keys) {
  const lines = fs.readFileSync(root + '/client-src/' + file, 'utf8').split('\n');
  const C = { __meta: {}, byAction: {}, contracts: {} };
  for (const key of keys) {
    const i = lines.findIndex(l => l.includes('HttpConst.' + key));
    C.contracts[key] = { id: key, ns: 'HttpConst', key, action: 'User.' + key, sites: [{ file, line: i + 1, form: 'x', handler: '' }], fields: {}, closed: false, openReasons: [] };
  }
  return C;
}
const cp = root + '/contracts.json';
fs.writeFileSync(cp, JSON.stringify({
  ...contractsFor('cx-client.js', ['CX1_FORIN', 'CX2_BUILTIN', 'CX3_HOPVAR', 'CX4_INVAR', 'CX5_SHAREDA', 'CX5_SHAREDB']),
  ...contractsFor('subforin.js', ['SUBFORIN']),
}));
const res = run({ contracts: cp, root: root + '/client-src', engine: 'ast', depth: 3 });
for (const [k, v] of Object.entries(res.actions)) {
  console.log(`[${k}] closed=${!!v.closed} fields={${Object.keys(v.extraFields).join(', ') || '空'}}${v.closed ? '' : '  _open=' + JSON.stringify(v._open)}${v._notes ? ' notes=' + JSON.stringify(v._notes) : ''}`);
  for (const [f, x] of Object.entries(v.extraFields)) console.log(`    ${f}: switch=${x.switch} truthy=${!!x.truthy} plain=${x.plain}`);
}
