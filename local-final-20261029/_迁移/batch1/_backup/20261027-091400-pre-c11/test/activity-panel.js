'use strict';
/**
 * activity-panel.js —— 主页活动面板回归（2026-10-22 活动面板批次）
 *
 * 根因（已回源码核对）：
 *   HomeActiveUI.onLoad → GrowthModel.getActiveSortData(data)（index.js:55347-55357）为每个
 *   active_order 行调 getActiveState(data, number, active)（55358-55373）：
 *     - 1001（七日活动）需要 RoleOtherInfo.activeObj[0] 真；
 *     - 1002（每日任务）需要 activeObj[0] <= 0；
 *     - 1003/1004（首充/新手礼包）由 HomeActiveModel.activeShowList 控制。
 *   activeObj 来自 LoadGame.activityArrFlag（setRoleInfo index.js:107227）；
 *   每日任务内容来自 getActivityCounts.dataArr —— DailyMissionUI.start 把它当**标量数组**
 *   （scripts2.js:17184-17197），旧实现回 `{}`（对象）→ `.length` 为 undefined → 一条都不渲染。
 *
 * 断言：
 *   T1 LoadGame 带 activityArrFlag=[0,0]（每日任务模式）
 *   T2 getActivityCounts：dataArr 是长度 = daily_active_tips 行数（18）的全 0 标量数组
 *   T3 getAllActivity：activityList 为空（不引其它活动 tab）、activityShows=[0,0]（关掉首充/礼包）
 *   T4 getActivityCounts：SevenDaysArr 是数组、school 两开关为 0
 *   T5 形状契约不被 fillShape 破坏：三个应答都在 User.<动作> 里
 *
 * 跑法：node test/activity-panel.js   退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

function makeEnv() {
  const store = new Map();
  return {
    readSave: (k) => (store.has(k) ? store.get(k) : null),
    writeSave: (k, t) => store.set(k, t),
    log: () => {},
    now: () => 1792612412000,
    templates: TPL,
  };
}
const inner = (r, k) => r['User.' + k] || {};
const DUMPS = path.join(__dirname, '..', '..', 'tools', 'cfg', 'dump');

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 LoadGame 带 activityArrFlag=[0,0]', () => {
  const s = createBzServer(makeEnv());
  const i = inner(s.dispatch('User', 'LoadGame', {}), 'LoadGame');
  assert.deepStrictEqual(i.activityArrFlag, [0, 0], 'activeObj[0]=0 → 走每日任务（1002 tab）');
});

T('T2 getActivityCounts：dataArr 长度 = daily_active_tips 行数、全 0', () => {
  const tips = JSON.parse(fs.readFileSync(path.join(DUMPS, 'daily_active_tips.json'), 'utf8'));
  const rows = tips.data || tips.table || {};
  const n = Object.keys(rows).length;
  assert.ok(n > 0);
  const s = createBzServer(makeEnv());
  const i = inner(s.dispatch('User', 'getActivityCounts', {}), 'getActivityCounts');
  assert.ok(Array.isArray(i.dataArr), 'dataArr 必须是数组（DailyMissionUI 读 .length）');
  assert.strictEqual(i.dataArr.length, n, '长度必须 = daily_active_tips 行数 ' + n);
  assert.ok(i.dataArr.every((v) => v === 0), '全部为 0（零进度，不造假）');
});

T('T3 getAllActivity：activityList 空、activityShows=[0,0]', () => {
  const s = createBzServer(makeEnv());
  const i = inner(s.dispatch('User', 'getAllActivity', {}), 'getAllActivity');
  assert.deepStrictEqual(i.activityList, [], '不引其它活动 tab（checkActive 才认它）');
  assert.deepStrictEqual(i.activityShows, [0, 0], '关掉 1003 首充 / 1004 礼包 tab');
});

T('T4 getActivityCounts：SevenDaysArr 数组、school 开关为 0', () => {
  const s = createBzServer(makeEnv());
  const i = inner(s.dispatch('User', 'getActivityCounts', {}), 'getActivityCounts');
  assert.ok(Array.isArray(i.SevenDaysArr));
  assert.strictEqual(i.schoolActivityOpen, 0);
  assert.strictEqual(i.schoolArenaOpen, 0);
});

T('T5 三个应答都落在 User.<动作> 里（信封形状）', () => {
  const s = createBzServer(makeEnv());
  for (const act of ['getAllActivity', 'getSevenTaskList', 'getActivityCounts']) {
    const r = s.dispatch('User', act, {});
    assert.ok(r['User.' + act] && typeof r['User.' + act] === 'object', act + ' 必须包在 User.' + act + ' 里');
    assert.strictEqual(r['User.' + act].eRet, 1, act + ' eRet 必须 1');
  }
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[activity] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
