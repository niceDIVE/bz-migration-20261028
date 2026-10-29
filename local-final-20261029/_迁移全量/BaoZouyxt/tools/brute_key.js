const fs = require('fs');
const path = require('path');
const xxtea = require('F:/BaoZouyxt/tools/ccreverse/node_modules/xxtea-node');

const targets = [
  'F:/BaoZouyxt/tools/libcocos2djs.so',
];
const jsc = fs.readFileSync('F:/BaoZouyxt/hotfix-patch/probe/index.jsc'); // 950KB 主包
const small = jsc;

function looksText(buf) {
  const n = Math.min(buf.length, 512);
  let p = 0;
  for (let i = 0; i < n; i++) { const b = buf[i]; if (b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127)) p++; }
  return p / n >= 0.85;
}

// 从 .so 提取候选字符串（长度 8..64）
const cands = new Set();
for (const f of targets) {
  const s = fs.readFileSync(f).toString('latin1');
  const re = /[\x20-\x7e]{8,64}/g;
  let m;
  while ((m = re.exec(s)) !== null) cands.add(m[0]);
}
console.log('candidates:', cands.size);

let hit = null, tried = 0;
for (const k of cands) {
  tried++;
  try {
    const out = xxtea.decrypt(small, xxtea.toBytes(k));
    if (out && out.length > 100) {
      const b = Buffer.from(out);
      if (looksText(b)) { hit = { k, head: b.toString('utf8', 0, 120) }; break; }
    }
  } catch (e) {}
}
console.log('tried:', tried, 'hit:', hit ? JSON.stringify(hit) : 'none');
