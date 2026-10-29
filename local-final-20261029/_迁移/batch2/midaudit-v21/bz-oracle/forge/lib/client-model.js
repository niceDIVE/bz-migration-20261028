'use strict';
// 客户端模型模拟器：严格按 M4 的消费语义把 note 应用到一个"客户端视角"的状态上，用来离线做 L2（双路径一致）。
//   ivch  赋值（index.js:64675）　eco  按子键赋值（64698）　skch lv>0 设置 / lv==0 删除（119831-119835）
//   eqch  [0] 删除 / [1,[...]] 新增或更新（64679-64690）　attrch 赋值（142390）
const ECO2SAVE = { coins: 'coins', ptt: 'potential', gold: 'gold', yuanbao: 'yuanbao', chips: 'chip' };
function fromSave(s) {
  const m = { bag: {}, wallet: {}, skills: {}, equips: {}, attrs: {} };
  for (const [k, v] of Object.entries(s.bag || {})) if (v) m.bag[k] = v;
  for (const [e, sk] of Object.entries(ECO2SAVE)) if (typeof s[sk] === 'number') m.wallet[e] = s[sk];
  for (const [k, v] of Object.entries(s.skills || {})) m.skills[k] = v.slice();
  for (const [k, v] of Object.entries(s.playerEquip || {})) m.equips[k] = JSON.parse(JSON.stringify(v));
  if (typeof s.hunger === 'number') m.attrs.hunger = s.hunger;
  return m;
}
function applyNote(m, note) {
  if (!note) return m;
  for (const [k, v] of Object.entries(note.ivch || {})) { if (v) m.bag[k] = v; else delete m.bag[k]; }
  for (const [k, v] of Object.entries(note.eco || {})) m.wallet[k] = v;
  for (const [k, v] of Object.entries(note.skch || {})) { if (v[0] > 0) m.skills[k] = v.slice(); else if (v[0] === 0) delete m.skills[k]; }
  for (const [k, v] of Object.entries(note.eqch || {})) { if (v[0] === 0) delete m.equips[k]; else m.equips[k] = JSON.parse(JSON.stringify(v[1])); }
  for (const [k, v] of Object.entries(note.attrch || {})) m.attrs[k] = v;
  return m;
}
module.exports = { fromSave, applyNote };
