// C13 真机闭环探针：全部走客户端自己的模型方法（真实 XHR 回环 → 我们的 handler → 客户端回调）
// 用法：.\run.ps1 probe F:\BaoZouyxt\batch14-facts-20261027\probe_c13_flow.js <arg>
//   state            → 只报模型/钱包状态（不改）
//   open             → getUFOCatcherData()（面板开关 + 首开赠送）
//   refresh          → useUFOrefresh()（刷新池子）
//   catch:<0|1|2>    → reqRewardUFO(packages, catchIndexIds, gear)（抓取，服务端权威判中）
//   buyref           → reqBuyUFORefreshTimes()（买刷新次数）
(function (a) {
  var out = [];
  try {
    var R = window.__require;
    if (typeof R !== 'function') return 'NO_REQUIRE';
    var DM = R('DollModel'); DM = DM && (DM.DollModel || DM);
    if (!DM) return 'NO_DOLL_MODEL';
    var RB = R('RoleBaseInfo'); RB = RB && (RB.RoleBaseInfo || RB);
    var ID = R('InventoryDB'); ID = ID && (ID.InventoryDB || ID);

    var p = String(a || 'state').split(':');
    var cmd = p[0];

    if (cmd === 'open') { DM.getUFOCatcherData(); out.push('getUFOCatcherData()'); }
    else if (cmd === 'refresh') { DM.useUFOrefresh(); out.push('useUFOrefresh()'); }
    else if (cmd === 'catch') { var gear = parseInt(p[1], 10) || 0; var claw = [8117, 8119, 8120][gear]; out.push('bag[claw]=' + (ID && ID.getItemNum ? ID.getItemNum(claw) : '?')); DM.reqRewardUFO([], [], gear); out.push('reqRewardUFO([],' + gear + ')'); }
    else if (cmd === 'buyref') { out.push('yuanbaoBefore=' + (RB ? RB.yuanbao : '?')); DM.reqBuyUFORefreshTimes(); out.push('reqBuyUFORefreshTimes()'); }

    out.push('dollModel[refreshTimes=' + DM.refreshTimes + ' free=' + DM.freeRefreshTimes + ' bought=' + DM.buyRefreshTimes +
      ' coins=' + DM.buyCoinCount + ' signId=' + DM.signId + ' items=' + (DM.items ? DM.items.length : 'null') + ']');
    out.push('wallet[yuanbao=' + (RB ? RB.yuanbao : '?') + ' gold=' + (RB ? RB.gold : '?') + ']');
    if (ID && ID.getItemNum) out.push('bag[8117=' + ID.getItemNum(8117) + ' 8119=' + ID.getItemNum(8119) + ' 8120=' + ID.getItemNum(8120) + ' 8143=' + ID.getItemNum(8143) + ']');
    return out.join(' | ');
  } catch (e) {
    return 'ERR ' + e + ' @ ' + (e && e.stack ? String(e.stack).split('\n')[1] : '');
  }
})
