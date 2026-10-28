/* shop_probe.js —— 只读：找出"商店/货架"相关的配置表（D-4 的第一步）
 * 规则（§9 坑 28）：不做 BFS、不遍历节点树、不写盘；只读 CFMgr.dic（已在内存里的配置索引）。
 * 返回小结（≤4KB）：表名清单 + 每个候选表的条数 + 一行样本。
 */
(function () {
  var out = { ok: 1, dicCount: 0, matches: [], tables: [] };
  try {
    var R = (typeof window.__require === 'function') ? window.__require : (typeof __require === 'function' ? __require : null);
    if (!R) { out.ok = 0; out.err = 'no-require'; return JSON.stringify(out); }
    var cfg = R('CFMgr') || R('gameconfigs/CFMgr');
    var dic = cfg && cfg.dic;
    if (!dic) { out.ok = 0; out.err = 'no-dic'; return JSON.stringify(out); }
    var names = Object.keys(dic);
    out.dicCount = names.length;

    var re = /shop|store|goods|mall|buy|sell|trade/i;
    for (var i = 0; i < names.length && out.matches.length < 30; i++) {
      if (re.test(names[i])) out.matches.push(names[i]);
    }

    function sizeOf(t) {
      try {
        if (t && t.dic && typeof t.dic === 'object') return { kind: 'dic', n: Object.keys(t.dic).length };
        if (t && t.list && t.list.length) return { kind: 'list', n: t.list.length };
        if (t && typeof t === 'object') return { kind: 'map', n: Object.keys(t).length };
      } catch (e) {}
      return { kind: '?', n: 0 };
    }
    function sampleOf(t) {
      try {
        var m = t.dic || t;
        var ks = Object.keys(m);
        if (t.list && t.list.length) return JSON.stringify(t.list[0]).slice(0, 300);
        var k0 = ks[0];
        var row = m[k0];
        return JSON.stringify(row).slice(0, 300);
      } catch (e) { return 'ERR:' + String(e && e.message || e); }
    }

    for (var j = 0; j < out.matches.length && j < 20; j++) {
      var nm = out.matches[j];
      var t = dic[nm];
      var s = sizeOf(t);
      out.tables.push({ name: nm, kind: s.kind, n: s.n, sample: sampleOf(t) });
    }
  } catch (e2) { out.ok = 0; out.err = String(e2 && e2.message || e2); }
  return JSON.stringify(out);
})()
