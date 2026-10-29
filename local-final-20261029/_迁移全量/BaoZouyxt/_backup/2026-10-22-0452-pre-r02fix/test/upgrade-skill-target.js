'use strict';
/**
 * upgrade-skill-target.js —— 技能升级「目标等级 / 取消不涨级」回归用例
 *
 * 输入全部来自端上真实请求（2026-10-22 02:31 用户连点 7 次的 bz_log.jsonl），
 * 在**内存存档**上跑，不碰设备、不碰真存档。
 *
 * 判据（本轮定死）：
 *   1. skillArr[0] 是目标等级 → 账本要涨到目标（允许一次跳多级）
 *   2. 目标 ≤ 当前 = 取消/重复 → 等级与潜能都不动
 *   3. pgr / brlv 按请求回显，不硬写 0/1
 *   4. 潜能按「涨了几级」扣，100/级
 *   5. 空参数绝不能造出 skills["0"]
 *
 * 退出码 0 = 全部通过；1 = 有失败。
 */
const path = require('path');
const { createBzServer } = require(path.join(__dirname, '..', 'core', 'bz-rpc-server.js'));
const tpl = require(path.join(__dirname, '..', 'core', 'templates.json'));

const BASE = { roleID: 16374, skills: { '1': [12, 0, 1] }, potential: 98699, accepted: [], done: [] };
let store = JSON.stringify(BASE);
const srv = createBzServer({
  now: () => 1792600000000, log: () => {}, templates: tpl, codec: null,
  readSave: () => store, writeSave: (k, v) => { store = v; }, sandbox: true,
});

const save = () => JSON.parse(store);
const up = (p) => (srv.dispatch('User', 'upgradeSkill', p) || {})['User.upgradeSkill'] || {};

let pass = 0; const fails = [];
function ck(name, cond, info) { if (cond) { pass++; return; } fails.push({ name, info }); }

/* 1. 真实第 1 次：账本 12，请求 [15,0,1] → 15，扣 300 */
let r = up({ skillID: 1, skillArr: [15, 0, 1], NPCID: 1003, flag: 0 });
ck('jump:lv', save().skills['1'][0] === 15, save().skills['1']);
ck('jump:pot', save().potential === 98699 - 300, save().potential);
ck('jump:skch', JSON.stringify(r.note && r.note.skch && r.note.skch['1']) === JSON.stringify([15, 0, 1]), r.note && r.note.skch);
ck('jump:ret', r.eRet === 1, r.eRet);

/* 2. 真实第 2 次（用户点的是取消）：账本已是 15，请求 [15,0,1] → 不动、不扣 */
r = up({ skillID: 1, skillArr: [15, 0, 1], NPCID: 1003, flag: 0 });
ck('cancel:lv', save().skills['1'][0] === 15, save().skills['1']);
ck('cancel:pot', save().potential === 98699 - 300, save().potential);
ck('cancel:skchEcho', JSON.stringify(r.note && r.note.skch && r.note.skch['1']) === JSON.stringify([15, 0, 1]), r.note && r.note.skch);

/* 3. 真实第 3 次：账本 15，请求 [17,2,1] → 17、扣 200、pgr/brlv 回显 */
r = up({ skillID: 1, skillArr: [17, 2, 1], NPCID: 1003, flag: 0 });
ck('again:lv', save().skills['1'][0] === 17, save().skills['1']);
ck('again:pgr', save().skills['1'][1] === 2, save().skills['1']);
ck('again:brlv', save().skills['1'][2] === 1, save().skills['1']);
ck('again:pot', save().potential === 98699 - 500, save().potential);
ck('again:skchPgr', JSON.stringify(r.note.skch['1']) === JSON.stringify([17, 2, 1]), r.note.skch);

/* 4. 回退请求 [19,...] 低于当前 17？不，这里用 [12,0,1] 模拟取消时客户端算出低值 → 不动 */
r = up({ skillID: 1, skillArr: [12, 0, 1], NPCID: 1003, flag: 0 });
ck('regress:lv', save().skills['1'][0] === 17, save().skills['1']);
ck('regress:pot', save().potential === 98699 - 500, save().potential);

/* 5. 空参数（自检就这么打）：绝不能造出 skills["0"] */
up({});
ck('empty:noSkill0', !Object.prototype.hasOwnProperty.call(save().skills, '0'), Object.keys(save().skills));

/* 6. 直接从 0 学一级：[1,0,1] → 1、扣 100（新技能路径 scripts2.js:13904-13912 发的就是 lv:1） */
r = up({ skillID: 9, skillArr: [1, 0, 1], NPCID: 1003, flag: 0 });
ck('learn1:lv', save().skills['9'][0] === 1, save().skills['9']);
ck('learn1:pot', save().potential === 98699 - 600, save().potential);

/* 7. 真实「取消」参数 [5,6,1]：等级不变，但进度 6 必须落账（面板 (80%)） */
up({ skillID: 7, skillArr: [5, 0, 1], NPCID: 1003, flag: 0 });     // 0 → 5，扣 500
r = up({ skillID: 7, skillArr: [5, 6, 1], NPCID: 1003, flag: 0 });  // 取消：目标=当前、进度 6
ck('pgr:cancelLv', save().skills['7'][0] === 5, save().skills['7']);
ck('pgr:cancelPgr', save().skills['7'][1] === 6, save().skills['7']);
ck('pgr:cancelPot', save().potential === 98699 - 1100, save().potential);
ck('pgr:cancelSkch', JSON.stringify(r.note && r.note.skch && r.note.skch['7']) === JSON.stringify([5, 6, 1]), r.note && r.note.skch);

/* 8. LoadGame 必须把进度原样回放（否则重进游戏又回到 0%） */
const lg = (srv.dispatch('User', 'LoadGame', {}) || {})['User.LoadGame'] || {};
ck('pgr:loadgame', JSON.stringify((lg.skillMap || {})['7']) === JSON.stringify([5, 6, 1]), (lg.skillMap || {})['7']);


console.log(JSON.stringify({
  passed: pass, failed: fails.length, fails,
  finalSkills: save().skills, finalPotential: save().potential,
}, null, 2));
process.exit(fails.length === 0 ? 0 : 1);
