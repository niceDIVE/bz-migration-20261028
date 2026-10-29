# AGENT 交接：2026-10-27 第七场（G = C12 防刷合并 + C13 落地收口 + C14 取证摸底 halfway —— 接手即开工）

> **给下一个 Agent 的**，不是给用户的。读完这一篇就能接手，不需要读对话记录。
> 项目根：`F:\BaoZouyxt` ｜ 补丁工程：`F:\BaoZouyxt\hotfix-patch` ｜ 上游包：`F:\BaoZouyxt\_incoming\`
> ⚠ 同日 `HANDOVER-SESSION-2026-10-27.md` / `-B/-C/-D/-E/-F.md` **均已被本文取代**（原件都在，没删）。
> ⚠ 本场因上下文配额提前收笔——**C14 取证只做了主审摸底（结果全部固化在 §3），工人一单都没派**。接手后从 §4 直接开工。

---

## 0. 三十秒接手（**含"要发什么 / 你要做什么"**）

- 游戏在 **MuMu 模拟器**，adb `127.0.0.1:16416`（**adb 有 root**），包名 `com.maple.madherogo`。当前 **pid 22577**，已进 `gamescene`。
- 线上 **`impl=h3b555bcf`**，`flow=ffaec47c3`，selfCheck **1371** 全过，`implErr=null`。（本场 C14 摸底为只读，**部署状态与 F 场收笔时完全一致**。）
- 验收 **53/53 绿**（c13-smoke 9 条已收编），形状冻结 **diff 0**（**356 动作**基线），`check_reject_codes` OK（**动作 117 / 条目 134 / 拒绝点 202**）。
- 批次进度：**C01–C13 全部落地**（C11 上游收口、C12 上游验收+防刷合并、C13 本场落地）→ **当前任务 = 第 15 批 C14〔斗狗〕取证（摸底已完成见 §3，工人未派）**。
- **要发给上游的就一个文件**：`_incoming\下游回执-第14批C13-20261027.zip`
  `696,058 B`｜md5 `7399266317C58C70E8F1D03F0DE90AA5`｜sha256 `DE8B18F8610AAF979745B484AAA23B0278EFA8F9FD9E2A4C59281142C8C093EE`｜**81 条目**
  （= C12 防刷 + C13 连续交付；解包自验过：c13-smoke 9/9、c12 14/14、c11 14/14。）**用户侧转发状态本场未确认——接手先问一句。**
- 存档变动（本日累计，全部正常玩法）：消费 800 元宝（C12 链）+ 100 元宝（C13 买刷新）；获得 3 号管家+月卡 30 天+派遣奖励待领、8143×30、三档爪子各 3、免费刷新 1。

---

## 1. 当前部署状态（可核，别凭记忆）

| 项 | 值 |
|---|---|
| `impl` / `flow` | **h3b555bcf** / ffaec47c3（`.\run.ps1 cmd "ver"` 验） |
| selfCheck | **1371** 全过 |
| 验收 | **53/53**，known-red 0，cap 0 |
| 冻结 | **356 动作**，diff 0 |
| 拒绝码 | 动作 **117** / 条目 **134** / 拒绝点 **202** 处（flow 1） |
| `core\bz-rpc-server.js` | 467,066 B，md5 `774D44953D9A8FB60FAD10C08CD03DD3`（含 C12 防刷合并 + C13） |
| `patch\live\handlers.js` | 1,600,285 B，md5 `C3DAD3C66D95C9F99109DE8936E40AB5`（**产物，不许手改**） |
| `core\bz-c13.generated.js` | 728 B，md5 `F212042FBEE1725E03D4B5D11224C65E` |

---

## 2. 本场（F 收笔后）新增了什么

### A. 上游第 12/13 批验收包处理（全部闭环）
- **第 12 批（VIP 白领修复）**：合并进 core（notVip 门 + 拒绝码 notVip:2），c11-smoke 上游 14 用例版，收口。
- **第 13 批（管家奖励防刷）**：dispatch 落档记 `P.dispatchHelper`、领奖按它算、每位管家一次性（`helperRewardArr` 已有 → 发空 `{}` 派遣照常成功）、发过才 push、领完清 dispatchHelper；c12-smoke 上游 14 用例版（+⑧b）。五项口径全追认 + 3 并入键追认 + mapId 自愈通道获上游好评。
- **上游通用新规（转述，后续批次必须遵守）**："只要奖励靠计时循环反复领，就必须有每日上限，或者每次都要付出成本；表里有'已领'数组的，一律按一次性发。"

### B. 第 14 批 C13〔UFO 夹娃娃〕落地 + 真机全链（详见 F 场记录与 `batch14-facts-20261027\`）
- 4 活键（getUFOCatcherData/rewardUFO/useUFOrefresh/buyUFORefreshTimes），3 死键跳过；抓取服务端权威；池空自动刷新。
- ★新坑：**模板新档 `s.bag` 缺位** → grantRewardList→bagAdd 抛 `Cannot read properties of undefined (reading '8117')` → catchNoCode → 排放成 `{}`（**diff 每键只有 1 行空排放 = catchNoCode 的鉴别特征**）。修复：dlEnsure 确保 s.bag。真机全链通（free=1 赠送、items=7 上机、抓中难度 2 → 8143×30、池余 6）。

### C. 工作流方向澄清（用户原话要点，别再搞混）
- 上游的验收反馈 = 用户转来的"验收包"（第 12/13 批两个包**都已处理完**）。
- 现在等的是上游对**第 14 批回执**（73992663）的审阅——有意见才会以新验收包形式回来，由用户转发。
- **取证是只读的，不碰 core，与任何未来验收修改不可能撞车**（撞车风险只在"落地实现"段，那必须等用户拍板）→ 取证不必等验收。

---

## 3. ★C14〔斗狗〕主审摸底结果（本场只做到这里——接手后照此直接派工人，别重做）

### 3.1 KEY 原文（relations.md:99-100 抄录）

> ## 第15批 · C14〔斗狗〕（7 个，可信度强）  共享：family:斗狗、token:DOG、token:BATTLE、token:PVE
> LOOK_DOG_LOG、ENTER_PVEDOG_FIGHT、REQ_DOG_PARTNER_END_BATTLE、REQ_DOG_PARTNER_PVE_BATTLE、DOG_BATTLE_RESULT、FEED_DOG、ENTER_PVE_ROGUE_FIGHT

### 3.2 定义与线上名（index.js 已核；★=反直觉，禁止"纠正"）

| 键 | 线上名 | 定义行 | 备注 |
|---|---|---|---|
| LOOK_DOG_LOG | `User.lookDogLog` | 59862 | |
| ENTER_PVEDOG_FIGHT | `User.enterDogPVEBattle` | 60010 | |
| REQ_DOG_PARTNER_END_BATTLE | ★`User.CheckDogPartnerPVEBattleResult` | 60615 | **完全不同名**（Check...Result） |
| REQ_DOG_PARTNER_PVE_BATTLE | ★`User.ReqDogPartnerBattleInfo` | 60614 | **完全不同名**（BattleInfo）；60614/60615 两行是相邻对 |
| DOG_BATTLE_RESULT | ★`User.DogBattleResult` | 59863 | **大写 D**（紧贴 59862/59865） |
| FEED_DOG | `User.FeedDog` | 59865 | **大写 F** |
| ENTER_PVE_ROGUE_FIGHT | ★`User.enterRogueMulitiNpcBattle` | 60504 | **完全不同名**——疑似复用肉鸽多 NPC 战斗通道（C08 家族！） |

### 3.3 ★★最大疑点：HttpConst.X 在客户端 bundle 里 7 键**全部 0 命中**

`grep 'HttpConst.<KEY>' scripts2.js / scripts3.js / index.js / main.js` → **7 键全 0**（index.js 只有定义行自身）。
这与 C10-C13 全部批次（消费点集中在某模型区）完全不同。三种假设（接手后第一件事就是分辨）：
1. 发送走**非 HttpConst 引用**（如 `a.HttpConst[变量]` 动态键、或字符串直发）；
2. **真死键**（斗狗玩法在客户端已被裁剪——但 relations.md 给了"可信度强"）；
3. 逻辑在**未反编译的 bundle/jsc** 里（dollBundle 之类按需加载包的 jsb 编译产物，不在 scripts2/3/index 三包内）。
⇒ 建议排查顺序：先 grep 线上名字符串（`lookDogLog` 等）在三包 + `client-analysis\bundles\` + `jsc`；再 grep `DogModel|DollHand` 类模型名（DollModel 在 25707 附近，斗狗模型可能叫 DogModel/XxxDog…）；再查 C08 的战斗发送路径（`User.enterRogueMulitiNpcBattle` 与 C08 的 `ROGUE_MPPVE_ACTION` 家族同源）。

### 3.4 未完成的摸底查询（本场被中止，接手后先补）

1. `shapes.json` 里 dog 相关键是否零登记（node 查询被中止）；
2. `core\bz-rpc-server.js` 里 Dog/dog 命中（被中止——预期 0 handler）；
3. `tools\cfg\dump\` 里 dog/pve 名字的配置表（被中止）；**注意别用旧过滤思路**——C13 的教训是数据源可能叫别的名（如 package_difficulty），要文件名+内容双狩猎；
4. `tools\facts\reject-codes.json` / `todo_shapes.json` 里 dog 条目（预期 0）。

### 3.5 战斗族特别注意（C08 基建已在线上）

- C08〔PVE 战斗族〕9 键已实现（`_backup\20261027-111500-pre-c12fix` 之前的 core 里有完整战斗基建；`AttckData.equipments` 已切本档，**别改回快照**——交接 D §4.3）。
- `ENTER_PVE_ROGUE_FIGHT`→`User.enterRogueMulitiNpcBattle` 与 C08 的 `enterRoguePVEBattle`（shapes bySrc 有 handler:enterRoguePVEBattle 4 条）同族——**斗狗大概率是 C08 战斗基建的换皮**，落地方案应优先镜像 C08 的战斗三件套，而不是新造。
- C08 的战斗结算依赖 `checkBattleResult` 模板（templates.json `checkBattleResult.User.CheckBattleResult.*` 形状已有大量 borrowed-capture）。

---

## 4. 接手后第一小时怎么做（照抄即可）

```powershell
Set-Location F:\BaoZouyxt\hotfix-patch
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\run.ps1 status                    # 期望 pid 22577 左右
.\run.ps1 cmd "ver"                 # 期望 impl=h3b555bcf / implErr=null
```
1. 把 §3 的摸底结果原样拷成 `batch15-facts-20261027\主审-摸底记录.md`（新建目录）。
2. 补跑 §3.4 的四个未完成查询。
3. 派 4 个只读工人（**既定模式，用户已三次确认：小单 ≤90 行、边读边落盘、每 2-3 分钟查活、死单杀掉重派**）：
   W1 线上名字符串狩猎（三包+bundles+jsc）｜W2 DogModel/战斗模型定位（含 C08 镜像面）｜W3 配置表狩猎（文件名+内容双路）｜W4 入口与 NPC（斗狗 NPC 的 NpcToFuncType，index.js:87500-87700 区）。
4. 对撞 → 写 `C14-c14-取证与策略.md` → **等用户拍板再动 core**。

---

## 5. 回滚与既有挂账（与 F 相同，速查）

| 对象 | 位置 |
|---|---|
| C13 前全套 | `_backup\20261027-113000-pre-c13\` |
| C12 防刷合并前 | `_backup\20261027-111500-pre-c12fix\` |
| C11 防刷合并前 | `_backup\20261027-104500-pre-c11fix\` |
| C12 实现前 | `_backup\20261027-102337-pre-c12\` |
| 形状基线 | `tools\golden\emission.json`（356 动作） |

挂账：ISSUE-7/8/10-2/10-3/11/12/13 全部在案（docs\OPEN-ISSUES.md）；第 10/11 批回包未到；第 37 批 START_ROGUE/CHOOS_ROGUE 未做。

---

## 6. 文件索引（本场新增部分）

| 路径 | 内容 |
|---|---|
| `batch14-facts-20261027\C13-c13-取证与策略.md` | C13 取证与策略 |
| `batch14-facts-20261027\C13-c13-执行记录.md` | C13 执行（含 s.bag 缺位坑） |
| `batch14-facts-20261027\主审-独立探针记录.md` | C13 主审 §一-§八 |
| `_incoming\下游包-第12批C11验收+VIP白领修复-解包\` | 上游 C11 验收包（已合并） |
| `_incoming\下游包-第13批C12验收+管家奖励防刷-解包\` | 上游 C12 验收包（已合并） |
| `docs\EXECUTION.md` | 轮 24（C12）/轮 25（C11 修复）/轮 26（C13） |
| `docs\OPEN-ISSUES.md` | ISSUE-12/13 新增 |
| `HANDOVER-SESSION-2026-10-27-F.md` | 上一场交接（被本文取代） |

---

## 7. 下次开工第一条命令

```powershell
Set-Location F:\BaoZouyxt\hotfix-patch
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\run.ps1 status                    # 期望 pid 22577 左右
.\run.ps1 cmd "ver"                 # 期望 impl=h3b555bcf / implErr=null
```

### 流水线顺序（不可换）
```powershell
node tools\gen_c13_tables.js        # 动过口径/表才需要
node tools\gen_shapes.js            # ⚠ 新动作先登记 tools\todo_shapes.json
cd hotfix-patch; node build-handlers.js
cd ..; node tools\check_shape_freeze.js --diff   # 有差异 → tmp_planned_c1N.js 式规则 → --freeze
node tools\check_reject_codes.js    # 期望 动作 117 / 条目 134 / 拒绝点 202
node tools\acceptance.js            # 期望 53/53
cd hotfix-patch; node test\c13-smoke.js ; node test\c12-smoke.js ; node test\c11-smoke.js ; node test\c10-smoke.js ; node test\r14-catch-smoke.js
cd hotfix-patch; .\run.ps1 handlers ; .\run.ps1 cmd "ver"
```

### 已确认、但可能被后来者改错的事实（累积十条精选）
1. **`patch\live\handlers.js` 是产物** —— 只改 `core\`，然后 build。
2. ★**新动作必须登记 `tools\todo_shapes.json`**，否则 gen_shapes 静默不扫。
3. ★**新档 `s.bag` 可能缺位**——新档发物品前必须 ensure（C13 dlEnsure 已带）。
4. ★**catchNoCode → dispatch 回空应答 → 形状排放 `{}`**（diff 每键 1 行 = 鉴别特征）。
5. handler 引用生成表必过守卫（r14 直接 require core，无生成模块）。
6. grantRewardList 的 note 必须三元 {ivch:{},eqch:{},eco:{}}；else 兜底文案不算专属分支 → tier 2；构建期双向比对抓码漂移。
7. **C11 notVip 门 / C12 dispatchHelper 一次性奖励 / C12 mapId 白名单+自愈通道**——三处都是上游验收修复，别"简化"掉。
8. 通用新规（上游裁定）：计时循环反复领的奖励必须有每日上限或每次成本；"已领"数组一律一次性发。
9. `SHRINK_OK` 未新增；`AttckData.equipments` 已切本档别改回快照；`makeLove` 50/次等旧口径见交接 D §8.11。
10. **Out-File utf8 带 BOM**；**node 输出别用 `>` 重定向**；**zip 条目名 GBK 误读按索引+GBK→UTF8 反转解**。
