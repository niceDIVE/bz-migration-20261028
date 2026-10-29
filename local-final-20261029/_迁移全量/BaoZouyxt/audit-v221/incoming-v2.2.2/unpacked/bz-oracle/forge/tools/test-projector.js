#!/usr/bin/env node
// 用 bz-oracle 的干净用例回测投射器：对每个 eRet=1 且非全量重载的用例，project(saveBefore, saveAfter) 必须等于用例里的 note（按集合比较）
'use strict';
const path = require('path');
const { listCases, readJSON, canon } = require('../../host/lib/util');
const { project } = require('../lib/projector');
const dir = process.argv[2] || path.join(__dirname, '../../fixtures/cases');
let ok = 0, n = 0, bad = [];
for (const f of listCases(dir)) {
  const c = readJSON(f);
  if (!c.saveBefore || !c.saveAfter || !c.resp || c.resp.eRet !== 1 || (c.meta && c.meta.fullReload)) continue;
  n++;
  let got; try { got = project(c.saveBefore, c.saveAfter, undefined, { allowAbolish: c.meta && c.meta.abolish }).note; } catch (e) { bad.push(`${c.id}: ${e.message}`); continue; }
  const want = {}; for (const [k, v] of Object.entries(c.resp.note || {})) if (Object.keys(v || {}).length) want[k] = v; // 空子表等价于不发（M4 §6）
  if (canon(got) === canon(want)) ok++; else bad.push(`${c.id}: 投射 ${canon(got)} ≠ 用例 ${canon(want)}`);
}
console.log(`投射器回测 ${ok}/${n}`); bad.forEach(x => console.log('  ✘ ' + x));
process.exit(bad.length ? 1 : 0);
