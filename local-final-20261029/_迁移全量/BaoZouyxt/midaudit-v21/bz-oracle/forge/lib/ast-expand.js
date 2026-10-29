'use strict';
// AST 版命名处理器展开器（acorn）：比正则版多处理 作用域遮蔽 / 别名链 / 子字段别名 / for-in / 计算属性，压缩产物也稳定。
const acorn = require('acorn');
const walk = require('acorn-walk');

const LOGGERS = /^(cc\.(log|warn|error)|console\.\w+|parseInt|parseFloat|Number|String|Boolean|JSON\.stringify|isNaN)$/;
const BUILTIN = new Set(['hasOwnProperty', 'toString', 'length', 'constructor', 'valueOf', 'call', 'apply', 'bind', 'forEach', 'map', 'filter', 'indexOf', 'push', 'concat', 'slice', 'join', 'keys', 'sort', 'splice', 'some', 'every', 'reduce']);

function src(node, code) { return code.slice(node.start, node.end); }
function propName(m) { if (!m.computed) return m.property.name; if (m.property.type === 'Literal' && typeof m.property.value === 'string') return m.property.value; return null; }
function isFn(n) { return n && (n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression' || n.type === 'FunctionDeclaration'); }

class FileIndex {
  constructor(code, file) {
    this.code = code; this.file = file;
    this.ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowHashBang: true, allowReturnOutsideFunction: true });
    this.methods = new Map(); // name -> [{fn, line}]
    this.onCalls = new Map(); // line -> [CallExpression]
    const add = (name, fn) => { if (!name || !isFn(fn)) return; if (!this.methods.has(name)) this.methods.set(name, []); this.methods.get(name).push({ fn, line: fn.loc.start.line }); };
    const self = this;
    walk.simple(this.ast, {
      AssignmentExpression(n) { if (n.left.type === 'MemberExpression') add(propName(n.left), n.right); },
      Property(n) { const k = n.key.type === 'Identifier' ? n.key.name : n.key.value; add(k, n.value); },
      MethodDefinition(n) { add(n.key.name, n.value); },
      CallExpression(n) {
        if (n.callee.type === 'MemberExpression' && propName(n.callee) === 'on' && n.arguments.length >= 2) {
          const l = n.loc.start.line; if (!self.onCalls.has(l)) self.onCalls.set(l, []); self.onCalls.get(l).push(n);
        }
      },
    });
  }
  findMethod(name, nearLine) {
    const l = this.methods.get(name); if (!l) return null;
    return l.reduce((b, x) => (!b || Math.abs(x.line - nearLine) < Math.abs(b.line - nearLine) ? x : b), null).fn;
  }
}

// 分析函数 fn 中第 argIndex 个参数（应答对象）的读取
function analyze(fn, argIndex, prefix, idx, out, depth, maxDepth, visited) {
  const p = fn.params[argIndex];
  if (!p || p.type !== 'Identifier') { if (!p) return; out.escapes.push(`${prefix || '应答'} 以解构/默认值形式接收`); return; }
  const code = idx.code;
  // aliases: name -> prefix（'' 表示应答本身，'a' 表示 应答.a）
  const aliases = new Map([[p.name, prefix || '']]);
  const rec = (pref, field, sw, node) => {
    const top = pref ? pref.split('.')[0] : field;
    if (!top || BUILTIN.has(field)) return;
    const ef = out.fields[top] = out.fields[top] || { switch: false, plain: false, reads: [], nested: null };
    if (!pref) { if (sw) ef.switch = true; else ef.plain = true; }
    else { ef.plain = true; const sub = (pref.split('.').slice(1).concat(field)).join('.'); (ef.subFields = ef.subFields || {})[sub] = true; }
    if (ef.reads.length < 6) ef.reads.push({ file: idx.file, line: node.loc.start.line, mode: depth ? `AST展开${depth}跳` : 'AST展开' });
  };
  const join = (a, b) => (a ? a + '.' + b : b);
  // 被内层函数同名参数/变量遮蔽的标识符不算
  const shadowed = (ancestors, name) => ancestors.some(a => isFn(a) && a !== fn && a.params.some(q => q.type === 'Identifier' && q.name === name));
  const follow = (callee, argI, pref, node) => {
    const m = callee.type === 'MemberExpression' && callee.object.type === 'ThisExpression' && propName(callee);
    if (!m) return false;
    if (depth >= maxDepth) { out.escapes.push(`超过深度 ${maxDepth}：this.${m}`); return true; }
    const g = idx.findMethod(m, node.loc.start.line);
    if (!g) { out.escapes.push(`找不到 this.${m}`); return true; }
    const key = `${m}#${argI}#${pref}`;
    if (visited.has(key)) return true; visited.add(key);
    out.visited.push(`${m}@${idx.file}:${g.loc.start.line}`);
    analyze(g, argI, pref, idx, out, depth + 1, maxDepth, visited);
    return true;
  };
  // 两遍：先收集别名，再收集读取
  for (let pass = 0; pass < 2; pass++) walk.ancestor(fn.body, {
    VariableDeclarator(n, _s, anc) {
      if (pass || !n.init || n.id.type !== 'Identifier') return;
      if (n.init.type === 'Identifier' && aliases.has(n.init.name) && !shadowed(anc, n.init.name)) aliases.set(n.id.name, aliases.get(n.init.name));
      else if (n.init.type === 'MemberExpression' && n.init.object.type === 'Identifier' && aliases.has(n.init.object.name) && propName(n.init)) aliases.set(n.id.name, join(aliases.get(n.init.object.name), propName(n.init)));
    },
    AssignmentExpression(n, _s, anc) {
      if (pass || n.left.type !== 'Identifier') return;
      if (n.right.type === 'Identifier' && aliases.has(n.right.name)) aliases.set(n.left.name, aliases.get(n.right.name));
      else if (n.right.type === 'MemberExpression' && n.right.object.type === 'Identifier' && aliases.has(n.right.object.name) && propName(n.right)) aliases.set(n.left.name, join(aliases.get(n.right.object.name), propName(n.right)));
    },
    MemberExpression(n, _s, anc) {
      if (!pass || n.object.type !== 'Identifier' || !aliases.has(n.object.name) || shadowed(anc, n.object.name)) return;
      const pref = aliases.get(n.object.name), f = propName(n);
      const parent = anc[anc.length - 2];
      if (f === 'hasOwnProperty' && parent && parent.type === 'CallExpression' && parent.arguments[0] && parent.arguments[0].type === 'Literal') { rec(pref, String(parent.arguments[0].value), !pref, n); return; }
      if (f === null) {
        if (pref) { rec(pref, '[]', false, n); return; }            // 子字段上的下标访问 = 数组/字典元素读取
        out.escapes.push(`应答[${src(n.property, code)}] 动态键读取`); return;
      }
      rec(pref, f, false, n);
    },
    BinaryExpression(n, _s, anc) {
      if (!pass || n.operator !== 'in' || n.right.type !== 'Identifier' || !aliases.has(n.right.name) || n.left.type !== 'Literal') return;
      rec(aliases.get(n.right.name), String(n.left.value), !aliases.get(n.right.name), n);
    },
    ForInStatement(n) { if (pass && n.right.type === 'Identifier' && aliases.has(n.right.name)) { const pr = aliases.get(n.right.name); out.notes.push(`${pr || '应答'} 被 for-in 遍历：任意键都会被消费`); if (pr) rec('', pr.split('.')[0], false, n); } },
    CallExpression(n, _s, anc) {
      if (!pass) return;
      n.arguments.forEach((a, i) => {
        let pref = null;
        if (a.type === 'Identifier' && aliases.has(a.name) && !shadowed(anc, a.name)) pref = aliases.get(a.name);
        else if (a.type === 'MemberExpression' && a.object.type === 'Identifier' && aliases.has(a.object.name) && propName(a)) pref = join(aliases.get(a.object.name), propName(a));
        if (pref === null) return;
        if (a.type === 'MemberExpression' && !follow(n.callee, i, pref, n)) return; // 传子字段给外部函数：子字段本身已被记为读取
        if (a.type === 'Identifier' && !follow(n.callee, i, pref, n)) {
          const c = src(n.callee, code);
          if (!LOGGERS.test(c) && !/\.hasOwnProperty$/.test(c)) out.escapes.push(`${pref || '应答'} 整体传给 ${c.slice(0, 40)}()`);
        }
      });
    },
    ReturnStatement(n) { if (pass && n.argument && n.argument.type === 'Identifier' && aliases.has(n.argument.name) && !aliases.get(n.argument.name)) out.escapes.push('应答被 return'); },
    Identifier(n, _s, anc) {
      if (!pass) return;
      if (n.name === 'arguments' && !anc.slice(0, -1).some(a => isFn(a) && a !== fn)) out.escapes.push('使用 arguments');
      const parent = anc[anc.length - 2];
      if (aliases.has(n.name) && aliases.get(n.name) === '' && parent && parent.type === 'AssignmentExpression' && parent.right === n && parent.left.type === 'MemberExpression') out.escapes.push('应答被整体赋值保存');
    },
  });
}

// 展开一个契约的全部注册点
function expandContract(c, getIndex, maxDepth = 3) {
  const out = { fields: {}, escapes: [], visited: [], notes: [], anySite: false };
  for (const site of c.sites) {
    let idx;
    try { idx = getIndex(site.file); } catch (e) { out.escapes.push(`解析失败 ${site.file}：${e.message}`); continue; }
    if (!idx) { out.escapes.push(`缺源文件 ${site.file}`); continue; }
    const key = String(c.key || c.id || '').split('.').pop();
    let calls = idx.onCalls.get(site.line) || [];
    if (calls.length > 1 && key) calls = calls.filter(x => src(x.arguments[0], idx.code).endsWith('.' + key) || src(x.arguments[0], idx.code).includes('"' + key));
    if (!calls.length) { out.escapes.push(`${site.file}:${site.line} 没找到 .on( 调用`); continue; }
    for (const call of calls) {
      const h = call.arguments[1];
      let fn = null;
      if (isFn(h)) fn = h;
      else if (h.type === 'MemberExpression' && h.object.type === 'ThisExpression') {
        fn = idx.findMethod(propName(h), call.loc.start.line);
        if (fn) out.visited.push(`${propName(h)}@${site.file}:${fn.loc.start.line}`);
        else { out.escapes.push(`找不到 this.${propName(h)}`); continue; }
      } else { out.escapes.push(`处理器形态 ${h.type} 不支持`); continue; }
      out.anySite = true;
      analyze(fn, 1, '', idx, out, 0, maxDepth, new Set());
    }
  }
  return out;
}
module.exports = { FileIndex, expandContract };
