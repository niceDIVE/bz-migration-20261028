# AGENT 交接：2026-10-25 第三次会话（C05 收尾 + 第 3 批 C02 任务主线 + 算法 v2.4/v2.5）

> ⚠⚠ **本文已被取代，别照这篇干活。** 现行版本是 `HANDOVER-SESSION-2026-10-26.md`
> （含：§6.1 circle_task、C02 堵口、第 4 批 C03、第 5 批 C16、算法 v2.6/v2.7、回执打包惯例）。
> 本文只当历史读。文内 `impl=h87a9cb11`、`pid=6188`、「拒绝点 63」、「存档 md5 0F143054…」均已过期。

> **给下一个 Agent 的**，不是给用户的。读完这一篇就能接手，不需要读对话记录。
> 项目根：`F:\BaoZouyxt` ｜ 补丁工程：`F:\BaoZouyxt\hotfix-patch` ｜ 上游包：`F:\BaoZouyxt\_incoming\`
> ⚠ 同日 `HANDOVER-SESSION-2026-10-25-B.md`（第二次会话）**已被本文取代**。更早的只当历史读。

---

## 0. 三十秒接手

- 游戏在 **MuMu 模拟器**，adb `127.0.0.1:16416`（**adb 有 root**），包名 `com.maple.madherogo`。
- 线上 **`impl=h87a9cb11`**，`flow=ffaec47c3`，selfCheck **1262** 全过，`implErr=null`/`flowErr=null`。
- 验收 **40/40 绿**，形状冻结 **diff 0**，`check_reject_codes` OK（动作 39 / 条目 43 / 拒绝点 63）。
- 游戏 pid **6188**。本会话全程热重载，**从未重启过进程**。
- 第 2 批 C05（24 个）**已验收通过**；第 3 批 C02（19 个）**已完成并部署**。
- 你现在大概率要做的：**① 把两个包发上游 ② 补 `circle_task` 表**（唯一已知欠账，材料齐了，见 §6）。

---

## 1. 当前部署状态（可核，别凭记忆）

| 项 | 值 |
|---|---|
| `impl` / `flow` | **h87a9cb11** / ffaec47c3（`.\run.ps1 cmd "ver"` 验；别看 `ready.json`，它是加载时写的） |
| selfCheck | **1262** 全过，`failed=[]` `missingRequired=[]` |
| 验收 | **40/40**，known-red 0，cap 0 |
| 冻结 | C1–C8、C10–C13 全过（C9b 未实现） |
| `core\bz-rpc-server.js` | **259,214 B** md5 `F214299DC9015A6C7523189E1BFB73BA` |
| `patch\live\handlers.js` | **1,151,474 B** md5 `D07EF03BD6942664F9892D85D71B3B13` |
| `core\bz-shops.generated.js` | 70,505 B md5 `574735103237731E30C1DADB109756EC` |
| `core\bz-tasks.generated.js` | 640,516 B md5 `4486247F701441F09B84278CCDAB98D5` |
| 存档 | roleID 16374 / FZhou，`school=1`、`snowBall=50`、`snowBox=3`、`snowLevel=1`、`snowHp=1000`、`rogueBag.1001=5`、`bag.7602=10`、`contribution=99999` |

---

## 2. 本会话干了什么

### A. 第 2 批 C05〔道具使用〕收尾（上游已验收通过）
- 新写 12 个 handler：`rgUseItem` `UseSnowBall` `UseBatchSnowBall` `UseAllBall` `useItemAddition` `BackToLogin` `accountLogOff` `quitSchool` `CheckOnHook` `rgSycnWaitData` `getSnowAward` `enterSnow`
- 新增生成表 `BZ_SNOWMAN`（11 档）/ `BZ_SQUARE_BALL`（6 档），走 `tools/gen_shop_tables.js`
- **自己引入又自己修掉的 bug**：`grantRewardList` 内部会写 `note.eco[k]`，而我的 `note` 只建了 `skch/ivch/eqch` → 货币奖励分支抛 TypeError（领雪球盒奖励发不出钱）。4 处 `note` 全部补 `eco: {}`。
- `useItemAddition` 的道具 id：**176 → 7602**，且单位从"件数"改成**百分点**（`itemAddition = use * 10`）。证据：`index.js:121375` 与 `scripts2.js:4805` 两处独立 `itemId: 7602`；`scripts2.js:607` `10 * this.useItemNum + "%"`。
- 新增 `test/c05-smoke.js`（16 条）

### B. 第 3 批 C02〔任务主线〕19 个 → 3 已有 + **16 新写**
- 已有 3 个（未改代码）：`GET_TASK`→`acceptTask`、`FINISH_TASK`→`getFinishTaskAward`、`SYCN_TASK`→`sycnTask`
- 新写 16 个，线上名（= H 表的键）：
  `getCircleTaskList` `getSchoolTask` `hideTask` `acceptCircleTask` `circleTaskAward` `getCircleTaskAward` `acceptSchoolTask` `onekeyCompleteSchoolTask` `schoolTaskComplete` `refreshSchoolTask` `schoolTaskAward` `changeDelegateTask` `delegateTask` `quickFinishTask` `rogueAcceptTask` `getRogueFinishTaskAward`
- **存档模型**：任务只存 `s.accepted` / `s.done` 两个 id 数组；`taskLog`/`finishTaskObj`/`acceptTaskArray`/`acceptTaskOrder` **在存档里不存在**，是应答时动态投射的。
- 奖励表：`BZ_TASKS[id] = {t:类型, r:{物品id:数量}}`，货币 id 由 `grantRewardList` 自动进钱包。
- 防白拿设计：**先验在 `s.accepted` 里，才许发奖并移入 `s.done`**；`schoolTaskAward` 故意不发奖（避免第二个发放出口）。
- `quickFinishTask` **改成元宝购买**（见 §4 新规矩）：元宝够 → `eRet:1` 扣 50 元宝 + 发任务奖励 + 移入 done；不够/未接过 → `eRet:2`（客户端 2 就是 `openChargeList`）。
- 新增 `test/c02-smoke.js`（13 条）

### C. 算法 v2.4 / v2.5 回执
- v2.5 `extract_shape` stdout：`{"actions": 235, ... "unsafe": 204, "zeroIsWrong": 336}`，耗时 13.4s
- `--trace User.passCardData` → `契约字段=[] 补抽=False → []`（**补抽没触发**）
- `--trace User.getBigGrowupData` → `补抽=True → ['prototype']`（**抽到正则假字段**），且**重发判定=[]**（该动作空数据会 14~15ms 重发死锁，`scripts2.js:46175`）
- 归因：我们这份 `out/contracts.json` 里这些契约 `fields: []` 为空，v2.4 时"锅里没米"

---

## 3. 上游进度与下一步

| 批次 | 状态 |
|---|---|
| 第 1 批 C01（商店交易 27） | ✅ 已交 |
| 第 2 批 C05（道具使用 24） | ✅ **上游已验收通过**（无白拿/无写坏存档） |
| 第 3 批 C02（任务主线 19） | ✅ 已做完并部署，包待发 |
| 第 4 批 C03（战斗结算 19） | ⬜ 上游未派，**别抢跑** |

### 两个包待发（用户负责发，我没有上行通道）

```
F:\BaoZouyxt\_incoming\v2.5-20261025\第3批C02-回执-20261025.zip        93,115 B  md5 1C959DD3CCA995DE1D4E57FEBEB2F500
F:\BaoZouyxt\_incoming\v2.5-20261025\算法v2.5回执+C05补正-20261025.zip  89,071 B  md5 7513EA90BED9C3E986B25D4FC0F77E2A
```

⚠ 更早的 `第2批C05+算法v2.4-回执-20261025.zip` 里是**旧 server**（itemId 还是 176、md5 `D3DE6626…`），**已作废**，别发。

---

## 4. 用户裁定的新规矩（本会话新增，优先级高）

1. **原版要求"真实付费"的功能，一律改成金条/元宝支付**，不要留成"回 eRet 让它弹充值框"的死功能。
   理由（用户原话）：离线版的充值本身没意义；元宝/金条以后会在剧情里掉落。
   已按此实现：`quickFinishTask` = 50 元宝。**以后同类问题直接这么做，不用问。**
2. **用户不做逐个动作的手工测试。** 逐动作验证必须自动化（`test/*-smoke.js` 走真实 dispatch）。
   用户愿意做的是"写完代码后自己玩一遍"，那是正常反馈，**不要给他逐项清单**。
   事故背景：上一任曾在服务器上让用户一个个点、一个个核对应答，把他折腾坏了。
3. 常规工作（写码、跑流水线、热重载、打包）**不用逐步请示**，做完报结果即可。

---

## 5. 坑表（本会话新增，按踩坑概率排序）★ 最值钱

1. **注册名 ≠ 线上名（本会话最大杀手）**
   dispatch 是 `H[action]`，`action` 是**线上名去掉 `User.` 前缀**（`bz-rpc-server.js:3757` 区，日志 `'dispatch User.'+action`）。
   照注册表的大写名注册 = 静默落进 `SHAPED`/`UNKNOWN`，一条都不生效。
   实例：`GET_TASK`→`acceptTask`、`FINISH_TASK`→`getFinishTaskAward`、`LEVEAL_SCHOOL`→`OutSchool`、
   `CLEAR_SXHOOL_CD`→`clearGeSchoolClothing`、`GET_SNOW_REWARD`→`getSnowAward`、`SNOWACTIVE`→`enterSnow`、
   `SWAP_SKILL_PROGRESS`→`skillChange`、`CIRCLE_TASK_TASK`→`circleTaskAward`。
   **我自己也踩了**：第一次盘点"哪些 handler 已有"时用注册名 grep，把 `OutSchool`/`clearGeSchoolClothing` 误判成"没有"。
2. **`bz-rpc-server.js` 是纯 LF 文件，`Get-Content` 行号会少算**（实测 3168 vs 真实 4105）。
   引行号一律用 `read` 工具或 `Select-String`，**绝不要用 `Get-Content` 数组下标**。
3. **游戏显示文案表不在 dump 里**，所有"看客户端提示文案决定行为"的指令**执行不了**。
   `dump\languageList.json` 只有 3 行语言清单，自己还要再转 `des:9042/9043/9044`，不含实际字符串。
   全 444 张表搜 `"6114"` 只命中 `item.json`（物品 id，无关）。→ 这类指令要向用户/上游要替代判据。
4. **`guardSave` 禁止 `done` 数量减少**（`bz-rpc-server.js:344`）。写测试时**不要用"手动清空 accepted/done"来隔离用例** ——
   `persist()` 会回滚内存，看起来像 handler 失效。正确做法：每个用例用不同任务 id。
   （`c02-smoke.js` 第一版就是这么误报的，已修并写进注释。）
5. **`grantRewardList` 要求 `note` 带 `eco:{}`**，否则货币奖励分支抛 TypeError。家法 §2 本来就要求回 `note.eco`。
6. **`bump` 独立 `require` 的测试必须 `vm.runInThisContext` 注入生成表**，否则 handler 里 `typeof BZ_XXX !== 'undefined'`
   守卫会把表当不存在、奖励分支静默跳过。要注入：`bz-shops.generated.js` / `bz-shapes.generated.js` / `bz-tasks.generated.js`。
7. **测试存档键必须问服务器要**：`createBzServer(env)._internal.SAVE_KEY`。
   写死 `'bz_offline_save_v1'`（旧 `bz-rpc-core.js` 的键）→ 种子完全没进档 → 每条成功路径都落到拒绝分支。
8. **`shape:<act>:eRet` 自检的真规则**（`bz-handler-impl.js:446`）：**已实现**的动作只要求 eRet 是数字；
   未实现的才必须等于 1。"已实现"清单是 `BZ_SHAPES.__impl`，由 `tools/gen_shapes.js` 生成。
   → **加了新 handler 必须先跑 `gen_shapes` 再 `build-handlers`**，否则自检会拦。
9. **上游 zip 是 GBK 文件名**：`Expand-Archive` 会报非法字符。用 `System.IO.Compression.ZipFile` 按**条目索引** `ExtractToFile`，ASCII 另存。
10. **PowerShell 的 `Get-Content | ConvertFrom-Json` 读不了带中文的 JSON**（会报"应为:或}"）。
    要看内容用 `read` 工具；要改内容用 node 脚本。
11. **`bz-oracle` 工作区做法**：整棵复制上一版（自带 `out/`），**只覆盖上游给的几个文件**，绝不动源头目录、不覆盖 `out/`。
12. **`pscustomobject` 不能直接给新属性赋值**（存档加字段要用 `Add-Member`）；改完存档要立刻热重载，
    否则运行中的 `_save` 内存副本会把盘上改动覆盖掉。

---

## 6. 待办（按优先级）

### 6.1 【最高】补 `circle_task` 表 —— 材料已齐，可直接写完

**解码规则（已复验，有据）**：混淆对象长这样
```json
"_Money":{"offset":17995,"xo":...,"chsm":[...],"_actIntv":[125],"_value":[18120],"tag":"cfMon"}
```
真实值 = **`_value[0] - offset`** → `18120 - 17995 = 125`。
取值点：`index.js:73908-73914` 的 `value` getter（`_ = this._value[0] - this.offset`）。
⚠ `offset` 是**运行时随机生成**的（`index.js:73898`：`Math.floor(1e4*Math.random()+1e4)`），
**不能硬编码**，必须逐行读 dump 里自带的 `offset`。

`circle_task.json`：21 行，cols = `_Money,_Exp,_Potential,low_limit,limit,TalkNpc,FightNpc,Item`。

**`getCircleTaskList.taskArr` 的行形状（已追到）**：
```js
// scripts2.js:28214  this.entrustTaskArray = t          ← taskArr 直接赋值
// scripts2.js:28215  按 .state 排序，映射键 1/2/3/4/5（5=已完成）
// scripts2.js:28225  再按 .type 排序，映射键 1/2/3/4/5
// scripts2.js:28240  每行交给 HangTaskRender.setNewBaseData(row)
// scripts2.js:28242  state === 5 计入 finishTaskNum
// scripts2.js:28306-28307  row.id 用作校验键
```
→ 每行至少 `{id, state, type}`，且 `state`/`type` 必须是 **1~5 的整数**
（否则排序映射取到 `undefined`，`NaN` 比较 —— 不崩但顺序乱）。
⚠ **还没验的是 `HangTaskRender.setNewBaseData` 还读哪些字段**。把它追清楚再发数据，
   否则可能拿到 `getItem(id)` 后取 `.name` 抛 TypeError（同 `useItem` 的 formulaID:0 事故形态）。

做完：`tools/gen_shop_tables.js` 加 `BZ_CIRCLE_TASK` → 用该表生成 `taskArr` → 走完整流水线 → 冒烟加一条
"taskArr 非空且每行有 id/state/type" → 热重载。

### 6.2 UI 渲染层从未验过
- 雪球活动是**地图上的 NPC**（`SnowManNpc.reaction`@`scripts3.js:83596`、`Firecracker.reaction`@`31646`），
  不是菜单入口；面板 prefab 已定位 `activeUI/StackFirecrackerUI`（`scripts3.js:86407`）。
- 点「活动」进的是**每日活动**，不是雪球。
- 任务面板也没点开过。
- `get` / `NetMgr` 是模块内变量，**没挂到全局**，`get:` 命令通道够不到（返回 `NO_NETMGR`）→ 只能 adb 摸路。
- 已有可行手段：`adb shell screencap -p` + `read_image` 看画面 + `adb shell input tap x y`。分辨率 1080x1920。

### 6.3 其它遗留
- `getCircleTaskList.taskArr` 目前回空数组（面板能开、不崩，但列表空）。做完 6.1 才有真数据。
- `rgUseItem` 不出 buff（`rogue_item.buff` 未建模）—— 上游让留到肉鸽那批。
- 存档里 `contribution=99999` 但 `school=1`，是有意保留（退门派保留贡献，上游已确认可）。

---

## 7. 回滚

| 对象 | 位置 |
|---|---|
| 本会话前（C05 之前）的 core 八件 + live 两件 | `_backup\20261025-1849-pre-batch2-c05\` |
| 存档（C05 之前） | 设备 `bz_offline_save.json.pre-c05-20261025`（1698 B，md5 `DB15CC9EF6E230C7D687292A7562BD40`）+ 同备份目录 `device\` |
| 取证总表（C05） | `batch2-facts-20261025\00-MASTER-第2批取证汇总.md`（含一节自我纠错记录） |
| 取证表（C02） | `batch3-facts-20261025\{C1-actions,C2-server-save,C3-circle-task}.md` |
| 数据表 | `node tools\gen_shop_tables.js`（幂等） |
| 代码 | 无 git，见上 |

---

## 8. 文件索引

| 路径 | 内容 |
|---|---|
| `tools\gen_shop_tables.js` | 数据表生成器。现有：BZ_INNSHOP/BZ_SECTSHOP/BZ_MALL/BZ_MOUNT/BZ_TIMELIMITSALE/BZ_FORMULA/BZ_SHOP_ENTRANCE/BZ_PASS_*/BZ_GF_ROW/**BZ_SNOWMAN/BZ_SQUARE_BALL** |
| `hotfix-patch\core\bz-tasks.generated.js` | `BZ_TASKS` = `{taskId:{t:类型, r:{物品id:数量}}}`，另有 DROP/EXCHANGE/FASHION/NPCARR 等 |
| `hotfix-patch\test\c05-smoke.js` | C05 功能冒烟 16 条 |
| `hotfix-patch\test\c02-smoke.js` | C02 功能冒烟 13 条（含防重复领奖） |
| `tools\cfg\dump\` | 444 张配置表；查表先来这。⚠ `item.json` 是**截断导出**（6525 行只留 3000 行） |
| `_incoming\v2.5-20261025\` | 本轮上游包 + 回执（`06`算法 / `08`算法+补正 / `09`C02） |
| `batch2-facts-20261025\` `batch3-facts-20261025\` | 两批的只读取证表 |
| `tools\golden\` | 形状冻结账本：planned-changes / approved-widening / approved-narrowing |

---

## 9. 下次开工第一条命令

```powershell
Set-Location F:\BaoZouyxt\hotfix-patch
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\run.ps1 status                    # 看 pid
.\run.ps1 cmd "ver"                 # 期望 impl=h87a9cb11 / scene=gamescene / implErr=null
```

**活着** → 直接干 §6.1（circle_task）。
**死了 / pid 空** → 模拟器用 `F:\BaoZouyxt\启动模拟器-独立.cmd` 脱离进程树起，别用 `control launch` 叫醒已在跑的实例。

### 流水线顺序（不可换）
```powershell
# 改 handler / 形状之后：
node tools\gen_shapes.js                 # ← 加过新 handler 必须先跑这个，否则 __impl 不含它，build 自检会拦
cd hotfix-patch; node build-handlers.js  # 出 handlers.js（注意看 HANDLERS OK 行）
cd ..; node tools\check_shape_freeze.js  # 红就 --diff → 写 planned-changes → --freeze
node tools\acceptance.js                 # 40 项全绿
node tools\check_reject_codes.js         # 新增拒绝点必须登记（棘轮）
cd hotfix-patch; .\run.ps1 handlers      # 热重载（pid 不变）
.\run.ps1 cmd "ver"
```

---

## 10. 已确认、但可能被后来者改错的事实

1. **H 表的键 = 线上名去掉 `User.` 前缀**，大小写原样。不是注册表的大写名。
2. **大侠令解锁价 = 980 元宝**，本工程自定（原版走真实充值链取不到价）。
3. **`quickFinishTask` 单价 = 50 元宝**，本工程自定。
4. **`useItemAddition` 扣物品 7602**，`itemAddition` 单位是**百分点**（每件 10）。
5. **雪球奖励口径**：`getSnowAward` 发当前等级 `snowman.consolationprize`；`UseAllBall` 按雪球数取 `square_ball` 最高档发 10558。上游明确"效果像就行，不用改"。
6. **退门派只清 `school`**，`contribution` 与门派技能保留。上游已确认（`joinSchool` 不发贡献，退了再进刷不出钱）。
7. **`taskArr` 行必须有 1~5 的 `state`/`type` 整数**，否则排序乱（不崩）。
8. **`cfMon` 解码 = `_value[0] - offset`**，`offset` 逐行读，不可硬编码。
