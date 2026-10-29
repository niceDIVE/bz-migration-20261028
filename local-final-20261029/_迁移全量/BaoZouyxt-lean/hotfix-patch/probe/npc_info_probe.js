(function () {
  // 只读探针：把几个金条摊贩 npc 的「名字/所在地/图」问出来，方便玩家找到它们。
  // 只读 CFMgr.getItem(id,'npc') 与 LangMgr.getText，不写档、不推模型、不做 BFS。
  var IDS = [1009, 10163, 10459, 11191];
  var out = { ok: 0, errs: [], npcs: [] };
  var R = typeof window.__require === 'function' ? window.__require
        : (typeof __require === 'function' ? __require : null);
  out.hasRequire = !!R;
  if (!R) return JSON.stringify(out);
  function get(name) {
    try { return R(name); } catch (e) { out.errs.push(name + ': ' + (e && e.message ? e.message : e)); return null; }
  }
  var cfg = get('CFMgr') || get('gameconfigs/CFMgr');
  var lang = get('LangMgr') || get('gameconfigs/LangMgr');
  out.hasCfg = !!cfg; out.hasLang = !!lang;
  for (var i = 0; i < IDS.length; i++) {
    var id = IDS[i], rec = { id: id };
    try {
      var row = cfg && cfg.getItem ? cfg.getItem(id, 'npc') : null;
      if (!row) { rec.miss = true; out.npcs.push(rec); continue; }
      rec.keys = Object.keys(row);
      // 关键字段全部照抄（值过长就截断）
      var keep = ['ID', 'Name', 'Title', 'Map', 'map', 'MapID', 'Scene', 'Pos', 'pos', 'X', 'Y', 'x', 'y',
                  'Type', 'TitleName', 'Fun', 'fun', 'Shop', 'shop', 'Icon', 'icon'];
      var got = {};
      for (var k = 0; k < keep.length; k++) {
        var kk = keep[k];
        if (row[kk] === undefined) continue;
        var v = row[kk];
        got[kk] = (typeof v === 'object') ? JSON.stringify(v).slice(0, 120) : String(v).slice(0, 120);
      }
      rec.fields = got;
      if (row.Name !== undefined && lang && lang.getText) {
        try { rec.name = String(lang.getText(row.Name)); } catch (e1) { rec.name = 'textErr:' + (e1 && e1.message); }
      }
      if (row.Title !== undefined && lang && lang.getText) {
        try { rec.title = String(lang.getText(row.Title)); } catch (e2) { rec.title = 'textErr'; }
      }
    } catch (e) { rec.err = String(e && e.message ? e.message : e); }
    out.npcs.push(rec);
  }
  out.ok = 1;
  return JSON.stringify(out).slice(0, 5000);
})()
