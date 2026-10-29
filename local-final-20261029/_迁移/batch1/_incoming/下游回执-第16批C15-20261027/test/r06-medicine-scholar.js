'use strict';
/**
 * r06-medicine-scholar.js —— R06 回执第 1/2 条 + Q3 落地后的回归（2026-10-22 夜）
 *
 * 【秘籍（Effect==11，Data1=技能 id）不再白吃】
 *   R06 原文：「秘籍类只做"大声失败"是错位的。现在每用一本秘籍，物品就被消耗、效果却不落地，
 *   这和 R04 里"卖东西白扔"是同一族问题：正在发生的、不可逆的损失。在学技能的语义实现之前，
 *   useItem 遇到 BZ_ITEMSCH 里的物品应该拒绝、不扣物品，而且拒绝码必须落在客户端有提示的分支里。」
 *   我们的落地方式（语言表探针实读后的判定，见 HANDOVER §23）：
 *     - 技能已在账本 → `eRet:5`（客户端 `5==eRet` → getText(1333)「你已经学会此配方了」）
 *       且 **不扣物品**；
 *     - 技能不在账本 → 记 1 级 + `note.skch`（客户端弹 getText(422)「恭喜你学会了X！」）。
 *
 * 【药品（Effect==2 回血 / 3 回内）】
 *   证据：Data1 就是数值（老白干 Effect=3/Data1=50 ↔ lang 37007「可恢复50点内力」；
 *   小块豆沙月饼 Effect=2/Data1=1000 ↔ lang 37010「恢复1000点生命值」）；
 *   请求自带 `curHp/maxhpLimit`、`curMp/maxmpLimit`；落地键 `attrch.curhp/curmp`。
 *
 * 【饥饿上限优先级（R06 第 6 条）】
 *   请求 `hglmt` > 活模型 `hunger.limit` > 账本 `s.hungerMax`（只作后备；
 *   账本值小于活模型时用活模型覆盖，避免过期上限把饱食度截得过低）。
 *
 * 断言：
 *   T1 秘籍·技能已存在 → eRet 5、物品数量不变、不发 skch
 *   T2 秘籍·技能不存在 → eRet 1、学 1 级、note.skch 带该技能、物品 -1
 *   T3 回血：curHp 90 / max 600 + 1000 → attrch.curhp = 600（截断）
 *   T4 回内：curMp 100 / max 240 + 50 → attrch.curmp = 150
 *   T5 回血但请求缺 curHp/maxhpLimit → 不发 attrch（不瞎猜）
 *   T6 上限优先级：req.hglmt 覆盖账本；账本 < 活模型 → 用活模型覆盖账本
 *
 * 跑法：node test/r06-medicine-scholar.js   退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

const NOW = 1792612412000;

function makeEnv(extra) {
  const store = new Map();
  const logs = [];
  const env = Object.assign({
    readSave: (k) => (store.has(k) ? store.get(k) : null),
    writeSave: (k, t) => store.set(k, t),
    log: (m) => logs.push(String(m)),
    now: () => NOW,
    templates: TPL,
  }, extra || {});
  return { store, logs, env };
}
const mk = (extra) => { const e = makeEnv(extra); return { s: createBzServer(e.env), logs: e.logs, env: e.env }; };
const inner = (r, k) => r['User.' + k] || {};

function pickItem(pred) {
  const src = (typeof BZ_ITEMFUN !== 'undefined' && BZ_ITEMFUN) || {};
  for (const id of Object.keys(src)) if (pred(src[id])) return { id: parseInt(id, 10), meta: src[id] };
  return null;
}
function pickScholar() {
  const sch = (typeof BZ_ITEMSCH !== 'undefined' && BZ_ITEMSCH) || {};
  const id = Object.keys(sch)[0];
  return id ? { id: parseInt(id, 10), skill: sch[id] } : null;
}

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 秘籍·技能已存在 → eRet 5 且**不扣物品**（原故障重现：3626 那次就是这么丢的）', () => {
  const sch = pickScholar();
  assert.ok(sch, 'BZ_ITEMSCH 不能为空');
  const { s, logs } = mk();
  s.dispatch('User', 'bzSeedBag', { itemObj: { [sch.id]: 2 } });
  s.loadSave().skills[String(sch.skill)] = [40, 0, 1];      // 已经学会了
  const got = inner(s.dispatch('User', 'useItem', { itemID: sch.id, itemNum: 1 }), 'useItem');
  assert.strictEqual(got.eRet, 5, '已学会必须回 5（客户端 5==eRet 有提示「你已经学会此配方了」）');
  assert.strictEqual(s.loadSave().bag[sch.id], 2, '**物品数量不许变**（拒绝≠消耗）');
  assert.ok(!got.note || !got.note.skch || !Object.keys(got.note.skch).length, '拒绝时不许发 skch');
  assert.ok(logs.some((l) => l.indexOf('不扣物品') >= 0), '日志要写明不扣物品：' + logs.slice(-2).join(' | '));
});

T('T2 秘籍·技能不存在 → 学会 1 级 + note.skch + 物品 -1', () => {
  const sch = pickScholar();
  const { s, logs } = mk();
  s.dispatch('User', 'bzSeedBag', { itemObj: { [sch.id]: 2 } });
  const got = inner(s.dispatch('User', 'useItem', { itemID: sch.id, itemNum: 1 }), 'useItem');
  assert.strictEqual(got.eRet, 1);
  assert.deepStrictEqual(s.loadSave().skills[String(sch.skill)], [1, 0, 1], '技能必须写进账本（1 级）');
  assert.ok(got.note && got.note.skch && got.note.skch[String(sch.skill)], 'note.skch 必须带该技能（客户端弹"恭喜你学会了X"）');
  assert.strictEqual(s.loadSave().bag[sch.id], 1, '成功路径才扣物品');
  assert.ok(logs.some((l) => l.indexOf('学会技能') >= 0), logs.slice(-2).join(' | '));
});

T('T3 回血：90/600 + 1000 → attrch.curhp = 600（按请求上限截断）', () => {
  const it = pickItem((m) => m.k === 'hp');
  assert.ok(it, 'BZ_ITEMFUN 里必须有回血品');
  const { s } = mk();
  s.dispatch('User', 'bzSeedBag', { itemObj: { [it.id]: 2 } });
  const got = inner(s.dispatch('User', 'useItem', { itemID: it.id, itemNum: 1, curHp: 90, maxhpLimit: 600 }), 'useItem');
  assert.strictEqual(got.eRet, 1);
  assert.ok(got.note && got.note.attrch, '必须带 attrch');
  assert.strictEqual(got.note.attrch.curhp, Math.min(90 + it.meta.a, 600), 'curhp = min(当前+Data1, maxhpLimit)');
});

T('T4 回内：100/240 + Data1 → attrch.curmp 正确', () => {
  const it = pickItem((m) => m.k === 'mp');
  assert.ok(it, 'BZ_ITEMFUN 里必须有回内品');
  const { s } = mk();
  s.dispatch('User', 'bzSeedBag', { itemObj: { [it.id]: 2 } });
  const got = inner(s.dispatch('User', 'useItem', { itemID: it.id, itemNum: 1, curMp: 100, maxmpLimit: 240 }), 'useItem');
  assert.strictEqual(got.note.attrch.curmp, Math.min(100 + it.meta.a, 240));
});

T('T5 回血但请求缺 curHp/maxhpLimit → 不发 attrch（不瞎猜）', () => {
  const it = pickItem((m) => m.k === 'hp');
  const { s, logs } = mk();
  s.dispatch('User', 'bzSeedBag', { itemObj: { [it.id]: 2 } });
  const got = inner(s.dispatch('User', 'useItem', { itemID: it.id, itemNum: 1 }), 'useItem');
  assert.ok(!got.note || !got.note.attrch || got.note.attrch.curhp === undefined, '没有上限就不许发 curhp');
  assert.ok(logs.some((l) => l.indexOf('缺 curHp') >= 0), logs.slice(-2).join(' | '));
});

T('T6 饥饿上限优先级（R06 第 6 条）：req.hglmt 最优先；账本过期时用活模型覆盖', () => {
  // (a) req.hglmt 覆盖账本
  {
    const { s } = mk({ hungerMax: () => 999 });
    const eatId = Object.keys(BZ_ITEMEAT).find((k) => BZ_ITEMEAT[k] > 0);
    s.dispatch('User', 'bzSeedBag', { itemObj: { [eatId]: 3 } });
    s.loadSave().hungerMax = 500;
    const got = inner(s.dispatch('User', 'useItem', { itemID: parseInt(eatId, 10), itemNum: 1, hg: 100, hglmt: 800 }), 'useItem');
    assert.strictEqual(got.note.attrch.hunger, 100 + BZ_ITEMEAT[eatId], 'req.hglmt=800 时不该被账本 500 截断');
  }
  // (b) 账本 < 活模型 → 用活模型覆盖
  {
    const { s, logs } = mk({ hungerMax: () => 700 });
    const eatId = Object.keys(BZ_ITEMEAT).find((k) => BZ_ITEMEAT[k] > 0);
    s.dispatch('User', 'bzSeedBag', { itemObj: { [eatId]: 3 } });
    s.loadSave().hungerMax = 400;                            // 过期的上限
    const got = inner(s.dispatch('User', 'useItem', { itemID: parseInt(eatId, 10), itemNum: 1, hg: 500 }), 'useItem');
    assert.strictEqual(got.note.attrch.hunger, 500 + BZ_ITEMEAT[eatId], '账本 400 过期，不该把 500 截到 400');
    assert.strictEqual(s.loadSave().hungerMax, 700, '账本应被活模型值覆盖');
    assert.ok(logs.some((l) => l.indexOf('用活模型值覆盖') >= 0), logs.slice(-2).join(' | '));
  }
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[r06-medicine-scholar] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
