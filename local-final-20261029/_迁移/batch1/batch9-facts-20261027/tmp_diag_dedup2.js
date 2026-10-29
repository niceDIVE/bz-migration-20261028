// 一次性诊断 ②：直接看 store 里落盘的原始 JSON（不信 loadSave 的返回值）
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const CORE = 'F:/BaoZouyxt/hotfix-patch/core';
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require(path.join(CORE, 'bz-rpc-server.js'));
const TPL = require(path.join(CORE, 'templates.json'));

const data = {};
const logs = [];
const srv = createBzServer({
  readSave: (k) => (Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null),
  writeSave: (k, v) => { data[k] = v; },
  log: (m) => logs.push(String(m)),
  now: () => 1792612412000,
  templates: TPL,
  sandbox: true,
});
const KEY = srv._internal.SAVE_KEY;
const raw = () => {
  const s = data[KEY] ? JSON.parse(data[KEY]) : {};
  return { pe: s.playerEquip, bag: s.bag };
};
console.log('SAVE_KEY =', KEY);
console.log('建角前 store:', JSON.stringify(raw()));
srv.loadSave();
console.log('loadSave 后 store:', JSON.stringify(raw()));
srv.dispatch('User', 'getAchieveData', {});
console.log('getAchieveData 后 store:', JSON.stringify(raw()));
const r1 = srv.dispatch('User', 'CheckBattleResult', { win: 1, npcID: 2005 })['User.CheckBattleResult'];
console.log('第1场 → 应答', JSON.stringify(r1.equipObj), ' store:', JSON.stringify(raw()));
const r2 = srv.dispatch('User', 'CheckBattleResult', { win: 1, npcID: 2005 })['User.CheckBattleResult'];
console.log('第2场 → 应答', JSON.stringify(r2.equipObj), ' store:', JSON.stringify(raw()));
logs.filter((l) => l.indexOf('掉落') >= 0).forEach((l) => console.log('LOG', l));
