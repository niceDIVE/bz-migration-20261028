# C16〔成就〕取证与落地：为什么四个领奖口一律不发

> 对应 `_incoming\v2.7-20261025\01-...txt` §四第 4 项。部署 `impl=h9454ce1e`。
> 本文件只记「凭什么这么做」的证据，实施细节见 `回执-v2.7.md` ④。

---

## 1. 动作与线上名（`tools/actions.json`，6/6 命中）

| 注册名 | 线上名 | 状态 |
|---|---|---|
| GET_ACHIEVE_DATA | `getAchieveData` | **已有**（第 1 批，本批未动） |
| GET_ACHIEVE_MARK | `getAchieveMark` | 新写 |
| RECEIVE_ACHIEVE_REWARD | `receiveAchieveReward` | 新写（不发放） |
| RECEIVE_ACHIEVE_RATE_REWARD | `receiveAchieveRateReward` | 新写（不发放） |
| RECEIVE_ACHIEVE_SUIT_REWARD | `receiveAchieveSuitReward` | 新写（不发放） |
| RECEIVE_ACHIEVEMENT_REWARD | `receiveAchievementReward` | 新写（不发放） |

## 2. reqKeys（逐字取证）

```
scripts3.js:3008-3010  getAchieveMark            { markId: t }
scripts3.js:3013-3016  receiveAchieveReward      o = {}; t && (o.achieveId = t); e && (o.type = e)
scripts3.js:3019-3021  receiveAchieveRateReward  { rateId: t }
scripts3.js:3024-3028  receiveAchieveSuitReward  { suitId: t, index: e }
scripts3.js:90023-90025 receiveAchievementReward { skillId: t }
```

## 3. 应答字段（消费点逐字取证）

```
scripts3.js:2919-2943  RECEIVE_ACHIEVE_REWARD   1==eRet 时读 achieveIdArr / groupPoints（可选 rewardArray）
scripts3.js:2945-2951  RECEIVE_ACHIEVE_RATE_REWARD 读 rateIds（可选 rewardArray）
scripts3.js:2953-2964  RECEIVE_ACHIEVE_SUIT_REWARD 读 srd = { suitId: [index,...] }
scripts3.js:90027-90030 RECEIVE_ACHIEVEMENT_REWARD 读 achievementReward / rewardArray
```
四个回调**都只在 `1 == eRet` 分支读字段** → 回 4 时整段跳过，不存在"用到但缺席"。

## 4. ★ 为什么不能发奖（本文件的核心）

`achieve_list.json`：**2113 行**，`type/type1` 组合 **57 种**，`require` 编码各不相同，采样：
```
type=3/1   require="0|1000"        type=1/3   require="5000"
type=2/5   require="1"             type=1/20,2 require="-61"
type=3/11  require="1|10001,10002,10003,10004,10005"
type=1/12  require="1|1,4|2,4|3,4|4,4|5,4|6,4|7,4|8,4|9,3"
type=5/28,1 require="1|1003,310006"  type=5/15 require="1|10,5|11,5"
```
要判「达成」必须把这 57 种条件语义全部逆出来 —— 本工程**没有成就进度模型**，做不到。

而奖励面：
```
achieve_list   reward≠0 的有 421 条   （reward==0 的 1692 条只给 point）
achieve_rate   53 条，全部带 item
achieve_suit   240 条，全部带 reward
               合计 714 份奖励
```
**凭客户端一句话就能领 714 份** = C02 那个口子的同类。

## 5. 闸门设计（为什么不现在写进度模型）

`s.achieve` 这套账本槽位是 `getAchieveData`（第 1 批）**早就预埋**的：
`{groupPoints, rateIds, pending, received, taskData, suitIds}` —— 当时注释就写了"将来接真实进度直接读它"。

本批把闸门钉在这套槽位上：
- `receiveAchieveReward`：`achieveId ∈ pending`
- `receiveAchieveRateReward`：`groupPoints[group] ≥ rate.points` 且 `rateId ∉ rateIds`
- `receiveAchieveSuitReward`：`suit.achieve` 全部 `∈ received` 且该档未领
- `receiveAchievementReward`：未建模 → 恒拒

`pending` / `received` / `groupPoints` 现在恒空 → 四条全部回 4。
**进度模型一旦落地，只要往 `pending` 写 id、给 `groupPoints` 填初值，这套自动工作，不用改一行代码。**

### 一个实现细节（踩过）
拒绝路径必须用只读的 `achPeek(s)`；若用会建槽位的 `achState(s)`，`s.achieve` 会被建出来
（内存里就变了，之后任何一次 `persist()` 都会写盘）。冒烟里专门断言了
`!f.save().achieve`（拒绝时连槽位都不许建）。

## 6. 表编码（已逐值核对）

```
achieve_list.reward  "物品id,数量"，用 `|` 分隔；"0" = 无奖励
                     例 "3016,1|3092,2|9941,1" → 三份
achieve_suit.reward  `&` 分档，每档 = `档位|奖励|奖励…`
                     例 "3|6253,2&6|3325,1|6658,10&9|1,100&12|3325,1|6658,20"
                        → 档3:[[6253,2]] 档6:[[3325,1],[6658,10]] 档9:[[1,100]] 档12:[[3325,1],[6658,20]]
achieve_rate.item    "物品id,数量"（单条）
```
生成物 `BZ_ACHIEVE_SUIT['1'].t` 与上面手算**逐值一致**（冒烟里断言）。

## 7. 验证

`test/c16-smoke.js` **10/10**；`acceptance` 43/43；拒绝码 46/50/76；
形状冻结 diff 0；热重载 `pid 2655→2655`、`h55945933→h9454ce1e`、selfCheck 1264；
设备端 `getAchieveMark`→1、`receiveAchieveReward(354)`→**4**、`receiveAchieveRateReward(1)`→**4**、存档 md5 未变。

## 8. 待上游拍板
1. 成就进度模型要不要建？可验的子集（等级/货币/击杀/收集）我能先做；其余需口径。
2. 经验 4002 要不要真入账（需加存档字段 + LoadGame 投射）。
3. `adventure.json` 的 item id 1..5 各进哪个钱包字段。
