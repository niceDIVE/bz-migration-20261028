(function () {
  // 只读：金条补丁到底生效没有
  var out = {};
  var R = window.__require;
  out.hasRequire = typeof R === 'function';
  if (!out.hasRequire) return JSON.stringify(out);
  var m = null;
  try { m = R('RoleBaseInfo'); } catch (e) { out.err = String(e && e.message); return JSON.stringify(out); }
  var B = m && (m.RoleBaseInfo || m);
  out.sameObj = !!B;
  try { out.yuanbao = String(B.yuanbao); } catch (e) { out.yuanbao = 'ERR ' + e; }
  try { out.rawYuanbao = String(B._yuanbao); } catch (e) {}
  try { out.gold = String(B.gold); } catch (e) {}
  try { out.coins = String(B.coins); } catch (e) {}
  try { out.userName = String(B.userName); } catch (e) {}
  // 面板上那个标签现在写的是什么
  try {
    var sc = cc.director.getScene(), found = [], n = 0;
    (function walk(nd, d) {
      if (!nd || d < 0 || n > 4000) return;
      n++;
      var cs = nd._components || [];
      for (var i = 0; i < cs.length; i++) {
        var lbl = cs[i];
        if (lbl && lbl.string !== undefined && typeof lbl.string === 'string' && lbl.string.indexOf('金条') >= 0) found.push(lbl.string);
      }
      var ch = nd.children || [];
      for (var k = 0; k < ch.length; k++) walk(ch[k], d - 1);
    })(sc, 12, 0);
    out.labels = found.slice(0, 6);
    out.nodes = n;
  } catch (e) { out.err2 = String(e && e.message); }
  return JSON.stringify(out);
})()
