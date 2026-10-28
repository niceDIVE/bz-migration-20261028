(function () {
  var out = [];
  try {
    var scene = cc.director.getScene();
    var pn = scene.getChildByName("persistentnode");

    // 1) 隐藏挡路的 Alert
    for (var i = 0; i < pn.children.length; i++) {
      if (pn.children[i].name === "Alert") { pn.children[i].active = false; out.push("Alert hidden"); }
    }

    // 2) 找 ShowTalentUI 子树里的 EditBox
    var panels = pn.getComponentsInChildren ? pn.getComponentsInChildren(cc.Component) : null;
    var st = null;
    for (var j = 0; j < pn.children.length; j++) if (pn.children[j].name === "ShowTalentUI") st = pn.children[j];

    var eb = null, found = [];
    function walk(n) {
      var cs = n._components || [];
      for (var k = 0; k < cs.length; k++) {
        var nm = "";
        try { nm = cs[k].__classname__ || (cs[k].constructor && cs[k].constructor.name) || ""; } catch (e) {}
        found.push(n.name + ":" + nm);
        if (nm === "cc.EditBox" || nm === "EditBox") eb = cs[k];
      }
      var ch = n.children || [];
      for (var q = 0; q < ch.length; q++) walk(ch[q]);
    }
    if (st) walk(st);
    out.push("comps: " + found.join(" | ").slice(0, 400));

    if (eb) {
      eb.string = "FZhou";
      out.push("EditBox set to " + eb.string);
    } else {
      out.push("EditBox NOT FOUND");
    }

    // 3) 触发确认按钮
    var btnNode = null;
    if (st) for (var b = 0; b < st.children.length; b++) if (st.children[b].name === "Button") btnNode = st.children[b];
    if (btnNode) {
      out.push("clicking confirm button...");
      try { btnNode.emit("click"); } catch (e) { out.push("emit err " + e); }
      try {
        var bc = btnNode.getComponent(cc.Button);
        if (bc && bc.clickEvents && bc.clickEvents.length) {
          out.push("clickEvents=" + bc.clickEvents.length);
        }
      } catch (e) {}
    } else {
      out.push("Button NOT FOUND");
    }
    return out.join("\n");
  } catch (e) {
    return "ERR " + (e && e.stack ? e.stack : e);
  }
})()
