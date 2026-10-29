/* tmp_planned_c11.js —— 第 12 批 C11〔周年通行证〕形状冻结审批（2026-10-27）
 * 照 batch11-facts-20261027\tmp_planned_c10.js 的机制：解析 --diff 原文 → 按动作生成
 * planned-changes 规则（fields=叶子 / expect=精确匹配数 / allowSigma=逐项 / ev=index.js:行号）。
 * diff 原文：batch12-facts-20261027\tmp_diff_raw.txt（--diff 的 Out-File utf8 落盘）。 */
const fs = require('fs');
const path = require('path');
const ROOT = 'F:/BaoZouyxt';
const lines = fs.readFileSync(ROOT + '/batch12-facts-20261027/tmp_diff_raw.txt', 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)
  .filter((x) => /^(add|del|value) \|/.test(x));
const leafOfPath = (p) => p.replace(/\[\d+\]/g, '').split('.').pop();

/* 每个动作：ev=定义行（R4 同源，正则 ^(index|scripts2|scripts3)\.js:\d+$）、why=改动理由 */
const META = {
  getAnniversaryPassData: { ev: 'index.js:60587', why: 'C11 面板开关（AnniversaryMainUI 在其 1 分支 new，scripts3.js:7831）：空请求首次建档 → eRet:1 + anniversaryPassData 七字段（rd/vrd/dt 数组、td/dv 对象，客户端 7821-7828 全裸读，类型是硬约束）+ endtime 毫秒（7574 (e-t)/1e3）；拍板① endtime=now+30 天，sweep 固定时钟下为定值' },
  buyAnniversaryPass: { ev: 'index.js:60588', why: 'C11 升 VIP：空档 + 固定时钟 fresh save 元宝 0 < 300（拍板②自定价）→ eRet:4（getText 8845 分支，scripts3.js:7848）；成功路径才置 vip=1' },
  receiveAnniversaryPassAward: { ev: 'index.js:60589', why: 'C11 领奖：空请求 id=0 不在 award 表 → eRet:2（回调无 else，scripts3.js:7850-7857，静默）；成功路径才带 id/vip/rewardArray（REJECT_ALLOW 收窄）' },
  getAnniversaryPassGift: { ev: 'index.js:60590', why: 'C11 礼包货架：旧形状 giftDatas:[]（空货架）换成 4 行 11 元数组（type 11 分支 scripts2.js:8550-8572 按下标取；[5]=award 原串（67216 split 解析）、[8]=已购次数初始 0（67563 limitnum-num））；del 项 = 旧 "[]" 不再出现' },
  buyAnniversaryPassGift: { ev: 'index.js:60591', why: 'C11 买礼包：空请求 giftId=0 不在表 → eRet:2（回调无 else，index.js:131062-131067）；旧形状 eRet:1/rewardArray:{} 是 SHAPED 兜底，现在成功路径才发 rewardArray + giftData（单数，客户端 67466 刷已购数）' },
  buyAnniversaryPassLiveness: { ev: 'index.js:60592', why: 'C11 买活跃度：空请求 num=0 非法 → eRet:3（getText 7353 分支，scripts3.js:7863）；拍板③ 扣 gold、10/点、上限 565；★上游"可能已下线"已推翻（入口 scripts3.js:18448）' },
  receiveAnniversaryPassTaskReward: { ev: 'index.js:60595', why: 'C11 任务领奖（★线上名不叫 finishTask）：空请求 taskId=0 不在表 → eRet:2（回调无 else，scripts3.js:7878-7888）；本批 dv 不累计进度 → 正常流程恒 notReached；rewardArray 裸读无守卫 → 成功路径才发' },
};

const byAction = {};
for (const l of lines) {
  const parts = l.split(' | ');
  if (parts.length < 8) { console.error('解析失败: ' + l); process.exit(1); }
  const [kind, action, p] = parts;
  const sig = parts[7].trim().split('→');
  (byAction[action] = byAction[action] || []).push({ kind, action, path: p, field: leafOfPath(p), s0: sig[0], s1: sig[1] });
}

const rules = [];
for (const action of Object.keys(byAction).sort()) {
  const arr = byAction[action];
  const meta = META[action];
  if (!meta) { console.error('缺 META: ' + action); process.exit(1); }
  const fields = Array.from(new Set(arr.map((x) => x.field)));
  const allow = arr.filter((x) => x.s0 !== x.s1).map((x) => [action, x.path]);
  rules.push({ id: 'c11-' + action, field: fields, action: action, expect: arr.length, allowSigma: allow, ev: meta.ev, why: meta.why });
}
fs.writeFileSync(path.join(ROOT, 'tools/golden/planned-changes.json'), JSON.stringify(rules, null, 1), 'utf8');
console.log('规则 ' + rules.length + ' 条，覆盖 ' + arr_reduce(rules) + ' 项');
function arr_reduce(rs) { return rs.reduce((n, r) => n + r.expect, 0); }
for (const r of rules) console.log('  ' + r.id + ' expect=' + r.expect + ' allowSigma=' + r.allowSigma.length + ' fields=[' + r.field.join(',') + ']');
