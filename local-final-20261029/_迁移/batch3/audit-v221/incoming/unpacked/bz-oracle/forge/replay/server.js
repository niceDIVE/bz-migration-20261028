'use strict';
// 可在 node 里运行的"组合服务端"：手写/生成 handler → 规则 DSL → 兜底 STUB，三级查找。
// 所有 handler 统一签名 (req, save, ctx) → {resp, saveAfter}；手写 handler 用 withProjection 包装后同样适用。
const fs = require('fs');
const path = require('path');
const { compileAll } = require('../lib/rules-dsl');
const { makeFallback } = require('../lib/stub');

// strict（nightly 用，中层审计 A6）：require 前过静态闸；handler 必须是 withProjection/compileAction 的产物（WeakSet 校验）。
// 被拒的文件记在 H.__rejected，不加载。
function loadGenerated(dir, opt = {}) {
  const H = {};
  Object.defineProperty(H, '__rejected', { value: [], enumerable: false });
  if (!dir || !fs.existsSync(dir)) return H;
  const { gate } = require('../lib/gen-gate');
  const { isProjected } = require('../lib/projector');
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.js')) {
    const p = path.resolve(dir, f);
    if (opt.strict) { const g = gate(fs.readFileSync(p, 'utf8')); if (!g.ok) { H.__rejected.push({ file: f, why: g.why }); continue; } }
    delete require.cache[p];
    const m = require(p);
    if (!(m && m.action && typeof m.handler === 'function')) { if (opt.strict) H.__rejected.push({ file: f, why: ['导出格式不对'] }); continue; }
    if (opt.strict && !isProjected(m.handler)) { H.__rejected.push({ file: f, why: ['G4 handler 不是 withProjection/compileAction 的产物'] }); continue; }
    H[m.action] = m.handler;
  }
  return H;
}

// 中层审计 A6#3：投射器只投这些存档域；生成 handler 改了别的域 = 客户端永远看不到，严格模式下直接判错
const PROJECTED_DOMAINS_DEFAULT = ['bag', 'coins', 'gold', 'potential', 'chip', 'yuanbao', 'skills', 'playerEquip', 'equipments', 'hunger'];
function unprojectedChanges(before, after, allow) {
  const A = new Set(allow), bad = [];
  for (const k of new Set([...Object.keys(before || {}), ...Object.keys(after || {})])) {
    if (A.has(k)) continue;
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) bad.push(k);
  }
  return bad;
}

function createForgeServer(o) {
  const hits = {};
  const layers = [
    ['hand', o.handlers || {}],
    ['generated', loadGenerated(o.generatedDir, { strict: o.strictGenerated })],
    ['rule', o.dsl ? compileAll(o.dsl, o.tables || {}) : {}],
  ];
  const fallback = makeFallback(o.contracts, { policy: o.stubPolicy || 'minimal', hits });
  let save = JSON.parse(JSON.stringify(o.initialSave || {}));
  const allowDomains = o.projectedDomains || PROJECTED_DOMAINS_DEFAULT;
  return {
    hits,
    rejected: layers[1][1].__rejected,
    setSave(s) { save = JSON.parse(JSON.stringify(s)); },
    getSave() { return JSON.parse(JSON.stringify(save)); },
    which(action) { for (const [n, H] of layers) if (H[action]) return n; return 'stub'; },
    dispatch(req) {
      const action = `${req.mod}.${req.do}`;
      const work = JSON.parse(JSON.stringify(save));
      let r, via = 'stub';
      for (const [n, H] of layers) if (H[action]) { via = n; r = H[action](req, work, {}); break; }
      if (!r) r = fallback(req, work);
      if (o.strictGenerated && via === 'generated') {
        const bad = unprojectedChanges(save, r.saveAfter, allowDomains);
        if (bad.length) throw new Error(`生成 handler 改了投射器不覆盖的存档域：${bad.join(', ')}（客户端看不到，转人工或先扩投射器）`);
      }
      save = r.saveAfter;
      if (r.unsafeStub) via = 'stub-unsafe';
      return { action, via, resp: r.resp, envelope: { error: 0, code: 200, p: action, [action]: r.resp } };
    },
  };
}
module.exports = { createForgeServer, loadGenerated, unprojectedChanges, PROJECTED_DOMAINS_DEFAULT };
