// cx2b: 打印 tally + 正确行号的原始 expandContract
const fs = require('fs');
const { FileIndex, expandContract } = require('F:/BaoZouyxt/audit-work22/main-scratch/bz-oracle/forge/lib/ast-expand');
const { run } = require('F:/BaoZouyxt/audit-work22/main-scratch/bz-oracle/forge/tools/expand-handlers');
const root = 'F:/BaoZouyxt/audit-work22/cx-verify/client-src';
const idx = new FileIndex(fs.readFileSync(root + '/cx-client.js', 'utf8'), 'cx-client.js');
for (const [key, line] of [['CX1_FORIN', 4], ['CX2_BUILTIN', 9], ['CX3_HOPVAR', 14], ['CX4_INVAR', 18], ['CX5_SHAREDA', 21], ['CX5_SHAREDB', 22]]) {
  const c = { id: key, ns: 'HttpConst', key, action: 'User.' + key, sites: [{ file: 'cx-client.js', line, form: 'x', handler: '' }], fields: {}, closed: false, openReasons: [] };
  const r = expandContract(c, rel => (rel === 'cx-client.js' ? idx : null), 3);
  console.log(`[${key}] line=${line} anySite=${r.anySite} fields={${Object.keys(r.fields).join(',')}} escapes=${JSON.stringify(r.escapes.slice(0, 3))}`);
}
const res = run({ contracts: 'F:/BaoZouyxt/audit-work22/cx-verify/contracts.json', root, engine: 'ast', depth: 3 });
console.log('tally:', JSON.stringify(res.__meta.tally));
console.log('actions keys:', Object.keys(res.actions).join(', '));
