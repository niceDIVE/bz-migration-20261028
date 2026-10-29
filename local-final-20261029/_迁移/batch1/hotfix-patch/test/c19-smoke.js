'use strict';
/** c19-smoke.js —— A 轮第 1 批 C19〔技能皮肤商店〕冒烟（走真实 dispatch）。
 *  覆盖：表可见 / 7 活键 / 货架门 / 刷新扣费 / 买道具真扣+限购 / 活动商店门 / 买皮肤真扣+已拥有拒 /
 *  装皮肤（拥有校验）/ 卸皮肤 / LoadGame skillSkinData 回放 / 拒绝收窄。
 *  用法：node test/c19-smoke.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CORE = path.join(__dirname, '..', 'core');
['bz-shops.generated.js', 'bz-shapes.generated.js', 'bz-tasks.generated.js', 'bz-c09.generated.js',
  'bz-c10.generated.js', 'bz-c11.generated.js', 'bz-c12.generated.js', 'bz-c13.generated.js',
  'bz-c14.generated.js', 'bz-c15.generated.js', 'bz-c19.generated.js'].forEach((f) =>
  vm.runInThisContext(fs.readFileSync(path.join(CORE, f), 'utf8')));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

const C19 = (typeof BZ_C19 !== 'undefined') ? BZ_C19 : null;
const NOW = 1792612412000;

function fresh(extra) {
  const clock = { t: NOW };
  const st = new Map();
  const base = {
    roleID: 16374, name: 'FZhou', saveVersion: 4,
    accepted: [], done: [], rewarded: [], skills: {},
    baseValueAy: [], bag: {}, playerEquip: {}, equipments: {},
    potential: 100, coins: 1000, gold: 1000, yuanbao: 500,
    bloodArr: [], fosterArr: [], contribution: 0, school: 1,
    schoolContribution: {}, hunger: 50, mounts: {}, mountShow: 0,
    marketBuyTimes: {}, passCardLevel: 0, passLiveness: 0, passAward: {},
    growthClaim: {}, growthBigPaid: 0,
  };
  if (extra) extra(base);
  st.set(createBzServer({ readSave: () => null, writeSave: () => {}, log: () => {}, now: () => clock.t, templates: TPL })._internal.SAVE_KEY, JSON.stringify(base));
  const srv = createBzServer({ readSave: (k) => (st.has(k) ? st.get(k) : null), writeSave: (k, t) => st.set(k, t),
    log: () => {}, now: () => clock.t, templates: TPL });
  const d = (a, p) => srv.dispatch('User', a, p || {});
  const pay = (r, a) => r['User.' + a];
  srv.loadSave();
  return { srv, d, pay, clock, save: () => srv.loadSave(), stored: () => [...st.values()][0] };
}
let pass = 0; const fails = [];
function T(n, fn) { try { fn(); pass++; console.log('  ok   ' + n); } catch (e) { fails.push(n + ': ' + e.message); console.log('  FAIL ' + n + ' -> ' + e.message); } }

T('【⓪】BZ_C19 表可见（35 货架 / 39 皮肤 / 13 直售行）', () => {
  assert.ok(C19, 'BZ_C19 缺失');
  assert.strictEqual(Object.keys(C19.shop).length, 35, '货架 35 行');
  assert.strictEqual(Object.keys(C19.skins).length, 39, '皮肤 39 行');
  const act = Object.keys(C19.shop).filter((k) => C19.shop[k].type === 2);
  assert.strictEqual(act.length, 13, 'type=2 直售行 13');
});

T('【①】7 活键在 H 里', () => {
  const H = createBzServer({ readSave: () => null, writeSave: () => {}, log: () => {}, now: () => NOW, templates: TPL })._internal.handlers;
  ['getSkillSkinShop', 'refreshSkillSkinShop', 'buySkillSkinShop', 'getSkillSkinActiveShop', 'buySkillSkinActiveShop', 'equipSkillSkin', 'removeSkillSkin']
    .forEach((a) => assert.ok(typeof H[a] === 'function', '缺 ' + a));
});

T('【②】货架门：shopData.ds 22 行 + price/freeTime', () => {
  const f = fresh();
  const r = f.pay(f.d('getSkillSkinShop'), 'getSkillSkinShop');
  assert.strictEqual(r.eRet, 1, '应成功');
  const ds = r.shopData.ds;
  assert.strictEqual(Object.keys(ds).length, 22, 'type=1 货架应 22 行');
  assert.strictEqual(r.shopData.price, C19.refreshPrice, 'price 应 refreshPrice');
});

T('【③】刷新：扣 20 元宝；不足拒 2 不写档', () => {
  const f = fresh();
  const r = f.pay(f.d('refreshSkillSkinShop'), 'refreshSkillSkinShop');
  assert.strictEqual(r.eRet, 1, '应成功');
  assert.strictEqual(f.save().yuanbao, 480, '应扣 20');
  const f2 = fresh((b) => { b.yuanbao = 5; });
  const raw0 = f2.stored();
  assert.strictEqual(f2.pay(f2.d('refreshSkillSkinShop'), 'refreshSkillSkinShop').eRet, 2, '元宝不足应 2');
  assert.strictEqual(f2.stored(), raw0, '拒绝不写档');
});

T('【④】买道具：照表扣 + 入包 + 限购 1', () => {
  const f = fresh();
  const r = f.pay(f.d('buySkillSkinShop', { id: 1 }), 'buySkillSkinShop');
  assert.strictEqual(r.eRet, 1, '应成功');
  assert.strictEqual(f.save().yuanbao, 495, 'price 5 → 余 495');
  const item = C19.shop['1'].item;
  assert.strictEqual(f.save().bag[String(item)] || f.save().bag[item], 1, '道具应入包');
  assert.strictEqual(f.pay(f.d('buySkillSkinShop', { id: 1 }), 'buySkillSkinShop').eRet, 2, '重复购应 2');
  assert.strictEqual(r.shopData.ds['1'], 1, 'ds 应记已购');
});

T('【⑤】活动商店门：13 行 + endTime 常开', () => {
  const f = fresh();
  const r = f.pay(f.d('getSkillSkinActiveShop'), 'getSkillSkinActiveShop');
  assert.strictEqual(r.eRet, 1, '应成功');
  assert.strictEqual(r.shopDatas.length, 13, '活动货架 13 行');
  assert.ok(r.endTime > NOW, 'endTime 应为未来');
});

T('【⑥】买活动皮肤：照表扣 + skinData；已拥有拒 2', () => {
  const f = fresh((b) => { b.yuanbao = 5000; });
  const row = C19.shop['23'];
  const r = f.pay(f.d('buySkillSkinActiveShop', { ids: [23] }), 'buySkillSkinActiveShop');
  assert.strictEqual(r.eRet, 1, '应成功');
  assert.strictEqual(f.save().yuanbao, 5000 - row.price, '照表扣元宝');
  assert.strictEqual(f.save().skinData[String(row.item)], 1, '皮肤应入 skinData');
  assert.strictEqual(r.rewardSkillSkin[String(row.item)], 1, 'rewardSkillSkin 应回皮肤');
  assert.strictEqual(f.pay(f.d('buySkillSkinActiveShop', { ids: [23] }), 'buySkillSkinActiveShop').eRet, 2, '已拥有应 2');
  const f2 = fresh();
  assert.strictEqual(f2.pay(f2.d('buySkillSkinActiveShop', { ids: [23] }), 'buySkillSkinActiveShop').eRet, 2, '元宝不足应 2');
});

T('【⑦】装/卸皮肤：拥有校验 + 映射', () => {
  const f = fresh((b) => { b.yuanbao = 5000; });
  const row = C19.shop['23'];
  f.pay(f.d('buySkillSkinActiveShop', { ids: [23] }), 'buySkillSkinActiveShop');
  const skill = C19.skins[String(row.item)].skill;
  const e = f.pay(f.d('equipSkillSkin', { skillId: skill, id: row.item }), 'equipSkillSkin');
  assert.strictEqual(e.eRet, 1, '应成功');
  assert.strictEqual(f.save().skinWeap[String(skill)], row.item, 'weapToSkinData 应落档');
  const rm = f.pay(f.d('removeSkillSkin', { skillId: skill }), 'removeSkillSkin');
  assert.strictEqual(rm.eRet, 1, '卸下应成功');
  assert.ok(!f.save().skinWeap[String(skill)], '映射应删除');
  const bad = fresh();
  assert.strictEqual(bad.pay(bad.d('equipSkillSkin', { skillId: 1, id: 2 }), 'equipSkillSkin').eRet, 2, '未拥有应 2');
});

T('【⑧】LoadGame 回放 skillSkinData', () => {
  const f = fresh((b) => { b.skinData = { 17: 1 }; b.skinWeap = { 1264: 17 }; });
  const r = f.pay(f.d('LoadGame'), 'LoadGame');
  assert.ok(r.skillSkinData, 'LoadGame 应带 skillSkinData');
  assert.strictEqual(r.skillSkinData.skinData['17'], 1, 'skinData 应回放');
  assert.strictEqual(r.skillSkinData.weapToSkinData['1264'], 17, 'weapToSkinData 应回放');
});

T('【⑨】拒绝应答收窄：只 eRet', () => {
  const f = fresh((b) => { b.yuanbao = 0; });
  const r = f.pay(f.d('buySkillSkinShop', { id: 1 }), 'buySkillSkinShop');
  assert.deepStrictEqual(Object.keys(r).sort(), ['eRet'], '拒绝只许 eRet');
});

console.log('');
if (fails.length) { console.log('c19-smoke: FAIL ' + fails.length + ' 条'); fails.forEach((x) => console.log('  - ' + x)); process.exit(1); }
console.log('c19-smoke: 全部通过（' + pass + ' 条）');
