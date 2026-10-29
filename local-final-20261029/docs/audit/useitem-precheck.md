# useItem 客户端取证报告

## 任务 1：发 useItem 请求前的本地扣减取证

### 调用点定位
- 发送点 1：`tools/index.js:65330`：`0 == t && m.NetMgr.http.sendRequest(a.HttpConst.USE_ITEM, f);`
- 发送点 2：`tools/index.js:65333`：`s ? m.NetMgr.http.sendRequest(a.HttpConst.USE_ITEM, f) : m.NetMgr.http.sendReqWithMask(a.HttpConst.USE_ITEM, f);`
- 批量/快捷发送点：`tools/index.js:65340`、`tools/index.js:65348`

### 发送点上方 40 行原文（tools/index.js:65264-65334）
```javascript
65264: e.prototype.useItemFunc = function(e, o, r, s) {
65265: var l = this;
65266: void 0 === r && (r = 0);
65267: void 0 === s && (s = !1);
65268: if ((8 == o || 13 == o) && T.PackageModel.judgePackageLimit()) return !0;
65269: if (34 != o && 32 != o || !C.CrossServiceModel.isEnterCrossServer()) {
65270: this.batchUse = !1;
65271: this.curItemId = e;
65272: void 0 === s && (s = !1);
65273: var f = {
65274: itemID: e,
65275: itemNum: r
65276: };
65277: if (2 == o) {
65278: f.curHp = k.playerInfo.entity.hp.remaining;
65279: f.maxhpLimit = k.playerInfo.entity.hp.limit;
65280: } else if (3 == o) {
65281: f.curMp = k.playerInfo.entity.mp.remaining;
65282: f.maxmpLimit = k.playerInfo.entity.mp.limit;
65283: } else if (6 == o) {
65284: f.maxhpLimit = k.playerInfo.entity.hp.limit;
65285: f.hpfinalValue = k.playerInfo.entity.hp.finalValue;
65286: } else if (25 == o) {
65287: f.curHp = k.playerInfo.entity.hp.remaining;
65288: f.maxhpLimit = k.playerInfo.entity.hp.limit;
65289: f.curMp = k.playerInfo.entity.mp.remaining;
65290: f.maxmpLimit = k.playerInfo.entity.mp.limit;
65291: } else if (23 == o) {
65292: f.curHp = k.playerInfo.entity.hp.finalValue;
65293: f.maxhpLimit = f.curHp;
65294: f.curMp = k.playerInfo.entity.mp.finalValue;
65295: f.maxmpLimit = f.curMp;
65296: } else if (33 == o) {
65297: f.curHp = k.playerInfo.entity.hp.remaining;
65298: f.maxhpLimit = k.playerInfo.entity.hp.limit;
65299: f.curMp = k.playerInfo.entity.mp.remaining;
65300: f.maxmpLimit = k.playerInfo.entity.mp.limit;
65301: f.hpfinalValue = k.playerInfo.entity.hp.finalValue;
65302: } else 1 == o && (f.hg = k.playerInfo.entity.hunger.remaining);
65303: if (19 == o) m.NetMgr.http.sendRequest(a.HttpConst.RECOVER_YOUNG, {
65304: itemID: e,
65305: itemNum: r
65306: }); else if (17 == o) {
65307: h.PopUpMgr.removePopUp(this.TreasureMap);
65308: this.TreasureMap = null;
65309: p.default.prefabs.load("treasure/treasureMap", cc.Prefab, function(t, o) {
65310: var i = cc.instantiate(o);
65311: h.PopUpMgr.addPopUp(i, u.LayerMgr.popUpLayer);
65312: i.addComponent("TreasureMap").setData({
65313: id: e,
65314: typeid: 1
65315: });
65316: l.TreasureMap = i;
65317: });
65318: } else if (30 == o) {
65319: var d = i.getItem(e, "item"), g = i.getItem(d.Data1, "npc"), y = n.getText(3457).replace(/\[1\]/, n.getText(g.NpcName));
65320: Promise.resolve().then(function() {
65321: return t("./RoleOtherInfo");
65322: }).then(function(t) {
65323: 0 == t.RoleOtherInfo.homeFarmId ? c.default.show(n.getText(3716)) : c.default.show(y, [ {
65324: flag: 0,
65325: name: n.getText("634")
65326: }, {
65327: flag: 1,
65328: name: n.getText("333")
65329: } ], function(t) {
65330: 0 == t && m.NetMgr.http.sendRequest(a.HttpConst.USE_ITEM, f);
65331: });
65332: });
65333: } else s ? m.NetMgr.http.sendRequest(a.HttpConst.USE_ITEM, f) : m.NetMgr.http.sendReqWithMask(a.HttpConst.USE_ITEM, f);
65334: }
```

### 扣减代码检索情况
经检查，`tools/index.js:65264-65333` 全文无任何 `setItem(...)`、`-= `、`numbers -=`、`deleteItem`、`removeItem`。
reqBatchUseItem (`tools/index.js:65336-65344`) 与 reqUseItems (`tools/index.js:65345-65352`) 同样直接组装参数后发送，无任何本地扣减。

结论：发请求前**没有**本地预扣物品。

---

## 任务 2：useItem 应答回调取证

### 回调函数体（tools/index.js:64895-64911）
```javascript
64895: } else if (2 == a.eRet) ; else if (4 == a.eRet) {
64896: if (e.batchUse) {
64897: e.batchUse = !1;
64898: r.MessageCenter.dispatch(s.EvName.FINISH_BOX_REWARD_EVENT);
64899: return;
64900: }
64901: if (e.curItemId > 0) {
64902: var U = i.getItem(e.curItemId, "item"), x = n.getText("988").replace(/\[1\]/, U.Data3), H = i.getItem(U.Data2, "item");
64903: x = x.replace(/\[2\]/, n.getText(H.Name));
64904: c.default.show(x);
64905: }
64906: } else if (5 == a.eRet) c.default.show(n.getText(1333)); else if (6 == a.eRet) c.default.show(n.getText(1388)); else if (8 == a.eRet) c.default.show(n.getText(3430)); else if (10 == a.eRet) c.default.show(n.getText(3807)); else if (11 == a.eRet) c.default.show(n.getText(3807)); else if (13 == a.eRet) c.default.show(n.getText(5862)); else if (15 == a.eRet) {
64907: var j = a.delItemObj;
64908: j && c.default.showReward(j, 0, {}, {}, null, null, "6000572");
64909: r.MessageCenter.dispatch(s.EvName.USE_NEW_ITEM_EVENT, a);
64910: } else 16 == a.eRet && c.default.show(n.getText(6003628));
64911: }, this);
```

### eRet 条件分支清单与分析
1. `1 == a.eRet` (`tools/index.js:64755-64894`)：正常成功，处理各种落地、UI展示、派发事件、改本地模型（如 `itemSort`、`mpTrained` 等）。
2. `2 == a.eRet` (`tools/index.js:64895`)：空语句 `;`，不弹提示也不改模型。
3. `4 == a.eRet` (`tools/index.js:64895-64905`)：若 `e.batchUse` 为 true 则重置标志并派发 `FINISH_BOX_REWARD_EVENT`；否则弹提示 `c.default.show(x)`，不改模型。
4. `5 == a.eRet` (`tools/index.js:64906`)：只弹提示 `c.default.show(n.getText(1333))`，不改模型。
5. `6 == a.eRet` (`tools/index.js:64906`)：只弹提示 `c.default.show(n.getText(1388))`，不改模型。
6. `8 == a.eRet` (`tools/index.js:64906`)：只弹提示 `c.default.show(n.getText(3430))`，不改模型。
7. `10 == a.eRet` (`tools/index.js:64906`)：只弹提示 `c.default.show(n.getText(3807))`，不改模型。
8. `11 == a.eRet` (`tools/index.js:64906`)：只弹提示 `c.default.show(n.getText(3807))`，不改模型。
9. `13 == a.eRet` (`tools/index.js:64906`)：只弹提示 `c.default.show(n.getText(5862))`，不改模型。
10. `15 == a.eRet` (`tools/index.js:64906-64910`)：弹奖并派发 `USE_NEW_ITEM_EVENT`。
11. `16 == a.eRet` (`tools/index.js:64910`)：只弹提示 `c.default.show(n.getText(6003628))`，不改模型。

只弹提示、不改模型的分支行号：
- `tools/index.js:64904`（`4 == a.eRet` 且非 batchUse）
- `tools/index.js:64906`（`5 == a.eRet`、`6 == a.eRet`、`8 == a.eRet`、`10 == a.eRet`、`11 == a.eRet`、`13 == a.eRet`）
- `tools/index.js:64910`（`16 == a.eRet`）

---

## 任务 3：物品效果分发函数与 Effect 码取证

客户端存在两处物品效果分发/预检逻辑：
1. `useItem` 分发与拦截（`tools/index.js:64316-64504`）
2. `itemUsePopLayer` 弹出层路由（`tools/index.js:65499-65555`）
3. `useItemFunc` 组包分支（`tools/index.js:65264-65334`）

### 分支条件行原文（tools/index.js:64321-64502）
```javascript
64321: if (2 == e.Type) switch (e.Effect) {
64322: case 1:
64325: case 2:
64332: case 3:
64339: case 4:
64342: case 5:
64367: case 6:
64374: case 7:
64382: case 11:
64420: case 9:
64423: case 15:
64430: case 18:
64438: case 19:
64454: case 22:
64466: case 23:
64474: case 25:
64482: case 45:
64486: case 46:
64497: case 47:
```

### Effect 码清单（去重，升序）及归类说明
- **Effect 1**：等应答里 note 落地（无客户端拦截，进入后续发包逻辑，等服务端推送落地）。
- **Effect 2**：等应答里 note 落地（仅做 hp 满值拦截判断，未满则放行等应答 note 落地）。
- **Effect 3**：等应答里 note 落地（仅做 mp 满值拦截判断，未满则放行等应答 note 落地）。
- **Effect 4**：等应答里 note 落地（无客户端拦截，进入后续发包逻辑，等服务端推送落地）。
- **Effect 5**：客户端本地生效（本地校验前置武功/门派条件或弹自宫提示，满足则开界面/发自宫，不走通用 useItem 落地）。
- **Effect 6**：等应答里 note 落地（仅做 hp.limit 满值拦截判断，未满则放行等应答 note 落地）。
- **Effect 7**：等应答里 note 落地（仅做 thirst 满值拦截判断，未满则放行等应答 note 落地）。
- **Effect 9**：等应答里 note 落地（在 itemUsePopLayer 打开信件 UI，无预扣，等服务端应答）。
- **Effect 11**：客户端本地生效（本地校验条件后打开 ConsultUI 领悟/请教界面，不走直接网络扣减）。
- **Effect 15**：等应答里 note 落地（仅做死亡次数 numDeaths 拦截判断，未死过则拦截，满足则等应答落地）。
- **Effect 18**：客户端本地生效（直接调用 InventoryModel.reqGetItemBox 请求宝箱数据，不走通用 useItem）。
- **Effect 19**：等应答里 note 落地（在 useItemFunc 中转发 HttpConst.RECOVER_YOUNG 恢复年轻请求，等应答落地）。
- **Effect 22**：客户端本地生效（本地直接加载并打开剧情界面 StoryItemUI，返回 true，不发 useItem 请求）。
- **Effect 23**：等应答里 note 落地（仅在气血内力均满时弹提示拦截，未满则带 curHp/maxhpLimit/curMp/maxmpLimit 参数发请求，等服务端 note 落地）。
- **Effect 25**：等应答里 note 落地（仅在气血内力均满时弹提示拦截，未满则带参数发请求，等服务端 note 落地）。
- **Effect 45**：客户端本地生效（本地直接弹提示 `c.default.show(n.getText(e.Data1))`，返回 true，不发请求）。
- **Effect 46**：客户端本地生效（本地直接弹出抽签运势界面 SignShowLuckyUI，返回 true，不发网络请求）。
- **Effect 47**：等应答里 note 落地（仅做内力上限修炼溢出拦截判断，满足条件则弹窗选择数量发请求，等服务端 note 落地）。

---

## 任务 4：Effect == 23 取证

`Effect == 23` 在客户端已出现，具体处理如下：

### 1. 预检拦截（tools/index.js:64466-64472）
```javascript
64466: case 23:
64467: if (v.hp.limit == v.hp.finalValue && v.hp.remaining == v.hp.finalValue && v.mp.remaining == v.mp.limit) {
64468: var w = n.getText(1488).replace(/\[1\]/, n.getText(2) + "," + n.getText(3));
64469: s.default.show(w);
64470: return !0;
64471: }
64472: break;
```
行号：`tools/index.js:64466-64472`
逻辑：若玩家的气血和内力均处于上限全满状态，弹提示并返回 true 终止流程；未满则 break 放行。

### 2. 请求组包（tools/index.js:65291-65295）
```javascript
65291: } else if (23 == o) {
65292: f.curHp = k.playerInfo.entity.hp.finalValue;
65293: f.maxhpLimit = f.curHp;
65294: f.curMp = k.playerInfo.entity.mp.finalValue;
65295: f.maxmpLimit = f.curMp;
```
行号：`tools/index.js:65291-65295`
逻辑：将玩家实时的 `hp.finalValue` 与 `mp.finalValue` 填入请求包 payload，向服务器发送 `HttpConst.USE_ITEM` 请求，等待服务器应答与 note 落地。
