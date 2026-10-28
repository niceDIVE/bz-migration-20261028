(function () {
  var out = [];
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

    out.push("attrs=" + JSON.stringify(comp._attributeValue));

    // 找 EditBox 确认名字已写入
    var eb = null;
    (function walk(n) {
      var c2 = n._components || [];
      for (var i2 = 0; i2 < c2.length; i2++) {
        var n2 = "";
        try { n2 = c2[i2].__classname__ || (c2[i2].constructor && c2[i2].constructor.name) || ""; } catch (e) {}
        if (n2 === "cc.EditBox") eb = c2[i2];
      }
      var ch = n.children || [];
      for (var j2 = 0; j2 < ch.length; j2++) walk(ch[j2]);
    })(st);
    if (eb) { eb.string = "FZhou"; out.push("editbox=" + eb.string); }

    try {
      var r1 = comp.onCheckName();
      out.push("onCheckName -> " + String(r1));
    } catch (e) { out.push("onCheckName ERR " + (e && e.stack ? e.stack : e).toString().slice(0, 300)); }

    return out.join("\n");
  } catch (e) {
    return "ERR " + (e && e.stack ? e.stack : e);
  }
})()
