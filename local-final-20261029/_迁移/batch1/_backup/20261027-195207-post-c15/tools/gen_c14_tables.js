'use strict';
/**
 * gen_c14_tables.js —— 第 15 批 C14〔斗狗〕紧凑表（2026-10-27）
 *
 * 产出 hotfix-patch/core/bz-c14.generated.js：
 *   BZ_C14 = {
 *     feedItem:  狗粮道具 id（item.json 里 Name == 2101508 的行）        —— 实证 6285
 *     feedPer:   每次喂食进度增量（constant 表 129）                     —— 实证 100
 *     feedCap:   喂满上限（constant 表 128）                             —— 实证 10000
 *     dogSmall:  小狗 id（home_plant_details id:35 num）                 —— 实证 11193
 *     dogBig:    大狗 id（home_plant_details id:36 num，喂满升级目标）   —— 实证 11194
 *   }
 *
 * 口径依据（只读取证，见 batch15-facts-20261027\C14-取证与策略.md）：
 *   scripts2.js:6356-6360  getConstByID("128")/("129") → 喂满上限/每份增量
 *   scripts2.js:18240-18265 BuyItemUI16 满进度判定 + 11194 升级动画分派
 *   scripts2.js:18256 狗粮固定 itemId 6285（label 用 getText(2101508) = item 6285 的 Name）
 *   cfg\dump\constant.json：128 = 10000，129 = 100
 *   cfg\dump\home_plant_details.json：{id:35,num:11193} / {id:36,num:11194}
 *
 * 用法：node tools\gen_c14_tables.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DUMP = path.join(ROOT, 'tools', 'cfg', 'dump');
const OUT = path.join(ROOT, 'hotfix-patch', 'core', 'bz-c14.generated.js');

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DUMP, name), 'utf8'));
}

const constant = readJson('constant.json');
const item = readJson('item.json');
const plant = readJson('home_plant_details.json');

// constant.json：明文行 {"ID":128,"Date":10000,"Date_en":10000}
function constValue(id) {
  const row = constant.data && constant.data[String(id)];
  if (!row) throw new Error('constant ' + id + ' 缺失');
  const v = row.Date != null ? row.Date : (row._data && row._data._value && row._data._value[0]);
  const n = Number(v);
  if (!(n > 0)) throw new Error('constant ' + id + ' 非法: ' + JSON.stringify(v));
  return n;
}
const feedCap = constValue(128);
const feedPer = constValue(129);

// item.json：狗粮 = Name == 2101508（客户端喂狗 UI label 用 l.getText(2101508)）
let feedItem = 0;
for (const id of Object.keys(item.data || {})) {
  const row = item.data[id];
  if (row && Number(row.Name) === 2101508) { feedItem = Number(id); break; }
}
if (!(feedItem > 0)) throw new Error('item.json 里找不到 Name==2101508 的狗粮');

// home_plant_details：狗 id 行（id 35 / 36）
const nums = {};
for (const id of Object.keys(plant.data || {})) {
  const row = plant.data[id];
  if (!row) continue;
  const n = Number(row.num);
  if (n === 11193 || n === 11194) nums[n] = n;
}
const dogSmall = nums[11193] || 0;
const dogBig = nums[11194] || 0;
if (!(dogSmall > 0 && dogBig > 0)) throw new Error('home_plant_details 狗 id 行缺失（11193/11194）');

const out = {
  generatedAt: new Date().toISOString(),
  src: { constant: '128/129', item: 'Name=2101508', plant: 'id:35/36' },
  feedItem: feedItem,
  feedPer: feedPer,
  feedCap: feedCap,
  dogSmall: dogSmall,
  dogBig: dogBig,
};

const js = '/* C14 斗狗表（tools/gen_c14_tables.js 生成，请勿手改）'
  + '  口径: 喂狗=狗粮 ' + feedItem + ' 每份 +' + feedPer + ' 满 ' + feedCap + ' 升大狗 ' + dogSmall + '→' + dogBig + ' */\n'
  + 'var BZ_C14 = ' + JSON.stringify(out) + ';\n';

fs.writeFileSync(OUT, js, 'utf8');
console.log('[gen_c14] wrote ' + OUT);
console.log('[gen_c14] feedItem=' + feedItem + ' feedPer=' + feedPer + ' feedCap=' + feedCap
  + ' dogSmall=' + dogSmall + ' dogBig=' + dogBig);
