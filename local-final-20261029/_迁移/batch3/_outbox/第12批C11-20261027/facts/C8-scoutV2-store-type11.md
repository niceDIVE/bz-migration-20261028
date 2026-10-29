# Scout Report: Store Type 11 (周年礼包货架)

## Q1. Type 11 的货架行渲染与 award 消费点
### 原文引用
F:\BaoZouyxt\tools\scripts2.js:67553-67566 (StoreItem.prototype.showShopUI)
```javascript
c = a.imgname;
s.labels[i].active = !0;
s.labels[i].getComponent(cc.Label).string = r.getText(a.Name);
s.label1s[i].active = !0;
s.label1s[i].getComponent(cc.Label).string = 11 == a.Type ? a.money : a.money[1];
s.label7s[i].active = !0;
11 == a.Type || 2 == a.money[0] ? s.setSpriteFrame(s.shopgoldSps[i], "jinyuanbao", !0, null, cc.assetManager.getBundle("store")) : s.shopgoldSps[i].active = !0;
s.saleLabels[i].getComponent(cc.Label).string = r.getText(1020);
s.rewardStateMap[a.ID] = s.saleSps[i];
s.saleSps[i].active = a.isPay > 0;
var d = r.getText(5074).replace(/\[1\]/g, a.limitnum - a.num);
d = d.replace(/\[2\]/g, a.limitnum);
s.label7s[i].active = !0;
s.label7s[i].getComponent(cc.Label).string = d;
```
F:\BaoZouyxt\tools\scripts2.js:67216-67220 / 26534-26536 (StoreDailyGiftUI / GiftRender)
```javascript
for (var t = this.giftData.award.split("|"), e = 0; e < t.length; ++e) {
var o = cc.instantiate(this.itemRender), i = o.addComponent("GiftRender"), s = t[e].split(",");
i.setData(s); o.active = !0; this.list.addChild(o);
}
// GiftRender.onLoad:
var e = r.getItem(this.rewardData[0], "item");
this.nameLabel.getComponent(cc.Label).string = a.getText(e.Name) + "x" + this.rewardData[1];
```
事实结论：货架行由 StoreItem 渲染且不展示 award；点击弹出 StoreDailyGiftUI 先 split("|") 再 split(",")，由 GiftRender 调 r.getItem(id, "item") 查表显示。

## Q2. 购买链与 REFRESH_GIFT_DATA 监听
### 原文引用
F:\BaoZouyxt\tools\scripts2.js:67252 / F:\BaoZouyxt\tools\index.js:131057-131066
```javascript
// StoreDailyGiftUI.buyCallBack:
if (11 == this.giftData.Type) p.StoreModel.reqBuyAnnPassGift(this.giftData.ID); else {
// StoreModel: reqBuyAnnPassGift / onBuyAnnPassGift:
e.prototype.reqBuyAnnPassGift = function(t) {
g.NetMgr.http.sendReqWithMask(p.HttpConst.ANN_PASS_BUY_GIFT, { giftId: t });
};
e.prototype.onBuyAnnPassGift = function(t, e) {
if (1 == e.eRet) {
T.default.addShowRewardUI1(e.rewardArray, 0, {});
l.MessageCenter.dispatch(h.EvName.REFRESH_GIFT_DATA, e);
}
};
```
F:\BaoZouyxt\tools\scripts2.js:67466 / 67586-67599 (StoreItem: 监听与 refreshGiftData)
```javascript
c.MessageCenter.on(I.EvName.REFRESH_GIFT_DATA, this.refreshGiftData, this);
// refreshGiftData:
for (var n in e.giftData) { o = n; i = e.giftData[n]; }
for (var a = 0; a < this.data.length; a++) if (this.data[a].ID == o) {
this.data[s].num = i;
var l = r.getText(5074).replace(/\[1\]/g, this.data[s].limitnum - i);
l = l.replace(/\[2\]/g, this.data[s].limitnum);
this.label7s[c].getComponent(cc.Label).string = l;
```
事实结论：StoreDailyGiftUI.prototype.buyCallBack 传 this.giftData.ID 调 StoreModel.reqBuyAnnPassGift；StoreItem.refreshGiftData 监听 REFRESH_GIFT_DATA 读回包 e.giftData 字典更新已购数。

## Q3. 限购显示与数据来源
### 原文引用
F:\BaoZouyxt\tools\scripts2.js:67563-67564 / 67248
```javascript
var d = r.getText(5074).replace(/\[1\]/g, a.limitnum - a.num);
d = d.replace(/\[2\]/g, a.limitnum);
// buyCallBack 比对:
} else if (this.giftData.num >= this.giftData.limitnum) {
```
F:\BaoZouyxt\tools\scripts2.js:8555-8564 / F:\BaoZouyxt\tools\index.js:131046-131055
```javascript
// 解包: ID: u[0], Name: u[1], limitnum: u[4], award: u[5], imgname: u[6], money: u[7], num: u[8], Type: 11
g.NetMgr.http.sendRequest(p.HttpConst.ANN_PASS_GET_GIFT_DATA, { roleID: v.RoleBaseInfo.roleID });
// onGetAnnPassGiftData: 1 == e.eRet && dispatch(STORE_SHOW_UI, { type: 11, back: 1, data: e.giftDatas });
```
事实结论：Type 11 货架用 limitnum 与 num 比对及相减；已购次数初始来自 ANN_PASS_GET_GIFT_DATA 回包 e.giftDatas[i][8] 赋给 num，购买后刷新来自 e.giftData[giftId]。

## 未验证段
- scripts3.js:41503 监听 REFRESH_GIFT_DATA 的非商店主界面消费者逻辑未做展开验证。

## 范围外产出
- 无。
