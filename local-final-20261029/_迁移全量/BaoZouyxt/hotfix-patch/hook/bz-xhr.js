/* bz-xhr —— 进程内环回 XHR（纯传输层）
 *
 * 设计约束（来自"机制/策略分离"）：本文件只负责 XHR 语义，不含任何业务应答逻辑。
 * 每次 send 都通过 getImpl() 动态取当前实现，因此替换 impl 对已存在的实例同样生效。
 * XHR 一致性对齐规范：OPENED→HEADERS_RECEIVED→LOADING→DONE 会逐个触发 readystatechange，
 * 且 on<event> 属性、addEventListener 两种注册方式都会收到事件。
 */
;(function (root) {
  'use strict';

  function createBzXHRClass(getImpl, log) {
    log = log || function () {};

    function mkEvent(self, name) {
      return { type: name, target: self, currentTarget: self };
    }

    /** 客户端回调抛错时，把调用栈里那几帧的“函数源码”抓出来
     *  （V8 支持 Error.prepareStackTrace → CallSite.getFunction() → String(fn)）
     *  这样不用猜字段名，直接读消费端代码。 */
    function reportHandlerError(name, err) {
      log('事件回调异常(' + name + '): ' + err);
      var frames = null;
      try {
        var prev = Error.prepareStackTrace;
        Error.prepareStackTrace = function (er, s) { frames = s; return ''; };
        void err.stack;
        Error.prepareStackTrace = prev || null;
      } catch (e2) { try { Error.prepareStackTrace = null; } catch (e3) {} }
      if (!frames) return;
      var shown = 0;
      for (var i = 0; i < frames.length && shown < 3; i++) {
        var f = null, fnName = '?', loc = '?';
        try { f = frames[i].getFunction(); } catch (e) {}
        try { fnName = frames[i].getFunctionName() || '(anon)'; } catch (e) {}
        try { loc = frames[i].getFileName() + ':' + frames[i].getLineNumber(); } catch (e) {}
        if (!f) { log('frame ' + i + ' ' + fnName + ' @ ' + loc + ' (no fn ref)'); continue; }
        shown++;
        var src = '';
        try { src = String(f); } catch (e) { src = '?'; }
        log('frame ' + i + ' ' + fnName + ' @ ' + loc + ' SRC>>> ' + src.slice(0, 4000));
      }
    }

    function BzXHR() {
      var self = this;
      this.readyState = 0; this.status = 0; this.statusText = '';
      this.response = ''; this.responseText = ''; this.responseType = '';
      this.responseURL = ''; this.responseXML = null;
      this.timeout = 0; this.withCredentials = false;
      this.onreadystatechange = null; this.onload = null; this.onerror = null;
      this.onabort = null; this.ontimeout = null; this.onloadend = null; this.onprogress = null;
      this._listeners = {}; this._headers = {};
      this._method = 'GET'; this._url = ''; this._aborted = false; this._failed = false;

      function fire(name) {
        var e = mkEvent(self, name);
        var hs = [];
        try { if (typeof self['on' + name] === 'function') hs.push(self['on' + name]); } catch (err) {}
        var a = self._listeners[name];
        if (a) for (var i = 0; i < a.length; i++) hs.push(a[i]);
        for (var j = 0; j < hs.length; j++) {
          try { hs[j].call(self, e); } catch (err) { reportHandlerError(name, err); }
        }
      }
      this._fire = fire; // 供测试/调试

      this.open = function (method, url) {
        self._method = String(method || 'GET').toUpperCase();
        self._url = String(url == null ? '' : url);
        self._headers = {}; self._aborted = false; self._failed = false;
        self.status = 0; self.statusText = ''; self.responseText = ''; self.response = '';
        self.readyState = 1; fire('readystatechange');
      };
      this.setRequestHeader = function (k, v) { self._headers[String(k).toLowerCase()] = String(v); };
      this.getAllResponseHeaders = function () { return 'content-type: application/json\r\n'; };
      this.getResponseHeader = function (k) {
        return /^content-type$/i.test(String(k)) ? 'application/json' : null;
      };
      this.overrideMimeType = function () {};
      this.addEventListener = function (n, f) { (self._listeners[n] = self._listeners[n] || []).push(f); };
      this.removeEventListener = function (n, f) {
        var a = self._listeners[n] || []; var i = a.indexOf(f); if (i >= 0) a.splice(i, 1);
      };
      this.abort = function () {
        self._aborted = true; self.status = 0; self.readyState = 4; fire('abort'); fire('loadend');
      };

      this.send = function (body) {
        if (self._aborted) return;
        var t0 = Date.now();
        var req = {
          method: self._method, url: self._url,
          body: body === undefined ? null : body,
          headers: self._headers, t: t0,
        };
        var res = null;
        try {
          var impl = getImpl();
          if (!impl || typeof impl.handle !== 'function') throw new Error('impl 未就绪');
          res = impl.handle(req) || {};
        } catch (e) {
          self._failed = true;
          log('ERR impl.handle 异常: ' + (e && e.stack ? e.stack : e));
          res = { status: 500, statusText: 'IMPL ERROR', text: JSON.stringify({ error: String(e && e.message ? e.message : e) }) };
        }        var deliver = function () {
          if (self._aborted) return;
          var dt = Date.now() - t0;
          self.status = res.status || 200;
          self.statusText = res.statusText || (self._failed ? 'IMPL ERROR' : 'OK');
          self.responseText = res.text == null ? '' : String(res.text);
          self.response = self.responseText;
          self.responseURL = self._url;
          self.readyState = 2; fire('readystatechange');
          self.readyState = 3; fire('readystatechange');
          self.readyState = 4; fire('readystatechange');
          if (self._failed) { fire('error'); fire('loadend'); return; }
          try { fire('progress'); } catch (e) {}
          fire('load'); fire('loadend');
          if (res.meta) { try { log('xhr ' + (res.meta.action || '?') + ' ' + dt + 'ms ' + (res.text || '').length + 'B'); } catch (e) {} }
        };
        if (typeof setTimeout === 'function') setTimeout(deliver, 0); else deliver();
      };
    }

    BzXHR.UNSENT = 0; BzXHR.OPENED = 1; BzXHR.HEADERS_RECEIVED = 2; BzXHR.LOADING = 3; BzXHR.DONE = 4;
    return BzXHR;
  }

  root.createBzXHRClass = createBzXHRClass;
  if (typeof module !== 'undefined' && module.exports) module.exports = { createBzXHRClass: createBzXHRClass };
})(typeof window !== 'undefined' ? window : this);
