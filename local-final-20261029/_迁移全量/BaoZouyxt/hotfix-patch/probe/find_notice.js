(function () {
  var sc = cc.director.getScene(), out = [], stack = [sc];
  function pathOf(n) { var p = []; while (n) { p.unshift(n.name); n = n.parent; } return p.join('/'); }
  function cn(c) { try { return c.__classname__ || ''; } catch (e) { return ''; } }
  while (stack.length && out.length < 40) {
    var n = stack.pop();
    if (!n || !n.activeInHierarchy) continue;
    var cs = n._components || [];
    for (var i = 0; i < cs.length; i++) {
      var nm = cn(cs[i]);
      if (/Notice|Announce/i.test(nm)) {
        var ms = [];
        var proto = Object.getPrototypeOf(cs[i]);
        Object.getOwnPropertyNames(proto).forEach(function (k) { if (typeof proto[k] === 'function' && k !== 'constructor') ms.push(k); });
        out.push(pathOf(n) + ' [' + nm + '] ' + ms.join(','));
      }
    }
    (n.children || []).forEach(function (c) { stack.push(c); });
  }
  return JSON.stringify(out);
})()
