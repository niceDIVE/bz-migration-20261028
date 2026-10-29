const fs = require('fs');
const xxtea = require('F:/BaoZouyxt/tools/ccreverse/node_modules/xxtea-node');
const pako = require('F:/BaoZouyxt/tools/ccreverse/node_modules/pako');
const KEY = '7ca36578-7b3a-4c';
const jsc = fs.readFileSync('F:/BaoZouyxt/hotfix-patch/probe/index.jsc');
console.log('cipher bytes:', jsc.length);
let out = xxtea.decrypt(jsc, xxtea.toBytes(KEY));
console.log('plain bytes:', out ? out.length : 0);
if (!out) process.exit(2);
let b = Buffer.from(out);
if (b[0] === 0x1f && b[1] === 0x8b) { console.log('gzip'); b = Buffer.from(pako.inflate(b)); }
const s = b.toString('utf8');
fs.writeFileSync('F:/BaoZouyxt/tools/index.js', b);
console.log('saved index.js bytes:', b.length, 'lines:', s.split('\n').length);
console.log('has loadGame:', s.includes('loadGame'), '| has User.LoadGame:', s.includes('User.LoadGame'));
console.log('head:', s.slice(0, 200).replace(/\n/g, ' '));
