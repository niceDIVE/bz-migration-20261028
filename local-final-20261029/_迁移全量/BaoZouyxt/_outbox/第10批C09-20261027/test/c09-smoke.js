'use strict';
/** c09-smoke.js —— 第 10 批 C09〔技巧摸奖〕冒烟（走真实 dispatch）。
 *
 *  覆盖：
 *   ① 11 个线上名都在 H（8 主 + GET_SKILL_GRASP + EQUIP_RESOLVE + SKILL_GRASP）。
 *   ② 奖池拉取：UI 裸读的那几个字段必须齐（`tenPrice` 缺了界面一打开就 TypeError）。
 *   ③ 券不足 → eRet 5（客户端弹文案 1093）。
 *   ④ 每日免费 1 次：无券也能单抽一次，第二次就不行了；`isFree` 跟着变。
 *   ⑤ 十连：扣 10 张券、回 10 条 `showKnack`。
 *   ⑥ 产物落库：抽到的 knackId 必须进 `s.skillGrasp.knackBag`，且能在表里查到。
 *   ⑦ 防重语义：请求无 nonce → 靠"先扣后发"，重复请求会再扣一次券（重复 ≠ 白拿）。
 *   ⑧ 口诀查询/装配：`getSkillGrasp` / `skillGrasp` / `changeSkillKnack` / `rgChangeSkillKnack`。
 *   ⑨ 四个锁（分解两件 + 口诀合成两件）：eRet 2 且存档逐字节不变。
 *
 *  取证：batch10-facts-20261027/{scoutJ-c09-reqkeys.md, scoutK-c09-tables.md, scoutM-c09-ui-fields.md}。
 *  用法：node test/c09-smoke.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CORE = path.join(__dirname, '..', 'core');
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-shops.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-tasks.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-c09.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

const TICKET = '9191';
// 表在 vm.runInThisContext 里定义成全局 var，直接取；拿不到就让 ⑥ 明确报错而不是伪装通过
const KR = (typeof BZ_KNACK_LOTTERY !== 'undefined') ? BZ_KNACK_LOTTERY : null;

function fresh(extra) {
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
  st.set(createBzServer({ readSave: () => null, writeSave: () => {}, log: () => {}, now: () => 1792612412000, templates: TPL })._internal.SAVE_KEY,
    JSON.stringify(base));
  const srv = createBzServer({
    readSave: (k) => (st.has(k) ? st.get(k) : null),
    writeSave: (k, t) => st.set(k, t),
    log: () => {}, now: () => 1792612412000, templates: TPL,
  });
  const d = (a, p) => srv.dispatch('User', a, p || {});
  const pay = (r, a) => r['User.' + a];
  srv.loadSave();
  srv.dispatch('User', 'getAchieveData', {});
  return { srv, d, pay, save: () => srv.loadSave(), snap: () => JSON.stringify(srv.loadSave()) };
}

let pass = 0; const fails = [];
function T(n, fn) { try { fn(); pass++; console.log('  ok   ' + n); } catch (e) { fails.push(n + ': ' + e.message); console.log('  FAIL ' + n + ' -> ' + e.message); } }

const IMPL = ['getKnackLottery', 'getKnackLotteryHistory', 'knackLottery', 'batchResolveKnack', 'changeSkillKnack',
  'rgChangeSkillKnack', 'resolveKnack', 'batchResolveEquip', 'getSkillGrasp', 'resolveEquip', 'skillGrasp'];
const LOCKED = ['resolveEquip', 'batchResolveEquip', 'resolveKnack', 'batchResolveKnack'];

T('【①】11 个线上名都在 H 里', () => {
  const f = fresh();
  const H = f.srv._internal.handlers;
  const bad = IMPL.filter((w) => typeof H[w] !== 'function');
  assert.deepStrictEqual(bad, [], '缺 handler: ' + bad.join(','));
});

T('【②】奖池回包：UI 裸读的字段齐（tenPrice/onePrice/trick_item/skillArr/lotteryArr/t/eTime/nextSkillArr）', () => {
  const f = fresh();
  const r = f.pay(f.d('getKnackLottery', {}), 'getKnackLottery');
  assert.strictEqual(r.eRet, 1);
  for (const k of ['tenPrice', 'onePrice', 'trick_item', 'skillArr', 'lotteryArr', 't', 'isFree', 'eTime', 'nextSkillArr']) {
    assert.ok(Object.prototype.hasOwnProperty.call(r, k), '缺字段 ' + k + '（客户端裸读 → TypeError）');
  }
  assert.strictEqual(Array.isArray(r.tenPrice), true, 'tenPrice 必须是数组（客户端读 [1]）');
  assert.strictEqual(r.tenPrice[1], 10, '十连价格必须是 10 张');
  assert.strictEqual(r.onePrice[1], 1, '单抽价格必须是 1 张');
  assert.strictEqual(r.trick_item, Number(TICKET), 'trick_item 必须是券 id');
  assert.ok(Array.isArray(r.skillArr) && r.skillArr.length >= 40, 'skillArr 应是 46 个技能，实得 ' + (r.skillArr || []).length);
  assert.deepStrictEqual(r.lotteryArr, [1], '只暴露常驻池 1（2/3 是已过期的限时池）');
});

T('【③】券不足 → eRet 5（客户端弹文案 1093）', () => {
  const f = fresh();
  // 先把今日免费额度用掉
  f.d('knackLottery', { lotteryId: 1, lotteryType: 1, skillId: 0 });
  const r = f.pay(f.d('knackLottery', { lotteryId: 1, lotteryType: 1, skillId: 0 }), 'knackLottery');
  assert.strictEqual(r.eRet, 5, '没券又没免费额度 → 5');
  assert.deepStrictEqual(Object.keys(r), ['eRet'], '拒绝应答必须收窄到只有 eRet');
});

T('【④】每日免费 1 次：无券也能单抽一次，之后 isFree 变 0', () => {
  const f = fresh();
  const r1 = f.pay(f.d('getKnackLottery', {}), 'getKnackLottery');
  assert.strictEqual(r1.isFree, 1, '今天还没用过免费 → isFree 1');
  const d1 = f.pay(f.d('knackLottery', { lotteryId: 1, lotteryType: 1 }), 'knackLottery');
  assert.strictEqual(d1.eRet, 1, '无券也应能免费抽一次');
  assert.strictEqual(d1.showKnack.length, 1, '单抽回 1 条');
  assert.strictEqual(d1.isFree, 0, '抽完 isFree 应变 0');
  assert.strictEqual((f.save().bag || {})[TICKET], undefined, '免费抽不该产生券');
});

T('【⑤】十连：扣 10 张券、回 10 条 showKnack', () => {
  const f = fresh((b) => { b.bag = { 9191: 10 }; });
  const r = f.pay(f.d('knackLottery', { lotteryId: 1, lotteryType: 2 }), 'knackLottery');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(r.showKnack.length, 10, '十连必须回 10 条，实得 ' + r.showKnack.length);
  assert.ok(!(f.save().bag || {})[TICKET], '10 张券应扣光，剩余 ' + JSON.stringify(f.save().bag));
});

T('【⑥】抽到的 knackId 真进 knackBag，且能在表里查到', () => {
  const f = fresh((b) => { b.bag = { 9191: 3 }; });
  const r = f.pay(f.d('knackLottery', { lotteryId: 1, lotteryType: 1 }), 'knackLottery');
  const ids = r.showKnack.map((x) => x.knackId);
  const bag = f.save().skillGrasp.knackBag;
  assert.ok(ids.length === 1 && ids[0] > 0, 'knackId 必须 > 0：' + ids.join(','));
  assert.ok(bag.indexOf(ids[0]) >= 0, 'knackId 必须进 knackBag：' + JSON.stringify(bag));
  const all = new Set();
  for (const g in KR.knack) for (const q in KR.knack[g]) all.add(KR.knack[g][q]);
  assert.ok(all.has(ids[0]), 'knackId 必须在 skill_Trick 表里：' + ids[0]);
});

T('【⑦】防重：重复请求会再扣一次券（重复 ≠ 白拿）', () => {
  const f = fresh((b) => { b.bag = { 9191: 5 }; });
  // 先用掉免费额度，保证两次都是付券
  f.d('knackLottery', { lotteryId: 1, lotteryType: 1 });
  const before = f.save().bag[TICKET][1] !== undefined ? f.save().bag[TICKET][1] : f.save().bag[TICKET];
  f.d('knackLottery', { lotteryId: 1, lotteryType: 1 });
  const mid = f.save().bag[TICKET];
  f.d('knackLottery', { lotteryId: 1, lotteryType: 1 });
  const after = f.save().bag[TICKET];
  assert.ok(mid < before && after < mid, '每次重复请求都要扣券：' + [before, mid, after].join('→'));
});

T('【⑧a】getSkillGrasp / skillGrasp 回口诀账本', () => {
  const f = fresh((b) => { b.bag = { 9191: 2 }; });
  f.d('knackLottery', { lotteryId: 1, lotteryType: 1 });
  const g1 = f.pay(f.d('getSkillGrasp', {}), 'getSkillGrasp');
  assert.strictEqual(g1.eRet, 1);
  assert.ok(g1.skillGrasp && Array.isArray(g1.skillGrasp.knackBag) && g1.skillGrasp.knackBag.length === 1,
    'skillGrasp.knackBag 应有 1 条：' + JSON.stringify(g1.skillGrasp));
  const g2 = f.pay(f.d('skillGrasp', { skillId: 1000 }), 'skillGrasp');
  assert.strictEqual(g2.eRet, 1);
  assert.ok(Array.isArray(g2.knackBag) && g2.knackBag.length === 1);
  assert.ok(g2.skillGraspData && typeof g2.skillGraspData === 'object', 'skillGraspData 必须是对象（客户端 81084 无守卫）');
});

T('【⑧b】changeSkillKnack：装上后从包里移除、skillGraspData 里出现；重复装不重复入包', () => {
  const f = fresh((b) => { b.bag = { 9191: 2 }; });
  const r = f.pay(f.d('knackLottery', { lotteryId: 1, lotteryType: 1 }), 'knackLottery');
  const kid = r.showKnack[0].knackId;
  const c1 = f.pay(f.d('changeSkillKnack', { skillId: 1000, knackIds: [kid] }), 'changeSkillKnack');
  assert.strictEqual(c1.eRet, 1);
  assert.strictEqual(c1.knackBag.indexOf(kid), -1, '装上的口诀要从背包移除');
  assert.deepStrictEqual(c1.skillGraspData['1000'], [kid], 'skillGraspData 里应记这个技能装了什么');
  const c2 = f.pay(f.d('changeSkillKnack', { skillId: 1000, knackIds: [kid] }), 'changeSkillKnack');
  assert.strictEqual(c2.eRet, 1, '同一批再装一次应幂等成功');
  assert.strictEqual(c2.knackBag.filter((x) => x === kid).length, 0, '不许重复入包');
  const c3 = f.pay(f.d('changeSkillKnack', { skillId: 1000, knackIds: [999999] }), 'changeSkillKnack');
  assert.strictEqual(c3.eRet, 2, '包里没有的口诀 → 拒绝');
});

T('【⑧c】rgChangeSkillKnack（注意上游拼写 SKNACK）走同一份账本', () => {
  const f = fresh((b) => { b.bag = { 9191: 2 }; });
  const r = f.pay(f.d('knackLottery', { lotteryId: 1, lotteryType: 1 }), 'knackLottery');
  const kid = r.showKnack[0].knackId;
  const c = f.pay(f.d('rgChangeSkillKnack', { skillId: 1003, knackIds: [kid] }), 'rgChangeSkillKnack');
  assert.strictEqual(c.eRet, 1);
  assert.deepStrictEqual(c.skillGraspData['1003'], [kid]);
});

T('【⑨】四个锁：eRet 2、应答只有 eRet、存档逐字节不变', () => {
  const f = fresh((b) => { b.bag = { 9191: 2 }; b.playerEquip = { 2302: [1, 1] }; });
  const before = f.snap();
  for (const a of LOCKED) {
    const payload = a === 'resolveEquip' ? { itemID: 2302 }
      : a === 'batchResolveEquip' ? { itemIDs: [2302] }
        : a === 'resolveKnack' ? { knack: [10001] }
          : { knackData: [[10001]] };
    const r = f.pay(f.d(a, payload), a);
    assert.strictEqual(r.eRet, 2, a + ' 应回 2');
    assert.deepStrictEqual(Object.keys(r), ['eRet'], a + ' 的拒绝应答必须收窄到只有 eRet');
  }
  assert.strictEqual(f.snap(), before, '四个锁动作一个字节都不许写存档');
});

console.log('');
if (fails.length) {
  console.log('c09-smoke: ' + pass + ' ok / ' + fails.length + ' FAIL');
  for (const x of fails) console.log('  - ' + x);
  process.exit(1);
}
console.log('c09-smoke: 全部通过（' + pass + ' 条）');
