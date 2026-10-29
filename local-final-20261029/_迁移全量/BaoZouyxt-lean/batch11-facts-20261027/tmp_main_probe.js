// 主审自检：C10 九键定义行 + PlantLandUI 入口证据（只读，输出有界）
const fs = require('fs');
const path = require('path');
const ROOT = 'F:\\BaoZouyxt';
const files = ['tools\\index.js', 'tools\\scripts3.js', 'tools\\scripts2.js'];
const keys = ['OBTAINCROP', 'STEAL_CROP_EVENT', 'CROP_CHANGE_STATE', 'EXPEDITE_CROP',
  'CLEAN_DEAD_CROP', 'DISPOSS_HOME_EVENT', 'ONE_KEY_OBTAIN_CROP',
  'ONE_KEY_DISPOSS_HOME_EVENT', 'BATCH_SEED_CROP'];

const out = [];
function p(...a) { out.push(a.join(' ')); console.log(...a); }

for (const rel of files) {
  const full = path.join(ROOT, rel);
  const src = fs.readFileSync(full, 'utf8');
  const lines = src.split('\n');
  p('===== ' + rel + ' lines=' + lines.length + ' chars=' + src.length);
  for (const k of keys) {
    const hits = [];
    for (let i = 0; i < lines.length; i++) {
      let from = 0;
      while (true) {
        const idx = lines[i].indexOf(k, from);
        if (idx < 0) break;
        hits.push({ ln: i + 1, ctx: lines[i].slice(Math.max(0, idx - 40), idx + 90) });
        from = idx + 1;
      }
    }
    p('--- ' + k + ' hits=' + hits.length);
    for (const h of hits.slice(0, 4)) p('  L' + h.ln + ': ' + h.ctx.replace(/\s+/g, ' '));
  }
}

// PlantLandUI 出现点（只给行号+短上下文）
for (const rel of ['tools\\index.js', 'tools\\scripts3.js']) {
  const lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n');
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const idx = lines[i].indexOf('PlantLandUI');
    if (idx >= 0) hits.push('  L' + (i + 1) + ': ' + lines[i].slice(Math.max(0, idx - 60), idx + 80).replace(/\s+/g, ' '));
  }
  p('===== ' + rel + ' PlantLandUI hits=' + hits.length);
  hits.slice(0, 20).forEach(h => p(h));
}

fs.writeFileSync(path.join(ROOT, 'batch11-facts-20261027', 'tmp_main_probe.out.txt'), out.join('\n'), 'utf8');
