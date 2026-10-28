'use strict';
/**
 * xxtea.js —— Cocos Creator 2.x 脚本加密用的 XXTEA 实现（public domain 算法）
 * 用途：本地解密 .jsc（只在用户自有设备/自有安装包上使用）
 */
const DELTA = 0x9e3779b9;

function toU32(bytes) {
  const n = bytes.length;
  const words = new Uint32Array(Math.ceil(n / 4));
  for (let i = 0; i < n; i++) words[i >> 2] |= bytes[i] << ((i & 3) * 8);
  return { words, len: n };
}
function fromU32(words, len) {
  const out = Buffer.alloc(words.length * 4);
  for (let i = 0; i < words.length; i++) {
    out[i * 4] = words[i] & 0xff;
    out[i * 4 + 1] = (words[i] >>> 8) & 0xff;
    out[i * 4 + 2] = (words[i] >>> 16) & 0xff;
    out[i * 4 + 3] = (words[i] >>> 24) & 0xff;
  }
  return out.subarray(0, len);
}
function keyWords(key) {
  const kb = Buffer.isBuffer(key) ? key : Buffer.from(String(key), 'utf8');
  const { words } = toU32(kb);
  return { kw: words, klen: kb.length };
}

function mx(sum, y, z, p, e, roundKey) {
  return ((((z >>> 5) ^ (y << 2)) + ((y >>> 3) ^ (z << 4))) ^ ((sum ^ y) + (roundKey[(p & 3) ^ e] ^ z)));
}

function decrypt(data, key) {
  const { words: v, len } = toU32(data);
  const n = v.length - 1;
  if (n < 1) return Buffer.from(data);
  const { kw } = keyWords(key);
  const rounds = 6 + Math.floor(52 / (n + 1));
  let sum = (rounds * DELTA) >>> 0;
  let y = v[0];
  for (let i = rounds; i > 0; i--) {
    const e = (sum >>> 2) & 3;
    let p;
    for (p = n; p > 0; p--) {
      const z = v[p - 1];
      y = v[p] = (v[p] - mx(sum, y, z, p, e, kw)) >>> 0;
    }
    const z = v[n];
    y = v[0] = (v[0] - mx(sum, y, z, 0, e, kw)) >>> 0;
    sum = (sum - DELTA) >>> 0;
  }
  // Cocos 的 padding：解密后最后一个 word 的低字节 = 原始长度
  return fromU32(v, len);
}

function encrypt(data, key) {
  const pad = (-data.length) & 3;
  const { words: v0 } = toU32(Buffer.concat([data, Buffer.alloc(pad)]));
  const v = v0;
  const n = v.length - 1;
  if (n < 1) return Buffer.from(data);
  const { kw } = keyWords(key);
  const rounds = 6 + Math.floor(52 / (n + 1));
  let sum = 0;
  let z = v[n];
  for (let i = 0; i < rounds; i++) {
    sum = (sum + DELTA) >>> 0;
    const e = (sum >>> 2) & 3;
    let p;
    for (p = 0; p < n; p++) {
      const y = v[p + 1];
      z = v[p] = (v[p] + mx(sum, y, z, p, e, kw)) >>> 0;
    }
    const y = v[0];
    z = v[n] = (v[n] + mx(sum, y, z, n, e, kw)) >>> 0;
  }
  return fromU32(v, v.length * 4);
}

/** Cocos Creator 2.x 的 .jsc：前 4 字节是大端长度？各家不一致，这里两种都试 */
function looksLikeScript(buf) {
  if (!buf || buf.length < 8) return false;
  let printable = 0;
  const n = Math.min(buf.length, 4000);
  for (let i = 0; i < n; i++) {
    const b = buf[i];
    if (b === 9 || b === 10 || b === 13 || (b >= 32 && b <= 126) || b > 127) printable++;
  }
  const ratio = printable / n;
  if (ratio < 0.9) return false;
  const s = buf.toString('utf8', 0, Math.min(400, buf.length));
  return /function|var |const |let |window|cc\.|"use strict"|=>/.test(s);
}

module.exports = { encrypt, decrypt, looksLikeScript, DELTA };
