/* dump_hud —— 只找「能点的东西」：按钮 / 带 clickEvents 的节点 / EditBox
 * 深度不设限，但只输出可交互项，避免刷屏 */
(function () {
  var out = { scene: null, layers: [], buttons: [], edits: [], labels: [] };
  var sc = null;
  try { sc = cc.director.getScene(); } catch (e) {}
  if (!sc) return JSON.stringify({ err: 'no scene' });
  out.scene = sc.name;

  function compName(c) {
    try { return c.__classname__ || (c.constructor && c.constructor.name) || ''; } catch (e) { return ''; }
  }
  function pathOf(n) {
    var p = [];
    while (n) { p.unshift(n.name); n = n.parent; }
    return p.join('/');
  }

  (sc.children || []).forEach(function (c) { out.layers.push(c.name + (c.activeInHierarchy ? '' : '(inactive)')); });

  var stack = [sc], guard = 0;
  while (stack.length && guard < 4000) {
    guard++;
    var n = stack.pop();
    if (!n) continue;
    var cs = n._components || [];
    for (var i = 0; i < cs.length; i++) {
      var nm = compName(cs[i]);
      if (nm === 'cc.Button' || nm === 'Button') {
        var ev = [];
        try { (cs[i].clickEvents || []).forEach(function (e) { ev.push((e.target ? e.target.name : '?') + '.' + (e.handler || '?')); }); } catch (e) {}
        out.buttons.push({ path: pathOf(n), active: n.activeInHierarchy, ev: ev, lbl: labelOf(n) });
      } else if (nm === 'cc.EditBox' || nm === 'EditBox') {
        out.edits.push({ path: pathOf(n), active: n.activeInHierarchy, text: String(cs[i].string || '').slice(0, 30) });
      }
    }
    var ch = n.children || [];
    for (var j = 0; j < ch.length; j++) stack.push(ch[j]);
  }

  function labelOf(n) {
    var st = [n], k = 0;
    while (st.length && k < 40) {
      k++;
      var x = st.pop();
      var cs = x._components || [];
      for (var i = 0; i < cs.length; i++) {
        var nm = compName(cs[i]);
        if ((nm === 'cc.Label' || nm === 'Label') && cs[i].string) return String(cs[i].string).slice(0, 24);
      }
      var ch = x.children || [];
      for (var j = 0; j < ch.length; j++) st.push(ch[j]);
    }
    return '';
  }

  return JSON.stringify(out);
})()
