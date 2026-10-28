# AGENT 交接：2026-10-28（C14 收口 + C15 落地 + 提速方案接入 + A 轮首批 C19 + 迁移上云 —— 接手即开工）

> **给下一个 Agent 的**，不是给用户的。读完这一篇就能接手，不需要读对话记录。
> 项目根：`F:\BaoZouyxt` ｜ 补丁工程：`F:\BaoZouyxt\hotfix-patch` ｜ 上游包：`F:\BaoZouyxt\_incoming\`
> ⚠ 同日 `HANDOVER-SESSION-2026-10-27*.md` 均已被本文取代（原件都在，没删）。

---

## 0. 三十秒接手

- 游戏在 **MuMu 模拟器**，adb `127.0.0.1:16416`（需 `adb root`），包名 `com.maple.madherogo`。
- 线上 **`impl=hcce22f0f`**，`flow=ffaec47c3`，selfCheck **1426**，`implErr=null`。
- 指纹：**371 动作**（形状 diff 0）｜acceptance **57/57**｜lint **38 发放型 / OK 36 / 白名单 2 / 待查 0**｜拒绝码 **136 动作 / 153 条目 / 238 点**。
- 关键文件 md5：`core\bz-rpc-server.js` = `0AF170DEE28739D3F6729CFAACC161C1`；`patch\live\handlers.js` = `052639579761D5E478766E1EEB293A56`。
- 批次进度：**C01–C15 已落地并全部验收通过**（上游对 C13/C14/C15 均已放行）；**A 轮第 1 批 C19〔技能皮肤商店〕已落地 + 真机验证**。
- 当前任务：**继续 A 轮第 2 批 = relations 第22批 C22〔万圣宝藏楼层〕**（4 主键 + 2 必做 + 2 顺手，见 §3）。
- 迁移包已上云（GitHub，public），见 §4。
- **要先做的一件事**：读 §5 的支付疑虑说明（上游曾怀疑本项目"对支付系统图谋不轨"）。
- 备份：`_backup\20261027-181532-pre-c14\`（C14 前）、`_backup\20261027-195207-post-c15\`（C15 后全量快照）、`_backup\20261027-200031-pre-lint\`（lint 接入前）。

---

## 1. 当前部署状态（可核）

| 项 | 值 |
|---|---|
| `impl` / `flow` | `hcce22f0f` / `ffaec47c3`（`.\run.ps1 cmd "ver"` 验）|
| selfCheck | **1426** 全过 |
| 验收 | **57/57**（known-red 0，cap 0）|
| 形状冻结 | **371 动作**，diff 0 |
| 拒绝码 | 动作 **136** / 条目 **153** / 拒绝点 **238**（flow 1）|
| 防白拿 lint | 38 发放型 / OK 36 / 白名单 2（passCardAward、useItem）/ 待查 0，exit 0；WARN 1 条：rewardUFO 用 `p.signCode`（防作弊签名，非档位/身份/胜负）|
| `core\bz-rpc-server.js` | md5 `0AF170DEE28739D3F6729CFAACC161C1` |
| `patch\live\handlers.js` | md5 `052639579761D5E478766E1EEB293A56`（**产物，不许手改**）|
| 设备存档 | `bz_offline_save.json`（C19 后状态：`skinShop={bought:{1:1}}`、`skinData={35:1}`、yuanbao 49161）|

---

## 2. 本场（10-27 G 场之后）新增了什么

### A. C14〔斗狗〕收口（上游第 15 批验收通过）
- 上游结论：**通过**，五项自定口径全追认，4 键挂 ISSUE-14 追认（狗战与好友家第 50 批一起解锁）。
- 上游提的**一行修已落地**：`FeedDog` 的 `s.bag` 守卫挪到 `loadSave()` 下一行（core 顶部），加 c14-smoke ⑩ 回归用例；
  **上游明确"不用单独回执，下批一起带"**。
- 上游新约束（已记 ISSUE-14 §14-4）：**狗战胜利若将来加奖励，必须服务端判定 + 每日上限**。

### B. 第 16 批 C15〔七日回归〕落地（档 A）
- 12 键全活（EvName 同名是本地事件，HttpConst 里都有 `User.` RPC 定义）；面板门 = `GET_RETURN_SEVEN_DAY_DATA`（回 eRet1 → 活动页 1018 切页开 ReturnUI）。
- 做 6 键（七日门/领当日/任务列表/任务领取拒/liveness 拒/礼包展示+刷新空/礼包领取拒）+ 4 键不做（SEVEN_DAYS_AWARDS、新春 3 键，挂 ISSUE-15）。
- 门禁：形状 364 动作 diff 0（65 项 diff/8 规则）；reject 128/145/220（当时）；acceptance 55/55；c15-smoke 10 条。
- 真机：门→领第 1 天（reward {1:50, 8905:20}）→任务 11 liveness 0→礼包 3 档→刷新空→**同日重复领 eRet 2**。
- 备份 `_backup\20261027-195207-post-c15\`。

### C. 上游「提速方案」接入（合并轮次 + 防白拿 lint）
- 包：`_incoming\下游包-提速方案-解包\`（用户已同意）：**剩 61 批合 5 轮（A–E）+ F（370 孤立动作）**，每轮一份回执；
  符合《默认拍板》12 条的口径直接执行；白名单/默认拍板原文在该包 `01-默认拍板.md`。
- **lint 已入库**：`tools\lint_freebie.js` + `tools\freebie_allow.json`；acceptance 已加第 4 个 checker（传 core 绝对路径，lint 默认路径指向仓库根而不是 hotfix-patch/core）；`runItem` 支持 `args`。
- **addItem 核查（A 轮回执项）**：客户端**有** send 点（index.js:65353-65358 `InventoryModel.addItem → sendRequest(ADD_ITEM)`，监听 64912 eRet2→getText(448)）→ 按规则**改 eRet 2 拒绝 + 删除白名单行**；真机 `{eRet:2}` 验证过。

### D. A 轮第 1 批 C19〔技能皮肤商店〕落地（7 键全做）
- 取证：`batch19-facts-20261027\C19-取证与策略.md`（三工人全活 + 主审对撞）。
- 双商店：type=1 卖道具（shop.item=6658 等）、type=2 直售 skillskin id（item∈skillskin 构建期校验）。
- 两个门：`GET_SKILL_SKIN_SHOP`→showShop 开 SkinShopUI；`GET_SKILL_SKIN_ACTIVE_SHOP`→活动页 1027→SkinActiveShopUI。
- 口径（默认拍板 #1/#2/#9/#10/#12）：price 照表按元宝；活动常开 30 天续期；每行限购 1；刷新 20 元宝/次（自定申报）；LoadGame 补 `skillSkinData{skinData,weapToSkinData}` 回放。
- 门禁：形状 371 动作 diff 0（47 项/7 规则，★数字叶子坑见 §6）；reject 136/153/238；acceptance 57/57；c19-smoke 10 条。
- 真机：货架 ds 22 行→买道具 -5 元宝（6658+1，ds.1=1）→刷新 -20→活动商店 13 行→买皮肤 35（免费档 skinData.35=1）→重复购 eRet2。
- 存档变动申报：-25 元宝，得 6658×1 + 皮肤 35。

### E. 迁移上云（用户要求）
- 全量包：`F:\BaoZouyxt\_迁移全量\bz-迁移包.7z.001`（1 卷，879,885,143 B，sha256 `E3882B2F…30A3DE6A`）；
  已上传 GitHub：**public** 仓库 `niceDIVE/bz-migration-20261028`，Release `v1-20261028`，5 个资产（大包 + MANIFEST + SHA256SUMS + RECEIVER-INSTRUCTIONS + UPLOAD-GUIDE），GitHub digest 与本地一致。
- 直链：`https://github.com/niceDIVE/bz-migration-20261028/releases/download/v1-20261028/bz-migration-full.7z.001`
- 打包口径：node_modules **未随包**（解包后 `cd hotfix-patch && npm install`，3 个依赖）；`LoginMgr.token` 已从包内 15 个文件脱敏为 `<REDACTED-TOKEN>`；保留设备名 junk 文件 `audit-*/…/nul` 改名 `nul_unpacked`（否则 .NET 压缩会中止）。
- 另本地有**精简包** `bz-migration-lean.7z.001`（95MB，去掉旧审计材料），需要时可作第二个 Release 资产上传。
- ⚠ 用户曾把 GitHub PAT 贴在对话里——建议用户轮换；本机含 token 的临时脚本已全部删除。

---

## 3. 当前任务：A 轮第 2 批 = relations 第22批 C22〔万圣宝藏楼层〕

定义（relations.md:138-143）：

> ## 第22批 · C22（4 个，可信度中）  共享：field:goldArr、field:passCard、token:ACTIVITY
> GET_TREASURE_AWARD、BUY_ACTIVITY_NUM、CAN_BUYACTIVITY_NUM、ENTER_NEXT_FLOOR
> **同面板必做**：GET_TREASURE_FLOOR（HalloweenModel）、PASS_CARD_DATA（HalloweenModel）
> 同面板顺手做：BUY_INVITATIONCARD（HalloweenModel）、PASS_CARD_REWARD（HalloweenModel）

**注意**：`passCardAward` 已在 C01 实现过（lint 白名单 1/2 就是它，理由：通行证档位 passAward>=4 判已领+活跃度门槛）——本批先核 `PASS_CARD_DATA`/`PASS_CARD_REWARD` 与它的关系，别重复造。

### A 轮全景（按名称对齐 relations 批号；completed=✔）
| relations 批 | 名称 | 状态 |
|---|---|---|
| 19 | 技能皮肤商店（C19） | ✔ 已落地（7 键） |
| **22** | **万圣宝藏楼层（C22）** | **← 当前** |
| 29 | 时装/背包商店 | 待做 |
| 40 | 秘籍礼包 | 待做 |
| 41 | 春节常驻礼包 | 待做 |
| 42 | 道具选奖 | 待做 |
| 44 | 骰子地块买卖 | 待做 |
| 50 | 春节兑换商店 | 待做 |
| 57 | 消费返利 | 待做 |
| 59 | 房屋/塔商店 | 待做 |
| 67 | GFUI 礼包 | 待做 |
| 74 | 肉鸽商店 | 待做 |

B/C/D/E/F 轮定义见 `_incoming\下游包-提速方案-解包\02-合并轮次.md`。**每轮一份回执**（格式见该文件末节）。

### 开工步骤（照 C19 的节奏）
1. 建 `batch22-facts-20261027\`，主审先抠线上名（`index.js` 里 `XXX: "User.xxx"`），再派 2–3 只读工人（线上名/消费端/配置表）。
2. 对撞写 `C22-取证与策略.md`（含档位方案；符合《默认拍板》的直接执行、回执里列条目）。
3. 落地：`gen_c22_tables.js` → `bz-c22.generated.js`；handler + 助手；REJECT_CODES/ALLOW；todo_shapes +N；build-handlers.js 与 check_shape_freeze.js sweep **两处都接**。
4. 门禁：`gen_shapes` → `build` → `check_shape_freeze --diff`（有 diff 写 planned 规则再 `--freeze`）→ `check_reject_codes` → `acceptance` → `lint_freebie`。
5. 写 `c22-smoke.js`；部署 `.\run.ps1 handlers`；探针真机链；核存档；更新 EXECUTION/OPEN-ISSUES；A 轮攒满 12 批统一出回执。

---

## 4. 迁移包与云上（已完成）

| 项 | 值 |
|---|---|
| 仓库 | `https://github.com/niceDIVE/bz-migration-20261028`（**public**）|
| Release | `v1-20261028`（5 资产；大包 digest sha256 与本地一致）|
| 大包直链 | `https://github.com/niceDIVE/bz-migration-20261028/releases/download/v1-20261028/bz-migration-full.7z.001` |
| 运行验证 | 匿名访问 release 页 200；`curl -r 0-1` → 206 |
| 解包自检 | 空目录解包 + `npm install` → acceptance 57/57、lint 38-36-0、diff 0、reject 136-153-238、build ver=hcce22f0f/selfCheck=1426 |
| 本地同包 | `_迁移全量\bz-迁移包.7z.001`（同一 sha256）；`bz-migration-lean.7z.001`（95MB 精简版）|

`MANIFEST.md` / `SHA256SUMS.txt` / `上传操作卡.md` / `接收方指令.md` 都在 `_迁移全量\`。

---

## 5. 上游曾怀疑「对支付系统图谋不轨」——已写逐条技术说明

- 文档：`docs\说明-支付系统疑虑回应-20261028.md`（可直接转上游）。
- 要点：真实充值链 `reqRechargeMoney` **显式拒做**（core:1421-1423 / 3155-3157 引原文）；付费礼包领取 `RECEIVE_RETURN_GIFT_AWARD` 拒（core:7505-7507）；`addItem` 拒（core:4717-4719）；人民币价格一律按默认拍板 #1 折成本地元宝；`bzGrantCur` 等维护动作不在客户端协议里（grep 0 命中）、只能本地命令通道触发且写前备份；lint 与验收每批全绿。
- **接手后如再遇到支付类质疑**：先把上表证据复制过去，别急着改代码。

---

## 6. ★本场新增的坑/教训（务必先读）

1. **顺序**：改动作后必须先 `node tools\gen_shapes.js` 再 `node build-handlers.js`，否则 build 自检会因"实现前形状是 eRet:1 空壳"拦下（`shape:FeedDog:eRet info 2`）。
2. **leafOfPath 数字叶子**：planned 规则的 `field` 要写数字叶子——`shopData.ds.1` 的叶子是 `"1"`、`skillSkinWeap.0` 的叶子是 `"0"`；只写 `ds`/`skillSkinWeap` 会报"无清单规则覆盖"。
3. **PowerShell 5.1 + UTF-8 无 BOM 脚本 = 中文乱码/解析崩**：临时脚本一律 **ASCII**，中文路径用 `$PSScriptRoot` 或先 `Set-Location`（在调用方完成）；here-string、含中文的 jq 表达式都会被洗掉。
4. **gh CLI 传参**：`--jq` 里的内嵌双引号会被 PS 洗掉，用 `ConvertFrom-Json` 解析，别用 jq 的 `select(.name=="...")`。
5. **7z 分卷**：839MB < 2GB → 只会有 `.001`（不是缺卷）；`.NET ZipFile` 遇到保留设备名文件（`nul`/`con`/`com1`）会**中止压缩**，需先改名。
6. **acceptance 需要 lz-string**：`test/l0-envelope.js`、`selfcheck-model-push.js`、`selfcheck-nosave.js` 依赖 `hotfix-patch/node_modules`；包里不带 node_modules，云上要先 `npm install` 才能 57/57。
7. **代理端口会变**：本机 7890/7897 都是 Clash 端口，但会单独挂；用前先 `Get-NetTCPConnection -LocalPort 7890/7897` 检查并实测。
8. **GitHub 空仓库不能建 Release**（`Repository is empty.`）→ 先推一个初始提交；Release 资产上限 2GB，绕开 git 的 100MB 限制。
9. **`gh release create` 的大文件上传期间，资产条目要传完才出现**（API 看不到进度）；轮询时不能把"没看到"当失败，要看 gh 进程是否还活着。
10. **C19 的 `skillskin_shop`**：type=1 的 item 是**道具 id**（6658…），type=2 的 item 才是 **skillskin id**（17/2/23…）；把 type=1 的 item 当 skillskin 发 `rewardSkillSkin` 会让客户端 `getItem(...).name` 崩。

---

## 7. 待办 / 挂账

- **A 轮剩 11 批**（见 §3 表）——当前就在第 2 批。
- ISSUE-14（斗狗 4 键 + 狗战锁）与 ISSUE-15（七日回归 4 键 + 任务口径）继续挂着，别擅自解锁（等好友家批次 / 上游新指令）。
- 精简包要不要作为第二个 Release 资产上传：等用户决定。
- 用户 PAT 已暴露 → 提醒轮换（不要主动再问 token）。
- `audit-v221`（1GB 旧材料）已收进全量包；如需瘦身可后续清理，但**不要**在未确认前删。

---

## 8. 文件索引（接手即用）

| 路径 | 内容 |
|---|---|
| `docs\EXECUTION.md` | 轮次记录（**轮 29 = C19；轮 28 追加 = 提速方案接入；轮 27 = C14**）|
| `docs\OPEN-ISSUES.md` | ISSUE-8/10/11/12/13/14/15 |
| `docs\说明-支付系统疑虑回应-20261028.md` | 支付疑虑逐条回应（可转上游）|
| `batch19-facts-20261027\C19-取证与策略.md` | A1 取证/口径 |
| `batch16-facts-20261027\C15-取证与策略.md` | C15 取证（12 键全活）|
| `batch15-facts-20261027\C14-取证与策略.md` | C14 取证（HttpConst 翻案）|
| `_incoming\下游包-提速方案-解包\` | **默认拍板 12 条 + 轮次分组 + lint 原文**（每批必读）|
| `_incoming\下游包-第15批C14验收-解包\` | 上游最新验收意见（C14 通过 + 一行修 + win 奖励新约束）|
| `_incoming\下游包-第14批C13验收-解包\` | C13 验收（爪子经济闭环新约束）|
| `tools\facts\reject-codes.json` | 拒绝码事实表（脚本维护：`tmp_*_rejects.js` 一次性脚本同目录）|
| `tools\golden\` | 形状冻结基线 + planned 规则 + known-red |
| `_迁移全量\` | 迁移包 + MANIFEST + 接收方指令 + 上传操作卡 |

### 常用命令速查
```powershell
cd F:\BaoZouyxt\hotfix-patch
.\run.ps1 status                 # pid / ready / 最近日志
.\run.ps1 handlers               # 推产物热载（pid 必须不变）
.\run.ps1 cmd "ver"              # impl/flow 指纹
.\run.ps1 probe probe\xxx.js     # 进程内探针（真机链）

cd F:\BaoZouyxt
node tools\gen_cNN_tables.js     # 生成表
node tools\gen_shapes.js         # 重生成形状（必须在 build 前）
node hotfix-patch\build-handlers.js
node tools\check_shape_freeze.js --diff    # 有差异 → 写 planned → --freeze
node tools\check_reject_codes.js
node tools\acceptance.js                   # 57/57
node tools\lint_freebie.js hotfix-patch\core\bz-rpc-server.js
```

---

## 9. 玩家的"存档变动"累计（本日）

- C14 测试灌入狗粮 6285×5（维护动作 bzSeedBag），喂 2 剩 3；
- C15 领取回归第 1 天奖励（金条 50 + 8905×20）；
- C19 买 6658 道具（-5 元宝）+ 刷新（-20 元宝）+ 免费皮肤 35；
- 其余为正常玩法产出（具体见各批 EXECUTION 轮次）。
