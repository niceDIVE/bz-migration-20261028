const fs = require('fs');
const xxtea = require('F:/BaoZouyxt/tools/ccreverse/node_modules/xxtea-node');
const pako = require('F:/BaoZouyxt/tools/ccreverse/node_modules/pako');

const small = fs.readFileSync('F:/BaoZouyxt/tools/settings.jsc');

function score(buf) {
  const n = Math.min(buf.length, 512);
  let p = 0;
  for (let i = 0; i < n; i++) { const b = buf[i]; if (b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127) || b > 127) p++; }
  return n ? p / n : 0;
}

const cands = new Set();
for (const f of ['F:/BaoZouyxt/tools/libcocos2djs.so', 'F:/BaoZouyxt/tools/libEncryptorP.so']) {
  const s = fs.readFileSync(f).toString('latin1');
  const re = /[\x20-\x7e]{8,64}/g;
  let m;
  while ((m = re.exec(s)) !== null) cands.add(m[0]);
}
console.log('candidates:', cands.size);

const hits = [];
for (const k of cands) {
  let out;
  try { out = xxtea.decrypt(small, xxtea.toBytes(k)); } catch (e) { continue; }
  if (!out || out.length < 20) continue;
  let b = Buffer.from(out);
  if (b.length > 2 && b[0] === 0x1f && b[1] === 0x8b) { try { b = Buffer.from(pako.inflate(b)); } catch (e) {} }
  if (score(b) >= 0.9) hits.push({ k, head: b.toString('utf8', 0, 100).replace(/\n/g, ' ') });
}
console.log('hits:', hits.length);
for (const h of hits.slice(0, 10)) console.log(JSON.stringify(h));
