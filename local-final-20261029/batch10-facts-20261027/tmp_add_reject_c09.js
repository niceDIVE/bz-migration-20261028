/* 一次性：把 C09 的 7 个拒绝码登记进 tools\facts\reject-codes.json（ev 由行号+sha8 自动算）
 *  - knackLottery: 5（有提示分支，promptOnly[5], tier 1）
 *  - changeSkillKnack / rgChangeSkillKnack: 2（非 1 无分支，tier 2）
 *  - resolveEquip / batchResolveEquip / resolveKnack / batchResolveKnack: 2（缺产物表，tier 2）
 */
const fs = require('fs');
const crypto = require('crypto');

const ROOT = 'F:/BaoZouyxt';
const P = ROOT + '/tools/facts/reject-codes.json';
const idx = fs.readFileSync(ROOT + '/tools/index.js', 'utf8').split(/\r?\n/);
const sha8 = (t) => crypto.createHash('sha1').update(t, 'utf8').digest('hex').slice(0, 8);
const evAt = (line) => {
  const raw = String(idx[line - 1]).replace(/\r$/, '').trim();
  return 'index.js:' + line + '#' + sha8(raw);
};

const SPEC = [
  ['knackLottery', 60412, 5, 1, '有提示分支：`else 5 == e.eRet && Alert.show(getText(1093))`（scripts3.js:90096）→ 券不足时弹客户端自带文案，不静默',
    '券不足（单抽要 1 张 9191、十连要 10 张），或 BZ_KNACK_LOTTERY 表缺失'],
  ['changeSkillKnack', 60307, 2, 2, '回调非 1 无 else（scripts3.js:81079-81102）→ 静默，少发方向',
    '口诀装不上：skillId 非法，或 knackIds 里没有一条在背包里'],
  ['rgChangeSkillKnack', 60539, 2, 2, '回调非 1 无 else（scripts3.js:73995-74002）→ 静默（注意上游原文拼写 SKNACK，别纠正）',
    '肉鸽里装口诀失败：同 changeSkillKnack'],
  ['resolveEquip', 59653, 2, 2, '装备分解：缺产物表 → 锁。客户端回调把 rewardArray 弹成奖励框（index.js:64926 无守卫），给空奖励等于吞装备',
    '**缺产物表**（444 张 dump 无分解表；tbl_item.decomposition 只有档位 1/2/3、decompose 全 0）'],
  ['batchResolveEquip', 59654, 2, 2, '批量分解：同上（index.js:64934 无守卫）',
    '**缺产物表**，同 resolveEquip'],
  ['resolveKnack', 60308, 2, 2, '口诀合成/分解：缺"几换几"的表 → 锁（回调有 hasOwnProperty("rewardArray") 守卫，不会崩）',
    '**缺口诀合成表**'],
  ['batchResolveKnack', 60309, 2, 2, '批量口诀合成：同上（scripts3.js:81074 有守卫）',
    '**缺口诀合成表**'],
];

const j = JSON.parse(fs.readFileSync(P, 'utf8'));
let added = 0;
for (const [act, line, code, tier, why, note] of SPEC) {
  if (j[act]) { console.log('已存在，跳过', act); continue; }
  const entry = {
    success: [1],
    handled: [1],
    promptOnly: [],
    defaultCode: code,
    codes: [{ code, role: 'reject', reasons: ['default'], tier, ev: evAt(line), note }],
  };
  if (tier === 1) { entry.promptOnly = [code]; entry.codes[0].tierWhy = why; }
  if (tier === 2) entry.codes[0].tierWhy = why;
  j[act] = entry;
  added++;
  console.log('+ ' + act + ' code=' + code + ' tier=' + tier + ' ev=' + entry.codes[0].ev);
}
fs.writeFileSync(P, JSON.stringify(j, null, 1), 'utf8');
console.log('新增 =', added, '顶层键数 =', Object.keys(j).length);
