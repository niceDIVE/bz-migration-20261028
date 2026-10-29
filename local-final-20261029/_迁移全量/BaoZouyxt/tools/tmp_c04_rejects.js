'use strict';
const fs = require('fs');
const crypto = require('crypto');
const lines = fs.readFileSync('F:/BaoZouyxt/tools/index.js', 'utf8').split('\n');
function evOf(n) {
  const l = (lines[n - 1] || '').trim();
  const sha = crypto.createHash('sha1').update(l).digest('hex').slice(0, 8);
  return 'index.js:' + n + '#' + sha;
}
const p = 'F:/BaoZouyxt/tools/facts/reject-codes.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
const T2 = '客户端对该码无专属文案分支或走通用提示 -> tier 2 静默/通用，宁可不提示也不弹错文案';
const entries = {
  proposeNpc: { ev: 77123, note: '提亲。eRet 11=已婚(1137) 12=不在 propose.json(1166) 2=其他。状态写 s.marryObj.proposeNpc。',
    codes: [{ code: 11, role: 'reject', reasons: ['alreadyMarried'], tier: 2, tierWhy: T2, ev: evOf(77123) },
            { code: 12, role: 'reject', reasons: ['notInTable'], tier: 2, tierWhy: T2, ev: evOf(77127) },
            { code: 2, role: 'reject', reasons: ['default'], tier: 2, tierWhy: T2, ev: evOf(77127) }] },
  marryNpc: { ev: 77236, note: '结婚。3=已婚(1137) 4=未提亲(1135)。写 s.marryObj.marryNpc/marryTime。',
    codes: [{ code: 3, role: 'reject', reasons: ['alreadyMarried'], tier: 2, tierWhy: T2, ev: evOf(77254) },
            { code: 4, role: 'reject', reasons: ['notProposed'], tier: 2, tierWhy: T2, ev: evOf(77254) },
            { code: 2, role: 'reject', reasons: ['default'], tier: 2, tierWhy: T2, ev: evOf(77254) }] },
  divorceNpc: { ev: 77257, note: '离婚。未婚回 2(1139)；已婚清婚姻字段（childObj 保留）。',
    codes: [{ code: 2, role: 'reject', reasons: ['default'], tier: 2, tierWhy: T2, ev: evOf(77264) }] },
  beginWedding: { ev: 77272, note: '婚礼开始。未婚回 2（回调只有 1 分支）。',
    codes: [{ code: 2, role: 'reject', reasons: ['default'], tier: 2, tierWhy: T2, ev: evOf(77273) }] },
  makeLove: { ev: 77278, note: '同床。未婚/choose 不在 make.json 回 2；makeID 显示型；妊娠(5)未建模。',
    codes: [{ code: 2, role: 'reject', reasons: ['default'], tier: 2, tierWhy: T2, ev: evOf(77280) }] },
  birthChild: { ev: 77352, note: '出生。妊娠/childObj 形状无证据 -> eRet 2 静默（77353 非 1 无分支）。',
    codes: [{ code: 2, role: 'reject', reasons: ['default'], tier: 2, tierWhy: T2, ev: evOf(77353) }] },
  chooseSex: { ev: 24688, note: '选性别（生育流）。3 -> getText(2131)。',
    codes: [{ code: 3, role: 'reject', reasons: ['default'], tier: 2, tierWhy: T2, ev: evOf(24692) }] },
  adoptChild: { ev: 24694, note: '领养（原版付费）。childObj 形状无证据 -> eRet 2 走 openChargeList（客户端自有表达）。',
    codes: [{ code: 2, role: 'reject', reasons: ['default'], tier: 2, tierWhy: T2, ev: evOf(24698) }] },
  giveChildName: { ev: 24621, note: '孩子取名。无孩子 -> 2（else -> getText(427)）。',
    codes: [{ code: 2, role: 'reject', reasons: ['default'], tier: 2, tierWhy: T2, ev: evOf(24625) }] },
  childWashProperty: { ev: 24627, note: '洗孩子属性。属性模型未建模 -> 2（else -> openChargeList）。',
    codes: [{ code: 2, role: 'reject', reasons: ['default'], tier: 2, tierWhy: T2, ev: evOf(24636) }] },
  resetChildFoster: { ev: 24638, note: '重置寄养。4 -> getText(4753)。',
    codes: [{ code: 4, role: 'reject', reasons: ['default'], tier: 2, tierWhy: T2, ev: evOf(24655) }] },
  addChildFoster: { ev: 60043, note: '寄养互动。2/3/4 -> cc.log 静默（scripts2.js:12953；消费端不在 index.js，ev 取 HttpConst 定义行）。',
    codes: [{ code: 2, role: 'reject', reasons: ['default'], tier: 2, tierWhy: T2, ev: evOf(60043) }] },
  upgradeWifeLevel: { ev: 145326, note: '妻子升级。客户端传 lv/exp/pot 不可信且无存档槽 -> 2 静默。',
    codes: [{ code: 2, role: 'reject', reasons: ['default'], tier: 2, tierWhy: T2, ev: evOf(145327) }] },
  UserWifeProp: { ev: 145333, note: '用妻子道具。经验无存档槽，不扣道具 -> 2 静默。',
    codes: [{ code: 2, role: 'reject', reasons: ['default'], tier: 2, tierWhy: T2, ev: evOf(145334) }] },
  ChooseGirl: { ev: 51125, note: '邀请姑娘。价格无源 -> 2（else -> getText(1088)）。',
    codes: [{ code: 2, role: 'reject', reasons: ['default'], tier: 2, tierWhy: T2, ev: evOf(51143) }] },
  Whoring: { ev: 51145, note: '逛青楼。消耗无源 -> 2 静默。',
    codes: [{ code: 2, role: 'reject', reasons: ['default'], tier: 2, tierWhy: T2, ev: evOf(51146) }] },
  getLikeEvent: { ev: 51155, note: '邀请事件拉取。走客户端自有"无事件"流 eRet 4（dialog 1810121），不伪造 like_event。',
    codes: [{ code: 4, role: 'reject', reasons: ['noEvent'], tier: 2, tierWhy: T2, ev: evOf(51160) }] },
  optionLikeEvent: { ev: 51165, note: '邀请选项。无事件模型 -> 2（else -> getText(1455)）。',
    codes: [{ code: 2, role: 'reject', reasons: ['default'], tier: 2, tierWhy: T2, ev: evOf(51174) }] },
};
let added = 0;
for (const k of Object.keys(entries)) {
  if (j[k]) { console.log('skip (exists):', k); continue; }
  const e = entries[k];
  j[k] = { success: [1], handled: [1], promptOnly: [], defaultCode: e.codes[0].code, codes: e.codes };
  // defaultCode 规则：无 default reason 时取唯一码；多码时取带 default 的那条
  const withDefault = e.codes.filter((c) => c.reasons.indexOf('default') >= 0);
  j[k].defaultCode = withDefault.length ? withDefault[0].code : e.codes[0].code;
  added++;
}
fs.writeFileSync(p, JSON.stringify(j, null, 1) + '\n', 'utf8');
console.log('added', added, 'actions; total', Object.keys(j).length);
