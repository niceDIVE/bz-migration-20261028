# scoutA-reqkeys — 21 个客户端动作摘录（index.js / scripts2.js / scripts3.js）

范围：仅 F:\BaoZouyxt\tools\index.js、F:\BaoZouyxt\tools\scripts2.js、F:\BaoZouyxt\tools\scripts3.js
方法：grep 定位 → read 小段 → 逐字摘录。只摘录，不做判断。
说明：`HttpConst.KEY:"User.xxx"` 定义全部位于 index.js；线上名字符串加引号检索只命中定义行，注册/请求点均以 `HttpConst.KEY` 形式引用。scripts2.js 涉及 RESET_CHILD_FOSTER / ADD_CHILD_FOSTER；scripts3.js 经 grep 全部 21 个 KEY 及线上名（含驼峰串）零命中。

## BIRTHCHILD → User.birthChild
- HttpConst: index.js:59678 `BIRTHCHILD: "User.birthChild",`
- 注册点: index.js:77030 `i.MessageCenter.on(n.HttpConst.BIRTHCHILD, this.callBackBirthild, this);`
- 请求点: index.js:77397-77398
  ```
  77397: e.prototype.reqBirthChild = function() {
  77398: _.NetMgr.http.sendRequest(n.HttpConst.BIRTHCHILD, {});
  ```
  参数对象字面量：`{}`（空）
- 应答消费: index.js:77352-77353、77355（callBackBirthild）
  ```
  77352: e.prototype.callBackBirthild = function(t, e) {
  77353: if (1 == e.eRet) {
  77355: this.childData = e.childObj;
  ```
  字段：e.eRet、e.childObj

## EXILE_CHILD → User.exileChild
- HttpConst: index.js:59699 `EXILE_CHILD: "User.exileChild",`
- 注册点: index.js:77031 `i.MessageCenter.on(n.HttpConst.EXILE_CHILD, this.callBackExileChild, this);`
- 请求点: index.js:77453-77456
  ```
  77453: e.prototype.reqDeleteChild = function(t) {
  77454: _.NetMgr.http.sendRequest(n.HttpConst.EXILE_CHILD, {
  77455: isPay: t
  77456: });
  ```
  参数对象字面量：`{ isPay: t }`
- 应答消费: index.js:77382-77395（callBackExileChild）
  ```
  77382: e.prototype.callBackExileChild = function(t, e) {
  77383: if (0 == e.eRet) cc.log("error"); else if (1 == e.eRet) {
  77387: } else 2 == e.eRet || (3 == e.eRet ? p.default.show(r.getText(2116)) : 4 == e.eRet ? p.default.show(r.getText(535), [ {
  ```
  字段：仅 e.eRet（值 0/1/2/3/4 分支）

## BEGIN_WEDDING → User.beginWedding
- HttpConst: index.js:59651 `BEGIN_WEDDING: "User.beginWedding",`
- 注册点: index.js:77028 `i.MessageCenter.on(n.HttpConst.BEGIN_WEDDING, this.callBackBeginWedding, this);`
- 请求点: index.js:77444-77445
  ```
  77444: e.prototype.reqStartWedding = function() {
  77445: _.NetMgr.http.sendRequest(n.HttpConst.BEGIN_WEDDING, {});
  ```
  参数对象字面量：`{}`（空）
- 应答消费: index.js:77272-77273（callBackBeginWedding）
  ```
  77272: e.prototype.callBackBeginWedding = function(t, e) {
  77273: 1 == e.eRet && (this.weddingType = 0);
  ```
  字段：仅 e.eRet

## MAKE_LOVE → User.makeLove
- HttpConst: index.js:59652 `MAKE_LOVE: "User.makeLove",`
- 注册点: index.js:77029 `i.MessageCenter.on(n.HttpConst.MAKE_LOVE, this.callBackMakeLove, this);`
- 请求点: index.js:77447-77451
  ```
  77447: e.prototype.reqMakeLove = function(t) {
  77448: this.chooseType = t;
  77449: _.NetMgr.http.sendRequest(n.HttpConst.MAKE_LOVE, {
  77450: choose: t
  77451: });
  ```
  参数对象字面量：`{ choose: t }`
- 应答消费: index.js:77278-77285、77308、77337（callBackMakeLove）
  ```
  77278: e.prototype.callBackMakeLove = function(t, e) {
  77279: var o = this, i = a.getItem(1299, "npc"), n = 0, s = e.eRet;
  77280: if (1 == s) {
  77283: } else if (5 == s) {
  77285: this.fetationTime = e.fetationTime;
  77308: e.hasOwnProperty("makeID") && (l = e.makeID);
  77337: e.hasOwnProperty("happiness") && (this.happinessNum = e.happiness);
  ```
  字段：e.eRet、e.fetationTime、e.makeID（hasOwnProperty("makeID")）、e.happiness（hasOwnProperty("happiness")）

## MARRY_AWARD → User.marryAward
- HttpConst: index.js:59650 `MARRY_AWARD: "User.marryAward",`
- 注册点: index.js:77027 `i.MessageCenter.on(n.HttpConst.MARRY_AWARD, this.callBackMarryAward, this);`
- 请求点: index.js:77439-77442
  ```
  77439: e.prototype.reqMarryAward = function(t) {
  77440: _.NetMgr.http.sendRequest(n.HttpConst.MARRY_AWARD, {
  77441: guestID: t
  77442: });
  ```
  参数对象字面量：`{ guestID: t }`
- 应答消费: index.js:77266-77270（callBackMarryAward）
  ```
  77266: e.prototype.callBackMarryAward = function(t, e) {
  77267: if (1 == e.eRet) {
  77268: this.guestNpcAy.push(e.guestID);
  77269: f.default.addShowRewardUI1(e.rewardArray, 0, e.equipObj);
  ```
  字段：e.eRet、e.guestID、e.rewardArray、e.equipObj

## RESET_CHILD_FOSTER → User.resetChildFoster
- HttpConst: index.js:60042 `RESET_CHILD_FOSTER: "User.resetChildFoster",`
- 注册点: index.js:24615 `r.MessageCenter.on(s.HttpConst.RESET_CHILD_FOSTER, this.resetChildCallBack, this);`
- 请求点: scripts2.js:12967-12969
  ```
  12967: 0 == t && m.NetMgr.http.sendReqWithMask(h.HttpConst.RESET_CHILD_FOSTER, {
  12968: roleID: g.RoleBaseInfo.roleID
  12969: });
  ```
  参数对象字面量：`{ roleID: g.RoleBaseInfo.roleID }`
- 应答消费: index.js:24638-24655（resetChildCallBack）
  ```
  24638: t.prototype.resetChildCallBack = function(t, e) {
  24639: if (1 == e.eRet) {
  24640: e.hasOwnProperty("foster_point") && (c.MarryModel.childData.foster_point = e.foster_point);
  24641: e.hasOwnProperty("playArr") && (c.MarryModel.childData.playArr = e.playArr);
  24647: } else 3 == e.eRet ? a.default.show(i.getText(535), [ {
  24655: }, "", !1) : 4 == e.eRet && a.default.show(i.getText(4753));
  ```
  字段：e.eRet、e.foster_point（hasOwnProperty("foster_point")）、e.playArr（hasOwnProperty("playArr")）

## ADOPTCHILD → User.adoptChild
- HttpConst: index.js:59687 `ADOPTCHILD: "User.adoptChild",`
- 注册点: index.js:24619 `r.MessageCenter.on(s.HttpConst.ADOPTCHILD, this.onAdoptChild, this);`
- 请求点: index.js:24787、24796-24798
  ```
  24787: t.prototype.onSelectSexNum = function(t) {
  24796: 0 == e && u.NetMgr.http.sendRequest(s.HttpConst.ADOPTCHILD, {
  24797: adoptChildSex: t
  24798: });
  ```
  参数对象字面量：`{ adoptChildSex: t }`（t 来自 onSelectSexNum(t)，由 24781/24783 的 1/0 传入）
- 应答消费: index.js:24694-24698（onAdoptChild）
  ```
  24694: t.prototype.onAdoptChild = function(t, e) {
  24695: if (1 == e.eRet) {
  24696: a.default.show(i.getText(5995));
  24697: c.MarryModel.childData = e.childObj;
  24698: } else p.StoreModel.openChargeList();
  ```
  字段：e.eRet、e.childObj

## ADD_CHILD_FOSTER → User.addChildFoster
- HttpConst: index.js:60043 `ADD_CHILD_FOSTER: "User.addChildFoster",`
- 注册点: scripts2.js:12937 `c.MessageCenter.on(h.HttpConst.ADD_CHILD_FOSTER, this.onAddChildFoster, this);`
  （对应 off：scripts2.js:12940 `c.MessageCenter.off(h.HttpConst.ADD_CHILD_FOSTER, this.onAddChildFoster, this);`）
- 请求点: scripts2.js:12976-12977 与 12987-12988
  ```
  12976: if (e == this.lastTag) m.NetMgr.http.sendReqWithMask(h.HttpConst.ADD_CHILD_FOSTER, {
  12977: type: e
  ...
  12987: 0 == t && m.NetMgr.http.sendReqWithMask(h.HttpConst.ADD_CHILD_FOSTER, {
  12988: type: e
  ```
  参数对象字面量：`{ type: e }`（两处相同）
- 应答消费: scripts2.js:12946-12953（onAddChildFoster）
  ```
  12946: e.prototype.onAddChildFoster = function(t, e) {
  12947: if (1 == e.eRet) {
  12948: e.hasOwnProperty("foster_point") && (l.MarryModel.childData.foster_point = e.foster_point);
  12949: e.hasOwnProperty("playArr") && (l.MarryModel.childData.playArr = e.playArr);
  12953: } else 2 == e.eRet || 3 == e.eRet || 4 == e.eRet || cc.log("error");
  ```
  字段：e.eRet、e.foster_point（hasOwnProperty("foster_point")）、e.playArr（hasOwnProperty("playArr")）

## DIVORCENPC → User.divorceNpc
- HttpConst: index.js:59649 `DIVORCENPC: "User.divorceNpc",`
- 注册点: index.js:77026 `i.MessageCenter.on(n.HttpConst.DIVORCENPC, this.callBackDivorceNpc, this);`
- 请求点: index.js:77436-77437
  ```
  77436: e.prototype.reqDivorceNpc = function() {
  77437: _.NetMgr.http.sendRequest(n.HttpConst.DIVORCENPC, {});
  ```
  参数对象字面量：`{}`（空）
- 应答消费: index.js:77257-77264（callBackDivorceNpc）
  ```
  77257: e.prototype.callBackDivorceNpc = function(t, e) {
  77258: if (1 == e.eRet) {
  77259: this.wifeUpdateData = {};
  77260: this.npcMarryState = 0;
  77261: this.divorceNpcMap[e.npcID] = !0;
  77262: i.MessageCenter.dispatch(u.EvName.DELETE_WIFE_EVENT);
  77263: e.hasOwnProperty("deletePartners") && T.PartnerModel.deletePartnerData(e.deletePartners);
  77264: } else 2 == e.eRet ? p.default.show(r.getText("1139")) : p.default.show(r.getText("1140"));
  ```
  字段：e.eRet、e.npcID、e.deletePartners（hasOwnProperty("deletePartners")）

## MARRY_NPC_EVENT → User.marryNpc
- HttpConst: index.js:59648 `MARRY_NPC_EVENT: "User.marryNpc",`
- 注册点: index.js:77024 `i.MessageCenter.on(n.HttpConst.MARRY_NPC_EVENT, this.callBackMarryNpcEvent, this);`
- 请求点: index.js:77420-77425
  ```
  77420: e.prototype.reqMarryNpc = function(t, e) {
  77421: this.marryFlag = e;
  77422: _.NetMgr.http.sendRequest(n.HttpConst.MARRY_NPC_EVENT, {
  77423: npcID: t,
  77424: flag: e
  77425: });
  ```
  参数对象字面量：`{ npcID: t, flag: e }`
- 应答消费: index.js:77236-77254（callBackMarryNpcEvent）
  ```
  77236: e.prototype.callBackMarryNpcEvent = function(t, e) {
  77237: if (1 == e.eRet) {
  77241: if (1 == this.marryFlag) {
  77242: this.npcMarryState = e.npcID;
  77243: var o = a.getItem(e.npcID, "npc"), n = parseInt(o.jineng[1]);
  77250: e.hasOwnProperty("wifeFasion") && this.setCurrentWifeData(e.wifeFasion);
  77254: } else 3 == e.eRet ? p.default.show(r.getText("1137")) : 4 == e.eRet ? p.default.show(r.getText("1135")) : p.default.show(r.getText("1136"));
  ```
  字段：e.eRet、e.npcID、e.wifeFasion（hasOwnProperty("wifeFasion")）

## CHILD_WASH_EVENT → User.childWashProperty
- HttpConst: index.js:59680 `CHILD_WASH_EVENT: "User.childWashProperty",`
- 注册点: index.js:24614 `r.MessageCenter.on(s.HttpConst.CHILD_WASH_EVENT, this.childWashCallBack, this);`
- 请求点: index.js:24711-24715
  ```
  24711: t.prototype.reqChildWash = function(t) {
  24712: void 0 === t && (t = 0);
  24713: 0 == t ? u.NetMgr.http.sendRequest(s.HttpConst.CHILD_WASH_EVENT) : u.NetMgr.http.sendRequest(s.HttpConst.CHILD_WASH_EVENT, {
  24714: attrID: t
  24715: });
  ```
  参数对象字面量：无参数调用（t==0 时）；否则 `{ attrID: t }`
- 应答消费: index.js:24627-24636（childWashCallBack）
  ```
  24627: t.prototype.childWashCallBack = function(t, e) {
  24628: if (1 == e.eRet) {
  24629: c.MarryModel.setChildAttData(e.baseArr, e.attArr);
  24632: } else 4 == e.eRet ? m.default.prefabs.load("marrySystem/ChildWashUI", cc.Prefab, function(t, o) {
  24634: i.addComponent("SetChildWashUI").setData(e.attrList);
  24636: }) : p.StoreModel.openChargeList();
  ```
  字段：e.eRet、e.baseArr、e.attArr、e.attrList（eRet==4 分支）

## GIVE_CHILD_NAME → User.giveChildName
- HttpConst: index.js:59679 `GIVE_CHILD_NAME: "User.giveChildName",`
- 注册点: index.js:24613 `r.MessageCenter.on(s.HttpConst.GIVE_CHILD_NAME, this.setChildNameCallBack, this);`
- 请求点: index.js:24706-24709
  ```
  24706: t.prototype.reqSetName = function(t) {
  24707: u.NetMgr.http.sendRequest(s.HttpConst.GIVE_CHILD_NAME, {
  24708: childName: t
  24709: });
  ```
  参数对象字面量：`{ childName: t }`
- 应答消费: index.js:24621-24625（setChildNameCallBack）
  ```
  24621: t.prototype.setChildNameCallBack = function(t, e) {
  24622: if (1 == e.eRet) {
  24623: c.MarryModel.childData.childName = e.childName;
  24624: r.MessageCenter.dispatch(l.EvName.SET_CHILD_NAME_EVENT);
  24625: } else 99 == e.eRet ? a.default.show(i.getText("480")) : a.default.show(i.getText(427));
  ```
  字段：e.eRet、e.childName

## UPGRADE_WIFE_LEVEL → User.upgradeWifeLevel
- HttpConst: index.js:59799 `UPGRADE_WIFE_LEVEL: "User.upgradeWifeLevel",`
- 注册点: index.js:145326 `r.MessageCenter.on(a.HttpConst.UPGRADE_WIFE_LEVEL, function(t, e) {`
- 请求点: index.js:145384-145389
  ```
  145384: e.prototype.reqUpgradeWifeLevel = function(t, e, o) {
  145385: h.NetMgr.http.sendReqWithMask(a.HttpConst.UPGRADE_WIFE_LEVEL, {
  145386: lv: t,
  145387: exp: e,
  145388: pot: o
  145389: });
  ```
  参数对象字面量：`{ lv: t, exp: e, pot: o }`
- 应答消费: index.js:145326-145331（内联回调）
  ```
  145326: r.MessageCenter.on(a.HttpConst.UPGRADE_WIFE_LEVEL, function(t, e) {
  145327: if (1 == e.eRet) {
  145328: c.MarryModel.wifeUpdateData.lv = e.lv;
  145329: c.MarryModel.wifeUpdateData.exp = e.exp;
  ```
  字段：e.eRet、e.lv、e.exp

## USE_WIFE_PROP → User.UserWifeProp
- HttpConst: index.js:59800 `USE_WIFE_PROP: "User.UserWifeProp",`
- 注册点: index.js:145333 `r.MessageCenter.on(a.HttpConst.USE_WIFE_PROP, function(t, e) {`
- 请求点: index.js:145391-145394
  ```
  145391: e.prototype.reqUseItemLv = function(t) {
  145392: h.NetMgr.http.sendReqWithMask(a.HttpConst.USE_WIFE_PROP, {
  145393: propnum: t
  145394: });
  ```
  参数对象字面量：`{ propnum: t }`
- 应答消费: index.js:145333-145346（内联回调）
  ```
  145333: r.MessageCenter.on(a.HttpConst.USE_WIFE_PROP, function(t, e) {
  145334: if (1 == e.eRet) {
  145335: var o = c.MarryModel.wifeUpdateData.lv, i = c.MarryModel.wifeUpdateData.exp, a = e.lv, l = e.exp;
  145336: c.MarryModel.wifeUpdateData.lv = e.lv;
  145337: c.MarryModel.wifeUpdateData.exp = e.exp;
  ```
  字段：e.eRet、e.lv、e.exp

## CHOOSE_GIRL_EVENT → User.ChooseGirl
- HttpConst: index.js:59613 `CHOOSE_GIRL_EVENT: "User.ChooseGirl",`
- 注册点: index.js:51125 `i.MessageCenter.on(n.HttpConst.CHOOSE_GIRL_EVENT, function(o, n) {`
- 请求点: index.js:51241-51246
  ```
  51241: t.prototype.reqChooseGirl = function(t) {
  51242: this.npcId = t;
  51243: var e = {
  51244: npcID: t
  51245: };
  51246: g.NetMgr.http.sendRequest(n.HttpConst.CHOOSE_GIRL_EVENT, e);
  ```
  参数对象字面量（变量 e 的构造）：`{ npcID: t }`
- 应答消费: index.js:51125-51143（内联回调；回调第二参名为 n）
  ```
  51125: i.MessageCenter.on(n.HttpConst.CHOOSE_GIRL_EVENT, function(o, n) {
  51126: if (1 == n.eRet) {
  51142: t.girlData[n.npcID] = n.eTime;
  51143: } else s.default.show(l.getText(1088));
  ```
  字段：n.eRet、n.npcID、n.eTime

## PROPOSE_NPC → User.proposeNpc
- HttpConst: index.js:59642 `PROPOSE_NPC: "User.proposeNpc",`
- 注册点: index.js:77019 `i.MessageCenter.on(n.HttpConst.PROPOSE_NPC, this.callBackProposeNpc, this);`
- 请求点: index.js:77400-77403
  ```
  77400: e.prototype.reqProposeNpc = function(t) {
  77401: _.NetMgr.http.sendRequest(n.HttpConst.PROPOSE_NPC, {
  77402: npcID: t
  77403: });
  ```
  参数对象字面量：`{ npcID: t }`
- 应答消费: index.js:77123-77127（callBackProposeNpc）
  ```
  77123: e.prototype.callBackProposeNpc = function(t, e) {
  77124: if (1 == e.eRet) {
  77125: this.proposeNpcInfo[e.npcID] = !0;
  77126: this.marryPopTip(0);
  77127: } else 2 == e.eRet ? p.default.show(r.getText("1133")) : 10 == e.eRet ? p.default.show(r.getText("1141")) : 11 == e.eRet ? p.default.show(r.getText("1137")) : 12 == e.eRet ? p.default.show(r.getText("1166")) : p.default.show(r.getText("1132"));
  ```
  字段：e.eRet、e.npcID

## WHORING_GIRL_EVENT → User.GetWhoreData
- HttpConst: index.js:59615 `WHORING_GIRL_EVENT: "User.GetWhoreData",`
- 注册点: index.js:51112 `i.MessageCenter.on(n.HttpConst.WHORING_GIRL_EVENT, function(t, o) {`
- 请求点: index.js:51222-51227
  ```
  51222: t.prototype.reqGirlAllData = function(t) {
  51223: this.npcId = t;
  51224: var e = {
  51225: roleID: d.RoleBaseInfo.roleID
  51226: };
  51227: g.NetMgr.http.sendRequest(n.HttpConst.WHORING_GIRL_EVENT, e);
  ```
  参数对象字面量（变量 e 的构造）：`{ roleID: d.RoleBaseInfo.roleID }`
- 应答消费: index.js:51112-51123（内联回调）
  ```
  51112: i.MessageCenter.on(n.HttpConst.WHORING_GIRL_EVENT, function(t, o) {
  51113: if (1 == o.eRet) {
  51114: e.resetGirlData();
  51115: o.hasOwnProperty("girlData") && (e.girlData = o.girlData);
  51120: } else {
  ```
  字段：o.eRet、o.girlData（hasOwnProperty("girlData")）

## INVITE_NPC_GETLIKE → User.getLikeEvent
- HttpConst: index.js:60565 `INVITE_NPC_GETLIKE: "User.getLikeEvent",`
- 注册点: index.js:51155 `i.MessageCenter.on(n.HttpConst.INVITE_NPC_GETLIKE, function(t, o) {`
- 请求点: index.js:51354-51356
  ```
  51354: t.prototype.reqInviteLeave = function(t) {
  51355: this.npcId = t;
  51356: g.NetMgr.http.sendRequest(n.HttpConst.INVITE_NPC_GETLIKE, {});
  ```
  参数对象字面量：`{}`（空）
- 应答消费: index.js:51155-51163（内联回调）
  ```
  51155: i.MessageCenter.on(n.HttpConst.INVITE_NPC_GETLIKE, function(t, o) {
  51156: if (1 == o.eRet) {
  51157: var i = c.getItem(o.eventId, "like_event");
  51158: e.inviteEventObj = i;
  51160: } else if (4 == o.eRet) {
  51161: e.inviteEventObj = {};
  51162: r.default.addDialogEvent(1810121, 0);
  51163: }
  ```
  字段：o.eRet、o.eventId

## CHOOSE_SEX → User.chooseSex
- HttpConst: index.js:59686 `CHOOSE_SEX: "User.chooseSex",`
- 注册点: index.js:24618 `r.MessageCenter.on(s.HttpConst.CHOOSE_SEX, this.chooseSexCallBack, this);`
- 请求点: index.js:24700-24704
  ```
  24700: t.prototype.reqChooseSex = function(t) {
  24701: this.chooseSexId = t;
  24702: u.NetMgr.http.sendRequest(s.HttpConst.CHOOSE_SEX, {
  24703: sex: t
  24704: });
  ```
  参数对象字面量：`{ sex: t }`
- 应答消费: index.js:24688-24692（chooseSexCallBack）
  ```
  24688: t.prototype.chooseSexCallBack = function(t, e) {
  24689: if (1 == e.eRet) {
  24690: var o = i.getText(2132).replace(/\[1\]/, i.getText(this.chooseSexId > 0 ? 275 : 274));
  24691: a.default.show(o);
  24692: } else 3 == e.eRet && a.default.show(i.getText(2131));
  ```
  字段：仅 e.eRet（eRet==1 分支体内只读本地 this.chooseSexId，非应答字段）

## INVITE_NPC_OPTION → User.optionLikeEvent
- HttpConst: index.js:60566 `INVITE_NPC_OPTION: "User.optionLikeEvent",`
- 注册点: index.js:51165 `i.MessageCenter.on(n.HttpConst.INVITE_NPC_OPTION, function(t, o) {`
- 请求点: index.js:51373-51376
  ```
  51373: t.prototype.reqSelectOption = function(t) {
  51374: g.NetMgr.http.sendRequest(n.HttpConst.INVITE_NPC_OPTION, {
  51375: isDelItem: t
  51376: });
  ```
  参数对象字面量：`{ isDelItem: t }`
- 应答消费: index.js:51165-51174（内联回调）
  ```
  51165: i.MessageCenter.on(n.HttpConst.INVITE_NPC_OPTION, function(t, o) {
  51166: var i;
  51167: if (1 == o.eRet) {
  51168: var n = o.npcId, r = o.feel;
  51169: p.default.setNcpIntimacy(n, r);
  51170: o.hasOwnProperty("delTaskIds") && S.TaskModel.clearRogueTaskData(o.delTaskIds);
  51174: } else 6 == o.eRet ? s.default.show(l.getText("9223")) : s.default.show(l.getText("1455"));
  ```
  字段：o.eRet、o.npcId、o.feel、o.delTaskIds（hasOwnProperty("delTaskIds")）

## WHORING_EVENT → User.Whoring
- HttpConst: index.js:59614 `WHORING_EVENT: "User.Whoring",`
- 注册点: index.js:51145 `i.MessageCenter.on(n.HttpConst.WHORING_EVENT, function(e, o) {`
- 请求点: index.js:51248-51255
  ```
  51248: t.prototype.reqWhoringMsg = function(t, e) {
  51249: var o = {
  51250: npcID: t,
  51251: flag: e,
  51252: hglmt: m.UserModel.entity.hunger.limit
  51253: };
  51254: this.npcId = t;
  51255: g.NetMgr.http.sendRequest(n.HttpConst.WHORING_EVENT, o);
  ```
  参数对象字面量（变量 o 的构造）：`{ npcID: t, flag: e, hglmt: m.UserModel.entity.hunger.limit }`
- 应答消费: index.js:51145-51153（内联回调）
  ```
  51145: i.MessageCenter.on(n.HttpConst.WHORING_EVENT, function(e, o) {
  51146: if (1 == o.eRet) {
  51147: var i = o.makeID, n = c.getItem(i, "make"), r = t.randomGirl[t.npcId], a = r.reality, s = r.picture;
  51149: if (s.length) {
  51150: t.tempMakeId = i;
  51151: t.showPlayPic(s);
  51152: } else t.showBrothelEndUI(i);
  51153: }
  ```
  字段：o.eRet、o.makeID

## 未能验证
- 各 `HttpConst.KEY` 引用处仅检索了 `HttpConst.KEY` 前缀形式与引号内线上名形式；若存在经解构/别名间接引用 KEY 的情况（如 `var X = HttpConst;` 后再取键），未逐一排查。已检索的两种形式在三个文件中共命中 65 行（定义 21 + HttpConst 前缀引用 44），已全部列入上文。
- scripts3.js：对 21 个 KEY 与 21 个线上名（含驼峰串）做了 grep，零命中；据此记"scripts3.js 无本清单相关内容"，未做逐行人工通读。
- 应答消费只摘录了注册回调函数体内的字段读取；回调内部再调用的其他函数（如 checkLikeReward、jumpResultUI、resetGirlData 等）内部是否再读应答字段，未追入。

## 范围外产出
范围外产出：无
