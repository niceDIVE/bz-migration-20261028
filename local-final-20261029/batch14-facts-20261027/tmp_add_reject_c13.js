/* tmp_add_reject_c13.js —— 第 14 批 C13〔UFO 夹娃娃〕拒绝码登记（2026-10-27）
 * 照 tmp_add_reject_c12.js 模式。tier 口径（R2a）：code ∉ handled → tier 2。
 * REWARD_UFO 任何非 1 → 客户端恒 dispatch CATCH_DOLL_EVENT null（25767）→ 全部拒绝安全，15 → 8060。 */
const fs = require('fs');
const crypto = require('crypto');
const ROOT = 'F:/BaoZouyxt';
const P = ROOT + '/tools/facts/reject-codes.json';
const IDX = ROOT + '/tools/index.js';
const lines = fs.readFileSync(IDX, 'utf8').split('\n');
const sha8 = (t) => crypto.createHash('sha1').update(t, 'utf8').digest('hex').slice(0, 8);
const evOf = (lineNo) => {
  const raw = lines[lineNo - 1];
  if (raw === undefined) throw new Error('index.js 不足 ' + lineNo + ' 行');
  return 'index.js:' + lineNo + '#' + sha8(raw.replace(/\r$/, '').trim());
};
const j = JSON.parse(fs.readFileSync(P, 'utf8'));
const add = {
  getUFOCatcherData: { success: [1], handled: [1], promptOnly: [], defaultCode: 2, codes: [{ code: 2, role: 'reject', reasons: ['default', 'noTable'], tier: 2, ev: evOf(60251), note: '夹娃娃面板开关被拒（档/表结构异常）。25783 与 25797 是两个独立 if（非 else-if）→ 其余码静默；无 3 分支以外的提示。面板 = dollBundle/prefabs/dollUI（25791）。★入口 = 夹娃娃机 NPC（NpcToFuncType97，index.js:87583）。', tierWhy: 'code ∉ handled → tier 2（R2a）' }] },
  rewardUFO: { success: [1], handled: [1, 15], promptOnly: [15], defaultCode: 15, codes: [{ code: 15, role: 'reject', reasons: ['default', 'badGear', 'badSign', 'noClaw', 'emptyPool', 'noTable'], tier: 1, ev: evOf(60254), note: '抓取被拒：itemId 非爪（只认 8117/8119/8120）/ signCode 缺失 / 背包无该爪 / 池子为空。15 → getText(8060)。★任何非 1 → 客户端恒 dispatch CATCH_DOLL_EVENT null（25767）→ 拒绝安全。★拍板②服务端权威判中（忽略客户端 packages）；拍板③照扣爪子；池子抓空回 autoRefresh+新池。', tierWhy: '15 有专属文案分支（25766）→ tier 1' }] },
  useUFOrefresh: { success: [1], handled: [1, 3, 6], promptOnly: [3, 6], defaultCode: 6, codes: [{ code: 6, role: 'reject', reasons: ['default', 'noTimes', 'noTable'], tier: 1, ev: evOf(60253), note: '刷新被拒：无可用次数（free+paid=0）→ 6 → getText(8060)。刷新 = 重生成池子 + signId+1（旧 signCode 失效）。★线上名 User.useUFOrefresh（refresh 的 r 小写）。', tierWhy: '6 有专属文案分支（25781）→ tier 1' }] },
  buyUFORefreshTimes: { success: [1], handled: [1, 3, 5, 6, 7], promptOnly: [3, 5, 6, 7], defaultCode: 7, codes: [{ code: 7, role: 'reject', reasons: ['default', 'capReached', 'noTable'], tier: 1, ev: evOf(60252), note: '买刷新被拒：累计限购 3 次已满（拍板⑥自定，对应客户端 getConstByID(325) 闸，DollUI:26202）→ 7 → getText(8060)。', tierWhy: '7 有专属文案分支（25809）→ tier 1' }, { code: 5, role: 'reject', reasons: ['insufficient'], tier: 1, ev: evOf(60252), note: '元宝不足（拍板⑥ 100 元宝/次）→ 5 → getText(3633)。', tierWhy: '5 有专属文案分支（25809-25811）→ tier 1' }] },
};
let n = 0;
for (const k of Object.keys(add)) { if (j[k]) { console.log('已存在，跳过 ' + k); continue; } j[k] = add[k]; n++; }
fs.writeFileSync(P, JSON.stringify(j, null, 1), 'utf8');
console.log('新增 ' + n + ' 条，总动作数 ' + Object.keys(j).length);
console.log('ev 样例 rewardUFO = ' + add.rewardUFO.codes[0].ev);
