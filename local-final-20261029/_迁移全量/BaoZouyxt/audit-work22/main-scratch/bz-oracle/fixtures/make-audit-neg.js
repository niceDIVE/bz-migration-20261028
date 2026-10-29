#!/usr/bin/env node
// 中层审计（2026-10-23）A2 假 PASS 复现 → 反例用例库。每个用例都必须被裁判判 FAIL（selftest 第 18 步）。
// 由干净用例改出，审计报告的复现编号写在 id 里。
'use strict';
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, 'audit-neg');
fs.rmSync(D, { recursive: true, force: true }); fs.mkdirSync(D, { recursive: true });
const load = f => JSON.parse(fs.readFileSync(path.join(__dirname, 'cases', f), 'utf8'));
const put = (name, c) => fs.writeFileSync(path.join(D, name + '.json'), JSON.stringify(c, null, 2));
const c01 = load('01-upgradeSkill-orig0036.json'), c02 = load('02-buyShopItem-2001x2.json');
const strip = c => { delete c.scenario; delete c.seq; return c; };

// FP1 无契约动作
put('fp1-no-contract', strip({ ...JSON.parse(JSON.stringify(c02)), id: 'audit.fp1.no-contract', action: 'User.GhostAction', req: { mod: 'User', do: 'GhostAction', p: {} },
  resp: { eRet: 1, anythingJunk: { deep: [1, 2] } }, envelope: undefined, snapA: undefined, snapB: undefined, saveAfter: c02.saveBefore }));
// FP2a meta.abolish 未登记
{ const c = JSON.parse(JSON.stringify(c01)); c.id = 'audit.fp2a.abolish'; const sid = Object.keys(c.resp.note.skch)[0];
  c.resp.note.skch[sid] = [0, 0, 0]; c.meta = { abolish: true }; delete c.template; delete c.snapA; delete c.snapB; put('fp2a-abolish', strip(c)); }
// FP2b meta.fullReload 未登记：存档变了但不发 note
{ const c = JSON.parse(JSON.stringify(c02)); c.id = 'audit.fp2b.fullreload'; c.resp = { eRet: 1 }; c.meta = { fullReload: true }; delete c.envelope; delete c.snapA; delete c.snapB; put('fp2b-fullreload', strip(c)); }
// FP2c meta.l4Allow 未登记：缺整个 note 仍想过 L4
{ const c = JSON.parse(JSON.stringify(c01)); c.id = 'audit.fp2c.l4allow'; c.resp = { eRet: 1 }; c.meta = { l4Allow: ['note'] };
  delete c.saveBefore; delete c.saveAfter; delete c.snapA; delete c.snapB; delete c.envelope; put('fp2c-l4allow', strip(c)); }
// FP3 探针没挂上
{ const c = JSON.parse(JSON.stringify(c02)); c.id = 'audit.fp3.probe-none'; c.probe = { mode: 'none' }; put('fp3-probe-none', strip(c)); }
// FP4 无存档 + 发离谱绝对值（判级需 --require-save；不带该开关时至少 WARN L1.NO_SAVE）
{ const c = JSON.parse(JSON.stringify(c02)); c.id = 'audit.fp4.no-save'; c.resp = { eRet: 1, note: { ivch: { 2001: 999 }, eco: { coins: 123456 } } };
  delete c.saveBefore; delete c.saveAfter; delete c.snapA; delete c.snapB; delete c.envelope; put('fp4-no-save', strip(c)); }
console.log('audit-neg：' + fs.readdirSync(D).length + ' 个反例用例');
