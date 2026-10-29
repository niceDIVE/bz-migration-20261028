# R03 采纳台账（回执：`docs/sota/inbox/R03-reply.txt`）

> 2026-10-22。本批回执审的是「打怪掉落去重 / 进程内推送 / Repeat 奖励 / Q7 落地 / 入口枚举」。
> 落地版本 `impl=h2666716f`（热重载 357 ms，pid 不变，存档 md5 未变）。
> 证据：`tools/facts/r03-rewardpath.json`、`tools/facts/r03-accept-sites.json`。

## 一、采纳（5 条，已全部落地）

| # | 回执要点 | 我方核实 | 处置 |
|---|---|---|---|
| A-1 | 「同一 npc + 5 秒窗口」是硬伤：既误挡快速连打，又漏挡 >5 秒的重发；且进程内 XHR 下重发本不存在 | 客户端 `CheckBattleResult` **只有一处发送点**（index.js:69196，战斗结束事件）；三包 `retry/resend/onTimeout` **0 命中**；HTTP 封装的"重发"只挂 `onerror/ontimeout`，而进程内应答同步 200，错误路径永不触发 | **整段删除**去重（`DROP_DEDUP_MS` 与 `save.lastBattle` 一起删）。每个 `win=1` 入账一次 |
| A-2 | 掉落既不回 `rewardArray` 也不推送 → 玩家看不到战利品 | 战斗结算消费端 index.js:89553-89561 明确读 `o.rewardArray` / `o.equipObj` 渲染结算界面，缺了显示"无奖励" | **已回**：`rewardArray` 放背包物品、`equipObj` 放装备（`{uid:[1,num]}`，与模板同形） |
| A-3 | D + 一次封顶会让 `rewarded` 不在 `done` 里 | 我方**从来没有** `rewarded ⊆ done` 断言（不是被放宽） | **已补**：自检新增 `task:reward:subsetDoneOrRepeat`（`rewarded ⊆ done ∪ RepeatIds`），自检 1113→**1115** |
| A-4 | `Math.random` 让自检/测试不可复现 | 成立（我上一轮的 `drop:granted` 只是恰好用了必得样例） | **已做**：`env.random` 可注入（生产 `Math.random`），单测用固定种子 |
| A-5 | 补回 4015/4016 不属于"不可区分"的增加，符合 Q7 | 成立（数量可从配置 + `rewarded` 重算） | 维持 |

## 二、驳回（2 条，各带反证）

| # | 回执要点 | 反证 |
|---|---|---|
| R-1 | 推送若早于客户端处理 `rewardArray`，奖励物品会被显示两次 | 本作**奖励展示不写背包模型**：`addShowRewardUI1`（index.js:131621-131632）只转调 `showReward`，而 `showReward`（3395-3404）只 `prefabs.load("RewardUI")` + `setRewardContent` —— 体内无 `setItem` / `.numbers` / `getItemNum` 任一处写入。所以不存在"推送 + 回调"双写 |
| R-2 | 「`rewarded ⊆ questDone` 这条断言要么在报错，要么已被放宽」 | 两者都不是：**我们从未建立过这条断言**。本批已按它的建议补上（见 A-3），并把 Repeat 任务纳入豁免 |

## 三、待证 / 未决（4 条）

| # | 事项 | 现状与下一步 |
|---|---|---|
| D-1 | **Repeat 任务的奖励上限**（回执认为一次封顶会让重复任务残废） | 未改。回执给的三条替代：①用 `Chain` 做周期 ②从第二次起按 `C=need` 扣真实库存 ③无成本任务每服务器日一次。三条都需先查 `Chain` 语义与 66 个任务的 `Chain` 是否能连成环 —— 未做 |
| D-2 | 774 个指不到任何表的 `Reward` | 回执给三种解释（服务端专表 / 复合编码 / 非主键列）与检查法；未执行。判据也已给：**非 Repeat 挂起进 `rewardPending`、Repeat 直接跳过**（挂起要能确定补几份） |
| D-3 | Q6 入口枚举 | 工人已交付原料：接任务只有**一个发送函数** `reqGetTask`（index.js:133607-133617），字面调用点 4 处：`taskClickEvent`(133139)、`startAfterFinishDialTT`(135226)、`closeTaskCartoon`(scripts2:70683)、`closeTaskShowUI`(scripts2:71160)；仅最后一处的同函数体内出现 `receive_action`。**回执的正确结论已成立**：`Pre-Require` 不是入口，只是门控 —— 我之前的"可达性"口径彻底作废 |
| D-4 | A7（卖出铜钱按截断数量） | **实现里没有铜钱结算**：`saleItem` 只扣物品、不加钱。所以 A7 目前是空的；"卖东西＝白扔"是独立问题，尚未处理 |

## 四、本轮验收

| 项 | 结果 |
|---|---|
| 构建自检 | **1115** 全绿（新增 `drop:inResponse`、`task:reward:subsetDoneOrRepeat`） |
| 单测 | `drop-table` 6→**8 条**（新增：应答含战利品、不去重、随机源注入两向）全过；其余 7 套全绿 |
| 端上 | `reload 357 ms`、`pid 8576` 未变、`selfCheck 1115`、存档 md5 `dec9d1c6…` 未变 |
| 备份 | `_backup\2026-10-22-0525-pre-r03\`（core 6 个 + test 9 个 + handlers.js + 设备存档） |
