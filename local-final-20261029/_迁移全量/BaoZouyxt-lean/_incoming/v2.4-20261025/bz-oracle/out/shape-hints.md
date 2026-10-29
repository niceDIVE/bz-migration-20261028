# 应答字段消费方式（启发式【推断】）

150 个动作有线索；196 个字段不能用 0 兜底；132 个动作不能安全兜底。

## 不能安全兜底的动作（兜底时别回 eRet:1，或者把字段给全）

| 动作 | do 名 | 原因 |
|---|---|---|
| ACHV_CHANGE | achievement | nIds 缺了会崩（scripts3.js:2887,scripts3.js:2888⚠） |
| ACTIVE_TOWER_EVENT | User.activateTowerEvent | npcArr 缺了会崩（index.js:143820,index.js:143831,index.js:143831⚠,index.js:143832） |
| ADOPTCHILD | User.adoptChild | childName 缺了会崩（index.js:24867,index.js:24867⚠,scripts2.js:66272,scripts2.js:66272⚠） |
| ANN_PASS_FINISH_TASK | User.receiveAnniversaryPassTaskReward | dt 缺了会崩（scripts3.js:7880,scripts3.js:7880⚠） |
| BATCH_SEED_CROP | User.batchSeedCrop | crops 缺了会崩（index.js:57657,index.js:57658⚠） |
| BATTLE_END_REWARD | User.CheckBattleResult | gemId 缺了会崩（scripts3.js:24429,scripts3.js:24429⚠,scripts3.js:24445） |
| BEGINCAST | User.beginCast | inherit 缺了会崩（index.js:102107,index.js:102107⚠） |
| BEGINSAVE_NPC | User.BeginSaveNpc | npcIDArr 缺了会崩（index.js:90061,index.js:90061⚠） |
| BEGIN_LIST | User.BeginList | skill 缺了会崩（index.js:127618,index.js:127619,index.js:127647,index.js:127648） |
| BEGIN_PLAY_GAME | User.beginPlayGame | childName 缺了会崩（index.js:24867,index.js:24867⚠,scripts2.js:66272,scripts2.js:66272⚠） |
| BEGIN_WEDDING | User.beginWedding | proposeNpc 缺了会崩（index.js:77035,index.js:77036,index.js:77036⚠）；houseObj 缺了会崩（index.js:77226,index.js:77226⚠,index.js:77609）；happinessNum 缺了会崩（scripts3.js:58162,scripts3.js:58162⚠）；leaveNpc 缺了会崩（index.js:77043,index.js:77043⚠）；specialObj 缺了会崩（index.js:56734,index.js:56736,index.js:56736⚠,index.js:56740）；cycleObj 缺了会崩（index.js:77051,index.js:77052,index.js:77053,index.js:77057⚠） |
| BIRTHCHILD | User.birthChild | proposeNpc 缺了会崩（index.js:77035,index.js:77036,index.js:77036⚠）；houseObj 缺了会崩（index.js:77226,index.js:77226⚠,index.js:77609）；happinessNum 缺了会崩（scripts3.js:58162,scripts3.js:58162⚠）；leaveNpc 缺了会崩（index.js:77043,index.js:77043⚠）；specialObj 缺了会崩（index.js:56734,index.js:56736,index.js:56736⚠,index.js:56740）；cycleObj 缺了会崩（index.js:77051,index.js:77052,index.js:77053,index.js:77057⚠） |
| BUY_HOME_CROP | User.BuyHomeCrop | rewardArray 缺了会崩（index.js:57860,index.js:57874⚠） |
| CALL_DRAGON | User.callDragon | ApplyInfoList 缺了会崩（index.js:27044,index.js:27046,index.js:27046⚠）；RoleSlot 缺了会崩（index.js:27054,index.js:27089⚠,index.js:27282,index.js:27282⚠）；CollectionRollItemInfoList 缺了会崩（index.js:27059,index.js:27059⚠） |
| CHANGE_DELEGATE_TASK | User.changeDelegateTask | taskObj 缺了会崩（index.js:43518,index.js:43519⚠） |
| CHAT_PROPERTY_CHANGE | ChatPropertyChanged | TextProperty 缺了会崩（index.js:145956,index.js:145977,index.js:146248,scripts2.js:10483） |
| CHECK_LIVE | User.checkLive | formulaArr 缺了会崩（index.js:102149,index.js:102149⚠）；inherit 缺了会崩（index.js:102092,index.js:102092⚠） |
| CHOOSE_SEX | User.chooseSex | childName 缺了会崩（index.js:24867,index.js:24867⚠,scripts2.js:66272,scripts2.js:66272⚠） |
| CHOOSE_USEITEM_AWARD | User.chooseUsedItemAward | cData 缺了会崩（index.js:64952,index.js:64956⚠） |
| CIRCLE_TASK_TASK | User.circleTaskAward | rewardObj 缺了会崩（index.js:103616,index.js:103618⚠,index.js:103815,index.js:103816） |
| CLAIM_TR_REWARD | User.Storehouse | needItem 缺了会崩（index.js:139319,index.js:139319⚠,index.js:139335,index.js:139335⚠） |
| COMPLETE_ORDER_BY_HOTVAL | User.completeOrderByHotVal | unlockDish 缺了会崩（index.js:62251,index.js:62251⚠） |
| CREATE_ORDER_BY_HOTVAL | User.createOrderByHotVal | unlockDish 缺了会崩（index.js:62251,index.js:62251⚠） |
| CTS_FIVE_LINES_DIAGRAM_OBSTACLE_APPEAR | FiveLinesDiagramObstacleAppear | tianJiLock 缺了会崩（index.js:135999,index.js:135999⚠） |
| CTS_FIVE_LINES_DIAGRAM_PATH_GENERATE | FiveLinesDiagramPathGenerate | tianJiLock 缺了会崩（index.js:135999,index.js:135999⚠） |
| CTS_OPEN_FIVE_LINES_DIAGRAM_RES | OpenFiveLinesDiagramRes | tianJiLock 缺了会崩（index.js:135999,index.js:135999⚠） |
| CTS_UPLOAD_PATH_SEGMENT_RES | UploadPathSegmentRes | tianJiLock 缺了会崩（index.js:135999,index.js:135999⚠） |
| DISPATCH_AWARD | User.dispatchAward | rewardArray 缺了会崩（scripts3.js:23138,scripts3.js:23139,scripts3.js:23143⚠） |
| END_CAST | User.endCast | inherit 缺了会崩（index.js:102111,index.js:102111⚠） |
| END_DUNGEON_ADVENTURE | User.LeaveCopy | liveness 缺了会崩（scripts3.js:63836,scripts3.js:63837⚠,scripts3.js:8113,scripts3.js:8122⚠） |
| END_LIANGONG | User.EndTraining | skillArr 缺了会崩（index.js:120584,index.js:120584⚠）；skillid 缺了会崩（index.js:19099,index.js:19099⚠,scripts3.js:80379,scripts3.js:80379⚠） |
| END_PLAY_GAME | User.endPlayGame | childName 缺了会崩（index.js:24867,index.js:24867⚠,scripts2.js:66272,scripts2.js:66272⚠） |
| END_SAVE_NPC | User.EndSaveNpc | npcIDArr 缺了会崩（index.js:90061,index.js:90061⚠） |
| ENTER_GET_CLIMBLING_EVENT | User.GetClimbingTowerData | towerArray 缺了会崩（index.js:137553,index.js:137553⚠） |
| ENTER_OTHER_HOME | User.getFriendHomeList | soilArr 缺了会崩（index.js:57954,index.js:57964,index.js:57988⚠） |
| EQUIP_INHERIT | User.equipInherit | equip 缺了会崩（index.js:61486,index.js:61487⚠） |
| EQUIP_WASH | User.equipWash | addArr 缺了会崩（index.js:35612,index.js:35612⚠,scripts2.js:12277） |
| EXILE_CHILD | User.exileChild | proposeNpc 缺了会崩（index.js:77035,index.js:77036,index.js:77036⚠）；houseObj 缺了会崩（index.js:77226,index.js:77226⚠,index.js:77609）；happinessNum 缺了会崩（scripts3.js:58162,scripts3.js:58162⚠）；leaveNpc 缺了会崩（index.js:77043,index.js:77043⚠）；specialObj 缺了会崩（index.js:56734,index.js:56736,index.js:56736⚠,index.js:56740）；cycleObj 缺了会崩（index.js:77051,index.js:77052,index.js:77053,index.js:77057⚠） |
| FIND_OTHER_HOME | User.findOhter | findArr 缺了会崩（index.js:57949,index.js:57949⚠） |
| GETHOME_LIST | User.getHomeList | soilArr 缺了会崩（index.js:57643,index.js:57643⚠,index.js:57663,index.js:57663⚠） |
| GETNOTICE_REWARD | User.GetNoticeAward | rewardArray 缺了会崩（index.js:108241,index.js:108244⚠）；liveness 缺了会崩（scripts3.js:63836,scripts3.js:63837⚠,scripts3.js:8113,scripts3.js:8122⚠） |
| GET_ACHIEVE_DATA | User.getAchieveData | groupPoints 缺了会崩（scripts3.js:2901,scripts3.js:2932⚠）；rateIds 缺了会崩（scripts3.js:2947,scripts3.js:2947⚠,scripts3.js:3000,scripts3.js:3000⚠）；achieveIdArr 缺了会崩（scripts3.js:2903,scripts3.js:2921⚠） |
| GET_BACK_SHOP | User.getBackShop | shopArr 缺了会崩（index.js:145350,index.js:145350⚠,index.js:145351,index.js:145351⚠） |
| GET_BIGPAY_STATE_DATA | User.getBigPayState | 数据空会重发请求（index.js:55300） |
| GET_CIRCLE_TASK_LIST | User.getCircleTaskList | taskArr 缺了会崩（scripts3.js:23412,scripts3.js:23412⚠,scripts3.js:23413,scripts3.js:23413⚠） |
| GET_DRAGON | User.getDragon | ApplyInfoList 缺了会崩（index.js:27044,index.js:27046,index.js:27046⚠）；RoleSlot 缺了会崩（index.js:27054,index.js:27089⚠,index.js:27282,index.js:27282⚠）；CollectionRollItemInfoList 缺了会崩（index.js:27059,index.js:27059⚠） |
| GET_FASHION_SHOP | User.getFasionShop | shopArr 缺了会崩（index.js:145349,index.js:145350,index.js:145350⚠） |
| GET_GE_HELP_INFO | User.getGeHelpInfo | prestige 缺了会崩（scripts3.js:35349,scripts3.js:35349⚠,scripts3.js:35367,scripts3.js:35367⚠）；contribution 缺了会崩（scripts3.js:35350,scripts3.js:35350⚠,scripts3.js:35368,scripts3.js:35368⚠） |
| GET_GOOD_AND_EVIL_DATA | User.getGoodAndEvilData | prestige 缺了会崩（scripts3.js:35349,scripts3.js:35349⚠,scripts3.js:35367,scripts3.js:35367⚠）；contribution 缺了会崩（scripts3.js:35350,scripts3.js:35350⚠,scripts3.js:35368,scripts3.js:35368⚠） |
| GET_GOOD_AND_EVIL_RETIRE_DATA | User.getGoodAndEvilRetireData | prestige 缺了会崩（scripts3.js:35349,scripts3.js:35349⚠,scripts3.js:35367,scripts3.js:35367⚠）；contribution 缺了会崩（scripts3.js:35350,scripts3.js:35350⚠,scripts3.js:35368,scripts3.js:35368⚠） |
| GET_GOOD_AND_EVIL_RETIRE_LIST | User.getGoodAndEvilRetireList | prestige 缺了会崩（scripts3.js:35349,scripts3.js:35349⚠,scripts3.js:35367,scripts3.js:35367⚠）；contribution 缺了会崩（scripts3.js:35350,scripts3.js:35350⚠,scripts3.js:35368,scripts3.js:35368⚠） |
| GET_HOUSE_SHOP_DATA | User.GetHouseShopData | shopData 缺了会崩（index.js:138270,index.js:138270⚠,index.js:138271,index.js:138271⚠） |
| GET_INN_RANK | User.getInnRank | unlockDish 缺了会崩（index.js:62251,index.js:62251⚠） |
| GET_INN_SHOP | User.getInnShop | unlockDish 缺了会崩（index.js:62251,index.js:62251⚠） |
| GET_MARKETLIST | User.GetMarketList | market 缺了会崩（scripts2.js:8472,scripts2.js:8511⚠） |
| GET_PAY_STATE_DATA | User.getPayState | 数据空会重发请求（index.js:55300） |
| GET_RETURN_GIFT | User.getReturnGift | giftDatas 缺了会崩（scripts3.js:63544,scripts3.js:63545⚠） |
| GET_SNOW_REWARD | User.getSnowAward | rewardArray 缺了会崩（index.js:122532,index.js:122535⚠） |
| GET_SPECIAL_AWARD | User.getSpecialAward | rewardArray 缺了会崩（index.js:58462,index.js:58463,index.js:58465⚠） |
| GET_USEITEM_AWARD | User.getUsedItemAward | awardObj 缺了会崩（index.js:67705,index.js:67706,index.js:67706⚠） |
| HELP_DONE_TASK | User.helpDoneTask | prestige 缺了会崩（scripts3.js:35349,scripts3.js:35349⚠,scripts3.js:35367,scripts3.js:35367⚠）；contribution 缺了会崩（scripts3.js:35350,scripts3.js:35350⚠,scripts3.js:35368,scripts3.js:35368⚠） |
| HOME_SPECIAL_AWARD | User.homeSpeicalAward | rewardArray 缺了会崩（index.js:57867,index.js:57872,index.js:57874⚠） |
| INIT_MPPVE_BATTLE | User.enterMultiPVEBattle | battleData 缺了会崩（index.js:102742,index.js:102742⚠,index.js:146454,index.js:146507） |
| INN_BUY_SHOP | User.innBuyShop | unlockDish 缺了会崩（index.js:62251,index.js:62251⚠） |
| INVITE_NPC_OPTION | User.optionLikeEvent | npcId 缺了会崩（index.js:51168,index.js:51180⚠） |
| JOIN_CHATPK_SERVER | User.jionChatPkServer | newAcc 缺了会崩（index.js:111136,index.js:111138,index.js:111138⚠,index.js:28164） |
| JOIN_WULIN_PK_SERVER | User.jionWuLinPkServer | newAcc 缺了会崩（index.js:111136,index.js:111138,index.js:111138⚠,index.js:28164） |
| KILL_NPC | User.killNpc | npcIDArr 缺了会崩（index.js:90061,index.js:90061⚠） |
| LOOK_SECRET_PANDA_EVENT | User.lookSecretEvent | secret 缺了会崩（scripts2.js:75376,scripts2.js:75376⚠） |
| MAKE_LOVE | User.makeLove | proposeNpc 缺了会崩（index.js:77035,index.js:77036,index.js:77036⚠）；houseObj 缺了会崩（index.js:77226,index.js:77226⚠,index.js:77609）；happinessNum 缺了会崩（scripts3.js:58162,scripts3.js:58162⚠）；leaveNpc 缺了会崩（index.js:77043,index.js:77043⚠）；specialObj 缺了会崩（index.js:56734,index.js:56736,index.js:56736⚠,index.js:56740）；cycleObj 缺了会崩（index.js:77051,index.js:77052,index.js:77053,index.js:77057⚠） |
| MAKE_WISH_DRAGON | User.makeWishDragon | ApplyInfoList 缺了会崩（index.js:27044,index.js:27046,index.js:27046⚠）；RoleSlot 缺了会崩（index.js:27054,index.js:27089⚠,index.js:27282,index.js:27282⚠）；CollectionRollItemInfoList 缺了会崩（index.js:27059,index.js:27059⚠） |
| MARRY_AWARD | User.marryAward | proposeNpc 缺了会崩（index.js:77035,index.js:77036,index.js:77036⚠）；houseObj 缺了会崩（index.js:77226,index.js:77226⚠,index.js:77609）；happinessNum 缺了会崩（scripts3.js:58162,scripts3.js:58162⚠）；leaveNpc 缺了会崩（index.js:77043,index.js:77043⚠）；specialObj 缺了会崩（index.js:56734,index.js:56736,index.js:56736⚠,index.js:56740）；cycleObj 缺了会崩（index.js:77051,index.js:77052,index.js:77053,index.js:77057⚠） |
| ONE_KEY_DISPOSS_HOME_EVENT | User.onKeyDispossHomeEvent | cropMap 缺了会崩（index.js:57760,index.js:57781⚠） |
| ONE_KEY_OBTAIN_CROP | User.onKeyObtainCrop | obtainLands 缺了会崩（index.js:57735,index.js:57739⚠） |
| OTHER_PLAYER_HOME | User.findOHomes | homeArr 缺了会崩（index.js:57918,index.js:57919,index.js:57919⚠） |
| POP_EQUIP_STORAGE | User.PopEquip | ItemID 缺了会崩（index.js:26779,index.js:26779⚠） |
| PUSH_EQUIP_STORAGE | User.PushEquip | ItemID 缺了会崩（index.js:26779,index.js:26779⚠） |
| PVE_ACTION | User.beginPVEBattle | attArr 缺了会崩（index.js:98854,index.js:98863⚠） |
| RECEIVE_ACHIEVE_RATE_REWARD | User.receiveAchieveRateReward | rateIds 缺了会崩（scripts3.js:2947,scripts3.js:2947⚠） |
| RECEIVE_ACHIEVE_REWARD | User.receiveAchieveReward | achieveIdArr 缺了会崩（scripts3.js:2921,scripts3.js:2921⚠）；groupPoints 缺了会崩（scripts3.js:2930,scripts3.js:2932⚠） |
| RECEIVE_ACHIEVE_SUIT_REWARD | User.receiveAchieveSuitReward | srd 缺了会崩（scripts3.js:2955,scripts3.js:2959⚠） |
| RECEIVE_RETURN_GIFT_AWARD | User.receiveReturnGiftAward | giftData 缺了会崩（scripts2.js:67216,scripts2.js:67216⚠,scripts2.js:67588,scripts2.js:67590） |
| RECOMMEND_ONESELF_HOME | User.recommendOHomes | homeArr 缺了会崩（index.js:57882,index.js:57884,index.js:57919⚠） |
| REFRESH_RETURN_GIFT_AWARD | User.refreshReturnGiftAward | giftAwards 缺了会崩（scripts3.js:63551,scripts3.js:63555,scripts3.js:63555⚠） |
| REQ_BUY_FASHION | User.BuyFashion | titivateObj 缺了会崩（index.js:107676,index.js:107676⚠,index.js:107814,index.js:107814⚠） |
| REQ_LANGHUAN_COMBAT | User.enterPVEBattle | attArr 缺了会崩（index.js:98834,index.js:98863⚠）；AttckData 缺了会崩（index.js:104152,index.js:104152⚠）；npcArr 缺了会崩（index.js:143820,index.js:143831,index.js:143831⚠,index.js:143832） |
| REQ_MP_RESULT | User.mulitiNpcBattleResult | gemId 缺了会崩（scripts3.js:24429,scripts3.js:24429⚠,scripts3.js:24445） |
| REQ_ROGUE_PVE_COMBAT | User.enterRoguePVEBattle | attArr 缺了会崩（index.js:104183,index.js:104184,index.js:104185,index.js:104186）；AttckData 缺了会崩（index.js:104152,index.js:104152⚠）；npcArr 缺了会崩（index.js:143820,index.js:143831,index.js:143831⚠,index.js:143832）；exchangeNpcArr 缺了会崩（index.js:104162,index.js:104162⚠） |
| REQ_ROGUE_PVP_BATTLE | User.ChallengeRoguePVP | AttckData 缺了会崩（index.js:104152,index.js:104152⚠） |
| REQ_WM_ADV_RWD | User.GetRandomEventAward | rewardArray 缺了会崩（index.js:143816,index.js:143827⚠）；npcArr 缺了会崩（index.js:143820,index.js:143831⚠）；liveness 缺了会崩（scripts3.js:63836,scripts3.js:63837⚠,scripts3.js:8113,scripts3.js:8122⚠） |
| REQ_WULIN_ASSEMBLY_MATCHTIME | see_wu_lin_assembly_match_time | WuLinMatchConfigList 缺了会崩（scripts3.js:95838,scripts3.js:95845⚠） |
| RESET_CHILD_FOSTER | User.resetChildFoster | childName 缺了会崩（index.js:24867,index.js:24867⚠,scripts2.js:66272,scripts2.js:66272⚠） |
| RES_SUBTITLE_ADD | subtitle_add | insert_content 缺了会崩（index.js:146237,index.js:146237⚠） |
| RES_SUBTITLE_HIGHT | show_high_rank | data 缺了会崩（scripts2.js:11908,scripts2.js:11922,scripts2.js:11922⚠,scripts2.js:11923） |
| RES_SUBTITLE_HOT | subtitle_hot | data 缺了会崩（scripts2.js:11922,scripts2.js:11922⚠,scripts2.js:11923,scripts2.js:11923⚠） |
| RES_SUBTITLE_LOW | show_low_rank | data 缺了会崩（scripts2.js:11908,scripts2.js:11922,scripts2.js:11922⚠,scripts2.js:11923） |
| RES_SUBTITLE_NEW | subtitle_new | data 缺了会崩（scripts2.js:11922,scripts2.js:11922⚠,scripts2.js:11923,scripts2.js:11923⚠） |
| ROGUE_PVE_ACTION | User.beginRoguePVEBattle | attArr 缺了会崩（index.js:104194,index.js:104199⚠） |
| ROGUE_USE_ITEM | User.rgUseItem | rewardArray 缺了会崩（scripts3.js:73957,scripts3.js:73958,scripts3.js:73962⚠） |
| SERVER_NPC_BATTLE_END | User.TowerBattleResult | awardObj 缺了会崩（index.js:67705,index.js:67706⚠）；gemId 缺了会崩（scripts3.js:24429,scripts3.js:24429⚠,scripts3.js:24445） |
| SET_YP_EFFECT_STATE | User.upFashionFaceState | titivateObj 缺了会崩（index.js:107676,index.js:107676⚠,index.js:107814,index.js:107814⚠） |
| STC_ANSWERINVITEJOINTEAMNOTIFY | AnswerInviteJoinTeamNotify | RoleName 缺了会崩（scripts2.js:3267,scripts2.js:3267⚠,scripts3.js:10482,scripts3.js:10483⚠） |
| STC_CHAT_CHANNEL_RES | OpenChatChannelRes | TextProperty 缺了会崩（index.js:145956,index.js:145977,index.js:146248,scripts2.js:10483） |
| STC_CHAT_SEND_RES | ChatMessageRes | sendTime 缺了会崩（index.js:146301,index.js:146301⚠）；content 缺了会崩（index.js:146049,index.js:146087⚠） |
| STC_COLLECT_ROLE_AWARD_NOTIFY | CollectionRoleAwardNotify | CollectionRollItemInfoList 缺了会崩（index.js:26218,index.js:26218⚠） |
| STC_COLLECT_ROLL_CLOSE_NOTIFY | CollectionRollCloseNotify | CollectionRollItemInfoList 缺了会崩（index.js:26218,index.js:26218⚠） |
| STC_COLLECT_ROLL_ITEAMIF | CollectionRollItemInfoListNotify | CollectionRollItemInfoList 缺了会崩（index.js:26218,index.js:26218⚠） |
| STC_COLLECT_ROLL_OPEN_NOTIFY | CollectionRollOpenNotify | CollectionRollItemInfoList 缺了会崩（index.js:26218,index.js:26218⚠） |
| STC_INNER_FORCE_VALUE_CHANGE_NOTIFY | InnerForceValueChangeNotify | InnerForceValueChangeList 缺了会崩（index.js:99406,index.js:99406⚠,index.js:99407,index.js:99407⚠）；InnerForceValuePair 缺了会崩（index.js:99400,index.js:99400⚠） |
| STC_ITEM_CONSUME_NOTIFY | ItemConsumeNotify | ItemInfoList 缺了会崩（index.js:26528,index.js:26528⚠） |
| STC_LEAVE_MAP | LeaveMapNotify | sceneId 缺了会崩（scripts2.js:48682,scripts2.js:48682⚠） |
| STC_MAPROLENOTIFY | MapRoleInfoNotify | mapRoleInfo 缺了会崩（index.js:85036,index.js:85036⚠） |
| STC_MESSAGE_LIST_NOTIFY | MessageListNotify | HorseRaceLampWrapperList 缺了会崩（scripts3.js:47578,scripts3.js:47593⚠） |
| STC_OPEN_MATCH_INTERFACERES | OpenMatchInterfaceRes | canMatchTime 缺了会崩（index.js:24043,index.js:24043⚠） |
| STC_PRIVATE_CHAT_NOTIFY | PrivateLeaveWorldNotify | SendContext 缺了会崩（index.js:146087,index.js:146087⚠） |
| STC_QTE_ACTIVE_NOTIFY | QTEActiveNotify | InnerForceValueChangeList 缺了会崩（index.js:99406,index.js:99406⚠,index.js:99407,index.js:99407⚠） |
| STC_QTE_OVER_NOTIFY | QTEOverNotify | InnerForceValuePair 缺了会崩（index.js:99400,index.js:99400⚠） |
| STC_QTE_RESULT_NOTIFY | QTEResultNotify | InnerForceValueChangeList 缺了会崩（index.js:99406,index.js:99406⚠,index.js:99407,index.js:99407⚠）；InnerForceValuePair 缺了会崩（index.js:99400,index.js:99400⚠） |
| STC_QTE_WAIT_READY_NOTIFY | InnerCompetitionWaitReadyNotify | InnerForceValuePair 缺了会崩（index.js:99400,index.js:99400⚠） |
| STC_ROLL_ITEM_INFO_UPDATE_NOTIFY | RollItemInfoUpdateNotify | RollItemInfo 缺了会崩（index.js:26497,index.js:26498,index.js:26498⚠） |
| STC_SCENE_TEAM_BRIEF_RES | SceneTeamBriefRes | TeamBriefList 缺了会崩（index.js:26985,index.js:26986,index.js:26986⚠） |
| STC_SOLONPC_NOTIFY | SoloNpcNotify | stage 缺了会崩（scripts3.js:46273,scripts3.js:46276,scripts3.js:46276⚠） |
| STC_TEAM_COPY_PROGRESS_UPDATE | TeamCopyProgressUpdate | killedNpc 缺了会崩（index.js:26448,index.js:26448⚠） |
| STC_WULIN_TEAM_ELIMINATE_INFO | TeamEliminateInfo | TeamEliminatePKPair 缺了会崩（index.js:85123,index.js:85123⚠） |
| SWEEP_DUNGEON | User.sweepCopy | liveness 缺了会崩（scripts3.js:63836,scripts3.js:63837⚠,scripts3.js:8113,scripts3.js:8122⚠） |
| TOWER_GET_PANDA_EVENT | User.getPandaEvent | eventArr 缺了会崩（index.js:137656,index.js:137657,index.js:137657⚠） |
| TOWER_RANDOM_EVENT | User.chanllengeTower | npcArr 缺了会崩（index.js:143820,index.js:143831,index.js:143831⚠,index.js:143832） |
| TOWER_SPECIAL_SHOP | User.GetTowerSpecialShop | shopData 缺了会崩（index.js:138270,index.js:138270⚠,index.js:138271,index.js:138271⚠） |
| USER_PVP | User.ChallengePVP | AttckData 缺了会崩（index.js:104152,index.js:104152⚠） |
| USE_ITEM | User.useItem | rewardArray 缺了会崩（index.js:64764,index.js:64768,index.js:64772⚠）；gemId 缺了会崩（scripts3.js:24429,scripts3.js:24429⚠,scripts3.js:24445）；partners 缺了会崩（scripts3.js:59564,scripts3.js:59571,scripts3.js:59571⚠,scripts3.js:59575）；avatarInfo 缺了会崩（scripts2.js:49810,scripts2.js:49866,scripts2.js:49866⚠,scripts2.js:49867）；rewardSkillSkin 缺了会崩（index.js:64851,index.js:64853,index.js:64854⚠） |
| WASH_ADDITION | User.washAdditionalArr | bloodArr 缺了会崩（index.js:144052,index.js:144058⚠） |
| WHORING_GIRL_EVENT | User.GetWhoreData | girlData 缺了会崩（index.js:51115,index.js:51142⚠） |

## 不能用 0 兜底的字段

| 动作 | 字段 | 实际形状 | 消费点 |
|---|---|---|---|
| ACHV_CHANGE | nIds | array|object|array|string | scripts3.js:2887,scripts3.js:2888⚠ |
| ACTIVE_TOWER_EVENT | npcArr | array|array|string | index.js:143820,index.js:143831,index.js:143831⚠,index.js:143832 |
| ADOPTCHILD | childName | array|string | index.js:24867,index.js:24867⚠,scripts2.js:66272,scripts2.js:66272⚠ |
| ANN_PASS_BUY_LIVENESS | td | container | scripts3.js:7861 |
| ANN_PASS_FINISH_TASK | dt | array|object|array|string | scripts3.js:7880,scripts3.js:7880⚠ |
| BATCH_SEED_CROP | crops | container | index.js:57657,index.js:57658⚠ |
| BATTLE_END_REWARD | gemId | array|array|string | scripts3.js:24429,scripts3.js:24429⚠,scripts3.js:24445 |
| BEGINCAST | inherit | array|array|string | index.js:102107,index.js:102107⚠ |
| BEGINSAVE_NPC | npcIDArr | array|array|object|array|string | index.js:90061,index.js:90061⚠ |
| BEGIN_LIST | skill | array|array|object|array|string|scalar | index.js:127618,index.js:127619,index.js:127647,index.js:127648 |
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
| BUY_HOME_CROP | rewardArray | container | index.js:57860,index.js:57874⚠ |
| CALL_DRAGON | ApplyInfoList | array|object|array|string | index.js:27044,index.js:27046,index.js:27046⚠ |
| CALL_DRAGON | CollectionRollItemInfoList | array|object|array|string | index.js:27059,index.js:27059⚠ |
| CALL_DRAGON | RoleSlot | array|object|array|string | index.js:27054,index.js:27089⚠,index.js:27282,index.js:27282⚠ |
| CHANGE_DELEGATE_TASK | taskObj | container | index.js:43518,index.js:43519⚠ |
| CHAT_PROPERTY_CHANGE | TextProperty | array|object|array|string | index.js:145956,index.js:145977,index.js:146248,scripts2.js:10483 |
| CHECK_LIVE | formulaArr | array|object|array|string | index.js:102149,index.js:102149⚠ |
| CHECK_LIVE | inherit | array|array|string | index.js:102092,index.js:102092⚠ |
| CHOOSE_SEX | childName | array|string | index.js:24867,index.js:24867⚠,scripts2.js:66272,scripts2.js:66272⚠ |
| CHOOSE_USEITEM_AWARD | cData | container | index.js:64952,index.js:64956⚠ |
| CIRCLE_TASK_TASK | rewardObj | container | index.js:103616,index.js:103618⚠,index.js:103815,index.js:103816 |
| CLAIM_TR_REWARD | needItem | array | index.js:139319,index.js:139319⚠,index.js:139335,index.js:139335⚠ |
| COLLECT | rewardArray | container | index.js:25210 |
| COMPLETE_ORDER_BY_HOTVAL | unlockDish | container | index.js:62251,index.js:62251⚠ |
| CREATE_ORDER_BY_HOTVAL | unlockDish | container | index.js:62251,index.js:62251⚠ |
| CTS_FIVE_LINES_DIAGRAM_OBSTACLE_APPEAR | tianJiLock | array|object|array|string | index.js:135999,index.js:135999⚠ |
| CTS_FIVE_LINES_DIAGRAM_PATH_GENERATE | tianJiLock | array|object|array|string | index.js:135999,index.js:135999⚠ |
| CTS_OPEN_FIVE_LINES_DIAGRAM_RES | tianJiLock | array|object|array|string | index.js:135999,index.js:135999⚠ |
| CTS_UPLOAD_PATH_SEGMENT_RES | tianJiLock | array|object|array|string | index.js:135999,index.js:135999⚠ |
| DISPATCH_AWARD | rewardArray | container | scripts3.js:23138,scripts3.js:23139,scripts3.js:23143⚠ |
| DISPOSS_HOME_EVENT | rewardArray | container | index.js:58002 |
| END_CAST | inherit | array|array|string | index.js:102111,index.js:102111⚠ |
| END_DUNGEON_ADVENTURE | liveness | array|object|object|scalar | scripts3.js:63836,scripts3.js:63837⚠,scripts3.js:8113,scripts3.js:8122⚠ |
| END_LIANGONG | skillArr | array|array|string | index.js:120584,index.js:120584⚠ |
| END_PLAY_GAME | childName | array|string | index.js:24867,index.js:24867⚠,scripts2.js:66272,scripts2.js:66272⚠ |
| END_SAVE_NPC | npcIDArr | array|array|object|array|string | index.js:90061,index.js:90061⚠ |
| ENTER_GET_CLIMBLING_EVENT | towerArray | array | index.js:137553,index.js:137553⚠ |
| ENTER_OTHER_HOME | soilArr | array|object | index.js:57954,index.js:57964,index.js:57988⚠ |
| EQUIP_INHERIT | equip | array | index.js:61486,index.js:61487⚠ |
| EQUIP_WASH | addArr | array|object|array|string | index.js:35612,index.js:35612⚠,scripts2.js:12277 |
| EXILE_CHILD | cycleObj | array|array|string | index.js:77051,index.js:77052,index.js:77053,index.js:77057⚠ |
| EXILE_CHILD | houseObj | container | index.js:77226,index.js:77226⚠,index.js:77609 |
| EXILE_CHILD | leaveNpc | array|object|array|string | index.js:77043,index.js:77043⚠ |
| EXILE_CHILD | proposeNpc | array|object|array|string | index.js:77035,index.js:77036,index.js:77036⚠ |
| EXILE_CHILD | specialObj | container | index.js:56734,index.js:56736,index.js:56736⚠,index.js:56740 |
| FIND_OTHER_HOME | findArr | array | index.js:57949,index.js:57949⚠ |
| GETHOME_LIST | soilArr | array|object|array|string | index.js:57643,index.js:57643⚠,index.js:57663,index.js:57663⚠ |
| GETNOTICE_REWARD | liveness | array|object|object|scalar | scripts3.js:63836,scripts3.js:63837⚠,scripts3.js:8113,scripts3.js:8122⚠ |
| GETNOTICE_REWARD | rewardArray | container | index.js:108241,index.js:108244⚠ |
| GET_ACHIEVE_DATA | achieveIdArr | array|object|array|string | scripts3.js:2903,scripts3.js:2921⚠ |
| GET_ACHIEVE_DATA | groupPoints | container | scripts3.js:2901,scripts3.js:2932⚠ |
| GET_ACHIEVE_DATA | rateIds | container | scripts3.js:2947,scripts3.js:2947⚠,scripts3.js:3000,scripts3.js:3000⚠ |
| GET_BACK_SHOP | shopArr | array|array|object|array|string | index.js:145350,index.js:145350⚠,index.js:145351,index.js:145351⚠ |
| GET_CIRCLE_TASK_LIST | taskArr | array|object|array|string | scripts3.js:23412,scripts3.js:23412⚠,scripts3.js:23413,scripts3.js:23413⚠ |
| GET_DRAGON | ApplyInfoList | array|object|array|string | index.js:27044,index.js:27046,index.js:27046⚠ |
| GET_DRAGON | CollectionRollItemInfoList | array|object|array|string | index.js:27059,index.js:27059⚠ |
| GET_DRAGON | RoleSlot | array|object|array|string | index.js:27054,index.js:27089⚠,index.js:27282,index.js:27282⚠ |
| GET_FASHION_SHOP | shopArr | array|object|array|string | index.js:145349,index.js:145350,index.js:145350⚠ |
| GET_HOUSE_SHOP_DATA | shopData | container | index.js:138270,index.js:138270⚠,index.js:138271,index.js:138271⚠ |
| GET_INN_RANK | unlockDish | container | index.js:62251,index.js:62251⚠ |
| GET_INN_SHOP | unlockDish | container | index.js:62251,index.js:62251⚠ |
| GET_KNACK_LOTTERY | optionalDatas | array|object|array|string | scripts3.js:90012 |
| GET_KNACK_LOTTERY | upSkillRateData | container | scripts3.js:90010 |
| GET_KNACK_LOTTERY_HISTORY | optionalDatas | array|object|array|string | scripts3.js:90012 |
| GET_KNACK_LOTTERY_HISTORY | upSkillRateData | container | scripts3.js:90010 |
| GET_MARKETLIST | market | container | scripts2.js:8472,scripts2.js:8511⚠ |
| GET_MP_ULTSKILLS | dataArr | array|object|array|string | index.js:110884 |
| GET_RETURN_GIFT | giftDatas | array | scripts3.js:63544,scripts3.js:63545⚠ |
| GET_SNOW_REWARD | rewardArray | container | index.js:122532,index.js:122535⚠ |
| GET_SPECIAL_AWARD | rewardArray | container | index.js:58462,index.js:58463,index.js:58465⚠ |
| GET_TEAM_ULTSKILLS | dataArr | array|object|array|string | index.js:54941 |
| GET_USEITEM_AWARD | awardObj | array | index.js:67705,index.js:67706,index.js:67706⚠ |
| HOME_SPECIAL_AWARD | rewardArray | container | index.js:57867,index.js:57872,index.js:57874⚠ |
| INIT_MPPVE_BATTLE | battleData | array|array|string | index.js:102742,index.js:102742⚠,index.js:146454,index.js:146507 |
| INIT_MPPVE_BATTLE | linepID | array|array|string | index.js:110848 |
| INN_BUY_SHOP | unlockDish | container | index.js:62251,index.js:62251⚠ |
| INVITE_NPC_OPTION | npcId | array | index.js:51168,index.js:51180⚠ |
| KILL_NPC | npcIDArr | array|array|object|array|string | index.js:90061,index.js:90061⚠ |
| KNACK_LOTTERY | optionalDatas | array|object|array|string | scripts3.js:90012 |
| KNACK_LOTTERY | upSkillRateData | container | scripts3.js:90010 |
| LOOK_SECRET_PANDA_EVENT | secret | array|object|array|string | scripts2.js:75376,scripts2.js:75376⚠ |
| MAKE_LOVE | cycleObj | array|array|string | index.js:77051,index.js:77052,index.js:77053,index.js:77057⚠ |
| MAKE_LOVE | houseObj | container | index.js:77226,index.js:77226⚠,index.js:77609 |
| MAKE_LOVE | leaveNpc | array|object|array|string | index.js:77043,index.js:77043⚠ |
| MAKE_LOVE | proposeNpc | array|object|array|string | index.js:77035,index.js:77036,index.js:77036⚠ |
| MAKE_LOVE | specialObj | container | index.js:56734,index.js:56736,index.js:56736⚠,index.js:56740 |
| MAKE_WISH_DRAGON | ApplyInfoList | array|object|array|string | index.js:27044,index.js:27046,index.js:27046⚠ |
| MAKE_WISH_DRAGON | CollectionRollItemInfoList | array|object|array|string | index.js:27059,index.js:27059⚠ |
| MAKE_WISH_DRAGON | RoleSlot | array|object|array|string | index.js:27054,index.js:27089⚠,index.js:27282,index.js:27282⚠ |
| MARRY_AWARD | cycleObj | array|array|string | index.js:77051,index.js:77052,index.js:77053,index.js:77057⚠ |
| MARRY_AWARD | houseObj | container | index.js:77226,index.js:77226⚠,index.js:77609 |
| MARRY_AWARD | leaveNpc | array|object|array|string | index.js:77043,index.js:77043⚠ |
| MARRY_AWARD | proposeNpc | array|object|array|string | index.js:77035,index.js:77036,index.js:77036⚠ |
| MARRY_AWARD | specialObj | container | index.js:56734,index.js:56736,index.js:56736⚠,index.js:56740 |
| OBTAINCROP | rewardArray | container | index.js:57712 |
| ONE_KEY_DISPOSS_HOME_EVENT | cropMap | container | index.js:57760,index.js:57781⚠ |
| ONE_KEY_DISPOSS_HOME_EVENT | rewardArray | container | index.js:57798 |
| ONE_KEY_OBTAIN_CROP | obtainLands | array|object|array|string | index.js:57735,index.js:57739⚠ |
| ONE_KEY_OBTAIN_CROP | rewardArray | container | index.js:57754 |
| OTHER_PLAYER_HOME | homeArr | array|object|array|string | index.js:57918,index.js:57919,index.js:57919⚠ |
| OTHER_PLAYER_HOME | recommendHomeArr | array|object|array|string | index.js:57933,index.js:57934 |
| PVE_ACTION | attArr | array|array|string | index.js:98854,index.js:98863⚠ |
| RECEIVE_ACHIEVEMENT_REWARD | optionalDatas | array|object|array|string | scripts3.js:90012 |
| RECEIVE_ACHIEVEMENT_REWARD | upSkillRateData | container | scripts3.js:90010 |
| RECEIVE_ACHIEVE_RATE_REWARD | rateIds | container | scripts3.js:2947,scripts3.js:2947⚠ |
| RECEIVE_ACHIEVE_REWARD | achieveIdArr | container | scripts3.js:2921,scripts3.js:2921⚠ |
| RECEIVE_ACHIEVE_REWARD | groupPoints | container | scripts3.js:2930,scripts3.js:2932⚠ |
| RECEIVE_ACHIEVE_SUIT_REWARD | srd | container | scripts3.js:2955,scripts3.js:2959⚠ |
| RECEIVE_RETURN_GIFT_AWARD | giftData | container | scripts2.js:67216,scripts2.js:67216⚠,scripts2.js:67588,scripts2.js:67590 |
| RECOMMEND_ONESELF_HOME | friendHome | array|object|array|string | index.js:57891 |
| RECOMMEND_ONESELF_HOME | homeArr | array|object|array|string | index.js:57882,index.js:57884,index.js:57919⚠ |
| REFRESH_RETURN_GIFT_AWARD | giftAwards | array | scripts3.js:63551,scripts3.js:63555,scripts3.js:63555⚠ |
| REQ_BUY_FASHION | titivateObj | array | index.js:107676,index.js:107676⚠,index.js:107814,index.js:107814⚠ |
| REQ_LANGHUAN_COMBAT | AttckData | array|object|array|string | index.js:104152,index.js:104152⚠ |
| REQ_LANGHUAN_COMBAT | attArr | array|array|string | index.js:98834,index.js:98863⚠ |
| REQ_LANGHUAN_COMBAT | npcArr | array|array|string | index.js:143820,index.js:143831,index.js:143831⚠,index.js:143832 |
| REQ_MP_RESULT | gemId | array|array|string | scripts3.js:24429,scripts3.js:24429⚠,scripts3.js:24445 |
| REQ_ROGUE_PVE_COMBAT | AttckData | array|object|array|string | index.js:104152,index.js:104152⚠ |
| REQ_ROGUE_PVE_COMBAT | attArr | array|array|object|array|string | index.js:104183,index.js:104184,index.js:104185,index.js:104186 |
| REQ_ROGUE_PVE_COMBAT | exchangeNpcArr | array|object|array|string | index.js:104162,index.js:104162⚠ |
| REQ_ROGUE_PVE_COMBAT | npcArr | array|array|string | index.js:143820,index.js:143831,index.js:143831⚠,index.js:143832 |
| REQ_ROGUE_PVP_BATTLE | AttckData | array|object|array|string | index.js:104152,index.js:104152⚠ |
| REQ_SERVER_LIST | serverObj | container | index.js:116722 |
| REQ_WM_ADV_RWD | liveness | array|object|object|scalar | scripts3.js:63836,scripts3.js:63837⚠,scripts3.js:8113,scripts3.js:8122⚠ |
| REQ_WM_ADV_RWD | npcArr | array|array|string | index.js:143820,index.js:143831⚠ |
| REQ_WM_ADV_RWD | rewardArray | container | index.js:143816,index.js:143827⚠ |
| REQ_WULIN_ASSEMBLY_MATCHTIME | WuLinMatchConfigList | array|object|array|string | scripts3.js:95838,scripts3.js:95845⚠ |
| RESET_CHILD_FOSTER | childName | array|string | index.js:24867,index.js:24867⚠,scripts2.js:66272,scripts2.js:66272⚠ |
| RES_SUBTITLE_ADD | insert_content | array|string | index.js:146237,index.js:146237⚠ |
| RES_SUBTITLE_HIGHT | data | array|object|array|string | scripts2.js:11908,scripts2.js:11922,scripts2.js:11922⚠,scripts2.js:11923 |
| RES_SUBTITLE_HOT | data | array|object|array|string | scripts2.js:11922,scripts2.js:11922⚠,scripts2.js:11923,scripts2.js:11923⚠ |
| RES_SUBTITLE_LOW | data | array|object|array|string | scripts2.js:11908,scripts2.js:11922,scripts2.js:11922⚠,scripts2.js:11923 |
| RES_SUBTITLE_NEW | data | array|object|array|string | scripts2.js:11922,scripts2.js:11922⚠,scripts2.js:11923,scripts2.js:11923⚠ |
| ROGUE_CHANGE_SKNACK | skillGraspData | container | scripts3.js:73998 |
| ROGUE_PVE_ACTION | attArr | array|array|string | index.js:104194,index.js:104199⚠ |
| ROGUE_USE_ITEM | rewardArray | container | scripts3.js:73957,scripts3.js:73958,scripts3.js:73962⚠ |
| SERVER_NPC_BATTLE_END | awardObj | array|array|object | index.js:67705,index.js:67706⚠ |
| SERVER_NPC_BATTLE_END | gemId | array|array|string | scripts3.js:24429,scripts3.js:24429⚠,scripts3.js:24445 |
| SERVER_NPC_BATTLE_END | rewardArray | container | index.js:67707,index.js:67708 |
| SET_YP_EFFECT_STATE | titivateObj | array | index.js:107676,index.js:107676⚠,index.js:107814,index.js:107814⚠ |
| STC_ANSWERINVITEJOINTEAMNOTIFY | RoleName | array|string | scripts2.js:3267,scripts2.js:3267⚠,scripts3.js:10482,scripts3.js:10483⚠ |
| STC_BATTLEAWARD_SHOW | SpoilShow | array|string | index.js:23990 |
| STC_CHAT_CHANNEL_RES | TextProperty | array|object|array|string | index.js:145956,index.js:145977,index.js:146248,scripts2.js:10483 |
| STC_CHAT_CHANNEL_RES | chatHistory | array|object|array|string | index.js:145959,index.js:145972 |
| STC_CHAT_SEND_RES | content | array|string | index.js:146049,index.js:146087⚠ |
| STC_CHAT_SEND_RES | sendTime | array|object | index.js:146301,index.js:146301⚠ |
| STC_COLLECT_ROLE_AWARD_NOTIFY | CollectionRollItemInfoList | array|object|array|string | index.js:26218,index.js:26218⚠ |
| STC_COLLECT_ROLL_CLOSE_NOTIFY | CollectionRollItemInfoList | array|object|array|string | index.js:26218,index.js:26218⚠ |
| STC_COLLECT_ROLL_ITEAMIF | CollectionRollItemInfoList | array|object|array|string | index.js:26218,index.js:26218⚠ |
| STC_COLLECT_ROLL_OPEN_NOTIFY | CollectionRollItemInfoList | array|object|array|string | index.js:26218,index.js:26218⚠ |
| STC_ELIMINATE_INFO | EliminatePKPair | array|array|string | index.js:85107 |
| STC_INNER_FORCE_VALUE_CHANGE_NOTIFY | InnerForceValueChangeList | array|object|array|string | index.js:99406,index.js:99406⚠,index.js:99407,index.js:99407⚠ |
| STC_INNER_FORCE_VALUE_CHANGE_NOTIFY | InnerForceValuePair | array | index.js:99400,index.js:99400⚠ |
| STC_ITEM_CONSUME_NOTIFY | ItemInfoList | array|object|array|string | index.js:26528,index.js:26528⚠ |
| STC_MAPROLENOTIFY | mapRoleInfo | array|object|array|string | index.js:85036,index.js:85036⚠ |
| STC_MESSAGE_LIST_NOTIFY | HorseRaceLampWrapperList | array|object|array|string | scripts3.js:47578,scripts3.js:47593⚠ |
| STC_OPEN_MATCH_INTERFACERES | canMatchTime | array|string | index.js:24043,index.js:24043⚠ |
| STC_PRIVATE_CHAT_NOTIFY | SendContext | array|string | index.js:146087,index.js:146087⚠ |
| STC_QTE_ACTIVE_NOTIFY | InnerForceValueChangeList | array|object|array|string | index.js:99406,index.js:99406⚠,index.js:99407,index.js:99407⚠ |
| STC_QTE_OVER_NOTIFY | InnerForceValuePair | array | index.js:99400,index.js:99400⚠ |
| STC_QTE_RESULT_NOTIFY | InnerForceValueChangeList | array|object|array|string | index.js:99406,index.js:99406⚠,index.js:99407,index.js:99407⚠ |
| STC_QTE_RESULT_NOTIFY | InnerForceValuePair | array | index.js:99400,index.js:99400⚠ |
| STC_QTE_WAIT_READY_NOTIFY | InnerForceValuePair | array | index.js:99400,index.js:99400⚠ |
| STC_ROLE_AWARD_NOTIFY | AwardItemList | array|string | index.js:26468 |
| STC_ROLL_ITEM_INFO_UPDATE_NOTIFY | RollItemInfo | array|object|array|string | index.js:26497,index.js:26498,index.js:26498⚠ |
| STC_SCENE_TEAM_BRIEF_RES | TeamBriefList | array|object|array|string | index.js:26985,index.js:26986,index.js:26986⚠ |
| STC_SOLONPC_NOTIFY | stage | array | scripts3.js:46273,scripts3.js:46276,scripts3.js:46276⚠ |
| STC_TEAM_COPY_PROGRESS_UPDATE | killedNpc | array|object|array|string | index.js:26448,index.js:26448⚠ |
| STC_WULIN_TEAM_ELIMINATE_INFO | TeamEliminatePKPair | array|array|string | index.js:85123,index.js:85123⚠ |
| STEAL_CROP_EVENT | rewardArray | container | index.js:58029 |
| SWEEP_DUNGEON | liveness | array|object|object|scalar | scripts3.js:63836,scripts3.js:63837⚠,scripts3.js:8113,scripts3.js:8122⚠ |
| SYCNPLAYERITEAMDATA | itemObj | container | index.js:24018 |
| TOWER_GET_PANDA_EVENT | eventArr | array|array|object | index.js:137656,index.js:137657,index.js:137657⚠ |
| TOWER_RANDOM_EVENT | equipments | container | index.js:137600,index.js:137601 |
| TOWER_RANDOM_EVENT | npcArr | array|array|string | index.js:143820,index.js:143831,index.js:143831⚠,index.js:143832 |
| TOWER_SPECIAL_SHOP | shopData | container | index.js:138270,index.js:138270⚠,index.js:138271,index.js:138271⚠ |
| USER_PVP | AttckData | array|object|array|string | index.js:104152,index.js:104152⚠ |
| USE_ITEM | avatarInfo | array|array|string | scripts2.js:49810,scripts2.js:49866,scripts2.js:49866⚠,scripts2.js:49867 |
| USE_ITEM | gemId | array|array|string | scripts3.js:24429,scripts3.js:24429⚠,scripts3.js:24445 |
| USE_ITEM | partners | container | scripts3.js:59564,scripts3.js:59571,scripts3.js:59571⚠,scripts3.js:59575 |
| USE_ITEM | rewardArray | container | index.js:64764,index.js:64768,index.js:64772⚠ |
| USE_ITEM | rewardSkillSkin | container | index.js:64851,index.js:64853,index.js:64854⚠ |
| WASH_ADDITION | bloodArr | array | index.js:144052,index.js:144058⚠ |
| WEAR_EQUIPMENT_ALL | equipments | container | index.js:92808 |
| WHORING_GIRL_EVENT | girlData | array|object | index.js:51115,index.js:51142⚠ |
