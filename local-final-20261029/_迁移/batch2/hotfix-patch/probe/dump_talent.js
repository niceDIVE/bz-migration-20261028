(function () {
  try {
    var pn = cc.director.getScene().getChildByName("persistentnode");
    var st = null;
    for (var i = 0; i < pn.children.length; i++) if (pn.children[i].name === "ShowTalentUI") st = pn.children[i];
    if (!st) return "no panel";
    var comp = null;
    var cs = st._components || [];
    for (var k = 0; k < cs.length; k++) {
      var nm = "";
      try { nm = cs[k].__classname__ || (cs[k].constructor && cs[k].constructor.name) || ""; } catch (e) {}
      if (nm === "ShowTalentUI") comp = cs[k];
    }
    if (!comp) return "no comp";
    var out = ["=== fields ==="];
    for (var f in comp) {
      try {
        var v = comp[f];
        if (typeof v === "function") continue;
        var s = (v === null) ? "null" : (typeof v === "object" ? JSON.stringify(v) : String(v));
        if (s === undefined) s = "undefined";
        out.push(f + " = " + s.slice(0, 120));
      } catch (e) {}
    }
    out.push("=== methods ===");
    var p = Object.getPrototypeOf(comp), ms = [];
    for (var m in p) { try { if (typeof p[m] === "function") ms.push(m); } catch (e) {} }
    out.push(ms.join(","));
    return out.join("\n").slice(0, 3000);
  } catch (e) { return "ERR " + e; }
})()
