'use strict';
/** c14-smoke.js —— 第 15 批 C14〔斗狗〕冒烟（走真实 dispatch，档 A）。
 *
 *  覆盖：
 *   ① BZ_C14 表可见（狗粮 6285 / 每份 100 / 满 10000 / 小狗 11193 → 大狗 11194）。
 *   ② 3 个活键在 H 里；4 个"不做"键（enterDogPVEBattle / enterRogueMulitiNpcBattle /
 *      ReqDogPartnerBattleInfo / CheckDogPartnerPVEBattleResult）按档 A 不实现。
 *   ③ getHomeList：dog 从 0 改为建模对象 {id,s,t,p,n}（建横后喂狗链可达；二次打开稳定不重复建）。
 *   ④ lookDogLog：1 + log 空数组（HomeLogUI 对 [] 安全）。
 *   ⑤ FeedDog 拒绝：非狗粮/数量非法/狗粮不足 → 2，且拒绝不写档。
 *   ⑥ FeedDog 成功：真扣狗粮 + progress = 100×num + note.ivch 绝对值回写。
 *   ⑦ FeedDog 喂满：progress 封顶 10000 + bigDog 11194 升级。
 *   ⑧ FeedDog 已满：再喂 → 2（full），不写档。
 *   ⑨ DogBattleResult：桥接回 win 布尔 + endTime 0；狗状态回健康（s=0,t=0）。
 *   ⑩ 拒绝应答收窄：REJECT_ALLOW=[] → 拒绝应答只有 eRet。
 *
 *  取证：batch15-facts-20261027\C14-取证与策略.md。
 *  用法：node test/c14-smoke.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CORE = path.join(__dirname, '..', 'core');
['bz-shops.generated.js', 'bz-shapes.generated.js', 'bz-tasks.generated.js', 'bz-c09.generated.js',
  'bz-c10.generated.js', 'bz-c11.generated.js', 'bz-c12.generated.js', 'bz-c13.generated.js', 'bz-c14.generated.js'].forEach((f) =>
  vm.runInThisContext(fs.readFileSync(path.join(CORE, f), 'utf8')));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

const C14 = (typeof BZ_C14 !== 'undefined') ? BZ_C14 : null;
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

const LIVE = ['FeedDog', 'lookDogLog', 'DogBattleResult'];
const NOT_DONE = ['enterDogPVEBattle', 'enterRogueMulitiNpcBattle', 'ReqDogPartnerBattleInfo', 'CheckDogPartnerPVEBattleResult'];

T('【⓪】C14 表在产物里可见（狗粮 6285 / 100 / 10000 / 11193→11194）', () => {
  assert.ok(C14, 'BZ_C14 取不到（生成器没接进 test？）');
  assert.strictEqual(C14.feedItem, 6285, '狗粮应 6285');
  assert.strictEqual(C14.feedPer, 100, '每份 100（const129）');
  assert.strictEqual(C14.feedCap, 10000, '上限 10000（const128）');
  assert.strictEqual(C14.dogSmall, 11193, '小狗 11193');
  assert.strictEqual(C14.dogBig, 11194, '大狗 11194');
});

T('【①】3 个活键在 H 里；4 个不做键按档 A 不在', () => {
  const H = createBzServer({ readSave: () => null, writeSave: () => {}, log: () => {}, now: () => NOW, templates: TPL })._internal.handlers;
  for (const a of LIVE) assert.ok(typeof H[a] === 'function', '缺活 handler: ' + a);
  for (const a of NOT_DONE) assert.ok(typeof H[a] !== 'function', '档 A 不做键不应实现: ' + a);
});

T('【②】getHomeList：dog 建模对象 + 二次打开稳定', () => {
  const f = fresh();
  const r = f.pay(f.d('getHomeList'), 'getHomeList');
  assert.strictEqual(r.eRet, 1, '应成功');
  assert.ok(r.dog && typeof r.dog === 'object', 'dog 应是对象（C14 建横）');
  assert.strictEqual(r.dog.id, 11193, '初始小狗 11193');
  assert.strictEqual(r.dog.s, 0, 's=0（健康态，getDogCurState 0==s && t<now）');
  assert.strictEqual(r.dog.t, 0, 't=0（无恢复期）');
  assert.strictEqual(r.dog.p, 0, 'p=0（进度）');
  assert.strictEqual(f.save().dog.id, 11193, '狗应写进存档');
  const r2 = f.pay(f.d('getHomeList'), 'getHomeList');
  assert.strictEqual(r2.dog.id, 11193, '二次打开不重复建');
  assert.strictEqual(r2.dog.p, 0, '二次打开进度不变');
});

T('【③】lookDogLog：1 + log 空数组', () => {
  const f = fresh();
  const r = f.pay(f.d('lookDogLog', { type: 0 }), 'lookDogLog');
  assert.strictEqual(r.eRet, 1, '应成功');
  assert.ok(Array.isArray(r.log), 'log 必须是数组（HomeLogUI _itemDataList.length）');
  assert.strictEqual(r.log.length, 0, '本家无事件源 → 空日志');
});

T('【④】FeedDog 拒绝：非狗粮 / 数量非法 / 狗粮不足 → 2，拒绝不写档', () => {
  const f = fresh();
  const snap0 = f.snap();
  assert.strictEqual(f.pay(f.d('FeedDog', { propID: 9999, propnum: 1 }), 'FeedDog').eRet, 2, '非狗粮应 2');
  assert.strictEqual(f.pay(f.d('FeedDog', { propID: 6285, propnum: 0 }), 'FeedDog').eRet, 2, '数量 0 应 2');
  assert.strictEqual(f.pay(f.d('FeedDog', { propID: 6285, propnum: 1 }), 'FeedDog').eRet, 2, '无狗粮应 2');
  assert.strictEqual(f.snap(), snap0, '拒绝不许写档');
});

T('【⑤】FeedDog 成功：真扣狗粮 + progress + note.ivch', () => {
  const f = fresh((b) => { b.bag = { 6285: 5 }; });
  f.pay(f.d('getHomeList'), 'getHomeList');
  const r = f.pay(f.d('FeedDog', { propID: 6285, propnum: 2 }), 'FeedDog');
  assert.strictEqual(r.eRet, 1, '应成功');
  assert.strictEqual(r.progress, 200, 'progress 应 100×2');
  assert.strictEqual(f.save().bag['6285'], 3, '狗粮应 5-2=3');
  assert.strictEqual(r.note.ivch['6285'], 3, 'note.ivch 应为绝对值 3');
  assert.strictEqual(f.save().dog.p, 200, '存档进度应 200');
});

T('【⑥】FeedDog 喂满：progress 封顶 10000 + bigDog 升级', () => {
  const f = fresh((b) => { b.bag = { 6285: 5 }; b.dog = { id: 11193, p: 9950 }; });
  const r = f.pay(f.d('FeedDog', { propID: 6285, propnum: 2 }), 'FeedDog');
  assert.strictEqual(r.eRet, 1, '应成功');
  assert.strictEqual(r.progress, 10000, '应封顶 10000');
  assert.strictEqual(r.bigDog, 11194, '满应升大狗 11194');
  assert.strictEqual(f.save().dog.id, 11194, '存档狗 id 应 11194');
  assert.strictEqual(f.save().bag['6285'], 3, '狗粮应 5-2=3');
});

T('【⑦】FeedDog 已满：再喂 → 2（full），不写档', () => {
  const f = fresh((b) => { b.bag = { 6285: 5 }; b.dog = { id: 11194, p: 10000 }; });
  const snap0 = f.snap();
  assert.strictEqual(f.pay(f.d('FeedDog', { propID: 6285, propnum: 1 }), 'FeedDog').eRet, 2, '已满应 2');
  assert.strictEqual(f.snap(), snap0, '拒绝不许写档');
});

T('【⑧】DogBattleResult：桥接 win + endTime + 狗状态回健康', () => {
  const f = fresh((b) => { b.dog = { id: 11193, p: 0 }; });
  const r = f.pay(f.d('DogBattleResult', { win: 1, fID: 0, dogID: 11193 }), 'DogBattleResult');
  assert.strictEqual(r.eRet, 1, '应成功');
  assert.strictEqual(r.win, true, 'win 应回布尔真');
  assert.strictEqual(r.endTime, 0, 'endTime 应 0');
  assert.strictEqual(f.save().dog.s, 0, '狗状态回健康 s=0');
});

T('【⑨】拒绝应答收窄：REJECT_ALLOW=[] → 拒绝应答只有 eRet', () => {
  const f = fresh();
  const r1 = f.pay(f.d('FeedDog', { propID: 9999, propnum: 1 }), 'FeedDog');
  assert.deepStrictEqual(Object.keys(r1).sort(), ['eRet'], '喂狗拒绝应答只许 eRet');
});

console.log('');
if (fails.length) { console.log('c14-smoke: FAIL ' + fails.length + ' 条'); fails.forEach((x) => console.log('  - ' + x)); process.exit(1); }
console.log('c14-smoke: 全部通过（' + pass + ' 条）');
