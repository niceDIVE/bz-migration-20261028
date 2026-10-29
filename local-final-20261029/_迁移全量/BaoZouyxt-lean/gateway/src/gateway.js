'use strict';
/**
 * OfflineSimulationGateway —— 本地仿真网关
 *
 * 安全准则（TECH.md §3.1）：
 *  - 只监听 127.0.0.1，无任何外联转发；
 *  - 解不开/不像游戏 RPC 的请求（广告、遥测、SDK 心跳）一律黑洞：
 *    HTTP 200 空应答，本地短路，杜绝外网行为；
 *  - 解得开的游戏 RPC → dispatcher → 编码回 {"code":200,"MsgData":"<hex>"}。
 */

const http = require('http');
const path = require('path');
const { ProtocolCodec } = require('./codec');
const { SandboxStorage } = require('./store');
const { RpcDispatcher } = require('./rpc');

const MAX_BODY = 10 * 1024 * 1024; // 10MB

const HEX_RE = /^[0-9a-fA-F]+$/;
// 客户端可能把 hex 塞在不同字段名里，逐一试探
const HEX_FIELD_CANDIDATES = ['MsgData', 'msgData', 'data', 'msg', 'd', 'p'];

function looksLikeHex(s) {
  return typeof s === 'string' && s.length >= 32 && s.length % 2 === 0 && HEX_RE.test(s);
}

/** 尽力把请求体还原为 {mod,do,p}；失败返回 null（走黑洞） */
function tryParseRpc(codec, body) {
  const s = String(body || '').trim();
  if (!s) return null;
  let envelope = null;

  if (looksLikeHex(s)) {
    try {
      envelope = JSON.parse(codec.decode(s));
    } catch (_) {
      return null;
    }
  } else {
    try {
      envelope = JSON.parse(s);
    } catch (_) {
      return null;
    }
    if (envelope && typeof envelope === 'object' && !(envelope.mod && envelope.do)) {
      // JSON 信封但业务体在某个 hex 字段里
      for (const f of HEX_FIELD_CANDIDATES) {
        const v = envelope[f];
        if (looksLikeHex(v)) {
          try {
            const inner = JSON.parse(codec.decode(v));
            if (inner && inner.mod && inner.do) {
              envelope = inner;
              break;
            }
          } catch (_) {
            /* 继续试探 */
          }
        }
      }
    }
  }

  if (envelope && typeof envelope === 'object' && envelope.mod && envelope.do) {
    return { mod: String(envelope.mod), do: String(envelope.do), p: envelope.p || {} };
  }
  return null;
}

function gmPage(summary) {
  const r = summary.role;
  return `<!doctype html><meta charset="utf-8"><title>GM 控制台</title>
<body style="font-family:monospace;max-width:640px;margin:2rem auto">
<h2>GM 开发者控制台（本地沙盒）</h2>
<pre>${JSON.stringify(r, null, 2)}</pre>
<p>事件数：${summary.eventCount}</p>
<h3>一键修改</h3>
<form onsubmit="fetch('/gm/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
  level:+document.getElementById('lv').value||undefined,
  silver:+document.getElementById('sl').value||undefined,
  potential:+document.getElementById('pt').value||undefined
})}).then(r=>r.json()).then(()=>location.reload());return false">
<label>等级 <input id="lv" size="6"></label>
<label>银两 <input id="sl" size="10"></label>
<label>潜能 <input id="pt" size="10"></label>
<button>提交</button>
</form></body>`;
}

function createGateway(options = {}) {
  const host = options.host || process.env.GW_HOST || '127.0.0.1';
  const port = Number(options.port ?? process.env.GW_PORT ?? 8080);
  const codec = options.codec || new ProtocolCodec();
  const storage =
    options.storage || new SandboxStorage(path.join(__dirname, '..', 'data', 'sandbox.db'));
  const dispatcher = options.dispatcher || new RpcDispatcher(storage);
  const log = options.log || ((...a) => console.log('[gateway]', ...a));

  const server = http.createServer((req, res) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) req.destroy();
      else chunks.push(c);
    });
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');

      // ---- GM 控制台路由（阶段四最小版）----
      if (req.method === 'GET' && (req.url === '/gm' || req.url === '/gm/')) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(gmPage(storage.summary()));
        return;
      }
      if (req.method === 'POST' && req.url === '/gm/api') {
        try {
          const patch = JSON.parse(body || '{}');
          const role = storage.gmPatch(1, patch);
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ ok: true, role }));
        } catch (e) {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: String(e.message) }));
        }
        return;
      }

      // ---- 游戏 RPC / 遥测黑洞 ----
      const rpc = tryParseRpc(codec, body);
      if (!rpc) {
        log(`blackhole ${req.method} ${req.url} (${Buffer.byteLength(body)}B)`);
        res.writeHead(200, { 'content-type': 'application/octet-stream' });
        res.end();
        return;
      }
      try {
        const result = dispatcher.dispatch(rpc.mod, rpc.do, rpc.p);
        log(`rpc ${rpc.mod}.${rpc.do}`);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(codec.wrapResponse(result));
      } catch (err) {
        log(`rpc-error ${rpc.mod}.${rpc.do}: ${err.message}`);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ code: 500, Msg: String(err.message) }));
      }
    });
    req.on('error', () => req.destroy());
  });

  return { server, codec, storage, dispatcher, host, port, log };
}

if (require.main === module) {
  const gw = createGateway();
  gw.server.listen(gw.port, gw.host, () => {
    gw.log(`OfflineSimulationGateway listening on http://${gw.host}:${gw.port}`);
    gw.log(`GM console: http://${gw.host}:${gw.port}/gm`);
  });
}

module.exports = { createGateway, tryParseRpc };
