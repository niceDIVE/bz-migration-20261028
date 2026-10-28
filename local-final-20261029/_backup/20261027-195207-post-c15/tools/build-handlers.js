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
// 第 1 批「商店交易」货架/价目表（tools/gen_shop_tables.js 生成，2026-10-24）
const shops = read('core/bz-shops.generated.js');
// 第 10 批 C09〔技巧摸奖〕的紧凑表（tools/gen_c09_tables.js 生成，2026-10-27）
const c09 = read('core/bz-c09.generated.js');
// 第 11 批 C10〔农作物〕的紧凑表（tools/gen_c10_tables.js 生成，2026-10-27）
// ⚠ 与 check_shape_freeze.js 的 sweep 必须**两处都接**：少接一处，那处 BZ_PLANT 就是 undefined，
//   作物动作的应答会被抽成空壳（C09 踩过同一个坑：只接了 build、没接 sweep）。
const c10 = read('core/bz-c10.generated.js');
// 第 12 批 C11〔周年通行证〕的紧凑表（tools/gen_c11_tables.js 生成，2026-10-27）
// ⚠ 与 check_shape_freeze.js 的 sweep 必须**两处都接**（同 c09/c10 的坑）。
const c11 = read('core/bz-c11.generated.js');
// 第 13 批 C12〔管家/帮手〕的紧凑表（tools/gen_c12_tables.js 生成，2026-10-27）
// ⚠ 与 check_shape_freeze.js 的 sweep 必须**两处都接**（同 c09/c10/c11 的坑）。
const c12 = read('core/bz-c12.generated.js');
// 第 14 批 C13〔UFO 夹娃娃〕的紧凑表（tools/gen_c13_tables.js 生成，2026-10-27）
const c13 = read('core/bz-c13.generated.js');
// 第 15 批 C14〔斗狗〕的紧凑表（tools/gen_c14_tables.js 生成，2026-10-27）
// ⚠ 与 check_shape_freeze.js 的 sweep 必须**两处都接**（同 c09/c10/c11/c12/c13 的坑）。
const c14 = read('core/bz-c14.generated.js');
// 第 16 批 C15〔七日回归〕的紧凑表（tools/gen_c15_tables.js 生成，2026-10-27）
// ⚠ 与 check_shape_freeze.js 的 sweep 必须**两处都接**（同 c09-c14 的坑）。
const c15 = read('core/bz-c15.generated.js');
const server = read('core/bz-rpc-server.js');
const impl = read('core/bz-handler-impl.js');

// 模板必须是合法 JSON，否则设备端 new Function 会静默产出坏对象
JSON.parse(tpl);

/* 拒绝码表（SOTA R14/R15）：构建期把它读进来，**推导**每个动作的 catchCode 并注入产物。
 * 为什么在构建期注入而不是在 core 里手写一份：手写副本必然漂移（R14 已吃过一次双向对不上）。
 * catchCode 的推导规则见 deriveCatchCodes()：必须 ∉ success ∪ handled ∪ codes[].code。 */
const RJSON = JSON.parse(fs.readFileSync(path.join(root, '..', 'tools', 'facts', 'reject-codes.json'), 'utf8'));
// 推导逻辑放在共享模块里（测试与构建用同一份，避免"测的和线上跑的不是同一个推导"）
const { deriveCatchCodes } = require(path.join(root, '..', 'tools', 'derive_catch_codes.js'));
const CATCH_CODES = deriveCatchCodes(RJSON);

/* 物品效果表（SOTA R16 §2）：从 live dump 的 item 全表压缩而来，只留 Type==2 的物品
 * （客户端整段 `switch (e.Effect)` 只在 `2 == e.Type` 时执行，证据 index.js:64321）。
 * 形状：{ itemID: [Effect, Data1, Data2, Data3] } —— handler 用它判"这个 Effect 的 Data1 是什么"。 */
const ITEMFX = (function () {
  const p = path.join(root, '..', 'tools', 'facts', 'item-effects.json');
  if (!fs.existsSync(p)) return {};
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const o = {};
  for (const id of Object.keys(j.effects || {})) {
    const r = j.effects[id];
    if (r && r.t === 2) o[id] = [r.e || 0, r.d1 || 0, r.d2 || 0, r.d3 || 0];
  }
  return o;
})();

const body = 'var __TPL__ = ' + tpl + ';\n\n' + shapes + '\n\n' + tasks + '\n\n' + shops + '\n\n' + c09 + '\n\n' + c10 + '\n\n' + c11 + '\n\n' + c12 + '\n\n' + c13 + '\n\n' + c14 + '\n\n' + c15 + '\n\n'
  + 'var BZ_CATCH_CODES = ' + JSON.stringify(CATCH_CODES) + ';\n\n'
  + 'var BZ_ITEMFX = ' + JSON.stringify(ITEMFX) + ';\n\n'
  + server + '\n\n' + impl;
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
  const catchCodes = {};
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
    // SOTA R15 §1 第 1 条 / Q3：每个动作都要有 catchCode，且**由脚本推导不许手填**。
    //   推导在文件顶部 deriveCatchCodes() 做完并已注入产物；这里只验"注入值 == 重算值"
    //   以及"JSON 里若写了 catchCode，必须与推导一致"（手填即红）。
    const derived = CATCH_CODES[act];
    if (entry.catchCode !== undefined && entry.catchCode !== derived) {
      throw new Error('拒绝码表 ' + act + ' 手填 catchCode=' + entry.catchCode + ' 与推导值 ' + derived + ' 不一致（此字段只许脚本推导）');
    }
    catchCodes[act] = derived;
  }
  if (JSON.stringify(catchCodes) !== JSON.stringify(CATCH_CODES)) {
    throw new Error('catchCode 注入值与本轮重算不一致（构建产物与源码脱节？）');
  }
  console.log('CATCH CODES  ' + Object.keys(catchCodes).length + ' 个动作已推导：'
    + Object.keys(catchCodes).map((k) => k + '=' + catchCodes[k]).join(' '));
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

// SOTA R15 反例 4：ISO 断言挡不住"以毫秒数字写进产物"的时间戳（比如以后有人加个 `__meta.genMs`）。
//   注意不能对**整份产物**做这个断言 —— 配置数据里本来就有 214 个 13 位毫秒（活动起止时间），
//   那是真值不是生成时刻。所以只扫"元数据行"：`BZ_SHAPES.__meta` 那一行 + 产物头部注释。
//   规则：元数据行里出现的 13 位毫秒必须全部等于 GEN_NOW。
(function () {
  const metaLine = shapes.split('\n').find((l) => l.indexOf('BZ_SHAPES.__meta') >= 0) || '';
  const bad = (metaLine.match(/\b1[6-9]\d{11}\b/g) || []).filter((v) => v !== '1792612412000');
  if (bad.length) throw new Error('形状元数据里出现非固定时钟的毫秒时间戳（会让 ver 每次变）: ' + bad.join(','));
  const header = out.split('\n').slice(0, 5).join('\n');
  const badH = (header.match(/\b1[6-9]\d{11}\b/g) || []).filter((v) => v !== '1792612412000');
  if (badH.length) throw new Error('产物头部注释里出现毫秒时间戳: ' + badH.join(','));
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
