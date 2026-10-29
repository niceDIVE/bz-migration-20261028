'use strict';
/*
 * log-stats-20261022-session3.js — 只读统计脚本（工单 session3 A-F 项）
 * 输入（只读）: F:\BaoZouyxt\hotfix-patch\probe\log-pull-20261022-session3.jsonl
 * 输出（新建）: F:\BaoZouyxt\hotfix-patch\tools\facts\log-forensics-20261022-session3.json
 * 纪律: 机械过滤/计数/抄原文，不判断原因，不给建议。
 */
const fs = require('fs');

const SRC = 'F:/BaoZouyxt/hotfix-patch/probe/log-pull-20261022-session3.jsonl';
const OUT = 'F:/BaoZouyxt/hotfix-patch/tools/facts/log-forensics-20261022-session3.json';

// ---- 时间: 毫秒 → UTC+8 ISO8601 ----
function toUtc8(num) {
  if (num === null || num === undefined) return null;
  const d = new Date(num + 8 * 3600 * 1000);
  const p = (x, w) => String(x).padStart(w, '0');
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1, 2) + '-' + p(d.getUTCDate(), 2) +
    'T' + p(d.getUTCHours(), 2) + ':' + p(d.getUTCMinutes(), 2) + ':' + p(d.getUTCSeconds(), 2) +
    '.' + p(d.getUTCMilliseconds(), 3) + '+08:00';
}
function numT(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim())) {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// ---- 逐行读取（字节级，兼容 BOM/CRLF）----
const st = fs.statSync(SRC);
const buf = fs.readFileSync(SRC);
let start = 0;
if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) start = 3;

const recs = [];          // 非空行
let lineNo = 0;           // 物理行号（1-based）
let blankLines = 0;
let pos = start;
while (pos < buf.length) {
  const nl = buf.indexOf(10, pos);
  const end = (nl === -1) ? buf.length : nl;
  lineNo++;
  let lb = buf.slice(pos, end);
  pos = (nl === -1) ? buf.length : nl + 1;
  if (lb.length && lb[lb.length - 1] === 13) lb = lb.slice(0, -1); // 去 CR，其余原样
  if (lb.length === 0) { blankLines++; continue; }
  const raw = lb.toString('utf8');
  let obj = null, perr = null;
  try { obj = JSON.parse(raw); } catch (e) { perr = (e && e.message) ? String(e.message) : String(e); }
  recs.push({ lineNo, raw, obj, perr });
}

const isPlainObj = (r) => r.obj !== null && typeof r.obj === 'object' && !Array.isArray(r.obj);
const msgOf = (r) => (isPlainObj(r) && r.obj.msg !== undefined && r.obj.msg !== null) ? String(r.obj.msg) : null;
const kindOf = (r) => (isPlainObj(r) && r.obj.kind !== undefined && r.obj.kind !== null) ? String(r.obj.kind) : null;

// ---- F: 总量与时间范围 ----
const parseFailLineNos = [];
let minT = null, maxT = null, linesWithoutValidT = 0;
for (const r of recs) {
  if (r.perr) parseFailLineNos.push(r.lineNo);
  const t = isPlainObj(r) ? numT(r.obj.t) : null;
  if (t === null) { linesWithoutValidT++; continue; }
  if (minT === null || t < minT) minT = t;
  if (maxT === null || t > maxT) maxT = t;
}

// ---- A: 按 impl 分组 ----
const groupMap = new Map();
for (const r of recs) {
  const key = (isPlainObj(r) && r.obj.impl !== undefined && r.obj.impl !== null) ? String(r.obj.impl) : '<impl缺失>';
  let g = groupMap.get(key);
  const t = isPlainObj(r) ? numT(r.obj.t) : null;
  if (!g) {
    g = { impl: key, count: 0, firstLineNo: r.lineNo, firstT: null, lastLineNo: r.lineNo, lastT: null };
    groupMap.set(key, g);
  }
  if (g.count === 0) { g.firstLineNo = r.lineNo; g.firstT = t; }
  g.count++;
  g.lastLineNo = r.lineNo;
  g.lastT = t;
}
const A_implGroups = Array.from(groupMap.values()).map(g => ({
  impl: g.impl, count: g.count,
  firstLineNo: g.firstLineNo, firstT: g.firstT, firstT_utc8: toUtc8(g.firstT),
  lastLineNo: g.lastLineNo, lastT: g.lastT, lastT_utc8: toUtc8(g.lastT)
}));

// ---- B: msg 含 "异常"，或 kind=xhr 且 msg 匹配 /TypeError|Error/ ----
const B_lines = [];
for (const r of recs) {
  const msg = msgOf(r);
  if (msg === null) continue;
  const kind = kindOf(r);
  const by = [];
  if (msg.includes('异常')) by.push('msg含"异常"');
  if (kind === 'xhr' && /TypeError|Error/.test(msg)) by.push('kind=xhr且msg匹配/TypeError|Error/');
  if (by.length) {
    const t = isPlainObj(r) ? numT(r.obj.t) : null;
    B_lines.push({ lineNo: r.lineNo, matchedBy: by, t, t_utc8: toUtc8(t), raw: r.raw });
  }
}

// ---- C: msg 含 "UNKNOWN"，按动作名去重 ----
// 动作名机械规则: msg 中 "UNKNOWN" 后第一个空白分隔 token
function actionKeyOf(msg) {
  const m = /UNKNOWN\s+([^\s]+)/.exec(msg);
  return m ? m[1] : '<UNKNOWN后未提取到token>';
}
const C_lines = [];
const cMap = new Map();
for (const r of recs) {
  const msg = msgOf(r);
  if (msg === null || !msg.includes('UNKNOWN')) continue;
  const t = isPlainObj(r) ? numT(r.obj.t) : null;
  const action = actionKeyOf(msg);
  C_lines.push({ lineNo: r.lineNo, action, t, t_utc8: toUtc8(t), raw: r.raw });
  let a = cMap.get(action);
  if (!a) { a = { action, count: 0, lastT: null, lastT_utc8: null, lastLineNo: r.lineNo, lineNos: [] }; cMap.set(action, a); }
  a.count++;
  a.lineNos.push(r.lineNo);
  if (t !== null && (a.lastT === null || t >= a.lastT)) { a.lastT = t; a.lastT_utc8 = toUtc8(t); a.lastLineNo = r.lineNo; }
}
const C_actions = Array.from(cMap.values()).sort((x, y) => (y.count - x.count) || x.action.localeCompare(y.action));

// ---- D: msg 含 "useItem" ----
const D_lines = [];
for (const r of recs) {
  const msg = msgOf(r);
  if (msg === null || !msg.includes('useItem')) continue;
  const t = isPlainObj(r) ? numT(r.obj.t) : null;
  D_lines.push({ lineNo: r.lineNo, t, t_utc8: toUtc8(t), raw: r.raw });
}

// ---- E: msg 匹配 /getAchieveData|Achieve/ ----
const E_lines = [];
for (const r of recs) {
  const msg = msgOf(r);
  if (msg === null || !/getAchieveData|Achieve/.test(msg)) continue;
  const t = isPlainObj(r) ? numT(r.obj.t) : null;
  E_lines.push({ lineNo: r.lineNo, t, t_utc8: toUtc8(t), raw: r.raw });
}

// ---- 边界记录（只记位置+原文，不分析）: kind!=xhr 但 msg 含 TypeError/Error 的行 ----
const boundary_errKind = [];
for (const r of recs) {
  const msg = msgOf(r);
  if (msg === null) continue;
  const kind = kindOf(r);
  if (kind !== 'xhr' && /TypeError|Error/.test(msg)) {
    const t = isPlainObj(r) ? numT(r.obj.t) : null;
    boundary_errKind.push({ lineNo: r.lineNo, kind, t, t_utc8: toUtc8(t), raw: r.raw });
  }
}

// ---- 本会话已执行命令记录（原文与退出码；node 统计命令退出码由主审回执补记）----
const commands = [
  { cmd: 'adb connect 127.0.0.1:16416', exitCode: 0, keyOutput: 'already connected to 127.0.0.1:16416' },
  { cmd: 'adb devices', exitCode: 0, keyOutput: 'List of devices attached / T9Y0221708013594 device / 127.0.0.1:16416 device / emulator-5556 device' },
  { cmd: 'cmd /c "adb -s 127.0.0.1:16416 exec-out cat /data/data/com.maple.madherogo/files/bz_log.jsonl > F:\\BaoZouyxt\\hotfix-patch\\probe\\log-pull-20261022-session3.jsonl"', exitCode: 0, keyOutput: 'exitcode_cmd_adb=0; 本机文件 26724 字节' }
];

const report = {
  meta: {
    status: 'done',
    generatedAtLocal: new Date().toString(),
    workOrder: 'session3 日志取证（A-F 机械统计：只计数+摘录原行，不判断原因）',
    sourceDevicePath: '/data/data/com.maple.madherogo/files/bz_log.jsonl',
    sourceDeviceSerial: '127.0.0.1:16416',
    sourceLocalFile: 'F:\\BaoZouyxt\\hotfix-patch\\probe\\log-pull-20261022-session3.jsonl',
    sourceLocalBytes: st.size,
    statsScript: 'F:\\BaoZouyxt\\hotfix-patch\\probe\\log-stats-20261022-session3.js',
    timezoneNote: '所有 *_utc8 均为 t（毫秒）转 UTC+8 的 ISO8601',
    rules: {
      B: 'msg 含 "异常"，或 kind=xhr 且 msg 匹配 /TypeError|Error/（逐字面执行）',
      C: 'msg 含 "UNKNOWN"；动作名 = msg 中 "UNKNOWN" 后第一个空白分隔 token',
      D: 'msg 含 "useItem"',
      E: 'msg 匹配 /getAchieveData|Achieve/'
    },
    limitations: [
      '设备端原始文件字节数未核对（工单未授权 ls/wc 类命令）；完整性以本机拉取文件 ' + st.size + ' 字节 / ' + recs.length + ' 非空行计',
      '拉取方式: Start-Process 因本会话环境 NO_PROXY/no_proxy 重复键失败（未产生写入），改用 cmd /c 对同一条 adb exec-out cat 命令做本机重定向（字节保真）',
      '统计仅覆盖本机拉取文件内容；未对设备端做二次校验读取'
    ]
  },
  commands,
  F_totals: {
    totalNonEmptyLines: recs.length,
    blankLines,
    parseFailCount: parseFailLineNos.length,
    parseFailLineNos: parseFailLineNos.slice(0, 200),
    parseFailListTruncated: parseFailLineNos.length > 200,
    linesWithoutValidT,
    earliestT: minT, earliestT_utc8: toUtc8(minT),
    latestT: maxT, latestT_utc8: toUtc8(maxT)
  },
  A_implGroups,
  B_abnormal: {
    count: B_lines.length,
    rule: 'msg 含 "异常"，或 kind=xhr 且 msg 匹配 /TypeError|Error/',
    lines: B_lines
  },
  C_unknown: {
    totalLines: C_lines.length,
    actionDistinctCount: C_actions.length,
    actionSourceRule: 'msg 中 "UNKNOWN" 后第一个空白分隔 token',
    actions: C_actions,
    lines: C_lines
  },
  D_useItem: { count: D_lines.length, lines: D_lines },
  E_achieve: { count: E_lines.length, rule: 'msg 匹配 /getAchieveData|Achieve/', lines: E_lines },
  boundaryNotes: {
    note: '只记录位置，不分析。工单 B 规则限定 kind=xhr；以下行为 kind!=xhr 且 msg 含 TypeError/Error，按字面不匹配 B，未计入 B。',
    kindNotXhrWithError: { count: boundary_errKind.length, lines: boundary_errKind }
  }
};

fs.writeFileSync(OUT, JSON.stringify(report, null, 2), 'utf8');

// ---- 控制台摘要（供回传引用）----
console.log('SRC bytes=' + st.size + ' nonEmptyLines=' + recs.length + ' blank=' + blankLines + ' parseFail=' + parseFailLineNos.length);
console.log('F earliest=' + toUtc8(minT) + ' latest=' + toUtc8(maxT));
for (const g of A_implGroups) console.log('A impl=' + g.impl + ' count=' + g.count + ' first=' + g.firstT_utc8 + ' last=' + g.lastT_utc8 + ' (L' + g.firstLineNo + '-L' + g.lastLineNo + ')');
console.log('B count=' + B_lines.length + ' lineNos=' + B_lines.map(x => x.lineNo).join(','));
console.log('C totalLines=' + C_lines.length + ' distinctActions=' + C_actions.length);
for (const a of C_actions) console.log('C action=' + a.action + ' count=' + a.count + ' lastT=' + a.lastT_utc8 + ' lineNos=' + a.lineNos.join(','));
console.log('D count=' + D_lines.length + ' lineNos=' + D_lines.map(x => x.lineNo).join(','));
console.log('E count=' + E_lines.length + ' lineNos=' + E_lines.map(x => x.lineNo).join(','));
console.log('boundary kind!=xhr with TypeError/Error count=' + boundary_errKind.length + ' lineNos=' + boundary_errKind.map(x => x.lineNo).join(','));
console.log('WROTE ' + OUT);
