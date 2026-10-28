/* hunt_net —— 找网络层/角色层对象：先列候选，再按需钻取
 * 参数（probe_arg）：候选过滤正则，默认 net|http|mgr|game|role|user|load */
(function (PAT) {
  PAT = PAT || 'net|http|mgr|game|role|user|load|data';
  var re = new RegExp('^(' + PAT + ')$', 'i') , loose = new RegExp(PAT, 'i');
  var out = [], names = [];
  try { names = Object.getOwnPropertyNames(window); } catch (e) { return 'ERR ' + e; }

  function kindOf(v) {
    if (v === null) return 'null';
    var t = typeof v;
    if (t === 'function') return 'function/' + (v.length || 0) + 'args';
    if (t === 'object') {
      var ms = [], ks = [];
      try {
        for (var k in v) {
          try { if (typeof v[k] === 'function') ms.push(k); else ks.push(k); } catch (e) {}
          if (ms.length + ks.length > 40) break;
        }
      } catch (e) {}
      return 'object{fns:' + ms.slice(0, 12).join(',') + '|keys:' + ks.slice(0, 12).join(',') + '}';
    }
    return t;
  }

  for (var i = 0; i < names.length; i++) {
    var n = names[i];
    if (!loose.test(n)) continue;
    var v;
    try { v = window[n]; } catch (e) { continue; }
    out.push(n + ' : ' + kindOf(v));
  }
  return 'candidates(' + out.length + '):\n' + out.join('\n');
})
