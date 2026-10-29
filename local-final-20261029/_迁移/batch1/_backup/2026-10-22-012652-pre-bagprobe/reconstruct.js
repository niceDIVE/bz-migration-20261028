/* 一次性脚本：把我对 bz-bootstrap.js 的三处改动逆向回去，重建 pre-cmdfix 原件。
 * 用「原始字节数 12767」当校验：重建后大小必须等于它。
 * 只操作 _backup 里的副本，不碰工程源文件。
 */
const fs = require('fs');
const P = 'F:\\BaoZouyxt\\_backup\\2026-10-22-012652-pre-bagprobe\\bz-bootstrap.js.pre-cmdfix';

let src = fs.readFileSync(P, 'utf8');
const before = Buffer.byteLength(src, 'utf8');

const START = '    // 启动时丢弃上一次会话残留的命令文件';
const END = '    }, 700);';

const ORIGINAL = [
  '    setInterval(function () {',
  '      var c = null;',
  '      try { c = utils.isFileExist(cmdPath) ? utils.getStringFromFile(cmdPath) : null; } catch (e) {}',
  '      if (c === null) return;',
  '      try { utils.removeFile(cmdPath); } catch (e) {}',
  '      reply(exec(c));',
  '      try { utils.writeStringToFile(String(Date.now()), seqPath); } catch (e) {}',
  '    }, 700);'
].join('\n');

const i = src.indexOf(START);
if (i < 0) { console.log('NO_START_ANCHOR — 可能已逆向过'); process.exit(1); }
const j = src.indexOf(END, i);
if (j < 0) { console.log('NO_END_ANCHOR'); process.exit(1); }
const stop = j + END.length;

src = src.slice(0, i) + ORIGINAL + src.slice(stop);
src = src.split("var BOOT_VER = 'boot-2';").join("var BOOT_VER = 'boot-1';");

fs.writeFileSync(P, src, 'utf8');

const after = Buffer.byteLength(src, 'utf8');
console.log('before=' + before + ' after=' + after + ' expected=12767 ' + (after === 12767 ? 'MATCH ✓' : 'MISMATCH ✗'));
console.log('still has discardStaleCmd: ' + (src.indexOf('discardStaleCmd') >= 0));
console.log('still has boot-2: ' + (src.indexOf('boot-2') >= 0));
