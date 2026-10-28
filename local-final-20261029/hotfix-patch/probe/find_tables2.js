(function () {
  // 扫 cc.assetManager 各 bundle 的 assets，找「表格型」资源：data 是二维数组（首行表头）
  var DIR = '/data/data/com.maple.madherogo/files/';
  var roots = [];
  try { if (cc.assetManager) roots.push(['am', cc.assetManager]); } catch (e) {}
  try { if (cc.loader) roots.push(['loader', cc.loader]); } catch (e) {}

  var seen = [], picked = {}, idx = [], scanned = 0;

  function looksLikeTable(o) {
    if (!o || typeof o !== 'object') return null;
    var cands = [o._nativeAsset, o._nativeData, o];
    for (var i = 0; i < cands.length; i++) {
      var d = cands[i] && cands[i].data;
      if (Array.isArray(d) && d.length > 5 && Array.isArray(d[0]) && d[0].length > 3) return d;
    }
    return null;
  }

  function visit(node, tag, depth) {
    if (!node || typeof node !== 'object' || depth > 4) return;
    if (seen.indexOf(node) >= 0) return;
    seen.push(node);
    scanned++;
    var d = looksLikeTable(node);
    if (d) {
      var head = d[0];
      var headStr = head.slice(0, 20).join(',');
      var isItem = head.indexOf('Name') >= 0 && (head.indexOf('quality') >= 0 || head.indexOf('Type') >= 0);
      var isTask = head.indexOf('FinishNpc') >= 0 || head.indexOf('Require') >= 0;
      idx.push({ tag: tag, key: node._name || node.name || '', rows: d.length - 1, head: headStr });
      if ((isItem || isTask) && idx.length < 400) {
        var t2 = isItem ? 'item' : 'task';
        if (!picked[t2]) {
          var obj = {};
          var n = Math.min(d.length - 1, 20000);
          for (var r = 1; r <= n; r++) {
            var row = d[r];
            if (!row) continue;
            var o = {};
            for (var c = 0; c < head.length; c++) {
              if (head[c] === '__name__') continue;
              o[head[c]] = row[c];
            }
            obj[row[0]] = o;
          }
          var out = JSON.stringify({ tag: t2, head: head, rows: n, table: obj });
          jsb.fileUtils.writeStringToFile(out, DIR + 'tbl_' + t2 + '.json');
          picked[t2] = { rows: n, bytes: out.length };
        }
      }
    }
    var ks;
    try { ks = Object.keys(node); } catch (e) { return; }
    for (var k = 0; k < ks.length && k < 120; k++) {
      var v;
      try { v = node[ks[k]]; } catch (e) { continue; }
      if (v && typeof v === 'object') visit(v, tag + '.' + ks[k], depth + 1);
    }
  }

  for (var i = 0; i < roots.length; i++) visit(roots[i][1], roots[i][0], 0);
  jsb.fileUtils.writeStringToFile(JSON.stringify({ scanned: scanned, tables: idx.length, index: idx.slice(0, 300), picked: picked }), DIR + 'tbl_index.json');
  return JSON.stringify({ scanned: scanned, tables: idx.length, picked: picked }).slice(0, 1200);
})()
