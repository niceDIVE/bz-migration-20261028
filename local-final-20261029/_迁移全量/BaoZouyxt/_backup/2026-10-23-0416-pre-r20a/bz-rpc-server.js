'use strict';
/**
 * bz-rpc-server.js —— 真协议环回服务器（依据 2026-10-21 实机抓包 54 报文逐动作仿真）
 *
 * 已实测确认的协议规格：
 *   请求  : {"mod":"User","do":"<Action>","p":{...}} → LZString(Base64) → AES-256-CBC(UTF-8 Key) → Hex
 *   响应  : 两种形态——
 *           扁平: quicklogin / Create / GetChatAddress / CheckName（顶层直接 eRet/roleID/...）
 *           包裹: {"error":0,"p":"User.<do>","resultCode":200,"User.<do>":{...},"achievement":{...}}
 *   策略  : "模板回放 + 动态字段"——响应结构用抓包模板原样保真，仅替换 roleID/名字/时间/任务号。
 *
 * 传输无关：dispatch() 只产出业务对象；handleRequest() 负责编解码与信封选择。
 * 因此本文件可同时在进程内（handlers.js）与 Node（L0 测试）里跑。
 *
 * 注：ensureRole() 为 2026-10-21 21:08 外部加入的"首次运行自动造角色"雏形，
 *     当前尚未接入 quicklogin（保持原行为不变），留待持久化步骤启用。
 */

function createBzServer(env) {
  var TPL = env.templates || {};
  var SAVE_KEY = 'bz_server_save_v2';
  var _save = null;
  var _codec = env.codec || null;

  /* ===== 存档版本化（A03 采信：顺序迁移 + 写前校验 + 写后回读 + 语义守卫） =====
   * 设计要点（改动前先读这段）：
   *  1) 迁移步骤全部「可重入」，所以加载时**永远从 v1 跑起**，不靠"形态指纹"猜版本
   *     （我们的存档里 skills 是混形态：既有 [lv,pgr,brlv] 也有裸数字，指纹必误判）。
   *  2) saveVersion 只用来挡住「比当前程序更新的存档」：> LATEST 一律拒绝写回。
   *  3) 任何一步失败就进**只读模式**：游戏照常能玩（内存态），但一个字节都不落盘。
   *  4) 写前跑 validateSave + guardSave（缩水守卫），写完立刻回读比对，不一致就报警。
   *  详见 docs/sota/A03-save-versioning/adopted.md */
  var LATEST_SAVE = 4;
  var _readOnly = false;        // 迁移/校验/解析失败 → 只读，绝不写回
  var _lastGood = null;         // 上一次成功落盘的快照（缩水守卫的基线）
  var _currentAction = null;    // 当前正在处理的动作（守卫的 who 依据）
  // 动作计数（R04 Q4，2026-10-22）：替代会轮转的 bz_log.jsonl。只内存累加，下一次 persist
  // 落进 save.meta.actionStats；沙箱实例（自检/测试）不计数。
  var _actionStats = {};
  /** 饥饿上限（R05 F2）：客户端在 END_PLAY_GAME / CHECK_BREAK / END_DOUBLE_TRAINING 的请求里
   *  带 `hglmt`（index.js:24729 / 56272 / 56707）——那是它按属性算出来的**真上限**。
   *  我们只会从请求里学到它；学不到就不截断（宁可不动，也不编一个上限）。 */
  var _hungerMax = 0;
  /** hg 的合法范围（R05 F2 第 2 条）：非法就干脆不发 note.attrch，绝不把脏值写进客户端模型。 */
  var HG_MAX_SANE = 1e7;

  function hasOwn(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function num(v, d) { return (typeof v === 'number' && !isNaN(v)) ? v : d; }
  function cloneJson(o) { try { return JSON.parse(JSON.stringify(o)); } catch (e) { return null; } }
  function sumBag(bag) { var t = 0, k; for (k in bag) if (hasOwn(bag, k)) t += num(bag[k], 0); return t; }

  /** 动作计数（R04 Q4）：只内存累加，由 persist() 落到 save.meta.actionStats。
   *  沙箱实例（自检/测试用的隔离 server）一律不计数——否则自检会把假计数写进真存档。 */
  function noteAction(action) {
    if (env.sandbox) return;
    _actionStats[action] = (_actionStats[action] || 0) + 1;
  }

  /** 拒绝计数（SOTA R13 §5 / §3 的"cap 为 0 的计数表"）：
   *  静默拒绝（客户端对该码不进门、不弹提示）必须留痕 —— 玩家看到的是"点了没反应"，
   *  而根因通常是**投射分叉**（客户端模型有、账本没有），不是合法拒绝。
   *  只内存累加，由 persist() 落到 `save.meta.rejectStats`；沙箱实例不计数（同 noteAction）。
   *  ⚠ 语义：这张表**没有豁免**——任何 key 第一次出现都算新事件，验收器据此报警（见 tools\check_reject_codes.js）。 */
  var _rejectStats = {};
  function noteReject(action, reason, info) {
    env.log('⚠ REJECT ' + action + ' reason=' + reason + (info ? (' ' + info) : ''));
    if (env.sandbox) return;
    var k = action + ':' + reason;
    _rejectStats[k] = (_rejectStats[k] || 0) + 1;
  }

  /** "扣了但没效果"的消耗事件计数（**不是拒绝**）。
   *  SOTA R15 §1 第 3 条 / 反例 3：这类请求确实扣了物品、也写了档，记成 REJECT 会污染 rejectStats 的口径，
   *  还会和 R5c 的"拒绝不写档"互相矛盾 —— 日后有人写"凡有 REJECT 日志的请求都不许写档"这条强化断言时，
   *  它会红，而修红的动作可能是去改业务写档逻辑（把好事改坏）。
   *  所以单独一张表：`meta.consumeStats`，标签 `⚠ CONSUME_UNMODELED`。 */
  var _consumeStats = {};
  function noteConsume(action, reason, info) {
    env.log('⚠ CONSUME_UNMODELED ' + action + ' reason=' + reason + (info ? (' ' + info) : ''));
    if (env.sandbox) return;
    var k = action + ':' + reason;
    _consumeStats[k] = (_consumeStats[k] || 0) + 1;
  }

  /** handler 抛异常的次数（SOTA R14 §4 的 R5c 探测器）。
   *  为什么需要：`dispatch` 的 catch 会把异常换成"看起来正常"的应答，
   *  测试里没有断言就永远看不见；R5c 用"这个计数器不许增加"来抓"catch 吞异常"。 */
  var _catchCount = 0;
  function catchCount() { return _catchCount; }

  /** 拒绝码登记（**运行时副本**，权威来源 `tools\facts\reject-codes.json`）。
   *  两个用途：
   *    ① handler 抛异常时，catch 要回"这个动作登记的拒绝码"，不能回成功 ACK（SOTA R14 §1 第 6 条）；
   *    ② 拒绝应答的键收窄到 `{eRet} ∪ REJECT_ALLOW[action]`（SOTA R14 §1 第 1 条）。
   *  ⚠ 与 JSON 的漂移由构建期断言兜住（`build-handlers.js` 双向比对：这里有的动作/原因，JSON 里必须也有）。
   *  ⚠ 码要按**原因**分，不按动作分（R14 §1 第 3 条）：同一个 useItem，"秘籍已学会"用 5、
   *    "效果未建模"用 3（3 在客户端 64755-64910 的 if 链里**没有分支** → 静默、不误导）。 */
  var REJECT_CODES = {
    useItem: { default: 5, recipeLearned: 5, effectUnmodeled: 3 },
    BeginTraining: { default: 4, notLearned: 4 },
    BuyFashion: { default: 4 },
    buyShopItem: { default: 4 },
    buySpecialShopItem: { default: 4 },
    BuyAcitivityShop: { default: 4 },
    exchangeItem: { default: 4 },
    buyGoodAndEvilShopItem: { default: 4 },
    rgShopByItem: { default: 4 },
    QuickBuyItem: { default: 4 },
    washAdditionalArr: { default: 4 },   // flow：弹"选洗哪条"（不是拒绝）
    isCycleLife: { default: 2 },
    cycleLife: { default: 9 },
    specialCycleLife: { default: 9 },
    WashMedicine: { default: 0 },
    FindFriendByID: { default: 0 },
  };
  /** 拒绝应答的字段白名单（eRet 永远允许）。没列的动作 = 不收窄（风险收口：只动登记过的）。 */
  var REJECT_ALLOW = {
    useItem: ['itemID'],
    washAdditionalArr: ['attrList'],   // flow 分支要读 attrList（必须 4 段字符串）
  };
  /** 未建模效果的 useItem 是否"拒绝且不扣"。
   *  **2026-10-23 用户裁定：默认 false**（= 保持"照扣但无效果"，不改玩家现在能用的东西）。
   *  理由：可获性表算出的表内口径 N=248，但客户端**只对消耗品发 useItem**，一刀切会误伤；
   *  更贴"还原原版"的做法是先把 `item.Effect` 列导出来、按效果家族实现（buff / 经验书 / 礼包）。
   *  ⚠ 关掉不等于不管：命中的每一次都会写 `⚠ REJECT useItem reason=effectUnmodeledConsumed` 并计入
   *    `meta.rejectStats`（这就是 R13 §3 要的那张"cap 为 0"的消耗事件表）。
   *  回退/开启：改这一个常量即可（改 true 时走 eRet:3 拒绝且不扣，表里已有该条登记）。 */
  var REJECT_UNMODELED_ITEMS = false;
  function rejectCodeOf(action, reason) {
    var m = REJECT_CODES[action];
    if (!m) return 4;
    if (reason && hasOwn(m, reason)) return m[reason];
    if (hasOwn(m, 'default')) return m['default'];
    for (var k in m) if (hasOwn(m, k)) return m[k];
    return 4;
  }

  /** handler 抛异常时该回哪个码（SOTA R15 §1 第 1 条 + 反例 1）。
   *  **不能一律回 4**：4 在不同动作的回调里语义不同（`ExChangeJetton` 的 4 是支付拦截、`useItem` 的 4 会
   *  解引用 item.Data2 弹"需消耗[1]个[2]"、有的动作 4 是"弹选择框"）。回错码 = 打开空界面或直接崩。
   *  规则：优先用构建期注入的 `BZ_CATCH_CODES[动作]`（由 `tools\facts\reject-codes.json` 的
   *  `catchCode` 字段推导：必须 ∉ success ∪ handled ∪ 本动作所有 flow/capture/intercept 码）；
   *  没有登记的动作 → **不回 eRet**（所有 `X == eRet` 比较都为假 → 客户端安静地不做事），并大声记日志。
   *  不回码比回错码安全：回错码会让客户端走进一条它以为存在的分支。 */
  function catchCodeOf(action) {
    var t = (typeof BZ_CATCH_CODES !== 'undefined') ? BZ_CATCH_CODES : null;
    if (t && hasOwn(t, action)) return t[action];
    return undefined;
  }

  /** 把账本再一次推给活客户端模型（SOTA R15 §1 第 2 条 / 反例 2）。
   *  catch 里 `_save = null` 只回滚了**服务端账本**；如果 handler 在抛异常之前已经通过
   *  `__require('RoleBaseInfo')` 那条第二出口改过客户端活模型（金币/技能/…），客户端会一直显示脏值，
   *  并可能据此继续发请求。所以回滚之后必须把权威值重推一遍（不推 = 客户端继续显示 999999）。 */
  function repushLive(s) {
    if (env.sandbox || !s) return;
    // ⚠ 每一段各自 try（SOTA R16 反例 3）：万一 push 本身抛异常（比如客户端技能表里没有这个 id），
    //   异常会从 catch 里再抛出去 → 调用方拿不到任何应答 → 客户端遮罩一直挡着。
    //   所以这里吞掉、只记日志；catch 分支保证无论如何都返回一个应答。
    try { pushEco(s); } catch (e) { env.log('repushLive pushEco 失败: ' + e); }
    try {
      var sk = s.skills || {};
      for (var id in sk) {
        if (!hasOwn(sk, id)) continue;
        var v = sk[id] || [];
        try { pushSkillToClient(parseInt(id, 10) || 0, v[0] || 1, s.potential, v[1] || 0, v[2] || 1); }
        catch (e2) { env.log('repushLive pushSkill ' + id + ' 失败: ' + e2); }
      }
    } catch (e3) { env.log('repushLive 遍历技能失败: ' + e3); }
  }
  /** 拒绝应答收窄（SOTA R14 §1 第 1 条 + 反例 1）。
   *  实测过的形态：`BeginTraining` 拒绝应答被 fillShape 补成 `{eRet:4, beginTime:0, skillID:0}`。
   *  今天 `beginTime:0` 无害（客户端只在 1/2 分支读它），但只要有天把拒绝码改成 3，
   *  客户端就会拿 `skillID:0` 去 `getItem(0,"skill")` 得 null 然后读 `.Name` 崩 —— 那个 0 是我们自己发的。 */
  function narrowReject(action, res) {
    var inner = res && res['User.' + action];
    if (!inner || typeof inner !== 'object' || Array.isArray(inner)) return res;
    if (inner.eRet === 1 || inner.eRet === undefined || inner.eRet === null) return res;  // 成功应答不动
    if (!hasOwn(REJECT_CODES, action)) return res;                                        // 未登记动作不动
    var allow = ['eRet'].concat(REJECT_ALLOW[action] || []);
    var keys = Object.keys(inner);
    for (var i = 0; i < keys.length; i++) if (allow.indexOf(keys[i]) < 0) delete inner[keys[i]];
    return res;
  }

  /** L4 观察守卫（A04 回执第 4 条，2026-10-22；**R05 回执改口径 2026-10-22 夜**）。
   *  **只记录、不拒绝**（拒绝会让玩家丢操作）；价值是把 §17.2 那类静默事故（20 卖 1 被写成 1）
   *  在日志里当场暴露成 `OBS 未解释差额 <动作>: ...`。
   *
   *  R05 审阅的两条更正（原实现错在这里）：
   *   1) 原来"带非空 rewardArray 的动作整体豁免"。但豁免的恰恰是**重复发奖 / 吞奖**最容易发生的地方，
   *      而 `rewardArray` 本身就是事件声明 → 现在改成：**差额必须等于 rewardArray**（不再豁免）。
   *   2) 原来只比 bag，不看 `playerEquip`（装备类奖励全在那边）→ 现在两边都比。
   *  每键的判据按顺序：
   *    a) `note.ivch[键]`（绝对值）等于账本新值 → 已文档化，放过；
   *    b) 奖励类且 `before + rewardArray[键] === after` → 由奖励清单解释，放过；
   *    c) 其余 → 记一条 `未解释差额`。
   *  这样"扣成本 + 发货"的商店动作不会误报（它们回 `note.ivch` 绝对值），
   *  而"多发了 5 个"或"扣了没记账"一定会留痕。 */
  function snapshotLedger() {
    if (!_save) return null;
    var pe = {};
    var src = _save.playerEquip || {};
    for (var uk in src) if (hasOwn(src, uk)) pe[uk] = Array.isArray(src[uk]) ? (num(src[uk][1], 0)) : num(src[uk], 0);
    return {
      bag: cloneJson(_save.bag) || {},
      playerEquip: pe,
      coins: num(_save.coins, null), gold: num(_save.gold, null),
      yuanbao: num(_save.yuanbao, null), contribution: num(_save.contribution, null),
    };
  }
  function observeLedger(action, before, res) {
    if (env.sandbox || !before || !_save) return;
    if (/^bz/.test(action)) return;                 // 维护动作（写前有备份，且不属于游戏协议）
    var inner = res && res['User.' + action];
    if (!inner || typeof inner !== 'object') return;
    var note = inner.note || {};
    var hasReward = !!(inner.rewardArray && typeof inner.rewardArray === 'object' && Object.keys(inner.rewardArray).length);
    var reward = hasReward ? inner.rewardArray : {};
    var issues = [];
    var pe = {};
    var src = _save.playerEquip || {};
    for (var uk in src) if (hasOwn(src, uk)) pe[uk] = Array.isArray(src[uk]) ? (num(src[uk][1], 0)) : num(src[uk], 0);
    var after = {
      bag: _save.bag || {},
      playerEquip: pe,
      coins: num(_save.coins, null), gold: num(_save.gold, null),
      yuanbao: num(_save.yuanbao, null), contribution: num(_save.contribution, null),
    };
    /** 单个"物品账"（bag 或 playerEquip）的差额解释 */
    function checkItems(label, b, a, eqKind) {
      var k, seen = {};
      for (k in b) seen[k] = 1;
      for (k in a) seen[k] = 1;
      for (k in seen) {
        var bv = num(b[k], 0), av = num(a[k], 0);
        if (bv === av) continue;
        var doc = eqKind
          ? ((note.eqch && hasOwn(note.eqch, k)) ? note.eqch[k] : null)
          : ((note.ivch && hasOwn(note.ivch, k)) ? note.ivch[k] : null);
        // eqch 的形状是 [0]（删除）或 [1,[type,num]]（绝对值），要取出"新数量"
        if (doc !== null) {
          var docVal = null;
          if (eqKind && Array.isArray(doc)) docVal = (doc[0] === 0) ? 0 : (Array.isArray(doc[1]) ? num(doc[1][1], null) : num(doc[1], null));
          else if (!eqKind) docVal = parseInt(doc, 10);
          if (docVal !== null && docVal === av) continue;              // (a) 已文档化
          if (docVal !== null && docVal !== av) {
            issues.push((eqKind ? 'note.eqch.' : 'note.ivch.') + k + '=' + docVal + ' 但账本到 ' + av);
            continue;
          }
        }
        if (hasReward && bv + num(reward[k], 0) === av) continue;       // (b) 奖励清单解释
        issues.push(label + '.' + k + ' ' + bv + '→' + av);             // (c) 未解释
      }
    }
    checkItems('bag', before.bag, after.bag, false);
    checkItems('equip', before.playerEquip || {}, after.playerEquip, true);
    var curs = ['coins', 'gold', 'yuanbao', 'contribution'];
    for (var ci = 0; ci < curs.length; ci++) {
      var ck = curs[ci];
      if (before[ck] === after[ck]) continue;
      if (note.eco && hasOwn(note.eco, ck)) {
        if ((parseInt(note.eco[ck], 10) || 0) !== after[ck]) issues.push('note.eco.' + ck + '=' + note.eco[ck] + ' 但账本到 ' + after[ck]);
        continue;
      }
      if (hasReward && before[ck] + num(reward[ck], 0) === after[ck]) continue;
      issues.push(ck + ' ' + before[ck] + '→' + after[ck]);
    }
    if (issues.length) env.log('OBS 未解释差额 ' + action + ': ' + issues.join('; '));
  }

  /** 顺序迁移：每步必须可重入（跑两遍结果一样），因此永远从 v1 跑起 */
  function migrateSave(raw) {
    var s = cloneJson(raw) || {}, k, v;
    // v1 -> v2：装备实例 / 装备槽位
    if (!hasOwn(s, 'playerEquip')) s.playerEquip = {};
    if (!hasOwn(s, 'equipments')) s.equipments = {};
    // v2 -> v3：技能逐值归一（裸数字 → [等级,进度,突破]；残缺数组补默认）
    var sk = s.skills || {};
    for (k in sk) {
      if (!hasOwn(sk, k)) continue;
      v = sk[k];
      if (typeof v === 'number') sk[k] = [v > 0 ? v : 1, 0, 1];
      else if (Array.isArray(v)) sk[k] = [num(v[0], 1), num(v[1], 0), num(v[2], 1)];
      else sk[k] = [1, 0, 1];
    }
    s.skills = sk;
    // v3 -> v4：已发奖励名单；缺失只补 []，**绝不回填 done**
    //（回填 = 宣称"老档都发过"，会让「完成了但没领」的玩家永久丢奖励；补发由维护动作 bzBackfillRewards 负责）
    if (!hasOwn(s, 'rewarded')) s.rewarded = [];
    s.saveVersion = LATEST_SAVE;
    return s;
  }

  /** 写前/加载后校验：只校验我们真的会用到的字段（不做全量 schema） */
  function validateSave(s) {
    if (!s || typeof s !== 'object') throw new Error('NOT_OBJECT');
    var k, a;
    for (k in s.skills) {
      if (!hasOwn(s.skills, k)) continue;
      a = s.skills[k];
      if (!Array.isArray(a) || a.length !== 3) throw new Error('ABILITY_SHAPE:' + k);
      if (typeof a[0] !== 'number' || isNaN(a[0])) throw new Error('ABILITY_LV:' + k);
    }
    for (k in s.bag) {
      if (!hasOwn(s.bag, k)) continue;
      if (typeof s.bag[k] !== 'number' || s.bag[k] < 0 || isNaN(s.bag[k])) throw new Error('BAG:' + k);
    }
    if (hasOwn(s, 'rewarded') && !Array.isArray(s.rewarded)) throw new Error('REWARDED');
    if (hasOwn(s, 'done') && !Array.isArray(s.done)) throw new Error('DONE');
    return true;
  }

  /** 写前语义守卫：拦"不可逆的缩水"。这两个动作本来就该消耗/卖光背包，豁免。 */
  var SHRINK_OK = { useItem: 1, saleItem: 1 };
  function guardSave(prev, next) {
    if (!prev || !next) return null;
    var k, p, n;
    for (k in prev.skills) {
      if (!hasOwn(prev.skills, k)) continue;
      p = num(prev.skills[k] && prev.skills[k][0], 0);
      n = hasOwn(next.skills, k) ? num(next.skills[k][0], 0) : 0;
      if (n < p) return '技能' + k + '等级下降 ' + p + '→' + n;
    }
    if ((next.done || []).length < (prev.done || []).length) return 'done 数量减少 ' + (prev.done || []).length + '→' + (next.done || []).length;
    if ((next.rewarded || []).length < (prev.rewarded || []).length) return 'rewarded 数量减少 ' + (prev.rewarded || []).length + '→' + (next.rewarded || []).length;
    var pb = sumBag(prev.bag), nb = sumBag(next.bag);
    if (pb > 0 && nb === 0 && !SHRINK_OK[_currentAction || '']) return '背包从 ' + pb + ' 清空';
    return null;
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function ach() { return (TPL.create && clone(TPL.create.achievement)) || { red: false, achieveRateId: 0 }; }
  function wrapped(doName, payload, extra) {
    var r = { error: 0, p: 'User.' + doName, resultCode: 200 };
    r['User.' + doName] = payload;
    if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) r[k] = extra[k];
    return r;
  }
  function ack(doName, extra) { return wrapped(doName, { eRet: 1 }, extra); }

  /** 把"抓包时写死的时间窗口"整体平移到当前时刻（SOTA R17 §1 第 2 条 / 反例 7：时间炸弹）。
   *
   *  背景：`TPL.create.activityResource = {"67":[null,1793177770630]}` 是**抓包真值**，
   *  它的语义是"抓包那一刻 + 7 天"。`serverTime` 我们已经换成 `env.now()`，但活动窗口仍是静态值 ⇒
   *  `2026-10-28 01:56:10 PDT` 之后 `end < now`，客户端会按"活动已结束"隐藏入口、货架消失。
   *  做法：`delta = now - 抓包时刻`，只把 `activityResource` 里的毫秒整体加 delta ——
   *  "活动窗口相对现在还有 7 天"，与抓包那一刻的语义完全一致，且不会越跑越过期。
   *  ⚠ 只动 `activityResource`，不碰快照里别的时间（像 `housekeeper.taskRtm` 不是活动窗口）。
   *  ⚠ 这是**行为变更**（活动从"10-28 后关闭"变成"永远还有 7 天"）→ 常量可一行回退，已列入待用户裁定。 */
  var REBASE_ACTIVITY_WINDOWS = true;
  function rebaseActivityWindows(holder, fromMs, toMs) {
    if (!REBASE_ACTIVITY_WINDOWS) return holder;
    if (!holder || !holder.activityResource) return holder;
    var from = num(fromMs, 0), to = num(toMs, 0);
    var d = to - from;
    if (!(from > 1.6e12) || !(d > 0)) return holder;
    var res = holder.activityResource;
    for (var k in res) {
      if (!hasOwn(res, k)) continue;
      var v = res[k];
      if (Array.isArray(v)) {
        for (var i = 0; i < v.length; i++) if (typeof v[i] === 'number' && v[i] > 1.6e12) v[i] += d;
      } else if (v && typeof v === 'object') {
        for (var t in v) {
          if (!hasOwn(v, t)) continue;
          var w = v[t];
          if (Array.isArray(w)) for (var j = 0; j < w.length; j++) if (typeof w[j] === 'number' && w[j] > 1.6e12) w[j] += d;
          else if (typeof w === 'number' && w > 1.6e12) v[t] = w + d;
        }
      } else if (typeof v === 'number' && v > 1.6e12) res[k] = v + d;
    }
    return holder;
  }

  function loadSave() {    if (_save) return _save;
    var raw = null;
    try { raw = env.readSave(SAVE_KEY); } catch (e) { env.log('存档读取失败: ' + e); _readOnly = true; }
    var parsed = null;
    if (raw) {
      try { parsed = JSON.parse(raw); }
      catch (e2) { env.log('⚠ 存档解析失败（按空档继续、禁止写回）: ' + e2); _readOnly = true; }
    }
    _save = parsed || {};
    // 版本化：迁移 → 校验；任一失败 → 只读模式（内存态照常供游戏使用）
    try {
      var v = +_save.saveVersion;
      if (v > LATEST_SAVE) throw new Error('NEWER_SAVE:' + v);
      _save = migrateSave(_save);
      validateSave(_save);
      _lastGood = cloneJson(_save);
    } catch (e3) {
      env.log('⚠ 存档迁移/校验失败，进入只读模式（一个字节都不会写回）: ' + e3);
      _readOnly = true;
    }
    if (!_save.roleID) _save.roleID = 16374;             // 模板同款；客户端只作标识用
    if (!_save.accepted) _save.accepted = [];
    if (!_save.done) _save.done = [];
    if (!_save.skills) _save.skills = {};
    return _save;
  }
  function persist() {
    if (_readOnly) { env.log('⚠ 只读模式：拒绝写档（动作 ' + (_currentAction || '?') + '）'); return false; }
    var bad = null;
    try { validateSave(_save); }
    catch (e) { bad = '校验失败: ' + e; }
    if (!bad) bad = guardSave(_lastGood, _save);
    if (bad) {
      // 拒绝写入还不够：内存里的坏值会继续被投射成应答（回空背包 → 客户端清空 → 下一次动作把空写实）。
      // 所以必须回滚内存到"上次落盘成功"的快照。见 docs/sota/B01-A04/adopted.md 的 A-3。
      var canRollback = _lastGood != null;
      if (canRollback) _save = cloneJson(_lastGood);
      env.log('⚠ 写前守卫拒绝（动作 ' + (_currentAction || '?') + '）: ' + bad + (canRollback ? ' → 内存已回滚到上次落盘快照' : ' → 无可回滚快照'));
      return false;
    }
    // 动作计数随手落盘（R04 Q4）：guard/validate 都在它之前，所以 meta 不参与缩水守卫与 schema 校验。
    if (!env.sandbox) {
      _save.meta = _save.meta || {};
      _save.meta.actionStats = cloneJson(_actionStats) || {};
      // 拒绝计数（R13 §5）：与 actionStats 同口径、同位置落盘，沙箱不写。
      _save.meta.rejectStats = cloneJson(_rejectStats) || {};
      // "扣了但没效果"的消耗计数（R15 §1 第 3 条）：**不进 rejectStats**，单独一张表。
      _save.meta.consumeStats = cloneJson(_consumeStats) || {};
    }
    // 饥饿上限（R05 F2）：客户端在挂机结算请求里自报 `hglmt`（index.js:24729/56272/56707），
    // 那是它按属性算出来的真上限。只内存记，随下一次业务写入落盘，跟 actionStats 同口径。
    if (_hungerMax > 0) _save.hungerMax = _hungerMax;
    var text;
    try { text = JSON.stringify(_save); } catch (e2) { env.log('存档序列化失败: ' + e2); return false; }
    try { env.writeSave(SAVE_KEY, text); } catch (e3) { env.log('存档写入失败: ' + e3); return false; }
    // 写后回读比对（我们没有 fsync，这层是唯一能发现"写了半截/没落盘"的手段）
    try {
      var back = env.readSave(SAVE_KEY);
      if (back !== text) {
        env.log('⚠ 写后回读不一致（回读 ' + (back == null ? 'null' : String(back).length) + ' B / 写入 ' + text.length + ' B），本档可能不可靠');
        return false;
      }
    } catch (e4) { env.log('写后回读失败: ' + e4); }
    _lastGood = cloneJson(_save);
    return true;
  }

  /** 维护动作写前备份（bzPatch / bzSeedBag / bzBackfillRewards 会直接改档）。
   *  设备端只有一个滚动备份位 `bz_offline_save.json.pre-maint.json`，够回滚到"本次维护之前"。
   *  见 docs/sota/B01-A04/adopted.md 的 A-4。 */
  function backupBeforeMaint(tag) {
    try {
      if (!env.writeAux) return false;
      return !!env.writeAux('pre-maint.json', JSON.stringify(_save));
    } catch (e) { env.log('维护前备份失败: ' + e); return false; }
  }

  /** 把权威的技能等级 / 潜能推回客户端模型（`window.__require` 仅进程内可用）。
   *  ⚠ 自检/隔离实例（env.sandbox）一律跳过：否则每次 reload 都会把内存档算出的假值
   *    （99999-100*n → 99699）推成活客户端的 potentials，并 setSkill(0,·) 造出假技能 0。
   *  失败就算了，绝不影响应答。 */
  function pushSkillToClient(id, lv, pot, pgr, brlv) {
    if (env.sandbox) return;
    try {
      var R = (typeof window !== 'undefined') ? window.__require : null;
      if (typeof R !== 'function') return;
      var B = R('RoleBaseInfo'); B = B && (B.RoleBaseInfo || B);
      if (B) B.potentials = pot;
      var ST = R('SkillTable'); ST = ST && (ST.SkillTable || ST);
      if (!ST) return;
      var n = parseInt(id, 10) || 0;
      if (typeof ST.setSkill === 'function') ST.setSkill(n, lv);
      // 进度/突破等级也要推：否则客户端面板的 (xx%) 会和账本脱节，取消后看着像"进度没了"
      if (typeof pgr === 'number' && typeof ST.setUpgrdPgr === 'function') ST.setUpgrdPgr(n, pgr);
      if (typeof brlv === 'number' && typeof ST.setBrLv === 'function') ST.setBrLv(n, brlv);
    } catch (e) {}
  }

  /** 物品/装备账本：客户端每次收到 User.sycnPlayerItemData 都会先清空自己那份再从应答重建
   *  （index.jsc:24016-24018：`_itemObj = {}` 再按 e.itemObj 逐条 setItem），
   *  所以这里必须回「全部持有物」；回空 {} 等于把玩家背包清空。 */
  function ensureLedger(s) {
    var c = TPL.create || {};
    if (!s.bag || typeof s.bag !== 'object') {
      // 模板里的 itemObj 可能是 {"4001":0,"4003":0} 这种占位，只留 count>0 的
      var seed = c.itemObj || {}, keep = {};
      for (var k in seed) {
        if (!seed.hasOwnProperty(k)) continue;
        if ((parseInt(seed[k], 10) || 0) > 0) keep[k] = seed[k];
      }
      s.bag = keep;
    }
    if (!s.playerEquip || typeof s.playerEquip !== 'object') s.playerEquip = clone(c.PlayerEquip || {});
    if (!s.equipments || typeof s.equipments !== 'object') s.equipments = {};
    // 付费货币也进账本（用户 2026-10-22 裁定：**金条/元宝可以做，但不做任何真实付费渠道**）。
    // 金条 gold 的缺省与 LoadGame 同口径（99999）；元宝 yuanbao 缺省 0，只能靠 bzGrantCur 增。
    if (typeof s.gold !== 'number') s.gold = 99999;
    if (typeof s.yuanbao !== 'number') s.yuanbao = 0;
    // 正邪贡献（2026-10-22 商店批次）：正邪商店的货币（GoodEvilBuyUI 比 goodEvilContribution）。
    // 正邪系统本体未实现 → 缺省 0，来源只有维护动作 bzGrantCur（不做任何付费渠道）。
    if (typeof s.contribution !== 'number') s.contribution = 0;
    // 洗点（洗附加属性）账本：bloodArr = [力量,身法,根骨,悟性] 的附加；fosterArr = 先天培养附加。
    // 客户端把它们加在基础属性上（index.js:111891-111894：baseValue += cycleData[7][x] + cycleData[8][x]）。
    if (!Array.isArray(s.bloodArr) || s.bloodArr.length !== 4) s.bloodArr = [0, 0, 0, 0];
    if (!Array.isArray(s.fosterArr) || s.fosterArr.length !== 4) s.fosterArr = [0, 0, 0, 0];
    return s;
  }

  /** 背包增减（id → 数量；归零即删除）。客户端 setItem 只认 parseInt(count) > 0 的项 */
  function bagAdd(s, id, n) {
    var iid = parseInt(id, 10);
    var d = parseInt(n, 10);
    if (!(iid > 0) || !d) return 0;
    var cur = parseInt(s.bag[iid], 10) || 0;
    cur += d;
    if (cur < 0) cur = 0;
    if (cur === 0) delete s.bag[iid];
    else s.bag[iid] = cur;
    return cur;
  }

  /** 出售价：item 表的 `Price` 列（由 tools/gen_task_rewards.js 生成为 BZ_ITEMPRICE）。
   *  依据：客户端 InventoryModel.sellItem 自己算的是 `o += parseInt(g.Price) * h[2]`
   *  （index.js:65191-65208），**不是 BuyPrice**（BuyPrice 是商店买价）。 */
  function itemPrice(id) {
    var m = (typeof BZ_ITEMPRICE !== 'undefined') ? BZ_ITEMPRICE : null;
    if (!m) return 0;
    var v = parseInt(m[parseInt(id, 10)], 10);
    return (v > 0) ? v : 0;
  }

  /** 商店买价：item 表的 `BuyPrice` 列（NormalShopUI 货架价 `price: s.BuyPrice`，scripts2.js:46443）。
   *  ⚠ 与 itemPrice（卖价 Price）是**两列**，别混。 */
  function itemBuyPrice(id) {
    var m = (typeof BZ_ITEMBUYPRICE !== 'undefined') ? BZ_ITEMBUYPRICE : null;
    if (!m) return 0;
    var v = parseInt(m[parseInt(id, 10)], 10);
    return (v > 0) ? v : 0;
  }

  /** NPC 金条商店货架（BZ_NPCSHOP，生成自配置表 random_shop / house_shop / lh_shop 里带 npc 的行） */
  function npcShopOf(npc) {
    var m = (typeof BZ_NPCSHOP !== 'undefined') ? BZ_NPCSHOP : null;
    if (!m) return null;
    var v = m[parseInt(npc, 10)];
    return (v && v.i && v.i.length) ? v : null;
  }

  /** 维护动作专用：把货币账本推到活客户端。
   *  普通动作不需要它（应答里的 `note.eco` 会被客户端的 ECONOMY_CHNG 监听器直接写进模型，
   *  index.js:64698-64723），但维护动作是从命令通道打进来的，没有"应答消费端"，必须手动推。 */
  function pushEco(s) {
    if (env.sandbox) return;
    try {
      var R = (typeof window !== 'undefined') ? window.__require : null;
      if (typeof R !== 'function') return;
      var B = R('RoleBaseInfo'); B = B && (B.RoleBaseInfo || B);
      if (!B) return;
      if (typeof s.coins === 'number') B.coins = s.coins;
      if (typeof s.gold === 'number') B.gold = s.gold;
      if (typeof s.yuanbao === 'number') B.yuanbao = s.yuanbao;
      var MC = R('MessageCenter'); MC = MC && (MC.MessageCenter || MC);
      var EV = R('EvName'); EV = EV && (EV.EvName || EV);
      if (MC && typeof MC.dispatch === 'function') MC.dispatch((EV && EV.CHANGE_ROLE_INFO) || 'CHANGE_ROLE_INFO');
    } catch (e) {}
  }

  /** 装备实例 uid → itemID：type==1 时 uid 就是 itemID；type>=2 时 data[1] 才是
   *  （index.js:65117-65136 parseEq 的 type 分支）。必须在删 playerEquip 之前调用。 */
  function equipItemIDOf(s, uid) {
    var inst = (s.playerEquip || {})[uid];
    if (!Array.isArray(inst)) return parseInt(uid, 10) || 0;
    var t = parseInt(inst[0], 10) || 0;
    if (t === 0 || t === 1) return parseInt(uid, 10) || 0;
    return parseInt(inst[1], 10) || 0;
  }

  /** 把权威铜钱推回客户端。HUD 的铜钱 Label 走
   *  `MessageCenter.on(CHANGE_ROLE_INFO, setBaseInfo)` → 读 `RoleBaseInfo.coins`
   *  （scripts2.js:49715 / 49727），而 LoadGame 只在登录时把 baseValueAy[35] 投给它
   *  （index.js:111792）。运行期改钱若不推、不派发事件，玩家卖完东西看不到余额变化。
   *  ⚠ 沙盒实例一律跳过（同 pushSkillToClient 的理由）。 */
  function pushCoins(coins) {
    if (env.sandbox) return;
    if (typeof coins !== 'number') return;
    try {
      var R = (typeof window !== 'undefined') ? window.__require : null;
      if (typeof R !== 'function') return;
      var B = R('RoleBaseInfo'); B = B && (B.RoleBaseInfo || B);
      if (B) B.coins = coins;
      var MC = R('MessageCenter'); MC = MC && (MC.MessageCenter || MC);
      var EV = R('EvName'); EV = EV && (EV.EvName || EV);
      if (MC && typeof MC.dispatch === 'function') {
        MC.dispatch((EV && EV.CHANGE_ROLE_INFO) || 'CHANGE_ROLE_INFO');
      }
    } catch (e) {}
  }

  /** 任务元数据（来自游戏原始配置表 tasknew + drop，见 tools/gen_task_rewards.js）
   *  n = 完成该任务需要携带的物品；r = 完成应发奖励 */
  function taskMeta(id) {
    var t = (typeof BZ_TASKS !== 'undefined') ? BZ_TASKS : null;
    if (!t || id === undefined || id === null) return null;
    return t[String(id)] || null;
  }

  /** 物品类型（1 = 装备）。只覆盖"奖励/任务要求"里出现过的物品，同样来自原始配置表。 */
  function itemTypeOf(id) {
    var t = (typeof BZ_ITEMTYPE !== 'undefined') ? BZ_ITEMTYPE : null;
    if (!t) return 0;
    return parseInt(t[String(id)], 10) || 0;
  }

  /** 饥饿上限（R05 F2 引入；**R06 第 6 条更正优先级**）：
   *   1) 本次请求自带的 `hglmt`（最新鲜 —— 客户端按属性算完立刻带上）
   *   2) 活客户端模型 `hunger.limit/finalValue`（属性涨了它就涨）
   *   3) 账本 `s.hungerMax`（学到的历史值）**只作后备/下限保护**：
   *      一旦它小于活模型值就用活模型值覆盖它，避免过期上限把饱食度截得过低。
   *  都没有 → 0 = **不截断**（不编上限）。 */
  function hungerCapOf(s, reqLmt) {
    var fromReq = parseInt(reqLmt, 10) || 0;
    if (fromReq > 0 && fromReq <= HG_MAX_SANE) return fromReq;
    var live = 0;
    if (typeof env.hungerMax === 'function') {
      try { live = parseInt(env.hungerMax(), 10) || 0; } catch (e) { /* 读不到当没有 */ }
    }
    if (live > HG_MAX_SANE) live = 0;
    var saved = (s && (parseInt(s.hungerMax, 10) || 0)) || 0;
    if (_hungerMax > saved) saved = _hungerMax;
    if (live > 0 && saved > 0) {
      if (saved < live) {                       // 账本过期（属性涨过）→ 用活模型覆盖
        if (s) s.hungerMax = live;
        env.log('hungerMax 账本 ' + saved + ' 小于活模型 ' + live + ' → 用活模型值覆盖（防止过期上限截断）');
        return live;
      }
      return saved;
    }
    if (live > 0) return live;
    return saved > 0 ? saved : 0;
  }

  /** 可重复接取的任务（tasknew.Repeat≠0）。
   *  客户端 `updateTaskData`（index.js:134524）是 `if (0 == t.taskObj.Repeat) { finishTaskObj[o]=e; ... }`
   *  —— 重复任务**不被客户端记为完成**，所以它能被再次接取。我们跟着不写 done、并从 accepted 里移除，
   *  否则这份任务会被永久标成"做过"，与客户端行为分叉。 */
  function isRepeatTask(id) {
    var m = taskMeta(id);
    return !!(m && m.p);
  }

  /** 发放物品：装备进 PlayerEquip（`[1, 数量]`，无随机属性时 uid 就是物品 id），其它进背包。
   *  客户端 parseEq(uid,[1,num]) → {id:uid, type:1, itemID:uid, num} → equipmentDic[uid] */
  function grantItem(s, id, n) {
    var iid = parseInt(id, 10);
    var cnt = parseInt(n, 10) || 0;
    if (!(iid > 0) || cnt <= 0) return;
    if (!s.playerEquip) s.playerEquip = {};
    if (itemTypeOf(iid) === 1) {
      var cur = Array.isArray(s.playerEquip[iid]) ? (parseInt(s.playerEquip[iid][1], 10) || 0) : 0;
      s.playerEquip[iid] = [1, cur + cnt];
    } else {
      bagAdd(s, iid, cnt);
    }
  }

  /** 扣除物品（消耗任务所需 / 卸下装备时用），扣到 0 即删除 */
  function consumeItem(s, id, n) {
    var iid = parseInt(id, 10);
    var cnt = parseInt(n, 10) || 0;
    if (!(iid > 0) || cnt <= 0) return;
    if (!s.playerEquip) s.playerEquip = {};
    if (itemTypeOf(iid) === 1) {
      var cur = Array.isArray(s.playerEquip[iid]) ? (parseInt(s.playerEquip[iid][1], 10) || 0) : 0;
      cur -= cnt;
      if (cur > 0) s.playerEquip[iid] = [1, cur];
      else delete s.playerEquip[iid];
    } else {
      bagAdd(s, iid, -cnt);
    }
  }

  /** 货币 id：客户端 getItemNum 对这几个走特判（1→gold、4001→coins），不是背包物品。
   *  （见 index.jsc:134428 judgeItemRequire 与 §4.7；往 itemObj 里塞它们无效） */
  var CURRENCY_IDS = { 1: 1, 2: 1, 4001: 1, 4002: 1, 4003: 1 };
  function isCurrencyItem(id) { return !!CURRENCY_IDS[parseInt(id, 10) || 0]; }

  /** 货币 id → 钱包落点（2026-10-23 修 §7-2：奖励是货币时**不许**走 grantItem）
   *
   *  三个名字对不上，写错不报错、只静默失效，所以这张表必须写全并留在同一处：
   *    客户端特判 `tools/index.js:106347-106360 getItemNum`：1→gold、4001→coins、4002→exp、
   *               4003→potentials、8888→yuanbao（**从不读 _itemObj**，所以塞背包 = 假物品）
   *    eco 监听器 `tools/index.js:64698-64725 ECONOMY_CHNG`：只认 coins / ptt / gold / exp / chips / yuanbao
   *               —— **潜能是 `ptt`**，而存档字段叫 `potential`；发 `note.eco.potential` 客户端直接丢弃
   *    存档/投射   本文件 LoadGame：gold / coins / potential / yuanbao
   *
   *  `4002(经验)` 故意不在此表：存档里没有 exp 字段、LoadGame 也无处投射，
   *  宁可让调用方明确拒绝，也不许照旧塞进背包变成"永远不生效的假物品"。 */
  var CURRENCY_SLOTS = {
    1: { f: 'gold', k: 'gold' },
    4001: { f: 'coins', k: 'coins' },
    4003: { f: 'potential', k: 'ptt' },
    8888: { f: 'yuanbao', k: 'yuanbao' }
  };
  function currencySlot(id) { return CURRENCY_SLOTS[parseInt(id, 10) || 0] || null; }

  /** 货币入账：写存档钱包，返回该塞进 `note.eco` 的 `{键: 新余额}`；不是可入账货币返回 null（不改任何东西）。
   *  缺省值沿用各处既有口径：gold / coins / potential 缺省 99999，yuanbao 缺省 0。 */
  function grantCurrency(s, id, n) {
    var slot = currencySlot(id);
    var cnt = parseInt(n, 10) || 0;
    if (!slot || cnt <= 0) return null;
    if (typeof s[slot.f] !== 'number') s[slot.f] = (slot.f === 'yuanbao') ? 0 : 99999;
    s[slot.f] += cnt;
    var eco = {};
    eco[slot.k] = s[slot.f];
    return eco;
  }

  /** 把"派生叠加"推给活着的客户端模型（B，2026-10-22）
   *
   *  为什么需要：`acceptTask` 的应答回调（index.js:133338-133382）只消费
   *  `eRet / triggerBoxs / skillId / CDTime / serverTime`，**不处理任何物品字段**，三包里也没有
   *  "通用物品增量钩子"（通用 dispatch 只有 2 条 INVENTORY_CHNG）。所以局中接下一个"背包里没有的
   *  Type2 任务"时，客户端本地看不到叠加 → `judgeItemRequire` 不过 → NPC 不给"完成"入口，
   *  要等下次 LoadGame / sycnTask 才恢复。
   *
   *  ⚠️ 这是第二条写入路径（R02 回执 §3(c) 明确警告）。护栏：
   *    - `env.sandbox` 一律跳过（自检/隔离实例绝不碰活客户端，回归用例 test/selfcheck-model-push.js）；
   *    - 只用客户端自己的 `InventoryModel.setItem(id, count)`，不手搓 IvItem、不碰 type2Items 的内部结构；
   *    - 失败静默（推不进去也不影响应答）。 */
  /** 推"绝对值"给客户端背包：absMap = {物品id: 客户端应显示的数量} */
  function pushSetItem(absMap) {
    if (env.sandbox) return;
    try {
      var R = (typeof window !== 'undefined') ? window.__require : null;
      if (typeof R !== 'function') return;
      var IM = R('InventoryModel'); IM = IM && (IM.InventoryModel || IM);
      if (!IM || typeof IM.setItem !== 'function') return;
      for (var k in absMap) {
        if (!absMap.hasOwnProperty(k)) continue;
        IM.setItem(parseInt(k, 10), parseInt(absMap[k], 10) || 0);
      }
    } catch (e) {}
  }

  /** 推装备实例：优先用客户端自己的 `InventoryModel.updateEq(id, [type, num])`
   *  —— 它就是 `updateEqData` 回放 `PlayerEquip` 走的那条路（index.js:65117-65136 parseEq：
   *  type==1 时结构是 `{id, type, itemID, num, weaponSkinId}`，字段名是 **num** 不是 numbers）。
   *  没有 `updateEq` 时才退化成 `addEq(手搓结构)`。 */
  function pushAddEq(equips) {
    if (env.sandbox || !equips) return;
    try {
      var R = (typeof window !== 'undefined') ? window.__require : null;
      if (typeof R !== 'function') return;
      var IM = R('InventoryModel'); IM = IM && (IM.InventoryModel || IM);
      if (!IM) return;
      var s = loadSave();
      for (var e in equips) {
        if (!equips.hasOwnProperty(e)) continue;
        var uid = parseInt(e, 10);
        if (!(uid > 0)) continue;
        var inst = (s.playerEquip || {})[uid];
        var num = Array.isArray(inst) ? (parseInt(inst[1], 10) || 1) : 1;
        if (typeof IM.updateEq === 'function') {
          IM.updateEq(uid, [1, num]);
        } else if (typeof IM.addEq === 'function') {
          IM.addEq({ id: uid, type: 1, itemID: uid, num: num, attrs: null, numAttr: 0, crystalIds: null, weaponSkinId: 0 });
        }
      }
    } catch (e) {}
  }

  /** 从客户端模型里删掉一件已不再持有的装备实例（卖掉/用掉之后）。
   *  客户端自己的入口是 `InventoryModel.deleteEq(uid)`（index.js:65087-65098：清 equipmentDic、
   *  equipByItemID、inherit、fash 四本索引）。不调用它 → 装备界面里那件东西还在。
   *  ⚠ 沙盒跳过；失败静默。 */
  function pushDeleteEq(uids) {
    if (env.sandbox || !uids) return;
    try {
      var R = (typeof window !== 'undefined') ? window.__require : null;
      if (typeof R !== 'function') return;
      var IM = R('InventoryModel'); IM = IM && (IM.InventoryModel || IM);
      if (!IM || typeof IM.deleteEq !== 'function') return;
      for (var i = 0; i < uids.length; i++) {
        var uid = parseInt(uids[i], 10);
        if (uid > 0) IM.deleteEq(uid);
      }
    } catch (e) {}
  }

  /** 发奖/掉落的推送入口：`items` = 新增背包物品，`equips` = 新增装备；数量一律取存档里的绝对值。 */
  function pushToClient(items, equips) {
    if (env.sandbox) return;
    var s = loadSave();
    var bag = (s && s.bag) || {};
    var abs = {};
    if (items) {
      for (var k in items) {
        if (!items.hasOwnProperty(k)) continue;
        abs[k] = parseInt(bag[k], 10) || 0;
      }
    }
    if (Object.keys(abs).length) pushSetItem(abs);
    if (equips && Object.keys(equips).length) pushAddEq(equips);
  }

  /** 把"派生叠加"那部分推回客户端（接任务/交任务时用）：推的是**投射后的绝对值**。 */
  function pushItemsToClient(s) {
    var ov = needOverlay(s);
    if (!ov || !Object.keys(ov).length) return;
    var prj = projectItems(s);
    var abs = {};
    for (var k in ov) {
      if (!ov.hasOwnProperty(k)) continue;
      abs[k] = parseInt(prj.bag[k], 10) || 0;
    }
    pushSetItem(abs);
  }

  /** ===== 统一 drop 展开入口（打怪掉落；以后给拆解、开箱复用） =====
   *  数据（`tools/gen_task_rewards.js` 生成）：
   *    BZ_NPCDROP = { npcId: dropId }                     —— npc 表 Drop 列，772/867 个 npc 能解析
   *    BZ_DROP    = { dropId: { 物品id: [数量, 概率] } }   —— 249 张 drop 表，19 条必得 + 450 条概率
   *  规则：概率 >= 100 必得；< 100 掷点。
   *  ⚠ 随机源可注入（`env.random`）：R03 回执 §8 指出 `Math.random()` 会让自检/单测不可复现，
   *    所以这里走 `rnd()`；单测传固定种子就能把概率掉落变成确定性用例。
   *  返回 `{items:{id:count}, equips:{id:count}}`（装备单独分出来，好回填 `equipObj`）。 */
  function rnd() {
    return (typeof env.random === 'function') ? env.random() : Math.random();
  }
  function grantFromDrop(s, dropId) {
    var D = (typeof BZ_DROP !== 'undefined') ? BZ_DROP : null;
    if (!D) return null;
    var row = D[String(dropId)];
    if (!row) return null;
    var got = { items: {}, equips: {} };
    for (var k in row) {
      if (!row.hasOwnProperty(k)) continue;
      var cnt = parseInt(row[k][0], 10) || 0;
      var p = parseInt(row[k][1], 10) || 0;
      if (!(cnt > 0)) continue;
      if (p < 100 && !(rnd() * 100 < p)) continue;
      grantItem(s, k, cnt);
      if (itemTypeOf(k) === 1) got.equips[k] = (got.equips[k] || 0) + cnt;
      else got.items[k] = (got.items[k] || 0) + cnt;
    }
    return got;
  }


  /** 派生叠加（R01 回执 §1「派生叠加」，2026-10-22；本文件 acceptTask 的注释里有完整依据）
   *
   *  只算**显示用**的差额：存档里的背包永远只记合法获得的数量，这里一分钱都不写。
   *  规则：
   *   - 只算进行中（accepted 且不在 done）的任务；
   *   - 同一物品被多个任务要求时取 **max 不累加** —— 本作是"携带型"（见下），多个任务可以共用同一份物品；
   *   - 货币（1/2/4001/4002/4003）跳过：客户端用 gold/coins 特判，背包塞不进去；
   *   - 装备（Type=1）跳过：客户端对装备走 EqUtils.getEquipOrUid 查 PlayerEquip，不查背包数量。
   *  返回 { 物品id: 需要补的差额 }，调用方只拿它去拼应答。 */
  function needOverlay(s) {
    var acc = (s && s.accepted) || [], done = (s && s.done) || [];
    var doneSet = {}, i, k;
    for (i = 0; i < done.length; i++) doneSet[done[i]] = 1;
    var need = {};
    for (i = 0; i < acc.length; i++) {
      var tid = acc[i];
      if (doneSet[tid]) continue;
      var m = taskMeta(tid);
      if (!m || !m.n) continue;
      // 只有 Type 2/12/13 的 SpRequire 是物品：Type3 是怪物 id（judgeFightRequire）、Type1 是装饰。
      // 生成器已按 Type 过滤，这里再兜一层（防旧表 / 防以后有人改生成器）。
      if (m.t !== undefined && m.t !== 2 && m.t !== 12 && m.t !== 13) continue;
      for (k in m.n) {
        if (!m.n.hasOwnProperty(k)) continue;
        var want = parseInt(m.n[k], 10) || 0;
        if (want <= 0) continue;
        if (isCurrencyItem(k)) continue;
        if (itemTypeOf(k) === 1) continue;
        var cur = parseInt(need[k], 10) || 0;
        if (want > cur) need[k] = want;          // 携带型 → max
      }
    }
    var out = {};
    for (k in need) {
      if (!need.hasOwnProperty(k)) continue;
      var have = parseInt((s.bag || {})[k], 10) || 0;
      if (need[k] > have) out[k] = need[k] - have;
    }
    return out;
  }

  /** 背包的客户端投射 = 真实账本 + 显示叠加。只在应答里出现（LoadGame / sycnPlayerItemData）。 */
  function projectItems(s) {
    ensureLedger(s);
    var ov = needOverlay(s);
    var bag = clone(s.bag);
    for (var k in ov) {
      if (!ov.hasOwnProperty(k)) continue;
      bag[k] = (parseInt(bag[k], 10) || 0) + ov[k];
    }
    return { bag: bag, overlay: ov };
  }

  /** 任务账本 → 客户端要的两种形状（同一份数据，两套格式，实测两条消费路径不同）
   *   LoadGame（index.jsc:112029 setSaveAllTaskDatas）
   *     finishTaskObj   = ["101080,1", ...]  客户端自己 split(",") 再 parseInt
   *     acceptTaskArray = [已完成之外的已接任务 ID]
   *     acceptTaskOrder = [已接任务顺序]
   *   sycnTask（index.jsc:133513 sycnTaskCallBack）
   *     PlayerFinishTaskObj = { "101080": 1 }  客户端直接当对象用
   *     acceptTaskMap       = { "100020": 100020 } 客户端 parseInt 取值
   *   两处都必须按账本回放：客户端拿不到就退回本地缓存，本地缓存被清过一次就"全没做过"。
   */
  function taskLedger() {
    var s = loadSave();
    var done = s.done || [], acc = s.accepted || [];
    var doneSet = {}, i;
    for (i = 0; i < done.length; i++) doneSet[done[i]] = 1;
    var finishArr = [], finishObj = {}, acceptArr = [], acceptMap = {}, order = [];
    for (i = 0; i < done.length; i++) {
      finishArr.push(done[i] + ',1');
      finishObj[done[i]] = 1;
    }
    for (i = 0; i < acc.length; i++) {
      var id = acc[i];
      order.push(id);
      if (!doneSet[id]) { acceptArr.push(id); acceptMap[id] = id; }
    }
    return { finishArr: finishArr, finishObj: finishObj, acceptArr: acceptArr, acceptMap: acceptMap, order: order };
  }

  /** 首次运行时用 Create 模板自动造一份完整角色，跳过建角 UI（尚未接入，留待持久化步骤） */
  function ensureRole() {
    var s = loadSave();
    if (s.created && s.baseValueAy) return s;
    var tpl = clone(TPL.create || {});
    var ay = (tpl.baseValueAy || []).slice();
    ay[0] = s.account || '9900012358565';
    ay[1] = s.name || 'FZhou';
    tpl.baseValueAy = ay;
    tpl.roleID = s.roleID || 16374;
    s.created = true;
    s.name = ay[1];
    s.baseValueAy = ay;
    s.roleSnapshot = tpl;
    persist();
    env.log('自动生成角色: ' + ay[1] + ' roleID=' + tpl.roleID);
    return s;
  }

  /** baseValueAy 必须补齐到 48 项：客户端会读 [44]=场景ID [45][46]=出生坐标 [47]=已退门派列表
   *  （依据 index.jsc:74965-74970 与 111801；缺 [47] 会让拜师时 outSchoolAy.length 崩溃） */
  function normalizeBaseValueAy(ay) {
    var tpl = (TPL.create && TPL.create.baseValueAy) || [];
    var out = Array.isArray(ay) ? ay.slice(0, 48) : [];
    for (var i = 0; i < 48; i++) {
      if (out[i] === undefined || out[i] === null) out[i] = (tpl[i] !== undefined ? tpl[i] : 0);
    }
    if (!Array.isArray(out[47])) out[47] = [];
    return out;
  }

  /** 穿装备的共享实现（`PutOnEquipment` 与客户端真名 `equipWeapon` 共用）。
   *  请求实测：`{EquipmentType:5, itemID:2302, hp, hplmt, gTime, mp, ...}`（槽 5 = 武器）。
   *  `itemID` 是**装备实例 uid**；本作 `type==1` 的无属性装备 `uid == itemID`（§4.8）。
   *  槽位 <8 才会被"卸下全部装备"清掉，所以这里只记槽位 + 实例存在。 */
  function applyPutOn(p, actName) {
    p = p || {};
    var s = ensureLedger(loadSave());
    var slot = parseInt(p.EquipmentType, 10) || 0;
    var uid = parseInt(p.itemID, 10) || 0;
    if (slot > 0) {
      if (uid > 0) {
        if (!Array.isArray(s.playerEquip[uid])) s.playerEquip[uid] = [1, 1];
        s.equipments[slot] = uid;
      } else {
        delete s.equipments[slot];
      }
      persist();
      env.log(actName + ' 槽' + slot + ' → ' + uid + ' 当前=' + JSON.stringify(s.equipments));
    } else {
      env.log(actName + ' 忽略无效请求（槽位=' + slot + ' uid=' + uid + '）');
    }
    var res = { eRet: 1, equipments: clone(s.equipments), PlayerEquip: clone(s.playerEquip) };
    return shaped(actName, res) || wrapped(actName, res, { achievement: ach() });
  }

  var H = {
    /** 入口/分发层 */
    GetServerList: function () {
      // 原样回放真实服务器列表（结构保真；URL 无所谓——XHR 已全部被环回拦截）
      return clone(TPL.getServerList);
    },
    ChooseServer: function () { return ack('ChooseServer'); },
    TellAction: function () { return ack('TellAction', { achievement: ach() }); },

    /** 账号层（扁平结构） */
    quicklogin: function (p) {
      var s = loadSave();
      var r = clone(TPL.quicklogin);
      r.roleID = s.roleID;
      r.account = p.account || r.account;
      r.serverTime = env.now();
      // 有档时告诉客户端「已有角色」→ 客户端转而请求 User.LoadGame（实测确认，见 index.jsc:70502）
      if (s.name && env.hintHasRole !== false) {
        r.userName = s.name;
        r.saveTime = s.createdAt || (r.saveTime || env.now());
        r.loginFlag = 1;
      }
      return r;
    },
    CheckName: function () { return { eRet: 1 }; },

    /** 建角（扁平 + 全量快照模板） */
    Create: function (p) {
      var s = loadSave();
      var r = clone(TPL.create);
      var tplCaptureTime = num(r.serverTime, 0);
      r.serverTime = env.now();
      rebaseActivityWindows(r, tplCaptureTime, r.serverTime);   // 活动窗口平移（R17 时间炸弹）
      if (p.baseValueAy) {
        r.baseValueAy = p.baseValueAy;
        s.name = String(p.baseValueAy[1] || '少侠');
      }
      if (p.userName) s.name = String(p.userName);
      r.roleID = s.roleID;
      s.baseValueAy = normalizeBaseValueAy(r.baseValueAy);
      // ★ SOTA R19 反例 3 / Q3① U2：建角请求里的 `baseValueAy` 是**客户端上报**的数组（本行上一句就整包吃了）。
      //   [41] = 死亡次数（`index.js:70987 t.push(RoleBaseInfo.numDeaths)` 的上传路径同源），
      //   一旦采信，客户端就能把 numDeaths 写进存档 ⇒ 3020（Effect 15）从 unreachable 变可达，
      //   而我们的 3020 处置是"照扣无效果"。死亡次数只能由服务端产生：这里强制归零。
      //   白名单约定（`test\r18-unreachable.js` T5 会扫）：全仓**只允许 Create 这一处**整包接收请求数组，
      //   且接收后必须把 [41] 归零；新增任何整包接收位点一律判红。
      s.baseValueAy[41] = 0;
      // 回包也用同一份（`[41]` 已归零）：否则 Create 应答会把客户端的死亡次数原样带回，
      //   客户端 `70454 I.RoleBaseInfo.numDeaths = e.baseValueAy[41]` 就采信了它（U1 断言要求"带 baseValueAy 的应答必须 [41]===0"）。
      r.baseValueAy = normalizeBaseValueAy(s.baseValueAy);
      if (typeof s.potential !== 'number') s.potential = 99999;
      if (typeof s.coins !== 'number') s.coins = 99999;
      if (!s.skills) s.skills = {};
      s.school = p.school || 0;
      persist();
      return r;
    },

    /** 有档进入：客户端 loadGame(e) 需要完整角色快照 + e.OnhookObj.serverTime
     *  （依据 assets/scripts/index.jsc:70502，已解密） */
    LoadGame: function () {
      var s = loadSave();
      var base = s.roleSnapshot ? clone(s.roleSnapshot) : clone(TPL.create);
      base.roleID = s.roleID || base.roleID;
      if (s.baseValueAy) base.baseValueAy = normalizeBaseValueAy(clone(s.baseValueAy));
      if (s.name && base.baseValueAy) base.baseValueAy[1] = s.name;
      // 资源给足：baseValueAy[34]=潜能 [35]=银两（index.jsc:74955-74956）
      // 资源与技能都从账本回放（这是"回弹"的根治点）
      if (base.baseValueAy) {
        base.baseValueAy[34] = (typeof s.potential === 'number') ? s.potential : 99999;
        base.baseValueAy[35] = (typeof s.coins === 'number') ? s.coins : 99999;
      }
      if (s.skills && Object.keys(s.skills).length) {
        var sm = {};
        for (var sk in s.skills) {
          if (!s.skills.hasOwnProperty(sk)) continue;
          var v = s.skills[sk];
          sm[sk] = Array.isArray(v) ? v : [Math.max(1, v | 0), 0, 1];
        }
        base.skillMap = sm;
      }
      // 金条（货币 id 1）：面板 GoldLabel 绑的是 RoleBaseInfo.gold（scripts2.js:49725），
      // 唯一正规来源是 InventoryDB.setGold(curGold)（index.jsc:111905 → 64300 里 `RoleBaseInfo.gold = t`），
      // 而 111905 读的是 OnhookObj.curGold；顶层 curGold 只有 createRole(70457) 读，老档永远走不到。
      // 所以必须写进 OnhookObj，否则 gold 恒为 undefined（面板印 "金条 :  undefined"，getItemNum(1) 也算成 NaN）。
      var goldVal = (typeof s.gold === 'number') ? s.gold : 99999;
      base.curGold = goldVal; base.userGold = goldVal;
      // 元宝：客户端只有 platSuccessCreateInfo 读 userYuanbao(70897)，另可通过 ECONOMY_CHNG 更新(64721)。
      // 老档走不到那条路，所以这里一并给，避免面板显示 undefined。
      var ybVal = (typeof s.yuanbao === 'number') ? s.yuanbao : 0;
      base.userYuanbao = ybVal; base.curYuanbao = ybVal;
      // 关掉新手引导：客户端读 closeGuide 就置 GuideMgr.closeGuideState（index.jsc:107269）
      base.closeGuide = true;
      // 活动面板（2026-10-22）：activityArrFlag → RoleOtherInfo.activeObj（index.js:107227）。
      // [0] 决定七日活动(1001)/每日任务(1002) 哪个 tab 出现（getActiveState 55359-55360）；
      // 离线走每日任务（[0]=0），避免七日活动先去要 taskObj 再回退（多一次往返）。
      base.activityArrFlag = [0, 0];
      var now = env.now();
      // 活动窗口平移（R17 时间炸弹）：快照里的 activityResource 是抓包时刻的值，
      // 先把"抓包时刻"留下来，再把它整体加到 now（必须在覆盖 serverTime 之前取）。
      var snapCapture = num(base.serverTime, 0) > 1.6e12 ? num(base.serverTime, 0) : num(TPL.create.serverTime, 0);
      base.serverTime = now;
      rebaseActivityWindows(base, snapCapture, now);
      if (!base.OnhookObj) base.OnhookObj = {};
      if (!base.OnhookObj.serverTime) base.OnhookObj.serverTime = now;
      base.OnhookObj.curGold = goldVal;
      base.OnhookObj.curJetton = (typeof s.chip === 'number') ? s.chip : 0;
      if (!base.skillMap) base.skillMap = {};
      if (base.cycleLifeRetains === undefined) base.cycleLifeRetains = 0;
      // 洗点/转世数据：客户端 `MarryModel.cycleData` 来自应答的 cycleObj（index.js:77051）。
      // 不给的话 cycleData=[]，洗点按钮 `cycleData[4][e]` 直接 TypeError（scripts2.js:51009）→ 静默失效。
      // 下标语义（全部读点已核对）：[0]转生时间(数字) [1]母体历史(数组) [2]数组(取[0]) [3]{pTims,eTims}
      //   [4]当前附加显示(4元) [5][6]未见读点 [7]fosterArr(4元) [8]bloodArr(4元)
      //   且 index.js:111889-111894 要求 length>=5 且 [7]/[8] 是 4 元数组（加到基础属性上）。
      if (!Array.isArray(base.cycleObj)) {
        var bArr = (Array.isArray(s.bloodArr) && s.bloodArr.length === 4) ? clone(s.bloodArr) : [0, 0, 0, 0];
        var fArr = (Array.isArray(s.fosterArr) && s.fosterArr.length === 4) ? clone(s.fosterArr) : [0, 0, 0, 0];
        base.cycleObj = [0, [], [0], { pTims: 0, eTims: 0 }, clone(bArr), 0, 0, fArr, bArr];
      }
      // 任务账本回放（"重启后任务记忆不丢"的唯一来源，见 taskLedger 注释）
      var tl = taskLedger();
      base.finishTaskObj = tl.finishArr;
      base.acceptTaskArray = tl.acceptArr;
      base.acceptTaskOrder = tl.order;
      if (!Array.isArray(base.taskLog)) base.taskLog = [];
      // 物品/装备账本回放（客户端 LoadGame 后 setSaveAllItems → 只认 count>0 的项）
      // 注意：itemObj 是"派生叠加"（真实背包 + 任务所需差额），存档里永远没有那部分差额
      ensureLedger(s);
      var prj = projectItems(s);
      base.itemObj = prj.bag;
      base.PlayerEquip = clone(s.playerEquip);
      base.equipments = clone(s.equipments);
      // 称号投射（SOTA R18 §1-2 / 假设 A6 判伪）：客户端读称号的**唯一**入口是 LoadGame 的 `titleObj`
      //   `index.js:111919 n.AchieveModel.setAchieveData(e.hasOwnProperty("titleObj") ? e.titleObj : {})`
      //   ⇒ 不投就必丢：useItem 当场弹了称号（64812），重启后 playerTitle 变回 {}，穿上界面看不到。
      // 值语义（`index.js:625-686` 全读点核对）：
      //   0 或 1 = 永久（`getAchieveEndT` 只把 >1 当到期时间戳；`checkTitleBuff` 里 s=-1 → unlimited）
      //   >1       = 到期 ms（`checkTitleBuff` 用 `value - now` 当剩余时长）
      // 我方账本 `s.titles[id] = 1` 是"永久"标记 ⇒ 投成 **0**（客户端自己的永久约定），
      //   否则 `deleteTitle` 的 `playerTitle[t] > 1` 判据会把永久称号判成"不可删"。
      // 只投纯数字键（`checkTitleBuff` 会拿键去查 player_title 表，非表键会让它 TypeError）。
      // ⚠ 模板 `templates.json → create.titleObj` 自带 `{e:0}`（e = 当前佩戴的称号，客户端 627 行读它），
      //   抓包快照里就有这个键 —— 所以**不能整个替换**，必须在模板对象上补数字键，否则会把 e 抹掉。
      //   安全性核对（SOTA R19 反例 1）：`base` 来自 `clone(roleSnapshot || TPL.create)`，clone 是
      //   JSON 深拷贝（本文件 332 行），所以往 tObj 上写键不会污染内存里缓存的模板。`test\r18-titleobj-projection.js` T5
      //   用"同进程再建一个实例"锁住这一点（旧写法在新进程里跑测不出来，R19 反例 1 点名了）。
      // ⚠ 过期过滤（SOTA R19 反例 2）：`>1` 是到期 ms，已经过去的就别投。否则客户端 `checkTitleBuff`（673 行）
      //   会用 `value - now` 算出负的剩余时长，行为材料未提供；而且"永久拥有"会变成"永远显示已过期"。
      if (s.titles && typeof s.titles === 'object') {
        var tObj = (base.titleObj && typeof base.titleObj === 'object') ? base.titleObj : {};
        var tN = 0, tExpired = 0;
        for (var tk in s.titles) {
          if (!s.titles.hasOwnProperty(tk)) continue;
          if (!/^\d+$/.test(String(tk))) continue;
          var tv = s.titles[tk];
          if (typeof tv === 'number' && tv > 1) {
            if (tv <= now) { tExpired++; continue; }   // 限时称号已过期：不投
            tObj[tk] = tv;
          } else {
            tObj[tk] = 0;                              // 永久：投客户端自己的永久值
          }
          tN++;
        }
        base.titleObj = tObj;
        if (tN || tExpired) {
          env.log('LoadGame → 称号投射 ' + tN + ' 个 titleObj=' + JSON.stringify(tObj)
            + (tExpired ? ('（另有 ' + tExpired + ' 个限时称号已过期，未投射）') : '')
            + '（客户端 index.js:111919）');
        }
      }
      env.log('LoadGame → 快照 ' + (s.name || '?') + ' 任务: 完成=' + tl.finishArr.length + ' 进行中=' + tl.acceptArr.length + ' 物品=' + Object.keys(s.bag).length + ' 种'
        + (Object.keys(prj.overlay).length ? ' 叠加=' + JSON.stringify(prj.overlay) : ''));
      return wrapped('LoadGame', base, { achievement: ach() });
    },
    getCRAInfo: function () { return clone(TPL.getCRAInfo); },
    GetChatAddress: function () { var r = clone(TPL.getChatAddress); r.serverTime = env.now(); return r; },

    /** 接任务：只记账，**绝不动背包**（2026-10-22 改为派生叠加，依据见下）
     *
     *  旧实现按 SpRequire 把差额 `grantItem` 进背包（= R01 说的"先借后还"）。它不能留：
     *  1. 客户端交付任务时**从不扣 SpRequire**：`finishTaskCallBack`（index.jsc:133383-133470）只处理
     *     rewardArray/equipObj/triggerBoxs，没有任何 item 增量；`updateTaskData`（134522-134554）
     *     的 Type 2 分支就是 `case 2: break;`。→ 借款永远没有归还点，借来的物品等于白送。
     *  2. 白送的物品还能被卖掉换成货币 → 凭空增加从"背包"转移到"货币"，背包守恒断言看不出来（R01 §2-e）。
     *  3. 我们就是服务器，C（上交量）由我们定；客户端既不扣，我们就定 C=0（携带型），
     *     于是"归还"这件事根本不存在，也就不需要 loans 账本、不需要跨会话断言。
     *
     *  现在的做法：差额只进应答投射（[needOverlay]），存档里一分不写；真库存永远不会被"借"污染。 */
    acceptTask: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var id = p.taskID;
      if (id && s.accepted.indexOf(id) < 0) s.accepted.push(id);
      persist();
      var meta = taskMeta(id);
      var ov = needOverlay(s);
      if (meta && meta.n) env.log('acceptTask ' + id + ' 记账（背包不动）；本任务所需=' + JSON.stringify(meta.n) + ' 当前叠加=' + JSON.stringify(ov));
      if (Object.keys(ov).length) pushItemsToClient(s);       // 局中可见性（见 pushItemsToClient 注释）
      return wrapped('acceptTask', { eRet: 1, note: {}, taskID: id }, { achievement: ach() });
    },
    /** 交任务：发奖励入账本；**不扣 SpRequire**（C=0，理由见 acceptTask 的注释），同一个任务只发一次 */
    getFinishTaskAward: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var id = p.taskID;
      var repeat = isRepeatTask(id);
      // 重复任务不写 done（客户端也不写，见 isRepeatTask 注释）；普通任务照旧
      if (id && !repeat && s.done.indexOf(id) < 0) s.done.push(id);
      if (id && repeat) {
        var ai = s.accepted.indexOf(id);
        if (ai >= 0) s.accepted.splice(ai, 1);   // 交完即回到"可再接"，否则叠加会永久挂在它身上
      }
      if (!s.rewarded) s.rewarded = [];
      var meta = taskMeta(id);
      var rewardArr = {};
      var rewardItems = {}, rewardEquips = {};
      var firstTime = !!id && s.rewarded.indexOf(id) < 0;
      if (meta && firstTime) {
        if (meta.r) {
          for (var rk in meta.r) {
            if (!meta.r.hasOwnProperty(rk)) continue;
            var cnt = parseInt(meta.r[rk], 10) || 0;
            if (cnt <= 0) continue;
            grantItem(s, rk, cnt);
            rewardArr[rk] = cnt;
            if (itemTypeOf(rk) === 1) rewardEquips[rk] = (rewardEquips[rk] || 0) + cnt;
            else rewardItems[rk] = (rewardItems[rk] || 0) + cnt;
          }
        }
        s.rewarded.push(id);
        env.log('getFinishTaskAward ' + id + ' 发奖 ' + JSON.stringify(rewardArr));
      }
      persist();
      // 发奖后必须推给客户端：客户端回包只弹奖励界面（showReward 不写背包模型），
      // 不推的话玩家要重登才在背包/装备表里看到（2026-10-22 用户实测："掉了却没进包"）
      pushToClient(rewardItems, rewardEquips);
      pushItemsToClient(s);    // 交完任务叠加会缩小 → 用真实库存纠正客户端那份
      var r = clone(TPL.getFinishTaskAward);
      r.p = 'User.getFinishTaskAward';
      var inner = r['User.getFinishTaskAward'] || {};
      inner.taskID = id;
      inner.rewardArray = rewardArr;
      r['User.getFinishTaskAward'] = inner;
      return r;
    },
    OpenNovice: function () { return wrapped('OpenNovice', { eRet: 1 }, { achievement: ach() }); },
    joinSchool: function (p) {
      var s = loadSave(); s.school = p.school || s.school; persist();
      return wrapped('joinSchool', { eRet: 1, note: { attrch: {}, skch: {} }, npcID: p.npcID }, { achievement: ach() });
    },
    /** 技能升级：必须记账，否则客户端"回弹"（客户端不自己保存等级，靠 skillMap 回放）
     *  skillMap 格式 { id: [lv, pgr, brlv] }，见 index.jsc:119994
     *
     *  ⚠️ 2026-10-22 02:35 第二次修正（第一次修正只改了一半，用户实测「无论学几级都只涨一级、取消也涨一级」）：
     *  请求形状（三包已核对，端上抓到的真实参数也一致）：
     *    scripts2.js:13846-13854 LearnSkill → sendUpgradeReq(id, { lv: o.lv + 1, pgr: o.pgr - c, brlv })
     *    scripts2.js:13923-13928 sendUpgradeReq → SkillModel.reqChangeSkillLv(t, e.lv, e.pgr, e.brlv, teacher, type)
     *    index.js:119873-119881         → skillArr = [lv, Math.floor(pgr), brlv]
     *  所以 **skillArr[0] 才是目标等级**，[1] 是剩余进度（客户端已扣过本级消耗），[2] 是突破等级。
     *  旧代码读 [1]（= pgr，实测恒为 0）→ 永远落到 cur+1，这就是"只能学一级"。
     *
     *  语义（本轮定死）：
     *    - 目标 > 当前 → 涨到目标（支持一次跳多级），按级扣潜能（100/级）
     *    - 目标 ≤ 当前 → **视为取消/重复请求：等级与潜能都不动，但进度 pgr/brlv 必须写进账本**
     *      （端上实测 `[5,6,1]` = 等级不变、进度 6 = 面板上的 (80%)；旧实现直接丢弃 → "练到 80% 一取消全丢"）
     *    - pgr / brlv 一律按客户端发来的回显（以前硬写 0/1，导致客户端进度条每次清零）
     *  应答消费端只读 eRet / returnPro（index.jsc:119842-119845），所以权威值靠 pushSkillToClient 推回模型。
     *
     *  ⚠ `note.eco` 的键必须是 **`ptt`**（潜能），不能写 `potential`（2026-10-23 改，证据链三处）：
     *    1) 客户端 ECO 监听器 `index.js:64698-64725` 的 switch 只认 coins / ptt / gold / exp / chips / yuanbao，
     *       发 `eco.potential` 会被**静默丢弃**（不报错、不提示）；
     *    2) 上面那条应答回调只读 `eRet` 与 `returnPro`，**既不读顶层 `potential`、也不处理 `note`**
     *       —— 所以别指望凭证里那个顶层字段生效；
     *    3) 客户端潜能显示真正靠的是 `pushSkillToClient()` 直接写活模型
     *       （`RoleBaseInfo.potentials = pot`，见本文件 293-299），那条路不受 eco 影响。
     *  ⇒ 键写错**不会**让玩家看到错数（有推送兜着），只是 `note.eco` 变成死字段。
     *    改成 `ptt` 是让这条数据通路在语义上成立（以后哪个版本真去读 eco 也不会踩空）。
     *  ⚠ 顶层 `potential` 保留：现在是"客户端不读"的冗余字段，删不删都不改变行为，留着不制造新变数。 */
    upgradeSkill: function (p) {
      var s = loadSave();
      var id = String((p && p.skillID) || 0);
      var cur = s.skills[id];
      var curLv = Array.isArray(cur) ? (cur[0] || 0) : (cur || 0);
      var arr = (p && Array.isArray(p.skillArr)) ? p.skillArr : [];
      var reqLv = arr.length > 0 ? Math.floor(arr[0]) : 0;                       // ★ 目标等级
      var reqPgr = arr.length > 1 ? Math.max(0, Math.floor(arr[1])) : 0;         // 剩余进度
      var reqBrlv = arr.length > 2 ? Math.floor(arr[2]) : 1;                     // 突破等级
      var reqRaw;
      try { reqRaw = JSON.stringify(p); } catch (e) { reqRaw = '?'; }
      if (reqRaw && reqRaw.length > 300) reqRaw = reqRaw.slice(0, 300) + '…';
      var lv = Math.max(curLv, reqLv || 0);        // 只升不降
      var gained = lv - curLv;
      var pot = (typeof s.potential === 'number') ? s.potential : 99999;

      // 无效请求（缺 skillArr 或 skillID 为 0/空）：绝不落账 —— 否则会写出假的 skills["0"]
      // （自检就是拿空参数打这个动作，坑 21 的老坑，别再踩）。
      if (!arr.length || !(parseInt(id, 10) > 0)) {
        env.log('upgradeSkill 忽略无效请求 id=' + id + ' p=' + reqRaw);
        return wrapped('upgradeSkill', { eRet: 1, note: { eco: { ptt: pot }, skch: {} }, returnPro: 0, potential: pot }, { achievement: ach() });
      }

      if (gained <= 0) {
        // 取消 / 重复请求：等级与潜能不动，但**进度必须存下来**。
        // 端上实测：{"skillArr":[5,6,1]} = 目标=当前、进度 6（面板上的 (80%)）——
        // 旧实现这里直接返回、什么都不写，于是"练到 80% 一点取消，进度全丢，重进回到 0%"。
        //
        // ★ SOTA R18 §1-3 / 反例 3（本轮新增）：**绝不下发 lv=0 的 skch**。
        //   客户端 `index.js:119832 s.SkillTable.setSkill(n, e[o][0])` 不过滤 0，
        //   而 `120070 getSkillItem` 只判 `dic.hasOwnProperty` ⇒ 一旦把某技能写成 `[0,…]`：
        //     · Effect 5 的书在本地被判"已学会"（64343 `dic.hasOwnProperty(Data1)` → 提示 243 拦截）；
        //     · Effect 11 的书拿 `lv=0` 去走 ConditionUp 分支。
        //   这条路径原文可达：未知技能 + 目标等级 ≤0 ⇒ curLv=0、gained=0，旧实现会写 skills[id]=[0,…]。
        //   删除技能只能走 abolish 通道；这里一律不落账、不发 skch。
        if (curLv <= 0) {
          env.log('upgradeSkill ' + id + ' 未知技能且目标 ≤0 → 不落账、不发 skch（防 lv=0 污染 SkillTable；R18 §1-3）p=' + reqRaw);
          return wrapped('upgradeSkill', { eRet: 1, note: { eco: { ptt: pot }, skch: {} }, returnPro: 0, potential: pot }, { achievement: ach() });
        }
        var keptPgr = Math.max(0, reqPgr);
        var keptBrlv = reqBrlv || 1;
        s.skills[id] = [curLv, keptPgr, keptBrlv];
        persist();
        pushSkillToClient(id, curLv, pot, keptPgr, keptBrlv);
        var kept = { eco: { ptt: pot }, skch: {} };
        kept.skch[id] = [curLv, keptPgr, keptBrlv];   // 客户端 119831-119834：setSkill/setUpgrdPgr/setBrLv
        env.log('upgradeSkill ' + id + ' 等级不变（目标 ' + (reqLv || '-') + ' ≤ 当前 ' + curLv + '）进度已存 pgr=' + keptPgr + ' brlv=' + keptBrlv + ' p=' + reqRaw);
        return wrapped('upgradeSkill', { eRet: 1, note: kept, returnPro: 0, potential: pot }, { achievement: ach() });
      }

      s.skills[id] = [lv, reqPgr, reqBrlv || 1];
      s.potential = Math.max(0, pot - 100 * gained);
      persist();
      pushSkillToClient(id, lv, s.potential, reqPgr, reqBrlv || 1);
      var note = { eco: { ptt: s.potential }, skch: {} };
      note.skch[id] = [lv, reqPgr, reqBrlv || 1];
      env.log('upgradeSkill ' + id + ' Lv' + curLv + '→' + lv + '（目标 ' + reqLv + '，+' + gained + ' 级）pgr=' + reqPgr + ' brlv=' + (reqBrlv || 1) + ' 潜能=' + s.potential + ' p=' + reqRaw);
      return wrapped('upgradeSkill', { eRet: 1, note: note, returnPro: 0, potential: s.potential }, { achievement: ach() });
    },

    /** 打坐开始：`User.BeginMeditation {curMp,maxMp,hg,gTime,hgtimes,flag}`（index.js:138936-138938）。
     *
     *  为什么必须有 handler（2026-10-23，SOTA R09）：客户端拿到应答就写
     *    `t.startTimestamp = o.beginTime; t.hyTime = 1e3 * o.hyTime;`
     *    `NonBattleBuffModel.setBufferCostStartTime(o.hyTime, o.beginTime)`（index.js:138882-138885），
     *  然后用 `scripts2.js:47303` `(duration - (getSTimestamp() - startTimestamp))/1e3` 算剩余时间。
     *  没有 handler 时形状默认值曾被填成一个构建时刻/0 → `now - startTimestamp` 天然很大 →
     *  玩家**一进去就打坐完成**。所以这里必须回**请求时刻**。
     *  ⚠ `hyTime`（本次打坐时长，秒）的推导规则在服务端，材料未提供 —— 不编数，先给 0（= 无寒玉髓时长加成），
     *    并发声；这条属于"诚实降级"，不是修好了。 */
    BeginMeditation: function (p) {
      p = p || {};
      var now = env.now();
      env.log('BeginMeditation 开始 curMp=' + (p.curMp || 0) + ' maxMp=' + (p.maxMp || 0)
        + ' hg=' + (p.hg || 0) + ' → beginTime=' + now + '（hyTime 规则未知，暂 0）');
      return wrapped('BeginMeditation', {
        eRet: 1,
        beginTime: now,
        hyTime: 0,
      }, { achievement: ach() });
    },
    /** 练功开始：`User.BeginTraining {skillID,hg,gTime,hgtimes,flag,isCollective}`（index.js:120751-120762）。
     *  与打坐同源：回调把 `beginTime` 同时写进 `startTimestamp` 与 **`TimeMgr.sserverT`**
     *  （index.js:120518-120519），后者是客户端服务器时钟的基准。
     *  ⚠ 好消息：`getSTimestamp()` 是 `0 == sserverT || 0 == startTime ? Date.now() : sserverT + Date.now() - startTime`
     *    （index.js:136545-136547）—— 传 0 会**回退本地时钟**，不会把客户端拨到 1970；
     *    但传一个"构建时刻"常量会让 `now - beginTime` 很大 → 一进去就练功完成。所以这里回请求时刻。
     *  ⚠ `hanyusuiTime`（本次练功时长，秒）规则同样在服务端，未取证 → 先 0 并发声。 */
    BeginTraining: function (p) {
      p = p || {};
      var s = loadSave();
      var sid = parseInt(p.skillID, 10) || 0;
      // ⚠ 合法性（SOTA R12 §1 第 2 条，R13 §1 第 2 条复核通过）：不能无条件回声 skillID，更不能兜底成 0 ——
      //   客户端会拿它去查 skill 表（`getItem(0,"skill")` → null → 读 .name 崩，F1 那一族），
      //   而且回声任意 id 等于允许玩家用**没学过的技能**练功。
      //   只接受"账本里已学会"的技能；否则拒绝，**不写 beginTime、不发 skillID**。
      var learned = !!(s && s.skills && s.skills[String(sid)]);
      if (!(sid > 0) || !learned) {
        // 选码：**eRet:4（第 2 档，静默）**，不选 3。理由（逐字，见 docs/sota/inbox/R13-审阅.txt §2）：
        //   ① 回调的成功集 = `1 == n.eRet || 2 == n.eRet`（index.js:120516）→ 4 不进门，绝不写错时间基座；
        //   ② 回调**还有** `else if (3 == n.eRet)` 分支（index.js:120569-120571），
        //      但它是 `var h = getItem(n.skillID, "skill")` 后 `getText(423).replace(/\[68\]/, getText(h.Name))`：
        //      文本 423 =「[68]已经达到瓶颈了,需要闭关突破,方可继续修炼提升」（live 实读）——语义是"练满/需突破"，
        //      不是"未学会"；而且 skillID 一旦不在客户端 item 表里 h 为 null → `.Name` 抛 TypeError。
        //      ⇒ 第 1 档的两个前提（文本对得上、不崩）都不成立，按 R13 的档位规则退回第 2 档。
        //   ③ 静默必须可观测（R13 §5）：warn 级日志 + 计数，计数写进 meta.rejectStats，
        //      由 tools\check_reject_codes.js 与回归 test\r13-reject-codes.js 盯（新增即 FAIL）。
        noteReject('BeginTraining', 'notLearned', 'skill=' + sid + ' ledger=' + JSON.stringify(s && s.skills));
        return wrapped('BeginTraining', { eRet: 4 }, { achievement: ach() });
      }
      var now = env.now();
      var payload = {
        eRet: 1,
        beginTime: now,
        skillID: sid,
        // hanyusuiTime 是**契约**不是可选：回调 `e.hyTime = 1e3 * n.hanyusuiTime`（index.js:120521），
        // 少发它客户端会算成 NaN。语义 = 寒玉髓 buff(1043) 剩余秒数（buff.json 1043 / mall.json 商品 2），
        // 我们没实现 buff 系统 → 0 = 当前没有该 buff，自洽（见 HANDOVER §7-3b 的前提）。
        hanyusuiTime: 0,
      };
      // ⚠ `isCollective`：**请求里有就原样回声，0 也照发**（SOTA R13 §1 第 1 条，推翻 R12 的"0 不发"）。
      //   逐字证据（tools\index.js:120523）：
      //     `if (n.hasOwnProperty("isCollective")) if (0 == n.isCollective) if (2 == e.isSchoolLiang) {`
      //     → 关掉门派练功界面（CLOSE_SCHOOL_LIAN_GONG_UI）并 load("comUI/LiangongUI")；
      //       门派界面开着（isSchoolLiang==2）时选**个人**练功，客户端**正是靠这个 0** 才切界面。
      //       R12 把 0 过滤掉 = 丢掉这一整种情形（玩家卡在门派界面，普通练功界面不打开）。
      //   而且请求**永远带这个字段**：`index.js:120751-120759`
      //     `start=function(t,e){ void 0===e && (e=0); … isCollective: e }`
      //     ⇒ "按请求回声存在性"在这条协议上等价于"永远回声"，值域 0/1（另见 115158 / 120597 / 120892）。
      //   0 值合法这一点在 noteBadSwitches 里靠 SWITCH_ZERO_OK 白名单豁免（否则会被误报成"不合法开关值"）。
      if (Object.prototype.hasOwnProperty.call(p, 'isCollective') && p.isCollective !== null && p.isCollective !== undefined) {
        var colV = parseInt(p.isCollective, 10);
        payload.isCollective = isFinite(colV) ? (colV ? 1 : 0) : 0;
      }
      env.log('BeginTraining 开始 skillID=' + sid + ' isCollective=' + (payload.isCollective === undefined ? '(不发)' : payload.isCollective)
        + ' → beginTime=' + now);
      return wrapped('BeginTraining', payload, { achievement: ach() });
    },
    /** 小孩玩耍开始：`User.beginPlayGame`（回调 index.js:24616，函数体 24657-24676）。
     *  回调把 `n.beginTime` 存进 `ChildrenModel.beginTime`（index.js:24663），
     *  消费端 `scripts2.js:13167` / `13178` 拿 `TimeMgr.getSTimestamp() - ChildrenModel.beginTime` 算已玩时长。
     *  没有 handler 时形状默认值（曾为 0）→ 已玩时长天然巨大。必须回**请求时刻**。
     *  其余字段由 `fillShape` 按形状兜底（只补缺不覆盖）。 */
    beginPlayGame: function (p) {
      p = p || {};
      var now = env.now();
      env.log('beginPlayGame 开始 → beginTime=' + now);
      // ⚠ `choose` 的形状默认值是从 getFinishTaskAward 的抓包借来的（C12 src = borrowed-capture），
      //    靠 fillShape 兜底会把"选了什么"填成别的动作的值 → 这里显式给 0（语义未知，不猜）。
      return wrapped('beginPlayGame', { eRet: 1, beginTime: now, choose: 0 }, { achievement: ach() });
    },
    /** 雇佣挂机查询：`User.checkHireOnhook`（回调 index.js:51451-51543）。
     *  回调在 index.js:51516 直接算 `(getSTimestamp() - beginTime) * 0.001` 累进 `timeElapsed`
     *  → 没有 handler 时形状默认值（曾为 0）会让"已挂机时长"巨大。必须回**请求时刻**。 */
    checkHireOnhook: function (p) {
      p = p || {};
      var now = env.now();
      env.log('checkHireOnhook 查询 → beginTime=' + now);
      return wrapped('checkHireOnhook', { eRet: 1, beginTime: now }, { achievement: ach() });
    },
    /** 战斗准备：`User.ReqSelfBattleInfo`     *
     *  以前这里无条件回抓包模板 → 客户端 `prepareForBattle` 用模板里的固定 npcID（index.js:69015-69031），
     *  于是"打谁都一样"。实测客户端**自己会把 npcID 发过来**（`startBattle` 发
     *  `{npcID,isRmd,mp,gTime,hgtimes}`，index.js:69162-69172，常量 `REQ_PVE_BATTLE: "User.ReqSelfBattleInfo"` 59610）。
     *  所以：把 npcID 原样回声，并按 `generateNpcData`（index.js:8093-8134）要求的 26 项顺序塞 `npcArr`，
     *  对手就真的是你点的那只。数据来自 `tools/cfg/npc_stats.json`（3201 只可战斗 npc，≈360 KB）。 */
    ReqSelfBattleInfo: function (p) {
      p = p || {};
      var s = loadSave();
      var npc = parseInt(p.npcID, 10) || 0;
      var r = clone(TPL.reqSelfBattleInfo);
      var inner = r['User.ReqSelfBattleInfo'];
      if (inner) {
        if (s.baseValueAy) inner.baseValueAy = s.baseValueAy;
        if (npc > 0) {
          inner.npcID = npc;
          var A = (typeof BZ_NPCARR !== 'undefined' && BZ_NPCARR) ? BZ_NPCARR[String(npc)] : null;
          if (A && A.length) inner.npcArr = clone(A);
          env.log('ReqSelfBattleInfo npc=' + npc + (A ? '（已带 npcArr）' : '（无该 npc 数值，回模板）'));
        }
      }
      return r;
    },
    /** 战斗结算：按 npc.Drop 发掉落（统一 drop 入口的第一个消费者）。
     *  请求实测带 `{win, npcID}`（REQ 日志）。
     *
     *  2026-10-22 R03 修正两处：
     *   1. **不再做 5 秒去重**。证据：客户端只有一处发送点（index.js:69196，战斗结束事件），
     *      三包里 `retry/resend/onTimeout` 零命中；HTTP 封装的"重发"只挂在 onerror/ontimeout 上，
     *      而进程内 XHR 是**同步返回 200**，错误路径永不触发 → 重复结算不会发生，
     *      自造的时间窗口只会误吞"自动战斗/连打同一只怪"的第二场。
     *   2. **掉落写进应答**。客户端消费端 index.js:89553-89561 会读 `o.rewardArray` / `o.equipObj`
     *      渲染战斗结算界面（没有就显示"无奖励"）→ 不回就等于玩家永远看不到战利品。 */
    CheckBattleResult: function (p) {
      p = p || {};
      var npc = parseInt(p.npcID, 10) || 0;
      var win = (p.win === true) || (parseInt(p.win, 10) === 1);
      var got = null;
      if (npc > 0 && win) {
        var s = ensureLedger(loadSave());
        var dropId = (typeof BZ_NPCDROP !== 'undefined') ? BZ_NPCDROP[String(npc)] : 0;
        if (!dropId) {
          env.log('打怪掉落 npc=' + npc + ' 无掉落表（npc.Drop 缺失或展开为空）');
        } else {
          got = grantFromDrop(s, dropId);
          persist();
          if (got) pushToClient(got.items, got.equips);   // 掉落同样要推，否则只写存档、界面看不到
          if (got && (Object.keys(got.items).length || Object.keys(got.equips).length)) {
            env.log('打怪掉落 npc=' + npc + ' drop=' + dropId + ' → ' + JSON.stringify(got));
          } else {
            env.log('打怪掉落 npc=' + npc + ' drop=' + dropId + ' 本次没掷中');
          }
        }
      }
      var r = clone(TPL.checkBattleResult);
      var inner = r['User.CheckBattleResult'];
      if (inner) {
        inner.win = !!win;
        inner.rewardArray = (got && got.items) ? got.items : {};
        var eq = {};
        if (got && got.equips) {
          for (var ek in got.equips) {
            if (!got.equips.hasOwnProperty(ek)) continue;
            eq[ek] = [1, got.equips[ek]];      // 模板里 equipObj 的形状是 {uid: [type, num]}
          }
        }
        inner.equipObj = eq;
      }
      return r;
    },

    /** 活动面板三件套（2026-10-22，修"点活动就卡死"）
     *
     *  链子（全部有行号）：点「活动」→ `getAllActivity` → 回调 `onGetAllActivity`（index.js:57446-57459）
     *  收尾**无条件**再发一个请求：`activeObj[0] ? reqSevenDayActive() : reqEveryDayActive()`；
     *  · `reqSevenDayActive` → `User.getSevenTaskList`（59622），回调 `sevenTaskCallback`（57387-57405）
     *    第一句就是 `if (e.hasOwnProperty("taskObj"))` —— 我们以前回的形状默认值**没有 taskObj**，
     *    两个分支都不进 → `HomeActiveUI` 既不打开也不关闭 → 那层 modal 留在最上面吃触摸（用户实测"卡死"）。
     *  · `reqEveryDayActive` → `User.getActivityCounts`（59716），回调会 `addComponent("HomeActiveUI").setData(e)`，
     *    而 `HomeActiveUI.setData` 只读 `dataArr`（scripts2:29200-29204）。
     *  所以三处都回"合法且空"的结构即可闭合：面板能开、能关，不再吃触摸。 */
    getAllActivity: function () {
      return wrapped('getAllActivity', {
        eRet: 1,
        activityList: [],        // 活动 id 数组（客户端大量 indexOf/includes，空数组安全）
        activityShows: [0, 0],   // 显式关掉"首充/新手礼包"两个 tab（1003/1004，含付费入口）
        schoolActivityOpen: 0,
        schoolArenaOpen: 0,
      }, { achievement: ach() });
    },
    getSevenTaskList: function () {
      return wrapped('getSevenTaskList', { eRet: 1, taskObj: {} }, { achievement: ach() });
    },
    getActivityCounts: function () {
      // 每日任务列表（2026-10-22）：DailyMissionUI.start 只把 dataArr 当**标量数组**用
      // （scripts2.js:17184-17197：循环 dataArr.length，dataArr[i] 作 numTime），
      // 而配置表 daily_active_tips 有 18 行（id 1..18，isshow>0 的才显示）→ 给 18 个 0 即渲染出 18 条"零进度"任务。
      var dataArr = [];
      for (var di = 0; di < 18; di++) dataArr.push(0);
      return wrapped('getActivityCounts', { eRet: 1, dataArr: dataArr, SevenDaysArr: [], schoolActivityOpen: 0, schoolArenaOpen: 0 }, { achievement: ach() });
    },

    /** 炼金（离线版：给一个"空但合法"的结构）
     *  消费端 scripts3.js:7005-7026 onGetAlchemyData：
     *    1 == e.eRet 后直接读 e.data.state（旧版落通用 ACK → e.data 为 undefined → TypeError），
     *    e.hasOwnProperty("activityData") 才取活动数据（我们不提供），e.alchemyGearConfig 被 for..in 遍历。
     *  数据取空表示"炉子里没有正在炼的东西"，面板本身仍能打开。 */
    getAlchemyData: function () {
      return wrapped('getAlchemyData', {
        eRet: 1,
        data: { state: 0, type: 0, id: 0, price: 10, num: 0 },
        alchemyGearConfig: {},
      }, { achievement: ach() });
    },

    /** 等级奖励（离线版：空列表 + endTime=0）
     *  消费端 scripts3.js:43812-43828 onGetLevelBonusData 读 e.eRet / e.bonusObj / e.endTime；
     *  LevelBonusUI.loadItems（43919-43926）只 `for..in bonusObj`，空对象安全；update() 用 endTime 算倒计时，0 安全。 */
    getLevelBonusData: function () {
      return wrapped('getLevelBonusData', { eRet: 1, bonusObj: {}, endTime: 0 }, { achievement: ach() });
    },

    /** 成就面板数据：`User.getAchieveData {}`（index.js:60581 常量；触发点：主页"成就"按钮 scripts2.js:30988）。
     *  消费端 scripts3.js:2899-2918：1==eRet 时读 groupPoints/rateIds/achieveIdArr/rd/taskData/srd，
     *  然后**无条件**加载 `network/achievement/AFrontUI` 并 setData(o)（2912-2916）；
     *  AFrontUI 无自有 setData（基类只存 this.data），成就列表由客户端用配置表（achieve_group/achieve_list）渲染
     *  → 服务端只给"合法空态"六件套即可开面板（零进度、无可领奖，诚实不造假）。
     *  账本预留 `s.achieve`（{groupPoints,rateIds,pending,received,taskData,suitIds}），将来接真实进度直接读它。 */
    getAchieveData: function () {
      var s = ensureLedger(loadSave());
      var st = (s.achieve && typeof s.achieve === 'object') ? s.achieve : {};
      // groupPoints 必须**含全部组 id**：checkGroupOpen = `gPoints.hasOwnProperty(组id)`（scripts3.js:3045），
      // 空对象 → getGroupIdArray 返回空 → 面板零条目（2026-10-22 实测"成就空白"）。
      var gp = (st.groupPoints && typeof st.groupPoints === 'object') ? st.groupPoints : {};
      var gids = (typeof BZ_ACHIEVE_GROUPS !== 'undefined' && BZ_ACHIEVE_GROUPS) || [];
      for (var gi = 0; gi < gids.length; gi++) {
        if (!Object.prototype.hasOwnProperty.call(gp, gids[gi])) gp[gids[gi]] = 0;
      }
      return wrapped('getAchieveData', {
        eRet: 1,
        groupPoints: gp,
        rateIds: Array.isArray(st.rateIds) ? st.rateIds : [],
        achieveIdArr: Array.isArray(st.pending) ? st.pending : [],
        rd: Array.isArray(st.received) ? st.received : [],
        taskData: (st.taskData && typeof st.taskData === 'object') ? st.taskData : {},
        srd: (st.suitIds && typeof st.suitIds === 'object') ? st.suitIds : {},
      }, { achievement: ach() });
    },

    /** 转世入口状态：`User.isCycleLife {}`（index.js:60571 ← RebirthModel.isCycleLife 101922）。
     *  消费端（101924-101933）：1 → 打开 marrySystem/rollUI（转世选先天 UI）；2/3 → 提示文案。
     *  ⚠ 转世是**服务端权威的整套重置**：cycleLife 成功后客户端 `killRoleClear()` + `reqLoadGameServer()`
     *  整档重放，新一世的等级/技能/先天全由服务端决定，而重置规则**不在客户端源码里**（请求只带
     *  isReserved/branchId/originId/skillArr/skillID/attArr=[hpLimit,mpLimit]，见 101963-101969）。
     *  离线**不伪造**：回 2（条件不足），不打开 rollUI、不做任何重置。见 §19.16。 */
    isCycleLife: function () {
      env.log('isCycleLife → eRet:2（转世重置规则不在客户端，离线不伪造）');
      return wrapped('isCycleLife', { eRet: 2 }, { achievement: ach() });
    },
    /** 转世确认：`User.cycleLife {isReserved,branchId,originId,skillArr,skillID,attArr}`（index.js:59702 ← 101963）。
     *  消费端（101885-101913）：1 → 播剧情 + killRoleClear + reqLoadGameServer；6/7/9 → 提示。
     *  这里回 9（条件不足）：既不触发"重放一个没变的档"，也不伪造新一世。 */
    cycleLife: function () {
      env.log('cycleLife 拒绝：转世重置规则服务端权威，离线不伪造');
      return wrapped('cycleLife', { eRet: 9 }, { achievement: ach() });
    },
    /** 特殊转世：`User.specialCycleLife {originId}`（index.js:60185 ← 101959）——同上，明说不做。
     *  ⚠ R05 Q3 取证更正（2026-10-22 夜）：原来回 `eRet:4`，但客户端 `CYCLE_LIFE` 回调
     *  （index.js:101885-101913）只处理 **1 / 6 / 7 / 9** 四个分支，**2 和 4 落进"静默丢弃"**
     *  （既不提示也不复原）→ 玩家点了"一点反应都没有"。现改成 9（与 cycleLife 一致，
     *  走 `getText("6003686")` 明确提示），拒绝语义不变。 */
    specialCycleLife: function () {
      env.log('specialCycleLife 拒绝：同 cycleLife（eRet:9，客户端只有 1/6/7/9 有提示分支）');
      return wrapped('specialCycleLife', { eRet: 9 }, { achievement: ach() });
    },
    /** 剧情分支选择：`User.storyExperience {branchId}`（index.js:60572 ← 101973）。
     *  消费端（101914-101919）：1 → `RoleBaseInfo.storyId = e.branchId` + CYCLE_END。纯本地字段回显，安全。 */
    storyExperience: function (p) {
      p = p || {};
      return wrapped('storyExperience', { eRet: 1, branchId: parseInt(p.branchId, 10) || 0 }, { achievement: ach() });
    },

    /** 时装商店列表：`User.GetFashionList {type}`（index.js:59562 ← 75620 onGetFashionList）。
     *  应答交给 FashionShopMainUI → FashionShopNewUI.showItem：**必须有 `type` 与 `FashionArr`**，
     *  否则 `curSelectType` 不初始化，点页签 `btns[undefined].getChildByName` 崩（scripts2.js:21830）。
     *
     *  2026-10-22 第二轮（§20）：**按页发货 + 限时页必须带 `FashionTimeMap`**。
     *  - tab1（限时）每条走 `MakeUpModel.getFashionTimeType(ID)`（scripts2.js:21215）→
     *    `getFashionTime(t)[1]`（index.js:75617-75618）；fashionTimeMap 空 → `e[1]` TypeError
     *    → total() 的 Promise reject → **列表一件都不建**（实测：切到「限时」整页空白 + 日志两条 err）。
     *  - tab2（战令）读 `pass.split(",")[1]`（21242-21243）；常驻件 pass="0" → 价格显示 "undefined"（实测）。
     *  - `FashionArr[i] = [物品id, 限时剩余天数]`；`FashionTimeMap = { "起_止": [物品id,...] }`（75607-75611）。 */
    GetFashionList: function (p) {
      p = p || {};
      var tab = parseInt(p.type, 10);
      if (!(tab >= 0)) tab = 0;
      var pages = (typeof BZ_FASHIONPAGES !== 'undefined' && BZ_FASHIONPAGES) || null;
      var now = env.now();
      var arr = [];
      var resp = { eRet: 1, type: tab };
      var list = pages ? pages[tab] : null;
      if (!list) list = [];
      var timeMap = {};
      for (var fi = 0; fi < list.length; fi++) {
        var ent = list[fi];
        if (ent && typeof ent === 'object' && ent.length) {
          var fid = parseInt(ent[0], 10) || 0;
          var on = parseInt(ent[1], 10) || 0;
          var off = parseInt(ent[2], 10) || 0;
          if (!(fid > 0)) continue;
          var period = 0;
          if (on > 0 && off > on) {
            if (now >= on && now <= off) period = Math.max(1, Math.ceil((off - now) / 86400000));
            var key = on + '_' + off;
            if (!timeMap[key]) timeMap[key] = [];
            timeMap[key].push(fid);
          }
          arr.push([fid, period]);
        } else {
          var sid = parseInt(ent, 10) || 0;
          if (sid > 0) arr.push([sid, 0]);
        }
      }
      resp.FashionArr = arr;
      if (tab === 1) resp.FashionTimeMap = timeMap;
      env.log('GetFashionList type=' + tab + ' → ' + arr.length + ' 件'
        + (tab === 1 ? '，时间组 ' + Object.keys(timeMap).length : ''));
      return wrapped('GetFashionList', resp, { achievement: ach() });
    },
    /** 时装购买：`User.BuyFashion {itemObj:{槽:[物品id, 页签, 支付档位]}}`
     *  （index.js:59612 ← 75731 reqBuyFashion；端上实测 `{"itemObj":{"8":[2601,0,0]}}`）。
     *  消费端 75553-75578：
     *    eRet==1 → 逐槽 `InventoryModel.getEquipmentInfo(itemID)`（65161 查 equipmentDic，只认
     *    parseEq 进来的实例）→ **必须先 note.eqch 把时装塞进客户端装备账本**，否则 `.id` 抛
     *    TypeError（2026-10-22 实测 75560 `Cannot read property 'id' of null`，买完什么都不发生）；
     *    之后客户端自己 `RoleBaseInfo.equipments[槽]=id` + putOnEquipment（75568-75569）。
     *  三页三套货币（全部有配置证据）：
     *    页0 常驻 → 金条 × fashionall.price（客户端弹窗原文「确认花费200金条购买时装」，200=price）
     *    页1 限时 → 档位0 金条 × limit 首段；档位1 道具 7298 × limit 次段（scripts2.js:21726-21729）
     *    页2 战令 → 道具 7851 × pass 数量（scripts2.js:21771-21776）
     *  钱不够 / 无价 / 跨页 → `eRet:4`（明确失败，不落账、不推任何 note）。 */
    BuyFashion: function (p) {
      var s = ensureLedger(loadSave());
      var table = (typeof BZ_FASHIONBUY !== 'undefined' && BZ_FASHIONBUY) || {};
      var obj = (p && p.itemObj && typeof p.itemObj === 'object') ? p.itemObj : {};
      var slots = Object.keys(obj);
      if (!slots.length) {
        env.log('BuyFashion 忽略空请求');
        return wrapped('BuyFashion', { eRet: 4 }, { achievement: ach() });
      }
      var wantGold = 0;
      var wantItem = {};
      var grants = [];
      var bad = '';
      for (var si = 0; si < slots.length; si++) {
        var slot = parseInt(slots[si], 10) || 0;
        var ent = obj[slots[si]];
        if (!slot || !ent || typeof ent !== 'object' || !ent.length) { bad = '槽位/请求体无效'; break; }
        var id = parseInt(ent[0], 10) || 0;
        var tab = parseInt(ent[1], 10) || 0;
        var mode = parseInt(ent[2], 10) || 0;
        var info = table[id];
        if (!(id > 0) || !info || info.t !== tab) {
          bad = '无此货或跨页（id=' + id + ' tab=' + tab + '）';
          break;
        }
        if (tab === 0) {
          var g0 = parseInt(info.p, 10) || 0;
          if (!(g0 > 0)) { bad = '无买价（id=' + id + '）'; break; }
          wantGold += g0;
        } else if (tab === 1) {
          // 支付档位来自 FashionShopAlertUI 的四选一（scripts2.js:21034-21036）：
          //   档位 1 = 第一档（金条）、档位 2 = 第二档（券 7298）；档位 0 = 默认（`{8:0,9:0}`，也是金条）
          if (mode === 2) {
            var ci = parseInt(info.ci, 10) || 0;
            var cn = parseInt(info.c, 10) || 0;
            if (!(ci > 0 && cn > 0)) { bad = '无券价（id=' + id + '）'; break; }
            wantItem[ci] = (wantItem[ci] || 0) + cn;
          } else {
            var g1 = parseInt(info.g, 10) || 0;
            if (!(g1 > 0)) { bad = '无金条价（id=' + id + '）'; break; }
            wantGold += g1;
          }
        } else {
          var pi = parseInt(info.pi, 10) || 0;
          var pn = parseInt(info.pn, 10) || 0;
          if (!(pi > 0 && pn > 0)) { bad = '无战令价（id=' + id + '）'; break; }
          wantItem[pi] = (wantItem[pi] || 0) + pn;
        }
        grants.push({ slot: slot, id: id });
      }
      if (!bad) {
        var haveGold = (typeof s.gold === 'number') ? s.gold : 0;
        if (wantGold > haveGold) bad = '金条不足（需 ' + wantGold + ' 有 ' + haveGold + '）';
      }
      if (!bad) {
        var chkIds = Object.keys(wantItem);
        for (var ci2 = 0; ci2 < chkIds.length; ci2++) {
          var need = wantItem[chkIds[ci2]];
          var have = parseInt((s.bag || {})[chkIds[ci2]], 10) || 0;
          if (have < need) { bad = '道具不足（' + chkIds[ci2] + ' 需 ' + need + ' 有 ' + have + '）'; break; }
        }
      }
      if (bad) {
        env.log('BuyFashion 拒绝：' + bad);
        return wrapped('BuyFashion', { eRet: 4 }, { achievement: ach() });
      }
      var note = { ivch: {}, eqch: {}, eco: {} };
      if (wantGold > 0) {
        s.gold = ((typeof s.gold === 'number') ? s.gold : 0) - wantGold;
        note.eco.gold = s.gold;
      }
      var itKeys = Object.keys(wantItem);
      for (var ki = 0; ki < itKeys.length; ki++) {
        var kid = itKeys[ki];
        var left = (parseInt((s.bag || {})[kid], 10) || 0) - wantItem[kid];
        if (left > 0) s.bag[kid] = left; else delete s.bag[kid];
        note.ivch[kid] = left > 0 ? left : 0;   // 绝对值（§17.2：消费端是赋值不是累加）
      }
      for (var gi = 0; gi < grants.length; gi++) {
        var gr = grants[gi];
        // 时装是 item.Type==1（装备类，EquipType 8/9），必须进 `playerEquip` 而不是背包——
        // 客户端 `getEquipmentInfo`（index.js:65161）只查 equipmentDic（= PlayerEquip 解析结果）。
        // 这里**不走 grantItem**：`BZ_ITEMTYPE` 来自 item 表的截断导出，时装 id（2601…）不在里面，
        // 走 grantItem 会被当成普通物品塞进 bag（2026-10-22 测试 T7 当场抓到）。
        var curN = Array.isArray(s.playerEquip[gr.id]) ? (parseInt(s.playerEquip[gr.id][1], 10) || 0) : 0;
        s.playerEquip[gr.id] = [1, curN + 1];
        note.eqch[gr.id] = [1, clone(s.playerEquip[gr.id])];
        s.equipments[gr.slot] = gr.id;
      }
      persist();
      env.log('BuyFashion OK ' + JSON.stringify(grants) + ' 金条-' + wantGold
        + (Object.keys(wantItem).length ? ' 道具-' + JSON.stringify(wantItem) : '') + ' 余额=' + s.gold);
      return wrapped('BuyFashion', { eRet: 1, note: note }, { achievement: ach() });
    },

    /** 伙伴详情：`User.getFriendPartner {}`（scripts3.js:39506 GET_FRIEND_PARTNER）。
     *  消费端 getFriendPartnerCallBack（58454-58466）把 `e.notFriendPartnerData` 直接赋给 lockFriendData；
     *  缺这个键 → lockFriendData=undefined → 伙伴卡片 checkTaskFinishState 每帧崩
     *  （scripts3.js:59334 hasOwnProperty of undefined，2026-10-22 实测刷屏）。 */
    getFriendPartner: function () {
      return wrapped('getFriendPartner', {
        eRet: 1, notFriendPartnerData: {}, friendPartnerDatas: {}, isUnlock: 0, happinessNum: 0,
      }, { achievement: ach() });
    },

    /* ===== 以下形状均来自客户端源码（tools/index.js，已解密），字段逐个对过 ===== */

    /** 挂机/修炼结算：onCheckBreak 读 finish/gTime/hg/hgtimes/roleGold，(可选)itemAddition/skillID/skillLevel/usedTime */
    OnCheckBreak: function () {
      var s = loadSave();
      return wrapped('OnCheckBreak', {
        eRet: 1, finish: 1, gTime: 0, hg: 100, hgtimes: 0,
        roleGold: typeof s.gold === 'number' ? s.gold : 20,
        itemAddition: 0, skillID: 0, skillLevel: 0, usedTime: 0,
      }, { achievement: ach() });
    },

    /** 打坐/挂机 开始-结束：onBreakReqReturn 读 skillID/skillLevel/needTime/operate/serverTime/beginTime/Sponsor/friendName/friendSex/Addition */
    OnHookBreak: function (p) {
      p = p || {};
      var now = env.now();
      return wrapped('OnHookBreak', {
        eRet: 1, operate: 1,
        skillID: p.skillID || 0, skillLevel: p.skillLevel || 0,
        needTime: 0, serverTime: now, beginTime: now,
        Sponsor: '', friendName: '', friendSex: 0, Addition: 0, itemAddition: 0,
      }, { achievement: ach() });
    },

    /** 打怪：callBackKilNpc 读 eRet 与 npcIDArr */
    killNpc: function (p) {
      p = p || {};
      return wrapped('killNpc', {
        eRet: 1,
        npcIDArr: p.npcIDArr || [],
        dropArr: [], extraArr: [], exp: 0,
      }, { achievement: ach() });
    },

    /** 护镖/托管开始：callBackBeginNpc 读 npcID/beginTime/endTime */
    BeginSaveNpc: function (p) {
      p = p || {};
      var now = env.now();
      return wrapped('BeginSaveNpc', {
        eRet: 1, npcID: p.npcID || 0, beginTime: now, endTime: now,
      }, { achievement: ach() });
    },

    /** 护镖/托管结束：callBackEndNpc 读 endTime/sex */
    EndSaveNpc: function () {
      return wrapped('EndSaveNpc', { eRet: 1, endTime: env.now(), sex: 0 }, { achievement: ach() });
    },

    /** 存档时间/充值状态：onSaveTimeEvent 只在 eRet==2 时做事，我们回 1 即空操作 */
    GetRoldSaveTime: function () {
      return wrapped('GetRoldSaveTime', { eRet: 1, flag: 0 }, { achievement: ach() });
    },

    /* ---------- 生活技能：钓鱼 ---------- */

    /** onStartFishing 51557：读 eRet/beginTime/serverTime/advertisementNum/maxTime */
    BeginFish: function (p) {
      p = p || {};
      var now = env.now();
      return wrapped('BeginFish', {
        eRet: 1, beginTime: now, serverTime: now,
        advertisementNum: 0, maxTime: 0, fishpondID: p.fishpondID || 0,
      }, { achievement: ach() });
    },

    /** onEndFishing 51576：读 eRet/serverTime/beginTime/gTime/hg/hgtimes/awardArr/extraArr */
    EndFish: function () {
      var s = loadSave();
      var now = env.now();
      return wrapped('EndFish', {
        eRet: 1, beginTime: now - 60000, serverTime: now,
        gTime: 60, hg: 100, hgtimes: 0,
        awardArr: {}, extraArr: [],
      }, { achievement: ach() });
    },

    /** onCheckFishingRewards 51545：只读 awardArr */
    LookFishAward: function () {
      return wrapped('LookFishAward', { eRet: 1, awardArr: {} }, { achievement: ach() });
    },

    /* ---------- 生活技能：修炼（打坐/练功） ---------- */

    /** 86189：0 != eRet 才算开始；读 beginTime/serverTime/maxTime */
    BeginPlayWooks: function () {
      var now = env.now();
      return wrapped('BeginPlayWooks', {
        eRet: 1, beginTime: now, serverTime: now, maxTime: 0,
      }, { achievement: ach() });
    },

    /** 86202：读 eRet/serverTime/beginTime/gTime/hg/hgtimes/exp/expExtra/potential/potentialExtra/specialAny */
    EndPlayWooks: function () {
      var now = env.now();
      return wrapped('EndPlayWooks', {
        eRet: 1, beginTime: now - 60000, serverTime: now,
        gTime: 60, hg: 100, hgtimes: 0,
        exp: 0, expExtra: 0, potential: 0, potentialExtra: 0, specialAny: 0,
      }, { achievement: ach() });
    },

    /** 77258：读 eRet/npcID/deletePartners */
    closedBook: function (p) {
      p = p || {};
      return wrapped('closedBook', {
        eRet: 1, npcID: p.npcID || 0, deletePartners: [],
      }, { achievement: ach() });
    },

    /** 144100：读 eRet/armStrong/shenFa/bone/understanding/bloodArr/maxWuxin/fosterArr。
     *  ⚠ eRet:1 时客户端会把四项基础属性**整体替换**成应答值（index.js:144101-144108）。
     *    我方没有"洗髓丹/转世"的数据来源，乱给会清空玩家基础属性 → 回非 1/2 的 eRet：
     *    客户端只弹一条提示（getText("910")，index.js:144132），不改任何数值。 */
    WashMedicine: function (p) {
      p = p || {};
      return wrapped('WashMedicine', {
        eRet: 0,
        armStrong: 0, shenFa: 0, bone: 0, understanding: 0,
        bloodArr: [], maxWuxin: 0, fosterArr: [],
      }, { achievement: ach() });
    },

    /** 洗点（洗附加属性）：`User.washAdditionalArr`（index.js:60205）。
     *  消费端状态机（index.js:144049-144076）：
     *    eRet 1 = 成功（bloodArr 4 项 → 力量/身法/根骨/悟性附加；可带 maxWuxin）
     *    eRet 4 = 弹 SetWashUI 选洗哪条：attrList 必须是 **"a,b|c,d|e,f|g,h" 字符串（4 段）**，
     *             客户端 split("|") 后取每段 split(",")[1] 当数值显示（scripts2.js:61720-61724）
     *    eRet 6/7 = 等级不足 / 上一世无附加属性；eRet 3 = 去充值（付费，不做）
     *  无 attrID = 洗全部；`{attrID:1..4}` = 只洗那一条（SetWashUI 的 toggle 序号，scripts2.js:61731）。
     *  离线语义：把对应槽位**清零**（把洗出来的附加洗掉），不发明随机数值。
     *  ⚠ LoadGame 必须同时给 cycleObj，否则按钮在发请求前就 TypeError（见 LoadGame 注释）。 */
    washAdditionalArr: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      if (!Array.isArray(s.bloodArr) || s.bloodArr.length !== 4) s.bloodArr = [0, 0, 0, 0];
      var k = parseInt(p.attrID, 10) || 0;
      if (!(k >= 1 && k <= 4)) {
        var attrList = '41,' + s.bloodArr[0] + '|42,' + s.bloodArr[1] + '|44,' + s.bloodArr[2] + '|43,' + s.bloodArr[3];
        return wrapped('washAdditionalArr', { eRet: 4, attrList: attrList }, { achievement: ach() });
      }
      s.bloodArr[k - 1] = 0;
      persist();
      env.log('washAdditionalArr 槽 ' + k + ' 已清零 → bloodArr=' + JSON.stringify(s.bloodArr));
      return wrapped('washAdditionalArr', { eRet: 1, bloodArr: clone(s.bloodArr), maxWuxin: 0 }, { achievement: ach() });
    },

    /* ---------- 门派 ---------- */

    /** 78022：读 eRet/npcID/serverTime/CDTime/skillId（6 == eRet 表示冷却中） */
    CheckOutSchool: function (p) {
      p = p || {};
      var now = env.now();
      return wrapped('CheckOutSchool', {
        eRet: 1, npcID: p.npcID || 0, serverTime: now, CDTime: now, skillId: 0,
      }, { achievement: ach() });
    },

    /** 77894（17 处字段）：npcIDArr 必须真是数组（客户端取 .length），clearBoxs 交给 MapBoxModel */
    OutSchool: function () {
      var now = env.now();
      return wrapped('OutSchool', {
        eRet: 1, npcID: 0, npcIDArr: [], oldSchool: 0,
        clearBoxs: [], textArr: [], rewardArray: null,
        serverTime: now, CDTime: now, skillId: 0,
      }, { achievement: ach() });
    },

    /** 世界 Boss 进场：读 flag/bossCurHP/bossMaxHP/curAttackNum/randSeed/buyNum/buffNum */
    enterWoldBossBattle: function () {
      return wrapped('enterWoldBossBattle', {
        eRet: 1, flag: 0, bossCurHP: 0, bossMaxHP: 0,
        curAttackNum: 0, randSeed: 0, buyNum: 0, buffNum: 0, AttckData: [],
      }, { achievement: ach() });
    },

    /** 上传伤害：读 killBoss(roleID 比对)/killBossName/bossMaxHP/bossCurHP/CDTime/setAllHpAndMp */
    checkUploadAttackDamge: function () {
      return wrapped('checkUploadAttackDamge', {
        eRet: 1, killBoss: 0, killBossName: '', bossMaxHP: 0, bossCurHP: 0,
        CDTime: 0, maxPotentialLimit: 0, setAllHpAndMp: {},
      }, { achievement: ach() });
    },

    /** 筹码兑换：读 curGold/curJetton/chipTimes/getPotency/getCoins */
    ExChangeJetton: function () {
      var s = loadSave();
      return wrapped('ExChangeJetton', {
        eRet: 1,
        curGold: typeof s.gold === 'number' ? s.gold : 20,
        curJetton: typeof s.chip === 'number' ? s.chip : 0,
        chipTimes: 0, getPotency: 0, getCoins: 0,
      }, { achievement: ach() });
    },

    /* ---------- 社交 / 门派 / 任务同步（形状来自 field_usage.json 取证） ---------- */

    /** 132209：for..in e.friendList，且取 friendList[n].friendId；uIds 存红点 */
    FriendList: function () {
      return wrapped('FriendList', { eRet: 1, uIds: [], friendList: {} }, { achievement: ach() });
    },
    /** 132269：Number(e.eRet)-1 当下标，1 = 成功 */
    ApplyFriend: function () { return wrapped('ApplyFriend', { eRet: 1 }, { achievement: ach() }); },
    FindFriend: function () { return wrapped('FindFriend', { eRet: 1 }, { achievement: ach() }); },
    /** 132204：注意这条是 0 == eRet 才算成功 */
    FindFriendByID: function () { return wrapped('FindFriendByID', { eRet: 0 }, { achievement: ach() }); },
    FriendDelete: function () { return wrapped('FriendDelete', { eRet: 1 }, { achievement: ach() }); },
    /** 101515：只读 eRet 与 CDTime */
    rankList: function () { return wrapped('rankList', { eRet: 1, CDTime: 0 }, { achievement: ach() }); },
    LookOther: function () { return wrapped('LookOther', { eRet: 1 }, { achievement: ach() }); },
    GetSchoolRankList: function () { return wrapped('GetSchoolRankList', { eRet: 1 }, { achievement: ach() }); },
    /** 门派评价：读 eRet/type/reviewList/maxPage（type 要与请求回显一致） */
    GetSchoolReview: function (p) {
      p = p || {};
      return wrapped('GetSchoolReview', {
        eRet: 1, type: p.type || 0, reviewList: [], maxPage: 0,
      }, { achievement: ach() });
    },
    /** 退出师门：客户端取 e.npcIDArr.length，必须是数组 */
    exitSchool: function () {
      return wrapped('exitSchool', { eRet: 1, npcIDArr: [] }, { achievement: ach() });
    },
    clearGeSchoolClothing: function () { return wrapped('clearGeSchoolClothing', { eRet: 1 }, { achievement: ach() }); },
    /** 任务同步：整份替换客户端缓存。**绝不能回空**——
     *  客户端拿到 {} 会当成"一个任务都没做过"，并把 "{}" 写回本地缓存（index.jsc:133515-133519），
     *  之后已做过的任务会被 NPC 重新派一遍。这里按账本回放两个集合。 */
    sycnTask: function () {
      var tl = taskLedger();
      env.log('sycnTask 回放 完成=' + tl.finishArr.length + ' 进行中=' + tl.acceptArr.length);
      return wrapped('sycnTask', {
        eRet: 1,
        PlayerFinishTaskObj: tl.finishObj,
        acceptTaskMap: tl.acceptMap,
        acceptTaskOrder: tl.order,
        PlayerTaskLog: [],
        taskLog: [],
      }, { achievement: ach() });
    },

    /** 物品同步：整份替换客户端背包（客户端先 `_itemObj = {}` 再按 itemObj 重建）→ 必须回全部持有物，
     *  且同样走派生叠加投射（否则"重登后任务又交不掉"） */
    sycnPlayerItemData: function () {
      var s = ensureLedger(loadSave());
      var prj = projectItems(s);
      return wrapped('sycnPlayerItemData', {
        eRet: 1,
        itemObj: prj.bag,
        PlayerEquip: clone(s.playerEquip),
      }, { achievement: ach() });
    },
    /** 使用物品：请求 {itemID,itemNum}；应答必须带 note 的五个子表（index.jsc:64757 起直接读 note.skch）
     *  叠加出来的物品不在存档里 → 截断到真实库存（否则会把不存在的东西"用掉"再写负数） */
    useItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var n = Math.abs(parseInt(p.itemNum, 10) || 1);
      var have = parseInt(s.bag[p.itemID], 10) || 0;
      var use = Math.min(n, have);
      var schSkill = (typeof BZ_ITEMSCH !== 'undefined' && BZ_ITEMSCH[p.itemID]) || 0;
      // Effect 5 = 师门秘籍（与 ITEMSCH/Effect 11 同族）：客户端 `index.js:64342-64347`
      //   `case 5: if (SkillTable.dic.hasOwnProperty(e.Data1)) { show(getText("243")); return !0; }
      //    var _ = getItem(e.ID, "master_book"); … 条件/Menpai 判定 …`
      //   ⇒ Data1 就是**技能 id**（不是查表命中率推出来的，是这一行直接读的）。
      //   已学会时客户端自己就弹 243 并本地拦截、不会发请求；条件不满足同理。
      //   所以走到我们这里的 Effect 5 请求 = "条件已满足、尚未学会" → 复用 ITEMSCH 的"学会 1 级"逻辑。
      var fx = (typeof BZ_ITEMFX !== 'undefined' && BZ_ITEMFX[p.itemID]) || null;
      // ⚠ 写法必须是 `(fx || [])[0]`：Type≠2 的物品不在 BZ_ITEMFX 里（构建期只收 Type==2），
      //   而 :65333 的发送点不受 Type 守卫约束（守卫只包住 :64321 的 switch）——
      //   所以 Type≠2 但客户端仍发 USE_ITEM 的物品会走到这里，直接取 `fx[0]` 会抛 TypeError（SOTA R17 反例 1）。
      if (!schSkill && ((fx || [])[0] === 5) && fx[1] > 0) schSkill = fx[1];
      var knownSkill = schSkill > 0 ? ((s.skills && s.skills[String(schSkill)]) || null) : null;
      // ===== R06 第 1/2 条：秘籍（Effect==11，Data1=技能 id）不再白吃 =====
      // 证据链（全部实测/读表，见 HANDOVER §23）：
      //   - 客户端**没有**"已学会就不许用"的拦截：Effect 11 落到 `65535 else` → `useItemFunc` 直接发请求；
      //   - `note.skch` 消费端只弹「恭喜你学会了[67]！」（lang 422，探针实读）、不写模型（64754-64763）
      //     → 学技能**只能服务端写档**；
      //   - 秘籍描述（lang 37608「记载着炼神分心术的秘籍」/ 37626「基础的调整呼吸功法…」）
      //     **既没说"学会"也没说"+1 级"** → 原版对"已学会"的行为无法从描述判定（R06 的判别法在这一项上无解）。
      // 因此按"绝不造成不可逆损失"处理（R06 第 2 条）：
      //   a) 技能**不存在** → 记 1 级（秘籍唯一合理的起点；技能表无起始等级列，见 skill.json 1112 行）
      //      + 写档 + `note.skch` → 客户端弹「恭喜你学会了X」；此项**假定**记录在案，可一键回退。
      //   b) 技能**已存在** → `eRet:5`（客户端 `5==eRet` 走 getText(1333)「你已经学会此配方了」，唯一"已学会"提示分支）
      //      **不扣物品** —— 这正是 3626 那次损失的形态，从此不会再发生。
      if (schSkill > 0 && use > 0 && knownSkill) {
        env.log('useItem 秘籍 ' + p.itemID + ' 拒绝：技能 ' + schSkill + ' 已在账本（'
          + JSON.stringify(knownSkill) + '），**不扣物品**（eRet:5）');
        return wrapped('useItem', { eRet: 5, itemID: p.itemID }, { achievement: ach() });
      }
      // ⚠ 顺序（SOTA R12 §1 第 5 条）：**先算效果、再扣物品、最后一次 persist**。
      //   原来先 `bagAdd` + `persist()` 再分发效果 → 效果分支里任何一次异常都会让物品"扣了但没生效"，而且已经写盘。
      //   `note.ivch` 是绝对值、必须在扣减之后才填，所以连同扣减一起后移。
      // 同一族错（2026-10-22 实测发现）：note.ivch 的值是**绝对值**（index.js:64674 直接 setItem(n,o[n])）。
      // 以前 useItem 只回形状默认的空 note → 用完界面数量不变，还能反复"用"。
      var note = { skch: {}, ivch: {}, eqch: {} };
      // ⚠ SOTA R13 §1 第 3 条：效果阶段**只算增量、绝不写 s**。
      //   原来这里直接 `s.skills[String(schSkill)] = [1, 0, 1]`、下面直接 `s.hunger = newHg`，
      //   而 `loadSave()` 回的是 `_save` 内存本体（215-216 有缓存）→ 效果分支任意一次抛异常都会
      //   "内存改了一半、盘上没写、应答又被 dispatch:2605 的 catch 换成成功 ACK" → 三方不一致。
      //   现在副作用先攒进 pending*，到"扣减 + 落盘"那一段一次性应用（那段只有赋值，不会抛）。
      var pendingSkill = null;
      var pendingHunger = null;
      // Effect 28 = **称号**（SOTA R17 §3 第 1 步"看名字"就定了）：
      //   物品 7027 的名字 lang=2102250 =「"烙饼试吃员"称号」、7026 =「"测试员"称号」，
      //   Data1 = 2044/2045 命中 `player_title` 表（该表 410 行、id 到 2388）。
      //   客户端对 28 **没有本地分支**（switch 无 case 28、无 default）→ 只发 USE_ITEM；
      //   成功回调读 `titleID`（index.js:64812）：
      //     `AchieveModel.getAchieveData().hasOwnProperty(a.titleID) ? show(3187) : AchieveModel.showTitleReward([a.titleID])`
      //   ⇒ 应答带 `titleID` 就是"获得称号"的契约。
      var giveTitleId = (use > 0 && (fx || [])[0] === 28 && fx[1] > 0) ? fx[1] : 0;
      // ===== 秘籍：技能不存在 → 学会 1 级（上面 a 分支） =====
      if (schSkill > 0 && use > 0 && !knownSkill) {
        pendingSkill = String(schSkill);
        note.skch[pendingSkill] = [1, 0, 1];
        env.log('useItem 秘籍 ' + p.itemID + ' → 学会技能 ' + schSkill + ' 等级 1（假定：秘籍=入门口诀，无起始等级列）');
      }
      // 食物饱食度（2026-10-22 实测"吃完不加饱食度"）：客户端请求带 `hg`（当前剩余，index.js:65302），
      // 应答 `note.attrch.hunger` = 新值才会落地（142440-142441 `case "hunger"` 直接赋值；客户端不做本地应用）。
      //
      // R05 F2 两条更正（原实现直接 `hg + eat*use` 就发，等于无条件相信客户端上报值）：
      //   ① **非法 hg 不发 attrch**：非数字 / 负数 / 超 1e7 一律记日志并跳过，绝不写脏值进模型。
      //   ② **上限截断**：R06 第 6 条更正了优先级（原来的账本优先会用到过期上限）：
      //      本次请求自带的 `hglmt`（最新鲜）→ 活客户端模型 `hunger.limit`（属性变了它就变）
      //      → 账本 `s.hungerMax`（只作**下限保护**：若它小于活模型值，用活模型值覆盖它）。
      var eat = (typeof BZ_ITEMEAT !== 'undefined' && BZ_ITEMEAT[p.itemID]) || 0;
      var hgRaw = p.hg;
      var hgHas = (hgRaw !== undefined && hgRaw !== null && String(hgRaw) !== '');
      var curHg = hgHas ? Number(hgRaw) : NaN;
      var hgOk = hgHas && isFinite(curHg) && curHg >= 0 && curHg <= HG_MAX_SANE;
      if (eat > 0 && hgHas && !hgOk) {
        env.log('useItem ' + p.itemID + ' 忽略非法 hg=' + hgRaw + '（不发 attrch）');
      } else if (eat > 0 && hgOk) {
        var gain = eat * use;
        var raw = Math.floor(curHg) + gain;
        var cap = hungerCapOf(s, p.hglmt);
        var newHg = (cap > 0 && raw > cap) ? cap : raw;
        note.attrch = { hunger: newHg };
        pendingHunger = newHg;
        env.log('useItem ' + p.itemID + ' 饱食度 ' + Math.floor(curHg) + ' + ' + gain + ' → ' + newHg
          + (cap > 0 ? ('（上限 ' + cap + '）') : '（上限未知，不截断）'));
      }
      // ===== 药品：Effect==2 回血 / Effect==3 回内（R06 Q3 + 语言表实读，见 HANDOVER §23）=====
      // 证据：item 表 Data1 就是数值（例：老白干 Effect=3/Data1=50 ↔ lang 37007「可恢复50点内力」；
      //   小块豆沙月饼 Effect=2/Data1=1000 ↔ lang 37010「恢复1000点生命值」）；请求里带
      //   `curHp/maxhpLimit`（65278-65279）与 `curMp/maxmpLimit`（65280-65282），上限**现成**；
      //   落地键是 `attrch.curhp / attrch.curmp`（142406-142412）。
      var effKind = (typeof BZ_ITEMFUN !== 'undefined' && BZ_ITEMFUN[p.itemID]) || null;
      if (effKind) {
        var amt = (parseInt(effKind.a, 10) || 0) * use;
        if (amt > 0 && effKind.k === 'hp') {
          var hpCur = parseFloat(p.curHp), hpMax = parseFloat(p.maxhpLimit);
          if (isFinite(hpCur) && hpCur >= 0 && isFinite(hpMax) && hpMax > 0) {
            var newHp = Math.min(Math.floor(hpCur) + amt, Math.floor(hpMax));
            note.attrch = note.attrch || {};
            note.attrch.curhp = newHp;
            env.log('useItem ' + p.itemID + ' 生命 ' + Math.floor(hpCur) + ' + ' + amt + ' → ' + newHp + '（上限 ' + Math.floor(hpMax) + '）');
          } else {
            env.log('useItem ' + p.itemID + ' 回血类但请求缺 curHp/maxhpLimit（' + p.curHp + '/' + p.maxhpLimit + '），不发 attrch');
          }
        } else if (amt > 0 && effKind.k === 'mp') {
          var mpCur = parseFloat(p.curMp), mpMax = parseFloat(p.maxmpLimit);
          if (isFinite(mpCur) && mpCur >= 0 && isFinite(mpMax) && mpMax > 0) {
            var newMp = Math.min(Math.floor(mpCur) + amt, Math.floor(mpMax));
            note.attrch = note.attrch || {};
            note.attrch.curmp = newMp;
            env.log('useItem ' + p.itemID + ' 内力 ' + Math.floor(mpCur) + ' + ' + amt + ' → ' + newMp + '（上限 ' + Math.floor(mpMax) + '）');
          } else {
            env.log('useItem ' + p.itemID + ' 回内类但请求缺 curMp/maxmpLimit（' + p.curMp + '/' + p.maxmpLimit + '），不发 attrch');
          }
        }
      }
      // ===== 未建模效果（SOTA R14 §1 第 3 条 / Q1 的 (b′)，**用户裁定先不改行为**）=====
      //  现状：item 表 522 条里只有 21 条被 ITEMEAT/ITEMFUN/ITEMSCH 覆盖；其余物品走"扣掉 → 三个分支都不命中
      //  → 什么都不发"⇒ 玩家点了，物品没了，效果没有。这是**正在发生的损失**，但一刀切拒绝会误伤
      //  （客户端只对消耗品发 useItem，可获性表 248 是表内高估口径）。用户裁定：先保持行为不变，
      //  下轮导出 item.Effect 后按家族实现。所以这里**只留痕、不改行为**：
      //    · 每一次"扣了但没效果"都写 REJECT 日志并计入 meta.rejectStats（cap 应为 0 的消耗事件表）；
      //    · 常量 REJECT_UNMODELED_ITEMS 改成 true 就切到"拒绝且不扣"（码 3，表里已登记）。
      var unmodeledEffect = use > 0 && !(eat > 0) && !effKind && !(schSkill > 0);
      if (unmodeledEffect) {
        if (REJECT_UNMODELED_ITEMS) {
          noteReject('useItem', 'effectUnmodeled', 'itemID=' + p.itemID + ' x' + use + '（不扣）');
          return wrapped('useItem', { eRet: 3, itemID: p.itemID }, { achievement: ach() });
        }
        noteConsume('useItem', 'effectUnmodeled', 'itemID=' + p.itemID + ' x' + use + '（照扣、无效果；待按 Effect 家族实现）');
      }
      // ===== 一次性应用副作用 + 扣减 + 落盘（效果全部算完才走到这里，见上面的顺序说明）=====
      //  这一段只有赋值与 bagAdd（内部无 throw），所以"要么全生效、要么一个字节都不动"。
      if (pendingSkill) s.skills[pendingSkill] = [1, 0, 1];
      if (pendingHunger !== null) s.hunger = pendingHunger;
      if (giveTitleId) { s.titles = s.titles || {}; s.titles[String(giveTitleId)] = 1; }
      var left = bagAdd(s, p.itemID, -use);
      if (use < n) env.log('useItem ' + p.itemID + ' 截断：请求 x' + n + '，真实库存只有 ' + have + '（叠加量不可消耗）');
      if (use > 0) note.ivch[p.itemID] = parseInt(s.bag[p.itemID], 10) || 0;
      persist();
      env.log('useItem ' + p.itemID + ' x' + use + ' → 余 ' + left);
      var res = shaped('useItem', { itemID: p.itemID, note: note }) || ack('useItem', { note: note, achievement: ach() });
      // ⚠ 形状表把一批"分支选择器"字段也补上了（formulaID/taskID/mountID/gemId/...），
      //   而客户端是用 `hasOwnProperty` 判断"这批道具该不该走那条分支"的：
      //   formulaID=0 → `getItem(0,"formula")` 得 null → `n.getText(y.name)` 抛 TypeError
      //   （实测日志：useItem 之后 `Cannot read property 'name' of null @ index.js:64796`）。
      //   → 这些字段默认**一律不发**，只有对应效果真的实现时才显式塞进去。
      var inner = res && res['User.useItem'];
      if (inner) {
        // 完整清单（2026-10-22 复核 index.js:64754-64888 全部开关，23 项）：比首版多出
        // titleID/genGuDan/stealFlag/avatarInfo/itemRealgarMap/rewardSkillSkin/housekeeper/
        // weaponSkinId/emoId/rewardArray/getKnackIds/partners/mpnum。
        // 注意：光靠这里删没用——dispatch 的 fillShape 会把形状表里的字段补回来；
        // 真修复在 tools/gen_shapes.js 的 SHAPE_OMIT（形状表源头不再产出这些字段）。
        var BRANCH_ONLY = ['formulaID', 'mountID', 'titleID', 'bloodEndTime', 'dogid', 'hanyusuiTime', 'genGuDan', 'stealFlag',
          'endMonthCardTime', 'avatarInfo', 'itemRealgarMap', 'rewardSkillSkin', 'housekeeper', 'wId', 'wArr', 'weaponSkinId',
          'emoId', 'taskID', 'rewardArray', 'getKnackIds', 'partners', 'mpnum', 'gemId'];
        for (var bi = 0; bi < BRANCH_ONLY.length; bi++) delete inner[BRANCH_ONLY[bi]];
      }
      // Effect 28 = 称号：**必须放在 BRANCH_ONLY 删除之后**（'titleID' 就在那份清单里，
      // 上面那段是把"形状表补出来的分支选择器"清掉；这里是我们主动发的那一个）。
      if (giveTitleId && inner) {
        inner.titleID = giveTitleId;
        env.log('useItem ' + p.itemID + ' → 获得称号 ' + giveTitleId + '（应答 titleID，客户端 index.js:64812 走 showTitleReward）');
      }
      return res;
    },
    /** 出售：请求 `{saleArr:[[type,id,count], ...]}`（客户端真实形状，index.js:65191-65208；
     *  type 1=物品、2=装备实例 uid）。旧实现只认 `{itemID,num}`/裸 id → 玩家卖东西服务端什么都没做（实测）。
     *  仍然只结算真实库存：叠加量不可变卖（截断 + 日志）。
     *  2026-10-22（R04 第 0 位）：**结算铜钱**。客户端公式 o += parseInt(item.Price) * count
     *  （index.js:65207），但这笔 o 只用于 15e8 上限检查、客户端不本地加钱；应答消费端
     *  （index.js:64726-64742）只读 eRet / note.ivch / note.eqch，一个铜钱字段都不读
     *  → 必须服务端记账 + 主动推 RoleBaseInfo.coins，否则"卖东西=白扔"（不可逆的数据损失）。 */
    saleItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var arr = p.saleArr || [];
      var sold = [];
      var coins = 0, pricedN = 0, unpriced = [], ivch = {}, eqch = {};
      for (var i = 0; i < arr.length; i++) {
        var e = arr[i], id = 0, cnt = 1, equip = false;
        if (Array.isArray(e)) {
          equip = parseInt(e[0], 10) === 2;
          id = parseInt(e[1], 10) || 0;
          cnt = Math.abs(parseInt(e[2], 10) || 1);
        } else if (e && typeof e === 'object') {
          id = parseInt(e.itemID || e.id, 10) || 0;
          cnt = Math.abs(parseInt(e.num || e.itemNum || 1, 10) || 1);
        } else {
          id = parseInt(e, 10) || 0;
        }
        if (!(id > 0)) continue;
        // 计价要用的 itemID 必须在删账之前取（type>=2 的实例 uid≠itemID）
        var priceItemID = equip ? equipItemIDOf(s, id) : id;
        if (equip) {
          var inst = s.playerEquip[id];
          var haveE = Array.isArray(inst) ? (parseInt(inst[1], 10) || 0) : 0;
          if (cnt > haveE) { env.log('saleItem 装备 ' + id + ' 截断：请求 x' + cnt + '，真实持有 ' + haveE); cnt = haveE; }
          if (cnt > 0) {
            var leftE = haveE - cnt;
            if (leftE > 0) s.playerEquip[id] = [1, leftE];
            else {
              delete s.playerEquip[id];
              for (var slot in s.equipments) {
                if (s.equipments.hasOwnProperty(slot) && parseInt(s.equipments[slot], 10) === id) delete s.equipments[slot];
              }
            }
            // eqch 的格式由客户端监听器定死（index.js:64678-64694）：
            //   o[uid][0] == 0 → deleteEq(uid)；否则 o[uid][1] 交给 parseEq（type==1 时取 [1] 当 num）
            eqch[id] = (leftE > 0) ? [1, s.playerEquip[id]] : [0];
          }
        } else {
          var have = parseInt(s.bag[id], 10) || 0;
          if (cnt > have) { env.log('saleItem ' + id + ' 截断：请求 x' + cnt + '，真实库存只有 ' + have); cnt = have; }
          bagAdd(s, id, -cnt);
          // ivch 的语义是「物品id → **绝对值**」（index.js:64674-64676 直接 setItem(n, o[n])），
          // 不是"变了多少"。发增量会把 20 个卖 1 个改成 1 个（玩家实测），而且界面还有货→能反复卖。
          if (cnt > 0) ivch[id] = parseInt(s.bag[id], 10) || 0;
        }
        if (cnt > 0) {
          var unit = itemPrice(priceItemID);
          if (unit > 0) { coins += unit * cnt; pricedN++; }
          else unpriced.push(priceItemID);      // 表里 Price=0 的东西：不结算、只记日志
        }
        sold.push((equip ? 'eq' : '') + id + 'x' + cnt);
      }
      if (coins > 0) {
        // 初值口径：与 LoadGame 的缺省一致（loadSave 的 s.coins / baseValueAy[35] 都用 99999），
        // 否则首次卖出会从"面板显示 99999"跳到"余额 = 本次售价"
        if (typeof s.coins !== 'number') s.coins = 99999;
        s.coins += coins;
      }
      persist();
      env.log('saleItem ' + sold.join(',')
        + (coins > 0 ? ('  +' + coins + '铜钱（' + pricedN + ' 项计价）→ 余 ' + s.coins) : '  无铜钱结算')
        + (unpriced.length ? ('  零价物品:' + unpriced.join(',')) : ''));
      pushCoins(s.coins);
      // ⚠ 全部投射都走应答里的 note，不要再自己 setItem/deleteEq：客户端对 note 的处理
      //   = `for (var E in note) dispatch(E, note[E])`（index.js:59325），而 ivch/eqch/eco 三个
      //   事件各有官方监听器（INVENTORY_CHNG 64674 / EQ_CHNG 64678 / ECONOMY_CHNG 64698），
      //   会把**绝对值**写进模型并刷新 UI。之前多发一份增量 → 数量被覆盖（20 卖 1 变 1）。
      // note.ivch / note.eqch 的**键**是客户端刷新被卖格子的依据（index.js:64730）。
      // 而且客户端的通用拆包会把 note 的**每个键当事件名派发**：`for (var E in g[I].note) dispatch(E, ...)`
      // （index.js:59325），而 `HttpConst.INVENTORY_CHNG = "ivch"`（59569）、`EQ_CHNG = "eqch"`（59572）
      // → 回这两个键本身就触发了"背包/装备变了"的广播，不需要另外造事件。
      // ⚠ note 必须落在 `User.saleItem` 里（消费端读 o.note.ivch），不能挂在信封顶层 ——
      //   `ack(name, extra)` 的 extra 是加到信封根上的（achievement 才走那条），所以这里不用 ack。
      var note = { ivch: ivch, eqch: eqch, eco: { coins: s.coins } };
      var payload = { eRet: 1, note: note };
      return shaped('saleItem', payload) || wrapped('saleItem', payload, { achievement: ach() });
    },
    /** 买店货：请求 `{itemID,itemNum}`（客户端真名，index.js:65257-65262 `InventoryModel.buyItem`）。
     *  **这是一次真正的交易**（2026-10-22 修，玩家实测"买 1011 个糖葫芦一分没扣"）：
     *   - 单价 = item 表 `BuyPrice`：客户端建货架时就是 `price: s.BuyPrice`（scripts2.js:46443/46452），
     *     付款前本地只做 `o = price*counts` 与 `RoleBaseInfo.coins` 的比较（scripts2.js:46521）；
     *   - 应答消费端（index.js:64743-64753）只读 `eRet` 与 `note.ivch/eqch`，**不读任何货币字段**
     *     → 扣钱与投放都必须服务端做，并主动推 RoleBaseInfo.coins；
     *   - 物品按 `grantItem` 分流（Type=1 进 playerEquip，其余进 bag），再按**绝对值**推回客户端，
     *     否则买完背包界面不刷新（`onBuySuccess` 只重读 `RoleBaseInfo.getItemNum`，scripts2.js:46535）；
     *   - 钱不够 → `eRet:4`（客户端消费端对 4 会弹提示，index.js:64752）。 */
    buyShopItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var itemID = parseInt(p.itemID, 10) || 0;
      var n = Math.abs(parseInt(p.itemNum, 10) || 1);
      if (!(itemID > 0) || n <= 0) {
        env.log('buyShopItem 忽略无效请求 ' + JSON.stringify(p));
        return wrapped('buyShopItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      var unit = itemBuyPrice(itemID);
      if (!(unit > 0)) {
        // 表里 BuyPrice=0 的物品不进任何货架；真收到请求就拒绝，不白送
        env.log('buyShopItem ' + itemID + ' 无买价（BuyPrice=0），拒绝');
        return wrapped('buyShopItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      var cost = unit * n;
      if (typeof s.coins !== 'number') s.coins = 99999;   // 与 LoadGame 缺省同口径
      if (cost > s.coins) {
        env.log('buyShopItem ' + itemID + ' x' + n + ' 拒绝：需 ' + cost + '，只有 ' + s.coins);
        return wrapped('buyShopItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      s.coins -= cost;
      grantItem(s, itemID, n);
      persist();
      env.log('buyShopItem ' + itemID + ' x' + n + '  单价 ' + unit + '，扣 ' + cost + ' 铜钱 → 余 ' + s.coins);
      // 投射全部走 note（客户端 note 的每个键都会 dispatch 成事件，各自有官方监听器）：
      //   ivch = {物品id: **买完后的绝对数量**}（64674 直接 setItem(n, o[n])，不是增量）
      //   eqch = {uid: [1, [type,num,...]]}（64678-64690，0 开头表示删除）
      //   eco  = {coins: 新余额}（64700 直接赋值 RoleBaseInfo.coins，并顺带派发 SHOP_BUY_ITEM 刷新）
      var note = { ivch: {}, eqch: {}, eco: { coins: s.coins } };
      if (itemTypeOf(itemID) === 1) {
        note.eqch[itemID] = [1, s.playerEquip[itemID]];
      } else {
        note.ivch[itemID] = parseInt(s.bag[itemID], 10) || 0;
      }
      var payload = { eRet: 1, itemID: itemID, note: note };
      return shaped('buyShopItem', payload) || wrapped('buyShopItem', payload, { achievement: ach() });
    },
    /** NPC 金条商店的货架：`User.getShopItem {npcid}`（index.js:59606 ← SpecialGoodsModel:123380）。
     *  客户端拿到应答后走 `NormalShopUI.resListSuccess`，它第一句就是
     *  `if (e.hasOwnProperty("ShopArray"))`（scripts2.js:46462），缺这一段整段不执行 → 商店开出空白。
     *  货架数据来自配置表（BZ_NPCSHOP，random_shop / house_shop / lh_shop 里带 npc 的行）。 */
    getShopItem: function (p) {
      p = p || {};
      var npc = parseInt(p.npcid, 10) || 0;
      var sh = npcShopOf(npc);
      var items = sh ? sh.i : [], prices = sh ? sh.p : [];
      env.log('getShopItem npc=' + npc + ' → ' + items.length + ' 件货');
      return wrapped('getShopItem', { eRet: 1, ShopArray: { item: items, price: prices } }, { achievement: ach() });
    },
    /** 金条购买：`User.buySpecialShopItem {npcid,itemID,itemNum}`（index.js:59607 ← 123386）。
     *  付款货币是**金条**：NormalShopUI.onBuyBtn 的 npcId>0 分支比的是 `RoleBaseInfo.gold`（scripts2.js:46521）。
     *  扣款项走应答里的 `note.eco.gold`（客户端 ECONOMY_CHNG 直接赋值，index.js:64708）。
     *  ⚠ 金条是**我方维护的离线账**，不存在任何真实付费渠道（用户 2026-10-22 裁定）。 */
    buySpecialShopItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var npc = parseInt(p.npcid, 10) || 0;
      var itemID = parseInt(p.itemID, 10) || 0;
      var n = Math.abs(parseInt(p.itemNum, 10) || 1);
      if (!(itemID > 0) || n <= 0) return wrapped('buySpecialShopItem', { eRet: 4, note: {} }, { achievement: ach() });
      var sh = npcShopOf(npc);
      var idx = sh ? sh.i.indexOf(itemID) : -1;
      if (idx < 0) {
        env.log('buySpecialShopItem npc=' + npc + ' item=' + itemID + ' 不在货架上，拒绝');
        return wrapped('buySpecialShopItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      var unit = parseInt(sh.p[idx], 10) || 0;
      var cost = unit * n;
      if (typeof s.gold !== 'number') s.gold = 99999;
      if (!(unit > 0) || cost > s.gold) {
        env.log('buySpecialShopItem npc=' + npc + ' item=' + itemID + ' x' + n + ' 拒绝：需 ' + cost + ' 金条，只有 ' + s.gold);
        return wrapped('buySpecialShopItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      s.gold -= cost;
      grantItem(s, itemID, n);
      persist();
      env.log('buySpecialShopItem npc=' + npc + ' item=' + itemID + ' x' + n + '  单价 ' + unit + ' 金条，扣 ' + cost + ' → 余 ' + s.gold);
      var note = { ivch: {}, eqch: {}, eco: { gold: s.gold } };
      if (itemTypeOf(itemID) === 1) note.eqch[itemID] = [1, s.playerEquip[itemID]];
      else note.ivch[itemID] = parseInt(s.bag[itemID], 10) || 0;
      var payload = { eRet: 1, itemID: itemID, note: note };
      return shaped('buySpecialShopItem', payload) || wrapped('buySpecialShopItem', payload, { achievement: ach() });
    },
    /** 流言/随机商店的货架：`User.GetSpecialShopData {npcID}`（index.js:59618 ← 1641，NPC Type 33/35）。
     *  消费端 specialShopCallBack（index.js:1467-1483）只判 `hasOwnProperty("shopData")`，缺了整段不开；
     *  随后 SaleShopQiUI.setShowData（scripts2.js:55231-55238）把 `e.shopData` 当**以物品 id 为键的对象**，
     *  按 `payment==2 && parseInt(page)==页号+1` 筛页（55272-55286），条目读 payment/page/limit/isserver/endtime/ID。
     *  `curGold` 被 showSaleShopUI 用来同步金条显示（scripts2.js:55064-55066）。 */
    GetSpecialShopData: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var npc = parseInt(p.npcID, 10) || 0;
      var sh = npcShopOf(npc);
      var shopData = {};
      if (sh && sh.i) {
        for (var si = 0; si < sh.i.length; si++) {
          var sid = sh.i[si];
          var meta = (sh.m && sh.m[sid]) || {};
          shopData[sid] = {
            ID: sid,
            itemId: sid,
            payment: parseInt(meta.pay, 10) || 0,
            page: parseInt(meta.pg, 10) || 0,
            isserver: parseInt(meta.is, 10) || 0,
            endtime: parseInt(meta.et, 10) || 0,
            limit: parseInt(sh.l[si], 10) || 0,
            price: parseInt(sh.p[si], 10) || 0,
          };
        }
      }
      env.log('GetSpecialShopData npc=' + npc + ' → ' + Object.keys(shopData).length + ' 件货');
      return wrapped('GetSpecialShopData', {
        eRet: 1,
        curGold: typeof s.gold === 'number' ? s.gold : 99999,
        selfData: {},
        shopData: shopData,
      }, { achievement: ach() });
    },
    /** 流言商店购买：`User.BuyAcitivityShop {itemID,itemNum}`（客户端原文拼写，index.js:59619 ← 1635）。
     *  消费端 activeShppCallBack（index.js:1484-1511）：1==eRet 时读 e.itemID/e.itemNum 并派发 SALE_RANDOM_SHOP。
     *  货币是**金条**：BuyItemUI6.onBuyClick 比的是 RoleBaseInfo.gold（scripts2.js:7441），
     *  扣款走 note.eco.gold（绝对值，index.js:64708 直接赋值）。 */
    BuyAcitivityShop: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var itemID = parseInt(p.itemID, 10) || 0;
      var n = Math.abs(parseInt(p.itemNum, 10) || 1);
      if (!(itemID > 0) || n <= 0) return wrapped('BuyAcitivityShop', { eRet: 4, note: {} }, { achievement: ach() });
      var shelves = (typeof BZ_NPCSHOP !== 'undefined') ? BZ_NPCSHOP : null;
      var hit = null;
      if (shelves) {
        for (var npk in shelves) {
          if (!shelves.hasOwnProperty(npk)) continue;
          var bx = shelves[npk];
          var idx = (bx && bx.i) ? bx.i.indexOf(itemID) : -1;
          if (idx >= 0) { hit = { box: bx, idx: idx }; break; }
        }
      }
      if (!hit) {
        env.log('BuyAcitivityShop item=' + itemID + ' 不在任何货架，拒绝');
        return wrapped('BuyAcitivityShop', { eRet: 4, note: {} }, { achievement: ach() });
      }
      var unit = parseInt(hit.box.p[hit.idx], 10) || 0;
      var cost = unit * n;
      if (typeof s.gold !== 'number') s.gold = 99999;
      if (!(unit > 0) || cost > s.gold) {
        env.log('BuyAcitivityShop item=' + itemID + ' x' + n + ' 拒绝：需 ' + cost + ' 金条，只有 ' + s.gold);
        return wrapped('BuyAcitivityShop', { eRet: 4, note: {} }, { achievement: ach() });
      }
      s.gold -= cost;
      grantItem(s, itemID, n);
      persist();
      env.log('BuyAcitivityShop item=' + itemID + ' x' + n + '  单价 ' + unit + ' 金条，扣 ' + cost + ' → 余 ' + s.gold);
      var note = { ivch: {}, eqch: {}, eco: { gold: s.gold } };
      if (itemTypeOf(itemID) === 1) note.eqch[itemID] = [1, s.playerEquip[itemID]];
      else note.ivch[itemID] = parseInt(s.bag[itemID], 10) || 0;
      var payload = { eRet: 1, itemID: itemID, itemNum: n, note: note };
      return shaped('BuyAcitivityShop', payload) || wrapped('BuyAcitivityShop', payload, { achievement: ach() });
    },
    /** 兑换商店货架：`User.getChangeShop {npcid}`（index.js:59695 ← 47101）。
     *  消费端 ExchangeModel（index.js:47076-47078）：1==eRet 时 dispatch EXCHANGE_SHOP_DATA(e.shopObj)；
     *  ExchangeShowUI 把 shopObj 当"数组的数组"渲染（行结构见 BZ_EXCHANGE 注释）。 */
    getChangeShop: function (p) {
      p = p || {};
      var npc = parseInt(p.npcid, 10) || 0;
      var rows = (typeof BZ_EXCHANGE !== 'undefined' && BZ_EXCHANGE[npc]) || [];
      env.log('getChangeShop npc=' + npc + ' → ' + rows.length + ' 行');
      return wrapped('getChangeShop', { eRet: 1, shopObj: rows }, { achievement: ach() });
    },
    /** 兑换购买：`User.exchangeItem {itemID,itemNum,npcid}`（index.js:59698 ← 47112）。
     *  请求里的 itemID 是**兑换行 id**（ExchangeBuyUI.startBuyReqCallBack 传 objectItem[0]），
     *  成本在 BZ_EXCHANGE 行[4]（"物品id,数量|..."，按份数乘）。成功后客户端用回显的
     *  itemID(真物品 id)/itemNum 刷新拥有数（index.js:47090-47096）。 */
    exchangeItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var npc = parseInt(p.npcid, 10) || 0;
      var rowId = parseInt(p.itemID, 10) || 0;
      var n = Math.abs(parseInt(p.itemNum, 10) || 1);
      var rows = (typeof BZ_EXCHANGE !== 'undefined' && BZ_EXCHANGE[npc]) || [];
      var row = null;
      for (var ri = 0; ri < rows.length; ri++) {
        if (parseInt(rows[ri][0], 10) === rowId) { row = rows[ri]; break; }
      }
      if (!row || n <= 0) {
        env.log('exchangeItem 找不到兑换行 npc=' + npc + ' id=' + rowId);
        return wrapped('exchangeItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      var itemID = parseInt(row[2], 10) || 0;
      var per = Math.max(parseInt(row[3], 10) || 1, 1);
      var costStr = String(row[4] || '');
      var need = [];
      var segs = costStr.split('|');
      for (var cj = 0; cj < segs.length; cj++) {
        var kv = segs[cj].split(',');
        var cid = parseInt(kv[0], 10) || 0;
        var cc = parseInt(kv[1], 10) || 0;
        if (cid > 0 && cc > 0) need.push({ id: cid, count: cc * n });
      }
      if (!need.length) {
        env.log('exchangeItem 行 ' + rowId + ' 成本串为空，拒绝');
        return wrapped('exchangeItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      // 奖励能不能落地**先判**：货币但落不了账 → 直接拒，不许先把成本扣掉再发不出去。
      // （表里 118 行货币奖励都命中 CURRENCY_SLOTS：潜能 111 / 银两 6 / 金条 1；
      //   这里的拒绝分支只为 `2` 与 `4002(经验)` 兜底，当前内容零命中。）
      var walletReward = isCurrencyItem(itemID);
      if (walletReward && !currencySlot(itemID)) {
        env.log('exchangeItem 行 ' + rowId + ' 奖励 id ' + itemID
          + ' 客户端算货币但没有可持久化的钱包字段 → 拒绝，未扣成本');
        return wrapped('exchangeItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      for (var ck = 0; ck < need.length; ck++) {
        var have = parseInt(s.bag[need[ck].id], 10) || 0;
        if (have < need[ck].count) {
          env.log('exchangeItem 成本不足: 需要 ' + need[ck].id + '×' + need[ck].count + '，只有 ' + have);
          return wrapped('exchangeItem', { eRet: 4, note: {} }, { achievement: ach() });
        }
      }
      for (ck = 0; ck < need.length; ck++) bagAdd(s, need[ck].id, -need[ck].count);
      var grant = per * n;
      // 奖励是货币 → 写钱包 + note.eco（客户端 ECONOMY_CHNG 直接赋 RoleBaseInfo，index.js:64698-64725）
      // 不是货币 → 照旧 grantItem（物品进 bag、装备进 PlayerEquip，再按绝对值投射）
      var ecoGain = walletReward ? grantCurrency(s, itemID, grant) : null;
      if (!walletReward) grantItem(s, itemID, grant);
      persist();
      var note = { ivch: {}, eqch: {} };
      for (ck = 0; ck < need.length; ck++) note.ivch[need[ck].id] = parseInt(s.bag[need[ck].id], 10) || 0;
      if (walletReward) {
        note.eco = ecoGain;          // 货币**不进** ivch：客户端取货币只认 RoleBaseInfo.getItemNum
      } else if (itemTypeOf(itemID) === 1) note.eqch[itemID] = [1, s.playerEquip[itemID]];
      else note.ivch[itemID] = parseInt(s.bag[itemID], 10) || 0;
      env.log('exchangeItem npc=' + npc + ' 行 ' + rowId + ' → ' + itemID + '×' + grant
        + (walletReward ? '（货币 → 钱包 ' + JSON.stringify(ecoGain) + '）' : ''));
      return wrapped('exchangeItem', { eRet: 1, itemID: itemID, itemNum: grant, note: note }, { achievement: ach() });
    },
    /** 正邪商店货架：`User.getGoodAndEvilShopData`（index.js:60444 常量；发送点 scripts3.js:36525）。
     *  消费端 onGetShopData（scripts3.js:36527-36540）：e.shop → GoodEvilModel.shopData，
     *  元素客户端读 id/Name/Price/rankopen/rankNum/buyCount/Data/Description（37581-37614、34950-34959）。
     *  声望门槛在**客户端**算：getMyPrestigeLv() 读 goodEvilPrestige（未定义 → 恒 1，rankopen=1 的可买）。 */
    getGoodAndEvilShopData: function () {
      var rows = (typeof BZ_GESHOP !== 'undefined' && BZ_GESHOP) || [];
      var shop = [];
      for (var gi = 0; gi < rows.length; gi++) {
        var gr = rows[gi];
        shop.push({
          id: gr.id, Name: gr.Name, Description: gr.Description, Data: gr.Data,
          Price: gr.Price, camp: gr.camp, rankopen: gr.rankopen,
          rankNum: (gr.rankNums && gr.rankNums[0]) || 0,
          buyCount: 0,
        });
      }
      env.log('getGoodAndEvilShopData → ' + shop.length + ' 件');
      return wrapped('getGoodAndEvilShopData', { eRet: 1, shop: shop, nextRefreshTime: 0 }, { achievement: ach() });
    },
    /** 正邪商店购买：`User.buyGoodAndEvilShopItem {id,itemNum}`（scripts3.js:36511 ← 36510）。
     *  货币 = **正邪贡献**（GoodEvilBuyUI.onClickBtnBuy 比 goodEvilContribution，34964）；
     *  应答读 eRet/contribution/rewardArray/id/buyCount（onBuy 36516-36523、refreshShopData 36504-36509）。 */
    buyGoodAndEvilShopItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var id = parseInt(p.id, 10) || 0;
      var n = Math.abs(parseInt(p.itemNum, 10) || 1);
      var rows = (typeof BZ_GESHOP !== 'undefined' && BZ_GESHOP) || [];
      var row = null;
      for (var gi = 0; gi < rows.length; gi++) { if (rows[gi].id === id) { row = rows[gi]; break; } }
      if (!row || n <= 0) {
        env.log('buyGoodAndEvilShopItem 找不到货 id=' + id);
        return wrapped('buyGoodAndEvilShopItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      var unit = parseInt(row.Price, 10) || 0;
      var cost = unit * n;
      if (typeof s.contribution !== 'number') s.contribution = 0;
      if (!(unit > 0) || cost > s.contribution) {
        env.log('buyGoodAndEvilShopItem ' + id + ' x' + n + ' 拒绝：需 ' + cost + ' 贡献，只有 ' + s.contribution);
        return wrapped('buyGoodAndEvilShopItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      s.contribution -= cost;
      var gid = parseInt(row.Data[0], 10) || 0;
      var grant = Math.max(parseInt(row.Data[1], 10) || 1, 1) * n;
      grantItem(s, gid, grant);
      persist();
      env.log('buyGoodAndEvilShopItem ' + id + ' x' + n + ' → ' + gid + '×' + grant + '，贡献余 ' + s.contribution);
      var note = { ivch: {}, eqch: {} };
      if (itemTypeOf(gid) === 1) note.eqch[gid] = [1, s.playerEquip[gid]];
      else note.ivch[gid] = parseInt(s.bag[gid], 10) || 0;
      var ra = {}; ra[gid] = grant;
      return wrapped('buyGoodAndEvilShopItem', { eRet: 1, contribution: s.contribution, rewardArray: ra, id: row.id, buyCount: n, note: note }, { achievement: ach() });
    },
    /** 江湖商店货架：`User.rgGetShopData`（index.js:60515；发送 scripts3.js:71221）。
     *  消费端 onGetShopData（71231-71240）：e.shop → RogueModel.shopData，另读 rank/endTime/reputationLevelId；
     *  元素读 id/costitem/cost/item/refresh/reputation/closetime/num/buyCount（75284-75363）。 */
    rgGetShopData: function () {
      var rows = (typeof BZ_ROGUESHOP !== 'undefined' && BZ_ROGUESHOP) || [];
      var shop = [];
      for (var ri = 0; ri < rows.length; ri++) {
        var rr = rows[ri];
        shop.push({
          id: rr.id, item: rr.item, costitem: rr.costitem, cost: rr.cost, num: rr.num,
          refresh: rr.refresh, rank: rr.rank, reputation: rr.reputation,
          closetime: rr.closetime, buyCount: 0,
        });
      }
      env.log('rgGetShopData → ' + shop.length + ' 件');
      return wrapped('rgGetShopData', { eRet: 1, shop: shop, rank: 0, endTime: 0, reputationLevelId: 0 }, { achievement: ach() });
    },
    /** 江湖商店购买：`User.rgShopByItem {id,itemNum}`（scripts3.js:71193 ← 71192）。
     *  货币是**实物**：costitem × cost（RogueBuyUI.onClickBtnBuy 比 havePriceNum=getItemNum(costId)，64795/75351）；
     *  应答读 eRet/rewardArray/id/buyCount（onShopBuy 71207-71219、setShopData 71198-71206）。 */
    rgShopByItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var id = parseInt(p.id, 10) || 0;
      var n = Math.abs(parseInt(p.itemNum, 10) || 1);
      var rows = (typeof BZ_ROGUESHOP !== 'undefined' && BZ_ROGUESHOP) || [];
      var row = null;
      for (var ri = 0; ri < rows.length; ri++) { if (rows[ri].id === id) { row = rows[ri]; break; } }
      if (!row || n <= 0) {
        env.log('rgShopByItem 找不到货 id=' + id);
        return wrapped('rgShopByItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      var unit = Math.max(parseInt(row.cost, 10) || 0, 0);
      var need = unit * n;
      var have = parseInt(s.bag[row.costitem], 10) || 0;
      if (!(need > 0) || have < need) {
        env.log('rgShopByItem ' + id + ' x' + n + ' 拒绝：需 ' + row.costitem + '×' + need + '，只有 ' + have);
        return wrapped('rgShopByItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      bagAdd(s, row.costitem, -need);
      var grant = n;
      grantItem(s, row.item, grant);
      persist();
      env.log('rgShopByItem ' + id + ' x' + n + ' → ' + row.item + '×' + grant + '，扣 ' + row.costitem + '×' + need);
      var note = { ivch: {}, eqch: {} };
      note.ivch[row.costitem] = parseInt(s.bag[row.costitem], 10) || 0;
      if (itemTypeOf(row.item) === 1) note.eqch[row.item] = [1, s.playerEquip[row.item]];
      else note.ivch[row.item] = parseInt(s.bag[row.item], 10) || 0;
      var ra = {}; ra[row.item] = grant;
      return wrapped('rgShopByItem', { eRet: 1, id: row.id, buyCount: n, rewardArray: ra, note: note }, { achievement: ach() });
    },
    /** 快速购买（货币直购）：客户端三包里**没有发送点**（只有常量），保留但按买价结算，避免变白送。 */
    QuickBuyItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var itemID = parseInt(p.itemID, 10) || 0;
      var n = Math.abs(parseInt(p.itemNum, 10) || 1);
      if (!(itemID > 0) || n <= 0) return wrapped('QuickBuyItem', { eRet: 4, note: {} }, { achievement: ach() });
      var unit = itemBuyPrice(itemID);
      if (!(unit > 0)) {
        env.log('QuickBuyItem ' + itemID + ' 无买价，拒绝');
        return wrapped('QuickBuyItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      var cost = unit * n;
      if (typeof s.coins !== 'number') s.coins = 99999;
      if (cost > s.coins) {
        env.log('QuickBuyItem ' + itemID + ' x' + n + ' 拒绝：需 ' + cost + '，只有 ' + s.coins);
        return wrapped('QuickBuyItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      s.coins -= cost;
      grantItem(s, itemID, n);
      persist();
      env.log('QuickBuyItem ' + itemID + ' x' + n + '  单价 ' + unit + '，扣 ' + cost + ' → 余 ' + s.coins);
      var note2 = { ivch: {}, eqch: {}, eco: { coins: s.coins } };
      if (itemTypeOf(itemID) === 1) note2.eqch[itemID] = [1, s.playerEquip[itemID]];
      else note2.ivch[itemID] = parseInt(s.bag[itemID], 10) || 0;
      var payload2 = { eRet: 1, itemID: itemID, itemNum: n, note: note2 };
      return shaped('QuickBuyItem', payload2) || wrapped('QuickBuyItem', payload2, { achievement: ach() });
    },
    /** 直接给物品（多为服务端推送；客户端若发过来也记账） */
    addItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var id = p.itemID || p.id;
      var n = Math.abs(parseInt(p.itemNum || p.num, 10) || 1);
      bagAdd(s, id, n);
      persist();
      env.log('addItem ' + id + ' x' + n);
      return shaped('addItem', { itemID: id }) || ack('addItem', { achievement: ach() });
    },
    /** 穿装备（记账）：客户端在发请求**之前**就把自己那份换好了（index.js:65370 附近），服务器只负责记账。
     *  不记账的话重进游戏时 `PlayerEquip` / `equipments` 会回放成旧的 → 装备白穿。
     *
     *  ⚠ 动作名坑（2026-10-22 修）：客户端真正发的是 **`User.equipWeapon`**
     *  （index.js:59592 `PUT_ON_EQUIPMENT: "User.equipWeapon"`），不是 `User.PutOnEquipment`。
     *  以前只实现后者 → 玩家每次穿装备都落到 UNKNOWN、根本没有记账（丢过一把 2302）。
     *  现在两个名字都指向同一段逻辑；应答消费端只认 `eRet==1`（index.js:65015-65020）。 */
    PutOnEquipment: function (p) { return applyPutOn(p, 'PutOnEquipment'); },
    equipWeapon: function (p) { return applyPutOn(p, 'equipWeapon'); },
    /** 卸下全部装备：请求只有 {hp,hplmt,mp}（不带槽位），客户端成功后自己清空 <8 的槽。
     *  index.jsc:92801-92804 */
    UnloadingEuipment: function () {
      var s = ensureLedger(loadSave());
      var cleared = [];
      for (var k in s.equipments) {
        if (!s.equipments.hasOwnProperty(k)) continue;
        if ((parseInt(k, 10) || 0) < 8) { delete s.equipments[k]; cleared.push(k); }
      }
      persist();
      env.log('UnloadingEuipment 清空槽 ' + cleared.join(',') + ' 当前=' + JSON.stringify(s.equipments));
      return shaped('UnloadingEuipment', { equipments: clone(s.equipments) }) || ack('UnloadingEuipment', { achievement: ach() });
    },
    /** 维护用（游戏协议里没有这个动作，只能从命令通道打进来）：把客户端当前持有物灌进账本 */
    bzSeedBag: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      backupBeforeMaint('bzSeedBag');
      var bag = p.itemObj || {};
      var n = 0;
      for (var k in bag) {
        if (!bag.hasOwnProperty(k)) continue;
        var v = parseInt(bag[k], 10) || 0;
        if (v > 0) { s.bag[k] = v; n++; }
      }
      if (p.playerEquip && typeof p.playerEquip === 'object') s.playerEquip = clone(p.playerEquip);
      persist();
      env.log('bzSeedBag 灌入 ' + n + ' 种物品；装备 ' + Object.keys(s.playerEquip).length + ' 件');
      return wrapped('bzSeedBag', { eRet: 1, items: n, bag: clone(s.bag) }, { achievement: ach() });
    },
    /** 维护用：把已完成任务里"当时没发出去"的奖励补发一次（奖励表接上之前完成的那些）。
     *  只认游戏原始配置表里的奖励，不凭空造；已在 rewarded 里的跳过，所以可重复调用。 */
    bzBackfillRewards: function () {
      var s = ensureLedger(loadSave());
      backupBeforeMaint('bzBackfillRewards');
      if (!s.rewarded) s.rewarded = [];
      var granted = [];
      var done = s.done || [];
      for (var i = 0; i < done.length; i++) {
        var id = done[i];
        if (s.rewarded.indexOf(id) >= 0) continue;
        var meta = taskMeta(id);
        if (!meta || !meta.r) { s.rewarded.push(id); continue; }
        var got = {};
        for (var rk in meta.r) {
          if (!meta.r.hasOwnProperty(rk)) continue;
          var cnt = parseInt(meta.r[rk], 10) || 0;
          if (cnt <= 0) continue;
          grantItem(s, rk, cnt);
          got[rk] = cnt;
        }
        s.rewarded.push(id);
        granted.push({ task: id, items: got });
      }
      persist();
      env.log('bzBackfillRewards 补发 ' + granted.length + ' 个任务');
      return wrapped('bzBackfillRewards', { eRet: 1, granted: granted, bag: clone(s.bag) }, { achievement: ach() });
    },
    /** 维护用：定点修补存档（{set:{potential:99999}, del:{skills:["0"]}}）。只从命令通道打进来，
     *  游戏协议里没有这个动作。用于误写后的修复，不参与任何玩法。 */
    /** 维护用（游戏协议里没有，只能从命令通道打）：增减**货币**账本。
     *  用户 2026-10-22 裁定：金条/元宝可以做（有些道具与武学只能拿付费货币买，玩家要能体验），
     *  但**不做任何真实付费渠道** —— 所以这里只动我方离线账，不涉及任何订单/支付回调。
     *  p = { gold:+N, yuanbao:+N, coins:+N }（负数=扣，下限 0）。 */
    bzGrantCur: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      backupBeforeMaint('bzGrantCur');
      var applied = [];
      var fields = { gold: 1, yuanbao: 1, coins: 1, contribution: 1 };
      for (var k in fields) {
        if (!p.hasOwnProperty(k)) continue;
        var d = parseInt(p[k], 10) || 0;
        if (!d) continue;
        if (typeof s[k] !== 'number') s[k] = (k === 'yuanbao' || k === 'contribution') ? 0 : 99999;
        s[k] = Math.max(0, s[k] + d);
        applied.push(k + ' ' + (d > 0 ? '+' : '') + d + ' → ' + s[k]);
      }
      persist();
      env.log('bzGrantCur ' + applied.join('; '));
      pushEco(s);
      return wrapped('bzGrantCur', { eRet: 1, applied: applied, gold: s.gold, yuanbao: s.yuanbao, coins: s.coins, contribution: s.contribution }, { achievement: ach() });
    },
    bzPatch: function (p) {
      p = p || {};
      var s = loadSave();
      backupBeforeMaint('bzPatch');
      var sets = p.set || {}, dels = p.del || {};
      var done = [];
      for (var k in sets) {
        if (!sets.hasOwnProperty(k)) continue;
        s[k] = sets[k];
        done.push('set ' + k);
      }
      for (var dk in dels) {
        if (!dels.hasOwnProperty(dk)) continue;
        var arr = dels[dk];
        if (!s[dk] || typeof s[dk] !== 'object') continue;
        for (var i = 0; i < arr.length; i++) { delete s[dk][arr[i]]; done.push('del ' + dk + '[' + arr[i] + ']'); }
      }
      // delTop：删**顶层**键（2026-10-22 补 —— `set` 只写顶层，写错一次就会在存档里留下垃圾键，
      // 例如把 `{set:{"3003":20}}` 当成改背包，结果 `bag.3003` 没变、顶层多出 "3003"。当时无手段清掉它）
      var delTop = p.delTop || [];
      for (var ti = 0; ti < delTop.length; ti++) {
        var tk = String(delTop[ti]);
        if (tk === 'roleID' || tk === 'saveVersion' || tk === 'bag' || tk === 'playerEquip' || tk === 'equipments') continue;  // 禁止删结构键
        if (hasOwn(s, tk)) { delete s[tk]; done.push('delTop ' + tk); }
      }
      var wrote = persist();
      env.log('bzPatch ' + done.join('; ') + (wrote ? '' : '  ← 写档被守卫拒绝（见上一行原因），仅内存生效'));
      return wrapped('bzPatch', { eRet: 1, applied: done }, { achievement: ach() });
    },
  };

  /** 账本联动字段：这些答案必须来自玩家自己的存档，不能抄抓包里的旧数字
   *  （抓包快照里 userGold=20，照抄会让客户端以为玩家只有 20 两，买东西弹"银两不足"） */
  var LEDGER_FIELDS = { userGold: 'gold', curGold: 'gold', potential: 'potential' };

  /** 查形状表（tools/gen_shapes.js 生成，按客户端源码里真正会读的字段给形状）
   *  返回 null 表示这张表里没有这个动作 → 继续走通用 ACK */
  function shaped(doName, over) {
    var tbl = (typeof BZ_SHAPES !== 'undefined') ? BZ_SHAPES : null;
    if (!tbl || !tbl[doName]) return null;
    var payload = clone(tbl[doName]);
    var s = loadSave();
    for (var k in LEDGER_FIELDS) {
      if (!LEDGER_FIELDS.hasOwnProperty(k)) continue;
      if (!payload.hasOwnProperty(k)) continue;
      var v = s[LEDGER_FIELDS[k]];
      // 账本没记过这个字段时，必须与 LoadGame 里给客户端的值保持一致（都按"资源给足"处理），
      // 否则会出现「进游戏显示 99999、买东西却说只有 20」的矛盾
      payload[k] = (typeof v === 'number') ? v : 99999;
    }
    if (over) for (var o in over) if (over.hasOwnProperty(o)) payload[o] = over[o];
    return wrapped(doName, payload, { achievement: ach() });
  }

  /** 允许"0 是合法值"的开关字段白名单（SOTA R13 §1 第 1 条）。
   *
   *  `noteBadSwitches` 的通用规则是"开关字段缺席或值合法（非 0/''/false/[]）"，因为绝大多数开关
   *  用的是 `hasOwnProperty` + 真值判断。但 `BeginTraining.isCollective` 恰好相反：
   *  `index.js:120523` 写的是 `if (n.hasOwnProperty("isCollective")) if (0 == n.isCollective) …`
   *  ——**0 本身就是一个语义分支**（关门派练功界面 / 开普通练功 UI），不是"未填"。
   *  所以在这里逐字段豁免，否则每次个人练功都会刷一条假的"开关字段值不合法"。
   *
   *  ⚠ 棘轮：这张表只许减不许增；新增项必须带 `bundle:line` 证据，且要在
   *  `tools\check_reject_codes.js` 的 SWITCH_ZERO 段与回归 `test\r13-reject-codes.js` 里各有一条断言。 */
  var SWITCH_ZERO_OK = {
    BeginTraining: { isCollective: 'index.js:120523' },
  };

  /** R06 第 5 条：开关字段"要么缺席，要么值合法"。**只记录、不删** —— 理由见 HANDOVER §23：
   *  分类器对"经过事件派发 / 再转手一层"的字段仍是盲区（`getChangeShop.shopObj` 被判成开关，
   *  而客户端其实按 key 遍历它），一刀切删掉会让客户端读不到 → 比"发了个 0"更糟。
   *  真正的不合法实例改在各自 handler 里修（`test/r06-medicine-scholar.js` 里有断言兜着）。 */
  function noteBadSwitches(action, res) {
    var tbl = (typeof BZ_SHAPES !== 'undefined') ? BZ_SHAPES : null;
    if (!tbl || !tbl.__switch || !tbl.__switch[action] || !res) return res;
    var inner = res['User.' + action];
    if (!inner || typeof inner !== 'object' || Array.isArray(inner)) return res;
    var zeroOk = SWITCH_ZERO_OK[action] || null;
    var sw = tbl.__switch[action];
    for (var k in sw) {
      if (!sw.hasOwnProperty(k) || sw[k] !== 'switch') continue;
      if (!Object.prototype.hasOwnProperty.call(inner, k)) continue;
      if (zeroOk && zeroOk[k] && inner[k] === 0) continue;   // 0 是合法语义值（见 SWITCH_ZERO_OK）
      var v = inner[k];
      var legal = (v !== null && v !== undefined && v !== 0 && v !== '' && v !== false)
        && !(Object.prototype.toString.call(v) === '[object Array]' && v.length === 0);
      if (!legal) env.log('⚠ 开关字段值不合法（客户端会走错分支）' + action + '.' + k + '=' + JSON.stringify(v));
    }
    return res;
  }

  /** 给手写 handler 的应答"补齐"形状表里的字段（只补缺，不覆盖 handler 自己算的值）
   *  理由：handler 是人写的，容易漏掉客户端其实会读的字段；形状表是照客户端源码抽出来的，
   *  两处一旦不一致，客户端就在读取处抛异常。这里让形状表当"最低契约"。
   *
   *  R05 Q1：**必须能说清每个字段是谁给的**。原来"形状字段必须在应答里"这条自检形同虚设——
   *  它检查的其实是 fillShape 自己的产出（先 handler 后 fillShape），永远为绿（F1 就是这么被掩盖的）。
   *  现在这里把"这次 dispatch 里被 fill 补出来的字段"记进 `_lastFill`，自检据此断言
   *  「补出来的字段不许是开关字段」——provenance 断言，不再自己验自己。 */
  var _lastFill = { action: null, keys: [] };
  function fillShape(action, res) {
    _lastFill = { action: action, keys: [] };
    var tbl = (typeof BZ_SHAPES !== 'undefined') ? BZ_SHAPES : null;
    if (!tbl || !tbl[action] || !res) return res;
    var inner = res['User.' + action];
    if (!inner || typeof inner !== 'object' || Array.isArray(inner)) return res;
    for (var k in tbl[action]) {
      if (!tbl[action].hasOwnProperty(k) || k === '__meta') continue;
      if (!Object.prototype.hasOwnProperty.call(inner, k)) {
        inner[k] = clone(tbl[action][k]);
        _lastFill.keys.push(k);
      }
    }
    return res;
  }

  /** 支付类动作：项目边界上明确不实现（不分发、不伪造任何付费/订单）。
   *  这里必须让客户端看到"失败"，绝不能回 eRet:1 装成充值成功。 */
  var PAY_ACTION_RE = /(Pay|pay|Order|Recharge|IAP|Jetton)/;

  /** 取证用：这几个动作的**请求参数**必须记下来（B01 任务进度建模的全部前提）。
   *  背景：客户端不上报击杀计数，我们只能从"开战/结算"请求里推断，所以要先看清参数长什么样。
   *  见 docs/sota/B01-A04/adopted.md 的下一步 1。 */
  var LOG_REQ_RE = /^(ReqSelfBattleInfo|CheckBattleResult|acceptTask|getFinishTaskAward|killNpc|collect|obtainCrop)$/;

  function dispatch(mod, action, p) {
    p = p || {};
    noteAction(action);
    _currentAction = action;      // 写前语义守卫要知道是谁在改档
    // 饥饿上限学习（R05 F2）：挂机结算族请求会带 `hglmt`（客户端按属性算的真上限，
    // index.js:24729 END_PLAY_GAME / 56272 CHECK_BREAK / 56707 END_DOUBLE_TRAINING）。
    // 只记内存，下一次 persist 落进 save.hungerMax。
    if (p.hglmt !== undefined && p.hglmt !== null) {
      var hm = parseInt(p.hglmt, 10) || 0;
      if (hm > 0 && hm <= HG_MAX_SANE && hm !== _hungerMax) {
        _hungerMax = hm;
        env.log('hungerMax 学到 ' + hm + '（来自 ' + action + ' 的 hglmt）');
      }
    }
    if (LOG_REQ_RE.test(action)) {
      var reqp;
      try { reqp = JSON.stringify(p); } catch (e0) { reqp = '?'; }
      if (reqp && reqp.length > 400) reqp = reqp.slice(0, 400) + '…';
      env.log('REQ ' + action + ' p=' + reqp);
    }
    if (PAY_ACTION_RE.test(action)) {
      // 一次也不放行：不记账、不发货币、不产生订单
      env.log('PAY_BLOCKED ' + mod + '.' + action + ' p=' + JSON.stringify(p).slice(0, 120));
      var blocked = shaped(action) || wrapped(action, { eRet: 4, note: {} }, { achievement: ach() });
      var bi = blocked['User.' + action];
      if (bi && typeof bi === 'object') bi.eRet = 4;   // 4 = 客户端"不可用/失败"分支
      return blocked;
    }
    var h = H[action];
    env.log('dispatch User.' + action);
    if (h) {
      var before = snapshotLedger();
      try {
        var r = noteBadSwitches(action, h(p));
        r = fillShape(action, r);
        r = narrowReject(action, r);              // 拒绝应答收窄（R14 §1 第 1 条）
        try { observeLedger(action, before, r); } catch (e0) {}   // 守卫绝不污染应答
        return r;
      }
      catch (e) {
        // SOTA R14 §1 第 6 条 + R15 §1 第 1/2 条：**异常绝不能变成"成功"，也不能回错码**。
        //   ① 计数（R5c 的探测器）；② 丢掉内存缓存 → 下一次 loadSave() 从盘上重读；
        //   ③ 把权威账本**重推给活客户端**（handler 可能已经走过 RoleBaseInfo 那条第二出口）；
        //   ④ 回该动作**推导出的 catchCode**（推导不出就不回 eRet，绝不默认 4）。
        _catchCount++;
        env.log('处理异常 ' + action + ': ' + e);
        _save = null;
        noteReject(action, 'handlerThrew', String(e).slice(0, 160));
        var reloaded = null;
        try { reloaded = loadSave(); } catch (e2) { reloaded = null; }
        repushLive(reloaded);
        var errCode = catchCodeOf(action);
        if (errCode === undefined) {
          env.log('⚠ catchNoCode ' + action + '（该动作没有登记 catchCode → 不回 eRet，避免让客户端走进错误分支）');
          // ⚠ fillShape 会把形状默认值补进来（含 `eRet:1`）→ 那样又变成"看起来成功"，
          //   所以补完之后必须**显式删掉 eRet**（不能让 fillShape 把我们的决定改回去）。
          var noCode = fillShape(action, wrapped(action, {}, { achievement: ach() }));
          var noCodeInner = noCode['User.' + action];
          if (noCodeInner && typeof noCodeInner === 'object') delete noCodeInner.eRet;
          return noCode;
        }
        return narrowReject(action, fillShape(action, wrapped(action, { eRet: errCode }, { achievement: ach() })));
      }
    }
    // 未手写 handler 的动作：先查形状表，照客户端真会读的字段回（不再只回一句 ACK）
    var sp = shaped(action);
    if (sp) {
      env.log('SHAPED User.' + action + ' p=' + JSON.stringify(p).slice(0, 160));
      return sp;
    }
    // 形状表里也没有：通用成功 ACK（与实测响应同构），保证客户端不卡
    // 但必须大声记录——这条日志就是动作覆盖率待办清单的来源
    env.log('UNKNOWN ' + mod + '.' + action + ' p=' + JSON.stringify(p).slice(0, 240));
    return ack(action, { achievement: ach() });
  }

  /** 信封判定（实测定稿）：入口服 :9898 回 {"MsgData":..}；账号/游戏服回 {"code":200,"MsgData":..}
   *  少了 code 客户端会静默丢弃 —— 因此这里按 URL 而非按动作决定。 */
  function wantsCode(url) {
    var u = String(url || '');
    return u.indexOf('bzgf') >= 0 || u.indexOf('800-server') >= 0 || u.indexOf('900-server') >= 0;
  }

  /** 传输层入口：hex 报文 + URL → { ok, text, action, envelope, ... } */
  function handleRequest(rawBody, url) {
    if (!_codec) return { ok: false, error: 'no-codec', text: '' };
    var plain;
    try {
      plain = _codec.decode(String(rawBody == null ? '' : rawBody).trim());
    } catch (e) {
      env.log('报文解密失败: ' + String(e).slice(0, 80));
      return { ok: false, error: 'decode', text: '' };
    }
    var rpc;
    try { rpc = JSON.parse(plain); } catch (e) { return { ok: false, error: 'json', text: '' }; }
    if (!rpc || !rpc.mod || !rpc.do) return { ok: false, error: 'not-rpc', text: '' };

    var result = dispatch(rpc.mod, rpc.do, rpc.p || {});
    var payload = JSON.stringify(result);
    var withCode = wantsCode(url);
    var envelope = { MsgData: _codec.encode(payload) };
    if (withCode) envelope.code = 200;
    return {
      ok: true,
      action: rpc.mod + '.' + rpc.do,
      envelope: withCode ? 'code' : 'plain',
      payloadBytes: payload.length,
      text: JSON.stringify(envelope),
    };
  }

  /** 清档（保留同一 roleID 语义由调用方决定） */
  function reset() {
    _save = null;
    _readOnly = false;
    _lastGood = null;
    try { env.writeSave(SAVE_KEY, '{}'); } catch (e) {}
    var s = loadSave(); persist();
    return { ok: true, roleID: s.roleID };
  }

  return {
    dispatch: dispatch,
    handleRequest: handleRequest,
    reset: reset,
    loadSave: loadSave,
    ensureRole: ensureRole,
    _internal: {
      handlers: H, SAVE_KEY: SAVE_KEY, wantsCode: wantsCode,
      LATEST_SAVE: LATEST_SAVE, migrateSave: migrateSave, validateSave: validateSave,
      guardSave: guardSave, isReadOnly: function () { return _readOnly; },
      // L4 观察守卫（仅供测试注入：正常游戏流程里由 dispatch 自动调用）
      observeLedger: observeLedger, snapshotLedger: snapshotLedger,
      // R05 Q1 来源断言：最近一次 fillShape 补出来的字段（自检用，别在业务里用）
      lastFill: function () { return { action: _lastFill.action, keys: _lastFill.keys.slice() }; },
      // R14 §4 的 R5c 探测器：handler 抛异常次数（只许在"故意撞异常"的测试里增加）
      catchCount: catchCount,
      // 拒绝码表（构建期与 tools\facts\reject-codes.json 双向比对用）
      rejectCodes: REJECT_CODES, rejectAllow: REJECT_ALLOW,
      rejectStats: function () { return cloneJson(_rejectStats) || {}; },
      consumeStats: function () { return cloneJson(_consumeStats) || {}; },
      catchCodeOf: catchCodeOf,
      rejectUnmodeledItems: REJECT_UNMODELED_ITEMS,
    },
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { createBzServer: createBzServer };
