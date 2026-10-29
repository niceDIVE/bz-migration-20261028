// 跨版本验证：v2.2 的 23 个变异体打到 v2.1 的裁判上，验证回执"v2.1 击杀 100/121"
const v21 = 'F:/BaoZouyxt/midaudit-v21/bz-oracle';
const v22 = 'F:/BaoZouyxt/audit-work22/main-scratch/bz-oracle';
const { loadCtx, loadCases, judgeCases } = require(v21 + '/host/judge');
delete require.cache[require.resolve(v21 + '/host/judge')];
const { MUTATORS } = require(v22 + '/host/mutate.js');
const T = { tables: v21 + '/fixtures/tables', templates: v21 + '/fixtures/templates.json', rules: v21 + '/fixtures/rules.json' };
// v2.1 裁判视角：meta 豁免未受config约束、noProbeIs 默认 WARN、无契约 WARN、NO_SAVE 不存在
const ctx = loadCtx({ contracts: v21 + '/out/contracts.json', tables: T.tables, templates: T.templates, rules: T.rules }, v21);
const clean = loadCases(v21 + '/fixtures/cases');
const base = judgeCases(clean, ctx, {});
const dirty = base.perCase.filter(x => x.verdict !== 'PASS');
console.log('v2.1 裁判对干净用例：', base.verdict, dirty.length ? ('脏：' + dirty.map(d => d.id).join(',')) : '');
let applicable = 0, killed = 0;
const surv = [];
for (const mu of MUTATORS) {
  for (const c of clean) {
    let m = null;
    try { m = mu.apply(c, ctx); } catch (e) { continue; }
    if (!m) continue;
    applicable++;
    const peers = clean.filter(x => x !== c && x.scenario && x.scenario === c.scenario);
    const rep = judgeCases([m, ...peers], ctx, {});
    const fails = rep.perCase[0].findings.filter(x => x.level === 'FAIL').concat(rep.cross.filter(x => x.level === 'FAIL'));
    if (fails.length) killed++; else surv.push(mu.id + '@' + (c.id || c.__file));
  }
}
console.log('v2.2 变异库(' + MUTATORS.length + ' 个) × v2.1 裁判：applicable=' + applicable + ' killed=' + killed + '（回执声称 100/121）');
console.log('存活清单：'); surv.forEach(x => console.log('  ' + x));
