(function () {
  // 列出当前场景里"看起来像背包/物品"的节点与组件名（只看结构与名字，不碰数据，绝不做全图 BFS）
  var sc = cc.director && cc.director.getScene();
  if (!sc) return 'NO_SCENE';
  var out = [], n = 0, BUDGET = 4000;
  var RE = /(item|Item|bag|Bag|prop|Prop|inventor|Inventor|knapsack|Knapsack)/;

  function walk(node, depth, path) {
    if (!node || depth < 0 || n > 2000 || out.length > 120) return;
    n++;
    var kids = node.children || [];
    var name = '';
    try { name = node.name || ''; } catch (e) {}
    var hit = RE.test(name);
    var comps = [];
    var cs = node._components || [];
    for (var i = 0; i < cs.length; i++) {
      var cn = '';
      try { cn = cs[i].__classname__ || (cs[i].constructor && cs[i].constructor.name) || ''; } catch (e) {}
      if (cn) { comps.push(cn); if (RE.test(cn)) hit = true; }
    }
    if (hit) out.push(path + '/' + name + ' [' + comps.join(',') + ']');
    for (var k = 0; k < kids.length; k++) walk(kids[k], depth - 1, depth > 2 ? path + '/' + name : '');
  }
  walk(sc, 7, '');

  // 再直接从可能存在的背包组件上找"它读哪个字段"
  var fields = [];
  var q = [sc], seen = new Set(), m = 0;
  while (q.length && m < 400) {
    var o = q.shift(); m++;
    if (!o || typeof o !== 'object') continue;
    if (seen.has(o)) continue;
    seen.add(o);
    var cn2 = '';
    try { cn2 = o.__classname__ || (o.constructor && o.constructor.name) || ''; } catch (e) {}
    if (cn2 && RE.test(cn2)) {
      var ks = [];
      try { ks = Object.keys(o).slice(0, 40); } catch (e) {}
      fields.push(cn2 + ' :: ' + ks.join(','));
    }
    var ch = (o.children || []);
    for (var i2 = 0; i2 < ch.length && i2 < 40; i2++) q.push(ch[i2]);
  }
  return JSON.stringify({ nodes: n, hits: out, comps: fields }, null, 0).slice(0, 3500);
})()
