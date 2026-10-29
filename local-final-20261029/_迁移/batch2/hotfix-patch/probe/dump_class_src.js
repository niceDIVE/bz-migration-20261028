/* dump_class_src —— 按类名导出客户端源码（读规格用）
 * 依次尝试 cc.js.getClassByName(name) 与 window[name] */
(function (LIST) {
  LIST = LIST || ['LoginModel', 'SvrListModel', 'GSceneMgr', 'LoginMgr', 'CreateRoleModel', 'RoleBaseInfo'];
  var out = [];

  function dumpProto(label, obj) {
    var proto = obj;
    var names;
    try { names = Object.getOwnPropertyNames(proto); } catch (e) { out.push('## ' + label + ' (无法枚举: ' + e + ')'); return; }
    out.push('\n########## ' + label + ' ##########');
    for (var i = 0; i < names.length; i++) {
      var k = names[i];
      if (k === 'constructor') continue;
      var v;
      try { v = proto[k]; } catch (e) { continue; }
      if (typeof v !== 'function') continue;
      var s = '';
      try { s = String(v); } catch (e) { s = '?'; }
      out.push('\n=== ' + label + '.' + k + ' ===\n' + s.slice(0, 8000));
    }
  }

  for (var i = 0; i < LIST.length; i++) {
    var n = LIST[i], found = false;
    try {
      var cls = (cc.js && cc.js.getClassByName) ? cc.js.getClassByName(n) : null;
      if (cls && cls.prototype) { dumpProto(n + '(class)', cls.prototype); found = true; }
    } catch (e) {}
    try {
      if (window[n] && typeof window[n] === 'object') {
        dumpProto(n + '(window)', window[n]);
        found = true;
      }
    } catch (e) {}
    if (!found) out.push('\n########## ' + n + ' : NOT FOUND ##########');
  }
  return out.join('\n');
})()
