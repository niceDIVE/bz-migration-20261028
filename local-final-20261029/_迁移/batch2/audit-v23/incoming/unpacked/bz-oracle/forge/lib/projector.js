'use strict';
// 账本差分投射器（路线 S3）
// handler 只改存档；note 由 project(before, after) 自动推出。
// 不变式全部取自 M4：ivch/eco 发绝对值；货币不进 ivch；skch 绝不发 lv=0；eqch 为 [0] 或 [1,[type,num,...]]。
const DEFAULT_CFG = {
  ecoSaveMap: { coins: 'coins', ptt: 'potential', gold: 'gold', yuanbao: 'yuanbao', chips: 'chip' }, // M3 §1 + M4 §3
  currencyItemIds: [1, 4001, 4002, 4003, 8888],                                                        // 全量 §七
  attrSaveMap: (() => { try { return require('../../config/oracle.config.json').attrch.persistent; } catch (e) { return { hunger: 'hunger', school: 'school' }; } })(), // 只投 persistent 键（处置验收 §六；单一来源 config.attrch.persistent）
  paidKeys: ['yuanbao'],
};

function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

class ProjectionError extends Error {}

function project(before, after, cfg = DEFAULT_CFG, opt = {}) {
  const note = {}, violations = [];
  const cur = new Set(cfg.currencyItemIds.map(String));
  // ---- ivch：背包绝对值
  const bb = (before && before.bag) || {}, ba = (after && after.bag) || {};
  for (const id of new Set([...Object.keys(bb), ...Object.keys(ba)])) {
    const x = bb[id] || 0, y = ba[id] || 0;
    if (x === y) continue;
    if (cur.has(String(id))) { violations.push(`货币 ${id} 出现在存档背包里（应改钱包字段）`); continue; }
    if (!Number.isInteger(y) || y < 0) { violations.push(`背包 ${id} 变成非法值 ${y}`); continue; }
    (note.ivch = note.ivch || {})[id] = y;
  }
  // ---- eco：钱包绝对值
  for (const [k, sk] of Object.entries(cfg.ecoSaveMap)) {
    const x = before ? before[sk] : undefined, y = after ? after[sk] : undefined;
    if (x === y || typeof y !== 'number') continue;
    if (cfg.paidKeys.includes(k) && y > (x || 0) && !opt.allowPaidIncrease) violations.push(`付费货币 ${k} 增加 ${x}→${y}`);
    if (y < 0) violations.push(`钱包 ${k} 为负 ${y}`);
    (note.eco = note.eco || {})[k] = y;
  }
  // ---- skch：技能三元组；被删的技能只在 opt.allowAbolish 时发 lv=0
  const sb = (before && before.skills) || {}, sa = (after && after.skills) || {};
  for (const id of new Set([...Object.keys(sb), ...Object.keys(sa)])) {
    if (same(sb[id], sa[id])) continue;
    const v = sa[id];
    if (!v) { if (opt.allowAbolish) (note.skch = note.skch || {})[id] = [0, 0, 0]; else violations.push(`技能 ${id} 从存档消失：发 lv=0 会 abolishSkill，需显式 allowAbolish`); continue; }
    if (!Array.isArray(v) || v.length !== 3 || !(v[0] > 0)) { violations.push(`技能 ${id} 存档值 ${JSON.stringify(v)} 非法（lv 必须 >0）`); continue; }
    (note.skch = note.skch || {})[id] = clone(v);
  }
  // ---- eqch：装备实例
  const eb = (before && before.playerEquip) || {}, ea = (after && after.playerEquip) || {};
  for (const uid of new Set([...Object.keys(eb), ...Object.keys(ea)])) {
    if (same(eb[uid], ea[uid])) continue;
    (note.eqch = note.eqch || {})[uid] = ea[uid] ? [1, clone(ea[uid])] : [0];
  }
  // ---- attrch
  for (const [k, sk] of Object.entries(cfg.attrSaveMap || {})) {
    const x = before ? before[sk] : undefined, y = after ? after[sk] : undefined;
    if (x !== y && typeof y === 'number') (note.attrch = note.attrch || {})[k] = y;
  }
  if (violations.length && opt.strict !== false) throw new ProjectionError(violations.join('；'));
  return { note, violations };
}

// 包装 handler：handler(req, save, ctx) 只改 save 并返回 {eRet, ...业务字段}（不含 note）
// 返回 {resp, saveAfter}；handler 手写的 note 会被拒绝，强制走投射。
const PROJECTED = new WeakSet();
function isProjected(fn) { return PROJECTED.has(fn); }
function withProjection(handler, cfg = DEFAULT_CFG, opt = {}) {
  const wrapped = function (req, save, ctx) {
    const before = clone(save);
    const body = handler(req, save, ctx) || { eRet: 1 };
    if (body.note && !opt.allowManualNote) throw new ProjectionError(`${req.mod}.${req.do} 手写了 note；请只改存档，由投射器生成`);
    if ('errorCode' in body && body.errorCode !== 0) { // R22 §三.1：裸拒绝形态，只能有 errorCode 一个键，存档不变
      if (!same(before, save)) throw new ProjectionError(`${req.mod}.${req.do} errorCode=${body.errorCode} 却改了存档`);
      if (Object.keys(body).length !== 1) throw new ProjectionError(`${req.mod}.${req.do} 拒绝应答只能是裸 {errorCode}，多了 ${Object.keys(body).filter(k => k !== 'errorCode').join(',')}`);
      return { resp: { errorCode: body.errorCode }, saveAfter: save };
    }
    if (body.eRet !== 1) { // 失败分支：存档必须不变
      if (!same(before, save)) throw new ProjectionError(`${req.mod}.${req.do} eRet=${body.eRet} 却改了存档`);
      return { resp: body, saveAfter: save };
    }
    const { note } = project(before, save, cfg, opt);
    const resp = Object.assign({}, body);
    if (Object.keys(note).length) resp.note = note; else if (opt.emptyNote) resp.note = {};
    return { resp, saveAfter: save };
  };
  // 中层审计 A6#4：严格加载（nightly）只接受带此标记的 handler；裸 handler 绕不过失败分支检查与投射
  // 用模块私有 WeakSet 登记，生成代码无法伪造（defineProperty 之类的标记可以被伪造）
  PROJECTED.add(wrapped);
  return wrapped;
}

module.exports = { project, withProjection, isProjected, ProjectionError, DEFAULT_CFG };
