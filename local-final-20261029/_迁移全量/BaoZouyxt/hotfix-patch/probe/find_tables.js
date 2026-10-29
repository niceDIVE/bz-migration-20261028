(function () {
  // 从 Cocos 资源缓存里找出「配置表」：形如 _nativeAsset.data = [ [表头...], [行...], ... ]
  // 结果写到 files/tbl_index.json（摘要）+ 命中的表写 files/tbl_<tag>.json（全量），主机再拉回来
  var DIR = '/data/data/com.maple.madherogo/files/';
  var cache = null;
  try { cache = cc.loader && cc.loader._cache; } catch (e) {}
  if (!cache) return 'NO_CACHE';
  var ks = Object.keys(cache);
  var index = [];
  var dumped = {};
  var MAXROWS = 20000;

  function hasFile() { return jsb.fileUtils; }
  if (!hasFile()) return 'NO_JSB_FILEUTILS';

  for (var i = 0; i < ks.length; i++) {
    var a = cache[ks[i]];
    if (!a) continue;
    var na = a._nativeAsset || a._nativeData || null;
    var data = na && na.data;
    if (!data || !Array.isArray(data) || !data.length) continue;
    var head = data[0];
    if (!Array.isArray(head)) continue;
    var rows = data.length - 1;
    if (rows < 5) continue;
    var headStr = head.slice(0, 24).join(',');
    index.push({ uuid: ks[i], head: headStr, rows: rows, row0: (data[1] || []).slice(0, 6).join(',') });

    // 物品表：表头里有 Name 与 Type（客户端用法 i.quality / i.Type / i.Name）
    var isItem = head.indexOf('Name') >= 0 && head.indexOf('Type') >= 0 && head.indexOf('quality') >= 0;
    // 任务表：表头里有 FinishNpc 或 ReceiveNpc
    var isTask = head.indexOf('FinishNpc') >= 0 || head.indexOf('ReceiveNpc') >= 0;
    if (!isItem && !isTask) continue;
    var tag = isItem ? 'item' : 'task';
    if (dumped[tag]) continue;
    var n = Math.min(rows, MAXROWS);
    var obj = {};
    for (var r = 1; r <= n; r++) {
      var row = data[r];
      if (!row) continue;
      var o = {};
      for (var c = 0; c < head.length; c++) {
        if (head[c] === '__name__') continue;
        o[head[c]] = row[c];
      }
      obj[row[0]] = o;
    }
    var out = JSON.stringify({ tag: tag, uuid: ks[i], headers: head, rows: n, table: obj });
    var p = DIR + 'tbl_' + tag + '.json';
    jsb.fileUtils.writeStringToFile(out, p);
    dumped[tag] = { uuid: ks[i], rows: n, bytes: out.length };
  }

  jsb.fileUtils.writeStringToFile(JSON.stringify({ scanned: ks.length, tables: index.length, index: index, dumped: dumped }), DIR + 'tbl_index.json');
  return JSON.stringify({ scanned: ks.length, tables: index.length, dumped: dumped }).slice(0, 1500);
})()
