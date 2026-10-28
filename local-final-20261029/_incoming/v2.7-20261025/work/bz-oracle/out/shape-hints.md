# 应答字段消费方式（启发式【推断】）

488 个动作有线索；517 个字段不能用 0 兜底；444 个动作不能安全兜底。

## 不能安全兜底的动作（兜底时别回 eRet:1，或者把字段给全）

| 动作 | do 名 | 原因 |
|---|---|---|
| ACCEPTCIRCLETASK | User.acceptCircleTask | taskID 缺了会崩（index.js:133601,index.js:133619⚠,index.js:135011,index.js:135070⚠） |
| ACCEPT_SCHOOL_TASK | User.acceptSchoolTask | acceptSchoolTask 缺了会崩（index.js:113633,index.js:113634,index.js:113634⚠） |
| ACHV_CHANGE | achievement | nIds 缺了会崩（scripts3.js:2887,scripts3.js:2888⚠）；achieveRateId 缺了会崩（index.js:106883,index.js:106923⚠） |
| ACTIVE_TOWER_EVENT | User.activateTowerEvent | npcArr 缺了会崩（index.js:143820,index.js:143831,index.js:143831⚠,index.js:143832）；数据空会重发请求（scripts2.js:75126→index.js:138321） |
| ADD_CHANGE_BLOOD | User.AddChangeBlood | 数据空会重发请求（index.js:144151→index.js:144138） |
| ADD_CHILD_FOSTER | User.addChildFoster | playArr 缺了会崩（index.js:77090,index.js:77090⚠,scripts2.js:12255,scripts2.js:12255⚠） |
| ADD_EQUIP_LOCK | User.addEquipLock | equipLocks 缺了会崩（index.js:65072,index.js:65077⚠） |
| ADD_SEX_KILL | User.Addmaster | 数据空会重发请求（index.js:64357→index.js:64607） |
| ADOPTCHILD | User.adoptChild | childName 缺了会崩（index.js:24867,index.js:24867⚠,scripts2.js:66272,scripts2.js:66272⚠） |
| AFFILIATION_SCHOOL | User.affiliationSchool | upRoleSchoolLevel 缺了会崩（index.js:113701,index.js:113701⚠,index.js:113702,index.js:113702⚠）；数据空会重发请求（scripts2.js:15539→index.js:114047） |
| ALCHEMY_REWARD | User.alchemyReward | 数据空会重发请求（scripts3.js:7086） |
| ANN_PASS_FINISH_TASK | User.receiveAnniversaryPassTaskReward | dt 缺了会崩（scripts3.js:7880,scripts3.js:7880⚠） |
| ANN_PASS_GET_GIFT_DATA | User.getAnniversaryPassGift | giftDatas 缺了会崩（scripts3.js:30668,scripts3.js:30668⚠,scripts3.js:30755,scripts3.js:30755⚠） |
| BACK_TO_SELF_SERVER | User.backToSelfServer | 数据空会重发请求（index.js:28261→index.js:111099） |
| BATCH_SEED_CROP | User.batchSeedCrop | crops 缺了会崩（index.js:57657,index.js:57658⚠）；数据空会重发请求（scripts3.js:53090→index.js:58121） |
| BATTLE_END_REWARD | User.CheckBattleResult | equipObj 缺了会崩（index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠）；gemId 缺了会崩（scripts3.js:24429,scripts3.js:24429⚠,scripts3.js:24445） |
| BEGINCAST | User.beginCast | inherit 缺了会崩（index.js:102107,index.js:102107⚠）；数据空会重发请求（scripts2.js:60032→index.js:102160） |
| BEGINE_MAKE_MEDICINE | User.beginMakeMedicine | 数据空会重发请求（scripts2.js:60213→index.js:102184） |
| BEGINSAVE_NPC | User.BeginSaveNpc | npcIDArr 缺了会崩（index.js:90061,index.js:90061⚠）；数据空会重发请求（index.js:90190→index.js:90244） |
| BEGIN_LIST | User.BeginList | skill 缺了会崩（index.js:11967,index.js:11995⚠,index.js:120112,index.js:120114⚠） |
| BEGIN_MAKE_QUIP | User.beginMake | 数据空会重发请求（scripts2.js:60198→index.js:102172） |
| BEGIN_PLAY_GAME | User.beginPlayGame | childName 缺了会崩（index.js:24867,index.js:24867⚠,scripts2.js:66272,scripts2.js:66272⚠） |
| BEGIN_RECOVER_MP | User.BeginRecoverMP | 数据空会重发请求（scripts2.js:53213→index.js:138918） |
| BEGIN_WEDDING | User.beginWedding | proposeNpc 缺了会崩（index.js:77035,index.js:77036,index.js:77036⚠）；houseObj 缺了会崩（index.js:77226,index.js:77226⚠,index.js:77609）；happinessNum 缺了会崩（scripts3.js:58162,scripts3.js:58162⚠）；leaveNpc 缺了会崩（index.js:77043,index.js:77043⚠）；specialObj 缺了会崩（index.js:56734,index.js:56736,index.js:56736⚠,index.js:56740）；cycleObj 缺了会崩（index.js:77051,index.js:77052,index.js:77053,index.js:77057⚠） |
| BIRTHCHILD | User.birthChild | proposeNpc 缺了会崩（index.js:77035,index.js:77036,index.js:77036⚠）；houseObj 缺了会崩（index.js:77226,index.js:77226⚠,index.js:77609）；happinessNum 缺了会崩（scripts3.js:58162,scripts3.js:58162⚠）；leaveNpc 缺了会崩（index.js:77043,index.js:77043⚠）；specialObj 缺了会崩（index.js:56734,index.js:56736,index.js:56736⚠,index.js:56740）；cycleObj 缺了会崩（index.js:77051,index.js:77052,index.js:77053,index.js:77057⚠）；数据空会重发请求（index.js:77398） |
| BRING_SPECIAL_AWARD | User.bringSpecialAward | equipObj 缺了会崩（index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠） |
| BUILD_HOMEFRARM | User.buildHomeFarm | 数据空会重发请求（index.js:58084→index.js:58096） |
| BUTLER_DISPATCH | User.dispatch | housekeeper 缺了会崩（scripts3.js:23337⚠） |
| BUY_BUTLER | User.buyHelper | housekeeper 缺了会崩（scripts3.js:23337⚠）；数据空会重发请求（scripts3.js:97770→scripts3.js:23638） |
| BUY_BUTLER_VIP | User.buyMonthlyFee | housekeeper 缺了会崩（scripts3.js:23337⚠） |
| BUY_COPY_BOOK_GIFT | User.buyCopyBookGift | giftData 缺了会崩（scripts3.js:87326,scripts3.js:87326⚠）；数据空会重发请求（scripts3.js:87622→scripts3.js:87309） |
| BUY_GOOD_AND_EVIL_SHOP_ITEM | User.buyGoodAndEvilShopItem | contribution 缺了会崩（scripts3.js:35350,scripts3.js:35350⚠,scripts3.js:35368,scripts3.js:35368⚠） |
| BUY_HOME_CROP | User.BuyHomeCrop | rewardArray 缺了会崩（index.js:57860,index.js:57874⚠） |
| BUY_HOUSE_EVENT | User.marryHouse | houseID 缺了会崩（index.js:22009,index.js:22046⚠） |
| BUY_INVITATIONCARD | User.buyInvitationCard | 数据空会重发请求（scripts2.js:48419→index.js:55968） |
| BUY_MARKET_ITEM | User.BuyMarketItem | 数据空会重发请求（index.js:131210） |
| BUY_MOUNT | User.BuyMount | 数据空会重发请求（index.js:32181） |
| BUY_SCHOOL_SHOP | User.buySchoolShop | updateSchoolContribution 缺了会崩（index.js:113674,index.js:113674⚠）；equipObj 缺了会崩（index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠） |
| BUY_SKILL_SKIN_ACTIVE_SHOP | User.buySkillSkinActiveShop | rewardSkillSkin 缺了会崩（index.js:64853,index.js:64854,index.js:64854⚠,scripts3.js:82865） |
| BUY_SKILL_SKIN_SHOP | User.buySkillSkinShop | shopData 缺了会崩（index.js:138270,index.js:138270⚠,index.js:138271,index.js:138271⚠）；rewardSkillSkin 缺了会崩（index.js:64853,index.js:64854,index.js:64854⚠,scripts3.js:82865） |
| BUY_SPRING_GIFT_PERMANENT | User.buySpringGiftPermanent | giftData 缺了会崩（scripts2.js:67216,scripts2.js:67216⚠,scripts2.js:67588,scripts2.js:67590） |
| BUY_TARGET_TASK_NUM | User.buyTargetTaskNum | 数据空会重发请求（scripts3.js:35408→scripts3.js:36564） |
| BUY_TICKET | User.buyTicket | 数据空会重发请求（scripts2.js:7001→index.js:1939） |
| BUY_UFO_REFRESH_TIMES | User.buyUFORefreshTimes | 数据空会重发请求（scripts3.js:26209→scripts3.js:25849） |
| BYTEDANCE_ENTER_AWARD | User.getEnterAward | equipObj 缺了会崩（index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠） |
| CALL_DRAGON | User.callDragon | TeamBrief 缺了会崩（index.js:27274,index.js:27308⚠）；TeamMemberList 缺了会崩（index.js:27307,index.js:27308⚠,index.js:27375,index.js:27376⚠）；ApplyInfoList 缺了会崩（index.js:27044,index.js:27046,index.js:27046⚠）；FiveLinesDiagramData 缺了会崩（index.js:136101,index.js:136142⚠）；RoleSlot 缺了会崩（index.js:27054,index.js:27089⚠,index.js:27282,index.js:27282⚠）；CollectionRollItemInfoList 缺了会崩（index.js:27059,index.js:27059⚠）；exchangeInfo 缺了会崩（scripts3.js:21162,scripts3.js:21220⚠）；数据空会重发请求（index.js:27415） |
| CALL_HELPER_BY_ID | User.callHelperId | housekeeper 缺了会崩（scripts3.js:23337⚠） |
| CANCEL_CHAT_PK | User.cancelChatPk | 数据空会重发请求（scripts2.js:51258→index.js:24178） |
| CELL_ARRIVE | User.cellArrive | 数据空会重发请求（scripts3.js:51511,scripts3.js:51878） |
| CHANGEPLACE | User.ChangePlace | 数据空会重发请求（index.js:101513） |
| CHANGE_DELEGATE_TASK | User.changeDelegateTask | taskObj 缺了会崩（index.js:43518,index.js:43519⚠） |
| CHANGE_NAME | User.ChangeName | 数据空会重发请求（scripts2.js:52766→index.js:65463） |
| CHANGE_SERVER | User.changeServer | newAcc 缺了会崩（index.js:28163,index.js:28164,index.js:28165⚠） |
| CHANGE_SKILL_KNACK | User.changeSkillKnack | knackBag 缺了会崩（scripts3.js:81140,scripts3.js:81140⚠,scripts3.js:81141,scripts3.js:81141⚠）；skillGraspData 缺了会崩（scripts3.js:81082,scripts3.js:81084,scripts3.js:81086⚠） |
| CHAT_PROPERTY_CHANGE | ChatPropertyChanged | TextProperty 缺了会崩（index.js:145956,index.js:145977,index.js:146248,scripts2.js:10483） |
| CHECKSPECIAL | User.checkSpecial | 数据空会重发请求（index.js:88447→index.js:123008,index.js:123149） |
| CHECK_BREAK | User.OnCheckBreak | finish 缺了会崩（scripts3.js:48989,scripts3.js:49033⚠）；skillLevel 缺了会崩（index.js:67857,index.js:67858⚠）；specialArr 缺了会崩（index.js:56301,index.js:56303,index.js:56303⚠,index.js:56307）；specialNumbers 缺了会崩（index.js:56366,index.js:56366⚠,index.js:56381,index.js:56381⚠） |
| CHECK_LARGE_EXTRA | User.checkLargeExtra | AwardIDArr 缺了会崩（scripts2.js:76290,scripts2.js:76290⚠,scripts2.js:76303,scripts2.js:76303⚠）；数据空会重发请求（scripts2.js:76242,scripts2.js:76250） |
| CHECK_LIVE | User.checkLive | formulaArr 缺了会崩（index.js:102149,index.js:102149⚠）；inherit 缺了会崩（index.js:102092,index.js:102092⚠） |
| CHECK_ON_HOOK | User.CheckOnHook | 数据空会重发请求（index.js:62780→index.js:70937） |
| CHECK_TARGET_TASK | User.checkTargetTask | targetArrData 缺了会崩（scripts3.js:36659,scripts3.js:36659⚠）；getNoteData 缺了会崩（scripts3.js:36552,scripts3.js:36553,scripts3.js:36553⚠,scripts3.js:36660） |
| CHILD_WASH_EVENT | User.childWashProperty | attArr 缺了会崩（index.js:104183,index.js:104184,index.js:104185,index.js:104186）；数据空会重发请求（index.js:24713,index.js:24713） |
| CHOOSE_DICE_BOXITEM | User.chooseDiceBoxItem | 数据空会重发请求（scripts3.js:49800→scripts3.js:51294） |
| CHOOSE_SEX | User.chooseSex | childName 缺了会崩（index.js:24867,index.js:24867⚠,scripts2.js:66272,scripts2.js:66272⚠） |
| CHOOSE_USEITEM_AWARD | User.chooseUsedItemAward | cData 缺了会崩（index.js:64952,index.js:64956⚠）；delItemObj 缺了会崩（index.js:3395,index.js:3428⚠） |
| CIRCLE_TASK_TASK | User.circleTaskAward | rewardObj 缺了会崩（index.js:103616,index.js:103618⚠,index.js:103815,index.js:103816）；数据空会重发请求（scripts2.js:28030→index.js:43610） |
| CLAIM_TR_REWARD | User.Storehouse | needItem 缺了会崩（index.js:139319,index.js:139319⚠,index.js:139335,index.js:139335⚠） |
| COMPLETE_ORDER_BY_HOTVAL | User.completeOrderByHotVal | unlockDish 缺了会崩（index.js:62251,index.js:62251⚠）；数据空会重发请求（scripts2.js:34247→index.js:62561） |
| COOK_ACCELERATE | User.cookAccelerate | cookData 缺了会崩（index.js:62419,index.js:62420,index.js:62420⚠）；dishBag 缺了会崩（index.js:62423,index.js:62425,index.js:62425⚠） |
| COOK_RECEIVE | User.cookReceive | cookData 缺了会崩（index.js:62419,index.js:62420,index.js:62420⚠）；dishBag 缺了会崩（index.js:62423,index.js:62425,index.js:62425⚠） |
| COOK_START | User.cookStart | cookData 缺了会崩（index.js:62419,index.js:62420,index.js:62420⚠）；dishBag 缺了会崩（index.js:62423,index.js:62425,index.js:62425⚠） |
| COOK_UNLOCK | User.cookUnlock | cookData 缺了会崩（index.js:62419,index.js:62420,index.js:62420⚠）；dishBag 缺了会崩（index.js:62423,index.js:62425,index.js:62425⚠） |
| CREATE_ORDER_BY_HOTVAL | User.createOrderByHotVal | unlockDish 缺了会崩（index.js:62251,index.js:62251⚠）；数据空会重发请求（index.js:62556） |
| CREATE_POST | User.ReqReview | 数据空会重发请求（scripts2.js:49254→index.js:113967） |
| CRL_ACTIVE_PAYINFO | User.getCRLActivityPayInfo | payData 缺了会崩（index.js:55339,index.js:55350⚠） |
| CROP_CHANGE_STATE | User.changeSate | 数据空会重发请求（scripts2.js:37716→index.js:58126,index.js:58129） |
| CTS_FIVE_LINES_DIAGRAM_OBSTACLE_APPEAR | FiveLinesDiagramObstacleAppear | tianJiLock 缺了会崩（index.js:135999,index.js:135999⚠） |
| CTS_FIVE_LINES_DIAGRAM_PATH_GENERATE | FiveLinesDiagramPathGenerate | tianJiLock 缺了会崩（index.js:135999,index.js:135999⚠） |
| CTS_OPEN_FIVE_LINES_DIAGRAM_RES | OpenFiveLinesDiagramRes | tianJiLock 缺了会崩（index.js:135999,index.js:135999⚠） |
| CTS_TIANJILOCKDATA_UPDATE | TianJiLockDataUpdate | tianJiLock 缺了会崩（index.js:135999,index.js:135999⚠,index.js:136000,index.js:136000⚠） |
| CTS_UPLOAD_PATH_SEGMENT_RES | UploadPathSegmentRes | tianJiLock 缺了会崩（index.js:135999,index.js:135999⚠） |
| DELETE_EQUIP_LOCK | User.delEquipLock | equipLocks 缺了会崩（index.js:65072,index.js:65077⚠） |
| DISH_UNLOCK | User.dishUnlock | unlockDish 缺了会崩（index.js:62251,index.js:62251⚠） |
| DISPATCH_AWARD | User.dispatchAward | housekeeper 缺了会崩（scripts3.js:23337⚠）；rewardArray 缺了会崩（scripts3.js:23138,scripts3.js:23139,scripts3.js:23143⚠） |
| DISPOSS_HOME_EVENT | User.dispossHomeEvent | 数据空会重发请求（index.js:58275→index.js:58215） |
| DIVORCENPC | User.divorceNpc | deletePartners 缺了会崩（index.js:94538,index.js:94539⚠） |
| END_CAST | User.endCast | inherit 缺了会崩（index.js:102111,index.js:102111⚠）；equipObj 缺了会崩（index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠）；数据空会重发请求（scripts2.js:24905→index.js:102163） |
| END_DOUBLE_TRAINING | User.endDoubleTraining | skillLevel 缺了会崩（index.js:67857,index.js:67858⚠）；specialObj 缺了会崩（index.js:56734,index.js:56736,index.js:56736⚠,index.js:56740）；specialNumbers 缺了会崩（index.js:56799,index.js:56799⚠,index.js:56814,index.js:56814⚠）；数据空会重发请求（scripts2.js:4712→index.js:56710） |
| END_DUNGEON_ADVENTURE | User.LeaveCopy | liveness 缺了会崩（scripts3.js:63836,scripts3.js:63837⚠,scripts3.js:8113,scripts3.js:8122⚠）；数据空会重发请求（scripts2.js:30493→index.js:64173） |
| END_EAT_BY_TABLE | User.endEatByTable | tableList 缺了会崩（index.js:62614,index.js:62614⚠,index.js:62626,index.js:62628）；hotVal 缺了会崩（index.js:63901,index.js:63915⚠,scripts2.js:33983,scripts2.js:33984⚠） |
| END_FISHING | User.EndFish | 数据空会重发请求（scripts2.js:23989→index.js:51678） |
| END_LIANGONG | User.EndTraining | skillArr 缺了会崩（index.js:120584,index.js:120584⚠）；skillid 缺了会崩（index.js:120166,index.js:120167⚠,index.js:19099,index.js:19099⚠） |
| END_MAKE_MEDICINE | User.endMakeMedicine | equipObj 缺了会崩（index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠）；数据空会重发请求（scripts2.js:39729→index.js:102187） |
| END_MAKE_QUIP | User.endMake | equipObj 缺了会崩（index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠）；数据空会重发请求（scripts2.js:5642→index.js:102175） |
| END_PLAY_GAME | User.endPlayGame | childName 缺了会崩（index.js:24867,index.js:24867⚠,scripts2.js:66272,scripts2.js:66272⚠） |
| END_ROGUE_EXPLORE | User.endRogueExplore | delTaskIds 缺了会崩（index.js:133310,index.js:133311⚠）；数据空会重发请求（scripts3.js:70728→scripts3.js:71434） |
| END_SAVE_NPC | User.EndSaveNpc | npcIDArr 缺了会崩（index.js:90061,index.js:90061⚠） |
| END_WOOD_TRAINING | User.EndPlayWooks | specialAny 缺了会崩（index.js:86217,index.js:86217⚠） |
| ENTER_GET_CLIMBLING_EVENT | User.GetClimbingTowerData | towerArray 缺了会崩（index.js:137553,index.js:137553⚠） |
| ENTER_NEXT_FLOOR | User.enterNextFloor | 数据空会重发请求（index.js:55903→index.js:55992） |
| ENTER_OTHER_HOME | User.getFriendHomeList | soilArr 缺了会崩（index.js:57954,index.js:57964,index.js:57988⚠） |
| EQUIP_INHERIT | User.equipInherit | equip 缺了会崩（index.js:61486,index.js:61487⚠）；equipObj 缺了会崩（index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠） |
| EQUIP_INHERIT_SPLIT | User.equipInheritSplit | equipObj 缺了会崩（index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠）；数据空会重发请求（scripts3.js:29321→scripts3.js:28868） |
| EQUIP_RESOLVE | User.equipResolve | 数据空会重发请求（scripts2.js:19108→index.js:65412） |
| EQUIP_WASH | User.equipWash | addArr 缺了会崩（index.js:35612,index.js:35612⚠,scripts2.js:12277,scripts2.js:20095） |
| EUIQP_SUITS_UPGRADE | User.EquipSuitsUpgrade | equipInherit 缺了会崩（index.js:61597,index.js:61598⚠）；数据空会重发请求（scripts2.js:77976→index.js:142192） |
| EXCHANGE_SPRING_SHOP | User.exchangeSpringShop | exchangeData 缺了会崩（scripts3.js:13861,scripts3.js:17312,scripts3.js:17314,scripts3.js:17314⚠） |
| EXILE_CHILD | User.exileChild | proposeNpc 缺了会崩（index.js:77035,index.js:77036,index.js:77036⚠）；houseObj 缺了会崩（index.js:77226,index.js:77226⚠,index.js:77609）；happinessNum 缺了会崩（scripts3.js:58162,scripts3.js:58162⚠）；leaveNpc 缺了会崩（index.js:77043,index.js:77043⚠）；specialObj 缺了会崩（index.js:56734,index.js:56736,index.js:56736⚠,index.js:56740）；cycleObj 缺了会崩（index.js:77051,index.js:77052,index.js:77053,index.js:77057⚠） |
| EXIT_SCHOOL | User.exitSchool | npcIDArr 缺了会崩（index.js:77889,index.js:77889⚠） |
| EXPEDITE_CROP | User.expediteCrop | 数据空会重发请求（index.js:58313→index.js:58144） |
| FIND_OTHER_HOME | User.findOhter | findArr 缺了会崩（index.js:57949,index.js:57949⚠） |
| FINISH_TASK | User.getFinishTaskAward | triggerBoxs 缺了会崩（scripts3.js:44598,scripts3.js:44609⚠）；clearBoxs 缺了会崩（scripts3.js:44602,scripts3.js:44609⚠）；equipObj 缺了会崩（index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠）；contribution 缺了会崩（scripts3.js:35350,scripts3.js:35350⚠,scripts3.js:35368,scripts3.js:35368⚠）；partners 缺了会崩（scripts3.js:59564,scripts3.js:59571,scripts3.js:59571⚠,scripts3.js:59575）；taskID 缺了会崩（index.js:133601,index.js:133619⚠,index.js:135011,index.js:135070⚠） |
| FINS_FRIENDID | User.FindFriendByID | 数据空会重发请求（scripts2.js:10467→index.js:132137,scripts2.js:43290→index.js:132154,index.js:52078→index.js:132170） |
| FLING_DICE | User.flingDice | useBuff 缺了会崩（scripts3.js:50979,scripts3.js:51200,scripts3.js:51214,scripts3.js:51229）；addBuff 缺了会崩（scripts3.js:51395,scripts3.js:51411⚠）；数据空会重发请求（scripts3.js:51279,scripts3.js:51366） |
| FLIP_CARD_CELL | User.flipCardCell | 数据空会重发请求（scripts2.js:80662→index.js:1822） |
| GETCIRCLETASK | User.getCircleTaskAward | rewardArray 缺了会崩（index.js:133574,index.js:133577,index.js:133580⚠）；equipObj 缺了会崩（index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠）；taskID 缺了会崩（index.js:133601,index.js:133619⚠,index.js:135011,index.js:135070⚠） |
| GETHOME_LIST | User.getHomeList | soilArr 缺了会崩（index.js:57643,index.js:57643⚠,index.js:57663,index.js:57663⚠） |
| GETNOTICE_REWARD | User.GetNoticeAward | rewardArray 缺了会崩（index.js:108241,index.js:108244⚠）；liveness 缺了会崩（scripts3.js:63836,scripts3.js:63837⚠,scripts3.js:8113,scripts3.js:8122⚠） |
| GET_ACHIEVE_DATA | User.getAchieveData | groupPoints 缺了会崩（scripts3.js:2901,scripts3.js:2932⚠）；rateIds 缺了会崩（scripts3.js:2947,scripts3.js:2947⚠,scripts3.js:3000,scripts3.js:3000⚠）；achieveIdArr 缺了会崩（scripts3.js:2903,scripts3.js:2921⚠） |
| GET_ACTIVITY_RANK | User.getActivityRank | score 缺了会崩（scripts3.js:37859,scripts3.js:37859⚠,scripts3.js:92554,scripts3.js:92555）；数据空会重发请求（scripts3.js:9738→index.js:57321） |
| GET_ADVANCED_TASKS_DATA | User.getAdvancedTasksData | taskData 缺了会崩（scripts3.js:6066,scripts3.js:6066⚠,scripts3.js:6067,scripts3.js:6067⚠）；数据空会重发请求（scripts3.js:6100） |
| GET_ADVANCED_TASKS_TIP | User.getAdvancedTasksTip | tipData 缺了会崩（scripts3.js:36283,scripts3.js:36286⚠） |
| GET_AD_REWARD | User.LookAdvertisement | awardArr 缺了会崩（index.js:2453,index.js:2455⚠） |
| GET_ALCHEMY_DATA | User.getAlchemyData | 数据空会重发请求（scripts3.js:7070） |
| GET_ALL_ACTIVITY | User.getAllActivity | 数据空会重发请求（index.js:57484） |
| GET_ALL_SERVER_COUNT | User.getAllServerCount | 数据空会重发请求（index.js:111079） |
| GET_APPLY_LIST | User.getApplyList | roleList 缺了会崩（index.js:132520,index.js:132521,index.js:132521⚠,scripts2.js:56143）；数据空会重发请求（index.js:113950→index.js:114109） |
| GET_BACK_SHOP | User.getBackShop | shopArr 缺了会崩（index.js:145350,index.js:145350⚠,index.js:145351,index.js:145351⚠） |
| GET_BANK_LIST | User.getBankList | 数据空会重发请求（index.js:46951） |
| GET_BIG_GROWUP_DATA | User.getBigGrowupData | 数据空会重发请求（scripts2.js:26756→index.js:55306） |
| GET_BIG_PAY_DATA | User.getBigPayData | payData 缺了会崩（index.js:55339,index.js:55350⚠） |
| GET_BREAK_FRIENDLIST | User.GetOnHookFriendLis | friendList 缺了会崩（index.js:106388,index.js:132212,index.js:132417,index.js:132418） |
| GET_CHAT_PK_AWARD | User.getChatPkAward | 数据空会重发请求（scripts2.js:11440→scripts2.js:11460） |
| GET_CIRCLE_TASK_LIST | User.getCircleTaskList | taskArr 缺了会崩（scripts2.js:27854,scripts2.js:27889⚠,scripts3.js:23412,scripts3.js:23412⚠） |
| GET_COPY_BOOK_DATA | User.getCopyBookData | giftDatas 缺了会崩（scripts3.js:87446,scripts3.js:87451⚠） |
| GET_CRL_ACTIVE_PAY_RESULT | User.getCRLActivityPayResult | 数据空会重发请求（index.js:131145→index.js:1814） |
| GET_CUSTOM_AI | User.getChatPkAiSet | 数据空会重发请求（index.js:28570） |
| GET_DAILY_PAY_ACTIVITY | User.getDailyPayActivity | 数据空会重发请求（index.js:1830） |
| GET_DICE_ACTIVE | User.getDice | dice 缺了会崩（scripts3.js:50792⚠） |
| GET_DRAGON | User.getDragon | TeamBrief 缺了会崩（index.js:27274,index.js:27308⚠）；TeamMemberList 缺了会崩（index.js:27307,index.js:27308⚠,index.js:27375,index.js:27376⚠）；ApplyInfoList 缺了会崩（index.js:27044,index.js:27046,index.js:27046⚠）；FiveLinesDiagramData 缺了会崩（index.js:136101,index.js:136142⚠）；RoleSlot 缺了会崩（index.js:27054,index.js:27089⚠,index.js:27282,index.js:27282⚠）；CollectionRollItemInfoList 缺了会崩（index.js:27059,index.js:27059⚠）；exchangeInfo 缺了会崩（scripts3.js:21162,scripts3.js:21220⚠） |
| GET_EQUIP_LOCKS | User.getEquipLock | equipLocks 缺了会崩（index.js:65072,index.js:65077⚠） |
| GET_EVALUATE_DATA | User.getEvaluateData | housekeeper 缺了会崩（scripts3.js:23337⚠） |
| GET_EVERYDAY_ACTIVE | User.getActivityCounts | 数据空会重发请求（index.js:57479） |
| GET_EXCHANGE_ALL_EVENT | User.getDiceExchangeShops | 数据空会重发请求（index.js:87226→scripts3.js:51327） |
| GET_EXCHANGE_ITEM_EVENT | User.getExchangeItemData | 数据空会重发请求（scripts3.js:51332） |
| GET_FASHION_LIST | User.GetFashionList | FashionTimeMap 缺了会崩（index.js:75607,index.js:75614⚠）；数据空会重发请求（index.js:75759） |
| GET_FASHION_SHOP | User.getFasionShop | shopArr 缺了会崩（index.js:145349,index.js:145350,index.js:145350⚠） |
| GET_GE_HELP_INFO | User.getGeHelpInfo | prestige 缺了会崩（scripts3.js:35349,scripts3.js:35349⚠,scripts3.js:35367,scripts3.js:35367⚠）；contribution 缺了会崩（scripts3.js:35350,scripts3.js:35350⚠,scripts3.js:35368,scripts3.js:35368⚠）；mapId 缺了会崩（index.js:26700,index.js:26723⚠,index.js:76124,index.js:76163⚠） |
| GET_GIFT_DATA | User.GetGiftData | 数据空会重发请求（scripts2.js:8709→index.js:131304） |
| GET_GIFT_PAY_DATA | User.getGiftPayData | payData 缺了会崩（index.js:55339,index.js:55350⚠） |
| GET_GOLD_CONSUME_REWARD_DATA | User.getGoldConsumedRewardData | rewardCfg 缺了会崩（scripts3.js:4532,scripts3.js:4533,scripts3.js:4533⚠,scripts3.js:4534） |
| GET_GOOD_AND_EVIL_DATA | User.getGoodAndEvilData | prestige 缺了会崩（scripts3.js:35349,scripts3.js:35349⚠,scripts3.js:35367,scripts3.js:35367⚠）；contribution 缺了会崩（scripts3.js:35350,scripts3.js:35350⚠,scripts3.js:35368,scripts3.js:35368⚠）；mapId 缺了会崩（index.js:26700,index.js:26723⚠,index.js:76124,index.js:76163⚠） |
| GET_GOOD_AND_EVIL_NOTE_DATA | User.getGoodAndEvilNoteData | getNoteData 缺了会崩（scripts3.js:36553,scripts3.js:36553⚠,scripts3.js:36660,scripts3.js:36660⚠）；数据空会重发请求（scripts3.js:36088→scripts3.js:36680） |
| GET_GOOD_AND_EVIL_NPC_DATA | User.getGoodAndEvilNpcData | targetArrData 缺了会崩（scripts3.js:36464,scripts3.js:36464⚠,scripts3.js:36593,scripts3.js:36593⚠） |
| GET_GOOD_AND_EVIL_RANK_DATA | User.getGoodAndEvilRankData | myRank 缺了会崩（index.js:101176,index.js:101177,index.js:101177⚠,scripts3.js:37130）；myScore 缺了会崩（scripts3.js:36006,scripts3.js:36006⚠,scripts3.js:37133,scripts3.js:37133⚠）；myMissRate 缺了会崩（scripts3.js:37134,scripts3.js:37134⚠）；rankData 缺了会崩（scripts3.js:34817,scripts3.js:34817⚠,scripts3.js:67785,scripts3.js:67786⚠） |
| GET_GOOD_AND_EVIL_RETIRE_DATA | User.getGoodAndEvilRetireData | prestige 缺了会崩（scripts3.js:35349,scripts3.js:35349⚠,scripts3.js:35367,scripts3.js:35367⚠）；contribution 缺了会崩（scripts3.js:35350,scripts3.js:35350⚠,scripts3.js:35368,scripts3.js:35368⚠）；mapId 缺了会崩（index.js:26700,index.js:26723⚠,index.js:76124,index.js:76163⚠） |
| GET_GOOD_AND_EVIL_RETIRE_LIST | User.getGoodAndEvilRetireList | prestige 缺了会崩（scripts3.js:35349,scripts3.js:35349⚠,scripts3.js:35367,scripts3.js:35367⚠）；contribution 缺了会崩（scripts3.js:35350,scripts3.js:35350⚠,scripts3.js:35368,scripts3.js:35368⚠）；mapId 缺了会崩（index.js:26700,index.js:26723⚠,index.js:76124,index.js:76163⚠） |
| GET_GOOD_AND_EVIL_TASK_DATA | User.getGoodAndEvilTaskData | targetArrData 缺了会崩（scripts3.js:36659,scripts3.js:36659⚠）；score 缺了会崩（scripts3.js:37859,scripts3.js:37859⚠,scripts3.js:92554,scripts3.js:92555） |
| GET_GROWUP_DATA | User.getGrowupData | 数据空会重发请求（scripts2.js:46071→index.js:55303） |
| GET_HLEX_CHANGESHOP | User.getHlexchangeShop | 数据空会重发请求（scripts3.js:13048→index.js:56126） |
| GET_HOUSE_KEEPER | User.getHousekeeper | housekeeper 缺了会崩（scripts3.js:23337⚠） |
| GET_HOUSE_SHOP_DATA | User.GetHouseShopData | shopData 缺了会崩（index.js:138270,index.js:138270⚠,index.js:138271,index.js:138271⚠） |
| GET_INN | User.getInn | innData 缺了会崩（scripts2.js:33910,scripts2.js:33921⚠）；数据空会重发请求（index.js:62438） |
| GET_INN_COOK | User.getInnCook | unlockDish 缺了会崩（index.js:62251,index.js:62251⚠）；cookBook 缺了会崩（index.js:62586,index.js:62586⚠,index.js:62587,index.js:62587⚠） |
| GET_INN_COOK_LIST | User.getInnCookList | cookList 缺了会崩（index.js:62420,index.js:62420⚠） |
| GET_INN_PRODUCT_LIST | User.getInnProductList | 数据空会重发请求（scripts2.js:32889→index.js:62542） |
| GET_INN_RANK | User.getInnRank | unlockDish 缺了会崩（index.js:62251,index.js:62251⚠） |
| GET_INN_SHOP | User.getInnShop | unlockDish 缺了会崩（index.js:62251,index.js:62251⚠） |
| GET_KNACK_LOTTERY | User.getKnackLottery | 数据空会重发请求（scripts3.js:90047） |
| GET_KNACK_LOTTERY_HISTORY | User.getKnackLotteryHistory | 数据空会重发请求（scripts3.js:90900→scripts3.js:90035） |
| GET_LEVEL_BONUS_DATA | User.getLevelBonusData | bonusObj 缺了会崩（scripts3.js:43814,scripts3.js:43837,scripts3.js:43837⚠） |
| GET_MARKETLIST | User.GetMarketList | market 缺了会崩（scripts2.js:8472,scripts2.js:8511⚠）；数据空会重发请求（index.js:130969,index.js:130976） |
| GET_MASTER_PUPIL_LIST | User.getMasterPupilList | removeApplyList 缺了会崩（index.js:132515,index.js:132515⚠）；roleList 缺了会崩（index.js:132520,index.js:132521,index.js:132521⚠,scripts2.js:56143）；数据空会重发请求（index.js:114140） |
| GET_NEW_AD_REWARD | User.LookNewAdvertisement | awardArr 缺了会崩（index.js:2453,index.js:2455⚠） |
| GET_NEW_GIFT_PERMANENT | User.getNewGiftPermanent | giftDatas 缺了会崩（scripts3.js:30668,scripts3.js:30668⚠,scripts3.js:30755,scripts3.js:30755⚠） |
| GET_NEW_SWEEP_EVENT | User.GetNewSweepTowerData | 数据空会重发请求（index.js:138248） |
| GET_PACKET_DETAIL_INFO | User.getPacketDetailInfo | packageData 缺了会崩（scripts2.js:59028,scripts2.js:59070⚠） |
| GET_PACKET_HISTORY | User.getPacketHistory | packeyNum 缺了会崩（scripts3.js:63187,scripts3.js:63187⚠） |
| GET_PACKET_INFO | User.getPacketInfo | packeyNum 缺了会崩（scripts3.js:63187,scripts3.js:63187⚠）；数据空会重发请求（scripts3.js:62641→scripts3.js:62644） |
| GET_PACKET_RANK_DATA | User.getPacketRankData | rankData 缺了会崩（scripts3.js:34817,scripts3.js:34817⚠,scripts3.js:67785,scripts3.js:67786⚠） |
| GET_PAPER_LIST | User.getPaperList | 数据空会重发请求（index.js:46957） |
| GET_PAYSIGN_AWARD | User.getPaySignAward | 数据空会重发请求（index.js:1791） |
| GET_PAYSIGN_DATA | User.getPaySginData | payData 缺了会崩（index.js:55339,index.js:55350⚠）；数据空会重发请求（index.js:1788） |
| GET_PAY_DATA | User.getPayData | payData 缺了会崩（index.js:55339,index.js:55350⚠） |
| GET_PAY_SHOW_DATA | User.GetPayShowData | ShopArray 缺了会崩（index.js:131215,index.js:131216,index.js:131216⚠,index.js:131217）；数据空会重发请求（scripts2.js:8751→index.js:131021） |
| GET_PERMANENT_REWARD | User.getGiftPermanentAward | payData 缺了会崩（index.js:55339,index.js:55350⚠） |
| GET_QUESTION_LIST | User.getQuestionList | 数据空会重发请求（scripts2.js:13272→index.js:46970） |
| GET_REMOVE_RED_DOT | User.getRemoveRedDot | 数据空会重发请求（index.js:114178） |
| GET_RETURN_GIFT | User.getReturnGift | giftDatas 缺了会崩（scripts3.js:63544,scripts3.js:63545⚠）；数据空会重发请求（scripts3.js:63994→scripts3.js:63595） |
| GET_RETURN_TASK_DATA | User.getReturnTaskData | 数据空会重发请求（scripts3.js:63994→scripts3.js:63609） |
| GET_ROGUE_DATA | User.getRogueData | unlockLevelIds 缺了会崩（scripts3.js:71875,scripts3.js:71875⚠）；数据空会重发请求（scripts3.js:71481） |
| GET_ROGUE_EXCHANGE_GOODS | User.getRogueExchangeGoods | exchangeData 缺了会崩（scripts3.js:13861,scripts3.js:17312,scripts3.js:17314,scripts3.js:17314⚠） |
| GET_SCHOOL_APPOINT | User.getSchoolAppoint | appointList 缺了会崩（index.js:113799,index.js:113799⚠,index.js:113806,index.js:113806⚠） |
| GET_SCHOOL_PREPARE_TASK_DATA | User.getSchoolPrepareTaskData | joinCamp 缺了会崩（scripts3.js:92787,scripts3.js:92787⚠,scripts3.js:92828,scripts3.js:92828⚠）；taskMap 缺了会崩（scripts3.js:92796,scripts3.js:92796⚠,scripts3.js:92797,scripts3.js:92797⚠）；buyCount 缺了会崩（scripts2.js:12107,scripts2.js:12108,scripts2.js:12108⚠,scripts2.js:12120） |
| GET_SCHOOL_SUPPORT_PREPARE_TASK_DATA | User.getSchoolSupportPrepareTaskData | joinCamp 缺了会崩（scripts3.js:92787,scripts3.js:92787⚠,scripts3.js:92828,scripts3.js:92828⚠）；taskMap 缺了会崩（scripts3.js:92796,scripts3.js:92796⚠,scripts3.js:92797,scripts3.js:92797⚠）；buyCount 缺了会崩（scripts2.js:12107,scripts2.js:12108,scripts2.js:12108⚠,scripts2.js:12120） |
| GET_SCHOOL_TASK | User.getSchoolTask | schoolTask 缺了会崩（index.js:113614,index.js:113614⚠） |
| GET_SHOP_ALL_ACTIVE | User.GetShopAllActive | 数据空会重发请求（index.js:131094） |
| GET_SIGN_AWARD | User.getSignAward | equipObj 缺了会崩（index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠） |
| GET_SKILL_SKIN_ACTIVE_SHOP | User.getSkillSkinActiveShop | shopDatas 缺了会崩（scripts3.js:17280,scripts3.js:17280⚠） |
| GET_SKILL_SKIN_SHOP | User.getSkillSkinShop | shopData 缺了会崩（index.js:138270,index.js:138270⚠,index.js:138271,index.js:138271⚠） |
| GET_SNOW_REWARD | User.getSnowAward | rewardArray 缺了会崩（index.js:122532,index.js:122535⚠） |
| GET_SPECIAL_AWARD | User.getSpecialAward | rewardArray 缺了会崩（index.js:58462,index.js:58463,index.js:58465⚠）；数据空会重发请求（index.js:58578→index.js:58517） |
| GET_SPRING_CELEBRATE_DATA | User.getSpringCelebrateData | sparkNum 缺了会崩（scripts3.js:30558,scripts3.js:30568⚠）；数据空会重发请求（scripts3.js:31006） |
| GET_SPRING_CHALLENGE_DATA | User.getSpringChallengeData | 数据空会重发请求（scripts3.js:31468→scripts3.js:30982） |
| GET_SPRING_EXCHANGE_SHOP | User.getSpringExchangeShop | shopData 缺了会崩（scripts3.js:30957,scripts3.js:30968,scripts3.js:30969,scripts3.js:30969⚠）；数据空会重发请求（scripts3.js:31468→scripts3.js:30953） |
| GET_SPRING_SEVEN_DAY_DATA | User.getSpringSevenDayData | sevendayArr 缺了会崩（scripts3.js:55159,scripts3.js:55160,scripts3.js:55160⚠,scripts3.js:55191） |
| GET_SUPPORT_PREPARE_CAMP | User.getSchoolSupportPrePareCamp | 数据空会重发请求（scripts3.js:92745） |
| GET_TASK | User.acceptTask | triggerBoxs 缺了会崩（scripts3.js:44598,scripts3.js:44609⚠）；数据空会重发请求（index.js:133139→index.js:133616） |
| GET_TREASURE_AWARD | User.treasureAward | 数据空会重发请求（scripts3.js:89115→index.js:55998） |
| GET_USEITEM_AWARD | User.getUsedItemAward | awardObj 缺了会崩（index.js:67705,index.js:67706,index.js:67706⚠）；数据空会重发请求（index.js:65425） |
| GET_WASH_EQUIP | User.getWashEquip | equipObj 缺了会崩（index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠） |
| GFUI_BUY_BIG_GIFT | User.buyBigGiftTime | 数据空会重发请求（scripts2.js:46195→index.js:55314） |
| GIVE_CHILD_NAME | User.giveChildName | childName 缺了会崩（index.js:24867,index.js:24867⚠,scripts2.js:66272,scripts2.js:66272⚠）；数据空会重发请求（scripts2.js:12875→index.js:24707） |
| GOLD_BREAK_ALL_SKILL | User.goldBreakAllSkill | 数据空会重发请求（scripts2.js:4447→index.js:121211） |
| GOLD_BREAK_CUR_SKILL | User.goldBreakCurrentSkill | 数据空会重发请求（scripts2.js:4447→index.js:121208） |
| GOOD_AND_EVIL_BATTLE_RESULT | User.goodAndEvilBattleResult | prestige 缺了会崩（scripts3.js:35349,scripts3.js:35349⚠,scripts3.js:35367,scripts3.js:35367⚠）；contribution 缺了会崩（scripts3.js:35350,scripts3.js:35350⚠,scripts3.js:35368,scripts3.js:35368⚠） |
| HELP_DONE_TASK | User.helpDoneTask | prestige 缺了会崩（scripts3.js:35349,scripts3.js:35349⚠,scripts3.js:35367,scripts3.js:35367⚠）；contribution 缺了会崩（scripts3.js:35350,scripts3.js:35350⚠,scripts3.js:35368,scripts3.js:35368⚠）；mapId 缺了会崩（index.js:26700,index.js:26723⚠,index.js:76124,index.js:76163⚠） |
| HIDE_TASK | User.hideTask | 数据空会重发请求（scripts2.js:70866→index.js:133729） |
| HIRE_BAG_WEIGHT | User.hireBagWeight | 数据空会重发请求（scripts3.js:52159→scripts3.js:51353） |
| HIRE_NPC | User.hireNpcOnhook | 数据空会重发请求（index.js:51730→index.js:51644） |
| HOME_SPECIAL_AWARD | User.homeSpeicalAward | rewardArray 缺了会崩（index.js:57867,index.js:57872,index.js:57874⚠） |
| INFO_COLLECTIVE_CULTIVATION | User.intoCollectiveCultivation | 数据空会重发请求（index.js:114471） |
| INIT_MPPVE_BATTLE | User.enterMultiPVEBattle | battleData 缺了会崩（index.js:102742,index.js:102742⚠,index.js:146454,index.js:146507） |
| INN_BUY_SHOP | User.innBuyShop | unlockDish 缺了会崩（index.js:62251,index.js:62251⚠） |
| INTO_SCHOOL_ARENA | User.intoSchoolArena | 数据空会重发请求（index.js:114056） |
| INVITE_NPC_OPTION | User.optionLikeEvent | npcId 缺了会崩（index.js:51168,index.js:51180⚠）；delTaskIds 缺了会崩（index.js:133310,index.js:133311⚠） |
| IOS_PAY | User.IphonePay | orderId 缺了会崩（index.js:62882,index.js:62915⚠,index.js:63428,index.js:63459⚠） |
| JOIN_CHATPK_SERVER | User.jionChatPkServer | newAcc 缺了会崩（index.js:111136,index.js:111138,index.js:111138⚠,index.js:28164） |
| JOIN_GOOD_OR_EVIL | User.joinGoodOrEvil | prestige 缺了会崩（scripts3.js:35349,scripts3.js:35349⚠,scripts3.js:35367,scripts3.js:35367⚠） |
| JOIN_SCHOOL | User.joinSchool | clearBoxs 缺了会崩（scripts3.js:44602,scripts3.js:44609⚠）；cdTimeDays 缺了会崩（index.js:77873,index.js:77880⚠）；数据空会重发请求（index.js:77950→index.js:77954） |
| JOIN_WULIN_PK_SERVER | User.jionWuLinPkServer | newAcc 缺了会崩（index.js:111136,index.js:111138,index.js:111138⚠,index.js:28164）；数据空会重发请求（scripts3.js:95959） |
| KILL_NPC | User.killNpc | npcIDArr 缺了会崩（index.js:90061,index.js:90061⚠）；数据空会重发请求（index.js:145666→index.js:90228） |
| KNACK_LOTTERY | User.knackLottery | 数据空会重发请求（scripts3.js:46105→scripts3.js:90078） |
| LEVEAL_SCHOOL | User.OutSchool | clearBoxs 缺了会崩（scripts3.js:44602,scripts3.js:44609⚠）；npcIDArr 缺了会崩（index.js:77913,index.js:77913⚠） |
| LIGHT_SPRING_SPARK | User.lightSpringSpark | sparkNum 缺了会崩（scripts3.js:30558,scripts3.js:30568⚠） |
| LOOK_SECRET_PANDA_EVENT | User.lookSecretEvent | secret 缺了会崩（scripts2.js:75376,scripts2.js:75376⚠）；数据空会重发请求（index.js:60744→index.js:137982） |
| MAKE_LOVE | User.makeLove | proposeNpc 缺了会崩（index.js:77035,index.js:77036,index.js:77036⚠）；houseObj 缺了会崩（index.js:77226,index.js:77226⚠,index.js:77609）；happinessNum 缺了会崩（scripts3.js:58162,scripts3.js:58162⚠）；leaveNpc 缺了会崩（index.js:77043,index.js:77043⚠）；specialObj 缺了会崩（index.js:56734,index.js:56736,index.js:56736⚠,index.js:56740）；cycleObj 缺了会崩（index.js:77051,index.js:77052,index.js:77053,index.js:77057⚠） |
| MAKE_WISH_DRAGON | User.makeWishDragon | TeamBrief 缺了会崩（index.js:27274,index.js:27308⚠）；TeamMemberList 缺了会崩（index.js:27307,index.js:27308⚠,index.js:27375,index.js:27376⚠）；ApplyInfoList 缺了会崩（index.js:27044,index.js:27046,index.js:27046⚠）；FiveLinesDiagramData 缺了会崩（index.js:136101,index.js:136142⚠）；RoleSlot 缺了会崩（index.js:27054,index.js:27089⚠,index.js:27282,index.js:27282⚠）；CollectionRollItemInfoList 缺了会崩（index.js:27059,index.js:27059⚠）；exchangeInfo 缺了会崩（scripts3.js:21162,scripts3.js:21220⚠） |
| MARRY_AWARD | User.marryAward | proposeNpc 缺了会崩（index.js:77035,index.js:77036,index.js:77036⚠）；houseObj 缺了会崩（index.js:77226,index.js:77226⚠,index.js:77609）；happinessNum 缺了会崩（scripts3.js:58162,scripts3.js:58162⚠）；leaveNpc 缺了会崩（index.js:77043,index.js:77043⚠）；specialObj 缺了会崩（index.js:56734,index.js:56736,index.js:56736⚠,index.js:56740）；cycleObj 缺了会崩（index.js:77051,index.js:77052,index.js:77053,index.js:77057⚠） |
| MASTER_REWARD | User.masterReward | returnInfo 缺了会崩（scripts3.js:38807,scripts3.js:38808,scripts3.js:38808⚠） |
| MOVE_HOME_FRAM | User.removalHomeFarm | 数据空会重发请求（index.js:58084→index.js:58093） |
| MYCARD_REQ_PRODUCT | User.PaymentCallBack | orderId 缺了会崩（index.js:62882,index.js:62915⚠,index.js:63428,index.js:63459⚠）；数据空会重发请求（index.js:130846） |
| NEW_OPTIONALGIFT_DATA | User.getOptionalGiftData | 数据空会重发请求（scripts2.js:8709→index.js:131306） |
| NEW_OPTIONAL_BUY_GIFT | User.buyOptionalGift | 数据空会重发请求（scripts3.js:54416→scripts3.js:54440） |
| NEW_TOWER_SWEEP_EVENT | User.newSweepTower | 数据空会重发请求（scripts2.js:69897→index.js:138255） |
| OBTAINCROP | User.obtainCrop | 数据空会重发请求（index.js:58272→index.js:58159） |
| ONE_KEY_COMPLETE_SCHOOL_TASK | User.onekeyCompleteSchoolTask | schoolTask 缺了会崩（index.js:113686,index.js:113688,index.js:113688⚠,index.js:113689）；equipObj 缺了会崩（index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠）；数据空会重发请求（scripts2.js:59026→index.js:114041） |
| ONE_KEY_DISPOSS_HOME_EVENT | User.onKeyDispossHomeEvent | cropMap 缺了会崩（index.js:57760,index.js:57781⚠） |
| ONE_KEY_OBTAIN_CROP | User.onKeyObtainCrop | obtainLands 缺了会崩（index.js:57735,index.js:57739⚠）；数据空会重发请求（scripts3.js:30243→index.js:58178） |
| OPEN_NOVICE | User.OpenNovice | 数据空会重发请求（index.js:18549→index.js:55613） |
| OPEN_RANDOM_BOX | User.openRandomBox | boxId 缺了会崩（scripts3.js:44117,scripts3.js:6037,scripts3.js:6043,scripts3.js:6079⚠） |
| OTHER_PLAYER_HOME | User.findOHomes | homeArr 缺了会崩（index.js:57918,index.js:57919,index.js:57919⚠）；数据空会重发请求（scripts2.js:59530→index.js:58172） |
| PASS_CARD_REWARD | User.passCardAward | awardArr 缺了会崩（index.js:55881,index.js:55881⚠） |
| POP_EQUIP_STORAGE | User.PopEquip | ItemID 缺了会崩（index.js:107956,index.js:107968⚠,index.js:26779,index.js:26779⚠） |
| PRODUCT_RECEIVE | User.productReceive | 数据空会重发请求（scripts2.js:32665→index.js:62444） |
| PRODUCT_UNLOCK | User.productUnlock | 数据空会重发请求（scripts2.js:32676→index.js:62461） |
| PUPIL_REWARD | User.pupilReward | returnInfo 缺了会崩（scripts3.js:38927,scripts3.js:38928,scripts3.js:38928⚠） |
| PUSH_EQUIP_STORAGE | User.PushEquip | ItemID 缺了会崩（index.js:107956,index.js:107968⚠,index.js:26779,index.js:26779⚠）；数据空会重发请求（scripts2.js:78788→index.js:61102） |
| PUSH_EVALUATE_DATA | User.pushEvaluateData | 数据空会重发请求（scripts3.js:97981→scripts3.js:23657） |
| PUT_SPRING_SPARK | User.putSpringSpark | sparkNum 缺了会崩（scripts3.js:30558,scripts3.js:30568⚠） |
| PVE_ACTION | User.beginPVEBattle | attArr 缺了会崩（index.js:98854,index.js:98863⚠） |
| QUEUE_CHECK_BREAK | User.onQueueCheckBreak | 数据空会重发请求（index.js:120649→index.js:121385） |
| QUICK_FINISH_TASK | User.quickFinishTask | 数据空会重发请求（scripts2.js:28027→index.js:43547） |
| QUIT_SCHOOL_SQUARE | User.quitSchoolSquare | 数据空会重发请求（index.js:114467） |
| RECEIVE_ACHIEVE_RATE_REWARD | User.receiveAchieveRateReward | rateIds 缺了会崩（scripts3.js:2947,scripts3.js:2947⚠）；数据空会重发请求（scripts3.js:3019） |
| RECEIVE_ACHIEVE_REWARD | User.receiveAchieveReward | achieveIdArr 缺了会崩（scripts3.js:2921,scripts3.js:2921⚠）；groupPoints 缺了会崩（scripts3.js:2930,scripts3.js:2932⚠）；数据空会重发请求（scripts3.js:3016） |
| RECEIVE_ACHIEVE_SUIT_REWARD | User.receiveAchieveSuitReward | srd 缺了会崩（scripts3.js:2955,scripts3.js:2959⚠） |
| RECEIVE_ADVANCED_TASK | User.receiveAdvancedTask | taskData 缺了会崩（scripts3.js:6062,scripts3.js:6066,scripts3.js:6066⚠,scripts3.js:6067）；clearTask 缺了会崩（scripts3.js:6078,scripts3.js:6079⚠）；数据空会重发请求（scripts3.js:5954→scripts3.js:6056） |
| RECEIVE_ADVANCED_TASK_REWARD | User.receiveAdvancedTaskReward | boxId 缺了会崩（scripts3.js:44117,scripts3.js:6037,scripts3.js:6043,scripts3.js:6079⚠）；数据空会重发请求（scripts3.js:6265→scripts3.js:6044） |
| RECEIVE_LOTTERY_ACTIVE_REWARD | User.receiveLotteryActiveReward | 数据空会重发请求（scripts3.js:6265→scripts3.js:44118） |
| RECEIVE_NOTICE | User.receiveNotice | housekeeper 缺了会崩（scripts3.js:23337⚠） |
| RECEIVE_NPC_TARGET_TASK | User.receiveNPCTargetTask | mapId 缺了会崩（index.js:26700,index.js:26723⚠,index.js:76124,index.js:76163⚠） |
| RECEIVE_PACKET | User.receivePacket | packageData 缺了会崩（scripts2.js:59028,scripts2.js:59070⚠） |
| RECEIVE_RETURN_GIFT_AWARD | User.receiveReturnGiftAward | giftData 缺了会崩（scripts2.js:67216,scripts2.js:67216⚠,scripts2.js:67588,scripts2.js:67590）；数据空会重发请求（scripts3.js:63546→scripts3.js:63598） |
| RECEIVE_TARGET_TASK | User.receiveTargetTask | mapId 缺了会崩（index.js:26700,index.js:26723⚠,index.js:76124,index.js:76163⚠） |
| RECLAIM_LAND | User.reclaimLand | 数据空会重发请求（index.js:58134） |
| RECOMMEND_ONESELF_HOME | User.recommendOHomes | homeArr 缺了会崩（index.js:57882,index.js:57884,index.js:57919⚠） |
| RECOVER_YOUNG | User.recoverYoung | 数据空会重发请求（index.js:65549→index.js:65303） |
| REDEEM_TABLE | User.redeemTable | hotVal 缺了会崩（index.js:63901,index.js:63915⚠,scripts2.js:33983,scripts2.js:33984⚠） |
| REFRESHNOTICE | User.refreshNotice | 数据空会重发请求（scripts2.js:54166→index.js:108274） |
| REFRESH_FLIP_CARD | User.refreshFlipCard | 数据空会重发请求（index.js:1827） |
| REFRESH_GIFT_AWARD | User.refreshGiftAward | giftAwards 缺了会崩（scripts3.js:63555,scripts3.js:63555⚠）；数据空会重发请求（index.js:55300→index.js:130707） |
| REFRESH_GOOD_AND_EVIL_NPC_DATA | User.refreshGoodAndEvilNpcData | targetArrData 缺了会崩（scripts3.js:36464,scripts3.js:36464⚠,scripts3.js:36593,scripts3.js:36593⚠）；数据空会重发请求（scripts3.js:36016→scripts3.js:36602） |
| REFRESH_GOOD_AND_EVIL_TASK_DATA | User.refreshGoodAndEvilTaskData | targetArrData 缺了会崩（scripts3.js:36659,scripts3.js:36659⚠） |
| REFRESH_RETURN_GIFT_AWARD | User.refreshReturnGiftAward | giftAwards 缺了会崩（scripts3.js:63551,scripts3.js:63555,scripts3.js:63555⚠） |
| REFRESH_SKILL_SKIN_SHOP | User.refreshSkillSkinShop | shopData 缺了会崩（index.js:138270,index.js:138270⚠,index.js:138271,index.js:138271⚠） |
| REFRESH_SKILL_TRICK_EXCHANGE_DATA | User.refreshSkillTrickExchangeData | exchangeShop 缺了会崩（scripts3.js:89552,scripts3.js:89553⚠,scripts3.js:89635,scripts3.js:89636⚠）；costPrice 缺了会崩（scripts3.js:89869,scripts3.js:89869⚠,scripts3.js:89902,scripts3.js:89902⚠） |
| RENT_EVENT | User.rentGroup | 数据空会重发请求（index.js:77168→index.js:77406） |
| REQ_BEGINTITIVATE | User.BeginTitivate | 数据空会重发请求（index.js:75683） |
| REQ_BEGIN_CHANGEFACE | User.BeginChangeFace | 数据空会重发请求（scripts2.js:69070→index.js:75755） |
| REQ_BUY_FASHION | User.BuyFashion | titivateObj 缺了会崩（index.js:107676,index.js:107676⚠,index.js:107814,index.js:107814⚠）；数据空会重发请求（scripts2.js:21039→index.js:75748） |
| REQ_BUY_GIFT | User.buyEjectGift | giftMap 缺了会崩（scripts3.js:100125,scripts3.js:100125⚠,scripts3.js:100269,scripts3.js:100269⚠）；数据空会重发请求（scripts3.js:100361→scripts3.js:60938） |
| REQ_CHANGEBLOOD | User.ChangeBlood | 数据空会重发请求（index.js:144151→index.js:144138） |
| REQ_DOG_PARTNER_PVE_BATTLE | User.ReqDogPartnerBattleInfo | 数据空会重发请求（index.js:13048→index.js:31777） |
| REQ_EQUIP_UPGRADE | User.equipUpgrade | equipInherit 缺了会崩（index.js:61597,index.js:61598⚠） |
| REQ_LANGHUAN_COMBAT | User.enterPVEBattle | attArr 缺了会崩（index.js:98834,index.js:98863⚠）；AttckData 缺了会崩（index.js:104152,index.js:104152⚠）；npcArr 缺了会崩（index.js:143820,index.js:143831,index.js:143831⚠,index.js:143832）；数据空会重发请求（index.js:13048→index.js:67548） |
| REQ_MP_RESULT | User.mulitiNpcBattleResult | equipObj 缺了会崩（index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠）；gemId 缺了会崩（scripts3.js:24429,scripts3.js:24429⚠,scripts3.js:24445） |
| REQ_PRODUCT | User.GetPayAward | orderId 缺了会崩（index.js:62882,index.js:62915⚠,index.js:63428,index.js:63459⚠） |
| REQ_PVE_BATTLE | User.ReqSelfBattleInfo | 数据空会重发请求（index.js:69166） |
| REQ_ROGUE_PVE_COMBAT | User.enterRoguePVEBattle | attArr 缺了会崩（index.js:104183,index.js:104184,index.js:104185,index.js:104186）；AttckData 缺了会崩（index.js:104152,index.js:104152⚠）；npcArr 缺了会崩（index.js:143820,index.js:143831,index.js:143831⚠,index.js:143832）；exchangeNpcArr 缺了会崩（index.js:104162,index.js:104162⚠）；数据空会重发请求（index.js:13048→index.js:104252） |
| REQ_ROGUE_PVP_BATTLE | User.ChallengeRoguePVP | AttckData 缺了会崩（index.js:104152,index.js:104152⚠）；数据空会重发请求（index.js:13048→index.js:104252） |
| REQ_SEVENTASK_EVENT | User.getSevenTaskList | 数据空会重发请求（index.js:57463） |
| REQ_WM_ADV_RWD | User.GetRandomEventAward | rewardArray 缺了会崩（index.js:143816,index.js:143827⚠）；npcArr 缺了会崩（index.js:143820,index.js:143831⚠）；liveness 缺了会崩（scripts3.js:63836,scripts3.js:63837⚠,scripts3.js:8113,scripts3.js:8122⚠）；数据空会重发请求（index.js:88606→index.js:143871） |
| REQ_WULIN_ASSEMBLY_ELIMINATE | see_wu_lin_assembly_eliminate | 数据空会重发请求（scripts3.js:96510） |
| REQ_WULIN_ASSEMBLY_INFO | see_wu_lin_assembly_apply_info | now_ts 缺了会崩（scripts3.js:96272,scripts3.js:96290⚠）；数据空会重发请求（scripts3.js:96496） |
| REQ_WULIN_ASSEMBLY_MATCHTIME | see_wu_lin_assembly_match_time | WuLinMatchConfigList 缺了会崩（scripts3.js:95838,scripts3.js:95845⚠） |
| REQ_WULIN_SCORE_RANK | see_wu_lin_assembly_score_rank | 数据空会重发请求（scripts3.js:96503） |
| REQ_WULIN_TEAM_ASSEMBLY_INFO | see_wu_lin_assembly_team_apply_info | 数据空会重发请求（scripts3.js:12215） |
| REQ_WULIN_TEAM_ELIMINATE | see_wu_lin_assembly_team_eliminate | 数据空会重发请求（scripts3.js:12202） |
| RESET_ACUPOINT | User.restVein | 数据空会重发请求（scripts2.js:37285→index.js:66553） |
| RESET_CHILD_FOSTER | User.resetChildFoster | childName 缺了会崩（index.js:24867,index.js:24867⚠,scripts2.js:66272,scripts2.js:66272⚠） |
| RES_SUBTITLE_ADD | subtitle_add | insert_content 缺了会崩（index.js:146237,index.js:146237⚠） |
| RES_SUBTITLE_HIGHT | show_high_rank | data 缺了会崩（scripts2.js:11908,scripts2.js:11922,scripts2.js:11922⚠,scripts2.js:11923） |
| RES_SUBTITLE_HOT | subtitle_hot | data 缺了会崩（scripts2.js:11922,scripts2.js:11922⚠,scripts2.js:11923,scripts2.js:11923⚠） |
| RES_SUBTITLE_LOW | show_low_rank | data 缺了会崩（scripts2.js:11908,scripts2.js:11922,scripts2.js:11922⚠,scripts2.js:11923） |
| RES_SUBTITLE_NEW | subtitle_new | data 缺了会崩（scripts2.js:11922,scripts2.js:11922⚠,scripts2.js:11923,scripts2.js:11923⚠） |
| REWARD_BOOK_GIFT | User.receiveCopyBookGiftAward | giftData 缺了会崩（scripts3.js:87348,scripts3.js:87348⚠） |
| REWARD_MA_ACTIVITY | User.rewardMAActivity | 数据空会重发请求（scripts3.js:13479→scripts3.js:13628） |
| REWARD_UFO | User.rewardUFO | 数据空会重发请求（scripts3.js:26327→scripts3.js:25862） |
| RG_GET_SHOP_DATA | User.rgGetShopData | shop 缺了会崩（scripts3.js:71199,scripts3.js:71199⚠,scripts3.js:71200,scripts3.js:71200⚠） |
| ROBOT_MOVE_ACTION | User.robotMoveAction | 数据空会重发请求（scripts3.js:51910） |
| ROGUE_ACCEPT_TASK | User.rogueAcceptTask | 数据空会重发请求（index.js:133139→index.js:133616） |
| ROGUE_ENTER_FLOOR | User.rogueEnterFloor | delTaskIds 缺了会崩（index.js:133310,index.js:133311⚠） |
| ROGUE_EVENT_OPTION | User.rogueEventOption | booksObj 缺了会崩（scripts3.js:70689,scripts3.js:70691,scripts3.js:70703,scripts3.js:70705） |
| ROGUE_FIND_OTHER_ID | User.rogueFindFriendByID | 数据空会重发请求（scripts3.js:64275→scripts3.js:71729） |
| ROGUE_GET_HONOR | User.rgGetHonorData | 数据空会重发请求（scripts3.js:68000→scripts3.js:71684） |
| ROGUE_HONOR_WEEK_REWARD | User.rgHonorWeekReward | 数据空会重发请求（scripts3.js:68183→scripts3.js:71653） |
| ROGUE_INIT_OPTION | User.rogueInitDataOption | equipObj 缺了会崩（index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠）；booksObj 缺了会崩（scripts3.js:70689,scripts3.js:70691,scripts3.js:70703,scripts3.js:70705）；WeapToSkill 缺了会崩（scripts3.js:71531,scripts3.js:71532,scripts3.js:71532⚠） |
| ROGUE_LEAVE_HIDE_FLOOR | User.rogueLeaveHideFloor | mapData 缺了会崩（scripts2.js:32661,scripts2.js:32665,scripts2.js:32713,scripts2.js:32713⚠）；delTaskIds 缺了会崩（index.js:133310,index.js:133311⚠） |
| ROGUE_OUTFITTING | User.rogueOutfitting | booksObj 缺了会崩（scripts3.js:70689,scripts3.js:70691,scripts3.js:70703,scripts3.js:70705） |
| ROGUE_PVE_ACTION | User.beginRoguePVEBattle | attArr 缺了会崩（index.js:104194,index.js:104199⚠） |
| ROGUE_PVE_BATTLE_END | User.CheckRoguePVEBattleResult | booksObj 缺了会崩（scripts3.js:70689,scripts3.js:70691,scripts3.js:70703,scripts3.js:70705）；delTaskIds 缺了会崩（index.js:133310,index.js:133311⚠） |
| ROGUE_PVE_BATTLE_RESULT | User.roguePveBattleResult | booksObj 缺了会崩（scripts3.js:70689,scripts3.js:70691,scripts3.js:70703,scripts3.js:70705）；delTaskIds 缺了会崩（index.js:133310,index.js:133311⚠） |
| ROGUE_PVP_BATTLE_END | User.NewRoguePVPBattleResult | delTaskIds 缺了会崩（index.js:133310,index.js:133311⚠） |
| ROGUE_RECEIVE_HONOR | User.rgHonorLvReward | 数据空会重发请求（scripts3.js:61464→scripts3.js:71715） |
| ROGUE_REFRESH_VALUABLES | User.rogueRefreshValuables | refreshCZPrice 缺了会崩（scripts3.js:72774,scripts3.js:72774⚠） |
| ROGUE_SEASON_TOP_DATA | User.rgSeasonTop3Data | rankData 缺了会崩（scripts3.js:71991,scripts3.js:71996,scripts3.js:71996⚠,scripts3.js:71998）；数据空会重发请求（scripts3.js:71983→scripts3.js:71987） |
| ROGUE_STORE_TRUNK_END | User.rogueStoreTrunkEnd | 数据空会重发请求（scripts3.js:76933→scripts3.js:71294） |
| ROGUE_SYNC_WAIT_DATA | User.rgSycnWaitData | 数据空会重发请求（scripts3.js:74029） |
| ROGUE_TALENT_RESET | User.rgTalentResetting | 数据空会重发请求（scripts3.js:76173→scripts3.js:71644） |
| ROGUE_USE_ITEM | User.rgUseItem | rewardArray 缺了会崩（scripts3.js:73957,scripts3.js:73958,scripts3.js:73962⚠）；equipObj 缺了会崩（index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠）；delItemObj 缺了会崩（index.js:3395,index.js:3428⚠）；数据空会重发请求（index.js:65549→scripts3.js:74109） |
| SAVE_GAMETIME | User.GetRoldSaveTime | 数据空会重发请求（index.js:69777→index.js:54318） |
| SAVR_VILLAGE | User.GetvillainAward | rewardArray 缺了会崩（index.js:1529,index.js:1530,index.js:1530⚠）；npcIDArr 缺了会崩（index.js:77889,index.js:77889⚠,index.js:77913,index.js:77913⚠） |
| SCHOOL_APPOINT | User.schoolAppoint | appointDatas 缺了会崩（index.js:113862,index.js:113862⚠,index.js:113863,index.js:113863⚠）；数据空会重发请求（index.js:114073） |
| SCHOOL_FIRST_HONOR | User.shcoolFirstHonor | 数据空会重发请求（index.js:113791） |
| SCHOOL_PREPARE_BUY_NUM | User.schoolPrePareBuyNum | buyCount 缺了会崩（scripts2.js:12107,scripts2.js:12108,scripts2.js:12108⚠,scripts2.js:12120） |
| SCHOOL_PREPARE_TASK_COMPLETE | User.schoolPrePareTaskComplete | taskMap 缺了会崩（scripts3.js:92796,scripts3.js:92796⚠,scripts3.js:92797,scripts3.js:92797⚠） |
| SCHOOL_PREPARE_TASK_REFRESH | User.schoolPrePareTaskRefresh | taskMap 缺了会崩（scripts3.js:92796,scripts3.js:92796⚠,scripts3.js:92797,scripts3.js:92797⚠） |
| SCHOOL_RECEIVE_WAGES | User.schoolReceiveWages | equipObj 缺了会崩（index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠） |
| SCHOOL_SUPPORT_PREPARE_BUY_NUM | User.schoolSupportPrePareBuyNum | buyCount 缺了会崩（scripts2.js:12107,scripts2.js:12108,scripts2.js:12108⚠,scripts2.js:12120） |
| SCHOOL_SUPPORT_PREPARE_TASK_COMPLETE | User.schoolSupportPrePareTaskComplete | taskMap 缺了会崩（scripts3.js:92796,scripts3.js:92796⚠,scripts3.js:92797,scripts3.js:92797⚠） |
| SCHOOL_SUPPORT_PREPARE_TASK_REFRESH | User.schoolSupportPrePareTaskRefresh | taskMap 缺了会崩（scripts3.js:92796,scripts3.js:92796⚠,scripts3.js:92797,scripts3.js:92797⚠） |
| SCHOOL_TAKE_OFFICE_APPLY | User.schoolTakeOfficeApply | 数据空会重发请求（index.js:114070） |
| SCHOOL_TASK_COMPLETE | User.schoolTaskComplete | schoolTask 缺了会崩（index.js:113643,index.js:113645,index.js:113645⚠,index.js:113646）；equipObj 缺了会崩（index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠）；数据空会重发请求（scripts2.js:59026→index.js:114008） |
| SELL_ITEM | User.saleItem | 数据空会重发请求（scripts2.js:55662→index.js:65247,scripts2.js:54921） |
| SERVER_NPC_BATTLE_END | User.TowerBattleResult | awardObj 缺了会崩（index.js:67705,index.js:67706⚠）；gemId 缺了会崩（scripts3.js:24429,scripts3.js:24429⚠,scripts3.js:24445）；数据空会重发请求（index.js:67640→index.js:71461） |
| SET_BUTLER | User.setHelper | housekeeper 缺了会崩（scripts3.js:23337⚠） |
| SET_CHAT_RED_DATA | User.setChatRedData | uIds 缺了会崩（index.js:132070,index.js:132071,index.js:132071⚠）；数据空会重发请求（scripts2.js:9838→index.js:132063） |
| SET_PLAYER_ITEMSORT | User.setPlayerItemSort | 数据空会重发请求（index.js:65057） |
| SET_PLAYER_SKILLSORT | User.setPlayerSkillSort | 数据空会重发请求（index.js:65064） |
| SET_TEMPLATE_DATA | User.setTemplateData | housekeeper 缺了会崩（scripts3.js:23337⚠） |
| SET_YP_EFFECT_STATE | User.upFashionFaceState | titivateObj 缺了会崩（index.js:107676,index.js:107676⚠,index.js:107814,index.js:107814⚠） |
| SEVEN_DAYS_AWARDS | User.SevenDaysAwards | SevenDaysArr 缺了会崩（scripts2.js:81407,scripts2.js:81409⚠,scripts2.js:81412,scripts2.js:81412⚠） |
| SKILL_GRASP | User.skillGrasp | knackBag 缺了会崩（scripts3.js:81105,scripts3.js:81140,scripts3.js:81140⚠,scripts3.js:81141） |
| SPRING_SEVEN_DAYS_AWARDS | User.springSevenDaysAwards | sevenDaysArr 缺了会崩（scripts3.js:55160,scripts3.js:55160⚠,scripts3.js:55190,scripts3.js:55191） |
| START_EAT_BY_TABLE | User.startEatByTable | tableData 缺了会崩（index.js:62613,index.js:62614,index.js:62614⚠） |
| START_FISHING | User.BeginFish | 数据空会重发请求（index.js:51710→index.js:51669） |
| STC_ADDED_MATCH_INFONOTIFY | AddedMatchPoolInfoNotify | Score 缺了会崩（index.js:22157,index.js:22187⚠） |
| STC_ANSWERINVITEJOINTEAMNOTIFY | AnswerInviteJoinTeamNotify | RoleName 缺了会崩（index.js:108006,index.js:67857,index.js:67858⚠,scripts2.js:3267） |
| STC_CHALLENGENPC_WAITREADY_NOTIFY | ChallengeNpcWaitReadyNotify | opRoleID 缺了会崩（index.js:27317,index.js:27376⚠） |
| STC_CHAT_CHANNEL_RES | OpenChatChannelRes | TextProperty 缺了会崩（index.js:145956,index.js:145977,index.js:146248,scripts2.js:10483） |
| STC_CHAT_SEND_RES | ChatMessageRes | sendTime 缺了会崩（index.js:146301,index.js:146301⚠）；content 缺了会崩（index.js:146049,index.js:146087⚠） |
| STC_COLLECT_ROLE_AWARD_NOTIFY | CollectionRoleAwardNotify | CollectionRollItemInfoList 缺了会崩（index.js:26218,index.js:26218⚠） |
| STC_COLLECT_ROLL_CLOSE_NOTIFY | CollectionRollCloseNotify | CollectionRollItemInfoList 缺了会崩（index.js:26218,index.js:26218⚠） |
| STC_COLLECT_ROLL_ITEAMIF | CollectionRollItemInfoListNotify | CollectionRollItemInfoList 缺了会崩（index.js:26218,index.js:26218⚠） |
| STC_COLLECT_ROLL_OPEN_NOTIFY | CollectionRollOpenNotify | CollectionRollItemInfoList 缺了会崩（index.js:26218,index.js:26218⚠） |
| STC_GIFT_BALL_AWARD_INFO | GiftBallAwardInfo | GiftBallAwardItemList 缺了会崩（index.js:115519,index.js:115519⚠,index.js:115520,index.js:115520⚠） |
| STC_GIFT_BALL_OP_RESPONSE | GiftBallOPResponse | Error 缺了会崩（index.js:88175,index.js:88175⚠） |
| STC_INNER_FORCE_VALUE_CHANGE_NOTIFY | InnerForceValueChangeNotify | InnerForceValueChangeList 缺了会崩（index.js:99406,index.js:99406⚠,index.js:99407,index.js:99407⚠）；InnerForceValuePair 缺了会崩（index.js:99400,index.js:99400⚠） |
| STC_INVITEJOINTEAMNOTIFY | InviteJoinTeamNotify | TeamBrief 缺了会崩（index.js:27274,index.js:27308⚠） |
| STC_ITEM_CONSUME_NOTIFY | ItemConsumeNotify | ItemInfoList 缺了会崩（index.js:26528,index.js:26528⚠） |
| STC_LEAVE_MAP | LeaveMapNotify | sceneId 缺了会崩（scripts2.js:48682,scripts2.js:48682⚠）；roleId 缺了会崩（index.js:62864,index.js:62915⚠,index.js:88845,index.js:88859⚠） |
| STC_MAPROLENOTIFY | MapRoleInfoNotify | mapRoleInfo 缺了会崩（index.js:85036,index.js:85036⚠） |
| STC_MESSAGE_LIST_NOTIFY | MessageListNotify | HorseRaceLampWrapperList 缺了会崩（scripts3.js:47578,scripts3.js:47593⚠） |
| STC_OPENGEAE_NOTIFY | OpenGearNotify | roleId 缺了会崩（index.js:62864,index.js:62915⚠,index.js:88845,index.js:88859⚠）；gearId 缺了会崩（index.js:136095,index.js:136142⚠） |
| STC_OPEN_MATCH_INTERFACERES | OpenMatchInterfaceRes | canMatchTime 缺了会崩（index.js:24043,index.js:24043⚠） |
| STC_PRIVATE_CHAT_NOTIFY | PrivateLeaveWorldNotify | SenderId 缺了会崩（scripts3.js:19062,scripts3.js:19120⚠,scripts3.js:21818,scripts3.js:21877⚠）；SendContext 缺了会崩（index.js:146087,index.js:146087⚠） |
| STC_QTE_ACTIVE_NOTIFY | QTEActiveNotify | InnerForceValueChangeList 缺了会崩（index.js:99406,index.js:99406⚠,index.js:99407,index.js:99407⚠） |
| STC_QTE_OVER_NOTIFY | QTEOverNotify | InnerForceValuePair 缺了会崩（index.js:99400,index.js:99400⚠） |
| STC_QTE_RESULT_NOTIFY | QTEResultNotify | InnerForceValueChangeList 缺了会崩（index.js:99406,index.js:99406⚠,index.js:99407,index.js:99407⚠）；InnerForceValuePair 缺了会崩（index.js:99400,index.js:99400⚠） |
| STC_QTE_WAIT_READY_NOTIFY | InnerCompetitionWaitReadyNotify | InnerForceValuePair 缺了会崩（index.js:99400,index.js:99400⚠） |
| STC_QUIT_TEAMNOTIFY | QuitTeamNotify | TeamBrief 缺了会崩（index.js:27274,index.js:27308⚠） |
| STC_ROLE_AWARD_NOTIFY | RoleAwardNotify | GData1 缺了会崩（index.js:10241,index.js:10242⚠）；GData2 缺了会崩（index.js:10241,index.js:10242⚠） |
| STC_ROLE_SLOT_UPDATE | RoleSlotUpdate | RoleSlot 缺了会崩（index.js:27089,index.js:27089⚠） |
| STC_ROLL_ITEM_INFO_UPDATE_NOTIFY | RollItemInfoUpdateNotify | RollItemInfo 缺了会崩（index.js:26497,index.js:26498,index.js:26498⚠） |
| STC_SCENE_TEAM_BRIEF_RES | SceneTeamBriefRes | TeamBriefList 缺了会崩（index.js:26985,index.js:26986,index.js:26986⚠） |
| STC_SCHOOL_RANK_RES | SchoolRankRes | rankItems 缺了会崩（scripts2.js:56998,scripts2.js:56998⚠） |
| STC_SET_TEAMDECLARATIONUPDATE | TeamDeclarationUpdate | TeamBrief 缺了会崩（index.js:27274,index.js:27308⚠） |
| STC_SOLONPC_NOTIFY | SoloNpcNotify | stage 缺了会崩（scripts3.js:46273,scripts3.js:46276,scripts3.js:46276⚠） |
| STC_STUDY_NOTIFY | StudyNotify | sRoleId 缺了会崩（index.js:132148,index.js:132195⚠） |
| STC_TEAM_COPY_PROGRESS_UPDATE | TeamCopyProgressUpdate | killedNpc 缺了会崩（index.js:26448,index.js:26448⚠） |
| STC_TEAM_INFO | TeamInfo | TeamBrief 缺了会崩（index.js:27274,index.js:27308⚠）；TeamMemberList 缺了会崩（index.js:27307,index.js:27308⚠,index.js:27375,index.js:27376⚠）；ApplyInfoList 缺了会崩（index.js:27046,index.js:27046⚠,index.js:27047,index.js:27047⚠）；FiveLinesDiagramData 缺了会崩（index.js:136101,index.js:136142⚠）；RoleSlot 缺了会崩（index.js:27054,index.js:27089⚠,index.js:27282,index.js:27282⚠）；CollectionRollItemInfoList 缺了会崩（index.js:27059,index.js:27059⚠）；exchangeInfo 缺了会崩（scripts3.js:21162,scripts3.js:21220⚠） |
| STC_TEAM_MEMBER_PROPERTY_NOTIFY | TeamMemberPropertyChangedNotify | RoleProperty 缺了会崩（index.js:27123,index.js:27123⚠,index.js:27124,index.js:27124⚠） |
| STC_UPDATE_SCHOOL_WINNER_NOTIFY | UpdateSchoolWinnerNotify | winner 缺了会崩（scripts3.js:10204,scripts3.js:10260⚠,scripts3.js:10697） |
| STC_WULIN_RANK_MATCH_RES | WuLinAssemblyMatchRes | Score 缺了会崩（index.js:22157,index.js:22187⚠） |
| STC_WULIN_TEAM_APPLY_ANSWER_NOTIFY | WuLinTeamApplyAnswerNotify | RoleName 缺了会崩（index.js:108006,index.js:67857,index.js:67858⚠,scripts2.js:3267） |
| STC_WULIN_TEAM_ELIMINATE_INFO | TeamEliminateInfo | TeamEliminatePKPair 缺了会崩（index.js:85123,index.js:85123⚠） |
| STC_WULIN_TEAM_ENTER_SYSTEM_NOTIFY | WuLinTeamEnterSystemNotify | SystemSecond 缺了会崩（scripts3.js:96272,scripts3.js:96290⚠） |
| STC_WULIN_TEAM_INVITE_ANSWER_NOTIFY | WuLinTeamInviteAnswerNotify | RoleName 缺了会崩（index.js:108006,index.js:67857,index.js:67858⚠,scripts2.js:3267） |
| STC_WULIN_TEAM_MATCH_RES | WuLinAssemblyTeamMatchRes | Score 缺了会崩（index.js:22157,index.js:22187⚠） |
| STOP_BREAK_LIST | User.stopBreaklist | 数据空会重发请求（scripts2.js:4359→index.js:121203） |
| SWAP_SKILL_PROGRESS | User.skillChange | 数据空会重发请求（scripts2.js:39044→index.js:119905） |
| SWEEP_DUNGEON | User.sweepCopy | liveness 缺了会崩（scripts3.js:63836,scripts3.js:63837⚠,scripts3.js:8113,scripts3.js:8122⚠）；数据空会重发请求（index.js:64177） |
| SYCN_TASK | User.sycnTask | acceptTaskMap 缺了会崩（index.js:133523,index.js:133525⚠）；taskLog 缺了会崩（scripts2.js:17066,scripts2.js:17066⚠,scripts2.js:17090,scripts2.js:17092⚠）；数据空会重发请求（scripts2.js:5168→index.js:133463） |
| TABLE_RECEIVE | User.tableReceive | tableData 缺了会崩（index.js:62642,index.js:62643,index.js:62643⚠）；rewardArray 缺了会崩（index.js:62647,index.js:62647⚠） |
| TABLE_UNLOCK | User.tableUnlock | tableData 缺了会崩（index.js:62659,index.js:62660,index.js:62660⚠） |
| TENDING_TREES | User.tendingTrees | 数据空会重发请求（scripts3.js:60465） |
| TOWER_BUY_PROP | User.BuyTowerProp | 数据空会重发请求（scripts2.js:6171→index.js:137954） |
| TOWER_GET_PANDA_EVENT | User.getPandaEvent | eventArr 缺了会崩（index.js:137656,index.js:137657,index.js:137657⚠）；数据空会重发请求（index.js:137966,index.js:137966） |
| TOWER_LEAVE_EVENT | User.leaveTower | PlayerEquip 缺了会崩（index.js:65075,index.js:65077⚠,scripts3.js:73499,scripts3.js:73501⚠） |
| TOWER_RANDOM_EVENT | User.chanllengeTower | npcArr 缺了会崩（index.js:143820,index.js:143831,index.js:143831⚠,index.js:143832） |
| TOWER_SPECIAL_SHOP | User.GetTowerSpecialShop | shopData 缺了会崩（index.js:138270,index.js:138270⚠,index.js:138271,index.js:138271⚠） |
| TRIGGER_CANDY | User.triggerCandy | 数据空会重发请求（scripts3.js:51560→scripts3.js:51565） |
| TRIGGER_EVENT | User.triggerEvent | 数据空会重发请求（scripts3.js:51701→scripts3.js:51348） |
| UPGRADE_WIFE_LEVEL | User.upgradeWifeLevel | 数据空会重发请求（scripts2.js:63358→index.js:145385） |
| UPLOAD_PLAYER_ARENA_DATA | User.uploadPlayerArenaData | 数据空会重发请求（scripts3.js:95977） |
| USER_ANSWERFRIEND | User.AnswerFriend | 数据空会重发请求（index.js:132206） |
| USER_DOUBLE_TRAINING | User.doubleTraining | skillLevel 缺了会崩（index.js:67857,index.js:67858⚠） |
| USER_FIND_FRIEND | User.FindFriend | 数据空会重发请求（index.js:132128） |
| USER_FRIENDLIST | User.FriendList | uIds 缺了会崩（index.js:132071,index.js:132071⚠）；数据空会重发请求（index.js:132098） |
| USER_FRIENDREGISTER | User.FriendRegister | 数据空会重发请求（index.js:132198） |
| USER_LOADGAME | User.LoadGame | 数据空会重发请求（index.js:101897→index.js:70925） |
| USER_ONHOOK_BREAK | User.OnHookBreak | skillLevel 缺了会崩（index.js:67857,index.js:67858⚠）；数据空会重发请求（scripts2.js:4712→index.js:56263） |
| USER_PVP | User.ChallengePVP | AttckData 缺了会崩（index.js:104152,index.js:104152⚠）；数据空会重发请求（index.js:13048→index.js:101355） |
| USER_RANKLIST | User.rankList | 数据空会重发请求（scripts3.js:9738→index.js:101499） |
| USE_ITEM | User.useItem | rewardArray 缺了会崩（index.js:64764,index.js:64768,index.js:64772⚠）；equipObj 缺了会崩（index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠）；gemId 缺了会崩（scripts3.js:24429,scripts3.js:24429⚠,scripts3.js:24445）；partners 缺了会崩（scripts3.js:59564,scripts3.js:59571,scripts3.js:59571⚠,scripts3.js:59575）；taskID 缺了会崩（index.js:133601,index.js:133619⚠,index.js:135011,index.js:135070⚠）；bloodEndTime 缺了会崩（index.js:107897,index.js:107923⚠）；avatarInfo 缺了会崩（scripts2.js:49810,scripts2.js:49866,scripts2.js:49866⚠,scripts2.js:49867）；rewardSkillSkin 缺了会崩（index.js:64851,index.js:64853,index.js:64854⚠）；housekeeper 缺了会崩（scripts3.js:23337⚠）；delItemObj 缺了会崩（index.js:3395,index.js:3428⚠）；数据空会重发请求（index.js:65549→index.js:65330,index.js:65340,index.js:65348） |
| USE_TREASURE | User.useTreasure | clearElites 缺了会崩（scripts3.js:71007,scripts3.js:71007⚠）；数据空会重发请求（scripts3.js:72385→scripts3.js:71002） |
| WASH_ADDITION | User.washAdditionalArr | bloodArr 缺了会崩（index.js:144052,index.js:144058⚠）；数据空会重发请求（index.js:144156,index.js:144156） |
| WASH_MEDICINE | User.WashMedicine | bloodArr 缺了会崩（index.js:144058,index.js:144058⚠,index.js:144059,index.js:144059⚠） |
| WB_DMG_RANKLIST | User.boosRankList | 数据空会重发请求（scripts3.js:9738→index.js:145620） |
| WEEDIND_EVENT | User.weddingFeast | 数据空会重发请求（index.js:77194→index.js:77411） |
| WHORING_EVENT | User.Whoring | 数据空会重发请求（index.js:51336→index.js:51255） |
| WHORING_GIRL_EVENT | User.GetWhoreData | girlData 缺了会崩（index.js:51115,index.js:51142⚠） |
| WULIN_ASSEMBLY_APPLY_REQ | User.wuLinAssemblyApplyReq | 数据空会重发请求（scripts3.js:96518） |

## 不能用 0 兜底的字段

| 动作 | 字段 | 实际形状 | 消费点 |
|---|---|---|---|
| ACCEPTCIRCLETASK | taskID | array|object|array|string | index.js:133601,index.js:133619⚠,index.js:135011,index.js:135070⚠ |
| ACCEPT_SCHOOL_TASK | acceptSchoolTask | container | index.js:113633,index.js:113634,index.js:113634⚠ |
| ACHV_CHANGE | achieveRateId | array|object|array|string | index.js:106883,index.js:106923⚠ |
| ACHV_CHANGE | nIds | array|object|array|string | scripts3.js:2887,scripts3.js:2888⚠ |
| ACTIVE_TOWER_EVENT | eventID | container | index.js:29362 |
| ACTIVE_TOWER_EVENT | npcArr | array|array|string | index.js:143820,index.js:143831,index.js:143831⚠,index.js:143832 |
| ADD_CHILD_FOSTER | playArr | array|object|array|string | index.js:77090,index.js:77090⚠,scripts2.js:12255,scripts2.js:12255⚠ |
| ADD_EQUIP_LOCK | equipLocks | container | index.js:65072,index.js:65077⚠ |
| ADOPTCHILD | childName | array|string | index.js:24867,index.js:24867⚠,scripts2.js:66272,scripts2.js:66272⚠ |
| AFFILIATION_SCHOOL | upRoleSchoolLevel | array|object | index.js:113701,index.js:113701⚠,index.js:113702,index.js:113702⚠ |
| ANN_PASS_BUY_LIVENESS | td | container | scripts3.js:7861 |
| ANN_PASS_FINISH_TASK | dt | array|object|array|string | scripts3.js:7880,scripts3.js:7880⚠ |
| ANN_PASS_GET_GIFT_DATA | giftDatas | array|array|object|array|string | scripts3.js:30668,scripts3.js:30668⚠,scripts3.js:30755,scripts3.js:30755⚠ |
| BATCH_SEED_CROP | crops | container | index.js:57657,index.js:57658⚠ |
| BATTLE_END_REWARD | equipObj | container | index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠ |
| BATTLE_END_REWARD | gemId | array|array|string | scripts3.js:24429,scripts3.js:24429⚠,scripts3.js:24445 |
| BEGINCAST | inherit | array|array|string | index.js:102107,index.js:102107⚠ |
| BEGINSAVE_NPC | npcIDArr | array|array|object|array|string | index.js:90061,index.js:90061⚠ |
| BEGIN_LIANGONG | hanyusuiTime | array|object | index.js:89038,index.js:89052 |
| BEGIN_LIST | skill | container | index.js:11967,index.js:11995⚠,index.js:120112,index.js:120114⚠ |
| BEGIN_PLAY_GAME | childName | array|string | index.js:24867,index.js:24867⚠,scripts2.js:66272,scripts2.js:66272⚠ |
| BEGIN_WEDDING | cycleObj | array|array|string | index.js:77051,index.js:77052,index.js:77053,index.js:77057⚠ |
| BEGIN_WEDDING | houseObj | container | index.js:77226,index.js:77226⚠,index.js:77609 |
| BEGIN_WEDDING | leaveNpc | array|object|array|string | index.js:77043,index.js:77043⚠ |
| BEGIN_WEDDING | proposeNpc | array|object|array|string | index.js:77035,index.js:77036,index.js:77036⚠ |
| BEGIN_WEDDING | specialObj | container | index.js:56734,index.js:56736,index.js:56736⚠,index.js:56740 |
| BIRTHCHILD | cycleObj | array|array|string | index.js:77051,index.js:77052,index.js:77053,index.js:77057⚠ |
| BIRTHCHILD | houseObj | container | index.js:77226,index.js:77226⚠,index.js:77609 |
| BIRTHCHILD | leaveNpc | array|object|array|string | index.js:77043,index.js:77043⚠ |
| BIRTHCHILD | proposeNpc | array|object|array|string | index.js:77035,index.js:77036,index.js:77036⚠ |
| BIRTHCHILD | specialObj | container | index.js:56734,index.js:56736,index.js:56736⚠,index.js:56740 |
| BRING_SPECIAL_AWARD | equipObj | container | index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠ |
| BUTLER_DISPATCH | housekeeper |  | scripts3.js:23337⚠ |
| BUY_BUTLER | housekeeper |  | scripts3.js:23337⚠ |
| BUY_BUTLER_VIP | housekeeper |  | scripts3.js:23337⚠ |
| BUY_COPY_BOOK_GIFT | giftData | array|object | scripts3.js:87326,scripts3.js:87326⚠ |
| BUY_DICE_SHOP_EVENT | useBuff | container | scripts3.js:50979 |
| BUY_HOME_CROP | rewardArray | container | index.js:57860,index.js:57874⚠ |
| BUY_HOUSE_EVENT | houseID | container | index.js:22009,index.js:22046⚠ |
| BUY_MARKET_ITEM | hanyusuiTime | array|object | index.js:89038,index.js:89052 |
| BUY_SCHOOL_SHOP | equipObj | container | index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠ |
| BUY_SCHOOL_SHOP | updateSchoolContribution | array|object | index.js:113674,index.js:113674⚠ |
| BUY_SKILL_SKIN_ACTIVE_SHOP | rewardSkillSkin | container | index.js:64853,index.js:64854,index.js:64854⚠,scripts3.js:82865 |
| BUY_SKILL_SKIN_SHOP | rewardSkillSkin | container | index.js:64853,index.js:64854,index.js:64854⚠,scripts3.js:82865 |
| BUY_SKILL_SKIN_SHOP | shopData | container | index.js:138270,index.js:138270⚠,index.js:138271,index.js:138271⚠ |
| BUY_SPRING_GIFT_PERMANENT | giftData | container | scripts2.js:67216,scripts2.js:67216⚠,scripts2.js:67588,scripts2.js:67590 |
| BYTEDANCE_ENTER_AWARD | equipObj | container | index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠ |
| CALL_DRAGON | ApplyInfoList | array|object|array|string | index.js:27044,index.js:27046,index.js:27046⚠ |
| CALL_DRAGON | CollectionRollItemInfoList | array|object|array|string | index.js:27059,index.js:27059⚠ |
| CALL_DRAGON | FiveLinesDiagramData | array|object|array|string | index.js:136101,index.js:136142⚠ |
| CALL_DRAGON | MapGearList | array|object|array|string | index.js:26577 |
| CALL_DRAGON | RoleSlot | array|object|array|string | index.js:27054,index.js:27089⚠,index.js:27282,index.js:27282⚠ |
| CALL_DRAGON | TeamBrief | array|object|array|string | index.js:27274,index.js:27308⚠ |
| CALL_DRAGON | TeamMemberList | array|object|array|string | index.js:27307,index.js:27308⚠,index.js:27375,index.js:27376⚠ |
| CALL_DRAGON | exchangeInfo | array|object|array|string | scripts3.js:21162,scripts3.js:21220⚠ |
| CALL_HELPER_BY_ID | housekeeper |  | scripts3.js:23337⚠ |
| CELL_ARRIVE | christmas | container | scripts3.js:50899 |
| CHANGE_DELEGATE_TASK | taskObj | container | index.js:43518,index.js:43519⚠ |
| CHANGE_SKILL_KNACK | knackBag | array|object|array|string | scripts3.js:81140,scripts3.js:81140⚠,scripts3.js:81141,scripts3.js:81141⚠ |
| CHANGE_SKILL_KNACK | skillGraspData | container | scripts3.js:81082,scripts3.js:81084,scripts3.js:81086⚠ |
| CHAT_PROPERTY_CHANGE | TextProperty | array|object|array|string | index.js:145956,index.js:145977,index.js:146248,scripts2.js:10483 |
| CHECK_BREAK | finish | array|object|array|string | scripts3.js:48989,scripts3.js:49033⚠ |
| CHECK_BREAK | isSkillChangeCD | container | index.js:121438 |
| CHECK_BREAK | specialArr | container | index.js:56301,index.js:56303,index.js:56303⚠,index.js:56307 |
| CHECK_BREAK | specialNumbers | array | index.js:56366,index.js:56366⚠,index.js:56381,index.js:56381⚠ |
| CHECK_LARGE_EXTRA | AwardIDArr | array|object|array|string | scripts2.js:76290,scripts2.js:76290⚠,scripts2.js:76303,scripts2.js:76303⚠ |
| CHECK_LIVE | formulaArr | array|object|array|string | index.js:102149,index.js:102149⚠ |
| CHECK_LIVE | inherit | array|array|string | index.js:102092,index.js:102092⚠ |
| CHECK_TARGET_TASK | getNoteData | array|object|array|string | scripts3.js:36552,scripts3.js:36553,scripts3.js:36553⚠,scripts3.js:36660 |
| CHECK_TARGET_TASK | targetArrData | array|object|array|string | scripts3.js:36659,scripts3.js:36659⚠ |
| CHILD_WASH_EVENT | attArr | array|array|object|array|string | index.js:104183,index.js:104184,index.js:104185,index.js:104186 |
| CHOOSE_SEX | childName | array|string | index.js:24867,index.js:24867⚠,scripts2.js:66272,scripts2.js:66272⚠ |
| CHOOSE_USEITEM_AWARD | cData | container | index.js:64952,index.js:64956⚠ |
| CHOOSE_USEITEM_AWARD | delItemObj | array | index.js:3395,index.js:3428⚠ |
| CIRCLE_TASK_TASK | rewardObj | container | index.js:103616,index.js:103618⚠,index.js:103815,index.js:103816 |
| CLAIM_TR_REWARD | needItem | array | index.js:139319,index.js:139319⚠,index.js:139335,index.js:139335⚠ |
| COLLECT | rewardArray | container | index.js:25210 |
| COMPLETE_ORDER_BY_HOTVAL | unlockDish | container | index.js:62251,index.js:62251⚠ |
| COOK_ACCELERATE | cookData | container | index.js:62419,index.js:62420,index.js:62420⚠ |
| COOK_ACCELERATE | dishBag | container | index.js:62423,index.js:62425,index.js:62425⚠ |
| COOK_ACCELERATE | foodBag | container | index.js:62417 |
| COOK_RECEIVE | cookData | container | index.js:62419,index.js:62420,index.js:62420⚠ |
| COOK_RECEIVE | dishBag | container | index.js:62423,index.js:62425,index.js:62425⚠ |
| COOK_RECEIVE | foodBag | container | index.js:62417 |
| COOK_START | cookData | container | index.js:62419,index.js:62420,index.js:62420⚠ |
| COOK_START | dishBag | container | index.js:62423,index.js:62425,index.js:62425⚠ |
| COOK_START | foodBag | container | index.js:62417 |
| COOK_UNLOCK | cookData | container | index.js:62419,index.js:62420,index.js:62420⚠ |
| COOK_UNLOCK | dishBag | container | index.js:62423,index.js:62425,index.js:62425⚠ |
| COOK_UNLOCK | foodBag | container | index.js:62417 |
| CREATE_ORDER_BY_HOTVAL | unlockDish | container | index.js:62251,index.js:62251⚠ |
| CRL_ACTIVE_PAYINFO | payData | container | index.js:55339,index.js:55350⚠ |
| CTS_FIVE_LINES_DIAGRAM_OBSTACLE_APPEAR | tianJiLock | array|object|array|string | index.js:135999,index.js:135999⚠ |
| CTS_FIVE_LINES_DIAGRAM_PATH_GENERATE | tianJiLock | array|object|array|string | index.js:135999,index.js:135999⚠ |
| CTS_OPEN_FIVE_LINES_DIAGRAM_RES | tianJiLock | array|object|array|string | index.js:135999,index.js:135999⚠ |
| CTS_TIANJILOCKDATA_UPDATE | tianJiLock | array|object|array|string | index.js:135999,index.js:135999⚠,index.js:136000,index.js:136000⚠ |
| CTS_UPLOAD_PATH_SEGMENT_RES | tianJiLock | array|object|array|string | index.js:135999,index.js:135999⚠ |
| DELETE_EQUIP_LOCK | equipLocks | container | index.js:65072,index.js:65077⚠ |
| DICE_BUY_PLACE_GOODS | useBuff | container | scripts3.js:51200,scripts3.js:51201 |
| DICE_SELL_PLACE_GOODS | useBuff | container | scripts3.js:51214,scripts3.js:51215 |
| DISH_UNLOCK | unlockDish | container | index.js:62251,index.js:62251⚠ |
| DISPATCH_AWARD | housekeeper |  | scripts3.js:23337⚠ |
| DISPATCH_AWARD | rewardArray | container | scripts3.js:23138,scripts3.js:23139,scripts3.js:23143⚠ |
| DISPOSS_HOME_EVENT | rewardArray | container | index.js:58002 |
| DIVORCENPC | deletePartners | container | index.js:94538,index.js:94539⚠ |
| END_CAST | equipObj | container | index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠ |
| END_CAST | inherit | array|array|string | index.js:102111,index.js:102111⚠ |
| END_DAZUO | hanyusuiTime | array|object | index.js:89038,index.js:89052 |
| END_DOUBLE_TRAINING | isSkillChangeCD | container | index.js:121438 |
| END_DOUBLE_TRAINING | specialNumbers | array | index.js:56799,index.js:56799⚠,index.js:56814,index.js:56814⚠ |
| END_DOUBLE_TRAINING | specialObj | container | index.js:56734,index.js:56736,index.js:56736⚠,index.js:56740 |
| END_DUNGEON_ADVENTURE | liveness | array|object|object|scalar | scripts3.js:63836,scripts3.js:63837⚠,scripts3.js:8113,scripts3.js:8122⚠ |
| END_EAT_BY_TABLE | hotVal | array|object|array|string|scalar | index.js:63901,index.js:63915⚠,scripts2.js:33983,scripts2.js:33984⚠ |
| END_EAT_BY_TABLE | tableList | array|object | index.js:62614,index.js:62614⚠,index.js:62626,index.js:62628 |
| END_LIANGONG | hanyusuiTime | array|object | index.js:89038,index.js:89052 |
| END_LIANGONG | skillArr | array|array|string | index.js:120584,index.js:120584⚠ |
| END_LIANGONG | skillid | container | index.js:120166,index.js:120167⚠,index.js:19099,index.js:19099⚠ |
| END_MAKE_MEDICINE | equipObj | container | index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠ |
| END_MAKE_QUIP | equipObj | container | index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠ |
| END_PLAY_GAME | childName | array|string | index.js:24867,index.js:24867⚠,scripts2.js:66272,scripts2.js:66272⚠ |
| END_RECOVER_MP | hanyusuiTime | array|object | index.js:89038,index.js:89052 |
| END_ROGUE_EXPLORE | delTaskIds | array|object|array|string | index.js:133310,index.js:133311⚠ |
| END_SAVE_NPC | npcIDArr | array|array|object|array|string | index.js:90061,index.js:90061⚠ |
| END_WOOD_TRAINING | specialAny | array|object|array|string | index.js:86217,index.js:86217⚠ |
| ENTER_GET_CLIMBLING_EVENT | towerArray | array | index.js:137553,index.js:137553⚠ |
| ENTER_OTHER_HOME | soilArr | array|object | index.js:57954,index.js:57964,index.js:57988⚠ |
| EQUIP_INHERIT | equip | array | index.js:61486,index.js:61487⚠ |
| EQUIP_INHERIT | equipObj | container | index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠ |
| EQUIP_INHERIT_SPLIT | delEquipInherit | container | index.js:61600 |
| EQUIP_INHERIT_SPLIT | equipObj | container | index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠ |
| EQUIP_SKILL_SKIN | skillSkinWeap | container | scripts3.js:82856 |
| EQUIP_WASH | addArr | array|array|object|array|string | index.js:35612,index.js:35612⚠,scripts2.js:12277,scripts2.js:20095 |
| EUIQP_SUITS_UPGRADE | equipInherit | container | index.js:61597,index.js:61598⚠ |
| EXCHANGE_SPRING_SHOP | exchangeData | container | scripts3.js:13861,scripts3.js:17312,scripts3.js:17314,scripts3.js:17314⚠ |
| EXILE_CHILD | cycleObj | array|array|string | index.js:77051,index.js:77052,index.js:77053,index.js:77057⚠ |
| EXILE_CHILD | houseObj | container | index.js:77226,index.js:77226⚠,index.js:77609 |
| EXILE_CHILD | leaveNpc | array|object|array|string | index.js:77043,index.js:77043⚠ |
| EXILE_CHILD | proposeNpc | array|object|array|string | index.js:77035,index.js:77036,index.js:77036⚠ |
| EXILE_CHILD | specialObj | container | index.js:56734,index.js:56736,index.js:56736⚠,index.js:56740 |
| EXIT_SCHOOL | npcIDArr | array|object|array|string | index.js:77889,index.js:77889⚠ |
| FIND_OTHER_HOME | findArr | array | index.js:57949,index.js:57949⚠ |
| FINISH_TASK | AddPartner | object | index.js:133446,index.js:133447 |
| FINISH_TASK | clearBoxs | array|object|array|string | scripts3.js:44602,scripts3.js:44609⚠ |
| FINISH_TASK | equipObj | container | index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠ |
| FINISH_TASK | partners | container | scripts3.js:59564,scripts3.js:59571,scripts3.js:59571⚠,scripts3.js:59575 |
| FINISH_TASK | taskID | array|object|array|string | index.js:133601,index.js:133619⚠,index.js:135011,index.js:135070⚠ |
| FINISH_TASK | triggerBoxs | array|object|array|string | scripts3.js:44598,scripts3.js:44609⚠ |
| FLING_DICE | addBuff | container | scripts3.js:51395,scripts3.js:51411⚠ |
| FLING_DICE | useBuff | container | scripts3.js:50979,scripts3.js:51200,scripts3.js:51214,scripts3.js:51229 |
| GETCIRCLETASK | equipObj | container | index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠ |
| GETCIRCLETASK | rewardArray | container | index.js:133574,index.js:133577,index.js:133580⚠ |
| GETCIRCLETASK | taskID | array|object|array|string | index.js:133601,index.js:133619⚠,index.js:135011,index.js:135070⚠ |
| GETHOME_LIST | soilArr | array|object|array|string | index.js:57643,index.js:57643⚠,index.js:57663,index.js:57663⚠ |
| GETNOTICE_REWARD | liveness | array|object|object|scalar | scripts3.js:63836,scripts3.js:63837⚠,scripts3.js:8113,scripts3.js:8122⚠ |
| GETNOTICE_REWARD | rewardArray | container | index.js:108241,index.js:108244⚠ |
| GET_ACHIEVE_DATA | achieveIdArr | array|object|array|string | scripts3.js:2903,scripts3.js:2921⚠ |
| GET_ACHIEVE_DATA | groupPoints | container | scripts3.js:2901,scripts3.js:2932⚠ |
| GET_ACHIEVE_DATA | rateIds | container | scripts3.js:2947,scripts3.js:2947⚠,scripts3.js:3000,scripts3.js:3000⚠ |
| GET_ADVANCED_TASKS_DATA | rewardData | array|object|array|string | scripts3.js:6038,scripts3.js:6039 |
| GET_ADVANCED_TASKS_DATA | taskData | array|object|array|string | scripts3.js:6066,scripts3.js:6066⚠,scripts3.js:6067,scripts3.js:6067⚠ |
| GET_ADVANCED_TASKS_TIP | tipData | array|object|array|string | scripts3.js:36283,scripts3.js:36286⚠ |
| GET_AD_REWARD | awardArr | container | index.js:2453,index.js:2455⚠ |
| GET_APPLY_LIST | roleList | container | index.js:132520,index.js:132521,index.js:132521⚠,scripts2.js:56143 |
| GET_BACK_SHOP | shopArr | array|array|object|array|string | index.js:145350,index.js:145350⚠,index.js:145351,index.js:145351⚠ |
| GET_BIG_PAY_DATA | payData | container | index.js:55339,index.js:55350⚠ |
| GET_BREAK_FRIENDLIST | friendList | container | index.js:106388,index.js:132212,index.js:132417,index.js:132418 |
| GET_CIRCLE_TASK_LIST | taskArr | array|object|array|string | scripts2.js:27854,scripts2.js:27889⚠,scripts3.js:23412,scripts3.js:23412⚠ |
| GET_COPY_BOOK_DATA | giftDatas | container | scripts3.js:87446,scripts3.js:87451⚠ |
| GET_DICE_ACTIVE | dice |  | scripts3.js:50792⚠ |
| GET_DRAGON | ApplyInfoList | array|object|array|string | index.js:27044,index.js:27046,index.js:27046⚠ |
| GET_DRAGON | CollectionRollItemInfoList | array|object|array|string | index.js:27059,index.js:27059⚠ |
| GET_DRAGON | FiveLinesDiagramData | array|object|array|string | index.js:136101,index.js:136142⚠ |
| GET_DRAGON | MapGearList | array|object|array|string | index.js:26577 |
| GET_DRAGON | RoleSlot | array|object|array|string | index.js:27054,index.js:27089⚠,index.js:27282,index.js:27282⚠ |
| GET_DRAGON | TeamBrief | array|object|array|string | index.js:27274,index.js:27308⚠ |
| GET_DRAGON | TeamMemberList | array|object|array|string | index.js:27307,index.js:27308⚠,index.js:27375,index.js:27376⚠ |
| GET_DRAGON | exchangeInfo | array|object|array|string | scripts3.js:21162,scripts3.js:21220⚠ |
| GET_EQUIP_LOCKS | equipLocks | container | index.js:65072,index.js:65077⚠ |
| GET_EVALUATE_DATA | housekeeper |  | scripts3.js:23337⚠ |
| GET_FASHION_LIST | FashionTimeMap | container | index.js:75607,index.js:75614⚠ |
| GET_FASHION_SHOP | shopArr | array|object|array|string | index.js:145349,index.js:145350,index.js:145350⚠ |
| GET_GE_HELP_INFO | mapId | container | index.js:26700,index.js:26723⚠,index.js:76124,index.js:76163⚠ |
| GET_GIFT_PAY_DATA | payData | container | index.js:55339,index.js:55350⚠ |
| GET_GOLD_CONSUME_REWARD_DATA | rewardCfg | container | scripts3.js:4532,scripts3.js:4533,scripts3.js:4533⚠,scripts3.js:4534 |
| GET_GOOD_AND_EVIL_DATA | mapId | container | index.js:26700,index.js:26723⚠,index.js:76124,index.js:76163⚠ |
| GET_GOOD_AND_EVIL_NOTE_DATA | getNoteData | array|object|array|string | scripts3.js:36553,scripts3.js:36553⚠,scripts3.js:36660,scripts3.js:36660⚠ |
| GET_GOOD_AND_EVIL_NPC_DATA | targetArrData | array|object | scripts3.js:36464,scripts3.js:36464⚠,scripts3.js:36593,scripts3.js:36593⚠ |
| GET_GOOD_AND_EVIL_RANK_DATA | myRank | container | index.js:101176,index.js:101177,index.js:101177⚠,scripts3.js:37130 |
| GET_GOOD_AND_EVIL_RANK_DATA | rankData | array|object|array|string | scripts3.js:34817,scripts3.js:34817⚠,scripts3.js:67785,scripts3.js:67786⚠ |
| GET_GOOD_AND_EVIL_RETIRE_DATA | mapId | container | index.js:26700,index.js:26723⚠,index.js:76124,index.js:76163⚠ |
| GET_GOOD_AND_EVIL_RETIRE_LIST | mapId | container | index.js:26700,index.js:26723⚠,index.js:76124,index.js:76163⚠ |
| GET_GOOD_AND_EVIL_SHOP_DATA | shop | array|object|array|string | scripts3.js:36505,scripts3.js:36506 |
| GET_GOOD_AND_EVIL_TASK_DATA | targetArrData | array|object|array|string | scripts3.js:36659,scripts3.js:36659⚠ |
| GET_HOUSE_KEEPER | housekeeper |  | scripts3.js:23337⚠ |
| GET_HOUSE_SHOP_DATA | shopData | container | index.js:138270,index.js:138270⚠,index.js:138271,index.js:138271⚠ |
| GET_INN | innData | array | scripts2.js:33910,scripts2.js:33921⚠ |
| GET_INN_COOK | cookBook | array|object|array|string | index.js:62586,index.js:62586⚠,index.js:62587,index.js:62587⚠ |
| GET_INN_COOK | unlockDish | array|object|array|string | index.js:62251,index.js:62251⚠ |
| GET_INN_COOK_LIST | cookList | array|object | index.js:62420,index.js:62420⚠ |
| GET_INN_RANK | unlockDish | container | index.js:62251,index.js:62251⚠ |
| GET_INN_SHOP | unlockDish | container | index.js:62251,index.js:62251⚠ |
| GET_JIGSAW_DATA | ts | container | scripts3.js:40631 |
| GET_JIGSAW_TASK_DATA | ts | container | scripts3.js:40631 |
| GET_KNACK_LOTTERY | optionalDatas | array|object|array|string | scripts3.js:90012 |
| GET_KNACK_LOTTERY | upSkillRateData | container | scripts3.js:90010 |
| GET_KNACK_LOTTERY_HISTORY | optionalDatas | array|object|array|string | scripts3.js:90012 |
| GET_KNACK_LOTTERY_HISTORY | upSkillRateData | container | scripts3.js:90010 |
| GET_LEVEL_BONUS_DATA | bonusObj | array|object | scripts3.js:43814,scripts3.js:43837,scripts3.js:43837⚠ |
| GET_MARKETLIST | market | container | scripts2.js:8472,scripts2.js:8511⚠ |
| GET_MASTER_PUPIL_LIST | removeApplyList | array|string | index.js:132515,index.js:132515⚠ |
| GET_MASTER_PUPIL_LIST | roleList | container | index.js:132520,index.js:132521,index.js:132521⚠,scripts2.js:56143 |
| GET_MP_ULTSKILLS | dataArr | array|object|array|string | index.js:110884 |
| GET_NEW_AD_REWARD | awardArr | container | index.js:2453,index.js:2455⚠ |
| GET_NEW_GIFT_PERMANENT | giftDatas | array|array|object|array|string | scripts3.js:30668,scripts3.js:30668⚠,scripts3.js:30755,scripts3.js:30755⚠ |
| GET_PACKET_DETAIL_INFO | packageData | container | scripts2.js:59028,scripts2.js:59070⚠ |
| GET_PACKET_HISTORY | historyData | array|object|array|string | scripts3.js:62586,scripts3.js:62587,scripts3.js:62590,scripts3.js:62591 |
| GET_PACKET_RANK_DATA | rankData | array|object|array|string | scripts3.js:34817,scripts3.js:34817⚠,scripts3.js:67785,scripts3.js:67786⚠ |
| GET_PACKET_REWARD_DATA | rewardArr | array|object|array|string | index.js:131621,scripts3.js:67764 |
| GET_PAYSIGN_DATA | payData | container | index.js:55339,index.js:55350⚠ |
| GET_PAY_DATA | payData | container | index.js:55339,index.js:55350⚠ |
| GET_PAY_SHOW_DATA | ShopArray | container | index.js:131215,index.js:131216,index.js:131216⚠,index.js:131217 |
| GET_PERMANENT_REWARD | payData | container | index.js:55339,index.js:55350⚠ |
| GET_RETURN_GIFT | giftDatas | array | scripts3.js:63544,scripts3.js:63545⚠ |
| GET_ROGUE_DATA | unlockLevelIds | array|object|array|string | scripts3.js:71875,scripts3.js:71875⚠ |
| GET_ROGUE_EXCHANGE_GOODS | exchangeData | container | scripts3.js:13861,scripts3.js:17312,scripts3.js:17314,scripts3.js:17314⚠ |
| GET_SCHOOL_APPOINT | appointList | array|object|array|string | index.js:113799,index.js:113799⚠,index.js:113806,index.js:113806⚠ |
| GET_SCHOOL_FIRSTTRY | npcList | array|string | index.js:113718,index.js:113721 |
| GET_SCHOOL_PREPARE_TASK_DATA | taskMap | array|object|array|string | scripts3.js:92796,scripts3.js:92796⚠,scripts3.js:92797,scripts3.js:92797⚠ |
| GET_SCHOOL_SUPPORT_PREPARE_TASK_DATA | taskMap | array|object|array|string | scripts3.js:92796,scripts3.js:92796⚠,scripts3.js:92797,scripts3.js:92797⚠ |
| GET_SCHOOL_TASK | schoolTask | array|object | index.js:113614,index.js:113614⚠ |
| GET_SIGN_AWARD | equipObj | container | index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠ |
| GET_SKILL_SKIN_ACTIVE_SHOP | shopDatas | array|object|array|string | scripts3.js:17280,scripts3.js:17280⚠ |
| GET_SKILL_SKIN_SHOP | shopData | container | index.js:138270,index.js:138270⚠,index.js:138271,index.js:138271⚠ |
| GET_SNOW_REWARD | rewardArray | container | index.js:122532,index.js:122535⚠ |
| GET_SPECIAL_AWARD | rewardArray | container | index.js:58462,index.js:58463,index.js:58465⚠ |
| GET_SPRING_EXCHANGE_SHOP | shopData | container | scripts3.js:30957,scripts3.js:30968,scripts3.js:30969,scripts3.js:30969⚠ |
| GET_SPRING_GIFT_PERMANENT | giftDatas | array|object|array|string | scripts3.js:30929,scripts3.js:30940,scripts3.js:30941 |
| GET_SPRING_SEVEN_DAY_DATA | sevendayArr | array|object | scripts3.js:55159,scripts3.js:55160,scripts3.js:55160⚠,scripts3.js:55191 |
| GET_TASK | triggerBoxs | array|object|array|string | scripts3.js:44598,scripts3.js:44609⚠ |
| GET_TEAM_ULTSKILLS | dataArr | array|object|array|string | index.js:54941 |
| GET_TREE_PLANTING | plantingData | container | scripts3.js:60443,scripts3.js:60444 |
| GET_USEITEM_AWARD | awardObj | array | index.js:67705,index.js:67706,index.js:67706⚠ |
| GET_WASH_EQUIP | equipObj | container | index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠ |
| GIVE_CHILD_NAME | childName | array|string | index.js:24867,index.js:24867⚠,scripts2.js:66272,scripts2.js:66272⚠ |
| HELP_DONE_TASK | mapId | container | index.js:26700,index.js:26723⚠,index.js:76124,index.js:76163⚠ |
| HIRE_BAG_WEIGHT | useBuff | container | scripts3.js:51229 |
| HOME_SPECIAL_AWARD | rewardArray | container | index.js:57867,index.js:57872,index.js:57874⚠ |
| HOUSE_SPECIAL | eventID | container | index.js:29362 |
| INIT_MPPVE_BATTLE | battleData | array|array|string | index.js:102742,index.js:102742⚠,index.js:146454,index.js:146507 |
| INIT_MPPVE_BATTLE | linepID | array|array|string | index.js:110848 |
| INN_BUY_SHOP | unlockDish | container | index.js:62251,index.js:62251⚠ |
| INVITE_NPC_OPTION | delTaskIds | array|object|array|string | index.js:133310,index.js:133311⚠ |
| INVITE_NPC_OPTION | npcId | array | index.js:51168,index.js:51180⚠ |
| IOS_PAY | orderId | container | index.js:62882,index.js:62915⚠,index.js:63428,index.js:63459⚠ |
| JOIN_SCHOOL | clearBoxs | array|object|array|string | scripts3.js:44602,scripts3.js:44609⚠ |
| KILL_NPC | npcIDArr | array|array|object|array|string | index.js:90061,index.js:90061⚠ |
| KNACK_LOTTERY | optionalDatas | array|object|array|string | scripts3.js:90012 |
| KNACK_LOTTERY | upSkillRateData | container | scripts3.js:90010 |
| LEVEAL_SCHOOL | clearBoxs | array|object|array|string | scripts3.js:44602,scripts3.js:44609⚠ |
| LEVEAL_SCHOOL | npcIDArr | array|object|array|string | index.js:77913,index.js:77913⚠ |
| LEVEAL_SCHOOL | textArr | array | index.js:103614 |
| LOOK_SECRET_PANDA_EVENT | secret | array|object|array|string | scripts2.js:75376,scripts2.js:75376⚠ |
| MAKE_LOVE | cycleObj | array|array|string | index.js:77051,index.js:77052,index.js:77053,index.js:77057⚠ |
| MAKE_LOVE | houseObj | container | index.js:77226,index.js:77226⚠,index.js:77609 |
| MAKE_LOVE | leaveNpc | array|object|array|string | index.js:77043,index.js:77043⚠ |
| MAKE_LOVE | proposeNpc | array|object|array|string | index.js:77035,index.js:77036,index.js:77036⚠ |
| MAKE_LOVE | specialObj | container | index.js:56734,index.js:56736,index.js:56736⚠,index.js:56740 |
| MAKE_WISH_DRAGON | ApplyInfoList | array|object|array|string | index.js:27044,index.js:27046,index.js:27046⚠ |
| MAKE_WISH_DRAGON | CollectionRollItemInfoList | array|object|array|string | index.js:27059,index.js:27059⚠ |
| MAKE_WISH_DRAGON | FiveLinesDiagramData | array|object|array|string | index.js:136101,index.js:136142⚠ |
| MAKE_WISH_DRAGON | MapGearList | array|object|array|string | index.js:26577 |
| MAKE_WISH_DRAGON | RoleSlot | array|object|array|string | index.js:27054,index.js:27089⚠,index.js:27282,index.js:27282⚠ |
| MAKE_WISH_DRAGON | TeamBrief | array|object|array|string | index.js:27274,index.js:27308⚠ |
| MAKE_WISH_DRAGON | TeamMemberList | array|object|array|string | index.js:27307,index.js:27308⚠,index.js:27375,index.js:27376⚠ |
| MAKE_WISH_DRAGON | exchangeInfo | array|object|array|string | scripts3.js:21162,scripts3.js:21220⚠ |
| MARRY_AWARD | cycleObj | array|array|string | index.js:77051,index.js:77052,index.js:77053,index.js:77057⚠ |
| MARRY_AWARD | houseObj | container | index.js:77226,index.js:77226⚠,index.js:77609 |
| MARRY_AWARD | leaveNpc | array|object|array|string | index.js:77043,index.js:77043⚠ |
| MARRY_AWARD | proposeNpc | array|object|array|string | index.js:77035,index.js:77036,index.js:77036⚠ |
| MARRY_AWARD | specialObj | container | index.js:56734,index.js:56736,index.js:56736⚠,index.js:56740 |
| MARRY_NPC_EVENT | wifeFasion | container | index.js:77076 |
| MASTER_REWARD | returnInfo | container | scripts3.js:38807,scripts3.js:38808,scripts3.js:38808⚠ |
| MYCARD_REQ_PRODUCT | orderId | container | index.js:62882,index.js:62915⚠,index.js:63428,index.js:63459⚠ |
| OBTAINCROP | rewardArray | container | index.js:57712 |
| ONE_KEY_COMPLETE_SCHOOL_TASK | equipObj | container | index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠ |
| ONE_KEY_COMPLETE_SCHOOL_TASK | schoolTask | array|object | index.js:113686,index.js:113688,index.js:113688⚠,index.js:113689 |
| ONE_KEY_DISPOSS_HOME_EVENT | cropMap | container | index.js:57760,index.js:57781⚠ |
| ONE_KEY_DISPOSS_HOME_EVENT | rewardArray | container | index.js:57798 |
| ONE_KEY_OBTAIN_CROP | obtainLands | array|object|array|string | index.js:57735,index.js:57739⚠ |
| ONE_KEY_OBTAIN_CROP | rewardArray | container | index.js:57754 |
| OPEN_RANDOM_BOX | boxId | array|object|array|string | scripts3.js:44117,scripts3.js:6037,scripts3.js:6043,scripts3.js:6079⚠ |
| OTHER_PLAYER_HOME | homeArr | array|object|array|string | index.js:57918,index.js:57919,index.js:57919⚠ |
| OTHER_PLAYER_HOME | recommendHomeArr | array|object|array|string | index.js:57933,index.js:57934 |
| PASS_CARD_REWARD | awardArr | array | index.js:55881,index.js:55881⚠ |
| PLANT_TREE | plantingData | container | scripts3.js:60444 |
| POP_EQUIP_STORAGE | ItemID | array|object|array|string|scalar | index.js:107956,index.js:107968⚠,index.js:26779,index.js:26779⚠ |
| PRODUCT_RECEIVE | foodBag | container | index.js:62279 |
| PUPIL_REWARD | returnInfo | container | scripts3.js:38927,scripts3.js:38928,scripts3.js:38928⚠ |
| PUSH_EQUIP_STORAGE | ItemID | array|object|array|string|scalar | index.js:107956,index.js:107968⚠,index.js:26779,index.js:26779⚠ |
| PVE_ACTION | attArr | array|array|string | index.js:98854,index.js:98863⚠ |
| RECEIVE_ACHIEVEMENT_REWARD | optionalDatas | array|object|array|string | scripts3.js:90012 |
| RECEIVE_ACHIEVEMENT_REWARD | upSkillRateData | container | scripts3.js:90010 |
| RECEIVE_ACHIEVE_RATE_REWARD | rateIds | container | scripts3.js:2947,scripts3.js:2947⚠ |
| RECEIVE_ACHIEVE_REWARD | achieveIdArr | container | scripts3.js:2921,scripts3.js:2921⚠ |
| RECEIVE_ACHIEVE_REWARD | groupPoints | container | scripts3.js:2930,scripts3.js:2932⚠ |
| RECEIVE_ACHIEVE_SUIT_REWARD | srd | container | scripts3.js:2955,scripts3.js:2959⚠ |
| RECEIVE_ADVANCED_TASK | clearTask | array|object|array|string | scripts3.js:6078,scripts3.js:6079⚠ |
| RECEIVE_ADVANCED_TASK | taskData | array|object|array|string | scripts3.js:6062,scripts3.js:6066,scripts3.js:6066⚠,scripts3.js:6067 |
| RECEIVE_ADVANCED_TASK_REWARD | boxId | array|object|array|string | scripts3.js:44117,scripts3.js:6037,scripts3.js:6043,scripts3.js:6079⚠ |
| RECEIVE_JIGSAW_TASK_AWARD | ts | container | scripts3.js:40631 |
| RECEIVE_NOTICE | housekeeper |  | scripts3.js:23337⚠ |
| RECEIVE_NPC_TARGET_TASK | mapId | container | index.js:26700,index.js:26723⚠,index.js:76124,index.js:76163⚠ |
| RECEIVE_PACKET | packageData | container | scripts2.js:59028,scripts2.js:59070⚠ |
| RECEIVE_PACKET_REWARD_REWARD | rewardArr | array|object|array|string | index.js:131621,scripts3.js:67764 |
| RECEIVE_RETURN_GIFT_AWARD | giftData | container | scripts2.js:67216,scripts2.js:67216⚠,scripts2.js:67588,scripts2.js:67590 |
| RECEIVE_TARGET_TASK | mapId | container | index.js:26700,index.js:26723⚠,index.js:76124,index.js:76163⚠ |
| RECOMMEND_ONESELF_HOME | friendHome | array|object|array|string | index.js:57891 |
| RECOMMEND_ONESELF_HOME | homeArr | array|object|array|string | index.js:57882,index.js:57884,index.js:57919⚠ |
| REDEEM_TABLE | hotVal | array|object|array|string|scalar | index.js:63901,index.js:63915⚠,scripts2.js:33983,scripts2.js:33984⚠ |
| REFRESH_GIFT_AWARD | giftAwards | array | scripts3.js:63555,scripts3.js:63555⚠ |
| REFRESH_GOOD_AND_EVIL_NPC_DATA | targetArrData | array|object | scripts3.js:36464,scripts3.js:36464⚠,scripts3.js:36593,scripts3.js:36593⚠ |
| REFRESH_GOOD_AND_EVIL_TASK_DATA | targetArrData | array|object|array|string | scripts3.js:36659,scripts3.js:36659⚠ |
| REFRESH_RETURN_GIFT_AWARD | giftAwards | array | scripts3.js:63551,scripts3.js:63555,scripts3.js:63555⚠ |
| REFRESH_SKILL_SKIN_SHOP | shopData | container | index.js:138270,index.js:138270⚠,index.js:138271,index.js:138271⚠ |
| REFRESH_SKILL_TRICK_EXCHANGE_DATA | exchangeShop | array|object|array|string | scripts3.js:89552,scripts3.js:89553⚠,scripts3.js:89635,scripts3.js:89636⚠ |
| REMOVE_SKILL_SKIN | skillSkinWeap | container | scripts3.js:82844 |
| REQ_BUY_FASHION | titivateObj | array | index.js:107676,index.js:107676⚠,index.js:107814,index.js:107814⚠ |
| REQ_BUY_GIFT | giftMap | container | scripts3.js:100125,scripts3.js:100125⚠,scripts3.js:100269,scripts3.js:100269⚠ |
| REQ_DOUBLE_BR | friendName | container | index.js:108006 |
| REQ_EQUIP_UPGRADE | equipInherit | container | index.js:61597,index.js:61598⚠ |
| REQ_LANGHUAN_COMBAT | AttckData | array|object|array|string | index.js:104152,index.js:104152⚠ |
| REQ_LANGHUAN_COMBAT | attArr | array|array|string | index.js:98834,index.js:98863⚠ |
| REQ_LANGHUAN_COMBAT | npcArr | array|array|string | index.js:143820,index.js:143831,index.js:143831⚠,index.js:143832 |
| REQ_MP_RESULT | equipObj | container | index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠ |
| REQ_MP_RESULT | gemId | array|array|string | scripts3.js:24429,scripts3.js:24429⚠,scripts3.js:24445 |
| REQ_PRODUCT | orderId | container | index.js:62882,index.js:62915⚠,index.js:63428,index.js:63459⚠ |
| REQ_ROGUE_PVE_COMBAT | AttckData | array|object|array|string | index.js:104152,index.js:104152⚠ |
| REQ_ROGUE_PVE_COMBAT | attArr | array|array|object|array|string | index.js:104183,index.js:104184,index.js:104185,index.js:104186 |
| REQ_ROGUE_PVE_COMBAT | exchangeNpcArr | array|object|array|string | index.js:104162,index.js:104162⚠ |
| REQ_ROGUE_PVE_COMBAT | npcArr | array|array|string | index.js:143820,index.js:143831,index.js:143831⚠,index.js:143832 |
| REQ_ROGUE_PVP_BATTLE | AttckData | array|object|array|string | index.js:104152,index.js:104152⚠ |
| REQ_SERVER_LIST | serverObj | container | index.js:116722 |
| REQ_WM_ADV_RWD | liveness | array|object|object|scalar | scripts3.js:63836,scripts3.js:63837⚠,scripts3.js:8113,scripts3.js:8122⚠ |
| REQ_WM_ADV_RWD | npcArr | array|array|string | index.js:143820,index.js:143831⚠ |
| REQ_WM_ADV_RWD | rewardArray | container | index.js:143816,index.js:143827⚠ |
| REQ_WULIN_ASSEMBLY_INFO | now_ts | array | scripts3.js:96272,scripts3.js:96290⚠ |
| REQ_WULIN_ASSEMBLY_MATCHTIME | WuLinMatchConfigList | array|object|array|string | scripts3.js:95838,scripts3.js:95845⚠ |
| RESET_CHILD_FOSTER | childName | array|string | index.js:24867,index.js:24867⚠,scripts2.js:66272,scripts2.js:66272⚠ |
| RES_SUBTITLE_ADD | insert_content | array|string | index.js:146237,index.js:146237⚠ |
| RES_SUBTITLE_HIGHT | data | array|object|array|string | scripts2.js:11908,scripts2.js:11922,scripts2.js:11922⚠,scripts2.js:11923 |
| RES_SUBTITLE_HOT | data | array|object|array|string | scripts2.js:11922,scripts2.js:11922⚠,scripts2.js:11923,scripts2.js:11923⚠ |
| RES_SUBTITLE_LOW | data | array|object|array|string | scripts2.js:11908,scripts2.js:11922,scripts2.js:11922⚠,scripts2.js:11923 |
| RES_SUBTITLE_NEW | data | array|object|array|string | scripts2.js:11922,scripts2.js:11922⚠,scripts2.js:11923,scripts2.js:11923⚠ |
| REWARD_BOOK_GIFT | giftData | array|object | scripts3.js:87348,scripts3.js:87348⚠ |
| RG_GET_SHOP_DATA | shop | array|object|array|string | scripts3.js:71199,scripts3.js:71199⚠,scripts3.js:71200,scripts3.js:71200⚠ |
| ROGUE_CHANGE_SKNACK | skillGraspData | container | scripts3.js:73998 |
| ROGUE_ENTER_FLOOR | delTaskIds | array|object|array|string | index.js:133310,index.js:133311⚠ |
| ROGUE_ENTER_FLOOR | mapData2 | container | scripts3.js:39096,scripts3.js:77146 |
| ROGUE_ENTER_FLOOR | trEffectNum | container | scripts3.js:72024 |
| ROGUE_EVENT_OPTION | booksObj | container | scripts3.js:70689,scripts3.js:70691,scripts3.js:70703,scripts3.js:70705 |
| ROGUE_EVENT_OPTION | mapData2 | container | scripts3.js:39096,scripts3.js:77146 |
| ROGUE_GATHER_ITEMS | rewardArray | object | scripts3.js:71109 |
| ROGUE_GATHER_ITEMS | rewardTreasure | object | scripts3.js:71110 |
| ROGUE_INIT_OPTION | WeapToSkill | container | scripts3.js:71531,scripts3.js:71532,scripts3.js:71532⚠ |
| ROGUE_INIT_OPTION | booksObj | container | scripts3.js:70689,scripts3.js:70691,scripts3.js:70703,scripts3.js:70705 |
| ROGUE_INIT_OPTION | equipObj | container | index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠ |
| ROGUE_LEAVE_HIDE_FLOOR | delTaskIds | array|object|array|string | index.js:133310,index.js:133311⚠ |
| ROGUE_LEAVE_HIDE_FLOOR | mapData | container | scripts2.js:32661,scripts2.js:32665,scripts2.js:32713,scripts2.js:32713⚠ |
| ROGUE_LEAVE_HIDE_FLOOR | mapData2 | container | scripts3.js:39096,scripts3.js:77146 |
| ROGUE_LEAVE_HIDE_FLOOR | trEffectNum | container | scripts3.js:72024 |
| ROGUE_OUTFITTING | booksObj | container | scripts3.js:70689,scripts3.js:70691,scripts3.js:70703,scripts3.js:70705 |
| ROGUE_PVE_ACTION | attArr | array|array|string | index.js:104194,index.js:104199⚠ |
| ROGUE_PVE_BATTLE_END | booksObj | container | scripts3.js:70689,scripts3.js:70691,scripts3.js:70703,scripts3.js:70705 |
| ROGUE_PVE_BATTLE_END | delTaskIds | array|object|array|string | index.js:133310,index.js:133311⚠ |
| ROGUE_PVE_BATTLE_END | mapData2 | container | scripts3.js:39096,scripts3.js:77146 |
| ROGUE_PVE_BATTLE_RESULT | booksObj | container | scripts3.js:70689,scripts3.js:70691,scripts3.js:70703,scripts3.js:70705 |
| ROGUE_PVE_BATTLE_RESULT | delTaskIds | array|object|array|string | index.js:133310,index.js:133311⚠ |
| ROGUE_PVE_BATTLE_RESULT | mapData2 | container | scripts3.js:39096,scripts3.js:77146 |
| ROGUE_PVP_BATTLE_END | delTaskIds | array|object|array|string | index.js:133310,index.js:133311⚠ |
| ROGUE_PVP_BATTLE_END | mapData2 | container | scripts3.js:39096,scripts3.js:77146 |
| ROGUE_SEASON_TOP_DATA | rankData | array|object|array|string | scripts3.js:71991,scripts3.js:71996,scripts3.js:71996⚠,scripts3.js:71998 |
| ROGUE_STORE_TRUNK_END | mapData2 | container | scripts3.js:39096,scripts3.js:77146 |
| ROGUE_TIANJIESHI_SELL_STORE | rewardArray | object | scripts3.js:71029 |
| ROGUE_USE_ITEM | delItemObj | array | index.js:3395,index.js:3428⚠ |
| ROGUE_USE_ITEM | equipObj | container | index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠ |
| ROGUE_USE_ITEM | rewardArray | container | scripts3.js:73957,scripts3.js:73958,scripts3.js:73962⚠ |
| SAVR_VILLAGE | npcIDArr | array|array|object|array|string | index.js:77889,index.js:77889⚠,index.js:77913,index.js:77913⚠ |
| SAVR_VILLAGE | rewardArray | array | index.js:1529,index.js:1530,index.js:1530⚠ |
| SCHOOL_APPOINT | appointDatas | array|object|array|string | index.js:113862,index.js:113862⚠,index.js:113863,index.js:113863⚠ |
| SCHOOL_PREPARE_TASK_COMPLETE | taskMap | array|object|array|string | scripts3.js:92796,scripts3.js:92796⚠,scripts3.js:92797,scripts3.js:92797⚠ |
| SCHOOL_PREPARE_TASK_REFRESH | taskMap | array|object|array|string | scripts3.js:92796,scripts3.js:92796⚠,scripts3.js:92797,scripts3.js:92797⚠ |
| SCHOOL_RECEIVE_WAGES | equipObj | container | index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠ |
| SCHOOL_RECEIVE_WAGES | upSchoolTaskCP | array|object | index.js:113660,index.js:113661,index.js:113662,index.js:113663 |
| SCHOOL_SUPPORT_PREPARE_TASK_COMPLETE | taskMap | array|object|array|string | scripts3.js:92796,scripts3.js:92796⚠,scripts3.js:92797,scripts3.js:92797⚠ |
| SCHOOL_SUPPORT_PREPARE_TASK_REFRESH | taskMap | array|object|array|string | scripts3.js:92796,scripts3.js:92796⚠,scripts3.js:92797,scripts3.js:92797⚠ |
| SCHOOL_TASK_COMPLETE | equipObj | container | index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠ |
| SCHOOL_TASK_COMPLETE | schoolTask | array|object | index.js:113643,index.js:113645,index.js:113645⚠,index.js:113646 |
| SERVER_NPC_BATTLE_END | awardObj | array|array|object | index.js:67705,index.js:67706⚠ |
| SERVER_NPC_BATTLE_END | gemId | array|array|string | scripts3.js:24429,scripts3.js:24429⚠,scripts3.js:24445 |
| SERVER_NPC_BATTLE_END | rewardArray | container | index.js:67707,index.js:67708 |
| SET_BUTLER | housekeeper |  | scripts3.js:23337⚠ |
| SET_CHAT_RED_DATA | uIds | array|string | index.js:132070,index.js:132071,index.js:132071⚠ |
| SET_TEMPLATE_DATA | housekeeper |  | scripts3.js:23337⚠ |
| SET_YP_EFFECT_STATE | titivateObj | array | index.js:107676,index.js:107676⚠,index.js:107814,index.js:107814⚠ |
| SEVEN_DAYS_AWARDS | SevenDaysArr | array|string | scripts2.js:81407,scripts2.js:81409⚠,scripts2.js:81412,scripts2.js:81412⚠ |
| SKILL_GRASP | knackBag | array|object|array|string | scripts3.js:81105,scripts3.js:81140,scripts3.js:81140⚠,scripts3.js:81141 |
| SKILL_GRASP | skillGraspData | container | scripts3.js:81106 |
| SPRING_SEVEN_DAYS_AWARDS | sevenDaysArr | array|object | scripts3.js:55160,scripts3.js:55160⚠,scripts3.js:55190,scripts3.js:55191 |
| START_DAZUO | hyTime | array|object | index.js:89052 |
| START_EAT_BY_TABLE | dishBag | container | index.js:62617 |
| START_EAT_BY_TABLE | tableData | container | index.js:62613,index.js:62614,index.js:62614⚠ |
| STC_ADDED_MATCH_INFONOTIFY | Score | container | index.js:22157,index.js:22187⚠ |
| STC_ANSWERINVITEJOINTEAMNOTIFY | RoleName | container | index.js:108006,index.js:67857,index.js:67858⚠,scripts2.js:3267 |
| STC_APPLYJOIN_TEAMANSWER | LeaderName | container | index.js:108006 |
| STC_BATTLEAWARD_SHOW | SpoilShow | array|string | index.js:23990 |
| STC_CHALLENGENPC_WAITREADY_NOTIFY | RoleReadyStatusList | array|object|array|string | index.js:26570 |
| STC_CHALLENGENPC_WAITREADY_NOTIFY | opRoleID | array|object|array|string | index.js:27317,index.js:27376⚠ |
| STC_CHAT_CHANNEL_RES | TextProperty | array|object|array|string | index.js:145956,index.js:145977,index.js:146248,scripts2.js:10483 |
| STC_CHAT_CHANNEL_RES | chatHistory | array|object|array|string | index.js:145959,index.js:145972 |
| STC_CHAT_SEND_RES | content | array|string | index.js:146049,index.js:146087⚠ |
| STC_CHAT_SEND_RES | sendTime | array|object | index.js:146301,index.js:146301⚠ |
| STC_COLLECT_ROLE_AWARD_NOTIFY | CollectionRollItemInfoList | array|object|array|string | index.js:26218,index.js:26218⚠ |
| STC_COLLECT_ROLL_CLOSE_NOTIFY | CollectionRollItemInfoList | array|object|array|string | index.js:26218,index.js:26218⚠ |
| STC_COLLECT_ROLL_ITEAMIF | CollectionRollItemInfoList | array|object|array|string | index.js:26218,index.js:26218⚠ |
| STC_COLLECT_ROLL_OPEN_NOTIFY | CollectionRollItemInfoList | array|object|array|string | index.js:26218,index.js:26218⚠ |
| STC_ELIMINATE_INFO | EliminatePKPair | array|array|string | index.js:85107 |
| STC_GIFT_BALL_AWARD_INFO | GiftBallAwardItemList | array|object|array|string | index.js:115519,index.js:115519⚠,index.js:115520,index.js:115520⚠ |
| STC_GIFT_BALL_OP_RESPONSE | Error | array|object | index.js:88175,index.js:88175⚠ |
| STC_INNER_FORCE_VALUE_CHANGE_NOTIFY | InnerForceValueChangeList | array|object|array|string | index.js:99406,index.js:99406⚠,index.js:99407,index.js:99407⚠ |
| STC_INNER_FORCE_VALUE_CHANGE_NOTIFY | InnerForceValuePair | array | index.js:99400,index.js:99400⚠ |
| STC_INVITEJOINTEAMNOTIFY | TeamBrief | array|object|array|string | index.js:27274,index.js:27308⚠ |
| STC_ITEM_CONSUME_NOTIFY | ItemInfoList | array|object|array|string | index.js:26528,index.js:26528⚠ |
| STC_LEAVE_MAP | roleId | container | index.js:62864,index.js:62915⚠,index.js:88845,index.js:88859⚠ |
| STC_MAPROLENOTIFY | mapRoleInfo | array|object|array|string | index.js:85036,index.js:85036⚠ |
| STC_MAP_GEAR_LIST_WRAPPER | MapGearList | array|object|array|string | index.js:26577 |
| STC_MESSAGE_LIST_NOTIFY | HorseRaceLampWrapperList | array|object|array|string | scripts3.js:47578,scripts3.js:47593⚠ |
| STC_OPENGEAE_NOTIFY | gearId | array|object|array|string | index.js:136095,index.js:136142⚠ |
| STC_OPENGEAE_NOTIFY | roleId | container | index.js:62864,index.js:62915⚠,index.js:88845,index.js:88859⚠ |
| STC_OPEN_MATCH_INTERFACERES | canMatchTime | array|string | index.js:24043,index.js:24043⚠ |
| STC_PRIVATE_CHAT_NOTIFY | SendContext | array|string | index.js:146087,index.js:146087⚠ |
| STC_PRIVATE_CHAT_NOTIFY | SenderId | array|object|array|string | scripts3.js:19062,scripts3.js:19120⚠,scripts3.js:21818,scripts3.js:21877⚠ |
| STC_QTE_ACTIVE_NOTIFY | InnerForceValueChangeList | array|object|array|string | index.js:99406,index.js:99406⚠,index.js:99407,index.js:99407⚠ |
| STC_QTE_OVER_NOTIFY | InnerForceValuePair | array | index.js:99400,index.js:99400⚠ |
| STC_QTE_RESULT_NOTIFY | InnerForceValueChangeList | array|object|array|string | index.js:99406,index.js:99406⚠,index.js:99407,index.js:99407⚠ |
| STC_QTE_RESULT_NOTIFY | InnerForceValuePair | array | index.js:99400,index.js:99400⚠ |
| STC_QTE_WAIT_READY_NOTIFY | InnerForceValuePair | array | index.js:99400,index.js:99400⚠ |
| STC_QUIT_TEAMNOTIFY | TeamBrief | array|object|array|string | index.js:27274,index.js:27308⚠ |
| STC_ROLE_AWARD_NOTIFY | AwardItemList | array|string | index.js:26468 |
| STC_ROLE_AWARD_NOTIFY | GData1 | array|object|array|string | index.js:10241,index.js:10242⚠ |
| STC_ROLE_AWARD_NOTIFY | GData2 | array|object|array|string | index.js:10241,index.js:10242⚠ |
| STC_ROLE_SLOT_UPDATE | RoleSlot | array|object|array|string | index.js:27089,index.js:27089⚠ |
| STC_ROLE_TEAM_UPDATE | TeamId | array|object|array|string | scripts3.js:11817 |
| STC_ROLL_ITEM_INFO_UPDATE_NOTIFY | RollItemInfo | array|object|array|string | index.js:26497,index.js:26498,index.js:26498⚠ |
| STC_SCENE_TEAM_BRIEF_RES | TeamBriefList | array|object|array|string | index.js:26985,index.js:26986,index.js:26986⚠ |
| STC_SCHOOL_RANK_RES | rankItems | array|string | scripts2.js:56998,scripts2.js:56998⚠ |
| STC_SET_TEAMDECLARATIONUPDATE | TeamBrief | array|object|array|string | index.js:27274,index.js:27308⚠ |
| STC_SOLONPC_NOTIFY | stage | array | scripts3.js:46273,scripts3.js:46276,scripts3.js:46276⚠ |
| STC_STUDY_NOTIFY | sRoleId | array|string | index.js:132148,index.js:132195⚠ |
| STC_TEAM_COPY_PROGRESS_UPDATE | killedNpc | array|object|array|string | index.js:26448,index.js:26448⚠ |
| STC_TEAM_INFO | ApplyInfoList | array|object|array|string | index.js:27046,index.js:27046⚠,index.js:27047,index.js:27047⚠ |
| STC_TEAM_INFO | CollectionRollItemInfoList | array|object|array|string | index.js:27059,index.js:27059⚠ |
| STC_TEAM_INFO | FiveLinesDiagramData | array|object|array|string | index.js:136101,index.js:136142⚠ |
| STC_TEAM_INFO | MapGearList | array|object|array|string | index.js:26577 |
| STC_TEAM_INFO | RoleSlot | array|object|array|string | index.js:27054,index.js:27089⚠,index.js:27282,index.js:27282⚠ |
| STC_TEAM_INFO | TeamBrief | array|object|array|string | index.js:27274,index.js:27308⚠ |
| STC_TEAM_INFO | TeamMemberList | array|object|array|string | index.js:27307,index.js:27308⚠,index.js:27375,index.js:27376⚠ |
| STC_TEAM_INFO | exchangeInfo | array|object|array|string | scripts3.js:21162,scripts3.js:21220⚠ |
| STC_TEAM_MEMBER_PROPERTY_NOTIFY | RoleProperty | array|object|array|string | index.js:27123,index.js:27123⚠,index.js:27124,index.js:27124⚠ |
| STC_UPDATE_GEARS_STATUS | GearList | array|object|array|string | index.js:136252 |
| STC_UPDATE_SCHOOL_WINNER_NOTIFY | winner | array|object|array|string | scripts3.js:10204,scripts3.js:10260⚠,scripts3.js:10697 |
| STC_WULIN_RANK_MATCH_RES | Score | container | index.js:22157,index.js:22187⚠ |
| STC_WULIN_TEAM_APPLY_ANSWER_NOTIFY | RoleName | container | index.js:108006,index.js:67857,index.js:67858⚠,scripts2.js:3267 |
| STC_WULIN_TEAM_DEL_INVITE_RES | TeamId | array|object|array|string | scripts3.js:11817 |
| STC_WULIN_TEAM_ELIMINATE_INFO | TeamEliminatePKPair | array|array|string | index.js:85123,index.js:85123⚠ |
| STC_WULIN_TEAM_ENTER_SYSTEM_NOTIFY | SystemSecond | array | scripts3.js:96272,scripts3.js:96290⚠ |
| STC_WULIN_TEAM_INVITE_ANSWER_NOTIFY | RoleName | container | index.js:108006,index.js:67857,index.js:67858⚠,scripts2.js:3267 |
| STC_WULIN_TEAM_MATCH_RES | Score | container | index.js:22157,index.js:22187⚠ |
| STEAL_CROP_EVENT | rewardArray | container | index.js:58029 |
| SUBMIT_JIGSAW_PREPARE_ITEM | ts | container | scripts3.js:40631 |
| SWEEP_DUNGEON | liveness | array|object|object|scalar | scripts3.js:63836,scripts3.js:63837⚠,scripts3.js:8113,scripts3.js:8122⚠ |
| SYCNPLAYERITEAMDATA | itemObj | container | index.js:24018 |
| SYCN_TASK | acceptTaskMap | container | index.js:133523,index.js:133525⚠ |
| SYCN_TASK | taskLog | array|object|array|string | scripts2.js:17066,scripts2.js:17066⚠,scripts2.js:17090,scripts2.js:17092⚠ |
| TABLE_RECEIVE | rewardArray | array | index.js:62647,index.js:62647⚠ |
| TABLE_RECEIVE | tableData | container | index.js:62642,index.js:62643,index.js:62643⚠ |
| TABLE_UNLOCK | tableData | container | index.js:62659,index.js:62660,index.js:62660⚠ |
| TENDING_TREES | plantingData | container | scripts3.js:60444 |
| TOWER_GET_PANDA_EVENT | eventArr | array|array|object | index.js:137656,index.js:137657,index.js:137657⚠ |
| TOWER_LEAVE_EVENT | PlayerEquip | container | index.js:65075,index.js:65077⚠,scripts3.js:73499,scripts3.js:73501⚠ |
| TOWER_RANDOM_EVENT | equipments | container | index.js:137600,index.js:137601 |
| TOWER_RANDOM_EVENT | eventID | container | index.js:29362 |
| TOWER_RANDOM_EVENT | npcArr | array|array|string | index.js:143820,index.js:143831,index.js:143831⚠,index.js:143832 |
| TOWER_SPECIAL_SHOP | shopData | container | index.js:138270,index.js:138270⚠,index.js:138271,index.js:138271⚠ |
| TREES_RECEIVE_REWARD | plantingData | container | scripts3.js:60444 |
| TRIGGER_CANDY | blankNpcCellMap | container | scripts3.js:51181 |
| TRIGGER_CANDY | candyReward | array|object | scripts3.js:51177 |
| UP_PUSH_SWITCH | pushSwitchData | container | scripts3.js:44286 |
| USER_FRIENDLIST | friendList | container | index.js:132212 |
| USER_FRIENDLIST | uIds | array|string | index.js:132071,index.js:132071⚠ |
| USER_ONHOOK_BREAK | friendName | container | index.js:108006 |
| USER_PVP | AttckData | array|object|array|string | index.js:104152,index.js:104152⚠ |
| USE_ITEM | avatarInfo | array|array|string | scripts2.js:49810,scripts2.js:49866,scripts2.js:49866⚠,scripts2.js:49867 |
| USE_ITEM | bloodEndTime | array|object|array|string | index.js:107897,index.js:107923⚠ |
| USE_ITEM | delItemObj | array | index.js:3395,index.js:3428⚠ |
| USE_ITEM | equipObj | container | index.js:1620,index.js:61608,index.js:65075,index.js:65077⚠ |
| USE_ITEM | gemId | array|array|string | scripts3.js:24429,scripts3.js:24429⚠,scripts3.js:24445 |
| USE_ITEM | hanyusuiTime | array|object | index.js:89038,index.js:89052 |
| USE_ITEM | housekeeper |  | scripts3.js:23337⚠ |
| USE_ITEM | partners | container | scripts3.js:59564,scripts3.js:59571,scripts3.js:59571⚠,scripts3.js:59575 |
| USE_ITEM | rewardArray | container | index.js:64764,index.js:64768,index.js:64772⚠ |
| USE_ITEM | rewardSkillSkin | container | index.js:64851,index.js:64853,index.js:64854⚠ |
| USE_ITEM | taskID | array|object|array|string | index.js:133601,index.js:133619⚠,index.js:135011,index.js:135070⚠ |
| USE_TREASURE | clearElites | array | scripts3.js:71007,scripts3.js:71007⚠ |
| WASH_ADDITION | bloodArr | array | index.js:144052,index.js:144058⚠ |
| WASH_MEDICINE | bloodArr | array | index.js:144058,index.js:144058⚠,index.js:144059,index.js:144059⚠ |
| WEAR_EQUIPMENT_ALL | equipments | container | index.js:92808 |
| WHORING_GIRL_EVENT | girlData | array|object | index.js:51115,index.js:51142⚠ |
