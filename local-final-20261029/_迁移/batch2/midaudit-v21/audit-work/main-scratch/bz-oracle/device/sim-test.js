#!/usr/bin/env node
// 在 node 里模拟"客户端进程"，端到端验证探针：jsb.fileUtils / MessageCenter(吞异常) / RoleBaseInfo / 背包模型 / 我方 handler。
// 产出的 case 交给 host/judge.js 判；预期：正确的 handler 全 PASS，注入的两个已知 bug 被 L0/L1/L2 抓到。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const os = require('os');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bzo-'));
const W = tmp + '/';

function makeWorld(bug) {
  const files = {
    isDirectoryExist: d => fs.existsSync(d), createDirectory: d => fs.mkdirSync(d, { recursive: true }),
    isFileExist: p => fs.existsSync(p), getStringFromFile: p => fs.readFileSync(p, 'utf8'),
    writeStringToFile: (s, p) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); return true; },
    removeFile: p => fs.unlinkSync(p), getWritablePath: () => W,
  };
  // 客户端 MessageCenter：和原版一样吞掉监听器异常
  const MessageCenter = {
    _ls: {},
    on(e, fn, t) { (this._ls[e] = this._ls[e] || []).push({ fn, t }); },
    off(e, fn) { this._ls[e] = (this._ls[e] || []).filter(x => x.fn !== fn); },
    dispatch(e, d) { for (const x of this._ls[e] || []) { try { x.fn.call(x.t, e, d); } catch (err) { /* 吞掉 */ } } },
  };
  const RoleBaseInfo = { coins: 0, potentials: 0, gold: 0, yuanbao: 0, chipNum: 0 };
  const Bag = { items: {}, setItem(id, n) { if (n) this.items[id] = n; else delete this.items[id]; } };
  const Skills = { t: {}, setSkill(id, lv) { (this.t[id] = this.t[id] || [0, 0, 0])[0] = lv; }, setUpgrdPgr(id, v) { this.t[id][1] = v; }, setBrLv(id, v) { this.t[id][2] = v; }, abolishSkill(id) { delete this.t[id]; } };

  // 我方"服务端"（极简），bug: 'delta' = ivch 发增量；'throw' = 应答少字段导致客户端监听器抛异常
  let save = { coins: 1000, potential: 300, gold: 0, yuanbao: 0, chip: 0, bag: { 2001: 5 }, skills: {}, playerEquip: {} };
  const clone = v => JSON.parse(JSON.stringify(v));
  const BZ = {
    loadSave: () => clone(save),
    handle(req) {
      const p = req.p || {};
      if (req.do === 'saleItem') {
        const before = save.bag[p.itemID] || 0, n = Math.min(before, p.num);
        save.bag[p.itemID] = before - n; save.coins += 50 * n;
        return { eRet: 1, note: { ivch: { [p.itemID]: bug === 'delta' ? -n : save.bag[p.itemID] }, eco: { coins: save.coins } } };
      }
      if (req.do === 'useItem') {
        save.bag[p.itemID] = (save.bag[p.itemID] || 0) - 1;
        const r = { eRet: 1, note: { ivch: { [p.itemID]: save.bag[p.itemID] } } };
        if (bug === 'throw') r.formulaID = 0; else r.formulaID = 501;
        return r;
      }
      if (req.do === 'sycnPlayerItemData') return { eRet: 1, itemObj: clone(save.bag) };
      return { eRet: 4 };
    },
  };
  const window = { jsb: { fileUtils: files }, MessageCenter, RoleBaseInfo, BZ, console: { error() {}, log() {} }, setTimeout, Date, JSON, Object, Array, Error, String };
  window.window = window;
  // 客户端监听器（摘自材料里的真实逻辑）
  MessageCenter.on('ivch', function (t, o) { for (const n in o) Bag.setItem(parseInt(n), o[n]); });                 // index.js:64675（赋值）
  MessageCenter.on('eco', function (t, o) { for (const k in o) if (k === 'coins') RoleBaseInfo.coins = o[k]; else if (k === 'ptt') RoleBaseInfo.potentials = o[k]; });
  MessageCenter.on('User.sycnPlayerItemData', function (t, o) { Bag.items = {}; for (const n in o.itemObj) Bag.setItem(+n, o.itemObj[n]); });
  MessageCenter.on('User.useItem', function (t, a) { if (a.hasOwnProperty('formulaID')) { const f = a.formulaID ? { name: 'x' } : null; f.name; } }); // index.js:64793-64794 形态
  // 初始化客户端模型与存档一致
  Bag.items = clone(save.bag); RoleBaseInfo.coins = save.coins; RoleBaseInfo.potentials = save.potential;

  window.BZ_ORACLE_CONFIG = {
    dir: W + 'oracle-' + (bug || 'clean') + '/', pollMs: 50, settleMs: 5, passive: false,
    snapshot: {
      bag: () => clone(Bag.items),
      skills: () => clone(Skills.t),
    },
    // 注：自检里 wallet 用探针默认实现（读 RoleBaseInfo）
  };
  return window;
}

function runProbe(bug) {
  const win = makeWorld(bug);
  const ctx = vm.createContext(win);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'oracle-probe.js'), 'utf8'), ctx);
  return new Promise(res => {
    const O = win.BZ_ORACLE, out = [];
    const reqs = [{ mod: 'User', do: 'saleItem', p: { itemID: 2001, num: 2 } }, { mod: 'User', do: 'useItem', p: { itemID: 2001 } }];
    (function next() {
      if (!reqs.length) return res({ dir: win.BZ_ORACLE_CONFIG.dir + 'cases', out, status: O.status });
      O.dual(reqs.shift(), r => { out.push(r); next(); });
    })();
  });
}

(async () => {
  const { execFileSync } = require('child_process');
  const root = path.resolve(__dirname, '..');
  let ok = true;
  for (const bug of [null, 'delta', 'throw']) {
    const r = await runProbe(bug);
    let code = 0, txt = '';
    try { execFileSync('node', [path.join(root, 'host/judge.js'), '--cases', r.dir, '--layers', 'L0,L1,L2,L5', '--rules', path.join(root, 'fixtures/none.json')], { stdio: 'inherit' }); }
    catch (e) { code = e.status; txt = ''; }
    const expectFail = !!bug;
    const pass = expectFail ? code === 1 : code === 0;
    ok = ok && pass;
    console.log(`=== 场景 ${bug || 'clean'}：探针 L0 模式=${r.status.l0.mode}，judge 退出码 ${code} → ${pass ? '符合预期' : '不符合预期'}`);
    console.log(txt.split('\n').filter(l => /✘|✔|FAIL|结论/.test(l)).map(l => '  ' + l).join('\n'));
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(ok ? '\n探针端到端自检通过' : '\n探针端到端自检失败');
  process.exit(ok ? 0 : 1);
})();
