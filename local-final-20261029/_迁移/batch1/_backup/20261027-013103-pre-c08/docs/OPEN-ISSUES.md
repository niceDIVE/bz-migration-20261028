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
