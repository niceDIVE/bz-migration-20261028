'use strict';
/**
 * overlay-projection.js —— P0「派生叠加」回归（R01 回执 §1 / §5，2026-10-22）
 *
 * 契约（四条断言，全部对着这份文件跑）：
 *   1. 接任务**不许**写存档背包（旧行为是 grantItem 差额 = 借款）；
 *   2. LoadGame / sycnPlayerItemData 的 itemObj = 真实背包 + 任务所需差额（只用于显示）；
 *   3. 交任务**不许**扣真实库存（客户端自己也不扣：index.jsc:134531 `case 2: break;`）；
 *   4. 叠加是**纯函数**：同一份存档算两遍完全一样，且全程不产生任何写档。
 *
 * 另有两条口径：同物品被多个任务要求时取 max 不累加（携带型）；货币/装备不进叠加。
 *
 * 跑法：node test/overlay-projection.js   退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
// 设备端是「生成物 + 服务器」拼在一个 bundle 里求值的，BZ_TASKS / BZ_ITEMTYPE 是全局；
// 单测里要先把生成物灌成全局，否则 taskMeta() 永远返回 null（协议层看着像"没有需求"）。
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

function makeEnv() {
  const store = new Map();
  const logs = [];
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

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }
const inner = (r, k) => (r && r[k]) || {};
const bag = (srv) => srv.loadSave().bag || {};
const loadObj = (srv) => inner(srv.dispatch('User', 'LoadGame', {}), 'User.LoadGame').itemObj || {};
const syncObj = (srv) => inner(srv.dispatch('User', 'sycnPlayerItemData', {}), 'User.sycnPlayerItemData').itemObj || {};

// 1. 接任务不写档，但投射里有差额
T('T1 接任务不写档 / 投射补差额', () => {
  const { env } = makeEnv(); const s = createBzServer(env);
  s.dispatch('User', 'acceptTask', { taskID: 100150 });            // SpRequire = 4015×1
  assert.strictEqual(bag(s)['4015'], undefined, '存档里不许出现借来的 4015');
  assert.strictEqual(loadObj(s)['4015'], 1, 'LoadGame 投射应补到 1');
  assert.strictEqual(syncObj(s)['4015'], 1, 'sycnPlayerItemData 投射应补到 1');
});

// 2. 已有真库存时不重复叠加（借差额，不是借全额）
T('T2 已有库存只补差额', () => {
  const { env } = makeEnv(); const s = createBzServer(env);
  s.dispatch('User', 'buyShopItem', { itemID: 4015, itemNum: 2 });
  s.dispatch('User', 'acceptTask', { taskID: 100150 });
  assert.strictEqual(bag(s)['4015'], 2, '真实库存不变');
  assert.strictEqual(loadObj(s)['4015'], 2, '投射不该变成 3');
});

// 3. 同一物品被两个任务要求 → max 不累加（携带型可以共用一份）
T('T3 多任务同物品取 max', () => {
  const { env } = makeEnv(); const s = createBzServer(env);
  s.dispatch('User', 'acceptTask', { taskID: 100180 });            // 4016×1
  s.dispatch('User', 'acceptTask', { taskID: 100190 });            // 4016×1
  assert.strictEqual(loadObj(s)['4016'], 1, '两个任务都要 1 个 → 仍是 1（不累加成 2）');
});

// 4. 货币不进叠加（客户端 getItemNum(4001) 走 coins 特判，塞 itemObj 无效）
T('T4 货币不进叠加', () => {
  const { env } = makeEnv(); const s = createBzServer(env);
  s.dispatch('User', 'acceptTask', { taskID: 101120 });            // 4001×100
  const o = loadObj(s);
  assert.strictEqual(o['4001'], undefined, '4001 是银两，不该出现在 itemObj');
});

// 5. 装备不进叠加（客户端对装备走 EqUtils.getEquipOrUid，查 PlayerEquip）
T('T5 装备不进叠加', () => {
  const { env } = makeEnv(); const s = createBzServer(env);
  s.dispatch('User', 'acceptTask', { taskID: 102580 });            // 1301×1（Type=1）
  const o = loadObj(s);
  assert.strictEqual(o['1301'], undefined, '装备不该被投进背包');
  assert.deepStrictEqual(s.loadSave().playerEquip || {}, {}, 'PlayerEquip 也不许凭空多出装备');
});

// 6. 交任务不扣真实库存；完成后叠加消失
T('T6 交任务不扣库存 / 叠加随任务消失', () => {
  const { env } = makeEnv(); const s = createBzServer(env);
  s.dispatch('User', 'buyShopItem', { itemID: 4015, itemNum: 2 });
  s.dispatch('User', 'acceptTask', { taskID: 100150 });
  s.dispatch('User', 'getFinishTaskAward', { taskID: 100150 });
  assert.strictEqual(bag(s)['4015'], 2, 'C=0：交任务不许扣 SpRequire');
  assert.strictEqual(loadObj(s)['4015'], 2, '完成后不再有叠加（真库存本来就是 2）');

  const { env: e2 } = makeEnv(); const s2 = createBzServer(e2);
  s2.dispatch('User', 'acceptTask', { taskID: 100150 });
  assert.strictEqual(loadObj(s2)['4015'], 1, '进行中 → 有叠加');
  s2.dispatch('User', 'getFinishTaskAward', { taskID: 100150 });
  assert.strictEqual(loadObj(s2)['4015'], undefined, '完成后叠加必须消失');
});

// 7. 纯函数：同一档算两遍一样，且 LoadGame/sycn 全程不写档
T('T7 叠加是纯函数 + 不写档', () => {
  const { env, store } = makeEnv(); const s = createBzServer(env);
  s.dispatch('User', 'acceptTask', { taskID: 100150 });
  s.dispatch('User', 'acceptTask', { taskID: 102930 });            // 4156/4157/4158 各 1
  const before = store.get('/bz_offline_save.json');
  const a = loadObj(s), b = loadObj(s), c = syncObj(s);
  assert.deepStrictEqual(a, b, '两次投射必须完全一致');
  assert.deepStrictEqual(a, c, 'LoadGame 与 sycnPlayerItemData 必须一致');
  assert.strictEqual(store.get('/bz_offline_save.json'), before, '投射不许产生写档');
});

// 8. 卖/用都只动真实库存，不会把叠加量花掉
T('T8 卖/用只结算真实库存', () => {
  const { env } = makeEnv(); const s = createBzServer(env);
  s.dispatch('User', 'acceptTask', { taskID: 100150 });            // 只有叠加的 4015×1
  s.dispatch('User', 'saleItem', { saleArr: [{ itemID: 4015, num: 1 }] });
  assert.strictEqual(bag(s)['4015'], undefined, '卖叠加物品不该写档');
  s.dispatch('User', 'useItem', { itemID: 4015, itemNum: 1 });
  assert.strictEqual(bag(s)['4015'], undefined, '用叠加物品不该写档');
  assert.strictEqual(loadObj(s)['4015'], 1, '叠加仍在（任务还在办）');
});

// 9. 存档格式没变（P0 不引入新字段 → 不需要 v5 迁移）
T('T9 存档格式不变', () => {
  const { env } = makeEnv(); const s = createBzServer(env);
  s.dispatch('User', 'acceptTask', { taskID: 100150 });
  const sv = s.loadSave();
  assert.strictEqual(sv.saveVersion, 4, 'saveVersion 必须仍是 4');
  for (const k of ['loans', 'borrowed', 'overlay']) assert.ok(!(k in sv), '不许往存档里加 ' + k);
});

(async () => {
  let pass = 0, fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String(e && e.message || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[overlay] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
