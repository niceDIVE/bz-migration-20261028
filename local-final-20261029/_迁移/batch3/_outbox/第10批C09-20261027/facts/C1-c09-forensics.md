# C9 · 第 10 批 C09〔技巧摸奖〕取证与策略（2026-10-27）

> 侦察：`scoutJ-c09-reqkeys.md`（11 键契约逐行，839 行）＋ `scoutK-c09-tables.md`（配置表，327 行）＋ `scoutM-c09-ui-fields.md`（UI 对回包的字段读点，433 行）。
> 成员按 `relations.md:68-73` 原文抄录，11 个（8 主 + `GET_SKILL_GRASP` 必做 + `EQUIP_RESOLVE`/`SKILL_GRASP` 顺手）。
> 上游口径（第 9 批验收包原文）：**先扣钱再发；奖励 id 对上钱包字段就入账、对不上只显示；同一次抽奖不能重复领**。

---

## 一、成员与线上名（每行都有定义行）

| 键 | 线上名 | 定义 | 注册 | 请求载荷 |
|---|---|---|---|---|
| GET_KNACK_LOTTERY | `User.getKnackLottery` | index.js:60411 | scripts3.js:90004 | `{}` 或 `{lotteryId}`（90047） |
| GET_KNACK_LOTTERY_HISTORY | `User.getKnackLotteryHistory` | index.js:60413 | scripts3.js:90006 | 无参（90035） |
| KNACK_LOTTERY | `User.knackLottery` | index.js:60412 | scripts3.js:90005 | `{lotteryId, lotteryType, skillId}`（90078-90082） |
| BATCH_RESOLVE_KNACK | `User.batchResolveKnack` | index.js:60309 | scripts3.js:81016 | `{knackData}`（81167） |
| CHANGE_SKILL_KNACK | `User.changeSkillKnack` | index.js:60307 | scripts3.js:81017 | `{skillId, knackIds}`（81173） |
| ROGUE_CHANGE_SKNACK | `User.rgChangeSkillKnack` | index.js:60539（**原文拼写 SKNACK，别改**） | scripts3.js:73995 | 同 CHANGE 形（74047） |
| RESOLVE_KNACK | `User.resolveKnack` | index.js:60308 | scripts3.js:81015 | `{knack}`（81162） |
| EQUIP_BATCH_RESOLVE | `User.batchResolveEquip` | index.js:59654 | index.js:64932 | `{itemIDs}`（65417） |
| GET_SKILL_GRASP | `User.getSkillGrasp` | index.js:60304 | scripts3.js:81019 | 第二参 `null`（81184） |
| EQUIP_RESOLVE | `User.resolveEquip` | index.js:59653 | index.js:64924 | `{itemID}`（65412） |
| SKILL_GRASP | `User.skillGrasp` | index.js:60303 | scripts3.js:81018 | `{skillId}`（81179） |

---

## 二、三个子系统（不是一个东西，别混着写）

1. **摸奖（gacha）**：`GET_KNACK_LOTTERY` 拉奖池 → `KNACK_LOTTERY` 抽 → `GET_KNACK_LOTTERY_HISTORY` 记录。
2. **口诀状态（stash/领悟）**：`GET_SKILL_GRASP` / `SKILL_GRASP` / `CHANGE_SKILL_KNACK` / `ROGUE_CHANGE_SKNACK` —— 读写口诀背包与"哪个技能装了哪几个口诀"。
3. **分解/合成（发奖口，缺表）**：`EQUIP_RESOLVE` / `EQUIP_BATCH_RESOLVE` / `RESOLVE_KNACK` / `BATCH_RESOLVE_KNACK`。

---

## 三、扣费与产物（本批最关键，全部有表依据）

**扣费**（`skill_Trick_Lotterymachine.json` 行 1，`type=1` 常驻池）：
- `one_shot=[9191,1]`、`ten_shot=[9191,10]` → 单抽 1 张、十连 10 张；`trick_item=9191` 就是券。
- `free_day=1` → 每天 1 次免费单抽。`coin_item=[]` → **不花金币/元宝**。
- 券 9191：`tbl_item` `Type=2`（普通道具，走背包）、`Price=100`、`Effect=36`。
- **客户端不读表里的价格**，只读回包：`lotteryData.onePrice[1]`（90404/90565）、`tenPrice[1]`（90407/90573）、`trick_item`（90194）→ 这三个必须由我们下发（值取上表）。
- 行 2/3 是限时池（`type=2`），`opentime/closetime` = `1790697600000`→`1792339199000`（≈2026-09-28→10-18，**已过期**）→ 真实可用的只有 `lotteryId=1`。

**产物**（用户 2026-10-27 拍板：两表分工）：
1. `skill_Trick_Drop.json`（230 行 = 46 技能 × 5 组）按 `drop_probability` 抽**组**：
   每技能 5 行权重恒为 `400/200/100/200/100`（合计 1000），`drop_group` = `100001..100230`。
2. `skill_Trick_Lotterymachine.probability`（`"1,640|2,200|3,100|4,40|5,20"`）按权重抽**品质** 1..5（合计 1000）。
3. 落到 `skill_Trick`：同一 `Trick_des_group` 恰好 5 行、`Trick_quality` 1..5、`item_quantity` = `5/25/50/125/250`、`Trick_use_skill` = 该组所属技能。
   → **knackId = 该组里 `Trick_quality` == 抽中品质的那一行的 `ID`**（例：组 100001 = ID 10001..10005）。
4. 客户端拿 `showKnack[i].knackId` 去 `getItem(knackId,"skill_Trick")`（scripts3.js:91461/91476/91489）。

⚠ 两列权重**客户端都 0 读取点**（纯服务端语义）→ 上面的分工是"表结构 + 用户拍板"，不是抓包实证，回执要申报。

---

## 四、回包必带字段（防崩，scoutM 逐行核过）

**`GET_KNACK_LOTTERY`**：`lotteryData` 是整包对象、UI 直接在里面取，缺了当场崩：

| 字段 | 读点 | 守卫 | 用途 |
|---|---|---|---|
| `tenPrice` | 90407 / 90573 | **全裸读** | 十连券数；`refresh()` 在 onLoad 就调 → **缺它 UI 一打开即 TypeError** |
| `onePrice` | 90404 / 90565 | 无字段级守卫（只被 `!isFree` 短路） | 单抽券数，读 `[1]` |
| `trick_item` | 90194→90328/90384/90454 | 裸读 | 券 id（图标 + 数量） |
| `skillArr` | 90401 / 90459 / 90523 / 90528 / 90597 | 下标 + `.length` | 可选技能列表（`reqLottery` 的 skillId 来源） |
| `lotteryArr` | 90366 `.length` + 遍历 | 裸 | 奖池 id 列表（`type>1` 显示限时池按钮） |
| `t` | 90583 `.toString()` | 裸 | **只用于显示**"剩余次数"文案 |
| `eTime` | 90616-90617 `map[tag1]` | map 本身无守卫 | 子池结束时间 |
| `nextSkillArr` | 91026 / 91033 `.length >= 3` | 裸（`TrickRateUI`，`typeId≠3` 时） | 下一个可升技能 |
| `optionalEndTimeMap` | 91002→90173 `hasOwnProperty` | 有守卫 | `type==3` 才用 |
| `isFree` | 90381 `1 == isFree` | 比较得 false | 单抽是否免费 |
| `poolDateId` / `isRewardState` / `order` | 两 UI 不读 / 恒 false | — | 缺了不崩，但按契约照发 |

**`KNACK_LOTTERY`**：`showKnack` **数组**（`TrickRewardUI.setData` → `data.showKnack`（scripts3.js:91297），`start()` 立刻 `.length`（91303））＋ `eRet / t / isFree / isRewardState / skillId`。
元素只读 `.knackId`（91461/91476/91489/91507/91510）。
额度不足走 `eRet 5`（90096 弹文案 1093）；`GET_KNACK_LOTTERY` 额度不足走 `eRet 3`（90069 同一文案）。

**`GET_KNACK_LOTTERY_HISTORY`**：`{eRet:1, history:[…]}`（90039）。

**口诀四键**：`knackBag` + `skillGraspData`（`{skillId: [...]}`）。
⚠ `CHANGE_SKILL_KNACK` 在 81084、`ROGUE_CHANGE_SKNACK` 在 74000 是**无守卫**读 `skillGraspData`（同包 81082/73998 却有守卫）→ 这两个必须给对象。

---

## 五、本批策略（用户 2026-10-27 拍板）

### 5.1 实现（7 个）

| 键 | 做法 |
|---|---|
| `GET_KNACK_LOTTERY` | 按 §四 给全字段；`lotteryArr=[1]`；`skillArr` = `skill_Trick_Drop` 里 46 个 `skillid` 去重；`onePrice=[9191,1]`、`tenPrice=[9191,10]`、`trick_item=9191`；`isFree` 按每日免费额度；`t` = 0（仅显示） |
| `KNACK_LOTTERY` | **先扣后发**：`lotteryType==1` 有免费额度→用免费，否则扣 9191×1；`==2` 扣 9191×10；不足 `eRet 5`。再按 §三 抽 `lotteryType` 次（1 或 10），knackId 写进 `s.skillGrasp.knackBag`，回 `showKnack[]` |
| `GET_KNACK_LOTTERY_HISTORY` | `history: []`（回读结构未取证 → 给空数组，UI 只遍历） |
| `GET_SKILL_GRASP` | `{eRet:1, skillGrasp: {...s.skillGrasp}}` |
| `SKILL_GRASP` | `{eRet:1, knackBag, skillGraspData}`（把该技能已装的口诀回给他） |
| `CHANGE_SKILL_KNACK` | 校验 knackIds 都在包里 → 从 `knackBag` 移除、写 `skillGrasp[skillId]` → 回新的 `knackBag` + `skillGraspData` |
| `ROGUE_CHANGE_SKNACK` | 同上（同一份账本；肉鸽不另立槽，等需要再说） |

### 5.2 锁（4 个）—— 缺产物表

`EQUIP_RESOLVE` / `EQUIP_BATCH_RESOLVE` / `RESOLVE_KNACK` / `BATCH_RESOLVE_KNACK`：

- 444 张 dump 里**没有分解产物表**：`tbl_item.decomposition` 只有档位值 1/2/3（460 件 Type=1 装备有），没有产物清单；`decompose` 列全 0；没有 `*resolve*` / `*compose*` 表。
- 口诀合成（RESOLVE_KNACK/BATCH_RESOLVE_KNACK）同样没有"几换几"的表。
- 上游口径"奖励 id 对不上钱包只显示"挡不住这种情况——**根本没有奖励 id 可给**。
- 处置：`eRet 2`（各回调的非 1 分支都可静默/提示；`RESOLVE_KNACK`/`BATCH_RESOLVE_KNACK` 的 `rewardArray` 有 `hasOwnProperty` 守卫、`EQUIP_*` 的没有 → 但拒绝路径 client 不进 UI，所以不给 rewardArray）。
- 用户 2026-10-27 拍板：**锁住，eRet 优雅拒**（分解两件明确；合成两件按同一条道理由本文件一并锁定，回执申报）。

---

## 六、防重（"同一次抽奖不能重复领"）

- 请求里**没有 nonce**（只有 `{lotteryId, lotteryType, skillId}`）→ 无法用 id 去重。
- 防重的实质是"**先扣后发**"：任何重复请求都会**再扣一次券**，所以重复不代表白拿。
- 另外客户端只有一处发送点（`reqLottery` 90078）且进程内 XHR 同步返回 200 → 没有自动重发路径（同 `CheckBattleResult` 的既有取证结论，R03）。
- 再加一道**保险**：结算与扣券在同一个 `persist()` 里落盘，任何异常走 `dispatch` 的 catch（回 `BZ_CATCH_CODES`，不回成功）。

---

## 七、未验证 / 风险

1. **两列权重的语义**（`drop_probability` 与 `probability` 分工）**客户端 0 读取点**，是按表结构 + 用户拍板定的，不是实证。
2. `item_quantity`（5/25/50/125/250）的含义没定：是"该口诀一次给几个"还是"升到该品质需要几个"——**本批先不当发奖依据**（只发 1 个 knackId）。
3. `history` 元素结构未取证（`TrickPoolRecordUI` 90713 未展开）→ 只回空数组。
4. `eTime` / `optionalEndTimeMap` 的真实结构未取证（只知按池 id 取）→ 回 `{}`；`type==3` 的可选池不动。
5. 摸奖入口在**商城**（`StoreModel.openTrickLotteryShop()` → `reqStoreList({type:9})`，index.js:131068）→ `getStoreList` 若非本工程实现，玩家可能进不到摸奖界面（可达性同 C08，未验）。
6. `RESOLVE_KNACK` 的名字暗示"口诀合成"，但也可能是"分解"——没有表，语义未定，故锁。

---

## 八、执行序

1. 数据生成：把 46 个 `skillid`、230 行 `(drop_group, skillid, weight)`、`skill_Trick` 的 `(group, quality) → knackId` 抽成一张紧凑表，接进 `gen_shop_tables.js`（或新生成器）→ `core\*.generated.js`。
2. 实现 7 个 handler（helper：`knackLotteryRoll()`、`knackBagOf()`、`grantKnack()`）。
3. 4 个锁：`REJECT_CODES` + `tools\facts\reject-codes.json` 各 +4（`default: 2`，带 ev 与理由）。
4. `gen_shapes` → `build-handlers` → `--diff` → 写 planned/narrowing/widening → `--freeze`。
5. `test\c09-smoke.js`（≥12 条：拉池字段齐、券不足 eRet 5、免费一次、十连扣 10、knackBag 真加、重复请求再扣一次券、四个锁动作 eRet 2 且存档不动）。
6. `acceptance` / `check_reject_codes` / 部署 / `ver`。
7. 回执 + 申报"两列权重分工"与"4 个锁定"。
