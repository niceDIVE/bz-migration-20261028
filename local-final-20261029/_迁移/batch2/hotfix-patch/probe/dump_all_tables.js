/* dump_all_tables.js —— 只读：把 CFMgr.dic 里**所有**配置表逐张落盘到设备 files/dump/，主机再整目录 pull
 *
 * 为什么要全量：活动面板/商店/战斗/装备属性的共同底层都是"配置表没导出来，只能回形状默认值"。
 * 规则（§9 坑 28）：不做 BFS；只读配置索引；每张表单独 stringify 后立刻写盘（避免一次性拼大字符串爆内存）；
 * 单表超过 CAP_BYTES 就只写前 MAX_ROWS 行并标 truncated。
 */
(function () {
  var DIR = '/data/data/com.maple.madherogo/files/';
  var OUT = DIR + 'dump/';
  var CAP_BYTES = 4 * 1024 * 1024;   // 单表上限 4MB
  var MAX_ROWS = 3000;               // 超限时保留的行数
  if (!jsb || !jsb.fileUtils) return 'NO_JSB';
  try { jsb.fileUtils.createDirectory(OUT); } catch (e) {}

  var out = { ok: 1, dicCount: 0, tables: 0, totalBytes: 0, truncated: [], index: [] };
  try {
    var R = (typeof window.__require === 'function') ? window.__require : (typeof __require === 'function' ? __require : null);
    if (!R) return 'NO_REQUIRE';
    var cfg = R('CFMgr') || R('gameconfigs/CFMgr');
    var dic = cfg && cfg.dic;
    if (!dic) return 'NO_DIC';
    var names = Object.keys(dic);
    out.dicCount = names.length;

    for (var i = 0; i < names.length; i++) {
      var nm = names[i];
      var t = dic[nm];
      if (!t || typeof t !== 'object') continue;
      var rows = (t.dic && typeof t.dic === 'object') ? t.dic : t;
      var keys = Object.keys(rows);
      // 只留真实行（数字键），丢掉 __name:* 索引
      var keep = {}, n = 0, cols = null;
      for (var k = 0; k < keys.length; k++) {
        if (!/^[0-9]+$/.test(keys[k])) continue;
        var row = rows[keys[k]];
        if (row && typeof row === 'object' && !cols) cols = Object.keys(row);
        keep[keys[k]] = row;
        n++;
        if (n >= 20000) break;
      }
      if (!n) continue;
      var payload = JSON.stringify({ name: nm, rows: n, cols: cols, data: keep });
      var truncated = false;
      if (payload.length > CAP_BYTES) {
        // 太大：只留前 MAX_ROWS 行重拼
        var small = {}, m = 0;
        for (var kk in keep) { if (!keep.hasOwnProperty(kk)) continue; small[kk] = keep[kk]; if (++m >= MAX_ROWS) break; }
        payload = JSON.stringify({ name: nm, rows: n, kept: m, cols: cols, truncated: true, data: small });
        truncated = true;
        out.truncated.push({ name: nm, rows: n, kept: m });
      }
      try {
        jsb.fileUtils.writeStringToFile(payload, OUT + nm + '.json');
      } catch (e2) { out.index.push({ name: nm, err: String(e2 && e2.message || e2) }); continue; }
      out.tables++;
      out.totalBytes += payload.length;
      out.index.push({ name: nm, rows: n, bytes: payload.length, truncated: truncated });
    }
  } catch (e) { out.ok = 0; out.err = String(e && e.message || e); }
  try { jsb.fileUtils.writeStringToFile(JSON.stringify(out), OUT + '_index.json'); } catch (e3) {}
  return JSON.stringify({ ok: out.ok, err: out.err || null, dicCount: out.dicCount, tables: out.tables, totalBytes: out.totalBytes, truncated: out.truncated.length, largest: out.index.slice().sort(function (a, b) { return (b.bytes || 0) - (a.bytes || 0); }).slice(0, 6) });
})()
