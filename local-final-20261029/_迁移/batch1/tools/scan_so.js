const fs = require('fs');
const buf = fs.readFileSync(process.argv[2]);
const s = buf.toString('latin1');
const hits = [];
const re = /[\x20-\x7e]{5,200}/g;
let m;
while ((m = re.exec(s)) !== null) {
  const t = m[0];
  if (/xxtea|XXTEA|jsc|JsDecrypt|decrypt|Encryptor/i.test(t)) hits.push({ off: m.index, t });
}
console.log('total strings matched:', hits.length);
const uniq = new Map();
for (const h of hits) if (!uniq.has(h.t)) uniq.set(h.t, h.off);
const arr = [...uniq.entries()].slice(0, 120);
for (const [t, off] of arr) console.log('0x' + off.toString(16) + '  ' + t.slice(0, 160));
