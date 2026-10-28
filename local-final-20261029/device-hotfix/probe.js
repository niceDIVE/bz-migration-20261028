(function () {
  // 只读探针：问物品显示名/价格/类型。不写档、不推模型。
  var IDS = [8143, 10114, 8905, 3007, 12589];
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
