'use strict';
/**
 * decrypt_bundles.js —— 用同一个 XXTEA 密钥解密客户端其它 bundle 的 index.jsc
 *
 * 背景：`assets/scripts/index.jsc` 已经解出（tools/index.js），但 UI/模型还有一部分在
 *       `scripts2` / `scripts3` 里。密钥相同（Cocos Creator 2.x 原生加密）。
 *
 * 用法： node tools/decrypt_bundles.js            # 解 scripts2 + scripts3
 *        node tools/decrypt_bundles.js scripts4   # 解指定 bundle
 *
 * 输入： hotfix-patch/probe/<bundle>.jsc（由 adb pull 下来）
 * 输出： tools/<bundle>.js
 */

const fs = require('fs');
const path = require('path');
const xxtea = require(path.join(__dirname, 'ccreverse', 'node_modules', 'xxtea-node'));
const pako = require(path.join(__dirname, 'ccreverse', 'node_modules', 'pako'));

const KEY = '7ca36578-7b3a-4c';
const ROOT = path.resolve(__dirname, '..');

const bundles = process.argv.slice(2).filter(a => !a.startsWith('-'));
if (!bundles.length) { bundles.push('scripts2', 'scripts3'); }

for (const b of bundles) {
  const src = path.join(ROOT, 'hotfix-patch', 'probe', b + '.jsc');
  const dst = path.join(ROOT, 'tools', b + '.js');
  if (!fs.existsSync(src)) { console.log(b + ': 缺 ' + src); continue; }
  const buf = fs.readFileSync(src);
  let out = xxtea.decrypt(buf, xxtea.toBytes(KEY));
  if (!out) { console.log(b + ': 解密失败（密钥不对或已损坏）'); continue; }
  let bytes = Buffer.from(out);
  let gz = false;
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) { bytes = Buffer.from(pako.inflate(bytes)); gz = true; }
  fs.writeFileSync(dst, bytes);
  const text = bytes.toString('utf8');
  console.log(b + ': cipher=' + buf.length + ' -> plain=' + bytes.length + (gz ? ' (gzip)' : '') +
    ' lines=' + text.split('\n').length + ' -> ' + path.relative(ROOT, dst));
}
