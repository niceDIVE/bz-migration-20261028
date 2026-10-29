'use strict';
/**
 * docx2txt.js —— 把 .docx 的正文抽成纯文本（只读，不依赖第三方库）
 *
 * 用法：
 *   node tools/docx2txt.js "docs/sota/inbox/R04-reply.docx" "docs/sota/inbox/R04-reply.txt"
 *
 * 做法：.docx 就是 zip，取 word/document.xml → 去标签 → 反转义。
 * 不处理：表格合并/图片/批注（comments.xml 忽略）。
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const src = process.argv[2];
const dst = process.argv[3];
if (!src || !dst) {
  console.log('用法: node tools/docx2txt.js <in.docx> <out.txt>');
  process.exit(1);
}
const srcAbs = path.resolve(src);
const dstAbs = path.resolve(dst);
if (!fs.existsSync(srcAbs)) { console.error('找不到输入: ' + srcAbs); process.exit(2); }

// zip 解压：优先用 PowerShell Expand-Archive（Windows 自带），失败再试 unzip
const tmp = path.join(os.tmpdir(), 'docx2txt-' + process.pid);
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });
const zipPath = path.join(tmp, 'in.zip');
fs.copyFileSync(srcAbs, zipPath);

function expand() {
  try {
    execFileSync('powershell', ['-NoProfile', '-Command',
      "Expand-Archive -LiteralPath '" + zipPath.replace(/'/g, "''") + "' -DestinationPath '" + path.join(tmp, 'x').replace(/'/g, "''") + "' -Force"
    ], { stdio: 'ignore' });
    return true;
  } catch (e) {
    try {
      execFileSync('unzip', ['-o', '-q', zipPath, '-d', path.join(tmp, 'x')], { stdio: 'ignore' });
      return true;
    } catch (e2) { return false; }
  }
}
if (!expand()) { console.error('解压失败（PowerShell/unzip 都不可用）'); process.exit(3); }

const docXml = path.join(tmp, 'x', 'word', 'document.xml');
if (!fs.existsSync(docXml)) { console.error('压缩包里没有 word/document.xml'); process.exit(4); }

let x = fs.readFileSync(docXml, 'utf8');
x = x.replace(/<w:tab\s*\/>/g, '\t')
     .replace(/<w:br\s*\/>/g, '\n')
     .replace(/<\/w:p>/g, '\n')
     .replace(/<\/w:tr>/g, '\n');
x = x.replace(/<[^>]+>/g, '');
const ents = { '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&amp;': '&' };
x = x.replace(/&(lt|gt|quot|apos|amp);/g, (m) => ents[m]);
x = x.replace(/\r/g, '');
x = x.replace(/\n{3,}/g, '\n\n');

fs.writeFileSync(dstAbs, x, 'utf8');
fs.rmSync(tmp, { recursive: true, force: true });
console.log('wrote ' + dstAbs + '  chars=' + x.length + '  lines=' + x.split('\n').length);
