// 主审自检③：补 DISPOSS_HOME_EVENT / BATCH_SEED_CROP 定义行 + soilArr/plantSeedData 数据来源
const fs = require('fs');
const path = require('path');
const ROOT = 'F:\\BaoZouyxt';
const files = ['tools\\index.js', 'tools\\scripts3.js', 'tools\\scripts2.js'];
const out = [];
const p = (...a) => out.push(a.join(' '));
const clip = (s, n) => (s.length > n ? s.slice(0, n) + ' …[len=' + s.length + ']' : s);

// 1) HttpConst 定义行
for (const rel of files) {
  const lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n');
  for (const k of ['DISPOSS_HOME_EVENT', 'BATCH_SEED_CROP', 'RECLAIM_LAND', 'BUY_HOME_CROP', 'GET_BACK_SHOP', 'HOME_SPECIAL_AWARD']) {
    for (let i = 0; i < lines.length; i++) {
      if (new RegExp('\\b' + k + '\\s*:').test(lines[i])) p('[定义] ' + rel + ':' + (i + 1) + ' | ' + clip(lines[i].trim(), 160));
    }
  }
}

// 2) DISPOSS_HOME_EVENT 发送点上下文（L58195-L58216）
{
  const lines = fs.readFileSync(path.join(ROOT, 'tools\\index.js'), 'utf8').split('\n');
  p('');
  p('[上下文] tools\\index.js L58195-L58216');
  for (let i = 58194; i < 58216; i++) p('L' + (i + 1) + '| ' + clip(lines[i], 240));
}

// 3) soilArr / plantSeedData / recentSs 的赋值与来源
for (const rel of files) {
  const lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/this\.soilArr\s*=|this\.plantSeedData\s*=|this\.recentSs\s*=|soilArr\s*:\s*|plantSeedData\s*:\s*|plantLandData|homeData\s*=\s*/.test(l)) {
      p('[数据源] ' + rel + ':' + (i + 1) + ' | ' + clip(l.trim(), 200));
    }
  }
}

fs.writeFileSync(path.join(ROOT, 'batch11-facts-20261027', 'tmp_main_probe3.out.txt'), out.join('\n'), 'utf8');
console.log('lines=' + out.length);
