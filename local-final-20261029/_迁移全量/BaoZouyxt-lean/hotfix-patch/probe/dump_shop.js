/* dump_shop.js —— 只读：把 CFMgr.dic 里的商店类表整份落到设备 files/shop_tables.json，主机再 pull
 * 规则（§9 坑 28/30）：不做 BFS、不遍历节点；只读配置索引；同步写一个文件（不动存档）。
 */
(function () {
  var DIR = '/data/data/com.maple.madherogo/files/';
  if (!jsb || !jsb.fileUtils) return 'NO_JSB';
  var NAMES = ['shop', 'shop_entrance', 'random_shop', 'lh_shop', 'house_shop', 'ge_shop', 'sect_shop', 'mall', 'sim_shopconfig', 'recruit_shop', 'diceshop'];
  var out = { ok: 1, tables: {}, summary: [] };
  try {
    var R = (typeof window.__require === 'function') ? window.__require : (typeof __require === 'function' ? __require : null);
    if (!R) return 'NO_REQUIRE';
    var cfg = R('CFMgr') || R('gameconfigs/CFMgr');
    var dic = cfg && cfg.dic;
    if (!dic) return 'NO_DIC';
    for (var i = 0; i < NAMES.length; i++) {
      var nm = NAMES[i];
      var t = dic[nm];
      if (!t) { out.summary.push({ name: nm, missing: true }); continue; }
      var rows = (t.dic && typeof t.dic === 'object') ? t.dic : t;
      var keys = Object.keys(rows);
      var num = 0, keep = {};
      for (var k = 0; k < keys.length; k++) {
        if (!/^[0-9]+$/.test(keys[k])) continue;   // 只留真实行，丢掉 __name:* 索引
        keep[keys[k]] = rows[keys[k]];
        num++;
      }
      out.tables[nm] = keep;
      out.summary.push({ name: nm, rows: num, sampleKey: keys[0] });
    }
  } catch (e) { out.ok = 0; out.err = String(e && e.message || e); }
  var text = JSON.stringify(out);
  jsb.fileUtils.writeStringToFile(text, DIR + 'shop_tables.json');
  return JSON.stringify({ ok: out.ok, err: out.err || null, bytes: text.length, summary: out.summary });
})()
