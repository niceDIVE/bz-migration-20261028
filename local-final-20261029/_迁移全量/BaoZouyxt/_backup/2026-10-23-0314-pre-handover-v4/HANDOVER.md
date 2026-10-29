# 交接文档 —— 《暴走英雄坛》进程内离线单机

> **本版是「当前真相」重写版 v3**（2026-10-23 03:20 系统时钟）。
> v2（520 行）在 `_backup\2026-10-23-0311-pre-handover-rewrite-v3\HANDOVER.md`（改写前已备份，见 §9）。
> 再早：`docs\HANDOVER-full-history-20261022.md`（2249 行追加式历史，§0–§23，**查事故取证链去那里**）。
> 需要"现在什么状态、怎么开工"→ 读本文件；需要"当时怎么查的"→ 历史档。

---

## 0. 30 秒上手

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force   # 每个新 pwsh 都要
cd F:\BaoZouyxt\hotfix-patch
.\run.ps1 status                    # pid / scene（**版本别看这里**：热重载不刷 ready.json）
.\run.ps1 cmd "ver"                 # 版本看这条
.\run.ps1 cmd "state"               # 存档真值
node ..\tools\acceptance.js         # 一条命令跑完全部验收（35 项；退出码 0 = 绿）
```

改一行应答的完整循环（≈10 秒，**不重启游戏**）：

```powershell
cd F:\BaoZouyxt\hotfix-patch
$env:BZ_PROBE='0'; node build-handlers.js     # 构建 + 进程内自检（必须 HANDLERS OK selfCheck=1242）
.\run.ps1 handlers                            # 推送 + 热重载（断言 pid 未变）
```

**只改了 `core\*.js` / `build-handlers.js` / 数据表** → 上面两步就够。
**改了形状层**（`tools/classify_fields.js` / `gen_shapes.js`）→ 顺序不可换：
`node tools\classify_fields.js` → `node tools\gen_shapes.js` → `node build-handlers.js` → `node tools\check_shape_freeze.js`。

---

## 1. 项目边界（没变）

**唯一目的：让用户本人在自己的电脑上，离线单人游玩《暴走英雄坛》。**

| 会做 | 明确不做 |
|---|---|
| 在本机模拟器内运行**官方原版**客户端 | ❌ 不分发 APK、不提供下载源、不做安装包 |
| 在客户端**自己的可写目录**放一个本地补丁 | ❌ 不修改 APK 本体、不重签、不改资源与剧情 |
| 由补丁在**游戏进程内部**应答游戏自身的网络请求 | ❌ 不架设对外服务器、不监听公网端口、不运营私服 |
| 把存档写进本机文件 | ❌ 不绕过、不伪造任何付费/充值/订单 |
| 数值改动只作用于**本机存档**（用户已裁定：金条/元宝可做，但不做真实付费渠道） | ❌ 不售卖、不订阅、不提供任何付费服务 |

支付类动作（`*Pay*` / `*Order*` / `*Recharge*` / `*Iap*` / `*Jetton*`）**一律不实现**：`dispatch` 里
`PAY_ACTION_RE` 强制回 `eRet:4` 并记 `PAY_BLOCKED`，绝不伪造"充值成功"。

---

## 2. 当前状态真值（2026-10-23 03:20 实测）

| 项 | 值 |
|---|---|
| 部署 | `boot-2 / impl=h84faae07 / flow=ffaec47c3`，`pid 29928`（热重载，未重启），`scene=gamescene`，`implErr=null / flowErr=null` |
| 自检 | `failed=[]`、`checkedCount=1242`、`missingRequired=[]`（**判绿看这三项**，不看 `passed` 数字） |
| 验收 | `node tools\acceptance.js` → **项=35 绿=35 已知红=0 cap=0**；`test\*.js` **32 套全绿** |
| 形状冻结 | C1–C8/C10–C13 全绿、diff 0 处（C13 固定时钟 32 处，全部登记） |
| 产物 | `patch\live\handlers.js` ≈ 993 KB（含注入的 `BZ_ITEMFX` 物品效果表 + `BZ_CATCH_CODES`） |
| 存档 | `roleID=16374`、`name=FZhou`、`saveVersion=4`、`coins=11155859`、`gold=5099799`、`yuanbao=1000`、`potential=84599` |
| 背包 | `{1301:2, 1501:1, 3003:52, 3007:13, 3020:17, 3626:1, 4014:1, 4015:1, 4016:1, 4020:5, 4101:1, 7027:1}` |
| 装备 | `playerEquip` 5 项：`1001:[1,1] 2001:[1,2] 2302:[1,2] 2501:[1,1] 2601:[1,1]`；`equipments` 槽 1/2/5/7/8 |
| 技能 | `{1:[40,0,1], 7:[40,0,1], 8:[40,0,1], 1112:[41,0,1], 1262:[1,0,1], 1263:[1,0,1]}` |
| 任务 | `accepted 21`、`done 19`、`rewarded 16`（主线卡在「和跟踪者对话」） |
| 场景 | 平安镇西 |

### 2.1 玩家现在能玩到哪（✅ = 端上实测过）

| 系统 | 状态 | 备注 |
|---|---|---|
| 冷启动进游戏 | ✅ | 进 `gamescene` ≈16 s |
| 战斗 | ✅ 用户实测 | 客户端本地模拟；我们给 26 格 `npcArr` + 按 `npc.Drop` 发奖 |
| 任务（接/推/交/领奖） | ✅ | 交任务不扣 `SpRequire`（派生叠加）；`Repeat≠0` 可重复接 |
| 商店·普通（Type 2/20/36/38/51/55/70） | ✅ | 本地配置货架；按 `BuyPrice` 扣银两 |
| 时装（三页 + 购买） | ✅ 端上实测 | 常驻 16 / 限时 130 / 战令 39 |
| 背包 / 食物 / 药品 | ✅ 端上实测 | `note.ivch`（绝对值）+ `note.attrch`；顺序为"先算效果再扣再落盘" |
| 出售 / 快速购买 | ✅ | 按 `item.Price` 进银两 |
| **秘籍类物品（Effect 5 / Effect 11）** | ✅ 新 | **Effect 5**（29 件师门秘籍）→ 学会技能 1 级 + `note.skch`；已学会回 `eRet:5` 不扣。Effect 11 走 `BZ_ITEMSCH` 老路径（**已学会分支是错的，见 §7-19**） |
| **称号类物品（Effect 28）** | ✅ 新 | 7026/7027 → 应答带 `titleID`，客户端 `showTitleReward` |
| 打坐 / 练功 | ⚠ 能开始不能结算 | `EndMeditation`/`EndTraining` 无 handler（请求不带时长，SOTA R10 Q1） |
| 成就面板 | ✅ 能开，全 0 进度 | 78%+ 条目客户端不本地计算 |
| 活动面板 | ✅ 能开 | 活动窗口已按抓包偏移平移（§5.10），否则 2026-10-28 后全关 |
| 转世 / 特殊转世 | ⛔ 诚实拒绝 | `isCycleLife→2`、`cycleLife→9`、`specialCycleLife→9` |
| 未建模效果的物品 | ⚠ 照扣但无效果 | 用户裁定先不改行为；每次命中写 `⚠ CONSUME_UNMODELED` + `meta.consumeStats` |

---

## 3. 架构

```
设备端 /data/data/com.maple.madherogo/files/
├── hotfix/jsb-adapter/jsb-engine.js   引导层（改动要重启）
└── hotfix/live/handlers.js            策略层（≈993 KB，热重载 0.2–0.5 s）
    hotfix/live/flow.js                流程层（18 KB）
├── bz_offline_save.json               存档（账本 + meta）
├── bz_log.jsonl                       结构化日志（有轮转上限）
└── bz_cmd.txt / bz_res.txt            命令通道（boot-2 起开机会丢弃残留）

F:\BaoZouyxt\hotfix-patch\              源码工程
├── hook\bz-bootstrap.js               薄引导：命令通道 / XHR 替换 / 异常捕获 / JSONL / reload
├── hook\bz-xhr.js / bz-codec.js       传输层 / 线协议
├── core\bz-rpc-server.js              ★ 业务：87 个 handler + 形状分发 + 信封 + 账本 + 守卫
├── core\bz-handler-impl.js            策略层契约 + selfCheck 1242 项 + REQUIRED_CHECKS
├── core\bz-shapes.generated.js        形状层（gen_shapes 生成，勿手改）
├── core\bz-tasks.generated.js         数据面（gen_task_rewards 生成，勿手改）
├── build.js / build-handlers.js       构建（后者含自检 + 必需检查 id 闸门 + 拒绝码双向比对 + 时间戳断言）
├── run.ps1                            宿主侧唯一入口
├── test\*.js                          32 套回归
└── probe\                             探针（61 个）

F:\BaoZouyxt\tools\                     研究与生成工具（§10）
├── golden\                            冻结基线 + 审批表 + 已知红登记 + 固定时钟登记
├── facts\                             分类产物 / 查表键 / 可获得性 / 物品效果 / 拒绝码表
└── cfg\dump\                          442 张配置表 + `item.full.json`（live dump 全量 6525 行）
```

**六条设计原则（别走回头路）**
1. **机制与策略分离**：引导层只转发 `__BZ_HARNESS__.impl`；策略层从 `handlers.js` 求值 → 换 impl 不重启。
2. **可观测性**：所有动作/异常/场景写 JSONL；断言对日志做，不对截图做。
3. **大声失败**：未实现动作写 `UNKNOWN User.X`；形状表里也没有才走通用 ACK。
4. **形状是契约、不是实现**：`dispatch` 先 handler、再 `fillShape`（只补缺不覆盖）；**开关类字段一律不填**。
5. **改形状层之前先有冻结断言**：`check_shape_freeze.js` 不全绿，不许动分类器/生成器。
6. **登记制必须带棘轮**：任何"登记表"（已知缺口/审批表/上限值/已知红）都要"新增即 FAIL、修好不删也 FAIL、总数只许降"。

---

## 4. 常用操作

```powershell
.\run.ps1 status | cmd "ver" | cmd "state" | log -Tail 40
.\run.ps1 handlers         # 推 handlers+flow → reload → 断言 pid 不变
.\run.ps1 all              # 推引导层 → 重启（只有改引导层才需要）
.\run.ps1 probe .\probe\xxx.js [arg]     # 进程内执行探针
```

**维护动作（协议里没有，只能从命令通道打）**

```powershell
$js = 'get:(function(){var b=__BZ_CODEC__.encode(JSON.stringify({mod:"User",do:"<动作>",p:{...}}));var r=__BZ_HARNESS__.impl.handle({url:"https://bzgf.maple-game.com/900-server-166/x",body:b});return JSON.parse(__BZ_CODEC__.decode(JSON.parse(r.text).MsgData));})()'
.\run.ps1 cmd $js
```

| 动作 | 作用 |
|---|---|
| `bzSeedBag {itemObj:{id:n}}` | 灌物品（**唯一正规入口**） |
| `bzGrantCur {gold,yuanbao,coins,contribution}` | 增减货币（负数可扣、下限 0） |
| `bzPatch {set:{...}, del:{...}, delTop:[...]}` | 定点改档（**只写顶层键**） |
| `bzBackfillRewards` | 补发"已完成但没发"的任务奖励（幂等） |

四个维护动作都先 `backupBeforeMaint()` 写 `<save>.pre-maint.json`（滚动一格）再 `persist()` —— 唯一回滚位，别覆盖。

---

## 5. 协议与账本契约（写错会**清档**的那些）

### 5.1 线协议
`{mod:"User", do:"<Action>", p:{...}}` → LZString(Base64) → AES-256-CBC → Hex；
Key `120734aa834dea925ca8d2e1bb6811c3` / IV `33daee8409834c00`。
信封按 **URL**：入口服 `:9898` → `{MsgData}`；账号/游戏服 → `{code:200, MsgData}`（少 `code` 客户端静默丢弃）。

### 5.2 `note` 各子表语义（事故出处：20 个卖 1 个被写成 1 个）
客户端把应答 `note` 的**每个键当事件名派发**：

| 键 | 语义 | 写错后果 |
|---|---|---|
| `ivch` | `{物品id: **新数量（绝对值）**}`，0 = 删除 | 发"变动量" → 数量被覆盖 → **能反复卖** |
| `eqch` | `{uid:[0]}` 删 / `{uid:[1,[type,num]]}` 加 | 形状错 → 装备不落地 |
| `eco` | `{coins,gold,exp,ptt,chips,yuanbao: **新余额**}` | 钱包不变 |
| `attrch` | `{hunger,curhp,curmp,hplmt,hpbase,mpbase,exp,ptt,luck…}`（24 键） | 食物/药品没效果 |
| `skch` | `{技能id:[lv,pgr,brlv]}` | 学技能没提示 |

**`eco` 只认 6 个键**，且六个分支全赋值不累加；**潜能键是 `ptt`**（存档字段叫 `potential`，发错静默丢弃）。

### 5.3 三个"重建入口"
| 动作 | 必须回 | 格式陷阱 |
|---|---|---|
| `User.LoadGame` | `finishTaskObj / acceptTaskArray / acceptTaskOrder / taskLog / itemObj / PlayerEquip / equipments / cycleObj / OnhookObj.serverTime / baseValueAy` | `finishTaskObj` 要**字符串数组** `["101080,1"]` |
| `User.sycnTask` | 同上四件套 | `PlayerFinishTaskObj` 要**对象** `{"101080":1}` |
| `User.sycnPlayerItemData` | `itemObj` = **全部持有物** | 回空 = 客户端先清空再重建 = **背包清空** |

**派生叠加（P0）**：接任务**不写**背包、交任务**不扣** `SpRequire`；差额只出现在 `LoadGame`/`sycnPlayerItemData` 的投射里（同物品取 max）。

### 5.4 装备两本账
`PlayerEquip = {uid: [type, itemID, attrs, crystalIds, weaponSkinId]}`（`type==1` 无属性、`uid==itemID`）；
`equipments = {槽: uid}`。穿装备是 **`User.equipWeapon`**（不是 `PutOnEquipment`），卸不带槽位。

### 5.5 战斗
`ReqSelfBattleInfo` 必须回声 `npcID` + `npcArr` **26 格**（`t[23]=HardModel` 必须是数组，否则 `initRivalEntity` 抛 TypeError 被吞 → **战斗静默失败**）。
结算 `CheckBattleResult` 按 `npc.Drop` 发奖（同 npc 5 秒去重）。

### 5.6 开关字段（F1 事故）
客户端用 `hasOwnProperty("X")` 当开关的字段（`formulaID / mountID / taskID / gemId / isCollective / ...`）**缺省必须不发**：
发了 `formulaID:0` → `getItem(0,"formula")` 得 null → `Cannot read property 'name' of null`。

- `BeginTraining.isCollective`：**请求里有就原样回声，`0` 也必须发**（`0` 是语义分支：关门派练功界面、开普通练功 UI，`index.js:120523`）；
  请求**永远带它**（`120752/120759`）。`noteBadSwitches` 的"开关值不许为 0"对它误报 → `SWITCH_ZERO_OK` 白名单（带 `bundle:line`，只许减）。
- `BeginTraining` 拒绝码只能落在 1/2 之外；回调**还有 3**（`120569`，提示 423「[68]已经达到瓶颈了…」+ `getItem(skillID)`），文本不符且会崩 → 仍取 4。
- `BeginMeditation.hyTime` / `BeginTraining.hanyusuiTime` 是**契约**（少发 → `1e3*undefined`=NaN）。

### 5.6b 拒绝应答契约
**拒绝应答只许带 `{eRet}` ∪ 该动作白名单**（`dispatch` 的 `narrowReject()`，`bz-rpc-server.js:124`），且只对 `tools\facts\reject-codes.json` 里登记的 16 个动作生效。

| 动作 | 白名单 | 为什么 |
|---|---|---|
| `useItem` | `itemID` | 客户端弹提示要用 |
| `washAdditionalArr` | `attrList` | 它的 4 是 **flow**（弹"选洗哪条"），客户端要读 4 段字符串 |
| 其余 14 个 | 无 | 拒绝码分支里一条都不读 |

**为什么必须收窄**：`BeginTraining` 拒绝曾带 `{beginTime:0, skillID:0}`；`beginTime:0` 今天无害，但一旦有人把拒绝码改成 3，
客户端就会拿 `skillID:0` 去 `getItem(0,"skill")` 得 null 再读 `.Name` 崩 —— 那个 0 是我们自己发的。
代价是冻结基线会出现「发→不发」：已逐字段进 `approved-narrowing.json`（`escape:"closed"` + 客户端行号）+ 7 条 `planned-changes.json` 规则。
自检兜底：`shape:<动作>:rejectKeys`。

### 5.6c 异常不许变成成功
`dispatch` 的 `catch` 四件事，缺一不可：
① `_catchCount++`（R5c 探测器）；② `_save = null`（丢内存缓存 → 下次 `loadSave()` 从盘上重读）；
③ `repushLive(loadSave())` 把权威值**重推给活客户端**（handler 可能已走过 `RoleBaseInfo` 那条第二出口），**每一段各自 try**（否则 push 抛异常会吞掉应答）；
④ 回**该动作推导出的 `catchCode`**（`tools\derive_catch_codes.js`：∉ success ∪ handled ∪ codes；目前只覆盖 16 个动作），
   推导不出就**不回 eRet**并写 `⚠ catchNoCode`（回错码会让客户端走进错误分支）。

### 5.7 时装
按 `fashionall.type` 分页：`[]`=常驻(16)、含 1=限时(130)、含 2=战令(39)；只含 3/4 的 81 件三页都不发。
`FashionArr[i] = [物品id, 限时剩余天数]`；**type==1 必须带 `FashionTimeMap`**（缺了客户端 `e[1]` 抛 TypeError → 整页空白）。
`BuyFashion` 应答**必须带 `note.eqch`**。

### 5.8 货币 id → 钱包
`getItemNum` 特判：`1→gold`、`4001→coins`、`4003→potential`（**eco 键是 `ptt`**）、`8888→yuanbao`、`4002`=经验（存档无此字段 → `eRet:4`）。
发奖走 `grantCurrency()`，**绝不能** `grantItem()`（会写进 `bag`，客户端只读钱包）。

### 5.9 时间字段
客户端用 `getSTimestamp() - startTimestamp` 算时长；`beginTime` 默认值填常量或 0 都会"一进去就完成" → handler 回 `env.now()`。
`getSTimestamp()` = `0==sserverT||0==startTime ? Date.now() : sserverT+Date.now()-startTime`。

### 5.10 物品效果族（2026-10-23 新增，**这是"还原原版功能"的主线**）
数据入口：`tools\cfg\dump\item.full.json`（live dump 全量 **6525 行**，字段 `ID/Name/Type/Effect/Data1..5/...`）
→ `tools\facts\item-effects.json`（压成 `{id:{e,d1,d2,d3,t,n}}`，76 个 Effect 码）
→ 构建期注入 `BZ_ITEMFX = {itemID: [Effect, Data1, Data2, Data3]}`（只收 **Type==2**，因为客户端整段 `switch (e.Effect)` 只在 `2 == e.Type` 时执行）。

| Effect | 语义 | 状态 | 依据 |
|---|---|---|---|
| 1 | 食物（Data1=饱食度） | ✅ | `BZ_ITEMEAT` |
| 2 / 3 | 回血 / 回内（Data1=数值） | ✅ | `BZ_ITEMFUN` |
| 11 | 秘籍（Data1=技能 id） | ✅（**已学会分支错，见 §7-19**） | `BZ_ITEMSCH` |
| **5** | **师门秘籍**（Data1=技能 id） | ✅ 本批 | `index.js:64342-64347`：`SkillTable.dic.hasOwnProperty(e.Data1)` → 提示 243 拦截；`getItem(e.ID,"master_book")` 判 `Condition/Menpai` |
| **28** | **称号**（Data1=title id） | ✅ 本批 | 名字判据：7027=「"烙饼试吃员"称号」、7026=「"测试员"称号」；`player_title` 表 2044/2045；应答带 `titleID`（`index.js:64812`） |
| 13 | 礼包/宝箱（Data1=自身 id 或另一 item） | ⛔ 未实现 | 客户端**零本地逻辑**（无 case 13、无 default）→ 语义全在服务端；缺"礼包表"名（R18 Q1） |
| 15 | 美肤/祛疤？（`numDeaths==0` → 提示 4374「没有伤痕,不需要使用美肤露」） | ⛔ 未实现 | 物品 3020「嫦娥月饼」名字与语义不符，待 R18 Q3 |
| 24 | 兔子炸弹等 | ⛔ 未实现 | 战斗道具栏可达（GATED/SEND） |
| 6 / 8 | 各 1 件 | ⛔ 未实现 | 有前置拦截（满血 / 幸运值） |

**可达性口径**（`tools\facts\obtainable.json`，全表域 6525）：可获得 2515 / 未建模 6296 / `N=2386`（其中 1785 件只有"整 handler 高估"来源）；
**未建模∧可达（Type==2 ∧ Effect∈SEND∪GATED）= 3263，其中可获得 715**；**账本里现存∧未建模∧可达 = 2 件**（`3020`/Effect 15、`7027`/Effect 28，后者已做）。

**活动窗口平移**（时间炸弹）：`templates.json` 的 `create.activityResource` 是抓包真值（活动 67 结束=2026-10-28），
静态值会让活动几天后全关 → `rebaseActivityWindows()` 按 `delta = now - 抓包 serverTime` 整体平移（常量 `REBASE_ACTIVITY_WINDOWS`，一行回退）。
live 实测：`{"67":[null,1793301157473]}` = now + 7 天。

---

## 6. 回归与验证

### 6.1 一条命令
```powershell
cd F:\BaoZouyxt; node tools\acceptance.js     # 35 项：32 套 test + 冻结 + 拒绝码 + 兑换
```
输出 `ACCEPTANCE OK 项=35 绿=35 已知红=0 cap=0`。规则（全部带棘轮）：

| 规则 | 内容 |
|---|---|
| K1 / K2 / K3 | 已知红项按 `file + assertSha8 + msgSha8` 三元组匹配（行号只作信息）；新增红 → FAIL；修好不删登记 → FAIL；同文件冒出第二个红 → FAIL |
| K-cap | 登记条目数 ≤ `known-red-cap.json` 的 cap（**基线取历史最低值**，防止"扩容跑红一次"洗白）；cap 只许降 |
| G3 | `known-red-history.jsonl` 只追加；同条目连续 ≥3 行仍在 → FAIL（滞留） |
| G5 | cap 增加时要求 `guardHash` 与上一行相同（口径 `guardVer` 变更时打印 SKIP，不冒充 PASS）；`guardHash = sha1(implVer + check_*.js + test/*.js + golden/*.json)` |
| `--update` | **拒绝实现**（只许人工改登记表） |

### 6.2 自检 1242 项（每次 reload 跑）
覆盖动作存在 / `eRet` / 字段齐全 / **形状来源** / 任务+物品+装备闭环 / 维护动作不写盘 / **开关字段不许被 fill 补出来** /
**货币奖励不许进背包** / **潜能 eco 键必须是 `ptt`** / **live 进程 `now()` 必须等于真实时钟** / **`shape:*:rejectKeys`**。
判绿三件套：`failed=[]` + 必需检查 id 齐全 + `missingRequired=[]`。

### 6.3 形状冻结 C1–C13（改形状层前必跑）
`tools\golden\`：`emission.json`（337 动作 × 空请求的应答）、`evidence-sha1.json`、`expected-stats.json`、
`shapes-normalized.sha1`、`required-checks.json`、`fixed-clocks.json`、`approved-widening.json`、`approved-narrowing.json`（21 条）、
`planned-changes.json`（7 条规则）、`known-red*.json`。
要点：C3b「发→不发」必须 `escape:"closed"` + 客户端行号；C7/C8 值变化必须被清单规则**逐项** `allowSigma`；
C13 扫 `tools/**.js`（**含 golden 目录与点文件**）+ `hotfix-patch/{core,test}/*.js`，只允许登记过的固定时钟。

### 6.4 拒绝码表（`tools\facts\reject-codes.json` + `check_reject_codes.js`）
16 动作 / 17 条目（reject 16 + flow 1），每条带 `ev`（行号 + 该行 sha1 前 8 位）。
`R1`（码不在成功集）/`R2` 三态（有提示码→tier1；有提示码但不用→必须写 `tierWhy`；无提示码→tier2）/
`R3`（defaultCode 推导）/`R4`（证据行哈希）/`F1-F3`（flow 码）/`R5b+`（87 handler 静态扫描，拒绝点 31 处 ⊆ 表）。
`R5`（动作×原因夹具 + 业务哈希）**未实现**，脚本每次打印。

### 6.5 R5c（`test\r14-catch-smoke.js`）
87 handler × {空请求, 字段类型全错请求} + 两个定点用例：① 注入"改档再抛异常"的 handler（断言 catch 计数 +1、eRet≠1、存档不变、内存回滚）；
② 未建模消耗留痕（`CONSUME_UNMODELED`）。断言：`catchCount` 不涨 / `eRet ∈ {1}∪登记码` / 拒绝不写档。

---

## 7. 已知缺口（"为什么不能做"比"没做"更重要）

| # | 缺口 | 现况 |
|---|---|---|
| 1 | 每日任务链（活动面板完成/领奖） | 面板 18 条 0 进度；动作族未取证 |
| 2 | ~~兑换 118 行货币奖励是假的~~ | **已修**（走钱包 + `note.eco`；验收器 118/118） |
| 3 | 形状表作用域化（47 个冲突字段） | 前置 `tools\span_gain.js` 尚未写；`R≤10` 就只做覆盖表 |
| 4 | 成就进度 | 只有 3%（58/2113）能从存档推导，其余保持 0 |
| 5 | 七日活动 `taskObj` | 需要创建时间/第几天语义，未取证 |
| 6 | 秘籍"学技能"等级规则 | Effect 11 未学会→1 级（假定）；**已学会分支见 #19** |
| 7 | 未建模效果物品 | **用户裁定先不改行为**；按 Effect 家族逐个做（5/28 已做，13/15/24/6/8 待）；数据齐、语义缺（R18 Q1/Q3） |
| 8 | `Map=0` 入口不可达（江湖/兑换/转世 NPC） | 边界需用户裁定 |
| 9 | 转世/先天/洗点"内容侧" | 规则不在客户端 → 只做诚实拒绝 |
| 10 | 江湖/兑换的 `rank/reputation` 门槛 | 按 0 降级 |
| 11 | `includes` 异常（登录窗口 3 次） | 不崩、不影响游玩 |
| 12 | 饥饿跨重启 | `LoadGame` 无 hunger 字段 |
| 13 | `Repeat` 奖励上限 | `rewarded` 一次封顶 |
| 14 | ~~`core-test-server.js` 遗留红~~ | **已修**：根因是 T5 请求 `{skillID:1262}` 缺 `skillArr` → 无效分支；断言改成只锁"不写档"（不许把 `eRet:1` 固化成期望） |
| 15 | `EndMeditation`/`EndTraining` 无 handler | 请求不带时长；SOTA R10 Q1：每秒收益无来源时结算不能做 |
| 16 | `hyTime/hanyusuiTime` 依赖"没实现 buff"这个前提 | 实现买 buff 1043 时必须改成剩余秒数 |
| 17 | C9b 未实现 / C9a 只是下界 | 371 是下界；别名/下标写法会漏 |
| 18 | `useItem` 未建模消耗的计数表 | 已有 `meta.consumeStats`（`CONSUME_UNMODELED`），cap 应为 0 |
| 19 | **Effect 11 已学会分支是错的** | `T ? b.ConditionUp : b.Condition` + 走 `ConsultUI`（`64383`/`64401-64417`）= 原版允许对已学会技能继续用；我们回 `eRet:5` 拒绝 → 书永远升不到 2 级。**卡点**：`ConsultUI` 不在 `index.js`，请求常量无法闭合（R18 Q2） |
| 20 | 87 动作的 `catchCode` 表 | 只覆盖 16 个；其余 71 个走"不回 eRet"兜底。且 `handled` 抽取只认 `X == eRet`，看不到 `!eRet`/不等号/末尾 else |
| 21 | `R5`（动作×原因夹具 + 业务哈希） | 口径已定（canon 计数组序、门控两态都测），未实现 |

---

## 8. 坑表（Top，完整见历史档 §9）

| # | 坑 | 对策 |
|---|---|---|
| ① | **拿 `ver` 判断"这次有没有改代码"** | 它把形状包一起算，而 `gen_shapes` 会写 `gen=<ISO>`；`built=` 每次不同 → **不是内容稳定的**。判"改了没"用**源文件 md5**。已修根因（`generatedAt` 用 GEN_NOW + 构建期断言"时间戳只许 GEN_NOW"） |
| ② | **catch 里回 `eRet:4` 当默认拒绝码** | 4 在各动作语义不同（支付拦截/弹选择框/解引用 item.Data2）。用 `derive_catch_codes.js` 推导；推不出就不回 eRet |
| ③ | **以为 `_save=null` 就是回滚干净** | 只回滚服务端账本；还要 `repushLive()` 把权威值重推给活客户端 |
| ④ | **把"扣了没效果"记成 REJECT** | 它真扣了、也写了档；用 `noteConsume()` → `CONSUME_UNMODELED` + `meta.consumeStats` |
| ⑤ | **用行号做"已知红"的键** | 加一行注释就全错位；键必须 `file + assertSha8 + msgSha8` |
| ⑥ | **`BZ_ITEMFX[id][0]` 直接取值** | Type≠2 的物品不在表里 → TypeError；写 `(fx||[])[0]` |
| ⑦ | **把抓包静态时间当"永久有效"** | `activityResource` 会在几天后过期（活动全关）；按 `now - 抓包 serverTime` 平移 |
| ⑧ | **用 PowerShell `Set-Content` 改含中文文件** | 会写坏 UTF-8 / 加 BOM；含中文的源码/JSON 只用 edit/write 工具 |
| ⑨ | **变异运行会写产物** | `BZ_MUTATE` 必须零写入 + C1b 断言产物 md5 不变 |
| ⑩ | **补了新 handler 就以为完事** | `fillShape` 会用**从别的动作借来的**默认值兜底；新 handler 必须显式给关键字段 |
| ⑪ | **Node 的 piped stdio 在本机沙箱下失败** | `child_process` 用 `stdio:'pipe'` 会被拒；改用文件描述符 |
| ⑫ | **残留 `bz_cmd.txt` 每次启动重放** | boot-2 已根治：开机丢弃 + 删不掉就拒绝执行 |

**跑探针三条铁律**：① 禁全图 BFS（`Set` 判重 + 限量）；② 超时后先清残留命令文件；③ 探针文件只用 `edit`/`write` 改。

---

## 9. 回滚与备份

- 每次改动前备份到 `_backup\<时间戳>-<pre|post>-<改动名>\`（含源文件 + md5；设备存档必要时一起）。
- 本轮相关：`2026-10-23-0311-c4-leftover`（两个 C4 遗留临时文件）、`2026-10-23-0301-post-r16`、`2026-10-23-0227-post-r15`、
  `2026-10-23-0206-post-r14`、`2026-10-23-0135-post-r13`、`2026-10-23-0129-pre-r13`。
- 回滚代码 = 拷回源文件 → （动过形状分类才要 `classify_fields` + `gen_shapes`）→ `node build-handlers.js` → `.\run.ps1 handlers` → `node tools\check_shape_freeze.js`。
- 回滚存档：`bzPatch` / `bzSeedBag`，或推回备份的 `bz_offline_save.json`。
- **卸载补丁（恢复原版）**：`adb shell rm -rf /data/data/com.maple.madherogo/files/hotfix`。

---

## 10. 工具与数据索引

| 工具 | 作用 |
|---|---|
| `tools\acceptance.js` | ★ 一条命令跑完全部验收 + K-cap/G3/G5 棘轮 |
| `tools\check_shape_freeze.js` | ★ 形状冻结 C1–C13（`--freeze` / `--diff` / 默认校验） |
| `tools\check_reject_codes.js` | 拒绝码表断言 R1/R2（三态）/R3/R4/F1-F3/R5b+ |
| `tools\check_exchange_currency.js` | 货币奖励验收器（118/118） |
| `tools\derive_catch_codes.js` | 从拒绝码表**推导**每动作 catchCode（构建期与测试共用） |
| `tools\gen_shapes.js` / `classify_fields.js` | 形状生成 / 字段分类（含 `inputDigest` 闸门、`BZ_MUTATE` 变异） |
| `tools\gen_task_rewards.js` | 生成 `BZ_TASKS / BZ_ITEMTYPE / BZ_NPCDROP / BZ_NPCSHOP / BZ_EXCHANGE / …` |
| `tools\gen_item_effects.js` | `item.full.json` → `tools\facts\item-effects.json`（6525 物品 / 76 码） |
| `tools\gen_obtainable.js` | 可获得性事实表（域 6525；N=2386；可达 3263/可获得 715；三条硬要求自检） |
| `tools\docx2txt.js` | SOTA 回执 `.docx` 抽文本 |
| `tools\decrypt_bundles.js` / `xxtea.js` | 解客户端 bundle（密钥 `7ca36578-7b3a-4c`） |

**数据**：`tools\cfg\dump\`（442 表 + `item.full.json`）、`tools\facts\`（`item-effects` / `obtainable` / `reject-codes` / `effect-branches` / `lookup-keys`）、
`tools\golden\`（冻结基线 + 审批表 + 已知红 + 固定时钟）。
**客户端源码三包**（330k 行，已解密）：`tools\index.js` / `scripts2.js` / `scripts3.js`。
**SOTA**：`docs\sota\inbox\`（R05–R17 回执）、`docs\sota\outbox\`（`14-R07` … `25-R18` 已发；**下一个 26-R19**）。

---

## 11. 下一轮第一件事

> **2026-10-23 已完成九批**（R13→R17 五轮 SOTA 往返 + 四批功能/工程）：
> ① 货币奖励 bug；② 冻结断言 C1–C6；③ C7/C8/C10–C12 + 输入摘要闸门；④ 四个时间字段 handler；
> ⑤ C13 + 必需 id 闸门 + `useItem` 顺序；⑥ **R13**：`isCollective` 0 回声 + 副作用原子化 + 拒绝可观测；
> ⑦ **R14**：拒绝应答收窄 + 选码按"动作×原因" + **catch 不再吞成成功** + `ver` 内容稳定；
> ⑧ **R15**：catchCode 推导 + `repushLive` + `CONSUME_UNMODELED` 分表 + known-red 键改 sha（cap 0）+ **item.Effect 全量解锁**；
> ⑨ **R16/R17**：`guardHash` 口径 v2（纳入 `test/`）+ 全表重算可获得性 + **Effect 5（29 件）与 Effect 28（2 件）落地** +
> **活动窗口平移（时间炸弹）** + C13 盲区修复。

1. **Effect 11 已学会分支**（§7-19）：影响**已经建模**的物品，玩家"书留着却升不到 2 级"。卡点在 `ConsultUI` 不在 `index.js`；
   下一步：先 dump `level.json`（封顶字段）+ 在客户端资源里找 `ConsultUI`（或按 R18 Q2 的裁决直接在 `useItem` 里 +1 级）。
2. **87 动作的 catchCode 表**（§7-20）：先扫 71 个动作的调用点分三类（内联回调 / 只发不收 / 从不发送），再扩 `handled` 抽取到 `!eRet`/不等号/末尾 else。
3. **Effect 13（礼包）**：客户端零本地逻辑，缺礼包表名（R18 Q1）。筛法：在 442 张表里找"以 6625/6810/7105/7106/7226 为主键且行内含 itemID 数组"的表。
4. **3020（Effect 15「嫦娥月饼」）**：名字与语义不符，等 R18 Q3。
5. **`EndMeditation` / `EndTraining` 只读取证**（R10 §4：M1 上线前至少完成）。材料：`docs\audit\end-actions-hytime.md`。
6. **`R5` 夹具**（§7-21）与 **`tools\span_gain.js`**（§7-3 前置）。

**每轮收工必做**：备份到 `_backup\<时间戳>-post-<改动名>\`（带 md5）+ 更新本文件 §2 真值 +
核对 `HANDOVER.md` / `core\bz-rpc-server.js` 的 md5 有没有被工人动过 +
确认 `node tools\acceptance.js`、`node tools\check_shape_freeze.js`、`node build-handlers.js` 都是退出码 0。
