# AGENT 交接：2026-10-27 第六场（F = C12 防刷合并 + C13 UFO 夹娃娃落地 + 第 14 批回执交付）

> **给下一个 Agent 的**，不是给用户的。读完这一篇就能接手，不需要读对话记录。
> 项目根：`F:\BaoZouyxt` ｜ 补丁工程：`F:\BaoZouyxt\hotfix-patch` ｜ 上游包：`F:\BaoZouyxt\_incoming\`
> ⚠ 同日 `HANDOVER-SESSION-2026-10-27.md` / `-B/-C/-D/-E.md` **均已被本文取代**（原件都在，没删）。

---

## 0. 三十秒接手（**含"要发什么 / 你要做什么"**）

- 游戏在 **MuMu 模拟器**，adb `127.0.0.1:16416`（**adb 有 root**），包名 `com.maple.madherogo`。当前 **pid 22577**，已进 `gamescene`。
- 线上 **`impl=h3b555bcf`**，`flow=ffaec47c3`，selfCheck **1371** 全过，`implErr=null`。
- 验收 **53/53 绿**（c13-smoke 9 条已收编），形状冻结 **diff 0**（**356 动作**基线），`check_reject_codes` OK（**动作 117 / 条目 134 / 拒绝点 202**）。
- 批次进度：**C01✅ C02✅ C05✅ C03✅ C16✅ C04✅ C06✅ C07✅ C08✅ C09✅ C10✅ C11✅(上游验收收口) C12✅(上游验收修复已合并) C13✅(4 活键，3 死键跳过)** → 下一批 = **relations.md:99-100 第 15 批 C14〔斗狗〕7 键（可信度强）**：`LOOK_DOG_LOG、ENTER_PVEDOG_FIGHT、REQ_DOG_PARTNER_END_BATTLE、REQ_DOG_PARTNER_PVE_BATTLE、DOG_BATTLE_RESULT、FEED_DOG、ENTER_PVE_ROGUE_FIGHT`。
- **要发给上游的就一个文件**：`_incoming\下游回执-第14批C13-20261027.zip`
  `696,058 B`｜md5 `7399266317C58C70E8F1D03F0DE90AA5`｜sha256 `DE8B18F8610AAF979745B484AAA23B0278EFA8F9FD9E2A4C59281142C8C093EE`｜**81 条目**
  ⚠ core 里已含第 13 批管家防刷合并（本包 = C12 防刷 + C13 的连续交付）。
  解包自验已过：根/core 的 bz-rpc-server.js md5 `774D4495…` 同为部署版；解包内 c13-smoke **9/9**、c12-smoke 14/14、c11-smoke 14/14。
- **等上游回话**：第 10/11 批回包未到；第 12 批收口；**第 13 批（管家）验收+防刷已由本包处理完毕**（五项口径全追认）；C13 待验收。
- 存档**本场只有正常玩法变动**：消费 100 元宝（买刷新）；获得 8143×30（抓中难度 2）、三档爪子各 3 把、免费刷新 1 次、派遣奖励待领（C12 链）。

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
| `core\bz-c13.generated.js` | 728 B，md5 `F212042FBEE1725E03D4B5D11224C65E`（本场新增） |
| 存档 | 见 §0 末 |

---

## 2. 本场干了什么

### A. 上游 C12 验收回执落地（管家奖励防刷）
- 白拿口：dispatchAward 每 30 分钟无限领 helper.reward + 领前换管家领别人的。
- 修法（上游包基于合并版 7C7CD7AC，diff 确认只改 dispatch/dispatchAward 两处后**整文件采用**）：dispatch 落档记
  `P.dispatchHelper` → 领奖按它算 → 每位管家一次性（helperRewardArr 已有 → 发空 {} 派遣照常成功）→ 发过才 push → 领完清 dispatchHelper。
- c12-smoke 上游 14 用例版（+⑧b 防刷回归）。**五项口径全追认**（含"mapId 白名单加自愈通道这个处理很好"）。
- 门禁全绿后部署（h74ca9c12 中间版）。

### B. C13 取证（4 工人 4/4 全活 + 主审对撞零冲突）
- 三大发现：①★3 死键（零调用点，同 C10 SEED_CROP）；②★**rewardPool 由服务端下发**（444 张表无 ufo 配置；客户端 `package_difficulty` 表只管摆位物理，initItems 25824-25847）；③★REWARD_UFO 带**防作弊签名 signCode=md5(2*signId+37)**。活动闸 = active 37"圣诞抓娃娃"（2026-05-27→06-03 已过期→自定常开）。入口 = 夹娃娃机 NPC（NpcFuncType97）。全批字段有守卫（崩点趋零）。

### C. C13 实现（4 活键，档 A；死键 3 个跳过）
- gen_c13_tables → bz-c13.generated.js；4 handler（getUFOCatcherData/rewardUFO/useUFOrefresh/buyUFORefreshTimes）+ dl 助手；首开赠送三档爪子各 3 + 免费刷新 1（自定申报）；抓取服务端权威（池子加权随机 → 8143×reward 照表）；池空自动刷新（autoRefresh 契约 25761）。
- **★新坑：模板新档 `s.bag` 缺位**——首开赠送走 grantRewardList→bagAdd 时 s.bag undefined → `Cannot read properties of undefined (reading '8117')` → catchNoCode → 排放成 `{}`（**diff 每键只有 1 行 = catchNoCode 的鉴别特征**）。修复：dlEnsure 确保 s.bag。**教训：新档上发物品前必须确保 s.bag 存在。**
- 另：构建期双向比对再抓 core/JSON 漂移（getUFOCatcherData.noTable 漏登记）。

### D. 门禁与真机
- 形状 **356 动作 diff 0**｜reject-codes **117/134/202**｜acceptance **53/53**｜c13-smoke 9/9｜c12 14/14、c11 14/14、c10 18/18、r14 3/3。
- 真机全链（ver=h3b555bcf）：getUFOCatcherData（**free=1 赠送、items=7 上机**）→ useUFOrefresh（池重生成、signId+1）→ rewardUFO gear0（**抓中难度 2 → 8143×30、池余 6**）→ buyUFORefreshTimes（**refreshTimes=1/bought=1/-100 元宝**）。
- 验收工人 9 条命令 **9/9** + 主审抽样复核一致。

---

## 3. 用户/上游的裁定（本场新增）

### 3.1 用户 2026-10-27 本场拍板（C13）
1. 跳过 3 死键。2. 抓取服务端权威（忽略客户端 packages）。3. 照扣爪子 + 活动常开。4. signCode 验存在。
### 3.2 上游追认（C12）
五项口径全追认 + 3 并入键追认 + mapId 自愈通道好评；**通用新规：奖励靠计时循环反复领的，必须有每日上限或每次付出成本；表里有"已领"数组的一律按一次性发。**

---

## 4. 待办（按优先级）

### 4.1 下一批
- **第 15 批 C14〔斗狗〕7 键（relations.md:99-100，可信度强）**：`LOOK_DOG_LOG、ENTER_PVEDOG_FIGHT、REQ_DOG_PARTNER_END_BATTLE、REQ_DOG_PARTNER_PVE_BATTLE、DOG_BATTLE_RESULT、FEED_DOG、ENTER_PVE_ROGUE_FIGHT`（共享 token:DOG/BATTLE/PVE）。
- ⚠ 战斗族批次：C08 的战斗基建（AttckData 等）已在线上，先读交接 D/E 的战斗相关事实再排工单。

### 4.2 ISSUE-13（docs\OPEN-ISSUES.md）
- 13-1 死键跳过申报；13-2 档 B（真 md5 校验/packages 校验/任务链）；13-3 概率与经济口径挂账；13-4 爪子来源与 NPC97 可达性待取证。

### 4.3 挂账（已知）
- ISSUE-7/8/10-2/10-3/11/12 在案；第 10/11 批回包未到；第 37 批 START_ROGUE/CHOOS_ROGUE 未做。

### 4.4 工件
- `batch14-facts-20261027\`：取证与策略 / 执行记录 / 主审独立探针记录 / scoutP1/P2/U/T / 工单 / probe_c13_flow.js / tmp_add_reject_c13.js / tmp_planned_c13.js / verify-c13-worker.md。

---

## 5. 回滚

| 对象 | 位置 |
|---|---|
| C13 前全套（core/reject-codes/todo_shapes/两 docs/c12-smoke） | `_backup\20261027-113000-pre-c13\` |
| C12 防刷合并前 | `_backup\20261027-111500-pre-c12fix\`（core/smoke 两件） |
| 形状基线 | `tools\golden\emission.json`（356 动作） |
| planned 留档 | `tools\golden\planned-archive\frozen-*.json`（本轮 4 条规则） |

---

## 6. 文件索引

| 路径 | 内容 |
|---|---|
| `batch14-facts-20261027\C13-c13-取证与策略.md` | 7 键契约（3 死键）、rewardPool 数据源、signCode、活动闸、策略草案 |
| `batch14-facts-20261027\C13-c13-执行记录.md` | 4 handler 要点、★s.bag 缺位坑、门禁终值、真机全链、回滚 |
| `batch14-facts-20261027\主审-独立探针记录.md` | 主审 §一-§八（与工人对撞零冲突） |
| `docs\OPEN-ISSUES.md` | ISSUE-13 新增 |
| `docs\EXECUTION.md` | 轮 26 新增 |
| `_incoming\下游回执-第14批C13-20261027.zip` | 本批交付物 |

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
cd ..; node tools\check_shape_freeze.js --diff   # 有差异 → tmp_planned_c13.js 式规则 → --freeze
node tools\check_reject_codes.js    # 期望 动作 117 / 条目 134 / 拒绝点 202
node tools\acceptance.js            # 期望 53/53
cd hotfix-patch; node test\c13-smoke.js ; node test\c12-smoke.js ; node test\c11-smoke.js ; node test\c10-smoke.js ; node test\r14-catch-smoke.js
cd hotfix-patch; .\run.ps1 handlers ; .\run.ps1 cmd "ver"
```

### 已确认、但可能被后来者改错的事实
1. **`patch\live\handlers.js` 是产物** —— 只改 `core\`，然后 build。
2. **C13 线上名**：getUFOCatcherData / getUFOCatcherTask / **useUFOrefresh（r 小写）** / buyUFORefreshTimes / rewardUFO / rewardUFOCatcherTask / buyUFOGameCoin；actions.json 无本批条目（index.js 定义是唯一来源）。
3. ★**3 死键按拍板跳过**——别"补全"它们。
4. ★**rewardPool = {难度id: 数量}**，键是 package_difficulty 行 id（1-5）；**抓取服务端权威**（忽略客户端 packages）；池空回 autoRefresh+新池。
5. ★**模板新档 s.bag 可能缺位**——新档发物品前必须 ensure（dlEnsure 已带；其它批次的赠送类 handler 也要注意）。
6. **C12 防刷**：dispatchHelper/dispatchAward 每位管家一次性——别"简化"掉。
7. **C11 白领修复**：receiveAnniversaryPassAward 的 notVip 门——别"简化"掉。
8. catchNoCode（无推导 catchCode）→ dispatch 回空应答 → 形状排放 `{}`（path 为空串）——见空排放先查异常日志。
9. `SHRINK_OK` 未新增（本批无背包缩减动作；抓取消耗爪子走 bagAdd 负数会删 0 项——正常）。
10. 自定口径（§3.1/ISSUE-13-3）改动需新拍板。
