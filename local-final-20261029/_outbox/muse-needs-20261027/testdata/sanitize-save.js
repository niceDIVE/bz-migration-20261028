'use strict';
/* sanitize-save.js —— 把真实本地存档脱敏成可分发的示例存档。
 * 用法：node sanitize-save.js <输入存档.json> <输出.json>
 * 只替换「可识别到人/账号」的字段，其余数值一律原样保留（保持可复现的测试基线）。
 * 规则（逐条对应 replace 列表，改规则请同步改 docs\01-依赖与自检说明.md）：
 *   roleID            → 10001
 *   name              → 示例玩家
 *   baseValueAy[0]    → 0000000000000   （原值是账号/平台 id）
 *   marryObj.childObj.childName → 示例子女
 * 其余 token / openid / phone 类键若存在，一律置空字符串并打印告警。
 */
const fs = require('fs');

const inPath = process.argv[2];
const outPath = process.argv[3];
if (!inPath || !outPath) {
  console.error('用法: node sanitize-save.js <in.json> <out.json>');
  process.exit(2);
}

const raw = fs.readFileSync(inPath, 'utf8');
const src = JSON.parse(raw);

const hits = [];
function set(path, from, to) {
  const cur = get(path);
  if (cur === undefined) { console.log('[skip] 路径不存在: ' + path); return; }
  if (from !== null && cur !== from) { console.log('[warn] ' + path + ' 原值不是预期 "' + from + '"，实际 "' + cur + '"，仍然替换');  hits.push(path); }
  put(path, to);
  console.log('[ok]   ' + path + ' -> ' + JSON.stringify(to));
}
function get(path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), src);
}
function put(path, v) {
  const ks = path.split('.');
  const last = ks.pop();
  const obj = ks.reduce((o, k) => (o == null ? undefined : o[k]), src);
  if (obj) obj[last] = v;
}

set('roleID', 16374, 10001);
set('name', 'FZhou', '示例玩家');
set('baseValueAy.0', '9900012358565', '0000000000000');
set('baseValueAy.1', 'FZhou', '示例玩家');
set('marryObj.childObj.childName', '小狗蛋', '示例子女');

// 任何看起来像凭证的键，一律清空
const SENSITIVE = /^(token|openid|openId|session|sid|phone|mobile|account|accountId|uid|unionid|cookie|sign|secret)$/i;
(function walk(o, prefix) {
  if (!o || typeof o !== 'object') return;
  for (const k of Object.keys(o)) {
    const v = o[k];
    const p = prefix ? prefix + '.' + k : k;
    if (SENSITIVE.test(k) && typeof v === 'string' && v !== '') {
      o[k] = '';
      console.log('[ok]   ' + p + ' -> ""（疑似凭证键，清空）');
    } else if (v && typeof v === 'object') {
      walk(v, p);
    }
  }
})(src, '');

fs.writeFileSync(outPath, JSON.stringify(src), 'utf8');
console.log('写入 ' + outPath + '（' + Buffer.byteLength(JSON.stringify(src)) + ' B）');
