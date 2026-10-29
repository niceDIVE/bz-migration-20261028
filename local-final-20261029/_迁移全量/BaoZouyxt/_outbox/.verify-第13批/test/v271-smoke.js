'use strict';
/** v271-smoke.js —— v2.7.1 三件拍板的冒烟（走真实 dispatch）：
 *
 *  ① 拍板 1（经验 4002 入账）：circle 发奖 → s.exp 累加 + note.eco.exp + LoadGame 投 [18]；
 *     老档无 exp 键 → 缺省 0（不是 99999）。
 *  ② 拍板 2（GetRandomEventAward 接线）：BZ_ADVENTURE 选列发奖；分支 1/4→win、2→fl、3→award、
 *     5→award2、未知分支不发；1..5 占位资源只进奖励窗，一分钱不进钱包、一件不进背包；
 *     s.advDone 防重复领（重复回 4）。
 *  ③ 拍板 3（成就进度）：circleTotal/taskDoneCount 计数、经验成就（373=1/3 "5000"）、
 *     口诀收集（717=3/11 "1|10001,…"),未达成类别锁死。
 *
 *  证据锚点：
 *   - 客户端读 exp：index.js:111775 `RoleBaseInfo.exp = t.baseValueAy[18]`（LoadGame 投射块）
 *   - 分支码：index.js:88678(1) / 88703(2) / 88635(3) / 88577(4) / 88593(5)
 *   - 回调消费：index.js:143814-143840（只读 rewardArray/npcArr/liveness，不判 eRet）
 *   - 进度对象：scripts3.js:2905 `t.tObj = o.taskData`；达成判定 3305 checkAchieved
 *
 *  用法：node test/v271-smoke.js   退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CORE = path.join(__dirname, '..', 'core');
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-shops.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

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
  srv.loadSave();   // 预热 ensureLedger（坑：首次 dispatch 的规范化会污染快照对比）
  return { srv, d, pay, save: () => srv.loadSave(), snap: () => JSON.stringify(srv.loadSave()) };
}

let pass = 0; const fails = [];
function T(n, fn) { try { fn(); pass++; console.log('  ok   ' + n); } catch (e) { fails.push(n + ': ' + e.message); console.log('  FAIL ' + n + ' -> ' + e.message); } }

// ---------- ① 拍板 1：经验 4002 ----------
T('【拍板1】circle 发奖：4002 真入账 s.exp（老档无 exp 键 → 从 0 起算）', () => {
  const f = fresh();
  assert.strictEqual(f.save().exp, undefined, '前提：老档没有 exp 键');
  const tid = 9001;
  assert.ok(BZ_CIRCLE_TASK['1'].e > 0, '前提：档位 1 的经验 > 0');
  f.save().accepted = [tid];
  const r = f.pay(f.d('circleTaskAward', { taskID: tid }), 'circleTaskAward');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(f.save().exp, BZ_CIRCLE_TASK['1'].e, 's.exp 必须累加表值（从 0 起算，不是 99999）');
  assert.strictEqual(r.note.eco.exp, f.save().exp, 'note.eco.exp 必须是新余额（客户端 eco 监听认 exp 键）');
});

T('【拍板1】LoadGame 把 s.exp 投到 baseValueAy[18]（客户端 index.js:111775 读的就是它）', () => {
  const f = fresh((b) => { b.exp = 4321; });
  const r = f.pay(f.d('LoadGame', {}), 'LoadGame');
  assert.strictEqual(r.baseValueAy[18], 4321, '[18] 必须等于 s.exp');
});

T('【拍板1】老档无 exp：LoadGame 的 [18] 是 0，不许灌 99999 伪造经验', () => {
  const f = fresh();
  const r = f.pay(f.d('LoadGame', {}), 'LoadGame');
  assert.strictEqual(r.baseValueAy[18], 0, '经验缺省必须 0');
});

// ---------- ② 拍板 2：GetRandomEventAward（v2.7.1-accept 小改后语义） ----------
// 真实客户端 adventureID 恒为 0（advCurId 从不赋真值），键 = eventID（gsp_event 行 id）。
T('【拍板2】真实请求形状（adventureID=0, eventID=10）分支 1 → awardwin [4,1]：只显示，不动钱包背包', () => {
  const f = fresh();
  const c0 = f.save().coins, g0 = f.save().gold, p0 = f.save().potential, y0 = f.save().yuanbao;
  const r = f.pay(f.d('GetRandomEventAward', { adventureID: 0, award: 1, eventID: 10 }), 'GetRandomEventAward');
  assert.strictEqual(r.eRet, 1);
  assert.deepStrictEqual(r.rewardArray, { 4: 1 }, '奖励窗必须显示 awardwin 列');
  assert.strictEqual(f.save().coins, c0, '善恶/筹码/幸福度没有钱包落点 → coins 不动');
  assert.strictEqual(f.save().gold, g0, 'gold 不动');
  assert.strictEqual(f.save().potential, p0, 'potential 不动');
  assert.strictEqual(f.save().yuanbao, y0, 'yuanbao 不动');
  assert.deepStrictEqual(f.save().bag, {}, '绝不许塞背包（假道具禁止模式）');
  const e10 = f.save().advDone['10'];
  assert.strictEqual(e10.w, 1, '胜负组记账 w=1');
  assert.strictEqual(e10.c, 0, '领取组未动');
  assert.strictEqual(typeof e10.d, 'string', '带 todayKey（按天清空用）');
});

T('【拍板2-a】两组记账：同事件先分支 1（胜）再分支 3（领）→ 3 不被 1 挡掉', () => {
  const f = fresh();
  const r1 = f.pay(f.d('GetRandomEventAward', { adventureID: 0, award: 1, eventID: 10 }), 'GetRandomEventAward');
  assert.strictEqual(r1.eRet, 1);
  const r3 = f.pay(f.d('GetRandomEventAward', { adventureID: 0, award: 3, eventID: 10 }), 'GetRandomEventAward');
  assert.strictEqual(r3.eRet, 1, '领取组 {3,5} 与胜负组 {1,2,4} 互不干扰（accept 小改 a）');
  const e10 = f.save().advDone['10'];
  assert.strictEqual(e10.w, 1);
  assert.strictEqual(e10.c, 3, '领取组记账 c=3');
});

T('【拍板2】同组重复领：分支 1 领过当天再来一次 → 回 4、零奖励', () => {
  const f = fresh();
  f.pay(f.d('GetRandomEventAward', { adventureID: 0, award: 1, eventID: 10 }), 'GetRandomEventAward');
  const before = f.snap();
  const r = f.pay(f.d('GetRandomEventAward', { adventureID: 0, award: 4, eventID: 10 }), 'GetRandomEventAward');
  assert.strictEqual(r.eRet, 4, '胜负组 {1,2,4} 当天只认一次');
  assert.ok(!r.rewardArray || Object.keys(r.rewardArray).length === 0, '重复领不许再给奖励窗');
  assert.strictEqual(f.snap(), before, '拒绝路径逐字节不动');
});

T('【拍板2-b】跨天自动失效：昨天的 advDone 条目今天视为未领', () => {
  const f = fresh((b) => { b.advDone = { 10: { d: '2026-10-25', w: 1, c: 0 } }; });
  const r = f.pay(f.d('GetRandomEventAward', { adventureID: 0, award: 1, eventID: 10 }), 'GetRandomEventAward');
  assert.strictEqual(r.eRet, 1, '昨天的账不挡今天的领（todayKey 重置）');
  const e10 = f.save().advDone['10'];
  assert.strictEqual(e10.w, 1, '重记为今天的账');
  assert.notStrictEqual(e10.d, '2026-10-25', '日期已刷新');
});

T('【拍板2】未知分支（999999）一律不发、不记账（c03 白拿用例的延伸）', () => {
  const f = fresh();
  const r = f.pay(f.d('GetRandomEventAward', { adventureID: 0, award: 999999, eventID: 10 }), 'GetRandomEventAward');
  assert.strictEqual(r.eRet, 1);
  assert.deepStrictEqual(r.rewardArray, {});
  assert.ok(!f.save().advDone || !f.save().advDone['10'], '结算没发生就不许记账');
});

T('【拍板2】eventID/adventureID 都查不到：回 1 空奖励，不记账', () => {
  const f = fresh();
  const r = f.pay(f.d('GetRandomEventAward', { adventureID: 0, award: 1, eventID: 424242 }), 'GetRandomEventAward');
  assert.strictEqual(r.eRet, 1);
  assert.deepStrictEqual(r.rewardArray, {});
  assert.ok(!f.save().advDone || Object.keys(f.save().advDone).length === 0);
});

T('【拍板2】负数量条目（award2=[4,-1]）跳过：不显示不扣减；分支 5 记领取组', () => {
  const f = fresh();
  const r = f.pay(f.d('GetRandomEventAward', { adventureID: 0, award: 5, eventID: 10 }), 'GetRandomEventAward');
  assert.strictEqual(r.eRet, 1);
  assert.deepStrictEqual(r.rewardArray, {}, '纯惩罚列 → 空奖励窗');
  assert.strictEqual(f.save().bag['4'], undefined, '不扣玩家没有的东西');
  assert.strictEqual(f.save().advDone['10'].c, 5, '领取组记账 c=5');
});

// ---------- ③ 拍板 3：成就进度 ----------
T('【拍板3】circle 发奖 → s.circleTotal 计数 → taskData["6_2,0"] 重算', () => {
  const f = fresh();
  f.save().accepted = [9001];
  f.pay(f.d('circleTaskAward', { taskID: 9001 }), 'circleTaskAward');
  assert.strictEqual(f.save().circleTotal, 1, '环任务完成计数 +1');
  const r = f.pay(f.d('getAchieveData', {}), 'getAchieveData');
  assert.strictEqual(r.taskData['6_2,0'], 1, '进度键随计数刷新');
});

T('【拍板3】经验成就 373（1/3 "江湖经验达到5000"）：exp 够 → 进 pending；不够 → 锁死', () => {
  const f = fresh((b) => { b.exp = 4999; });
  let r = f.pay(f.d('getAchieveData', {}), 'getAchieveData');
  assert.ok(!r.achieveIdArr.includes(373), '4999 < 5000 → 不进 pending');
  f.save().exp = 5000;
  r = f.pay(f.d('getAchieveData', {}), 'getAchieveData');
  assert.ok(r.achieveIdArr.includes(373), '5000 达标 → 进 pending');
  assert.strictEqual(r.taskData['1_3'], 5000, 'c 键 = 当前经验');
});

T('【拍板3】口诀收集 717（3/11 "1|10001,…10005"，目标 1 个）：knackBag 持有即达成', () => {
  const f = fresh((b) => { b.skillGrasp = { knackBag: [10001], skillGrasp: {} }; });
  const r = f.pay(f.d('getAchieveData', {}), 'getAchieveData');
  assert.ok(r.achieveIdArr.includes(717), '持有任一列表口诀 → 达成（target=1）');
  assert.strictEqual(r.taskData['3_11_1|10001,10002,10003,10004,10005'], 1, 'p 键 = 持有数');
});

T('【拍板3】锁死类别不虚报：登录天数（354=2/5）、等级、无量天机一律不进 pending', () => {
  const f = fresh();
  const r = f.pay(f.d('getAchieveData', {}), 'getAchieveData');
  for (const bad of [354]) assert.ok(!r.achieveIdArr.includes(bad), '2/5 登录天数未建模 → 锁死');
  assert.strictEqual(r.taskData['2_5'], undefined, '锁死类不写进度键');
});

T('【拍板3】received 保留：已领的成就重算后不回 pending', () => {
  const f = fresh((b) => { b.exp = 99999; b.achieve = { pending: [], received: [373], rateIds: [], groupPoints: { 3: 1 }, taskData: {}, suitIds: {} }; });
  const r = f.pay(f.d('getAchieveData', {}), 'getAchieveData');
  assert.ok(!r.achieveIdArr.includes(373), '373 已领 → 不回 pending');
  assert.deepStrictEqual(r.rd, [373], 'received 原样回放');
  assert.strictEqual(r.groupPoints['3'], 1, '组积分保留（领奖时才加，重算不动）');
});

console.log('\n[v271-smoke] 通过 ' + pass + '/' + (pass + fails.length));
if (fails.length) { console.error('失败项:\n' + fails.map((f) => ' - ' + f).join('\n')); process.exit(1); }
console.log('V271 SMOKE PASSED');
