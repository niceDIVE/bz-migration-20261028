'use strict';
/**
 * selfcheck-nosave.js —— 自检「不许动真存档」回归用例
 *
 * 用法（工作目录 hotfix-patch）：
 *   node test\selfcheck-nosave.js [存档快照路径]
 *   默认快照：..\_backup\2026-10-22-0205-pre-selfcheck-isolation\bz_offline_save.json
 *
 * 做什么：把真存档内容放进假 bz 的 store，跑一次 selfCheck()，然后对比
 *   1) store 里的存档字符串有没有被改（字节级）
 *   2) writeFile 被调了几次、写成什么
 * 退出码 0 = 自检没有写存档；1 = 自检写了（回归！）。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const savePath = process.argv[2] || path.join(root, '..', '_backup', '2026-10-22-0205-pre-selfcheck-isolation', 'bz_offline_save.json');
const realSave = fs.readFileSync(path.resolve(savePath), 'utf8').trim();

const body = "var IMPL_VERSION = 'test';\nvar __TPL__ = " + read('core/templates.json').trim() + ';\n\n' +
  read('core/bz-shapes.generated.js') + '\n\n' + read('core/bz-tasks.generated.js') + '\n\n' +
  read('core/bz-rpc-server.js') + '\n\n' + read('core/bz-handler-impl.js');

function makeNodeCodec() {
  const LZString = require('lz-string');
  const KEY = Buffer.from('120734aa834dea925ca8d2e1bb6811c3', 'utf8');
  const IV = Buffer.from('33daee8409834c00', 'utf8');
  return {
    encode(pt) {
      const c = crypto.createCipheriv('aes-256-cbc', KEY, IV);
      return Buffer.concat([c.update(LZString.compressToBase64(pt), 'utf8'), c.final()]).toString('hex');
    },
    decode(hex) {
      const d = crypto.createDecipheriv('aes-256-cbc', KEY, IV);
      const b64 = Buffer.concat([d.update(Buffer.from(String(hex).trim(), 'hex')), d.final()]).toString('utf8');
      return LZString.decompressFromBase64(b64);
    },
  };
}

const SAVE_KEY = 'bz_offline_save_v2';
const store = { [SAVE_KEY]: realSave };
const writes = [];
const otherKeys = [];
const bz = {
  bootVer: 'test', now: () => 1792600000000, log: () => {},
  readFile: (p) => (p in store ? store[p] : null),
  writeFile: (p, t) => { writes.push(p); if (p !== SAVE_KEY) otherKeys.push(p); store[p] = t; return true; },
  exists: (p) => p in store,
  remove: (p) => { delete store[p]; return true; },
  dir: '/tmp/', savePath: SAVE_KEY, handlersPath: '/tmp/handlers.js',
  codec: makeNodeCodec(),
};

const impl = new Function('bz', body)(bz);
const sc = impl.selfCheck();

const after = store[SAVE_KEY];
const same = after === realSave;
const sha = (s) => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 12);

console.log(JSON.stringify({
  ok: sc.ok, passed: sc.passed, failed: sc.failed.length,
  saveWritten: !same,
  writesToSave: writes.filter((p) => p === SAVE_KEY).length,
  writesOther: otherKeys,
  before: { bytes: realSave.length, sha: sha(realSave) },
  after: { bytes: (after || '').length, sha: sha(after) },
  failedNames: sc.failed.slice(0, 8),
}, null, 2));

process.exit(same ? 0 : 1);
