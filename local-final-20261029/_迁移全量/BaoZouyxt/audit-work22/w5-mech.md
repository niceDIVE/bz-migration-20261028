# w5 机制落地取证报告（bz-oracle v2.2）

- 被查目录：`F:\BaoZouyxt\audit-v22\bz-oracle`（下文所有相对路径以此为根）
- 工人角色：只读取证；只做 grep/抄行/贴原文；不设计、不判断、不给意见、不下结论。
- 方法：glob 定位文件 → read 全文 / grep 关键词，行号均为 read 工具 1 起始行号；摘录格式 `路径:行号 + 原文`，前后各 1 行上下文。除本报告外未创建/修改/删除任何文件。
- "未命中"＝在指定文件里没有该字面字符串；只贴机械相邻事实，不作推断。

---

## 条 1：host\lib\layers.js

| 关键词 | 结果 | 行号 |
|---|---|---|
| noContractIs | 命中 | 126 |
| noProbeIs | 命中 | 63 |
| NO_SAVE | 命中（'L1.NO_SAVE' 字面） | 229 |
| metaEscape | 命中（定义 16，调用 204/230/291） | 16, 204, 230, 291 |
| require-save | 命中（仅注释 228；代码形态为 229 的 `requireSave`） | 228 |
| L1.NO_CONTRACT | 命中 | 126 |
| L0.NO_PROBE | 命中 | 63 |

```
host\lib\layers.js:62:  const allow = (ctx.cfg.toastAllow || []).map(re);
host\lib\layers.js:63:  if (c.probe && c.probe.mode === 'none') out.push(F('L0', ctx.cfg.noProbeIs || 'FAIL', 'L0.NO_PROBE', '设备探针未挂上监听器，异常不可见：这个用例的 PASS 不含 L0'));
host\lib\layers.js:64:  if (c.probe && c.probe.mode === 'offline-replay') out.push(F('L0', 'INFO', 'L0.NOT_RUN', '离线回放：L0（异常/提示）未参与'));
```
（noProbeIs 与 L0.NO_PROBE 同在 63 行）

```
host\lib\layers.js:15:  // case 作者（录制、HAR、生成器回放）无法自行关闭检查；被忽略的豁免报 WARN L*.META_IGNORED。
host\lib\layers.js:16:  function metaEscape(c, ctx, key, out, layer) {
host\lib\layers.js:17:    const want = c.meta && c.meta[key];
```

```
host\lib\layers.js:204:    if (v[0] === 0 && !metaEscape(c, ctx, 'abolish', out, 'L1')) out.push(F('L1', 'FAIL', 'L1.SKCH_LV0', `skch[${id}] lv=0 → 客户端 abolishSkill 删技能（index.js:119835）`, { path: `note.skch.${id}` }));
```
（204 行前：`203: if (!Array.isArray(v) || v.length !== 3 || !v.every(Number.isInteger)) { out.push(F('L1', 'FAIL', 'L1.SKCH_SHAPE', ...)); continue; }`；后：`205: if (after && after.skills && after.skills[id] && v[0] > 0) {`）

```
host\lib\layers.js:125:  // 中层审计 A2#1：无契约 = L1 零字段检查，默认判 FAIL（cfg.noContractIs 可降级；HAR 取证类用 --layers 另行处理）
host\lib\layers.js:126:  out.push(F('L1', ctx.cfg.noContractIs || 'FAIL', 'L1.NO_CONTRACT', `动作 ${c.action} 没有契约（不在 M2/M1 映射里，可能是 HttpConst3 等未入表常量）：字段检查为零，不能判 PASS`));
host\lib\layers.js:127:  } else {
```
（noContractIs 与 L1.NO_CONTRACT 同在 126 行）

```
host\lib\layers.js:228:  // 中层审计 A2#4：无存档 = 绝对值/完备性/L5 全盲，至少显式标出（--require-save 时判 FAIL）
host\lib\layers.js:229:  if (!before || !after) out.push(F('L1', ctx.requireSave ? 'FAIL' : 'WARN', 'L1.NO_SAVE', '用例不带 saveBefore/saveAfter：IVCH_ABS / ECO_ABS / NOTE_MISSING_* / L5 均未检查'));
host\lib\layers.js:230:  if (before && after && c.resp && c.resp.eRet === 1 && !metaEscape(c, ctx, 'fullReload', out, 'L1')) {
```
（NO_SAVE 在 229；require-save 字面在 228 注释；metaEscape 第三处调用在 230）

```
host\lib\layers.js:290:  const out = [];
host\lib\layers.js:291:  const allow = new Set(metaEscape(c, ctx, 'l4Allow', out, 'L4'));
host\lib\layers.js:292:  const ignore = p => {
```

```
host\lib\layers.js:203:    if (!Array.isArray(v) || v.length !== 3 || !v.every(Number.isInteger)) { out.push(F('L1', 'FAIL', 'L1.SKCH_SHAPE', `skch[${id}] 不是 [lv,pgr,brlv] 三整数`)); continue; }
host\lib\layers.js:204:    if (v[0] === 0 && !metaEscape(c, ctx, 'abolish', out, 'L1')) out.push(F('L1', 'FAIL', 'L1.SKCH_LV0', `skch[${id}] lv=0 → 客户端 abolishSkill 删技能（index.js:119835）`, { path: `note.skch.${id}` }));
host\lib\layers.js:205:    if (after && after.skills && after.skills[id] && v[0] > 0) {
```

## 条 2：host\judge.js

| 关键词 | 结果 | 行号 |
|---|---|---|
| require-save | 命中 | 5（注释）、107（`a['require-save']`） |
| noSave | 命中（标识符 `noSaveCases`，非独立词） | 72、116 |
| summary | 命中 | 66（键）、116（`rep.summary`） |

```
host\judge.js:4:  //        [--tables <dir 或 json>] [--templates core/templates.json] [--rules config/rules.json]
host\judge.js:5:  //        [--layers L0,L1,L2,L3,L4,L5] [--require-coverage] [--require-save] [--out out/report.json] [--quiet]
host\judge.js:6:  // 退出码：0 全部 PASS；1 有 FAIL；2 用法/输入错误
```

```
host\judge.js:71:      // 中层审计 A2#4/#5：没有存档或没有探针的用例单列，它们的 PASS 不含数值检查 / L0
host\judge.js:72:      noSaveCases: cases.filter(c => !c.saveBefore || !c.saveAfter).length,
host\judge.js:73:      noProbeCases: cases.filter(c => !c.probe || c.probe.mode === 'none' || c.probe.mode === 'offline-replay').length,
```

```
host\judge.js:65:    verdict: fails ? 'FAIL' : 'PASS',
host\judge.js:66:    summary: {
host\judge.js:67:      cases: cases.length,
```

```
host\judge.js:106:  const cases = loadCases(a.cases);
host\judge.js:107:  const rep = judgeCases(cases, ctx, { layers: a.layers, requireCoverage: !!a['require-coverage'], requireSave: !!a['require-save'] });
host\judge.js:108:  if (a.out) writeJSON(a.out, rep);
```

```
host\judge.js:115:    for (const x of rep.cross) if (x.level !== 'INFO') console.log(`  [跨用例] ${x.level} ${x.code} ${x.msg}`);
host\judge.js:116:    console.log(`\n结论 ${rep.verdict}：${rep.summary.pass}/${rep.summary.cases} 用例通过，跨用例 FAIL ${rep.summary.crossFail}；无存档 ${rep.summary.noSaveCases}，无探针 ${rep.summary.noProbeCases}`);
host\judge.js:117:  }
```

## 条 3：config\oracle.config.json

| 关键词 | 结果 | 行号 |
|---|---|---|
| metaEscapes | 命中 | 87（及 19/23 的 layers.js 侧引用见条 1） |
| noContractIs | 命中 | 83 |
| noProbeIs | 命中 | 85 |

键名清单＝全文逐行（98 行，原文照贴）：

```
config\oracle.config.json:1:  {
config\oracle.config.json:2:    "_说明": "裁判配置。标 TODO 的项需按仓库真实值替换；其余取自 R21 材料，括号里是出处。",
config\oracle.config.json:3:    "payActionRe": "(?i)(pay|recharge|order|product|wxPay|aliPay|IphonePay|IosChooseProduct|PaymentCallBack|getPaySginData|h5Pay)",
config\oracle.config.json:4:    "_payActionRe_TODO": "替换为 bz-rpc-server.js 里真实的 PAY_ACTION_RE（全量 §二）；默认正则只是按 M1 动作名猜的",
config\oracle.config.json:5:    "payBlockedERet": 4,
config\oracle.config.json:6:    "noteKeys": {
config\oracle.config.json:7:      "known": [
config\oracle.config.json:8:        "ivch",
config\oracle.config.json:9:        "eqch",
config\oracle.config.json:10:       "eco",
config\oracle.config.json:11:       "skch",
config\oracle.config.json:12:       "attrch",
config\oracle.config.json:13:       "gemch"
config\oracle.config.json:14:     ],
config\oracle.config.json:15:     "_来源": "M4 §0 五键 + M2 scripts3.js:24482 的 note.gemch"
config\oracle.config.json:16:   },
config\oracle.config.json:17:   "eco": {
config\oracle.config.json:18:     "keys": [
config\oracle.config.json:19:       "coins",
config\oracle.config.json:20:       "ptt",
config\oracle.config.json:21:       "gold",
config\oracle.config.json:22:       "exp",
config\oracle.config.json:23:       "chips",
config\oracle.config.json:24:       "yuanbao"
config\oracle.config.json:25:     ],
config\oracle.config.json:26:     "saveMap": {
config\oracle.config.json:27:       "coins": "coins",
config\oracle.config.json:28:       "ptt": "potential",
config\oracle.config.json:29:       "gold": "gold",
config\oracle.config.json:30:       "yuanbao": "yuanbao",
config\oracle.config.json:31:       "chips": "chip"
config\oracle.config.json:32:     },
config\oracle.config.json:33:     "_来源": "M4 §3 已证子键；saveMap 来自 M3 §1"
config\oracle.config.json:34:   },
config\oracle.config.json:35:   "attrch": {
config\oracle.config.json:36:     "known": [
config\oracle.config.json:37:       "mpTrained",
config\oracle.config.json:38:       "mpbase",
config\oracle.config.json:39:       "hpbase",
config\oracle.config.json:40:       "curmp",
config\oracle.config.json:41:       "curhp",
config\oracle.config.json:42:       "hplmt",
config\oracle.config.json:43:       "exp",
config\oracle.config.json:44:       "evil",
config\oracle.config.json:45:       "school",
config\oracle.config.json:46:       "seniorSchool",
config\oracle.config.json:47:       "ndeath",
config\oracle.config.json:48:       "hunger"
config\oracle.config.json:49:     ],
config\oracle.config.json:50:     "unknownIs": "WARN",
config\oracle.config.json:51:     "hungerMax": 10000000,
config\oracle.config.json:52:     "_来源": "M4 §5；switch 未读到结尾（M4 §7.1），所以未知键只报 WARN"
config\oracle.config.json:53:   },
config\oracle.config.json:54:   "currencyItemIds": [
config\oracle.config.json:55:     1,
config\oracle.config.json:56:     4001,
config\oracle.config.json:57:     4002,
config\oracle.config.json:58:     4003,
config\oracle.config.json:59:     8888
config\oracle.config.json:60:   ],
config\oracle.config.json:61:   "_currency来源": "全量 §七 货币 id → 钱包；货币不得进背包（M4 §3 已知坑）",
config\oracle.config.json:62:   "paidCurrencyKeys": [
config\oracle.config.json:63:     "yuanbao"
config\oracle.config.json:64:   ],
config\oracle.config.json:65:   "volatileKeyRe": "([Tt]ime|[Ss]tamp|^now$|^ts$|serverT)",
config\oracle.config.json:66:   "idKeyRe": "^(roleID|account|uid|token|sessionId)$",
config\oracle.config.json:67:   "snapshotDomains": [
config\oracle.config.json:68:     "bag",
config\oracle.config.json:69:     "wallet",
config\oracle.config.json:70:     "skills",
config\oracle.config.json:71:     "equips",
config\oracle.config.json:72:     "attrs"
config\oracle.config.json:73:   ],
config\oracle.config.json:74:   "l2": {
config\oracle.config.json:75:     "expectedFromSave": {
config\oracle.config.json:76:       "bag": "save.bag (去掉 0 值)",
config\oracle.config.json:77:       "wallet": "eco.saveMap 映射",
config\oracle.config.json:78:       "skills": "save.skills",
config\oracle.config.json:79:       "equips": "save.playerEquip"
config\oracle.config.json:80:     }
config\oracle.config.json:81:   },
config\oracle.config.json:82:   "toastAllow": [],
config\oracle.config.json:83:   "noContractIs": "FAIL",
config\oracle.config.json:84:   "_noContractIs": "中层审计 A2#1：无契约动作字段检查为零，默认 FAIL；只做取证判级（HAR、--layers L1）时可临时改 WARN",
config\oracle.config.json:85:   "noProbeIs": "FAIL",
config\oracle.config.json:86:   "_noProbeIs": "中层审计 A2#5：probe.mode=none 时 L0 失明，默认 FAIL",
config\oracle.config.json:87:   "metaEscapes": {
config\oracle.config.json:88:     "_说明": "中层审计 A2#2：case.meta 豁免只在这里登记过才生效。每条必须写 why（证据行号）；不在此表的 meta.abolish / fullReload / l4Allow 一律忽略并报 META_IGNORED",
config\oracle.config.json:89:     "User.LoadGame": {
config\oracle.config.json:90:       "fullReload": true,
config\oracle.config.json:91:       "why": "全量重建路径：客户端 LoadGame 整体重建状态，不走 note（R21 全量 §八）"
config\oracle.config.json:92:     },
config\oracle.config.json:93:     "User.sycnPlayerItemData": {
config\oracle.config.json:94:       "fullReload": true,
config\oracle.config.json:95:       "why": "全量 itemObj 同步，客户端整表替换（R21 全量 §八）"
config\oracle.config.json:96:     }
config\oracle.config.json:97:   }
config\oracle.config.json:98: }
```

（缩进以原文件为准，上表前导空格数为本报告排版；原文各行内容逐字未改。）

## 条 4：config\stub-deny.json

命中＝文件存在；全文 5 行照贴：

```
config\stub-deny.json:1: {
config\stub-deny.json:2:   "_说明": "中层审计 A3 S3/S4：契约推不出、但人工确认"兜底成功会卡死或崩"的动作和字段。actions: 动作 → 原因（含 M2/M4 行号）；fieldRe: 字段名正则，命中的字段 heuristic 一律不发。现为空表：待真实客户端取证后逐条登记，不按名字猜。",
config\stub-deny.json:3:   "actions": {},
config\stub-deny.json:4:   "fieldRe": null
config\stub-deny.json:5: }
```

机械事实：`actions` 为空对象、`fieldRe` 为 null（原文字面）。

## 条 5：forge\lib\stub.js

| 关键词 | 结果 | 行号 |
|---|---|---|
| truthy | 命中 | 41 |
| deny | 命中 | 20（denyList）、31、32、33 |
| stub-deny | 命中 | 20 |
| switch | 命中 | 3（注释）、41 |

```
forge\lib\stub.js:2:  // 兜底 handler：没有真实现的动作按契约生成"中性应答"，并记录命中次数（= 被动录制的优先级来源）。
forge\lib\stub.js:3:  // 原则：开关字段（switch:true）一律不发；不写存档；不发 note；付费动作回 payBlockedERet。
forge\lib\stub.js:4:  // 字段取值策略：
```

```
forge\lib\stub.js:19:  // 人工登记的禁兜底动作/字段（S3 后续推送依赖、S4 无 required 但回空即崩，如 parseEq 链 M4:69）
forge\lib\stub.js:20:  function denyList() { try { return require(path.resolve(__dirname, '../../config/stub-deny.json')); } catch (e) { return { actions: {}, fieldRe: null }; } }
forge\lib\stub.js:21:  
```
（stub-deny 与 denyList 同在 20 行；21 行为空行）

```
forge\lib\stub.js:30:    if (payRe.test(action)) return { body: { eRet: opt.payBlockedERet ?? PAY.eRet ?? 4 }, why: 'pay' };
forge\lib\stub.js:31:    const deny = opt.deny || denyList();
forge\lib\stub.js:32:    if (deny.actions && deny.actions[action]) return { body: { eRet: 1 }, why: 'denied', guessed: [], unsafe: true, deniedWhy: deny.actions[action] };
forge\lib\stub.js:33:    const fieldDeny = deny.fieldRe ? new RegExp(deny.fieldRe) : null;
```

```
forge\lib\stub.js:40:        // 中层审计 A3#1：真值测试读（if (o.x) / o.x && …）缺席=假、空容器=真，发了会翻转分支 → 不发
forge\lib\stub.js:41:        if (spec.switch || spec.truthy || !spec.plain || spec.fk || spec.nested) continue;
forge\lib\stub.js:42:        if (fieldDeny && fieldDeny.test(f)) continue;
```
（truthy 与 switch 同在 41 行）

## 条 6：forge\lib\gen-gate.js（全文抄录，69 行）

```
forge\lib\gen-gate.js:1:  'use strict';
forge\lib\gen-gate.js:2:  // 生成代码静态闸（中层审计 A6）：LLM 产出的 handler 文件在 require 之前必须通过。
forge\lib\gen-gate.js:3:  // 规则（命中任一即拒绝，原因写进 feedback）：
forge\lib\gen-gate.js:4:  //   G1 require 只能是静态字符串（字面量或字面量相加），且只能指向 forge/lib/projector、forge/lib/rules-dsl 或 *.json（只读数据）
forge\lib\gen-gate.js:5:  //   G2 禁用标识符：process global globalThis eval Function child_process fs __dirname __filename Buffer setTimeout setInterval setImmediate Proxy Reflect WebAssembly
forge\lib\gen-gate.js:6:  //   G3 禁止 import()、new Function、with、对 require/module 本身的非调用使用（如 module.constructor、require.cache）
forge\lib\gen-gate.js:7:  //   G5 不得自定义 withProjection / compileAction（冒充投射包装）
forge\lib\gen-gate.js:8:  //   G4 module.exports 只能赋一次，且必须形如 { action: '<字面量>', handler: withProjection(...) | compileAction(...) }
forge\lib\gen-gate.js:9:  const acorn = require('acorn');
forge\lib\gen-gate.js:10: const walk = require('acorn-walk');
forge\lib\gen-gate.js:11: const BANNED = new Set(['process', 'global', 'globalThis', 'eval', 'Function', 'child_process', 'fs', '__dirname', '__filename', 'Buffer',
forge\lib\gen-gate.js:12:   'setTimeout', 'setInterval', 'setImmediate', 'Proxy', 'Reflect', 'WebAssembly', 'XMLHttpRequest', 'fetch']);
forge\lib\gen-gate.js:13: const REQ_OK = /(\/forge\/lib\/(projector|rules-dsl)(\.js)?$|^\.\.?\/.*lib\/(projector|rules-dsl)(\.js)?$|\.json$)/;
forge\lib\gen-gate.js:14: function staticStr(n) {
forge\lib\gen-gate.js:15:   if (n.type === 'Literal' && typeof n.value === 'string') return n.value;
forge\lib\gen-gate.js:16:   if (n.type === 'TemplateLiteral' && !n.expressions.length) return n.quasis[0].value.cooked;
forge\lib\gen-gate.js:17:   if (n.type === 'BinaryExpression' && n.operator === '+') { const l = staticStr(n.left), r = staticStr(n.right); return l === null || r === null ? null : l + r; }
forge\lib\gen-gate.js:18:   return null;
forge\lib\gen-gate.js:19: }
forge\lib\gen-gate.js:20: function gate(code, opt = {}) {
forge\lib\gen-gate.js:21:   const why = [];
forge\lib\gen-gate.js:22:   let ast;
forge\lib\gen-gate.js:23:   try { ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', locations: true }); } catch (e) { return { ok: false, why: ['G0 语法错误：' + e.message] }; }
forge\lib\gen-gate.js:24:   let exportsN = 0;
forge\lib\gen-gate.js:25:   walk.fullAncestor(ast, (n, _s, anc) => {
forge\lib\gen-gate.js:26:     const at = n.loc ? `:${n.loc.start.line}` : '';
forge\lib\gen-gate.js:27:     if (n.type === 'Identifier' && BANNED.has(n.name)) {
forge\lib\gen-gate.js:28:       const p = anc[anc.length - 2];
forge\lib\gen-gate.js:29:       const isKey = p && ((p.type === 'MemberExpression' && p.property === n && !p.computed) || (p.type === 'Property' && p.key === n && !p.computed));
forge\lib\gen-gate.js:30:       if (!isKey) why.push(`G2 禁用标识符 ${n.name}${at}`);
forge\lib\gen-gate.js:31:     }
forge\lib\gen-gate.js:32:     // G5 不得自定义同名函数冒充投射包装（e5 反例；WeakSet 是第二道闸）
forge\lib\gen-gate.js:33:     if ((n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression') && n.id && ['withProjection', 'compileAction'].includes(n.id.name)) why.push(`G5 自定义 ${n.id.name}${at}`);
forge\lib\gen-gate.js:34:     if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && ['withProjection', 'compileAction'].includes(n.id.name)) why.push(`G5 自定义 ${n.id.name}${at}`);
forge\lib\gen-gate.js:35:     if (n.type === 'ImportExpression') why.push(`G3 禁止 import()${at}`);
forge\lib\gen-gate.js:36:     if (n.type === 'WithStatement') why.push(`G3 禁止 with${at}`);
forge\lib\gen-gate.js:37:     if (n.type === 'NewExpression' && n.callee.type === 'Identifier' && n.callee.name === 'Function') why.push(`G3 禁止 new Function${at}`);
forge\lib\gen-gate.js:38:     if (n.type === 'Identifier' && n.name === 'require') {
forge\lib\gen-gate.js:39:       const p = anc[anc.length - 2];
forge\lib\gen-gate.js:40:       if (!(p && p.type === 'CallExpression' && p.callee === n)) { why.push(`G3 require 非调用使用${at}`); return; }
forge\lib\gen-gate.js:41:       const s = p.arguments[0] && staticStr(p.arguments[0]);
forge\lib\gen-gate.js:42:       if (s === null || s === undefined) why.push(`G1 require 参数不是静态字符串${at}`);
forge\lib\gen-gate.js:43:       else if (!REQ_OK.test(s)) why.push(`G1 require 目标不在白名单：${s}${at}`);
forge\lib\gen-gate.js:44:     }
forge\lib\gen-gate.js:45:     if (n.type === 'MemberExpression' && n.object.type === 'Identifier' && n.object.name === 'module') {
forge\lib\gen-gate.js:46:       const prop = n.computed ? null : n.property.name;
forge\lib\gen-gate.js:47:       if (prop !== 'exports') why.push(`G3 访问 module.${prop || '[…]'}${at}`);
forge\lib\gen-gate.js:48:     }
forge\lib\gen-gate.js:49:     if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression' && n.left.object.name === 'module' && !n.left.computed && n.left.property.name === 'exports') {
forge\lib\gen-gate.js:50:       exportsN++;
forge\lib\gen-gate.js:51:       const r = n.right;
forge\lib\gen-gate.js:52:       const prop = k => r.type === 'ObjectExpression' && r.properties.find(x => x.key && (x.key.name === k || x.key.value === k));
forge\lib\gen-gate.js:53:       const act = prop('action'), h = prop('handler');
forge\lib\gen-gate.js:54:       if (!act || staticStr(act.value) === null) why.push(`G4 module.exports.action 必须是字符串字面量${at}`);
forge\lib\gen-gate.js:55:       else if (opt.action && staticStr(act.value) !== opt.action) why.push(`G4 action=${staticStr(act.value)} 与本轮动作 ${opt.action} 不符${at}`);
forge\lib\gen-gate.js:56:       const callee = h && h.value.type === 'CallExpression' && h.value.callee;
forge\lib\gen-gate.js:57:       const cname = callee && (callee.type === 'Identifier' ? callee.name : callee.type === 'MemberExpression' && !callee.computed ? callee.property.name : null);
forge\lib\gen-gate.js:58:       if (!h || !['withProjection', 'compileAction'].includes(cname)) why.push(`G4 handler 必须是 withProjection(...) 或 compileAction(...) 的直接结果${at}`);
forge\lib\gen-gate.js:59:     }
forge\lib\gen-gate.js:60:   });
forge\lib\gen-gate.js:61:   if (exportsN !== 1) why.push(`G4 module.exports 赋值 ${exportsN} 次（应恰为 1 次）`);
forge\lib\gen-gate.js:62:   return { ok: !why.length, why: [...new Set(why)] };
forge\lib\gen-gate.js:63: }
forge\lib\gen-gate.js:64: module.exports = { gate };
forge\lib\gen-gate.js:65: if (require.main === module) {
forge\lib\gen-gate.js:66:   const fs = require('fs'); let bad = 0;
forge\lib\gen-gate.js:67:   for (const f of process.argv.slice(2)) { const r = gate(fs.readFileSync(f, 'utf8')); console.log(`${r.ok ? '✔' : '✘'} ${f}${r.ok ? '' : '\n    ' + r.why.join('\n    ')}`); if (!r.ok) bad++; }
forge\lib\gen-gate.js:68:   process.exit(bad ? 1 : 0);
forge\lib\gen-gate.js:69: }
```

## 条 7：forge\agent\nightly.js

| 关键词 | 结果 | 行号 |
|---|---|---|
| fuzz | 命中 | 5（注释）、17（require）、74、79、81、88、93 |
| gen-gate | 命中 | 18 |
| sha256 | 命中 | 42 |
| viaOk | 命中 | 87、89 |
| byVia | 命中 | 87、92 |
| strict | 命中（`strictRegress`；注释含 `--no-strict-regress`） | 5、37、89、94 |
| regress | 命中（`rep.regress`、`regressions`） | 71、94、95 |

```
forge\agent\nightly.js:4:  // node forge/agent/nightly.js --registry out/registry.json --recordings <case目录> --gen "<命令>" [--limit 20] [--tries 3]
forge\agent\nightly.js:5:  //      [--loose] [--no-fuzz] [--no-strict-regress]（默认：静态闸 + 严格加载 + 存档域白名单 + 输入冻结 + fuzz + 回归判死 全开）
forge\agent\nightly.js:6:  //      [--status GEN-READY,RULE,IMPL-FAIL] [--generated forge/generated] [--dsl ...] [--tables ...] [--rules ...] [--log out/nightly.jsonl]
```

```
forge\agent\nightly.js:16:  const { replay } = require('../replay/replay');
forge\agent\nightly.js:17:  const fuzz = require('../replay/fuzz');
forge\agent\nightly.js:18:  const { gate } = require('../lib/gen-gate');
```
（fuzz 在 17、gen-gate 在 18）

```
forge\agent\nightly.js:41:  const h = crypto.createHash('sha256');
```
（41 行前：`40: function hashTree(p) {`；后：`42:   const st = fs.statSync(p);`）

```
forge\agent\nightly.js:70:     try { rep = replay({ recordings: a.recordings, action: r.action, generated: genDir, dsl: a.dsl, tables: a.tables, rules: a.rules, templates: a.templates, contracts: a.contracts, strictGenerated: !loose, requireSave: !loose }); }
forge\agent\nightly.js:71:     catch (e) { rep = { verdict: 'FAIL', perCase: [{ fails: ['回放异常：' + e.message] }], regress: [] }; }
forge\agent\nightly.js:72:     // 边界 fuzz 闸：参数名取自录制请求，id 取录制里的值（中层审计 A6#6：防止只对录制样本过拟合）
```

```
forge\agent\nightly.js:73:     let fz = null;
forge\agent\nightly.js:74:     if (!loose && rep.verdict === 'PASS' && firstRec[r.action] && !a['no-fuzz']) {
forge\agent\nightly.js:75:       const p0 = (firstRec[r.action].c.req || {}).p || {};
```

```
forge\agent\nightly.js:79:         fz = fuzz.run({ action: r.action, save: firstRec[r.action].file, params: params.join(','), ids: String(Object.entries(p0).filter(([k]) => /id$/i.test(k)).map(([, v]) => v).join(',') || ''),
forge\agent\nightly.js:80:           dsl: a.dsl, tables: a.tables, generated: genDir, contracts: a.contracts, strictGenerated: true });
forge\agent\nightly.js:81:       } catch (e) { fz = { verdict: 'FAIL', fails: [{ fails: ['fuzz 异常：' + e.message] }] }; }
```

```
forge\agent\nightly.js:86:     const nCases = rep.cases || 0;
forge\agent\nightly.js:87:     const viaOk = loose ? !rep.byVia || rep.byVia.generated : !!(rep.byVia && rep.byVia.generated === nCases && nCases > 0);
forge\agent\nightly.js:88:     const fuzzOk = !fz || fz.verdict === 'PASS';
```

```
forge\agent\nightly.js:36:  const loose = !!a.loose;
forge\agent\nightly.js:37:  const strictRegress = !loose && !a['no-strict-regress'];
forge\agent\nightly.js:38:  // 输入冻结：裁判依据（表、规则、契约、DSL、录制）在循环中不得被改动
```

```
forge\agent\nightly.js:88:     const fuzzOk = !fz || fz.verdict === 'PASS';
forge\agent\nightly.js:89:     if (rep.verdict === 'PASS' && viaOk && fuzzOk && !(strictRegress && rep.regressions)) { outcome = i === 1 ? 'PASS-FIRST' : 'PASS-RETRY'; lastFails = []; break; }
forge\agent\nightly.js:90:     lastFails = rep.perCase.flatMap(x => x.fails || []);
```

```
forge\agent\nightly.js:91:     for (const x of rep.rejected || []) lastFails.push(`生成文件被拒：${x.why.join('；')}`);
forge\agent\nightly.js:92:     if (!viaOk) lastFails.push(`生成的 handler 只接管了 ${(rep.byVia || {}).generated || 0}/${nCases} 个用例（其余走了 stub/rule/hand）`);
forge\agent\nightly.js:93:     if (!fuzzOk) lastFails.push(...(fz.fails || []).slice(0, 5).map(x => `fuzz：p=${JSON.stringify(x.p)} ${(x.fails || []).join(',')}`));
```

```
forge\agent\nightly.js:93:     if (!fuzzOk) lastFails.push(...(fz.fails || []).slice(0, 5).map(x => `fuzz：p=${JSON.stringify(x.p)} ${(x.fails || []).join(',')}`));
forge\agent\nightly.js:94:     if (strictRegress && rep.regressions) lastFails.push(...(rep.regress || []).slice(0, 3).map(x => `与录制应答不一致 ${x.id}：${x.diffs.map(d => d.path).join(', ')}`));
forge\agent\nightly.js:95:     fs.writeFileSync(fb, JSON.stringify({ attempt: i, fails: lastFails, regressions: rep.regress }, null, 2));
```

## 条 8：forge\lib\client-model.js（全文抄录，48 行）

| 关键词 | 结果 | 行号 |
|---|---|---|
| UNMODELED | 命中（大写字面在 7 行注释；小写 `unmodeled` 在 26/28/31/39/40/41/43） | 7 |
| type == 1 / type===1 / n.type | 未命中（三个字面均无）；相邻事实：4 行注释含 `type==1`（无空格）、36 行代码含 `cur[0] === 1` | — |
| eqch | 命中 | 4（注释）、33、40 |

```
forge\lib\client-model.js:1:  'use strict';
forge\lib\client-model.js:2:  // 客户端模型模拟器：严格按 M4 的消费语义把 note 应用到一个"客户端视角"的状态上，用来离线做 L2（双路径一致）。
forge\lib\client-model.js:3:  //   ivch  赋值（index.js:64675）　eco  按子键赋值（64698）　skch lv>0 设置 / lv==0 删除（119831-119835）
forge\lib\client-model.js:4:  //   eqch  [0] 删除（64679-64681）；已有且 type==1 的实例只更新 num / weaponSkinId、保留其余本地字段（64683-64686）；
forge\lib\client-model.js:5:  //         否则 parseEq 新建（64688-64690）　attrch 赋值（142390）
forge\lib\client-model.js:6:  // 中层审计 A5（2026-10-23）后的定位：离线 L2 是生成闸门的必要条件，不是真机 L2 的替代。
forge\lib\client-model.js:7:  //   本模型覆盖不了的语义一律报 UNMODELED（不能判 PASS），而不是静默放过或误判不一致：
forge\lib\client-model.js:8:  //   · eco.exp / attrch 中除 hunger 外的键：M3 存档字典里没有对应存档字段（M4:79、M4:109），离线无真值可比
forge\lib\client-model.js:9:  //   · attrch.mpTrained：客户端用 getMaxNGBonus() 夹取（M4:109），夹取上限材料未提供
forge\lib\client-model.js:10: //   · gemch：M2 scripts3.js:24482 有监听，语义未进 M4
forge\lib\client-model.js:11: //   · 存档里投射器不覆盖的域发生变化（titles、vip、任务进度……）
forge\lib\client-model.js:12: //   覆盖不了、也不报的（只有真机能测）：次消费点（ivch 第一键当 shopId M4:50、eco 附派 SHOP_BUY_ITEM M4:80、
forge\lib\client-model.js:13: //   skch 第一键弹窗 M4:96）、键序、子表事件先于协议应答的时序（M4:38）、监听器异常（L0）。
forge\lib\client-model.js:14: const ECO2SAVE = { coins: 'coins', ptt: 'potential', gold: 'gold', yuanbao: 'yuanbao', chips: 'chip' };
forge\lib\client-model.js:15: const ATTR2SAVE = { hunger: 'hunger' };
forge\lib\client-model.js:16: const MODELED_SAVE_DOMAINS = ['bag', ...Object.values(ECO2SAVE), 'skills', 'playerEquip', 'equipments', ...Object.values(ATTR2SAVE), 'hungerMax'];
forge\lib\client-model.js:17: function fromSave(s) {
forge\lib\client-model.js:18:   const m = { bag: {}, wallet: {}, skills: {}, equips: {}, attrs: {} };
forge\lib\client-model.js:19:   for (const [k, v] of Object.entries(s.bag || {})) if (v) m.bag[k] = v;
forge\lib\client-model.js:20:   for (const [e, sk] of Object.entries(ECO2SAVE)) if (typeof s[sk] === 'number') m.wallet[e] = s[sk];
forge\lib\client-model.js:21:   for (const [k, v] of Object.entries(s.skills || {})) m.skills[k] = v.slice();
forge\lib\client-model.js:22:   for (const [k, v] of Object.entries(s.playerEquip || {})) m.equips[k] = JSON.parse(JSON.stringify(v));
forge\lib\client-model.js:23:   for (const [a, sk] of Object.entries(ATTR2SAVE)) if (typeof s[sk] === 'number') m.attrs[a] = s[sk];
forge\lib\client-model.js:24:   return m;
forge\lib\client-model.js:25: }
forge\lib\client-model.js:26: // 返回 unmodeled：本次 note 里离线模型无法判定的部分（调用方必须把它当"不能 PASS"）
forge\lib\client-model.js:27: function applyNote(m, note) {
forge\lib\client-model.js:28:   const unmodeled = [];
forge\lib\client-model.js:29:   if (!note) return { model: m, unmodeled };
forge\lib\client-model.js:30:   for (const [k, v] of Object.entries(note.ivch || {})) { if (v) m.bag[k] = v; else delete m.bag[k]; }
forge\lib\client-model.js:31:   for (const [k, v] of Object.entries(note.eco || {})) { if (k in ECO2SAVE) m.wallet[k] = v; else unmodeled.push(`eco.${k}`); }
forge\lib\client-model.js:32:   for (const [k, v] of Object.entries(note.skch || {})) { if (v[0] > 0) m.skills[k] = v.slice(); else if (v[0] === 0) delete m.skills[k]; }
forge\lib\client-model.js:33:   for (const [k, v] of Object.entries(note.eqch || {})) {
forge\lib\client-model.js:34:     if (v[0] === 0) { delete m.equips[k]; continue; }
forge\lib\client-model.js:35:     const cur = m.equips[k];
forge\lib\client-model.js:36:     if (Array.isArray(cur) && cur[0] === 1) { cur[1] = v[1][1]; if (v[1].length > 2) cur[2] = v[1][2]; } // M4:66 更新分支
forge\lib\client-model.js:37:     else m.equips[k] = JSON.parse(JSON.stringify(v[1]));
forge\lib\client-model.js:38:   }
forge\lib\client-model.js:39:   for (const [k, v] of Object.entries(note.attrch || {})) { if (k in ATTR2SAVE) m.attrs[k] = v; else unmodeled.push(`attrch.${k}`); }
forge\lib\client-model.js:40:   for (const k of Object.keys(note)) if (!['ivch', 'eco', 'skch', 'eqch', 'attrch'].includes(k)) unmodeled.push(`note.${k}`);
forge\lib\client-model.js:41:   return { model: m, unmodeled };
forge\lib\client-model.js:42: }
forge\lib\client-model.js:43: function unmodeledSaveChanges(before, after) {
forge\lib\client-model.js:44:   const A = new Set(MODELED_SAVE_DOMAINS), bad = [];
forge\lib\client-model.js:45:   for (const k of new Set([...Object.keys(before || {}), ...Object.keys(after || {})])) if (!A.has(k) && JSON.stringify(before[k]) !== JSON.stringify(after[k])) bad.push(`save.${k}`);
forge\lib\client-model.js:46:   return bad;
forge\lib\client-model.js:47: }
forge\lib\client-model.js:48: module.exports = { fromSave, applyNote, unmodeledSaveChanges, MODELED_SAVE_DOMAINS };
```

## 条 9：device\sim-test.js

| 关键词 | 结果 | 行号 |
|---|---|---|
| TipsUI | 命中 | 54（定义）、55、60、68 |
| toast | 命中 | 54（注释）、68、96、103 |

```
device\sim-test.js:53:  };
device\sim-test.js:54:  const TipsUI = { show(t) { /* 客户端提示框 */ } };   // 中层审计 A0.2：模拟环境补上提示框，验证 toast 采集链路
device\sim-test.js:55:  const window = { jsb: { fileUtils: files }, MessageCenter, RoleBaseInfo, BZ, TipsUI, console: { error() {}, log() {} }, setTimeout, Date, JSON, Object, Array, Error, String };
```

```
device\sim-test.js:59:  MessageCenter.on('eco', function (t, o) { for (const k in o) if (k === 'coins') RoleBaseInfo.coins = o[k]; else if (k === 'ptt') RoleBaseInfo.potentials = o[k]; });
device\sim-test.js:60:  MessageCenter.on('User.saleItem', function (t, o) { if (o.eRet !== 1) TipsUI.show('出售失败'); });
device\sim-test.js:61:  MessageCenter.on('User.sycnPlayerItemData', function (t, o) { Bag.items = {}; for (const n in o.itemObj) Bag.setItem(+n, o.itemObj[n]); });
```

```
device\sim-test.js:67:     dir: W + 'oracle-' + (bug || 'clean') + '/', pollMs: 50, settleMs: 5, passive: false,
device\sim-test.js:68:     resolve: { toast: ['window.TipsUI'] },
device\sim-test.js:69:     snapshot: {
```

```
device\sim-test.js:95:   let ok = true;
device\sim-test.js:96:   for (const bug of [null, 'delta', 'throw', 'toast']) {
device\sim-test.js:97:     const r = await runProbe(bug);
```

```
device\sim-test.js:102:    let pass = expectFail ? code === 1 : code === 0;
device\sim-test.js:103:    if (bug === 'toast') pass = pass && /L0\.TOAST/.test(txt) && /出售失败/.test(txt) && !!(r.status.resolved && r.status.resolved.toast);
device\sim-test.js:104:    ok = ok && pass;
```

## 条 10：scripts\selftest.sh

**全部 `echo "== N/21` 行（21 行，逐行原文）：**

```
scripts\selftest.sh:8:   echo "== 1/21 生成契约"; node host/build-contracts.js --m2 "$M2" --m1 "$M1" --overrides config/contract-overrides.json --out out/contracts.json | grep -E '"(contracts|closed|open)"'
scripts\selftest.sh:9:   echo "== 2/21 干净用例"; node fixtures/make-fixtures.js >/dev/null
scripts\selftest.sh:11:  echo "== 3/21 变异测试"; node host/mutate.js --cases fixtures/cases --tables fixtures/tables --templates fixtures/templates.json --rules fixtures/rules.json --allow-survivors config/known-survivors.json --out out/mutation.json | tail -2
scripts\selftest.sh:12:  echo "== 4/21 探针端到端"; node device/sim-test.js | tail -1
scripts\selftest.sh:13:  echo "== 5/21 投射器回测（用例里的 note 能否由存档差分自动推出）"; node forge/tools/test-projector.js
scripts\selftest.sh:14:  echo "== 6/21 规则 DSL → handler + 守恒式"; node -e '
scripts\selftest.sh:21:  echo "== 7/21 注册表 + 仪表盘 + 材料计数"; node forge/tools/registry.js --m1 "$M1" --contracts out/contracts.json --cases fixtures/cases --report out/report.json --capture config/capture.json --out out/registry.json --md out/dashboard.md --material out/material-counts.md
scripts\selftest.sh:22:  echo "== 8/21 兜底应答表"; node forge/tools/gen-stubs.js --m1 "$M1" --contracts out/contracts.json --policy heuristic --out out/stubs.json
scripts\selftest.sh:23:  echo "== 9/21 离线回放（兜底不安全的动作必须被裁判拦下）"
scripts\selftest.sh:27:  echo "== 10/21 边界模糊测试（干净实现 PASS，带漏洞实现被抓）"
scripts\selftest.sh:31:  echo "== 11/21 命名处理器展开器 + 请求参数抽取器（合成客户端）"
scripts\selftest.sh:37:  echo "== 12/21 效果族分类器"; node forge/tools/effect-classifier.js --tables forge/fixtures/tables --source item --out out/effects.demo.json
scripts\selftest.sh:39:  echo "== 13/21 夜间生成循环 + 吞吐统计（演示生成器：第 1 轮犯老错，第 2 轮按裁判意见修正）"
scripts\selftest.sh:44:  echo "== 14/21 存档体检 + 构建指纹"
scripts\selftest.sh:50:  echo "== 15/21 AST 展开器对抗测试（刁钻样例 + 审计 6 反例 + terser 压缩改名后结果一致；正则引擎永不判闭合）"; node forge/tools/test-expander.js | grep -E '^✔ (ast/|regex：)'
scripts\selftest.sh:51:  echo "== 16/21 状态机模型测试（fast-check 随机动作序列 + 离线 L2；老错自动缩成最短复现）"
scripts\selftest.sh:55:  echo "== 17/21 HAR 抓包 → 用例/模板"; rm -rf out/captured
scripts\selftest.sh:58:  echo "== 18/21 审计假 PASS 反例库（A2：无契约 / meta 豁免 ×3 / 探针缺位 / 无存档，必须逐条 FAIL 且原因对）"
scripts\selftest.sh:69:  echo "== 19/21 生成代码闸（A6：静态闸 7 个逃逸样本全拒；冒充 withProjection 被 WeakSet 拦；改投射外存档域被拦）"
scripts\selftest.sh:79:  echo "== 20/21 客户端模型 M4 单点断言（A5：eco.exp / attrch 非 hunger / gemch → UNMODELED；eqch 更新分支）"; node forge/tools/test-client-model.js | tail -1
scripts\selftest.sh:80:  echo "== 21/21 夜间循环回归判死（A2#6：生成的 saleItem 拒卖装备，与录制不一致 → 必须转人工）"
```

**audit-neg 出现处（2 处）：**
```
scripts\selftest.sh:58:  echo "== 18/21 审计假 PASS 反例库（A2：无契约 / meta 豁免 ×3 / 探针缺位 / 无存档，必须逐条 FAIL 且原因对）"
scripts\selftest.sh:59:  node fixtures/make-audit-neg.js
scripts\selftest.sh:60:  node -e '
```

```
scripts\selftest.sh:61:  const {loadCtx,loadCases,judgeCases}=require("./host/judge");const T={tables:"fixtures/tables",templates:"fixtures/templates.json",rules:"fixtures/rules.json"};
scripts\selftest.sh:62:  const ctx=loadCtx(T,process.cwd());const cs=loadCases("fixtures/audit-neg");
scripts\selftest.sh:63:  const want={"audit.fp1.no-contract":"FAIL L1.NO_CONTRACT","audit.fp2a.abolish":"FAIL L1.SKCH_LV0","audit.fp2b.fullreload":"FAIL L1.NOTE_MISSING_IVCH","audit.fp2c.l4allow":"FAIL L4.DIFF","audit.fp3.probe-none":"FAIL L0.NO_PROBE","audit.fp4.no-save":"FAIL L1.NO_SAVE"};
```

**gen-evil 出现处（4 处）：**
```
scripts\selftest.sh:69:  echo "== 19/21 生成代码闸（A6：静态闸 7 个逃逸样本全拒；冒充 withProjection 被 WeakSet 拦；改投射外存档域被拦）"
scripts\selftest.sh:70:  set +e; node forge/lib/gen-gate.js forge/fixtures/gen-evil/*.js >/tmp/gate.txt; set -e
scripts\selftest.sh:71:  [ "$(grep -c '^✘' /tmp/gate.txt)" = "$(ls forge/fixtures/gen-evil/*.js | wc -l)" ] || { cat /tmp/gate.txt; echo "静态闸漏拒"; exit 1; }
```

```
scripts\selftest.sh:73:  const {loadGenerated,createForgeServer}=require("./forge/replay/server");const fs=require("fs"),os=require("os");
scripts\selftest.sh:74:  const d=fs.mkdtempSync(os.tmpdir()+"/ev");fs.copyFileSync("forge/fixtures/gen-evil/e5-shadow.js",d+"/a.js");fs.copyFileSync("forge/fixtures/gen-evil/e4-bare.js",d+"/b.js");
scripts\selftest.sh:75:  const H=loadGenerated(d,{strict:true});if(Object.keys(H).length||H.__rejected.length!==2)throw new Error("严格加载没拦住 "+JSON.stringify(H.__rejected));
```

```
scripts\selftest.sh:77:  let caught=false;try{srv.dispatch({mod:"User",do:"saleItem",p:{itemID:2001,num:1}})}catch(e){caught=/titles/.test(e.message)}if(!caught)throw new Error("存档域白名单没拦住");
scripts\selftest.sh:78:  console.log("PASS（静态闸拒 "+fs.readdirSync("forge/fixtures/gen-evil").length+"/"+fs.readdirSync("forge/fixtures/gen-evil").length+"；严格加载拒 2/2；titles 域改动被拦）")'
scripts\selftest.sh:79:  echo "== 20/21 客户端模型 M4 单点断言（A5：eco.exp / attrch 非 hunger / gemch → UNMODELED；eqch 更新分支）"; node forge/tools/test-client-model.js | tail -1
```

**stub-unsafe 出现处（1 处）：**
```
scripts\selftest.sh:25:  node -e 'const r=require("./out/replay-report.json");const f=r.perCase.filter(x=>x.verdict==="FAIL").map(x=>x.action).sort().join(",");
scripts\selftest.sh:26:  if(f!=="User.LoadGame,User.sycnPlayerItemData"||r.byVia["stub-unsafe"]!==2)throw new Error("预期只拦 LoadGame/sycnPlayerItemData，实为 "+f);console.log("PASS（"+r.cases+" 个请求，"+JSON.stringify(r.byVia)+"；被拦："+f+"）")'
scripts\selftest.sh:27:  echo "== 10/21 边界模糊测试（干净实现 PASS，带漏洞实现被抓）"
```

## 条 11：forge\tools\test-expander.js

| 关键词 | 结果 | 行号 |
|---|---|---|
| CX1 | 命中（`CX1_FORIN`） | 15 |
| CX2 | 命中（`CX2_BUILTIN`） | 16 |
| CX3 | 命中（`CX3_HOPVAR`） | 17 |
| CX4 | 命中（`CX4_INVAR`） | 18 |
| CX5 | 命中（`CX5_SHAREDA`/`CX5_SHAREDB`） | 19、20 |
| rewardObj | 命中 | 11、21 |
| for-in | 未命中（字面无）；相邻事实：15 行标识符为 `CX1_FORIN` | — |

```
forge\tools\test-expander.js:9:   const EXPECTS = { hard: {
forge\tools\test-expander.js:10:   ROLE_INFO: { closed: true, fields: { roleInfo: false, bagList: false, guildObj: true }, sub: { roleInfo: ['lv'], bagList: ['cap'], guildObj: ['id', 'name'] } },
forge\tools\test-expander.js:11:   GET_REWARD: { closed: true, fields: { eRet: false, rewardObj: false, vipLv: true, coins: false }, absent: ['notResp'] },
forge\tools\test-expander.js:12:   LEAKY: { closed: false },
```

```
forge\tools\test-expander.js:13: }, cx: {
forge\tools\test-expander.js:14:   // 中层审计 A4 六反例：期望值由审计报告给出（非实现者自定）
forge\tools\test-expander.js:15:   CX1_FORIN: { closed: false },
forge\tools\test-expander.js:16:   CX2_BUILTIN: { closed: true, fields: { keys: false, length: false, map: false }, truthy: ['map'] },
forge\tools\test-expander.js:17:   CX3_HOPVAR: { closed: false },
forge\tools\test-expander.js:18:   CX4_INVAR: { closed: false },
forge\tools\test-expander.js:19:   CX5_SHAREDA: { closed: false },
forge\tools\test-expander.js:20:   CX5_SHAREDB: { closed: false },
forge\tools\test-expander.js:21:   CX6_TRUTHY: { closed: true, fields: { rewardObj: false, vipLv: false }, truthy: ['rewardObj'], notTruthy: ['vipLv'] },
forge\tools\test-expander.js:22: } };
```

```
forge\tools\test-expander.js:22: } };
forge\tools\test-expander.js:23: let EXPECT;
forge\tools\test-expander.js:24: function contractsFor(code, file) {
```

**EXPECT 键名清单（机械抄录自 EXPECTS 字面）：**
- hard 组（行 10-12）：`ROLE_INFO`、`GET_REWARD`、`LEAKY`
- cx 组（行 15-21）：`CX1_FORIN`、`CX2_BUILTIN`、`CX3_HOPVAR`、`CX4_INVAR`、`CX5_SHAREDA`、`CX5_SHAREDB`、`CX6_TRUTHY`

## 条 12：make-audit-neg.js 与 fixtures\audit-neg\ 六个 json 的 id

- **`forge\tools\make-audit-neg.js`：未命中**（该路径不存在；glob `**/make-audit-neg.js` 全目录仅一处置于根级 `fixtures\make-audit-neg.js`，与工单写的 `forge\tools\` 不符，按事实记录）。
- **`forge\fixtures\audit-neg\`：未命中**（不存在）；实际目录为根级 `fixtures\audit-neg\`，六个 json 均在。

生成器（实际位置）id 写入行：
```
fixtures\make-audit-neg.js:2:  // 中层审计（2026-10-23）A2 假 PASS 复现 → 反例用例库。每个用例都必须被裁判判 FAIL（selftest 第 18 步）。
fixtures\make-audit-neg.js:6:  const D = path.join(__dirname, 'audit-neg');
fixtures\make-audit-neg.js:7:  fs.rmSync(D, { recursive: true, force: true }); fs.mkdirSync(D, { recursive: true });
```
```
fixtures\make-audit-neg.js:14:  put('fp1-no-contract', strip({ ...JSON.parse(JSON.stringify(c02)), id: 'audit.fp1.no-contract', action: 'User.GhostAction', req: { mod: 'User', do: 'GhostAction', p: {} },
fixtures\make-audit-neg.js:15:    resp: { eRet: 1, anythingJunk: { deep: [1, 2] } }, envelope: undefined, snapA: undefined, snapB: undefined, saveAfter: c02.saveBefore }));
```
```
fixtures\make-audit-neg.js:17:  { const c = JSON.parse(JSON.stringify(c01)); c.id = 'audit.fp2a.abolish'; const sid = Object.keys(c.resp.note.skch)[0];
```
```
fixtures\make-audit-neg.js:20:  { const c = JSON.parse(JSON.stringify(c02)); c.id = 'audit.fp2b.fullreload'; c.resp = { eRet: 1 }; c.meta = { fullReload: true }; delete c.envelope; delete c.snapA; delete c.snapB; put('fp2b-fullreload', strip(c)); }
```
```
fixtures\make-audit-neg.js:22:  { const c = JSON.parse(JSON.stringify(c01)); c.id = 'audit.fp2c.l4allow'; c.resp = { eRet: 1 }; c.meta = { l4Allow: ['note'] };
```
```
fixtures\make-audit-neg.js:25:  { const c = JSON.parse(JSON.stringify(c02)); c.id = 'audit.fp3.probe-none'; c.probe = { mode: 'none' }; put('fp3-probe-none', strip(c)); }
```
```
fixtures\make-audit-neg.js:27:  { const c = JSON.parse(JSON.stringify(c02)); c.id = 'audit.fp4.no-save'; c.resp = { eRet: 1, note: { ivch: { 2001: 999 }, eco: { coins: 123456 } } };
```

六个 json 落盘文件的 id 字段（逐文件，均在第 2 行）：

| 文件 | id 字段值 | 证据 |
|---|---|---|
| fixtures\audit-neg\fp1-no-contract.json | `"audit.fp1.no-contract"` | `fixtures\audit-neg\fp1-no-contract.json:2:   "id": "audit.fp1.no-contract",`（前：`1: {`；后：`3:   "action": "User.GhostAction",`） |
| fixtures\audit-neg\fp2a-abolish.json | `"audit.fp2a.abolish"` | `fixtures\audit-neg\fp2a-abolish.json:2:   "id": "audit.fp2a.abolish",`（前：`1: {`；后：`3:   "action": "User.upgradeSkill",`） |
| fixtures\audit-neg\fp2b-fullreload.json | `"audit.fp2b.fullreload"` | `fixtures\audit-neg\fp2b-fullreload.json:2:   "id": "audit.fp2b.fullreload",`（前：`1: {`；后：`3:   "action": "User.buyShopItem",`） |
| fixtures\audit-neg\fp2c-l4allow.json | `"audit.fp2c.l4allow"` | `fixtures\audit-neg\fp2c-l4allow.json:2:   "id": "audit.fp2c.l4allow",`（前：`1: {`；后：`3:   "action": "User.upgradeSkill",`） |
| fixtures\audit-neg\fp3-probe-none.json | `"audit.fp3.probe-none"` | `fixtures\audit-neg\fp3-probe-none.json:2:   "id": "audit.fp3.probe-none",`（前：`1: {`；后：`3:   "action": "User.buyShopItem",`） |
| fixtures\audit-neg\fp4-no-save.json | `"audit.fp4.no-save"` | `fixtures\audit-neg\fp4-no-save.json:2:   "id": "audit.fp4.no-save",`（前：`1: {`；后：`3:   "action": "User.buyShopItem",`） |

## 条 13：forge\README.md

| 关键词 | 结果 | 行号 |
|---|---|---|
| 合成样例 | 命中 | 23 |
| 必要条件 | 命中 | 24 |
| 容错 | 命中 | 25、89 |
| __unresolved | 命中 | 17、89 |
| 别名常量 | 命中 | 17 |

```
forge\README.md:16:  | 7 | 命名处理器展开器（S2） | `tools/expand-handlers.js` | 自动把未闭合的契约展开到函数体（跟进 ≤3 跳、识别开关字段），产出 overrides 文件。v2.2 起正则回退引擎只补字段、永不判闭合 | 合成客户端上跟进 2 跳，5 个字段全部抽出 |
forge\README.md:17:  | 8 | 请求参数抽取器 | `tools/extract-req-params.js` | 抽出客户端每个动作发送的 `p` 字段，这是生成 handler 的另一半输入 | 字面量与"一跳变量"两种写法都能抽到；v2.2 起别名常量（`var H = a.HttpConst; H.X`）按 M1 认领，动态键发送点单列在 `__unresolved` 里 |
forge\README.md:18:  | 9 | 效果族分类器（S6） | `tools/effect-classifier.js` | 自动判断 Effect 族属于 GEN 还是 CAPTURE，不用再一族一族人工去查 | Effect 13 → CAPTURE-SUSPECT |
```

```
forge\README.md:22:  | 14 | 构建指纹 + 一键闭环（S0） | `tools/fingerprint.js`、`scripts/loop.sh` | 一条命令走完 构建 → 指纹 → 离线裁判 → 推送 → 核对设备版本；版本对不上就拒绝继续测 | 设备版本不一致时被拦下；v2.2 起推送前先复核待推文件与已裁判版本一致 |
forge\README.md:23:  | 15 | AST 展开器（v2.1，默认引擎） | `lib/ast-expand.js`（acorn） | 能处理作用域遮蔽、别名链、子字段别名、for-in、`in` 运算符、计算属性、数组下标。原码与 terser 压缩改名后的产物，抽取结果一致 | 刁钻样例加上审计给出的 6 个反例（顶层 for-in、撞内置名、变量键 hasOwnProperty / in、共享处理器、真值读），在原码和压缩产物上都全对。**仅在合成样例上验证过**，真包闭合率未测 |
forge\README.md:24:  | 16 | 状态机模型测试 | `replay/model-test.js`（fast-check）、`lib/client-model.js` | 随机生成动作序列，每一步都做**离线 L2**（按 M4 语义把 note 应用到客户端模型，结果必须等于存档）+ L1/L5 + 存档体检；发现问题后自动缩成最短复现步骤 | 300 条序列 PASS；"ivch 发增量"的老错被缩到 1 步复现。v2.2 起模型覆盖不了的语义（eco.exp、attrch 中除 hunger 外的键、gemch、投射外存档域）报 UNMODELED，不能判 PASS。**离线 L2 只是必要条件，不能替代真机 L2** |
forge\README.md:25:  | 17 | HAR 抓包转用例/模板 | `tools/har2cases.js` | mitmproxy、Charles 和浏览器导出的 HAR 直接转成 case 和 L4 模板。原服还能连时，这就是 CAPTURE 内容的取证通道 | 在自产 demo.har 上能容错三种形态：JSON、表单、base64（v2.2 起请求体的 base64 也能识别）。真实线格式材料未提供 |
```

```
forge\README.md:88:  - 回放台接真实 `bz-rpc-server.js` 的适配器只是模板：材料没有给出它的导出方式和 env 接口。
forge\README.md:89:  - 展开器默认走 AST；正则版只作为解析失败时的兜底，v2.2 起它永不判闭合。参数抽取器目前仍是正则加括号配对的容错扫描，不是完整解析器，抽不出来的发送点列在 `__unresolved` 里。遇到压缩产物里的特殊写法（`arguments`、整体外泄、深度超限）时，该契约保持未闭合，并在 `_open` 里写明原因，不会误判为闭合。
forge\README.md:90:  - 效果族分类器的命中率只能说明值域重合，不能证明语义。PARAM-ONLY 和 FK-RESOLVED 仍需读客户端的使用点确认【推断】。
```

## 条 14：README.md（bz-oracle 根）

| 关键词 | 结果 |
|---|---|
| 受限环境 | **未命中**（grep `受限环境|沙箱|spawn` 返回 No matches found） |
| 沙箱 | **未命中**（同上） |
| spawn | **未命中**（同上） |

相邻事实（边界描述所在行，机械抄录）：
```
README.md:6:  目标：Agent（或人）每改一处，裁判都给出 PASS/FAIL 和具体原因，不再靠在真机上点、不再靠"不崩"来判断对错。
README.md:7:  边界：只在进程内运行、只读写 `hotfix/oracle/`。不改 APK，不联网，不伪造付费。
README.md:8:  
```

## 条 15：CHANGELOG-v2.2.md（全文抄录，35 行）

```
CHANGELOG-v2.2.md:1:  # v2.2（2026-10-23）：按中层审计 A0–A10 修订
CHANGELOG-v2.2.md:2:  
CHANGELOG-v2.2.md:3:  自检 17 → 21 步，全部通过。变异库 18 → 23 个（新增 M19–M23，对应审计 A2 的假 PASS 通道）：v2.2 击杀 120/121；同一份变异库在 v2.1 上只击杀 100/121。唯一存活的仍是已登记的 M09。
CHANGELOG-v2.2.md:4:  
CHANGELOG-v2.2.md:5:  ## 裁判（host/）
CHANGELOG-v2.2.md:6:  - `L1.NO_CONTRACT` 从 WARN 升为 **FAIL**（`config.noContractIs`）。【A2#1】
CHANGELOG-v2.2.md:7:  - `case.meta` 里的豁免（abolish / fullReload / l4Allow）**只在 `config.metaEscapes` 登记过才生效**，否则忽略并报 `META_IGNORED`。目前只登记了 LoadGame、sycnPlayerItemData 的 fullReload。【A2#2】
CHANGELOG-v2.2.md:8:  - 无存档用例报 `L1.NO_SAVE`（默认 WARN；`--require-save` 时为 FAIL，nightly 默认开）；summary 单列 `noSaveCases` 和 `noProbeCases`。【A2#4】
CHANGELOG-v2.2.md:9:  - `probe.mode=none` 从 WARN 升为 **FAIL**（`config.noProbeIs`）；离线回放报 `INFO L0.NOT_RUN`，回放报告带 `l0:'not-run'`。【A2#5】
CHANGELOG-v2.2.md:10: - build-contracts 从 M2 原文识别**真值读**（`if (o.x)`、`o.x &&`、`o.x ?`、`!o.x`、`o.x ||`），在字段上标 `truthy`。真实契约里共识别出 137 个。【A3#1 / A4#6】
CHANGELOG-v2.2.md:11: - 变异体 M19–M23 覆盖 meta 豁免 ×3、探针缺位、未知动作。【A8#3】
CHANGELOG-v2.2.md:12: 
CHANGELOG-v2.2.md:13: ## 工具箱（forge/）
CHANGELOG-v2.2.md:14: - **AST 展开器**：遍历应答本身的 for-in 记为逃逸；撞内置名的顶层属性读照常记字段；变量键的 `hasOwnProperty` / `in` 记为逃逸；同一处理器注册给多个事件时，相关契约一律不闭合；新增真值读标记。**正则回退引擎永不判闭合。**【A4】
CHANGELOG-v2.2.md:15: - **兜底**：真值读字段不再填空容器，真实 stubs 因此少发 7 个字段（4 个 `rewardArray`、2 个 `dataArr`、1 个 `recentSeeds`）。付费名单改为只读 `config.payActionRe` 这一处。新增 `config/stub-deny.json`（人工禁兜底名单，现为空）。运行时以 `stub-unsafe` 标出不安全兜底。【A3、A0.1】
CHANGELOG-v2.2.md:16: - **夜间循环**，默认全开（`--loose` 可关，关了会写进日志）：
CHANGELOG-v2.2.md:17:   - 静态闸 `lib/gen-gate.js`（G1–G5）；
CHANGELOG-v2.2.md:18:   - 严格加载：handler 必须由 withProjection 包装，用模块私有 WeakSet 校验，无法伪造；
CHANGELOG-v2.2.md:19:   - 存档域白名单：改了投射器覆盖不到的域直接判错；
CHANGELOG-v2.2.md:20:   - 输入冻结：sha256 校验表、规则、契约、DSL、录制和配置；
CHANGELOG-v2.2.md:21:   - fuzz 闸：参数取自录制样本；
CHANGELOG-v2.2.md:22:   - 回归判死；
CHANGELOG-v2.2.md:23:   - generated 必须接管全部用例。【A6、A2#6】
CHANGELOG-v2.2.md:24: - **客户端模型**：
CHANGELOG-v2.2.md:25:   - eco.exp、attrch 中除 hunger 外的键、gemch、投射外存档域的变化 → 报 `UNMODELED`，不能判 PASS；
CHANGELOG-v2.2.md:26:   - eqch 补上 type==1 的更新分支（M4:66）；
CHANGELOG-v2.2.md:27:   - 新增 12 条 M4 单点断言（`tools/test-client-model.js`）。【A5、A8#16】
CHANGELOG-v2.2.md:28: - **请求参数抽取**：别名常量按 M1 认领；动态键发送点列入 `__unresolved`，不再静默跳过。【A1-C12】
CHANGELOG-v2.2.md:29: - **HAR**：请求体也能识别 base64。【A1-C17】
CHANGELOG-v2.2.md:30: - **探针**：模拟世界补上提示框，新增 toast 场景，验证从采集到 `L0.TOAST` 的整条链路。真实符号仍是 TODO。【A0.2】
CHANGELOG-v2.2.md:31: - **loop.sh**：推送前先复核"待推文件 == 已裁判版本"。【A1-C15】
CHANGELOG-v2.2.md:32: - **prompt-pack**：把闸门规则和真值读列写进提示。
CHANGELOG-v2.2.md:33: 
CHANGELOG-v2.2.md:34: ## 新增文件
CHANGELOG-v2.2.md:35: `fixtures/make-audit-neg.js`、`fixtures/audit-neg/`（6 个审计反例）、`forge/fixtures/client-src/cx-client.js`（6 个展开器反例）、`forge/fixtures/gen-evil/`（7 个逃逸样本）、`forge/fixtures/gen-domain/`、`forge/lib/gen-gate.js`、`forge/tools/test-client-model.js`、`config/stub-deny.json`、`docs/中层审计处置回执.md`
```

（2、4、12、33 行为空行，照录。）

## 条 16：host\mutate.js — M19–M23 的 id 与 why 字段原文行

| 变异体 | 行号 |
|---|---|
| M19 | 72 |
| M20 | 75 |
| M21 | 78 |
| M22 | 81 |
| M23 | 83 |

```
host\mutate.js:71:   // ---- 中层审计（2026-10-23）A2 假 PASS 通道 → 变异体（case 作者/录制自带豁免开关）
host\mutate.js:72:   { id: 'M19.meta_abolish_escape', why: '审计 A2#2a：lv=0 删技能，并在 case.meta 自带 abolish 豁免', apply(c) {
host\mutate.js:73:     const s = c.resp && c.resp.note && c.resp.note.skch; if (!isObj(s) || !Object.keys(s).length) return null;
```

```
host\mutate.js:74:     const m = clone(c); const k = Object.keys(s)[0]; m.resp.note.skch[k] = [0, 0, 0]; m.meta = Object.assign({}, m.meta, { abolish: true }); return m; } },
host\mutate.js:75:   { id: 'M20.meta_fullreload_escape', why: '审计 A2#2b：改了存档不发 note，并在 case.meta 自带 fullReload 豁免', apply(c) {
host\mutate.js:76:     if (!c.resp || !c.resp.note || !Object.keys(c.resp.note).length || (c.meta && c.meta.fullReload)) return null;
```

```
host\mutate.js:77:     const m = clone(c); delete m.resp.note; m.meta = Object.assign({}, m.meta, { fullReload: true }); return m; } },
host\mutate.js:78:   { id: 'M21.meta_l4allow_escape', why: '审计 A2#2c：与原服样本缺整个 note，并在 case.meta 自带 l4Allow 豁免', apply(c) {
host\mutate.js:79:     if (!c.template || !c.resp || !c.resp.note) return null;
```

```
host\mutate.js:80:     const m = clone(c); delete m.resp.note; delete m.saveBefore; delete m.saveAfter; m.meta = Object.assign({}, m.meta, { l4Allow: ['note'] }); return m; } },
host\mutate.js:81:   { id: 'M22.probe_none', why: '审计 A2#5：探针没挂上（L0 失明）', apply(c) {
host\mutate.js:82:     if (!c.probe || c.probe.mode === 'none') return null; const m = clone(c); m.probe = { mode: 'none' }; return m; } },
```

```
host\mutate.js:82:     if (!c.probe || c.probe.mode === 'none') return null; const m = clone(c); m.probe = { mode: 'none' }; return m; } },
host\mutate.js:83:   { id: 'M23.action_unknown', why: '审计 A2#1：动作不在契约表里（L1 零字段检查）', apply(c) {
host\mutate.js:84:     if (!c.resp) return null; const m = clone(c); m.action = c.action + 'X'; if (m.req) m.req.do = m.req.do + 'X'; return m; } },
```

## 条 17：forge\tools\extract-req-params.js

| 关键词 | 结果 | 行号 |
|---|---|---|
| __unresolved | 命中 | 11（注释）、13（defineProperty）、66、68；26 行为 `unresolved.push`（局部数组） |
| 别名 | 命中（"别名常量"，11 行注释）；30 行为英文标识符 `viaAlias` | 11、30 |

```
forge\tools\extract-req-params.js:10:   const res = {};
forge\tools\extract-req-params.js:11:   // 中层审计 A1-C12：不再静默跳过非 HttpConst.X 的发送点——别名常量（var H = a.HttpConst; H.X）按 M1 的 KEY 名单认领，其余计入 __unresolved
forge\tools\extract-req-params.js:12:   const unresolved = [];
forge\tools\extract-req-params.js:13:   Object.defineProperty(res, '__unresolved', { value: unresolved, enumerable: false });
```

```
forge\tools\extract-req-params.js:25:         if (am && knownKeys && knownKeys.has(am[1])) { km = am; alias = true; }
forge\tools\extract-req-params.js:26:         else { unresolved.push({ site: `${file}:${lineOf(src, m.index, cache)}`, first: first.slice(0, 60) }); continue; }
forge\tools\extract-req-params.js:27:       }
```

```
forge\tools\extract-req-params.js:29:       const r = res[key] = res[key] || { sites: [], params: {}, dynamic: 0 };
forge\tools\extract-req-params.js:30:       if (alias) r.viaAlias = (r.viaAlias || 0) + 1;
forge\tools\extract-req-params.js:31:       r.sites.push(`${file}:${line}`);
```

```
forge\tools\extract-req-params.js:65:   }
forge\tools\extract-req-params.js:66:   writeJSON(a.out || 'out/req-params.json', Object.assign({}, res, { __unresolved: res.__unresolved }));
forge\tools\extract-req-params.js:67:   const keys = Object.keys(res);
```

```
forge\tools\extract-req-params.js:67:   const keys = Object.keys(res);
forge\tools\extract-req-params.js:68:   console.log(JSON.stringify({ actions: keys.length, sites: keys.reduce((s, k) => s + res[k].sites.length, 0), withLiteral: keys.filter(k => Object.keys(res[k].params).length).length, viaAlias: keys.filter(k => res[k].viaAlias).length, unresolved: res.__unresolved.length }));
forge\tools\extract-req-params.js:69: }
```

## 条 18：scripts\loop.sh — fingerprint 与 push 的先后顺序相关行

文件共 31 行；第 15–30 行区间原文照贴（顺序：17 行 stamp → 18 行离线回放 → 22 行推送前 fingerprint check → 23 行 push → 29 行设备侧 fingerprint check）：

```
scripts\loop.sh:15:  t0=$(date +%s)
scripts\loop.sh:16:  echo "== 1 构建";      [ -n "${BUILD_CMD:-}" ] && eval "$BUILD_CMD" || echo "  （未设 BUILD_CMD，跳过）"
scripts\loop.sh:17:  echo "== 2 指纹";      node forge/tools/fingerprint.js stamp --files "$ARTIFACTS" --out out/build-stamp.json
scripts\loop.sh:18:  echo "== 3 离线回放";  node forge/replay/replay.js --recordings "$RECORDINGS" ${ACTION:+--action $ACTION} ${GENERATED:+--generated $GENERATED} ${DSL:+--dsl $DSL} ${TABLES:+--tables $TABLES} ${RULES:+--rules $RULES} --out out/replay-report.json || { echo "离线裁判 FAIL，不推设备"; exit 1; }
scripts\loop.sh:19:  IFS=, read -ra AR <<< "$ARTIFACTS"
scripts\loop.sh:20:  # 中层审计 A1-C15：推送前复核——要推的文件必须与第 2 步盖章（也就是通过离线裁判的那一版）逐字节一致，否则不推
scripts\loop.sh:21:  rm -rf out/pre-push && mkdir -p out/pre-push && for f in "${AR[@]}"; do cp "$f" out/pre-push/; done
scripts\loop.sh:22:  node forge/tools/fingerprint.js check --stamp out/build-stamp.json --device-files out/pre-push || { echo "待推送文件与已裁判版本不一致，拒绝推送"; exit 1; }
scripts\loop.sh:23:  echo "== 4 推送";      for f in "${AR[@]}"; do run "$ADB" push "$f" "$DEVICE_DIR/"; done
scripts\loop.sh:24:  echo "== 5 热重载";    [ -n "${RELOAD_CMD:-}" ] && run bash -c "$RELOAD_CMD" || echo "  （未设 RELOAD_CMD，跳过）"
scripts\loop.sh:25:  echo "== 6 核对版本";  rm -rf out/device-pull && mkdir -p out/device-pull
scripts\loop.sh:26:  for f in "${AR[@]}"; do run "$ADB" pull "$DEVICE_DIR/$(basename "$f")" out/device-pull/ >/dev/null; done
scripts\loop.sh:27:  [ -n "${READY_FILE:-}" ] && run "$ADB" pull "$READY_FILE" out/device-pull/bz_ready.json >/dev/null || true
scripts\loop.sh:28:  if [ "${DRY_RUN:-0}" = 1 ]; then for f in "${AR[@]}"; do cp "$f" out/device-pull/; done; fi
scripts\loop.sh:29:  node forge/tools/fingerprint.js check --stamp out/build-stamp.json --device-files out/device-pull ${READY_FILE:+--ready out/device-pull/bz_ready.json}
scripts\loop.sh:30:  echo "== 7 设备裁判";  if [ -n "${PLAN:-}" ]; then node host/device-run.js --plan "$PLAN"; else echo "  （未设 PLAN，跳过 dual 模式）"; fi
```

---

## 未验证

1. 全程只做了静态读取与文本比对；**未执行** selftest.sh、loop.sh、judge.js、nightly.js 或任何节点脚本，也未连接设备。所有"机制是否真的运行起来、判级是否如文档所说"均未验证。
2. `fixtures\audit-neg\` 六个 json 是 `make-audit-neg.js` 运行时生成物（该脚本第 7 行 `fs.rmSync(D,...)` 后重建）；本报告记录的是当前磁盘上的内容，未重跑生成器验证可再生一致性。
3. 首次全目录 glob 只返回 417 条路径中的前 100 条（工具截断）；各目标文件均用针对性 glob/read 二次确认过存在与路径，但**不排除目录里还有未列出的其他文件**。
4. 条 8 的 `type == 1` / `type===1` / `n.type` 按字面判"未命中"；这是封闭字面判定，不排除同语义以其他写法存在的可能（本工人不做该判断）。
5. `forge\node_modules\` 与 `audit-work22\main-scratch\bz-oracle\` 下存在同名库的副本；本报告全部证据只取自 `F:\BaoZouyxt\audit-v22\bz-oracle\`，未核对副本与正本是否一致。
6. `docs\中层审计处置回执.md` 存在于目录中，但工单未列其为查证对象，未打开。

## 摘要表

| # | 对象 | 结果 |
|---|---|---|
| 1 | layers.js 七关键词 | 6 命中（126/63/229/16+204+230+291/228/126/63）；`require-save` 仅在 228 行注释 |
| 2 | judge.js 三关键词 | 全命中（require-save:5,107；noSave:72,116；summary:66,116） |
| 3 | oracle.config.json | 全命中（metaEscapes:87、noContractIs:83、noProbeIs:85）；全文 98 行已贴 |
| 4 | stub-deny.json | 文件存在，全文 5 行已贴；actions 空、fieldRe null |
| 5 | stub.js | 全命中（truthy:41；deny:20,31-33；stub-deny:20；switch:3,41） |
| 6 | gen-gate.js | 全文 69 行已抄录 |
| 7 | nightly.js | 全命中（fuzz:5,17,74,79,81,88,93；gen-gate:18；sha256:42；viaOk:87,89；byVia:87,92；strict:5,37,89,94；regress:71,94,95） |
| 8 | client-model.js | UNMODELED:7 命中；eqch:4,33,40 命中；`type == 1`/`type===1`/`n.type` **未命中**（相邻：4 行注释 `type==1`、36 行 `cur[0] === 1`）；全文 48 行已抄录 |
| 9 | sim-test.js | TipsUI:54,55,60,68；toast:54,68,96,103 全命中 |
| 10 | selftest.sh | 21 条步骤标题全贴；audit-neg:59,62；gen-evil:70,71,74,78；stub-unsafe:26 |
| 11 | test-expander.js | CX1-CX5:15-20（另有 CX6:21）；rewardObj:11,21；`for-in` **未命中**（相邻：CX1_FORIN:15）；EXPECT 键清单已列 |
| 12 | make-audit-neg.js + 六 json | **工单路径未命中**：实际在根级 `fixtures\make-audit-neg.js` 与 `fixtures\audit-neg\`；六个 id 逐文件已录 |
| 13 | forge/README.md | 全命中（合成样例:23；必要条件:24；容错:25,89；__unresolved:17,89；别名常量:17） |
| 14 | 根 README.md | `受限环境`/`沙箱`/`spawn` 三词**全部未命中**（grep No matches） |
| 15 | CHANGELOG-v2.2.md | 全文 35 行已抄录 |
| 16 | mutate.js M19-M23 | 全命中（id+why：72/75/78/81/83） |
| 17 | extract-req-params.js | 全命中（__unresolved:11,13,66,68；别名:11） |
| 18 | loop.sh | 15-30 行区间原文已贴：fingerprint stamp(17)→check(22)→push(23)→check(29) |
