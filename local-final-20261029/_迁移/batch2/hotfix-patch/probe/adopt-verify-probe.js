(function () {
  // 领养链真机验证：结婚 → adoptChild(500 元宝) → childObj 形状 → giveChildName → birthChild(未妊娠) → 再领(hasChild) → 离婚(childObj 保留)。
  var out = { ok: 0, errs: [], steps: {} };
  var C = window.__BZ_CODEC__, H = window.__BZ_BOOT__;
  var IMPL = H && H.impl;
  if (!C || !IMPL) { out.errs.push('no codec/impl'); return JSON.stringify(out); }
  function safe(fn, tag) { try { return fn(); } catch (e) { out.errs.push(tag + ': ' + (e && e.message)); return { threw: String(e && e.message) }; } }
  function call(doName, p) {
    return safe(function () {
      var enc = C.encode(JSON.stringify({ mod: 'User', do: doName, p: p || {} }));
      var res = IMPL.handle({ url: 'https://bzgf.maple-game.com/index.php?code=1', body: enc });
      if (!res || !res.text) return { probeErr: JSON.stringify(res && res.meta || res).slice(0, 150) };
      var md = JSON.parse(res.text).MsgData;
      if (typeof md === 'string') md = JSON.parse(C.decode(md));
      return md['User.' + doName] || { eRet: 'no-key' };
    }, 'call ' + doName);
  }
  function state() { return safe(function () { return IMPL.state(); }, 'state'); }

  var s0 = state();
  out.steps.before = { yuanbao: s0.yuanbao, marryNpc: s0.marryObj ? s0.marryObj.marryNpc : '?', hasChild: !!(s0.marryObj && s0.marryObj.childObj && s0.marryObj.childObj.childName !== undefined) };
  call('proposeNpc', { npcID: 1007 });
  var rm = call('marryNpc', { npcID: 1007, flag: 1 });
  out.steps.marry = { eRet: rm.eRet };
  var ra = call('adoptChild', { adoptChildSex: 1 });
  out.steps.adopt = { eRet: ra.eRet, childObj: ra.childObj, yuanbaoAfter: state().yuanbao };
  var rn = call('giveChildName', { childName: '小狗蛋' });
  out.steps.name = { eRet: rn.eRet, childName: rn.childName };
  var rb = call('birthChild', {});
  out.steps.birth = { eRet: rb.eRet };
  var r2 = call('adoptChild', { adoptChildSex: 0 });
  out.steps.readopt = { eRet: r2.eRet };
  var r3 = call('giveChildName', { childName: '' });
  out.steps.badname = { eRet: r3.eRet };
  var r4 = call('LoadGame', {});
  out.steps.loadGame = { childName: r4.marryObj && r4.marryObj.childObj ? r4.marryObj.childObj.childName : 'none', sex: r4.marryObj && r4.marryObj.childObj ? r4.marryObj.childObj.sex : '?' };
  var r5 = call('divorceNpc', {});
  var s2 = state();
  out.steps.divorce = { eRet: r5.eRet, marryNpc: s2.marryObj.marryNpc, childName: s2.marryObj.childObj ? s2.marryObj.childObj.childName : 'none', yuanbao: s2.yuanbao };
  out.ok = 1;
  return JSON.stringify(out).slice(0, 20000);
})()
