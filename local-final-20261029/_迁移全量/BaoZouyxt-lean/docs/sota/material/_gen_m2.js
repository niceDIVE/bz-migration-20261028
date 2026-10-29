// _gen_m2.js
const fs = require('fs');
const path = require('path');

const EXCLUDED = new Set([
  'length', 'push', 'pop', 'shift', 'unshift', 'splice', 'slice',
  'indexOf', 'join', 'split', 'replace', 'substring', 'substr',
  'toString', 'charAt', 'toFixed', 'toLowerCase', 'toUpperCase',
  'concat', 'sort', 'reverse', 'forEach', 'map', 'filter',
  'hasOwnProperty', 'call', 'apply', 'bind', 'prototype', 'constructor'
]);

const FILES = [
  'tools/index.js',
  'tools/scripts2.js',
  'tools/scripts3.js'
];

function buildLineIndex(content) {
  const lineStarts = [0];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') {
      lineStarts.push(i + 1);
    }
  }
  return {
    lineStarts,
    getLine: function(pos) {
      let low = 0, high = lineStarts.length - 1;
      while (low <= high) {
        const mid = (low + high) >> 1;
        if (lineStarts[mid] <= pos) low = mid + 1;
        else high = mid - 1;
      }
      return high + 1;
    }
  };
}

function extractFieldsFromLine(line, lineNum) {
  // Truncate to 120 chars if needed
  const rawTrimmed = line.trim();
  const text = rawTrimmed.length > 120 ? rawTrimmed.slice(0, 117) + '...' : rawTrimmed;
  const items = [];

  // (a) .hasOwnProperty("X") -> X
  {
    const re = /\.hasOwnProperty\s*\(\s*["']([^"']+)["']\s*\)/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      items.push({ field: m[1], line: lineNum, text, idx: m.index });
    }
  }

  // (b) 属性读：形如 <ident>.X，其中 X 不在排除表内
  {
    // Match <ident>.<prop> where ident and prop are valid JS identifiers
    const re = /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*\.\s*([A-Za-z_$][A-Za-z0-9_$]*)/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      const prop = m[2];
      if (!EXCLUDED.has(prop)) {
        items.push({ field: prop, line: lineNum, text, idx: m.index });
      }
    }
  }

  // (c) 形如 getText("...") && X 里的 X（同上规则）
  {
    const re = /getText\s*\(\s*["'][^"']*["']\s*\)\s*&&\s*([A-Za-z_$][A-Za-z0-9_$]*)/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      const x = m[1];
      if (!EXCLUDED.has(x)) {
        items.push({ field: x, line: lineNum, text, idx: m.index });
      }
    }
  }

  // (d) 下标访问 <ident>["X"]
  {
    const re = /\b[A-Za-z_$][A-Za-z0-9_$]*\s*\[\s*["']([^"']+)["']\s*\]/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      items.push({ field: m[1], line: lineNum, text, idx: m.index });
    }
  }

  // (e) Object.keys(<ident>) / for (var k in <ident>) 的对象名
  {
    const reKeys = /Object\.keys\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)/g;
    let m;
    while ((m = reKeys.exec(line)) !== null) {
      items.push({ field: m[1], line: lineNum, text, idx: m.index });
    }
    const reForIn = /for\s*\(\s*(?:var|let|const)?\s*[A-Za-z_$][A-Za-z0-9_$]*\s+in\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\)/g;
    while ((m = reForIn.exec(line)) !== null) {
      items.push({ field: m[1], line: lineNum, text, idx: m.index });
    }
  }

  // Sort by occurrence in line
  items.sort((p, q) => p.idx - q.idx);
  return items.map(it => ({ field: it.field, line: it.line, text: it.text }));
}

function processAll() {
  const fileStats = {};
  const allSections = [];
  let totalOnCount = 0;
  const uniqueActionSet = new Set();
  let totalFieldAccesses = 0;

  for (const filePath of FILES) {
    const content = fs.readFileSync(filePath, 'utf8');
    const { getLine } = buildLineIndex(content);
    const lines = content.split(/\r?\n/);

    const regex = /MessageCenter\.on\s*\(/g;
    let match;
    let onCount = 0;

    while ((match = regex.exec(content)) !== null) {
      onCount++;
      totalOnCount++;
      const callPos = match.index;
      const callLine = getLine(callPos);
      const startIdx = match.index + match[0].length;

      // 2. 取它的第一个实参
      let inQuote = null;
      let depth = 0;
      let commaPos = -1;
      for (let i = startIdx; i < content.length; i++) {
        const ch = content[i];
        if (inQuote) {
          if (ch === inQuote && content[i - 1] !== '\\') inQuote = null;
        } else {
          if (ch === '"' || ch === '\'') inQuote = ch;
          else if (ch === '(') depth++;
          else if (ch === ')') {
            if (depth > 0) depth--;
            else { commaPos = i; break; }
          } else if (ch === ',' && depth === 0) {
            commaPos = i;
            break;
          }
        }
      }

      const rawArg1 = (commaPos !== -1 ? content.slice(startIdx, commaPos) : content.slice(startIdx)).trim();
      let actionName = rawArg1;
      if (rawArg1.includes('HttpConst.')) {
        const parts = rawArg1.split('HttpConst.');
        actionName = parts[1].split(/[^A-Za-z0-9_$]/)[0];
      } else if ((rawArg1.startsWith('"') && rawArg1.endsWith('"')) || (rawArg1.startsWith('\'') && rawArg1.endsWith('\''))) {
        actionName = rawArg1.slice(1, -1);
      }
      uniqueActionSet.add(actionName);

      // 3. 从该调用的第一个实参结束处开始，做花括号配对扫描
      const scanStartPos = commaPos !== -1 ? commaPos : startIdx + rawArg1.length;
      let braceStart = -1, braceEnd = -1;
      let bDepth = 0;
      let inQ = null;
      for (let i = scanStartPos; i < content.length; i++) {
        const ch = content[i];
        if (inQ) {
          if (ch === inQ && content[i - 1] !== '\\') inQ = null;
        } else {
          if (ch === '"' || ch === '\'') inQ = ch;
          else if (ch === '{') {
            if (bDepth === 0) braceStart = i;
            bDepth++;
          } else if (ch === '}') {
            bDepth--;
            if (bDepth === 0) {
              braceEnd = i;
              break;
            }
          }
        }
      }

      let startLine = 0, endLine = 0;
      const fields = [];
      let snippetLines = [];

      if (braceStart !== -1 && braceEnd !== -1) {
        startLine = getLine(braceStart);
        endLine = getLine(braceEnd);

        // 4. 在函数体内抽取「字段访问」
        for (let l = startLine; l <= endLine; l++) {
          const lineStr = lines[l - 1] || '';
          const lineFields = extractFieldsFromLine(lineStr, l);
          fields.push(...lineFields);
        }

        // Slice first 3 lines of function body for empty fallback
        for (let l = startLine; l <= Math.min(startLine + 2, endLine); l++) {
          snippetLines.push(lines[l - 1] || '');
        }
      }

      totalFieldAccesses += fields.length;

      allSections.push({
        actionName,
        filePath,
        callLine,
        startLine,
        endLine,
        fields,
        snippetLines,
        bodyLineCount: (endLine >= startLine && startLine > 0) ? (endLine - startLine + 1) : 0
      });
    }

    fileStats[filePath] = onCount;
  }

  // Format Markdown
  const mdLines = [];
  mdLines.push('# 客户端读点索引');
  mdLines.push('');
  mdLines.push('## 统计');
  mdLines.push('');
  mdLines.push(`- MessageCenter.on 总处数：${totalOnCount}`);
  mdLines.push(`- 去重后的动作数：${uniqueActionSet.size}`);
  mdLines.push(`- 字段访问条目总数：${totalFieldAccesses}`);
  mdLines.push('- 三包各自的 on 处数：');
  for (const fp of FILES) {
    mdLines.push(`  - \`${fp}\`: ${fileStats[fp]}`);
  }
  mdLines.push('');
  mdLines.push('---');
  mdLines.push('');

  // Sections
  for (const sec of allSections) {
    mdLines.push(`### ${sec.actionName}  [${sec.filePath}:${sec.callLine}，函数体 ${sec.startLine}-${sec.endLine}]`);
    mdLines.push('');
    if (sec.fields.length > 0) {
      mdLines.push('| 字段 | 行号 | 原文片段 |');
      mdLines.push('| --- | --- | --- |');
      for (const f of sec.fields) {
        // Escape pipe characters in text snippet
        const safeText = f.text.replace(/\|/g, '\\|');
        mdLines.push(`| ${f.field} | ${f.line} | \`${safeText}\` |`);
      }
    } else {
      mdLines.push(`未抽到字段访问，函数体行数 ${sec.bodyLineCount}`);
      mdLines.push('```javascript');
      for (const sl of sec.snippetLines) {
        mdLines.push(sl);
      }
      mdLines.push('```');
    }
    mdLines.push('');
  }

  const outputMdPath = path.join(__dirname, 'M2-客户端读点索引.md');
  fs.writeFileSync(outputMdPath, mdLines.join('\n'), 'utf8');

  console.log('Done!');
  console.log(`Total on count: ${totalOnCount}`);
  console.log(`Unique actions count: ${uniqueActionSet.size}`);
  console.log(`Total field accesses: ${totalFieldAccesses}`);
  console.log('File stats:', JSON.stringify(fileStats, null, 2));
  console.log(`Markdown output lines: ${mdLines.length}`);
}

processAll();
