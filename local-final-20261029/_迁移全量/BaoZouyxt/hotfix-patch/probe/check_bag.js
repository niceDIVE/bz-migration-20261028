(function () {
  // 极小的 BFS（上限 800 节点）：只问一句"客户端的 _itemObj 里到底有没有东西"
  // 绝不做全图遍历——上一版 O(n^2) 的 BFS 把主线程卡死，触发 ANR，游戏被系统杀了
  var q = [window], seen = new Set(), n = 0, hit = null;
  while (q.length && n < 800 && !hit) {
    var o = q.shift();
    n++;
    if (!o || (typeof o !== 'object' && typeof o !== 'function')) continue;
    if (seen.has(o)) continue;
    seen.add(o);
    try {
      if (Object.prototype.hasOwnProperty.call(o, '_itemObj') && o._itemObj) { hit = o; break; }
      if (Object.prototype.hasOwnProperty.call(o, 'equipmentDic')) { hit = o; break; }
    } catch (e) {}
    var ks;
    try { ks = Object.getOwnPropertyNames(o); } catch (e) { continue; }
    for (var i = 0; i < ks.length && i < 120; i++) {
      var v;
      try { v = o[ks[i]]; } catch (e) { continue; }
      if (v && (typeof v === 'object' || typeof v === 'function') && !(v instanceof Function)) q.push(v);
    }
  }
  if (!hit) return 'NOTFOUND n=' + n;
  var out = { n: n, ctor: '', items: {}, equipN: 0 };
  try { out.ctor = (hit.constructor && hit.constructor.name) || ''; } catch (e) {}
  try {
    for (var k in hit._itemObj) {
      var it = hit._itemObj[k];
      out.items[k] = (it && it.numbers !== undefined) ? it.numbers : it;
    }
  } catch (e) {}
  try { out.equipN = Object.keys(hit.equipmentDic || {}).length; } catch (e) {}
  return JSON.stringify(out);
})()
