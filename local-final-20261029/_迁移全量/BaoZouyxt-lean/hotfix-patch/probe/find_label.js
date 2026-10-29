(function () {
  var out = [];
  var target = "\u8bf7\u9009\u62e9\u670d\u52a1\u5668";
  function walk(n, path) {
    try {
      var comps = n.components || [];
      for (var i = 0; i < comps.length; i++) {
        var c = comps[i];
        try {
          if (c && typeof c.string === "string" && c.string.indexOf(target) >= 0) {
            var chain = [];
            var p = n.parent;
            while (p) { chain.push(p.name); p = p.parent; }
            out.push("LABEL FOUND at " + path + "/" + n.name);
            out.push("  parents: " + chain.join(" < "));
            var cls = [];
            for (var ci = 0; ci < comps.length; ci++) cls.push(comps[ci].__classname__ || "C");
            out.push("  comps: " + cls.join(","));
          }
        } catch (e) {}
      }
      var ch = n.children || [];
      for (var j = 0; j < ch.length; j++) walk(ch[j], path + "/" + n.name);
    } catch (e) {}
  }
  walk(cc.director.getScene(), "");

  // 顺带扫描属性名像服务器/列表的组件字段
  var hits = [];
  function scan(n) {
    try {
      var cs = n.components || [];
      for (var i = 0; i < cs.length; i++) {
        var c = cs[i];
        for (var k in c) {
          try {
            if (!/svr|server|list|Server|List/.test(k)) continue;
            var v = c[k];
            if (v === null || v === undefined) continue;
            var s = typeof v === "object" ? JSON.stringify(v) : String(v);
            if (!s) continue;
            hits.push(n.name + "." + k + " = " + s.slice(0, 120));
          } catch (e) {}
        }
      }
      var ch = n.children || [];
      for (var j = 0; j < ch.length; j++) scan(ch[j]);
    } catch (e) {}
  }
  scan(cc.director.getScene());
  out.push("--- server-ish fields ---");
  out = out.concat(hits.slice(0, 25));
  return out.join("\n");
})()
