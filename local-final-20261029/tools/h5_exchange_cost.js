'use strict';
/**
 * h5_exchange_cost.js —— 回答 R05 Q4 的 H5：「兑换代价里有没有付费货币」
 *
 * 背景（R05 回执 Q4 边界的第 5 条）：
 *   「付费边界：只要某一行兑换的代价是付费货币（4001–4003 是不是付费货币，材料未提供），
 *    这一行就要从召唤后的货架里排除，否则就违反了"不实现支付"。」
 *
 * 本脚本只做**机械统计**：把 BZ_EXCHANGE 1220 行的成本串拆开，按 item 表的 Type 与
 * 客户端 `getItemNum` 的货币分支（index.js:106347-106360）给每个 id 定性，然后数出
 * 「代价里用了付费货币」的行有多少、是哪些 npc、以及有没有"整店全排掉"的店。
 *
 * 货币定性依据（全部有源码出处）：
 *   index.js:106347-106360 `RoleBaseInfo.getItemNum`：
 *     1 → this.gold（金条） / 4001 → this.coins（银两） / 4003 → this.potentials（潜能） /
 *     4002 → exp（经验） / 8888 → this.yuanbao（元宝）
 *   项目边界里「付费」只指**真实货币购买**：金条(1)/元宝(8888) 在本作里由充值渠道产生
 *   （客户端缺钱统一走 `StoreModel.openChargeList()`，见 §18.4），银两/潜能/经验是玩法产出。
 *   → 本脚本把 {1, 8888} 记为**付费货币**，{4001,4002,4003} 记为**玩法货币**，其余按 item.Type 分类。
 *
 * 输出：tools/facts/h5-exchange-cost.json
 * 跑法：node tools/h5_exchange_cost.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GEN = path.join(ROOT, 'hotfix-patch', 'core', 'bz-tasks.generated.js');
const ITEM = path.join(ROOT, 'tools', 'cfg', 'tbl_item.json');
const OUT = path.join(ROOT, 'tools', 'facts', 'h5-exchange-cost.json');

const gen = fs.readFileSync(GEN, 'utf8');
const EX = JSON.parse(gen.match(/var BZ_EXCHANGE = (\{.*?\});\s*\n/s)[1]);

const itemRaw = JSON.parse(fs.readFileSync(ITEM, 'utf8'));
const itemRows = itemRaw.data || itemRaw.table || {};
const itemById = {};
for (const k of Object.keys(itemRows)) {
  const r = itemRows[k];
  if (!r || typeof r !== 'object') continue;
  const id = parseInt(r.ID, 10);
  if (id > 0) itemById[id] = r;
}

/** 货币定性（与 index.js:106347-106360 的 getItemNum 分支逐条对应） */
const CURRENCY = {
  1: { name: '金条(gold)', kind: 'paid' },
  8888: { name: '元宝(yuanbao)', kind: 'paid' },
  4001: { name: '银两(coins)', kind: 'game' },
  4002: { name: '经验(exp)', kind: 'game' },
  4003: { name: '潜能(potentials)', kind: 'game' },
};

function classify(id) {
  if (CURRENCY[id]) return CURRENCY[id];
  const it = itemById[id];
  if (!it) return { name: '未知 id（item 表查不到）', kind: 'unknown' };
  const t = parseInt(it.Type, 10) || 0;
  const tName = t === 1 ? '装备(Type1)' : t === 2 ? '消耗品(Type2)' : t === 3 ? '材料(Type3)' : 'Type' + t;
  return { name: tName, kind: 'item', type: t };
}

const rows = [];
const byNpc = {};
let totalRows = 0, paidRows = 0, paidCostSegs = 0, unknownRows = 0;
const paidSamples = [];
const costKindCounter = {};
const rewardPaidRows = [];

for (const npc of Object.keys(EX)) {
  const list = EX[npc] || [];
  byNpc[npc] = { rows: list.length, paidRows: 0, paidKinds: {}, unknownRows: 0 };
  for (const row of list) {
    totalRows++;
    const rowId = parseInt(row[0], 10);
    const rewardItem = parseInt(row[2], 10);
    const rewardNum = parseInt(row[3], 10);
    const costStr = String(row[4] || '');
    const segs = costStr.split('|').filter(Boolean);
    const costs = [];
    let rowPaid = false, rowUnknown = false;
    for (const seg of segs) {
      const kv = seg.split(',');
      const cid = parseInt(kv[0], 10) || 0;
      const cnt = parseInt(kv[1], 10) || 0;
      const c = classify(cid);
      costs.push({ id: cid, count: cnt, name: c.name, kind: c.kind });
      costKindCounter[c.kind] = (costKindCounter[c.kind] || 0) + 1;
      if (c.kind === 'paid') { rowPaid = true; paidCostSegs++; }
      if (c.kind === 'unknown') rowUnknown = true;
    }
    const rw = classify(rewardItem);
    if (rw.kind === 'paid') rewardPaidRows.push({ npc, rowId, rewardItem, rewardNum, rewardName: rw.name });
    if (rowPaid) {
      paidRows++;
      byNpc[npc].paidRows++;
      for (const c of costs) if (c.kind === 'paid') byNpc[npc].paidKinds[c.id] = (byNpc[npc].paidKinds[c.id] || 0) + 1;
      if (paidSamples.length < 20) paidSamples.push({ npc, rowId, rewardItem, rewardNum, costs });
    }
    if (rowUnknown) { unknownRows++; byNpc[npc].unknownRows++; }
    rows.push({ npc, rowId, reward: { id: rewardItem, num: rewardNum, name: rw.name, kind: rw.kind }, costs, paid: rowPaid, unknown: rowUnknown });
  }
}

/** 整店被判"全排掉"的 npc（付费行占比 100% 且行数>0） */
const fullyPaidNpcs = Object.keys(byNpc).filter((n) => byNpc[n].rows > 0 && byNpc[n].paidRows === byNpc[n].rows);

const out = {
  generatedAt: new Date().toISOString(),
  question: 'R05 Q4 / H5：兑换（getChangeShop + exchangeItem）的代价里有没有付费货币',
  source: 'hotfix-patch/core/bz-tasks.generated.js 的 BZ_EXCHANGE（10 npc / 1220 行）+ tools/cfg/tbl_item.json',
  currencyRules: {
    paid: ['1 金条(gold)', '8888 元宝(yuanbao)'],
    game: ['4001 银两(coins)', '4002 经验(exp)', '4003 潜能(potentials)'],
    evidence: 'index.js:106347-106360 RoleBaseInfo.getItemNum 的货币分支；付费渠道见 §18.4（缺钱统一 openChargeList）',
  },
  stat: {
    npcs: Object.keys(EX).length,
    totalRows,
    paidRows,
    paidRatio: totalRows ? +(paidRows / totalRows * 100).toFixed(2) : 0,
    paidCostSegs,
    unknownRows,
    costSegKind: costKindCounter,
    fullyPaidNpcs,
  },
  byNpc,
  paidSamples,
  rewardPaidRows,
  rows,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');

console.log('H5 兑换代价统计');
console.log('  npc=' + out.stat.npcs + '  行=' + totalRows);
console.log('  代价里含**付费货币**的行 = ' + paidRows + '（' + out.stat.paidRatio + '%），付费代价段 ' + paidCostSegs);
console.log('  item 表查不到的代价 id 行 = ' + unknownRows);
console.log('  代价段类型分布：' + Object.keys(costKindCounter).map((k) => k + '=' + costKindCounter[k]).join('  '));
console.log('  整店全为付费代价的 npc：' + (fullyPaidNpcs.length ? fullyPaidNpcs.join(',') : '无'));
console.log('  奖励是付费货币的行 = ' + rewardPaidRows.length);
for (const s of paidSamples.slice(0, 6)) {
  console.log('   例 npc ' + s.npc + ' 行 ' + s.rowId + ' → 奖励 ' + s.rewardItem + '×' + s.rewardNum
    + '  代价 ' + s.costs.map((c) => c.id + '(' + c.name + ')×' + c.count).join(' + '));
}
console.log('  -> ' + path.relative(ROOT, OUT));
