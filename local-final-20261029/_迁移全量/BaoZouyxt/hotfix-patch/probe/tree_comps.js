(function () {
  var out = [];
  function walk(n, path) {
    try {
      var cs = n._components || [];
      var names = [];
      for (var i = 0; i < cs.length; i++) {
        var c = cs[i];
        var nm = "?";
        try { nm = c.__classname__ || (c.constructor && c.constructor.name) || "C"; } catch (e) {}
        names.push(nm);
      }
      if (names.length && path.split("/").length <= 5) out.push(path + "/" + n.name + " [" + names.join(",") + "]");
      var ch = n.children || [];
      for (var j = 0; j < ch.length; j++) walk(ch[j], path + "/" + n.name);
    } catch (e) {}
  }
  walk(cc.director.getScene(), "");
  return out.slice(0, 45).join("\n");
})()
