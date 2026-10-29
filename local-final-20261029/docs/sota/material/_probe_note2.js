// R21 只读探针 2：note 五子表的 EvName 消费点与 rogue 分发器上下文（只读）
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const FILES = ['tools/index.js', 'tools/scripts2.js', 'tools/scripts3.js'];
const EVNAMES = ['INVENTORY_CHNG', 'ECONOMY_CHNG', 'ATTR_CHANGE', 'EQ_CHNG', 'SKILL_CHANGE'];

function lines(f) { return fs.readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/); }
function show(f, a, b) {
  const L = lines(f);
  console.log('----- ' + f + ' ' + a + '-' + b);
  for (let i = a; i <= b; i++) console.log(i + ': ' + (L[i - 1] || '').trim().slice(0, 260));
}

console.log('=== A) EvName 五个常量的全部引用点 ===');
for (const name of EVNAMES) {
  for (const f of FILES) {
    const L = lines(f);
    L.forEach((ln, i) => {
      if (ln.indexOf(name) >= 0) console.log(name + ' | ' + f + ':' + (i + 1) + ': ' + ln.trim().slice(0, 220));
    });
  }
  console.log('');
}

console.log('=== B) scripts3 rogue 分发器上下文 73870-73898 ===');
show('tools/scripts3.js', 73870, 73898);

console.log('=== C) scripts3 23560-23585 ===');
show('tools/scripts3.js', 23560, 23585);

console.log('=== D) scripts3 72038-72060 ===');
show('tools/scripts3.js', 72038, 72060);

console.log('=== E) index.js 138885-138898 ===');
show('tools/index.js', 138885, 138898);
