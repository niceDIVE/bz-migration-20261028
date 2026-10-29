# scoutF-c07 客户端动作摘录报告（善恶玩法 11 键）

范围：tools/index.js、tools/scripts2.js、tools/scripts3.js
方法：grep 定位 → read 小段 → 逐行摘录原文（文件:行号）。只摘录，不判断。

## HttpConst 定义行（index.js）

- index.js:60434 `GET_GOOD_AND_EVIL_TASK_DATA: "User.getGoodAndEvilTaskData",`
- index.js:60435 `REFRESH_GOOD_AND_EVIL_TASK_DATA: "User.refreshGoodAndEvilTaskData",`
- index.js:60436 `GET_GOOD_AND_EVIL_NOTE_DATA: "User.getGoodAndEvilNoteData",`
- index.js:60439 `GET_GOOD_AND_EVIL_NPC_DATA: "User.getGoodAndEvilNpcData",`
- index.js:60440 `REFRESH_GOOD_AND_EVIL_NPC_DATA: "User.refreshGoodAndEvilNpcData",`
- index.js:60446 `GET_GOOD_AND_EVIL_RANK_DATA: "User.getGoodAndEvilRankData",`
- index.js:60447 `HELP_DONE_TASK: "User.helpDoneTask",`
- index.js:60448 `GET_GE_HELP_INFO: "User.getGeHelpInfo",`
- index.js:60449 `GET_GOOD_AND_EVIL_DATA: "User.getGoodAndEvilData",`
- index.js:60450 `GET_GOOD_AND_EVIL_RETIRE_LIST: "User.getGoodAndEvilRetireList",`
- index.js:60451 `GET_GOOD_AND_EVIL_RETIRE_DATA: "User.getGoodAndEvilRetireData",`

注册点全部集中在 scripts3.js 的同一 init（scripts3.js:36345-36366）。请求点全部走 `l.NetMgr.http.sendRequest`（sendReqWithMask 与这 11 键零交集：grep `sendReqWithMask` scripts3.js 命中 32 处，无一为这 11 键）。scripts2.js grep `HttpConst\.(GET_GOOD_AND_EVIL|REFRESH_GOOD_AND_EVIL|GET_GE_HELP_INFO|HELP_DONE_TASK)`：0 命中。

## GET_GOOD_AND_EVIL_TASK_DATA → User.getGoodAndEvilTaskData

1. HttpConst 定义行
- tools/index.js:60434 `GET_GOOD_AND_EVIL_TASK_DATA: "User.getGoodAndEvilTaskData",`
2. 注册点（MessageCenter.on）
- tools/scripts3.js:36347 `p.MessageCenter.on(c.HttpConst.GET_GOOD_AND_EVIL_TASK_DATA, this.onGetPlayerData, this);`
3. 请求点
- tools/scripts3.js:36700-36702 `t.prototype.getPlayerData = function() {` / `l.NetMgr.http.sendRequest(c.HttpConst.GET_GOOD_AND_EVIL_TASK_DATA);` / `};`
- 请求参数对象字面量：无（无第二参）。
4. 应答消费回调（onGetPlayerData，scripts3.js:36703-36719）
- 36704 `if (1 == e.eRet) {`
- 36705 `this.playerTargets = e.targetArrData;`
- 36706 `this.buyTokenRemainTime = e.secretNum;`
- 36707 `this.playerRemainTime = Math.max(e.maxNum - e.curNum, 0);`
- 36708 `this.isHaveHate = e.noteNum > 0;`
- 36709 `this.isHaveNewHate = e.isNoteRed;`
- 36710 `this.myScore = e.score;`

## REFRESH_GOOD_AND_EVIL_TASK_DATA → User.refreshGoodAndEvilTaskData

1. HttpConst 定义行
- tools/index.js:60435 `REFRESH_GOOD_AND_EVIL_TASK_DATA: "User.refreshGoodAndEvilTaskData",`
2. 注册点
- tools/scripts3.js:36348 `p.MessageCenter.on(c.HttpConst.REFRESH_GOOD_AND_EVIL_TASK_DATA, this.onRefreshPlayerData, this);`
3. 请求点
- tools/scripts3.js:36690-36692 `t.prototype.refreshPlayerData = function() {` / `l.NetMgr.http.sendRequest(c.HttpConst.REFRESH_GOOD_AND_EVIL_TASK_DATA);` / `};`
- 请求参数对象字面量：无。
4. 应答消费回调（onRefreshPlayerData，scripts3.js:36693-36699）
- 36694 `if (1 == e.eRet) {`
- 36695 `this.playerTargets = e.targetArrData;`
- 36696 `this.lastRefreshTime = s.TimeMgr.getSTimestamp();`

## GET_GOOD_AND_EVIL_NOTE_DATA → User.getGoodAndEvilNoteData

1. HttpConst 定义行
- tools/index.js:60436 `GET_GOOD_AND_EVIL_NOTE_DATA: "User.getGoodAndEvilNoteData",`
2. 注册点
- tools/scripts3.js:36349 `p.MessageCenter.on(c.HttpConst.GET_GOOD_AND_EVIL_NOTE_DATA, this.onGetHateData, this);`
3. 请求点
- tools/scripts3.js:36679-36681 `t.prototype.getHateData = function() {` / `l.NetMgr.http.sendRequest(c.HttpConst.GET_GOOD_AND_EVIL_NOTE_DATA);` / `};`
- 请求参数对象字面量：无。
4. 应答消费回调（onGetHateData，scripts3.js:36682-36689）
- 36683 `if (1 == e.eRet) {`
- 36684 `this.hateTargets = e.getNoteData;`
- 36685 `this.isHaveHate = this.hateTargets.length > 0;`
- 备注：本回调内未出现 note.attrch / note.skch（见"未能验证/范围外"段）。

## GET_GOOD_AND_EVIL_NPC_DATA → User.getGoodAndEvilNpcData

1. HttpConst 定义行
- tools/index.js:60439 `GET_GOOD_AND_EVIL_NPC_DATA: "User.getGoodAndEvilNpcData",`
2. 注册点
- tools/scripts3.js:36352 `p.MessageCenter.on(c.HttpConst.GET_GOOD_AND_EVIL_NPC_DATA, this.onGetNpcData, this);`
3. 请求点
- tools/scripts3.js:36612-36614 `t.prototype.getNpcData = function() {` / `l.NetMgr.http.sendRequest(c.HttpConst.GET_GOOD_AND_EVIL_NPC_DATA);` / `};`
- 请求参数对象字面量：无。
4. 应答消费回调（onGetNpcData，scripts3.js:36615-36621）
- 36616 `if (1 == e.eRet) {`
- 36617 `this.npcTargets = e.targetArrData;`
- 36618 `this.npcRemainTime = Math.max(e.maxNum - e.curNum, 0);`

## REFRESH_GOOD_AND_EVIL_NPC_DATA → User.refreshGoodAndEvilNpcData

1. HttpConst 定义行
- tools/index.js:60440 `REFRESH_GOOD_AND_EVIL_NPC_DATA: "User.refreshGoodAndEvilNpcData",`
2. 注册点
- tools/scripts3.js:36353 `p.MessageCenter.on(c.HttpConst.REFRESH_GOOD_AND_EVIL_NPC_DATA, this.onRefreshNpcData, this);`
3. 请求点
- tools/scripts3.js:36601-36603 `t.prototype.refreshNpcData = function() {` / `l.NetMgr.http.sendRequest(c.HttpConst.REFRESH_GOOD_AND_EVIL_NPC_DATA);` / `};`
- 请求参数对象字面量：无。
4. 应答消费回调（onRefreshNpcData，scripts3.js:36604-36611）
- 36605 `if (1 == e.eRet) {`
- 36606 `this.npcTargets = e.targetArrData;`
- 36607 `this.npcRemainTime = e.maxNum - e.curNum;`

## GET_GOOD_AND_EVIL_RANK_DATA → User.getGoodAndEvilRankData

1. HttpConst 定义行
- tools/index.js:60446 `GET_GOOD_AND_EVIL_RANK_DATA: "User.getGoodAndEvilRankData",`
2. 注册点
- tools/scripts3.js:36360 `p.MessageCenter.on(c.HttpConst.GET_GOOD_AND_EVIL_RANK_DATA, this.onGetRankData, this);`
3. 请求点
- tools/scripts3.js:36483-36487 `t.prototype.getRankData = function(t) {` / `l.NetMgr.http.sendRequest(c.HttpConst.GET_GOOD_AND_EVIL_RANK_DATA, {` / `type: t` / `});`
- 请求参数对象字面量：`{ type: t }`（t 为 getRankData 形参，调用方未追）。
4. 应答消费回调（onGetRankData，scripts3.js:36488-36503）
- 36489 `if (1 == e.eRet) {`
- 36490 `this.rankEndTime = e.endTime;`
- 36491 `this.myRank = e.myRank;`
- 36492 `this.myScore = e.myScore;`
- 36493 `this.myMissRate = e.myMissRate;`
- 36494 `e.type == a.RoleBaseInfo.goodCamp ? this.policeData = e.rankData : e.type == a.RoleBaseInfo.evilCamp && (this.killerData = e.rankData);`
- 36495 `if (e.type == a.RoleBaseInfo.goodEvilCamp) {`

## HELP_DONE_TASK → User.helpDoneTask

1. HttpConst 定义行
- tools/index.js:60447 `HELP_DONE_TASK: "User.helpDoneTask",`
2. 注册点
- tools/scripts3.js:36362 `p.MessageCenter.on(c.HttpConst.HELP_DONE_TASK, this.onSeekTaskHelp, this);`
3. 请求点
- tools/scripts3.js:36453-36459 `t.prototype.seekTaskHelp = function(t, e) {` / `this.isSeekHelpLinking = !0;` / `l.NetMgr.http.sendRequest(c.HttpConst.HELP_DONE_TASK, {` / `type: t,` / `targetId: e` / `}, null, !1);`
- 请求参数对象字面量：`{ type: t, targetId: e }`（t、e 为 seekTaskHelp 形参，调用方未追）；sendRequest 第三参 `null`、第四参 `!1`。
4. 应答消费回调（onSeekTaskHelp，scripts3.js:36460-36472）
- 36461 `if (1 == e.eRet) {`
- 36462 `this.setWinStr(e.prestige, e.contribution, e.addScore);`
- 36463 `if (1 == e.type) this.setWinPlayerData(this.getTargetInfo(e.targetId)); else if (2 == e.type) {`
- 36464 `this.setWinNpcData(this.npcTargets[e.targetId]);`
- 36467 `a.RoleBaseInfo.goodEvilPrestige = e.prestige;`
- 36468 `a.RoleBaseInfo.goodEvilContribution = e.contribution;`
- 36471 `} else 6 == e.eRet && this.showCheckFailAlert();`
- 备注：36463/36464 取到的 t 再由 setWinPlayerData（36405-36407 读 `t.level`、`t.ohterInfo.name`）/setWinNpcData（36409-36412 读 `t.npcId`、`t.level`）消费，但该对象来自本地数组 `getTargetInfo`（36658-36664 遍历 `this.playerTargets`/`this.hateTargets`）与 `this.npcTargets`，非本应答直接字段。

## GET_GE_HELP_INFO → User.getGeHelpInfo

1. HttpConst 定义行
- tools/index.js:60448 `GET_GE_HELP_INFO: "User.getGeHelpInfo",`
2. 注册点
- tools/scripts3.js:36361 `p.MessageCenter.on(c.HttpConst.GET_GE_HELP_INFO, this.onGetHelpInfo, this);`
3. 请求点
- tools/scripts3.js:36430-36432 `t.prototype.getHelpInfo = function() {` / `l.NetMgr.http.sendRequest(c.HttpConst.GET_GE_HELP_INFO);` / `};`
- 请求参数对象字面量：无。
4. 应答消费回调（onGetHelpInfo，scripts3.js:36433-36443）
- 36434 `if (1 == e.eRet) {`
- 36435 `if (e.helpNum - e.useNum <= 0) {`
- 36439 `this.helpInfo = e;`（整个应答对象存入 this.helpInfo）
- 转交一跳（helpInfo 后续消费）：
  - tools/scripts3.js:35704 `var e = c.GoodEvilModel.helpInfo, o = a.getText(6000995);`
  - tools/scripts3.js:35705 `o = (o = o.replace(/\[1\]/g, (e.helpNum - e.useNum).toString())).replace(/\[2\]/g, e.helpNum.toString());`
  - tools/scripts3.js:35707 `this.num.string = e.price.toString();`
  - tools/scripts3.js:35713 `l.RoleBaseInfo.gold < c.GoodEvilModel.helpInfo.price ? h.GoodEvilUtil.showCharge() : this.confirmCall && this.confirmCall();`

## GET_GOOD_AND_EVIL_DATA → User.getGoodAndEvilData

1. HttpConst 定义行
- tools/index.js:60449 `GET_GOOD_AND_EVIL_DATA: "User.getGoodAndEvilData",`
2. 注册点
- tools/scripts3.js:36363 `p.MessageCenter.on(c.HttpConst.GET_GOOD_AND_EVIL_DATA, this.onGetData, this);`
3. 请求点
- tools/scripts3.js:36473-36475 `t.prototype.getData = function() {` / `l.NetMgr.http.sendRequest(c.HttpConst.GET_GOOD_AND_EVIL_DATA);` / `};`
- 请求参数对象字面量：无。
4. 应答消费回调（onGetData，scripts3.js:36476-36482）
- 36477 `1 == e.eRet && h.default.prefabs.load("goodEvil/goodEvilChief/GoodEvilInfoUI", cc.Prefab, function(t, o) {`
- 36479 `s.getComponent("GoodEvilInfoUI").setData(e.goodAndEvilData);`
- 转交一跳（GoodEvilInfoUI 内 this.data = e.goodAndEvilData 的字段读取）：
  - tools/scripts3.js:35795 `var o = h.GoodEvilUtil.getPrestigeLv(this.data.prestige);`
  - tools/scripts3.js:35827 `o = (this.data.prestige - i.popular) / (s.popular - i.popular) * this.getLvDis();`
  - tools/scripts3.js:35836 `this.myLvNode.getChildByName("num").getComponent(cc.Label).string = this.data.prestige.toString();`
  - tools/scripts3.js:35843 `this.scoreLabels[0].string = this.data.historyMaxScore.toString();`
  - tools/scripts3.js:35844 `this.scoreLabels[1].string = this.data.curScore.toString();`
  - tools/scripts3.js:35845 `this.scoreLabels[2].string = this.data.todayScore.toString();`
  - tools/scripts3.js:35846 `this.scoreLabels[3].string = this.data.rankNum.toString();`
  - tools/scripts3.js:35849 `this.contributionLabels[0].string = this.data.totalContribution.toString();`
  - tools/scripts3.js:35850 `this.contributionLabels[1].string = this.data.avContribution.toString();`
  - tools/scripts3.js:35851 `this.contributionLabels[2].string = this.data.curContribution.toString();`
  - tools/scripts3.js:35854 `this.taskLabels[0].string = this.data.taskNum.toString() + "/" + this.data.maxTaskNum.toString();`
  - tools/scripts3.js:35855 `this.taskLabels[1].string = this.data.totalTaskNum.toString();`
  - tools/scripts3.js:35856 `this.taskLabels[2].string = this.data.totalReceiveNum.toString();`
  - tools/scripts3.js:35857 `this.taskLabels[3].string = this.data.successRate.toString() + "%";`
  - tools/scripts3.js:35860 `var t = new Date(this.data.joinTime), e = a.getText(6000997);`
  - tools/scripts3.js:35861 `...(e = e.replace(/\[3\]/g, this.data.joinDays.toString()));`

## GET_GOOD_AND_EVIL_RETIRE_LIST → User.getGoodAndEvilRetireList

1. HttpConst 定义行
- tools/index.js:60450 `GET_GOOD_AND_EVIL_RETIRE_LIST: "User.getGoodAndEvilRetireList",`
2. 注册点
- tools/scripts3.js:36364 `p.MessageCenter.on(c.HttpConst.GET_GOOD_AND_EVIL_RETIRE_LIST, this.onGetCareerRecord, this);`
3. 请求点
- tools/scripts3.js:36381-36385 `t.prototype.getCareerRecord = function(t) {` / `l.NetMgr.http.sendRequest(c.HttpConst.GET_GOOD_AND_EVIL_RETIRE_LIST, {` / `itemId: t` / `});`
- 请求参数对象字面量：`{ itemId: t }`。
4. 应答消费回调（onGetCareerRecord，scripts3.js:36386-36392）
- 36387 `1 == e.eRet && h.default.prefabs.load("goodEvil/goodEvilCareer/GoodEvilRecordUI", cc.Prefab, function(t, o) {`
- 36389 `s.getComponent("GoodEvilRecordUI").setData(e);`（整个应答对象转交）
- 转交一跳（GoodEvilRecordUI.onLoad 读 this.data）：
  - tools/scripts3.js:37339 `var e = 9412 == this.data.itemId ? "jin" : "tang";`
  - tools/scripts3.js:37341 `var o = c.getItem(this.data.itemId, "item");`
  - tools/scripts3.js:37343 `for (var i = this.data.list, s = 0; s < i.length; s++) {`
  - tools/scripts3.js:37345 `n.getComponent("GoodEvilRecordItem").setMyData(s, i[s]);`
- 再一跳（GoodEvilRecordItem 读 list 元素，scripts3.js:37256-37257、37279）：
  - 37256 `var e = new Date(this.myData[0]);`
  - 37257 `this.nameLabel.string = this.myData[1];`
  - 37279 `a.GoodEvilModel.getCareerData(this.myData[0]);`（myData[0] 作为 GET_GOOD_AND_EVIL_RETIRE_DATA 请求的 time 参数）

## GET_GOOD_AND_EVIL_RETIRE_DATA → User.getGoodAndEvilRetireData

1. HttpConst 定义行
- tools/index.js:60451 `GET_GOOD_AND_EVIL_RETIRE_DATA: "User.getGoodAndEvilRetireData",`
2. 注册点
- tools/scripts3.js:36365 `p.MessageCenter.on(c.HttpConst.GET_GOOD_AND_EVIL_RETIRE_DATA, this.onGetCareerData, this);`
3. 请求点
- tools/scripts3.js:36393-36397 `t.prototype.getCareerData = function(t) {` / `l.NetMgr.http.sendRequest(c.HttpConst.GET_GOOD_AND_EVIL_RETIRE_DATA, {` / `time: t` / `});`
- 请求参数对象字面量：`{ time: t }`（t 来自 GoodEvilRecordItem 的 myData[0]，见上节 37279）。
4. 应答消费回调（onGetCareerData，scripts3.js:36398-36404）
- 36399 `1 == e.eRet && h.default.prefabs.load("goodEvil/goodEvilCareer/GoodEvilCareerUI", cc.Prefab, function(t, o) {`
- 36401 `s.getComponent("GoodEvilCareerUI").setMyData(!1, e.data);`
- 转交一跳（GoodEvilCareerUI.setMyData 将第二参存为 this.ids，scripts3.js:35077-35082）：
  - 35080 `this.ids = e;`
  - 消费处：tools/scripts3.js:35049 `if (p.getItem(this.ids[0], "retireCareer").camp == h.RoleBaseInfo.goodCamp) {`；tools/scripts3.js:35074 `for (var t = ""; this.index < this.ids.length; this.index++) t += this.getItemStr() + "\n";`；tools/scripts3.js:35088 `var t = p.getItem(this.ids[this.index], "retireCareer"), e = "";`
  - 备注：35089-35091 读的 `t.type`/`t.DescriptionID`/`t.condition[1]` 来自本地配置表 `getItem(..., "retireCareer")`，非应答字段（ids 元素是传给 getItem 的键）。第三参 rewardArray 在 36401 未传（void 0 → 35078 置 null）。

## 特别注意项摘录位置

- contribution：GET_GE_HELP_INFO 之外出现于 HELP_DONE_TASK 应答（scripts3.js:36462、36467-36468，原文见上）；另 scripts3.js:36370 `a.RoleBaseInfo.goodEvilContribution = t.contribution;`（t.prototype.setData，scripts3.js:36367-36380，该函数不在本批 11 键的注册回调内，调用方未查）。
- evil：scripts3.js:38166 `var e = a.getItem(t, "ge_popular"), o = n.RoleBaseInfo.goodEvilCamp == n.RoleBaseInfo.goodCamp ? e.good : e.evil;`（读本地配置表 ge_popular 的 good/evil 字段，不在 11 键应答回调内）。
- goodAndEvilData：scripts3.js:36479（GET_GOOD_AND_EVIL_DATA 回调，原文见上节）。
- note.attrch / note.skch：11 键的注册点、请求点、应答消费回调（scripts3.js:36345-36366、36381-36729）内均未出现（grep `attrch|skch` 在 scripts3.js 的命中为 23575、72044、73899、73924、73950-73970，全部位于 Rogue 代码区；index.js 命中 59571、59580、64757-64781、138892，位于 USE_ITEM 等）。

## 未能验证

- seekTaskHelp/getRankData/getCareerRecord/getCareerData 的请求参数实参来源（调用方）未追，工单只要求"变量则追构造处"，构造处即形参字面量，调用方传值未查。
- GoodEvilModel.prototype.setData（scripts3.js:36367-36380，读 t.type/t.prestige/t.contribution/t.targetInfo/t.mapId/t.endTime/t.targetNpcInfo/t.npcMapId）的调用方未确认，故该函数是否由本批 11 键（或其它动作）的应答触发未能验证。
- GoodEvilInfoUI 的 setData 本体（疑在基类 UIComponent，将参数存为 this.data）未读源码确认，仅由 35778-35861 的 `this.data.xxx` 读取行为反推数据来源为 36479 传入的 `e.goodAndEvilData`——此为位置事实记录，非验证。
- GET_GOOD_AND_EVIL_NOTE_DATA 应答是否含 note.attrch/skch 子对象：客户端消费回调内无此路径读取，服务端是否下发未能验证。

## 范围外产出

以下为 grep 过程中顺带记录的位置，未动手、未分析：
- tools/scripts3.js:36346 `p.MessageCenter.on(c.HttpConst.JOIN_GOOD_OR_EVIL, this.onJoin, this);`（JOIN_GOOD_OR_EVIL，定义 index.js:60433，请求点 36720-36724，不在工单 KEY 清单）。
- tools/scripts3.js:36350-36365 同一 init 内还有 RECEIVE_TARGET_TASK、GOOD_AND_EVIL_BATTLE_RESULT、RECEIVE_NPC_TARGET_TASK、BATTLE_END_REWARD、BUY_TARGET_TASK_NUM、CHECK_TARGET_TASK、GET_GOOD_AND_EVIL_SHOP_DATA、BUY_GOOD_AND_EVIL_SHOP_ITEM 的注册（定义 index.js:60437-60445），不在工单 KEY 清单。
- note.attrch / note.skch 的实际消费区：tools/index.js:64757-64763（skch）、64779-64781（attrch）、138892；tools/scripts3.js:73950-73970（Rogue）。
- 三个 Json 工件引用了同批键（tools/actions.json:639-656、tools/action_facts_all.json:6633-6769），未核对内容。

