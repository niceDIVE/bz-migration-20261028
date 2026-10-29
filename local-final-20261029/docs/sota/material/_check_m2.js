// 只读核查：MessageCenter.on 注册形态分布 + 抽样核对 M2 抽取正确性
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..');
const FILES = ['tools/index.js', 'tools/scripts2.js', 'tools/scripts3.js'];

function read(f) { return fs.readFileSync(path.join(ROOT, f), 'utf8'); }

console.log('=== 1) 注册形态分布（on( 之后 300 字符内出现 function / this. / 箭头） ===');
let tot = 0, inline = 0, named = 0, other = 0;
for (const f of FILES) {
  const t = read(f);
  let i = 0, cInline = 0, cNamed = 0, cOther = 0;
  while ((i = t.indexOf('MessageCenter.on(', i)) >= 0) {
    const seg = t.slice(i, i + 300);
    if (seg.indexOf('function') >= 0) cInline++;
    else if (/this\.[A-Za-z_$]/.test(seg)) cNamed++;
    else cOther++;
    i += 10;
  }
  console.log(f.padEnd(20), 'inline函数', String(cInline).padStart(4), ' this.命名处理器', String(cNamed).padStart(4), ' 其它', String(cOther).padStart(3));
  inline += cInline; named += cNamed; other += cOther; tot += cInline + cNamed + cOther;
}
console.log('合计', tot, '| inline', inline, '| named', named, '| other', other);

console.log('');
console.log('=== 2) 抽样：USE_ITEM 在 index.js:64754 的真实函数体字段 ===');
const idx = read('tools/index.js').split(/\r?\n/);
for (let n = 64754; n <= 64762; n++) console.log(n + ': ' + idx[n - 1].trim().slice(0, 200));

console.log('');
console.log('=== 3) M2 里 USE_ITEM 那一节写了什么 ===');
const m2 = read('docs/sota/material/M2-客户端读点索引.md').split(/\r?\n/);
const start = m2.findIndex(l => /^### .*USE_ITEM/.test(l));
if (start < 0) console.log('未找到 USE_ITEM 节');
else {
  let end = start + 1;
  while (end < m2.length && !/^### /.test(m2[end])) end++;
  console.log('节行数 =', end - start);
  console.log(m2.slice(start, Math.min(start + 18, end)).join('\n'));
}

console.log('');
console.log('=== 4) 抽样：命名处理器形态在 M2 里怎么写的（取 scripts2 一节） ===');
const s2 = m2.findIndex(l => /\[tools\/scripts2\.js:/.test(l));
console.log(s2 >= 0 ? m2.slice(s2, s2 + 8).join('\n') : '未找到 scripts2 节');
