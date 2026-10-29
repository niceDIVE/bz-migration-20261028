(function () {
  var sc = cc.director.getScene(), out = [], stack = [sc];
  function pathOf(n) { var p = []; while (n) { p.unshift(n.name); n = n.parent; } return p.join('/'); }
  function cn(c) { try { return c.__classname__ || ''; } catch (e) { return ''; } }
  while (stack.length && out.length < 60) {
    var n = stack.pop();
    if (!n || !n.activeInHierarchy) continue;
    var comps = (n._components || []).map(cn).filter(function (x) { return x && x.indexOf('cc.') !== 0; });
    if (comps.length && /Story|Plot|Guide|Cutscene|Action|Dialog|Talk/i.test(comps.join(','))) out.push(pathOf(n) + ' [' + comps.join(',') + ']');
    (n.children || []).forEach(function (c) { stack.push(c); });
  }
  return JSON.stringify(out);
})()
