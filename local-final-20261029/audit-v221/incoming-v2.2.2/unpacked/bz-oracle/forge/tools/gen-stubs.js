#!/usr/bin/env node
// 为"客户端会发、但我方未实现"的动作生成兜底应答表 stubs.json（设备端分发器在找不到 handler 时查它）。
// node forge/tools/gen-stubs.js --m1 M1.tsv --contracts out/contracts.json [--implemented ...] [--policy heuristic|minimal] --out out/stubs.json
'use strict';
const { args, writeJSON } = require('../../host/lib/util');
const { stubBody } = require('../lib/stub');
const { build } = require('./registry');
const a = args(process.argv.slice(2));
const reg = build(a);
const contracts = require('path').resolve(a.contracts);
const C = require(contracts);
const STUBBABLE = new Set(['GEN-READY', 'NEEDS-S2', 'NO-CONTRACT', 'RULE', 'CAPTURE', 'OUT']);
const out = { _说明: '兜底应答（STUB）：不写存档、不发 note、开关字段不发；付费回 eRet:4。报告里一律计为 STUB，不计入"已还原"。', policy: a.policy || 'minimal', stubs: {} };
const stat = {};
for (const r of reg.rows) {
  if (!STUBBABLE.has(r.status)) continue;
  const s = stubBody(r.action, C, { policy: out.policy });
  if (s.unsafe) { (out.unsafe = out.unsafe || []).push(r.action); stat.UNSAFE = (stat.UNSAFE || 0) + 1; continue; }
  if (s.guessed && s.guessed.length) stat.guessedFields = (stat.guessedFields || 0) + s.guessed.length;
  out.stubs[r.action] = s.body;
  const k = r.status + '/' + s.why; stat[k] = (stat[k] || 0) + 1;
}
writeJSON(a.out || 'out/stubs.json', out);
console.log(JSON.stringify({ stubs: Object.keys(out.stubs).length, byReason: stat }));
