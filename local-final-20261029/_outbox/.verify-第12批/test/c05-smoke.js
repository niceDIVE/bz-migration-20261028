'use strict';
/** 第 2 批 C05〔道具使用〕功能冒烟：12 个新 handler 走真实 dispatch 全链路。
 *  与 r14-catch-smoke 的区别：那个测"空/毒请求不许抛、eRet 必须登记"，
 *  这个测"正常请求真的按设计改档、拒绝请求真的不动档"。
 *  用法：node test/c05-smoke.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
/* 生成表（BZ_SNOWMAN / BZ_SQUARE_BALL / BZ_SHAPES …）在线上是打包进 handlers.js 的普通 var，
 * 独立 require 的测试环境里必须显式 runInThisContext 注入，否则 handler 走 typeof 守卫 → 当作没有表。
 * （本测试第一版没注入，导致 UseAllBall/getSnowAward 的奖励分支被静默跳过 —— 是测试台的锅，不是 handler 的锅。） */
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-shops.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-shapes.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

function makeEnv(seed, key) {
  const store = new Map();
  const logs = [];
  if (seed && key) store.set(key, JSON.stringify(seed));
  return {
    env: {
      readSave: (k) => (store.has(k) ? store.get(k) : null),
      writeSave: (k, t) => store.set(k, t),
      log: (m) => logs.push(m),
      now: () => 1792612412000,
      templates: TPL,
    },
    store, logs,
  };
}
/* ⚠ 存档键必须问服务器要（_internal.SAVE_KEY）。写死 'bz_offline_save_v1' 是旧 bz-rpc-core 的键，
 * 用错键的后果是"种子完全没进档、每个成功路径都落到拒绝分支"——本测试第一版就是这么翻车的。 */
const SAVE_KEY = createBzServer(makeEnv().env)._internal.SAVE_KEY;
function baseSave(over) {
  const s = {
    roleID: 16374, name: 'FZhou', saveVersion: 4,
    accepted: [], done: [], rewarded: [], skills: {},
    baseValueAy: [], bag: { 7602: 10 }, playerEquip: {}, equipments: {},
    potential: 102499, coins: 1000, gold: 1000, yuanbao: 100,
    bloodArr: [], fosterArr: [], contribution: 99999, school: 1,
    schoolContribution: {}, hunger: 50, mounts: {}, mountShow: 0,
    marketBuyTimes: {}, passCardLevel: 0, passLiveness: 0, passAward: {},
    growthClaim: {}, growthBigPaid: 0,
    snowBall: 50, snowBox: 3, snowLevel: 1, snowHp: 1000,
    rogueBag: { 1001: 5 },
  };
  return Object.assign(s, over || {});
}
function payload(r, act) { return r['User.' + act]; }
let pass = 0; const fails = [];

function T(name, fn) {
  try { fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { fails.push(name + ': ' + e.message); console.log('  FAIL ' + name + ' -> ' + e.message); }
}

const { env, store } = makeEnv(baseSave(), SAVE_KEY);
const s = createBzServer(env);
const d = (a, p) => s.dispatch('User', a, p || {});

// ---------- 雪球线 ----------
T('enterSnow 回 hp/boxnum', () => {
  const r = payload(d('enterSnow', { roleID: 16374 }), 'enterSnow');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(r.hp, 1000);
  assert.strictEqual(r.boxnum, 3);
});

T('UseSnowBall 扣 1 球、hp +100', () => {
  const r = payload(d('UseSnowBall', { roleID: 16374, type: 1 }), 'UseSnowBall');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(r.hp, 1100);
  assert.strictEqual(s.loadSave().snowBall, 49);
});

T('UseBatchSnowBall(3) 扣 3 球、hp +300', () => {
  const r = payload(d('UseBatchSnowBall', { roleID: 16374, type: 1, batchType: 3 }), 'UseBatchSnowBall');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(r.hp, 1400);
  assert.strictEqual(s.loadSave().snowBall, 46);
});

T('UseAllBall 清空雪球 + 发 square_ball 奖励(10558)', () => {
  const r = payload(d('UseAllBall', {}), 'UseAllBall');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(s.loadSave().snowBall, 0);
  assert.ok(r.rewardArray && r.rewardArray['10558'] > 0, 'rewardArray 应含 10558，实得 ' + JSON.stringify(r && r.rewardArray));
  assert.ok((s.loadSave().bag['10558'] || 0) > 0, '10558 应真进背包');
});

T('getSnowAward 货币进钱包不进背包（4001/4003）', () => {
  const before = { coins: s.loadSave().coins, pot: s.loadSave().potential, bag: JSON.stringify(s.loadSave().bag) };
  const r = payload(d('getSnowAward', { roleID: 16374 }), 'getSnowAward');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(s.loadSave().snowBox, 2, '盒子应 3→2');
  assert.strictEqual(s.loadSave().coins, before.coins + 10, '银两应 +10');
  assert.strictEqual(s.loadSave().potential, before.pot + 5, '潜能应 +5');
  const after = s.loadSave().bag;
  assert.strictEqual(after['4001'], undefined, '4001 不许进背包');
  assert.strictEqual(after['4003'], undefined, '4003 不许进背包');
});

// ---------- 肉鸽 ----------
T('rgUseItem 扣肉鸽背包、回 mpnum', () => {
  const r = payload(d('rgUseItem', { itemID: 1001, itemNum: 1, curMp: 77 }), 'rgUseItem');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(r.mpnum, 77);
  assert.strictEqual(s.loadSave().rogueBag['1001'], 4);
});

T('rgSycnWaitData 只回成功', () => {
  const r = payload(d('rgSycnWaitData', { waitTr: 1 }), 'rgSycnWaitData');
  assert.strictEqual(r.eRet, 1);
});

// ---------- 道具附加 ----------
T('useItemAddition 扣 7602、回 itemAddition(百分点,每件10)', () => {
  const r = payload(d('useItemAddition', { count: 2 }), 'useItemAddition');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(r.itemAddition, 20, '2 件 = 20 个百分点（scripts2.js:607 每件 10%）');
  assert.strictEqual(s.loadSave().bag['7602'], 8);
});

// ---------- 登录/门派/挂机 ----------
T('BackToLogin 只回成功', () => {
  assert.strictEqual(payload(d('BackToLogin', { account: 'x' }), 'BackToLogin').eRet, 1);
});

T('accountLogOff 只回成功且不动档', () => {
  const snap = JSON.stringify(s.loadSave());
  assert.strictEqual(payload(d('accountLogOff', {}), 'accountLogOff').eRet, 1);
  assert.strictEqual(JSON.stringify(s.loadSave()), snap, 'accountLogOff 不许改存档');
});

T('quitSchool 只清 school、保留 contribution', () => {
  const r = payload(d('quitSchool', {}), 'quitSchool');
  assert.strictEqual(r.eRet, 1);
  assert.strictEqual(s.loadSave().school, 0);
  assert.strictEqual(s.loadSave().contribution, 99999, '贡献必须保留（保守策略）');
});

T('CheckOnHook 回 OnhookObj', () => {
  const r = payload(d('CheckOnHook', {}), 'CheckOnHook');
  assert.strictEqual(r.eRet, 1);
  assert.ok(r.OnhookObj && typeof r.OnhookObj === 'object');
});

// ---------- 拒绝路径：不许动档，且被 narrowReject 剥到只剩 eRet ----------
T('雪球耗尽后 UseSnowBall 回 eRet:0 且不动档', () => {
  const snap = JSON.stringify(s.loadSave());
  const r = payload(d('UseSnowBall', { roleID: 16374, type: 1 }), 'UseSnowBall');
  assert.strictEqual(r.eRet, 0);
  assert.deepStrictEqual(Object.keys(r), ['eRet'], '拒绝应答应被收窄到只剩 eRet，实得 ' + JSON.stringify(r));
  assert.strictEqual(JSON.stringify(s.loadSave()), snap, '拒绝不许动档');
});

T('盒子耗尽后 getSnowAward 回 eRet:4 且不动档', () => {
  const st = s.loadSave(); st.snowBox = 0;
  const snap = JSON.stringify(s.loadSave());
  const r = payload(d('getSnowAward', {}), 'getSnowAward');
  assert.strictEqual(r.eRet, 4);
  assert.strictEqual(JSON.stringify(s.loadSave()), snap, '拒绝不许动档');
});

T('7602 耗尽后 useItemAddition 回 eRet:5 且不动档（绝不白给）', () => {
  const st = s.loadSave(); st.bag['7602'] = 0;
  const snap = JSON.stringify(s.loadSave());
  const r = payload(d('useItemAddition', { count: 1 }), 'useItemAddition');
  assert.strictEqual(r.eRet, 5);
  assert.strictEqual(JSON.stringify(s.loadSave()), snap, '拒绝不许动档');
});

T('肉鸽背包空后 rgUseItem 回 eRet:4 且不动档', () => {
  const st = s.loadSave(); st.rogueBag = {};
  const snap = JSON.stringify(s.loadSave());
  const r = payload(d('rgUseItem', { itemID: 1001, itemNum: 1 }), 'rgUseItem');
  assert.strictEqual(r.eRet, 4);
  assert.strictEqual(JSON.stringify(s.loadSave()), snap, '拒绝不许动档');
});

console.log('\n[c05-smoke] 通过 ' + pass + '/' + (pass + fails.length));
if (fails.length) { console.error('失败项:\n' + fails.map((f) => ' - ' + f).join('\n')); process.exit(1); }
console.log('C05 SMOKE PASSED ✅');
