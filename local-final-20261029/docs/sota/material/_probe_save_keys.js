// R21 只读探针：抽取 bz-rpc-server.js 里的 s.* 存档键及其写入/读取行（只读）
// 运行：node docs/sota/material/_probe_save_keys.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const FILE = path.join(ROOT, 'hotfix-patch', 'core', 'bz-rpc-server.js');

const lines = fs.readFileSync(FILE, 'utf8').split(/\r?\n/);
const map = new Map();

lines.forEach((ln, i) => {
  const n = i + 1;
  const re = /\bs\.([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(ln)) !== null) {
    const k = m[1];
    if (!map.has(k)) map.set(k, { w: [], r: [] });
    const after = ln.slice(m.index + m[0].length);
    const rec = map.get(k);
    if (/^\s*(\[[^\]]*\])?\s*=(?!=)/.test(after) || /^\s*(\[[^\]]*\])?\s*\+=/.test(after)) rec.w.push(n);
    else rec.r.push(n);
  }
});

const keys = [...map.keys()].sort();
console.log('distinct s.* keys = ' + keys.length + '  (file=' + FILE + ')');
for (const k of keys) {
  const v = map.get(k);
  console.log(
    k.padEnd(14) +
    ' w=' + (v.w.length ? v.w.join(',') : '-').padEnd(28) +
    ' r=' + (v.r.length ? v.r.slice(0, 12).join(',') : '-')
  );
}

console.log('');
console.log('--- 每键首条写入/读取的原文 ---');
for (const k of keys) {
  const v = map.get(k);
  const first = (v.w[0] || v.r[0]);
  if (first) console.log(k.padEnd(14) + ' L' + first + ': ' + (lines[first - 1] || '').trim().slice(0, 180));
}
