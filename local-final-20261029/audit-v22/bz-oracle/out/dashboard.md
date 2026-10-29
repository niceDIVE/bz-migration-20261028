# 动作注册表仪表盘

生成：2026-10-23T09:28:32.323Z　M1 ed2a4eee　契约 6b4e41c9

- HttpConst 条目：**1125**；其中客户端真会发请求的：**744**；扣除 OUT/CAPTURE 后在范围内：**699**
- 已还原（DONE）占范围内：**0.9%**

| 状态 | 数量 | 含义 |
|---|---:|---|
| DONE | 6 | 已实现且裁判全 PASS |
| IMPL-FAIL | 0 | 已实现但裁判有 FAIL |
| IMPL-UNJUDGED | 74 | 已实现、还没有用例 |
| RULE | 0 | 有规则 DSL，可直接编译 |
| GEN-READY | 317 | 契约闭合，可交给生成器 |
| NEEDS-S2 | 282 | 契约未闭合，先跑展开器 |
| NO-CONTRACT | 20 | 客户端会发但没有读点契约 |
| CAPTURE | 0 | 依赖原服独有数据 |
| OUT | 29 | 付费/项目边界外 |
| ALT | 16 | 非 Mod.do 形态的发送（弹幕/排行榜等另一通道），多依赖其他玩家【推断】，不计入范围 |
| PUSH | 192 | 服务端推送事件，不需要请求 handler |
| DEAD | 189 | 客户端不发也不读 |

## 待办 Top 30（按真实触发次数，其次按状态）

| # | 动作 | 状态 | 触发 | 契约 |
|---:|---|---|---:|---|
| 1 | `User.quicklogin` | IMPL-UNJUDGED | 0 | QUICK_LOGIN（未闭合） |
| 2 | `User.Create` | IMPL-UNJUDGED | 0 | USER_CREATE（未闭合） |
| 3 | `User.OnHookBreak` | IMPL-UNJUDGED | 0 | USER_ONHOOK_BREAK（未闭合） |
| 4 | `User.FriendList` | IMPL-UNJUDGED | 0 | USER_FRIENDLIST（未闭合） |
| 5 | `User.ApplyFriend` | IMPL-UNJUDGED | 0 | USER_APPLAYFRIEND（未闭合） |
| 6 | `User.FindFriend` | IMPL-UNJUDGED | 0 | USER_FIND_FRIEND（未闭合） |
| 7 | `User.FriendDelete` | IMPL-UNJUDGED | 0 | USER_FRIEND_DELETE（未闭合） |
| 8 | `User.rankList` | IMPL-UNJUDGED | 0 | USER_RANKLIST |
| 9 | `User.LookOther` | IMPL-UNJUDGED | 0 | USER_LOOKOTHER |
| 10 | `User.getCRAInfo` | IMPL-UNJUDGED | 0 | GET_CREATE_INFO |
| 11 | `User.OnCheckBreak` | IMPL-UNJUDGED | 0 | CHECK_BREAK（未闭合） |
| 12 | `User.GetChatAddress` | IMPL-UNJUDGED | 0 | USER_GETCHATADDRESS（未闭合） |
| 13 | `User.BeginPlayWooks` | IMPL-UNJUDGED | 0 | BEGIN_WOOD_TRAINING |
| 14 | `User.EndPlayWooks` | IMPL-UNJUDGED | 0 | END_WOOD_TRAINING |
| 15 | `User.GetRoldSaveTime` | IMPL-UNJUDGED | 0 | SAVE_GAMETIME（未闭合） |
| 16 | `User.BeginFish` | IMPL-UNJUDGED | 0 | START_FISHING |
| 17 | `User.EndFish` | IMPL-UNJUDGED | 0 | END_FISHING |
| 18 | `User.LookFishAward` | IMPL-UNJUDGED | 0 | CHECK_FISHING_REWARDS |
| 19 | `User.ExChangeJetton` | IMPL-UNJUDGED | 0 | EXCHANFE_JETTON（未闭合） |
| 20 | `User.GetSchoolReview` | IMPL-UNJUDGED | 0 | GET_SCHOOL_POSTS（未闭合） |
| 21 | `User.GetSchoolRankList` | IMPL-UNJUDGED | 0 | GET_SCHOOL_RANK（未闭合） |
| 22 | `User.enterWoldBossBattle` | IMPL-UNJUDGED | 0 | FIGHT_WORLD_BOSS |
| 23 | `User.QuickBuyItem` | IMPL-UNJUDGED | 0 | QUICK_BUY（未闭合） |
| 24 | `User.checkUploadAttackDamge` | IMPL-UNJUDGED | 0 | UPLOAD_WB_DMG |
| 25 | `User.WashMedicine` | IMPL-UNJUDGED | 0 | WASH_MEDICINE |
| 26 | `User.GetFashionList` | IMPL-UNJUDGED | 0 | GET_FASHION_LIST |
| 27 | `User.addItem` | IMPL-UNJUDGED | 0 | ADD_ITEM |
| 28 | `User.acceptTask` | IMPL-UNJUDGED | 0 | GET_TASK（未闭合） |
| 29 | `User.getFinishTaskAward` | IMPL-UNJUDGED | 0 | FINISH_TASK（未闭合） |
| 30 | `User.BeginTraining` | IMPL-UNJUDGED | 0 | BEGIN_LIANGONG |

> 还没有触发数据：开被动录制或兜底 handler 的命中计数后重跑，排序才有意义。
