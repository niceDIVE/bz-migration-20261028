(function () {
  // 只读探针 3：问客户端"任务现在是什么状态"。用 __require 直取模型，不做 BFS。
  var out = { errs: [] };
  var R = window.__require;
  if (typeof R !== 'function') return 'NO_REQUIRE';
  function G(n) { try { return R(n); } catch (e) { return null; } }

  var rbi = G('RoleBaseInfo');
  var B = rbi && (rbi.RoleBaseInfo || rbi);
  if (!B) return 'NO_RBI';

  try { out.finish = Object.keys(B.finishTaskObj || {}); } catch (e) { out.errs.push('finish'); }
  try { out.require = Object.keys(B.requireTaskObj || {}); } catch (e) { out.errs.push('require'); }
  try { out.taskOrder = (B.taskOrder || []).slice(0, 20); } catch (e) { out.errs.push('order'); }
  try { out.taskLogLen = (B.taskLog || []).length; } catch (e) { out.errs.push('log'); }
  try { out.taskLog0 = (B.taskLog || [])[0] || null; } catch (e) {}
  try { out.masterTaskId = B.masterTaskId; out.school = B.school; } catch (e) {}

  out.reqDetail = [];
  try {
    for (var k in (B.requireTaskObj || {})) {
      var t = B.requireTaskObj[k];
      out.reqDetail.push({
        id: k,
        taskState: t && t.taskState,
        keys: t ? Object.keys(t) : null,
        toKeys: t && t.taskObj ? Object.keys(t.taskObj).slice(0, 60) : null,
        require: t && t.taskObj ? String(t.taskObj.Require) : null,
        spRequire: t && t.taskObj ? String(t.taskObj.SpRequire) : null,
        type: t && t.taskObj ? String(t.taskObj.Type) : null
      });
      if (out.reqDetail.length >= 8) break;
    }
  } catch (e) { out.errs.push('detail:' + e); }

  var names = ['TaskSystemMgr', 'TaskModel', 'NpcTaskModel', 'TaskNewModel', 'BrushNpcModel'];
  out.mods = {};
  for (var i = 0; i < names.length; i++) {
    var m = G(names[i]);
    if (m) { try { out.mods[names[i]] = Object.keys(m).slice(0, 30); } catch (e) { out.mods[names[i]] = 'ERR'; } }
  }
  return JSON.stringify(out).slice(0, 3500);
})()
