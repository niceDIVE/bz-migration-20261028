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
 */

function createBzServer(env) {
  var TPL = env.templates || {};
  var SAVE_KEY = 'bz_server_save_v2';
  var _save = null;

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
      s.baseValueAy = r.baseValueAy;
      s.school = p.school || 0;
      persist();
      return r;
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
    upgradeSkill: function (p) {
      var s = loadSave();
      if (p.skillID) s.skills[p.skillID] = (s.skills[p.skillID] || 0) + 1;
      persist();
      var note = { eco: {}, skch: {} };
      if (p.skillID) note.skch[String(p.skillID)] = [1, 0, 0];
      return wrapped('upgradeSkill', { eRet: 1, note: note }, { achievement: ach() });
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
  };

  function dispatch(mod, action, p) {
    p = p || {};
    var h = H[action];
    env.log('dispatch User.' + action);
    if (h) {
      try { return h(p); } catch (e) { env.log('处理异常 ' + action + ': ' + e); return ack(action); }
    }
    // 未实现的动作：通用成功 ACK（与实测响应同构），保证客户端不卡
    return ack(action, { achievement: ach() });
  }

  return { dispatch: dispatch, loadSave: loadSave, _internal: { handlers: H, SAVE_KEY: SAVE_KEY } };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { createBzServer: createBzServer };
