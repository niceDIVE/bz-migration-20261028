(function () {
  var base = jsb.fileUtils.getWritablePath();
  var errFile = base + "bz_err.txt";

  function logErr(msg) {
    try {
      var prev = jsb.fileUtils.isFileExist(errFile) ? jsb.fileUtils.getStringFromFile(errFile) : "";
      if (prev.length > 3000) prev = prev.slice(-3000);
      jsb.fileUtils.writeStringToFile(prev + msg + "\n", errFile);
    } catch (e) {}
  }

  // 全局错误钩子
  window.onerror = function (m, s, l, c, e) {
    var st = e && e.stack ? e.stack : "";
    logErr("ONERR " + m + " @" + s + ":" + l + "\n" + st);
    return false;
  };

  // 未捕获 Promise 拒绝
  try {
    if (typeof window.addEventListener === "function") {
      window.addEventListener("unhandledrejection", function (ev) {
        logErr("REJECT " + (ev && ev.reason ? ev.reason : "?"));
      });
    }
  } catch (e) {}

  try { jsb.fileUtils.writeStringToFile("=== hooked " + Date.now() + " ===\n", errFile); } catch (e) {}

  // 逐步重走登录：setServer → onEnterGame
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
    var entry = [220, "https://bzgf.maple-game.com", "800-server-166", "900-server-166", 1, "\u6df7\u670d26\u533a", 33];
    sv.setServer(entry);
    out.push("setServer ok serverID=" + sv.serverID);
    try {
      var r = sv.onEnterGame();
      out.push("onEnterGame ok");
    } catch (e2) {
      out.push("onEnterGame ERR " + (e2 && e2.stack ? e2.stack : e2));
    }
    return out.join("\n");
  } catch (e) {
    return "ERR " + (e && e.stack ? e.stack : e);
  }
})()
