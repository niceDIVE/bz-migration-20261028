'use strict';
/** c12-smoke.js —— 第 13 批 C12〔管家/帮手〕冒烟（走真实 dispatch，档 A）。
 *
 *  覆盖：
 *   ① 10 个线上名都在 H 里（7 名单 + getHousekeeper/setTemplateData/receiveNotice 并入）。
 *   ② BZ_C12 表可见（8 管家，价 0/0/500/1000/99999999×3/2000；口径 300元宝/30天/30分钟）。
 *   ③ getHousekeeper 面板开关：eRet 1、housekeeper 22 字段齐、dueTime=null（新档）、curTime 毫秒。
 *   ④ buyHelper：元宝不足 → 4 档不动；给足 → 扣 500 + helperIdArr=[3]；再买 → 幂等 1 不重复扣。
 *   ⑤ setHelper：未拥有 → 2；拥有/免费 → 1 且 helperId 落档。
 *   ⑥ callHelperId：未拥有 → 2；拥有 → 1 且 e=3（客户端 followId 裸读字段）。
 *   ⑦ getHelperCallList：callData 8 项，当前跟随=3 其余=1。
 *   ⑧ dispatch：成功落档（dispatchEndTime=now+30min、mapId、note.eco.yuanbao 必带——23125 裸读）；派遣中再派 → 5。
 *   ⑨ dispatchAward：未到时间 → 3；推钟 31 分钟 → 1 + 照表奖励（helper 3 → 9400×1）+ 派遣态清空；再领 → 3。
 *   ⑩ buyMonthlyFee：type 非法 → 2；成功 → dueTime=now+30d 扣 300；已开通再买 → 2。
 *   ⑪ setTemplateData：autoTime=-1 → 2；合法 → 1 + templateInitTime。
 *   ⑫ receiveNotice：恒 1 + eventType 字段必带（23198 裸读）。
 *   ⑬ 拒绝应答收窄：REJECT_ALLOW=[] → 拒绝应答只有 eRet。
 *
 *  取证：batch13-facts-20261027\C12-c12-取证与策略.md。
 *  用法：node test/c12-smoke.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CORE = path.join(__dirname, '..', 'core');
['bz-shops.generated.js', 'bz-shapes.generated.js', 'bz-tasks.generated.js', 'bz-c09.generated.js',
  'bz-c10.generated.js', 'bz-c11.generated.js', 'bz-c12.generated.js'].forEach((f) =>
  vm.runInThisContext(fs.readFileSync(path.join(CORE, f), 'utf8')));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

const C12 = (typeof BZ_C12 !== 'undefined') ? BZ_C12 : null;
const NOW = 1792612412000;
const MIN = 60000;
const DAY = 86400000;

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
  st.set(createBzServer({ readSave: () => null, writeSave: () => {}, log: () => {}, now: () => clock.t, templates: TPL })._internal.SAVE_KEY,
    JSON.stringify(base));
  const srv = createBzServer({
    readSave: (k) => (st.has(k) ? st.get(k) : null),
    writeSave: (k, t) => st.set(k, t),
    log: () => {}, now: () => clock.t, templates: TPL,
  });
  const d = (a, p) => srv.dispatch('User', a, p || {});
  const pay = (r, a) => r['User.' + a];
  srv.loadSave();
  return { srv, d, pay, clock, save: () => srv.loadSave(), snap: () => JSON.stringify(srv.loadSave()) };
}

let pass = 0; const fails = [];
function T(n, fn) { try { fn(); pass++; console.log('  ok   ' + n); } catch (e) { fails.push(n + ': ' + e.message); console.log('  FAIL ' + n + ' -> ' + e.message); } }

const IMPL = ['getHousekeeper', 'buyHelper', 'setHelper', 'callHelperId', 'getHelperCallList',
  'dispatch', 'dispatchAward', 'buyMonthlyFee', 'setTemplateData', 'receiveNotice'];

T('【⓪】C12 表在产物里可见（8 管家 / 口径 300元宝·30天·30分钟）', () => {
  assert.ok(C12 && C12.helper, 'BZ_C12 取不到（生成器没接进 test？）');
  assert.strictEqual(Object.keys(C12.helper).length, 8, '管家应 8 行');
  assert.strictEqual(C12.helper['3'].price, 500, '3 号应 500 元宝');
  assert.strictEqual(C12.vipPrice, 300, '拍板②：月卡 300 元宝');
  assert.strictEqual(C12.vipDays, 30, '拍板②：月卡 30 天');
  assert.strictEqual(C12.dispatchMinutes, 30, '拍板③：派遣 30 分钟');
});

T('【①】10 个线上名都在 H 里', () => {
  const H = createBzServer({ readSave: () => null, writeSave: () => {}, log: () => {}, now: () => NOW, templates: TPL })._internal.handlers;
  for (const a of IMPL) assert.ok(typeof H[a] === 'function', '缺 handler: ' + a);
});

T('【②】getHousekeeper：housekeeper 22 字段齐 + dueTime=null + curTime 毫秒', () => {
  const f = fresh();
  const r = f.pay(f.d('getHousekeeper'), 'getHousekeeper');
  assert.strictEqual(r.eRet, 1, '应成功');
  const P = r.housekeeper;
  for (const k of ['helperId', 'dueTime', 'task', 'taskArr', 'noticeArr', 'noticeIndex', 'dispatchTime', 'dispatchEndTime',
    'autoTime', 'evaluateType', 'type', 'taskRtm', 'noticeRtm', 'taskNum', 'mapId', 'templateInitTime', 'templateTask',
    'matureArr', 'helperIdArr', 'helperRewardArr', 'e', 'tgd', 'curTime', 'canNoticeNum']) {
    assert.ok(k in P, '缺字段 housekeeper.' + k);
  }
  assert.strictEqual(P.helperId, 1, '新档默认 1 号管家');
  assert.strictEqual(P.dueTime, null, '新档无月卡（create 模板 null）');
  assert.ok(Array.isArray(P.helperIdArr) && P.helperIdArr.length === 0, '新档未购任何付费管家');
  assert.strictEqual(P.curTime, NOW, 'curTime 应为服务器毫秒时间');
  assert.strictEqual(f.save().housekeeper.helperId, 1, '存档应落 housekeeper');
});

T('【③】buyHelper：不足 → 4 档不动；给足 → 扣 500 + 入 helperIdArr；再买 → 幂等', () => {
  const f1 = fresh((b) => { b.yuanbao = 100; });
  const snap1 = f1.snap();
  assert.strictEqual(f1.pay(f1.d('buyHelper', { helperId: 3 }), 'buyHelper').eRet, 4, '不足应 4');
  assert.strictEqual(f1.snap(), snap1, '拒绝不许写档');
  const f = fresh();
  const r = f.pay(f.d('buyHelper', { helperId: 3 }), 'buyHelper');
  assert.strictEqual(r.eRet, 1, '应成功');
  assert.deepStrictEqual(f.save().housekeeper.helperIdArr, [3], '应入 helperIdArr');
  assert.strictEqual(f.save().yuanbao, 0, '500 元宝买 3 号应扣光');
  assert.strictEqual(r.note.eco.yuanbao, 0, 'note.eco.yuanbao 应回显');
  const yBefore = f.save().yuanbao;
  assert.strictEqual(f.pay(f.d('buyHelper', { helperId: 3 }), 'buyHelper').eRet, 1, '重复买应幂等 1');
  assert.strictEqual(f.save().yuanbao, yBefore, '幂等不许再扣');
});

T('【④】setHelper：未拥有 → 2；拥有 → 1 落档；免费 1 号 → 1', () => {
  const f = fresh();
  assert.strictEqual(f.pay(f.d('setHelper', { helperId: 8 }), 'setHelper').eRet, 2, '未拥有应 2');
  f.pay(f.d('buyHelper', { helperId: 3 }), 'buyHelper');
  assert.strictEqual(f.pay(f.d('setHelper', { helperId: 3 }), 'setHelper').eRet, 1, '拥有应 1');
  assert.strictEqual(f.save().housekeeper.helperId, 3, 'helperId 应落档');
  assert.strictEqual(f.pay(f.d('setHelper', { helperId: 1 }), 'setHelper').eRet, 1, '免费 1 号应可直接设');
  assert.strictEqual(f.save().housekeeper.helperId, 1, '应切回 1 号');
});

T('【⑤】callHelperId：未拥有 → 2；拥有 → 1 且 e=3（followId 裸读字段）', () => {
  const f = fresh();
  assert.strictEqual(f.pay(f.d('callHelperId', { helperId: 4 }), 'callHelperId').eRet, 2, '未拥有应 2');
  f.pay(f.d('buyHelper', { helperId: 3 }), 'buyHelper');
  const r = f.pay(f.d('callHelperId', { helperId: 3 }), 'callHelperId');
  assert.strictEqual(r.eRet, 1, '拥有应 1');
  assert.strictEqual(f.save().housekeeper.e, 3, 'e 应落档（23237 客户端读 housekeeper.e）');
});

T('【⑥】getHelperCallList：callData 8 项、跟随者=3 其余=1', () => {
  const f = fresh();
  const r = f.pay(f.d('getHelperCallList'), 'getHelperCallList');
  assert.strictEqual(r.eRet, 1, '应成功');
  const cd = r.callData;
  assert.strictEqual(Object.keys(cd).length, 8, '应 8 项');
  assert.strictEqual(cd['1'], 1, '非跟随应 1');
  f.pay(f.d('setHelper', { helperId: 2 }), 'setHelper');
  const r2 = f.pay(f.d('getHelperCallList'), 'getHelperCallList');
  assert.strictEqual(r2.callData['2'], 3, '当前跟随应 3');
  assert.strictEqual(r2.callData['1'], 1, '其余应 1');
});

T('【⑦】dispatch：落档 30 分钟 + note.eco.yuanbao 必带；派遣中再派 → 5；★非法 mapId → 2（真机每帧崩教训）', () => {
  const f = fresh();
  const snap0 = f.snap();
  assert.strictEqual(f.pay(f.d('dispatch', { taskArr: [[5, 1]], mapId: 1008 }), 'dispatch').eRet, 2, 'mapId 不在管家场景（1008 ∉ locate）应 2');
  assert.strictEqual(f.snap(), snap0, '拒绝不许写档');
  const r = f.pay(f.d('dispatch', { taskArr: [[5, 1]], mapId: 1120 }), 'dispatch');
  assert.strictEqual(r.eRet, 1, '应成功');
  const P = f.save().housekeeper;
  assert.strictEqual(P.dispatchTime, NOW, 'dispatchTime 应落档');
  assert.strictEqual(P.dispatchEndTime, NOW + 30 * MIN, 'dispatchEndTime 应为 now+30min');
  assert.strictEqual(P.mapId, 1120, 'mapId 应落档');
  assert.deepStrictEqual(P.taskArr, [[5, 1]], 'taskArr 应落档');
  assert.ok(r.note && r.note.eco && typeof r.note.eco.yuanbao === 'number', '★note.eco.yuanbao 必带（23125 三连裸读）');
  const snapL = f.snap();
  assert.strictEqual(f.pay(f.d('dispatch', { taskArr: [], mapId: 1120 }), 'dispatch').eRet, 5, '派遣中再派应 5（6000372）');
  assert.strictEqual(f.snap(), snapL, '拒绝不许写档');
});

T('【⑧】dispatchAward：未到 → 3；推钟 31 分钟 → 1 + 照表奖励 + 清派遣态；再领 → 3', () => {
  const f = fresh();
  f.pay(f.d('buyHelper', { helperId: 3 }), 'buyHelper');
  f.pay(f.d('setHelper', { helperId: 3 }), 'setHelper');
  f.pay(f.d('dispatch', { taskArr: [[5, 1]], mapId: 1120 }), 'dispatch');
  assert.strictEqual(f.pay(f.d('dispatchAward'), 'dispatchAward').eRet, 3, '未到时间应 3（1530）');
  f.clock.t += 31 * MIN;
  const r = f.pay(f.d('dispatchAward'), 'dispatchAward');
  assert.strictEqual(r.eRet, 1, '到时应成功');
  assert.strictEqual(r.rewardArray['9400'], 1, '3 号管家 reward 照表 = 9400×1');
  assert.strictEqual(r.addEvil, 0, 'addEvil 字段应带（23145 裸读）');
  const P = f.save().housekeeper;
  assert.strictEqual(P.dispatchEndTime, null, '领完应清派遣态');
  assert.deepStrictEqual(P.taskArr, [], 'taskArr 应清空');
  assert.strictEqual(f.pay(f.d('dispatchAward'), 'dispatchAward').eRet, 3, '再领应 3（防重）');
});

T('【⑨】buyMonthlyFee：type 非法 → 2；成功 → dueTime=now+30d 扣 300；已开通再买 → 2', () => {
  const f1 = fresh((b) => { b.yuanbao = 100; });
  const snap1 = f1.snap();
  assert.strictEqual(f1.pay(f1.d('buyMonthlyFee', { type: 1 }), 'buyMonthlyFee').eRet, 4, '不足应 4（8845）');
  assert.strictEqual(f1.snap(), snap1, '拒绝不许写档');
  const f = fresh();
  assert.strictEqual(f.pay(f.d('buyMonthlyFee', { type: 9 }), 'buyMonthlyFee').eRet, 2, 'type 非法应 2');
  const r = f.pay(f.d('buyMonthlyFee', { type: 1 }), 'buyMonthlyFee');
  assert.strictEqual(r.eRet, 1, '应成功');
  assert.strictEqual(f.save().housekeeper.dueTime, NOW + 30 * DAY, 'dueTime 应为 now+30d 毫秒');
  assert.strictEqual(f.save().yuanbao, 200, '应扣 300');
  assert.strictEqual(f.pay(f.d('buyMonthlyFee', { type: 1 }), 'buyMonthlyFee').eRet, 2, '已开通再买应 2（6000402）');
});

T('【⑩】setTemplateData：autoTime=-1 → 2；合法 → 1 落档', () => {
  const f = fresh();
  assert.strictEqual(f.pay(f.d('setTemplateData', { template: [], autoTime: -1, mapId: 1120 }), 'setTemplateData').eRet, 2, 'autoTime=-1 应 2');
  const r = f.pay(f.d('setTemplateData', { template: [[5, 1]], autoTime: 3600, mapId: 1120 }), 'setTemplateData');
  assert.strictEqual(r.eRet, 1, '应成功');
  const P = f.save().housekeeper;
  assert.strictEqual(P.autoTime, 3600, 'autoTime 应落档');
  assert.strictEqual(P.templateInitTime, NOW, 'templateInitTime 应落档');
  assert.deepStrictEqual(P.template, [[5, 1]], 'template 应落档');
});

T('【⑪】receiveNotice：恒 1 + eventType 必带（23198 裸读）', () => {
  const f = fresh();
  const r = f.pay(f.d('receiveNotice', { index: 0 }), 'receiveNotice');
  assert.strictEqual(r.eRet, 1, '应 no-op 成功');
  assert.ok('eventType' in r, 'eventType 字段必带');
  assert.strictEqual(r.eventType, 0, '档 A 无通知 → eventType 0');
});

T('【⑫】拒绝应答收窄：REJECT_ALLOW=[] → 拒绝应答只有 eRet', () => {
  const f = fresh();
  const r1 = f.pay(f.d('buyHelper', { helperId: 999 }), 'buyHelper');
  assert.deepStrictEqual(Object.keys(r1).sort(), ['eRet'], '买管家拒绝应答只许 eRet');
  const r2 = f.pay(f.d('setHelper', { helperId: 999 }), 'setHelper');
  assert.deepStrictEqual(Object.keys(r2).sort(), ['eRet'], '设置管家拒绝应答只许 eRet');
  const r3 = f.pay(f.d('dispatchAward'), 'dispatchAward');
  assert.deepStrictEqual(Object.keys(r3).sort(), ['eRet'], '领奖拒绝应答只许 eRet');
});

console.log('');
if (fails.length) { console.log('c12-smoke: FAIL ' + fails.length + ' 条'); fails.forEach((x) => console.log('  - ' + x)); process.exit(1); }
console.log('c12-smoke: 全部通过（' + pass + ' 条）');
