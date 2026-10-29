'use strict';
/**
 * check_exchange_currency.js —— 验收器（§7-2）：兑换行奖励是"货币 id"时必须进钱包，不许进背包。
 *
 * 原故障（2026-10-22 发现，2026-10-23 修）：`exchangeItem` 对奖励一律 `grantItem()`，
 * 货币 id（客户端 getItemNum 特判的那几个）被写进 `bag` → 客户端取货币只认 RoleBaseInfo
 * （tools/index.js:106347-106360），于是玩家付真道具换来一个**永远不生效的假物品**。
 *
 * 本脚本对 BZ_EXCHANGE 里每一行"奖励=货币 id"的兑换做**四项硬断言**（少一项就算失败）：
 *   ① eRet === 1
 *   ② 对应钱包字段恰好 +奖励数量（不是"随便涨了点"，是精确值）
 *   ③ 账本 `bag` 里**没有**该货币 id 的键
 *   ④ 应答 note.eco 带的是**客户端认的键**（潜能是 `ptt`，不是 `potential`），值为新余额；
 *      且 note.ivch 里不许出现该货币 id
 * 任何一项不过 → 退出码 1（可直接进 CI）。
 *
 * 跑法：
 *   node tools\check_exchange_currency.js                        # 跑当前代码，应当 118/118 通过、退出码 0
 *   $env:BZ_CORE_DIR='_backup\<ts>-pre-exchange-currency\hotfix-patch\core'; node tools\check_exchange_currency.js
 *                                                               # 跑旧代码，应当全红、退出码 1（证明本器抓得住原故障）
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const CORE = process.env.BZ_CORE_DIR
  ? path.resolve(ROOT, process.env.BZ_CORE_DIR)
  : path.join(ROOT, 'hotfix-patch', 'core');

vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'hotfix-patch', 'core', 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'hotfix-patch', 'core', 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require(path.join(CORE, 'bz-rpc-server.js'));
const TPL = require(path.join(ROOT, 'hotfix-patch', 'core', 'templates.json'));

/** 客户端真值（tools/index.js:106347-106360）：货币 id → 存档钱包字段 / note.eco 键 */
const CUR = {
  1: { name: 'gold(金条)', field: 'gold', ecoKey: 'gold', dflt: 99999 },
  4001: { name: 'coins(银两)', field: 'coins', ecoKey: 'coins', dflt: 99999 },
  4003: { name: 'potential(潜能)', field: 'potential', ecoKey: 'ptt', dflt: 99999 },
  8888: { name: 'yuanbao(元宝)', field: 'yuanbao', ecoKey: 'yuanbao', dflt: 0 },
  // 2 / 4002：客户端算货币但存档没有可投射字段 → 只允许"明确拒绝"，不允许发进背包
  2: { name: 'id2(未定义)', field: null, ecoKey: null, dflt: null },
  4002: { name: 'exp(经验,无存档字段)', field: null, ecoKey: null, dflt: null },
};

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

function wallet(save, meta) {
  if (save[meta.field] === undefined || save[meta.field] === null) return meta.dflt;
  return parseInt(save[meta.field], 10) || 0;
}

const gen = fs.readFileSync(path.join(ROOT, 'hotfix-patch', 'core', 'bz-tasks.generated.js'), 'utf8');
const EX = JSON.parse(gen.match(/var BZ_EXCHANGE = (\{.*?\});\s*\n/s)[1]);

const fails = [];
let total = 0;

for (const npc of Object.keys(EX)) {
  for (const row of EX[npc]) {
    const rewardId = parseInt(row[2], 10) || 0;
    const meta = CUR[rewardId];
    if (!meta) continue;
    total++;
    const rowId = parseInt(row[0], 10);
    const per = Math.max(parseInt(row[3], 10) || 1, 1);
    const costs = String(row[4] || '').split('|').filter(Boolean).map((seg) => {
      const kv = seg.split(',');
      return { id: parseInt(kv[0], 10) || 0, count: parseInt(kv[1], 10) || 0 };
    });

    const { s, logs } = makeServer();
    const seed = {};
    for (const c of costs) seed[c.id] = (seed[c.id] || 0) + c.count + 5;
    s.dispatch('User', 'bzSeedBag', { itemObj: seed });

    const before = s.loadSave();
    const beforeWallet = meta.field ? wallet(before, meta) : null;
    const res = (s.dispatch('User', 'exchangeItem', { npcid: parseInt(npc, 10), itemID: rowId, itemNum: 1 }) || {})['User.exchangeItem'] || {};
    const after = s.loadSave();
    const note = res.note || {};

    const bad = [];
    const tag = `npc ${npc} 行 ${rowId} → ${meta.name} ×${per}`;

    if (!meta.field) {
      // 没有可持久化钱包字段的货币：唯一合法行为是 eRet:4 且成本不动
      if (res.eRet !== 4) bad.push(`eRet=${res.eRet}（应 4：无法入账必须明确拒绝）`);
      if (after.bag && after.bag[String(rewardId)] !== undefined) bad.push(`bag["${rewardId}"]=${after.bag[String(rewardId)]}（不许发进背包）`);
      for (const c of costs) {
        const seedN = seed[c.id];
        const nowN = parseInt((after.bag || {})[c.id], 10) || 0;
        if (nowN === seedN - c.count) bad.push(`成本 ${c.id} 被扣了（拒绝路径不许扣成本）`);
      }
    } else {
      if (res.eRet !== 1) bad.push(`eRet=${res.eRet}（应 1）`);
      const afterWallet = wallet(after, meta);
      if (afterWallet - beforeWallet !== per) {
        bad.push(`钱包 ${meta.field} ${beforeWallet}→${afterWallet}（应 +${per}）`);
      }
      if (after.bag && after.bag[String(rewardId)] !== undefined) {
        bad.push(`bag["${rewardId}"]=${after.bag[String(rewardId)]}（货币不许进背包）`);
      }
      if (!note.eco || note.eco[meta.ecoKey] !== afterWallet) {
        bad.push(`note.eco.${meta.ecoKey}=${note.eco ? note.eco[meta.ecoKey] : undefined}（应=${afterWallet}，客户端只认这个键）`);
      }
      if (note.ivch && note.ivch[String(rewardId)] !== undefined) {
        bad.push(`note.ivch["${rewardId}"]=${note.ivch[String(rewardId)]}（货币不许走 ivch）`);
      }
      // 成本必须真扣：这是"交易"不是白送
      for (const c of costs) {
        const seedN = seed[c.id];
        const nowN = parseInt((after.bag || {})[c.id], 10) || 0;
        if (nowN !== seedN - c.count) bad.push(`成本 ${c.id} ${seedN}→${nowN}（应 -${c.count}）`);
      }
    }

    if (bad.length) fails.push({ tag, bad, log: logs.slice(-1)[0] });
  }
}

console.log(`核心目录：${CORE}`);
console.log(`奖励=货币 id 的兑换行：${total}`);
for (const f of fails) {
  console.log(`❌ ${f.tag}`);
  for (const b of f.bad) console.log(`     ${b}`);
  if (f.log) console.log(`     log: ${f.log}`);
}
if (!fails.length) {
  console.log(`✅ ${total}/${total} 行全部通过（钱包精确入账 + 账本无假键 + eco 键名正确 + 成本照扣）`);
  process.exit(0);
}
console.log(`\n结论：${fails.length}/${total} 行失败 —— 货币奖励没有正确进入钱包。`);
process.exit(1);
