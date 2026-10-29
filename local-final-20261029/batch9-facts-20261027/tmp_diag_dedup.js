// 一次性诊断：selfCheck 那种 memMake + sandbox:true 环境下，连打两场 CheckBattleResult 到底各发多少
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const CORE = 'F:/BaoZouyxt/hotfix-patch/core';
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(CORE, 'bz-tasks.generated.js'), 'utf8'));
const { createBzServer } = require(path.join(CORE, 'bz-rpc-server.js'));
const TPL = require(path.join(CORE, 'templates.json'));

function make(opt) {
  const data = {};
  const logs = [];
  const srv = createBzServer(Object.assign({
    readSave: (k) => (Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null),
    writeSave: (k, v) => { data[k] = v; },
    log: (m) => logs.push(String(m)),
    now: () => 1792612412000,
    templates: TPL,
  }, opt || {}));
  return { srv, logs };
}

for (const opt of [{ sandbox: true }, {}]) {
  const { srv, logs } = make(opt);
  const r1 = srv.dispatch('User', 'CheckBattleResult', { win: 1, npcID: 2005 })['User.CheckBattleResult'];
  const s1 = srv.loadSave();
  const r2 = srv.dispatch('User', 'CheckBattleResult', { win: 1, npcID: 2005 })['User.CheckBattleResult'];
  const s2 = srv.loadSave();
  console.log('=== opt=' + JSON.stringify(opt) + ' ===');
  console.log('  r1.equipObj=' + JSON.stringify(r1.equipObj) + ' rewardArray=' + JSON.stringify(r1.rewardArray));
  console.log('  r2.equipObj=' + JSON.stringify(r2.equipObj) + ' rewardArray=' + JSON.stringify(r2.rewardArray));
  console.log('  save1.playerEquip=' + JSON.stringify(s1.playerEquip) + ' bag=' + JSON.stringify(s1.bag));
  console.log('  save2.playerEquip=' + JSON.stringify(s2.playerEquip) + ' bag=' + JSON.stringify(s2.bag));
  logs.filter((l) => l.indexOf('打怪') >= 0).forEach((l) => console.log('  LOG ' + l));
}
console.log('=== BZ_DROP 9002005 ===', JSON.stringify((typeof BZ_DROP !== 'undefined') ? BZ_DROP['9002005'] : 'no BZ_DROP'));
