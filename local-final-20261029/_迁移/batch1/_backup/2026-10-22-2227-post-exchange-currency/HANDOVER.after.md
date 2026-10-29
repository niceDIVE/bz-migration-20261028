# 交接文档 —— 《暴走英雄坛》进程内离线单机

> **本版是「当前真相」重写版**（2026-10-23 00:40）。旧的 2249 行追加式历史（§0–§23，含每个故障的完整取证链）
> 原样保留在 **`docs/HANDOVER-full-history-20261022.md`**（另备份在 `_backup\2026-10-23-0040-pre-handover-rewrite\`，md5 `8C7CD043`）。
> 需要"某次事故当时怎么查的"再去那里搜；需要"现在是什么状态、怎么开工"读本文件就够。

---

## 0. 30 秒上手（照抄这五条）

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force   # 每个新 pwsh 都要
cd F:\BaoZouyxt\hotfix-patch
.\run.ps1 status                    # 看 pid / scene（**版本别看这里**，热重载不刷新 ready.json）
.\run.ps1 cmd "ver"                 # 版本看这条：{"impl":"h96478c93","flow":"ffaec47c3","scene":"gamescene"}
.\run.ps1 cmd "state"               # 存档真值（账本 + meta.actionStats）
node test\r06-medicine-scholar.js   # 抽一套回归，退出码 0 = 通
```

改一行应答的完整循环（≈10 秒，**不重启游戏**）：

```powershell
cd F:\BaoZouyxt\hotfix-patch
$env:BZ_PROBE='0'; node build-handlers.js     # 构建 + 进程内自检（必须 HANDLERS OK selfCheck=1230）
.\run.ps1 handlers                            # 推送 + 热重载（断言 pid 未变）
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

## 2. 当前状态真值（2026-10-23 00:40）

| 项 | 值 |
|---|---|
| 部署 | `boot-2 / impl=haf237921 / flow=ffaec47c3`，`pid 29928`（热重载，未重启），`scene=gamescene`，`implErr=null / flowErr=null`，设备端 `selfCheck` 1230/1230 |
| 回归 | **27 套测试全绿**（§6.2；另有 1 套遗留 `core-test-server.js` 不在基线，见 §7-14）；进程内自检 **1230** 项；验收器 `tools\check_exchange_currency.js` **118/118**（旧代码 118/118 全红） |
| 真机日志 | `bz_log.jsonl` 有轮转上限；当前 `err=0`、`OBS=0`，`UNKNOWN` 只剩自检探针与 `recordAttributes` 上报 |
| 存档 | `roleID=16374`、`name=FZhou`、`saveVersion=4`、`coins=11155859`、`gold=5099799`、`yuanbao=1000`、`potential=84599`、`contribution=0` |
| 背包 | `{1301:2, 1501:1, 3003:52, 3007:13, 3020:17, 3626:1, 4014:1, 4015:1, 4016:1, 4020:5, 4101:1, 7027:1}` |
| 装备 | `playerEquip` 5 件（1001/2001/2302/2501/2601），`equipments` 槽 1/2/5/7/8 已占用 |
| 技能 | `{1:[40,0,1], 7:[40,0,1], 8:[40,0,1], 1112:[41,0,1], 1262:[1,0,1], 1263:[1,0,1]}` |
| 任务 | `accepted` 21、`done` 20、`rewarded` 16（主线卡在「和跟踪者对话」） |
| 场景 | 平安镇西（`baseValueAy[44]` 是地图 id，`[45][46]` 是出生坐标） |

### 2.1 玩家现在能玩到哪（端上实测过的才写 ✅）

| 系统 | 状态 | 备注 |
|---|---|---|
| 冷启动进游戏 | ✅ | ready 3 s、进 `gamescene` ≈16 s；有档直接进 |
| 战斗 | ✅ **用户实测通过** | 客户端全本地模拟；我们只管开战给 26 格数据 + 结算按 `npc.Drop` 发奖 |
| 任务（接 / 推 / 交 / 领奖） | ✅ | 交任务不扣 `SpRequire`（派生叠加，§5.3）；`Repeat≠0` 可重复接 |
| 商店·普通（Type 2/20/36/38/51/55/70） | ✅ | 本地配置货架；买按 `BuyPrice` 扣银两 |
| 商店·NPC 金条（Type 26 `getShopItem`） | ✅ 协议层已验 | 4 摊贩 / 374 件；**UI 未肉眼验**（镇上走不到那个摊） |
| 商店·流言(33/35)、兑换、正邪、江湖 | ✅ 协议层 + 单测 | **入口 NPC 的 `Map=0`，玩家走不到**（§7-6） |
| 时装（裁缝铺三页 + 购买） | ✅ **端上实测** | 常驻 16 件/金条、限时 130 件（当前全售罄）、战令 39 件/1 券；买完重启仍在 |
| 背包 / 食物（饱食度）/ 药品（回血回内） | ✅ **端上实测** | 走 `note.ivch`（绝对值）+ `note.attrch` |
| 出售（含装备回收）/ 快速购买 | ✅ | 按 `item.Price` 进银两 |
| 成就面板 | ✅ 能开，**全 0 进度** | 78%+ 条目的进度客户端不本地计算（§7-4） |
| 活动面板（每日任务） | ✅ 能开，18 条 0 进度 | 完成 / 领奖动作链未实现（§7-1） |
| 洗点 | ⚠️ 能点通但洗不出东西 | `bloodArr` 非零来源是转世，转世规则不可得 |
| 转世 / 特殊转世 | ⛔ 诚实拒绝 | `isCycleLife→2`、`cycleLife→9`、`specialCycleLife→9`（回 4 会被客户端静默丢弃） |
| 秘籍（学技能） | ⚠️ 部分 | 技能已在账本 → `eRet:5` **不扣物品**；不在 → 学会 1 级（"1 级"是假定） |

---

## 3. 架构

```
设备端 /data/data/com.maple.madherogo/files/
├── hotfix/
│   ├── jsb-adapter/jsb-engine.js     引导层（309 KB，改动要重启）
│   └── live/
│       ├── handlers.js               策略层（≈840 KB，热重载 0.2–0.4 s）
│       └── flow.js                   流程层（17 KB，同上）
├── bz_offline_save.json              存档（单文件：账本 + meta）
├── bz_log.jsonl                      结构化日志（**有轮转上限**，别指望长期留档）
├── bz_cmd.txt / bz_res.txt           命令通道（boot-2 起：开机会丢弃残留命令）
└── probe_arg.txt                     探针参数（**必须 UTF-8**）

F:\BaoZouyxt\hotfix-patch\           源码工程
├── hook\bz-bootstrap.js             薄引导：命令通道 / XHR 替换 / 异常捕获 / JSONL / reload
├── hook\bz-xhr.js                   传输层（只认 __BZ_HARNESS__.impl.handle 契约）
├── hook\bz-codec.js                 线协议（aes-js + lz-string）
├── core\bz-rpc-server.js            ★ 业务：**83 个 handler**（含 4 个 `bz*` 维护动作）+ 形状分发 + 信封 + 账本 + 守卫
├── core\bz-handler-impl.js          策略层契约（handle/selfCheck/reset/state）+ 自检 1224 项
├── core\bz-shapes.generated.js      ★ 形状层（tools/gen_shapes.js 生成，勿手改）
├── core\bz-tasks.generated.js       ★ 数据面（tools/gen_task_rewards.js 生成，勿手改）
├── core\templates.json              抓包真值模板（7 个关键动作）
├── live\flow.js                     流程层：选区→进游戏→建角向导→剧情→gamescene→关公告
├── build.js / build-handlers.js     构建（后者含自检）
├── run.ps1                          ★ 宿主侧唯一入口
└── test\*.js                        27 套回归（§6.2；`core-test-server.js` 遗留不在基线）

F:\BaoZouyxt\tools\                   研究与生成工具（§10）
F:\BaoZouyxt\docs\sota\               SOTA 往来（inbox = 回执原文，outbox = 我方材料）
```

**四条设计原则（别走回头路）**
1. **机制与策略分离**：引导层只转发到 `__BZ_HARNESS__.impl`，策略层从 `handlers.js` 动态求值 → 换 impl 不重启。
2. **可观测性**：所有动作/异常/场景都写 JSONL；断言对日志做，不对截图做。
3. **大声失败**：未实现动作写 `UNKNOWN User.X p={...}`；形状表里也没有才走通用 ACK。
4. **形状是契约、不是实现**：`dispatch` 先 handler、再 `fillShape`（只补缺不覆盖）；**开关类字段一律不填**（§6.3）。

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

三个维护动作都会写前备份 `<save>.pre-maint.json`（滚动一格）。

---

## 5. 协议与账本契约（写错会**清档**的那些）

### 5.1 线协议
`{mod:"User", do:"<Action>", p:{...}}` → LZString(Base64) → AES-256-CBC → Hex；
Key `120734aa834dea925ca8d2e1bb6811c3` / IV `33daee8409834c00`。
信封按 **URL** 区分：入口服 `:9898` → `{MsgData}`；账号/游戏服 → `{code:200, MsgData}`
（少了 `code` 客户端静默丢弃）。

### 5.2 `note` 各子表的语义（事故出处：20 个卖 1 个被写成 1 个）
客户端把应答 `note` 的**每个键当事件名派发**（index.js:59325）：

| 键 | 语义 | 写错的后果 |
|---|---|---|
| `ivch` | `{物品id: **新数量（绝对值）**}`，0 = 删除 | 发"变动量" → 数量被覆盖、界面看着还有货 → **能反复卖** |
| `eqch` | `{uid:[0]}` 删除 / `{uid:[1,[type,num]]}` 添加 | 形状错 → 装备不落地 |
| `eco` | `{coins,gold,exp,ptt,chips,yuanbao: **新余额**}` | 钱包不变 |
| ↑ **`eco` 只认这 6 个键**（index.js:64698-64725 的 switch） | **潜能 = `ptt`**，存档字段却叫 `potential`；发 `eco.potential` 直接被丢弃 | 潜能扣了/发了但界面不动 |
| **货币 id → 钱包**（不是物品） | `1→gold`、`4001→coins`、`4002→exp`、`4003→potential(ptt)`、`8888→yuanbao`（`getItemNum`，106347-106360） | 按物品 `grantItem` → 进 `bag` → **玩家付真道具换来永远不生效的假物品**（§7-2） |
| `attrch` | `{hunger, curhp, curmp, hplmt, hpbase, mpbase, exp, ptt, luck…}`（24 键，142391-142500） | 食物/药品没效果（客户端**不做本地应用**） |
| `skch` | `{技能id:[lv,pgr,brlv]}` | 学技能没提示（**只弹提示、不写模型**） |

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

### 5.6 分支选择器字段（F1 事故）
客户端用 `hasOwnProperty("X")` 当开关的字段（`formulaID / mountID / taskID / gemId / ...`）**缺省必须不发**：
发了 `formulaID:0` → `getItem(0,"formula")` 得 null → `Cannot read property 'name' of null @ index.js:64796`。

### 5.7 时装（GetFashionList / BuyFashion）
- 按 `fashionall.type` 列分页：`[]`=常驻(16)、含 1=限时(130)、含 2=战令(39)；只含 3/4 的 81 件三页都不发。
- `FashionArr[i] = [物品id, **限时剩余天数**]`（不是"已拥有"）；**type==1 必须带 `FashionTimeMap`**
  （`{"起_止":[id,...]}`，缺了客户端 `getFashionTimeType` 的 `e[1]` 抛 TypeError → 整页空白）。
- `BuyFashion {itemObj:{槽:[物品id,页签,档位]}}`：页0 扣金条 `price`；页1 档位≠2 扣金条、档位 2 扣 7298 券；
  页2 扣 7851 券。应答**必须带 `note.eqch`**（客户端先 `getEquipmentInfo(id)` 取装备实例，否则 `.id` 崩）。

---

## 6. 回归与验证体系

### 6.1 三层断言
1. **进程内自检 1230 项**（每次 reload 自动跑）：动作存在 / `eRet` / 字段齐全 / **形状来源** / 任务+物品+装备闭环 /
   维护动作不写盘 / **开关字段不许被 fill 补出来** / **货币奖励不许进背包**（§7-2 的 6 条）。
2. **27 套 Node 回归**（`test\*.js`，退出码 0 才算过；`core-test-server.js` 是遗留、不在基线）。
3. **端上实测**（adb 点屏 + 截图 + JSONL 断言；截图在 `hotfix-patch\probe\shot_*.png`）。

### 6.2 27 套测试分别盯什么
| 测试 | 项 | 盯什么 |
|---|---|---|
| `l0-envelope` / `l0-xhr` | 82 / 21 | 编解码、信封、形状、XHR 一致性 |
| `save-migrate` | 43 | 存档版本化、迁移幂等、不丢数据、守卫回滚 |
| `upgrade-skill-target` | 22 | 技能升级语义（目标等级、取消不涨级、进度落账） |
| `overlay-projection` | 14 | 派生叠加（接任务不写包、交任务不扣） |
| `sale-coins` / `trade-buy` | 15 / 8 | 卖价用 `Price`、`note.ivch` 绝对值、买按 `BuyPrice` 扣 |
| `premium-shop` | 9 | `ShopArray` 必给、金条扣款、跨店拒绝、`bzGrantCur` |
| `shop-special-exchange` / `shop-ge-rogue` | 13 / 9 | 流言·兑换·正邪·江湖四类商店契约；**T12/T13 = 货币奖励进钱包不进背包**（§7-2） |
| **`fashion-pages`** | 12 | 时装按页、限时页必带 `FashionTimeMap`、BuyFashion 三套货币 |
| **`r05-f2-l4`** | 7 | 饥饿上限/非法值、L4 奖励对齐（**多发 1 个必须留痕**）、装备账本观察 |
| **`r06-medicine-scholar`** | 6 | 秘籍拒绝不扣、学 1 级、回血/回内截断、上限优先级 |
| 事故族：`battle-npc-arr` 6 / `wash-points` 6 / `cycle-entry` 6 / `achieve-data` 5 / `activity-panel` 5 / `panel-fixes` 5 / `action-stats` 5 / `obs-guard` 7 / `useitem-branches` 6 / `drop-table` / `push-grants` | — | 各自对应一次真实事故，细节见历史档 §18–§23 |
| `selfcheck-nosave` / `selfcheck-model-push` | 退出码 | 自检**不许**写真存档 / **不许**推活客户端模型 |

### 6.3 形状表：开关 vs 契约（R05/R06 的核心机制）
- `tools/classify_fields.js`：把字段判成 `契约 / 开关 / 键集合契约 / 惰性可缺 / 惰性`，
  **自带 6 条已知故障的验收，判错就退出码 1**（`useItem.formulaID`→开关、`FashionArr`→契约、
  `notFriendPartnerData`→契约、`groupPoints`→键集合契约、`dataArr`→契约、`getSevenTaskList.taskObj`→升格后契约）。
- 生成器：`switch` 类**一律不填默认值**；`keyset` 类**必须发**（空对象合法）；升格表 `PROMOTED` 保留。
- 自检：`fillShape` 记录来源，断言 **"补出来的字段不许是开关字段"**（取代原来"自检恒真"的写法）。
- **已知盲区**：动态字段名 `e[k]`、跨类事件派发、`setTimeout`/`scheduleOnce` 延迟读取、`for..in` 键分发、
  一层别名之外，以及**按字段名（而非按动作回调范围）归类**带来的污染（已量化 25 个候选，见 §7-3）。

---

## 7. 已知缺口（按优先级；"为什么不能做"比"没做"更重要）

| # | 缺口 | 现况 / 为什么不硬做 |
|---|---|---|
| 1 | **每日任务链**（活动面板的完成与领奖） | 面板已能显示 18 条 0 进度；完成/领奖的动作族未取证。**R06 Q5 判据下它是第 1 位** |
| 2 | ~~**兑换商店 118 行"货币奖励"是假的**~~ → **已修 2026-10-23（`impl=haf237921`）** | 旧行为：`exchangeItem` 对奖励一律 `grantItem` → 货币 id 进 `bag`，而客户端取货币只读钱包（`getItemNum` 106347-106360）→ 玩家付真道具换来永远不生效的假物品。实测规模：`BZ_EXCHANGE` 1220 行里 **118 行**奖励是货币（潜能 4003 ×111、银两 4001 ×6、金条 1 ×1；**不是 9396**，那是旧记录的误写）。修法：新增 `currencySlot()/grantCurrency()`，货币走钱包 + `note.eco`（潜能键 = **`ptt`**）；`4002(经验)` 无存档字段 → 明确 `eRet:4` 不扣成本（全表 0 行命中，纯兜底）。守卫：验收器 `node tools/check_exchange_currency.js`（118/118，**旧代码 118/118 全红**）+ 自检 6 条 + `shop-special-exchange` T12/T13 |
| 3 | **形状表作用域化** | 分类器按字段名全局归类，实测 **25 个字段**同时有 presence 与 deref（`shopObj` 必须发、`type` 家族可能被污染）。改成"按动作回调行范围"得先让 `extract_listeners.js` **三包全扫并带 bundle 字段**（现在只有 index.js 的 249 条 span） |
| 4 | **成就进度** | 只有 **3%（58/2113）** 能从存档推导（`getAcheivementPrg1` 的 switch 里 `case 3: break`）；1657 行只能靠服务端 `taskData`，语义在服务端 → 与"转世"同类，保持 0 是诚实降级 |
| 5 | 七日活动 `taskObj` | 需要创建时间 / 第几天语义，未取证 |
| 6 | **`Map=0` 的入口不可达**（江湖 Type117 / 兑换 / 转世 NPC） | R06 Q4 已给完整边界（只许调 UI 打开函数、不许挪玩家、排除付费货币行、debug 路由 + 审计 + 13 条断言）；**改边界需用户裁定** |
| 7 | 转世 / 先天 / 洗点的"内容侧" | 重置规则不在客户端（请求只带 `isReserved/branchId/originId/skillArr/skillID/attArr`）→ 只做诚实拒绝，不伪造新一世 |
| 8 | 饥饿**跨重启** | `LoadGame` 无 hunger 字段，客户端按属性重算（很可能回满）→ 不做持久化、不做消耗模拟（重启一次就能绕过，经济上无意义） |
| 9 | 江湖/兑换商店的 `rank/reputation` 门槛 | 按 0 降级（部分货被客户端锁定），属诚实降级 |
| 10 | 秘籍"学技能"的等级规则 | 描述没写"学会"也没写"+1 级"，客户端无拦截 → 技能不在账本时按 **1 级**（假定）；已在账本时 `eRet:5` 不扣物品 |
| 11 | `includes` 异常（登录窗口 3 次，紧跟 `getFinishTaskAward`） | 不崩、不影响游玩；消费端经别名注册或不在已解包内 |
| 12 | `Repeat` 奖励上限 | `rewarded` 一次封顶（正常重复任务只发一次） |
| 13 | 长期统计 | 日志会轮转；用 `save.meta.actionStats`（进程内累计，重启归零） |
| 14 | **`test/core-test-server.js` 是遗留红灯** | gateway 时代的旧断言（`test/core-test-server.js:65` 期望技能形状 `[1,0,0]`，与现在的 `[lv,pgr,brlv]` + 派生叠加契约不一致），**不在 27 套基线里**。要么按现契约改断言、要么归档删除——别让它混在 CI 输出里误导人 |

---

## 8. 坑表（精选 20 条；完整 49 条见历史档 §9）

| # | 坑 | 对策 |
|---|---|---|
| 1 | 探针参数用 ASCII 写 | `run.ps1` 已改 UTF-8 无 BOM |
| 2 | 用 .NET API 读写相对路径 | 一律绝对路径 |
| 3 | `adb exec-out screencap` 走 PS 管道 | PNG 会坏：先 `screencap -p /data/local/tmp/x.png` 再 `pull` |
| 4 | **在跑着的游戏里做全图 BFS** | `seen.indexOf` 判重是 O(n²) → **Android ANR**；探针一律 `Set` 判重 + 限量（节点 ≤12000、时间 ≤2500 ms） |
| 5 | 残留 `bz_cmd.txt` 每次启动重放 | boot-2 已根治：开机丢弃 + 删不掉就拒绝执行 |
| 6 | 用 PowerShell `Set-Content` 改含中文文件 | **只许 `edit`/`write` 工具**（PS 5.1 会写坏成 GBK，本文件因此坏过两次） |
| 7 | 以为"某符号不在已解包" | **三包全搜 + 大小写各一次**（`index.js` / `scripts2.js` / `scripts3.js`） |
| 8 | 设备上 11 个 bundle 里 10 个是 320 字节空壳 | 先 `ls -l` 看字节数再决定要不要解 |
| 9 | 把 UI 派生列表当账本 | 判断"数据有没有"只认 `__require` 出来的模型字段（`ItemSystemUI._itemDataList` 是**过滤后**的，天然可为 0） |
| 10 | 以为客户端模型够不到 | `window.__require('RoleBaseInfo')` 一步到位（`scripts3.js:1`） |
| 11 | 只给一行读取处推不出类型 | 证据优先级：抓包真值 → 真 handler → 人工 → 客户端初值 → 全源用法 |
| 12 | 字段抽取只认具名回调 | 必须同时扫**匿名监听器**（`extract_listeners.js`） |
| 13 | 拿 `buyShopItem` 当"免费灌物品" | 灌种子只用 `bzSeedBag`（自检/测试同规矩） |
| 14 | 把"包装不回执"当"工人死了" | 只看**交付文件是否落盘 + 能否解析**，不看 workflow 状态 |
| 15 | 工人越界改交接文档 | 收工核对关键文件 md5（`HANDOVER.md`、`core\bz-rpc-server.js`） |
| 16 | 按位置的下标数组只信命名 | 格数以**消费端逐下标读点**为准（`npcArr` 22→26 就是这么修好的） |
| 17 | 把栈里 `__awaiter` 的帧号当出错行 | 真凶是第一个**业务**帧（`setHairView → onRefresh → getFashionTimeType`） |
| 18 | 形状层会给缺失键补默认值 | 断言要写"必须是空对象"，不能写"必须不存在"（`fillShape` 会补） |
| 19 | 新增手写 handler 后忘了跑 `gen_shapes.js` | `__impl` 不含它 → 自检 `shape:<动作>:eRet` 报 FAIL |
| 20 | 拒绝码落进客户端没有的分支 | 先查消费端 switch（`CYCLE_LIFE` 只认 1/6/7/9，**2 和 4 静默丢弃**） |

**跑探针的三条铁律**：① 禁全图 BFS，必须 Set 判重 + 限量；② 超时后第一件事清残留命令文件；
③ 探针文件只用 `edit`/`write` 改。

**委派纪律（有效做法）**：工程苦力 → `gemini-3.8-flash-low`（`provider: cmdc-gemini`），只做机械转录、
必须落盘 JSON + 回传同一份、找不到写 `not found`；主审只写工单 / 抽样复核 / 判定 / 写入。
「点一点验证」= 主审自己 adb + 截图，**不要让玩家做**。

---

## 9. 回滚与备份

- 每次改动前备份：`_backup\<时间戳>-<pre|post>-<改动名>\`（35 个目录，含源文件 + 设备存档 + 日志 + md5）。
  最近两个：`2026-10-22-2222-pre-exchange-currency`、`2026-10-22-2227-post-exchange-currency`。
  （**系统时钟比文档时间戳慢约 2 小时**，目录名以时钟为准，别以为找错目录。）
- 回滚 = 拷回对应目录源文件 → `node tools\classify_fields.js`（动过形状分类才要）→
  `node tools\gen_shapes.js` → `node tools\gen_task_rewards.js`（动过配置数据才要）→
  `$env:BZ_PROBE='0'; node build-handlers.js` → `.\run.ps1 handlers`。
- 存档回滚：`bzPatch` / `bzSeedBag`，或直接推回备份的 `bz_offline_save.json`。
- **卸载补丁（恢复原版）**：`adb shell rm -rf /data/data/com.maple.madherogo/files/hotfix`。
- 本文件上一版：`_backup\2026-10-23-0040-pre-handover-rewrite\HANDOVER.md`（md5 `8C7CD043`，2249 行）
  + 在库归档 `docs\HANDOVER-full-history-20261022.md`。

---

## 10. 证据与工具索引

**生成器 / 校验器（都进 CI，跑错就退出码 1）**

| 工具 | 作用 |
|---|---|
| `tools/gen_task_rewards.js` | 生成 `BZ_TASKS / ITEMTYPE / NPCDROP / NPCARR / ITEMPRICE / ITEMBUYPRICE / NPCSHOP / EXCHANGE / GESHOP / ROGUESHOP / ITEMEAT / ITEMSCH / ITEMFUN / FASHION / FASHIONPAGES / FASHIONBUY / ACHIEVE_GROUPS` |
| `tools/gen_shapes.js` | 形状表（含开关剔除、升格表） |
| `tools/check_shapes.js` | 形状自查（反向校验开关字段、`pathState` 判 `na`） |
| `tools/classify_fields.js` | 字段读取模式分类（自带 6 条验收） |
| `tools/extract_all.js` / `extract_listeners.js` | 812 动作 / 249 匿名监听器的字段抽取 |
| `tools/audit_shapes_evidence.js` / `scan_weak_fields.js` | 证据行核对 / 弱证据全量扫描 |
| `tools/task_buckets.js` / `task_chain.js` / `drop_coverage.js` | 任务分桶 / 前置链 / 物品来源覆盖 |
| `tools/h5_exchange_cost.js` / `check_exchange_currency.js` | 兑换代价定性（0 行付费货币）/ **货币奖励验收器（118 行全过才算通；`BZ_CORE_DIR` 指向旧代码可验证它会全红）** |
| `tools/achieve_buckets.js` | 成就按"能否从存档推导"分桶（3% / 1657 行靠服务端） |
| `tools/effect_semantics.js` | Effect 码 → 属性 → `attrch` 键三列对照 |
| `tools/grep_src.js` | 三包内按串/正则找行（`--file` 指定包） |
| `tools/docx2txt.js` | 把 SOTA 回执 `.docx` 抽成 `.txt`（无第三方依赖） |
| `tools/decrypt_bundles.js` / `xxtea.js` | 解客户端 bundle（密钥 `7ca36578-7b3a-4c`） |

**客户端源码三包（33 万行，已解密）**：`tools/index.js`（149k 行）、`tools/scripts2.js`（82k）、
`tools/scripts3.js`（100k）。
**配置表**：`tools/cfg/dump/`（442 张 / 22.5 MB）+ `tools/cfg/tbl_item.json` 等；`tools/facts/` 是审计留档。
**探针**：`hotfix-patch/probe/`（61 个），常用：`lang_probe.js`（语言表原文）、`require_probe.js`（模型体检）、
`dump_tables.js`（配置表导出）、`equip_attr_probe.js`（装备属性）。
**SOTA 往来**：`docs/sota/inbox/`（R05 / R06 回执原文 + 抽出的 `.txt`）、
`docs/sota/outbox/`（我方材料，**下一个编号 14-R07**）。

---

## 11. 下一轮第一件事（按 R06 Q5 判据排序）

> **2026-10-23 已完成**：§7-2 的 118 行货币奖励 bug（`impl=haf237921`，验收器 118/118 + 自检 1230 + 27 套全绿，
> 热重载上线 `pid` 未变，设备存档 md5 与改前一致）。下一轮从下面第 1 条起。

1. **每日任务链**：读 `DailyMissionUI` 里 `dataArr` 每一位的含义（进度还是状态）+ grep 这个 UI 的所有 `send`，
   列出领奖相关动作 → 再定实现范围。
2. **形状表作用域化**（§7-3）：先让 `extract_listeners.js` 三包全扫 + 带 bundle 字段，
   再把 presence 判定限制在回调 span 内，最后用 6 条验收 + 27 套回归确认没把已上线结论洗掉。
3. 成就（只做能推导的 58 行，或保持 0 等规则）→ 七日活动 → 召唤通道（需用户裁定）。
4. 顺手项（低风险，随时可做）：`exchangeItem` 之外**没有**货币奖励路径（已全表扫过：任务奖励 217 键 / 掉落 475 键 /
   正邪与江湖货架均无货币 id）；`upgradeSkill`（`core\bz-rpc-server.js:1020/1042`）的 `note.eco` 用的是 **`potential`**
   这个客户端**不认**的键（ECO 只认 `ptt`），而应答顶层同时也有 `potential` 字段 —— 到底哪条生效**未取证**，
   下一轮先查消费端再决定要不要改成 `ptt`（别直接改，可能撞已有结论）。

**每轮收工必做**：备份到 `_backup\<时间戳>-post-<改动名>\`（带 md5）+ 更新本文件 §2 真值 +
核对 `HANDOVER.md` / `core\bz-rpc-server.js` 的 md5 有没有被工人动过。
