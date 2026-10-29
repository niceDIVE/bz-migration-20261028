# 验收工人报告（batch6-facts-20261026）

- 工作目录：F:\BaoZouyxt
- 开工时间：见命令执行记录
- 执行范围：仅下列 13 条命令，失败不重跑，不改任何文件。

## 命令执行记录

### 1. `node tools\gen_shop_tables.js`
- 命令原文：`node tools\gen_shop_tables.js`（工作目录 F:\BaoZouyxt）
- 退出码：0
- 关键输出（末 3 行）：
```
SHOPS OK  bytes=265217  -> F:\BaoZouyxt\hotfix-patch\core\bz-shops.generated.js
  inn=8 sect=13 mall=39 mount=72 tls=8 formula=274 passTiers=12 passLevels=4 passEnd=1790006399000 gfTiers=22 circleTiers=21 adventureRows=109 achCond=2113 proposeNpcs=36 makeTiers=5
  circle_task 解码样本：1→{m:125,e:50,p:50,lo:1,hi:30,talk:19,fight:14,item:12}  21→{m:2575,e:1030,p:1030}
```

### 2. `cd hotfix-patch` 然后 `node build-handlers.js`
- 命令原文：`cd F:\BaoZouyxt\hotfix-patch` + `node build-handlers.js`
- 退出码：0
- 关键输出：
```
HANDLERS OK  ver=hb6cbc053  selfCheck=1284  bytes=1418867  -> patch/live/handlers.js
FLOW     OK  bytes=17862  -> patch/live/flow.js
```

### 3. `node tools\check_shape_freeze.js`
- 命令原文：`node tools\check_shape_freeze.js`（工作目录 F:\BaoZouyxt）
- 退出码：0
- 关键输出（末 3 行）：
```
  note  C13 固定时钟 2 个、全部已登记用途（主时钟 1792612412000 共 50 处）
✅ C1–C8、C10–C13 全部通过（C9b 未实现）
```

### 4. `node tools\acceptance.js`
- 命令原文：`node tools\acceptance.js`（工作目录 F:\BaoZouyxt）
- 退出码：0
- 关键输出（汇总行）：
```
PASS K-cap 条目=0 ≤ cap=0
PASS K-cap 未扩容（历史最低 cap=0 → 本次 0）
PASS G3 无滞留条目（history 行=69，最长连续=0）
PASS G5 未扩容（cap 0 → 0），无需 guardHash 复核
ACCEPTANCE OK 项=45 绿=45 已知红=0 cap=0
```

### 5. `node tools\check_reject_codes.js`
- 命令原文：`node tools\check_reject_codes.js`（工作目录 F:\BaoZouyxt）
- 退出码：0
- 关键输出（末 3 行）：
```
R5c 见 test\r14-catch-smoke.js
R5 未实现（下一批：动作×原因夹具 + 磁盘/业务双哈希）
REJECT-CODES OK 动作=65 条目=73 拒绝点=98 处 flow=1 条
```

### 6. `node hotfix-patch\test\c04-smoke.js`
- 命令原文：`node hotfix-patch\test\c04-smoke.js`（工作目录 F:\BaoZouyxt）
- 退出码：0
- 关键输出（末 3 行）：
```
  ok   LoadGame 回放：结婚状态投射回 base.marryObj

[c04-smoke] 通过 9/9
C04 SMOKE PASSED
```

### 7. `node hotfix-patch\test\v271-smoke.js`
- 命令原文：`node hotfix-patch\test\v271-smoke.js`（工作目录 F:\BaoZouyxt）
- 退出码：0
- 关键输出（末 3 行）：
```
  ok   【拍板3】received 保留：已领的成就重算后不回 pending

[v271-smoke] 通过 15/15
V271 SMOKE PASSED
```

### 8. `node hotfix-patch\test\achieve-data.js`
- 命令原文：`node hotfix-patch\test\achieve-data.js`（工作目录 F:\BaoZouyxt）
- 退出码：0
- 关键输出（末 3 行）：
```
  ok   T5 重算结果落盘，且成就账本幂等
  ok   T6 白拿回归：持有收集品才进 pending（137 = require "0|2601"）

[achieve] PASS  6/6
```

### 9. `node hotfix-patch\test\c16-smoke.js`
- 命令原文：`node hotfix-patch\test\c16-smoke.js`（工作目录 F:\BaoZouyxt）
- 退出码：0
- 关键输出（末 3 行）：
```
  ok   getAchieveMark 回 eRet:1 且不动档（纯查询）
  ok   getAchieveData 仍能开面板（本批没动它，防止连带回归）

[c16-smoke] 通过 10/10
C16 SMOKE PASSED
```

### 10. `node hotfix-patch\test\circle-task.js`
- 命令原文：`node hotfix-patch\test\circle-task.js`（工作目录 F:\BaoZouyxt）
- 退出码：0
- 关键输出（末 3 行）：
```
  ok   quickFinishTask 对环任务正常扣 50 元宝并发表值奖励
  ok   真正无奖励的 id 仍不许扣元宝（保护闸保留）

[circle-task] 通过 15/15
CIRCLE-TASK SMOKE PASSED
```

### 11. `node hotfix-patch\test\c03-smoke.js`
- 命令原文：`node hotfix-patch\test\c03-smoke.js`（工作目录 F:\BaoZouyxt）
- 退出码：0
- 关键输出（末 3 行）：
```
  ok   rogueBattleResult 只认 npcID（v2.7 新接线）：客户端自报的战果数值绝不进钱包

[c03-smoke] 通过 11/11
C03 SMOKE PASSED
```

### 12. `node hotfix-patch\test\c02-smoke.js`
- 命令原文：`node hotfix-patch\test\c02-smoke.js`（工作目录 F:\BaoZouyxt）
- 退出码：0
- 关键输出（末 3 行）：
```
  ok   【堵口·任意 id】delegateTask 不许把"不是任务"的数字塞进 accepted
  ok   环任务 id 仍可正常接（堵口不能把环任务本身堵死）

[c02-smoke] 通过 19/19
C02 SMOKE PASSED
```

### 13. `node hotfix-patch\test\c05-smoke.js`
- 命令原文：`node hotfix-patch\test\c05-smoke.js`（工作目录 F:\BaoZouyxt）
- 退出码：0
- 关键输出（末 3 行）：
```
  ok   肉鸽背包空后 rgUseItem 回 eRet:4 且不动档

[c05-smoke] 通过 16/16
C05 SMOKE PASSED ✅
```

## 汇总
| # | 命令 | 退出码 |
|---|------|--------|
| 1 | node tools\gen_shop_tables.js | 0 |
| 2 | node build-handlers.js (hotfix-patch) | 0 |
| 3 | node tools\check_shape_freeze.js | 0 |
| 4 | node tools\acceptance.js | 0 |
| 5 | node tools\check_reject_codes.js | 0 |
| 6 | node hotfix-patch\test\c04-smoke.js | 0 |
| 7 | node hotfix-patch\test\v271-smoke.js | 0 |
| 8 | node hotfix-patch\test\achieve-data.js | 0 |
| 9 | node hotfix-patch\test\c16-smoke.js | 0 |
| 10 | node hotfix-patch\test\circle-task.js | 0 |
| 11 | node hotfix-patch\test\c03-smoke.js | 0 |
| 12 | node hotfix-patch\test\c02-smoke.js | 0 |
| 13 | node hotfix-patch\test\c05-smoke.js | 0 |

## 未验证段：无

## 范围外产出：无

（注：第 1、2 条命令自身按其设计输出了生成文件 bz-shops.generated.js、patch/live/handlers.js、patch/live/flow.js，属列明命令的既有行为，非工人追加动作。）
