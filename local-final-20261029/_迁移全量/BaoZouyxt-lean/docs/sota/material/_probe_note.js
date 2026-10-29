// R21 只读探针：抽取 note 五子表在客户端三包里的全部出现点（只读，不写任何文件）
// 运行：node docs/sota/material/_probe_note.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const FILES = ['tools/index.js', 'tools/scripts2.js', 'tools/scripts3.js'];
const TOKENS = ['ivch', 'eqch', 'eco', 'skch', 'attrch'];
const Q = String.fromCharCode(34);

function lines(f) {
  return fs.readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/);
}

console.log('=== 1) 五个 token 在各包里的出现行（去重前） ===');
for (const t of TOKENS) {
  let total = 0;
  const per = [];
  for (const f of FILES) {
    const L = lines(f);
    const hit = [];
    L.forEach((ln, i) => {
      if (ln.indexOf(t) >= 0) { hit.push(i + 1); }
    });
    total += hit.length;
    per.push(f.split('/').pop() + '=' + hit.length + (hit.length ? ' [' + hit.slice(0, 20).join(',') + ']' : ''));
  }
  console.log(t.padEnd(7) + ' 合计 ' + String(total).padStart(3) + '  ' + per.join('  '));
}

console.log('');
console.log('=== 2) 三个包里所有“五 token 作为字符串字面量”的行 ===');
for (const f of FILES) {
  const L = lines(f);
  L.forEach((ln, i) => {
    for (const t of TOKENS) {
      if (ln.indexOf(Q + t + Q) >= 0) {
        console.log(f + ':' + (i + 1) + ': ' + ln.trim().slice(0, 230));
        break;
      }
    }
  });
}

console.log('');
console.log('=== 3) MessageCenter.on 注册行中，首参名字含五 token 的 ===');
for (const f of FILES) {
  const L = lines(f);
  L.forEach((ln, i) => {
    if (ln.indexOf('MessageCenter.on(') < 0) return;
    for (const t of TOKENS) {
      if (ln.indexOf(t) >= 0) {
        console.log(f + ':' + (i + 1) + ': ' + ln.trim().slice(0, 230));
        break;
      }
    }
  });
}

console.log('');
console.log('=== 4) note 分发总闸（index.js:59325 上下文 59296-59336） ===');
const idx = lines('tools/index.js');
for (let i = 59296; i <= 59336; i++) console.log(i + ': ' + (idx[i - 1] || '').trim().slice(0, 240));
