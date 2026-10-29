/* npc_table_probe.js —— 只读：找出"NPC/怪物 → 掉落"相关的配置表名与列结构
 * 不写盘（除了 probe_res.txt 由命令通道负责），不做 BFS。
 */
(function () {
  var out = { ok: 1, matches: [], tables: [] };
  try {
    var R = (typeof window.__require === 'function') ? window.__require : (typeof __require === 'function' ? __require : null);
    if (!R) { out.ok = 0; out.err = 'no-require'; return JSON.stringify(out); }
    var cfg = R('CFMgr') || R('gameconfigs/CFMgr');
    var dic = cfg && cfg.dic;
    if (!dic) { out.ok = 0; out.err = 'no-dic'; return JSON.stringify(out); }
    var names = Object.keys(dic);

    var re = /npc|monster|drop|fight|battle|award|reward/i;
    for (var i = 0; i < names.length && out.matches.length < 40; i++) {
      if (re.test(names[i])) out.matches.push(names[i]);
    }

    // 对候选表逐个看结构（只看前 2 个键，避免大输出）
    var cand = ['npc', 'monster', 'fight', 'battle', 'drop', 'npc_drop', 'award', 'reward'];
    for (var c = 0; c < cand.length; c++) {
      var t = dic[cand[c]];
      if (!t) continue;
      var info = { name: cand[c], type: typeof t };
      try {
        info.keys = Object.keys(t).slice(0, 12);
        if (t.dic && typeof t.dic === 'object') {
          var ks = Object.keys(t.dic);
          info.dicSize = ks.length;
          info.dicSampleKeys = ks.slice(0, 3);
          var first = t.dic[ks[0]];
          info.rowSample = (first && typeof first === 'object') ? JSON.stringify(first).slice(0, 500) : String(first).slice(0, 200);
        } else if (t.list && t.list.length) {
          info.listSize = t.list.length;
          info.rowSample = JSON.stringify(t.list[0]).slice(0, 500);
        } else {
          var k0 = Object.keys(t)[0];
          info.rowSample = JSON.stringify(t[k0]).slice(0, 500);
        }
      } catch (e) { info.err = String(e && e.message || e); }
      out.tables.push(info);
    }
  } catch (e2) { out.ok = 0; out.err = String(e2 && e2.message || e2); }
  return JSON.stringify(out);
})()
