'use strict';
/**
 * r18-titleobj-projection.js —— Move ①：称号投射（SOTA R18 §1-2 / 假设 A6 判伪）
 *
 * 【故障】客户端读称号的唯一入口是 LoadGame 的 `titleObj`：
 *     index.js:111919  n.AchieveModel.setAchieveData(e.hasOwnProperty("titleObj") ? e.titleObj : {});
 *   我方账本把称号写进 `s.titles[id]=1`（useItem 的 Effect 28 分支），但 LoadGame 从来不投这个字段，
 *   形状表里也没有它（`grep titleObj bz-shapes.generated.js` → 0 命中）⇒ 重启后 `playerTitle` 变回 {}，
 *   称号在界面上消失，而且再用一次同一件物品时客户端不会再弹 3187「已拥有」。
 *
 * 【值语义（全部读点核对）】
 *   index.js:635  getAchieveEndT: `playerTitle[t] > 1 ? playerTitle[t] : -1`   → 只把 >1 当"到期 ms"
 *   index.js:638  deleteTitle:    `playerTitle[t] > 1 && …`                    → 永久值必须不是 >1
 *   index.js:673  checkTitleBuff: `s = playerTitle[r] > 1 ? playerTitle[r] : -1` → -1 走 unlimited
 *   index.js:658  showTitleReward: 拿到新称号时写 **0**
 *   ⇒ 0/1 = 永久；>1 = 到期时间戳。我方账本 `1` = 永久 ⇒ 投 **0**（客户端自己的永久约定）。
 *
 * 跑法：node test/r18-titleobj-projection.js   退出码 0 = 全绿
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

/** 同一个 store = 同一份"磁盘存档"；换一个新 server 实例 = 重启 */
function mkShared() {
  const store = new Map();
  const logs = [];
  const make = () => createBzServer({
    readSave: (k) => (store.has(k) ? store.get(k) : null),
    writeSave: (k, t) => store.set(k, t),
    log: (m) => logs.push(String(m)),
    now: () => NOW,
    templates: TPL,
  });
  return { store, logs, make };
}
const inner = (r, k) => r['User.' + k] || {};

function pickEffect28() {
  const ids = Object.keys(ITEMFX).map(Number);
  const id = ids.find((i) => ITEMFX[i][0] === 28 && ITEMFX[i][1] > 0);
  return id ? { id, title: ITEMFX[id][1] } : null;
}

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 用完 Effect 28 后重启：LoadGame 必须投 titleObj，且值 = 0（客户端口径的永久）', () => {
  const e28 = pickEffect28();
  assert.ok(e28, 'item-effects.json 里必须存在 Effect==28 且 Data1>0 的物品');
  const ctx = mkShared();
  const a = ctx.make();
  a.dispatch('User', 'bzSeedBag', { itemObj: { [e28.id]: 1 } });
  const used = inner(a.dispatch('User', 'useItem', { itemID: e28.id, itemNum: 1 }), 'useItem');
  assert.strictEqual(used.titleID, e28.title, '前置：应答带 titleID（64812 弹 showTitleReward）');
  assert.strictEqual((a.loadSave().titles || {})[String(e28.title)], 1, '前置：账本里称号=1');

  const b = ctx.make();                              // ← 重启：新实例、同一份存档
  const lg = inner(b.dispatch('User', 'LoadGame', {}), 'LoadGame');
  assert.ok(lg.titleObj, 'LoadGame 应答必须带 titleObj（客户端 index.js:111919 只认它）');
  assert.strictEqual(lg.titleObj[String(e28.title)], 0,
    '永久称号必须投 0（>1 会被 getAchieveEndT/deleteTitle 当到期时间戳），实际=' + JSON.stringify(lg.titleObj));
  assert.ok(ctx.logs.some((l) => l.indexOf('称号投射') >= 0), '必须留一条投射日志（可观测）');
});

T('T2 没有称号的存档：只许有模板保留键 e（当前佩戴），不许凭空造数字键', () => {
  const ctx = mkShared();
  const lg = inner(ctx.make().dispatch('User', 'LoadGame', {}), 'LoadGame');
  // 模板 templates.json → create.titleObj 自带 {e:0}（e = 当前佩戴，客户端 627 行读），这是抓包真值，必须保留
  assert.ok(lg.titleObj, '模板里本来就带 titleObj（{e:0}），不该消失');
  assert.strictEqual(lg.titleObj.e, 0, 'e（当前佩戴）必须保留模板值 0');
  const numericKeys = Object.keys(lg.titleObj).filter((k) => /^\d+$/.test(k));
  assert.deepStrictEqual(numericKeys, [], '没有称号的存档不许出现数字键，实际=' + JSON.stringify(lg.titleObj));
});

T('T3 到期型称号（账本里 >1）原样投出，=1 归一成 0', () => {
  const ctx = mkShared();
  const s = ctx.make();
  s.dispatch('User', 'bzPatch', { set: { titles: { 2044: NOW + 86400000, 2045: 1 } } });
  const lg = inner(ctx.make().dispatch('User', 'LoadGame', {}), 'LoadGame');
  assert.strictEqual(lg.titleObj['2044'], NOW + 86400000, '>1 = 到期 ms，必须原样');
  assert.strictEqual(lg.titleObj['2045'], 0, '=1 = 永久，必须归一成 0');
});

T('T4 非数字键必须被过滤（客户端 checkTitleBuff 会拿键查 player_title，非表键 TypeError）', () => {
  const ctx = mkShared();
  const s = ctx.make();
  s.dispatch('User', 'bzPatch', { set: { titles: { e: 0, 2045: 1, abc: 0 } } });
  const lg = inner(ctx.make().dispatch('User', 'LoadGame', {}), 'LoadGame');
  assert.ok(lg.titleObj, '有数字键就该投');
  assert.strictEqual(lg.titleObj.abc, undefined, '非数字键不许投（checkTitleBuff 会拿键查 player_title）');
  assert.deepStrictEqual(Object.keys(lg.titleObj).sort(), ['2045', 'e'],
    '只许有 2045（账本）与 e（模板保留），实际=' + JSON.stringify(lg.titleObj));
  assert.strictEqual(lg.titleObj['2045'], 0);
});

T('T5 同进程内不许污染缓存的模板（SOTA R19 反例 1）：A 用完称号后，空档新实例必须看不到', () => {
  // R19 反例 1：只要 tObj 指向的是内存里缓存的 TPL.create.titleObj，A 的称号会漏进之后每一次 Create/LoadGame。
  // 旧写法（每个 case 都新建进程 / 每次 mkShared）测不出这一点，所以这里刻意在**同一进程、连续两个实例**里跑。
  const ctxA = mkShared();
  const a = ctxA.make();
  a.dispatch('User', 'bzSeedBag', { itemObj: { [pickEffect28().id]: 1 } });
  a.dispatch('User', 'useItem', { itemID: pickEffect28().id, itemNum: 1 });
  const lgA = inner(a.dispatch('User', 'LoadGame', {}), 'LoadGame');
  const numericA = Object.keys(lgA.titleObj).filter((k) => /^\d+$/.test(k));
  assert.ok(numericA.length > 0, '前置：A 的答复里必须有称号数字键');

  // 关键断言 1：模板本身没被写脏
  const tplTitle = (TPL.create && TPL.create.titleObj) || {};
  const numericTpl = Object.keys(tplTitle).filter((k) => /^\d+$/.test(k));
  assert.deepStrictEqual(numericTpl, [], '模板 TPL.create.titleObj 被写脏了（深层对象泄漏），实际=' + JSON.stringify(tplTitle));

  // 关键断言 2：同进程里全新实例 + 空存档，不许看到 A 的称号
  const ctxB = mkShared();
  const lgB = inner(ctxB.make().dispatch('User', 'LoadGame', {}), 'LoadGame');
  const leaked = Object.keys(lgB.titleObj || {}).filter((k) => numericA.indexOf(k) >= 0);
  assert.deepStrictEqual(leaked, [], 'A 的称号泄漏进了空档实例，实际=' + JSON.stringify(lgB.titleObj));
});

T('T6 已过期的限时称号不许投射（SOTA R19 反例 2）', () => {
  const ctx = mkShared();
  const s = ctx.make();
  s.dispatch('User', 'bzPatch', { set: { titles: { 2044: NOW - 1000, 2045: NOW + 86400000, 2046: 1 } } });
  const lg = inner(ctx.make().dispatch('User', 'LoadGame', {}), 'LoadGame');
  assert.strictEqual(lg.titleObj['2044'], undefined, '已过期（<= now）的限时称号不许投');
  assert.strictEqual(lg.titleObj['2045'], NOW + 86400000, '未到期的限时称号必须原样投');
  assert.strictEqual(lg.titleObj['2046'], 0, '永久（=1）必须投 0');
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[r18-titleobj-projection] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
