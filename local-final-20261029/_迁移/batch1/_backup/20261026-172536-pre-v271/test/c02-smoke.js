'use strict';
/** 第 3 批 C02〔任务主线〕16 个新 handler 功能冒烟。
 *  重点：任务奖励**绝不允许重复领**（重复领 = 白拿钱），以及 quickFinishTask 绝不免费完成。
 *  用法：node test/c02-smoke.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-shops.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

const SAVE_KEY = createBzServer({
  readSave: () => null, writeSave: () => {}, log: () => {}, now: () => 1792612412000, templates: TPL,
})._internal.SAVE_KEY;

function baseSave(over) {
  return Object.assign({
    roleID: 16374, name: 'FZhou', saveVersion: 4,
    accepted: [], done: [], rewarded: [], skills: {},
    baseValueAy: [], bag: {}, playerEquip: {}, equipments: {},
    potential: 102499, coins: 1000, gold: 1000, yuanbao: 100,
    bloodArr: [], fosterArr: [], contribution: 99999, school: 1,
    schoolContribution: {}, hunger: 50, mounts: {}, mountShow: 0,
    marketBuyTimes: {}, passCardLevel: 0, passLiveness: 0, passAward: {},
    growthClaim: {}, growthBigPaid: 0,
  }, over || {});
}
const store = new Map();
store.set(SAVE_KEY, JSON.stringify(baseSave()));
const logs = [];
const env = {
  readSave: (k) => (store.has(k) ? store.get(k) : null),
  writeSave: (k, t) => store.set(k, t),
  log: (m) => logs.push(m),
  now: () => 1792612412000,
  templates: TPL,
};
const s = createBzServer(env);
const d = (a, p) => s.dispatch('User', a, p || {});
const pay = (r, a) => r['User.' + a];

let pass = 0; const fails = [];
function T(n, fn) { try { fn(); pass++; console.log('  ok   ' + n); } catch (e) { fails.push(n + ': ' + e.message); console.log('  FAIL ' + n + ' -> ' + e.message); } }

/* 找若干个真有奖励的任务 id（BZ_TASKS 里 r 非空）。
 * ⚠ 不要用"手动清空 accepted/done"来隔离用例 —— guardSave 禁止 done 数量减少，
 *    persist() 会回滚内存，于是看起来像 handler 失效（第一版本测试就是这么误报的）。
 *    正确做法：每个用例用不同的任务 id。 */
const IDS = (function () {
  const out = [];
  for (const k of Object.keys(BZ_TASKS)) {
    if (k === '__meta') continue;
    const rw = BZ_TASKS[k].r;
    if (rw && Object.keys(rw).length) out.push(parseInt(k, 10));
    if (out.length >= 8) break;
  }
  return out;
})();
const TID = IDS[0];
console.log('  任务 ids = ' + IDS.join(',') + '  首个奖励 ' + JSON.stringify(BZ_TASKS[String(TID)] && BZ_TASKS[String(TID)].r));
assert.ok(IDS.length >= 6, '需要至少 6 个有奖励的任务 id 才能跑完用例');

// ---------- 只读/低风险 ----------
T('getCircleTaskList 回 cNum + taskArr(数组)', () => {
  const r = pay(d('getCircleTaskList', {}), 'getCircleTaskList');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(typeof r.cNum, 'number');
  assert.ok(Array.isArray(r.taskArr), 'taskArr 必须是数组，实得 ' + typeof r.taskArr);
});

T('getSchoolTask 字段齐全且 schoolTask 是数组（客户端不判 eRet）', () => {
  const r = pay(d('getSchoolTask', { schoolId: 1 }), 'getSchoolTask');
  assert.ok(Array.isArray(r.schoolTask), 'schoolTask 必须是数组（{} 会在 .length 处得 undefined）');
  assert.strictEqual(typeof r.weekQuickCompleteTaskTimes, 'number');
  assert.strictEqual(typeof r.affiliationSchool, 'number');
  assert.strictEqual(typeof r.xyTodaySchoolId, 'number');
  assert.ok(r.currentServerTime > 0);
});

T('hideTask 记 hTaskArr', () => {
  const r = pay(d('hideTask', { type: 1, tIDArr: [111, 222] }), 'hideTask');
  assert.strictEqual(r.eRet, 1);
  assert.deepStrictEqual(s.loadSave().hTaskArr, [111, 222]);
});

T('refreshSchoolTask / schoolTaskAward 只回 eRet:1 且不发奖', () => {
  const bagBefore = JSON.stringify(s.loadSave().bag);
  assert.strictEqual(pay(d('refreshSchoolTask', { schoolId: 1 }), 'refreshSchoolTask').eRet, 1);
  assert.strictEqual(pay(d('schoolTaskAward', { schoolId: 1, index: 0 }), 'schoolTaskAward').eRet, 1);
  assert.strictEqual(JSON.stringify(s.loadSave().bag), bagBefore, '这两个动作不许发任何东西');
});

// ---------- 防白拿：quickFinishTask ----------
T('quickFinishTask 未接过的任务 -> eRet:2 且不动档', () => {
  const snap = JSON.stringify(s.loadSave());
  const r = pay(d('quickFinishTask', { taskID: IDS[4] }), 'quickFinishTask');
  assert.strictEqual(r.eRet, 2, '没接过不许买，回 2');
  assert.strictEqual(JSON.stringify(s.loadSave()), snap, '不许动档');
});

T('quickFinishTask 元宝够 -> 扣 50 元宝、发奖、移入 done', () => {
  const id = IDS[4];
  assert.strictEqual(pay(d('acceptCircleTask', { taskID: id, flag: 0 }), 'acceptCircleTask').eRet, 1);
  const y0 = s.loadSave().yuanbao;
  const bag0 = JSON.parse(JSON.stringify(s.loadSave().bag));
  const r = pay(d('quickFinishTask', { taskID: id }), 'quickFinishTask');
  assert.strictEqual(r.eRet, 1, '元宝够就该付费完成');
  assert.strictEqual(s.loadSave().yuanbao, y0 - 50, '必须扣 50 元宝');
  assert.ok(s.loadSave().done.indexOf(id) >= 0, '任务应移入 done');
  assert.ok(s.loadSave().accepted.indexOf(id) < 0, '应从 accepted 移除');
  const bag1 = s.loadSave().bag;
  const gained = Object.keys(bag1).filter((k) => (bag1[k] || 0) > (bag0[k] || 0));
  assert.ok(gained.length > 0, '应真发任务奖励');
});

T('quickFinishTask 元宝不足 -> eRet:2 且不动档', () => {
  const id = IDS[2];
  const st = s.loadSave();
  st.yuanbao = 0;
  assert.strictEqual(pay(d('acceptCircleTask', { taskID: id, flag: 0 }), 'acceptCircleTask').eRet, 1);
  const snap = JSON.stringify(s.loadSave());
  const r = pay(d('quickFinishTask', { taskID: id }), 'quickFinishTask');
  assert.strictEqual(r.eRet, 2, '元宝不足 -> 2 -> openChargeList');
  assert.strictEqual(JSON.stringify(s.loadSave()), snap, '元宝不足不许动档');
});

// ---------- 防重复领奖（核心） ----------
T('未接过的任务领奖 -> eRet:4 且不发奖', () => {
  const bagBefore = JSON.stringify(s.loadSave().bag);
  const r = pay(d('circleTaskAward', { taskID: IDS[5] }), 'circleTaskAward');
  assert.strictEqual(r.eRet, 4);
  assert.strictEqual(JSON.stringify(s.loadSave().bag), bagBefore, '没接过就不许发奖');
});

T('接任务 -> 领奖发一次 -> 再领必须被拒（不重复发）', () => {
  const id = IDS[0];
  const a = pay(d('acceptCircleTask', { taskID: id, flag: 0 }), 'acceptCircleTask');
  assert.strictEqual(a.eRet, 1);
  assert.ok(s.loadSave().accepted.indexOf(id) >= 0, '应进 accepted');

  const bag1 = JSON.parse(JSON.stringify(s.loadSave().bag));
  const r1 = pay(d('circleTaskAward', { taskID: id }), 'circleTaskAward');
  assert.strictEqual(r1.eRet, 1, '第一次应成功');
  const bag2 = s.loadSave().bag;
  const gained = Object.keys(bag2).filter((k) => (bag2[k] || 0) > (bag1[k] || 0));
  assert.ok(gained.length > 0 || Object.keys(r1.rewardObj || {}).length > 0, '第一次应真发奖');
  assert.ok(s.loadSave().done.indexOf(id) >= 0, '应移入 done');
  assert.ok(s.loadSave().accepted.indexOf(id) < 0, '应从 accepted 移除');

  const snap = JSON.stringify(s.loadSave());
  const r2 = pay(d('circleTaskAward', { taskID: id }), 'circleTaskAward');
  assert.strictEqual(r2.eRet, 4, '第二次必须被拒（防重复领＝防白拿）');
  assert.strictEqual(JSON.stringify(s.loadSave()), snap, '第二次一个字节都不许动');
});

T('肉鸽：接任务 -> 领奖 -> 再领被拒', () => {
  const id = IDS[1];
  assert.strictEqual(pay(d('rogueAcceptTask', { taskID: id, delOrder: 0 }), 'rogueAcceptTask').eRet, 1);
  assert.ok(s.loadSave().accepted.indexOf(id) >= 0, 'rogueAcceptTask 应入 accepted');
  assert.strictEqual(pay(d('getRogueFinishTaskAward', { taskID: id }), 'getRogueFinishTaskAward').eRet, 1);
  const snap = JSON.stringify(s.loadSave());
  assert.strictEqual(pay(d('getRogueFinishTaskAward', { taskID: id }), 'getRogueFinishTaskAward').eRet, 4);
  assert.strictEqual(JSON.stringify(s.loadSave()), snap, '重复领不许动档');
});

T('getCircleTaskAward 同样防重复领', () => {
  const id = IDS[3];
  assert.strictEqual(pay(d('acceptCircleTask', { taskID: id, flag: 0 }), 'acceptCircleTask').eRet, 1);
  assert.strictEqual(pay(d('getCircleTaskAward', { taskID: id }), 'getCircleTaskAward').eRet, 1);
  const snap = JSON.stringify(s.loadSave());
  assert.strictEqual(pay(d('getCircleTaskAward', { taskID: id }), 'getCircleTaskAward').eRet, 4);
  assert.strictEqual(JSON.stringify(s.loadSave()), snap);
});

T('acceptCircleTask 非法 taskID -> eRet:6 不动档', () => {
  const snap = JSON.stringify(s.loadSave());
  assert.strictEqual(pay(d('acceptCircleTask', { taskID: 0 }), 'acceptCircleTask').eRet, 6);
  assert.strictEqual(JSON.stringify(s.loadSave()), snap);
});

T('没有非 1 的 eRet 泄漏进成功分支（eRet 必须是数字）', () => {
  for (const a of ['getCircleTaskList', 'getSchoolTask', 'delegateTask', 'changeDelegateTask', 'acceptSchoolTask', 'onekeyCompleteSchoolTask', 'schoolTaskComplete']) {
    const r = pay(d(a, { schoolId: 1, index: 0, taskID: TID }), a);
    assert.strictEqual(typeof r.eRet, 'number', a + ' 的 eRet 必须是数字');
  }
});

/* ================= v2.6 堵口：共用领奖账 =================
 * 上游指出的原漏洞：领奖只验"在不在 accepted 里"，接任务不验领过没有、也不验是不是环任务
 *   → accept(X)/领奖(X) 交替调用可无限白拿；跨口还能重复（主线领过再从环任务口领）。
 * 原有冒烟只测了"领完马上再领"，那一步 accepted 已经空了，**测不到**这个口子。
 * 所以这里补的是**真正的攻击序列**，并且用**全新存档**跑，不受前面用例污染。 */
const ONCE = (function () {
  const out = [];
  for (const k of Object.keys(BZ_TASKS)) {
    if (k === '__meta') continue;
    const rw = BZ_TASKS[k].r, p = BZ_TASKS[k].p;
    if (!p && rw && Object.keys(rw).length) out.push(parseInt(k, 10));
    if (out.length >= 8) break;
  }
  return out;
})();
assert.ok(ONCE.length >= 8, '需要至少 8 个**非重复**且有奖励的任务 id，实得 ' + ONCE.length);
console.log('  非重复任务 ids = ' + ONCE.join(','));

/** 全新存档 + 全新 server（漏洞用例一律用它，绝不复用前面被改过的档） */
function freshServer() {
  const st = new Map();
  st.set(SAVE_KEY, JSON.stringify(baseSave()));
  const e2 = {
    readSave: (k) => (st.has(k) ? st.get(k) : null),
    writeSave: (k, t) => st.set(k, t),
    log: () => {},
    now: () => 1792612412000,
    templates: TPL,
  };
  const srv = createBzServer(e2);
  // ⚠ 预热一次：loadSave/ensureLedger 会把存档**规范化**（schoolContribution {}→0、passCardLevel 0→1、
  //   bloodArr []→[0,0,0,0] 等）。不先走一次，快照就会把"规范化"误判成"handler 改了档"。
  //   （第一版堵口用例就是被这个坑出来的假红。）
  srv.loadSave();
  srv.dispatch('User', 'hideTask', { type: 1, tIDArr: [] });
  return {
    srv,
    st,
    d: (a, p) => srv.dispatch('User', a, p || {}),
    pay: (r, a) => r['User.' + a],
    save: () => srv.loadSave(),
    bagSnapshot: () => JSON.stringify(srv.loadSave().bag) + '|' + JSON.stringify(srv.loadSave().playerEquip || {}),
  };
}

T('【堵口·原漏洞】接 → 领 → 再接 → 再领：第二次接必须被拒、存档逐字节不变', () => {
  const f = freshServer();
  const id = ONCE[0];
  // 1) 正常接 + 正常领，必须成功（不能把正常路径也堵死）
  assert.strictEqual(f.pay(f.d('acceptCircleTask', { taskID: id, flag: 0 }), 'acceptCircleTask').eRet, 1,
    '第一次接应当成功');
  assert.strictEqual(f.pay(f.d('circleTaskAward', { taskID: id }), 'circleTaskAward').eRet, 1,
    '第一次领应当成功');
  assert.ok(f.save().rewarded.indexOf(id) >= 0, '领过之后必须记进共用账 s.rewarded');
  // 2) 攻击序列：再接 —— 必须被拒
  const snap = JSON.stringify(f.save());
  const again = f.pay(f.d('acceptCircleTask', { taskID: id, flag: 0 }), 'acceptCircleTask');
  assert.strictEqual(again.eRet, 6, '领过的任务不许再接（eRet 6），实得 ' + again.eRet);
  assert.strictEqual(JSON.stringify(f.save()), snap, '被拒时存档必须逐字节不变');
  // 3) 即使硬闯领奖口，也必须发不出东西
  const bagBefore = f.bagSnapshot();
  const r2 = f.pay(f.d('circleTaskAward', { taskID: id }), 'circleTaskAward');
  assert.notStrictEqual(r2.eRet, 1, '第二次领奖绝不许成功，实得 ' + r2.eRet);
  assert.strictEqual(f.bagSnapshot(), bagBefore, '第二次领奖一件东西都不许发');
});

T('【堵口·跨口】主线用 getFinishTaskAward 领过 → 走环任务口再领必须被拒', () => {
  const f = freshServer();
  const id = ONCE[1];
  // 主线口先领一次
  assert.strictEqual(f.pay(f.d('getFinishTaskAward', { taskID: id }), 'getFinishTaskAward').eRet, 1);
  assert.ok(f.save().rewarded.indexOf(id) >= 0, '主线领过必须记进共用账');
  // 换环任务口再接再领
  const snap = JSON.stringify(f.save());
  assert.strictEqual(f.pay(f.d('acceptCircleTask', { taskID: id, flag: 0 }), 'acceptCircleTask').eRet, 6,
    '主线已领过的任务不许从环任务口再接');
  assert.strictEqual(JSON.stringify(f.save()), snap, '被拒时存档必须逐字节不变');
  const bagBefore = f.bagSnapshot();
  assert.notStrictEqual(f.pay(f.d('circleTaskAward', { taskID: id }), 'circleTaskAward').eRet, 1,
    '跨口重复领必须失败');
  assert.strictEqual(f.bagSnapshot(), bagBefore, '跨口重复领一件东西都不许发');
});

T('【堵口·第四口】quickFinishTask 发过奖必须记账 → getFinishTaskAward 不能再发一次', () => {
  const f = freshServer();
  const id = ONCE[2];
  const st2 = f.save();
  st2.yuanbao = 500;
  assert.strictEqual(f.pay(f.d('acceptCircleTask', { taskID: id, flag: 0 }), 'acceptCircleTask').eRet, 1);
  assert.strictEqual(f.pay(f.d('quickFinishTask', { taskID: id }), 'quickFinishTask').eRet, 1, '元宝够应能付费完成');
  assert.ok(f.save().rewarded.indexOf(id) >= 0, 'quickFinishTask 发奖后**必须**记账（原来漏了这一步）');
  const bagBefore = f.bagSnapshot();
  const r = f.pay(f.d('getFinishTaskAward', { taskID: id }), 'getFinishTaskAward');
  assert.strictEqual(f.bagSnapshot(), bagBefore, 'getFinishTaskAward 不许再发一次');
  assert.deepStrictEqual(r.rewardArray, {}, '再发时 rewardArray 必须为空，实得 ' + JSON.stringify(r.rewardArray));
});

T('【堵口·肉鸽口】rogueAcceptTask + getRogueFinishTaskAward 领过后不许再接', () => {
  const f = freshServer();
  const id = ONCE[3];
  assert.strictEqual(f.pay(f.d('rogueAcceptTask', { taskID: id, delOrder: 0 }), 'rogueAcceptTask').eRet, 1);
  assert.strictEqual(f.pay(f.d('getRogueFinishTaskAward', { taskID: id }), 'getRogueFinishTaskAward').eRet, 1);
  const snap = JSON.stringify(f.save());
  assert.notStrictEqual(f.pay(f.d('rogueAcceptTask', { taskID: id, delOrder: 0 }), 'rogueAcceptTask').eRet, 1,
    '肉鸽口领过的任务不许再接');
  assert.strictEqual(JSON.stringify(f.save()), snap, '被拒时存档必须逐字节不变');
});

T('【堵口·任意 id】delegateTask 不许把"不是任务"的数字塞进 accepted', () => {
  const f = freshServer();
  const snap = JSON.stringify(f.save());
  assert.notStrictEqual(f.pay(f.d('delegateTask', { taskID: 987654321, equipID: 0 }), 'delegateTask').eRet, 1,
    '不存在的任务 id 不许接');
  assert.strictEqual(JSON.stringify(f.save()), snap, '被拒时存档必须逐字节不变');
});

T('环任务 id 仍可正常接（堵口不能把环任务本身堵死）', () => {
  const f = freshServer();
  const rows = f.pay(f.d('getCircleTaskList', {}), 'getCircleTaskList').taskArr;
  assert.ok(rows.length > 0);
  assert.strictEqual(f.pay(f.d('acceptCircleTask', { taskID: rows[0].id, flag: 0 }), 'acceptCircleTask').eRet, 1,
    '投射出来的环任务必须能接');
});

console.log('\n[c02-smoke] 通过 ' + pass + '/' + (pass + fails.length));
if (fails.length) { console.error('失败项:\n' + fails.map((f) => ' - ' + f).join('\n')); process.exit(1); }
console.log('C02 SMOKE PASSED');
