// C10 真机闭环探针：全部走客户端自己的模型方法（真实 XHR 回环 → 我们的 handler → 客户端回调）
// 用法：.\run.ps1 probe F:\BaoZouyxt\batch11-facts-20261027\probe_c10_flow.js <arg>
//   state                 → 只回报模型状态（不改）
//   scene1147             → 顶 homeFarmId 再开面板（面板入口前置）
//   shop                  → reqGetSaleShop()（User.getBackShop）
//   buy:<id>:<num>        → reqBuyHomeCrop(id,num)（User.BuyHomeCrop）
//   plant:<seed>          → reqMultiPlanting(seed,1)（User.batchSeedCrop）
//   exp:<idx>:<times>     → reqAccelarteCrop(idx) × times（User.expediteCrop）
//   harv:<idx>            → reqCropGainReward(idx)（User.obtainCrop）
//   allin                 → reqObtainAllCrop([]) → User.onKeyObtainCrop
(function (a) {
  var out = [];
  try {
    var R = window.__require;
    if (typeof R !== 'function') return 'NO_REQUIRE';
    var HM = R('HomePlantModel');
    HM = HM && (HM.HomePlantModel || HM);
    if (!HM) return 'NO_HOME_PLANT_MODEL';
    var RO = R('RoleOtherInfo'); RO = RO && (RO.RoleOtherInfo || RO);
    var ID = R('InventoryDB'); ID = ID && (ID.InventoryDB || ID);

    var p = String(a || 'state').split(':');
    var cmd = p[0];

    if (cmd === 'scene1147') {
      if (RO) { RO.homeFarmId = 1147; out.push('homeFarmId=1147'); }
      HM.buildHomeTip();
      out.push('buildHomeTip()');
    } else if (cmd === 'shop') {
      out.push('homeShop=' + HM.homeShop);
      HM.reqGetSaleShop();
      out.push('reqGetSaleShop()');
    } else if (cmd === 'buy') {
      var bid = parseInt(p[1], 10) || 0, bnum = parseInt(p[2], 10) || 1;
      out.push('coinsBefore=' + (RO ? RO.coins : '?'));
      if (ID && ID.getItemNum) out.push('bagBefore=' + ID.getItemNum(bid));
      HM.reqBuyHomeCrop(bid, bnum);
      out.push('reqBuyHomeCrop(' + bid + ',' + bnum + ')');
    } else if (cmd === 'plant') {
      var seed = parseInt(p[1], 10) || 0;
      out.push('emptyLand=' + (HM.getEmptyLand ? HM.getEmptyLand() : '?'));
      HM.reqMultiPlanting(seed, 1);
      out.push('reqMultiPlanting(' + seed + ',1)');
    } else if (cmd === 'exp') {
      var idx = parseInt(p[1], 10) || 0, times = parseInt(p[2], 10) || 1;
      for (var i = 0; i < times; i++) HM.reqAccelarteCrop(idx);
      out.push('reqAccelarteCrop(' + idx + ') ×' + times);
    } else if (cmd === 'harv') {
      var h = parseInt(p[1], 10) || 0;
      HM.reqCropGainReward(h);
      out.push('reqCropGainReward(' + h + ')');
    } else if (cmd === 'allin') {
      HM.reqObtainAllCrop([]);
      out.push('reqObtainAllCrop([])');
    }

    out.push('plantHomeUI=' + (HM.plantHomeUI ? 'yes' : 'no'));
    out.push('homeShop=' + HM.homeShop + ' shopSaleLimit=' + HM.shopSaleLimit);
    out.push('plantExp=' + (HM.plantSeedData ? HM.plantSeedData.plantExp : '?'));
    var soils = [];
    for (var k = 0; k < (HM.soilArr || []).length; k++) {
      var L = HM.soilArr[k] || {};
      soils.push(k + ':' + (L.m ? ('crop=' + L.m.id + '/s' + L.m.s + '/c' + (L.m.c || 0)) : ('empty(s=' + L.s + ')')));
    }
    out.push('soilArr=' + (Array.isArray(HM.soilArr) ? HM.soilArr.length : typeof HM.soilArr) + ' [' + soils.join(' ') + ']');
    if (ID && ID.getItemNum && p[1]) out.push('bagAfter=' + ID.getItemNum(parseInt(p[1], 10) || 0));
    return out.join(' | ');
  } catch (e) {
    return 'ERR ' + e + ' @ ' + (e && e.stack ? String(e.stack).split('\n')[1] : '');
  }
})
