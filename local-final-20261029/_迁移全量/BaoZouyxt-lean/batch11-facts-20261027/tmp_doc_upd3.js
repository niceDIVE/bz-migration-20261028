const fs=require('fs');
// OPEN-ISSUES 10-1 改成"已解决"
const p='docs/OPEN-ISSUES.md';
let t=fs.readFileSync(p,'utf8');
const oldHead='### 10-1 玩家拿不到种子（**待拍板**，卡住真机播种闭环）';
const newHead='### 10-1 玩家拿不到种子 —— ✅ 已解决（2026-10-27，补家园种子商店）';
t=t.replace(oldHead,newHead);
t=t.replace('三种走法（**需用户选**）：','**处置（用户 2026-10-27 拍板）**：补 `getBackShop`（货架 = 35 行种子三元组 `[itemId, tag, 单价]`）\n＋ `BuyHomeCrop`（**线上名大写 B**，请求 `{itemID,itemNum}`），**平价**（买价 = `item.Price`：100/1000，表里没有购买价列）＋**不限购**。\n`getHomeList` 的 `bShop` 回 1（商店按钮前置 `homeShop > 0`，scripts2.js:48589）。\n真机已闭环：买 2 颗扣 200 银两 → 播种 → 催熟 ×6 → 收获 `item=4808 ×1`、种植经验 80000。原三个候选方案留档：');
t=t.replace('⚠ 在定之前，谁在真机上点家园都会看到"4 块空地 + 种不了"，**这不是 bug**。','⚠ 历史记录：补商店之前真机是"4 块空地 + 种不了"，那是缺动作、不是 bug。');
fs.writeFileSync(p,t,'utf8');
console.log('OPEN-ISSUES 已更新');
