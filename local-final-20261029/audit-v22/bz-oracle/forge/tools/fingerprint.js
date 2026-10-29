#!/usr/bin/env node
// 构建指纹（路线 S0）：给产物打 size/md5/sha8 戳，并核对设备当前跑的是不是这一版。
// stamp：node forge/tools/fingerprint.js stamp --files a.js,b.js --out out/build-stamp.json [--git]
// check：node forge/tools/fingerprint.js check --stamp out/build-stamp.json --device-files <拉回来的同名文件目录> [--ready bz_ready.json]
// 退出码 0 一致；1 不一致（拒绝继续测）；2 用法错误
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { args, writeJSON, readJSON } = require('../../host/lib/util');
const fp = p => { const b = fs.readFileSync(p); return { size: b.length, md5: crypto.createHash('md5').update(b).digest('hex'), sha8: crypto.createHash('sha256').update(b).digest('hex').slice(0, 8) }; };
const a = args(process.argv.slice(2));
const cmd = a._[0];
if (cmd === 'stamp') {
  const files = String(a.files || '').split(',').filter(Boolean);
  const st = { gen: new Date().toISOString(), files: {} };
  for (const f of files) st.files[path.basename(f)] = fp(f);
  st.impl = 'h' + crypto.createHash('sha256').update(JSON.stringify(st.files)).digest('hex').slice(0, 8);
  if (a.git) try { st.git = execSync('git rev-parse --short HEAD && git status --porcelain | wc -l', { encoding: 'utf8' }).trim().split('\n'); } catch (e) { st.git = null; }
  writeJSON(a.out || 'out/build-stamp.json', st);
  console.log(`impl ${st.impl}  ${Object.entries(st.files).map(([k, v]) => `${k} ${v.size}B ${v.md5}`).join('  ')}`);
} else if (cmd === 'check') {
  const st = readJSON(a.stamp);
  if (!st) { console.error('缺 stamp'); process.exit(2); }
  const bad = [];
  for (const [name, want] of Object.entries(st.files)) {
    const p = path.join(a['device-files'] || '.', name);
    if (!fs.existsSync(p)) { bad.push(`${name}：设备上没拉到`); continue; }
    const got = fp(p);
    if (got.md5 !== want.md5) bad.push(`${name}：设备 ${got.size}B ${got.md5} ≠ 仓库 ${want.size}B ${want.md5}`);
  }
  if (a.ready) { const r = readJSON(a.ready, {}); if (r.impl && r.impl !== st.impl) bad.push(`bz_ready.impl=${r.impl} ≠ 构建 ${st.impl}`); }
  if (bad.length) { console.log('✘ 设备构建与仓库不一致，拒绝继续：\n  ' + bad.join('\n  ')); process.exit(1); }
  console.log(`✔ 设备正在运行 ${st.impl}`);
} else { console.error('用法：fingerprint.js stamp|check ...'); process.exit(2); }
