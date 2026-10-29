'use strict';
// 可在 node 里运行的"组合服务端"：手写/生成 handler → 规则 DSL → 兜底 STUB，三级查找。
// 所有 handler 统一签名 (req, save, ctx) → {resp, saveAfter}；手写 handler 用 withProjection 包装后同样适用。
const fs = require('fs');
const path = require('path');
const { compileAll } = require('../lib/rules-dsl');
const { makeFallback } = require('../lib/stub');

function loadGenerated(dir) {
  const H = {};
  if (!dir || !fs.existsSync(dir)) return H;
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.js')) {
    const p = path.resolve(dir, f);
    delete require.cache[p];
    const m = require(p);
    if (m && m.action && typeof m.handler === 'function') H[m.action] = m.handler;
  }
  return H;
}

function createForgeServer(o) {
  const hits = {};
  const layers = [
    ['hand', o.handlers || {}],
    ['generated', loadGenerated(o.generatedDir)],
    ['rule', o.dsl ? compileAll(o.dsl, o.tables || {}) : {}],
  ];
  const fallback = makeFallback(o.contracts, { policy: o.stubPolicy || 'minimal', hits });
  let save = JSON.parse(JSON.stringify(o.initialSave || {}));
  return {
    hits,
    setSave(s) { save = JSON.parse(JSON.stringify(s)); },
    getSave() { return JSON.parse(JSON.stringify(save)); },
    which(action) { for (const [n, H] of layers) if (H[action]) return n; return 'stub'; },
    dispatch(req) {
      const action = `${req.mod}.${req.do}`;
      const work = JSON.parse(JSON.stringify(save));
      let r, via = 'stub';
      for (const [n, H] of layers) if (H[action]) { via = n; r = H[action](req, work, {}); break; }
      if (!r) r = fallback(req, work);
      save = r.saveAfter;
      return { action, via, resp: r.resp, envelope: { error: 0, code: 200, p: action, [action]: r.resp } };
    },
  };
}
module.exports = { createForgeServer, loadGenerated };
