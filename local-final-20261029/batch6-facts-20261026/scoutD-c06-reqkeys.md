# scoutD-c06 · 15 动作 HttpConst/注册点/请求点/应答消费 摘录

范围：`F:\BaoZouyxt\tools\index.js`、`F:\BaoZouyxt\tools\scripts2.js`、`F:\BaoZouyxt\tools\scripts3.js`。只摘录，不判断。

方法说明（机械事实）：
- `grep KEY:"User.xxx"` 在 index.js 命中 15 行（HttpConst 定义表全部位于 index.js）。
- 以 `\.HttpConst\.(15个KEY)\b` 扫三文件：scripts2.js 0 命中、scripts3.js 0 命中、index.js 命中 30 处（全部对应下列摘录）。
- 又以 `User.(BeginTraining|EndTraining|…|removeMartial)` 字符串字面量扫 scripts2.js / scripts3.js：均 0 命中。即 15 个动作的使用点全部只在 index.js。
- HttpConst 在压缩代码中按模块取别名，各模块头部别名行：
  - index.js:56194 `var i = t("../core/events/MessageCenter"), …, l = t("../net/HttpConst"), c = t("../net/NetMgr") …`（模块 HangUpModel，定义于 index.js:56187）
  - index.js:86148 `var i = t("../gameconfigs/CFMgr"), …, a = t("../net/HttpConst"), …, u = t("../net/NetMgr") …`（模块 MuzhuangModel，定义于 index.js:86141）
  - index.js:120476 `var i = t("../gameconfigs/CFMgr"), …, c = t("../net/HttpConst"), …, _ = t("../net/NetMgr") …`（模块 SkillUpgradeModel，定义于 index.js:120469）
  - index.js:138867 `var i = t("../gameconfigs/CFMgr"), …, s = t("../net/HttpConst"), …, u = t("../net/NetMgr") …`（模块 TrainingMpModel，定义于 index.js:138860）

---

## BEGIN_LIANGONG → User.BeginTraining

**HttpConst 定义行**（index.js:59582）
```js
BEGIN_LIANGONG: "User.BeginTraining",
```

**注册点**（index.js:120515-120573，所在模块 SkillUpgradeModel）
```js
s.MessageCenter.on(c.HttpConst.BEGIN_LIANGONG, function(o, n) {
```
（回调体 120515-120573，见下"应答消费"）

**请求点+参数**（index.js:120762，参数字面量 120753-120760）
```js
120753: var o = T.playerInfo.entity, i = {
120754: skillID: t,
120755: hg: o.hunger.remaining,
120756: gTime: o.totalGameTime.gameTime,
120757: hgtimes: o.numStuffed,
120758: flag: v.IceBedModel.getIceBed(),
120759: isCollective: e
120760: };
120761: b.CrossServiceModel.needLocalUrlAndPort(function() {
120762: _.NetMgr.http.sendRequest(c.HttpConst.BEGIN_LIANGONG, i);
```

**应答消费字段**（回调第二参 n）
```js
120516: if (1 == n.eRet || 2 == n.eRet) {
120517: e.skill2Upgrade = n.skillID;
120518: e.startTimestamp = n.beginTime;
120519: E.TimeMgr.sserverT = n.beginTime;
120521: e.hyTime = 1e3 * n.hanyusuiTime;
120522: d.NonBattleBuffModel.setBufferCostStartTime(n.hanyusuiTime, n.beginTime);
120523: if (n.hasOwnProperty("isCollective")) if (0 == n.isCollective) …
120549: t.PopGiftModel.setHomeDataUI(n);   // 整包 n 传入（函数体未逐字段追入）
120552: B.SchoolSquareModel.isCollective = n.isCollective;
120565: t.PopGiftModel.setHomeDataUI(n);
120569: } else if (3 == n.eRet) {
120570: var h = i.getItem(n.skillID, "skill");
```

---

## GET_VIGOR → User.getVigor

**HttpConst 定义行**（index.js:59796）
```js
GET_VIGOR: "User.getVigor",
```

**注册点**（index.js:138909-138911，所在模块 TrainingMpModel）
```js
138909: r.MessageCenter.on(s.HttpConst.GET_VIGOR, function(t, e) {
138910: r.MessageCenter.dispatch(l.EvName.REFRESH_VIGORS, e.vigor);
138911: }, this);
```

**请求点+参数**（index.js:138941）
```js
138940: t.prototype.reqGetVigors = function() {
138941: u.NetMgr.http.sendRequest(s.HttpConst.GET_VIGOR, {});
```

**应答消费字段**
```js
138910: r.MessageCenter.dispatch(l.EvName.REFRESH_VIGORS, e.vigor);   // 读 e.vigor
```

---

## END_LIANGONG → User.EndTraining

**HttpConst 定义行**（index.js:59583）
```js
END_LIANGONG: "User.EndTraining",
```

**注册点**（index.js:120574-120601，所在模块 SkillUpgradeModel）
```js
120574: s.MessageCenter.on(c.HttpConst.END_LIANGONG, function(t, o) {
```

**请求点+参数**（index.js:120775-120779）
```js
120772: e.prototype.end = function(t) {
120773: var e = T.playerInfo.entity;
120774: b.CrossServiceModel.needLocalUrlAndPort(function() {
120775: _.NetMgr.http.sendRequest(c.HttpConst.END_LIANGONG, {
120776: hglmt: e.hunger.limit,
120777: speed: e.hungerConsumingSpeed.finalValue,
120778: auto: t
120779: });
```

**应答消费字段**（回调第二参 o；无 eRet 判断）
```js
120578: u.RoleOtherInfo.gengudanTime = o.genguTime;
120579: d.NonBattleBuffModel.setBufferTotalTime(o.hanyusuiTime);
120580: h.FishingModel.setAutoStartHung(o);   // 整包 o 传入（函数体未逐字段追入）
120581: o.hasOwnProperty("isSchoolAward") && (B.SchoolSquareModel.isSchoolAward = o.isSchoolAward);
120582: o.hasOwnProperty("isCollective") && (B.SchoolSquareModel.isCollective = o.isCollective);
120584: if (o.hasOwnProperty("skillArr") && o.skillArr.length) {
120586: e.skillQueue = o.skillArr;
120587: e.start(o.skillArr[0], B.SchoolSquareModel.isCollective);
120590: if (o.hasOwnProperty("skillid")) {
120592: s.MessageCenter.dispatch(p.EvName.END_SKILL_TRAINING_CLOSR, o.skillid);
```

---

## END_DAZUO → User.EndMeditation

**HttpConst 定义行**（index.js:59588）
```js
END_DAZUO: "User.EndMeditation",
```

**注册点**（index.js:138888-138895，所在模块 TrainingMpModel）
```js
138888: r.MessageCenter.on(s.HttpConst.END_DAZUO, function(e, o) {
```

**请求点+参数**（index.js:138954-138963；参数对象 t 初值 `{}`，经 SkillUtils.getMaxNGBonus(t) 填充）
```js
138954: t.prototype.end = function() {
138955: var t = {};
138956: y.SkillUtils.getMaxNGBonus(t);
138957: var e = m.playerInfo.entity, o = {
138958: skillID: t.skillID,
138959: hglmt: e.hunger.limit,
138960: speed: e.hungerConsumingSpeed.finalValue
138961: };
138962: u.NetMgr.http.sendRequest(s.HttpConst.END_DAZUO, o);
```
（getMaxNGBonus 构造处：index.js:121690-121701，向 t 写入 `t.skillID = a`：`121699: t && (t.skillID = a);`）

**应答消费字段**（回调第二参 o；无 eRet 判断）
```js
138890: h.RoleOtherInfo.gengudanTime = o.genguTime;
138891: p.NonBattleBuffModel.setBufferTotalTime(o.hanyusuiTime);
138892: o.note.hasOwnProperty("attrch") && o.note.attrch.hasOwnProperty("mpTrained") && (d.RoleBaseInfo.mpTrained = o.note.attrch.mpTrained);
138893: c.FishingModel.setAutoStartHung(o);   // 整包 o 传入（函数体未逐字段追入）
```

---

## BEGIN_WOOD_TRAINING → User.BeginPlayWooks

**HttpConst 定义行**（index.js:59525）
```js
BEGIN_WOOD_TRAINING: "User.BeginPlayWooks",
```

**注册点**（index.js:86175，所在模块 MuzhuangModel）
```js
86175: r.MessageCenter.on(a.HttpConst.BEGIN_WOOD_TRAINING, this.onReqWoodTr, this);
```

**请求点+参数**（index.js:86274，参数字面量 86268-86273）
```js
86267: t.prototype.reqWoodTr = function() {
86268: var t = c.UserModel.entity, e = {
86269: artLevel: p.SkillTable.skillEvaluation(),
86270: hg: t.hunger.remaining,
86271: gTime: t.totalGameTime.gameTime,
86272: hgtimes: t.numStuffed
86273: };
86274: u.NetMgr.http.sendRequest(a.HttpConst.BEGIN_WOOD_TRAINING, e);
```

**应答消费字段**（onReqWoodTr，回调第二参 e；eRet 判断为 `0 != e.eRet`）
```js
86189: 0 != e.eRet && (this.isPracticing = !0);
86192: this.beginTime = e.beginTime;
86193: this.serverTime = e.serverTime;
86194: e.hasOwnProperty("maxTime") && (this.maxTime = e.maxTime);
86195: this.setRemainingFatigue(Math.floor(o.Hp - 5e-4 * (e.serverTime - e.beginTime)));
86196: r.MessageCenter.dispatch(s.EvName.BEGIN_HITTING_WOOD, e.eRet);
86197: S.LoginMgr.storeByScene(2, Number(e.beginTime) + 1e3 * Number(e.maxTime));
```

---

## END_WOOD_TRAINING → User.EndPlayWooks

**HttpConst 定义行**（index.js:59526）
```js
END_WOOD_TRAINING: "User.EndPlayWooks",
```

**注册点**（index.js:86176，所在模块 MuzhuangModel）
```js
86176: r.MessageCenter.on(a.HttpConst.END_WOOD_TRAINING, this.onEndWoodTr, this);
```

**请求点+参数**（index.js:86284，参数字面量 86277-86283）
```js
86276: t.prototype.reqEndWoodTr = function() {
86277: var t = c.UserModel.entity, e = {
86278: artLevel: p.SkillTable.skillEvaluation(),
86279: maxHP: t.hp.finalValue,
86280: maxMP: t.mp.finalValue,
86281: hglmt: t.hunger.limit,
86282: speed: t.hungerConsumingSpeed.finalValue
86283: };
86284: u.NetMgr.http.sendRequest(a.HttpConst.END_WOOD_TRAINING, e);
```

**应答消费字段**（onEndWoodTr，回调第二参 e）
```js
86202: if (1 == e.eRet) {
86205: var o = .001 * (e.serverTime - e.beginTime);
86207: c.UserModel.entity.totalGameTime.gameTime = e.gTime;
86208: c.UserModel.entity.hunger.remaining = e.hg;
86209: c.UserModel.entity.numStuffed = e.hgtimes;
86210: this.potGot = e.potential;
86211: this.expGot = e.exp;
86214: e.hasOwnProperty("expExtra") ? this.expExtra = e.expExtra : this.expExtra = 0;
86215: e.hasOwnProperty("potentialExtra") ? this.potentialExtra = e.potentialExtra : this.potentialExtra = 0;
86217: for (var n = e.specialAny, a = 0; a < n.length; ++a) {
86218: switch (n[a].type) {
86220: case 1: p.SkillTable.setSkill(n[a].number[0], p.SkillTable.getSkillLevel(n[a].number[0]) + n[a].number[1]);
86224: case 2: l.RoleBaseInfo.potentials += n[a].number;
86228: case 3: h.InventoryDB.addItem(1, n[a].number);
86232: case 4: l.RoleBaseInfo.coins += n[a].number;
86236: case 5: c.UserModel.entity.hp.baseValue += n[a].number;
86240: case 6: c.UserModel.entity.mp.baseValue += n[a].number;
86244: case 7: c.UserModel.entity.exp += n[a].number;
86248-86258: this.suprises.push({ type: n[a].type, val: n[a].number[1], id: n[a].number[0] }) / ({ type: n[a].type, val: n[a].number });
86264: r.MessageCenter.dispatch(s.EvName.REQ_END_WOOD_RET, 1 == e.eRet);
```

---

## END_RECOVER_MP → User.EndRecoverMP

**HttpConst 定义行**（index.js:59609）
```js
END_RECOVER_MP: "User.EndRecoverMP",
```

**注册点**（index.js:138903-138908，所在模块 TrainingMpModel）
```js
138903: r.MessageCenter.on(s.HttpConst.END_RECOVER_MP, function(t, e) {
```

**请求点+参数**（index.js:138927，参数字面量 138921-138926）
```js
138920: t.prototype.endRecoverMp = function() {
138921: var t = m.playerInfo.entity, e = {
138922: curMp: t.mp.remaining,
138923: mplmt: t.mp.limit,
138924: bTime: this.recoverStartTS,
138925: flag: f.IceBedModel.getIceBed()
138926: };
138927: u.NetMgr.http.sendRequest(s.HttpConst.END_RECOVER_MP, e);
```

**应答消费字段**（回调第二参 e；无 eRet 判断）
```js
138904: h.RoleOtherInfo.gengudanTime = e.genguTime;
138905: p.NonBattleBuffModel.setBufferTotalTime(e.hanyusuiTime);
```

---

## START_DAZUO → User.BeginMeditation

**HttpConst 定义行**（index.js:59584）
```js
START_DAZUO: "User.BeginMeditation",
```

**注册点**（index.js:138880-138887，所在模块 TrainingMpModel）
```js
138880: r.MessageCenter.on(s.HttpConst.START_DAZUO, function(e, o) {
```

**请求点+参数**（index.js:138938，参数字面量 138930-138937）
```js
138929: t.prototype.start = function() {
138930: var t = m.playerInfo.entity, e = {
138931: curMp: t.mp.remaining,
138932: maxMp: t.mp.limit - t.addEqMp,
138933: hg: t.hunger.remaining,
138934: gTime: t.totalGameTime.gameTime,
138935: hgtimes: t.numStuffed,
138936: flag: f.IceBedModel.getIceBed()
138937: };
138938: u.NetMgr.http.sendRequest(s.HttpConst.START_DAZUO, e);
```

**应答消费字段**（回调第二参 o）
```js
138881: if (1 == o.eRet || 2 == o.eRet) {
138882: t.startTimestamp = o.beginTime;
138883: t.hyTime = 1e3 * o.hyTime;
138884: p.NonBattleBuffModel.setBufferCostStartTime(o.hyTime, o.beginTime);
```

---

## PAUSE_WOOD_TRAINING → User.changePlayWooksState

**HttpConst 定义行**（index.js:59527）
```js
PAUSE_WOOD_TRAINING: "User.changePlayWooksState",
```

**注册点**（index.js:86177，所在模块 MuzhuangModel）
```js
86177: r.MessageCenter.on(a.HttpConst.PAUSE_WOOD_TRAINING, this.onPauseWoodTr, this);
```

**请求点+参数**（index.js:86287）
```js
86286: t.prototype.reqPauseWoodTr = function() {
86287: u.NetMgr.http.sendRequest(a.HttpConst.PAUSE_WOOD_TRAINING, {});
```

**应答消费字段**（onPauseWoodTr，回调第二参 e）
```js
86182: if (this.isPracticing && 1 == e.eRet) {
```
（分支体内只读 e.eRet，其余为本地状态与 EvName 派发：86183-86185）

---

## VIGOR_DAZUO → User.useVigorMeditation

**HttpConst 定义行**（index.js:59797）
```js
VIGOR_DAZUO: "User.useVigorMeditation",
```

**注册点**（index.js:138912-138915，所在模块 TrainingMpModel）
```js
138912: r.MessageCenter.on(s.HttpConst.VIGOR_DAZUO, function(t, e) {
```

**请求点+参数**（index.js:138952；参数对象 t 初值 `{}`，经 SkillUtils.getMaxNGBonus(t) 填充）
```js
138943: t.prototype.reqConvVigor2Mp = function() {
138944: var t = {};
138945: y.SkillUtils.getMaxNGBonus(t);
138946: var e = m.playerInfo.entity, o = {
138947: skillID: t.skillID,
138948: maxMp: e.mp.limit,
138949: speed: e.hungerConsumingSpeed.finalValue,
138950: flag: f.IceBedModel.getIceBed()
138951: };
138952: u.NetMgr.http.sendRequest(s.HttpConst.VIGOR_DAZUO, o);
```
（getMaxNGBonus 构造处：index.js:121690-121701，`121699: t && (t.skillID = a);`）

**应答消费字段**（回调第二参 e）
```js
138913: r.MessageCenter.dispatch(l.EvName.REFRESH_VIGORS, e.vigor);
```

---

## BEGIN_RECOVER_MP → User.BeginRecoverMP

**HttpConst 定义行**（index.js:59608）
```js
BEGIN_RECOVER_MP: "User.BeginRecoverMP",
```

**注册点**（index.js:138896-138902，所在模块 TrainingMpModel）
```js
138896: r.MessageCenter.on(s.HttpConst.BEGIN_RECOVER_MP, function(e, o) {
```

**请求点+参数**（index.js:138918）
```js
138917: t.prototype.startRecoverMp = function() {
138918: u.NetMgr.http.sendRequest(s.HttpConst.BEGIN_RECOVER_MP, {});
```

**应答消费字段**（回调第二参 o）
```js
138897: if (1 == o.eRet) {
138898: t.recoverStartTS = o.serverTime;
138899: p.NonBattleBuffModel.tbbByID.hasOwnProperty(1043) && (t.hyTime = p.NonBattleBuffModel.tbbByID[1043].duration);
```
（138899 读的是本地 NonBattleBuffModel，非应答字段；应答字段为 eRet、serverTime）

---

## VIGOR_UPGSKILL → User.useVigorUpGradeSkill

**HttpConst 定义行**（index.js:59798）
```js
VIGOR_UPGSKILL: "User.useVigorUpGradeSkill",
```

**注册点**（index.js:120602-120605，所在模块 SkillUpgradeModel）
```js
120602: s.MessageCenter.on(c.HttpConst.VIGOR_UPGSKILL, function(t, e) {
```

**请求点+参数**（index.js:120770，参数字面量 120766-120769）
```js
120765: e.prototype.reqConvVigors2SkillLv = function(t) {
120766: var e = {
120767: skillID: t,
120768: flag: v.IceBedModel.getIceBed()
120769: };
120770: _.NetMgr.http.sendRequest(c.HttpConst.VIGOR_UPGSKILL, e);
```

**应答消费字段**（回调第二参 e）
```js
120603: s.MessageCenter.dispatch(p.EvName.REFRESH_VIGORS, e.vigor);
120604: l.default.show(r.getText(3259).replace(/\[1\]/, f.SkillTable.getSkillLevel(e.skillID)));
```

---

## SET_ONHOOK_WOOK_STATE → User.setOnHookWookState

**HttpConst 定义行**（index.js:60612）
```js
SET_ONHOOK_WOOK_STATE: "User.setOnHookWookState",
```

**注册点**（index.js:56235，所在模块 HangUpModel）
```js
56235: i.MessageCenter.on(l.HttpConst.SET_ONHOOK_WOOK_STATE, this.onHookWoodStateCh, this);
```

**请求点+参数**（index.js:56865）
```js
56864: e.prototype.reqHookWoodStateCh = function() {
56865: c.NetMgr.http.sendRequest(l.HttpConst.SET_ONHOOK_WOOK_STATE, {});
```

**应答消费字段**（onHookWoodStateCh，回调第二参 e）
```js
56867: e.prototype.onHookWoodStateCh = function(t, e) {
56868: if (1 == e.eRet) {
56869: this.woodState = this.woodState > 0 ? 0 : 1;
56870: i.MessageCenter.dispatch(h.EvName.ON_HOOK_WOOD_STATE_CHANGE);
```
（应答字段仅 e.eRet；56869-56870 为本地状态与事件派发）

---

## IMPLANTATION → User.Implantation

**HttpConst 定义行**（index.js:59812）
```js
IMPLANTATION: "User.Implantation",
```

**注册点**（index.js:120635-120640，所在模块 SkillUpgradeModel）
```js
120635: s.MessageCenter.on(c.HttpConst.IMPLANTATION, function(t, o) {
```

**请求点+参数**（index.js:121176，参数字面量 121176-121178）
```js
121171: e.prototype.reqJoinQueue = function(t) {
…（121172-121175 为本地队列长度/时长校验与 this.selectId = t）
121176: _.NetMgr.http.sendReqWithMask(c.HttpConst.IMPLANTATION, {
121177: MartialID: t
121178: });
```

**应答消费字段**（回调第二参 o）
```js
120636: if (1 == o.eRet) {
120637: e.skillQueue.push(e.selectId);
120639: } else 6 == o.eRet ? l.default.show(r.getText(4239)) : l.default.show(r.getText(3954));
```

---

## REMOVE_MARTIAL → User.removeMartial

**HttpConst 定义行**（index.js:59813）
```js
REMOVE_MARTIAL: "User.removeMartial",
```

**注册点**（index.js:120641-120647，所在模块 SkillUpgradeModel）
```js
120641: s.MessageCenter.on(c.HttpConst.REMOVE_MARTIAL, function(t, o) {
```

**请求点+参数**（index.js:121164，参数字面量 121164-121166）
```js
121162: e.prototype.reqRemoveList = function(t) {
121163: this.selectId = t;
121164: _.NetMgr.http.sendReqWithMask(c.HttpConst.REMOVE_MARTIAL, {
121165: MartialID: t
121166: });
```

**应答消费字段**（回调第二参 o）
```js
120642: if (1 == o.eRet) {
120643: var i = e.skillQueue;
120644: i.indexOf(e.selectId) >= 0 && e.skillQueue.splice(i.indexOf(e.selectId), 1);
```
（应答字段仅 o.eRet；120643-120644 为本地队列操作）

---

## 附：15 KEY 全量命中清单（index.js，`\.HttpConst\.(KEY)\b`，共 30 处）

```
56235   reg  SET_ONHOOK_WOOK_STATE
56865   req  SET_ONHOOK_WOOK_STATE
86175   reg  BEGIN_WOOD_TRAINING
86176   reg  END_WOOD_TRAINING
86177   reg  PAUSE_WOOD_TRAINING
86274   req  BEGIN_WOOD_TRAINING
86284   req  END_WOOD_TRAINING
86287   req  PAUSE_WOOD_TRAINING
120515  reg  BEGIN_LIANGONG
120574  reg  END_LIANGONG
120602  reg  VIGOR_UPGSKILL
120635  reg  IMPLANTATION
120641  reg  REMOVE_MARTIAL
120762  req  BEGIN_LIANGONG
120770  req  VIGOR_UPGSKILL
120775  req  END_LIANGONG
121164  req  REMOVE_MARTIAL
121176  req  IMPLANTATION
138880  reg  START_DAZUO
138888  reg  END_DAZUO
138896  reg  BEGIN_RECOVER_MP
138903  reg  END_RECOVER_MP
138909  reg  GET_VIGOR
138912  reg  VIGOR_DAZUO
138918  req  BEGIN_RECOVER_MP
138927  req  END_RECOVER_MP
138938  req  START_DAZUO
138941  req  GET_VIGOR
138952  req  VIGOR_DAZUO
138962  req  END_DAZUO
```

scripts2.js：0 处（两种方式均无命中：`\.HttpConst\.(15KEY)\b`、`User.(BeginTraining|…|removeMartial)` 字符串字面量）。
scripts3.js：0 处（同上两种方式均无命中）。

## 未能验证

- 应答整包透传处 `PopGiftModel.setHomeDataUI(n/o)`（index.js:120549、120565、120613、120689）与 `FishingModel.setAutoStartHung(o/e)`（index.js:120580、86185、86262、138893）的函数体未逐字段追入，无法列出其内部读取的字段清单。
- `SET_ONHOOK_WOOK_STATE` 定义行 index.js:60612 位于另一个 HttpConst 段落（与 59525-59813 不连续），该段落内是否还有同批动作的重复定义行未逐一比对。
- 工单范围外文件（如 tools/extract_all.js、tools/extract_listeners.js 等既有分析脚本）未采用其结论，本报告字段清单全部来自对三个范围文件原文的直读；未交叉核对这两类来源是否一致。

## 范围外产出

- tools/ 目录下存在既有分析脚本（仅记录位置，未使用、未改动）：tools/extract_all.js、tools/extract_listeners.js、tools/scan_actions.js、tools/slice_specs.js、tools/slice_specs2.js（grep HttpConst 时命中其注释与代码行）。
- index.js:120606-120749（SkillUpgradeModel.init 内）存在同批相邻动作 CHOOSE_FIX_DAN、BEGIN_LIST、ADD_BREAK_QUEUE、REMOVE_BREAK_QUEUE、GOLD_BREAK_CUR_SKILL、GOLD_BREAK_ALL_SKILL、BATCH_BREAK_BY_GOLD、BEGIN_HOOK_BREAK_LIST、STOP_BREAK_LIST、REFRESH_HOOK_BREAK_LIST、QUEUE_CHECK_BREAK 的注册点（工单 15 KEY 之外，仅记录位置，未摘录展开）。
