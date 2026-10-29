// v2.2 step18 复现（对应 selftest.sh 60-68 行）
const { loadCtx, loadCases, judgeCases } = require('F:/BaoZouyxt/audit-work22/main-scratch/bz-oracle/host/judge');
const T = { tables: 'F:/BaoZouyxt/audit-work22/main-scratch/bz-oracle/fixtures/tables', templates: 'F:/BaoZouyxt/audit-work22/main-scratch/bz-oracle/fixtures/templates.json', rules: 'F:/BaoZouyxt/audit-work22/main-scratch/bz-oracle/fixtures/rules.json' };
const ctx = loadCtx(T, 'F:/BaoZouyxt/audit-work22/main-scratch/bz-oracle');
const cs = loadCases('F:/BaoZouyxt/audit-work22/main-scratch/bz-oracle/fixtures/audit-neg');
const want = {
  'audit.fp1.no-contract': 'FAIL L1.NO_CONTRACT',
  'audit.fp2a.abolish': 'FAIL L1.SKCH_LV0',
  'audit.fp2b.fullreload': 'FAIL L1.NOTE_MISSING_IVCH',
  'audit.fp2c.l4allow': 'FAIL L4.DIFF',
  'audit.fp3.probe-none': 'FAIL L0.NO_PROBE',
  'audit.fp4.no-save': 'FAIL L1.NO_SAVE',
};
const r = judgeCases(cs, ctx, { requireSave: true });
const bad = [];
for (const c of r.perCase) {
  const codes = c.findings.map(x => x.level + ' ' + x.code);
  if (c.verdict !== 'FAIL' || !codes.includes(want[c.id])) bad.push(c.id + ' → ' + c.verdict + ' ' + codes.join(','));
}
const r2 = judgeCases(cs.filter(c => c.id === 'audit.fp4.no-save'), ctx, {});
if (!r2.perCase[0].findings.some(x => x.code === 'L1.NO_SAVE' && x.level === 'WARN') || r2.summary.noSaveCases !== 1) bad.push('fp4 不带 --require-save 时没有单列');
const ok = judgeCases(loadCases('F:/BaoZouyxt/audit-work22/main-scratch/bz-oracle/fixtures/cases'), ctx, {});
if (ok.verdict !== 'PASS') bad.push('干净用例被误杀');
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
console.log('PASS（' + cs.length + ' 个审计反例全部 FAIL 且原因对；干净用例仍 PASS；fullReload 由 config.metaEscapes 授予）');
