'use strict';
// 规则 DSL（路线 S7）：一份声明 → ① 可运行 handler（经投射器出 note） ② L5 守恒式（rules.json 格式）
// 规格（每个动作一条）：
// {
//   "params":  {"itemID": "int", "num": "int>0"},           // 参数校验，不合法回 failERet
//   "guards":  [{"expr": "T.item[p.itemID]", "eRet": 0}],     // 任一为假回该 eRet，存档不动
//   "cost":    [{"wallet": "coins", "amount": "T.item[p.itemID].BuyPrice * p.num"}, {"item": "p.itemID", "num": "p.num"}],
//   "gain":    [{"wallet": "coins", "amount": "..."}, {"item": "p.itemID", "num": "p.num"}],
//   "resp":    {"someField": "p.itemID"},                      // 业务字段（表达式）；note 永远由投射器生成
//   "failERet": 0,                                             // 余额/物品不足时的 eRet（默认 0；请按抓包或客户端读法改）
//   "source":  "item 表 BuyPrice 列（scripts2.js:46443）"      // 依据，必填，进注册表
// }
// wallet 用存档键（coins/gold/potential/contribution…）。yuanbao 出现在 gain 里一律拒绝编译。
const { withProjection } = require('./projector');

function compileExpr(src) {
  // 仅供开发者写的规则文件使用；不处理外部输入
  // eslint-disable-next-line no-new-func
  return Function('p', 'T', 's', `"use strict"; return (${src});`);
}
function checkParam(v, spec) {
  if (spec === 'int') return Number.isInteger(v);
  if (spec === 'int>0') return Number.isInteger(v) && v > 0;
  if (spec === 'any') return v !== undefined;
  if (spec === 'opt') return true;
  throw new Error('未知参数类型 ' + spec);
}

function compileAction(name, spec, tables) {
  if (!spec.source) throw new Error(`${name} 缺 source（规则依据）`);
  for (const g of spec.gain || []) if (g.wallet === 'yuanbao') throw new Error(`${name} 试图产出付费货币 yuanbao`);
  // guard 可写 "reject":"errorCode"（R22 §三.1 裸拒绝）与 "pre":true（在参数校验之前判）
  const guards = (spec.guards || []).map(g => ({ f: compileExpr(g.expr), eRet: g.eRet ?? 0, expr: g.expr, pre: !!g.pre, fail: g.reject === 'errorCode' ? { errorCode: g.errorCode ?? 1 } : { eRet: g.eRet ?? 0 } }));
  const runGuards = (list, p, s) => { for (const g of list) { let ok; try { ok = g.f(p, tables, s); } catch (e) { ok = false; } if (!ok) return g.fail; } return null; };
  const legs = l => (l || []).map(x => x.wallet ? { wallet: x.wallet, f: compileExpr(x.amount) } : { item: compileExpr(x.item), f: compileExpr(x.num) });
  const cost = legs(spec.cost), gain = legs(spec.gain);
  const respF = Object.entries(spec.resp || {}).map(([k, e]) => [k, compileExpr(e)]);
  const failERet = spec.failERet ?? 0;
  const raw = function (req, s) {
    const p = req.p || {};
    const pre = runGuards(guards.filter(g => g.pre), p, s); if (pre) return pre;
    for (const [k, t] of Object.entries(spec.params || {})) if (!checkParam(p[k], t)) return { eRet: failERet };
    const post = runGuards(guards.filter(g => !g.pre), p, s); if (post) return post;
    // 先全部算好再写，保证失败时存档不动
    const plan = [];
    for (const [sign, list] of [[-1, cost], [1, gain]]) for (const l of list) {
      const n = l.f(p, tables, s);
      if (!Number.isInteger(n) || n < 0) throw new Error(`${name} 数量表达式得到非法值 ${n}`);
      plan.push(l.wallet ? { wallet: l.wallet, d: sign * n } : { item: String(l.item(p, tables, s)), d: sign * n });
    }
    for (const x of plan) {
      const cur = x.wallet ? (s[x.wallet] || 0) : ((s.bag || {})[x.item] || 0);
      const net = plan.filter(y => (x.wallet ? y.wallet === x.wallet : y.item === x.item)).reduce((a, y) => a + y.d, 0);
      if (cur + net < 0) return { eRet: failERet };
    }
    for (const x of plan) {
      if (x.wallet) s[x.wallet] = (s[x.wallet] || 0) + x.d;
      else { s.bag = s.bag || {}; const v = (s.bag[x.item] || 0) + x.d; if (v) s.bag[x.item] = v; else delete s.bag[x.item]; }
    }
    const body = { eRet: 1 };
    for (const [k, f] of respF) body[k] = f(p, tables, s);
    return body;
  };
  return withProjection(raw);
}

// 生成 L5 守恒式（与 host/lib/layers.js 的 rules.json 同格式）
function toRules(dsl) {
  const out = { _说明: '由 forge/lib/rules-dsl.js 从规则 DSL 自动生成，勿手改', actions: {} };
  for (const [name, spec] of Object.entries(dsl)) {
    if (name.startsWith('_')) continue;
    const by = {};
    const add = (key, sign, expr) => (by[key] = by[key] || []).push(`${sign}(${expr})`);
    for (const x of spec.cost || []) add(x.wallet ? `W:${x.wallet}` : `I:${x.item}`, '-', x.wallet ? x.amount : x.num);
    for (const x of spec.gain || []) add(x.wallet ? `W:${x.wallet}` : `I:${x.item}`, '+', x.wallet ? x.amount : x.num);
    out.actions[name] = Object.entries(by).map(([k, terms]) => {
      const lhs = k.startsWith('W:') ? `d('${k.slice(2)}')` : `dbag(${k.slice(2)})`;
      return { name: `${k} 守恒（${spec.source}）`, when: 'resp.eRet === 1', assert: `${lhs} === ${terms.join(' ')}` };
    });
    out.actions[name].push({ name: '失败分支不改存档', when: 'resp.eRet !== 1', assert: 'JSON.stringify(before) === JSON.stringify(after)' });
  }
  return out;
}

function compileAll(dsl, tables) {
  const H = {};
  for (const [name, spec] of Object.entries(dsl)) if (!name.startsWith('_')) H[name] = compileAction(name, spec, tables);
  return H;
}
module.exports = { compileAction, compileAll, toRules };
