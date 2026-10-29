// 只读分析脚本：抽取 bz-rpc-server.js 的 var H 顶层键 / var REJECT_CODES 键，
// 并与 registry.json 十个 KEY 的 action 对照。输出纯 JSON 到 stdout。
'use strict';
const fs = require('fs');

const SRC = 'F:/BaoZouyxt/hotfix-patch/core/bz-rpc-server.js';
const REG = 'F:/BaoZouyxt/audit-v23/incoming/unpacked/bz-oracle/out/registry.json';
const src = fs.readFileSync(SRC, 'utf8');
const lineStarts = [0];
for (let i = 0; i < src.length; i++) if (src[i] === '\n') lineStarts.push(i + 1);
function lineOf(off) { // 1-based
  let lo = 0, hi = lineStarts.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= off) lo = mid; else hi = mid - 1; }
  return lo + 1;
}

// 跳过空白与注释
function skipWs(s, i) {
  for (;;) {
    const c = s[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c === '/' && s[i + 1] === '/') { while (i < s.length && s[i] !== '\n') i++; continue; }
    if (c === '/' && s[i + 1] === '*') { i += 2; while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++; i += 2; continue; }
    return i;
  }
}
// 读标识符或字符串字面量键
function readKey(s, i) {
  const start = i;
  if (s[i] === '"' || s[i] === "'") {
    const q = s[i]; i++;
    let out = '';
    while (s[i] !== q) { if (s[i] === '\\') { out += s[i + 1]; i += 2; } else { out += s[i]; i++; } }
    return { name: out, end: i + 1, start };
  }
  const m = /^[A-Za-z_$][\w$]*/.exec(s.slice(i));
  if (!m) return null;
  return { name: m[0], end: i + m[0].length, start };
}
// 解析一个对象字面量的顶层条目；返回 {entries:[{name,line,start,end}], endOff}（endOff 指向 '}' 之后）
function parseObject(s, openOff) {
  let i = openOff; // 指向 '{'
  const entries = [];
  for (;;) {
    i = skipWs(s, i + 1);
    if (s[i] === '}') return { entries, endOff: i + 1 };
    const keyLine = lineOf(i);
    const k = readKey(s, i);
    if (!k) throw new Error('bad key at offset ' + i + ' line ' + keyLine);
    i = skipWs(s, k.end);
    if (s[i] !== ':') throw new Error('expected : after key ' + k.name + ' line ' + keyLine);
    i = skipWs(s, i + 1);
    const isFn = s.startsWith('function', i) || s.startsWith('async', i) || s[i] === '(';
    // 掠过值：跟踪 {} [] () 深度与字符串/注释，直到深度 0 处遇到 ',' 或 '}'
    let depth = 0;
    for (;;) {
      const c = s[i];
      if (c === '"' || c === "'") { const q = c; i++; while (s[i] !== q) { if (s[i] === '\\') i++; i++; } i++; continue; }
      if (c === '/' && s[i + 1] === '/') { while (i < s.length && s[i] !== '\n') i++; continue; }
      if (c === '/' && s[i + 1] === '*') { i += 2; while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++; i += 2; continue; }
      if (c === '{' || c === '[' || c === '(') { depth++; i++; continue; }
      if (c === '}' || c === ']' || c === ')') {
        if (depth === 0) { /* 值结束（对象条目收敛） */ break; }
        depth--; i++; continue;
      }
      if (depth === 0 && (c === ',' || c === '}')) break;
      i++;
    }
    entries.push({ name: k.name, line: keyLine, isFn, start: k.start, end: i });
    if (s[i] === ',') continue;
    if (s[i] === '}') return { entries, endOff: i + 1 };
    i++;
  }
}

function findVar(varName) {
  const re = new RegExp('var\\s+' + varName + '\\s*=\\s*\\{');
  const m = re.exec(src);
  if (!m) throw new Error('var ' + varName + ' not found');
  return m.index + m[0].length - 1; // '{' 的偏移
}

// ---- var H ----
const H = parseObject(src, findVar('H'));
const fnEntries = H.entries.filter(e => e.isFn);
const nameCount = {};
for (const e of fnEntries) nameCount[e.name] = (nameCount[e.name] || 0) + 1;
const dupKeys = Object.keys(nameCount).filter(n => nameCount[n] > 1);

const NEW10 = ['buyFormula', 'getInnShop', 'getInnRank', 'innBuyShop', 'buySchoolShop', 'BuyMarketItem', 'BuyMount', 'buyEjectGift', 'upFashionFaceState', 'fashionEffect'];
const new10 = NEW10.map(n => ({ key: n, occurrences: nameCount[n] || 0, line: (fnEntries.find(e => e.name === n) || {}).line || null }));

const V5_TARGETS = ['QuickBuyItem', 'equipWeapon', 'washAdditionalArr', 'sycnPlayerItemData', 'getGoodAndEvilShopData'];
const v5 = V5_TARGETS.map(n => ({ key: n, occurrences: nameCount[n] || 0, line: (fnEntries.find(e => e.name === n) || {}).line || null }));

// ---- var REJECT_CODES ----
const RC = parseObject(src, findVar('REJECT_CODES'));
const rcEntries = RC.entries.map(e => {
  const raw = src.slice(e.start, e.end);
  const dm = /default\s*:\s*(\d+)/.exec(raw);
  return { key: e.name, line: e.line, def: dm ? Number(dm[1]) : null };
});
const rcMap = {};
for (const e of rcEntries) rcMap[e.key] = e.def;

// ---- registry.json 十个 KEY ----
const regRaw = JSON.parse(fs.readFileSync(REG, 'utf8'));
const reg = regRaw.rows;
if (!Array.isArray(reg)) throw new Error('registry array not found; topKeys=' + Object.keys(regRaw).join(','));
const TEN = ['BUY_FORMULA_DATA', 'GET_INN_SHOP', 'GET_INN_RANK', 'INN_BUY_SHOP', 'BUY_SCHOOL_SHOP', 'BUY_MARKET_ITEM', 'BUY_MOUNT', 'REQ_BUY_GIFT', 'SET_YP_EFFECT_STATE', 'FASHION_EFFECT'];
const regLineOf = {};
// 用原始文本取行号
const regSrc = fs.readFileSync(REG, 'utf8');
TEN.forEach(k => {
  const m = new RegExp('"key"\\s*:\\s*"' + k + '"').exec(regSrc);
  regLineOf[k] = m ? lineStartsCount(regSrc.slice(0, m.index)) + 1 : null;
});
function lineStartsCount(t) { let n = 0; for (const c of t) if (c === '\n') n++; return n; }

const regPairs = TEN.map(k => {
  const item = reg.find(x => x.key === k);
  const action = item ? item.action : null;
  const stripped = action ? action.replace(/^User\./, '') : null;
  return { key: k, regLine: regLineOf[k], action, stripped, inH: stripped ? (nameCount[stripped] || 0) : 0, hLine: stripped ? (fnEntries.find(e => e.name === stripped) || {}).line || null : null };
});

// ---- 7 个新动作 default 两边对照 ----
const SEVEN = ['buyFormula', 'innBuyShop', 'buySchoolShop', 'BuyMarketItem', 'BuyMount', 'buyEjectGift', 'upgradeSkill'];
let rcj;
try { rcj = JSON.parse(fs.readFileSync('F:/BaoZouyxt/tools/facts/reject-codes.json', 'utf8')); } catch (e) { rcj = { __error: String(e) }; }
// reject-codes.json 可能是 {动作:{default:..}} 或别的结构，原样报出顶层键
const shape = Array.isArray(rcj) ? 'array(len=' + rcj.length + ')' : typeof rcj === 'object' && rcj ? 'object(topKeys=' + Object.keys(rcj).join(',') + ')' : String(rcj);
function lookupDef(obj, action) {
  if (!obj || typeof obj !== 'object') return undefined;
  if (Object.prototype.hasOwnProperty.call(obj, action)) {
    const v = obj[action];
    if (v && typeof v === 'object' && !Array.isArray(v)) return v.default !== undefined ? v.default : JSON.stringify(v);
    return v;
  }
  // 允许包一层（如 {actions:{...}}）
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && Object.prototype.hasOwnProperty.call(v, action)) {
      const w = v[action];
      if (w && typeof w === 'object' && !Array.isArray(w)) return w.default !== undefined ? w.default : JSON.stringify(w);
      return w;
    }
  }
  return undefined;
}
const seven = SEVEN.map(a => ({ action: a, serverDef: rcMap[a] !== undefined ? rcMap[a] : null, jsonDef: lookupDef(rcj, a) }));

console.log(JSON.stringify({
  H: {
    openBraceLine: lineOf(findVar('H')),
    totalEntries: H.entries.length,
    totalFunctionKeys: fnEntries.length,
    nonFunctionEntries: H.entries.filter(e => !e.isFn).map(e => e.name + '@L' + e.line),
    dupKeys,
  },
  new10,
  v5,
  REJECT_CODES: { openBraceLine: lineOf(findVar('REJECT_CODES')), entries: rcEntries },
  registryPairs: regPairs,
  rejectCodesJson: { shape, entries: rcj && !rcj.__error ? Object.keys(rcj).length : null },
  seven,
}, null, 2));
