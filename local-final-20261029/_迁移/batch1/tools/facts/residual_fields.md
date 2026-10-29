# 证据不足字段清单（59 个字段 / 73 条动作字段位）

## FashionTimeMap   [object/name]   动作: GetFashionList
  75623: 1 == e.type && this.setFashionTime(e.FashionTimeMap);

## acceptSchoolTask   [object/usage-1]   动作: acceptSchoolTask
  60051: ACCEPT_SCHOOL_TASK: "User.acceptSchoolTask",
  113633: for (var o in e.acceptSchoolTask) if (o == this.othenSchool + "_" + this.taskTag) {
  113634: var i = e.acceptSchoolTask[o];

## activeEndTime   [number/fallback]   动作: GetShopAllActive
  131275: e.hasOwnProperty("activeEndTime") && (this.shopListEndTime = e.activeEndTime);

## activeNum   [number/fallback]   动作: buyActivityNum
  55942: this.paperNum = e.activeNum;

## activityShows   [number/fallback]   动作: getAllActivity
  57455: e.hasOwnProperty("activityShows") && (this.activeShowList = e.activityShows);

## attrList   [array/name]   动作: childWashProperty
  24634: i.addComponent("SetChildWashUI").setData(e.attrList);
  144073: i.addComponent("SetWashUI").setData(e.attrList);

## baseArr   [array/name]   动作: childWashProperty
  24629: c.MarryModel.setChildAttData(e.baseArr, e.attArr);
  77086: this.childData.baseArr = t;

## boxArr   [array/name]   动作: enterNextFloor
  55908: this.setBoxDataMap(e.boxArr);

## calendar   [number/fallback]   动作: getAllActivity
  57374: this.calendarStr = "";
  57456: e.hasOwnProperty("calendar") && e.calendar > 0 ? this.calendarStr = e.calendar.toString() : this.calendarStr = "";

## childName   [array/usage-1]   动作: giveChildName
  24623: c.MarryModel.childData.childName = e.childName;
  24867: if (0 == p.MarryModel.childData.childName.length) s.default.prefabs.load("marrySystem/NameAlert", cc.Prefab, function(t, e) {
  77605: return this.childData.childName;

## cookBook   [array/usage-1]   动作: getInnCook
  62264: this.bookBag = e.cookBook;
  62377: this.bookBag = e.cookBook;
  62586: for (var u = 0; u < e.cookBook.length; u++) if (this.bookBag.indexOf(e.cookBook[u]) < 0) {
  62587: var f = i.getItem(e.cookBook[u], "cookbookconfig");
  62590: this.bookBag = e.cookBook;

## cookData   [object/usage-1]   动作: cookAccelerate,cookReceive,cookStart,cookUnlock
  62089: this.cookData = {};
  62419: for (var n in e.cookData) {
  62420: this.cookData[n] = e.cookData[n];
  62709: this.cookData = this.innData.cookList;
  62786: this.cookData = e.cookList;

## cookList   [array/name]   动作: getInnCookList
  62709: this.cookData = this.innData.cookList;
  62786: this.cookData = e.cookList;

## costDishMap   [object/name]   动作: getInn
  62687: this.costItems = e.costDishMap;

## currentDragonId   [number/fallback]   动作: getDragon
  27429: 1 == e.eRet && 0 != e.currentDragonId && (o = e);

## currentServerTime   [number/fallback]   动作: getSchoolTask
  113618: M.TimeMgr.sserverT = e.currentServerTime;

## digcellTaskRed   [number/fallback]   动作: getAllActivity
  57454: e.hasOwnProperty("digcellTaskRed") && u.RoleOtherInfo.setActivityData(79, e.digcellTaskRed);

## floor   [number/fallback]   动作: enterNextFloor,getTreasureFloor
  1726: t.HP = (o.hp.finalValue - o.hp.getLv1Conversion()) * Math.floor(12 - 2 * e) * .1;
  1727: t.MP = (o.mp.finalValue - o.mp.getLv1Conversion()) * Math.floor(12 - 2 * e) * .1;
  1728: t.Attack = (o.attack.finalValue - o.attack.getLv1Conversion()) * Math.floor(12 - 2 * e) * .1;
  1729: t.Hit = (o.hitChance.finalValue - o.hitChance.getLv1Conversion()) * Math.floor(12 - 2 * e) * .1;
  1730: t.Miss = (o.dodge.finalValue - o.dodge.getLv1Conversion()) * Math.floor(12 - 2 * e) * .1;

## foster_point   [number/fallback]   动作: resetChildFoster
  24640: e.hasOwnProperty("foster_point") && (c.MarryModel.childData.foster_point = e.foster_point);

## geNianshouTaskRed   [number/fallback]   动作: getAllActivity
  57448: e.hasOwnProperty("geNianshouTaskRed") && u.RoleOtherInfo.setActivityData(78, e.geNianshouTaskRed);

## geSchoolTaskRed   [number/fallback]   动作: getAllActivity
  57447: e.hasOwnProperty("geSchoolTaskRed") && (u.RoleOtherInfo.warmUpRed = e.geSchoolTaskRed);

## giftAwards   [number/fallback]   动作: refreshGiftAward
  131097: 1 == e.eRet && l.MessageCenter.dispatch(h.EvName.REFRESH_GIFT_STATE, e.giftAwards);

## giftDatas   [number/fallback]   动作: getAnniversaryPassGift,getNewGiftPermanent
  131054: data: e.giftDatas
  131115: data: e.giftDatas
  131119: data: e.giftDatas

## gn   [number/fallback]   动作: startEatByTable
  62612: this.guestNum = e.gn;
  62714: this.guestNum = this.innData.gn;

## goldArr   [array/name]   动作: passCardData
  55872: this.goldAy = e.goldArr;

## guestID   [number/fallback]   动作: marryAward
  77268: this.guestNpcAy.push(e.guestID);

## hookData   [object/name]   动作: changeWorldServer
  28127: I.HangUpModel.saveCrossData(e.hookData);

## hotVal   [number/fallback]   动作: redeemTable
  62376: this.hotVal = e.hotVal;
  62633: this.hotVal = e.hotVal;
  62671: this.hotVal = e.hotVal;
  62712: this._hotVal = this.innData.hotVal;
  62952: if (f.indexOf(g) < 0 && (m > 0 && u.indexOf(m) >= 0 || v > 0 && this.hotVal >= v || 0 == m && 0 == v)) {

## houseID   [number/fallback]   动作: marryHouse
  77224: var o = a.getBuildHouseObj(e.houseID);
  77226: this.marryHouseMap[e.houseID] = e.type;

## innRankList   [array/name]   动作: getInnRank
  62605: i.addComponent("HotRank").setData(e.innRankList);

## innSimShopDatas   [number/fallback]   动作: getInnShop
  62598: i.addComponent("InnShop").setData(e.innSimShopDatas);

## isStatus   [number/fallback]   动作: enterNextFloor,treasureAward
  55909: this.enterToScene(e.boxNum, e.isStatus);
  55915: this.showTipFlag = e.isStatus;
  55925: this.showTipFlag = e.isStatus;

## jigsawRed   [number/init-1]   动作: getAllActivity
  57449: e.hasOwnProperty("jigsawRed") && (u.RoleOtherInfo.jigsawRed = e.jigsawRed);
  107195: this.jigsawRed = 0;

## masterInfo   [object/name]   动作: getApplyInfo,getSchoolMaster,getSchoolPupil,getSchoolRoleInfo
  113941: e.hasOwnProperty("masterInfo") ? n.setBtns(e.masterInfo, 0) : e.hasOwnProperty("pupilInfo") ? n.setBtns(e.pupilInfo, 1) : e.hasOwnProperty("roleInfo") && (e.hasOwnPropert

## mhv   [number/fallback]   动作: redeemTable
  62378: this.maxHot = e.mhv;
  62635: this.maxHot = e.mhv;
  62672: this.maxHot = e.mhv;
  62713: this.maxHot = this.innData.mhv;

## newAcc   [number/fallback]   动作: changeServer
  23659: l.userAccount = o.newAccount.toString();
  23774: l.userAccount = o.newAccount.toString();
  23931: this.newAccount = "";
  23953: this.newAccount = "";
  23966: t.newAccount = o.newAcc;

## newID   [number/fallback]   动作: changeServer
  28138: s.RoleBaseInfo.roleID = this.crossData.newID;
  28162: s.RoleBaseInfo.roleID = e.newID;
  111132: this.saveRoleDriverState(p.RoleBaseInfo.roleID, t.newID);
  111135: p.RoleBaseInfo.roleID = t.newID;

## openSchoolFirstTryBgUI   [number/fallback]   动作: quitSchool
  113728: 0 == t && o.openSchoolFirstTryBgUI(e);
  113729: }) : this.openSchoolFirstTryBgUI(e);
  113738: t.prototype.openSchoolFirstTryBgUI = function(t) {

## option   [number/init-1]   动作: getChatPkAiSet,setChatPkOption
  24029: this.chatPkOption = e.option;
  28533: this.option = 0;
  28551: this.option = e.option;
  28556: this.option = e.option;
  28557: r.MessageCenter.dispatch(l.EvName.SET_CHAT_PK_OPTION, e.option);

## passMeritRewardState   [number/fallback]   动作: getMasterPupilList
  132518: e.hasOwnProperty("passMeritRewardState") && (n = e.passMeritRewardState);

## pass_levelID   [number/fallback]   动作: buyInvitationCard
  55887: this.cardState = e.pass_levelID;
  55888: i.MessageCenter.dispatch(r.EvName.PAY_GOLD_INVITE, e.pass_levelID);

## playArr   [object/usage-1]   动作: resetChildFoster
  24641: e.hasOwnProperty("playArr") && (c.MarryModel.childData.playArr = e.playArr);
  77090: this.childData.playArr[t] += e;

## productList   [object/init-1]   动作: getInnProductList
  62094: this.productList = {};
  62721: this.productList = this.innData.productList;
  62795: this.productList = e.productList;
  62939: var t = y.TimeMgr.getSTimestamp(), e = !1, o = 0, n = this.productList;

## progree   [number/fallback]   动作: endPlayGame
  24683: 100 == e.progree && c.MarryModel.setPlayAttData(this.playType, 1);

## pupilInfo   [object/name]   动作: getApplyInfo,getSchoolMaster,getSchoolPupil,getSchoolRoleInfo
  113941: e.hasOwnProperty("masterInfo") ? n.setBtns(e.masterInfo, 0) : e.hasOwnProperty("pupilInfo") ? n.setBtns(e.pupilInfo, 1) : e.hasOwnProperty("roleInfo") && (e.hasOwnPropert

## roleList   [object/usage-1]   动作: getMasterPupilList
  132520: for (var s in e.roleList) {
  132521: var l = e.roleList[s];

## schoolTitle   [number/fallback]   动作: intoSchoolSquare
  64534: e.prototype.schoolTitleID = function(t) {
  76840: 9 != c && (o.title = 4 == p ? i.getText(r.InventoryDB.schoolTitleID(c)) : 5 == p ? h + i.getText(r.InventoryDB.schoolTitleID(9)) : 6 == p ? h + i.getText(r.InventoryDB.sc
  111833: e.hasOwnProperty("schoolTitle") && (d.RoleOtherInfo.hastitleLevel = e.schoolTitle);
  114500: e.hasOwnProperty("schoolTitle") && (h.RoleOtherInfo.hastitleLevel = e.schoolTitle);

## sendurl   [number/fallback]   动作: changeWorldServer
  28126: o.oldUrlAll = e.sendurl;

## shopActiveList   [array/name]   动作: GetShopAllActive
  131273: this.shopActiveData = e.shopActiveList;
  131276: l.MessageCenter.dispatch(h.EvName.STORE_ACTIVE_LIST_UI, e.shopActiveList);

## shopObj   [object/name]   动作: getHlexchangeShop
  47077: 1 == e.eRet && i.MessageCenter.dispatch(r.EvName.EXCHANGE_SHOP_DATA, e.shopObj);
  56094: if (1 == e.eRet && e.hasOwnProperty("shopObj") && !cc.js.isEmptyObject(e.shopObj)) c.default.prefabs.load("homeSim/InnManage/InnExchangeShop", cc.Prefab, function(t, i) {
  56096: r.addComponent("HalloweenChangeShop").setDatas(e.shopObj, o.npcID);

## showRewardPop   [number/fallback]   动作: getInn
  62688: this.offlineHot = e.showRewardPop;

## supportCamp   [number/fallback]   动作: getAllActivity
  57453: e.hasOwnProperty("supportCamp") && u.RoleOtherInfo.setActivityData(68, e.supportCamp);
  107266: e.hasOwnProperty("supportCamp") && (this.activityObj[68] = e.supportCamp);

## sycn   [number/fallback]   动作: setPlayerCardMoutsSycn
  59566: SYCNPLAYERITEAMDATA: "User.sycnPlayerItemData",
  59640: SYCN_TASK: "User.sycnTask",
  106710: v.RoleOtherInfo.isSyncMount = 1 == this.roleInfo.sycnType;
  132087: g.RoleOtherInfo.isSyncMount = 1 == e.sycn;
  133217: r.MessageCenter.on(s.HttpConst.SYCN_TASK, this.sycnTaskCallBack, this);

## tableEndTime   [number/fallback]   动作: getInn
  62681: this.openTime[1] = e.tableEndTime;

## tableList   [array/name]   动作: endEatByTable
  62626: this.tablesData = e.tableList;
  62722: this.tablesData = this.innData.tableList;

## tableStartTime   [number/fallback]   动作: getInn
  62680: this.openTime[0] = e.tableStartTime;

## transGiftShow   [number/fallback]   动作: getAllActivity
  57457: u.RoleOtherInfo.setActivityData(80, e.transGiftShow);
  111873: d.RoleOtherInfo.setActivityData(80, e.transGiftShow);

## unlockDish   [number/fallback]   动作: dishUnlock,getInnCook
  62093: this.unlockDishData = {};
  62251: for (var o = e.unlockDish, a = 0, l = 0; l < o.length; l++) this.unlockDishData.indexOf(o[l]) < 0 && (a = o[l]);
  62256: this.unlockDishData = e.unlockDish;
  62263: this.unlockDishData = e.unlockDish;
  62723: this.unlockDishData = this.innData.unlockDish;

## xyTodaySchoolId   [number/fallback]   动作: getSchoolTask
  113617: this.beforeSchool = parseInt(e.xyTodaySchoolId);
