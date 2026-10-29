# v2.7 执行记录（对应上游 `_incoming\v2.7-20261025\01-...txt`）

> 部署 `impl=h55945933` ｜ `flow=ffaec47c3` ｜ 进程 pid 2655
> ⚠ 本轮开始前**模拟器整个进程树已经没了**（不是掉线，是 `MuMu*` 一个进程都没有），
>   已按 HANDOVER §9 用 `启动模拟器-独立.cmd` 里那条 `MuMuManager control -v 1 launch`
>   经 WMI 拉起（那个 .cmd 本身有编码问题，注释行会被当命令执行 → 只好直接调它的内容）。
>   冷启动后 `run.ps1 all` 重推 bootstrap+handlers+flow，pid 由 6188 变 **2655**（进程重启了，
>   这是模拟器冷启动的必然，不是热重载）。

---

## 一、C02 环任务发奖接线（做完了）

### 实现
新增两个模块级函数，**投射与发奖共用同一个档位键**：

- `circleTierKey()` —— 当前档位键（角色等级未建模 → 恒取最低段）
- `circleTierKeyFor(tid)` —— 某条环任务 id 对应的档位键
- `taskRewardPairs(tid)` —— **所有发奖口的唯一奖励来源**：
  - 真任务 → `BZ_TASKS[id].r`
  - 环任务 → `BZ_CIRCLE_TASK[当前档位]` 的 `m`/`e`/`p` → `[[4001,m],[4002,e],[4003,p]]`

顺手把原来**4 份重复**的 `var rw = BZ_TASKS[...]` 循环收敛成一次调用（`circleTaskAward` /
`getCircleTaskAward` / `getRogueFinishTaskAward` / `quickFinishTask`）。

### 货币口径（这是上游点名的「和 C01 同口径」）
| 是什么 | 物品 id | 存档字段 | `note.eco` 键 | 依据 |
|---|---|---|---|---|
| 银两 | **4001** | `coins` | `coins` | `CURRENCY_SLOTS`；`buyShopItem` 扣的就是 `s.coins` |
| 经验 | **4002** | —— 无 | —— | **故意不在 CURRENCY_SLOTS**（存档无 exp 字段） |
| 潜能 | **4003** | `potential` | **`ptt`** | 客户端 ECONOMY_CHNG 只认 `ptt`，发 `potential` 会被丢弃 |

### ⚠ 经验 4002 的已知留白（必须让上游知道）
4002 会进 `ra`（奖励窗能显示"获得经验 N"），但 **`grantCurrency` 返回 null → 不持久化**。
理由：存档没有 exp 字段、LoadGame 也无处投射；塞进背包会变成一件叫「经验」的假道具
（代码里明文禁止这个模式）。**没有拿它去凑数**，如实留白。
（补充证据：`BZ_TASKS` 674 条奖励里 4002 出现 **0 次**，全工程没有先例。）

### `quickFinishTask` 的闸换条件
原来是「id 不在 `BZ_TASKS` → 不扣钱」。现在环任务有奖励了，改成
「`taskRewardPairs(tid).length === 0` → 不扣钱」：环任务正常收 50 元宝，真正无奖励的 id 仍一分不收。

### 冒烟（`test/circle-task.js` 11 → **15 条**）
替换掉 v2.6 那条「环任务不扣元宝」（接线后它会挡住正确行为），新增：
```
ok 【v2.7 发奖接线】接→領：发的数必须等于 circle_task 当前档位表值
ok 【v2.7】領→再接→再領：第二接被拒、存档逐字节不变
ok 【v2.7】每日上限：CIRCLE_DAILY_MAX 次之后必须拒绝且不再发钱
ok 【v2.7】quickFinishTask 对环任务正常扣 50 元宝并发表值奖励
ok 真正无奖励的 id 仍不许扣元宝（保护闸保留）
```
实测（档位 1：m=125 e=50 p=50）：领奖后 `coins +125`、`potential +50`、`rewardObj={"4001":125,"4002":50,"4003":50}`、
`note.eco={"coins":1125,"ptt":150}`；再领 `eRet=4`；每日恰好发 20 次后 `eRet=4` 且不再发钱。
设备端实测 `getCircleTaskList` `eRet=1 cNum=3 taskArr=3`、未接取时 `circleTaskAward(9001)` 回 `4`，**存档 md5 未变**。

---

## 二、C03 补表（按上游「找不到就只 ack」执行）

| 动作 | 找到的表 / 键 | 结论 |
|---|---|---|
| `TowerBattleResult` | **全 dump 444 张表里没有任何表提到 tower/climb/sweep** | 没表 → **只 ack** |
| `chanllengeTower` | 同上 | 没表 → 只 ack |
| `choosePandaEvent` | `lh_panda.json` 存在但只有 `raio/event/name`（比例↔事件映射），无奖励列 | 只 ack |
| `activateTowerEvent` | 无塔层事件表；`lh_event.json`(188 行, 有 `reward` 列) 是候选但**无法证实**它就是塔层事件表 | 只 ack |
| `mulitiNpcBattleResult` | reqKeys = `{gTime, speed, hgtimes}`（index.js:89349-89357）→ **无 npcID** | 只 ack |
| `goodAndEvilBattleResult` | reqKeys = `{mplimit, mp, hp, hplimit, loss, hg, hgtimes, gTime, hpmax, win, actionArr, seed, aDmgReceived, bDmgReceived}`（index.js:101391-101406）→ **无 npcID**；`prestige/contribution` 客户端**只读不传** | 只 ack（回 0） |
| **`rogueBattleResult`** | reqKeys = **`{npcID, win}`**（index.js:105598-105602）→ **有 npcID** | ✅ **接 `BZ_NPCDROP`** |
| `GetRandomEventAward` | 找到 `adventure.json`（109 行，行键=**adventureID**，含 `awardwin/awardfalse/award/award2/award_add` 奖励列） | 见下 ↓ 仍不发 |

### ★ 必须纠正我上一轮的一个判断
v2.6 回执里我写「`award` 是客户端自己塞的数值，照发就是教科书式白拿」。**这个说法不准确**，
`award`（形参 `e`）其实是个**小整数分支码**，不是金额：

```
index.js:88678  successFuncCallBack → reqAdvReward(advCurId, 1)   // 战斗成功
index.js:88703  failFuncCallBack    → reqAdvReward(advCurId, 2)   // 战斗失败
index.js:88635  reqAwards           → reqAdvReward(advCurId, 3)   // 领取
index.js:88593  getRewardData(5)    → reqAdvReward(advCurId, 5)
```
服务端要用的是 **`adventureID` 这个可校验键** + 分支码选列（1→`awardwin`，2→`awardfalse`）。

### 那为什么 GetRandomEventAward 仍然不发？
不是找不到表，是**编码对不上**：奖励列的 item id 是 **1..5**（如 `awardwin=[4,1]`、`award=[2,20000]`），
而 `item.json` 里 1..5 是 **Type 6..12 的占位资源**，`CURRENCY_SLOTS` 只认 1/4001/4003/8888。
于是：
- `[4,1]` → `isCurrencyItem(4)=false` → 走 `grantItem` → 变成背包里一件 id=4 的**假道具**
- `[2,20000]` → `isCurrencyItem(2)=true` 但 `currencySlot(2)=null` → 钱不入账，只在 `ra` 里显示

两条都是本工程明文禁止的模式（"宁可明确拒绝，也不许塞进背包变成永远不生效的假物品"）。
→ **保持只 ack**，并把这张表和分支码映射报给你，等你定 1..5 各该进哪个钱包字段。
`award` 的值现在只打日志。

---

## 三、算法 v2.7

工作区：`_incoming\v2.7-20261025\work\bz-oracle\`（整棵复制 v2.6，**只**覆盖
`forge/analysis/{extract_shape.py,README.md}`，`out/` 沿用 —— v2.6 原件存 `_backup\20261025-234500-pre-algo-v27\`）

### stdout（18.2s，exit 0）
```json
{"actions": 488, "kinds": {"container": 208, "array|object|array|string": 170, "array|array|string": 26, "array|string": 19, "array|object": 27, "array|array|object|array|string": 10, "scalar": 47, "": 12, "array": 31, "array|object|object|scalar": 4, "array|object|array|string|scalar": 4, "object": 4, "array|array|object": 2}, "unsafe": 444, "unsafeByCrash": 313, "unsafeByRetry": 211, "zeroIsWrong": 517, "note": "正则启发式【推断】；consumedAt 是复核用的落点"}
```
对比：v2.6 `actions 649 / unsafe 625`（无拆分）→ v2.7 `488 / 444（313+211）`。
`kinds` 与 `zeroIsWrong` 与 v2.6 **逐项相同**，说明字段分类没变，变的只是重发判据收紧后
一部分动作不再被算进来。⚠ `unsafeByCrash + unsafeByRetry = 524 > unsafe 444`，两类的**重叠**部分
你没有说明口径，我不猜。

### `--trace User.getBigGrowupData`（stderr 原样）
```
[trace] User.getBigGrowupData 补抽: 展开 index.js:55267..55272，数据形参 e
[trace] User.getBigGrowupData 契约字段=[] 补抽=True → ['paystata']
[trace] User.getBigGrowupData.paystata @ index.js:55269 exprs=['\\.paystata\\b', '\\[\\s*["\\\']paystata["\\\']\\s*\\]'] this=[] kinds=[]
[trace] User.getBigGrowupData.paystata 全局 2 处 kinds=[]
[trace] User.getBigGrowupData 发送 index.js:55306 所在函数 reqBigGrowUpData@55305 调用方=['index.js:55258', 'scripts2.js:26756', 'scripts2.js:46175']
[trace] User.getBigGrowupData   调用方 index.js:55258 判空=否：this.reqBigGrowUpData();
[trace] User.getBigGrowupData   调用方 scripts2.js:26756 判空=是：} else if (this.itemList[this.index].length > 0) for (e = 0; e < this.itemList[this.index].length; e
[trace] User.getBigGrowupData   调用方 scripts2.js:46175 判空=是：} else 1 == t && a.GrowthModel.reqBigGrowUpData();
[trace] User.getBigGrowupData 发送点=['index.js:55239', 'index.js:55306'] 重发判定=['scripts2.js:26756→index.js:55306']
```

**你说的那点确认了**：`scripts2.js:46175` 这一轮**确实被判了（判空=是）**，v2.6 时被前一个调用方 break 掉了。

**但有一处对不上**，请核：`26756` 和 `46175` 都判「判空=是」，`重发判定` 里却**只有 26756**。
按你 §三 的说法「`1 == t && reqBigGrowUpData()` 这种条件短路也算重发」，
`46175` 正是这个形态（`} else 1 == t && a.GrowthModel.reqBigGrowUpData();`），应该也在里面。

---

## 四、门禁与验证

| 项 | 结果 |
|---|---|
| `test/circle-task.js` | **15/15** |
| `test/c03-smoke.js` | **11/11**，连跑 5 次全绿 |
| `acceptance` | **42/42 绿**，连跑 3 次稳定 |
| `check_reject_codes` | OK（42 / 46 / 72） |
| `check_shape_freeze` | diff 0 |
| 热重载 | `pid 2655→2655`、`h7d3fb549→h55945933`、`selfCheck 1264` 全过 |
| 设备端 | `getCircleTaskList` 3 行；未接取领奖回 4；存档 md5 未变 |

### 一个自己踩自己发现的坑（值得记）
`c03-smoke` 里我把 `rogueBattleResult` 放进了「伪造战果不发奖」那一条，并传了真 `npcID:1002`。
接线后它会按掉落表掷骰 → **掷中就红、掷不中才绿**，是条看脸的 flaky 用例。
第一次直接跑刚好没掷中，是 `acceptance` 把我抓出来的。已改成：无键的结算口才断言不发，
有 `npcID` 的单独一条只断言「客户端塞的数字进不了钱包」。
