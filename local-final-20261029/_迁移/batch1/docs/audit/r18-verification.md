# R18 审阅的复核记录（2026-10-23）

> 目的：把 R18（`docs/sota/inbox/` 那封，原件 `R18-审阅.docx`）里**可以静态判定**的每一条，用本仓原文证据判真伪。
> 结论摘要见 `docs/sota/outbox/26-R19-r18-landed.txt`。本文件只放证据，不做方案判断。
> 基线：`node tools\acceptance.js` → 开始时 **项=35 绿=35 已知红=0 cap=0**；本批三项修完 → **项=38 绿=38 已知红=0 cap=0，退出码 0**（新增 `r18-titleobj-projection` / `r18-skch-lv0` / `r18-unreachable`）。
> 部署：`impl=h84faae07` → 本批落地后 **`impl=hc1455196`**，`pid 29928`（热重载未重启），`selfCheck passed=1242 / failed=[] / missingRequired=[]`，`scene=gamescene`。
> 回滚位：`_backup\2026-10-23-0326-pre-r19\`（`bz-rpc-server.js` / `bz-shapes.generated.js` / `handlers.js.prebuild` + `MD5SUMS.txt`）。

---

## 0. 本轮派工与复跑

| 工人 | 档次 | 任务 | 产物 | 主审复跑 |
|---|---|---|---|---|
| W1 | gemini-3.8-flash-low（只读） | 三包符号扫描（numDeaths/titleObj/titles/REWARD_ITEM/ConsultUI/studyData/upgradeSkill/ITEMSCH） | `docs/audit/r18-W1-symbol-scan.txt` | ✅ 抽 `titleObj`（1 命中）、`numDeaths`（40 行）两项，与主审 grep 一致 |
| W2 | 同上 | 跑 `$out\r18\gift_scan2.js` 并落盘 | `docs/audit/r18-W2-gift-table-scan.txt` | ✅ 抽「B. 分支判定」四行，与主审输出逐字一致 |
| W3 | 同上 | 跑 `node tools\acceptance.js` | `docs/audit/r18-W3-acceptance.txt` | ✅ 退出码 0 / 35 绿 / 无失败 |

---

## 1. R18 A1 被推翻：`case 11` 是 `break`，不是 `return !0`

R18 §3 与假设 A1 的核心前提是「64417 之后 `case 11` 是 `return !0`，所以 Effect 11 从不经过 65333 发 USE_ITEM」。
**原文是 `break`**：

```
tools/index.js:64316  e.prototype.useItem = function(e, o) {
tools/index.js:64321  if (2 == e.Type) switch (e.Effect) {
tools/index.js:64382  case 11:
tools/index.js:64383  var b = i.getItem(e.ID, "master_book"), T = h.SkillTable.getSkillItem(e.Data1), C = T ? b.ConditionUp : b.Condition;
tools/index.js:64413  p.default.prefabs.load("skillsUI/ConsultUI", cc.Prefab, function(t, o) {
tools/index.js:64416  i.addComponent("ConsultUI").studyData(e.ID, k);
tools/index.js:64418  break;            ← 不是 return !0
tools/index.js:64502  }
tools/index.js:64503  return !1;        ← useItem 的"未在本地处理"出口
```

调用方（背包面板的"使用"按钮）：

```
tools/index.js:65499  e.prototype.itemUsePopLayer = function(e) {
tools/index.js:65500  var o = this, r = i.getItem(e.itemId, "item");
tools/index.js:65501  if (!d.InventoryDB.useItem(r)) if (1==r.Effect||2==3==4==47==19==32==34) …ChooseItemUI…
tools/index.js:65535  } else { … 65553: this.useItemFunc(e.itemId, r.Effect, 1); }
tools/index.js:65264  e.prototype.useItemFunc = function(e, o, r, s) { … 65273 f={itemID,itemNum} … 65333 sendRequest(USE_ITEM, f)
```

`useItem()` 返回 `!1` ⇒ `!useItem()` 为真 ⇒ 进入分支；Effect 11 不在 65501 的名单里、不命中 9/61/27/35/41/62 ⇒ 落到 65553 ⇒ **USE_ITEM 请求确实发出**，同时 ConsultUI 弹出。
⇒ **Effect 11 会发 `useItem`。R18 的「可能是死代码」不成立；反例 4 与 A1 失效。**

---

## 2. R18 Q2 的闭合：ConsultUI 在 `scripts2.js`，确认时发的是 `User.upgradeSkill`

R17 卡点是「`ConsultUI` 不在 `index.js`，grep 只命中两处调用」。**它在 `tools/scripts2.js`（skillsUI 分包，行 13680–14140）**：

```
scripts2.js:13994  e.prototype.studyData = function(t, e) {   // t = 书的 itemID（64416 传 e.ID）
scripts2.js:13995    this.type = 1;
scripts2.js:13996    this.teacher = t;
scripts2.js:13997    this._itemDataList = e;                   // [ {id, lv, pgr, brlv?, selected} ]
scripts2.js:13868  e.prototype.onLearnSkill = function(t, e) {   // 点"学习/升级"
scripts2.js:13872    if (d.SkillTable.isSkillLearned(i)) { … this.skillItem={pgr,lv,brlv}; this.checkCanUpgrade(i) && … this.LearnSkill(e)
scripts2.js:13846  e.prototype.LearnSkill = function(t) {
scripts2.js:13848    if (o.pgr >= c) { … this.sendUpgradeReq(e, { lv: o.lv + 1, pgr: o.pgr - c, brlv: o.brlv }); }
scripts2.js:13904  else { e.lv = 1; … this.sendUpgradeReq(i, { lv: 1, pgr: 0, brlv: 1 }); }   // 未学会分支
scripts2.js:13923  e.prototype.sendUpgradeReq = function(t, e) { … 13927 h.SkillModel.reqChangeSkillLv(t, e.lv, e.pgr, e.brlv, this.teacher, this.type);
index.js:119873    t.prototype.reqChangeSkillLv = function(t, e, o, i, a, s) {
index.js:119874      var l = { skillID: t, skillArr: [ e, Math.floor(o), i ], NPCID: a, flag: s };
index.js:119880      r.NetMgr.http.sendRequest(n.HttpConst.UPGRADE_SKILL_LV, l);    // 59581 UPGRADE_SKILL_LV = "User.upgradeSkill"
```

⇒ 书的升级请求 = `User.upgradeSkill{skillID, skillArr:[目标lv, 剩余pgr, brlv], NPCID=<书的itemID>, flag=1}`。
封顶在客户端本地：`scripts2.js:14045 e.lv >= c.maxSkillLevel`（GlobalData）与 `14054 SkillUpgradeModel.getSkillTopLevel(t)`，超限只弹提示、不发请求。

我方现状（`hotfix-patch/core/bz-rpc-server.js:1213-1259`）：读 `skillID` / `skillArr`，**忽略 `NPCID` / `flag`，不扣书，不读 `level` 表封顶**；"等级不变"分支会把 `skills[id]` 写成 `[curLv, pgr, brlv]`。

---

## 3. R18 §1-2 成立：称号（`s.titles`）重启必丢——LoadGame 没有把账本投射进 `titleObj`

```
index.js:111919  n.AchieveModel.setAchieveData(e.hasOwnProperty("titleObj") ? e.titleObj : {});
```

`111919` 位于 LoadGame 应答处理里（同段还有 `111798 baseValueAy[41]`、`111916 titivateObj`、`111897 hpLimit`）。
全仓 `titleObj` 在**代码**里只有这 1 处（W1 扫描 + 主审复跑一致）。

⚠ **一条更正（我们自己的测试抓出来的）**：`core/templates.json → create.titleObj = {"e":0}`。
抓包真值里本来就有这个键 ⇒ LoadGame **确实回** `titleObj`，但里面只有 `{e:0}`（`e` = 当前佩戴的称号，`index.js:627`）。
所以缺的不是"字段没发"，而是"**账本里的称号从没被投射进来**"。修法因此必须是"在模板对象上补数字键"，
不能整个替换（替换会抹掉 `e`）。

我方：
```
hotfix-patch/core/bz-rpc-server.js:2095  if (giveTitleId) { s.titles = s.titles || {}; s.titles[String(giveTitleId)] = 1; }
hotfix-patch/core/bz-rpc-server.js:1033  LoadGame: function () { … }
```
`LoadGame` 组装里**没有** `s.titles → base.titleObj` 的投射；`grep titleObj hotfix-patch\core\bz-shapes.generated.js` **0 命中**。
实测存档（`adb pull … bz_offline_save.json`）：`titles = undefined`（还没用过 7027），背包 `7027: 1`。
⇒ **反例 2 是可复现的真 bug**：用掉 7027 之后 `s.titles={2045:1}` 只在服务端，重启后 `AchieveModel` 拿到 `{e:0}`。

**本批已修**（`bz-rpc-server.js` LoadGame 内，`env.log('LoadGame → 快照…')` 之前）：账本 `1`（永久）→ 客户端口径 `0`；
`>1` 原样（到期 ms）；非数字键过滤。回归 `hotfix-patch/test/r18-titleobj-projection.js` 4 条全绿。
值口根据（四个读点）：`index.js:635 getAchieveEndT` / `638 deleteTitle` / `673 checkTitleBuff` / `658 showTitleReward`。

---

## 4. R18 §1-3 成立：`skch` 的 `lv=0` 确有一条我方自己会走的写入路径

```
hotfix-patch/core/bz-rpc-server.js:1216  var cur = s.skills[id];  var curLv = Array.isArray(cur) ? (cur[0]||0) : (cur||0);
hotfix-patch/core/bz-rpc-server.js:1225  var lv = Math.max(curLv, reqLv || 0);
hotfix-patch/core/bz-rpc-server.js:1236  if (gained <= 0) { … 1242 s.skills[id] = [curLv, keptPgr, keptBrlv]; … 1246 kept.skch[id] = [curLv, keptPgr, keptBrlv]; }
```
未知技能 + 目标等级 0 ⇒ `curLv=0`、`gained=0` ⇒ 写出 `skills[id]=[0,…]` 且 `skch[id]=[0,…]`。
客户端 `index.js:119832 s.SkillTable.setSkill(n, e[o][0])` 不过滤 0，而 `120070 getSkillItem` 只判 `hasOwnProperty` ⇒ 该技能此后被 Effect 5 判"已学会"、被 Effect 11 拿 `lv=0` 走 ConditionUp。

---

## 5. R18 §4③：3020（Effect 15）**unreachable 成立**，且物品不会被扣

`case 15` 拦截条件读的是 `v.numDeaths`（`v = playerInfo.entity`）：

```
index.js:64423  case 15:
index.js:64424  if (0 == v.numDeaths) { s.default.show(n.getText(4374)); return !0; }
index.js:64428  break;
```

`numDeaths` 的唯一数据来源是 `baseValueAy[41]`：
```
index.js:111674  v.RoleBaseInfo.numDeaths = 0;                       // 登录时先清零
index.js:111798  v.RoleBaseInfo.numDeaths = t.baseValueAy[41];        // LoadGame 覆盖
index.js:70454   I.RoleBaseInfo.numDeaths = e.baseValueAy[41];        // 另一条属性同步
index.js:70987   t.push(I.RoleBaseInfo.numDeaths);                    // 上传（baseValueAy[41]）
```

实测（`.\run.ps1 cmd "state"` + `adb pull` 双证一致）：`baseValueAy[41] = 0`（number）。
我方服务端：`grep numDeaths hotfix-patch\**` → **0 命中**；`grep "baseValueAy\[4[0-9]\]" bz-rpc-server.js` → **0 命中**（没有任何写点）。
⇒ `0 == 0` 恒真 ⇒ 客户端本地 `return !0` 拦截，**不发请求、不扣物品**（存档 `3020: 17` 与本轮前后一致）。
⇒ **exitCheck 可执行形式**：`grep -c numDeaths hotfix-patch` 必须恒为 0，且 `baseValueAy[41]` 必须恒为 0；任一越界即 FAIL。

---

## 6. R18 §2①：F1 字面不可满足，且 442 张表里没有礼包表

`item.full.json`（6525 行）实测：`Effect == 13` 共 **1780 件**，其 `Data1` 覆盖 1780 个不同 id。
`442 + item.full.json` 里 **没有一张表的键集能同时容下这 1780 个键** ⇒ R18 的 F1 字面判据筛出空集（不是"很多表"，是 0 张）。

逐 id 定位（`$out\r18\gift_scan2.js`，输出 `docs/audit/r18-W2-gift-table-scan.txt`）：

| id | 把它当键的表 | 那些行的奖励样字段 |
|---|---|---|
| 6625 | `item`(3000 键) | `icon_item`(n=1,known=0)、`box_condition`(n=1,known=0) |
| 6810 | `item`、`lh_temporary`(64 键) | `item` 同上；`lh_temporary` 行 = `{"id":6810,"main":1,"icon":"lh_17"}` 无奖励 |
| 7105 | **0 张** | — |
| 7106 | **0 张** | — |
| 7226 | **0 张** | — |

`decrypted/` 里 5 个含 `rewardArray` 的应答全是 `getFinishTaskAward` / `CheckBattleResult`，**没有一条 useItem 抓包**。
⇒ 这正是 R18 A4 的分支：442 表内挑不出礼包表、也没有抓包 ⇒ 只能登记"待判"，不得凭空构造礼包内容。
⚠ 未验证：442 是否等于客户端 `ConfigMgr` 的全部表数（需要探针 `getTable` 全名单；本轮没跑）。

### 6.1 R18 §2③ 的辅助证据不成立

```
item.full.json → 4567: {"ID":4567,"Name":33567,"Type":2,"Effect":23,"Data1":0}
```
R18 推测「4567 若也是 Effect 13 且 Data1=4567，则支持键=Data1」。**实际 4567 是 Effect 23、Data1=0**，该辅助证据反向不成立。
四分支执行结果：`有键 6810 的表 = item, lh_temporary`；`有键 4567 的表 = buff, item, lh_temporary`；`只有 4567 的表 = buff`（BUFF 表，与礼包无关）；`只有 6810 的表 = 无`。
⇒ "两个都有"的两张表都不是礼包表，无法据此判键。

---

## 7. R18 §2② 前提一：`REWARD_ITEM` 的唯一监听者是背包面板 UI，不写模型

```
scripts2.js:36129  l.MessageCenter.on(B.EvName.REWARD_ITEM, this.updateItemFunc, this);     // 背包面板 addEventListeners
scripts2.js:36142  l.MessageCenter.off(B.EvName.REWARD_ITEM, this.updateItemFunc, this);
scripts2.js:43425  l.MessageCenter.dispatch(p.EvName.REWARD_ITEM, t);
index.js:45203     REWARD_ITEM: "rewardItem",
index.js:64774     r.MessageCenter.dispatch(s.EvName.REWARD_ITEM, g);     // useItem 成功回调内
index.js:64958     r.MessageCenter.dispatch(s.EvName.REWARD_ITEM, o);
```
`updateItemFunc` 体（`scripts2.js:36723` 起，长度 ~20 行）只做：命中 `this._itemDataList` 里同 `itemId` 的项 → `numbers += parseInt(...)`；否则按 `effectcategory` 决定是否 `unshift`；末尾 `this.needUpdate = !0`。
**全程不碰 `RoleBaseInfo` / `PackageModel`** ⇒ 不会与服务端的绝对值 `note.ivch` 叠加。
⚠ 未验证：`_itemDataList` 是否是模型引用（若它是引用，UI 里的加法仍可能与 ivch 结果不一致；按 `divisionItem` 每次重建的写法，倾向缓存副本）。

---

## 8. R18 §1-1 的附加边界：10 位秒级窗口

`core/templates.json → create.activityResource = {"67":[null,1793177770630]}`，`create.serverTime = 1792572970629`。
递归取值实测：**数字项只有 1 个**（`ar.67.1 = 1793177770630`），10 位秒级（1e9..1.6e12）**0 个**，≥1.6e12 **1 个**。
⇒ R18 说的"10 位秒级不会被平移"这条**在本快照上是空集**（不触发），但边界本身成立（`rebaseActivityWindows` 只动 >1.6e12）。
⇒ 另外 `[0] = null`：活动 67 没有开始时间，"抓包时尚未开始的活动永远差 Δ"这条在本快照上也不适用。

```
