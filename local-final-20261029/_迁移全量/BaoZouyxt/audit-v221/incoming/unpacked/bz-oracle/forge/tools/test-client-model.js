#!/usr/bin/env node
// 客户端模型单点断言（中层审计 A5/A8#16）：每条断言对应 M4 的一行语义，M4 行号写在名字里。
'use strict';
const { fromSave, applyNote, unmodeledSaveChanges } = require('../lib/client-model');
const T = [];
const t = (name, f) => { try { f(); T.push(['✔', name]); } catch (e) { T.push(['✘', name + '：' + e.message]); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || ''} ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };
const base = () => fromSave({ coins: 100, bag: { 2001: 5 }, skills: { 1: [2, 0, 1] }, playerEquip: { 9: [1, 3, 7, 'local'] }, hunger: 5 });
t('M4:47 ivch 赋值语义（不是加法）', () => { const { model } = applyNote(base(), { ivch: { 2001: 2 } }); eq(model.bag[2001], 2); });
t('M4:47 ivch=0 删除', () => { const { model } = applyNote(base(), { ivch: { 2001: 0 } }); eq(model.bag[2001], undefined); });
t('M4:78 eco 按子键赋值', () => { const { model } = applyNote(base(), { eco: { coins: 7 } }); eq(model.wallet.coins, 7); });
t('M4:79 eco.exp 无存档真值 → UNMODELED（不再误判不一致）', () => { eq(applyNote(base(), { eco: { exp: 999 } }).unmodeled, ['eco.exp']); });
t('M4:95 skch lv=0 删除', () => { const { model } = applyNote(base(), { skch: { 1: [0, 0, 0] } }); eq(model.skills[1], undefined); });
t('M4:66 eqch 已有 type==1：只更新 num/skin，保留本地字段', () => { const { model } = applyNote(base(), { eqch: { 9: [1, [1, 4]] } }); eq(model.equips[9], [1, 4, 7, 'local']); });
t('M4:66 eqch 新实例：parseEq 整体建立', () => { const { model } = applyNote(base(), { eqch: { 10: [1, [2, 1]] } }); eq(model.equips[10], [2, 1]); });
t('M4:65 eqch [0] 删除不看后续', () => { const { model } = applyNote(base(), { eqch: { 9: [0, 'junk'] } }); eq(model.equips[9], undefined); });
t('M4:109 attrch.hunger 赋值', () => { const { model } = applyNote(base(), { attrch: { hunger: 9 } }); eq(model.attrs.hunger, 9); });
t('M4:109 attrch.curhp / mpTrained → UNMODELED', () => { eq(applyNote(base(), { attrch: { curhp: 1, mpTrained: 2 } }).unmodeled, ['attrch.curhp', 'attrch.mpTrained']); });
t('scripts3.js:24482 gemch → UNMODELED（审计 A5#3 假 PASS 通道）', () => { eq(applyNote(base(), { gemch: { 1: 1 } }).unmodeled, ['note.gemch']); });
t('投射器不覆盖的存档域变化 → UNMODELED', () => { eq(unmodeledSaveChanges({ titles: {} }, { titles: { 1: 1 } }), ['save.titles']); });
for (const [k, n] of T) console.log(k + ' ' + n);
const bad = T.filter(x => x[0] === '✘').length;
console.log(bad ? `✘ ${bad} 条不符` : `PASS（${T.length} 条 M4 单点断言）`);
process.exit(bad ? 1 : 0);
