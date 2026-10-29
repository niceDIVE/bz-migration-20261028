'use strict';
/**
 * build.js —— 组装 hotfix 补丁
 * 用法：
 *   node build.js            → 探针版（PROBE_MODE=true，透明记录）
 *   BZ_PROBE=0 node build.js → 环回版（真协议 LOOPBACK，零外联）
 * 产物：patch/jsb-adapter/jsb-engine.js
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const origPath = path.join(root, '..', 'client-analysis', 'jsb-engine.js');
const outPath = path.join(root, 'patch', 'jsb-adapter', 'jsb-engine.js');

const PROBE = (process.env.BZ_PROBE || '1') === '1';
const orig = fs.readFileSync(origPath, 'utf8');

let hook = fs.readFileSync(path.join(root, 'hook', 'bz-offline-hook.js'), 'utf8');
const marker = 'var PROBE_MODE = true;';
if (!hook.includes(marker)) throw new Error('hook 内未找到 PROBE_MODE 标记行');
hook = hook.replace(marker, 'var PROBE_MODE = ' + PROBE + ';');

let head = '';
if (PROBE) {
  head += fs.readFileSync(path.join(root, 'core', 'bz-rpc-core.js'), 'utf8') + '\n';
} else {
  // ---- 环回版：厂商库（屏蔽 node 环境分支，强制挂到 window） + 编解码 + 模板 + 真协议服务器 ----
  const wrap = (code, extra) =>
    ';(function(){ var module, exports, angular, define;' + extra + '\n' + code + '\n' + extra + '\n}).call(window);\n';
  const aesjs = fs.readFileSync(path.join(root, 'node_modules', 'aes-js', 'index.js'), 'utf8');
  const lz = fs.readFileSync(path.join(root, 'node_modules', 'lz-string', 'libs', 'lz-string.js'), 'utf8');
  const codec = fs.readFileSync(path.join(root, 'hook', 'bz-codec.js'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'core', 'bz-rpc-server.js'), 'utf8');
  const tpl = fs.readFileSync(path.join(root, 'core', 'templates.json'), 'utf8');

  head += '// ---- vendor: aes-js ----\n' + wrap(aesjs, 'try{ if (typeof aesjs !== "undefined" && window) window.aesjs = aesjs; }catch(e){}');
  head += '\n// ---- vendor: lz-string ----\n' + wrap(lz, 'try{ if (typeof LZString !== "undefined" && window) window.LZString = LZString; }catch(e){}');
  head += '\n// ---- bz-codec ----\n' + codec;
  head += '\n// ---- templates ----\nvar __BZ_TPL__ = ' + tpl.trim() + ';\n';
  head += '\n// ---- bz-rpc-server ----\n' + server + '\n';
}

const banner =
  '/* =====================================================\n' +
  ' * BZ OFFLINE PATCH  build=' + new Date().toISOString() + '\n' +
  ' * mode=' + (PROBE ? 'PROBE（透明探针，游戏行为不变）' : 'LOOPBACK（真协议进程内环回，零外联）') + '\n' +
  ' * 挂载方式：放入客户端可写目录 hotfix/jsb-adapter/jsb-engine.js\n' +
  ' * ===================================================== */\n';

const patch = banner + head + '\n' + hook + '\n\n' + orig;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, patch, 'utf8');

// 自检：语法编译 + 标记齐全 + 原版完整保留
require('vm').compileFunction(patch);
if (!patch.includes('__BZ_OFFLINE__')) throw new Error('补丁缺少 hook 标记');
if (!PROBE && !patch.includes('createBzServer')) throw new Error('环回版缺少服务器');
if (!PROBE && !patch.includes('__BZ_TPL__')) throw new Error('环回版缺少模板');
if (!patch.endsWith(orig)) throw new Error('原版内容未完整保留在尾部');
console.log('BUILD OK  mode=' + (PROBE ? 'PROBE' : 'LOOPBACK') + '  bytes=' + Buffer.byteLength(patch) + '  -> ' + outPath);
