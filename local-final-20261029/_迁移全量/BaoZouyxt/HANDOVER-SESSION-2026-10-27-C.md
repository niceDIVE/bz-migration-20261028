# AGENT 交接：2026-10-27 第三场（C10 农作物落地 + 真机全链 + 第 11 批回执交付）

> **给下一个 Agent 的**，不是给用户的。读完这一篇就能接手，不需要读对话记录。
> 项目根：`F:\BaoZouyxt` ｜ 补丁工程：`F:\BaoZouyxt\hotfix-patch` ｜ 上游包：`F:\BaoZouyxt\_incoming\`
> ⚠ 同日早场 `HANDOVER-SESSION-2026-10-27.md`、第二场 `-B.md` **均已被本文取代**（两份原件都在，没删）。
> 命名约定：同一天多场用 `-B` / `-C` 后缀（本项目已有 `-2026-10-25-B/C` 先例）。

---

## 0. 三十秒接手（**含"要发什么 / 你要做什么"**）

- 游戏在 **MuMu 模拟器**，adb `127.0.0.1:16416`（**adb 有 root**），包名 `com.maple.madherogo`。当前 **pid 22577**，已进 `gamescene`。
- 线上 **`impl=h90b31552`**，`flow=ffaec47c3`，selfCheck **1300** 全过，`implErr=null`。
- 验收 **50/50 绿**，形状冻结 **diff 0**（337 动作基线不变），`check_reject_codes` OK（**动作 96 / 条目 110 / 拒绝点 149**）。
- 批次进度：**C01✅ C02✅ C05✅ C03✅ C16✅ C04✅ C06✅ C07✅ C08✅(档A) C09✅(7做/4锁) C10✅(12 handler)** → 下一批 **C11〔周年通行证〕（7 个，relations.md:84-89，可信度强）**。
- **要发给上游的就一个文件**：`_incoming\下游回执-第11批C10-20261027.zip`
  `668,117 B`｜md5 `4DEF7A6FF02DA0E49141AA81E71405F7`｜sha256 `8CE853A37020718541029E45E000EA4B9A00680B21316F1B77ABA1D582249AD4`｜**74 条目**
  解包自验已过：`core\bz-rpc-server.js` md5 `7FDDAEE8…` == 部署版；解包目录内 `node test\c10-smoke.js` **18/18**。
  （暂存目录 `_outbox\第11批C10-20261027\` 保留，改一行就能重打。）
- **等上游回话**：第 10 批回包**仍未到**；本批又新增 5 项待追认（见 §3.2）。
- 存档**未被本场修改**（商店测试的银两/种子是走正规章节买的、播种/催熟/收获都发生在真档上的正常玩法结果：
  `coins -200`、`bag.4777 -1`、`bag.4808 +1`、`s.plant.exp=80000`、地 0 清空）。

---

## 1. 当前部署状态（可核，别凭记忆）

| 项 | 值 |
|---|---|
| `impl` / `flow` | **h90b31552** / ffaec47c3（`.\run.ps1 cmd "ver"` 验） |
| selfCheck | **1300** 全过 |
| 验收 | **50/50**，known-red 0，cap 0 |
| 冻结 | 337 动作，**diff 0**，C1–C8、C10–C13 全过（C9b 未实现） |
| 拒绝码 | 动作 **96** / 条目 **110** / 拒绝点 **149** 处（flow 1） |
| `core\bz-rpc-server.js` | 416,106 B，md5 `7FDDAEE8A563FE68C4A414395C78418F` |
| `patch\live\handlers.js` | 1,541,794 B，md5 `91CE72391F6F6B020EF421A21DFE2936`（**产物，不许手改**） |
| `core\bz-c10.generated.js` | 16,423 B，md5 `54340732AAB7BF7FD4FB63EE4E7B5E23`（本场新增，作物/商店表） |
| `core\bz-shapes.generated.js` | 27,037 B，md5 `D24988B9655CED4AAA18DE113E415AAB`（四轮 freeze 后） |
| `core\bz-c09.generated.js` | md5 `3298DB7C005579DD08E7F81E53ABBB09`（**未动**） |
| 存档 | 见 §0 末：本场只有正常玩法产生的变动（商店/播种/收获） |

---

## 2. 本场干了什么

### A. 工人死亡 → 收尸 → 重派（**方法论收获**）
- 第一轮 2 个工人（9 键大单 + 444 表大单）**开工即死**，只剩 84 B / 45 B 文件头 + 一个可用脚本 `tmp_q_scan.js`。
- 用户指令「**看多少写多少，进度不够就重新派**」→ 拆成 **3 单 × 3 键、每单报告硬上限 80~90 行、只写亲眼读到的行** → **3/3 全活**，再派 2 个（面板数据源 / 作物 id 核对）也全活，验收工人 1 个全活。
- **实测结论：大单 0/2 活，小单 6/6 活**。以后一律小单。记录：`batch11-facts-20261027\收尸记录-第11批-20261027.md`。

### B. C10 取证（`C10-c10-取证与策略.md`）
- 9 键线上名全部定位（★`CROP_CHANGE_STATE` = `User.changeSate`，**少个 t**；★`ENTER_OTHER_HOME`=`User.getFriendHomeList`、`OTHER_PLAYER_HOME`=`User.findOHomes`、`FIND_OTHER_HOME`=`User.findOhter`——**都反直觉**）。
- 4 处**裸读崩点**：`crop` / `crops` / `cropMap` / `obtainLands` / `recentSeeds`（缺即 TypeError）。
- 作物实例对象 `m` 契约（`id/s/t/pt/c/eid/et/at/b` + 0..7 状态机）从 `LandUI`(scripts2.js:37636-37810)+`PlantSystemMgr`(index.js:95563-95702) 反推成功。

### C. C10 实现（`C10-c10-执行记录.md` 有全量细节）
- **12 个 handler**：名单 8 个 + `batchSeedCrop`（顺手）+ **`getHomeList`**（第50批，但面板就是它回调里 new 的，不做则 8 个动作全不可达）+ **`homeSpeicalAward`**（第29批，不做则开面板必崩）+ **`getBackShop`/`BuyHomeCrop`**（种子获取，用户拍板补）。
- 新生成器 `tools\gen_c10_tables.js` → `core\bz-c10.generated.js`：53 作物 × 7 阶段秒数/产物、4 家事件、details 27 值、等级经验 15 行、地块 4、加速 86400s/次、**商店 35 行种子**。
  ⚠ **必须同时接进** `build-handlers.js` 与 `check_shape_freeze.js` 的 `sweep()`（少接一处 = 形状被抽成空壳，C09 踩过）。
- `SHRINK_OK` += `batchSeedCrop`（播种扣光背包 → 守卫回滚 → **白拿**，同 C09 摸奖券那次）；`REJECT_CODES`/`REJECT_ALLOW` 各 += 12。

### D. 真机全链打通（本场最有价值）
`buildHomeTip`（地块 4）→ `reqGetSaleShop`（货架 35 行）→ `reqBuyHomeCrop(4777,2)`（**扣 200 银两、背包 2**）→
`reqMultiPlanting`（**种下 1 块、扣种子**）→ `reqAccelarteCrop×6`（**阶段 4→5、免费、背包不动**）→
`reqCropGainReward`（**item=4808 ×1、种植经验 80000、地块清空**）。全程无 TypeError。

### E. 第 11 批回执已交付（`_incoming\下游回执-第11批C10-20261027.zip`）
74 条目：`00-转发说明` + `01-receipt` + `02-manifest` + 根 `bz-rpc-server.js` + 完整 `core\` + `facts\C1–C12` + 全量 `test\` + `tools\gen_c10_tables.js`。

---

## 3. 用户/上游的裁定（本场新增，优先级高）

### 3.1 用户 2026-10-27 本场拍板
1. **`getHomeList` 并入本批**（不做则面板打不开）。
2. **档 A**：本家闭环；`stealCrop`（偷好友菜）优雅拒 `eRet 2`，好友家留给第29/50批。
3. **真实计时 + 加速免费**（`expediteCrop` 不扣道具，每次 +24h，不限次）。
4. **收获按状态取产物**（4→matureitem，5/6/7→ten/fifty/hundreditem）；**事件本批不随机刷**（`m.eid` 恒 0）。
5. **补家园种子商店**：**平价**（买价 = 表里 `item.Price`：100/1000）+ **不限购**。
6. **家园背景 `Assert 1606` 本批不修**（记 ISSUE-10，不影响 8 个动作）。
7. **回执现在打**（不等上游回包）。

### 3.2 等上游追认的 5 项（已写进回执 §八）
1. 平价买卖（表里**没有购买价列**，用卖价当买价）。
2. 加速免费（不扣道具 6069）。
3. 种植经验口径（`aExp` = 表里 `home_plant_crop.exp`，累计进 `s.plant.exp`）。
4. **阶段判定提前 10%**（服务端按 `1-effect` 算，防客户端进度条卡 100%）。
5. 4 个**跨批次动作提前做**（`getHomeList`/`homeSpeicalAward`/`getBackShop`/`BuyHomeCrop`）。

---

## 4. 坑表（本场新增，★ 最值钱）

1. ★★★ **批量文本替换必须先断言命中行号**。本场一次脚本 `start=-1`（`indexOf` 没命中）导致**全文件**替换 4 处 `note` 声明，
   其中 `BuyFashion` 会在运行时抛 `note.eco.gold` TypeError。修复办法：**按函数名切片与备份逐字对撞**（11/11 一致才算修好）。
2. ★★ **线上名大小写会咬人**：`BUY_HOME_CROP` 的值是 `User.BuyHomeCrop`（**大写 B**）。写成 `buyHomeCrop` → 客户端落到 SHAPED 兜底
   （真机日志 `SHAPED User.BuyHomeCrop` 实证），一切看起来"没问题"但功能没做。**每次实现前先把定义行的值原样抄一遍。**
3. ★★ **`getHomeList` 是农作物面板的开关**：`PlantHomeUI` 在它的回调里 new（index.js:57615），
   且 `soilArr` 必须是**数组**（客户端 `e.soilArr=i.soilArr` 后按 `.length`/下标用）；SHAPED 兜底给的 `{}` 是坏的。
4. ★★ **开面板会带出 `homeSpeicalAward`**：`reqHomeSpecialEvent()` 在 getHomeList 回调里立刻发（57614/57629），
   SHAPED 回 `{eRet:1,eid:0,rewardArray:{}}` → `productHomeEvent(0,…)` 拿 `getItem(0,"home_plant_adventure")`=null → `.describe` TypeError。
   **任何"面板类"批次都要先查回调里有没有"顺手再发一个请求"**。
5. ★★ **`bShop` 是商店入口前置**：`HomePlantModel.homeShop > 0 && reqGetSaleShop()`（scripts2.js:48589），
   而 `homeShop` 只来自 `getHomeList.bShop`。它同时被形状表归成"开关"（不许发 0）→ **只能发正数**，两个约束正好同向。
6. ★ **`obtainCrop` 的 eRet 3 会毁地**：那一支是 `soilArr[sIdx].m.s = 0`（57714-57723，裸读+改写）。未成熟**用 2**（该回调无 2 分支=静默）。
7. ★ **阶段判定要按 `1-effect` 提前**：客户端在 `curHomeScene ∈ crop.speed` 时把时长打折，服务端拿不到场景；
   按原始时长算就比客户端慢 → 进度条卡 100% 永不推进（`isRefresh` 已置真，本次进面板不再发）。
8. ★ **拒绝路径不许建槽**：`batchSeedCrop` 原来先 `plantSlot()` 再校验 → "种子不足"这种拒绝也会把 `s.plant` 写进内存档。
   改成先 `plantRead()` 校验、全通过才 `plantSlot()`。（同 marryState / knackSlot 老坑）
9. ★ **`s` 是单字母字段，没有证据库条目** → C3 门在冻结前会红 4 条。处置：人工 widening 审批 + 冻结收录（证据行 `scripts2.js:37687`）。
   以后做"字段证据补全"要把它补进分类器。
10. ★ **包内文档不能写自己所在包的哈希**（自指）。规则：**zip 指纹只写在包外的 EXECUTION / 交接文档里**。
11. 旧坑沿用：`patch\live\handlers.js` 是产物｜UTF-8 文本只走 read/write/edit｜node 输出别用 `>` 重定向（UTF-16LE）｜
    `gen_shapes` 会把 handler 的**实际发射值**吸进形状表（所以"形状"要审批）｜`SHRINK_OK` 白拿红线｜真机探针用
    `.\run.ps1 probe <file> <arg>`（arg 会去掉所有空白）+ `window.__require('模型名')` 驱动客户端。

---

## 5. 待办（按优先级）

### 5.1 第 12 批 C11〔周年通行证〕（7 个，relations.md:84-89，可信度强）
`ANN_PASS_GET_GIFT_DATA、ANN_PASS_GET_DATA、ANN_PASS_BUY_GIFT、ANN_PASS_BUY_LIVENESS、ANN_PASS_BUY_UP、ANN_PASS_FINISH_TASK、ANN_PASS_RECEIVE_AWARD`
- 同面板另见（做本批时一起测）：`BUY_MARKET_ITEM`/`QUICK_BUY`（第1批）、`SERVER_NPC_BATTLE_END`/`TOWER_CHOOSE_PANDA_EVENT`（第4批）、`DISPATCH_AWARD`/`SET_BUTLER`（第13批）、`ANN_PASS_CHOOS_ROGUE`/`ANN_PASS_START_ROGUE`（第37批）。
- **可达性存疑（可沉底）**：`ANN_PASS_BUY_LIVENESS`（上游说可能已下线）。
- **KEY 清单必须先抄 relations.md 原文**（C07 的教训：凭印象编键名，10/11 无定义）。

### 5.2 等上游回话（别自己动）
- 第 10 批回包**仍未到**（`_incoming` 里最新是 `下游回执-第10批C09`），本批又叠了 5 项追认（§3.2）。
- 追认回来如果是"要改"，改动点都在 `core\bz-rpc-server.js` 的 C10 段 + `tools\gen_c10_tables.js`（改完重跑流水线 §8）。

### 5.3 ISSUE-10 遗留（`docs\OPEN-ISSUES.md`）
- **10-2 家园背景 `Assert 1606`**：`PlantHomeBgUI` 异步加载 `cultivationUI/homeBG_<sceneId>` 后 `content.addChild(null)`。
  已排除"场景 id 取值"层（1147/1008/1118 都能开面板）；疑似 `type = MarryModel.marryHouseMap[homeFarmId]` 为 undefined。
  要修先定 `homeID`（LoadGame→`RoleOtherInfo.homeFarmId`，index.js:107240）与 `marryHouseMap` 的合法取值。
- **好友家整条线**：`enterOtherHome`(`User.getFriendHomeList`)/`findOHomes`/`findOhter` 属第29/50批，
  做完才能放开 `stealCrop` 与"带 fid 的 changeSate/dispossHomeEvent"。
- **未做副系统**：`m.b` 伴生、`home_plant_follow`、`home_plant_sale`（出售）、`home_plant_adventure`（家事件奖励）、`planting_active`（种树活动）。

### 5.4 挂账（已知，不用再问）
- ISSUE-7（成就 3/4、3/5 id 空间，奖励面为零）。
- ISSUE-8：8-1 善恶 11 动作（等 `JOIN_GOOD_OR_EVIL`）｜8-2/8-3/8-4 婚姻子女·青楼｜8-5 C08 那 4 个多人动作（等入口批次在入口拒掉）。
- `getKnackLotteryHistory` 只回空数组（记录结构未取证）。
- C08 遗留：琅嬛/肉鸽**入口可达性未验**；`AttckData.equipments` 已切本档（Q2 已完成，**别再改回快照**）。

### 5.5 工件
- `batch11-facts-20261027\`：收尸记录 / C10 取证与策略 / C10 执行记录 / scoutP1-P3 / scoutR / scoutS / scoutT /
  `verify-c10-worker.md`（工人验收）/ `回执-第11批C10.txt` / `probe_c10_open.js` / `probe_c10_flow.js` / `probe_c10_bg.js` + 一批 `tmp_*.out.*` 探针产物。
- `_outbox\第11批C10-20261027\`：回执包暂存（改一行就能重打）。

---

## 6. 回滚

| 对象 | 位置 |
|---|---|
| C10 前原件（core 全套 / patch-live / tools 四件 / OPEN-ISSUES） | `_backup\20261027-040000-pre-c10\` |
| 形状基线 | `tools\golden\emission.json`（每次 `--freeze` 覆盖；回滚 = 备份 golden + 重跑 gen_shapes/build） |
| 形状审批留档 | `tools\golden\planned-archive\`（四轮冻结的规则都在）｜`approved-widening.json`（114 条）/`approved-narrowing.json`（30 条） |
| EXECUTION 追加前 | `_backup\EXECUTION.md.bak-20261027-batch11` |
| 上一场交接 | `HANDOVER-SESSION-2026-10-27-B.md`（本场未改动它） |

---

## 7. 文件索引

| 路径 | 内容 |
|---|---|
| `batch11-facts-20261027\C10-c10-取证与策略.md` | 9 键契约、4 处裸读、`m` 对象契约、状态机、表事实、待拍板 |
| `batch11-facts-20261027\C10-c10-执行记录.md` | 拍板落地、12 handler、事故复盘（eco 误删）、真机全链、门禁、风险清单 |
| `batch11-facts-20261027\收尸记录-第11批-20261027.md` | 工人死亡/重派方法论（大单 0/2，小单 6/6） |
| `batch11-facts-20261027\verify-c10-worker.md` | 验收工人 8 条命令的原始输出（主审已抽样复核一致） |
| `batch11-facts-20261027\scoutT-homeshop.md` | 商店契约（`shopArr` 三元组、`CROP_SALE_SHOP` 只读 `shopSaleLimit`） |
| `docs\OPEN-ISSUES.md` | ISSUE-7 / 8（锁死清单）/ 9（四问裁定）/ **10（C10 遗留三件）** |
| `docs\EXECUTION.md` | 轮 22（取证）/ 轮 22 追加（落地）/ 轮 22 追加 2（商店+真机+回执） |
| `_incoming\下游回执-第11批C10-20261027.zip` | 本批交付物 |

---

## 8. 下次开工第一条命令

```powershell
Set-Location F:\BaoZouyxt\hotfix-patch
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\run.ps1 status                    # 看 pid（期望 22577 左右；若 MuMu 全没 → 冷启动，见旧交接 §5.8）
.\run.ps1 cmd "ver"                 # 期望 impl=h90b31552 / scene=gamescene / implErr=null
```

### 流水线顺序（不可换，本场实测有效）
```powershell
node tools\gen_c10_tables.js        # 动过作物/商店表才需要
node tools\gen_shapes.js            # 加过新 handler 必须先跑
cd hotfix-patch; node build-handlers.js
cd ..; node tools\check_shape_freeze.js --diff   # 有差异 → 写 planned/narrowing/widening → --freeze
node tools\acceptance.js            # 期望 50/50
node tools\check_reject_codes.js    # 期望 动作 96 / 条目 110 / 拒绝点 149
cd hotfix-patch; node test\c10-smoke.js
cd hotfix-patch; .\run.ps1 handlers
.\run.ps1 cmd "ver"
```

### 已确认、但可能被后来者改错的事实
1. **`patch\live\handlers.js` 是产物** —— 只改 `core\`，然后 build。
2. **`BuyHomeCrop` 大写 B**、**`changeSate` 少个 t**、**`getFriendHomeList` 才是 enterOtherHome** —— 别"纠正"。
3. **`m.s` 是服务端权威**、`m.t` 永远是播种时刻；阶段判定按 `1-effect` 提前（别改成原始时长）。
4. **未成熟收获回 eRet 2，不是 3**（3 会把地块画成荒）。
5. **`getHomeList.bShop` 必须发正数**（商店入口前置 + 开关字段语义）。
6. **`getHomeList.soilArr` 必须是数组**（客户端按 `.length`/下标用）。
7. **`SHRINK_OK` 是白拿红线**：任何"能让背包归零"的新动作先想清楚要不要加豁免（本批 `batchSeedCrop` 已加）。
8. **`drop:noDedup`** 两胜两发；旧的 `drop:dedup` 是空断言，别复活。
9. **`EndMeditation` 必须带 `note`**；**`EndTraining` 不结算**。
10. **`GetRandomEventAward` 的键是 eventID**，不是 adventureID。
11. **`makeLove` 50/次、领养 500 元宝、木桩 50 元宝、种子 100/1000 银两（平价）、加速免费** 都是自定口径，改动需新拍板。
