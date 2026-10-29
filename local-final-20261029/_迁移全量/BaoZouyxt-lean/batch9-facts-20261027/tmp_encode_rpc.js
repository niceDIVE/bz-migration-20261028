// 一次性：真机探针载荷编码（AES-256-CBC + lz-string base64 → hex），按模式写 probe.hex。
// 用法：node tmp_encode_rpc.js <模式号>
//   1 enterPVEBattle {npcID:1001}
//   2 beginPVEBattle {action:1,paramID:2001,paramID1:1,paramID2:16374}
//   3 enterRoguePVEBattle {npcID:1001,hp:321,hplimit:400,mp:55}
//   4 beginRoguePVEBattle {action:3,paramID:0,paramID1:0,paramID2:16374}
//   5 ChallengePVP {otherRoleID:12345,mp:10,gTime:1,hgtimes:0}
//   6 enterPVEBattle {npcID:999999}   ← 兜底路径
const fs = require('fs');
const nodeCrypto = require('crypto');
const LZString = require('F:/BaoZouyxt/hotfix-patch/node_modules/lz-string');
const KEY = Buffer.from('120734aa834dea925ca8d2e1bb6811c3', 'utf8');
const IV = Buffer.from('33daee8409834c00', 'utf8');
const CASES = {
  1: ['enterPVEBattle', { npcID: 1001 }],
  2: ['beginPVEBattle', { action: 1, paramID: 2001, paramID1: 1, paramID2: 16374 }],
  3: ['enterRoguePVEBattle', { npcID: 1001, hp: 321, hplimit: 400, mp: 55 }],
  4: ['beginRoguePVEBattle', { action: 3, paramID: 0, paramID1: 0, paramID2: 16374 }],
  5: ['ChallengePVP', { otherRoleID: 12345, mp: 10, gTime: 1, hgtimes: 0 }],
  6: ['enterPVEBattle', { npcID: 999999 }],
};
const mode = String(process.argv[2] || '1');
const c0 = CASES[mode];
if (!c0) throw new Error('未知模式 ' + mode);
const pt = JSON.stringify({ mod: 'User', do: c0[0], p: c0[1] });
const c = nodeCrypto.createCipheriv('aes-256-cbc', KEY, IV);
const hex = Buffer.concat([c.update(LZString.compressToBase64(pt), 'utf8'), c.final()]).toString('hex');
fs.writeFileSync('F:/BaoZouyxt/batch9-facts-20261027/probe.hex', hex, 'ascii');
console.log('mode ' + mode + ' ' + c0[0] + ' p=' + JSON.stringify(c0[1]) + ' hex=' + hex.length);
