'use strict';
/**
 * extract_all.js —— 一次性把全部动作的「请求参数 / 响应字段」抽出来（812 个）
 *   输入：tools/index.js（客户端明文）、tools/actions.json（HttpConst 映射）
 *   输出：tools/action_facts_all.json
 * 方法：对每个动作，找 HttpConst.<CONST> 的出现处 →
 *       a) 注册点 MessageCenter.on(...HttpConst.X, this.handler) → 定位 handler 函数体
 *       b) 请求点 sendReq*(...HttpConst.X, params) → 抄 params 的键名
 *   响应字段只认 handler 形参上的属性访问（避免把模块引用当成字段）。
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'F:/BaoZouyxt/tools';
const lines = fs.readFileSync(path.join(ROOT, 'index.js'), 'utf8').split('\n');
const acts = JSON.parse(fs.readFileSync(path.join(ROOT, 'actions.json'), 'utf8'));

// 1) 索引所有 prototype.NAME = function 的起始行
const handlerStart = new Map();
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/prototype\.(\w+)\s*=\s*function/);
  if (m && !handlerStart.has(m[1])) handlerStart.set(m[1], i);
}

function bodyRange(start) {
  let end = start;
  for (let j = start + 1; j < Math.min(lines.length, start + 400); j++) {
    if (/^\s{0,4}\};?\s*$/.test(lines[j])) return { start, end: j };
    end = j;
  }
  return { start, end };
}

// 2) 常量出现行
const constLines = new Map();
lines.forEach((ln, i) => {
  const m = ln.match(/HttpConst\.([A-Z][A-Z0-9_]+)/g) || [];
  for (const h of m) {
    const key = h.split('.')[1];
    if (!constLines.has(key)) constLines.set(key, []);
    constLines.get(key).push(i);
  }
});

const out = {};
let withHandler = 0, withFields = 0;

for (const constName of Object.keys(acts.httpConst)) {
  const action = acts.httpConst[constName];
  const occ = constLines.get(constName) || [];
  const regRe = new RegExp('MessageCenter\\.on\\([^,]*HttpConst\\.' + constName + ',\\s*([\\w.]+)');
  const handlers = new Set();
  const params = new Set();

  for (const ln of occ) {
    const line = lines[ln];
    const reg = line.match(regRe);
    if (reg) {
      const name = reg[1].split('.').pop();
      if (name && name !== 'function') handlers.add(name);
    } else if (/sendReq/i.test(line)) {
      // 请求对象通常在上一行或当行构造：{ a: 1, b: 2 }
      for (let k = Math.max(0, ln - 10); k <= ln; k++) {
        const seg = lines[k];
        const pm = seg.match(/([A-Za-z_]\w*)\s*:\s*[^,\r\n}]+/g) || [];
        if (/\{/.test(seg) || k === ln) for (const p of pm) params.add(p.split(':')[0].trim());
      }
    }
  }

  const fields = new Map(); // field -> 行号
  for (const h of handlers) {
    const s = handlerStart.get(h);
    if (s === undefined) continue;
    const r = bodyRange(s);
    let paramNames = [];
    const sig = lines[s].match(/function\s*\(([^)]*)\)/);
    if (sig) paramNames = sig[1].split(',').map((x) => x.trim()).filter(Boolean);
    if (!paramNames.length) paramNames = ['e', 'o'];
    withHandler++;
    for (let i = r.start; i <= r.end; i++) {
      for (const p of paramNames) {
        const re = new RegExp('\\b' + p + '\\.([A-Za-z_]\\w*)', 'g');
        let mm;
        while ((mm = re.exec(lines[i])) !== null) {
          const f = mm[1];
          if (['prototype', 'call', 'apply', 'bind', 'length', 'name', 'hasOwnProperty'].includes(f)) continue;
          if (!fields.has(f)) fields.set(f, i + 1);
        }
      }
    }
  }

  const fieldList = [...fields.keys()].sort();
  if (fieldList.length) withFields++;
  out[action] = {
    const: constName,
    handlers: [...handlers],
    request_params: [...params].sort(),
    response_fields: fieldList,
    field_lines: Object.fromEntries([...fields.entries()]),
    occurrences: occ.length,
  };
}

fs.writeFileSync(path.join(ROOT, 'action_facts_all.json'), JSON.stringify(out, null, 1));
const total = Object.keys(out).length;
const need = Object.keys(out).filter((k) => out[k].response_fields.length > 0);
console.log('动作总数:', total);
console.log('有注册处理函数:', withHandler, '（含字段读取的:', withFields, '）');
console.log('需要写形状(有字段读取):', need.length, '| 只需 ACK:', total - need.length);
console.log('样例:');
for (const k of need.slice(0, 6)) console.log('  ' + k + ' → ' + out[k].response_fields.join(','));
