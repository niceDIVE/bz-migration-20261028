#!/usr/bin/env node
// 生成器上下文包：把一个动作需要的全部事实拼成一份提示（契约字段+行号、请求参数、note 铁律、输出格式、上一轮裁判意见），
// 供 LLM 生成 handler。nightly 的 --gen 可用 agent/llm-gen.sh 调它。
// node forge/agent/prompt-pack.js --action User.x --contracts out/contracts.json [--req-params out/req-params.json] [--registry out/registry.json]
//      [--feedback fb.json] [--dsl rules.dsl.json] [--recordings <dir>] --out prompt.md
'use strict';
const fs = require('fs');
const path = require('path');
const { args, readJSON, listCases } = require('../../host/lib/util');
const a = args(process.argv.slice(2));
const C = readJSON(a.contracts);
const cid = C.byAction[a.action], k = cid && C.contracts[cid];
const rp = readJSON(a['req-params'], {});
const reqp = Object.values(rp).find(x => x.action === a.action) || (cid && rp[cid]);
const reg = readJSON(a.registry, null);
const row = reg && reg.rows.find(r => r.action === a.action);
const fb = readJSON(a.feedback, {});
const dsl = readJSON(a.dsl, {});
const L = [];
L.push(`# 任务：为 ${a.action} 写服务端 handler`, '');
L.push('## 输出格式（只输出这个 JS 文件，不要解释）', '```js',
  "const { withProjection } = require('<forge>/lib/projector');",
  `module.exports = { action: '${a.action}', handler: withProjection(function (req, s) {`,
  '  // 只读 req.p、只改存档 s；失败时 return {eRet: 0} 且不得改 s', '  // 成功时 return {eRet: 1, ...客户端要读的业务字段}；绝不手写 note', '}) };', '```',
  '若该动作是"按表扣/给"的形态，优先输出规则 DSL 条目（见下方示例），由编译器生成 handler。', '');
L.push('## 铁律（违反任何一条裁判直接 FAIL）',
  '- note 由投射器根据存档差分自动生成：ivch/eco 是绝对值；货币不进背包；技能 lv 必须 >0；装备删除是 [0]',
  '- 开关字段（下表 switch=是）没有内容时**不发**，不能发 0/null/false/""（客户端按 hasOwnProperty 进分支）',
  '- 付费货币 yuanbao 只能减不能增；付费动作一律 eRet:4 且不写存档',
  '- 非法参数（缺参、非正整数、不存在的 id）必须失败，模糊测试会逐个试',
  '- 静态闸（不过闸的文件不会被加载）：只能 require projector / rules-dsl / *.json；禁止 process、fs、eval、Function、require.cache、import()、定时器；不得自定义 withProjection',
  '- 只能改这些存档域：bag、coins、gold、potential、chip、yuanbao、skills、playerEquip、equipments、hunger；改别的域客户端看不到，直接判错',
  '- 必须对所有录制样本都给出与录制一致的应答（回归不一致直接判错），不能只对样本参数特判', '');
L.push(`## 注册表状态：${row ? `${row.status}，真实触发 ${row.hits} 次` : '未知'}`, '');
if (k) {
  L.push(`## 客户端怎么读应答（契约 ${cid}，${k.closed ? '已闭合' : '未闭合：' + k.openReasons.join('；')}）`, '', '| 字段 | 开关 | 真值读 | 外键表 | 读取位置 |', '|---|---|---|---|---|');
  for (const [f, x] of Object.entries(k.fields)) L.push(`| ${f} | ${x.switch ? '是' : '否'} | ${x.truthy ? '是（无内容时不发；[]/{} 也算真）' : '否'} | ${x.fk || '—'} | ${x.reads.slice(0, 3).map(r => `${r.file}:${r.line}`).join(', ')} |`);
  if (k.required) L.push('', `必回字段：${k.required.join(', ')}`);
  if (k.shapes) L.push(`形状约束：${JSON.stringify(k.shapes)}`);
} else L.push('## 契约：材料未提供（该动作没有读点契约）');
L.push('', '## 客户端发什么（请求参数）');
if (reqp) for (const [p, x] of Object.entries(reqp.params)) L.push(`- \`${p}\`：${x.type}${x.optional ? '（可选）' : ''}，样例 ${x.samples.join(' / ')}`);
else L.push('材料未提供（先跑 tools/extract-req-params.js）');
if (a.recordings) {
  const recs = listCases(a.recordings).map(readJSON).filter(c => c.action === a.action).slice(0, 2);
  if (recs.length) { L.push('', '## 录制样本（前 2 条）'); for (const c of recs) L.push('```json', JSON.stringify({ p: c.req && c.req.p, resp: c.resp }, null, 1).slice(0, 1500), '```'); }
}
const ex = Object.entries(dsl).find(([n]) => !n.startsWith('_'));
if (ex) L.push('', '## 规则 DSL 示例', '```json', JSON.stringify({ [ex[0]]: ex[1] }, null, 1), '```');
if (fb.fails && fb.fails.length) L.push('', `## 上一轮（第 ${fb.attempt} 次）裁判意见——必须逐条修掉`, ...fb.fails.map(x => '- ' + x));
const out = L.join('\n') + '\n';
if (a.out) fs.writeFileSync(a.out, out); else process.stdout.write(out);
