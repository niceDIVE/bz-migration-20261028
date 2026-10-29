'use strict';
/**
 * wash-points.js —— 「洗点必须能用 & 不能清空基础属性」回归（2026-10-22）
 *
 * 事故现象（玩家实测）：洗点按钮点了没反应（日志里连 washAdditionalArr 请求都没有）。
 * 根因：客户端 `MarryModel.cycleData` 来自 LoadGame 应答的 **cycleObj**（index.js:77051），
 *       我方没发 → cycleData=[] → 按钮 `cycleData[4][e]` 直接 TypeError（scripts2.js:51009）→ 静默失效。
 * 另一处隐患：`WashMedicine` 旧实现回 eRet:1 + 全 0 基础属性，客户端会**整体替换**四项基础属性
 *       （index.js:144101-144108）→ 一旦被调用就清空玩家属性。
 *
 * 契约（全部有源码行号）：
 *   - cycleObj 下标：[0]数字 [1]数组 [2]数组 [3]{pTims,eTims} [4]4元 [7]4元 [8]4元（index.js:77051-77061、
 *     scripts2.js:2141-2146/49785/36535/50942/51002/51009、scripts3.js:12248-12249）
 *   - washAdditionalArr：无 attrID → eRet:4 + attrList("a,b|c,d|e,f|g,h" 4 段字符串，scripts2.js:61720-61724)；
 *     {attrID:1..4} → eRet:1 + bloodArr（index.js:144049-144076）
 *   - WashMedicine：eRet:1 会整体替换基础属性 → 必须回非 1/2
 *
 * 跑法：node test/wash-points.js   退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
function mk() {
  const s = createBzServer(makeEnv());
  const save = s.loadSave();
  save.bag = {}; save.playerEquip = {}; save.equipments = {};
  save.coins = 1000; save.gold = 100000; save.yuanbao = 0;
  return { s, save };
}

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 LoadGame 必须带 cycleObj：[4]/[7]/[8] 是 4 元数组且 length>=5', () => {
  const { s } = mk();
  const lg = s.dispatch('User', 'LoadGame', {})['User.LoadGame'];
  assert.ok(Array.isArray(lg.cycleObj), '缺 cycleObj（洗点按钮会静默崩溃）');
  assert.ok(lg.cycleObj.length >= 5, 'cycleObj.length 必须 >=5（index.js:111889），实际 ' + lg.cycleObj.length);
  for (const idx of [4, 7, 8]) {
    assert.ok(Array.isArray(lg.cycleObj[idx]) && lg.cycleObj[idx].length === 4,
      'cycleObj[' + idx + '] 必须是 4 元数组，实际 ' + JSON.stringify(lg.cycleObj[idx]));
  }
  assert.ok(Array.isArray(lg.cycleObj[1]), 'cycleObj[1] 必须是数组（客户端取 .length）');
  assert.ok(lg.cycleObj[3] && typeof lg.cycleObj[3] === 'object' && !Array.isArray(lg.cycleObj[3]),
    'cycleObj[3] 必须是对象 {pTims,eTims}（scripts2.js:36535）');
});

T('T2 washAdditionalArr 无 attrID → eRet:4 + attrList 四段字符串', () => {
  const { s } = mk();
  const inner = s.dispatch('User', 'washAdditionalArr', {})['User.washAdditionalArr'];
  assert.strictEqual(inner.eRet, 4, '应回 4（弹选择框），实际 ' + inner.eRet);
  assert.ok(typeof inner.attrList === 'string', 'attrList 必须是字符串');
  assert.strictEqual(inner.attrList.split('|').length, 4, '必须 4 段，实际 ' + inner.attrList);
  assert.ok(inner.attrList.split('|').every((seg) => seg.split(',').length === 2), '每段必须 "x,y" 形态');
});

T('T3 attrID=2 → eRet:1 + bloodArr 回 4 元且落档', () => {
  const { s, save } = mk();
  save.bloodArr = [3, 5, 7, 9];
  const inner = s.dispatch('User', 'washAdditionalArr', { attrID: 2 })['User.washAdditionalArr'];
  assert.strictEqual(inner.eRet, 1);
  assert.deepStrictEqual(inner.bloodArr, [3, 0, 7, 9], '只洗第 2 槽，实际 ' + JSON.stringify(inner.bloodArr));
  assert.deepStrictEqual(save.bloodArr, [3, 0, 7, 9], '账本也要落档');
});

T('T4 洗完之后 LoadGame 的 cycleObj[8] 必须反映清零结果', () => {
  const { s, save } = mk();
  save.bloodArr = [3, 5, 7, 9];
  s.dispatch('User', 'washAdditionalArr', { attrID: 1 });
  const lg = s.dispatch('User', 'LoadGame', {})['User.LoadGame'];
  assert.deepStrictEqual(lg.cycleObj[8], [0, 5, 7, 9], 'cycleObj[8] 应等于洗后的 bloodArr，实际 ' + JSON.stringify(lg.cycleObj[8]));
  assert.deepStrictEqual(lg.cycleObj[7], save.fosterArr, 'cycleObj[7] 应等于 fosterArr');
});

T('T5 WashMedicine 不得回 eRet:1/2（否则清空基础属性/弹充值）', () => {
  const { s } = mk();
  const inner = s.dispatch('User', 'WashMedicine', {})['User.WashMedicine'];
  assert.notStrictEqual(inner.eRet, 1, 'eRet:1 会整体替换基础属性（index.js:144101）');
  assert.notStrictEqual(inner.eRet, 2, 'eRet:2 会弹充值（index.js:144132）');
});

T('T6 非法 attrID 走选择框分支，不改账本', () => {
  const { s, save } = mk();
  save.bloodArr = [1, 2, 3, 4];
  const inner = s.dispatch('User', 'washAdditionalArr', { attrID: 9 })['User.washAdditionalArr'];
  assert.strictEqual(inner.eRet, 4);
  assert.deepStrictEqual(save.bloodArr, [1, 2, 3, 4], '不该改动');
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[wash] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
