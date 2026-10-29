'use strict';
// 容错 JS 扫描：不依赖解析器，跳过字符串/注释/正则字面量做括号配对。面向压缩后的 cocos 产物。
function skipNonCode(src, i) {
  const c = src[i], n = src[i + 1];
  if (c === '"' || c === "'" || c === '`') { let j = i + 1; while (j < src.length && src[j] !== c) { if (src[j] === '\\') j++; j++; } return j + 1; }
  if (c === '/' && n === '/') { const j = src.indexOf('\n', i); return j < 0 ? src.length : j; }
  if (c === '/' && n === '*') { const j = src.indexOf('*/', i + 2); return j < 0 ? src.length : j + 2; }
  if (c === '/') { // 正则字面量：前一个非空字符是运算符/括号时视为正则
    let k = i - 1; while (k >= 0 && /\s/.test(src[k])) k--;
    if (k < 0 || /[(,=:[!&|?{};+\-*%<>~^]/.test(src[k]) || /\b(return|typeof|case)$/.test(src.slice(Math.max(0, k - 6), k + 1))) {
      let j = i + 1, cls = false;
      while (j < src.length && src[j] !== '\n') { if (src[j] === '\\') j++; else if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; else if (src[j] === '/' && !cls) break; j++; }
      if (src[j] === '/') { j++; while (/[a-z]/i.test(src[j] || '')) j++; return j; }
    }
  }
  return -1;
}
// 从 open（指向 ( [ { 之一）找配对位置
function matchBracket(src, open) {
  const pair = { '(': ')', '[': ']', '{': '}' };
  const stack = [];
  for (let i = open; i < src.length; i++) {
    const j = skipNonCode(src, i);
    if (j >= 0) { i = j - 1; continue; }
    const c = src[i];
    if (pair[c]) stack.push(pair[c]);
    else if (c === ')' || c === ']' || c === '}') { if (stack.pop() !== c) return -1; if (!stack.length) return i; }
  }
  return -1;
}
// 顶层按逗号切分（args 字符串，不含外层括号）
function splitTop(s) {
  const out = []; let depth = 0, last = 0;
  for (let i = 0; i < s.length; i++) {
    const j = skipNonCode(s, i); if (j >= 0) { i = j - 1; continue; }
    const c = s[i];
    if ('([{'.includes(c)) depth++; else if (')]}'.includes(c)) depth--;
    else if (c === ',' && depth === 0) { out.push(s.slice(last, i).trim()); last = i + 1; }
  }
  out.push(s.slice(last).trim());
  return out.filter(x => x !== '');
}
// 对象字面量 "{a: 1, b: x}" → [[key, valueSrc]]
function objectKeys(lit) {
  const inner = lit.trim().replace(/^\{/, '').replace(/\}$/, '');
  return splitTop(inner).map(part => {
    const m = part.match(/^\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z_$][\w$]*))\s*:\s*([\s\S]*)$/);
    return m ? [m[1] || m[2] || m[3], m[4].trim()] : [null, part];
  });
}
function lineOf(src, idx, cache) {
  // 二分查换行表
  if (!cache.nl) { cache.nl = [0]; for (let i = 0; i < src.length; i++) if (src[i] === '\n') cache.nl.push(i + 1); }
  let lo = 0, hi = cache.nl.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (cache.nl[mid] <= idx) lo = mid; else hi = mid - 1; }
  return lo + 1;
}
module.exports = { skipNonCode, matchBracket, splitTop, objectKeys, lineOf };
