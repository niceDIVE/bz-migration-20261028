/* bz-handler-impl —— 策略层（热更新单元）
 *
 * 本文件不单独运行：由 build-handlers.js 拼接成 <writable>/hotfix/live/handlers.js，
 * 在进程内经 new Function('bz', src) 求值，必须 return 契约对象：
 *   { version, handle(req), selfCheck(), reset(), state() }
 *
 * 依赖已在前文定义：__TPL__（模板）、createBzServer（服务器）、IMPL_VERSION（构建注入）、bz（引导 API）
 */

var server = null;
var memStore = null;
var quiet = false;   // 自检批量跑动作时闭嘴，避免每次 reload 刷 120 行日志

function implLog(m) { if (quiet) return; try { bz.log('[impl] ' + m); } catch (e) {} }

function diskRead() {
  try { return bz.exists(bz.savePath) ? bz.readFile(bz.savePath) : null; } catch (e) { return null; }
}
function diskWrite(k, text) { bz.writeFile(bz.savePath, text); }

/** store=null → 用磁盘存档；store={read,write} → 内存（自检专用，绝不碰真档） */
function makeServer(store) {
  return createBzServer({
    now: bz.now,
    log: implLog,
    templates: __TPL__,
    codec: bz.codec,
    readSave: store ? store.read : diskRead,
    writeSave: store ? store.write : diskWrite,
    // 默认走「有档直接进」（实测冷启动 16s）；放 bz_forcewizard 文件可强制回到建角向导
    hintHasRole: !bz.exists(bz.dir + 'bz_forcewizard'),
  });
}

function memMake() {
  var data = {};
  return { read: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; }, write: function (k, v) { data[k] = v; } };
}

server = makeServer(null);

var RPC_URL_RE = /(\/register\.php)|(notice-server)|(:9898\/)|(bzgf\.maple-game\.com)/;

function handle(req) {
  var url = String((req && req.url) || '');
  var body = req ? req.body : null;
  var t0 = bz.now();

  if (url.indexOf('/register.php') >= 0) {
    return { status: 200, text: 'success', meta: { action: 'register', envelope: 'plain', ms: bz.now() - t0 } };
  }
  if (url.indexOf('notice-server') >= 0) {
    return { status: 200, text: '{"statusCode":200,"data":[]}', meta: { action: 'notice', envelope: 'plain', ms: bz.now() - t0 } };
  }
  if (url.indexOf(':9898/') >= 0 || url.indexOf('bzgf.maple-game.com') >= 0) {
    var r = server.handleRequest(body, url);
    if (!r || !r.ok) {
      return { status: 502, text: '', meta: { action: 'rpc-fail', error: (r && r.error) || 'unknown', url: url.slice(0, 100), ms: bz.now() - t0 } };
    }
    return { status: 200, text: r.text, meta: { action: r.action, envelope: r.envelope, bytes: (r.text || '').length, ms: bz.now() - t0 } };
  }
  return { status: 200, text: '', meta: { action: 'blackhole', url: url.slice(0, 100), ms: bz.now() - t0 } };
}

var CHECK_ACTIONS = [
  'GetServerList', 'ChooseServer', 'TellAction', 'quicklogin', 'CheckName', 'Create',
  'getCRAInfo', 'GetChatAddress', 'acceptTask', 'getFinishTaskAward', 'OpenNovice',
  'joinSchool', 'upgradeSkill', 'ReqSelfBattleInfo', 'CheckBattleResult',
];

function selfCheck() {
  var passed = 0, failed = [], detail = [];
  function ok(name, cond, info) {
    if (cond) { passed++; return; }
    failed.push(name);
    detail.push({ name: name, info: info === undefined ? null : info });
  }
  if (!bz.codec) { failed.push('codec:missing'); return { ok: false, version: IMPL_VERSION, passed: passed, failed: failed, detail: detail }; }

  ok('codec:roundtrip', (function () {
    try { return bz.codec.decode(bz.codec.encode('{"a":1}')) === '{"a":1}'; } catch (e) { return false; }
  })());
  ok('tpl:serverList', !!(__TPL__ && __TPL__.getServerList));
  ok('tpl:create', !!(__TPL__ && __TPL__.create));

  // 每个动作：包络（code/无 code）+ 载荷可解码 + 必须"恰好一次成功应答"
  var iso = makeServer(memMake());
  for (var i = 0; i < CHECK_ACTIONS.length; i++) {
    var a = CHECK_ACTIONS[i];
    var reqBody;
    try { reqBody = bz.codec.encode(JSON.stringify({ mod: 'User', do: a, p: {} })); } catch (e) { ok(a + ':encode-req', false, String(e)); continue; }

    var res = iso.handleRequest(reqBody, 'https://bzgf.maple-game.com/900-server-166/' + a);
    ok(a + ':ok', !!(res && res.ok), res && res.error);
    var env1 = null;
    try { env1 = JSON.parse(res.text); } catch (e) {}
    ok(a + ':code', !!(env1 && env1.code === 200 && typeof env1.MsgData === 'string'));
    var inner = null;
    try { inner = JSON.parse(bz.codec.decode(env1.MsgData)); } catch (e) {}
    ok(a + ':payload', inner !== null && typeof inner === 'object');

    var res2 = iso.handleRequest(reqBody, 'http://10.0.0.1:9898/' + a);
    var env2 = null;
    try { env2 = JSON.parse(res2.text); } catch (e) {}
    ok(a + ':nocode', !!(env2 && env2.code === undefined && typeof env2.MsgData === 'string'), env2 && env2.code);
  }

  // 信封必须按 URL 区分，且 unknown 动作要有 ACK 兜底
  var unk = bz.codec.encode(JSON.stringify({ mod: 'User', do: 'neverSeenAction', p: {} }));
  var ru = iso.handleRequest(unk, 'https://bzgf.maple-game.com/900-server-166/x');
  var pu = null;
  try { pu = JSON.parse(bz.codec.decode(JSON.parse(ru.text).MsgData)); } catch (e) {}
  ok('unknown:ack', !!(pu && pu.resultCode === 200), pu);

  // 形状表：每个待实现动作的应答必须带齐「客户端真会读」的字段，且 eRet=1
  // 这一步把 120 个动作的契约钉死在自检里——改坏了 reload 就报警，不用等玩家撞见
  if (typeof BZ_SHAPES !== 'undefined' && BZ_SHAPES) {
    quiet = true;
    var shapedCount = 0;
    for (var act in BZ_SHAPES) {
      if (!BZ_SHAPES.hasOwnProperty(act) || act === '__meta') continue;
      shapedCount++;
      var want = BZ_SHAPES[act];
      var got = iso.dispatch('User', act, {});
      var inner2 = got && got['User.' + act];
      ok('shape:' + act + ':present', !!inner2, act);
      ok('shape:' + act + ':eRet', !!(inner2 && inner2.eRet === 1), inner2 && inner2.eRet);
      var missing = [];
      for (var fld in want) {
        if (!want.hasOwnProperty(fld)) continue;
        if (!(inner2 && Object.prototype.hasOwnProperty.call(inner2, fld))) missing.push(fld);
      }
      ok('shape:' + act + ':fields', missing.length === 0, missing);
    }
    ok('shape:count', shapedCount > 0, shapedCount);
    ok('shape:meta', !!(BZ_SHAPES.__meta && BZ_SHAPES.__meta.total === shapedCount), BZ_SHAPES.__meta);
    quiet = false;
  }

  return { ok: failed.length === 0, version: IMPL_VERSION, passed: passed, failed: failed, detail: detail, t: bz.now() };
}

function reset() {
  server = makeServer(null);
  var r = server.reset();
  implLog('reset → roleID=' + r.roleID);
  return { ok: true, version: IMPL_VERSION, roleID: r.roleID };
}

function state() {
  try {
    var raw = diskRead();
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

return {
  version: IMPL_VERSION,
  handle: handle,
  selfCheck: selfCheck,
  reset: reset,
  state: state,
};
