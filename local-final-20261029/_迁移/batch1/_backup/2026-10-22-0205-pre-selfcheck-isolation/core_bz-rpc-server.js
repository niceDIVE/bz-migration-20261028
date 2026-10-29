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
    try {
      var raw = env.readSave(SAVE_KEY);
      _save = raw ? JSON.parse(raw) : {};
    } catch (e) { env.log('存档读取失败: ' + e); _save = {}; }
    if (!_save.roleID) _save.roleID = 16374;             // 模板同款；客户端只作标识用
    if (!_save.accepted) _save.accepted = [];
    if (!_save.done) _save.done = [];
    if (!_save.skills) _save.skills = {};
    return _save;
  }
  function persist() {
    try { env.writeSave(SAVE_KEY, JSON.stringify(_save)); } catch (e) { env.log('存档写入失败: ' + e); }
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
      ensureLedger(s);
      base.itemObj = clone(s.bag);
      base.PlayerEquip = clone(s.playerEquip);
      base.equipments = clone(s.equipments);
      env.log('LoadGame → 快照 ' + (s.name || '?') + ' 任务: 完成=' + tl.finishArr.length + ' 进行中=' + tl.acceptArr.length + ' 物品=' + Object.keys(s.bag).length + ' 种');
      return wrapped('LoadGame', base, { achievement: ach() });
    },
    getCRAInfo: function () { return clone(TPL.getCRAInfo); },
    GetChatAddress: function () { var r = clone(TPL.getChatAddress); r.serverTime = env.now(); return r; },

    /** 接任务：除了记账，还要按 tasknew 的 SpRequire 把"任务要求的物品"补进背包。
     *  否则客户端 judgeItemRequire 永远不通过 → 任务交不掉（实测 100150 卡在需要 4015×1，
     *  而我们从没发过任何物品，因为奖励在上一版是空的）。 */
    acceptTask: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var id = p.taskID;
      if (id && s.accepted.indexOf(id) < 0) s.accepted.push(id);
      var meta = taskMeta(id);
      var granted = [];
      if (meta && meta.n) {
        for (var k in meta.n) {
          if (!meta.n.hasOwnProperty(k)) continue;
          var want = parseInt(meta.n[k], 10) || 0;
          var have = itemTypeOf(k) === 1
            ? (Array.isArray(s.playerEquip[k]) ? (parseInt(s.playerEquip[k][1], 10) || 0) : 0)
            : (parseInt(s.bag[k], 10) || 0);
          if (want > 0 && have < want) { grantItem(s, k, want - have); granted.push(k + 'x' + want); }
        }
      }
      persist();
      if (granted.length) env.log('acceptTask ' + id + ' 补发所需物品 ' + granted.join(','));
      return wrapped('acceptTask', { eRet: 1, note: {}, taskID: id }, { achievement: ach() });
    },
    /** 交任务：发奖励（掉落表展开后的物品）入账本 + 消耗任务所需物品；同一个任务只发一次 */
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
        if (meta.n) {
          for (var nk in meta.n) {
            if (!meta.n.hasOwnProperty(nk)) continue;
            consumeItem(s, nk, parseInt(meta.n[nk], 10) || 0);
          }
        }
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
     *  ⚠️ 2026-10-22 02:30 实测修的两件事：
     *  1) 客户端 reqChangeSkillLv 会把**它自己算出的目标等级**放进 skillArr[1]
     *     （index.jsc:119873-119880）。旧实现直接采信 → 请教界面点"取消"时它算出低等级发上来，
     *     账本等级从 10 掉回 2（用户报的"等级随机给一个"）。现改为**单调不降**：至少 +1，
     *     且高于客户端请求时才用客户端那个值（支持一次跳多级）。
     *  2) 这个动作的应答消费端只读 eRet / returnPro（index.jsc:119842-119845），
     *     既不改客户端技能等级、也不改 RoleBaseInfo.potentials → 面板潜能永远停在 LoadGame 的旧值
     *     （用户报的"潜能回到 99999"）。所以主动把权威值推进客户端模型（window.__require 进程内可达）。 */
    upgradeSkill: function (p) {
      var s = loadSave();
      var id = String((p && p.skillID) || 0);
      var cur = s.skills[id];
      var curLv = Array.isArray(cur) ? (cur[0] || 0) : (cur || 0);
      var reqLv = (p && Array.isArray(p.skillArr) && p.skillArr.length > 1) ? Math.floor(p.skillArr[1]) : 0;
      var reqRaw;
      try { reqRaw = JSON.stringify(p); } catch (e) { reqRaw = '?'; }
      if (reqRaw && reqRaw.length > 300) reqRaw = reqRaw.slice(0, 300) + '…';
      var lv = Math.max(curLv + 1, reqLv || 0);   // 单调：绝不因客户端发低值而回退
      s.skills[id] = [lv, 0, 1];
      var cost = 100;
      var pot = (typeof s.potential === 'number') ? s.potential : 99999;
      s.potential = Math.max(0, pot - cost);
      persist();
      // 把权威值推给客户端模型（失败就算了，绝不能影响应答）
      try {
        var R = (typeof window !== 'undefined') ? window.__require : null;
        if (typeof R === 'function') {
          var B = R('RoleBaseInfo'); B = B && (B.RoleBaseInfo || B);
          if (B) B.potentials = s.potential;
          var ST = R('SkillTable'); ST = ST && (ST.SkillTable || ST);
          if (ST && typeof ST.setSkill === 'function') ST.setSkill(parseInt(id, 10) || 0, lv);
        }
      } catch (e) {}
      var note = { eco: { potential: s.potential }, skch: {} };
      note.skch[id] = [lv, 0, 1];
      env.log('upgradeSkill ' + id + ' → Lv' + lv + '（请求 ' + (reqLv || '-') + '，账本旧值 ' + curLv + '）潜能=' + s.potential + ' p=' + reqRaw);
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

    /** 物品同步：整份替换客户端背包（客户端先 `_itemObj = {}` 再按 itemObj 重建）→ 必须回全部持有物 */
    sycnPlayerItemData: function () {
      var s = ensureLedger(loadSave());
      return wrapped('sycnPlayerItemData', {
        eRet: 1,
        itemObj: clone(s.bag),
        PlayerEquip: clone(s.playerEquip),
      }, { achievement: ach() });
    },
    /** 使用物品：请求 {itemID,itemNum}；应答必须带 note 的五个子表（index.jsc:64757 起直接读 note.skch） */
    useItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var n = Math.abs(parseInt(p.itemNum, 10) || 1);
      var left = bagAdd(s, p.itemID, -n);
      persist();
      env.log('useItem ' + p.itemID + ' x' + n + ' → 余 ' + left);
      return shaped('useItem', { itemID: p.itemID }) || ack('useItem', { achievement: ach() });
    },
    /** 出售：请求 {saleArr:[...]}，元素可能是裸 id 或 {itemID,num} */
    saleItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var arr = p.saleArr || [];
      var sold = [];
      for (var i = 0; i < arr.length; i++) {
        var e = arr[i];
        var isObj = e && typeof e === 'object';
        var id = isObj ? (e.itemID || e.id) : e;
        var num = isObj ? (e.num || e.itemNum || 1) : 1;
        bagAdd(s, id, -Math.abs(parseInt(num, 10) || 1));
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
      persist();
      env.log('bzPatch ' + done.join('; '));
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

  function dispatch(mod, action, p) {
    p = p || {};
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
    _internal: { handlers: H, SAVE_KEY: SAVE_KEY, wantsCode: wantsCode },
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { createBzServer: createBzServer };
