'use strict';
/**
 * check_exchange_currency.js —— 验证 H5 顺带发现的那个问题：
 * **兑换行奖励是"货币 id"时，我们的 exchangeItem 会把它发进背包，而不是进钱包。**
 *
 * 来路：`tools/h5_exchange_cost.js` 扫 1220 行兑换，发现 0 行用付费货币**付**，
 * 但有 **1 行奖励是金条**：npc 10385 / 行 1104 → 奖励 `1 × 9396`（金条）。
 *
 * 为什么这是问题：
 *   - 客户端取货币只认 `RoleBaseInfo.gold/coins/potentials/yuanbao`（index.js:106347-106360 getItemNum：
 *     `1→gold / 4001→coins / 4003→potentials / 4002→exp / 8888→yuanbao`），**从不读 `_itemObj["1"]`**；
 *   - 而我们的 `exchangeItem` 用 `grantItem()` 发货，`BZ_ITEMTYPE` 里没有货币 id →
 *     走到 `bagAdd(s, itemID, n)` → 写进 `bag["1"]` + `note.ivch["1"]`。
 *   结果：玩家付出真实道具，拿到的"9396 金条"变成背包里一个永远不生效的假物品。
 *
 * 本脚本**只验证不改代码**（在内存 store 里跑真 handler），输出事实供决定是否修。
 *
 * 跑法：node tools/check_exchange_currency.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const CORE = path.join(ROOT, 'hotfix-patch', 'core');
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require(path.join(CORE, 'bz-rpc-server.js'));
const TPL = require(path.join(CORE, 'templates.json'));

const CURRENCY_IDS = { 1: 'gold(金条)', 4001: 'coins(银两)', 4002: 'exp(经验)', 4003: 'potentials(潜能)', 8888: 'yuanbao(元宝)' };

function makeServer() {
  const store = new Map();
  const logs = [];
  const s = createBzServer({
    readSave: (k) => (store.has(k) ? store.get(k) : null),
    writeSave: (k, t) => store.set(k, t),
    log: (m) => logs.push(String(m)),
    now: () => 1792612412000,
    templates: TPL,
  });
  return { s, logs };
}

const gen = fs.readFileSync(path.join(CORE, 'bz-tasks.generated.js'), 'utf8');
const EX = JSON.parse(gen.match(/var BZ_EXCHANGE = (\{.*?\});\s*\n/s)[1]);

const problems = [];
const report = [];
for (const npc of Object.keys(EX)) {
  for (const row of EX[npc]) {
    const rewardId = parseInt(row[2], 10) || 0;
    const rewardNum = parseInt(row[3], 10) || 0;
    if (!CURRENCY_IDS[rewardId]) continue;
    const rowId = parseInt(row[0], 10);
    const costStr = String(row[4] || '');
    const costs = costStr.split('|').filter(Boolean).map((seg) => {
      const kv = seg.split(',');
      return { id: parseInt(kv[0], 10) || 0, count: parseInt(kv[1], 10) || 0 };
    });

    const { s, logs } = makeServer();
    const bag = {};
    for (const c of costs) bag[c.id] = (bag[c.id] || 0) + c.count + 5;
    s.dispatch('User', 'bzSeedBag', { itemObj: bag });
    const goldBefore = s.loadSave().gold;
    const coinsBefore = s.loadSave().coins;
    const res = (s.dispatch('User', 'exchangeItem', { npcid: parseInt(npc, 10), itemID: rowId, itemNum: 1 }) || {})['User.exchangeItem'] || {};
    const after = s.loadSave();

    const rec = {
      npc: parseInt(npc, 10),
      rowId,
      rewardId,
      rewardName: CURRENCY_IDS[rewardId],
      rewardNum,
      costs,
      eRet: res.eRet,
      walletBefore: { gold: goldBefore, coins: coinsBefore },
      walletAfter: { gold: after.gold, coins: after.coins },
      bagRewardKey: after.bag ? after.bag[String(rewardId)] : undefined,
      noteIvch: res.note && res.note.ivch ? res.note.ivch[String(rewardId)] : undefined,
      log: logs.slice(-1)[0],
    };
    rec.walletIncreased = (after.gold || 0) > (goldBefore || 0) || (after.coins || 0) > (coinsBefore || 0);
    rec.bug = rec.eRet === 1 && !rec.walletIncreased && rec.bagRewardKey !== undefined;
    if (rec.bug) problems.push(rec);
    report.push(rec);
  }
}

console.log('兑换行奖励=货币 id 的行数：' + report.length);
for (const r of report) {
  console.log('  npc ' + r.npc + ' 行 ' + r.rowId + ' → 奖励 ' + r.rewardName + ' ×' + r.rewardNum
    + '   代价 ' + r.costs.map((c) => c.id + '×' + c.count).join(' + '));
  console.log('    eRet=' + r.eRet + '  金条 ' + r.walletBefore.gold + '→' + r.walletAfter.gold
    + '  银两 ' + r.walletBefore.coins + '→' + r.walletAfter.coins);
  console.log('    账本 bag["' + r.rewardId + '"]=' + r.bagRewardKey + '  应答 note.ivch["' + r.rewardId + '"]=' + r.noteIvch);
  console.log('    判定：' + (r.bug ? '❌ 货币被当成普通物品发进背包（钱包没变）' : '✅ 钱包已增加'));
}
if (problems.length) {
  console.log('\n结论：' + problems.length + ' 行兑换的"货币奖励"没进钱包 → 玩家付了成本只拿到一个不生效的假物品。');
  console.log('       （未改代码：等指令；修法是把货币 id 走钱包 + note.eco，参照 §17.3 卖东西的做法）');
}
process.exit(0);
