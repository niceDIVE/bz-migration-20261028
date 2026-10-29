'use strict';
/**
 * gen_item_effects.js —— 把 live dump 出来的完整 item 表压成"效果事实表"。
 *
 * 数据来源（**不是** cfg/dump/item.json 那份截断导出）：
 *   在 live 进程里用 `__require('ConfigMgr').getTable('item')` 取全表 6525 行，
 *   由 `jsb.fileUtils.writeStringToFile` 落成设备文件后 `adb pull` 到
 *   `tools/cfg/dump/item.full.json`（1.2 MB，6525 行，含 Effect/Data1..5/Type/Name/Price…）。
 *   dump 命令（可复现，不写档、不打屏）：
 *     get:(function(){var C=__require('ConfigMgr');var T=C.getTable('item');var cols=[...];
 *       var s=JSON.stringify(Object.keys(T).map(...));return jsb.fileUtils.writeStringToFile(s,'<files>/item.full.json');})()
 *   证据：`ConfigMgr` 有 `getTable`/`getItem`，`getTable('item')` 返回 6525 条；SOTA R15 §2 的 A1/A2 均成立。
 *
 * 产物 `tools/facts/item-effects.json`：{ "<itemID>": {e:Effect, d1,d2,d3, t:Type, n:Name} }
 *   —— 只保留"判效果要用"的列，体积从 1.2 MB 压到 ~200 KB，方便 handler/生成器引用。
 *
 * 跑法：node tools/gen_item_effects.js   退出码 0 = 成功
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'tools', 'cfg', 'dump', 'item.full.json');
const DST = path.join(ROOT, 'tools', 'facts', 'item-effects.json');

if (!fs.existsSync(SRC)) {
  console.error('找不到 ' + SRC + '（需要先在 live 里 dump 再 adb pull，见文件头）');
  process.exit(2);
}
const rows = JSON.parse(fs.readFileSync(SRC, 'utf8'));
if (!Array.isArray(rows)) { console.error('item.full.json 不是数组'); process.exit(3); }

const out = {};
const byEffect = {};
let dup = 0;
for (const r of rows) {
  const id = parseInt(r.ID, 10);
  if (!(id > 0)) continue;
  if (Object.prototype.hasOwnProperty.call(out, id)) { dup++; continue; }
  out[id] = {
    e: parseInt(r.Effect, 10) || 0,
    d1: parseInt(r.Data1, 10) || 0,
    d2: parseInt(r.Data2, 10) || 0,
    d3: parseInt(r.Data3, 10) || 0,
    t: parseInt(r.Type, 10) || 0,
    n: r.Name,
  };
  byEffect[out[id].e] = (byEffect[out[id].e] || 0) + 1;
}
const payload = {
  __meta: {
    src: 'tools/cfg/dump/item.full.json (live dump: __require("ConfigMgr").getTable("item"))',
    rows: rows.length,
    items: Object.keys(out).length,
    dupSkipped: dup,
    effectCodes: Object.keys(byEffect).length,
    how: 'node tools/gen_item_effects.js',
    note: 'e=Effect, d1..d3=Data1..3, t=Type, n=Name（Name 是 lang id，不是文本）',
  },
  effects: out,
  byEffect: byEffect,
};
fs.writeFileSync(DST, JSON.stringify(payload), 'utf8');
console.log('ITEM-EFFECTS OK  行=' + rows.length + ' 物品=' + Object.keys(out).length
  + ' 重复跳过=' + dup + ' Effect码=' + Object.keys(byEffect).length
  + ' bytes=' + fs.statSync(DST).size + ' -> tools/facts/item-effects.json');
