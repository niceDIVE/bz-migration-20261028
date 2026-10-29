'use strict';
/**
 * build.js —— 组装 hotfix 补丁
 *
 * 用法：
 *   node build.js                              → 探针版（PROBE_MODE=true，透明记录）
 *   $env:BZ_PROBE='0'; node build.js           → 环回版（薄引导 + 外部 handlers.js）
 *   node build.js --all                        → 两个都出（探针写成 jsb-engine.probe.js）
 *
 * 产物：
 *   patch/jsb-adapter/jsb-engine.js   引导层（仅 bootstrap 变更时才需重新推送）
 *   patch/live/handlers.js            策略层（由 build-handlers.js 生成，可热重载）
 */
const fs = require('fs');
const path = require('path');
// 注意：沙盒禁 spawn 子进程（EPERM），生成策略层改为同进程内 require

const root = __dirname;
const origPath = path.join(root, '..', 'client-analysis', 'jsb-engine.js');
const outPath = path.join(root, 'patch', 'jsb-adapter', 'jsb-engine.js');

const ALL = process.argv.includes('--all');
const PROBE = (process.env.BZ_PROBE || '1') === '1';

const orig = fs.readFileSync(origPath, 'utf8');

function readHook(name) { return fs.readFileSync(path.join(root, 'hook', name), 'utf8'); }
function readCore(name) { return fs.readFileSync(path.join(root, 'core', name), 'utf8'); }

function wrapVendor(code, expose) {
  return ';(function(){ var module, exports, angular, define;' + expose + '\n' + code + '\n' + expose + '\n}).call(window);\n';
}

let head = '';
if (PROBE) {
  // 探针版：老的透明记录 hook + 早期简化核心（抓包用，行为不变）
  let hook = readHook('bz-offline-hook.js');
  const marker = 'var PROBE_MODE = true;';
  if (!hook.includes(marker)) throw new Error('hook 内未找到 PROBE_MODE 标记行');
  head += readCore('bz-rpc-core.js') + '\n' + hook;
} else {
  // 环回版：引导层 = 厂商库 + 编解码 + XHR 传输层 + 薄引导（策略层在设备上，可热重载）
  const aesjs = fs.readFileSync(path.join(root, 'node_modules', 'aes-js', 'index.js'), 'utf8');
  const lz = fs.readFileSync(path.join(root, 'node_modules', 'lz-string', 'libs', 'lz-string.js'), 'utf8');
  head += '// ---- vendor: aes-js ----\n' + wrapVendor(aesjs, 'try{ if (typeof aesjs !== "undefined" && window) window.aesjs = aesjs; }catch(e){}');
  head += '\n// ---- vendor: lz-string ----\n' + wrapVendor(lz, 'try{ if (typeof LZString !== "undefined" && window) window.LZString = LZString; }catch(e){}');
  head += '\n// ---- bz-codec ----\n' + readHook('bz-codec.js');
  head += '\n// ---- bz-xhr（传输层） ----\n' + readHook('bz-xhr.js');
  head += '\n// ---- bz-bootstrap（薄引导） ----\n' + readHook('bz-bootstrap.js');
}

const banner =
  '/* =====================================================\n' +
  ' * BZ OFFLINE PATCH  build=' + new Date().toISOString() + '\n' +
  ' * layer=' + (PROBE ? 'PROBE（透明探针，游戏行为不变）' : 'BOOTSTRAP（薄引导；策略层见 hotfix/live/handlers.js）') + '\n' +
  ' * 挂载方式：放入客户端可写目录 hotfix/jsb-adapter/jsb-engine.js\n' +
  ' * ===================================================== */\n';

const patch = banner + head + '\n\n' + orig;

const target = ALL ? outPath.replace(/\.js$/, (PROBE ? '.probe.js' : '.js')) : outPath;
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, patch, 'utf8');

// 自检：语法编译 + 标记齐全 + 原版完整保留
require('vm').compileFunction(patch);
if (!PROBE) {
  if (!patch.includes('__BZ_BOOT__')) throw new Error('引导层缺少 __BZ_BOOT__ 标记');
  if (!patch.includes('createBzXHRClass')) throw new Error('引导层缺少 XHR 传输层');
}
if (!patch.endsWith(orig)) throw new Error('原版内容未完整保留在尾部');
console.log('BUILD OK  layer=' + (PROBE ? 'PROBE' : 'BOOTSTRAP') + '  bytes=' + Buffer.byteLength(patch) + '  -> ' + target);

if (!PROBE || ALL) require(path.join(root, 'build-handlers.js'));
