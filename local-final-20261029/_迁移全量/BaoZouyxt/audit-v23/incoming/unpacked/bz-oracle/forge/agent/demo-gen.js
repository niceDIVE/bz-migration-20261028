#!/usr/bin/env node
// 演示生成器（自检用）：第 1 轮故意犯"手写 ivch 增量"的老错，第 2 轮读裁判意见后改走投射器 + 规则 DSL。
// 真实使用时把 nightly 的 --gen 换成你的 LLM 调用脚本，输入契约 + 请求参数 + 裁判意见，输出同格式的 handler 文件。
'use strict';
const fs = require('fs');
const [action, out, feedback, attempt] = process.argv.slice(2);
const fb = JSON.parse(fs.readFileSync(feedback, 'utf8'));
const lib = JSON.stringify(require('path').resolve(__dirname, '../lib'));
const dsl = JSON.stringify(require('path').resolve(__dirname, '../fixtures/rules.dsl.json'));
const tbl = JSON.stringify(require('path').resolve(__dirname, '../../fixtures/tables/item.json'));
let src;
if (+attempt === 1) {
  src = `const { withProjection } = require(${lib} + '/projector');
module.exports = { action: ${JSON.stringify(action)}, handler: withProjection(function (req, s) {
  const p = req.p; s.bag[p.itemID] = (s.bag[p.itemID] || 0) + p.num; s.coins -= 60 * p.num;
  return { eRet: 1, note: { ivch: { [p.itemID]: p.num } } };   // 老错：手写增量
}) };`;
} else {
  src = `const { compileAction } = require(${lib} + '/rules-dsl');
const spec = require(${dsl})[${JSON.stringify(action)}];
module.exports = { action: ${JSON.stringify(action)}, handler: compileAction(${JSON.stringify(action)}, spec, { item: require(${tbl}) }) };
// 根据裁判意见修正：${(fb.fails || []).slice(0, 1).join(' ').replace(/\n/g, ' ')}`;
}
fs.writeFileSync(out, src);
