/* fs_api_probe.js —— 只读探针：查设备端可用的文件 API（决定"原子写"怎么落地）
 * 不写任何文件、不改任何状态；返回一行 JSON。
 */
(function () {
  var out = { ok: true };
  try {
    var fu = (typeof jsb !== 'undefined' && jsb.fileUtils) ? jsb.fileUtils : null;
    out.hasJsbFileUtils = !!fu;
    if (fu) {
      var keys = [];
      for (var k in fu) { if (typeof fu[k] === 'function') keys.push(k); }
      keys.sort();
      out.allFns = keys;
      var interesting = [];
      for (var i = 0; i < keys.length; i++) {
        if (/ren|move|copy|sync|writ|read|exist|remove|stat|size|dir/i.test(keys[i])) interesting.push(keys[i]);
      }
      out.relevant = interesting;
      out.renameLike = interesting.filter(function (n) { return /ren|move/i.test(n); });
    }
    out.hasCcLoader = (typeof cc !== 'undefined');
    out.platform = (typeof cc !== 'undefined' && cc.sys) ? (cc.sys.platform + '/' + cc.sys.os) : null;
  } catch (e) { out.ok = false; out.err = String(e); }
  return JSON.stringify(out);
})()
