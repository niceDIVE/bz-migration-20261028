'use strict';
/**
 * grep_src.js —— 在客户端明文源码里按字符串/正则找行（避免 PowerShell 引号地狱）
 *
 * 用法：
 *   node tools/grep_src.js "User.useItem"                # 普通包含匹配，最多 12 行
 *   node tools/grep_src.js "/prototype\\.parseEq\\s*=/" --regex --max 6
 *   node tools/grep_src.js "PlayerEquip" --max 4 --width 200
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const pat = args[0];
if (!pat) {
  console.log('用法: node tools/grep_src.js "<pattern>" [--regex] [--max N] [--width N]');
  process.exit(1);
}
const flag = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const isRegex = args.includes('--regex');
const max = parseInt(flag('--max', '12'), 10);
const width = parseInt(flag('--width', '190'), 10);
const file = flag('--file', path.join(__dirname, 'index.js'));

const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
let re = null;
if (isRegex) re = new RegExp(pat);

let n = 0;
for (let i = 0; i < lines.length; i++) {
  const hit = re ? re.test(lines[i]) : lines[i].indexOf(pat) >= 0;
  if (!hit) continue;
  const t = lines[i].trim();
  console.log((i + 1) + ': ' + (t.length > width ? t.slice(0, width) + '…' : t));
  if (++n >= max) break;
}
if (!n) console.log('(no match) ' + pat);
