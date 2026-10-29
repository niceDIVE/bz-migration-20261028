(function () {
  // 只读探针（v2.7.1 D2 取证）：adventure 奖励列 item id 1..5 的显示名。
  // item.json: 1=Name 506 / 2=676 / 3=816 / 4=1239 / 5=3051（Type 6/7/8/9/12）。
  // 对照组：4001/4002/4003 的 Name 33001/33002/33003（已知的银两/经验/潜能）。
  // 只读 LangMgr.getText，不写档、不推模型。
  var IDS = [506, 676, 816, 1239, 3051, 33001, 33002, 33003, 3185];
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
