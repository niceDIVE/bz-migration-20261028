(function () {
  var seen = [], queue = [window], found = null, count = 0;
  var t0 = Date.now();
  while (queue.length && count < 25000 && !found && Date.now() - t0 < 8000) {
    var o = queue.shift(); count++;
    if (!o || (typeof o !== 'object' && typeof o !== 'function')) continue;
    if (seen.indexOf(o) >= 0) continue;
    if (seen.length > 6000) break;
    seen.push(o);
    var keys;
    try { keys = Object.getOwnPropertyNames(o); } catch (e) { continue; }
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i], v;
      try { v = o[k]; } catch (e) { continue; }
      if (k === 'outSchoolAy') { found = o; break; }
      if (v && typeof v === 'object') queue.push(v);
    }
  }
  if (!found) return 'NOTFOUND nodes=' + count + ' seen=' + seen.length;
  found.outSchoolAy = [];
  var nm = ''; try { nm = found.constructor && found.constructor.name || ''; } catch (e) {}
  return 'PATCHED outSchoolAy=[] on ' + nm + ' (nodes=' + count + ')';
})()
