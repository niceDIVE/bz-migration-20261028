const fs = require('fs');
const g = JSON.parse(fs.readFileSync('F:/BaoZouyxt/tools/spec3_batches.json', 'utf8'));
const pay = /Pay|PAY|Order|Recharge|Charge|aliPay|wxPay|h5Pay/i;
const filtered = g.map(b => b.filter(f => !pay.test(f)));
console.log(JSON.stringify(filtered));
console.log('counts:', filtered.map(b => b.length).join(','));
fs.writeFileSync('F:/BaoZouyxt/tools/spec3_batches.json', JSON.stringify(filtered));
