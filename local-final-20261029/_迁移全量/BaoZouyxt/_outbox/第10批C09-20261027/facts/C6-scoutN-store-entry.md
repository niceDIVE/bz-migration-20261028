# `User.GetPayShowData` 应答契约取证（判断"最小摸奖商城"可不可行）

取证文件（只读，全部行号来自 read 工具）：
- `F:\BaoZouyxt\tools\index.js`（149447 行）
- `F:\BaoZouyxt\tools\scripts2.js`（81775 行）
- `F:\BaoZouyxt\tools\cfg\dump\shop_entrance.json`、`shop.json`

**速览（三句话）**

1. `GetPayShowData` 的回包**只喂"商品格子列表"**（`type` 被硬编码折算成 2 或 8），**不喂页签**；页签列表根本不看这个回包。
2. 页签的数据源是**另一支动作 `User.GetShopAllActive`** 的 `shopActiveList`（`index.js:60047`、`131271`），叠加**本地配置表 `shop_entrance`**（`scripts2.js:8951-8969`）——服务端只提供一个"行号数组"，页签内容（图标/名称/类型）全在客户端 cfg 里。
3. type=9 的点击链与商品数据完全无关（`openBuyGoldEvent` 的 n==9 分支不读 `listData`），但要真正弹出摸奖界面还差 `TrickLotteryModel.reqData()` 对应的动作 + 一个客户端武功等级门槛。

| 问题 | 结论 |
|---|---|
| 页签列表是 `GetPayShowData` 回的吗？ | **不是**。是 `GetShopAllActive` 的 `shopActiveList` ∩ `shop_entrance.json` |
| 不实现 `GetPayShowData` 会怎样？ | 默认开商城（`back:1`）走这条请求，**回包不来 → 界面空白**（不抛异常），页签也永远不出现（因为走的是另一条 `back==1` 分支，见 §3.2） |
| type=9 页签要不要商品数据？ | **不要**。n==9 分支只做 `TrickLotteryModel.reqData()` + 切场景 |
| 只补一个回包够不够？ | 页签"出现"够；"点开摸奖界面"还要别的东西（见 §5） |

---

## 1. 注册点与回调

### 1.1 动作名

`index.js:59518`
```js
59518: GET_PAY_SHOW_DATA: "User.GetPayShowData",
```

### 1.2 注册点（`StoreModel.init` 内）

`index.js:130729-130731`
```js
130729: e.prototype.init = function() {
130730: var t = this;
130731: l.MessageCenter.on(p.HttpConst.GET_PAY_SHOW_DATA, this.onOpenStoreList, this);
```

> 注意同一屏还有 `index.js:130775`：`l.MessageCenter.on(p.HttpConst.GET_SHOP_ALL_ACTIVE, this.onGetShopAllActive, this);` —— 页签走的是这条（见 §3）。

### 1.3 `onOpenStoreList` 函数体（逐行贴全，`index.js:131212-131232`）

```js
131212: e.prototype.onOpenStoreList = function(t, e) {
131213: if (1 == e.eRet && e.hasOwnProperty("ShopArray")) {
131214: var o = {}, i = [];
131215: for (var n in e.ShopArray) {
131216: i.push(e.ShopArray[n]);
131217: o[e.ShopArray[n].ID] = e.ShopArray[n];
131218: }
131219: this.productDic = o;
131220: if (i.length) {
131221: var r = 0;
131222: null != this.objData && this.objData.hasOwnProperty("back") && (r = this.objData.back);
131223: this.objData = null;
131224: l.MessageCenter.dispatch(h.EvName.STORE_SHOW_UI, {
131225: type: null != e.type && 1 == e.type ? 8 : 2,
131226: listData: i,
131227: back: r,
131228: openState: e.openState
131229: });
131230: }
131231: }
131232: };
```

### 1.4 它读了回包哪些字段 / 守卫类型 / 缺了会不会抛

| 回包字段 | 读取点 | 守卫 | 缺字段后果 |
|---|---|---|---|
| `eRet` | `131213` `1 == e.eRet` | 硬比较 | `!=1` → 整个函数空转，**不抛** |
| `ShopArray` | `131213` `hasOwnProperty("ShopArray")`；`131215` `for...in` | `hasOwnProperty` | 缺 → 整段跳过，**不抛** |
| `ShopArray[x].ID` | `131217` `o[e.ShopArray[n].ID]` | **无守卫** | 元素不是对象 / 无 `ID` → 键变 `"undefined"`（只污染 `productDic`），**不抛** |
| `type` | `131225` `null != e.type && 1 == e.type ? 8 : 2` | `null !=` 比较 | 缺 → 一律当 `2`；`type` 只能是 2 或 8，**无法产生 9** |
| `openState` | `131228` 原样透传 | 无读取（只转发） | 缺 → `undefined` 透传；下游只在 `8 == n` 时用（`scripts2.js:8486`） |
| （非回包）`this.objData.back` | `131222` | `null !=` + `hasOwnProperty` | 缺 → `back = 0` |

**抛异常风险：无。** 全函数只对 `e` 做 `hasOwnProperty` 和比较；`for...in` 遇到 `ShopArray: null` 也只是零次迭代（ES 规范），`i.length` 为 `0` 时连 `STORE_SHOW_UI` 都不派发（`131220`）。

**这一节的关键事实**：`onOpenStoreList` 一次都没有读 `shop_entrance`、没有产出任何"页签"结构，`type` 被二元化为 2/8。**它不可能是 type=9 页签的来源。**

### 1.5 谁发这支请求（请求侧契约，供对照）

`index.js:130978-130998`（`reqStoreList`）
```js
130978: e.prototype.reqStoreList = function(t) {
130979: var e = this;
130980: void 0 === t && (t = null);
130981: if (E.LoginMgr.isMiniIos(1)) c.default.show("此功能未开放"); else if (!A.CrossServiceModel.isEnterCrossServer()) {
130982: null == t ? t = {
130983: back: 1
130984: } : t.hasOwnProperty("back") || (t.back = 1);
130985: null == this.chargeShopUI ? u.default.loadFrom(u.default.prefabs, "storeUI/ChargeShopUI", cc.Prefab).then(function(o) {
130986: var i = cc.instantiate(o);
130987: i.getComponent("ChargeShopUI").setData(t);
130988: f.PopUpMgr.addPopUp(i, d.LayerMgr.popUpLayer);
130989: e.chargeShopUI = i;
130990: }) : 1 == t.type ? this.reqMarketList({
130991: type: 1,
130992: back: t.back
130993: }) : 8 == t.type ? this.reqYuanBaoList({
130994: type: t.type,
130995: back: t.back
130996: }) : this.reqOnStoreList(t);
130997: }
130998: };
```

`index.js:130999-131012`（`reqOnStoreList` —— 真正的 `GetPayShowData` 发送点）
```js
130999: e.prototype.reqOnStoreList = function(t) {
131000: void 0 === t && (t = null);
131001: this.objData = {
131002: back: 1
131003: };
131004: null != t && (this.objData = {
131005: back: t.back
131006: });
131007: r.mode == r.M_WEB || (cc.sys.os == cc.sys.OS_IOS && 1 == r.specialEdition ? g.NetMgr.http.sendRequest(p.HttpConst.GET_IOSPAY_SHOW_DATA, {
131008: roleID: v.RoleBaseInfo.roleID
131009: }) : g.NetMgr.http.sendRequest(p.HttpConst.GET_PAY_SHOW_DATA, {
131010: roleID: v.RoleBaseInfo.roleID
131011: }));
131012: };
```

请求体只有 `{roleID}`；`objData = {back}` 是**本地**状态，不是请求字段（`131222` 读的是 `this.objData`，不是回包）。

---

## 2. `STORE_SHOW_UI` 的接收方：`ChargeShopUI.openBuyGoldEvent`

### 2.1 事件名与接收注册

- 事件名：`index.js:45519` `STORE_SHOW_UI: "storeShowUI",`
- 接收方注册：`scripts2.js:8384-8385`
```js
8384: o.prototype.addEventListeners = function() {
8385: l.MessageCenter.on(I.EvName.STORE_SHOW_UI, this.openBuyGoldEvent, this);
```
- 组件：`scripts2.js:8174-8176`（模块名 `ChargeShopUI`）、`8204: t.prefabName = "storeUI/ChargeShopUI";`
- 卸载：`scripts2.js:8401` `l.MessageCenter.off(I.EvName.STORE_SHOW_UI, this.openBuyGoldEvent, this);`

> `scripts2.js` 里没有第二处 `STORE_SHOW_UI` 订阅；`index.js` 里另有 4 处**派发**（`57394`、`57434`、`130765`、`131051`、`131112`/`131116`）——都是别的店（市场/成长基金/元宝/通行证），最终也落到同一个 `openBuyGoldEvent`。

### 2.2 `openBuyGoldEvent` 函数体（逐行贴全，`scripts2.js:8472-8744`）

```js
8472: o.prototype.openBuyGoldEvent = function(e, o) {
8473: var i = this;
8474: if (!this.lockScreen) {
8475: var s = cc.view.getVisibleSize();
8476: if (null != o) {
8477: var n = 0;
8478: o.hasOwnProperty("type") && (n = o.type);
8479: this.listData.length && this.selectType != n && (this.start_index = 0);
8480: this.listData = [];
8481: this.selectType = n;
8482: var r = 0;
8483: o.hasOwnProperty("back") && (r = o.back);
8484: cc.log("======type=======", n);
8485: this.backMainScreen = 1 == r;
8486: this.extraGoldDes.active = 8 == n && 1 == o.openState;
8487: this.backBtn.active = 9 != n && 10 != n;
8488: this.trickBtnBack.active = 9 == n;
8489: if (3 != n) if (5 != n) if (6 != n) if (9 != n) if (10 != n) if (12 != n) {
8490: this.lockScreen = !0;
8491: this.changePlayerAction();
8492: this.childNode.destroyAllChildren();
8493: if (2 == n || 8 == n) {
8494: this.treasureContent.getComponent("UISuperLayout").removeAllChilds();
8495: this.treasuresScroll.opacity = 0;
8496: this.treasuresScroll.x = s.width + s.width / 2;
8497: 0 == this.addBtn.active && (this.addBtn.active = !0);
8498: 0 == this.addBtn2.active && (this.addBtn2.active = !0);
8499: 0 == this.yukaBtn.active && (this.yukaBtn.active = !0);
8500: this.lockAddGoldScreen = !0;
8501: this.isStoreContent = !0;
8502: this.listData = o.listData;
8503: this.listData.back = this.backType;
8504: this.listData.openState = o.openState;
8505: this.checkGoldData();
8506: this.load_recode();
8507: } else if (1 == n) {
8508: var a = o.market;
8509: for (var l in a) {
8510: var p = {
8511: ID: (u = a[l])[0],
8512: Type: u[1],
8513: Name: u[2],
8514: Description: u[3],
8515: Data: u[4],
8516: price: u[5],
8517: num: u[6],
8518: limitType: u[7],
8519: buyCount: u[8],
8520: isUsed: !1,
8521: icon: u[10]
8522: };
8523: this.listData.push(p);
8524: }
8525: this.listData.back = this.backType;
8526: this.isStoreContent = !0;
8527: this.load_recode();
8528: } else if (7 == n) {
8529: this.isStoreContent = !0;
8530: var h = o.data;
8531: for (var l in h) {
8532: var d = {
8533: ID: (u = h[l])[0],
8534: Name: u[1],
8535: name2: u[2],
8536: des: u[3],
8537: limitnum: u[4],
8538: award: u[5],
8539: imgname: u[6],
8540: money: u[7],
8541: num: u[8],
8542: Type: 7,
8543: endTime: u[10],
8544: coupon: u.length > 11 ? u[11] : 0
8545: };
8546: this.listData.push(d);
8547: }
8548: this.listData.back = this.backType;
8549: this.load_recode();
8550: } else if (11 == n) {
8551: this.yukaBtn.active = !1;
8552: this.isStoreContent = !0;
8553: h = o.data;
8554: for (var l in h) {
8555: var u, g = {
8556: ID: (u = h[l])[0],
8557: Name: u[1],
8558: name2: u[2],
8559: des: u[3],
8560: limitnum: u[4],
8561: award: u[5],
8562: imgname: u[6],
8563: money: u[7],
8564: num: u[8],
8565: Type: 11,
8566: endTime: u[10]
8567: };
8568: this.listData.push(g);
8569: }
8570: this.listData.back = this.backType;
8571: this.load_recode();
8572: }
8573: if (this.isStoreContent) {
8574: this.storeContent.opacity = 255;
8575: cc.tween(this.storeContent).to(.6, {
8576: position: cc.v3(0, this.storeContent.y, 0)
8577: }).delay(.1).call(function() {
8578: i.selectType > 0 && !E.WeiXinQQModel.isBytedanceGame() && (i.spriteTalk.active = !0);
8579: i.lockScreen = !1;
8580: i.storeContent.opacity = 255;
8581: i.storeContent.x = 0;
8582: }).start();
8583: var y = {
8584: 1: 4666,
8585: 2: 4667
8586: };
8587: y[this.selectType] && (this.talkLabel.getComponent(cc.Label).string = c.getText(y[this.selectType]));
8588: } else this.addShopAction().then(function() {
8589: 255 == i.storeDown.opacity && cc.tween(i.storeDown).to(.5, {
8590: scaleX: 1,
8591: scaleY: 1,
8592: position: cc.v3(0, i.storeDown.position.y, 0)
8593: }).call(function() {
8594: i.lockAddGoldScreen = !1;
8595: i.lockScreen = !1;
8596: i.storeContent.opacity = 0;
8597: }).start();
8598: });
8599: this.isStoreContent ? cc.tween(this.storeDown).to(.5, {
8600: scale: 1,
8601: position: cc.v3(-s.width, this.storeDown.position.y, 0)
8602: }).call(function() {
8603: i.storeDown.opacity = 0;
8604: }).start() : this.addShopAction().then(function() {
8605: 255 == i.storeDown.opacity && cc.tween(i.storeDown).to(.5, {
8606: scaleX: 1,
8607: scaleY: 1,
8608: position: cc.v3(0, i.storeDown.position.y, 0)
8609: }).call(function() {
8610: i.lockAddGoldScreen = !1;
8611: i.lockScreen = !1;
8612: i.storeContent.opacity = 0;
8613: }).start();
8614: });
8615: } else {
8616: this.isStoreContent = !1;
8617: this.lockScreen = !0;
8618: this.listData = o.ay;
8619: this.childNode.destroyAllChildren();
8620: this.add_load_recode();
8621: this.treasuresScroll.opacity = 255;
8622: cc.tween(this.treasuresScroll).to(.6, {
8623: position: cc.v3(0, this.treasuresScroll.y, 0)
8624: }).delay(.1).call(function() {
8625: i.selectType > 0 && !E.WeiXinQQModel.isBytedanceGame() && (i.spriteTalk.active = !0);
8626: i.lockScreen = !1;
8627: i.treasuresScroll.opacity = 255;
8628: i.treasuresScroll.x = 0;
8629: }).start();
8630: if (this.openTween) {
8631: this.openTween.stop();
8632: this.openTween = null;
8633: }
8634: this.openTween = cc.tween(this.storeDown).to(.5, {
8635: scale: 1,
8636: position: cc.v3(-s.width, this.storeDown.position.y, 0)
8637: }).call(function() {
8638: i.storeDown.opacity = 0;
8639: i.lockScreen = !1;
8640: }).start();
8641: } else {
8642: this.lockScreen = !0;
8643: this.childNode.destroyAllChildren();
8644: Promise.resolve().then(function() {
8645: return t("../../../scripts3/model3/AlchemyModel");
8646: }).then(function(t) {
8647: t.AlchemyModel.reqAlchemyMsg();
8648: });
8649: this.isStoreContent = !1;
8650: if (this.openTween) {
8651: this.openTween.stop();
8652: this.openTween = null;
8653: }
8654: this.openTween = cc.tween(this.storeDown).to(.5, {
8655: scale: 1,
8656: position: cc.v3(-s.width, this.storeDown.position.y, 0)
8657: }).call(function() {
8658: i.storeDown.opacity = 0;
8659: i.lockScreen = !1;
8660: }).start();
8661: } else {
8662: this.lockScreen = !0;
8663: this.childNode.destroyAllChildren();
8664: this.addBtn.active = !1;
8665: this.addBtn2.active = !1;
8666: this.yukaBtn.active = !1;
8667: Promise.resolve().then(function() {
8668: return t("../../../scripts3/model3/TrickLotteryModel");
8669: }).then(function(t) {
8670: t.TrickLotteryModel.reqData();
8671: });
8672: this.isStoreContent = !1;
8673: if (this.openTween) {
8674: this.openTween.stop();
8675: this.openTween = null;
8676: }
8677: this.openTween = cc.tween(this.storeDown).to(.5, {
8678: scale: 1,
8679: position: cc.v3(-s.width, this.storeDown.position.y, 0)
8680: }).call(function() {
8681: i.storeDown.opacity = 0;
8682: i.lockScreen = !1;
8683: }).start();
8684: } else {
8685: this.lockScreen = !0;
8686: this.childNode.destroyAllChildren();
8687: this.addBtn.active = !1;
8688: this.addBtn2.active = !1;
8689: this.yukaBtn.active = !1;
8690: f.HalloweenModel.reqGetInviteData();
8691: this.isStoreContent = !1;
8692: if (this.openTween) {
8693: this.openTween.stop();
8694: this.openTween = null;
8695: }
8696: this.openTween = cc.tween(this.storeDown).to(.5, {
8697: scale: 1,
8698: position: cc.v3(-s.width, this.storeDown.position.y, 0)
8699: }).call(function() {
8700: i.storeDown.opacity = 0;
8701: i.lockScreen = !1;
8702: }).start();
8703: } else {
8704: this.lockScreen = !0;
8705: this.childNode.destroyAllChildren();
8706: this.addBtn.active = !1;
8707: this.addBtn2.active = !1;
8708: this.yukaBtn.active = !1;
8709: v.StoreModel.openOptionalGiftUI(!1);
8710: this.isStoreContent = !1;
8711: if (this.openTween) {
8712: this.openTween.stop();
8713: this.openTween = null;
8714: }
8715: this.openTween = cc.tween(this.storeDown).to(.5, {
8716: scale: 1,
8717: position: cc.v3(-s.width, this.storeDown.position.y, 0)
8718: }).call(function() {
8719: i.storeDown.opacity = 0;
8720: i.lockScreen = !1;
8721: }).start();
8722: } else {
8723: this.lockScreen = !0;
8724: this.childNode.destroyAllChildren();
8725: this.addBtn.active = !1;
8726: this.addBtn2.active = !1;
8727: this.yukaBtn.active = !1;
8728: m.GrowthModel.reqGrowUpData();
8729: this.isStoreContent = !1;
8730: if (this.openTween) {
8731: this.openTween.stop();
8732: this.openTween = null;
8733: }
8734: this.openTween = cc.tween(this.storeDown).to(.5, {
8735: scale: 1,
8736: position: cc.v3(-s.width, this.storeDown.position.y, 0)
8737: }).call(function() {
8738: i.storeDown.opacity = 0;
8739: i.lockScreen = !1;
8740: }).start();
8741: }
8742: }
8743: }
8744: };
```

### 2.3 这段 if/else 链的结构（关键，容易读错）

`8489` 是 6 层嵌套 `if`，`else` 从内到外各自挂一个类型，逐个对上：

| 分支 | 行号 | 命中条件 | 行为 |
|---|---|---|---|
| 主块 | `8489-8614` | n ∉ {3,5,6,9,10,12} | 渲染 `storeContent` 商品格（2/8 用 `o.listData`，1 用 `o.market`，7/11 用 `o.data`） |
| else#1 | `8615-8640` | n == 12 | `this.listData = o.ay`（寻宝） |
| else#2 | `8641-8660` | n == 10 | `AlchemyModel.reqAlchemyMsg()` |
| **else#3** | **`8661-8683`** | **n == 9** | **`TrickLotteryModel.reqData()`** |
| else#4 | `8684-8702` | n == 6 | `HalloweenModel.reqGetInviteData()` |
| else#5 | `8703-8721` | n == 5 | `StoreModel.openOptionalGiftUI(false)` |
| else#6 | `8722-8740` | n == 3 | `GrowthModel.reqGrowUpData()` |

### 2.4 它读了回包/载荷哪些字段

| 字段 | 读取点 | 守卫 | type=9 时是否读 |
|---|---|---|---|
| `o.hasOwnProperty("type")` / `o.type` | `8478` | `hasOwnProperty` | 读（缺省 `n=0`，会落到主块） |
| `o.hasOwnProperty("back")` / `o.back` | `8483` | `hasOwnProperty` | 读 |
| `o.openState` | `8486` | **无守卫**（`8 == n && 1 == o.openState` 短路） | 不读 |
| `o.listData` | `8502-8504` | 无 | **不读**（`8480` 已把 `this.listData` 置 `[]`） |
| `o.market` | `8508` | 无 | 不读 |
| `o.data` | `8530`、`8553` | 无 | 不读 |
| `o.ay` | `8618` | 无 | 不读 |

**抛异常风险**：
- `8474` `if (!this.lockScreen)`、`8476` `if (null != o)` 是唯一两道门；传 `null` 直接空转。
- `8503` `this.listData.back = ...` —— 若 `o.listData` 是 `undefined`（type 2/8 却给了空载荷）会 **TypeError**；但 `onOpenStoreList` 只在 `i.length > 0` 时才派发，正常路径不会踩到。
- `8486` 直接点 `o.openState`，只有 `n==8` 才求值，type=9 安全。
- 其余依赖的都取 `this.xxx`（`onLoad` 里已赋值），与回包无关。

---

## 3. 页签从哪来

### 3.0 一句话

**页签 = `User.GetShopAllActive` 回包里的行号数组 ∩ 客户端 cfg 表 `shop_entrance`。** `GetPayShowData` 完全不在链上。

### 3.1 事件与动作

- `index.js:45520` `STORE_ACTIVE_LIST_UI: "storeActiveListUI",`
- `index.js:60047` `GET_SHOP_ALL_ACTIVE: "User.GetShopAllActive",`
- 请求：`index.js:131092-131095`
```js
131092: e.prototype.reqShopAllActive = function(t) {
131093: void 0 === t && (t = null);
131094: g.NetMgr.http.sendRequest(p.HttpConst.GET_SHOP_ALL_ACTIVE, {});
131095: };
```
（空请求体 `{}`，`t` 形参未被使用。）
- 应答处理：`index.js:131271-131278`
```js
131271: e.prototype.onGetShopAllActive = function(t, e) {
131272: if (1 == e.eRet) {
131273: this.shopActiveData = e.shopActiveList;
131274: e.hasOwnProperty("shopActiveData") && (this.shopActiveRes = e.shopActiveData);
131275: e.hasOwnProperty("activeEndTime") && (this.shopListEndTime = e.activeEndTime);
131276: l.MessageCenter.dispatch(h.EvName.STORE_ACTIVE_LIST_UI, e.shopActiveList);
131277: }
131278: };
```
- 接收：`scripts2.js:8393` `l.MessageCenter.on(I.EvName.STORE_ACTIVE_LIST_UI, this.onShowActiveList, this);`

**守卫**：`131272` 只判 `eRet`；`shopActiveList` 缺 → `undefined` 一路透传到 `scripts2.js:8952` 的 `t.length` → **TypeError（崩）**。`shopActiveData` / `activeEndTime` 有 `hasOwnProperty` 守卫，可选。

### 3.2 什么时候才会发 `GetShopAllActive`（`ChargeShopUI.onLoad` 尾段，`scripts2.js:8356-8382`）

```js
8356: this.start_index = 0;
8357: if (null != this.data && this.data.hasOwnProperty("back")) {
8358: var c = this.data.back;
8359: this.backType = c;
8360: if (1 == c) if (this.data.hasOwnProperty("type")) {
8361: var l = this.data.type;
8362: 1 == l ? v.StoreModel.reqMarketList({
8363: type: 1,
8364: back: c
8365: }) : 8 == l ? v.StoreModel.reqYuanBaoList({
8366: type: l,
8367: back: c
8368: }) : 7 == l ? v.StoreModel.reqDayGiftList({
8369: type: l,
8370: back: c
8371: }) : 9 == l ? this.showTrickLottery(c) : 11 == l ? v.StoreModel.reqAnnPassGiftShop({
8372: type: l,
8373: back: c
8374: }) : v.StoreModel.reqOnStoreList({
8375: type: 2,
8376: back: c
8377: });
8378: } else v.StoreModel.reqOnStoreList({
8379: type: 2,
8380: back: c
8381: }); else v.StoreModel.reqShopAllActive();
8382: } else v.StoreModel.reqShopAllActive();
```

（`8381` 的 `else` 挂的是 `8360` 的 `if (1 == c)`；即 `back != 1` 时才拉页签。）

**由此得到的分支表**：

| 打开方式（`reqStoreList` 的入参） | `onLoad` 行为 | 界面 |
|---|---|---|
| `reqStoreList()` / `{type:2,back:1}`（默认，`130982-130984` 补 `back:1`） | `reqOnStoreList({type:2,back:1})` → **`GetPayShowData`** | 商品格；**页签面板不展开**（`8502-8506` 走 `storeContent`，`storeDown` 淡出） |
| `{type:2, back:0}`（`index.js:55896`、`55950` 这类调用） | `reqShopAllActive()` → **`GetShopAllActive`** | **页签面板 `storeDown` 出现**（`8588`/`8604` → `addShopAction`） |
| `{type:9, back:1}` | 直接 `showTrickLottery(1)`（`8371`） | 跳过页签，直接摸奖 |

> 也就是说：**默认入口（`back:1`）压根不会去要页签**。不实现 `GetPayShowData` 的直接后果是"开出来一片空白"（`8325`/`8328`/`8346` 三处 `opacity = 0`），而不是"页签缺失"；页签缺失另有原因（没走 `back:0` 这条路，或 `GetShopAllActive` 没实现）。

### 3.3 页签构建：`onShowActiveList` + `shopDatasList`（数据源在这）

`scripts2.js:8970-8984`
```js
8970: o.prototype.onShowActiveList = function(t, e) {
8971: var o = this;
8972: this.storeDatas = this.shopDatasList(e);
8973: this.addShopAction().then(function() {
8974: 255 == o.storeDown.opacity && cc.tween(o.storeDown).to(.5, {
8975: scaleX: 1,
8976: scaleY: 1,
8977: position: cc.v3(0, o.storeDown.position.y, 0)
8978: }).call(function() {
8979: o.lockAddGoldScreen = !1;
8980: o.lockScreen = !1;
8981: o.storeContent.opacity = 0;
8982: }).start();
8983: });
8984: };
```

**核心循环**（`scripts2.js:8951-8969`）——这是"页签从哪来"的答案：
```js
8951: o.prototype.shopDatasList = function(t) {
8952: for (var e = {}, o = 0; o < t.length; o++) e[t[o]] = t[o];
8953: var i = [], s = a.getTable("shop_entrance");
8954: for (var n in s) {
8955: var r = s[n];
8956: if (e.hasOwnProperty(parseInt(n)) && 4 != r.shop_type) {
8957: var c = {};
8958: c.name = r.shop_name;
8959: c.shopType = r.shop_type;
8960: c.shopPic = r.shop_pic;
8961: c.saleAd = r.sale_ad;
8962: c.shopId = r.shop_ID;
8963: c.activeId = r.active_id;
8964: c.showTime = r.show_time;
8965: i.push(c);
8966: }
8967: }
8968: return i;
8969: };
```

**语义（逐条）**：
1. `t` = 回包 `shopActiveList`，被转成"值→值"的哈希 `e`（`8952`）——**它是一组"cfg 行号"**，不是对象数组。
2. `s` = 本地表 `shop_entrance`（`8953`，`getTable` 返回按行号索引的行对象，见 `index.js:21898-21900`）。
3. 过滤条件只有两条：`e.hasOwnProperty(parseInt(n))`（**行号 n 出现在回包数组里**）且 `4 != r.shop_type`（`8956`）。
4. 每个页签元素的键：`name/shopType/shopPic/saleAd/shopId/activeId/showTime`，**全部来自本地 cfg，没有一个是回包字段**（`8958-8964`）。

`shop_entrance.json`（`cfg\dump\shop_entrance.json`，单行文件，`rows=11`，`cols=[shop_ID,shop_type,shop_name,active_id,shop_pic,sale_ad,show_time]`）里 type=9 那行（**键 `"9"`**）：

```json
"9":{"shop_ID":10,"shop_type":9,"shop_name":9020,"active_id":0,"shop_pic":"Graspmenu","sale_ad":"0","show_time":0}
```
现存行键：`1,2,3,5,6,7,8,9,10,11,12`（**没有 `4`**）。`shop.json` 与本链无关（`ID/Item` 两列，是 npc 商店货架表）。

### 3.4 页签渲染：`addShopAction`（**第 0 个是"大印章件"，剩下的才是可点的页签**）

`scripts2.js:8985-9029`
```js
8985: o.prototype.addShopAction = function() {
8986: var t = this;
8987: return new Promise(function(e) {
8988: t.menuNode.destroyAllChildren();
8989: var o = cc.view.getVisibleSize(), i = o.width / 720;
8990: t.addBtn.active = !0;
8991: t.addBtn2.active = !0;
8992: t.yukaBtn.active = !0;
8993: i > 1 && (i = 1);
8994: var s = o.height / 1280;
8995: s > 1 && (s = 1);
8996: var n = t.getListAllDatas(), r = Math.ceil(n.length / 2), a = t.storeDownPV.getComponent(cc.PageView);
8997: a.removeAllPages();
8998: var c = cc.instantiate(t.StoreMenuSpineItem);
8999: c.active = !0;
9000: c.setPosition(cc.v3(0, 0, 0));
9001: c.setScale(cc.v3(i, s, 1));
9002: t.menuNode.addChild(c);
9003: c.addComponent("StoreMenuSpineItem").setData(t.storeDatas[0], t.onTapEnterShop1.bind(t));
9004: N.ResMgr.framingLoad(r, function(o) {
9005: var r = cc.instantiate(t.StoreMenuItem);
9006: r.active = !0;
9007: r.setScale(cc.v3(i, s, 1));
9008: a.addPage(r);
9009: r.addComponent("StoreMenuItem").setData(n, o, t.onTapEnterShop.bind(t), e);
9010: }, 1);
9011: t.childNode.destroyAllChildren();
9012: t.storeDown.opacity = 255;
9013: if (r > 1) {
9014: t.spUps[0].active = !0;
9015: t.spUps[1].active = !0;
9016: var l = cc.tween().by(.5, {
9017: position: cc.v3(0, 10, 0)
9018: }), p = cc.tween().by(.5, {
9019: position: cc.v3(0, -10, 0)
9020: }), h = cc.tween().by(.5, {
9021: position: cc.v3(0, 10, 0)
9022: }), d = cc.tween().by(.5, {
9023: position: cc.v3(0, -10, 0)
9024: });
9025: cc.tween(t.spUps[0]).sequence(l, p).repeatForever().start();
9026: cc.tween(t.spUps[1]).sequence(h, d).repeatForever().start();
9027: }
9028: });
9029: };
```

配套（`scripts2.js:8944-8950`）：
```js
8944: o.prototype.getListAllDatas = function() {
8945: for (var t = [], e = 0; e < this.storeDatas.length; e++) e > 0 && t.push(this.storeDatas[e]);
8946: t.sort(function(t, e) {
8947: return t.shopId < e.shopId ? -1 : t.shopId > e.shopId ? 1 : void 0;
8948: });
8949: return t;
8950: };
```

**关键结构事实**：
- `storeDatas[0]` → `StoreMenuSpineItem`（`9003`），就是个**装饰大件**，点它走 `onTapEnterShop1`（`9056-9060`）→ 固定 `reqMarketList({type:1})`，**不看 shopType**。
- `storeDatas[1..]` → `StoreMenuItem`（`9004-9009`），这才是**能点出 type=9 的那排图标**。
- `r = Math.ceil(n.length / 2)`（`8996`），`r == 0` 时 `framingLoad` 的生成器 `i < t` 一次都不进（`index.js:103140-103151`），回调不执行 → **一个页签都不建**。

### 3.5 页签元素逐个读点（`StoreMenuItem`，`scripts2.js:67717-67758`）

```js
67717: e.prototype.start = function() {
67718: var t = 2 * this.idx, e = 1, o = this.data.length;
67719: t + 1 < this.data.length && (e = 2);
67720: for (var i = h.StoreModel.shopListEndTime, s = 0; s < e; s++) {
67721: var n = 2 * this.idx + s;
67722: this.menusBtn[s].active = !0;
67723: this.addButtonListen(this.menusBtn[s], this, this.onClick, t + s, 350);
67724: var r = this.data[t + s].shopPic;
67725: r = r;
67726: "tw" == p.lang && (r += "_tw");
67727: this.setSpriteFrame(this.sps[s], r, !0, n == o - 1 ? this.callBack1 : null, cc.assetManager.getBundle("store"));
67728: var c = this.data[t + s].activeId, l = a.getItem(c, "active");
67729: l && (this.endTimes[c] = l.endtime);
67730: i.hasOwnProperty(c) && 1 == i[c][1] ? this.tips[s].active = !0 : this.tips[s].active = !1;
67731: }
67732: };
67733: e.prototype.setData = function(t, e, o, i) {
67734: this.data = t;
67735: this.idx = e;
67736: this.callBack = o;
67737: this.callBack1 = i;
67738: };
67739: e.prototype.onClick = function(t) {
67740: var e = t.node.tag1;
67741: this.callBack && this.callBack(this.data[e]);
67742: };
67743: e.prototype.update = function() {
67744: var t = 2 * this.idx, e = 1;
67745: t + 1 < this.data.length && (e = 2);
67746: for (var o = r.TimeMgr.getSTimestamp(), i = h.StoreModel.shopListEndTime, s = 0; s < e; s++) {
67747: var n = this.data[t + s].activeId;
67748: if (1 == this.data[t + s].showTime && this.endTimes[n] && this.endTimes[n] >= o) {
67749: var a = (this.endTimes[n] - o) / 1e3;
67750: this.lbTimes[s].active = !0;
67751: this.lbTimes[s].getComponent(cc.Label).string = l.InventoryDB.getDayDurationTime(a);
67752: } else if (i.hasOwnProperty(n) && i[n][0] > o) {
67753: var c = (i[n][0] - o) / 1e3;
67754: this.lbTimes[s].active = !0;
67755: this.lbTimes[s].getComponent(cc.Label).string = l.InventoryDB.getDayDurationTime(c);
67756: } else this.lbTimes[s].active = !1;
67757: 7 == this.data[t + s].shopType && i.hasOwnProperty(n) && i[n][0] > o ? this.timeLimits[s].active = !0 : this.timeLimits[s].active = !1;
67758: }
67759: };
```

**逐键清单（cfg 列 → JS 键 → 读取点 → 守卫）**

| cfg 列 | JS 键 | 读取点 | 守卫 / 缺值行为 |
|---|---|---|---|
| `shop_pic` | `shopPic` | `67724` | **无守卫**，直接 `setSpriteFrame(..., "Graspmenu", ..., bundle "store")`；资源缺 → 只是贴图空（不抛） |
| `active_id` | `activeId` | `67728`、`67747`、`67752`、`67757`；`9076`（仅 shop_type 6） | `getItem(c,"active")` 可能返回 `null` → `l &&`；`hasOwnProperty(c)` 守卫；`c=0` 时全部落空分支 |
| `show_time` | `showTime` | `67748` | `1 == ... && this.endTimes[n] && ...` 短路守卫 |
| `shop_type` | `shopType` | `67757`（`7 ==`）；`9063`（点击派发） | 比较，无守卫；**type=9 在此只被比较，不参与渲染** |
| `shop_ID` | `shopId` | `8947`（排序比较器） | `undefined` 只会让排序不稳定 |
| `shop_name` | `name` | **本文件内无读取点** | 已赋值未使用 |
| `sale_ad` | `saleAd` | **本文件内无读取点** | 已赋值未使用 |

### 3.6 `storeDatas` 的规模约束（决定"只含摸奖页签"到底能不能点）

由 `8945`（跳过下标 0）+ `8996`（每页 2 个）+ `103150`（`i < t` 才回调）推出：

| `shopActiveList` 命中行数 | `storeDatas` | 页签面板结果 |
|---|---|---|
| 0 行 | `[]` | `9003` `setData(undefined, ...)` → `6822` `t.hasOwnProperty` **TypeError（崩）** |
| 1 行（哪怕正是第 9 行） | `[第9行]` | 第 9 行被当成 `storeDatas[0]` → 只生成 `StoreMenuSpineItem`；`r = 0` → **没有任何 `StoreMenuItem`，点不到摸奖**（点大件反而走 `reqMarketList`） |
| 2 行且其中一行 cfg 序号 < 9（如 `1` + `9`） | `[第1行, 第9行]` | 第 1 行 = 大件；**第 9 行 = 可点页签**（`shopPic="Graspmenu"`），点击 → `onTapEnterShop` → `shopType==9` 分支 ✓ |
| 只含 `≥9` 的行（如 `9`+`10`） | `[第9行, 第10行]` | 第 9 行仍是大件（`for...in` 按数字键升序），摸奖还是点不到 |

> `storeDatas` 的顺序 = `for (var n in s)` 的数字键升序（`8954`），所以"谁是第 0 个"取决于 cfg 行号，不取决于回包数组的顺序。

### 3.7 页签点击派发（`onTapEnterShop`，`scripts2.js:9061-9094`）

```js
9061: o.prototype.onTapEnterShop = function(e) {
9062: if (!this.lockScreen) {
9063: var o = e.shopType;
9064: if (2 == o) v.StoreModel.reqStoreList({
9065: back: 0
9066: }); else if (5 == o) {
9067: M.RoleOtherInfo.autoOptionalGift = 1;
9068: M.RoleOtherInfo.activeObj[0] ? _.HomeActiveModel.reqSevenDayActive({
9069: back: 0,
9070: type: o
9071: }) : _.HomeActiveModel.reqEveryDayActive({
9072: back: 0,
9073: type: o
9074: });
9075: } else if (7 == o) v.StoreModel.reqGetGiftPermanent(); else if (6 == o) {
9076: M.RoleOtherInfo.activeId = e.activeId;
9077: M.RoleOtherInfo.activeObj[0] ? _.HomeActiveModel.reqSevenDayActive({
9078: back: 0,
9079: type: o
9080: }) : _.HomeActiveModel.reqEveryDayActive({
9081: back: 0,
9082: type: o
9083: });
9084: } else 8 == o ? v.StoreModel.reqYuanBaoList({
9085: back: 0
9086: }) : 9 == o ? this.showTrickLottery(0) : 12 == o ? Promise.resolve().then(function() {
9087: return t("../../../scripts3/model3/TreasuresfromModel");
9088: }).then(function(t) {
9089: t.TreasuresfromModel.reqTreasuresData();
9090: }) : this.openBuyGoldEvent("", {
9091: type: o
9092: });
9093: }
9094: };
```

`shopType == 9` → `this.showTrickLottery(0)`（`9086`），**注意传的是 `0`**（= `back:0`，所以摸奖界面里 back 是"回页签面板"）。

---

## 4. type=9 这条链

### 4.1 一行箭头（每段带行号）

```
[页签图标 click] StoreMenuItem.onClick (scripts2.js:67739-67741, 取 node.tag1)
  → callBack = ChargeShopUI.onTapEnterShop (scripts2.js:9009 绑定 / 9061 定义)
  → `9 == o ? this.showTrickLottery(0)` (scripts2.js:9086)
  → showTrickLottery(t) (scripts2.js:8433-8438)  ← 唯一闸门：武功等级
  → openBuyGoldEvent("", {type:9, back:t}) (scripts2.js:8434)
  → openBuyGoldEvent (scripts2.js:8472) → if/else 链 n==9 分支 (scripts2.js:8661-8671)
  → t.TrickLotteryModel.reqData() (scripts2.js:8670)   ⟵ 这里发出一个【尚未取证】的摸奖请求
  → 模型回包成功后 dispatch GET_DEFAULT_TRICK_LOTTERY_DATA (EvName 定义 index.js:45969)
  → onShowLotteryData (scripts2.js:8763-8769, 注册于 8388)
  → 动态加载 "skillGrasp" bundle 的 prefabs/TrickLottery/TrickLotteryUI → childNode.addChild
```

### 4.2 闸门 1：`showTrickLottery`（`scripts2.js:8433-8438`，逐行）

```js
8433: o.prototype.showTrickLottery = function(t) {
8434: T.SkillTable.getMyRoleArtLv() >= a.getConst(435) ? this.openBuyGoldEvent("", {
8435: type: 9,
8436: back: t
8437: }) : b.default.show(c.getText(6000465));
8438: };
```
- 不满足 `getConst(435)` → **只弹文本 6000465，连 `openBuyGoldEvent` 都不进**（`8437`）。
- `a.getConst(435)` 的数值未解析（constant 表不在取证范围，见"未能验证"）。
- 另一条进入点：`onLoad` 的 `8371`（`{type:9, back:1}` 直接开摸奖），同样过这道闸门。

### 4.3 闸门 2：n==9 分支什么都不读（`scripts2.js:8661-8683`，逐行）

```js
8661: } else {
8662: this.lockScreen = !0;
8663: this.childNode.destroyAllChildren();
8664: this.addBtn.active = !1;
8665: this.addBtn2.active = !1;
8666: this.yukaBtn.active = !1;
8667: Promise.resolve().then(function() {
8668: return t("../../../scripts3/model3/TrickLotteryModel");
8669: }).then(function(t) {
8670: t.TrickLotteryModel.reqData();
8671: });
8672: this.isStoreContent = !1;
8673: if (this.openTween) {
8674: this.openTween.stop();
8675: this.openTween = null;
8676: }
8677: this.openTween = cc.tween(this.storeDown).to(.5, {
8678: scale: 1,
8679: position: cc.v3(-s.width, this.storeDown.position.y, 0)
8680: }).call(function() {
8681: i.storeDown.opacity = 0;
8682: i.lockScreen = !1;
8683: }).start();
```
- **`reqData()` 无参调用**（不是 `reqData(0)`）。
- **点下去不会先发别的请求**：整个 n==9 分支里唯一的网络动作就是 `8670` 的 `reqData()`，没有 `reqStoreList` / `reqMarketList` / `reqShopAllActive` 之类的铺垫。
- 不读 `o.listData` / `o.market` / `o.data` / `o.openState`；`this.listData` 保持 `8480` 的 `[]`。
- `storeDown` 被淡出（`8677-8683`），`childNode` 清空（`8663`）——即"关掉页签面板、腾出中间舞台"。

### 4.4 闸门 3：`onShowLotteryData` 的触发者（`scripts2.js:8763-8769`，逐行）

```js
8763: o.prototype.onShowLotteryData = function() {
8764: var t = this;
8765: cc.assetManager.getBundle("skillGrasp").load("prefabs/TrickLottery/TrickLotteryUI", cc.Prefab, function(e, o) {
8766: var i = cc.instantiate(o);
8767: t.childNode.addChild(i);
8768: });
8769: };
```
- 注册：`scripts2.js:8388` `l.MessageCenter.on(I.EvName.GET_DEFAULT_TRICK_LOTTERY_DATA, this.onShowLotteryData, this);`
- 事件名：`index.js:45969` `GET_DEFAULT_TRICK_LOTTERY_DATA: "getDefaultTrickLotteryData",`
- 依赖：`cc.assetManager.getBundle("skillGrasp")` —— **bundle 必须先已下载/加载**，否则 `getBundle` 返回 `undefined`，`.load` 直接 **TypeError**（这是客户端资源前置条件，与回包无关）。
- **触发者不在取证范围内**：`index.js` 与 `scripts2.js` 全文只有"事件名定义 + 注册/反注册"三处出现 `GET_DEFAULT_TRICK_LOTTERY_DATA`，**没有任何 `dispatch`**。派发点必然在 `TrickLotteryModel`（`scripts3.js`）里，不在允许读的两个文件内。

### 4.5 备选进入点（不经页签）

`index.js:131068-131073`
```js
131068: e.prototype.openTrickLotteryShop = function() {
131069: this.reqStoreList({
131070: type: 9,
131071: back: 1
131072: });
131073: };
```
→ `reqStoreList({type:9,back:1})`：`chargeShopUI` 为 `null` 时走 `onLoad` 的 `8371` → `showTrickLottery(1)` → 同一条链（**完全不经过页签、不经过 `GetShopAllActive`**）。
但：`openTrickLotteryShop` 在 `index.js` 与 `scripts2.js` 里**没有任何调用点**（只在 `131068` 定义），属于"目前无 UI 按钮触发"的入口。

---

## 5. 最小可行集

### 5.1 表格：让 type=9 页签"出现且能点开摸奖界面"的最小要求

按 §3/§4 的读点倒推（**只列读点真正读到的字段**）：

| # | 环节 | 必需内容 | 结构 | 证据 |
|---|---|---|---|---|
| 1 | 打开商城 UI | `reqStoreList` **入参 `back != 1`**（客户端调用侧决定，不是回包字段） | `{type:2, back:0}` | `scripts2.js:8360`/`8381` |
| 2 | 页签请求 | `User.GetShopAllActive`，**空请求体 `{}`** | — | `index.js:131092-131095` |
| 3 | 页签回包 | **`eRet = 1`** | int | `index.js:131272` |
| 4 | 页签回包 | **`shopActiveList` = 一组 `shop_entrance` 行号**，必须**含 `9`**，且**至少再含一个行号 < 9 的行**（如 `1`，否则摸奖被挤成装饰大件） | `int[]`（元素是行号，非对象；`string` 数字也可，`hasOwnProperty(parseInt(n))` 会隐式转字符串） | `index.js:131276` → `scripts2.js:8952-8956`、`8945`、`8996`、`103150` |
| 5 | （可选）页签倒计时/红点 | `shopActiveData`、`activeEndTime` | `activeEndTime = {activeId: [endMs, showTipFlag]}` 形态（`i[n][0]`/`i[n][1]`） | `index.js:131274-131275`、`scripts2.js:67730`/`67752`/`67757` |
| 6 | 页签内容 | **客户端 cfg 已有**，无需回包 | `shop_entrance.json` 第 `"9"` 行 | `scripts2.js:8958-8964` |
| 7 | 点击闸门 | `SkillTable.getMyRoleArtLv() >= getConst(435)`（客户端判定，服务端可只抬等级/改表） | int | `scripts2.js:8434` |
| 8 | 摸奖数据 | `TrickLotteryModel.reqData()` 对应的**另一支动作 + 其回包**（名称/字段**本范围未取证**，在 `scripts3.js`） | 未知 | `scripts2.js:8670`、`8765` |
| 9 | 摸奖界面资源 | 客户端 `skillGrasp` bundle 就绪 | — | `scripts2.js:8765` |

**明确"不需要"的**：
- `GetPayShowData` 的 `ShopArray` —— type=9 分支一个字段都不读（§4.3）。
- `type:9` 出现在 `GetPayShowData` 回包里 —— `onOpenStoreList` 把 `type` 硬折成 2/8（`index.js:131225`），给了 9 也变 2。

### 5.2 还需要配合的请求（分场景）

| 请求 | 何时被要 | 服务端必须给什么 | 不给会怎样 |
|---|---|---|---|
| `User.GetShopAllActive` | 打开商城且 `back != 1`（`scripts2.js:8381`） | `{eRet:1, shopActiveList:[...]}` | **页签面板永远空**；若 `eRet:1` 但缺 `shopActiveList` → `8952` `t.length` **崩** |
| `User.GetPayShowData` | 默认入口 `back:1`（`scripts2.js:8378`）、点"金币商城"页签（`9064`） | `{eRet:1, ShopArray:[{ID:...},...]}`（`ShopArray` 非空才派发） | **商城开出空白界面**（不崩）；页签面板这条路不经过它 |
| `User.GetMarketList`（`reqMarketList`） | 点装饰大件（`9056-9060`）、`shopType==1` 分支（`8362`） | `{eRet:1, market:[[...]...]}`（数组套数组，`8508-8522`；另可带 `serverTime`/`nextRefreshTime`/`buyTimes`，`index.js:130760-130772`） | 点大件无反应（不崩） |
| `TrickLotteryModel.reqData()` 的动作 | 点摸奖页签后（`8670`） | **未知**（`scripts3.js`，本范围外） | 摸奖界面永远不弹（`onShowLotteryData` 不被触发） |

### 5.3 判定所依赖的三条硬事实

1. `GetPayShowData` 的 `type` 出口被写死成 `2`/`8`（`index.js:131225`）→ **它结构上无法产生 type=9 页签**。
2. 页签数据源是本地表 ∩ `shopActiveList`（`scripts2.js:8952-8956`）→ 服务端能控的只有"哪些行号亮起来"，**页签长得像什么在 cfg 里**（含 `shop_pic:"Graspmenu"`）。
3. `storeDatas[0]` 被 `StoreMenuSpineItem` 吃掉、且它走 `reqMarketList` 而非 `onTapEnterShop`（`9003`/`9056`）→ **页签列表不能只亮一个行号**，否则摸奖点不出来。

---

# 未能验证

1. **`GET_DEFAULT_TRICK_LOTTERY_DATA` 的派发点**：`index.js` / `scripts2.js` 内零处 `dispatch`（只有 `index.js:45969` 定义、`scripts2.js:8388`/`8404` 注册/反注册）。派发与 `TrickLotteryModel.reqData()` 的请求名/回包字段都在 `tools\scripts3.js`（工作区存在该文件，`scripts2.js:8668` 用 `t("../../../scripts3/model3/TrickLotteryModel")` 引用它），**按本任务范围未读**。
2. **`a.getConst(435)` 的数值**：`getConst → getConstByID → getItem(t,"constant").Date`（`index.js:21907-21913`），constant 表不在取证范围内，所以"武功等级门槛到底是多少"未定。
3. **`TrickLotteryUI` 预制体自身还发什么请求**：`scripts2.js:8765` 只负责加载 `skillGrasp` bundle 的 prefab，prefab 内部逻辑（大概率再发一次摸奖数据/奖池请求）不在两个 JS 文件里。
4. **`GetShopAllActive` 已/未实现**：本任务只取证客户端形状，没有服务端代码可对照，`shopActiveList` 当前实际回什么未验证。
5. **`getTable("shop_entrance")` 的加载源**：由 `index.js:21898-21900` 返回 `this.dic[t]`（按行号索引的行表，与 `cfg\dump\shop_entrance.json` 的 `data` 节点同形），但 `dic` 的装配代码未追。
6. **`back == 0` 的入口有几处**：只抽样确认了 `index.js:55896`、`55950` 两处 `reqStoreList({type:2, back:0})`；未穷举所有调用点，因此"玩家实际能否走到要页签的那条路"未量化。
7. **`StoreMenuSpineItem` 的大件图标**：`scripts2.js:67820-67824` 的 `setData` 只读 `t.back`（`storeDatas[0]` 上并无该键），图标来自 skeleton 动画（`67811`），所以"第 0 行亮哪个图"与 cfg 的 `shop_pic` 无关；这一点只读到就不再深挖。

# 范围外发现

1. **默认开商城根本不请求页签**：`reqStoreList()` 会给 `back` 补 `1`（`index.js:130982-130984`），`onLoad` 于是走 `8378` 的 `reqOnStoreList`（`GetPayShowData`）而不是 `8381` 的 `reqShopAllActive`。所以"页签列表拿不到"未必是 `GetPayShowData` 未实现造成的，**而是这条入口压根不请求页签**——服务端补 `GetPayShowData` 只会让空白界面变成"金币商城商品格"。
2. **`openTrickLotteryShop`（`index.js:131068`）是死入口**：两个文件内无调用点。想绕开页签直接开摸奖，客户端没有现成按钮。
3. **英文语言分支不发任何请求**：`onLoad` 的 `8276 if (L.LoginMgr.judgeLangEn()) { 8277-8298 }` 分支里**没有** `8357-8382` 那段派发逻辑（那段在 `else` 体内），英文界面开商城不会拉页签/商品。
4. **`shop_entrance.json` 缺行键 `"4"`**（`1,2,3,5,...,12`，`rows=11`）：`parseInt(n)` 的过滤方式对缺号无感，但若有服务端逻辑按"1..rows"顺序发号，会与客户端行号错位。
5. **`storeDatas` 的两个字段是死赋值**：`name`（`8958`）、`saleAd`（`8961`）在 `scripts2.js` 全文中没有任何读取点（`grep saleAd` 仅命中 `8961`）。
6. **`type` 语义在客户端被拆成两套**：`GetPayShowData` 的 `type`（1→8，其余→2，`index.js:131225`）与 `STORE_SHOW_UI` 的 `type`（1/2/3/5/6/7/8/9/10/11/12，`scripts2.js:8489-8740`）不是同一套编码，容易对错。

---

**判定：补一个最小商城 = 页签部分只需回 `{eRet:1, shopActiveList:[行号…含 9 且至少含一个 <9 的行号]}`（`GetPayShowData` 完全不参与），但点开摸奖界面还要额外动作 `TrickLotteryModel.reqData()` 对应的摸奖动作（scripts3.js，未取证）+ 入口必须 `back≠1` + 客户端武功等级 ≥ `getConst(435)` ＝ 半可行。**
