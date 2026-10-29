'use strict';
/** c04-smoke.js —— 第 6 批 C04〔婚姻子女〕冒烟（走真实 dispatch）。
 *
 *  覆盖：
 *   ① §5.1 注册名 ≠ 线上名（17 个线上名在 H、注册名不在）。
 *   ② 状态机：proposeNpc → marryNpc → divorceNpc 全链（含未提亲/已婚/未婚拒绝码）。
 *   ③ 婚礼/同床：beginWedding、makeLove（未婚拒、choose 白名单、makeID 显示型）。
 *   ④ marryAward 白拿闸：宾客礼金回空 rewardArray，一个子儿不发。
 *   ⑤ 子系统锁死 13 动作：各自拒绝码 + 存档逐字节不动（含 UserWifeProp 不扣道具）。
 *   ⑥ LoadGame 回放：s.marryObj 的婚姻状态投射回客户端。
 *
 *  取证：batch6-facts-20261026/scoutA-reqkeys.md（21 节逐字段）。
 *  用法：node test/c04-smoke.js
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
    baseValueAy: [], bag: { 5001: 3 }, playerEquip: {}, equipments: {},
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
  srv.loadSave();   // 预热 ensureLedger
  // 预热②：getAchieveData 会真跑 ensureLedger（规范化 contribution/passCardLevel 等），
  // 不预热的话第一个锁动作的规范化会被误判成"锁死动作改了档"（坑表 §4，c16 同款）。
  srv.dispatch('User', 'getAchieveData', {});
  return { srv, d, pay, save: () => srv.loadSave(), snap: () => JSON.stringify(srv.loadSave()) };
}

let pass = 0; const fails = [];
function T(n, fn) { try { fn(); pass++; console.log('  ok   ' + n); } catch (e) { fails.push(n + ': ' + e.message); console.log('  FAIL ' + n + ' -> ' + e.message); } }

const SHIPPED = [
  ['proposeNpc', 'PROPOSE_NPC'], ['marryNpc', 'MARRY_NPC_EVENT'], ['divorceNpc', 'DIVORCENPC'],
  ['beginWedding', 'BEGIN_WEDDING'], ['marryAward', 'MARRY_AWARD'], ['makeLove', 'MAKE_LOVE'],
  ['birthChild', 'BIRTHCHILD'], ['chooseSex', 'CHOOSE_SEX'], ['adoptChild', 'ADOPTCHILD'],
  ['giveChildName', 'GIVE_CHILD_NAME'], ['childWashProperty', 'CHILD_WASH_EVENT'],
  ['resetChildFoster', 'RESET_CHILD_FOSTER'], ['addChildFoster', 'ADD_CHILD_FOSTER'],
  ['upgradeWifeLevel', 'UPGRADE_WIFE_LEVEL'], ['UserWifeProp', 'USE_WIFE_PROP'],
  ['ChooseGirl', 'CHOOSE_GIRL_EVENT'], ['Whoring', 'WHORING_EVENT'],
  ['GetWhoreData', 'WHORING_GIRL_EVENT'], ['getLikeEvent', 'INVITE_NPC_GETLIKE'],
  ['optionLikeEvent', 'INVITE_NPC_OPTION'],
];

T('【§5.1 原故障重现】20 个线上名都在 H 里，且注册名都不在', () => {
  const f = fresh();
  const H = f.srv._internal.handlers;
  const wrong = [];
  for (const [wire, reg] of SHIPPED) {
    if (typeof H[wire] !== 'function') wrong.push('缺线上名 ' + wire);
    if (Object.prototype.hasOwnProperty.call(H, reg)) wrong.push('误把注册名当键 ' + reg);
  }
  assert.deepStrictEqual(wrong, [], wrong.join(' | '));
});

// ---------- 状态机 ----------
T('提亲：合法 NPC(1007) → eRet 1 入册；重复提亲幂等；非法 NPC → 12', () => {
  const f = fresh();
  const r1 = f.pay(f.d('proposeNpc', { npcID: 1007 }), 'proposeNpc');
  assert.strictEqual(r1.eRet, 1);
  assert.ok(f.save().marryObj.proposeNpc.indexOf(1007) >= 0, '提亲必须入册');
  const r2 = f.pay(f.d('proposeNpc', { npcID: 1007 }), 'proposeNpc');
  assert.strictEqual(r2.eRet, 1);
  assert.strictEqual(f.save().marryObj.proposeNpc.filter((x) => x === 1007).length, 1, '不许重复入册');
  const r3 = f.pay(f.d('proposeNpc', { npcID: 9999 }), 'proposeNpc');
  assert.strictEqual(r3.eRet, 12, '不在 propose.json → 12（getText(1166)）');
});

T('结婚：未提亲 → 4；提亲后 → 1 且写 marryNpc/marryTime；再婚 → 3', () => {
  const f = fresh();
  const r0 = f.pay(f.d('marryNpc', { npcID: 1007, flag: 1 }), 'marryNpc');
  assert.strictEqual(r0.eRet, 4, '未提亲不许结（getText(1135)）');
  f.pay(f.d('proposeNpc', { npcID: 1007 }), 'proposeNpc');
  const r1 = f.pay(f.d('marryNpc', { npcID: 1007, flag: 1 }), 'marryNpc');
  assert.strictEqual(r1.eRet, 1);
  const m = f.save().marryObj;
  assert.strictEqual(m.marryNpc, 1007);
  assert.ok(typeof m.marryTime === 'number' && m.marryTime > 0, 'marryTime 必须写');
  const r2 = f.pay(f.d('marryNpc', { npcID: 1011, flag: 1 }), 'marryNpc');
  assert.strictEqual(r2.eRet, 3, '已婚再婚 → 3（getText(1137)）');
  assert.strictEqual(f.save().marryObj.marryNpc, 1007, '配偶不许被改');
});

T('离婚：未婚 → 2；已婚 → 1 + 婚姻字段回初值 + childObj 保留', () => {
  const f = fresh((b) => { b.marryObj = null; b.childObj = undefined; });
  const r0 = f.pay(f.d('divorceNpc', {}), 'divorceNpc');
  assert.strictEqual(r0.eRet, 2, '未婚离婚 → getText(1139)');
  f.pay(f.d('proposeNpc', { npcID: 1007 }), 'proposeNpc');
  f.pay(f.d('marryNpc', { npcID: 1007, flag: 1 }), 'marryNpc');
  f.save().marryObj.childObj = { childName: '小狗蛋' };
  const r1 = f.pay(f.d('divorceNpc', {}), 'divorceNpc');
  assert.strictEqual(r1.eRet, 1);
  assert.strictEqual(r1.npcID, 1007, '回旧配偶 id');
  const m = f.save().marryObj;
  assert.strictEqual(m.marryNpc, 0, '婚姻字段回初值');
  assert.deepStrictEqual(m.proposeNpc, [], '提亲册清空');
  assert.deepStrictEqual(m.childObj, { childName: '小狗蛋' }, 'childObj 保留（孩子无辜）');
});

T('婚礼/同床：未婚 → 2；已婚 beginWedding → 1、makeLove → 1 + makeID + 经验；choose 非法 → 2', () => {
  const f = fresh();
  assert.strictEqual(f.pay(f.d('beginWedding', {}), 'beginWedding').eRet, 2, '未婚不办婚礼');
  assert.strictEqual(f.pay(f.d('makeLove', { choose: 3 }), 'makeLove').eRet, 2, '未婚拒绝');
  f.pay(f.d('proposeNpc', { npcID: 1007 }), 'proposeNpc');
  f.pay(f.d('marryNpc', { npcID: 1007, flag: 1 }), 'marryNpc');
  assert.strictEqual(f.pay(f.d('beginWedding', {}), 'beginWedding').eRet, 1);
  const r = f.pay(f.d('makeLove', { choose: 3 }), 'makeLove');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(r.makeID, 3, 'makeID 显示型（make.json 档位）');
  assert.strictEqual(f.save().exp, 50, '经验进 s.exp（自定 50/次，拍板 makeLove）');
  assert.strictEqual(r.note.eco.exp, 50, 'eco.exp 新余额');
  assert.strictEqual(f.pay(f.d('makeLove', { choose: 99 }), 'makeLove').eRet, 2, 'choose 不在 make.json → 2');
});

T('【拍板】makeLove 每日 5 次上限：第 6 次 → 2，经验封顶 250', () => {
  const f = fresh();
  f.pay(f.d('proposeNpc', { npcID: 1007 }), 'proposeNpc');
  f.pay(f.d('marryNpc', { npcID: 1007, flag: 1 }), 'marryNpc');
  for (let i = 1; i <= 5; i++) {
    const r = f.pay(f.d('makeLove', { choose: (i % 5) + 1 }), 'makeLove');
    assert.strictEqual(r.eRet, 1, '第 ' + i + ' 次应成功');
  }
  assert.strictEqual(f.save().exp, 250, '5 次 × 50 = 250');
  const before = f.snap();
  const r6 = f.pay(f.d('makeLove', { choose: 1 }), 'makeLove');
  assert.strictEqual(r6.eRet, 2, '第 6 次 → 2（每日上限，防刷经验）');
  assert.strictEqual(f.save().exp, 250, '超限不加经验');
  assert.strictEqual(f.snap(), before, '拒绝路径逐字节不动');
});

// ---------- 白拿闸 ----------
T('【白拿】marryAward 宾客礼金：ack 但 rewardArray 空，一个子儿不发', () => {
  const f = fresh();
  const c0 = f.save().coins, g0 = f.save().gold, y0 = f.save().yuanbao, p0 = f.save().potential;
  const r = f.pay(f.d('marryAward', { guestID: 1011 }), 'marryAward');
  assert.strictEqual(r.eRet, 1);
  assert.deepStrictEqual(r.rewardArray, {}, '礼金无服务端表 → 空（少发方向）');
  assert.strictEqual(f.save().coins, c0); assert.strictEqual(f.save().gold, g0);
  assert.strictEqual(f.save().yuanbao, y0); assert.strictEqual(f.save().potential, p0);
});

// ---------- 子系统锁死 ----------
const LOCKS = [
  ['birthChild', {}, 2], ['chooseSex', { sex: 1 }, 3], ['adoptChild', { adoptChildSex: 1 }, 2],
  ['giveChildName', { childName: '测试' }, 2], ['childWashProperty', { attrID: 41 }, 2],
  ['resetChildFoster', { roleID: 16374 }, 4], ['addChildFoster', { type: 1 }, 2],
  ['upgradeWifeLevel', { lv: 1, exp: 0, pot: 0 }, 2], ['UserWifeProp', { propnum: 5001 }, 2],
  ['ChooseGirl', { npcID: 310003 }, 2], ['Whoring', { npcID: 310003, flag: 1, hglmt: 600 }, 2],
  ['optionLikeEvent', { isDelItem: 0 }, 2],
];
T('【锁死】12 个未建模子系统动作：各按登记拒绝码回，存档逐字节不动', () => {
  const f = fresh();
  const before = f.snap();
  for (const [act, p, code] of LOCKS) {
    const r = f.pay(f.d(act, p), act);
    assert.strictEqual(r.eRet, code, act + ' 应回 ' + code + '，实得 ' + r.eRet);
  }
  assert.strictEqual(f.save().bag['5001'], 3, 'UserWifeProp 不许扣道具');
  assert.strictEqual(f.snap(), before, '锁死动作一个字节不动');
});

T('【面板】GetWhoreData → 1 + girlData 空（面板能开零数据）；getLikeEvent → 4（客户端自有空态）', () => {
  const f = fresh();
  const r1 = f.pay(f.d('GetWhoreData', {}), 'GetWhoreData');
  assert.strictEqual(r1.eRet, 1);
  assert.deepStrictEqual(r1.girlData, {});
  const r2 = f.pay(f.d('getLikeEvent', {}), 'getLikeEvent');
  assert.strictEqual(r2.eRet, 4, '走客户端自有"无事件"流（dialog 1810121）');
});

// ---------- 回放 ----------
T('LoadGame 回放：结婚状态投射回 base.marryObj', () => {
  const f = fresh();
  f.pay(f.d('proposeNpc', { npcID: 1007 }), 'proposeNpc');
  f.pay(f.d('marryNpc', { npcID: 1007, flag: 1 }), 'marryNpc');
  const r = f.pay(f.d('LoadGame', {}), 'LoadGame');
  assert.strictEqual(r.marryObj.marryNpc, 1007, '婚姻状态必须回放');
  assert.ok(Array.isArray(r.marryObj.proposeNpc) && r.marryObj.proposeNpc.indexOf(1007) >= 0);
});

T('【拍板·accept2】领养全链：结婚 → 500 元宝先扣 → childObj 形状 → 取名；元宝不足/已有孩子 → 2', () => {
  const f = fresh();   // yuanbao=500，刚好够一次
  f.pay(f.d('proposeNpc', { npcID: 1007 }), 'proposeNpc');
  f.pay(f.d('marryNpc', { npcID: 1007, flag: 1 }), 'marryNpc');
  const r = f.pay(f.d('adoptChild', { adoptChildSex: 1 }), 'adoptChild');
  assert.strictEqual(r.eRet, 1, '元宝足够 → 领养成功');
  assert.strictEqual(f.save().yuanbao, 0, '先扣钱：500 全扣');
  const c = r.childObj;
  // 形状断言（每键对应 scoutC 读点出处）
  assert.strictEqual(c.sex, 1);
  assert.strictEqual(c.childName, '', 'childName 必须字符串（24867 读 .length）');
  assert.strictEqual(c.age, 0); assert.strictEqual(c.fatherLv, 0); assert.strictEqual(c.foster_point, 0);
  assert.ok(Array.isArray(c.playArr) && c.playArr.length >= 1, 'playArr 必须数组（s2:12255 length 循环）');
  assert.ok(Array.isArray(c.baseArr) && Array.isArray(c.addArr));
  assert.deepStrictEqual(f.save().marryObj.childObj, c, 'childObj 落盘');
  // 取名
  const rn = f.pay(f.d('giveChildName', { childName: '小狗蛋' }), 'giveChildName');
  assert.strictEqual(rn.eRet, 1);
  assert.strictEqual(f.save().marryObj.childObj.childName, '小狗蛋');
  // 已有孩子 → 2
  const r2 = f.pay(f.d('adoptChild', { adoptChildSex: 0 }), 'adoptChild');
  assert.strictEqual(r2.eRet, 2, '已有孩子不许再领');
  // 取名空串 → 99
  const r3 = f.pay(f.d('giveChildName', { childName: '  ' }), 'giveChildName');
  assert.strictEqual(r3.eRet, 99, '空名 → 99（getText 480）');
});

T('【拍板·accept2】领养元宝不足（499）→ 2 不写 childObj 不扣钱；birthChild 未妊娠 → 2', () => {
  const f = fresh((b) => { b.yuanbao = 499; });
  f.pay(f.d('proposeNpc', { npcID: 1007 }), 'proposeNpc');
  f.pay(f.d('marryNpc', { npcID: 1007, flag: 1 }), 'marryNpc');
  const before = f.snap();
  const r = f.pay(f.d('adoptChild', { adoptChildSex: 1 }), 'adoptChild');
  assert.strictEqual(r.eRet, 2, '元宝不足 → 2（openChargeList）');
  assert.strictEqual(f.save().yuanbao, 499, '不扣钱');
  assert.strictEqual(f.save().marryObj.childObj.childName, undefined, '不写 childObj（保持模板空对象）');
  assert.strictEqual(f.snap(), before, '拒绝路径逐字节不动');
  assert.strictEqual(f.pay(f.d('birthChild', {}), 'birthChild').eRet, 2, '未妊娠 → 2');
});

console.log('\n[c04-smoke] 通过 ' + pass + '/' + (pass + fails.length));
if (fails.length) { console.error('失败项:\n' + fails.map((f) => ' - ' + f).join('\n')); process.exit(1); }
console.log('C04 SMOKE PASSED');
