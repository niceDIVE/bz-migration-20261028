(function () {
  var sc = cc.director.getScene(), out = [], stack = [[sc, 0]];
  function pathOf(n) { var p = []; while (n) { p.unshift(n.name); n = n.parent; } return p.join('/'); }
  function cn(c) { try { return c.__classname__ || ''; } catch (e) { return ''; } }
  while (stack.length && out.length < 400) {
    var it = stack.pop(), n = it[0], d = it[1];
    if (!n) continue;
    var comps = (n._components || []).map(cn).join(',');
    var act = n.activeInHierarchy ? 1 : 0;
    if (act && (/Guide|Overlay|Mask|Block|Loading|Alert|PopUp/i.test(comps) || /Guide|Block|Loading/i.test(n.name))) {
      out.push('ACTIVE ' + pathOf(n) + ' [' + comps + ']');
    }
    (n.children || []).forEach(function (c) { stack.push([c, d + 1]); });
  }
  // 顺便报告关键容器状态
  var keys = ['Canvas/mapcontainer', 'Canvas/mapcontainer/scenecontent', 'Canvas/mapcontainer/scenecontent/touchLayer'];
  var kb = [];
  keys.forEach(function (k) {
    var n = null; try { n = cc.find(k, sc); } catch (e) {}
    if (n) kb.push(k + ' active=' + (n.activeInHierarchy ? 1 : 0));
  });
  return JSON.stringify({ blockers: out.slice(0, 25), keyNodes: kb });
})()
