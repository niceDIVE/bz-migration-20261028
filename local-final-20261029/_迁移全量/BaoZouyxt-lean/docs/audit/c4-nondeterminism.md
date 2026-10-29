# C4 不确定性（非确定性）对照审计报告

## 1. 两文件行数
- `tools/golden/.a.js` 行数：350 行
- `tools/golden/.b.js` 行数：350 行

## 2. 差异总数
- 差异行总数：17 处

## 3. 差异明细对照表

| 行号 | 字段名 | 值 a | 值 b | 类别(T1-T4) | 动作名 |
|---|---|---|---|---|---|
| 2 | 生成于 (注释) | 2026-10-22T15:15:42.585Z | 2026-10-22T15:15:42.800Z | T1 | not found |
| 7 | beginTime | 1792682142510 | 1792682142720 | T1 | BeginFish |
| 9 | beginTime | 1792682142510 | 1792682142720 | T1 | BeginMeditation |
| 10 | beginTime | 1792682142510 | 1792682142720 | T1 | BeginPlayWooks |
| 13 | beginTime | 1792682142510 | 1792682142720 | T1 | BeginSaveNpc |
| 14 | beginTime | 1792682142510 | 1792682142720 | T1 | BeginTraining |
| 27 | CDTime | 1792682142511 | 1792682142720 | T1 | CheckOutSchool |
| 32 | beginTime | 1792682142510 | 1792682142720 | T1 | EndFish |
| 34 | beginTime | 1792682142510 | 1792682142720 | T1 | EndPlayWooks |
| 63 | CDTime | 1792682142511 | 1792682142720 | T1 | NewPVPBattleResult |
| 65 | beginTime | 1792682142510 | 1792682142720 | T1 | OnHookBreak |
| 67 | CDTime | 1792682142511 | 1792682142720 | T1 | OutSchool |
| 100 | beginTime | 1792682142510 | 1792682142720 | T1 | beginPlayGame |
| 122 | beginTime | 1792682142510 | 1792682142720 | T1 | checkHireOnhook |
| 124 | CDTime | 1792682142511 | 1792682142720 | T1 | checkUploadAttackDamge |
| 285 | CDTime | 1792682142511 | 1792682142720 | T1 | rankList |
| 345 | gen | 2026-10-22T15:15:42.585Z | 2026-10-22T15:15:42.800Z | T1 | not found |

## 4. 汇总统计

### 按类别计数
- T1 (时间戳/时钟派生)：17
- T2 (顺序不稳)：0
- T3 (数值不同但非时间)：0
- T4 (其它)：0

### 按字段名去重计数 (共 4 个字段/标识)
1. `beginTime`：10 处
2. `CDTime`：5 处
3. `gen`：1 处
4. `生成于 (注释)`：1 处

### 按动作名去重计数 (共 15 个动作 + not found)
1. `BeginFish`：1 处
2. `BeginMeditation`：1 处
3. `BeginPlayWooks`：1 处
4. `BeginSaveNpc`：1 处
5. `BeginTraining`：1 处
6. `CheckOutSchool`：1 处
7. `EndFish`：1 处
8. `EndPlayWooks`：1 处
9. `NewPVPBattleResult`：1 处
10. `OnHookBreak`：1 处
11. `OutSchool`：1 处
12. `beginPlayGame`：1 处
13. `checkHireOnhook`：1 处
14. `checkUploadAttackDamge`：1 处
15. `rankList`：1 处
- `not found` (文件头注释行与尾部元数据对象，不在具体动作内部)：2 处

## 5. 其它成因判定结论
只有时间戳。
