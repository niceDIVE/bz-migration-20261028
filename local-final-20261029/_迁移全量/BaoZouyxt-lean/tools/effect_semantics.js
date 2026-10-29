'use strict';
/**
 * effect_semantics.js —— ② Effect 码语义取证的**主审侧**部分（只读）
 *
 * 目的：回答"药品/秘籍到底该按哪一列、加成什么属性"（R05 之后我们自己的遗留）。
 *
 * 已确证的证据链（不是猜）：
 *   1) `useItemFunc(e, o, r, s)`（index.js:65264-65302）里的 `o` **就是 item.Effect**，
 *      请求参数按 Effect 分流：
 *        2 == o → 带 `curHp` + `maxhpLimit`      （→ 回血类）
 *        3 == o → 带 `curMp` + `maxmpLimit`      （→ 回内类）
 *        1 == o → 带 `hg`                        （→ 饱食度类，已实现）
 *        6/23/25/33 → 带 hp/mp 的 limit 或 finalValue（丹药/临时上限类）
 *      客户端**只在这些分支里**才带对应上限 → 反过来证明该 Effect 作用于那个属性。
 *   2) `note.attrch` 是唯一落地通道（142391-142500 的 switch）：
 *        可写 `curhp / curmp / hplmt / hpbase / mpbase / hunger / exp / ptt …`
 *   3) 客户端**不本地应用任何效果**（所以我们不发 attrch 就等于没效果）。
 *
 * 本脚本输出：每个 Effect 值的物品数、样本 id、样本的 Data1..5（加成数值候选列）、
 * 以及"该 Effect 是否已有 attrch 落地通道"的判断表。
 * 语言表原文不在 dump 里（442 张中无 language 表），需要端上 `getText` 取样（见 HANDOVER §22）。
 *
 * 输出：tools/facts/effect-semantics.json
 * 跑法：node tools/effect_semantics.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ITEM = path.join(ROOT, 'tools', 'cfg', 'tbl_item.json');
const OUT = path.join(ROOT, 'tools', 'facts', 'effect-semantics.json');

/** attrch 的落地能力（转录自 index.js:142391-142500 的 switch，键名逐字） */
const ATTRCH_KEYS = ['mpTrained', 'mpbase', 'hpbase', 'curmp', 'curhp', 'hplmt', 'exp', 'evil', 'school',
  'seniorSchool', 'ndeath', 'hunger', 'nhgtimes', 'gtime', 'luck', 'appearBase', 'armStrong', 'shenFa',
  'bone', 'savvy', 'hitChBase', 'dodgeBase', 'atkBase', 'defenseBase'];

/** 请求参数 → 该 Effect 作用于什么（来自 65264-65302 的分支，行号即证据） */
const EFFECT_HINT = {
  1: { acts: 'hunger(饱食度)', req: 'hg', evid: 'index.js:65302', attrch: 'hunger', impl: 'yes（§19.17-① 已实现）' },
  2: { acts: 'hp(生命)', req: 'curHp + maxhpLimit', evid: 'index.js:65277-65279', attrch: 'curhp（上限 hplmt）', impl: 'no' },
  3: { acts: 'mp(内力)', req: 'curMp + maxmpLimit', evid: 'index.js:65280-65282', attrch: 'curmp', impl: 'no' },
  6: { acts: 'hp 上限相关', req: 'maxhpLimit + hpfinalValue', evid: 'index.js:65283-65285', attrch: 'hplmt / hpbase', impl: 'no' },
  23: { acts: 'hp/mp 按 finalValue 补满', req: 'curHp/maxhpLimit/curMp/maxmpLimit(finalValue)', evid: 'index.js:65291-65295', attrch: 'curhp / curmp', impl: 'no' },
  25: { acts: 'hp+mp 双补', req: 'curHp/maxhpLimit/curMp/maxmpLimit', evid: 'index.js:65286-65290', attrch: 'curhp / curmp', impl: 'no' },
  33: { acts: 'hp/mp + 最终值', req: 'curHp/curMp/limits + hpfinalValue', evid: 'index.js:65296-65301', attrch: 'curhp / curmp / hplmt', impl: 'no' },
  11: { acts: '技能（秘籍）', req: '无附加参数（只带 itemID/itemNum）', evid: 'index.js:65273-65302（11 不落任何分支）', attrch: 'note.skch（只弹提示，不写模型：64754-64763）', impl: 'no（需要服务端写 skills 档）' },
  36: { acts: '券类（限时券/战令券）', req: '无（不是"使用"，是被消耗）', evid: 'tools/cfg/tbl_item.json 7298/7851 Effect=36', attrch: '—', impl: '不适用' },
};

const raw = JSON.parse(fs.readFileSync(ITEM, 'utf8'));
const rows = raw.data || raw.table || {};
const byEffect = {};
for (const k of Object.keys(rows)) {
  const r = rows[k];
  if (!r || typeof r !== 'object') continue;
  const id = parseInt(r.ID, 10);
  if (!(id > 0)) continue;
  const eff = parseInt(r.Effect, 10) || 0;
  if (!byEffect[eff]) byEffect[eff] = { effect: eff, count: 0, samples: [] };
  byEffect[eff].count++;
  if (byEffect[eff].samples.length < 6) {
    byEffect[eff].samples.push({
      id,
      Type: parseInt(r.Type, 10) || 0,
      Data1: r.Data1, Data2: r.Data2, Data3: r.Data3,
      BuyPrice: r.BuyPrice, Price: r.Price,
      desId: r.Description,
    });
  }
}
const list = Object.values(byEffect).sort((a, b) => b.count - a.count);
for (const b of list) {
  b.hint = EFFECT_HINT[b.effect] || { acts: '未知（未在 useItemFunc 的分支表里）', req: '未知', evid: 'index.js:65264-65302 无此分支', attrch: '未知', impl: 'unknown' };
}

const out = {
  generatedAt: new Date().toISOString(),
  question: 'Effect 码语义：药品（回血/回内）与秘籍（学技能）该按哪列、走哪个落地点',
  evidenceChain: [
    'index.js:65264-65302 useItemFunc 按 item.Effect 决定请求带哪些上限参数（客户端只在该 Effect 才带）',
    'index.js:142391-142500 note.attrch 是唯一落地通道，键名见 attrchKeys',
    'index.js:64754-64763 note.skch 只弹提示、不写模型',
  ],
  attrchKeys: ATTRCH_KEYS,
  effectTable: list,
  languageTable: 'not in tools/cfg/dump/（442 张里没有 language 表）→ 需要端上 getText 取样',
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');

console.log('Effect 分布（' + list.length + ' 种）：');
for (const b of list.slice(0, 14)) {
  console.log('  Effect=' + String(b.effect).padStart(3) + '  物品 ' + String(b.count).padStart(4)
    + '  样本 ' + b.samples.slice(0, 3).map((s) => s.id).join(',')
    + '  → ' + b.hint.acts + '  [attrch: ' + b.hint.attrch + ']');
}
console.log('  -> ' + path.relative(ROOT, OUT));
