/* dump_drop.js —— 只读：把 CFMgr.dic 里的 drop 表整份落到设备 files/drop_tables.json，主机再 pull
 * 起因：本地 tools/cfg/tbl_drop.json 只有 587 行，13 个 decompose 引用的 drop id（7366-7371/6582/8047-8052）
 * 一个都不在里面；任务 Reward 里也有 774 个 id 展开不出来。怀疑 dump_tables.js 那次导的是残缺表。
 * 规则（§9 坑 28）：不做 BFS；只读配置索引；同步写一个文件（不动存档）。
 */
(function () {
  var DIR = '/data/data/com.maple.madherogo/files/';
  if (!jsb || !jsb.fileUtils) return 'NO_JSB';
  var out = { ok: 1, tables: {}, summary: [] };
  try {
    var R = (typeof window.__require === 'function') ? window.__require : (typeof __require === 'function' ? __require : null);
    if (!R) return 'NO_REQUIRE';
    var cfg = R('CFMgr') || R('gameconfigs/CFMgr');
    var dic = cfg && cfg.dic;
    if (!dic) return 'NO_DIC';
    var NAMES = ['drop', 'item'];
    for (var i = 0; i < NAMES.length; i++) {
      var nm = NAMES[i];
      var t = dic[nm];
      if (!t) { out.summary.push({ name: nm, missing: true }); continue; }
      var rows = (t.dic && typeof t.dic === 'object') ? t.dic : t;
      var keys = Object.keys(rows);
      var num = 0, keep = {};
      for (var k = 0; k < keys.length; k++) {
        if (!/^[0-9]+$/.test(keys[k])) continue;
        // 只留必要列，控制体积
        var r = rows[keys[k]];
        if (nm === 'drop') {
          var o = {};
          for (var c = 1; c <= 10; c++) {
            if (r['Item' + c] !== undefined) o['Item' + c] = r['Item' + c];
            if (r['probability' + c] !== undefined) o['probability' + c] = r['probability' + c];
          }
          keep[keys[k]] = o;
        } else {
          keep[keys[k]] = r;
        }
        num++;
      }
      out.tables[nm] = keep;
      out.summary.push({ name: nm, rows: num, sampleKey: keys[0] });
    }
  } catch (e) { out.ok = 0; out.err = String(e && e.message || e); }
  var text = JSON.stringify(out);
  jsb.fileUtils.writeStringToFile(text, DIR + 'drop_tables.json');
  return JSON.stringify({ ok: out.ok, err: out.err || null, bytes: text.length, summary: out.summary });
})()
