# C13〔UFO 夹娃娃〕第 14 批 · 取证与策略（2026-10-27）

> KEY 原文抄自 relations.md:96-97。侦察：4 工人小单 4/4 全活（`scoutP1/P2/U/T-*.md`）+ 主审独立探针（`主审-独立探针记录.md` §一-§八）。
> **对撞结论：零冲突**（W1 逐行一致；W3/W4 贡献入口与死键两大发现）。模型真名 = **DollModel**（"Doll"=娃娃机）。

---

## 一、成员与线上名（tools/index.js 单源——★actions.json 无本批条目；★=拼写反直觉）

| 键 | 线上名 | 定义行 | 发送点 | 回调 | 请求载荷 |
|---|---|---|---|---|---|
| GET_UFO_CATCHER_DATA | `User.getUFOCatcherData` | 60251 | 25880 | 25783-25801 | 无 |
| GET_UFO_CATCHER_TASK | `User.getUFOCatcherTask` | 60249 | 25869 | 25738-25747 | 无 |
| USE_UFO_REFRESH | ★`User.useUFOrefresh` | 60253 | 25877 | 25770-25782 | 无 |
| BUY_UFO_REFRESH_TIMES | `User.buyUFORefreshTimes` | 60252 | 25849 | 25802-25819 | `{num:1}`（**恒 1**） |
| REWARD_UFO | `User.rewardUFO` | 60254 | 25862-25866 | 25755-25769 | `{packages, itemId, signCode}` |
| REWARD_UFO_CATCHER_TASK | `User.rewardUFOCatcherTask` | 60250 | 25872-25874 | 25728-25737 | `{coinDailyId}` |
| BUY_UFO_GAME_COIN | `User.buyUFOGameCoin` | 60255 | 25854-25856 | 25748-25754 | `{num}` |

## 二、★死键 3 个（W3 全文双 bundle grep 零调用点）

`GET_UFO_CATCHER_TASK` / `REWARD_UFO_CATCHER_TASK` / `BUY_UFO_GAME_COIN` 的 req* 方法**在 scripts2+scripts3 无任何调用**（客户端定义了但从不发）——同 C10 `SEED_CROP` 先例。

## 三、活键 4 个与面板

- **面板开关 = GET_UFO_CATCHER_DATA**：1 分支里 `dollBundle/prefabs/dollUI` + `DollUI.setData(o)` 整包透传（25791-25795）。
- **入口 = 夹娃娃机 NPC**：`NpcToFuncType97`（index.js:87583-87588）→ `DollModel.getUFOCatcherData()`（W3/W4 双证）。
- DollUI 内调用点：抓取结算 `reqRewardUFO(this.catchItems, this.catchIndexIds, this.gearType)`（26327）、刷新 `useUFOrefresh()`（26218）、买次数 `reqBuyUFORefreshTimes()`（26209，闸：`getConstByID(325) - buyRefreshTimes > 0`）。

## 四、回调契约（★全批字段都有 hasOwnProperty 守卫——比 C11/C12 软，崩点趋零）

| 键 | 1 分支读点（全守卫） | 非 1 分支 |
|---|---|---|
| GET_UFO_CATCHER_DATA | rewardPool、refreshTimes、freeRefreshTimes、buyRefreshTimes、buyCoinCount、signId + 开面板 | 3 → `outTimeActive(37)`+1093（**两个独立 if**，其余码静默） |
| REWARD_UFO | ★`signId` 在 eRet 判定**前**读（25756）；rewardArray；`autoRefresh` 存在 → initItems(**o.rewardPool**) | **任何非 1 → 恒 dispatch CATCH_DOLL_EVENT null**；15 → 8060 |
| USE_UFO_REFRESH | rewardPool、refreshTimes、freeRefreshTimes、buyRefreshTimes、signId | 3 → outTimeActive(37)+1093；6 → 8060 |
| BUY_UFO_REFRESH_TIMES | refreshTimes、freeRefreshTimes、buyRefreshTimes | 7 → 8060；5/6 → 3633；3 → outTimeActive(37)+1093 |
| 死键 3 个 | rewardLimitDaily / coinDailyList / rewardArray / buyCoinCount（REWARD_UFO_CATCHER_TASK 的 coinDailyList 透传行 25731 是 `.on` 非 `.dispatch`，疑似客户端笔误） | 3 → outTimeActive(37)+1093 |

## 五、★数据源与防作弊（主审自读，本批核心）

1. **`rewardPool` = 对象 {物品id: 数量}**——键是 `package_difficulty` 表行 id（1-5），客户端 `initItems`（25824-25847）按该表 location/quality/radi/suofang/speed 摆放。
2. **`package_difficulty.json`**（cfg\dump，5 行）：id/location("x,y|…")/speed[]/quantity/reward(30/60/…)/radi/quality/suofang——**客户端物理表现表**，服务端只需要发数量。
3. ★**防作弊签名**：REWARD_UFO 载荷 `signCode = md5(String(2*signId+37))`（25865）——signId 服务端权威下发（GET/USE/REWARD 回包），客户端只回签。
4. **爪子道具**：8117/8118/8119/8120 = Effect 39 消耗品、8143 = Effect 13（**live dump item-effects 才有**，静态 item.json 无）；reqRewardUFO 的 itemId 三值 8117/8119/8120 = 三种爪（难度档 0/1/2）。active.json 37 的 delItem 列同列这五件。
5. **活动闸**：eRet 3 → `outTimeActive(37)`——active.json 37 = **"圣诞抓娃娃活动"，窗口 2026-05-27→06-03，早已过期**（同 C11 表窗口问题）。

## 六、线上现状

core 零 handler；shapes 零登记；reject-codes 0 条。

## 七、策略草案（待拍板后执行）

1. **存档**：`s.doll = {rewardPool:{}, refreshTimes:0, freeRefreshTimes:0, buyRefreshTimes:0, buyCoinCount:0, signId:0, signTime?}`（对齐模型字段）。
2. **生成器** `tools\gen_c13_tables.js` → `bz-c13.generated.js`：package_difficulty 5 行（id/quantity/reward/quality）+ 爪子 itemId 映射（8117/8119/8120）+ 口径常量。
3. **GET_UFO_CATCHER_DATA**（面板开关）：生成/续发 rewardPool → 回 `{eRet:1, rewardPool, refreshTimes, freeRefreshTimes, buyRefreshTimes, buyCoinCount, signId}`。
4. **USE_UFO_REFRESH**：免费次数优先扣 freeRefreshTimes，否则扣 refreshTimes；都无 → 6（8060）？或自定"刷新消耗 X 游戏币/元宝"；回新 rewardPool + 三次数 + 新 signId。
5. **REWARD_UFO**：校验 signCode（md5(2*signId+37)，需在 core 内备 md5——实现时查 core 是否已有，没有则带一份纯 JS md5）→ 扣对应爪子道具（itemId）→ **服务端权威结算**：从 rewardPool 按概率/规则判中 → 发 rewardArray → 池子扣减；`autoRefresh` 语义（抓完自动刷新）自定。档 A 不校验客户端 packages 的真实性（服务端发什么就是什么）。
6. **BUY_UFO_REFRESH_TIMES**：每日限购（自定 N 次）+ 价格（自定，参照 getConstByID 324 的语义=文案价）→ 三次数回显。
7. **死键 3 个**：建议跳过（同 C10 SEED_CROP 先例），回执申报。
8. **活动闸**：自定常开（同 C11 endtime 口径）；eRet 3 通道保留（口径上"活动关闭"时用）。
9. **登记**：4 活键（或 7 键）登记 todo_shapes.json；拒绝码双向登记；sweep 接 c13.generated。

## 八、待拍板（附主审建议）

1. **死键 3 个**：跳过（推荐，同 C10 SEED_CROP）｜结构占位。
2. **范围**：4 活键全做（推荐）｜只做面板+抓取。
3. **抓取判定**：服务端权威（从池子按概率判中，忽略客户端 packages——防白拿，推荐）｜信任客户端 packages。
4. **抓取消耗**：REWARD_UFO 的 itemId（8117/8119/8120 三种爪）要不要照扣（推荐照扣，缺爪 → 15/8060 口径）；爪子从哪来（活动赠送/商店——未取证，建议自定：GET_DATA 首次赠送或用元宝直购）。
5. **活动窗口**：自定常开（推荐）｜照表（已过期 = 全拒，零玩法）。
6. **signCode**：真校验 md5（core 可能需带纯 JS md5）｜档 A 只验存在（推荐先验存在+服务端权威发奖，md5 校验档 B）。

## 九、未验证 / 风险

1. `packages`/`catchIndexIds` 的确切格式（客户端抓取结算数据）——档 B 前需专项取证（26327 上下文）。
2. `coinDailyList`/`coinDailyId` 任务链（死键若做需取证）。
3. 三种爪（8117/8119/8120）与难度档 0/1/2 的对应关系（8120=金爪？）——由 `gearType` 推断，未逐行核。
4. NPC 97 在哪些场景/有无前置——入口可达性未验（同 C08/C11 风格）。
5. DollUI.setData(o) 整包消费的其它字段——实现前补。
6. `autoRefresh` 的服务端语义（抓完自动刷新=服务端决定池子是否重生成）——自定口径候选。
