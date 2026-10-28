# FINAL 回执 · v4.0 终局冻结 P7（唯一回执，随下游交付-FINAL.zip 交用户，不推仓库）

- 执行方：P7 终局冻结执行者（活树工作，不发提问清单、不等答复；能自定的已自定）
- 起点复核（动手前已核对，与任务书一致，否则应停报——未变，故继续）：
  核心 `hotfix-patch/core/bz-rpc-server.js` SHA256 `f4bf282782b4ee6e691059e97c2e313c3a827581628c6f7d77c5648e3c4eec71`；
  产物 `hotfix-patch/patch/live/handlers.js` SHA256 `40d2ca2447d44f779a424e57020dd8326f56db6c0a5f83ff47e96d99d7a8191c`；
  `patch/live/flow.js` SHA256 `b7cd1c13f10a3207114763029583bb8d2d8a0cb726b8a2433e384108bcbf3c11`（2747 字节）
- **FINAL 指纹：ver=hf5d89bf7，selfCheck=1514，handlers.js=1814791 字节，形状 382/1130**
- P7 产品代码改动：0。P7 是冻结验证轮（复核 + 六门 + 全量冒烟 + 往返 + 实测重算），未改核心、未改产物、未改形状、未改白名单。
- P7 批前快照：`final/rounds/P7/snapshots/pre-p7/`（核心、产物、跑器 + SHA256SUMS.txt）
- P7 备份：`BaoZouyxt/_backup/2026-10-28-223542-pre-p7/`（批前核心/产物）
- P7 门日志：`final/rounds/P7/gates/`；透传重算：`final/rounds/P7/work/recompute-p7.js`、`inventory-p7.json`；往返脚本：`final/rounds/P7/roundP7-roundtrip.js`
- 真实存档：P7 未写真实存档。树内 `runtime-save/bz_offline_save.json` SHA 仍 `018d6afdf713863cc9b40eef0181632ad9fa2d55a6cb084c25ded3743722eb47`（2026-10-27），往返用的是其副本 `final/rounds/P7/work/real-save-copy.json`（同 SHA）。
- known-red.json 仍 `[]`；验收按设计追加 history 一行（seq=13，entries=[]）；freebie_allow.json 未动。

## 1. 76 批总表（批号一律 v2.7.1，来源：`BaoZouyxt/_incoming/v2.7.1-20261026/work/bz-oracle/out/relations.json`（relate v2.3，76 簇）批名；状态来源见每行末尾：早期回执 / A / B / C / D / E / P5 / P6 / 活树实测）

| 批 | 玩法 | 状态一行 |
|---|---|---|
| 第1批 C01 | 商店交易 | 完成：27/27 全覆盖（货架/买/卖/刷新/限购），BZ_INNSHOP 价目表。早期回执 |
| 第2批 C05 | 道具使用 | 完成：15 指令 + 11 同面板必做；useItem 进 lint 白名单（先扣背包再按表发）。早期回执 |
| 第3批 C02 | 任务主线 | 完成：19 个（3 已有 + 16 新写），c02-smoke 13 条。早期回执 |
| 第4批 C03 | 战斗结算 | 完成：19 键已落地并部署；注：早期回执自注本批“未逐字复核”，P7 六门/冒烟无回归异常。早期回执 |
| 第5批 C17 | 成就 | 部分完成：成就面板读取已实现（getAchieveData 读存档 s.achieve 账本）；领奖 4 键（receiveAchieveReward / receiveAchieveRateReward / receiveAchieveSuitReward / receiveAchievementReward）分发层默认 eRet 4（条件未建模，不发奖），lint 记账闸在体；早期回执无 C17 专节，本行以活树实测为准（核心默认拒绝映射 + lint 44 表 + P5 透传处置表）。 |
| 第6批 C04 | 婚姻子女 | 部分完成：8 个实现（生育/结婚/同房/领奖/领养/离婚/嫁娶/取名），其余 13 键锁死。早期回执 |
| 第7批 C06 | 打坐练功 | 完成：11 薄 ack + 服务端计时结算修为。早期回执 |
| 第8批 C07 | 善恶 | 部分完成：11 动作全锁 eRet 2（门槛未实现，ISSUE-8）；善恶商店/结算对照已实现未回归。早期回执 + P6 |
| 第9批 C08 | PVE 战斗族 | 部分完成：单人 PVE 4 个实现 + PVP 优雅拒，不写存档、不动钱包。早期回执 |
| 第10批 C09 | 技巧摸奖 | 部分完成：摸奖/领悟/洗练 7 个做；装备技巧分解合成 4 个锁。早期回执 |
| 第11批 C10 | 农作物/家园 | 完成：10 handler + 家园种子商店全链（买种/种植/加速/收获）。早期回执 |
| 第12批 C11 | 周年通行证 | 完成：7 键全做 + VIP 防白领校验门；活跃 10 gold/点等口径已追认。早期回执 + P6 |
| 第13批 C12 | 管家/帮手 | 完成：10 动作闭环 + 修崩 + 防刷；单派遣闭环 P6 复验。早期回执 + P6 |
| 第14批 C13 | UFO 夹娃娃 | 完成：4 动作闭环（数据/领奖/刷新/买刷新），3 死键跳过，签名仅验存在。早期回执 + P6 |
| 第15批 C14 | 斗狗（己方） | 部分完成：己方 3 闭环（FeedDog 真扣狗粮 6285 / lookDogLog / DogBattleResult）；对手 4 键锁（ISSUE-14，E 轮关闭）。早期回执 + E |
| 第16批 C15 | 七日回归 | 部分完成：6 键最小闭环 + 7 档奖励 + 任务礼包展示；另 4 键不做（ISSUE-15）。早期回执 + P6 |
| 第17批 C16 | 龙 | 部分完成：成功 6（查询/召唤旗标/骰子会话旗标/只回骰值/读存档）+ 锁 1（makeWishDragon eRet 2，无许愿→奖品映射）。D 轮 |
| 第18批 C18 | 侠客令/GFUI 礼包 | 完成：已实现 5（getGrowupData、getBigGrowupData、ReceiveAward、ReceiveBigAward、buyBigGiftTime 扣 980 元宝）+ 展示-only 1（buyGiftTime eRet 2，payData 链永不转换）。A 轮 |
| 第19批 C19 | 技能皮肤商店 | 完成：双商店 7 键全做（type1 卖道具 / type2 直售皮肤）+ LoadGame 回放。早期回执 |
| 第20批 C20 | 钓鱼 | 部分完成：已实现 4（START_FISHING BEGIN、END_FISHING END、CHECK_HIRE 查询、CHECK_FISHING_REWARDS 0 产出成功）+ 锁 1（HIRE_NPC eRet 2）。B 轮 |
| 第21批 C21 | 制装/制药 | 完成：已实现 5（BEGIN/END 制装、BEGIN/END 制药、CHECK_LIVE 查询）+ 计时队列操作 STOP_BREAK_LIST 维持。B 轮 |
| 第22批 C22 | 万圣宝藏楼层 | 部分完成：楼层只读、进层、金条 live 已实现；锁 2（GET_TREASURE_AWARD、BUY_ACTIVITY_NUM）；同面板 3 键复用 C01；C22 冒烟 ALL PASS。v3.1 半批收口 + A 轮跳过确认 |
| 第23批 C23 | HLEX 兑换 | 部分完成：已实现 1（getChangeShop）+ 诚实空态 2 + 锁 1（exchangeHlexchangeItem eRet 2）。A 轮 |
| 第24批 C24 | 备战营 | 完成：成功 7（支援/入营旗标写、submitJigsawPrePareItem 真扣、flipCard 读存档、师徒奖励空 []），无锁仓。D 轮 |
| 第25批 C25 | 招募码 | 部分完成：成功 1（getRecuit 诚实空 {}）+ 锁 3（binding/create/receiveBinding eRet 2，跨玩家无核验方）。D 轮 |
| 第26批 C26 | 大额外 | 部分完成：查询 1（CHECK_LARGE_EXTRA）+ 锁 2（GET_LARGE_EXTRA、DICE_CHECKEXTRA_EVENT eRet 2）。B 轮 |
| 第27批 C27 | 轮回 | 部分完成：拒绝 5（cycleLife/specialCycleLife eRet 9、isCycleLife/BuyHouseShop/getSpecialAward eRet 2），存档不动。C 轮 |
| 第28批 C28 | 副本扫荡 | 部分完成：已实现 3（ENTER_DUNGEON 入场、GET_DUNGEON_INFO 查询、END_DUNGEON_ADVENTURE END）+ 锁 1（SWEEP_DUNGEON eRet 2）。B 轮 |
| 第29批 C29 | 他人家园 | 部分完成：成功 2（findOHomes 空 homeArr []、findOhter 空 findArr []）+ 锁 1（recommendOHomes eRet 2，跨玩家）。E 轮 |
| 第30批 C30 | 时装/背包商店 | 完成：已实现 3（getFasionShop、getBackShop 只读；wearFasion 状态写，仅穿已拥有）。A 轮 |
| 第31批 C31 | 创建/重置角色 | 部分完成：成功 1（getCreateRoleActivity 读 createTime）+ 模板原值 1（getCRAInfo 实测 eRet 2）+ 锁 1（resetRole 破坏性 eRet 2）。C 轮 |
| 第32批 C32 | 炼炉 | 部分完成：已实现 2（START_REFINING_FURNACE BEGIN、GET_FURNACE_DATA 查询）+ 锁 1（PUT_REFINING_ITEM_FURNACE eRet 2）。B 轮 |
| 第33批 C33 | 技巧兑换 | 部分完成：成功 2（空兑换店 + 空店刷新）+ 锁 1（skillTrickExchangeIndex 无表 eRet 2）。C 轮 |
| 第34批 C34 | 武林 PK | 部分完成：成功 1（getwulinArenaData 诚实空 arenaData []、rank 0）+ 锁 5（报名/入场/掉落/上传全部 eRet 2，不进匹配、不发掉落）。E 轮 |
| 第35批 C35 | 突破队列 | 永久锁：锁 2（addBreakQueue、removeBreakQueue eRet 2，单价与队列 schema 未证，R7 维持）。C 轮 |
| 第36批 C36 | 装备锁定 | 完成：成功 2（addEquipLock、delEquipLock 存档标志写，无 id 拒绝）。C 轮 |
| 第37批 C37 | 周年肉鸽 | 部分完成：成功 1（chooseAnniversaryPassRg 写 choice）+ 锁 1（startAnniversaryPassRg eRet 2，依赖 B49 肉鸽引擎未建）。D 轮 |
| 第38批 C38 | 批量突破 | 永久锁：锁 2（beginHookBreakList、onBatchBreakByGold eRet 2；R7 单次版本身锁仓，无物可循环）。C 轮 |
| 第39批 C39 | 铸造 | 完成：已实现 2（BEGINCAST BEGIN、END_CAST END）。B 轮 |
| 第40批 C40 | 救 NPC | 完成：已实现 2（BEGINSAVE_NPC BEGIN、END_SAVE_NPC END）。B 轮 |
| 第41批 C41 | 子女游戏 | 完成：已实现 2（BEGIN_PLAY_GAME BEGIN、END_PLAY_GAME END）。B 轮 |
| 第42批 C42 | 秘籍礼包 | 部分完成：只读 1（getCopyBookData）+ 锁 2（buyCopyBookGift、receiveCopyBookGiftAward eRet 2）。A 轮 |
| 第43批 C43 | 春节常驻礼包 | 部分完成：只读 2 + 诚实空态 1（getSpringGiftPermanent）+ 锁 1（buySpringGiftPermanent eRet 2，疑似 RMB 起源 + 币种不明，不折元宝）。A 轮 |
| 第44批 C44 | 道具选奖 | 部分完成：诚实空态 1（getUsedItemAward）+ 锁 1（chooseUsedItemAward eRet 2）。A 轮 |
| 第45批 C45 | 门派帖子 | 部分完成：成功 1（GetSchoolReview 诚实空 reviewList []、maxPage 0）+ 锁 1（ReqReview eRet 2，本地不留假帖子）。E 轮 |
| 第46批 C46 | 骰子地块买卖 | 完成：已实现 2（diceBuyPlaceGoods、diceSellPlaceGoods，卖 = 买×0.5 下取整，净恒负；SHRINK_OK 修后卖最后一件落盘正确）。A 轮 + ISSUE-16 |
| 第47批 C47 | 双修 | 部分完成：查询 1（CHECK_BREAK 只读）+ 锁 2（USER_DOUBLE_TRAINING、END_DOUBLE_TRAINING eRet 2；BEGIN 伴侣数据来源未证、END 为结算型，R4 不适用）。B 轮 |
| 第48批 C48 | 吃席 | 完成：已实现 2（START_EAT_BY_TABLE BEGIN、END_EAT_BY_TABLE END）。B 轮 |
| 第49批 C49 | 肉鸽探索 | 完成：已实现 2（START_ROGUE_EXPLORE BEGIN、END_ROGUE_EXPLORE END）。B 轮 |
| 第50批 C50 | 进入他人家园 | 部分完成：成功 1（getHomeList 本家闭环 C10）+ 锁 1（getFriendHomeList eRet 2，stealCrop 仍锁）+ 斗狗 4 键全锁（ISSUE-14）。E 轮 |
| 第51批 C51 | 装备升级 | 永久锁：锁 2（EquipSuitsUpgrade、equipUpgrade eRet 2，升级花费映射未证，维持裁定）。C 轮 |
| 第52批 C52 | 春节兑换商店 | 部分完成：诚实空态 1（getSpringExchangeShop）+ 锁 1（exchangeSpringShop eRet 2）。A 轮 |
| 第53批 C53 | 高级任务提示 | 完成：成功 3（get/setAdvancedTasksTip 存档写、getAdvancedTasksData 诚实空）。C 轮 |
| 第54批 C54 | 活动列表 | 部分完成：成功 3（三件套：activityList [] 且付费 tab 关、dataArr 18×0、taskObj {}）+ 锁 1（getSevenTaskAward eRet 2，七日进度为空）。D 轮 |
| 第55批 C55 | 好友 | 完成：成功 3（GetOnHookFriendLis 诚实空、FriendList 诚实空、setChatRedData 仅显示 eRet 1 且无存档写）。E 轮 |
| 第56批 C56 | 自定义 AI | 完成：成功 2（get/setChatPkAiSet 存档 customAI 读/写）。C 轮 + ISSUE-16 |
| 第57批 C57 | 平台 openid | 完成：成功 3（getDouYinOpenID openid 0、getWxXyxOpenID openid 0 / session_key 0、GetServerList 模板回放有区服无玩家数据）。E 轮 |
| 第58批 C58 | GM 赠送 | 部分完成：成功 1（getGMGiveItemList 空 []，不公示可领物）+ 永久锁 1（GetGMGiveItem eRet 2，无成本/进度/上限表，任务书明令永久锁）。D 轮 |
| 第59批 C59 | 消费返利 | 部分完成：只读 1（getGoldConsumedRewardData）+ 锁 1（receiveGoldConsumedReward eRet 2）。A 轮 |
| 第60批 C60 | 家园/塔商店 | 完成（空态）：诚实空态 2（GetHouseShopData、GetTowerSpecialShop），无表无价。A 轮 |
| 第61批 C61 | 拼图 | 完成：成功 2（getjigsawData/getjigsawTaskData 读存档）。D 轮 |
| 第62批 C62 | MA 活动 | 部分完成：成功 2（getMAActivity 读存档、getCRLActivityData 诚实空 {}）+ 锁 1（rewardMAActivity eRet 2，CRL 进度源未闭合）。D 轮 |
| 第63批 C63 | 绝技 | 完成：成功 2（getMultiPVESkill、getTeamSkill 诚实空 dataArr []，不造多人数据）。C 轮 |
| 第64批 C64 | 堆叠游戏 | 部分完成：成功 4（getPileGameData 读存档、getActivity 裸 eRet 1、getActivityAward eRet 1 + rewardArray {} 产出 0、getActivityRank 空 []）+ 锁 1（pileGameAward eRet 2，自报分数）。D 轮 |
| 第65批 C65 | 祈福签到 | 完成：成功 4（R6：getPraySignActive 回 claimedToday、getOpenActive 读存档、getSignAward/getPraySignAward 共享按天账本 signClaim，首领 12589×1、同日再领 eRet 2、签到↔祈福互斥同日）。D 轮 |
| 第66批 C66 | 组队 | 完成：成功 2（getTeamFighterInfo、getFighterInfo 诚实空 battleID ''、info []，不建队、不起战斗）。E 轮 |
| 第67批 C67 | 种树 | 完成：成功 2（getTreePlanting 读存档、plantTree 首种写 day/count=1/beginTime，同日第 2 次 eRet 2，每日上限 1）。D 轮 |
| 第68批 C68 | 金币突破 | 部分完成：成功 1（getHookBreakList 读 breakQueue）+ 锁 2（goldBreakAllSkill、goldBreakCurrentSkill eRet 2，单技能金价未证）。C 轮 |
| 第69批 C69 | 琅嬛复活 | 永久锁：锁 2（revive、reviveMulti eRet 2；不以形状默认 99999 作复活价，不免费复活）。E 轮 |
| 第70批 C70 | 师徒传功 | 永久锁：锁 2（masterPassMerit、pupilPassMeritReward eRet 2；不转移对方传功值、不发奖）。E 轮 |
| 第71批 C71 | 装备仓库 | 完成：成功 2（PushEquip、PopEquip 仓库移动，容量 50，已装备/未持有/未入库拒绝；push→pop 往返净 0、总量守恒）。C 轮 |
| 第72批 C72 | 点灯 | 永久锁：锁 2（RANDOM_LIGHT_CELL、SPECIFY_LIGHT_CELL eRet 2，点灯规则/奖励表链接未证）。B 轮 |
| 第73批 C73 | 穴位 | 永久锁：锁 2（restVein、upgradeVein eRet 2，缺成本列、退还规则未映射）。C 轮 |
| 第74批 C74 | 盗贼交易/肉鸽商店 | 完成：已实现 2（rogueBuyStore、rogueSellStore，局内肉鸽币，卖 = 买×0.5，净恒负，主钱包不动）。A 轮 |
| 第75批 C75 | 排序 | 完成：成功 2（setPlayerItemSort、setPlayerSkillSort 存档写，无参默认 0）。C 轮 |
| 第76批 C76 | 排行榜 | 部分完成：成功 3（rankList eRet 1 + CDTime 0 不带榜单、boosRankList 伤害榜 []、checkUploadAttackDamge 本档零值不据此发奖）+ 锁 1（GetBossAward eRet 2）。E 轮 |

- 76 批计数核对：早期 17（第 1–16 批 + 第 19 批）+ A 轮 12（18、22、23、30、42、43、44、46、52、59、60、74）+ B 轮 12（20、21、26、28、32、39、40、41、47、48、49、72）+ C 轮 14（27、31、33、35、36、38、51、53、56、63、68、71、73、75）+ D 轮 11（17、24、25、37、54、58、61、62、64、65、67）+ E 轮 10（29、34、45、50、55、57、66、69、70、76）= 76，无“未处理”。
- 计数口径说明：上表批号 = v2.7.1 relations 第 N 批；括号内 C 号为同一来源的簇号（第 1–16 批与第 19 批的 C 号与批号不完全同序，见 relations 批名表，属来源原样，不另编排）。

## 2. 透传最终剩余数：306（P7 实测重算，与 P5/P6 起点一致，无变化）

- 重算：H=641，形状=382，H−形状=306（`final/rounds/P7/gates/passthrough.log`，exit 0）。
- 构成（重算分类，与 P5 分组口径互斥统计）：守卫锁仓 98 + 诚实空态 116 + 纯展示 48 + 已实现写档 35 + 单码拒绝 9 = 306。
- 保留原因总述（一句）：守卫 98 个全部不补形状（锁仓桩/维护通道/扁平动作，锁仓即不发奖不写档）；诚实空态 116 个只回 eRet 1、无数据、无写档；纯展示 48 个只回存档已有状态或静态/模板值；单码拒绝 9 个（FindFriendByID eRet 0、ReceiveAward/ReceiveBigAward/receiveAchievementReward eRet 4、changeSkillKnack/rgChangeSkillKnack eRet 2、cycleLife/specialCycleLife eRet 9、diceBattleResult eRet 0）均不发奖不写档；已实现写档 35 个是既有实现（非 P7 新开），其行为由六门（lint 待查 0、验收 57/57）与各轮冒烟覆盖，不属新开风险——其中买/卖类见 §7 核账，签到类见日限，喂狗/摸奖类见 §6。
- 已实现写档 35 个名单：BuyAcitivityShop、OutPrison、UnloadingEuipment、UseDebris、beginDragonRollDice、buyEjectGift、buyFormula、buyGoodAndEvilShopItem、buySpecialShopItem、buyTicket、chooseAnniversaryPassRg、diceBuyPlaceGoods、diceSellPlaceGoods、getAchieveData、getPraySignAward、getSignAward、joinSchoolPrePareCamp、joinSchoolSupportPrePareCamp、knackLottery、plantTree、receiveAchieveRateReward、receiveAchieveReward、receiveAchieveSuitReward、receiveHelperReward、rgShopByItem、rgUseItem、rogueBuyStore、rogueSellStore、setAdvancedTasksTip、setPlayerItemSort、setPlayerSkillSort、submitJigsawPrePareItem、tendingTrees、useCard、useTreasure。
- P5 剩余 306 为起点，P6 后无变化，P7 实测仍为 306；“只剩确认无害的读档/纯展示类”的目标达成情况如上：164 个（116 + 48）确为读档/纯展示/空态，98 个为锁仓守卫，9 个为单码拒绝，35 个为既有已实现写档（已列出，不隐藏）。

## 3. 六门全绿（P7 最后一次完整重跑，顺序与任务一致，日志 final/rounds/P7/gates/）

| 门 | 结果 |
|---|---|
| gen_shapes --stat | PASS，382 动作 / 1130 字段（exit 0） |
| build-handlers | PASS，HANDLERS OK ver=hf5d89bf7 selfCheck=1514 bytes=1814791（exit 0；产物仅 built= 时间戳一行变化，已还原回 pre-P7 快照，终版 SHA 与起点一致；FLOW OK bytes=2747） |
| 形状冻结 --diff | PASS，diff 总数 = 0（exit 0；无基线变动，故无 planned-changes、无 --freeze 调用，不是裸 --freeze） |
| 形状冻结正式校验 | PASS，C1–C8、C10–C13 全部通过（exit 0；C9b 未实现为既有状态） |
| 拒绝码 | PASS，REJECT-CODES OK 动作=268 条目=285 拒绝点=391（exit 0） |
| 验收 | PASS，ACCEPTANCE OK 项=57 绿=57 已知红=0 cap=0（exit 0；53 测试 + 4 检查器，含 lint_freebie） |
| lint_freebie | PASS，发放型 44，OK 42，待查 0，白名单恰好 2（passCardAward、useItem）（exit 0；freebie_allow.json 未动；显式核心路径调用，见 P6 同款调用方式说明） |

## 4. 全量冒烟全绿（P7 重跑，日志 final/rounds/P7/gates/）

| 冒烟 | 结果 |
|---|---|
| A 轮 smoke-a-live.js | 130 pass，0 fail，32 keys |
| B 轮 smoke-b-live.js | 225 pass，0 fail，36 keys |
| C 轮 roundC-smoke.js | 124 pass，0 fail，35 keys |
| D 轮 roundD-smoke.js | 205 pass，0 fail（D17 32、D24 32、D25 19、D37 7、D54 20、D58 7、D61 14、D62 14、D64 24、D65 20、D67 16） |
| E 轮 roundE-smoke.js | 187 pass，0 fail（含 E-GLOBAL 13/13） |
| P5 round16-2-smoke.js | 411 pass，0 fail |
| P6 roundP6-smoke.js | 228 pass，0 fail |
| F165 live | 796 pass，0 fail |
| 合并 merged | 49 pass，0 fail |
| C22 live | ALL PASS |
| c13 扩展（c14 11 条） | exit 0，全部通过 |
| SHRINK_OK | 6 pass，0 fail |
| A/B 金标版（veronly） | 6 pass，0 fail（金标已为 hf5d89bf7） |

## 5. 存档往返（P7 脚本 final/rounds/P7/roundP7-roundtrip.js，日志 gates/roundtrip.log）

- 0205 / 0232 / 0250 三份快照 + 新建空档 + 真实存档副本（第 5 档，树内 runtime-save 副本 SHA 018d6afdf…），各跑“加载 → 固定种子伪随机抽 50 个已实现动作 → 存档 → 再加载”：**5 档全部 PASS**（每档 actions ok=50 threw=0 checks 8/8：JSON.parse、saveVersion=4、roleID=16374、钱包字段不为负、bag 无负数、再加载 JSON.parse、再加载 saveVersion=4、再加载 roleID=16374）。
- 真实存档本身未被 P7 写入：跑后 SHA 仍 `018d6afdf713863cc9b40eef0181632ad9fa2d55a6cb084c25ded3743722eb47`，与跑前一致。

## 6. 白拿复查（lint 发放型 44 个全列，闸 = lint 判定：cost=真扣，ledger=一次性/日限/上限记账；日志 gates/lint-all.log，--all 全量输出）

| handler | 闸 | handler | 闸 |
|---|---|---|---|
| getSignAward | 记账（日限 signClaim） | getPraySignAward | 记账（日限 signClaim，与签到互斥） |
| submitJigsawPrePareItem | 真扣（交物即扣背包） | diceSellPlaceGoods | 真扣（卖货扣包 + 购买记录清） |
| diceBuyPlaceGoods | 真扣 + 记账（扣元宝 + 购买记录） | getFinishTaskAward | 记账 |
| passCardAward | 白名单 FLAG（通行证档位：passAward>=4 判已领 + 活跃度门槛，C01 已审） | useItem | 白名单 TRUST（先扣背包再按表发，p.itemID 只查表，C05 已审） |
| saleItem | 真扣 | buyShopItem | 真扣 |
| buySpecialShopItem | 真扣 | BuyAcitivityShop | 真扣 |
| exchangeItem | 真扣 | buyGoodAndEvilShopItem | 真扣 |
| buySchoolShop | 真扣 | BuyMarketItem | 真扣 |
| buyEjectGift | 真扣 | rgShopByItem | 真扣 |
| QuickBuyItem | 真扣 | bzBackfillRewards | 记账（维护通道，命令-only，写前备份；无客户端发送点） |
| UseAllBall | 真扣 | getSnowAward | 真扣 |
| useItemAddition | 真扣 | circleTaskAward | 记账 |
| getCircleTaskAward | 记账 | quickFinishTask | 真扣 + 记账 |
| getRogueFinishTaskAward | 记账 | GetRandomEventAward | 记账 |
| receiveAchieveReward | 记账（分发层默认 eRet 4，见 §1 第 5 批） | receiveAchieveRateReward | 记账（分发层默认 eRet 4） |
| receiveAchieveSuitReward | 记账（分发层默认 eRet 4） | makeLove | 记账 |
| receiveAnniversaryPassAward | 记账 | buyAnniversaryPassGift | 真扣 + 记账 |
| receiveAnniversaryPassTaskReward | 记账 | dispatchAward | 记账 |
| getUFOCatcherData | 记账 | rewardUFO | 真扣（扣爪；WARN：资格判断用到 p.signCode，已人工确认仅验存在非档位/身份/胜负） |
| returnSevenDaysAwards | 记账 | buySkillSkinShop | 真扣 |
| obtainCrop | 真扣 | onKeyObtainCrop | 真扣 |
| BuyHomeCrop | 真扣 | ChooseSanGongDan | 真扣（投资返还并清零） |

- 核对：44 = OK 42 + 白名单 2，待查 0，无漏列；无表拒的发放键不在此 44 内——它们已被锁（eRet 2）或分发拦截（eRet 4），不发奖，故不进发放型统计（见各轮锁仓表）。

## 7. 核账总表（所有买卖/兑换环路无净赚；卖 = 买×0.5 上限，逐环路数字）

| 环路 | 买→卖/换→换回数字 | 净额 |
|---|---|---|
| C46 骰子地块（元宝） | 行 1：买 19（货 7504×1）→ 卖 floor(19×0.5)=9；行 3：买 355 → 卖 177；行 10：买 622 → 卖 311；16 行全部 floor(p/2)−p < 0；表内 sell_price 列弃用不读（其值高于买价） | −10 / −178 / −311，恒负 |
| C74 肉鸽商店（局内肉鸽币，主钱包不动） | 行 1：买 730（货 3110×2）→ 卖 floor(730×0.5)=365；每包 floor(p/2)−p < 0；无购买记录或无 rogueBag 整包库存卖回 eRet 2 | −365，恒负 |
| C01 商店交易（通用买/卖） | 买后卖回同样只退 floor(已购价×0.5)，须购买记录 + 背包有货；无记录套现 eRet 2 | 恒负 |
| C71 装备仓库（非买卖） | push→pop 往返：背包 5→3→5、仓库 0→2→0，总量守恒 5，钱包全程不动 | 0，无复制 |
| C24 备战营提交（非买卖） | 提交 2 件：背包 1001 5→3、进度 +2、货币不动；提交物只变进度，不产生可再卖资产 | 0 |
| C18 侠客令大礼包 | buyBigGiftTime 单向解锁 980 元宝，无卖回路径；buyGiftTime 展示-only 不卖 | 0（无环路） |
| 其余全部买/换/领奖键（C22、C23、C42、C43、C44、C52、C59、C60、B 轮花费键、D/E 锁仓领奖键） | 全部锁仓（eRet 2）或诚实空/拦截（eRet 4），扣与产均为 0，无环路可算 | 0 |

- 结论：无一环路净额 > 0；无 payData 链新动作，无 ¥1=10 换算新项（¥1=10 仅为既有独立购买换算口径，本轮无新增）。

## 8. ISSUE 总表（每条都是“已关闭”，绝无待定；基数为 P6 checkpoint §6 总表，P7 复核一次）

| ISSUE | 结局 | 一句原因 |
|---|---|---|
| ISSUE-8（因果/精炼/养育/性别、妻子培养、青楼、装备分解/心法合成） | 已关闭（永久锁） | 善恶 C07 11 键、洗练/寄养/妻子/青楼/好感 11 键、分解/合成 4 键活树均已锁（eRet 2），模型/产物表缺失，强行解锁即编造数据；“因果”在树内无独立 handler，由 C07 善恶锁覆盖 |
| ISSUE-10（好友家园、偷菜） | 已关闭（永久锁） | getFriendHomeList、stealCrop 均 eRet 2 且存档不变，他人家园数据不在本地存档；本家事件 2 键已实现验证 |
| ISSUE-11（活动来源、任务 dv、周年语义、真机视觉） | 已关闭（永久锁） | 通行证已实现路径全验；剩余债务无法本机闭合（玩法事件活跃度来源无埋点累计、真机视觉无真机可验），以冒烟断言为准，不再追 |
| ISSUE-12（管家评价、真实派遣任务链、UI 可达性） | 已关闭（永久锁） | 门派评价诚实空与单派遣闭环全验；剩余债务无法本机闭合（多任务链结算无表、UI 可达性属客户端侧不在离线核心范围），不再追 |
| ISSUE-13（UFO signCode 真校验、奖池一致性、游戏币任务链、商店/活动获取路线） | 已关闭（永久锁） | UFO 全序列已验；剩余债务无法本机闭合（signCode 真校验需服务端密钥、游戏币任务链与爪子商店/活动获取路线在树内无表），不再追 |
| ISSUE-14（斗狗/多人战斗 4 键） | 已关闭（永久锁） | E 轮结论复核无改动：PVP、多人回放、PVE（NPC 狗对手属性表缺失，444 表 + NPC 表 0 命中）、伙伴 2 键全部 eRet 2 且存档不变，不造对手数据 |
| ISSUE-15（C15 其他七日签到集、春节活动键、真实任务完成条件） | 已关闭（永久锁） | 回归七日已实现路径全验；另一套七日签到与新春 3 键在 facts 中 handlers 均为空，真实任务完成条件离线无埋点，不再追 |
| ISSUE-17（todo_shapes 重建版、known-red 置换、bz-bootstrap 真身、约 400 张 dump 表置换） | 已关闭（永久锁/不再追） | 门禁读到的项均正常（todo_shapes 60 条、bz-bootstrap 真身在 hook、known-red [] 且验收 cap=0）；门禁不读的项（cap/history 内容互换、约 400 张 dump 表名实互换）经核六门脚本均不读，改动将危及 guardHash，故不碰文件、不再追 |
| ISSUE-16-2-EV（B58 形状冻结证据扩展） | 已关闭（永久关闭） | B58 仍 58/58 PARTIAL、FULL 0，缺失叶不在 field-classes 356 字段中，证据层本身缺失；按任务书口径不改冻结工具、不硬冻，B58 保持透传（见 §2），不写成待定 |
| B 轮锁仓 9 键 | 已关闭（永久锁） | hireNpcOnhook、getLargeExtra、diceCheckLargeExtra、sweepCopy、putSpringRefiningItem、doubleTraining、endDoubleTraining、randomLightCell、specifyLightCell 全部复核仍 eRet 2 且存档不变 |
| ISSUE-16 第一轮（317 透传补形状） | 已关闭（做掉） | 形状 371/1105 → 382/1130（+11 动作，+25 字段），check_shapes.js 退役，剩余 306 见 §2 |
| ISSUE-LINT（各轮） | 已关闭（无新增） | P7 lint 待查 0，各轮均无免费发放新增、无锁仓新增 |
| ISSUE-REG（各轮） | 已关闭（无） | 无验收回归、无整批回滚触发；基线与终版验收均为 57/57 |
| 47 vs 189 形状-only 口径差 | 已关闭（不再追） | 按上游路线答复：无下游文件，继续按 47，下游 189 记为其本地口径差，不再出逐项对照表 |

## 9. ★ 清单：0 项

- P7 未新定任何价格/奖励/时长值，无 10 倍口径触发。
- 各轮 ★ 汇总：A 轮 0、B 轮 0、C 轮 0、D 轮 0、E 轮 0、P5 0、P6 0、P7 0；C18 旧 ★2 已按上游路线答复关闭为展示-only（不是新定值），不计入 ★。
- P7 冒烟/往返中出现的数值（活跃 10 gold/点、刷新 100 元宝、派遣 30 分钟、骰子买 19 卖 9 等）均为活树既有表/既有代码值，非 P7 新定，只作验证断言。

## 10. 计数外附录（每键一行，状态 + 原因；不进 76 批计数）

| 键 | 状态 + 原因 |
|---|---|
| C43 面板可选 3 键（点火/领挑战类） | 未动：分类轮即注明未 grep 映射，活树无映射证据；不进 C43 计数 |
| C60 HOUSE_SPECIAL（User.houseSpecial） | 活树无 handler：活树核心 grep 0 命中，该名仅出现在 2026-10-22 旧备份文件中；若日后要做须先确认键映射与效果证据 |
| B 轮面板可选 BUY_DG_CHALLENGE（C28） | 未动：分类轮 must=false 排除在 B 轮分类外，未清点、未分类，需另行分类才可做 |
| B 轮面板可选 KILL_NPC（C40） | 未动：分类轮已排除，未清点，需另行分类 |
| B 轮面板可选 REQ_DOUBLE_BR（C47） | 未动：分类轮已排除，未清点，需另行分类 |
| B 轮面板可选 USER_ONHOOK_BREAK（C47） | 未动：分类轮已排除，未清点，需另行分类 |
| C53 面板可选 RECEIVE_ADVANCED_TASK | 未动：无奖励表，实施时须先锁（C 轮 checkpoint §7） |
| C53 面板可选 RECEIVE_ADVANCED_TASK_REWARD | 未动：无奖励表，实施时须先锁（C 轮 checkpoint §7） |
| C71 面板可选 UPGRADE_BED | 未动：分类轮递延，C 轮未动 |
| C71 面板可选 UPGRADE_STORAGE | 未动：分类轮递延，C 轮未动 |
| C73 面板可选 ROGUE_EQUIP_WEAPON | 未动：分类轮递延，不属 C73 order+must，C 轮未动 |
| C73 面板可选 CHANGE_NAME | 未动：分类轮递延，C 轮未动 |
| C73 面板可选 EQUIP_TITLE | 未动：分类轮递延，C 轮未动 |
| D17 可选 ExChangeJetton | dispatch 拦截 eRet 4：handler 体只读回 curGold/curJetton/chipTimes，不执行兑换 |
| D17 可选 bringSpecialAward | 锁 eRet 2（noTable） |
| D25 可选 receiveRecuitAward | 锁 eRet 2（crossPlayer） |
| D54 可选 receiveAccRechargAward | 锁 eRet 2（payData 类，永不实现为发奖，响应无 payData/order 字段） |
| D61 可选 receiveJigsawAward | 锁 eRet 2（noTable） |
| D61 可选 receiveJigsawTaskAward | 锁 eRet 2（noTable） |
| D62 可选 submitNumMA | 锁 eRet 2（unverifiableProgress） |
| D64 可选 smallGameAward | 锁 eRet 2（selfReportedScore） |
| D67 可选 tendingTrees | 成功：tending+1、tendingTime 写，不发奖 |
| D67 可选 treesReceiveReward | 锁 eRet 2（noTable） |
| E29 面板可选 HOME_SPECIAL_AWARD（homeSpeicalAward） | 锁 eRet 2（已锁） |
| E50 面板可选 RECLAIM_LAND | 活树无 handler（getHomeList 注释称本批全部预开垦） |
| E55 面板可选 FINS_FRIENDID | 未动：E 轮未核 handler，不动 |
| E55 面板可选 SET_PLAYER_CARD_* | 未动：E 轮未核 handler，不动 |
| E55 面板可选 USER_ANSWERFRIEND | 未动：E 轮未核 handler，不动 |
| E55 面板可选 USER_APPLAYFRIEND | 未动：E 轮未核 handler，不动 |
| E55 面板可选 USER_FIND_FRIEND | 未动：E 轮未核 handler，不动 |
| E55 面板可选 USER_FRIENDREGISTER | 未动：E 轮未核 handler，不动 |
| E55 面板可选 USER_FRIEND_DELETE | 未动：E 轮未核 handler，不动 |
| E76 面板可选 FIGHT_WORLD_BOSS（enterWoldBossBattle） | 已实现旧段（与 E 轮无关），不进 E 轮计数 |

## 11. 需用户补交的文件清单：无

- 按 P6 结论：门禁读到的项均正常，门禁不读的项不再追。
- P7 实测：六门全部正常跑通（gen / build / freeze / reject / acceptance / lint 均 exit 0），无新的门禁必读缺文件；故本项写“无”，无需替代检查。

## 交付包

- 路径：`final/下游交付-FINAL.zip`（只交 zip，不推仓库）
- 内含：本回执（FINAL-RECEIPT.md）、FINAL 指纹与六门/冒烟/往返原文日志（final/rounds/P7/gates/）、76 批表与 §2–§11 各表（见本回执）、★清单（§9）、ISSUE 总表（§8）、各轮 checkpoint 原样（final/docs/*.md：checkpoint-C、checkpoint-D、checkpoint-E、checkpoint-16-2、checkpoint-P6，另附 A/B/ISSUE-16 回执摘要见 §1 来源列）、产物 patch/live/handlers.js 与 patch/live/flow.js 及 SHA256SUMS、安装说明（见下）、需用户补交文件清单（§11：无）。

## 给用户的本机安装说明（摘要，完整版见交付包内 INSTALL.md）

1. 备份 live 目录到 `_backup\<日期>-pre-FINAL\`。
2. 替换 handlers.js 与 flow.js。
3. `cd F:\BaoZouyxt\hotfix-patch; .\run.ps1 handlers`（pid 不变即热载成功）。
4. `.\run.ps1 cmd "ver"` 显示 impl= 应等于 FINAL ver（hf5d89bf7）。
5. 10 分钟试玩清单：签到首领 → 同日再领应拒绝；骰子买 19 → 卖回 9；肉鸽商店买 → 卖回半价；装备仓库 push → pop 往返；种树首种 → 同日再种应拒绝；成就面板读取；商店货架读取；退出重进存档无丢失。
6. 回滚：把 `_backup\<日期>-pre-FINAL\` 里的 handlers.js 与 flow.js 拷回，再跑一次 `.\run.ps1 handlers`。
