#!/usr/bin/env node
// 展开器对抗测试：刁钻样例 + 用 terser 压缩/改名后的同一份代码，AST 引擎两边结果必须一致且符合预期；同时报告正则引擎的差距
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { run } = require('./expand-handlers');
const SRCS = { hard: path.join(__dirname, '../fixtures/client-src/hard-client.js'), cx: path.join(__dirname, '../fixtures/client-src/cx-client.js') };
const EXPECTS = { hard: {
  ROLE_INFO: { closed: true, fields: { roleInfo: false, bagList: false, guildObj: true }, sub: { roleInfo: ['lv'], bagList: ['cap'], guildObj: ['id', 'name'] } },
  GET_REWARD: { closed: true, fields: { eRet: false, rewardObj: false, vipLv: true, coins: false }, absent: ['notResp'] },
  LEAKY: { closed: false },
}, cx: {
  // 中层审计 A4 六反例：期望值由审计报告给出（非实现者自定）
  CX1_FORIN: { closed: false },
  CX2_BUILTIN: { closed: true, fields: { keys: false, length: false, map: false }, truthy: ['map'] },
  CX3_HOPVAR: { closed: false },
  CX4_INVAR: { closed: false },
  CX5_SHAREDA: { closed: false },
  CX5_SHAREDB: { closed: false },
  CX7_SUBFORIN: { closed: true, fields: { rewardObj: false }, anyKeys: ['rewardObj'] },
  CX6_TRUTHY: { closed: true, fields: { rewardObj: false, vipLv: false }, truthy: ['rewardObj'], notTruthy: ['vipLv'] },
} };
let EXPECT;
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
    for (const f of e.anyKeys || []) if (!(r.extraFields[f] && r.extraFields[f].anyKeys)) bad.push(`${label} ${k}.${f}：未标"任意子键消费"`);
    for (const f of e.truthy || []) if (!(r.extraFields[f] && r.extraFields[f].truthy)) bad.push(`${label} ${k}.${f}：未识别为真值存在性读`);
    for (const f of e.notTruthy || []) if (r.extraFields[f] && r.extraFields[f].truthy) bad.push(`${label} ${k}.${f}：误标真值读`);
    for (const f of e.absent || []) if (r.extraFields[f]) bad.push(`${label} ${k}：误收 ${f}（作用域遮蔽）`);
    for (const [f, subs] of Object.entries(e.sub || {})) for (const s of subs) if (!(r.extraFields[f] && r.extraFields[f].subFields && r.extraFields[f].subFields[s])) bad.push(`${label} ${k}.${f}：缺子字段 ${s}`);
  }
  return bad;
}
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'exp-'));
  const { minify } = require('terser');
  const out = {};
  for (const [set, SRC] of Object.entries(SRCS)) {
    EXPECT = EXPECTS[set];
    const code = fs.readFileSync(SRC, 'utf8');
    const min = (await minify(code, { compress: { passes: 2 }, mangle: true, format: { beautify: true, indent_level: 0 } })).code;
    fs.writeFileSync(path.join(tmp, set + '-a.js'), code); fs.writeFileSync(path.join(tmp, set + '-m.js'), min);
    for (const [label, file, src] of [['原码', set + '-a.js', code], ['压缩', set + '-m.js', min]]) for (const engine of ['ast', 'regex']) {
      const cp = path.join(tmp, `${set}-${label}.json`); fs.writeFileSync(cp, JSON.stringify(contractsFor(src, file)));
      out[`${engine}/${set}/${label}`] = check(run({ contracts: cp, root: tmp, engine, depth: 3 }), `${engine}/${set}/${label}`);
    }
  }
  for (const [k, v] of Object.entries(out)) console.log(`${v.length ? '✘' : '✔'} ${k}${v.length ? '：' + v.length + ' 处不符' : ''}`), v.slice(0, 6).forEach(x => console.log('    ' + x));
  // 正则引擎：只许"少闭合"（closed 预期 true 而实为 false），不许"多闭合"
  const regexOverClose = Object.entries(out).filter(([k]) => k.startsWith('regex/')).flatMap(([, v]) => v).filter(x => /closed=true，预期 false/.test(x));
  if (regexOverClose.length) console.log('✘ 正则引擎误判闭合：' + regexOverClose.length);
  else console.log('✔ regex：无误判闭合（正则引擎永不判闭合）');
  process.exit(Object.entries(out).some(([k, v]) => k.startsWith('ast/') && v.length) || regexOverClose.length ? 1 : 0);
})();
