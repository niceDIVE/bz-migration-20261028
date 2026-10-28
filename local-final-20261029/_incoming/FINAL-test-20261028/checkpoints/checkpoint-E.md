# E 轮检查点 checkpoint-E.md（v4.0 终局 P4，不发上游）

- 起点：hf5d89bf7（核心 f4bf2827…，产物 40d2ca24…，形状 382/1130，验收 57/57，F165 796/0）
- 终版：hf5d89bf7，维持不变（无产品代码改动）
- 终版核心 SHA256：`f4bf282782b4ee6e691059e97c2e313c3a827581628c6f7d77c5648e3c4eec71`
- 终版产物 SHA256：`40d2ca2447d44f779a424e57020dd8326f56db6c0a5f83ff47e96d99d7a8191c`
- 终版 ver：hf5d89bf7，selfCheck=1514，bytes=1814791
- 顺序：29、34、45、50（含 ISSUE-14 斗狗 4 键）、55、57、66、69、70、76（轮内顺序自定）
- 总账：必做 29 键 = 成功 16、锁仓 13（eRet 2）；ISSUE-14 跟进 4 键 = 锁仓 4（eRet 2）；
  合计 33 键 = 成功 16、锁仓 17；产品代码改动 0
- 清点：final/rounds/E/work/inventory-E.md；冒烟：final/rounds/E/roundE-smoke.js；
  往返：final/rounds/E/roundE-roundtrip.js；门日志：final/rounds/E/gates/
- 快照：final/rounds/E/snapshots/pre-e/（核心、旧核心、产物，SHA 在同目录 SHA256SUMS.txt）
- 交付方式：zip 交付用户（v4.0 补充答复第 1 条；本轮不向仓库推任何东西）

## §1 每批一行

| 批 | 结果一行 |
|---|---|
| E29 他人家园 | 成功 2（findOHomes 诚实空 homeArr []、findOhter 诚实空 findArr []）+ 锁仓 1（recommendOHomes eRet 2，跨玩家）。冒烟 18/0。 |
| E34 武林PK | 成功 1（getwulinArenaData 诚实空 arenaData []、rank 0）+ 锁仓 5（wuLinAssemblyApplyReq、jionChatPkServer、jionWuLinPkServer、getDropAward、uploadPlayerArenaData，全部 eRet 2，不进匹配、不发掉落）。冒烟 27/0。 |
| E45 门派帖子 | 成功 1（GetSchoolReview 诚实空 reviewList []、maxPage 0、type 回显）+ 锁仓 1（ReqReview eRet 2，本地不留假帖子）。冒烟 9/0。 |
| E50 进入他人家园 | 成功 1（getHomeList 本家闭环 C10：soilArr 数组、exp 数字、dog 己方狗或 0）+ 锁仓 1（getFriendHomeList eRet 2，stealCrop 仍锁）；斗狗 4 键全锁见 §7。冒烟 31/0（含斗狗专项断言）。 |
| E55 好友 | 成功 3（GetOnHookFriendLis 诚实空、FriendList 诚实空 uIds [] / friendList {}、setChatRedData 仅显示红点 eRet 1 且无存档写）；无锁仓。冒烟 20/0。 |
| E57 平台 openid | 成功 3（getDouYinOpenID openid 0、getWxXyxOpenID openid 0 / session_key 0、GetServerList 模板回放 serverObj 有区服、无玩家数据）；无锁仓。冒烟 17/0。 |
| E66 组队 | 成功 2（getTeamFighterInfo、getFighterInfo 诚实空 battleID ''、info []，不建队、不起战斗）；无锁仓。冒烟 14/0。 |
| E69 琅嬛复活 | 锁仓 2（revive、reviveMulti eRet 2；不以形状默认 99999 作复活价，不免费复活）。冒烟 8/0。 |
| E70 师徒传功 | 锁仓 2（masterPassMerit、pupilPassMeritReward eRet 2；不转移对方传功值、不发奖）。冒烟 8/0。 |
| E76 排行榜 | 成功 3（rankList eRet 1 + CDTime 0 不带榜单、boosRankList 伤害榜 []、checkUploadAttackDamge 本档零值不据此发奖）+ 锁仓 1（GetBossAward eRet 2）。冒烟 22/0。 |
| E-GLOBAL | 全局否定断言 13/0：13 个诚实空/已实现回包均无 payData / order 字段。 |

## §2 六门终版（日志 final/rounds/E/gates/）

| 门 | 结果 |
|---|---|
| gen_shapes --stat | PASS，382 动作 / 1130 字段（exit 0，与起点一致，无形状变动） |
| build-handlers | PASS，HANDLERS OK ver=hf5d89bf7 selfCheck=1514 bytes=1814791（exit 0；产物仅 built= 时间戳一行不同，已还原回 pre-E 快照，终版 SHA 与起点一致） |
| 形状冻结 --diff | PASS，diff 总数 = 0（exit 0；无基线变动，故无 planned-changes、无 --freeze 调用，不是裸 --freeze） |
| 拒绝码 | PASS，REJECT-CODES OK 动作=268 条目=285 拒绝点=391（exit 0；证据组 136/153、运行时组 132/132，与起点一致） |
| 验收 | PASS，ACCEPTANCE OK 项=57 绿=57 已知红=0 cap=0（exit 0；53 测试 + 4 检查器，含 lint_freebie；项数未减） |
| lint_freebie | PASS，发放型 44，OK 42，待查 0，白名单恰好 2（passCardAward、useItem）（exit 0；freebie_allow.json 未动，tools/freebie_allow.json 内容与起点一致） |

## §3 冒烟全量

| 冒烟 | 结果 |
|---|---|
| E 轮 roundE-smoke.js（33 键） | **187 pass，0 fail**（E29 18、E34 27、E45 9、E50 31、E55 20、E57 17、E66 14、E69 8、E70 8、E76 22、E-GLOBAL 13） |
| F165 live | **796 pass，0 fail**（基线不退） |
| C22 live | ALL PASS |
| merged（merge-v3/smoke-merged.js） | 49 pass，0 fail |
| A 轮 smoke-a-live.js | 130 pass，0 fail |
| B 轮 smoke-b-live.js | 225 pass，0 fail |
| C 轮 roundC-smoke.js | 124 pass，0 fail |
| D 轮 roundD-smoke.js | **205 pass，0 fail**（基线不退） |
| SHRINK_OK（rc-v3.2/smoke-shrink.js） | 6 pass，0 fail |
| A/B live（原版） | 5 pass，1 fail——唯一失败是硬编码金标旧值 ha991283b（与 C/D 轮一致，属预期，非回归） |
| A/B live（金标版，veronly） | **6 pass，0 fail**（金标已为 hf5d89bf7） |
| c13 扩展（hotfix-patch/test/c13-smoke.js，输出 c14 11 条） | exit 0，全部通过 |

## §4 核账（本轮新开买卖/兑换）

- 本轮无新开买卖/兑换（产品代码改动 0）：33 键中无买入、卖出、兑换、换回动作；
  唯一交换类外观是已实现的 C10 getHomeList 地块刷新（非买卖，钱包/背包不动，
  E 轮只验不断言其为新开项），故无“买→卖/换→换回”新账项，无净赚可能。
- 锁仓的发放/领奖键（getDropAward、GetBossAward、传功奖励、复活、斗狗 4 键、
  武林报名/上传、推荐家园、进他人家园、门派发帖）全部 eRet 2 且钱包/背包不动，
  扣与产均为 0，故无正净额项；无 payData 链新动作，无 ¥1=10 换算项。
- 仅显示项 setChatRedData：体中无 loadSave/writeSave，钱包/背包/好友关系不动，无账项。

## §5 存档往返（roundE-roundtrip.js，日志 gates/roundtrip-final.log）

- 0205 / 0232 / 0250 三份快照 + 新建空档，各跑“加载 → 50 个已实现动作（E 轮 16 成功键全在内）
  → 存档 → 再加载”：**4 档全部 PASS**（每档 actions ok=50 threw=0 checks 8/8：JSON.parse、
  saveVersion=4、roleID=16374、钱包字段不为负、bag 无负数、再加载成功）。
- 真实存档未动：SHA 仍 `018d6afdf713863cc9b40eef0181632ad9fa2d55a6cb084c25ded3743722eb47`，
  mtime 仍 2026-10-27；本轮全部测试均用内存/沙箱存档副本，未使用任何维护通道，
  无写坏、无回滚、无重建；known-red.json 仍 `[]`（验收运行按设计追加 history 一行，seq=10，entries=0）。

## §6 ★ 清单、ISSUE 清单、未决项

- **★ 清单：0 项。** 本轮未新定任何价格/奖励/时长值；无 10 倍口径触发。
  斗狗 PVE 未实现故无★（锁仓不是新定值）；setChatRedData 仅显示、无数值。
- **ISSUE-LINT：无新增。** lint 待查 0，无免费发放新增，无锁仓新增。
- **ISSUE-REG：无。** 无验收回归、无整批回滚触发；基线与终版验收均为 57/57。
  A/B 原版 5/1 唯一失败为硬编码金标旧值，与 C/D 轮一致，属预期，不挂 ISSUE-REG。
- **锁仓 17 键的缺证据清单（维持锁仓，不开新 ISSUE）：**
  recommendOHomes（跨玩家家园无对方存档）、wuLinAssemblyApplyReq / jionChatPkServer /
  jionWuLinPkServer / uploadPlayerArenaData（无 live 对手池与匹配方）、getDropAward
  （竞技场掉落奖励表/战绩源缺）、ReqReview（门派帖子无本地版面，本地留帖即假发布）、
  getFriendHomeList（他人家园数据不在本地存档）、revive（复活价表缺，形状默认 99999
  是假价不用）、reviveMulti（多人复活）、masterPassMerit / pupilPassMeritReward
  （师徒对方记录不在本地存档）、GetBossAward（共享 Boss 状态与排行无离线源）、
  斗狗 4 键（见 §7）。
- **分类轮出入（活树为准，已记入清点）：** 分类轮称“已实现 6”以旧 core 为准，
  活树 E 段 L2728–L2754 已全部实现（成功 16、锁 13 + 斗狗 4 锁），定性与分类轮一致，
  无推翻项；分类轮“已实现”6 项（GetSchoolReview、getHomeList、FriendList、GetServerList、
  checkUploadAttackDamge、rankList）均在 E 轮成功 16 内。

## §7 斗狗专项结论（批 50，ISSUE-14，按 v4.0 补充答复第 4 条，取代旧默认项）

- **PVP 永久锁，不做、不解锁：** enterRogueMulitiNpcBattle（多人回放引擎家族，
  响应须服务端生成整场战斗数据），活树 L2730 已 eRet 2，冒烟断言 eRet 2 且存档不变。
- **PVE 永久锁，不做、不解锁：** enterDogPVEBattle 活树 L2731 已 eRet 2，
  冒烟断言两次调用均 eRet 2 且存档文本不变（无日上限计数写、无奖励写）。
  取证（R1，15 分钟内完成，未超时，证据见清点）：
  `tools/cfg/dump/` 444 张配置表全文搜 dog 仅 2 文件偶然命中（actconfig.json 的
  GunDog_hold / GunDog_atk 技能 id、fashionall.json 的 dog01 时装模型），均无对手属性/
  奖励行；`npc_stats.json` 与 `npc_compact.json`（3658 条）dog 命中 0；
  活核心 `dogTable()`（BZ_C14）只是己方喂狗表（狗粮 6285），`getHomeList.dog` 只是己方
  看门狗，均不是对手表；客户端 ENTER_PVEDOG_FIGHT 无同键监听者，战斗数据须服务端生成。
  结论一行：NPC 狗对手属性表缺失，故胜负无法本机算，PVE 永久锁，不造对手数据。
  无表产出 0 / 日上限 10 / 对手只读表 / 己方读存档 / 胜负本机算五项断言因未实现而由
  锁仓断言覆盖（eRet 2 且存档不变），不虚构其中任何一项的通过。
- **伙伴 2 键永久锁：** ReqDogPartnerBattleInfo（L2729）、CheckDogPartnerPVEBattleResult
  （L2728），全客户端 0 调用方，仍锁不静默丢弃，冒烟断言 eRet 2 且存档不变。
- **己方狗现状（不属斗狗实现）：** getHomeList.dog 己方狗建模（C14）维持不变，
  喂狗链（FeedDog 真扣狗粮 6285）与狗日志不在 E 轮范围内，未动。

## §8 补充注记落实情况（final/SUPPLEMENT-NOTE.md，4 条）

1. FINAL 只交 zip，不推仓库：本 checkpoint 写“zip 交付用户”，本轮未向仓库推任何东西。
2. FINAL 终局往返用树内真实存档副本（SHA 018d6afdf…，2026-10-27）：E 轮往返仍按原要求
   （三份快照 + 空档）做，不受此条影响；该副本 SHA 本轮复核未变，供 P7 终局往返用。
3. 计数外键进 FINAL 附录：E 轮面板可选键（C29 HOME_SPECIAL_AWARD 已锁 eRet 2、
   C50 RECLAIM_LAND 活树无 handler、C55 好友系 8 键未核、C76 FIGHT_WORLD_BOSS
   = enterWoldBossBattle 已实现）已在清点内逐键说明，不进 29 必做计数；
   C43 的 3 键、C60 HOUSE_SPECIAL、B 轮面板可选键仍按 C 轮附录口径留待 FINAL 附录。
4. 斗狗规则：已按本条执行，结论见 §7（PVP 永久锁；PVE 取证后永久锁，取代旧默认）。

## §9 后续轮注意

- 下一轮：P5 ISSUE-16 round 2（剩余 306 pass-through），路线与规则不变；
  E 轮终版 hf5d89bf7 可直接起手复核（核心/产物 SHA 与起点一致，产品改动 0）。
- 本轮批前快照与门日志齐全；无回滚、无新 ISSUE、无★；斗狗 PVE 永久锁结论供 FINAL
  回执直接引用（取证证据在清点内，不再重查）。
