'use strict';
/**
 * save-migrate.js —— 存档版本化 / 迁移 / 守卫 回归（A03 采信落地的验收网）
 *
 * 依据：docs/sota/A03-save-versioning/adopted.md
 * 五个断言组（对应外部顾问给的 A03-4）：
 *   1. 混形态归一：裸数字技能 → [等级,0,1]，数组原样
 *   2. 幂等：migrate(migrate(x)) === migrate(x)（对 4 份历史快照 + 混形态样本）
 *   3. rewarded：只补 []，绝不回填 done
 *   4. 不丢数据：迁移前后背包总量 / done 集合 / 技能等级相等
 *   5. 版本守卫：saveVersion > LATEST 时拒绝写回（写次数 0）
 * 另加：写前语义守卫（技能降级 / done 减少 / 背包清空 必须被拒）
 *
 * 退出码 0 = 全过；1 = 有失败。
 */
const fs = require('fs');
const path = require('path');
const { createBzServer } = require(path.join(__dirname, '..', 'core', 'bz-rpc-server.js'));
const tpl = require(path.join(__dirname, '..', 'core', 'templates.json'));

let pass = 0; const fails = [];
function ck(name, cond, info) { if (cond) { pass++; return; } fails.push({ name, info }); }
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

const srv = createBzServer({
  now: () => 1792600000000, log: () => {}, templates: tpl, codec: null,
  readSave: () => null, writeSave: () => {}, sandbox: true,
});
const I = srv._internal;
const mig = I.migrateSave, val = I.validateSave, guard = I.guardSave;

/* ---------- 1. 混形态归一 ---------- */
const mixed = { roleID: 1, skills: { a: 3, b: [5, 7, 2], c: [10, 0, 1] }, bag: { '3626': 1 }, done: [], accepted: [], rewarded: [] };
const m1 = mig(mixed);
ck('mixed:bare', eq(m1.skills.a, [3, 0, 1]), m1.skills.a);
ck('mixed:array', eq(m1.skills.b, [5, 7, 2]), m1.skills.b);
ck('mixed:keep', eq(m1.skills.c, [10, 0, 1]), m1.skills.c);
ck('mixed:version', m1.saveVersion === I.LATEST_SAVE, m1.saveVersion);
ck('mixed:validate', val(m1) === true, null);

/* ---------- 2. 幂等（含 4 份历史快照） ---------- */
const snapshots = [
  '2026-10-22-012652-pre-bagprobe',
  '2026-10-22-0205-pre-selfcheck-isolation',
  '2026-10-22-0232-pre-skill-target',
  '2026-10-22-0250-pre-pgr-persist',
].map((d) => path.join(__dirname, '..', '..', '_backup', d, 'bz_offline_save.json'));

const loaded = [];
for (const p of snapshots) {
  if (!fs.existsSync(p)) { fails.push({ name: 'fixture:missing', info: p }); continue; }
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  loaded.push({ p, raw, once: mig(raw) });
}
ck('fixtures:found', loaded.length === 4, loaded.length);
for (const f of loaded) {
  const twice = mig(f.once);
  ck('idempotent:' + path.basename(path.dirname(f.p)), eq(twice, f.once), { once: f.once.skills, twice: twice.skills });
}
ck('idempotent:mixed', eq(mig(m1), m1), null);

/* ---------- 3. rewarded 只补 []，不回填 done ---------- */
const v3 = { roleID: 1, skills: {}, bag: {}, accepted: [], done: ['q1', 'q2'] };   // 没有 rewarded
ck('rewarded:empty', eq(mig(v3).rewarded, []), mig(v3).rewarded);
const v4 = { roleID: 1, skills: {}, bag: {}, accepted: [], done: ['q1'], rewarded: ['q1'] };
ck('rewarded:keep', eq(mig(v4).rewarded, ['q1']), mig(v4).rewarded);
ck('rewarded:noBackfill', mig(v3).rewarded.length === 0, mig(v3).rewarded);

/* ---------- 4. 迁移不丢数据 ---------- */
function bagSum(b) { let t = 0; for (const k in b || {}) t += Number(b[k]) || 0; return t; }
function lvOf(v) { return typeof v === 'number' ? v : (Array.isArray(v) ? v[0] : 0); }
for (const f of loaded) {
  const a = f.raw, b = f.once;
  ck('noLoss:bag:' + path.basename(path.dirname(f.p)), bagSum(a.bag) === bagSum(b.bag), [bagSum(a.bag), bagSum(b.bag)]);
  const da = (a.done || []).slice().sort().join(','), db = (b.done || []).slice().sort().join(',');
  ck('noLoss:done:' + path.basename(path.dirname(f.p)), da === db, [a.done, b.done]);
  const sa = Object.keys(a.skills || {}), sb = Object.keys(b.skills || {});
  ck('noLoss:skillKeys:' + path.basename(path.dirname(f.p)), eq(sa.sort(), sb.sort()), [sa, sb]);
  let same = true, detail = {};
  for (const k of sa) {
    const x = lvOf(a.skills[k]), y = lvOf(b.skills[k]);
    if (x !== y) { same = false; detail[k] = [x, y]; }
  }
  ck('noLoss:skillLv:' + path.basename(path.dirname(f.p)), same, detail);
}

/* ---------- 5. 版本守卫：更新的存档一律不写回 ---------- */
function makeSrv(seed) {
  let store = JSON.stringify(seed);
  const s = createBzServer({
    now: () => 1792600000000, log: () => {}, templates: tpl, codec: null,
    readSave: () => store, writeSave: (k, v) => { store = v; }, sandbox: true,
  });
  return { s, get store() { return store; } };
}
const newer = makeSrv({ roleID: 1, saveVersion: 99, skills: { a: [5, 0, 1] }, bag: { '3626': 1 }, accepted: [], done: [], rewarded: [] });
const before = newer.store;
newer.s.dispatch('User', 'useItem', { itemID: 3626, itemNum: 1 });   // 会尝试写档
ck('newer:noWrite', newer.store === before, { before: before.length, after: newer.store.length });
ck('newer:readonly', newer.s._internal.isReadOnly() === true, newer.s._internal.isReadOnly());

/* 截断档：解析失败 → 只读，不许覆盖成空档 */
const broken = makeSrv('{ this is not json');
const brokenBefore = broken.store;
broken.s.dispatch('User', 'useItem', { itemID: 3626, itemNum: 1 });
ck('broken:noOverwrite', broken.store === brokenBefore, broken.store);
ck('broken:readonly', broken.s._internal.isReadOnly() === true, broken.s._internal.isReadOnly());

/* ---------- 6. 写前语义守卫 ---------- */
const base = { skills: { 1: [10, 0, 1] }, bag: { '3626': 1 }, done: ['q1'], rewarded: ['q1'] };
ck('guard:skillDown', guard(base, { skills: { 1: [2, 0, 1] }, bag: base.bag, done: base.done, rewarded: base.rewarded }) !== null, null);
ck('guard:doneDown', guard(base, { skills: base.skills, bag: base.bag, done: [], rewarded: base.rewarded }) !== null, null);
ck('guard:rewardedDown', guard(base, { skills: base.skills, bag: base.bag, done: base.done, rewarded: [] }) !== null, null);
ck('guard:bagCleared', guard(base, { skills: base.skills, bag: {}, done: base.done, rewarded: base.rewarded }) !== null, null);
ck('guard:normal', guard(base, { skills: { 1: [11, 0, 1] }, bag: { '3626': 2 }, done: base.done, rewarded: base.rewarded }) === null, null);

/* ---------- 7. 守卫拒绝时必须回滚内存（A04-3：否则坏值继续被投射成应答） ---------- */
const roll = makeSrv({ roleID: 1, saveVersion: 4, skills: { '1': [10, 0, 1] }, bag: {}, accepted: [], done: [], rewarded: [] });
roll.s.loadSave();
roll.s.dispatch('User', 'bzPatch', { set: { skills: { '1': [2, 0, 1] } } });   // 降级 = 必被拒
ck('rollback:disk', roll.store.indexOf('"skills":{"1":[10,0,1]}') >= 0, roll.store.slice(0, 120));
ck('rollback:memory', roll.s.loadSave().skills['1'][0] === 10, roll.s.loadSave().skills);

/* ---------- 8. 维护动作写前备份（A04-4：bzPatch 等必须留一份 pre-maint） ---------- */
const aux = [];
let auxStore = JSON.stringify({ roleID: 1, saveVersion: 4, skills: {}, bag: {}, accepted: [], done: [], rewarded: [] });
const maint = createBzServer({
  now: () => 1, log: () => {}, templates: tpl, codec: null,
  readSave: () => auxStore, writeSave: (k, v) => { auxStore = v; }, sandbox: true,
  writeAux: (suffix, text) => { aux.push({ suffix, bytes: text.length }); return true; },
});
maint.dispatch('User', 'bzPatch', { set: { school: 3 } });
ck('maint:backup', aux.length === 1 && aux[0].suffix === 'pre-maint.json', aux);
ck('maint:applied', JSON.parse(auxStore).school === 3, JSON.parse(auxStore).school);

console.log(JSON.stringify({
  passed: pass, failed: fails.length, fails,
  latest: I.LATEST_SAVE,
  fixtures: loaded.map((f) => path.basename(path.dirname(f.p))),
}, null, 2));
process.exit(fails.length === 0 ? 0 : 1);
