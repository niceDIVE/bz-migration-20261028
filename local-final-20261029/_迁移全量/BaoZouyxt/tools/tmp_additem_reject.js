'use strict';
/** 一次性脚本：addItem 改为 eRet 2 拒绝后登记进 reject-codes.json（上游提速方案核查 2026-10-27）。
 *  客户端有 send 点（index.js:65353-65358 InventoryModel.addItem → sendRequest(ADD_ITEM)），
 *  监听 64912 eRet==2 → getText(448)。防白拿：拒绝。 */
const fs = require('fs');
const crypto = require('crypto');
const lines = fs.readFileSync('F:/BaoZouyxt/tools/index.js', 'utf8').split('\n');
function evOf(n) {
  const l = (lines[n - 1] || '').trim();
  return 'index.js:' + n + '#' + crypto.createHash('sha1').update(l).digest('hex').slice(0, 8);
}
const p = 'F:/BaoZouyxt/tools/facts/reject-codes.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
if (j.addItem) { console.log('skip addItem'); }
else {
  j.addItem = {
    success: [1], handled: [1], promptOnly: [2], defaultCode: 2,
    codes: [{ code: 2, role: 'reject', reasons: ['default', 'freeGrant'], tier: 2,
      tierWhy: '客户端 2 分支只有 getText(448) 提示（index.js:64922），非专属成功分支 → tier 2',
      ev: evOf(59577),
      note: '直接给物品口被拒：★客户端有 send 点（InventoryModel.addItem → sendRequest(ADD_ITEM)，index.js:65353-65358）→ 上游提速方案核查判"有 send 点改 eRet 拒绝并删白名单行"（防白拿）。' }],
  };
  fs.writeFileSync(p, JSON.stringify(j, null, 1) + '\n', 'utf8');
  console.log('added addItem; total', Object.keys(j).length);
}
