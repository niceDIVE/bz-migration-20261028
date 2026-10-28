'use strict';
/**
 * achieve_buckets.js —— R05 Q5 / H4 的第一步判别：成就到底有「多少能从存档推导」
 *
 * 判据来源（不是猜，是客户端自己怎么算的）：
 *   `AchievementModel.getAcheivementPrg1(id)`（scripts3.js:3052-3197）是"当前进度"的唯一计算处：
 *     1) 先看服务端应答里的 `taskData`（`this.tObj`，键 = `type_type1` 或 `type_type1_require`，
 *        3055-3056 / 3084）——**有就用服务端的值**；
 *     2) 没有才走本地 switch（3084-3196）自己算。
 *   该 switch 里出现 `case N: break;`（无计算体）的分支 = **客户端本地算不出来**，
 *   只能靠服务端 taskData；其余分支从本地模型（技能等级/持有数/已完成任务/门派/房屋/称号…）现算。
 *
 * 所以本脚本做两件事（纯读配置 + 读上面那张 switch 表）：
 *   A. 把 2113 行按 (type, type1) 分桶，标出"本地可算 / 只能靠服务端"；
 *   B. 给出每桶的 `require` 形状样本，便于人工判语义。
 *
 * 已知限制（写进产物）：
 *   - `require` 的**语义**要靠语言表 `des` 读原文，而语言表**不在** `tools/cfg/dump/`（442 张里没有），
 *     所以本脚本只给形状，不臆测含义。
 *   - 本脚本不判断"客户端本地算得对不对"，只判断"客户端有没有这个计算分支"。
 *
 * 输出：tools/facts/achieve-buckets.json
 * 跑法：node tools/achieve_buckets.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LIST = path.join(ROOT, 'tools', 'cfg', 'dump', 'achieve_list.json');
const OUT = path.join(ROOT, 'tools', 'facts', 'achieve-buckets.json');

/**
 * 客户端本地能否算（逐条转录自 scripts3.js:3084-3196 的 switch，行号即证据）：
 *   'yes' = 该分支会从本地模型算出一个值；
 *   'no'  = `case N: break;`（无计算体）→ 只能靠服务端 taskData；
 *   'partial' = 部分子类会算、部分会去读 tObj。
 */
const LOCAL = {
  1: {
    4: ['yes', 'scripts3.js:3087-3090 calAppearance(baseGengu,numDeaths,appearBase)'],
    5: ['yes', 'scripts3.js:3092-3105 SkillTable.getSkillLevel 全技能等级比较'],
    7: ['yes', 'scripts3.js:3108-3109 RoleOtherInfo.reBirthTime'],
    8: ['yes', 'scripts3.js:3112-3113 RoleBaseInfo.masters.length'],
    10: ['yes', 'scripts3.js:3116-3118 MarryModel.houseMap 计数'],
    11: ['no', 'scripts3.js:3121-3122 case 11: break（无计算体）'],
    12: ['yes', 'scripts3.js:3124-3129 hastitleLevel 与 require 列表比对'],
    17: ['yes', 'scripts3.js:3132-3138 gengudanTime/3600（含 Buff 1043 封顶）'],
    18: ['yes', 'scripts3.js:3141-3145 RoleBaseInfo.getItemNum 逐条比较'],
    19: ['yes', 'scripts3.js:3059-3061 读 this.tObj[c][1]（依赖服务端数组）'],
  },
  2: {
    3: ['no', 'scripts3.js:3167-3168 case 3: break（无计算体）'],
    10: ['yes', 'scripts3.js:3155-3164 已镶嵌宝石数（crystalDic/inlayEquipIds）'],
    // 其余 type1 走 3152 的 case 3 分支？不，3167 才是 case 3；未列出的走 default → 视为未知
  },
  3: { '*': ['no', 'scripts3.js:3167-3168 整块 case 3: break（该大类本地完全不计算）'] },
  4: {
    1: ['yes', 'scripts3.js:3173-3174 finishTaskObj 是否含该任务 id'],
    2: ['yes', 'scripts3.js:3177-3178 finishTaskObj[id] == require 值'],
  },
  5: {
    1: ['no', 'scripts3.js:3184-3185 case 1: break（无计算体）'],
    2: ['yes', 'scripts3.js:3187-3188 RoleOtherInfo.outSchoolAy.length'],
    9: ['partial', 'scripts3.js:3191-3193 读 this.tObj[c+_+require]，即靠服务端'],
  },
};
function localOf(type, type1) {
  const t = LOCAL[type];
  if (!t) return ['unknown', 'scripts3.js:3084-3196 的 switch 里没有 type=' + type + ' 的分支 → 只会读服务端 tObj'];
  if (t['*']) return t['*'];
  const key = parseInt(type1, 10);
  if (t[key]) return t[key];
  return ['unknown', 'scripts3.js:3084-3196 里 type=' + type + ' 没有 type1=' + key + ' 的分支（走 default → 只读 tObj）'];
}

const raw = JSON.parse(fs.readFileSync(LIST, 'utf8'));
const rowsObj = raw.data || raw.table || {};
const rows = Object.values(rowsObj);

const buckets = {};
for (const r of rows) {
  const type = parseInt(r.type, 10) || 0;
  const type1 = String(r.type1 == null ? '' : r.type1);
  const key = type + '|' + type1;
  if (!buckets[key]) {
    const [canLocal, why] = localOf(type, type1);
    buckets[key] = { type, type1, rows: 0, canLocal, why, requireSamples: [], groups: {}, ids: [] };
  }
  const b = buckets[key];
  b.rows++;
  b.groups[r.group] = (b.groups[r.group] || 0) + 1;
  if (b.requireSamples.length < 4) b.requireSamples.push(String(r.require));
  if (b.ids.length < 5) b.ids.push(r.id);
}

const byCan = { yes: 0, no: 0, partial: 0, unknown: 0 };
const list = Object.values(buckets).sort((a, b) => b.rows - a.rows);
for (const b of list) byCan[b.canLocal] = (byCan[b.canLocal] || 0) + b.rows;

const total = rows.length;
const out = {
  generatedAt: new Date().toISOString(),
  question: 'R05 Q5 / H4：成就进度里有多少能从存档推导、多少必须靠服务端',
  total,
  distinctBuckets: list.length,
  byCanLocal: byCan,
  verdict: {
    可从存档推导的行数: byCan.yes + byCan.partial,
    只能靠服务端taskData的行数: byCan.no + byCan.unknown,
    可从存档推导占比: +(((byCan.yes + byCan.partial) / total) * 100).toFixed(1),
  },
  evidence: 'scripts3.js:3052-3197 getAcheivementPrg1（先读 this.tObj，再走本地 switch）；taskData 由 getAchieveData 下发',
  limits: [
    'require 的语义需要语言表 des 原文，而语言表不在 tools/cfg/dump/（442 张里没有 language 表）',
    '"yes" 只表示客户端有本地计算分支，不代表我们能复现同样的值',
  ],
  buckets: list,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');

console.log('成就分桶（achieve_list ' + total + ' 行 / ' + list.length + ' 个 (type|type1) 桶）');
console.log('  本地可算：' + byCan.yes + ' 行  部分可算：' + byCan.partial + ' 行');
console.log('  只能靠服务端 taskData：' + byCan.no + ' 行  未知分支：' + byCan.unknown + ' 行');
console.log('  → 能从存档推导 ' + out.verdict['可从存档推导占比'] + '%（' + out.verdict['可从存档推导的行数'] + ' 行）');
console.log('  头部桶：');
for (const b of list.slice(0, 8)) {
  console.log('    ' + b.type + '|' + b.type1 + '  rows=' + b.rows + '  local=' + b.canLocal
    + '  require例=' + JSON.stringify(b.requireSamples.slice(0, 2)));
}
console.log('  -> ' + path.relative(ROOT, OUT));
