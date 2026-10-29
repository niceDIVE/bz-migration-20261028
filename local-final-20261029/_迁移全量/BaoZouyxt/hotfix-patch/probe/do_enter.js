(function () {
  var out = [];
  try {
    var cv = cc.director.getScene().getChildByName("Canvas");
    var cs = cv._components || [];
    var sv = null;
    for (var i = 0; i < cs.length; i++) {
      var nm = "";
      try { nm = cs[i].__classname__ || (cs[i].constructor && cs[i].constructor.name) || ""; } catch (e) {}
      if (nm === "SvrSelectView") { sv = cs[i]; break; }
    }
    if (!sv) return "SvrSelectView NOT FOUND";

    // 关掉可能挡在前面的 Alert
    try {
      for (var a = 0; a < cc.director.getScene().children.length; a++) {
        var pn = cc.director.getScene().children[a];
        if (pn.name === "persistentnode") {
          for (var b = 0; b < pn.children.length; b++) {
            if (pn.children[b].name === "Alert") { pn.children[b].active = false; }
          }
        }
      }
    } catch (e) {}

    var entry = [220, "https://bzgf.maple-game.com", "800-server-166", "900-server-166", 1, "\u6df7\u670d26\u533a", 33];
    var r1 = sv.setServer(entry);
    out.push("setServer ok, serverID=" + sv.serverID);

    var r2 = sv.onEnterGame();
    out.push("onEnterGame called, ret=" + String(r2));
    return out.join("\n");
  } catch (e) {
    return "ERR " + (e && e.stack ? e.stack : e);
  }
})()
