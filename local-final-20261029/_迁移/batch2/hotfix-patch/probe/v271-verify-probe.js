(function () {
  // v2.7.1 真机验证探针 v2：全步 try/catch，绝不抛（抛了 res 就不更新，主审什么都看不到）。
  var out = { ok: 0, errs: [], steps: {} };
  var C = window.__BZ_CODEC__, H = window.__BZ_BOOT__;
  var IMPL = H && H.impl;
  if (!C || !IMPL) { out.errs.push('no codec/impl: C=' + !!C + ' IMPL=' + !!IMPL); return JSON.stringify(out); }

  function safe(fn, tag) { try { return fn(); } catch (e) { out.errs.push(tag + ': ' + (e && e.message)); return { threw: String(e && e.message) }; } }
  function call(doName, p) {
    return safe(function () {
      var enc = C.encode(JSON.stringify({ mod: 'User', do: doName, p: p || {} }));
      var res = IMPL.handle({ url: 'https://bzgf.maple-game.com/index.php?code=1', body: enc });
      if (!res || !res.text) {
        return { probeErr: res ? JSON.stringify(res.meta || res).slice(0, 200) : 'null' };
      }
      var env2 = JSON.parse(res.text);
      var md = env2.MsgData;
      if (typeof md === 'string') md = JSON.parse(C.decode(md));
      return md['User.' + doName] || { eRet: 'no-key', keys: Object.keys(md) };
    }, 'call ' + doName);
  }
  function save() { return safe(function () { return JSON.parse(JSON.stringify(IMPL.state())); }, 'save'); }

  var s0 = save();
  out.steps.before = {
    exp: s0.exp, coins: s0.coins, potential: s0.potential, yuanbao: s0.yuanbao,
    circleTotal: s0.circleTotal, advDone: s0.advDone || null,
    doneHas9003: (s0.done || []).indexOf(9003) >= 0, acceptedHas9003: (s0.accepted || []).indexOf(9003) >= 0,
  };

  var r1 = call('GetRandomEventAward', { adventureID: 10, award: 1, eventID: 0 });
  out.steps.adv1 = { eRet: r1.eRet, rewardArray: r1.rewardArray };
  var s1 = save();
  out.steps.afterAdv1 = { advDone: s1.advDone || null, coins: s1.coins, gold: s1.gold, potential: s1.potential, bag: s1.bag };

  var r2 = call('GetRandomEventAward', { adventureID: 10, award: 3, eventID: 0 });
  out.steps.advDup = { eRet: r2.eRet, rewardArray: r2.rewardArray };

  var a3 = call('acceptCircleTask', { taskID: 9003 });
  out.steps.accept9003 = { eRet: a3.eRet };
  var r3 = call('circleTaskAward', { taskID: 9003 });
  out.steps.award9003 = { eRet: r3.eRet, rewardObj: r3.rewardObj, eco: r3.note && r3.note.eco };
  var s3 = save();
  out.steps.after9003 = { exp: s3.exp, coins: s3.coins, potential: s3.potential, circleTotal: s3.circleTotal };

  var r4 = call('getAchieveData', {});
  out.steps.achieve = {
    eRet: r4.eRet, probeErr: r4.probeErr || null,
    pendingCount: r4.achieveIdArr ? r4.achieveIdArr.length : -1,
    pendingSample: r4.achieveIdArr ? r4.achieveIdArr.slice(0, 8) : null,
    t13: r4.taskData ? r4.taskData['1_3'] : 'no-taskData',
    t620: r4.taskData ? r4.taskData['6_2,0'] : 'no-taskData',
  };

  var r5 = call('LoadGame', {});
  out.steps.loadGame = { bva18: r5.baseValueAy ? r5.baseValueAy[18] : 'no-bva', bva35: r5.baseValueAy ? r5.baseValueAy[35] : 'no-bva' };

  out.ok = 1;
  return JSON.stringify(out).slice(0, 60000);
})()
