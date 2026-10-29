(function () {
  // C14〔斗狗〕真机链探针（2026-10-27）：
  //   走补丁进程内 harness（同 seed_bag.js 的口径），真实 dispatch：
  //   ① bzSeedBag 灌狗粮 6285×5（维护动作，写前备份）
  //   ② getHomeList → 狗建模对象
  //   ③ FeedDog {propID:6285, propnum:2} → 真扣 + progress 200 + note.ivch
  //   ④ lookDogLog → log 空数组
  //   ⑤ DogBattleResult → win 布尔 + endTime 0
  function call(payload) {
    var body = __BZ_CODEC__.encode(JSON.stringify(payload));
    var r = __BZ_HARNESS__.impl.handle({ url: 'https://bzgf.maple-game.com/900-server-166/x', body: body });
    return JSON.parse(__BZ_CODEC__.decode(JSON.parse(r.text).MsgData));
  }
  var out = {};
  try {
    out.seed = call({ mod: 'User', do: 'bzSeedBag', p: { itemObj: { 6285: 5 } } })['User.bzSeedBag'];
  } catch (e) { return 'SEED_FAIL ' + (e && e.message); }
  try {
    out.home = call({ mod: 'User', do: 'getHomeList', p: {} })['User.getHomeList'];
  } catch (e) { out.home = 'ERR ' + (e && e.message); }
  try {
    out.feed = call({ mod: 'User', do: 'FeedDog', p: { propID: 6285, propnum: 2 } })['User.FeedDog'];
  } catch (e) { out.feed = 'ERR ' + (e && e.message); }
  try {
    out.log = call({ mod: 'User', do: 'lookDogLog', p: { type: 0 } })['User.lookDogLog'];
  } catch (e) { out.log = 'ERR ' + (e && e.message); }
  try {
    out.result = call({ mod: 'User', do: 'DogBattleResult', p: { win: 1, fID: 0, dogID: 11193 } })['User.DogBattleResult'];
  } catch (e) { out.result = 'ERR ' + (e && e.message); }
  var brief = {
    seedItems: out.seed && out.seed.items,
    dog: out.home && out.home.dog,
    feed: out.feed && { eRet: out.feed.eRet, progress: out.feed.progress, bigDog: out.feed.bigDog, ivch: out.feed.note && out.feed.note.ivch },
    log: out.log && { eRet: out.log.eRet, logLen: out.log.log && out.log.log.length },
    result: out.result && { eRet: out.result.eRet, win: out.result.win, endTime: out.result.endTime },
  };
  return JSON.stringify(brief).slice(0, 3000);
})()
