(function () {
  // 在进程内找到客户端的背包对象，把它现在的持有物灌进补丁账本（bzSeedBag）
  // 只读客户端内存；写入的是补丁自己的存档文件
  var seen = [], q = [window], found = null, count = 0, t0 = Date.now();
  while (q.length && !found && Date.now() - t0 < 8000) {
    var o = q.shift();
    count++;
    if (!o || (typeof o !== 'object' && typeof o !== 'function')) continue;
    if (seen.indexOf(o) >= 0) continue;
    if (seen.length > 8000) break;
    seen.push(o);
    try {
      if (Object.prototype.hasOwnProperty.call(o, '_itemObj') && o._itemObj && typeof o._itemObj === 'object') { found = o; break; }
    } catch (e) {}
    var ks;
    try { ks = Object.getOwnPropertyNames(o); } catch (e) { continue; }
    for (var i = 0; i < ks.length && i < 240; i++) {
      var v;
      try { v = o[ks[i]]; } catch (e) { continue; }
      if (v && typeof v === 'object') q.push(v);
    }
  }
  if (!found) return 'NOTFOUND nodes=' + count + ' seen=' + seen.length;

  var bag = {}, dropped = 0;
  for (var k in found._itemObj) {
    try {
      var it = found._itemObj[k];
      var n = it && it.numbers | 0;
      if (n > 0) bag[k] = n;
      else dropped++;
    } catch (e) { dropped++; }
  }

  // 装备字典（可能是类实例，失败就跳过，不让探针炸）
  var equip = null, equipN = 0;
  try {
    if (found.equipmentDic && typeof found.equipmentDic === 'object') {
      equip = {};
      for (var ek in found.equipmentDic) {
        try { equip[ek] = JSON.parse(JSON.stringify(found.equipmentDic[ek])); equipN++; } catch (e) {}
      }
      if (!equipN) equip = null;
    }
  } catch (e) { equip = null; }

  var payload = { mod: 'User', do: 'bzSeedBag', p: { itemObj: bag } };
  if (equip) payload.p.playerEquip = equip;
  var reply = null;
  try {
    var body = __BZ_CODEC__.encode(JSON.stringify(payload));
    var r = __BZ_HARNESS__.impl.handle({ url: 'https://bzgf.maple-game.com/900-server-166/x', body: body });
    var dec = JSON.parse(__BZ_CODEC__.decode(JSON.parse(r.text).MsgData));
    reply = dec['User.bzSeedBag'];
  } catch (e) {
    return 'SEED_FAIL ' + (e && e.message) + ' bag=' + JSON.stringify(bag).slice(0, 300);
  }
  return JSON.stringify({
    nodes: count,
    bagKinds: Object.keys(bag).length,
    bag: bag,
    zeroCount: dropped,
    equipN: equipN,
    reply: reply,
  }).slice(0, 3000);
})()
