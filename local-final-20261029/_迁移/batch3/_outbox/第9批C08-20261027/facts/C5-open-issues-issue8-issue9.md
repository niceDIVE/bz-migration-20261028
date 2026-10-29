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

open / **等上游回话**（不阻塞后续批次）。四个默认处置都已落到代码，回话后按裁定改。

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
