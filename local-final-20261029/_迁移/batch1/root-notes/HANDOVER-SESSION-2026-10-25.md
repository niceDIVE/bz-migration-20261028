# AGENT 交接：2026-10-25 会话（关联分析 4 轮 + 商店交易批 1 落地）

> **给下一个 Agent 的**，不是给用户的。读完这一篇就能接手，不需要读对话记录。
> 项目根：`F:\BaoZouyxt` ｜ 补丁工程：`F:\BaoZouyxt\hotfix-patch` ｜ 本次会话主战场：商店交易（关联分析 C01 簇）
> 会话内既有文档**已过期**：`HANDOVER.md` 自己标了历史存档；`PROJECT-STATE.md` 截止 10-23，不含本会话。本文为准。

---

## 0. 三十秒接手

- 游戏跑在 **MuMu 模拟器（TapTap 版，实例 -v 1）**，adb 目标 `127.0.0.1:16416`，包名 `com.maple.madherogo`。
- 当前线上版本 **`impl=hb6955b90`**，自检 `selfCheck=1249`，形状冻结绿，总验收 **38/38 绿**。
- 商店交易批 1 的 10 个 handler + 3 处崩溃修复已推送并热重载，**用户正在冒烟**。
- 你现在大概率要做的是：**收冒烟结果 → 有问题按 §7 排查 → 没大问题就把 `shop-batch1\第1批-商店交易-回执-20261024.zip` 交回上游，或开下一批**。

---

## 1. 这个项目是什么（不重复展开）

《暴走英雄坛》**本机离线单人**补丁：在客户端自己的可写目录里放 jsb 层 hook，**进程内**拦截并应答它自己的 RPC，数值只改本机存档。边界：不分发/改 APK、不架服务器、不伪造任何付费。

- 架构与家法细节：`HANDOVER.md`（已标历史，但 §1 边界/§3 六条原则/§5 契约速查仍然有效）
- 契约与坑表展开版：`docs\HANDOVER-contracts.md`
- 事故史：`docs\HANDOVER-full-history-20261022.md`

设备端布局（本会话实测确认）：
```
/data/data/com.maple.madherogo/files/
  hotfix/live/handlers.js   ← 策略层（≈1.09MB，热重载，本次改的就是它）
  hotfix/live/flow.js
  hotfix/jsb-adapter/jsb-engine.js  ← 引导层（改动要重启）
  bz_offline_save.json(+.pre-maint.json)  bz_log.jsonl  bz_cmd.txt→bz_res.txt
```

---

## 2. 本会话干了什么（时间线，按顺序）

### 阶段 A：动作关联分析（4 轮，交付物在 `audit-v23\`）
1. **第 1 轮**：跑上游的 `extract_rw.py` + `relate.py`（v1）。发现 N=5（分派表是 `var H = {裸名:fn}`，`User.` 前缀是运行时拼的），交回意见 10 条 + 自写 `rw.v2.json`（按 H 表切段，30 动作）。
2. **第 2 轮**：上游改成 `var H` 切段 + helper 内联；发现 `extract_rw.py` 输出**依赖 PYTHONHASHSEED**（不可复现），交回证据；config 上我加了「核心账本」family、任务主线 `(?!ROGUE_)`、`familyWeight 3.0`。
3. **第 3 轮**：上游修好两处 seed 问题；四档 seed 逐字节一致，验收交接完成；`includeKeys` 把 `SYCNPLAYERITEAMDATA` 纳入（inScope 700）。
4. **第 4 件（分析侧交付）**：关联图固定为 76 簇/孤立 370，C01 商店交易 27 个动作为第一批施工对象。

> 结论：分析器可冻结。产物与凭证：`audit-v23\relate-result*-20261024\`、`relate-verify*\VERIFY.md`。

### 阶段 B：商店交易批 1 施工（本次会话主要产出）
上游给第 1 批包（`_incoming\shop-batch1-20261024\`）：11 个 handler 模板 + 3 个原型（protoBuy/protoData/protoFlag）+ 冒烟清单 27 项。

做了这些（**没有照抄模板**，见 §3 家法）：
| # | 动作 | 实现要点 | 现状 |
|---|---|---|---|
| 1 | `buyFormula` L2747 | 价=formula.price（面板同值），无行不扣钱面回 eRet:2；炼到 `now+time` | 已推 |
| 2 | `getInnShop` L2769 | `innSimShopDatas` = sim_shopconfig 全 8 行 | 已推 |
| 3 | `getInnRank` L2779 | `innRankList:[]`（离线无榜） | 已推 |
| 4 | `innBuyShop` L2789 | food_bag/cookbook → `s.inn.foodBag/cookBook`，价 price×次数，eRet:6 提示 | 已推 |
| 5 | `buySchoolShop` L2831 | sect_shop.price × count，钱包 `s.schoolContribution`（新），回 `updateSchoolContribution[schoolId]` | 已推 |
| 6 | `BuyMarketItem` L2867 | mall.Price 金条；Type1 发物品/Type2 寒玉髓秒数 Data[1]/Type3 传送；回 `userGold` | 已推 |
| 7 | `BuyMount` L2917 | mount.price 铜钱；`type==1` 只设 `s.mountShow`；**应答必须回显 type**（客户端 32142 拿应答 type 分流） | 已推 |
| 8 | `buyEjectGift` L2953 | time_limit_sale `priceN[1]` 元宝 + `treasureN`；没货 eRet:2 / 没元宝 eRet:6 | 已推 |
| 9 | `upFashionFaceState` L2998 | 只存 `s.ypEffectState`，**不回 titivateObj**（没有装扮账本） | 已推 |
| 10 | `fashionEffect` L3011 | 存并回显 `s.fashionEffect` | 已推 |
| 11 | ~~getGoodAndEvilShopData~~ | **服务端本来就有**（L2645），上游以为缺；贴了会重复键 | 仅冒烟 |

配套改动：
- `core\bz-shops.generated.js`（新，67,521 B，md5 `96DE5B2E…`）：`tools\gen_shop_tables.js` 生成。含 `BZ_INNSHOP(8)/BZ_SECTSHOP(13)/BZ_MALL(39)/BZ_MOUNT(72)/BZ_TIMELIMITSALE(8)/BZ_FORMULA(274)/BZ_SHOP_ENTRANCE(11)`。
- `build-handlers.js`：拼接 `bz-shops.generated.js`（一行）。
- `ensureLedger`：加 `schoolContribution` 缺省 0；`bzGrantCur` 支持 `schoolContribution`（与正邪 `contribution` 是两个钱包）。
- `tools\facts\reject-codes.json` + server `REJECT_CODES`：登记 7 个动作（6 个新 + **存量补登** `upgradeSkill`）。
- `tools\golden\*`：形状冻结基线重冻两次（planned-changes 规则已随冻结归档到 `tools\golden\planned-archive\`）。

### 阶段 C：三个崩溃/显示 Bug 的根因与修法（重要，别重犯）
1. **炼丹面板一开就炸场景**（用户实测卡死）
   - 根因：原 `getAlchemyData` 回 `alchemyGearConfig:{}`（注释自称"空但合法"）。客户端 `setGearConfigData`（scripts3.js:6702）读 `configMap[curAlchemyData.type].length`；`configMap` 由 `alchemyGearConfig` 各条目的 `.type` 建（7012-7016），空对象=空 configMap=undefined.length=TypeError。
   - 修法（`getAlchemyData` L1667）：从 `BZ_FORMULA` 放出 **type 1/2 共 95 条真配方**（`{type, GetYuanbao=price, FormulaTitle=name, FormulaTxt=name, GoldGear:[[0,0]]}`），并同时给 `data{type:2}` 与 `activityData{type:1}` 两个字典槽 —— 客户端模型**结构性只有 list[1]/list[2] 两个入口**，四条切换路径都不会 undefined；type3-6 放了也没人消费，不放。
2. **商城整页空白（"没啦/大侠别拉了"）**
   - 根因：`User.GetShopAllActive` 没有 handler，走 SHAPED 兜底 → 应答缺 `shopActiveList` → `onGetShopAllActive`(index.js:131276) 派 undefined → `shopDatasList`(scripts2.js:8952) 读 `.length` 崩。
   - 修法（`GetShopAllActive` L2728）：回 `shop_entrance` 全量**行键** 11 个（行键不是 shop_ID！客户端用 `e.hasOwnProperty(parseInt(n))` 与行键求交）。`shopActiveData/activeEndTime` 有 hasOwnProperty 守卫，不回。
3. **元宝登录后恒 0**
   - 根因：客户端登录链没有 yuanbao 读取点（gold 靠 `OnhookObj.curGold`→111905；yuanbao 在 OnhookObj 块里没有对应键；`curYuanbao` 只在 createRole 70458 / 月卡 54365 / 充值 130940 被读）。
   - 修法（LoadGame 尾部 L1237）：应答加 `note.eco{coins,gold,yuanbao}` → 通用 ECONOMY_CHNG 监听器（index.js:64721-64722）直写模型。

### 阶段 D：调试通道与运维（踩出来的）
- **维护动作（bzGrantCur 等）不在协议里，也不在 impl 对外契约里**（impl 只导出 version/handle/selfCheck/reset/state/rejectCodes/requiredChecks）。正确调法：命令通道 `call:` + 自己加密报文喂 `handle`：
  ```
  .\run.ps1 cmd 'call:(function(){var a=api();var body=a.codec.encode(JSON.stringify({mod:"User",do:"bzGrantCur",p:{gold:100}}));var r=H.impl.handle({url:"http://1.15.159.44:9898/User/bzGrantCur",body:body});return r&&r.meta?JSON.stringify(r.meta):"NO";})()'
  ```
  注意：返回值用 `call:`（`eval:` 只回 "OK"）；**解应答别再调 `a.codec.decode`**（jsb 的 CBC 实现吃不了这个入参，报 NaN）。

---

## 3. 家法（照做，别问为什么）

1. **应答外壳**：`wrapped(do, payload, {achievement:ach()})`；拒绝 `{eRet:<码>}`。本服惯例 **成功 1 / 常用拒绝 4**，但**每个动作按客户端分支取证选码**（见 reject-codes.json 的 ev 字段）。模板给的 `eRet:0` 是错的。
2. **改档必须回 `note`**：`note.eco`=新余额绝对值（键：coins/gold/yuanbao/contribution），`note.ivch[id]`=新绝对数，`note.eqch`=装备。不回 = 客户端界面不动。
3. **登记即收窄**：动作一旦登记进 `REJECT_CODES`，`narrowReject` 会把拒绝应答**剥到只剩 eRet**。所以**不要在拒绝 payload 里塞字段**（塞了也会被剥）；也别指望 fillShape 补的默认值出现在拒绝应答里（会被剥掉，这正是我们所需要的行为，比如堵住 `userGold:20`）。
4. **发放物品用 `grantItem(s,id,n)`**（装备进 PlayerEquip，其它进 bag），不要手写 bag 写入。
5. **形状层顺序不可换**：改 handler/形状 → `node tools\gen_shapes.js` → `node build-handlers.js` → `node tools\check_shape_freeze.js`。
6. **冻结要审批**：`check_shape_freeze` 红时：`--diff` 看差异 → 往 `tools/golden/planned-changes.json` 加规则（`{id,kind,action,field,expect,ev:"index.js:行号",why,allowSigma}`，**sigma 变了必须逐项 allowSigma + bundle:line 证据**）→ 新发出的路径加 `approved-widening.json` → `--freeze`（C10 会校验覆盖率）→ 再 `check_shape_freeze` 验证。冻结成功会把规则归档并清空 planned-changes。
7. **数据表**：新表一律走 `tools\gen_shop_tables.js` 生成到 `core\bz-shops.generated.js`，再由 `build-handlers.js` 拼接；**产物里不许有真实时间戳**（ver 必须是内容哈希）。
8. **验收**：`node tools\acceptance.js` 38 项须全绿；`tools\check_reject_codes.js` 必须 OK（新增拒绝点必须登记，棘轮：新增即 FAIL）。

---

## 4. 当前部署状态（可核）

| 项 | 值 |
|---|---|
| `impl` / `flow` | **hb6955b90** / ffaec47c3 |
| selfCheck | 1249 全过，failed=[]，missingRequired=[] |
| 验收 | 38/38 绿，known-red 0，cap 0 |
| 冻结 | C1–C8/C10–C13 全过（C9b 未实现） |
| 游戏进程 | MuMu 内 pid 2585，scene=gamescene |
| 存档 | roleID 16374 / FZhou，saveVersion 4；coins 21,155,859；gold 10,099,799；yuanbao 51,000；contribution 99,999；schoolContribution 99,999 |
| 文件 | `core\bz-rpc-server.js` 206,035 B md5 `A01E52F1C1A1F22F8F871C6E083B5FAD`；`patch\live\handlers.js` 1,094,504 B md5 `61B326BD…` |

**用户当前进度**：已登录主城，尚未回报冒烟结果（截至交接时）。

---

## 5. 待办（按优先级）

1. **收冒烟结果并判定**（最高优先）。清单 `shop-batch1\03-冒烟清单-预填.md`。用户回报格式 `✅/❌ 动作名 —— 表现`。
   需要盯的红线：① 钱不够也发货（白拿）② 操作后背包/存档异常。**看到红线立即停手、留证、回滚、报用户**。
2. **批次 2 的内部货架**（若用户/上游要）：各商店点进去的 GET 动作（`reqMarketList`/`reqStoreList`/`reqYuanBaoList`/`getShopItem` 已有/部分缺）。C01 之外还有 75 簇排队，见 `audit-v23\relate-result-r3-20261024\relations.md`。
3. **炼丹「七日/活动」页签**：只给了结构占位（`activityData{type:1,state:0}`），客户端切换行为**未取证**。用户若切过去卡死 → 按 §7 拉日志，重点看 scripts3.js 66xx/67xx 一带。
4. **REQ_POP_GIFT 推送**未实现 → 弹出礼包入口出不来（预期，不算失败）。要做就查 `ejectGiftDatas` 的推送格式。
5. **上游回执**：`shop-batch1\第1批-商店交易-回执-20261024.zip` 已备好，待发。
6. **文档债**：`HANDOVER.md`/`PROJECT-STATE.md` 的基线数字已过期（§2 那一节）——若要维护，按本文件 §4 更新。

---

## 6. 坑表（本会话新增/验证，按踩坑概率排序）

1. **DSH 关闭 → 模拟器被杀**：从命令行启动的 MuMu 挂在会话进程树（job object）下，DSH 一关连模拟器带 adb 端口全灭（用户先报"游戏消失"，实测四次）。**启动一律走 WMI 脱离进程树**：
   `([wmiclass]'Win32_Process').Create('"D:\taptap\...\MuMuManager.exe" control -v 1 launch')`
   或双击 `F:\BaoZouyxt\启动模拟器-独立.cmd`。判断是否健康：`Get-Process MuMuNxMain` + `adb connect 127.0.0.1:16416`。
2. **MuMu 实例号是 1，不是 0**（`-v 0` 是另一个空实例，会 `errcode -201`）。实例清单：`MuMuManager.exe info -v all`。
   ⚠ **实例已在跑时不要再 `control launch`** —— 那是"启动"语义，实测会把 ROM 重启一遍（游戏进程换 pid，用户正在玩的场景丢失）。
   只想把窗口弄出来用 `control show_window`；确认状态用 `info -v 1`（看 `player_state` / `pid` / `adb_port`）。
3. **模拟器窗口会被藏起来**：`IsWindowVisible=false` 但进程在跑。用 `MuMuManager.exe control -v 1 show_window` 恢复；再 `SetForegroundWindow` 置前。注意 MuMu 进程是管理员权限，普通权限的 PowerShell **无法强制置前**（SetForegroundWindow/AttachThreadInput/AppActivate 全失败）——只能显示出来，让用户点任务栏。
4. **PowerShell 是 5.1**：不支持 heredoc；`Get-Content` 对无 BOM 的 UTF-8 中文文件可能乱码（用 `[System.IO.File]::ReadAllText($p,[Text.Encoding]::UTF8)`）；`.\run.ps1` 需先 `Set-ExecutionPolicy -Scope Process Bypass -Force`。
5. **cmd 环境变量别带尾随空格**：`set "VAR=1" &` 而不是 `set VAR=1 &`（后者值里带空格，PYTHONUTF8/PYTHONHASHSEED 会直接报错）。
6. **命令通道 `call:` 解不了应答**：见 §2-D；`ver` 显示 `rpc:0` 是正常（H.rpc 从未赋值）。
7. **`git` 不存在版本库**：回滚全靠 `_backup\<时间戳>-<pre|post>-<名字>\`（本会话的：`20261024-181314-pre-shop-batch1`，含 core 四件 + MANIFEST）。
8. **acceptance 的容错**：早期在沙箱下全部 `spawn EPERM`（35 个子进程管道），不是代码问题；当前策略已是 danger-full-access，直接跑即可。
9. **gen_shapes 会探测 handler**：新增/修改 handler 后必须重跑，否则 `BZ_SHAPES.__impl` 里没有它，`shape:*:eRet` 自检会误判（空参合法拒绝的动作被要求 eRet===1）。
10. **`sycnPlayerItemData` 回空 = 清背包**（registry 状态 PUSH，本会话已在 config `includeKeys` 纳入分析并有 ⚠ 提醒）——动它之前先备份存档。
11. **uiautomation/点击**：会话内没有可靠的点击手段；"进游戏点一遍"只能由用户做，别假装能代点。

---

## 7. 出问题时的标准排查链（照抄）

```powershell
Set-Location F:\BaoZouyxt\hotfix-patch
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\run.ps1 status                  # ready/impl/scene/最近日志
.\run.ps1 log -Tail 60            # 找 kind:"err"（带堆栈 file:line 的是客户端崩溃）
.\run.ps1 cmd "ver"               # impl 是否 = hb6955b90
.\run.ps1 cmd "state"             # 存档真值（货币/背包/技能/任务）
```
- 客户端崩溃的堆栈行号是 **jsc 行号**，去 `tools\index.js` / `scripts2.js` / `scripts3.js` 同名行号附近找源码（本会话三次崩溃都是这么定位的）。
- ⚠ **日志噪音**：`[flow] SPY 捕获响应 RNN` 每进入游戏都刷几十行，是 flow 层正常观测输出，不是错误。
  只看 `"kind":"err"`（客户端崩溃/服务端异常）和 `"kind":"xhr"`（应答字节数）、`[impl] dispatch`/`[impl] UNKNOWN`/`[impl] SHAPED`（说明该动作没有真 handler）。
- 需要远端触发某个动作看日志（不改档）：
  `call:(function(){var a=api();var b=a.codec.encode(JSON.stringify({mod:"User",do:"<动作>",p:{}}));H.impl.handle({url:"http://1.15.159.44:9898/User/<动作>",body:b});return "sent";})()`

---

## 8. 回滚

| 对象 | 位置 | 方法 |
|---|---|---|
| 服务端 4 件（bz-rpc-server/impl/shapes/templates） | `_backup\20261024-181314-pre-shop-batch1\` | 拷回 `hotfix-patch\core\` → `node build-handlers.js` → `.\run.ps1 handlers` → `check_shape_freeze --freeze`（基线需回冻） |
| 存档（灌钱前） | 设备 `.../files/bz_offline_save.json.pre-maint.json` | 覆盖回 `bz_offline_save.json`，重启游戏 |
| 商店数据表 | 重新 `node tools\gen_shop_tables.js`（数据源 dump 表） | 幂等 |
| 本批代码 | 无 git，见上 | — |

---

## 9. 文件索引（本会话产出）

| 路径 | 内容 |
|---|---|
| `shop-batch1\交付说明.md` | 批 1 的施工说明 + 与上游模板的 4 处差异 |
| `shop-batch1\02-handlers.已实现版.js` | 10 个 handler 的最终代码（从 server 原样摘出） |
| `shop-batch1\03-冒烟清单-预填.md` | 27 项冒烟清单（每条带预期，用户在用） |
| `shop-batch1\recon\侦察.md` | 客户端协议名/参数名/eRet 分支/表列的取证（只读工人产出） |
| `shop-batch1\verify\VERIFY.md` | 独立复核（复跑 acceptance、键位、登记、构建确定性） |
| `shop-batch1\第1批-商店交易-回执-20261024.zip` | 以上打包，发上游用 |
| `tools\gen_shop_tables.js` | 商店数据表生成器（新增表都从这里走） |
| `audit-v23\relate-result-r3-20261024\` | 关联分析第 3 轮交付（relations.md 76 簇） |
| `启动模拟器-独立.cmd` | 脱离进程树启动 MuMu（必须用这个） |
| `交接-下一步-你要做什么.md` | 给**用户**的版本（不是给你的） |

---

## 10. 下次开工第一条命令

```powershell
Set-Location F:\BaoZouyxt\hotfix-patch
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\run.ps1 status                     # 期望：pid=<数字> / impl=hb6955b90 / scene=gamescene
```

**活着** → 收冒烟结果（§5 第 1 条），别乱动代码。

**死了 / pid 空 / impl 不同** → 按这个顺序恢复：

```powershell
# 1) 模拟器没了（Get-Process MuMuNxMain 查不到）→ 用脱离进程树的方式起
& 'F:\BaoZouyxt\启动模拟器-独立.cmd'
# 2) 等开机完成（约 15-40 秒；输出 1 才算好）
$adb = Join-Path $env:USERPROFILE 'platform-tools\adb.exe'
& $adb connect 127.0.0.1:16416
& $adb -s 127.0.0.1:16416 shell getprop sys.boot_completed
# 3) 拉游戏
& $adb -s 127.0.0.1:16416 shell monkey -p com.maple.madherogo -c android.intent.category.LAUNCHER 1
# 4) 确认构建是最新的（改过 core/ 就必须先 build，否则推的是旧 bundle）
node build-handlers.js
.\run.ps1 handlers                    # 期望最后一行 pid before==after
```

⚠ 不要用 `MuMuManager control -v 1 launch` 去"叫醒"已在跑的实例（会重启 ROM，见 §6.2）。
