(function () {
  var sc = cc.director.getScene(), out = [], stack = [[sc, 0]];
  function pathOf(n) { var p = []; while (n) { p.unshift(n.name); n = n.parent; } return p.join('/'); }
  while (stack.length && out.length < 120) {
    var it = stack.pop(), n = it[0], d = it[1];
    if (!n || !n.activeInHierarchy) continue;
    var cs = (n._components || []).map(function (c) { try { return c.__classname__ || ''; } catch (e) { return ''; } });
    if (d <= 5) out.push(d + '|' + pathOf(n) + '|' + cs.join(','));
    if (d < 7) (n.children || []).forEach(function (c) { stack.push([c, d + 1]); });
  }
  return out.join('\n');
})()
