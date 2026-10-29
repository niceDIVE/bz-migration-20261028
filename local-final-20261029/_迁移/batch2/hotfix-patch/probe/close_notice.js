(function () {
  var sc = cc.director.getScene(), stack = [sc], found = null;
  function cn(c) { try { return c.__classname__ || ''; } catch (e) { return ''; } }
  while (stack.length && !found) {
    var n = stack.pop();
    if (!n || !n.activeInHierarchy) continue;
    var cs = n._components || [];
    for (var i = 0; i < cs.length; i++) if (cn(cs[i]) === 'SmallNoticeUI') { found = cs[i]; break; }
    (n.children || []).forEach(function (c) { stack.push(c); });
  }
  if (!found) return 'no notice panel';
  try { found.onBack(); return 'notice closed via onBack()'; } catch (e) { return 'ERR ' + e; }
})()
