(function () {
  var out = [];
  var cv = cc.director.getScene().getChildByName("Canvas");
  var cs = cv._components || [];
  var sv = null;
  for (var i = 0; i < cs.length; i++) {
    var nm = "";
    try { nm = cs[i].__classname__ || (cs[i].constructor && cs[i].constructor.name) || ""; } catch (e) {}
    if (nm === "SvrSelectView") { sv = cs[i]; break; }
  }
  if (!sv) return "NOT FOUND";
  out.push("--- setServer ---");
  out.push(String(sv.setServer).slice(0, 500));
  out.push("--- onEnterGame ---");
  out.push(String(sv.onEnterGame).slice(0, 800));
  out.push("--- onGetSvrList ---");
  out.push(String(sv.onGetSvrList).slice(0, 700));
  out.push("--- data ---");
  try { out.push(JSON.stringify(sv.data).slice(0, 300)); } catch (e) { out.push("data err " + e); }
  out.push("serverID=" + sv.serverID);
  return out.join("\n");
})()
