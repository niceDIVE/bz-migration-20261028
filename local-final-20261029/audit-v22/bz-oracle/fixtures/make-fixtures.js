#!/usr/bin/env node
// 生成自检用的"干净用例"。数值是演示用的，结构严格按 R21 材料（§五 原版 upgradeSkill 样本、§七/M4 note 语义、§八 LoadGame 必回字段）。
'use strict';
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, 'cases');
fs.rmSync(D, { recursive: true, force: true });
fs.mkdirSync(D, { recursive: true });
const clone = v => JSON.parse(JSON.stringify(v));

const base = {
  account: '9900012358565', roleID: 16374, name: 'FZhou', created: true, saveVersion: 9,
  coins: 1000, gold: 50, yuanbao: 0, potential: 300, contribution: 0, chip: 0,
  bag: { 2001: 5, 3001: 5, 3101: 1 },
  playerEquip: { 90001: [3, 1] }, equipments: { 1: 90001 },
  skills: { 1112: [2, 10, 1] }, accepted: [], done: [101080], rewarded: [101080],
  baseValueAy: Array.from({ length: 44 }, (_, i) => (i === 0 ? '9900012358565' : i === 1 ? 'FZhou' : 0)),
  titles: {}, hunger: 50, hungerMax: 100,
};
const snapOf = s => ({
  bag: Object.fromEntries(Object.entries(s.bag).filter(([, v]) => v)),
  wallet: { coins: s.coins, ptt: s.potential, gold: s.gold, yuanbao: s.yuanbao, chips: s.chip },
  skills: clone(s.skills),
  equips: clone(s.playerEquip),
});
function write(name, c) {
  const env = { error: 0, p: c.action, [c.action]: c.resp };
  c.envelope = c.envelope === false ? undefined : env;
  c.transport = 'game';
  c.rawTransport = { code: 200 };
  if (c.withSnaps !== false && c.saveAfter) { c.snapA = snapOf(c.saveAfter); c.snapB = snapOf(c.saveAfter); }
  delete c.withSnaps;
  c.exceptions = [];
  c.toasts = [];
  c.probe = { mode: 'wrap-on' };
  fs.writeFileSync(path.join(D, name + '.json'), JSON.stringify(c, null, 2));
}

// 1. upgradeSkill —— 原版样本 0036（全量 §五）
{
  const b = clone(base), a = clone(base);
  a.skills[1262] = [1, 0, 0];
  write('01-upgradeSkill-orig0036', {
    id: 'upgradeSkill.orig0036', action: 'User.upgradeSkill',
    req: { mod: 'User', do: 'upgradeSkill', p: { NPCID: 1003, skillID: 1262, flag: 0 } },
    resp: { eRet: 1, note: { eco: {}, skch: { 1262: [1, 0, 0] } } },
    saveBefore: b, saveAfter: a, template: 'upgradeSkill_0036',
  });
}
// 2. buyShopItem → 3. saleItem（同一闭环）
{
  const b = clone(base), a = clone(base);
  a.bag[2001] = 7; a.coins = 1000 - 2 * 60;
  write('02-buyShopItem-2001x2', {
    id: 'buyShopItem.2001x2', action: 'User.buyShopItem', scenario: 'buy-sell-2001', seq: 1,
    req: { mod: 'User', do: 'buyShopItem', p: { itemID: 2001, num: 2 } },
    resp: { eRet: 1, note: { ivch: { 2001: 7 }, eco: { coins: a.coins } } },
    saveBefore: b, saveAfter: a,
  });
  const b2 = clone(a), a2 = clone(a);
  a2.bag[2001] = 5; a2.coins = b2.coins + 2 * 50;
  write('03-saleItem-2001x2', {
    id: 'saleItem.2001x2', action: 'User.saleItem', scenario: 'buy-sell-2001', seq: 2,
    req: { mod: 'User', do: 'saleItem', p: { itemID: 2001, num: 2 } },
    resp: { eRet: 1, note: { ivch: { 2001: 5 }, eco: { coins: a2.coins } } },
    saveBefore: b2, saveAfter: a2,
  });
}
// 4. useItem 食物（Effect 1：hunger）
{
  const b = clone(base), a = clone(base);
  a.bag[3001] = 4; a.hunger = 80;
  write('04-useItem-food', {
    id: 'useItem.food3001', action: 'User.useItem',
    req: { mod: 'User', do: 'useItem', p: { itemID: 3001, num: 1 } },
    resp: { eRet: 1, note: { ivch: { 3001: 4 }, attrch: { hunger: 80 } } },
    saveBefore: b, saveAfter: a,
  });
}
// 5. useItem 配方书（带开关字段 formulaID，外键 formula 表）
{
  const b = clone(base), a = clone(base);
  a.bag[3101] = 0;
  write('05-useItem-formula', {
    id: 'useItem.formula3101', action: 'User.useItem',
    req: { mod: 'User', do: 'useItem', p: { itemID: 3101, num: 1 } },
    resp: { eRet: 1, formulaID: 501, note: { ivch: { 3101: 0 } } },
    saveBefore: b, saveAfter: a,
  });
}
// 6. 出售装备（eqch 删除）
{
  const b = clone(base), a = clone(base);
  delete a.playerEquip[90001]; a.coins += 30;
  write('06-saleItem-equip', {
    id: 'saleItem.equip90001', action: 'User.saleItem',
    req: { mod: 'User', do: 'saleItem', p: { uid: 90001, num: 1 } },
    resp: { eRet: 1, note: { eqch: { 90001: [0] }, eco: { coins: a.coins } } },
    saveBefore: b, saveAfter: a,
  });
}
// 7. 买时装（eqch 新增，[1,[type,num]]）
{
  const b = clone(base), a = clone(base);
  a.playerEquip[90002] = [7, 1]; a.gold -= 10;
  write('07-BuyFashion', {
    id: 'BuyFashion.90002', action: 'User.BuyFashion',
    req: { mod: 'User', do: 'BuyFashion', p: { id: 90002 } },
    resp: { eRet: 1, note: { eqch: { 90002: [1, [7, 1]] }, eco: { gold: a.gold } } },
    saveBefore: b, saveAfter: a,
  });
}
// 8. LoadGame（全量重建入口）
{
  const s = clone(base);
  write('08-LoadGame', {
    id: 'LoadGame.base', action: 'User.LoadGame', meta: { fullReload: true },
    req: { mod: 'User', do: 'LoadGame', p: {} },
    resp: {
      eRet: 1, finishTaskObj: ['101080,1'], acceptTaskArray: [], acceptTaskOrder: [], taskLog: {},
      itemObj: clone(s.bag), PlayerEquip: clone(s.playerEquip), equipments: clone(s.equipments),
      cycleObj: {}, OnhookObj: { serverTime: 1761200000000, curJetton: 0 }, baseValueAy: clone(s.baseValueAy),
    },
    saveBefore: s, saveAfter: clone(s),
  });
}
// 9. sycnPlayerItemData（itemObj 必须是全部持有物）
{
  const s = clone(base);
  write('09-sycnPlayerItemData', {
    id: 'sycnPlayerItemData.base', action: 'User.sycnPlayerItemData', meta: { fullReload: true },
    req: { mod: 'User', do: 'sycnPlayerItemData', p: {} },
    resp: { eRet: 1, itemObj: clone(s.bag) },
    saveBefore: s, saveAfter: clone(s),
  });
}
// 10. 付费动作（必须 eRet:4，不写存档）
{
  const s = clone(base);
  write('10-pay-GetPayAward', {
    id: 'GetPayAward.blocked', action: 'User.GetPayAward',
    req: { mod: 'User', do: 'GetPayAward', p: { productId: 1 } },
    resp: { eRet: 4, reason: 'PAY_BLOCKED' },
    saveBefore: s, saveAfter: clone(s), withSnaps: false,
  });
}
// 11. upgradeSkill 消耗潜能（eco.ptt 绝对值）
{
  const b = clone(base), a = clone(base);
  a.skills[1112] = [3, 0, 1]; a.potential = 200;
  write('11-upgradeSkill-ptt', {
    id: 'upgradeSkill.ptt', action: 'User.upgradeSkill',
    req: { mod: 'User', do: 'upgradeSkill', p: { NPCID: 1003, skillID: 1112, lv: 3, flag: 0 } },
    resp: { eRet: 1, note: { eco: { ptt: 200 }, skch: { 1112: [3, 0, 1] } } },
    saveBefore: b, saveAfter: a,
  });
}
console.log('fixtures:', fs.readdirSync(D).length);
