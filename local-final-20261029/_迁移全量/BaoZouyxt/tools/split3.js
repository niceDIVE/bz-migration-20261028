const fs = require('fs');
const old = new Set(fs.readdirSync('F:/BaoZouyxt/tools/spec2'));
const all = fs.readdirSync('F:/BaoZouyxt/tools/spec3').filter(f => f.endsWith('.txt'));
const fresh = all.filter(f => !old.has(f)).sort();
const groups = [[], [], [], [], []];
fresh.forEach((f, i) => groups[i % 5].push(f));
fs.writeFileSync('F:/BaoZouyxt/tools/spec3_batches.json', JSON.stringify(groups));
console.log(JSON.stringify(groups));
