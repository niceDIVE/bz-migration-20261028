# scoutC — childData / childObj / childState / fetationTime 字段级读点摘录

范围：仅 F:\BaoZouyxt\tools\index.js、F:\BaoZouyxt\tools\scripts2.js、F:\BaoZouyxt\tools\scripts3.js
方法：grep（模式 `childData|childObj|childState|fetationTime`，区分大小写）定位 → read 向上找最近 `prototype.XXX = function` / `XXX: function`。
grep 命中数：index.js 38 行、scripts2.js 15 行、scripts3.js 0 行（均远低于工具 250 行上限，未截断）。

---

## 一、childData

### 1.1 F:\BaoZouyxt\tools\index.js（38 行命中，其中 childData 35 行、fetationTime 另列于第三节）

| 文件:行号 | 原文（完整一行） | 所在函数 | 访问形态 |
|---|---|---|---|
| index.js:24623 | `c.MarryModel.childData.childName = e.childName;` | `t.prototype.setChildNameCallBack`（ChildrenModel，24621） | `childData.键名`（childName，写） |
| index.js:24640 | `e.hasOwnProperty("foster_point") && (c.MarryModel.childData.foster_point = e.foster_point);` | `t.prototype.resetChildCallBack`（ChildrenModel，24638） | hasOwnProperty 检查（对 e）+ `childData.键名`（foster_point，写） |
| index.js:24641 | `e.hasOwnProperty("playArr") && (c.MarryModel.childData.playArr = e.playArr);` | `t.prototype.resetChildCallBack`（ChildrenModel，24638） | hasOwnProperty 检查（对 e）+ `childData.键名`（playArr，写） |
| index.js:24697 | `c.MarryModel.childData = e.childObj;` | `t.prototype.onAdoptChild`（ChildrenModel，24694） | 整体赋值 |
| index.js:24743 | `var t = n.getTable("age"), e = c.MarryModel.childData.age, o = f.UserModel.entity.totalGameTime.gameTime - e, i = Math.floor(o / 3600), r = Math.floor(i / 96), a = t[1];` | `t.prototype.getChildData`（ChildrenModel，24742） | `childData.键名`（age，读） |
| index.js:24754 | `var t = c.MarryModel.childData.age, e = f.UserModel.entity.totalGameTime.gameTime - t, o = Math.floor(e / 3600), i = Math.floor(o / 96);` | `t.prototype.getChildAgeNum`（ChildrenModel，24753） | `childData.键名`（age，读） |
| index.js:24758 | `var t = c.MarryModel.childData, e = n.getTable("talent"), o = t.fatherLv, i = {};` | `t.prototype.getTalentData`（ChildrenModel，24757） | 整体取（`t = childData`）+ 同行 `t.fatherLv`（fatherLv，读） |
| index.js:24766 | `var t = c.MarryModel.childData, e = i.getText(2098).replace(/\[1\]/, d.RoleOtherInfo.changeInputWordStr(c.MarryModel.getChildName()));` | `t.prototype.getChildAttrubiteDes`（ChildrenModel，24765） | 整体取（`t = childData`）；下一行 24767 `t.sex` 使用（sex，读）；`getChildName()` 传参调用 |
| index.js:24767（24766 相邻行） | `e = (e = e.replace(/\[2\]/, this.getChildAgeNum())).replace(/\[3\]/, t.sex > 0 ? i.getText("275") : i.getText("274"));` | 同上 | `t.sex`（经 24766 整体取；sex，读） |
| index.js:24778 | `if (2 == S.RoleBaseInfo.sexState && c.MarryModel.npcMarryState > 0 && !c.MarryModel.childData.hasOwnProperty("bornTime") && 2 != c.MarryModel.loveState) {` | `t.prototype.reqGainChildData`（ChildrenModel，24777） | hasOwnProperty 检查（bornTime） |
| index.js:24863 | `var t = c.ChildrenModel.getChildData(), e = p.MarryModel.childData;` | `e.prototype.getImagePng`（ChildrenNpc，24862） | 整体取（`e = childData`）；下一行 24864 使用 |
| index.js:24864（24863 相邻行） | `return "npcs/" + (parseInt(e.sex) > 0 ? t.model[1] : t.model[0]);` | 同上 | `e.sex`（sex，读） |
| index.js:24867 | `if (0 == p.MarryModel.childData.childName.length) s.default.prefabs.load("marrySystem/NameAlert", cc.Prefab, function(t, e) {` | `e.prototype.reaction`（ChildrenNpc，24866） | `childData.键名`（childName.length，读） |
| index.js:55434 | `if (2 != l && !a.MarryModel.childData.hasOwnProperty("childName") && o > 0) s.default.addDialogEvent(n.Description, 0, null, this.divorceComicsFunc.bind(this)); else {` | `e.prototype.enterTalkNpc`（GuestModel，55431） | hasOwnProperty 检查（childName） |
| index.js:76984 | `this.fetationTime = 0;` | 构造函数 `function e()`（MarryModel 模块，76971） | 属性初始化（fetationTime） |
| index.js:76985 | `this.childData = {};` | 构造函数 `function e()`（MarryModel 模块，76971） | 整体赋值（{}） |
| index.js:77006 | `this.fetationTime = 0;` | 构造函数 `function e()`（MarryModel 模块，76971；构造体内第二次重复段） | 属性初始化（fetationTime） |
| index.js:77007 | `this.childData = {};` | 构造函数 `function e()`（MarryModel 模块，76971；构造体内第二次重复段） | 整体赋值（{}） |
| index.js:77049 | `e.hasOwnProperty("fetationTime") && (this.fetationTime = e.fetationTime);` | `e.prototype.setRoleMarryInfo`（MarryModel，77033） | hasOwnProperty 检查 + `this.fetationTime = e.fetationTime`（服务端字段写入） |
| index.js:77050 | `e.hasOwnProperty("childObj") && (this.childData = e.childObj);` | `e.prototype.setRoleMarryInfo`（MarryModel，77033） | hasOwnProperty 检查 + 整体赋值（childData ← e.childObj） |
| index.js:77086 | `this.childData.baseArr = t;` | `e.prototype.setChildAttData`（MarryModel，77085） | `childData.键名`（baseArr，写） |
| index.js:77087 | `this.childData.addArr = e;` | `e.prototype.setChildAttData`（MarryModel，77085） | `childData.键名`（addArr，写） |
| index.js:77090 | `this.childData.playArr[t] += e;` | `e.prototype.setPlayAttData`（MarryModel，77089） | `childData.键名[下标]`（playArr，读+写） |
| index.js:77285 | `this.fetationTime = e.fetationTime;` | `e.prototype.callBackMakeLove`（MarryModel，77278） | 属性赋值（fetationTime ← e.fetationTime） |
| index.js:77355 | `this.childData = e.childObj;` | `e.prototype.callBackBirthild`（MarryModel，77352） | 整体赋值（childData ← e.childObj） |
| index.js:77384 | `this.childData = {};` | `e.prototype.callBackExileChild`（MarryModel，77382） | 整体赋值（{}） |
| index.js:77385 | `this.fetationTime = 0;` | `e.prototype.callBackExileChild`（MarryModel，77382） | 属性赋值（fetationTime） |
| index.js:77605 | `return this.childData.childName;` | `e.prototype.getChildName`（MarryModel，77604） | `childData.键名`（childName，读） |
| index.js:77638 | `this.fetationTime = 0;` | `e.prototype.destroy`（MarryModel，77626） | 属性赋值（fetationTime） |
| index.js:77639 | `this.childData = {};` | `e.prototype.destroy`（MarryModel，77626） | 整体赋值（{}） |
| index.js:92011 | `if (f.MarryModel.childData.hasOwnProperty("bornTime")) {` | `e.prototype.parseObj`（91662 起，switch case "child"，位于 92010） | hasOwnProperty 检查（bornTime） |
| index.js:101888 | `1 == e.birthID ? u.default.prefabs.load("taskUI/StartActionUI_" + v.MarryModel.childData.sex, cc.Prefab, function(e, o) {` | `e.prototype.init`（RebirthModel，101879；命中行位于 init 内 101885 注册的 `CYCLE_LIFE` 消息回调中） | `childData.键名`（sex，读；用于字符串拼接） |
| index.js:116563 | `var e = s.MarryModel.childData.sex, o = r.UserModel.entity;` | `t.prototype.getCanPassSkillData`（116562） | `childData.键名`（sex，读） |
| index.js:120313 | `var i = !1, r = this.dic, a = p.MarryModel.childData.sex;` | `o.SkillTable.checkIsSkillState = function(t)`（120311；静态形式） | `childData.键名`（sex，读） |
| index.js:144611 | `this.childData = {};` | 构造函数 `function t()`（WedHouseModel 模块，144607）【对象：WedHouseModel.childData，原文无 MarryModel 前缀】 | 整体赋值（{}） |
| index.js:144618 | `this.childData = {};` | `t.prototype.init`（WedHouseModel，144614）【对象：WedHouseModel.childData】 | 整体赋值（{}） |
| index.js:144631 | `this.childData = t;` | `t.prototype.setChildObjData`（WedHouseModel，144630）【对象：WedHouseModel.childData】 | 整体赋值（传参入） |
| index.js:144778 | `var t = u.NpcFactory.createChildrenNpc(f.WedHouseModel.childData.name), e = c.MapUtils.mapGameCoorConvert(f.WedHouseModel.childData.x, f.WedHouseModel.childData.y);` | `o.prototype.birthChild`（WedHouseScene，144777）【对象：WedHouseModel.childData】 | `childData.键名`（name / x / y，读） |

### 1.2 F:\BaoZouyxt\tools\scripts2.js（15 行命中，全部为 childData）

| 文件:行号 | 原文（完整一行） | 所在函数 | 访问形态 |
|---|---|---|---|
| scripts2.js:12255 | `for (var t = u.MarryModel.childData, e = t.baseArr, o = t.addArr, i = [], s = 1; s < t.playArr.length; s++) i.push(t.playArr[s]);` | `e.prototype.updateChildData`（CheckChildUI，12254） | 整体取（`t = childData`）+ `t.baseArr`、`t.addArr`、`t.playArr`（读） |
| scripts2.js:12277 | `var t = u.MarryModel.childData.addArr;` | `e.prototype.reqWashProperty`（CheckChildUI，12276） | `childData.键名`（addArr，读） |
| scripts2.js:12861 | `var t = c.MarryModel.childData, e = parseInt(t.sex) > 0 ? 2136 : 2135;` | `e.prototype.start`（ChildNameUI，12860） | 整体取 + `t.sex`（sex，读） |
| scripts2.js:12943 | `var t = l.MarryModel.childData;` | `e.prototype.start`（ChildPlayMenu，12942） | 整体取；下一行 12944 使用 |
| scripts2.js:12944（12943 相邻行） | `this.labele.getComponent(cc.Label).string = a.getText(4568).replace(/\[1\]/, t.foster_point);` | 同上 | `t.foster_point`（foster_point，读） |
| scripts2.js:12948 | `e.hasOwnProperty("foster_point") && (l.MarryModel.childData.foster_point = e.foster_point);` | `e.prototype.onAddChildFoster`（ChildPlayMenu，12946） | hasOwnProperty 检查（对 e）+ `childData.键名`（foster_point，写） |
| scripts2.js:12949 | `e.hasOwnProperty("playArr") && (l.MarryModel.childData.playArr = e.playArr);` | `e.prototype.onAddChildFoster`（ChildPlayMenu，12946） | hasOwnProperty 检查（对 e）+ `childData.键名`（playArr，写） |
| scripts2.js:12951 | `var o = l.MarryModel.childData;` | `e.prototype.onAddChildFoster`（ChildPlayMenu，12946） | 整体取；下一行 12952 使用 |
| scripts2.js:12952（12951 相邻行） | `this.labele.getComponent(cc.Label).string = a.getText(4568).replace(/\[1\]/, o.foster_point);` | 同上 | `o.foster_point`（foster_point，读） |
| scripts2.js:12957 | `if (5 == e) if (0 == l.MarryModel.childData.foster_point) {` | `e.prototype.onClick`（ChildPlayMenu，12955） | `childData.键名`（foster_point，读） |
| scripts2.js:12971 | `} else d.default.show(a.getText(4571)); else if (0 == l.MarryModel.childData.foster_point) {` | `e.prototype.onClick`（ChildPlayMenu，12955） | `childData.键名`（foster_point，读） |
| scripts2.js:14299 | `var t = Math.floor(M.MarryModel.childData.sex);` | `o.prototype.start`（ConvstnBoard，14292） | `childData.键名`（sex，读） |
| scripts2.js:14868 | `var t = M.MarryModel.childData, e = parseInt(t.sex) > 0 ? "sz4" : "sz3", o = [];` | `o.prototype.selectCheckBtnCall`（ConvstnBoard，14635；命中行位于 switch case "1381" 内，14860） | 整体取 + `t.sex`（sex，读） |
| scripts2.js:15021 | `if (k.RoleOtherInfo.isUntie) E.default.show(a.getText(6372)); else if (F.ChildrenModel.getChildAgeNum() >= 8) if (0 == M.MarryModel.childData.foster_point) {` | `o.prototype.selectCheckBtnCall`（ConvstnBoard，14635；命中行位于 switch case "jh50" 内，15020） | `childData.键名`（foster_point，读） |
| scripts2.js:52540 | `for (var o = t.split("|"), i = o.length, s = 0, n = b.MarryModel.childData.sex, r = 0; r < o.length; r++) this.checkContidionState(o[r]) && s++;` | `t.prototype.judgeIsOrID`（52539） | `childData.键名`（sex，读） |
| scripts2.js:52544 | `for (var o = t.split("|"), i = Number(o[0]), s = b.MarryModel.childData.sex, n = 1; n < o.length; n++) this.checkContidionState(o[n]) && i--;` | `t.prototype.judgeSub`（52543） | `childData.键名`（sex，读） |
| scripts2.js:68403 | `for (var e = l.MarryModel.childData.sex, o = 0; o < t.length; o++) {` | `e.prototype.checkSexData`（StoryEndingSelectIDUI，68402） | `childData.键名`（sex，读） |

### 1.3 F:\BaoZouyxt\tools\scripts3.js

grep `childData` 命中：0 行。（合并模式 `childData|childObj|childState|fetationTime` 在 scripts3.js 全文件 0 命中。）

---

## 二、childObj（childData 的来源字段）

| 文件:行号 | 原文（完整一行） | 所在函数 | 访问形态 |
|---|---|---|---|
| index.js:24697 | `c.MarryModel.childData = e.childObj;` | `t.prototype.onAdoptChild`（ChildrenModel，24694） | `e.childObj` → 整体赋入 childData（ADOPTCHILD 回调） |
| index.js:77050 | `e.hasOwnProperty("childObj") && (this.childData = e.childObj);` | `e.prototype.setRoleMarryInfo`（MarryModel，77033） | hasOwnProperty 检查 + `e.childObj` → 整体赋入 childData |
| index.js:77355 | `this.childData = e.childObj;` | `e.prototype.callBackBirthild`（MarryModel，77352） | `e.childObj` → 整体赋入 childData（BIRTHCHILD 回调） |

childObj 在三包中的其余形态：grep 合并模式下 scripts2.js、scripts3.js 均无 childObj 命中。index.js 中另有函数名 `setChildObjData`（index.js:144630，WedHouseModel，不含小写 `childObj` 字面量、未被 grep 命中，仅记录位置）。

---

## 三、childState + fetationTime

### 3.1 childState

grep（区分大小写，三包合并模式）命中：**0 行**。index.js、scripts2.js、scripts3.js 均无 `childState` 字面量。

### 3.2 fetationTime（全部命中行）

| 文件:行号 | 原文（完整一行） | 所在函数 | 访问形态 |
|---|---|---|---|
| index.js:24735 | `var t = f.UserModel.entity.totalGameTime.gameTime - c.MarryModel.fetationTime, e = parseInt(t), o = Math.floor(parseInt(e) / 60), n = Math.floor(parseInt(o) / 60);` | `t.prototype.getChildrenAgeDes`（ChildrenModel，24734） | 读（参与减法） |
| index.js:24739 | `var t = f.UserModel.entity.totalGameTime.gameTime - c.MarryModel.fetationTime;` | `t.prototype.judgeBirthChildState`（ChildrenModel，24738） | 读 |
| index.js:76984 | `this.fetationTime = 0;` | 构造函数 `function e()`（MarryModel 模块，76971） | 初始化 |
| index.js:76985 | `this.childData = {};` | 同上（与 childData 同段，见第一节） | —（childData 行） |
| index.js:77006 | `this.fetationTime = 0;` | 构造函数 `function e()`（MarryModel 模块，76971；重复段） | 初始化 |
| index.js:77049 | `e.hasOwnProperty("fetationTime") && (this.fetationTime = e.fetationTime);` | `e.prototype.setRoleMarryInfo`（MarryModel，77033） | hasOwnProperty 检查 + 写入（e.fetationTime） |
| index.js:77285 | `this.fetationTime = e.fetationTime;` | `e.prototype.callBackMakeLove`（MarryModel，77278） | 写入（e.fetationTime） |
| index.js:77385 | `this.fetationTime = 0;` | `e.prototype.callBackExileChild`（MarryModel，77382） | 置零 |
| index.js:77638 | `this.fetationTime = 0;` | `e.prototype.destroy`（MarryModel，77626） | 置零 |
| index.js:76985 / 77007 / 77384 / 77639 / 144611 / 144618 / 144631 / 144778 | 见第一节（childData 行，同 grep 命中清单内） | 见第一节 | — |

fetationTime 在 scripts2.js、scripts3.js 命中：0 行。

---

## 四、汇总计数表（键名 → 读点数 → 行号清单）

### 4.1 MarryModel.childData 的键名（按原文可见的字段访问）

| 键名 | 读/写点数 | 行号清单（文件:行号） |
|---|---|---|
| sex | 11（含经整体取的相邻行） | index.js:101888、116563、120313；scripts2.js:12861、14299、14868、52540、52544、68403；index.js:24767（经 24766 整体取）；index.js:24864（经 24863 整体取） |
| childName | 4 | index.js:24623（写）、24867（.length 读）、55434（hasOwnProperty）、77605（读） |
| foster_point | 7 | index.js:24640（写）；scripts2.js:12948（写）、12944（经 12943）、12952（经 12951）、12957、12971、15021（读） |
| playArr | 4 | index.js:24641（写）、77090（读+写）；scripts2.js:12949（写）、12255（读） |
| baseArr | 2 | index.js:77086（写）；scripts2.js:12255（读） |
| addArr | 3 | index.js:77087（写）；scripts2.js:12277（读）、12255（读） |
| age | 2 | index.js:24743、24754（读） |
| fatherLv | 1 | index.js:24758（读，同行整体取内） |
| bornTime | 2 | index.js:24778、92011（均 hasOwnProperty） |
| （整体赋值/置空，不涉具体键名） | 10 | index.js:24697、77050、77355（← e.childObj）；76985、77007、77384、77639（= {}）；144611、144618、144631（WedHouseModel.childData） |
| name / x / y（WedHouseModel.childData） | 1 行 | index.js:144778 |

### 4.2 childObj

| 键名 | 点数 | 行号清单 |
|---|---|---|
| childObj | 3 | index.js:24697、77050、77355 |

### 4.3 fetationTime

| 键名 | 点数 | 行号清单 |
|---|---|---|
| fetationTime | 9 | index.js:24735、24739（读）；76984、77006（初始化）；77049、77285（写入）；77385、77638（置零）；77049 含 hasOwnProperty |

### 4.4 childState

| 键名 | 点数 | 行号清单 |
|---|---|---|
| childState | 0 | 三包 grep 0 命中 |

---

## 五、未能验证

1. index.js:92011 所在函数为 `e.prototype.parseObj`（91662），但该函数所在模块名（`cc._RF.push` 处的模块标识）在本工单读取窗口之外，未能确认。
2. index.js:116563 所在函数为 `t.prototype.getCanPassSkillData`（116562），其模块名（cc._RF.push 处标识）未读到，未能确认。
3. scripts2.js:52540 / 52544 所在函数为 `t.prototype.judgeIsOrID` / `t.prototype.judgeSub`，其模块名未读到，未能确认（scripts2.js:68399 有调用文本 `d.ReincarnatMgr.judgeIsOrID(o.requirements, o.sex)`，仅记录位置）。
4. index.js:101888 命中行位于 `e.prototype.init`（101879）内注册的回调（101885 `i.MessageCenter.on(r.HttpConst.CYCLE_LIFE, function(o, r) {`）深处，函数归属按"向上最近的 prototype 定义"机械认定。
5. `childData` 的大小写变体（如 `ChildData`）及 `getChildData` 等同名方法调用未做单独 grep，本报告仅覆盖工单所列四词的区分大小写命中。
6. scripts3.js 为 0 命中，未对 scripts3.js 做任何函数定位读取。

## 六、范围外产出

- index.js:101898 `setData(0, function() {...}, v.MarryModel.getChildName());`（101888 同一回调内，`getChildName()` 传参调用点，不含 childData 字面量；只记录位置）。
- scripts2.js:14346 `if (46 == e.Type) this.nameStr = M.MarryModel.getChildName();`（`getChildName()` 调用点，不含 childData 字面量；只记录位置）。
- scripts2.js:12256 `var n = u.MarryModel.cycleData[8], ...`（12255 相邻行，`cycleData` 非 childData；只记录位置）。
- index.js:77356 `var o = a.getItem(this.npcMarryState, "propose");`（77355 相邻行；只记录位置）。
