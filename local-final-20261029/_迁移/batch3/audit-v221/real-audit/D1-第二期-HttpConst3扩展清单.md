# D1 第二期 · HttpConst3 扩展清单（2026-10-24）

> 决策依据 DECISIONS-2026-10-24 D1；接第一期报告 §3b（116 动作不在 M1 宇宙，114 ∈ HttpConst3）。
> 本期把 HttpConst3 定义块整体提取，给出完整扩展表。R21 回执矛盾 #5 的收口工作项（回执标注：执行方 S1 自取，不需再送）。

## 定义块

- 位置：`tools/scripts3.js` 第 39438 行附近（字符偏移 1464607–1471711），键 145 个（值去重前）。

## 分类总览（键 145 个）

| 类 | 数 | 说明 |
|---|---:|---|
| 动作(User.*) | 116 | 服务端动作字符串，GEN 候选主体 |
| 客户端请求(CTS_) | 11 | 客户端→服务端请求事件 |
| 服务端通知(STC_) | 17 | 服务端→客户端推送，对应 PUSH 语义 |
| 其他 | 1 | 待分类 |

- 有真实发送点的键：116；有 MessageCenter.on 注册的键：131（scripts3 129 / index 1 / scripts2 1 处）。

## 与 M1 / 注册表口径的关系

- HttpConst3 键与 M1 的 1125 键**交集为 0**（R21 回执复算结论，本期在定义块层面再次确认）。
- 动作宇宙扩展口径建议：`U_action = M1(1125) ∪ HttpConst3(145) ∪ 残余`；注册表 inScope/GEN-READY 等数字均为 M1 内口径，扩表后需重算。

## 扩展清单（全 145 键）

| 键 | 值 | 类 | 发送点 | on(s3/idx/s2) |
|---|---|---|---:|---:|
| `BEACH_TREASURE_TASK_AWARDS` | `User.beachtreasureTaskAwards` | 动作(User.*) | 1 | 1/0/0 |
| `BOMB_NIAN_SHOU` | `User.bombNianshou` | 动作(User.*) | 1 | 1/0/0 |
| `BREW_TASK_COMPLETE` | `User.brewTaskComplete` | 动作(User.*) | 1 | 1/0/0 |
| `BUY_MYSTERY_WISH_ITEM` | `User.buyMysterywishItem` | 动作(User.*) | 1 | 1/0/0 |
| `BUY_SERVER_GIFT` | `User.bugServerGift` | 动作(User.*) | 1 | 1/0/0 |
| `BUY_SPRING_SWORD_GIFT` | `User.buySpringswordGift` | 动作(User.*) | 1 | 1/0/0 |
| `BUY_STAGE_TREASURE` | `User.buyStagetreasure` | 动作(User.*) | 1 | 1/0/0 |
| `BUY_TRANS_GIFT` | `User.buyTransGift` | 动作(User.*) | 1 | 1/0/0 |
| `CHANGE_AUTOMATICFIGHT` | `User.changeAutomaticFight` | 动作(User.*) | 1 | 0/0/0 |
| `CHANGE_PARTNER_STATE` | `User.setPlayerCardPartner` | 动作(User.*) | 1 | 1/0/0 |
| `CHOOSE_STAGE_TREASURE_AWARD` | `User.chooseStagetreasureAwards` | 动作(User.*) | 1 | 1/0/0 |
| `CLEAR_WEAPON_SKIN` | `User.clearEquipWeaponSkin` | 动作(User.*) | 1 | 1/0/0 |
| `CTS_DOUBLE_ACCEPT_REQ` | `DoubleMajorAcceptReq` | 客户端请求(CTS_) | 0 | 0/0/0 |
| `CTS_DOUBLE_APPLY_LIST_REQ` | `DoubleMajorApplyListReq` | 客户端请求(CTS_) | 0 | 0/0/0 |
| `CTS_DOUBLE_APPLY_REQ` | `DoubleMajorApplyReq` | 客户端请求(CTS_) | 0 | 0/0/0 |
| `CTS_DOUBLE_IGNORE_REQ` | `DoubleMajorIgnoreReq` | 客户端请求(CTS_) | 0 | 0/0/0 |
| `CTS_EXCHANGE_INFO_REQ` | `ExchangeInfoReq` | 客户端请求(CTS_) | 0 | 0/0/0 |
| `CTS_EXCHANGE_REQ` | `ExchangeReq` | 客户端请求(CTS_) | 0 | 0/0/0 |
| `CTS_EXCHANGE_RESET_REQ` | `ExchangeResetReq` | 客户端请求(CTS_) | 0 | 0/0/0 |
| `CTS_EightDiagramsActivateReq` | `EightDiagramsActivateReq` | 客户端请求(CTS_) | 0 | 0/0/0 |
| `CTS_ExploreBoxOpenReq` | `ExploreBoxOpenReq` | 客户端请求(CTS_) | 0 | 0/0/0 |
| `CTS_PARTNERS_CHANGED_REQ` | `FriendPartnersChangeReq` | 客户端请求(CTS_) | 0 | 0/0/0 |
| `CTS_StatueChangeReq` | `StatueChangeReq` | 客户端请求(CTS_) | 0 | 0/0/0 |
| `DIGCELL_TASK_SUBMIT_ITEM` | `User.digcellTaskSubmitItem` | 动作(User.*) | 1 | 1/0/0 |
| `DOUBLE_HOOK_CHAT_MSG` | `User.OnHookMsgSendKFChat` | 动作(User.*) | 1 | 1/0/0 |
| `DRAGON_TRAINING_DATA` | `User.getTrainingData` | 动作(User.*) | 1 | 1/0/0 |
| `EQUIPWEAPONSKIN` | `User.equipWeaponSkin` | 动作(User.*) | 1 | 1/0/0 |
| `EQUIP_PUNCH` | `User.equipPunch` | 动作(User.*) | 1 | 1/0/0 |
| `EQUIP_PUNCH_DISA` | `User.equipPunchDisassembly` | 动作(User.*) | 1 | 1/0/0 |
| `EXCHANGE_BOOKMARK_SHOP` | `User.exchangeBookmarkShop` | 动作(User.*) | 1 | 1/0/0 |
| `EXCHANGE_BREW_SHOP` | `User.exchangeBrewShop` | 动作(User.*) | 1 | 1/0/0 |
| `EXCHANGE_SPRING_SWORD_REWARD` | `User.exchangeSpringswordReward` | 动作(User.*) | 1 | 1/0/0 |
| `FINISH_PARTNER_TASK` | `User.friendPartnerTaskComplete` | 动作(User.*) | 1 | 1/0/0 |
| `FISH_TASK_REWARD_EVENT` | `User.koicarpTaskAwards` | 动作(User.*) | 1 | 1/0/0 |
| `FLING_MOONSTEP` | `User.flingMoonstep` | 动作(User.*) | 1 | 1/0/0 |
| `FRIEND_PARTNER_DISPATCH` | `User.friendPartnerDispatch` | 动作(User.*) | 1 | 1/0/0 |
| `FRIEND_PARTNER_DISPATCH_CLEAR` | `User.friendPartnerDispatchClear` | 动作(User.*) | 1 | 1/0/0 |
| `FRIEND_PARTNER_END_TRAINING` | `User.friendPartnerEndTraining` | 动作(User.*) | 1 | 1/0/0 |
| `FRIEND_PARTNER_TRAINING` | `User.friendPartnerTraining` | 动作(User.*) | 1 | 1/0/0 |
| `FRIEND_PARTNER_TRAINING_USE` | `User.friendPartnerTrainingUse` | 动作(User.*) | 1 | 1/0/0 |
| `GEM_CHOOSE_BOX_REWARD` | `User.gemChooseUsedItemAward` | 动作(User.*) | 1 | 1/0/0 |
| `GEM_INLAY` | `User.gemInlay` | 动作(User.*) | 1 | 1/0/0 |
| `GEM_REFINE` | `User.gemRefine` | 动作(User.*) | 1 | 1/0/0 |
| `GEM_REFINE_REPLACE` | `User.gemRefineReplace` | 动作(User.*) | 1 | 1/0/0 |
| `GETKOICARP_DATA` | `User.getKoicarpData` | 动作(User.*) | 1 | 1/0/0 |
| `GETKOICARP_TASK_DATA` | `User.getKoicarpTaskData` | 动作(User.*) | 1 | 1/0/0 |
| `GETWEAPONSKINDATA` | `User.getWeaponSkinData` | 动作(User.*) | 1 | 1/0/0 |
| `GET_BEACH_TREASURE_DATA` | `User.getBeachtreasureData` | 动作(User.*) | 1 | 1/0/0 |
| `GET_BEACH_TREASURE_TASK_DATA` | `User.getBeachtreasureTaskData` | 动作(User.*) | 1 | 1/0/0 |
| `GET_BOOKMARK_DATA` | `User.getBookmarkData` | 动作(User.*) | 1 | 1/0/0 |
| `GET_BOOKMARK_EXCHANGE_SHOP` | `User.getBookmarkExchangeShop` | 动作(User.*) | 1 | 1/0/0 |
| `GET_BOOKMARK_TASK_AWARDS` | `User.getBookmarkTaskAwards` | 动作(User.*) | 1 | 1/0/0 |
| `GET_BREW_DATA` | `User.getBrewData` | 动作(User.*) | 1 | 1/0/0 |
| `GET_BREW_EXCHANGE_SHOP` | `User.getBrewExchangeShop` | 动作(User.*) | 1 | 1/0/0 |
| `GET_CONFIRM_RARE_DIG_GRID` | `User.setDigcellRareReward` | 动作(User.*) | 1 | 1/0/0 |
| `GET_DAILY_TASKS` | `User.getDigTaskData` | 动作(User.*) | 1 | 1/0/0 |
| `GET_DAILY_TASKS_RECEIVE` | `User.getDigTaskReward` | 动作(User.*) | 1 | 1/0/0 |
| `GET_DIGGING_GRIDS` | `User.getDigcellData` | 动作(User.*) | 1 | 0/0/1 |
| `GET_FLIP_DIG_GRID` | `User.getDigcellReward` | 动作(User.*) | 1 | 1/0/0 |
| `GET_FRIEND_PARTNER` | `User.getFriendPartner` | 动作(User.*) | 1 | 1/0/0 |
| `GET_GOLD_LOTTERY_DATA` | `User.getGoldLotteryData` | 动作(User.*) | 1 | 1/0/0 |
| `GET_JUMP_FUNC_DATA` | `User.getCastleJumpingFunData` | 动作(User.*) | 1 | 1/0/0 |
| `GET_JUMP_FUNC_TASK_DATA` | `User.getCastleJumpingFunTaskData` | 动作(User.*) | 1 | 1/0/0 |
| `GET_MARRY_HAPPINESS` | `User.getMarryHappinessNum` | 动作(User.*) | 1 | 1/0/0 |
| `GET_MONOLOP_RANK_DATA` | `User.getDiceRankData` | 动作(User.*) | 1 | 1/0/0 |
| `GET_MOONSTEP_DATA` | `User.getMoonstepData` | 动作(User.*) | 1 | 1/0/0 |
| `GET_MOONSTEP_TASK_DATA` | `User.getMoonstepTaskData` | 动作(User.*) | 1 | 1/0/0 |
| `GET_MYSTERY_WISH_AWARD` | `User.mysterywishAward` | 动作(User.*) | 1 | 1/0/0 |
| `GET_MYSTERY_WISH_DATA` | `User.getMysterywishData` | 动作(User.*) | 1 | 1/0/0 |
| `GET_NEXT_DIGGING_GRIDS` | `User.digcellNextFloor` | 动作(User.*) | 1 | 1/0/0 |
| `GET_NIAN_SHOU_DATA` | `User.getNianshouData` | 动作(User.*) | 1 | 1/0/0 |
| `GET_NIAN_TASK_DATA` | `User.getNianshouPrepareTaskData` | 动作(User.*) | 1 | 1/0/0 |
| `GET_PLAYER_AUTO_CONFIG` | `User.getPlayerAutoConfig` | 动作(User.*) | 1 | 1/0/0 |
| `GET_PLAYER_EMOJIS_DATA` | `User.getPlayerEmojis` | 动作(User.*) | 1 | 1/0/0 |
| `GET_SERVER_GIFT_DATA` | `User.getServerGiftData` | 动作(User.*) | 1 | 1/0/0 |
| `GET_SEVEN_DAY_DATA` | `User.GetSevenDaysData` | 动作(User.*) | 1 | 1/0/0 |
| `GET_SPRING_SWORD_DATA` | `User.getSpringswordData` | 动作(User.*) | 1 | 1/0/0 |
| `GET_SPRING_SWORD_GIFT_DATA` | `User.getSpringswordGiftData` | 动作(User.*) | 1 | 1/0/0 |
| `GET_SPRING_SWORD_TASK_DATA` | `User.getSpringswordTaskData` | 动作(User.*) | 1 | 1/0/0 |
| `GET_STAGE_TREASURE_DATA` | `User.getStagetreasureData` | 动作(User.*) | 1 | 1/0/0 |
| `GET_THEMEATIVITIE` | `User.getThemeactivitie` | 动作(User.*) | 1 | 1/0/0 |
| `GET_TORCH_DATA` | `User.getTorchData` | 动作(User.*) | 1 | 1/0/0 |
| `GET_TRANS_GIFT` | `User.getTransGift` | 动作(User.*) | 1 | 1/0/0 |
| `GET_UNLOCK_KOICARP_BOX` | `User.getKoicarpUnlockBox` | 动作(User.*) | 1 | 1/0/0 |
| `GOLD_LOTTERY_EXTRACT` | `User.goldLotteryExtract` | 动作(User.*) | 1 | 1/0/0 |
| `JUMP_FUNC_TASK_AWARD_DATA` | `User.castleJumpingFunTaskAwards` | 动作(User.*) | 1 | 1/0/0 |
| `LOTTERY_BEACH_TREASURE_AWARD` | `User.lotteryBeachtreasureAward` | 动作(User.*) | 1 | 1/0/0 |
| `LOTTERY_JUMP_FUNC_DATA` | `User.lotteryCastleJumpingFun` | 动作(User.*) | 1 | 1/0/0 |
| `LOTTERY_KOICARP_DATA` | `User.lotteryKoicarp` | 动作(User.*) | 1 | 1/0/0 |
| `LOTTERY_STAGE_TREASURE` | `User.lotteryStagetreasure` | 动作(User.*) | 1 | 1/0/0 |
| `LOTTERY_WULIN_TREASURE` | `User.lotteryWulintreasure` | 动作(User.*) | 1 | 1/0/0 |
| `MATERIA_FUSION` | `User.gemcombine` | 动作(User.*) | 1 | 1/0/0 |
| `MATERIA_LOCK` | `User.gemLock` | 动作(User.*) | 1 | 1/0/0 |
| `MOONSTEP_TASK_AWARD` | `User.moonstepTaskAwards` | 动作(User.*) | 1 | 1/0/0 |
| `MYSTERY_WISH_TASK_AWARD` | `User.mysterywishTaskAward` | 动作(User.*) | 1 | 1/0/0 |
| `NIAN_TASK_COMPLETE` | `User.nianshouPrePareTaskComplete` | 动作(User.*) | 1 | 1/0/0 |
| `NIAN_TASK_REFRESH` | `User.nianshouPrePareTaskRefresh` | 动作(User.*) | 1 | 1/0/0 |
| `OPTIONAL_SKILL_UP` | `User.optionalSkillUp` | 动作(User.*) | 1 | 1/0/0 |
| `OPTION_BEACH_TREASURE_AWARD` | `User.optionBeachtreasureAward` | 动作(User.*) | 1 | 1/0/0 |
| `OPTION_KOICARP_WWARDS` | `User.optionKoicarpAwards` | 动作(User.*) | 1 | 1/0/0 |
| `PARTNERT_BREAK` | `User.friendPartnerBreak` | 动作(User.*) | 1 | 1/0/0 |
| `PARTNERT_GO_FIGHT` | `User.upFriendPartnerGoFight` | 动作(User.*) | 1 | 1/0/0 |
| `PARTNER_HOME_AWARD` | `User.getFriendPartnerHomeAward` | 动作(User.*) | 1 | 1/0/0 |
| `PLAYER_AUTO_OBJ` | `autoObj` | 其他 | 0 | 1/0/0 |
| `RECEIVE_MOONSTEP_CYCLE_AWARD` | `User.receiveMoonstepCycleAward` | 动作(User.*) | 1 | 1/0/0 |
| `RECEIVE_SERVER_GIFT_REWARD` | `User.receiveServerGift` | 动作(User.*) | 1 | 1/0/0 |
| `RECORD_ATTRIBUTES` | `User.recordAttributes` | 动作(User.*) | 1 | 0/0/0 |
| `RG_CHOOSE_USEITEM_AWARD` | `User.rgChooseUsedItemAward` | 动作(User.*) | 1 | 1/0/0 |
| `SET_FRIEDN_SHOW_EVENT` | `User.setFriendPartnerShow` | 动作(User.*) | 1 | 0/0/0 |
| `SET_PLAYER_AUTO_CONFIG` | `User.setPlayerAutoConfig` | 动作(User.*) | 1 | 1/0/0 |
| `SET_PLAYER_CARD_MASTER` | `User.setPlayerCardMasters` | 动作(User.*) | 1 | 1/0/0 |
| `SKILL_TRICK_SET_ID` | `User.skillTrickSetId` | 动作(User.*) | 1 | 1/0/0 |
| `SPRING_SWORD_TASK_AWARDS` | `User.springswordTaskAwards` | 动作(User.*) | 1 | 1/0/0 |
| `STAGE_TREASURE_TASK_COMPLETE` | `User.stagetreasureTaskComplete` | 动作(User.*) | 1 | 1/0/0 |
| `STC_DOUBLE_ACCEPT_NOTIFY` | `DmChatAcceptNotify` | 服务端通知(STC_) | 0 | 1/0/0 |
| `STC_DOUBLE_ACCEPT_RES` | `DoubleMajorAcceptRes` | 服务端通知(STC_) | 0 | 1/0/0 |
| `STC_DOUBLE_APPLY_LIST_RES` | `DoubleMajorApplyListRes` | 服务端通知(STC_) | 0 | 1/0/0 |
| `STC_DOUBLE_APPLY_RES` | `DoubleMajorApplyRes` | 服务端通知(STC_) | 0 | 1/0/0 |
| `STC_DOUBLE_IGNORE_RES` | `DoubleMajorIgnoreRes` | 服务端通知(STC_) | 0 | 1/0/0 |
| `STC_DOUBLE_RED_NOTIFY` | `DmChatRedDotNotify` | 服务端通知(STC_) | 0 | 1/0/0 |
| `STC_EXCHANGE_INFO_RES` | `ExchangeInfoRes` | 服务端通知(STC_) | 0 | 1/0/0 |
| `STC_EXCHANGE_NOTIFY` | `ExchangeNotify` | 服务端通知(STC_) | 0 | 1/0/0 |
| `STC_EXCHANGE_RES` | `ExchangeRes` | 服务端通知(STC_) | 0 | 1/0/0 |
| `STC_EXCHANGE_RESET_NOTIFY` | `ExchangeResetNotify` | 服务端通知(STC_) | 0 | 1/0/0 |
| `STC_EXCHANGE_RESET_RES` | `ExchangeResetRes` | 服务端通知(STC_) | 0 | 1/0/0 |
| `STC_EightDiagramsActivateNotify` | `EightDiagramsActivateNotify` | 服务端通知(STC_) | 0 | 1/0/0 |
| `STC_ExploreBoxOpenNotify` | `ExploreBoxOpenNotify` | 服务端通知(STC_) | 0 | 1/0/0 |
| `STC_ExploreBoxRefreshNotify` | `ExploreBoxInfoRefreshNotify` | 服务端通知(STC_) | 0 | 1/0/0 |
| `STC_PARTNERS_CHANGED_NOTIFY` | `FriendPartnersChangeNotify` | 服务端通知(STC_) | 0 | 0/1/0 |
| `STC_StatueChangeNotify` | `StatueChangeNotify` | 服务端通知(STC_) | 0 | 1/0/0 |
| `STC_StatueChangeRes` | `StatueChangeRes` | 服务端通知(STC_) | 0 | 1/0/0 |
| `SUBMIT_NIAN_ITEM` | `User.submitNianshouPrePareItem` | 动作(User.*) | 1 | 1/0/0 |
| `TORCH_ALTAR` | `User.torchAltar` | 动作(User.*) | 1 | 1/0/0 |
| `TORCH_TASK_COMPLETE` | `User.torchTaskComplete` | 动作(User.*) | 1 | 1/0/0 |
| `TRAINING_LOTTERY` | `User.lotteryTraining` | 动作(User.*) | 1 | 1/0/0 |
| `TRAINING_REFRESH` | `User.refreshTraining` | 动作(User.*) | 1 | 1/0/0 |
| `TRAINING_TASK_AWAARD` | `User.trainingTaskAwards` | 动作(User.*) | 1 | 1/0/0 |
| `TRAINING_TASK_DATA` | `User.getTrainingTaskData` | 动作(User.*) | 1 | 1/0/0 |
| `UNLOCK_FRIEND_PARTNER` | `User.unlockFriendPartner` | 动作(User.*) | 1 | 1/0/0 |
| `UNLOCK_WEAPONSKIN` | `User.unlockWeaponSkin` | 动作(User.*) | 1 | 1/0/0 |
| `UP_FRIEND_PARTNER_FOLLOW` | `User.upFriendPartnerFollow` | 动作(User.*) | 1 | 1/0/0 |
| `UP_FRIEND_PARTNER_SKILL` | `User.upFriendPartnerSkill` | 动作(User.*) | 1 | 1/0/0 |
| `WULIN_TREASURE_DATA` | `User.getWulintreasureData` | 动作(User.*) | 1 | 1/0/0 |
| `WULIN_TREASURE_REWARD` | `User.wulintreasureTaskAwards` | 动作(User.*) | 1 | 1/0/0 |
| `WULIN_TREASURE_TASKDATA` | `User.getWulintreasureTaskData` | 动作(User.*) | 1 | 1/0/0 |

## 遗留

- STC_ 通知与 M1 的 PUSH 分类（192 项）是否重叠，待与 M1 的 PUSH 集合比对（下一期）。
- CTS_/STC_ 通道不走 59325 事件派发（回执矛盾 #4 已证 gemch 一例），对账域是否需新增 `gemch` 等子键待 S2。