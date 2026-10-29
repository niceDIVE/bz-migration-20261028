'use strict';
// 生成代码静态闸（中层审计 A6）：LLM 产出的 handler 文件在 require 之前必须通过。
// 规则（命中任一即拒绝，原因写进 feedback）：
//   G1 require 只能是静态字符串（字面量或字面量相加），且只能指向 forge/lib/projector、forge/lib/rules-dsl 或 *.json（只读数据）
//   G2 禁用标识符：process global globalThis eval Function child_process fs __dirname __filename Buffer setTimeout setInterval setImmediate Proxy Reflect WebAssembly
//   G3 禁止 import()、new Function、with、对 require/module 本身的非调用使用（如 module.constructor、require.cache）
//   G5 不得自定义 withProjection / compileAction（冒充投射包装）
//   G4 module.exports 只能赋一次，且必须形如 { action: '<字面量>', handler: withProjection(...) | compileAction(...) }
const acorn = require('acorn');
const walk = require('acorn-walk');
const BANNED = new Set(['process', 'global', 'globalThis', 'eval', 'Function', 'child_process', 'fs', '__dirname', '__filename', 'Buffer',
  'setTimeout', 'setInterval', 'setImmediate', 'Proxy', 'Reflect', 'WebAssembly', 'XMLHttpRequest', 'fetch']);
const REQ_OK = /(\/forge\/lib\/(projector|rules-dsl)(\.js)?$|^\.\.?\/.*lib\/(projector|rules-dsl)(\.js)?$|\.json$)/;
function staticStr(n) {
  if (n.type === 'Literal' && typeof n.value === 'string') return n.value;
  if (n.type === 'TemplateLiteral' && !n.expressions.length) return n.quasis[0].value.cooked;
  if (n.type === 'BinaryExpression' && n.operator === '+') { const l = staticStr(n.left), r = staticStr(n.right); return l === null || r === null ? null : l + r; }
  return null;
}
function gate(code, opt = {}) {
  const why = [];
  let ast;
  try { ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', locations: true }); } catch (e) { return { ok: false, why: ['G0 语法错误：' + e.message] }; }
  let exportsN = 0;
  walk.fullAncestor(ast, (n, _s, anc) => {
    const at = n.loc ? `:${n.loc.start.line}` : '';
    if (n.type === 'Identifier' && BANNED.has(n.name)) {
      const p = anc[anc.length - 2];
      const isKey = p && ((p.type === 'MemberExpression' && p.property === n && !p.computed) || (p.type === 'Property' && p.key === n && !p.computed));
      if (!isKey) why.push(`G2 禁用标识符 ${n.name}${at}`);
    }
    // G5 不得自定义同名函数冒充投射包装（e5 反例；WeakSet 是第二道闸）
    if ((n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression') && n.id && ['withProjection', 'compileAction'].includes(n.id.name)) why.push(`G5 自定义 ${n.id.name}${at}`);
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && ['withProjection', 'compileAction'].includes(n.id.name)) why.push(`G5 自定义 ${n.id.name}${at}`);
    if (n.type === 'ImportExpression') why.push(`G3 禁止 import()${at}`);
    if (n.type === 'WithStatement') why.push(`G3 禁止 with${at}`);
    if (n.type === 'NewExpression' && n.callee.type === 'Identifier' && n.callee.name === 'Function') why.push(`G3 禁止 new Function${at}`);
    if (n.type === 'Identifier' && n.name === 'require') {
      const p = anc[anc.length - 2];
      if (!(p && p.type === 'CallExpression' && p.callee === n)) { why.push(`G3 require 非调用使用${at}`); return; }
      let s = p.arguments[0] && staticStr(p.arguments[0]);
      // 处置验收 §五.1：Windows 上 path.resolve 产出反斜杠/混合分隔符，先统一成正斜杠再比白名单
      if (typeof s === 'string') s = s.replace(/\\/g, '/');
      if (s === null || s === undefined) why.push(`G1 require 参数不是静态字符串${at}`);
      else if (!REQ_OK.test(s)) why.push(`G1 require 目标不在白名单：${s}${at}`);
    }
    if (n.type === 'MemberExpression' && n.object.type === 'Identifier' && n.object.name === 'module') {
      const prop = n.computed ? null : n.property.name;
      if (prop !== 'exports') why.push(`G3 访问 module.${prop || '[…]'}${at}`);
    }
    if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression' && n.left.object.name === 'module' && !n.left.computed && n.left.property.name === 'exports') {
      exportsN++;
      const r = n.right;
      const prop = k => r.type === 'ObjectExpression' && r.properties.find(x => x.key && (x.key.name === k || x.key.value === k));
      const act = prop('action'), h = prop('handler');
      if (!act || staticStr(act.value) === null) why.push(`G4 module.exports.action 必须是字符串字面量${at}`);
      else if (opt.action && staticStr(act.value) !== opt.action) why.push(`G4 action=${staticStr(act.value)} 与本轮动作 ${opt.action} 不符${at}`);
      const callee = h && h.value.type === 'CallExpression' && h.value.callee;
      const cname = callee && (callee.type === 'Identifier' ? callee.name : callee.type === 'MemberExpression' && !callee.computed ? callee.property.name : null);
      if (!h || !['withProjection', 'compileAction'].includes(cname)) why.push(`G4 handler 必须是 withProjection(...) 或 compileAction(...) 的直接结果${at}`);
    }
  });
  if (exportsN !== 1) why.push(`G4 module.exports 赋值 ${exportsN} 次（应恰为 1 次）`);
  return { ok: !why.length, why: [...new Set(why)] };
}
module.exports = { gate };
if (require.main === module) {
  const fs = require('fs'); let bad = 0;
  for (const f of process.argv.slice(2)) { const r = gate(fs.readFileSync(f, 'utf8')); console.log(`${r.ok ? '✔' : '✘'} ${f}${r.ok ? '' : '\n    ' + r.why.join('\n    ')}`); if (!r.ok) bad++; }
  process.exit(bad ? 1 : 0);
}
