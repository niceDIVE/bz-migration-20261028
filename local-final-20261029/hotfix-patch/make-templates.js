'use strict';
/** make-templates.js —— 从 decrypted/ 提取关键响应模板 → core/templates.json */
const fs = require('fs');
const path = require('path');
const dec = path.join(__dirname, 'decrypted');
const files = fs.readdirSync(dec);

function find(frag) {
  const f = files.find((x) => x.includes(frag) && x.startsWith('0') && !x.includes('_REQ_'));
  if (!f) throw new Error('未找到响应: ' + frag);
  const raw = fs.readFileSync(path.join(dec, f), 'utf8');
  return JSON.parse(raw.split('\n').slice(1).join('\n'));
}

const t = {
  quicklogin: find('800_server_166_quicklogin'),
  create: find('900_server_166_Create'),
  getChatAddress: find('900_server_166_GetChatAddress'),
  reqSelfBattleInfo: find('900_server_166_ReqSelfBattleInfo'),
  checkBattleResult: find('900_server_166_CheckBattleResult'),
  getFinishTaskAward: find('900_server_166_getFinishTaskAward'),
  getCRAInfo: find('900_server_166_getCRAInfo'),
  getServerList: find('9898_GetServerList'),
};
fs.writeFileSync(path.join(__dirname, 'core', 'templates.json'), JSON.stringify(t));
for (const [k, v] of Object.entries(t)) console.log(k + ': ' + JSON.stringify(v).length + ' 字节');
console.log('templates.json 生成完成');
