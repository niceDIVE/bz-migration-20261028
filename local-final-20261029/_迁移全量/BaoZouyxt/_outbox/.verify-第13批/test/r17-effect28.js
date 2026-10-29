'use strict';
/**
 * r17-effect28.js —— Effect 28（称号）落地 + 活动窗口平移（R17 §3 / §1 第 2 条）的回归
 *
 * 【Effect 28 = 称号，判据】
 *   ① 物品 7027 的名字 lang=2102250 =「"烙饼试吃员"称号」、7026 =「"测试员"称号」（live `LangMgr.getText` 实读）；
 *   ② `Data1` = 2044/2045 命中 `player_title` 表（该表 410 行、id 到 2388）；
 *   ③ 客户端对 28 **没有本地分支**：`switch (e.Effect)`（index.js:64321-64502）无 case 28、无 default →
 *      `64503 return !1` → `65553 useItemFunc` → `65333` 发 `User.useItem`（请求只带 {itemID,itemNum}）；
 *   ④ 成功回调读 `titleID`（index.js:64812）：
 *      `AchieveModel.getAchieveData().hasOwnProperty(a.titleID) ? show(3187) : AchieveModel.showTitleReward([a.titleID])`
 *   ⇒ 应答带 `titleID` = "获得称号"。
 *
 * 【活动窗口平移（时间炸弹）】
 *   `templates.json` 的 `create.activityResource` 是抓包真值（活动 67 结束 = 1793177770630 = 2026-10-28），
 *   静态值会让活动在几天后全部过期。现在按 `delta = now - 抓包时刻` 平移；本文件断言：
 *   ① `Create` / `LoadGame` 应答里的 `activityResource` 结束时间**都在未来**；
 *   ② 平移量恰好等于 `now - 抓包 serverTime`（不是随便加个大数）。
 *
 * 跑法：node test/r17-effect28.js   退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-tasks.generated.js'), 'utf8'));

const FX_SRC = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'tools', 'facts', 'item-effects.json'), 'utf8'));
const ITEMFX = {};
for (const id of Object.keys(FX_SRC.effects || {})) {
  const r = FX_SRC.effects[id];
  if (r && r.t === 2) ITEMFX[id] = [r.e || 0, r.d1 || 0, r.d2 || 0, r.d3 || 0];
}
global.BZ_ITEMFX = ITEMFX;

const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');
const NOW = 1792612412000;

function mk() {
  const store = new Map();
  const logs = [];
  const env = {
    readSave: (k) => (store.has(k) ? store.get(k) : null),
    writeSave: (k, t) => store.set(k, t),
    log: (m) => logs.push(String(m)),
    now: () => NOW,
    templates: TPL,
  };
  return { s: createBzServer(env), logs, store };
}
const inner = (r, k) => r['User.' + k] || {};

function pickEffect28() {
  const ids = Object.keys(ITEMFX).map(Number);
  const id = ids.find((i) => ITEMFX[i][0] === 28 && ITEMFX[i][1] > 0);
  return id ? { id, title: ITEMFX[id][1] } : null;
}

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 Effect 28 使用 → 应答带 titleID、物品 -1、称号入账（原故障：用掉但没有称号）', () => {
  const e28 = pickEffect28();
  assert.ok(e28, 'item-effects.json 里必须存在 Effect==28 且 Data1>0 的物品');
  const { s, logs } = mk();
  s.dispatch('User', 'bzSeedBag', { itemObj: { [e28.id]: 1 } });
  const got = inner(s.dispatch('User', 'useItem', { itemID: e28.id, itemNum: 1 }), 'useItem');
  assert.strictEqual(got.eRet, 1, '成功');
  assert.strictEqual(got.titleID, e28.title, '应答必须带 titleID=' + e28.title + '（客户端 64812 靠它弹 showTitleReward）');
  assert.strictEqual(s.loadSave().bag[e28.id], undefined, '消耗成功（归零即删键）');
  assert.strictEqual((s.loadSave().titles || {})[String(e28.title)], 1, '称号必须入账（重启后不丢）');
  assert.ok(logs.some((l) => l.indexOf('获得称号 ' + e28.title) >= 0), logs.slice(-2).join(' | '));
});

T('T2 背包里没有这件 Effect 28 → 不许凭空发称号（use=0 时 giveTitleId 必须为 0）', () => {
  const e28 = pickEffect28();
  const { s } = mk();
  const got = inner(s.dispatch('User', 'useItem', { itemID: e28.id, itemNum: 1 }), 'useItem');
  assert.strictEqual(got.eRet, 1, '空库存仍回 1（既有口径）');
  assert.strictEqual(got.titleID, undefined, '**没有消耗就不许发 titleID**');
  assert.strictEqual((s.loadSave().titles || {})[String(e28.title)], undefined, '不许写称号');
});

T('T3 活动窗口平移：Create / LoadGame 的 activityResource 结束时间都在未来，且平移量 = now - 抓包时刻', () => {
  const { s } = mk();
  const capture = Number(TPL.create.serverTime);
  assert.ok(capture > 1.6e12, '模板里必须有抓包 serverTime');
  const d = NOW - capture;
  const created = s.dispatch('User', 'Create', {});
  const ar = (created['User.Create'] || created).activityResource || created.activityResource;
  assert.ok(ar, 'Create 应答必须带 activityResource');
  const id67 = ar['67'];
  assert.ok(Array.isArray(id67) && typeof id67[1] === 'number', 'activity 67 应该是 [start,end]');
  assert.strictEqual(id67[1], 1793177770630 + d, '结束时间必须原值 + (now - 抓包时刻)');
  assert.ok(id67[1] > NOW, '平移后必须仍在未来（否则活动会立刻关闭）');
  // LoadGame 同口径
  const lg = s.dispatch('User', 'LoadGame', {});
  const base = lg['User.LoadGame'] || lg;
  const ar2 = base.activityResource;
  assert.ok(ar2 && Array.isArray(ar2['67']) && ar2['67'][1] > NOW, 'LoadGame 的 activityResource 也必须在未来');
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[r17-effect28] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
