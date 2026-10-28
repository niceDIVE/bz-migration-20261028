# D 轮检查点 checkpoint-D.md（v4.0 终局 P3，不发上游）

- 起点：hf5d89bf7（核心 f4bf2827…，产物 40d2ca24…，形状 382/1130，验收 57/57，F165 796/0）
- 终版：hf5d89bf7，维持不变（无产品代码改动）
- 终版核心 SHA256：`f4bf282782b4ee6e691059e97c2e313c3a827581628c6f7d77c5648e3c4eec71`
- 终版产物 SHA256：`40d2ca2447d44f779a424e57020dd8326f56db6c0a5f83ff47e96d99d7a8191c`
- 终版 ver：hf5d89bf7，selfCheck=1514，bytes=1814791
- 顺序：17、24、25、37、54、58（永久锁）、61、62、64、65、67（轮内顺序自定）
- 总账：必做 42 键 = 成功 33、锁仓 9（eRet 2 计 9）；面板可选 10 键 = 成功 1、锁仓 8（eRet 2）、
  dispatch 拦截 1（eRet 4）；产品代码改动 0
- 清点：final/rounds/D/work/inventory-D.md；冒烟：final/rounds/D/roundD-smoke.js；
  往返：final/rounds/D/roundD-roundtrip.js；门日志：final/rounds/D/gates/
- 快照：final/rounds/D/snapshots/pre-d/（核心、产物、旧核心，SHA 在同目录 SHA256SUMS.txt）
- 交付方式：zip 交付用户（v4.0 补充答复第 1 条；本轮不向仓库推任何东西）

## §1 每批一行

| 批 | 结果一行 |
|---|---|
| D17 龙 | 成功 6（getDragon 读存档、callDragon 置召唤旗标、beginDragonRollDice/BeginRollDice 置会话旗标、rollDice 只回骰值、checkSpecial 读存档）+ 锁仓 1（makeWishDragon eRet 2，无许愿→奖品映射）；可选：ExChangeJetton dispatch 拦截 eRet 4（handler 体只读，不执行兑换）、bringSpecialAward eRet 2。冒烟 32/0。 |
| D24 备战营 | 成功 7（支援/入营旗标写、submitJigsawPrePareItem 真扣：背包 1001 5→3、进度 +2、无参/不足 eRet 2、flipCard 读存档、师徒奖励空 []）；无锁仓。冒烟 32/0。 |
| D25 招募码 | 成功 1（getRecuit 诚实空 {}）+ 锁仓 3（binding/create/receiveBinding eRet 2，跨玩家无核验方）；可选 receiveRecuitAward eRet 2。冒烟 19/0。 |
| D37 周年肉鸽 | 成功 1（chooseAnniversaryPassRg 写 choice）+ 锁仓 1（startAnniversaryPassRg eRet 2，依赖 B49 肉鸽引擎未建）。冒烟 7/0。 |
| D54 活动列表 | 成功 3（三件套：activityList [] 且付费 tab 关、dataArr 18×0、taskObj {}）+ 锁仓 1（getSevenTaskAward eRet 2，七日进度为空）；可选 receiveAccRechargAward eRet 2（payData 类，永不实现为发奖，响应无 payData/order 字段）。冒烟 20/0。 |
| D58 GM 赠送 | 成功 1（getGMGiveItemList 空 []，不公示可领物）+ 永久锁 1（GetGMGiveItem eRet 2，无成本/进度/上限表；本轮任务书明令永久锁，不做、不解锁）。冒烟 7/0。 |
| D61 拼图 | 成功 2（getjigsawData/getjigsawTaskData 读存档）；可选 receiveJigsawAward/receiveJigsawTaskAward eRet 2（无表）。冒烟 14/0。 |
| D62 MA 活动 | 成功 2（getMAActivity 读存档、getCRLActivityData 诚实空 {}）+ 锁仓 1（rewardMAActivity eRet 2，CRL 进度源未闭合）；可选 submitNumMA eRet 2。冒烟 14/0。 |
| D64 堆叠游戏 | 成功 4（getPileGameData 读存档、getActivity 裸 eRet 1、getActivityAward eRet 1 + rewardArray {} 产出 0、getActivityRank 空 []）+ 锁仓 1（pileGameAward eRet 2，自报分数）；可选 smallGameAward eRet 2。冒烟 24/0。 |
| D65 祈福签到 | 成功 4（R6：getPraySignActive 回 claimedToday、getOpenActive 读存档、getSignAward/getPraySignAward 共享按天账本 signClaim，首领 12589×1、同日再领 eRet 2、签到↔祈福互斥同日）。冒烟 20/0。 |
| D67 种树 | 成功 2（getTreePlanting 读存档、plantTree 首种写 day/count=1/beginTime，同日第 2 次 eRet 2，每日上限 1）；可选 tendingTrees 照料态 +1、treesReceiveReward eRet 2（无表）。冒烟 16/0。 |

## §2 六门终版（日志 final/rounds/D/gates/）

| 门 | 结果 |
|---|---|
| gen_shapes --stat | PASS，382 动作 / 1130 字段（exit 0，与起点一致，无形状变动） |
| build-handlers | PASS，HANDLERS OK ver=hf5d89bf7 selfCheck=1514 bytes=1814791（exit 0；产物仅 built= 时间戳一行不同，已还原回 pre-D 快照，终版 SHA 与起点一致） |
| 形状冻结 --diff | PASS，diff 总数 = 0（exit 0；无基线变动，故无 planned-changes、无 --freeze 调用，不是裸 --freeze） |
| 拒绝码 | PASS，REJECT-CODES OK 动作=268 条目=285 拒绝点=391（exit 0；证据组 136/153、运行时组 132/132，与起点一致） |
| 验收 | PASS，ACCEPTANCE OK 项=57 绿=57 已知红=0 cap=0（exit 0；53 测试 + 4 检查器，含 lint_freebie） |
| lint_freebie | PASS，发放型 44，OK 42，待查 0，白名单恰好 2（passCardAward、useItem）（exit 0；freebie_allow.json 未动） |

## §3 冒烟全量

| 冒烟 | 结果 |
|---|---|
| D 轮 roundD-smoke.js（52 键） | **205 pass，0 fail**（D17 32、D24 32、D25 19、D37 7、D54 20、D58 7、D61 14、D62 14、D64 24、D65 20、D67 16） |
| F165 live | **796 pass，0 fail**（基线不退） |
| C22 live | ALL PASS |
| merged（merge-v3/smoke-merged.js） | 49 pass，0 fail |
| A 轮 smoke-a-live.js | 130 pass，0 fail |
| B 轮 smoke-b-live.js | 225 pass，0 fail |
| C 轮 roundC-smoke.js | 124 pass，0 fail |
| SHRINK_OK（rc-v3.2/smoke-shrink.js） | 6 pass，0 fail |
| A/B live（原版） | 5 pass，1 fail——唯一失败是硬编码金标旧值 ha991283b（与 C 轮一致，属预期，非回归） |
| A/B live（金标版，veronly） | **6 pass，0 fail**（金标已为 hf5d89bf7） |
| c13 扩展（hotfix-patch/test/c13-smoke.js，输出 c14 11 条） | exit 0，全部通过 |

## §4 核账（本轮新开买卖/兑换）

- 本轮无新开买卖/兑换（产品代码改动 0）：唯一交换类是已实现的 D24 submitJigsawPrePareItem，
  断言提交 2 件：背包 1001 5→3（恰好减提交数）、prepareCamp.submitted 1001=2、progress=2、
  货币全程不动、响应无卖出/换回字段——提交物只变进度，不产生可再卖资产，净赚不可能。
- ExChangeJetton：dispatch 拦截 eRet 4，存档/钱包/背包/chip 全不动，未执行兑换，无核账项。
- 签到发放（非买卖）：首领 12589×1 入背包，货币不动，同日再领 eRet 2——单向发放、无买入、
  无卖出路径，不构成净赚；getActivityAward 产出 rewardArray {}（0），无净额。
- 锁仓的领奖键（makeWish、招募 3、start、sevenAward、GM、rewardMA、pileAward 及可选 8 项）
  全部 eRet 2（ExChangeJetton 为 eRet 4 拦截）且钱包/背包不动，扣与产均为 0，故无正净额项；
  无 payData 链新动作，无 ¥1=10 换算项（receiveAccRechargAward 只拒绝）。

## §5 存档往返（roundD-roundtrip.js，日志 gates/roundtrip-final.log）

- 0205 / 0232 / 0250 三份快照 + 新建空档，各跑“加载 → 50 个已实现动作（D 轮 35 成功键全在内）
  → 存档 → 再加载”：**4 档全部 PASS**（每档 actions ok=50 threw=0 checks 8/8：JSON.parse、
  saveVersion=4、roleID=16374、钱包字段不为负、bag 无负数、再加载成功）。
- 真实存档未动：SHA 仍 `018d6afdf713863cc9b40eef0181632ad9fa2d55a6cb084c25ded3743722eb47`，
  mtime 仍 2026-10-27；本轮全部测试均用内存/沙箱存档副本，未使用任何维护通道，
  无写坏、无回滚、无重建；known-red.json 仍 `[]`（验收运行按设计追加 history 一行，entries=0）。

## §6 ★ 清单、ISSUE 清单、未决项

- **★ 清单：0 项。** 本轮未新定任何价格/奖励/时长值；无 10 倍口径触发。
  分类轮 ★-D1（rollDice 只回骰值）、★-D3（可选领奖锁）活树已实现，与本轮断言一致，不算新 ★；
  分类轮 ★-D2（签到锁）已被活树 R6 实现取代（v3.0 合并 D:31 已有 12589×1，奖品非本轮新定），
  故不记 ★，只在清点中说明口径变更。
- **ISSUE-LINT：无新增。** C58 GM 赠送维持永久锁（既有锁仓，非本轮新挂）；lint 待查 0。
- **ISSUE-REG：无。** 无验收回归、无整批回滚触发；基线与终版验收均为 57/57。
  A/B 原版 5/1 唯一失败为硬编码金标旧值，与 C 轮一致，属预期，不挂 ISSUE-REG。
- **锁仓 18 键的缺证据清单（维持锁仓，不开新 ISSUE）：**
  必做 9：makeWishDragon（许愿→奖品映射缺）、bindingRecuitCode/createRecuitCode/
  receiveBindingRecuitAward（跨玩家码无核验方）、startAnniversaryPassRg（依赖 B49 肉鸽引擎）、
  getSevenTaskAward（七日进度为空）、GetGMGiveItem（GM 赠送永久锁，无成本/进度/上限表）、
  rewardMAActivity（CRL 进度源未闭合）、pileGameAward（自报分数无可信记录）。
  可选 8（eRet 2）：bringSpecialAward、receiveRecuitAward、receiveAccRechargAward（付费链）、
  receiveJigsawAward、receiveJigsawTaskAward、submitNumMA、smallGameAward、treesReceiveReward。
  可选拦截 1（eRet 4）：ExChangeJetton（筹码兑换走支付拦截，handler 体只读）。
- **分类轮出入（活树为准，已记入清点）：** 分类轮称“除 C54 三件套外其余 39 键无 handler”
  （以旧 core 7b00f66b… 为准），活树 D 段 L2755–L3020 已全部实现，本轮只验不重做；
  C65 签到/祈福分类轮称锁、活树已按 R6 实现；ExChangeJetton 分类轮称只读、
  dispatch 实测为 eRet 4 拦截（比只读更保守）；getActivityAward handler 体裸 eRet 1、
  dispatch 实测补 rewardArray {}（空奖励，产出 0）。

## §7 补充注记落实情况（final/SUPPLEMENT-NOTE.md，4 条）

1. FINAL 只交 zip，不推仓库：本 checkpoint 写“zip 交付用户”，本轮未向仓库推任何东西。
2. FINAL 终局往返用树内真实存档副本（SHA 018d6afdf…，2026-10-27）：D 轮往返仍按原要求
   （三份快照 + 空档）做，不受此条影响；该副本 SHA 本轮复核未变，供 P7 终局往返用。
3. 计数外键进 FINAL 附录：D 轮面板可选 10 键已在清点内逐键说明，不进 42 必做计数；
   C43 的 3 键、C60 HOUSE_SPECIAL、B 轮面板可选键仍按 C 轮附录口径留待 FINAL 附录。
4. 斗狗规则（与 D 轮无关，P4 E 轮注意）：PVP 永久锁；PVE（enterDogPVEBattle 一类）只在客户端
   配置表里自带 NPC 狗数据时才做，按 R1 取证 15 分钟，对手属性只读表、己方狗读存档、
   胜负本机算、奖励有表按表发、无表产出 0、每天上限 10 次、标★，找不到 NPC 表就永久锁，不造对手数据。

## §8 后续轮注意

- 下一轮：P4 E 轮（29、34、45、50 含 ISSUE-14 斗狗 4 键、55、57、66、69、70、76），
  斗狗按 §7 第 4 条执行；其余路线与规则不变。
- 本轮批前快照与门日志齐全；终版与起点指纹完全一致，E 轮可直接从 hf5d89bf7 起手复核。
