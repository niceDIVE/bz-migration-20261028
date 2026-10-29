#!/usr/bin/env node
// 抓包 → 用例/模板：把任意代理导出的 HAR（mitmproxy、Charles、HTTP Toolkit、浏览器 DevTools 都能导出）转成
//   ① 裁判/回放可用的 case（只有 req/resp，没有存档时 L1/L4 可判，L5 需存档）　② L4 用的 templates.json（每个动作取首个成功样本）
// 原服若还能连，这就是 CAPTURE 类内容的取证通道。
// node forge/tools/har2cases.js --har capture.har [--url-re "/game"] --out-cases out/captured --templates out/templates.captured.json
// 请求体识别顺序：JSON {mod,do,p} → 表单 mod=&do=&p=<json> → 信封里的 p 字段推出动作名（材料未提供真实线格式，按这三种常见形态容错【推断】）
'use strict';
const fs = require('fs');
const path = require('path');
const { args, writeJSON } = require('../../host/lib/util');

function parseReq(entry) {
  const pd = entry.request.postData || {};
  let txt = pd.text || '';
  if (!txt && pd.params) txt = pd.params.map(x => `${x.name}=${x.value}`).join('&');
  // 中层审计 A1-C17：请求体也可能是 base64（部分代理/客户端会编码）；解不出 JSON/表单时试一次 base64
  if (txt && !/[{=&]/.test(txt) && /^[A-Za-z0-9+/=\s]+$/.test(txt)) { try { const d = Buffer.from(txt, 'base64').toString('utf8'); if (/[{=]/.test(d)) txt = d; } catch (e) { /* 不是 base64 */ } }
  try { const j = JSON.parse(txt); if (j && j.mod && j.do) return { mod: j.mod, do: j.do, p: j.p || {} }; } catch (e) { /* 不是 JSON */ }
  const q = new URLSearchParams(txt);
  if (q.get('mod') && q.get('do')) { let p = {}; try { p = JSON.parse(q.get('p') || '{}'); } catch (e) { p = { _raw: q.get('p') }; } return { mod: q.get('mod'), do: q.get('do'), p }; }
  return null;
}
function parseResp(entry) {
  const c = entry.response.content || {};
  let t = c.text || '';
  if (c.encoding === 'base64') t = Buffer.from(t, 'base64').toString('utf8');
  try { return JSON.parse(t); } catch (e) { return null; }
}
function convert(har, urlRe) {
  const out = [], tpl = {}, skipped = { url: 0, req: 0, resp: 0 };
  for (const [i, e] of (har.log.entries || []).entries()) {
    if (urlRe && !urlRe.test(e.request.url)) { skipped.url++; continue; }
    const env = parseResp(e);
    if (!env) { skipped.resp++; continue; }
    let req = parseReq(e);
    if (!req && env.p && /\./.test(env.p)) { const [mod, d] = env.p.split('.'); req = { mod, do: d, p: {}, _inferred: true }; }
    if (!req) { skipped.req++; continue; }
    const action = `${req.mod}.${req.do}`;
    const body = env[action] !== undefined ? env[action] : env;
    out.push({ id: `cap.${String(i).padStart(4, '0')}.${req.do}`, action, req, resp: body, envelope: env, transport: 'game', rawTransport: { code: e.response.status === 200 && env.code === undefined ? 200 : env.code },
      meta: { source: 'har', startedDateTime: e.startedDateTime, url: e.request.url }, exceptions: [], toasts: [] });
    if (!tpl[action] && body && body.eRet === 1) tpl[action] = body;
  }
  return { cases: out, templates: tpl, skipped };
}
module.exports = { convert };
if (require.main === module) {
  const a = args(process.argv.slice(2));
  if (!a.har) { console.error('需要 --har'); process.exit(2); }
  const r = convert(JSON.parse(fs.readFileSync(a.har, 'utf8')), a['url-re'] ? new RegExp(a['url-re']) : null);
  if (a['out-cases']) { fs.mkdirSync(a['out-cases'], { recursive: true }); r.cases.forEach(c => writeJSON(path.join(a['out-cases'], c.id + '.json'), c)); }
  if (a.templates) writeJSON(a.templates, r.templates);
  console.log(JSON.stringify({ cases: r.cases.length, actions: [...new Set(r.cases.map(c => c.action))].length, templates: Object.keys(r.templates).length, skipped: r.skipped }));
}
