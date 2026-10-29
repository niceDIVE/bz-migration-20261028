# C8 · 第 9 批 C08〔PVE 战斗族〕执行记录（2026-10-27）

> 策略见 `C7-c08-取证与策略.md`；契约逐行见 `scoutG-c08-reqkeys.md`；线上现状见 `scoutH-c08-existing.md`。
> 用户拍板：**档 A**（单人 PVE 4 个做满 + `USER_PVP` 优雅拒 + 其余 4 个保留未实现）＋ **`attArr` 回空**。

---

## 一、改了什么（文件 · 行号）

| 文件 | 改动 |
|---|---|
| `hotfix-patch\core\bz-rpc-server.js` | 新增模块级 helper：`asInt` / `buildAttckData` / `buildNpcArr` / `BATTLE_FALLBACK_NPC` / `pickBattleNpc` / `battleSeed`（都在 `var H = {` 之前，避开"对象字面量里写 function"的老坑）；`goodAndEvilBattleResult` 之后新增 5 个 handler；`REJECT_CODES` 加 `ChallengePVP:{default:3}` |
| `tools\facts\reject-codes.json` | 新增 `ChallengePVP` 条目（defaultCode 3 / promptOnly [3] / tier 1 / ev `index.js:59505#1548bacc`） |
| `hotfix-patch\test\c08-smoke.js` | **新增**，11 条断言（见 §四） |
| `hotfix-patch\test\r18-unreachable.js` | T6 白名单新增 `/a\.baseValueAy = ay;/` 一条（带理由注释） |
| `tools\golden\*` | `planned-changes.json`（71 条规则，已归档）→ `--freeze` 后 `emission.json` / `evidence-sha1.json` / `expected-stats.json` / `shapes-normalized.sha1` 重写 |
| `docs\OPEN-ISSUES.md` | 新增 **ISSUE-8「整套玩法被锁」清单**（上游第 8 批验收指定登记） |

产物：`hotfix-patch\patch\live\handlers.js`（build-handlers.js 生成，**不许手改**——本轮踩过：先误改了它，已从备份还原再改 `core\`）。

---

## 二、5 个动作的处置（逐条带证据）

| 线上名 | 处置 | 关键证据 |
|---|---|---|
| `enterPVEBattle`（REQ_LANGHUAN_COMBAT） | **实现**：`eRet 1` + AttckData（本档）+ `npcArr`（BZ_NPCARR）+ npcID 回声 + `attArr []` + `gold 0` + `randSeed` 每场不同 | 回调 index.js:98832-98851；请求 67548/67554；generateNpcData 8093-8137 |
| `beginPVEBattle`（PVE_ACTION） | **实现**：纯回声 `action/paramID/paramID1/paramID2` + `attArr []` | 回调 98852-98904（`switch(o.action)` 98878-98901）；请求 98943 |
| `enterRoguePVEBattle`（REQ_ROGUE_PVE_COMBAT） | **实现**：同上 + `rogueHp/rogueHpLimit/rogueMp`（取请求报的战场血）+ `exchangeNpcArr []` | 回调 104129-104191；请求 104252 + 104248-104250 |
| `beginRoguePVEBattle`（ROGUE_PVE_ACTION） | **实现**：纯回声 | 回调 104192-104239（switch 104208-104238）；请求 104460 |
| `ChallengePVP`（USER_PVP） | **拒绝 eRet 3**（应答收窄到只有 `eRet`） | 回调 101326-101342：`else if (3 === o.eRet)` → Alert(getText 1399) + dispose |
| `ChallengeRoguePVP` / `beginMultiPVEBattle` / `beginRogueMultiPVEBattle` / `startMultiPVEBattle` | **保留未实现**（SHAPED/UNKNOWN 兜底） | 前一个要真人对手；后三个要服务端多人回放（`playWithData`）；eRet≠1 分支全空（104102 / 110871 / 110877 / 105259）→ 卡界面，登记进 ISSUE-8 等入口批次 |

---

## 三、两个"原故障重现"点（本轮真正修掉的东西）

1. **空 `npcArr` 会崩**：`generateNpcData`（index.js:8093-8137）裸读 `t[14]`→`o.jineng`，8118 立刻 `u.getItem(o.jineng[0],"skill")`
   ⇒ `npcArr:[]` 必抛 TypeError。原 SHAPED 兜底正是 `npcArr:"[]"`（只是没人走到琅嬛/肉鸽）。
   现在：未知/缺失 npcID → `pickBattleNpc` 退回 **310003**（npc_stats 里真实存在、25 项），并大声记日志。
2. **`npcID` 恒 310003**：以前打谁都是同一只；现在客户端报什么就回什么（琅嬛/肉鸽两个发送点都带 npcID）。
3. **`attArr:[]` 的安全性**是核对过的，不是猜的：所有读点都在 `length > 0` 守卫里（98855 / 104183 / 104195），
   空数组 ⇒ 两侧 `serverHp=0/serverHpLimt=1`；而 `serverHp` 只是"保命血"（11668-11673），不覆盖本地血量。

---

## 四、闸门结果

| 项 | 结果 |
|---|---|
| build | ver=**h744ad0f4**，selfCheck **1286** 全过，bytes=1,453,214 |
| 形状冻结 | 差异 309 项（236 add / 7 del / 6 value）→ 71 条 planned 规则 → `--freeze` → **diff 0**；C1–C8、C10–C13 全过 |
| acceptance | **48/48** 绿（比上轮 +1 = c08-smoke），known-red 0，cap 0 |
| c08-smoke | **11/11** |
| reject-codes | 动作 77 / 条目 91 / 拒绝点 113，OK |
| 部署 | 热重载 pid 2655 **不变**；`ver` → `impl=h744ad0f4 / flow=ffaec47c3 / implErr=null` |
| 发奖口 | **0**（5 个动作不写存档、不动钱包；c08-smoke ⑩ 逐字节 + 钱包快照） |

---

## 五、踩坑与纠正

1. **改错了文件**：`patch\live\handlers.js` 是 `build-handlers.js` 的**产物**（源 = `core\bz-rpc-server.js` + `core\bz-handler-impl.js` + 三个 generated）。
   我先改了产物 → build 时报「拒绝码表动作集合漂移」（构建期拿 JSON 对比旧产物）→ 从 `_backup\20261027-013103-pre-c08\` 还原产物，再改 `core\`。
   **教训：动手前先确认"源 vs 产物"。**
2. **PowerShell `>` 重定向把 diff 写成 UTF-16LE**：`node ... --diff > file` 出来的文件首字节 `FF FE`，node 按 UTF-8 读 → 全文件一行、正则 0 命中。
   改为 `Out-String` 收集后 `[System.IO.File]::WriteAllText(..., UTF8Encoding($false))`。（老坑新形态，写进坑表）
3. **`r18-unreachable` T6 判红**：`a.baseValueAy = ay;` 撞"整包接收请求数组"白名单。
   处理不是绕过：先删掉原来"把请求 mp/gTime/hgtimes 写进 baseValueAy[29]/[36]/[42]"那三行（请求值不进属性载体），
   再给白名单加一条并写清"ay 只由 `normalizeBaseValueAy(clone(s.baseValueAy))` 派生"。
4. **形状审批的量级**：AttckData 展开后 236 条新增路径，靠手写不现实 → 写一次性生成器（`batch9-facts-20261027\tmp_gen_c08_approvals.js`）从 diff 生成到 planned-changes。

---

## 六、未验证 / 遗留

1. **可达性**：琅嬛（`LangHMode.startBattle` 唯一调用点 index.js:138298）与肉鸽入口的前置条件未查 —— 本档存档能不能真的走到这两个开局，本轮**没验**（只验了协议层）。
2. **装备快照**：AttckData 的 `equips/equipments/gemData/titivate*` 仍是抓包快照值（要 `parseEq` 实例格式），战斗数值按快照装备算。
   本档的 `s.equipments/s.playerEquip` 与它对不上时，战斗里穿的不是你身上的那套。**需装备快照口径后再改。**
3. **PVP 文案 1399**：`getText(1399)` 的原文离线读不到（没有 lang 表 dump），只知道它是客户端自带字符串。
4. **`drop:dedup` 自检与注释互相矛盾**（scoutH 提的，范围外）：handlers.js 6698-6700 断言两次结算结果相同，而 handler 注释与 `test\drop-table.js:64` 说"两次赢发两次"。**本轮未动**，留在 ISSUES。
5. 真机只走了协议层（`ver` + 热重载），**没有进战斗界面实打** —— 本档存档要到琅嬛/肉鸽有成本，等可达性确认后再做一次端上实测。

---

## 七、真机探针（6 发，走设备上真实 `H.impl.handle`，不是 node harness）

做法（踩了两个坑才通，记下来）：
- 命令通道 `get:<expr>` 的 eval **拿不到** `window.__BZ_OFFLINE__`（jsb 适配器作用域里 `window` 是壳），但**能拿到 bootstrap 闭包的 `H`**；
- `H.impl.handle` 的签名是 **`handle({url, body})`**（不是 `(body, url)`，第一次探针因此回了 `action=blackhole`）；
- 载荷要按设备端同款编码（AES-256-CBC + lz-string，KEY/IV 见 `build-handlers.js:189-190`），
  由 `batch9-facts-20261027\tmp_encode_rpc.js` 生成 hex → 塞进 `get:` 里喂 `handle({url:'https://bzgf.maple-game.com/900-server-166/x', body:'<hex>'})`。

| # | 请求 | 结果 |
|---|---|---|
| 1 | `enterPVEBattle {npcID:1001}` | `action=User.enterPVEBattle`，日志 `npcID=1001 npcArr=26 项（AttckData 已换本档 baseValueAy roleID=16374）` |
| 2 | `beginPVEBattle {action:1,paramID:2001,paramID1:1,paramID2:16374}` | `action=User.beginPVEBattle`，505 B |
| 3 | `enterRoguePVEBattle {npcID:1001,hp:321,hplimit:400,mp:55}` | 日志 `npcID=1001 npcArr=26 项 报血 hp=321/400 mp=55` |
| 4 | `beginRoguePVEBattle {action:3,...}` | `action=User.beginRoguePVEBattle`，505 B |
| 5 | `ChallengePVP {otherRoleID:12345,...}` | 日志 `⚠ REJECT ChallengePVP reason=noHumanOpponent` |
| 6 | `enterPVEBattle {npcID:999999}` | 日志 `⚠ 请求 npcID=999999 不在 npc_stats 里 → 退回兜底怪 310003（26 项）`，随后 `npcID=310003（兜底）` |

**存档零写入（真机硬证据）**：探针前后 `md5sum .../bz_offline_save.json` **完全相同**
（`e4d18ab875af8f5707a8b8ef9c8e4a3c`，before = after）。

