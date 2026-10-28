'use strict';
/** c07-smoke.js —— 第 8 批 C07〔善恶〕冒烟（11 动作全锁）。
 *
 *  口径：善恶玩法门槛 = 加入阵营（JOIN_GOOD_OR_EVIL 未实现）→ 11 动作全 eRet 2 静默；
 *  不给半截成功的硬理由：GoodEvilInfoUI 对 goodAndEvilData 16 字段 .toString() 直读
 *  （scripts3.js:35795-35861），缺键即 TypeError。取证：scoutF-c07-reqkeys.md。
 *  用法：node test/c07-smoke.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CORE = path.join(__dirname, '..', 'core');
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-shops.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');

function fresh() {
  const st = new Map();
  st.set(createBzServer({ readSave: () => null, writeSave: () => {}, log: () => {}, now: () => 1792612412000, templates: TPL })._internal.SAVE_KEY,
    JSON.stringify({ roleID: 16374, name: 'FZhou', saveVersion: 4, accepted: [], done: [], rewarded: [], skills: {}, baseValueAy: [], bag: {}, playerEquip: {}, equipments: {}, potential: 100, coins: 1000, gold: 1000, yuanbao: 500, bloodArr: [], fosterArr: [], contribution: 0, school: 1, schoolContribution: {}, hunger: 50, mounts: {}, mountShow: 0, marketBuyTimes: {}, passCardLevel: 0, passLiveness: 0, passAward: {}, growthClaim: {}, growthBigPaid: 0 }));
  const srv = createBzServer({
    readSave: (k) => (st.has(k) ? st.get(k) : null),
    writeSave: (k, t) => st.set(k, t),
    log: () => {}, now: () => 1792612412000, templates: TPL,
  });
  const d = (a, p) => srv.dispatch('User', a, p || {});
  const pay = (r, a) => r['User.' + a];
  srv.loadSave();
  return { srv, d, pay, save: () => srv.loadSave(), snap: () => JSON.stringify(srv.loadSave()) };
}

let pass = 0; const fails = [];
function T(n, fn) { try { fn(); pass++; console.log('  ok   ' + n); } catch (e) { fails.push(n + ': ' + e.message); console.log('  FAIL ' + n + ' -> ' + e.message); } }

const LOCKS = [
  ['getGoodAndEvilTaskData', {}], ['refreshGoodAndEvilTaskData', {}], ['getGoodAndEvilNoteData', {}],
  ['getGoodAndEvilNpcData', {}], ['refreshGoodAndEvilNpcData', {}],
  ['getGoodAndEvilRankData', { type: 1 }], ['helpDoneTask', { type: 1, targetId: 1 }],
  ['getGeHelpInfo', {}], ['getGoodAndEvilData', {}],
  ['getGoodAndEvilRetireList', { itemId: 9412 }], ['getGoodAndEvilRetireData', { time: 1792612412000 }],
];

T('【§5.1 原故障重现】11 个线上名都在 H 里', () => {
  const f = fresh();
  const H = f.srv._internal.handlers;
  const missing = LOCKS.map(([w]) => w).filter((w) => typeof H[w] !== 'function');
  assert.deepStrictEqual(missing, [], '缺 ' + missing.join(','));
});

T('【锁死】11 个动作全 eRet 2，存档逐字节不动（含 helpDoneTask 不发 contribution）', () => {
  const f = fresh();
  const before = f.snap();
  for (const [act, p] of LOCKS) {
    const r = f.pay(f.d(act, p), act);
    assert.strictEqual(r.eRet, 2, act + ' 应回 2，实得 ' + r.eRet);
  }
  assert.strictEqual(f.snap(), before, '锁死动作一个字节不动');
  assert.strictEqual(f.save().contribution, 0, '门派贡献不许被善恶动作碰');
});

console.log('\n[c07-smoke] 通过 ' + pass + '/' + (pass + fails.length));
if (fails.length) { console.error('失败项:\n' + fails.map((f) => ' - ' + f).join('\n')); process.exit(1); }
console.log('C07 SMOKE PASSED');
