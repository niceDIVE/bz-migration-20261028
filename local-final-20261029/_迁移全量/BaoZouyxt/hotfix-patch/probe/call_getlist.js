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
    out.push("before: serverID=" + sv.serverID + " openSvrListState=" + sv.openSvrListState);
    var r = sv.onGetSvrList();
    out.push("onGetSvrList ret=" + String(r));
    out.push("after: serverID=" + sv.serverID);
    // 服务器按钮文字
    try { out.push("btnLabel=" + sv.selectedSvrBtnLabel.string); } catch (e) { out.push("btnLabel err " + e); }
    return out.join("\n");
  } catch (e) {
    return "ERR " + (e && e.stack ? e.stack : e);
  }
})()
