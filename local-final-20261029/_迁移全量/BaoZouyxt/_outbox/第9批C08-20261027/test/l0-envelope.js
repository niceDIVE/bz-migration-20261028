'use strict';
/**
 * L0-2 编解码与信封测试（Node，秒级）
 *   1. 字节级对撞：设备端 aes-js 版 bz-codec.js  vs  Node crypto 版  → 必须完全一致
 *   2. 信封：bzgf/800-/900- 必须带 code=200；:9898 必须不带 code
 *   3. 形状：每个动作的载荷键集合 ⊇ 抓包模板键集合（金标准来自 templates.json）
 *   4. URL 路由：注册/公告/未知 的分支必须各自正确
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const LZString = require('lz-string');
const aesjs = require('aes-js');

const root = path.join(__dirname, '..');
let n = 0;
function ok(name, cond, info) {
  n++;
  if (!cond) { console.error('  FAIL ' + name + (info === undefined ? '' : ' → ' + JSON.stringify(info))); throw new Error('FAIL ' + name); }
  console.log('  ok   ' + name);
}

// ---------- 编解码：设备端实现 vs Node 参考实现 ----------
function nodeCodec() {
  const KEY = Buffer.from('120734aa834dea925ca8d2e1bb6811c3', 'utf8');
  const IV = Buffer.from('33daee8409834c00', 'utf8');
  return {
    encode(pt) {
      const c = crypto.createCipheriv('aes-256-cbc', KEY, IV);
      return Buffer.concat([c.update(LZString.compressToBase64(pt), 'utf8'), c.final()]).toString('hex');
    },
    decode(hex) {
      const d = crypto.createDecipheriv('aes-256-cbc', KEY, IV);
      const b64 = Buffer.concat([d.update(Buffer.from(String(hex).trim(), 'hex')), d.final()]).toString('utf8');
      return LZString.decompressFromBase64(b64);
    },
  };
}

function deviceCodec() {
  const win = { aesjs, LZString };
  const src = fs.readFileSync(path.join(root, 'hook', 'bz-codec.js'), 'utf8');
  new Function('window', src)(win);
  if (!win.__BZ_CODEC__) throw new Error('bz-codec.js 初始化失败');
  return win.__BZ_CODEC__;
}

const NC = nodeCodec(), DC = deviceCodec();
const SAMPLES = [
  '{"mod":"User","do":"quicklogin","p":{"account":"9900012358565","pwd":"123456"}}',
  '{"mod":"User","do":"acceptTask","p":{"taskID":101080,"npcID":3}}',
  '中文与 emoji 🙂 混排，验证 UTF-8 路径',
  '{"a":' + '1,'.repeat(200) + '"z":1}',
];
for (let i = 0; i < SAMPLES.length; i++) {
  const a = DC.encode(SAMPLES[i]), b = NC.encode(SAMPLES[i]);
  ok('codec 字节一致 #' + i, a === b, { a: a.slice(0, 24), b: b.slice(0, 24) });
  ok('codec 往返 #' + i, DC.decode(a) === SAMPLES[i]);
  ok('codec 交叉解密 #' + i, NC.decode(a) === SAMPLES[i]);
}

// ---------- 载入策略层 ----------
const TPL = require('../core/templates.json');
const bundlePath = path.join(root, 'patch', 'live', 'handlers.js');
ok('handlers.js 已生成', fs.existsSync(bundlePath));
const bundle = fs.readFileSync(bundlePath, 'utf8');

function loadImpl() {
  const store = {};
  const bz = {
    bootVer: 'l0', now: () => 1792612412000, log: () => {},   // 全仓唯一固定时钟（见 HANDOVER §6.3）
    readFile: (p) => (p in store ? store[p] : null),
    writeFile: (p, t) => { store[p] = t; return true; },
    exists: (p) => p in store,
    remove: (p) => { delete store[p]; return true; },
    dir: '/tmp/', savePath: '/tmp/save.json', handlersPath: '/tmp/handlers.js',
    codec: DC,
  };
  const impl = new Function('bz', bundle)(bz);
  return { impl, store };
}

const { impl, store } = loadImpl();
ok('契约：handle/selfCheck/reset/state 齐全',
  typeof impl.handle === 'function' && typeof impl.selfCheck === 'function' && typeof impl.reset === 'function' && typeof impl.state === 'function');
ok('版本号格式 h########', /^h[0-9a-f]{8}$/.test(String(impl.version)), impl.version);

const sc = impl.selfCheck();
ok('selfCheck 通过', sc.ok === true, sc.detail);
ok('selfCheck 覆盖 ≥60 项', sc.passed >= 60, sc.passed);

// ---------- 信封 + 形状 ----------
const ACTIONS = [
  'GetServerList', 'ChooseServer', 'TellAction', 'quicklogin', 'CheckName', 'Create',
  'getCRAInfo', 'GetChatAddress', 'acceptTask', 'getFinishTaskAward', 'OpenNovice',
  'joinSchool', 'upgradeSkill', 'ReqSelfBattleInfo', 'CheckBattleResult',
];
const TPL_KEY = {
  GetServerList: 'getServerList', quicklogin: 'quicklogin', Create: 'create',
  getCRAInfo: 'getCRAInfo', GetChatAddress: 'getChatAddress',
  getFinishTaskAward: 'getFinishTaskAward', ReqSelfBattleInfo: 'reqSelfBattleInfo',
  CheckBattleResult: 'checkBattleResult',
};
const rpcReq = (action, p) => DC.encode(JSON.stringify({ mod: 'User', do: action, p: p || {} }));

for (const a of ACTIONS) {
  const body = rpcReq(a);
  const codeRes = impl.handle({ method: 'POST', url: 'https://bzgf.maple-game.com/900-server-166/' + a, body });
  ok(a + ': 有 Game 服信封', (() => {
    try { const e = JSON.parse(codeRes.text); return e.code === 200 && typeof e.MsgData === 'string'; } catch (e) { return false; }
  })(), codeRes.text && codeRes.text.slice(0, 60));

  const plainRes = impl.handle({ method: 'POST', url: 'http://10.0.0.5:9898/' + a, body });
  ok(a + ': 入口服无 code', (() => {
    try { const e = JSON.parse(plainRes.text); return e.code === undefined && typeof e.MsgData === 'string'; } catch (e) { return false; }
  })());

  const payload = JSON.parse(DC.decode(JSON.parse(codeRes.text).MsgData));
  ok(a + ': 载荷是对象', payload && typeof payload === 'object');

  const tk = TPL_KEY[a];
  if (tk && TPL[tk]) {
    const missing = Object.keys(TPL[tk]).filter((k) => !(k in payload));
    ok(a + ': 键集合 ⊇ 抓包模板', missing.length === 0, missing);
  }
}

// 具体契约
{
  const gs = JSON.parse(DC.decode(JSON.parse(impl.handle({ url: 'http://1.2.3.4:9898/x', body: rpcReq('GetServerList') }).text).MsgData));
  ok('GetServerList 与模板字面一致', JSON.stringify(gs) === JSON.stringify(TPL.getServerList));
  const ql = JSON.parse(DC.decode(JSON.parse(impl.handle({ url: 'https://bzgf.maple-game.com/800-server-166/quicklogin', body: rpcReq('quicklogin', { account: '9900012358565' }) }).text).MsgData));
  ok('quicklogin: eRet=1 / roleID 数字 / 账号回填',
    ql.eRet === 1 && typeof ql.roleID === 'number' && ql.account === '9900012358565', ql);
  const at = JSON.parse(DC.decode(JSON.parse(impl.handle({ url: 'https://bzgf.maple-game.com/900-server-166/acceptTask', body: rpcReq('acceptTask', { taskID: 101080 }) }).text).MsgData));
  ok('acceptTask: 包裹形状 + taskID 回填',
    at.error === 0 && at.p === 'User.acceptTask' && at.resultCode === 200 && at['User.acceptTask'].taskID === 101080, at);
  const unk = JSON.parse(DC.decode(JSON.parse(impl.handle({ url: 'https://bzgf.maple-game.com/900-server-166/neverSeenAction', body: rpcReq('neverSeenAction') }).text).MsgData));
  ok('未知动作 → 同构 ACK', unk.resultCode === 200 && unk['User.neverSeenAction'].eRet === 1, unk);
}

// ---------- URL 路由 ----------
{
  const reg = impl.handle({ method: 'POST', url: 'http://x/register.php', body: '' });
  ok('注册 → success', reg.text === 'success');
  const notice = impl.handle({ method: 'GET', url: 'http://notice-server/x', body: '' });
  ok('公告 → 空列表', (() => { try { const o = JSON.parse(notice.text); return o.statusCode === 200 && Array.isArray(o.data); } catch (e) { return false; } })());
  const bh = impl.handle({ method: 'GET', url: 'http://unknown.host/x', body: '' });
  ok('未知 URL → 黑洞但记录 action', bh.text === '' && bh.meta.action === 'blackhole');
  const bad = impl.handle({ method: 'POST', url: 'https://bzgf.maple-game.com/900-server-166/x', body: 'zzzzzz' });
  ok('坏报文 → 失败可见（非 200）', bad.status !== 200 && bad.meta.action === 'rpc-fail', bad.meta);
}

// ---------- 存档读写 ----------
{
  impl.handle({ url: 'https://bzgf.maple-game.com/900-server-166/Create', body: rpcReq('Create', { baseValueAy: ['9900012358565', '测试侠', 0, 0, 282, 301, 318, 40, 20, 10, 10] }) });
  ok('Create 后落盘', !!store['/tmp/save.json'], Object.keys(store));
  ok('落盘内容可解析且含名字', JSON.parse(store['/tmp/save.json']).name === '测试侠');
  const st = impl.state();
  ok('state() 读回同一份', st && st.name === '测试侠');
  impl.reset();
  ok('reset 清空（无 baseValueAy）', !JSON.parse(store['/tmp/save.json']).baseValueAy);
}

console.log('[L0-2] PASS ' + n + ' 项');
