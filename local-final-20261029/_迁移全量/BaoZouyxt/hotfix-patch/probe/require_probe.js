(function () {
  // 只读探针：用客户端自己的 window.__require（scripts3.js:1 的模块解析器，短名 + 回退上一包）
  // 直接问三件事：CFMgr.dic.item 在不在 / 3626 能不能查到 / RoleBaseInfo._itemObj 到底有什么。
  // 不做 BFS、不遍历大表（只取 keys.length 与头部样本）。上限：无循环遍历。
  var out = { ok: 0, errs: [] };
  var R = typeof window.__require === 'function' ? window.__require
        : (typeof __require === 'function' ? __require : null);
  out.hasRequire = !!R;
  if (!R) return JSON.stringify(out);

  function get(name) {
    try { return R(name); } catch (e) { out.errs.push(name + ': ' + (e && e.message ? e.message : e)); return null; }
  }

  // ---- 1) CFMgr：配置表字典 ----
  var cfg = get('CFMgr') || get('gameconfigs/CFMgr');
  out.cfg = !!cfg;
  if (cfg) {
    try {
      var dic = cfg.dic;
      out.dicIsObj = !!dic;
      var names = dic ? Object.keys(dic) : [];
      out.dicTableCount = names.length;
      out.dicNames = names.slice(0, 40);
      out.hasItemTable = !!(dic && dic.item);
      if (dic && dic.item) {
        var ik = Object.keys(dic.item);
        out.itemCount = ik.length;
        out.itemKeySample = ik.slice(0, 8);
        out.hit3626 = !!dic.item[3626];
        out.hit3005 = !!dic.item[3005];
        out.hit7027 = !!dic.item[7027];
        var any = dic.item[3626] || dic.item[ik[0]];
        out.itemFields = any ? Object.keys(any).slice(0, 10) : null;
        out.item3626Quality = (dic.item[3626] && dic.item[3626].quality !== undefined) ? dic.item[3626].quality : 'NO_QUALITY_FIELD';
      }
      out.hasTasknew = !!(dic && dic.tasknew);
    } catch (e) { out.errs.push('cfg: ' + (e && e.message ? e.message : e)); }
  }

  // ---- 2) RoleBaseInfo：客户端那本背包账 ----
  var rbi = get('RoleBaseInfo') || get('models/vos/RoleBaseInfo');
  out.rbi = !!rbi;
  if (rbi) {
    try {
      var B = rbi.RoleBaseInfo || rbi;
      out.userName = B.userName;
      out.roleID = B.roleID;
      var ok = B._itemObj ? Object.keys(B._itemObj) : null;
      out.itemObjKeys = ok;
      out.itemObjCount = ok ? ok.length : -1;
      out.type2 = B.type2Items ? Object.keys(B.type2Items) : null;
      out.equipments = B.equipments ? Object.keys(B.equipments) : null;
      out.finishTaskCount = B.finishTaskObj ? Object.keys(B.finishTaskObj).length : -1;
      out.skillCount = B.sType2SkillIDDic ? Object.keys(B.sType2SkillIDDic).length : -1;
    } catch (e) { out.errs.push('rbi: ' + (e && e.message ? e.message : e)); }
  }

  // ---- 3) 顺手确认 setItem / getItem 是不是同一份实例 ----
  try {
    if (rbi && cfg) {
      var B2 = rbi.RoleBaseInfo || rbi;
      out.setItemIsFn = typeof B2.setItem;
      out.getItemIsFn = typeof cfg.getItem;
      // 干跑一次 getItem（只读，不写账）：能不能查到 3626
      var probeItem = cfg.getItem(3626, 'item');
      out.dryGetItem3626 = probeItem ? 'HIT' : 'NULL';
    }
  } catch (e) { out.errs.push('dry: ' + (e && e.message ? e.message : e)); }

  out.ok = 1;
  return JSON.stringify(out).slice(0, 3500);
})()
