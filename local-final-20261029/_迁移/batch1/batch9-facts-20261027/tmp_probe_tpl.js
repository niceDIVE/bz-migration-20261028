// 一次性探针：查 templates.json 的 create 里有没有战斗实体需要的键
const fs = require('fs');
const tpl = JSON.parse(fs.readFileSync('F:/BaoZouyxt/hotfix-patch/core/templates.json', 'utf8'));
const c = tpl.create || {};
const want = ['WeapToSkill', 'equipments', 'equips', 'skillMap', 'skillTypeEquipped', 'gemData',
  'itemSkill', 'veinObj', 'equipTitle', 'titivateObj', 'mpTrained', 'totalGameTime',
  'happinessNum', 'baseValueAy', 'roleID', 'addAtt', 'buffArr', 'buffs', 'aiSetData',
  'weapToSkinData', 'fashionEffect', 'degreeLv', 'power', 'youngTimes', 'skillGraspData'];
console.log('--- templates.json create ---');
for (const k of want) console.log((Object.prototype.hasOwnProperty.call(c, k) ? 'YES ' : 'no  ') + k + (c[k] !== undefined ? '  = ' + JSON.stringify(c[k]).slice(0, 120) : ''));
console.log('--- create 顶层键数 ---', Object.keys(c).length);
console.log('--- 全部键 ---');
console.log(Object.keys(c).sort().join(', '));
const r = tpl.reqSelfBattleInfo || {};
console.log('--- reqSelfBattleInfo 顶层键 ---', Object.keys(r).join(', '));
const inner = r['User.ReqSelfBattleInfo'] || {};
console.log('--- 其内层键 ---', Object.keys(inner).join(', '));
