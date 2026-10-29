# 交接文档 —— 《暴走英雄坛》进程内离线单机

> **本版是「当前真相」重写版 v2**（2026-10-23 01:20 系统时钟 / 文档时间线同日）。
> 上一版（v1，349 行）在 `_backup\2026-10-23-0116-pre-handover-rewrite-v2\HANDOVER.md`（md5 `CB934600`）。
> 再上一版（2249 行追加式历史，§0–§23）在 `docs\HANDOVER-full-history-20261022.md`。
> 需要"某次事故当时怎么查的"去历史档搜；需要"现在是什么状态、怎么开工"读本文件就够。

---

## 0. 30 秒上手（照抄这几条）

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force   # 每个新 pwsh 都要
cd F:\BaoZouyxt\hotfix-patch
.\run.ps1 status                    # pid / scene（**版本别看这里**，热重载不刷新 ready.json）
.\run.ps1 cmd "ver"                 # 版本看这条：{"impl":"hcf51452f","flow":"ffaec47c3","scene":"gamescene"}
.\run.ps1 cmd "state"               # 存档真值（账本 + meta.actionStats）
node test\r06-medicine-scholar.js   # 抽一套回归，退出码 0 = 通
```

改一行应答的完整循环（≈10 秒，**不重启游戏**）：

```powershell
cd F:\BaoZouyxt\hotfix-patch
$env:BZ_PROBE='0'; node build-handlers.js     # 构建 + 进程内自检（必须 HANDLERS OK selfCheck=1234）
.\run.ps1 handlers                            # 推送 + 热重载（断言 pid 未变）
```

**改了形状层（`tools/classify_fields.js` / `gen_shapes.js` / `bz-handler-impl.js`）就要多两步**，顺序不可换：

```powershell
cd F:\BaoZouyxt
node tools\classify_fields.js        # 1) 分类（会写 facts/field-classes.json 并带 inputDigest）
node tools\gen_shapes.js             # 2) 生成形状（会校验 inputDigest，不一致直接中止）
cd hotfix-patch; $env:BZ_PROBE='0'; node build-handlers.js   # 3) 构建
cd ..; node tools\check_shape_freeze.js                        # 4) 冻结断言（C1–C13）
```

---

## 1. 项目边界（没变，先读）

**唯一目的：让用户本人在自己的电脑上，离线单人游玩《暴走英雄坛》。**

| 会做 | 明确不做 |
|---|---|
| 在本机模拟器内运行**官方原版**客户端 | ❌ 不分发 APK、不提供下载源、不做安装包 |
| 在客户端**自己的可写目录**放一个本地补丁 | ❌ 不修改 APK 本体、不重签、不改资源与剧情 |
| 由补丁在**游戏进程内部**应答游戏自身的网络请求 | ❌ 不架设对外服务器、不监听公网端口、不运营私服 |
| 把存档写进本机文件 | ❌ 不绕过、不伪造任何付费/充值/订单 |
| 数值改动只作用于**本机存档** | ❌ 不售卖、不订阅、不提供任何付费服务 |

支付类动作（`*Pay*` / `*Order*` / `*Recharge*` / `*Iap*` / `*Jetton*`）**一律不实现**：`dispatch` 里
`PAY_ACTION_RE` 强制回 `eRet:4`（明确失败）并记 `PAY_BLOCKED`，绝不伪造"充值成功"。

---

## 2. 当前状态真值（2026-10-23 01:20）

| 项 | 值 |
|---|---|
| 部署 | `boot-2 / impl=hcf51452f / flow=ffaec47c3`，`pid 29928`（热重载，未重启），`scene=gamescene`，`implErr=null / flowErr=null` |
| 自检 | `failed=[]`、`checkedCount=1234`；**判绿看这两项，不看 `passed` 数字**（数字随数据/形状变动） |
| 回归 | **32 条自动化全过**：27 套 `test\*.js` + 兑换验收器 + 形状冻结断言 + 分类器 + 生成器 + 构建 |
| 真机日志 | `bz_log.jsonl` 有轮转上限；当前 `err=0` |
| 存档 | `roleID=16374`、`name=FZhou`、`saveVersion=4`、`coins=11155859`、`gold=5099799`、`yuanbao=1000`、`potential=84599`、`contribution=0` |
| 背包 | `{1301:2, 1501:1, 3003:52, 3007:13, 3020:17, 3626:1, 4014:1, 4015:1, 4016:1, 4020:5, 4101:1, 7027:1}` |
| 装备 | `playerEquip` 5 项：`1001:[1,1] 2001:[1,2] 2302:[1,2] 2501:[1,1] 2601:[1,1]`；`equipments` 槽 1/2/5/7/8 已占用 |
| 技能 | `{1:[40,0,1], 7:[40,0,1], 8:[40,0,1], 1112:[41,0,1], 1262:[1,0,1], 1263:[1,0,1]}` |
| 任务 | `accepted 21`、`done 19`、`rewarded 16`（主线卡在「和跟踪者对话」） |
| 场景 | 平安镇西 |
| `baseValueAy` | **长度 44（索引 0..43）**。非零项：`[0]="9900012358565"`、`[1]="FZhou"`、`[3]=1`、`[4]=286`、`[5]=311`、`[6]=318`、`[7]=40`、`[8]=20`、`[9]=10`、`[10]=10`、`[11..13]=100/100/80`、`[15]=20`、`[19]=50`、`[20]=13`、`[24..25]=100`、`[27..28]=600`。⚠ **旧文档说"[44] 是地图 id、[45][46] 是出生坐标"与实测不符（数组只有 44 项）** —— 待复核，不影响玩法 |
| 未持久化字段 | `hunger` / `hungerMax` 存档里没有（见 §7-12） |

### 2.1 玩家现在能玩到哪（端上实测过的才写 ✅）

| 系统 | 状态 | 备注 |
|---|---|---|
| 冷启动进游戏 | ✅ | ready 3 s、进 `gamescene` ≈16 s；有档直接进 |
| 战斗 | ✅ **用户实测通过** | 客户端全本地模拟；我们只管开战给 26 格数据 + 结算按 `npc.Drop` 发奖 |
| 任务（接 / 推 / 交 / 领奖） | ✅ | 交任务不扣 `SpRequire`（派生叠加，§5.3）；`Repeat≠0` 可重复接 |
| 商店·普通（Type 2/20/36/38/51/55/70） | ✅ | 本地配置货架；买按 `BuyPrice` 扣银两 |
| 商店·NPC 金条（Type 26 `getShopItem`） | ✅ 协议层已验 | 4 摊贩 / 374 件；**UI 未肉眼验**（镇上走不到那个摊） |
| 商店·流言(33/35)、兑换、正邪、江湖 | ✅ 协议层 + 单测 | **入口 NPC 的 `Map=0`，玩家走不到**（§7-8） |
| 兑换发奖（货币 id） | ✅ 2026-10-23 修 | 118 行货币奖励改走钱包 + `note.eco`（§7-2） |
| 时装（裁缝铺三页 + 购买） | ✅ **端上实测** | 常驻 16 件/金条、限时 130 件（当前全售罄）、战令 39 件/1 券；买完重启仍在 |
| 背包 / 食物（饱食度）/ 药品（回血回内） | ✅ **端上实测** | 走 `note.ivch`（绝对值）+ `note.attrch`；**顺序已于 2026-10-23 改为"先算效果再扣再落盘"** |
| 出售（含装备回收）/ 快速购买 | ✅ | 按 `item.Price` 进银两 |
| 打坐 / 练功 | ⚠ **能开始，不能算可用** | 2026-10-23 补了 `BeginMeditation` / `BeginTraining`：`beginTime=env.now()`、`skillID` 校验后才回声、`isCollective` 按请求回声。但 `hyTime/hanyusuiTime` = **寒玉髓 buff(1043) 剩余秒数**（我们没实现 buff 系统），且 `EndMeditation`/`EndTraining` **无 handler → 不结算**（§7-3e） |
| 小孩玩耍 / 雇佣挂机 | ⚠ 只修了时间基座 | `beginPlayGame` / `checkHireOnhook` 已补最小 handler（`beginTime=env.now()`），其余字段靠形状兜底；**未端上验** |
| 成就面板 | ✅ 能开，**全 0 进度** | 78%+ 条目客户端不本地计算（§7-4） |
| 活动面板（每日任务） | ✅ 能开，18 条 0 进度 | 完成 / 领奖动作链未实现（§7-1） |
| 洗点 | ⚠️ 能点通但洗不出东西 | `bloodArr` 非零来源是转世，转世规则不可得 |
| 转世 / 特殊转世 | ⛔ 诚实拒绝 | `isCycleLife→2`、`cycleLife→9`、`specialCycleLife→9`（回 4 会被客户端静默丢弃） |
| 秘籍（学技能） | ⚠ 部分 | 技能已在账本 → `eRet:5` **不扣物品**；不在 → 学会 1 级（"1 级"是假定） |

---

## 3. 架构

```
设备端 /data/data/com.maple.madherogo/files/
├── hotfix/
│   ├── jsb-adapter/jsb-engine.js     引导层（309 KB，改动要重启）
│   └── live/
│       ├── handlers.js               策略层（≈856 KB，热重载 0.2–0.5 s）
│       └── flow.js                   流程层（17 KB，同上）
├── bz_offline_save.json              存档（单文件：账本 + meta）
├── bz_log.jsonl                      结构化日志（**有轮转上限**，别指望长期留档）
├── bz_cmd.txt / bz_res.txt           命令通道（boot-2 起：开机会丢弃残留命令）
└── probe_arg.txt                     探针参数（**必须 UTF-8**）

F:\BaoZouyxt\hotfix-patch\           源码工程
├── hook\bz-bootstrap.js             薄引导：命令通道 / XHR 替换 / 异常捕获 / JSONL / reload
├── hook\bz-xhr.js                   传输层（只认 __BZ_HARNESS__.impl.handle 契约）
├── hook\bz-codec.js                 线协议（aes-js + lz-string）
├── core\bz-rpc-server.js            ★ 业务：**87 个 handler**（83 + 本日新增 4）+ 形状分发 + 信封 + 账本 + 守卫
├── core\bz-handler-impl.js          策略层契约（handle/selfCheck/reset/state）+ 自检 1234 项
├── core\bz-shapes.generated.js      ★ 形状层（tools/gen_shapes.js 生成，勿手改）
├── core\bz-tasks.generated.js       ★ 数据面（tools/gen_task_rewards.js 生成，勿手改）
├── core\templates.json              抓包真值模板（7 个关键动作）
├── live\flow.js                     流程层：选区→进游戏→建角向导→剧情→gamescene→关公告
├── build.js / build-handlers.js     构建（后者含自检 + 必需检查 id 闸门）
├── run.ps1                          ★ 宿主侧唯一入口
└── test\*.js                        27 套回归（§6.2；`core-test-server.js` 遗留不在基线）

F:\BaoZouyxt\tools\                   研究与生成工具（§10）
├── golden\                           ★ 形状冻结基线（emission / 证据 sha1 / 计划清单 / 审批表 / 固定时钟登记）
├── facts\                            分类产物 + 查表键超集
└── cfg\dump\                         442 张配置表（22.5 MB）
F:\BaoZouyxt\docs\sota\               SOTA 往来（inbox = 回执原文，outbox = 我方材料）
```

**六条设计原则（别走回头路）**
1. **机制与策略分离**：引导层只转发到 `__BZ_HARNESS__.impl`，策略层从 `handlers.js` 动态求值 → 换 impl 不重启。
2. **可观测性**：所有动作/异常/场景都写 JSONL；断言对日志做，不对截图做。
3. **大声失败**：未实现动作写 `UNKNOWN User.X p={...}`；形状表里也没有才走通用 ACK。
4. **形状是契约、不是实现**：`dispatch` 先 handler、再 `fillShape`（只补缺不覆盖）；**开关类字段一律不填**（§5.6）。
5. **改形状层之前先有冻结断言**（2026-10-23 立）：没有 `check_shape_freeze.js` 全绿，不许动分类器/生成器。
6. **登记制必须带棘轮**：任何"登记表"（已知缺口、审批表、上限值）都要满足"新增即 FAIL、修好后不删登记也 FAIL、总数只许降"。

---

## 4. 常用操作（`run.ps1` 是唯一入口）

```powershell
.\run.ps1 status                 # pid / ready / 最近日志（ready 里的 impl 是开机时的，热重载不刷）
.\run.ps1 cmd "ver"              # 版本（判热重载是否生效就看这条）
.\run.ps1 cmd "state"            # 打印存档 JSON
.\run.ps1 handlers               # 推 handlers+flow → reload → 断言 pid 不变
.\run.ps1 all                    # 推引导层+策略层 → 重启 → 等 ready（**只有改引导层才需要**）
.\run.ps1 restart                # force-stop + 启动 + 轮询 ready
.\run.ps1 log -Tail 40
.\run.ps1 probe .\probe\xxx.js [arg]     # 进程内执行探针，回传结果
```

**维护动作（游戏协议里没有，只能从命令通道打）**

```powershell
$js = 'get:(function(){var b=__BZ_CODEC__.encode(JSON.stringify({mod:"User",do:"<动作>",p:{...}}));var r=__BZ_HARNESS__.impl.handle({url:"https://bzgf.maple-game.com/900-server-166/x",body:b});return JSON.parse(__BZ_CODEC__.decode(JSON.parse(r.text).MsgData));})()'
.\run.ps1 cmd $js
```

| 动作 | 作用 |
|---|---|
| `bzSeedBag {itemObj:{id:n}}` | 灌物品（**唯一正规的"加物品"入口**，别拿 buyShopItem 当免费灌） |
| `bzGrantCur {gold,yuanbao,coins,contribution}` | 增减货币（负数可扣、下限 0） |
| `bzPatch {set:{...}, del:{...}, delTop:[...]}` | 定点改档（**只写顶层键**：改背包必须 `set:{bag:{完整对象}}`） |
| `bzBackfillRewards` | 补发"已完成但没发"的任务奖励（幂等） |

四个维护动作（`bzSeedBag` / `bzGrantCur` / `bzPatch` / `bzBackfillRewards`）**都先调 `backupBeforeMaint()`
写 `<save>.pre-maint.json`（滚动一格）再 `persist()`** —— 这是唯一的回滚位，别覆盖它。

---

## 5. 协议与账本契约（写错会**清档**的那些）

### 5.1 线协议
`{mod:"User", do:"<Action>", p:{...}}` → LZString(Base64) → AES-256-CBC → Hex；
Key `120734aa834dea925ca8d2e1bb6811c3` / IV `33daee8409834c00`。
信封按 **URL** 区分：入口服 `:9898` → `{MsgData}`；账号/游戏服 → `{code:200, MsgData}`（少了 `code` 客户端静默丢弃）。

### 5.2 `note` 各子表的语义（事故出处：20 个卖 1 个被写成 1 个）
客户端把应答 `note` 的**每个键当事件名派发**（index.js:59325）：

| 键 | 语义 | 写错的后果 |
|---|---|---|
| `ivch` | `{物品id: **新数量（绝对值）**}`，0 = 删除 | 发"变动量" → 数量被覆盖 → **能反复卖** |
| `eqch` | `{uid:[0]}` 删除 / `{uid:[1,[type,num]]}` 添加 | 形状错 → 装备不落地 |
| `eco` | `{coins,gold,exp,ptt,chips,yuanbao: **新余额**}` | 钱包不变 |
| `attrch` | `{hunger, curhp, curmp, hplmt, hpbase, mpbase, exp, ptt, luck…}`（24 键，142391-142500） | 食物/药品没效果（客户端**不做本地应用**） |
| `skch` | `{技能id:[lv,pgr,brlv]}` | 学技能没提示（**只弹提示、不写模型**） |

**`eco` 只认这 6 个键**（index.js:64698-64725 的 switch），并且**六个分支全是赋值不是累加**
（`64701/64705/64709/64714/64718/64722` 都是 `X = e[o]`）：
- **潜能键是 `ptt`**，存档字段却叫 `potential` → 发 `eco.potential` 会被**静默丢弃**（2026-10-23 修，`upgradeSkill` 三处已改成 `ptt`）
- 发"新余额"是对的；真累加才会翻倍（这条曾被 SOTA 质疑，逐行核对后排除）

### 5.3 三个"重建入口"的格式（同名字段两套格式，写错不报错、只静默失效）
| 动作 | 必须回 | 格式陷阱 |
|---|---|---|
| `User.LoadGame` | `finishTaskObj` / `acceptTaskArray` / `acceptTaskOrder` / `taskLog` / `itemObj` / `PlayerEquip` / `equipments` / `cycleObj` / `OnhookObj.serverTime` / `baseValueAy(≥48)` | `finishTaskObj` 要**字符串数组** `["101080,1"]` |
| `User.sycnTask` | 同上四件套 | `PlayerFinishTaskObj` 要**对象** `{"101080":1}` |
| `User.sycnPlayerItemData` | `itemObj` = **全部持有物** | 回空 = 客户端先清空再重建 = **背包清空** |

**派生叠加（P0 契约）**：接任务**不写**背包、交任务**不扣** `SpRequire`；差额只出现在
`LoadGame` / `sycnPlayerItemData` 的投射里（同物品取 max）→ 净变化天然为 0。

### 5.4 装备两本账
`PlayerEquip = {uid: [type, itemID, attrs, crystalIds, weaponSkinId]}`（`type==1` 无属性、`uid==itemID`、`num=data[1]`）；
`equipments = {槽: uid}`。穿装备客户端发的是 **`User.equipWeapon`**（不是 `PutOnEquipment`），卸不带槽位。
**属性全来自 item 表 `Property1..5 / Data1..5`**，`type==1` 的 `[1,num]` 结构是对的。

### 5.5 战斗
`ReqSelfBattleInfo` 必须回声 `npcID` + `npcArr` **26 格**（`t[23]=HardModel` 必须是数组；否则
`initRivalEntity` 抛 TypeError 被 MessageCenter 吞掉 → **战斗静默失败**，用户实测过）。
结算 `CheckBattleResult` 按 `npc.Drop` 发奖（同 npc 5 秒去重）。

### 5.6 分支选择器字段 / 开关字段（F1 事故）
客户端用 `hasOwnProperty("X")` 当开关的字段（`formulaID / mountID / taskID / gemId / isCollective / ...`）**缺省必须不发**：
发了 `formulaID:0` → `getItem(0,"formula")` 得 null → `Cannot read property 'name' of null @ index.js:64796`。

**2026-10-23 新增两例**：
- `BeginTraining.isCollective`：值是 `0` 时会**关掉门派练功界面**（`index.js:120523`）→ 只按请求回声存在性（请求为真才发）
- `BeginMeditation.hyTime` / `BeginTraining.hanyusuiTime`：数值来自"寒玉髓 buff 剩余秒数"，不是可选字段（少发 → `1e3*undefined` = NaN）

### 5.7 时装（GetFashionList / BuyFashion）
- 按 `fashionall.type` 列分页：`[]`=常驻(16)、含 1=限时(130)、含 2=战令(39)；只含 3/4 的 81 件三页都不发。
- `FashionArr[i] = [物品id, **限时剩余天数**]`（不是"已拥有"）；**type==1 必须带 `FashionTimeMap`**
  （`{"起_止":[id,...]}`，缺了客户端 `getFashionTimeType` 的 `e[1]` 抛 TypeError → 整页空白）。
- `BuyFashion {itemObj:{槽:[物品id,页签,档位]}}`：页0 扣金条 `price`；页1 档位≠2 扣金条、档位 2 扣 7298 券；
  页2 扣 7851 券。应答**必须带 `note.eqch`**（客户端先 `getEquipmentInfo(id)` 取装备实例，否则 `.id` 崩）。

### 5.8 货币 id → 钱包（2026-10-23 立，§7-2 的成果）
`getItemNum`（index.js:106347-106360）对这几个走特判，**从不读 `_itemObj`**：

| 货币 id | 钱包字段 | `note.eco` 键 |
|---|---|---|
| `1` | `gold` | `gold` |
| `4001` | `coins` | `coins` |
| `4003` | `potential` | **`ptt`** |
| `8888` | `yuanbao` | `yuanbao` |
| `4002` | 经验——**存档没有该字段** | 无 → 明确 `eRet:4` 不扣成本 |

发奖路径遇到货币 id 必须走 `grantCurrency()`（写钱包 + `note.eco`），**绝不能** `grantItem()`（会写进 `bag`，
客户端只读钱包 → 玩家付真道具换到"永远不生效的假物品"）。

### 5.9 时间字段契约（2026-10-23 立，`beginTime` 那一族）
- 客户端把应答的 `beginTime` 存进 `startTimestamp`，再用 **`getSTimestamp() - startTimestamp`** 算已进行时长：
  `scripts2.js:47303`（`(duration-(getSTimestamp()-o))/1e3`）、`scripts2.js:58268`、`scripts2.js:13167/13178`、
  `index.js:51516`。⇒ 默认值无论填**常量**还是 **0**，都会让"已进行时长"巨大 → 一进去就"已完成"。
  **唯一正确解**：handler 回**请求时刻** `env.now()`。
- `getSTimestamp()` = `0 == sserverT || 0 == startTime ? Date.now() : sserverT + Date.now() - startTime`
  （`index.js:136545-136547`）⇒ `sserverT = 0` **回退本地时钟**，不会把客户端拨到 1970。
- `hyTime` / `hanyusuiTime` = **寒玉髓 buff(1043) 的剩余秒数**（`buff.json` 1043、`mall.json` 商品 2 给 `[1043,86400]`、
  `index.js:89056` `duration = 1e3 * t`）。我们没有 buff 系统 → 回 0 = "当前没有该 buff"，自洽；
  **一旦实现买 buff 1043 必须改成剩余秒数，否则会把玩家的 buff 清零**。

---

## 6. 回归与验证体系

### 6.1 四层断言
1. **进程内自检**（每次 reload 自动跑）：`failed=[]` 且 `checkedCount=1234`。
   覆盖：动作存在 / `eRet` / 字段齐全 / **形状来源** / 任务+物品+装备闭环 / 维护动作不写盘 /
   **开关字段不许被 fill 补出来** / **货币奖励不许进背包** / **潜能 eco 键必须是 `ptt`** /
   **live 进程 `now()` 必须等于真实时钟**（`clock:liveIsReal`，只在 `window.__BZ_HARNESS__` 存在时断言）。
2. **必需检查 id 闸门**（`build-handlers.js`）：`selfCheck` 回 `checkedCount`（构建期 `bz.selfCheckVerbose` 才回全量 id），
   构建时断言「已执行 id ⊇ `tools\golden\required-checks.json`（13 条）」。
   **为什么**：只比 `failed` 为空会被"条件不满足就跳过"绕过 —— 少跑一条检查，`passed` 变了但 `failed` 仍空。
3. **32 条命令级验收**：27 套 `test\*.js` + `check_exchange_currency` + `check_shape_freeze` + `classify_fields`
   + `gen_shapes` + `build-handlers`（退出码 0 才算过）。
4. **端上实测**（adb 点屏 + 截图 + JSONL 断言；截图在 `hotfix-patch\probe\shot_*.png`）。

### 6.1b 形状冻结断言 `tools\check_shape_freeze.js`（改形状层前必跑）
基线在 `tools/golden\`：`emission.json` = **337 个动作 × 空请求 `{}`** 的完整应答路径 → 值；
`evidence-sha1.json` = 303 个字段的证据行 + 该行 sha1 前 12 位；`expected-stats.json`；`shapes-normalized.sha1`。

| 断言 | 盯什么 |
|---|---|
| C1 | 6 条已知故障（`useItem.formulaID` / `FashionArr` / `notFriendPartnerData` / `groupPoints` / `dataArr` / `taskObj`）分类**字面量**比对（不读生成物） |
| C1b | **变异对照**：`BZ_MUTATE=reverse-merge` / `drop-evidence:formulaID` 跑分类器必须退出码 1，且**不许写产物**（比对产物 md5） |
| C2 / C2b | **不许放宽**：基线里没有的路径现在不许有；要放宽必须进 `approved-widening.json` 并带 `bundle:line` |
| C3 / C3b | diff 每一处都要有**可验证据**（证据行 sha1 与三包原文一致）；"发→不发"必须有逃逸结论（`approved-narrowing.json` 的 `escape:"closed"`） |
| C4 | 生成器**必须确定**：连跑两次逐字节相同（时间戳行归一化） |
| C5 | 统计量**现场重算**，防"99 变 87"那种口径漂移 |
| C6 | `__switch` 的键必须是（动作,字段）两段式，不许按字段名查 |
| C7 / C8 | **分支签名 sigma**（`num0/num+/arr0/obj0/absent…`）+ 计划变更清单：签名变的必须逐项列进 `allowSigma`；每条规则的 `expect` 必须精确匹配 |
| C10 | **冻结前**先跑 C7/C8，不过就拒绝冻结；成功后把清单规则归档到 `planned-archive\` 并清空 |
| C11 | 时间类字段作形状默认值必须 0 / 不发 |
| C11b | 被"减法消费"的字段（`beginTime`）所属动作**必须有 handler**；已知缺口登记在 `known-missing-handlers.json`（新增即 FAIL，补上不删也 FAIL） |
| C12 | 每个形状条目带 `src` 溯源（`handler:<本动作>` / `neutral` / `manual` / `promoted`）；跨动作继承只计数上报 |
| C13 | 固定时钟必须**登记用途**（`fixed-clocks.json`）：未登记 FAIL、登记了却不再出现也 FAIL |
| C9a | 查表键**超集**（`getItem(<obj>.<field>,…)` 第一参数）= 371 个字段，落盘 `tools\facts\lookup-keys.json`；K∩继承 = 46 项在 C9b 通过前不许清 |
| C9b | **未实现**（取值合法性需字面量表名）——脚本每次打印"未实现"，不许当它通过 |

### 6.2 27 套测试分别盯什么
| 测试 | 项 | 盯什么 |
|---|---|---|
| `l0-envelope` / `l0-xhr` | 82 / 21 | 编解码、信封、形状、XHR 一致性 |
| `save-migrate` | 43 | 存档版本化、迁移幂等、不丢数据、守卫回滚 |
| `upgrade-skill-target` | 22 | 技能升级语义（目标等级、取消不涨级、进度落账） |
| `overlay-projection` | 14 | 派生叠加（接任务不写包、交任务不扣） |
| `sale-coins` / `trade-buy` | 15 / 8 | 卖价用 `Price`、`note.ivch` 绝对值、买按 `BuyPrice` 扣 |
| `premium-shop` | 9 | `ShopArray` 必给、金条扣款、跨店拒绝、`bzGrantCur` |
| `shop-special-exchange` / `shop-ge-rogue` | 13 / 9 | 四类商店契约；**T12/T13 = 货币奖励进钱包不进背包** |
| `fashion-pages` | 12 | 时装按页、限时页必带 `FashionTimeMap`、三套货币 |
| `r05-f2-l4` | 7 | 饥饿上限/非法值、L4 奖励对齐、装备账本观察 |
| `r06-medicine-scholar` | 6 | 秘籍拒绝不扣、学 1 级、回血/回内截断、上限优先级 |
| 事故族：`battle-npc-arr` 6 / `wash-points` 6 / `cycle-entry` 6 / `achieve-data` 5 / `activity-panel` 5 / `panel-fixes` 5 / `action-stats` 5 / `obs-guard` 7 / `useitem-branches` 6 / `drop-table` 8 / `push-grants` 5 | — | 各自对应一次真实事故，细节见历史档 §18–§23 |
| `selfcheck-nosave` / `selfcheck-model-push` | 退出码 | 自检**不许**写真存档 / **不许**推活客户端模型 |
| `core-test.js` | — | 早期网关时代的核心用例（**在基线里**，与 `core-test-server.js` 不是同一个文件） |

### 6.3 形状表：开关 vs 契约
- `tools/classify_fields.js`：把字段判成 `契约 / 开关 / 键集合契约 / 惰性可缺 / 惰性`，
  **自带 6 条已知故障的验收，判错就退出码 1**；支持 `BZ_MUTATE` 变异（只给 CI 变异对照，**变异不写产物**）。
- 生成器 `tools/gen_shapes.js`：`switch` 类**一律不填默认值**；`keyset` 类**必须发**（空对象合法）；
  升格表 `PROMOTED` 是显式表。**启动时校验 `facts/field-classes.json` 里的 `inputDigest`（三包 md5）**，
  不一致直接中止（防"分类器没跑/变异残留，生成器照旧读旧分类"）。
- 自检：`fillShape` 记录来源，断言"补出来的字段不许是开关字段"。
- **"?99 动作/144 字段" vs "87 动作"不是口径漂移**：`switchMap` = **99 动作 / 144 字段**（`switch` + `keyset` 混在一起），
  `shapes.json.switchOmitted` 只统计**真被剔的纯 switch** = **87 动作**；差集 12 个动作全是 `keyset`
  （`changeSate.crop`、`getAchieveData.groupPoints`、`BuyFashion.titivateObj`… 这 12 个字段本来就不在形状包里）。
- **47 个冲突字段**（presence 与 `deref-dot`∥`deref-index`∥`keyset` 同时命中，涉及 119 个动作；其中与 `deref-dot` 打架的 25 个）：
  当前最终分类 **契约 42 / 键集合契约 5，零个"开关"** ⇒ 真正的风险方向是**"开关字段被全局补发"（F1 型崩溃）**，
  不是"契约被剔掉"。逐字段证据在 `docs\audit\shape-conflict-fields.json`。
- **203 项跨动作继承**：默认值按**字段名全局汇总**，A 动作的字段可能拿到 B 动作 handler/抓包的值
  （例：`BuyHomeCrop.rewardArray ← checkBattleResult`）。`src` 已记溯源，**C12 只计数不 FAIL**（清零要分批，见 §11-4）。
- **固定时钟**：主时钟 `1792612412000`（28 处）；旧档时间点 `1792600000000`（5 处：`save-migrate` / `selfcheck-*` /
  `upgrade-skill-target`）。两者都在 `fixed-clocks.json` 登记了用途（C13）。
- **已知盲区**：动态字段名 `e[k]`、跨类事件派发、`setTimeout`/`scheduleOnce` 延迟读取、`for..in` 键分发、一层别名之外。

---

## 7. 已知缺口（按优先级；"为什么不能做"比"没做"更重要）

| # | 缺口 | 现况 / 为什么不硬做 |
|---|---|---|
| 1 | **每日任务链**（活动面板完成与领奖） | 面板显示 18 条 0 进度；完成/领奖的动作族未取证。**R06 Q5 判据下仍是第 1 位** |
| 2 | ~~兑换 118 行"货币奖励"是假的~~ → **已修 2026-10-23** | 见 §5.8。规模：`BZ_EXCHANGE` 1220 行里 118 行奖励是货币（`4003 潜能×111`、`4001 银两×6`、`1 金条×1`）。守卫：验收器 118/118（**旧代码 118/118 全红**）+ 自检 6 条 + `shop-special-exchange` T12/T13 |
| 3 | **形状表作用域化** | 见 §6.3 的 47 个冲突字段。改造前**必须先跑 `tools\span_gain.js`（尚未写）**出 `R`：`R≤10` 就用覆盖表、不动分类器（SOTA R10 Q3 的判据） |
| 4 | **成就进度** | 只有 **3%（58/2113）** 能从存档推导（`getAcheivementPrg1` 的 switch 里 `case 3: break`）；1657 行只能靠服务端 `taskData` → 与"转世"同类，保持 0 是诚实降级 |
| 5 | 七日活动 `taskObj` | 需要创建时间 / 第几天语义，未取证 |
| 6 | **秘籍"学技能"的等级规则** | 描述没写"学会"也没写"+1 级"，客户端无拦截 → 技能不在账本时按 **1 级**（假定）；已在账本时 `eRet:5` 不扣物品 |
| 7 | **`useItem` 对"未建模效果"的物品是"扣了什么都不给"**（**需用户裁定**） | item 表 522 条里只有 **21 条**被 `ITEMEAT/ITEMFUN/ITEMSCH` 覆盖；`useItem` 扣完再按三类分流，**没有 else 拒绝**。`Effect=23`（buff）有 3 条；商城买 buff 1043 的商品 **2 不在任何货架里**（暂打不到），但掉落/任务奖励给出这类物品就会中招。倾向改成"拒绝且不扣"，**但会缩小现有可用物品范围 → 需裁定** |
| 8 | **`Map=0` 的入口不可达**（江湖 Type117 / 兑换 / 转世 NPC） | R06 Q4 已给完整边界（只许调 UI 打开函数、不许挪玩家、排除付费货币行、debug 路由 + 审计 + 13 条断言）；**改边界需用户裁定** |
| 9 | 转世 / 先天 / 洗点的"内容侧" | 重置规则不在客户端（请求只带 `isReserved/branchId/originId/skillArr/skillID/attArr`）→ 只做诚实拒绝 |
| 10 | 江湖/兑换商店的 `rank/reputation` 门槛 | 按 0 降级（部分货被客户端锁定），属诚实降级 |
| 11 | `includes` 异常（登录窗口 3 次，紧跟 `getFinishTaskAward`） | 不崩、不影响游玩；消费端经别名注册或不在已解包内 |
| 12 | **饥饿跨重启** | `LoadGame` 无 hunger 字段，客户端按属性重算 → 不做持久化、不做消耗模拟（重启一次就能绕过） |
| 13 | `Repeat` 奖励上限 | `rewarded` 一次封顶（正常重复任务只发一次） |
| 14 | **`test/core-test-server.js` 是遗留红灯** | gateway 时代旧断言（期望技能形状 `[1,0,0]`），**不在 32 条验收里**。要么按现契约改断言、要么归档删除 |
| 15 | **`EndMeditation` / `EndTraining` 无 handler → 不结算** | 请求只带 `skillID/hglmt/speed/auto`，**不带时长** → 按时长结算就得把 `beginTime` 落账。SOTA R10 Q1：**每秒收益无来源时结算根本不能做**，只能"能开始不能领奖"+ 打日志 |
| 16 | **`hyTime/hanyusuiTime` 依赖"我们没实现 buff 系统"这个前提** | 见 §5.9。实现买 buff 1043 时必须同步改成剩余秒数 |
| 17 | **C9b 未实现 / C9a 只是下界** | C9a 只覆盖点路径，别名（`var n=e.id; getItem(n,…)`）、下标（`getItem(e.list[i].id,…)`）、"传进查表函数"三种写法都会漏 → 371 是**下界**。中性化批次（B1–B3）开始前必须先补 |
| 18 | **`useItem` 未建模消耗没有计数表** | 若按 §7-7 的 (c) 兜底，需要一张"未建模消耗"计数表；它本身也要满足 §3 的第 6 条（棘轮） |

---

## 8. 坑表（本轮新增在最前；完整 49 条见历史档 §9）

| # | 坑 | 对策 |
|---|---|---|
| 1 | **用 PowerShell `Set-Content`/`Get-Content -Raw` 改含中文文件** | 会把 UTF-8 写坏成 GBK 乱码（我 2026-10-23 踩到，`check_shape_freeze.js` 直接语法错）；`Set-Content -Encoding UTF8` 还会**加 BOM**，`JSON.parse` 直接报 `Unexpected token '﻿'`。**含中文的源码/JSON 只用 edit/write 工具** |
| 2 | **变异运行会写产物** | `BZ_MUTATE` 变异如果仍走"写产出"分支，会把 `facts/field-classes.json` 写成错的，下次构建照错的生成形状表 → 变异对照自己成了静默故障源。已堵：变异时零写入 + C1b 断言产物 md5 不变 |
| 3 | **生成器里用 `Date.now()` 采默认值** | 会把构建时刻冻成"形状默认值"，同一天两次运行产出不同；且默认值按字段名全局汇总 → 没有 handler 的动作也拿到别处的时间。已堵：`GEN_NOW` 固定 + C4 确定性断言 |
| 4 | **补了新 handler 就以为完事** | `fillShape` 会用**形状默认值**兜底，而那可能是**从别的动作借来的**（`BeginTraining.skillID ← OnCheckBreak`、`beginPlayGame.choose ← getFinishTaskAward`）。新 handler 必须显式给出关键字段，且要查 `src` 是不是 `borrowed-*` |
| 5 | **给开关字段"顺手填个默认值"** | `isCollective:0` 会关掉门派练功界面；`formulaID:0` 会崩。开关字段只能**按请求回声存在性**或**不发** |
| 6 | **新增/收窄路径不走审批** | 新发出的路径要进 `approved-widening.json`（带 `bundle:line`）；"发→不发"要进 `approved-narrowing.json`（`escape:"closed"`）；值变化要进 `planned-changes.json`（`allowSigma` 逐项） |
| 7 | **冻结基线是"空请求 `{}`"的应答** | 所以记录的是"空参数下的响应"。加了参数校验的 handler 在基线里会显示拒绝分支（例：`BeginTraining` = `{eRet:4}`），这是正常的，别当回归 |
| 8 | **改分类产物后忘记重跑生成器** | `gen_shapes` 现在校验 `inputDigest`，不一致直接中止 —— 但别把中止当成"工具坏了" |
| 9 | **Node 的 piped stdio 在本机沙箱下会失败** | `child_process` 用 `stdio:'pipe'` 捕获输出会被拒（EPERM）。改用**文件描述符**（`fs.openSync` + `stdio:['ignore',fd,fd]`） |
| 10 | **拿 `passed` 数字判绿/判红** | 数字随数据与形状变动（本日就出现过 1234→1233→1234）。判绿只认 `failed=[]` + **必需检查 id 齐全** |
| 11 | **用 .NET API 读写相对路径** | 一律绝对路径 |
| 12 | **探针参数用 ASCII 写** | `run.ps1` 已改 UTF-8 无 BOM |
| 13 | **`adb exec-out screencap` 走 PS 管道** | PNG 会坏：先 `screencap -p /data/local/tmp/x.png` 再 `pull` |
| 14 | **在跑着的游戏里做全图 BFS** | `seen.indexOf` 判重是 O(n²) → **Android ANR**；探针一律 `Set` 判重 + 限量（节点 ≤12000、时间 ≤2500 ms） |
| 15 | **残留 `bz_cmd.txt` 每次启动重放** | boot-2 已根治：开机丢弃 + 删不掉就拒绝执行 |
| 16 | **以为"某符号不在已解包"** | **三包全搜 + 大小写各一次**（`index.js` / `scripts2.js` / `scripts3.js`） |
| 17 | **设备上 11 个 bundle 里 10 个是 320 字节空壳** | 先 `ls -l` 看字节数再决定要不要解 |
| 18 | **把 UI 派生列表当账本** | 判断"数据有没有"只认 `__require` 出来的模型字段（`ItemSystemUI._itemDataList` 是**过滤后**的） |
| 19 | **以为客户端模型够不到** | `window.__require('RoleBaseInfo')` 一步到位（`scripts3.js:1`） |
| 20 | **只给一行读取处推不出类型** | 证据优先级：抓包真值 → 真 handler → 人工 → 客户端初值 → 全源用法 |
| 21 | **字段抽取只认具名回调** | 必须同时扫**匿名监听器**（`extract_listeners.js`，目前**只扫 index.js**，见 §7-17） |
| 22 | **拿 `buyShopItem` 当"免费灌物品"** | 灌种子只用 `bzSeedBag`（自检/测试同规矩） |
| 23 | **把"包装不回执"当"工人死了"** | 只看**交付文件是否落盘 + 能否解析**，不看 workflow 状态 |
| 24 | **工人越界改交接文档** | 收工核对关键文件 md5（`HANDOVER.md`、`core\bz-rpc-server.js`） |
| 25 | **按位置的下标数组只信命名** | 格数以**消费端逐下标读点**为准（`npcArr` 22→26 就是这么修好的） |
| 26 | **把栈里 `__awaiter` 的帧号当出错行** | 真凶是第一个**业务**帧（`setHairView → onRefresh → getFashionTimeType`） |
| 27 | **形状层会给缺失键补默认值** | 断言要写"必须是空对象"，不能写"必须不存在"（`fillShape` 会补） |
| 28 | **新增手写 handler 后忘了跑 `gen_shapes.js`** | `__impl` 不含它 → 自检 `shape:<动作>:eRet` 报 FAIL |
| 29 | **拒绝码落进客户端没有的分支** | 先查消费端 switch（`CYCLE_LIFE` 只认 1/6/7/9；**`BeginTraining` 只认 1/2**，所以"拒绝但无损失"在那里是静默的） |
| 30 | **以为 `note.eco` 的键名与存档字段名一致** | 潜能是 `ptt`（存档叫 `potential`）；发错了不报错、只静默丢弃 |
| 31 | **以为时间字段"填 0 就安全"** | 被减法消费的时间字段（`beginTime`）填 0 也是"一进去就已完成"；只能 handler 回请求时刻 |
| 32 | **把"登记表"当豁免通道** | 任何登记表都要棘轮：新增即 FAIL、修好不删也 FAIL、总数只许降 |

**跑探针的三条铁律**：① 禁全图 BFS，必须 Set 判重 + 限量；② 超时后第一件事清残留命令文件；
③ 探针文件只用 `edit`/`write` 改。

**委派纪律（有效做法）**：工程苦力 → `gemini-3.8-flash-low`（`provider: cmdc-gemini`），只做机械转录、
必须落盘 + 回传同一份、找不到写 `not found`；主审只写工单 / 抽样复核 / 判定 / 写入。
「点一点验证」= 主审自己 adb + 截图，**不要让玩家做**。
**交接文档/三文档由主审独占维护，不派**。

---

## 9. 回滚与备份

- 每次改动前备份：`_backup\<时间戳>-<pre|post>-<改动名>\`（**46 个目录**，含源文件 + 设备存档 + 日志 + md5）。
  最近几个：`2026-10-23-0116-pre-handover-rewrite-v2`（本文件上一版）、`2026-10-23-0108-post-r12`、
  `2026-10-23-0056-post-r11`、`2026-10-23-0025-post-r10`、`2026-10-22-2346-post-r08`。
  （**系统时钟比文档时间戳慢约 2 小时**，目录名以时钟为准。）
- 回滚代码 = 拷回对应目录源文件 → `node tools\classify_fields.js`（动过形状分类才要）→
  `node tools\gen_shapes.js` → `node tools\gen_task_rewards.js`（动过配置数据才要）→
  `$env:BZ_PROBE='0'; node build-handlers.js` → `.\run.ps1 handlers` → `node tools\check_shape_freeze.js`。
- 回滚存档：`bzPatch` / `bzSeedBag`，或直接推回备份的 `bz_offline_save.json`。
- **卸载补丁（恢复原版）**：`adb shell rm -rf /data/data/com.maple.madherogo/files/hotfix`。
- 历史档：`docs\HANDOVER-full-history-20261022.md`（2249 行，含每个故障的完整取证链）。

---

## 10. 证据与工具索引

**生成器 / 校验器（都进 CI，跑错就退出码 1）**

| 工具 | 作用 |
|---|---|
| `tools/gen_task_rewards.js` | 生成 `BZ_TASKS / ITEMTYPE / NPCDROP / NPCARR / ITEMPRICE / ITEMBUYPRICE / NPCSHOP / EXCHANGE / GESHOP / ROGUESHOP / ITEMEAT / ITEMSCH / ITEMFUN / FASHION / FASHIONPAGES / FASHIONBUY / ACHIEVE_GROUPS` |
| `tools/gen_shapes.js` | 形状表（开关剔除、升格表、**输入摘要闸门**、`src` 溯源、时间字段压 0） |
| `tools/classify_fields.js` | 字段读取模式分类（自带 6 条验收；支持 `BZ_MUTATE` 变异，变异不写产物） |
| `tools/check_shape_freeze.js` | ★ **形状冻结断言 C1–C13**（`--freeze` / `--diff` / 默认校验；含变异对照、审批表、证据 sha1、确定性、统计量、时钟登记） |
| `tools/check_shapes.js` | 形状自查（反向校验开关字段、`pathState` 判 `na`） |
| `tools/extract_all.js` / `extract_listeners.js` | 812 动作 / 249 匿名监听器（**后者只扫 index.js**） |
| `tools/h5_exchange_cost.js` / `check_exchange_currency.js` | 兑换代价定性 / **货币奖励验收器（118 行全过；`BZ_CORE_DIR` 指向旧代码可验它会全红）** |
| `tools/audit_shapes_evidence.js` / `scan_weak_fields.js` | 证据行核对 / 弱证据全量扫描 |
| `tools/task_buckets.js` / `task_chain.js` / `drop_coverage.js` | 任务分桶 / 前置链 / 物品来源覆盖 |
| `tools/achieve_buckets.js` / `effect_semantics.js` | 成就分桶 / Effect 码 → 属性 → `attrch` 键 |
| `tools/grep_src.js` / `docx2txt.js` | 三包内找行 / SOTA `.docx` 抽文本 |
| `tools/decrypt_bundles.js` / `xxtea.js` | 解客户端 bundle（密钥 `7ca36578-7b3a-4c`） |

**`tools/golden\`（冻结基线，勿手改，除两张审批表）**：`emission.json`、`evidence-sha1.json`、
`expected-stats.json`、`shapes-normalized.sha1`、`required-checks.json`、`fixed-clocks.json`、
`known-missing-handlers.json`、`approved-widening.json`、`approved-narrowing.json`、`planned-changes.json`、
`planned-archive\`（每批审批留痕）。

**客户端源码三包（33 万行，已解密）**：`tools/index.js`（149k 行）、`tools/scripts2.js`（82k）、`tools/scripts3.js`（100k）。
**配置表**：`tools/cfg/dump/`（442 张 / 22.5 MB）。**探针**：`hotfix-patch/probe/`（61 个）。
**审计留档**：`docs/audit/`（本轮的 `shape-conflict-fields.json`、`c4-*`、`buff1043-*`、`b4-state-mirrors.md`、
`useitem-precheck.md`、`r07-consumer-verbatim.md`、各批 `regression-after-*.txt`）。

**SOTA 往来**：`docs/sota/inbox/`（R07–R12 回执原文 + 抽出的 `.txt`）、
`docs/sota/outbox/`（`14-R07` … `20-R13` 已发；**下一个编号 21-R14**，等 R13 回执）。
材料格式：`outbox\00-INSTRUCTION.txt` 的 5 条规则 + `13-R06` 的章节式。

---

## 11. 下一轮第一件事

> **2026-10-23 本日已完成五批**：
> ① §7-2 的 118 行货币奖励 bug；② 冻结断言 C1–C6 + 生成器定时钟 + `upgradeSkill` 的 eco 键；
> ③ C7/C8/C10/C11/C12 + 输入摘要闸门 + 变异零写入；④ 四个时间字段 handler（打坐/练功/小孩玩耍/雇佣挂机）+
> C11b 棘轮 + `allowSigma` 逐项 + live 时钟断言；⑤ C13 时钟登记 + 必需检查 id 闸门 + `useItem` 顺序 + `skillID` 校验 +
> `isCollective` 回声。
> **等 SOTA R13 回执期间，能独立推进的只有下面 1、2 两项。**

1. **`EndMeditation` / `EndTraining` 只读取证**（R10 §4 明确：M1 上线前至少要完成）：读两个 End 回调，
   确认应答里客户端读哪些字段（`setBufferTotalTime(o.hanyusuiTime)`、`note.attrch.mpTrained`、`setAutoStartHung(o)`）、
   奖励怎么算；再决定"只回声 + 打日志"的具体形态。现成材料：`docs\audit\end-actions-hytime.md`。
2. **`useItem` 未建模效果的可获得性判定**（§7-7）：先做**只读**统计 —— 对 501 个未建模物品，
   用 `BZ_NPCDROP` / `BZ_TASKS` / 三张货架表 + 当前账本背包，算出"可获得且需要服务端落地"的集合，
   出一张清单。**拿到清单再决定要不要改行为**（改动会缩小可用物品范围 → 需用户裁定）。
3. **`tools/span_gain.js`**（§7-3 的前置）：按 R08 Q3 的判据算 `N / NOSPAN / 闭合数 / R`，
   `R≤10` 就只做覆盖表、不动分类器。
4. **203 项跨动作继承分批清零**（§6.3）：按 R11 §3 的 B0–B5 分桶；**B0 只改标签**（`mislabel` 与
   `handlerAlwaysSets` 两类，零行为变化）；**B5（K 类 + 时间字段）在 C9b 通过前一律不动**。
5. **C9b**（§7-17）：抽"字面量表名"的 `getItem(<路径>,"表")` → 断言默认值是合法主键；表名是变量的标"未定"。
6. 每日任务链（§7-1）→ 成就（§7-4）→ 七日活动 → 召唤通道（需用户裁定）。

**每轮收工必做**：备份到 `_backup\<时间戳>-post-<改动名>\`（带 md5）+ 更新本文件 §2 真值 +
核对 `HANDOVER.md` / `core\bz-rpc-server.js` 的 md5 有没有被工人动过 +
确认 `node tools\check_shape_freeze.js` 与 `node build-handlers.js` 都是退出码 0。
