(function () {
  // 只读探针：装备属性到底有没有被加到战斗实体上。
  // 依据 tools/facts/q1q2-main-verdict.json 的 Q1 链：
  //   LoadGame.equipments -> RoleBaseInfo.equipments -> setupEntity(142517)
  //   -> entity.putOnEquipment(11174) -> equip.arm(44737) -> addProperty(44695) -> equip.bonuses[]
  // 本探针只读四样东西，不写档、不推客户端模型、不做 BFS、不遍历大表：
  //   1) RoleBaseInfo.equipments（槽位 -> uid）
  //   2) InventoryModel.equipmentDic（uid -> {id,type,itemID,num}）
  //   3) UserModel.entity._equipments[槽].bonuses（每件装备真正加了什么属性）
  //   4) entity 各属性的 baseValue / limit / _rawBonuses
  var out = { ok: 0, errs: [], t: Date.now() };
  var R = typeof window.__require === 'function' ? window.__require
        : (typeof __require === 'function' ? __require : null);
  out.hasRequire = !!R;
  if (!R) return JSON.stringify(out);

  function get(name) {
    try { return R(name); } catch (e) {
      out.errs.push(name + ': ' + (e && e.message ? e.message : e));
      return null;
    }
  }
  function num(v) {
    return (typeof v === 'number' && isFinite(v)) ? v
      : (v === undefined ? 'undef' : (v === null ? 'null' : String(v)));
  }

  // ---- 1) RoleBaseInfo.equipments ----
  var rbi = get('RoleBaseInfo') || get('models/vos/RoleBaseInfo');
  var B = rbi ? (rbi.RoleBaseInfo || rbi) : null;
  out.hasRoleBaseInfo = !!B;
  if (B) {
    try {
      var eq = B.equipments || {};
      out.slotsFromLoadGame = {};
      var n = 0;
      for (var k in eq) { out.slotsFromLoadGame[k] = eq[k]; if (++n >= 12) break; }
      out.slotCount = n;
    } catch (e) { out.errs.push('rbi.equipments: ' + (e && e.message ? e.message : e)); }
  }

  // ---- 2) InventoryModel.equipmentDic ----
  var inv = get('InventoryModel') || get('InventoryDB') || get('models/InventoryModel');
  out.hasInventoryModel = !!inv;
  if (inv) {
    try {
      var dic = inv.equipmentDic || (inv.default && inv.default.equipmentDic);
      out.equipmentDicCount = dic ? Object.keys(dic).length : -1;
      out.equipmentDic = {};
      var n2 = 0;
      for (var uid in (dic || {})) {
        var o = dic[uid];
        out.equipmentDic[uid] = o ? {
          id: num(o.id), type: num(o.type), itemID: num(o.itemID),
          numVal: num(o.num), numAttr: num(o.numAttr),
          hasAttrs: !!(o.attrs && Object.keys(o.attrs).length)
        } : null;
        if (++n2 >= 12) break;
      }
    } catch (e) { out.errs.push('inv.equipmentDic: ' + (e && e.message ? e.message : e)); }
  }

  // ---- 3) 战斗实体上的装备与它们加的属性 ----
  var um = get('UserModel') || get('models/UserModel');
  var U = um ? (um.UserModel || um) : null;
  var ent = U ? U.entity : null;
  out.hasEntity = !!ent;
  if (ent) {
    try {
      var eeq = ent._equipments || {};
      out.entitySlots = {};
      var n3 = 0;
      for (var s in eeq) {
        var item = eeq[s];
        var row = {
          displayID: item ? num(item.getDisplayID ? item.getDisplayID() : (item._data && item._data.itemID)) : 'null',
          itemID: item && item._data ? num(item._data.itemID) : 'noData',
          type: item && item._data ? num(item._data.type) : 'noData',
          bonusCount: item && item.bonuses ? item.bonuses.length : -1,
          bonuses: []
        };
        if (item && item.bonuses) {
          for (var bi = 0; bi < item.bonuses.length && bi < 8; ++bi) {
            var pair = item.bonuses[bi];
            row.bonuses.push([num(pair[0]), num(pair[1] && pair[1].baseValue)]);
          }
        }
        out.entitySlots[s] = row;
        if (++n3 >= 12) break;
      }
      out.entitySlotCount = n3;
      out.addEqMp = num(ent.addEqMp);
    } catch (e) { out.errs.push('entity.equipments: ' + (e && e.message ? e.message : e)); }

    // ---- 4) 属性：baseValue / limit / rawBonus 明细 ----
    try {
      var names = ['attack', 'defense', 'penetration', 'hp', 'mp', 'hitChance', 'dodge',
                   'strength', 'shenfa', 'gengu', 'perception'];
      out.attrs = {};
      for (var ai = 0; ai < names.length; ++ai) {
        var a = ent[names[ai]];
        if (!a) { out.attrs[names[ai]] = 'MISSING'; continue; }
        var rec = { base: num(a.baseValue) };
        try { rec.limit = num(a.limit); } catch (e1) { rec.limit = 'throw:' + (e1 && e1.message); }
        try { rec.finalValue = num(a.finalValue); } catch (e2) { rec.finalValue = 'throw'; }
        var rb = a._rawBonuses;
        rec.rawCount = rb ? rb.length : -1;
        if (rb && rb.length) {
          var sum = 0, parts = [];
          for (var ri = 0; ri < rb.length && ri < 10; ++ri) {
            var v = rb[ri] && rb[ri].baseValue;
            if (typeof v === 'number') { sum += v; parts.push(v); }
          }
          rec.rawSumFirst10 = sum;
          rec.rawSample = parts;
        }
        out.attrs[names[ai]] = rec;
      }
      // id2AttributeDic[6] 是属性 6（闪避）—— equipAttruteNum 的唯一落点
      try {
        var d6 = ent.id2AttributeDic && ent.id2AttributeDic[6];
        out.attr6 = d6 ? {
          base: num(d6.baseValue),
          equipAttriteValue: num(d6._equipAttriteValue),
          equipAttriteMult: num(d6._equipAttriteMult),
          rawCount: d6._rawBonuses ? d6._rawBonuses.length : -1
        } : 'MISSING';
      } catch (e3) { out.errs.push('attr6: ' + (e3 && e3.message)); }
    } catch (e) { out.errs.push('entity.attrs: ' + (e && e.message ? e.message : e)); }
  }

  // ---- 5) 拿 item 表核对同一件装备的期望值（只查 3 件，不遍历表）----
  var cfg = get('CFMgr') || get('gameconfigs/CFMgr');
  if (cfg && out.equipmentDic) {
    try {
      out.itemRows = {};
      var c2 = 0;
      for (var uid2 in out.equipmentDic) {
        var rec2 = out.equipmentDic[uid2];
        var iid = rec2 && rec2.itemID;
        if (typeof iid === 'number' && cfg.getItem) {
          var r2 = cfg.getItem(iid, 'item');
          out.itemRows[iid] = r2 ? {
            Type: num(r2.Type), EquipType: num(r2.EquipType),
            Property1: num(r2.Property1), Data1: num(r2.Data1),
            Property2: num(r2.Property2), Data2: num(r2.Data2),
            Property3: num(r2.Property3), Data3: num(r2.Data3)
          } : 'NOT_IN_ITEM_TABLE';
        }
        if (++c2 >= 6) break;
      }
    } catch (e) { out.errs.push('cfg.item: ' + (e && e.message ? e.message : e)); }
  }

  out.ok = 1;
  return JSON.stringify(out).slice(0, 6000);
})()
