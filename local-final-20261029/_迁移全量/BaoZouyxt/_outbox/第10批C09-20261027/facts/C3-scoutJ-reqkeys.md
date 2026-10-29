范围与方法：只读 `F:\BaoZouyxt\tools\` 下 `index.js`、`scripts2.js`、`scripts3.js` 三个文件（各约 4.5MB / 3.1MB / 3.7MB，全部未整读，一律先用 grep 工具定位命中行号、再用 read 工具带 offset/limit 读小段）；文中代码块采用 `行号: 原文` 逐行抄录，冒号后为一字未改的原文（行首缩进原样保留），行号均为 read 工具返回的真实行号；`文件:行号` 中的文件名一律省略前缀 `F:\BaoZouyxt\tools\`。本文件只摘录，不判断、不分析、不给建议。

---

# GET_KNACK_LOTTERY

### 1. HttpConst 定义行

```
60411: GET_KNACK_LOTTERY: "User.getKnackLottery",
```

原文即上；位于 `o.HttpConst = {` 常区块内（块起点 index.js:59490），文件 `index.js`。index.js:60411

### 2. 注册点

```
90004: i.MessageCenter.on(n.HttpConst.GET_KNACK_LOTTERY, this.onGetData, this);
```

1 处。所在函数头 `90002: t.prototype.init = function() {`；所在模块头 `89977: TrickLotteryModel: [ function(t, e, o) {`、`89979: cc._RF.push(e, "733deQxoBZOcpohG97R9Yo3", "TrickLotteryModel");`、实例导出 `90198: o.TrickLotteryModel = new _();`；别名 `89984: ... n = t("../../scripts/net/HttpConst") ...`（`n` 即 HttpConst 模块）。scripts3.js:90004

### 3. 请求点

```
90043: t.prototype.reqData = function(t) {
90044: void 0 === t && (t = 0);
90045: this.isDefaultLottery = 0 == t;
90046: this.isDefaultLottery && (this.lotteryDatas = {});
90047: r.NetMgr.http.sendRequest(n.HttpConst.GET_KNACK_LOTTERY, this.isDefaultLottery ? {} : {
90048: lotteryId: t
90049: });
90050: };
```

封装名：`NetMgr.http.sendRequest`（非 `sendReqWithMask`）。第二参为三元表达式，逐层展开：

- 分支 A（`this.isDefaultLottery` 为真，即 `0 == t`，见 90045）：`{}` 空对象 → scripts3.js:90047
- 分支 B（否则）：对象字面量 `{ lotteryId: t }`，唯一字段 `lotteryId` 取 `reqData` 形参 `t`；`void 0 === t` 时 `t` 先被置 0（90044）→ scripts3.js:90047-90049

外层拼装段：无独立变量拼装，形参直接进字面量 → scripts3.js:90047-90049

### 4. 应答消费回调

```
90064: t.prototype.onGetData = function(t, e) {
90065: if (1 == e.eRet) {
90066: this.setVariable(e);
90067: this.lotteryDatas[e.lotteryId] = e;
90068: this.isDefaultLottery ? i.MessageCenter.dispatch(a.EvName.GET_DEFAULT_TRICK_LOTTERY_DATA) : i.MessageCenter.dispatch(a.EvName.CHANGE_TRICK_LOTTERY_DATA);
90069: } else 3 == e.eRet && s.default.show(c.getText(1093));
90070: };
```

- `eRet` 判断点：`1 == e.eRet`（90065）、`3 == e.eRet`（90069）→ scripts3.js:90065,90069
- `e.xxx` 字段读点：`e.lotteryId`（90067）→ scripts3.js:90067
- 间接字段读点（90066 把整个 `e` 传给 `setVariable`，字段在 helper 内逐项读出）：

```
90051: t.prototype.setVariable = function(t) {
90052: this.lotteryId = t.lotteryId;
90053: this.lotteryArr = t.lotteryArr;
90054: this.lotteryData = t;
90055: this.remainTimes = t.t;
90056: this.isFree = t.isFree;
90057: this.poolId = t.poolDateId;
90058: g.LotteryRebateModel.hasCanTask = t.isRewardState;
90059: this.upSkills = t.skillArr;
90060: this.machineEndTimeMap = t.eTime;
90061: this.optionalTimeMap = t.optionalEndTimeMap;
90062: this.optionalCd = t.order;
90063: };
```

→ scripts3.js:90051-90063
- `note.xxx` 读点：回调内 0 命中 → scripts3.js:90064-90070
- `.toString()`：0 命中；`.length`：0 命中；下标读取：0 命中 → scripts3.js:90064-90070
- 回调里再发出去的下一个请求（链式）：0 命中；只 `dispatch` 两个事件（90068）→ scripts3.js:90068

### 钱包/扣费/奖励触点

- 抽奖次数：`this.remainTimes = t.t;` → scripts3.js:90055
- 免费次数：`this.isFree = t.isFree;` → scripts3.js:90056
- 冷却/限时字段：`this.machineEndTimeMap = t.eTime;`（90060）、`this.optionalTimeMap = t.optionalEndTimeMap;`（90061）、`this.optionalCd = t.order;`（90062）→ scripts3.js:90060-90062
- 奖池/返利标记：`this.poolId = t.poolDateId;`（90057）、`g.LotteryRebateModel.hasCanTask = t.isRewardState;`（90058）→ scripts3.js:90057,90058
- 提示文案：`s.default.show(c.getText(1093))`（`s` = Alert，`c` = LangMgr，见 89984）→ scripts3.js:90069
- 客户端钱包模型（UserModel / RoleBaseInfo / InventoryDB / setGold / setYuanbao / addItem / getItemNum）：回调内 0 命中 → scripts3.js:90064-90070

---

# GET_KNACK_LOTTERY_HISTORY

### 1. HttpConst 定义行

```
60413: GET_KNACK_LOTTERY_HISTORY: "User.getKnackLotteryHistory",
```

文件 `index.js`，常区块起点 index.js:59490。index.js:60413

### 2. 注册点

```
90006: i.MessageCenter.on(n.HttpConst.GET_KNACK_LOTTERY_HISTORY, this.onGetHistory, this);
```

1 处，在 `t.prototype.init`（90002）内。scripts3.js:90006

### 3. 请求点

```
90034: t.prototype.getHistory = function() {
90035: r.NetMgr.http.sendRequest(n.HttpConst.GET_KNACK_LOTTERY_HISTORY);
90036: };
```

封装名：`NetMgr.http.sendRequest`；第二参未传（只有 1 个实参）。scripts3.js:90035

### 4. 应答消费回调

```
90037: t.prototype.onGetHistory = function(t, e) {
90038: if (1 == e.eRet) {
90039: this.history = e.history;
90040: i.MessageCenter.dispatch(a.EvName.GET_TRICK_LOTTERY_RECORD);
90041: }
90042: };
```

- `eRet` 判断点：`1 == e.eRet`（90038）→ scripts3.js:90038
- `e.xxx` 字段读点：`e.history`（90039）→ scripts3.js:90039
- `note.xxx`：0 命中；`.toString()`：0 命中；`.length`：0 命中；下标读取：0 命中 → scripts3.js:90037-90042
- 链式下一请求：0 命中；只 `dispatch(a.EvName.GET_TRICK_LOTTERY_RECORD)`（90040）→ scripts3.js:90040

### 钱包/扣费/奖励触点

- 仅写本地历史字段：`this.history = e.history;` → scripts3.js:90039
- 抽奖次数 / 免费次数 / 冷却 / 每日限次字段读点：0 命中 → scripts3.js:90037-90042
- 提示文案调用（getText / Alert.show）：0 命中 → scripts3.js:90037-90042
- 钱包模型读/写：0 命中 → scripts3.js:90037-90042

---

# KNACK_LOTTERY

### 1. HttpConst 定义行

```
60412: KNACK_LOTTERY: "User.knackLottery",
```

文件 `index.js`。index.js:60412

### 2. 注册点

```
90005: i.MessageCenter.on(n.HttpConst.KNACK_LOTTERY, this.onLottery, this);
```

1 处，在 `t.prototype.init`（90002）内。scripts3.js:90005

### 3. 请求点

```
90077: t.prototype.reqLottery = function(t, e) {
90078: r.NetMgr.http.sendRequest(n.HttpConst.KNACK_LOTTERY, {
90079: lotteryId: this.lotteryId,
90080: lotteryType: t,
90081: skillId: e
90082: });
90083: };
```

封装名：`NetMgr.http.sendRequest`。第二参对象字面量逐层展开（3 个字段，全为标量，无嵌套）：

- `lotteryId: this.lotteryId` —— 值来自实例字段，该字段在 `90052: this.lotteryId = t.lotteryId;`（setVariable）写入 → scripts3.js:90079
- `lotteryType: t` —— 取 `reqLottery` 形参 `t`（90077）→ scripts3.js:90080
- `skillId: e` —— 取 `reqLottery` 形参 `e`（90077）→ scripts3.js:90081

外层拼装段：无独立变量拼装，两形参直接进字面量。scripts3.js:90078-90082

### 4. 应答消费回调

```
90084: t.prototype.onLottery = function(t, e) {
90085: if (1 == e.eRet) {
90086: this.remainTimes = e.t;
90087: this.isFree = e.isFree;
90088: g.LotteryRebateModel.hasCanTask = e.isRewardState;
90089: i.MessageCenter.dispatch(a.EvName.TRICK_LOTTERY_END);
90090: cc.assetManager.getBundle("skillGrasp").load("prefabs/TrickLottery/TrickRewardUI", cc.Prefab, function(t, o) {
90091: var i = cc.instantiate(o);
90092: p.PopUpMgr.addPopUp(i, l.LayerMgr.popUpLayer);
90093: i.addComponent("TrickRewardUI").setData(e);
90094: });
90095: m.TrickExModel.wishSkillId = e.skillId;
90096: } else 5 == e.eRet && s.default.show(c.getText(1093));
90097: };
```

- `eRet` 判断点：`1 == e.eRet`（90085）、`5 == e.eRet`（90096）→ scripts3.js:90085,90096
- `e.xxx` 字段读点：`e.t`（90086）、`e.isFree`（90087）、`e.isRewardState`（90088）、`e.skillId`（90095）；整个 `e` 被传给 `TrickRewardUI.setData(e)`（90093）→ scripts3.js:90086-90095
- `note.xxx`：0 命中 → scripts3.js:90084-90097
- `.toString()`：0 命中；`.length`：0 命中；下标读取：0 命中 → scripts3.js:90084-90097
- 回调里再发出去的下一个请求（链式）：0 命中；改为打开 `TrickRewardUI`（90090-90094）并写 `m.TrickExModel.wishSkillId`（90095）→ scripts3.js:90090-90095

### 钱包/扣费/奖励触点

- 抽奖次数：`this.remainTimes = e.t;` → scripts3.js:90086（构造器默认值见 `89986: this.remainTimes = 10;`，非回调）
- 免费次数：`this.isFree = e.isFree;` → scripts3.js:90087（默认值 `89987: this.isFree = 0;`）
- 返利任务可领标记：`g.LotteryRebateModel.hasCanTask = e.isRewardState;` → scripts3.js:90088
- 中奖技能记录：`m.TrickExModel.wishSkillId = e.skillId;` → scripts3.js:90095
- 奖励展示入口：`i.addComponent("TrickRewardUI").setData(e);`（把整包应答交给 UI）→ scripts3.js:90093
- 提示文案：`s.default.show(c.getText(1093))`（`s` = Alert，`c` = LangMgr）→ scripts3.js:90096
- 客户端钱包模型（UserModel / RoleBaseInfo / InventoryDB / setGold / setYuanbao / addItem / getItemNum）：回调内 0 命中 → scripts3.js:90084-90097

---

# BATCH_RESOLVE_KNACK

### 1. HttpConst 定义行

```
60309: BATCH_RESOLVE_KNACK: "User.batchResolveKnack",
```

文件 `index.js`。index.js:60309

### 2. 注册点

```
81016: r.MessageCenter.on(a.HttpConst.BATCH_RESOLVE_KNACK, this.onBatchResolveKnack, this);
```

1 处，在 `t.prototype.init`（81013）内；模块头 `81000: SkillKnackModel: [ function(t, e, o) {`、`81002: cc._RF.push(e, "fb807gHjcFDIIZh2914Qkn6", "SkillKnackModel");`、导出 `81287: o.SkillKnackModel = new m();`。scripts3.js:81016

### 3. 请求点

```
81166: t.prototype.doBatchResolveKnack = function(t) {
81167: l.NetMgr.http.sendRequest(a.HttpConst.BATCH_RESOLVE_KNACK, {
81168: knackData: t
81169: });
81170: };
```

封装名：`NetMgr.http.sendRequest`（`l` = NetMgr，见 81007）。第二参对象字面量：单字段 `knackData: t`，取形参 `t`（81166）；无嵌套。scripts3.js:81167-81169

### 4. 应答消费回调

```
81073: t.prototype.onBatchResolveKnack = function(t, e) {
81074: 1 == e.eRet && e.hasOwnProperty("rewardArray") && n.default.addShowRewardUI1(e.rewardArray, 0, {});
81075: };
```

- `eRet` 判断点：`1 == e.eRet`（81074）→ scripts3.js:81074
- `e.xxx` 字段读点：`e.rewardArray`（81074，且紧接 `e.hasOwnProperty("rewardArray")` 守卫）→ scripts3.js:81074
- `note.xxx`：0 命中；`.toString()`：0 命中；`.length`：0 命中；下标读取：0 命中 → scripts3.js:81073-81075
- 链式下一请求：0 命中 → scripts3.js:81073-81075

### 钱包/扣费/奖励触点

- 奖励展示：`n.default.addShowRewardUI1(e.rewardArray, 0, {})`，`n` = StoryDialogMgr（见 `81007: ... n = t("../../scripts/mgrs/StoryDialogMgr") ...`）→ scripts3.js:81074
- 提示文案（getText / Alert.show）：0 命中 → scripts3.js:81073-81075
- 抽奖次数 / 免费次数 / 冷却 / 每日限次：0 命中 → scripts3.js:81073-81075
- 客户端钱包模型读/写：0 命中 → scripts3.js:81073-81075

---

# CHANGE_SKILL_KNACK

### 1. HttpConst 定义行

```
60307: CHANGE_SKILL_KNACK: "User.changeSkillKnack",
```

文件 `index.js`。index.js:60307

### 2. 注册点

```
81017: r.MessageCenter.on(a.HttpConst.CHANGE_SKILL_KNACK, this.onChangeSkillKnack, this);
```

1 处，在 `t.prototype.init`（81013）内。scripts3.js:81017

### 3. 请求点

```
81171: t.prototype.doKnackChange = function(t, e) {
81172: for (var o = this.getSkillKnack(t), i = 0, s = 0; s < e.length; s++) o.indexOf(e[s]) >= 0 && i++;
81173: i != o.length && l.NetMgr.http.sendRequest(a.HttpConst.CHANGE_SKILL_KNACK, {
81174: skillId: t,
81175: knackIds: e
81176: });
81177: };
```

封装名：`NetMgr.http.sendRequest`。发请求前置条件：`i != o.length`（81173，拼装段同行）。第二参对象字面量逐层展开（2 个字段，全为标量/数组引用）：

- `skillId: t` —— `doKnackChange` 形参 `t`（81171）→ scripts3.js:81174
- `knackIds: e` —— `doKnackChange` 形参 `e`（81171），同一数组在 81172 被逐项比对 → scripts3.js:81175

外层拼装段：`var o = this.getSkillKnack(t), i = 0, s = 0; ... o.indexOf(e[s]) >= 0 && i++;`（81172）为发送前的计数段，非参数拼装。scripts3.js:81172-81176

### 4. 应答消费回调

```
81079: t.prototype.onChangeSkillKnack = function(t, e) {
81080: if (11 == e.eRet) c.default.show(s.getText(7863)); else if (1 == e.eRet) {
81081: e.hasOwnProperty("knackBag") && (this.KnackObjs = e.knackBag);
81082: if (e.hasOwnProperty("skillGraspData")) for (var o in e.skillGraspData) this.QualitySkillMap[o] = e.skillGraspData[o];
81083: }
81084: var n = e.skillGraspData, a = g.playerInfo.entity;
81085: for (var l in n) {
81086: var h = n[l].slot, u = a.getSkill(l);
81087: if (u) {
81088: u.removeAllSpellGroups();
81089: h.sort(function(t, e) {
81090: var o = i.getItem(t, "skill_Trick");
81091: return 9 === o.type ? -1 : 9 === (o = i.getItem(e, "skill_Trick")).type ? 1 : void 0;
81092: });
81093: for (var m = 0; m < h.length; ++m) {
81094: var f = new d();
81095: f.id = h[m];
81096: u.addSpellGroup(f);
81097: }
81098: a.isSkillEquipped(l) && (u.enabled = !0);
81099: }
81100: }
81101: r.MessageCenter.dispatch(p.EvName.UPDATE_SKILL_GRASP);
81102: };
```

- `eRet` 判断点：`11 == e.eRet`（81080）、`1 == e.eRet`（81080）→ scripts3.js:81080
- `e.xxx` 字段读点：`e.knackBag`（81081，含 `hasOwnProperty("knackBag")` 守卫）、`e.skillGraspData`（81082，含守卫；81084 再次读取且**无守卫**）→ scripts3.js:81081,81082,81084
- 间接字段读点：`n[l].slot`（81086）、`h[m]`（81095）、`i.getItem(t/e, "skill_Trick")` 读表项 `o.type`（81091）→ scripts3.js:81086,81091,81095
- `note.xxx`：0 命中 → scripts3.js:81079-81102
- `.toString()`：0 命中；`.length`：`e.length`（81172，请求侧）、`h.length`（81093）；下标读取：`e[s]`（81172）、`e.skillGraspData[o]`（81082）、`n[l]`（81086）、`h[m]`（81095）→ scripts3.js:81093,81082,81086,81095
- 链式下一请求：0 命中；回调尾部只 `dispatch(p.EvName.UPDATE_SKILL_GRASP)`（81101，无 payload）→ scripts3.js:81101

### 钱包/扣费/奖励触点

- 提示文案：`c.default.show(s.getText(7863))`（`c` = Alert，`s` = LangMgr）→ scripts3.js:81080
- 背包写点：`this.KnackObjs = e.knackBag` → scripts3.js:81081
- 技能窍门映射写点：`this.QualitySkillMap[o] = e.skillGraspData[o]` → scripts3.js:81082
- 战斗实体技能组重建（清空 + 逐个 addSpellGroup + 装备态置位）：`u.removeAllSpellGroups()`（81088）、`u.addSpellGroup(f)`（81096）、`u.enabled = !0`（81098）→ scripts3.js:81088,81096,81098
- 抽奖次数 / 免费次数 / 冷却 / 每日限次：0 命中 → scripts3.js:81079-81102
- 客户端钱包模型（UserModel / RoleBaseInfo / InventoryDB / setGold / setYuanbao / addItem / getItemNum）：0 命中（仅 `g.playerInfo.entity` 战斗实体读取，81084）→ scripts3.js:81084

---

# ROGUE_CHANGE_SKNACK

### 1. HttpConst 定义行

```
60539: ROGUE_CHANGE_SKNACK: "User.rgChangeSkillKnack",
```

常量名拼写按原文照抄（`SKNACK`）。文件 `index.js`。index.js:60539

### 2. 注册点

```
73995: s.MessageCenter.on(n.HttpConst.ROGUE_CHANGE_SKNACK, function(t, e) {
73996: if (11 == e.eRet) l.default.show(c.getText(7863)); else if (1 == e.eRet) {
73997: e.hasOwnProperty("knackBag") && (i.RogueRoleInfo.KnackObjs = e.knackBag);
73998: if (e.hasOwnProperty("skillGraspData")) for (var o in e.skillGraspData) i.RogueRoleInfo.QualitySkillMap[o] = e.skillGraspData[o];
73999: }
74000: cc.js.isEmptyObject(e.skillGraspData) || i.RogueRoleInfo.changeKnack(e.skillGraspData);
74001: s.MessageCenter.dispatch(h.EvName.UPDATE_SKILL_GRASP);
74002: }, this);
```

1 处（内联匿名回调，注册行 73995）。所在模块 `73854: RogueRoleModel: [ function(t, e, o) {`、`73856: cc._RF.push(e, "c8d8dAmd7ZMV4NMD/C4f/oh", "RogueRoleModel");`，导出 `74604: o.RogueRoleModel = new M();`（上一模块收尾为 `73829: o.RogueRoleInfo = new N();` + `73830: cc._RF.pop();`）。scripts3.js:73995

### 3. 请求点

```
74045: t.prototype.doKnackChange = function(t, e) {
74046: for (var o = i.RogueRoleInfo.getSkillKnack(t), s = 0, r = 0; r < e.length; r++) o.indexOf(e[r]) >= 0 && s++;
74047: s != o.length && f.NetMgr.http.sendRequest(n.HttpConst.ROGUE_CHANGE_SKNACK, {
74048: skillId: t,
74049: knackIds: e
74050: });
74051: };
```

封装名：`NetMgr.http.sendRequest`（同文件同模块的 `ROGUE_EQUIP_WEAPON` 在 `74043` 用 `sendReqWithMask`，本键不用）。发请求前置条件：`s != o.length`（74047）。第二参对象字面量逐层展开：

- `skillId: t` —— 形参 `t`（74045）→ scripts3.js:74048
- `knackIds: e` —— 形参 `e`（74045），同数组在 74046 被逐项比对 → scripts3.js:74049

外层拼装段：`var o = i.RogueRoleInfo.getSkillKnack(t), s = 0, r = 0; ... o.indexOf(e[r]) >= 0 && s++;`（74046）为发送前计数段，非参数拼装。scripts3.js:74046-74050

### 4. 应答消费回调

回调即注册处内联函数，函数头 73995、函数尾 74002，全文逐行：

```
73995: s.MessageCenter.on(n.HttpConst.ROGUE_CHANGE_SKNACK, function(t, e) {
73996: if (11 == e.eRet) l.default.show(c.getText(7863)); else if (1 == e.eRet) {
73997: e.hasOwnProperty("knackBag") && (i.RogueRoleInfo.KnackObjs = e.knackBag);
73998: if (e.hasOwnProperty("skillGraspData")) for (var o in e.skillGraspData) i.RogueRoleInfo.QualitySkillMap[o] = e.skillGraspData[o];
73999: }
74000: cc.js.isEmptyObject(e.skillGraspData) || i.RogueRoleInfo.changeKnack(e.skillGraspData);
74001: s.MessageCenter.dispatch(h.EvName.UPDATE_SKILL_GRASP);
74002: }, this);
```

（该内联函数自 73995 起、至 74002 止，即 `MessageCenter.on` 的第二、三实参。）要点：

- `eRet` 判断点：`11 == e.eRet`（73996）、`1 == e.eRet`（73996）→ scripts3.js:73996
- `e.xxx` 字段读点：`e.knackBag`（73997，有守卫）、`e.skillGraspData`（73998 有守卫；74000 无守卫）→ scripts3.js:73997,73998,74000
- `note.xxx`：0 命中 → scripts3.js:73995-74002
- `.toString()`：0 命中；`.length`：0 命中；下标读取：`e.skillGraspData[o]`（73998）→ scripts3.js:73998
- 链式下一请求：0 命中；只 `dispatch(h.EvName.UPDATE_SKILL_GRASP)`（74001，无 payload）→ scripts3.js:74001

### 钱包/扣费/奖励触点

- 提示文案：`l.default.show(c.getText(7863))`（`l` = Alert，`c` = LangMgr，同为 73995 注册处的模块别名）→ scripts3.js:73996
- 背包写点：`i.RogueRoleInfo.KnackObjs = e.knackBag` → scripts3.js:73997
- 窍门映射写点：`i.RogueRoleInfo.QualitySkillMap[o] = e.skillGraspData[o]` → scripts3.js:73998
- 应用窍门变更：`i.RogueRoleInfo.changeKnack(e.skillGraspData)`（前置 `cc.js.isEmptyObject(e.skillGraspData) ||`）→ scripts3.js:74000
- 抽奖次数 / 免费次数 / 冷却 / 每日限次：0 命中 → scripts3.js:73995-74002
- 客户端钱包模型（UserModel / RoleBaseInfo / InventoryDB / setGold / setYuanbao / addItem / getItemNum）：0 命中 → scripts3.js:73995-74002

---

# RESOLVE_KNACK

### 1. HttpConst 定义行

```
60308: RESOLVE_KNACK: "User.resolveKnack",
```

文件 `index.js`。index.js:60308

### 2. 注册点

```
81015: r.MessageCenter.on(a.HttpConst.RESOLVE_KNACK, this.onResolveKnack, this);
```

1 处，在 `t.prototype.init`（81013）内。scripts3.js:81015

### 3. 请求点

```
81161: t.prototype.doResolveKnack = function(t) {
81162: l.NetMgr.http.sendRequest(a.HttpConst.RESOLVE_KNACK, {
81163: knack: t
81164: });
81165: };
```

封装名：`NetMgr.http.sendRequest`。第二参对象字面量：单字段 `knack: t`，取形参 `t`（81161）；无嵌套。scripts3.js:81162-81164

### 4. 应答消费回调

```
81070: t.prototype.onResolveKnack = function(t, e) {
81071: 1 == e.eRet && e.hasOwnProperty("rewardArray") && n.default.addShowRewardUI1(e.rewardArray, 0, {});
81072: };
```

- `eRet` 判断点：`1 == e.eRet`（81071）→ scripts3.js:81071
- `e.xxx` 字段读点：`e.rewardArray`（81071，带 `hasOwnProperty` 守卫）→ scripts3.js:81071
- `note.xxx`：0 命中；`.toString()`：0 命中；`.length`：0 命中；下标读取：0 命中 → scripts3.js:81070-81072
- 链式下一请求：0 命中 → scripts3.js:81070-81072

### 钱包/扣费/奖励触点

- 奖励展示：`n.default.addShowRewardUI1(e.rewardArray, 0, {})`（`n` = StoryDialogMgr）→ scripts3.js:81071
- 提示文案（getText / Alert.show）：0 命中 → scripts3.js:81070-81072
- 抽奖次数 / 免费次数 / 冷却 / 每日限次：0 命中 → scripts3.js:81070-81072
- 客户端钱包模型读/写：0 命中 → scripts3.js:81070-81072

---

# EQUIP_BATCH_RESOLVE

### 1. HttpConst 定义行

```
59654: EQUIP_BATCH_RESOLVE: "User.equipBatchResolve",
```

文件 `index.js`。index.js:59654

### 2. 注册点

```
64932: r.MessageCenter.on(a.HttpConst.EQUIP_BATCH_RESOLVE, function(t, e) {
64933: if (1 == e.eRet) {
64934: v.default.addShowRewardUI1(e.rewardArray, 0);
64935: r.MessageCenter.dispatch(s.EvName.BATCH_DECOMPOSE_SUCCESS_EVENT, e.itemIDs);
64936: } else 6 == e.eRet ? cc.log("服务器获取锁定装备数据出错") : 7 == e.eRet && cc.log("锁定装备不能分解");
64937: }, this);
```

1 处（内联匿名回调，注册行 64932），位于 `InventoryModel.init`（`64672: e.prototype.init = function() {`）内；模块头 `64635: InventoryModel: [ function(t, e, o) {`、`64637: cc._RF.push(e, "055eamtISdFDZorrB9mYBKN", "InventoryModel");`、导出 `o.InventoryModel`（模块内 `64642: ... U = t("./UserModel") ...`）。index.js:64932

### 3. 请求点

```
65416: e.prototype.reqBatchResolveEquip = function(t) {
65417: m.NetMgr.http.sendRequest(a.HttpConst.EQUIP_BATCH_RESOLVE, {
65418: itemIDs: t
65419: });
65420: };
```

封装名：`NetMgr.http.sendRequest`。第二参对象字面量：单字段 `itemIDs: t`，取形参 `t`（65416）；无嵌套。调用方（同一键的上一层拼装段）：

```
61298: }
61299: e.prototype.setData = function(t, e) {
61300: this.itemInfos = t;
61301: this.isHaveGoodEquip = e;
61302: };
61303: e.prototype.onClickSure = function() {
61304: var t = [];
61305: this.itemInfos.forEach(function(e) {
61306: t.push(e.uID);
61307: });
61308: p.InventoryModel.reqBatchResolveEquip(t);
61309: c.PopUpMgr.removePopUp(this.node);
61310: };
```

即数组先由 `itemInfos` 的 `e.uID` 逐项 push 拼出（61305-61307），再整体作 `itemIDs` 传入（61308）。scripts3.js:61305-61308；index.js:65417-65419

### 4. 应答消费回调

回调为注册处内联函数，函数头 64932、函数尾 64937，全文逐行：

```
64932: r.MessageCenter.on(a.HttpConst.EQUIP_BATCH_RESOLVE, function(t, e) {
64933: if (1 == e.eRet) {
64934: v.default.addShowRewardUI1(e.rewardArray, 0);
64935: r.MessageCenter.dispatch(s.EvName.BATCH_DECOMPOSE_SUCCESS_EVENT, e.itemIDs);
64936: } else 6 == e.eRet ? cc.log("服务器获取锁定装备数据出错") : 7 == e.eRet && cc.log("锁定装备不能分解");
64937: }, this);
```

要点：
- `eRet` 判断点：`1 == e.eRet`（64933）、`6 == e.eRet`（64936）、`7 == e.eRet`（64936）→ index.js:64933,64936
- `e.xxx` 字段读点：`e.rewardArray`（64934，无守卫）、`e.itemIDs`（64935）→ index.js:64934,64935
- `note.xxx`：0 命中 → index.js:64932-64937
- `.toString()`：0 命中；`.length`：0 命中；下标读取：0 命中 → index.js:64932-64937
- 链式下一请求：0 命中；只 `dispatch(s.EvName.BATCH_DECOMPOSE_SUCCESS_EVENT, e.itemIDs)`（64935）→ index.js:64935

### 钱包/扣费/奖励触点

- 奖励展示：`v.default.addShowRewardUI1(e.rewardArray, 0)`（`v` = StoryDialogMgr，见 64642）→ index.js:64934
- 分解成功事件：`r.MessageCenter.dispatch(s.EvName.BATCH_DECOMPOSE_SUCCESS_EVENT, e.itemIDs)` → index.js:64935
- 提示文案（getText / Alert.show）：0 命中；失败分支仅 `cc.log("服务器获取锁定装备数据出错")` / `cc.log("锁定装备不能分解")` → index.js:64936
- 抽奖次数 / 免费次数 / 冷却 / 每日限次：0 命中 → index.js:64932-64937
- 客户端钱包模型读/写：回调内 0 命中（`InventoryModel` 其它键有写 `l.RoleBaseInfo.*`，本键回调内无）→ index.js:64932-64937

---

# GET_SKILL_GRASP

### 1. HttpConst 定义行

```
60304: GET_SKILL_GRASP: "User.getSkillGrasp",
```

文件 `index.js`。index.js:60304

### 2. 注册点

```
81019: r.MessageCenter.on(a.HttpConst.GET_SKILL_GRASP, this.onGetSkillGrasp, this);
```

1 处，在 `t.prototype.init`（81013）内。scripts3.js:81019

### 3. 请求点

```
81183: t.prototype.getSkillGrasp = function() {
81184: l.NetMgr.http.sendRequest(a.HttpConst.GET_SKILL_GRASP, null);
81185: };
```

封装名：`NetMgr.http.sendRequest`；第二参为 `null`（无参数字面量）。scripts3.js:81184

### 4. 应答消费回调

```
81076: t.prototype.onGetSkillGrasp = function(t, e) {
81077: 1 == e.eRet && e.hasOwnProperty("skillGrasp") && this.initData(e.skillGrasp);
81078: };
```

回调内转调 `initData` 全文（逐行）：

```
81041: t.prototype.initData = function(t) {
81042: this.QualitySkillMap = t.skillGrasp;
81043: this.KnackObjs = t.knackBag;
81044: var e = i.getTable("skill"), o = i.getTable("skill_quality");
81045: for (var s in this.QualitySkillMap) if (e.hasOwnProperty(s) && o.hasOwnProperty(s)) {
81046: var n = o[s][this.QualitySkillMap[s].rare].name;
81047: if (0 != n) {
81048: e[s].hasOwnProperty("protoN") || (e[s].protoN = e[s].Name);
81049: e[s].Name = n;
81050: }
81051: }
81052: };
```

- `eRet` 判断点：`1 == e.eRet`（81077）→ scripts3.js:81077
- `e.xxx` 字段读点：`e.skillGrasp`（81077，带 `hasOwnProperty` 守卫）；间接：`t.skillGrasp`（81042，与 81077 同一对象）、`t.knackBag`（81043）→ scripts3.js:81077,81042,81043
- 下标/链式读取：`o[s]`（81046）、`this.QualitySkillMap[s]`（81046）、`.rare`（81046）、`e[s]`（81048/81049）；`.length`：0 命中；`.toString()`：0 命中 → scripts3.js:81046,81048,81049
- `note.xxx`：0 命中 → scripts3.js:81076-81078
- 链式下一请求：0 命中 → scripts3.js:81076-81078

### 钱包/扣费/奖励触点

- 窍门映射写点：`this.QualitySkillMap = t.skillGrasp;` → scripts3.js:81042
- 背包写点：`this.KnackObjs = t.knackBag;` → scripts3.js:81043
- 配置表改写点（技能名按品质覆盖）：`e[s].protoN = e[s].Name`（81048）、`e[s].Name = n`（81049），表来源 `i.getTable("skill")` / `i.getTable("skill_quality")`（81044）→ scripts3.js:81044-81049
- 提示文案（getText / Alert.show）：0 命中 → scripts3.js:81076-81078
- 抽奖次数 / 免费次数 / 冷却 / 每日限次：0 命中 → scripts3.js:81076-81078
- 客户端钱包模型读/写：0 命中 → scripts3.js:81076-81078

---

# EQUIP_RESOLVE

### 1. HttpConst 定义行

```
59653: EQUIP_RESOLVE: "User.equipResolve",
```

文件 `index.js`。index.js:59653

### 2. 注册点

```
64924: r.MessageCenter.on(a.HttpConst.EQUIP_RESOLVE, function(t, e) {
64925: if (1 == e.eRet) {
64926: v.default.addShowRewardUI1(e.rewardArray, 0);
64927: r.MessageCenter.dispatch(s.EvName.DECOMPOSE_EQUIP_SUCCESS_EVENT, {
64928: itemId: e.itemID
64929: });
64930: } else 6 == e.eRet ? cc.log("服务器获取锁定装备数据出错") : 7 == e.eRet && cc.log("锁定装备不能分解");
64931: }, this);
```

1 处（内联匿名回调，注册行 64924），位于 `InventoryModel.init`（64672）内。index.js:64924

### 3. 请求点

```
65410: e.prototype.reqResolveEquip = function(t) {
65411: this.curItemId = t;
65412: m.NetMgr.http.sendRequest(a.HttpConst.EQUIP_RESOLVE, {
65413: itemID: t
65414: });
65415: };
```

封装名：`NetMgr.http.sendRequest`。第二参对象字面量：单字段 `itemID: t`，取形参 `t`（65410）；同值先被写入 `this.curItemId`（65411）。调用方（同一键的上一层）：

```
19097: n.addComponent("PromptUI").setData(o, !0, null, function() {
19098: r.InventoryModel.reqResolveEquip(e.uID);
19099: }.bind(t));
```

```
19107: }, function(t) {
19108: 0 == t && r.InventoryModel.reqResolveEquip(e.uID);
19109: });
```

即实参为装备对象的 `e.uID`（原样透传，无拼装）。scripts2.js:19098,19108；index.js:65412-65414

### 4. 应答消费回调

回调为注册处内联函数，函数头 64924、函数尾 64931，全文逐行：

```
64924: r.MessageCenter.on(a.HttpConst.EQUIP_RESOLVE, function(t, e) {
64925: if (1 == e.eRet) {
64926: v.default.addShowRewardUI1(e.rewardArray, 0);
64927: r.MessageCenter.dispatch(s.EvName.DECOMPOSE_EQUIP_SUCCESS_EVENT, {
64928: itemId: e.itemID
64929: });
64930: } else 6 == e.eRet ? cc.log("服务器获取锁定装备数据出错") : 7 == e.eRet && cc.log("锁定装备不能分解");
64931: }, this);
```

- `eRet` 判断点：`1 == e.eRet`（64925）、`6 == e.eRet`（64930）、`7 == e.eRet`（64930）→ index.js:64925,64930
- `e.xxx` 字段读点：`e.rewardArray`（64926，无守卫）、`e.itemID`（64928）→ index.js:64926,64928
- `note.xxx`：0 命中 → index.js:64924-64931
- `.toString()`：0 命中；`.length`：0 命中；下标读取：0 命中 → index.js:64924-64931
- 链式下一请求：0 命中；只 `dispatch(s.EvName.DECOMPOSE_EQUIP_SUCCESS_EVENT, { itemId: e.itemID })`（64927-64929）→ index.js:64927

### 钱包/扣费/奖励触点

- 奖励展示：`v.default.addShowRewardUI1(e.rewardArray, 0)`（`v` = StoryDialogMgr）→ index.js:64926
- 分解成功事件：`r.MessageCenter.dispatch(s.EvName.DECOMPOSE_EQUIP_SUCCESS_EVENT, { itemId: e.itemID })`（64927-64929）→ index.js:64927
- 失败提示：仅 `cc.log("服务器获取锁定装备数据出错")` / `cc.log("锁定装备不能分解")`，无 getText/Alert → index.js:64930
- 抽奖次数 / 免费次数 / 冷却 / 每日限次：0 命中 → index.js:64924-64931
- 客户端钱包模型读/写：回调内 0 命中 → index.js:64924-64931

---

# SKILL_GRASP

### 1. HttpConst 定义行

```
60303: SKILL_GRASP: "User.skillGrasp",
```

文件 `index.js`。index.js:60303

### 2. 注册点

```
81018: r.MessageCenter.on(a.HttpConst.SKILL_GRASP, this.onSkillGrasp, this);
```

1 处，在 `t.prototype.init`（81013）内。scripts3.js:81018

### 3. 请求点

```
81178: t.prototype.doSkillGrasp = function(t, e) {
81179: this.checkSkillGraspLevel(t, e) && l.NetMgr.http.sendRequest(a.HttpConst.SKILL_GRASP, {
81180: skillId: t
81181: });
81182: };
```

封装名：`NetMgr.http.sendRequest`。发请求前置条件：`this.checkSkillGraspLevel(t, e)`（81179）为真。第二参对象字面量：单字段 `skillId: t`，取形参 `t`（81178）；无嵌套。前置判断函数全文（同键发送门槛）：

```
81186: t.prototype.checkSkillGraspLevel = function(t, e) {
81187: var o = this.getNextQualityId(t, e), n = i.getItem(o, "skill_quality_level").basics_level, r = h.SkillTable.getBaseSkillID(t), a = h.SkillTable.getSkillLevel(r);
81188: if (a < n) {
81189: c.default.show(s.getText(8113).replace(/\[1\]/, n));
81190: return !1;
81191: }
81192: if ((a = h.SkillTable.getSkillLevel(t)) < n) {
81193: c.default.show(s.getText(8103).replace(/\[1\]/, n));
81194: return !1;
81195: }
81196: return !0;
81197: };
```

scripts3.js:81179-81181,81186-81197

### 4. 应答消费回调

```
81103: t.prototype.onSkillGrasp = function(t, e) {
81104: 1 == e.eRet || 7 == e.eRet && c.default.show(s.getText(7863));
81105: e.hasOwnProperty("knackBag") && (this.KnackObjs = e.knackBag);
81106: if (e.hasOwnProperty("skillGraspData")) for (var o in e.skillGraspData) this.QualitySkillMap[o] = e.skillGraspData[o];
81107: r.MessageCenter.dispatch(p.EvName.UPDATE_SKILL_GRASP, e);
81108: };
```

- `eRet` 判断点：`1 == e.eRet`、`7 == e.eRet`（同一行 81104，原文为 `||` 与 `&&` 组合，无额外括号）→ scripts3.js:81104
- `e.xxx` 字段读点：`e.knackBag`（81105，有守卫）、`e.skillGraspData`（81106，有守卫）；整个 `e` 作为 payload 再发出（81107）→ scripts3.js:81105,81106,81107
- `note.xxx`：0 命中 → scripts3.js:81103-81108
- `.toString()`：0 命中；`.length`：0 命中；下标读取：`e.skillGraspData[o]`（81106）→ scripts3.js:81106
- 链式下一请求：0 命中；只 `dispatch(p.EvName.UPDATE_SKILL_GRASP, e)`（81107，带整包 payload）→ scripts3.js:81107

### 钱包/扣费/奖励触点

- 提示文案：`c.default.show(s.getText(7863))`（`c` = Alert，`s` = LangMgr）→ scripts3.js:81104
- 门槛文案（发送前）：`c.default.show(s.getText(8113).replace(/\[1\]/, n))`（81189）、`c.default.show(s.getText(8103).replace(/\[1\]/, n))`（81193）→ scripts3.js:81189,81193
- 等级门槛读点（非货币）：`i.getItem(o, "skill_quality_level").basics_level`（81187）、`h.SkillTable.getSkillLevel(r)` / `getSkillLevel(t)`（81187,81192）→ scripts3.js:81187,81192
- 背包写点：`this.KnackObjs = e.knackBag` → scripts3.js:81105
- 窍门映射写点：`this.QualitySkillMap[o] = e.skillGraspData[o]` → scripts3.js:81106
- 抽奖次数 / 免费次数 / 冷却 / 每日限次：0 命中 → scripts3.js:81103-81108
- 客户端钱包模型（UserModel / RoleBaseInfo / InventoryDB / setGold / setYuanbao / addItem / getItemNum）：0 命中 → scripts3.js:81103-81108

---

## 未能验证

1. `note.xxx` 读点：11 个键的应答回调内 0 命中，本报告无法给出该类字段（同文件其它键如 `ROGUE_USE_ITEM` 有 `note.skch` 读点，不属本批）。
2. `sendReqWithMask` 封装：11 个键的请求点全部为 `NetMgr.http.sendRequest`，0 处使用 `sendReqWithMask` 或其它封装名；因此"封装名"一项只能写 `NetMgr.http.sendRequest`（scripts3.js:74043 的 `sendReqWithMask` 属 `ROGUE_EQUIP_WEAPON`，非本批键）。
3. 注册点是否还有第二处：以 `HttpConst.<键名>` 标识符形式的 `MessageCenter.on` 每键各 1 处；以字符串常量形式（如 `on("User.knackLottery")`）注册的写法在 3 个文件内 0 命中，故无法排除"存在但写法不同"的可能。
4. `main.js`（751,580 B）未纳入扫描：不在本批给定的 3 个输入文件范围内，若其中存在同键注册/请求，本报告未覆盖。
5. `eRet` 全集未知：各回调只显式消费部分取值（GET_KNACK_LOTTERY 只判 1/3；KNACK_LOTTERY 只判 1/5；CHANGE_SKILL_KNACK 与 ROGUE_CHANGE_SKNACK 只判 11/1；SKILL_GRASP 只判 1/7；RESOLVE/BATCH_RESOLVE_KNACK 只判 1；EQUIP_RESOLVE/EQUIP_BATCH_RESOLVE 只判 1/6/7），其余 eRet 取值在客户端消费代码里 0 命中。
6. `GET_KNACK_LOTTERY_HISTORY` 回调把结果覆盖到 `this.history`（90039），`history` 结构/元素字段在回调内 0 读取，无法从回调本身确认字段形状。
7. `KNACK_LOTTERY` 应答的完整字段形状：回调把整个 `e` 交给 `TrickRewardUI.setData(e)`（90093），该 `setData` 的方法体未在本报告展开，故应答字段全集未验证。
8. 拼写歧义：`ROGUE_CHANGE_SKNACK`（`SKNACK`）与 `CHANGE_SKILL_KNACK`（`SKILL`）原文不同，按"不许纠正"要求逐字照抄；其值分别为 `User.rgChangeSkillKnack`（index.js:60539）与 `User.changeSkillKnack`（index.js:60307）。
9. `GET_KNACK_LOTTERY` 回调形参 `t` 未使用（90064 取 `t, e`，函数体内无 `t.` 读点）——仅记录事实，不作解释。
10. `CHANGE_SKILL_KNACK` 回调 81084 处 `e.skillGraspData` 是无守卫读取（81082 处有守卫），同一份应答两处读取方式不同——原文如此，未作统一。
11. `ROGUE_CHANGE_SKNACK` 注册块所在模块的边界判定：`o.RogueRoleInfo = new N();`（73829）+ `cc._RF.pop();`（73830）为上一模块收尾，本注册块属 `o.RogueRoleModel = new M();`（74604）模块；该判定依据是 `cc._RF.pop()` 位置，未见模块名在上文重复出现。

## 范围外发现

- `F:\BaoZouyxt\tools\main.js`（751,580 B）——同目录第四个大包，本批未给输入范围，未扫描。
- `scripts3.js:96319` `t.prototype.changeSkillKnacks = function(t, e)` —— 与 CHANGE_SKILL_KNACK 同面板的装配管理器方法，未展开。
- `scripts3.js:81020` `r.MessageCenter.on(a.HttpConst.KNACK_CHANGE, ...)`（常量值 `"skrl"`，index.js:60305）、`scripts3.js:81036` `r.MessageCenter.on(a.HttpConst.KNACKBAG_CHANGE, ...)`（常量值 `"knbag"`，index.js:60306）—— 同面板推送通道，未展开。
- `scripts3.js:90090-90094` `TrickRewardUI.setData(e)` —— 抽奖应答的消费方，未展开其 setData 全文。
- `scripts3.js:90022-90033` `getReward` / `onGetReward`（`RECEIVE_ACHIEVEMENT_REWARD`，index.js:60414）—— 同面板另一发奖键，未展开。
- `scripts3.js:90098-90105` `reqOptionalSkillUp`（`HttpConst3.OPTIONAL_SKILL_UP`）—— 同面板另一请求键，未展开。
- `scripts3.js:89977` `TrickLotteryModel` 模块头；`scripts3.js:90198` `o.TrickLotteryModel = new _();`；`scripts3.js:81287` `o.SkillKnackModel = new m();`；`index.js:61414` `o.InventoryDB = new S();` —— 仅列名。
- 事件名（仅列名，未展开）：`EvName.GET_DEFAULT_TRICK_LOTTERY_DATA`、`EvName.CHANGE_TRICK_LOTTERY_DATA`、`EvName.TRICK_LOTTERY_END`、`EvName.GET_TRICK_LOTTERY_RECORD`、`EvName.UPDATE_SKILL_GRASP`、`EvName.DECOMPOSE_EQUIP_SUCCESS_EVENT`、`EvName.BATCH_DECOMPOSE_SUCCESS_EVENT`、`EvName.REWARD_ITEM`、`EvName3.SKILL_UP_EVT`。
- `scripts2.js:19088` `o.prototype.onSaleCallBack` —— EQUIP_RESOLVE 的 UI 触发方，未展开。
- `scripts3.js:61303` `e.prototype.onClickSure` —— EQUIP_BATCH_RESOLVE 的 UI 触发方，未展开。
- `scripts3.js:81109-81125` `getKnackUniqueSkills`、`81126-81132` `getSkillQuality/getSkillKnack`、`81133-81138` `changeQualitySkill/resetKnack` —— 同模型公共读方法，未展开。

## 自检

- GET_KNACK_LOTTERY — 4/4 项齐
- GET_KNACK_LOTTERY_HISTORY — 4/4 项齐
- KNACK_LOTTERY — 4/4 项齐
- BATCH_RESOLVE_KNACK — 4/4 项齐
- CHANGE_SKILL_KNACK — 4/4 项齐
- ROGUE_CHANGE_SKNACK — 4/4 项齐
- RESOLVE_KNACK — 4/4 项齐
- EQUIP_BATCH_RESOLVE — 4/4 项齐
- GET_SKILL_GRASP — 4/4 项齐
- EQUIP_RESOLVE — 4/4 项齐
- SKILL_GRASP — 4/4 项齐

一级小节数：11（键名 `#` 标题）；末三节：`## 未能验证`、`## 范围外发现`、`## 自检`。
