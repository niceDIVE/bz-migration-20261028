'use strict';
/** §6.1 欠账：环任务/委托任务列表（getCircleTaskList.taskArr + changeDelegateTask.taskObj）。
 *
 *  这个文件存在的理由，是**重现原故障**：改动之前 `getCircleTaskList` 读的是存档键 `s.circleTaskArr`，
 *  而存档里从来没有这个键 → `taskArr` 恒为 `[]`，任务面板能开但列表永远空。
 *  `c02-smoke.js` 当时只断言"taskArr 是数组"，`[]` 也是数组，所以那条断言对故障完全免疫
 *  —— 这里补上"非空 + 每行能被客户端真的渲染"的硬断言。
 *
 *  ⚠ 最要命的一条不是"非空"，而是**行里的 type/lv/param 必须是客户端配置表里真实存在的键**：
 *    scripts2.js:27976-28001 showTitleText 会对 type 查 entrust_task、对 param[0] 查 npc/map、
 *    对 lv 查 entrust_level，全是 `.属性` 直读 → 键不存在就 `undefined.xxx` 抛 TypeError，
 *    整个面板炸掉（同 useItem formulaID:0 的事故形态）。
 *    所以本文件把客户端那几处查表**逐条重演**一遍，用真实 dump 表验，而不是只验"字段存在"。
 *
 *  用法：node test/circle-task.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CORE = path.join(__dirname, '..', 'core');
const DUMP = path.join(__dirname, '..', '..', 'tools', 'cfg', 'dump');

vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-shops.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

const SAVE_KEY = createBzServer({
  readSave: () => null, writeSave: () => {}, log: () => {}, now: () => 1792612412000, templates: TPL,
})._internal.SAVE_KEY;

const store = new Map();
store.set(SAVE_KEY, JSON.stringify({
  roleID: 16374, name: 'FZhou', saveVersion: 4,
  accepted: [], done: [], rewarded: [], skills: {},
  baseValueAy: [], bag: {}, playerEquip: {}, equipments: {},
  potential: 102499, coins: 1000, gold: 1000, yuanbao: 100,
  bloodArr: [], fosterArr: [], contribution: 99999, school: 1,
  schoolContribution: {}, hunger: 50, mounts: {}, mountShow: 0,
  marketBuyTimes: {}, passCardLevel: 0, passLiveness: 0, passAward: {},
  growthClaim: {}, growthBigPaid: 0,
}));
const logs = [];
const s = createBzServer({
  readSave: (k) => (store.has(k) ? store.get(k) : null),
  writeSave: (k, t) => store.set(k, t),
  log: (m) => logs.push(m),
  now: () => 1792612412000,
  templates: TPL,
});
const d = (a, p) => s.dispatch('User', a, p || {});
const pay = (r, a) => r['User.' + a];

/** 与 tools/gen_shop_tables.js 的 rowsOf 同口径：dump 的 data 可能是单元素数组包一个字典。 */
function dumpRows(file) {
  const j = JSON.parse(fs.readFileSync(path.join(DUMP, file), 'utf8'));
  let o = j.data;
  if (Array.isArray(o)) o = o[0];
  return o || {};
}
const ENTRUST_TASK = dumpRows('entrust_task.json');
const ENTRUST_LEVEL = dumpRows('entrust_level.json');
const NPC = dumpRows('npc.json');
const ITEM = dumpRows('item.json');   // ⚠ 截断导出（6525 行只留 3000 行）

let pass = 0; const fails = [];
function T(n, fn) { try { fn(); pass++; console.log('  ok   ' + n); } catch (e) { fails.push(n + ': ' + e.message); console.log('  FAIL ' + n + ' -> ' + e.message); } }

// 先取一份 taskArr，后面多条用例都基于它
let ROWS = null;
function rows() {
  if (ROWS) return ROWS;
  const r = pay(d('getCircleTaskList', {}), 'getCircleTaskList');
  ROWS = r.taskArr;
  return ROWS;
}

// ---------- 原故障重现 ----------
T('【原故障重现】getCircleTaskList.taskArr 必须非空（改前恒为 []）', () => {
  const r = pay(d('getCircleTaskList', {}), 'getCircleTaskList');
  assert.strictEqual(r.eRet, 1);
  assert.ok(Array.isArray(r.taskArr), 'taskArr 必须是数组');
  assert.ok(r.taskArr.length > 0,
    'taskArr 是空数组 —— 正是 §6.1 的原故障（改前读不存在的存档键 s.circleTaskArr）');
  assert.strictEqual(r.cNum, r.taskArr.length, 'cNum 必须等于 taskArr 长度（客户端两个字段一起用）');
});

T('每行都有 id/state/type/lv/award/param 且类型正确', () => {
  for (const x of rows()) {
    const tag = JSON.stringify(x);
    assert.ok(Number.isInteger(x.id) && x.id > 0, 'id 必须是正整数: ' + tag);
    assert.ok(Number.isInteger(x.state), 'state 必须是整数: ' + tag);
    assert.ok(Number.isInteger(x.type), 'type 必须是整数: ' + tag);
    assert.ok(Number.isInteger(x.lv), 'lv 必须是整数: ' + tag);
    assert.ok(Array.isArray(x.award) && x.award.length >= 2, 'award 至少 2 格（客户端直读 award[0]/award[1]）: ' + tag);
    for (const v of x.award) assert.strictEqual(typeof v, 'number', 'award 每格必须是数字(否则字符串拼接出来是 NaN): ' + tag);
    assert.ok(Array.isArray(x.param), 'param 必须是数组（客户端直读 param[0]/param[1]）: ' + tag);
  }
});

T('state ∈ 1..5 —— 它是文本数组的下标，越界即 getText(undefined)', () => {
  // scripts2.js:28061  rewardBtnLabel = h.getText([0,1576,1582,1580,593,791][t.state])
  const TEXT_IDS = [0, 1576, 1582, 1580, 593, 791];
  for (const x of rows()) {
    assert.ok(x.state >= 1 && x.state <= 5, 'state=' + x.state + ' 会让 [0,1576,1582,1580,593,791][state] 得 undefined');
    assert.ok(TEXT_IDS[x.state] !== undefined, 'state 下标必须落在文本数组内');
  }
});

// ---------- 客户端查表重演（真正防 TypeError 的部分） ----------
T('重演 showTitleText：type 必须是 entrust_task 的键', () => {
  // scripts2.js:27977  var o = l.getItem(t.type, "entrust_task");  → 27978 直读 o.type
  for (const x of rows()) {
    const row = ENTRUST_TASK[String(x.type)];
    assert.ok(row, 'entrust_task 里没有 type=' + x.type + ' 的行 → showTitleText 在 o.type 处抛 TypeError');
    assert.strictEqual(typeof row.type, 'number', 'entrust_task[' + x.type + '].type 必须是数字');
  }
});

T('重演 showTitleText：type∈{2,3} 时 param[0] 必须是 npc 表里真实存在的 id', () => {
  // scripts2.js:27979  var i = l.getItem(t.param[0], "npc");  → 27980 直读 i.NpcName
  let checked = 0;
  for (const x of rows()) {
    if (x.type !== 2 && x.type !== 3) continue;
    const npc = NPC[String(x.param[0])];
    assert.ok(npc, 'npc 表里没有 ' + x.param[0] + ' → showTitleText 在 i.NpcName 处抛 TypeError（type=' + x.type + '）');
    assert.ok(npc.NpcName !== undefined, 'npc[' + x.param[0] + '].NpcName 缺失');
    checked++;
  }
  assert.ok(checked > 0, '应当至少有一条 type∈{2,3} 的行被验到');
});

T('重演 showTitleText：lv 必须是 entrust_level 的键（type==1 除外）', () => {
  // scripts2.js:27996  var c = l.getItem(t.lv, "entrust_level");  → 27997 直读 c.time
  // 27992 分支：1 == t.type 时查 entrust_detailed[1]，不碰 lv
  for (const x of rows()) {
    if (x.type === 1) continue;
    const lv = ENTRUST_LEVEL[String(x.lv)];
    assert.ok(lv, 'entrust_level 里没有 lv=' + x.lv + ' → showTitleText 在 c.time 处抛 TypeError');
    assert.ok(lv.time !== undefined, 'entrust_level[' + x.lv + '].time 缺失');
  }
});

T('重演 reqDelegateTask：type==2 时 param[1] 必须是 Type=1 的装备', () => {
  // index.js:43554  var o = h.getItem(t.param[1], "item");  → 43555  if (1 == o.Type)  走"从背包装备里选"的分支
  let checked = 0;
  for (const x of rows()) {
    if (x.type !== 2) continue;
    const it = ITEM[String(x.param[1])];
    assert.ok(it, 'item 表里没有 ' + x.param[1] + ' → reqDelegateTask 在 o.Type 处抛 TypeError');
    assert.strictEqual(it.Type, 1, 'item[' + x.param[1] + '].Type 应为 1（装备），实得 ' + it.Type);
    checked++;
  }
  assert.ok(checked > 0, '应当至少有一条 type==2 的行被验到');
});

// ---------- 与 changeDelegateTask 同源 ----------
T('changeDelegateTask.taskObj 与 taskArr 同源（id 集合一致、短名能逆映射回长名）', () => {
  const arr = rows();
  const r = pay(d('changeDelegateTask', { type: 1, tIDArr: [] }), 'changeDelegateTask');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(r.num, arr.length, 'num 必须等于行数');
  const want = arr.map((x) => String(x.id)).sort();
  const got = Object.keys(r.taskObj).sort();
  assert.deepStrictEqual(got, want, 'taskObj 的键必须与 taskArr 的 id 完全一致');
  // 逆映射（index.js:43518-43527）：{id, state:a.s, type:a.t, lv:a.lv, award:a.aw, param:a.c, sTime:a.d}
  for (const x of arr) {
    const a = r.taskObj[String(x.id)];
    assert.strictEqual(a.s, x.state, 'id=' + x.id + ' 的 state 不一致');
    assert.strictEqual(a.t, x.type, 'id=' + x.id + ' 的 type 不一致');
    assert.strictEqual(a.lv, x.lv, 'id=' + x.id + ' 的 lv 不一致');
    assert.deepStrictEqual(a.aw, x.award, 'id=' + x.id + ' 的 award 不一致');
    assert.deepStrictEqual(a.c, x.param, 'id=' + x.id + ' 的 param 不一致');
  }
});

T('环任务 id 与 BZ_TASKS 不撞（否则奖励/接取会串到主线任务上）', () => {
  for (const x of rows()) {
    assert.strictEqual(BZ_TASKS[String(x.id)], undefined,
      'id=' + x.id + ' 不该出现在 BZ_TASKS 里（本轮 §6.1 明确不接奖励发放）');
  }
});

T('id 跨请求稳定（客户端拿它当刷新映射的键）', () => {
  const a = pay(d('getCircleTaskList', {}), 'getCircleTaskList').taskArr.map((x) => x.id).join(',');
  const b = pay(d('getCircleTaskList', {}), 'getCircleTaskList').taskArr.map((x) => x.id).join(',');
  assert.strictEqual(a, b, '两次请求的 id 顺序必须一致');
});

// ---------- 本轮新增的安全闸 ----------
/* ================= v2.7：环任务发奖接线 =================
 * 上游 §一：circleTaskAward / getCircleTaskAward 认 BZ_CIRCLE_TASK，
 * 按当前档位发 m 银两 / e 经验 / p 潜能；银两写进客户端比价读的那个字段（与 C01 同口径）；
 * 走 canClaim/markClaim；接好后 quickFinishTask 对环任务**正常扣 50 元宝**。
 *
 * 旧用例（v2.6）断言"环任务一律不扣元宝"，那是接线前的保护闸。现在有奖励了，
 * 那条断言会挡住正确行为 → 已换成下面这条。 */

/** 全新存档（发奖类用例一律用它，避免与上面的用例互相污染） */
function freshSrv() {
  const st = new Map();
  st.set(SAVE_KEY, JSON.stringify({
    roleID: 16374, name: 'FZhou', saveVersion: 4,
    accepted: [], done: [], rewarded: [], skills: {},
    baseValueAy: [], bag: {}, playerEquip: {}, equipments: {},
    potential: 100, coins: 1000, gold: 1000, yuanbao: 500,
    bloodArr: [], fosterArr: [], contribution: 0, school: 1,
    schoolContribution: {}, hunger: 50, mounts: {}, mountShow: 0,
    marketBuyTimes: {}, passCardLevel: 0, passLiveness: 0, passAward: {},
    growthClaim: {}, growthBigPaid: 0,
  }));
  const srv = createBzServer({
    readSave: (k) => (st.has(k) ? st.get(k) : null),
    writeSave: (k, t) => st.set(k, t),
    log: () => {}, now: () => 1792612412000, templates: TPL,
  });
  return {
    srv,
    d: (a, p) => srv.dispatch('User', a, p || {}),
    pay: (r, a) => r['User.' + a],
    save: () => srv.loadSave(),
  };
}

/** 表里的当前档位（= 投射用的最低段，与 circleTiersKey() 同口径） */
function tierRow() {
  const keys = Object.keys(BZ_CIRCLE_TASK).filter((k) => /^\d+$/.test(k))
    .sort((a, b) => Number(a) - Number(b));
  return { key: keys[0], row: BZ_CIRCLE_TASK[keys[0]] };
}

T('【v2.7 发奖接线】接→領：发的数必须等于 circle_task 当前档位表值', () => {
  const f = freshSrv();
  const t = tierRow();
  const cid = f.pay(f.d('getCircleTaskList', {}), 'getCircleTaskList').taskArr[0].id;
  assert.strictEqual(f.pay(f.d('acceptCircleTask', { taskID: cid, flag: 0 }), 'acceptCircleTask').eRet, 1);

  const c0 = f.save().coins, p0 = f.save().potential;
  const r = f.pay(f.d('circleTaskAward', { taskID: cid }), 'circleTaskAward');
  assert.strictEqual(r.eRet, 1, '领奖应成功');

  // 银两 = 4001 → s.coins（与 C01 buyShopItem 扣的是同一个字段）
  assert.strictEqual(f.save().coins - c0, t.row.m,
    '银两增量必须等于表 m（档位 ' + t.key + ' 的 m=' + t.row.m + '），实得 ' + (f.save().coins - c0));
  // 潜能 = 4003 → s.potential
  assert.strictEqual(f.save().potential - p0, t.row.p,
    '潜能增量必须等于表 p（' + t.row.p + '），实得 ' + (f.save().potential - p0));
  // 经验 4002：v2.7.1 起入 s.exp（CURRENCY_SLOTS 已含），同时必须出现在 rewardObj 里
  assert.strictEqual(r.rewardObj['4001'], t.row.m, 'rewardObj 里 4001 应等于 m');
  assert.strictEqual(r.rewardObj['4003'], t.row.p, 'rewardObj 里 4003 应等于 p');
  assert.strictEqual(r.rewardObj['4002'], t.row.e, 'rewardObj 里 4002 应等于 e');
  assert.strictEqual(f.save().exp, t.row.e, 'v2.7.1：4002 必须真入账 s.exp（拍板 1）');
  assert.strictEqual(r.note.eco.exp, f.save().exp, 'note.eco.exp 必须是新余额');
  // eco 键必须是客户端认的那两个：coins / ptt（潜能是 ptt，不是 potential）
  assert.strictEqual(r.note.eco.coins, f.save().coins, 'note.eco.coins 必须是新余额');
  assert.strictEqual(r.note.eco.ptt, f.save().potential, 'note.eco.ptt 必须是新余额（潜能键叫 ptt）');
  assert.strictEqual(r.note.eco.potential, undefined, '不能发 note.eco.potential（客户端会丢弃）');
});

T('【v2.7】領→再接→再領：第二接被拒、存档逐字节不变', () => {
  const f = freshSrv();
  const cid = f.pay(f.d('getCircleTaskList', {}), 'getCircleTaskList').taskArr[0].id;
  f.d('acceptCircleTask', { taskID: cid, flag: 0 });
  assert.strictEqual(f.pay(f.d('circleTaskAward', { taskID: cid }), 'circleTaskAward').eRet, 1);
  // 环任务可重复领（按天限次），所以"再接"本身是允许的；关键是**刷不出白拿**：
  // 每次领都要重新接一次，且每日有上限。这里验"没有白拿"= 同一时刻连点领奖拿不到第二份。
  const snap = JSON.stringify(f.save());
  const again = f.pay(f.d('circleTaskAward', { taskID: cid }), 'circleTaskAward');
  assert.strictEqual(again.eRet, 4, '没有重新接就再领必须被拒（accepted 里已移除）');
  assert.strictEqual(JSON.stringify(f.save()), snap, '被拒时存档必须逐字节不变');
});

T('【v2.7】每日上限：CIRCLE_DAILY_MAX 次之后必须拒绝且不再发钱', () => {
  const f = freshSrv();
  const cid = f.pay(f.d('getCircleTaskList', {}), 'getCircleTaskList').taskArr[0].id;
  let granted = 0;
  for (let i = 0; i < 25; i++) {
    f.d('acceptCircleTask', { taskID: cid, flag: 0 });
    const r = f.pay(f.d('circleTaskAward', { taskID: cid }), 'circleTaskAward');
    if (r.eRet === 1) granted++;
  }
  assert.strictEqual(granted, 20, '环任务每日应恰好发 20 次（CIRCLE_DAILY_MAX），实发 ' + granted);
  const c0 = f.save().coins;
  f.d('acceptCircleTask', { taskID: cid, flag: 0 });
  assert.strictEqual(f.pay(f.d('circleTaskAward', { taskID: cid }), 'circleTaskAward').eRet, 4,
    '超上限必须被拒');
  assert.strictEqual(f.save().coins, c0, '超上限一个子儿都不许发');
});

T('【v2.7】quickFinishTask 对环任务正常扣 50 元宝并发表值奖励', () => {
  const f = freshSrv();
  const t = tierRow();
  const cid = f.pay(f.d('getCircleTaskList', {}), 'getCircleTaskList').taskArr[1].id;
  assert.strictEqual(f.pay(f.d('acceptCircleTask', { taskID: cid, flag: 0 }), 'acceptCircleTask').eRet, 1);
  const y0 = f.save().yuanbao, c0 = f.save().coins;
  const r = f.pay(f.d('quickFinishTask', { taskID: cid }), 'quickFinishTask');
  assert.strictEqual(r.eRet, 1, '环任务现在有奖励了，付费完成应成功');
  assert.strictEqual(f.save().yuanbao, y0 - 50, '必须扣 50 元宝');
  assert.strictEqual(f.save().coins - c0, t.row.m, '必须发到表值银两（' + t.row.m + '）');
});

T('真正无奖励的 id 仍不许扣元宝（保护闸保留）', () => {
  const f = freshSrv();
  // 随便一个不在 BZ_TASKS、也不是环任务的 id：acceptable() 会挡住接取，所以直接验 taskRewardPairs 口径
  const r = f.pay(f.d('quickFinishTask', { taskID: 987654321 }), 'quickFinishTask');
  assert.notStrictEqual(r.eRet, 1, '无奖励 id 不许成功');
  assert.strictEqual(f.save().yuanbao, 500, '一个元宝都不许扣');
});

console.log('\n[circle-task] 通过 ' + pass + '/' + (pass + fails.length));
if (fails.length) { console.error('失败项:\n' + fails.map((f) => ' - ' + f).join('\n')); process.exit(1); }
console.log('CIRCLE-TASK SMOKE PASSED');
