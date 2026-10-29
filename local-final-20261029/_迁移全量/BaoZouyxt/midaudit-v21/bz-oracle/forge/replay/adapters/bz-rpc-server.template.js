'use strict';
// 把真实的 hotfix-patch/core/bz-rpc-server.js 接进离线回放台的适配器模板。
// 材料没有给出该文件的导出方式与 env 接口，下面标 TODO 的地方需要按仓库实际填写【推断】。
// 约定：导出 createServer(opts) → { dispatch(req) → {action, via, resp, envelope}, setSave(s), getSave() }，与 replay/server.js 同形。
const fs = require('fs');
const vm = require('vm');
module.exports.createServer = function (opts) {
  const src = fs.readFileSync(opts.serverPath, 'utf8');
  let disk = JSON.stringify(opts.initialSave || {});
  const env = { // TODO：按 bz-rpc-server.js 实际使用的 env.* 补齐
    now: () => opts.now || 1767225600000,
    readFile: () => disk, writeFile: (_p, s) => { disk = s; },
    log: () => {},
  };
  const sandbox = { env, console: { log() {}, error() {} }, module: { exports: {} }, exports: {}, window: {}, JSON, Math, Date };
  vm.runInNewContext(src, sandbox, { filename: opts.serverPath });
  const api = sandbox.module.exports && Object.keys(sandbox.module.exports).length ? sandbox.module.exports : sandbox.window; // TODO：确认导出位置
  const handle = api.handle || api.dispatch; // TODO：确认分发入口名（M3 §4：loadSave()/persist()；分发表 var H = {...}）
  return {
    setSave(s) { disk = JSON.stringify(s); },
    getSave() { return JSON.parse(disk); },
    dispatch(req) {
      const action = `${req.mod}.${req.do}`;
      const env2 = handle(req); // TODO：真实签名可能是 (mod, do, p, cb)
      const body = env2 && env2[action] ? env2[action] : env2;
      return { action, via: 'bz-rpc-server', resp: body, envelope: env2 && env2.p ? env2 : { error: 0, code: 200, p: action, [action]: body } };
    },
  };
};
