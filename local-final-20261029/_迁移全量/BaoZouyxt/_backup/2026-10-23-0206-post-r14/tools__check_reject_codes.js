'use strict';
/**
 * tools/check_reject_codes.js —— 拒绝码表机械校验器（2026-10-23 新 schema 版）
 *
 * 跑法：node tools\check_reject_codes.js      （退出码 0 = 全绿，1 = 有失败）
 *
 * 只读三处输入，不写任何文件：
 *   - tools/facts/reject-codes.json          判定表（主审维护，本脚本只校验不改）
 *   - tools/index.js                         客户端证据行（按 ev 的「行号」取原文算 sha1）
 *   - hotfix-patch/core/bz-rpc-server.js     服务端 handler 体（R5b+ 反向覆盖）
 *
 * 规则（与工单逐条对应）：
 *   R1  每条 role:"reject" 的 code 不许落在该动作的 success 里
 *   R2  三态（逐 code 判，动作级 promptOnly）：
 *        (a) promptOnly 为空 → 该 reject 条必须 tier===2，且 code ∉ handled
 *        (b) promptOnly 非空 且 tier===1 → code 必须在 promptOnly 里
 *            （promptOnly 含 "else" 时按「code ∉ handled」处理）
 *        (c) promptOnly 非空 且 tier===2 → 必须有非空字符串 tierWhy
 *        其他 tier 值（0/3/字符串/缺席…）→ 直接红
 *   R3  defaultCode 必须是「兜底路径真的会用的码」：
 *        有 reasons 含 "default" 的 reject → defaultCode 必须等于其中一条的 code；
 *        一条 "default" 都没有 → 该动作只许有一个码，且 defaultCode 必须等于它。
 *        （schema 段原文：「没有 "default" 条目的动作，defaultCode 取唯一的那个 code」。
 *          有 reject 的动作在此等价于 R3 原文「codes 里只有一条 reject」；纯 flow 动作
 *          （washAdditionalArr）没有 reject 可挑，走「唯一码」这一支。）
 *   R4  每条 ev 的 `文件名:行号#sha8` 必须等于该行原文（去行尾 \r 后 trim）的 sha1 前 8 位小写
 *   F1  role:"flow" 的 code 必须出现在该动作的 handled 里
 *   F2  role:"flow" 的行为断言：沙箱里真跑一次该动作的 handler（同 test/r13-reject-codes.js 的搭法），
 *       断言 eRet === flow.code、且 reads 列出的字段都带齐、类型正确
 *       （attrList 必须是含 4 段的字符串：split('|').length === 4）
 *   F3  同一动作里 flow 的 code 不许与任何 role:"reject" 的 code 相同
 *   R5b+ 服务端反向覆盖（按花括号配对切 handler 体，整行注释与 JSDoc 行跳过）：
 *        ① `eRet:<数字>` 且值 ≠ 1 → 该 handler 必须在表里
 *        ② `eRet:` 后面不是数字字面量（eRet: code / 三元 …）→ 必须登记且该条带 "dynamic": true
 *        ③ 出现 `.eRet =` 赋值（不是对象字面量）→ 同上
 *   R5c  冒烟器由另一人写（test/r14-catch-smoke.js），本脚本只打印入口、不判失败
 *   R5   本轮不实现（动作×原因夹具 + 磁盘/业务双哈希），每次运行都必须叫出来，不许冒充通过
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TOOLS = __dirname;
const ROOT = path.resolve(TOOLS, '..');
const TABLE_PATH = path.join(TOOLS, 'facts', 'reject-codes.json');
const INDEX_PATH = path.join(TOOLS, 'index.js');
const CORE = path.join(ROOT, 'hotfix-patch', 'core');
const RPC_PATH = path.join(CORE, 'bz-rpc-server.js');

/** 固定时钟（与 test/r13-reject-codes.js 一致） */
const FIXED_NOW = 1792612412000;

const fails = [];
/** 记一条失败并立刻打印（规则前缀 + 原文，便于 grep） */
function fail(rule, msg) {
  const line = rule + ' ' + msg;
  fails.push(line);
  console.log('FAIL ' + line);
}

const isArr = Array.isArray;
const hasOwn = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
const sha8 = (text) => crypto.createHash('sha1').update(text, 'utf8').digest('hex').slice(0, 8);
const show = (v) => { try { return JSON.stringify(v); } catch (e) { return String(v); } };

/* ================================================================== *
 * R4 用：按行取客户端证据行原文
 * ================================================================== */
let indexLines = null;
function indexLine(no) {
  if (indexLines === null) {
    indexLines = fs.readFileSync(INDEX_PATH, 'utf8').split(/\r?\n/);
  }
  return indexLines[no - 1];
}

/* ================================================================== *
 * R5b+ 用：从 rpc-server 切出每个 handler 体 + 体内的 eRet 形态
 * ================================================================== */
const HANDLER_RE = /^ {4}([A-Za-z_$][\w$]*): function \(/;

/** 把行内字符串/模板串的内容换成空格（保留长度与引号），避免把字符串里的 eRet 文本当代码 */
function maskStrings(s) {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const q = ch;
      out += q;
      i++;
      while (i < s.length) {
        if (s[i] === '\\') { out += '  '; i += 2; continue; }
        if (s[i] === q) break;
        out += ' ';
        i++;
      }
      if (i < s.length) { out += s[i]; i++; }
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

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

const ERET_AT = /eRet\s*:\s*/g;
const ERET_ASSIGN = /\.eRet\s*=(?!=)/;

/** 扫描 rpc-server，返回
 *  { handlers: [{name,start,end}], points: [{name,value,line}], dyn: [{name,kind,line}] } */
function scanRpc(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const handlers = [];
  for (let i = 0; i < lines.length; i++) {
    const m = HANDLER_RE.exec(lines[i]);
    if (m) handlers.push({ name: m[1], start: i, end: bodyEndLine(lines, i) });
  }
  const points = [];
  const dyn = [];
  for (const h of handlers) {
    for (let i = h.start; i <= h.end; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.slice(0, 2) === '//') continue;        // 整行 // 注释跳过
      if (trimmed.charAt(0) === '*') continue;           // `*` 开头的 JSDoc 行跳过
      const masked = maskStrings(lines[i]);
      ERET_AT.lastIndex = 0;
      let m;
      while ((m = ERET_AT.exec(masked)) !== null) {
        const rest = masked.slice(ERET_AT.lastIndex);
        if (/^-?\d+/.test(rest)) {
          const value = parseInt(rest, 10);
          if (value !== 1) points.push({ name: h.name, value: value, line: i + 1 });
        } else {
          dyn.push({ name: h.name, kind: 'eRet:', line: i + 1 });
        }
      }
      if (ERET_ASSIGN.test(masked)) dyn.push({ name: h.name, kind: '.eRet =', line: i + 1 });
    }
  }
  return { handlers: handlers, points: points, dyn: dyn, lines: lines };
}

/* ================================================================== *
 * F2 用：真 handler 沙箱（搭法同 test/r13-reject-codes.js）
 * ================================================================== */
let sandbox = null;
function getSandbox() {
  if (sandbox) return sandbox;
  const vm = require('vm');
  vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-shapes.generated.js'), 'utf8'), { filename: 'bz-shapes.generated.js' });
  vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-tasks.generated.js'), 'utf8'), { filename: 'bz-tasks.generated.js' });
  const mod = require(RPC_PATH);
  const TPL = JSON.parse(fs.readFileSync(path.join(CORE, 'templates.json'), 'utf8'));
  sandbox = { createBzServer: mod.createBzServer, TPL: TPL };
  return sandbox;
}

/** 每个 flow 动作的请求夹具（空请求即"客户端默认调用"）；未列出的动作按 {} 发 */
const FLOW_REQ = {
  washAdditionalArr: {},
};

/** reads 字段的类型断言；未列出的字段退回"形状表默认值的类型" */
const READ_TYPE = {
  attrList: function (v) {
    return { ok: typeof v === 'string' && v.split('|').length === 4, why: '字符串且 split("|").length===4' };
  },
};

function typeAssert(field, v, action) {
  if (hasOwn(READ_TYPE, field)) return READ_TYPE[field](v);
  const shape = (typeof BZ_SHAPES !== 'undefined' && BZ_SHAPES && BZ_SHAPES[action]) || {};
  if (hasOwn(shape, field)) {
    const d = shape[field];
    if (isArr(d)) return { ok: isArr(v), why: '数组' };
    if (d !== null && typeof d === 'object') return { ok: v !== null && typeof v === 'object', why: '对象' };
    return { ok: typeof v === typeof d, why: typeof d };
  }
  return { ok: v !== undefined && v !== null && v !== '', why: '存在且非空' };
}

/** 沙箱里跑一次真实 handler，返回 { inner, logs } */
function callHandler(name) {
  const box = getSandbox();
  const store = new Map();
  const logs = [];
  const env = {
    readSave: (k) => (store.has(k) ? store.get(k) : null),
    writeSave: (k, t) => store.set(k, t),
    log: (m) => logs.push(String(m)),
    now: () => FIXED_NOW,
    templates: box.TPL,
  };
  const s = box.createBzServer(env);
  const req = hasOwn(FLOW_REQ, name) ? FLOW_REQ[name] : {};
  const res = s.dispatch('User', name, req);
  return { inner: (res && res['User.' + name]) || {}, logs: logs, res: res };
}

/* ================================================================== *
 * 主流程
 * ================================================================== */
function main() {
  let table;
  try {
    table = JSON.parse(fs.readFileSync(TABLE_PATH, 'utf8'));
  } catch (e) {
    fail('表错', '读不到/解不开 ' + TABLE_PATH + ': ' + (e && e.message));
    return 1;
  }
  const names = Object.keys(table);
  const K = names.length;

  let entries = 0;
  let rejectCount = 0;
  let flowCount = 0;
  const flowActions = [];

  for (const name of names) {
    const e = table[name];
    if (!e || typeof e !== 'object' || isArr(e)) { fail('表错', '动作值不是对象 ' + name); continue; }
    const success = isArr(e.success) ? e.success : [];
    const handled = isArr(e.handled) ? e.handled : [];
    const promptOnly = isArr(e.promptOnly) ? e.promptOnly : [];
    const codes = isArr(e.codes) ? e.codes : [];
    if (!isArr(e.codes)) fail('表错', 'codes 不是数组 ' + name);
    if (!isArr(e.success)) fail('表错', 'success 不是数组 ' + name);
    if (!isArr(e.handled)) fail('表错', 'handled 不是数组 ' + name);
    if (!isArr(e.promptOnly)) fail('表错', 'promptOnly 不是数组 ' + name);
    if (codes.length === 0) { fail('表错', 'codes 为空 ' + name); continue; }
    if (typeof e.defaultCode !== 'number') fail('表错', 'defaultCode 不是数字 ' + name);

    const rejects = codes.filter((c) => c && c.role === 'reject');
    const flows = codes.filter((c) => c && c.role === 'flow');
    for (const c of codes) {
      if (!c || (c.role !== 'reject' && c.role !== 'flow')) {
        fail('表错', '未知 role=' + show(c && c.role) + ' ' + name + ' code=' + show(c && c.code));
      }
    }
    entries += codes.length;
    rejectCount += rejects.length;
    flowCount += flows.length;
    if (flows.length) flowActions.push(name);

    /* ---------- role 结构：reject 必带 tier(1|2)，flow 必带 reads 且不许有 tier ---------- */
    for (const c of rejects) {
      if (typeof c.code !== 'number') fail('表错', 'reject 的 code 不是数字 ' + name);
      if (!isArr(c.reasons) || c.reasons.length === 0) fail('表错', 'reject 缺 reasons ' + name + ' code=' + show(c.code));
      if (!hasOwn(c, 'tier')) fail('表错', 'reject 缺 tier ' + name + ' code=' + show(c.code));
      else if (c.tier !== 1 && c.tier !== 2) {
        fail('表错', 'reject 的 tier 只许 1 或 2 ' + name + ' code=' + show(c.code) + ' tier=' + show(c.tier));
      }
    }
    for (const c of flows) {
      if (typeof c.code !== 'number') fail('表错', 'flow 的 code 不是数字 ' + name);
      if (hasOwn(c, 'tier')) fail('表错', 'flow 不许有 tier 字段 ' + name + ' code=' + show(c.code) + ' tier=' + show(c.tier));
      if (!isArr(c.reads)) fail('表错', 'flow 缺 reads 数组 ' + name + ' code=' + show(c.code));
    }

    /* ---------- R1：拒绝码不得落在成功集里 ---------- */
    for (const c of rejects) {
      if (success.indexOf(c.code) >= 0) {
        fail('R1', '拒绝码落在成功集 ' + name + ' code=' + c.code + ' success=' + show(success));
      }
    }

    /* ---------- R2：三态 ---------- */
    for (const c of rejects) {
      if (promptOnly.length === 0) {
        // (a) 没有提示分支 → 必须第 2 档（静默），且该码没被客户端处理
        const okTier = c.tier === 2;
        const okSilent = handled.indexOf(c.code) < 0;
        if (!okTier || !okSilent) {
          fail('R2a', '无提示分支时该条必须 tier=2 且 code∉handled ' + name + ' code=' + c.code
            + ' tier=' + show(c.tier) + ' handled=' + show(handled));
        }
      } else if (c.tier === 1) {
        // (b) 第 1 档 → 必须真的用上提示分支
        const inPrompt = promptOnly.indexOf(c.code) >= 0;
        const elseCase = promptOnly.indexOf('else') >= 0 && handled.indexOf(c.code) < 0;
        if (!(inPrompt || elseCase)) {
          fail('R2b', '有提示分支却没用 ' + name + ' code=' + c.code + ' promptOnly=' + show(promptOnly));
        }
      } else if (c.tier === 2) {
        // (c) 第 2 档 → 必须写明为何不用提示分支
        if (!(typeof c.tierWhy === 'string' && c.tierWhy.trim().length > 0)) {
          fail('R2c', '第 2 档但没写 tierWhy ' + name + ' code=' + c.code);
        }
      } else {
        fail('R2', 'tier 只许 1 或 2 ' + name + ' code=' + c.code + ' tier=' + show(c.tier));
      }
    }

    /* ---------- R3：defaultCode 必须是兜底码 ---------- */
    const withDefault = rejects.filter((c) => isArr(c.reasons) && c.reasons.indexOf('default') >= 0);
    if (withDefault.length > 0) {
      if (withDefault.every((c) => c.code !== e.defaultCode)) {
        fail('R3', 'defaultCode 不等于任何 reasons 含 default 的 reject '
          + name + ' defaultCode=' + show(e.defaultCode)
          + ' 候选=' + show(withDefault.map((c) => c.code)));
      }
    } else if (rejects.length === 1) {
      if (rejects[0].code !== e.defaultCode) {
        fail('R3', '唯一 reject 的 code 必须等于 defaultCode ' + name
          + ' defaultCode=' + show(e.defaultCode) + ' code=' + show(rejects[0].code));
      }
    } else if (rejects.length === 0) {
      // 纯 flow 动作：schema 段「没有 default 条目的动作，defaultCode 取唯一的那个 code」
      if (codes.length !== 1 || codes[0].code !== e.defaultCode) {
        fail('R3', '无 default 条目时只许有唯一一个码且等于 defaultCode ' + name
          + ' defaultCode=' + show(e.defaultCode) + ' codes=' + show(codes.map((c) => c.code)));
      }
    } else {
      fail('R3', '无 default 条目却有 ' + rejects.length + ' 条 reject（必须只有一条） ' + name
        + ' codes=' + show(rejects.map((c) => c.code)));
    }

    /* ---------- F1：flow 的 code 必须在 handled 里 ---------- */
    for (const c of flows) {
      if (handled.indexOf(c.code) < 0) {
        fail('F1', 'flow 的 code 不在 handled ' + name + ' code=' + c.code + ' handled=' + show(handled));
      }
    }

    /* ---------- F3：flow 的 code 不许与 reject 的 code 撞 ---------- */
    for (const f of flows) {
      for (const r of rejects) {
        if (f.code === r.code) {
          fail('F3', 'flow 码与 reject 码相同 ' + name + ' code=' + f.code);
        }
      }
    }

    /* ---------- R4：证据行哈希 ---------- */
    const EV_RE = /^([^:]+):([0-9]+)#([0-9a-f]{8})$/;
    for (const c of codes) {
      const ev = typeof c.ev === 'string' ? c.ev : '';
      const m = EV_RE.exec(ev);
      const tag = name + ' code=' + show(c.code);
      if (!m) {
        fail('R4', 'ev 格式无法解析 ' + tag + ' ev=' + show(ev) + '（期望 文件名:行号#sha8）');
        continue;
      }
      if (m[1] !== 'index.js') {
        fail('R4', 'ev 的文件名只认 tools/index.js ' + tag + ' ev=' + show(ev));
        continue;
      }
      const lineNo = parseInt(m[2], 10);
      const want = m[3];
      let raw;
      try {
        raw = indexLine(lineNo);
      } catch (err) {
        fail('R4', '证据行读不到 ' + tag + ' ' + ev + ': ' + err.message);
        continue;
      }
      if (raw === undefined) {
        fail('R4', '证据行不存在 ' + tag + ' ' + ev + '（index.js 不足 ' + lineNo + ' 行）');
        continue;
      }
      const text = raw.replace(/\r$/, '').trim();
      const got = sha8(text);
      if (got !== want) {
        fail('R4', '证据行哈希不符 ' + tag + ' 期望 ' + want + ' 实际 ' + got + ' @ ' + ev);
        console.log('     原文 ' + JSON.stringify(text.slice(0, 160)));
      }
    }
  }

  /* ---------- R5b+：服务端反向覆盖 ---------- */
  let points = [];
  let dyn = [];
  let handlerCount = 0;
  try {
    const scan = scanRpc(RPC_PATH);
    points = scan.points;
    dyn = scan.dyn;
    handlerCount = scan.handlers.length;
  } catch (err) {
    fail('R5b+', '读不到 ' + RPC_PATH + ': ' + (err && err.message));
  }
  const pointActions = new Set();
  for (const p of points) {
    pointActions.add(p.name);
    if (names.indexOf(p.name) < 0) {
      fail('R5b+', '拒绝码没登记 ' + p.name + ' eRet=' + p.value + ' 行=' + p.line);
    }
  }
  for (const d of dyn) {
    const ent = table[d.name];
    if (names.indexOf(d.name) < 0) {
      fail('R5b+', '动态 eRet（' + d.kind + '）的动作没登记 ' + d.name + ' 行=' + d.line);
      continue;
    }
    const codes = isArr(ent.codes) ? ent.codes : [];
    if (!codes.some((c) => c && c.dynamic === true)) {
      fail('R5b+', '动态 eRet（' + d.kind + '）必须在表里标 "dynamic": true ' + d.name
        + ' 行=' + d.line);
    }
  }

  /* ---------- F2：flow 行为断言（真 handler） ---------- */
  for (const name of flowActions) {
    const e = table[name];
    const flows = (isArr(e.codes) ? e.codes : []).filter((c) => c && c.role === 'flow');
    for (const c of flows) {
      const reads = isArr(c.reads) ? c.reads : [];
      const tag = name + ' code=' + show(c.code);
      let got;
      try {
        got = callHandler(name);
      } catch (err) {
        fail('F2', '跑 handler 抛异常 ' + tag + ': ' + (err && err.stack ? err.stack.split('\n')[0] : err));
        continue;
      }
      const inner = got.inner;
      if (inner.eRet !== c.code) {
        fail('F2', 'eRet 不等于 flow 的 code ' + tag + ' 实际=' + show(inner.eRet)
          + '（应答字段 ' + Object.keys(inner).join(',') + '；日志 ' + got.logs.slice(-2).join(' | ') + '）');
      }
      for (const f of reads) {
        if (!hasOwn(inner, f)) {
          fail('F2', '应答缺 reads 字段 ' + tag + ' 字段=' + f
            + '（应答字段 ' + Object.keys(inner).join(',') + '）');
          continue;
        }
        const a = typeAssert(f, inner[f], name);
        if (!a.ok) {
          fail('F2', 'reads 字段类型不对 ' + tag + ' 字段=' + f + ' 实际=' + show(inner[f]) + ' 期望=' + a.why);
        }
      }
    }
  }

  /* ---------- 统计 / 未实现声明 ---------- */
  console.log('信息 动作=' + K + ' 条目=' + entries + '（reject=' + rejectCount + ' flow=' + flowCount + '）');
  console.log('信息 R5b+ 扫描 handler=' + handlerCount + ' 拒绝点=' + points.length
    + ' 处（涉及 ' + pointActions.size + ' 个动作）动态 eRet=' + dyn.length + ' 处');
  console.log('R5c 见 test\\r14-catch-smoke.js');
  console.log('R5 未实现（下一批：动作×原因夹具 + 磁盘/业务双哈希）');

  if (fails.length > 0) {
    console.log('REJECT-CODES 失败 ' + fails.length + ' 条（动作=' + K + ' 条目=' + entries
      + ' 拒绝点=' + points.length + ' 处 flow=' + flowCount + ' 条）');
    return 1;
  }
  console.log('REJECT-CODES OK 动作=' + K + ' 条目=' + entries + ' 拒绝点=' + points.length
    + ' 处 flow=' + flowCount + ' 条');
  return 0;
}

try {
  const code = main();
  process.exit(code);
} catch (err) {
  console.log('REJECT-CODES 异常 ' + (err && err.stack ? err.stack : err));
  process.exit(1);
}
