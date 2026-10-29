# b4 状态镜像审计报告 (borrowed 状态分析)

## 一、统计概要 (任务 4)

- 任务 1 总数（src 以 borrowed 开头）：204
- 按 src 前缀分组计数：
  - borrowed-capture: 153
  - borrowed-handler: 51
- 任务 2 候选数（命中账本状态镜像集合）：17

## 二、全部 borrowed 条目列表 (任务 1)

总数：204 条（按字段名排序）：

| 序号 | 字段 | 动作 | src 原文 |
| --- | --- | --- | --- |
| 1 | activityList | getAllActivity | borrowed-capture:templates.json:create.activityList |
| 2 | AttckData | ChallengePVP | borrowed-handler:enterWoldBossBattle |
| 3 | AttckData | ChallengeRoguePVP | borrowed-handler:enterWoldBossBattle |
| 4 | AttckData | enterPVEBattle | borrowed-handler:enterWoldBossBattle |
| 5 | AttckData | enterRoguePVEBattle | borrowed-handler:enterWoldBossBattle |
| 6 | attrList | childWashProperty | borrowed-handler:washAdditionalArr |
| 7 | awardArr | passCardAward | borrowed-handler:EndFish |
| 8 | batch_sweep_data.items | newSweepTower | borrowed-handler:bzSeedBag |
| 9 | bedLevel | upgradeBed | borrowed-capture:templates.json:create.marryObj.bedLevel |
| 10 | bloodArr | washAdditionalArr | borrowed-handler:WashMedicine |
| 11 | childObj | adoptChild | borrowed-capture:templates.json:create.marryObj.childObj |
| 12 | childObj | birthChild | borrowed-capture:templates.json:create.marryObj.childObj |
| 13 | choose | beginPlayGame | borrowed-capture:templates.json:getFinishTaskAward.choose |
| 14 | clearBoxs | getFinishTaskAward | borrowed-handler:OutSchool |
| 15 | clearBoxs | joinSchool | borrowed-handler:OutSchool |
| 16 | contribution | getFinishTaskAward | borrowed-handler:bzGrantCur |
| 17 | curGold | ExChangeJetton | borrowed-capture:templates.json:create.curGold |
| 18 | curGold | GetPayAward | borrowed-capture:templates.json:create.curGold |
| 19 | curGold | IphonePay | borrowed-capture:templates.json:create.curGold |
| 20 | curGold | PaymentCallBack | borrowed-capture:templates.json:create.curGold |
| 21 | curJetton | ExChangeJetton | borrowed-capture:templates.json:quicklogin.curJetton |
| 22 | curYuanbao | GetPayAward | borrowed-capture:templates.json:create.curYuanbao |
| 23 | curYuanbao | IphonePay | borrowed-capture:templates.json:create.curYuanbao |
| 24 | curYuanbao | PaymentCallBack | borrowed-capture:templates.json:create.curYuanbao |
| 25 | dataArr | getMultiPVESkill | borrowed-handler:getActivityCounts |
| 26 | dataArr | getTeamSkill | borrowed-handler:getActivityCounts |
| 27 | deletePartners | divorceNpc | borrowed-handler:closedBook |
| 28 | e | setPlayerCardMoutsSycn | borrowed-capture:templates.json:create.housekeeper.e |
| 29 | equipments | chanllengeTower | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.equipments |
| 30 | equipments | PutOnEquipment | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.equipments |
| 31 | equipObj | bringSpecialAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.equipObj |
| 32 | equipObj | buySchoolShop | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.equipObj |
| 33 | equipObj | CheckBattleResult | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.equipObj |
| 34 | equipObj | endCast | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.equipObj |
| 35 | equipObj | endMake | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.equipObj |
| 36 | equipObj | endMakeMedicine | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.equipObj |
| 37 | equipObj | equipInherit | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.equipObj |
| 38 | equipObj | getCircleTaskAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.equipObj |
| 39 | equipObj | getEnterAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.equipObj |
| 40 | equipObj | getFinishTaskAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.equipObj |
| 41 | equipObj | getWashEquip | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.equipObj |
| 42 | equipObj | marryAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.equipObj |
| 43 | equipObj | mulitiNpcBattleResult | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.equipObj |
| 44 | equipObj | onekeyCompleteSchoolTask | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.equipObj |
| 45 | equipObj | schoolTaskComplete | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.equipObj |
| 46 | equipObj | useItem | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.equipObj |
| 47 | exp | dispossHomeEvent | borrowed-handler:killNpc |
| 48 | exp | getFriendHomeList | borrowed-handler:killNpc |
| 49 | exp | getHomeList | borrowed-handler:killNpc |
| 50 | exp | obtainCrop | borrowed-handler:killNpc |
| 51 | exp | onKeyDispossHomeEvent | borrowed-handler:killNpc |
| 52 | exp | onKeyObtainCrop | borrowed-handler:killNpc |
| 53 | exp | stealCrop | borrowed-handler:killNpc |
| 54 | exp | upgradeWifeLevel | borrowed-handler:killNpc |
| 55 | exp | UserWifeProp | borrowed-handler:killNpc |
| 56 | fashionEffect | fashionEffect | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.fashionEffect |
| 57 | flag | dispossHomeEvent | borrowed-handler:GetRoldSaveTime |
| 58 | flag | endDoubleTraining | borrowed-handler:GetRoldSaveTime |
| 59 | flag | endPlayGame | borrowed-handler:GetRoldSaveTime |
| 60 | flag | equipTitle | borrowed-handler:GetRoldSaveTime |
| 61 | flag | getFriendHomeList | borrowed-handler:GetRoldSaveTime |
| 62 | flag | onKeyDispossHomeEvent | borrowed-handler:GetRoldSaveTime |
| 63 | friendList | GetOnHookFriendLis | borrowed-handler:FriendList |
| 64 | gold | canBuyActivityNum | borrowed-handler:bzGrantCur |
| 65 | gold | enterMultiPVEBattle | borrowed-handler:bzGrantCur |
| 66 | gold | enterPVEBattle | borrowed-handler:bzGrantCur |
| 67 | gold | h5Pay | borrowed-handler:bzGrantCur |
| 68 | hg | onQueueCheckBreak | borrowed-handler:OnCheckBreak |
| 69 | hgtimes | onQueueCheckBreak | borrowed-handler:OnCheckBreak |
| 70 | housekeeper.helperId | useItem | borrowed-capture:templates.json:create.housekeeper.helperId |
| 71 | inherit | beginCast | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.inherit |
| 72 | inherit | checkLive | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.inherit |
| 73 | inherit | endCast | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.inherit |
| 74 | isMaster | getMasterPupilList | borrowed-capture:templates.json:create.isMaster |
| 75 | itemAddition | doubleTraining | borrowed-handler:OnCheckBreak |
| 76 | itemAddition | useItemAddition | borrowed-handler:OnCheckBreak |
| 77 | itemObj | sycnPlayerItemData | borrowed-capture:templates.json:create.itemObj |
| 78 | matureArr | onKeyObtainCrop | borrowed-capture:templates.json:create.housekeeper.matureArr |
| 79 | maxWuxin | washAdditionalArr | borrowed-capture:templates.json:create.marryObj.maxWuxin |
| 80 | maxWuxin | WashMedicine | borrowed-capture:templates.json:create.marryObj.maxWuxin |
| 81 | note | addItem | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.note |
| 82 | note | buyShopItem | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.note |
| 83 | note | EndMeditation | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.note |
| 84 | note | saleItem | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.note |
| 85 | note | useItem | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.note |
| 86 | note.attrch | EndMeditation | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.note.attrch |
| 87 | note.attrch | useItem | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.note.attrch |
| 88 | note.eqch | addItem | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.note.eqch |
| 89 | note.eqch | buyShopItem | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.note.eqch |
| 90 | note.eqch | saleItem | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.note.eqch |
| 91 | note.ivch | addItem | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.note.ivch |
| 92 | note.ivch | buyShopItem | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.note.ivch |
| 93 | note.ivch | saleItem | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.note.ivch |
| 94 | npcArr | activateTowerEvent | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.npcArr |
| 95 | npcArr | chanllengeTower | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.npcArr |
| 96 | npcArr | enterPVEBattle | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.npcArr |
| 97 | npcArr | enterRoguePVEBattle | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.npcArr |
| 98 | npcArr | GetRandomEventAward | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.npcArr |
| 99 | npcID | BeginSaveNpc | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.npcID |
| 100 | npcID | CheckOutSchool | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.npcID |
| 101 | npcID | ChooseGirl | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.npcID |
| 102 | npcID | closedBook | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.npcID |
| 103 | npcID | divorceNpc | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.npcID |
| 104 | npcID | enterMultiPVEBattle | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.npcID |
| 105 | npcID | enterPVEBattle | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.npcID |
| 106 | npcID | enterRoguePVEBattle | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.npcID |
| 107 | npcID | marryNpc | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.npcID |
| 108 | npcID | OutSchool | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.npcID |
| 109 | npcID | proposeNpc | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.npcID |
| 110 | npcID | receiveNpc | borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.npcID |
| 111 | OnhookObj | CheckOnHook | borrowed-handler:LoadGame |
| 112 | PlayerEquip | leaveTower | borrowed-capture:templates.json:create.PlayerEquip |
| 113 | randSeed | enterPVEBattle | borrowed-handler:enterWoldBossBattle |
| 114 | randSeed | enterRoguePVEBattle | borrowed-handler:enterWoldBossBattle |
| 115 | rewardArray | answerReward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 116 | rewardArray | bringSpecialAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 117 | rewardArray | buyActivityNum | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 118 | rewardArray | buyAnniversaryPassGift | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 119 | rewardArray | buyGiftPermanent | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 120 | rewardArray | BuyHomeCrop | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 121 | rewardArray | buySchoolShop | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 122 | rewardArray | CheckBattleResult | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 123 | rewardArray | choosePandaEvent | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 124 | rewardArray | chooseSecretEvent | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 125 | rewardArray | collect | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 126 | rewardArray | dispossHomeEvent | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 127 | rewardArray | endMake | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 128 | rewardArray | endMakeMedicine | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 129 | rewardArray | equipBatchResolve | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 130 | rewardArray | equipInherit | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 131 | rewardArray | equipResolve | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 132 | rewardArray | explore | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 133 | rewardArray | getActivityAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 134 | rewardArray | GetBossAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 135 | rewardArray | getCircleTaskAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 136 | rewardArray | getEnterAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 137 | rewardArray | getEventAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 138 | rewardArray | getGiftPermanentAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 139 | rewardArray | GetNoticeAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 140 | rewardArray | GetRandomEventAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 141 | rewardArray | getsharePicAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 142 | rewardArray | getSnowAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 143 | rewardArray | getSpecialAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 144 | rewardArray | homeSpeicalAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 145 | rewardArray | intoCollectiveCultivation | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 146 | rewardArray | LeaveCopy | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 147 | rewardArray | leaveTower | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 148 | rewardArray | marryAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 149 | rewardArray | mulitiNpcBattleResult | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 150 | rewardArray | obtainCrop | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 151 | rewardArray | onekeyCompleteSchoolTask | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 152 | rewardArray | onKeyDispossHomeEvent | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 153 | rewardArray | onKeyObtainCrop | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 154 | rewardArray | OutSchool | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 155 | rewardArray | passCardAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 156 | rewardArray | pileGameAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 157 | rewardArray | receiveAccRechargAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 158 | rewardArray | receiveBindingRecuitAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 159 | rewardArray | receiveChatPkSportsPointAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 160 | rewardArray | receiveRecuitAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 161 | rewardArray | resetRole | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 162 | rewardArray | schoolTaskComplete | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 163 | rewardArray | smallGameAward | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 164 | rewardArray | stealCrop | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 165 | rewardArray | Storehouse | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 166 | rewardArray | sweepCopy | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 167 | rewardArray | TowerBattleResult | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 168 | rewardArray | UseAllBall | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray |
| 169 | roleID | revive | borrowed-capture:templates.json:quicklogin.roleID |
| 170 | ShopArray | GetPayShowData | borrowed-handler:getShopItem |
| 171 | shopData | GetHouseShopData | borrowed-handler:GetSpecialShopData |
| 172 | shopData | GetTowerSpecialShop | borrowed-handler:GetSpecialShopData |
| 173 | shopObj | getHlexchangeShop | borrowed-handler:getChangeShop |
| 174 | skillID | BeginTraining | borrowed-handler:OnCheckBreak |
| 175 | skillID | doubleTraining | borrowed-handler:OnCheckBreak |
| 176 | skillID | useVigorUpGradeSkill | borrowed-handler:OnCheckBreak |
| 177 | skillLevel | doubleTraining | borrowed-handler:OnCheckBreak |
| 178 | taskArr | getCircleTaskList | borrowed-capture:templates.json:create.housekeeper.taskArr |
| 179 | taskID | acceptCircleTask | borrowed-capture:templates.json:getFinishTaskAward.taskID |
| 180 | taskObj | changeDelegateTask | borrowed-handler:getSevenTaskList |
| 181 | type | beginCast | borrowed-capture:templates.json:create.housekeeper.type |
| 182 | type | beginMake | borrowed-capture:templates.json:create.housekeeper.type |
| 183 | type | beginMakeMedicine | borrowed-capture:templates.json:create.housekeeper.type |
| 184 | type | BuyMount | borrowed-capture:templates.json:create.housekeeper.type |
| 185 | type | endCast | borrowed-capture:templates.json:create.housekeeper.type |
| 186 | type | endMake | borrowed-capture:templates.json:create.housekeeper.type |
| 187 | type | endMakeMedicine | borrowed-capture:templates.json:create.housekeeper.type |
| 188 | type | getActivity | borrowed-capture:templates.json:create.housekeeper.type |
| 189 | type | GetFashionList | borrowed-capture:templates.json:create.housekeeper.type |
| 190 | type | getOptionalGiftData | borrowed-capture:templates.json:create.housekeeper.type |
| 191 | type | getSchoolAppoint | borrowed-capture:templates.json:create.housekeeper.type |
| 192 | type | GetSchoolReview | borrowed-capture:templates.json:create.housekeeper.type |
| 193 | type | houseSpecial | borrowed-capture:templates.json:create.housekeeper.type |
| 194 | type | marryHouse | borrowed-capture:templates.json:create.housekeeper.type |
| 195 | type | rentGroup | borrowed-capture:templates.json:create.housekeeper.type |
| 196 | type | smallGameAward | borrowed-capture:templates.json:create.housekeeper.type |
| 197 | type | weddingFeast | borrowed-capture:templates.json:create.housekeeper.type |
| 198 | uIds | setChatRedData | borrowed-handler:FriendList |
| 199 | userGold | BuyMarketItem | borrowed-capture:templates.json:quicklogin.userGold |
| 200 | userGold | QuickBuyItem | borrowed-capture:templates.json:quicklogin.userGold |
| 201 | wId | setPlayerCardWingId | borrowed-capture:templates.json:create.wId |
| 202 | win | CheckBattleResult | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.win |
| 203 | win | DogBattleResult | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.win |
| 204 | win | TowerBattleResult | borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.win |

## 三、账本状态镜像候选字段 (任务 2)

候选总数：17 条：

| 序号 | 动作 | 字段 | src | 出现动作数 (borrowed 中) |
| --- | --- | --- | --- | --- |
| 1 | getFinishTaskAward | contribution | borrowed-handler:bzGrantCur | 1 |
| 2 | dispossHomeEvent | exp | borrowed-handler:killNpc | 9 |
| 3 | getFriendHomeList | exp | borrowed-handler:killNpc | 9 |
| 4 | getHomeList | exp | borrowed-handler:killNpc | 9 |
| 5 | obtainCrop | exp | borrowed-handler:killNpc | 9 |
| 6 | onKeyDispossHomeEvent | exp | borrowed-handler:killNpc | 9 |
| 7 | onKeyObtainCrop | exp | borrowed-handler:killNpc | 9 |
| 8 | stealCrop | exp | borrowed-handler:killNpc | 9 |
| 9 | upgradeWifeLevel | exp | borrowed-handler:killNpc | 9 |
| 10 | UserWifeProp | exp | borrowed-handler:killNpc | 9 |
| 11 | canBuyActivityNum | gold | borrowed-handler:bzGrantCur | 4 |
| 12 | enterMultiPVEBattle | gold | borrowed-handler:bzGrantCur | 4 |
| 13 | enterPVEBattle | gold | borrowed-handler:bzGrantCur | 4 |
| 14 | h5Pay | gold | borrowed-handler:bzGrantCur | 4 |
| 15 | revive | roleID | borrowed-capture:templates.json:quicklogin.roleID | 1 |
| 16 | BuyMarketItem | userGold | borrowed-capture:templates.json:quicklogin.userGold | 2 |
| 17 | QuickBuyItem | userGold | borrowed-capture:templates.json:quicklogin.userGold | 2 |

## 四、候选字段在 bz-rpc-server.js 的产出情况调查 (任务 3)

检索目标文件：hotfix-patch/core/bz-rpc-server.js

### 1. 动作 getFinishTaskAward -> 字段 contribution

- **src 原文**：borrowed-handler:bzGrantCur
- **产出归属判定**：在 bzGrantCur 及 buyGoodAndEvilShopItem 中由 handler 自己产出并维护；在借用该形状的动作（getFinishTaskAward）里只靠形状默认值/借用。
- **bz-rpc-server.js 匹配原文（最多 3 处）**：
  - hotfix-patch/core/bz-rpc-server.js:82: yuanbao: num(_save.yuanbao, null), contribution: num(_save.contribution, null),
  - hotfix-patch/core/bz-rpc-server.js:2245: return wrapped('buyGoodAndEvilShopItem', { eRet: 1, contribution: s.contribution, rewardArray: ra, id: row.id, buyCount: n, note: note }, { achievement: ach() });
  - hotfix-patch/core/bz-rpc-server.js:2427: return wrapped('bzGrantCur', { eRet: 1, applied: applied, gold: s.gold, yuanbao: s.yuanbao, coins: s.coins, contribution: s.contribution }, { achievement: ach() });

### 2. 动作 dispossHomeEvent -> 字段 exp

- **src 原文**：borrowed-handler:killNpc
- **产出归属判定**：在 killNpc、autoKillNpc 中 handler 自己产出（固定置 0）；在 9 个借用动作中只靠形状默认值（借用 killNpc 形状）。
- **bz-rpc-server.js 匹配原文（最多 3 处）**：
  - hotfix-patch/core/bz-rpc-server.js:527: 4002(经验) 故意不在此表：存档里没有 exp 字段、LoadGame 也无处投射，
  - hotfix-patch/core/bz-rpc-server.js:1528: dropArr: [], extraArr: [], exp: 0,
  - hotfix-patch/core/bz-rpc-server.js:1595: exp: 0, expExtra: 0, potential: 0, potentialExtra: 0, specialAny: 0,

### 3. 动作 getFriendHomeList -> 字段 exp

- **src 原文**：borrowed-handler:killNpc
- **产出归属判定**：在 killNpc、autoKillNpc 中 handler 自己产出（固定置 0）；在 9 个借用动作中只靠形状默认值（借用 killNpc 形状）。
- **bz-rpc-server.js 匹配原文（最多 3 处）**：
  - hotfix-patch/core/bz-rpc-server.js:527: 4002(经验) 故意不在此表：存档里没有 exp 字段、LoadGame 也无处投射，
  - hotfix-patch/core/bz-rpc-server.js:1528: dropArr: [], extraArr: [], exp: 0,
  - hotfix-patch/core/bz-rpc-server.js:1595: exp: 0, expExtra: 0, potential: 0, potentialExtra: 0, specialAny: 0,

### 4. 动作 getHomeList -> 字段 exp

- **src 原文**：borrowed-handler:killNpc
- **产出归属判定**：在 killNpc、autoKillNpc 中 handler 自己产出（固定置 0）；在 9 个借用动作中只靠形状默认值（借用 killNpc 形状）。
- **bz-rpc-server.js 匹配原文（最多 3 处）**：
  - hotfix-patch/core/bz-rpc-server.js:527: 4002(经验) 故意不在此表：存档里没有 exp 字段、LoadGame 也无处投射，
  - hotfix-patch/core/bz-rpc-server.js:1528: dropArr: [], extraArr: [], exp: 0,
  - hotfix-patch/core/bz-rpc-server.js:1595: exp: 0, expExtra: 0, potential: 0, potentialExtra: 0, specialAny: 0,

### 5. 动作 obtainCrop -> 字段 exp

- **src 原文**：borrowed-handler:killNpc
- **产出归属判定**：在 killNpc、autoKillNpc 中 handler 自己产出（固定置 0）；在 9 个借用动作中只靠形状默认值（借用 killNpc 形状）。
- **bz-rpc-server.js 匹配原文（最多 3 处）**：
  - hotfix-patch/core/bz-rpc-server.js:527: 4002(经验) 故意不在此表：存档里没有 exp 字段、LoadGame 也无处投射，
  - hotfix-patch/core/bz-rpc-server.js:1528: dropArr: [], extraArr: [], exp: 0,
  - hotfix-patch/core/bz-rpc-server.js:1595: exp: 0, expExtra: 0, potential: 0, potentialExtra: 0, specialAny: 0,

### 6. 动作 onKeyDispossHomeEvent -> 字段 exp

- **src 原文**：borrowed-handler:killNpc
- **产出归属判定**：在 killNpc、autoKillNpc 中 handler 自己产出（固定置 0）；在 9 个借用动作中只靠形状默认值（借用 killNpc 形状）。
- **bz-rpc-server.js 匹配原文（最多 3 处）**：
  - hotfix-patch/core/bz-rpc-server.js:527: 4002(经验) 故意不在此表：存档里没有 exp 字段、LoadGame 也无处投射，
  - hotfix-patch/core/bz-rpc-server.js:1528: dropArr: [], extraArr: [], exp: 0,
  - hotfix-patch/core/bz-rpc-server.js:1595: exp: 0, expExtra: 0, potential: 0, potentialExtra: 0, specialAny: 0,

### 7. 动作 onKeyObtainCrop -> 字段 exp

- **src 原文**：borrowed-handler:killNpc
- **产出归属判定**：在 killNpc、autoKillNpc 中 handler 自己产出（固定置 0）；在 9 个借用动作中只靠形状默认值（借用 killNpc 形状）。
- **bz-rpc-server.js 匹配原文（最多 3 处）**：
  - hotfix-patch/core/bz-rpc-server.js:527: 4002(经验) 故意不在此表：存档里没有 exp 字段、LoadGame 也无处投射，
  - hotfix-patch/core/bz-rpc-server.js:1528: dropArr: [], extraArr: [], exp: 0,
  - hotfix-patch/core/bz-rpc-server.js:1595: exp: 0, expExtra: 0, potential: 0, potentialExtra: 0, specialAny: 0,

### 8. 动作 stealCrop -> 字段 exp

- **src 原文**：borrowed-handler:killNpc
- **产出归属判定**：在 killNpc、autoKillNpc 中 handler 自己产出（固定置 0）；在 9 个借用动作中只靠形状默认值（借用 killNpc 形状）。
- **bz-rpc-server.js 匹配原文（最多 3 处）**：
  - hotfix-patch/core/bz-rpc-server.js:527: 4002(经验) 故意不在此表：存档里没有 exp 字段、LoadGame 也无处投射，
  - hotfix-patch/core/bz-rpc-server.js:1528: dropArr: [], extraArr: [], exp: 0,
  - hotfix-patch/core/bz-rpc-server.js:1595: exp: 0, expExtra: 0, potential: 0, potentialExtra: 0, specialAny: 0,

### 9. 动作 upgradeWifeLevel -> 字段 exp

- **src 原文**：borrowed-handler:killNpc
- **产出归属判定**：在 killNpc、autoKillNpc 中 handler 自己产出（固定置 0）；在 9 个借用动作中只靠形状默认值（借用 killNpc 形状）。
- **bz-rpc-server.js 匹配原文（最多 3 处）**：
  - hotfix-patch/core/bz-rpc-server.js:527: 4002(经验) 故意不在此表：存档里没有 exp 字段、LoadGame 也无处投射，
  - hotfix-patch/core/bz-rpc-server.js:1528: dropArr: [], extraArr: [], exp: 0,
  - hotfix-patch/core/bz-rpc-server.js:1595: exp: 0, expExtra: 0, potential: 0, potentialExtra: 0, specialAny: 0,

### 10. 动作 UserWifeProp -> 字段 exp

- **src 原文**：borrowed-handler:killNpc
- **产出归属判定**：在 killNpc、autoKillNpc 中 handler 自己产出（固定置 0）；在 9 个借用动作中只靠形状默认值（借用 killNpc 形状）。
- **bz-rpc-server.js 匹配原文（最多 3 处）**：
  - hotfix-patch/core/bz-rpc-server.js:527: 4002(经验) 故意不在此表：存档里没有 exp 字段、LoadGame 也无处投射，
  - hotfix-patch/core/bz-rpc-server.js:1528: dropArr: [], extraArr: [], exp: 0,
  - hotfix-patch/core/bz-rpc-server.js:1595: exp: 0, expExtra: 0, potential: 0, potentialExtra: 0, specialAny: 0,

### 11. 动作 canBuyActivityNum -> 字段 gold

- **src 原文**：borrowed-handler:bzGrantCur
- **产出归属判定**：在 bzGrantCur 及多个商店 handler 中由 handler 自己产出（绑定存档 s.gold）；在 4 个借用动作中只靠形状默认值（借用 bzGrantCur 形状）。
- **bz-rpc-server.js 匹配原文（最多 3 处）**：
  - hotfix-patch/core/bz-rpc-server.js:81: coins: num(_save.coins, null), gold: num(_save.gold, null),
  - hotfix-patch/core/bz-rpc-server.js:1462: note.eco.gold = s.gold;
  - hotfix-patch/core/bz-rpc-server.js:2427: return wrapped('bzGrantCur', { eRet: 1, applied: applied, gold: s.gold, yuanbao: s.yuanbao, coins: s.coins, contribution: s.contribution }, { achievement: ach() });

### 12. 动作 enterMultiPVEBattle -> 字段 gold

- **src 原文**：borrowed-handler:bzGrantCur
- **产出归属判定**：在 bzGrantCur 及多个商店 handler 中由 handler 自己产出（绑定存档 s.gold）；在 4 个借用动作中只靠形状默认值（借用 bzGrantCur 形状）。
- **bz-rpc-server.js 匹配原文（最多 3 处）**：
  - hotfix-patch/core/bz-rpc-server.js:81: coins: num(_save.coins, null), gold: num(_save.gold, null),
  - hotfix-patch/core/bz-rpc-server.js:1462: note.eco.gold = s.gold;
  - hotfix-patch/core/bz-rpc-server.js:2427: return wrapped('bzGrantCur', { eRet: 1, applied: applied, gold: s.gold, yuanbao: s.yuanbao, coins: s.coins, contribution: s.contribution }, { achievement: ach() });

### 13. 动作 enterPVEBattle -> 字段 gold

- **src 原文**：borrowed-handler:bzGrantCur
- **产出归属判定**：在 bzGrantCur 及多个商店 handler 中由 handler 自己产出（绑定存档 s.gold）；在 4 个借用动作中只靠形状默认值（借用 bzGrantCur 形状）。
- **bz-rpc-server.js 匹配原文（最多 3 处）**：
  - hotfix-patch/core/bz-rpc-server.js:81: coins: num(_save.coins, null), gold: num(_save.gold, null),
  - hotfix-patch/core/bz-rpc-server.js:1462: note.eco.gold = s.gold;
  - hotfix-patch/core/bz-rpc-server.js:2427: return wrapped('bzGrantCur', { eRet: 1, applied: applied, gold: s.gold, yuanbao: s.yuanbao, coins: s.coins, contribution: s.contribution }, { achievement: ach() });

### 14. 动作 h5Pay -> 字段 gold

- **src 原文**：borrowed-handler:bzGrantCur
- **产出归属判定**：在 bzGrantCur 及多个商店 handler 中由 handler 自己产出（绑定存档 s.gold）；在 4 个借用动作中只靠形状默认值（借用 bzGrantCur 形状）。
- **bz-rpc-server.js 匹配原文（最多 3 处）**：
  - hotfix-patch/core/bz-rpc-server.js:81: coins: num(_save.coins, null), gold: num(_save.gold, null),
  - hotfix-patch/core/bz-rpc-server.js:1462: note.eco.gold = s.gold;
  - hotfix-patch/core/bz-rpc-server.js:2427: return wrapped('bzGrantCur', { eRet: 1, applied: applied, gold: s.gold, yuanbao: s.yuanbao, coins: s.coins, contribution: s.contribution }, { achievement: ach() });

### 15. 动作 revive -> 字段 roleID

- **src 原文**：borrowed-capture:templates.json:quicklogin.roleID
- **产出归属判定**：在 quicklogin、Create 中由 handler 自己产出（来自存档 s.roleID 或保底 16374）；在 revive 中借用 quicklogin 抓包快照，只靠形状默认值。
- **bz-rpc-server.js 匹配原文（最多 3 处）**：
  - hotfix-patch/core/bz-rpc-server.js:236: if (!_save.roleID) _save.roleID = 16374; // 模板同款；客户端只作标识用
  - hotfix-patch/core/bz-rpc-server.js:772: tpl.roleID = s.roleID || 16374;
  - hotfix-patch/core/bz-rpc-server.js:832: r.roleID = s.roleID;

### 16. 动作 BuyMarketItem -> 字段 userGold

- **src 原文**：borrowed-capture:templates.json:quicklogin.userGold
- **产出归属判定**：在 LoadGame/OnhookObj 中 handler 自己产出（base.userGold = goldVal）；在 BuyMarketItem / QuickBuyItem 借用动作中只靠形状默认值（抓包快照回放）。
- **bz-rpc-server.js 匹配原文（最多 3 处）**：
  - hotfix-patch/core/bz-rpc-server.js:893: base.curGold = goldVal; base.userGold = goldVal;
  - hotfix-patch/core/bz-rpc-server.js:2461: * （抓包快照里 userGold=20，照抄会让客户端以为玩家只有 20 两，买东西弹 银两不足） */
  - hotfix-patch/core/bz-rpc-server.js:2462: var LEDGER_FIELDS = { userGold: 'gold', curGold: 'gold', potential: 'potential' };

### 17. 动作 QuickBuyItem -> 字段 userGold

- **src 原文**：borrowed-capture:templates.json:quicklogin.userGold
- **产出归属判定**：在 LoadGame/OnhookObj 中 handler 自己产出（base.userGold = goldVal）；在 BuyMarketItem / QuickBuyItem 借用动作中只靠形状默认值（抓包快照回放）。
- **bz-rpc-server.js 匹配原文（最多 3 处）**：
  - hotfix-patch/core/bz-rpc-server.js:893: base.curGold = goldVal; base.userGold = goldVal;
  - hotfix-patch/core/bz-rpc-server.js:2461: * （抓包快照里 userGold=20，照抄会让客户端以为玩家只有 20 两，买东西弹 银两不足） */
  - hotfix-patch/core/bz-rpc-server.js:2462: var LEDGER_FIELDS = { userGold: 'gold', curGold: 'gold', potential: 'potential' };
