(function (want) {
  var sc = cc.director.getScene(), found = null, stack = [sc];
  function compName(c) { try { return c.__classname__ || (c.constructor && c.constructor.name) || ''; } catch (e) { return ''; } }
  while (stack.length && !found) {
    var n = stack.pop();
    if (!n) continue;
    var cs = n._components || [];
    for (var i = 0; i < cs.length; i++) if (compName(cs[i]) === want) { found = cs[i]; break; }
    (n.children || []).forEach(function (c) { stack.push(c); });
  }
  if (!found) return JSON.stringify({ err: 'comp not found', want: want });
  var proto = Object.getPrototypeOf(found), names = [];
  Object.getOwnPropertyNames(proto).forEach(function (k) {
    var v; try { v = proto[k]; } catch (e) { return; }
    if (typeof v === 'function' && k !== 'constructor') names.push(k);
  });
  var called = null;
  for (var j = 0; j < names.length; j++) {
    if (/^(onClose|onBackCallBack|onBack|close|hide|remove)$/i.test(names[j])) { try { found[names[j]](); called = names[j]; } catch (e) { called = names[j] + ' ERR ' + e; } break; }
  }
  return JSON.stringify({ comp: want, methods: names, called: called });
})( typeof window !== 'undefined' && null )
