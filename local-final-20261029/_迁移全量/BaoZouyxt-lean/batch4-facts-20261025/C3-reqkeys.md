# C3：C03 待写 10 个动作 —— 发送点 / reqKeys / 防白拿判定

> 主审自做（本会话第三个派出的只读工人同样 12 分钟零产出，已 kill；按委派纪律 §9 降级自做）。
> 方法：grep 注册常量 → 定位 `sendRequest` 与 `MessageCenter.on` → 精读发送点对象字面量。

---

## 1. 汇总表

| 线上名 | 注册常量 | 发送点 | reqKeys（逐字） | 回调注册点 |
|---|---|---|---|---|
| `TowerBattleResult` | SERVER_NPC_BATTLE_END | index.js:71461 | 对象 `s`：`…gTime, hg, hgtimes, win`，`sweepState` 时追加 `lv` | index.js:67698 |
| `NewRoguePVPBattleResult` | ROGUE_PVP_BATTLE_END | index.js:104543 | `{npcID, win, pass, actionArr}` | scripts3.js:70932 |
| `goodAndEvilBattleResult` | GOOD_AND_EVIL_BATTLE_RESULT | index.js:101415 | 对象 `r`（含 `getargetType`，战果字段在更上方构造） | scripts3.js:36351 |
| `roguePveBattleResult` | ROGUE_PVE_BATTLE_RESULT | index.js:104542 | `{npcID, win, pass, actionArr}` | scripts3.js:70934 |
| `chanllengeTower` | TOWER_RANDOM_EVENT | index.js:137862 | `{lv}` | index.js:137589 |
| `activateTowerEvent` | ACTIVE_TOWER_EVENT | index.js:138321 | `{eventID}` | index.js:137820 |
| `choosePandaEvent` | TOWER_CHOOSE_PANDA_EVENT | index.js:137972 | `{idx, lv}` | index.js:137673 |
| `mulitiNpcBattleResult` | REQ_MP_RESULT | index.js:89357 | 对象 `o`（含 `speed, hgtimes`，npc 相关在更上方） | index.js:89335 |
| `GetRandomEventAward` | REQ_WM_ADV_RWD | index.js:143871 | `{adventureID, award, eventID}` | index.js:143814 |
| `diceBattleResult` | DICE_BATTLE_RESULT | **未找到 sendRequest** | — | scripts3.js:50767 |

---

## 2. ★ 防白拿判定（这一节决定每个动作能不能发奖）

判据只有一条：**奖励源必须是服务端表，键必须服务端可校验**。样板是已有的 `CheckBattleResult`
（客户端只给 `{win, npcID}`，奖励来自 `BZ_NPCDROP[npcID]`）。

| 动作 | 客户端提交里有没有可校验键 | 判定 | 处理 |
|---|---|---|---|
| `NewRoguePVPBattleResult` | **有 `npcID`** + `win` | ✅ **可发奖** | 复用 `BZ_NPCDROP[npcID]`，与 CheckBattleResult 完全同口径 |
| `roguePveBattleResult` | **有 `npcID`** + `win` | ✅ **可发奖** | 同上 |
| `TowerBattleResult` | 只有 `lv`（楼层数）、`win`，**无 npcID** | ⚠ 无表 | 需要「楼层→奖励」表；本工程没有 → 本轮 ack，不发奖 |
| `mulitiNpcBattleResult` | 对象 `o` 里疑似有 npc 信息，**待精读确认** | ⚠ 待定 | 若确认有 npcID → 同 npcID 口径；否则 ack |
| `goodAndEvilBattleResult` | 战果对象 `r`（字段待精读） | ⚠ 待定 | 同上 |
| **`GetRandomEventAward`** | **`award` 是客户端自己传的数值** | 🚫 **绝对不能照发** | 客户端说给多少就发多少 = 教科书式白拿。要么按 `eventID`/`adventureID` 查服务端表，要么 ack 不发 |
| `chanllengeTower` | `{lv}` | ⚠ 无表 | 塔层事件，ack |
| `activateTowerEvent` | `{eventID}` | ⚠ 无表 | ack |
| `choosePandaEvent` | `{idx, lv}` | ⚠ 无表 | ack |
| `diceBattleResult` | 找不到发送点 | ⚠ | 可能服务端主动下发或走别的封装，需单独查 |

**结论**：10 个里只有 2 个（两个肉鸽结算）能立刻按「服务端表 + npcID」安全发奖；
`GetRandomEventAward` 明确是白拿陷阱；其余 7 个缺奖励表 → ack only，等上游给表。

---

## 3. 与 C02 教训的对应

C02 那个白拿口子是「接任务不看领过没有」。这里形态不同但性质一样：**把客户端提交的数值当奖励发放**。
`index.js:143867` 的 `award: e` 就是那个数值。这条已写进 `C2-batch-ledger.md` §3 的政策里，
并在 `test/c03-smoke.js` 留了一条断言（塞 `award: 999999` 背包必须不变）。

---

## 4. 指令里点名的原文（供复核）

```
index.js:143865-143871   GetRandomEventAward (REQ_WM_ADV_RWD)
  var o = { adventureID: t, award: e, eventID: c.RumorModel.eventID };
  u.NewAdventureModel.isDeadMonster = !0;
  p.NetMgr.http.sendRequest(n.HttpConst.REQ_WM_ADV_RWD, o);

index.js:104536-104543   roguePveBattleResult / NewRoguePVPBattleResult
  h = { npcID: i, win: n, pass: u, actionArr: o.actionArr };
  d.NetMgr.http.sendRequest(l.HttpConst.ROGUE_PVE_BATTLE_RESULT, h);
  } else d.NetMgr.http.sendRequest(l.HttpConst.ROGUE_PVP_BATTLE_END, h);

index.js:71455-71461     TowerBattleResult (SERVER_NPC_BATTLE_END)
  gTime: a.totalGameTime.gameTime, hg: a.hunger.remaining,
  hgtimes: a.numStuffed, win: o
  };
  t.TowerModel.sweepState && (s.lv = t.TowerModel.sweepLv);
  n.NetMgr.http.sendRequest(i.HttpConst.SERVER_NPC_BATTLE_END, s);

index.js:137862-137864   chanllengeTower (TOWER_RANDOM_EVENT)
  g.NetMgr.http.sendRequest(c.HttpConst.TOWER_RANDOM_EVENT, { lv: parseInt(e) });

index.js:138321-138323   activateTowerEvent (ACTIVE_TOWER_EVENT)
  g.NetMgr.http.sendRequest(c.HttpConst.ACTIVE_TOWER_EVENT, { eventID: t });

index.js:137972-137975   choosePandaEvent (TOWER_CHOOSE_PANDA_EVENT)
  this.sweepState ? g.NetMgr.http.sendRequest(c.HttpConst.TOWER_CHOOSE_PANDA_EVENT, {
  idx: t, lv: this.sweepLv })
```

---

## 5. 未确认

1. `TowerBattleResult` 的发送对象完整字面量（71461 往上还有若干行，本次只截了 ±7 行）——需再读 71440-71461。
2. `goodAndEvilBattleResult` 的 `r` 构造处不在截取窗口内。
3. `mulitiNpcBattleResult` 的 `o` 构造处（89340 附近）未读。
4. `diceBattleResult` 无 sendRequest 命中，需换模式查（可能走 `reqDiceFight`/MonopoModel）。
5. 所有回调函数体（recvFields / eRet 分支）本轮**未逐个读**，字段契约先用
   `C1-shape-hints-c03.md`（v2.6 机器产出）顶着。
