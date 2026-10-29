'use strict';
/**
 * extract_fields.js —— 从 spec3 切片里确定性地抽出「响应字段」与「请求参数」
 * 响应字段只认处理函数形参（function(e,o) 的 e/o；function(t,e) 的 t/e）上的访问，
 * 避免把模块引用（p.xxx / r.xxx）误当成字段。
 * 输出：tools/action_facts3.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'F:/BaoZouyxt/tools';
const dir = path.join(ROOT, 'spec3');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.txt')).sort();
const out = {};

for (const f of files) {
  const lines = fs.readFileSync(path.join(dir, f), 'utf8').split('\n');
  const action = (lines[0] || '').replace(/^#\s*/, '').split('(')[0].trim();
  const entry = { file: f, handlers: [], request_params: [], response_fields: [], evidence: [] };
  let inHandler = false;
  let params = [];

  for (const ln of lines) {
    const head = ln.match(/^##\s*处理函数\s+(\w+)\s*\((\d+)-(\d+)\)/);
    if (head) {
      inHandler = true;
      entry.handlers.push({ name: head[1], from: +head[2], to: +head[3] });
      params = [];
      continue;
    }
    if (/^##\s*/.test(ln)) { inHandler = false; continue; }

    const m = ln.match(/^\s*(\d+):\s*(.*)$/);
    if (!m) continue;
    const no = m[1];
    const body = m[2];

    if (!inHandler) {
      const pm = body.match(/([A-Za-z_]\w*)\s*:/g) || [];
      for (const x of pm) {
        const key = x.replace(/\s*:$/, '');
        if (!entry.request_params.includes(key)) entry.request_params.push(key);
      }
      continue;
    }

    // 处理函数第一行拿形参名
    if (!params.length) {
      const sig = body.match(/function\s*\(([^)]*)\)/);
      if (sig) params = sig[1].split(',').map((s) => s.trim()).filter(Boolean);
      if (!params.length) params = ['e', 'o'];
      continue;
    }

    for (const p of params) {
      const re = new RegExp('\\b' + p + '\\.([A-Za-z_]\\w*)', 'g');
      let mm;
      while ((mm = re.exec(body)) !== null) {
        const field = mm[1];
        if (['prototype', 'call', 'apply', 'bind', 'length', 'name'].includes(field)) continue;
        if (!entry.response_fields.includes(field)) {
          entry.response_fields.push(field);
          entry.evidence.push(no + ': ' + body.trim().slice(0, 160));
        }
      }
    }
  }
  entry.response_fields.sort();
  out[action] = entry;
}

fs.writeFileSync(path.join(ROOT, 'action_facts3.json'), JSON.stringify(out, null, 1));
const keys = Object.keys(out);
console.log('actions:', keys.length);
const rich = keys.filter((k) => out[k].response_fields.length >= 3);
console.log('含>=3 响应字段:', rich.length);
for (const k of rich.slice(0, 12)) {
  console.log(' ', k, '→', out[k].response_fields.join(','));
}
