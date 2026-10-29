# C10〔农作物〕第 11 批 · 执行记录（2026-10-27）

> 取证与策略见 `C10-c10-取证与策略.md`；工人死亡与重派见 `收尸记录-第11批-20261027.md`。
> 本文只记"实际做了什么、踩了什么、怎么验的"。

---

## 一、用户拍板（2026-10-27，本场四项）

| 项 | 拍板 | 落地 |
|---|---|---|
| `getHomeList` | **并入本批** | 实现（第50批动作提前做，回执申报）。理由：`PlantHomeUI` 就是它回调里 new 的（index.js:57615），不补则面板打不开、8 个动作全不可达 |
| 档位 | **档 A（本家闭环）** | `stealCrop` 优雅拒 `eRet 2`（3317 文案）；好友家（`enterOtherHome`=`User.getFriendHomeList`）留给第50批 |
| 计时 | **真实计时 + 加速免费** | 按表 `seedtime/seedling/grow/mature/ten/fifty/hundred`；`expediteCrop` 每次 +`home_plant_details[2].num`=86400 秒，**不扣道具 6069**（回执申报） |
| 收获/事件 | **按状态取产物；事件本批不随机刷** | 状态 4→`matureitem`、5→`tenitem`、6→`fiftyitem`、7→`hundreditem`；`m.eid` 恒 0 |

---

## 二、新增/改动清单

### 2.1 新生成器 → 新表
- `tools\gen_c10_tables.js` → `hotfix-patch\core\bz-c10.generated.js`（15,053 B）
  - 53 个作物（键 = 种子 item id，4777…10926）：`n(seednum) / plant(文案id) / exp / st[7]阶段秒数 / out{4,5,6,7}→[item,num] / effect / speed / weed / dis / follow / active`
  - 4 行家事件、`home_plant_details` 27 值、`home_plant_exp` 15 行等级经验
  - 地块数 **4**（客户端 `getHomeLands()` 缺省 4，index.js:58333-58337）、奖励框经验槽 `7`（`n[7]=aExp`，57711）
- **两处都要接**（C09 的坑）：`build-handlers.js` 注入 + `check_shape_freeze.js` 的 `sweep()` 里 `vm.runInThisContext`。
  少接 sweep → BZ_PLANT=undefined → 作物动作形状被抽成空壳。

### 2.2 `core\bz-rpc-server.js`
- helper 段（放在 `var H = {` 之前，遵循本文件既有约定）：`plantTables/plantCrop/plantLandCount/plantSlot/plantRead/plantBoostSec/plantStateAt/plantNowSec/plantRefreshLand/plantHarvestOf/plantSeedHave/plantGive`
- handler 10 个：`getHomeList`、`batchSeedCrop`、`changeSate`、`obtainCrop`、`expediteCrop`、`cleanDeadCrop`、`dispossHomeEvent`、`onKeyObtainCrop`、`onKeyDispossHomeEvent`、`stealCrop`
- **意外新增第 11 个**：`homeSpeicalAward`（见 §四.1，不算在批次成员里，属"同面板崩点修复"）
- `SHRINK_OK` += `batchSeedCrop`（播种扣光背包不许被写前守卫回滚成白拿）
- `REJECT_CODES` += 10 条；`REJECT_ALLOW` += 10 条（拒绝应答收窄到只有 `eRet`，因为成功字段在客户端是裸读）

### 2.3 状态机口径（最容易被后人改错的一处）
- `m.s` 是**服务端权威**阶段（0 空地 / 1..7），每次读/写都按 `now` 重算并写回；`m.t` 永远是**播种时刻**，不许改写。
- `plantStateAt` 的 `disc = 1 - crop.effect` 是**刻意的 10% 提前**，不是漏乘：
  客户端在 `curHomeScene ∈ crop.speed` 时把阶段时长 ×(1-effect)（index.js:95586/95682）。服务端不知道当前场景，
  若按原始时长算就**比客户端慢** → 客户端进度条到 100% 发 `changeSate` 却等不到推进，而 `isRefresh` 已置真、
  本次进面板不会再发（scripts2.js:37712-37718）→ 作物**永久卡在 100%**。

---

## 三、踩到的坑

### 3.1 ★★ 把 `eco` 从 note 里删掉时，脚本 `start=-1` 导致全文件替换（事故，已修复）
- 起因：真机 diff 里 `note.eco` 是"新增无证据字段"，我决定 C10 不发 `eco`（本批不改货币）。
- 事故：定位 C10 注释块起点的 `indexOf` 没命中 → `start=-1` → 循环从 0 开始，把**全文件** 4 处
  `var note = { ivch: {}, eqch: {}, eco: {} };` 都改了，其中 2 处属 `passCardAward` / `BuyFashion` / `knackLottery`（非本批）。
- 后果：`BuyFashion` 里 `note.eco.gold = …` 会**在运行时抛 TypeError**（属性不存在）。
- 定位与修复：用"按函数名切片逐字对撞"的脚本把 11 个非 C10 handler（passCardAward/BuyFashion/knackLottery/
  exchangeItem/buyGoodAndEvilShopItem/buySchoolShop/rgShopByItem/useItem/saleItem/killNpc/acceptTask）与备份
  `_backup\20261027-040000-pre-c10\core\bz-rpc-server.js` 全量比对 → 恢复 3 处、C10 2 处保持不发 → **11/11 逐字一致**（有脚本输出为证）。
- 教训：**批量文本替换必须"先断言命中行号符合预期"再改**（这次 `fixAt()` 带断言就没出事）；
  改完必须做"非本批函数逐字对撞"，不能只看语法过不过。

### 3.2 拒绝路径不许建槽（真机前的自查抓到的）
- `batchSeedCrop` 原来先 `plantSlot(s)` 再校验 → "种子不足"这种拒绝也会把 `s.plant` 结构写进内存档
  （下一次任意 persist 就落盘）→ 与 marryState/knackSlot 同一个坑。
- 改法：先 `plantRead(s)` 拿只读视图校验，**全部通过后才 plantSlot()**。

### 3.3 `m.eid` 要显式给 0
- 播种时 `m = {id, s, t, c, pt, eid:0}`。客户端 `hasOwnProperty("eid") && eid > 0` 才画事件图，
  缺字段虽不崩，但形状/语义上应显式声明"无事件"。

### 3.4 形状审批两轮
- 第一轮：42 项 diff → 11 条 `planned-changes` 规则（`c10-*`）+ `approved-widening` 9 条 + `approved-narrowing` 24 条 → `--freeze`（动作 337 / 证据字段 303）。
- 第二轮（`homeSpeicalAward` + 去掉 `bShop`）：4 项 diff → 2 条规则（`c10b-*`）+ widening/narrowing 追加 → 再 `--freeze`。
- ⚠ **遗留**：C3 证据门对 `soilArr[i].s` 的叶子字段 `s` 报 `no-evidence`（`s` 是单字母，不在
  `field-classes` 字段索引里；把它塞进分类器会让整个 bundle 的行都算它的读取点）。
  处置：用 `approved-widening` 人工审批（带 `scripts2.js:37687` 证据）+ 冻结收录。**后续做字段证据补全时要把 `s` 补进去**。

---

## 四、真机（pid 22577，MuMu `127.0.0.1:16416`）

### 4.1 开面板：成功，但抓到一个必然崩点
- 探针 `probe_c10_open.js`（`.\run.ps1 probe … open`）→ `HomePlantModel.buildHomeTip()` → 客户端自己发 `User.getHomeList`：
  - 日志：`getHomeList → 地块 4 块（已种 0）种植经验 0 recentSeeds=0`
  - 3 秒后复查模型：**`plantHomeUI=yes | soilArr=4`** ⇒ 面板真被打开了（此前 SHAPED 兜底不含 soilArr → 面板永远不开）。
- **崩点**：面板一开，客户端立刻 `reqHomeSpecialEvent()` → `User.homeSpeicalAward` 无 handler → SHAPED 回
  `{eRet:1,eid:0,rewardArray:{}}` → `productHomeEvent(0,…)` 里 `getItem(0,"home_plant_adventure")` = null 裸读 `.describe`
  → **TypeError**（index.js:95694，日志原文 `Cannot read property 'describe' of null`）。
  ⇒ 已补 handler 回 `eRet 2`（回调里只 dispatch REMOVE_SEARCH_HOME_UI，57866）。复测：该 TypeError 消失（只剩一条 REJECT 日志）。

### 4.2 未解决：`Assert 1606`（PlantHomeBgUI 背景加载）
- 开面板必现：`Uncaught Error: Assert 1606 … [3]anonymous@assets/scripts2/index.jsc:48990`（= `PlantHomeBgUI` 里
  `prefabs.load("cultivationUI/homeBG_"+sceneId)` 的**异步回调** `content.addChild(o)`）。
- 试过把 `RoleOtherInfo.homeFarmId` 探针置 1147 / 1008 / 1118：面板都能开、地块都是 4，但 1147 仍是 Assert 1606，
  1008/1118 换成另一条 `TypeError`。`probe_c10_bg.js` 枚举 bundle 内 `homeBG*` 返回 `NONE`（枚举 API 可能没猜对）。
- 判断（**未证实**）：`PlantHomeUI.setData({farmId, type, homeState})` 里 `type = MarryModel.marryHouseMap[farmId]`，
  我们没建家园/没婚姻房屋数据 → `type` 为 undefined → 背景预制体路径取不到 → `instantiate(null)` → `addChild(null)`。
  属**家园/婚姻子系统（第50批方向）**，与 C10 的 8 个动作无耦合（面板与地块渲染不受影响）。

### 4.3 未做：真机播种/收获闭环
- 卡在"**种子来源**"：`home_plant_crop` 的 53 种种子是道具（`tbl_item` Type=2、Effect=37），
  但**客户端获取途径**是家园种子商店 `User.getBackShop`（59854）+ `User.BuyHomeCrop`（59853）——**两个都没实现**，
  也都不在本批。真档背包里没有种子 → 面板 4 块空地，点不出播种。
- 想真机闭环必须先定一件事（**待用户拍板**）：给初始种子 / 补 `getBackShop`+`BuyHomeCrop` / 用 `bzSeedBag` 灌种子（改用户数据，需授权）。

---

## 五、门禁（本场最终态，可核）

| 项 | 值 |
|---|---|
| build ver | **h69467eef**（selfCheck **1299** 全过） |
| acceptance | **50/50**，已知红 0，cap 0 |
| reject-codes | 动作 **94** / 条目 **108** / 拒绝点 **145** 处（flow 1 条） |
| 形状冻结 | **diff 0**，C1–C8、C10–C13 全过（C9b 未实现） |
| c10-smoke | **15/15** |
| 热重载 | pid **22577** 不变，`implErr=null` |
| 生成器幂等 | `bz-c10.generated.js` 重跑 md5 不变（工人复核） |

### 5.1 验收工人（`verify-c10-worker.md`）与主审抽样
- 工人独立复跑 8 条（acceptance / reject-codes / freeze / c10-smoke / c09-smoke / c08-smoke / gen_c10_tables 幂等 / 三文件 md5）：**逐条退出码 0**，
  c10-smoke 15/15、c08 12/12、c09 11/11、生成器重跑 md5 `AE9A603F…` 不变。
- 主审抽样（高风险项 100% 复跑）：`bz-rpc-server.js` 411,972 B / `ADE0BA4E…`｜`bz-c10.generated.js` 15,053 B / `AE9A603F…`｜
  `patch\live\handlers.js` 1,536,230 B / `9B0D0395…`｜`batchSeedCrop: 1`（SHRINK_OK）1 处｜`homeSpeicalAward: { default: 2 }` 1 处｜
  `ver` = h69467eef / implErr=null。**与工人报告逐项一致**。

---

## 六、未验证 / 风险（诚实清单）

1. **真机播种→收获闭环未做**（缺种子来源，见 §4.3）。
2. **`Assert 1606` 未解决**（家园背景，未证实根因，不影响 8 个动作）。
3. `s` 叶子字段无证据库条目（§3.4）。
4. `m.b`（伴生作物）、`home_plant_follow`（伴生系统）、`home_plant_sale`（农产品出售）、
   `home_plant_adventure`（家事件奖励）、`planting_active`（种树活动）本批均未做；`m.eid` 恒 0 故事件类动作恒走"无事件"分支。
5. 阶段折让 10% 是**安全侧偏置**（§2.3）：理论上作物会比表值早 10% 成熟。要精确对齐需把"当前家园场景 id"传进服务端。
6. `obtainCrop` 的 `exp`/`aExp` 语义按"种植累计经验/本次获得"实现（客户端只用于显示 `plantSeedData.plantExp` 与奖励框 `[7]`），
   **没有原始服务器实证**。
7. 四个 `.js` 里 `getFriendHomeList`（= `enterOtherHome`）在形状表被 gen_shapes 纠正为 `soilArr: []`，
   但该动作仍未实现 → 好友家面板仍不可用（第50批）。
