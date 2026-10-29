'use strict';
/**
 * ProtocolCodec —— 线协议编解码（依据 ../TECH.md §2.1 的静态逆向结论）
 *
 * 管线（上行/下行互为逆）：
 *   JSON 明文 <-> LZString.compressToBase64 <-> AES-CBC <-> Hex 字符串
 *   响应信封：{"code": 200, "MsgData": "<Hex 密文>"}
 *
 * ⚠ 两条已知歧义，须用真机抓包样本对撞后定稿（见 README）：
 * 1) Key="120734aa834dea925ca8d2e1bb6811c3" 按 UTF-8 使用时是 32 字节，
 *    实际对应 AES-256-CBC，与文档标注的 "AES-128" 矛盾。
 *    本实现按 Key 实际字节数自动选算法；如对撞失败可改 keyEncoding:'hex'
 *    （Key 先 hex 解码为 16 字节 → AES-128-CBC）。
 * 2) 签名拼接存在"仅拼值 / 键值交错"两种读法，默认按文档字面：
 *    参数键升序 → 依序拼接对应值 → 附加 Salt → MD5 小写。
 */

const crypto = require('crypto');
const LZString = require('lz-string');

const DEFAULTS = {
  key: '120734aa834dea925ca8d2e1bb6811c3',
  iv: '33daee8409834c00',
  salt: 'd393805c9fea36662befb6282aa7331c',
  keyEncoding: 'utf8', // 'utf8' | 'hex'
};

class ProtocolCodec {
  constructor(options = {}) {
    const o = { ...DEFAULTS, ...options };
    this.salt = o.salt;
    this.keyBuf =
      o.keyEncoding === 'hex' ? Buffer.from(o.key, 'hex') : Buffer.from(o.key, 'utf8');
    this.ivBuf = Buffer.from(o.iv, 'utf8');
    if (this.ivBuf.length !== 16) {
      throw new Error(`IV 必须 16 字节，实际 ${this.ivBuf.length}`);
    }
    // 按密钥字节数选择算法（16→aes-128-cbc，32→aes-256-cbc）
    this.algorithm = `aes-${this.keyBuf.length * 8}-cbc`;
  }

  /** 明文字符串 → Hex 密文 */
  encode(plaintext) {
    const compressed = LZString.compressToBase64(plaintext);
    const cipher = crypto.createCipheriv(this.algorithm, this.keyBuf, this.ivBuf);
    const out = Buffer.concat([cipher.update(compressed, 'utf8'), cipher.final()]);
    return out.toString('hex');
  }

  /** Hex 密文 → 明文字符串；解不开时抛错（调用方据此走黑洞分支） */
  decode(hex) {
    const raw = Buffer.from(String(hex).trim(), 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.keyBuf, this.ivBuf);
    const compressed = Buffer.concat([decipher.update(raw), decipher.final()]).toString('utf8');
    const plaintext = LZString.decompressFromBase64(compressed);
    if (plaintext === null || plaintext === undefined) {
      throw new Error('LZString 解压失败：密文或压缩层不匹配');
    }
    return plaintext;
  }

  /** 业务结果对象 → 响应信封 */
  wrapResponse(resultObj) {
    return JSON.stringify({ code: 200, MsgData: this.encode(JSON.stringify(resultObj)) });
  }

  /** 请求信封 {mod,do,p}（可能嵌在 hex 里）→ 业务对象 */
  unwrapRequest(envelope) {
    return {
      mod: envelope.mod,
      do: envelope.do,
      p: envelope.p || {},
    };
  }

  /**
   * 鉴权签名：参数键升序 → 拼接对应值 → 追加 Salt → MD5 小写。
   * 拼接方式未经真机验证，对撞失败时在此处换实现。
   */
  sign(params) {
    const keys = Object.keys(params || {}).sort();
    const concat = keys.map((k) => String(params[k])).join('') + this.salt;
    return crypto.createHash('md5').update(concat, 'utf8').digest('hex');
  }
}

module.exports = { ProtocolCodec, DEFAULTS };
