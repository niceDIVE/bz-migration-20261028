// step6 复现（对应 selftest.sh 14-20 行）
const { compileAll, toRules } = require('F:/BaoZouyxt/midaudit-v21/audit-work/main-scratch/bz-oracle/forge/lib/rules-dsl');
const dsl = require('F:/BaoZouyxt/midaudit-v21/audit-work/main-scratch/bz-oracle/forge/fixtures/rules.dsl.json');
const H = compileAll(dsl, { item: require('F:/BaoZouyxt/midaudit-v21/audit-work/main-scratch/bz-oracle/fixtures/tables/item.json') });
const s = { coins: 1000, bag: { 2001: 5 } };
const r = H['User.buyShopItem']({ mod: 'User', do: 'buyShopItem', p: { itemID: 2001, num: 2 } }, s).resp;
if (JSON.stringify(r) !== JSON.stringify({ eRet: 1, note: { ivch: { 2001: 7 }, eco: { coins: 880 } } })) throw new Error('DSL 结果不对 ' + JSON.stringify(r));
const f = H['User.saleItem']({ mod: 'User', do: 'saleItem', p: { itemID: 2001, num: 99 } }, s).resp;
if (f.eRet !== 0 || s.bag[2001] !== 7) throw new Error('失败分支改了存档');
console.log('PASS（与用例 02 逐字一致；失败分支不改存档；导出 ' + Object.values(toRules(dsl).actions).flat().length + ' 条守恒式）');
