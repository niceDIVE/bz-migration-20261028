'use strict';
/**
 * acceptance.js —— 验收总跑器（SOTA R14 反例 4 的修补）
 *
 * 为什么要有它：`hotfix-patch/test/core-test-server.js` 本来就是红的（遗留项，HANDOVER.md §7-14）。
 * 如果只看"32 绿 1 红"这种计数，**这个文件里再新增一处失败**也看不出来 —— 因为总数没变、
 * 红项还是同一个文件。所以"已知红项"必须细化到 **文件 + 断言行 + 消息哈希** 三元组：
 * 同一文件里出现任何**其他**失败（行号不同或消息体不同）都要判 FAIL。
 *
 * 用法（只有三种，没有别的开关）：
 *   node tools/acceptance.js            跑全部验收项，逐项记录退出码，输出判定
 *   node tools/acceptance.js --list     只列项不跑
 *   node tools/acceptance.js --update   **禁止实现** —— 故意报错退出（登记表只许人工改，
 *                                       否则"跑一遍就把新红项洗成已知红"，登记表变成永久豁免）
 *
 * 验收项（33 项）：
 *   1. hotfix-patch/test/*.js  全部（readdir 列，逐个 `node <绝对路径>`，cwd = hotfix-patch/）
 *   2. node tools/check_shape_freeze.js   （cwd = 仓库根）
 *   3. node tools/check_reject_codes.js
 *   4. node tools/check_exchange_currency.js
 *   注：**不跑** hotfix-patch/build-handlers.js —— 它会写产物，不属于验收。
 *
 * 登记表：tools/golden/known-red.json（人工维护，本脚本只读，永不写）
 *   [ { "item":"hotfix-patch/test/core-test-server.js", "line":65,
 *       "msgSha8":"xxxxxxxx", "why":"…为什么允许它红…" } ]
 *
 * 判定规则（三条都会打印，不静默）：
 *   K1 某项失败但登记表里没有对应条目（item+line+msgSha8 全等）      → FAIL
 *   K2 登记表里有条目但本次没复现（修好了却还留着登记 = 永久豁免）    → FAIL
 *   K3 某 item 在登记表里有条目，本次却出现另一处失败（line 或哈希不同）→ FAIL
 *
 * 指纹算法（对每个失败项，取一个"最小指纹"）：
 *   item    相对仓库根的路径，正斜杠
 *   line    优先取输出里第一处 `at …(<本项文件>:<行>:<列>)` 的行号；
 *           没有就取输出里第一处 `<本项文件名>:<行>`
 *   msgSha8 输出里第一个 `AssertionError` / `Error:` 行之后到栈之前的消息体，
 *           规范化（去 \r、逐行 trim、去空行、多空白压成单空格）后 sha1 前 8 位；
 *           没有消息体 → 整段 stderr 的规范化 sha1（stderr 为空则退化为整段输出，
 *           否则所有无 stderr 的失败会共用空串哈希 da39a3ee，指纹就失去区分力）。
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

const PER_ITEM_TIMEOUT_MS = 180000;   // 单项超时：3 分钟（防某项挂死拖住整轮）
const SHOW_LIMIT = 2000;              // 失败项输出原样打印的截断长度
const CHILD_MAX_BUFFER = 64 * 1024 * 1024;

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
  return items;
}

/* ── 跑一项 ─────────────────────────────────────────────────────────── */
function runItem(it) {
  const t0 = Date.now();
  let r;
  try {
    r = spawnSync(process.execPath, [it.abs], {
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

/** 行号：优先 "at …(<本项文件>:行:列)"，其次第一处 "<本项文件名>:行" */
function pickLine(res, it) {
  const lines = (res.stdout + '\n' + res.stderr).replace(/\r/g, '').split('\n');
  const target = normPath(it.abs);
  const base = path.basename(it.abs);
  for (const ln of lines) {
    const m = /(?:^|\s)at\s+.*?\((.+?):(\d+):(\d+)\)\s*$/.exec(ln)
      || /(?:^|\s)at\s+(.+?):(\d+):(\d+)\s*$/.exec(ln);
    if (!m) continue;
    if (normPath(m[1]) === target) return Number(m[2]);
  }
  const re = new RegExp(escRe(base) + ':(\\d+)');
  for (const ln of lines) {
    const m = re.exec(ln);
    if (m) return Number(m[1]);
  }
  return 0;   // 找不到行号 → 0（登记表里写 0 也算合法指纹，只要哈希一致）
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
  return {
    item: it.item,
    line: pickLine(res, it),
    msgSha8: sha8(msg.text),
    src: msg.from,
    errLine: msg.errLine,
    msgText: msg.text,
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
    if (!e || typeof e !== 'object' || !e.item || e.line === undefined || !e.msgSha8) {
      console.log('警告 登记表条目缺字段（已忽略，不会成为豁免）：' + JSON.stringify(e).slice(0, 160));
      continue;
    }
    ok.push({ item: String(e.item).replace(/\\/g, '/'), line: Number(e.line), msgSha8: String(e.msgSha8), why: e.why || '' });
  }
  return ok;
}

/* ── 主流程 ─────────────────────────────────────────────────────────── */
const items = collectItems();

if (LIST_ONLY) {
  console.log('验收项 共 ' + items.length + ' 项（--list：只列不跑）');
  for (const it of items) {
    console.log('  ' + it.item + '   cwd=' + (rel(it.cwd) || '.') + (it.kind === 'checker' ? '   [验收器]' : ''));
  }
  console.log('不跑（会写产物，不属于验收）：hotfix-patch/build-handlers.js');
  process.exit(0);
}

const registry = loadRegistry();
console.log('验收开始：项=' + items.length + '（hotfix-patch/test/*.js + 3 个验收器；不跑 build-handlers.js）');
console.log('登记表：' + rel(REG_PATH) + ' 条目=' + registry.length);
console.log('图例：PASS = 该项退出码 0；FAIL = 该项退出码非 0（**尚不代表验收违规**——');
console.log('      违规只认 "FAIL K1/K2/K3 …" 与最后一行 ACCEPTANCE）；已登记的红项另打 KNOWN-RED。');
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
  console.log('  指纹 item=' + rec.fp.item + ' line=' + rec.fp.line + ' msgSha8=' + rec.fp.msgSha8
    + ' （取自' + rec.fp.src + '）');
  console.log('');
}

const failing = results.filter(function (r) { return r.res.code !== 0; });
const green = results.length - failing.length;

/* 判定 */
const fails = [];
function fail(code, text) { fails.push(code + ': ' + text); console.log('FAIL ' + code + ' ' + text); }

const regByItem = new Map();
for (const e of registry) {
  if (!regByItem.has(e.item)) regByItem.set(e.item, []);
  regByItem.get(e.item).push(e);
}
const matched = new Set();

for (const r of failing) {
  const fp = r.fp;
  const list = regByItem.get(fp.item) || [];
  const hit = list.find(function (e) { return e.line === fp.line && e.msgSha8 === fp.msgSha8; });
  if (hit) {
    matched.add(hit);
    r.known = hit;
    console.log('KNOWN-RED ' + fp.item + ':' + fp.line + '#' + fp.msgSha8 + '  why=' + (hit.why || '（未写 why）'));
  } else if (list.length) {
    // K3：同一个文件在登记表里有条目，但本次出现的是"另外"一处失败
    fail('K3', '同一文件出现新红项 ' + fp.item + ' → ' + fp.item + ':' + fp.line + '#' + fp.msgSha8
      + '（登记表里该文件的条目是 '
      + list.map(function (e) { return ':' + e.line + '#' + e.msgSha8; }).join(' , ') + '）');
  } else {
    // K1：整项新增红
    fail('K1', '新增红项 ' + fp.item + ':' + fp.line + '#' + fp.msgSha8);
  }
}

for (const e of registry) {
  if (matched.has(e)) continue;
  // K2：登记过但本次没复现（已修复必须删登记，否则登记表变永久豁免）
  fail('K2', '已修复的红项仍留在登记表 ' + e.item + ':' + e.line + '#' + e.msgSha8 + '（必须删掉，防登记表变永久豁免）');
}

console.log('');
if (!fails.length) {
  console.log('ACCEPTANCE OK 项=' + results.length + ' 绿=' + green + ' 已知红=' + matched.size);
  process.exit(0);
}
console.log('ACCEPTANCE FAIL 项=' + results.length + ' 绿=' + green + ' 失败=' + failing.length
  + ' 已知红=' + matched.size + ' 违规=' + fails.length);
process.exit(1);
