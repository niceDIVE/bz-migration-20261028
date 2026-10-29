'use strict';
/**
 * gen_c09_tables.js —— 第 10 批 C09〔技巧摸奖〕的紧凑表（2026-10-27）
 *
 * 产出 `hotfix-patch\core\bz-c09.generated.js`：`var BZ_KNACK_LOTTERY = {...}`
 *
 * 数据来源（全部是 dump 里的表，逐条可复核）：
 *   · `tools\cfg\dump\skill_Trick_Lotterymachine.json`  —— 摸奖机：价格/免费次数/品质权重/奖池
 *   · `tools\cfg\dump\skill_Trick_Drop.json`            —— 230 行 = 46 技能 × 5 组（drop_group, skillid, 权重）
 *   · `tools\cfg\dump\skill_Trick.json`                 —— 口诀本体：组 × 品质 → knackId
 *
 * 口径（用户 2026-10-27 拍板："先按 drop_probability 抽组，再按 probability 抽品质"）：
 *   ① 在 230 行 drops 上按 `drop_probability` 加权抽一行 → 得到该行的 `drop_group`
 *   ② 在机器表的 `probability`（"1,640|2,200|3,100|4,40|5,20"）上加权抽品质 1..5
 *   ③ `knack[drop_group][品质]` = `skill_Trick` 里同组同品质那一行的 ID
 *
 * 用法：node tools\gen_c09_tables.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DUMP = path.join(ROOT, 'tools', 'cfg', 'dump');
const OUT = path.join(ROOT, 'hotfix-patch', 'core', 'bz-c09.generated.js');

const readDump = (name) => JSON.parse(fs.readFileSync(path.join(DUMP, name), 'utf8'));

/* ---------- 1. 摸奖机（只取 type==1 的常驻池；type>1 是限时池，窗口已过期，见回执） ---------- */
const machine = readDump('skill_Trick_Lotterymachine.json');
const rows = Object.keys(machine.data).map((k) => machine.data[k]);
const main = rows.filter((r) => r.type === 1 && r.switch === 1)[0];
if (!main) throw new Error('skill_Trick_Lotterymachine 里没有 type==1 且 switch==1 的常驻池');
const pools = [main.id];
// ⚠ 只暴露常驻池。行 2/3 的 `opentime/closetime` = 1790697600000→1792339199000（≈2026-09-28→10-18，已过期），
//   `lotteryArr` 决定商城 UI 上的"限时池"按钮（客户端 90366 只挑 type>1 的池显示）→ 把过期池摆上去只会点出空界面。
//   等哪天需要限时池，走 `rebaseActivityWindows` 那套窗口平移（本文件已有先例），不要直接放开。

// probability 形如 "1,640|2,200|3,100|4,40|5,20" → { 1:640, 2:200, 3:100, 4:40, 5:20 }
const qualityWeight = {};
String(main.probability).split('|').forEach((seg) => {
  const kv = seg.split(',');
  const q = parseInt(kv[0], 10), w = parseInt(kv[1], 10);
  if (q > 0 && w > 0) qualityWeight[q] = w;
});
if (!Object.keys(qualityWeight).length) throw new Error('probability 解析为空：' + main.probability);

const ticket = parseInt(main.trick_item, 10) || 0;
const one = parseInt(main.one_shot[1], 10) || 1;
const ten = parseInt(main.ten_shot[1], 10) || 10;
if (!ticket) throw new Error('trick_item 缺失');

/* ---------- 2. 掉落：230 行（drop_group, skillid, weight） ---------- */
const drop = readDump('skill_Trick_Drop.json');
const drops = Object.keys(drop.data).map((k) => drop.data[k]).map((r) => [
  parseInt(r.drop_group, 10) || 0,
  parseInt(r.skillid, 10) || 0,
  parseInt(r.drop_probability, 10) || 0,
]).filter((r) => r[0] > 0 && r[2] > 0);
const skills = Array.from(new Set(drops.map((d) => d[1]))).sort((a, b) => a - b);

/* ---------- 3. 口诀：组 × 品质 → knackId ---------- */
const trick = readDump('skill_Trick.json');
const knack = {};
Object.keys(trick.data).forEach((k) => {
  const r = trick.data[k];
  const g = parseInt(r.Trick_des_group, 10) || 0;
  const q = parseInt(r.Trick_quality, 10) || 0;
  const id = parseInt(r.ID, 10) || 0;
  if (!g || q <= 0 || !id) return;
  (knack[g] = knack[g] || {})[q] = id;
});

/* ---------- 自检：抽出来的组必须都能在 knack 里找到和品质对应的 id ---------- */
const missing = [];
drops.forEach((d) => {
  if (!knack[d[0]]) missing.push(d[0]);
});
const weightSum = drops.reduce((n, d) => n + d[2], 0);
const qSum = Object.keys(qualityWeight).reduce((n, q) => n + qualityWeight[q], 0);

const payload = {
  generatedAt: '2026-10-27T00:00:00.000Z',
  src: {
    machine: 'skill_Trick_Lotterymachine.json',
    drop: 'skill_Trick_Drop.json',
    trick: 'skill_Trick.json',
  },
  machine: {
    id: main.id,
    ticket: ticket,
    one: one,
    ten: ten,
    freeDay: parseInt(main.free_day, 10) || 0,
    qualityWeight: qualityWeight,
    qualityWeightSum: qSum,
    pools: pools,
  },
  skills: skills,
  drops: drops,
  dropWeightSum: weightSum,
  knack: knack,
};

const body = '/* C09 技巧摸奖表（tools/gen_c09_tables.js 生成，请勿手改）' +
  '  drops=' + drops.length + ' 组=' + Object.keys(knack).length + ' 技能=' + skills.length +
  ' 缺组=' + missing.length + ' */\n' +
  'var BZ_KNACK_LOTTERY = ' + JSON.stringify(payload) + ';\n';

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, body, 'utf8');

console.log('机台 id=' + main.id + ' 券=' + ticket + ' 单抽=' + one + ' 十连=' + ten +
  ' 免费/日=' + payload.machine.freeDay + ' 奖池=' + JSON.stringify(pools));
console.log('品质权重=' + JSON.stringify(qualityWeight) + '（合计 ' + qSum + '）');
console.log('drops=' + drops.length + ' 行 权重合计=' + weightSum + ' 技能=' + skills.length + ' 个');
console.log('knack 组=' + Object.keys(knack).length + ' 缺组=' + (missing.length ? missing.slice(0, 5).join(',') : '无'));
console.log('wrote ' + path.relative(ROOT, OUT) + '  ' + Buffer.byteLength(body) + ' B');
if (missing.length) {
  console.error('⚠ 有 ' + missing.length + ' 个 drop_group 在 skill_Trick 里找不到对应组');
  process.exit(1);
}
