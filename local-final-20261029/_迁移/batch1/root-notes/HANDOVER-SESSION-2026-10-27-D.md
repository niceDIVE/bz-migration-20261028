# AGENT 交接：2026-10-27 第四场（D = C11 周年通行证落地 + 真机全链 + 第 12 批回执交付）

> **给下一个 Agent 的**，不是给用户的。读完这一篇就能接手，不需要读对话记录。
> 项目根：`F:\BaoZouyxt` ｜ 补丁工程：`F:\BaoZouyxt\hotfix-patch` ｜ 上游包：`F:\BaoZouyxt\_incoming\`
> ⚠ 同日早场 `HANDOVER-SESSION-2026-10-27.md` / `-B.md` / `-C.md` **均已被本文取代**（原件都在，没删）。
> 命名约定：同一天多场用 `-B/-C/-D` 后缀。

---

## 0. 三十秒接手（**含"要发什么 / 你要做什么"**）

- 游戏在 **MuMu 模拟器**，adb `127.0.0.1:16416`（**adb 有 root**），包名 `com.maple.madherogo`。当前 **pid 22577**，已进 `gamescene`。
- 线上 **`impl=h70337301`**，`flow=ffaec47c3`，selfCheck **1320** 全过，`implErr=null`。
- 验收 **51/51 绿**（c11-smoke 13 条已收编），形状冻结 **diff 0**（**342 动作**基线），`check_reject_codes` OK（**动作 103 / 条目 117 / 拒绝点 170**）。
- 批次进度：**C01✅ C02✅ C05✅ C03✅ C16✅ C04✅ C06✅ C07✅ C08✅(档A) C09✅(7做/4锁) C10✅(12 handler) C11✅(7 键全做)** → 下一批 **C12〔管家/帮手〕（7 个，relations.md:91-94，可信度中）**。
- **要发给上游的就一个文件**：`_incoming\下游回执-第12批C11-20261027.zip`
  `673,055 B`｜md5 `4D203FBE2B5C5F67293198979161548D`｜sha256 `0BE9D1E4C1768A205A43242C49C90141754EAF7D1B5278188B5EC06FC929B3D7`｜**77 条目**
  解包自验已过：根与 `core\` 的 `bz-rpc-server.js` md5 `AB7BE4F9…` 同为部署版；解包目录内 `node test\c11-smoke.js` **13/13**、`c10-smoke.js` **18/18**。
  （暂存目录 `_outbox\第12批C11-20261027\` 保留，改一行就能重打；解包验证残留 `_outbox\.verify-第12批\` 可删。）
- **等上游回话**：第 10 批回包**仍未到**；第 11 批（C10）又叠了 5 项追认；本批（C12 回执 §四）再叠 4 项自定口径申报。
- 存档**本场只有正常玩法变动**（周年通行证真机全链的消费/获得，全部列在执行记录 §五）：消费 360 元宝 + 100 gold；获得 VIP 档、活跃 10、潜能 +110,000、gold +60、9864×500、6658×20、礼包 1 已购 1 次。

---

## 1. 当前部署状态（可核，别凭记忆）

| 项 | 值 |
|---|---|
| `impl` / `flow` | **h70337301** / ffaec47c3（`.\run.ps1 cmd "ver"` 验） |
| selfCheck | **1320** 全过 |
| 验收 | **51/51**，known-red 0，cap 0 |
| 冻结 | **342 动作**，diff 0（C1–C8、C10–C13 全过；C9b 未实现） |
| 拒绝码 | 动作 **103** / 条目 **117** / 拒绝点 **170** 处（flow 1） |
| `core\bz-rpc-server.js` | 433,894 B，md5 `AB7BE4F9056728B45D57D61D4F57F0DC` |
| `patch\live\handlers.js` | 1,564,251 B，md5 `D51DADE441681C28F80CBFB8DE84FB9D`（**产物，不许手改**） |
| `core\bz-c11.generated.js` | 4,058 B，md5 `96341B64EF57465617A3A24EFAA32C56`（本场新增） |
| `core\bz-c10.generated.js` | 16,423 B，md5 `54340732AAB7BF7FD4FB63EE4E7B5E23`（本场未动） |
| `core\bz-c09.generated.js` | 18,899 B，md5 `3298DB7C005579DD08E7F81E53ABBB09`（本场未动） |
| 存档 | 见 §0 末 |

---

## 2. 本场干了什么

### A. C11 取证（4 工人小单 4/4 全活 + 主审独立探针对撞）
- KEY 原文抄自 `relations.md:84-89`；线上名双源核对（`index.js:60587-60595` + `actions.json:787-795`）。
- 三大发现：
  ①★上游"`ANN_PASS_BUY_LIVENESS` 可能已下线"**被推翻**（入口 `scripts3.js:18448`，弹窗点 7438/7763）；
  ②★礼包两键走**通用商店 type 11**（scripts2.js:8550-8572 按下标取 11 元数组；`award` 原串；`[8]`=已购次数；买回包带 **`giftData` 单数**字典）；
  ③★表窗口 2026-09-29→10-17 已过期 → endtime 自定；`endtime` 是**毫秒**。
- 侦察产物：`batch12-facts-20261027\scoutP1/P2/P3/U-*.md` + `scoutV1/V2-*.md`（实现前追加的 2 单）+ `主审-独立探针记录.md`（15 节）。

### B. C11 实现（7 handler，`C11-c11-执行记录.md` 有全量细节）
- 生成器 `tools\gen_c11_tables.js` → `core\bz-c11.generated.js`（award 22 阶 free/vip 已解析、task 7、gift 4+预拼货架、liveSrc/evnet 留档）。
- `bz-rpc-server.js` 四处插入：助手 `annRead/annEnsure/annDataOf/annTable`（**在 `var H = {` 之前**）+ 7 handler + REJECT_CODES 7 + REJECT_ALLOW 7。
- 存档：`s.annPass = {n, vip, rd[], vrd[], dt[], td{}, dv{}, giftBuys{}, endT(ms)}`，字段契约 = 客户端 AnniversaryModel 构造器（scripts3.js:7806-7815）。
- 写路径纪律：校验走 `annRead`（不写档）→ 全过才 `annEnsure`+`persist()`，拒绝路径逐字节不动档。

### C. 本场新踩的坑（★ 最值钱，全在执行记录 §三）
1. ★★★ **新动作必须登记 `tools\todo_shapes.json`**——gen_shapes 的动作集 = facts ∪ listeners ∪ 这张表，漏登记 = 形状/sweep 整个缺席且 **diff 里看不出来**（本批 5 键漏了，diff 只有 59 项不报错）。
2. ★★ handler 里引用生成表**一律过守卫**（本批 `annTable()`），绝不裸引用 `BZ_C11`——r14 冒烟直接 require core，没有生成模块。
3. ★★ 调 `grantRewardList` 的 note 必须**三元 `{ivch:{},eqch:{},eco:{}}`**（:1059 写 `note.eco[k]`；award 里 4003=潜能/1=金条都是货币）。
4. ★ R2a：else 兜底分支的提示**不算专属分支** → 拒绝码 tier 必须 2。
5. ★ PowerShell `Out-File utf8` 带 BOM，按行解析 `--diff` 输出要剥 `\uFEFF`（60 项只认出 59 的元凶）。
6. 旧坑沿用：`patch\live\handlers.js` 是产物｜`PAY_ACTION_RE=/(Pay|pay|Order|Recharge|IAP|Jetton)/` 会拦动作名（本批 7 名核对过不含）｜node 输出别用 `>` 重定向（UTF-16LE）｜UTF-8 文本只走 read/write/edit。

### D. 第 12 批回执已交付（`_incoming\下游回执-第12批C11-20261027.zip`）
- 77 条目：`00-转发说明` + `01-receipt` + `02-manifest`（逐文件 md5；**zip 自身指纹按自指禁令只写在包外**）+ 根 `bz-rpc-server.js` + 完整 `core\`+`test\` + `facts\C1–C12` + `tools\gen_c09/c10/c11_tables.js`。

---

## 3. 用户/上游的裁定（本场新增，优先级高）

### 3.1 用户 2026-10-27 本场拍板
1. **endtime = now + 30 天**（自定，不跟已过期的表窗口；过期自动续期）。
2. **VIP 档 300 元宝**（自定离线价，同侠客令先例）。
3. **买活跃度扣 gold，单价主审定 10 gold/点**（客户端 `getPriceValue()` 公式未取证），上限 565。
4. **7 个全做**（含 BUY_LIVENESS）。

### 3.2 等上游追认的本批 4 项（已写进回执 §四）
= 上面 3.1 的 1/2/3 + 礼包按元宝扣、限购照表 limit。

### 3.3 更早的挂账（不变）
- 第 10 批回包仍未到；C10 的 5 项追认仍在飞（下游回执-第11批C10）。
- 追认回来如果要改：改动点都在 `core\bz-rpc-server.js` 的 C11 段（`getAnniversaryPassData` ~6530 行起）+ `tools\gen_c11_tables.js`（改完重跑流水线 §8）。

---

## 4. 待办（按优先级）

### 4.1 第 13 批 C12〔管家/帮手〕（7 个，relations.md:91-94，可信度中）
`GET_HELPER_CALL_LIST、BUY_BUTLER、SET_BUTLER、BUTLER_DISPATCH、BUY_BUTLER_VIP、CALL_HELPER_BY_ID、DISPATCH_AWARD`
- 同面板另见（做本批时一起测）：`SERVER_NPC_BATTLE_END`/`TOWER_CHOOSE_PANDA_EVENT`（第4批）、`ANN_PASS_GET_DATA`（**第12批✅已实现**——HomeMainUI 也会发它，现在能正常回了）。
- **KEY 清单必须先抄 relations.md 原文**（C07 教训）；定义行先 grep `tools\index.js` 的 HttpConst。
- ⚠ 本批新学：新动作要登记 `todo_shapes.json`（见 §2C-1）。

### 4.2 ISSUE-11 遗留（`docs\OPEN-ISSUES.md`）
- 11-1 活跃度来源不结算（5 行 type/parameter 未取证，窗口已过期）。
- 11-2 任务进度 dv 不累计（7 种 type 计数来源未取证；FINISH_TASK 恒 notReached 2）。
- 11-3 `anniversary_pass_evnet` 沉底（表名 evnet 不是笔误）。
- 11-4 自定口径挂账（§3.2 的 4 项，改动需新拍板）。
- ISSUE-10 的 10-2（家园背景 Assert 1606）与 10-3（`s` 字段证据补全）仍未动。

### 4.3 挂账（已知，不用再问）
- ISSUE-7（成就 id 空间）、ISSUE-8（善恶/婚姻子女/青楼/C08 多人 4 动作，等入口批次）。
- C08 遗留：琅嬛/肉鸽入口可达性未验；`AttckData.equipments` 已切本档（**别改回快照**）。
- 第 37 批 `ANN_PASS_START_ROGUE/CHOOS_ROGUE` 未做（发送点 7912/7915、调用点 8153/8039 已抄在取证 §一）。

### 4.4 工件
- `batch12-facts-20261027\`：取证与策略 / 执行记录 / 主审独立探针记录 / scoutP1-P3+U / scoutV1-V2 / 工单 / `probe_c11_flow.js`（真机探针，8 个子命令）/ `tmp_planned_c11.js`+`tmp_add_reject_c11.js`（可复用的审批/登记脚本）/ `tmp_diff_raw.txt` / verify-c11-worker.md。
- `_outbox\第12批C11-20261027\`：回执包暂存（改一行就能重打）。

---

## 5. 回滚

| 对象 | 位置 |
|---|---|
| C11 前全套（core 全套 / test / handlers 产物 / build-handlers / check_shape_freeze / golden 三件 / reject-codes / 两 docs） | `_backup\20261027-091400-pre-c11\`（66 文件 3,614,853 B，清单在包内 `_备份清单.txt`） |
| 形状基线 | `tools\golden\emission.json`（342 动作；回滚 = 备份 golden + 重跑 gen_shapes/build + --freeze） |
| planned 审批留档 | `tools\golden\planned-archive\frozen-*.json`（本轮 7 条规则） |
| EXECUTION 追加前 | C11 备份包内的 `EXECUTION.md`（`_backup\20261027-091400-pre-c11\EXECUTION.md`） |
| 上一场交接 | `HANDOVER-SESSION-2026-10-27-C.md`（本场未改动它） |

---

## 6. 文件索引

| 路径 | 内容 |
|---|---|
| `batch12-facts-20261027\C11-c11-取证与策略.md` | 7 键契约、5 张表事实、type 11 货架、数据流、策略草案、8 项待拍板 |
| `batch12-facts-20261027\C11-c11-执行记录.md` | 拍板落地、7 handler 要点、5 个坑复盘、门禁终值、真机全链、回滚 |
| `batch12-facts-20261027\主审-独立探针记录.md` | 主审 15 节证据（与工人对撞用） |
| `batch12-facts-20261027\工单-第12批C11-20261027.md` | 派活线路图与监控纪律 |
| `docs\OPEN-ISSUES.md` | ISSUE-11（C11 遗留四件）新增 |
| `docs\EXECUTION.md` | 轮 23 新增 |
| `_incoming\下游回执-第12批C11-20261027.zip` | 本批交付物 |

---

## 7. 下次开工第一条命令

```powershell
Set-Location F:\BaoZouyxt\hotfix-patch
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\run.ps1 status                    # 看 pid（期望 22577 左右；若 MuMu 全没 → 冷启动，见旧交接 §5.8）
.\run.ps1 cmd "ver"                 # 期望 impl=h70337301 / scene=gamescene / implErr=null
```

### 流水线顺序（不可换，本场实测有效）
```powershell
node tools\gen_c11_tables.js        # 动过口径/表才需要
node tools\gen_shapes.js            # 加过新 handler 必须先跑；⚠ 新动作先登记 todo_shapes.json
cd hotfix-patch; node build-handlers.js
cd ..; node tools\check_shape_freeze.js --diff   # 有差异 → tmp_planned_c11.js 式规则 → --freeze
node tools\check_reject_codes.js    # 期望 动作 103 / 条目 117 / 拒绝点 170
node tools\acceptance.js            # 期望 51/51
cd hotfix-patch; node test\c11-smoke.js ; node test\c10-smoke.js ; node test\r14-catch-smoke.js
cd hotfix-patch; .\run.ps1 handlers ; .\run.ps1 cmd "ver"
```

### 已确认、但可能被后来者改错的事实
1. **`patch\live\handlers.js` 是产物** —— 只改 `core\`，然后 build。
2. **周年 7 键线上名**：`getAnniversaryPassData / buyAnniversaryPass / receiveAnniversaryPassAward / getAnniversaryPassGift / buyAnniversaryPassGift / buyAnniversaryPassLiveness / receiveAnniversaryPassTaskReward`（FINISH_TASK **不叫 finishTask**）——别"纠正"。
3. **`endtime` 是毫秒**（别用工程惯用的秒 now）；**`anniversary_pass_evnet` 表名不是笔误**。
4. **giftDatas 行必须是 11 元数组**、`[5]`=award 原串、`[8]`=已购次数；买回包带 **`giftData`（单数）**。
5. **RECEIVE_AWARD 必须回显请求的 id/vip**。
6. **本批不伪造玩法**：活跃度只能买（来源不结算）、任务恒未达标——这是申报过的口径，不是 bug。
7. **`SHRINK_OK` 未新增**（本批动作只加不减背包，白拿红线无涉；买类扣的是钱包不是背包）。
8. 侠客令（`passCardData/buyInvitationCard/passCardAward`，bz-rpc-server.js 2695 起）是通行证族的可复用模板——C12 管家若同构，先看它。
9. **新动作登记 `todo_shapes.json`**；handler 引用生成表必过守卫；grantRewardList 的 note 必须带 eco；else 兜底 tier 2；Out-File 带 BOM。（详见 §2C）
