const fs = require('fs');
const files = fs.readdirSync('F:/BaoZouyxt/tools/spec2').filter(f => f.endsWith('.txt')).sort();
const groups = [[], [], [], [], []];
files.forEach((f, i) => groups[i % 5].push(f));
fs.writeFileSync('F:/BaoZouyxt/tools/spec_batches.json', JSON.stringify(groups, null, 1));
console.log(JSON.stringify(groups.map(g => g.length)));
console.log(groups.map((g, i) => 'G' + i + ': ' + g.slice(0, 3).join(', ')).join('\n'));
