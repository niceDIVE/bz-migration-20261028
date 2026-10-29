'use strict';
/**
 * panel-fixes.js —— 2026-10-22 实测三连修的回归：食物饱食度 / 时装商店 / 伙伴详情
 *
 * 1) 食物：客户端不做本地应用（index.js:65302 请求带 hg=当前剩余；142440-142441
 *    `case "hunger": t.entity.hunger.remaining = o[i]` 只认应答 note.attrch.hunger）→
 *    服务端必须回 `note.attrch.hunger = hg + Data1×数量`。
 * 2) 时装：onGetFashionList（index.js:75620）→ FashionShopNewUI.showItem 只在 data.FashionArr
 *    存在时初始化 curSelectType（scripts2.js:21436-21437）；缺了它点页签必崩（21830，实测卡死）。
 * 3) 伙伴：getFriendPartnerCallBack 把 `e.notFriendPartnerData` 直接赋给 lockFriendData（scripts3.js:58456）；
 *    缺键 → undefined → 伙伴卡片 checkTaskFinishState 每帧崩（59334，实测刷屏）。
 *
 * 断言：
 *   T1 GetFashionList：type 回声、FashionArr 是 [物品id,限时] 数组、长度 = BZ_FASHION
 *   T2 getFriendPartner：notFriendPartnerData 是对象（defined）
 *   T3 食物 useItem：note.attrch.hunger = hg + Data1×数量
 *   T4 非食物 useItem：不带 note.attrch
 *   T5 食物但没有 hg 参数：不带 note.attrch（不崩、不瞎猜当前值）
 *
 * 跑法：node test/panel-fixes.js   退出码 0 = 全绿
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
const mk = () => createBzServer(makeEnv());
const inner = (r, k) => r['User.' + k] || {};

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 GetFashionList：type 回声 + FashionArr 结构', () => {
  const s = mk();
  const i = inner(s.dispatch('User', 'GetFashionList', { type: 2 }), 'GetFashionList');
  assert.strictEqual(i.eRet, 1);
  assert.strictEqual(i.type, 2, 'type 必须回声（showItem 用它初始化 curSelectType）');
  assert.ok(Array.isArray(i.FashionArr), 'FashionArr 必须是数组');
  assert.strictEqual(i.FashionArr.length, (BZ_FASHION || []).length, '条目数 = fashionall 行数');
  assert.ok(Array.isArray(i.FashionArr[0]) && i.FashionArr[0].length === 2, '元素必须是 [物品id, 限时天数]');
  assert.ok(i.FashionArr[0][0] > 0);
});

T('T2 getFriendPartner：notFriendPartnerData 必须是对象', () => {
  const s = mk();
  const i = inner(s.dispatch('User', 'getFriendPartner', {}), 'getFriendPartner');
  assert.strictEqual(i.eRet, 1);
  assert.ok(i.notFriendPartnerData && typeof i.notFriendPartnerData === 'object', '缺这个键会每帧崩（59334）');
  assert.ok(i.friendPartnerDatas && typeof i.friendPartnerDatas === 'object');
});

T('T3 食物 useItem：note.attrch.hunger = hg + Data1×数量', () => {
  const s = mk();
  s.dispatch('User', 'bzSeedBag', { itemObj: { 3005: 5 } });
  const eat = BZ_ITEMEAT['3005'];
  assert.ok(eat > 0, '3005 必须是食物（Data1>0）');
  const i = inner(s.dispatch('User', 'useItem', { itemID: 3005, itemNum: 2, hg: 500 }), 'useItem');
  assert.strictEqual(i.eRet, 1);
  assert.ok(i.note && i.note.attrch, '必须带 note.attrch');
  assert.strictEqual(i.note.attrch.hunger, 500 + eat * 2, '饱食度 = 当前 + 回复量×数量');
});

T('T4 非食物 useItem：不带 note.attrch', () => {
  const s = mk();
  s.dispatch('User', 'bzSeedBag', { itemObj: { 3626: 1 } });   // 秘籍，不是食物
  const i = inner(s.dispatch('User', 'useItem', { itemID: 3626, itemNum: 1, hg: 500 }), 'useItem');
  assert.ok(!i.note || !i.note.attrch, '非食物不许带 attrch');
});

T('T5 食物但没有 hg：不带 note.attrch（不瞎猜当前值）', () => {
  const s = mk();
  s.dispatch('User', 'bzSeedBag', { itemObj: { 3005: 5 } });
  const i = inner(s.dispatch('User', 'useItem', { itemID: 3005, itemNum: 1 }), 'useItem');
  assert.ok(!i.note || !i.note.attrch, '没有当前值就不发 attrch（宁可不加，也不发错值）');
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[panelfix] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
