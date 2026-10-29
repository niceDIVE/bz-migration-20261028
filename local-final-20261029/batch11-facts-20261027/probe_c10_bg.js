// C10 真机探针：查 cultivation bundle 里到底有哪些 homeBG_* 预制体（定位 Assert 1606 的根因）
// 用法：.\run.ps1 probe F:\BaoZouyxt\batch11-facts-20261027\probe_c10_bg.js
(function () {
  var out = [];
  try {
    var cc = window.cc;
    if (!cc || !cc.assetManager) return 'NO_CC';
    var names = [];
    try {
      var b = cc.assetManager.getBundle('cultivation');
      out.push('bundle cultivation=' + (b ? 'yes' : 'no'));
      if (b && b.getDirWithPath) {
        var arr = b.getDirWithPath('cultivationUI') || [];
        for (var i = 0; i < arr.length; i++) {
          var p = arr[i] && (arr[i].path || arr[i].uuid);
          if (p) names.push(String(p));
        }
      }
      if (!names.length && b && b.config && b.config.assetInfos) {
        var ai = b.config.assetInfos;
        for (var j = 0; j < ai.length; j++) {
          var u = ai[j] && ai[j].path;
          if (u) names.push(String(u));
        }
      }
      out.push('dirEntries=' + names.length);
      var bg = names.filter(function (n) { return n.indexOf('homeBG') >= 0 || n.indexOf('homeBg') >= 0; });
      out.push('homeBG=' + (bg.length ? bg.slice(0, 20).join(',') : 'NONE'));
      var cand = [0, 1, 2, 3, 4, 1008, 1118, 1119, 1120, 1147];
      var hit = [];
      for (var k = 0; k < cand.length; k++) {
        var path = 'cultivationUI/homeBG_' + cand[k];
        var has = false;
        try { has = !!(b && b.getInfoWithPath && b.getInfoWithPath(path, cc.Prefab)); } catch (e2) {}
        if (has) hit.push(cand[k]);
      }
      out.push('prefabHit=' + (hit.length ? hit.join(',') : 'NONE'));
      out.push('sample=' + names.slice(0, 12).join(','));
    } catch (e) {
      out.push('ERR_IN=' + e);
    }
    return out.join(' | ');
  } catch (e) {
    return 'ERR ' + e;
  }
})
