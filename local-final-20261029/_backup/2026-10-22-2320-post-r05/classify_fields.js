'use strict';
/**
 * classify_fields.js —— 字段读取模式分类器（R05 回执 Q1 的落地件）
 *
 * 目的：把每个「动作 × 应答字段」判成 契约 / 开关 / 键集合契约 / 惰性可缺 / 惰性 / 未定，
 * 供 gen_shapes.js 决定「哪些字段可以补默认值、哪些一律不填」。
 *
 * 为什么需要它（R05 审阅原文）：
 *   「最大的错位是 F1 暴露出来的"自检恒真"……dispatch 的顺序是先跑 handler、再跑 fillShape，
 *     所以"形状字段必须在应答里"这条断言检查的其实是 fillShape 自己的产出，永远为绿。」
 *   要么在形状表源头不产出开关字段，要么让自检按来源判——两条都得先知道谁是开关。
 *
 * 判定顺序（R05 Q1 的规则，逐条实现）：
 *   1) 只要有一处读取点是在判断之外**解引用**（`.子字段` / `[下标]` / 作为参数传出去）→ 契约
 *   2) 否则有**存在开关**（`hasOwnProperty("f")` / `"f" in X` / 与 undefined 比较）→ 开关
 *      特例：`X.f.hasOwnProperty(...)` → 键集合契约（客户端把 f 当字典用）
 *   3) 否则只有真值开关 / 或运算默认值 → 惰性可缺
 *   4) 完全没有读取点 → 惰性
 *   5) 别名解析不出来 → 未定（进人工清单，不自动处理）
 *
 * 别名：做**一层**跟踪（R05 允许的范围）：
 *   `var t = e.f` / `this.x = o.f` / `n = e.data.f` → 记别名 t / this.x / n，
 *   然后只在"别名被解引用"的行上追加读取点。
 *   已知盲区（R05 §7 反例，不假装覆盖）：动态字段名 `e[k]`、跨类事件派发、
 *   `setTimeout` / `scheduleOnce` 里的延迟读取、`for..in` 的键分发链路。
 *
 * 产出：
 *   tools/facts/field-classes.json  —— 逐字段分类 + 每个读取点的 bundle:line/mode/原文
 *   tools/facts/field-classes.js    —— gen_shapes.js 直接 require 的共享数据（SWITCH 集合）
 *
 * 验收：内置 6 条已知故障当标注集（R05 Q1 点名的），任何一条判错 → 退出码 1，不许上线。
 *
 * 跑法：node tools/classify_fields.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BUNDLES = [
  { name: 'index.js', file: path.join(__dirname, 'index.js') },
  { name: 'scripts2.js', file: path.join(__dirname, 'scripts2.js') },
  { name: 'scripts3.js', file: path.join(__dirname, 'scripts3.js') },
];
const SHAPES = path.join(__dirname, 'shapes.json');
const OUT_JSON = path.join(__dirname, 'facts', 'field-classes.json');
const OUT_JS = path.join(__dirname, 'facts', 'field-classes.js');

const CLASS = {
  CONTRACT: '契约',
  SWITCH: '开关',
  KEYSET: '键集合契约',
  LAZY: '惰性可缺',
  DEAD: '惰性',
  UNKNOWN: '未定',
};

/** 会被 fillShape 默认填、因此**绝不能**给"开关"类字段填默认值的两类 */
const NO_DEFAULT = [CLASS.SWITCH, CLASS.KEYSET];

function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/* ------------------------------------------------------------------ *
 * 1. 收集字段清单：shapes.json 里出现过的全部字段（取最后一段）
 * ------------------------------------------------------------------ */
const shapesRaw = JSON.parse(fs.readFileSync(SHAPES, 'utf8'));
const actionShapes = shapesRaw.shapes || {};
const fieldIndex = new Map();   // fieldName -> Set(action)
function addField(action, f) {
  const leaf = f.indexOf('.') >= 0 ? f.split('.').pop() : f;
  if (!leaf || leaf === '__meta') return;
  if (!fieldIndex.has(leaf)) fieldIndex.set(leaf, new Set());
  fieldIndex.get(leaf).add(action);
}
for (const a of Object.keys(actionShapes)) {
  const fields = (actionShapes[a] && actionShapes[a].fields) || {};
  for (const f of Object.keys(fields)) addField(a, f);
}
// R05 验收里有一条不在我们形状表里（GetFashionList.FashionArr 缺条目），显式补进来当探针
const PROBES = [
  ['useItem', 'formulaID'],
  ['GetFashionList', 'FashionArr'],
  ['getFriendPartner', 'notFriendPartnerData'],
  ['getAchieveData', 'groupPoints'],
  ['getActivityCounts', 'dataArr'],
  ['getSevenTaskList', 'taskObj'],
];
for (const [a, f] of PROBES) addField(a, f);

/* ------------------------------------------------------------------ *
 * 2. 一遍扫三个 bundle：每个字段的读取点 + 一层别名
 * ------------------------------------------------------------------ */
// 判定用的行内特征（先粗筛，省掉 33 万行 × 1000 字段的笛卡尔积）
const MAYBE = /hasOwnProperty|" in |' in |undefined|if\s*\(|\|\||\?|\btypeof\b/;
const IDENT = /[A-Za-z_$][\w$]*/g;

// 三个 bundle 只读一次（内存够，且避免"每字段重读一遍"把进程撑爆）
const LINES = BUNDLES.map((b) => ({ name: b.name, lines: fs.readFileSync(b.file, 'utf8').split('\n') }));

const points = new Map();    // field -> [{bundle, line, mode, text}]
const aliases = new Map();   // field -> Set(alias)
function pushPoint(f, p) {
  if (!points.has(f)) points.set(f, []);
  points.get(f).push(p);
}
function pushAlias(f, a) {
  if (!aliases.has(f)) aliases.set(f, new Set());
  aliases.get(f).add(a);
}

for (const b of LINES) {
  const lines = b.lines;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 900) continue;                       // 压缩成一整行的文件头，逐字段解析没意义
    const ids = line.match(IDENT);
    if (!ids || !ids.length) continue;
    // 该行出现了哪些我们关心的字段
    const seen = new Set();
    for (const id of ids) if (fieldIndex.has(id)) seen.add(id);
    if (!seen.size) continue;
    const maybeGuard = MAYBE.test(line);
    for (const f of seen) {
      const F = esc(f);
      // —— 键集合契约：X.f.hasOwnProperty(...)
      if (new RegExp('\\.' + F + '\\.hasOwnProperty\\s*\\(').test(line)) {
        pushPoint(f, { bundle: b.name, line: i + 1, mode: 'keyset', text: line.trim().slice(0, 300) });
        continue;
      }
      // —— 存在开关
      const presence =
        new RegExp('hasOwnProperty\\s*\\(\\s*["\']' + F + '["\']').test(line) ||
        new RegExp('["\']' + F + '["\']\\s+in\\s').test(line) ||
        new RegExp('\\.' + F + '\\s*[!=]==?\\s*undefined').test(line) ||
        new RegExp('typeof\\s+[\\w.$]*\\.' + F + '\\b').test(line);
      if (presence) {
        pushPoint(f, { bundle: b.name, line: i + 1, mode: 'presence', text: line.trim().slice(0, 300) });
        continue;
      }
      // —— 解引用：.f 后跟 `.子字段` 或 `[下标]`（判断之外才算契约；R05 Q1 把两者都算契约，
      //    但两者优先级不同：真正的属性访问 > 键集合 > 下标访问，见第 4 节）
      const dotDeref = new RegExp('\\.' + F + '\\s*\\.\\s*[A-Za-z_$]').test(line);
      const idxDeref = new RegExp('\\.' + F + '\\s*\\[').test(line);
      if (dotDeref) {
        pushPoint(f, { bundle: b.name, line: i + 1, mode: 'deref-dot', text: line.trim().slice(0, 300) });
        continue;
      }
      if (idxDeref) {
        pushPoint(f, { bundle: b.name, line: i + 1, mode: 'deref-index', text: line.trim().slice(0, 300) });
        continue;
      }
      // —— 成员落库：this.x = obj.f（F4 形态：客户端把应答字段存进成员，别的方法再来读它）
      if (new RegExp('this\\.[\\w$]+\\s*=\\s*[\\w.$\\[\\]]*\\.' + F + '\\b').test(line)) {
        pushPoint(f, { bundle: b.name, line: i + 1, mode: 'member-store', text: line.trim().slice(0, 300) });
        continue;
      }
      // —— 真值开关 / 默认值（只记，不影响最终判定优先级）
      if (maybeGuard) {
        const truthy =
          new RegExp('if\\s*\\([^)]*\\.' + F + '\\b').test(line) ||
          new RegExp('&&\\s*[\\w.$]*\\.' + F + '\\b').test(line) ||
          new RegExp('\\.' + F + '\\s*\\?').test(line) ||
          new RegExp('!\\s*[\\w.$]*\\.' + F + '\\b').test(line);
        const dflt = new RegExp('\\.' + F + '\\s*\\|\\|').test(line);
        if (dflt) { pushPoint(f, { bundle: b.name, line: i + 1, mode: 'default', text: line.trim().slice(0, 300) }); continue; }
        if (truthy) { pushPoint(f, { bundle: b.name, line: i + 1, mode: 'truthy', text: line.trim().slice(0, 300) }); continue; }
      }
      // —— 别名赋值：var t = ...e.f / this.x = ...o.f
      const am = line.match(new RegExp('(?:this\\.)?([A-Za-z_$][\\w$]*)\\s*=\\s*[\\w.$\\[\\]]*\\.' + F + '\\b(?!\\s*[.\\[(])'));
      if (am) {
        const alias = /this\./.test(am[0]) ? 'this.' + am[1] : am[1];
        pushAlias(f, alias);
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * 3. 一层别名回填：别名被解引用/被当字典/被判断的地方，算到原字段头上
 *    （单遍扫描：先把 alias → field 反过来建索引，再逐行比对出现的标识符）
 * ------------------------------------------------------------------ */
const aliasToFields = new Map();
for (const [f, set] of aliases) {
  for (const alias of set) {
    if (alias.length < 1) continue;
    if (!aliasToFields.has(alias)) aliasToFields.set(alias, new Set());
    aliasToFields.get(alias).add(f);
  }
}
for (const b of LINES) {
  const lines = b.lines;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 900) continue;
    const ids = line.match(IDENT);
    if (!ids || !ids.length) continue;
    for (const id of ids) {
      if (!aliasToFields.has(id)) continue;
      const A = esc(id);
      const isKeyset = new RegExp('\\b' + A + '\\.hasOwnProperty\\s*\\(').test(line);
      const isDot = new RegExp('\\b' + A + '\\s*\\.\\s*[A-Za-z_$]').test(line);
      const isIdx = new RegExp('\\b' + A + '\\s*\\[').test(line);
      if (!isKeyset && !isDot && !isIdx) continue;
      const mode = isKeyset ? 'keyset-alias' : (isDot ? 'deref-dot-alias' : 'deref-index-alias');
      for (const f of aliasToFields.get(id)) {
        pushPoint(f, { bundle: b.name, line: i + 1, mode: mode, text: line.trim().slice(0, 300) });
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * 4. 合并成最终分类
 * ------------------------------------------------------------------ */
/** 合并成最终分类（顺序即优先级，R05 Q1 的规则 + 两处我方裁定的细化，均写进 why） */
function classify(f) {
  const pts = points.get(f) || [];
  if (!pts.length) return { cls: CLASS.DEAD, pts: pts, why: '没有任何读取点' };
  const has = (m) => pts.some((p) => p.mode === m);
  if (has('deref-dot') || has('deref-dot-alias')) {
    return { cls: CLASS.CONTRACT, pts: pts, why: '判断之外取子字段（最硬的契约证据）' };
  }
  if (has('keyset') || has('keyset-alias')) {
    return { cls: CLASS.KEYSET, pts: pts, why: '字段本身被当字典用（X.f.hasOwnProperty / alias.f[...]）' };
  }
  if (has('deref-index') || has('deref-index-alias')) {
    return { cls: CLASS.CONTRACT, pts: pts, why: '判断之外按下标取值' };
  }
  if (has('member-store')) {
    return { cls: CLASS.CONTRACT, pts: pts, why: '成员落库（this.x = obj.f）：客户端会在别的方法里读它（F4 形态）' };
  }
  if (has('presence')) {
    return { cls: CLASS.SWITCH, pts: pts, why: '存在开关（hasOwnProperty / in / undefined 比较）' };
  }
  if (has('truthy') || has('default')) {
    return { cls: CLASS.LAZY, pts: pts, why: '只有真值开关或默认值' };
  }
  return { cls: CLASS.UNKNOWN, pts: pts, why: '读取点模式未能归类' };
}

const result = {};
const byClass = {};
let fieldCount = 0;
for (const [f, acts] of fieldIndex) {
  const c = classify(f);
  fieldCount++;
  byClass[c.cls] = (byClass[c.cls] || 0) + 1;
  result[f] = { cls: c.cls, why: c.why, actions: Array.from(acts), points: c.pts.slice(0, 12), pointCount: c.pts.length };
}

/* ------------------------------------------------------------------ *
 * 5. 验收：R05 点名的 6 条必须判对，否则不许上线
 * ------------------------------------------------------------------ */
const EXPECT = [
  ['useItem', 'formulaID', [CLASS.SWITCH], ''],
  ['GetFashionList', 'FashionArr', [CLASS.CONTRACT], ''],
  ['getFriendPartner', 'notFriendPartnerData', [CLASS.CONTRACT], '成员落库 + 两跳别名'],
  ['getAchieveData', 'groupPoints', [CLASS.KEYSET], ''],
  ['getActivityCounts', 'dataArr', [CLASS.CONTRACT], ''],
  // R05 原文对这一条写的是"见下文开关升格"：原始判定先当开关，升格后必须发送。
  // 我们这里按"升格生效后的最终要求"验收（= 契约），原始证据仍记在 points 里。
  ['getSevenTaskList', 'taskObj', [CLASS.CONTRACT], '升格'],
];
/** 开关升格表（R05 Q1「开关升格」）：这些字段原始是开关，但 else 分支会让 UI 卡住，
 *  必须发送 → 生成器**保留**它们的默认值，并在这里登记为"人工裁定"。 */
const PROMOTED = [{ action: 'getSevenTaskList', field: 'taskObj', why: 'index.js:57458 else 分支既不开也不关 UI（§16.3 实测卡死）' }];

const acceptance = EXPECT.map(([a, f, want, note]) => {
  const got = result[f] ? result[f].cls : 'MISSING';
  return { action: a, field: f, want: want.join('|'), got: got, note: note || '', pass: want.indexOf(got) >= 0 };
});
const failed = acceptance.filter((x) => !x.pass);

/* ------------------------------------------------------------------ *
 * 6. 产出：gen_shapes.js 用的开关集合 + 人可读审计
 * ------------------------------------------------------------------ */
const switchMap = {};    // action -> {field: 1}
for (const f of Object.keys(result)) {
  if (NO_DEFAULT.indexOf(result[f].cls) < 0) continue;
  for (const a of result[f].actions) {
    if (!switchMap[a]) switchMap[a] = {};
    switchMap[a][f] = 1;
  }
}

const out = {
  generatedAt: new Date().toISOString(),
  bundles: BUNDLES.map((b) => b.name),
  fieldCount,
  byClass,
  acceptance,
  promoted: PROMOTED,
  blindSpots: [
    '动态字段名（e[k]）不可静态解析',
    '跨类事件派发（把 e 传给别的 UI）不可静态解析',
    'setTimeout / scheduleOnce 的延迟读取不在扫描范围',
    'for..in 键分发链路（如 note 逐键 dispatch）按字段名扫到，但不知道"哪个 key 会派发到哪个处理函数"',
    '一层别名之外（a = e.f; b = a.g; c = b.h）不再跟进',
  ],
  fields: result,
  switchMap,
};
fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 1), 'utf8');
fs.writeFileSync(OUT_JS,
  '/* 自动生成，勿手改：node tools/classify_fields.js\n' +
  ' * 字段读取模式分类（R05 Q1）。SWITCH 里的字段一律**不许**在形状表里给默认值。 */\n' +
  'var BZ_FIELD_CLASSES = ' + JSON.stringify({ byClass: byClass, acceptance: acceptance, switchMap: switchMap }) + ';\n' +
  'if (typeof module !== \'undefined\' && module.exports) module.exports = { BZ_FIELD_CLASSES: BZ_FIELD_CLASSES };\n',
  'utf8');

console.log('CLASSIFY  fields=' + fieldCount);
console.log('  分类：' + Object.keys(byClass).map((k) => k + '=' + byClass[k]).join('  '));
console.log('  开关类字段（不许填默认值）：' + Object.keys(switchMap).length + ' 个动作 / '
  + Object.keys(switchMap).reduce((n, a) => n + Object.keys(switchMap[a]).length, 0) + ' 个字段');
for (const x of acceptance) {
  console.log('  ' + (x.pass ? 'ok  ' : 'FAIL') + '  ' + x.action + '.' + x.field + '  期望 ' + x.want + ' 实得 ' + x.got);
}
console.log('  -> ' + path.relative(ROOT, OUT_JSON));
if (failed.length) {
  console.log('\n验收未通过 ' + failed.length + ' 条 → 分类器不许接入生成器（R05 Q1 硬要求）');
  process.exit(1);
}
