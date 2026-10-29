/* tap —— 把节点换算成屏幕坐标，返回给宿主机做 adb shell input tap
 * 参数：节点名（精确优先，其次后缀包含） */
(function (name) {
  if (!name) return JSON.stringify({ err: 'no name' });
  var sc = null;
  try { sc = cc.director.getScene(); } catch (e) {}
  if (!sc) return JSON.stringify({ err: 'no scene' });

  function pathOf(n) { var p = []; while (n) { p.unshift(n.name); n = n.parent; } return p.join('/'); }
  var byLabel = name.indexOf('label:') === 0;
  var want = byLabel ? name.slice(6) : name;
  var exact = null, suffix = null, stack = [sc];
  function lblOf(n) {
    var st = [n], k = 0;
    while (st.length && k < 40) {
      k++;
      var x = st.pop(), cs = x._components || [];
      for (var i = 0; i < cs.length; i++) {
        var nm2 = (function (c) { try { return c.__classname__ || (c.constructor && c.constructor.name) || ''; } catch (e) { return ''; } })(cs[i]);
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
  if (!node.activeInHierarchy) return JSON.stringify({ err: 'inactive', path: pathOf(node) });

  var wp = node.convertToWorldSpaceAR(cc.v2(0, 0));
  var frame = cc.view.getFrameSize();      // 设备像素
  var vp = cc.view.getViewportRect();      // 视口（像素）
  var scale = cc.view.getScaleX();
  // Cocos 世界坐标原点在左下；Android 屏幕原点在左上
  var sx = Math.round(vp.x + wp.x * scale);
  var sy = Math.round(frame.height - (vp.y + wp.y * scale));

  return JSON.stringify({
    path: pathOf(node), name: node.name,
    world: [Math.round(wp.x), Math.round(wp.y)],
    screen: [sx, sy], frame: [frame.width, frame.height], scale: scale,
  });
})
