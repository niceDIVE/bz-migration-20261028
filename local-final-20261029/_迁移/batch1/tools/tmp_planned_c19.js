'use strict';
/** 一次性脚本：为 C19 生成 planned-changes.json（47 项 diff，8 条规则） */
const fs = require('fs');
const p = 'F:/BaoZouyxt/tools/golden/planned-changes.json';
const shopDs = [];
const dsLeaves = [];
for (let i = 1; i <= 22; i++) { shopDs.push(['getSkillSkinShop', 'shopData.ds.' + i]); dsLeaves.push(String(i)); }
const actIds = [];
for (let i = 0; i <= 12; i++) actIds.push(['getSkillSkinActiveShop', 'shopDatas[' + i + ']']);
const rules = [
  { id: 'c19-getSkillSkinShop', action: 'getSkillSkinShop',
    field: ['eRet', 'price', 'freeTime'].concat(dsLeaves), expect: 25,
    allowSigma: [['getSkillSkinShop', 'eRet'], ['getSkillSkinShop', 'shopData.price'], ['getSkillSkinShop', 'shopData.freeTime']].concat(shopDs),
    ev: 'index.js:60558',
    why: 'C19 货架门（scripts3.js:82904-82916）：eRet1 + shopData.ds{22 行 type=1:已购数} + price=20 元宝/次（自定申报）+ freeTime=0；eRet==1 才 showShop 开 SkinShopUI。' },
  { id: 'c19-getSkillSkinActiveShop', action: 'getSkillSkinActiveShop',
    field: ['eRet', 'endTime', 'shopDatas', 'isSelect'], expect: 16,
    allowSigma: [['getSkillSkinActiveShop', 'eRet'], ['getSkillSkinActiveShop', 'endTime'], ['getSkillSkinActiveShop', 'isSelect']].concat(actIds),
    ev: 'index.js:60569',
    why: 'C19 活动商店门（scripts3.js:82829-82836）：eRet1 + endTime(now+30 天常开) + shopDatas=13 个 type=2 行 id + isSelect=0；GET_SKIN_ACTIVE_DATA → 活动页 1027 切页。' },
  { id: 'c19-buySkillSkinShop', action: 'buySkillSkinShop', field: ['eRet'], expect: 1,
    allowSigma: [['buySkillSkinShop', 'eRet']], ev: 'index.js:60560',
    why: 'C19 买道具（82873）：空请求 id=0 非 type=1 → eRet 2（监听只有 1 分支）；成功路径才带 shopData.ds/rewardArray/note。' },
  { id: 'c19-buySkillSkinActiveShop', action: 'buySkillSkinActiveShop', field: ['eRet'], expect: 1,
    allowSigma: [['buySkillSkinActiveShop', 'eRet']], ev: 'index.js:60570',
    why: 'C19 买活动皮肤（82815）：空请求 ids 空 → eRet 2（2→6003145 提示）；成功路径带 rewardSkillSkin/isSelect/note。' },
  { id: 'c19-refreshSkillSkinShop', action: 'refreshSkillSkinShop', field: ['eRet'], expect: 1,
    allowSigma: [['refreshSkillSkinShop', 'eRet']], ev: 'index.js:60559',
    why: 'C19 刷新（82885）：空请求（清档元宝 0 < 20）→ eRet 2；成功路径带 shopData + note.eco。' },
  { id: 'c19-equipSkillSkin', action: 'equipSkillSkin', field: ['eRet'], expect: 1,
    allowSigma: [['equipSkillSkin', 'eRet']], ev: 'index.js:60561',
    why: 'C19 装皮肤（82854）：空请求未拥有 → eRet 2；成功路径带 skillSkinWeap。' },
  { id: 'c19-removeSkillSkin', action: 'removeSkillSkin', field: ['eRet', 'skillSkinWeap', '0'], expect: 2,
    allowSigma: [['removeSkillSkin', 'eRet'], ['removeSkillSkin', 'skillSkinWeap.0']], ev: 'index.js:60562',
    why: 'C19 卸皮肤（82842）：eRet1 + skillSkinWeap{槽:0}（成功路径，无前置校验）。' },
];
fs.writeFileSync(p, JSON.stringify(rules, null, 1) + '\n', 'utf8');
console.log('planned rules:', rules.length, 'expect sum:', rules.reduce((s, r) => s + r.expect, 0));
