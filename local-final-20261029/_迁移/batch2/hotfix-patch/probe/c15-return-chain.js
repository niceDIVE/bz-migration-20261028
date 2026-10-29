(function () {
  // C15〔七日回归〕真机链探针（2026-10-27 档 A）：
  //   ① getReturnSevenDayData（门）→ ② returnSevenDaysAwards（领第 1 天）→
  //   ③ getReturnTaskData（11 任务）→ ④ getReturnGift（3 档展示）→ ⑤ refreshReturnGiftAward（空）
  function call(payload) {
    var body = __BZ_CODEC__.encode(JSON.stringify(payload));
    var r = __BZ_HARNESS__.impl.handle({ url: 'https://bzgf.maple-game.com/900-server-166/x', body: body });
    return JSON.parse(__BZ_CODEC__.decode(JSON.parse(r.text).MsgData));
  }
  var out = {};
  try { out.seven = call({ mod: 'User', do: 'getReturnSevenDayData', p: {} })['User.getReturnSevenDayData']; } catch (e) { return 'SEVEN_ERR ' + (e && e.message); }
  try { out.claim = call({ mod: 'User', do: 'returnSevenDaysAwards', p: {} })['User.returnSevenDaysAwards']; } catch (e) { out.claim = 'ERR ' + (e && e.message); }
  try { out.tasks = call({ mod: 'User', do: 'getReturnTaskData', p: {} })['User.getReturnTaskData']; } catch (e) { out.tasks = 'ERR ' + (e && e.message); }
  try { out.gift = call({ mod: 'User', do: 'getReturnGift', p: {} })['User.getReturnGift']; } catch (e) { out.gift = 'ERR ' + (e && e.message); }
  try { out.refresh = call({ mod: 'User', do: 'refreshReturnGiftAward', p: {} })['User.refreshReturnGiftAward']; } catch (e) { out.refresh = 'ERR ' + (e && e.message); }
  var brief = {
    seven: out.seven && { eRet: out.seven.eRet, arr: out.seven.sevenDaysArr, triggerTime: out.seven.triggerTime },
    claim: out.claim && { eRet: out.claim.eRet, arr: out.claim.sevenDaysArr, reward: out.claim.rewardArray },
    tasks: out.tasks && { eRet: out.tasks.eRet, n: out.tasks.oldReturnData && out.tasks.oldReturnData.tasks && out.tasks.oldReturnData.tasks.length, liveness: out.tasks.oldReturnData && out.tasks.oldReturnData.liveness },
    gift: out.gift && { eRet: out.gift.eRet, n: out.gift.giftDatas && out.gift.giftDatas.length, first: out.gift.giftDatas && out.gift.giftDatas[0] },
    refresh: out.refresh && { eRet: out.refresh.eRet, giftAwards: out.refresh.giftAwards },
    again: (function () {
      try {
        var a = call({ mod: 'User', do: 'returnSevenDaysAwards', p: {} })['User.returnSevenDaysAwards'];
        return { eRet: a.eRet };
      } catch (e) { return 'ERR'; }
    })(),
  };
  return JSON.stringify(brief).slice(0, 3000);
})()
