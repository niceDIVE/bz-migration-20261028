# 技巧摸奖：TrickLotteryUI / TrickRateUI 对服务端回包的字段读点（只读摘录）

- 摘录对象：`F:\BaoZouyxt\tools\scripts3.js`（全文只按 grep 定位 + 带 offset/limit 读，未整文件读）
- 模块边界（由 read 确认）：
  - `TrickLotteryModel`：**89977–90217**（`o.TrickLotteryModel = new _();` 在 90198，模块尾 `} ],` 在 90217）
  - `TrickLotteryUI`：**90218–90667**（类体结束 `}(a.UIComponent);` 90645，`o.TrickLotteryUI = R;` 90646，模块尾 90667）
  - `TrickRateUI`：**90928–91084**（`o.TrickRateUI = y;` 91073，模块尾 91084）
- 回包对象事实基线：
  - `this.setVariable(e)` → `this.lotteryData = t;`（**90054**），`this.lotteryDatas[e.lotteryId] = e;`（**90067**）
  - 因此 `TrickLotteryModel.lotteryData` **就是** GET_KNACK_LOTTERY 的整个响应包对象，`.onePrice` / `.tenPrice` / `.nextSkillArr` / `[skillId]` 都是该包的直接成员。
  - 另有写点：`OPTIONAL_SKILL_UP` 回包把 `o.upSkillRateData` 逐键并进当前包：`for (var n in s) t.lotteryData[n] = s[n];`（**90011**）。
- 守卫图例：
  - `hasOwnProperty` 守卫 / `if (x)` 真值守卫 / `&&`、`||` 短路 / **🔴 裸读（无守卫）**
  - 「裸读」判定 = 该行在求值该字段时，前面没有针对该字段（或其父对象）存在性的任何判断。
- 说明：`TrickLotteryUI` 直接写 `lotteryData.xxx` 的只有 4 行；其余绝大多数读点读的是**模型从回包拷贝出来的同名字段**（90052–90062），风险等价，故一并列出并分节标注「直接读」与「经模型字段」。

---

## 一、TrickLotteryUI（90218–90667）字段读点

### 1.1 直接读 `lotteryData.*`（含经模型方法 `getTicketId()`）

**① scripts3.js:90404**
```js
!this.isHasFree() && this.getTicketNum() < g.TrickLotteryModel.lotteryData.onePrice[1] ? this.showChargeTip() : g.TrickLotteryModel.reqLottery(1, this.getSkill());
```
- 读：`lotteryData.onePrice`，再 `[1]`
- 守卫：`&&` 短路 —— 但短路条件是 `!this.isHasFree()`（`isHasFree()` = `1 == TrickLotteryModel.isFree`，90381），**不覆盖字段存在性**
- 结论：**🔴 裸读**（在「非免费」状态下求值；`onePrice` 缺失 → `undefined[1]` 抛 TypeError）
- 用途：点「抽一次」前判断票数是否够 → 不够弹充值提示

**② scripts3.js:90407**
```js
this.getTicketNum() < g.TrickLotteryModel.lotteryData.tenPrice[1] ? this.showChargeTip() : g.TrickLotteryModel.reqLottery(2, this.getSkill());
```
- 读：`lotteryData.tenPrice`，再 `[1]`
- 守卫：**无**
- 结论：**🔴 裸读**（`tenPrice` 缺失 → `undefined[1]` 抛 TypeError）
- 用途：点「抽十次」前判断票数是否够

**③ scripts3.js:90565**
```js
var e = g.TrickLotteryModel.lotteryData.onePrice[1];
```
- 读：`lotteryData.onePrice[1]`
- 守卫：`if (!t)` 真值守卫（t = `this.isHasFree()`，90559；`if (!t) {` 在 90563）—— 守卫的是「是否免费」，不是字段存在性
- 结论：**🔴 裸读**（仅非免费时执行；缺 `onePrice` 抛 TypeError）
- 用途：把单抽价格显示到 `getOneNum`，并与票数比较改颜色（90566–90568）

**④ scripts3.js:90573**
```js
var t = g.TrickLotteryModel.lotteryData.tenPrice[1];
```
- 读：`lotteryData.tenPrice[1]`
- 守卫：**无**（`showGetTen` 内第一行，90571–90573）
- 结论：**🔴 裸读**（缺 `tenPrice` 抛 TypeError）
- 用途：十连价格显示 + 颜色比较（90574–90576）

**⑤ scripts3.js:90193–90195（模型方法，被 UI 三处调用）**
```js
t.prototype.getTicketId = function() {
return this.lotteryData.trick_item;
};
```
- 读：`lotteryData.trick_item`
- 守卫：**无**（只保护到 `lotteryData` 存在；`trick_item` 缺失时返回 `undefined`，本行自身不抛）
- 结论：**🔴 裸读**（`lotteryData` 为 undefined 时 `.trick_item` 抛 TypeError；`trick_item` 缺失本身不抛）
- UI 调用点：**90328** `this.setTicketSprite(this.ticketIcon);`（onLoad 内，`refresh()` 之前）、**90384** `return p.RoleBaseInfo.getItemNum(g.TrickLotteryModel.getTicketId());`、**90454** `this.setSpriteFrame(t, "resources/GraspUI/" + g.TrickLotteryModel.getTicketId(), !0, null, e);`

### 1.2 经模型字段间接读回包（模型字段由 90052–90062 从回包拷贝）

**L90339**
```js
this.changeSpriteMaterial(o, e != g.TrickLotteryModel.lotteryId);
```
- 读：`lotteryId`（模型字段 ← 回包 `t.lotteryId`）
- 守卫：无（模型属性读取不会抛）→ **🔴 裸读**（比较本身对 undefined 不抛错）
- 用途：池子底图材质按「是否当前池」切换

**L90355**
```js
var t = this.getSkill(), e = c.getItem(g.TrickLotteryModel.lotteryId, "skill_Trick_Lotterymachine"), o = "", i = "";
```
- 读：`lotteryId`
- 守卫：无 → **🔴 裸读**（本行不抛；`c.getItem(undefined, …)` 的返回值在 CFMgr，未验证）
- 用途：查机器配置，`e.type` 驱动「可自选」显示与文案

**L90366**
```js
for (var t = g.TrickLotteryModel.lotteryArr, e = 0; e < t.length; e++) if (c.getItem(t[e], "skill_Trick_Lotterymachine").type > 1) {
```
- 读：`lotteryArr`，`.length`，`t[e]`
- 守卫：**无**（循环条件直接 `.length`）
- 结论：**🔴 裸读**（`lotteryArr` 缺失 → `undefined.length` 抛 TypeError）
- 用途：列出限时池子按钮（`type > 1` 的才建按钮）

**L90374**
```js
g.TrickLotteryModel.lotteryId != t.node.tag1 && g.TrickLotteryModel.changeLotteryMachine(t.node.tag1);
```
- 读：`lotteryId`；守卫：无 → **🔴 裸读**（不抛）；用途：点池子切换

**L90381**
```js
return 1 == g.TrickLotteryModel.isFree;
```
- 读：`isFree`；守卫：无 → **🔴 裸读**（`1 == undefined` 为 false，不抛）；用途：`isHasFree()`，决定免费标与一次抽的价格分支

**L90384**
```js
return p.RoleBaseInfo.getItemNum(g.TrickLotteryModel.getTicketId());
```
- 读：`getTicketId()` → `lotteryData.trick_item`；守卫：无 → **🔴 裸读**；用途：票数显示

**L90401**
```js
return g.TrickLotteryModel.upSkills[this.index];
```
- 读：`upSkills`，下标 `[this.index]`；守卫：**无** → **🔴 裸读**（`upSkills` 缺失 → `undefined[i]` 抛 TypeError）；用途：取当前选中槽位的已学技能 id

**L90410**
```js
3 == c.getItem(g.TrickLotteryModel.lotteryId, "skill_Trick_Lotterymachine").type && (this.getSkill() <= 0 || g.TrickLotteryModel.checkIdxSwitchable(this.index)) && g.TrickLotteryModel.openOptionalTrickPool(this.index);
```
- 读：`lotteryId`；`checkIdxSwitchable` 内部读 `upSkills[t]`（90159）与 `optionalTimeMap.hasOwnProperty(o)`（90160）
- 守卫：`&&` 短路（条件是配置 type，不是字段存在性）→ **🔴 裸读**
- 用途：点顶部弹窗打开自选池

**L90441**
```js
this.changeSpriteMaterial(e, this.pools[t].tag1 != g.TrickLotteryModel.lotteryId);
```
- 读：`lotteryId`；守卫：无 → **🔴 裸读**（不抛）；用途：切换池后刷新所有池子高亮

**L90454**
```js
this.setSpriteFrame(t, "resources/GraspUI/" + g.TrickLotteryModel.getTicketId(), !0, null, e);
```
- 读：`getTicketId()` → `trick_item`；守卫：无 → **🔴 裸读**（`trick_item` 为 undefined 时拼成 `"resources/GraspUI/undefined"`）；用途：票图标资源名

**L90459**
```js
for (var t = 0; t < g.TrickLotteryModel.upSkills.length; t++) {
```
- 读：`upSkills.length`；守卫：**无** → **🔴 裸读**（缺 `skillArr` → TypeError）；用途：按槽位数生成 Toggle

**L90523 / L90528**
```js
this.index > g.TrickLotteryModel.upSkills.length - 1 && (this.index = 0);
this.index < 0 && (this.index = g.TrickLotteryModel.upSkills.length - 1);
```
- 读：`upSkills.length`；守卫：**无**（`&&` 左值先求 `.length`）→ **🔴 裸读**；用途：左右箭头循环切换槽位

**L90537**
```js
}) : 3 == c.getItem(g.TrickLotteryModel.lotteryId, "skill_Trick_Lotterymachine").type && g.TrickLotteryModel.openOptionalTrickPool(this.index);
```
- 读：`lotteryId`；守卫：无 → **🔴 裸读**（不抛）；用途：无已学技能时按配置 type 打开自选池

**L90549**
```js
var t = c.getItem(g.TrickLotteryModel.lotteryId, "skill_Trick_Lotterymachine");
```
- 读：`lotteryId`；守卫：无 → **🔴 裸读**（不抛；`t &&` 在 90550 才判 t 自身）；用途：说明文案

**L90583**
```js
e = "<outline color=#000000 width=2><color=#E8D73E>" + (e = e.replace(/\[1\]/, g.TrickLotteryModel.remainTimes.toString())) + "</color></outline>";
```
- 读：`remainTimes`（← 回包 `t`，90055），`.toString()`
- 守卫：**无** → **🔴 裸读**（`t` 缺失 → `remainTimes` 被赋成 undefined → `.toString()` 抛 TypeError）
- 用途：底部「剩余次数」富文本

**L90597**
```js
for (var e = !0, o = g.TrickLotteryModel.upSkills, i = 0; i < o.length; i++) o[i] > 0 && (e = !1);
```
- 读：`upSkills`，`.length`，`o[i]`
- 守卫：**无** → **🔴 裸读**（缺 `skillArr` → TypeError）；用途：判断是否所有槽位都已有技能

**L90616–90617**
```js
for (var t = g.TrickLotteryModel.machineEndTimeMap, e = 0; e < this.limitedTimePoolLayout.children.length; e++) {
var o = this.limitedTimePoolLayout.children[e], i = t[o.tag1] ? Math.floor(Math.max(t[o.tag1] - I.TimeMgr.getSTimestamp(), 0) / 1e3) : 0;
```
- 读：`machineEndTimeMap`，下标 `t[o.tag1]`（两次）
- 守卫：`if (x)` 真值守卫（三元 `t[o.tag1] ? … : 0`）—— 守卫的是**单个 key**，不守 `machineEndTimeMap` 本身
- 结论：**🔴 裸读**（缺 `eTime` → `machineEndTimeMap` 为 undefined，`t[o.tag1]` 抛 TypeError；仅当 `limitedTimePoolLayout` 有子节点时才走到）
- 用途：限时池子倒计时

**不回读回包的行（排除项）**：90341 `i.pic`、90342 `i.name`、90586 `[t.Floors_quality - 1]`、90550 `t.information` —— `i`/`t` 来自 `c.getItem(...)` 配置表；90450 `canGetAchievementReward()` 只读配置表与 `receivedRewards`；90347 `this.pools.push(...)`、90462 `customEventData` 为节点/UI 自身状态。

### 1.3 `this.data` / `data.xxx`

- 全量读过 90218–90646 每一行：**本模块没有任何 `this.data` / `data.xxx` 读点**（`TrickLotteryUI` 不用 `this.data` 承载回包；构造器 90246–90291 只初始化 UI 节点引用与 `index`/`pools`/`prefabMap`）。
- 对照：同文件其他 UI 大量使用 `this.data`（如 4326、8850），本模块没有。

### 1.4 模型层新增读点（不在「已确认字段」清单内）

- **90011**：`for (var n in s) t.lotteryData[n] = s[n];` —— 把 `upSkillRateData` 的键写成 `lotteryData` 的**动态键**（写点）。
- **90194**：`return this.lotteryData.trick_item;` —— `trick_item` 首次出现，读点（详见 1.1⑤）。
- 已确认部分（不重复摘，仅登记位置）：90052–90062 `lotteryId / lotteryArr / t / isFree / poolDateId / isRewardState / skillArr / eTime / optionalEndTimeMap / order`；90067、90072–90073。

---

## 二、TrickRateUI（90928–91084）字段读点

**L90979**
```js
var e = c.getItem(l.TrickLotteryModel.lotteryId, "skill_Trick_Lotterymachine");
```
- 读：`lotteryId`；守卫：无 → **🔴 裸读**（本行不抛）；用途：取配置 type → `this.typeId`（90980）

**L91002**
```js
var t = l.TrickLotteryModel.optionalCd, e = l.TrickLotteryModel.getOptionalCDTime(this.skillId), o = "";
```
- 读：`optionalCd`（← 回包 `order`，90062）；`getOptionalCDTime` 内部读 `optionalTimeMap.hasOwnProperty(t)` / `optionalTimeMap[t]`（90173）
- 守卫：外层 `if (3 == this.typeId && this.sTimer && !this.sBtn.active)`（91001）—— 条件是配置 type 与 UI 状态，**不覆盖字段存在性**
- 结论：**🔴 裸读**（`optionalCd` 为 undefined 时本行不抛；`optionalTimeMap` 缺失时 90173 的 `.hasOwnProperty` 抛 TypeError，因 `update` 每帧跑，type==3 时必现）
- 用途：自选技能 CD 倒计时文案（91003–91008）

**L91006**
```js
} else t >= 999 && (o = p.getText(6016218));
```
- 读：`optionalCd`（上行的 `t`）；守卫：无 → **🔴 裸读**（`undefined >= 999` 为 false，不抛）；用途：CD≥999 显示「已满/不可用」类文案

**L91026**（`setDes`，英文本地化分支）
```js
3 != this.typeId && (i = l.TrickLotteryModel.lotteryData.nextSkillArr).length >= 3 && (e = e + "\n" + (o = (o = (o = (o = p.getText(6000581)).replace(/\[1\]/, p.getText(c.getItem(i[0], "skill").Name))).replace(/\[2\]/, p.getText(c.getItem(i[1], "skill").Name))).replace(/\[3\]/, p.getText(c.getItem(i[2], "skill").Name))));
```
- 读：`lotteryData.nextSkillArr`，`.length`，`i[0]`/`i[1]`/`i[2]`
- 守卫：`&&` 短路 —— 左条件是 `3 != this.typeId`（配置），**不覆盖字段存在性**；`.length >= 3` 是取到数组**之后**的判断
- 结论：**🔴 裸读**（缺 `nextSkillArr` → `undefined.length` 抛 TypeError；走到本行即抛）
- 用途：拼接「下一个技能」描述（语言为英文时）
- 注：`i`、`o` 由函数内 `var o = "";`（91030）与 `var i;`（91032）提升为局部变量，不是隐式全局。

**L91033**（`setDes`，非英文本地化分支）
```js
(i = l.TrickLotteryModel.lotteryData.nextSkillArr).length >= 3 && (o = (o = (o = (o = p.getText(6000581)).replace(/\[1\]/, p.getText(c.getItem(i[0], "skill").Name))).replace(/\[2\]/, p.getText(c.getItem(i[1], "skill").Name))).replace(/\[3\]/, p.getText(c.getItem(i[2], "skill").Name)));
```
- 读：同上；守卫：外层 `if (3 != this.typeId) {`（91031）—— 配置分支，不覆盖字段存在性
- 结论：**🔴 裸读**（缺 `nextSkillArr` → TypeError）
- 用途：`nextDes` 文案

**L91043**
```js
return l.TrickLotteryModel.lotteryData[this.skillId.toString()];
```
- 读：`lotteryData` 的**计算键** `[skillId 字符串]`（`this.skillId` 由 `setData` 90996–90998 赋入，调用方 90535 传的是 `getSkill()` = `upSkills[index]`）
- 守卫：**无** → **🔴 裸读**（`lotteryData` undefined → TypeError；键不存在 → 返回 undefined）
- 用途：取该技能的各「招式组 → 概率」映射，供 `loadItems` 用

**L91054–91055**
```js
var t = this.getTrickGroups(), e = c.getItem(this.skillId, "skill");
for (var o in t) {
```
- 读：`getTrickGroups()` 的返回值（即 `lotteryData[skillId]`）
- 守卫：**无**（`for...in` 前无判空）
- 事实：`for...in` 的表达式为 `undefined`/`null` 时按 ECMAScript 规范**不迭代、不抛错**（ES2015 13.7.5.13 / 12.6.4：exprValue 为 null 或 undefined 直接返回），所以本行不是崩溃点；代价是列表为空
- 用途：遍历招式组，逐组生成一行

**L91059**
```js
i.getChildByName("rate").getComponent(cc.Label).string = (100 * t[o]).toString() + "%";
```
- 读：`t[o]`（该组概率值），`.toString()`
- 守卫：`for...in` 循环变量天然存在的键，**无单独守卫** → 键存在但值为 undefined 时 `NaN`（`.toString()` 不抛）
- 用途：概率百分比显示

**不回读回包的行**：90988（`typeId` 配置）、91004–91005（数值运算）、91020 `hasAchievement`、91021 `skillCanGetReward`（只读配置表 `skill_quality` / `receivedRewards`）、91046–91049 `getTable("skill_Trick")` 配置表、91057 `e.Name` 配置。

### TrickRateUI 的 `this.data`
- 全量读过 90928–91073：**无 `this.data` / `data.xxx` 读点**。`setData(t, e)`（90996–90999）只写 `this.skillId` / `this.upId`，不是回包对象。

---

## 三、`onePrice` / `tenPrice` / `trick_item` 完整用法

### 3.1 `onePrice`（单抽价格）

调用链：`onClickGetOne`（90403–90405）与 `showGetOne`（90558–90570，由 `refresh` 90588 调）。

```js
90403: e.prototype.onClickGetOne = function() {
90404: !this.isHasFree() && this.getTicketNum() < g.TrickLotteryModel.lotteryData.onePrice[1] ? this.showChargeTip() : g.TrickLotteryModel.reqLottery(1, this.getSkill());
90405: };
```
```js
90558: e.prototype.showGetOne = function() {
90559: var t = this.isHasFree();
90560: this.getOneFree.node.active = t;
90561: this.getOneIcon.active = !t;
90562: this.getOneNum.node.active = !t;
90563: if (!t) {
90564: this.setTicketSprite(this.getOneIcon);
90565: var e = g.TrickLotteryModel.lotteryData.onePrice[1];
90566: this.getOneNum.string = e.toString();
90567: var o = this.getTicketNum();
90568: this.getOneNum.node.color = o >= e ? cc.Color.WHITE : cc.Color.RED;
90569: }
90570: };
```
- 结构用法：**下标访问的容器**（`[1]`），本文件内只出现 `[1]` 一个下标；**从未读 `[0]`、从未读 `.length`、从未遍历**（全 `tools` 目录 grep `onePrice` 共 7 处命中，另 5 处 98168/98194/98195/98215/98222 属别的模块 `AutoDailyTask.cost`，与此无关）。
- `[1]` 被当作：一个**数值型价格**——与 `getTicketNum()` 比大小（90404、90568），并直接 `.toString()` 显示（90566）。
- `[0]` 代表什么、数组长度多少：**本文件无读点**，无法从代码判定。

### 3.2 `tenPrice`（十连价格）

```js
90406: e.prototype.onClickGetTen = function() {
90407: this.getTicketNum() < g.TrickLotteryModel.lotteryData.tenPrice[1] ? this.showChargeTip() : g.TrickLotteryModel.reqLottery(2, this.getSkill());
90408: };
```
```js
90571: e.prototype.showGetTen = function() {
90572: this.setTicketSprite(this.getTenIcon);
90573: var t = g.TrickLotteryModel.lotteryData.tenPrice[1];
90574: this.getTenNum.string = t.toString();
90575: var e = this.getTicketNum();
90576: this.getTenNum.node.color = e >= t ? cc.Color.WHITE : cc.Color.RED;
90577: };
```
- 结构用法：同 `onePrice`，只读 `[1]`，无数值以外用法。
- 与 `onePrice` 的差别（事实）：`showGetTen` 里**没有** `isFree` 分支，`refresh()`（90578–90590）无条件调用 `showGetTen`（90589）；`refresh` 在 `onLoad` 90329 就被调。即 UI 打开即读 `tenPrice[1]`；`onePrice[1]` 只在「非免费」时被读（90563 的 `if (!t)`）。

### 3.3 `trick_item`（抽奖券道具 id）

```js
90193: t.prototype.getTicketId = function() {
90194: return this.lotteryData.trick_item;
90195: };
```
```js
90326: this.addButtonListen(this.btnGetOne, this, this.onClickGetOne);
90327: this.addButtonListen(this.btnGetTen, this, this.onClickGetTen);
90328: this.setTicketSprite(this.ticketIcon);
90329: this.refresh();
90330: var o = v.UserModel.getPlayerRole();
```
```js
90383: e.prototype.getTicketNum = function() {
90384: return p.RoleBaseInfo.getItemNum(g.TrickLotteryModel.getTicketId());
90385: };
```
```js
90452: e.prototype.setTicketSprite = function(t) {
90453: var e = cc.assetManager.getBundle("skillGrasp");
90454: this.setSpriteFrame(t, "resources/GraspUI/" + g.TrickLotteryModel.getTicketId(), !0, null, e);
90455: };
```
- 结构用法：**标量**，不做下标、不做 `.length`、不遍历。被当作两样东西：① 道具 id 传给 `RoleBaseInfo.getItemNum(...)` 取持有数（90384，`refresh` 90579 与 `getTicketNum` 90404/90407/90567/90575 都走这里）；② 图标资源名拼 `"resources/GraspUI/" + id`（90454）。
- 调用点：90328（onLoad，先于 `refresh`）、90564 与 90572（`setTicketSprite`）、90384（`getTicketNum`）。
- `trick_item` 缺失时：90194 返回 `undefined`，本行不抛；字符串拼接得 `"resources/GraspUI/undefined"`；`RoleBaseInfo.getItemNum(undefined)` 的返回值在 `scripts.js`（本次范围外），**未验证**。

---

## 四、`.length` / `.toString()` / 下标 `[...]` / `for...in` 作用在回包字段上的全部位置

| # | 位置 | 原文片段 | 作用对象 | 形态 | 守卫 |
|---|---|---|---|---|---|
| 1 | scripts3.js:90366 | `e < t.length` | `lotteryArr` | `.length` | 🔴 无 |
| 2 | scripts3.js:90401 | `upSkills[this.index]` | `skillArr`→`upSkills` | 下标 | 🔴 无 |
| 3 | scripts3.js:90404 | `lotteryData.onePrice[1]` | `onePrice` | 下标 `[1]` | `&&`（条件为 isFree，不覆盖字段） |
| 4 | scripts3.js:90407 | `lotteryData.tenPrice[1]` | `tenPrice` | 下标 `[1]` | 🔴 无 |
| 5 | scripts3.js:90459 | `upSkills.length` | `skillArr` | `.length` | 🔴 无 |
| 6 | scripts3.js:90523 | `upSkills.length - 1` | `skillArr` | `.length` | 🔴 无 |
| 7 | scripts3.js:90528 | `upSkills.length - 1` | `skillArr` | `.length` | 🔴 无 |
| 8 | scripts3.js:90565 | `lotteryData.onePrice[1]` | `onePrice` | 下标 `[1]` | `if (!isFree)` |
| 9 | scripts3.js:90566 | `e.toString()` | `onePrice[1]` | `.toString()` | 同 #8 |
| 10 | scripts3.js:90573 | `lotteryData.tenPrice[1]` | `tenPrice` | 下标 `[1]` | 🔴 无 |
| 11 | scripts3.js:90574 | `t.toString()` | `tenPrice[1]` | `.toString()` | 🔴 无 |
| 12 | scripts3.js:90583 | `remainTimes.toString()` | `t`→`remainTimes` | `.toString()` | 🔴 无 |
| 13 | scripts3.js:90597 | `o.length`、`o[i]` | `skillArr` | `.length` + 下标 | 🔴 无 |
| 14 | scripts3.js:90616–90617 | `t[o.tag1]`（2 次） | `eTime`→`machineEndTimeMap` | 下标（key 为池子 id） | 🔴 无（仅对 key 做三元真值判断） |
| 15 | scripts3.js:91026 | `nextSkillArr).length >= 3`、`i[0]`/`i[1]`/`i[2]` | `nextSkillArr` | `.length` + 下标 | `&&`（条件为 typeId，不覆盖字段） |
| 16 | scripts3.js:91033 | 同上 | `nextSkillArr` | `.length` + 下标 | `if (3 != typeId)` 外层分支 |
| 17 | scripts3.js:91043 | `lotteryData[this.skillId.toString()]` | `lotteryData` 动态键 | 下标 + `.toString()`（作用在局部 skillId 上） | 🔴 无 |
| 18 | scripts3.js:91055 | `for (var o in t)` | `lotteryData[skillId]` 映射 | `for...in` | 🔴 无（但对 undefined 不抛，见二节说明） |
| 19 | scripts3.js:91059 | `(100 * t[o]).toString()` | 同上映射的值 | 下标 + `.toString()` | 循环键，无独立守卫 |
| 20 | scripts3.js:90011 | `for (var n in s) t.lotteryData[n] = s[n];` | `upSkillRateData`（写点，写进 `lotteryData`） | `for...in` + 下标写 | 无（`1 == o.eRet` 之外无判空） |
| 21 | scripts3.js:90067 | `this.lotteryDatas[e.lotteryId] = e;` | `lotteryId`（写点，作 key） | 下标写 | 无 |
| 22 | scripts3.js:90072 | `if (this.lotteryDatas[t])` | `lotteryDatas` | 下标读 | `if (x)` 真值守卫 |
| 23 | scripts3.js:90194 | `this.lotteryData.trick_item` | `trick_item` | 属性读 | 🔴 无 |

---

## 五、汇总表（字段 → 读点 → 守卫类型 → 用途）

| 字段（回包成员） | 读点（scripts3.js:行号） | 守卫类型 | 用途 |
|---|---|---|---|
| `lotteryId` | 90339、90355、90374、90410、90441、90537、90549、90979；模型赋值 90052；作 key 90067 | 🔴 裸读（属性读不抛；后续 `c.getItem(lotteryId,…)` 在 CFMgr） | 查机器配置（type/pic/name/information/Floors_quality）、池子切换、高亮比较 |
| `lotteryArr` | 90366 | 🔴 裸读（`.length`） | 枚举限时池子 |
| `t`（→`remainTimes`） | 90583 | 🔴 裸读（`.toString()`） | 剩余次数富文本 |
| `isFree`（→`isFree`） | 90381 → 90404/90559/90563 | 🔴 裸读（比较不抛） | 免费标、单抽是否走充值提示 |
| `skillArr`（→`upSkills`） | 90401、90459、90523、90528、90597；90159 | 🔴 裸读（下标/`.length`） | 槽位技能 id 列表：取当前技能、生成 Toggle、循环切换 |
| `eTime`（→`machineEndTimeMap`） | 90616–90617 | 🔴 裸读（只对单个 key 做真值判断） | 限时池倒计时 |
| `trick_item` | 90194（← 90328/90384/90454） | 🔴 裸读（`lotteryData` 缺则抛；字段缺则 undefined 下传） | 抽奖券道具 id：票数、图标 |
| `onePrice` | 90404、90565（+90566） | `&&` / `if (!isFree)`（均不覆盖字段存在性） | 单抽价格：票数比较、显示、颜色 |
| `tenPrice` | 90407、90573（+90574） | 🔴 裸读（两处都无字段级守卫） | 十连价格：票数比较、显示、颜色 |
| `nextSkillArr` | 91026、91033 | `&&` / `if`（条件是 `typeId`，不覆盖字段） | 下个技能描述（3 个技能 id 取配置名） |
| `lotteryData[skillId]`（动态键） | 91043 → 91055、91059；写 90011 | 🔴 裸读（键存在性无守卫） | 招式组→概率映射，概率列表 |
| `order`（→`optionalCd`） | 91002、91006 | 🔴 裸读（数值比较） | 自选技能 CD 文案 |
| `optionalEndTimeMap`（→`optionalTimeMap`） | 经 `getOptionalCDTime` 91002 → 90173；另 90160、90168 | `hasOwnProperty` 守卫（**但 `optionalTimeMap` 本身为 undefined 时 `.hasOwnProperty` 先抛**） | 自选 CD 时间查询 |
| `poolDateId`（→`poolId`） | 本两 UI **无读点**（模型 90057 写入） | — | 本两 UI 不使用 |
| `isRewardState` | 本两 UI **无读点**（90058 写入 `LotteryRebateModel.hasCanTask`，UI 读 90378 的是模型字段） | — | 返利红点（经另一模型字段） |

**事实备注（模型构造函数初始值，89986–90000）**：`remainTimes = 10`、`isFree = 0`、`poolId = 1`、`lotteryDatas = {}`、`lotteryId = 0`、`lotteryArr = []`、`upSkills = []`、`machineEndTimeMap = {}`、`optionalTimeMap = {}`、`optionalCd = 0`、`isDefaultLottery = !1`、`hasRewards = {}`、`achievementLv = 5`、`receivedRewards = {}`、`achievementNeedNum = 5`。注意 `lotteryData` **没有**在构造器里初始化；`setVariable`（90052–90062）用回包值直接覆盖上述字段，字段缺失时覆盖结果为 `undefined`。

---

# 未能验证

1. `onePrice[0]` / `tenPrice[0]` 的含义与数组长度：全 `tools` 目录仅 `[1]` 有读点，无 `.length`、无遍历，无法从代码判定。
2. `nextSkillArr` 的元素语义（是否为 skill id）：91026/91033 把 `i[0..2]` 直接传给 `c.getItem(…, "skill")`，元素类型只能从用法反推，回包定义未验证。
3. `lotteryData[skillId]` 动态键的来源：90011 只证明 `upSkillRateData` 的键会并入 `lotteryData`；GET 回包本身是否也带 `skillId` 键，本文件无法证明。
4. `lotteryData` 首次可用时机：`TrickLotteryUI` 唯一实例化点是 `scripts2.js:8765`（`onShowLotteryData`），其事件注册在 `scripts2.js:8388` —— 监听 `EvName.GET_DEFAULT_TRICK_LOTTERY_DATA`，而该事件在 90068 收到成功回包后才派发。因此正常路径下 `lotteryData` 在 UI 构造前已赋值；**但** `reqData(0)` 会先清空缓存（90045–90046：`isDefaultLottery` 为 true 时 `this.lotteryDatas = {}`，`lotteryData` 本身不清），在这类重取窗口内若又打开 UI 是否会拿到旧包/空包，未逐条追踪。
5. `c.getItem(undefined, …)`、`RoleBaseInfo.getItemNum(undefined)`、`setSpriteFrame(…/undefined)` 的具体行为：分别在 CFMgr / RoleBaseInfo / UIComponent（`scripts.js`，本次范围外），未验证。
6. `3 != this.typeId` 的 `typeId` 来自配置 `c.getItem(lotteryId, "skill_Trick_Lotterymachine").type`（90979–90980），当 `lotteryId` 为 undefined 时该链路的实际结果未验证。
7. `for...in` 对 `undefined` 不抛错这一点按 ECMAScript 规范判定，未在本工程运行时实测。

# 范围外发现

1. `scripts2.js:8765` `onShowLotteryData()` 加载 `prefabs/TrickLottery/TrickLotteryUI` 并 `t.childNode.addChild(i)`；事件注册在 `scripts2.js:8388`（`GET_DEFAULT_TRICK_LOTTERY_DATA`），注销 8404。
2. `scripts2.js:8670` `t.TrickLotteryModel.reqData();`（商店页逻辑里发起默认包请求，异步，仅发起）。
3. `index.js:131068–131073` `openTrickLotteryShop()` 实际只是 `reqStoreList({type: 9, back: 1})`，不直接开抽奖 UI。
4. 同族 UI 亦读同一包：`OptionalTrickPoolUI` 56466（`optionalCd`）、56483（`checkIdxSwitchable`/`checkSkillSwitchable`）、56493（`getTypeSkills`）；`OptionalChooseWarn.warnSkill` 56290（`optionalCd`）；`TrickAchievementUI` 89384–89386（`load("…/TrickRateUI")` 后 `setData(t.skillId)` **只传一个参数** → `upId` 为 undefined）；`TrickPoolRecordUI` 90713（`a.TrickLotteryModel.history`）；`TrickRewardUI` 由 90090–90094 用 `KNACK_LOTTERY` 回包直接 `setData(e)`。
5. `TrickLotteryModel.onLottery`（90084–90096）在抽奖回包里另读 `e.t`、`e.isFree`、`e.isRewardState`、`e.skillId`（写 `TrickExModel.wishSkillId`）；`onGetReward` 90027–90032 读 `e.achievementReward` / `e.rewardArray`；`onGetHistory` 90037–90041 读 `e.history`。这三处不在「两个 UI」范围内。
6. 同文件 98168/98194/98195/98215/98222 另有 `onePrice` 同名成员（由 98194 `c.getItem(this.data[1], "AutoDailyTask").cost` 赋值，属该 UI 的局部变量），与摸奖回包无关。

**回包必需字段集合 = { lotteryData 整包对象, t, skillArr, lotteryArr, tenPrice, onePrice, eTime（有子池时才触发）, nextSkillArr（TrickRateUI 且 typeId≠3）, optionalEndTimeMap（type==3 的 CD 查询走 hasOwnProperty，缺了先抛 TypeError） }（按裸读优先）；缺了不会崩、只是显示/逻辑退化的：poolDateId、isRewardState（本两 UI 根本不读）、order（undefined 参与数值比较恒为 false）、isFree（比较得 false）；trick_item 属"不直接抛 TypeError、但会把 undefined 传进下游（票数/图标）"的一类。**
