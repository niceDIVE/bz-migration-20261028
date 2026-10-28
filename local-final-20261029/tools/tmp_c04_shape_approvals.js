'use strict';
/** 一次性脚本：写 C04 形状审批三件套（跑完即删或留档均可）。 */
const fs = require('fs');
const GOLD = 'F:/BaoZouyxt/tools/golden/';
function read(p) { return JSON.parse(fs.readFileSync(GOLD + p, 'utf8')); }
function write(p, v) { fs.writeFileSync(GOLD + p, JSON.stringify(v, null, 1) + '\n', 'utf8'); }

/* ── approved-narrowing.json：21 个 del（escape closed）── */
const nar = read('approved-narrowing.json');
const N = [
  ['ChooseGirl', 'eTime', '邀请姑娘锁死（价格无源）：应答恒 eRet 2，客户端 else 分支只弹 getText(1088)（index.js:51143），不读 eTime。成功路径将来解锁时照常下发。'],
  ['ChooseGirl', 'npcID', '同上：锁死分支不读 npcID。'],
  ['UserWifeProp', 'exp', '用妻子道具锁死（妻子经验无存档槽，用了=白吃道具）：eRet 2 静默（index.js:145334 非 1 无分支），不读 lv/exp。'],
  ['UserWifeProp', 'lv', '同上。'],
  ['Whoring', 'makeID', '逛青楼锁死（消耗无源）：eRet 2，客户端非 1 无分支（index.js:51146），不读 makeID。'],
  ['adoptChild', 'childObj', '领养锁死（childObj 形状无证据，造形状=子 UI 崩点）：eRet 2 走 openChargeList（index.js:24698，原版本就是付费功能），不读 childObj。'],
  ['birthChild', 'childObj', '出生锁死（妊娠未建模，makeLove 的 eRet 5 分支从不走）：eRet 2 静默（index.js:77353 非 1 无分支）。'],
  ['childWashProperty', 'attArr', '洗孩子属性锁死（属性模型未建模）：eRet 2 走 openChargeList（index.js:24636），不读 attArr/baseArr。'],
  ['childWashProperty', 'attrList', '同上：eRet 4（开洗练 UI）也不走，不读 attrList。'],
  ['childWashProperty', 'baseArr', '同上。'],
  ['divorceNpc', 'npcID', '形状表默认值变化：成功路径仍回 npcID=旧配偶 id（动态值）；未婚拒绝（eRet 2）客户端只弹 getText(1139)（index.js:77264），不读 npcID。'],
  ['getLikeEvent', 'eventId', '恒走 eRet 4（客户端自有"无事件"流 dialog 1810121，index.js:51160-51162），不伪造 like_event，故 eventId 不再发。'],
  ['giveChildName', 'childName', '取名锁死（无孩子来源）：eRet 2（else -> getText(427)，index.js:24625），不读 childName。'],
  ['makeLove', 'fetationTime', 'fetationTime 只在妊娠分支（eRet 5，index.js:77285）被读；妊娠未建模恒不发，eRet 1 路径不读该字段。'],
  ['marryNpc', 'npcID', '形状表默认值变化：成功路径仍回 npcID（动态值）；拒绝分支 3/4/2 只弹文案（index.js:77254），不读 npcID。'],
  ['optionLikeEvent', 'feel', '无事件模型（getLikeEvent 恒 4）→ 本动作到不了成功态；eRet 2 else 分支只弹 getText(1455)（index.js:51174）。'],
  ['optionLikeEvent', 'npcId', '同上。'],
  ['proposeNpc', 'npcID', '形状表默认值变化：成功路径仍回 npcID（动态值）；拒绝 11/12/2 只弹文案（index.js:77127），不读 npcID。'],
  ['resetChildFoster', 'playArr', '寄养重置锁死：eRet 4 -> getText(4753)（index.js:24655），不读 playArr/foster_point。'],
  ['upgradeWifeLevel', 'exp', '妻子升级锁死（客户端传 lv/exp/pot 不可信且无存档槽）：eRet 2 静默（index.js:145327 非 1 无分支）。'],
  ['upgradeWifeLevel', 'lv', '同上。'],
];
for (const [action, path, reason] of N) {
  if (nar.some((r) => r.action === action && r.path === path)) continue;
  nar.push({ action, path, escape: 'closed', reason, ev: 'index.js:77127' });
}
write('approved-narrowing.json', nar);

/* ── approved-widening.json：1 个 add ── */
const wid = read('approved-widening.json');
if (!wid.some((r) => r.action === 'marryAward' && r.path === 'equipObj')) {
  wid.push({ action: 'marryAward', path: 'equipObj', reason: '第 6 批 C04 新 handler：宾客礼金回 eRet 1 + 空 rewardArray/equipObj（礼金无服务端表，少发方向）；equipObj 空对象对 index.js:1620 isNullMap 安全。', ev: 'index.js:77269' });
}
write('approved-widening.json', wid);

/* ── planned-changes.json：覆盖全部 39 项差异 ── */
const eretActions = ['ChooseGirl','UserWifeProp','Whoring','adoptChild','beginWedding','birthChild','childWashProperty','chooseSex','divorceNpc','getLikeEvent','giveChildName','makeLove','marryNpc','optionLikeEvent','proposeNpc','resetChildFoster','upgradeWifeLevel'];
const planned = [
  { id: 'c04-eret', field: ['eRet'], expect: eretActions.length, allowSigma: eretActions.map((a) => [a, 'eRet']), ev: 'index.js:77127' },
  { id: 'c04-npcid', field: ['npcID'], expect: 4, allowSigma: [['ChooseGirl','npcID'],['divorceNpc','npcID'],['marryNpc','npcID'],['proposeNpc','npcID']], ev: 'index.js:77125' },
  { id: 'c04-npcid-lower', field: ['npcId'], expect: 1, allowSigma: [['optionLikeEvent','npcId']], ev: 'index.js:51168' },
  { id: 'c04-wife', field: ['exp','lv'], expect: 4, allowSigma: [['UserWifeProp','exp'],['UserWifeProp','lv'],['upgradeWifeLevel','exp'],['upgradeWifeLevel','lv']], ev: 'index.js:145326' },
  { id: 'c04-childobj', field: ['childObj'], expect: 2, allowSigma: [['adoptChild','childObj'],['birthChild','childObj']], ev: 'index.js:77355' },
  { id: 'c04-misc', field: ['eTime','makeID','attArr','attrList','baseArr','eventId','childName','fetationTime','feel','playArr'], expect: 10, allowSigma: [['ChooseGirl','eTime'],['Whoring','makeID'],['childWashProperty','attArr'],['childWashProperty','attrList'],['childWashProperty','baseArr'],['getLikeEvent','eventId'],['giveChildName','childName'],['makeLove','fetationTime'],['optionLikeEvent','feel'],['resetChildFoster','playArr']], ev: 'index.js:77285' },
  { id: 'c04-marryaward-equipobj', field: ['equipObj'], expect: 1, allowSigma: [['marryAward','equipObj']], ev: 'index.js:77269' },
];
write('planned-changes.json', planned);
console.log('narrowing:', nar.length, 'widening:', wid.length, 'planned rules:', planned.length);
