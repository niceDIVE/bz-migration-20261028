# beginPlayGame 与 checkHireOnhook 回调中 beginTime 取证报告

## 步骤 1：动作线上路由串与回调注册点

在 `tools/index.js`、`tools/scripts2.js`、`tools/scripts3.js` 三包中检索目标关键词：
`beginPlayGame`、`BeginPlayGame`、`checkHireOnhook`、`CheckHireOnhook`、`HIRE_ONHOOK`、`PLAY_GAME`。

### 1. 命中清单与原文

#### tools/index.js
- `tools/index.js:24616`: `r.MessageCenter.on(s.HttpConst.BEGIN_PLAY_GAME, this.beginPlayCallBack, this);`
  - 是否 MessageCenter.on 注册点：**是**（`beginPlayGame` 对应的应答事件注册点）
- `tools/index.js:24617`: `r.MessageCenter.on(s.HttpConst.END_PLAY_GAME, this.endPlayCallBack, this);`
  - 是否 MessageCenter.on 注册点：**否**（相关但非 beginPlayGame）
- `tools/index.js:24724`: `u.NetMgr.http.sendRequest(s.HttpConst.BEGIN_PLAY_GAME, o);`
  - 是否 MessageCenter.on 注册点：**否**（请求发出点）
- `tools/index.js:24732`: `u.NetMgr.http.sendRequest(s.HttpConst.END_PLAY_GAME, o);`
  - 是否 MessageCenter.on 注册点：**否**（请求发出点）
- `tools/index.js:59681`: `BEGIN_PLAY_GAME: "User.beginPlayGame",`
  - 是否 MessageCenter.on 注册点：**否**（常量定义）
- `tools/index.js:59682`: `END_PLAY_GAME: "User.endPlayGame",`
  - 是否 MessageCenter.on 注册点：**否**（常量定义）
- `tools/index.js:59688`: `CHECK_HIRE: "User.checkHireOnhook",`
  - 是否 MessageCenter.on 注册点：**否**（常量定义：`checkHireOnhook` 绑定到常量 `s.HttpConst.CHECK_HIRE`）

#### CHECK_HIRE 注册点追加检索（tools/index.js）
- `tools/index.js:51451`: `r.MessageCenter.on(s.HttpConst.CHECK_HIRE, function(e, o) {`
  - 是否 MessageCenter.on 注册点：**是**（`checkHireOnhook` 对应的应答事件注册点）
- `tools/index.js:51651`: `g.NetMgr.http.sendRequest(s.HttpConst.CHECK_HIRE, e);`
  - 是否 MessageCenter.on 注册点：**否**（请求发出点）

#### tools/scripts2.js
- not found

#### tools/scripts3.js
- not found

---

## 步骤 2：注册点回调函数体（括号配平）

### 1. `beginPlayGame` 回调函数体
- 对应注册点：`tools/index.js:24616`（绑定方法为 `this.beginPlayCallBack`）
- 函数起始-结束行：`tools/index.js:24657-24676`（全长 20 行，逐字抄录如下）：

```javascript
t.prototype.beginPlayCallBack = function(t, e) {
if (1 == e.eRet) {
this.playType = e.choose;
this.processNum = e.progress;
h.TimeMgr.sserverT = e.serverTime;
h.TimeMgr.startTime = Date.now();
this.beginTime = e.beginTime;
var o = {
pathName: "comUI/ONHookUI",
scriptName: "ChildrenHangUpUI"
};
m.default.promiseLoad("comUI/ONhookBgUI", o, function(t) {
var e = cc.instantiate(t);
v.PopUpMgr.addPopUp(e, y.LayerMgr.popUpLayer);
var n = e.addComponent("ChildrenHangUpBgUI");
n.setData(o);
n.setLabelTitle(i.getText(263));
});
} else 3 == e.eRet ? a.default.show(i.getText(2123)) : 4 == e.eRet && a.default.show(i.getText(2110));
};
```

### 2. `checkHireOnhook` 回调函数体
- 对应注册点：`tools/index.js:51451`（匿名函数）
- 函数起始-结束行：`tools/index.js:51451-51543`（全长 93 行，按规则抄录前 20 行 + 后 20 行，中间标注省略）：

```javascript
r.MessageCenter.on(s.HttpConst.CHECK_HIRE, function(e, o) {
var s = i.getItem(t.checkSiteID, "fishpond");
o.hasOwnProperty("maxTime") && (t.maxTime = o.maxTime);
if (1 == o.eRet) {
if (3 == s.type) t.openLimitHungUI(); else if (2 == s.type) {
var u = {
id: t.checkSiteID
};
c.default.prefabs.load("comUI/MiningBeginUI", cc.Prefab, function(t, e) {
var o = cc.instantiate(e);
p.PopUpMgr.addPopUp(o, h.LayerMgr.popUpLayer);
o.addComponent("MiningBeginUI").setData(u);
});
} else if (1 == s.type) {
var f = {
id: t.checkSiteID
};
c.default.prefabs.load("comUI/FishingBeginUI", cc.Prefab, function(t, e) {
var o = cc.instantiate(e);
p.PopUpMgr.addPopUp(o, h.LayerMgr.popUpLayer);
o.addComponent("FishingBeginUI").setData(f);
});
}
/* ... 此处省略 53 行 (Line 51474 - Line 51523) ... */
p.PopUpMgr.addPopUp(o, h.LayerMgr.popUpLayer);
var i = o.addComponent("MiningIngUI");
i.setData(v);
i.setLabelTitle(n.getText(263));
});
} else if (1 == s.type) {
var _ = {
id: t.checkSiteID,
employment: 1
};
c.default.prefabs.load("comUI/FishingIngUI", cc.Prefab, function(t, e) {
var o = cc.instantiate(e);
p.PopUpMgr.addPopUp(o, h.LayerMgr.popUpLayer);
var i = o.addComponent("FishingIngUI");
i.setData(_);
i.setLabelTitle(n.getText(263));
});
}
}
}, this);
```

---

## 步骤 3：函数体内回答 (a)(b)(c)

### 1. `beginPlayGame` 回调函数体（`tools/index.js:24657-24676`）
- (a) 有没有 `beginTime`？
  - **有**。行号：`tools/index.js:24663`（`this.beginTime = e.beginTime;`）。
- (b) 有没有把它赋给成员（形如 `X.y = e.beginTime`）？
  - **有**。行号：`tools/index.js:24663`（赋给 `this.beginTime`，所在单例类为 `ChildrenModel`）。
- (c) 有没有与当前时间做减法（`getSTimestamp() -`、`Date.now() -`、`getTime() -`、`/1000`、`*1000`）？
  - **未出现**。

### 2. `checkHireOnhook` 回调函数体（`tools/index.js:51451-51543`）
- (a) 有没有 `beginTime`？
  - **有**。行号：`tools/index.js:51516`（`t.timeElapsed = .001 * (o.serverTime - o.beginTime);`）。
- (b) 有没有把它赋给成员（形如 `X.y = e.beginTime`）？
  - **未出现**（直接参与计算后赋给 `t.timeElapsed`，未保存 `beginTime` 本身）。
- (c) 有没有与当前时间做减法（`getSTimestamp() -`、`Date.now() -`、`getTime() -`、`/1000`、`*1000`）？
  - **有**（与响应体服务端时间 `o.serverTime` 做减法并乘以 0.001 即除以 1000）。行号：`tools/index.js:51516` 原文：`t.timeElapsed = .001 * (o.serverTime - o.beginTime);`。但与本地当前时间（如 `Date.now()`、`getSTimestamp()`）做减法：**未出现**。

---

## 步骤 4：成员在三包中参与减法/除法之处

在 `beginPlayGame` 中，(b) 命中的成员为 `ChildrenModel.beginTime`（即 `this.beginTime`）。
在三包中检索该成员参与减法/除法的每一处：

- 命中总数：**2 处**（全部位于 `tools/scripts2.js` 的 `ChildrenHangUpUI` 中）：

1. `tools/scripts2.js:13167`
   - 原文：`var t = h.ChildrenModel.beginTime, e = p.TimeMgr.getSTimestamp(), o = r.getConstByID(86), i = 6e4 * parseInt(o), s = e - t;`
   - 说明：`s = e - t` 即 `TimeMgr.getSTimestamp() - ChildrenModel.beginTime`。
2. `tools/scripts2.js:13178`
   - 原文：`var t = h.ChildrenModel.beginTime, e = p.TimeMgr.getSTimestamp(), o = r.getConstByID(86), i = 6e4 * parseInt(o), s = e - t;`
   - 说明：`s = e - t` 即 `TimeMgr.getSTimestamp() - ChildrenModel.beginTime`。

在 `tools/index.js` 与 `tools/scripts3.js` 中关于该成员的减法/除法：**not found**。
