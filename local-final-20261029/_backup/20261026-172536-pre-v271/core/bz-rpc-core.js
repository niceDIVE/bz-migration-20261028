'use strict';
/**
 * bz-rpc-core.js —— 进程内离线环回核心（纯 JS，无环境依赖）
 *
 * 从 gateway/src/rpc.js + store.js 平移而来，语义保持一致：
 *   - quicklogin / saveRole / killNpc / getDaily / dazuo 仿真
 *   - inGameTime 单调递增（防回拨）
 *   - 未实现接口回通用 ACK，防客户端卡死
 *
 * 环境适配通过 env 注入（真实环境用 jsb.fileUtils，测试环境用内存）：
 *   env = { readSave(): string|null, writeSave(text), log(msg), now(): number }
 */

function createBzCore(env) {
  var SAVE_KEY = 'bz_offline_save_v1';
  var MAX_EVENT_LOG = 200;

  // ---------- 存档层 ----------
  function defaultRole() {
    return {
      roleID: 1,
      name: '少侠',
      level: 1,
      attrs: { STR: 10, AGI: 10, INT: 10, CON: 10 },
      hp: 100, hpMax: 100,
      mp: 100, mpMax: 100,
      silver: 1000,
      potential: 0,
      zhenyuan: 0,
      inGameTime: 0,
      skills: [],
      items: [],
      npcFlags: {},
    };
  }

  var _save = null; // 内存缓存

  function loadSave() {
    if (_save) return _save;
    try {
      var raw = env.readSave(SAVE_KEY);
      _save = raw ? JSON.parse(raw) : { roles: {}, events: [] };
    } catch (e) {
      env.log('存档读取失败，使用新档: ' + e);
      _save = { roles: {}, events: [] };
    }
    if (!_save.roles) _save.roles = {};
    if (!_save.events) _save.events = [];
    return _save;
  }

  function persist() {
    try {
      // 事件日志封顶，防止存档无限膨胀
      if (_save.events.length > MAX_EVENT_LOG) {
        _save.events = _save.events.slice(-MAX_EVENT_LOG);
      }
      env.writeSave(SAVE_KEY, JSON.stringify(_save));
    } catch (e) {
      env.log('存档写入失败: ' + e);
    }
  }

  function getRole(roleId) {
    var s = loadSave();
    roleId = roleId || 1;
    if (!s.roles[roleId]) s.roles[roleId] = defaultRole();
    return s.roles[roleId];
  }

  function saveRole(roleId, snapshot) {
    var s = loadSave();
    roleId = roleId || 1;
    snapshot.roleID = roleId;
    s.roles[roleId] = snapshot;
    persist();
  }

  function logEvent(type, detail) {
    var s = loadSave();
    s.events.push({ ts: env.now(), type: type, detail: detail === undefined ? null : detail });
  }

  function gmPatch(roleId, patch) {
    var role = getRole(roleId);
    if (patch.silver !== undefined) role.silver = Number(patch.silver) || 0;
    if (patch.potential !== undefined) role.potential = Number(patch.potential) || 0;
    if (patch.level !== undefined) role.level = Number(patch.level) || 1;
    if (patch.attrs) {
      for (var k in patch.attrs) if (patch.attrs.hasOwnProperty(k)) role.attrs[k] = patch.attrs[k];
    }
    saveRole(roleId, role);
    return role;
  }

  // ---------- 业务层 ----------
  var handlers = {
    'User.quicklogin': function (p) {
      var roleId = Number(p.roleID) || 1;
      var role = getRole(roleId);
      logEvent('quicklogin', { roleId: roleId });
      persist();
      return { ok: true, role: role, serverTime: env.now() };
    },

    'User.saveRole': function (p) {
      var roleId = Number(p.roleID) || 1;
      var cur = getRole(roleId);
      // 防回拨基准必须在合并 incoming 之前取样，否则回拨值会污染基准
      var last = cur.__lastInGameTime !== undefined && cur.__lastInGameTime !== null
        ? Number(cur.__lastInGameTime)
        : Number(cur.inGameTime || 0);
      var incoming = p.role && typeof p.role === 'object' ? p.role : p;
      for (var k in incoming) {
        if (incoming.hasOwnProperty(k) && k !== 'roleID') cur[k] = incoming[k];
      }
      if (Number(cur.inGameTime) < last) {
        cur.inGameTime = last;
        logEvent('time-rollback-blocked', { roleId: roleId });
      }
      cur.__lastInGameTime = Number(cur.inGameTime) || 0;
      saveRole(roleId, cur);
      return { ok: true, savedAt: env.now() };
    },

    'User.killNpc': function (p) {
      var roleId = Number(p.roleID) || 1;
      var role = getRole(roleId);
      var npcId = p.npcId !== undefined ? p.npcId : p.npcID;
      role.npcFlags = role.npcFlags || {};
      var flag = role.npcFlags[npcId] || { kills: 0, good: 0, evil: 0 };
      flag.kills += 1;
      // TODO 数值校准：善恶增量与掉落需对照资产 JSON 中的 NPC 配置
      flag.good += Number(p.goodDelta || 0);
      flag.evil += Number(p.evilDelta || 1);
      role.npcFlags[npcId] = flag;
      saveRole(roleId, role);
      logEvent('killNpc', { roleId: roleId, npcId: npcId });
      return { ok: true, npcId: npcId, drops: [], reputation: { good: flag.good, evil: flag.evil } };
    },

    'User.getDaily': function () {
      return { ok: true, dailies: [], serverTime: env.now() };
    },

    'User.dazuo': function (p) {
      var roleId = Number(p.roleID) || 1;
      var role = getRole(roleId);
      var newT = Number(p.inGameTime !== undefined ? p.inGameTime : role.inGameTime);
      var dt = Math.max(0, newT - Number(role.inGameTime || 0));
      var con = (role.attrs && role.attrs.CON) || 10;
      var gain = Math.floor((dt * (1 + con / 100)) / 10);
      role.inGameTime = Math.max(Number(role.inGameTime || 0), newT);
      role.potential = Number(role.potential || 0) + gain;
      saveRole(roleId, role);
      return { ok: true, deltaSeconds: dt, potentialGain: gain, potential: role.potential };
    },
  };

  function dispatch(mod, action, p) {
    p = p || {};
    var key = mod + '.' + action;
    var h = handlers[key];
    if (h) {
      try {
        return h(p);
      } catch (e) {
        env.log('RPC 处理异常 ' + key + ': ' + e);
        return { ok: false, error: String(e) };
      }
    }
    logEvent('unimplemented', { key: key });
    persist();
    return { ok: true, unimplemented: key };
  }

  return {
    dispatch: dispatch,
    getRole: getRole,
    saveRole: saveRole,
    gmPatch: gmPatch,
    loadSave: loadSave,
    defaultRole: defaultRole,
    _internal: { handlers: handlers, SAVE_KEY: SAVE_KEY },
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { createBzCore: createBzCore };
