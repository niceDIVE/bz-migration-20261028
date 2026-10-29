/* bz-codec —— 线协议编解码（与 gateway/src/codec.js 管线一致，已实机对撞验证）
 * 依赖构建期注入的 window.aesjs / window.LZString */
;(function () {
  try {
    var A = window.aesjs, LZ = window.LZString;
    if (!A || !LZ) { window.__BZ_CODEC__ = null; return; }
    var KEY = A.utils.utf8.toBytes('120734aa834dea925ca8d2e1bb6811c3'); // 32B → AES-256-CBC（实测定稿）
    var IV = A.utils.utf8.toBytes('33daee8409834c00');

    function pkcs7Pad(b) {
      var n = 16 - (b.length % 16);
      var o = new Uint8Array(b.length + n);
      o.set(b);
      for (var i = b.length; i < o.length; i++) o[i] = n;
      return o;
    }
    function pkcs7Unpad(b) {
      if (!b || !b.length) return b;
      var n = b[b.length - 1];
      return b.slice(0, b.length - n);
    }
    /** 明文 JSON → Hex 密文 */
    function encode(plaintext) {
      var b64 = LZ.compressToBase64(plaintext);
      var data = A.utils.utf8.toBytes(b64);
      var cbc = new A.ModeOfOperation.cbc(KEY, IV);
      return A.utils.hex.fromBytes(cbc.encrypt(pkcs7Pad(data)));
    }
    /** Hex 密文 → 明文 JSON；失败抛错（调用方走黑洞/兜底） */
    function decode(hex) {
      var raw = A.utils.hex.toBytes(String(hex).trim());
      var cbc = new A.ModeOfOperation.cbc(KEY, IV);
      var b64 = A.utils.utf8.fromBytes(pkcs7Unpad(cbc.decrypt(raw)));
      var s = LZ.decompressFromBase64(b64);
      if (s === null || s === undefined) throw new Error('LZString 解压失败');
      return s;
    }
    window.__BZ_CODEC__ = { encode: encode, decode: decode };
  } catch (e) {
    try { console.log('[BZ-OFFLINE] codec 初始化失败: ' + e); } catch (_) {}
    window.__BZ_CODEC__ = null;
  }
})();
