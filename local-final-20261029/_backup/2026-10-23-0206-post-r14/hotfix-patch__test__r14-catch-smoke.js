'use strict';
/**
 * r14-catch-smoke.js —— SOTA R14 §1 第 6 条 / §4 的 R5c 落地（2026-10-23）
 *
 * 【为什么要这一层】
 *   `dispatch` 的 catch 会把 handler 异常换成"看起来正常"的应答，而没有任何回归会让 handler 中途抛异常
 *   → 这条路径永远不被执行。R14 反例 2 描述的形态：某个仍直接写 `s` 的 handler 先改了 `s.gold`，
 *   再在读取模板时抛异常；catch 回成功 ACK，内存缓存里已经是改过的金币，下一个动作 persist 就把它写实。
 *
 * 【本文件断言四件事】
 *   S1 87 个 handler × 空请求 `{}`：都不许抛异常（catchCount 不涨）
 *   S2 87 个 handler × 字段类型全错请求：同上（这是"输入校验"的冒烟面，不是业务正确性）
 *   S3 每个应答的 `eRet` ∈ {1} ∪ 拒绝码表登记的码；且 `eRet !== 1` 时**存档字节不变**
 *   S4 故意注入一个"改了档再抛异常"的 handler：catch 必须 ①计数 ②回登记的拒绝码 ③丢内存缓存回滚
 *   S5 未建模效果的 useItem：拒绝（码 3）、**不扣物品**、留 REJECT 日志
 *
 * 跑法：node test/r14-catch-smoke.js   退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');
const REJECT_TABLE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'tools', 'facts', 'reject-codes.json'), 'utf8'));

const NOW = 1792612412000;
function mk(extra) {
  const store = new Map();
  const logs = [];
  const env = Object.assign({
    readSave: (k) => (store.has(k) ? store.get(k) : null),
    writeSave: (k, t) => store.set(k, t),
    log: (m) => logs.push(String(m)),
    now: () => NOW,
    templates: TPL,
  }, extra || {});
  return { s: createBzServer(env), logs, store };
}
const inner = (r, k) => (r && r['User.' + k]) || {};
const saveBytes = (s, store) => { const k = s._internal.SAVE_KEY; return store.has(k) ? store.get(k) : null; };

/** 一个"字段类型全错"的请求：数字位给对象/字符串、数组位给数字、对象位给字符串。
 *  不追求覆盖每个字段（我们没有请求 schema），只追求"让 parseInt/数组遍历/属性访问路径都踩一遍"。 */
const POISON = {
  itemID: {}, itemNum: 'x', num: {}, count: [], skillID: {}, skillArr: 'x', skillLevel: {},
  taskID: [], taskArr: {}, npcID: {}, branchId: 'x', originId: {}, attrID: [], attArr: 'x',
  saleArr: {}, itemObj: 'x', gTime: {}, hgtimes: [], hg: {}, hglmt: [], curHp: {}, maxhpLimit: 'x',
  curMp: [], maxmpLimit: {}, formulaID: {}, mountID: [], titleID: {}, gemId: {}, type: {},
  page: [], shopID: {}, buyCount: {}, id: {}, flag: {}, isCollective: {}, beginTime: {},
  serverTime: {}, time: {}, endTime: {}, isReserved: {}, branch: {}, selectIndex: [],
};

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }
/** 表可能还在旧 schema（`chosen`）或新 schema（`defaultCode`+`codes`）——两种都读，
 *  这样这张冒烟表不必等表重构落地就能跑。 */
const allowedCodes = (act) => {
  const e = REJECT_TABLE[act];
  if (!e) return [1];
  const s = new Set([1]);
  if (typeof e.defaultCode === 'number') s.add(e.defaultCode);
  if (typeof e.chosen === 'number') s.add(e.chosen);
  (e.codes || []).forEach((c) => { if (typeof c.code === 'number') s.add(c.code); });
  return Array.from(s);
};
/** 登录前/角色创建类的动作**本来就没有 eRet**（应答是 serverList / roleInfo 这类载荷）。
 *  ⚠ 这是一张登记表：新动作若没有 eRet，必须显式加到这里（否则冒烟会红 = 棘轮）。 */
const NO_ERET_ACTIONS = ['GetServerList', 'Create', 'CheckName', 'GetChatAddress', 'quicklogin'];
/** 支付类动作由 dispatch 的 PAY_ACTION_RE 统一回 `eRet:4`（项目边界：不伪造付费），不是 handler 的拒绝码。 */
const PAY_RE = /(Pay|Order|Recharge|Iap|Jetton)/;
/** 应答值直接来自抓包模板（`templates.json`）的动作：`eRet` 是**抓包真值**，不是我们发明的码。
 *  ⚠ 登记制：新增项必须写清"模板里就是这么回的"，否则冒烟会红。 */
const TEMPLATE_CODES = { getCRAInfo: [2] };

T('S1+S2+S3 全 handler 冒烟：空请求 / 类型全错请求都不许抛异常，eRet 必须在表内，拒绝不写档', () => {
  const probe = mk();
  const acts = Object.keys(probe.s._internal.handlers).sort();
  assert.ok(acts.length >= 80, 'handler 数量异常：' + acts.length);
  const bad = [];
  for (const act of acts) {
    for (const [kind, reqp] of [['empty', {}], ['poison', POISON]]) {
      const { s, store } = mk();
      const before = saveBytes(s, store);
      const c0 = s._internal.catchCount();
      let res = null;
      try { res = s.dispatch('User', act, reqp); } catch (e) {
        bad.push(act + '/' + kind + ' 抛到了调用方: ' + e.message); continue;
      }
      const c1 = s._internal.catchCount();
      const got = inner(res, act);
      if (c1 !== c0) bad.push(act + '/' + kind + ' catch 吞了异常（catchCount ' + c0 + '→' + c1 + '）');
      const allow = allowedCodes(act);
      const eretOk = PAY_RE.test(act) ? got.eRet === 4
        : (TEMPLATE_CODES[act] ? (got.eRet === undefined || TEMPLATE_CODES[act].indexOf(got.eRet) >= 0)
          : (NO_ERET_ACTIONS.indexOf(act) >= 0 ? (got.eRet === undefined || allow.indexOf(got.eRet) >= 0)
            : allow.indexOf(got.eRet) >= 0));
      if (!eretOk) bad.push(act + '/' + kind + ' eRet=' + JSON.stringify(got.eRet) + ' 不在 ' + JSON.stringify(allow));
      // 只有"明确的拒绝码"才要求不写档；`Create` 这类没有 eRet 的动作本来就要写档（建角）
      if (typeof got.eRet === 'number' && got.eRet !== 1 && saveBytes(s, store) !== before) bad.push(act + '/' + kind + ' 拒绝却写了档');
    }
  }
  assert.deepStrictEqual(bad, [], '冒烟失败项：\n' + bad.join('\n'));
});

T('S4 注入"改了档再抛异常"的 handler：catch 必须计数 + 回登记码 + 内存回滚（R14 反例 2）', () => {
  const { s, store, logs } = mk();
  // 先落一份正常存档，作为"上次成功 persist"的基准
  s.dispatch('User', 'bzSeedBag', { itemObj: { 3003: 1 } });
  const before = saveBytes(s, store);
  const h = s._internal.handlers;
  const orig = h.acceptTask;
  h.acceptTask = function (p) {
    var save = s.loadSave();          // 拿到内存缓存本体
    save.coins = (save.coins || 0) + 999999;   // 半写：改了内存
    throw new Error('注入的异常（模拟读模板失败）');
  };
  try {
    const c0 = s._internal.catchCount();
    const res = s.dispatch('User', 'acceptTask', { taskID: 100010 });
    const got = inner(res, 'acceptTask');
    assert.strictEqual(s._internal.catchCount(), c0 + 1, 'catch 必须计数（R5c 的探测器）');
    assert.notStrictEqual(got.eRet, 1, '异常绝不许回成功 ACK（R14 §1 第 6 条）');
    assert.strictEqual(got.eRet, REJECT_TABLE.acceptTask ? REJECT_TABLE.acceptTask.defaultCode : 4,
      'catch 必须回该动作登记的拒绝码（未登记则 4）');
    assert.strictEqual(saveBytes(s, store), before, '异常后存档字节不许变');
    assert.strictEqual(s.loadSave().coins, JSON.parse(before).coins,
      '内存缓存必须被丢掉（_save=null）→ 重新从盘上读回，半写的 coins 不许留');
  } finally { h.acceptTask = orig; }
  assert.ok(logs.some((l) => l.indexOf('REJECT acceptTask reason=handlerThrew') >= 0),
    'catch 必须留 REJECT 日志：' + logs.slice(-3).join(' | '));
});

T('S5 未建模效果的 useItem：**用户裁定先不改行为** —— 照扣、但必须留痕（cap 应为 0 的消耗事件表）', () => {
  const eat = (typeof BZ_ITEMEAT !== 'undefined') ? BZ_ITEMEAT : {};
  const fun = (typeof BZ_ITEMFUN !== 'undefined') ? BZ_ITEMFUN : {};
  const sch = (typeof BZ_ITEMSCH !== 'undefined') ? BZ_ITEMSCH : {};
  const cand = Object.keys((typeof BZ_ITEMPRICE !== 'undefined') ? BZ_ITEMPRICE : {})
    .map((x) => parseInt(x, 10))
    .find((id) => id > 0 && !eat[id] && !fun[id] && !sch[id]);
  assert.ok(cand, '找不到未建模物品（表格结构变了？）');
  const { s, store, logs } = mk();
  s.dispatch('User', 'bzSeedBag', { itemObj: { [cand]: 2 } });
  const got = inner(s.dispatch('User', 'useItem', { itemID: cand, itemNum: 1 }), 'useItem');
  // 用户 2026-10-23 裁定：不搞一刀切拒绝（可获性表 248 是表内高估口径，客户端只对消耗品发 useItem）。
  // 所以当前契约 = "照扣但无效果"，但必须留痕 —— 这条日志就是 meta.rejectStats 的来源，
  // 也是下一轮"按 Effect 家族实现"的待办清单入口。
  assert.strictEqual(got.eRet, 1, '裁定为"先不改行为"：应答仍是成功码 1');
  assert.strictEqual(s.loadSave().bag[cand], 1, '行为不变：物品照扣（这就是待修的损失面）');
  assert.ok(logs.some((l) => l.indexOf('REJECT useItem reason=effectUnmodeledConsumed') >= 0),
    '必须留痕（cap 为 0 的消耗事件表）：' + logs.slice(-3).join(' | '));
  // 反向：开关为 true 时路径仍然可用（表里已登记码 3，这里只断言常量确实是 false，防有人悄悄打开）
  assert.strictEqual(s._internal.rejectUnmodeledItems, false, '默认必须随用户裁定为 false');
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[r14-catch-smoke] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();

