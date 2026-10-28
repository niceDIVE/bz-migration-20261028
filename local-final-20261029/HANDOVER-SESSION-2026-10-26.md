# AGENT 交接：2026-10-26 会话（§6.1 收尾 + C02 堵口 + 第4批 C03 + 第5批 C16 + 算法 v2.6/v2.7）

> ⚠⚠ **本文已被 `HANDOVER-SESSION-2026-10-27.md` 取代（2026-10-27），只当历史读。**
> 仍有效的部分：§5.8 冷启动流程、§5.12 形状冻结门槛、§10 事实清单中未被 10-27 交接推翻的条目。
> 原件备份：`_backup\HANDOVER-SESSION-2026-10-26.md.bak-20261027`。

> **给下一个 Agent 的**，不是给用户的。读完这一篇就能接手，不需要读对话记录。
> 项目根：`F:\BaoZouyxt` ｜ 补丁工程：`F:\BaoZouyxt\hotfix-patch` ｜ 上游包：`F:\BaoZouyxt\_incoming\`
> ⚠ 同日 `HANDOVER-SESSION-2026-10-25-C.md` **已被本文取代**。更早的只当历史读。

---

## 0. 三十秒接手

- 游戏在 **MuMu 模拟器**，adb `127.0.0.1:16416`（**adb 有 root**，必要时先 `adb root`），包名 `com.maple.madherogo`。
- 线上 **`impl=h9454ce1e`**，`flow=ffaec47c3`，selfCheck **1264** 全过，`implErr=null`/`flowErr=null`。
- 游戏 **pid=2655**。⚠ 这轮模拟器**整个进程树死过一次**，冷启动后 pid 从 6188 变 2655 —— pid 对不上**不是**热重载失效，先查 MuMu 进程在不在。
- 验收 **43/43 绿**，形状冻结 **diff 0**，`check_reject_codes` OK（**动作 46 / 条目 50 / 拒绝点 76**）。
- 批次进度：§6.1 circle_task ✅ / C02 堵口 ✅（上游已验收）/ **第4批 C03 ✅（19/19）** / **第5批 C16 ✅（6/6）**。
- 三个技术决策**在等上游/用户回话**（见 §6），在回话之前：成就领奖一律不发、`GetRandomEventAward` 不发、经验 4002 只显示不入账。

---

## 1. 当前部署状态（可核，别凭记忆）

| 项 | 值 |
|---|---|
| `impl` / `flow` | **h9454ce1e** / ffaec47c3（`.\run.ps1 cmd "ver"` 验；别看 `ready.json`，它是加载时写的） |
| selfCheck | **1264** 全过，`failed=[]` `missingRequired=[]` |
| 验收 | **43/43**，known-red 0，cap 0 |
| 冻结 | C1–C8、C10–C13 全过（C9b 未实现），**diff 0** |
| `core\bz-rpc-server.js` | **300,814 B** md5 `4434D4C34F7BE6D3896EF6C88D7D2D4A` |
| `core\bz-shops.generated.js` | **147,860 B** md5 `0B5DB4B20A2B27F593F013E254439FF7` |
| `patch\live\handlers.js` | **1,270,876 B** md5 `FC969B3DE64E16397A9640F41731CD2A` |
| 存档 | roleID 16374 / FZhou。⚠ **存档已被本轮真机验证动过**：coins 20831859、potential 102599、yuanbao 50946、`done` 含 9001/9002、`circleDay={"d":"2026-10-26","n":2}`。**旧基线 md5 `0F143054…` 已过期**（那是 circle_task 之前的档）。用户已裁定「存档状况不重要，要的是正确的数据」 |

---

## 2. 本会话干了什么

### A. §6.1 欠账：circle_task 表（上游已验收）
- `tools/gen_shop_tables.js` 新增 `cfMonDecode()`（`_value[0]-offset`，offset 逐行读、**不可硬编码**）+ 生成 **`BZ_CIRCLE_TASK`**（21 档）。
- `getCircleTaskList.taskArr` 从「读不存在的存档键」改成**动态投射**；`changeDelegateTask` 同源投射。
- 行契约（**谁会被读、缺了崩不崩**）：`batch3-facts-20261025\C4-circle-task-contract.md`。
  核心：`scripts2.js:27976-28001 showTitleText` 拿 `type`/`lv`/`param[0]` 直查 `entrust_task`/`entrust_level`/`npc`，**键不存在就 `undefined.time` 抛 TypeError**。
- 投射 3 行：id **9001/9002/9003**（BZ_TASKS 最小键 100010，不撞），`state:2`、`type:1/2/3`、`lv:1`、`award:[m,e]`。
- **不投 type 4**：它要的是**地图** id，circle_task 只有 Talk/Fight/Item 三个池、没有地图池。

### B. C02 堵口（上游 §一，**已验收通过**）
所有发任务奖的口子共用一本账（`s.rewarded` 管一次性、`s.circleDay` 管环任务按天限次 **20**）。
三处对上游方案的偏差（都对，上游回执已确认）：① `isRepeatable = isRepeatTask || isCircleTask` 取并集；② 环任务 id 用白名单 `isKnownCircleId()`（不能拿「不在 BZ_TASKS」当判据，否则环任务全被拒）；③ `rogueAcceptTask` 拒绝回 **4** 不回 6（客户端 6 分支读 `o.skillId` 必抛，`index.js:133253`）。
`acceptTask` 未收紧（上游同意）。
取证：`batch3-facts-20261025\C7-C02-plugin-fix.md`。

### C. **v2.7 环任务发奖接线**（上游 §一「这一轮做」）
新增 `taskRewardPairs(tid)` —— **所有发奖口的唯一奖励来源**（真任务走 `BZ_TASKS.r`，环任务走 `BZ_CIRCLE_TASK` 当前档位），并把 4 份重复的 `rw` 循环收敛掉。
货币口径：**4001=银两→`s.coins`**（与 `buyShopItem` 扣钱同字段，即"比价读的那个"）、**4003=潜能→`s.potential`** 且 `note.eco` 键必须是 **`ptt`**、**4002=经验无钱包落点**（见 §6 待办 1）。
`circleTierKey()` 是档位的**唯一出处**（投射与发奖都必须走它）。
`quickFinishTask` 的闸改成「`taskRewardPairs(tid).length === 0` → 不扣钱」。
**真机全链路实测**：accept→award→ `coins +125`、`potential +50`、`rewardObj={"4001":125,"4002":50,"4003":50}`、`note.eco={"coins":…,"ptt":…}`；quickFinishTask `元宝 -50`、`coins +125`；`circleDay={"d":"2026-10-26","n":2}`。

### D. **第 4 批 C03〔战斗结算〕19/19**
1 已有（`CheckBattleResult`）+ 18 新写。映射表 `tools/actions.json`（19/19 命中）。
**发奖判据只有一条：奖励源必须是服务端表、键必须可校验。**
- ✅ 接 `BZ_NPCDROP[npcID]`：`NewRoguePVPBattleResult`、`roguePveBattleResult`、**`rogueBattleResult`**（reqKeys `{npcID,win}`，index.js:105597-105602）
- 只 ack（无可校验键/没表）：`TowerBattleResult`、`chanllengeTower`、`choosePandaEvent`、`activateTowerEvent`、`mulitiNpcBattleResult`、`goodAndEvilBattleResult`、`NewPVPBattleResult`
- `diceBattleResult` **恒回 eRet 0**：玩法未建模，且该动作不在 shape-hints 也不在 BZ_SHAPES；客户端 `1==eRet` 会读 `e.dice`（scripts3.js:51160），回 0 让整段跳过
- `GetRandomEventAward` 不发：`adventure.json` 找到了（键=adventureID，有 `awardwin/awardfalse/award/award2`），但奖励列用的是 item id **1..5**（Type 6..12 占位资源），映射不上钱包 → 等上游给口径。**另：`award` 是分支码（1成功/2失败/3领取/5），不是金额** —— 我在 v2.6 回执里说它是金额，是错的，已在 v2.7 回执纠正。
取证：`batch4-facts-20261025\{C1,C2,C3}.md`。

### E. **第 5 批 C16〔成就〕6/6**
1 已有（`getAchieveData`）+ 5 新写。新增五张表：`BZ_ACHIEVE_META`(2113) / `BZ_ACHIEVE_RW`(421) / `BZ_ACHIEVE_RATE`(53) / `BZ_ACHIEVE_SUIT`(240) / `BZ_ACHIEVE_MARK`(182)。
**四个领奖口一律回 4 不发放**：`achieve_list` 有 **57 种 type/type1 条件**，本工程没有进度模型，而奖励面是 **714 份**（421 实物 + 53 积分档 + 240 套）。闸门钉在 `getAchieveData` 早就预埋的 **`s.achieve.pending`** 上 —— 进度模型落地后往 `pending` 写 id 即自动工作，**不用改一行**。
拒绝路径用只读 `achPeek()`，**连 `s.achieve` 槽位都不建**（否则之后任何 persist 都会写盘）。
取证：`batch5-facts-20261025\C2-c16-achieve.md`。

### F. 算法 v2.6 / v2.7（各跑一轮，回执已交）
工作区惯例：**整棵复制上一版（自带 out/），只覆盖上游给的 extract_shape.py + README.md，绝不动 out/**。
- v2.6：`actions 649 / unsafe 625`；v2.7：`488 / 444（crash 313 + retry 211）`。
- 上游说 `scripts2.js:46175` 上一轮根本没被判过 —— **v2.7 已确认被判（判空=是）**。
- 两处待上游核：`313+211=524 > 444` 的重叠口径；`46175` 与 `26756` 都判空=是但重发判定只列了 26756。

---

## 3. 上游进度与下一步

| 批次 | 状态 |
|---|---|
| 第1批 C01 商店交易 27 | ✅ 已交 |
| 第2批 C05 道具使用 24 | ✅ 上游验收通过 |
| 第3批 C02 任务主线 19 | ✅ 上游验收通过（含 v2.7 发奖接线） |
| 第4批 C03 战斗结算 19 | ✅ 已交（回执在 v2.7 包里） |
| **第5批 C16 成就 6** | ✅ 已做完，**等上游验收** |
| 第6批 C04 婚姻子女 16 | ⬜ 下一批（`relations.md` 排第 6），**别抢跑** |

**回执打包惯例（用户裁定）**：**一个回执一个 zip**，内容 = `序号-xxx.txt`（回执正文，头部带 server md5/sha256 + 构建号链）+ `bz-rpc-server.js` + `test\*.js` + `facts\*.md`；打完必须**解包验包内 server md5 == 部署版**。已发：`v2.6…zip`、`v2.7…zip`（均在 `_incoming\`）。

---

## 4. 用户裁定的新规矩（本会话新增，优先级高）

1. **「原版要真实付费的功能 → 改扣元宝/金条，价格自定，不用再报」**（上游 §二 已书面确认）。已按此：`quickFinishTask` 50 元宝、大侠令 980 元宝。
2. **逐动作验证必须自动化**（`test/*-smoke.js` 走真实 dispatch），用户不做逐项手工测试。
3. **「只要你能拿到需要的数据，存档状况不重要，我要的是正确的数据」**（2026-10-26 用户原话）—— 真机验证可以直接动存档。本轮已用它做了环任务发奖的全链路真机验证。⚠ 但"防白拿"的红线没松：**客户端传值永远不能当奖励**。
4. **回执要合成一个包**（用户："为什么你不合成为一个？为了让我不方便吗"）—— 别按主题拆包。
5. 常规工作（写码、跑流水线、热重载、打包）不用逐步请示，做完报结果即可。

---

## 5. 坑表（本会话新增，按踩坑概率排序）★ 最值钱

1. **`function` 不能写在 `var H = { ... }` 对象字面量里**。helper 必须放模块作用域（`var H = {` **之前**）。本会话踩了**两次**，都是 build 时 `Unexpected identifier` 才发现。另外同名函数声明会互相覆盖（hoisting 后定义赢），删旧定义要真删干净——`circleTier` 就出现过新旧并存。
2. **`gen_shapes` 会从 handler 字面量重算"共享字段默认值"**：你写 `gemId: []`，全工程所有动作的 `gemId` 默认值都从 0 变 `[]`，产生 3 处"我没改却 diff"的连带差异（连 `CheckBattleResult`、`houseSpecial` 都会变）。想缩小爆炸半径就选与基线一致的字面量——实测 `awardObj` 用 `[]` 而不是 `{}` 能消掉 2 处。
3. **`ensureLedger` 首次 touch 会规范化存档**（`contribution`/`schoolContribution`/`passCardLevel`/`bloodArr`/`fosterArr` 从 undefined 变默认值）。测试不预热的话，第一次 dispatch 的规范化会被误判成"handler 改了档"。预热必须用**会调 ensureLedger 的** dispatch（`getAchieveData`/`hideTask` 都行）；⚠ `getCircleTaskList` 现在是纯投射、不调 loadSave，**当不了预热**。
4. **带 RNG 的掉落测试是 flaky**：把会掷骰的 handler 放进"不发奖"断言并传真 `npcID`，掷中就红、掷不中才绿。修法：无可校验键的才断言不发；有 `npcID` 的单独断言「客户端塞的数字进不了钱包」。
5. **PowerShell 的 .NET 当前目录 ≠ PowerShell 当前目录**：`[System.IO.File]::ReadAllText("相对路径")` 用的是进程目录，会 DirectoryNotFound。一律绝对路径。
6. **`Get-Content` 在 LF 文件上数行号不可信**（再确认）：`Select-String` 报 2309、`Get-Content` 跳到 2309 却是别的内容。行号只用 read/grep 工具。
7. **`write`/`edit` 工具对没读过的文件会拒绝**；`edit` 的 old_string 必须逐字（含缩进）。JSON 里**不能有裸引号**——`planned-changes.json` 的 reason 里写 `"没内容"` 直接把 JSON 写坏，用「」。
8. **模拟器冷启动流程**：`MuMu*` 进程全没 ≠ adb 掉线。顺序：`启动模拟器-独立.cmd` 拉起 → 轮询 `adb connect 127.0.0.1:16416` → **`adb root`**（否则 `ls /data/data` 全 Permission denied）→ **`run.ps1 all`**（冷启动要连 bootstrap 一起推，只推 handlers 不够）→ pid 会变，这不是热重载失效。
9. **`启动模拟器-独立.cmd` 的真毛病**：内容是 **UTF-8 + LF-only**，而 cmd 用 CP936 读批次档 → 中文注释被解成乱码并被当命令执行（`'Profile' is not recognized`）。已修：原文一字未改，转 **GBK + CRLF**，实跑验证幂等（MuMu 进程数不变）。**别再把它转回 UTF-8。**
10. **上游 zip 是 GBK 文件名**（旧坑沿用）：用 `System.IO.Compression.ZipFile` 按**条目索引** `ExtractToFile`，ASCII 另存。
11. **只读工人（gemini-3.8-flash-low）本会话 3/3 零产出**（12–27 分钟无回应），全部由主审自己做完了。别再指望派活；工单模板可以当自己的执行清单用。
12. 形状冻结的门槛要分清：**改值/删字段**走 `planned-changes.json`（sigma 变的还要 `allowSigma` + `index.js:行号` 证据），**新增路径**要另外写 `approved-widening.json`，**删字段**要 `approved-narrowing.json`（`escape:"closed"`）。
13. **`ev` 证据行只认 `tools/index.js`**（`文件名:行号#sha8`，sha 取该行 trim 后的 sha1 前 8 位）。写 `scripts3.js:…` 会 R4 FAIL——`diceBattleResult` 踩过，换 `index.js:59842` 才过。

---

## 6. 待办（按优先级）——都在等上游/用户回话

### 6.1 成就进度模型（C16 的根）
`achieve_list` 2113 条、**57 种 type/type1 条件**，`require` 编码各不相同（`"0|1000"` / `"10"` / `"1|1003,310006"` / `"-61"` …）。可验子集（等级/货币/击杀/收集）能先做，其余需上游给口径。
**落地方式已备好**：往 `s.achieve.pending` 写 id + 给 `groupPoints` 填初值，五个 handler 自动开始工作，零改动。

### 6.2 经验 4002 入账
需加存档 exp 字段 + LoadGame 投射。现在只进 `rewardObj`（奖励窗显示）不持久化。
旁证：`BZ_TASKS` 674 条奖励里 4002 出现 **0 次**。

### 6.3 `adventure.json` 的 item id 1..5 钱包映射
表已找到（键=adventureID，`awardwin/awardfalse/award/award2`，编码 `[物品id,数量]`）。1..5 是 Type 6..12 占位资源，`CURRENCY_SLOTS` 不认。给了映射就能接 `GetRandomEventAward`。

### 6.4 其它
- `lh_event.json`（188 行带 reward 列）疑似 `activateTowerEvent` 的事件表，未证实。
- 交接文档写完后 `HANDOVER-SESSION-2026-10-25-C.md` 应加一行"已被取代"指引。

---

## 7. 回滚

| 对象 | 位置 |
|---|---|
| circle_task 之前的 core 八件 + 存档 | `_backup\20261025-215450-pre-circle-task\`（含 `device\bz_offline_save.json` md5 `0F143054…`） |
| C02 堵口之前 | `_backup\20261025-222006-pre-c02-plug\`（server md5 `2284B567…`） |
| 算法 v2.6 / v2.7 原件 | `_backup\20261025-223500-pre-algo-v26\`、`_backup\20261025-234500-pre-algo-v27\` |
| 被拆成两包的旧 zip | `_backup\20261025-231000-superseded-split-zips\` |
| `.cmd` 修复前原件 | `_backup\20261026-165615-fix-cmd\启动模拟器-独立.cmd.orig`（md5 `4ACD801A…`） |
| 数据表 | `node tools\gen_shop_tables.js`（幂等） |
| 代码 | 无 git，见上 |

---

## 8. 文件索引

| 路径 | 内容 |
|---|---|
| `tools\gen_shop_tables.js` | 生成 `bz-shops.generated.js`。现有：BZ_INNSHOP/…/BZ_SNOWMAN/BZ_SQUARE_BALL/**BZ_CIRCLE_TASK**/**BZ_ACHIEVE_META/RW/RATE/SUIT/MARK** |
| `hotfix-patch\core\bz-tasks.generated.js` | `BZ_TASKS` + `BZ_ACHIEVE_GROUPS`（**gen_obtainable.js 对它有 md5 断言，别乱动**） |
| `hotfix-patch\test\circle-task.js` | 环任务契约 + 发奖接线 15 条 |
| `hotfix-patch\test\c03-smoke.js` | C03 18 个 handler 11 条（含防白拿） |
| `hotfix-patch\test\c16-smoke.js` | C16 5 个 handler 10 条（含白拿闸门） |
| `batch3-facts-20261025\` | C4 环任务行契约 / C7 C02 堵口 |
| `batch4-facts-20261025\` | C1 C03 字段契约 / C2 批次台账 / C3 reqKeys |
| `batch5-facts-20261025\` | C1 v2.7 执行记录 / C2 C16 成就取证 |
| `_incoming\v2.6-20261025\` `v2.7-20261025\` | 上游包 + 回执 + **work\bz-oracle**（算法工作区） |
| `_incoming\*.zip` | 已发的回执包（v2.6 / v2.7 各一个） |

---

## 9. 下次开工第一条命令

```powershell
Set-Location F:\BaoZouyxt\hotfix-patch
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\run.ps1 status                    # 看 pid；若 MuMu 进程全没 → 见 §5.8 冷启动流程
.\run.ps1 cmd "ver"                 # 期望 impl=h9454ce1e / scene=gamescene / implErr=null
```

**活着** → 直接干 §6。
**pid 空 / MuMu 进程没** → `启动模拟器-独立.cmd`（已修好）→ `adb connect` → `adb root` → `.\run.ps1 all -TimeoutSec 180`。

### 流水线顺序（不可换）
```powershell
# 加过新 handler 必须先跑这个，否则 __impl 不含它，build 自检会拦
node tools\gen_shapes.js
cd hotfix-patch; node build-handlers.js          # 看 HANDLERS OK 行
cd ..; node tools\check_shape_freeze.js          # 红就 --diff → 写 planned-changes（+approved-*）→ --freeze
node tools\acceptance.js                         # 全绿
node tools\check_reject_codes.js                 # 新增拒绝点必须登记（棘轮）
cd hotfix-patch; .\run.ps1 handlers              # 热重载（pid 不变）
.\run.ps1 cmd "ver"
```

---

## 10. 已确认、但可能被后来者改错的事实

1. **H 表的键 = 线上名去掉 `User.` 前缀**，大小写原样。本批 C03 的 5 处错位：`SERVER_NPC_BATTLE_END→TowerBattleResult`、`USER_PVP_OVER→NewPVPBattleResult`、`REQ_WM_ADV_RWD→GetRandomEventAward`、`ROGUE_PVP_BATTLE_END→NewRoguePVPBattleResult`、`REQ_MP_RESULT→mulitiNpcBattleResult`。
2. **`muliti` / `chanllenge` 是上游原文拼写**，不是错别字，改"正确"就注册不上（冒烟里有断言锁着）。
3. **`isRepeatTask` ≠ 环任务**。前者是 `tasknew.Repeat≠0`（决定写不写 done，动不得）；环任务是 `isCircleTask`（9001..9003，不在 tasknew）。发奖用并集 `isRepeatable`。
4. **潜能的 eco 键是 `ptt`**，不是 `potential`。发错客户端直接丢弃。
5. **`CURRENCY_SLOTS` 故意不含 4002**（经验），别"补全"它——那会静默失效。
6. **`4001` 是银两、走 `s.coins`**（`buyShopItem` 扣的就是它）；`1` 是金条、走 `s.gold`。别对调。
7. **`diceBattleResult` 恒回 eRet 0** 是有意的（玩法未建模 + 客户端 1 分支会读 `e.dice`）。REJECT_CODES 里登记为 `default:0`。
8. **`rogueAcceptTask` 拒绝回 4 不回 6**：客户端 6 分支读 `o.skillId` 交给 `getItem(...).Name`，缺席必抛（index.js:133253）。
9. **环任务每日上限 = 20**（`CIRCLE_DAILY_MAX`），上游说"实测顶到再改按任务分别计次，不用再来问"。
10. **环任务 id 9001..9003 是本工程自定段**，BZ_TASKS 最小键 100010，不撞。改投射就要同步改发奖（`circleTierKeyFor`）。
11. **`GetRandomEventAward` 的 `award` 是分支码不是金额**（1成功/2失败/3领取/5）——v2.6 回执里说错了，别引用那句。
12. **用户已授权动存档做验证**，但"客户端传值不能当奖励"的红线没松。
