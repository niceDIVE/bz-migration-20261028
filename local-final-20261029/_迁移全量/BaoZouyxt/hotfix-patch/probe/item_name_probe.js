(function () {
  // 只读探针：把一批候选物品的「显示名 + 售价」问出来，供主审挑"好卖的东西"给玩家。
  // 只读 CFMgr.getItem（配置表）与 LangMgr.getText（语言表），不写档、不推模型、不做 BFS。
  var IDS = [3020, 3066, 3082, 3518, 4222, 7316, 4093, 3003, 4020, 3626];
  var out = { ok: 0, errs: [], items: [] };
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
      var row = cfg && cfg.getItem ? cfg.getItem(id, 'item') : null;
      if (row) {
        rec.Type = row.Type; rec.Price = row.Price; rec.BuyPrice = row.BuyPrice; rec.EquipType = row.EquipType;
        rec.nameId = row.Name;
        try { rec.name = (lang && lang.getText) ? String(lang.getText(row.Name)) : 'NO_LANG'; }
        catch (e1) { rec.name = 'textErr:' + (e1 && e1.message); }
      } else rec.miss = true;
    } catch (e) { rec.err = String(e && e.message ? e.message : e); }
    out.items.push(rec);
  }
  out.ok = 1;
  return JSON.stringify(out).slice(0, 4000);
})()
