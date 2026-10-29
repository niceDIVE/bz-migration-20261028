# 交接文档 —— 《暴走英雄坛》进程内离线单机（第二阶段：可维护的离线层）

> 最后更新：2026-10-22 19:50（**§19 是当前轮，先读它**；§18 是上一轮；§17.7 已被用户实测关闭）
> 当前部署版本：`boot-2 / impl=h7aff50be / flow=fe3500480`（文档里其它章节若还写旧版本号，那是历史）
> 状态：**战斗已修复且用户实测通过**（原话「战斗正常了」，§18.1：`BZ_NPCARR` 22→26 格，缺 `HardModel`
> 导致 `initRivalEntity` 抛异常被 MessageCenter 吞掉）；**洗点已修**（`cycleObj` 缺失导致按钮静默崩溃，§18.2）；
> `useItem` 不再下发"分支选择器"字段（另一处静默异常，§18.3）；金条/元宝账本 + NPC 金条商店已上线（§17.4）；
> 商店系统全景路由已摸清（§18.4，还剩 4 类动作未实现）。
> 回归基线：**14 套测试全绿**（新增 `battle-npc-arr` 6/6、`wash-points` 6/6），`selfCheck=1120`。
> 交接上一版备份：`_backup\2026-10-22-1823-pre-handover-update2\HANDOVER.md.snapshot`（md5 `9DD91BF2…`）
> 状态：**本轮（§17）把「交易」从"能扣物品"推到了"真交易 + 单一路径投射"**：
> 卖东西按 `item.Price` 进银两、买东西按 `item.BuyPrice` 扣银两、**NPC 金条商店两个动作补齐**
> （`User.getShopItem` / `User.buySpecialShopItem`）、**金条 `gold` / 元宝 `yuanbao` 进账本**。
> 关键更正（会咬人的）：客户端 `note.ivch` 的值是**绝对值**、`note.eqch` 是 `[0]`/`[1,[type,num]]`，
> 钱包必须走 `note.eco`（§17.2 有原文）。**§16.6-1「装备属性不生效」已被实测推翻**（§17.1）。
> 冷启动/回归基线：`selfCheck=1120`、13 套测试全绿（§17.6）。
> 上一版交接已备份：`_backup\2026-10-22-0750-pre-handover-update\HANDOVER.md.snapshot`（md5 `0F91BED9…`）
> 本文件曾在 04:15 被 PowerShell `Set-Content` 写坏（GBK 乱码，不可逆），已用 `_backup\2026-10-22-0212-pre-alchemy-handlers\HANDOVER.md.snapshot` 重建并补回全部改动；
> 坏档留在 `_backup\2026-10-22-0415-HANDOVER-corrupted.md` 供比对。**再犯此错 = 违反 §9 坑 30。**
> ⚠ 本轮发现**有子工人越界改过本文件**（§15 的更正块，写入时刻 06:40，内容已核对为真，故保留）：
> 派活时"只许写自己的交付文件"管不住，**收工后要核对关键文件的 md5**（见 §9 坑 45）。

---

## 0. 项目边界（接手前必读，未变）

**唯一目的：让用户本人在自己的电脑上，离线单人游玩《暴走英雄坛》。**

| 会做 | 明确不做 |
|---|---|
| 在本机模拟器内运行**官方原版**客户端 | ❌ 不分发 APK、不提供下载源、不做安装包 |
| 在客户端**自己的可写目录**放一个本地补丁 | ❌ 不修改 APK 本体、不重签、不改资源与剧情 |
| 由补丁在**游戏进程内部**应答游戏自身的网络请求 | ❌ 不架设对外服务器、不监听公网端口、不运营私服 |
| 把存档写进本机文件 | ❌ 不绕过、不伪造任何付费/充值/订单 |
| 数值改动只作用于**本机存档** | ❌ 不售卖、不订阅、不提供任何付费服务 |

使用范围：仅本人、本人设备、本地运行；不公开分发补丁；不撰写对外教程；不承诺维护。
支付类动作（`*Pay*` / `*Order*` / `*Recharge*`）**一律不实现**，只在通用 ACK 里走过场。


---

## 1. 一句话现状

官方 APK 零改动、零重签，补丁放在 `files/hotfix/`，游戏**冷启动 16.6 秒自动进入 `gamescene`**，
全部网络请求在进程内被本地应答。客户端脚本已用 XXTEA 密钥解出明文（4.5 MB / 149k 行）。

**这一轮的实质变化：从"拿得到"推到了"穿得上、挡不住、查得动"。**

- **装备账本**：`PutOnEquipment` / `UnloadingEuipment` 已记账（`equipments[槽]=uid`、`PlayerEquip[uid]=[1,数量]`），
  装备类奖励（`Type=1`）也会进 `PlayerEquip` 而不是背包。
- **公告弹窗**：每次登录那块空白「游戏公告」不再挡住画面——flow 里自动调客户端自己的 `onBack()` 关掉（日志 `公告→onBack()`）。
- **研究能力**：客户端 `scripts2` / `scripts3` 两个 bundle 也用同一把 XXTEA 密钥解开了
  （`tools/scripts2.js` 8.2 万行、`tools/scripts3.js` 10 万行），加上原来的 `tools/index.js`，
  **33 万行客户端代码可查**。UI 层的问题（比如背包为什么空）以后不用再猜。
- **✅ 背包“空”是误判（本轮结案，别再当 bug 查）**：账本 6 样物品**已经**在客户端 `_itemObj` 里
  （进程内实测 `Object.keys(_itemObj)` = `["3005","3006","3626","4014","4015","7027"]`），
  界面也**照常显示**（书信→秘籍 里 `吐纳法秘籍 ×1`、消耗品→食物 里 `白玉豆腐/翡翠豆腐 ×1`，截图已存
  `probe/shot_bag_shuxin.png`、`probe/shot_bag_food.png`）。
  之前那个 `_itemDataList.length == 0` 是**过滤后的列表**，不是账本；`ItemSystemUI.divisionItem`
  （scripts2.js:36788-36811）只把「`Type==2` 且 Effect 落在当前子页 `effectcategory.page` 白名单里」的物品放进来，
  默认落在大类「消耗品」子页「药品」，白名单是 `33,2,3,4,6,23,25`，**一件都不匹配**，所以看着空。
  详见 §7.1 的结案表。

---

## 2. 架构：三层 + 工具层

```
设备端 /data/data/com.maple.madherogo/files/hotfix/
├── jsb-adapter/jsb-engine.js             引导层（309 KB，很少改；改动需重启）
└── live/
    ├── handlers.js                       策略层（48 KB，改一次 push+reload ≈ 0.3s）
    └── flow.js                           流程层（15 KB，同上）

F:\BaoZouyxt\hotfix-patch\                源码工程
├── hook\bz-bootstrap.js    薄引导：命令通道 / XHR 替换 / 错误捕获 / JSONL 日志 / ready 标记 / reload
├── hook\bz-xhr.js          XHR 传输层（只认 __BZ_HARNESS__.impl.handle 契约）
├── hook\bz-codec.js        线协议编解码（aes-js + lz-string，与 Node crypto 字节一致）
├── core\bz-handler-impl.js 策略层契约适配（handle/selfCheck/reset/state）
├── core\bz-rpc-server.js   ★ 业务：46 个动作 handler + 形状分发 + 信封 + 存档账本 + 任务账本
├── core\bz-shapes.generated.js  ★ 形状层：338 个动作的应答形状（tools/gen_shapes.js 生成，勿手改）
├── core\bz-tasks.generated.js   ★ 任务奖励表：682 个任务的"所需物品/应发奖励"（tools/gen_task_rewards.js 生成）
├── core\templates.json     抓包解密出的真实响应模板（7 个关键动作）
├── live\flow.js            ★ 流程层：选区→进游戏→建角向导→剧情→gamescene
├── build.js                构建引导层（探针版 / 环回版）
├── build-handlers.js       构建策略层 + 流程层（含自检跑一遍）
├── run.ps1                 ★ 宿主侧总控（见第 3 节）
├── watch.ps1               日志监视器（只打 UNKNOWN / err）
├── test\l0-xhr.js          XHR 一致性测试（21 项）
├── test\l0-envelope.js     编解码/信封/形状测试（82 项）
├── test\selfcheck-nosave.js       ★ 自检不许写真存档（拿真存档内容跑一遍，比字节+sha；退出码 0 = 安全）
├── test\selfcheck-model-push.js   ★ 自检不许推活客户端模型（假 window.__require 记录写入；退出码 0 = 安全）
├── test\upgrade-skill-target.js   ★ 技能升级语义（22 项：目标等级 / 取消不涨级 / pgr 回显 / LoadGame 回放）
├── test\save-migrate.js           ★ 存档版本化（43 项：迁移幂等 / 不丢数据 / 版本守卫 / 守卫回滚 / 维护前备份）
└── probe\*.js              探针（都要**限时限量**，见 §9 坑 28）
    ├── dump_tables.js      从 startres bundle 再要一次配置表，落设备 files/tbl_*.json
    ├── check_bag.js        极小 BFS：客户端的 `_itemObj` 里有没有东西
    ├── bag_state.js        直接问开着的 `ItemSystemUI`：`_itemDataList` 长度
    ├── dump_bag_ui.js      列场景里像背包的节点/组件名（拿到组件名 `ItemSystemUI`）
    └── seed_bag.js         一次性把外部持有物灌进账本（配合 bzSeedBag）

    ★ 2026-10-22 新增（都用 `__require`，只读、不做 BFS）：
    ├── require_probe.js    一次问清：CFMgr.dic 有哪些表 / item 表命中 / RoleBaseInfo._itemObj 真实内容
    ├── bag_tab_probe.js    账本里每样物品该出现在哪个大类+子页（对应 effectcategory.page）
    ├── gold_label_probe.js 定位「金条」那个 Label 的归属组件（靠节点链 PropertyUI→GoldLabel）
    ├── wallet_probe.js     读 yuanbao/gold/coins 现值 + 抓页面上含「金条」的 Label 文本
    └── task_state_probe.js 读 requireTaskObj/finishTaskObj/taskOrder/taskLog + 每个在办任务的表行

F:\BaoZouyxt\tools\                       客户端研究与生成工具
├── index.js                解密源码 · scripts 主包（4.5 MB / 149,447 行）
├── scripts2.js             解密源码 · scripts2 包（3.1 MB / 81,775 行）★ 本轮新增
├── scripts3.js             解密源码 · scripts3 包（3.7 MB / 100,428 行）★ 本轮新增
├── decrypt_bundles.js      ★ 解其它 bundle 的 index.jsc（同一把 XXTEA 密钥，gzip 自动识别）
├── action_facts_all.json   812 动作：消费函数 / 请求参数 / 响应字段 / 字段行号
├── todo_shapes.json        120 个待补形状动作
├── gen_shapes.js           ★ 形状生成器（老表 + 匿名监听器表 + 源码 → 形状）
├── extract_listeners.js    ★ 扫匿名监听器（`MessageCenter.on(CMD, function(t,e){...})`）抓响应字段
├── check_shapes.js         ★ 形状自查（目标动作 × 字段路径，缺一个 FAIL，可当 CI）
├── grep_src.js             在源码里按串/正则找行（免引号地狱，--file 可指定 scripts2/3）
├── gen_task_rewards.js     ★ 从原始配置表生成任务奖励表（tasknew + drop + item → bz-tasks.generated.js）
├── scan_weak_fields.js     ★ 255 个弱证据字段的同名属性访问扫描（确定性，一次扫全量 33 万行）
├── audit_shapes_evidence.js ★ 形状表证据审计：逐字段核对 evid 的 "bundle:line" 里到底有没有该字段（现报 0 硬误报）
├── task_buckets.js         ★ 任务分桶（Type / TaskType / SpRequire 形态 / Pre-Require flag）
├── drop_coverage.js        ★ 任务所需物品的来源覆盖率（任务奖励 / 商店 / 打怪 三分类）
├── shapes.json             形状定义 + 逐字段证据 + 置信度（嵌套用 "note.skch" 表示）
├── shapes_report.md        人可读清单
├── action_facts_listener.json  249 个匿名监听器的字段清单
├── cfg\                    ★ 从设备导出的游戏原始配置表（只读留档，勿手改）
│   ├── tbl_tasknew.json    4842 个任务（Reward=掉落表 id / SpRequire=所需物品）
│   ├── tbl_drop.json       掉落表（Item1..5 + probability）
│   ├── tbl_item.json       6525 个物品（Type/Name/BuyPrice/EquipType…）
│   └── tbl_constant.json   常量表
└── facts\                  审计留档（低置信字段原始行、苦力交付）
```

**关键设计（第二阶段的核心价值）**

1. **机制与策略分离**：引导层只做"转发到 `__BZ_HARNESS__.impl`"，策略层从设备上的
   `handlers.js` 动态 `new Function` 求值。**换 impl 不需要重启进程**，也不影响已存在的 XHR 实例。
2. **可观测性**：所有动作、异常、场景切换、flow 动作都写 JSONL（`files/bz_log.jsonl`），
   断言对日志做，不对截图做。
3. **大声失败**：未实现动作不再静默，写 `UNKNOWN User.X p={...}`——这就是覆盖率待办清单的来源。

---

## 3. 操作手册（`run.ps1` 是唯一入口）

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force   # 每次新 pwsh 都要
cd F:\BaoZouyxt\hotfix-patch

.\run.ps1 status            # pid / ready / 版本 / 最近日志
.\run.ps1 handlers          # 推 handlers.js+flow.js → reload → 断言 pid 未变（≈8 秒一轮）
.\run.ps1 all               # 推引导层+策略层 → 重启 → 等 ready
.\run.ps1 restart           # force-stop + 启动 + 轮询 ready
.\run.ps1 smoke             # 冷启动端到端，输出 PASS/FAIL JSON
.\run.ps1 log -Tail 40      # 打印最近 N 行日志
.\run.ps1 cmd "ver"         # 命令通道：ver/scene/reload/selfcheck/state/log/get:/dump:/eval:
.\run.ps1 probe .\probe\xxx.js [arg]   # 推探针文件到进程内执行，回传结果
```

**改一次应答的完整循环（当前 ≈ 10 秒）**

```powershell
# 1. 改 core\bz-rpc-server.js（或 live\flow.js）
$env:BZ_PROBE='0'; node build.js      # 构建（内部会跑 selfCheck，434 项）
node test\l0-envelope.js              # 82 项回归
.\run.ps1 handlers                    # 推送 + 热重载（不动游戏进程）
```

**只有形状表变了的时候（不用动源码）**

```powershell
node tools\extract_listeners.js       # 客户端源码变了才需要重跑（扫匿名监听器）
node tools\gen_shapes.js              # 重新生成 338 个动作的形状（几秒）
node tools\check_shapes.js            # 自查，PASS 才继续
.\run.ps1 handlers                    # 同上，热重载
```

**配置表（任务奖励/物品）变了的时候**

```powershell
# 1. 从设备重新导出原始配置表（探针会把表落到 files/tbl_*.json，然后脚本 pull 下来）
.\run.ps1 probe .\probe\dump_tables.js
# 2. 生成任务奖励表
node tools\gen_task_rewards.js
# 3. 构建 + 推
$env:BZ_PROBE='0'; node build-handlers.js; .\run.ps1 handlers
```

**维护动作（只能从命令通道打，游戏协议里没有）**

命令通道的 `cmd` 只认 `op:arg` 形式，所以维护动作用 `get:` 打一段自解码的 JS（复制即用，把 `<动作>` 换掉）：

```powershell
$js = 'get:(function(){var b=__BZ_CODEC__.encode(JSON.stringify({mod:"User",do:"<动作>",p:{}}));var r=__BZ_HARNESS__.impl.handle({url:"https://bzgf.maple-game.com/900-server-166/x",body:b});return JSON.parse(__BZ_CODEC__.decode(JSON.parse(r.text).MsgData));})()'
.\run.ps1 cmd $js
```

| 动作 | 作用 |
|---|---|
| `bzBackfillRewards` | 补发"已完成但当时没发"的任务奖励（幂等，按 `save.rewarded` 跳重） |
| `bzPatch` | 定点改存档：`p:{set:{potential:99999}, del:{skills:["0"]}}`，仅用于修复误写 |
| `bzSeedBag` | 一次性把外部持有物灌进账本：`p:{itemObj:{3626:1}}` |

看存档：`.\run.ps1 cmd "state"`（直接打印 `bz_offline_save.json`）。

**怎么判断形状表真被用上了**：日志里出现 `SHAPED User.<动作>`；还是 `UNKNOWN` 就是表里也没收这个动作。
**怎么看账本**：`.\run.ps1 cmd "state"` 直接打印存档 JSON（含 `accepted` / `done` / `bag` / `playerEquip` / `equipments` / `rewarded` / `skills`）。

**跑探针的三条铁律（血的教训，见 §9 坑 28/29/30）**

```powershell
# 1. 探针里禁止全图 BFS；必须 Set 判重 + 限量（节点 ≤ 12000、时间 ≤ 2500ms，越小越安全）
# 2. probe 报 command reply timeout 之后，第一件事是清掉残留命令文件，否则每次启动都会重放
adb -s 127.0.0.1:16416 shell "rm -f /data/data/com.maple.madherogo/files/bz_cmd.txt"
# 3. 探针文件只用 edit/write 工具改，别用 PowerShell Set-Content（会写坏 UTF-8 中文注释）
```

**客户端源码三包（都能 grep，`--file` 指定）**

```powershell
node tools\grep_src.js "ItemSystemUI" --file tools\scripts2.js --max 5   # UI 层
node tools\grep_src.js "getStorableItemObj" --file tools\index.js --max 3 # 模型层
node tools\decrypt_bundles.js                                            # 若某包没解出来
```

**设备侧要点**

| 项 | 值 |
|---|---|
| 模拟器 | MuMu/TapTap VM，VM index 1，adb `127.0.0.1:16416`，需 `adb root` |
| 应用可写目录 | `/data/data/com.maple.madherogo/files/` |
| 存档 | `.../files/bz_offline_save.json` |
| 日志 | `.../files/bz_log.jsonl` |
| 命令通道 | 写 `.../files/bz_cmd.txt` → 读 `.../files/bz_res.txt` |
| 探针参数 | `.../files/probe_arg.txt`（**必须 UTF-8**，见第 9 节坑 1） |
| 窗口不可见 | `MuMuManager.exe control -v 1 show_window`，再用 Win32 `SetWindowPos` 摆位置 |

---

## 4. 客户端研究结果（第二阶段最大收获）

### 4.1 脚本解密（一次性解决"只能猜"的问题）

| 步骤 | 结论 |
|---|---|
| 定位 | 设备上 `files/hotfix/assets/scripts/index.jsc`（950,592 B） |
| 加密 | XXTEA（Cocos Creator 2.x 原生加密），解密在 `.so` 里 |
| 密钥 | **`7ca36578-7b3a-4c`**（从 `libcocos2djs.so` 可打印字符串暴力匹配，用 268 B 的 `settings.jsc` 验证） |
| 结果 | 解出 **4,512,911 B / 149,447 行**明文 JS → `tools/index.js` |
| 复现 | `tools/decrypt_main.js`（含密钥）+ `tools/xxtea.js` |
| 备用 | `npm i cc-reverse --prefix tools\ccreverse`，`cc-reverse -p <build> -k 7ca36578-7b3a-4c`（可解包资源） |

### 4.2 关键代码位置（`tools/index.js` 行号 = 客户端 `index.jsc` 行号）

| 主题 | 位置 | 说明 |
|---|---|---|
| `loadGame` 消费端 | **70502** | 进游戏时读的字段全在这里；`e.OnhookObj.serverTime` 曾导致崩溃 |
| `updatePlayerData` | 111820 | `baseValueAy[索引]` 映射表就在这段里 |
| `baseValueAy` 尾部语义 | 74965–74970 / 111801 | `[44]=场景ID` `[45][46]=出生坐标` `[47]=已退门派[]` `[49]=degreeLv` `[50]=career` |
| 潜能 / 银两 | 74955–74956 | `[34]=潜能` `[35]=银两` |
| `skillMap` 格式 | 119994 | `{ 技能ID: [lv, pgr, brlv] }` |
| 关闭新手引导 | 107269 | 响应里带 `closeGuide: true` → `GuideMgr.closeGuideState = true` |
| 建角向导链 | 见 flow.js 注释 | `StartDialogueUI → CreateRoleUI → BirthPlaceUI → SelectSexUI → SelectAppearanceUI → ShowTalentUI` |
| 属性点硬条件 | `ShowTalentUI.enterClickBtn` | `_attributeValue[0] === 0` 才放行（剩余点必须为 0） |
| 交易/支付常量 | 59503 起（HttpConst） | 812 个动作映射表 |
| **运行时取客户端模块** | `scripts3.js:1` `window.__require` | **最有用的一条**：`__require('RoleBaseInfo')` / `__require('CFMgr')` 直接拿到模型与配置表，短名即可，找不到会自动回退到上一个 bundle。探针里用它查状态，别再用 BFS（见坑 20/33/34） |
| 任务判定函数 | `134085` `judgeTaskCondition`｜`134289` `judgeTaskState`｜`134428` `judgeItemRequire`｜`134394` `judgeTaskFinishRequire` | `judgeItemRequire` 把 `"4015,1"` 按 `|` 分段、再按 `,` 取 id/数量：`Type==1`(装备) 走 `EqUtils.getEquipOrUid`，其余走 `RoleBaseInfo.getItemNum(id) < 数量`。后者对货币 id `1` 返回 `gold`(金条)、`4001` 返回 `coins`(银两) |

### 4.3 全量动作清单（2026-10-22 01:18 实测口径，可复现）

```powershell
node tools\extract_all.js         # → tools/action_facts_all.json（具名回调）
node tools\extract_listeners.js   # → tools/action_facts_listener.json（匿名监听器）
node tools\gen_shapes.js          # → tools/shapes.json + core/bz-shapes.generated.js
node tools\check_shapes.js        # 形状自查（目标动作 × 字段路径）
```

| 指标 | 数量 |
|---|---|
| 动作总数 | **812** |
| 未检测到读返回字段（走通用 ACK） | **499** |
| 检测到会读返回字段 | **313** |
| └ 有人手写 handler（游戏动作） | **54** |
| └ 另有维护动作（不属于游戏协议） | **3**：`bzSeedBag` / `bzBackfillRewards` / `bzPatch` |
| └ 有形状条目 | **338** |
| **非支付动作**（去掉 10 个支付类）仍在读字段的 | **303** |
| **非支付动作覆盖率** | **303 / 303 = 100%（缺口 0）** |
| 支付类 | **10**（`IphonePay` `h5Pay` `GetPayAward` `GetPayShowData` `PaymentCallBack` `cancelPay` `getPayAuth` `createOrderByHotVal` `completeOrderByHotVal` `ExChangeJetton`）→ **一律回 `eRet:4`（明确失败），不伪造任何订单/货币** |

> 注：旧文档写的 `160 / 652 / 120` 是"只认具名回调"的旧口径，已作废。
> 关键教训：字段抽取必须同时扫**匿名监听器**，否则会把 `useItem` 这种读 `note.skch` 的动作误判成"只看 ACK"。

### 4.4 形状层（核心增量）

**问题**：只有几十个动作手写了 handler，其余落到通用 ACK —— 客户端拿到 `{eRet:1}` 后
读 `e.note.skch` / `e.friendList.length` / `for (var k in e.shopObj)` 就会抛异常或走空分支。

**做法**：照表批量生成，不靠试。

| 证据源（优先级从高到低） | 含义 |
|---|---|
| `capture` | 抓包真值模板里的同名字段（`templates.json`） |
| `handler` | 已实现 handler 空参数跑一遍的真实响应 |
| `manual` | 主审逐条看源码后写死（每条带行号） |
| `listener` | 匿名监听器里读到的字段（`extract_listeners.js`，带行号与类型提示） |
| `init-N` | 客户端自己写的初值 `this.x = [] / {} / 0`，N 处一致 |
| `usage-N` | 源码里 N 处用法同类型 |
| `name` / `fallback` | 命名启发 / 无证据，安全空值兜底 |

**支持嵌套路径**：`note.attrch`、`housekeeper.helperId` 会自动展开成嵌套对象。
`x.length` 访问会还原成 `x` + 数组提示，`x.hasOwnProperty` 还原成 `x` + 对象提示。

**记账联动**：`userGold` / `curGold` / `potential` 从存档账本读，账本没有时按 `LoadGame` 同款 99999，
避免"进游戏显示 99999、买东西说只有 20"。

**回归护栏**：每次 reload 的进程内自检里，338 个动作逐个验（存在 / eRet / 字段齐全）+ 任务 8 条 + 物品 6 条，共 **1093 项**。

### 4.6 形状是「契约」，不是「实现」（fillShape）

关键设计（本轮新增，别再走回头路）：

- **形状表覆盖所有会读字段的动作，包括已实现的那 54 个**。手写 handler 不等于豁免。
- `dispatch` 里先跑 handler，再用 `fillShape(action, res)` **只补缺、不覆盖**：客户端要的字段一定在，handler 算出来的值一定不被冲掉。
- 自检对每个动作都 `dispatch` 一遍再验字段——所以那条断言同时在验 hand-written handler。
- **例外**：手写 handler 可以自己决定 `eRet`（`getCRAInfo` 的抓包真值就是 `2`，不是 1）。
  生成器把已实现动作名单写进 `BZ_SHAPES.__impl`，自检据此放宽这条断言。
- **扁平结构动作**（`quicklogin` / `Create` / `CheckName` / `GetChatAddress` / `GetServerList`）没有 `User.<动作>` 这一层，不纳入形状表。

### 4.7 任务奖励链（数据来自游戏自己的配置表）

**怎么拿到真数据**（这条最重要，别再重复摸索）：

- 配置表在设备 `files/hotfix/assets/startres/`，索引是 `config.json` 里的 `paths: "configs/<名字>,<type>"`，
  真身是 `.mbin` 二进制 → **Cocos 原生解析成行数组**，形如 `_nativeAsset.data = [ [表头...], [行...], ... ]`。
- **配置表加载完就被释放**：`cc.loader._cache`（442 条材质/特效）和 `cc.assetManager`（扫 1019 个节点）里都没有。
- 正确做法：**自己再向 bundle 要一次**——`bundle.load(['configs/item'], cc.Asset, null, cb)`，
  回调里拿 `asset._nativeAsset.data`。工具：`probe/dump_tables.js`（把表落到设备 `files/tbl_*.json` 再 pull）。
- 表的主键要用 **`ID` 列**，不是第 0 列（第 0 列是 `__name__`，两者不一定相等）。

**三张表怎么串起来**：

| 表 | 关键列 | 含义 |
|---|---|---|
| `tasknew` | `Reward` | **掉落表 id**（不是物品 id！3054 → 物品 3626×1 + 货币） |
| `tasknew` | `SpRequire` | 完成任务**必须携带**的物品：`"物品id,数量"`，多个用 `\|` 分隔；只写 id 表示客户端不校验数量 |
| `drop` | `Item1..5` + `probability1..5` | 掉落展开：`[itemID, count]`；只收 `probability >= 100` 的条目 |
| `item` | `Type` / `Name` / `BuyPrice` | `Type=1` 装备 / `2` 消耗品 / `3` 材料…；`Name` 是**语言表 id**，不是字面名字 |

**运行时怎么用**（`core/bz-rpc-server.js`）：

- `acceptTask(taskID)`：记账 + 按 `SpRequire` **补齐所需物品**（`have < want` 才补，已在包里就不动）。
  没有这一步，客户端 `judgeItemRequire` 永远不通过 → 任务交不掉。实测：100150 需要 `4015×1`，
  而 `4015` 正是前一个任务 100140 的奖励，之前奖励是空的，所以这链子断在这里。
- `getFinishTaskAward(taskID)`：把任务移进 `done`；**同一个任务只发一次**（`save.rewarded` 记名单），
  按 `Reward → drop → item` 展开后 `rewardArray = {物品id:数量}` 并写入 `bag`。
- `bzBackfillRewards`（维护动作，只从命令通道打）：把 `done` 里"当时没发出去"的奖励补发一次。
- 货币类 id（`1` `2` `4001` `4002` `4003`）不进奖励：客户端 `setItem` 对这五个 id 走特殊分支，
  放进 `itemObj` 无效，真实服务器是走 `note.eco` 的，我们没有那个映射表。

### 4.8 装备穿脱契约（照抄即可）

客户端有**两本不同的账**，别搞混：

| 账本 | 结构 | 含义 |
|---|---|---|
| `PlayerEquip` | `{ uid: [type, itemID, attrs, crystalIds, weaponSkinId] }` | **拥有的装备实例**。`type==1` 表示"无附加属性"，此时 `uid == itemID`、`num = data[1]`；`type>=2` 时 `itemID = data[1]`、属性在 `data[2]` |
| `equipments` | `{ 装备位: uid }` | **当前穿在身上的**（槽位 1–8） |

- **穿**：客户端先本地换好再发 `User.PutOnEquipment`，请求 `{EquipmentType, itemID, hp, hplmt, gTime, mp}`（index.jsc:65360-65370）。
  服务器只负责记账：`equipments[EquipmentType] = itemID`，并确保 `playerEquip[uid]` 存在；应答只要 `eRet:1`（消费端仅派发刷新事件，index.jsc:65015）。
- **卸**：请求只有 `{hp, hplmt, mp}`（**不带槽位**），应答成功后客户端自己清空 `<8` 的槽（index.jsc:92801）。服务器把 `equipments` 里槽位 `<8` 的项全删。
- **不记账的后果**：重进游戏时 `LoadGame` 回放的还是旧 `equipments` → 装备白穿。
- `Type=1` 的物品（装备）**不能进 `itemObj`**：客户端 `judgeItemRequire` 对装备走 `EqUtils.getEquipOrUid(itemID)`（index.jsc:44279），
  看的是 `equipmentDic`（即 `PlayerEquip` 解析结果），不是背包数量。所以奖励发放要按 `BZ_ITEMTYPE` 分流（见 `grantItem`）。

### 4.9 公告弹窗自动关闭（flow 层）

- 现象：每次登录进主场景都会弹一块空白「游戏公告」，挡住整个画面，必须手动点 ✕。
- 关法：`ItemSystemUI` 那套流程之外，公告弹窗的组件名就是 `NoticeUI`（`notice/NoticeUI` 预置体，`addComponent("NoticeUI")`）；
  客户端自己的关闭入口是 `NoticeMgr.romeveNoticeUI()` → `PopUpMgr.removePopUp(noticeUI)`，但 `NoticeMgr` 不在全局，够不到。
- 实现：`live/flow.js` 的 `stepNotice(scene)`——在主场景每 tick 找 `NoticeUI` / 名字匹配 `/^(Small)?Notice(UI|DetailUI)?$/` 的节点，
  **先调组件自己的关闭方法**（`onBack` / `onClose` / `onCloseClick` / `onClickClose` / `closeUI` / `onBackClick`），
  都没有才 `node.destroy()`。实测走的是 `onBack()`，干净关闭（日志 `[flow] 公告→onBack()`）。
- 加这个是因为它是**每次登录都发生**的阻塞，不关掉玩家进游戏第一步就被挡。

### 4.5 三个"重建入口"的账本契约（照抄即可，别再猜）

客户端有三条路径会把本地状态**整份替换**成服务器给的，任何一条回空都会让玩家的进度清零：

| 动作 | 客户端行为 | 我们要回 |
|---|---|---|
| `User.LoadGame` | `updatePlayerData` → `setSaveAllTaskDatas` / `setSaveAllItems` / `updateEquipments`（index.jsc:111820） | `finishTaskObj:["id,1"]`、`acceptTaskArray`、`acceptTaskOrder`、`taskLog`、`itemObj:{id:count}`、`PlayerEquip`、`equipments` |
| `User.sycnTask` | 先 `finishTaskObj={}` 再整体替换，并把结果写回 LocalStorage（133515-133519） | `PlayerFinishTaskObj:{id:1}`、`acceptTaskMap:{id:id}`、`acceptTaskOrder`、`PlayerTaskLog`、`taskLog` |
| `User.sycnPlayerItemData` | 先 `_itemObj={}`、`type2Items={}` 再按 `itemObj` 逐条 `setItem`（24016-24018） | `itemObj:{id:count}`（count>0 的**全部**持有物） |

**格式陷阱**：`finishTaskObj` 在两个接口里形状不同——`LoadGame` 要**字符串数组** `["101080,1"]`，
`sycnTask` 要**对象** `{"101080":1}`。同名字段两套格式，写错不报错、只是静默失效。

**物品增减入口**（已记账）：`useItem` / `saleItem`（`saleArr`）/ `buyShopItem` / `QuickBuyItem` / `addItem`。
维护入口 `bzSeedBag`（游戏协议里没有这个动作，只能从命令通道打进来）用于一次性把外部拿到的持有物灌进账本。

---

## 5. 协议事实（已验证，可直接复用）

| 项 | 值 |
|---|---|
| 请求 | `{mod:"User", do:"<Action>", p:{...}}` → LZString(Base64) → AES-256-CBC → Hex |
| Key / IV | `120734aa834dea925ca8d2e1bb6811c3`（UTF-8 = 32 B → AES-256）/ `33daee8409834c00` |
| 响应信封 | 入口服 `:9898` → `{"MsgData":..}`；账号/游戏服 → `{"code":200,"MsgData":..}` |
| 客户端实际读的外层键 | 还有 `errorCode`（见 `field_usage.json` 的 R1/R7），我们的 `code` 目前够用 |
| 载荷两种形态 | 扁平（quicklogin/Create/CheckName/GetChatAddress）/ 包裹（其余：`p` + `User.<Action>` + `achievement`） |
| 未实现动作 | 统一回 `wrapped(action,{eRet:1},{achievement})`，保证不卡 |

**LoadGame 契约（`index.jsc:70502` 逐字段确认）**

必须给：`baseValueAy`（≥48 项）、`OnhookObj.serverTime`、`skillMap`、`cycleLifeRetains`、
`serverTime`；可选但建议：`serverFormatTime`、`housekeeper`、`bonusMap`、`equipments`、
`veinObj`、`KillsItemObj`。**缺 `OnhookObj` 会崩、缺 `baseValueAy[47]` 会让拜师崩。**

---

## 6. 实测数据（可复现的验收基线，2026-10-22 01:18 更新）

| 项 | 结果 |
|---|---|
| 冷启动 → gamescene | `ready` 约 3 s、随后 **~16 s 进主场景**，`errors=0`，7 次 RPC 全本地 |
| 有档直进 | `flowSteps=2`（只 setServer + onEnterGame），不再重建角 |
| 热重载 | push 124 KB（handlers）+ 17 KB（flow），reload **0.09–0.42 s**，pid 不变 |
| L0 测试 | `l0-xhr` 21 项 + `l0-envelope` 82 项，全绿 |
| 进程内自检 | 每次 reload 自动跑 **1100 项**（337 动作形状 + 任务账本 8 + 任务奖励 4 + 物品 6 + 装备 5 + 原有系列 + `selfcheck:noSaveWrite`） |
| 存档测试（新增） | `test\save-migrate.js` **43 项**：迁移幂等/不丢数据/版本守卫/截断档不覆盖/守卫回滚/维护前备份 |
| 自检安全性（新增） | `node test\selfcheck-nosave.js` → 真存档 0 改动；`node test\selfcheck-model-push.js` → 活客户端模型 0 次推送 |
| 形状自查 | `node tools\check_shapes.js` → 目标动作 296 / 字段路径 593 PASS |
| 支付拦截 | 进程内实测 `IphonePay` / `GetPayShowData` / `createOrderByHotVal` → 全部 `eRet:4`（失败） |
| 装备账本实测 | 进程内 `PutOnEquipment{EquipmentType:1,itemID:7535}` → `equipments:{"1":7535}`；`UnloadingEuipment` → `equipments:{}` |
| 公告自动关闭 | 每次进主场景日志出现 `[flow] 公告→onBack()`，截图核对画面无遮挡 |
| 账本回放实测 | `LoadGame` → `itemObj` 6 种、`finishTaskObj` 10 条、`acceptTaskArray` `[100150]`、`equipments` `{}` |
| `LoadGame` 负载生效证据 | 把存档 `name` 改成 `TESTNAME` 重启 → 角色面板名字确实变成 TESTNAME（测完已改回 `FZhou`） |
| 客户端真实背包状态 | ✅ 账本 6 样已落地：`RoleBaseInfo._itemObj` = `{3005,3006,3626,4014,4015,7027}` 各 1、`type2Items[2]` 有值；`_itemDataList` 只在**当前子页**命中白名单时才非 0（见 §7.1） |
| `window.__require` | ✅ 可用（`scripts3.js:1`）：`__require('RoleBaseInfo').RoleBaseInfo._itemObj` 进程内直接可读，不必再 BFS `window`（推翻坑 20） |
| 金条 / 银两的字段链 | 金条＝`RoleBaseInfo.gold`（面板 `GoldLabel`，scripts2.js:49725），正规来源＝`InventoryDB.setGold`（index.jsc:64300）← `OnhookObj.curGold`（111905）。银两＝`RoleBaseInfo.coins` ← `baseValueAy[35]`。顶层 `curGold` 只有 `createRole`(70457) 读，老档走不到 |

---

## 7. 未完成清单（按优先级，2026-10-22 01:18 重排）

### P0（直接影响"能不能玩下去"）

1. ~~**背包界面是空的**~~ → **✅ 已结案：不是 bug，是默认子页为空**（2026-10-22 01:33）
   - **事实**：6 样物品在客户端 `_itemObj` 里**都在**；打开背包点「书信」能看到 `吐纳法秘籍 ×1`，
     点「消耗品→食物」能看到 `白玉豆腐 / 翡翠豆腐 ×1`（截图 `probe/shot_bag_shuxin.png`、`probe/shot_bag_food.png`）。
   - **误判来源**：`ItemSystemUI._itemDataList` 是 `divisionItem()` 过滤后的**渲染列表**，不是账本。
     过滤条件（scripts2.js:36805-36811）＝ `o[y].numbers > 0` **且** `2 == I.Type` **且**
     物品 `Effect` 出现在 `effectcategory.page.split("|")[子页]` 的白名单里。
     默认落在大类「消耗品」子页「药品」，白名单 `33,2,3,4,6,23,25` → 一件都不匹配 → 列表为 0，看着像空背包。
   - **六样物品的真实归属**（进程内实测，`probe/bag_tab_probe.js`）：
     | 物品 | Effect | 大类 | 子页 |
     |---|---|---|---|
     | 3005 / 3006（白玉豆腐 / 翡翠豆腐） | 1 | 消耗品 | 食物（`1,7,12`） |
     | 3626（吐纳法秘籍） | 11 | 书信 | 秘籍（`5,11,40`） |
     | 4014 / 4015 | 38 | 其他 | 第 3 页（`38,76`） |
     | 7027 | 28 | 书信 | 特殊（`21,22,27,28,46,54,62,71`） |
   - **教训**：把「UI 派生列表为空」当成「数据为空」是这次最大的误判，直接把上一轮带去查
     `setSaveAllItems` / `getItem` / 配置表加载时序——方向全是白工（但也因此确认了那三处都没问题）。
     判断"数据有没有"只认 `__require` 出来的模型字段，不认 UI 字段（§9 坑 33）。
   - **留下的可复用手段**：`probe/require_probe.js`（模型+账本一次性体检）、`probe/bag_tab_probe.js`（物品归属判定）。
2. **任务进度状态机**：`Require` 里"杀 N 个怪/采 N 个"这类计数我们没有状态机，
   客户端 `judgeTaskCondition` 读的是它自己算的进度，多数情况够用；遇到推不动的任务再补。
   - **2026-10-22 01:50 实测（先别照着"缺状态机"去写代码）**：进程内 `__require('RoleBaseInfo')` 读到
     `requireTaskObj` 只有 `100150`（`taskState=0`）、`finishTaskObj` 10 个、`taskOrder` 11 个、`taskLog` 空；
     任务面板正常渲染出「和小宝对话（主线任务）」；`100150` 的表行是 `Type=2 / Require=0 / SpRequire=4015,1 / Reward=0`，
     包里正好有 4015×1 → **条件本来就满足**。
   - **链子没断**：`tasknew` 里前置为 `100150` 的只有一个 ＝ `100160`（`Pre-Require="1,100150,0|0"`, `Reward=3008`）。
     工具：`node tools\task_chain.js <taskID>`（算前置/后继/可达数；注意 `Pre-Require` 是 `flag,taskID,param|...` 结构串，
     不是裸 id 列表，解析要按 `|` 分段再取第 2 段）。
   - 结论：**当前没有"推不动"的任务证据**，这条保持"遇到再补"，别提前造状态机。
3. ~~装备穿脱~~ → **已完成**（`PutOnEquipment` / `UnloadingEuipment` 记账 + `PlayerEquip` / `equipments` 回放 + 装备类奖励分流，见 §4.8）。
4. ~~任务奖励~~ → **已完成**（`tasknew → drop → item` 原表链路；`rewardArray` 有值；`rewarded` 防重发）。
5. ~~公告弹窗~~ → **已完成**（flow 自动调 `NoticeUI.onBack()`，见 §4.9）。

### P1（体验）

6. ~~**剧情自动跳过**~~ → **不做，并要求"让玩家自己看剧情"**（用户 2026-10-22 02:00 明确裁定）。
   已加硬门控（`flow=fe3500480`）：`onTick` 里 `stepDialogue` / `stepStartAction` / `stepCreateRole` /
   `stepBirthPlace` / `stepSelectSex` / `stepAppearance` / `stepTalent` / `stepDiscover` 全部包进
   `if (!S.done.game)` —— **一旦进过主场景，流程层就不再替玩家点任何对话或剧情页**；
   引导期仍自动推进（否则建角流程会卡死在等待点击上）。
   - 主场景里流程层只剩 `stepNotice`（关公告，不是剧情）；`onTick` 的 gamescene 分支在剧情步骤之前就 `return`。
   - 想连公告也不让流程层碰：在设备上 `touch <可写目录>/bz_noauto` 即可整体停用自动流程（删除该文件恢复）。
   - 证据：`tools/facts/flow-autotap-audit.json`（flow.js 全部 11 处对话推进 / 8 处销毁 / 20 处点击的行号 + `onTick` 整段转录）。
7. ~~**角色面板「金条：undefined」**~~ → **✅ 已修**（impl `hbb441fb3`）：根因是 `OnhookObj.curGold` 缺失
   （面板 `GoldLabel` ← `RoleBaseInfo.gold` ← `InventoryDB.setGold(OnhookObj.curGold)`，index.jsc:111905→64300）。
   `bz-rpc-server.js` 的 LoadGame 现在把 `curGold`（账本 `s.gold` 优先，否则 99999）与 `curJetton` 写进 `OnhookObj`。
   冷启动实测门面显示 `金条：99999`（截图 `probe/shot_gold_fixed.png`）。顺带修掉了 `getItemNum(1)` 算成 NaN 的隐患。
8. **窗口体验**：`MuMuManager control -v 1 show_window` 后 Win32 `SetWindowPos` 固定尺寸/位置。

### P2（工程化）

9. 形状层的弱证据（`listener-1` / `name` / `fallback` 共 200+ 条）继续收：`tools\shapes_report.md` 有逐条清单。
10. `extract_listeners.js` 只认 `function(t, e)` 形式；箭头函数 / `this.xxx.bind` 形式的监听器还没覆盖。
11. ~~`bz_cmd.txt` 的健壮性~~ → **✅ 已在 `boot-2` 根治**（见坑 29 的新对策）：
    - **启动时丢弃残留**：`installCommandChannel()` 先跑 `discardStaleCmd()`——发现开机时已存在 `bz_cmd.txt`
      就把内容留档到 `bz_cmd.stale.txt` 再删除，**绝不执行**。只有本次启动之后写入的命令才会被执行。
    - **删不掉的命令不再重放**：轮询里 `removeFile` 后复查 `isFileExist`；还在就把文件清空并**拒绝执行**
      （否则那个 700ms 定时器会把同一条命令无限重放，这是连续 ANR 的真正机理）。
    - **验收（原故障重现）**：停机状态下植入 `get:1+1` → 启动后日志出现 1 条「启动时丢弃残留命令」、
      `bz_cmd.stale.txt` 里是 `get:1+1`、`bz_cmd.txt` 已消失、`bz_res.txt` 仍是旧内容（**说明一次都没执行**）；
      随后 `.\run.ps1 cmd "ver"` 正常返回 → 正常通道未受影响。
    - 回滚点：`_backup\2026-10-22-012652-pre-bagprobe\bz-bootstrap.js.pre-cmdfix`（逆向重建，字节数 12767 与原文件一致，`node --check` 通过）。
12. 归档早期实验产物（`gateway/`、`probe\*` 一次性脚本、`tools\spec*` 切片）。

---

## 8. 回滚与备份

| 对象 | 位置 |
|---|---|
| 补丁源码（第二阶段前） | `_backup\2026-10-21-2058-pre-P0\`（hook/core/build.js/patch 产物，哈希已核对） |
| 补丁源码（形状层前） | `_backup\2026-10-22-0038-pre-P0-shapes\`（5 个文件，含当时的 `patch\live\handlers.js`） |
| 补丁源码（任务账本前） | `_backup\2026-10-22-0044-pre-task-ledger\`（5 个文件） |
| 策略层单文件（奖励链前） | `_backup\2026-10-22-0107-bz-rpc-server.js` |
| **自检隔离前（§14.2 前）** | `_backup\2026-10-22-0205-pre-selfcheck-isolation\`：两个 core 源文件 + `patch_live_handlers.js` + `patch_live_flow.js` + 设备存档（md5 `d8af398f…`）+ `bz_log.jsonl` |
| **炼金/等级奖励 handler 前（§14.3 前）** | `_backup\2026-10-22-0212-pre-alchemy-handlers\`（含本文件的 `.snapshot`，04:15 事故后就是用它重建的） |
| **技能目标等级前（§14.7 前）** | `_backup\2026-10-22-0232-pre-skill-target\`：两个 core 源文件 + `patch_live_handlers.js` + 设备存档（`39b5e890…`，lv=19/potential=97599） |
| **技能进度落账前（§14.8 前）** | `_backup\2026-10-22-0250-pre-pgr-persist\`：`core_bz-rpc-server.js` + `patch_live_handlers.js` + `test_upgrade-skill-target.js` + 设备存档（`7ac1d403…`） |
| **形状证据审计前（§14.9 前）** | `_backup\2026-10-22-0345-pre-shape-audit-fix\`：`extract_listeners.js` / `shapes.json` / `gen_shapes.js` / `bz-shapes.generated.js` / `patch_live_handlers.js` + 设备存档 |
| **守卫回滚前（§14.10 前）** | `_backup\2026-10-22-0405-pre-guard-rollback\`：`core_bz-rpc-server.js` / `core_bz-handler-impl.js` / `patch_live_handlers.js` + 设备存档（`96c21eda…` 之前那一份） |
| **本文件坏档（事故留证）** | `_backup\2026-10-22-0415-HANDOVER-corrupted.md`（PowerShell `Set-Content` 写坏的 GBK 乱码） |
| **重派取证前（§15 前）** | `_backup\2026-10-22-0430-pre-redispatch\`：`HANDOVER.md.snapshot` / `core_bz-rpc-server.js` / `core_bz-handler-impl.js` + 设备存档 |
| 上一版交接文档 | `_backup\HANDOVER.md.bak-20261022-011755`（更早：`-010105`、`-005632`、`-005105`、`-004536`、`-001454`） |
| 本轮（背包误判核查）现场 | `_backup\2026-10-22-012652-pre-bagprobe\`（`bz_offline_save.json`、`bz_log.jsonl`、`probe.js`、`probe_res.txt`、`flow.js.bak`、`bz-rpc-server.js.bak`、`HANDOVER.md.snapshot`） |
| 游戏存档（含账本） | 设备 `files/bz_offline_save.json`；`.\run.ps1 cmd "state"` 随时可看；改前先复制一份到 `_backup\save-*` |
| 当前存档真实内容 | `name=FZhou`、`bag={3005,3006,3626,4014,4015,7027 各 1}`、`playerEquip={}`、`equipments={}`、`rewarded` 10 个任务、`done` 10 个、`accepted` 11 个（含 100150） |
| 卸载补丁（恢复原版） | `adb shell rm -rf /data/data/com.maple.madherogo/files/hotfix` |
| 只回滚策略层 | 把 `handlers.js` / `flow.js` 换回上一版后 `.\run.ps1 handlers`（新备份目录里有当时设备上的那一份） |

---

## 9. 踩过的坑（含本阶段新增，务必先读）

| # | 坑 | 症状 | 对策 |
|---|---|---|---|
| 1 | 探针参数用 ASCII 写文件 | 中文参数变 `?`，`probe` 找不到节点 | `run.ps1` 已改 UTF-8 无 BOM |
| 2 | 用 .NET API 读写相对路径 | 报"找不到文件"，因为 .NET 用进程 CWD 不是 PS 位置 | 一律绝对路径 |
| 3 | `Split-Path` 处理 POSIX 路径 | 变成反斜杠 → 设备端 `mkdir` 失败 | 用 `-replace '/[^/]+$',''` |
| 4 | `adb` 守护进程被回收 | 中途 `device not found` | `run.ps1` 内部每次调用都重连重试 |
| 5 | `adb exec-out screencap` 走 PS 管道 | PNG 被破坏 | 先 `screencap -p /data/local/tmp/x.png` 再 `pull` |
| 6 | 游戏 HUD 有同名隐藏副本 | `press.js` 点到 inactive 的那份，"点了没反应" | 用**坐标点击**（`tap.js`）或按 active 过滤 |
| 7 | 剧情层会挡住一切操作 | 玩家以为"卡死" | 点画面推进 / 「跳过剧情」 |
| 8 | 引导要"拜师"但已拜过 | 无法再点，教程卡住 | `closeGuide:true` 关闭引导 |
| 9 | 只回形状不记账 | 学技能后"回弹" | 账本：`skills` + `potential` 写档并在 LoadGame 回放 |
| 10 | 工单漏了"交付物落盘" | 苦力模型跑完，结果丢失 | 工单强制 `tools/facts/batchN.json`，回传只作校验 |
| 11 | 沙盒禁 spawn | `execFileSync`/`node --check` EPERM | 用 `require('vm').compileFunction` 代替 |
| 12 | PowerShell 写文件把内容写成 `$null` | 文件被清空（`run.ps1` 事故） | 先 `Contains` 校验再写；改文件用 edit 工具 |
| 13 | `sycnTask` 回 `PlayerFinishTaskObj: {}` | 客户端把它当真相，连本地缓存一起写成 `{}` → 已做过的任务被 NPC 重派（"接了又接"） | 按账本回放；自检加 `task:sync:notEmpty` 断言 |
| 14 | 以为两个接口一个格式 | `LoadGame` 要 `finishTaskObj: ["101080,1"]`（字符串数组，客户端自己 `split(",")`），`sycnTask` 要 `{ "101080": 1 }`（对象） | 用 `taskLedger()` 一处产出两套形状；见 `bz-rpc-server.js` |
| 15 | 照抓包抄钱包字段 | 抓到的是旧快照 `userGold:20`，与进游戏报的 99999 矛盾，客户端弹"银两不足" | 钱包/潜能类字段一律读账本，账本没有就按 LoadGame 同款值 |
| 16 | 只给一行"读取处"推不出类型 | 291 个字段位里 119 个推不出数组/对象/标量 | 加证据源：抓包真值 → 真实 handler → 人工判定 → 客户端初值 `= [] / {}` → 全源用法扫描 |
| 17 | 字段抽取只认具名回调 | `useItem` 被误判成"只看 ACK"，实际客户端读 `note.skch`（64757），我们回 `{eRet:1}` → `a.note.hasOwnProperty` 抛异常 | `tools/extract_listeners.js` 补扫匿名监听器，一次挖出 249 个动作 / 679 字段 |
| 18 | `sycnPlayerItemData` 回空 | 客户端先 `_itemObj={}` 再按 `itemObj` 重建 → 每次同步把背包清空 | 回全部持有物（账本 `bag`）；自检加 `item:sync:itemObj` |
| 19 | 以为 `finishTaskObj` 一种格式 | 见 4.5：`LoadGame` 要字符串数组、`sycnTask` 要对象 | 用 `taskLedger()` 一处产出两套 |
| 20 | 想从客户端读背包 | `_itemObj` 在模块闭包里：`window` BFS 8000 节点找不到，`cc.js.getClassByName` 只有构造函数 | 改为"账本即真相"；一次性导入留了 `bzSeedBag` 维护动作 |
| 21 | 拿真进程里的 handler 做验证 | `upgradeSkill` 空参数一打，`skillID` 缺省成 0，**真存档被写了 skills["0"] 并扣了 100 潜能** | 试打前先 `cmd "state"` 存档快照；已加维护动作 `bzPatch`（`{set,del}`）用于修复；非必要不在真进程打会写档的动作 |
| 22 | 形状表给支付类回 `eRet:1` | 等于对客户端说"充值成功"，违反项目边界 | `dispatch` 里 `PAY_ACTION_RE` 一律拦成 `eRet:4`（明确失败），并记 `PAY_BLOCKED`；自检有 `shape:<动作>:payBlocked` 断言 |
| 23 | 形状表跳过已实现动作 | 手写 handler 漏字段（`getFinishTaskAward` 少了 `clearBoxs/contribution/triggerBoxs`），形状修不到它 | 形状=契约：生成器覆盖全部会读字段的动作；`fillShape` 只补缺不覆盖；`BZ_SHAPES.__impl` 标出"eRet 由 handler 自定"的那些 |
| 24 | 想从缓存里捞配置表 | `cc.loader._cache` / `cc.assetManager` 里都没有（配置加载完即释放），扫 1019 个节点也是 0 | **自己再要一次**：`bundle.load(['configs/item'], cc.Asset, null, cb)`，读 `asset._nativeAsset.data`；见 `probe/dump_tables.js` |
| 25 | 以为 `Reward` 是物品 id | 3054 不在物品表里 → 展开出来是空的 | `Reward` 是**掉落表 id**；`drop.Item1..5=[id,count]`。只有少数任务直接写物品 id，要兜底 |
| 26 | 表用第 0 列当主键 | 第 0 列是 `__name__`，和 `ID` 不一定相等 → 查表查不到 | 用 `ID`（或 `TaskID`）列作主键 |
| 27 | 任务卡在"交不掉" | 任务 100150 的 `SpRequire` 要 `4015×1`，我们从不发物品 → `judgeItemRequire` 永远 false | `acceptTask` 时按 `SpRequire` 补齐；有了奖励链后 `4015` 本来就会由 100140 的奖励发放 |
| 28 | **在跑着的游戏里做全图 BFS** | 用 `seen.indexOf(o)` 判重是 O(n²)，主线程卡死 → **Android ANR → MuMu 弹 Application Error → 强制停掉游戏**（logcat: `Input channel object ... Application Error`） | 探针里一律 `Set` 判重 + **限量**（节点上限 12000、时间预算 2500ms）；再小的上限（800 节点）最稳 |
| 29 | **残留的 `bz_cmd.txt` 会在每次启动重放** | 上一条探针超时后命令文件没被消费，之后每次启动命令通道又执行一遍那段卡死代码 → 连续 ANR，看着像"游戏自己崩" | **已根治（boot-2）**：开机时已存在的 `bz_cmd.txt` 一律留档到 `bz_cmd.stale.txt` 后删除、**不执行**；轮询里 `removeFile` 后复查 `isFileExist`，删不掉就清空并拒绝执行（防 700ms 无限重放）。临时手段仍是 `adb shell rm -f files/bz_cmd.txt`。见 §7 P2-11 |
| 30 | 用 PowerShell `Set-Content` 改含中文的 JS | 编码坏掉、注释把下一行吃掉 → 探针直接语法错/死循环 | 改文件只用 `edit` / `write` 工具；PS 只用来跑命令 |
| 31 | 在真存档上做"改名"实验 | 为了验证 LoadGame 是否生效，把 `save.name` 改成 TESTNAME | 实验完立刻用 `bzPatch` 改回（本次已改回 `FZhou`）；做这类实验前先 `state` 存快照 |
| 32 | 以为客户端会主动发物品同步 | 全客户端**没有**任何地方发送 `User.sycnPlayerItemData`（只有监听器 24014），它是服务器推送型 | 别指望客户端来要数据；环回只能应答，所以物品必须靠 `LoadGame` 带过去——这也是 §7.1 的难点所在 |
| 33 | **把 UI 派生列表当成数据账本** | `ItemSystemUI._itemDataList.length == 0` 被当成"背包空"，实际 `_itemObj` 里 6 样都在；白查一整轮（`setSaveAllItems` / `getItem` / 配置表时序全白工） | 判断"数据有没有"只认模型字段（`__require` 出来的 `RoleBaseInfo._itemObj`）；UI 列表是**过滤后**的，天然可以为 0。见 §7.1 |
| 34 | 以为客户端模型"在闭包里够不到"（坑 20 的结论） | BFS 扫 `window` 8000 节点找不到 `_itemObj`，于是放弃直读、改成"账本即真相" | **`window.__require` 就在 `scripts3.js:1`**：短名查本包、失败回退上一个 bundle。`__require('RoleBaseInfo').RoleBaseInfo._itemObj` 一步到位。坑 20 只是方法错，不是事实。工具 `probe/require_probe.js` |
| 35 | 以为「金条：undefined」是 `RoleBaseInfo.yuanbao` 没给 | 面板印 undefined；给它赋值 `yuanbao` 后重开面板**仍然** undefined（`yuanbao` 本身实测就是 0） | **根因**：面板 `GoldLabel` 绑的是 `RoleBaseInfo.gold`（scripts2.js:49725），而 `gold` 的唯一正规来源是 `InventoryDB.setGold()`（64300）← `OnhookObj.curGold`（111905）；我们只给了顶层 `curGold`（那只被 `createRole` 70457 读），老档走不到 → `gold` 恒 undefined。**修法**：把 `curGold/curJetton` 写进 `OnhookObj`（`bz-rpc-server.js` LoadGame），冷启动实测面板显示 `金条：99999` |
| 36 | 生成器把**方法调用**当成应答字段 | 形状表里出现 `addComponent` / `setLabelTitle` / `dataArr.pop` 这种"字段"，证据行全是 `o.addComponent("XxxUI")` | 提取器只认 `p2.<name>` 形态、不看后面是否跟 `(`。修法（§14.9）：紧跟 `(` 判为方法调用，单段丢弃、多段保留父字段。**同类风险**：`manual` 表的 evid 也会指错行（本轮 4 条），所以人工判定同样要过 `audit_shapes_evidence.js` |
| 37 | 配置表 `table` 里混着**索引行**，直接 `Object.keys` 会翻倍 | `tbl_tasknew` 的 `table` 有 9682 个键：4840 个真实行（纯数字键）+ 4842 个 `__name:<id>` 反查索引；第一版分桶把总数报成 9682、`Type` 全成 `?` | 只取 `/^[0-9]+$/` 的键，或按 `rows` 字段核对条数。**另一条**：`Require` 列 4840 行全是 `"0"`（不是前置链），前置链在 `Pre-Require` —— 别按列名想当然 |
| 38 | 把"包装不回执"当成"工人死了" | workflow 的 `status` 一直是 running，但交付物早落盘（三次都是这样） | **判断工人死活只看交付文件是否落盘 + 内容能否解析**，不看包装状态；落盘且合法就收尸（`job_kill`），不重派。重派只在文件缺失或非法时才做 |
| 39 | **把 `note.ivch` 当"变动量"发** | 20 个月饼卖 1 个，界面只剩 1 个；界面还被"改小"→ 看着有货 → 能反复卖（服务端其实已扣到 0）。买 2 个变 2 个同理 | 消费端是**赋值**不是累加：`INVENTORY_CHNG` 直接 `setItem(n, o[n])`（index.js:64674-64676）。所有"推物品"一律发**绝对值**；`eqch` 发 `[0]`/`[1,[type,num]]`；钱包发 `note.eco`。回归钉在 `test\sale-coins.js` T11/T12、`trade-buy.js` T1 |
| 40 | **拿 `buyShopItem` 当"免费灌物品"工具**（自检和 3 个测试都这么干过） | 买变成真交易后，这些断言全挂（`task:need:noDoubleCount` 等 3 条） | 灌种子只用维护动作 `bzSeedBag {itemObj:{id:n}}`；自检/测试里凡"先给物品"一律走它 |
| 41 | **`bzPatch` 的 `set` 只写顶层键** | 想"把背包 3003 设成 20"，写成 `{set:{"3003":20}}` → 存档里多出顶层垃圾键 `"3003":20`，`bag.3003` 一点没变 | 改背包必须 `set:{bag:{完整对象}}` 整体替换；清顶层垃圾键用（新增的）`delTop:["3003"]` |
| 42 | **只搜一个 bundle 就断言"某模块在未解出的包里"** | 说 `SpecialGoodsModel` 不在已解包 → 其实它一直在 `tools/index.js:123363`，白绕一轮 | 「某符号在不在」必须**三包全搜 + 大小写各一次**（`index.js` / `scripts2.js` / `scripts3.js`），这是 §10 已经写过的规矩，本轮又犯 |
| 43 | 以为"包没解完所以处处碰壁" | 设备上 14 个 bundle：3 个早解好、`main` 本轮解出（188 KB → 25,273 行）、**其余 10 个各 320 字节（空壳占位，解出来只有 26 行）** | 先 `adb shell ls -l` 看字节数再决定要不要解；320B 的包没有代码。`tools/decrypt_bundles.js` 一把梭 |
| 44 | 客户端"货架数量"被当成摊贩库存 | 玩家报"我买的时候摊贩可售卖数量和我包里的数量一模一样" → 其实那一列表头就是**「拥有数量」**，客户端填的是 `numbers: RoleBaseInfo.getItemNum(i)`（scripts2.js:46442/46467） | 这个游戏的商店**没有"库存"字段**（`ShopArray` 只有 `item[]`/`price[]`）。别照"库存"的思路去修；判断"数据对不对"只认账本 |
| 45 | **工人越界改交接文档** | `HANDOVER.md` 在 06:40 被某个只读取证工人插入了一段 §15 更正（内容为真，故保留），md5 与我 07:00 的备份不一致 | 工单写"只许写自己的交付文件"管不住；**每轮收工后核对关键文件 md5**（`HANDOVER.md`、`core\bz-rpc-server.js`），不一致先 diff 再动 |
| 46 | **npcArr 只有 22 格**（`npc_stats.json` 少了 4 格） | 战斗 0.2 秒内静默失败：`initRivalEntity` 读 `e.HardModel[0]`（index.js:74652），`HardModel=t[23]=undefined` → TypeError 被 MessageCenter 吞掉，**日志里只剩一行 xhr 异常** | `generateNpcData` 要 **26 格**（index.js:8099-8134）；生成器强制补齐，HardModel 从 npc 配置表取真值；回归 `test\battle-npc-arr.js`。**教训：凡是"按位置的下标数组"，格数必须以消费端逐下标的读点为准，不能信产出方自己的命名** |
| 47 | **形状表把"分支选择器"字段也补上**（`formulaID:0` 等） | useItem 后 `Cannot read property 'name' of null @ index.js:64796`：客户端 `hasOwnProperty("formulaID")` 为真 → `getItem(0,"formula")` 为 null | 客户端用 hasOwnProperty 当开关的字段（配方/坐骑/宝石/任务…），**缺省必须不发**；useItem handler 里有 `BRANCH_ONLY` 删除清单，以后其它动作同罪同罚 |
| 48 | **LoadGame 没发 `cycleObj`** | 洗点按钮点了连请求都没有：`MarryModel.cycleData` 来自应答 cycleObj（index.js:77051），缺失=空数组 → `cycleData[4][e]` TypeError（scripts2.js:51009） | LoadGame 补 cycleObj（下标语义见 §18.2 的表）；**洗点/转世类字段少一个就是静默崩溃**；回归 `test\wash-points.js` |
| 49 | **模拟器被关闭后 adb 全挂** | `adb connect` 报"积极拒绝"，run.ps1 所有子命令失败 | `MuMuManager control -v 1 launch` 拉起 VM（errcode 0 但要等几分钟）；**`is_android_started` 标志不可信**（一直 false 但 adb 其实通了），以 `adb connect` + `adb devices` 为准；VM 重启后重新 `adb root`（root 会让 adbd 重启、连接断开，再 connect 一次）；游戏随 VM 自启，热重载即可 |

---

## 10. 委派纪律（本阶段已建立，继续用）

- 工程苦力 → `gemini-3.8-flash-low`（`provider: cmdc-gemini`），**只做机械转录**：读切片、抄行号、抄字段。
- 工单必带：范围（绝对路径清单）、苦力约束（不判断/不推测）、交付格式（`行号: 原文`）、
  **交付物落盘路径**、数据红线。
- 主审只做：写工单、验收抽样（每份抽 1–2 条回源码核对）、判断与写入。
- 已产出的证据链：`tools/spec2/`、`tools/spec3/`（切片）、`tools/facts/batch*.json`（用法取证）、
  `tools/field_usage.json`（合并）、`tools/action_facts_all.json`（812 动作全量）。
- 2026-10-22 01:33 这一轮的实际用法（可照抄）：4 单全部 `gemini-3.8-flash-low`，工单只给「读第 X-Y 行、逐字抄、标行号」，
  交付强制落盘 `tools/facts/inv-w*.json` + 回传同一份 JSON；主审只做判定与抽样（抽 2 条回源码核对，1 次通过）。
  效果：`index.js`+`scripts2`+`scripts3` 共 33 万行的检索基本没吃主上下文，
  且从 `scripts3` 里挖出了 `window.__require`（推翻坑 20）与 `RogueRoleInfo` 第二本账。

---

## 11. 接手第一天怎么做（照做即可）

1. `.\run.ps1 status` → 确认 `scene=gamescene`、`errors` 无。
2. `node test\l0-envelope.js` → 82 项全绿。
3. 打开模拟器窗口（第 3 节），肉眼确认画面与日志一致。
4. 想改什么：改 `core\bz-rpc-server.js` → `node build.js` → `.\run.ps1 handlers`（**不重启**）。
5. 玩家在玩时：`.\watch.ps1` 盯 `UNKNOWN` / `err`，出现就按第 4.2 节查源码补形状。
6. 需要新动作：`node tools\extract_all.js` 查 `field_lines` → 回 `tools/index.js` 抄那一行 → 写 handler。

---

## 12. 给接手者的一句话

**先看日志再动手，先查源码再猜形状。**
第二阶段证明了：抓包和肉眼观察只能支撑到"能进游戏"，往后每一步都必须读客户端源码。
现在源码已经解出来了（`tools/index.js` + 密钥），把"猜"换成"查"，是最省时间的一条路。

---

## 13. 2026-10-22 01:57 会话收尾交接（**已被 §14 取替；要接手直接读 §14**）

> 本会话按用户裁定执行：**任务结束时上下文若 ≥60%，就自己写交接、开新会话**。本节就是这次交班。

### 13.1 当前部署与实测状态（全部进程内验证过）

| 项 | 值 |
|---|---|
| 版本 | `boot-2 / impl=he7190a3a / flow=fe3500480`（**本会话当时**的版本；当前见 §14.1 = `h124aca9d`） |
| 运行 | `pid 24125`、`scene=gamescene`、`errors=0` |
| 存档 | `potential=98699`、`skills={"1":[8,0,1],"7":[2,0,1],"8":[10,0,1],"1112":1,"1262":1}`、`bag={3005,3006,3626,4014,4016,7027}`、`done/rewarded` 各 12 个任务 |
| 客户端一致性 | `__require` 直读：`potentials=98699`、`SkillTable.dic` `1=8 / 7=2 / 8=10` —— **与账本完全一致** |
| 本项目录 | `_backup\2026-10-22-012652-pre-bagprobe\`（存档/日志/`flow.js.bak`/`bz-rpc-server.js.bak`/`bz-bootstrap.js.pre-cmdfix`/文档快照） |

### 13.2 本会话修好的四件事（都有验收证据）

1. **金条 `undefined`** → `OnhookObj.curGold`（面板 `GoldLabel` ← `RoleBaseInfo.gold` ← `InventoryDB.setGold(OnhookObj.curGold)`）。详见 §7 P1-7、坑 35。
2. **命令通道残留重放**（`boot-2`）→ 启动丢弃 + 删不掉就拒绝执行。详见 §7 P2-11、坑 29。
3. **剧情不再被自动推进**（`flow=fe3500480`）→ 进过主场景后 `stepDialogue/stepStartAction/...` 全部跳过。详见 §7 P1-6。
4. **技能升级**（`impl=he7190a3a`）→ 等级单调不降（旧代码照抄客户端 `skillArr[1]`，请教"取消"时把 10 写成 2）；并把 `potentials`/`SkillTable.setSkill` 用 `window.__require` 推回客户端模型（该动作的应答消费端只读 `eRet`/`returnPro`，index.jsc:119842）。

### 13.3 未解清单（按我判断的优先级）

1. ~~**自检在污染真存档**~~ → **✅ 已结案（§14.2），但原诊断只对了一半**：
   - **存档文件其实没被写**：`selfCheck()` 里 6 个实例全部 `makeServer(memMake())`，`persist()` 走内存 store。
     可复跑证明：`node test\selfcheck-nosave.js` → `writesToSave=0`、字节与 sha 不变。
   - **真正被污染的是活着的客户端模型**：`upgradeSkill` 结尾的 `window.__require` 推送在自检里也执行了，
     每次 reload 把 `potentials` 写成 99699 并造出假技能 0（复跑：`node test\selfcheck-model-push.js`，
     修前 `potPushes=[99899,99799,99699]`、`setSkill=[[0,1],[0,2],[0,3]]`，修后全空）。
   - 这也解释了为什么存档 `potential` 一直是 98699、`skills` 里没有 `"0"` —— 存档从来没被自检改过。
2. ~~**请教面板"学到 12、取消变 8"**~~ → **✅ 已结案（§14.7）**：真实请求参数已拿到
   （`{"skillID":1,"skillArr":[15,0,1],"NPCID":1003,"flag":0}`），**`skillArr[0]` 是目标等级**、`[1]` 是进度 pgr。
   旧代码读 `[1]`（恒 0）→ 落到 `cur+1`，于是"无论学几级都只涨一级、取消也涨一级"。已改：按 `[0]` 记账、目标≤当前即不动。
3. ~~**`getAlchemyData` 抛异常**~~ → **✅ 已修（§14.3）**：手写 handler 回
   `{eRet:1, data:{state:0,type:0,id:0,price:10,num:0}, alchemyGearConfig:{}}`。
   消费端 `onGetAlchemyData`（scripts3.js:7005-7026）原来直接读 `e.data.state` → `TypeError`。
   同级问题 `getLevelBonusData` 一并补了（scripts3.js:43812-43828）。
4. **交任务后 3 次 `.includes` 异常**：`unhandledRejectedPromise TypeError: Cannot read property 'includes' of undefined`，紧跟 `getFinishTaskAward 100150`，只在登录窗口内出现 3 次、不复发。`onGetFinishTaskAward` 在 `index.js`/`scripts3.js` 里搜不到名字（匿名监听器），需再定位消费点。
5. ~~**两个 `UNKNOWN` 动作**~~ → **✅ 已补（§14.3）**：`getAlchemyData`、`getLevelBonusData` 现在是手写 handler，
   端上日志由 `UNKNOWN User.xxx` 变成 `dispatch User.xxx`。
   - 另有 `UNKNOWN User.recordAttributes`（属性上报类，通用 ACK 够用，不卡进度；暂不实现）。

### 13.4 ~~一条反直觉事实~~ → **已推翻（证据：`tools/facts/upgrade-skill-send-path.json`）**

**上一条结论是搜漏了 `scripts2`，不是事实。**真实发送链：

| 位置 | 代码 | 说明 |
|---|---|---|
| `scripts2.js:13923-13928` | `sendUpgradeReq(t,e)` → `SkillModel.reqChangeSkillLv(t, e.lv, e.pgr, e.brlv, teacher, type)` | 请教 UI 的发送入口（唯一调用点） |
| `index.js:119873-119881` | `skillArr: [e, Math.floor(o), i]` → `sendRequest(UPGRADE_SKILL_LV, l)` | `skillArr = [目标等级, 进度, 突破等级]` |
| `index.js:59581` | `UPGRADE_SKILL_LV: "User.upgradeSkill"` | 动作名常量 |
| `index.js:119842-119845` | 只读 `eRet` / `returnPro` | 应答消费端 |

教训：**凡判定"某函数有没有调用点"，三包必须全搜**（`index.js` / `scripts2.js` / `scripts3.js`）；
且 grep 大小写敏感——搜 `getLevelBonusData` 抓不到 `onGetLevelBonusData`（本轮 WO-2 就据此报了一条假"无消费者"）。

### 13.5 让模拟器窗口到前台（本会话实测可用，照抄）

```powershell
$m='D:\taptap\Support\android_emulator\engine\nx_main\MuMuManager.exe'
& $m info -v 1            # 取 main_wnd / pid / adb_port（VM index=1，虚拟机名「暴走英雄坛游戏软件V1.0」）
& $m control -v 1 show_window
# show_window 只显示、不置顶，必须再补 Win32：
#   ShowWindow(hwnd, 9) + SetWindowPos(hwnd, 0,0,0,0,0, SWP_SHOWWINDOW|NOSIZE|NOMOVE) + SetForegroundWindow(hwnd)
# 复核：IsWindowVisible / IsIconic / GetForegroundWindow == hwnd
```
`hwnd` 从 `info -v 1` 的 `main_wnd` 十六进制转 `IntPtr`。当前 `main_wnd=001F110C`、rect `255,39 486×895`。

### 13.6 委派实践（本会话踩到的坑，写进工单模板）

- 工单里凡涉及"某函数有没有调用点"的判定，**必须写明三个 bundle 全搜**（`index.js` / `scripts2.js` / `scripts3.js`）——本会话漏了 `scripts3` 得出过错误结论。
- 苦力交付仍是"强制落盘 + 回传只给行号"，回传 ≤250 字，主审抽样 1-2 条回源码核对。
- 本会话采信率：≥80%。工人如实报 `function not found`（`acceptTask` 等是匿名监听器）是好行为，别当失败。
- 已产证据：`tools/facts/inv-w*.json`（背包）、`task-t1-judge.json`（任务判定行号）、`flow-autotap-audit.json`（剧情自动点击全清单）、`cmd-channel-full.json`（引导层命令通道）、`includes-hunt.json`。

### 13.7 下一个会话的第一件事（**已被 §14 取替，只看下面结论**）

- §13.7 写这条时列的五件事：`status` 确认、记快照、修 13.3-1、让玩家点请教、修 13.3-3 —— **后三件都已做完**（见 §14.2 / §14.7 / §14.3）。
- 现在开局照 §14.6 做（四条命令，按 `impl` 版本和四条回归自检）。

---

## 14. 2026-10-22 会话推进（**任务/技能/存档三条线的实现都在这一节；更新的数据核查见 §15**）

> 本节记录本次会话（第三会话起）的全部改动与证据。`impl` 演进：`h81668f61` → `ha44900ea`（自检隔离）→ `h81668f61`（两条 handler）→ `hee1125fd`（技能目标等级）→ `h89800974`（技能进度落账）→ `h081f1ef7`（形状审计）→ `h45cf6863` → **`h124aca9d`（守卫回滚 + 维护备份 + 请求取证，当前）**。

### 14.1 当前部署与实测

| 项 | 值 |
|---|---|
| 版本 | `boot-2 / impl=h124aca9d / flow=fe3500480` |
| reload | 196–266 ms，**pid 24125 全程未变**（所有改动都是热重载，没重启过游戏） |
| 存档 | md5 `96c21eda8bb95775191b90b65449bcea`，`saveVersion=4`，`skills` 已全部归一成 `[lv,pgr,brlv]` |
| 回归 | `l0-envelope` 82；进程内自检 **1100**；`save-migrate` **43**；`upgrade-skill-target` **22**；`selfcheck-nosave` / `selfcheck-model-push` 退出 0 |

> ⚠ **看版本别只看 `.\run.ps1 status`**：`bz_ready.json` 只在启动/场景切换时刷新，热重载不改它，
> 所以 reload 后 `status` 仍显示开机时的 `impl`。正确判据是 `.\run.ps1 handlers` 返回的 `reload:{...}` 或日志行的 `"impl"`。

### 14.2 修：自检污染（13.3-1 的真正漏点）

**结论：存档文件从来没被自检写过；被写的是活着的客户端模型。**（原 §13.3-1 的诊断只对了一半，已在原处更正）

| 文件 | 改动 | 为什么 |
|---|---|---|
| `core/bz-handler-impl.js` | `makeServer(store)` 传 `sandbox: !!store` | 隔离实例要能自我识别，否则 handler 里"推给活客户端"的副作用拦不住 |
| `core/bz-rpc-server.js` | `upgradeSkill` 的 `window.__require` 推送包进 `if (!env.sandbox)` | 自检拿内存空档跑 `upgradeSkill`，算出 `99999-100n` 并 `setSkill(0,lv)`，把假值写进活客户端 |
| `core/bz-handler-impl.js` | `selfCheck()` 首尾比真存档字节；有变化就回写原始字节并把 `selfcheck:noSaveWrite` 判 FAIL | 护栏：将来任何 handler 直接落盘都会被当场抓住并还原 |

可复跑用例（不用设备）：

```powershell
node test\selfcheck-nosave.js       # 退出 0 = 自检没写真存档（真存档内容塞进假 store，比字节+sha）
node test\selfcheck-model-push.js   # 退出 0 = 自检没推活客户端模型（假 window.__require 记录 setter/setSkill）
```

修前 `selfcheck-model-push.js` 退出 1 并打印 `potPushes=[99899,99799,99699]`、`setSkill=[[0,1],[0,2],[0,3]]`（**这就是原故障重现**）；修后全空。

### 14.3 修：两条 `UNKNOWN` → 手写 handler（13.3-3 / 13.3-5）

| 动作 | 应答 | 依据 |
|---|---|---|
| `getAlchemyData` | `{eRet:1, data:{state:0,type:0,id:0,price:10,num:0}, alchemyGearConfig:{}}` | scripts3.js:7005-7026 读 `e.data.state`、`for..in e.alchemyGearConfig` |
| `getLevelBonusData` | `{eRet:1, bonusObj:{}, endTime:0}` | scripts3.js:43812-43828 + `LevelBonusUI.loadItems`(43919-43926) 只 `for..in bonusObj` |

**没有手改生成物**（`bz-shapes.generated.js` 仍由 `tools/gen_shapes.js` 产出）。端上验证：日志由 `UNKNOWN User.xxx` 变 `dispatch User.xxx`。

### 14.4 推翻 §13.4

`reqChangeSkillLv` 不是零调用点：`scripts2.js:13923-13928`（请教 UI 的 `sendUpgradeReq`）就是发送入口，`skillArr=[目标等级,进度,突破等级]`（`index.js:119876`）。详见 §13.4 表。

### 14.5 委派与验收（可照抄）

三个只读苦力（`gemini-3.8-flash-low`）并行、各 2–10 分钟、强制落盘 + 回传同一份 JSON：

| 单 | 交付 | 验收结论 |
|---|---|---|
| WO-1 自检触碰面 | `tools/facts/selfcheck-touch-surface.json` | 可用（能落盘的只有 `persist()`/`reset()` 绑定的 `server`） |
| WO-2 炼金/等级奖励字段 | `tools/facts/shape-alchemy-levelbonus.json` | 部分不可信：`unverified` 里"三包无消费者"是错的（grep 大小写漏了 `onGetLevelBonusData`） |
| WO-3 技能升级发送路径 | `tools/facts/upgrade-skill-send-path.json` | 条目可用；**命令块是 GBK 乱码且 JSON 不合法**（工人用 `Select-String` 拼字符串导致），关键条目主审回源码核对通过 |
| WO-A 存档快照形态 | `tools/facts/save-fixtures.json` | 可用：4 份快照 = 快照1 全裸数字、快照2–4 混形态 → 证实"形态指纹"必误判 |
| WO-B/C 弱证据 / 写入点 | `weak-verified-a/b/all.json`（255 条，交叉核对 255/255 一致）、`save-write-paths.json`（49 条） | 可用；写入点按"赋值行"归 handler 会漏（背包写在 helper `bagAdd` 里） |

三条硬规矩：①"某函数有无调用点"必须**三包全搜 + 大小写**；②让工人报 grep 命中必须给 `node tools\grep_src.js` 的原始输出（别让它自己拼字符串）；③工人报"某处无 X"时，主审换一个模式复搜再采信。

### 14.6 下一个会话的第一件事（照做）

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
cd F:\BaoZouyxt\hotfix-patch
.\run.ps1 status                                    # scene=gamescene；版本看 reload/日志
.\run.ps1 cmd "state"                               # potential / skills / saveVersion 快照
node test\l0-envelope.js                            # 82 项
node test\save-migrate.js; node test\upgrade-skill-target.js
node test\selfcheck-nosave.js; node test\selfcheck-model-push.js   # 两条都该退出 0
```

### 14.7 技能升级「目标等级 / 取消不涨级」（`hee1125fd`）

用户原话：「无论学几级取消都是加一级」。端上日志（`skillArr` 真实值）坐实：

| 点击 | 客户端发的 | 账本旧值 | 旧代码 | 应该是 |
|---|---|---|---|---|
| 1 | `[15,0,1]` | 12 | 13 | 15 |
| 2（取消） | `[15,0,1]` | 13 | 14 | 不动 |
| 3 | `[17,0,1]` | 14 | 15 | 17 |

两个叠加的错：①**读错下标**——`skillArr[0]` 才是目标等级（`scripts2.js:13846-13854` 发 `lv: o.lv+1`），`[1]` 是 pgr（实测恒 0）；②**无条件至少 +1**，于是"取消"也涨级，且每次固定扣 100 潜能。

改法：`reqLv = arr[0]`；`lv = max(curLv, reqLv)`；**目标 ≤ 当前 = 取消/重复 → 等级与潜能都不动**；潜能按 `100×(lv-curLv)` 扣；`note.skch[id]` 回显 `[lv,pgr,brlv]`。

### 14.8 技能进度（面板 `(80%)`）不保存（`h89800974`）

根因：`skillArr[1]` 是进度（端上实测 `[5,6,1]` = 等级不变、进度 6 = 面板 80%），而 14.7 的取消分支**什么都没写档** → 重进 `LoadGame` 回放 `[5,0,1]` 把 80% 抹平。

改法：取消分支也把 `pgr/brlv` 写进账本并 `persist()`；`pushSkillToClient` 增加进度/突破等级推送（只推等级会让面板 `(xx%)` 与账本脱节）。**新增无效请求守卫**：缺 `skillArr` 或 `skillID=0` → 直接 ACK、绝不落账（这是新用例当场抓出的自造回归：无条件写档会写出假 `skills["0"]`）。

### 14.9 形状表证据审计：清掉 13 个伪造字段（`h081f1ef7`）

发现路径：给 255 个弱证据字段做确定性扫描时，看到 `BeginList.addComponent` 这种字段名本身就是 UI 方法，证据行是 `var i = o.addComponent("OnhookQueueBgUI")`。

两个可重跑脚本（以后每次改形状表都要跑）：

```powershell
node tools\scan_weak_fields.js        # 255 个弱证据字段在三个 bundle 里的同名属性访问（一次扫全量）
node tools\audit_shapes_evidence.js   # 逐字段核对 evid 的 "bundle:line"：那行到底有没有这个字段
```

| 文件 | 改动 |
|---|---|
| `tools/extract_listeners.js` | 捕获路径若紧跟 `(` 判为方法调用：单段（`addComponent`）丢弃；多段（`dataArr.pop`）**保留父字段** `dataArr` |
| `tools/gen_shapes.js` | `MANUAL` 表 4 条 evid 指错行：`activityShows`→`index.js:57455`、`newAcc`→`scripts3.js:95797`、`FashionTimeMap`→`index.js:75623`。**这 4 条字段是真的，错的是引用** |

结果：硬误报 14 → **0**；动作 338 → 337（`onBatchBreakByGold` 只剩伪造字段，整体剔除，`eRet` 由通用 ACK 覆盖）；字段 1105 → **1092**；自检 1103 → **1100**。

教训：**`manual` 也会错，人工判定同样要过审计器**；另外我自己第一版审计把 `o.hasOwnProperty("skillid")` 误判成"证据行不含该字段"（误伤 20 条），补上 `hasOwnProperty(` / `'x' in o` 两种形态后降到 4 条 —— **判定器也要自证**。

### 14.10 A04/B01 回执落地：守卫回滚 + 维护备份 + 请求取证（`h124aca9d`）

回执原文 `docs/sota/reply-B01-A04.txt`，采纳台账 `docs/sota/B01-A04/adopted.md`。它挑出我们 6 个真问题，本轮先做不依赖事件层的三件：

| 改动 | 为什么 |
|---|---|
| **守卫拒绝时回滚内存**（`_save = clone(_lastGood)`） | 原来只拒写、内存仍是脏的：坏值继续被投射成应答 → 客户端清空本地 → 后续动作把空写实。**这正是事故 A 的机理** |
| **维护动作写前备份**：`bzPatch/bzSeedBag/bzBackfillRewards` 写前落一份 `<save>.pre-maint.json` | 事故 D 就是维护动作直接改档且没备份 |
| **请求参数取证日志**：`REQ <动作> p={...}`（`ReqSelfBattleInfo/CheckBattleResult/acceptTask/getFinishTaskAward/killNpc/collect/obtainCrop`） | B01 的建模前提是"结算请求带什么"，而原来只打 `dispatch User.X` |

端上验收（`impl=h124aca9d`，存档 md5 全程未动）：

```
bzPatch{set:{}}        → 生成 bz_offline_save.json.pre-maint.json（756 B）
bzPatch 技能1→2         → ⚠ 写前守卫拒绝（动作 bzPatch）: 技能1等级下降 40→2 → 内存已回滚到上次落盘快照
CheckBattleResult       → REQ CheckBattleResult p={"win":1,"npcID":1003}
```

顺带修了会误导人的日志：`bzPatch` 被拒后仍打印 `bzPatch set skills`，现在追加 `← 写档被守卫拒绝（见上一行原因），仅内存生效`。

**弱证据字段核查（已固化）**：两片工人 255 个字段与确定性扫描 **255/255 一致**，合并存 `tools/facts/weak-verified-all.json`。但要说清：这只证明**字段名在 bundle 里作为属性访问存在**，不证明"是在应答上下文里读"（例：`BuyMount.sync` 的命中行是 `i.sync`，另一个对象）。这层要靠 MODE 表 + 变异测试。

### 14.11 未解与下一步（按优先级）

1. **等玩家打一场怪**：看 `REQ CheckBattleResult` 的真实参数（有没有怪物 id / 数量 / 战斗实例 id）。这一步决定击杀类任务能不能做——B01 的全部前提都压在它上面。
2. **事件层**（大改，需单独授权）：`action → Event[] → 字段效果` 目录 + 守恒守卫（变化必须被事件解释），替换现在"只看方向"的规则。
3. **v5 迁移**：引入 `taskProg{seq,pendingStart,battleWatermark,active{acc,c,legacy}}`，给老的在办任务打 `legacy` 标记，否则上线当天全被误拒。
4. **MODE 表**（接口 × 字段路径 → snapshot/delta/replace）：判不出来的一律按 `replace` 处理。
5. **`includes` 异常**仍未定位（登录窗口 3 次，紧跟 `getFinishTaskAward`），留档 `tools/facts/includes-hunt.json`。
6. 调试通道还应改成独立路由 + `Maintenance` 事件（现在只是加了写前备份）。

### 14.12 值班纪律（本轮新增，血的）

- **禁止用 PowerShell `Set-Content` / `Out-File` 改含中文的文件**。本轮就把本文件写成了 GBK 乱码（1490 个 U+FFFD，不可逆），只能靠快照重建。改文件只用 `edit` / `write` 工具。
- 崩溃或损坏后**先留证再修**：把坏档复制到 `_backup\…-corrupted` 再动手。
- 每次改既有文件前先备份并核对 md5（本轮共 7 个备份目录，见 §8）。

---

## 15. 2026-10-22 04:10 任务数据核查：B01 的前提被证伪（**⚠ 本节部分结论已被 §16 更正，先读下面这段再往下看**）

> **本节的更正（2026-10-22 06:40，依据 §16.3 / §16.4 与端上实测）**
>
> | 本节原结论 | 更正 |
> |---|---|
> | §15.2「待批准：先借后还（借差额、交任务还差额）」 | **方案作废**。§16.3 已用更好的做法解决了同一问题：`acceptTask` **不再往背包写差额**、`getFinishTaskAward` **不再扣 `SpRequire`**，差额只出现在 `LoadGame`/`sycnPlayerItemData` 的**投射**里（同物品取 max）→ 净变化天然为 0，不需要借款科目。依据：客户端交付时从不扣 SpRequire（`updateTaskData` 的 `case 2: break;`，index.js:134531），任务链路里也没有任何 `reduceItem`/`removeItem` 调用点 |
> | §15.1「任务表没有任何计数字段 → 击杀状态机没有比对基准」 | **要修正一半**：`SpRequire` 在 **Type3** 上是**怪物 id**（`judgeFightRequire` → `fightTaskObj`），所以"打某种怪"是靠 SpRequire 表达的，不是靠独立的计数列；§16.3 第 2 条据此把 `need` 只对 Type 2/12/13 生成（682→674 条） |
> | §15.1「282 个需求 id 不在 item 表」 | 与 §16.6 第 3 条同源且更严重：**774 个 `Reward` 指不到任何表**（790 不在 drop 主键、774 也不是 item id，454 张表里按主键都找不到） |
>
> 本节的**数据仍然有效**（4840 任务、`Require` 全 0、1058 个 SpRequire、来源覆盖率、npc 掉落 19 种物品），失效的只是**由这些数据引出的方案判断**。

### 15.1 三个新事实（都是全量统计，可复跑）

| 事实 | 数据 | 怎么复跑 |
|---|---|---|
| **任务表没有"计数目标"任何字段** | 4840 个任务、41 列；`Require` 列 **4840 行全是 `"0"`**；完成条件只有 `SpRequire`（要携带的物品，1058 个任务）和 `Pre-Require`（前置链，4561 个任务） | `node tools\task_buckets.js` |
| **任务所需物品的来源极少** | 875 种被要求物品：多来源 12 / 仅任务奖励链 66 / 仅商店 56 / 仅打怪 0 / **查不到来源 741**；其中 **282 种连 `item` 表里都没有** | `node tools\drop_coverage.js` |
| **npc 表已导出，含 `Drop` 列** | 6551 个 NPC，867 个有 Drop；但掉落只产出 **19 种**不同物品（阈值 probability>=100） | `probe\npc_table_probe.js`、`probe\dump_npc_drop.js` |

> 结论：**外部顾问 B01 的核心假设（"计数目标可从 Type + Require 解析"）不成立** —— 本作任务没有计数。
> 它的"事件推断计数"（方式③）没有比对基准，别照着写状态机。

### 15.2 由此得出的工程结论

1. **不能直接下线"自动补齐 SpRequire 物品"**：741 种物品在（任务奖励 ∪ 商店 ∪ 打怪）里没有来源，关掉会让大量任务做不完。
2. 现实现是 `if (have < want) grantItem(s, k, want - have)`（只补差额，`bz-rpc-server.js` 的 `acceptTask`）——
   这就是外部顾问指的"数值凭空增加"，但它是当前唯一能玩下去的权宜。
3. **待批准的解法：先借后还（净变化恒为 0）**
   - `acceptTask` 补差额时同时记 `borrowed[itemId] += 差额`；
   - `getFinishTaskAward` 交任务成功后把 `borrowed` 的数量从背包扣回并清账；
   - 守卫里 `borrowed` 是唯一允许背包凭空增加的科目；断言：借入总量 == 归还总量、`borrowed` 不跨会话残留。
   - 该方案已写进给外部的回执（`docs/sota/outbox/08-R01-b01-facts-reply.txt`），等它评审"多笔借款 / 放弃任务 / 买重 / 重启"四种边界。

### 15.3 新增数据与工具（都可重跑）

| 产物 | 说明 |
|---|---|
| `tools/cfg/npc_compact.json` | 6551 个 NPC 的 `{d:Drop, e:exp, h:HP, a:Attack, t:Type}`（307 KB，设备导出后 pull 回） |
| `tools/facts/task-buckets.json` | 任务分桶：Type / TaskType / SpRequire 形态 / Pre-Require flag |
| `tools/facts/drop-coverage.json` | 875 种需求物品的「可打怪获得 / 不可获得」清单（含对应任务 id） |
| `tools/task_buckets.js` | 任务分桶脚本（**注意**：`tbl_tasknew.json` 的 `table` 里既有真实行（纯数字键 4840）也有索引行（`__name:<id>` 4842），第一版把两者都数导致虚报 9682） |
| `tools/drop_coverage.js` | 覆盖率脚本（任务奖励 / 商店 / 打怪 三来源分类） |
| `probe/npc_table_probe.js`、`probe/dump_npc_drop.js` | 只读探针：查 `CFMgr.dic.npc` 结构 / 导出紧凑表 |

### 15.4 仍未解

1. **282 个 `SpRequire` 的 id 不在 `item` 表**（如 `1028`、`310003`）——说明还有别的配置表在管这批 id（`dicTableCount=454`，
   已确认有 `gear`、`book`、`equip` 类表名，但未逐个核对）。
2. **`includes` 异常**：`HttpConst.FINISH_TASK`（= `User.getFinishTaskAward`）在三个 bundle 里**只有常量定义、没有 `.on(` 注册点**
   → 消费端经别名注册或不在已解出的三包内。3 次异常不崩、不影响游玩，挂着。
3. 打怪掉落尚未入账：`killNpc`/`CheckBattleResult` 只回模板，玩家打怪不掉东西（这也是"物品来源少"的直接原因之一）。

### 15.5 下一步（按依赖顺序）

1. 等外部回执评审"先借后还"的四种边界 → 再实现（含 v5 迁移 `borrowed` 字段 + 3~5 条断言）。
2. 打怪掉落入账：`npc.Drop` 已在 `npc_compact.json`，可生成 `bz-npcdrop.generated.js`（同 `BZ_TASKS` 的做法），
   在 `killNpc`/`CheckBattleResult` 里按 npc 发奖——这是给"物品来源"补上最大的一块缺口。
3. 逐个核对 282 个 id 属于哪张表（`CFMgr.dic` 里按 id 反查）。

### 15.6 集合语义（MODE）取证结果（工人 WO-D，76 条命中 + 主审核对消费端）

`tools/facts/mode-evidence.json`（76 条，按关键词分布：`finishTaskObj` 26、`_itemObj` 20、`updatePlayerData` 5、
`setSaveAllItems` 4、`acceptTaskMap` 2、`setSaveAllTaskDatas` 2）。主审读消费端实现后定死：

| 接口 | 字段 | 客户端真实行为（证据） | MODE |
|---|---|---|---|
| `LoadGame` | `itemObj` | `index.js:112027` 逐条 `setItem(id,count)`，**不先清空**，且只接受 `count>0` | **delta（只增改不删）** |
| `LoadGame` | `finishTaskObj` | `index.js:112032` 先 `= {}`，再按 `"id,count"` 字符串数组重建，并写入 LocalStorage `roleID$#&A` | **replace** |
| `LoadGame` | `acceptTaskArray` / `acceptTaskOrder` | `index.js:112045-112057` 先 `requireTaskObj = {}` 再重建 | **replace** |
| `sycnPlayerItemData` | `itemObj` | 客户端先 `_itemObj = {}` 再逐条 `setItem`（§4.5、坑 18） | **replace** |
| `sycnTask` | `PlayerFinishTaskObj` / `acceptTaskMap` | 先清空再整体替换（§4.5、坑 13） | **replace** |

**由此得到三条硬规则（写进实现，别再猜）**：

1. **四个 replace 接口必须回全集**：`sycnPlayerItemData`、`sycnTask`、`LoadGame` 的任务三件套、`LoadGame.finishTaskObj`。
   回空 = 清档（且 `finishTaskObj` 还会把 LocalStorage 一起清掉）。
2. **`LoadGame.itemObj` 是 delta，且没有删除路径**：客户端只会 `setItem` 正数，**从账本删掉的物品不会自己消失**，
   要靠下一次 `sycnPlayerItemData`（全集）或重登来纠正。所以我们回全集是安全的（幂等），但不能指望它删东西。
3. A04 的"判不出来一律按 replace 处理"在这四个接口上已经被证据取代——它们**确实是 replace**，不用再猜。

**WO-E（`includes` 异常）结论：暂时定不了。**
`HttpConst.FINISH_TASK`（= `User.getFinishTaskAward`）在三个 bundle 里**只有常量定义**（`index.js:59579`），
没有任何 `.on(...)` 注册点 → 消费端经别名注册，或不在已解出的三包内。
表现是登录窗口内 3 次 `Cannot read property 'includes' of undefined`，**不崩、不影响游玩**，已挂到 §15.4。

---

## 16. 2026-10-22 第二段会话：R02/R03 回执 → L1/L2 地基（本段结束时 `impl=h0f20e751`）

> 上一段以 `h124aca9d` 结束（§14）。本段从"用户贴了 R02 回执"开始，中间夹了一次真实事故（活动弹窗卡死）、一次装备丢失、一次我自己的数据误判。
> **读这一节之前先读 §16.4 的更正**——我把三个数字报错过，别照着旧口径继续。

### 16.1 一句话现状

冷启动 6 秒 ready、18 秒进 `gamescene`、自检 **1117** 全绿、9 套测试全绿；
**442 张配置表已全量导出并在盘**；战斗对象、活动面板、装备动作名、发奖/掉落推送四条已修；
**装备属性加成、活动面板内容、774 个指不到表的 Reward、卖出铜钱**仍未做。

### 16.2 impl 演进（每步都是热重载，pid 全程未变）

| impl | 内容 | 验收 |
|---|---|---|
| `hdddef326` | P0 派生叠加（接任务不写背包、交任务不扣物品、LoadGame/sycn 投射） | 自检 1104 |
| `hc356c004` | A：need 只来自 Type 2/12/13；C：saleItem 认 `[[type,id,count]]`；D：Repeat≠0 不写 done | 自检 1110 |
| `hd243721b` | 打怪掉落入账（统一 drop 入口 + `CheckBattleResult` 按 npc.Drop 发奖） | 自检 1113 |
| `h210921ed` | B：叠加推给活客户端（`InventoryModel.setItem`） | 自检 1113 |
| `ha60c18b1` | **equipWeapon**（客户端真名）与 `PutOnEquipment` 共用 `applyPutOn` | 自检 1116 |
| `h2666716f` | R03：删 5 秒去重、掉落写进应答、`rewarded⊆done∪Repeat`、随机源可注入 | 自检 1115 |
| `h38d6a2ea` → `h6ffd4f2a` | 发奖/掉落**推客户端**：背包 `setItem(绝对值)`、装备 `updateEq(id,[1,num])` | 自检 1116 |
| `hb5e4fddc` | **战斗对象**：`ReqSelfBattleInfo` 回声 `npcID` + 3658 只怪的 26 项数值 | 自检 1117 |
| `h0f20e751` | **活动面板**：`getAllActivity`/`getSevenTaskList`/`getActivityCounts` 三件套闭合 | 自检 1117 |

> ⚠ 这张表是**部署历史**，不是日志证据：`bz_log.jsonl` 有上限会轮转，本段结束时日志里只剩 5 个版本
> （`ha60c18b1×102`、`h0f20e751×48`、`hb5e4fddc×45`、`h6ffd4f2a×45`、`h38d6a2ea×45`，共 287 行）。
> 想核对某一步是否真的上过，看 `reload` 返回值或当时的验收 JSON，别指望日志。

### 16.3 这一段修好的六件事（都带证据）

1. **派生叠加（P0）**：`acceptTask` 不再往背包写差额、`getFinishTaskAward` 不再扣 `SpRequire`；
   差额只出现在 `LoadGame`/`sycnPlayerItemData` 的投射里（同物品取 max）。
   依据：客户端交付时**从不扣** `SpRequire`（`updateTaskData` 的 Type2 是 `case 2: break;`，index.js:134531），
   而且任务链路上**没有任何** `reduceItem`/`removeItem` 调用点（8+3 个调用点全在货币/临时物/小游戏）。
2. **Type 过滤**：`SpRequire` 在 Type3 上是**怪物 id**（`judgeFightRequire`→`fightTaskObj`），
   所以 `need` 只对 Type 2/12/13 生成（682→674 条目、544→532 带需求）。
3. **出售形状**：客户端发的是 `saleArr:[[type,id,count]]`，旧代码按 `{itemID,num}` 解析 → 卖东西**完全不生效**。
   现在支持数组形状、`type=2` 走 `playerEquip` 实例并清槽。
4. **装备动作名**：客户端穿装备发的是 `User.equipWeapon`（`PUT_ON_EQUIPMENT`，index.js:59592），
   我们只实现了 `PutOnEquipment` → **穿装备从来没记账**（用户丢过一把 2302）。
5. **战斗对象**：`REQ_PVE_BATTLE: "User.ReqSelfBattleInfo"`（59610），`startBattle` 会发 `{npcID,...}`（69162-69172），
   `prepareForBattle` 用 `t.npcID`+`t.npcArr`（69015-69031），`generateNpcData` 要 26 项固定顺序（8093-8134）。
   现在回声 npcID + 带 `npcArr`（数据来自 `tools/cfg/npc_stats.json`，3658 只）。
6. **活动面板卡死**：`getAllActivity` 回调收尾无条件发 `getSevenTaskList`（index.js:57458），
   其回调第一句是 `if (e.hasOwnProperty("taskObj"))` —— 我们回的形状默认值**没有 taskObj** →
   两个分支都不进 → `HomeActiveUI` 既不打开也不关闭 → 那层 modal 吃触摸。
   现在 `getSevenTaskList` 回 `{eRet:1, taskObj:{}}`，链路闭合（日志 0 条 err）。

### 16.4 三处自我更正（**别再用旧数**）

| 我报过的错 | 实际 |
|---|---|
| 「`decompose` 列 98.1% 命中 drop 主键，是拆解来源」 | **0 个命中**。错因：drop 主键里含 0，而绝大多数物品 `decompose` 就是 0 → 零值被我算成命中 |
| 「19 条装备需求全是商店货」 | `BuyPrice` 是售价不是货架；导出 11 张商店表后：覆盖 96/433=22.2%，15 种装备需求只有 2 种在商店 |
| 「死任务 2629 / 可达 2211」 | `judgeTaskCondition`（134085-134092）是**阈值语义**；三种口径算出 2211/721/752，**三个都不可信**，口径作废 |

两条流程教训（写进 §9 坑表的口径扩展）：

- **"契约"必须拿客户端常量定义核对**：`PutOnEquipment` 当年是手工调 handler 验证的，不是客户端真实流量。
- **`SHAPED` 也会卡 UI**：形状表里有条目、回默认值不报错，但消费端 `hasOwnProperty` 不过就永远不闭合。
  `UNKNOWN` 与 `SHAPED` 都要看消费端。

### 16.5 这一段新增的数据资产

| 资产 | 内容 |
|---|---|
| `tools/cfg/dump/` | **442 张配置表 / 22.5 MB**（454 张里除空表外全在；npc/item 各截断 3000 行，但另有全量） |
| `tools/cfg/npc_stats.json` | 3658 只可战斗 npc 的 26 项数值（战斗对手用） |
| `tools/cfg/shop_tables.json` | 11 张商店表 513 行 |
| `tools/facts/cfg-index.json` | 442 张表的列名/首行/行数索引 |
| `tools/facts/table-usage.json` | 客户端读表索引：3493 次 `getItem`、256 张表（top: item 751 / skill 413 / npc 214） |
| `tools/facts/action-tables.json` | 「动作 → 应答字段 → 配置表」线索（160 动作有字段、72 能连表），工具 `tools/gen_action_tables.js` |
| `tools/gen_task_rewards.js` | 现在同时产出 `BZ_TASKS` / `BZ_ITEMTYPE` / `BZ_NPCDROP` / `BZ_DROP` / `BZ_NPCARR` |

### 16.6 未修 / 待办（按优先级）

> **本节已被 §17 部分取代**（2026-10-22 08:00）。逐条状态：1 已推翻、4 已修、3 已判定；2/5/6 仍未做，最新排序见 §17.8。

1. ~~**装备属性不生效**~~ → **✅ 已推翻（§17.1）**：属性全来自 item 表 `Property1..5/Data1..5`，
   `type==1` 的 `[1,num]` 结构本来就是对的；探针实测槽1 得 `[[9,8]]`、槽5 得 `[[10,1],[8,5]]`，与 item 表逐项吻合。
2. **活动面板内容是空的** → **规格已备齐（§17.8-1），未实现**：根因不是 `dataArr`，是 `getAllActivity` 回的
   `activityList` 为空（它是 tab 白名单，`index.js:57450` / `1893-1900`）。
3. **774 个 `Reward` 指不到任何表** → **已判定（§17.8-5）**：客户端对 `Reward` **零解引用**
   （`\.Reward\b`、`["Reward"]` 三包 0 命中）→ 这批奖励从客户端无法恢复；pending 可推导，不必迁 v5。
4. ~~**卖出不给铜钱**~~ → **✅ 已修（§17.3）**：按 `item.Price` 结算，`note.eco.coins` 投射，回归 `test\sale-coins.js`。
   同批还修了**买不扣钱**（`item.BuyPrice`）与 `useItem` 不刷新。
5. **Repeat 奖励上限**：仍未做（`rewarded` 一次封顶；正常重复任务只发一次）。
6. **日志有上限**：仍未做 → 由 §17.8-2 的 `save.meta.actionStats` 替代（R04 Q4 已给实现草案）。

### 16.7 回滚点（今天的备份，按时间序）

| 目录 | 内容 |
|---|---|
| `_backup\2026-10-22-0430-pre-overlay` | P0 之前的 core/test/handlers + 设备存档 |
| `_backup\2026-10-22-0452-pre-r02fix` | A/C/D 之前（含旧 `bz-tasks.generated.js`、旧 `gen_task_rewards.js`） |
| `_backup\2026-10-22-0515-pre-backfill` | 补 4015/4016 之前的存档（md5 `96C21EDA`） |
| `_backup\2026-10-22-0519-pre-restart` | 卡死重启前的存档（md5 `DEC9D1C6`） |
| `_backup\2026-10-22-0525-pre-r03` | R03 改动前的 core/test |
| `_backup\2026-10-22-0543-pre-grant-weapon` | 送 `1001` 之前的存档 |
| `_backup\HANDOVER.md.bak-2026-10-22-0609` | 本节追加前的本文件 |
| `_backup\2026-10-22-0700-pre-sale-coins` | **卖东西结算铜钱**之前的 `bz-rpc-server.js` / `bz-tasks.generated.js` / `gen_task_rewards.js` / 存档（md5 `1080960C`）/ 日志 / 本文件快照 |
| `_backup\2026-10-22-0740-pre-seed-sellables` | 灌"好卖的货"之前的 `bz-rpc-server.js` + 存档（md5 `1080960C`） |
| `_backup\2026-10-22-0835-pre-sale-projection` | **卖东西投射（setItem/deleteEq）**之前的 `bz-rpc-server.js` + `test\sale-coins.js` + 存档（md5 `10D13161`） |
| `_backup\2026-10-22-0738-pre-premium-currency` | **金条/元宝账本 + 金条商店**之前的 core 两个文件 + 生成器 + 存档（md5 `E186F7EF`） |
| `_backup\2026-10-22-0750-pre-handover-update` | **本轮文档大更新**之前的 `HANDOVER.md`（md5 `0F91BED9`）+ core 两个文件 |

回滚 = 拷回对应目录的 `core\*` → `node build-handlers.js` → `.\run.ps1 handlers`；存档回滚用 `bzSeedBag`/`bzPatch` 或直接推回备份。

> 完整的今日备份清单（**16 个目录**，其中 13 个带存档快照、3 个没有；5 组存档 md5 相同）见
> `tools/facts/docs-digest.json` 的 `backups` 段。上表只列本段新造的。
>
> 另：`tools/facts/push-verify.json` 是 `pass=false`，原因是**工单把存档 md5 写死成基准值**，而玩家在玩、
> 存档正常变化（差异已人工核过：只多了两场战斗的掉落 + 手动穿装备）。同一批改用"只记录不比较"的
> `push-verify2.json` 为 `pass=true`。以后写验收工单不要拿存档 md5 当判据。

### 16.8 下一个会话怎么开局

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
cd F:\BaoZouyxt\hotfix-patch
.\run.ps1 status                  # 注意：ready 里的 impl 是开机时的，热重载后要看日志末行或 reload 返回值
.\run.ps1 cmd "state"             # bag / playerEquip / equipments / rewarded
node tools\gen_task_rewards.js    # 若改过 tools/cfg/*.json 才需要
$env:BZ_PROBE='0'; node build-handlers.js    # 自检 1117
foreach($t in @('l0-envelope','l0-xhr','save-migrate','upgrade-skill-target','selfcheck-nosave','selfcheck-model-push','overlay-projection','drop-table','push-grants')){ node "test\$t.js" }
.\run.ps1 handlers
```

然后按 §16.6 的顺序做：**装备属性 → 活动内容 → 774 Reward**。

> ⚠ 这行的顺序已被 §17 取代：装备属性已实测生效（不是待办），交易与金条商店已补；**先读 §17**。

---

## 17. 2026-10-22 第二段：R04 回执落地 → 交易闭环 → 金条商店（**接手先读本节**）

> 本节覆盖 §16.6 的三条待办与一条错误前提。部署版本 `imp=hea924c53`（本节最后一次部署）。
> 全程热重载，`pid` 未变过（除两次为"让 LoadGame 重投射"而 `run.ps1 restart`）。

### 17.1 先关掉一条错误前提：装备属性**是生效的**（实测）

§16.6-1 说"装备属性不生效，我方 PlayerEquip 是 `[1,num]`（无 attrs）"——**前提不成立**。

只读探针 `probe/equip_attr_probe.js` 进程内读到的真值（证据 `tools/facts/q1q2-main-verdict.json`）：

| 槽 | itemID | 装备对象上的 bonuses | item 表对应 |
|---|---|---|---|
| 1 | 1001 | `[[9,8]]` | `Property1=9 / Data1=8` |
| 5 | 2302 | `[[10,1],[8,5]]` | `Property1=10/Data1=1` + `Property2=8/Data2=5` |

属性链路（全部已核对）：`LoadGame.equipments`(111825→111808) → `PlayerEquip`(111879→65075) →
`UserModel.setupEntity()`(111888) → 遍历 `equipments`(142526-142537) → `entity.putOnEquipment`(11174) →
`Equipment.arm()`(44737-44743) → 逐列 `Property{i}`/`Data{i}` 加成。
**`type==1` 的装备里 `attrs` 是 undefined，`for..in` 空转不报错；属性全来自 item 表。**

结论：`PlayerEquip` 的 `[1,num]` 结构**是对的**，不需要补 attrs；只有 `type>=2` 的实例装备才需要（我们没有生成路径，也没有数据依赖它）。

### 17.2 本轮最贵的一课：`note` 三个子表的语义（写错会"数量错乱/能反复卖"）

客户端通用拆包（`index.js:59323-59336`）会把应答里 `note` 的**每个键当事件名派发**：
`for (var E in g[I].note) MessageCenter.dispatch(E, g[I].note[E])`。三个键各有官方监听器：

| 键 | 常量 | 监听器 | 语义（**照抄**） |
|---|---|---|---|
| `ivch` | `INVENTORY_CHNG="ivch"`(59569) | `index.js:64674-64677` | `{物品id: **新数量（绝对值）**}` → 直接 `setItem(id, 值)`；**0 = 删除** |
| `eqch` | `EQ_CHNG="eqch"`(59572) | `index.js:64678-64694` | `{uid: [0]}` = `deleteEq`；`{uid: [1, dataArray]}` = `parseEq` 后 `addEq`（type==1 时取 `dataArray[1]` 当 num） |
| `eco` | `ECONOMY_CHNG="eco"`(59570) | `index.js:64698-64724` | `{coins,gold,exp,ptt,chips,yuanbao: **新余额**}` → 直接赋值，并顺带派发 `SHOP_BUY_ITEM` |

**事故复盘（用户实测）**：第一版把 `ivch` 当"本次变动量"发 → 20 个月饼卖 1 个，客户端被写成 **1**（不是 19）；
同理 20 个糖葫芦买 2 个被写成 **2**。界面数量被改小 → 看着还有货 → "还能反复卖"。
**教训：任何"推绝对值"的地方，先问一句"消费端是赋值还是累加"。**

### 17.3 交易闭环（卖 / 买 / 用 三向都补了）

| 动作 | 之前 | 现在 |
|---|---|---|
| `saleItem` | 只扣物品，不给钱（不可逆损失，R04 第 0 位） | 按 **`item.Price`** × 真实数量进银两（客户端公式同款，`index.js:65207`）；回 `note.ivch`(绝对值) / `eqch` / `eco.coins` |
| `buyShopItem` | **只加物品、一分不扣**（玩家实测买 1011 个糖葫芦没扣钱） | 按 **`item.BuyPrice`** × 数量扣银两（客户端货架就是 `price: s.BuyPrice`，`scripts2.js:46443`）；钱不够 `eRet:4`；无买价物品拒绝 |
| `QuickBuyItem` | 白送 | 同 `buyShopItem`（客户端三包里没有发送点，只有常量，属防御性修复） |
| `useItem` | 只回形状默认的空 note → 用完界面不减、可反复用 | 回 `note.ivch`(绝对值) |

**价格两列别混**：卖价 `Price`（`index.js:65207`）、买价 `BuyPrice`（`scripts2.js:46443`）。
例：糖葫芦 买 60 / 卖 20；夜明珠 卖 1000 万；吐纳法秘籍 `Price=0`（卖了不给钱，正常）。

### 17.4 金条商店（`User.getShopItem` / `User.buySpecialShopItem`）

之前**两个动作都没实现** → 客户端 `if (e.hasOwnProperty("ShopArray"))` 不过（`scripts2.js:46462`）→ 这类商店必然空白。

- 货架来源：`SpecialGoodsModel.reqGetSpGoods(npcid)` → `User.getShopItem {npcid}`（`index.js:123380` / `59606`）；
  应答必须 `{eRet:1, ShopArray:{item:[...], price:[...]}}`。
- 购买：`reqBuy(npcid,itemID,itemNum)` → `User.buySpecialShopItem`（`index.js:123386` / `59607`）；
  付款货币是**金条**（`NormalShopUI.onBuyBtn` 的 npcId>0 分支比 `RoleBaseInfo.gold`，`scripts2.js:46521`）。
- 数据：`tools/gen_task_rewards.js` 从 `tools/cfg/shop_tables.json` 生成 `BZ_NPCSHOP`
  （`random_shop` 的 `ID` 就是物品 id；`lh_shop` 有 `item` 列）→ 目前 **4 个摊贩 / 374 件货**（npc 1009/10163/10459/11191）。
- 扣款走 `note.eco.gold`；**支付类 10 个动作仍然 `eRet:4`**（货币边界见 §0）。

### 17.5 维护动作新增/修正

| 动作 | 用途 |
|---|---|
| `bzGrantCur {gold,yuanbao,coins}`（新） | 增减付费货币与银两；负数可扣、下限 0；写前自动备份 `.pre-maint.json`；调用后 `pushEco` 推活客户端 |
| `bzPatch` 增加 `delTop:[键]`（修） | 以前的 `set` **只写顶层键**：把 `{"3003":20}` 当"改背包"会写出顶层垃圾键且无法删除（本轮真踩了）。现在 `delTop` 可清顶层键，且拒删 `roleID/saveVersion/bag/playerEquip/equipments` 结构键。**改背包要用 `set:{bag:{...}}` 整体替换。** |
| `bzSeedBag` / `bzBackfillRewards` | 不变（`bzSeedBag` 仍是"灌物品"的正规入口） |

**自检连带修正**：`bz-handler-impl.js` 里有 4 处把 `buyShopItem` 当"免费灌物品"的工具，
买变真交易后灌不进去（自检当场报 `task:need:noDoubleCount` / `finishNoConsume` / `sale:arrayShape`），
已全部改用 `bzSeedBag`，并新增 3 条正向断言（`sale:paysCoins` / `trade:buy:charges` / `trade:buy:noFreeItem`）→ 自检 1117 → **1120**。

### 17.6 当前基线与测试（照抄即可复现）

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
cd F:\BaoZouyxt\hotfix-patch
node tools\gen_task_rewards.js                  # 产出 BZ_TASKS/ITEMTYPE/NPCDROP/DROP/NPCARR/ITEMPRICE/ITEMBUYPRICE/NPCSHOP
$env:BZ_PROBE='0'; node build-handlers.js       # HANDLERS OK selfCheck=1120
foreach($t in @('premium-shop','sale-coins','trade-buy','overlay-projection','l0-envelope','l0-xhr','save-migrate','upgrade-skill-target','selfcheck-nosave','selfcheck-model-push','drop-table','push-grants')){ node "test\$t.js" }
.\run.ps1 handlers
```

| 测试 | 项数 | 盯什么 |
|---|---|---|
| `test\sale-coins.js` | 15 | 卖价用 `Price`、`ivch` 必须绝对值（20 卖 1 → 19）、`eqch` 两种形状、`eco.coins`、沙盒不推 |
| `test\trade-buy.js` | 8 | 买价用 `BuyPrice`、钱不够/无买价拒绝、装备走 `eqch`、`note` 必须在 `User.buyShopItem` 里 |
| `test\premium-shop.js` | 9 | `ShopArray` 必给、金条扣款、跨店买拒绝、`bzGrantCur`、LoadGame 投 `userGold/userYuanbao` |
| `test\overlay-projection.js` | 14 | 派生叠加（注意：已改用 `bzSeedBag` 灌种子） |

存档真值（2026-10-22 08:00）：`coins=11,157,779`、`gold=5,099,999`、`yuanbao=1,000`、`bag` 13 种、`saveVersion=4`。

### 17.7 端上还没验证的一条（只能玩家做）—— **⚠ 已被 §18.4 部分推翻，别照这页找摊贩**

**金条摊贩打开是否有货**：npc 1009/10163/10459/11191。服务端侧已单测覆盖，但"客户端真的发出
`User.getShopItem` 并据此渲染出货架"需要真人开一次店。若开出仍是空白，先看日志有没有 `getShopItem npc=...`；
有请求但空白 → 货架数据问题；**没请求** → 说明那个摊贩不走这条路（改用 `user.name` 之外的入口，另行取证）。

> **后续更正（§18.4）**：这 4 个 npc 的 Type 是 33/35/1/1 —— 33/35 是**流言商店**（走
> `User.GetSpecialShopData`，未实现），不是 `getShopItem` 那条路。`getShopItem` 对应的是 **Type 26** 的 npc。
> 玩家"找不到花金条的地方"的直接原因见 §18.4 的路由表。

### 17.8 本轮剩下的待办（按我判断的顺序）

1. **活动面板 tab**（规格已齐，见 `tools/facts/r04-main-verdict.json` 的 `activityPanel_Q2`）：
   `getAllActivity` 需回 `activityList`（白名单，`index.js:57450` / `1893-1900`）、`activityArrFlag`（107227，决定 1001 七日活动还是 1002 每日任务）、`activityShows`（57455，缺省 `[1,1]`）、`schoolActivityOpen` / `schoolArenaOpen`；`dataArr` 是**数字数组**（每日次数）。
2. **动作计数**（R04 Q4）：`save.meta.actionStats`，只内存计数、跟下一次业务写入落盘、沙箱不计数、md5 断言要去掉 `meta`。
3. **L4 观察模式守卫**：记录"背包/货币出现无法解释的差额"，不拒绝。**这一层正好能自动抓住 §17.2 那类事故。**
4. **ISSUE-3**：`live/flow.js` 的 `stepNotice` 兜底把裸 `node.destroy()` 改成 `PopUpMgr.removePopUp(node)`。
5. **774 个 `Reward`**：客户端**零解引用**（`\.Reward\b` / `["Reward"]` 三包 0 命中）→ 判定"客户端无法恢复"；
   pending 可由 `rewarded ∩ 解析失败 − Repeat` 推导，不必为它迁 v5。
6. **元宝/金条的消费点**：如果某武学走的是"支付商城"那条路（`StoreModel.buyItem`/`openChargeList`），
   按边界**不实现**；遇到具体界面再按动作名补（不碰支付）。

### 17.9 本轮新增/更新的证据文件

| 文件 | 内容 |
|---|---|
| `tools/facts/q1q2-main-verdict.json` | 装备属性 14 步链路 + 活动面板 12 步链路（全带行号） |
| `tools/facts/r04-main-verdict.json` | R04 落地总账：售价列、应答消费端、活动规格、Reward 零解引用、两处口径裁定 |
| `tools/facts/trade-shop.json` / `trade-sell-refresh.json` | 商城/购买 + 出售刷新两条链（工人转录，已抽样核对） |
| `tools/facts/sale-coins-verify.json` / `trade-verify.json` / `premium-verify.json` | 三轮独立验收报告（每次 9–13 套测试全绿） |
| `tools/facts/shop-shelf.json` / `shop-ui-refresh.json` | 商店配置映射（374 件货 / 4 个 npc）+ 货架 UI 契约 |
| `tools/facts/q1-equip-attr.json` / `q2-active-ui.json` / `q2-cfg-active.json` | 工人原始交付（抽样通过） |
| `probe/equip_attr_probe.js` / `item_name_probe.js` / `lang_text_probe.js` | 三个只读探针（装备属性实测 / 物品名 / 背包分页名） |
| `tools/docx2txt.js` | 新工具：把 SOTA 回执 `.docx` 抽成 `.txt`（不依赖第三方库） |

### 17.10 本轮踩的坑（已并入 §9 坑表，编号见那里）

`note.ivch` 当增量、`buyShopItem` 白送、`bzPatch set` 只写顶层、误判 `SpecialGoodsModel` 在未解包里、
11 个 bundle 里 10 个是 320 字节空壳、工人越界改文档 —— 详见 §9 的 #39–#45。

---

## 18. 2026-10-22 第三段：战斗修复（✅ 用户实测）→ 洗点 → 商店全景（**接手先读本节**）

> 部署版本 `impl=hc91aff6c`（14 套测试全绿，`selfCheck=1120`）。用户原话：**「战斗正常了」**。

### 18.1 战斗静默失败：根因、修复、实测确认 ✅

**现象**：用户「战斗压根没有开始，然后静默失效」。
**取证路径**（这条链以后照抄）：拉日志 → 发现客户端异常栈被引导层抓在 `kind:"xhr"` 里：

```
REQ ReqSelfBattleInfo p={"npcID":1003,...}      ← 客户端确实传了 npcID（早先看到的 p={} 是旧日志）
ReqSelfBattleInfo npc=1003（已带 npcArr）        ← 我方回声 + 塞 npcArr
事件回调异常: TypeError: Cannot read property '0' of undefined
frame 0  initRivalEntity @ assets/scripts/index.jsc:74652
```

**根因**：`generateNpcData`（index.js:8099-8134）要求 npcArr **26 格**（`t[23]=HardModel` 必须是数组），
而 `BZ_NPCARR` 里 3658 个 npc **全是 22 格** → `initRivalEntity` 的 `e.HardModel[0]`（index.js:74652）抛 TypeError，
异常发生在 MessageCenter 回调里被吞 → **战斗静默失败**。

**修复**：`tools/gen_task_rewards.js` 强制补齐 26 格——`t[22]`=经脉等级 0、`t[23]`=**HardModel 从 npc 配置表取真值**
（`tools/cfg/dump/npc.json` 有该列，1451 个 npc 有非零真值，其余 `[0,0]`）、`t[24]`=0、`t[25]`="0"。
**实测**：用户确认战斗正常（进战斗、能打、有结算）。

**顺便定死的事实**：战斗是**客户端完全本地模拟**（`index.js:8145` 本地建 BattleSystem、`8175` 本地 start、
`69101` 动作只入本地队列），服务器只在整场打完后收一次 `CheckBattleResult`（`endBattle`，index.js:69174-69197）。
→ 我方职责就两件事：开战给对 26 格数据、结算按 `npc.Drop` 发掉落。证据：`tools/facts/battle-chain.json`。

### 18.2 洗点：`cycleObj` 缺失 → 按钮静默崩溃（已修，待用户复测）

**现象**：用户「洗点也用不了」；日志里**连一条 `washAdditionalArr` 请求都没有** → 客户端在发请求前就崩了。
**根因**：`MarryModel.cycleData` 来自 LoadGame 应答的 **`cycleObj`**（index.js:77051），我方没发 → `cycleData=[]`
→ 洗点按钮 `cycleData[4][e]` 直接 TypeError（scripts2.js:51009）→ 静默失效。

**cycleObj 下标语义（全部读点已核对，照抄）**：

| 下标 | 类型 | 读点 |
|---|---|---|
| `[0]` | 数字（转生时间） | index.js:77057/77060 |
| `[1]` | **数组**（母体历史，客户端取 `.length`、元素是数组） | index.js:77053/77058、scripts2.js:2142-2146/50946 |
| `[2]` | **数组**（取 `[0]` 当文字） | scripts2.js:49785 |
| `[3]` | **对象** `{pTims,eTims}` | scripts2.js:36535-36539/36579 |
| `[4]` | **4 元数组**（当前附加属性显示值） | scripts2.js:2141/50942/51002/51009 |
| `[5]`/`[6]` | 未见读点 | — |
| `[7]` | **4 元数组**（fosterArr，先天培养） | index.js:144110、111891-111894 |
| `[8]` | **4 元数组**（bloodArr，洗髓附加） | index.js:144052/144109、scripts3.js:12248 |

且 index.js:111889-111894 要求 `cycleData.length >= 5` 且 `[7]/[8]` 是 4 元数组（加到基础属性上）。
我方 LoadGame 现发：`[0, [], [0], {pTims:0,eTims:0}, bloodArr副本, 0, 0, fosterArr副本, bloodArr副本]`。

**`washAdditionalArr` 状态机**（index.js:60205 / 消费端 144049-144076）：
- 无 attrID → `eRet:4` + `attrList`（**"a,b|c,d|e,f|g,h" 四段字符串**，客户端 split 后取每段第 2 个值显示，scripts2.js:61720-61724）→ 弹 SetWashUI 四选一
- `{attrID:1..4}` → `eRet:1` + `bloodArr`（4 元）→ 客户端重算属性
- `eRet 6/7` = 等级不足/上一世无附加；`eRet 3` = 去充值（付费，不做）
- **离线语义**：洗 = 把对应槽位**清零**（不发明随机数值）。玩家当前 bloodArr 全 0，所以按钮能走通但数值不变；
  要"有东西可洗"得先落地转世/先天系统（见 §18.7）。
- 账本：`s.bloodArr` / `s.fosterArr`（ensureLedger 缺省 [0,0,0,0]）。

**`WashMedicine` 安全化**：消费端在 `eRet:1` 时会把四项基础属性**整体替换**成应答值（index.js:144101-144108），
旧实现回全 0 → 一旦被调用就清空玩家属性。已改成 `eRet:0`（客户端只弹提示 getText("910")，index.js:144132，不改数值）。

### 18.3 `useItem` 的"分支选择器"字段（另一处静默异常，已修）

日志：useItem 后 `Cannot read property 'name' of null @ index.js:64796`（出现 2 次）。
根因：形状表给 useItem 补了 `formulaID:0` 等字段，而客户端用 `hasOwnProperty("formulaID")` 判断要不要走
"炼金配方"分支 → `getItem(0,"formula")` 得 null → `getText(y.name)` 抛异常。
**修法**：useItem 应答里默认**删除**一批分支选择器字段（`formulaID/mountID/taskID/gemId/dogid/hanyusuiTime/bloodEndTime/endMonthCardTime/wId/wArr`）——
它们的真实语义是"只有该道具是配方/坐骑/宝石时才出现"。**通用教训：形状表的"契约"只覆盖客户端无条件读的字段；
用 hasOwnProperty 当开关的字段，缺省必须不发。**

### 18.4 商店系统全景（NPC Type 路由，scripts2.js:14671-14699 `case "90"`）

| NPC Type | 客户端行为 | 货架来源 | 我方状态 |
|---|---|---|---|
| `3` | `SaleShopBg.showSaleShop()`（回收商人） | — | ✅ 出售已闭环 |
| `2/20/36/38/51/55/70` | `showNormalShop(npc.Shop)` → 配置表 `shop` | 本地配置 | ✅ 能用（买糖葫芦的就是这类） |
| `26` | `showNormalShop(Type, npcId)` → **服务器货架** | `User.getShopItem` | ✅ 已实现（BZ_NPCSHOP 4 摊贩/374 件） |
| **`33/35`**（流言/随机商店） | `ActiveModel.reqRandomShop(npcId)` → **`User.GetSpecialShopData {npcID}`**（index.js:1637-1642/59618） | 服务器 | ❌ 未实现（`random_shop` 表那 3 个 npc 就是这型，我曾在 §17.4 把它错归给 getShopItem） |
| **`108/110`**（正邪商店） | `GoodEvilModel.getShopData()` → `User.getGoodAndEvilShopData`（scripts3.js:36524/60444） | 服务器 | ❌ 未实现（应答 `{eRet,shop,nextRefreshTime}`） |
| **`117`**（江湖商店） | `RogueModel.getShopData()` → `RG_GET_SHOP_DATA` | 服务器 | ❌ 未实现 |
| `85`（门派商店） | `SchoolShopUI.setData(getSectShopData(...))` | 本地配置 `sect_shop` | 待验（可能本地就能显示） |
| 充值/元宝商城 | `StoreModel.buyItem`/`openChargeList` | — | ❌ 按边界不做 |

**兑换商店（`User.getChangeShop`，index.js:59695）契约已取证**（`tools/facts/change-shop.json`）：
应答 `{eRet:1, shopObj}`（index.js:47076-47078）；购买走 **`User.exchangeItem {itemID,itemNum,npcid}`**
（index.js:47111-47116/59698）；**用道具换道具**（成本是配置串 `"itemId,count|..."`，客户端用
`getItemNum` 校验，不直接碰金银元）。未实现。

**金条的真相**：客户端里比较/扣 `RoleBaseInfo.gold` 的 20+ 处集中在商城/礼包 UI
（`BuyItemUI10/12/18/19/20/27`、`BatchDailyGiftUsedUI`、`BetterIdConfirmUI`），缺钱时统一
`StoreModel.openChargeList()`（去充值）→ 属付费边界，不做。**非付费的金条去处 = 上面 ❌ 的那几类商店。**

### 18.5 模拟器关机后的恢复姿势（新坑，本轮实操验证）

用户关掉了模拟器 → `adb connect` 报"积极拒绝"、run.ps1 全挂。恢复顺序：
1. `MuMuManager control -v 1 launch`（errcode 0 但**要等几分钟**，`player_state` 变 `start_finished`、出现 `main_wnd`）
2. **不要信 `is_android_started` 标志**（它一直是 false 但 adb 其实通了）——以 `adb connect 127.0.0.1:16416` + `adb devices` 为准
3. VM 重启后要重新 `adb root`（root 会让 adbd 重启、连接断开，再 `adb connect` 一次）
4. 游戏会随 VM 自动启动，`.\run.ps1 handlers` 热重载即可，不必 restart

### 18.6 当前基线（`hc91aff6c`）

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
cd F:\BaoZouyxt\hotfix-patch
node tools\gen_task_rewards.js                  # 9 张产出表（含 26 格 BZ_NPCARR）
$env:BZ_PROBE='0'; node build-handlers.js       # HANDLERS OK selfCheck=1120
foreach($t in @('wash-points','battle-npc-arr','premium-shop','sale-coins','trade-buy','overlay-projection','l0-envelope','l0-xhr','save-migrate','upgrade-skill-target','selfcheck-nosave','selfcheck-model-push','drop-table','push-grants')){ node "test\$t.js" }
.\run.ps1 handlers
```

| 测试 | 项数 | 盯什么 |
|---|---|---|
| `test\battle-npc-arr.js` | 6 | **26 格**、`t[23]` HardModel 数组、npcID 回声、未知 npc 也要 26 格、eRet=1 |
| `test\wash-points.js` | 6 | cycleObj 结构、attrList 四段、洗槽落档、WashMedicine 不得回 1/2 |
| `test\premium-shop.js` | 9 | ShopArray 必给、金条扣款、跨店拒绝、bzGrantCur、LoadGame 投 userGold/userYuanbao |
| `test\sale-coins.js` / `trade-buy.js` | 15 / 8 | note.ivch 绝对值（20 卖 1 → 19）、BuyPrice 扣款、note 落在 `User.X` 里 |

存档真值（2026-10-22 18:23）：`coins=11,157,779`、`gold=5,099,999`、`yuanbao=1,000`、`saveVersion=4`。

### 18.7 下一步（按依赖顺序，用户方向：「其它系统的落实，不单单是活动系统」）

1. **商店系统补齐**（金条/货币的正当去处）：`GetSpecialShopData`（流言，33/35）→ `getGoodAndEvilShopData`（正邪）→ 江湖 `RG_GET_SHOP_DATA` → 兑换商店 `getChangeShop`/`exchangeItem`（道具换道具，契约已备）。每类：形状取证 → handler → 回归。
2. **洗点的"内容侧"**：转世/先天系统落地后 bloodArr 才有非零来源（现在洗了也是 0）。
3. **动作计数**（R04 Q4）：`save.meta.actionStats`，替代会轮转的日志。
4. **L4 观察模式守卫**：记录"背包/货币无法解释的差额"——本轮三起静默事故（反复卖/白送/战斗崩）都能被它提前抓到。
5. **活动面板 tab**（规格在 §17.8-1）。
6. **ISSUE-3**：flow.js `stepNotice` 兜底改 `PopUpMgr.removePopUp`。

### 18.8 本轮新增证据/测试文件

| 文件 | 内容 |
|---|---|
| `tools/facts/battle-chain.json` | 战斗全链路（本地模拟结论 + endBattle 调用链） |
| `tools/facts/gold-sinks.json` | 金条消费点普查（结论：大头在付费 UI） |
| `tools/facts/change-shop.json` | 兑换商店契约（getChangeShop/exchangeItem） |
| `tools/facts/wash-points.json` | 洗点链路（bloodArr/cycleData 读点） |
| `tools/facts/handover-citation-check.json` | §17 的 18 处引用核验（全 HIT） |
| `test/battle-npc-arr.js` / `test/wash-points.js` | 本轮两条回归（6/6、6/6） |
| `probe/npc_info_probe.js` | npc 表字段探针（注意：npc 表主键列叫 `NpcID`、名字列叫 `NpcName`，没有 `Name`） |

---

## 19. 2026-10-22 第四段：useItem 分支选择器修复（§18.3 真正落地）→ 形状开关字段审计 → 商店契约取证

> 部署版本 `impl=h0562ab38`（原 `hc91aff6c`）：热重载 366ms、`pid 2533` 全程未变、selfCheck=1120、
> 15 套测试全绿（新增 `useitem-branches` 6/6）。本批零存档写入（前后 `state` 逐字段一致）。

### 19.1 为什么 §18.3 的修复从未生效（机理）

**现象（玩家实测，2026-10-22 17:40 日志）**：用掉 `3626 吐纳法秘籍`（→ 余 0，秘籍白吃）后
`TypeError: Cannot read property 'name' of null @ assets/scripts/index.jsc:64796` —— 与 §18.3 同一处。

**三步机理**：
1. handler 确实在 `useItem` 应答里删了分支字段（`BRANCH_ONLY`，原 10 个）；
2. 但 `dispatch` 是**先 handler、后 `fillShape`**（`bz-rpc-server.js:1706`），`fillShape` 把形状表里缺的字段**原样补回**——
   而形状表 useItem 条目（`bz-shapes.generated.js:336`）仍带 `formulaID:0` 等全套开关字段 → 删了等于没删；
3. 自检的 `shape:useItem:fields` 断言（`bz-handler-impl.js:316-321`）检查"形状字段在应答里都在"，
   fillShape 刚好补回来 → **断言永远绿**，该 bug 对现有守卫不可见。

**活进程证据（h0562ab38）**：`dispatch User.useItem` 应答 = `["eRet","equipObj","itemID","note"]`，
`hasFormulaID=false` / `hasTaskID=false`，探针后日志无 TypeError。

### 19.2 修复（源头剔除法）

| 文件 | 改动 |
|---|---|
| `tools/gen_shapes.js` | 新增 `SHAPE_OMIT`：useItem 产出时剔除 23 个分支选择器字段（含 `titleID`/`taskID`/`genGuDan`/`stealFlag`/`avatarInfo`/`itemRealgarMap`/`rewardSkillSkin`/`housekeeper`/`rewardArray`/`getKnackIds`/`partners`/`mpnum` 等）；`shapes.json` 记 `branchOmitted`；fields 1092→1071 |
| `core/bz-shapes.generated.js` | 重生成（useItem 只剩 `eRet/equipObj/itemID/note`） |
| `core/bz-rpc-server.js` | handler 的 `BRANCH_ONLY` 10→23（防御纵深；注释写明"光靠这里删没用，fillShape 会补回"） |
| `test/useitem-branches.js`（新） | 6 条回归：形状源头无开关字段、实测应答无 23 键、`formulaID` 必须不在（原故障重现）、`note.ivch` 绝对值（20 用 1→19）、`note.skch/eqch` 为空对象、空库存不写负库存 |

**教训**：凡"用 `hasOwnProperty` 当开关"的字段，剔除必须落在**形状表源头**（generator），handler 里删只算防御；
且测试必须加载 `bz-shapes.generated.js` 才能复现 fillShape 路径（旧测试没加载，从来看不见）。

### 19.3 `getAchieveData`（成就系统）临时处理

- 触发：主页"成就"按钮（`scripts2.js:30988` `onClickAchieve`）；消费端 `scripts3.js:2899-2918`，
  `eRet==1` 时**无条件**加载 `network/achievement/AFrontUI` 弹窗（2912-2916）→ 通用 ACK 会弹空成就框。
- 现在回 `eRet:4`（客户端明确失败分支：整段跳过、无弹窗、无写模型）。成就系统实现留作后续系统任务。

### 19.4 形状开关字段全量审计（41 条，无第二个确认崩溃点）

- 扫描：337 动作 / 1071 字段，命中 `hasOwnProperty("<字段>")` 形态 **41 字段 / 29 动作**
  （证据 `tools/facts/branch-switch-audit-20261022.json` + 上下文 `tools/facts/branch-context-20261022.json`）。
- 分诊：唯一"直接 `getItem(字段)` 再取属性"的是 `choosePandaEvent.buffID`（`index.js:137682`
  `getItem(o.buffID,"buff").Description`），但被同一链上更早的 `rewardArray` 分支挡住（形状里 `rewardArray:{}` 先命中）
  → 不构成崩溃；其余均为模型写入（把默认值写进 `towerItemData[5]`、`dogData`、`plantExp` 等），良性。
- 结论：`useItem` 是这一族里唯一真炸的；`SHAPE_OMIT` 泛化留 P2（41 条清单已备）。

### 19.5 商店系统契约（§18.7-1 第一步，已取证）

`tools/facts/shop-contracts-20261022.json`：

| 动作 | 发送点 | 常量 | 应答字段 |
|---|---|---|---|
| `User.GetSpecialShopData`（流言 33/35） | `index.js:1641` `{npcID}` | 59618 | `shopData` |
| `User.getGoodAndEvilShopData`（正邪 108/110） | `scripts3.js:36525` 无参 | 60444 | `eRet,shop,nextRefreshTime` |
| `RG_GET_SHOP_DATA`（江湖 117） | `scripts3.js:71221` 无参 | 60515 | `eRet,shop,rank,endTime,reputationLevelId` |
| `User.getChangeShop`（兑换） | `index.js:47101` `{npcid}` | 59695 | `eRet,shopObj` |
| `User.exchangeItem`（兑换购买） | `index.js:47112` `{itemID,itemNum,npcid}` | 59698 | `eRet,itemID,itemNum` |

> 注：§17.4 / §18.4 里的 NPC Type 路由不变（`getShopItem`=Type26 已实现；33/35 走 `GetSpecialShopData`；
> 108/110 走 `getGoodAndEvilShopData`；117 走 `RG_GET_SHOP_DATA`；兑换走 `getChangeShop`+`exchangeItem`）。

### 19.6 回滚点

`_backup\2026-10-22-1849-pre-useitem-branchfix\`：`gen_shapes.js`(0F33A77E) / `shapes.json`(5F8E836A) /
`bz-shapes.generated.js`(0C39F713) / `bz-rpc-server.js`(5C122F70) / `shapes_report.md`(1B158AC0) + 设备侧
`handlers.js.device` / `flow.js.device` / `bz_offline_save.json` + `HANDOVER.md.snapshot`(546B1758)。
回滚 = 拷回源文件 → `$env:BZ_PROBE='0'; node build-handlers.js` → `.\run.ps1 handlers`；设备侧直接 push 回 `.device` 两份。

> 注意：`build-handlers.js` 会把 `built=<构建时间>` 写进产物头部，**本地与设备 md5 直接比对会误报**；
> 要剥掉 `built=…` 再比（本批已用此法证明设备产物 == 本地产物）。

### 19.7 下一步

`§18.7-1` 商店系统四类实现（契约已备）：先 `GetSpecialShopData`（流言 33/35）→ 正邪 → 江湖 → 兑换；
数据面从 `tools/cfg/shop_tables.json` / `tools/cfg/dump/` 取货架。

### 19.8 商店第一批实现（已部署 `h3f83dba9`）

| 动作 | 实现要点 | 验证 |
|---|---|---|
| `GetSpecialShopData {npcID}`（33/35） | `shopData` 以物品 id 为键，条目 = `payment/page/limit/isserver/endtime/price/ID/itemId`（`SaleShopQiUI.shopTypeData` 按 `payment==2 && page==页+1` 筛页，scripts2.js:55272-55286）；`curGold` 同步金条；`selfData:{}` | 活进程 1009 → 179 件 |
| `BuyAcitivityShop {itemID,itemNum}`（客户端原文拼写，index.js:59619） | 全货架查价、扣**金条**、`note.eco.gold`（绝对值）+ `note.ivch`；没钱/无货 `eRet:4` | 单测 T4-T6 |
| `getChangeShop {npcid}` | `shopObj` 行 = `[行id,页,物品,数量,"成本串",品质,限购类型,限购,排序,0]`；购买请求带**行 id**（同物品多行成本不同，`ExchangeBuyUI.startBuyReqCallBack` 传 `objectItem[0]`） | 活进程 10385 → 1166 行 |
| `exchangeItem {itemID,itemNum,npcid}` | 行 id 定位 → `cost` 按份数乘 → 校验/扣背包 → 按行[2]/[3]发货 → `note.ivch` 绝对值 | 单测 T9-T11 |

数据面：`BZ_NPCSHOP` 加 `m`（`pay/pg/is/et`，源头是 random_shop 的 payment/page/isserver/saleendtime）；
新增 `BZ_EXCHANGE`（10 npc / 1220 行）→ 包体 700685 → 770592 B。
回归：`test/shop-special-exchange.js` **11/11**；全量 **18 条电池全绿**（`tools/facts/acceptance-20261022-shops.json`）；
活进程三端点验证（1009/10385/未知行 eRet:4）通过，存档零写入。
回滚点：`_backup\2026-10-22-1910-pre-shops\`（gen_task_rewards / gen_shapes / shapes.json / bz-tasks / bz-shapes /
bz-rpc-server / HANDOVER + 设备 `handlers.js.device`）。

> 剩余两类：**正邪**（`getGoodAndEvilShopData` + `buyGoodAndEvilShopItem`，数据源 `ge_shop` 25 行）与
> **江湖**（`rgGetShopData` + `rgShopByItem`，数据源 `rogue_shop` 33 行）；购买应答消费端取证中（工人 I）。

### 19.9 商店第二批：正邪 + 江湖（已部署 `h753c1b2f`）

| 动作 | 实现要点 | 验证 |
|---|---|---|
| `getGoodAndEvilShopData`（108/110） | `shop` = `ge_shop` 25 行元素 `{id,Name,Description,Data:[物品,数量],Price,camp,rankopen,rankNum,buyCount}`；`nextRefreshTime:0`。声望门槛在**客户端**算：`getMyPrestigeLv()` 读 `goodEvilPrestige`（未定义 → 恒 1 → rankopen=1 的 9 件可买，2-5 级锁定） | 活进程 25 件 |
| `buyGoodAndEvilShopItem {id,itemNum}` | 货币 = **正邪贡献**（账本 `s.contribution`，缺省 0）；扣 Price×数量、按 `Data` 发货；回 `contribution/rewardArray/id/buyCount/note` | 单测 T2-T4 |
| `rgGetShopData`（117） | `shop` = `rogue_shop` 33 行元素 `{id,item,costitem,cost,num,refresh,rank,reputation,closetime,buyCount}`；`rank:0/endTime:0/reputationLevelId:0`（rank>0 或 reputation>0 的货被客户端门槛锁定 = 诚实降级） | 活进程 33 件 |
| `rgShopByItem {id,itemNum}` | 货币 = **实物** `costitem×cost×数量`；扣成本、按 1 件/份发货；回 `id/buyCount/rewardArray/note` | 单测 T6-T8 |

**维护动作变更**：`bzGrantCur` 增加 `contribution` 参数（正邪贡献唯一来源；正邪系统本体未实现，贡献无法通过玩法获得）。
回归：`test/shop-ge-rogue.js` **9/9**；包体 783921 B；数据面新增 `BZ_GESHOP`（25）/`BZ_ROGUESHOP`（33）。

### 19.10 商店批次总账

| 商店 | 状态 |
|---|---|
| Type 26 `getShopItem`（金条，原有） | ✅ 已有 |
| 流言/随机 33/35 `GetSpecialShopData` + `BuyAcitivityShop` | ✅ 19.8 |
| 兑换 `getChangeShop` + `exchangeItem` | ✅ 19.8 |
| 正邪 108/110 `getGoodAndEvilShopData` + `buyGoodAndEvilShopItem` | ✅ 19.9（贡献来源=维护动作） |
| 江湖 117 `rgGetShopData` + `rgShopByItem` | ✅ 19.9（rank/reputation 门槛按 0 降级） |

> 待玩家实测：开一次流言摊贩（金条真的能花出去）、开一次兑换商店。若 UI 空白，先看日志有没有对应动作的 `dispatch` 行与
> `SHAPED` 标记（§3 的判据），再按 §18.4 的 NPC Type 路由核对是否走了别的入口。

### 19.11 动作计数（R04 Q4，已部署 `h7aff50be`）

- `dispatch` 只内存累加（`_actionStats`，per-instance）；下一次业务 `persist()` 落进 `save.meta.actionStats`。
- 沙箱实例（自检/测试的隔离 server）不计数、不落 meta（否则自检把假计数写进真存档）；
  `meta` 在 `guardSave`/`validateSave` **之后**写入，所以不参与缩水守卫与 schema 校验。
- 回归：`test/action-stats.js` 5/5（写档前零字节 / 写档后落盘 / 跨 persist 累计 / 沙箱不计数 / 守卫不误判）。
- 活进程证据：`bzGrantCur{contribution:0}` 后 `state.meta.actionStats = {"bzGrantCur":1}`，gold/contribution 未变。
- 判据：`.\run.ps1 cmd "state"` 的 `meta.actionStats` 即各动作计数（进程重启归零，落盘随业务写）。
- 已知边界：计数是**进程内累计**，重启从 0 开始；想长期统计得自己定时 `state` 留档。