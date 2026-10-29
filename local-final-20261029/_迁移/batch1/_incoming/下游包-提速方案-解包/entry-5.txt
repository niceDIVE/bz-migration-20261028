#!/usr/bin/env node
/* 防白拿 lint（上游 2026-10-27）：扫 bz-rpc-server.js 里 var H = {...} 的每个 handler，
 * 凡是有"发东西"的落点（grantRewardList/grantItem/grantCurrency/bagAdd/钱包 +=），
 * 就要求同一个 handler 里有下面至少一种闸：
 *   COST  ：真扣（-= / = have - n / delete s.bag[...] / spend/cost 前缀调用）
 *   LEDGER：一次性或上限记账（canClaim/markClaim，或 noteReject 的原因码像 claimed/cap/limit/daily/done/once/已领/上限）
 * 两种都没有 → FLAG（疑似白拿）；发放量取自请求参数 p.* → TRUST（信客户端）。
 * 另外：发放型 handler 的 if 条件里用到 p.xxx 的，打 WARN（不阻断），提醒人工看是不是"信客户端报的档位/胜负"（C11 VIP 白领那类）。
 * 用法：node tools/lint_freebie.js [core/bz-rpc-server.js] [--all]
 * 退出码：有 FLAG/TRUST 且不在 tools/freebie_allow.json 白名单 → 1。白名单格式 {"动作名":"一句理由"}。 */
'use strict';
var fs = require('fs'), path = require('path');
var args = process.argv.slice(2);
var showAll = args.indexOf('--all') >= 0;
var file = args.filter(function (a) { return a.indexOf('--') !== 0; })[0] || path.join(__dirname, '..', 'core', 'bz-rpc-server.js');
var src = fs.readFileSync(file, 'utf8');
var allowFile = path.join(__dirname, 'freebie_allow.json');
var allow = fs.existsSync(allowFile) ? JSON.parse(fs.readFileSync(allowFile, 'utf8').replace(/^\uFEFF/, '')) : {};

var hStart = src.search(/var H = \{/);
if (hStart < 0) { console.error('找不到 var H = {'); process.exit(2); }

// 按 "    名字: function (" 切 handler，用花括号配平取函数体（跳过字符串和注释）
function bodyFrom(i) {
  var depth = 0, j = src.indexOf('{', i), inS = null, esc = false;
  for (var k = j; k < src.length; k++) {
    var c = src[k], n = src[k + 1];
    if (inS) {
      if (inS === '//' ) { if (c === '\n') inS = null; continue; }
      if (inS === '/*') { if (c === '*' && n === '/') { inS = null; k++; } continue; }
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === inS) inS = null;
      continue;
    }
    if (c === '/' && n === '/') { inS = '//'; k++; continue; }
    if (c === '/' && n === '*') { inS = '/*'; k++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(j, k + 1); }
  }
  return src.slice(j);
}
var re = /\n {4}([A-Za-z_$][\w$]*)\s*:\s*function\s*\(/g, m, rows = [];
re.lastIndex = hStart;
var SINK = /\b(grantRewardList|grantItem|grantCurrency|bagAdd)\s*\(|\.(yuanbao|gold|coins|potential|exp)\s*\+=|\.(yuanbao|gold|coins|potential|exp)\s*=\s*[^;]*\+/;
var COST = /-=|=\s*\w+\s*-\s*\w+|delete\s+s\.bag\[|bagAdd\([^)]*,\s*-|delete\s+\w+\.\w+\s*;|\bs\.\w+\s*=\s*0\s*;|\b(spend|cost|deduct|pay)\w*\s*\(/i;
var LEDGER = /\b(canClaim|markClaim)\s*\(|indexOf\([^)]*\)\s*>=\s*0[\s\S]*\.push\(|\w*(Done|Granted|Claimed)\s*=\s*1\b|noteReject\([^)]*['"][^'"]*(claim|cap|limit|daily|done|once|repeat|dup|first|already|已领|上限|重复)[^'"]*['"]/i;
while ((m = re.exec(src))) {
  var name = m[1], body = bodyFrom(m.index);
  // 去掉注释再判
  var code = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  if (!SINK.test(code)) continue;
  var sinkLines = code.split('\n').filter(function (l) { return SINK.test(l); });
  var trust = sinkLines.some(function (l) { return /\bp\.\w+|\bp\[/.test(l); });
  var cost = COST.test(code), ledger = LEDGER.test(code);
  var pc = {}, mm, reIf = /if\s*\(([^)]*)\)/g;
  while ((mm = reIf.exec(code))) { var mp, reP = /\bp\.(\w+)/g; while ((mp = reP.exec(mm[1]))) pc[mp[1]] = 1; }
  var params = Object.keys(pc);
  var verdict = trust ? 'TRUST' : (cost || ledger) ? 'OK' : 'FLAG';
  rows.push({ name: name, verdict: verdict, cost: cost, ledger: ledger, allowed: !!allow[name], params: params });
}
var bad = rows.filter(function (r) { return r.verdict !== 'OK' && !r.allowed; });
rows.forEach(function (r) {
  if (r.params.length) console.log('WARN  ' + r.name.padEnd(36) + ' 资格判断里用到请求参数 p.' + r.params.join('/p.') + ' —— 人工确认这些参数不是档位/身份/胜负（那类必须读存档）');
  if (!showAll && r.verdict === 'OK') return;
  console.log((r.allowed ? 'ALLOW ' : '') + r.verdict.padEnd(5) + ' ' + r.name.padEnd(36) + ' cost=' + (r.cost ? 1 : 0) + ' ledger=' + (r.ledger ? 1 : 0) + (r.allowed ? '  // ' + allow[r.name] : ''));
});
console.log('lint_freebie: 发放型 handler ' + rows.length + ' 个，OK ' + rows.filter(function (r) { return r.verdict === 'OK'; }).length + '，待查 ' + bad.length + '（白名单 ' + rows.filter(function (r) { return r.allowed; }).length + '）');
process.exit(bad.length ? 1 : 0);
