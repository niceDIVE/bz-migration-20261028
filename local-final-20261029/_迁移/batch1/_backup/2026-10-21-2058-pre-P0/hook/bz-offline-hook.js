/* =====================================================================
 * bz-offline-hook v1-probe —— 前置于 jsb-adapter/jsb-engine.js
 *
 * 职责（按 PROBE_MODE 两档）：
 *   PROBE_MODE = true（默认）：
 *     A. 运行时 dump window._CCSettings（原生层已解密的明文）→ adb logcat 可见
 *     B. 透明包装 XMLHttpRequest.prototype.open/send → 记录游戏真实流量形态
 *        （只记录，不拦截，游戏行为完全不变）
 *   PROBE_MODE = false（探针确认后启用）：
 *     C. XMLHttpRequest 全量环回：{mod,do,p} → bz-rpc-core 本地应答，零网络
 *
 * 安全底线：本文件所有逻辑包 try/catch，任何异常都不能阻断引擎加载。
 * ===================================================================== */
;(function () {
  if (window.__BZ_OFFLINE__) return;
  window.__BZ_OFFLINE__ = { version: 'v1-probe', bootedAt: new Date().toISOString() };

  var TAG = '[BZ-OFFLINE]';
  function log(m) { try { console.log(TAG + ' ' + m); } catch (e) {} }

  var PROBE_MODE = true; // build 脚本会按需要替换此值

  // ---------- A. 运行时 dump 设置对象 ----------
  function dumpSettings() {
    try {
      var s = window._CCSettings;
      if (!s) { log('settings: _CCSettings 不存在（加载时机未到或字段名不同）'); return; }
      log('settings keys: ' + Object.keys(s).join(','));
      log('settings.server = ' + JSON.stringify(s.server));
      log('settings.jsList = ' + JSON.stringify(s.jsList));
      log('settings.launchScene = ' + JSON.stringify(s.launchScene));
      log('settings.bundleVers = ' + JSON.stringify(s.bundleVers));
      log('settings.remoteBundles = ' + JSON.stringify(s.remoteBundles));
      log('settings.hasResourcesBundle = ' + s.hasResourcesBundle);
    } catch (e) { log('dumpSettings 异常: ' + e); }
  }
  dumpSettings();

  // ---------- B. 透明探针：记录游戏真实 XHR 流量 ----------
  // logcat 单条消息 ~4000 字符上限，长报文按 2800 字符分片
  function logLong(prefix, text) {
    try {
      var s = String(text);
      var total = Math.ceil(s.length / 2800);
      for (var i = 0; i < total; i++) {
        log(prefix + '[' + (i + 1) + '/' + total + '] ' + s.slice(i * 2800, (i + 1) * 2800));
      }
    } catch (e) { log(prefix + ' (记录失败: ' + e + ')'); }
  }

  // ---------- B2. 文件级捕获：报文全量落盘（不受 logcat 截断限制） ----------
  var CAP = { seq: 0, dir: null };
  function initCaptureDir() {
    try {
      if (!(window.jsb && jsb.fileUtils)) return false;
      if (!CAP.dir) {
        CAP.dir = jsb.fileUtils.getWritablePath() + 'bz_capture/';
        try { jsb.fileUtils.createDirectory(CAP.dir); } catch (e) {}
      }
      return true;
    } catch (e) { return false; }
  }
  function capSave(kind, url, text) {
    try {
      if (!initCaptureDir()) return;
      CAP.seq += 1;
      var safe = url.replace(/[^\w]/g, '_').slice(-60);
      var file = CAP.dir + ('000' + CAP.seq).slice(-4) + '_' + kind + '_' + safe + '.txt';
      jsb.fileUtils.writeStringToFile(text, file);
    } catch (e) { log('capSave 失败: ' + e); }
  }

  function installProbe() {
    try {
      var X = window.XMLHttpRequest;
      if (!X || !X.prototype) { log('probe: XMLHttpRequest 尚不存在，跳过'); return; }
      if (X.prototype.__bzPatched) return;
      var oOpen = X.prototype.open, oSend = X.prototype.send;
      X.prototype.open = function (method, url) {
        this.__bzReq = { method: method, url: String(url), sentAt: Date.now() };
        return oOpen.apply(this, arguments);
      };
      X.prototype.send = function (body) {
        var r = this.__bzReq || { method: '?', url: '?' };
        try {
          var b = body === undefined || body === null ? '(null)' : String(body);
          capSave('REQ', r.url, r.method + ' ' + r.url + '\n' + b);
          logLong('XHR ' + r.method + ' ' + r.url + ' body{', b + '}');
        } catch (e) { log('XHR body 记录失败: ' + e); }
        this.addEventListener('load', function () {
          try {
            var resp = this.responseText;
            capSave('RESP', r.url, 'status=' + this.status + ' ' + r.url + '\n' + (resp || ''));
            logLong('XHR-RESP ' + r.url + ' status=' + this.status + ' body{', (resp || '') + '}');
          } catch (e) {}
        });
        return oSend.apply(this, arguments);
      };
      X.prototype.__bzPatched = true;
      log('probe: XHR 探针已挂（全量记录模式）');
    } catch (e) { log('installProbe 异常: ' + e); }
  }
  installProbe();

  // ---------- C. 环回模式（真协议版） ----------
  function installLoopback() {
    try {
      if (!window.createBzServer) { log('loopback: bz-rpc-server 未加载，跳过'); return; }
      var codec = window.__BZ_CODEC__;
      if (!codec) { log('loopback: 编解码器不可用，跳过'); return; }
      var utils = (window.jsb && jsb.fileUtils) ? jsb.fileUtils : null;
      var savePath = utils ? (utils.getWritablePath() + 'bz_offline_save.json') : null;
      var env = {
        now: function () { return Date.now(); },
        log: log,
        templates: window.__BZ_TPL__ || {},
        readSave: function () {
          if (!utils || !savePath || !utils.isFileExist(savePath)) return null;
          try { return utils.getStringFromFile(savePath); } catch (e) { return null; }
        },
        writeSave: function (key, text) {
          if (!utils || !savePath) return;
          try { utils.writeStringToFile(text, savePath); } catch (e) { log('写档失败: ' + e); }
        },
      };
      var server = createBzServer(env);
      window.__BZ_OFFLINE__.server = server;
      log('loopback: 真协议服务器就绪（存档: ' + savePath + '）');

      /** 游戏世界 RPC：hex → {mod,do,p} → 本地分发 → 响应信封
       *  实测（2026-10-21 抓包）：入口服(:9898) 回 {"MsgData":".."}；
       *  账号/游戏服(bzgf 800-/900-) 回 {"code":200,"MsgData":".."} —— 少了 code 客户端会静默丢弃 */
      function handleGameRpc(body, url) {
        var rpc = null;
        try {
          rpc = JSON.parse(codec.decode(String(body).trim()));
        } catch (e) {
          log('loopback: 报文解密失败 → 黑洞 (' + String(e).slice(0, 60) + ')');
          return '';
        }
        if (!rpc || !rpc.mod || !rpc.do) { log('loopback: 非 RPC 结构 → 黑洞'); return ''; }
        var result = server.dispatch(rpc.mod, rpc.do, rpc.p || {});
        var text = JSON.stringify(result);
        var env = { MsgData: codec.encode(text) };
        var u = String(url || '');
        if (u.indexOf('bzgf') >= 0 || u.indexOf('800-server') >= 0 || u.indexOf('900-server') >= 0) {
          env.code = 200;
        }
        log('loopback RPC ' + rpc.mod + '.' + rpc.do + ' → ' + text.length + 'B' + (env.code ? ' [code]' : ''));
        return JSON.stringify(env);
      }

      function LoopbackXHR() {
        var self = this;
        this.readyState = 0; this.status = 0; this.statusText = '';
        this.responseText = ''; this.response = ''; this.responseType = '';
        this.timeout = 0; this.withCredentials = false;
        this._headers = {}; this._listeners = {}; this._on = {};

        function fire(ev, e) {
          // 兼容三种注册方式：xhr.onxxx = fn / addEventListener / 内部 _on
          var hs = [];
          try { if (typeof self['on' + ev] === 'function') hs.push(self['on' + ev]); } catch (err) {}
          var a = self._on[ev] || self._listeners[ev];
          if (a) { if (Array.isArray(a)) a.forEach(function (f) { hs.push(f); }); else hs.push(a); }
          for (var i = 0; i < hs.length; i++) {
            try { hs[i].call(self, e || { type: ev, target: self }); } catch (err) { log('事件回调异常(' + ev + '): ' + err); }
          }
        }
        this._fire = fire;
        this._setReady = function (st) { self.readyState = st; fire('readystatechange'); };
        this._finish = function (status, text) {
          self.status = status; self.statusText = 'OK';
          self.responseText = text;
          self.response = text;
          self._setReady(4);
          fire('load'); fire('loadend');
        };

        this.open = function (method, url) { self._method = method; self._url = String(url); self._setReady(1); };
        this.setRequestHeader = function (k, v) { self._headers[k] = v; };
        this.getAllResponseHeaders = function () { return 'content-type: application/json\r\n'; };
        this.getResponseHeader = function (k) { return /^content-type$/i.test(k) ? 'application/json' : null; };
        this.overrideMimeType = function () {};
        this.abort = function () { fire('abort'); fire('loadend'); };
        this.addEventListener = function (ev, f) { (self._listeners[ev] = self._listeners[ev] || []).push(f); };
        this.removeEventListener = function (ev, f) {
          var a = self._listeners[ev] || []; var i = a.indexOf(f); if (i >= 0) a.splice(i, 1);
        };
        this.send = function (body) {
          var u = self._url || '';
          var resp = '';
          try {
            if (u.indexOf('/register.php') >= 0) {
              log('loopback: 渠道注册 → success');
              resp = 'success';
            } else if (u.indexOf('notice-server') >= 0) {
              log('loopback: 公告 → 空公告');
              resp = '{"statusCode":200,"data":[]}';
            } else if (u.indexOf(':9898/') >= 0 || u.indexOf('bzgf.maple-game.com') >= 0) {
              resp = handleGameRpc(body, u);
            } else {
              log('loopback: 未知请求 → 黑洞 ' + u.slice(0, 80));
            }
          } catch (e) {
            log('loopback 处理异常: ' + e);
            resp = '';
          }
          var done = function () { self._finish(200, resp); };
          if (typeof setTimeout === 'function') setTimeout(done, 0); else done();
        };
      }
      LoopbackXHR.UNSENT = 0; LoopbackXHR.OPENED = 1;
      LoopbackXHR.HEADERS_RECEIVED = 2; LoopbackXHR.LOADING = 3; LoopbackXHR.DONE = 4;

      var Real = window.XMLHttpRequest;
      if (Real && Real.prototype && Real.prototype.__bzPatched) delete Real.prototype.__bzPatched;
      window.XMLHttpRequest = LoopbackXHR;
      log('loopback: XMLHttpRequest 已切换为进程内真协议环回，零外联');
    } catch (e) { log('installLoopback 异常: ' + e); }
  }

  if (!PROBE_MODE) installLoopback();

  // ---------- D. JsBridge 捕获垫片（SDK→JS 登录回调桥） ----------
  // dex 静态分析实锤：SDK 以 evaluateJavascript 执行
  //   "javascript:if(!!window.JsBridge&&JsBridge.callback(<payload>))"
  // 本垫片用 getter/setter 接管 window.JsBridge：
  //   - 游戏自定义 JsBridge 时先被捕获包装，SDK 调用被透明记录；
  //   - 探针模式下无真实现则吞掉（不影响 UI，但登录流程可能停在此处——这正是要观察的）。
  function installJsBridgeShim() {
    try {
      var _real = null;
      var desc = Object.getOwnPropertyDescriptor(window, 'JsBridge');
      if (desc && 'value' in desc && desc.value) _real = desc.value;
      Object.defineProperty(window, 'JsBridge', {
        configurable: true,
        get: function () {
          // 契约（dex 实锤）: if(!!window.JsBridge&&JsBridge.callback(<payload>))
          // JsBridge 必须是带 callback 方法的【对象】，不能是裸函数
          return {
            callback: function (json) {
              var head = '?';
              try { head = String(json).slice(0, 800); } catch (e) {}
              log('JsBridge.callback payload=' + head);
              if (_real && typeof _real.callback === 'function') {
                try { return _real.callback.apply(null, arguments); } catch (e) { log('真实现回调异常: ' + e); }
              }
              return undefined;
            },
          };
        },
        set: function (v) { _real = v; log('JsBridge 已被游戏定义，垫片转为包装模式'); },
      });
      log('JsBridge shim 已挂（捕获模式）');
    } catch (e) { log('installJsBridgeShim 异常: ' + e); }
  }
  installJsBridgeShim();

  // ---------- E. 全局函数哨兵：捕获 SDK evalString 的回调入口 ----------
  // SDK 通过 Cocos2dxJavascriptJavaBridge.evalString 调用游戏定义的未知全局函数。
  // 哨兵周期性 diff window 上的新函数并记录名字（只观察，不包装，零行为影响）。
  function installGlobalSentinel() {
    try {
      if (typeof setInterval !== 'function') return;
      var base = {};
      try {
        Object.getOwnPropertyNames(window).forEach(function (k) { base[k] = 1; });
      } catch (e) {}
      setInterval(function () {
        try {
          var names = Object.getOwnPropertyNames(window);
          for (var i = 0; i < names.length; i++) {
            var k = names[i];
            if (base[k]) continue;
            base[k] = 1;
            var v;
            try { v = window[k]; } catch (e) { continue; }
            var kind = typeof v;
            if (kind === 'function') {
              log('哨兵: 新全局函数 window.' + k);
            } else if (v && kind === 'object') {
              var ms = [];
              try { Object.keys(v).forEach(function (mk) { if (typeof v[mk] === 'function') ms.push(mk); }); } catch (e) {}
              if (ms.length) log('哨兵: 新全局对象 window.' + k + ' {方法: ' + ms.join(',') + '}');
            }
          }
        } catch (e) {}
      }, 400);
      log('哨兵: 全局函数哨兵已挂（400ms 轮询）');
    } catch (e) { log('installGlobalSentinel 异常: ' + e); }
  }
  installGlobalSentinel();

  // ---------- F. 桥接通道哨兵（惰性挂载）----------
  // Cocos 2.4.9 的 JS→Java 桥（jsb.reflection / jsb.bridge）由 jsb-adapter 在 hook 之后创建，
  // 故轮询等待其出现，并监控桥对象上新增的函数，记录游戏→SDK 的全部调用与返回值。
  function attachBridgeSentinel() {
    var done = {}, ticks = 0;
    function wrapFn(owner, key, label) {
      try {
        var orig = owner[key];
        if (typeof orig !== 'function') return;
        owner[key] = function () {
          var args = [], i;
          for (i = 0; i < arguments.length; i++) {
            var a; try { a = String(arguments[i]); } catch (e) { a = '?'; }
            args.push(a.slice(0, 150));
          }
          var out, err = null;
          try { out = orig.apply(owner, arguments); } catch (e) { err = e; }
          var o; try { o = String(out); } catch (e) { o = '?'; }
          log('桥 ' + label + '(' + args.join(', ') + ')' + (err ? ' 异常=' + err : ' → ' + o.slice(0, 200)));
          if (err) throw err;
          return out;
        };
        log('桥哨兵: 已挂 ' + label);
      } catch (e) { log('桥哨兵: 挂 ' + label + ' 失败 ' + e); }
    }
    var timer = setInterval(function () {
      ticks++;
      try {
        var j = window.jsb;
        if (!j) return;
        ['reflection', 'bridge', 'reflectionInfo'].forEach(function (k) {
          if (done[k] || !j[k]) return;
          done[k] = 1;
          log('桥哨兵: 发现 jsb.' + k);
          Object.keys(j[k]).forEach(function (m) {
            if (typeof j[k][m] === 'function') wrapFn(j[k], m, 'jsb.' + k + '.' + m);
          });
          // 该对象后续新增函数也监控
          var base = {}; Object.keys(j[k]).forEach(function (m) { base[m] = 1; });
          setInterval(function () {
            try {
              Object.keys(j[k]).forEach(function (m) {
                if (base[m]) return; base[m] = 1;
                if (typeof j[k][m] === 'function') wrapFn(j[k], m, 'jsb.' + k + '.' + m + '(新)');
              });
            } catch (e) {}
          }, 1000);
        });
      } catch (e) {}
      if (ticks > 120) clearInterval(timer);
    }, 500);
    log('桥哨兵: 惰性等待 jsb.reflection / jsb.bridge');
  }
  attachBridgeSentinel();

  // ---------- G. 命令通道：从宿主机远程操控运行中的游戏 JS ----------
  // 我方写入 <writable>/bz_cmd.txt，hook 读取并执行，结果写回 <writable>/bz_res.txt。
  // 支持：keys / get:<expr> / call:<expr> / dump:<expr> / eval:<js>
  function installCommandChannel() {
    try {
      var utils = window.jsb && jsb.fileUtils;
      if (!utils) { log('命令通道: fileUtils 不可用'); return; }
      var dir = utils.getWritablePath();
      var cmdPath = dir + 'bz_cmd.txt';
      var resPath = dir + 'bz_res.txt';
      var seqPath = dir + 'bz_res_seq.txt';

      function readCmd() {
        try { return utils.isFileExist(cmdPath) ? utils.getStringFromFile(cmdPath) : null; } catch (e) { return null; }
      }
      function delCmd() {
        try { if (utils.removeFile) utils.removeFile(cmdPath); else if (utils.deleteFile) utils.deleteFile(cmdPath); } catch (e) {}
      }
      function reply(text) {
        try { utils.writeStringToFile(String(text), resPath); } catch (e) {}
      }
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
        var op = m ? m[1] : cmd;
        var arg = m ? m[2] : '';
        try {
          if (op === 'keys') {
            var out = [];
            Object.getOwnPropertyNames(window).forEach(function (k) {
              var t;
              try { t = typeof window[k]; } catch (e) { t = '?'; }
              out.push(k + ':' + t);
            });
            return out.join('\n');
          }
          if (op === 'get') return trunc(eval(arg));
          if (op === 'call') return trunc(eval(arg));
          if (op === 'dump') {
            var o = eval(arg), lines = [];
            Object.keys(o || {}).forEach(function (k) {
              var t;
              try { t = typeof o[k]; } catch (e) { t = '?'; }
              var v;
              try { v = t === 'function' ? '[fn]' : String(o[k]).slice(0, 80); } catch (e) { v = '?'; }
              lines.push(k + ' (' + t + ') = ' + v);
            });
            return lines.join('\n');
          }
          if (op === 'eval') { eval(arg); return 'OK'; }
          return 'UNKNOWN_OP ' + op;
        } catch (e) {
          return 'ERR ' + (e && e.stack ? e.stack : e);
        }
      }

      setInterval(function () {
        var c = readCmd();
        if (c === null) return;
        delCmd();
        reply(exec(c) + '\n<<DONE>>');
        try { utils.writeStringToFile(String(Date.now()), seqPath); } catch (e) {}
      }, 700);
      log('命令通道: 就绪 (' + cmdPath + ' → ' + resPath + ')');
    } catch (e) { log('installCommandChannel 异常: ' + e); }
  }
  installCommandChannel();

  log('hook v1-probe 安装完成 (PROBE_MODE=' + PROBE_MODE + ')');
})();
