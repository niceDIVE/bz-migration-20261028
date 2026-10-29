// 一次性：把真档 skills 的 1/7/8/9 抬到 100（只为验证摸奖界面门槛），走 bzPatch 维护动作
const fs = require('fs');
const crypto = require('crypto');
const LZString = require('F:/BaoZouyxt/hotfix-patch/node_modules/lz-string');
const KEY = Buffer.from('120734aa834dea925ca8d2e1bb6811c3', 'utf8');
const IV = Buffer.from('33daee8409834c00', 'utf8');

const savePath = 'F:/BaoZouyxt/_backup/savedata-20261027-023103-pre-knackgate/bz_offline_save.json';
const s = JSON.parse(fs.readFileSync(savePath, 'utf8'));
const skills = Object.assign({}, s.skills);
for (const id of ['1', '7', '8', '9']) {
  const cur = Array.isArray(skills[id]) ? skills[id] : [1, 0, 1];
  skills[id] = [100, cur[1] || 0, cur[2] || 1];
}

const payload = { mod: 'User', do: 'bzPatch', p: { set: { skills: skills } } };
const pt = JSON.stringify(payload);
const c = crypto.createCipheriv('aes-256-cbc', KEY, IV);
const hex = Buffer.concat([c.update(LZString.compressToBase64(pt), 'utf8'), c.final()]).toString('hex');
fs.writeFileSync('F:/BaoZouyxt/batch10-facts-20261027/probe_patch.hex', hex, 'ascii');
console.log('旧 skills:', JSON.stringify(s.skills));
console.log('新 skills:', JSON.stringify(skills));
console.log('hex ' + hex.length);
