(function () {
  // makeLove 拍板真机验证：结婚 → 5 次同床（经验入 s.exp）→ 第 6 次拒 → 离婚清场。
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
  out.steps.before = { exp: s0.exp, marryNpc: s0.marryObj ? s0.marryObj.marryNpc : '?' };
  call('proposeNpc', { npcID: 1007 });
  var rm = call('marryNpc', { npcID: 1007, flag: 1 });
  out.steps.marry = { eRet: rm.eRet };
  var seq = [];
  for (var i = 1; i <= 6; i++) {
    var r = call('makeLove', { choose: ((i % 5) + 1) });
    var s = state();
    seq.push({ i: i, eRet: r.eRet, makeID: r.makeID, exp: s.exp, n: s.makeLoveDay ? s.makeLoveDay.n : '?' });
  }
  out.steps.seq = seq;
  var rd = call('divorceNpc', {});
  var s2 = state();
  out.steps.divorce = { eRet: rd.eRet, marryNpc: s2.marryObj ? s2.marryObj.marryNpc : '?', exp: s2.exp };
  out.ok = 1;
  return JSON.stringify(out).slice(0, 20000);
})()
