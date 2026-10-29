'use strict';
/** decrypt-all.js —— 批量解密 captures 目录，输出明文到 decrypted/ */
const fs = require('fs');
const path = require('path');
const { ProtocolCodec } = require(path.join(__dirname, '..', 'gateway', 'src', 'codec.js'));

const codec = new ProtocolCodec({}); // aes-256-cbc, Key UTF-8（已实测验证）
const srcDir = path.join(__dirname, 'captures', 'bz_capture');
const outDir = path.join(__dirname, 'decrypted');
fs.mkdirSync(outDir, { recursive: true });

const summary = [];
for (const f of fs.readdirSync(srcDir).sort()) {
  const raw = fs.readFileSync(path.join(srcDir, f), 'utf8');
  const nl = raw.indexOf('\n');
  const head = nl >= 0 ? raw.slice(0, nl) : raw;
  let body = nl >= 0 ? raw.slice(nl + 1) : '';
  let label = f.replace(/\.txt$/, '').replace(/^\d+_/, '');
  let out = '';
  try {
    const env = JSON.parse(body);
    if (env && env.MsgData) { body = env.MsgData; label += ` [envelope code=${env.code}]`; }
  } catch (_) { /* 裸 hex */ }
  if (/^[0-9a-fA-F]+$/.test(body.trim()) && body.length >= 32) {
    try {
      out = codec.decode(body);
    } catch (e) { out = '<<DECRYPT FAIL: ' + e.message + '>>'; }
  } else {
    out = body; // 明文（公告/注册）
  }
  const outFile = path.join(outDir, f.replace(/\.txt$/, '.json.txt'));
  fs.writeFileSync(outFile, head + '\n' + out, 'utf8');
  summary.push(head.slice(0, 90) + '  →  ' + out.replace(/\s+/g, ' ').slice(0, 110));
}
console.log(summary.join('\n'));
