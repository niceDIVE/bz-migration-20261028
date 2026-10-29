(function () {
  var out = [];
  try {
    var base = jsb.fileUtils.getWritablePath();

    // 1) 伪造 SDK 登录态
    LoginMgr.isLogin = true;
    LoginMgr.sdkUserId = "9900012358565";
    if (!LoginMgr.token) LoginMgr.token = "<REDACTED-TOKEN>";
    out.push("LoginMgr.isLogin=" + LoginMgr.isLogin + " sdkUserId=" + LoginMgr.sdkUserId);

    // 2) 找 SvrSelectView 并配置服务器
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

    // 3) 隐藏可能遮挡的 Alert
    try {
      var pn = cc.director.getScene().getChildByName("persistentnode");
      if (pn) for (var b = 0; b < pn.children.length; b++) if (pn.children[b].name === "Alert") pn.children[b].active = false;
    } catch (e) {}

    // 4) 触发进入游戏
    sv.onEnterGame();
    out.push("onEnterGame fired");
    return out.join("\n");
  } catch (e) {
    return "ERR " + (e && e.stack ? e.stack : e);
  }
})()
