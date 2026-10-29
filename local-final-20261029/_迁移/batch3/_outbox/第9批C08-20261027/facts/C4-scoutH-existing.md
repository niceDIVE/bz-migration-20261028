# A 部分

> 取证对象：`hotfix-patch/patch/live/handlers.js`（1438257 字节，`ver=he29a670a built=2026-10-26T15:59:48.512Z`，见 `handlers.js:1`）。
> 本部分全部结论只来自 grep + 定点 read，未整文件读取。

## 全批共用前提（先看这 3 条，否则下面 9 个键的结论会被误读）

**前提 1：这是「注册名」，handlers.js 只认「线上名」。**
`handlers.js` 里大写注册名一个都没有（grep `PVE_ACTION|ROGUE_PVE_ACTION|REQ_LANGHUAN_COMBAT|REQ_ROGUE_PVE_COMBAT|MPPVE_ACTION|ROGUE_MPPVE_ACTION|REQ_ROGUE_PVP_BATTLE|START_MPPVE_BATTLE|USER_PVP` 全文仅 2 命中，且两处都是 `USER_PVP_OVER` 的子串：`handlers.js:5188`、`handlers.js:5265`）。注册名 → 线上名的权威映射由代码自己指名：

```
handlers.js:5195:      * 映射表：tools/actions.json（注册名 → User.<线上名>）。
```

**前提 2：分派链是三段，不是两段。** 这直接决定 9 个键的"处置"分两种：

```
handlers.js:6202:    var h = H[action];
...
handlers.js:6203:    env.log('dispatch User.' + action);
handlers.js:6204:    if (h) {
...
handlers.js:6238:    // 未手写 handler 的动作：先查形状表，照客户端真会读的字段回（不再只回一句 ACK）
handlers.js:6239:    var sp = shaped(action);
handlers.js:6240:    if (sp) {
handlers.js:6241:      env.log('SHAPED User.' + action + ' p=' + JSON.stringify(p).slice(0, 160));
handlers.js:6242:      return sp;
handlers.js:6243:    }
handlers.js:6244:    // 形状表里也没有：通用成功 ACK（与实测响应同构），保证客户端不卡
handlers.js:6245:    // 但必须大声记录——这条日志就是动作覆盖率待办清单的来源
handlers.js:6246:    env.log('UNKNOWN ' + mod + '.' + action + ' p=' + JSON.stringify(p).slice(0, 240));
handlers.js:6247:    return ack(action, { achievement: ach() });
```

`H` 是手写 handler 表，起点 `handlers.js:2190:   var H = {`。`shaped()` 查 `BZ_SHAPES`（表起点 `handlers.js:13: var BZ_SHAPES = {`），实现 `handlers.js:6086-6101`；`ack()` 是 `wrapped(doName, { eRet: 1 }, extra)`，见 `handlers.js:898`。

⇒ **9 个键里 6 个落到 `SHAPED` 分支（有形状、无 handler），3 个落到 `UNKNOWN`**。`SHAPED` 与 `UNKNOWN` 是两个不同的兜底，别混写。

**前提 3：任务书给的驼峰规律（`PVE_ACTION → User.pveAction`）与仓库实际映射不符。**
grep `pveAction|roguePveAction|reqLanghuanCombat|reqRoguePveCombat|mppveAction|rogueMppveAction|reqRoguePvpBattle|startMppveBattle|userPvp` 在 `handlers.js` 与 `tools/shapes.json` 均 **0 命中**。实际是 `PVE_ACTION → User.beginPVEBattle`（`tools/actions.json:287`），且被 `tools/shapes.json` 的 `constName` 字段独立印证（`tools/shapes.json:6773`）。详见 `# 范围外发现` 第 1 条。

---

## 1. PVE_ACTION

注册名对应线上名：`"PVE_ACTION": "User.beginPVEBattle"`（`tools/actions.json:287`）。

### 1) handlers.js 里有没有 handler / 分支

**无专属 handler。** `beginPVEBattle` 在 `handlers.js` 全文只有 1 处命中，是 `BZ_SHAPES` 的形状字面量，不是 `H` 的键：

```
handlers.js:106:   "beginPVEBattle": {"eRet":1,"action":{},"attArr":[],"paramID":0,"paramID1":0,"paramID2":0},
```

**不是落 UNKNOWN，是落 `SHAPED` 兜底**（`handlers.js:6239-6242`，原文见前提 2）。`shaped()` 会把它变成 `wrapped('beginPVEBattle', <形状克隆>, ...)`（`handlers.js:6086-6101`），应答正文只有 `eRet:1 / action:{} / attArr:[] / paramID:0 / paramID1:0 / paramID2:0`，不含任何 npcID。

### 2) 是否在拒绝清单 / registry 里

- **拒绝码登记（运行时表）**：无。`REJECT_CODES` 覆盖 `handlers.js:564-673`，其中没有 `beginPVEBattle` 也没有 `PVE_ACTION`（`handlers.js:564:   var REJECT_CODES = {` … `handlers.js:673:   };`）。
- **拒绝码清单文件**：无。`tools/facts/reject-codes.json`（`check_reject_codes.js` 的判定表，见 `tools/check_reject_codes.js:46` 与 `handlers.js:557` 注释）共 76 个顶层动作键（`reject-codes.json:2` `"useItem": {` … `reject-codes.json:1930` `"getGoodAndEvilRetireData": {`），不含 `beginPVEBattle`。
- **shapes 注册表**：**有，但标记未实现**：

```
tools/shapes.json:6772:   "beginPVEBattle": {
tools/shapes.json:6773:    "constName": "PVE_ACTION",
tools/shapes.json:6778:    "impl": false,
```

⇒ 结论：**未登记为"已实现"，只在形状表里有一条 `impl:false` 的形状**。

### 3) test\ 下有没有 smoke 覆盖

**没有。** grep `beginPVEBattle` 在 `hotfix-patch/test/` 下 0 命中；grep `PVE_ACTION` 在 `test/` 下 0 命中。

---

## 2. ROGUE_PVE_ACTION

线上名：`"ROGUE_PVE_ACTION": "User.beginRoguePVEBattle"`（`tools/actions.json:779`）。

### 1) handlers.js 里有没有 handler / 分支

**无专属 handler。** 唯一命中是形状字面量：

```
handlers.js:108:   "beginRoguePVEBattle": {"eRet":1,"action":{},"attArr":[],"paramID":0,"paramID1":0,"paramID2":0},
```

**落 `SHAPED` 兜底**（`handlers.js:6239-6242`），不回 npcID，不查任何表，不写档。

### 2) 是否在拒绝清单 / registry 里

- `REJECT_CODES`（`handlers.js:564-673`）：无。
- `tools/facts/reject-codes.json`：无。
- `tools/shapes.json`：有，`impl:false`：

```
tools/shapes.json:6910:   "beginRoguePVEBattle": {
tools/shapes.json:6911:    "constName": "ROGUE_PVE_ACTION",
tools/shapes.json:6916:    "impl": false,
```

### 3) test\ 下有没有 smoke 覆盖

**没有。** `test/` 下 grep `beginRoguePVEBattle`、`ROGUE_PVE_ACTION` 均 0 命中。

---

## 3. REQ_LANGHUAN_COMBAT

线上名：`"REQ_LANGHUAN_COMBAT": "User.enterPVEBattle"`（`tools/actions.json:286`）。

### 1) handlers.js 里有没有 handler / 分支

**无专属 handler。** 唯一命中：

```
handlers.js:163:   "enterPVEBattle": {"eRet":1,"AttckData":{},"attArr":[],"gold":99999,"npcArr":[],"npcID":310003,"randSeed":0},
```

**落 `SHAPED` 兜底**。注意形状里 `npcID` 是写死的 **310003**，`gold` 是写死的 **99999**（`gold` 会被 `LEDGER_FIELDS` 改写为真实钱包值：`handlers.js:6082`、`handlers.js:6091-6098`；`npcID` 不在 `LEDGER_FIELDS` 里，原样发出）。

### 2) 是否在拒绝清单 / registry 里

- `REJECT_CODES`（`handlers.js:564-673`）：无。
- `tools/facts/reject-codes.json`：无。
- `tools/shapes.json`：有，`impl:false`：

```
tools/shapes.json:9421:   "enterPVEBattle": {
tools/shapes.json:9422:    "constName": "REQ_LANGHUAN_COMBAT",
tools/shapes.json:9427:    "impl": false,
```

### 3) test\ 下有没有 smoke 覆盖

**没有。** `enterPVEBattle` / `REQ_LANGHUAN_COMBAT` 在 `test/` 下 0 命中。

---

## 4. REQ_ROGUE_PVE_COMBAT

线上名：`"REQ_ROGUE_PVE_COMBAT": "User.enterRoguePVEBattle"`（`tools/actions.json:778`）。

### 1) handlers.js 里有没有 handler / 分支

**无专属 handler。** 唯一命中（形状字面量）：

```
handlers.js:164:   "enterRoguePVEBattle": {"eRet":1,"AttckData":{"eliteBuffs":{},"floorBuff":{}},"attArr":[],"exchangeNpcArr":[],"npcArr":[],"npcID":310003,"randSeed":0},
```

**落 `SHAPED` 兜底**（`handlers.js:6239-6242`）；另有 `BZ_SHAPES.__switch` 里的开关字段登记（同一行内含）：

```
handlers.js:355: BZ_SHAPES.__switch = {... "ChallengeRoguePVP":{"isBoss":"switch","rogueFloorBuffs":"switch"},"enterRoguePVEBattle":{"isBoss":"switch","rogueFloorBuffs":"switch"}, ...};
```

`__switch` 只被 `noteBadSwitches` 用来记日志（`handlers.js:6121-6124`），不改变分派结果。

### 2) 是否在拒绝清单 / registry 里

- `REJECT_CODES`（`handlers.js:564-673`）：无。
- `tools/facts/reject-codes.json`：无。
- `tools/shapes.json`：有，`impl:false`：

```
tools/shapes.json:9514:   "enterRoguePVEBattle": {
tools/shapes.json:9515:    "constName": "REQ_ROGUE_PVE_COMBAT",
tools/shapes.json:9520:    "impl": false,
```

### 3) test\ 下有没有 smoke 覆盖

**没有。** `enterRoguePVEBattle` / `REQ_ROGUE_PVE_COMBAT` 在 `test/` 下 0 命中。

---

## 5. MPPVE_ACTION

线上名：`"MPPVE_ACTION": "User.beginMultiPVEBattle"`（`tools/actions.json:290`）。

### 1) handlers.js 里有没有 handler / 分支

**无专属 handler，且连形状也没有 → 落 UNKNOWN 兜底。**

`beginMultiPVEBattle` 在 `handlers.js` 全文 **0 命中**（含形状表）；`tools/shapes.json` 里也 **0 命中**。兜底原文：

```
handlers.js:6244:    // 形状表里也没有：通用成功 ACK（与实测响应同构），保证客户端不卡
handlers.js:6245:    // 但必须大声记录——这条日志就是动作覆盖率待办清单的来源
handlers.js:6246:    env.log('UNKNOWN ' + mod + '.' + action + ' p=' + JSON.stringify(p).slice(0, 240));
handlers.js:6247:    return ack(action, { achievement: ach() });
```

`ack()` → `wrapped(action, { eRet: 1 }, { achievement: ach() })`（`handlers.js:898`、`handlers.js:892-897`）⇒ 应答正文只有 `eRet:1`。

### 2) 是否在拒绝清单 / registry 里

- `REJECT_CODES`（`handlers.js:564-673`）：无。
- `tools/facts/reject-codes.json`：无。
- `tools/shapes.json`：**完全没有这个动作的条目**。该文件 MPPVE 相关只有两条别的键：`enterMultiPVEBattle`（`constName: INIT_MPPVE_BATTLE`，`tools/shapes.json:9297-9298`）与 `getFighterInfo`（`constName: REQ_MPPVE_FIGHTER_INFO`，`tools/shapes.json:11375-11376`），**都不是 `beginMultiPVEBattle`**。

⇒ 三个注册表里都是"未注册"。

### 3) test\ 下有没有 smoke 覆盖

**没有。** `beginMultiPVEBattle` / `MPPVE_ACTION` 在 `test/` 下 0 命中。

---

## 6. ROGUE_MPPVE_ACTION

线上名：`"ROGUE_MPPVE_ACTION": "User.beginRogueMultiPVEBattle"`（`tools/actions.json:710`）。

### 1) handlers.js 里有没有 handler / 分支

**无专属 handler，连形状也没有 → 落 UNKNOWN 兜底。** `beginRogueMultiPVEBattle` 在 `handlers.js` 与 `tools/shapes.json` 均 0 命中。兜底原文同上：`handlers.js:6244-6247`，回 `eRet:1` 单项。

### 2) 是否在拒绝清单 / registry 里

- `REJECT_CODES`（`handlers.js:564-673`）：无。
- `tools/facts/reject-codes.json`：无。
- `tools/shapes.json`：**无条目**（grep `beginRogueMultiPVEBattle` 0 命中）。

⇒ 三个注册表里都是"未注册"。

### 3) test\ 下有没有 smoke 覆盖

**没有。** `beginRogueMultiPVEBattle` / `ROGUE_MPPVE_ACTION` 在 `test/` 下 0 命中。

---

## 7. REQ_ROGUE_PVP_BATTLE

线上名：`"REQ_ROGUE_PVP_BATTLE": "User.ChallengeRoguePVP"`（`tools/actions.json:706`）。

### 1) handlers.js 里有没有 handler / 分支

**无专属 handler。** 唯一命中是形状字面量：

```
handlers.js:30:   "ChallengeRoguePVP": {"eRet":1,"AttckData":{"floorBuff":{}},"EnemyData":{}},
```

**落 `SHAPED` 兜底**（`handlers.js:6239-6242`）；`__switch` 里也有它的开关登记：`handlers.js:355` 片段 `"ChallengeRoguePVP":{"isBoss":"switch","rogueFloorBuffs":"switch"}`。

⚠ 与它**同名前缀但不同动作**的结算口是 `NewRoguePVPBattleResult`（`ROGUE_PVP_BATTLE_END`，`handlers.js:5297-5304`，见 B 部分）——开战请求不写档，结算请求才写档。

### 2) 是否在拒绝清单 / registry 里

- `REJECT_CODES`（`handlers.js:564-673`）：无。
- `tools/facts/reject-codes.json`：无。
- `tools/shapes.json`：有，`impl:false`：

```
tools/shapes.json:2963:   "ChallengeRoguePVP": {
tools/shapes.json:2964:    "constName": "REQ_ROGUE_PVP_BATTLE",
tools/shapes.json:2969:    "impl": false,
```

### 3) test\ 下有没有 smoke 覆盖

**没有。** `ChallengeRoguePVP` / `REQ_ROGUE_PVP_BATTLE` 在 `test/` 下 0 命中。

---

## 8. START_MPPVE_BATTLE

线上名：`"START_MPPVE_BATTLE": "User.startMultiPVEBattle"`（`tools/actions.json:289`）。

### 1) handlers.js 里有没有 handler / 分支

**无专属 handler，连形状也没有 → 落 UNKNOWN 兜底。** `startMultiPVEBattle` 在 `handlers.js` 与 `tools/shapes.json` 均 0 命中。兜底原文：`handlers.js:6244-6247`，回 `eRet:1` 单项。

### 2) 是否在拒绝清单 / registry 里

- `REJECT_CODES`（`handlers.js:564-673`）：无。
- `tools/facts/reject-codes.json`：无。
- `tools/shapes.json`：**无条目**（grep `startMultiPVEBattle` 0 命中）。

⇒ 三个注册表里都是"未注册"。

### 3) test\ 下有没有 smoke 覆盖

**没有。** `startMultiPVEBattle` / `START_MPPVE_BATTLE` 在 `test/` 下 0 命中。

---

## 9. USER_PVP

线上名：`"USER_PVP": "User.ChallengePVP"`（`tools/actions.json:17`）。

### 1) handlers.js 里有没有 handler / 分支

**无专属 handler。** `ChallengePVP` 唯一命中是形状字面量：

```
handlers.js:29:   "ChallengePVP": {"eRet":1,"AttckData":{},"EnemyData":{}},
```

**落 `SHAPED` 兜底**（`handlers.js:6239-6242`）；`__switch` 登记：`handlers.js:355` 片段 `"ChallengePVP":{"getargetType":"switch"}`。

⚠ **`USER_PVP` 与 `USER_PVP_OVER` 是两个不同键**。`handlers.js` 里 grep `USER_PVP` 只命中两处，两处都是 `USER_PVP_OVER`：
```
handlers.js:5188:      *   USER_PVP_OVER                → NewPVPBattleResult
handlers.js:5265:     /** PVP 战斗结束。USER_PVP_OVER，0 字段。同上：只回成功，不发奖。 */
```
`USER_PVP`（= `ChallengePVP`，开战）在 `handlers.js` 里没有任何专属处理；`USER_PVP_OVER`（= `NewPVPBattleResult`，结算）有 handler，见 B 部分。

### 2) 是否在拒绝清单 / registry 里

- `REJECT_CODES`（`handlers.js:564-673`）：无（没有 `ChallengePVP`，也没有 `NewPVPBattleResult`）。
- `tools/facts/reject-codes.json`：无。
- `tools/shapes.json`：有，`impl:false`：

```
tools/shapes.json:2910:   "ChallengePVP": {
tools/shapes.json:2911:    "constName": "USER_PVP",
tools/shapes.json:2916:    "impl": false,
```

### 3) test\ 下有没有 smoke 覆盖

**没有。** `ChallengePVP` 在 `test/` 下 0 命中。`USER_PVP` 这个**字符串**在 `test/` 下只有 1 处命中，且是 `USER_PVP_OVER` 的子串（`test/c03-smoke.js:63` `['NewPVPBattleResult', 'USER_PVP_OVER'],`）—— 那属于 B.7，不覆盖 `USER_PVP`（=`ChallengePVP`）本身。

---

## A 部分汇总表（证据行号见各小节）

| # | 键 | 线上名 | handler | 实际落点 | shapes.json | test 覆盖 |
|---|---|---|---|---|---|---|
| 1 | PVE_ACTION | beginPVEBattle | 无 | SHAPED | `impl:false` @6778 | 无 |
| 2 | ROGUE_PVE_ACTION | beginRoguePVEBattle | 无 | SHAPED | `impl:false` @6916 | 无 |
| 3 | REQ_LANGHUAN_COMBAT | enterPVEBattle | 无 | SHAPED | `impl:false` @9427 | 无 |
| 4 | REQ_ROGUE_PVE_COMBAT | enterRoguePVEBattle | 无 | SHAPED | `impl:false` @9520 | 无 |
| 5 | MPPVE_ACTION | beginMultiPVEBattle | 无 | **UNKNOWN** | 无条目 | 无 |
| 6 | ROGUE_MPPVE_ACTION | beginRogueMultiPVEBattle | 无 | **UNKNOWN** | 无条目 | 无 |
| 7 | REQ_ROGUE_PVP_BATTLE | ChallengeRoguePVP | 无 | SHAPED | `impl:false` @2969 | 无 |
| 8 | START_MPPVE_BATTLE | startMultiPVEBattle | 无 | **UNKNOWN** | 无条目 | 无 |
| 9 | USER_PVP | ChallengePVP | 无 | SHAPED | `impl:false` @2916 | 无 |

---

# B 部分

> 7 个动作全部**已实现**（都在 `H` 里，`tools/shapes.json` 对应条目 `impl:true`）。
> 共用底座：`dropForNpc` / `grantFromDrop` / `grantItem` / `CURRENCY_SLOTS`，先看这一节，后面 7 小节只点差异。

## B.0 共用地基（后面 7 个动作全部复用这几段）

**统一掉落入口 `dropForNpc(npc, tag)`**（`handlers.js:1906-1926`）：

```
handlers.js:1910:   function dropForNpc(npc, tag) {
handlers.js:1911:     var id = parseInt(npc, 10) || 0;
handlers.js:1912:     if (!(id > 0)) return null;
handlers.js:1913:     var s = ensureLedger(loadSave());
handlers.js:1914:     var dropId = (typeof BZ_NPCDROP !== 'undefined') ? BZ_NPCDROP[String(id)] : 0;
handlers.js:1915:     if (!dropId) {
handlers.js:1916:       env.log(tag + ' npc=' + id + ' 无掉落表（npc.Drop 缺失或展开为空）→ 不发奖');
handlers.js:1917:       return null;
handlers.js:1918:     }
handlers.js:1919:     var got = grantFromDrop(s, dropId);
handlers.js:1920:     persist();
handlers.js:1921:     if (got) pushToClient(got.items, got.equips);
handlers.js:1922:     var n = got ? (Object.keys(got.items || {}).length + Object.keys(got.equips || {}).length) : 0;
handlers.js:1923:     env.log(tag + ' npc=' + id + ' drop=' + dropId
handlers.js:1924:       + (n ? ' → ' + JSON.stringify(got) : ' 本次没掷中'));
handlers.js:1925:     return got;
handlers.js:1926:   }
```

**掉落展开 `grantFromDrop(s, dropId)`**（`handlers.js:1595-1612`，概率规则在同段注释 `1585-1591`）：

```
handlers.js:1595:   function grantFromDrop(s, dropId) {
handlers.js:1596:     var D = (typeof BZ_DROP !== 'undefined') ? BZ_DROP : null;
handlers.js:1597:     if (!D) return null;
handlers.js:1598:     var row = D[String(dropId)];
handlers.js:1599:     if (!row) return null;
handlers.js:1600:     var got = { items: {}, equips: {} };
handlers.js:1601:     for (var k in row) {
handlers.js:1602:       if (!row.hasOwnProperty(k)) continue;
handlers.js:1603:       var cnt = parseInt(row[k][0], 10) || 0;
handlers.js:1604:       var p = parseInt(row[k][1], 10) || 0;
handlers.js:1605:       if (!(cnt > 0)) continue;
handlers.js:1606:       if (p < 100 && !(rnd() * 100 < p)) continue;
handlers.js:1607:       grantItem(s, k, cnt);
handlers.js:1608:       if (itemTypeOf(k) === 1) got.equips[k] = (got.equips[k] || 0) + cnt;
handlers.js:1609:       else got.items[k] = (got.items[k] || 0) + cnt;
handlers.js:1610:     }
handlers.js:1611:     return got;
handlers.js:1612:   }
```

**发物品 `grantItem`**（`handlers.js:1389-1400`）—— 装备进 `s.playerEquip[id] = [1, 累加]`，其它进 `s.bag`：

```
handlers.js:1394:     if (itemTypeOf(iid) === 1) {
handlers.js:1395:       var cur = Array.isArray(s.playerEquip[iid]) ? (parseInt(s.playerEquip[iid][1], 10) || 0) : 0;
handlers.js:1396:       s.playerEquip[iid] = [1, cur + cnt];
handlers.js:1397:     } else {
handlers.js:1398:       bagAdd(s, iid, cnt);
handlers.js:1399:     }
```

**货币槽 `CURRENCY_SLOTS`**（`handlers.js:1435-1441`）+ 入账 `grantCurrency`（`handlers.js:1472-1481`）：

```
handlers.js:1435:   var CURRENCY_SLOTS = {
handlers.js:1436:     1: { f: 'gold', k: 'gold' },
handlers.js:1437:     4001: { f: 'coins', k: 'coins' },
handlers.js:1438:     4002: { f: 'exp', k: 'exp' },
handlers.js:1439:     4003: { f: 'potential', k: 'ptt' },
handlers.js:1440:     8888: { f: 'yuanbao', k: 'yuanbao' }
handlers.js:1441:   };
handlers.js:1472:   function grantCurrency(s, id, n) {
handlers.js:1473:     var slot = currencySlot(id);
handlers.js:1474:     var cnt = parseInt(n, 10) || 0;
handlers.js:1475:     if (!slot || cnt <= 0) return null;
handlers.js:1476:     if (typeof s[slot.f] !== 'number') s[slot.f] = (slot.f === 'yuanbao' || slot.f === 'exp') ? 0 : 99999;
handlers.js:1477:     s[slot.f] += cnt;
handlers.js:1478:     var eco = {};
handlers.js:1479:     eco[slot.k] = s[slot.f];
handlers.js:1480:     return eco;
handlers.js:1481:   }
```

⚠ **关键事实（对全部 7 个动作成立）**：掉落路径是 `grantFromDrop → grantItem`，**从不调用 `grantCurrency`**。`grantCurrency(` 在全文只有 4 个调用点：`handlers.js:1458`（`grantRewardList` 内部）、`handlers.js:3995`、`handlers.js:5427`、`handlers.js:5741` —— 没有一个在 B 部分的 7 个 handler 里。⇒ **B 部分 7 个动作的奖励一律落在 `s.bag` / `s.playerEquip`，不入任何 `CURRENCY_SLOTS` 槽。**

**推送 `pushToClient`**（`handlers.js:1556-1569`）—— 推的是存档里的**绝对值**，不是增量：

```
handlers.js:1556:   function pushToClient(items, equips) {
handlers.js:1557:     if (env.sandbox) return;
handlers.js:1558:     var s = loadSave();
handlers.js:1559:     var bag = (s && s.bag) || {};
handlers.js:1560:     var abs = {};
handlers.js:1561:     if (items) {
handlers.js:1562:       for (var k in items) {
handlers.js:1563:         if (!items.hasOwnProperty(k)) continue;
handlers.js:1564:         abs[k] = parseInt(bag[k], 10) || 0;
handlers.js:1565:       }
handlers.js:1566:     }
handlers.js:1567:     if (Object.keys(abs).length) pushSetItem(abs);
handlers.js:1568:     if (equips && Object.keys(equips).length) pushAddEq(equips);
handlers.js:1569:   }
```

**落盘 `persist()`**（`handlers.js:960-973`）—— 写前过 `validateSave` + `guardSave`，不过就回滚内存：

```
handlers.js:960:   function persist() {
handlers.js:961:     if (_readOnly) { env.log('⚠ 只读模式：拒绝写档（动作 ' + (_currentAction || '?') + '）'); return false; }
handlers.js:962:     var bad = null;
handlers.js:963:     try { validateSave(_save); }
handlers.js:964:     catch (e) { bad = '校验失败: ' + e; }
handlers.js:965:     if (!bad) bad = guardSave(_lastGood, _save);
handlers.js:966:     if (bad) {
...
handlers.js:970:       if (canRollback) _save = cloneJson(_lastGood);
```

---

## B.1 CheckBattleResult

**位置**：`handlers.js:2734-2770`（注释段 `2724-2733`）。这是"战斗结果族"的**基准口径**，其它结算口注释都自称"与 CheckBattleResult 完全同一口径"（`handlers.js:1906`、`handlers.js:5254`、`handlers.js:5296`）。

```
handlers.js:2734:     CheckBattleResult: function (p) {
handlers.js:2735:       p = p || {};
handlers.js:2736:       var npc = parseInt(p.npcID, 10) || 0;
handlers.js:2737:       var win = (p.win === true) || (parseInt(p.win, 10) === 1);
handlers.js:2738:       var got = null;
handlers.js:2739:       if (npc > 0 && win) {
handlers.js:2740:         var s = ensureLedger(loadSave());
handlers.js:2741:         var dropId = (typeof BZ_NPCDROP !== 'undefined') ? BZ_NPCDROP[String(npc)] : 0;
handlers.js:2742:         if (!dropId) {
handlers.js:2743:           env.log('打怪掉落 npc=' + npc + ' 无掉落表（npc.Drop 缺失或展开为空）');
handlers.js:2744:         } else {
handlers.js:2745:           got = grantFromDrop(s, dropId);
handlers.js:2746:           persist();
handlers.js:2747:           if (got) pushToClient(got.items, got.equips);   // 掉落同样要推，否则只写存档、界面看不到
handlers.js:2748:           if (got && (Object.keys(got.items).length || Object.keys(got.equips).length)) {
handlers.js:2749:             env.log('打怪掉落 npc=' + npc + ' drop=' + dropId + ' → ' + JSON.stringify(got));
handlers.js:2750:           } else {
handlers.js:2751:             env.log('打怪掉落 npc=' + npc + ' drop=' + dropId + ' 本次没掷中');
handlers.js:2752:           }
handlers.js:2753:         }
handlers.js:2754:       }
handlers.js:2755:       var r = clone(TPL.checkBattleResult);
handlers.js:2756:       var inner = r['User.CheckBattleResult'];
handlers.js:2757:       if (inner) {
handlers.js:2758:         inner.win = !!win;
handlers.js:2759:         inner.rewardArray = (got && got.items) ? got.items : {};
handlers.js:2760:         var eq = {};
handlers.js:2761:         if (got && got.equips) {
handlers.js:2762:           for (var ek in got.equips) {
handlers.js:2763:             if (!got.equips.hasOwnProperty(ek)) continue;
handlers.js:2764:             eq[ek] = [1, got.equips[ek]];      // 模板里 equipObj 的形状是 {uid: [type, num]}
handlers.js:2765:           }
handlers.js:2766:         }
handlers.js:2767:         inner.equipObj = eq;
handlers.js:2768:       }
handlers.js:2769:       return r;
handlers.js:2770:     },
```

- **读请求字段**：只读 2 个 —— `p.npcID`（`2736`）、`p.win`（`2737`）。`win` 的判定是"严格 `true` 或 `parseInt === 1`"，其它值一律当失败。请求原文另有日志留痕（`handlers.js:6172` 的 `LOG_REQ_RE` 覆盖 `CheckBattleResult`，落日志点 `handlers.js:6188-6193`）。
- **写存档槽**：`s.bag`（非装备掉落）/ `s.playerEquip`（装备，形如 `[1, 数量]`），经 `grantItem`（`handlers.js:1389-1400`）；落盘 `persist()` @`2746`。
- **发奖励**：发，且**只按服务端表发** —— 数额来自 `BZ_NPCDROP[npcID]` → `BZ_DROP[dropId]`（`2741`、`1598`）。客户端自报数值不参与（注释 `2724-2733`、`1906-1908`）。**不入任何 `CURRENCY_SLOTS` 槽**（走 `grantItem` 不走 `grantCurrency`）。
- **应答字段**：`win`（`2758`）、`rewardArray = got.items`（`2759`）、`equipObj = {id:[1,num]}`（`2760-2767`）。
- **防重 / 每日限次**：**明确不做去重**，且注释给出了理由：

```
handlers.js:2727:      *  2026-10-22 R03 修正两处：
handlers.js:2728:      *   1. **不再做 5 秒去重**。证据：客户端只有一处发送点（index.js:69196，战斗结束事件），
handlers.js:2729:      *      三包里 `retry/resend/onTimeout` 零命中；HTTP 封装的"重发"只挂在 onerror/ontimeout 上，
handlers.js:2730:      *      而进程内 XHR 是**同步返回 200**，错误路径永不触发 → 重复结算不会发生，
handlers.js:2731:      *      自造的时间窗口只会误吞"自动战斗/连打同一只怪"的第二场。
```

无每日上限：`todayKey()` 全文只在 `handlers.js:1353`、`1367`、`5395`、`5730` 出现，无一在本段内；`CIRCLE_DAILY_MAX` 只在 `handlers.js:1328`（定义）与 `1355`（`canClaim`）出现。
- **测试**：`test/drop-table.js:6`（口径注释）、`test/drop-table.js:44`（`battle()` 辅助）、`test/drop-table.js:47/55/64/74/82/90/98/106`（T1–T8）；其中 `test/drop-table.js:64` 标题即"**T3 不去重：两次赢就发两次**"，`test/drop-table.js:71` 断言 `'第二场也该发（旧版 5 秒窗口会吞掉）'`。另有 `test/push-grants.js:79/83/93/103`（T3–T5 推客户端）、`test/l0-envelope.js:97/103`（信封 + 模板键 `checkBattleResult`）。

## B.2 ReqSelfBattleInfo

**位置**：`handlers.js:2707-2723`（注释段 `2701-2706`）。

```
handlers.js:2707:     ReqSelfBattleInfo: function (p) {
handlers.js:2708:       p = p || {};
handlers.js:2709:       var s = loadSave();
handlers.js:2710:       var npc = parseInt(p.npcID, 10) || 0;
handlers.js:2711:       var r = clone(TPL.reqSelfBattleInfo);
handlers.js:2712:       var inner = r['User.ReqSelfBattleInfo'];
handlers.js:2713:       if (inner) {
handlers.js:2714:         if (s.baseValueAy) inner.baseValueAy = s.baseValueAy;
handlers.js:2715:         if (npc > 0) {
handlers.js:2716:           inner.npcID = npc;
handlers.js:2717:           var A = (typeof BZ_NPCARR !== 'undefined' && BZ_NPCARR) ? BZ_NPCARR[String(npc)] : null;
handlers.js:2718:           if (A && A.length) inner.npcArr = clone(A);
handlers.js:2719:           env.log('ReqSelfBattleInfo npc=' + npc + (A ? '（已带 npcArr）' : '（无该 npc 数值，回模板）'));
handlers.js:2720:         }
handlers.js:2721:       }
handlers.js:2722:       return r;
handlers.js:2723:     },
```

- **读请求字段**：只读 `p.npcID`（`2710`）。注释记录客户端实际会发 `{npcID,isRmd,mp,gTime,hgtimes}`（`handlers.js:2703-2704`），但 handler 只解析 `npcID`，其余丢弃。
- **写存档槽**：**不写档**（本段无 `persist()`，无 `ensureLedger`）。
- **发奖励**：不发。这是开战前的准备查询口，不进钱包。
- **防重 / 每日限次**：无（纯查询）。
- **测试**：`test/battle-npc-arr.js:7/18/19`（口径注释）、`:51`（`inner()` 辅助）、`:81`（T3 回声 npcID）、`:89`（T4 npcArr 26 格）、`:99`（T5 未知 npc）、`:107`（T6 eRet 必须 1）；`test/l0-envelope.js:97/102`（信封 + 模板键 `reqSelfBattleInfo`）。另 `handlers.js:6688-6690` 自检 `battle:echoNpc`。

## B.3 GOOD_AND_EVIL_BATTLE_RESULT

**位置**：`handlers.js:5320-5323`（注释段 `5317-5319`）。

```
handlers.js:5317:     /** 善恶/正邪 PK 结算（GOOD_AND_EVIL_BATTLE_RESULT）。
handlers.js:5318:      *  客户端 `t.prestige.toString()` / `t.contribution.toString()` 直读 → 必须是数字。
handlers.js:5319:      *  ⚠ 不发奖（声望/贡献的发放口径要上游定，且请求里没有可校验键）。 */
handlers.js:5320:     goodAndEvilBattleResult: function () {
handlers.js:5321:       var v = { eRet: 1, prestige: 0, contribution: 0 };
handlers.js:5322:       return shaped('goodAndEvilBattleResult', v) || wrapped('goodAndEvilBattleResult', v, { achievement: ach() });
handlers.js:5323:     },
```

- **读请求字段**：**一个都不读**（函数签名无参数：`function ()`，`5320`）。
- **写存档槽**：**不写档**（无 `persist()`）。注：`s.contribution` 这个槽本身存在、缺省 0，由 `ensureLedger` 建立（`handlers.js:1119`），但本 handler 从不碰它。
- **发奖励**：**不发**（`5319` 明写；回包里 `prestige:0 / contribution:0` 是常量）。
- **防重 / 每日限次**：无（无状态）。
- **测试**：`test/c03-smoke.js:67`（注册名/线上名对照）、`test/c03-smoke.js:82` + `:145-150`（`prestige`/`contribution` 必须是 number）、`test/c03-smoke.js:170-184`（伪造战果不发奖断言，其中 `:179` 打这个动作、`:183` 断言 `contribution` 不被改写）。

## B.4 ROGUE_PVE_BATTLE_RESULT

**位置**：`handlers.js:5308-5315`（注释段 `5306-5307`）。

```
handlers.js:5306:     /** 肉鸽 PVE 结算（ROGUE_PVE_BATTLE_RESULT）。reqKeys: {npcID, win, pass, actionArr}。
handlers.js:5307:      *  ✅ 同 NewRoguePVPBattleResult：npcID 可校验 → 走 BZ_NPCDROP。 */
handlers.js:5308:     roguePveBattleResult: function (p) {
handlers.js:5309:       p = p || {};
handlers.js:5310:       var npc = parseInt(p.npcID, 10) || 0;
handlers.js:5311:       var win = (p.win === true) || (parseInt(p.win, 10) === 1);
handlers.js:5312:       var got = dropForNpc(win ? npc : 0, 'roguePveBattleResult');
handlers.js:5313:       var v = { eRet: 1, booksObj: {}, mapData2: {}, delTaskIds: [] };
handlers.js:5314:       return shaped('roguePveBattleResult', v) || wrapped('roguePveBattleResult', v, { achievement: ach() });
handlers.js:5315:     },
```

- **读请求字段**：`p.npcID`（`5310`）、`p.win`（`5311`）。注释说 reqKeys 还有 `pass` / `actionArr`（`5306`），**handler 未读取这两个**。失败时把 npc 传 0（`5312`），`dropForNpc` 随即在 `1912` 早退 → 不发奖。
- **写存档槽**：经 `dropForNpc` → `s.bag` / `s.playerEquip`（`1913`、`1919`），落盘 `persist()` @`1920`。
- **发奖励**：发，源为 `BZ_NPCDROP[npcID]`（`1914`）。**不入任何 `CURRENCY_SLOTS` 槽。**
- **防重 / 每日限次**：无（本段与 `dropForNpc` 内均无任何键/日期判断）。
- **测试**：`test/c03-smoke.js:66`（对照）、`:81`（`booksObj`/`mapData2`/`delTaskIds` 类型）、`:190` + `:186-193`（不存在的 npc 不发奖）。

## B.5 ROGUE_PVP_BATTLE_END

**位置**：`handlers.js:5297-5304`（注释段 `5294-5296`）。

```
handlers.js:5294:     /** 肉鸽 PVP 结算（ROGUE_PVP_BATTLE_END）。reqKeys: {npcID, win, pass, actionArr}。
handlers.js:5295:      *  ✅ 可安全发奖：有服务端可校验键 `npcID`，奖励取自 `BZ_NPCDROP[npcID]`，
handlers.js:5296:      *  与既有 CheckBattleResult **完全同一口径**（客户端数值一律不进钱包）。 */
handlers.js:5297:     NewRoguePVPBattleResult: function (p) {
handlers.js:5298:       p = p || {};
handlers.js:5299:       var npc = parseInt(p.npcID, 10) || 0;
handlers.js:5300:       var win = (p.win === true) || (parseInt(p.win, 10) === 1);
handlers.js:5301:       var got = dropForNpc(win ? npc : 0, 'NewRoguePVPBattleResult');
handlers.js:5302:       var v = { eRet: 1, delTaskIds: [], mapData2: {} };
handlers.js:5303:       return shaped('NewRoguePVPBattleResult', v) || wrapped('NewRoguePVPBattleResult', v, { achievement: ach() });
handlers.js:5304:     },
```

- **读请求字段**：`p.npcID`（`5299`）、`p.win`（`5300`）；`pass` / `actionArr` 未读。
- **写存档槽**：`s.bag` / `s.playerEquip`（经 `dropForNpc`，`1913`/`1919`），`persist()` @`1920`。
- **发奖励**：发，`BZ_NPCDROP[npcID]`（`1914`）。**不入任何 `CURRENCY_SLOTS` 槽。**
- **防重 / 每日限次**：无。
- **测试**：`test/c03-smoke.js:65`（对照）、`:80`（`delTaskIds`/`mapData2` 类型）、`:189` + `:186-193`（不存在的 npc 不发奖）。

## B.6 SERVER_ROGUE_NPC_BATTLE_END

**位置**：`handlers.js:5256-5263`（注释段 `5252-5255`）。

```
handlers.js:5252:     /** 肉鸽多人 PVP NPC 战斗结算（SERVER_ROGUE_NPC_BATTLE_END）。
handlers.js:5253:      *  reqKeys 取证：`index.js:105597-105602` `var e = { npcID: t.npcID, win: t.data[0] }` —— **有 npcID**。
handlers.js:5254:      *  ✅ v2.7 按上游口径接 `BZ_NPCDROP[npcID]`（与 CheckBattleResult 同一套：只认这个可校验键，
handlers.js:5255:      *  客户端自报的战果数值一律不进钱包）。 */
handlers.js:5256:     rogueBattleResult: function (p) {
handlers.js:5257:       p = p || {};
handlers.js:5258:       var npc = parseInt(p.npcID, 10) || 0;
handlers.js:5259:       var win = (p.win === true) || (parseInt(p.win, 10) === 1);
handlers.js:5260:       var got = dropForNpc(win ? npc : 0, 'rogueBattleResult');
handlers.js:5261:       var v = { eRet: 1 };
handlers.js:5262:       return shaped('rogueBattleResult', v) || wrapped('rogueBattleResult', v, { achievement: ach() });
handlers.js:5263:     },
```

- **读请求字段**：`p.npcID`（`5258`）、`p.win`（`5259`）。这是 v2.7 才接上 npcID 的（`5254`）。
- **写存档槽**：`s.bag` / `s.playerEquip`（`1913`/`1919`），落盘 `persist()` @`1920`。
- **发奖励**：发，`BZ_NPCDROP[npcID]`（`1914`）。**不入任何 `CURRENCY_SLOTS` 槽。**
- **防重 / 每日限次**：无。
- **测试**：`test/c03-smoke.js:62`（对照）、`:191` + `:186-193`（不存在的 npc 不发奖）、`:195-209`（专测"只认 npcID，客户端自报 award/exp/gold/coins 全部不进钱包"，`:204-208` 三条断言）。

## B.7 USER_PVP_OVER

**位置**：`handlers.js:5266-5269`（注释段 `5265`）。

```
handlers.js:5265:     /** PVP 战斗结束。USER_PVP_OVER，0 字段。同上：只回成功，不发奖。 */
handlers.js:5266:     NewPVPBattleResult: function () {
handlers.js:5267:       var v = { eRet: 1 };
handlers.js:5268:       return shaped('NewPVPBattleResult', v) || wrapped('NewPVPBattleResult', v, { achievement: ach() });
handlers.js:5269:     },
```

- **读请求字段**：**一个都不读**（`function ()`，`5266`）。
- **写存档槽**：**不写档**（无 `persist()`）。
- **发奖励**：**不发**（`5265` 明写"0 字段…只回成功，不发奖"；回包只有 `eRet:1`）。**不入任何 `CURRENCY_SLOTS` 槽。**
- **防重 / 每日限次**：无（无状态）。
- **测试**：`test/c03-smoke.js:63`（对照）、`:177` + `:170-184`（带 `award:999999/prestige:999999` 伪造战果 → 背包与银两必须不变）。

> B 部分要求的「可复用点清单」见下一节 `# 可复用点清单`。

---

# 可复用点清单

1. 结算族统一走一个入口 `dropForNpc(npc, tag)`，`tag` 只用于日志区分调用方 —— `handlers.js:1910-1926`。
2. `BZ_NPCDROP[npcID]` 是这套口径里**唯一**的可校验键；取不到就 `return null` 且记日志，不发奖 —— `handlers.js:1914-1918`。
3. 失败结算把 npc 传 0 即自动不发奖（`dropForNpc` 的 `1912` 早退） —— `handlers.js:5312`、`handlers.js:5301`、`handlers.js:5260`。
4. 掉落展开 `grantFromDrop`：概率 `>= 100` 必得，`< 100` 掷点 —— `handlers.js:1606`。
5. 随机源可注入 `env.random`，走 `rnd()`，测试可用固定种子把概率掉落变成确定用例 —— `handlers.js:1592-1594`。
6. 掉落结果按物品类型分两桶：`itemTypeOf(id) === 1` 进 `equips`，其余进 `items` —— `handlers.js:1608-1609`。
7. `grantItem` 是掉落唯一的写账函数：装备写 `s.playerEquip[id] = [1, 累加]`，其余写 `s.bag` —— `handlers.js:1389-1400`。
8. 掉落路径**不经过** `CURRENCY_SLOTS` / `grantCurrency`，所以结算奖励不会落进 gold/coins/exp/potential/yuanbao 任一槽 —— `handlers.js:1435-1441`、`handlers.js:1472-1481`、调用点仅 `1458/3995/5427/5741`。
9. 发完奖必须 `pushToClient(got.items, got.equips)`，且推的是存档**绝对值** —— `handlers.js:1556-1569`、调用点 `handlers.js:1921`、`handlers.js:2747`。
10. 每个写档 handler 自己调 `persist()`，落盘前过 `validateSave` + `guardSave`，不过则回滚内存 —— `handlers.js:960-973`。
11. 结算应答的既有字段口径：`win` = 布尔化战果、`rewardArray` = 非装备掉落 `{id:count}`、`equipObj` = `{id:[1,count]}` —— `handlers.js:2758-2767`。
12. 形状表（`BZ_SHAPES`）当"最低契约"，handler 缺的字段由 `fillShape` 补，并记进 `_lastFill` 供 provenance 断言 —— `handlers.js:6149-6163`。
13. 每个已实现动作必须在 `tools/shapes.json` 里 `impl: true`（对照组：A 部分 9 个键全为 `false` 或缺失） —— `tools/shapes.json:3093`（CheckBattleResult `impl: true`）。
14. 无 handler 动作的兜底顺序是 `H[action]` → `shaped()` → `ack()`，三段各有独立日志前缀（`dispatch` / `SHAPED` / `UNKNOWN`） —— `handlers.js:6202-6247`。
15. 请求原文留痕靠 `LOG_REQ_RE`，目前只覆盖 `ReqSelfBattleInfo|CheckBattleResult|acceptTask|getFinishTaskAward|killNpc|collect|obtainCrop` —— `handlers.js:6172`、落日志点 `handlers.js:6188-6193`。
16. 拒绝要留痕：`noteReject(action, reason, info)` 写 `save.meta.rejectStats`，键是 `action:reason` —— `handlers.js:531-536`。
17. 拒绝码按**原因**分、不按动作分，登记在 `REJECT_CODES`，并通过 `REJECT_ALLOW` 收窄应答键 —— `handlers.js:564-673`、`handlers.js:675-678`。
18. 账本差额守卫：`snapshotLedger()` 拍快照、`observeLedger()` 事后比对，`rewardArray` 必须能解释差额 —— `handlers.js:758-769`、`handlers.js:770-809`。
19. 全会文件里**只有两处**实现了"防重/每日限次"：`GetRandomEventAward` 按 `todayKey()` 跨天失效的 dupClaim —— `handlers.js:5395-5405`；`makeLove` 的每日 5 次上限 —— `handlers.js:5729-5738`。
20. `todayKey()` / `CIRCLE_DAILY_MAX` 的全部出现点只有 `1328/1331/1353/1355/1367/5395/5730`，B 部分 7 个结算 handler 一个都没用到 —— `handlers.js:1328-1370`。

---

# 未能验证

1. **无法确认 9 个键在真机上的实际请求参数**：未跑 adb / 模拟器，未读抓包；`test/` 里也没有任何一个用例打印过这些动作的请求体。
2. **无法确认 `tools/actions.json` 的 `httpConst` 映射就是线上唯一真相**：`handlers.js:5195` 指名它是映射表，`tools/shapes.json` 的 `constName` 也吻合，但生成器/消费者代码不在本任务允许读取的范围内，未读、未交叉验证第三种来源。
3. **无法确认 `tools/actions.json` 里 `actions`（`816` 起）与 `all`（`1630` 起）两个数组的语义**（是否"已实现清单"、是否"已知动作全集"）：该文件内没有自述字段，生成脚本未读。9 个线上名同时出现在这两个数组里（如 `1100-1104`、`1922-1924`），因此**不能**据此判断"是否已实现"。
4. **无法确认 `REJECT_CODES`（`handlers.js:564-673`）与 `tools/facts/reject-codes.json` 当前是否双向一致**：漂移断言在 `hotfix-patch/build-handlers.js`（`handlers.js:561` 注释提到），该文件不在本次允许读取范围内，未读、未跑。
5. **无法确认 `handlers.js:6698-6700` 的 `drop:dedup` 自检项当前是红还是绿**：未运行任何脚本/测试（任务禁止）。
6. **无法确认 `test/c03-smoke.js` / `drop-table.js` / `push-grants.js` / `battle-npc-arr.js` 是否被验收流程实际执行**：只读了文件内容，未见 golden / required-checks 清单（不在本次范围）。
7. **无法确认 9 个动作与任何奖励/掉落数据表有关联**：`BZ_NPCDROP` / `BZ_DROP` 均按 `npcID` 索引，不按动作名索引（`handlers.js:1914`、`handlers.js:1598`）；本工程内没找到"动作名 → 奖励表"的映射。就本次所读文件而言：**没找到**。
8. **无法确认 A 部分 3 个 `UNKNOWN` 动作（`MPPVE_ACTION` / `ROGUE_MPPVE_ACTION` / `START_MPPVE_BATTLE`）的客户端消费点**：这三个名字在 `handlers.js`、`tools/shapes.json`、`test/` 三处都 0 命中，客户端源码 `tools/index.js` 不在允许范围内，未查。
9. **不在该文件**：`USER_PVP` 与 `USER_PVP_OVER` 是两个不同键，`handlers.js` 里没有任何一处以 `USER_PVP` 单独作为键（grep `USER_PVP` 仅命中 `5188`、`5265`，均为 `USER_PVP_OVER` 的子串）。

---

# 范围外发现

1. **任务书给的驼峰命名规律与仓库实际映射不符，按那个规律注册会静默落 UNKNOWN。**
   任务书写 `PVE_ACTION → User.pveAction`；但 `tools/actions.json:287` 写的是 `"PVE_ACTION": "User.beginPVEBattle"`，`tools/shapes.json:6773` 的 `constName` 独立印证同一对。grep `pveAction|roguePveAction|reqLanghuanCombat|reqRoguePveCombat|mppveAction|rogueMppveAction|reqRoguePvpBattle|startMppveBattle|userPvp` 在 `handlers.js` 与 `tools/shapes.json` 均 **0 命中**。而 `handlers.js:5185-5194` 正是记录这个老坑的注释："线上名 ↔ 注册名 大面积错位…照注册名注册会静默落进 SHAPED/UNKNOWN"。

2. **`selfCheck` 里 `drop:dedup` 的断言与 handler 注释、与 `test/drop-table.js` 的断言互相矛盾（未运行，无法判断哪边是当前事实）。**
   - `handlers.js:6698-6700` 断言两次 `CheckBattleResult` 后 `playerEquip` 必须完全相同（项名 `drop:dedup`），且 `handlers.js:6693` 注释仍写"5 秒去重窗口（自检里 env.now 固定，所以第二次结算必然命中窗口）"。
   - 但 handler 注释 `handlers.js:2727-2731` 说"**不再做 5 秒去重**"，且代码里确实没有任何时间去重。
   - `test/drop-table.js:64` 的 T3 标题是"**不去重：两次赢就发两次**"，`:71` 断言"第二场也该发（旧版 5 秒窗口会吞掉）"。
   - 按 `grantItem` 的累加语义（`handlers.js:1394-1396`），npc 2005 必得 1301×1 连打两次会变成 `[1,2]`。**未运行任何测试，故不判断 `drop:dedup` 现在是红是绿。**

3. **`BZ_SHAPES` 的默认形状会把 npcID 写死成 310003。** `handlers.js:106`（beginPVEBattle，无 npcID）、`handlers.js:161`（enterMultiPVEBattle `npcID:310003`）、`handlers.js:163`（enterPVEBattle `npcID:310003`）、`handlers.js:164`（enterRoguePVEBattle `npcID:310003`）。A 部分 6 个落 `SHAPED` 的动作里，3 个会原样发出这个固定 npcID（`npcID` 不在 `LEDGER_FIELDS` 里，不会被真实值改写，见 `handlers.js:6082`、`handlers.js:6091-6098`）。

4. **`enterPVEBattle` / `enterMultiPVEBattle` 的形状里带写死的 `"gold":99999`，但它会被账本值改写。** `handlers.js:163`、`handlers.js:161` 的形状里 `gold` 是 99999；`LEDGER_FIELDS` 定义了 `userGold/curGold → gold`（`handlers.js:6082`），`shaped()` 在 `handlers.js:6091-6098` 用存档值覆盖。即这两个 SHAPED 应答里的 `gold` 不等于字面量，取值来自 `s.gold`（缺省 99999，见 `handlers.js:1115`）。

5. **`BZ_SHAPES.__impl`（`handlers.js:353`）不含 A 部分 9 个线上名中的任何一个。** 该数组是"实现过的动作"名单，A 部分 9 个键一个都不在里面：grep `beginPVEBattle|enterPVEBattle|beginRoguePVEBattle|enterRoguePVEBattle|ChallengePVP|ChallengeRoguePVP` 在 `handlers.js` 仅命中 `29/30/106/108/163/164/355`（若把模式放宽到含 `enterMultiPVEBattle`，再加一条 `161`），**没有一条落在 `353` 行**。

6. **`INIT_MPPVE_BATTLE`（`enterMultiPVEBattle`）是 MPPVE 家族里唯一在形状表里有条目的键，但它不在任务给的 9 个键里。** `handlers.js:161` 有形状；`tools/shapes.json:9297-9303` 为 `constName: INIT_MPPVE_BATTLE` + `impl: false`；`tools/actions.json:288` 映射到 `User.enterMultiPVEBattle`。同一家族里 `MPPVE_ACTION` / `START_MPPVE_BATTLE` / `ROGUE_MPPVE_ACTION` 三个键则在形状表里**完全不存在**。

7. **`handlers.js:5188` 的注释把 `USER_PVP_OVER` 指到 `NewPVPBattleResult`，这解释了为什么 grep `USER_PVP` 会命中它。** 即：`USER_PVP`（开战，`ChallengePVP`，`tools/actions.json:17`）与 `USER_PVP_OVER`（结算，`NewPVPBattleResult`，`tools/actions.json:18`）是相邻的两行不同键，不可混为一条。
