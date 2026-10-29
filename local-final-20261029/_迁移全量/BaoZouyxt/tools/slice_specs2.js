'use strict';
/**
 * slice_specs2.js —— 为「核心动作」生成可核查的代码切片
 * 输出：tools/spec2/<User.action>.txt
 *   每份含：注册点、请求点（含构造参数的上下文）、处理函数完整函数体（带行号）
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'F:/BaoZouyxt/tools';
const src = fs.readFileSync(path.join(ROOT, 'index.js'), 'utf8');
const lines = src.split('\n');
const acts = JSON.parse(fs.readFileSync(path.join(ROOT, 'actions.json'), 'utf8'));
const batches = JSON.parse(fs.readFileSync(path.join(ROOT, 'batches.json'), 'utf8'));

const constLines = {};
lines.forEach((ln, i) => {
  const m = ln.match(/HttpConst\.([A-Z][A-Z0-9_]+)/g) || [];
  for (const h of m) {
    const key = h.split('.')[1];
    (constLines[key] = constLines[key] || []).push(i);
  }
});

function findHandlerBody(name) {
  const re = new RegExp('prototype\\.' + name + '\\s*=\\s*function');
  for (let i = 0; i < lines.length; i++) {
    if (!re.test(lines[i])) continue;
    let end = i;
    for (let j = i + 1; j < Math.min(lines.length, i + 400); j++) {
      if (/^\s{0,4}\};?\s*$/.test(lines[j])) { end = j; break; }
      end = j;
    }
    return { start: i, end };
  }
  return null;
}

const outDir = path.join(ROOT, 'spec3');
fs.mkdirSync(outDir, { recursive: true });
const CORE = /Task|Duty|OnHook|Hook|Sign|Welfare|Reward|Item|Bag|Shop|Market|Sale|Buy|Use|Equip|Box|Battle|Fight|Skill|Attr|Level|Kill|Npc|NPC|Map|Move|Event|Fish|Dice|SaveGame|Sycn|sync|Role|Chat|School/i;
const wanted = new Set(Object.values(acts.httpConst).filter(a => CORE.test(a)).slice(0, 180));
let n = 0;

for (const constName of Object.keys(acts.httpConst)) {
  const action = acts.httpConst[constName];
  if (!wanted.has(action)) continue;
  const occ = constLines[constName] || [];
  const parts = ['# ' + action + '   (HttpConst.' + constName + ')'];
  const handlers = new Set();
  const regRe = new RegExp('MessageCenter\\.on\\([^,]*HttpConst\\.' + constName + ',\\s*([\\w.]+)');

  for (const ln of occ) {
    const line = lines[ln];
    const reg = line.match(regRe);
    if (reg) {
      const name = reg[1].split('.').pop();
      if (name && name !== 'function') handlers.add(name);
      parts.push('');
      parts.push('## 注册点 ' + (ln + 1) + ': ' + line.trim());
    } else if (/sendReq/i.test(line)) {
      parts.push('');
      parts.push('## 请求点 ' + (ln + 1) + ': ' + line.trim());
      for (let k = Math.max(0, ln - 8); k < ln; k++) parts.push('   ' + (k + 1) + ': ' + lines[k].trim());
    }
  }

  for (const h of handlers) {
    const body = findHandlerBody(h);
    if (!body) { parts.push(''); parts.push('## 处理函数 ' + h + ' —— 未找到定义'); continue; }
    parts.push('');
    parts.push('## 处理函数 ' + h + ' (' + (body.start + 1) + '-' + (body.end + 1) + ')');
    for (let i = body.start; i <= body.end; i++) parts.push(String(i + 1).padStart(6) + ': ' + lines[i]);
  }

  fs.writeFileSync(path.join(outDir, action.replace(/[^\w.]/g, '_') + '.txt'), parts.join('\n'), 'utf8');
  n++;
}
console.log('spec2 files:', n);
