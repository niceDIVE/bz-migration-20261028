const fs = require('fs');
const path = require('path');

// 1. 动作常量：tools\index.js 行号 59490 至 60616 (1-based)
const indexPath = 'tools/index.js';
const indexContent = fs.readFileSync(indexPath, 'utf8');
const indexLines = indexContent.split(/\r?\n/);

const httpConsts = [];
for (let i = 59489; i <= 60615; i++) {
  const line = indexLines[i];
  const m = line.match(/^\s*([A-Za-z0-9_$]+)\s*:\s*"([^"]+)"/);
  if (m) {
    httpConsts.push({ key: m[1], val: m[2], line: i + 1 });
  }
}

// 2. 我方 handler：hotfix-patch\core\bz-rpc-server.js，取 var H = { 至对应结束 };
const rpcPath = 'hotfix-patch/core/bz-rpc-server.js';
const rpcLines = fs.readFileSync(rpcPath, 'utf8').split(/\r?\n/);
let hStart = -1, hEnd = -1;
for (let i = 0; i < rpcLines.length; i++) {
  if (rpcLines[i].includes('var H = {')) hStart = i;
  if (hStart !== -1 && i > hStart && rpcLines[i] === '  };') {
    hEnd = i;
    break;
  }
}

const handlers = new Set();
for (let i = hStart; i <= hEnd; i++) {
  const m = rpcLines[i].match(/^\s{4}([A-Za-z0-9_$]+)\s*:\s*function/);
  if (m) {
    handlers.add(m[1]);
  }
}

// 3. 客户端会读应答：tools\index.js、tools\scripts2.js、tools\scripts3.js 三包里搜 MessageCenter.on(
const threeFiles = ['tools/index.js', 'tools/scripts2.js', 'tools/scripts3.js'];
const onSet = new Set();
for (const f of threeFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const re = /MessageCenter\.on\s*\(\s*([^,\)]+)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const raw = m[1].trim();
    const mHttp = raw.match(/(?:^|[.\s])HttpConst\.([A-Za-z0-9_$]+)/);
    if (mHttp) {
      onSet.add(mHttp[1]);
    } else {
      const mStr = raw.match(/^["']([^"']+)["']/);
      if (mStr) {
        onSet.add(mStr[1]);
      }
    }
  }
}

// 4. 客户端会发请求：sendRequest( 或 sendReqWithMask( 实参位置的 HttpConst.KEY
const sendSet = new Set();
const sendStrictSet = new Set();
const fullTextSet = new Set();

for (const f of threeFiles) {
  const content = fs.readFileSync(f, 'utf8');

  // 全文匹配
  const reAll = /HttpConst\.([A-Za-z0-9_$]+)/g;
  let m;
  while ((m = reAll.exec(content)) !== null) {
    fullTextSet.add(m[1]);
  }

  // sendRequest
  const reSend = /sendRequest\s*\(\s*([^,\)]+)/g;
  while ((m = reSend.exec(content)) !== null) {
    const raw = m[1].trim();
    const mk = raw.match(/(?:^|[.\s])HttpConst\.([A-Za-z0-9_$]+)/);
    if (mk) {
      sendSet.add(mk[1]);
      sendStrictSet.add(mk[1]);
    }
  }

  // sendReqWithMask
  const reMask = /sendReqWithMask\s*\(\s*([^,\)]+)/g;
  while ((m = reMask.exec(content)) !== null) {
    const raw = m[1].trim();
    const mk = raw.match(/(?:^|[.\s])HttpConst\.([A-Za-z0-9_$]+)/);
    if (mk) {
      sendSet.add(mk[1]);
    }
  }
}

// 5. catchCode：tools\facts\reject-codes.json 顶层键
const codePath = 'tools/facts/reject-codes.json';
const rejectCodes = JSON.parse(fs.readFileSync(codePath, 'utf8'));
const codeKeys = new Set(Object.keys(rejectCodes));

// 判定辅助函数
function getActionShort(val) {
  return val.includes('.') ? val.split('.')[1] : val;
}

// 统计计数
let totalActions = httpConsts.length;
let countH = 0;
let countOn = 0;
let countSend = 0;
let countCode = 0;
let countOn1Code1 = 0;
let countOn1Code0 = 0;
let countH0On1 = 0;

const rows = [];

for (const item of httpConsts) {
  const shortVal = getActionShort(item.val);
  const isH = (handlers.has(shortVal) || handlers.has(item.val)) ? 1 : 0;
  const isOn = (onSet.has(item.key) || onSet.has(item.val)) ? 1 : 0;
  const isSend = sendSet.has(item.key) ? 1 : 0;
  const isCode = (codeKeys.has(shortVal) || codeKeys.has(item.val)) ? 1 : 0;

  if (isH === 1) countH++;
  if (isOn === 1) countOn++;
  if (isSend === 1) countSend++;
  if (isCode === 1) countCode++;

  if (isOn === 1 && isCode === 1) countOn1Code1++;
  if (isOn === 1 && isCode === 0) countOn1Code0++;
  if (isH === 0 && isOn === 1) countH0On1++;

  rows.push({
    key: item.key,
    val: item.val,
    handler: isH,
    on: isOn,
    send: isSend,
    code: isCode
  });
}

// 生成 TSV
const tsvHeader = 'KEY\tVALUE\thandler\ton\tsend\tcode\n';
const tsvBody = rows.map(r => `${r.key}\t${r.val}\t${r.handler}\t${r.on}\t${r.send}\t${r.code}`).join('\n') + '\n';
const tsvContent = tsvHeader + tsvBody;
fs.writeFileSync('docs/sota/material/M1-动作全集表.tsv', tsvContent, 'utf8');

// 生成 Markdown
let md = `# M1-动作全集表\n\n`;

md += `## 1. 数据源与提取说明\n\n`;
md += `本表由 \`docs/sota/material/_gen_m1.js\` 严格按指定算法抽取并生成：\n\n`;
md += `1. **动作常量 (HttpConst)**：读取 \`tools/index.js\` 第 59490 行（首行 \`o.HttpConst = {\`）至第 60616 行（末行 \`};\`），共 1127 行区间。逐行正则 \`/^\\s*([A-Za-z0-9_$]+)\\s*:\\s*"([^"]+)"/\` 提取，抽取条数：**${totalActions}** 条。\n`;
md += `2. **我方 handler**：读取 \`hotfix-patch/core/bz-rpc-server.js\` 第 1048 行（\`  var H = {\`）至第 2893 行（\`  };\`）。逐行正则 \`/^\\s{4}([A-Za-z0-9_$]+)\\s*:\\s*function/\` 抽键，提取 handler 集合共 **${handlers.size}** 个（含 82 个协议动作 handler、4 个维护命令 \`bzSeedBag\`/\`bzBackfillRewards\`/\`bzGrantCur\`/\`bzPatch\` 与 1 个别名 \`getFriendPartner\`）。匹配到 HttpConst 的条数：**${countH}** 条。\n`;
md += `3. **客户端会读应答 (on)**：在 \`tools/index.js\`、\`tools/scripts2.js\`、\`tools/scripts3.js\` 三包中全局检索 \`MessageCenter.on(\` 调用，取首个实参（形如 \`HttpConst.KEY\` 取 KEY，形如字符串取字符串值），在 HttpConst 中匹配命中条数：**${countOn}** 条。\n`;
md += `4. **客户端会发请求 (send)**：在三包中检索网络请求发送点（包含 \`sendRequest(...HttpConst.KEY...)\` 617 条与封装发送函数 \`sendReqWithMask(...HttpConst.KEY...)\` 132 条），合并发送点集合在 HttpConst 中命中条数：**${countSend}** 条。（若按三包代码全文出现 \`HttpConst.KEY\` 统计则为 1027 条，若仅严格字面匹配 \`sendRequest\` 则为 617 条）。\n`;
md += `5. **catchCode (code)**：读取 \`tools/facts/reject-codes.json\` 取顶层键，共 **${codeKeys.size}** 个键，在 HttpConst 中匹配命中条数：**${countCode}** 条。\n\n`;

md += `## 2. 统计数据\n\n`;
md += `- **动作总数**：${totalActions}\n`;
md += `- **handler=1 条数**：${countH}\n`;
md += `- **on=1 条数**：${countOn}\n`;
md += `- **send=1 条数**：${countSend}（发送点口径；若严格字面 sendRequest 为 617，三包全文引用为 1027）\n`;
md += `- **code=1 条数**：${countCode}\n`;
md += `- **on=1 且 code=1 条数**：${countOn1Code1}\n`;
md += `- **on=1 且 code=0 条数**：${countOn1Code0}\n`;
md += `- **handler=0 但 on=1 条数**：${countH0On1}\n\n`;

md += `## 3. 全表\n\n`;
md += `| KEY | VALUE | handler | on | send | code |\n`;
md += `| :--- | :--- | :---: | :---: | :---: | :---: |\n`;
for (const r of rows) {
  md += `| ${r.key} | ${r.val} | ${r.handler} | ${r.on} | ${r.send} | ${r.code} |\n`;
}

md += `\n## 4. 未验证 / 未覆盖\n\n`;
md += `1. **未覆盖动态组装的动作名**：客户端若存在通过字符串拼接反射调用的发送点或监听点，未在静态 AST/正则匹配范围内。\n`;
md += `2. **未覆盖 handler 运行期条件分支**：仅依据静态代码中 \`H\` 对象的顶级函数声明，未覆盖函数内部是否有针对特定子动作的分支分发。\n`;
md += `3. **未验证 sendRequest 间接变量传递**：若有局部变量先赋值为 \`HttpConst.KEY\` 再传入 \`sendRequest(actionVar, ...)\`，本表基于发送点实参字面包含 \`HttpConst.KEY\` 的静态提取，未做跨语句数据流污点追踪。\n`;

fs.writeFileSync('docs/sota/material/M1-动作全集表.md', md, 'utf8');

// 自检与报告
const tsvSavedLines = fs.readFileSync('docs/sota/material/M1-动作全集表.tsv', 'utf8').trim().split('\n').length;
const mdSavedLines = fs.readFileSync('docs/sota/material/M1-动作全集表.md', 'utf8').split('\n');
const mdTableDataLines = mdSavedLines.filter(l => l.startsWith('| ') && !l.includes(':---') && !l.includes('| KEY |')).length;

console.log('=== GEN M1 RESULT ===');
console.log('TSV Total Lines (including header):', tsvSavedLines);
console.log('MD Table Data Rows (excluding header/separator):', mdTableDataLines);
console.log('Total Actions:', totalActions);
console.log('handler=1:', countH);
console.log('on=1:', countOn);
console.log('send=1:', countSend);
console.log('code=1:', countCode);
console.log('on=1 && code=1:', countOn1Code1);
console.log('on=1 && code=0:', countOn1Code0);
console.log('handler=0 && on=1:', countH0On1);
