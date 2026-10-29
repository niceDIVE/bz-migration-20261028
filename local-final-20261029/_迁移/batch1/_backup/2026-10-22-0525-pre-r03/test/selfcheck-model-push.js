'use strict';
/**
 * selfcheck-model-push.js —— 自检「不许改活着的客户端模型」回归用例
 *
 * 背景：upgradeSkill handler 结尾会通过 window.__require 把潜能/技能推回客户端模型。
 * 自检里那次 upgradeSkill（空参数、内存存档）也会走到这段，于是每次 reload 都会：
 *   RoleBaseInfo.potentials = 内存存档算出来的假值（99999 - 100*n）
 *   SkillTable.setSkill(0, lv)   ← 写一个不存在的 0 号技能
 *
 * 本用例用一个假的 window.__require 记录这些写入：
 *   退出码 0 = 自检期间没有推送（安全）
 *   退出码 1 = 自检期间发生了推送（回归）
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

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
const store = {};                       // 空存档：模拟自检的干净内存档
const bz = {
  bootVer: 'test', now: () => 1792600000000, log: () => {},
  readFile: (p) => (p in store ? store[p] : null),
  writeFile: (p, t) => { store[p] = t; return true; },
  exists: (p) => p in store,
  remove: (p) => { delete store[p]; return true; },
  dir: '/tmp/', savePath: SAVE_KEY, handlersPath: '/tmp/handlers.js',
  codec: makeNodeCodec(),
};

// 假的客户端模型：记录所有写入
const pushes = { potentials: [], setSkill: [], setItem: [] };
const RoleBaseInfo = {
  get potentials() { return this._pot; },
  set potentials(v) { this._pot = v; pushes.potentials.push(v); },
};
const SkillTable = {
  setSkill(id, lv) { pushes.setSkill.push([id, lv]); },
};
const InventoryModel = {
  setItem(id, count) { pushes.setItem.push([id, count]); },
};
const registry = { RoleBaseInfo: { RoleBaseInfo }, SkillTable: { SkillTable }, InventoryModel: { InventoryModel } };
global.window = { __require: (n) => registry[n] || null };

const impl = new Function('bz', body)(bz);
const sc = impl.selfCheck();

const leaked = pushes.potentials.length > 0 || pushes.setSkill.length > 0 || pushes.setItem.length > 0;
console.log(JSON.stringify({
  ok: sc.ok, passed: sc.passed, failed: sc.failed.length,
  selfCheckTouchedLiveModel: leaked,
  potPushes: pushes.potentials,
  setSkillCalls: pushes.setSkill,
  setItemCalls: pushes.setItem,
}, null, 2));

process.exit(leaked ? 1 : 0);
