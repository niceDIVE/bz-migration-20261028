# C15〔七日回归〕批次门禁 — 复跑验收报告（工人档）

- 执行者：验收工人档（纯体力，只做列明机械动作）
- 执行时间：2026-10-27
- 工作区：F:\BaoZouyxt
- 方式：逐条独立复跑，原文照抄命令、退出码与关键输出；不做判断/分析/建议

---

## 结论表

| 条目 | 命令（工作目录） | 退出码 | 末行关键输出 | 与期望 |
|---|---|---|---|---|
| T1 | `node tools\acceptance.js`（F:\BaoZouyxt） | 0 | `ACCEPTANCE OK 项=55 绿=55 已知红=0 cap=0` | 一致 |
| T2 | `node test\c15-smoke.js`（hotfix-patch） | 0 | `c15-smoke: 全部通过（10 条）` | 一致 |
| T3 | `node test\c14-smoke.js`（hotfix-patch） | 0 | `c14-smoke: 全部通过（11 条）` | 一致 |
| T4a | `node test\c13-smoke.js`（hotfix-patch） | 0 | `c13-smoke: 全部通过（9 条）` | 退出码 0，一致 |
| T4b | `node test\c12-smoke.js`（hotfix-patch） | 0 | `c12-smoke: 全部通过（14 条）` | 退出码 0，一致 |
| T4c | `node test\c11-smoke.js`（hotfix-patch） | 0 | `c11-smoke: 全部通过（14 条）` | 退出码 0，一致 |
| T4d | `node test\c10-smoke.js`（hotfix-patch） | 0 | `c10-smoke: 全部通过（18 条）` | 退出码 0，一致 |
| T4e | `node test\r14-catch-smoke.js`（hotfix-patch） | 0 | `[r14-catch-smoke] PASS  3/3` | 退出码 0，一致 |
| T5 | `node tools\check_shape_freeze.js --diff`（F:\BaoZouyxt） | 0 | `diff 总数 = 0` | 一致 |
| T6 | `node tools\check_reject_codes.js`（F:\BaoZouyxt） | 0 | `REJECT-CODES OK 动作=128 条目=145 拒绝点=220 处 flow=1 条` | 一致 |
| T7 | `Get-FileHash -Algorithm MD5` ×2 + `Select-String -Pattern 'IMPL_VERSION'` | 0（命令均成功） | MD5 见下表；`var IMPL_VERSION = "h45035127";` | 已取得 |

**汇总：10 条执行项全部退出码 0，末行输出与工单期望一致。**

---

## T1

- 工作目录：F:\BaoZouyxt
- 命令原文：`node tools\acceptance.js`
- 退出码：**0**
- 关键输出（末 6 行原文）：

```
PASS K-cap 条目=0 ≤ cap=0
PASS K-cap 未扩容（历史最低 cap=0 → 本次 0）
PASS G3 无滞留条目（history 行=113，最长连续=0）
PASS G5 未扩容（cap 0 → 0），无需 guardHash 复核
history 追加：tools/golden/known-red-history.jsonl seq=114 entries=0 entriesHash=da39a3ee5e6b… guardVer=2 prev=da39a3ee5e6b…
ACCEPTANCE OK 项=55 绿=55 已知红=0 cap=0
```

- 末行与期望比对：期望 `ACCEPTANCE OK 项=55 绿=55 已知红=0 cap=0` — 实测一致。
- 附观察（原文照抄）：该命令自身输出含 `history 追加：tools/golden/known-red-history.jsonl seq=114`（命令自带行为，非本人写入）。

---

## T2

- 工作目录：F:\BaoZouyxt\hotfix-patch
- 命令原文：`node test\c15-smoke.js`
- 退出码：**0**
- 关键输出（末 6 行原文）：

```
  ok   【⑤】七日全部领完 → 2（claimed）
  ok   【⑥】getReturnTaskData：11 任务诚实 0 状态 + liveness 0
  ok   【⑦】领取拒绝：任务 / 活跃度 / 礼包 → 2 且不写档
  ok   【⑧】礼包纯展示：3 档 isBuy 0 / isAward 0；refresh 空数组
  ok   【⑨】拒绝应答收窄：只 eRet
c15-smoke: 全部通过（10 条）
```

- 末行与期望比对：期望 `c15-smoke: 全部通过（10 条）` — 实测一致。

---

## T3

- 工作目录：F:\BaoZouyxt\hotfix-patch
- 命令原文：`node test\c14-smoke.js`
- 退出码：**0**
- 关键输出（末 6 行原文）：

```
  ok   【⑥】FeedDog 喂满：progress 封顶 10000 + bigDog 升级
  ok   【⑦】FeedDog 已满：再喂 → 2（full），不写档
  ok   【⑧】DogBattleResult：桥接 win + endTime + 狗状态回健康
  ok   【⑨】拒绝应答收窄：REJECT_ALLOW=[] → 拒绝应答只有 eRet
  ok   【⑩】新档缺 s.bag：FeedDog 不抛错、回 2、不写档（上游验收小修回归）
c14-smoke: 全部通过（11 条）
```

- 末行与期望比对：期望 `c14-smoke: 全部通过（11 条）` — 实测一致。

---

## T4

- 工作目录：F:\BaoZouyxt\hotfix-patch
- 命令原文（五条，各自独立执行，逐条取退出码）：

```
node test\c13-smoke.js
node test\c12-smoke.js
node test\c11-smoke.js
node test\c10-smoke.js
node test\r14-catch-smoke.js
```

| 命令 | 退出码 | 最后一行原文 |
|---|---|---|
| `node test\c13-smoke.js` | 0 | `c13-smoke: 全部通过（9 条）` |
| `node test\c12-smoke.js` | 0 | `c12-smoke: 全部通过（14 条）` |
| `node test\c11-smoke.js` | 0 | `c11-smoke: 全部通过（14 条）` |
| `node test\c10-smoke.js` | 0 | `c10-smoke: 全部通过（18 条）` |
| `node test\r14-catch-smoke.js` | 0 | `[r14-catch-smoke] PASS  3/3` |

- 期望：各自退出码 0 — 实测五条全部为 0。

---

## T5

- 工作目录：F:\BaoZouyxt
- 命令原文：`node tools\check_shape_freeze.js --diff`
- 退出码：**0**
- 关键输出（该命令全部有效输出仅 1 行，原文）：

```
diff 总数 = 0
```

- 末行与期望比对：期望 `diff 总数 = 0` — 实测一致。

---

## T6

- 工作目录：F:\BaoZouyxt
- 命令原文：`node tools\check_reject_codes.js`
- 退出码：**0**
- 关键输出（末 6 行原文）：

```
信息 动作=128 条目=145（reject=144 flow=1）
信息 R5b+ 扫描 handler=264 拒绝点=220 处（涉及 120 个动作）动态 eRet=0 处
R5c 见 test\r14-catch-smoke.js
R5 未实现（下一批：动作×原因夹具 + 磁盘/业务双哈希）
REJECT-CODES OK 动作=128 条目=145 拒绝点=220 处 flow=1 条
```

- 末行与期望比对：期望 `REJECT-CODES OK 动作=128 条目=145 拒绝点=220 处 flow=1 条` — 实测一致。

---

## T7

- 工作目录：F:\BaoZouyxt（路径均按工单指定，位于 hotfix-patch 下）
- 命令原文：

```powershell
Get-FileHash -Algorithm MD5 -Path "F:\BaoZouyxt\hotfix-patch\core\bz-rpc-server.js"
Get-FileHash -Algorithm MD5 -Path "F:\BaoZouyxt\hotfix-patch\patch\live\handlers.js"
Select-String -Path "F:\BaoZouyxt\hotfix-patch\patch\live\handlers.js" -Pattern 'IMPL_VERSION'
```

- 退出码：0（三条命令均正常返回，无报错）

### MD5

| 文件 | 算法 | MD5 |
|---|---|---|
| `F:\BaoZouyxt\hotfix-patch\core\bz-rpc-server.js` | MD5 | `DAA5DBEA41111165489F49649A49683A` |
| `F:\BaoZouyxt\hotfix-patch\patch\live\handlers.js` | MD5 | `4CA4553905D649A0B7D43A25AC2DEC7A` |

### IMPL_VERSION 定义行

```
hotfix-patch\patch\live\handlers.js:5:var IMPL_VERSION = "h45035127";
```

版本号：**h45035127**（定义于第 5 行）。

---

## 附：执行边界自述

- 写入文件：仅本报告 `F:\BaoZouyxt\batch16-facts-20261027\verify-c15-worker.md`。
- 执行命令：仅工单列明的 node 只读门禁命令，以及 Get-FileHash / Select-String。
- 未执行 git、未联网、未写/删/移任何其他文件、未执行任何数据销毁级命令。

---

未验证段：无

范围外产出：无
