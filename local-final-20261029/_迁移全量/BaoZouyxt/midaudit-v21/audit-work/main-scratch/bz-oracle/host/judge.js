#!/usr/bin/env node
// 裁判总入口
// node host/judge.js --cases <dir> [--contracts out/contracts.json] [--config config/oracle.config.json]
//        [--tables <dir 或 json>] [--templates core/templates.json] [--rules config/rules.json]
//        [--layers L0,L1,L2,L3,L4,L5] [--require-coverage] [--out out/report.json] [--quiet]
// 退出码：0 全部 PASS；1 有 FAIL；2 用法/输入错误
'use strict';
const fs = require('fs');
const path = require('path');
const { args, readJSON, writeJSON, listCases, sha8 } = require('./lib/util');
const layers = require('./lib/layers');

function loadTables(p) {
  if (!p) return null;
  const out = {};
  const add = (name, data) => {
    // 接受 {id:row} 或 [row{ID|id}] 两种形态
    if (Array.isArray(data)) { const m = {}; for (const r of data) { const id = r.ID ?? r.id ?? r.Id; if (id !== undefined) m[String(id)] = r; } out[name] = m; }
    else out[name] = data;
  };
  if (fs.statSync(p).isDirectory()) {
    for (const f of fs.readdirSync(p)) if (f.endsWith('.json')) add(f.replace(/(\.full)?\.json$/, ''), JSON.parse(fs.readFileSync(path.join(p, f), 'utf8')));
  } else {
    const all = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const [k, v] of Object.entries(all)) add(k, v);
  }
  return out;
}

function loadCtx(a, root) {
  const cfgPath = a.config || path.join(root, 'config/oracle.config.json');
  const ctx = {
    cfg: readJSON(cfgPath),
    contracts: readJSON(a.contracts || path.join(root, 'out/contracts.json')),
    tables: loadTables(a.tables),
    templates: readJSON(a.templates, null),
    rules: readJSON(a.rules || path.join(root, 'config/rules.json'), null),
  };
  if (!ctx.cfg) throw new Error('缺配置 ' + cfgPath);
  if (!ctx.contracts) throw new Error('缺 contracts.json，先跑 build-contracts.js');
  // templates.json 可能是 {name:{p, "User.X":{...}}} 的信封形态，统一取内层
  if (ctx.templates) for (const [k, v] of Object.entries(ctx.templates)) if (v && v.p && v[v.p]) ctx.templates[k] = v[v.p];
  return ctx;
}

function judgeCases(cases, ctx, opt) {
  const want = new Set((opt.layers || 'L0,L1,L2,L3,L4,L5').split(','));
  const perCase = [];
  for (const c of cases) {
    const f = [];
    if (want.has('L0')) f.push(...layers.L0(c, ctx));
    if (want.has('L1')) f.push(...layers.L1(c, ctx));
    if (want.has('L2')) f.push(...layers.L2(c, ctx));
    if (want.has('L4')) f.push(...layers.L4(c, ctx));
    if (want.has('L5')) f.push(...layers.L5(c, ctx));
    perCase.push({ id: c.id, action: c.action, file: c.__file, verdict: f.some(x => x.level === 'FAIL') ? 'FAIL' : 'PASS', findings: f });
  }
  const cross = [];
  let coverage = null;
  if (want.has('L5')) cross.push(...layers.L5loops(cases, ctx));
  if (want.has('L3')) { const r = layers.L3(cases, ctx, { require: opt.requireCoverage }); cross.push(...r.findings); coverage = r.report; }
  const fails = perCase.filter(x => x.verdict === 'FAIL').length + (cross.some(x => x.level === 'FAIL') ? 1 : 0);
  return {
    verdict: fails ? 'FAIL' : 'PASS',
    summary: {
      cases: cases.length,
      pass: perCase.filter(x => x.verdict === 'PASS').length,
      fail: perCase.filter(x => x.verdict === 'FAIL').length,
      crossFail: cross.filter(x => x.level === 'FAIL').length,
      byCode: [...perCase.flatMap(x => x.findings), ...cross].reduce((m, x) => (m[`${x.level} ${x.code}`] = (m[`${x.level} ${x.code}`] || 0) + 1, m), {}),
    },
    inputs: {
      contractsSha8: sha8(ctx.contracts.__meta || {}),
      m2Sha8: ctx.contracts.__meta && ctx.contracts.__meta.m2Sha8,
      configSha8: sha8(ctx.cfg),
      casesSha8: sha8(cases.map(c => c.__sha || '')),
    },
    perCase,
    cross,
    coverage,
  };
}

function loadCases(dir) {
  return listCases(dir).map(f => {
    const raw = fs.readFileSync(f, 'utf8');
    const c = JSON.parse(raw);
    c.__file = path.relative(process.cwd(), f);
    c.__sha = sha8(raw);
    return c;
  });
}

module.exports = { loadCtx, loadCases, judgeCases, loadTables };

if (require.main === module) {
  const a = args(process.argv.slice(2));
  const root = path.resolve(__dirname, '..');
  if (!a.cases) { console.error('需要 --cases <dir>'); process.exit(2); }
  let ctx;
  try { ctx = loadCtx(a, root); } catch (e) { console.error(e.message); process.exit(2); }
  const cases = loadCases(a.cases);
  const rep = judgeCases(cases, ctx, { layers: a.layers, requireCoverage: !!a['require-coverage'] });
  if (a.out) writeJSON(a.out, rep);
  if (!a.quiet) {
    for (const c of rep.perCase) {
      const fails = c.findings.filter(x => x.level !== 'INFO');
      console.log(`${c.verdict === 'PASS' ? '✔' : '✘'} ${c.id || c.file}  ${c.action}`);
      for (const x of fails) console.log(`    ${x.level} ${x.code} ${x.msg}`);
    }
    for (const x of rep.cross) if (x.level !== 'INFO') console.log(`  [跨用例] ${x.level} ${x.code} ${x.msg}`);
    console.log(`\n结论 ${rep.verdict}：${rep.summary.pass}/${rep.summary.cases} 用例通过，跨用例 FAIL ${rep.summary.crossFail}`);
  }
  process.exit(rep.verdict === 'PASS' ? 0 : 1);
}
