'use strict';
/** c13-smoke.js —— 第 14 批 C13〔UFO 夹娃娃〕冒烟（走真实 dispatch，档 A）。
 *
 *  覆盖：
 *   ① 4 个活键在 H 里；3 个死键（GET_UFO_CATCHER_TASK/REWARD_UFO_CATCHER_TASK/BUY_UFO_GAME_COIN）按拍板跳过。
 *   ② BZ_C13 表可见（5 难度 reward 30/30/60/150/300；口径 100元宝/3次/爪映射）。
 *   ③ getUFOCatcherData 面板开关：首开赠送三档爪子各 3（拍板④自定）+ 1 次免费刷新 + 池子 = POOL_COMPOSITION。
 *   ④ useUFOrefresh：扣免费 → 池子重生成 + signId+1；无次数 → 6。
 *   ⑤ buyUFORefreshTimes：成功扣 100 + refreshTimes/buyRefreshTimes+1；满 3 次 → 7；元宝不足 → 5。
 *   ⑥ rewardUFO：signCode 缺失 → 15；非爪 itemId → 15；无爪 → 15；有爪 → 服务端权威判中（8143×reward 照表）、
 *      爪 -1、池子 -1（忽略客户端 packages——拍板②）。
 *   ⑦ 池子抓空 → autoRefresh=1 + 新池子（客户端 25761-25764 契约）。
 *   ⑧ 拒绝应答收窄：REJECT_ALLOW=[] → 拒绝应答只有 eRet。
 *
 *  取证：batch14-facts-20261027\C13-c13-取证与策略.md。
 *  用法：node test/c13-smoke.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CORE = path.join(__dirname, '..', 'core');
['bz-shops.generated.js', 'bz-shapes.generated.js', 'bz-tasks.generated.js', 'bz-c09.generated.js',
  'bz-c10.generated.js', 'bz-c11.generated.js', 'bz-c12.generated.js', 'bz-c13.generated.js'].forEach((f) =>
  vm.runInThisContext(fs.readFileSync(path.join(CORE, f), 'utf8')));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

const C13 = (typeof BZ_C13 !== 'undefined') ? BZ_C13 : null;
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

const LIVE = ['getUFOCatcherData', 'rewardUFO', 'useUFOrefresh', 'buyUFORefreshTimes'];
const DEAD = ['getUFOCatcherTask', 'rewardUFOCatcherTask', 'buyUFOGameCoin'];

T('【⓪】C13 表在产物里可见（5 难度 / 口径 100元宝·限3·爪映射）', () => {
  assert.ok(C13 && C13.difficulty, 'BZ_C13 取不到（生成器没接进 test？）');
  assert.strictEqual(Object.keys(C13.difficulty).length, 5, '难度应 5 行');
  assert.deepStrictEqual([1, 2, 3, 4, 5].map((k) => C13.difficulty[String(k)].reward), [30, 30, 60, 150, 300], 'reward 阶梯应 30/30/60/150/300');
  assert.strictEqual(C13.buyRefreshPrice, 100, '拍板⑥：买刷新 100 元宝');
  assert.strictEqual(C13.buyRefreshDailyCap, 3, '拍板⑥：限购 3 次');
  assert.strictEqual(C13.clawByGear['0'], 8117, 'gear0 → 8117');
});

T('【①】4 个活键在 H 里；3 个死键按拍板不在', () => {
  const H = createBzServer({ readSave: () => null, writeSave: () => {}, log: () => {}, now: () => NOW, templates: TPL })._internal.handlers;
  for (const a of LIVE) assert.ok(typeof H[a] === 'function', '缺活 handler: ' + a);
  for (const a of DEAD) assert.ok(typeof H[a] !== 'function', '死键不应实现: ' + a);
});

T('【②】getUFOCatcherData：首开赠送 + 池子 + 字段齐', () => {
  const f = fresh();
  const r = f.pay(f.d('getUFOCatcherData'), 'getUFOCatcherData');
  assert.strictEqual(r.eRet, 1, '应成功');
  assert.strictEqual(r.rewardPool['1'], 2, '池子难度 1 应 2 把');
  assert.strictEqual(r.rewardPool['5'], 1, '池子难度 5 应 1 把');
  assert.deepStrictEqual(r.rewardPool, C13.poolComposition, '池子应等于拍板构成');
  assert.strictEqual(r.freeRefreshTimes, 1, '首开应赠 1 次免费刷新');
  assert.strictEqual(f.save().bag['8117'], 3, '首开应赠 8117×3');
  assert.strictEqual(f.save().bag['8119'], 3, '首开应赠 8119×3');
  assert.strictEqual(f.save().bag['8120'], 3, '首开应赠 8120×3');
  assert.ok(r.note.ivch['8117'] === 3, 'note.ivch 应记爪子入包');
  assert.strictEqual(typeof r.signId, 'number', 'signId 应为数字（客户端 md5 签名种子）');
  const r2 = f.pay(f.d('getUFOCatcherData'), 'getUFOCatcherData');
  assert.strictEqual(r2.freeRefreshTimes, 1, '二次打开不重复赠送');
  assert.strictEqual(f.save().bag['8117'], 3, '二次打开不重复送爪');
});

T('【③】useUFOrefresh：扣免费 → 池重生成 + signId+1；无次数 → 6', () => {
  const f = fresh();
  const sid1 = f.pay(f.d('getUFOCatcherData'), 'getUFOCatcherData').signId;
  const r = f.pay(f.d('useUFOrefresh'), 'useUFOrefresh');
  assert.strictEqual(r.eRet, 1, '有免费次数应成功');
  assert.strictEqual(r.freeRefreshTimes, 0, '免费应扣到 0');
  assert.strictEqual(r.signId, sid1 + 1, 'signId 应 +1（旧 signCode 失效）');
  assert.deepStrictEqual(r.rewardPool, C13.poolComposition, '池子应重生成');
  assert.strictEqual(f.pay(f.d('useUFOrefresh'), 'useUFOrefresh').eRet, 6, '无次数应 6（8060）');
});

T('【④】buyUFORefreshTimes：成功扣 100；满 3 次 → 7；不足 → 5', () => {
  const f = fresh();
  f.pay(f.d('getUFOCatcherData'), 'getUFOCatcherData');
  const r = f.pay(f.d('buyUFORefreshTimes', { num: 1 }), 'buyUFORefreshTimes');
  assert.strictEqual(r.eRet, 1, '应成功');
  assert.strictEqual(f.save().yuanbao, 400, '应扣 100 元宝');
  assert.strictEqual(r.refreshTimes, 1, 'refreshTimes 应 +1');
  assert.strictEqual(r.buyRefreshTimes, 1, 'buyRefreshTimes 应 +1');
  f.pay(f.d('buyUFORefreshTimes', { num: 1 }), 'buyUFORefreshTimes');
  f.pay(f.d('buyUFORefreshTimes', { num: 1 }), 'buyUFORefreshTimes');
  const snapL = f.snap();
  assert.strictEqual(f.pay(f.d('buyUFORefreshTimes', { num: 1 }), 'buyUFORefreshTimes').eRet, 7, '满 3 次应 7（8060）');
  assert.strictEqual(f.snap(), snapL, '拒绝不许写档');
  const f2 = fresh((b) => { b.yuanbao = 50; });
  assert.strictEqual(f2.pay(f2.d('buyUFORefreshTimes', { num: 1 }), 'buyUFORefreshTimes').eRet, 5, '不足应 5（3633）');
});

T('【⑤】rewardUFO：signCode 缺失 / 非爪 / 无爪 → 15', () => {
  const f = fresh();
  const snap0 = f.snap();
  assert.strictEqual(f.pay(f.d('rewardUFO', { packages: [], itemId: 8117 }), 'rewardUFO').eRet, 15, 'signCode 缺失应 15');
  assert.strictEqual(f.pay(f.d('rewardUFO', { packages: [], itemId: 9999, signCode: 'x' }), 'rewardUFO').eRet, 15, '非爪 itemId 应 15');
  assert.strictEqual(f.pay(f.d('rewardUFO', { packages: [], itemId: 8120, signCode: 'x' }), 'rewardUFO').eRet, 15, '未开面板无首开赠爪 → 无 8120 应 15');
  assert.strictEqual(f.snap(), snap0, '拒绝不许写档');
});

T('【⑥】rewardUFO：有爪 → 服务端权威判中（8143×reward 照表）+ 爪 -1 + 池 -1；忽略客户端 packages', () => {
  const f = fresh();
  f.pay(f.d('getUFOCatcherData'), 'getUFOCatcherData');
  const poolBefore = JSON.parse(JSON.stringify(f.save().doll.rewardPool));
  const totalBefore = Object.keys(poolBefore).reduce((n, k) => n + poolBefore[k], 0);
  const r = f.pay(f.d('rewardUFO', { packages: [{ fake: 'client-declared' }], itemId: 8117, signCode: 'anything' }), 'rewardUFO');
  assert.strictEqual(r.eRet, 1, '有爪应成功');
  const got = r.rewardArray['8143'];
  assert.ok([30, 60, 150, 300].indexOf(got) >= 0, '奖励应 8143×reward 照表（30/60/150/300 之一），实得 ' + got);
  assert.strictEqual(f.save().bag['8117'], 2, '爪应 -1');
  const poolAfter = f.save().doll.rewardPool;
  const totalAfter = Object.keys(poolAfter).reduce((n, k) => n + poolAfter[k], 0);
  assert.strictEqual(totalBefore - totalAfter, 1, '池子应 -1');
});

T('【⑦】池子抓空 → autoRefresh=1 + 新池子（客户端 25761 契约）', () => {
  const f = fresh();
  f.pay(f.d('getUFOCatcherData'), 'getUFOCatcherData');
  const gears = [8117, 8119, 8120];
  let last = null;
  for (let i = 0; i < 7; i++) {
    const claw = gears[i % 3];
    last = f.pay(f.d('rewardUFO', { packages: [], itemId: claw, signCode: 'x' }), 'rewardUFO');
    assert.strictEqual(last.eRet, 1, '第 ' + (i + 1) + ' 抓应成功');
  }
  assert.strictEqual(last.autoRefresh, 1, '抓空应回 autoRefresh=1');
  assert.deepStrictEqual(last.rewardPool, C13.poolComposition, '应回新池子');
});

T('【⑧】拒绝应答收窄：REJECT_ALLOW=[] → 拒绝应答只有 eRet', () => {
  const f = fresh();
  const r1 = f.pay(f.d('rewardUFO', { packages: [], itemId: 8117 }), 'rewardUFO');
  assert.deepStrictEqual(Object.keys(r1).sort(), ['eRet'], '抓取拒绝应答只许 eRet');
  const f2 = fresh((b) => { b.yuanbao = 50; });
  const r2 = f2.pay(f2.d('buyUFORefreshTimes', { num: 1 }), 'buyUFORefreshTimes');
  assert.deepStrictEqual(Object.keys(r2).sort(), ['eRet'], '买刷新拒绝应答只许 eRet（元宝不足 5）');
});

console.log('');
if (fails.length) { console.log('c13-smoke: FAIL ' + fails.length + ' 条'); fails.forEach((x) => console.log('  - ' + x)); process.exit(1); }
console.log('c13-smoke: 全部通过（' + pass + ' 条）');
