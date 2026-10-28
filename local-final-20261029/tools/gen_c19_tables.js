'use strict';
/**
 * gen_c19_tables.js —— 第 19 批 C19〔技能皮肤商店〕紧凑表（2026-10-27，A 轮第 1 批）
 *
 * 产出 hotfix-patch/core/bz-c19.generated.js：
 *   BZ_C19 = {
 *     refreshPrice: 20,     // 刷新费（自定，回执申报；shopData.price 显示用）
 *     activeDays: 30,       // 活动商店常开续期（默认拍板第 2 条：过期活动常开、自动续期）
 *     shop: {行id: {item, price, type, weight, rare}},   // skillskin_shop 35 行
 *     skins: {skillskin id: {skill, type}},               // skillskin 39 行（校验用）
 *   }
 *
 * 口径依据（取证：batch19-facts-20261027\C19-取证与策略.md + 报告-W1/W2/W3）：
 *   scripts3.js SkinModel 82783-83011；shopData.ds={行id:已购数}；type=1 → SkinShopUI（卖道具 id），
 *   type=2 → SkinActiveShopUI（直售 skillskin id，17/2/23… 均在 1..39）；skillskin.unlock 空/38。
 *   price 照表（元宝，默认拍板第 1 条：无币种列按元宝）；窗口 2017/2026-08 均过期 → 常开。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DUMP = path.join(ROOT, 'tools', 'cfg', 'dump');
const OUT = path.join(ROOT, 'hotfix-patch', 'core', 'bz-c19.generated.js');

const readJson = (n) => JSON.parse(fs.readFileSync(path.join(DUMP, n), 'utf8'));
const shop = readJson('skillskin_shop.json');
const skins = readJson('skillskin.json');

const shopOut = {};
for (const id of Object.keys(shop.data || {})) {
  const r = shop.data[id];
  if (!r) continue;
  shopOut[String(r.id)] = {
    item: parseInt(r.item, 10) || 0,
    price: parseInt(r.price, 10) || 0,
    type: parseInt(r.type, 10) || 0,
    weight: parseInt(r.weight, 10) || 0,
    rare: parseInt(r.rare, 10) || 0,
  };
}

const skinsOut = {};
for (const id of Object.keys(skins.data || {})) {
  const r = skins.data[id];
  if (!r) continue;
  skinsOut[String(r.id)] = { skill: parseInt(r.skill, 10) || 0, type: parseInt(r.type, 10) || 0 };
}

// type=2 行的 item 必须是合法 skillskin id（直售皮肤）；不合法直接构建期报错（防错发）
let checked = 0;
for (const id of Object.keys(shopOut)) {
  const r = shopOut[id];
  if (r.type === 2) {
    checked++;
    if (!skinsOut[String(r.item)]) throw new Error('skillskin_shop[' + id + '].item=' + r.item + ' 不是合法 skillskin id');
  }
}

const out = {
  generatedAt: new Date().toISOString(),
  src: { shop: 'skillskin_shop', skins: 'skillskin' },
  refreshPrice: 20,
  activeDays: 30,
  shop: shopOut,
  skins: skinsOut,
};

const js = '/* C19 技能皮肤商店表（tools/gen_c19_tables.js 生成，请勿手改）\n'
  + ' * 货架 ' + Object.keys(shopOut).length + ' 行 | type=2 直售皮肤行 ' + checked
  + ' 条（item=skillskin id 已校验） | 刷新 ' + out.refreshPrice + ' 元宝/次 | 活动常开 ' + out.activeDays + ' 天 */\n'
  + 'var BZ_C19 = ' + JSON.stringify(out) + ';\n';

fs.writeFileSync(OUT, js, 'utf8');
console.log('[gen_c19] wrote ' + OUT);
console.log('[gen_c19] shop=' + Object.keys(shopOut).length + ' skins=' + Object.keys(skinsOut).length + ' activeRows=' + checked);
