'use strict';
/** 一次性脚本：C19〔技能皮肤商店〕7 个动作登记进 reject-codes.json（A 轮第 1 批）。 */
const fs = require('fs');
const crypto = require('crypto');
const lines = fs.readFileSync('F:/BaoZouyxt/tools/index.js', 'utf8').split('\n');
function evOf(n) {
  const l = (lines[n - 1] || '').trim();
  return 'index.js:' + n + '#' + crypto.createHash('sha1').update(l).digest('hex').slice(0, 8);
}
const p = 'F:/BaoZouyxt/tools/facts/reject-codes.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
const TIER2 = '客户端非 1 无专属分支（商店/买/卸 静默；活动买 2→6003145 / 9→提示+重拉，82821）→ tier 2 取 2';
const acts = {
  getSkillSkinShop: { line: 60558, reasons: ['default', 'noTable'],
    note: '商店货架被拒：BZ_C19 缺失才回 2（正常 1 + shopData.ds/price/freeTime → showShop 开 SkinShopUI，82913）' },
  refreshSkillSkinShop: { line: 60559, reasons: ['default', 'insufficient', 'noTable'],
    note: '刷新被拒：元宝不足（自定 20 元宝/次）或表缺（防刷：刷新有成本）' },
  buySkillSkinShop: { line: 60560, reasons: ['default', 'badId', 'bought', 'insufficient', 'noTable'],
    note: '买道具被拒：非 type=1 行 / 已购（每行限购 1）/ 元宝不足 / 表缺（照表 price 真扣）' },
  getSkillSkinActiveShop: { line: 60569, reasons: ['default', 'noTable'],
    note: '活动商店被拒：BZ_C19 缺失才回 2（常开 30 天续期；shopDatas=type=2 行 id）' },
  buySkillSkinActiveShop: { line: 60570, reasons: ['default', 'badIds', 'badId', 'badSkin', 'owned', 'insufficient', 'noTable'],
    note: '买活动皮肤被拒：ids 空 / 非 type=2 行 / item 非 skillskin / 已拥有 / 元宝不足（照表 price 真扣）' },
  equipSkillSkin: { line: 60561, reasons: ['default', 'notOwned', 'noTable'],
    note: '装皮肤被拒：皮肤未拥有（读存档 s.skinData，不信请求参数）' },
  removeSkillSkin: { line: 60562, reasons: ['default', 'noTable'],
    note: '卸皮肤被拒：BZ_C19 缺失才回 2' },
};
let added = 0;
for (const [name, a] of Object.entries(acts)) {
  if (j[name]) { console.log('skip:', name); continue; }
  j[name] = { success: [1], handled: [1], promptOnly: [], defaultCode: 2,
    codes: [{ code: 2, role: 'reject', reasons: a.reasons, tier: 2, tierWhy: TIER2, ev: evOf(a.line), note: a.note }] };
  added++;
}
fs.writeFileSync(p, JSON.stringify(j, null, 1) + '\n', 'utf8');
console.log('added', added, '; total', Object.keys(j).length);
