/* dump_comp_src —— 导出组件类的全部方法源码（读客户端规格，不靠猜）
 * 默认导出 SvrSelectView；第二个参数可指定其它组件类名 */
(function (WANT) {
  WANT = WANT || (typeof window !== 'undefined' && window.__PROBE_ARG__) || 'SvrSelectView';
  function compOf(node, want) {
    var cs = (node && node._components) || [];
    for (var i = 0; i < cs.length; i++) {
      var nm = '';
      try { nm = cs[i].__classname__ || (cs[i].constructor && cs[i].constructor.name) || ''; } catch (e) {}
      if (nm === want) return cs[i];
    }
    return null;
  }
  function walk(n, want, d) {
    if (!n || d < 0) return null;
    var c = compOf(n, want);
    if (c) return c;
    var ch = n.children || [];
    for (var i = 0; i < ch.length; i++) {
      var r = walk(ch[i], want, d - 1);
      if (r) return r;
    }
    return null;
  }

  var sc = cc.director.getScene();
  var target = walk(sc, WANT, 8);
  if (!target) return 'NOT FOUND: ' + WANT + ' @ ' + (sc && sc.name);

  var out = ['### ' + WANT + ' ###'];
  var proto = Object.getPrototypeOf(target);
  var names = Object.getOwnPropertyNames(proto);
  for (var i = 0; i < names.length; i++) {
    var k = names[i];
    if (k === 'constructor') continue;
    var v;
    try { v = proto[k]; } catch (e) { continue; }
    if (typeof v !== 'function') continue;
    var src = '';
    try { src = String(v); } catch (e) { src = '?'; }
    out.push('\n=== ' + k + ' ===\n' + src.slice(0, 6000));
  }
  // 实例字段（非函数）
  out.push('\n### instance fields ###');
  for (var f in target) {
    try {
      if (typeof target[f] === 'function') continue;
      var s = JSON.stringify(target[f]);
      if (s === undefined) s = String(target[f]);
      out.push(f + ' = ' + String(s).slice(0, 300));
    } catch (e) {}
  }
  return out.join('\n');
})
