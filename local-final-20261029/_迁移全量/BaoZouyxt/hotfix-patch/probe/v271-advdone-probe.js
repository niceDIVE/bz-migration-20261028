(function () {
  // advDone 小改真机验证：真实客户端形状 adventureID=0 + eventID 反查 + 两组记账 + 跨天失效。
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
  out.steps.before = { advDone: s0.advDone || null, coins: s0.coins };

  // ① 真实形状：adventureID=0 + eventID=10（gsp_event 反查 → 行 10），分支 1
  var r1 = call('GetRandomEventAward', { adventureID: 0, award: 1, eventID: 10 });
  out.steps.ev10b1 = { eRet: r1.eRet, rewardArray: r1.rewardArray };
  // ② 同事件分支 3（领取组，不被胜负组挡）
  var r2 = call('GetRandomEventAward', { adventureID: 0, award: 3, eventID: 10 });
  out.steps.ev10b3 = { eRet: r2.eRet, rewardArray: r2.rewardArray };
  // ③ 同事件分支 4（胜负组重复）→ 4
  var r3 = call('GetRandomEventAward', { adventureID: 0, award: 4, eventID: 10 });
  out.steps.ev10b4dup = { eRet: r3.eRet };
  // ④ 未知 eventID
  var r4 = call('GetRandomEventAward', { adventureID: 0, award: 1, eventID: 999 });
  out.steps.ev999 = { eRet: r4.eRet, rewardArray: r4.rewardArray };
  var s1 = state();
  out.steps.after = { advDone: s1.advDone || null, coins: s1.coins, gold: s1.gold };
  out.ok = 1;
  return JSON.stringify(out).slice(0, 20000);
})()
