'use strict';
/**
 * check_shape_freeze.js —— 形状层的冻结断言（SOTA R07 回执 §5 的 C1–C6）
 *
 * 为什么要有它：形状表是"补缺不覆盖"，判错**不会报错**，只会静默换掉应答外形。
 * 所以改分类器/生成器之前，必须先把"现在实际发出了什么"冻成基线，再用断言守住。
 *
 * 用法：
 *   node tools/check_shape_freeze.js            校验；任一条 FAIL → 退出码 1
 *   node tools/check_shape_freeze.js --freeze   重新冻结基线（**只许在有意的改动后手动跑**）
 *
 * 基线目录 `tools/golden/`：
 *   emission.json          每个动作在空请求 {} 下的完整应答路径 → 值（冻结的真值）
 *   evidence-sha1.json     每个字段的证据行 + 该行 sha1 前 12 位（防证据造假/源码漂移）
 *   expected-stats.json    统计量（杜绝"99 变 87"这种口径漂移）
 *   shapes-normalized.sha1 生成物的 sha1（时间戳行归一化后）
 *   approved-widening.json 人工审批过的"放宽"（原本不发、现在要发）—— 人写，--freeze 不碰
 *   approved-narrowing.json 人工审批过的"收窄"（原本发、现在不发），必须带 escape 逃逸结论
 *
 * 与 R07 §5 的对应：C1/C1b（已知 6 条 + 变异对照）、C2/C2b（不许放宽）、
 * C3/C3b（diff 必须带可验证据）、C4（生成确定性）、C5（统计量现场重算）、C6（__switch 键形状）。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TOOLS = __dirname;
const CORE = path.join(ROOT, 'hotfix-patch', 'core');
const GOLD = path.join(TOOLS, 'golden');
const FRESH = process.argv.indexOf('--freeze') >= 0;

const BUNDLES = ['index.js', 'scripts2.js', 'scripts3.js'];

/* ── 工具 ───────────────────────────────────────────────────────────── */
function md5(buf) { return crypto.createHash('md5').update(buf).digest('hex'); }
function sha1_12(s) { return crypto.createHash('sha1').update(s).digest('hex').slice(0, 12); }
function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function writeJson(p, o) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(o, null, 1), 'utf8'); }

/** 生成物里的"生成于 <ISO 时间>"行与 __meta.gen 会让逐字节比对恒假 → 归一化掉时间戳 */
function normalizedShapesHash() {
  const p = path.join(CORE, 'bz-shapes.generated.js');
  const t = fs.readFileSync(p, 'utf8')
    .replace(/生成于\s*[0-9T:.\-Z]+/g, '生成于 <ts>')
    .replace(/gen:\s*"[0-9T:.\-Z]+"/g, 'gen: "<ts>"');
  return sha1_12(t);
}

/** 读三包某一行（1-based）原文，用来验证证据行没有漂移 */
const lineCache = {};
function bundleLine(bundle, line) {
  if (BUNDLES.indexOf(bundle) < 0) return null;
  if (!lineCache[bundle]) lineCache[bundle] = fs.readFileSync(path.join(TOOLS, bundle), 'utf8').split(/\r?\n/);
  return lineCache[bundle][line - 1] == null ? null : lineCache[bundle][line - 1];
}

/* ── 1. 排放矩阵：337 个形状动作，各自在空请求 {} 下的应答路径 → 值 ────────── */
function sweep() {
  vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-shapes.generated.js'), 'utf8'), { filename: 'bz-shapes.generated.js' });
  vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-tasks.generated.js'), 'utf8'), { filename: 'bz-tasks.generated.js' });
  const { createBzServer } = require(path.join(CORE, 'bz-rpc-server.js'));
  const TPL = require(path.join(CORE, 'templates.json'));
  const shapes = readJson(path.join(TOOLS, 'shapes.json')).shapes;
  const actions = Object.keys(shapes).sort();

  function flatten(v, prefix, acc) {
    if (v === null || typeof v !== 'object') { acc[prefix] = typeof v === 'number' ? v : String(v); return; }
    if (Array.isArray(v)) {
      if (!v.length) { acc[prefix] = '[]'; return; }
      for (let i = 0; i < v.length; i++) flatten(v[i], prefix + '[' + i + ']', acc);
      return;
    }
    const ks = Object.keys(v);
    if (!ks.length) { acc[prefix] = '{}'; return; }
    for (const k of ks) flatten(v[k], prefix ? prefix + '.' + k : k, acc);
  }

  const out = {};
  for (const a of actions) {
    const store = new Map();
    const srv = createBzServer({
      readSave: (k) => (store.has(k) ? store.get(k) : null),
      writeSave: (k, t) => store.set(k, t),
      log: () => {},
      now: () => 1792612412000,
      templates: TPL,
      random: () => 0.5,
    });
    let payload, err = null;
    try {
      const r = srv.dispatch('User', a, {}) || {};
      payload = r['User.' + a] !== undefined ? r['User.' + a] : r;
    } catch (e) { err = String((e && e.message) || e); }
    if (err) { out[a] = { '__error': err }; continue; }
    const acc = {};
    flatten(payload, '', acc);
    out[a] = acc;
  }
  return out;
}

/* ── 2. 已知 6 条的字面量（写死在这里，不读任何生成物 —— 否则就成了"测试通过代替断言"） ── */
const KNOWN = [
  { action: 'useItem', field: 'formulaID', cls: '开关', emitted: false },
  { action: 'GetFashionList', field: 'FashionArr', cls: '契约', emitted: true },
  { action: 'getFriendPartner', field: 'notFriendPartnerData', cls: '契约', emitted: null },
  { action: 'getAchieveData', field: 'groupPoints', cls: '键集合契约', emitted: null },
  { action: 'getActivityCounts', field: 'dataArr', cls: '契约', emitted: null },
  { action: 'getSevenTaskList', field: 'taskObj', cls: '契约', emitted: null },
];

const fails = [];
const notes = [];
function fail(id, msg) { fails.push(id + ': ' + msg); }

/* ── 差异集与"分支签名"（SOTA R08 的 Q1 / C7） ─────────────────────────
 * sigma 编码的是客户端真值判断 / .length / 短路 / 下标读取会看到的那一层差别。
 * 值变了但 sigma 也变 → 必须被 planned-changes 里某条规则显式允许，并带 bundle:line 证据。 */
function sigma(v) {
  if (v === undefined) return 'absent';
  if (v === null) return 'null';
  if (Array.isArray(v)) return v.length ? 'arr+' : 'arr0';
  if (v === '[]') return 'arr0';
  if (v === '{}') return 'obj0';
  const t = typeof v;
  if (t === 'number') return v === 0 ? 'num0' : (v < 0 ? 'num-' : 'num+');
  if (t === 'string') return v === '' ? 'str0' : 'str+';
  if (t === 'boolean') return v ? 'true' : 'false';
  return Object.keys(v).length ? 'obj+' : 'obj0';
}
function leafOfPath(p) { return p.replace(/\[\d+\]/g, '').split('.').pop(); }

/** 基线 vs 现状差异集：[{action,path,field,v0,v1,kind:'add'|'del'|'value'}] */
function collectDiff(curMap, baseMap) {
  const list = [];
  for (const a of Object.keys(baseMap)) {
    for (const p of Object.keys(baseMap[a])) {
      const nowHas = curMap[a] && curMap[a][p] !== undefined;
      if (!nowHas) { list.push({ action: a, path: p, field: leafOfPath(p), v0: baseMap[a][p], v1: undefined, kind: 'del' }); continue; }
      if (String(curMap[a][p]) !== String(baseMap[a][p])) {
        list.push({ action: a, path: p, field: leafOfPath(p), v0: baseMap[a][p], v1: curMap[a][p], kind: 'value' });
      }
    }
  }
  for (const a of Object.keys(curMap)) {
    for (const p of Object.keys(curMap[a])) {
      if (baseMap[a] && baseMap[a][p] !== undefined) continue;
      list.push({ action: a, path: p, field: leafOfPath(p), v0: undefined, v1: curMap[a][p], kind: 'add' });
    }
  }
  return list;
}
function loadPlanned() {
  const p = path.join(GOLD, 'planned-changes.json');
  return fs.existsSync(p) ? readJson(p) : [];
}
function ruleOf(rules, item) {
  return rules.find((r) => {
    const arr = r.field || [];
    if (arr.indexOf(item.field) < 0) return false;
    if (r.action && r.action !== item.action) return false;
    return true;
  }) || null;
}
/** C7 + C8：差异必须被清单覆盖；sigma 变化的要显式允许 + 证据。
 *  strictCounts=true（校验）：规则 expect 必须精确等于匹配数。
 *  strictCounts=false（冻结）：已落进基线的旧差异不再产生 diff，0 匹配的规则视为过期，交给冻结流程归档。 */
function checkPlanned(diffList, rules, strictCounts) {
  const out = [];
  const counts = Object.create(null);
  for (const it of diffList) {
    const r = ruleOf(rules, it);
    if (!r) { out.push(it.action + '|' + it.path + ' 无清单规则覆盖（v0=' + String(it.v0) + ' v1=' + String(it.v1) + '）'); continue; }
    counts[r.id] = (counts[r.id] || 0) + 1;
    const s0 = sigma(it.v0), s1 = sigma(it.v1);
    if (s0 !== s1) {
      if (!r.sigmaChangeAllowed) out.push(it.action + '|' + it.path + ' 签名变了（' + s0 + '→' + s1 + '）但规则 ' + r.id + ' 没允许');
      else if (!r.ev || !/^(index|scripts2|scripts3)\.js:\d+$/.test(String(r.ev))) out.push(it.action + '|' + it.path + ' 签名变化缺 bundle:line 证据（规则 ' + r.id + '）');
    }
  }
  for (const r of rules) {
    const got = counts[r.id] || 0;
    if (r.expect === undefined) continue;
    if (!strictCounts && got === 0) continue;
    if (got !== r.expect) out.push('规则 ' + r.id + ' 期望匹配 ' + r.expect + ' 项，实得 ' + got);
  }
  return out;
}

/* ── 冻结模式 ───────────────────────────────────────────────────────── */
if (FRESH) {
  // C10：先按旧基线算差异、跑 C7/C8；不通过就**拒绝冻结**（否则意外改值会被一起洗进基线）
  const prevPath = path.join(GOLD, 'emission.json');
  const prevRules = loadPlanned();
  const em0 = sweep();
  if (fs.existsSync(prevPath)) {
    const prevBase = readJson(prevPath).actions;
    const dl = collectDiff(em0, prevBase);
    const probs = checkPlanned(dl, prevRules, false);
    if (dl.length && !prevRules.length) probs.unshift('差异 ' + dl.length + ' 项，但 planned-changes.json 为空');
    if (probs.length) {
      console.log('❌ 拒绝冻结（C10）：差异没有被 planned-changes.json 完整、精确地覆盖');
      for (const p of probs.slice(0, 12)) console.log('   ' + p);
      console.log('   先跑 --diff 看清差异，再补 tools/golden/planned-changes.json（每条要写明 expect 与 bundle:line 证据）');
      process.exit(1);
    }
    notes.push('C10 冻结前校验通过：差异 ' + dl.length + ' 项，全部由 ' + prevRules.length + ' 条清单规则覆盖');
  }
  // 冻结成功后归档并清空清单规则（否则下一轮 C8 会报"规则期望 N 项、实得 0"）
  if (prevRules.length) {
    const arch = path.join(GOLD, 'planned-archive');
    fs.mkdirSync(arch, { recursive: true });
    writeJson(path.join(arch, 'frozen-' + Date.now() + '.json'), { archivedAt: new Date().toISOString(), rules: prevRules });
    writeJson(path.join(GOLD, 'planned-changes.json'), []);
    notes.push('已归档 ' + prevRules.length + ' 条清单规则到 tools/golden/planned-archive/，并清空 planned-changes.json');
  }
  const em = em0;
  const facts = readJson(path.join(TOOLS, 'facts', 'field-classes.json'));
  // 证据基线：字段 → 证据行 + 该行 sha1
  const ev = {};
  for (const f of Object.keys(facts.fields)) {
    const pts = (facts.fields[f].points || []).map((p) => {
      const text = bundleLine(p.bundle, p.line);
      return { bundle: p.bundle, line: p.line, sha1: text == null ? null : sha1_12(text.trim()) };
    }).filter((p) => p.sha1);
    if (pts.length) ev[f] = pts;
  }
  const shapes = readJson(path.join(TOOLS, 'shapes.json'));
  const stats = {
    factFields: facts.fieldCount,
    byClass: facts.byClass,
    switchMapActions: Object.keys(facts.switchMap).length,
    switchMapFields: Object.keys(facts.switchMap).reduce((n, a) => n + Object.keys(facts.switchMap[a]).length, 0),
    switchOmittedActions: Object.keys(shapes.switchOmitted || {}).length,
    statActions: shapes.stat.actions,
    statFields: shapes.stat.fields,
    shapeErrors: Object.keys(shapes.errors || {}).length,
    actionCount: Object.keys(em).length,
  };
  writeJson(path.join(GOLD, 'emission.json'), { frozenAt: new Date().toISOString(), impl: process.env.BZ_IMPL || null, actions: em });
  writeJson(path.join(GOLD, 'evidence-sha1.json'), { frozenAt: new Date().toISOString(), fields: ev });
  writeJson(path.join(GOLD, 'expected-stats.json'), stats);
  fs.mkdirSync(GOLD, { recursive: true });
  fs.writeFileSync(path.join(GOLD, 'shapes-normalized.sha1'), normalizedShapesHash() + '\n', 'utf8');
  for (const f of ['approved-widening.json', 'approved-narrowing.json']) {
    const p = path.join(GOLD, f);
    if (!fs.existsSync(p)) writeJson(p, []);
  }
  console.log('冻结完成：动作 ' + Object.keys(em).length + ' 个 / 证据字段 ' + Object.keys(ev).length + ' 个');
  console.log('  stats = ' + JSON.stringify(stats));
  console.log('  -> ' + path.relative(ROOT, GOLD));
  process.exit(0);
}

/* ── 校验模式 ───────────────────────────────────────────────────────── */
const basePath = path.join(GOLD, 'emission.json');
if (!fs.existsSync(basePath)) {
  console.error('缺基线：先跑 node tools/check_shape_freeze.js --freeze');
  process.exit(1);
}
const base = readJson(basePath).actions;
const cur = sweep();

/* --diff：只打印差异集与签名，用来写 planned-changes.json（不判失败） */
if (process.argv.indexOf('--diff') >= 0) {
  const dl = collectDiff(cur, base);
  for (const it of dl) {
    console.log([it.kind, it.action, it.path, JSON.stringify(it.v0), '→', JSON.stringify(it.v1),
      'sigma', sigma(it.v0) + '→' + sigma(it.v1)].join(' | '));
  }
  console.log('diff 总数 = ' + dl.length);
  process.exit(0);
}
const facts = readJson(path.join(TOOLS, 'facts', 'field-classes.json'));
const evBase = readJson(path.join(GOLD, 'evidence-sha1.json')).fields;
const appsW = readJson(path.join(GOLD, 'approved-widening.json'));
const appsN = readJson(path.join(GOLD, 'approved-narrowing.json'));
const expectStats = readJson(path.join(GOLD, 'expected-stats.json'));
const shapes = readJson(path.join(TOOLS, 'shapes.json'));

/* C1 已知 6 条：class 必须等于字面量；能判"发不发"的还要判发不发 */
for (const k of KNOWN) {
  const f = facts.fields[k.field];
  if (!f) { fail('C1', k.field + ' 在分类产物里不存在'); continue; }
  if (f.cls !== k.cls) fail('C1', k.action + '.' + k.field + ' 分类应为 ' + k.cls + '，实得 ' + f.cls);
  if (k.emitted === null) { notes.push('C1 ' + k.action + '.' + k.field + ' 只校分类（该动作不在 337 形状动作里，无形状条目可判发/不发）'); continue; }
  const acc = cur[k.action] || {};
  const hit = Object.keys(acc).some((p) => p === k.field || p.indexOf(k.field + '.') === 0 || p.indexOf(k.field + '[') === 0);
  if (hit !== k.emitted) fail('C1', k.action + '.' + k.field + ' 应当' + (k.emitted ? '发' : '不发') + '，实测' + (hit ? '发' : '不发'));
}

/* C1b 变异对照：故意弄错分类器，6 条验收必须变红、退出码 1，且**不许写产物** */
/** 跑子进程并把它的 stdout/stderr 落到文件（**不用管道**：本机沙箱下 Node 的 piped stdio 会被拒） */
function runCaptured(args, env) {
  const log = path.join(GOLD, '.child.log');
  fs.mkdirSync(GOLD, { recursive: true });
  const fd = fs.openSync(log, 'w');
  let code = 0;
  try {
    execFileSync(process.execPath, args, { env: Object.assign({}, process.env, env || {}), stdio: ['ignore', fd, fd] });
  } catch (e) { code = e.status == null ? 1 : e.status; }
  finally { try { fs.closeSync(fd); } catch (e) {} }
  const out = fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '';
  try { fs.unlinkSync(log); } catch (e) {}
  return { code: code, out: out };
}
(function () {
  const artifacts = ['facts/field-classes.json', 'facts/field-classes.js'].map((p) => path.join(TOOLS, p));
  const before = artifacts.filter(fs.existsSync).map((p) => md5(fs.readFileSync(p)));
  for (const mut of ['reverse-merge', 'drop-evidence:formulaID']) {
    const r = runCaptured([path.join(TOOLS, 'classify_fields.js')], { BZ_MUTATE: mut });
    if (r.code !== 1) fail('C1b', '变异 ' + mut + ' 应退出码 1，实得 ' + r.code + '（说明验收抓不住问题）');
    if (r.out.indexOf('FAIL') < 0) fail('C1b', '变异 ' + mut + ' 跑完没有 FAIL 行：' + r.out.slice(-160).replace(/\n/g, ' '));
  }
  const after = artifacts.filter(fs.existsSync).map((p) => md5(fs.readFileSync(p)));
  if (before.join() !== after.join()) fail('C1b', '变异运行写了产物（污染 facts/）—— 变异必须无副作用');
})();

/* C2 / C2b 不许放宽：基线里没有的路径，现在不许有（审批表除外） */
const wSet = new Set(appsW.map((r) => r.action + '|' + r.path));
const newly = [];
for (const a of Object.keys(cur)) {
  for (const p of Object.keys(cur[a])) {
    const key = a + '|' + p;
    if (base[a] && base[a][p] !== undefined) continue;
    if (wSet.has(key)) continue;
    newly.push(key);
  }
}
if (newly.length) fail('C2', '有 ' + newly.length + ' 条路径被新发出（未在 approved-widening 里）：' + newly.slice(0, 6).join(', '));
for (const r of appsW) {
  if (!r.action || !r.path || !r.reason || r.reason.length < 4) fail('C2b', '审批行缺 action/path/reason：' + JSON.stringify(r).slice(0, 80));
  if (!/^(index|scripts2|scripts3)\.js:\d+$/.test(String(r.ev || ''))) fail('C2b', '审批行 ev 必须是 bundle:line：' + JSON.stringify(r).slice(0, 80));
}

/* C3 / C3b diff 必须带可验证据；"发→不发"必须有逃逸结论 */
const nSet = new Set(appsN.filter((r) => r.escape === 'closed').map((r) => r.action + '|' + r.path));
function fieldOfPath(p) {
  const seg = p.replace(/\[\d+\]/g, '').split('.').pop();
  return seg;
}
function evidenceOk(field) {
  const pts = evBase[field];
  if (!pts || !pts.length) return 'no-evidence';
  for (const p of pts) {
    const text = bundleLine(p.bundle, p.line);
    if (text == null) return 'line-missing ' + p.bundle + ':' + p.line;
    if (sha1_12(text.trim()) !== p.sha1) return 'sha-drift ' + p.bundle + ':' + p.line;
  }
  return null;
}
let diff = 0;
for (const a of Object.keys(base)) {
  for (const p of Object.keys(base[a])) {
    const nowHas = cur[a] && cur[a][p] !== undefined;
    const same = nowHas && String(cur[a][p]) === String(base[a][p]);
    if (same) continue;
    diff++;
    const key = a + '|' + p;
    if (!nowHas) {
      if (!nSet.has(key)) fail('C3b', '「发→不发」未经审批（approved-narrowing 需 escape:"closed"）：' + key);
    }
    const bad = evidenceOk(fieldOfPath(p));
    if (bad) fail('C3', key + ' 变更无可用证据：' + bad);
  }
}
for (const a of Object.keys(cur)) {
  for (const p of Object.keys(cur[a])) {
    if (base[a] && base[a][p] !== undefined) continue;
    const bad = evidenceOk(fieldOfPath(p));
    if (bad) fail('C3', a + '|' + p + ' 新增但无可用证据：' + bad);
  }
}

/* C4 生成确定性：现场重跑生成器两遍，归一化 hash 必须等于基线 */
(function () {
  const gen = path.join(TOOLS, 'gen_shapes.js');
  const h = [];
  for (let i = 0; i < 2; i++) {
    const r = runCaptured([gen]);
    if (r.code !== 0) { fail('C4', 'gen_shapes.js 退出码 ' + r.code + '：' + r.out.slice(-200).replace(/\n/g, ' ')); break; }
    h.push(normalizedShapesHash());
  }
  if (h.length === 2 && h[0] !== h[1]) fail('C4', '生成器两次产出不同（' + h[0] + ' vs ' + h[1] + '）');
  const want = fs.readFileSync(path.join(GOLD, 'shapes-normalized.sha1'), 'utf8').trim();
  if (h.length && h[0] !== want) fail('C4', '生成物与冻结基线不同：现 ' + h[0] + '，基线 ' + want + '（若是有意改动，跑 --freeze 并写明原因）');
})();

/* C5 统计量现场重算，不读计数器 */
(function () {
  const got = {
    factFields: facts.fieldCount,
    byClass: facts.byClass,
    switchMapActions: Object.keys(facts.switchMap).length,
    switchMapFields: Object.keys(facts.switchMap).reduce((n, a) => n + Object.keys(facts.switchMap[a]).length, 0),
    switchOmittedActions: Object.keys(shapes.switchOmitted || {}).length,
    statActions: shapes.stat.actions,
    statFields: shapes.stat.fields,
    shapeErrors: Object.keys(shapes.errors || {}).length,
    actionCount: Object.keys(cur).length,
  };
  for (const k of Object.keys(expectStats)) {
    if (JSON.stringify(got[k]) !== JSON.stringify(expectStats[k])) {
      fail('C5', k + ' 期望 ' + JSON.stringify(expectStats[k]) + '，实算 ' + JSON.stringify(got[k]));
    }
  }
})();

/* C7 / C8 差异集必须被 planned-changes 逐条覆盖，签名变化的还要显式允许 + 证据 */
(function () {
  const diffList = collectDiff(cur, base);
  const rules = loadPlanned();
  const probs = checkPlanned(diffList, rules, true);
  if (diffList.length && !rules.length) probs.unshift('差异 ' + diffList.length + ' 项，但 planned-changes.json 为空');
  if (probs.length) { for (const p of probs.slice(0, 10)) fail('C7/C8', p); }
  else notes.push('C7/C8 差异 ' + diffList.length + ' 项，全部被 ' + rules.length + ' 条清单规则精确覆盖');
})();

/* C11 时间类字段作为形状默认值时，不许是正数时间戳（必须 0 或不发） */
(function () {
  const T = (n) => /[Tt]ime$/.test(n) || /^[Tt]ime/.test(n) || /^cdtime\d*$/i.test(n) || n === 'gen';
  const bad = [];
  (function walk(prefix, o) {
    for (const k of Object.keys(o)) {
      const v = o[k];
      const path0 = prefix ? prefix + '.' + k : k;
      if (v && typeof v === 'object') { walk(path0, v); continue; }
      if (T(k) && typeof v === 'number' && v > 0) bad.push(path0 + '=' + v);
    }
  })('', shapes.shapes || {});
  if (bad.length) fail('C11', bad.length + ' 个时间类形状默认值是正数时间戳（应 0 或不发）：' + bad.slice(0, 8).join(', '));
  else notes.push('C11 时间类形状默认值全部为 0 / 未发出');
})();

/* C12 形状条目的 src 只能是"本动作自己的 handler / 中性值 / 人工表"；跨动作继承先计数上报 */
(function () {
  const borrowed = [];
  let total = 0, ok = 0;
  for (const a of Object.keys(shapes.shapes || {})) {
    const fields = (shapes.shapes[a] && shapes.shapes[a].fields) || {};
    for (const f of Object.keys(fields)) {
      total++;
      const src = String(fields[f].src || 'MISSING');
      if (src === 'handler:' + a || src === 'neutral' || src === 'neutral:time0' || src === 'manual' || src === 'promoted' || src === 'capture:' + a) ok++;
      else if (src.indexOf('borrowed') === 0 || src.indexOf('capture:') === 0) borrowed.push(a + '.' + f + ' ← ' + src);
      else if (src === 'MISSING') fail('C12', a + '.' + f + ' 缺 src（禁跨动作继承的溯源字段）');
      else ok++;
    }
  }
  notes.push('C12 src 合法 ' + ok + '/' + total + '；跨动作继承 **' + borrowed.length + ' 项**（尚未强制清零，等 R09 决策）'
    + (borrowed.length ? '，样本：' + borrowed.slice(0, 5).join(' , ') : ''));
})();

/* C9 查表键合法性：**尚未实现**（要先抽出 getItem(<路径>,"表") 的字段建集合 K）。明确打印，不许看起来像通过。 */
notes.push('C9 查表键合法性：未实现（R08 已列为待办）');

/* C6 __switch 的键必须是（动作，路径）两段式：不许按字段名直接查 */
(function () {
  const sw = vm.runInThisContext ? null : null; // 生成物在 sweep() 里已求值到全局
  const tbl = (typeof BZ_SHAPES !== 'undefined') ? BZ_SHAPES.__switch : null;
  if (!tbl || typeof tbl !== 'object') { fail('C6', 'BZ_SHAPES.__switch 不存在或不是对象'); return; }
  const actions = BZ_SHAPES.__impl || [];
  for (const a of Object.keys(tbl)) {
    if (typeof tbl[a] !== 'object') { fail('C6', '__switch[' + a + '] 不是"字段→类别"对象'); continue; }
    for (const f of Object.keys(tbl[a])) {
      if (['switch', 'keyset'].indexOf(tbl[a][f]) < 0) fail('C6', '__switch[' + a + '][' + f + '] 类别非法：' + tbl[a][f]);
    }
  }
  const files = fs.readdirSync(CORE).filter((f) => /\.js$/.test(f) && f.indexOf('generated') < 0 && f !== 'handlers.js');
  for (const f of files) {
    const t = fs.readFileSync(path.join(CORE, f), 'utf8');
    if (/__switch\s*\[\s*['"]/.test(t)) fail('C6', f + ' 里出现 __switch["字面量"]（按字段名查，会重新引入全局污染）');
  }
})();

/* ── 汇报 ───────────────────────────────────────────────────────────── */
console.log('形状冻结校验：动作 ' + Object.keys(cur).length + '/' + Object.keys(base).length
  + '，字段 ' + facts.fieldCount + '，本轮 diff ' + diff + ' 处');
for (const n of notes) console.log('  note  ' + n);
if (!fails.length) { console.log('✅ C1–C8、C10–C12 全部通过（C9 未实现）'); process.exit(0); }
console.log('❌ ' + fails.length + ' 条失败：');
for (const f of fails) console.log('   ' + f);
process.exit(1);
