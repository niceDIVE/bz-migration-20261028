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
  if (!sv) return "SvrSelectView NOT FOUND";
  out.push("=== fields ===");
  for (var k in sv) {
    try {
      var v = sv[k];
      if (typeof v === "function") continue;
      var s;
      if (v === null) s = "null";
      else if (typeof v === "object") s = JSON.stringify(v);
      else s = String(v);
      if (s === undefined) s = "undefined";
      out.push(k + " = " + s.slice(0, 200));
    } catch (e) {}
  }
  out.push("=== methods ===");
  var proto = Object.getPrototypeOf(sv);
  var ms = [];
  for (var mk in proto) { try { if (typeof proto[mk] === "function") ms.push(mk); } catch (e) {} }
  out.push(ms.join(","));
  return out.slice(0, 70).join("\n");
})()
