// C11 真机闭环探针：全部走客户端自己的模型方法（真实 XHR 回环 → 我们的 handler → 客户端回调）
// 用法：.\run.ps1 probe F:\BaoZouyxt\batch12-facts-20261027\probe_c11_flow.js <arg>
//   state            → 只报模型/钱包状态（不改）
//   open             → reqGetAnnPassData()（User.getAnniversaryPassData，面板开关）
//   gift             → StoreModel.reqAnnPassGiftShop()（User.getAnniversaryPassGift，商店 type 11）
//   buyup            → reqBuyAnnUpgradePass()（User.buyAnniversaryPass，300 元宝拍板②）
//   buylive:<n>      → reqBuyAnnPassLiveness(n)（User.buyAnniversaryPassLiveness，10 gold/点拍板③）
//   claim:<id>:<vip> → reqReceiveAnnPassAward(id,vip)（User.receiveAnniversaryPassAward）
//   buygift:<id>     → StoreModel.reqBuyAnnPassGift(id)（User.buyAnniversaryPassGift）
//   task:<id>        → reqFinishTask(id)（★User.receiveAnniversaryPassTaskReward）
(function (a) {
  var out = [];
  try {
    var R = window.__require;
    if (typeof R !== 'function') return 'NO_REQUIRE';
    var AM = R('AnniversaryModel'); AM = AM && (AM.AnniversaryModel || AM);
    if (!AM) return 'NO_ANNIVERSARY_MODEL';
    var SM = R('StoreModel'); SM = SM && (SM.StoreModel || SM);
    var RB = R('RoleBaseInfo'); RB = RB && (RB.RoleBaseInfo || RB);
    var RO = R('RoleOtherInfo'); RO = RO && (RO.RoleOtherInfo || RO);
    var ID = R('InventoryDB'); ID = ID && (ID.InventoryDB || ID);

    var p = String(a || 'state').split(':');
    var cmd = p[0];

    if (cmd === 'open') { AM.reqGetAnnPassData(); out.push('reqGetAnnPassData()'); }
    else if (cmd === 'gift') { if (!SM) return 'NO_STORE_MODEL'; SM.reqAnnPassGiftShop(); out.push('reqAnnPassGiftShop()'); }
    else if (cmd === 'buyup') { out.push('yuanbaoBefore=' + (RB ? RB.yuanbao : '?')); AM.reqBuyAnnUpgradePass(); out.push('reqBuyAnnUpgradePass()'); }
    else if (cmd === 'buylive') { var n = parseInt(p[1], 10) || 10; out.push('goldBefore=' + (RB ? RB.gold : '?')); AM.reqBuyAnnPassLiveness(n); out.push('reqBuyAnnPassLiveness(' + n + ')'); }
    else if (cmd === 'claim') { var id = parseInt(p[1], 10) || 0, vip = parseInt(p[2], 10) || 0; AM.reqReceiveAnnPassAward(id, vip); out.push('reqReceiveAnnPassAward(' + id + ',' + vip + ')'); }
    else if (cmd === 'buygift') { var gid = parseInt(p[1], 10) || 0; if (!SM) return 'NO_STORE_MODEL'; out.push('yuanbaoBefore=' + (RB ? RB.yuanbao : '?')); SM.reqBuyAnnPassGift(gid); out.push('reqBuyAnnPassGift(' + gid + ')'); }
    else if (cmd === 'task') { var tid = parseInt(p[1], 10) || 0; AM.reqFinishTask(tid); out.push('reqFinishTask(' + tid + ')'); }

    out.push('annModel[liveness=' + AM.liveness + ' vip=' + AM.isVip + ' endT=' + AM.endT +
      ' rd=' + JSON.stringify(AM.receivedRewards || []) + ' vrd=' + JSON.stringify(AM.receivedVipRewards || []) +
      ' dt=' + JSON.stringify(AM.receivedTasks || []) + ' dv=' + JSON.stringify(AM.taskRates || {}) +
      ' td=' + JSON.stringify(AM.lTaskRates || {}) + ']');
    out.push('wallet[gold=' + (RB ? RB.gold : '?') + ' yuanbao=' + (RB ? RB.yuanbao : '?') + ' coins=' + (RB ? RB.coins : (RO ? RO.coins : '?')) + ' ptt=' + (RB ? RB.potential : '?') + ']');
    if (ID && ID.getItemNum) out.push('bag[9864=' + ID.getItemNum(9864) + ' 4003=' + ID.getItemNum(4003) + ' 6089=' + ID.getItemNum(6089) + ' 6658=' + ID.getItemNum(6658) + ']');
    return out.join(' | ');
  } catch (e) {
    return 'ERR ' + e + ' @ ' + (e && e.stack ? String(e.stack).split('\n')[1] : '');
  }
})
