# R02 采纳台账（回执：`docs/sota/inbox/R02-reply.txt`）

> 2026-10-22。本批回执审的是「SpRequire 语义 / 派生叠加（P0）」。每条给：回执原话要点 → 我方核实证据 → 处置。
> 证据文件：`tools/facts/r02-hostside.json`、`tools/facts/r02-clientpaths.json`、`tools/facts/r02-bagwriters.json`、
> `tools/facts/r01-screen.json`。行号均为解包后真实行号。

## 一、采纳（9 条）

| # | 回执要点 | 我方核实 | 处置 |
|---|---|---|---|
| A-1 | 事实 A/D 的证伪成立（Type3 的 SpRequire 是怪物 id；V1 是数字巧合） | `judgeTaskFinishRequire` 按 Type 分流（index 134394-134426）；对照组 44.1% vs 缺失组 97.6%，98.2% 落在 `Fight` 值域 | 采纳，已写进 09 号材料 |
| A-2 | **硬伤一**：叠加没按 Type 过滤会造幽灵物品 | `BZ_TASKS` 682 条里带 `n` 的 544 条，**12 条是 Type=1**（110080/110530/111710/112820…） | 采纳 → 改动 A（生成器只对 Type 2/12/13 出 `need`） |
| A-3 | **硬伤二**：`acceptTask` 应答不带物品 → 局中接任务拿不到叠加 | `getTaskCallBack`（133338-133382）只消费 `eRet/triggerBoxs/skillId/CDTime/serverTime`；无通用物品钩子（通用 dispatch 只有 2 条 `INVENTORY_CHNG`） | 采纳 → 改动 B（进程内推送），待批 |
| A-4 | **硬伤三**：卖出的铜钱要按截断后数量算 | 我方 `saleItem` **根本不给铜钱**；且请求形状解析错（实测见下） | 部分采纳 → 改动 C；铜钱结算单列（改动 C2，未批） |
| A-5 | Q4(a)：没有配置声明时，TaskGrant 与凭空发放无区别 | 任务表 40 个非 SpRequire 列无发放声明；V1 对照实验已否 | 采纳（我方 08 号的 TaskGrant 方向一并撤回） |
| A-6 | Q4(b)：只显示不落库的叠加比落库更保守（可逆性 + 可区分性） | — | 采纳，已按此实现 P0 |
| A-7 | Q4(c)：优先做「物品开启型」来源，前提是 item 表有列引用 drop | **前提未证实（我先前报的 98.1% 是错的，见第六节）**：`decompose` 非零值 127 个、去重 13 个，**没有一个能在 drop 主键里找到** | 方向暂缓，改走 `npc.Drop`（251/280 可解析） |
| A-8 | Q5：选 ②+③（不持久化 fightTaskObj、交任务不校验） | 三包里没有任何应答字段给 `fightTaskObj` 赋值（只有 7 处，全在 index.js 且在战斗/完成路径） | 采纳，维持现状，不改 |
| A-9 | Q6(a)：不要把死任务从叠加里排除 | 叠加只针对进行中任务，死任务不可能在 `accepted` 里 | 采纳（另发现我们的"死任务"数本身不可信，见 D-6） |

## 二、驳回（3 条，各带反证）

| # | 回执要点 | 反证 | 处置 |
|---|---|---|---|
| R-1 | Q2(a)：当错误分支只弹提示时，「拒绝(eRet≠1)」比「截断」后果更小 | 本作**没有**"只弹提示"的错误分支：`User.saleItem` 回调（64726-64742）只有 `eRet==1/5/6`，其余静默；`User.useItem`（64754-）只有 `if (1==eRet)` | **保留截断**。拒绝 = 玩家点了没反应且无提示，比"数量不变"更糟 |
| R-2 | Q1 条件②：Type 12/13 在 `updateTaskData` 里可能有扣物品分支 | `updateTaskData`（134522-134554）只有 `case 2/3/5/6/7`，**无 12/13** | 条件不成立，C=0 不受影响 |
| R-3 | Q1 条件③：`finish_action`/`CompletionEvent` 可能含扣物品逻辑 | Type2/12/13 共 532 行，`finish_action` **全部 `[]`**；`CompletionEvent` 非空仅 13 条，值为事件串（如 `2148,0,4,12078`） | 条件不成立；13 条的处理函数另列为待证 |

补充驳回（Q6(b)）：回执认为"死任务可能由 `Chain/CompletionEvent/finish_action/receive_action/transfer` 等事件列接取"。
按它给的方法（死任务 id 在可达任务这些列里作为 token 的比例 + 随机对照）跑：**7 列全部 0% vs 0%**，无信号。
不能排除（这些列可能存 action id 而非 task id），但不作为当前方向。

## 三、待证 / 未决（4 条）

| # | 事项 | 现状 |
|---|---|---|
| D-1 | Repeat≠0 任务的账本语义 | 客户端 `updateTaskData` 是 `if (0 == t.taskObj.Repeat) { finishTaskObj[o]=e; ... }` → **重复任务客户端不记完成**；我方无论 Repeat 都写 `done` → 与客户端分叉（改动 D，待批） |
| D-2 | 我方 `rewarded` 是"一次封顶" → 66 个 Repeat 任务的刷奖励循环**本来就没开**，但正常重复奖励也被误伤 | 需与 D-1 一起定 |
| D-3 | 13 条 `CompletionEvent` 非空的 Type2/12/13 任务，其事件处理函数还没查 | 低优先 |
| D-4 | 商店表未导出（`BuyPrice` 有、货架清单没有）→ 19 条装备需求（全部是商店货）能不能真买到未知 | ✅ 已导出 11 张商店表（见第五节）；结论：只覆盖 96/433 种需求物品 |
| D-5 | `saleArr` 形状 bug：客户端发 `[[type,id,count],...]`，我方按 `{itemID,num}` 解析 | 实测：`[[1,4015,2]]` 卖出后背包不变；`{itemID:4015,num:2}` 才生效 |
| D-6 | **我方"死任务"口径作废** | 从根 BFS（任一父可达）= 2211；全满足语义 = 721；阈值语义 = 752（329 个任务带非 0 阈值）。三个数都不像真值 → 不用于任何过滤/统计 |

## 四、由此产生的改动（A–E）

| 编号 | 内容 | 状态 |
|---|---|---|
| A | `gen_task_rewards` 只对 Type 2/12/13 生成 `need`（条目加 `t`，Repeat≠0 加 `p`）；`needOverlay` 加 Type 兜底；自检加 `task:need:typeOnly` | ✅ 已执行（`hc356c004`） |
| B | `acceptTask` 后把叠加进程内推给活客户端（`!env.sandbox` 门控） | ✅ 已执行（`h210921ed`）：`pushItemsToClient` 只调客户端自己的 `InventoryModel.setItem`，接任务/交任务各推一次；自检沙盒 0 次推送 |
| C | `saleItem` 按真实形状 `[[type,id,count]]` 解析（type 2 = 装备实例 uid，卖掉要清槽） | ✅ 已执行（`hc356c004`） |
| C2 | 卖出结算铜钱 `Price × min(req, realBag)` | ⏸ 未做（经济类，需单独决定） |
| D | Repeat≠0 不写 `done`、交完从 `accepted` 移除 | ✅ 已执行（`hc356c004`） |
| E | 修正 09 号材料里的 `reachable=2211 / dead=2629` | 📝 随下一次发问一并更正 |

### A/C/D 的落地细节（`impl=hc356c004`）

| 位置 | 改动 |
|---|---|
| `tools/gen_task_rewards.js` | 新增 `NEED_TYPES={2,12,13}`；`typeMap` 仍收全部被引用物品（防 BZ_ITEMTYPE 缺项）；条目统一带 `t`，`Repeat≠0` 打 `p:1` |
| `core/bz-tasks.generated.js` | 重新生成：条目 682→**674**、带需求 544→**532**（与 Type2/12/13 任务数一致）、需求条数 **700**、repeat 标记 **72** |
| `core/bz-rpc-server.js` | `needOverlay` 加 Type 兜底；新增 `isRepeatTask`；`getFinishTaskAward` 对 Repeat 任务不写 `done` 并移出 `accepted`；`saleItem` 支持数组形状与装备 uid |
| `core/bz-handler-impl.js` | 自检新增 6 条：`task:need:typeOnly`、`task:need:fightNoOverlay`、`task:repeat:noDone`、`task:repeat:released`、`sale:arrayShape`、`sale:equipUid`；自检总数 1104→**1110** |
| `test/overlay-projection.js` | 9 条→**13 条**（新增 Type 过滤 / Type3 不叠加 / Repeat 账本 / 出售形状与装备槽） |

端上：`reload 237 ms`、`pid 24125` 未变、`selfCheck 1110` 全绿。
备份：`_backup\2026-10-22-0452-pre-r02fix\`（core 6 个文件 + 9 个 test + `patch/live/handlers.js` + 设备存档 + `HANDOVER.md.snapshot` + 旧 `gen_task_rewards.js`）。

## 五、D-4 结果：商店表已导出，覆盖率比预期低

导出方式：`hotfix-patch\probe\dump_shop.js`（只读探针，读 `CFMgr.dic`，不做 BFS；写设备 `files/shop_tables.json` 后 pull）。
产物：`tools\cfg\shop_tables.json`（71.5 KB，**11 张表 513 行**，2026-10-22）。

| 表 | 行数 | 主键含义 |
|---|---|---|
| `random_shop` | 237 | `ID` = **物品 id**，带 `npc / price / payment / limit / isserver` |
| `lh_shop` | 116 | `item` = 物品 id，带 `npc / price / probability / limit` |
| `mall` | 39 | `Data:[物品id, 数量]` + `Price` |
| `house_shop` | 27 | 同 `random_shop` 结构 |
| `ge_shop` | 25 | `Data:[物品id, 数量]` + `Price` + 门派/军衔门槛 |
| `shop` | 19 | 货架 → `Item:[物品id...]` |
| `sect_shop` | 13 | `item` + `price` + `sect_list` |
| `diceshop` | 14 | `data` = 物品 id |
| `shop_entrance` | 11 | 商店入口（`shop_ID / shop_type / shop_name`） |
| `sim_shopconfig` | 8 | 烹饪商店（按食材包） |
| `recruit_shop` | 4 | 招募商店（积分） |

覆盖率（`tools\facts\r02-shop-coverage.json`）：

| 口径 | 数 |
|---|---|
| 商店可买到的物品总数 | **410** |
| Type2/12/13 需求物品种类 | 433 |
| 其中商店能买到 | **96（22.2%）** |
| 需求里的装备（item.Type=1） | 15 种 |
| 其中商店有货 | **2**（2001、1105） |
| 其中出现在 drop 表（可掉落/奖励） | 13 |
| 既无奖励链、也不在商店 | **272** |

⇒ 修正我在 09 号材料里"19 条装备需求全是商店货"的说法：**那是物品表的 `BuyPrice` 字段，不是货架清单**。
实际只有 2 种装备在商店里；13 种要靠掉落表（`2001` 出现在 97 张 drop 表里）；**1407 / 2114 两种在任何已导出数据里都没有来源**。
## 六、更正：我在 09 号材料里报的「decompose 98.1% 命中 drop 主键」是错的

**错在哪**：drop 主键里**含 0**（`sampleKey: "0"` 就是它），而 6525 个物品里绝大多数 `decompose` 都是 `"0"`。
我把 0 也算成"命中"，于是 6398/6525 这个数几乎全是零值贡献的。

**去零重算（`tools/cfg/drop_tables.json` 现场导出的 dic.drop，587 行）**：

| 列 | 非零值 | 去重 | 真正命中 drop 主键 | 结论 |
|---|---|---|---|---|
| `decompose` | 127 | 13 | **0** | 它引用的 7366-7371 / 6582 / 8047-8052 **在 drop 表里一个都没有** |
| `decomposition` | 465 | 29 | 7（1,2,3,4,5,10,6,20… 全是小整数，属撞号） | 同样不成立 |

另外确认：**设备上的 `dic.drop` 就是 587 行**，和本地 `tbl_drop.json` 一致，不是我上次导漏了。

**顺带查到的两个真问题**（都比"拆解"重要）：

1. **790 个任务的 `Reward` 不在 drop 主键里**（1281 个非零 Reward 中），其中 **774 个既不是 drop id 也不是 item id**。
   探针 `probe/find_ids.js` 在 454 张表里按主键找 100507 / 8257 / 103847 —— **一张表都没有**。
   ⇒ 这 774 个任务现在**发不出任何奖励**（生成器只能跳过），是任务奖励链的真实缺口。
2. **`npc.Drop` 可用**：867 个 npc 引用 280 个不同 drop id，**251 个能在 drop 表里解析**，
   展开后能产出 **154 种物品**（其中 19 种 probability>=100 = 必得）。这是目前唯一"数据齐全、可直接接"的来源系统。

⇒ 原定的"统一 drop 展开入口"方向不变，但第一个消费者从「拆解」改成「打怪掉落」。
## 七、统一 drop 展开入口 + 打怪掉落入账（`hd243721b`）

**入口**（`core/bz-rpc-server.js`）：`grantFromDrop(s, dropId)`
- 数据：`BZ_NPCDROP = {npcId: dropId}` + `BZ_DROP = {dropId: {物品id:[数量, 概率]}}`（`tools/gen_task_rewards.js` 生成）
- 规则：概率 `>=100` 必得；`<100` 用 `Math.random` 掷点（原版就是掷点，不假装必得）
- 装备（`item.Type=1`）走 `grantItem` 分流进 `PlayerEquip`；货币 id 不收

**第一个消费者**：`CheckBattleResult`
- 请求实测带 `{win, npcID}`（REQ 日志）；`win=1` 时按 `npc.Drop` 发奖，`win=0` 不发
- **去重窗口 5 秒**（`DROP_DEDUP_MS`）：同一 npc 在窗口内重复结算只结算一次，写 `save.lastBattle={npc,t}`
  —— 这是对 B01「战斗结算无法去重」的工程折中：不追求全局唯一，只挡"客户端重发/重试"

**数据规模**（生成物 `core/bz-tasks.generated.js` 31 KB → 52 KB）

| 项 | 数 |
|---|---|
| 有 `Drop` 的 npc | 867 |
| 能在 drop 表里解析的 | 772（97 个 drop id 表里没有） |
| 映射后的 npc 条数 | **770** |
| 用到的 drop 表 | **249** |
| 必得条目（prob>=100） | 19 |
| 概率条目 | 450 |

**验收**
- 自检 1110 → **1113**（新增 `drop:granted` / `drop:dedup` / `drop:loseNoDrop`）
- 新单测 `test\drop-table.js` **6/6**（发奖 / 5 秒去重 / 超窗口可再发 / 输了不发 / 无掉落表不崩 / 数据自洽）
- 端上 `reload 210 ms`、`pid 24125` 未变、自检 1113 全绿
- 备份：`_backup\2026-10-22-0452-pre-r02fix\`（本轮改动前的那一份仍是它；本轮只新增生成物与 handler 段落）

**已知限制**
- 概率掉落用 `Math.random`，同一 npc 两次真战斗结果可能不同（原版也是随机，可接受）
- 97 个 npc 的 Drop id 在 drop 表里不存在（导出表只有 587 行，`dic.drop` 现场核对过，不是导漏）
- 掉落直接进账本、不在应答里回 `rewardArray`，所以客户端**不会弹掉落界面**（数值会随下次同步生效）