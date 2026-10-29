# scoutT-homeshop 事实报告

## 一、HomeShopBgUI 组件定义与 setData 函数
- 定义位置：`tools/scripts2.js:31221-31267`，继承自 `HDShopBgUI`（`tools/index.js:55713-55812`，继承自 `UIComponent` `tools/index.js:139626`）。
- HomeShopBgUI 未重写 `setData`，直接继承父类 `UIComponent.prototype.setData`（`tools/index.js:139706-139709`）：
```javascript
// tools/index.js:139706-139709
139706: e.prototype.setData = function(t) {
139707: for (var e = [], o = 1; o < arguments.length; o++) e[o - 1] = arguments[o];
139708: this.data = t;
139709: };
```
- 入参字段读取：`setData` 本身不读入参元素的任何子字段，仅原样赋值给 `this.data = t`。
- `this.data`（即 `shopArr`）在 `HomeShopBgUI.prototype.start`（`tools/scripts2.js:31258`）透传给 `HomeShopUI`：
```javascript
// tools/scripts2.js:31255-31259
31255: r.default.prefabs.load("cultivationUI/HomeShopUI", cc.Prefab, function(t, o) {
31256: var i = cc.instantiate(o);
31257: e.middleNode.addChild(i);
31258: i.getComponent("HomeShopUI").setData(e.data);
31259: });
```

## 二、CROP_SALE_SHOP 事件监听点与读取字段
- 全局仅 1 处监听（位于 `HomeShopUI`）：
  - 注册：`tools/scripts2.js:31453`：`c.MessageCenter.on(u.EvName.CROP_SALE_SHOP, this.changeItemNumEvent, this);`
  - 注销：`tools/scripts2.js:31457`：`c.MessageCenter.off(u.EvName.CROP_SALE_SHOP, this.changeItemNumEvent, this);`
- 监听回调 `changeItemNumEvent` 全文（`tools/scripts2.js:31501-31506`）：
```javascript
31501: e.prototype.changeItemNumEvent = function() {
31502: var t = this.itemList[this.currentIndex];
31503: this.clearNum();
31504: this.currentSelectItem.setItemNum(h.RoleBaseInfo.getItemNum(t[0]));
31505: this.limitLabel.getComponent(cc.Label).string = r.getText("3261") + p.HomePlantModel.shopSaleLimit;
31506: };
```
- 事件入参读取：无入参声明，0 读取事件对象字段。

## 三、GET_BACK_SHOP 与 BUY_HOME_CROP 发送点
- `GET_BACK_SHOP`:
  - `tools/index.js:58150`：`v.NetMgr.http.sendRequest(s.HttpConst.GET_BACK_SHOP, {});`
- `BUY_HOME_CROP`:
  - `tools/index.js:58153-58156`：
```javascript
58153: v.NetMgr.http.sendRequest(s.HttpConst.BUY_HOME_CROP, {
58154: itemID: t,
58155: itemNum: e
58156: });
```
- `scripts2.js` / `scripts3.js` 发送点检索：0 命中 `sendRequest/sendReqWithMask`。上层触发调用为：
  - `tools/scripts2.js:48589`：`d.HomePlantModel.homeShop > 0 && d.HomePlantModel.reqGetSaleShop();`
  - `tools/scripts2.js:31498`：`p.HomePlantModel.reqBuyHomeCrop(this.itemId, this.itemNum);`

## 四、shopArr[i] 子字段读取表（透传至 HomeShopUI / HomeShopRender）
| 字段路径 | 行号 | 原文 |
|---|---|---|
| `shopArr[i][1]` (类别tag: 1货币/2金币) | `tools/scripts2.js:31545` | `for (var t = 0; t < this.data.length; t++) this.data[t][1] == this.selectType && this.itemList.push(this.data[t]);` |
| `shopArr[i][0]` (物品itemId) | `tools/scripts2.js:31335` | `var t = this.data[0], e = r.getItem(t, "item");` |
| `shopArr[i][2]` (单价price) | `tools/scripts2.js:31337` | `this.labels[1].getComponent(cc.Label).string = this.data[2];` |
| `shopArr[i][0]` (物品itemId) | `tools/scripts2.js:31343` | `itemId: this.data[0],` |
| `shopArr[i][2]` (单价price) | `tools/scripts2.js:31344` | `price: this.data[2],` |
| `shopArr[i][0]` (物品itemId) | `tools/scripts2.js:31504` | `this.currentSelectItem.setItemNum(h.RoleBaseInfo.getItemNum(t[0]));` |

## 未验证段
未验证段：无

## 范围外产出
无
