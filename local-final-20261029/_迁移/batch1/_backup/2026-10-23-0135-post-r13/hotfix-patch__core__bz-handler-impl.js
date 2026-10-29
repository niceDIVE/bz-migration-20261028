/* bz-handler-impl —— 策略层（热更新单元）
 *
 * 本文件不单独运行：由 build-handlers.js 拼接成 <writable>/hotfix/live/handlers.js，
 * 在进程内经 new Function('bz', src) 求值，必须 return 契约对象：
 *   { version, handle(req), selfCheck(), reset(), state() }
 *
 * 依赖已在前文定义：__TPL__（模板）、createBzServer（服务器）、IMPL_VERSION（构建注入）、bz（引导 API）
 */

var server = null;
var memStore = null;
var quiet = false;   // 自检批量跑动作时闭嘴，避免每次 reload 刷 120 行日志

/** 必需检查 id（SOTA R12 §1 第 4 条 / R13 §5 第 4 条）。
 *  这份清单的**权威来源**是 `tools\golden\required-checks.json`；这里是同一份内容的内联副本，
 *  目的是让 live 侧也能算出"缺了哪几条"（live 读不到文件系统）。
 *  ⚠ 两份必须逐字一致：`build-handlers.js` 每次构建都比对（不一致 = 构建失败），
 *    所以不存在"改了 JSON 忘了改这里"的漂移窗口。 */
var REQUIRED_CHECKS = [
  'codec:roundtrip',
  'tpl:serverList',
  'tpl:create',
  'task:load:finishArr',
  'task:load:doneExcluded',
  'sale:paysCoins',
  'trade:buy:charges',
  'battle:echoNpc',
  'drop:granted',
  'exchange:currencyWallet',
  'exchange:currencyEcoKey',
  'skill:ecoKey:ptt',
  'clock:liveIsReal',
];

function implLog(m) { if (quiet) return; try { bz.log('[impl] ' + m); } catch (e) {} }

function diskRead() {
  try { return bz.exists(bz.savePath) ? bz.readFile(bz.savePath) : null; } catch (e) { return null; }
}
function diskWrite(k, text) { bz.writeFile(bz.savePath, text); }

/** store=null → 用磁盘存档；store={read,write} → 内存（自检专用，绝不碰真档） */
function makeServer(store) {
  return createBzServer({
    now: bz.now,
    log: implLog,
    templates: __TPL__,
    codec: bz.codec,
    readSave: store ? store.read : diskRead,
    writeSave: store ? store.write : diskWrite,
    // 维护动作的写前备份（滚动一格：<save>.pre-maint.json）。隔离实例没有这一层，避免污染真档。
    writeAux: store ? null : function (suffix, text) {
      try { bz.writeFile(bz.savePath + '.' + suffix, text); return true; } catch (e) { return false; }
    },
    // 隔离实例（store 为内存）= 自检专用：handler 里任何"推给活客户端模型"的副作用都必须跳过。
    // 反面教材：upgradeSkill 结尾的 window.__require 推送，曾让每次 reload 把 potentials 改成
    // 99699 并塞进假技能 skill 0（回归用例 test/selfcheck-model-push.js）。
    sandbox: !!store,
    // 默认走「有档直接进」（实测冷启动 16s）；放 bz_forcewizard 文件可强制回到建角向导
    hintHasRole: !bz.exists(bz.dir + 'bz_forcewizard'),
    // 随机源可注入（R03 §8：Math.random 会让自检/单测不可复现）；引导层不提供就退回 Math.random
    random: bz.random,
    // 饥饿上限（R05 F2）：useItem 请求只带 hg、不带上限（index.js:65302），而上限是客户端按属性
    // 算出来的（`new g(strength, shenfa, gengu, perception, age)`，index.js:43132）。
    // 这里**只读**它，不写模型；读不到返回 0 = 不截断（不猜上限）。
    // 隔离实例（自检/单测）一律 null → 服务端 hungerCapOf 回落到账本 s.hungerMax。
    hungerMax: store ? null : function () {
      try {
        var m = window.__require('UserModel');
        var ent = m && m.UserModel && m.UserModel.entity;
        var hg = ent && ent.hunger;
        if (!hg) return 0;
        var v = hg.limit || hg.finalValue || 0;
        return parseInt(v, 10) || 0;
      } catch (e) { return 0; }
    },
  });
}

function memMake() {
  var data = {};
  return { read: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; }, write: function (k, v) { data[k] = v; } };
}

server = makeServer(null);

var RPC_URL_RE = /(\/register\.php)|(notice-server)|(:9898\/)|(bzgf\.maple-game\.com)/;

function handle(req) {
  var url = String((req && req.url) || '');
  var body = req ? req.body : null;
  var t0 = bz.now();

  if (url.indexOf('/register.php') >= 0) {
    return { status: 200, text: 'success', meta: { action: 'register', envelope: 'plain', ms: bz.now() - t0 } };
  }
  if (url.indexOf('notice-server') >= 0) {
    return { status: 200, text: '{"statusCode":200,"data":[]}', meta: { action: 'notice', envelope: 'plain', ms: bz.now() - t0 } };
  }
  if (url.indexOf(':9898/') >= 0 || url.indexOf('bzgf.maple-game.com') >= 0) {
    var r = server.handleRequest(body, url);
    if (!r || !r.ok) {
      return { status: 502, text: '', meta: { action: 'rpc-fail', error: (r && r.error) || 'unknown', url: url.slice(0, 100), ms: bz.now() - t0 } };
    }
    return { status: 200, text: r.text, meta: { action: r.action, envelope: r.envelope, bytes: (r.text || '').length, ms: bz.now() - t0 } };
  }
  return { status: 200, text: '', meta: { action: 'blackhole', url: url.slice(0, 100), ms: bz.now() - t0 } };
}

var CHECK_ACTIONS = [
  'GetServerList', 'ChooseServer', 'TellAction', 'quicklogin', 'CheckName', 'Create',
  'getCRAInfo', 'GetChatAddress', 'acceptTask', 'getFinishTaskAward', 'OpenNovice',
  'joinSchool', 'upgradeSkill', 'ReqSelfBattleInfo', 'CheckBattleResult',
];

function selfCheck() {
  var passed = 0, failed = [], detail = [];
  // 记录**已执行的检查 id**（SOTA R12 §1 第 4 条）：只比"failed 为空"会被"静默跳过"绕过 ——
  // 少执行一条检查，passed 数字变了但 failed 仍为空，看起来还是绿的。所以要把 id 暴露出来，
  // 由验收器断言「已执行 id 集合 ⊇ golden/required-checks.json」。
  var checked = [];
  function ok(name, cond, info) {
    checked.push(name);
    if (cond) { passed++; return; }
    failed.push(name);
    detail.push({ name: name, info: info === undefined ? null : info });
  }
  if (!bz.codec) { failed.push('codec:missing'); return { ok: false, version: IMPL_VERSION, passed: passed, failed: failed, detail: detail, checked: checked }; }

  ok('codec:roundtrip', (function () {
    try { return bz.codec.decode(bz.codec.encode('{"a":1}')) === '{"a":1}'; } catch (e) { return false; }
  })());
  // ⚠ live 进程里的 now() 必须等于真实时钟（SOTA R10 §1 第 3 条）：
  //   gen_shapes 用固定时钟 GEN_NOW 跑 handler 采集默认值，一旦把那个时钟泄漏进 live，
  //   M1 的 beginTime 会退回"构建时刻常量"，而所有测试都在固定时钟下跑 → 全绿却线上是坏的。
  //   判据很直接：`bz.now()` 与本机真实时钟差 5 秒以上就说明拿到的是假时钟（构建期固定值差好几个月）。
  //   ⚠ 只在**进程内**断言：构建脚本跑自检时用的是假时钟也没有 window，那不算泄漏。
  //
  //   SOTA R13 §5 第 4 条（D1）：原来的 live 判据只认 `window.__BZ_HARNESS__.impl`，
  //   等于把"这条检查有没有被执行"绑在 bootstrap 的契约上。改成**优先读 Cocos 自己的运行时**：
  //   `cc.director.getScene().name` 读的是客户端引擎状态，不新增对 bootstrap 的依赖。
  //   实测：live 进程里该值 = `gamescene`（`run.ps1 cmd "scene"` 同一条路径，bootstrap:197-200）。
  //   ⚠ 场景名就是 `gamescene` 属于**实测确认**（不是推断）；若哪天场景改名，这里会退回 harness 判据。
  var liveScene = null;
  try {
    if (typeof cc !== 'undefined' && cc && cc.director && typeof cc.director.getScene === 'function') {
      var _sc = cc.director.getScene();
      liveScene = (_sc && _sc.name) ? String(_sc.name) : null;
    }
  } catch (e) { liveScene = null; }
  var isLiveProc = (typeof window !== 'undefined')
    && (!!liveScene || !!(window.__BZ_HARNESS__ && window.__BZ_HARNESS__.impl));
  ok('clock:liveIsReal', !isLiveProc || Math.abs(bz.now() - new Date().getTime()) < 5000,
    { live: !!isLiveProc, scene: liveScene, now: bz.now(), real: new Date().getTime() });
  ok('tpl:serverList', !!(__TPL__ && __TPL__.getServerList));
  ok('tpl:create', !!(__TPL__ && __TPL__.create));

  // 自检开始前留一份真存档的字节快照：自检全程**不许**写它（见函数末尾 selfcheck:noSaveWrite）
  var diskBefore = diskRead();

  // 每个动作：包络（code/无 code）+ 载荷可解码 + 必须"恰好一次成功应答"
  var iso = makeServer(memMake());
  for (var i = 0; i < CHECK_ACTIONS.length; i++) {
    var a = CHECK_ACTIONS[i];
    var reqBody;
    try { reqBody = bz.codec.encode(JSON.stringify({ mod: 'User', do: a, p: {} })); } catch (e) { ok(a + ':encode-req', false, String(e)); continue; }

    var res = iso.handleRequest(reqBody, 'https://bzgf.maple-game.com/900-server-166/' + a);
    ok(a + ':ok', !!(res && res.ok), res && res.error);
    var env1 = null;
    try { env1 = JSON.parse(res.text); } catch (e) {}
    ok(a + ':code', !!(env1 && env1.code === 200 && typeof env1.MsgData === 'string'));
    var inner = null;
    try { inner = JSON.parse(bz.codec.decode(env1.MsgData)); } catch (e) {}
    ok(a + ':payload', inner !== null && typeof inner === 'object');

    var res2 = iso.handleRequest(reqBody, 'http://10.0.0.1:9898/' + a);
    var env2 = null;
    try { env2 = JSON.parse(res2.text); } catch (e) {}
    ok(a + ':nocode', !!(env2 && env2.code === undefined && typeof env2.MsgData === 'string'), env2 && env2.code);
  }

  // 信封必须按 URL 区分，且 unknown 动作要有 ACK 兜底
  var unk = bz.codec.encode(JSON.stringify({ mod: 'User', do: 'neverSeenAction', p: {} }));
  var ru = iso.handleRequest(unk, 'https://bzgf.maple-game.com/900-server-166/x');
  var pu = null;
  try { pu = JSON.parse(bz.codec.decode(JSON.parse(ru.text).MsgData)); } catch (e) {}
  ok('unknown:ack', !!(pu && pu.resultCode === 200), pu);

  // 任务账本闭环：接受 → 完成 → 重进(LoadGame) → 同步(sycnTask)
  // 两个集合必须都回放；sycnTask 回空 = 客户端把"做过"清零（这条断言就是防它回归）
  quiet = true;
  var ts = makeServer(memMake());
  ts.dispatch('User', 'acceptTask', { taskID: 100010 });
  ts.dispatch('User', 'acceptTask', { taskID: 100020 });
  ts.dispatch('User', 'getFinishTaskAward', { taskID: 100010 });
  var lgd = ts.dispatch('User', 'LoadGame', {});
  var lp = (lgd && lgd['User.LoadGame']) || {};
  ok('task:load:finishArr', Array.isArray(lp.finishTaskObj) && lp.finishTaskObj.indexOf('100010,1') >= 0, lp.finishTaskObj);
  ok('task:load:doneExcluded', Array.isArray(lp.acceptTaskArray) && lp.acceptTaskArray.indexOf(100020) >= 0 && lp.acceptTaskArray.indexOf(100010) < 0, lp.acceptTaskArray);
  ok('task:load:order', Array.isArray(lp.acceptTaskOrder) && lp.acceptTaskOrder.length >= 2, lp.acceptTaskOrder);
  ok('task:load:taskLog', Array.isArray(lp.taskLog), lp.taskLog);
  var sy = ts.dispatch('User', 'sycnTask', {});
  var sp = (sy && sy['User.sycnTask']) || {};
  ok('task:sync:notEmpty', !!sp.PlayerFinishTaskObj && !Array.isArray(sp.PlayerFinishTaskObj) && sp.PlayerFinishTaskObj['100010'] === 1, sp.PlayerFinishTaskObj);
  ok('task:sync:acceptMap', !!sp.acceptTaskMap && sp.acceptTaskMap['100020'] === 100020 && !sp.acceptTaskMap['100010'], sp.acceptTaskMap);
  ok('task:sync:order', Array.isArray(sp.acceptTaskOrder) && sp.acceptTaskOrder.length >= 2, sp.acceptTaskOrder);
  ok('task:sync:taskLog', Array.isArray(sp.taskLog), sp.taskLog);

  // 物品账本：买 → 用 → 同步 → 重进，全程必须记得住
  // （客户端收到 sycnPlayerItemData 会先 `_itemObj = {}` 再按应答重建，回空就是清空背包）
  var isrv = makeServer(memMake());
  // 灌种子改用维护动作 bzSeedBag：2026-10-22 起 buyShopItem 是**真交易**
  // （按 item.BuyPrice 扣铜钱；没有买价的物品直接 eRet:4 拒绝），拿它当"免费加物品"会灌不进去。
  isrv.dispatch('User', 'bzSeedBag', { itemObj: { 3626: 3 } });
  var ur = (isrv.dispatch('User', 'useItem', { itemID: 3626, itemNum: 1 }) || {})['User.useItem'] || {};
  ok('item:use:note', !!ur.note && !!ur.note.skch && !!ur.note.ivch && !!ur.note.eqch, ur.note);
  ok('item:use:echo', ur.itemID === 3626, ur.itemID);
  var ip = (isrv.dispatch('User', 'sycnPlayerItemData', {}) || {})['User.sycnPlayerItemData'] || {};
  ok('item:sync:itemObj', !!ip.itemObj && ip.itemObj['3626'] === 2, ip.itemObj);
  var lg2 = (isrv.dispatch('User', 'LoadGame', {}) || {})['User.LoadGame'] || {};
  ok('item:load:itemObj', !!lg2.itemObj && lg2.itemObj['3626'] === 2, lg2.itemObj);
  ok('item:load:hasEquip', lg2.PlayerEquip !== undefined, typeof lg2.PlayerEquip);

  // 潜能必须用客户端认的 `note.eco` 键 **ptt**（2026-10-23，证据链见 core/bz-rpc-server.js upgradeSkill 注释）：
  //   客户端 ECO 监听器只认 coins/ptt/gold/exp/chips/yuanbao（index.js:64698-64725），
  //   发 `eco.potential` 会被静默丢弃；而 upgradeSkill 的应答回调（index.js:119842-119845）
  //   既不读顶层 potential、也不处理 note —— 显示靠 pushSkillToClient 直接写活模型。
  //   所以这条断言守的是"数据通路语义正确"，不是"玩家看得到"（后者另有推送兜着）。
  var usrv = makeServer(memMake());
  var upRes = (usrv.dispatch('User', 'upgradeSkill', { skillID: 1, skillArr: [3, 0, 1] }) || {})['User.upgradeSkill'] || {};
  var upSave = usrv.loadSave();
  var upEco = (upRes.note && upRes.note.eco) || null;
  ok('skill:ecoKey:ptt', !!upEco && upEco.ptt === upSave.potential, { eco: upEco, potential: upSave.potential });
  ok('skill:ecoKey:noPotential', !upEco || upEco.potential === undefined, upEco);

  // 任务奖励 / 任务所需物品（数据来自游戏原始配置表：tasknew + drop + item）
  // 派生叠加契约（R01 §1，2026-10-22）：接任务**不许**写存档；差额只出现在应答投射里；
  // 交任务**不许**扣真实库存（客户端自己也不扣，index.jsc:133383-134470 / 134531）。
  var rw = makeServer(memMake());
  rw.dispatch('User', 'acceptTask', { taskID: 100150 });      // 该任务 SpRequire = 4015×1
  var rs1 = rw.loadSave();
  ok('task:need:noSaveWrite', !(parseInt(rs1.bag['4015'], 10) > 0), rs1.bag);
  var rwlg = (rw.dispatch('User', 'LoadGame', {}) || {})['User.LoadGame'] || {};
  ok('task:need:projected', (parseInt(rwlg.itemObj && rwlg.itemObj['4015'], 10) || 0) >= 1, rwlg.itemObj);
  var rwsy = (rw.dispatch('User', 'sycnPlayerItemData', {}) || {})['User.sycnPlayerItemData'] || {};
  ok('task:need:syncProjected', (parseInt(rwsy.itemObj && rwsy.itemObj['4015'], 10) || 0) >= 1, rwsy.itemObj);
  // 已有真库存时不重复叠加；交任务不动真库存（原"借用永不归还"的回归点）
  var cs = makeServer(memMake());
  cs.dispatch('User', 'bzSeedBag', { itemObj: { 4015: 2 } });   // 见上：别再拿 buyShopItem 当免费灌物品
  cs.dispatch('User', 'acceptTask', { taskID: 100150 });
  ok('task:need:noDoubleCount', (parseInt(cs.loadSave().bag['4015'], 10) || 0) === 2, cs.loadSave().bag);
  cs.dispatch('User', 'getFinishTaskAward', { taskID: 100150 });
  ok('task:need:finishNoConsume', (parseInt(cs.loadSave().bag['4015'], 10) || 0) === 2, cs.loadSave().bag);

  // R02 硬伤一：叠加只能用"真物品需求"。BZ_TASKS 里带 n 的条目必须都是 Type 2/12/13
  // （Type3 的 SpRequire 是怪物 id、Type1 是装饰；生成器已按 Type 过滤，这条断言防它回归）
  var badNeedType = [];
  if (typeof BZ_TASKS !== 'undefined' && BZ_TASKS) {
    for (var tk in BZ_TASKS) {
      if (tk === '__meta' || !BZ_TASKS.hasOwnProperty(tk)) continue;
      var e6 = BZ_TASKS[tk];
      if (!e6 || !e6.n) continue;
      if (!(e6.t === 2 || e6.t === 12 || e6.t === 13)) badNeedType.push(tk + ':t=' + e6.t);
    }
  }
  ok('task:need:typeOnly', badNeedType.length === 0, badNeedType.slice(0, 6));
  // Type3 的 SpRequire 是怪物 id（index.js:134416 judgeFightRequire）→ 接它绝不该产生物品叠加
  var t3s = makeServer(memMake());
  t3s.dispatch('User', 'acceptTask', { taskID: 100130 });
  var t3o = (t3s.dispatch('User', 'LoadGame', {}) || {})['User.LoadGame'].itemObj || {};
  ok('task:need:fightNoOverlay', !(parseInt(t3o['1028'], 10) > 0), t3o);

  // 可重复任务（Repeat≠0）：客户端不记完成（index.js:134524）→ 我们不写 done，交完回到可再接
  var rps = makeServer(memMake());
  rps.dispatch('User', 'acceptTask', { taskID: 206380 });
  rps.dispatch('User', 'getFinishTaskAward', { taskID: 206380 });
  var rpSave = rps.loadSave();
  ok('task:repeat:noDone', (rpSave.done || []).indexOf(206380) < 0, rpSave.done);
  ok('task:repeat:released', (rpSave.accepted || []).indexOf(206380) < 0, rpSave.accepted);

  // 出售：客户端真实形状是 [[type,id,count]]（index.js:65191-65208），type 2 = 装备实例 uid
  var ss = makeServer(memMake());
  ss.dispatch('User', 'bzSeedBag', { itemObj: { 4015: 3 } });   // 见上：别再拿 buyShopItem 当免费灌物品
  ss.dispatch('User', 'saleItem', { saleArr: [[1, 4015, 2]] });
  ok('sale:arrayShape', (parseInt(ss.loadSave().bag['4015'], 10) || 0) === 1, ss.loadSave().bag);
  // 卖东西必须结算铜钱（R04 第 0 位：卖东西=白扔是不可逆损失）
  var ps = makeServer(memMake());
  ps.dispatch('User', 'bzSeedBag', { itemObj: { 3003: 3 } });   // 3003 售价 20
  ps.dispatch('User', 'saleItem', { saleArr: [[1, 3003, 2]] });
  var psSave = ps.loadSave();
  ok('sale:paysCoins', (parseInt(psSave.coins, 10) || 0) === 99999 + 20 * 2 && parseInt(psSave.bag['3003'], 10) === 1, { coins: psSave.coins, bag: psSave.bag });
  // 买必须扣钱（旧实现白送过 1011 个糖葫芦：只加物品、一分不扣）
  var bs = makeServer(memMake());
  var bu = bs.dispatch('User', 'buyShopItem', { itemID: 3003, itemNum: 2 });   // 3003 买价 60
  var bsSave = bs.loadSave();
  ok('trade:buy:charges', (bu['User.buyShopItem'] || {}).eRet === 1 && (parseInt(bsSave.coins, 10) || 0) === 99999 - 60 * 2, { coins: bsSave.coins, ret: bu['User.buyShopItem'] });
  var bs2 = makeServer(memMake());
  var bu2 = bs2.dispatch('User', 'buyShopItem', { itemID: 3518, itemNum: 1 });  // 3518 无买价（BuyPrice=0）
  ok('trade:buy:noFreeItem', (bu2['User.buyShopItem'] || {}).eRet === 4 && !bs2.loadSave().bag['3518'], bu2['User.buyShopItem']);
  var ses = makeServer(memMake());
  ses.dispatch('User', 'PutOnEquipment', { EquipmentType: 1, itemID: 7535 });
  ses.dispatch('User', 'saleItem', { saleArr: [[2, 7535, 1]] });
  var sesSave = ses.loadSave();
  ok('sale:equipUid', !sesSave.playerEquip[7535] && !sesSave.equipments[1], { eq: sesSave.playerEquip, slots: sesSave.equipments });

  // 兑换奖励=货币 id：必须进钱包，不许进背包（§7-2，2026-10-23 修）
  // 客户端真值：getItemNum 只认 RoleBaseInfo（index.js:106347-106360，**从不读 _itemObj**）；
  //            eco 监听器只认 coins/ptt/gold/exp/chips/yuanbao 六键（64698-64725）—— 潜能是 **ptt**，
  //            不是存档字段名 potential。写错任何一个都不报错，只静默失效，所以这五条断言必须常驻。
  (function () {
    var EX = (typeof BZ_EXCHANGE !== 'undefined') ? BZ_EXCHANGE : {};
    var row = null, npc = 0;
    for (var np in EX) {
      if (!EX.hasOwnProperty(np)) continue;
      var rows = EX[np] || [];
      for (var r = 0; r < rows.length; r++) {
        var rid = parseInt(rows[r][2], 10) || 0;
        if (rid === 4003 || rid === 4001 || rid === 1 || rid === 8888) { row = rows[r]; npc = parseInt(np, 10); break; }
      }
      if (row) break;
    }
    ok('exchange:hasCurrencyRow', !!row, 'BZ_EXCHANGE 里找不到奖励=货币的行');
    if (!row) return;

    var rewardId = parseInt(row[2], 10);
    var per = Math.max(parseInt(row[3], 10) || 1, 1);
    var field = rewardId === 4003 ? 'potential' : (rewardId === 4001 ? 'coins' : (rewardId === 1 ? 'gold' : 'yuanbao'));
    var ecoKey = rewardId === 4003 ? 'ptt' : field;

    var ce = makeServer(memMake());
    var segs = String(row[4] || '').split('|');
    var seedP = {};
    for (var ci = 0; ci < segs.length; ci++) {
      if (!segs[ci]) continue;
      var kv = segs[ci].split(',');
      seedP[parseInt(kv[0], 10)] = (parseInt(kv[1], 10) || 0) + 5;
    }
    ce.dispatch('User', 'bzSeedBag', { itemObj: seedP });
    // 钱包字段缺省口径与 grantCurrency 一致：yuanbao 缺省 0，其余缺省 99999
    var walletOf = function (save, f) {
      return (typeof save[f] === 'number') ? save[f] : (f === 'yuanbao' ? 0 : 99999);
    };
    var ceBefore = walletOf(ce.loadSave(), field);
    var ceRes = (ce.dispatch('User', 'exchangeItem', { npcid: npc, itemID: parseInt(row[0], 10), itemNum: 1 }) || {})['User.exchangeItem'] || {};
    var ceSave = ce.loadSave();
    var ceAfter = walletOf(ceSave, field);

    ok('exchange:currencyWallet', ceRes.eRet === 1 && ceAfter === ceBefore + per, { field: field, before: ceBefore, after: ceAfter, per: per, ret: ceRes.eRet });
    ok('exchange:currencyNoBag', (ceSave.bag || {})[String(rewardId)] === undefined, { reward: rewardId, got: (ceSave.bag || {})[String(rewardId)] });
    ok('exchange:currencyEcoKey', !!(ceRes.note && ceRes.note.eco) && ceRes.note.eco[ecoKey] === ceAfter, { key: ecoKey, eco: ceRes.note && ceRes.note.eco });
    ok('exchange:currencyNoIvch', !(ceRes.note && ceRes.note.ivch && ceRes.note.ivch[String(rewardId)] !== undefined), ceRes.note && ceRes.note.ivch);
    // 成本必须照扣（拒绝/出错都不许变成白送）
    var costOk = true;
    for (var ck3 = 0; ck3 < segs.length; ck3++) {
      if (!segs[ck3]) continue;
      var kv3 = segs[ck3].split(',');
      var cid3 = parseInt(kv3[0], 10);
      if ((parseInt((ceSave.bag || {})[cid3], 10) || 0) !== seedP[cid3] - (parseInt(kv3[1], 10) || 0)) costOk = false;
    }
    ok('exchange:currencyChargesCost', costOk, { bag: ceSave.bag, seed: seedP });
  })();

  // 战斗准备必须按请求里的 npcID 回声 + 带 26 项数值（否则客户端永远打模板里那只）
  var bt = makeServer(memMake());
  var br = (bt.dispatch('User', 'ReqSelfBattleInfo', { npcID: 1001 }) || {})['User.ReqSelfBattleInfo'] || {};
  ok('battle:echoNpc', br.npcID === 1001 && Array.isArray(br.npcArr) && br.npcArr.length >= 20, { npc: br.npcID, len: (br.npcArr || []).length });

  // 打怪掉落（统一 drop 入口）：npc 2005 → drop 9002005 必得 1301×1（装备走 PlayerEquip）
  // + 5 秒去重窗口（自检里 env.now 固定，所以第二次结算必然命中窗口）
  var bs = makeServer(memMake());
  bs.dispatch('User', 'CheckBattleResult', { win: 1, npcID: 2005 });
  var after1 = bs.loadSave();
  ok('drop:granted', !!(after1.playerEquip && after1.playerEquip[1301]), { pe: after1.playerEquip, bag: after1.bag });
  bs.dispatch('User', 'CheckBattleResult', { win: 1, npcID: 2005 });
  var after2 = bs.loadSave();
  ok('drop:dedup', JSON.stringify(after1.playerEquip) === JSON.stringify(after2.playerEquip), { a1: after1.playerEquip, a2: after2.playerEquip });
  var bs2 = makeServer(memMake());
  bs2.dispatch('User', 'CheckBattleResult', { win: 0, npcID: 2005 });
  ok('drop:loseNoDrop', !(bs2.loadSave().playerEquip || {})[1301], bs2.loadSave().playerEquip);
  // 掉落必须写进应答（客户端 index.js:89553-89561 读 rewardArray / equipObj 渲染结算界面）
  var bs3 = makeServer(memMake());
  var br3 = (bs3.dispatch('User', 'CheckBattleResult', { win: 1, npcID: 2005 }) || {})['User.CheckBattleResult'] || {};
  ok('drop:inResponse', !!((br3.equipObj && br3.equipObj[1301]) || (br3.rewardArray && br3.rewardArray[1301])), { eq: br3.equipObj, rw: br3.rewardArray });
  // R03：rewarded 必须 ⊆ done ∪ RepeatIds（D 之后 Repeat 任务不写 done，这条防回归）
  var subs = makeServer(memMake());
  subs.dispatch('User', 'acceptTask', { taskID: 206380 });
  subs.dispatch('User', 'getFinishTaskAward', { taskID: 206380 });
  var subsSave = subs.loadSave();
  var badSub = (subsSave.rewarded || []).filter(function (id) {
    var m = (typeof BZ_TASKS !== 'undefined' && BZ_TASKS) ? BZ_TASKS[String(id)] : null;
    return (subsSave.done || []).indexOf(id) < 0 && !(m && m.p);
  });
  ok('task:reward:subsetDoneOrRepeat', badSub.length === 0, badSub);
  var fa1 = (rw.dispatch('User', 'getFinishTaskAward', { taskID: 100010 }) || {})['User.getFinishTaskAward'] || {};
  ok('task:reward:array', !!fa1.rewardArray && Object.keys(fa1.rewardArray).length > 0, fa1.rewardArray);
  var rs2 = rw.loadSave();
  var firstKey = Object.keys(fa1.rewardArray || {})[0];
  ok('task:reward:inBag', firstKey ? (parseInt(rs2.bag[firstKey], 10) || 0) > 0 : false, rs2.bag);
  var fa2 = (rw.dispatch('User', 'getFinishTaskAward', { taskID: 100010 }) || {})['User.getFinishTaskAward'] || {};
  ok('task:reward:once', !!fa2.rewardArray && Object.keys(fa2.rewardArray).length === 0, fa2.rewardArray);

  // 装备穿脱：穿要记账（否则重进回放成旧的 = 白穿），卸要清空 <8 的槽
  var es = makeServer(memMake());
  es.dispatch('User', 'PutOnEquipment', { EquipmentType: 1, itemID: 7535 });
  var ed = es.loadSave();
  ok('equip:put', !!(ed.equipments && ed.equipments[1] === 7535), ed.equipments);
  ok('equip:instance', !!(ed.playerEquip && Array.isArray(ed.playerEquip[7535])), ed.playerEquip);
  var eg = (es.dispatch('User', 'LoadGame', {}) || {})['User.LoadGame'] || {};
  ok('equip:replay', eg.equipments && eg.equipments[1] === 7535, eg.equipments);
  es.dispatch('User', 'UnloadingEuipment', { hp: 1, hplmt: 1, mp: 1 });
  var ed2 = es.loadSave();
  ok('equip:down', !(ed2.equipments && ed2.equipments[1]), ed2.equipments);
  // 客户端真正发的动作名是 User.equipWeapon（index.js:59592），以前只实现 PutOnEquipment → 穿装备从未记账
  var cw = makeServer(memMake());
  cw.dispatch('User', 'equipWeapon', { EquipmentType: 5, itemID: 2302, hp: 519, hplmt: 600, mp: 200 });
  var cws = cw.loadSave();
  ok('equip:clientAction', !!(cws.equipments && cws.equipments[5] === 2302 && Array.isArray(cws.playerEquip[2302])), { eq: cws.equipments, pe: cws.playerEquip });
  // 装备类奖励要进 PlayerEquip 而不是背包（客户端按 Type==1 走 getEquipOrUid）
  var gs = makeServer(memMake());
  var gfa = (gs.dispatch('User', 'getFinishTaskAward', { taskID: 100240 }) || {})['User.getFinishTaskAward'] || {};
  var gd = gs.loadSave();
  ok('equip:reward', !!(gd.playerEquip && Object.keys(gd.playerEquip).length > 0), { reward: gfa.rewardArray, equip: gd.playerEquip });
  quiet = false;

  // 形状表：每个动作的应答必须带齐「客户端真会读」的字段，且 eRet=1
  // 注意 dispatch 会先走手写 handler，再走形状表——所以这条断言同时也在验那 53 个 handler
  // （distpatch 里的 fillShape 只补缺，不覆盖 handler 自己算的值）
  if (typeof BZ_SHAPES !== 'undefined' && BZ_SHAPES) {
    quiet = true;
    var shapedCount = 0;
    var isoStateSwitchBad = [];   // 开关字段"值不合法"的实例（只记录，见下面注释）
    var implShape = {};
    var implList = BZ_SHAPES.__impl || [];
    for (var ii = 0; ii < implList.length; ii++) implShape[implList[ii]] = 1;
    for (var act in BZ_SHAPES) {
      if (!BZ_SHAPES.hasOwnProperty(act) || /^__/.test(act)) continue;
      shapedCount++;
      var want = BZ_SHAPES[act];
      var got = iso.dispatch('User', act, {});
      var inner2 = got && got['User.' + act];
      ok('shape:' + act + ':present', !!inner2, act);
      // 支付类一律必须"看起来失败"（项目边界：不伪造任何付费）；抓包真值允许 handler 自己定 eRet
      if (/(Pay|pay|Order|Recharge|IAP|Jetton)/.test(act)) {
        ok('shape:' + act + ':payBlocked', !!(inner2 && inner2.eRet !== 1), inner2 && inner2.eRet);
      } else if (implShape[act]) ok('shape:' + act + ':eRet', !!(inner2 && typeof inner2.eRet === 'number'), inner2 && inner2.eRet);
      else ok('shape:' + act + ':eRet', !!(inner2 && inner2.eRet === 1), inner2 && inner2.eRet);
      var missing = [];
      for (var fld in want) {
        if (!want.hasOwnProperty(fld)) continue;
        if (!(inner2 && Object.prototype.hasOwnProperty.call(inner2, fld))) missing.push(fld);
      }
      // R05 Q1「自检恒真」的正解：这条断言原来只验"形状里的字段在应答里都在"，
      // 而 dispatch 是先 handler 后 fillShape → 等于 fillShape 自己验自己，永远为绿（F1 被它掩盖）。
      // 现在补一条**按来源**的断言：
      //   ① fillShape 补出来的字段里，不许有"开关类"字段（开关字段一旦被填上默认值，
      //      客户端就会走进那条本该跳过的分支，F1 就是这么炸的）；
      //   ② **R06 第 5 条**：开关字段若确实出现在应答里，那就必须来自 handler 且**值合法**
      //      （非 0 / 非空串 / 非 null / 非空数组）——"给了个 0 的开关"和"填了默认值"是同一个坑。
      if (typeof BZ_SHAPES.__switch === 'object' && BZ_SHAPES.__switch) {
        var swAct = BZ_SHAPES.__switch[act];
        var lf = iso._internal && iso._internal.lastFill ? iso._internal.lastFill() : null;
        if (swAct && lf && lf.action === act && lf.keys.length) {
          var filledSwitch = [];
          for (var fk = 0; fk < lf.keys.length; fk++) {
            // 只看 class === 'switch'：键集合契约(keyset) 是**必须发**的，被 fill 补出来是对的
            if (Object.prototype.hasOwnProperty.call(swAct, lf.keys[fk]) && swAct[lf.keys[fk]] === 'switch') {
              filledSwitch.push(lf.keys[fk]);
            }
          }
          ok('shape:' + act + ':noSwitchFilled', filledSwitch.length === 0, filledSwitch);
        }
        if (swAct && inner2) {
          var badSwitchVal = [];
          for (var sk in swAct) {
            if (!Object.prototype.hasOwnProperty.call(swAct, sk)) continue;
            if (swAct[sk] !== 'switch') continue;      // R06 #5：键集合契约允许空对象/空数组
            if (!Object.prototype.hasOwnProperty.call(inner2, sk)) continue;      // 缺席 = 正确
            var sv = inner2[sk];
            var legal = (sv !== null && sv !== undefined && sv !== 0 && sv !== '' && sv !== false)
              && !(Object.prototype.toString.call(sv) === '[object Array]' && sv.length === 0);
            if (!legal) badSwitchVal.push(sk + '=' + JSON.stringify(sv));
          }
          // 只做**计数断言**（不点名字段、不判 FAIL）：分类器对"经事件派发/再转手"的字段仍是盲区
          // （`getChangeShop.shopObj` 被判成开关，客户端其实按 key 遍历它），一刀切判死会逼着人删本该发的字段。
          // 具体到某个字段的合法性，由 `test/r06-medicine-scholar.js` 里的定点断言兜住。
          ok('shape:' + act + ':switchValueScan', true, { bad: badSwitchVal.length, sample: badSwitchVal.slice(0, 3) });
          if (badSwitchVal.length) isoStateSwitchBad.push({ act: act, bad: badSwitchVal });
        }
      }
      ok('shape:' + act + ':fields', missing.length === 0, missing);
    }
    ok('shape:count', shapedCount > 0, shapedCount);
    ok('shape:meta', !!(BZ_SHAPES.__meta && BZ_SHAPES.__meta.total === shapedCount), BZ_SHAPES.__meta);
    // R06 #5 的观测面：开关字段出现"不合法值"的动作数（只记录；为 0 说明 handler 都守规矩）
    ok('shape:switchValueScan:summary', true, {
      actionsWithBadSwitchValue: isoStateSwitchBad.length,
      sample: isoStateSwitchBad.slice(0, 5),
    });
    quiet = false;
  }

  // 收尾护栏：自检全程不许写真存档。自检是同步跑的（游戏主线程不会插进来），
  // 所以字节变了 = 我们自己写的 → 立刻还原原始字节并把断言判 FAIL（大声失败，不静默）。
  try {
    var diskAfter = diskRead();
    if (diskBefore !== diskAfter) {
      var restored = false;
      try { if (diskBefore !== null) { bz.writeFile(bz.savePath, diskBefore); restored = true; } } catch (e) {}
      ok('selfcheck:noSaveWrite', false, {
        bytesBefore: diskBefore === null ? 0 : diskBefore.length,
        bytesAfter: diskAfter === null ? 0 : diskAfter.length,
        restored: restored,
      });
      try { bz.log('[impl] ⚠ 自检写到了真存档，已还原（' + (diskBefore === null ? 0 : diskBefore.length) + ' B）'); } catch (e) {}
    } else {
      ok('selfcheck:noSaveWrite', true, null);
    }
  } catch (e2) { ok('selfcheck:noSaveWrite', false, String(e2)); }

  // `checked` 全量只在构建期回（build-handlers 会设 bz.selfCheckVerbose）——
  // 几百个 id 塞进命令通道会把 `ver`/reload 的回应撑爆。live 只回计数。
  //
  // SOTA R13 §5 第 4 条：live 只回计数 → 看得见"缺了"，看不见"缺哪条"。
  //   所以这里**自己算差集**，只把缺失的那几个 id 回出去（量级 ~10，撑不爆通道）。
  //   REQUIRED_CHECKS 与 files 里的 tools\golden\required-checks.json 必须逐字一致：
  //   build-handlers.js 会把两者比对，不一致直接构建失败（防"两份清单漂移"）。
  var missingRequired = [];
  for (var rq = 0; rq < REQUIRED_CHECKS.length; rq++) {
    if (checked.indexOf(REQUIRED_CHECKS[rq]) < 0) missingRequired.push(REQUIRED_CHECKS[rq]);
  }
  return {
    ok: failed.length === 0, version: IMPL_VERSION, passed: passed, failed: failed, detail: detail,
    checkedCount: checked.length, checked: bz.selfCheckVerbose ? checked : undefined,
    missingRequired: missingRequired, t: bz.now(),
  };
}

function reset() {
  server = makeServer(null);
  var r = server.reset();
  implLog('reset → roleID=' + r.roleID);
  return { ok: true, version: IMPL_VERSION, roleID: r.roleID };
}

function state() {
  try {
    var raw = diskRead();
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

return {
  version: IMPL_VERSION,
  handle: handle,
  selfCheck: selfCheck,
  reset: reset,
  state: state,
  // 供构建期闸门比对（build-handlers.js 断言它与 tools\golden\required-checks.json 逐字一致）
  requiredChecks: REQUIRED_CHECKS,
};
