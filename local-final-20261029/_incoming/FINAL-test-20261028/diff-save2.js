const fs = require('fs');
const a = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const b = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const groups = {};
function walk(x, y, p) {
  if (x === y) return;
  const tx = typeof x, ty = typeof y;
  if (tx !== ty) { add(p, `${tx}->${ty}`); return; }
  if (x && y && tx === 'object') {
    const ka = Object.keys(x), kb = Object.keys(y);
    for (const k of ka) if (!(k in y)) add(p + '.' + k, 'removed');
    for (const k of kb) if (!(k in x)) add(p + '.' + k, 'added');
    for (const k of ka) if (k in y) walk(x[k], y[k], `${p}.${k}`);
    return;
  }
  add(p, JSON.stringify(x) + '->' + JSON.stringify(y));
}
function add(p, d) {
  const seg = p.split('.').slice(0, 3).join('.');
  groups[seg] = groups[seg] || { n: 0, samples: [] };
  groups[seg].n++;
  if (groups[seg].samples.length < 3) groups[seg].samples.push(p + ' : ' + d);
}
walk(a, b, '$');
console.log('groups=' + Object.keys(groups).length);
for (const k of Object.keys(groups)) {
  console.log(`[${groups[k].n}] ${k}  e.g. ${groups[k].samples.join(' | ')}`);
}
console.log('--- wallet ---');
console.log(JSON.stringify({ coinsA: a.coins, coinsB: b.coins, goldA: a.gold, goldB: b.gold, ybA: a.yuanbao, ybB: b.yuanbao }));
console.log('--- bag equal ---', JSON.stringify(a.bag) === JSON.stringify(b.bag), 'bagKeysA=' + Object.keys(a.bag || {}).length, 'bagKeysB=' + Object.keys(b.bag || {}).length);
console.log('--- equip equal ---', JSON.stringify(a.playerEquip) === JSON.stringify(b.playerEquip));
console.log('--- potential ---', a.potential, b.potential);
