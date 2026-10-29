'use strict';
/** c11-smoke.js —— 第 12 批 C11〔周年通行证〕冒烟（走真实 dispatch）。
 *
 *  覆盖：
 *   ① 7 个线上名都在 H 里。
 *   ② BZ_C11 表可见（22 奖励阶 / 7 任务 / 4 礼包 / 上限 565 / 口径 30d·300元宝·10gold每点）。
 *   ③ GET_DATA 面板开关契约：anniversaryPassData 七字段类型（rd/vrd/dt 数组、td/dv 对象——客户端
 *      scripts3.js:7821-7828 全裸读）、endtime 是**毫秒**且 = now + 30 天（拍板①）、存档落 annPass。
 *   ④ GET_DATA 二次调用**不续期**（endT 稳定，只有过期才重算）。
 *   ⑤ BUY_UP：元宝不足 → eRet 4 且存档不变；给足 → eRet 1、扣 300、vip=1、note.eco.yuanbao 回显；重复买 → 4。
 *   ⑥ RECEIVE_AWARD：未达 liveness → 2；买活跃度到 10 后领行 2 → eRet 1、rd=[2]、rewardArray 齐、
 *      重复领 → 2；VIP 轨（先升档）→ vrd=[2]。
 *   ⑦ GET_GIFT_DATA：giftDatas 4 行、每行 11 元**数组**、[5] 是 award 原串（客户端 split('|')）、
 *      [8]=已购数初始 0、[4]=limit（type 11 分支 scripts2.js:8550-8572 按下标取）。
 *   ⑧ BUY_GIFT：超限购 → 2（表 limit）；元宝不足 → 2；成功 → 扣价 + giftBuys 记账 +
 *      回包 giftData（**单数**，{giftId: 新已购数}，客户端 67466 刷新）。
 *   ⑨ BUY_LIVENESS：num 非法 → 3；正常 → n 增 + 扣 gold（拍板③ 10/点）；到上限 565 → capReached 3。
 *   ⑩ FINISH_TASK（★线上名 receiveAnniversaryPassTaskReward）：taskId 不在表 → 2；dv 不累计 → notReached 2。
 *   ⑪ 拒绝应答收窄：REJECT_ALLOW=[] → 拒绝应答只有 eRet（裸读字段绝不能漏出去）。
 *
 *  取证：batch12-facts-20261027\C11-c11-取证与策略.md（4 处裸读崩点 + type 11 货架契约）。
 *  用法：node test/c11-smoke.js
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
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-c10.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-c11.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

const C11 = (typeof BZ_C11 !== 'undefined') ? BZ_C11 : null;
const NOW = 1792612412000;
const DAY_MS = 86400000;

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

const IMPL = ['getAnniversaryPassData', 'buyAnniversaryPass', 'receiveAnniversaryPassAward',
  'getAnniversaryPassGift', 'buyAnniversaryPassGift', 'buyAnniversaryPassLiveness', 'receiveAnniversaryPassTaskReward'];

T('【⓪】C11 表在产物里可见（22 阶 / 7 任务 / 4 礼包 / 上限 565 / 口径）', () => {
  assert.ok(C11 && C11.award, 'BZ_C11 取不到（生成器没接进 test？）');
  assert.strictEqual(Object.keys(C11.award).length, 22, '奖励阶应为 22');
  assert.strictEqual(Object.keys(C11.task).length, 7, '任务应为 7 行');
  assert.strictEqual(Object.keys(C11.gift).length, 4, '礼包应为 4 行');
  assert.strictEqual(C11.maxLiveness, 565, '活跃度上限应为 565（客户端 scripts3.js:7763 同值）');
  assert.strictEqual(C11.durationDays, 30, '拍板①：endtime = now + 30 天');
  assert.strictEqual(C11.vipPrice, 300, '拍板②：VIP = 300 元宝');
  assert.strictEqual(C11.livePricePerPoint, 10, '拍板③：活跃度 10 gold/点');
});

T('【①】7 个线上名都在 H 里', () => {
  const H = createBzServer({ readSave: () => null, writeSave: () => {}, log: () => {}, now: () => NOW, templates: TPL })._internal.handlers;
  for (const a of IMPL) assert.ok(typeof H[a] === 'function', '缺 handler: ' + a);
});

T('【②】GET_DATA：七字段类型 + endtime 毫秒 + 存档落 annPass', () => {
  const f = fresh();
  const r = f.pay(f.d('getAnniversaryPassData'), 'getAnniversaryPassData');
  assert.strictEqual(r.eRet, 1, 'GET_DATA 应成功');
  const A = r.anniversaryPassData;
  assert.ok(A, 'anniversaryPassData 裸读字段必须带（7821）');
  assert.strictEqual(typeof A.n, 'number', 'n 应为数字');
  assert.strictEqual(typeof A.vip, 'number', 'vip 应为数字');
  assert.ok(Array.isArray(A.rd) && Array.isArray(A.vrd) && Array.isArray(A.dt), 'rd/vrd/dt 必须是数组（includes 直读）');
  assert.ok(A.td && typeof A.td === 'object' && !Array.isArray(A.td), 'td 必须是对象');
  assert.ok(A.dv && typeof A.dv === 'object' && !Array.isArray(A.dv), 'dv 必须是对象');
  assert.strictEqual(r.endtime, NOW + 30 * DAY_MS, 'endtime 应为 now + 30 天（毫秒）');
  assert.ok(f.save().annPass, '存档应落 annPass');
});

T('【③】GET_DATA 二次调用不续期', () => {
  const f = fresh();
  const t1 = f.pay(f.d('getAnniversaryPassData'), 'getAnniversaryPassData').endtime;
  f.clock.t += 60 * 1000;
  const t2 = f.pay(f.d('getAnniversaryPassData'), 'getAnniversaryPassData').endtime;
  assert.strictEqual(t1, t2, '未过期不应重算 endT');
});

T('【④】BUY_UP：元宝不足 → 4 且档不动；给足 → 扣 300 + vip=1 + eco 回显；重复 → 4', () => {
  const f1 = fresh((b) => { b.yuanbao = 100; });
  const snap1 = f1.snap();
  assert.strictEqual(f1.pay(f1.d('buyAnniversaryPass'), 'buyAnniversaryPass').eRet, 4, '不足应 4');
  assert.strictEqual(f1.snap(), snap1, '拒绝不许写档');
  const f = fresh();
  const r = f.pay(f.d('buyAnniversaryPass'), 'buyAnniversaryPass');
  assert.strictEqual(r.eRet, 1, '应成功');
  assert.strictEqual(f.save().annPass.vip, 1, 'vip 应置 1');
  assert.strictEqual(f.save().yuanbao, 200, '应扣 300 元宝');
  assert.strictEqual(r.note.eco.yuanbao, 200, 'note.eco.yuanbao 应回显新余额');
  assert.strictEqual(f.pay(f.d('buyAnniversaryPass'), 'buyAnniversaryPass').eRet, 4, '重复买应 4');
});

T('【⑤】RECEIVE_AWARD：未达标 → 2；买活跃度到 10 后领行 2 → rd 记账；重复 → 2', () => {
  const f = fresh();
  const snap0 = f.snap();
  assert.strictEqual(f.pay(f.d('receiveAnniversaryPassAward', { id: 2, vip: 0 }), 'receiveAnniversaryPassAward').eRet, 2, '活跃不足应 2');
  assert.strictEqual(f.snap(), snap0, '拒绝不许写档');
  assert.strictEqual(f.pay(f.d('buyAnniversaryPassLiveness', { num: 10 }), 'buyAnniversaryPassLiveness').eRet, 1, '买 10 点活跃应成功');
  const r = f.pay(f.d('receiveAnniversaryPassAward', { id: 2, vip: 0 }), 'receiveAnniversaryPassAward');
  assert.strictEqual(r.eRet, 1, '达标后应成功');
  assert.strictEqual(r.id, 2, '必须回显请求的 id（7853 裸读）');
  assert.strictEqual(r.vip, 0, '必须回显请求的 vip（7852 裸读，错档会把已领记进另一条数组）');
  assert.deepStrictEqual(f.save().annPass.rd, [2], 'rd 应记 [2]');
  assert.strictEqual(r.rewardArray['4003'], 10000, '行 2 免费档 award1 = 4003×10000');
  assert.strictEqual(f.pay(f.d('receiveAnniversaryPassAward', { id: 2, vip: 0 }), 'receiveAnniversaryPassAward').eRet, 2, '重复领应 2');
});

T('【⑥】RECEIVE_AWARD VIP 轨：升档后领 vip=1 → vrd 记账', () => {
  const f = fresh();
  f.pay(f.d('buyAnniversaryPass'), 'buyAnniversaryPass');
  f.pay(f.d('buyAnniversaryPassLiveness', { num: 10 }), 'buyAnniversaryPassLiveness');
  const r = f.pay(f.d('receiveAnniversaryPassAward', { id: 2, vip: 1 }), 'receiveAnniversaryPassAward');
  assert.strictEqual(r.eRet, 1, 'VIP 轨应成功');
  assert.deepStrictEqual(f.save().annPass.vrd, [2], 'vrd 应记 [2]');
  assert.strictEqual(r.rewardArray['4003'], 100000, '行 2 VIP 档 award2 = 4003×100000');
  assert.strictEqual(f.save().annPass.rd.length, 0, '免费轨不应被记');
});

T('【⑦】GET_GIFT_DATA：4 行 11 元数组 + award 原串 + 已购数初始 0', () => {
  const f = fresh();
  const r = f.pay(f.d('getAnniversaryPassGift', { roleID: 16374 }), 'getAnniversaryPassGift');
  assert.strictEqual(r.eRet, 1, '应成功');
  const rows = r.giftDatas;
  assert.strictEqual(Object.keys(rows).length, 4, '货架应 4 行');
  for (const k of Object.keys(rows)) {
    const row = rows[k];
    assert.ok(Array.isArray(row), '行必须是数组（type 11 分支按下标取，scripts2.js:8556）');
    assert.strictEqual(row.length, 11, '行应 11 元');
    assert.ok(typeof row[5] === 'string' && row[5].indexOf('|') > 0, '[5] award 必须是原串（67216 split("|")）');
    assert.strictEqual(row[8], 0, '[8] 已购数应初始 0');
    assert.strictEqual(typeof row[7], 'number', '[7] money 应为数字（11 == Type 直显）');
  }
  assert.strictEqual(rows['1'][4], 1, '行 1 限购应为 1');
  assert.strictEqual(rows['1'][7], 60, '行 1 价格应为 60');
});

T('【⑧】BUY_GIFT：限购 → 2；成功链 行1→行2→行2(钱不够) → 2', () => {
  const f = fresh();
  assert.strictEqual(f.pay(f.d('buyAnniversaryPassGift', { giftId: 1 }), 'buyAnniversaryPassGift').eRet, 1, '行 1 首购应成功（60 ≤ 500）');
  assert.strictEqual(f.save().annPass.giftBuys['1'], 1, '应记已购 1');
  assert.strictEqual(f.save().yuanbao, 440, '应扣 60 元宝');
  const snapL = f.snap();
  assert.strictEqual(f.pay(f.d('buyAnniversaryPassGift', { giftId: 1 }), 'buyAnniversaryPassGift').eRet, 2, '行 1 limit=1，二次应 2');
  assert.strictEqual(f.snap(), snapL, '限购拒绝不许写档');
  assert.strictEqual(f.pay(f.d('buyAnniversaryPassGift', { giftId: 2 }), 'buyAnniversaryPassGift').eRet, 1, '行 2 价 300 ≤ 余 440 应成功');
  assert.strictEqual(f.save().yuanbao, 140, '再扣 300 应余 140');
  assert.strictEqual(f.save().annPass.giftBuys['2'], 1, '行 2 已购 1');
  assert.strictEqual(f.pay(f.d('buyAnniversaryPassGift', { giftId: 2 }), 'buyAnniversaryPassGift').eRet, 2, '行 2 二次：limit 2 未超但余 140 < 300 → insufficient 2');
});

T('【⑧b】BUY_GIFT 成功回包带 giftData（单数）字典', () => {
  const f = fresh();
  const r = f.pay(f.d('buyAnniversaryPassGift', { giftId: 1 }), 'buyAnniversaryPassGift');
  assert.strictEqual(r.eRet, 1, '应成功');
  assert.ok(r.giftData && r.giftData['1'] === 1, 'giftData（单数）必须带 {giftId: 新已购数}（客户端 67466 刷新）');
  assert.ok(r.rewardArray && Object.keys(r.rewardArray).length > 0, 'rewardArray 裸读（131064）必须带');
});

T('【⑨】BUY_LIVENESS：num 非法 → 3；正常 → n 增 + 扣 gold；到上限 → 3', () => {
  const f = fresh();
  const snap0 = f.snap();
  assert.strictEqual(f.pay(f.d('buyAnniversaryPassLiveness', { num: 0 }), 'buyAnniversaryPassLiveness').eRet, 3, 'num=0 应 3');
  assert.strictEqual(f.snap(), snap0, '拒绝不许写档');
  const r = f.pay(f.d('buyAnniversaryPassLiveness', { num: 10 }), 'buyAnniversaryPassLiveness');
  assert.strictEqual(r.eRet, 1, '应成功');
  assert.strictEqual(r.n, 10, 'n 应为 10');
  assert.strictEqual(f.save().gold, 900, '应扣 100 gold（10×10）');
  assert.strictEqual(r.note.eco.gold, 900, 'note.eco.gold 应回显');
  const f2 = fresh((b) => { b.annPass = { n: 565, vip: 0, rd: [], vrd: [], dt: [], td: {}, dv: {}, giftBuys: {}, endT: 0 }; });
  assert.strictEqual(f2.pay(f2.d('buyAnniversaryPassLiveness', { num: 1 }), 'buyAnniversaryPassLiveness').eRet, 3, '到上限应 capReached 3（客户端 7763 同判）');
});

T('【⑩】FINISH_TASK：taskId 不在表 → 2；dv 不累计 → notReached 2 且不动档', () => {
  const f = fresh();
  const snap0 = f.snap();
  assert.strictEqual(f.pay(f.d('receiveAnniversaryPassTaskReward', { taskId: 999 }), 'receiveAnniversaryPassTaskReward').eRet, 2, '999 不在表应 2');
  assert.strictEqual(f.pay(f.d('receiveAnniversaryPassTaskReward', { taskId: 1 }), 'receiveAnniversaryPassTaskReward').eRet, 2, 'dv 恒空应 notReached 2');
  assert.strictEqual(f.snap(), snap0, '拒绝不许写档');
});

T('【⑪】拒绝应答收窄：REJECT_ALLOW=[] → 拒绝应答只有 eRet', () => {
  const f = fresh();
  const r1 = f.pay(f.d('receiveAnniversaryPassAward', { id: 99999, vip: 0 }), 'receiveAnniversaryPassAward');
  assert.deepStrictEqual(Object.keys(r1).sort(), ['eRet'], '领奖拒绝应答只许 eRet');
  const r2 = f.pay(f.d('receiveAnniversaryPassTaskReward', { taskId: 1 }), 'receiveAnniversaryPassTaskReward');
  assert.deepStrictEqual(Object.keys(r2).sort(), ['eRet'], '任务拒绝应答只许 eRet（rewardArray 裸读 7886）');
  const r3 = f.pay(f.d('buyAnniversaryPassGift', { giftId: 999 }), 'buyAnniversaryPassGift');
  assert.deepStrictEqual(Object.keys(r3).sort(), ['eRet'], '买礼包拒绝应答只许 eRet');
});

console.log('');
if (fails.length) { console.log('c11-smoke: FAIL ' + fails.length + ' 条'); fails.forEach((x) => console.log('  - ' + x)); process.exit(1); }
console.log('c11-smoke: 全部通过（' + pass + ' 条）');
