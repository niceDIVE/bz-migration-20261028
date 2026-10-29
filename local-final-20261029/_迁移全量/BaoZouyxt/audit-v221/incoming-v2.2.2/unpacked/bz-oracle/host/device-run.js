#!/usr/bin/env node
// 通过 adb 驱动设备端探针：按计划逐条下命令、等回执、拉回 case。
// node host/device-run.js --plan config/plan.example.json --out cases/device [--serial XXX] [--su "su -c"]
//        [--dir /data/data/com.maple.madherogo/files/hotfix/oracle] [--timeout 20000]
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { args } = require('./lib/util');

const a = args(process.argv.slice(2));
const DIR = a.dir || '/data/data/com.maple.madherogo/files/hotfix/oracle';
const SU = (a.su === undefined ? 'su -c' : a.su);
const TMP = '/data/local/tmp/bzo';
const adbBase = a.serial ? ['-s', a.serial] : [];
const timeout = +(a.timeout || 20000);

function adb(...xs) { return execFileSync('adb', adbBase.concat(xs), { encoding: 'utf8' }); }
function sh(cmd) { return adb('shell', SU ? `${SU} '${cmd.replace(/'/g, "'\\''")}'` : cmd); }
function sleep(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }

function send(cmd) {
  const id = cmd.id || `c${Date.now()}`;
  cmd.id = id;
  const local = path.join(require('os').tmpdir(), `bzo-${id}.json`);
  fs.writeFileSync(local, JSON.stringify(cmd));
  adb('shell', `mkdir -p ${TMP}`);
  adb('push', local, `${TMP}/cmd.json`);
  sh(`cp ${TMP}/cmd.json ${DIR}/cmd.json && chmod 666 ${DIR}/cmd.json`);
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    sleep(300);
    let out = '';
    try { out = sh(`cat ${DIR}/res-${id}.json 2>/dev/null`); } catch (e) { out = ''; }
    if (out.trim().startsWith('{')) { sh(`rm -f ${DIR}/res-${id}.json`); return JSON.parse(out); }
  }
  return { error: `超时 ${timeout}ms，探针未回执（检查 status.json 与 pollMs）` };
}

function pull(outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  sh(`rm -rf ${TMP}/cases && cp -r ${DIR}/cases ${TMP}/cases && chmod -R 777 ${TMP}/cases`);
  adb('pull', `${TMP}/cases/.`, outDir);
}

if (!a.plan || !a.out) { console.error('需要 --plan 与 --out'); process.exit(2); }
const plan = JSON.parse(fs.readFileSync(a.plan, 'utf8'));
let bad = 0;
for (const step of plan.steps) {
  const r = send(Object.assign({}, step));
  const tag = r.error ? '✘' : '✔';
  if (r.error) bad++;
  console.log(`${tag} ${step.op}${step.req ? ' ' + step.req.do : ''}  ${JSON.stringify(r).slice(0, 200)}`);
  if (step.op === 'status' && r.resolved) {
    const miss = Object.entries(r.resolved).filter(([, v]) => !v).map(([k]) => k);
    if (miss.length) console.log(`   未解析符号：${miss.join(', ')}（填 BZ_ORACLE_CONFIG.resolve）`);
  }
}
pull(a.out);
console.log(`\n已拉回 case 到 ${a.out}。下一步：node host/judge.js --cases ${a.out} --tables <cfg/dump> --templates <core/templates.json>`);
process.exit(bad ? 1 : 0);
