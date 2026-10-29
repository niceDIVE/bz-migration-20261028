/* tmp_planned_c12.js —— 第 13 批 C12〔管家/帮手〕形状冻结审批（2026-10-27）
 * 机制同 tmp_planned_c11.js：解析 --diff 原文（剥 BOM）→ 按动作生成 planned-changes 规则。 */
const fs = require('fs');
const path = require('path');
const ROOT = 'F:/BaoZouyxt';
const lines = fs.readFileSync(ROOT + '/batch13-facts-20261027/tmp_diff_raw.txt', 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)
  .filter((x) => /^(add|del|value) \|/.test(x));
const leafOfPath = (p) => p.replace(/\[\d+\]/g, '').split('.').pop();

const META = {
  getHousekeeper: { ev: 'index.js:60393', why: 'C12 面板开关（并入申报）：delegateUI 在它 1 分支 new（scripts3.js:23111）。housekeeper 22 字段全量下发（testFunc 23578-23606 + templates.json create 双源互证）；空档 fresh 值 dueTime=null/noticeRtm=null/type=-1（create 初值），时间戳毫秒' },
  buyHelper: { ev: 'index.js:60397', why: 'C12 买管家：空请求 helperId=0 不在表 → eRet 4（客户端 openChargeList 分支 23167，同 BuyMount 先例）；成功路径才带 housekeeper.helperIdArr + note.eco.yuanbao' },
  setHelper: { ev: 'index.js:60396', why: 'C12 设置管家：空请求 helperId=0 未拥有 → eRet 2（6000506 分支 23160）；成功路径才带 housekeeper.helperId（23156 裸读）' },
  callHelperId: { ev: 'index.js:60564', why: 'C12 呼叫管家（★线上名 callHelperId）：空请求未拥有 → eRet 2（无 else 静默，23235-23245）；housekeeper 字段有守卫' },
  getHelperCallList: { ev: 'index.js:60563', why: 'C12 呼叫列表：callData = 8 管家映射（当前跟随=3，其余=1，自定口径）；UI 侧 price<=0||checkBought 自过滤（scripts3.js:20107）' },
  dispatch: { ev: 'index.js:60394', why: 'C12 派遣（★线上名 User.dispatch）：空请求 fresh 档不忙 → 派遣成功落档（dispatchTime/dispatchEndTime=now+30min/mapId=0，拍板③档 A），housekeeper 全量回 + note 四键（★成功分支裸读 o.note.eco.yuanbao 23125）' },
  dispatchAward: { ev: 'index.js:60395', why: 'C12 领派遣奖：空请求无进行中派遣 → eRet 3（1530 分支 23151）；其余码走 else 1145 兜底' },
  buyMonthlyFee: { ev: 'index.js:60398', why: 'C12 月卡（★线上名 User.buyMonthlyFee）：空请求 type=0 非法 → eRet 2（6000402 分支 23193）；拍板②自定 300 元宝/30 天；成功才带 housekeeper.dueTime（毫秒）' },
  setHelper: { ev: 'index.js:60396', why: 'C12 设置管家：空请求 helperId=0 未拥有 → eRet 2（6000506 分支 23160）；成功路径才带 housekeeper.helperId（23156 裸读）' },
  setTemplateData: { ev: 'index.js:60399', why: 'C12 自动派遣模板（并入申报）：空请求 autoTime=-1 非法 → eRet 2（6000332 分支 23132）；档 A 只存 template/autoTime/mapId 不执行' },
  receiveNotice: { ev: 'index.js:60402', why: 'C12 通知（第4批顺手键并入申报）：档 A 无通知内容恒 1 no-op，eventType:0 必带（23198/23257 裸读）；housekeeper 全量回；★非 1 → 客户端 dataDestroy（23220）故拒绝码仅 catch 兜底' },
};

const byAction = {};
for (const l of lines) {
  const parts = l.split(' | ');
  if (parts.length < 8) { console.error('解析失败: ' + l); process.exit(1); }
  const sig = parts[7].trim().split('→');
  (byAction[parts[1]] = byAction[parts[1]] || []).push({ kind: parts[0], action: parts[1], path: parts[2], field: leafOfPath(parts[2]), s0: sig[0], s1: sig[1] });
}
const rules = [];
for (const action of Object.keys(byAction).sort()) {
  const arr = byAction[action];
  const meta = META[action];
  if (!meta || !meta.why) { console.error('缺 META: ' + action); process.exit(1); }
  const fields = Array.from(new Set(arr.map((x) => x.field)));
  const allow = arr.filter((x) => x.s0 !== x.s1).map((x) => [action, x.path]);
  rules.push({ id: 'c12-' + action, field: fields, action: action, expect: arr.length, allowSigma: allow, ev: meta.ev, why: meta.why });
}
fs.writeFileSync(path.join(ROOT, 'tools/golden/planned-changes.json'), JSON.stringify(rules, null, 1), 'utf8');
console.log('规则 ' + rules.length + ' 条，覆盖 ' + rules.reduce((n, r) => n + r.expect, 0) + ' 项');
for (const r of rules) console.log('  ' + r.id + ' expect=' + r.expect + ' allowSigma=' + r.allowSigma.length + ' fields=[' + r.field.join(',') + ']');
