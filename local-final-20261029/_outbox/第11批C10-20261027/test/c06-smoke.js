'use strict';
/** c06-smoke.js —— 第 7 批 C06〔打坐练功〕冒烟（11 个新 handler；4 个已有的不在本文件）。
 *
 *  口径：END_* 请求不带时长 → 只回成功不结算；END 三回调无 eRet 判断，字段按消费端形状给齐
 *  （EndMeditation 必须带 note——138892 o.note.hasOwnProperty 无守护）；vigor 恒 0。
 *  取证：batch6-facts-20261026/scoutD-c06-reqkeys.md。
 *  用法：node test/c06-smoke.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CORE = path.join(__dirname, '..', 'core');
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-shops.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

function fresh() {
  const st = new Map();
  st.set(createBzServer({ readSave: () => null, writeSave: () => {}, log: () => {}, now: () => 1792612412000, templates: TPL })._internal.SAVE_KEY,
    JSON.stringify({ roleID: 16374, name: 'FZhou', saveVersion: 4, accepted: [], done: [], rewarded: [], skills: {}, baseValueAy: [], bag: {}, playerEquip: {}, equipments: {}, potential: 100, coins: 1000, gold: 1000, yuanbao: 500, bloodArr: [], fosterArr: [], contribution: 0, school: 1, schoolContribution: {}, hunger: 50, mounts: {}, mountShow: 0, marketBuyTimes: {}, passCardLevel: 0, passLiveness: 0, passAward: {}, growthClaim: {}, growthBigPaid: 0 }));
  const srv = createBzServer({
    readSave: (k) => (st.has(k) ? st.get(k) : null),
    writeSave: (k, t) => st.set(k, t),
    log: () => {}, now: () => 1792612412000, templates: TPL,
  });
  const d = (a, p) => srv.dispatch('User', a, p || {});
  const pay = (r, a) => r['User.' + a];
  srv.loadSave();
  return { srv, d, pay, save: () => srv.loadSave(), snap: () => JSON.stringify(srv.loadSave()) };
}

let pass = 0; const fails = [];
function T(n, fn) { try { fn(); pass++; console.log('  ok   ' + n); } catch (e) { fails.push(n + ': ' + e.message); console.log('  FAIL ' + n + ' -> ' + e.message); } }

const SHIPPED = ['EndTraining', 'EndMeditation', 'EndRecoverMP', 'getVigor', 'useVigorMeditation', 'useVigorUpGradeSkill', 'BeginRecoverMP', 'changePlayWooksState', 'setOnHookWookState', 'Implantation', 'removeMartial'];

T('【§5.1 原故障重现】11 个线上名都在 H 里（这批没有"注册名"形态，全部按线上名直查）', () => {
  const f = fresh();
  const H = f.srv._internal.handlers;
  const missing = SHIPPED.filter((w) => typeof H[w] !== 'function');
  assert.deepStrictEqual(missing, [], '缺 ' + missing.join(','));
});

T('三个 END_*：eRet 1 + genguTime/hanyusuiTime 0；EndMeditation 必须带 note.attrch（138892 无守护）', () => {
  const f = fresh();
  const r1 = f.pay(f.d('EndTraining', { hglmt: 600, speed: 1, auto: 0 }), 'EndTraining');
  assert.strictEqual(r1.eRet, 1);
  assert.strictEqual(r1.genguTime, 0); assert.strictEqual(r1.hanyusuiTime, 0);
  const r2 = f.pay(f.d('EndMeditation', { skillID: 0, hglmt: 600, speed: 1 }), 'EndMeditation');
  assert.strictEqual(r2.eRet, 1);
  assert.ok(r2.note && typeof r2.note.hasOwnProperty === 'function', 'note 必须存在（138892 无守护直读）');
  assert.ok(r2.note.attrch && typeof r2.note.attrch.hasOwnProperty === 'function', 'note.attrch 必须存在');
  assert.strictEqual(r2.note.attrch.mpTrained, undefined, '不结算：无 mpTrained');
  const r3 = f.pay(f.d('EndRecoverMP', { curMp: 100, mplmt: 200, bTime: 0, flag: 0 }), 'EndRecoverMP');
  assert.strictEqual(r3.eRet, 1);
  assert.strictEqual(r3.hanyusuiTime, 0);
});

T('体力三件套：getVigor/useVigorMeditation vigor 恒 0；useVigorUpGradeSkill 回声 skillID', () => {
  const f = fresh();
  assert.strictEqual(f.pay(f.d('getVigor', {}), 'getVigor').vigor, 0, 'vigor 无存档槽 → 诚实 0');
  assert.strictEqual(f.pay(f.d('useVigorMeditation', { skillID: 1, maxMp: 100, speed: 1, flag: 0 }), 'useVigorMeditation').vigor, 0);
  const r = f.pay(f.d('useVigorUpGradeSkill', { skillID: 7, flag: 0 }), 'useVigorUpGradeSkill');
  assert.strictEqual(r.vigor, 0);
  assert.strictEqual(r.skillID, 7, 'skillID 必须回声（120604 getSkillLevel 拼文案）');
});

T('BeginRecoverMP：serverTime = 请求时刻（回蓝计时基座）', () => {
  const f = fresh();
  const r = f.pay(f.d('BeginRecoverMP', {}), 'BeginRecoverMP');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(r.serverTime, 1792612412000, '固定时钟下 serverTime = now()');
});

T('薄 ack 四件：changePlayWooksState / setOnHookWookState / Implantation / removeMartial → 1', () => {
  const f = fresh();
  for (const [act, p] of [['changePlayWooksState', {}], ['setOnHookWookState', {}], ['Implantation', { MartialID: 3 }, ], ['removeMartial', { MartialID: 3 }]]) {
    assert.strictEqual(f.pay(f.d(act, p), act).eRet, 1, act + ' 应回 1');
  }
});

T('全批无发钱口：11 个动作跑完，存档逐字节不动', () => {
  const f = fresh();
  const before = f.snap();
  for (const act of SHIPPED) f.pay(f.d(act, act === 'useVigorUpGradeSkill' ? { skillID: 7, flag: 0 } : {}), act);
  assert.strictEqual(f.snap(), before, '不结算批：存档一个字节不动（coins/exp/potential 全不变）');
  assert.strictEqual(f.save().coins, 1000);
  assert.strictEqual(f.save().exp, undefined);
});

T('【拍板·accept3】打坐计时：Begin 记账；固定时钟下 0 分钟不结算但记录清掉', () => {
  const f = fresh();
  assert.strictEqual(f.pay(f.d('BeginMeditation', { curMp: 100, maxMp: 200, hg: 50, gTime: 0, hgtimes: 0, flag: 0 }), 'BeginMeditation').eRet, 1);
  const rec = f.save().medBegin;
  assert.strictEqual(rec.t, 1792612412000, 'Begin 记账 t=now');
  const r = f.pay(f.d('EndMeditation', { skillID: 0, hglmt: 600, speed: 1 }), 'EndMeditation');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(r.note.attrch.mpTrained, undefined, '0 分钟 → 不结算');
  assert.strictEqual(f.save().medBegin, undefined, '记录已清（一次 Begin 只结一次）');
  assert.strictEqual(f.save().baseValueAy[32], undefined, '未结算不建修为槽');
});

T('【拍板·accept3】90 分钟 elapsed → 修为 +90 进 baseValueAy[32] + note.attrch 回新值', () => {
  const f = fresh();
  f.pay(f.d('BeginMeditation', { curMp: 100, maxMp: 200, hg: 50, gTime: 0, hgtimes: 0, flag: 0 }), 'BeginMeditation');
  const s = f.save();
  s.medBegin.t = 1792612412000 - 90 * 60000;   // 90 分钟前开始
  const r = f.pay(f.d('EndMeditation', { skillID: 0, hglmt: 600, speed: 1 }), 'EndMeditation');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(r.note.attrch.mpTrained, 90, '1 点/分钟 × 90');
  assert.strictEqual(f.save().baseValueAy[32], 90, '持久槽 = baseValueAy[32]（客户端 111789 同源）');
  assert.strictEqual(f.save().medBegin, undefined, '结算即清');
});

T('【拍板·accept3】gTime 上限：90 分钟 elapsed 但 gTime=30 秒 → 封顶 0 分钟不结算', () => {
  const f = fresh();
  f.pay(f.d('BeginMeditation', { curMp: 100, maxMp: 200, hg: 50, gTime: 30, hgtimes: 0, flag: 0 }), 'BeginMeditation');
  const s = f.save();
  s.medBegin.t = 1792612412000 - 90 * 60000;
  const r = f.pay(f.d('EndMeditation', { skillID: 0, hglmt: 600, speed: 1 }), 'EndMeditation');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(r.note.attrch.mpTrained, undefined, 'cap 30s < 1 分钟 → 0 修为');
  assert.strictEqual(f.save().baseValueAy[32], undefined, '未结算不建修为槽');
});

T('【拍板·accept3】无 Begin 记录直接 End → 不结算、存档不动', () => {
  const f = fresh();
  const before = f.snap();
  const r = f.pay(f.d('EndMeditation', { skillID: 0, hglmt: 600, speed: 1 }), 'EndMeditation');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(r.note.attrch.mpTrained, undefined);
  assert.strictEqual(f.snap(), before, '无记录不结算不写盘');
});

console.log('\n[c06-smoke] 通过 ' + pass + '/' + (pass + fails.length));
if (fails.length) { console.error('失败项:\n' + fails.map((f) => ' - ' + f).join('\n')); process.exit(1); }
console.log('C06 SMOKE PASSED');
