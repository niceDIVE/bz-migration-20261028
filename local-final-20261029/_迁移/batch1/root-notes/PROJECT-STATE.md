# 交接文档 · 为 SOTA 全面评估准备材料（2026-10-23）

> **本文主线只有一条：为 SOTA 做一次全面系统评估准备材料。**
> 所有章节都为这条主线服务：评估要评什么（§1）→ 评估需要哪些材料、现在有什么缺什么（§2）→ 项目当前状况事实（§3）→ 每一项缺的材料怎么拿到（§4）→ 已有材料索引（§5）→ 现场与回滚（§6）。
> 用户指令原文：「写交接文档，准备全面系统的重新评估」「我不打算让你评估了，而是 SOTA」「让它知晓项目程序结构的全貌」「我们从头开始收集东西，同时我禁止你掺杂任何先入为主的结论，只阐述项目状况」。
> 写作约束（由上列指令直接推出）：本文不写评估结论、不写建议、不写优先级、不写路线选择。凡涉及"项目好不好、该不该继续、往哪走"，一律留给 SOTA。
> 标记：`[实测]` 本次跑过命令；`[读点]` 客户端源码行号可查；`[未验证]` 没验证过。

---

## 1. 评估任务定义

### 1.1 谁评、评什么

- 评估方：SOTA（外部顾问）。本文作者不参与评估，只供材料。
- 评估对象：整个项目——目标口径、运行环境、分层架构、协议与状态模型、验证体系、工作量与路径、工作流程。
- 评估范围草案（6 维，待确认）：

| 维度 | 评估问题 |
|---|---|
| D1 | 目标与"完成"的定义是否自洽；几种口径各自要付什么代价 |
| D2 | 分层架构是否成立；进程内拦截这一形态的限制；生成物与策略的耦合关系 |
| D3 | 协议与状态模型是否会导致某类不可恢复错误 |
| D4 | 验证体系里"绿"的置信边界（假阳性/假阴性在哪） |
| D5 | 工作量与路径：哪种推进方式能最快到可玩，哪种会走进死路 |
| D6 | 工作流程（证据制、回合制顾问、工人复跑、文档产出）的取舍 |

### 1.2 SOTA 的输入条件（决定材料形态）

| 条件 | 对材料的要求 |
|---|---|
| 看不到本仓 repo、不能执行命令、不能联网 | 每条结论所需的证据必须是**材料里自带的行号或原文**；材料必须自足 |
| 单次上下文有限 | 材料必须**分卷**，每卷有"本卷回答 D1–D6 的哪几条" |
| 其规则要求：结论带条件或可执行形式、推断须标注、必须给反例、按编号输出 | §1.3 的固定输出格式 |
| 强静态推理、强协议/状态语义、强流程批判 | 代码原文、协议原文、状态定义的价值 > 任何转述 |

### 1.3 评估输出格式（送评时附在材料末尾）

```
按 6 段输出，不许增删小标题：
D1 目标与完成定义 / D2 架构分层 / D3 协议与状态 / D4 验证体系 / D5 工作量与路径 / D6 工作流程
每段必须包含：结论（带条件或可执行形式）、判据（怎么验证）、反例（什么场景下此结论失效）、材料缺失（缺什么就无法判断）
禁止：折中方案、"建议进一步评估"、"建议增加测试"、无行号的断言
允许：说"材料未提供"、说"这条判不了，因为缺 X"
```

### 1.4 送评分两步（流程事实）

1. **材料充分性预审**：先只送 §2 的材料清单 + §3 状况 + §1.3 格式，问一句"要完成 D1–D6 还缺哪些材料？只列缺失项，不要开始评"。
2. **正式评估**：按预审结果补齐材料后送全量。

理由（上一批的实际教训）：材料不全时，评估方的结论会退化成大段"材料未提供"。

---

## 2. 材料清单与现状（本文主线）

> 现状口径：**有** = 已成形可直接送评；**部分** = 有零散记录但未成表/未核完；**无** = 没有。
> "评估需要它回答"一栏只写它与 D1–D6 的对应关系，不含对材料价值的判断。

| # | 材料 | 评估需要它回答 | 现状 | 位置 / 出处 |
|---|---|---|---|---|
| M1 | 项目目标、边界、口径变更史 | D1 | 有 | `HANDOVER.md` §1；`docs/audit/constraint-relaxation-20261023.md` |
| M2 | 运行环境与注入形态（真机/Cocos/JSB/加密包/热重载/进程内拦截） | D2 | 有 | 本文 §3.1；`HANDOVER.md` §3 |
| M3 | 分层架构与数据流（hook→core→生成物→live→工具链→数据） | D2 | **部分**：代码在，**没有一张数据流图/模块边界文档** | `hotfix-patch/core|hook|live|`；`docs/HANDOVER-contracts.md` |
| M4 | 协议规范（信封、两类 URL、动作枚举、`note` 五子表、形状契约、拒绝码收窄） | D3 | 部分 | `HANDOVER.md` §5；`docs/HANDOVER-contracts.md`；**无独立协议卷** |
| M5 | 状态与账本模型（存档结构、派生叠加、两本账、时间源、幂等与回滚） | D3 | 部分 | `HANDOVER.md` §5；`core/bz-rpc-server.js` 注释；**无状态机文档** |
| M6 | 验证体系（38 项验收、C1–C13、known-red 内容键、审批棘轮、工人复跑、假阳性案例） | D4 | 有 | `tools/acceptance.js` 头注释；`tools/check_shape_freeze.js` 头注释；`HANDOVER.md` §6 |
| M7 | 动作全集清单（1125 个 → 值、我方是否实现、客户端是否有应答处理器、是否已登记 catchCode） | D2/D3/D5 | **无**（只有统计数） | 需生成，方法见 §4-1 |
| M8 | 客户端读点索引（动作 → 处理函数 → 读了哪些字段 → 读了做什么） | D3/D4 | **无**（零散在注释里） | 需生成，见 §4-2 |
| M9 | 配置表使用图（442 张表 → 被哪些客户端读点/服务端 handler 使用） | D2/D3 | 部分（`tools/facts/lookup-keys.json` 371 项） | 见 §4-3 |
| M10 | 存档字段字典（`s.*` 每个键的语义/写入者/读取者） | D3 | **无** | 见 §4-4 |
| M11 | 拒绝与异常语义（87 个动作各自的失败路径；16 个已登记 catchCode 的推导方式） | D3/D4 | 部分 | `tools/facts/reject-codes.json`；`tools/derive_catch_codes.js`；见 §4-7 |
| M12 | Effect 族清单（76 族 → 件数、已实现/未实现、可获件数、`Data1..5` 语义） | D5 | 部分（件数与可获数有；语义基本无） | `tools/cfg/dump/item.full.json`；`tools/facts/item-effects.json`；见 §4-10 |
| M13 | 时间源清单（5 个时间源 → 各自的客户端比较点 → 覆盖到哪一层） | D3 | 部分 | 见 §3-8；`docs/audit/r19-W-A-timebomb.txt` |
| M14 | 进度与规模量化（主线 938/15、任务 4842、物品 6525、表 442、动作 1125） | D5 | 有 | 本文 §3-9 |
| M15 | 历史与被推翻的判断（哪些结论后来被复算或证据推翻，推翻方式） | D6 | 有 | 本文 §3-10 |
| M16 | 现场三态（设备 / 仓库 / 未构建未测试的编辑） | D5/D6 | 有 | 本文 §3.2 |
| M17 | 外部输入（原版服务器可达性、抓包账号状态、原版应答样本） | D3/D5 | 有 | 本文 §3-11 |
| M18 | 客户端分包资源全貌（3 个 JS 包 + 1 个 zip 是否为全部） | D3 | **未验证** | 见 §4-11 |

---

## 3. 项目状况事实

### 3.1 运行环境

| 项 | 值 | 来源 |
|---|---|---|
| 设备 | Android 真机，adb `127.0.0.1:16416` | `[实测]` |
| 进程 | `com.maple.madherogo`，`pid 29928` | `[实测]` |
| 引擎 | Cocos Creator 2.x（`cc._RF`、`cc.js.getClassByName`） | `[读点]` |
| 客户端源码 | 已解密三包：`tools/index.js` 149,447 行、`scripts2.js` 81,775 行、`scripts3.js`（未精确计数）；合计约 330k 行 | `[实测]` |
| 补丁落点 | `/data/data/com.maple.madherogo/files/hotfix/`（`jsb-adapter/`、`live/handlers.js`、`live/flow.js`、存档、日志、命令通道） | `[实测]` |
| 拦截形态 | 在客户端进程内拦网络门面，直接合成应答对象；不起外部服务端 | `[读点]` `hook/` 与 `core/` |
| 热重载 | 推 `handlers.js` 后 reload，`pid` 不变、`impl` 变 | `[实测]` |

### 3.2 部署三态

| 项 | 设备 | 仓库 |
|---|---|---|
| `impl` | `hc1455196` | 构建产物对应 `h7d4f7b52`；源文件另有 1 处未构建编辑 |
| 自检 | `passed=1242 failed=[] missingRequired=[]` | 同（构建期打） |
| 验收 | — （主机侧命令） | `ACCEPTANCE OK 项=38 绿=38 已知红=0 cap=0`，退出码 0 `[实测]` |
| 形状冻结 | — | `check_shape_freeze.js` 退出码 0 `[实测]` |

- **设备已有改动**：① `LoadGame` 增 `titleObj` 投射（无过期过滤版）② `upgradeSkill` 不出 `lv=0` 的 `skch`。
- **仓库有、设备无**：③ `titleObj` 加 `tv <= now` 过滤 ④ `Create` 内 `s.baseValueAy[41]=0` 并以同一份覆盖应答 ⑤ `upgradeSkill` 删 4 处 `returnPro` ⑥ `planned-changes.json` +1 规则 ⑦ `approved-narrowing.json` +1 审批。
- **仓库内未构建/未测试/未推送**：`core/bz-rpc-server.js` 的 `upgradeSkill` 新增"书路径 `flag===1`"分支（写于被叫停前）。

### 3.3 存档真值（`cmd "state"`，`[实测]`）

```
roleID=16374  name=FZhou  saveVersion=4
coins=11155859  gold=5099799  yuanbao=1000  potential=84599  contribution=0
baseValueAy = ["9900012358565","FZhou",0,1,286,311,318,40,20,10,10,100,100,80,0,20,0,0,0,50,13,0,0,0,100,100,0,600,600,200,200,500,0,1,0,0,0,40,20,10,10,0,0,0]  (len=44, [41]=0)
bag = {1301:2,1501:1,3003:52,3007:13,3020:17,3626:1,4014:1,4015:1,4016:1,4020:5,4101:1,7027:1}
playerEquip = {1001:[1,1],2001:[1,2],2302:[1,2],2501:[1,1],2601:[1,1]}
equipments   = {1:1001,2:2001,5:2302,7:2501,8:2601}
skills = {1:[40,0,1],7:[40,0,1],8:[40,0,1],1112:[41,0,1],1262:[1,0,1],1263:[1,0,1]}
accepted=21  done=19  rewarded=16
bloodArr=[0,0,0,0]  fosterArr=[0,0,0,0]  titles 键不存在
meta.actionStats={useItem:1, bzSeedBag:1}
```

### 3.4 目录与文件

```
F:\BaoZouyxt\
  HANDOVER.md                     166 行 v4（§2 基线数字已过期：写 项=35 / impl=h84faae07）
  HANDOVER-REASSESS.md            本会话产物，含判断与建议
  HANDOVER-SOTA-EVAL-PACK.md      本会话产物，含判断与建议
  PROJECT-STATE.md                本文件
  docs\HANDOVER-contracts.md      契约与坑表展开版
  docs\HANDOVER-full-history-20261022.md   事故取证链 2249 行
  docs\audit\                     本会话新增约 30 个文件（索引见 §5）
  docs\sota\inbox|outbox\         R01–R20 顾问材料与回执
  hotfix-patch\
    core\bz-rpc-server.js         策略层（本会话改 6 处，1 处未验证）
    core\bz-handler-impl.js       自检与形状填充
    core\bz-shapes.generated.js   形状表（122 动作，__switch 标记开关字段）
    core\bz-tasks.generated.js    任务生成物 640KB
    core\templates.json           抓包模板
    hook\   bz-bootstrap / bz-offline-hook / bz-xhr / bz-codec   注入与信封
    live\flow.js                  流程层
    patch\live\handlers.js        构建产物（推给设备的就是它）
    probe\ （60+ 探针） test\ （35 套测试） captures\ decrypted\
  tools\
    acceptance.js  check_shape_freeze.js  check_reject_codes.js  check_exchange_currency.js
    gen_shapes.js  classify_fields.js  derive_catch_codes.js
    index.js / scripts2.js / scripts3.js        解密客户端源码
    cfg\dump\  444 文件 = 442 真表 + item.full.json + _index.json
    facts\  golden\
  _backup\2026-10-23-0326-pre-r19\  _backup\2026-10-23-0416-pre-r20a\
```

### 3.5 数据资产

| 资产 | 量 | 位置 |
|---|---|---|
| 客户端配置表 | 客户端 454 张；dump 442 张真表；差集 12 张全为 0 行 `[实测]` | `tools/cfg/dump/` |
| 物品表 | 6525 行；字段 `ID,Type,Effect,Data1..5,Name,Description,Price,BuyPrice,Limit,EquipType,WeaponType` | 同上 |
| 任务表 | 4842 行 / 40 列（`Chain`/`chapterid`/`branchid`/`TaskType`/`Require`/`Pre-Require`/`SpRequire`/`Reward`） | 同上 |
| 等级表 | 999 行，含 `SkillPotential`/`SkillMoney`/`NeedBreak` | 同上 |
| 原版抓包 | 100+ 个 REQ/RESP；含 2 条 `upgradeSkill` 请求与 2 条应答 | `hotfix-patch/decrypted/` |
| 物品效果事实 | 按 Effect 归类 | `tools/facts/item-effects.json` |
| 可获性事实 | 2387 个有来源标签；2386 个"未建模但可获" | `tools/facts/obtainable.json` |
| 拒绝码 | 16 个动作 | `tools/facts/reject-codes.json` |

### 3.6 数字台账（每项附来源）

```
客户端动作常量 1125（index.js:59491-60615）
  有发送点+应答处理器 711 ｜只发不收 33 ｜只注册不发送 192 ｜纯常量 189
我方 handler 87（含 4 维护命令 + 1 别名）⇒ 协议动作 82 ｜客户端会读应答 79
已登记 catchCode 16；与 79 的交集 15 ⇒ 差额 64
物品 6525 / Effect 族 76（Type==2）；已实现 1,2,3,5,11,28 = 867 件（13.3%）
Effect 13（Type==2）1773：Data1===ID 1678、Data1≠ID 95
Effect 39/37/38/20 = 455/354/560/275（Type==2 件数）
可获物品 2387；效果未建模 2386
tasknew 4842 行；主线 Chain=1 938 行（chapterid 1=9、2=16、3=913）；玩家 done 15
产物毫秒字面量 215 处 / 43 个不同值；与「模板+442 表」差集 0；30 天内 2 条
配置表 30 天内到期 16 条（active 27/55、exchange 2200..2212、mall 39）
10 位秒级 2311 条（含 currentServerEndTime=1798300800）
验收 38 项；自检 1242 项
```

### 3.7 已实现的行为

| 动作/系统 | 现状 | 依据 |
|---|---|---|
| `Create`/`LoadGame`/`quicklogin`/`CheckName` | 有 handler，回模板快照 + 账本回放 | `[实测]` |
| `ReqSelfBattleInfo`/`CheckBattleResult` | 有 handler；`npcArr` 26 格 | `[实测]` |
| `acceptTask`/`getFinishTaskAward` | 有 handler；**不判** `Require`/`SpRequire` | `[读点]` |
| 商店 8 个动作 | 有 handler | `[实测]` |
| `sycnPlayerItemData`/`equipWeapon`/出售 | 有 handler；`PlayerEquip` + `equipments` 两本账 | `[实测]` |
| `upgradeSkill` | 有 handler；`lv = max(curLv, reqLv)`（采用请求里的目标等级） | `[读点]` |
| `useItem` | 有 handler；Effect 1/2/3/5/11/28 有分支；其余"扣掉无效果"+`CONSUME_UNMODELED` | `[读点]` |
| 活动 `getAllActivity` 等 | 有 handler；窗口按 `now - 抓包时刻` 平移 | `[实测]` |
| `BeginMeditation`/`BeginTraining` | 有 handler；`End*` 未实现 | `[实测]` |
| Effect 28 称号 | 写 `s.titles[id]=1`，`LoadGame` 投 `titleObj` | `[实测]` |
| 成就/每日/七日 | 无进度来源，恒 0 | `[实测]` |
| 转世/特殊转世 | 拒绝（`eRet` 非 1） | `[实测]` |

### 3.8 时间源现状

| 时间源 | 客户端读点 | 覆盖情况 |
|---|---|---|
| `serverTime` | 多处（`[读点]` 未穷举） | 应答里覆盖为 `env.now()` |
| `serverOpenTime` | `index.js:27401`、`85179`（≥3 处） | 未处理 |
| `currentServerEndTime` | `index.js:107246` 赋给 `serverOpenTime` | 未处理 |
| `activityResource` | `scripts2.js:31067-31086`（活动 67 倒计时 / 92 tip） | 已平移 |
| 配置表时间列（`active.endtime`/`begintime`、`exchange.endtime`、`mall.shopend`） | `index.js:134336`、`scripts3.js:44214` 等 | 未处理 |

### 3.9 未实现 / 拒绝 / 不可达

| 项 | 处置 | 依据 |
|---|---|---|
| 未建模物品效果 | 扣 1 件 + `⚠ CONSUME_UNMODELED`，不发效果 | `[读点]` |
| Effect 15（3020） | 判不可达：`case 15` 读 `numDeaths`，其来源 `baseValueAy[41]` 恒 0 ⇒ 本地 `return !0` | `[读点]` `index.js:64423-64428`、`111798` |
| Effect 13 礼包内容 | 442 表中无键、无列、资源无命中 | `[实测]` |
| `Map=0` 入口 | 拒绝 | `[实测]` |
| `EndMeditation`/`EndTraining` | 未实现（请求不带时长） | `[实测]` |
| 87 个动作中 64 个 | 无 catchCode | `[读点]` `derive_catch_codes.js` |

### 3.10 本会话被复算推翻的数字（事实）

| 先报 | 复算后 | 推翻方式 |
|---|---|---|
| "724 个动作只发不收" | 有应答处理器 711 / 903（口径不同） | 判据错误：用"内联回调"当"会读应答"；本客户端 918 处是 `MessageCenter.on` |
| 缺口 63 | 交集 15 ⇒ 缺口 64 | `specialCycleLife` 有发送点但无应答处理器 |
| Effect 13 = 1780、Data1≠ID 仅 4 | Type==2 为 1773；Data1≠ID 95 | 未按 Type 过滤，且只看 5 个样本 |
| "214 个产物毫秒字面量"口径不明 | 宿主为 `handlers.js`：215 处 / 43 值；差集 0 | 先在 `bz-shapes.generated.js` 搜（0 命中），换文件才找到 |
| 时间字段"0 读点" | `active.endtime` 确有与 `getSTimestamp()` 比较的读点 | 工人搜索未命中，主审复核找到 |

### 3.11 外部输入

| 项 | 状态 | 来源 |
|---|---|---|
| 原版服务器 | `bzgf.maple-game.com` → `121.5.98.233`/`43.142.214.44`；`150.158.217.220:9898` TCP 可达 | `[实测]` |
| 抓包账号 | `userAccount=9900012358565`、`roleID=16374`、`loginFlag=99` | `[实测]` |
| 抓包时角色 | `skillArr:[1,0,1]`（技能 1112 为 1 级） | `[实测]` |

原版 `upgradeSkill` 应答原文（`NPCID=1003`、`flag=0`）：

```
0036 {"error":0,"p":"User.upgradeSkill","User.upgradeSkill":{"eRet":1,"note":{"eco":{},"skch":{"1262":[1,0,0]}}},"achievement":{"red":true,"achieveRateId":0,"nIds":[102]}}
0039 {"error":0,"p":"User.upgradeSkill","User.upgradeSkill":{"eRet":1,"note":{"eco":{},"skch":{"1112":[1,0,0]}}},"achievement":{"red":true,"achieveRateId":0,"nIds":[117]}}
```

---

## 4. 待收集执行表（"从头收集"的起点）

> 每一项写：要什么 → 给哪条评估维度用 → 怎么拿 → 产出格式 → 量。
> 全部为"目前没有或只有部分"，不含优先级判断。

| # | 要什么 | 用于 | 怎么拿 | 产出格式 | 量 |
|---|---|---|---|---|---|
| 1 | **动作全集表**：1125 个动作 → `User.xxx` 值 / 我方是否 handler / 客户端是否有 `MessageCenter.on` / 是否已登记 catchCode | D2 D3 D5 | 扫 `index.js` 枚举块 + 三包的 `MessageCenter.on` 与 `sendRequest` + `core/bz-rpc-server.js` 的 `H` + `reject-codes.json` | 一行动作一条：`名 / 值 / handler有无 / on有无 / code有无` | 1125 行 |
| 2 | **客户端读点索引**：动作 → 处理函数位置 → 读了哪些字段 → 每个字段读了做什么 | D3 D4 | 对每个 `MessageCenter.on(HttpConst.X, fn)` 抓函数体，抽字段访问 | 一动作一表：`字段 / 行号 / 用途` | 79 个动作 |
| 3 | **配置表使用图**：442 张表 → 被哪些客户端读点 / 服务端 handler 使用 | D2 D3 | 搜 `getItem(_, "表名")`、`getTable("表名")`，与 `core` 内引用交叉 | `表名 / 行数 / 字段 / 读点行号 / handler 有无` | 442 行 |
| 4 | **存档字段字典**：`s.*` 每键的语义 / 写入者 / 读取者 | D3 | 扫 `core/bz-rpc-server.js` 的 `s.xxx =` 与读点，人工补语义 | `键 / 类型 / 写入行号 / 读取行号 / 语义` | 约 30 键 |
| 5 | **`note` 五子表语义表**：`ivch`/`eqch`/`eco`/`skch`/`attrch` 的键语义与客户端消费点 | D3 | `index.js` 的 note 分发处 + 各消费点 | `子表 / 键 / 值形态 / 消费行号 / 语义` | 5 张子表 |
| 6 | **形状表格式说明**：`__meta`/`__impl`/`__switch`/`keyset` 的含义与生成规则 | D2 D4 | `tools/gen_shapes.js`、`classify_fields.js` + 生成物 | 一页说明 + 一个动作的样例 | 1 页 |
| 7 | **拒绝码全集**：87 个动作各自的失败路径 | D3 D4 | 逐动作看客户端处理函数的分支（含 `!eRet`/不等号/末尾 else） | `动作 / 客户端分支 / 我方现回 / 建议码` | 87 行 |
| 8 | **`baseValueAy` 下标语义**：48 个下标 | D3 | 客户端读点 + 实测存档比对 | `下标 / 语义 / 证据` | 48 行（已知 7 个） |
| 9 | **时间源穷举**：5 个时间源 × 全部客户端比较点 | D3 | grep `getSTimestamp`/`serverTime`/`sserverT`/`Date.now` 并回溯到字段 | `时间源 / 比较行号 / 决定什么` | 约 100 处 |
| 10 | **Effect 族语义**：76 族 × `Data1..5` | D5 | `useItem` 的 `switch(e.Effect)` 全分支 + 每族物品样例 | `族 / 分支行号 / Data1..5 用法 / 物品样例 / 可获数` | 76 行 |
| 11 | **客户端分包资源全貌**：3 个 JS 包之外还有没有游戏自己的分包 | D3 | 扫 APK `assets/` 目录结构与 `project.manifest`，与现有 3 包对照 | `包名 / 大小 / 是否已解密 / 内容类型` | 待定 |
| 12 | **进过界面后的表集快照**：探针在打开活动/背包/商城/充值后再跑一次 | D3 | 复用 `probe/list_tables.js` | 两次表名集合的差集 | 1 次 |

---

## 5. 已有材料索引

| 文件 | 内容 |
|---|---|
| `HANDOVER.md` | v4 精简版（§2 数字已过期） |
| `docs/HANDOVER-contracts.md` | 契约与坑表展开版 |
| `docs/HANDOVER-full-history-20261022.md` | 事故取证链 2249 行 |
| `docs/audit/r18-verification.md` | R18 逐条复核（带行号） |
| `docs/audit/r19-original-upgradeskill-capture.md` | 原版 `upgradeSkill` 抓包与差异表 |
| `docs/audit/r19-catchcode-scope.md` | 三个口径的复算方法 |
| `docs/audit/constraint-relaxation-20261023.md` | 约束放宽记录 |
| `docs/audit/question-routing.md` | 提问路由规则 |
| `docs/audit/r19-W-A-timebomb.txt` 等 `r19-W-*` / `r20-W-*` | 工人取证原始输出（含 1.8MB 的大文件） |
| `docs/sota/outbox/26,27` | 本会话我方两批材料 |
| `docs/sota/inbox/R18,R19,R20-审阅.txt` | 顾问三轮回执 |

---

## 6. 现场操作与回滚

- **备份**：`_backup\2026-10-23-0326-pre-r19\`（`bz-rpc-server.js`/`bz-shapes.generated.js`/`handlers.js.prebuild`/`MD5SUMS.txt`）；`_backup\2026-10-23-0416-pre-r20a\`（+`planned-changes.json`/`approved-narrowing.json`）。
- **回滚**（`HANDOVER.md` §9 原样）：拷回源文件 →（动过形状才要 `classify_fields`+`gen_shapes`）→ `build-handlers` → `run.ps1 handlers` → `check_shape_freeze`。
- **卸载补丁**：`adb shell rm -rf /data/data/com.maple.madherogo/files/hotfix`。
- **本会话操作流水**：`build-handlers` 3 次（产物 `hc1455196`→`h7d4f7b52`）；`run.ps1 handlers` 1 次（推 `hc1455196`，`pid` 不变）；`acceptance` 6 次以上（1 次 FAIL 于 `returnPro` 收窄审批，加审批后绿）；`check_shape_freeze` 4 次（2 次 FAIL 后加 golden 记录转绿）；子 agent 派发 7 批 18 个。

---

## 7. 声明

- 本文所有数字与路径来自本会话命令输出或 `[读点]`；未标来源的句子不含数量。
- 本文不含评估结论、建议、优先级、路线选择；这些留给 SOTA。
- 未覆盖：客户端源码内部逻辑（只列被引用行号）、442 张表内容、`docs/audit/` 约 30 个文件的细节。
