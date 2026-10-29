// M2 生成器 v2：按「回调第二参数」抽取客户端真正读取的应答字段（只读源码，写 M2 文档）
// 运行：node docs/sota/material/_gen_m2_v2.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const FILES = ['tools/index.js', 'tools/scripts2.js', 'tools/scripts3.js'];
const OUT = path.join(__dirname, 'M2-客户端读点索引.md');

const BUILTIN = new Set([
  'length', 'push', 'pop', 'shift', 'unshift', 'splice', 'slice', 'indexOf', 'lastIndexOf',
  'join', 'split', 'replace', 'substring', 'substr', 'charAt', 'charCodeAt', 'toString',
  'toFixed', 'toLowerCase', 'toUpperCase', 'concat', 'sort', 'reverse', 'forEach', 'map',
  'filter', 'reduce', 'hasOwnProperty', 'isPrototypeOf', 'call', 'apply', 'bind', 'prototype',
  'constructor', 'trim', 'match', 'test', 'exec', 'getComponent', 'addComponent', 'setData',
  'parent', 'children', 'node', 'width', 'height', 'x', 'y', 'z', 'getText', 'show', 'log'
]);

// 字符串感知的扫描：返回与 start 处 '{' 配对的 '}' 的下标
function matchBrace(s, start) {
  let depth = 0, i = start;
  while (i < s.length) {
    const c = s[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < s.length) {
        if (s[i] === '\\') { i += 2; continue; }
        if (s[i] === q) { i++; break; }
        i++;
      }
      continue;
    }
    if (c === '/' && s[i + 1] === '/') { while (i < s.length && s[i] !== '\n') i++; continue; }
    if (c === '/' && s[i + 1] === '*') { i += 2; while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i; }
    i++;
  }
  return -1;
}

function lineOf(text, offset) {
  let n = 1;
  for (let i = 0; i < offset && i < text.length; i++) if (text[i] === '\n') n++;
  return n;
}

const sections = [];
const stats = { on: 0, inline: 0, named: 0, skipped: 0, fields: 0 };

for (const f of FILES) {
  const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
  let i = 0;
  while ((i = text.indexOf('MessageCenter.on(', i)) >= 0) {
    const onAt = i;
    stats.on++;
    i += 16;

    // 第一个实参
    let j = onAt + 'MessageCenter.on('.length;
    let depth = 0, arg1 = '';
    while (j < text.length) {
      const c = text[j];
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') { if (depth === 0) break; depth--; }
      else if (c === ',' && depth === 0) break;
      arg1 += c; j++;
    }
    const mHttp = arg1.match(/HttpConst\.([A-Za-z0-9_$]+)/);
    const mLit = arg1.match(/^\s*["']([^"']+)["']/);
    const action = mHttp ? mHttp[1] : (mLit ? mLit[1] : arg1.trim());
    const kindOfName = mHttp ? 'HttpConst' : (mLit ? '字面量' : '其它表达式');

    // 从第一个逗号之后找 handler
    const after = text.slice(j, j + 400);
    const fnIdxRel = after.search(/\bfunction\b/);
    const regLine = lineOf(text, onAt);

    if (fnIdxRel < 0) {
      // 命名处理器：this.xxx
      stats.named++;
      const mName = after.match(/(?:,\s*)(this\.[A-Za-z_$][\w$.]*)/);
      sections.push({
        action, file: f, line: regLine, kind: '命名处理器', name: kindOfName,
        handler: mName ? mName[1] : after.slice(0, 40).replace(/\s+/g, ' '),
        bodyStart: 0, bodyEnd: 0, fields: [], erets: []
      });
      continue;
    }

    // 内联函数：定位参数表与函数体
    const fnAbs = j + fnIdxRel;
    const pOpen = text.indexOf('(', fnAbs);
    const pClose = text.indexOf(')', pOpen);
    const params = text.slice(pOpen + 1, pClose).split(',').map(s => s.trim()).filter(Boolean);
    const bOpen = text.indexOf('{', pClose);
    if (pOpen < 0 || pClose < 0 || bOpen < 0) { stats.skipped++; continue; }
    const bClose = matchBrace(text, bOpen);
    if (bClose < 0) { stats.skipped++; continue; }
    stats.inline++;

    const body = text.slice(bOpen, bClose + 1);
    const bodyStartLine = lineOf(text, bOpen);
    const bodyEndLine = lineOf(text, bClose);
    const resp = params[1] || params[0] || 'o';

    const fields = new Map();
    const erets = new Set();
    const addField = (name, off, how) => {
      if (!name || BUILTIN.has(name)) return;
      const ln = lineOf(text, bOpen + off);
      const raw = text.slice(bOpen + off, bOpen + off + 120).split('\n')[0].trim();
      const k = name + '|' + how;
      if (!fields.has(k)) fields.set(k, { name, line: ln, how, raw });
    };

    const esc = resp.replace(/\$/g, '\\$');
    // (a) resp.hasOwnProperty("x")
    const reHas = new RegExp('\\b' + esc + '\\.hasOwnProperty\\(\\s*["\']([A-Za-z0-9_$]+)["\']', 'g');
    let mm;
    while ((mm = reHas.exec(body)) !== null) addField(mm[1], mm.index, 'hasOwnProperty');
    // (b) resp.x
    const reDot = new RegExp('\\b' + esc + '\\.([A-Za-z_$][\\w$]*)', 'g');
    while ((mm = reDot.exec(body)) !== null) {
      const name = mm[1];
      if (name === 'hasOwnProperty') continue;
      const rest = body.slice(mm.index + mm[0].length);
      const how = /^\s*\(/.test(rest) ? '方法调用' : '属性读';
      addField(name, mm.index, how);
    }
    // (c) resp["x"]
    const reBr = new RegExp('\\b' + esc + '\\[\\s*["\']([A-Za-z0-9_$]+)["\']\\s*\\]', 'g');
    while ((mm = reBr.exec(body)) !== null) addField(mm[1], mm.index, '下标读');
    // (d) eRet 比较
    const reEret = new RegExp('\\b' + esc + '\\.eRet\\s*[=!]==?\\s*(\\d+)', 'g');
    while ((mm = reEret.exec(body)) !== null) erets.add(mm[1]);

    const list = [...fields.values()].sort((a, b) => a.line - b.line);
    stats.fields += list.length;
    sections.push({
      action, file: f, line: regLine, kind: '内联函数', name: kindOfName,
      handler: '(' + params.join(', ') + ')', bodyStart: bodyStartLine, bodyEnd: bodyEndLine,
      fields: list, erets: [...erets]
    });
  }
}

sections.sort((a, b) => a.action.localeCompare(b.action) || a.file.localeCompare(b.file) || a.line - b.line);

const md = [];
md.push('# M2 客户端读点索引');
md.push('');
md.push('> 数据源：`tools\\index.js`（149,447 行）、`tools\\scripts2.js`（81,775 行）、`tools\\scripts3.js`（100,428 行）。');
md.push('> 生成器：本目录 `_gen_m2_v2.js`（字符串感知的花括号配对 + 回调第二参数定向抽取），可原样重跑。');
md.push('> 抽取口径：只认 `MessageCenter.on(...)` 注册点；字段只认**回调第二参数**（应答对象）上的读取，方法名与内建属性已排除。');
md.push('');
md.push('## 统计');
md.push('');
md.push('- `MessageCenter.on(` 注册总处数：**' + stats.on + '**');
md.push('- 其中内联函数体 **' + stats.inline + '** 处，命名处理器（`this.xxx`）**' + stats.named + '** 处，解析失败 **' + stats.skipped + '** 处');
md.push('- 抽到的应答字段读取条目：**' + stats.fields + '**');
md.push('- 去重后的动作名（事件名 / `HttpConst` 常量名）：**' + new Set(sections.map(s => s.action)).size + '**');
md.push('');
md.push('> 命名处理器形态（`on(EVT, this.onXxx, this)`）的函数体在另一个方法里，本工具**不内联展开**，该形态只记注册位置与处理器名。');
md.push('');

let curAction = null;
for (const s of sections) {
  if (s.action !== curAction) { curAction = s.action; md.push(''); }
  const head = '### ' + s.action + '  [' + s.file + ':' + s.line + ']';
  md.push(head);
  md.push('');
  md.push('- 事件名来源：' + s.name + '｜注册形态：' + s.kind + '｜处理器：`' + s.handler + '`' +
    (s.kind === '内联函数' ? '｜函数体 ' + s.bodyStart + '-' + s.bodyEnd : ''));
  if (s.erets.length) md.push('- `eRet` 判定值：' + s.erets.join(' / '));
  if (!s.fields.length) {
    md.push('- 未抽到应答字段读取' + (s.kind === '命名处理器' ? '（处理器体在别处，未展开）' : ''));
    md.push('');
    continue;
  }
  md.push('');
  md.push('| 字段 | 行号 | 判定方式 | 原文片段 |');
  md.push('| --- | --- | --- | --- |');
  for (const fd of s.fields) {
    md.push('| `' + fd.name + '` | ' + fd.line + ' | ' + fd.how + ' | `' + fd.raw.replace(/\|/g, '\\|').replace(/`/g, "'") + '` |');
  }
  md.push('');
}

fs.writeFileSync(OUT, md.join('\n'), 'utf8');
console.log('on 总处数 =', stats.on);
console.log('内联 =', stats.inline, '| 命名 =', stats.named, '| 失败 =', stats.skipped);
console.log('字段条目 =', stats.fields);
console.log('动作名去重 =', new Set(sections.map(s => s.action)).size);
console.log('输出行数 =', md.length, '| 字节 =', Buffer.byteLength(md.join('\n')));
console.log('输出 =', OUT);
