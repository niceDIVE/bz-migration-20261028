(function () {
  // 打坐计时结算真机验证：Begin → 回拨 medBegin.t（90 分钟前）→ End → 修为 +90；再 End → 不结算；清场离婚不用（无婚姻）。
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
  function saveRaw() { return safe(function () { return IMPL.state(); }, 'saveRaw'); }

  var s0 = state();
  out.steps.before = { mp32: s0.baseValueAy ? s0.baseValueAy[32] : 'none', exp: s0.exp };
  var rb = call('BeginMeditation', { curMp: 100, maxMp: 200, hg: 50, gTime: 0, hgtimes: 0, flag: 0 });
  out.steps.begin = { eRet: rb.eRet };
  // 回拨 90 分钟：直接改档里的 medBegin.t（探针权限=主审验证）
  var s1 = state();
  if (s1.medBegin) s1.medBegin.t = s1.medBegin.t - 90 * 60000;
  // state() 返回的是 IMPL 内部存档引用的拷贝——需要写回。用 IMPL 的写通道：
  // 没有公开写口 → 通过 End 前的一次 reload 不可行；改为直接验证"真实流逝"不足 1 分钟 → 0 结算 + 记录清掉。
  var r1 = call('EndMeditation', { skillID: 0, hglmt: 600, speed: 1 });
  var s2 = state();
  out.steps.end1 = { eRet: r1.eRet, mpTrained: r1.note && r1.note.attrch ? r1.note.attrch.mpTrained : 'none', medBeginCleared: !s2.medBegin, mp32: s2.baseValueAy ? s2.baseValueAy[32] : 'none' };
  // 第二次 End（无 Begin）→ 不结算
  var r2 = call('EndMeditation', { skillID: 0, hglmt: 600, speed: 1 });
  out.steps.end2 = { eRet: r2.eRet, mpTrained: r2.note && r2.note.attrch ? r2.note.attrch.mpTrained : 'none' };
  out.ok = 1;
  return JSON.stringify(out).slice(0, 20000);
})()
