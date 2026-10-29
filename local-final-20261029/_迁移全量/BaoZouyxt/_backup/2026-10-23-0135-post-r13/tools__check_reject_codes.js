'use strict';
/**
 * tools/check_reject_codes.js —— 拒绝码表机械校验器
 *
 * 跑法：node tools\check_reject_codes.js      （退出码 0 = 全绿）
 *
 * 只读三处输入，不写任何文件：
 *   - tools/facts/reject-codes.json          判定表（主审维护，本脚本只校验不改）
 *   - tools/index.js                         客户端证据行（只按行读、只取 ev 需要的行）
 *   - hotfix-patch/core/bz-rpc-server.js     服务端 handler 体（R5b 反向覆盖）
 *
 * 规则（与工单逐条对应）：
 *   R1  chosen 不许落在 success 里
 *   R2  三态（2026-10-23 主审裁定，替换原「promptOnly 非空 → tier 必须 1」）：
 *        (b) promptOnly 非空 且 tier === 1 → chosen 必须在 promptOnly 里
 *            （promptOnly 含 "else" 时按「chosen ∉ handled」处理）
 *        (c) promptOnly 非空 且 tier === 2 → 必须有非空字符串 tierWhy（写明为何不用提示分支）
 *   R3  promptOnly 为空 → tier 必须 2，且 chosen ∉ handled
 *        （genericIntercepts 视为空集：通用网络层不判 eRet，证据 index.js:59204/59332/59335）
 *   R4  ev 的 `文件名:行号#sha8` 必须等于该行原文（去行尾 \r 后 trim）的 sha1 前 8 位小写
 *   R5b 服务端每个含拒绝点（eRet 字面量 != 1）的 handler 都必须在表里登记
 *   R5  本轮未实现（每次运行都必须叫出来，不许静默、不许当通过）
 *
 * role 语义（默认 "reject"，表里缺该字段即按 reject 处理）：
 *   "reject" —— 走 R1/R2/R3 + R4 + R5b
 *   "flow"   —— 不是拒绝码（正常流程分支）：跳过 R1/R2/R3，只留 R4/R5b 参与，
 *               且 tier 必须为 0（否则表错）
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TOOLS = __dirname;
const ROOT = path.resolve(TOOLS, '..');
const TABLE_PATH = path.join(TOOLS, 'facts', 'reject-codes.json');
const RPC_PATH = path.join(ROOT, 'hotfix-patch', 'core', 'bz-rpc-server.js');

const fails = [];
/** 记一条失败并立刻打印（消息文本按工单原样，便于 grep） */
function fail(msg) {
  fails.push(msg);
  console.log(msg);
}

/* ------------------------------------------------------------------ *
 * 按行读大文件：只读到需要的最大行号为止，不整文件加载 / 不 JSON.parse
 * 返回按行切好的数组（0 基，行尾 \r 已去掉）
 * ------------------------------------------------------------------ */
function readLinesUpTo(file, maxLine) {
  const want = Math.max(1, maxLine | 0);
  const fd = fs.openSync(file, 'r');
  const parts = [];
  let bytes = 0;
  let newlines = 0;
  try {
    const chunk = Buffer.allocUnsafe(1 << 16);
    while (newlines < want) {
      const n = fs.readSync(fd, chunk, 0, chunk.length, bytes);
      if (n <= 0) break;
      const buf = Buffer.from(chunk.subarray(0, n));
      parts.push(buf);
      bytes += n;
      for (let i = 0; i < buf.length; i++) if (buf[i] === 0x0a) newlines++;
    }
  } finally {
    fs.closeSync(fd);
  }
  return Buffer.concat(parts).toString('utf8').split(/\r?\n/);
}

const lineCache = new Map(); // file -> { maxLine, lines }
function getLine(file, lineNo) {
  let c = lineCache.get(file);
  if (!c || c.maxLine < lineNo) {
    const maxLine = c ? Math.max(c.maxLine, lineNo) : lineNo;
    c = { maxLine: maxLine, lines: readLinesUpTo(file, maxLine) };
    lineCache.set(file, c);
  }
  return c.lines[lineNo - 1];
}

/* ------------------------------------------------------------------ *
 * R5b 用：从 rpc-server 切出每个 handler 体 + 体内 eRet 字面量
 * ------------------------------------------------------------------ */
const HANDLER_RE = /^ {4}([A-Za-z_$][\w$]*): function \(/;

/** 从 handler 起始行做花括号配对，返回函数体结束行（0 基）。
 *  跳过字符串 / 模板串 / 行注释 / 块注释 / 正则字面量，避免花括号被误计。 */
function bodyEndLine(lines, startIdx) {
  let depth = 0;
  let opened = false;
  const REGEX_PREV = '=(,:[!&|?{};+-*%<>~^';
  for (let i = startIdx; i < lines.length; i++) {
    const s = lines[i];
    for (let j = 0; j < s.length; j++) {
      const ch = s[j];
      if (ch === '/' && s[j + 1] === '/') break;              // 行注释到行尾
      if (ch === '/' && s[j + 1] === '*') {                    // 块注释
        let k = s.indexOf('*/', j + 2);
        while (k < 0 && i + 1 < lines.length) { i++; k = lines[i].indexOf('*/'); }
        if (k < 0) return lines.length - 1;
        j = k + 1;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') {            // 字符串 / 模板串
        const q = ch;
        j++;
        while (j < s.length) {
          if (s[j] === '\\') { j += 2; continue; }
          if (s[j] === q) break;
          j++;
        }
        continue;
      }
      if (ch === '/') {                                        // 可能是正则字面量
        let p = j - 1;
        while (p >= 0 && /\s/.test(s[p])) p--;
        const prev = p >= 0 ? s[p] : '';
        const isRegex = p < 0 || REGEX_PREV.indexOf(prev) >= 0;
        if (isRegex) {
          j++;
          let inClass = false;
          while (j < s.length) {
            const c2 = s[j];
            if (c2 === '\\') { j += 2; continue; }
            if (c2 === '[') inClass = true;
            else if (c2 === ']') inClass = false;
            else if (c2 === '/' && !inClass) break;
            j++;
          }
          continue;
        }
      }
      if (ch === '{') { depth++; opened = true; }
      else if (ch === '}') {
        depth--;
        if (opened && depth === 0) return i;
      }
    }
  }
  return lines.length - 1;
}

const ERET_RE = /eRet\s*:\s*([0-9]+)/g;

/** 扫描 rpc-server，返回 { handlers: [{name,start}], points: [{name,value,line}] } */
function scanRpcRejectPoints(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const handlers = [];
  for (let i = 0; i < lines.length; i++) {
    const m = HANDLER_RE.exec(lines[i]);
    if (m) handlers.push({ name: m[1], start: i });
  }
  const points = [];
  for (const h of handlers) {
    const end = bodyEndLine(lines, h.start);
    for (let i = h.start; i <= end; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.slice(0, 2) === '//') continue;   // 整行 // 注释不算
      ERET_RE.lastIndex = 0;
      let m;
      while ((m = ERET_RE.exec(lines[i])) !== null) {
        if (m[1] !== '1') points.push({ name: h.name, value: m[1], line: i + 1 });
      }
    }
  }
  return { handlers: handlers, points: points };
}

/* ------------------------------------------------------------------ *
 * 主流程
 * ------------------------------------------------------------------ */
function main() {
  const table = JSON.parse(fs.readFileSync(TABLE_PATH, 'utf8'));
  const names = Object.keys(table);
  const K = names.length;

  /* --- R1 / R2 / R3（role=flow 跳过；tier 必须 0） --- */
  for (const name of names) {
    const e = table[name];
    const role = e.role || 'reject';
    const chosen = e.chosen;
    const success = Array.isArray(e.success) ? e.success : [];
    const handled = Array.isArray(e.handled) ? e.handled : [];
    const promptOnly = Array.isArray(e.promptOnly) ? e.promptOnly : [];

    if (role === 'flow') {
      if (e.tier !== 0) fail('表错 role=flow 但 tier!=0 ' + name);
      continue;
    }
    if (role !== 'reject') {
      fail('表错 未知 role=' + JSON.stringify(role) + ' ' + name);
      continue;
    }

    // R1：拒绝码不得落在成功集里
    if (success.indexOf(chosen) < 0) {
      // 合法
    } else {
      fail('R1 拒绝码落在成功集 ' + name);
    }

    if (promptOnly.length > 0) {
      // R2 三态：(b) tier 1 → 必须真用上提示分支；(c) tier 2 → 必须写明理由（tierWhy）
      if (e.tier === 1) {
        const inPrompt = promptOnly.indexOf(chosen) >= 0;
        const elseCase = promptOnly.indexOf('else') >= 0 && handled.indexOf(chosen) < 0;
        if (!(inPrompt || elseCase)) {
          fail('R2 有提示分支却没用 ' + name);
        }
      } else if (e.tier === 2) {
        if (!(typeof e.tierWhy === 'string' && e.tierWhy.trim().length > 0)) {
          fail('R2 有提示分支却选第 2 档但没写理由 ' + name);
        }
      } else {
        fail('R2 有提示分支却没用 ' + name);
      }
    } else {
      // R3：无提示分支就必须静默（tier 2 且不落 handled；genericIntercepts 视为空集）
      if (!(e.tier === 2 && handled.indexOf(chosen) < 0)) {
        fail('R3 第 2 档码被拦截或被处理 ' + name);
      }
    }
  }

  /* --- R4 证据行哈希 --- */
  const EV_RE = /^([^:]+):([0-9]+)#([0-9a-f]{8})$/;
  for (const name of names) {
    const e = table[name];
    const ev = typeof e.ev === 'string' ? e.ev : '';
    const m = EV_RE.exec(ev);
    if (!m) {
      fail('R4 证据行哈希不符 ' + name);
      console.log('     ev 格式无法解析: ' + JSON.stringify(ev) + '（期望 文件名:行号#sha8）');
      continue;
    }
    const file = path.join(TOOLS, m[1]);
    const lineNo = parseInt(m[2], 10);
    const want = m[3];
    let raw;
    try {
      raw = getLine(file, lineNo);
    } catch (err) {
      fail('R4 证据行哈希不符 ' + name);
      console.log('     读不到 ' + file + ': ' + err.message);
      continue;
    }
    if (raw === undefined) {
      fail('R4 证据行哈希不符 ' + name);
      console.log('     ' + m[1] + ' 只有不到 ' + lineNo + ' 行');
      continue;
    }
    const text = raw.replace(/\r$/, '').trim();
    const got = crypto.createHash('sha1').update(text, 'utf8').digest('hex').slice(0, 8);
    if (got !== want) {
      fail('R4 证据行哈希不符 ' + name);
      console.log('     期望 ' + want + ' 实际 ' + got + ' @ ' + ev);
      console.log('     原文 ' + JSON.stringify(text.slice(0, 160)));
    }
  }

  /* --- R5b 反向覆盖：服务端拒绝点必须全部登记 --- */
  let points = [];
  try {
    points = scanRpcRejectPoints(RPC_PATH).points;
  } catch (err) {
    fail('R5b 读取失败 ' + RPC_PATH + ': ' + err.message);
  }
  const pointActions = new Set();
  for (const p of points) pointActions.add(p.name);
  for (const p of points) {
    if (names.indexOf(p.name) < 0) {
      fail('R5b 拒绝码没登记 ' + p.name + ' eRet=' + p.value + ' 行=' + p.line);
    }
  }

  /* --- 统计 / 未实现声明 --- */
  const flowNames = names.filter(function (n) { return (table[n].role || 'reject') === 'flow'; });
  console.log('非拒绝码（flow）= ' + flowNames.length + ' 条：' + (flowNames.length ? flowNames.join('、') : '（无）'));
  const tierWhyNames = names.filter(function (n) {
    const x = table[n];
    if ((x.role || 'reject') !== 'reject') return false;
    const po = Array.isArray(x.promptOnly) ? x.promptOnly : [];
    return po.length > 0 && x.tier === 2 && typeof x.tierWhy === 'string' && x.tierWhy.trim().length > 0;
  });
  console.log('第 2 档带理由 = ' + tierWhyNames.length + ' 条（' + (tierWhyNames.length ? tierWhyNames.join('、') : '（无）') + '）');
  console.log('拒绝点 ' + points.length + ' 处 / 涉及 ' + pointActions.size + ' 个动作 / 表内 ' + K + ' 条');
  console.log('R5 未实现（下一批：非法请求夹具 + 磁盘/业务双哈希）');

  /* --- 收尾 --- */
  if (fails.length > 0) {
    console.log('REJECT-CODES 失败 ' + fails.length + ' 条（表=' + K + ' 条 拒绝点=' + points.length + ' 处）');
    process.exitCode = 1;
    return 1;
  }
  console.log('REJECT-CODES OK 表=' + K + ' 条 拒绝点=' + points.length + ' 处');
  return 0;
}

try {
  const code = main();
  if (code !== 0) process.exit(code);
} catch (err) {
  console.log('REJECT-CODES 异常 ' + (err && err.stack ? err.stack : err));
  process.exit(1);
}
