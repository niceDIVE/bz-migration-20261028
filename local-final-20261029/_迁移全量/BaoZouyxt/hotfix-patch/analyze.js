'use strict';
/**
 * analyze.js —— 解密探针抓到的游戏报文，验证编解码管线
 * 用法: node analyze.js  （读取 probe-full.log）
 */
const fs = require('fs');
const path = require('path');
const { ProtocolCodec } = require(path.join(__dirname, '..', 'gateway', 'src', 'codec.js'));

const log = fs.readFileSync(path.join(__dirname, 'probe-full.log'), 'utf8').replace(/^\uFEFF/, '');

// 行格式: [BZ-OFFLINE] XHR POST http://... body{[1/1] <hex>}   /   XHR-RESP ... body{[1/1] {"MsgData":"<hex>"}}
const reqs = [];
const resps = [];
for (const line of log.split(/\r?\n/)) {
  const t = line.trim();
  if (!t.includes('BZ-OFFLINE] XHR')) continue;
  let kind, url, body;
  let m = t.match(/BZ-OFFLINE\] XHR-RESP (\S+) status=(\d+) body\{(?:\[\d+\/\d+\] )?([\s\S]*)$/);
  if (m) { kind = 'XHR-RESP'; url = m[1]; body = m[3]; }
  else {
    m = t.match(/BZ-OFFLINE\] XHR (\S+) (\S+) body\{(?:\[\d+\/\d+\] )?([\s\S]*)\}/);
    if (m) { kind = 'XHR'; url = m[2]; body = m[3]; }
  }
  if (!m) { console.log('未匹配行: ' + t.slice(0, 100)); continue; }
  if (kind === 'XHR') reqs.push({ url, body });
  else resps.push({ url, body });
}

const codecs = {
  'aes-256-cbc (Key按UTF-8)': new ProtocolCodec({}),
  'aes-128-cbc (Key按hex解码)': new ProtocolCodec({ keyEncoding: 'hex' }),
};

function tryDecode(label, hex) {
  for (const [name, codec] of Object.entries(codecs)) {
    try {
      const plain = codec.decode(hex.trim());
      console.log(`  ✅ ${label} 用 ${name} 解密成功:\n  ${plain.slice(0, 600)}`);
      return { codec, plain };
    } catch (e) {
      console.log(`  ❌ ${label} 用 ${name}: ${String(e.message).slice(0, 80)}`);
    }
  }
  return null;
}

let hit = 0;
for (const r of [...reqs, ...resps]) {
  console.log(`\n=== ${r.url.slice(0, 70)}`);
  let hex = r.body;
  // 响应是 {"MsgData":"<hex>"} 信封
  try {
    const j = JSON.parse(hex);
    if (j.MsgData) { hex = j.MsgData; console.log('  响应信封 code=' + j.code + ' MsgData(hex)=' + hex.length + ' 字符'); }
  } catch (_) { /* 请求体是裸 hex */ }
  if (!/^[0-9a-fA-F]+$/.test(hex.trim()) || hex.length < 32) { console.log('  非 hex，跳过: ' + hex.slice(0, 40)); continue; }
  const res = tryDecode('报文', hex);
  if (res) hit++;
}

console.log(`\n解密成功 ${hit}/${reqs.length + resps.length} 条`);
