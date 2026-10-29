# C03 战斗结算 — v2.6 shape-hints 字段契约（机器生成，勿手改）

来源：`_incoming/v2.6-20261025/work/bz-oracle/out/shape-hints.json`（上游 v2.6 extract_shape.py 产物，649 actions）

| # | 线上名 | 注册名(key) | 字段 | kind | crashOnMissing | zeroIsWrong | 首个 consumedAt |
|---|---|---|---|---|---|---|---|
| 1 | CheckBattleResult | BATTLE_END_REWARD | `equipObj` | container | **是** | **是** | index.js:1620 |
|  |  |  | `gemId` | array|array|string | **是** | **是** | scripts3.js:24429 |
| 2 | GetNewSweepTowerData | GET_NEW_SWEEP_EVENT | （0 字段） | | | | |
| 3 | GetClimbingTowerData | ENTER_GET_CLIMBLING_EVENT | `towerArray` | array | **是** | **是** | index.js:137553 |
| 4 | lookSecretEvent | LOOK_SECRET_PANDA_EVENT | `secret` | array|object|array|string | **是** | **是** | scripts2.js:75376 |
| 5 | TowerBattleResult | SERVER_NPC_BATTLE_END | `awardObj` | array|array|object | **是** | **是** | index.js:67705 |
|  |  |  | `rewardArray` | container | 否 | **是** | index.js:67707 |
|  |  |  | `gemId` | array|array|string | **是** | **是** | scripts3.js:24429 |
| 6 | NewRoguePVPBattleResult | ROGUE_PVP_BATTLE_END | `delTaskIds` | array|object|array|string | **是** | **是** | index.js:133310 |
|  |  |  | `mapData2` | container | 否 | **是** | scripts3.js:39096 |
| 7 | diceBattleResult | *** shape-hints 里没有 *** | | | | | |
| 8 | goodAndEvilBattleResult | GOOD_AND_EVIL_BATTLE_RESULT | `prestige` | scalar | **是** | 否 | scripts3.js:35349 |
|  |  |  | `contribution` | scalar | **是** | 否 | scripts3.js:35350 |
| 9 | roguePveBattleResult | ROGUE_PVE_BATTLE_RESULT | `booksObj` | container | **是** | **是** | scripts3.js:70689 |
|  |  |  | `mapData2` | container | 否 | **是** | scripts3.js:39096 |
|  |  |  | `delTaskIds` | array|object|array|string | **是** | **是** | index.js:133310 |
| 10 | rogueBattleResult | SERVER_ROGUE_NPC_BATTLE_END | （0 字段） | | | | |
| 11 | chanllengeTower | TOWER_RANDOM_EVENT | `npcArr` | array|array|string | **是** | **是** | index.js:143820 |
|  |  |  | `eventID` | container | 否 | **是** | index.js:29362 |
|  |  |  | `equipments` | container | 否 | **是** | index.js:137600 |
| 12 | activateTowerEvent | ACTIVE_TOWER_EVENT | `npcArr` | array|array|string | **是** | **是** | index.js:143820 |
|  |  |  | `eventID` | container | 否 | **是** | index.js:29362 |
| 13 | newSweepTower | NEW_TOWER_SWEEP_EVENT | （0 字段） | | | | |
| 14 | choosePandaEvent | *** shape-hints 里没有 *** | | | | | |
| 15 | closeNewSweepTowerByLv | CLOSE_NEW_SWEEP_EVENT | （0 字段） | | | | |
| 16 | mulitiNpcBattleResult | REQ_MP_RESULT | `equipObj` | container | **是** | **是** | index.js:1620 |
|  |  |  | `gemId` | array|array|string | **是** | **是** | scripts3.js:24429 |
| 17 | chooseSecretEvent | SELECT_SECRET_PANDA_EVENT | （0 字段） | | | | |
| 18 | GetRandomEventAward | REQ_WM_ADV_RWD | `rewardArray` | container | **是** | **是** | index.js:143816 |
|  |  |  | `npcArr` | array|array|string | **是** | **是** | index.js:143820 |
|  |  |  | `liveness` | array|object|object|scalar | **是** | **是** | scripts3.js:63836 |
| 19 | NewPVPBattleResult | USER_PVP_OVER | （0 字段） | | | | |

## retryOnEmpty（空数据会触发重发的调用链）
- `CheckBattleResult`：index.js:99210→index.js:69196
- `GetNewSweepTowerData`：index.js:138248 , index.js:138251
- `lookSecretEvent`：index.js:60744→index.js:137982
- `TowerBattleResult`：index.js:67640→index.js:71461
- `NewRoguePVPBattleResult`：index.js:104543
- `goodAndEvilBattleResult`：index.js:99210→index.js:101415
- `roguePveBattleResult`：index.js:99210→index.js:104542
- `rogueBattleResult`：index.js:99210→index.js:105602
- `chanllengeTower`：index.js:137862 , index.js:137872
- `activateTowerEvent`：scripts2.js:75126→index.js:138321
- `newSweepTower`：index.js:138255
- `closeNewSweepTowerByLv`：index.js:51926→index.js:138263
- `mulitiNpcBattleResult`：scripts3.js:51162
- `chooseSecretEvent`：scripts2.js:75384→index.js:138006
- `GetRandomEventAward`：index.js:88606→index.js:143871
- `NewPVPBattleResult`：index.js:101408 , index.js:63686→index.js:112506

## 统计
- 有字段的动作：11/19
- crashOnMissing=true 的字段总数：18