'use strict';
/**
 * acceptance.js —— 验收总跑器（SOTA R14 反例 4 的修补；R15 Q4 把"已知红"从**行号键**升级为**内容键**）
 *
 * 为什么要有它：`hotfix-patch/test/core-test-server.js` 曾经长期是红的（HANDOVER.md §7-14）。
 * 只看"32 绿 1 红"这种计数，**同一个文件里再新增一处失败**也看不出来 —— 总数没变、红项还是同一个文件。
 * 所以"已知红项"必须细化到 **文件 + 断言原文 + 消息体** 三元组；而且**禁止用行号做键**：
 * 行号会随无关的增删行漂移，行号当键 = 改一行注释就能把新红项洗成旧红项（或把旧红项判成 K2）。
 *
 * 用法（只有三种，没有别的开关）：
 *   node tools/acceptance.js            跑全部验收项，逐项记录退出码，输出判定
 *   node tools/acceptance.js --list     只列项不跑
 *   node tools/acceptance.js --update   **禁止实现** —— 故意报错退出（登记表只许人工改，
 *                                       否则"跑一遍就把新红项洗成已知红"，登记表变成永久豁免）
 *
 * 验收项：`hotfix-patch/test/*.js` 全部（readdir 列，逐个 `node <绝对路径>`，cwd = hotfix-patch/）
 *         + node tools/check_shape_freeze.js / check_reject_codes.js / check_exchange_currency.js
 *           （cwd = 仓库根）。项数由目录决定，不写死。
 *         + node tools/lint_freebie.js <hotfix-patch/core/bz-rpc-server.js>（2026-10-27 上游提速方案
 *           的防白拿 lint；退出码非 0 = FLAG/TRUST 未白名单化 → 判失败）。
 *   注：**不跑** hotfix-patch/build-handlers.js —— 它会写产物，不属于验收。
 *
 * 登记表：tools/golden/known-red.json（人工维护，本脚本只读，永不写）
 *   [ { "file": "core-test-server.js",     // basename（判定键之一，不含目录）
 *       "assertSha8": "xxxxxxxx",          // 断言那一行原文规范化后的 sha1 前 8（判定键之一）
 *       "msgSha8": "xxxxxxxx",             // 消息体规范化后的 sha1 前 8（判定键之一）
 *       "line": 65,                        // **只作附带信息，判定一律不看它**
 *       "why": "…为什么允许它红…" } ]
 *   ⚠ 旧格式 { item, line, msgSha8 } 不再被接受（会打"缺字段"警告并忽略 → 该失败按 K1 报），
 *     这是有意的：行号键必须废止，不许悄悄兼容。
 *
 * 规范化 normText（msgSha8 与 assertSha8 共用同一套，不许各写一份）：
 *   去 \r → 逐行 trim → 丢空行 → 行内连续空白（空格 / Tab / NBSP）压成一个空格 → 用 \n 连接。
 *   "断言原文规范化"就是**只有一行**的同款规范化（该行若为空白行 → 空串，无法当指纹）。
 *
 * 判定（每条都会打印，不静默）：
 *   K1    某项失败，登记表里没有 file+assertSha8+msgSha8 全等的条目            → FAIL 新增红项
 *   K2    登记表有条目，本次没复现（修好了却不删登记 = 永久豁免）               → FAIL
 *   K3    同一个 file 在登记表里有条目，本次却出现"另一处"失败（哈希不同即另一处）→ FAIL
 *   K-cap 条目数 ≤ tools/golden/known-red-cap.json 的 cap；且 cap 只许下降
 *         （基线 = history 里出现过的最低 cap，降下去就再也涨不回来）          → FAIL
 *   G3    tools/golden/known-red-history.jsonl 只许追加；某条目连续出现 ≥3 次仍在
 *         → FAIL G3 滞留 <file>#<assertSha8>；history 为空时允许通过并补写第一行
 *   G5（v2 口径；R16 §1-8 / 反例 7）：
 *         guardHash = sha1( implVer
 *                          + sha1(tools/check_*.js  按文件名排序拼接)
 *                          + sha1(hotfix-patch/test/*.js 按文件名排序拼接)   ← v2 新增
 *                          + sha1(golden/*.json 排除 known-red.json 与 known-red-cap.json) )
 *         为什么 v2 要加 test/*.js：v1 只覆盖 checkers + golden，于是"把 test/x.js 里的一条断言
 *         削弱/改坏让它变红"这种动作**完全不改变 guardHash** → G5 判成"什么都没改"，扩容登记
 *         照样放行。纳入 test/ 之后，动测试就是动 guardHash。
 *         只拼**文件内容**：filesDigest 只吃 readText 的正文（读不到拼哨兵），
 *         不拼 mtime、不拼路径、不拼任何绝对前缀（换机器/换盘符/碰一下文件不改哈希）；
 *         排序只按**文件名**（readdir 顺序不稳定，靠 listFilesSorted 归一）。
 *         当本次 cap > 上次 cap 时，要求 guardHash 与 history 上一行相等，
 *         否则 FAIL G5 "扩容时夹带代码变更"（扩容只许是纯配置动作）。
 *         口径变更处理（guardVer 1→2）：history 旧行没有 guardVer 字段 = v1，新行一律写 guardVer:2；
 *         两口径的 guardHash **不可比**（拼进去的东西不同，字符串必然不同）。所以若"上一行 guardVer"
 *         与本次不同，G5 **本次不判**，打印
 *         "SKIP G5 guardHash 口径已变更（v1→v2），本次不判"——既不 FAIL（那是假警报），
 *         也不冒充 PASS（那会把真夹带洗白）；从下一行起同口径才恢复判定。
 *
 * 指纹（对每个失败项取一个"最小指纹"）：
 *   file        basename（判定键之一）
 *   line        优先取输出里第一处 `at …(<本项文件>:<行>:<列>)` 的行号；没有就取输出里
 *               第一处 `<本项文件名>:<行>`；**只作打印，判定不看**（G3/K 全用哈希）
 *   assertSha8  把上面定位到的那一行**从磁盘读原文**（脚本自己读，不靠人工填），
 *               normText 后 sha1 前 8
 *   msgSha8     输出里第一个 `AssertionError` / `Error:` 行之后到栈之前的消息体，normText 后 sha1 前 8；
 *               没有消息体 → 整段 stderr 的 normText（stderr 为空则退化为整段输出，
 *               否则所有无 stderr 的失败会共用空串哈希 da39a3ee，指纹就失去区分力）
 *
 * history 行（只追加，永不改写；每条跑完无论红绿都写一行）：
 *   { seq, ts, impl, cap, guardVer, entries:[{file,assertSha8,msgSha8}], entriesHash, guardHash, prev }
 *   prev = 上一行的 entriesHash（第一条写 null）；impl = implVer（核心实现文件的 sha1 前 12 位）。
 *   guardVer = guardHash 的口径版本：缺字段（v2 之前写的行）= 1，本版写 2。
 *   ⚠ 旧行**不许改写**：它们记的是 v1 口径的 hash，改成 v2 值＝伪造审计账（本次只让新行用新口径）。
 *   `cap` 是 G5 判"本次是否扩容"的唯一依据（不然无从知道上次 cap 是多少）。
 *
 * 只用 fs / path / child_process / crypto，无第三方依赖。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const HOTFIX = path.join(ROOT, 'hotfix-patch');
const TEST_DIR = path.join(HOTFIX, 'test');
const REG_PATH = path.join(__dirname, 'golden', 'known-red.json');
const CAP_PATH = path.join(__dirname, 'golden', 'known-red-cap.json');
const HIST_PATH = path.join(__dirname, 'golden', 'known-red-history.jsonl');
const GOLDEN_DIR = path.join(__dirname, 'golden');
const CORE_PATH = path.join(HOTFIX, 'core', 'bz-rpc-server.js');

const PER_ITEM_TIMEOUT_MS = 180000;   // 单项超时：3 分钟（防某项挂死拖住整轮）
const SHOW_LIMIT = 2000;              // 失败项输出原样打印的截断长度
const CHILD_MAX_BUFFER = 64 * 1024 * 1024;

/** guardHash 口径版本：v1 = impl+checkers+golden；v2 = v1 + hotfix-patch/test/*.js（R16 §1-8）
 *  history 里没有该字段的行视为 1；两口径的 guardHash 不可比，G5 见口径不同就 SKIP。 */
const GUARD_VER = 2;

const argv = process.argv.slice(2);

/* ── 参数 ───────────────────────────────────────────────────────────── */
if (argv.indexOf('--update') >= 0) {
  console.error('❌ --update 未实现（故意，不是漏做）：');
  console.error('   known-red.json 只许人工编辑。自动登记 = 把"今天新出现的红项"洗成"已知红项"，');
  console.error('   登记表会迅速退化成永久豁免清单（同 HANDOVER §7-14 的教训）。');
  console.error('   正确做法：人看过 FAIL K1 那行，判断这是真问题还是新遗留，再手写条目并写清 why。');
  process.exit(2);
}
const LIST_ONLY = argv.indexOf('--list') >= 0;
for (const a of argv) {
  if (a === '--list' || a === '--update') continue;
  console.error('❌ 未知参数：' + a + '（只支持 --list；--update 明确禁止）');
  process.exit(2);
}

/* ── 工具 ───────────────────────────────────────────────────────────── */
function rel(p) { return path.relative(ROOT, p).replace(/\\/g, '/'); }
function normPath(p) { return String(p).replace(/^file:\/\//, '').replace(/\\/g, '/').toLowerCase(); }
function escRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function sha1hex(s) { return crypto.createHash('sha1').update(s, 'utf8').digest('hex'); }
function sha8(s) { return sha1hex(s).slice(0, 8); }
function readText(p) { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return null; } }
function baseName(p) { return path.basename(String(p)); }

/** 规范化：去 \r、逐行 trim、丢空行、行内连续空白压成一个空格 */
function normText(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/\r/g, '')
    .split('\n')
    .map(function (l) { return l.trim(); })
    .filter(function (l) { return l.length > 0; })
    .map(function (l) { return l.replace(/[ \t\u00a0]+/g, ' '); })
    .join('\n');
}

/** 目录下按文件名排序（升序、区分大小写无所谓，只要稳定） */
function listFilesSorted(dir, re) {
  let names = [];
  try { names = fs.readdirSync(dir); } catch (e) { return []; }
  names = names.filter(function (f) { return re.test(f); });
  names.sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; });
  return names;
}

/* ── 验收项清单 ─────────────────────────────────────────────────────── */
function collectItems() {
  const items = [];
  let names = [];
  try {
    names = fs.readdirSync(TEST_DIR).filter(function (f) { return /\.js$/i.test(f); });
  } catch (e) {
    console.error('❌ 读不到测试目录 ' + TEST_DIR + '：' + (e && e.message));
    process.exit(2);
  }
  names.sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; });
  for (const f of names) {
    const abs = path.join(TEST_DIR, f);
    items.push({ item: rel(abs), abs: abs, cwd: HOTFIX, kind: 'test' });
  }
  for (const f of ['check_shape_freeze.js', 'check_reject_codes.js', 'check_exchange_currency.js']) {
    const abs = path.join(__dirname, f);
    items.push({ item: rel(abs), abs: abs, cwd: ROOT, kind: 'checker' });
  }
  // 2026-10-27 上游提速方案：防白拿 lint（新门禁）。args 里给 core 的绝对路径——lint 默认
  // 取 __dirname/../core（那是仓库根的 core，本项目实际在 hotfix-patch/core）。
  {
    const abs = path.join(__dirname, 'lint_freebie.js');
    items.push({ item: rel(abs), abs: abs, cwd: ROOT, kind: 'checker', args: [path.join(HOTFIX, 'core', 'bz-rpc-server.js')] });
  }
  return items;
}

/* ── 跑一项 ─────────────────────────────────────────────────────────── */
function runItem(it) {
  const t0 = Date.now();
  let r;
  try {
    r = spawnSync(process.execPath, [it.abs].concat(it.args || []), {
      cwd: it.cwd,
      encoding: 'utf8',
      timeout: PER_ITEM_TIMEOUT_MS,
      maxBuffer: CHILD_MAX_BUFFER,
      windowsHide: true,
    });
  } catch (e) {
    return { code: 125, stdout: '', stderr: 'spawn 失败：' + (e && e.message), ms: Date.now() - t0, note: 'spawn 失败' };
  }
  let code;
  let note = '';
  if (r.error && r.error.code === 'ETIMEDOUT') { code = 124; note = '超时 ' + PER_ITEM_TIMEOUT_MS + 'ms 被杀'; }
  else if (r.error) { code = 125; note = 'spawn 错误 ' + r.error.code; }
  else if (r.status === null) { code = 126; note = '被信号终止 ' + (r.signal || '?'); }
  else code = r.status;
  return { code: code, stdout: r.stdout || '', stderr: r.stderr || '', ms: Date.now() - t0, note: note };
}

/* ── 指纹 ───────────────────────────────────────────────────────────── */

/** 行号：优先 "at …(<本项文件>:行:列)"，其次第一处 "<本项文件名>:行"；只作打印信息 */
function pickLine(res, it) {
  const lines = (res.stdout + '\n' + res.stderr).replace(/\r/g, '').split('\n');
  const target = normPath(it.abs);
  const base = baseName(it.abs);
  for (const ln of lines) {
    const m = /(?:^|\s)at\s+.*?\((.+?):(\d+):(\d+)\)\s*$/.exec(ln)
      || /(?:^|\s)at\s+(.+?):(\d+):(\d+)\s*$/.exec(ln);
    if (!m) continue;
    if (normPath(m[1]) === target) return { line: Number(m[2]), from: 'at 栈行' };
  }
  const re = new RegExp(escRe(base) + ':(\\d+)');
  for (const ln of lines) {
    const m = re.exec(ln);
    if (m) return { line: Number(m[1]), from: '文件名回退' };
  }
  return { line: 0, from: '无' };
}

/** 断言指纹：读该测试文件第 line 行原文 → normText → sha1 前 8（脚本自己读，不靠人工填） */
function assertionAt(absFile, lineNo) {
  const text = readText(absFile);
  if (text === null) return { sha8: '', src: '', err: '读不到文件 ' + rel(absFile) };
  const lines = text.split('\n');
  if (!(lineNo >= 1 && lineNo <= lines.length)) {
    return { sha8: '', src: '', err: '行号 ' + lineNo + ' 越界（该文件共 ' + lines.length + ' 行）' };
  }
  const src = normText(lines[lineNo - 1]);
  if (!src) return { sha8: '', src: '', err: '第 ' + lineNo + ' 行是空白行，不能当断言指纹' };
  return { sha8: sha8(src), src: src, err: null };
}

/** 消息体：第一个 AssertionError / Error: 行之后、栈之前；没有就退化为整段 stderr */
function pickMsg(res) {
  const lines = res.stderr.replace(/\r/g, '').split('\n');
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^AssertionError\b/.test(t) || /^Error:/.test(t)) { start = i; break; }
  }
  if (start >= 0) {
    const body = [];
    for (let i = start + 1; i < lines.length; i++) {
      const t = lines[i].trim();
      if (/^at\s/.test(t)) break;                    // 栈开始
      if (t === '{' || t === '}') break;             // Node 的断言对象块
      if (!t) continue;                              // 空行去掉
      body.push(t);
    }
    if (body.length) {
      return { text: normText(body.join('\n')), from: '消息体', errLine: lines[start].trim() };
    }
  }
  const whole = normText(res.stderr);
  if (whole) return { text: whole, from: '整段 stderr', errLine: start >= 0 ? lines[start].trim() : null };
  return {
    text: normText(res.stdout + '\n' + res.stderr),
    from: 'stderr 为空，退化为整段输出',
    errLine: start >= 0 ? lines[start].trim() : null,
  };
}

function fingerprint(res, it) {
  const msg = pickMsg(res);
  const loc = pickLine(res, it);
  const asr = loc.line > 0
    ? assertionAt(it.abs, loc.line)
    : { sha8: '', src: '', err: '输出里没有该文件的行号，assertSha8 无法计算' };
  return {
    file: baseName(it.abs),
    item: it.item,
    line: loc.line,
    lineFrom: loc.from,
    assertSha8: asr.sha8,
    assertSrc: asr.src,
    assertErr: asr.err,
    msgSha8: sha8(msg.text),
    src: msg.from,
    msgText: msg.text,
    errLine: msg.errLine,
  };
}

/* ── 登记表 ─────────────────────────────────────────────────────────── */
function loadRegistry() {
  if (!fs.existsSync(REG_PATH)) {
    console.log('提示 登记表不存在：' + rel(REG_PATH) + '（按 0 条处理；若有失败会全部判 K1）');
    return [];
  }
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(REG_PATH, 'utf8'));
  } catch (e) {
    console.error('❌ 登记表不是合法 JSON：' + rel(REG_PATH) + ' —— ' + (e && e.message));
    process.exit(2);
  }
  if (!Array.isArray(raw)) {
    console.error('❌ 登记表顶层必须是数组：' + rel(REG_PATH));
    process.exit(2);
  }
  const ok = [];
  for (const e of raw) {
    if (!e || typeof e !== 'object') {
      console.log('警告 登记表条目不是对象（已忽略，不会成为豁免）：' + JSON.stringify(e).slice(0, 160));
      continue;
    }
    // file 缺省时兼容从 item 推导（但 assertSha8 缺失一律不兼容 —— 行号键已废止）
    const file = e.file ? baseName(e.file) : (e.item ? baseName(e.item) : '');
    if (!file || !e.assertSha8 || !e.msgSha8) {
      console.log('警告 登记表条目缺字段（已忽略，不会成为豁免）：' + JSON.stringify(e).slice(0, 200));
      console.log('     要求 {"file","assertSha8","msgSha8"}；line 只作附带信息，不参与判定。');
      continue;
    }
    ok.push({
      file: file,
      assertSha8: String(e.assertSha8),
      msgSha8: String(e.msgSha8),
      line: (e.line === undefined || e.line === null) ? null : Number(e.line),   // 仅信息
      why: e.why || '',
    });
  }
  return ok;
}

/* ── cap ────────────────────────────────────────────────────────────── */
function loadCap() {
  if (!fs.existsSync(CAP_PATH)) {
    return { cap: 0, err: 'cap 文件不存在（' + rel(CAP_PATH) + '），按 cap=0 处理 = 不许有任何已知红' };
  }
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(CAP_PATH, 'utf8'));
  } catch (e) {
    return { cap: 0, err: 'cap 文件不是合法 JSON（' + rel(CAP_PATH) + '）—— ' + (e && e.message) + '；按 cap=0 处理' };
  }
  const n = Number(raw && raw.cap);
  if (!isFinite(n) || n < 0 || Math.floor(n) !== n) {
    return { cap: 0, err: 'cap 字段非法（' + JSON.stringify(raw && raw.cap) + '）—— 按 cap=0 处理' };
  }
  return { cap: n, err: null };
}

/* ── history ────────────────────────────────────────────────────────── */
function loadHistory() {
  const lines = [];
  const text = readText(HIST_PATH);
  if (text === null) return { lines: lines, err: null, exists: false };
  const raw = text.replace(/\r/g, '').split('\n');
  for (let i = 0; i < raw.length; i++) {
    if (!raw[i].trim()) continue;
    try {
      lines.push(JSON.parse(raw[i]));
    } catch (e) {
      return { lines: lines, err: '第 ' + (i + 1) + ' 行不是合法 JSON：' + (e && e.message), exists: true };
    }
  }
  return { lines: lines, err: null, exists: true };
}

/* ── guardHash（G5 用） ─────────────────────────────────────────────── */
/**
 * 拼接后求 sha1：同一目录内的文件**按文件名排序**，内容之间用 \u0000 分隔
 * （纯拼接会在"文件边界"上产生歧义：把 A 的尾巴挪到 B 的开头哈希不变）。
 */
function filesDigest(paths) {
  const parts = [];
  for (const p of paths) {
    const t = readText(p);
    parts.push(t === null ? '\u0001MISSING\u0001' : t);   // 读不到也要参与哈希，免得"删文件"绕过
  }
  return sha1hex(parts.join('\u0000'));
}

/** implVer：核心实现文件的 sha1 前 12 位（能唯一代表"这批代码"的稳定物） */
function implVersion() {
  const t = readText(CORE_PATH);
  return t === null ? 'nocore' : sha1hex(t).slice(0, 12);
}

/**
 * guardHash（G5 用），口径见 GUARD_VER。
 *   v2 = sha1( implVer + sha1(checkers) + sha1(test/*.js) + sha1(golden/*.json 除两件登记表) )
 * ⚠ 只拼**文件内容**：filesDigest 只吃 readText 的正文，拼接里没有任何路径/前缀/mtime，
 *   所以"换个盘符跑""touch 一下文件"都不会让哈希漂移；但"改一个字节内容"一定漂移。
 */
function computeGuard() {
  const checkers = listFilesSorted(__dirname, /^check_.*\.js$/i);
  const tests = listFilesSorted(TEST_DIR, /\.js$/i);          // v2：hotfix-patch/test/*.js 也纳入
  const golden = listFilesSorted(GOLDEN_DIR, /\.json$/i)
    .filter(function (f) { return !/^known-red\.json$/i.test(f) && !/^known-red-cap\.json$/i.test(f); });
  const checkHash = filesDigest(checkers.map(function (f) { return path.join(__dirname, f); }));
  const testHash = filesDigest(tests.map(function (f) { return path.join(TEST_DIR, f); }));
  const goldenHash = filesDigest(golden.map(function (f) { return path.join(GOLDEN_DIR, f); }));
  const implVer = implVersion();
  return {
    ver: GUARD_VER,
    implVer: implVer,
    checkHash: checkHash,
    testHash: testHash,
    goldenHash: goldenHash,
    guardHash: sha1hex(implVer + checkHash + testHash + goldenHash),
    checkers: checkers,
    tests: tests,
    golden: golden,
  };
}

/** 某条 history 行的口径版本：缺字段/非法 → 1（v2 之前写的行一律按 v1 读，且不许改写） */
function guardVerOf(line) {
  if (!line) return null;
  const v = Number(line && line.guardVer);
  return (isFinite(v) && v >= 1) ? Math.floor(v) : 1;
}

/* ── 主流程 ─────────────────────────────────────────────────────────── */
const items = collectItems();
const guard = computeGuard();

if (LIST_ONLY) {
  const reg0 = loadRegistry();
  const cap0 = loadCap();
  const hist0 = loadHistory();
  console.log('验收项 共 ' + items.length + ' 项（--list：只列不跑）');
  for (const it of items) {
    console.log('  ' + it.item + '   cwd=' + (rel(it.cwd) || '.') + (it.kind === 'checker' ? '   [验收器]' : ''));
  }
  console.log('不跑（会写产物，不属于验收）：hotfix-patch/build-handlers.js');
  console.log('登记表 ' + rel(REG_PATH) + ' 条目=' + reg0.length + '   cap=' + cap0.cap + '（' + rel(CAP_PATH) + '）');
  console.log('history ' + rel(HIST_PATH) + ' 行=' + hist0.lines.length + (hist0.err ? '（⚠ ' + hist0.err + '）' : ''));
  console.log('impl=' + guard.implVer + '  guardHash=' + guard.guardHash.slice(0, 12) + '…'
    + '  口径=v' + guard.ver + '（checkers=' + guard.checkers.length + ' test=' + guard.tests.length
    + ' golden=' + guard.golden.length + '）');
  console.log('guard 覆盖 checkers=' + guard.checkers.join(',') + '；test=' + guard.tests.join(',')
    + '；golden=' + guard.golden.join(','));
  process.exit(0);
}

const registry = loadRegistry();
const capInfo = loadCap();
const hist = loadHistory();
const prevLine = hist.lines.length ? hist.lines[hist.lines.length - 1] : null;
const prevCap = (prevLine && isFinite(Number(prevLine.cap))) ? Number(prevLine.cap) : null;
const prevGuard = (prevLine && prevLine.guardHash) ? String(prevLine.guardHash) : null;

/** 条目的判定键（顺序固定，entry/file/line 不参与） */
function entryKey(e) { return String(e.file) + '#' + String(e.assertSha8) + '#' + String(e.msgSha8); }
function entriesDigest(list) {
  return sha1hex(list.map(function (e) { return entryKey(e); }).join('\n'));
}
const entries = registry.map(function (e) { return { file: e.file, assertSha8: e.assertSha8, msgSha8: e.msgSha8 }; });
const entriesHash = entriesDigest(entries);

console.log('验收开始：项=' + items.length + '（hotfix-patch/test/*.js + 3 个验收器；不跑 build-handlers.js）');
console.log('登记表：' + rel(REG_PATH) + ' 条目=' + registry.length
  + '  cap=' + capInfo.cap + '（' + rel(CAP_PATH) + '）');
if (capInfo.err) console.log('提示 cap：' + capInfo.err);
console.log('history：' + rel(HIST_PATH) + ' 行=' + hist.lines.length
  + (prevCap === null ? '（无上一行 → cap 没有基线）' : '（上一行 cap=' + prevCap + '）')
  + (hist.err ? '  ⚠ ' + hist.err : ''));
console.log('impl=' + guard.implVer + '  guardHash=' + guard.guardHash.slice(0, 12) + '…'
  + '（口径=v' + guard.ver + ' checkers=' + guard.checkers.length + ' test=' + guard.tests.length
  + ' golden=' + guard.golden.length + '）');
console.log('图例：PASS = 该项退出码 0；FAIL = 该项退出码非 0（**尚不代表验收违规**——');
console.log('      违规只认 "FAIL K*/G* …" 与最后一行 ACCEPTANCE）；已登记的红项另打 KNOWN-RED。');
console.log('');

const results = [];
for (const it of items) {
  const res = runItem(it);
  const rec = { it: it, res: res };
  if (res.code !== 0) rec.fp = fingerprint(res, it);
  results.push(rec);

  const tag = res.code === 0 ? 'PASS' : 'FAIL';
  console.log(tag + '  ' + it.item + '  exit=' + res.code + '  ' + res.ms + 'ms' + (res.note ? '  (' + res.note + ')' : ''));
  if (res.code === 0) continue;

  // 失败项：原样打印完整输出（截断到 2000 字符），方便人判
  const combined = '----- stdout -----\n' + res.stdout + '\n----- stderr -----\n' + res.stderr;
  const shown = combined.slice(0, SHOW_LIMIT);
  console.log('  ---- 失败输出（原样，' + (combined.length > SHOW_LIMIT ? '已截断到前 ' + SHOW_LIMIT + ' 字符，原长 ' + combined.length : '完整 ' + combined.length + ' 字符') + '）----');
  for (const ln of shown.split(/\r?\n/)) console.log('  | ' + ln);
  console.log('  ---- 输出结束 ----');
  console.log('  指纹 file=' + rec.fp.file + ' line=' + rec.fp.line + '（' + rec.fp.lineFrom + '，仅信息）'
    + ' assertSha8=' + (rec.fp.assertSha8 || '（无）') + ' msgSha8=' + rec.fp.msgSha8 + '（取自' + rec.fp.src + '）');
  if (rec.fp.assertErr) console.log('  ⚠ assertSha8：' + rec.fp.assertErr);
  if (rec.fp.assertSrc) console.log('  断言原文 = ' + (rec.fp.assertSrc.length > 240 ? rec.fp.assertSrc.slice(0, 240) + '…' : rec.fp.assertSrc));
  console.log('  登记写法 = {"file":"' + rec.fp.file + '","assertSha8":"' + (rec.fp.assertSha8 || '?')
    + '","msgSha8":"' + rec.fp.msgSha8 + '","line":' + rec.fp.line + ',"why":"…"}');
  console.log('');
}

const failing = results.filter(function (r) { return r.res.code !== 0; });
const green = results.length - failing.length;

/* 判定 */
const fails = [];
function fail(code, text) { fails.push(code + ': ' + text); console.log('FAIL ' + code + ' ' + text); }

/* K1 / K2 / K3：匹配键 = file + assertSha8 + msgSha8（line 不参与） */
const regByFile = new Map();
for (const e of registry) {
  if (!regByFile.has(e.file)) regByFile.set(e.file, []);
  regByFile.get(e.file).push(e);
}
const matched = new Set();

for (const r of failing) {
  const fp = r.fp;
  const list = regByFile.get(fp.file) || [];
  const hit = list.find(function (e) { return e.assertSha8 === fp.assertSha8 && e.msgSha8 === fp.msgSha8; });
  if (hit) {
    matched.add(hit);
    r.known = hit;
    console.log('KNOWN-RED ' + fp.file + '#' + fp.assertSha8 + '  line=' + fp.line + '  msgSha8=' + fp.msgSha8
      + '  why=' + (hit.why || '（未写 why）'));
    continue;
  }
  if (list.length) {
    // K3：同一个文件在登记表里有条目，但本次出现的是"另外"一处失败
    fail('K3', '同一文件出现新红项 ' + fp.item + ' → ' + fp.file + '#' + (fp.assertSha8 || '（无断言指纹）')
      + ' msgSha8=' + fp.msgSha8 + ' line=' + fp.line + '（登记表里该文件的条目是 '
      + list.map(function (e) { return e.file + '#' + e.assertSha8 + ' msgSha8=' + e.msgSha8; }).join(' , ') + '）');
  } else {
    // K1：整项新增红
    fail('K1', '新增红项 ' + fp.item + ' → ' + fp.file + '#' + (fp.assertSha8 || '（无断言指纹）')
      + ' msgSha8=' + fp.msgSha8 + ' line=' + fp.line);
  }
}

for (const e of registry) {
  if (matched.has(e)) continue;
  // K2：登记过但本次没复现（已修复必须删登记，否则登记表变永久豁免）
  fail('K2', '已修复的红项仍留在登记表 ' + e.file + '#' + e.assertSha8 + ' msgSha8=' + e.msgSha8
    + (e.line === null ? '' : '（原记录 line=' + e.line + '，仅信息）') + '（必须删掉，防登记表变永久豁免）');
}

/* K-cap：条目数 ≤ cap；cap 只许下降 */
if (registry.length > capInfo.cap) {
  fail('K-cap', '登记表条目超过 cap：条目=' + registry.length + ' > cap=' + capInfo.cap
    + '（cap 只许下降；要豁免新红项必须先证明它不比旧红项更糟，并手写 why）');
} else {
  console.log('PASS K-cap 条目=' + registry.length + ' ≤ cap=' + capInfo.cap);
}
// 基线取 history 里出现过的**最低** cap，而不是"上一行"：
// 只看上一行的话，扩容跑红一次就把新 cap 写成基线，下一轮自动洗白（扩容只要跑两遍就合法了）。
// 取历史最低值 = "cap 只许下降"的字面执行：降下去就再也涨不回来。
const minCap = hist.lines.reduce(function (m, l) {
  const v = (l && isFinite(Number(l.cap))) ? Number(l.cap) : null;
  return v === null ? m : (m === null ? v : Math.min(m, v));
}, null);
if (minCap !== null && capInfo.cap > minCap) {
  fail('K-cap', 'cap 扩容 ' + minCap + ' → ' + capInfo.cap + '（cap 只许下降：历史最低 cap=' + minCap
    + '，本次只许 ≤ 它；上一行 cap=' + (prevCap === null ? '无' : prevCap) + '）');
} else if (minCap !== null) {
  console.log('PASS K-cap 未扩容（历史最低 cap=' + minCap + ' → 本次 ' + capInfo.cap + '）');
} else {
  console.log('PASS K-cap 无基线（history 为空；本次 cap=' + capInfo.cap + '）');
}

/* G3：history 只追加 + 滞留（同一 entry 连续出现 ≥3 次仍在登记表） */
if (hist.err) {
  fail('G3', 'history 记录损坏，本次拒绝追加（防把可审计的账写坏）：' + hist.err);
} else {
  const stuck = [];
  let longest = 0;
  for (const e of entries) {
    let streak = 1;   // 本次也会记一行，所以从 1 起算
    for (let i = hist.lines.length - 1; i >= 0; i--) {
      const le = Array.isArray(hist.lines[i] && hist.lines[i].entries) ? hist.lines[i].entries : [];
      const same = le.some(function (x) { return x && entryKey(x) === entryKey(e); });
      if (!same) break;
      streak++;
    }
    if (streak > longest) longest = streak;
    if (streak >= 3) stuck.push({ e: e, streak: streak });
  }
  if (stuck.length) {
    for (const s of stuck) {
      fail('G3', '滞留 ' + s.e.file + '#' + s.e.assertSha8 + '（连续 ' + s.streak + ' 行仍在登记表：'
        + '登记不是豁免，超过 3 轮必须修掉或写清"为什么不修"）');
    }
  } else {
    console.log('PASS G3 无滞留条目（history 行=' + hist.lines.length + '，最长连续=' + longest + '）');
  }
}

/* G5：扩容时不许夹带代码/表变更（只在"cap 增加"时才比 guardHash） */
if (prevCap !== null && capInfo.cap > prevCap) {
  const prevVer = guardVerOf(prevLine);
  if (prevVer !== guard.ver) {
    // 口径变了 → 两个 guardHash 拼的东西不同，比出来的"不等"是必然、不是证据。
    // 既不许 FAIL（假警报），也不许冒充 PASS（会把真夹带洗白）：本次不判，并说清为什么。
    console.log('SKIP G5 guardHash 口径已变更（v' + prevVer + '→v' + guard.ver + '），本次不判');
    console.log('      原因：history 上一行 guardVer=' + prevVer + '（旧行缺字段按 v1 读），本次 guardVer=' + guard.ver
      + '；两口径的 guardHash 拼接内容不同（v2 多了 hotfix-patch/test/*.js），新旧口径不可比。');
    console.log('      处理：G5 本次跳过（不判"扩容夹带"），不写 PASS 也不写 FAIL；'
      + '本行 history 记 guardVer:' + guard.ver + '，从下一行起同口径才恢复判定。'
      + '另：cap 扩容本身仍受 K-cap 约束（本次 cap ' + prevCap + ' → ' + capInfo.cap + '）。');
  } else if (prevGuard && guard.guardHash === prevGuard) {
    console.log('PASS G5 扩容量为纯配置（guardHash 未变 ' + guard.guardHash.slice(0, 12) + '…，口径 v' + guard.ver + '）');
  } else {
    fail('G5', '扩容时夹带代码变更：cap ' + prevCap + ' → ' + capInfo.cap
      + '，guardHash ' + (prevGuard ? prevGuard.slice(0, 12) + '…' : '（上一行缺 guardHash）')
      + ' → ' + guard.guardHash.slice(0, 12) + '…（扩容只许改 known-red.json / known-red-cap.json）'
      + '；本次口径 v' + guard.ver + ' checkers=' + guard.checkers.join(',')
      + ' test=' + guard.tests.join(',') + ' golden=' + guard.golden.join(','));
  }
} else {
  console.log('PASS G5 未扩容（cap ' + (prevCap === null ? '无基线' : prevCap + ' → ' + capInfo.cap)
    + '），无需 guardHash 复核');
}

/* history：无论红绿都追加一行（只追加，永不改写） */
if (!hist.err) {
  const seq = (prevLine && isFinite(Number(prevLine.seq))) ? Number(prevLine.seq) + 1 : 1;
  const record = {
    seq: seq,
    ts: new Date().toISOString(),
    impl: guard.implVer,
    cap: capInfo.cap,
    guardVer: guard.ver,          // v2 起必写；老行缺字段 = 1（老行不许改写）
    entries: entries,
    entriesHash: entriesHash,
    guardHash: guard.guardHash,
    prev: (prevLine && prevLine.entriesHash) ? String(prevLine.entriesHash) : null,
  };
  try {
    const old = readText(HIST_PATH);
    const needNl = (old !== null && old.length > 0 && !/\n$/.test(old));
    fs.appendFileSync(HIST_PATH, (needNl ? '\n' : '') + JSON.stringify(record) + '\n', 'utf8');
    console.log('history 追加：' + rel(HIST_PATH) + ' seq=' + seq + ' entries=' + entries.length
      + ' entriesHash=' + entriesHash.slice(0, 12) + '… guardVer=' + guard.ver + ' prev='
      + (record.prev ? record.prev.slice(0, 12) + '…' : 'null'));
  } catch (e) {
    fail('G3', 'history 追加失败（只追加这条承诺被破坏）：' + rel(HIST_PATH) + ' —— ' + (e && e.message));
  }
}

console.log('');
if (!fails.length) {
  console.log('ACCEPTANCE OK 项=' + results.length + ' 绿=' + green + ' 已知红=' + matched.size + ' cap=' + capInfo.cap);
  process.exit(0);
}
console.log('ACCEPTANCE FAIL 项=' + results.length + ' 绿=' + green + ' 失败=' + failing.length
  + ' 已知红=' + matched.size + ' 违规=' + fails.length + ' cap=' + capInfo.cap);
process.exit(1);
