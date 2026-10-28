# 待修问题清单（2026-10-22 起）

> 用户裁定："先记住这个问题"，暂不修。本文件只记录事实、证据与拟定修法，**不代表已修**。
> 每条都带可复核的文件:行号与日志时间戳。

---

## ISSUE-7 成就 3/4（灵儿）与 3/5（武学特效）的 id 空间未证实，存在跨表碰撞误判可能（2026-10-26，v2.7.1）

**现象**：v2.7.1 成就进度重算（core `recomputeAchievements`）的持有判定是 背包(s.bag) ∪ 已学武学(s.skills) ∪ 口诀(s.skillGrasp) 三表并集。3/4 与 3/5 两族的 require id（如 3/4 "0|1"、"0|6,7"、"0|8"；3/5 "0|1"、"0|7"…）不在 item/skill/fashion 三张已知表里（gen 时统计 3/5 有 30/39 行 id 落空），真实存档上它们进了 pending（341/1318/1558/118/124/125/126）。
**风险**：若这些 id 属于第四张表（伙伴/特效皮肤），与 s.skills 的键发生数值碰撞，就会**误判达成**。
**为何当前无实害**：3/1、3/3、3/4、3/5 四族在真实存档进入 pending 的 13 条**全部 rw=0**（achieve_list.reward="0"，逐条核对 2026-10-26），没有任何奖励面；带实物奖励的 pending（1/5 读书识字 ×13、6/2,0 环任务 ×1）全部由计数器/技能等级直判，无碰撞空间。
**拟定修法**：拿到 3/4/3/5 对应的配置表后，在 achHeldCount 里按 type 分流到正确的存档键，禁止跨表并集误撞。在那之前保持现状（无奖励面）。
**状态**：open（不阻塞；奖励面为零）。

---

## ISSUE-8 「整套玩法被锁」清单（2026-10-27 立项，上游第 8 批验收指定登记）

**用途**：登记"整套玩法锁死"的入口缺位项。**规则**（上游 2026-10-27 口述）：哪一批碰到某玩法的**入口动作**，就把这一整套一起解锁；所有批次跑完后，再**统一过一遍**本清单收尾。

| # | 玩法 | 批次 | 锁死动作（线上名） | 锁因（证据） | 解锁前置（入口） |
|---|---|---|---|---|---|
| 8-1 | 善恶 | C07（第 8 批） | 11 个：`getGoodAndEvilData`、`getGoodAndEvilTaskData`、`refreshGoodAndEvilTaskData`、`getGoodAndEvilNoteData`、`getGoodAndEvilNpcData`、`refreshGoodAndEvilNpcData`、`getGoodAndEvilRankData`、`getGeHelpInfo`、`getGoodAndEvilRetireList`、`getGoodAndEvilRetireData`、`helpDoneTask` | 未加入阵营原服本就拒绝；`GoodEvilInfoUI` 对 `goodAndEvilData` **16 字段 `.toString()` 直读**（index.js:35795-35861），缺键即 TypeError；`helpDoneTask` 会发 prestige/contribution/addScore 但**无存档槽**，白给=伪造进度 | **`JOIN_GOOD_OR_EVIL`**（index.js:60433，未实现） |
| 8-5 | 多人战斗（PVE 多人 + 肉鸽 PVP） | C08（第 9 批） | `ChallengeRoguePVP`（REQ_ROGUE_PVP_BATTLE）、`beginMultiPVEBattle`（MPPVE_ACTION）、`beginRogueMultiPVEBattle`（ROGUE_MPPVE_ACTION）、`startMultiPVEBattle`（START_MPPVE_BATTLE） | 前一个要真人对手、后三个要服务端多人回放引擎（应答是整场战斗数据，`playWithData` 照着演）；它们的 `eRet≠1` 分支**是空的**（index.js:104102/110871/110877/105259）→ 没做=玩家走到会卡界面。上游 2026-10-27 裁定：**维持现状，做到入口批次时在入口拒掉** | `INIT_MPPVE_BATTLE`（index.js:59785）/ 肉鸽 PVP 入口 —— **优先看入口回调有没有优雅拒绝分支，有就拒在入口**，玩家就进不到这 4 个动作 |
| 8-2 | 婚姻子女·洗练/寄养/性别 | C04（第 6 批） | `childWashProperty`、`resetChildFoster`、`addChildFoster`、`chooseSex` | 属性模型 / 寄养模型**形状无证据**（造形状=假数据=子 UI 崩点）；现处置为 eRet 2 静默（handlers.js:5837-5851、5775） | 子女属性/寄养模型的抓包或消费端字段证据（注册点 index.js:24613-24800 有，字段需求未取到） |
| 8-3 | 婚姻子女·妻子养成 | C04 | `upgradeWifeLevel`、`UserWifeProp` | 妻子等级/经验**无存档槽**；请求走 `sendReqWithMask {lv,exp,pot}` / `{propnum}`（index.js:145326-145394）；现处置 eRet 2（handlers.js:5858-5865） | 妻子经验槽 + `wifeUpdateData` 形状证据 |
| 8-4 | 青楼 | C04 | `ChooseGirl`、`Whoring`、`optionLikeEvent` | 价格/消耗**无源**（propose/make/bridalline 三表均无 award/price 类列，scoutB 逐列核对）；无 like_event 模型；现处置 eRet 2（handlers.js:5879-5901） | 价格表或上游口径（原版是付费/消耗功能） |

### 8-1 解锁时必做（上游 2026-10-27 逐条指定，照抄）

1. 加入阵营写 **`s.geSide`**（新存档槽）；
2. `goodAndEvilData` 的 **16 个键给真实初值**（数字类 `0`、字符串类 `""`），保证 `.toString()` 不崩；
3. `helpDoneTask` 的 `prestige/contribution/addScore` 新建 **`s.geScore`** 存档槽，**按表发**；表里没有数额就按「原版免费的给小额、每日限次」处理，**不白给钱和道具**。

### 状态

open（不阻塞）。四族当前**只有拒绝路径、零奖励面**——即"解锁前不会白拿"，符合升级报告的拦截条件。

---

## ISSUE-9 C08〔PVE 战斗族〕等上游回话的 4 问（2026-10-27，已写进第 9 批回执 §九）

> 回执正本：`batch9-facts-20261027\回执-第9批C08.txt` §九。本批**已按"默认"交付**，上游回话后再改。

| # | 问题 | 选项 | 默认（不回话就走这个） |
|---|---|---|---|
| Q1 | 4 个"保留未实现"的动作怎么处置：`USER_PVP` 之外的 `REQ_ROGUE_PVP_BATTLE`（要真人对手）+ `MPPVE_ACTION`/`ROGUE_MPPVE_ACTION`/`START_MPPVE_BATTLE`（要多人回放引擎）。现状回**形状默认 eRet 1**，玩家走到会卡界面 | ① 维持现状，等入口批次一起做　② 改 eRet 2 拒绝（**仍然卡界面**，只是日志能看出是我们拒的） | **① 维持现状** |
| Q2 | `AttckData` 的战斗数值按哪套装备算。现状 `equips/equipments/gemData` 用抓包快照（原账号那套），所以战斗里穿的不是身上的装备 | ① 维持快照　② 上游给 `parseEq` 实例格式口径 / 真实样本 → 接 `s.equipments`+`s.playerEquip` | **① 维持快照** |
| Q3 | 要不要做"服务端持血"（`attArr` 逐招回填）。现状 attArr 一律回空 = 血由客户端本地模拟、不防作弊 | ① 不排　② 单独立"服务端战斗模拟"专项 | **① 不排** |
| Q4 | 范围外矛盾：`handlers.js:6698-6700` 的 `drop:dedup` 自检断言 vs `test\drop-table.js:64`「两次赢发两次」互斥 | ① 以 drop-table 为准（改那条自检）　② 以 dedup 为准（恢复 5 秒去重） | **① 但本批不动，只记账** |

**两条告知（不用回话）**：
1. `USER_PVP` 的拒绝码 3 对应客户端文案 1399，**原文离线读不到**（无 lang 表 dump）；能确认的只是"3 在客户端有专属分支 Alert+dispose"。
2. 琅嬛 / 肉鸽的**入口前置条件未查**（`LangHMode.startBattle` 唯一调用点 index.js:138298），"本档能不能真走到"未验；验的是协议层（真机 6 发探针全通 + 存档零写入）。

### 状态

**已裁定（上游 2026-10-27 回话，第 9 批验收包 `_incoming\batch9-accept-20261027\`）** —— 四项全部按"默认"走：

| # | 裁定 | 落地动作 |
|---|---|---|
| Q1 | **选①维持现状** + 补一条：做到入口批次（`INIT_MPPVE_BATTLE` / 肉鸽 PVP 入口）时，**优先看入口回调有没有优雅拒绝的分支，有就在入口拒掉**，玩家根本进不到这 4 个动作 | 不动代码；本条已并入 ISSUE-8 的解锁前置，入口批次照着做 |
| Q2 | **选①维持抓包快照** + 可选：限时 2 小时按客户端 `parseEq` 读点反推实例格式（**不要等抓包**），推出就把 `s.equipments`/`s.playerEquip` 转进 AttckData；推不出继续用快照且**不用再问** | 排一个"parseEq 反推"限时任务，见 EXECUTION 轮 20 |
| Q3 | **不排**（服务端不管血量） | 不动 |
| Q4 | **以 drop-table 为准：打赢两次就掉落两次**，把 `drop:dedup` 那条自检改掉，本批顺手做 | ✅ 已做（见下） |

**Q4 落地记录（附带查出一个真问题）**：原来那条断言不只是口径错，还是**空断言（永远为真）**——
`loadSave()` 两次返回同一个对象引用，`after1.playerEquip === after2.playerEquip` 恒成立，改成"发两次"的语义它也永远不会红。
现在改为在每场打完当下立即取计数，断言 `n1===1 && n2===2`（`core\bz-handler-impl.js` 的 `drop:noDedup`），
实测 store 里 `1301` 计数 1→2。**教训：自检里比较两次快照必须先取值拷贝**。

**另两条（上游：知悉）**：G1（PVP 文案 1399 原文离线不可读）、G2（琅嬛/肉鸽入口可达性不专门验，玩家实测走到再说）。

---

## ISSUE-1 点「活动」弹窗后，整屏输入被吃掉（假死）—— ✅ 已闭合（2026-10-22 06:04，impl=h0f20e751）

**现象**（2026-10-22 05:16:59 起）：点击主场景「活动」后，画面还在动（连拍两帧 md5 不同、右上倒计时在走），
但点底部「任务」等任何 HUD 无反应；按 BACK 键能弹出「确定要离开游戏吗？」并点得动 → 输入没坏，
是**场景上面盖了一层吃触摸的 modal**。

**根因链**（全部有源码行号）：
1. 点「活动」→ `User.getAllActivity` → 我方回**形状表默认值**（没有 `activityList` 等真实数据）
2. `onGetAllActivity`（index.js:57446-57459）收尾**无条件**再发一个请求：
   `RoleOtherInfo.activeObj[0] ? reqSevenDayActive() : reqEveryDayActive()`
3. 于是发出 `User.getSevenTaskList`（index.js:59622 `REQ_SEVENTASK_EVENT`），我方**没实现** → 通用 ACK `{eRet:1}`
4. `sevenTaskCallback`（index.js:57387-57405）第一句就是 `if (e.hasOwnProperty("taskObj"))`；
   我们的 ACK **没有 `taskObj`** → 两个分支都不进 → `HomeActiveUI` 既不打开也不关闭
5. 那层 modal 留在 popUpLayer 最上面 → 整屏吃触摸 = 假死

**现场日志**（`bz_log.jsonl`）：
```
1792617418233  dispatch User.getAllActivity      → SHAPED（回默认形状）
1792617418273  dispatch User.getSevenTaskList    → UNKNOWN
1792617419446  [flow] 公告→destroy（组件无可调用关闭方法）   ← 同一时段的另一个隐患，见 ISSUE-3
```

**当时怎么解决的**：备份存档（`_backup\2026-10-22-0519-pre-restart\`，md5 `DEC9D1C6…`）→
用户批准 → `.\run.ps1 restart`（force-stop + 启动，4 秒 ready，18 秒进 gamescene，新 pid 8576）。
重启后任务面板能正常打开，已确认恢复。

**已修（最小闭合，2026-10-22）**：新增三个 handler —— getAllActivity 回 {activityList:[],activityShows:[],schoolActivityOpen:0,...}、getSevenTaskList 回 **{eRet:1, taskObj:{}}**（关键：以前没有 	askObj，客户端 sevenTaskCallback 两个分支都不进）、getActivityCounts 回 {dataArr:{},SevenDaysArr:[]}。
端上验证：日志 dispatch getAllActivity → getSevenTaskList → getActivityCounts 全跑完、**0 条 err/异常**。面板能开能关，但**内容是空的**（活动清单在 ctive 表 88 行 + ctive_order 表，还没接）。

**后续（未做）**：
- (a) `getSevenTaskList` 回最小可用数据（`{eRet:1, taskObj:{}}`），让回调走"空"分支闭合；
- (b) `getEverydayActive` 回 `{eRet:1, dataArr:[], SevenDaysArr:[]}`，保证 `HomeActiveUI.setData(e)` 有东西可渲染；
- (c) 更彻底：把 `getAllActivity` 的 `activityList` 用真实活动表填上（要先把活动配置表导出来）。

**风险**：修不好会从"卡死"变成"打开一个空面板"，可接受；但 (b) 里 `HomeActiveUI.setData(e)` 的字段需求还没查清。

---

## ISSUE-2 穿装备从来没被记账（动作名是错的）—— ✅ 已修（2026-10-22 05:33，impl=ha60c18b1）

**事实**：
```
index.js:59592  PUT_ON_EQUIPMENT:     "User.equipWeapon"        ← 客户端穿装备真正发的动作
index.js:59593  UNLOADING_EQUIP_EVENT:"User.UnloadingEuipment"  ← 卸装备（这个名字我们是对的）
```
我方实现的是 `PutOnEquipment`（`core/bz-rpc-server.js`），**客户端永远不会发这个动作名**。

**后果**：玩家 05:16:58 装上 `itemID=2302`（槽 5），日志是 `UNKNOWN User.equipWeapon` → 没记账 →
重启后 `playerEquip={}`、`equipments={}` → **那把武器被"脱掉"了**（存档本身没坏，只是这件装备的穿戴状态丢了）。

**拟定修法（未做）**：把 `PutOnEquipment` 的逻辑抽成内部函数，`equipWeapon` 与 `PutOnEquipment` 都指向它；
自检加一条 `equip:clientAction`（断言 `equipWeapon` 能记账）。
**建议玩家先别反复穿脱**，修好之前穿了也不会记住。

---

## ISSUE-3 flow 关不掉的弹窗是裸 `destroy()`

`live/flow.js` 的 `stepNotice` 在组件没有 `onBack/onClose/...` 时直接 `node.destroy()`，
没走 `PopUpMgr.removePopUp(node)` → 节点没了、管理器里那层还在（正是 ISSUE-1 的残留形态）。
重启前那次日志是 `公告→destroy`，重启后这次是 `公告→onBack()`（走了正常路径）。
**拟定修法（未做）**：兜底顺序改成 `PopUpMgr.removePopUp(node)` → 再退化为 `destroy()`。

---

## 附：这次暴露的口径问题（写进交接时要用）

- 交接文档 §4.8「装备穿脱契约」里的动作名 `PutOnEquipment` 是**手工调 handler 验证**出来的，
  不是客户端真实流量 → 以后凡是"契约"，必须拿**客户端源码里的常量定义**核对，不能只靠进程内手打。
- 形状表里"有形状"不等于"能撑起 UI"：`getAllActivity` 有形状条目、回默认值不报错，
  但 UI 需要真实数据才闭合 —— **UNKNOWN 与 SHAPED 都可能让弹窗卡住**，两者都要看消费端。

---

## ISSUE-10 农作物（C10）遗留三件 —— 2026-10-27（第 11 批）

**已落地**：10 个 handler（8 主 + `batchSeedCrop` + 并入的 `getHomeList`）、`stealCrop` 档 A 锁、
形状/拒绝码/验收全绿、c10-smoke 15/15、真机面板**能打开**（`soilArr=4`）。详见
`batch11-facts-20261027\C10-c10-执行记录.md`。

### 10-1 玩家拿不到种子 —— ✅ 已解决（2026-10-27，补家园种子商店）
- 53 种种子是道具（`tbl_item` Type=2 / Effect=37），但客户端获取途径是**家园种子商店**：
  `User.getBackShop`（index.js:59854）拉货架、`User.BuyHomeCrop`（59853）买 —— **两个都没实现**，也都不在 C10 成员里。
- 现状：真档背包没有种子 → 面板 4 块空地，点不出播种（服务端逻辑本身已验：c10-smoke ③④⑤⑧ 全绿）。
- **处置（用户 2026-10-27 拍板）**：补 `getBackShop`（货架 = 35 行种子三元组 `[itemId, tag, 单价]`）
＋ `BuyHomeCrop`（**线上名大写 B**，请求 `{itemID,itemNum}`），**平价**（买价 = `item.Price`：100/1000，表里没有购买价列）＋**不限购**。
`getHomeList` 的 `bShop` 回 1（商店按钮前置 `homeShop > 0`，scripts2.js:48589）。
真机已闭环：买 2 颗扣 200 银两 → 播种 → 催熟 ×6 → 收获 `item=4808 ×1`、种植经验 80000。原三个候选方案留档：
  1. 给新手种子（`getHomeList` 或一次性补发，属自定口径，须申报）；
  2. 补 `getBackShop` + `BuyHomeCrop`（要先把 `home_shop`/种子价目导出来，工作量约半批）；
  3. 用维护动作 `bzSeedBag` 灌种子（**改用户存档**，须走"先备份→问→再做"）。
- ⚠ 历史记录：补商店之前真机是"4 块空地 + 种不了"，那是缺动作、不是 bug。

### 10-2 家园背景 `Assert 1606`（未解决，不影响 8 个动作）
- 开面板必现：`Uncaught Error: Assert 1606` @ `scripts2.js:48990`（`PlantHomeBgUI` 异步加载
  `cultivationUI/homeBG_<sceneId>` 后 `content.addChild(...)`）。
- 探针证据：把 `RoleOtherInfo.homeFarmId` 置 1147/1008/1118，面板都能开、`soilArr` 都是 4；1147 仍 Assert、
  1008/1118 换另一条 `TypeError`；`homeBG*` 预制体在 bundle 里枚举不到（枚举 API 可能没猜对）。
- 判断（**未证实**）：`PlantHomeUI.setData({farmId, type:MarryModel.marryHouseMap[farmId], …})` 里 `type` 为
  undefined → 背景预制体路径取不到。属**家园/婚姻子系统（第50批方向）**。
- 若要修：先把 `homeID`（LoadGame → `RoleOtherInfo.homeFarmId`，index.js:107240）与
  `marryHouseMap` 的合法取值查清，再决定发什么。

### 10-3 `soilArr[i].s` 缺证据库条目（C3 门在冻结前会红一次）
- 字段 `s` 是单字母，不在 `tools\facts\field-classes.json` 的字段索引里（该索引来自 shapes.json 字段名），
  塞进去会让整个 bundle 的行都被算成它的读取点 → 本次走 **人工 widening 审批 + 冻结收录**（证据行 `scripts2.js:37687`）。
- 后续做"字段证据补全"时必须把 `s` 补进分类器，否则这条永远只能靠人工审批兜。

### 10-4 顺带修的崩点（也算申报项）
- `homeSpeicalAward`（第29批动作）原本走 SHAPED 兜底回 `{eRet:1,eid:0,rewardArray:{}}`，
  而 `getHomeList` 开完面板立刻 `reqHomeSpecialEvent()` → 客户端 `productHomeEvent(0,…)` 裸读 null 表 `.describe`
  → **真机 TypeError**（index.js:95694）。已改成回 `eRet 2`（回调只 dispatch REMOVE_SEARCH_HOME_UI）。
  **这是面板一开必崩的一条，不是可选优化。**

## ISSUE-11 周年通行证（C11）遗留四件 —— 2026-10-27（第 12 批）

**已落地**：7 个 handler 全做（含被上游标"可能已下线"的 `buyAnniversaryPassLiveness`——入口实存，
`scripts3.js:18448`）、形状/拒绝码/验收全绿、c11-smoke 13 条、真机全链通（面板开 / 升档 / 买活跃 /
领奖双轨 / 买礼包）。详见 `batch12-facts-20261027\C11-c11-取证与策略.md` 与执行记录。

### 11-1 活跃度来源不结算（拍板④：本批不做）
- `anniversary_pass_liveness` 5 行是"打怪/副本/…给活跃度"的来源表（type/parameter/liveness/limit），
  但其活动窗口 2026-09-29→10-17 **已过期**。当前活跃度**只能买**（`buyAnniversaryPassLiveness`，10 gold/点）。
- 要做来源结算须先定：窗口口径（照表已过期 → 自定）、5 种 type 的计数埋点（type 1/2/4 的 parameter 语义未取证）。

### 11-2 任务进度 `dv` 不累计（拍板④：只读存档不伪造玩法）
- `anniversary_pass_task` 7 行 type 分布 [1,8,3,9,4,5,9]，`type==6` 客户端按 4 格算（scripts3.js:7940）。
  dv 恒空 → `receiveAnniversaryPassTaskReward` 正常流程恒 notReached 2（结构正确、玩法暂不产生，同 C10 cleanDeadCrop）。
- 要放开须先取证 7 种 type 各自的计数来源（很可能与 `anniversary_pass_evnet` 的 type 数组语义同源）。

### 11-3 `anniversary_pass_evnet`（5 行）沉底
- 列 `id/type(数组)/require("32,10")/dialog`，语义未取证；award 表的 `evnet` 列全空。
- 表名拼作 `evnet`（**不是笔误**，别纠正）。

### 11-4 自定口径挂账（改动需新拍板，同交接 §8.11 风格）
- `endtime = 开启时 now + 30 天`（表窗口已过期，照表发倒计时恒空白）；
- VIP 档 300 元宝（表里没有价格列）；
- 买活跃度 10 gold/点、上限 565；
- 礼包价 60/300/680/980 按元宝扣、限购照表 limit。
- ⚠ `getAnniversaryPassData` 每次过期会自动续期 30 天（onOpen 续期语义），若要"活动真结束"须改这条。

## ISSUE-12 管家/帮手（C12）遗留 —— 2026-10-27（第 13 批）

**已落地**：10 个 handler（7 名单 + getHousekeeper 面板开关 / setTemplateData / receiveNotice 并入，均属
relations.md 440 行附录未分批键）、档 A（派遣落档不结算任务产出）、形状/拒绝码/验收全绿、
c12-smoke 13 条、真机全链通（含 ★修复 createRoute3 每帧崩：mapId 必须 ∈ helper.locate 场景白名单）。
详见 `batch13-facts-20261027\C12-c12-执行记录.md`。

### 12-1 评价与管家奖励沉底（拍板②）
- `GET_EVALUATE_DATA`/`PUSH_EVALUATE_DATA`（评价弹窗，delegateButlerUI 按钮）与
  `RECEIVE_HELPER_REWARD`（`User.receiveHelperReward`，60403，`{helperId}`）未做；
  二级面板按钮点了走静默兜底（真机未点验）。

### 12-2 档 B：真实派遣任务系统
- 任务生成 / `tgd`（{地图id:{"任务串":[...]}}）/ `taskNum` / `matureArr` / `createAutoDispatchTime`
  内部逻辑 / `DELEGATE_AUTO_CLEAN_UI`、`FORCE_DISPATCH` 事件链——全部未取证。
- `taskArr` 元素 `[[5,1]]` 的语义（[任务id, 数量?]）未定。

### 12-3 语义未取证
- `callData` 状态原版语义（现自定：跟随=3、可呼叫=1；客户端文案 6002407/08/09）。
- `helper.task`（1003001 等任务表 id）与管家奖励链的关系。
- 月卡 `{type}` 其它取值（现只认 1，其它回 2）。

### 12-4 自定口径挂账（改动需新拍板）
- 买管家价 = helper.price 照表**元宝**（表无币种列）；月卡 300 元宝/30 天（type=1）；
  派遣时长 30 分钟；DISPATCH_AWARD 奖励 = helper.reward 照表（1/2 号为空）。
- ★`dispatch` 的 mapId 白名单（helper.locate → 1118/1119/1120/1147）是**防真机每帧崩**的硬约束，别删。

## ISSUE-13 UFO 夹娃娃（C13）遗留 —— 2026-10-27（第 14 批）

**已落地**：4 活键（getUFOCatcherData 面板开关 / rewardUFO 抓取 / useUFORefresh 刷新 / buyUFORefreshTimes 买次数）、
档 A（服务端权威判中）、形状/拒绝码/验收全绿、c13-smoke 9 条、真机全链通（面板+池子上机+抓取+刷新+购买）。
详见 `batch14-facts-20261027\C13-c13-执行记录.md`。

### 13-1 死键 3 个跳过（拍板①）
- `GET_UFO_CATCHER_TASK` / `REWARD_UFO_CATCHER_TASK` / `BUY_UFO_GAME_COIN` 全 bundle 零调用点。
- 若未来版本激活：需先取证 coinDailyList/coinDailyId 任务链与游戏币经济。

### 13-2 档 B：防作弊与任务链
- signCode 真 md5 校验（md5(2*signId+37)，core 需带纯 JS md5）；客户端 packages 与池子一致性校验。
- coinDailyList / coinDailyId 任务链结构未取证。

### 13-3 概率与经济口径（自定，改动需新拍板）
- 抓中概率 = 池子数量加权均匀随机（原版概率曲线未对证）。
- 抓中难度 k → 8143 × package_difficulty[k].reward（30/30/60/150/300）。
- 买刷新 100 元宝/次、累计限 3（无每日重置）；首开赠送三档爪子各 3 + 免费刷新 1。
- 活动常开（active 37 窗口 2026-05-27→06-03 已过期；eRet 3 通道保留）。

### 13-4 待取证
- 爪子的商店/活动获取途径（现仅首开赠送）；NPC 97 入口可达性；dollUI 视觉；`packages`/`catchIndexIds` 格式（档 B）。

## ISSUE-14 斗狗（C14）遗留 —— 2026-10-27（第 15 批）

**已落地（档 A）**：3 件本家可达 —— `FeedDog`（真扣狗粮 6285、进度 const129=100/份封顶 const128=10000、喂满升大狗 11194、note.ivch 绝对值回写）、`lookDogLog`（log:[] 空日志，本家无事件源）、`DogBattleResult`（桥接 win/endTime，狗状态回健康）；建横 `getHomeList.dog` 从 0 改为 {id,s,t,p,n}。形状/拒绝码/验收全绿（356 动作 diff 0 / 120/137/209 / 54/54）、c14-smoke 10 条、真机链通（灌狗粮→getHomeList→喂→日志→结算）。详见 `batch15-facts-20261027\C14-取证与策略.md` + `C14-c14-执行记录.md`。

### 14-1 不做 4 键（档 A 挂账，等好友家批次）
- `enterDogPVEBattle`（ENTER_PVEDOG_FIGHT）与 `enterRogueMulitiNpcBattle`（ENTER_PVE_ROGUE_FIGHT）：多人回放引擎家族（响应由 SPMpBtMgr/RogueMpFightMgr 通用键消费，服务端要生成整场战斗数据；ENTER_PVEDOG_FIGHT 无同键监听者）。C08 ISSUE-8 同口径 → 保留 UNKNOWN 兜底，待好友家（enterOtherHome，第 50 批）落地后与入口批次一并处置。
- `ReqDogPartnerBattleInfo` + `CheckDogPartnerPVEBattleResult`：`startDogPartnerFight` 全客户端 0 调用方（仅定义 index.js:13139），客户端**死键**。若未来版本接上 1v1 狗伙伴战 UI → 按 C08 enterPVEBattle 三件套镜像实现（DogFightSingMgr 请求/结算 payload 已在取证文档 §一 记录）。

### 14-2 玩法口径（自定，改动需新拍板）
- 喂狗 = 纯消耗（狗粮 6285 每份 +100 进度，无奖励产出 → 天然防刷合规，上游计时循环新规不适用）。
- 狗初始 id=11193、健康态 s=0/t=0（getDogCurState 真）；狗战路径锁死（stealCrop 档 A 锁 + 好友家未实现）。
- 狗粮来源：等级/任务奖励表（level.json/tasknew.json 等），无商店；本批测试用维护动作 bzSeedBag 灌 5 个（已申报）。

### 14-3 待取证
- 狗在 UI 的渲染/喂食面板视觉（getHomeList.dog 已证，客户端渲染未截图）；
- 狗战 mp 版（DogMPBattleUI）与 1v1 版（DogFightPanel）的完整战斗数据契约（属 ISSUE-8 家族）；
- 喂满升大狗后是否有其它玩法分支（DOG_FEED_STATE_EVENT id:11193 state:4 的语义未取证）。
