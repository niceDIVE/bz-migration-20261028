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
      base.curGold = 99999; base.userGold = 99999;
      // 关掉新手引导：客户端读 closeGuide 就置 GuideMgr.closeGuideState（index.jsc:107269）
      base.closeGuide = true;
      var now = env.now();
      base.serverTime = now;
      if (!base.OnhookObj) base.OnhookObj = {};
      if (!base.OnhookObj.serverTime) base.OnhookObj.serverTime = now;
      if (!base.skillMap) base.skillMap = {};
      if (base.cycleLifeRetains === undefined) base.cycleLifeRetains = 0;
      env.log('LoadGame → 快照 ' + (s.name || '?') + ' OnhookObj=' + JSON.stringify(base.OnhookObj).slice(0, 80));
      return wrapped('LoadGame', base, { achievement: ach() });
    },
    getCRAInfo: function () { return clone(TPL.getCRAInfo); },
    GetChatAddress: function () { var r = clone(TPL.getChatAddress); r.serverTime = env.now(); return r; },

    /** 任务/成长（包裹结构） */
    acceptTask: function (p) {
      var s = loadSave();
      if (p.taskID && s.accepted.indexOf(p.taskID) < 0) s.accepted.push(p.taskID);
      persist();
      return wrapped('acceptTask', { eRet: 1, note: {}, taskID: p.taskID }, { achievement: ach() });
    },
    getFinishTaskAward: function (p) {
      var s = loadSave();
      if (p.taskID && s.done.indexOf(p.taskID) < 0) s.done.push(p.taskID);
      persist();
      var r = clone(TPL.getFinishTaskAward);
      r.p = 'User.getFinishTaskAward';
      if (r['User.getFinishTaskAward']) r['User.getFinishTaskAward'].taskID = p.taskID;
      return r;
    },
    OpenNovice: function () { return wrapped('OpenNovice', { eRet: 1 }, { achievement: ach() }); },
    joinSchool: function (p) {
      var s = loadSave(); s.school = p.school || s.school; persist();
      return wrapped('joinSchool', { eRet: 1, note: { attrch: {}, skch: {} }, npcID: p.npcID }, { achievement: ach() });
    },
    /** 技能升级：必须记账，否则客户端"回弹"（客户端不自己保存等级，靠 skillMap 回放）
     *  skillMap 格式 { id: [lv, pgr, brlv] }，见 index.jsc:119994 */
    upgradeSkill: function (p) {
      var s = loadSave();
      var id = String((p && p.skillID) || 0);
      var cur = s.skills[id];
      var lv = Array.isArray(cur) ? (cur[0] || 0) : (cur || 0);
      if (p && Array.isArray(p.skillArr) && p.skillArr.length > 1) lv = Math.floor(p.skillArr[1]) || (lv + 1);
      else lv += 1;
      s.skills[id] = [lv, 0, 1];
      var cost = 100;
      var pot = (typeof s.potential === 'number') ? s.potential : 99999;
      s.potential = Math.max(0, pot - cost);
      persist();
      var note = { eco: { potential: s.potential }, skch: {} };
      note.skch[id] = [lv, 0, 1];
      env.log('upgradeSkill ' + id + ' → Lv' + lv + ' 潜能=' + s.potential);
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
    /** 任务同步：整份 finishTaskObj 替换客户端缓存 */
    sycnTask: function () {
      return wrapped('sycnTask', { eRet: 1, PlayerFinishTaskObj: {} }, { achievement: ach() });
    },
  };

  function dispatch(mod, action, p) {
    p = p || {};
    var h = H[action];
    env.log('dispatch User.' + action);
    if (h) {
      try { return h(p); } catch (e) { env.log('处理异常 ' + action + ': ' + e); return ack(action); }
    }
    // 未实现的动作：通用成功 ACK（与实测响应同构），保证客户端不卡
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
