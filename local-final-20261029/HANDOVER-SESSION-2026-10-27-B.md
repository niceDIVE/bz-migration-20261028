# AGENT 交接：2026-10-27 第二场（C08 档A + 四问落地 + C09 技巧摸奖 + 真机点通摸奖）

> **给下一个 Agent 的**，不是给用户的。读完这一篇就能接手，不需要读对话记录。
> 项目根：`F:\BaoZouyxt` ｜ 补丁工程：`F:\BaoZouyxt\hotfix-patch` ｜ 上游包：`F:\BaoZouyxt\_incoming\`
> ⚠ 同日早场 `HANDOVER-SESSION-2026-10-27.md` **已被本文取代**（原件备份 `_backup\HANDOVER-SESSION-2026-10-27.md.bak-20261027-B`）。
> 命名约定：同一天多场用 `-B` / `-C` 后缀（本项目已有 `-2026-10-25-B/C` 先例）。

---

## 0. 三十秒接手

- 游戏在 **MuMu 模拟器**，adb `127.0.0.1:16416`（**adb 有 root**），包名 `com.maple.madherogo`。
  本场**重启过一次**（为验摸奖门槛），当前 **pid 22577**，已进 `gamescene`。
- 线上 **`impl=hefbb1ad4`**，`flow=ffaec47c3`，selfCheck **1286** 全过，`implErr=null`。
- 验收 **49/49 绿**，形状冻结 **diff 0**（337 动作基线不变），`check_reject_codes` OK（**动作 84 / 条目 98 / 拒绝点 127**）。
- 批次进度：**C01✅ C02✅ C05✅ C03✅ C16✅ C04✅ C06✅ C07✅ C08✅(档A) C09✅(7 做 / 4 锁)** → 下一批 **C10〔农作物〕（8 个，relations.md:77，可信度中）**。
- 回执已交到第 10 批（`_incoming\下游回执-第10批C09-20261027.zip`，sha256 `78BBA8B1…6CDF03`）。**等上游回包后开 C10**（回包里有两句要追认，见 §3）。

---

## 1. 当前部署状态（可核，别凭记忆）

| 项 | 值 |
|---|---|
| `impl` / `flow` | **hefbb1ad4** / ffaec47c3（`.\run.ps1 cmd "ver"` 验） |
| selfCheck | **1286** 全过 |
| 验收 | **49/49**，known-red 0，cap 0 |
| 冻结 | 337 动作，**diff 0**，C1–C8、C10–C13 全过（C9b 未实现） |
| `core\bz-rpc-server.js` | 383,776 B，md5 `211B2E536D57D1C831131A3089452F43` |
| `patch\live\handlers.js` | 1,492,613 B，md5 `4AAE8E937C8C59CCE9F4083AEBD261E3`（**产物，不许手改**） |
| `core\bz-c09.generated.js` | 18,899 B，md5 `3298DB7C005579DD08E7F81E53ABBB09`（本场新增，摸奖表） |
| `core\bz-shops.generated.js` | md5 `257F30E050F98C148DB7ED07FBF9FA81`（**未动**） |
| `core\bz-tasks.generated.js` | md5 `4486247F701441F09B84278CCDAB98D5`（**未动**） |
| 存档 | ⚠ **被动过**：`skills 1/7/8/9 = 100`（原 `40/40/40/21`），另有摸奖券用光、`knackBag=[12331,11591,11457]`。详见 §5.3 |

---

## 2. 本场干了什么

### A. 第 9 批 C08〔PVE 战斗族〕落地（档 A）
- 9 个动作：**4 个做满**（`enterPVEBattle` / `beginPVEBattle` / `enterRoguePVEBattle` / `beginRoguePVEBattle`）＋ **1 个优雅拒**（`ChallengePVP` → `eRet 3`，客户端自带文案 1399 后 dispose）＋ **4 个保留未实现**（肉鸽 PVP + MPPVE 三兄弟）。
- **判定反转**：C07 那套"全锁 eRet 2"在本批**不成立** —— 9 个里 8 个回调**无 else**，`eRet≠1` 是卡战斗界面。写方案前必须逐个回调确认"非 1 分支到底干什么"。
- 关键实现：`AttckData` = 抓包原件 `TPL.reqSelfBattleInfo` 内层（去皮 `eRet/npcArr/npcID`）＋本档 `baseValueAy/roleID/skillMap`；敌方 `npcArr` 取 `BZ_NPCARR`。
- **顺带堵掉真崩点**：`generateNpcData`（index.js:8093-8137）裸读，空 `npcArr` 在 8118 抛 TypeError → 未知 npcID 退回兜底怪 310003（真机验过）。
- `attArr` 一律回空（用户拍板②）：空数组 = 服务端不保命、不覆盖本地血量，本地模拟自然打完（读点全在 `length>0` 守卫里）。

### B. 上游第 9 批验收通过 + 四问回话落地（**重要，改变了 C08 的两处口径**）
裁定原文在 `_incoming\batch9-accept-20261027\unpacked\entry1.txt`，落档 `docs\OPEN-ISSUES.md` 的 **ISSUE-9**：
- **Q1 维持现状** ＋ 补一条：**入口批次（`INIT_MPPVE_BATTLE` / 肉鸽 PVP 入口）优先看入口回调有没有优雅拒绝分支，有就拒在入口** → 已写进 ISSUE-8 第 8-5 行。
- **Q2 维持快照 ＋ 可选"限时 2 小时按 `parseEq` 读点反推实例格式，不要等抓包"** → **反推成功并已切到本档装备**（见 C）。
- **Q3 不排**（服务端不管血量）。
- **Q4 以 drop-table 为准：打赢两次就掉落两次**，把 `drop:dedup` 那条自检改掉 → 已改（见 D）。

### C. Q2 反推成功：`AttckData` 的装备换成**本档**
- 契约：战斗链用的是 `ItemUtils.parseEq`（index.js:66282-66305，别名 74624），逐位读 `e[0]=type / e[1]=数量或 itemID / e[2]=weaponSkinId 或 attrs / e[3]=crystalIds / e[4]=weaponSkinId`；`equipments={槽位:uid}`、`equips={uid:数组}`（74785-74796）。
- **我方存档本来就是同一形状**（`s.playerEquip[uid]=[1,数量]`、`s.equipments[槽位]=uid`）→ 直接 `clone` 搬过去，零转换。
- 形状差异 16 项（14 删槽位 + 2 加空对象标记）→ 审批 → 冻结 diff 0。

### D. 修掉一条**永远为真的空断言**
- 旧的 `drop:dedup` 断言写的是"两次结算后 `playerEquip` 完全相同"，但 `loadSave()` 两次返回**同一个对象引用** → `after1 === after2` 恒真，改成什么语义都永远不会红。这就是它跟 `drop-table` 互斥却一直没被发现的原因。
- 现在：每场打完**当下立即取计数**，断言 `n1===1 && n2===2`，改名 `drop:noDedup`（不在 required-checks 里，可安全改名）。

### E. 第 10 批 C09〔技巧摸奖〕：7 做 / 4 锁（详见 `batch10-facts-20261027\C9 / C10` 两份文档）
- **实现**：`getKnackLottery` / `knackLottery` / `getKnackLotteryHistory` / `getSkillGrasp` / `skillGrasp` / `changeSkillKnack` / `rgChangeSkillKnack`（注意上游拼写 **SKNACK**）。
- **锁**（`eRet 2` + 应答收窄到只有 eRet）：`resolveEquip` / `batchResolveEquip` / `resolveKnack` / `batchResolveKnack` —— 444 张 dump 无分解/合成产物表。
- 新增生成器 `tools\gen_c09_tables.js` → `core\bz-c09.generated.js`（券 9191、单抽 1/十连 10、免费 1/日、46 技能、230 行掉落、230 组×5 品质）；**接进了 `build-handlers.js` 与 `check_shape_freeze.js` 的 sweep**（少接一处，sweep 时表是 undefined、形状会被抽成空壳）。
- **顺带补两个同面板崩点**：`getSkillTrickExchangeData` / `refreshSkillTrickExchangeData`（口诀兑换面板；不补则客户端裸读 `nextRefreshTime` TypeError）。

### F. 真机把摸奖界面点通了（这是本场最有价值的部分）
- 三抽全对：免费 1 次（券不动）→ 付费 2 次（券 2→1→0），`showKnack` 分别 `[12331]/[11591]/[11457]`，奖励框"获得…"文字正常，`knackBag` 三条落盘。
- 修掉 `OBS 未解释差额 knackLottery: bag.9191 2→1`（应答缺 `note.ivch`）。

---

## 3. 用户/上游的裁定（本场新增，优先级高）

1. **四问**（见 §2.B）：Q1 入口拒掉｜Q2 反推成功就切本档（推不出继续快照且**不用再问**）｜Q3 不排｜Q4 两胜两发。
2. **摸奖两表分工**（用户 2026-10-27 拍板）：先 `skill_Trick_Drop.drop_probability` 抽**组**，再机台表 `probability` 抽**品质** → 组×品质 = `knackId`。
   ⚠ 这两列**客户端 0 读取点**，属"表结构 + 拍板"，**回执已申报等追认**。
3. **分解/合成四件锁住**（用户拍板；合成两件按同理由一并锁并申报）。
4. **摸奖门槛不回滚**：为验界面把真档 `skills 1/7/8/9` 抬到 100，用户明确"不要紧就不管了"——**存档保持现状**。
5. 常规工作（写码/流水线/热重载/打包）做完报结果即可；**破坏性操作协议**与**数据红线**不变。

---

## 4. 坑表（本场新增，★ 最值钱）

1. ★★ **`patch\live\handlers.js` 是产物，不是源**。源是 `core\bz-rpc-server.js`（+ `bz-handler-impl.js` + 四个 generated）。改产物会在下次 build 被覆盖，而且 build 期"拒绝码表动作集合漂移"会莫名其妙报错 —— 本场栽了一次（改完发现 build 报 drift，才意识到改错了文件）。
2. ★★ **`SHRINK_OK` 写前守卫会把"花光背包"的动作回滚 → 变白拿**。摸奖十连把券扣光 → 守卫判"背包从 N 清空 = 缩水" → 整包回滚 → **券没扣、奖照发**。凡是"合法花光背包"的动作（useItem/saleItem/knackLottery）必须加进 `SHRINK_OK`，注释写清事故形态。
3. ★ **自检里比较两次 `loadSave()` 等于什么都没比**：`_save` 是模块级缓存，两次返回同一个对象引用。要比快照就先取值拷贝/立刻取数，别留到后面再读。
4. **PowerShell `>` 重定向把 node 输出写成 UTF-16LE**（首字节 `FF FE`），node 读出来是一整行带 NUL → 正则全不命中。改 `Out-String` + `[IO.File]::WriteAllText(..., UTF8Encoding($false))`。
5. **形状工具按 `leafOfPath` 取字段名**：`AttckData.equipments.3` 的字段名是 **"3"**，不是 `equipments`。写 planned-changes 规则要按"槽位号/数字键"分组。
6. **新动作不在 337 基线 → diff 0、免审批**（C07 的 11 个、C09 的 11 个都是这样）。`gen_shapes.js` 只收录它自己那份清单里的动作。
7. **`check_shape_freeze.js` 会写文件**（`tools\shapes.json` / `bz-shapes.generated.js` / `shapes_report.md` / `facts\lookup-keys.json`），内容幂等，只有 `lookup-keys.json` 的 `generatedAt` 变。验收工人曾把它当"只读命令"，不算错但要知道。
8. ★ **真机调试通道三个要点**：
   - `H.impl.handle` 的签名是 **`handle({url, body})`**（不是 `(body, url)`），第一次探针因此回 `action=blackhole`；
   - 命令通道 `get:` 的 eval **拿不到** `window.__BZ_OFFLINE__`，但**能拿到 bootstrap 闭包的 `H`**；
   - ★ 但它**能拿到 `window.__require('模块名')`** → 可以远程驱动客户端 UI（本场用它 `StoreModel.reqStoreList({back:0})` 开商城、`TrickExModel.reqTrickExchangeData()` 开兑换面板）。要客户端侧验证时别再让用户到处找按钮。
9. **摸奖的入口链别再瞎猜**（本场先猜错一次）：页签来自 `User.GetShopAllActive`（**我们早就实现**，回全量行键）而**不是** `GetPayShowData`（后者把 type 写死 2/8，产不出 9）；默认 `back:1` 压根不请求页签；点 type=9 要 `getMyRoleArtLv() >= getConst(435)=100`，而 `getMyRoleArtLv` 算的是**技能等级**，**不看 `baseValueAy[33]`（artLevel）**。
10. 旧坑沿用：UTF-8 文本只走 read/write/edit｜`node -e` 复杂 JS 写临时文件｜GBK zip 按索引解｜坑表里 madNumber / `muliti`/`chanllenge`/`SKNACK` 等上游拼写别"纠正"｜H 键 = 线上名去 `User.` 前缀。

---

## 5. 待办（按优先级）

### 5.1 第 11 批 C10〔农作物〕（8 个，relations.md:77-82，可信度中，**等上游回包开工**）
`OBTAINCROP、STEAL_CROP_EVENT、CROP_CHANGE_STATE、EXPEDITE_CROP、CLEAN_DEAD_CROP、DISPOSS_HOME_EVENT、ONE_KEY_OBTAIN_CROP、ONE_KEY_DISPOSS_HOME_EVENT`
同面板顺手做：`BATCH_SEED_CROP`（PlantLandUI）。**KEY 清单必须先抄 relations.md 原文**（C07 的教训）。

### 5.2 等上游回话（已写进回执 §七，别自己动）
1. **追认**摸奖两列权重分工；2. **追认或解锁**分解/合成四件（给表我就做）；3. 摸奖门槛 `>=100` 是否放宽；4. `item_quantity` 语义。

### 5.3 存档现状（**后人别当成 bug 排查**）
- `skills 1/7/8/9 = 100`（原 40/40/40/21，为验摸奖门槛临时抬的，用户决定不回滚）。
- `bag.9191` 用光、`knackBag=[12331,11591,11457]`、`knackFree={d:"2026-10-27",n:1}`。
- 整档备份：`_backup\savedata-20261027-023103-pre-knackgate\bz_offline_save.json`（md5 `E4D18AB8…`）。

### 5.4 挂账（已知，不用再问）
- ISSUE-7（成就 3/4、3/5 id 空间，奖励面为零）。
- ISSUE-8：8-1 善恶 11 动作（等 `JOIN_GOOD_OR_EVIL`）｜8-2/8-3/8-4 婚姻子女·青楼｜**8-5 C08 那 4 个多人动作（等入口批次在入口拒掉）**。
- `getKnackLotteryHistory` 只回空数组（`TrickPoolRecordUI` 记录结构未取证）。
- C08 遗留：琅嬛/肉鸽**入口可达性未验**（上游说玩家实测走到再说）；`AttckData` 的 `equipments` 已切本档（Q2 已完成，**别再改回快照**）。

### 5.5 工件
- `batch9-facts-20261027\`：C08 取证/策略/执行记录、scoutG/H/L、真机探针脚本（`tmp_encode_rpc.js` / `probe*.hex`）、第 9 批回执。
- `batch10-facts-20261027\`：C09 取证/策略/执行记录、scoutJ/K/M/N、`tmp_gen_c09_approvals`?（无）、第 10 批回执。
- `_outbox\`：两批回执包的暂存目录（保留，改一行就能重打）。

---

## 6. 回滚

| 对象 | 位置 |
|---|---|
| C08 前原件（core / patch-live / docs / golden / test） | `_backup\20261027-013103-pre-c08\` |
| C09 前原件（`bz-handler-impl.js` / OPEN-ISSUES） | `_backup\20261027-015349-pre-c09\` |
| 真档（抬技能等级前） | `_backup\savedata-20261027-023103-pre-knackgate\bz_offline_save.json` |
| 形状基线 | `tools\golden\emission.json`（每次 `--freeze` 覆盖；回滚 = 备份 golden + 重跑 gen_shapes/build） |
| 旧交接原件 | `_backup\HANDOVER-SESSION-2026-10-27.md.bak-20261027-B` |

---

## 7. 文件索引

| 路径 | 内容 |
|---|---|
| `batch9-facts-20261027\C7-c08-取证与策略.md` / `C8-c08-执行记录.md` | C08 的判定、AttckData 证据链、坑与真机探针 |
| `batch9-facts-20261027\scoutL-parseeq.md` | `parseEq` 三份定义 + 实例格式字段清单（Q2 反推的全部依据） |
| `batch10-facts-20261027\C9-c09-取证与策略.md` / `C10-c09-执行记录.md` | C09 的口径、必带字段、4 锁理由、真机三抽与临时改档说明 |
| `batch10-facts-20261027\scoutN-getpayshow.md` | 商城/摸奖入口真相（页签来自 `GetShopAllActive`） |
| `docs\OPEN-ISSUES.md` | ISSUE-7 / **ISSUE-8 锁死清单** / **ISSUE-9 四问裁定** / ISSUE-1~3 |
| `docs\EXECUTION.md` | 轮 18–21（本场全程），含两次追加 |
| `_incoming\下游回执-第{9,10}批*.zip` | 已交付的回执包（各 60+ 条目，含 core 全套 + facts + test） |

---

## 8. 下次开工第一条命令

```powershell
Set-Location F:\BaoZouyxt\hotfix-patch
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\run.ps1 status                    # 看 pid（期望 22577 左右；若 MuMu 全没 → 冷启动，见旧交接 §5.8）
.\run.ps1 cmd "ver"                 # 期望 impl=hefbb1ad4 / scene=gamescene / implErr=null
```

### 流水线顺序（不可换，本场实测有效）
```powershell
node tools\gen_c09_tables.js        # 动过摸奖表才需要
node tools\gen_shapes.js            # 加过新 handler 必须先跑
cd hotfix-patch; node build-handlers.js
cd ..; node tools\check_shape_freeze.js --diff   # 有差异 → 写 planned/narrowing/widening → --freeze
node tools\acceptance.js            # 期望 49/49
node tools\check_reject_codes.js    # 期望 动作 84 / 条目 98 / 拒绝点 127
cd hotfix-patch; .\run.ps1 handlers
.\run.ps1 cmd "ver"
```

### 已确认、但可能被后来者改错的事实
1. **`patch\live\handlers.js` 是产物** —— 只改 `core\`，然后 build。
2. **`AttckData` 的装备用本档**（Q2 已落地）——别改回抓包快照。
3. **`drop:noDedup`**：两胜两发。旧名字 `drop:dedup` 那条是**空断言**，别复活它。
4. **`EndMeditation` 必须带 `note`**；**`EndTraining` 不结算**（前者无守护直读，后者客户端不读 note）。
5. **`GetRandomEventAward` 的键是 eventID**，不是 adventureID（客户端恒发 0）。
6. **`makeLove` 50/次、领养 500 元宝、木桩 50 元宝**都是自定口径，改动需新拍板。
7. **摸奖**：扣券 9191（不是金币）；`showKnack` 必带（`TrickRewardUI` 拿 `.length` + 逐项 `.knackId`）；`tenPrice` 缺了界面一开就崩。
8. **`SHRINK_OK` 是白拿红线**：任何"能让背包归零"的新动作，先想清楚要不要加豁免。
