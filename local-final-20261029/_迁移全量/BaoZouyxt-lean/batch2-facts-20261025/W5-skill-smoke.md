# W5-skill-smoke fact table

| action | wireName | sendSite | reqKeys | recvSite | recvFields | eRet | tables | currency | notes |
|---|---|---|---|---|---|---|---|---|---|
| SWAP_SKILL_PROGRESS | User.skillChange | tools/index.js:119905 | roleID,skillA,skillB,skillType | tools/index.js:119846 | eRet,changeCD,serverTime | 1:success (dispatches ON_SWAP_SKILLS; SHOW_SKILL_CHILD_UI); 4:missing item (shows text 4420 with item 176); 14:skillType CD active (shows CD countdown; dispatches REFRESH_SWAP_CD); 16:shows text 3582; 17/18:skill CD active (shows text 6152 with skill name and countdown) | skill.json; item.json | NONE | Handled in SkillModel.js. Uses item 176 configured in Const 176. |
| USER_CREATE | User.Create | tools/index.js:70997 | baseValueAy | tools/index.js:70343 | eRet,baseValueAy,curGold,curYuanbao,curJetton,washTimes,endMonthCardTime,KillItemObj,retrievePartnerId,formulaArr,accRechargedData,equipSqlitTime,bonusMap,serverTime,serverFormatTime,housekeeper,isDoubleRecharge | 1:success (sets baseValueAy stats; gold; yuanbao; chips; SaveDataMgr.updatePlayerData; sets chat websocket IP; opens StartActionUI); 2:open charge list (StoreModel.openChargeList) | NONE | RoleBaseInfo.gold; RoleBaseInfo.yuanbao | Handled in loginModel.js. baseValueAy is an array of 44 initial role stats. |
| USE_ITEM | User.useItem | tools/index.js:65330 | itemID,itemNum,curHp,maxhpLimit,curMp,maxmpLimit,hpfinalValue,hg | tools/index.js:64754 | eRet,note,rewardArray,equipObj,getKnackIds,gemId,partners,mpnum,taskID,formulaID,mountID,titleID,bloodEndTime,dogid,hanyusuiTime,genGuDan,stealFlag,endMonthCardTime,itemID,avatarInfo,itemRealgarMap,rewardSkillSkin,housekeeper,wId,wArr,weaponSkinId,emoId,itemSort,delItemObj | 1:success (processes note/rewards/buffs/items/etc); 2:no-op; 4:shows text 988 or finishes batch; 5:text 1333; 6:text 1388; 8:text 3430; 10/11:text 3807; 13:text 5862; 15:shows delItemObj reward; 16:text 6003628 | item.json; skill.json; tasknew.json; formula.json; mount.json; npc.json; skillskin.json; helper.json; Cosmetic.json; weaponskin.json | NONE | Handled in ItemModel.js. Note skch updates skills; attrch updates mpTrained. |
| USER_LOADGAME | User.LoadGame | tools/index.js:70925 | roleID,taskFlag,finishTaskFlag | tools/index.js:70346 | eRet,skillGrasp,skillMap,cycleLifeRetains,OnhookObj,serverFormatTime,baseValueAy,WeapToSkill,equipments,masters,itemObj,acceptTaskOrder,finishTaskObj,acceptTaskArray,intimacyMap,killNpcMap,taskLog,PlayerTaskTimeObj,isUntie,schoolTitle,schoolLevelFlag,isStayState,wulinData,advertSharingSwitch,escLogOff,totalrecharge,achieveRateId,matchEndTime,friendPartners,surveyData,setting,retrievePartnerId,partnerData,KillItemObj,formulaArr,ejectGiftDatas,accRechargedData,equipSqlitTime,housekeeper,delItemObj,bonusMap,doneScetTask,adScetTask,isDoubleRecharge,stealState,stealFlag,veinObj,power,maxArtLevel,dayData,activityArrFlag,redHub,Extratotalnum,failnum,giftendtime,mountsObj,sxEventArr,hTaskArr,homeID,genGuDan,passcard,killNum,teamData,currentServerEndTime,teamid,shopActive,emailState,activityList | 1:success (loads all archive sections into SaveDataMgr; updates entity attributes; connects chat socket; enters game) | tasknew.json | RoleBaseInfo.gold; RoleBaseInfo.yuanbao | Main game archive sync handler in loginModel.js. Top-level fields listed in Extra Task A. |
| QUICK_LOGIN | User.quicklogin | tools/index.js:70392 | account,pwd,checkObj,channel,flag,macAdress,platform | tools/index.js:70337 | eRet,switchData,account,roleID,curJetton,userGold,userYuanbao,loginFlag,userName | 1:success (platSuccessCreateInfo; stores account/roleID/currency; if userName empty starts role creation; else calls reqLoadGameServer); 2:error 347; 3:error 723; 4:error 774; 6:error 1122; 7:error 4378; 8:login timeout; other:generic error with errcode | NONE | RoleBaseInfo.gold; RoleBaseInfo.yuanbao | Handled in loginModel.js. Triggers USER_LOADGAME upon successful login if role exists. |
| JOIN_SCHOOL | User.joinSchool | tools/index.js:77954 | npcID,school,taskArr | tools/index.js:77835 | eRet,clearBoxs,cdTimeDays,seniorSchool | 1:success (clears boxs; adds npcId to masters; updates player state; triggers success dialog); 5:school CD active (shows CD alert and offers CLEAR_SXHOOL_CD) | master.json | NONE | Handled in MasterModel.js. Master info read from master.json. |
| UPGRADE_SKILL_LV | User.upgradeSkill | tools/index.js:119880 | skillID,skillArr,NPCID,flag | tools/index.js:119842 | eRet,returnPro | Dispatches SYNC_UPGRADE_RES with e.eRet; if returnPro present shows text 6003371 with returnPro | skill.json; level.json; skill_condition.json | RoleBaseInfo.potentials; RoleBaseInfo.coins | Handled in SkillModel.js. Called by MartialAartsUI sendUpgradeReq via reqChangeSkillLv. Client checks potentials and coins. |
| REQ_PVE_BATTLE | User.ReqSelfBattleInfo | tools/index.js:69166 | npcID,isRmd,mp,gTime,hgtimes | tools/index.js:69157 | eRet,npcID,getargetType,itemSkill,npcArr,baseValueAy,fuben,tower,pvpType,sceneType,aiSetData,auto,aiType,roleID,youngTimes,coins,gemData,equipments,equips,tempEquips,inherit,skillMap,skillGraspData,mpTrained,totalGameTime,WeapToSkill,addAtt,veinObj,buffArr | 1:success (calls prepareForBattle; parses player and rival battle entity stats; starts local 1v1 battle system) | npc.json; skill.json | NONE | Handled in Local1v1Mgr.js. Receives player and NPC battle attributes for client battle calculation. |

## Extra Tasks

### A. USER_LOADGAME Receive Callback Schema
Callback site: tools/index.js:70346 (loginModel.loadGame) & tools/index.js:111820 (SaveDataMgr.updatePlayerData).
Top-level response fields grouped by target module:
- Core & Idle: eRet, serverTime, serverFormatTime, OnhookObj
- Skills: skillMap, cycleLifeRetains, skillGrasp, WeapToSkill
- Attributes & Base: baseValueAy, veinObj, power, maxArtLevel
- Inventory & Equips: equipments, equips, inherit, itemObj, delItemObj
- Quests & Story: acceptTaskOrder, finishTaskObj, acceptTaskArray, taskLog, PlayerTaskTimeObj
- NPC & Social: masters, intimacyMap, killNpcMap, friendPartners, partnerData, retrievePartnerId
- School & Sect: isUntie, schoolTitle, schoolLevelFlag, isStayState, doneScetTask, adScetTask
- Recharges & Gifts: totalrecharge, isDoubleRecharge, ejectGiftDatas, accRechargedData, bonusMap, dayData
- Steal & Prison: stealState, stealFlag
- Systems & Features: housekeeper, KillItemObj, formulaArr, equipSqlitTime, wulinData, advertSharingSwitch, escLogOff, achieveRateId, matchEndTime, surveyData, setting, activityArrFlag, redHub, Extratotalnum, failnum, giftendtime, mountsObj, sxEventArr, hTaskArr, homeID, genGuDan, passcard, killNum, teamData, currentServerEndTime, teamid, shopActive, emailState, activityList

### B. Character Base Attribute Paths in USER_LOADGAME
Character base attributes are located in the top-level array `e.baseValueAy` (handled in tools/index.js:111755 updateBasicAttr):
- Arm Strong (Strength): e.baseValueAy[7] (current); e.baseValueAy[37] (baseArmStrong)
- Shen Fa (Agility): e.baseValueAy[8] (current); e.baseValueAy[38] (baseShenFa)
- Bone (Constitution): e.baseValueAy[9] (current); e.baseValueAy[39] (baseBone)
- Understanding (Perception): e.baseValueAy[10] (current); e.baseValueAy[40] (baseUnderstanding)
- Nei Li (Internal Power / MP): e.baseValueAy[12] (mpBase); e.baseValueAy[29] (mpRemaining); e.baseValueAy[32] (mpTrained)
- HP (Health): e.baseValueAy[11] (hpBase); e.baseValueAy[27] (hpRemaining); e.baseValueAy[28] (hpLimit)

### C. USE_ITEM Receive Callback Fields
Callback site: tools/index.js:64754. Verbatim fields read from response `a`:
eRet, note (and note.skch, note.attrch, note.attrch.mpTrained), rewardArray, equipObj, getKnackIds, gemId, partners, mpnum, taskID, formulaID, mountID, titleID, bloodEndTime, dogid, hanyusuiTime, genGuDan, stealFlag, endMonthCardTime, itemID, avatarInfo, itemRealgarMap, rewardSkillSkin, housekeeper, wId, wArr, weaponSkinId, emoId, itemSort, delItemObj.

### D. REQ_PVE_BATTLE Receive Callback Fields
Callback site: tools/index.js:69157 (Local1v1Mgr), tools/index.js:69015 (Local1v1Base.prepareForBattle), tools/index.js:74766 (createPlayerBattleEntity), tools/index.js:74919 (parsePlayerData).
Verbatim fields read from response `t`/`e`:
eRet, npcID, getargetType, itemSkill, npcArr, baseValueAy (and fields mapped: userAccount, userName, birthPlaceId, sexId, birthIdId, appearId, talentId, armStrong, shenFa, bone, understanding, hpBase, mpBase, hitChBase, dodgeBase, atkBase, defenseBase, luckBase, exp, escapeChBase, ageBase, appearBase, evilness, school, hungerBase, thirstBase, nsResistBase, hpRemaining, hpLimit, mpRemaining, thirstRemaining, hungerRemaining, mpTrained, artLevel, potentials, coins, totalGameTime, baseArmStrong, baseShenFa, baseBone, baseUnderstanding, numDeaths, numStuffed, thirst0Time, curSceneID, spawnX, spawnY, outSchool, degreeLv, career), fuben, tower, pvpType, sceneType, aiSetData, auto, aiType, roleID, youngTimes, coins, gemData, equipments, equips, tempEquips, inherit, skillMap, skillGraspData, WeapToSkill, addAtt, veinObj, buffArr.

## UNCONFIRMED
NONE
