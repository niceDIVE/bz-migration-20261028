// v2.2 step21 实质复现：手动模拟 nightly 循环体（绕开被沙箱禁的 execSync）
// 正常路径（POSIX 视角）：gate 过 → 严格加载 → replay(requireSave+strictGenerated) → 回归判死
const fs = require('fs');
const path = require('path');
const root = 'F:/BaoZouyxt/audit-work22/main-scratch/bz-oracle';
const { gate } = require(root + '/forge/lib/gen-gate');
const { replay } = require(root + '/forge/replay/replay');

const genDir = root + '/forge/generated';
fs.mkdirSync(genDir, { recursive: true });
const file = genDir + '/User.saleItem.js';
const fb = genDir + '/.feedback-User.saleItem.json';

// attempt 2 文件已由 pwsh 侧直接调 demo-gen 生成（沙箱禁脚本内 execSync）

// 1) 闸（Windows 形态路径）
const gWin = gate(fs.readFileSync(file, 'utf8'), { action: 'User.saleItem' });
console.log('gate(Windows 路径):', gWin.ok ? 'PASS' : 'REJECT', JSON.stringify(gWin.why));

// 1b) 闸（POSIX 形态路径：把 require 串里的反斜杠换成正斜杠）
const srcPosix = fs.readFileSync(file, 'utf8').replace(/JSON\.stringify\(require\('path'\)\.resolve\(__dirname, '\.\.\/lib'\)\)/, 'JSON.stringify(require(\'path\').resolve(__dirname, \'../lib\').replace(/\\\\/g, \'/\'))');
// 更直接：构造等价文件，require 路径全正斜杠
const posixSrc = `const { compileAction } = require('${root.replace(/\\/g, '/')}/forge/lib/rules-dsl');
const spec = require('${root.replace(/\\/g, '/')}/forge/fixtures/rules.dsl.json')['User.saleItem'];
module.exports = { action: 'User.saleItem', handler: compileAction('User.saleItem', spec, { item: require('${root.replace(/\\/g, '/')}/fixtures/tables/item.json') }) };
`;
const gPosix = gate(posixSrc, { action: 'User.saleItem' });
console.log('gate(POSIX 路径):', gPosix.ok ? 'PASS' : 'REJECT', JSON.stringify(gPosix.why));

// 2) 用 POSIX 形态文件（代表开发者环境里过闸后的状态）跑 nightly 同款 replay
fs.writeFileSync(file, posixSrc);
const rep = replay({ recordings: root + '/fixtures/cases', action: 'User.saleItem', generated: genDir, dsl: root + '/forge/fixtures/rules.dsl.json', tables: root + '/fixtures/tables', rules: root + '/fixtures/rules.json', contracts: root + '/out/contracts.json', strictGenerated: true, requireSave: true });
console.log('replay verdict:', rep.verdict, 'cases:', rep.cases, 'byVia:', JSON.stringify(rep.byVia), 'regressions:', rep.regressions);
console.log('regress:', JSON.stringify(rep.regress));
const strictRegress = true;
const viaOk = !!(rep.byVia && rep.byVia.generated === rep.cases && rep.cases > 0);
const wouldPass = rep.verdict === 'PASS' && viaOk && !(strictRegress && rep.regressions);
console.log('nightly 判定（strictRegress 默认开）:', wouldPass ? 'PASS-RETRY' : 'HUMAN');
if (!wouldPass) {
  const fails = rep.perCase.flatMap(x => x.fails || []);
  for (const x of (rep.regress || []).slice(0, 3)) fails.push(`与录制应答不一致 ${x.id}：${x.diffs.map(d => d.path).join(', ')}`);
  console.log('lastFails 示例:', JSON.stringify(fails.slice(0, 5), null, 1));
}
