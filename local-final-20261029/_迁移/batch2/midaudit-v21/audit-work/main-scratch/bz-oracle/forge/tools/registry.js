#!/usr/bin/env node
// 动作注册表 + 仪表盘：所有计数只从这里生成（送评材料的计数节也从这里导出）。
// node forge/tools/registry.js --m1 M1.tsv --contracts out/contracts.json
//      [--implemented impl.txt|bz-rpc-server.js] [--report out/report.json] [--hits stub-hits.json]
//      [--cases <dir>] [--dsl rules.dsl.json] [--effects out/effects.json] [--capture config/capture.json]
//      [--out out/registry.json] [--md out/dashboard.md]
'use strict';
const fs = require('fs');
const path = require('path');
const { args, readJSON, writeJSON, listCases, sha8 } = require('../../host/lib/util');

const PAY_RE = /(pay|recharge|order|product|wxPay|aliPay|IphonePay|IosChooseProduct|PaymentCallBack|getPaySginData|h5Pay)/i;

function readM1(p) {
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean);
  const head = lines.shift().split('\t');
  return lines.map(l => { const c = l.split('\t'); const o = {}; head.forEach((h, i) => (o[h] = /^\d+$/.test(c[i]) ? +c[i] : c[i])); return o; });
}
// 已实现集合：可给纯文本（每行一个动作名），或给 bz-rpc-server.js（按 M1 §1.2 的算法抽 H 表的键）
function readImplemented(p) {
  const set = new Set();
  if (!p || !fs.existsSync(p)) return set;
  const src = fs.readFileSync(p, 'utf8');
  if (/\.js$/.test(p)) {
    for (const m of src.matchAll(/^\s{4}([A-Za-z0-9_$]+)\s*:\s*function/gm)) set.add('User.' + m[1]);
    for (const m of src.matchAll(/^\s{4}['"]([A-Za-z]+\.[A-Za-z0-9_$]+)['"]\s*:\s*function/gm)) set.add(m[1]);
  } else src.split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#')).forEach(s => set.add(s));
  return set;
}

function classify(r, ctx) {
  const v = r.VALUE, isReq = /^[A-Za-z]+\.[A-Za-z0-9_]+$/.test(v) && !v.includes('/');
  if (!isReq && r.send) return 'ALT';                                // 非 Mod.do 形态但会发：弹幕/排行榜等另一通道
  if (!isReq) return r.on ? 'PUSH' : 'DEAD';                       // note 子表事件名 / websocket / web 路径
  if (!r.send && r.on) return 'PUSH';                                // 客户端只听不发 = 服务端推送
  if (!r.send && !r.on) return 'DEAD';                               // 不发不听：客户端里没有活路径
  if (PAY_RE.test(v) || ctx.out.has(v)) return 'OUT';
  if (ctx.capture.has(v)) return 'CAPTURE';
  const impl = ctx.impl.has(v) || (ctx.useM1Handler && r.handler === 1);
  const vr = ctx.verdict[v];
  if (impl) return vr === 'PASS' ? 'DONE' : vr === 'FAIL' ? 'IMPL-FAIL' : 'IMPL-UNJUDGED';
  if (ctx.dsl[v]) return 'RULE';
  const cid = ctx.contracts.byAction[v], k = cid && ctx.contracts.contracts[cid];
  if (k && k.closed) return 'GEN-READY';
  if (k) return 'NEEDS-S2';
  return 'NO-CONTRACT';
}

const ORDER = ['DONE', 'IMPL-FAIL', 'IMPL-UNJUDGED', 'RULE', 'GEN-READY', 'NEEDS-S2', 'NO-CONTRACT', 'CAPTURE', 'OUT', 'ALT', 'PUSH', 'DEAD'];
const MEANING = {
  DONE: '已实现且裁判全 PASS', 'IMPL-FAIL': '已实现但裁判有 FAIL', 'IMPL-UNJUDGED': '已实现、还没有用例',
  RULE: '有规则 DSL，可直接编译', 'GEN-READY': '契约闭合，可交给生成器', 'NEEDS-S2': '契约未闭合，先跑展开器',
  'NO-CONTRACT': '客户端会发但没有读点契约', CAPTURE: '依赖原服独有数据', OUT: '付费/项目边界外',
  ALT: '非 Mod.do 形态的发送（弹幕/排行榜等另一通道），多依赖其他玩家【推断】，不计入范围', PUSH: '服务端推送事件，不需要请求 handler', DEAD: '客户端不发也不读',
};

function build(a) {
  const m1 = readM1(a.m1);
  const contracts = readJSON(a.contracts);
  const ctx = {
    contracts, impl: readImplemented(a.implemented), useM1Handler: !a.implemented,
    dsl: readJSON(a.dsl, {}), verdict: {}, hits: {},
    capture: new Set((readJSON(a.capture, {}).capture) || []), out: new Set((readJSON(a.capture, {}).out) || []),
  };
  const rep = readJSON(a.report, null);
  if (rep) for (const c of rep.perCase) ctx.verdict[c.action] = (ctx.verdict[c.action] === 'FAIL' || c.verdict === 'FAIL') ? 'FAIL' : 'PASS';
  Object.assign(ctx.hits, readJSON(a.hits, {}));
  if (a.cases) for (const f of listCases(a.cases)) { const c = readJSON(f); if (c.action) ctx.hits[c.action] = (ctx.hits[c.action] || 0) + 1; }
  const eff = readJSON(a.effects, null);
  const rows = m1.map(r => {
    const st = classify(r, ctx);
    const cid = contracts.byAction[r.VALUE];
    return { key: r.KEY, action: r.VALUE, status: st, hits: ctx.hits[r.VALUE] || 0, contract: cid || null,
      closed: cid ? contracts.contracts[cid].closed : null, m1: { handler: r.handler, on: r.on, send: r.send, code: r.code } };
  });
  const counts = Object.fromEntries(ORDER.map(s => [s, rows.filter(r => r.status === s).length]));
  const reqTotal = rows.length - counts.PUSH - counts.DEAD;
  const inScope = reqTotal - counts.OUT - counts.CAPTURE - counts.ALT;
  return {
    __meta: { gen: new Date().toISOString(), m1Sha8: sha8(fs.readFileSync(a.m1, 'utf8')), contractsSha8: sha8(contracts.__meta), total: rows.length, reqTotal, inScope,
      doneRatio: inScope ? +(counts.DONE / inScope).toFixed(4) : 0, effects: eff ? eff.__meta : null },
    counts, meaning: MEANING, rows,
  };
}

function dashboard(reg, topN = 30) {
  const L = [];
  const m = reg.__meta;
  L.push(`# 动作注册表仪表盘`, '', `生成：${m.gen}　M1 ${m.m1Sha8}　契约 ${m.contractsSha8}`, '');
  L.push(`- HttpConst 条目：**${m.total}**；其中客户端真会发请求的：**${m.reqTotal}**；扣除 OUT/CAPTURE 后在范围内：**${m.inScope}**`);
  L.push(`- 已还原（DONE）占范围内：**${(m.doneRatio * 100).toFixed(1)}%**`, '');
  L.push('| 状态 | 数量 | 含义 |', '|---|---:|---|');
  for (const s of ORDER) L.push(`| ${s} | ${reg.counts[s]} | ${reg.meaning[s]} |`);
  const todo = reg.rows.filter(r => ['IMPL-FAIL', 'RULE', 'GEN-READY', 'NEEDS-S2', 'NO-CONTRACT', 'IMPL-UNJUDGED'].includes(r.status));
  todo.sort((x, y) => y.hits - x.hits || ORDER.indexOf(x.status) - ORDER.indexOf(y.status));
  L.push('', `## 待办 Top ${topN}（按真实触发次数，其次按状态）`, '', '| # | 动作 | 状态 | 触发 | 契约 |', '|---:|---|---|---:|---|');
  todo.slice(0, topN).forEach((r, i) => L.push(`| ${i + 1} | \`${r.action}\` | ${r.status} | ${r.hits} | ${r.contract || '—'}${r.closed === false ? '（未闭合）' : ''} |`));
  if (!todo.some(r => r.hits)) L.push('', '> 还没有触发数据：开被动录制或兜底 handler 的命中计数后重跑，排序才有意义。');
  return L.join('\n') + '\n';
}

// 送评材料的"计数"节：每个数字都带复算命令，杜绝人工数错（R21 §十三 6 处被复算推翻）
function material(reg, argv) {
  const m = reg.__meta, c = reg.counts;
  const cmd = 'node forge/tools/registry.js ' + argv.join(' ');
  const L = ['## 计数（自动生成，勿手改）', '', `> 复算：\`${cmd}\`　M1 ${m.m1Sha8} / 契约 ${m.contractsSha8} / ${m.gen}`, '',
    '| 口径 | 数值 | 定义 |', '|---|---:|---|',
    `| HttpConst 条目 | ${m.total} | M1 全表行数 |`,
    `| 客户端会发的请求动作 | ${m.reqTotal} | 总数 − PUSH − DEAD |`,
    `| 服务端推送（PUSH） | ${c.PUSH} | send=0 且 on=1，或非 Mod.do 形态但有监听 |`,
    `| 死条目（DEAD） | ${c.DEAD} | send=0 且 on=0 |`,
    `| 另一通道（ALT） | ${c.ALT} | send=1 但不是 Mod.do 形态 |`,
    `| 范围内 | ${m.inScope} | 请求动作 − OUT − CAPTURE − ALT |`];
  for (const k of ['DONE', 'IMPL-FAIL', 'IMPL-UNJUDGED', 'RULE', 'GEN-READY', 'NEEDS-S2', 'NO-CONTRACT', 'CAPTURE', 'OUT']) L.push(`| ${k} | ${c[k]} | ${reg.meaning[k]} |`);
  return L.join('\n') + '\n';
}
module.exports = { readM1, readImplemented, build, dashboard, classify, material };
if (require.main === module) {
  const a = args(process.argv.slice(2));
  if (!a.m1 || !a.contracts) { console.error('需要 --m1 与 --contracts'); process.exit(2); }
  const reg = build(a);
  writeJSON(a.out || 'out/registry.json', reg);
  fs.writeFileSync(a.md || 'out/dashboard.md', dashboard(reg, +(a.top || 30)));
  if (a.material) fs.writeFileSync(a.material, material(reg, process.argv.slice(2).filter((x, i, arr) => x !== '--material' && arr[i - 1] !== '--material')));
  console.log(JSON.stringify({ total: reg.__meta.total, reqTotal: reg.__meta.reqTotal, inScope: reg.__meta.inScope, counts: reg.counts }));
}
