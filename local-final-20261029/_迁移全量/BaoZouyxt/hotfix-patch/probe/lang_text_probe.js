(function () {
  // 只读探针：把语言表里的一批文本 id 翻成字面文字（背包分页名用）。
  // 只读 LangMgr.getText，不写档、不推模型、不做 BFS。
  var IDS = [3478, 3479, 3480, 3481, 3482, 6013311, 3483, 3484, 3485, 3486, 1009, 35, 506];
  var out = { ok: 0, errs: [], texts: [] };
  var R = typeof window.__require === 'function' ? window.__require
        : (typeof __require === 'function' ? __require : null);
  out.hasRequire = !!R;
  if (!R) return JSON.stringify(out);
  var lang = null;
  try { lang = R('LangMgr') || R('gameconfigs/LangMgr'); } catch (e) { out.errs.push('LangMgr: ' + e); }
  out.hasLang = !!lang;
  if (!lang || typeof lang.getText !== 'function') return JSON.stringify(out);
  for (var i = 0; i < IDS.length; i++) {
    var id = IDS[i];
    try { out.texts.push({ id: id, text: String(lang.getText(id)) }); }
    catch (e1) { out.texts.push({ id: id, err: String(e1 && e1.message) }); }
  }
  out.ok = 1;
  return JSON.stringify(out).slice(0, 3000);
})()
