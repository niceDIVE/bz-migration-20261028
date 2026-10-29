# c4-time-ownership 审计取证报告

> 目标文件：hotfix-patch/core/bz-rpc-server.js

## ① 命中清单

### 模式：beginTime

| 行号 | 向上最近动作名 | 文档关联目标动作 | 类型 | 该行逐字原文 |
| :--- | :--- | :--- | :--- | :--- |
| 1450 | OnCheckBreak | OnHookBreak | 注释 |     /** 打坐/挂机 开始-结束：onBreakReqReturn 读 skillID/skillLevel/needTime/operate/serverTime/beginTime/Sponsor/friendName/friendSex/Addition */ |
| 1457 | OnHookBreak | OnHookBreak | 代码 |         needTime: 0, serverTime: now, beginTime: now, |
| 1472 | killNpc | BeginSaveNpc | 注释 |     /** 护镖/托管开始：callBackBeginNpc 读 npcID/beginTime/endTime */ |
| 1477 | BeginSaveNpc | BeginSaveNpc | 代码 |         eRet: 1, npcID: p.npcID \|\| 0, beginTime: now, endTime: now, |
| 1493 | GetRoldSaveTime | BeginFish | 注释 |     /** onStartFishing 51557：读 eRet/beginTime/serverTime/advertisementNum/maxTime */ |
| 1498 | BeginFish | BeginFish | 代码 |         eRet: 1, beginTime: now, serverTime: now, |
| 1503 | BeginFish | EndFish | 注释 |     /** onEndFishing 51576：读 eRet/serverTime/beginTime/gTime/hg/hgtimes/awardArr/extraArr */ |
| 1508 | EndFish | EndFish | 代码 |         eRet: 1, beginTime: now - 60000, serverTime: now, |
| 1521 | LookFishAward | BeginPlayWooks | 注释 |     /** 86189：0 != eRet 才算开始；读 beginTime/serverTime/maxTime */ |
| 1525 | BeginPlayWooks | BeginPlayWooks | 代码 |         eRet: 1, beginTime: now, serverTime: now, maxTime: 0, |
| 1529 | BeginPlayWooks | EndPlayWooks | 注释 |     /** 86202：读 eRet/serverTime/beginTime/gTime/hg/hgtimes/exp/expExtra/potential/potentialExtra/specialAny */ |
| 1533 | EndPlayWooks | EndPlayWooks | 代码 |         eRet: 1, beginTime: now - 60000, serverTime: now, |

### 模式：serverTime

| 行号 | 向上最近动作名 | 文档关联目标动作 | 类型 | 该行逐字原文 |
| :--- | :--- | :--- | :--- | :--- |
| 553 | grantCurrency | grantCurrency | 注释 |    *  `eRet / triggerBoxs / skillId / CDTime / serverTime`，**不处理任何物品字段**，三包里也没有 |
| 834 | quicklogin | quicklogin | 代码 |       r.serverTime = env.now(); |
| 849 | Create | Create | 代码 |       r.serverTime = env.now(); |
| 865 | Create | LoadGame | 注释 |     /** 有档进入：客户端 loadGame(e) 需要完整角色快照 + e.OnhookObj.serverTime |
| 905 | LoadGame | LoadGame | 代码 |       base.serverTime = now; |
| 907 | LoadGame | LoadGame | 代码 |       if (!base.OnhookObj.serverTime) base.OnhookObj.serverTime = now; |
| 940 | GetChatAddress | GetChatAddress | 代码 |     GetChatAddress: function () { var r = clone(TPL.getChatAddress); r.serverTime = env.now(); return r; }, |
| 1450 | OnCheckBreak | OnHookBreak | 注释 |     /** 打坐/挂机 开始-结束：onBreakReqReturn 读 skillID/skillLevel/needTime/operate/serverTime/beginTime/Sponsor/friendName/friendSex/Addition */ |
| 1457 | OnHookBreak | OnHookBreak | 代码 |         needTime: 0, serverTime: now, beginTime: now, |
| 1493 | GetRoldSaveTime | BeginFish | 注释 |     /** onStartFishing 51557：读 eRet/beginTime/serverTime/advertisementNum/maxTime */ |
| 1498 | BeginFish | BeginFish | 代码 |         eRet: 1, beginTime: now, serverTime: now, |
| 1503 | BeginFish | EndFish | 注释 |     /** onEndFishing 51576：读 eRet/serverTime/beginTime/gTime/hg/hgtimes/awardArr/extraArr */ |
| 1508 | EndFish | EndFish | 代码 |         eRet: 1, beginTime: now - 60000, serverTime: now, |
| 1521 | LookFishAward | BeginPlayWooks | 注释 |     /** 86189：0 != eRet 才算开始；读 beginTime/serverTime/maxTime */ |
| 1525 | BeginPlayWooks | BeginPlayWooks | 代码 |         eRet: 1, beginTime: now, serverTime: now, maxTime: 0, |
| 1529 | BeginPlayWooks | EndPlayWooks | 注释 |     /** 86202：读 eRet/serverTime/beginTime/gTime/hg/hgtimes/exp/expExtra/potential/potentialExtra/specialAny */ |
| 1533 | EndPlayWooks | EndPlayWooks | 代码 |         eRet: 1, beginTime: now - 60000, serverTime: now, |
| 1586 | washAdditionalArr | CheckOutSchool | 注释 |     /** 78022：读 eRet/npcID/serverTime/CDTime/skillId（6 == eRet 表示冷却中） */ |
| 1591 | CheckOutSchool | CheckOutSchool | 代码 |         eRet: 1, npcID: p.npcID \|\| 0, serverTime: now, CDTime: now, skillId: 0, |
| 1601 | OutSchool | OutSchool | 代码 |         serverTime: now, CDTime: now, skillId: 0, |

### 模式：startTime

not found

### 模式：endTime

| 行号 | 向上最近动作名 | 文档关联目标动作 | 类型 | 该行逐字原文 |
| :--- | :--- | :--- | :--- | :--- |
| 1207 | getAlchemyData | getLevelBonusData | 注释 |     /** 等级奖励（离线版：空列表 + endTime=0） |
| 1208 | getAlchemyData | getLevelBonusData | 注释 |      *  消费端 scripts3.js:43812-43828 onGetLevelBonusData 读 e.eRet / e.bonusObj / e.endTime； |
| 1209 | getAlchemyData | getLevelBonusData | 注释 |      *  LevelBonusUI.loadItems（43919-43926）只 `for..in bonusObj`，空对象安全；update() 用 endTime 算倒计时，0 安全。 */ |
| 1211 | getLevelBonusData | getLevelBonusData | 代码 |       return wrapped('getLevelBonusData', { eRet: 1, bonusObj: {}, endTime: 0 }, { achievement: ach() }); |
| 1472 | killNpc | BeginSaveNpc | 注释 |     /** 护镖/托管开始：callBackBeginNpc 读 npcID/beginTime/endTime */ |
| 1477 | BeginSaveNpc | BeginSaveNpc | 代码 |         eRet: 1, npcID: p.npcID \|\| 0, beginTime: now, endTime: now, |
| 1481 | BeginSaveNpc | EndSaveNpc | 注释 |     /** 护镖/托管结束：callBackEndNpc 读 endTime/sex */ |
| 1483 | EndSaveNpc | EndSaveNpc | 代码 |       return wrapped('EndSaveNpc', { eRet: 1, endTime: env.now(), sex: 0 }, { achievement: ach() }); |
| 2188 | buyGoodAndEvilShopItem | rgGetShopData | 注释 |      *  消费端 onGetShopData（71231-71240）：e.shop → RogueModel.shopData，另读 rank/endTime/reputationLevelId； |
| 2202 | rgGetShopData | rgGetShopData | 代码 |       return wrapped('rgGetShopData', { eRet: 1, shop: shop, rank: 0, endTime: 0, reputationLevelId: 0 }, { achievement: ach() }); |

### 模式：maxTime

| 行号 | 向上最近动作名 | 文档关联目标动作 | 类型 | 该行逐字原文 |
| :--- | :--- | :--- | :--- | :--- |
| 1493 | GetRoldSaveTime | BeginFish | 注释 |     /** onStartFishing 51557：读 eRet/beginTime/serverTime/advertisementNum/maxTime */ |
| 1499 | BeginFish | BeginFish | 代码 |         advertisementNum: 0, maxTime: 0, fishpondID: p.fishpondID \|\| 0, |
| 1521 | LookFishAward | BeginPlayWooks | 注释 |     /** 86189：0 != eRet 才算开始；读 beginTime/serverTime/maxTime */ |
| 1525 | BeginPlayWooks | BeginPlayWooks | 代码 |         eRet: 1, beginTime: now, serverTime: now, maxTime: 0, |

### 模式：hyTime

not found

### 模式：cdTime

not found

### 模式：refreshTime

not found

### 模式：time

not found

## ② 四个动作的 handler 是否存在+原文

### 1. BeginFish
- **存在性**：存在（行 1494 - 1501）
- **逐字返回对象（return 完整段落）**：
`javascript
      return wrapped('BeginFish', {
        eRet: 1, beginTime: now, serverTime: now,
        advertisementNum: 0, maxTime: 0, fishpondID: p.fishpondID || 0,
      }, { achievement: ach() });
`
- **完整 handler 原文**：
`javascript
    BeginFish: function (p) {
      p = p || {};
      var now = env.now();
      return wrapped('BeginFish', {
        eRet: 1, beginTime: now, serverTime: now,
        advertisementNum: 0, maxTime: 0, fishpondID: p.fishpondID || 0,
      }, { achievement: ach() });
    },
`

### 2. BeginMeditation
handler 不存在，走形状默认值

### 3. BeginPlayWooks
- **存在性**：存在（行 1522 - 1527）
- **逐字返回对象（return 完整段落）**：
`javascript
      return wrapped('BeginPlayWooks', {
        eRet: 1, beginTime: now, serverTime: now, maxTime: 0,
      }, { achievement: ach() });
`
- **完整 handler 原文**：
`javascript
    BeginPlayWooks: function () {
      var now = env.now();
      return wrapped('BeginPlayWooks', {
        eRet: 1, beginTime: now, serverTime: now, maxTime: 0,
      }, { achievement: ach() });
    },
`

### 4. BeginTraining
handler 不存在，走形状默认值

## ③ 统计

### 1. handler 自己写了时间类字段的动作清单

共 **15** 个动作的 handler 自己写了时间类字段：

- OnHookBreak：写入字段 [beginTime, serverTime]
- BeginSaveNpc：写入字段 [beginTime, endTime]
- BeginFish：写入字段 [beginTime, serverTime, maxTime]
- EndFish：写入字段 [beginTime, serverTime]
- BeginPlayWooks：写入字段 [beginTime, serverTime, maxTime]
- EndPlayWooks：写入字段 [beginTime, serverTime]
- quicklogin：写入字段 [serverTime]
- Create：写入字段 [serverTime]
- LoadGame：写入字段 [serverTime]
- GetChatAddress：写入字段 [serverTime]
- CheckOutSchool：写入字段 [serverTime]
- OutSchool：写入字段 [serverTime]
- getLevelBonusData：写入字段 [endTime]
- EndSaveNpc：写入字段 [endTime]
- rgGetShopData：写入字段 [endTime]

### 2. 时间字段仅出现在注释里的位置清单

共 **22** 处时间字段出现在注释中：

- 行 1450（匹配模式 beginTime）：/** 打坐/挂机 开始-结束：onBreakReqReturn 读 skillID/skillLevel/needTime/operate/serverTime/beginTime/Sponsor/friendName/friendSex/Addition */
- 行 1472（匹配模式 beginTime）：/** 护镖/托管开始：callBackBeginNpc 读 npcID/beginTime/endTime */
- 行 1493（匹配模式 beginTime）：/** onStartFishing 51557：读 eRet/beginTime/serverTime/advertisementNum/maxTime */
- 行 1503（匹配模式 beginTime）：/** onEndFishing 51576：读 eRet/serverTime/beginTime/gTime/hg/hgtimes/awardArr/extraArr */
- 行 1521（匹配模式 beginTime）：/** 86189：0 != eRet 才算开始；读 beginTime/serverTime/maxTime */
- 行 1529（匹配模式 beginTime）：/** 86202：读 eRet/serverTime/beginTime/gTime/hg/hgtimes/exp/expExtra/potential/potentialExtra/specialAny */
- 行 553（匹配模式 serverTime）：*  `eRet / triggerBoxs / skillId / CDTime / serverTime`，**不处理任何物品字段**，三包里也没有
- 行 865（匹配模式 serverTime）：/** 有档进入：客户端 loadGame(e) 需要完整角色快照 + e.OnhookObj.serverTime
- 行 1450（匹配模式 serverTime）：/** 打坐/挂机 开始-结束：onBreakReqReturn 读 skillID/skillLevel/needTime/operate/serverTime/beginTime/Sponsor/friendName/friendSex/Addition */
- 行 1493（匹配模式 serverTime）：/** onStartFishing 51557：读 eRet/beginTime/serverTime/advertisementNum/maxTime */
- 行 1503（匹配模式 serverTime）：/** onEndFishing 51576：读 eRet/serverTime/beginTime/gTime/hg/hgtimes/awardArr/extraArr */
- 行 1521（匹配模式 serverTime）：/** 86189：0 != eRet 才算开始；读 beginTime/serverTime/maxTime */
- 行 1529（匹配模式 serverTime）：/** 86202：读 eRet/serverTime/beginTime/gTime/hg/hgtimes/exp/expExtra/potential/potentialExtra/specialAny */
- 行 1586（匹配模式 serverTime）：/** 78022：读 eRet/npcID/serverTime/CDTime/skillId（6 == eRet 表示冷却中） */
- 行 1207（匹配模式 endTime）：/** 等级奖励（离线版：空列表 + endTime=0）
- 行 1208（匹配模式 endTime）：*  消费端 scripts3.js:43812-43828 onGetLevelBonusData 读 e.eRet / e.bonusObj / e.endTime；
- 行 1209（匹配模式 endTime）：*  LevelBonusUI.loadItems（43919-43926）只 `for..in bonusObj`，空对象安全；update() 用 endTime 算倒计时，0 安全。 */
- 行 1472（匹配模式 endTime）：/** 护镖/托管开始：callBackBeginNpc 读 npcID/beginTime/endTime */
- 行 1481（匹配模式 endTime）：/** 护镖/托管结束：callBackEndNpc 读 endTime/sex */
- 行 2188（匹配模式 endTime）：*  消费端 onGetShopData（71231-71240）：e.shop → RogueModel.shopData，另读 rank/endTime/reputationLevelId；
- 行 1493（匹配模式 maxTime）：/** onStartFishing 51557：读 eRet/beginTime/serverTime/advertisementNum/maxTime */
- 行 1521（匹配模式 maxTime）：/** 86189：0 != eRet 才算开始；读 beginTime/serverTime/maxTime */
