(function () {
  var out = { ok: 0, errs: [], steps: {} };
  var C = window.__BZ_CODEC__, H = window.__BZ_BOOT__;
  var IMPL = H && H.impl;
  if (!C || !IMPL) { out.errs.push('no codec/impl'); return JSON.stringify(out); }
  function call(doName, p) {
    try {
      var enc = C.encode(JSON.stringify({ mod: 'User', do: doName, p: p || {} }));
      var res = IMPL.handle({ url: 'https://bzgf.maple-game.com/index.php?code=1', body: enc });
      if (!res || !res.text) return { probeErr: 1 };
      var md = JSON.parse(res.text).MsgData;
      if (typeof md === 'string') md = JSON.parse(C.decode(md));
      return md['User.' + doName] || { eRet: 'no-key' };
    } catch (e) { return { threw: String(e && e.message) }; }
  }
  var s0 = IMPL.state();
  out.steps.before = { coins: s0.coins, contribution: s0.contribution };
  out.steps.data = call('getGoodAndEvilData', {});
  out.steps.task = call('getGoodAndEvilTaskData', {});
  out.steps.help = call('helpDoneTask', { type: 1, targetId: 1 });
  out.steps.rank = call('getGoodAndEvilRankData', { type: 1 });
  var s1 = IMPL.state();
  out.steps.after = { coins: s1.coins, contribution: s1.contribution };
  out.ok = 1;
  return JSON.stringify(out).slice(0, 10000);
})()
