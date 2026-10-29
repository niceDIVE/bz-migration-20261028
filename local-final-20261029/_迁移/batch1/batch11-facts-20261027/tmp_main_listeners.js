// 主审自检②：C10 九个下行回调（MessageCenter.on）函数体 + 发送点载荷，输出到文件供批注
const fs = require('fs');
const path = require('path');
const ROOT = 'F:\\BaoZouyxt';
const src = fs.readFileSync(path.join(ROOT, 'tools\\index.js'), 'utf8').split('\n');
const keys = ['OBTAINCROP', 'STEAL_CROP_EVENT', 'CROP_CHANGE_STATE', 'EXPEDITE_CROP',
  'CLEAN_DEAD_CROP', 'DISPOSS_HOME_EVENT', 'ONE_KEY_OBTAIN_CROP',
  'ONE_KEY_DISPOSS_HOME_EVENT', 'BATCH_SEED_CROP'];
const out = [];
const clip = (s, n) => (s.length > n ? s.slice(0, n) + ' …[截断 len=' + s.length + ']' : s);

out.push('# C10 九键回调体 · 主审自检摘录（tools\\index.js，逐行原文，超长行已截断）');
out.push('');

for (const k of keys) {
  out.push('## ' + k);
  const hits = [];
  for (let i = 0; i < src.length; i++) if (src[i].indexOf('HttpConst.' + k + ',') >= 0) hits.push(i);
  if (!hits.length) { out.push('（未找到 HttpConst.' + k + ', 的引用）'); out.push(''); continue; }
  for (const i of hits) {
    const head = src[i];
    const isOn = head.indexOf('MessageCenter.on') >= 0;
    const isSend = head.indexOf('sendRequest') >= 0;
    out.push('### L' + (i + 1) + (isOn ? ' [下行回调]' : isSend ? ' [发送点]' : ' [其它引用]'));
    const span = isOn ? 60 : 20;
    for (let j = i; j < Math.min(src.length, i + span); j++) out.push('L' + (j + 1) + '| ' + clip(src[j], 300));
    out.push('');
  }
}

fs.writeFileSync(path.join(ROOT, 'batch11-facts-20261027', 'tmp_main_listeners.out.md'), out.join('\n'), 'utf8');
console.log('written lines=' + out.length);
