#!/usr/bin/env node
// 展开器对抗测试：刁钻样例 + 用 terser 压缩/改名后的同一份代码，AST 引擎两边结果必须一致且符合预期；同时报告正则引擎的差距
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { run } = require('./expand-handlers');
const SRC = path.join(__dirname, '../fixtures/client-src/hard-client.js');
const EXPECT = {
  ROLE_INFO: { closed: true, fields: { roleInfo: false, bagList: false, guildObj: true }, sub: { roleInfo: ['lv'], bagList: ['cap'], guildObj: ['id', 'name'] } },
  GET_REWARD: { closed: true, fields: { eRet: false, rewardObj: false, vipLv: true, coins: false }, absent: ['notResp'] },
  LEAKY: { closed: false },
};
function contractsFor(code, file) {
  const lines = code.split('\n'), C = { __meta: {}, byAction: {}, contracts: {} };
  for (const key of Object.keys(EXPECT)) {
    const i = lines.findIndex(l => l.includes('HttpConst.' + key));
    C.contracts[key] = { id: key, sites: [{ file, line: i + 1, form: 'x', handler: '' }], fields: {}, closed: false, openReasons: [] };
  }
  return C;
}
function check(res, label) {
  const bad = [];
  for (const [k, e] of Object.entries(EXPECT)) {
    const r = res.actions[k];
    if (!r) { bad.push(`${label} ${k}：无结果`); continue; }
    if (!!r.closed !== e.closed) bad.push(`${label} ${k}：closed=${!!r.closed}，预期 ${e.closed}（${(r._open || []).join('；')}）`);
    for (const [f, sw] of Object.entries(e.fields || {})) {
      if (!r.extraFields[f]) bad.push(`${label} ${k}：缺字段 ${f}`);
      else if (!!r.extraFields[f].switch !== sw) bad.push(`${label} ${k}.${f}：switch=${r.extraFields[f].switch}，预期 ${sw}`);
    }
    for (const f of e.absent || []) if (r.extraFields[f]) bad.push(`${label} ${k}：误收 ${f}（作用域遮蔽）`);
    for (const [f, subs] of Object.entries(e.sub || {})) for (const s of subs) if (!(r.extraFields[f] && r.extraFields[f].subFields && r.extraFields[f].subFields[s])) bad.push(`${label} ${k}.${f}：缺子字段 ${s}`);
  }
  return bad;
}
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'exp-'));
  const code = fs.readFileSync(SRC, 'utf8');
  const { minify } = require('terser');
  const min = (await minify(code, { compress: { passes: 2 }, mangle: true, format: { beautify: true, indent_level: 0 } })).code;
  fs.writeFileSync(path.join(tmp, 'a.js'), code); fs.writeFileSync(path.join(tmp, 'm.js'), min);
  const out = {};
  for (const [label, file, src] of [['原码', 'a.js', code], ['压缩', 'm.js', min]]) for (const engine of ['ast', 'regex']) {
    const cp = path.join(tmp, `${label}.json`); fs.writeFileSync(cp, JSON.stringify(contractsFor(src, file)));
    out[`${engine}/${label}`] = check(run({ contracts: cp, root: tmp, engine, depth: 3 }), `${engine}/${label}`);
  }
  for (const [k, v] of Object.entries(out)) console.log(`${v.length ? '✘' : '✔'} ${k}${v.length ? '：' + v.length + ' 处不符' : ''}`), v.slice(0, 6).forEach(x => console.log('    ' + x));
  process.exit(out['ast/原码'].length || out['ast/压缩'].length ? 1 : 0);
})();
