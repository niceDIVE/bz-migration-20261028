/* bz-oracle 设备端探针（ES5，进程内运行）
 * 加载方式：在 hook/bz-bootstrap.js 里、业务脚本加载【之前】require/eval 本文件，并在之前设置 window.BZ_ORACLE_CONFIG 覆盖默认值。
 * 不改 APK、不联网；只在 hotfix/oracle/ 下读写文件。
 *
 * 提供：
 *   L0  MessageCenter 监听器异常探针（包 on/off + 扫描已注册监听器）、cc.error/console.error/__errorHandler、提示框文案
 *   L2  dual(req)：执行动作 → 增量路径快照 A → 重建入口 → 全量路径快照 B → 写 case 文件
 *   被动录制：包住我方 handler 入口，正常游玩时每个动作自动落一个 case（含异常、提示、存档前后、快照 A）
 *   命令通道：轮询 hotfix/oracle/cmd.json
 *
 * 标 TODO 的配置项必须按仓库真实符号填写（材料未给出这些符号名）；install() 会把每项是否解析成功写进 oracle/status.json。
 */
(function (root) {
  'use strict';
  var VERSION = 'bz-oracle-probe/1.0';

  function writable() {
    try { return jsb.fileUtils.getWritablePath(); } catch (e) { return ''; }
  }
  var DEFAULTS = {
    dir: writable() + 'hotfix/oracle/',
    savePath: writable() + 'bz_offline_save.json',              // M3 §3：设备存档文件名；TODO 核对实际路径
    pollMs: 500,
    settleMs: 80,                                              // 投递后等待（客户端有 Promise.resolve().then 的延迟分支，M2 USE_ITEM 64812/64822/64847）
    // 符号解析：每项是候选表达式数组，按序尝试，取第一个非空值
    resolve: {
      MessageCenter: ['window.MessageCenter', "window.__require && __require('MessageCenter')", "window.__require && __require('MessageCenter').MessageCenter"], // TODO
      RoleBaseInfo: ['window.RoleBaseInfo', "window.__require && __require('RoleBaseInfo')", "window.__require && __require('RoleBaseInfo').RoleBaseInfo"],     // TODO
      handlerEntry: ['window.BZ && BZ.handle', 'window.__bzHandle'],     // TODO 我方 bz-rpc-server 的分发函数 (req)->应答体
      loadSave: ['window.BZ && BZ.loadSave', 'window.__bzLoadSave'],     // TODO 我方读存档函数 ()->存档对象
      deliver: ['window.BZ && BZ.deliver'],                               // 可选：bz-xhr 把信封交给客户端的函数；缺省时按 index.js:59324-59332 复刻
      toast: []                                                           // TODO 提示框函数路径，如 "window.__require && __require('TipsUI').default"
    },
    toastMethod: 'show',
    // 快照：每个域一个函数，参数 M = 已解析符号表；返回可 JSON 化的纯数据
    snapshot: {
      wallet: function (M) {                                   // M4 §3：eco 子键 → RoleBaseInfo 字段（已证）
        var R = M.RoleBaseInfo; if (!R) return undefined;
        return { coins: R.coins, ptt: R.potentials, gold: R.gold, yuanbao: R.yuanbao, chips: R.chipNum };
      },
      bag: null,     // TODO function(M){ return {itemID:count} }  —— ivch 的消费者是 index.js:64675 的 e.setItem，读同一个模型
      skills: null,  // TODO function(M){ return {skillID:[lv,pgr,brlv]} } —— SkillTable（index.js:119832-119834）
      equips: null   // TODO function(M){ return {uid:[type,num,...]} } —— equipmentDic（index.js:64689）
    },
    // 重建入口：B 路径用哪些动作把客户端从存档全量重建，以及它们重建哪些域
    rebuild: [
      { req: { mod: 'User', do: 'sycnPlayerItemData', p: {} }, domains: ['bag'] }   // 全量 §八：客户端先清空再按 itemObj 重建
      // { req: { mod: 'User', do: 'LoadGame', p: {} }, domains: ['bag','wallet','skills','equips'] }  // 【推断】可能触发切场景，先单独验证
    ],
    passive: true,       // 被动录制
    passiveMax: 2000     // 被动录制最多落多少个文件
  };

  function merge(a, b) {
    var o = {}, k;
    for (k in a) o[k] = a[k];
    for (k in (b || {})) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && typeof a[k] === 'object' && a[k] && !Array.isArray(a[k])) o[k] = merge(a[k], b[k]);
      else o[k] = b[k];
    }
    return o;
  }
  var CFG = merge(DEFAULTS, root.BZ_ORACLE_CONFIG);
  var M = {};            // 已解析符号
  var status = { version: VERSION, resolved: {}, l0: { mode: 'none', wrappedOn: false, scanned: 0 }, errors: [] };
  var errors = [];       // L0 异常环形缓冲
  var toasts = [];
  var seq = 0, passiveCount = 0, inDual = false;

  // ---------- 文件 ----------
  function fu() { try { return jsb.fileUtils; } catch (e) { return null; } }
  function ensureDir(d) { var f = fu(); if (f && !f.isDirectoryExist(d)) f.createDirectory(d); }
  function writeJSON(p, v) { var f = fu(); if (!f) return false; ensureDir(p.replace(/[^\/]+$/, '')); return f.writeStringToFile(JSON.stringify(v), p); }
  function readText(p) { var f = fu(); if (!f || !f.isFileExist(p)) return null; return f.getStringFromFile(p); }
  function now() { return Date.now(); }
  function safeClone(v) { try { return JSON.parse(JSON.stringify(v)); } catch (e) { return { __unserializable: String(e) }; } }

  // ---------- 符号解析 ----------
  function evalExpr(expr) {
    try { /* jshint evil:true */ return (new Function('return (' + expr + ');'))(); } catch (e) { return undefined; }
  }
  function unwrap(v, name) {
    if (!v) return v;
    if (v.default && typeof v.default === 'object' && !v.dispatch && !v.coins) return v.default;
    if (v[name]) return v[name];
    return v;
  }
  function resolveAll() {
    var k, i, list, v;
    for (k in CFG.resolve) {
      list = CFG.resolve[k] || []; v = undefined;
      for (i = 0; i < list.length && !v; i++) { v = evalExpr(list[i]); if (v) status.resolved[k] = list[i]; }
      M[k] = (k === 'MessageCenter' || k === 'RoleBaseInfo') ? unwrap(v, k) : v;
      if (!v) status.resolved[k] = null;
    }
  }

  // ---------- L0 ----------
  function record(kind, evt, e) {
    var item = { t: now(), kind: kind, event: evt == null ? null : String(evt), msg: e && e.message ? e.message : String(e), stack: e && e.stack ? String(e.stack).slice(0, 2000) : null };
    errors.push(item);
    if (errors.length > 5000) errors.splice(0, errors.length - 5000);
  }
  function wrapFn(evt, fn) {
    if (typeof fn !== 'function') return fn;
    if (fn.__bzOracleWrap) return fn.__bzOracleWrap;
    var w = function () {
      try { return fn.apply(this, arguments); }
      catch (e) { record('listener', evt, e); throw e; }   // 原样抛出，不改变客户端行为
    };
    w.__bzOracleOrig = fn;
    try { Object.defineProperty(fn, '__bzOracleWrap', { value: w, enumerable: false }); } catch (e) { fn.__bzOracleWrap = w; }
    return w;
  }
  function installL0() {
    var MC = M.MessageCenter;
    if (MC && typeof MC.on === 'function' && !MC.__bzOracle) {
      var on0 = MC.on, off0 = MC.off;
      MC.on = function (evt, fn, target) { var a = [].slice.call(arguments); a[1] = wrapFn(evt, fn); return on0.apply(this, a); };
      if (typeof off0 === 'function') MC.off = function (evt, fn, target) { var a = [].slice.call(arguments); if (fn && fn.__bzOracleWrap) a[1] = fn.__bzOracleWrap; return off0.apply(this, a); };
      MC.__bzOracle = true;
      status.l0.wrappedOn = true;
      // 扫描已注册的监听器（探针晚于业务脚本加载时）：启发式找 {evt:[{fn|callback|handler|func}]} 结构
      var n = 0, k, store, e2, arr, j, it, f;
      for (k in MC) {
        store = MC[k];
        if (!store || typeof store !== 'object' || Array.isArray(store)) continue;
        for (e2 in store) {
          arr = store[e2];
          if (!Array.isArray(arr)) continue;
          for (j = 0; j < arr.length; j++) {
            it = arr[j];
            if (typeof it === 'function') { arr[j] = wrapFn(e2, it); n++; continue; }
            if (!it || typeof it !== 'object') continue;
            for (f in { fn: 1, callback: 1, handler: 1, func: 1, cb: 1, listener: 1 }) if (typeof it[f] === 'function') { it[f] = wrapFn(e2, it[f]); n++; }
          }
        }
      }
      status.l0.scanned = n;
      status.l0.mode = 'wrap-on' + (n ? '+scan' : '');
    }
    // 全局错误面
    try { if (root.cc && typeof cc.error === 'function' && !cc.error.__bz) { var ce = cc.error; cc.error = function () { record('cc.error', null, [].join.call(arguments, ' ')); return ce.apply(this, arguments); }; cc.error.__bz = 1; } } catch (e) {}
    try { if (root.console && !console.error.__bz) { var co = console.error; console.error = function () { record('console.error', null, [].join.call(arguments, ' ')); return co.apply(this, arguments); }; console.error.__bz = 1; } } catch (e) {}
    try { var eh = root.__errorHandler; root.__errorHandler = function (file, line, msg, stack) { record('__errorHandler', file + ':' + line, { message: msg, stack: stack }); if (eh) return eh.apply(this, arguments); }; } catch (e) {}
    // 提示框
    if (M.toast && typeof M.toast[CFG.toastMethod] === 'function' && !M.toast.__bz) {
      var t0 = M.toast[CFG.toastMethod];
      M.toast[CFG.toastMethod] = function (text) { toasts.push({ t: now(), text: String(text) }); return t0.apply(this, arguments); };
      M.toast.__bz = 1;
    }
  }

  // ---------- 快照 ----------
  function snapshot(domains) {
    var out = {}, d;
    for (d in CFG.snapshot) {
      if (domains && domains.indexOf(d) < 0) continue;
      if (typeof CFG.snapshot[d] !== 'function') continue;
      try { var v = CFG.snapshot[d](M); if (v !== undefined) out[d] = safeClone(v); }
      catch (e) { record('snapshot', d, e); }
    }
    return out;
  }

  // ---------- 投递 ----------
  function deliver(env) {
    if (typeof M.deliver === 'function') return M.deliver(env);
    var MC = M.MessageCenter, I = env.p, body = env[I], E;
    if (!MC || !I || !body) throw new Error('deliver: 缺 MessageCenter 或信封不完整');
    if (body.note) for (E in body.note) MC.dispatch(E, body.note[E]);  // index.js:59325
    MC.dispatch(I, body);                                                // index.js:59332
  }
  function handle(req) {
    if (typeof M.handlerEntry !== 'function') throw new Error('handlerEntry 未解析（配置 resolve.handlerEntry）');
    return M.handlerEntry(req);
  }
  function loadSave() { return typeof M.loadSave === 'function' ? safeClone(M.loadSave()) : null; }
  function later(ms, f) { setTimeout(f, ms); }
  function thenable(v, f) { if (v && typeof v.then === 'function') v.then(f, function (e) { f(undefined, e); }); else f(v); }

  // ---------- L2 dual ----------
  function dual(req, cb) {
    if (inDual) return cb({ error: 'busy' });
    inDual = true;
    var c = { id: 'dual.' + req.do + '.' + now() + '.' + (++seq), action: (req.mod || 'User') + '.' + req.do, req: req, probe: { mode: status.l0.mode, version: VERSION } };
    var e0 = errors.length, t0 = toasts.length;
    try {
      c.saveBefore = loadSave();
      c.snap0 = snapshot();
    } catch (e) { record('dual', 'before', e); }
    var r;
    try { r = handle(req); } catch (e) { inDual = false; return cb({ error: 'handler threw: ' + e.message }); }
    thenable(r, function (resp) {
      c.resp = safeClone(resp);
      c.envelope = { error: 0, p: c.action }; c.envelope[c.action] = c.resp;
      try { deliver(c.envelope); } catch (e) { record('deliver', c.action, e); }
      later(CFG.settleMs, function () {
        c.snapA = snapshot();
        c.saveAfter = loadSave();
        // B 路径：逐个重建入口
        var steps = CFG.rebuild.slice(), snapB = {};
        (function next() {
          if (!steps.length) {
            c.snapB = snapB;
            c.exceptions = errors.slice(e0);
            c.toasts = toasts.slice(t0);
            inDual = false;
            var file = CFG.dir + 'cases/' + c.id + '.json';
            writeJSON(file, c);
            return cb({ ok: true, file: file, exceptions: c.exceptions.length });
          }
          var st = steps.shift(), rr;
          try { rr = handle(st.req); } catch (e) { record('rebuild', st.req.do, e); return next(); }
          thenable(rr, function (resp2) {
            var p2 = (st.req.mod || 'User') + '.' + st.req.do, env2 = { error: 0, p: p2 }; env2[p2] = resp2;
            try { deliver(env2); } catch (e) { record('deliver', p2, e); }
            later(CFG.settleMs, function () { var s = snapshot(st.domains), d; for (d in s) snapB[d] = s[d]; next(); });
          });
        })();
      });
    });
  }

  // ---------- 被动录制 ----------
  function installPassive() {
    if (!CFG.passive || typeof M.handlerEntry !== 'function' || M.handlerEntry.__bzOracle) return;
    var h0 = M.handlerEntry;
    var wrapped = function (req) {
      if (inDual || passiveCount >= CFG.passiveMax) return h0.apply(this, arguments);
      var c = { id: 'live.' + (req && req.do) + '.' + now() + '.' + (++seq), action: (req && (req.mod || 'User') + '.' + req.do), req: safeClone(req), probe: { mode: status.l0.mode, version: VERSION } };
      var e0 = errors.length, t0 = toasts.length;
      try { c.saveBefore = loadSave(); } catch (e) {}
      var r = h0.apply(this, arguments);
      thenable(r, function (resp) {
        c.resp = safeClone(resp);
        later(CFG.settleMs + 50, function () {
          c.saveAfter = loadSave();
          c.snapA = snapshot();
          c.exceptions = errors.slice(e0);   // 注意：时间窗内其他动作的异常也会计入，判读时看 event 字段
          c.toasts = toasts.slice(t0);
          passiveCount++;
          writeJSON(CFG.dir + 'cases/live/' + c.id + '.json', c);
        });
      });
      return r;
    };
    wrapped.__bzOracle = true;
    // 把包装写回到解析出的位置（仅支持 "window.X" / "window.A && A.B" 两种形态）
    var expr = status.resolved.handlerEntry || '';
    var m = expr.match(/^window\.(\w+)(?: && \1\.(\w+))?$/);
    if (m) { if (m[2]) root[m[1]][m[2]] = wrapped; else root[m[1]] = wrapped; M.handlerEntry = wrapped; status.passive = 'on'; }
    else status.passive = 'off: 无法写回 ' + expr;
  }

  // ---------- 存档备份 ----------
  function saveBackup(tag) { var t = readText(CFG.savePath); if (t == null) return false; return fu().writeStringToFile(t, CFG.dir + 'backup/' + (tag || 'default') + '.json'); }
  function saveRestore(tag) { var t = readText(CFG.dir + 'backup/' + (tag || 'default') + '.json'); if (t == null) return false; return fu().writeStringToFile(t, CFG.savePath); }

  // ---------- 命令通道 ----------
  function reply(id, v) { writeJSON(CFG.dir + 'res-' + id + '.json', v); }
  function poll() {
    var p = CFG.dir + 'cmd.json', t = readText(p);
    if (t) {
      try { fu().removeFile(p); } catch (e) {}
      var cmd; try { cmd = JSON.parse(t); } catch (e) { cmd = null; }
      if (cmd) runCmd(cmd);
    }
    later(CFG.pollMs, poll);
  }
  function runCmd(cmd) {
    var id = cmd.id || String(now());
    try {
      switch (cmd.op) {
        case 'status': writeStatus(); return reply(id, status);
        case 'snap': return reply(id, { snap: snapshot(cmd.domains) });
        case 'dual': return dual(cmd.req, function (r) { reply(id, r); });
        case 'inject': deliver(cmd.envelope); return later(CFG.settleMs, function () { reply(id, { snap: snapshot(), exceptions: errors.slice(-20) }); });
        case 'backup': return reply(id, { ok: saveBackup(cmd.tag) });
        case 'restore': return reply(id, { ok: saveRestore(cmd.tag), note: '恢复存档后需要触发一次 LoadGame 或重启进程，客户端模型才会同步' });
        case 'errors': return reply(id, { errors: errors.slice(cmd.from || 0) });
        default: return reply(id, { error: 'unknown op ' + cmd.op });
      }
    } catch (e) { reply(id, { error: e.message, stack: String(e.stack || '') }); }
  }
  function writeStatus() {
    status.snapshotDomains = Object.keys(CFG.snapshot).filter(function (d) { return typeof CFG.snapshot[d] === 'function'; });
    status.rebuildDomains = CFG.rebuild.reduce(function (a, s) { return a.concat(s.domains); }, []);
    status.errorsSeen = errors.length;
    writeJSON(CFG.dir + 'status.json', status);
  }

  // ---------- 安装 ----------
  function install() {
    resolveAll();
    installL0();
    installPassive();
    writeStatus();
  }
  root.BZ_ORACLE = { version: VERSION, install: install, dual: dual, snapshot: snapshot, deliver: deliver, errors: errors, toasts: toasts, status: status, cfg: CFG, saveBackup: saveBackup, saveRestore: saveRestore };
  ensureDir(CFG.dir); ensureDir(CFG.dir + 'cases/'); ensureDir(CFG.dir + 'cases/live/');
  install();
  // 业务脚本可能晚于探针加载：延迟重装两次，补上后注册的符号与监听器
  later(3000, install); later(15000, install);
  later(CFG.pollMs, poll);
})(typeof window !== 'undefined' ? window : this);
