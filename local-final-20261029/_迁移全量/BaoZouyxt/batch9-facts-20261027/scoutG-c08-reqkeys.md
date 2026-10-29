# scoutG — C08 九个动作键客户端契约摘录

范围与方法：只读 `F:\BaoZouyxt\tools\index.js`、`scripts2.js`、`scripts3.js` 三个已解密 JS，先用 grep 定位再用 read（offset/limit）取小段，行号全部取自 read 工具返回的真实行号；本报告只做抄录，不含判断与建议。`scripts2.js`（3102830 字节）与 `scripts3.js`（3733348 字节）对这 9 个键 **0 命中**（含 PVE_ACTION / ROGUE_PVE_ACTION / REQ_LANGHUAN_COMBAT / REQ_ROGUE_PVE_COMBAT / MPPVE_ACTION / ROGUE_MPPVE_ACTION / REQ_ROGUE_PVP_BATTLE / START_MPPVE_BATTLE / USER_PVP），故全部证据落在 index.js — index.js:1。

---

## PVE_ACTION

### 1. HttpConst 定义行

定义块起于 `o.HttpConst = void 0;` / `o.HttpConst = {` — index.js:59489 / index.js:59490。

```
PVE_ACTION: "User.beginPVEBattle",
```
原文见 — index.js:59784

### 2. 注册点

仅有 1 处（`MessageCenter.on` 原文）：

```
r.MessageCenter.on(a.HttpConst.PVE_ACTION, function(e, o) {
```
— index.js:98852

该注册位于 `PveSvr1v1Mgr` 构造函数内（`function o() { var t = e.call(this) || this;` 起于 index.js:98827），第三参 thisArg 为 `t`，注册收尾 `}, t);` 在 index.js:98904；本文件内检出 1 处 `MessageCenter.on` 挂此键 — index.js:98852。

### 3. 请求点

发送封装是 `sendRequest`（非 sendReqWithMask），位于 `o.prototype.sendAction = function(t, e, o) {`（index.js:98942）：

```
g.NetMgr.http.sendRequest(a.HttpConst.PVE_ACTION, {
action: t,
paramID: e,
paramID1: o,
paramID2: this.bs.entityA.battleID
}, null, !0, !1, !1);
```
— index.js:98943（第二参对象字面量整体为 index.js:98943–98948，第 3–6 参 `null, !0, !1, !1` 在 index.js:98948）

外层拼装段（`sendAction` 的调用者，`o.prototype.listen4Action = function(t) {`，index.js:98917）：

```
o.prototype.listen4Action = function(t) {
if (this.bs) switch (t.t) {
case h.BtActionType.SKILL:
this.sendAction(1, t.skillID, t.useMp ? 1 : 0);
break;

case h.BtActionType.ITEM:
this.sendAction(2, t.itemID);
break;

case h.BtActionType.BREATHE:
this.sendAction(3);
break;

case h.BtActionType.CONCEDE:
break;

case h.BtActionType.SWITCH:
this.sendAction(6, t.id, t.newId);
break;

default:
this.sendAction(0);
}
};
```
— index.js:98917–98941

### 4. 应答消费回调

回调函数名：匿名闭包（注册于 `PveSvr1v1Mgr` 构造函数，thisArg `t`），无命名方法 — index.js:98852。

```
r.MessageCenter.on(a.HttpConst.PVE_ACTION, function(e, o) {
if (1 === o.eRet) {
t.syncData = o.attArr;
if (o.attArr && o.attArr.length > 0) {
if (t.bs.entityA.battleID == o.attArr[8]) {
t.bs.entityA.serverHp = o.attArr[0];
t.bs.entityA.serverHpLimt = o.attArr[1];
} else {
t.bs.entityA.serverHp = 0;
t.bs.entityA.serverHpLimt = 1;
}
if (t.bs.entityB.battleID == o.attArr[9]) {
t.bs.entityB.serverHp = o.attArr[3];
t.bs.entityB.serverHpLimt = o.attArr[4];
} else {
t.bs.entityB.serverHp = 0;
t.bs.entityB.serverHpLimt = 1;
}
} else {
t.bs.entityA.serverHp = 0;
t.bs.entityA.serverHpLimt = 1;
t.bs.entityB.serverHp = 0;
t.bs.entityB.serverHpLimt = 1;
}
var i = f.RoleBaseInfo.roleID;
o.paramID2 && "" != o.paramID2 && (i = o.paramID2);
switch (o.action) {
case 1:
t.bs.castSkill(i, o.paramID, 0, o.paramID1);
break;

case 2:
t.bs.usePotion(i, o.paramID);
t.reduceItem(o.paramID);
break;

case 3:
t.bs.breathe(i);
break;

case 6:
t.bs.switchPlayer(o.paramID, o.paramID1);
break;

case 13:
break;

case 0:
t.bs.escape(i);
}
t.btPanel.emit(u.EvName.PLAY_BATTLE_ITEM);
}
}, t);
```
— index.js:98852–98904

回调内读点清单（同一段）：`o.eRet` index.js:98853；`o.attArr` index.js:98854、98855、98856、98857、98858、98863、98864、98865；`o.paramID2` index.js:98877；`o.action` index.js:98878；`o.paramID` index.js:98880、98884、98885、98893、98894；`o.paramID1` index.js:98880、98893；`o.attArr[0..9]` 见上 — index.js:98852–98904。

回调内被调用的 `reduceItem` 定义（`o.prototype.reduceItem = function(e) {`）：

```
o.prototype.reduceItem = function(e) {
Promise.resolve().then(function() {
return t("../../models/InventoryDB");
}).then(function(t) {
if (t.InventoryDB.getItemQuantity(e) > 0) t.InventoryDB.reduceItem(e, 1); else if (c.getItem(e, "lh_temporary")) {
var o = d.TowerModel.getTowerItemNum(e);
d.TowerModel.setItem(e, o - 1);
}
});
};
```
— index.js:98907–98916

---

## ROGUE_PVE_ACTION

### 1. HttpConst 定义行

```
ROGUE_PVE_ACTION: "User.beginRoguePVEBattle",
```
原文见 — index.js:60578

### 2. 注册点

仅有 1 处：

```
s.MessageCenter.on(l.HttpConst.ROGUE_PVE_ACTION, function(e, o) {
```
— index.js:104192

注册位于 `RogueBattleMgr` 构造函数内（`function o() { var t = e.call(this) || this;`，index.js:104094），thisArg 为 `t`，收尾 `}, t);` 在 index.js:104239 — index.js:104192。

### 3. 请求点

发送封装 `sendRequest`，位于 `o.prototype.sendAction = function(t, e, o) {`（index.js:104454）：

```
d.NetMgr.http.sendRequest(l.HttpConst.ROGUE_PVE_ACTION, {
action: t,
paramID: e,
paramID1: o,
paramID2: this.bs.entityA.battleID
}, null, !0, !1, !1);
```
— index.js:104460（对象字面量 index.js:104460–104464，第 3–6 参在 index.js:104465）

同函数内的本地拼装/记账段：

```
o.prototype.sendAction = function(t, e, o) {
this.actionArr.push({
action: t,
paramID: e,
paramID1: o
});
```
— index.js:104454–104459

调用者 `listen4Action` 的相关分支（`o.prototype.listen4Action`，index.js:104425 起）：`this.sendAction(2, t.itemID);` index.js:104426、`this.sendAction(3);` index.js:104432、`this.sendAction(6, "" + t.id, "" + t.newId);` index.js:104439、`this.sendAction(0);` index.js:104443 — index.js:104425–104443。

### 4. 应答消费回调

回调函数名：匿名闭包（注册于 `RogueBattleMgr` 构造函数，thisArg `t`）；注册点函数体即消费体，`resolve` 由 `t` 承载 — index.js:104192。

```
s.MessageCenter.on(l.HttpConst.ROGUE_PVE_ACTION, function(e, o) {
if (1 === o.eRet) {
t.syncData = o.attArr;
if (o.attArr && o.attArr.length > 0) {
t.bs.entityA.serverHp = o.attArr[0];
t.bs.entityA.serverHpLimt = o.attArr[1];
t.bs.entityB.serverHp = o.attArr[3];
t.bs.entityB.serverHpLimt = o.attArr[4];
} else {
t.bs.entityA.serverHp = 0;
t.bs.entityA.serverHpLimt = 1;
t.bs.entityB.serverHp = 0;
t.bs.entityB.serverHpLimt = 1;
}
var i = T.RoleBaseInfo.roleID + "";
o.paramID2 && "" != o.paramID2 && (i = o.paramID2);
switch (o.action) {
case 1:
t.bs.castSkill(i, o.paramID, 0, o.paramID1);
break;

case 2:
t.bs.usePotion(i, o.paramID);
t.reduceItem(o.paramID);
break;

case 3:
t.bs.breathe(i);
break;

case 6:
t.bs.switchPlayer(o.paramID, o.paramID1);
break;

case 13:
break;

case 0:
t.bs.escape(i);
}
if (o.attArr && o.attArr.length > 0) {
o.attArr[10] && (t.bs.shapeshiftingNpcID = o.attArr[10]);
o.attArr[11] && (t.bs.shapeState = o.attArr[11]);
t.bs.shapeState && console.log("boss变身");
}
t.btPanel.emit(m.EvName.PLAY_BATTLE_ITEM);
}
}, t);
```
— index.js:104192–104239

读点清单：`o.eRet` index.js:104193；`o.attArr` index.js:104194、104195、104196、104197、104198、104199、104232、104233、104234；`o.paramID2` index.js:104207；`o.action` index.js:104208；`o.paramID` index.js:104210、104214、104215、104223、104224；`o.paramID1` index.js:104210、104223 — index.js:104192–104239。

---

## REQ_LANGHUAN_COMBAT

### 1. HttpConst 定义行

```
REQ_LANGHUAN_COMBAT: "User.enterPVEBattle",
```
原文见 — index.js:59783

### 2. 注册点

仅有 1 处：

```
r.MessageCenter.on(a.HttpConst.REQ_LANGHUAN_COMBAT, function(e, o) {
```
— index.js:98832

位于 `PveSvr1v1Mgr` 构造函数内，thisArg `t`，收尾 `}, t);` 在 index.js:98851 — index.js:98832。

### 3. 请求点

发送封装 `sendRequest`，在 `t.prototype.startBattle = function(t) {`（index.js:67546，`LangHMode`）中**有两个分支调用同一键**：

分支一（带 `floorLv`）：

```
t.hasOwnProperty("floorLv") ? r.NetMgr.http.sendRequest(n.HttpConst.REQ_LANGHUAN_COMBAT, {
lv: t.floorLv,
npcID: t.npcID,
mp: e.mp.remaining,
gTime: e.totalGameTime.gameTime,
hgtimes: e.numStuffed
}) : r.NetMgr.http.sendRequest(n.HttpConst.REQ_LANGHUAN_COMBAT, {
npcID: t.npcID,
mp: e.mp.remaining,
gTime: e.totalGameTime.gameTime,
hgtimes: e.numStuffed
});
```
— index.js:67548（三元表达式 index.js:67548–67559；分支一对象字面量 index.js:67548–67553，分支二对象字面量 index.js:67554–67559）

同函数内的实参来源：`t.prototype.startBattle = function(t) { var e = i.UserModel.entity;` — index.js:67546–67547。

外层拼装段（调用 `LangHMode.startBattle(t)` 的一处，`e.prototype.enterColorEgg = function(t) {` 内）：

```
var n = {
npcSceneID: 1,
npcID: this.elitMasterData[0],
npcData: o,
floorLv: this.sweepLv
};
b.BattleMgr.startLangHFight(n).then(function() {
```
— index.js:138292–138298

其上一层 `t.prototype.startLangHFight = function(t) {`（index.js:13103）内 `i.startBattle(t);` 在 index.js:13109 — index.js:13103–13111。

### 4. 应答消费回调

回调函数名：匿名闭包（注册于 `PveSvr1v1Mgr` 构造函数，thisArg `t`）— index.js:98832。

```
r.MessageCenter.on(a.HttpConst.REQ_LANGHUAN_COMBAT, function(e, o) {
if (1 === o.eRet) {
t.syncData = o.attArr;
t.reviveCost = o.gold;
var i = o.AttckData;
if (i.hasOwnProperty("veinObj")) {
var n = i.veinObj[1];
for (var r in n) {
var a = c.getItem(r, "acupoint");
1 != a.meridians && 2 != a.meridians || c.getItem(a.meridians, "meridians").acupoint6.indexOf(parseInt(r)) >= 0 && (n[r] = 0);
}
}
t.tower && (o.AttckData.tower = 1);
l.parsePlayerData(o.AttckData);
var s = l.createPlayerBattleEntity(o.AttckData), h = t.generateNpcData(o.npcArr, o.npcID), u = new p();
l.initRivalEntity(u, h);
o.npcID != s.battleID ? u.battleID = o.npcID : u.battleID = o.npcID + 1;
t.initBattleSystem(s, u, o.randSeed);
}
}, t);
```
— index.js:98832–98851

读点清单：`o.eRet` index.js:98833；`o.attArr` index.js:98834；`o.gold` index.js:98835；`o.AttckData` index.js:98836、98844、98845、98846；`o.AttckData.tower` index.js:98844；`o.npcArr` index.js:98846；`o.npcID` index.js:98846、98848；`o.randSeed` index.js:98849 — index.js:98832–98851。

---

## REQ_ROGUE_PVE_COMBAT

### 1. HttpConst 定义行

```
REQ_ROGUE_PVE_COMBAT: "User.enterRoguePVEBattle",
```
原文见 — index.js:60577

### 2. 注册点

仅有 1 处：

```
s.MessageCenter.on(l.HttpConst.REQ_ROGUE_PVE_COMBAT, function(e, o) {
```
— index.js:104129

位于 `RogueBattleMgr` 构造函数内，thisArg `t`，收尾 `}, t);` 在 index.js:104191 — index.js:104129。

### 3. 请求点

发送封装 `sendRequest`，与 REQ_ROGUE_PVP_BATTLE 共用同一条三元表达式，位于 `o.prototype.startBattle = function(e) {`（index.js:104242）：

```
o.prototype.startBattle = function(e) {
Promise.resolve().then(function() {
return t("../../../scripts3/model3/RogueModel");
}).then(function(t) {
var o = t.RogueModel.entity;
if (o) {
e.hp = o.hp.remaining;
e.hplimit = o.hp.limit;
e.mp = o.mp.remaining;
}
_.BattleMgr.mode == S.BattleTypes.ROGUE_PVE ? d.NetMgr.http.sendRequest(l.HttpConst.REQ_ROGUE_PVE_COMBAT, e) : d.NetMgr.http.sendRequest(l.HttpConst.REQ_ROGUE_PVP_BATTLE, e);
});
};
```
— index.js:104242–104254（第二参为变量 `e`，非字面量；`e` 在 index.js:104248–104250 被追加 `hp` / `hplimit` / `mp` 三个字段后才发送，见 index.js:104252）

`e` 的拼装段（调用 `RogueBattleMgr.startBattle` 的上游，`BattleMgr` 的 `t.prototype.startNpcFight` 内 rogue 分支）：

```
this.startRoguePVEFight({
npcID: t.npcID
});
```
— index.js:13080–13082

另一处拼装（`e.prototype.getRogueTaskCallBack` 内）：

```
T.BattleMgr.startRoguePVEFight({
npcID: s
});
```
— index.js:133233–133235

其上一层 `t.prototype.startRoguePVEFight = function(t) {` 内 `i.startBattle(t);` 在 index.js:13166 — index.js:13159–13169。

### 4. 应答消费回调

回调函数名：匿名闭包（注册于 `RogueBattleMgr` 构造函数，thisArg `t`）— index.js:104129。

```
s.MessageCenter.on(l.HttpConst.REQ_ROGUE_PVE_COMBAT, function(e, o) {
if (1 === o.eRet) {
t.syncData = o.attArr;
c.parsePlayerData(o.AttckData);
var i = t.generateNpcData(o.npcArr, o.npcID);
if (o.AttckData.floorBuff && (!o.AttckData.hasOwnProperty("isBoss") || 0 == o.AttckData.isBoss)) {
var n = f.getItem(o.AttckData.floorBuff, "rogue_floorbuff");
if (n) {
o.AttckData.rogueFloorBuffs = n.playerbuff;
i.rogueFloorBuffs = n.enemybuff;
}
}
var r = c.createPlayerBattleEntity(o.AttckData), a = new u();
c.initRivalEntity(a, i);
a.battleID = o.npcID;
a.serverNpcID = o.npcID;
a.battleID == r.battleID && (a.battleID += 1);
r.isBoss = 0;
a.isBoss = 0;
if (o.AttckData.hasOwnProperty("isBoss")) {
r.isBoss = o.AttckData.isBoss;
a.isBoss = o.AttckData.isBoss;
}
if (o.AttckData.hasOwnProperty("eliteBuffs") && o.AttckData.eliteBuffs.length > 0) for (var s = o.AttckData.eliteBuffs, l = 0; l < s.length; l++) if (I = f.getItem(s[l], "rogue_elite")) for (var h = I.sect.split("|"), d = 0; d < h.length; d++) 1 == (b = h[d].split(","))[0] ? a.initBuffs.push(b[1]) : 2 == b[0] ? r.initBuffs.push(b[1]) : 3 == b[0] && a.initBuffs.push([ b[1], b[2] ]);
t.bs = new p(o.randSeed, r, a, !1);
var g = C.MadUtilsTS.getPartner(r), m = C.MadUtilsTS.getPartner(a);
if (g || m) {
var y = [ r ], v = [ a ];
g && y.push(g);
m && v.push(m);
t.bs.addEntityAs(y);
t.bs.addEntityBs(v);
}
if (o.hasOwnProperty("exchangeNpcArr") && o.exchangeNpcArr.length > 0) for (l = 0; l < o.exchangeNpcArr.length; l++) {
var _ = o.exchangeNpcArr[l], S = t.generateNpcData(_, _[_.length - 1]);
i.hasOwnProperty("rogueFloorBuffs");
var M = new u();
c.initRivalEntity(M, S, o.npcID);
M.isBoss = r.isBoss;
if (o.AttckData.hasOwnProperty("eliteBuffs") && o.AttckData.eliteBuffs.length > 0) {
s = o.AttckData.eliteBuffs;
for (var E = 0; E < s.length; E++) {
var I;
if (I = f.getItem(s[E], "rogue_elite")) for (h = I.sect.split("|"), d = 0; d < h.length; d++) {
var b;
1 == (b = h[d].split(","))[0] ? M.initBuffs.push(b[1]) : 3 == b[0] && M.initBuffs.push([ b[1], b[2] ]);
}
}
}
M.battleID = a.battleID;
M.serverNpcID = o.npcID;
M.start(t.bs);
t.bs.npcEntitys[_[_.length - 1]] = M;
}
if (o.attArr && o.attArr.length > 0) {
r.serverHp = o.attArr[0];
r.serverHpLimt = o.attArr[1];
a.serverHp = o.attArr[3];
a.serverHpLimt = o.attArr[4];
}
t.initBattleSystemNew(r, a, o.randSeed);
}
}, t);
```
— index.js:104129–104191

读点清单：`o.eRet` index.js:104130；`o.attArr` index.js:104131、104183、104184–104187；`o.AttckData` index.js:104132、104134、104135、104137、104141、104148、104149、104150；`o.AttckData.floorBuff` index.js:104134、104135；`o.AttckData.isBoss` index.js:104134、104149、104150；`o.AttckData.eliteBuffs` index.js:104152、104168、104169；`o.npcArr` index.js:104133；`o.npcID` index.js:104133、104143、104144、104166、104179；`o.randSeed` index.js:104153、104189；`o.exchangeNpcArr` index.js:104162、104163 — index.js:104129–104191。

---

## MPPVE_ACTION

### 1. HttpConst 定义行

```
MPPVE_ACTION: "User.beginMultiPVEBattle",
```
原文见 — index.js:59787

### 2. 注册点

仅有 1 处：

```
r.MessageCenter.on(c.HttpConst.MPPVE_ACTION, function(t, o) {
1 == o.eRet && e.playWithData(o);
}, e);
```
— index.js:110876

位于 `SPMpBtMgr` 构造函数内（`function e() { var e = t.call(this) || this;`，index.js:110842），thisArg 为 `e` — index.js:110876。

### 3. 请求点

发送封装 `sendRequest`，位于 `e.prototype.listen4Action = function(t) {`（index.js:110938）：

```
e.prototype.listen4Action = function(t) {
p.NetMgr.http.sendRequest(c.HttpConst.MPPVE_ACTION, {
action: t.action,
battleID: t.param2,
attackID: t.param3,
paramID: t.param1
});
};
```
— index.js:110938–110945（第二参对象字面量 index.js:110939–110944）

### 4. 应答消费回调

回调函数名：匿名闭包（注册于 `SPMpBtMgr` 构造函数，thisArg `e`），体内唯一的消费动作是转交 `e.playWithData(o)` — index.js:110876。

```
r.MessageCenter.on(c.HttpConst.MPPVE_ACTION, function(t, o) {
1 == o.eRet && e.playWithData(o);
}, e);
```
— index.js:110876–110878

转交目标一：`SPMpBtMgr.playWithData`（`e.prototype.playWithData = function(e) {`）：

```
e.prototype.playWithData = function(e) {
t.prototype.playWithData.call(this, e);
if (e && e.hasOwnProperty("playerSkills") && this.btUI) {
var o = this.btUI.getComponent("MPUIMediator");
if (o) {
var i = e.playerSkills[o.battleID];
if (i && i.dataArr) {
o.attackMpCost = i.mpCost;
o.dataArr = i.dataArr;
o.uiEffIds = i.uiEffIds;
o.summomState = i.summomState;
o.playerSkillsData = i;
if (0 == i.isPartner[o.battleID]) {
o.addDisabledBtn(9);
o.disabledBtnOne(9, !1, !1);
}
i.hasOwnProperty("atkSkillID") && (o.atkSkillID = i.atkSkillID);
}
}
}
};
```
— index.js:110905–110925

转交目标二（`t` = `MpMgrBase`，依赖见 index.js:110990 `"./MpMgrBase": "MpMgrBase"`）：`MpMgrBase.prototype.playWithData`（`e.prototype.playWithData = function(t) {`）：

```
e.prototype.playWithData = function(t) {
var e, o;
if (t.arr.transitionID) {
var i = t.arr.jsonData;
i.oldnpcId && (this.state.mainNpc = Number(i.oldnpcId));
i.npcID && (this.state.NpcId = Number(i.npcID));
delete t.arr.jsonData;
null === (e = this.btUI) || void 0 === e || e.emit(g.EvName.PLAY_WITH_MPBATTLEINFO, t.arr);
this.nextFightData = i;
t.hasOwnProperty("playerSkills") && (this.playerSkills = t.playerSkills);
} else {
this.state.actingPlayerID = t.hasOwnProperty("target") ? t.target[0] : 0;
this.state.actingPlayerID == m.RoleBaseInfo.roleID.toString() && y.MessageCenter.dispatch(g.EvName.ON_MPPVE_TARGET_CHANGE, t.target[1]);
this.state.gameOver = t.gameOver;
if (this.state.gameOver) {
this.state.winID = t.winID;
t.endInfo && (this.state.endInfo = t.endInfo);
if (t.hasOwnProperty("roleArr")) for (var n = t.roleArr, r = 0; r < n.length; ++r) {
var a = n[r];
if (m.RoleBaseInfo.roleID == parseInt(a[0])) {
var s = v.UserModel.entity;
s.hp.limit = a[3];
s.hp.remaining = a[1];
s.mp.remaining = a[2];
}
}
}
t.arr && (null === (o = this.btUI) || void 0 === o || o.emit(g.EvName.PLAY_WITH_MPBATTLEINFO, t.arr));
}
};
```
— index.js:84147–84176

读点清单（含转交链）：`o.eRet` index.js:110877；`e.playerSkills` index.js:110910、110913；`i.dataArr` index.js:110911、110913；`i.mpCost` index.js:110912；`i.uiEffIds` index.js:110914；`i.summomState` index.js:110915；`i.isPartner[o.battleID]` index.js:110917；`i.atkSkillID` index.js:110921；`t.arr.transitionID` index.js:84149；`t.arr.jsonData` index.js:84150；`i.oldnpcId` index.js:84151；`i.npcID` index.js:84152；`t.playerSkills` index.js:84156；`t.target` index.js:84158、84159；`t.gameOver` index.js:84160；`t.winID` index.js:84162；`t.endInfo` index.js:84163；`t.roleArr` index.js:84164、84165；`t.arr` index.js:84174 — index.js:110876–110925、84147–84176。

---

## ROGUE_MPPVE_ACTION

### 1. HttpConst 定义行

```
ROGUE_MPPVE_ACTION: "User.beginRogueMultiPVEBattle",
```
原文见 — index.js:60506

### 2. 注册点

仅有 1 处：

```
d.MessageCenter.on(p.HttpConst.ROGUE_MPPVE_ACTION, function(e, o) {
1 == o.eRet && t.playWithData(o);
}, t);
```
— index.js:105258

位于 `RogueMpFightMgr` 构造函数内（`function o() { var t = e.call(this) || this;`，index.js:105256），thisArg 为 `t` — index.js:105258。

### 3. 请求点

发送封装 `sendRequest`，位于 `o.prototype.listen4Action = function(t) {`（index.js:105560）：

```
o.prototype.listen4Action = function(t) {
h.NetMgr.http.sendRequest(p.HttpConst.ROGUE_MPPVE_ACTION, {
action: t.action,
battleID: t.param2,
paramID: t.param1
});
};
```
— index.js:105560–105566（第二参对象字面量 index.js:105561–105565，字面量键为 `action` / `battleID` / `paramID` 三项，见 index.js:105561–105565）

同模块内的另一条发送（非本键）：`o.prototype.startBattle = function(t) { h.NetMgr.http.sendRequest(p.HttpConst.ENTER_PVE_ROGUE_FIGHT, t); };` — index.js:105557–105559。

### 4. 应答消费回调

回调函数名：匿名闭包（注册于 `RogueMpFightMgr` 构造函数，thisArg `t`），消费体在 `t.playWithData` — index.js:105258。

```
d.MessageCenter.on(p.HttpConst.ROGUE_MPPVE_ACTION, function(e, o) {
1 == o.eRet && t.playWithData(o);
}, t);
```
— index.js:105258–105260

转交目标：`RogueMpFightMgr.prototype.playWithData`（`o.prototype.playWithData = function(e) {`）：

```
o.prototype.playWithData = function(e) {
var o;
this.state.actingPlayerID = e.hasOwnProperty("target") ? e.target[0] : 0;
this.state.actingPlayerID == g.RoleBaseInfo.roleID.toString() && d.MessageCenter.dispatch(m.EvName.ON_MPPVE_TARGET_CHANGE, e.target[1]);
this.state.gameOver = e.gameOver;
if (this.state.gameOver) {
this.state.winID = e.winID;
e.endInfo && (this.state.endInfo = e.endInfo);
if (e.hasOwnProperty("roleArr")) for (var i = e.roleArr, n = 0; n < i.length; ++n) {
var r = i[n];
g.RoleBaseInfo.roleID == parseInt(r[0]) && Promise.resolve().then(function() {
return t("../../../scripts3/model3/RogueModel");
}).then(function(t) {
var e = t.RogueModel.entity;
e.hp.limit = r[3];
e.hp.remaining = r[1];
e.mp.remaining = r[2];
});
}
}
e.arr && (null === (o = this.btUI) || void 0 === o || o.emit(m.EvName.PLAY_WITH_MPBATTLEINFO, e.arr));
};
```
— index.js:105567–105588

读点清单：`o.eRet` index.js:105259；`e.target` index.js:105569、105570；`e.gameOver` index.js:105571；`e.winID` index.js:105573；`e.endInfo` index.js:105574；`e.roleArr` index.js:105575；`r[0]`/`r[1]`/`r[2]`/`r[3]` index.js:105577–105583；`e.arr` index.js:105587 — index.js:105258–105260、105567–105588。

注：本类 `playWithData` 体内**未**调用 `t.prototype.playWithData.call(this, e)`（对照 SPMpBtMgr 的 index.js:110906），基类为 `f.SPMpBtMgr`（index.js:105605 `}(f.SPMpBtMgr);`）— index.js:105567–105605。

---

## REQ_ROGUE_PVP_BATTLE

### 1. HttpConst 定义行

```
REQ_ROGUE_PVP_BATTLE: "User.ChallengeRoguePVP",
```
原文见 — index.js:60502

### 2. 注册点

仅有 1 处：

```
s.MessageCenter.on(l.HttpConst.REQ_ROGUE_PVP_BATTLE, function(e, o) {
```
— index.js:104101

位于 `RogueBattleMgr` 构造函数内，thisArg `t`，收尾 `}, t);` 在 index.js:104122 — index.js:104101。

### 3. 请求点

发送封装 `sendRequest`，与 REQ_ROGUE_PVE_COMBAT 共用同一条三元表达式（见上文 index.js:104242–104254），本键走 else 分支：

```
_.BattleMgr.mode == S.BattleTypes.ROGUE_PVE ? d.NetMgr.http.sendRequest(l.HttpConst.REQ_ROGUE_PVE_COMBAT, e) : d.NetMgr.http.sendRequest(l.HttpConst.REQ_ROGUE_PVP_BATTLE, e);
```
— index.js:104252（第二参为变量 `e`；`e` 在 index.js:104248–104250 追加 `hp` / `hplimit` / `mp`）

`e` 的拼装/透传链同 REQ_ROGUE_PVE_COMBAT：`t.prototype.startRoguePVPFight = function(t) {` 内 `i.startBattle(t);` 在 index.js:13176 — index.js:13170–13179；更上游 `{ npcID: ... }` 字面量见 index.js:13080–13082、index.js:133233–133235（二者均经 `startRoguePVEFight` 入口，见 index.js:13159–13169）。

### 4. 应答消费回调

回调函数名：匿名闭包（注册于 `RogueBattleMgr` 构造函数，thisArg `t`）— index.js:104101。

```
s.MessageCenter.on(l.HttpConst.REQ_ROGUE_PVP_BATTLE, function(e, o) {
if (1 === o.eRet) {
c.parsePlayerData(o.EnemyData);
c.parsePlayerData(o.AttckData);
if (o.AttckData.floorBuff && (!o.AttckData.hasOwnProperty("isBoss") || 0 == o.AttckData.isBoss)) {
var i = f.getItem(o.AttckData.floorBuff, "rogue_floorbuff");
if (i) {
o.AttckData.rogueFloorBuffs = i.playerbuff;
o.EnemyData.rogueFloorBuffs = i.enemybuff;
}
}
var n = c.createPlayerBattleEntity(o.AttckData), r = c.createPlayerBattleEntity(o.EnemyData);
n.roguePvpDmg = !0;
r.roguePvpDmg = !0;
r.hp.init();
r.mp.init();
r.initialHp = r.hp.remaining;
r.initialHpLimit = r.hp.limit;
r.auto = !0;
t.initBattleSystem(n, r, Date.now());
}
}, t);
```
— index.js:104101–104122

读点清单：`o.eRet` index.js:104102；`o.EnemyData` index.js:104103、104109、104112；`o.AttckData` index.js:104104、104105、104106、104108、104112；`o.AttckData.floorBuff` index.js:104105、104106；`o.AttckData.isBoss` index.js:104105；`i.playerbuff` index.js:104108；`i.enemybuff` index.js:104109 — index.js:104101–104122。

---

## START_MPPVE_BATTLE

### 1. HttpConst 定义行

```
START_MPPVE_BATTLE: "User.startMultiPVEBattle",
```
原文见 — index.js:59786

### 2. 注册点

仅有 1 处：

```
r.MessageCenter.on(c.HttpConst.START_MPPVE_BATTLE, function(t, o) {
if (1 == o.eRet) {
e.btUI && e.btUI.getComponent("MPUIMediator").setPartnerBtn(o);
e.playWithData(o);
}
}, e);
```
— index.js:110870

位于 `SPMpBtMgr` 构造函数内，thisArg 为 `e` — index.js:110870。

### 3. 请求点

发送封装 `sendRequest`，位于 `e.prototype.postProcess = function(t) {`（index.js:110933）：

```
e.prototype.postProcess = function(t) {
t.on(h.EvName.START_BATTLE, function() {
p.NetMgr.http.sendRequest(c.HttpConst.START_MPPVE_BATTLE);
});
};
```
— index.js:110933–110937（调用点 index.js:110935 **只传 1 个参数**，无第二参/请求参数对象字面量，也无外层拼装段）

### 4. 应答消费回调

回调函数名：匿名闭包（注册于 `SPMpBtMgr` 构造函数，thisArg `e`）— index.js:110870。

```
r.MessageCenter.on(c.HttpConst.START_MPPVE_BATTLE, function(t, o) {
if (1 == o.eRet) {
e.btUI && e.btUI.getComponent("MPUIMediator").setPartnerBtn(o);
e.playWithData(o);
}
}, e);
```
— index.js:110870–110875

转交目标与 MPPVE_ACTION 完全相同：`SPMpBtMgr.playWithData` index.js:110905–110925 → `MpMgrBase.playWithData` index.js:84147–84176（全文见上文 MPPVE_ACTION 第 4 项，此处不重复；`setPartnerBtn(o)` 直接把整个应答对象传入，index.js:110872）。

读点清单：`o.eRet` index.js:110871；`o` 整体传入 `setPartnerBtn(o)` index.js:110872；`playWithData(o)` 内的读点见 index.js:110905–110925、84147–84176 — index.js:110870–110875。

---

## USER_PVP

### 1. HttpConst 定义行

```
USER_PVP: "User.ChallengePVP",
```
原文见 — index.js:59505

### 2. 注册点

仅有 1 处：

```
r.MessageCenter.on(a.HttpConst.USER_PVP, function(t, o) {
```
— index.js:101326

位于 `RankMgr` 构造函数内（`function e() { var e = t.call(this) || this;`，index.js:101319），thisArg 为 `e`，收尾 `}, e);` 在 index.js:101342 — index.js:101326。

### 3. 请求点

发送封装 `sendRequest`，位于 `e.prototype.startBattle = function(t) {`（index.js:101345）；第二参为本地变量 `o`，拼装段紧随其后：

```
e.prototype.startBattle = function(t) {
var e = y.playerInfo.entity;
t.hasOwnProperty("isGoodEvilPk") ? this.isGoodEvilPk = t.isGoodEvilPk : this.isGoodEvilPk = !1;
var o = {
otherRoleID: t.rid,
mp: e.mp.remaining,
gTime: e.totalGameTime.gameTime,
hgtimes: e.numStuffed
};
t.hasOwnProperty("flag") && (o.flag = t.flag);
s.NetMgr.http.sendRequest(a.HttpConst.USER_PVP, o);
t.hasOwnProperty("isFriendPk") && t.isFriendPk ? this.isFriendPk = t.isFriendPk : this.isFriendPk = 0;
};
```
— index.js:101345–101357（`o` 字面量 index.js:101348–101353，条件追加 `o.flag` index.js:101354，调用点 index.js:101355）

外层拼装段（`e.prototype.onBtn0 = function() {` 内，`t` 的来源之一）：

```
f.BattleMgr.startRankFight({
rid: this.roleInfo.ohterInfo.id,
flag: 1
}).then(function() {});
```
— index.js:101642–101645

下一层 `t.prototype.startRankFight = function(t) {`（index.js:13149）内 `i.startBattle(t);` 在 index.js:13155 — index.js:13149–13158。

### 4. 应答消费回调

回调函数名：匿名闭包（注册于 `RankMgr` 构造函数，thisArg `e`）— index.js:101326。

```
r.MessageCenter.on(a.HttpConst.USER_PVP, function(t, o) {
if (1 === o.eRet) {
e.isGoodEvilPk && (o.AttckData.getargetType = 1);
h.parsePlayerData(o.EnemyData);
h.parsePlayerData(o.AttckData);
var i = h.createPlayerBattleEntity(o.AttckData), n = h.createPlayerBattleEntity(o.EnemyData);
n.hp.init();
n.mp.init();
n.initialHp = n.hp.remaining;
n.initialHpLimit = n.hp.limit;
n.auto = !0;
e.initBattleSystem(i, n, Date.now());
} else if (3 === o.eRet) {
m.default.show(g.getText(1399));
e.dispose();
} else e.dispose();
}, e);
```
— index.js:101326–101342

读点清单：`o.eRet`（1）index.js:101327；`o.AttckData` index.js:101328、101330、101331；`o.AttckData.getargetType` 写入 index.js:101328；`o.EnemyData` index.js:101329、101331；`o.eRet`（3）index.js:101338 — index.js:101326–101342。

---

## 未能验证

- `scripts2.js`：9 个键逐字计数均为 0（`PVE_ACTION` 0、`ROGUE_PVE_ACTION` 0、`REQ_LANGHUAN_COMBAT` 0、`REQ_ROGUE_PVE_COMBAT` 0、`MPPVE_ACTION` 0、`ROGUE_MPPVE_ACTION` 0、`REQ_ROGUE_PVP_BATTLE` 0、`START_MPPVE_BATTLE` 0、`USER_PVP` 0），第 2/3/4 项在该文件 0 命中 — scripts2.js:1。
- `scripts3.js`：同上，9 个键逐字计数均为 0，第 2/3/4 项在该文件 0 命中 — scripts3.js:1。
- 因此本报告第 2、3、4 项全部来自 index.js，**没有任何** `scriptsX.js:行号` 形式的注册点（模板要求的 scriptsX.js 在本次三文件范围内不存在命中）— index.js:98852。
- 9 个键的注册点在源码层面各只有 1 处，但 4 个注册写在**构造函数体内**（`PveSvr1v1Mgr` index.js:98827、`RogueBattleMgr` index.js:104094、`SPMpBtMgr` index.js:110842、`RankMgr` index.js:101319、`RogueMpFightMgr` index.js:105256），运行时注册次数取决于实例化次数；已见 `new E.RogueBattleMgr()` 出现在 index.js:13164 与 index.js:13174，`new b.RogueMpFightMgr()` 出现在 index.js:13184，实际实例化次数未验证 — index.js:13164、13174、13184。
- `START_MPPVE_BATTLE` 的请求点 `p.NetMgr.http.sendRequest(c.HttpConst.START_MPPVE_BATTLE);` 只传 1 个参数，三文件内不存在该键的请求参数对象字面量，第 3 项只能给到调用原文（缺"第二参"这一层）— index.js:110935。
- `REQ_ROGUE_PVE_COMBAT` / `REQ_ROGUE_PVP_BATTLE` 的发送点第二参是变量 `e`，非字面量；能展开到的最深一层是 `{ npcID: ... }` 字面量（index.js:13080–13082、index.js:133233–133235）加上运行期追加的 `e.hp` / `e.hplimit` / `e.mp`（index.js:104248–104250），`hp`/`mp` 之外的其它字段无字面量可抄 — index.js:104248–104252。
- `REQ_ROGUE_PVP_BATTLE` 未找到分支专属的上游调用：`startRoguePVPFight` 在 index.js 内只有定义（index.js:13170），未见其调用点，故该键的 `e` 拼装只能引用 ROGUE_PVE 同款字面量 — index.js:13170。
- `REQ_LANGHUAN_COMBAT` 有 2 个发送分支（index.js:67548 与 index.js:67554），键相同、参数对象字段不同（前者多 `lv`）；`startLangHFight` 的调用点在全文件只找到 1 处（index.js:138298），另一类分支（无 `floorLv`）的上游拼装未定位 — index.js:67548、67554、138298。
- 9 个回调内 **0 处** `note.*` / `note.attrch.*` 读点；全文件 `note.attrch` 只出现在 index.js:64779、64781、138892，均不属于这 9 个键的回调 — index.js:64779。
- 9 个键的发送封装全为 `sendRequest`；`sendReqWithMask` 全文件 111 处命中（如 index.js:1788、index.js:23646 定义）无一挂这 9 个键 — index.js:1788。
- 回调命名：9 个键的消费体全部是构造期匿名闭包，**不存在** `onPveAction` 这类命名方法（全文件 grep `onPveAction` / `onMpPveAction` / `onMpAction` 均 0 命中）— index.js:98852。

## 范围外发现

- `ROGUE_PVE_BATTLE_END`（index.js:60501）、`ROGUE_PVP_BATTLE_END`（index.js:60503）、`ROGUE_PVE_BATTLE_RESULT`（index.js:60579）。
- `USER_PVP_OVER`（index.js:59506；消费 index.js:101490、112457、112506；发送 index.js:101408）。
- `PVE_ACTION_RET`（index.js:45365）、`CTS_PVE_ACTION_REQ`（index.js:59917；发送 index.js:55001）。
- `INIT_MPPVE_BATTLE`（index.js:59785；注册 index.js:110844）、`REQ_MPPVE_FIGHTER_INFO`（index.js:59794）、`GET_MP_ULTSKILLS`（index.js:59791）、`MPPVE_SELECT_TARGET`（index.js:59788）。
- `REQ_ROGUE_PVE_BATTLE`（index.js:60500）、`ENTER_PVE_ROGUE_FIGHT`（index.js:60504）、`SERVER_ROGUE_NPC_BATTLE_END`（index.js:60505）、`LANGH_REVIVE`（index.js:59790）、`LANGH_MP_REVIVE`（index.js:59795）。
- `MessageCenter.on("ActionRes", ...)`（index.js:54903，非 HttpConst 键）、`MessageCenter.on(m.EvName.USE_NEW_ITEM_EVENT, ...)`（index.js:104123，与 ROGUE 战斗同一构造函数内注册）。

## 自检

- PVE_ACTION：4/4 项齐（定义 index.js:59784 / 注册 index.js:98852 / 请求 index.js:98943 / 回调 index.js:98852–98904）。
- ROGUE_PVE_ACTION：4/4 项齐（index.js:60578 / index.js:104192 / index.js:104460 / index.js:104192–104239）。
- REQ_LANGHUAN_COMBAT：4/4 项齐（index.js:59783 / index.js:98832 / index.js:67548 与 67554 / index.js:98832–98851）。
- REQ_ROGUE_PVE_COMBAT：4/4 项齐（index.js:60577 / index.js:104129 / index.js:104252 / index.js:104129–104191）。
- MPPVE_ACTION：4/4 项齐（index.js:59787 / index.js:110876 / index.js:110939 / index.js:110876–110878 + 转交 index.js:110905–110925、84147–84176）。
- ROGUE_MPPVE_ACTION：4/4 项齐（index.js:60506 / index.js:105258 / index.js:105561 / index.js:105258–105260 + index.js:105567–105588）。
- REQ_ROGUE_PVP_BATTLE：4/4 项齐（index.js:60502 / index.js:104101 / index.js:104252 / index.js:104101–104122）。
- START_MPPVE_BATTLE：4/4 项齐（index.js:59786 / index.js:110870 / index.js:110935 单参 / index.js:110870–110875）。
- USER_PVP：4/4 项齐（index.js:59505 / index.js:101326 / index.js:101355 / index.js:101326–101342）。

计数复核：9 个键名一级小节（`## <键名>`）各 1 个、共 9 个，每节 4 个编号子项；另有模板规定的 3 个尾部小节（`## 未能验证`、`## 范围外发现`、`## 自检`）。全部结论行均带 `文件:行号`，行号取自 read 工具返回值。
