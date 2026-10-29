# C7 · 第 9 批 C08〔PVE 战斗族〕取证与策略（2026-10-27）

> 侦察：`batch9-facts-20261027\scoutG-c08-reqkeys.md`（九键契约逐行，930 行，工人自检 4/4×9）＋ 主审亲验（AttckData 形状探针、`serverHp` 语义、`eRet≠1` 逐回调行为、冻结基线存在性）。
> 成员按 `relations.md:63-64` **原文**抄录，9 个，未增未删未"纠正"拼写。
> 本文件只写取证与策略；写入决策一律标「待拍板」。

---

## 一、成员与线上名（每格都有行号）

| 键 | 线上名 | HttpConst 定义 | 注册点 | 请求点 | 抓包实载荷 |
|---|---|---|---|---|---|
| PVE_ACTION | `User.beginPVEBattle` | index.js:59784 | index.js:98852 | index.js:98943 | `{action,paramID,paramID1,paramID2=battleID}` |
| ROGUE_PVE_ACTION | `User.beginRoguePVEBattle` | index.js:60578 | index.js:104192 | index.js:104460 | `{action,paramID,paramID1,paramID2=battleID}` |
| REQ_LANGHUAN_COMBAT | `User.enterPVEBattle` | index.js:59783 | index.js:98832 | index.js:67548 / 67554 | `{lv?,npcID,mp,gTime,hgtimes}` |
| REQ_ROGUE_PVE_COMBAT | `User.enterRoguePVEBattle` | index.js:60577 | index.js:104129 | index.js:104252 | `{npcID,hp,hplimit,mp}` |
| MPPVE_ACTION | `User.beginMultiPVEBattle` | index.js:59787 | index.js:110876 | index.js:110939 | `{action,battleID,attackID,paramID}` |
| ROGUE_MPPVE_ACTION | `User.beginRogueMultiPVEBattle` | index.js:60506 | index.js:105258 | index.js:105561 | `{action,battleID,paramID}` |
| REQ_ROGUE_PVP_BATTLE | `User.ChallengeRoguePVP` | index.js:60502 | index.js:104101 | index.js:104252 | `{npcID,hp,hplimit,mp}` |
| START_MPPVE_BATTLE | `User.startMultiPVEBattle` | index.js:59786 | index.js:110870 | index.js:110935 | **无参数**（单参调用） |
| USER_PVP | `User.ChallengePVP` | index.js:59505 | index.js:101326 | index.js:101355 | `{otherRoleID,mp,gTime,hgtimes,flag?}` |

键→线上名另有一份机器可读的对照：`tools\actions.json:17`（USER_PVP）、`:287`（PVE_ACTION）、`:289`（START_MPPVE_BATTLE）、`:290`（MPPVE_ACTION）、`:710`（ROGUE_MPPVE_ACTION）、`:779`（ROGUE_PVE_ACTION）。
`scripts2.js` / `scripts3.js` 对这 9 个键 **0 命中**（scoutG 逐字计数），全部证据在 `index.js`。

---

## 二、三类战斗架构（这条决定"能不能做"，先看）

1. **服务端权威 1v1**（`PveSvr1v1Mgr` index.js:98827、`RogueBattleMgr` index.js:104094）
   - `enter*`（开局）：服务端给 `AttckData`（我方战斗快照）+ `npcArr`（敌方 26 项）+ `randSeed`，客户端据此建两侧实体并 `initBattleSystem`。
   - `*_ACTION`（出招）：客户端只发**动作意图** `{action,paramID,paramID1,paramID2}`（index.js:98943 / 104460），服务端在应答里**回显这次动作 + 权威血量** `attArr`，客户端再照着播动画（index.js:98878-98901 / 104208-104238）。
   - ⇒ 这套是**真·服务端裁决**：动作要回声、血量要服务端给。
2. **PVP**（`RankMgr` index.js:101319、`RogueBattleMgr` 复用）：`USER_PVP` 载荷要 `otherRoleID`（index.js:101348-101355）——**必须有另一个真人对手**。
3. **多人 PVE 回放**（`SPMpBtMgr` index.js:110842、`RogueMpFightMgr` index.js:105256）：应答不是"血量"，而是**整场回放数据**，客户端 `playWithData(o)` 照着演（index.js:110876-110878、105258-105260 → 110905-110925、105567-105588）。

---

## 三、可做性逐键判定

| 键 | 需要什么 | 离线可做性 |
|---|---|---|
| REQ_LANGHUAN_COMBAT | AttckData + npcArr（npcID 客户端会给，index.js:67550） | **可做**（证据见 §四） |
| PVE_ACTION | 动作回声 + attArr | **可做**（回声，见 §五） |
| REQ_ROGUE_PVE_COMBAT | 同上 + 肉鸽楼层/精英 buff | **可做**（`AttckData.floorBuff`/`eliteBuffs` 在基线里有槽，见 §六） |
| ROGUE_PVE_ACTION | 同上 | **可做** |
| USER_PVP | 另一个真人在线 | **不可做**（无对手） |
| REQ_ROGUE_PVP_BATTLE | 另一个真人在线（npcID 可伪造，但开局要对手 AttckData/EnemyData） | **勉强**（镜像自己≠真 PVP） |
| START_MPPVE_BATTLE / MPPVE_ACTION / ROGUE_MPPVE_ACTION | 服务端回放引擎 + 多人同步 | **不可做** |

**⚠ 与 C07 最关键的差别：`eRet≠1` 几乎全都不是优雅退出。**

| 键 | `eRet≠1` 时客户端行为 | 行号 |
|---|---|---|
| REQ_LANGHUAN_COMBAT | 无 else，战斗界面不初始化 | index.js:98833 |
| PVE_ACTION | 无 else，这一招永远播不出来（战斗无法推进=软锁） | index.js:98853 |
| REQ_ROGUE_PVE_COMBAT / ROGUE_PVE_ACTION | 无 else，同上 | index.js:104130 / 104193 |
| REQ_ROGUE_PVP_BATTLE | 无 else | index.js:104102 |
| START_MPPVE_BATTLE / MPPVE_ACTION / ROGUE_MPPVE_ACTION | 无 else | index.js:110871 / 110877 / 105259 |
| USER_PVP | `3` → 弹文案 1399 并 dispose；**其它 → 直接 dispose** | index.js:101338-101341 |

⇒ **C07 的"全锁 eRet 2"打法在本批不成立**：8/9 会卡在战斗界面。只有 `USER_PVP` 有优雅退出。

---

## 四、AttckData 证据链（本批最关键，主审亲验）

`createPlayerBattleEntity`（index.js:74766-74914）与 `parsePlayerData`（index.js:74919-74972）就是要的契约：

- `parsePlayerData` 把 `AttckData.baseValueAy[0..50]` 逐项摊成 `userAccount/userName/.../hpRemaining/hpLimit/mpRemaining/.../career`，末句 `delete e.baseValueAy`（index.js:74921-74971）。
- `createPlayerBattleEntity` 随后**无守护**读：`equipments`（74785 for-in）、`equips`（74788）、`skillMap`（74798 for-in）、`WeapToSkill`（74807-74810、74840-74841）、`gemData`（74784）、`equipTitle`（74886）、`totalGameTime`（74806）、`userName`（74903 `decodeURI`）。
  ⇒ `WeapToSkill` 缺失会**直接 TypeError**（`t.WeapToSkill[...]` 读 undefined 的属性）。

**好消息：抓包原件里就有完整 AttckData。** 探针实测 `hotfix-patch\core\templates.json → reqSelfBattleInfo['User.ReqSelfBattleInfo']` 的键正好是这套契约：

```
eRet, baseValueAy, skillMap, WeapToSkill, equipments, equips, npcArr, npcID, roleID,
addAtt, youngTimes, veinObj, equipTitle, inherit, itemSkill, buffs, weapToSkinData,
fashionEffect, wId, gemData, partnerSkillMap, happinessNum, roleRound, sceneType
```

即：**AttckData = 该模板内层去掉 `npcArr/npcID/eRet`，再把 `baseValueAy`/`roleID` 换成我方存档值**。现有 `ReqSelfBattleInfo` 处理函数（handlers.js:2701-2723）已经在做同一件事（`inner.baseValueAy = s.baseValueAy`、npcArr 取 `BZ_NPCARR`），可以直接抽成 helper 复用。

敌方一侧：`BZ_NPCARR[npcID]`（3201 只可战斗 npc 的 26 项数组，handlers.js:2717；来源 `tools/cfg/npc_stats.json`）已就绪。

---

## 五、`attArr` / `serverHp` 语义（决定"动作回声"能不能这么写）

- `attArr` 布局（读点反推）：`[0]=A.hp [1]=A.hpLimit [3]=B.hp [4]=B.hpLimit [8]=A.battleID [9]=B.battleID [10]=变身npcID [11]=变身态`（index.js:98856-98868、104184-104187、104232-104234）。
- **空数组是安全的**：所有读取都在 `if (o.attArr && o.attArr.length > 0)` 里；空则两侧 `serverHp=0 / serverHpLimt=1`（index.js:98855-98875、104195-104205）。
- `serverHp` 的语义是**"服务端保命血"**，不是显示血：实体本地血打完时，只有 `serverHp > 0` 才会被它拉回来（index.js:11668-11673）；另有 `entityA.serverHp > 0 && hp > 0` 参与胜负判定（index.js:104532-104533）。
  ⇒ `attArr: []` = 服务端不保命、不覆盖本地血量，**战斗由客户端本地模拟自然打完**，不会崩、不会卡（动作仍照 `action` 回声播）。
- `*_ACTION` 应答的形状字段（`action/paramID/paramID1/paramID2/attArr`）与请求载荷**一一对应**，抓包基线里 `action` 的值就是 `"{}"`、`paramID*` 是 `0`——形状本身就是"回声"的形状。

**判定**：动作回声（`eRet:1` + 原样回 `action/paramID/paramID1/paramID2` + `attArr:[]`）是**有证据支持的薄实现**：不伪造血量、不伪造奖励、不伪造战绩，只是把客户端的意图确认下去。代价是**没有服务端防作弊/服务端保命**（离线单人无意义）。

---

## 六、形状基线：6 个在 337 基线里，3 个不在

探针实测 `tools\golden\emission.json → actions`（337 条）：

| 动作 | 基线现有形状 |
|---|---|
| enterPVEBattle | `{eRet:1, AttckData:"{}", attArr:"[]", gold:99999, npcArr:"[]", npcID:310003, randSeed:0}` |
| beginPVEBattle | `{eRet:1, action:"{}", attArr:"[]", paramID:0, paramID1:0, paramID2:0}` |
| enterRoguePVEBattle | `{eRet:1, AttckData.eliteBuffs:"{}", AttckData.floorBuff:"{}", attArr:"[]", exchangeNpcArr:"[]", npcArr:"[]", npcID:310003, randSeed:0}` |
| beginRoguePVEBattle | `{eRet:1, action:"{}", attArr:"[]", paramID:0, paramID1:0, paramID2:0}` |
| ChallengePVP | `{eRet:1, AttckData:"{}", EnemyData:"{}"}` |
| ChallengeRoguePVP | `{eRet:1, AttckData.floorBuff:"{}", EnemyData:"{}"}` |
| beginMultiPVEBattle / beginRogueMultiPVEBattle / startMultiPVEBattle | **不在基线** → 要做得走 planned-changes + widening 审批 |

注意：基线里 `AttckData:"{}"` 是**扁平化后的空壳**（gen_shapes 把嵌套对象提成 `AttckData.<field>` 或压成 `"{}"`——坑表 2）。真要塞完整 AttckData，`AttckData.baseValueAy` 等新键会进 diff，需要**加宽审批**（C04 那套 `approved-widening.json` 流程）。这属于正常流程成本，不是障碍。

---

## 七、待拍板（两个，必须先定再动手）

### 拍板①：本批做到哪一档？

- **档 A（推荐）**：单人 PVE 两族做满（`REQ_LANGHUAN_COMBAT`+`PVE_ACTION`、`REQ_ROGUE_PVE_COMBAT`+`ROGUE_PVE_ACTION`）＝ 4 个；
  `USER_PVP` 走优雅拒绝（`eRet:3` → 弹文案 + dispose）；
  `REQ_ROGUE_PVP_BATTLE`、MPPVE 三兄弟 ＝ **保留未实现**（回 `eRet:2`），并在回执里申报"进得去就卡"的风险。
- **档 B**：A 之外再把 `REQ_ROGUE_PVP_BATTLE` 用"镜像自己当对手"糊上（`AttckData`=自己、`EnemyData`=自己），能打但**不是真 PVP**，且我们替玩家造了一个对手——属于自定口径，需上游追认。
- **档 C**：全 9 个薄 ack（含 MPPVE）＝**不可取**：多人回放的 `playWithData` 要整场战斗数据，糊不出来，只会把"卡死"从入口挪到中途。

### 拍板②：`attArr` 要不要服务端给血？

- **②-1（推荐）**：`attArr: []`，血由客户端本地模拟，服务端不保命。改动小、无伪造成分。
- **②-2**：服务端持血并逐招回填（需要服务端伤害模型 = 另立一项工程，本批不做）。

---

## 八、未验证 / 风险

1. **可达性未验**：琅嬛（`LangHMode.startBattle` 唯一调用点 index.js:138298）与肉鸽入口需要什么前置（等级/任务/次数）没查——若本档存档根本进不去，这 4 个动作的价值只在"协议闭合"。**这是决定优先级的关键未知**。
2. **`REQ_LANGHUAN_COMBAT` 的 `lv` 分支**（index.js:67548）上游拼装未定位（scoutG 已记）。
3. **`AttckData` 里的 `skillMap/WeapToSkill/gemData` 用的是抓包快照值**（不是本档真实技能）⇒ 与存档技能升级（handlers.js 的 `upgradeSkill` 记账）不同步时，战斗里可能是"快照时的武功"。要不要把 `skillMap` 也换成我方 `s.skills`，需在做的时候定（有既有 helper `LoadGame` 的 `base.skillMap` 拼法可抄，handlers.js:2266-2274）。
4. **MPPVE 三兄弟的入口**（`INIT_MPPVE_BATTLE` = `enterMultiPVEBattle`，index.js:59785）**不在本批**；若入口也没实现，这三个动作实际打不到——需在入口批次一并处理。
5. `scoutH-c08-existing.md`（线上现有处置 + 第4批对账口径）已回，结论与本条一致：9 个键**一条专属 handler 都没有**；
6 个落 SHAPED 兜底（AttckData 恒 `{}`、npcID 恒 310003）、3 个落 UNKNOWN；拒绝码表里一个都没有；`test\` 下零覆盖。
（scoutH 还提了一处**范围外**矛盾：`handlers.js:6698-6700` 的 `drop:dedup` 自检断言与 `test\drop-table.js:64`「两次赢发两次」互斥——本轮未动，见 `C8-c08-执行记录.md` §六.4。）

---

## 九、若拍板档 A，执行序（预估 4-6 小时）

1. 抽 helper：`buildAttckData(s)`（从 `TPL.reqSelfBattleInfo` 内层去皮 + 换 baseValueAy/roleID）、`buildNpcArr(npcID)`（复用 `BZ_NPCARR`）。
2. 4 个 handler：`enterPVEBattle` / `beginPVEBattle` / `enterRoguePVEBattle` / `beginRoguePVEBattle`。
3. `ChallengePVP` → `eRet:3`（文案 1399＝"对方不在线"这类，需核文案表）。
4. `node tools\gen_shapes.js` → `build-handlers.js` → `check_shape_freeze --diff` → 写 planned/narrowing/widening → `--freeze`。
5. `test\c08-smoke.js`（≥8 条：开局回声 npcID、attArr 空、动作回声 4 字段、PVP 优雅拒绝、拒绝码）。
6. `acceptance.js` / `check_reject_codes.js` / `run.ps1 handlers` / `ver`。
7. 回执 + 上游申报（自定口径：动作回声、`attArr` 空、PVP 拒绝）。
