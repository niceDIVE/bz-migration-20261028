# v2.7.1 验收工人报告

- 工人：工程苦力（子代理）
- 工作目录：F:\BaoZouyxt（仅第 2 条 cd 到 F:\BaoZouyxt\hotfix-patch）
- 开工时间：2026-10-26 18:18:09
- 执行方式：PowerShell 每条命令独立取 $LASTEXITCODE
- 命令总数：12

---

## 1. node tools\gen_shop_tables.js

- 工作目录：F:\BaoZouyxt
- 退出码：0
- 关键输出（尾部）：
```
SHOPS OK  bytes=263547  -> F:\BaoZouyxt\hotfix-patch\core\bz-shops.generated.js
  inn=8 sect=13 mall=39 mount=72 tls=8 formula=274 passTiers=12 passLevels=4 passEnd=1790006399000 gfTiers=22 circleTiers=21 adventureRows=109 achCond=2113
  circle_task 解码样本：1→{m:125,e:50,p:50,lo:1,hi:30,talk:19,fight:14,item:12}  21→{m:2575,e:1030,p:1030}
```
- 备注（记录位置，不作分析）：本命令自身写出 F:\BaoZouyxt\hotfix-patch\core\bz-shops.generated.js（命令自带行为）。

---

## 2. cd hotfix-patch 然后 node build-handlers.js

- 工作目录：F:\BaoZouyxt\hotfix-patch
- 退出码：0
- 关键行（HANDLERS OK 行）：
```
HANDLERS OK  ver=h5ae2ccb6  selfCheck=1264  bytes=1398677  -> patch/live/handlers.js
FLOW     OK  bytes=17862  -> patch/live/flow.js
```

---

## 3. cd F:\BaoZouyxt 然后 node tools\check_shape_freeze.js

- 工作目录：F:\BaoZouyxt
- 退出码：0
- 关键输出（尾部）：
```
  note  C9a 查表键超集 371 个字段（已落盘 tools/facts/lookup-keys.json）；其中属"跨动作继承"的 47 项在 C9b 通过前**不许清**（B5 批次），样本：BeginSaveNpc.npcID , BeginTraining.skillID , BuyMount.type , ChallengePVP.AttckData , ChallengeRoguePVP.AttckData
  note  C9b 查表键取值合法性：未实现（表名为变量的项标未定）
  note  C13 固定时钟 2 个、全部已登记用途（主时钟 1792612412000 共 48 处）
✅ C1–C8、C10–C13 全部通过（C9b 未实现）
```

---

## 4. node tools\acceptance.js

- 工作目录：F:\BaoZouyxt
- 退出码：0
- 最后汇总行：
```
ACCEPTANCE OK 项=44 绿=44 已知红=0 cap=0
```

---

## 5. node tools\check_reject_codes.js

- 工作目录：F:\BaoZouyxt
- 退出码：0
- 关键输出（尾部）：
```
R5 未实现（下一批：动作×原因夹具 + 磁盘/业务双哈希）
REJECT-CODES OK 动作=47 条目=51 拒绝点=77 处 flow=1 条
```

---

## 6. node hotfix-patch\test\v271-smoke.js

- 工作目录：F:\BaoZouyxt
- 退出码：0
- PASS 行：
```
[v271-smoke] 通过 13/13
V271 SMOKE PASSED
```

---

## 7. node hotfix-patch\test\achieve-data.js

- 工作目录：F:\BaoZouyxt
- 退出码：0
- PASS 行：
```
[achieve] PASS  6/6
```

---

## 8. node hotfix-patch\test\c16-smoke.js

- 工作目录：F:\BaoZouyxt
- 退出码：0
- PASS 行：
```
[c16-smoke] 通过 10/10
C16 SMOKE PASSED
```

---

## 9. node hotfix-patch\test\circle-task.js

- 工作目录：F:\BaoZouyxt
- 退出码：0
- PASS 行：
```
[circle-task] 通过 15/15
CIRCLE-TASK SMOKE PASSED
```

---

## 10. node hotfix-patch\test\c03-smoke.js

- 工作目录：F:\BaoZouyxt
- 退出码：0
- PASS 行：
```
[c03-smoke] 通过 11/11
C03 SMOKE PASSED
```

---

## 11. node hotfix-patch\test\c02-smoke.js

- 工作目录：F:\BaoZouyxt
- 退出码：0
- PASS 行：
```
[c02-smoke] 通过 19/19
C02 SMOKE PASSED
```

---

## 12. node hotfix-patch\test\c05-smoke.js

- 工作目录：F:\BaoZouyxt
- 退出码：0
- PASS 行：
```
[c05-smoke] 通过 16/16
C05 SMOKE PASSED ✅
```

---

## 汇总表

| # | 命令原文 | 工作目录 | 退出码 |
|---|---------|---------|--------|
| 1 | node tools\gen_shop_tables.js | F:\BaoZouyxt | 0 |
| 2 | node build-handlers.js | F:\BaoZouyxt\hotfix-patch | 0 |
| 3 | node tools\check_shape_freeze.js | F:\BaoZouyxt | 0 |
| 4 | node tools\acceptance.js | F:\BaoZouyxt | 0 |
| 5 | node tools\check_reject_codes.js | F:\BaoZouyxt | 0 |
| 6 | node hotfix-patch\test\v271-smoke.js | F:\BaoZouyxt | 0 |
| 7 | node hotfix-patch\test\achieve-data.js | F:\BaoZouyxt | 0 |
| 8 | node hotfix-patch\test\c16-smoke.js | F:\BaoZouyxt | 0 |
| 9 | node hotfix-patch\test\circle-task.js | F:\BaoZouyxt | 0 |
| 10 | node hotfix-patch\test\c03-smoke.js | F:\BaoZouyxt | 0 |
| 11 | node hotfix-patch\test\c02-smoke.js | F:\BaoZouyxt | 0 |
| 12 | node hotfix-patch\test\c05-smoke.js | F:\BaoZouyxt | 0 |

全部 12 条退出码 = 0。无失败命令，无重跑。

## 未验证段：无

## 范围外产出

本工人除本报告外未主动创建/修改任何文件。以下为工单内命令自身运行时写出的文件，仅记录位置：

- 命令 1 写出：F:\BaoZouyxt\hotfix-patch\core\bz-shops.generated.js（命令输出中标注）
- 命令 2 写出：patch/live/handlers.js、patch/live/flow.js（F:\BaoZouyxt\hotfix-patch 下，命令输出中标注）
- 命令 4 追加历史：tools/golden/known-red-history.jsonl seq=66（命令输出中标注，entries=0）

## 收工时间

- 收工时间：2026-10-26（12 条全部完成）
