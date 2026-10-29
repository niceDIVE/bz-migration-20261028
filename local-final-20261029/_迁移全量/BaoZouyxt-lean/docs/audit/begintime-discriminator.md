# 纯苦力取证工：客户端 beginTime 字段读取判定报告

> 工作目录：`F:\BaoZouyxt`
> 扫描文件：`tools/index.js`、`tools/scripts2.js`、`tools/scripts3.js`
> 目标：判定客户端有没有真的读 `beginTime` 这个字段（只对两个动作：`BeginMeditation`、`BeginTraining`）。

## 步骤 1：定位这两个动作的客户端应答回调及检索字符串出现清单

检索字符串（大小写敏感，三包扫描）：`MEDITATION`、`BeginMeditation`、`TRAINING`、`BeginTraining`、`BEGIN_MEDITATION`、`BEGIN_TRAINING`。

共匹配到 **85** 处出现。清单如下：

| 序号 | 文件:行号 | 是否 MessageCenter.on 注册点 | 逐字原文 |
|---|---|---|---|
| 1 | tools/index.js:45233 | 不是 | `START_SKILL_TRAINING: "startSkillTraining",` |
| 2 | tools/index.js:45234 | 不是 | `END_SKILL_TRAINING: "endSkillTraining",` |
| 3 | tools/index.js:45237 | 不是 | `START_NG_TRAINING: "startNgTraining",` |
| 4 | tools/index.js:45238 | 不是 | `END_SKILL_TRAINING_CLOSR: "endSkillTrainingClose",` |
| 5 | tools/index.js:45241 | 不是 | `END_NG_TRAINING: "endNgTraining",` |
| 6 | tools/index.js:45243 | 不是 | `DAZUO_CHANGE_NG_TRAINING: "dazuoChangeTraining",` |
| 7 | tools/index.js:56232 | 是 | `i.MessageCenter.on(l.HttpConst.USER_DOUBLE_TRAINING, this.onDoubleTraining, this);` |
| 8 | tools/index.js:56233 | 是 | `i.MessageCenter.on(l.HttpConst.END_DOUBLE_TRAINING, this.onEndDoubleTraining, this);` |
| 9 | tools/index.js:56666 | 不是 | `c.NetMgr.http.sendRequest(l.HttpConst.USER_DOUBLE_TRAINING, i);` |
| 10 | tools/index.js:56710 | 不是 | `c.NetMgr.http.sendRequest(l.HttpConst.END_DOUBLE_TRAINING, o);` |
| 11 | tools/index.js:59525 | 不是 | `BEGIN_WOOD_TRAINING: "User.BeginPlayWooks",` |
| 12 | tools/index.js:59526 | 不是 | `END_WOOD_TRAINING: "User.EndPlayWooks",` |
| 13 | tools/index.js:59527 | 不是 | `PAUSE_WOOD_TRAINING: "User.changePlayWooksState",` |
| 14 | tools/index.js:59563 | 不是 | `USER_DOUBLE_TRAINING: "User.doubleTraining",` |
| 15 | tools/index.js:59564 | 不是 | `END_DOUBLE_TRAINING: "User.endDoubleTraining",` |
| 16 | tools/index.js:59565 | 不是 | `ADD_TRAINING_RATE: "User.AddTrainingRate",` |
| 17 | tools/index.js:59582 | 不是 | `BEGIN_LIANGONG: "User.BeginTraining",` |
| 18 | tools/index.js:59584 | 不是 | `START_DAZUO: "User.BeginMeditation",` |
| 19 | tools/index.js:75226 | 不是 | `a.MessageCenter.dispatch(h.EvName.END_SKILL_TRAINING);` |
| 20 | tools/index.js:86175 | 是 | `r.MessageCenter.on(a.HttpConst.BEGIN_WOOD_TRAINING, this.onReqWoodTr, this);` |
| 21 | tools/index.js:86176 | 是 | `r.MessageCenter.on(a.HttpConst.END_WOOD_TRAINING, this.onEndWoodTr, this);` |
| 22 | tools/index.js:86177 | 是 | `r.MessageCenter.on(a.HttpConst.PAUSE_WOOD_TRAINING, this.onPauseWoodTr, this);` |
| 23 | tools/index.js:86274 | 不是 | `u.NetMgr.http.sendRequest(a.HttpConst.BEGIN_WOOD_TRAINING, e);` |
| 24 | tools/index.js:86284 | 不是 | `u.NetMgr.http.sendRequest(a.HttpConst.END_WOOD_TRAINING, e);` |
| 25 | tools/index.js:86287 | 不是 | `u.NetMgr.http.sendRequest(a.HttpConst.PAUSE_WOOD_TRAINING, {});` |
| 26 | tools/index.js:120551 | 不是 | `} else s.MessageCenter.dispatch(p.EvName.START_SKILL_TRAINING); else {` |
| 27 | tools/index.js:120567 | 不是 | `} else s.MessageCenter.dispatch(p.EvName.START_SKILL_TRAINING);` |
| 28 | tools/index.js:120568 | 不是 | `} else s.MessageCenter.dispatch(p.EvName.START_SKILL_TRAINING);` |
| 29 | tools/index.js:120592 | 不是 | `s.MessageCenter.dispatch(p.EvName.END_SKILL_TRAINING_CLOSR, o.skillid);` |
| 30 | tools/index.js:120599 | 不是 | `s.MessageCenter.dispatch(p.EvName.END_SKILL_TRAINING, !0);` |
| 31 | tools/index.js:138885 | 不是 | `r.MessageCenter.dispatch(l.EvName.START_NG_TRAINING);` |
| 32 | tools/index.js:138894 | 不是 | `r.MessageCenter.dispatch(l.EvName.END_NG_TRAINING);` |
| 33 | tools/scripts2.js:17468 | 是 | `a.MessageCenter.on(f.EvName.START_NG_TRAINING, this.startTraining, this);` |
| 34 | tools/scripts2.js:17469 | 是 | `a.MessageCenter.on(f.EvName.END_NG_TRAINING, this.endTraining, this);` |
| 35 | tools/scripts2.js:17470 | 是 | `a.MessageCenter.on(f.EvName.DAZUO_CHANGE_NG_TRAINING, this.dazuChangeTraining, this);` |
| 36 | tools/scripts2.js:17475 | 不是 | `a.MessageCenter.off(f.EvName.START_NG_TRAINING, this.startTraining, this);` |
| 37 | tools/scripts2.js:17476 | 不是 | `a.MessageCenter.off(f.EvName.END_NG_TRAINING, this.endTraining, this);` |
| 38 | tools/scripts2.js:17477 | 不是 | `a.MessageCenter.off(f.EvName.DAZUO_CHANGE_NG_TRAINING, this.dazuChangeTraining, this);` |
| 39 | tools/scripts2.js:38099 | 是 | `l.MessageCenter.on(y.EvName.START_SKILL_TRAINING, this.startLianGong, this);` |
| 40 | tools/scripts2.js:38100 | 是 | `l.MessageCenter.on(y.EvName.END_SKILL_TRAINING, this.endSkillLianGong, this);` |
| 41 | tools/scripts2.js:38101 | 是 | `l.MessageCenter.on(y.EvName.END_SKILL_TRAINING_CLOSR, this.endLianGongClose, this);` |
| 42 | tools/scripts2.js:38111 | 不是 | `l.MessageCenter.off(y.EvName.START_SKILL_TRAINING, this.startLianGong, this);` |
| 43 | tools/scripts2.js:38112 | 不是 | `l.MessageCenter.off(y.EvName.END_SKILL_TRAINING, this.endSkillLianGong, this);` |
| 44 | tools/scripts2.js:38113 | 不是 | `l.MessageCenter.off(y.EvName.END_SKILL_TRAINING_CLOSR, this.endLianGongClose, this);` |
| 45 | tools/scripts2.js:58057 | 是 | `l.MessageCenter.on(y.EvName.START_SKILL_TRAINING, this.startLianGong, this);` |
| 46 | tools/scripts2.js:58058 | 是 | `l.MessageCenter.on(y.EvName.END_SKILL_TRAINING, this.endSkillLianGong, this);` |
| 47 | tools/scripts2.js:58059 | 是 | `l.MessageCenter.on(y.EvName.END_SKILL_TRAINING_CLOSR, this.endLianGongClose, this);` |
| 48 | tools/scripts2.js:58066 | 不是 | `l.MessageCenter.off(y.EvName.START_SKILL_TRAINING, this.startLianGong, this);` |
| 49 | tools/scripts2.js:58067 | 不是 | `l.MessageCenter.off(y.EvName.END_SKILL_TRAINING, this.endSkillLianGong, this);` |
| 50 | tools/scripts2.js:58068 | 不是 | `l.MessageCenter.off(y.EvName.END_SKILL_TRAINING_CLOSR, this.endLianGongClose, this);` |
| 51 | tools/scripts3.js:27408 | 是 | `r.MessageCenter.on(l.HttpConst3.DRAGON_TRAINING_DATA, this.onGetDragonData, this);` |
| 52 | tools/scripts3.js:27409 | 是 | `r.MessageCenter.on(l.HttpConst3.TRAINING_LOTTERY, this.onLotteryData, this);` |
| 53 | tools/scripts3.js:27410 | 是 | `r.MessageCenter.on(l.HttpConst3.TRAINING_REFRESH, this.onRefrashReward, this);` |
| 54 | tools/scripts3.js:27418 | 不是 | `a.NetMgr.http.sendRequest(l.HttpConst3.DRAGON_TRAINING_DATA, {});` |
| 55 | tools/scripts3.js:27424 | 不是 | `a.NetMgr.http.sendRequest(l.HttpConst3.TRAINING_LOTTERY, {});` |
| 56 | tools/scripts3.js:27427 | 不是 | `a.NetMgr.http.sendRequest(l.HttpConst3.TRAINING_REFRESH, {});` |
| 57 | tools/scripts3.js:27430 | 不是 | `a.NetMgr.http.sendRequest(l.HttpConst3.TRAINING_TASK_AWAARD, {` |
| 58 | tools/scripts3.js:27492 | 不是 | `r.MessageCenter.dispatch(h.EvName3.TRAINING_LOTTERY_ACTIVE, o);` |
| 59 | tools/scripts3.js:27502 | 不是 | `r.MessageCenter.dispatch(h.EvName3.TRAINING_UPDATE_REWARD);` |
| 60 | tools/scripts3.js:27512 | 不是 | `r.MessageCenter.dispatch(h.EvName3.TRAINING_UPDATE_REWARD);` |
| 61 | tools/scripts3.js:27731 | 是 | `r.MessageCenter.on(c.HttpConst3.TRAINING_TASK_DATA, this.onGetTaskData, this);` |
| 62 | tools/scripts3.js:27732 | 是 | `r.MessageCenter.on(c.HttpConst3.TRAINING_TASK_AWAARD, this.onReceiveAwards, this);` |
| 63 | tools/scripts3.js:27736 | 不是 | `r.MessageCenter.off(c.HttpConst3.TRAINING_TASK_DATA, this.onGetTaskData, this);` |
| 64 | tools/scripts3.js:27737 | 不是 | `r.MessageCenter.off(c.HttpConst3.TRAINING_TASK_AWAARD, this.onReceiveAwards, this);` |
| 65 | tools/scripts3.js:27741 | 不是 | `a.NetMgr.http.sendRequest(c.HttpConst3.TRAINING_TASK_DATA, {});` |
| 66 | tools/scripts3.js:27949 | 是 | `f.MessageCenter.on(y.EvName3.TRAINING_LOTTERY_ACTIVE, this.onLotteryCallBack, this);` |
| 67 | tools/scripts3.js:27950 | 是 | `f.MessageCenter.on(y.EvName3.TRAINING_UPDATE_REWARD, this.onFreshRewardCallBack, this);` |
| 68 | tools/scripts3.js:27954 | 不是 | `f.MessageCenter.off(y.EvName3.TRAINING_LOTTERY_ACTIVE, this.onLotteryCallBack, this);` |
| 69 | tools/scripts3.js:27955 | 不是 | `f.MessageCenter.off(y.EvName3.TRAINING_UPDATE_REWARD, this.onFreshRewardCallBack, this);` |
| 70 | tools/scripts3.js:29455 | 不是 | `TRAINING_LOTTERY_ACTIVE: "trainingLotteryActive",` |
| 71 | tools/scripts3.js:29456 | 不是 | `TRAINING_UPDATE_REWARD: "trainingUpdateReward",` |
| 72 | tools/scripts3.js:39527 | 不是 | `FRIEND_PARTNER_TRAINING: "User.friendPartnerTraining",` |
| 73 | tools/scripts3.js:39528 | 不是 | `FRIEND_PARTNER_END_TRAINING: "User.friendPartnerEndTraining",` |
| 74 | tools/scripts3.js:39529 | 不是 | `FRIEND_PARTNER_TRAINING_USE: "User.friendPartnerTrainingUse",` |
| 75 | tools/scripts3.js:39566 | 不是 | `DRAGON_TRAINING_DATA: "User.getTrainingData",` |
| 76 | tools/scripts3.js:39567 | 不是 | `TRAINING_TASK_DATA: "User.getTrainingTaskData",` |
| 77 | tools/scripts3.js:39568 | 不是 | `TRAINING_LOTTERY: "User.lotteryTraining",` |
| 78 | tools/scripts3.js:39569 | 不是 | `TRAINING_REFRESH: "User.refreshTraining",` |
| 79 | tools/scripts3.js:39570 | 不是 | `TRAINING_TASK_AWAARD: "User.trainingTaskAwards",` |
| 80 | tools/scripts3.js:58417 | 是 | `i.MessageCenter.on(d.HttpConst3.FRIEND_PARTNER_TRAINING, this.onPartnerTraining, this);` |
| 81 | tools/scripts3.js:58418 | 是 | `i.MessageCenter.on(d.HttpConst3.FRIEND_PARTNER_END_TRAINING, this.onPartnerTrainingEnd, this);` |
| 82 | tools/scripts3.js:58419 | 是 | `i.MessageCenter.on(d.HttpConst3.FRIEND_PARTNER_TRAINING_USE, this.onPartnerTrainingUse, this);` |
| 83 | tools/scripts3.js:58496 | 不是 | `h.NetMgr.http.sendRequest(d.HttpConst3.FRIEND_PARTNER_TRAINING, {` |
| 84 | tools/scripts3.js:58509 | 不是 | `h.NetMgr.http.sendRequest(d.HttpConst3.FRIEND_PARTNER_END_TRAINING, {` |
| 85 | tools/scripts3.js:58521 | 不是 | `h.NetMgr.http.sendRequest(d.HttpConst3.FRIEND_PARTNER_TRAINING_USE, {` |

### 动作与常量映射事实核对

根据 `tools/index.js` 协议映射：
- `tools/index.js:59582`: `BEGIN_LIANGONG: "User.BeginTraining"`
- `tools/index.js:59584`: `START_DAZUO: "User.BeginMeditation"`

客户端在这两个动作上的实际应答回调注册点为：
1. `BeginTraining` (HttpConst.BEGIN_LIANGONG): `tools/index.js:120515` (内联回调函数)
2. `BeginMeditation` (HttpConst.START_DAZUO): `tools/index.js:138880` (内联回调函数)
注：上述两处在代码定义层使用内部常量名 `BEGIN_LIANGONG` 与 `START_DAZUO`，对应网络接口名即 `User.BeginTraining` 与 `User.BeginMeditation`。

## 步骤 2：回调函数体行范围与逐字原文

### 回调 1: BeginTraining 注册点回调函数体

- 注册行: `tools/index.js:120515`
- 括号配平范围: `tools/index.js:120515-120573` (共 59 行，超过 40 行，按规约抄录前 20 行 + 后 20 行，标注省略行数)

```javascript
120515: s.MessageCenter.on(c.HttpConst.BEGIN_LIANGONG, function(o, n) {
120516: if (1 == n.eRet || 2 == n.eRet) {
120517: e.skill2Upgrade = n.skillID;
120518: e.startTimestamp = n.beginTime;
120519: E.TimeMgr.sserverT = n.beginTime;
120520: E.TimeMgr.startTime = Date.now();
120521: e.hyTime = 1e3 * n.hanyusuiTime;
120522: d.NonBattleBuffModel.setBufferCostStartTime(n.hanyusuiTime, n.beginTime);
120523: if (n.hasOwnProperty("isCollective")) if (0 == n.isCollective) if (2 == e.isSchoolLiang) {
120524: s.MessageCenter.dispatch(p.EvName.CLOSE_SCHOOL_LIAN_GONG_UI);
120525: var a = {
120526: _isTrainingMp: !0
120527: };
120528: g.default.prefabs.load("comUI/LiangongUI", cc.Prefab, function(t, e) {
120529: var o = cc.instantiate(e);
120530: m.PopUpMgr.addPopUp(o, y.LayerMgr.popUpLayer);
120531: var i = o.addComponent("LiangongUI");
120532: i.setData(a);
120533: i.setLabelTitle(r.getText(263));
120534: });
/* ... 省略 19 行 (tools/index.js:120535-120553) ... */
120554: if (2 != e.isSchoolLiang) {
120555: g.default.prefabs.load("menpai/MenpaiSquareXiulian", cc.Prefab, function(t, e) {
120556: var o = cc.instantiate(e);
120557: m.PopUpMgr.addPopUp(o, y.LayerMgr.popDownLayer, 0);
120558: o.addComponent("SchoolLiangongUI").setData({
120559: _isTrainingMp: !0
120560: });
120561: });
120562: Promise.resolve().then(function() {
120563: return t("../../scripts3/model3/PopGiftModel");
120564: }).then(function(t) {
120565: t.PopGiftModel.setHomeDataUI(n);
120566: });
120567: } else s.MessageCenter.dispatch(p.EvName.START_SKILL_TRAINING);
120568: } else s.MessageCenter.dispatch(p.EvName.START_SKILL_TRAINING);
120569: } else if (3 == n.eRet) {
120570: var h = i.getItem(n.skillID, "skill");
120571: l.default.show(r.getText(423).replace(/\[68\]/, r.getText(h.Name)));
120572: }
120573: }, this);
```

### 回调 2: BeginMeditation 注册点回调函数体

- 注册行: `tools/index.js:138880`
- 括号配平范围: `tools/index.js:138880-138887` (共 8 行，不超过 40 行，全抄录)

```javascript
138880: r.MessageCenter.on(s.HttpConst.START_DAZUO, function(e, o) {
138881: if (1 == o.eRet || 2 == o.eRet) {
138882: t.startTimestamp = o.beginTime;
138883: t.hyTime = 1e3 * o.hyTime;
138884: p.NonBattleBuffModel.setBufferCostStartTime(o.hyTime, o.beginTime);
138885: r.MessageCenter.dispatch(l.EvName.START_NG_TRAINING);
138886: }
138887: }, this);
```

## 步骤 3：函数体内三个关键问题逐项回答

### 1. BeginTraining 回调函数体 (tools/index.js:120515-120573)

#### (a) 有没有出现 `beginTime`？
- **有**。命中以下 3 行原文：
  - `tools/index.js:120518`: `e.startTimestamp = n.beginTime;`
  - `tools/index.js:120519`: `E.TimeMgr.sserverT = n.beginTime;`
  - `tools/index.js:120522`: `d.NonBattleBuffModel.setBufferCostStartTime(n.hanyusuiTime, n.beginTime);`

#### (b) 有没有把 `e.beginTime` 赋给某个成员变量（形如 `X.y = e.beginTime` 或 `this.y = e.beginTime`）？
- **有**。此处回调入参形参为 `(o, n)`，`n` 即应答包对象。命中以下赋值语句：
  - `tools/index.js:120518`: `e.startTimestamp = n.beginTime;` （注：外层 `var e = this;`，赋值给 `SkillUpgradeModel.startTimestamp`）
  - `tools/index.js:120519`: `E.TimeMgr.sserverT = n.beginTime;` （赋值给 `TimeMgr.sserverT`）

#### (c) 有没有把某个值与"当前时间"相减的运算（形如 `now() - `、`Date.now() - `、`getTime() - `、`- X.beginTime`、`/1000`、`*1000`）？
- **函数体内部运算**：
  - 相减运算：**未出现**
  - 包含 `Date.now()`、乘除法运算的行（逐字列出）：
    - `tools/index.js:120520`: `E.TimeMgr.startTime = Date.now();`
    - `tools/index.js:120521`: `e.hyTime = 1e3 * n.hanyusuiTime;`

### 2. BeginMeditation 回调函数体 (tools/index.js:138880-138887)

#### (a) 有没有出现 `beginTime`？
- **有**。命中以下 2 行原文：
  - `tools/index.js:138882`: `t.startTimestamp = o.beginTime;`
  - `tools/index.js:138884`: `p.NonBattleBuffModel.setBufferCostStartTime(o.hyTime, o.beginTime);`

#### (b) 有没有把 `e.beginTime` 赋给某个成员变量（形如 `X.y = e.beginTime` 或 `this.y = e.beginTime`）？
- **有**。此处回调入参形参为 `(e, o)`，`o` 即应答包对象。命中赋值语句：
  - `tools/index.js:138882`: `t.startTimestamp = o.beginTime;` （注：外层 `var t = this;`，赋值给 `TrainingMpModel.startTimestamp`）

#### (c) 有没有把某个值与"当前时间"相减的运算（形如 `now() - `、`Date.now() - `、`getTime() - `、`- X.beginTime`、`/1000`、`*1000`）？
- **函数体内部运算**：
  - 相减运算：**未出现**
  - 包含乘除法运算的行（逐字列出）：
    - `tools/index.js:138883`: `t.hyTime = 1e3 * o.hyTime;`

## 步骤 4：被赋值成员变量的全局 grep 与减法/除法取证

在 (b) 中命中的成员变量为 `startTimestamp`（对应 `SkillUpgradeModel.startTimestamp` 与 `TrainingMpModel.startTimestamp`）及 `E.TimeMgr.sserverT`。

### 1. `startTimestamp` 在三包中的所有出现位置及运算判断

| 文件:行号 | 逐字原文 | 是否参与减法或除法 |
|---|---|---|
| tools/index.js:681 | `c.startTimestamp = Date.now();` | 否 |
| tools/index.js:56537 | `M.SkillUpgradeModel.startTimestamp = t.beginTime;` | 否 |
| tools/index.js:56543 | `E.TrainingMpModel.startTimestamp = t.beginTime;` | 否 |
| tools/index.js:56556 | `M.SkillUpgradeModel.startTimestamp = t.beginTime;` | 否 |
| tools/index.js:56562 | `E.TrainingMpModel.startTimestamp = t.beginTime;` | 否 |
| tools/index.js:88993 | `if (o.startTimestamp > 0) {` | 否 |
| tools/index.js:89004 | `o.startTimestamp = this._tbbByID[e].startTimestamp;` | 否 |
| tools/index.js:89020 | `a.startTimestamp = r[t].startTimestamp;` | 否 |
| tools/index.js:89030 | `o.startTimestamp = t;` | 否 |
| tools/index.js:89041 | `e.startTimestamp = 0;` | 否 |
| tools/index.js:89045 | `this._tbbByID[e.id].startTimestamp = e.startTimestamp;` | 否 |
| tools/index.js:89055 | `o.startTimestamp = e;` | 否 |
| tools/index.js:89059 | `this._tbbByID[o.id].startTimestamp = o.startTimestamp;` | 否 |
| tools/index.js:120483 | `this.startTimestamp = 0;` | 否 |
| tools/index.js:120502 | `this.startTimestamp = 0;` | 否 |
| tools/index.js:120518 | `e.startTimestamp = n.beginTime;` | 否 |
| tools/index.js:121284 | `var n = d.NonBattleBuffModel.tbbByID[1043].startTimestamp;` | 否 |
| tools/index.js:121301 | `var n = d.NonBattleBuffModel.tbbByID[1043].startTimestamp;` | 否 |
| tools/index.js:121585 | `this.startTimestamp = 0;` | 否 |
| tools/index.js:136478 | `this.startTimestamp = 0;` | 否 |
| tools/index.js:136483 | `this.startTimestamp = 0;` | 否 |
| tools/index.js:136509 | `var t = Date.now() - this.startTimestamp;` | **是** |
| tools/index.js:138869 | `this.startTimestamp = 0;` | 否 |
| tools/index.js:138874 | `this.startTimestamp = 0;` | 否 |
| tools/index.js:138882 | `t.startTimestamp = o.beginTime;` | 否 |
| tools/index.js:138889 | `t.startTimestamp = 0;` | 否 |
| tools/index.js:138972 | `this.startTimestamp = 0;` | 否 |
| tools/scripts2.js:17482 | `this._time = g.TrainingMpModel.startTimestamp;` | 否 |
| tools/scripts2.js:17501 | `this._time = g.TrainingMpModel.startTimestamp;` | 否 |
| tools/scripts2.js:17546 | `(r = u.default.getTimeBasedBuff(1043)).startTimestamp = 0;` | 否 |
| tools/scripts2.js:38169 | `this._time = m.SkillUpgradeModel.startTimestamp ? m.SkillUpgradeModel.startTimestamp : 0;` | 否 |
| tools/scripts2.js:38307 | `(y = f.default.getTimeBasedBuff(1043)).startTimestamp = 0;` | 否 |
| tools/scripts2.js:47303 | `var e = p.NonBattleBuffModel.tbbByID[1043].duration, o = p.NonBattleBuffModel.tbbByID[1043].startTimestamp, i = (e - (l.TimeMgr.getSTimestamp() - o)) / 1e3;` | **是** |
| tools/scripts2.js:58120 | `this._time = m.SkillUpgradeModel.startTimestamp;` | 否 |
| tools/scripts2.js:58223 | `(v = f.default.getTimeBasedBuff(1043)).startTimestamp = 0;` | 否 |
| tools/scripts2.js:58268 | `var B = m.SkillUpgradeModel.startTimestamp, L = .001 * (p.TimeMgr.getSTimestamp() - B), S = N.SchoolSquareModel.surplusTime - L, T = Math.floor((S > 0 ? S : 0) / 3600), P = Math.floor((S > 0 ? S : 0) % 3600 / 60), E = Math.floor((S > 0 ? S : 0) % 3600 % 60), U = c.getText(7412).replace(/\[1\]/, T > 9 ? T : "0" + T);` | **是** |

#### `startTimestamp` 参与减法或除法的关键位置逐字取证：
1. `tools/scripts2.js:17528` (打坐界面 tick 计算已打坐时长，使用 `this._time = g.TrainingMpModel.startTimestamp`):
   `var t = this, e = l.TimeMgr.getSTimestamp(), o = .001 * (e - this._time);`
2. `tools/scripts2.js:38290` (练功界面 tick 计算已练功时长，使用 `this._time = m.SkillUpgradeModel.startTimestamp`):
   `var t = r.getItem(m.SkillUpgradeModel.skill2Upgrade, "skill"), e = g.SkillTable.getQualitySkillCoefficient(t, m.SkillUpgradeModel.skill2Upgrade), o = p.TimeMgr.getSTimestamp(), i = .001 * (o - this._time);`
3. `tools/scripts2.js:58206` (门派修炼界面 tick 计算时长):
   `var t = r.getItem(m.SkillUpgradeModel.skill2Upgrade, "skill"), e = g.SkillTable.getQualitySkillCoefficient(t, m.SkillUpgradeModel.skill2Upgrade), o = .001 * ((S = p.TimeMgr.getSTimestamp()) - this._time);`
4. `tools/scripts2.js:58268` (门派修炼剩余时间计算，直接读取 `startTimestamp` 做相减与除法):
   `var B = m.SkillUpgradeModel.startTimestamp, L = .001 * (p.TimeMgr.getSTimestamp() - B), S = N.SchoolSquareModel.surplusTime - L, T = Math.floor((S > 0 ? S : 0) / 3600), P = Math.floor((S > 0 ? S : 0) % 3600 / 60), E = Math.floor((S > 0 ? S : 0) % 3600 % 60), U = c.getText(7412).replace(/[1]/, T > 9 ? T : "0" + T);`
5. `tools/index.js:136509`: `var t = Date.now() - this.startTimestamp;`
6. `tools/scripts2.js:47303`: `var e = p.NonBattleBuffModel.tbbByID[1043].duration, o = p.NonBattleBuffModel.tbbByID[1043].startTimestamp, i = (e - (l.TimeMgr.getSTimestamp() - o)) / 1e3;`

## 步骤 5：三包中 EndMeditation / EndTraining 的发送点与回调取证

经检索三包文件（`tools/index.js`、`tools/scripts2.js`、`tools/scripts3.js`），对应接口与内部常量名为：
- `EndMeditation`: 协议常量 `END_DAZUO` (`"User.EndMeditation"`)
- `EndTraining`: 协议常量 `END_LIANGONG` (`"User.EndTraining"`)

### 1. 协议定义位置
- `tools/index.js:59583`: `END_LIANGONG: "User.EndTraining",`
- `tools/index.js:59588`: `END_DAZUO: "User.EndMeditation",`

### 2. 回调注册点 (MessageCenter.on)
- `EndTraining` 回调注册点:
  - `tools/index.js:120574`: `s.MessageCenter.on(c.HttpConst.END_LIANGONG, function(t, o) {`
- `EndMeditation` 回调注册点:
  - `tools/index.js:138888`: `r.MessageCenter.on(s.HttpConst.END_DAZUO, function(e, o) {`

### 3. 请求发送点 (sendRequest)
- `EndTraining` 发送点:
  - `tools/index.js:120775`: `_.NetMgr.http.sendRequest(c.HttpConst.END_LIANGONG, {`
- `EndMeditation` 发送点:
  - `tools/index.js:138962`: `u.NetMgr.http.sendRequest(s.HttpConst.END_DAZUO, o);`

