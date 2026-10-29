// C12 真机闭环探针：全部走客户端自己的模型方法（真实 XHR 回环 → 我们的 handler → 客户端回调）
// 用法：.\run.ps1 probe F:\BaoZouyxt\batch13-facts-20261027\probe_c12_flow.js <arg>
//   state            → 只报模型/钱包状态（不改）
//   open             → reqGetHouseKeeper(1)（User.getHousekeeper，面板开关）
//   buy:<id>         → reqBuyButler(id)（User.buyHelper）
//   set:<id>         → reqSetButler(id)（User.setHelper）
//   call:<id>        → reqCallHelper(id)（★User.callHelperId）
//   list             → reqGetHelperCallList()（呼叫列表）
//   dispatch         → reqButlerDispatch([[5,1]], 当前场景id)（★User.dispatch）
//   award            → reqButlerAward()（User.dispatchAward）
//   vip              → reqBuyButlerVip(1)（★User.buyMonthlyFee）
//   tpl              → reqButlerAutoDispatch([[5,1]], 3600, 场景id)（User.setTemplateData）
//   notice           → reqReceiveNotice(0)（User.receiveNotice）
(function (a) {
  var out = [];
  try {
    var R = window.__require;
    if (typeof R !== 'function') return 'NO_REQUIRE';
    var DM = R('DelegateModel'); DM = DM && (DM.DelegateModel || DM);
    if (!DM) return 'NO_DELEGATE_MODEL';
    var RB = R('RoleBaseInfo'); RB = RB && (RB.RoleBaseInfo || RB);
    var GM = R('GSceneMgr'); GM = GM && (GM.GSceneMgr || GM);

    var p = String(a || 'state').split(':');
    var cmd = p[0];
    var scene = GM && GM.curSceneID ? GM.curSceneID : 1120;

    if (cmd === 'open') { DM.reqGetHouseKeeper(1); out.push('reqGetHouseKeeper(1)'); }
    else if (cmd === 'buy') { var id = parseInt(p[1], 10) || 0; out.push('yuanbaoBefore=' + (RB ? RB.yuanbao : '?')); DM.reqBuyButler(id); out.push('reqBuyButler(' + id + ')'); }
    else if (cmd === 'set') { var sid = parseInt(p[1], 10) || 0; DM.reqSetButler(sid); out.push('reqSetButler(' + sid + ')'); }
    else if (cmd === 'call') { var cid = parseInt(p[1], 10) || 0; DM.reqCallHelper(cid); out.push('reqCallHelper(' + cid + ')'); }
    else if (cmd === 'list') { DM.reqGetHelperCallList(); out.push('reqGetHelperCallList()'); }
    else if (cmd === 'dispatch') { var dmap = parseInt(p[1], 10) || scene; DM.reqButlerDispatch([[5, 1]], dmap); out.push('reqButlerDispatch([[5,1]],' + dmap + ')'); }
    else if (cmd === 'award') { DM.reqButlerAward(); out.push('reqButlerAward()'); }
    else if (cmd === 'vip') { out.push('yuanbaoBefore=' + (RB ? RB.yuanbao : '?')); DM.reqBuyButlerVip(1); out.push('reqBuyButlerVip(1)'); }
    else if (cmd === 'tpl') { DM.reqButlerAutoDispatch([[5, 1]], 3600, scene); out.push('reqButlerAutoDispatch(...,3600,' + scene + ')'); }
    else if (cmd === 'notice') { DM.reqReceiveNotice(0); out.push('reqReceiveNotice(0)'); }

    out.push('butlerModel[helperId=' + DM.helperId + ' helperIdArr=' + JSON.stringify(DM.helperIdArr || []) +
      ' dueTime=' + DM.dueTime + ' followId=' + DM.followId + ' noticeId=' + DM.noticeId + ']');
    out.push('wallet[yuanbao=' + (RB ? RB.yuanbao : '?') + ' gold=' + (RB ? RB.gold : '?') + ']');
    return out.join(' | ');
  } catch (e) {
    return 'ERR ' + e + ' @ ' + (e && e.stack ? String(e.stack).split('\n')[1] : '');
  }
})
