(function () {
  var C = window.__BZ_CODEC__, IMPL = window.__BZ_BOOT__ && window.__BZ_BOOT__.impl;
  if (!C || !IMPL) return JSON.stringify({ err: 'no codec/impl' });
  var enc = C.encode(JSON.stringify({ mod: 'User', do: 'ver', p: {} }));
  var res = IMPL.handle({ url: 'https://bzgf.maple-game.com/index.php?code=1', body: enc });
  var env2 = JSON.parse(res.text);
  var md = env2.MsgData;
  var out = {
    resKeys: Object.keys(res),
    envKeys: Object.keys(env2),
    mdType: typeof md,
    mdHead: typeof md === 'string' ? md.slice(0, 160) : JSON.stringify(md).slice(0, 160),
    decodedType: 'n/a',
    decodedHead: 'n/a',
  };
  try {
    var d = C.decode(md);
    out.decodedType = typeof d;
    out.decodedHead = String(d).slice(0, 200);
  } catch (e) { out.decodedErr = String(e && e.message); }
  return JSON.stringify(out).slice(0, 4000);
})()
