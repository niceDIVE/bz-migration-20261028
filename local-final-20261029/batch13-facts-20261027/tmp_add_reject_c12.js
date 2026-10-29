/* tmp_add_reject_c12.js —— 第 13 批 C12〔管家/帮手〕拒绝码登记（2026-10-27）
 * 照 tmp_add_reject_c11.js 模式。tier 口径（R2a）：code ∉ handled（无专属分支）→ tier 2，
 * else 兜底有文案也不算（C11 的 getAnniversaryPassData 教训）；code ∈ handled（专属分支）→ tier 1。 */
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
  getHousekeeper: { success: [1], handled: [1], promptOnly: [], defaultCode: 2, codes: [{ code: 2, role: 'reject', reasons: ['default'], tier: 2, ev: evOf(60393), note: '管家面板开关被拒（housekeeper 档/表结构异常）。无 else（scripts3.js:23109-23119）→ 静默 + 面板不开。★附录键并入申报：delegateUI 在它 1 分支里 new（23111），不回则 C12 全批不可达（同 C10 getHomeList / C11 GET_DATA）。', tierWhy: 'code ∉ handled → tier 2（R2a）' }] },
  buyHelper: { success: [1], handled: [1, 4], promptOnly: [4], defaultCode: 4, codes: [{ code: 4, role: 'reject', reasons: ['default', 'badId', 'insufficient', 'noTable'], tier: 1, ev: evOf(60397), note: '买管家被拒：id 不在表 / 元宝不足（helper.price 照表按元宝扣，拍板④）→ 4 → openChargeList（23167，充值界面语义，同 BuyMount/BuyFashion 先例）。已拥有 → 幂等成功不重复扣。', tierWhy: '4 有专属分支（openChargeList）→ tier 1' }] },
  setHelper: { success: [1], handled: [1, 2], promptOnly: [2], defaultCode: 2, codes: [{ code: 2, role: 'reject', reasons: ['default', 'notOwned', 'noTable'], tier: 1, ev: evOf(60396), note: '设置管家被拒：id 不在表或未拥有（免费 1/2 人人可用，付费看 helperIdArr）。2 → getText(6000506)（23160）。', tierWhy: '2 有专属分支 → tier 1' }] },
  callHelperId: { success: [1], handled: [1], promptOnly: [], defaultCode: 2, codes: [{ code: 2, role: 'reject', reasons: ['default', 'notOwned', 'noTable'], tier: 2, ev: evOf(60564), note: '呼叫管家被拒：未拥有/表缺失。无 else（23235-23245）→ 静默。★线上名 callHelperId（不是 callHelperById）。housekeeper 字段有守卫（23237），读 .e 当 followId。', tierWhy: 'code ∉ handled → tier 2（R2a）' }] },
  getHelperCallList: { success: [1], handled: [1], promptOnly: [], defaultCode: 2, codes: [{ code: 2, role: 'reject', reasons: ['default', 'noTable'], tier: 2, ev: evOf(60563), note: '呼叫列表被拒：只在 BZ_C12 缺失时回 2。正常路径恒 1 + callData（8 管家映射，UI 自按 price<=0||checkBought 过滤，scripts3.js:20107）。', tierWhy: 'code ∉ handled → tier 2（R2a）' }] },
  dispatch: { success: [1], handled: [1, 2, 3, 5, 6, 7, 8], promptOnly: [2, 3, 5, 6, 7, 8], defaultCode: 5, codes: [{ code: 2, role: 'reject', reasons: ['badMap'], tier: 1, ev: evOf(60394), note: 'mapId 不在管家场景白名单（helper.locate → 1147/1119/1120/1118）→ 2 → getText(6000371)。★真机实证（2026-10-27）：mapId=1008 派遣成功 → 客户端 createRoute3 查不到路线 → Cannot read property 0 of null 每帧崩（index.jsc:22681）→ 必须拒。', tierWhy: '2 有专属文案分支（23126）→ tier 1' }, { code: 5, role: 'reject', reasons: ['default', 'busy', 'noTable'], tier: 1, ev: evOf(60394), note: '派遣被拒：派遣中（dispatchEndTime 未到）→ 5 → getText(6000372)。★线上名 User.dispatch（泛化名，别和 MessageCenter.dispatch 混淆）。★成功分支裸读 o.note.eco.yuanbao（23125）→ 免费派遣也必须回 note.eco.yuanbao。档 A：落档 30 分钟不结算产出；存量坏 mapId 派遣态允许覆盖重派（自愈通道）。', tierWhy: '2/3/5/6/7/8 全有专属文案分支（23126）→ tier 1' }] },
  dispatchAward: { success: [1], handled: [1, 3], promptOnly: [3, 'else'], defaultCode: 3, codes: [{ code: 3, role: 'reject', reasons: ['default', 'notReady', 'noTable'], tier: 1, ev: evOf(60395), note: '领派遣奖被拒：无派遣 / dispatchEndTime 未到 → 3 → getText(1530)；其余码 → else getText(1145)。奖励 = 被派管家 helper.reward 照表（1/2 号为空 → rewardArray {}，客户端自己弹 6000366）。领完清派遣态防重。', tierWhy: '3 有专属分支（1530）→ tier 1；else(1145) 兜底' }] },
  buyMonthlyFee: { success: [1], handled: [1, 2], promptOnly: [2], defaultCode: 4, codes: [{ code: 2, role: 'reject', reasons: ['alreadyActive', 'badType'], tier: 1, ev: evOf(60398), note: '月卡已开通未到期 / type 非法（只认 1）→ 2 → getText(6000402)。', tierWhy: '2 有专属分支 → tier 1' }, { code: 4, role: 'reject', reasons: ['default', 'insufficient', 'noTable'], tier: 2, ev: evOf(60398), note: '月卡购买被拒：元宝不足（拍板②自定 300 元宝/30 天）→ else getText(8845)。★线上名 User.buyMonthlyFee（完全不叫 buyButlerVip）。', tierWhy: 'code ∉ handled（else 8845 兜底）→ tier 2（R2a）' }] },
  setTemplateData: { success: [1], handled: [1, 2, 3], promptOnly: [2, 3], defaultCode: 2, codes: [{ code: 2, role: 'reject', reasons: ['default', 'badAutoTime', 'noTable'], tier: 1, ev: evOf(60399), note: '自动派遣模板被拒：autoTime 非法 → 2 → getText(6000332)。档 A 只存 template/autoTime/mapId，不执行自动派遣。', tierWhy: '2/3 有专属分支（23132）→ tier 1' }] },
  receiveNotice: { success: [1], handled: [1], promptOnly: [], defaultCode: 2, codes: [{ code: 2, role: 'reject', reasons: ['default'], tier: 2, ev: evOf(60402), note: '通知领取被拒。★非 1 → 客户端 t.dataDestroy()（23220）→ 档 A 恒 1（无通知内容 no-op，eventType:0 必带——23198/23257 裸读）。relations.md:35 归第 4 批顺手做，本批并入申报。', tierWhy: 'code ∉ handled → tier 2（R2a）' }] },
};
let n = 0;
for (const k of Object.keys(add)) { if (j[k]) { console.log('已存在，跳过 ' + k); continue; } j[k] = add[k]; n++; }
fs.writeFileSync(P, JSON.stringify(j, null, 1), 'utf8');
console.log('新增 ' + n + ' 条，总动作数 ' + Object.keys(j).length);
console.log('ev 样例 getHousekeeper = ' + add.getHousekeeper.codes[0].ev);
