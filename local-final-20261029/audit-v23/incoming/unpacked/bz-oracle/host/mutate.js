#!/usr/bin/env node
// 变异测试：拿"已知会出的错"去考裁判。每个变异在每个适用的干净用例上注入一次，裁判必须判 FAIL。
// node host/mutate.js --cases <干净用例目录> [同 judge.js 的其余参数] [--out out/mutation.json]
// 退出码：0 全部击杀；1 有存活变异；2 输入错误（含：干净用例本身不 PASS）
'use strict';
const path = require('path');
const { args, clone, writeJSON, isObj } = require('./lib/util');
const { loadCtx, loadCases, judgeCases } = require('./judge');

// 每个变异：{id, why, apply(c, ctx) -> 变异后的 case 或 null(不适用)}
const MUTATORS = [
  { id: 'M01.ivch_delta', why: 'note.ivch 发增量而非绝对值（能反复卖）', apply(c) {
    const iv = c.resp && c.resp.note && c.resp.note.ivch; if (!isObj(iv) || !c.saveBefore) return null;
    const m = clone(c); let hit = false;
    for (const id of Object.keys(iv)) { const d = iv[id] - ((c.saveBefore.bag || {})[id] || 0); if (d !== iv[id]) { m.resp.note.ivch[id] = d; hit = true; } }
    return hit ? m : null; } },
  { id: 'M02.eco_potential_key', why: '潜能键写成 potential（客户端只认 ptt）', apply(c) {
    const e = c.resp && c.resp.note && c.resp.note.eco; if (!isObj(e) || !('ptt' in e)) return null;
    const m = clone(c); m.resp.note.eco.potential = m.resp.note.eco.ptt; delete m.resp.note.eco.ptt; return m; } },
  { id: 'M03.skch_lv0', why: '下发 lv=0 的 skch（客户端删技能）', apply(c) {
    const s = c.resp && c.resp.note && c.resp.note.skch; if (!isObj(s) || !Object.keys(s).length) return null;
    const m = clone(c); const k = Object.keys(s)[0]; m.resp.note.skch[k] = [0, s[k][1] || 0, s[k][2] || 0]; return m; } },
  { id: 'M04.switch_zero', why: '开关字段回 0（F1：formulaID:0 → getItem(0) 得 null）', apply(c, ctx) {
    const k = ctx.contracts.contracts[ctx.contracts.byAction[c.action]]; if (!k || !c.resp || c.resp.eRet !== 1) return null;
    const allow = new Set(k.switchZeroAllowed || []);
    const f = Object.entries(k.fields).find(([n, d]) => d.switch && !allow.has(n) && !(n in c.resp)); if (!f) return null;
    const m = clone(c); m.resp[f[0]] = 0; return m; } },
  { id: 'M05.drop_required', why: '漏回必回字段（LoadGame 等重建入口）', apply(c, ctx) {
    const k = ctx.contracts.contracts[ctx.contracts.byAction[c.action]]; if (!k || !k.required || !k.required.length || !c.resp || c.resp.eRet !== 1) return null;
    const m = clone(c); const p = k.required[0].split('.'); let o = m.resp; for (let i = 0; i < p.length - 1; i++) o = o[p[i]]; if (!o || !(p[p.length - 1] in o)) return null; delete o[p[p.length - 1]]; return m; } },
  { id: 'M06.finishTaskObj_shape', why: 'finishTaskObj 回成对象（LoadGame 要字符串数组）', apply(c) {
    if (!c.resp || !Array.isArray(c.resp.finishTaskObj)) return null;
    const m = clone(c); const o = {}; for (const s of c.resp.finishTaskObj) { const [id, n] = String(s).split(','); o[id] = +n; } m.resp.finishTaskObj = o; return m; } },
  { id: 'M07.itemObj_empty', why: 'sycnPlayerItemData 回空 itemObj（客户端清空背包）', apply(c) {
    if (!c.resp || !isObj(c.resp.itemObj) || !Object.keys(c.resp.itemObj).length) return null;
    const m = clone(c); m.resp.itemObj = {}; return m; } },
  { id: 'M08.drop_note', why: '改了存档但没发 note（客户端显示过期）', apply(c) {
    if (!c.resp || !c.resp.note || !Object.keys(c.resp.note).length) return null;
    const m = clone(c); delete m.resp.note; return m; } },
  { id: 'M09.sell_overpay', why: '结算多给 1 个铜币（存档与 note 同步错，只有守恒式能抓）', apply(c) {
    if (!c.saveAfter || typeof c.saveAfter.coins !== 'number' || !c.resp || !c.resp.note || !c.resp.note.eco || !('coins' in c.resp.note.eco)) return null;
    const m = clone(c); m.saveAfter.coins += 1; m.resp.note.eco.coins += 1; if (m.snapA && m.snapA.wallet) m.snapA.wallet.coins += 1; if (m.snapB && m.snapB.wallet) m.snapB.wallet.coins += 1; return m; } },
  { id: 'M10.note_key_typo', why: 'note 键名拼错（ivch→ivhc，客户端静默丢弃）', apply(c) {
    const n = c.resp && c.resp.note; if (!isObj(n) || !n.ivch) return null;
    const m = clone(c); m.resp.note.ivhc = m.resp.note.ivch; delete m.resp.note.ivch; return m; } },
  { id: 'M11.currency_in_bag', why: '货币进背包（4001 铜币写进 bag/ivch）', apply(c) {
    if (!c.saveAfter || !c.resp || c.resp.eRet !== 1) return null;
    const m = clone(c); m.saveAfter.bag = m.saveAfter.bag || {}; m.saveAfter.bag['4001'] = 10; m.resp.note = m.resp.note || {}; m.resp.note.ivch = Object.assign({}, m.resp.note.ivch, { 4001: 10 }); return m; } },
  { id: 'M12.yuanbao_forge', why: '元宝（付费货币）被加', apply(c) {
    if (!c.saveAfter || typeof c.saveAfter.yuanbao !== 'number') return null;
    const m = clone(c); m.saveAfter.yuanbao += 100; m.resp.note = m.resp.note || {}; m.resp.note.eco = Object.assign({}, m.resp.note.eco, { yuanbao: m.saveAfter.yuanbao }); return m; } },
  { id: 'M13.eqch_shape', why: 'eqch 少一层数组（[1,type,num]）', apply(c) {
    const e = c.resp && c.resp.note && c.resp.note.eqch; if (!isObj(e)) return null;
    const k = Object.keys(e).find(x => Array.isArray(e[x]) && e[x][0] === 1); if (!k) return null;
    const m = clone(c); m.resp.note.eqch[k] = [1].concat(e[k][1]); return m; } },
  { id: 'M14.client_diverge', why: '客户端增量路径状态与全量路径不同（L2 只靠快照能抓）', apply(c) {
    if (!c.snapA || !c.snapA.bag || !Object.keys(c.snapA.bag).length) return null;
    const m = clone(c); const k = Object.keys(m.snapA.bag)[0]; m.snapA.bag[k] += 1; return m; } },
  { id: 'M15.swallowed_exception', why: '监听器抛异常被 MessageCenter 吞掉（战斗 npcArr[23] 先例）', apply(c) {
    const m = clone(c); m.exceptions = (m.exceptions || []).concat([{ event: c.action, msg: "TypeError: Cannot read property 'name' of null" }]); return m; } },
  { id: 'M16.pay_not_blocked', why: '付费动作回了 eRet:1', apply(c, ctx) {
    const r = require('./lib/layers').re(ctx.cfg.payActionRe); if (!r || !r.test(c.action || '')) return null;
    const m = clone(c); m.resp.eRet = 1; return m; } },
  { id: 'M17.fk_dangling', why: '外键指向表里不存在的 id', apply(c, ctx) {
    const k = ctx.contracts.contracts[ctx.contracts.byAction[c.action]]; if (!k || !ctx.tables || !c.resp) return null;
    const f = Object.entries(k.fields).find(([n, d]) => d.fk && ctx.tables[d.fk] && n in c.resp); if (!f) return null;
    const m = clone(c); m.resp[f[0]] = 987654321; return m; } },
  { id: 'M18.envelope_no_code', why: '游戏服信封缺 code:200（客户端静默丢弃）', apply(c) {
    if (!c.envelope || c.transport !== 'game' || (c.resp && 'errorCode' in c.resp)) return null; // 拒绝形态本来就没有信封
    const m = clone(c); delete m.envelope.code; if (m.rawTransport) delete m.rawTransport.code; return m; } },
  // ---- 中层审计（2026-10-23）A2 假 PASS 通道 → 变异体（case 作者/录制自带豁免开关）
  { id: 'M19.meta_abolish_escape', why: '审计 A2#2a：lv=0 删技能，并在 case.meta 自带 abolish 豁免', apply(c) {
    const s = c.resp && c.resp.note && c.resp.note.skch; if (!isObj(s) || !Object.keys(s).length) return null;
    const m = clone(c); const k = Object.keys(s)[0]; m.resp.note.skch[k] = [0, 0, 0]; m.meta = Object.assign({}, m.meta, { abolish: true }); return m; } },
  { id: 'M20.meta_fullreload_escape', why: '审计 A2#2b：改了存档不发 note，并在 case.meta 自带 fullReload 豁免', apply(c) {
    if (!c.resp || !c.resp.note || !Object.keys(c.resp.note).length || (c.meta && c.meta.fullReload)) return null;
    const m = clone(c); delete m.resp.note; m.meta = Object.assign({}, m.meta, { fullReload: true }); return m; } },
  { id: 'M21.meta_l4allow_escape', why: '审计 A2#2c：与原服样本缺整个 note，并在 case.meta 自带 l4Allow 豁免', apply(c) {
    if (!c.template || !c.resp || !c.resp.note) return null;
    const m = clone(c); delete m.resp.note; delete m.saveBefore; delete m.saveAfter; m.meta = Object.assign({}, m.meta, { l4Allow: ['note'] }); return m; } },
  { id: 'M22.probe_none', why: '审计 A2#5：探针没挂上（L0 失明）', apply(c) {
    if (!c.probe || c.probe.mode === 'none') return null; const m = clone(c); m.probe = { mode: 'none' }; return m; } },
  { id: 'M23.action_unknown', why: '审计 A2#1：动作不在契约表里（L1 零字段检查）', apply(c) {
    if (!c.resp) return null; const m = clone(c); m.action = c.action + 'X'; if (m.req) m.req.do = m.req.do + 'X'; return m; } },
  // R22 §三：拒绝形态（裸 errorCode）的三种错法
  { id: 'M24.sell_worn_equip', why: 'R22：把已穿戴装备卖掉了（原服拒绝），存档与 note 自洽，只有守恒规则能抓', apply(c) {
    if (!c.resp || !('errorCode' in c.resp) || c.action !== 'User.saleItem' || !c.saveBefore) return null;
    const m = clone(c), uid = String(c.req.p.uid); delete m.saveAfter.playerEquip[uid]; for (const [k, v] of Object.entries(m.saveAfter.equipments || {})) if (String(v) === uid) delete m.saveAfter.equipments[k];
    m.saveAfter.coins += 30; m.resp = { eRet: 1, note: { eqch: { [uid]: [0] }, eco: { coins: m.saveAfter.coins } } };
    m.envelope = { error: 0, p: c.action, [c.action]: m.resp }; delete m.snapA; delete m.snapB; return m; } }, // 信封、快照与新应答自洽，只剩守恒规则能抓
  { id: 'M25.reject_in_envelope', why: 'R22：拒绝写成 {eRet:0}（我方惯用形态），原服是裸 {errorCode:1}', apply(c) {
    if (!c.resp || !('errorCode' in c.resp)) return null; const m = clone(c); m.resp = { eRet: 0 }; m.envelope = { error: 0, p: c.action, [c.action]: m.resp }; return m; } },
  { id: 'M26.reject_mutates_save', why: 'R22：回了拒绝却改了存档', apply(c) {
    if (!c.resp || !('errorCode' in c.resp) || !c.saveAfter) return null; const m = clone(c); m.saveAfter.coins = (m.saveAfter.coins || 0) + 1; return m; } },
  { id: 'M28.reject_wrapped', why: 'R22：拒绝被包进 {code:200, MsgData:{errorCode:1}} 信封', apply(c) {
    if (!c.resp || !('errorCode' in c.resp)) return null; const m = clone(c); m.envelope = { code: 200, MsgData: clone(c.resp) }; return m; } },
  { id: 'M27.reject_mixed', why: 'R22：拒绝应答里夹带了 note', apply(c) {
    if (!c.resp || !('errorCode' in c.resp)) return null; const m = clone(c); m.resp = { errorCode: 1, note: {} }; return m; } },
];

if (require.main === module) {
  const a = args(process.argv.slice(2));
  const root = path.resolve(__dirname, '..');
  if (!a.cases) { console.error('需要 --cases'); process.exit(2); }
  const ctx = loadCtx(a, root);
  const clean = loadCases(a.cases);
  const base = judgeCases(clean, ctx, { layers: a.layers });
  const dirty = base.perCase.filter(x => x.verdict !== 'PASS');
  if (dirty.length) {
    console.error('干净用例本身未全部 PASS，变异测试无意义：');
    for (const d of dirty) console.error('  ' + (d.id || d.file) + ' ' + d.findings.filter(x => x.level === 'FAIL').map(x => x.code).join(','));
    process.exit(2);
  }
  const results = [];
  for (const mu of MUTATORS) {
    const r = { id: mu.id, why: mu.why, applicable: 0, killed: 0, survivors: [], killedBy: {} };
    for (const c of clean) {
      const m = mu.apply(c, ctx);
      if (!m) continue;
      r.applicable++;
      // 单 case + 带上同 scenario 的其余干净 case，让跨用例层也能工作
      const peers = clean.filter(x => x !== c && x.scenario && x.scenario === c.scenario);
      const rep = judgeCases([m, ...peers], ctx, { layers: a.layers });
      const mine = rep.perCase[0];
      const fails = mine.findings.filter(x => x.level === 'FAIL').concat(rep.cross.filter(x => x.level === 'FAIL'));
      if (fails.length) { r.killed++; for (const f of fails) r.killedBy[f.code] = (r.killedBy[f.code] || 0) + 1; }
      else r.survivors.push(c.id || c.__file);
    }
    results.push(r);
  }
  const applicable = results.reduce((s, r) => s + r.applicable, 0);
  const killed = results.reduce((s, r) => s + r.killed, 0);
  const never = results.filter(r => !r.applicable).map(r => r.id);
  const out = { killRate: applicable ? killed / applicable : null, applicable, killed, neverApplicable: never, results };
  if (a.out) writeJSON(a.out, out);
  for (const r of results) {
    const tag = !r.applicable ? '—' : r.killed === r.applicable ? '✔' : '✘';
    console.log(`${tag} ${r.id.padEnd(26)} ${r.killed}/${r.applicable}  ${r.why}${r.survivors.length ? '  存活于: ' + r.survivors.join(', ') : ''}`);
  }
  console.log(`\n击杀率 ${killed}/${applicable}${never.length ? `；没有任何用例适用的变异：${never.join(', ')}（需要补对应用例）` : ''}`);
  if (a['allow-survivors']) {
    const ks = require(path.resolve(a['allow-survivors'])).survivors || [];
    const want = new Set(ks.map(k => k.mutator + '@' + k.case));
    const got = new Set(results.flatMap(r => r.survivors.map(s => r.id + '@' + s)));
    const extra = [...got].filter(x => !want.has(x)), fixed = [...want].filter(x => !got.has(x));
    if (extra.length) console.log('新增存活（裁判出现新盲区）：' + extra.join(', '));
    if (fixed.length) console.log('已被击杀但仍在登记表里（请删除登记）：' + fixed.join(', '));
    console.log(extra.length || fixed.length ? '与已知存活表不一致 → FAIL' : `存活集合与已知表一致（${want.size} 条已知盲区）`);
    process.exit(extra.length || fixed.length ? 1 : 0);
  }
  process.exit(killed === applicable ? 0 : 1);
}

module.exports = { MUTATORS };
