/* press —— 按名字找到节点并"点"它（优先 cc.Button.clickEvents，其次 emit('click')）
 * 参数：节点名（如 TaskButton），先精确匹配，再后缀匹配 */
(function (name) {
  if (!name) return JSON.stringify({ err: 'no name' });
  var sc = null;
  try { sc = cc.director.getScene(); } catch (e) {}
  if (!sc) return JSON.stringify({ err: 'no scene' });

  function pathOf(n) { var p = []; while (n) { p.unshift(n.name); n = n.parent; } return p.join('/'); }
  function compName(c) { try { return c.__classname__ || (c.constructor && c.constructor.name) || ''; } catch (e) { return ''; } }

  var byLabel = name.indexOf('label:') === 0;
  var want = byLabel ? name.slice(6) : name;
  var exact = null, suffix = null, stack = [sc];
  function lblOf(n) {
    var st = [n], k = 0;
    while (st.length && k < 40) {
      k++;
      var x = st.pop(), cs = x._components || [];
      for (var i = 0; i < cs.length; i++) {
        var nm2 = compName(cs[i]);
        if ((nm2 === 'cc.Label' || nm2 === 'Label') && cs[i].string) return String(cs[i].string);
      }
      var ch2 = x.children || [];
      for (var j2 = 0; j2 < ch2.length; j2++) st.push(ch2[j2]);
    }
    return '';
  }
  while (stack.length) {
    var n = stack.pop();
    if (!n) continue;
    if (byLabel) { if (lblOf(n) === want && !exact) exact = n; }
    else {
      if (n.name === name && !exact) exact = n;
      else if (!suffix && n.name.indexOf(name) >= 0) suffix = n;
    }
    var ch = n.children || [];
    for (var i = 0; i < ch.length; i++) stack.push(ch[i]);
  }
  var node = exact || suffix;
  if (!node) return JSON.stringify({ err: 'not found', name: name });

  var info = { path: pathOf(node), active: node.activeInHierarchy, by: exact ? 'exact' : 'suffix', actions: [] };

  var cs = node._components || [];
  for (var j = 0; j < cs.length; j++) {
    if (compName(cs[j]) === 'cc.Button' || compName(cs[j]) === 'Button') {
      var evs = cs[j].clickEvents || [];
      info.clickEvents = evs.length;
      if (evs.length && cc.Component && cc.Component.EventHandler) {
        try { cc.Component.EventHandler.emitEvents(evs, { type: 'click' }); info.actions.push('emitEvents'); } catch (e) { info.actions.push('emitEvents ERR ' + e); }
      }
    }
  }
  if (!info.actions.length) {
    try { node.emit('click', node); info.actions.push("emit('click')"); } catch (e) { info.actions.push("emit ERR " + e); }
    try { node.emit(cc.Node.EventType.TOUCH_END, { stopPropagation: function () {} }); info.actions.push('TOUCH_END'); } catch (e) { info.actions.push('TOUCH_END ERR ' + e); }
  }
  return JSON.stringify(info);
})
