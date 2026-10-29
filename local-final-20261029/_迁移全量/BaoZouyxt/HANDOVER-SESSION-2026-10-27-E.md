# AGENT 交接：2026-10-27 第五场（E = C12 管家/帮手落地 + ★真机每帧崩修复 + 第 13 批回执交付）

> **给下一个 Agent 的**，不是给用户的。读完这一篇就能接手，不需要读对话记录。
> 项目根：`F:\BaoZouyxt` ｜ 补丁工程：`F:\BaoZouyxt\hotfix-patch` ｜ 上游包：`F:\BaoZouyxt\_incoming\`
> ⚠ 同日 `HANDOVER-SESSION-2026-10-27.md` / `-B/-C/-D.md` **均已被本文取代**（原件都在，没删）。

---

## 0. 三十秒接手（**含"要发什么 / 你要做什么"**）

- 游戏在 **MuMu 模拟器**，adb `127.0.0.1:16416`（**adb 有 root**），包名 `com.maple.madherogo`。当前 **pid 22577**，已进 `gamescene`。
- 线上 **`impl=h1cc3e18f`**，`flow=ffaec47c3`，selfCheck **1357** 全过，`implErr=null`。
- 验收 **52/52 绿**（c11-smoke 上游 14 用例版 + c12-smoke 13 条已收编），形状冻结 **diff 0**（**352 动作**基线），`check_reject_codes` OK（**动作 113 / 条目 129 / 拒绝点 191**）。
- 批次进度：**C01✅ C02✅ C05✅ C03✅ C16✅ C04✅ C06✅ C07✅ C08✅(档A) C09✅ C10✅ C11✅(含上游验收修复) C12✅(10 动作，档A)** → 下一批按 relations.md 顺序是 **第 14 批 C13〔UFO 夹娃娃〕7 键（relations.md:96-97）**；注意 relations.md 的"第 N 批"编号与 C 编号错位（第 14 批=C13），**先抄原文再排**。
- **要发给上游的就一个文件**：`_incoming\下游回执-第13批C12-20261027.zip`
  `681,917 B`｜md5 `E3FB3FFEEEC0D89DA90C7DEA7763EBCB`｜sha256 `5CA248FB412214AD30024788ABB856916A10BA6D0735D50EDD5C76364FAF8825`｜**78 条目**
  ⚠ **这份 = C12 + 第 12 批 VIP 白领修复合并的合一回执**（上游指令"两件事同一份回执交"，增补段 §九）。
  解包自验已过：根/core 的 bz-rpc-server.js md5 `7C7CD7AC…` 同为部署版；解包内 c11-smoke **14/14**、c12-smoke 13/13、c10-smoke 18/18。
- **等上游回话**：第 10/11 批回包均未到；第 12 批已**有条件通过且口径全追认**（白领口已堵）；C12 待验收。
- 存档**本场只有正常玩法变动**：消费 800 元宝（买 3 号管家 500 + 月卡 300）；获得 3 号管家（拥有+跟随）、月卡 30 天（dueTime 毫秒）、派遣进行中（1147 场景，到点可领 helper.reward=[9400,1]）。

---

## 1. 当前部署状态（可核，别凭记忆）

| 项 | 值 |
|---|---|
| `impl` / `flow` | **h1cc3e18f** / ffaec47c3（`.\run.ps1 cmd "ver"` 验） |
| selfCheck | **1357** 全过 |
| 验收 | **52/52**，known-red 0，cap 0 |
| 冻结 | **352 动作**，diff 0 |
| 拒绝码 | 动作 **113** / 条目 **129** / 拒绝点 **191** 处（flow 1） |
| `core\bz-rpc-server.js` | 454,378 B，md5 `7C7CD7AC0B1D292EE0BC4181700801B9`（含 C12 + 上游白领修复合并） |
| `patch\live\handlers.js` | 1,586,592 B，md5 `D5435BD0518E21D84F5BFE8923327E77`（**产物，不许手改**） |
| `core\bz-c12.generated.js` | 1,226 B，md5 `F7DEFBA54C8BDD3DC157AD2B5C7A9C45`（本场新增） |
| `core\bz-c09/c10/c11.generated.js` | 未动（md5 见交接 D §1） |
| 存档 | 见 §0 末 |

---

## 2. 本场干了什么

### A. C12 取证（4 工人小单 4/4 全活 + 主审独立探针，对撞零冲突）
- KEY 原文抄自 relations.md:91-94。线上名三雷：`BUY_BUTLER_VIP→User.buyMonthlyFee`、`CALL_HELPER_BY_ID→User.callHelperId`、`BUTLER_DISPATCH→User.dispatch`（泛化名，与 MessageCenter.dispatch 严格区分）。
- ★**面板开关又不在名单**：`GET_HOUSE_KEEPER`→`User.getHousekeeper`（60393，440 行附录未分批），delegateUI 在它 1 分支 new（23109-23115）——第三次同型（C10 getHomeList / C11 GET_DATA）。
- ★**客户端自带形状夹具**：scripts3.js:23566 `testFunc` = housekeeper 22 字段权威形状，与 templates.json create 双源互证；**时间戳全毫秒**。
- delegateUI 开面板**不自动发 HTTP**（无 C10 homeSpeicalAward 式必崩陷阱）；名单外键做不做取决于按钮可达性。

### B. C12 实现（10 动作，档 A）
- gen_c12_tables → bz-c12.generated.js（helper 8 行 + **locateScenes 白名单**；口径 vipPrice=300/vipDays=30/dispatchMinutes=30）。
- 10 handler（getHousekeeper/buyHelper/setHelper/callHelperId/getHelperCallList/dispatch/dispatchAward/buyMonthlyFee/setTemplateData/receiveNotice）+ 助手 hkRead/hkEnsure/hkDataOf/hkTable/hkOwned。
- 存档：`s.housekeeper`（create 模板已带该段，hkEnsure 只补 undefined、不覆盖合法 null）。
- 拒绝码 10 条（buyMonthlyFee 双码 2/4、dispatch 双码 2/5）。

### C. ★真机每帧崩（本场最值钱，修复闭环）
- dispatch 成功（客户端发 mapId=1008）→ `DelegateMgr.createRoute3` **每帧**抛 `Cannot read property '0' of null`（index.jsc:22681）——管家路线配置只在 helper.locate 的 4 场景（1147/1119/1120/1118）。
- 修复：①locateScenes 白名单校验（不合法回 2/6000371）②**坏存量派遣态允许覆盖重派的自愈通道**（award 有 30 分钟时间闸，否则崩无法解除）。
- 真机复验：1008 正确拒 2 → 1147 自愈覆盖 → **崩停**（日志 5 秒无 err）。

### D. 新踩坑（写进下一单）
1. ★★**dispatch 类动作的 mapId/场景参数必须按表校验**——客户端会把当前场景原样发来，路由表查不到就是每帧崩（不是 try-catch 能兜的 UI 问题）。
2. ★BUTLER_DISPATCH 成功分支裸读 `o.note.eco.yuanbao`（23125）——免费派遣也必须带 note.eco.yuanbao。
3. 构建期双向比对会抓 core/JSON 码漂移（buyMonthlyFee.badType 被抓）；planned 脚本漏 META → 冻结被拒（C10 校验按设计工作）。
4. 旧坑沿用：todo_shapes 登记 / hkTable() 式守卫 / grantRewardList note 三元 / else 兜底 tier 2 / Out-File BOM。

---

## 3. 用户/上游的裁定（本场新增）

### 3.1 用户 2026-10-27 本场拍板
1. 并入 `GET_HOUSE_KEEPER`（面板开关）。
2. 加 `SET_TEMPLATE_DATA` + `RECEIVE_NOTICE`（评价 3 键 + RECEIVE_HELPER_REWARD 沉底）。
3. **档 A**：派遣落档不结算真实任务产出。
4. 买管家 = helper.price 照表按**元宝**扣；月卡 = 300 元宝/30 天（type=1）。

### 3.2 等上游追认（回执 §四）
= §3.1 的 4 项 + 派遣时长 30 分钟 + callData 状态自定语义。

### 3.3 挂账（不变）
- 第 10/11/12 批回包均未到；ISSUE-7/8/10-2/10-3/11 全部在案（docs\OPEN-ISSUES.md）。

---

## 4. 待办（按优先级）

### 4.1 下一批
- relations.md:96-97 **第 14 批 · C13（7 个，可信度中）**：`GET_UFO_CATCHER_DATA、GET_UFO_CATCHER_TASK、USE_UFO_REFRESH、BUY_UFO_REFRESH_TIMES、REWARD_UFO、REWARD_UFO_CATCHER_TASK、BUY_UFO_GAME_COIN`（共享 token:UFO、field:buyRefreshTimes/freeRefreshTimes/refreshTimes）。
- **先抄 relations.md 原文**（"第 N 批"编号与 C 编号错位，别排错）；KEY 定义行先 grep index.js HttpConst；新动作登记 todo_shapes.json；场景/地图类参数先查白名单表（C12 每帧崩教训）。

### 4.2 ISSUE-12（docs\OPEN-ISSUES.md）
- 12-1 评价 3 键 + RECEIVE_HELPER_REWARD 沉底；12-2 档 B 派遣任务系统；12-3 callData/task/type 语义；12-4 自定口径挂账（**mapId 白名单是防崩硬约束，别删**）。

### 4.3 挂账（已知，不用再问）
- ISSUE-7 / ISSUE-8 / ISSUE-10-2 / 10-3 / ISSUE-11 全部在案。

### 4.4 工件
- `batch13-facts-20261027\`：取证与策略 / 执行记录 / 主审独立探针记录 / scoutP1-P3+U / 工单 / probe_c12_flow.js（dispatch:<mapId> 可指定场景）/ tmp_add_reject_c12.js / tmp_planned_c12.js / verify-c12-worker.md。
- `_outbox\第13批C12-20261027\`：回执暂存；`.verify-第13批\` 解包验证残留可删。

---

## 5. 回滚

| 对象 | 位置 |
|---|---|
| C12 前全套（core/test/handlers/build/check_shape_freeze/**todo_shapes**/golden 三件/reject-codes/两 docs） | `_backup\20261027-102337-pre-c12\`（69 文件 3,690,579 B） |
| 形状基线 | `tools\golden\emission.json`（352 动作） |
| planned 留档 | `tools\golden\planned-archive\frozen-*.json`（本轮 10+1 条规则） |
| 上一场交接 | `HANDOVER-SESSION-2026-10-27-D.md`（本场未改动它） |

---

## 6. 文件索引

| 路径 | 内容 |
|---|---|
| `batch13-facts-20261027\C12-c12-取证与策略.md` | 7+5 键契约、housekeeper 权威形状、两张表、策略草案、5 项拍板 |
| `batch13-facts-20261027\C12-c12-执行记录.md` | 10 handler 要点、★真机崩修复闭环、门禁终值、真机全链、回滚 |
| `batch13-facts-20261027\主审-独立探针记录.md` | 主审 §一-§十（与工人对撞零冲突） |
| `docs\OPEN-ISSUES.md` | ISSUE-12 新增 |
| `docs\EXECUTION.md` | 轮 24 新增 |
| `_incoming\下游回执-第13批C12-20261027.zip` | 本批交付物 |

---

## 7. 下次开工第一条命令

```powershell
Set-Location F:\BaoZouyxt\hotfix-patch
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\run.ps1 status                    # 期望 pid 22577 左右
.\run.ps1 cmd "ver"                 # 期望 impl=h1cc3e18f / implErr=null
```

### 流水线顺序（不可换）
```powershell
node tools\gen_c12_tables.js        # 动过口径/表才需要
node tools\gen_shapes.js            # ⚠ 新动作先登记 tools\todo_shapes.json
cd hotfix-patch; node build-handlers.js
cd ..; node tools\check_shape_freeze.js --diff   # 有差异 → tmp_planned_c12.js 式规则 → --freeze
node tools\check_reject_codes.js    # 期望 动作 113 / 条目 129 / 拒绝点 191
node tools\acceptance.js            # 期望 52/52
cd hotfix-patch; node test\c12-smoke.js ; node test\c11-smoke.js ; node test\c10-smoke.js ; node test\r14-catch-smoke.js
cd hotfix-patch; .\run.ps1 handlers ; .\run.ps1 cmd "ver"
```

### 已确认、但可能被后来者改错的事实
1. **`patch\live\handlers.js` 是产物** —— 只改 `core\`，然后 build。
2. **管家 10 键线上名**：getHousekeeper / buyHelper / setHelper / **dispatch**（泛化名）/ dispatchAward / **buyMonthlyFee** / getHelperCallList / **callHelperId** / setTemplateData / receiveNotice —— 别"纠正"。
3. **housekeeper 时间戳全毫秒**；**字段 22 个全量下发**（testFunc+create 双源）；null 是合法值别转 0。
4. ★**dispatch 的 mapId 白名单（locateScenes）是防真机每帧崩的硬约束**——删了必崩。
5. **BUTLER_DISPATCH 成功必带 note.eco.yuanbao**（23125 裸读）；**RECEIVE_NOTICE 非 1 → 客户端 dataDestroy**（尽量不拒）。
6. **RECEIVE_NOTICE 属第 4 批"顺手做"、其余 3 个面板键属附录未分批**——并入本批已申报。
7. `SHRINK_OK` 未新增（本批无背包缩减动作）。
8. 自定口径（§3.1/3.2）改动需新拍板。
