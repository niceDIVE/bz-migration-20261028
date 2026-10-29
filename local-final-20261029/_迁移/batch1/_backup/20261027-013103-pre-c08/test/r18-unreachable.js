'use strict';
/**
 * r18-unreachable.js —— Move ③：3020（Effect 15）判 `unreachable` 的**可执行** exitCheck（SOTA R18 §4③ / 反例 8）
 *
 * 【判据（全部原文证据见 docs/audit/r18-verification.md §5）】
 *   index.js:64423-64428  case 15: if (0 == v.numDeaths) { show(4374); return !0; } break;
 *   index.js:111798       v.RoleBaseInfo.numDeaths = t.baseValueAy[41];      // LoadGame
 *   index.js:70454        I.RoleBaseInfo.numDeaths = e.baseValueAy[41];      // 属性同步
 *   index.js:70987        t.push(I.RoleBaseInfo.numDeaths);                  // 上传回 baseValueAy[41]
 *   ⇒ numDeaths 的唯一来源就是 baseValueAy[41]；我方实测恒为 0、且全仓无写点
 *   ⇒ 客户端本地 `return !0` 拦截：请求不发、物品不扣（实测 3020 仍 17 件）。
 *
 * 【exitCheck 的意义】R18 反例 8：今天判 unreachable，将来实现了死亡计数它就会变可达，
 *   而登记还写着 unreachable ⇒ 走"照扣、无效果"。所以这条必须**机器可判**：
 *   一旦服务端出现任何 numDeaths 语义 / 写 baseValueAy[40..49]，本测试立刻红。
 *
 * 跑法：node test/r18-unreachable.js   退出码 0 = 全绿
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-shapes.generated.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', 'bz-tasks.generated.js'), 'utf8'));
global.BZ_ITEMFX = { 3020: [15, 0, 0, 0] };

const { createBzServer } = require('../core/bz-rpc-server.js');
const TPL = require('../core/templates.json');
const ROOT = path.join(__dirname, '..');
const FACTS = JSON.parse(fs.readFileSync(path.join(ROOT, '..', 'tools', 'facts', 'r18-unreachable.json'), 'utf8'));
const NOW = 1792612412000;

function mk() {
  const store = new Map();
  const logs = [];
  const env = {
    readSave: (k) => (store.has(k) ? store.get(k) : null),
    writeSave: (k, t) => store.set(k, t),
    log: (m) => logs.push(String(m)),
    now: () => NOW,
    templates: TPL,
  };
  return { s: createBzServer(env), logs };
}
const inner = (r, k) => r['User.' + k] || {};

/** 服务端真源码目录（排除 node_modules / test / probe / decrypted / patch 产物） */
function serverSourceFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'test' || e.name === 'probe' || e.name === 'decrypted' || e.name === 'patch') continue;
        walk(p);
      } else if (/\.js$/i.test(e.name)) out.push(p);
    }
  };
  for (const d of ['core', 'live', 'hook']) walk(path.join(ROOT, d));
  return out.sort();
}

/** 去掉注释再扫（否则"不许出现 numDeaths"会被解释性注释自己绊倒） */
function stripComments(src) {
  return String(src)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/(^|[^:\\])\/\/.*$/, '$1'))
    .join('\n');
}

const cases = [];
function T(name, fn) { cases.push({ name, fn }); }

T('T1 exitCheck：服务端"代码"里 numDeaths 命中数必须为 0（注释不算；出现即判红 → 3020 变可达）', () => {
  const files = serverSourceFiles();
  assert.ok(files.length >= 5, '至少该扫到 core/live/hook 的源码，实际 ' + files.length + ' 个');
  const hits = [];
  for (const f of files) {
    const lines = stripComments(fs.readFileSync(f, 'utf8')).split('\n');
    lines.forEach((l, i) => { if (/numDeaths/.test(l)) hits.push(path.relative(ROOT, f).replace(/\\/g, '/') + ':' + (i + 1) + ' ' + l.trim()); });
  }
  assert.deepStrictEqual(hits, [],
    '服务端代码出现 numDeaths 语义 = 3020 可能变可达，必须按 Effect 15 实现并撤销 tools/facts/r18-unreachable.json 的 unreachable 登记。命中：\n' + hits.join('\n'));
});

T('T2 exitCheck：baseValueAy[40..49] 只许"归零"，不许写入非零值（[41]=死亡次数载体）', () => {
  const files = serverSourceFiles();
  const bad = [], zeroing = [];
  for (const f of files) {
    const lines = stripComments(fs.readFileSync(f, 'utf8')).split('\n');
    lines.forEach((l, i) => {
      const m = /baseValueAy\s*\[\s*(4[0-9])\s*\]\s*(=|\+=|-=|\*=)\s*([^;]*)/.exec(l);
      if (!m) return;
      const where = path.relative(ROOT, f).replace(/\\/g, '/') + ':' + (i + 1) + ' ' + l.trim();
      const rhs = String(m[3]).trim();
      // 允许的唯一形态：`= 0`（把客户端上报的死亡次数强制归零，见 R19 反例 3）
      if (m[2] === '=' && /^0$/.test(rhs)) zeroing.push(where);
      else bad.push(where + '   (RHS=' + rhs + ')');
    });
  }
  assert.deepStrictEqual(bad, [], 'baseValueAy[40..49] 只许归零（= 0），命中：\n' + bad.join('\n'));
  assert.ok(zeroing.length >= 1, '至少该有 Create 里那处 [41] 归零，实际 ' + zeroing.length);
});

T('T3 LoadGame 应答里 baseValueAy[41] 必须恒为 0（客户端据此判 case 15 的拦截）', () => {
  const { s } = mk();
  const lg = inner(s.dispatch('User', 'LoadGame', {}), 'LoadGame');
  assert.ok(Array.isArray(lg.baseValueAy), 'LoadGame 必须带 baseValueAy');
  assert.strictEqual(lg.baseValueAy[41], 0, 'baseValueAy[41] 必须为 0，实际=' + JSON.stringify(lg.baseValueAy[41]));
});

T('T4 回包侧护栏：任何应答都不许出现 numDeaths 字段（3020 永远走不到这条）', () => {
  const { s } = mk();
  s.dispatch('User', 'bzSeedBag', { itemObj: { 3020: 17 } });
  const probes = [
    ['useItem', { itemID: 3020, itemNum: 1 }],
    ['LoadGame', {}],
  ];
  for (const [act, p] of probes) {
    const resp = s.dispatch('User', act, p);
    const blob = JSON.stringify(resp);
    assert.ok(blob.indexOf('numDeaths') < 0, act + ' 应答里不许出现 numDeaths 字段：' + blob.slice(0, 300));
  }
});

T('T5 登记表一致性：3020 必须登记为 unreachable 且带可执行 exitCheck；Effect 13 不许被标成 unreachable', () => {
  const byId = {};
  for (const it of FACTS.items) byId[String(it.id)] = it;
  assert.ok(byId['3020'], 'facts 里必须有 3020');
  assert.strictEqual(byId['3020'].role, 'unreachable', '3020 的 role 必须是 unreachable');
  assert.ok(byId['3020'].exitCheck && byId['3020'].exitCheck.test, '3020 必须带可执行 exitCheck.test');
  assert.ok(/numDeaths/.test(JSON.stringify(byId['3020'].exitCheck)), 'exitCheck 的判据必须点名 numDeaths');
  assert.ok(byId['6625'], 'facts 里必须有 Effect 13 代表项 6625');
  assert.notStrictEqual(byId['6625'].role, 'unreachable',
    'Effect 13 客户端会照发 useItem（64503→65553→65333），不许登记成 unreachable（那是 3020 的情况）');
  assert.strictEqual(byId['6625'].role, 'reachable-but-unmodeled', 'Effect 13 = 可达但未建模（缺礼包表）');
});

T('T6 U2 白名单：整包接收请求数组的位点只许 Create 一处（新位点即判红）', () => {
  // SOTA R19 Q3① U2：反例是"某个保存属性的 handler 写了 s.baseValueAy = req.baseValueAy"，
  //   字面下标 grep 全绿、但客户端上传的 numDeaths 从此进了存档。
  // 做法：扫全部 `baseValueAy =`（整包赋值）行，逐个对白名单；对不上就是新位点。
  const ALLOW = [
    /tpl\.baseValueAy = ay;/,                                        // ensureLedger 内：模板默认值
    /s\.baseValueAy = ay;/,                                          // ensureLedger 内：首次建档
    /r\.baseValueAy = p\.baseValueAy;/,                              // ★Create：唯一允许整包接收请求（紧接着强制 [41]=0）
    /s\.baseValueAy = normalizeBaseValueAy\(r\.baseValueAy\);/,       // Create：规范化后落账（[41] 归零就在这之后）
    /base\.baseValueAy = normalizeBaseValueAy\(clone\(s\.baseValueAy\)\);/, // LoadGame：从存档深拷
    /inner\.baseValueAy = s\.baseValueAy;/,                           // 属性同步应答
    /r\.baseValueAy = normalizeBaseValueAy\(s\.baseValueAy\);/,       // Create 应答：与落账同一份（[41] 已归零）
  ];
  const files = serverSourceFiles();
  const whole = [];
  for (const f of files) {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((l, i) => {
      // 只抓"整包赋值"，不抓 baseValueAy[41] = 这种下标写
      if (/baseValueAy\s*=\s*/.test(l) && !/baseValueAy\s*\[/.test(l)) {
        whole.push({ where: path.relative(ROOT, f).replace(/\\/g, '/') + ':' + (i + 1), src: l.trim() });
      }
    });
  }
  const bad = whole.filter((h) => !ALLOW.some((re) => re.test(h.src)));
  assert.deepStrictEqual(bad, [],
    '出现白名单外的 baseValueAy 整包赋值（可能是"整包吃请求数组"的新洞，R19 反例 3）：\n'
    + bad.map((b) => b.where + '  ' + b.src).join('\n'));
  const fromReq = whole.filter((h) => /=\s*(p|req|params|request)\./.test(h.src));
  assert.strictEqual(fromReq.length, 1,
    '整包接收请求数组的位点必须恰好 1 处（Create），实际 ' + fromReq.length + ' 处：' + JSON.stringify(fromReq));
});

T('T7 U1+归零：建角请求里塞 numDeaths=7，落账与应答都必须是 0', () => {
  // SOTA R19 反例 3 的活体复现：客户端上传 baseValueAy[41]=7，修前会被原样吃进存档。
  const { s } = mk();
  const evil = new Array(48).fill(0);
  evil[1] = '少侠'; evil[41] = 7;
  const resp = s.dispatch('User', 'Create', { baseValueAy: evil, userName: '少侠', school: 0 });
  const saved = s.loadSave().baseValueAy;
  assert.strictEqual(saved[41], 0, '落账的 [41] 必须被强制归零（死亡次数只能服务端产生），实际=' + JSON.stringify(saved[41]));
  const payload = resp['User.Create'] || resp;
  assert.ok(Array.isArray(payload.baseValueAy), 'Create 应答应带 baseValueAy');
  assert.strictEqual(payload.baseValueAy[41], 0, '应答的 [41] 也必须归零（客户端 70454 会采信它）');
});

T('T8 U1 通用：凡是带 baseValueAy 的应答，[41] 都必须为 0', () => {
  const { s } = mk();
  s.dispatch('User', 'bzSeedBag', { itemObj: { 3020: 3 } });
  const probes = [['LoadGame', {}], ['Create', {}], ['sycnPlayerItemData', {}], ['sycnTask', {}]];
  let seen = 0;
  for (const [act, p] of probes) {
    const resp = s.dispatch('User', act, p);
    const payload = resp['User.' + act] || resp;
    if (!Array.isArray(payload.baseValueAy)) continue;
    seen++;
    assert.strictEqual(payload.baseValueAy[41], 0, act + ' 应答的 baseValueAy[41] 必须为 0，实际=' + JSON.stringify(payload.baseValueAy[41]));
  }
  assert.ok(seen >= 2, '至少要检到 2 个带 baseValueAy 的应答（LoadGame/Create），实际 ' + seen);
});

(async () => {
  let pass = 0;
  const fail = [];
  for (const c of cases) {
    try { await c.fn(); pass++; console.log('  ok   ' + c.name); }
    catch (e) { fail.push({ name: c.name, err: String((e && e.message) || e) }); console.log('  FAIL ' + c.name + ' :: ' + (e && e.message)); }
  }
  console.log('\n[r18-unreachable] ' + (fail.length ? 'FAIL' : 'PASS') + '  ' + pass + '/' + cases.length);
  if (fail.length) { console.log(JSON.stringify(fail, null, 2)); process.exit(1); }
})();
