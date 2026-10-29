(function () {
  // C19〔技能皮肤商店〕真机链（A 轮第 1 批）：货架门 → 买道具 → 刷新 → 活动商店 → 买皮肤(35 免费档) → 装/卸
  function call(payload) {
    var body = __BZ_CODEC__.encode(JSON.stringify(payload));
    var r = __BZ_HARNESS__.impl.handle({ url: 'https://bzgf.maple-game.com/900-server-166/x', body: body });
    return JSON.parse(__BZ_CODEC__.decode(JSON.parse(r.text).MsgData));
  }
  function g(name) { return function (p) { return call({ mod: 'User', do: name, p: p || {} })['User.' + name]; }; }
  var out = {};
  try { out.shop = g('getSkillSkinShop')(); } catch (e) { return 'SHOP_ERR ' + (e && e.message); }
  try { out.buyItem = g('buySkillSkinShop')({ id: 1 }); } catch (e) { out.buyItem = 'ERR ' + (e && e.message); }
  try { out.refresh = g('refreshSkillSkinShop')(); } catch (e) { out.refresh = 'ERR ' + (e && e.message); }
  try { out.act = g('getSkillSkinActiveShop')(); } catch (e) { out.act = 'ERR ' + (e && e.message); }
  try { out.buySkin = g('buySkillSkinActiveShop')({ ids: [35] }); } catch (e) { out.buySkin = 'ERR ' + (e && e.message); }
  var brief = {
    shop: out.shop && { eRet: out.shop.eRet, dsN: out.shop.shopData && Object.keys(out.shop.shopData.ds).length, price: out.shop.shopData && out.shop.shopData.price },
    buyItem: out.buyItem && { eRet: out.buyItem.eRet, ds1: out.buyItem.shopData && out.buyItem.shopData.ds && out.buyItem.shopData.ds['1'], reward: out.buyItem.rewardArray },
    refresh: out.refresh && { eRet: out.refresh.eRet },
    act: out.act && { eRet: out.act.eRet, n: out.act.shopDatas && out.act.shopDatas.length, endTime: out.act.endTime },
    buySkin: out.buySkin && { eRet: out.buySkin.eRet, rew: out.buySkin.rewardSkillSkin },
    again: (function () { try { return { eRet: g('buySkillSkinShop')({ id: 1 }).eRet }; } catch (e) { return 'ERR'; } })(),
  };
  return JSON.stringify(brief).slice(0, 2500);
})()
