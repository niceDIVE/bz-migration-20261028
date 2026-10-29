/* tmp_planned_c13.js —— 第 14 批 C13〔UFO 夹娃娃〕形状冻结审批（2026-10-27）
 * 机制同 tmp_planned_c12.js。 */
const fs = require('fs');
const path = require('path');
const ROOT = 'F:/BaoZouyxt';
const lines = fs.readFileSync(ROOT + '/batch14-facts-20261027/tmp_diff_raw.txt', 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)
  .filter((x) => /^(add|del|value) \|/.test(x));
const leafOfPath = (p) => p.replace(/\[\d+\]/g, '').split('.').pop();

const META = {
  getUFOCatcherData: { ev: 'index.js:60251', why: 'C13 面板开关（夹娃娃机 NPC NpcFuncType97，index.js:87583）：eRet 1 + rewardPool（{难度id:数量}，initItems 25824 按 package_difficulty 摆放）+ 三次数 + signId + note.ivch（首开赠送三档爪子各 3 把，拍板④自定口径）；字段全守卫' },
  rewardUFO: { ev: 'index.js:60254', why: 'C13 抓取：空请求 itemId=0 非爪 → eRet 15（8060 分支 25766；任何非 1 → 客户端恒 CATCH_DOLL_EVENT null 25767，拒绝安全）。拍板②服务端权威判中；成功路径才带 rewardArray/autoRefresh/rewardPool/note' },
  useUFOrefresh: { ev: 'index.js:60253', why: 'C13 刷新（★线上名 useUFOrefresh）：空请求 fresh 档 freeRefreshTimes=1（首开赠送）→ 刷新成功重生成池子 + signId+1；若无偿则 6（8060，25781）' },
  buyUFORefreshTimes: { ev: 'index.js:60252', why: 'C13 买刷新：空请求 fresh save 元宝 0 < 100（拍板⑥自定价）→ eRet 5（3633 分支 25809-25811）；满 3 次 → 7（8060）' },
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
  rules.push({ id: 'c13-' + action, field: fields, action: action, expect: arr.length, allowSigma: allow, ev: meta.ev, why: meta.why });
}
fs.writeFileSync(path.join(ROOT, 'tools/golden/planned-changes.json'), JSON.stringify(rules, null, 1), 'utf8');
console.log('规则 ' + rules.length + ' 条，覆盖 ' + rules.reduce((n, r) => n + r.expect, 0) + ' 项');
for (const r of rules) console.log('  ' + r.id + ' expect=' + r.expect + ' allowSigma=' + r.allowSigma.length + ' fields=[' + r.field.join(',') + ']');
