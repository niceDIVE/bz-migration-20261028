(function () {
  // 只读探针 4：定位「金条」那个 Label 的归属组件 —— 找出到底是谁在给它赋值
  var out = { errs: [] };
  var sc = cc.director && cc.director.getScene();
  if (!sc) return 'NO_SCENE';

  var hit = null, n = 0;
  (function walk(node, d) {
    if (!node || d < 0 || hit || n > 6000) return;
    n++;
    var cs = node._components || [];
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      try {
        if (c && typeof c.string === 'string' && c.string.indexOf('金条') >= 0) { hit = c; return; }
      } catch (e) {}
    }
    var ch = node.children || [];
    for (var k = 0; k < ch.length; k++) walk(ch[k], d - 1);
  })(sc, 12, 0);

  out.nodes = n;
  if (!hit) return JSON.stringify(out);

  var cn = function (c) {
    try { return c.__classname__ || (c.constructor && c.constructor.name) || ''; } catch (e) { return ''; }
  };

  out.labelText = hit.string;
  // 往上一层层看：节点名 + 该节点上的组件类名
  var chain = [], nd = hit.node;
  for (var up = 0; up < 6 && nd; up++) {
    var info = { node: nd.name, comps: [] };
    var cs2 = nd._components || [];
    for (var j = 0; j < cs2.length; j++) info.comps.push(cn(cs2[j]));
    chain.push(info);
    nd = nd.parent;
  }
  out.chain = chain;

  // 找出链上「不是 UIComponent/Label 之类」的组件，导出它的属性名，找哪个字段像存放金条数值
  out.candidates = [];
  for (var u = 0; u < chain.length; u++) {
    var node3 = hit.node;
    for (var s = 0; s < u && node3; s++) node3 = node3.parent;
    if (!node3) continue;
    var cs3 = node3._components || [];
    for (var m = 0; m < cs3.length; m++) {
      var comp = cs3[m], klass = cn(comp);
      if (klass === 'cc.Label' || klass === 'cc.Sprite' || klass === 'cc.UITransform' || klass === 'cc.Widget') continue;
      var own = [];
      try {
        for (var p in comp) {
          if (!Object.prototype.hasOwnProperty.call(comp, p)) continue;
          if (p.charAt(0) === '_') continue;
          var v = comp[p];
          var ty = typeof v;
          if (ty === 'function' || v === null || v === undefined) continue;
          if (ty === 'object' && !(v && v.node)) continue;
          own.push(p + ':' + ty + (ty === 'object' && v && v.node ? '(' + (v.node.name || '') + ')' : ''));
          if (own.length >= 25) break;
        }
      } catch (e) {}
      out.candidates.push({ klass: klass, node: node3.name, props: own });
      if (out.candidates.length >= 4) { u = 99; break; }
    }
  }
  return JSON.stringify(out).slice(0, 3200);
})()
