# 应答字段消费方式（启发式【推断】）

104 个动作有线索；112 个字段不能用 0 兜底；9 个动作不能安全兜底。

## 不能安全兜底的动作（兜底时别回 eRet:1，或者把字段给全）

| 动作 | do 名 | 原因 |
|---|---|---|
| BEGIN_WEDDING | User.beginWedding | cycleObj 缺了会崩（index.js:77051,index.js:77058⚠） |
| BIRTHCHILD | User.birthChild | cycleObj 缺了会崩（index.js:77051,index.js:77058⚠） |
| EXILE_CHILD | User.exileChild | cycleObj 缺了会崩（index.js:77051,index.js:77058⚠） |
| GET_BIGPAY_STATE_DATA | User.getBigPayState | 数据空会重发请求（index.js:55300） |
| GET_PAY_STATE_DATA | User.getPayState | 数据空会重发请求（index.js:55300） |
| INVITE_NPC_OPTION | User.optionLikeEvent | npcId 缺了会崩（index.js:51168,index.js:51181⚠） |
| MAKE_LOVE | User.makeLove | cycleObj 缺了会崩（index.js:77051,index.js:77058⚠） |
| MARRY_AWARD | User.marryAward | cycleObj 缺了会崩（index.js:77051,index.js:77058⚠） |
| REQ_WM_ADV_RWD | User.GetRandomEventAward | npcArr 缺了会崩（index.js:143820,index.js:143832⚠） |

## 不能用 0 兜底的字段

| 动作 | 字段 | 实际形状 | 消费点 |
|---|---|---|---|
| ACHV_CHANGE | nIds | array|string | scripts3.js:2887 |
| ANN_PASS_BUY_LIVENESS | td | container | scripts3.js:7861 |
| ANN_PASS_FINISH_TASK | dt | array|string | scripts3.js:7880 |
| BATCH_SEED_CROP | crops | container | index.js:57657 |
| BEGIN_WEDDING | leaveNpc | array|string | index.js:77043 |
| BEGIN_WEDDING | proposeNpc | array|string | index.js:77035,index.js:77036 |
| BIRTHCHILD | leaveNpc | array|string | index.js:77043 |
| BIRTHCHILD | proposeNpc | array|string | index.js:77035,index.js:77036 |
| BUY_HOME_CROP | rewardArray | container | index.js:57860 |
| CALL_DRAGON | ApplyInfoList | array|string | index.js:27044,index.js:27046 |
| CALL_DRAGON | CollectionRollItemInfoList | array|string | index.js:27059 |
| CALL_DRAGON | RoleSlot | array|string | index.js:27054 |
| CHANGE_DELEGATE_TASK | taskObj | container | index.js:43518 |
| CHOOSE_USEITEM_AWARD | cData | container | index.js:64952 |
| CLAIM_TR_REWARD | needItem | array | index.js:139319,index.js:139335 |
| COLLECT | rewardArray | container | index.js:25210 |
| COMPLETE_ORDER_BY_HOTVAL | unlockDish | container | index.js:62251 |
| CREATE_ORDER_BY_HOTVAL | unlockDish | container | index.js:62251 |
| CTS_FIVE_LINES_DIAGRAM_OBSTACLE_APPEAR | tianJiLock | array|string | index.js:135999 |
| CTS_FIVE_LINES_DIAGRAM_PATH_GENERATE | tianJiLock | array|string | index.js:135999 |
| CTS_OPEN_FIVE_LINES_DIAGRAM_RES | tianJiLock | array|string | index.js:135999 |
| CTS_UPLOAD_PATH_SEGMENT_RES | tianJiLock | array|string | index.js:135999 |
| DISPATCH_AWARD | rewardArray | container | scripts3.js:23138,scripts3.js:23139 |
| DISPOSS_HOME_EVENT | rewardArray | container | index.js:58002 |
| ENTER_GET_CLIMBLING_EVENT | towerArray | array | index.js:137553 |
| EQUIP_INHERIT | equip | array | index.js:61486 |
| EXILE_CHILD | leaveNpc | array|string | index.js:77043 |
| EXILE_CHILD | proposeNpc | array|string | index.js:77035,index.js:77036 |
| FIND_OTHER_HOME | findArr | array | index.js:57949 |
| GETNOTICE_REWARD | rewardArray | container | index.js:108241 |
| GET_ACHIEVE_DATA | achieveIdArr | array|string | scripts3.js:2903 |
| GET_ACHIEVE_DATA | groupPoints | container | scripts3.js:2901 |
| GET_DRAGON | ApplyInfoList | array|string | index.js:27044,index.js:27046 |
| GET_DRAGON | CollectionRollItemInfoList | array|string | index.js:27059 |
| GET_DRAGON | RoleSlot | array|string | index.js:27054 |
| GET_FASHION_SHOP | shopArr | array|string | index.js:145349,index.js:145350 |
| GET_INN_RANK | unlockDish | container | index.js:62251 |
| GET_INN_SHOP | unlockDish | container | index.js:62251 |
| GET_KNACK_LOTTERY | optionalDatas | array|string | scripts3.js:90012 |
| GET_KNACK_LOTTERY | upSkillRateData | container | scripts3.js:90010 |
| GET_KNACK_LOTTERY_HISTORY | optionalDatas | array|string | scripts3.js:90012 |
| GET_KNACK_LOTTERY_HISTORY | upSkillRateData | container | scripts3.js:90010 |
| GET_MP_ULTSKILLS | dataArr | array|string | index.js:110884 |
| GET_RETURN_GIFT | giftDatas | array | scripts3.js:63544 |
| GET_SNOW_REWARD | rewardArray | container | index.js:122532 |
| GET_SPECIAL_AWARD | rewardArray | container | index.js:58462,index.js:58463 |
| GET_TEAM_ULTSKILLS | dataArr | array|string | index.js:54941 |
| HOME_SPECIAL_AWARD | rewardArray | container | index.js:57867,index.js:57872 |
| INN_BUY_SHOP | unlockDish | container | index.js:62251 |
| INVITE_NPC_OPTION | npcId | array | index.js:51168,index.js:51181⚠ |
| KNACK_LOTTERY | optionalDatas | array|string | scripts3.js:90012 |
| KNACK_LOTTERY | upSkillRateData | container | scripts3.js:90010 |
| MAKE_LOVE | leaveNpc | array|string | index.js:77043 |
| MAKE_LOVE | proposeNpc | array|string | index.js:77035,index.js:77036 |
| MAKE_WISH_DRAGON | ApplyInfoList | array|string | index.js:27044,index.js:27046 |
| MAKE_WISH_DRAGON | CollectionRollItemInfoList | array|string | index.js:27059 |
| MAKE_WISH_DRAGON | RoleSlot | array|string | index.js:27054 |
| MARRY_AWARD | leaveNpc | array|string | index.js:77043 |
| MARRY_AWARD | proposeNpc | array|string | index.js:77035,index.js:77036 |
| OBTAINCROP | rewardArray | container | index.js:57712 |
| ONE_KEY_DISPOSS_HOME_EVENT | cropMap | container | index.js:57760 |
| ONE_KEY_DISPOSS_HOME_EVENT | rewardArray | container | index.js:57798 |
| ONE_KEY_OBTAIN_CROP | obtainLands | array|string | index.js:57735 |
| ONE_KEY_OBTAIN_CROP | rewardArray | container | index.js:57754 |
| OTHER_PLAYER_HOME | homeArr | array|string | index.js:57918,index.js:57919 |
| OTHER_PLAYER_HOME | recommendHomeArr | array|string | index.js:57933,index.js:57934 |
| RECEIVE_ACHIEVEMENT_REWARD | optionalDatas | array|string | scripts3.js:90012 |
| RECEIVE_ACHIEVEMENT_REWARD | upSkillRateData | container | scripts3.js:90010 |
| RECEIVE_ACHIEVE_RATE_REWARD | rateIds | container | scripts3.js:2947 |
| RECEIVE_ACHIEVE_REWARD | achieveIdArr | container | scripts3.js:2921 |
| RECEIVE_ACHIEVE_REWARD | groupPoints | container | scripts3.js:2930 |
| RECEIVE_ACHIEVE_SUIT_REWARD | srd | container | scripts3.js:2955 |
| RECOMMEND_ONESELF_HOME | friendHome | array|string | index.js:57891 |
| RECOMMEND_ONESELF_HOME | homeArr | array|string | index.js:57882,index.js:57884 |
| REFRESH_RETURN_GIFT_AWARD | giftAwards | array | scripts3.js:63555 |
| REQ_ROGUE_PVE_COMBAT | exchangeNpcArr | array|string | index.js:104162 |
| REQ_SERVER_LIST | serverObj | container | index.js:116722 |
| REQ_WM_ADV_RWD | rewardArray | container | index.js:143816 |
| REQ_WULIN_ASSEMBLY_MATCHTIME | WuLinMatchConfigList | array|string | scripts3.js:95838 |
| RES_SUBTITLE_ADD | insert_content | array|string | index.js:146237 |
| ROGUE_CHANGE_SKNACK | skillGraspData | container | scripts3.js:73998 |
| ROGUE_USE_ITEM | rewardArray | container | scripts3.js:73957,scripts3.js:73958 |
| SERVER_NPC_BATTLE_END | awardObj | array | index.js:67705 |
| SERVER_NPC_BATTLE_END | rewardArray | container | index.js:67707,index.js:67708 |
| STC_BATTLEAWARD_SHOW | SpoilShow | array|string | index.js:23990 |
| STC_CHAT_CHANNEL_RES | chatHistory | array|string | index.js:145972 |
| STC_CHAT_SEND_RES | content | array|string | index.js:146049 |
| STC_COLLECT_ROLE_AWARD_NOTIFY | CollectionRollItemInfoList | array|string | index.js:26218 |
| STC_COLLECT_ROLL_CLOSE_NOTIFY | CollectionRollItemInfoList | array|string | index.js:26218 |
| STC_COLLECT_ROLL_ITEAMIF | CollectionRollItemInfoList | array|string | index.js:26218 |
| STC_COLLECT_ROLL_OPEN_NOTIFY | CollectionRollItemInfoList | array|string | index.js:26218 |
| STC_INNER_FORCE_VALUE_CHANGE_NOTIFY | InnerForceValuePair | array | index.js:99400 |
| STC_ITEM_CONSUME_NOTIFY | ItemInfoList | array|string | index.js:26528 |
| STC_MAPROLENOTIFY | mapRoleInfo | array|string | index.js:85036 |
| STC_MESSAGE_LIST_NOTIFY | HorseRaceLampWrapperList | array|string | scripts3.js:47578 |
| STC_OPEN_MATCH_INTERFACERES | canMatchTime | array|string | index.js:24043 |
| STC_PRIVATE_CHAT_NOTIFY | SendContext | array|string | index.js:146087 |
| STC_QTE_OVER_NOTIFY | InnerForceValuePair | array | index.js:99400 |
| STC_QTE_RESULT_NOTIFY | InnerForceValuePair | array | index.js:99400 |
| STC_QTE_WAIT_READY_NOTIFY | InnerForceValuePair | array | index.js:99400 |
| STC_ROLE_AWARD_NOTIFY | AwardItemList | array|string | index.js:26468 |
| STC_ROLL_ITEM_INFO_UPDATE_NOTIFY | RollItemInfo | array|string | index.js:26497,index.js:26498 |
| STC_SCENE_TEAM_BRIEF_RES | TeamBriefList | array|string | index.js:26985,index.js:26986 |
| STC_TEAM_COPY_PROGRESS_UPDATE | killedNpc | array|string | index.js:26448 |
| STEAL_CROP_EVENT | rewardArray | container | index.js:58029 |
| SYCNPLAYERITEAMDATA | itemObj | container | index.js:24018 |
| TOWER_GET_PANDA_EVENT | eventArr | array | index.js:137656,index.js:137657 |
| TOWER_RANDOM_EVENT | equipments | container | index.js:137600,index.js:137601 |
| USE_ITEM | rewardArray | container | index.js:64764,index.js:64768 |
| USE_ITEM | rewardSkillSkin | container | index.js:64851,index.js:64853 |
| WASH_ADDITION | bloodArr | array | index.js:144052 |
| WEAR_EQUIPMENT_ALL | equipments | container | index.js:92808 |
