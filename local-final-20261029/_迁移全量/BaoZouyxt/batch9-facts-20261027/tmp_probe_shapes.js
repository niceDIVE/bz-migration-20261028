// 一次性探针：9 个线上名在 冻结基线 / 抓包模板 / 形状注册表 里的存在性
const fs = require('fs');
const P = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const em = P('F:/BaoZouyxt/tools/golden/emission.json');
const tpl = P('F:/BaoZouyxt/hotfix-patch/core/templates.json');
const sh = P('F:/BaoZouyxt/tools/shapes.json');
const names = ['enterPVEBattle', 'beginPVEBattle', 'enterRoguePVEBattle', 'beginRoguePVEBattle',
  'beginMultiPVEBattle', 'beginRogueMultiPVEBattle', 'startMultiPVEBattle',
  'ChallengePVP', 'ChallengeRoguePVP'];
const flat = (o, pre = '', out = new Set()) => {
  if (o && typeof o === 'object') for (const k of Object.keys(o)) { if (!pre) out.add(k); else flat(o[k], pre + '.' + k, out); }
  return out;
};
const emKeys = new Set(Object.keys(em));
const shKeys = flat(sh);
console.log('=== 逐个名字 ===');
for (const n of names) {
  const tplHit = Object.keys(tpl).filter(k => (tpl[k] && typeof tpl[k] === 'object' && tpl[k]['User.' + n]));
  console.log(n.padEnd(26),
    'emission:', emKeys.has(n) ? 'YES' : 'no ',
    '| templates[User.' + n + ']:', tplHit.length ? tplHit.join(',') : 'no ',
    '| shapes.json:', shKeys.has(n) ? 'YES' : 'no ');
}
console.log('=== 基线动作总数 ===', emKeys.size);
console.log('=== 已注册形状(顶层) 数 ===', Object.keys(sh).length);
