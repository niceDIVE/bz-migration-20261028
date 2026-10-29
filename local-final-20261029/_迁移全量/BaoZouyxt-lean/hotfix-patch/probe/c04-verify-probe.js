(function () {
  // C04 真机验证探针：状态机全链（提亲→结婚→LoadGame 回放→同床→离婚）+ 锁死动作抽样。
  // 动存档范围：marryObj（可由离婚回初值，childObj 不存在）。
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
  out.steps.before = { marryNpc: s0.marryObj ? s0.marryObj.marryNpc : 'no-marryObj', coins: s0.coins };

  // ① 提亲（propose.json 里有 1007）
  var r1 = call('proposeNpc', { npcID: 1007 });
  out.steps.propose = { eRet: r1.eRet, npcID: r1.npcID };
  // ② 结婚
  var r2 = call('marryNpc', { npcID: 1007, flag: 1 });
  out.steps.marry = { eRet: r2.eRet, npcID: r2.npcID };
  // ③ 重复结婚 → 3
  var r3 = call('marryNpc', { npcID: 1011, flag: 1 });
  out.steps.remarry = { eRet: r3.eRet };
  // ④ LoadGame 回放
  var r4 = call('LoadGame', {});
  out.steps.loadGame = { marryNpc: r4.marryObj ? r4.marryObj.marryNpc : 'no-marryObj' };
  // ⑤ 同床（显示型）
  var r5 = call('makeLove', { choose: 2 });
  out.steps.makeLove = { eRet: r5.eRet, makeID: r5.makeID };
  // ⑥ 宾客礼金（空）
  var s1 = state();
  var c0 = s1.coins;
  var r6 = call('marryAward', { guestID: 1011 });
  var s2 = state();
  out.steps.marryAward = { eRet: r6.eRet, rewardArray: r6.rewardArray, coinsDelta: s2.coins - c0 };
  // ⑦ 锁死抽样
  var r7 = call('birthChild', {});
  out.steps.birthChild = { eRet: r7.eRet };
  var r8 = call('adoptChild', { adoptChildSex: 1 });
  out.steps.adoptChild = { eRet: r8.eRet };
  var r9 = call('Whoring', { npcID: 310003, flag: 1, hglmt: 600 });
  out.steps.whoring = { eRet: r9.eRet };
  var r10 = call('GetWhoreData', {});
  out.steps.getWhoreData = { eRet: r10.eRet, girlData: r10.girlData };
  var r11 = call('getLikeEvent', {});
  out.steps.getLikeEvent = { eRet: r11.eRet };
  // ⑧ 非法提亲
  var r12 = call('proposeNpc', { npcID: 9999 });
  out.steps.proposeBad = { eRet: r12.eRet };
  // ⑨ 离婚清场（把真档还原到未婚态）
  var r13 = call('divorceNpc', {});
  out.steps.divorce = { eRet: r13.eRet, npcID: r13.npcID };
  var s3 = state();
  out.steps.after = { marryNpc: s3.marryObj ? s3.marryObj.marryNpc : '?', proposeNpc: s3.marryObj ? s3.marryObj.proposeNpc.length : '?', coins: s3.coins };
  out.ok = 1;
  return JSON.stringify(out).slice(0, 20000);
})()
