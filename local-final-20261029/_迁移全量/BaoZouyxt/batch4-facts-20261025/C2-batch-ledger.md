# C03〔战斗结算〕批次台账 —— 19/19 全部落地

> 上游批次定义来源：`audit-v23\relate-result-r3-20261024\relations.md`
> 「## 第4批 · C03〔战斗结算〕（19 个，可信度强）共享：family:战斗结算、token:RESULT、field:batch_sweep_data、token:BATTLE」
> 映射表：`tools/actions.json`（注册名 → `User.<线上名>`），19/19 全部命中，**没有一个对不上**。
> 部署：`impl=h1af4a4fc`，热重载，pid 6188 全程未重启。

---

## 1. 19 个动作全表（1 已有 + 18 本轮新写）

| # | 注册名（常量） | 线上名（= H 的键） | 状态 | 奖励 |
|---|---|---|---|---|
| 1 | BATTLE_END_REWARD | `CheckBattleResult` | ✅ 已有（第 1 批） | npcID→`BZ_NPCDROP` |
| 2 | GET_NEW_SWEEP_EVENT | `GetNewSweepTowerData` | ✅ 新写 | 无（纯查询） |
| 3 | ENTER_GET_CLIMBLING_EVENT | `GetClimbingTowerData` | ✅ 新写 | 无 |
| 4 | LOOK_SECRET_PANDA_EVENT | `lookSecretEvent` | ✅ 新写 | 无 |
| 5 | SERVER_NPC_BATTLE_END | `TowerBattleResult` | ✅ 新写 | ⚠ 无表 → 不发 |
| 6 | ROGUE_PVP_BATTLE_END | `NewRoguePVPBattleResult` | ✅ 新写 | ✅ npcID→`BZ_NPCDROP` |
| 7 | DICE_BATTLE_RESULT | `diceBattleResult` | ✅ 新写（回 eRet 0） | 无（玩法未建模） |
| 8 | GOOD_AND_EVIL_BATTLE_RESULT | `goodAndEvilBattleResult` | ✅ 新写 | ⚠ 无表 → 不发 |
| 9 | ROGUE_PVE_BATTLE_RESULT | `roguePveBattleResult` | ✅ 新写 | ✅ npcID→`BZ_NPCDROP` |
| 10 | SERVER_ROGUE_NPC_BATTLE_END | `rogueBattleResult` | ✅ 新写 | 无（结算口，不发奖） |
| 11 | TOWER_RANDOM_EVENT | `chanllengeTower` | ✅ 新写 | ⚠ 无表 → 不发 |
| 12 | ACTIVE_TOWER_EVENT | `activateTowerEvent` | ✅ 新写 | ⚠ 无表 → 不发 |
| 13 | NEW_TOWER_SWEEP_EVENT | `newSweepTower` | ✅ 新写 | 无（纯状态） |
| 14 | TOWER_CHOOSE_PANDA_EVENT | `choosePandaEvent` | ✅ 新写 | ⚠ 无表 → 不发 |
| 15 | CLOSE_NEW_SWEEP_EVENT | `closeNewSweepTowerByLv` | ✅ 新写 | 无（纯状态） |
| 16 | REQ_MP_RESULT | `mulitiNpcBattleResult` | ✅ 新写 | ⚠ 无可校验键 → 不发 |
| 17 | SELECT_SECRET_PANDA_EVENT | `chooseSecretEvent` | ✅ 新写 | 无（纯状态） |
| 18 | REQ_WM_ADV_RWD | `GetRandomEventAward` | ✅ 新写 | 🚫 白拿陷阱 → **不发** |
| 19 | USER_PVP_OVER | `NewPVPBattleResult` | ✅ 新写 | 无（结算口，不发奖） |

---

## 2. ⚠ §5.1「注册名 ≠ 线上名」在这一批的具体实例（5 处）

照注册名写 handler = **静默落进 UNKNOWN/通用 ACK，一条都不生效**：

```
SERVER_NPC_BATTLE_END        → TowerBattleResult        （不是 ServerNpcBattleEnd）
USER_PVP_OVER                → NewPVPBattleResult
REQ_WM_ADV_RWD               → GetRandomEventAward      （名字完全不搭）
ROGUE_PVP_BATTLE_END         → NewRoguePVPBattleResult
REQ_MP_RESULT                → mulitiNpcBattleResult    （上游拼成 muliti，不是 multi）
TOWER_RANDOM_EVENT           → chanllengeTower          （上游拼成 chanllenge，不是 challenge）
```
`muliti` / `chanllenge` 是**上游原文**，改成"正确"拼写就注册不上。
`test/c03-smoke.js` 断言 H 的键里**没有**注册名、**有**线上名，把这条锁死。

---

## 3. 发奖政策（唯一判据）

**奖励源必须是服务端表，键必须服务端可校验。客户端提交的数值一律不进钱包。**

| 类别 | 动作 | 依据 |
|---|---|---|
| ✅ 可安全发奖 | `NewRoguePVPBattleResult` / `roguePveBattleResult` | reqKeys 里有 `npcID`，奖励取自 `BZ_NPCDROP[npcID]`，与 CheckBattleResult 同一口径 |
| 🚫 白拿陷阱，绝不照发 | `GetRandomEventAward` | `index.js:143865-143867` 发的是 `{adventureID, award, eventID}`，**`award` 是客户端自己塞的数** |
| ⚠ 缺表 → 只 ack | 其余 6 个结算口 | 没有「楼层/事件→奖励」表 |

`test/c03-smoke.js` 有 3 条专门断言：
- 给 `GetRandomEventAward` 塞 `award: 999999` → 背包必须不变、`rewardArray` 必须空
- 给四个结算口塞伪造战果 → 背包不变、`contribution` 不被客户端数值改写
- 给肉鸽结算塞不存在的 `npcID` → 不发任何东西

---

## 4. 字段类型全部按客户端真实消费点定（不是猜的）

| 字段 | 客户端消费点 | 结论 |
|---|---|---|
| `awardObj` | `index.js:67705` `o.awardObj.hasOwnProperty("5")` + `67708 for (var n in o.rewardArray)` | 容器；用 `[]` 以免连带动到未改动作的默认值 |
| `rewardArray` | `index.js:67707` `for (var n in o.rewardArray)` | 对象 `{}` |
| `gemId` | `scripts3.js:24429` `e.gemId[0]` | **数组**（下标读）→ 本批把共享默认值从 0 修正为 `[]` |
| `npcArr` | `index.js:143820` `i.npcArr.length > 0` | 数组 `[]` |
| `delTaskIds` | `index.js:133311` `for (e=0; e<t.length; e++)` | 数组 `[]` |
| `booksObj` | `scripts3.js:70689` `for (var e in t.booksObj)` | 对象 `{}` |
| `prestige` / `contribution` | `scripts3.js:35349-35350` `t.prestige.toString()` | **必须是数字**（undefined.toString() 会抛）；`zeroIsWrong=false` 所以 0 合法 |
| `secret` | `scripts2.js:75376` `t.data.secret.length` / `[o]` | **数组** `[]` |
| `eventID` / `equipments` / `mapData2` / `equipObj` | container | 对象 `{}` |
| `dice` | `scripts3.js:51160` `this.curDiceData = e.dice` | 造不出来 → **回 eRet 0 让整段跳过** |

---

## 5. 形状冻结审批（本批共 2 轮）

**第 1 轮（上一轮，8 个 handler）**：diff 1 处
`lookSecretEvent.secret` 0→`[]`（num0→arr0）→ planned-changes 1 条 → freeze → diff 0

**第 2 轮（本轮，+10 个 handler）**：diff 7 处，全部是**类型修正**
```
gemId        0 → []       (CheckBattleResult / TowerBattleResult / mulitiNpcBattleResult)
eventID      0 → {}       (activateTowerEvent / chanllengeTower / houseSpecial)
equipObj     absent → {}  (mulitiNpcBattleResult，新增字段)
```
- 其中 `CheckBattleResult` 与 `houseSpecial` 的 handler **本轮未改** —— 是 `gen_shapes` 重算
  **共享字段默认值**时被我新 handler 的字面量带动的连带变化（已实测：把 `awardObj` 从 `{}` 改成 `[]`
  就能消掉另外 2 处连带 diff，说明机制就是这样）。
- 7 条写进 `planned-changes.json`（逐项 `allowSigma` + `index.js`/`scripts3.js` 行号证据）
- `mulitiNpcBattleResult.equipObj` 属 **新增路径**，另写进 `approved-widening.json`（C2 闸要求）
- `--freeze` → 复验 **diff 0**

## 6. 拒绝码登记

| 动作 | 码 | 理由 | 证据 |
|---|---|---|---|
| `delegateTask` | 4 | v2.6 C02 堵口新增（本轮之前的会话） | `index.js:43513` |
| `rogueAcceptTask` | 4 | 同上（**故意不用 6**：客户端 6 分支读 `o.skillId` 必抛） | `index.js:133250` |
| `diceBattleResult` | 0 | 本批新增：玩法未建模，回非 1 让客户端跳过 | `index.js:59842` |

`check_reject_codes`：动作 41→**42**、条目 45→**46**、拒绝点 71→**72**，OK。

---

## 7. 验证汇总

| 项 | 结果 |
|---|---|
| `test/c03-smoke.js` | **10/10 PASS** |
| `acceptance` | **42/42 绿**，已知红 0，cap 0 |
| `check_reject_codes` | OK（动作 42 / 条目 46 / 拒绝点 72） |
| `check_shape_freeze` | **diff 0** |
| 热重载 | `pid 6188 → 6188`、`impl h8021b85e → h1af4a4fc`、`selfCheck 1264` 全过、`implErr=null` |
| 设备端真实报文 | `TowerBattleResult` / `goodAndEvilBattleResult` / `GetRandomEventAward` / `NewRoguePVPBattleResult` 全 `eRet=1`；`diceBattleResult` `eRet=0`；字段与上表一致 |
| 存档 | 实测前后 md5 `0F1430544904E094C1D26CAA98851874` **完全相同**（含故意塞 `award:999999` / `prestige:999999` / 不存在的 npcID） |

---

## 8. 已知留白（等上游）

1. **7 个结算口没有奖励表** → 现在只 ack，玩家打完看不到奖励。需要上游给「楼层/事件 → 奖励」表与键。
2. **`GetRandomEventAward`** 要发奖必须先有按 `eventID`/`adventureID` 查的服务端表；绝不能信 `award`。
3. **`diceBattleResult`** 回 eRet 0 = 骰子/大富翁玩法本工程未建模（该动作连 shape-hints 与 BZ_SHAPES 都没有）。
4. **`mulitiNpcBattleResult`** 的 `o` 对象构造处（index.js:89340 附近）未精读，暂按"无可校验键"处理。
5. **两个肉鸽结算是可刷的**：`npcID + win` 即可反复领掉落（与已接受的 `CheckBattleResult` 同口径，
   R03 当时特意去掉去重）。若要把"刷怪"也堵掉，需要每日/每 npc 限次的口径 —— 这会改变现有玩法节奏，等你定。
