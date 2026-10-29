(function () {
  // 2026-10-27 提速方案核查：addItem 真机验证（期望 eRet 2，背包不变）
  function call(payload) {
    var body = __BZ_CODEC__.encode(JSON.stringify(payload));
    var r = __BZ_HARNESS__.impl.handle({ url: 'https://bzgf.maple-game.com/900-server-166/x', body: body });
    return JSON.parse(__BZ_CODEC__.decode(JSON.parse(r.text).MsgData));
  }
  var out = {};
  try { out.add = call({ mod: 'User', do: 'addItem', p: { itemID: 1, itemNum: 1 } })['User.addItem']; } catch (e) { return 'ERR ' + (e && e.message); }
  try { out.check = call({ mod: 'User', do: 'getHomeList', p: {} })['User.getHomeList']; } catch (e) {}
  return JSON.stringify({ addItem: out.add, homeOk: !!(out.check && out.check.eRet === 1) }).slice(0, 600);
})()
