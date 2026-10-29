const fs = require('fs');
const P = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const em = P('F:/BaoZouyxt/tools/golden/emission.json');
const sh = P('F:/BaoZouyxt/tools/shapes.json');
const tpl = P('F:/BaoZouyxt/hotfix-patch/core/templates.json');
console.log('emission 顶层键:', Object.keys(em).join(', '));
for (const k of Object.keys(em)) {
  const v = em[k];
  console.log('  ', k, '→', v && typeof v === 'object' ? '对象, 键数=' + Object.keys(v).length : typeof v);
}
console.log('shapes 顶层键:', Object.keys(sh).join(', '));
for (const k of Object.keys(sh)) {
  const v = sh[k];
  console.log('  ', k, '→', v && typeof v === 'object' ? '对象, 键数=' + Object.keys(v).length : typeof v);
}
const names = ['enterPVEBattle', 'beginPVEBattle', 'enterRoguePVEBattle', 'beginRoguePVEBattle',
  'beginMultiPVEBattle', 'beginRogueMultiPVEBattle', 'startMultiPVEBattle',
  'ChallengePVP', 'ChallengeRoguePVP'];
const bucket = em.actions || em.shapes || em.byAction || {};
console.log('=== emission 内层查找 ===');
for (const n of names) console.log(n.padEnd(26), Object.prototype.hasOwnProperty.call(bucket, n) ? 'YES ' + JSON.stringify(bucket[n]) : 'no');
console.log('=== templates 反查（任意 Template 键含该动作名） ===');
const tkeys = Object.keys(tpl);
for (const n of names) {
  const hits = tkeys.filter(k => (tpl[k] && typeof tpl[k] === 'object') && tpl[k]['User.' + n]);
  console.log(n.padEnd(26), hits.length ? hits.join(',') : 'no');
}
