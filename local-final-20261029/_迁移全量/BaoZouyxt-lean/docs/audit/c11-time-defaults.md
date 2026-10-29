# c11 时间类字段默认值统计

## 1. 任务 1：时间类字段名定义与规则

字段名（路径最后一段，去掉 [i] 下标）匹配下列任一正则：
- `/[Tt]ime$/`
- `/^time/`
- `/^Time/`
- `/^gen$/`
- `/^cd/i`
- `/[Tt]ime[0-9]*$/`

## 2. 任务 2：tools/golden/emission.json 统计结果

- 命中（动作,路径）对数：29
- 字段名去重清单及各自出现对数：
  - `beginTime`: 10
  - `serverTime`: 12
  - `endTime`: 2
  - `CDTime`: 3
  - `gTime`: 2

| 动作名 | 路径 | 值 | 字段名 |
|---|---|---|---|
| BeginFish | beginTime | 1792612412000 | beginTime |
| BeginFish | serverTime | 1792612412000 | serverTime |
| BeginMeditation | beginTime | 1792612412000 | beginTime |
| BeginPlayWooks | beginTime | 1792612412000 | beginTime |
| BeginPlayWooks | serverTime | 1792612412000 | serverTime |
| BeginSaveNpc | beginTime | 1792612412000 | beginTime |
| BeginSaveNpc | endTime | 1792612412000 | endTime |
| BeginTraining | beginTime | 1792612412000 | beginTime |
| CheckOutSchool | serverTime | 1792612412000 | serverTime |
| CheckOutSchool | CDTime | 1792612412000 | CDTime |
| EndFish | serverTime | 1792612412000 | serverTime |
| EndPlayWooks | serverTime | 1792612412000 | serverTime |
| EndSaveNpc | endTime | 1792612412000 | endTime |
| NewPVPBattleResult | CDTime | 1792612412000 | CDTime |
| OnHookBreak | serverTime | 1792612412000 | serverTime |
| OnHookBreak | beginTime | 1792612412000 | beginTime |
| OutSchool | serverTime | 1792612412000 | serverTime |
| OutSchool | CDTime | 1792612412000 | CDTime |
| beginPlayGame | beginTime | 1792612412000 | beginTime |
| checkHireOnhook | beginTime | 1792612412000 | beginTime |
| EndFish | beginTime | 1792612352000 | beginTime |
| EndPlayWooks | beginTime | 1792612352000 | beginTime |
| BeginRecoverMP | serverTime | 1792572970629 | serverTime |
| GetMarketList | serverTime | 1792572970629 | serverTime |
| beginPlayGame | serverTime | 1792572970629 | serverTime |
| checkHireOnhook | serverTime | 1792572970629 | serverTime |
| skillChange | serverTime | 1792572970629 | serverTime |
| EndFish | gTime | 60 | gTime |
| EndPlayWooks | gTime | 60 | gTime |

## 3. 任务 3：tools/shapes.json shapes 统计结果

- 命中（动作,路径）对数：27
- 字段名去重清单及各自出现对数：
  - `beginTime`: 10
  - `serverTime`: 12
  - `CDTime`: 5

| 动作名 | 路径 | 值 | 字段名 |
|---|---|---|---|
| BeginFish | payload.beginTime | 1792612412000 | beginTime |
| BeginMeditation | payload.beginTime | 1792612412000 | beginTime |
| BeginPlayWooks | payload.beginTime | 1792612412000 | beginTime |
| BeginSaveNpc | payload.beginTime | 1792612412000 | beginTime |
| BeginTraining | payload.beginTime | 1792612412000 | beginTime |
| CheckOutSchool | payload.CDTime | 1792612412000 | CDTime |
| EndFish | payload.beginTime | 1792612412000 | beginTime |
| EndPlayWooks | payload.beginTime | 1792612412000 | beginTime |
| NewPVPBattleResult | payload.CDTime | 1792612412000 | CDTime |
| OnHookBreak | payload.beginTime | 1792612412000 | beginTime |
| OutSchool | payload.CDTime | 1792612412000 | CDTime |
| beginPlayGame | payload.beginTime | 1792612412000 | beginTime |
| checkHireOnhook | payload.beginTime | 1792612412000 | beginTime |
| checkUploadAttackDamge | payload.CDTime | 1792612412000 | CDTime |
| rankList | payload.CDTime | 1792612412000 | CDTime |
| BeginFish | payload.serverTime | 1792572970629 | serverTime |
| BeginPlayWooks | payload.serverTime | 1792572970629 | serverTime |
| BeginRecoverMP | payload.serverTime | 1792572970629 | serverTime |
| CheckOutSchool | payload.serverTime | 1792572970629 | serverTime |
| EndFish | payload.serverTime | 1792572970629 | serverTime |
| EndPlayWooks | payload.serverTime | 1792572970629 | serverTime |
| GetMarketList | payload.serverTime | 1792572970629 | serverTime |
| OnHookBreak | payload.serverTime | 1792572970629 | serverTime |
| OutSchool | payload.serverTime | 1792572970629 | serverTime |
| beginPlayGame | payload.serverTime | 1792572970629 | serverTime |
| checkHireOnhook | payload.serverTime | 1792572970629 | serverTime |
| skillChange | payload.serverTime | 1792572970629 | serverTime |

## 4. 任务 4：统计问题回答

### (a) 若把这些值全部改成 0，会影响多少个（动作,路径）对？
- tools/golden/emission.json: 29
- tools/shapes.json (shapes): 27
- 合计（两表总和）: 56（若按不重复（动作,路径）键合并则为 56）

### (b) 这些条目里，有多少的比例（百分数，一位小数）是 13 位数字（毫秒时间戳，即 > 1e12）？
- tools/golden/emission.json: 27 / 29 = 93.1%
- tools/shapes.json (shapes): 27 / 27 = 100.0%
- 全体合计: 54 / 56 = 96.4%
