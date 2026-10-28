(function () {
  var out = [];
  function walk(n, path) {
    try {
      var comps = n.components || [];
      for (var i = 0; i < comps.length; i++) {
        var c = comps[i];
        try {
          var s = null;
          if (typeof c.string === "string") s = c.string;
          else if (typeof c._string === "string") s = c._string;
          else if (c._N$string && typeof c._N$string === "string") s = c._N$string;
          if (s && s.length) out.push(path + "/" + n.name + " :: " + s.slice(0, 60));
        } catch (e) {}
      }
      var ch = n.children || [];
      for (var j = 0; j < ch.length; j++) walk(ch[j], path + "/" + n.name);
    } catch (e) {}
  }
  walk(cc.director.getScene(), "");
  var popup = null;
  try {
    var pl = cc.director.getScene().getChildByName("Canvas").getChildByName("PopupLayer");
    if (pl) {
      popup = "PopupLayer children: ";
      var names = [];
      for (var q = 0; q < pl.children.length; q++) names.push(pl.children[q].name);
      popup += names.join(",");
    }
  } catch (e) { popup = "popup err " + e; }
  return out.slice(0, 60).join("\n") + "\n" + (popup || "no popup");
})()
