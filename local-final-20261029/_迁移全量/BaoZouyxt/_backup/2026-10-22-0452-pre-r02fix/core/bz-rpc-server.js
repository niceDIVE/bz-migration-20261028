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

  function hasOwn(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function num(v, d) { return (typeof v === 'number' && !isNaN(v)) ? v : d; }
  function cloneJson(o) { try { return JSON.parse(JSON.stringify(o)); } catch (e) { return null; } }
  function sumBag(bag) { var t = 0, k; for (k in bag) if (hasOwn(bag, k)) t += num(bag[k], 0); return t; }

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

  function loadSave() {
    if (_save) return _save;
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
      r.serverTime = env.now();
      if (p.baseValueAy) {
        r.baseValueAy = p.baseValueAy;
        s.name = String(p.baseValueAy[1] || '少侠');
      }
      if (p.userName) s.name = String(p.userName);
      r.roleID = s.roleID;
      s.baseValueAy = normalizeBaseValueAy(r.baseValueAy);
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
      // 关掉新手引导：客户端读 closeGuide 就置 GuideMgr.closeGuideState（index.jsc:107269）
      base.closeGuide = true;
      var now = env.now();
      base.serverTime = now;
      if (!base.OnhookObj) base.OnhookObj = {};
      if (!base.OnhookObj.serverTime) base.OnhookObj.serverTime = now;
      base.OnhookObj.curGold = goldVal;
      base.OnhookObj.curJetton = (typeof s.chip === 'number') ? s.chip : 0;
      if (!base.skillMap) base.skillMap = {};
      if (base.cycleLifeRetains === undefined) base.cycleLifeRetains = 0;
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
      return wrapped('acceptTask', { eRet: 1, note: {}, taskID: id }, { achievement: ach() });
    },
    /** 交任务：发奖励入账本；**不扣 SpRequire**（C=0，理由见 acceptTask 的注释），同一个任务只发一次 */
    getFinishTaskAward: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var id = p.taskID;
      if (id && s.done.indexOf(id) < 0) s.done.push(id);
      if (!s.rewarded) s.rewarded = [];
      var meta = taskMeta(id);
      var rewardArr = {};
      var firstTime = !!id && s.rewarded.indexOf(id) < 0;
      if (meta && firstTime) {
        if (meta.r) {
          for (var rk in meta.r) {
            if (!meta.r.hasOwnProperty(rk)) continue;
            var cnt = parseInt(meta.r[rk], 10) || 0;
            if (cnt <= 0) continue;
            grantItem(s, rk, cnt);
            rewardArr[rk] = cnt;
          }
        }
        s.rewarded.push(id);
        env.log('getFinishTaskAward ' + id + ' 发奖 ' + JSON.stringify(rewardArr));
      }
      persist();
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
     *  应答消费端只读 eRet / returnPro（index.jsc:119842-119845），所以权威值靠 pushSkillToClient 推回模型。 */
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
        return wrapped('upgradeSkill', { eRet: 1, note: { eco: { potential: pot }, skch: {} }, returnPro: 0, potential: pot }, { achievement: ach() });
      }

      if (gained <= 0) {
        // 取消 / 重复请求：等级与潜能不动，但**进度必须存下来**。
        // 端上实测：{"skillArr":[5,6,1]} = 目标=当前、进度 6（面板上的 (80%)）——
        // 旧实现这里直接返回、什么都不写，于是"练到 80% 一点取消，进度全丢，重进回到 0%"。
        var keptPgr = Math.max(0, reqPgr);
        var keptBrlv = reqBrlv || 1;
        s.skills[id] = [curLv, keptPgr, keptBrlv];
        persist();
        pushSkillToClient(id, curLv, pot, keptPgr, keptBrlv);
        var kept = { eco: { potential: pot }, skch: {} };
        kept.skch[id] = [curLv, keptPgr, keptBrlv];   // 客户端 119831-119834：setSkill/setUpgrdPgr/setBrLv
        env.log('upgradeSkill ' + id + ' 等级不变（目标 ' + (reqLv || '-') + ' ≤ 当前 ' + curLv + '）进度已存 pgr=' + keptPgr + ' brlv=' + keptBrlv + ' p=' + reqRaw);
        return wrapped('upgradeSkill', { eRet: 1, note: kept, returnPro: 0, potential: pot }, { achievement: ach() });
      }

      s.skills[id] = [lv, reqPgr, reqBrlv || 1];
      s.potential = Math.max(0, pot - 100 * gained);
      persist();
      pushSkillToClient(id, lv, s.potential, reqPgr, reqBrlv || 1);
      var note = { eco: { potential: s.potential }, skch: {} };
      note.skch[id] = [lv, reqPgr, reqBrlv || 1];
      env.log('upgradeSkill ' + id + ' Lv' + curLv + '→' + lv + '（目标 ' + reqLv + '，+' + gained + ' 级）pgr=' + reqPgr + ' brlv=' + (reqBrlv || 1) + ' 潜能=' + s.potential + ' p=' + reqRaw);
      return wrapped('upgradeSkill', { eRet: 1, note: note, returnPro: 0, potential: s.potential }, { achievement: ach() });
    },

    /** 战斗 */
    ReqSelfBattleInfo: function () {
      var s = loadSave();
      var r = clone(TPL.reqSelfBattleInfo);
      var inner = r['User.ReqSelfBattleInfo'];
      if (inner && s.baseValueAy) inner.baseValueAy = s.baseValueAy;
      return r;
    },
    CheckBattleResult: function () { return clone(TPL.checkBattleResult); },

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

    /** 144100：读 eRet/armStrong/shenFa/bone/understanding/bloodArr/maxWuxin/fosterArr */
    WashMedicine: function (p) {
      p = p || {};
      return wrapped('WashMedicine', {
        eRet: 1,
        armStrong: p.armStrong || 0, shenFa: p.shenFa || 0,
        bone: p.bone || 0, understanding: p.understanding || 0,
        bloodArr: [], maxWuxin: 0, fosterArr: p.fosterArr || [],
      }, { achievement: ach() });
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
      var left = bagAdd(s, p.itemID, -use);
      persist();
      if (use < n) env.log('useItem ' + p.itemID + ' 截断：请求 x' + n + '，真实库存只有 ' + have + '（叠加量不可消耗）');
      env.log('useItem ' + p.itemID + ' x' + use + ' → 余 ' + left);
      return shaped('useItem', { itemID: p.itemID }) || ack('useItem', { achievement: ach() });
    },
    /** 出售：请求 {saleArr:[...]}，元素可能是裸 id 或 {itemID,num}；同样只卖真实库存 */
    saleItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var arr = p.saleArr || [];
      var sold = [];
      for (var i = 0; i < arr.length; i++) {
        var e = arr[i];
        var isObj = e && typeof e === 'object';
        var id = isObj ? (e.itemID || e.id) : e;
        var cnt = Math.abs(parseInt(isObj ? (e.num || e.itemNum || 1) : 1, 10) || 1);
        var have = parseInt(s.bag[id], 10) || 0;
        if (cnt > have) { env.log('saleItem ' + id + ' 截断：请求 x' + cnt + '，真实库存只有 ' + have); cnt = have; }
        bagAdd(s, id, -cnt);
        sold.push(id);
      }
      persist();
      env.log('saleItem ' + sold.join(','));
      return shaped('saleItem') || ack('saleItem', { achievement: ach() });
    },
    /** 买店货：请求 {itemID,itemNum} → 入账本 */
    buyShopItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var n = Math.abs(parseInt(p.itemNum, 10) || 1);
      var left = bagAdd(s, p.itemID, n);
      persist();
      env.log('buyShopItem ' + p.itemID + ' x' + n + ' → 余 ' + left);
      return shaped('buyShopItem', { itemID: p.itemID }) || ack('buyShopItem', { achievement: ach() });
    },
    /** 快速购买（货币直购） */
    QuickBuyItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var n = Math.abs(parseInt(p.itemNum, 10) || 1);
      var bagLeft = bagAdd(s, p.itemID, n);
      persist();
      env.log('QuickBuyItem ' + p.itemID + ' x' + n + ' → 余 ' + bagLeft);
      return shaped('QuickBuyItem', { itemID: p.itemID, itemNum: n }) || ack('QuickBuyItem', { achievement: ach() });
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
    /** 穿装备：客户端在发请求**之前**就把自己那份换好了（index.jsc:65369），服务器只负责记账。
     *  不记账的话重进游戏时 `PlayerEquip` / `equipments` 会回放成旧的 → 装备白穿。 */
    PutOnEquipment: function (p) {
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
      }
      persist();
      env.log('PutOnEquipment 槽' + slot + ' → ' + uid + ' 当前=' + JSON.stringify(s.equipments));
      return shaped('PutOnEquipment', { equipments: clone(s.equipments) }) || ack('PutOnEquipment', { achievement: ach() });
    },
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
      var wrote = persist();
      env.log('bzPatch ' + done.join('; ') + (wrote ? '' : '  ← 写档被守卫拒绝（见上一行原因），仅内存生效'));
      return wrapped('bzPatch', { eRet: 1, applied: done }, { achievement: ach() });
    },
  };

  /** 账本联动字段：这些答案必须来自玩家自己的存档，不能抄抓包里的旧数字
   *  （抓包快照里 userGold=20，照抄会让客户端以为玩家只有 20 两，买东西弹"银两不足"） */
  var LEDGER_FIELDS = { userGold: 'coins', curGold: 'coins', potential: 'potential' };

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

  /** 给手写 handler 的应答"补齐"形状表里的字段（只补缺，不覆盖 handler 自己算的值）
   *  理由：handler 是人写的，容易漏掉客户端其实会读的字段；形状表是照客户端源码抽出来的，
   *  两处一旦不一致，客户端就在读取处抛异常。这里让形状表当"最低契约"。 */
  function fillShape(action, res) {
    var tbl = (typeof BZ_SHAPES !== 'undefined') ? BZ_SHAPES : null;
    if (!tbl || !tbl[action] || !res) return res;
    var inner = res['User.' + action];
    if (!inner || typeof inner !== 'object' || Array.isArray(inner)) return res;
    for (var k in tbl[action]) {
      if (!tbl[action].hasOwnProperty(k) || k === '__meta') continue;
      if (!Object.prototype.hasOwnProperty.call(inner, k)) inner[k] = clone(tbl[action][k]);
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
    _currentAction = action;      // 写前语义守卫要知道是谁在改档
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
      try { return fillShape(action, h(p)); }
      catch (e) { env.log('处理异常 ' + action + ': ' + e); return fillShape(action, ack(action)); }
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
    },
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { createBzServer: createBzServer };
