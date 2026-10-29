# C10〔农作物〕第 11 批 · 取证与策略（2026-10-27）

> 成员按 `relations.md:77-82` 原文抄录。侦察产物：`scoutP1-crop-core.md` / `scoutP2-crop-event.md` / `scoutP3-crop-onekey.md` / `scoutR-home-data.md` / `scoutS-crop-items.md`，主审独立探针 `tmp_main_*.out.*`（两路结果已对撞一致）。
> 工人死亡与重派经过见 `收尸记录-第11批-20261027.md`。

---

## 一、成员与线上名（每行都有定义行；★ = 上游拼写反直觉，禁止"纠正"）

| 键 | 线上名 | 定义 | 发送点 | 回调 | 请求载荷 |
|---|---|---|---|---|---|
| OBTAINCROP | `User.obtainCrop` | index.js:59847 | 58159 | 57698 | `{sIdx}` |
| STEAL_CROP_EVENT | `User.stealCrop` | 59861 | 58218 | 58007 | `{fid, idx}` |
| CROP_CHANGE_STATE | ★`User.changeSate`（**changeSate，少个 t**） | 59849 | 58126 / 58129 | 57676 | `{sIdx}` 或 `{sIdx, fid}` |
| EXPEDITE_CROP | `User.expediteCrop` | 59852 | 58144 | 57825 | `{sIdx, num}`（客户端恒 `num:1`） |
| CLEAN_DEAD_CROP | `User.cleanDeadCrop` | 59851 | 58139 | 57811 | `{sIdx}` |
| DISPOSS_HOME_EVENT | `User.dispossHomeEvent` | 59860 | 58210-58215 | 57979 | `{idx}` ＋（好友家时）`{fid}` |
| ONE_KEY_OBTAIN_CROP | `User.onKeyObtainCrop` | 60409 | 58174-58178 | 57726 | `{matureArr}` |
| ONE_KEY_DISPOSS_HOME_EVENT | `User.onKeyDispossHomeEvent` | 60410 | 58181 | 57758 | `{}` |
| BATCH_SEED_CROP（顺手做） | `User.batchSeedCrop` | 59848 | 58111 / 58121 | 57654 | `{seedCrops:{地块号:种子id}}` |

**同面板必做（上游没列，但本批不做则整批不可达）**：

| 键 | 线上名 | 定义 | 发送点 | 回调 |
|---|---|---|---|---|
| GETHOME_LIST（**第50批**，`relations.md:287`） | `User.getHomeList` | 59845 | 58102（`reqOpenHomeEvent`）/ 58106（`reqHomeAllData`） | 57585-57635 |

**死键，不必做**：`SEED_CROP`=`User.seedCrop`（59846，回调 57636-57653）——**三个 bundle + main.js 全无发送点**（grep `seedCrop` = 0 命中），播种只走 `BATCH_SEED_CROP`。

---

## 二、九个动作的契约（逐条来自回调原文）

| 键 | 成功分支 | 回包必带（裸读＝缺则崩） | 非 1 分支 |
|---|---|---|---|
| OBTAINCROP | `eRet==1` | `sIdx`（`soilArr[o.sIdx]=…` 裸）、`exp`、`aExp`、`rewardArray`（后三者有 `hasOwnProperty` 守卫） | `eRet==3` → **裸读 `soilArr[o.sIdx].m.s=0`**（地块必须已存在且有 `m`，否则 TypeError）；无 else |
| STEAL_CROP_EVENT | `eRet ∈ {1,3,4}` 同一支 | **`crop` 对象裸读**（`o.crop.hasOwnProperty`）、`idx`、`exp`、`aExp`、`rewardArray` | `2` → 文案 3317＋清地；`5` → 读 `home_plant_details` id=7 的 `num` 拼文案 3176；`-1` → 3320 |
| CROP_CHANGE_STATE | `eRet ∈ {1,3}` | **`crop` 对象裸读**、`sIdx` | `-1` → 3320 |
| EXPEDITE_CROP | `eRet==1` | **`crop` 对象裸读**、`sIdx` | `2`/`3` → 1455；`-1` → 3320；`6` → 3248 |
| CLEAN_DEAD_CROP | `eRet==1` | `sIdx` | 无 else（静默） |
| DISPOSS_HOME_EVENT | **不看 eRet，看有没有 `crop`**：`if(o.hasOwnProperty("crop"))` | `crop`、`idx`、`exp`(>0)、`aExp`、`rewardArray`、`flag` | `2`→3268；`3`→3317；`-1`→3320 |
| ONE_KEY_OBTAIN_CROP | `eRet==1` | **`obtainLands` 裸读 `.length` 且逐项当地块号用**、`exp`、`aExp`(>0)、`rewardArray`；`matureArr` 可选 | `2` → 6000449；其余静默 |
| ONE_KEY_DISPOSS_HOME_EVENT | `eRet==1` | **`cropMap` 裸读**（对象：地块号→crop）、`exp`(>0)、`aExp`(>0)、`rewardArray`、`flag` | 无 else（静默） |
| BATCH_SEED_CROP | `eRet==1` | **`crops` 裸读**（对象：地块号→`{m}`）、`recentSeeds`（裸赋 `recentSs`） | 无 else（静默） |

要点：**`crop` / `crops` / `cropMap` / `obtainLands` / `recentSeeds` 五处裸读**，是这批判崩点的全部所在（比 C09 的 `tenPrice` 更硬：缺了直接 TypeError，不是显示问题）。

---

## 三、配置表事实（444 张 dump，`tmp_q_scan.js` 跑出）

| 表 | 行数 | 关键结构 |
|---|---|---|
| `home_plant_crop` | 53 | **主表，键 = 种子 item id**（4777…4830）。列 27：`seed, seednum, plant, exp, seedtime, seedling, grow, mature, ten, fifty, hundred, matureitem/maturenum, tenitem/tennum, fiftyitem/fiftynum, hundreditem/hundrednum, weed, disinsection, effect, follow, active, start, end, speed` |
| `home_plant_show` | 53 | 按 seed 取立绘：`zhongzi/youmiao/chengzhang/chengshu/shangpin/zhenpin/juepin/chiwan`(状态 1..7 各一张) + 虫害 `chonghaizz/ym/sz/cs` + `period[7]`（各阶段文案 id） |
| `home_plant_cropevent` | 4 | `{id, type, time, probability, addtime, master, friend, icon, event, develop}`；行 1..4，`addtime=300`；**id=4 才有 `develop[3]`**（虫害三阶段秒数，PlantSystemMgr:95602 用） |
| `home_plant_details` | 27 | `{id, num}`：id=2 → 每次加速补多少秒（95693 附近的 `getItem(2,…).num`）；id=7 → 偷菜文案里的数字（58043） |
| `home_plant_exp` | 15 | `{id, exp}`：种植等级经验表 |
| `home_plant_follow` | 4 | 伴生系统：`period, follow, num, time, ratio, num1..5, weight1..5` |
| `home_plant_sale` | 87 | 农产品出售价：`ID, id, chance, chance1, price[2], price1[2], exp[2], roll, weight` |
| `home_plant_adventure` | 5 | 家事件奖励：`reward`、`fatebonus`、`local[4]` |
| `planting_active` | 3 | 种树活动：`treename, progress2..4, reward` |
| `plantmodel` | 90 | `{id, modelid}` 模型映射 |

**id 核对（scoutS）**：53 个 `seed` 全部命中 `tbl_item`（Type=2 消耗品、Effect=37）；`matureitem` 53/53 命中；`weed`/`disinsection`/`active` 53/53 命中；`tenitem`/`fiftyitem`/`hundreditem`/`follow` 只有 31 个非零（其余 22 处 id=0＝空）；`plant`(32901…) 只有 4 个在 `tbl_item` —— 它其实是**文案 id**（`getText(t.plant)`），不是道具。

---

## 四、作物实例对象 `m` 的契约（LandUI + PlantSystemMgr 反推，这是本批的「AttckData」）

`soilArr[i] = { s, m?, b?, pox? }`：

| 字段 | 谁读 | 语义（从代码反推） |
|---|---|---|
| `s` | LandUI:37687-37690 | 地块状态：`1` = 已开垦（`landCan` 显示、可点种植），否则显示荒地图层 |
| `m.id` | LandUI:37729/37754、PlantSystemMgr:95573 | **作物 id = home_plant_crop 的键 = 种子 item id**（4777…） |
| `m.s` | LandUI:37704（`cropState`） | 生长阶段 **0..7**：0 空地/未种，1 seedtime、2 seedling、3 grow、4 mature、5 ten、6 fifty、7 hundred |
| `m.t` | LandUI:37794 | 本阶段开始时刻（秒） |
| `m.pt` | LandUI:37796 | 时间偏移补偿（秒） |
| `m.c` | PlantSystemMgr:95592 | 已加速次数；累计加速秒数 = `m.c × home_plant_details[2].num` |
| `m.eid` | PlantSystemMgr:95587/95601、LandUI:37768 | 家事件 id（0 无事件；**4 = 虫害**，其余 1..3 见事件表 `icon`） |
| `m.et` | PlantSystemMgr:95602 | 虫害开始时刻（秒） |
| `m.at` | LandUI:37725-37728 | 客户端定时刷新间隔（秒）→ 到点自动发 `CROP_CHANGE_STATE` |
| `m.b` | LandUI:37686/37709/37775 | 伴生作物标记（有 `b` 才显示伴生 spine，位置由本地 `pox` 随机） |

**时长口径**（PlantSystemMgr:95572-95589）：阶段所需秒数 = 表列 `[0:0, 1:seedtime, 2:seedling, 3:grow, 4:mature, 5:ten, 6:fifty, 7:hundred][state]`；若 `curHomeScene`（当前家园场景 id 1147/1118/1119/1120）出现在该作物 `speed` 数组里 → `× (1 - effect)`；若 `m.eid>0` → `+ home_plant_cropevent[eid].addtime`。
**已过时长**（95590-95598）= `now - bgTime + m.c×(details[2].num)`，其中 `bgTime = m.t + 之前各阶段累计时长 + m.pt`。
→ **结论：进度条与阶段倒计时全在客户端算**，服务端只要把 `m.id / m.s / m.t / m.pt / m.c / m.eid / m.et / m.at` 摆对，界面自己动。

---

## 五、数据流（本批最大的坑，和 C09 的「同面板必做」同型）

1. `soilArr` / `recentSeeds` / `exp` / `dog` / `bShop` **全部来自 `GETHOME_LIST` 回包**（index.js:57585-57635）。
2. **`PlantHomeUI` 这个面板本身就是 `GETHOME_LIST` 回调里 new 出来的**（57615 `prefabs.load("cultivationUI/PlantHomeUI")`）→ **`getHomeList` 不回 `soilArr`，面板根本不打开，本批 8 个动作全部不可达**。
3. 打开链：GradenNpc 交互（54714 `reaction`）→ 58346 `buildHomeTip` → 58100 `reqOpenHomeEvent` → `getHomeList`。
4. 好友家走 `ENTER_OTHER_HOME`=`User.getFriendHomeList`（59859，**名字反直觉**）＋`OTHER_PLAYER_HOME`=`User.findOHomes`＋`FIND_OTHER_HOME`=`User.findOhter`（**上游拼写 Ohter**）—— 三者都属第29/50批。

---

## 六、线上现状（已核）

- 9 个键在 `core\` **一个 handler 都没有**（grep 大写键名 0 命中）。
- 形状基线里 5 个走 SHAPED 兜底、4 个是 UNKNOWN（黑洞）：
  `batchSeedCrop {eRet:1,crops:{},recentSeeds:0}`｜`cleanDeadCrop {eRet:1,sIdx:0}`｜`dispossHomeEvent {eRet:1,crop:{b:{},m:{}},exp:0,flag:0,idx:0,rewardArray:{}}`｜`expediteCrop {eRet:1,crop:{b:{},m:{}},sIdx:0}`｜`obtainCrop {eRet:1,exp:0,rewardArray:{},sIdx:0}`；`stealCrop / changeSate / onKeyObtainCrop / onKeyDispossHomeEvent` **无形状**。
- `getHomeList` 也是 SHAPED：`{eRet:1,dog:0,exp:0,recentSeeds:0,soilArr:{}}` —— **`soilArr` 给的是对象 `{}`，而客户端按数组用**（`e.soilArr=i.soilArr` 后 `.length`）→ 现在点开家园面板走的是"空/坏"路径。
- `core\` 里**没有任何作物存档字段**（grep `s.crop` / `plantLand` / `homePlant` 0 命中）→ 存档结构要新建。
- 拒绝码表 `tools\facts\reject-codes.json` 里这 9 个动作 **0 条**。

---

## 七、策略草案（待拍板后执行）

**公共底层**（无论哪档都要）：
1. 存档：`s.plant = {lands:[{s, m:{...}}...], exp:0, recentSeeds:[], day:{...}}`（形状对齐 §四）。
2. 生成器 `tools\gen_c10_tables.js` → `core\bz-c10.generated.js`：53 行作物表（seed → 各阶段秒数/产物/价格/文案）+ 4 行事件表 + details/exp/show 的关键列。**必须同时接进 `build-handlers.js` 与 `check_shape_freeze.js` 的 sweep**（C09 的教训：少接一处 sweep 时表是 undefined）。
3. 状态机 `plantStateAt(m, now)`：按 §四 公式算当前 `s`（1..7），到点自动跃迁；`getHomeList` / `changeSate` / `obtainCrop` 三处都调它。
4. `getHomeList`：回 `{eRet:1, soilArr:[…], exp, recentSeeds, dog:0, bShop:0}`；`soilArr` 必须是**数组**（形状变化需 planned-changes 审批）。

**8 个动作**：

| 键 | 做法 |
|---|---|
| `batchSeedCrop` | 校验 `seedCrops` 里种子都在背包且地块空 → 扣种子 → 每块写 `m={id, s:1, t:now, c:0, pt:0, eid:0}` → 回 `crops{地块:{m}}` + `recentSeeds` |
| `changeSate` | 重算该地块状态 → 回 `{eRet:1, sIdx, crop:{m, b}}`；好友家（带 `fid`）先锁 `eRet 2` 或按档 B 做 |
| `obtainCrop` | 状态 4..7 可收 → 按状态给 `matureitem/tenitem/fiftyitem/hundreditem × num` → 清地（`m` 删除、`s:1`）→ 回 `{sIdx, exp, aExp, rewardArray}`；未成熟/无作物 → `eRet 3`（**注意 `eRet 3` 分支裸读 `soilArr[sIdx].m.s`，地块与 `m` 必须存在**） |
| `expediteCrop` | `m.c += num`（每次 +`details[2].num` 秒）→ 重算状态 → 回 `{sIdx, crop}`；费用口径待拍板 |
| `cleanDeadCrop` | 清掉枯死/异常作物 → 回 `{eRet:1, sIdx}`（地块清零地） |
| `dispossHomeEvent` | 清 `m.eid`（驱虫/除草）→ 回 `{crop, idx, flag:0, exp:0}`（`crop` 必带） |
| `onKeyObtainCrop` | 遍历所有可收地块 → 逐块收 → 回 `{obtainLands:[地块号…], exp, aExp, rewardArray}`（**`obtainLands` 必带**） |
| `onKeyDispossHomeEvent` | 遍历所有带事件的地块 → 清事件 → 回 `{cropMap:{地块:crop}, exp:0, flag:0}`（**`cropMap` 必带**） |
| `stealCrop` | 好友家偷菜（带 `fid`）→ 档 A 锁 `eRet 2`（文案 3317 = "不是好友/不能偷"），档 B 实现真实偷取与冷却 |

---

## 八、待拍板（主审建议写在选项后）

1. **`getHomeList` 是否并入本批**：不并入 → 面板打不开、8 个动作不可达（只能靠探针直调接口验），且玩家侧零效果。**建议并入**（做法同 C09 的 `GET_SKILL_GRASP`，回执申报"第50批动作提前做"）。
2. **档位**：档 A（本家 7 个 + 一键两件 + `stealCrop` 优雅拒）｜档 B（再加 `enterOtherHome`/好友家偷菜，工作量约 +50%，且第29/50批还有 3 个键要一起补）。**建议档 A**。
3. **成长计时**：真实计时（按表，最短 seedtime 28800 秒 = 8 小时）｜**测试档**（全表时长 ÷N 或统一 60 秒，便于真机验证）｜混合（表值照旧，但加"加速"免费且不限次）。注释说明：真机点通需要短时间内看到 1..7 全阶段。
4. **收获产物口径**：状态 4 收 `matureitem`、5/6/7 收 `tenitem/fiftyitem/hundreditem`（表就这么写的）——是否照做？还是简化成"任何状态都收 matureitem"。
5. **事件/偷菜/除草是否本批生效**：`home_plant_cropevent` 有概率字段（`probability` 50/100、`time` 1800/7200），要不要真随机刷虫害/杂草。

---

## 九、未验证 / 风险

1. `m.s` 在 `OBTAINCROP eRet==3` 分支被置 0（57715）——**语义未定**（"未成熟"为何清 `m.s`？可能是"被偷空/枯死"），实现时不得照抄此分支。
2. 作物"枯死/枯萎"（`CLEAN_DEAD_CROP` 的对象）在客户端**没有明确状态位**，只能靠 `m.s` 特殊值或额外字段，未取证。
3. `home_plant_follow`（伴生）与 `home_plant_sale`（出售）属种植副系统，本批不做，但 `m.b` 字段若下发会被 UI 画出来。
4. 家园场景 id（1147/1118/1119/1120）与 `speed` 的对应关系未核对（影响 `effect` 折扣）。
5. 面板可达性：GradenNpc 在哪个场景、需不需要前置任务/等级，未取证（与 C08 的"入口可达性未验"同级）。
