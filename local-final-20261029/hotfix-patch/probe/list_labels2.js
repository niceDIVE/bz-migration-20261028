(function () {
  var out = [];
  function comps(n) { var c = n._components || n.components || []; return c; }
  function walk(n, path) {
    try {
      var cs = comps(n);
      for (var i = 0; i < cs.length; i++) {
        var c = cs[i];
        try {
          var s = null;
          if (typeof c.string === "string") s = c.string;
          else if (typeof c._string === "string") s = c._string;
          if (s && s.length) out.push(path + "/" + n.name + " :: " + s.slice(0, 50));
        } catch (e) {}
      }
      var ch = n.children || [];
      for (var j = 0; j < ch.length; j++) walk(ch[j], path + "/" + n.name);
    } catch (e) {}
  }
  walk(cc.director.getScene(), "");
  return out.slice(0, 60).join("\n") || "NO_LABELS";
})()
