(function () {
  // 从场景图 + window 双向 BFS，找客户端持有物品的对象（_itemObj / equipmentDic）
  // 用 Set 判重：之前用 indexOf 是 O(n^2)，会卡死主线程导致命令通道超时
  var roots = [];
  try { roots.push(window); } catch (e) {}
  try { if (cc && cc.director) roots.push(cc.director.getScene()); } catch (e) {}

  var seen = new Set(), q = roots.slice(), found = null, count = 0, t0 = Date.now();
  var MAXN = 12000, BUDGET = 2500;

  while (q.length && !found && Date.now() - t0 < BUDGET && count < MAXN) {
    var o = q.shift();
    count++;
    if (!o || (typeof o !== 'object' && typeof o !== 'function')) continue;
    if (seen.has(o)) continue;
    seen.add(o);
    try {
      if (Object.prototype.hasOwnProperty.call(o, '_itemObj') && o._itemObj && typeof o._itemObj === 'object') { found = o; break; }
      if (Object.prototype.hasOwnProperty.call(o, 'equipmentDic') && o.equipmentDic && typeof o.equipmentDic === 'object') { found = o; break; }
    } catch (e) {}
    var ks;
    try { ks = Object.getOwnPropertyNames(o); } catch (e) { continue; }
    for (var i = 0; i < ks.length && i < 240; i++) {
      var v;
      try { v = o[ks[i]]; } catch (e) { continue; }
      if (v && (typeof v === 'object' || typeof v === 'function')) q.push(v);
    }
  }
  if (!found) return 'NOTFOUND nodes=' + count + ' seen=' + seen.size + ' ms=' + (Date.now() - t0);

  var out = { nodes: count, seen: seen.size, ctor: '', items: {}, equip: {} };
  try { out.ctor = (found.constructor && found.constructor.name) || ''; } catch (e) {}
  try {
    var io = found._itemObj;
    if (io) for (var k in io) {
      var it = io[k];
      out.items[k] = it && it.numbers !== undefined ? it.numbers : it;
    }
  } catch (e) {}
  try {
    var eq = found.equipmentDic;
    if (eq) for (var u in eq) {
      var e2 = eq[u];
      out.equip[u] = e2 ? { itemID: e2.itemID, num: e2.num, type: e2.type } : null;
    }
  } catch (e) {}
  try { out.type2 = Object.keys(found.type2Items || {}); } catch (e) {}
  return JSON.stringify(out).slice(0, 2500);
})()
