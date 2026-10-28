# C13〔UFO 夹娃娃〕主审独立探针记录（2026-10-27，边读边补）

> 与 4 个工人报告分开存放、互不覆盖，用于对撞。全部行号为本场实测。
> 模型真名 = **DollModel**（scripts3.js:25707-25894，"Doll"=娃娃机）；UI 组件 DollHand（25702）。

## 一、7 键线上名（tools/index.js 单源；★actions.json 无本批条目）

| 键 | 线上名 | 定义行 |
|---|---|---|
| GET_UFO_CATCHER_DATA | `User.getUFOCatcherData` | 60251 |
| GET_UFO_CATCHER_TASK | `User.getUFOCatcherTask` | 60249 |
| USE_UFO_REFRESH | ★`User.useUFOrefresh` | 60253（**refresh 的 r 小写**） |
| BUY_UFO_REFRESH_TIMES | `User.buyUFORefreshTimes` | 60252 |
| REWARD_UFO | `User.rewardUFO` | 60254 |
| REWARD_UFO_CATCHER_TASK | `User.rewardUFOCatcherTask` | 60250 |
| BUY_UFO_GAME_COIN | `User.buyUFOGameCoin` | 60255 |

## 二、模型字段（25715-25725 构造默认值）

`items=null, catchIndexIds=null, refreshTimes=0, freeRefreshTimes=0, buyRefreshTimes=0, buyCoinCount=0, rewardLimitDaily=0, signId=0, npcID=null`
`getTimes() = freeRefreshTimes + refreshTimes`（25821-25823，可用刷新次数）。

## 三、回调契约（监听区 25728-25819，逐字核准；★本批全部字段有 hasOwnProperty 守卫——比 C11/C12 软）

| 键 | 行 | 1 分支读点（全有守卫） | 非 1 分支 |
|---|---|---|---|
| REWARD_UFO_CATCHER_TASK | 25728-25737 | rewardLimitDaily、coinDailyList（**透传给 UPDATE_DOLL_TASK 监听器——注意 25731 是 `.on` 不是 `.dispatch`，疑似客户端笔误**）、rewardArray | 3 → `outTimeActive(37)` + 1093 |
| GET_UFO_CATCHER_TASK | 25738-25747 | 同上三字段（coinDailyList 这里是 `.dispatch` 正常） | 3 → 同上 |
| BUY_UFO_GAME_COIN | 25748-25754 | buyCoinCount、rewardArray；**恒 dispatch UPDATE_DOLL_VALUE（25753，无 eRet 条件）** | **无 else（静默）** |
| REWARD_UFO | 25755-25769 | ★`o.signId` 在 eRet 判定**之前**读（25756，有守卫）；rewardArray；`o.autoRefresh` 存在时 initItems(**o.rewardPool**)；catchIndexIds 用后清 null | **任何非 1 → 恒 dispatch CATCH_DOLL_EVENT null（25767）**；15 → 8060 |
| USE_UFO_REFRESH | 25770-25782 | rewardPool、refreshTimes、freeRefreshTimes、buyRefreshTimes、signId（全守卫） | 3 → outTimeActive(37)+1093；6 → 8060 |
| GET_UFO_CATCHER_DATA | 25783-25801 | rewardPool、refreshTimes、freeRefreshTimes、buyRefreshTimes、buyCoinCount、signId（全守卫）+ ★**面板开关**：`dollBundle/prefabs/dollUI`（25791-25795）+ `DollUI.setData(o)` 整包透传 | 3 → outTimeActive(37)+1093（注意 25784 与 25797 是**两个独立 if**，非 else-if，其余码静默） |
| BUY_UFO_REFRESH_TIMES | 25802-25819 | refreshTimes、freeRefreshTimes、buyRefreshTimes（全守卫） | 7 → 8060；5 → 3633；6 → 3633；3 → outTimeActive(37)+1093 |

★**活动闸**：`eRet 3 → ActiveModel.outTimeActive(37)` —— 本系统挂在**活动 37** 上（active.json id 37 = **"圣诞抓娃娃活动"**，窗口 **2026-05-27 → 2026-06-03，早已过期**，type 2，delItem="1,8117|1,8118|1,8119|1,8120|1,8143"）。

## 四、发送点与载荷（25848-25881，逐字核准）

| 方法 | 行 | 键 | 载荷 |
|---|---|---|---|
| `reqBuyUFORefreshTimes()` | 25848-25852 | BUY_UFO_REFRESH_TIMES | `{num: 1}`（**恒 1**） |
| `reqBuyUFOGameCoin(t)` | 25853-25857 | BUY_UFO_GAME_COIN | `{num: t}` |
| ★`reqRewardUFO(t, e, o)` | 25858-25867 | REWARD_UFO | `{packages: t, itemId: i, signCode: md5((2*signId+37).toString())}`；itemId 按 o 映射：0→8117、1→8119、2→8120；e 存入 catchIndexIds |
| `reqGetUFOCatcherTask()` | 25868-25870 | GET_UFO_CATCHER_TASK | 无 |
| `reqRewardUFOCatcherTask(t)` | 25871-25875 | REWARD_UFO_CATCHER_TASK | `{coinDailyId: t}` |
| `useUFOrefresh()` | 25876-25878 | USE_UFO_REFRESH | 无 |
| `getUFOCatcherData()` | 25879-25881 | GET_UFO_CATCHER_DATA | 无 |

## 五、★数据源与防作弊（主审自读补全）

1. **`rewardPool` = 对象 {物品id: 数量}**（25834 `for (var n in e) for (p=0; p<e[n]; p++)`——itemId n 出现 e[n] 次）。
2. **摆位/物理表 = `package_difficulty`**（25826 `getTable("package_difficulty")`——cfg\dump\package_difficulty.json，**5 行**，列 id/location/speed/quantity/reward/radi/quality/suofang；location="x,y|x,y|…"；quantity=该物品摆放数量；reward=30/60/…；quality 1/2）。
   ⇒ 服务端只需发 {itemId: 数量}，摆位/速度客户端自己算。
3. ★**防作弊签名**：REWARD_UFO 载荷 `signCode = md5(String(2*signId+37))`（25865，CryptoMgr.md5）——**服务端必须校验**（signId 服务端权威下发，客户端只回签）。
4. **爪子道具**：8117/8118/8119/8120 = Effect 39 消耗品（live dump item-effects，n=7868/7869/7874/7875），8143 = Effect 13；**静态 item.json 里没有**（活动道具只在 live dump）——服务端 BZ_ITEMFX 已覆盖。reqRewardUFO 的 itemId 三值 8117/8119/8120 = 三种爪（对应难度 o=0/1/2）。
5. `getCurItemNum(t)`（25882-25884）：`lh_temporary` 表物品走 TowerModel.getTowerItemNum，其余走 RoleBaseInfo——**娃娃机游戏币可能是 tower 物品**（待 W3/W4 对撞）。

## 六、线上现状

- core 零 handler；shapes.json 7 键零登记；reject-codes 0 条。

## 七、未验证 / 待补（等工人或实现前补）

1. ~~`packages`（reqRewardUFO 的 t）与 `catchIndexIds`（e）~~ → W3 已补：调用点 DollUI 26327 `reqRewardUFO(this.catchItems, this.catchIndexIds, this.gearType)`（抓取结算时发）。
2. ~~面板入口~~ → **W3/W4 双证**：`NpcToFuncType97`（index.js:87583-87588）→ `DollModel.getUFOCatcherData()`——**夹娃娃机 NPC**。
3. ~~游戏币购买价~~ → W3：DollUI:26202 `getConstByID("325") - buyRefreshTimes > 0`（每日可购刷新次数）、`getConstByID("324")`（价格文案）；常量表 324/325 无静态值（客户端运行时来源，服务端口径自定）。
4. ~~8117/8119/8120 爪子~~ → live dump item-effects：8117/8118/8119/8120 = Effect 39 消耗品、8143 = Effect 13；静态 item.json 无（活动道具只在 live dump）。
5. DollUI.setData(o) 整包里还读哪些字段——实现前补。

## 八、工人报告对撞结论（2026-10-27 11:1x）

- **W1 与主审逐行一致**（25728-25819 全部监听、守卫、eRet 分支）——采信。
- **W2**（84 行，发送区+定义核对）范围主审已自读覆盖，尾行正常——采信。
- **W3**（65 行）：★独有价值——①**7 键里 3 个零调用死键**（reqGetUFOCatcherTask / reqRewardUFOCatcherTask / reqBuyUFOGameCoin 在 scripts2+scripts3 无任何调用点）；②抓取结算调用点 DollUI:26327（catchItems/catchIndexIds/gearType 三参）；③刷新购买闸 `getConstByID(325) - buyRefreshTimes > 0`（26202）；④面板=NPC 功能类型 97（index.js:87583，与 W4 范围外发现互证）。采信。
- **W4**（77 行）：444 张表文件名+内容双狩猎 **0 个 ufo/catcher 表**——与主审结论一致（数据源是客户端 `package_difficulty` 表 + 服务端 rewardPool，不是独立配置表）；范围外发现 index.js:87585 入口。采信。
