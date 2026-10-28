(function () {
  // C06 真机验证：11 个动作全打一遍，核对关键字段 + 存档数值不动（不结算批）。
  var out = { ok: 0, errs: [], steps: {} };
  var C = window.__BZ_CODEC__, H = window.__BZ_BOOT__;
  var IMPL = H && H.impl;
  if (!C || !IMPL) { out.errs.push('no codec/impl'); return JSON.stringify(out); }
  function safe(fn, tag) { try { return fn(); } catch (e) { out.errs.push(tag + ': ' + (e && e.message)); return { threw: String(e && e.message) }; } }
  function state() { return safe(function () { return IMPL.state(); }, 'state'); }
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
  var s0 = state();
  out.steps.before = { coins: s0.coins, exp: s0.exp, potential: s0.potential };
  var r1 = call('EndTraining', { hglmt: 600, speed: 1, auto: 0 });
  out.steps.EndTraining = { eRet: r1.eRet, genguTime: r1.genguTime, hanyusuiTime: r1.hanyusuiTime };
  var r2 = call('EndMeditation', { skillID: 0, hglmt: 600, speed: 1 });
  out.steps.EndMeditation = { eRet: r2.eRet, noteAttrch: !!(r2.note && r2.note.attrch) };
  var r3 = call('EndRecoverMP', { curMp: 100, mplmt: 200, bTime: 0, flag: 0 });
  out.steps.EndRecoverMP = { eRet: r3.eRet, hanyusuiTime: r3.hanyusuiTime };
  var r4 = call('getVigor', {});
  out.steps.getVigor = { eRet: r4.eRet, vigor: r4.vigor };
  var r5 = call('useVigorUpGradeSkill', { skillID: 7, flag: 0 });
  out.steps.upg = { eRet: r5.eRet, vigor: r5.vigor, skillID: r5.skillID };
  var r6 = call('BeginRecoverMP', {});
  out.steps.beginMp = { eRet: r6.eRet, hasServerTime: typeof r6.serverTime === 'number' };
  var r7 = call('changePlayWooksState', {});
  out.steps.pause = { eRet: r7.eRet };
  var r8 = call('setOnHookWookState', {});
  out.steps.onhook = { eRet: r8.eRet };
  var r9 = call('Implantation', { MartialID: 3 });
  out.steps.impl = { eRet: r9.eRet };
  var r10 = call('removeMartial', { MartialID: 3 });
  out.steps.remove = { eRet: r10.eRet };
  var s1 = state();
  out.steps.after = { coins: s1.coins, exp: s1.exp, potential: s1.potential };
  out.ok = 1;
  return JSON.stringify(out).slice(0, 20000);
})()
