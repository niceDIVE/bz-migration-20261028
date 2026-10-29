(function () {
  var out = [];
  function walk(n) {
    try {
      var cs = n.components || [];
      for (var i = 0; i < cs.length; i++) {
        var c = cs[i];
        for (var k in c) {
          try {
            var v = c[k];
            if (v && typeof v.length === "number" && v.length > 0 && v[0] && typeof v[0] === "object" && v[0].length >= 5) {
              out.push(n.name + "." + k + " len=" + v.length + " first=" + JSON.stringify(v[0]).slice(0, 90));
            }
          } catch (e) {}
        }
      }
      var ch = n.children || [];
      for (var j = 0; j < ch.length; j++) walk(ch[j]);
    } catch (e) {}
  }
  walk(cc.director.getScene());
  return out.length ? out.slice(0, 20).join("\n") : "NONE";
})()
