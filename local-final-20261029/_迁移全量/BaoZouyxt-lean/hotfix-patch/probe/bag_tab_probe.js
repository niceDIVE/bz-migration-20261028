(function () {
  // 只读探针 2：把 effectcategory 的分类页与账本 6 样物品的归属算清楚（纯读，不改任何状态）
  var out = { errs: [] };
  var R = window.__require;
  if (typeof R !== 'function') return 'NO_REQUIRE';
  function get(n) { try { return R(n); } catch (e) { out.errs.push(n + ': ' + (e && e.message)); return null; } }

  var cfg = get('CFMgr'), rbi = get('RoleBaseInfo');
  if (!cfg || !rbi) return JSON.stringify(out);
  var B = rbi.RoleBaseInfo || rbi;
  var ec = cfg.dic.effectcategory;
  out.ecRows = ec ? Object.keys(ec) : null;

  // a[0]=第1行 a[2]=第3行 a[3]=第4行（对应 ItemSystemUI.divisionItem 里的 t=0/2/3）
  var tabs = { 0: ec && ec[1], 2: ec && ec[3], 3: ec && ec[4] };
  out.tabs = {};
  for (var k in tabs) {
    var row = tabs[k];
    if (!row) { out.tabs[k] = null; continue; }
    out.tabs[k] = {
      name: row.name,
      pages: String(row.page || '').split('|').length,
      page0: String(row.page || '').split('|')[0],
      full: String(row.page || '').slice(0, 400)
    };
  }

  var st = null;
  try { st = B.getStorableItemObj(); } catch (e) { out.errs.push('storable: ' + (e && e.message)); }
  out.storableCount = st ? Object.keys(st).length : -1;

  out.items = [];
  for (var id in (st || {})) {
    var it = st[id], rec = cfg.dic.item[it.itemId], row2 = { id: it.itemId, numbers: it.numbers, quality: it.quality, Type: rec && rec.Type, Effect: rec && rec.Effect, tabs: [] };
    for (var t2 in tabs) {
      var r2 = tabs[t2];
      if (!r2) continue;
      var pages = String(r2.page || '').split('|');
      for (var pi = 0; pi < pages.length; pi++) {
        if (pages[pi].split(',').indexOf(String(rec && rec.Effect)) >= 0) row2.tabs.push('tab' + t2 + '/page' + pi);
      }
    }
    out.items.push(row2);
  }
  return JSON.stringify(out).slice(0, 3000);
})()
