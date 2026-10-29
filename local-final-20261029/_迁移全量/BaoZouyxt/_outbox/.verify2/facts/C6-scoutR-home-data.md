# scoutR-home-data: 农作物面板数据来源动作契约

## 1. 键名定义行与值（index.js）
- tools/index.js:59845: `GETHOME_LIST: "User.getHomeList",`
- tools/index.js:59857: `OTHER_PLAYER_HOME: "User.findOHomes",`
- tools/index.js:59858: `FIND_OTHER_HOME: "User.findOhter",`
- tools/index.js:59859: `ENTER_OTHER_HOME: "User.getFriendHomeList",`

## 2. 线上名检索与契约事实
### 2.1 发送点（行号与参数对象原文）
- tools/index.js:58102: `v.NetMgr.http.sendReqWithMask(s.HttpConst.GETHOME_LIST, {});`
- tools/index.js:58106: `v.NetMgr.http.sendRequest(s.HttpConst.GETHOME_LIST, {});`
- tools/index.js:58198: `t > 0 && v.NetMgr.http.sendRequest(s.HttpConst.ENTER_OTHER_HOME, {\n fid: t\n});` (参数: `{ fid: t }`)
- tools/index.js:58205: `t > 0 && v.NetMgr.http.sendRequest(s.HttpConst.ENTER_OTHER_HOME, {\n fid: t\n});` (参数: `{ fid: t }`)
- tools/scripts2.js: 0 命中（检索模式："getHomeList"、"enterOtherHome"、"getFriendHomeList"）
- tools/scripts3.js: 0 命中（检索模式："getHomeList"、"enterOtherHome"、"getFriendHomeList"）

### 2.2 下行回调被读字段（字段名|行号|原文|有无守卫）
- tools/index.js:57585-57635 (GETHOME_LIST / getHomeList):
  - eRet | 57586 | `if (1 == i.eRet) {` | 有 (1 == i.eRet)
  - recentSeeds | 57592 | `i.recentSeeds ? e.recentSs = i.recentSeeds : e.recentSs.length = 0;` | 有 (三元表达式判断真值)
  - soilArr | 57593 | `if (i.hasOwnProperty("soilArr")) {` | 有 (hasOwnProperty)
  - exp | 57594 | `e.plantSeedData.plantExp = i.exp;` | 无 (在 soilArr 守卫内，对 exp 本身无单独守卫)
  - dog | 57595 | `i.hasOwnProperty("dog") && (e.dogData = i.dog);` | 有 (hasOwnProperty)
  - soilArr | 57596 | `e.soilArr = i.soilArr;` | 有 (在 57593 hasOwnProperty 守卫内)
  - bShop | 57597 | `i.hasOwnProperty("bShop") && (e.homeShop = i.bShop);` | 有 (hasOwnProperty)
  - friendPartnerAward | 57633 | `i.hasOwnProperty("friendPartnerAward") && (e.rewardData = i.friendPartnerAward);` | 有 (hasOwnProperty)
- tools/index.js:57951-57977 (ENTER_OTHER_HOME / enterOtherHome / getFriendHomeList):
  - eRet | 57952 | `if (1 == o.eRet) {` | 有 (1 == o.eRet)
  - soilArr | 57954 | `if (o.hasOwnProperty("soilArr")) {` | 有 (hasOwnProperty)
  - dog | 57958 | `o.hasOwnProperty("dog") && (e.dogData = o.dog);` | 有 (hasOwnProperty)
  - friendPartnerId | 57959 | `if (o.hasOwnProperty("friendPartnerId")) {` | 有 (hasOwnProperty)
  - exp | 57963 | `e.plantSeedData.plantExp = o.exp;` | 无 (在 soilArr 守卫内，对 exp 本身无单独守卫)
  - soilArr | 57964 | `e.soilArr = o.soilArr;` | 有 (在 57954 hasOwnProperty 守卫内)
  - flag | 57965 | `e.isFriend = o.flag;` | 无 (在 soilArr 守卫内，对 flag 无单独守卫)
  - eRet | 57977 | `} else -1 == o.eRet && a.default.show(n.getText(3320));` | 有 (-1 == o.eRet)

## 3. GETHOME_LIST 回调剩余部分原文（tools/index.js:57602-57645）
57602: e.curMapId = p.GameStates.getLastMapID();
57603: if (null != h.UserModel.player) {
57604: e.enterX = h.UserModel.player.x;
57605: e.enterY = h.UserModel.player.y;
57606: }
57607: var s = u.MarryModel.marryHouseMap;
57608: if (e.plantHomeUI) {
57609: r.MessageCenter.dispatch(c.EvName.UPTATE_PLANT_HOME_UI, {
57610: farmId: a,
57611: type: s[a],
57612: homeState: 0
57613: });
57614: e.reqHomeSpecialEvent();
57615: } else f.default.prefabs.load("cultivationUI/PlantHomeUI", cc.Prefab, function(o, n) {
57616: var r = cc.instantiate(n);
57617: d.PopUpMgr.addPopUp(r, g.LayerMgr.popUpLayer);
57618: r.addComponent("PlantHomeUI").setData({
57619: farmId: a,
57620: type: s[a],
57621: homeState: 0
57622: });
57623: Promise.resolve().then(function() {
57624: return t("../../scripts3/model3/PopGiftModel");
57625: }).then(function(t) {
57626: t.PopGiftModel.setHomeDataUI(i);
57627: });
57628: e.plantHomeUI = r;
57629: e.reqHomeSpecialEvent();
57630: });
57631: }
57632: }
57633: i.hasOwnProperty("friendPartnerAward") && (e.rewardData = i.friendPartnerAward);
57634: }
57635: }, this);
57636: r.MessageCenter.on(s.HttpConst.SEED_CROP, function(t, o) {
57637: if (1 == o.eRet) {
57638: var i = o.sIdx, n = {
57639: m: {},
57640: s: 1
57641: };
57642: o.crop.hasOwnProperty("m") && (n.m = o.crop.m);
57643: e.soilArr[i] = n;
57644: var a = {
57645: m: {},

## 4. 面板入口链与调用点
- 调用点 1: tools/index.js:58102 上下文函数名：`e.prototype.reqOpenHomeEvent = function() {` (tools/index.js:58100)
  - 前置调用链：tools/index.js:58348 `this.reqOpenHomeEvent();` 上下文函数名：`e.prototype.buildHomeTip = function() {` (tools/index.js:58346)
  - 前置调用链：tools/index.js:54722 `f.HomePlantModel.buildHomeTip();` 上下文函数名：`e.prototype.reaction = function() {` (tools/index.js:54714，隶属 GradenNpc 交互反应)
- 调用点 2: tools/index.js:58106 上下文函数名：`e.prototype.reqHomeAllData = function() {` (tools/index.js:58104)
  - 前置调用链：tools/index.js:58246 `this.typeId > 0 ? this.reqUpdateFriendHome(this.curFriendId) : this.reqHomeAllData();` 上下文函数名：`e.prototype.updateHomeNewData = function() {` (tools/index.js:58245)
- tools/index.js 其余位置 "GETHOME_LIST" 检索：Line 57585 (监听回调), Line 59845 (定义常量)。无其他主动 req 点。

## 未验证段
- 无（所有行号、字段、代码片段均已亲眼读取并核验）。

## 范围外产出
- tools/scripts2.js:59409 与 tools/scripts2.js:59648 中通过 `c.HomePlantModel.openFriendHome` 间接调用 `reqEnterFriendHome` (触发 ENTER_OTHER_HOME)。
