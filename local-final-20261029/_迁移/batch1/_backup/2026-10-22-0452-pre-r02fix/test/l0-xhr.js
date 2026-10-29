'use strict';
/**
 * L0-1 XHR 一致性测试（Node，秒级）
 * 规范对齐点：readyState 1→2→3→4、on<ev> 属性与 addEventListener 双通道、
 *             status/responseText/response、getResponseHeader、abort、impl 抛错→error。
 */
const assert = require('assert');
const { createBzXHRClass } = require('../hook/bz-xhr.js');

const tick = () => new Promise((r) => setTimeout(r, 10));
let n = 0;
function ok(name, cond, info) {
  n++;
  if (!cond) { console.error('  FAIL ' + name + (info ? ' → ' + JSON.stringify(info) : '')); throw new Error('FAIL ' + name); }
  console.log('  ok   ' + name);
}

async function main() {
  console.log('[L0-1] XHR 一致性');

  // ---- T1 正常响应：状态序列 + 双通道事件 ----
  {
    const impl = { handle: () => ({ status: 200, text: '{"MsgData":"abc"}', meta: { action: 'User.x' } }) };
    const X = createBzXHRClass(() => impl, () => {});
    const x = new X();
    const seq = [], events = [];
    x.onreadystatechange = function () { seq.push(this.readyState); };
    x.addEventListener('load', () => events.push('listener:load'));
    x.addEventListener('readystatechange', () => events.push('listener:rsc'));
    x.onload = () => events.push('prop:load');
    x.open('POST', 'https://bzgf.maple-game.com/900-server-166/acceptTask');
    ok('open → readyState=1', x.readyState === 1);
    x.setRequestHeader('Content-Type', 'application/json');
    ok('getResponseHeader(content-type)', x.getResponseHeader('content-type') === 'application/json');
    ok('getResponseHeader(unknown)=null', x.getResponseHeader('x-nope') === null);
    x.send('deadbeef');
    await tick();
    ok('状态序列 1→2→3→4', JSON.stringify(seq) === '[1,2,3,4]', seq);
    ok('status=200', x.status === 200);
    ok('responseText 原样', x.responseText === '{"MsgData":"abc"}');
    ok('response 同步', x.response === x.responseText);
    ok('onload 属性触发', events.indexOf('prop:load') >= 0, events);
    ok('addEventListener(load) 触发', events.indexOf('listener:load') >= 0, events);
    ok('readystatechange 双通道都触发', events.indexOf('listener:rsc') >= 0, events);
    ok('状态常量 DONE=4', X.DONE === 4 && X.OPENED === 1);
  }

  // ---- T2 impl 抛错：必须大声失败（500 + error 事件 + 日志） ----
  {
    const logs = [];
    const impl = { handle: () => { throw new Error('boom'); } };
    const X = createBzXHRClass(() => impl, (m) => logs.push(m));
    const x = new X();
    const evs = [];
    x.onerror = () => evs.push('error');
    x.onload = () => evs.push('load');
    x.onloadend = () => evs.push('loadend');
    x.open('POST', 'https://bzgf.maple-game.com/900-server-166/x');
    x.send('00');
    await tick();
    ok('抛错 → status=500', x.status === 500, x.status);
    ok('抛错 → error 事件（不是 load）', evs.indexOf('error') >= 0 && evs.indexOf('load') < 0, evs);
    ok('抛错 → loadend 仍触发', evs.indexOf('loadend') >= 0);
    ok('抛错 → 记录日志', logs.some((l) => /impl\.handle 异常/.test(l)), logs);
    ok('抛错 → 响应体是 JSON 错误', /"error"/.test(x.responseText));
  }

  // ---- T3 impl 未就绪：不得静默 ----
  {
    const logs = [];
    const X = createBzXHRClass(() => null, (m) => logs.push(m));
    const x = new X();
    x.open('GET', 'http://1.2.3.4:9898/GetServerList');
    x.send(null);
    await tick();
    ok('impl 缺失 → 500', x.status === 500);
    ok('impl 缺失 → 日志可见', logs.length > 0 && /impl 未就绪/.test(logs.join('|')), logs);
  }

  // ---- T4 abort ----
  {
    const impl = { handle: () => ({ status: 200, text: 'late' }) };
    const X = createBzXHRClass(() => impl, () => {});
    const x = new X();
    const evs = [];
    x.onabort = () => evs.push('abort');
    x.open('GET', 'https://bzgf.maple-game.com/900-server-166/x');
    x.abort();
    ok('abort → readyState=4 / status=0', x.readyState === 4 && x.status === 0);
    ok('abort 事件触发', evs.indexOf('abort') >= 0);
    x.send('x');
    await tick();
    ok('abort 后 send 不再改写响应', x.responseText === '');
  }

  console.log('[L0-1] PASS ' + n + ' 项');
}

main().catch((e) => { console.error('[L0-1] FAILED\n', e); process.exit(1); });
