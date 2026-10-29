/* find_ids.js —— 只读：给定几个 id，问"它们在哪张配置表里当主键"
 * 起因：790 个任务的 Reward 既不在 drop 主键、也不在 item 表（例 100507 / 8257 / 103847），
 * 说明还有别的表在管这批 id。规则（§9 坑 28）：不做 BFS；只扫 CFMgr.dic 的键；输出极小。
 */
(function () {
  var IDS = [100507, 7027, 8257, 103847, 7535, 3004];
  var out = { ok: 1, dicCount: 0, hits: {}, tables: [] };
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
      for (var j = 0; j < IDS.length; j++) {
        var id = String(IDS[j]);
        if (rows.hasOwnProperty && rows.hasOwnProperty(id)) {
          if (!out.hits[id]) out.hits[id] = [];
          if (out.hits[id].length < 8) out.hits[id].push(nm);
        }
      }
    }
    // 顺便报告"表名像奖励/奖项"的表
    var re = /award|reward|prize|gift|taskget|task_award/i;
    for (var k = 0; k < names.length && out.tables.length < 25; k++) if (re.test(names[k])) out.tables.push(names[k]);
  } catch (e) { out.ok = 0; out.err = String(e && e.message || e); }
  return JSON.stringify(out);
})()
