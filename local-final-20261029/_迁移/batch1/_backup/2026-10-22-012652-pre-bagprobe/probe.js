(function () {
  // 直接问正在开着的 ItemSystemUI 组件：它自己的数据列表是空的吗（只读组件字段，不做 BFS）
  var sc = cc.director && cc.director.getScene();
  if (!sc) return 'NO_SCENE';

  var found = null, n = 0;
  function walk(node, depth) {
    if (!node || depth < 0 || found || n > 3000) return;
    n++;
    var cs = node._components || [];
    for (var i = 0; i < cs.length; i++) {
      var cn = '';
      try { cn = cs[i].__classname__ || (cs[i].constructor && cs[i].constructor.name) || ''; } catch (e) {}
      if (cn === 'ItemSystemUI') { found = cs[i]; return; }
    }
    var ch = node.children || [];
    for (var k = 0; k < ch.length; k++) walk(ch[k], depth - 1);
  }
  walk(sc, 10, 0);
  if (!found) return 'NO_COMP nodes=' + n;

  var out = { nodes: n, itemTypeValue: found.itemTypeValue, currentIndex: found.currentIndex };
  try { out.itemDataLen = (found._itemDataList || []).length; } catch (e) { out.itemDataLen = 'ERR'; }
  try { out.equipDataLen = (found._equipDataList || []).length; } catch (e) { out.equipDataLen = 'ERR'; }
  try { out.keys = Object.keys(found).slice(0, 40); } catch (e) {}
  try {
    var it = found._itemDataList && found._itemDataList[0];
    out.first = it ? Object.keys(it).slice(0, 12) : null;
  } catch (e) {}
  return JSON.stringify(out).slice(0, 2000);
})()
