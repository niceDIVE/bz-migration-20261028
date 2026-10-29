// C10 真机探针：驱动客户端自己的 HomePlantModel 打开家园面板（走真实 XHR 回环）
// 用法：.\run.ps1 probe F:\BaoZouyxt\batch11-facts-20261027\probe_c10_open.js
//   arg=open   → 触发 buildHomeTip()（= reqOpenHomeEvent → User.getHomeList）
//   arg=state  → 只回报当前 HomePlantModel / PlantHomeUI / soilArr 状态
(function (a) {
  var out = [];
  try {
    var R = window.__require;
    if (typeof R !== 'function') return 'NO_REQUIRE';
    var HM = R('HomePlantModel');
    HM = HM && (HM.HomePlantModel || HM);
    if (!HM) return 'NO_HOME_PLANT_MODEL';
    var RO = R('RoleOtherInfo'); RO = RO && (RO.RoleOtherInfo || RO);

    // arg = scene1147 / scene1008 → 先把 homeFarmId 顶上去再开面板（验证 homeBG_<id> 预存不存在）
    if (a && a.indexOf('scene') === 0) {
      var id = parseInt(a.slice(5), 10) || 0;
      if (RO) { RO.homeFarmId = id; out.push('set homeFarmId=' + RO.homeFarmId); }
      else out.push('NO_ROLE_OTHER_INFO');
    }

    if (a === 'open' || (a && a.indexOf('scene') === 0)) {
      out.push('start-up');
      HM.buildHomeTip();
      out.push('called buildHomeTip');
    }
    out.push('plantHomeUI=' + (HM.plantHomeUI ? 'yes' : 'no'));
    out.push('homeFarmId=' + (RO ? RO.homeFarmId : '?'));
    out.push('soilArr=' + (Array.isArray(HM.soilArr) ? HM.soilArr.length : ('nonArray:' + typeof HM.soilArr)));
    out.push('plantExp=' + (HM.plantSeedData ? HM.plantSeedData.plantExp : '?'));
    out.push('recentSs=' + (Array.isArray(HM.recentSs) ? HM.recentSs.length : ('nonArray:' + typeof HM.recentSs)));
    out.push('curFriendId=' + HM.curFriendId + ' typeId=' + HM.typeId);
    return out.join(' | ');
  } catch (e) {
    return 'ERR ' + e + ' @ ' + (e && e.stack ? String(e.stack).split('\n')[1] : '');
  }
})
