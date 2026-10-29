/* bz-bootstrap —— 薄引导（几乎永不改）
 *
 * 只做五件事：
 *   1. 命令通道（文件：bz_cmd.txt → bz_res.txt），额外支持 reload / ver / selfcheck / reset / log / scene
 *   2. XHR 替换（所有方法转发到 globalThis.__BZ_HARNESS__.impl，间接层）
 *   3. 全局错误捕获（window.onerror / unhandledrejection / console.error / cc.error）→ JSONL 日志
 *   4. 场景变化记录 + ready 标记文件（bz_ready.json）
 *   5. 从 <writable>/hotfix/live/handlers.js 载入策略层，可 reload 热替换
 *
 * 契约：handlers.js 通过 new Function('bz', src) 求值，必须 return
 *   { version, handle(req) -> {status,text,meta}, selfCheck() -> {ok,...}, reset() }
 * 任何异常都不得阻断引擎加载。
 */
;(function () {
  'use strict';
  if (window.__BZ_BOOT__) return;

  var BOOT_VER = 'boot-2';
  var H = {
    bootVer: BOOT_VER, implVer: '(none)', flowVer: '(none)', impl: null, flow: null,
    implError: null, flowError: null,
    startedAt: Date.now(), logBuf: [], rpc: 0, scene: '', filesReady: false,
  };
  window.__BZ_BOOT__ = H;
  window.__BZ_HARNESS__ = H;

  var utils = null, DIR = '';
  function consoleLine(s) { try { console.log('[BZ] ' + s); } catch (e) {} }

  // ---------- 日志：JSONL 全量落盘 + 内存环形 ----------
  function log(rec) {
    var e = { t: Date.now(), boot: BOOT_VER, impl: H.implVer, flow: H.flowVer };
    if (rec && typeof rec === 'object') { for (var k in rec) if (rec.hasOwnProperty(k)) e[k] = rec[k]; }
    else e.msg = String(rec);
    H.logBuf.push(e);
    if (H.logBuf.length > 400) H.logBuf.shift();
    try { if (FILE_LOG) utils.writeStringToFile(H.logBuf.map(function (x) { return JSON.stringify(x); }).join('\n') + '\n', FILE_LOG); } catch (_) {}
    if (e.kind !== 'xhr') consoleLine(JSON.stringify(e));
  }
  var FILE_LOG = '';

  // ---------- 策略层 API（交给 handlers.js） ----------
  function api() {
    return {
      bootVer: BOOT_VER,
      now: function () { return Date.now(); },
      log: function (m) { log({ kind: 'impl', msg: String(m) }); },
      readFile: function (p) {
        try { return (utils && utils.isFileExist(p)) ? utils.getStringFromFile(p) : null; } catch (e) { return null; }
      },
      writeFile: function (p, t) {
        try { utils.writeStringToFile(String(t), p); return true; } catch (e) { log({ kind: 'err', msg: 'writeFile 失败 ' + p + ': ' + e }); return false; }
      },
      exists: function (p) { try { return !!(utils && utils.isFileExist(p)); } catch (e) { return false; } },
      remove: function (p) { try { return !!(utils && utils.removeFile && utils.removeFile(p)); } catch (e) { return false; } },
      codec: window.__BZ_CODEC__,
      dir: DIR,
      savePath: DIR + 'bz_offline_save.json',
      handlersPath: DIR + 'hotfix/live/handlers.js',
    };
  }

  // ---------- 载入 / 热替换策略层 ----------
  var HANDLERS = '';
  var HANDLERS_FALLBACK = ['hotfix/live/handlers.js', 'hotfix/handlers.js'];

  function loadImpl() {
    var lastErr = null;
    for (var i = 0; i < HANDLERS_FALLBACK.length; i++) {
      var p = DIR + HANDLERS_FALLBACK[i];
      var src = api().readFile(p);
      if (!src) { lastErr = lastErr || ('handlers.js 不存在: ' + p); continue; }
      try {
        var f = new Function('bz', src);
        var impl = f(api());
        if (!impl || typeof impl.handle !== 'function') throw new Error('impl 契约不符（缺 handle）');
        H.impl = impl;
        H.implVer = String(impl.version || '?');
        H.implError = null;
        HANDLERS = p;
        return impl;
      } catch (e) { lastErr = String(e && e.stack ? e.stack : e); }
    }
    H.implError = lastErr;
    throw new Error(lastErr || 'handlers 载入失败');
  }

  // ---------- 载入 / 热替换流程层（flow.js：自动登录/建档/进场景） ----------
  function hash32(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) | 0;
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }

  function loadFlow() {
    var p = DIR + 'hotfix/live/flow.js';
    var src = api().readFile(p);
    if (!src) { H.flowError = 'flow.js 不存在: ' + p; H.flow = null; H.flowVer = '(none)'; return null; }
    var f = new Function('bz', src);
    var flow = f(api());
    if (!flow || typeof flow.onTick !== 'function') throw new Error('flow 契约不符（缺 onTick）');
    H.flow = flow;
    H.flowVer = 'f' + hash32(src);
    H.flowError = null;
    return flow;
  }

  // ---------- 错误捕获 ----------
  function installErrorCapture() {
    try {
      var prev = window.onerror;
      window.onerror = function (msg, src, line, col, err) {
        log({ kind: 'err', src: 'window.onerror', msg: String(msg), file: String(src || ''), line: line, col: col, stack: err && err.stack ? String(err.stack).slice(0, 1500) : null });
        if (typeof prev === 'function') { try { return prev.apply(this, arguments); } catch (e) {} }
        return false;
      };
      if (window.addEventListener) {
        window.addEventListener('unhandledrejection', function (e) {
          var r = e && e.reason;
          log({ kind: 'err', src: 'unhandledrejection', msg: String(r && r.message ? r.message : r), stack: r && r.stack ? String(r.stack).slice(0, 1500) : null });
        });
      }
      var ce = console.error;
      console.error = function () {
        try { log({ kind: 'err', src: 'console.error', msg: Array.prototype.map.call(arguments, function (a) { return String(a); }).join(' ').slice(0, 800) }); } catch (e) {}
        if (typeof ce === 'function') { try { return ce.apply(console, arguments); } catch (e) {} }
      };
      if (window.cc && typeof cc.error === 'function') {
        var cce = cc.error;
        cc.error = function () {
          try { log({ kind: 'err', src: 'cc.error', msg: Array.prototype.map.call(arguments, function (a) { return String(a); }).join(' ').slice(0, 800) }); } catch (e) {}
          return cce.apply(cc, arguments);
        };
      }
    } catch (e) { consoleLine('installErrorCapture 异常: ' + e); }
  }

  // ---------- XHR 替换（无条件，尽早） ----------
  function installXHR() {
    try {
      if (typeof window.createBzXHRClass !== 'function') { consoleLine('bz-xhr 未加载'); return; }
      window.XMLHttpRequest = window.createBzXHRClass(
        function () { return H.impl; },
        function (m) { log({ kind: 'xhr', msg: String(m) }); }
      );
      log({ kind: 'info', msg: 'XMLHttpRequest → 进程内环回（间接层 __BZ_HARNESS__.impl）' });
    } catch (e) { consoleLine('installXHR 异常: ' + e); }
  }

  // ---------- 命令通道 ----------
  function installCommandChannel() {
    var cmdPath = DIR + 'bz_cmd.txt', resPath = DIR + 'bz_res.txt', seqPath = DIR + 'bz_res_seq.txt';
    function reply(t) { try { utils.writeStringToFile(String(t) + '\n<<DONE>>', resPath); } catch (e) {} }
    function trunc(v) {
      var s;
      try { s = typeof v === 'string' ? v : JSON.stringify(v); } catch (e) { s = String(v); }
      if (s === undefined) s = String(v);
      return s.length > 4000 ? s.slice(0, 4000) + '...<truncated>' : s;
    }
    function exec(cmd) {
      cmd = String(cmd || '').trim();
      if (!cmd) return 'EMPTY';
      var m = cmd.match(/^(\w+):([\s\S]*)$/);
      var op = m ? m[1] : cmd, arg = m ? m[2] : '';
      try {
        if (op === 'keys') {
          var out = [];
          Object.getOwnPropertyNames(window).forEach(function (k) {
            var t; try { t = typeof window[k]; } catch (e) { t = '?'; }
            out.push(k + ':' + t);
          });
          return out.join('\n');
        }
        if (op === 'ver') return JSON.stringify({ boot: H.bootVer, impl: H.implVer, flow: H.flowVer, rpc: H.rpc, scene: H.scene, implErr: H.implError && String(H.implError).slice(0, 200), flowErr: H.flowError && String(H.flowError).slice(0, 200) });
        if (op === 'reload') {
          var t0 = Date.now();
          var res = { ok: true, impl: H.implVer, flow: H.flowVer, ms: 0 };
          try {
            var sc = null;
            loadImpl();
            res.impl = H.implVer;
            if (H.impl.selfCheck) sc = H.impl.selfCheck();
            try { loadFlow(); res.flow = H.flowVer; } catch (e2) { res.flowError = String(e2); }
            res.ms = Date.now() - t0;
            res.selfCheck = sc;
            log({ kind: 'reload', impl: H.implVer, flow: H.flowVer, ok: true, ms: res.ms });
            return JSON.stringify(res);
          } catch (e) {
            log({ kind: 'reload', ok: false, err: String(e) });
            return 'ERR reload: ' + (e && e.stack ? e.stack : e);
          }
        }
        if (op === 'selfcheck') return trunc(H.impl && H.impl.selfCheck ? H.impl.selfCheck() : 'no impl');
        if (op === 'reset') return trunc(H.impl && H.impl.reset ? H.impl.reset() : 'no impl');
        if (op === 'state') return trunc(H.impl && H.impl.state ? H.impl.state() : 'no impl');
        if (op === 'log') return trunc(H.logBuf.slice(-(parseInt(arg, 10) || 20)));
        if (op === 'scene') {
          var sc2 = window.cc && cc.director && cc.director.getScene();
          return trunc(sc2 ? sc2.name : 'null');
        }
        if (op === 'get' || op === 'call') return trunc(eval(arg));
        if (op === 'dump') {
          var o = eval(arg), lines = [];
          Object.keys(o || {}).forEach(function (k) {
            var t; try { t = typeof o[k]; } catch (e) { t = '?'; }
            var v; try { v = t === 'function' ? '[fn]' : String(o[k]).slice(0, 80); } catch (e) { v = '?'; }
            lines.push(k + ' (' + t + ') = ' + v);
          });
          return lines.join('\n');
        }
        if (op === 'eval') { eval(arg); return 'OK'; }
        return 'UNKNOWN_OP ' + op;
      } catch (e) { return 'ERR ' + (e && e.stack ? e.stack : e); }
    }
    // 启动时丢弃上一次会话残留的命令文件（坑 29：残留命令会在每次启动时重放，
    // 上一条探针若是死循环，就会连续 ANR，看着像"游戏自己崩"）。
    // 策略：残留内容搬到 bz_cmd.stale.txt 留档 + 删除原文件；只有本次启动之后写入的命令才会被执行。
    (function discardStaleCmd() {
      try {
        if (!utils.isFileExist(cmdPath)) return;
        var stale = '';
        try { stale = String(utils.getStringFromFile(cmdPath) || ''); } catch (e) {}
        try { utils.writeStringToFile(stale, DIR + 'bz_cmd.stale.txt'); } catch (e) {}
        try { utils.removeFile(cmdPath); } catch (e) {}
        var still = false;
        try { still = utils.isFileExist(cmdPath); } catch (e) {}
        log({ kind: 'info', msg: '启动时丢弃残留命令（' + stale.length + 'B，' + (still ? '删除失败' : '已删除') + '，内容已留档 bz_cmd.stale.txt）：' + stale.slice(0, 200) });
      } catch (e) {}
    })();

    setInterval(function () {
      var c = null;
      try { c = utils.isFileExist(cmdPath) ? utils.getStringFromFile(cmdPath) : null; } catch (e) {}
      if (c === null) return;
      try { utils.removeFile(cmdPath); } catch (e) {}
      // 删不掉就绝不再执行：否则文件留在盘上，这个 700ms 定时器会无限重放同一条命令
      var stubborn = false;
      try { stubborn = utils.isFileExist(cmdPath); } catch (e) {}
      if (stubborn) {
        try { utils.writeStringToFile('', cmdPath); } catch (e) {}
        if (!H._cmdStubbornAt || Date.now() - H._cmdStubbornAt > 5000) {
          H._cmdStubbornAt = Date.now();
          log({ kind: 'err', src: 'cmd', msg: '命令文件删不掉，已拒绝执行（避免定时器重放）：' + String(c).slice(0, 200) });
        }
        return;
      }
      reply(exec(c));
      try { utils.writeStringToFile(String(Date.now()), seqPath); } catch (e) {}
    }, 700);
    log({ kind: 'info', msg: '命令通道就绪 ' + cmdPath + ' → ' + resPath });
  }

  // ---------- 场景观察 + 就绪标记 ----------
  function startSceneWatch() {
    setInterval(function () {
      try {
        var sc = window.cc && cc.director && cc.director.getScene();
        if (sc && sc.name !== H.scene) {
          H.scene = sc.name;
          log({ kind: 'scene', name: sc.name });
          markReady('scene:' + H.scene);
        }
        if (sc && H.flow) {
          try {
            var r = H.flow.onTick(sc, api());
            if (r) log({ kind: 'flow', msg: String(r).slice(0, 300) });
          } catch (e) {
            if (!H._flowErrAt || Date.now() - H._flowErrAt > 3000) {
              H._flowErrAt = Date.now();
              log({ kind: 'err', src: 'flow', msg: String(e && e.message ? e.message : e), stack: e && e.stack ? String(e.stack).slice(0, 800) : null });
            }
          }
        }
      } catch (e) {}
    }, 500);
  }

  function markReady(why) {
    try {
      api().writeFile(DIR + 'bz_ready.json', JSON.stringify({ t: Date.now(), boot: H.bootVer, impl: H.implVer, flow: H.flowVer, scene: H.scene, why: why }));
    } catch (e) {}
  }

  // ---------- 等文件系统就绪后初始化 ----------
  function initFiles() {
    utils = window.jsb && jsb.fileUtils;
    if (!utils) return false;
    DIR = utils.getWritablePath();
    FILE_LOG = DIR + 'bz_log.jsonl';
    H.filesReady = true;
    log({ kind: 'info', msg: 'bootstrap ' + BOOT_VER + ' 文件系统就绪 ' + DIR });
    try { loadImpl(); log({ kind: 'info', msg: '策略层载入 ' + H.implVer }); }
    catch (e) { log({ kind: 'err', msg: '策略层载入失败: ' + e }); }
    try { loadFlow(); log({ kind: 'info', msg: '流程层载入 ' + H.flowVer }); }
    catch (e) { log({ kind: 'err', msg: '流程层载入失败: ' + e }); }
    installCommandChannel();
    startSceneWatch();
    markReady('boot');
    return true;
  }

  // XHR 与错误捕获不依赖文件系统，立刻装；文件相关等 jsb 就绪（100ms 轮询，最多 30s）
  installErrorCapture();
  installXHR();
  try { FILE_LOG = ''; } catch (e) {}

  var tries = 0;
  (function waitFs() {
    try { if (initFiles()) return; } catch (e) { consoleLine('initFiles 异常: ' + e); }
    if (++tries > 300) { consoleLine('等 jsb.fileUtils 超时（30s），文件相关功能不可用'); return; }
    setTimeout(waitFs, 100);
  })();

  consoleLine('bootstrap ' + BOOT_VER + ' 安装完成');
})();
