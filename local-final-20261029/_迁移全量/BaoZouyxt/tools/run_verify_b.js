'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const src = JSON.parse(fs.readFileSync('tools/facts/shape-weak-evidence.json', 'utf8'));
const items = src.items.slice(128, 255);
const bundles = ['tools/index.js', 'tools/scripts2.js', 'tools/scripts3.js'];

function matchLine(line, field) {
  if (field.includes('.')) {
    const parts = field.split('.');
    const reStr = parts.map(p => `(?:\\.${p}|\\[\\s*['"]${p}['"]\\s*\\])`).join('');
    const re = new RegExp(reStr + '(?![a-zA-Z0-9_$])');
    return re.test(line);
  } else {
    const p1 = new RegExp('\\.' + field + '(?![a-zA-Z0-9_$])');
    const p2 = new RegExp('\\[\\s*[\'"]' + field + '[\'"]\\s*\\]');
    return p1.test(line) || p2.test(line);
  }
}

const unverified = [];
const verifiedItems = [];
const commandsLog = [];

for (let idx = 0; idx < items.length; idx++) {
  const item = items[idx];
  let found = null;
  let totalHits = 0;

  for (const b of bundles) {
    const winPath = b.replace(/\//g, '\\');
    const cmd = `node tools\\grep_src.js "${item.field}" --file ${winPath} --max 6`;
    let out = '';
    let exitCode = 0;
    try {
      out = execSync(cmd, { encoding: 'utf8' });
    } catch (e) {
      exitCode = e.status || 1;
      out = e.stdout ? e.stdout.toString() : '';
    }
    
    // Record command
    commandsLog.push({
      cmd: cmd,
      exit: exitCode,
      out: out.slice(0, 300)
    });

    if (!out || out.includes('(no match)')) continue;
    const lines = out.split(/\r?\n/);
    for (const l of lines) {
      const m = l.match(/^(\d+):\s*(.*)$/);
      if (!m) continue;
      const lineNo = parseInt(m[1], 10);
      const text = m[2];
      if (matchLine(text, item.field)) {
        totalHits++;
        if (!found) {
          found = {
            file: path.resolve(b),
            line: lineNo,
            text: text.slice(0, 160)
          };
        }
      }
    }
    // We search across all bundles or stop on first?
    // Rule: "找到第一条符合的读取行就停，记录 文件路径:行号 和该行原文（截到 160 字符）。"
    if (found) {
      // but let's check hits count rule:
      // "hits=<命中数>" - does hits mean in the first bundle found, or total, or 1?
      break;
    }
  }

  if (found) {
    verifiedItems.push({
      action: item.action,
      field: item.field,
      conf: item.conf,
      status: 'verified',
      hitsCount: totalHits || 1,
      found: found
    });
  } else {
    verifiedItems.push({
      action: item.action,
      field: item.field,
      conf: item.conf,
      status: 'not-found',
      hitsCount: 0,
      found: null
    });
  }
}

console.log('Done scanning.');
console.log('Verified:', verifiedItems.filter(x => x.status === 'verified').length);
console.log('Not found:', verifiedItems.filter(x => x.status === 'not-found').length);
const notFounds = verifiedItems.filter(x => x.status === 'not-found');
if (notFounds.length > 0) {
  console.log('Not found items:', notFounds);
}
