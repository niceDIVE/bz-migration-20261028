// 调试：v2.2 expandContract 对 v2.1 cx-client.js 的行为
const fs = require('fs');
const { FileIndex, expandContract } = require('F:/BaoZouyxt/audit-work22/main-scratch/bz-oracle/forge/lib/ast-expand');
const root = 'F:/BaoZouyxt/audit-work22/cx-verify/client-src';
const code = fs.readFileSync(root + '/cx-client.js', 'utf8');
const idx = new FileIndex(code, 'cx-client.js');
console.log('onCalls lines:', [...idx.onCalls.keys()]);
const c = { id: 'CX1_FORIN', ns: 'HttpConst', key: 'CX1_FORIN', action: 'User.CX1_FORIN', sites: [{ file: 'cx-client.js', line: 5, form: 'x', handler: '' }], fields: {}, closed: false, openReasons: [] };
const r = expandContract(c, rel => (rel === 'cx-client.js' ? idx : null), 3);
console.log('CX1 expand: anySite=', r.anySite, 'fields=', Object.keys(r.fields), 'escapes=', r.escapes, 'notes=', r.notes);
const c3 = { id: 'CX3_HOPVAR', ns: 'HttpConst', key: 'CX3_HOPVAR', action: 'User.CX3_HOPVAR', sites: [{ file: 'cx-client.js', line: 16, form: 'x', handler: '' }], fields: {}, closed: false, openReasons: [] };
const r3 = expandContract(c3, rel => (rel === 'cx-client.js' ? idx : null), 3);
console.log('CX3 expand: anySite=', r3.anySite, 'fields=', Object.keys(r3.fields), 'escapes=', r3.escapes);
