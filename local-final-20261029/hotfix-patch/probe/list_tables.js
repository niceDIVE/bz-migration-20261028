/* list_tables.js —— 只读：列出 CFMgr.dic 里**全部**配置表名（不落盘表内容，只回名字清单）
 *
 * 目的（SOTA R19 Q2 P2 / Q4②）：把客户端当前已加载的表名与 tools/cfg/dump 的 442 张做差集，
 * 判"礼包表是不是根本没 dump"。R19 Q4② 还要求：进过礼包/背包/商城界面之后再跑一次，
 * 若表名集合不再增长，才算"当前已加载集合已封闭"。
 *
 * 规则：不做 BFS；只读配置索引；只回名单，不 stringify 表内容（避免一次性拼大字符串）。
 */
(function () {
  var R = (typeof window.__require === 'function') ? window.__require
        : (typeof __require === 'function' ? __require : null);
  if (!R) return 'NO_REQUIRE';
  var cfg = null, err = null;
  try { cfg = R('CFMgr'); } catch (e1) { err = String(e1 && e1.message || e1); }
  if (!cfg) { try { cfg = R('gameconfigs/CFMgr'); } catch (e2) { err = (err ? err + ' | ' : '') + String(e2 && e2.message || e2); } }
  if (!cfg) return 'NO_CFMGR ' + (err || '');
  var dic = cfg.dic || (cfg.default && cfg.default.dic) || null;
  if (!dic) return 'NO_DIC';
  var all = Object.keys(dic);
  var names = all.filter(function (n) { return !/^__/.test(n); });
  names.sort();
  var nonEmpty = [];
  for (var i = 0; i < names.length; i++) {
    var t = dic[names[i]];
    var rows = (t && t.dic && typeof t.dic === 'object') ? t.dic : t;
    var n = 0;
    if (rows && typeof rows === 'object') {
      for (var k in rows) { if (!rows.hasOwnProperty(k)) continue; if (/^[0-9]+$/.test(k)) n++; }
    }
    nonEmpty.push(n > 0 ? names[i] + ':' + n : names[i] + ':0');
  }
  return JSON.stringify({ ok: 1, dicCount: all.length, n: names.length, names: nonEmpty });
})()
