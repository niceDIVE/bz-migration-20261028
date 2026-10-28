(function () {
  // 主动向 startres bundle 再要一次配置表，把拿到的东西原样落到 files/ 下，主机再拉
  var DIR = '/data/data/com.madherogo';
  DIR = '/data/data/com.maple.madherogo/files/';
  if (!jsb.fileUtils) return 'NO_JSB';
  var log = [];
  function w(name, text) { jsb.fileUtils.writeStringToFile(String(text), DIR + name); }

  var am = cc && cc.assetManager;
  if (!am) return 'NO_AM';
  var bundles = am.bundles;
  var names = [];
  try { bundles.forEach(function (b, k) { names.push(k); }); } catch (e) { return 'BUNDLES_ERR ' + e.message; }
  log.push('bundles=' + names.join(','));

  var bun = null;
  try { bun = bundles.get('startres'); } catch (e) {}
  if (!bun) { w('tbl_diag.txt', log.join('\n')); return 'NO_STARTRES bundle list=' + names.join(','); }

  var paths = ['configs/item', 'configs/tasknew', 'configs/drop', 'configs/constant'];
  var finished = 0;
  var out = [];

  function dumpOne(tag, asset) {
    var info = { tag: tag, keys: [], nativeKind: '', hasData: false, rows: 0, head: null, err: null };
    try {
      info.keys = Object.keys(asset).slice(0, 30);
      var na = asset._nativeAsset;
      info.nativeKind = na ? (Array.isArray(na) ? 'array' : typeof na) : 'none';
      if (na && na.constructor && na.constructor.name) info.ctor = na.constructor.name;
      var d = na && na.data;
      if (Array.isArray(d) && d.length) {
        info.hasData = true;
        info.rows = d.length - 1;
        info.head = Array.isArray(d[0]) ? d[0].slice(0, 24) : String(d[0]).slice(0, 200);
        if (Array.isArray(d[0])) {
          var head = d[0], obj = {};
          // 优先用 ID 列做主键（第 0 列是 __name__，不一定等于 ID）
          var idCol = head.indexOf('ID') >= 0 ? head.indexOf('ID') : (head.indexOf('TaskID') >= 0 ? head.indexOf('TaskID') : 0);
          var n = Math.min(d.length - 1, 20000);
          for (var r = 1; r <= n; r++) {
            var row = d[r];
            if (!row) continue;
            var o = {};
            for (var c = 0; c < head.length; c++) {
              if (head[c] === '__name__') continue;
              o[head[c]] = row[c];
            }
            var key = row[idCol];
            obj[key] = o;
            obj['__name:' + row[0]] = key;   // 名字→ID 反查（调试用）
          }
          w('tbl_' + tag + '.json', JSON.stringify({ tag: tag, head: head, idCol: idCol, rows: n, table: obj }));
          info.dumped = 'tbl_' + tag + '.json';
          info.idCol = idCol;
        }
      } else if (d) {
        info.dataType = typeof d;
        info.dataPreview = String(d).slice(0, 200);
      }
    } catch (e) { info.err = String(e && e.message || e); }
    out.push(info);
  }

  function done() {
    finished++;
    if (finished >= paths.length) {
      w('tbl_diag.txt', JSON.stringify(out, null, 1));
      w('tbl_done.txt', String(Date.now()));
    }
  }

  try {
    bun.load(paths, cc.Asset, null, function (err, assets) {
      log.push('cb err=' + (err ? (err.message || err) : 'none'));
      try {
        var arr = Array.isArray(assets) ? assets : [assets];
        for (var i = 0; i < paths.length; i++) dumpOne(paths[i].replace('configs/', ''), arr[i] || arr[0]);
      } catch (e) { out.push({ err: String(e && e.message || e) }); }
      w('tbl_diag.txt', JSON.stringify({ log: log, out: out }, null, 1));
      w('tbl_done.txt', String(Date.now()));
    });
  } catch (e) {
    w('tbl_diag.txt', 'LOAD_THROW ' + (e && e.stack || e));
    return 'LOAD_THROW ' + (e && e.message);
  }
  return 'STARTED bundles=' + names.join(',');
})()
