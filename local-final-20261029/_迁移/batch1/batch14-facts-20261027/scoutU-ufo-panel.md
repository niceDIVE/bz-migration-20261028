## Q1 面板

- `tools/scripts3.js:25791`：`cc.assetManager.getBundle("dollBundle").load("prefabs/dollUI", cc.Prefab, function(t, e) {`
- `tools/scripts3.js:25794`：`i.addComponent("DollUI").setData(o);`
- `tools/scripts3.js:26079`：`e.prefabName = "activeUI/dollUI";`
- `tools/scripts3.js:26166`：`cc.assetManager.getBundle("dollBundle").load("prefabs/dollTipsUI", cc.Prefab, function(t, e) {`
- `tools/scripts3.js:26384`：`cc.assetManager.getBundle("dollBundle").release("prefabs/dollUI", cc.Prefab);`
- `tools/scripts3.js:26048`：`DollUI: [ function(t, e, o) {`
- `tools/scripts3.js:25465`：`DollGrear: [ function(t, e, o) {`
- `tools/scripts3.js:25905`：`DollTips: [ function(t, e, o) {`
- `tools/scripts2.js` 全文：prefabs.load 或 UI 类名含 UFO/catcher 均为 0 命中（检索式 `prefabs.*(ufo|catcher)`、`class .*(ufo|catcher)`）。

事实结论：UI 类名为 DollUI（挂载预制体 prefabs/dollUI），面板数据来自 GET_UFO_CATCHER_DATA 的回包对象 o（实参）。

## Q2 入口

- `tools/scripts3.js:25848`（定义）：`t.prototype.reqBuyUFORefreshTimes = function() {`
  调用点：`tools/scripts3.js:26209`：`0 == t && m.DollModel.reqBuyUFORefreshTimes();`
- `tools/scripts3.js:25853`（定义）：`t.prototype.reqBuyUFOGameCoin = function(t) {`
  调用点：0 命中（检索式 `reqBuyUFOGameCoin` 在 scripts3.js 与 scripts2.js 无外部调用）。
- `tools/scripts3.js:25858`（定义）：`t.prototype.reqRewardUFO = function(t, e, o) {`
  调用点：`tools/scripts3.js:26327`：`m.DollModel.reqRewardUFO(this.catchItems, this.catchIndexIds, this.gearType);`
- `tools/scripts3.js:25868`（定义）：`t.prototype.reqGetUFOCatcherTask = function() {`
  调用点：0 命中（检索式 `reqGetUFOCatcherTask` 在 scripts3.js 与 scripts2.js 无外部调用）。
- `tools/scripts3.js:25871`（定义）：`t.prototype.reqRewardUFOCatcherTask = function(t) {`
  调用点：0 命中（检索式 `reqRewardUFOCatcherTask` 在 scripts3.js 与 scripts2.js 无外部调用）。
- `tools/scripts3.js:25876`（定义）：`t.prototype.useUFOrefresh = function() {`
  调用点：`tools/scripts3.js:26218`：`m.DollModel.useUFOrefresh();`
- `tools/scripts3.js:25879`（定义）：`t.prototype.getUFOCatcherData = function() {`
  调用点：0 命中（在 scripts3.js 与 scripts2.js 无调用；检索式 `getUFOCatcherData` 在两文件内部调用点为 0）。

事实结论：scripts3.js 内部仅 reqBuyUFORefreshTimes、reqRewardUFO、useUFOrefresh 3 键被 DollUI 调用，其余 4 键在 scripts2.js 与 scripts3.js 内 0 命中。

## Q3 三字段消费

### refreshTimes（总数 5，已抄 5）
- `tools/scripts3.js:25718`（初始化）：`this.refreshTimes = 0;`
- `tools/scripts3.js:25773`（写入）：`o.hasOwnProperty("refreshTimes") && (t.refreshTimes = o.refreshTimes);`
- `tools/scripts3.js:25786`（写入）：`o.hasOwnProperty("refreshTimes") && (t.refreshTimes = o.refreshTimes);`
- `tools/scripts3.js:25804`（写入）：`o.hasOwnProperty("refreshTimes") && (t.refreshTimes = o.refreshTimes);`
- `tools/scripts3.js:25822`（读点）：`return this.freeRefreshTimes + this.refreshTimes;`

### buyRefreshTimes（总数 5，已抄 5）
- `tools/scripts3.js:25720`（初始化）：`this.buyRefreshTimes = 0;`
- `tools/scripts3.js:25775`（写入）：`o.hasOwnProperty("buyRefreshTimes") && (t.buyRefreshTimes = o.buyRefreshTimes);`
- `tools/scripts3.js:25788`（写入）：`o.hasOwnProperty("buyRefreshTimes") && (t.buyRefreshTimes = o.buyRefreshTimes);`
- `tools/scripts3.js:25806`（写入）：`o.hasOwnProperty("buyRefreshTimes") && (t.buyRefreshTimes = o.buyRefreshTimes);`
- `tools/scripts3.js:26202`（读点）：`0 == m.DollModel.getTimes() ? c.getConstByID("325") - m.DollModel.buyRefreshTimes > 0 ? l.default.show(p.getText("7865").replace(/\[1\]/, c.getConstByID("325") - m.DollModel.buyRefreshTimes) + "\n\n\n" + p.getText("7866").replace(/\[1\]/, c.getConstByID("324")), [ {`

### freeRefreshTimes（总数 5，已抄 5）
- `tools/scripts3.js:25719`（初始化）：`this.freeRefreshTimes = 0;`
- `tools/scripts3.js:25774`（写入）：`o.hasOwnProperty("freeRefreshTimes") && (t.freeRefreshTimes = o.freeRefreshTimes);`
- `tools/scripts3.js:25787`（写入）：`o.hasOwnProperty("freeRefreshTimes") && (t.freeRefreshTimes = o.freeRefreshTimes);`
- `tools/scripts3.js:25805`（写入）：`o.hasOwnProperty("freeRefreshTimes") && (t.freeRefreshTimes = o.freeRefreshTimes);`
- `tools/scripts3.js:25822`（读点）：`return this.freeRefreshTimes + this.refreshTimes;`

事实结论：三字段全部读点集中在 DollModel.getTimes（算总次数）与 DollUI.onResetCallBack（扣减常量 325 算剩余购买次数）。

## 未验证段
- getUFOCatcherData 在 scripts3.js / scripts2.js 无调用，但已知外部调用在 tools/index.js:87585（NpcToFuncType97），由于限定范围未在此纳入正文统计。
- getTimes() 间接消费 freeRefreshTimes 与 refreshTimes，在 DollUI:26202 与 DollUI:26280 被读取展示，属衍生读点。

## 范围外产出
- tools/index.js:87585 存在 `t.DollModel.getUFOCatcherData();`，位于 `NpcToFuncType97`。
- batch14-facts-20261027\scoutP2-ufo-senders.md 已有前序侦察产出。