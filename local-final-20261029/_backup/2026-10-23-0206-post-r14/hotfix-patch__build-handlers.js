'use strict';
/**
 * build-handlers.js —— 生成设备端策略层 hotfix/live/handlers.js
 *
 * 产物 = __TPL__（模板） + bz-rpc-server.js（业务） + bz-handler-impl.js（契约适配）
 * 求值方式：new Function('bz', src) → 返回 { version, handle, selfCheck, reset, state }
 * 版本号 = 内容哈希前 8 位，reload 后日志里能直接看出换没换。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const tpl = read('core/templates.json').trim();
const shapes = read('core/bz-shapes.generated.js');
const tasks = read('core/bz-tasks.generated.js');
const server = read('core/bz-rpc-server.js');
const impl = read('core/bz-handler-impl.js');

// 模板必须是合法 JSON，否则设备端 new Function 会静默产出坏对象
JSON.parse(tpl);

const body = 'var __TPL__ = ' + tpl + ';\n\n' + shapes + '\n\n' + tasks + '\n\n' + server + '\n\n' + impl;
const ver = 'h' + crypto.createHash('sha1').update(body).digest('hex').slice(0, 8);
const out = '/* handlers bundle  ver=' + ver + '  built=' + new Date().toISOString() + '\n' +
  ' * 由 build-handlers.js 生成，请勿手改；改 core/ 后重新构建并推送。\n' +
  ' * 设备端路径：<writable>/hotfix/live/handlers.js\n' +
  ' */\n' +
  'var IMPL_VERSION = ' + JSON.stringify(ver) + ';\n' +
  body + '\n';

// 编译期校验：必须能被 new Function 编译（沙盒禁用 spawn，用 vm 编译代替 node --check）
require('vm').compileFunction(out, ['bz']);

// 契约烟测：用仿真 bz 跑一次 selfCheck，确保不是"能编译但一跑就炸"
function smoke() {
  const store = {};
  const bz = {
    bootVer: 'smoke', now: () => 1792612412000, log: () => {},   // 全仓唯一固定时钟（见 HANDOVER §6.3）
    selfCheckVerbose: true,                                       // 让 selfCheck 回全量 checked id（只给构建期）
    readFile: (p) => (p in store ? store[p] : null),
    writeFile: (p, t) => { store[p] = t; return true; },
    exists: (p) => p in store,
    remove: (p) => { delete store[p]; return true; },
    dir: '/tmp/', savePath: '/tmp/bz_offline_save.json', handlersPath: '/tmp/handlers.js',
    codec: makeNodeCodec(),
  };
  const api = new Function('bz', out);
  const implObj = api(bz);
  if (!implObj || typeof implObj.handle !== 'function') throw new Error('handlers 契约不符：缺 handle');
  const sc = implObj.selfCheck();
  if (!sc.ok) throw new Error('handlers 自检未通过: ' + JSON.stringify(sc.detail).slice(0, 400));
  // 按**检查 id** 比对必需集合（SOTA R12 §1 第 4 条 / Q1-3）：
  //   只比 "failed 为空" 会被"条件不满足就跳过"绕过 —— 少一条检查，passed 变了但 failed 仍空。
  //   required 里任何一条没被执行到（例如 clock:liveIsReal 因不在 live 进程被跳过）→ 这里直接红。
  //
  // R13 §5 第 4 条的三条加强（2026-10-23）：
  //   ① 清单文件缺失**不许静默跳过**（原来 existsSync 为假就整段不跑 = 闸门形同不存在）；
  //   ② impl 内联的 REQUIRED_CHECKS 与本 JSON 必须逐字一致（live 侧要拿它算差集，两份不许漂移）；
  //   ③ live 侧回的 missingRequired 必须为空。
  const reqPath = path.join(__dirname, '..', 'tools', 'golden', 'required-checks.json');
  if (!require('fs').existsSync(reqPath)) {
    throw new Error('必需检查 id 清单缺失（闸门不许静默跳过）: ' + reqPath);
  }
  const req = JSON.parse(require('fs').readFileSync(reqPath, 'utf8'));
  const inlineReq = implObj.requiredChecks;
  if (!Array.isArray(inlineReq)) throw new Error('impl 契约不符：缺 requiredChecks（live 侧算差集要用）');
  if (JSON.stringify(inlineReq) !== JSON.stringify(req)) {
    throw new Error('required-checks 漂移：impl 内联 ' + JSON.stringify(inlineReq).slice(0, 200)
      + ' ≠ 文件 ' + JSON.stringify(req).slice(0, 200));
  }
  const have = new Set(sc.checked || []);
  const missing = req.filter((id) => !have.has(id));
  if (missing.length) {
    throw new Error('handlers 自检缺少必需检查 id（被静默跳过？）: ' + missing.join(', ')
      + ' ｜ 已执行 ' + have.size + ' 条');
  }
  if (!Array.isArray(sc.missingRequired) || sc.missingRequired.length) {
    throw new Error('selfCheck.missingRequired 不符：' + JSON.stringify(sc.missingRequired));
  }

  // SOTA R14 §3 / Q2：`ver` 必须是**内容哈希**，而产物里唯一的合法时间戳只有固定时钟 GEN_NOW 那一处。
  //   校验方式：把产物里所有 ISO 时间戳抓出来，必须**恰好等于** GEN_NOW 的 ISO 形式。
  //   为什么：`generatedAt` 曾用 `new Date()`，导致每跑一次形状生成 ver 就变（实测 hfa9ba714→h7910b953、
  //   字节数相同、只差 4 行时间戳）；那样"哈希相同"这个判据永远为假，G5 就判不出来。
  const GEN_NOW_ISO = new Date(1792612412000).toISOString();
  const stamps = sc.__stamps;   // 由 main() 传进来（见下），避免在 smoke 里再读一遍文件
  if (Array.isArray(stamps)) {
    const bad = stamps.filter((v) => v !== GEN_NOW_ISO);
    if (bad.length) {
      throw new Error('产物里有非固定时钟的时间戳（ver 会因此不稳定）: '
        + bad.slice(0, 4).join(', ') + ' ｜ 只允许 ' + GEN_NOW_ISO);
    }
  }

  // SOTA R14 §1 第 3 条 / Q4：运行时的拒绝码表与 tools\facts\reject-codes.json **双向**一致。
  //   单向会漏：JSON 里新增原因而 handler 没接（漏改）或 handler 接了而表没登记（漏登记），都要红。
  const rjPath = path.join(__dirname, '..', 'tools', 'facts', 'reject-codes.json');
  if (!require('fs').existsSync(rjPath)) {
    throw new Error('拒绝码表缺失（不许静默跳过）: ' + rjPath);
  }
  const rj = JSON.parse(require('fs').readFileSync(rjPath, 'utf8'));
  const rtCodes = implObj.rejectCodes || (implObj._internal && implObj._internal.rejectCodes);
  if (!rtCodes) throw new Error('impl 契约不符：缺 rejectCodes（拒绝码运行时副本）');
  const jsonActions = Object.keys(rj).sort();
  const rtActions = Object.keys(rtCodes).sort();
  if (JSON.stringify(jsonActions) !== JSON.stringify(rtActions)) {
    throw new Error('拒绝码表动作集合漂移：JSON=' + jsonActions.join(',') + ' ｜ impl=' + rtActions.join(','));
  }
  for (const act of jsonActions) {
    const entry = rj[act];
    const codes = entry.codes || [];
    if (!codes.length) throw new Error('拒绝码表条目为空: ' + act);
    if (typeof entry.defaultCode !== 'number') throw new Error('拒绝码表 ' + act + ' 缺 defaultCode');
    // defaultCode 的确定规则（与 tools\check_reject_codes.js 的 R3 一致）：
    //   ① 有 reasons 含 default 的 reject 条目 → defaultCode 必须等于它（且只能有一条）；
    //   ② 没有 default 条目但只有 1 条 reject → defaultCode 必须等于它；
    //   ③ 纯 flow 动作（0 条 reject）→ 只许有唯一一个码，且 defaultCode 等于它。
    const defaults = codes.filter((c) => (c.reasons || []).indexOf('default') >= 0);
    const rejects = codes.filter((c) => c.role === 'reject');
    if (defaults.length > 1) throw new Error('拒绝码表 ' + act + ' 有多条 reasons 含 default：' + defaults.length);
    let expectDefault;
    if (defaults.length === 1) expectDefault = defaults[0].code;
    else if (rejects.length === 1) expectDefault = rejects[0].code;
    else if (rejects.length === 0 && codes.length === 1) expectDefault = codes[0].code;
    else throw new Error('拒绝码表 ' + act + ' 无法确定 defaultCode（reject=' + rejects.length + ' codes=' + codes.length + '）');
    if (entry.defaultCode !== expectDefault) {
      throw new Error('拒绝码表 ' + act + ' defaultCode=' + entry.defaultCode + ' 与规则推出的 ' + expectDefault + ' 不一致');
    }
    for (const c of codes) {
      for (const reason of (c.reasons || [])) {
        const rt = rtCodes[act] && rtCodes[act][reason];
        if (rt !== c.code) {
          throw new Error('拒绝码漂移 ' + act + '.' + reason + '：JSON=' + c.code + ' ｜ impl=' + rt);
        }
      }
    }
  }
  return { ver: implObj.version, checks: sc.passed, checked: (sc.checked || []).length };
}

function makeNodeCodec() {
  const nodeCrypto = require('crypto');
  const LZString = require('lz-string');
  const KEY = Buffer.from('120734aa834dea925ca8d2e1bb6811c3', 'utf8');
  const IV = Buffer.from('33daee8409834c00', 'utf8');
  return {
    encode(pt) {
      const c = nodeCrypto.createCipheriv('aes-256-cbc', KEY, IV);
      return Buffer.concat([c.update(LZString.compressToBase64(pt), 'utf8'), c.final()]).toString('hex');
    },
    decode(hex) {
      const d = nodeCrypto.createDecipheriv('aes-256-cbc', KEY, IV);
      const b64 = Buffer.concat([d.update(Buffer.from(String(hex).trim(), 'hex')), d.final()]).toString('utf8');
      return LZString.decompressFromBase64(b64);
    },
  };
}

// 产物里出现过的所有 ISO 时间戳（R14 §3：只允许固定时钟那一处，否则 ver 不稳定）
const stampsIn = (function () {
  const m = body.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g) || [];
  return Array.from(new Set(m));
})();

const smokeRes = smoke({ __stamps: stampsIn });

const outDir = path.join(root, 'patch', 'live');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'handlers.js'), out, 'utf8');

// 流程层：源码即产物（可热重载），只做语法校验后原样拷到 patch/live
const flowSrc = read('live/flow.js');
require('vm').compileFunction(flowSrc, ['bz']);
fs.writeFileSync(path.join(outDir, 'flow.js'), flowSrc, 'utf8');

console.log('HANDLERS OK  ver=' + smokeRes.ver + '  selfCheck=' + smokeRes.checks + '  bytes=' + Buffer.byteLength(out) + '  -> patch/live/handlers.js');
console.log('FLOW     OK  bytes=' + Buffer.byteLength(flowSrc) + '  -> patch/live/flow.js');
