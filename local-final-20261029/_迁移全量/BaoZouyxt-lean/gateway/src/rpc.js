'use strict';
/**
 * RpcDispatcher —— mod/do/p 业务分发（依据 COMMUNICATION.md Round 6 的接口清单）
 *
 * 原则：
 *  - 已实现接口给出仿真应答；未实现接口一律回通用 ACK（{ok:true, unimplemented}），
 *    保证客户端不因等待而卡死 —— 先跑通闭环，再逐个接口加真实度。
 *  - 数值公式（打坐收益等）当前为占位实现，标注 TODO，待与客户端实机数值对撞后校准。
 */

const { SandboxStorage } = require('./store');

class RpcDispatcher {
  constructor(storage) {
    this.storage = storage;
    this.handlers = {
      'User.quicklogin': this.onQuickLogin,
      'User.saveRole': this.onSaveRole,
      'User.killNpc': this.onKillNpc,
      'User.getDaily': this.onGetDaily,
      'User.dazuo': this.onDazuo,
    };
  }

  dispatch(mod, action, p) {
    const key = `${mod}.${action}`;
    const h = this.handlers[key];
    if (h) return h.call(this, p || {});
    this.storage.logEvent('unimplemented', { key, p });
    return { ok: true, unimplemented: key };
  }

  /** 登录：返回角色全量快照 */
  onQuickLogin(p) {
    const roleId = Number(p.roleID) || 1;
    const role = this.storage.getRole(roleId);
    this.storage.logEvent('quicklogin', { roleId });
    return { ok: true, role, serverTime: Date.now() };
  }

  /**
   * 存档：客户端周期性全量同步。快照字段全集未知 → 浅合并全收。
   * 防回拨：inGameTime 只允许前进（长任务检查点也依赖单调时间）。
   */
  onSaveRole(p) {
    const roleId = Number(p.roleID) || 1;
    const cur = this.storage.getRole(roleId);
    const incoming = p.role && typeof p.role === 'object' ? p.role : p;
    const merged = { ...cur, ...incoming, roleID: roleId };
    if (Number(merged.inGameTime) < Number(cur.inGameTime)) {
      merged.inGameTime = cur.inGameTime; // 时间回拨防御
      this.storage.logEvent('time-rollback-blocked', { roleId });
    }
    this.storage.saveRole(roleId, merged);
    return { ok: true, savedAt: Date.now() };
  }

  /** 击杀 NPC：先记事件与善恶计数，掉落表待资产 JSON 提取后接入 */
  onKillNpc(p) {
    const roleId = Number(p.roleID) || 1;
    const role = this.storage.getRole(roleId);
    const npcId = p.npcId ?? p.npcID ?? null;
    role.npcFlags = role.npcFlags || {};
    const flag = role.npcFlags[npcId] || { kills: 0, good: 0, evil: 0 };
    flag.kills += 1;
    // TODO 数值校准：善恶增量与掉落需对照 4 万 JSON 资产中的 NPC 配置
    flag.good += Number(p.goodDelta ?? 0);
    flag.evil += Number(p.evilDelta ?? 1);
    role.npcFlags[npcId] = flag;
    this.storage.saveRole(roleId, role);
    this.storage.logEvent('killNpc', { roleId, npcId });
    return { ok: true, npcId, drops: [], reputation: { good: flag.good, evil: flag.evil } };
  }

  /** 日常/告示牌：占位空列表 */
  onGetDaily(p) {
    return { ok: true, dailies: [], serverTime: Date.now() };
  }

  /**
   * 打坐/挂机：按 inGameTime 增量结算潜能。
   * TODO 校准：根骨基底 + 内功/经脉/寒玉床倍率模型（TECH.md §2.2），
   * 当前占位公式 = Δt(秒) × (1 + CON/100) ÷ 10。
   */
  onDazuo(p) {
    const roleId = Number(p.roleID) || 1;
    const role = this.storage.getRole(roleId);
    const newT = Number(p.inGameTime ?? role.inGameTime);
    const dt = Math.max(0, newT - Number(role.inGameTime || 0));
    const con = (role.attrs && role.attrs.CON) || 10;
    const gain = Math.floor((dt * (1 + con / 100)) / 10);
    role.inGameTime = Math.max(Number(role.inGameTime || 0), newT);
    role.potential = Number(role.potential || 0) + gain;
    this.storage.saveRole(roleId, role);
    return { ok: true, deltaSeconds: dt, potentialGain: gain, potential: role.potential };
  }
}

module.exports = { RpcDispatcher };
