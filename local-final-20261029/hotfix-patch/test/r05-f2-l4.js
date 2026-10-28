'use strict';
/**
 * r05-f2-l4.js —— R05 审阅回执的两条更正（2026-10-22 夜）
 *
 * 【F2】食物饱食度不再无条件相信客户端上报的 `hg`
 *   审阅原文：「F2 用客户端上报的 hg 作为基准值，这一点材料没有说明边界。服务端存档里有没有 hunger，
 *   上限是多少，材料都未提供。……至少要做到两点：给 hunger 加上上限截断（上限值从配置读取）；
 *   如果 hg 超出合法范围，就不发 attrch。」
 *   事实（源码核对）：
 *     - useItem 只在 Effect==1（食物）时带 `hg`(当前剩余)，**不带上限**（index.js:65302）；
 *     - 上限是客户端按属性算的（`new g(strength, shenfa, gengu, perception, age)`，43132），
 *       唯一能拿到它的地方是挂机结算族请求里的 `hglmt`（24729 / 56272 / 56707）；
 *     - 客户端 `note.attrch.hunger` 是**直接赋值**、不做任何截断（142440-142441）。
 *   实现：非法 hg（非数字 / 负 / >1e7）→ **不发 attrch**；上限按 账本 hungerMax → 活客户端模型
 *   （`env.hungerMax`，沙箱恒 null）→ 0（不知道就不截断） 的优先级取，命中就截断。
 *
 * 【L4】观察守卫改口径：奖励类不再整体豁免，改成"差额必须等于 rewardArray"
 *   审阅原文：「它豁免了带 rewardArray 的动作，而这些动作恰恰是重复发奖和吞奖最容易发生的地方。
 *   rewardArray 本身就是事件声明，这类动作应该改为检查"差额必须等于 rewardArray"，而不是豁免。」
 *   另外原实现只比 bag、不看 playerEquip（装备类奖励全在那边）。
 *
 * 断言：
 *   T1 食物 + 合法 hg + 上限未知 → attrch = floor(hg) + Data1×数量，且日志标注"不截断"
 *   T2 账本 hungerMax=540 → 截断到 540（溢出不再写进模型）
 *   T3 非法 hg（"abc" / -5 / 1e9）→ 不发 attrch
 *   T4 从 hglmt 学到上限 → 落进 save.hungerMax，并立刻对下一次 useItem 生效
 *   T5 奖励类：账本差额 == rewardArray → 无 OBS；多发 1 个 → 有 OBS（原实现完全看不见）
 *   T6 装备类奖励：玩家 playerEquip 变了但没在 rewardArray 里声明 → 有 OBS
 *   T7 商店类（扣成本 + 发货，note.ivch 绝对值）→ 不误报
 *
 * 跑法：node test/r05-f2-l4.js   退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

const NOW = 1792612412000;

function makeEnv(extra) {
  const store = new Map();
  const logs = [];
  const env = Object.assign({
    readSave: (k) => (store.has(k) ? store.get(k) : null),
    writeSave: (k, t) => store.set(k, t),
    log: (m) => logs.push(String(m)),
    now: () => NOW,
    templates: TPL,
  }, extra || {});
  return { store, logs, env };
}
const mk = (extra) => { const e = makeEnv(extra); return { s: createBzServer(e.env), logs: e.logs }; };
const inner = (r, k) => r['User.' + k] || {};
const obsLogs = (logs) => logs.filter((l) => l.indexOf('OBS 未解释差额') >= 0);
/** 挑一种食物（BZ_ITEMEAT 里 Data1>0 的物品），优先 3005（Data1=30） */
function foodId() {
  const t = (typeof BZ_ITEMEAT !== 'undefined') ? BZ_ITEMEAT : {};
  const keys = Object.keys(t).filter((k) => parseInt(t[k], 10) > 0).sort((a, b) => t[b] - t[a]);
  assert.ok(keys.length > 0, 'BZ_ITEMEAT 不能为空');
  return { id: parseInt(keys[0], 10), eat: parseInt(t[keys[0]], 10) };
}

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 食物 + 合法 hg + 上限未知 → hunger = floor(hg) + Data1×数量，不截断', () => {
  const { s, logs } = mk();
  const f = foodId();
  s.dispatch('User', 'bzSeedBag', { itemObj: { [f.id]: 5 } });
  const got = inner(s.dispatch('User', 'useItem', { itemID: f.id, itemNum: 2, hg: 100 }), 'useItem');
  assert.ok(got.note && got.note.attrch, '必须有 attrch');
  assert.strictEqual(got.note.attrch.hunger, 100 + f.eat * 2, '按 Data1×数量加');
  assert.ok(logs.some((l) => l.indexOf('上限未知，不截断') >= 0), '日志必须说清"没截断"：' + logs.join(' | '));
});

T('T2 账本有 hungerMax=540 → 截断到上限（不再出现 600/540）', () => {
  const { s } = mk();
  const f = foodId();
  s.dispatch('User', 'bzSeedBag', { itemObj: { [f.id]: 5 } });
  s.loadSave().hungerMax = 540;
  const got = inner(s.dispatch('User', 'useItem', { itemID: f.id, itemNum: 1, hg: 520 }), 'useItem');
  const want = Math.min(520 + f.eat, 540);
  assert.strictEqual(got.note.attrch.hunger, want, '上限截断：' + got.note.attrch.hunger + ' 应等于 ' + want);
  assert.ok(got.note.attrch.hunger <= 540, '不许超上限');
});

T('T3 非法 hg（"abc" / -5 / 1e9）→ 一律不发 attrch', () => {
  const f = foodId();
  for (const bad of ['abc', -5, 1e9]) {
    const { s } = mk();
    s.dispatch('User', 'bzSeedBag', { itemObj: { [f.id]: 5 } });
    const got = inner(s.dispatch('User', 'useItem', { itemID: f.id, itemNum: 1, hg: bad }), 'useItem');
    assert.ok(!got.note || !got.note.attrch, '非法 hg=' + bad + ' 不许发 attrch');
  }
});

T('T4 从请求的 hglmt 学到上限 → 落进 save.hungerMax 并立刻生效', () => {
  const { s } = mk();
  const f = foodId();
  s.dispatch('User', 'bzSeedBag', { itemObj: { [f.id]: 5 } });
  // 挂机结算族会带 hglmt（index.js:24729/56272/56707）；这里用同名参数打任意动作即可触学习
  s.dispatch('User', 'checkBreak', { flag: 1, hglmt: 540, speed: 1 });
  const got = inner(s.dispatch('User', 'useItem', { itemID: f.id, itemNum: 1, hg: 9999 }), 'useItem');
  assert.strictEqual(got.note.attrch.hunger, 540, '学到上限后必须截断');
  assert.strictEqual(s.loadSave().hungerMax, 540, '上限要跟业务写入一起落盘（重启后仍生效）');
});

T('T5 奖励类不豁免：差额 == rewardArray 放过；多发 1 个必须报 OBS', () => {
  const { s, logs } = mk();
  s.dispatch('User', 'bzSeedBag', { itemObj: { 3003: 10 } });
  const snap = s._internal.snapshotLedger();
  s.loadSave().bag[3003] = 13;   // +3，奖励清单写 3 → 对齐
  s._internal.observeLedger('rewardOk', snap, { 'User.rewardOk': { eRet: 1, rewardArray: { 3003: 3 } } });
  assert.strictEqual(obsLogs(logs).length, 0, '对齐的奖励不该报警：' + obsLogs(logs).join(' | '));
  const snap2 = s._internal.snapshotLedger();
  s.loadSave().bag[3003] = 17;   // +4，但清单只写 3 → 多发 1 个
  s._internal.observeLedger('rewardOver', snap2, { 'User.rewardOver': { eRet: 1, rewardArray: { 3003: 3 } } });
  const hit = obsLogs(logs);
  assert.strictEqual(hit.length, 1, '多发的奖励必须留痕（R05 点名的场景）：' + logs.join(' | '));
  assert.ok(hit[0].indexOf('rewardOver') >= 0 && hit[0].indexOf('bag.3003') >= 0, hit[0]);
});

T('T6 装备奖励也纳入观察：playerEquip 涨了但没声明 → OBS', () => {
  const { s, logs } = mk();
  s.loadSave();                     // 先让 server 载入账本（否则 snapshotLedger 返回 null，观察器整体跳过）
  const snap = s._internal.snapshotLedger();
  assert.ok(snap, '账本必须先载入');
  s.loadSave().playerEquip[7535] = [1, 1];
  s._internal.observeLedger('equipSecret', snap, { 'User.equipSecret': { eRet: 1 } });
  const hit = obsLogs(logs);
  assert.strictEqual(hit.length, 1, '装备账本变化必须纳入观察（原实现只看 bag）：' + logs.join(' | '));
  assert.ok(hit[0].indexOf('equip.7535') >= 0, hit[0]);
});

T('T7 商店类（扣成本 + 发货，note.ivch 绝对值）→ 不误报', () => {
  const { s, logs } = mk();
  s.dispatch('User', 'bzSeedBag', { itemObj: { 4015: 10, 3003: 2 } });
  const snap = s._internal.snapshotLedger();
  s.loadSave().bag[4015] = 8;
  s.loadSave().bag[3003] = 3;
  s._internal.observeLedger('shopLike', snap, {
    'User.shopLike': { eRet: 1, note: { ivch: { 4015: 8, 3003: 3 } } },
  });
  assert.strictEqual(obsLogs(logs).length, 0, '有 note.ivch 绝对值的动作不该报警：' + obsLogs(logs).join(' | '));
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[r05-f2-l4] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
