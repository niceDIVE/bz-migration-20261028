'use strict';
/**
 * fashion-pages.js —— 2026-10-22 第二轮：时装商店「按页发货 + 限时页 FashionTimeMap」
 *
 * 原故障（端上实测，截图 probe/shot_d3_limit_before.png / shot_d4_pass_before.png）：
 *   1) 切到「限时」页 → 整页空白 + 两条 unhandledRejectedPromise
 *      `TypeError: Cannot read property '1' of undefined @ index.js:140336`
 *      栈：setHairView(scripts2:21807) → total(index.js:140732) → createItemOnePage(141041)
 *   2) 切到「战令」页 → 列表能出，但每件价格显示 "undefined"
 *
 * 机理（源码逐行核对）：
 *   - 限时页每件走 `MakeUpModel.getFashionTimeType(t.ID)`（scripts2.js:21215）：
 *     `var e = this.getFashionTime(t); ... e[1]`（index.js:75613-75618）。
 *     fashionTimeMap 只由 `setFashionTime(e.FashionTimeMap)` 填（75607-75611），
 *     应答不带 FashionTimeMap → `for (var e in undefined)` 空转 → 查不到 → `e[1]` 抛 TypeError
 *     → `total()` 的 __awaiter 捕获后 reject → createItemOnePage 一件都没建 → 空白页。
 *   - 战令页读 `t.pass.split(",")[1]`（scripts2.js:21242-21243）；常驻件 pass="0" → split 长度 1
 *     → s[1] = undefined → 价格标签写成 "undefined"。
 *   - 根因是我们不分页：以前 type 参数只回声，FashionArr 恒回全量 266 件。
 *
 * 契约（本测试钉住的）：
 *   页归属 = fashionall 的 `type` 列（数组）：[] → 常驻页(0) / 含 1 → 限时页(1) / 含 2 → 战令页(2)
 *   `FashionArr[i] = [物品id, 限时剩余天数]`（不在售 = 0）
 *   `FashionTimeMap = { "ontime_offtime": [物品id, ...] }`，**必须覆盖限时页返回的每一个 id**
 *   （少一个 → 选中它时 setXianshiPrice 会再炸一次，scripts2.js:21742）
 *
 * 跑法：node test/fashion-pages.js   退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

const NOW = 1792612412000;   // 2026-10-22（与端上实测同日）

function makeEnv(now) {
  const store = new Map();
  return {
    readSave: (k) => (store.has(k) ? store.get(k) : null),
    writeSave: (k, t) => store.set(k, t),
    log: () => {},
    now: () => (now === undefined ? NOW : now),
    templates: TPL,
  };
}
const mk = (now) => createBzServer(makeEnv(now));
const inner = (r, k) => r['User.' + k] || {};
const page = (t) => (typeof BZ_FASHIONPAGES !== 'undefined' && BZ_FASHIONPAGES[t]) || [];

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 常驻页(0)：按页发货，不带 FashionTimeMap', () => {
  const s = mk();
  const i = inner(s.dispatch('User', 'GetFashionList', { type: 0 }), 'GetFashionList');
  assert.strictEqual(i.eRet, 1);
  assert.strictEqual(i.type, 0);
  assert.ok(Array.isArray(i.FashionArr));
  assert.strictEqual(i.FashionArr.length, page(0).length, '常驻页条目数 = fashionall 里 type 为空的行数');
  assert.ok(i.FashionArr.length > 0, '常驻页不能是空的');
  for (const e of i.FashionArr) {
    assert.ok(Array.isArray(e) && e.length === 2, '元素 = [物品id, 限时天数]');
    assert.strictEqual(e[1], 0, '常驻件没有限时天数');
  }
  // 形状层（fillShape）会给缺失键补默认值，所以这里只要求"非限时页不得带条目"
  const tm = i.FashionTimeMap;
  assert.ok(!tm || (typeof tm === 'object' && Object.keys(tm).length === 0), '非限时页 FashionTimeMap 必须为空');
});

T('T2 限时页(1)：必须带 FashionTimeMap（原故障重现：缺它 → e[1] of undefined）', () => {
  const s = mk();
  const i = inner(s.dispatch('User', 'GetFashionList', { type: 1 }), 'GetFashionList');
  assert.strictEqual(i.type, 1);
  assert.strictEqual(i.FashionArr.length, page(1).length);
  assert.ok(i.FashionArr.length > 0);
  assert.ok(i.FashionTimeMap && typeof i.FashionTimeMap === 'object',
    'FashionTimeMap 必须存在（缺 → getFashionTimeType 的 e[1] 抛 TypeError → 整页空白）');
  assert.ok(Object.keys(i.FashionTimeMap).length > 0, 'FashionTimeMap 不能是空对象');
});

T('T3 FashionTimeMap 覆盖限时页每一个 id，key = "起_止"', () => {
  const s = mk();
  const i = inner(s.dispatch('User', 'GetFashionList', { type: 1 }), 'GetFashionList');
  const covered = new Set();
  for (const k of Object.keys(i.FashionTimeMap)) {
    const seg = k.split('_');
    assert.strictEqual(seg.length, 2, 'key 必须是 起_止（setFashionTime 按 "_" 切，index.js:75609）');
    const a = parseInt(seg[0], 10), b = parseInt(seg[1], 10);
    assert.ok(a > 0 && b > a, 'key 两段必须能 parseInt 且 止 > 起：' + k);
    for (const id of i.FashionTimeMap[k]) covered.add(id);
  }
  for (const e of i.FashionArr) {
    assert.ok(covered.has(e[0]), '限时页条目的 id 必须在 FashionTimeMap 里：' + e[0]);
  }
});

T('T4 战令页(2)：只发带 pass 的货（原故障重现：常驻件混入 → 价格 "undefined"）', () => {
  const s = mk();
  const i = inner(s.dispatch('User', 'GetFashionList', { type: 2 }), 'GetFashionList');
  assert.strictEqual(i.type, 2);
  assert.strictEqual(i.FashionArr.length, page(2).length);
  assert.ok(i.FashionArr.length > 0);
  const ids = new Set(page(2));
  for (const e of i.FashionArr) assert.ok(ids.has(e[0]), '战令页只能有该页自己的货：' + e[0]);
});

T('T5 period 语义：窗口内 = 剩余天数；已结束 / 未开始 = 0', () => {
  const p1 = page(1);
  assert.ok(p1.length > 0);
  const first = p1[0];             // [id, on, off]
  const id = first[0], on = first[1], off = first[2];
  // 窗口内：now = on + 1 天
  const sIn = mk(on + 86400000);
  const rIn = inner(sIn.dispatch('User', 'GetFashionList', { type: 1 }), 'GetFashionList');
  const hit = rIn.FashionArr.find((e) => e[0] === id);
  assert.ok(hit, '窗口内该件必须出现');
  assert.strictEqual(hit[1], Math.ceil((off - (on + 86400000)) / 86400000), '剩余天数 = ceil((止-现在)/1天)');
  assert.ok(hit[1] >= 1, '在售件 period 必须 >= 1（客户端靠它决定要不要收钱）');
  // 已结束：now = off + 1 天
  const sOut = mk(off + 86400000);
  const rOut = inner(sOut.dispatch('User', 'GetFashionList', { type: 1 }), 'GetFashionList');
  const out = rOut.FashionArr.find((e) => e[0] === id);
  assert.strictEqual(out[1], 0, '售罄件 period = 0（客户端据此把价格清零，scripts2.js:21732）');
  // 未开始：now = on - 1 天
  const sCome = mk(on - 86400000);
  const rCome = inner(sCome.dispatch('User', 'GetFashionList', { type: 1 }), 'GetFashionList');
  assert.strictEqual(rCome.FashionArr.find((e) => e[0] === id)[1], 0, '未开售 period = 0');
});

T('T6 三页互不串货；未知页签回空、不发明', () => {
  const s = mk();
  const ids0 = new Set(inner(s.dispatch('User', 'GetFashionList', { type: 0 }), 'GetFashionList').FashionArr.map((e) => e[0]));
  const ids1 = new Set(inner(s.dispatch('User', 'GetFashionList', { type: 1 }), 'GetFashionList').FashionArr.map((e) => e[0]));
  const ids2 = new Set(inner(s.dispatch('User', 'GetFashionList', { type: 2 }), 'GetFashionList').FashionArr.map((e) => e[0]));
  for (const id of ids0) assert.ok(!ids1.has(id) && !ids2.has(id), '常驻件不许出现在别的页：' + id);
  for (const id of ids1) assert.ok(!ids2.has(id), '限时件不许出现在战令页：' + id);
  const unk = inner(s.dispatch('User', 'GetFashionList', { type: 9 }), 'GetFashionList');
  assert.strictEqual(unk.eRet, 1);
  assert.ok(Array.isArray(unk.FashionArr) && unk.FashionArr.length === 0, '未知页签回空数组（不猜）');
  assert.ok(!unk.FashionTimeMap || Object.keys(unk.FashionTimeMap).length === 0, '未知页签不带时间组');
});

T('T7 常驻购买：扣金条、进装备账本、note.eqch 让客户端认得（原故障重现：缺 eqch → .id of null）', () => {
  const s = mk();
  s.dispatch('User', 'bzGrantCur', { gold: 1000 });          // 注：bzGrantCur 是"增量"，不是置值
  const goldBefore = s.loadSave().gold || 0;
  const id = page(0)[0];
  const price = (BZ_FASHIONBUY[id] || {}).p;
  assert.ok(price > 0, '常驻件必须有买价：' + id);
  const i = inner(s.dispatch('User', 'BuyFashion', { itemObj: { 8: [id, 0, 0] } }), 'BuyFashion');
  assert.strictEqual(i.eRet, 1, '买成功应 eRet:1');
  const save = s.loadSave();
  assert.strictEqual(save.gold, goldBefore - price, '金条按 fashionall.price 扣');
  assert.ok(Array.isArray(save.playerEquip[id]) && save.playerEquip[id][0] === 1, '时装必须进 playerEquip（[1,数量]）');
  assert.strictEqual(save.equipments['8'], id, '槽 8 = 穿上（LoadGame 回放靠它）');
  assert.ok(i.note && i.note.eqch && i.note.eqch[id], '必须回 note.eqch（否则 75560 getEquipmentInfo 得 null → .id 崩）');
  assert.deepStrictEqual(i.note.eqch[id], [1, save.playerEquip[id]], 'eqch 形状 = [1, PlayerEquip[uid]]（parseEq type==1）');
  assert.strictEqual(i.note.eco.gold, goldBefore - price, 'note.eco.gold 是新余额（绝对值）');
  assert.ok(!save.bag[id], '时装不许进背包（进背包客户端就查不到装备实例）');
});

T('T8 金条不够：eRet:4 且一分不扣、一件不发', () => {
  const s = mk();
  const id = page(0)[0];
  s.dispatch('User', 'bzGrantCur', { gold: -999999 });
  const i = inner(s.dispatch('User', 'BuyFashion', { itemObj: { 8: [id, 0, 0] } }), 'BuyFashion');
  assert.strictEqual(i.eRet, 4, '钱不够必须明确失败（不许回 3——客户端 3 会去开充值页）');
  const save = s.loadSave();
  assert.ok(!save.playerEquip[id], '没扣钱就不许发货');
  assert.ok(!save.equipments || !save.equipments['8']);
});

T('T9 跨页请求（把限时件当常驻买）：eRet:4', () => {
  const s = mk();
  s.dispatch('User', 'bzGrantCur', { gold: 999999 });
  const id = page(1)[0][0];
  const i = inner(s.dispatch('User', 'BuyFashion', { itemObj: { 8: [id, 0, 0] } }), 'BuyFashion');
  assert.strictEqual(i.eRet, 4, '页签对不上必须拒绝（否则按错价买）');
  assert.ok(!s.loadSave().playerEquip[id]);
});

T('T10 战令购买：扣券 7851，note.ivch 是绝对值', () => {
  const s = mk();
  const id = page(2)[0];
  const info = BZ_FASHIONBUY[id];
  assert.ok(info && info.pi > 0 && info.pn > 0, '战令件必须有 pass 价：' + id);
  s.dispatch('User', 'bzSeedBag', { itemObj: { [info.pi]: info.pn + 2 } });
  const i = inner(s.dispatch('User', 'BuyFashion', { itemObj: { 8: [id, 2, 1] } }), 'BuyFashion');
  assert.strictEqual(i.eRet, 1);
  const save = s.loadSave();
  assert.strictEqual(save.bag[info.pi], 2, '券按 pass 数量扣');
  assert.strictEqual(i.note.ivch[info.pi], 2, 'note.ivch 必须是新数量（绝对值，§17.2）');
  assert.ok(Array.isArray(save.playerEquip[id]));
});

T('T11 券不够：eRet:4，券和时装都不动', () => {
  const s = mk();
  const id = page(2)[0];
  const info = BZ_FASHIONBUY[id];
  s.dispatch('User', 'bzSeedBag', { itemObj: { [info.pi]: Math.max(0, info.pn - 1) } });
  const before = s.loadSave().bag[info.pi] || 0;
  const i = inner(s.dispatch('User', 'BuyFashion', { itemObj: { 8: [id, 2, 1] } }), 'BuyFashion');
  assert.strictEqual(i.eRet, 4);
  const save = s.loadSave();
  assert.strictEqual(save.bag[info.pi] || 0, before, '失败不许扣券');
  assert.ok(!save.playerEquip[id], '失败不许发时装');
});

T('T12 限时页券档（档位 2 = 7298 券）：扣券、扣量按 limit 次段', () => {
  const s = mk();
  const cand = page(1).map((e) => e[0]).filter((id) => {
    const b = BZ_FASHIONBUY[id];
    return b && b.ci > 0 && b.c > 0;
  });
  assert.ok(cand.length > 0, '必须有限时件带券价');
  const id = cand[0];
  const info = BZ_FASHIONBUY[id];
  s.dispatch('User', 'bzSeedBag', { itemObj: { [info.ci]: info.c + 3 } });
  const i = inner(s.dispatch('User', 'BuyFashion', { itemObj: { 9: [id, 1, 2] } }), 'BuyFashion');
  assert.strictEqual(i.eRet, 1, '档位 2 = 用券，应成功');
  const save = s.loadSave();
  assert.strictEqual(save.bag[info.ci], 3, '券按 limit 次段数量扣');
  assert.strictEqual(i.note.ivch[info.ci], 3, 'note.ivch 绝对值');
  assert.ok(Array.isArray(save.playerEquip[id]), '时装进 playerEquip');
  assert.strictEqual(save.equipments['9'], id, '槽 9 = 服饰位');
  assert.ok(!i.note.eco.gold, '券档不许扣金条');
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[fashion-pages] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
