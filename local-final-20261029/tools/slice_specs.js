const fs = require('fs'), path = require('path');
const src = fs.readFileSync('F:/BaoZouyxt/tools/index.js', 'utf8');
const lines = src.split('\n');
const actions = JSON.parse(fs.readFileSync('F:/BaoZouyxt/tools/actions.json', 'utf8'));

const outDir = 'F:/BaoZouyxt/tools/spec';
fs.mkdirSync(outDir, { recursive: true });

// 每个 HttpConst 常量名 -> 出现行号
const occurrences = {};
lines.forEach((ln, i) => {
  const m = ln.match(/HttpConst\.([A-Z][A-Z0-9_]+)/g);
  if (!m) return;
  for (const h of m) {
    const key = h.split('.')[1];
    (occurrences[key] = occurrences[key] || []).push(i);
  }
});

let written = 0, totalLines = 0;
for (const [constName, action] of Object.entries(actions.httpConst)) {
  const occ = occurrences[constName] || [];
  if (!occ.length) continue;
  const parts = [`# ${action}  (HttpConst.${constName})`, `# 出现 ${occ.length} 处`, ''];
  const seen = new Set();
  for (const ln of occ.slice(0, 6)) {
    const from = Math.max(0, ln - 6), to = Math.min(lines.length - 1, ln + 40);
    for (let i = from; i <= to; i++) {
      if (seen.has(i)) continue;
      seen.add(i);
      parts.push(String(i + 1).padStart(6) + ': ' + lines[i]);
    }
    parts.push('---');
  }
  const file = path.join(outDir, action.replace(/[^\w.]/g, '_') + '.txt');
  const text = parts.join('\n');
  fs.writeFileSync(file, text, 'utf8');
  written++; totalLines += parts.length;
}
console.log('spec files:', written, 'total lines:', totalLines);
