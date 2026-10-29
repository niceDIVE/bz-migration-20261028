// cx-run.js — 对 cx-client.js 跑 AST 展开器，打印每个契约的 closed/fields/escapes/notes
const fs = require('fs');
const path = require('path');
const { run } = require('F:/BaoZouyxt/midaudit-v21/audit-work/main-scratch/bz-oracle/forge/tools/expand-handlers');
const root = 'F:/BaoZouyxt/midaudit-v21/audit-work/repro';
const src = fs.readFileSync(path.join(root, 'cx-client.js'), 'utf8');
const lines = src.split('\n');
const KEYS = ['CX1_FORIN', 'CX2_BUILTIN', 'CX3_HOPVAR', 'CX4_INVAR', 'CX5_SHAREDA', 'CX5_SHAREDB'];
const C = { __meta: {}, byAction: {}, contracts: {} };
for (const key of KEYS) {
  const i = lines.findIndex(l => l.includes('HttpConst.' + key));
  C.contracts[key] = { id: key, ns: 'HttpConst', key, action: 'User.' + key, sites: [{ file: 'cx-client.js', line: i + 1, form: 'x', handler: '' }], fields: {}, closed: false, openReasons: [] };
}
const cp = path.join(root, 'cx-contracts.json');
fs.writeFileSync(cp, JSON.stringify(C));
const res = run({ contracts: cp, root, engine: 'ast', depth: 3 });
for (const [k, v] of Object.entries(res.actions)) {
  console.log(`\n[${k}] closed=${!!v.closed}  fields={${Object.keys(v.extraFields).join(', ') || '空'}}` +
    (v.closed ? `  closedBy=${v.closedBy}` : `  _open=${JSON.stringify(v._open)}`) +
    (v._notes ? `  notes=${JSON.stringify(v._notes)}` : ''));
  for (const [f, x] of Object.entries(v.extraFields)) console.log(`    ${f}: switch=${x.switch} plain=${x.plain}`);
}
