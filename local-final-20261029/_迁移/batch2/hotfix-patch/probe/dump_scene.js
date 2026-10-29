/* dump_scene —— 进程内探针：导出场景树 + 可点组件清单
 * 用法（经 run.ps1 probe 推送执行），返回 JSON 字符串 */
(function () {
  var MAXD = 5;
  var tree = [], buttons = [], edits = [], labels = [];

  function compName(c) {
    try {
      if (c.__classname__) return c.__classname__;
      if (c.constructor && c.constructor.name) return c.constructor.name;
      return '?';
    } catch (e) { return '?'; }
  }

  function pathOf(n) {
    var p = [];
    while (n) { p.unshift(n.name); n = n.parent; }
    return p.join('/');
  }

  function walk(n, d) {
    if (!n || d > MAXD) return;
    var comps = [], i, c;
    var list = n._components || [];
    for (i = 0; i < list.length; i++) {
      c = list[i];
      var cn = compName(c);
      comps.push(cn);
      if (cn === 'cc.Button' || cn === 'Button') {
        var evts = [];
        try {
          (c.clickEvents || []).forEach(function (e) {
            evts.push({
              target: e.target ? e.target.name : null,
              component: e.component || null,
              handler: e.handler || null,
              customEventData: e.customEventData || null,
            });
          });
        } catch (er) { evts.push({ err: String(er) }); }
        buttons.push({ path: pathOf(n), active: n.activeInHierarchy, interactable: c.interactable, events: evts });
      }
      if (cn === 'cc.EditBox' || cn === 'EditBox') {
        edits.push({ path: pathOf(n), active: n.activeInHierarchy, string: c.string, placeholder: c.placeholder });
      }
      if (cn === 'cc.Label' || cn === 'Label') {
        try { labels.push({ path: pathOf(n), text: String(c.string).slice(0, 60) }); } catch (e) {}
      }
    }
    tree.push(d + '|' + n.name + '|' + (n.active ? '1' : '0') + '|' + comps.join(','));
    var ch = n.children || [];
    for (var j = 0; j < ch.length; j++) walk(ch[j], d + 1);
  }

  var sc = null;
  try { sc = cc.director.getScene(); } catch (e) {}
  if (sc) walk(sc, 0);

  return JSON.stringify({
    scene: sc ? sc.name : null,
    tree: tree,
    buttons: buttons,
    edits: edits,
    labels: labels.slice(0, 60),
  });
})()
