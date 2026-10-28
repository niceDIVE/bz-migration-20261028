const fs = require('fs');
const a = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const b = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const out = [];
function walk(x, y, p) {
  if (x === y) return;
  const tx = typeof x, ty = typeof y;
  if (tx !== ty) { out.push(`${p}: type ${tx} -> ${ty}`); return; }
  if (x && y && tx === 'object') {
    const ka = Object.keys(x), kb = Object.keys(y);
    for (const k of ka) if (!(k in y)) out.push(`${p}.${k}: removed`);
    for (const k of kb) if (!(k in x)) out.push(`${p}.${k}: added = ${JSON.stringify(y[k]).slice(0, 60)}`);
    for (const k of ka) if (k in y) walk(x[k], y[k], `${p}.${k}`);
    return;
  }
  out.push(`${p}: ${JSON.stringify(x)} -> ${JSON.stringify(y)}`);
}
walk(a, b, '$');
console.log('saveVersionA=' + a.saveVersion + ' roleID=' + a.roleID + ' name=' + a.name);
console.log('diffCount=' + out.length);
console.log(out.slice(0, 40).join('\n'));
