'use strict';
// 客户端模型模拟器：严格按 M4 的消费语义把 note 应用到一个"客户端视角"的状态上，用来离线做 L2（双路径一致）。
//   ivch  赋值（index.js:64675）　eco  按子键赋值（64698）　skch lv>0 设置 / lv==0 删除（119831-119835）
//   eqch  [0] 删除（64679-64681）；已有且 type==1 的实例只更新 num / weaponSkinId、保留其余本地字段（64683-64686）；
//         否则 parseEq 新建（64688-64690）　attrch 赋值（142390）
// 中层审计 A5（2026-10-23）后的定位：离线 L2 是生成闸门的必要条件，不是真机 L2 的替代。
//   本模型覆盖不了的语义一律报 UNMODELED（不能判 PASS），而不是静默放过或误判不一致：
//   · eco.exp / attrch 中除 hunger 外的键：M3 存档字典里没有对应存档字段（M4:79、M4:109），离线无真值可比
//   · attrch.mpTrained：客户端用 getMaxNGBonus() 夹取（M4:109），夹取上限材料未提供
//   · gemch：M2 scripts3.js:24482 有监听，语义未进 M4
//   · 存档里投射器不覆盖的域发生变化（titles、vip、任务进度……）
//   覆盖不了、也不报的（只有真机能测）：次消费点（ivch 第一键当 shopId M4:50、eco 附派 SHOP_BUY_ITEM M4:80、
//   skch 第一键弹窗 M4:96）、键序、子表事件先于协议应答的时序（M4:38）、监听器异常（L0）。
const ECO2SAVE = { coins: 'coins', ptt: 'potential', gold: 'gold', yuanbao: 'yuanbao', chips: 'chip' };
const ATTR2SAVE = { hunger: 'hunger' };
const MODELED_SAVE_DOMAINS = ['bag', ...Object.values(ECO2SAVE), 'skills', 'playerEquip', 'equipments', ...Object.values(ATTR2SAVE), 'hungerMax'];
function fromSave(s) {
  const m = { bag: {}, wallet: {}, skills: {}, equips: {}, attrs: {} };
  for (const [k, v] of Object.entries(s.bag || {})) if (v) m.bag[k] = v;
  for (const [e, sk] of Object.entries(ECO2SAVE)) if (typeof s[sk] === 'number') m.wallet[e] = s[sk];
  for (const [k, v] of Object.entries(s.skills || {})) m.skills[k] = v.slice();
  for (const [k, v] of Object.entries(s.playerEquip || {})) m.equips[k] = JSON.parse(JSON.stringify(v));
  for (const [a, sk] of Object.entries(ATTR2SAVE)) if (typeof s[sk] === 'number') m.attrs[a] = s[sk];
  return m;
}
// 返回 unmodeled：本次 note 里离线模型无法判定的部分（调用方必须把它当"不能 PASS"）
function applyNote(m, note) {
  const unmodeled = [];
  if (!note) return { model: m, unmodeled };
  for (const [k, v] of Object.entries(note.ivch || {})) { if (v) m.bag[k] = v; else delete m.bag[k]; }
  for (const [k, v] of Object.entries(note.eco || {})) { if (k in ECO2SAVE) m.wallet[k] = v; else unmodeled.push(`eco.${k}`); }
  for (const [k, v] of Object.entries(note.skch || {})) { if (v[0] > 0) m.skills[k] = v.slice(); else if (v[0] === 0) delete m.skills[k]; }
  for (const [k, v] of Object.entries(note.eqch || {})) {
    if (v[0] === 0) { delete m.equips[k]; continue; }
    const cur = m.equips[k];
    if (Array.isArray(cur) && cur[0] === 1) { cur[1] = v[1][1]; if (v[1].length > 2) cur[2] = v[1][2]; } // M4:66 更新分支
    else m.equips[k] = JSON.parse(JSON.stringify(v[1]));
  }
  for (const [k, v] of Object.entries(note.attrch || {})) { if (k in ATTR2SAVE) m.attrs[k] = v; else unmodeled.push(`attrch.${k}`); }
  for (const k of Object.keys(note)) if (!['ivch', 'eco', 'skch', 'eqch', 'attrch'].includes(k)) unmodeled.push(`note.${k}`);
  return { model: m, unmodeled };
}
function unmodeledSaveChanges(before, after) {
  const A = new Set(MODELED_SAVE_DOMAINS), bad = [];
  for (const k of new Set([...Object.keys(before || {}), ...Object.keys(after || {})])) if (!A.has(k) && JSON.stringify(before[k]) !== JSON.stringify(after[k])) bad.push(`save.${k}`);
  return bad;
}
module.exports = { fromSave, applyNote, unmodeledSaveChanges, MODELED_SAVE_DOMAINS };
