(function () {
  // make.json 文案探针：experience/describe/judge 列的文本 id 1410006..1410010 等翻成字面文字。
  var IDS = [1410001, 1410002, 1410003, 1410004, 1410005, 1410006, 1410007, 1410008, 1410009, 1410010, 1410011, 1410012, 1410013, 1410014, 1410015];
  var out = { ok: 0, errs: [], texts: [] };
  var R = (typeof window !== 'undefined' && window.__require) ? window.__require : (typeof __require === 'function' ? __require : null);
  if (!R) return JSON.stringify(out);
  var lang = null;
  try { lang = R('LangMgr') || R('gameconfigs/LangMgr'); } catch (e) { out.errs.push('LangMgr: ' + e); }
  if (!lang || typeof lang.getText !== 'function') return JSON.stringify(out);
  for (var i = 0; i < IDS.length; i++) {
    try { out.texts.push({ id: IDS[i], text: String(lang.getText(IDS[i])) }); }
    catch (e1) { out.texts.push({ id: IDS[i], err: String(e1 && e1.message) }); }
  }
  out.ok = 1;
  return JSON.stringify(out).slice(0, 20000);
})()
