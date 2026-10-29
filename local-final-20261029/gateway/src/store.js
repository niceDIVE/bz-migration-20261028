'use strict';
/**
 * SandboxStorage —— 本地零污染存档（Node 24 内置 node:sqlite，无原生编译依赖）
 * 快照采用「关键字段列 + 全量 JSON」双轨：列便于 GM 检索，JSON 保证客户端
 * 下发的任意字段不丢失（协议字段全集未知，先全收）。
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

class SandboxStorage {
  constructor(dbPath) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.dbPath = dbPath;
    this.db = new DatabaseSync(dbPath);
    this._migrate();
  }

  _migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS roles (
        role_id    INTEGER PRIMARY KEY,
        name       TEXT,
        level      INTEGER,
        silver     INTEGER,
        potential  INTEGER,
        in_game_time REAL,
        snapshot   TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS events (
        id    INTEGER PRIMARY KEY AUTOINCREMENT,
        ts    TEXT NOT NULL,
        type  TEXT NOT NULL,
        detail TEXT
      );
    `);
  }

  /** 无存档时构造默认角色（字段名对齐 COMMUNICATION.md Round 6 的报文契约） */
  defaultRole(roleId = 1) {
    return {
      roleID: roleId,
      name: '少侠',
      level: 1,
      attrs: { STR: 10, AGI: 10, INT: 10, CON: 10 }, // 臂力/身法/悟性/根骨
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

  getRole(roleId = 1) {
    const row = this.db.prepare('SELECT snapshot FROM roles WHERE role_id = ?').get(roleId);
    if (row) return JSON.parse(row.snapshot);
    const role = this.defaultRole(roleId);
    this.saveRole(roleId, role);
    return role;
  }

  saveRole(roleId, snapshot) {
    const s = { ...snapshot, roleID: roleId };
    this.db
      .prepare(
        `INSERT INTO roles (role_id, name, level, silver, potential, in_game_time, snapshot, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(role_id) DO UPDATE SET
           name=excluded.name, level=excluded.level, silver=excluded.silver,
           potential=excluded.potential, in_game_time=excluded.in_game_time,
           snapshot=excluded.snapshot, updated_at=excluded.updated_at`
      )
      .run(
        roleId,
        String(s.name ?? ''),
        Number(s.level ?? 0),
        Number(s.silver ?? 0),
        Number(s.potential ?? 0),
        Number(s.inGameTime ?? 0),
        JSON.stringify(s),
        new Date().toISOString()
      );
    return s;
  }

  logEvent(type, detail) {
    this.db
      .prepare('INSERT INTO events (ts, type, detail) VALUES (?, ?, ?)')
      .run(new Date().toISOString(), type, JSON.stringify(detail ?? null));
  }

  /** GM 面板用：一键改银两/潜能/属性 */
  gmPatch(roleId, patch) {
    const role = this.getRole(roleId);
    const next = { ...role };
    if (patch.silver !== undefined) next.silver = Number(patch.silver) || 0;
    if (patch.potential !== undefined) next.potential = Number(patch.potential) || 0;
    if (patch.level !== undefined) next.level = Number(patch.level) || 1;
    if (patch.attrs) next.attrs = { ...role.attrs, ...patch.attrs };
    return this.saveRole(roleId, next);
  }

  summary() {
    const role = this.getRole(1);
    const { n } = this.db.prepare('SELECT COUNT(*) AS n FROM events').get();
    return { role, eventCount: n };
  }

  close() {
    this.db.close();
  }
}

module.exports = { SandboxStorage };
