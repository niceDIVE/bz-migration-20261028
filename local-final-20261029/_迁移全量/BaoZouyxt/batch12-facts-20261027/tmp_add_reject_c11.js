/* tmp_add_reject_c11.js —— 第 12 批 C11〔周年通行证〕拒绝码登记（2026-10-27）
 * 照 batch11-facts-20261027\tmp_add_reject_c10.js 的模式：JSON.parse + 补条目 + stringify 写回。
 * ev 的 #sha8 按 tools\check_reject_codes.js:64 的算法定义行原文（trim 后 sha1 前 8 位）现场计算，
 * 定义行 = tools/index.js:60587-60592 / 60595（主审已核，见 batch12-facts-20261027\主审-独立探针记录.md §一）。 */
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
  getAnniversaryPassData: { success: [1], handled: [1], promptOnly: [], defaultCode: 2, codes: [{ code: 2, role: 'reject', reasons: ['default'], tier: 1, ev: evOf(60587), note: '面板开关被拒（annPass 档/表结构异常）。非 1 → removeItem + getText(1093) + ANN_OPEN false（scripts3.js:7837-7841，有提示）→ 第 1 档。★AnniversaryMainUI 在 1 分支里 new（7831）→ 本键回不对整批不可达。', tierWhy: 'else 分支有文案 1093' }] },
  buyAnniversaryPass: { success: [1], handled: [1, 4], promptOnly: [4], defaultCode: 4, codes: [{ code: 4, role: 'reject', reasons: ['default', 'alreadyVip', 'insufficient', 'noTable'], tier: 1, ev: evOf(60588), note: '升 VIP 被拒：已是 VIP / 元宝不足 / 表缺失。4 → getText(8845)（scripts3.js:7848）。拍板②（2026-10-27）：300 元宝自定离线价，同侠客令先例。', tierWhy: '4 → getText(8845)（scripts3.js:7848）——有提示' }] },
  receiveAnniversaryPassAward: { success: [1], handled: [1], promptOnly: [], defaultCode: 2, codes: [{ code: 2, role: 'reject', reasons: ['default', 'badRow', 'claimed', 'livenessLow', 'noTable'], tier: 2, ev: evOf(60589), note: '领奖被拒：行 id 不在 award 表 / 该档已领 / 活跃度未达 row.liveness。回调只有 1 分支、无 else（scripts3.js:7850-7857）→ 2 静默。拒绝应答剥到只剩 eRet（REJECT_ALLOW）。', tierWhy: '回调只有 1 分支、无 else → 静默' }] },
  getAnniversaryPassGift: { success: [1], handled: [1], promptOnly: [], defaultCode: 2, codes: [{ code: 2, role: 'reject', reasons: ['default', 'noTable'], tier: 2, ev: evOf(60590), note: '礼包货架被拒：只在 BZ_C11 缺失时回 2（正常路径恒 1 + 4 行 11 元数组货架）。★本键不自开面板：dispatch(STORE_SHOW_UI,{type:11,data:giftDatas})（index.js:131051-131054）。', tierWhy: '回调只有 1 分支、无 else（index.js:131050-131056）→ 静默' }] },
  buyAnniversaryPassGift: { success: [1], handled: [1], promptOnly: [], defaultCode: 2, codes: [{ code: 2, role: 'reject', reasons: ['default', 'badGift', 'limit', 'insufficient', 'noTable'], tier: 2, ev: evOf(60591), note: '买礼包被拒：giftId 不在表 / 超限购（表 limit）/ 元宝不足。回调只有 1 分支、无 else（index.js:131062-131067）→ 静默。★rewardArray 裸读（131064）→ 拒绝绝不带。拍板③：元宝扣款、限购照表。', tierWhy: '回调只有 1 分支、无 else → 静默' }] },
  buyAnniversaryPassLiveness: { success: [1], handled: [1, 3], promptOnly: [3], defaultCode: 3, codes: [{ code: 3, role: 'reject', reasons: ['default', 'badNum', 'capReached', 'insufficient', 'noTable'], tier: 1, ev: evOf(60592), note: '买活跃度被拒：num 非法 / 已到上限 565（客户端 scripts3.js:7763 同判定拒开弹窗）/ gold 不足。3 → getText(7353)（7863）。★上游"可能已下线"已推翻（入口 scripts3.js:18448）。拍板③：扣 gold、10/点（自定）。', tierWhy: '3 → getText(7353)（scripts3.js:7863）——有提示' }] },
  receiveAnniversaryPassTaskReward: { success: [1], handled: [1], promptOnly: [], defaultCode: 2, codes: [{ code: 2, role: 'reject', reasons: ['default', 'badTask', 'claimed', 'notReached', 'noTable'], tier: 2, ev: evOf(60595), note: '任务领奖被拒：taskId 不在表 / 已领 / 进度未达（dv 本批不累计 → 正常流程恒 notReached，结构正确、玩法暂不产生，同 C10 cleanDeadCrop）。★线上名 receiveAnniversaryPassTaskReward（不叫 finishTask）。回调只有 1 分支、无 else（scripts3.js:7878-7888）→ 静默；★rewardArray 裸读无守卫（7886）→ 拒绝绝不带。', tierWhy: '回调只有 1 分支、无 else → 静默' }] },
};
let n = 0;
for (const k of Object.keys(add)) { if (j[k]) { console.log('已存在，跳过 ' + k); continue; } j[k] = add[k]; n++; }
fs.writeFileSync(P, JSON.stringify(j, null, 1), 'utf8');
console.log('新增 ' + n + ' 条，总动作数 ' + Object.keys(j).length);
console.log('ev 样例 getAnniversaryPassData = ' + add.getAnniversaryPassData.codes[0].ev);
