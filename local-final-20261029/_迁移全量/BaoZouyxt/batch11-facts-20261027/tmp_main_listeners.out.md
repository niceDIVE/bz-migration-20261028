# C10 九键回调体 · 主审自检摘录（tools\index.js，逐行原文，超长行已截断）

## OBTAINCROP
### L57698 [下行回调]
L57698| r.MessageCenter.on(s.HttpConst.OBTAINCROP, function(t, o) {
L57699| if (1 == o.eRet) {
L57700| e.soilArr[o.sIdx] = {
L57701| s: 1
L57702| };
L57703| var i = {
L57704| s: 1,
L57705| landId: 0
L57706| };
L57707| i.landId = o.sIdx;
L57708| r.MessageCenter.dispatch(c.EvName.SEED_CROP_EVENT, i);
L57709| var n = {};
L57710| o.hasOwnProperty("exp") && (e.plantSeedData.plantExp = o.exp);
L57711| o.hasOwnProperty("aExp") && (n[7] = o.aExp);
L57712| if (o.hasOwnProperty("rewardArray")) for (var a in o.rewardArray) n[a] = o.rewardArray[a];
L57713| I.MadUtilsTS.isNullObj(n) || m.default.addShowRewardUI1(n, 0);
L57714| } else if (3 == o.eRet) {
L57715| e.soilArr[o.sIdx].m.s = 0;
L57716| var s = {
L57717| s: 0,
L57718| landId: 0,
L57719| m: {}
L57720| };
L57721| s.landId = o.sIdx;
L57722| s.m.s = 0;
L57723| r.MessageCenter.dispatch(c.EvName.SEED_CROP_EVENT, s);
L57724| }
L57725| }, this);
L57726| r.MessageCenter.on(s.HttpConst.ONE_KEY_OBTAIN_CROP, function(o, i) {
L57727| if (1 == i.eRet) {
L57728| i.hasOwnProperty("matureArr") && Promise.resolve().then(function() {
L57729| return t("../../scripts3/model3/DelegateModel");
L57730| }).then(function(t) {
L57731| t.DelegateModel.matureArr = i.matureArr;
L57732| });
L57733| r.MessageCenter.dispatch(c.EvName.REMOVE_PLANT_FITLER_UI);
L57734| var s = [];
L57735| if (i.obtainLands.length <= 0) {
L57736| a.default.show(n.getText(69193));
L57737| return;
L57738| }
L57739| for (var l = 0; l < i.obtainLands.length; l++) {
L57740| e.soilArr[i.obtainLands[l]] = {
L57741| s: 1
L57742| };
L57743| var p = {
L57744| s: 1,
L57745| landId: 0
L57746| };
L57747| p.landId = i.obtainLands[l];
L57748| s.push(p);
L57749| }
L57750| r.MessageCenter.dispatch(c.EvName.MULTIP_SEED_CROP, s);
L57751| var h = {};
L57752| i.hasOwnProperty("exp") && (e.plantSeedData.plantExp = i.exp);
L57753| i.hasOwnProperty("aExp") && i.aExp > 0 && (h[7] = i.aExp);
L57754| if (i.hasOwnProperty("rewardArray")) for (var u in i.rewardArray) h[u] = i.rewardArray[u];
L57755| I.MadUtilsTS.isNullObj(h) || m.default.addShowRewardUI1(h, 0);
L57756| } else 2 == i.eRet ? a.default.show(n.getText(6000449)) : i.eRet;
L57757| }, this);

### L58159 [发送点]
L58159| v.NetMgr.http.sendRequest(s.HttpConst.OBTAINCROP, {
L58160| sIdx: t
L58161| });
L58162| };
L58163| e.prototype.reqHomeSpecialEvent = function() {
L58164| v.NetMgr.http.sendRequest(s.HttpConst.HOME_SPECIAL_AWARD, {});
L58165| };
L58166| e.prototype.reqRecommenList = function() {
L58167| this.homeGeMap = {};
L58168| v.NetMgr.http.sendRequest(s.HttpConst.RECOMMEND_ONESELF_HOME, {});
L58169| };
L58170| e.prototype.reqHomeFriendList = function() {
L58171| this.homeGeMap = {};
L58172| v.NetMgr.http.sendRequest(s.HttpConst.OTHER_PLAYER_HOME, {});
L58173| };
L58174| e.prototype.reqObtainAllCrop = function(t) {
L58175| var e = {
L58176| matureArr: t
L58177| };
L58178| v.NetMgr.http.sendRequest(s.HttpConst.ONE_KEY_OBTAIN_CROP, e);

## STEAL_CROP_EVENT
### L58007 [下行回调]
L58007| r.MessageCenter.on(s.HttpConst.STEAL_CROP_EVENT, function(t, o) {
L58008| if (1 == o.eRet || 3 == o.eRet || 4 == o.eRet) {
L58009| var s = {
L58010| m: {},
L58011| s: 1,
L58012| b: {}
L58013| };
L58014| o.crop.hasOwnProperty("m") && (s.m = o.crop.m);
L58015| o.crop.hasOwnProperty("b") ? s.b = o.crop.b : delete s.b;
L58016| e.soilArr[o.idx] = s;
L58017| var l = {
L58018| m: {},
L58019| s: 1,
L58020| landId: 0
L58021| };
L58022| l.m = s.m;
L58023| s.hasOwnProperty("b") && (l.b = s.b);
L58024| l.landId = o.idx;
L58025| r.MessageCenter.dispatch(c.EvName.SEED_CROP_EVENT, l);
L58026| var p = {};
L58027| o.hasOwnProperty("exp") && (e.plantSeedData.plantExp = o.exp);
L58028| o.hasOwnProperty("aExp") && (p[7] = o.aExp);
L58029| if (o.hasOwnProperty("rewardArray")) for (var h in o.rewardArray) p[h] = o.rewardArray[h];
L58030| I.MadUtilsTS.isNullObj(p) || m.default.addShowRewardUI1(p, 0);
L58031| } else if (2 == o.eRet) {
L58032| e.soilArr[o.idx] = {
L58033| s: 1
L58034| };
L58035| var u = {
L58036| s: 1,
L58037| landId: 0
L58038| };
L58039| u.landId = o.idx;
L58040| r.MessageCenter.dispatch(c.EvName.SEED_CROP_EVENT, u);
L58041| a.default.show(n.getText(3317));
L58042| } else if (5 == o.eRet) {
L58043| var f = i.getItem(7, "home_plant_details").num;
L58044| a.default.show(n.getText(3176).replace(/\[1\]/, f));
L58045| } else -1 == o.eRet && a.default.show(n.getText(3320));
L58046| }, this);
L58047| r.MessageCenter.on(s.HttpConst.LOOK_DOG_LOG, function(t, e) {
L58048| 1 == e.eRet && e.hasOwnProperty("log") && r.MessageCenter.dispatch(c.EvName.HOME_LOG_EVENT, e.log);
L58049| }, this);
L58050| r.MessageCenter.on(s.HttpConst.DOG_BATTLE_RESULT, function(t, o) {
L58051| 1 == o.eRet && o.win && e.setDogCurState(0, o.endTime);
L58052| }, this);
L58053| r.MessageCenter.on(s.HttpConst.FEED_DOG, function(t, o) {
L58054| if (1 == o.eRet) {
L58055| o.hasOwnProperty("progress") && (e.dogData.p = o.progress);
L58056| o.hasOwnProperty("bigDog") && (e.dogData.id = o.bigDog);
L58057| r.MessageCenter.dispatch(c.EvName.FEED_DOG_EVENT, {});
L58058| } else o.eRet;
L58059| }, this);
L58060| };
L58061| e.prototype.reqBuildFarm = function(t, e) {
L58062| var o = "";
L58063| if (l.RoleOtherInfo.homeFarmId > 0) {
L58064| var r = i.getItem(28, "home_plant_details");
L58065| o = n.getText(3228).replace(/\[1\]/, r.num);
L58066| var s = this;

### L58218 [发送点]
L58218| v.NetMgr.http.sendRequest(s.HttpConst.STEAL_CROP_EVENT, {
L58219| fid: this.curFriendId,
L58220| idx: t
L58221| });
L58222| };
L58223| e.prototype.reqLookDogLog = function(t) {
L58224| v.NetMgr.http.sendRequest(s.HttpConst.LOOK_DOG_LOG, {
L58225| type: t
L58226| });
L58227| };
L58228| e.prototype.reqFeedDog = function(t, e) {
L58229| v.NetMgr.http.sendRequest(s.HttpConst.FEED_DOG, {
L58230| propID: t,
L58231| propnum: e
L58232| });
L58233| };
L58234| e.prototype.reqResultFight = function(t) {
L58235| var e = h.UserModel.entity, o = {
L58236| fID: this.curFriendId,
L58237| dogID: this.dogData.id,

## CROP_CHANGE_STATE
### L57676 [下行回调]
L57676| r.MessageCenter.on(s.HttpConst.CROP_CHANGE_STATE, function(t, o) {
L57677| if (1 == o.eRet || 3 == o.eRet) {
L57678| var i = {
L57679| m: {},
L57680| s: 1,
L57681| b: {}
L57682| };
L57683| o.crop.hasOwnProperty("m") && (i.m = o.crop.m);
L57684| o.crop.hasOwnProperty("b") && (i.b = o.crop.b);
L57685| e.soilArr[o.sIdx] = i;
L57686| var s = {
L57687| m: {},
L57688| s: 1,
L57689| landId: 0,
L57690| b: {}
L57691| };
L57692| s.m = i.m;
L57693| s.b = i.b;
L57694| s.landId = o.sIdx;
L57695| r.MessageCenter.dispatch(c.EvName.SEED_CROP_EVENT, s);
L57696| } else -1 == o.eRet && a.default.show(n.getText(3320));
L57697| }, this);
L57698| r.MessageCenter.on(s.HttpConst.OBTAINCROP, function(t, o) {
L57699| if (1 == o.eRet) {
L57700| e.soilArr[o.sIdx] = {
L57701| s: 1
L57702| };
L57703| var i = {
L57704| s: 1,
L57705| landId: 0
L57706| };
L57707| i.landId = o.sIdx;
L57708| r.MessageCenter.dispatch(c.EvName.SEED_CROP_EVENT, i);
L57709| var n = {};
L57710| o.hasOwnProperty("exp") && (e.plantSeedData.plantExp = o.exp);
L57711| o.hasOwnProperty("aExp") && (n[7] = o.aExp);
L57712| if (o.hasOwnProperty("rewardArray")) for (var a in o.rewardArray) n[a] = o.rewardArray[a];
L57713| I.MadUtilsTS.isNullObj(n) || m.default.addShowRewardUI1(n, 0);
L57714| } else if (3 == o.eRet) {
L57715| e.soilArr[o.sIdx].m.s = 0;
L57716| var s = {
L57717| s: 0,
L57718| landId: 0,
L57719| m: {}
L57720| };
L57721| s.landId = o.sIdx;
L57722| s.m.s = 0;
L57723| r.MessageCenter.dispatch(c.EvName.SEED_CROP_EVENT, s);
L57724| }
L57725| }, this);
L57726| r.MessageCenter.on(s.HttpConst.ONE_KEY_OBTAIN_CROP, function(o, i) {
L57727| if (1 == i.eRet) {
L57728| i.hasOwnProperty("matureArr") && Promise.resolve().then(function() {
L57729| return t("../../scripts3/model3/DelegateModel");
L57730| }).then(function(t) {
L57731| t.DelegateModel.matureArr = i.matureArr;
L57732| });
L57733| r.MessageCenter.dispatch(c.EvName.REMOVE_PLANT_FITLER_UI);
L57734| var s = [];
L57735| if (i.obtainLands.length <= 0) {

### L58126 [发送点]
L58126| this.curFriendId > 0 ? v.NetMgr.http.sendRequest(s.HttpConst.CROP_CHANGE_STATE, {
L58127| sIdx: t,
L58128| fid: this.curFriendId
L58129| }, null, !1) : v.NetMgr.http.sendRequest(s.HttpConst.CROP_CHANGE_STATE, {
L58130| sIdx: t
L58131| }, null, !1);
L58132| };
L58133| e.prototype.reqReclaimLand = function(t) {
L58134| v.NetMgr.http.sendRequest(s.HttpConst.RECLAIM_LAND, {
L58135| sIdx: t
L58136| });
L58137| };
L58138| e.prototype.reqCleanCrop = function(t) {
L58139| v.NetMgr.http.sendRequest(s.HttpConst.CLEAN_DEAD_CROP, {
L58140| sIdx: t
L58141| });
L58142| };
L58143| e.prototype.reqAccelarteCrop = function(t) {
L58144| v.NetMgr.http.sendRequest(s.HttpConst.EXPEDITE_CROP, {
L58145| sIdx: t,

### L58129 [发送点]
L58129| }, null, !1) : v.NetMgr.http.sendRequest(s.HttpConst.CROP_CHANGE_STATE, {
L58130| sIdx: t
L58131| }, null, !1);
L58132| };
L58133| e.prototype.reqReclaimLand = function(t) {
L58134| v.NetMgr.http.sendRequest(s.HttpConst.RECLAIM_LAND, {
L58135| sIdx: t
L58136| });
L58137| };
L58138| e.prototype.reqCleanCrop = function(t) {
L58139| v.NetMgr.http.sendRequest(s.HttpConst.CLEAN_DEAD_CROP, {
L58140| sIdx: t
L58141| });
L58142| };
L58143| e.prototype.reqAccelarteCrop = function(t) {
L58144| v.NetMgr.http.sendRequest(s.HttpConst.EXPEDITE_CROP, {
L58145| sIdx: t,
L58146| num: 1
L58147| });
L58148| };

## EXPEDITE_CROP
### L57825 [下行回调]
L57825| r.MessageCenter.on(s.HttpConst.EXPEDITE_CROP, function(t, o) {
L57826| if (1 == o.eRet) {
L57827| var i = {
L57828| m: {},
L57829| s: 1,
L57830| b: {}
L57831| };
L57832| o.crop.hasOwnProperty("m") && (i.m = o.crop.m);
L57833| o.crop.hasOwnProperty("b") && (i.b = o.crop.b);
L57834| e.soilArr[o.sIdx] = i;
L57835| var s = {
L57836| m: {},
L57837| s: 1,
L57838| landId: 0,
L57839| b: {}
L57840| };
L57841| s.m = i.m;
L57842| s.b = i.b;
L57843| s.landId = o.sIdx;
L57844| r.MessageCenter.dispatch(c.EvName.SEED_CROP_EVENT, s);
L57845| } else 2 == o.eRet ? a.default.show(n.getText(1455)) : 3 == o.eRet ? a.default.show(n.getText(1455)) : -1 == o.eRet ? a.default.show(n.getText(3320)) : 6 == o.eRet && a.default.show(n.getText(3248));
L57846| }, this);
L57847| r.MessageCenter.on(s.HttpConst.GET_BACK_SHOP, function(t, o) {
L57848| if (1 == o.eRet) if (o.hasOwnProperty("shopArr")) {
L57849| o.hasOwnProperty("limit") && (e.shopSaleLimit = o.limit);
L57850| null == e.homeShopBgUI && f.default.prefabs.load("comUI/ShopBgUI", cc.Prefab, function(t, i) {
L57851| var n = cc.instantiate(i);
L57852| d.PopUpMgr.addPopUp(n, g.LayerMgr.popUpLayer);
L57853| n.addComponent("HomeShopBgUI").setData(o.shopArr);
L57854| e.homeShopBgUI = n;
L57855| });
L57856| } else a.default.show(n.getText(3325)); else a.default.show(n.getText(3325));
L57857| }, this);
L57858| r.MessageCenter.on(s.HttpConst.BUY_HOME_CROP, function(t, o) {
L57859| if (1 == o.eRet) {
L57860| I.MadUtilsTS.isNullObj(o.rewardArray) || m.default.addShowRewardUI1(o.rewardArray, 0);
L57861| o.hasOwnProperty("limit") && (e.shopSaleLimit = o.limit);
L57862| r.MessageCenter.dispatch(c.EvName.CROP_SALE_SHOP, o);
L57863| }
L57864| }, this);
L57865| r.MessageCenter.on(s.HttpConst.HOME_SPECIAL_AWARD, function(t, e) {
L57866| r.MessageCenter.dispatch(c.EvName.REMOVE_SEARCH_HOME_UI);
L57867| if (1 == e.eRet && e.hasOwnProperty("eid") && e.hasOwnProperty("rewardArray")) {
L57868| var o = {
L57869| itemId: 0,
L57870| num: 0
L57871| };
L57872| for (var i in e.rewardArray) {
L57873| o.itemId = i;
L57874| o.num = e.rewardArray[i];
L57875| }
L57876| y.PlantSystemMgr.productHomeEvent(e.eid, o);
L57877| }
L57878| }, this);
L57879| r.MessageCenter.on(s.HttpConst.RECOMMEND_ONESELF_HOME, function(t, o) {
L57880| if (1 == o.eRet) {
L57881| o.hasOwnProperty("homeGeMap") && (e.homeGeMap = o.homeGeMap);
L57882| if (o.hasOwnProperty("homeArr")) {
L57883| e.searchType = 0;
L57884| var i = o.homeArr;

### L58144 [发送点]
L58144| v.NetMgr.http.sendRequest(s.HttpConst.EXPEDITE_CROP, {
L58145| sIdx: t,
L58146| num: 1
L58147| });
L58148| };
L58149| e.prototype.reqGetSaleShop = function() {
L58150| v.NetMgr.http.sendRequest(s.HttpConst.GET_BACK_SHOP, {});
L58151| };
L58152| e.prototype.reqBuyHomeCrop = function(t, e) {
L58153| v.NetMgr.http.sendRequest(s.HttpConst.BUY_HOME_CROP, {
L58154| itemID: t,
L58155| itemNum: e
L58156| });
L58157| };
L58158| e.prototype.reqCropGainReward = function(t) {
L58159| v.NetMgr.http.sendRequest(s.HttpConst.OBTAINCROP, {
L58160| sIdx: t
L58161| });
L58162| };
L58163| e.prototype.reqHomeSpecialEvent = function() {

## CLEAN_DEAD_CROP
### L57811 [下行回调]
L57811| r.MessageCenter.on(s.HttpConst.CLEAN_DEAD_CROP, function(t, o) {
L57812| if (1 == o.eRet) {
L57813| e.soilArr[o.sIdx] = {
L57814| s: 1
L57815| };
L57816| var i = {
L57817| s: 1,
L57818| landId: 0
L57819| };
L57820| i.landId = o.sIdx;
L57821| r.MessageCenter.dispatch(c.EvName.SEED_CROP_EVENT, i);
L57822| a.default.show(n.getText(3171));
L57823| }
L57824| }, this);
L57825| r.MessageCenter.on(s.HttpConst.EXPEDITE_CROP, function(t, o) {
L57826| if (1 == o.eRet) {
L57827| var i = {
L57828| m: {},
L57829| s: 1,
L57830| b: {}
L57831| };
L57832| o.crop.hasOwnProperty("m") && (i.m = o.crop.m);
L57833| o.crop.hasOwnProperty("b") && (i.b = o.crop.b);
L57834| e.soilArr[o.sIdx] = i;
L57835| var s = {
L57836| m: {},
L57837| s: 1,
L57838| landId: 0,
L57839| b: {}
L57840| };
L57841| s.m = i.m;
L57842| s.b = i.b;
L57843| s.landId = o.sIdx;
L57844| r.MessageCenter.dispatch(c.EvName.SEED_CROP_EVENT, s);
L57845| } else 2 == o.eRet ? a.default.show(n.getText(1455)) : 3 == o.eRet ? a.default.show(n.getText(1455)) : -1 == o.eRet ? a.default.show(n.getText(3320)) : 6 == o.eRet && a.default.show(n.getText(3248));
L57846| }, this);
L57847| r.MessageCenter.on(s.HttpConst.GET_BACK_SHOP, function(t, o) {
L57848| if (1 == o.eRet) if (o.hasOwnProperty("shopArr")) {
L57849| o.hasOwnProperty("limit") && (e.shopSaleLimit = o.limit);
L57850| null == e.homeShopBgUI && f.default.prefabs.load("comUI/ShopBgUI", cc.Prefab, function(t, i) {
L57851| var n = cc.instantiate(i);
L57852| d.PopUpMgr.addPopUp(n, g.LayerMgr.popUpLayer);
L57853| n.addComponent("HomeShopBgUI").setData(o.shopArr);
L57854| e.homeShopBgUI = n;
L57855| });
L57856| } else a.default.show(n.getText(3325)); else a.default.show(n.getText(3325));
L57857| }, this);
L57858| r.MessageCenter.on(s.HttpConst.BUY_HOME_CROP, function(t, o) {
L57859| if (1 == o.eRet) {
L57860| I.MadUtilsTS.isNullObj(o.rewardArray) || m.default.addShowRewardUI1(o.rewardArray, 0);
L57861| o.hasOwnProperty("limit") && (e.shopSaleLimit = o.limit);
L57862| r.MessageCenter.dispatch(c.EvName.CROP_SALE_SHOP, o);
L57863| }
L57864| }, this);
L57865| r.MessageCenter.on(s.HttpConst.HOME_SPECIAL_AWARD, function(t, e) {
L57866| r.MessageCenter.dispatch(c.EvName.REMOVE_SEARCH_HOME_UI);
L57867| if (1 == e.eRet && e.hasOwnProperty("eid") && e.hasOwnProperty("rewardArray")) {
L57868| var o = {
L57869| itemId: 0,
L57870| num: 0

### L58139 [发送点]
L58139| v.NetMgr.http.sendRequest(s.HttpConst.CLEAN_DEAD_CROP, {
L58140| sIdx: t
L58141| });
L58142| };
L58143| e.prototype.reqAccelarteCrop = function(t) {
L58144| v.NetMgr.http.sendRequest(s.HttpConst.EXPEDITE_CROP, {
L58145| sIdx: t,
L58146| num: 1
L58147| });
L58148| };
L58149| e.prototype.reqGetSaleShop = function() {
L58150| v.NetMgr.http.sendRequest(s.HttpConst.GET_BACK_SHOP, {});
L58151| };
L58152| e.prototype.reqBuyHomeCrop = function(t, e) {
L58153| v.NetMgr.http.sendRequest(s.HttpConst.BUY_HOME_CROP, {
L58154| itemID: t,
L58155| itemNum: e
L58156| });
L58157| };
L58158| e.prototype.reqCropGainReward = function(t) {

## DISPOSS_HOME_EVENT
### L57979 [下行回调]
L57979| r.MessageCenter.on(s.HttpConst.DISPOSS_HOME_EVENT, function(t, o) {
L57980| if (o.hasOwnProperty("crop")) {
L57981| var i = {
L57982| m: {},
L57983| s: 1,
L57984| b: {}
L57985| };
L57986| o.crop.hasOwnProperty("m") && (i.m = o.crop.m);
L57987| o.crop.hasOwnProperty("b") && (i.b = o.crop.b);
L57988| e.soilArr[o.idx] = i;
L57989| var s = {
L57990| m: {},
L57991| s: 1,
L57992| landId: 0,
L57993| b: {}
L57994| };
L57995| s.m = i.m;
L57996| s.b = i.b;
L57997| s.landId = o.idx;
L57998| r.MessageCenter.dispatch(c.EvName.SEED_CROP_EVENT, s);
L57999| var l = {};
L58000| o.hasOwnProperty("exp") && o.exp > 0 && (e.plantSeedData.plantExp = o.exp);
L58001| o.hasOwnProperty("aExp") && (l[7] = o.aExp);
L58002| if (o.hasOwnProperty("rewardArray")) for (var p in o.rewardArray) l[p] = o.rewardArray[p];
L58003| I.MadUtilsTS.isNullObj(l) ? 0 == o.flag && a.default.show(n.getText(3268)) : m.default.addShowRewardUI1(l, 0);
L58004| }
L58005| 2 == o.eRet ? a.default.show(n.getText(3268)) : 3 == o.eRet ? a.default.show(n.getText(3317)) : -1 == o.eRet && a.default.show(n.getText(3320));
L58006| }, this);
L58007| r.MessageCenter.on(s.HttpConst.STEAL_CROP_EVENT, function(t, o) {
L58008| if (1 == o.eRet || 3 == o.eRet || 4 == o.eRet) {
L58009| var s = {
L58010| m: {},
L58011| s: 1,
L58012| b: {}
L58013| };
L58014| o.crop.hasOwnProperty("m") && (s.m = o.crop.m);
L58015| o.crop.hasOwnProperty("b") ? s.b = o.crop.b : delete s.b;
L58016| e.soilArr[o.idx] = s;
L58017| var l = {
L58018| m: {},
L58019| s: 1,
L58020| landId: 0
L58021| };
L58022| l.m = s.m;
L58023| s.hasOwnProperty("b") && (l.b = s.b);
L58024| l.landId = o.idx;
L58025| r.MessageCenter.dispatch(c.EvName.SEED_CROP_EVENT, l);
L58026| var p = {};
L58027| o.hasOwnProperty("exp") && (e.plantSeedData.plantExp = o.exp);
L58028| o.hasOwnProperty("aExp") && (p[7] = o.aExp);
L58029| if (o.hasOwnProperty("rewardArray")) for (var h in o.rewardArray) p[h] = o.rewardArray[h];
L58030| I.MadUtilsTS.isNullObj(p) || m.default.addShowRewardUI1(p, 0);
L58031| } else if (2 == o.eRet) {
L58032| e.soilArr[o.idx] = {
L58033| s: 1
L58034| };
L58035| var u = {
L58036| s: 1,
L58037| landId: 0
L58038| };

### L58215 [发送点]
L58215| v.NetMgr.http.sendRequest(s.HttpConst.DISPOSS_HOME_EVENT, e);
L58216| };
L58217| e.prototype.reqStealCrop = function(t) {
L58218| v.NetMgr.http.sendRequest(s.HttpConst.STEAL_CROP_EVENT, {
L58219| fid: this.curFriendId,
L58220| idx: t
L58221| });
L58222| };
L58223| e.prototype.reqLookDogLog = function(t) {
L58224| v.NetMgr.http.sendRequest(s.HttpConst.LOOK_DOG_LOG, {
L58225| type: t
L58226| });
L58227| };
L58228| e.prototype.reqFeedDog = function(t, e) {
L58229| v.NetMgr.http.sendRequest(s.HttpConst.FEED_DOG, {
L58230| propID: t,
L58231| propnum: e
L58232| });
L58233| };
L58234| e.prototype.reqResultFight = function(t) {

## ONE_KEY_OBTAIN_CROP
### L57726 [下行回调]
L57726| r.MessageCenter.on(s.HttpConst.ONE_KEY_OBTAIN_CROP, function(o, i) {
L57727| if (1 == i.eRet) {
L57728| i.hasOwnProperty("matureArr") && Promise.resolve().then(function() {
L57729| return t("../../scripts3/model3/DelegateModel");
L57730| }).then(function(t) {
L57731| t.DelegateModel.matureArr = i.matureArr;
L57732| });
L57733| r.MessageCenter.dispatch(c.EvName.REMOVE_PLANT_FITLER_UI);
L57734| var s = [];
L57735| if (i.obtainLands.length <= 0) {
L57736| a.default.show(n.getText(69193));
L57737| return;
L57738| }
L57739| for (var l = 0; l < i.obtainLands.length; l++) {
L57740| e.soilArr[i.obtainLands[l]] = {
L57741| s: 1
L57742| };
L57743| var p = {
L57744| s: 1,
L57745| landId: 0
L57746| };
L57747| p.landId = i.obtainLands[l];
L57748| s.push(p);
L57749| }
L57750| r.MessageCenter.dispatch(c.EvName.MULTIP_SEED_CROP, s);
L57751| var h = {};
L57752| i.hasOwnProperty("exp") && (e.plantSeedData.plantExp = i.exp);
L57753| i.hasOwnProperty("aExp") && i.aExp > 0 && (h[7] = i.aExp);
L57754| if (i.hasOwnProperty("rewardArray")) for (var u in i.rewardArray) h[u] = i.rewardArray[u];
L57755| I.MadUtilsTS.isNullObj(h) || m.default.addShowRewardUI1(h, 0);
L57756| } else 2 == i.eRet ? a.default.show(n.getText(6000449)) : i.eRet;
L57757| }, this);
L57758| r.MessageCenter.on(s.HttpConst.ONE_KEY_DISPOSS_HOME_EVENT, function(t, o) {
L57759| if (1 == o.eRet) {
L57760| var i = !1, s = [], l = o.cropMap;
L57761| if (cc.js.isEmptyObject(l)) {
L57762| a.default.show(n.getText(6000404));
L57763| return;
L57764| }
L57765| for (var p in l) if (cc.js.isEmptyObject(l[p])) {
L57766| i = !0;
L57767| e.soilArr[parseInt(p)] = {
L57768| s: 1
L57769| };
L57770| (h = {
L57771| s: 1,
L57772| landId: 0
L57773| }).landId = parseInt(p);
L57774| s.push(h);
L57775| } else {
L57776| var h, u = {
L57777| m: {},
L57778| s: 1,
L57779| b: {}
L57780| };
L57781| l[p].hasOwnProperty("m") && (u.m = l[p].m);
L57782| l[p].hasOwnProperty("b") && (u.b = l[p].b);
L57783| e.soilArr[parseInt(p)] = u;
L57784| (h = {
L57785| m: {},

### L58178 [发送点]
L58178| v.NetMgr.http.sendRequest(s.HttpConst.ONE_KEY_OBTAIN_CROP, e);
L58179| };
L58180| e.prototype.reqDispossAllEvent = function() {
L58181| v.NetMgr.http.sendRequest(s.HttpConst.ONE_KEY_DISPOSS_HOME_EVENT, {});
L58182| };
L58183| e.prototype.reqFindPlayerHome = function(t) {
L58184| t != _.RoleBaseInfo.userName ? v.NetMgr.http.sendRequest(s.HttpConst.FIND_OTHER_HOME, {
L58185| fName: t
L58186| }) : a.default.show(n.getText(4396));
L58187| };
L58188| e.prototype.openFriendHome = function(t, e, o) {
L58189| var i = 3;
L58190| 9 == o ? i = 2 : 15 == o && (i = 1);
L58191| this.homeType = i;
L58192| this.curHomeScene = e;
L58193| this.reqEnterFriendHome(t);
L58194| };
L58195| e.prototype.reqEnterFriendHome = function(t) {
L58196| this.isUpdateData = !1;
L58197| this.curFriendId = t;

## ONE_KEY_DISPOSS_HOME_EVENT
### L57758 [下行回调]
L57758| r.MessageCenter.on(s.HttpConst.ONE_KEY_DISPOSS_HOME_EVENT, function(t, o) {
L57759| if (1 == o.eRet) {
L57760| var i = !1, s = [], l = o.cropMap;
L57761| if (cc.js.isEmptyObject(l)) {
L57762| a.default.show(n.getText(6000404));
L57763| return;
L57764| }
L57765| for (var p in l) if (cc.js.isEmptyObject(l[p])) {
L57766| i = !0;
L57767| e.soilArr[parseInt(p)] = {
L57768| s: 1
L57769| };
L57770| (h = {
L57771| s: 1,
L57772| landId: 0
L57773| }).landId = parseInt(p);
L57774| s.push(h);
L57775| } else {
L57776| var h, u = {
L57777| m: {},
L57778| s: 1,
L57779| b: {}
L57780| };
L57781| l[p].hasOwnProperty("m") && (u.m = l[p].m);
L57782| l[p].hasOwnProperty("b") && (u.b = l[p].b);
L57783| e.soilArr[parseInt(p)] = u;
L57784| (h = {
L57785| m: {},
L57786| s: 1,
L57787| landId: 0,
L57788| b: {}
L57789| }).m = u.m;
L57790| h.b = u.b;
L57791| h.landId = parseInt(p);
L57792| s.push(h);
L57793| }
L57794| r.MessageCenter.dispatch(c.EvName.MULTIP_SEED_CROP, s);
L57795| var f = {};
L57796| o.hasOwnProperty("exp") && o.exp > 0 && (e.plantSeedData.plantExp = o.exp);
L57797| o.hasOwnProperty("aExp") && o.aExp > 0 && (f[7] = o.aExp);
L57798| if (o.hasOwnProperty("rewardArray")) for (var d in o.rewardArray) f[d] = o.rewardArray[d];
L57799| I.MadUtilsTS.isNullObj(f) ? 0 != o.flag || i ? i && a.default.show(n.getText(3171)) : a.default.show(n.getText(3268)) : m.default.addShowRewardUI1(f, 0);
L57800| }
L57801| }, this);
L57802| r.MessageCenter.on(s.HttpConst.RECLAIM_LAND, function(t, o) {
L57803| if (1 == o.eRet) {
L57804| e.soilArr[o.sIdx] = {
L57805| s: 1
L57806| };
L57807| r.MessageCenter.dispatch(c.EvName.HOME_LAND_EVENT, o.sIdx);
L57808| a.default.show(n.getText(3316));
L57809| }
L57810| }, this);
L57811| r.MessageCenter.on(s.HttpConst.CLEAN_DEAD_CROP, function(t, o) {
L57812| if (1 == o.eRet) {
L57813| e.soilArr[o.sIdx] = {
L57814| s: 1
L57815| };
L57816| var i = {
L57817| s: 1,

### L58181 [发送点]
L58181| v.NetMgr.http.sendRequest(s.HttpConst.ONE_KEY_DISPOSS_HOME_EVENT, {});
L58182| };
L58183| e.prototype.reqFindPlayerHome = function(t) {
L58184| t != _.RoleBaseInfo.userName ? v.NetMgr.http.sendRequest(s.HttpConst.FIND_OTHER_HOME, {
L58185| fName: t
L58186| }) : a.default.show(n.getText(4396));
L58187| };
L58188| e.prototype.openFriendHome = function(t, e, o) {
L58189| var i = 3;
L58190| 9 == o ? i = 2 : 15 == o && (i = 1);
L58191| this.homeType = i;
L58192| this.curHomeScene = e;
L58193| this.reqEnterFriendHome(t);
L58194| };
L58195| e.prototype.reqEnterFriendHome = function(t) {
L58196| this.isUpdateData = !1;
L58197| this.curFriendId = t;
L58198| t > 0 && v.NetMgr.http.sendRequest(s.HttpConst.ENTER_OTHER_HOME, {
L58199| fid: t
L58200| });

## BATCH_SEED_CROP
### L57654 [下行回调]
L57654| r.MessageCenter.on(s.HttpConst.BATCH_SEED_CROP, function(t, o) {
L57655| if (1 == o.eRet) {
L57656| var i = [];
L57657| for (var n in o.crops) {
L57658| var a = parseInt(n), s = o.crops[n], l = {
L57659| m: {},
L57660| s: 1
L57661| };
L57662| s.m && Object.assign(l.m, s.m);
L57663| e.soilArr[a] = l;
L57664| var p = {
L57665| m: s.m,
L57666| s: 1,
L57667| landId: 0
L57668| };
L57669| p.landId = a;
L57670| i.push(p);
L57671| }
L57672| e.recentSs = o.recentSeeds;
L57673| r.MessageCenter.dispatch(c.EvName.BATCH_SEED_CROP_EVENT, i);
L57674| }
L57675| });
L57676| r.MessageCenter.on(s.HttpConst.CROP_CHANGE_STATE, function(t, o) {
L57677| if (1 == o.eRet || 3 == o.eRet) {
L57678| var i = {
L57679| m: {},
L57680| s: 1,
L57681| b: {}
L57682| };
L57683| o.crop.hasOwnProperty("m") && (i.m = o.crop.m);
L57684| o.crop.hasOwnProperty("b") && (i.b = o.crop.b);
L57685| e.soilArr[o.sIdx] = i;
L57686| var s = {
L57687| m: {},
L57688| s: 1,
L57689| landId: 0,
L57690| b: {}
L57691| };
L57692| s.m = i.m;
L57693| s.b = i.b;
L57694| s.landId = o.sIdx;
L57695| r.MessageCenter.dispatch(c.EvName.SEED_CROP_EVENT, s);
L57696| } else -1 == o.eRet && a.default.show(n.getText(3320));
L57697| }, this);
L57698| r.MessageCenter.on(s.HttpConst.OBTAINCROP, function(t, o) {
L57699| if (1 == o.eRet) {
L57700| e.soilArr[o.sIdx] = {
L57701| s: 1
L57702| };
L57703| var i = {
L57704| s: 1,
L57705| landId: 0
L57706| };
L57707| i.landId = o.sIdx;
L57708| r.MessageCenter.dispatch(c.EvName.SEED_CROP_EVENT, i);
L57709| var n = {};
L57710| o.hasOwnProperty("exp") && (e.plantSeedData.plantExp = o.exp);
L57711| o.hasOwnProperty("aExp") && (n[7] = o.aExp);
L57712| if (o.hasOwnProperty("rewardArray")) for (var a in o.rewardArray) n[a] = o.rewardArray[a];
L57713| I.MadUtilsTS.isNullObj(n) || m.default.addShowRewardUI1(n, 0);

### L58111 [发送点]
L58111| v.NetMgr.http.sendRequest(s.HttpConst.BATCH_SEED_CROP, {
L58112| seedCrops: o
L58113| });
L58114| };
L58115| e.prototype.reqMultiPlanting = function(t, e) {
L58116| for (var o = {}, i = 0, n = 0; n < this.soilArr.length; n++) if (!this.soilArr[n].m && this.soilArr[n].s > 0) {
L58117| o[n] = t;
L58118| if (++i >= e) break;
L58119| }
L58120| i < e && cc.error("数量不匹配？");
L58121| v.NetMgr.http.sendRequest(s.HttpConst.BATCH_SEED_CROP, {
L58122| seedCrops: o
L58123| });
L58124| };
L58125| e.prototype.reqRefrashSoild = function(t) {
L58126| this.curFriendId > 0 ? v.NetMgr.http.sendRequest(s.HttpConst.CROP_CHANGE_STATE, {
L58127| sIdx: t,
L58128| fid: this.curFriendId
L58129| }, null, !1) : v.NetMgr.http.sendRequest(s.HttpConst.CROP_CHANGE_STATE, {
L58130| sIdx: t

### L58121 [发送点]
L58121| v.NetMgr.http.sendRequest(s.HttpConst.BATCH_SEED_CROP, {
L58122| seedCrops: o
L58123| });
L58124| };
L58125| e.prototype.reqRefrashSoild = function(t) {
L58126| this.curFriendId > 0 ? v.NetMgr.http.sendRequest(s.HttpConst.CROP_CHANGE_STATE, {
L58127| sIdx: t,
L58128| fid: this.curFriendId
L58129| }, null, !1) : v.NetMgr.http.sendRequest(s.HttpConst.CROP_CHANGE_STATE, {
L58130| sIdx: t
L58131| }, null, !1);
L58132| };
L58133| e.prototype.reqReclaimLand = function(t) {
L58134| v.NetMgr.http.sendRequest(s.HttpConst.RECLAIM_LAND, {
L58135| sIdx: t
L58136| });
L58137| };
L58138| e.prototype.reqCleanCrop = function(t) {
L58139| v.NetMgr.http.sendRequest(s.HttpConst.CLEAN_DEAD_CROP, {
L58140| sIdx: t
