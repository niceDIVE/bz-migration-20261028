# 交接文档 —— 《暴走英雄坛》进程内离线单机

> **⚠️ 本文件已过期，仅作历史存档（2026-10-23 批注）**：§2 基线数字已过期，现状一律以 `PROJECT-STATE.md` 为准，会话边界以 `HANDOVER-SESSION-FENCE-2026-10-23.md` 为准。
> **v4 = 精简版（2026-10-23 03:15）**。目标：**读 5 分钟就能开工**，不放大段契约。
> v3 全文（404 行，契约/坑表/缺口 21 项的完整版）在 `_backup\2026-10-23-0314-pre-handover-v4\HANDOVER.md`；
> **契约与坑表的展开版在 `docs\HANDOVER-contracts.md`**（本文件只留速查 + 指针）。
> 事故取证链在 `docs\HANDOVER-full-history-20261022.md`（2249 行，§0–§23）。

---

## 0. 30 秒上手

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
cd F:\BaoZouyxt\hotfix-patch
.\run.ps1 cmd "ver"          # 版本（status 里的 impl 是开机时的，热重载不刷）
.\run.ps1 cmd "state"        # 存档真值
node ..\tools\acceptance.js  # 全部验收：35 项，退出码 0 = 绿

# 改一行应答（≈10 秒，不重启）
$env:BZ_PROBE='0'; node build-handlers.js      # 必须 HANDLERS OK selfCheck=1242
.\run.ps1 handlers                            # 推送 + 热重载（断言 pid 不变）
```
改了形状层（`classify_fields` / `gen_shapes`）则顺序不可换：
`classify_fields` → `gen_shapes` → `build-handlers` → `check_shape_freeze`。

---

## 1. 边界（唯一目的：用户本机离线单人游玩官方原版）

在客户端**自己的可写目录**放本地补丁、在**进程内**应答它自己的请求；**不**分发/修改 APK、**不**架服务器、
**不**伪造任何付费/充值/订单（`PAY_ACTION_RE` 一律 `eRet:4` + `PAY_BLOCKED`）。数值只改本机存档。

---

## 2. 当前真值（2026-10-23 03:15 实测）

| 项 | 值 |
|---|---|
| 部署 | `impl=h84faae07 / flow=ffaec47c3`，`pid 29928`（热重载未重启），`scene=gamescene`，`implErr/flowErr=null` |
| 自检 | `failed=[]`、`checkedCount=1242`、`missingRequired=[]` ← **判绿只看这三项** |
| 验收 | `acceptance` **35/35 绿，已知红 0，cap 0**；`test\*.js` **32 套全绿**；冻结 C1–C13 全绿、diff 0 |
| 存档 | `roleID=16374` `FZhou` v4；`coins=11155859` `gold=5099799` `yuanbao=1000` `potential=84599` |
| 背包 | `{1301:2,1501:1,3003:52,3007:13,3020:17,3626:1,4014:1,4015:1,4016:1,4020:5,4101:1,7027:1}` |
| 装备 | `playerEquip` 5 项（1001/2001/2302/2501/2601）；`equipments` 槽 1/2/5/7/8 |
| 技能 | `{1:[40,0,1],7:[40,0,1],8:[40,0,1],1112:[41,0,1],1262:[1,0,1],1263:[1,0,1]}` |
| 任务 | accepted 21 / done 19 / rewarded 16（主线卡「和跟踪者对话」） |

### 2.1 能玩到哪

✅ 冷启动、战斗（用户实测）、任务全链、普通商店、时装三页、背包/食物/药品、出售/快速购买、
**Effect 5 师门秘籍（29 件→学会技能）**、**Effect 28 称号（7026/7027→`titleID`）**、活动面板可开（窗口已平移）。
⚠ 打坐/练功**能开始不能结算**；成就与活动 18 条全 0 进度；未建模效果的物品"照扣但无效果"（你已裁定先不改）。
⛔ 转世/特殊转世诚实拒绝；`Map=0` 的入口（江湖/兑换/转世 NPC）走不到。

---

## 3. 架构与原则

```
设备端 files/：hotfix/jsb-adapter/jsb-engine.js（引导层，改动要重启）
              hotfix/live/handlers.js（策略层 ≈993KB，热重载） + flow.js
              bz_offline_save.json / bz_log.jsonl / bz_cmd.txt+bz_res.txt
工程：hotfix-patch\{hook,core,live,test,probe} + tools\{golden,facts,cfg\dump} + docs\sota
```
1 机制与策略分离（换 impl 不重启）；2 可观测（断言对 JSONL，不对截图）；3 大声失败（`UNKNOWN User.X`）；
4 形状是契约不是实现（`fillShape` 只补缺；**开关字段一律不填**）；5 改形状层先过冻结断言；
6 任何登记表都带棘轮（新增即 FAIL、修好不删也 FAIL、只许降）。

---

## 4. 常用操作

`.\run.ps1 status|cmd "ver"|cmd "state"|log -Tail 40|handlers|all|restart|probe`
维护动作（协议里没有，走命令通道）：`bzSeedBag`（**唯一正规灌物品入口**）、`bzGrantCur`、`bzPatch`（只写顶层键）、`bzBackfillRewards`。
四者都先写 `<save>.pre-maint.json`（唯一回滚位）。

---

## 5. 契约速查（**细节见 `docs\HANDOVER-contracts.md`**）

| 主题 | 一句话 |
|---|---|
| 线协议 | LZString→AES-256-CBC→Hex；信封按 URL：`:9898` 回 `{MsgData}`，账号/游戏服回 `{code:200,MsgData}`（少 `code` 静默丢弃） |
| `note` 子表 | `ivch`＝**新数量绝对值**（0 删）；`eqch` 增删装备；`eco`＝新余额且**潜能键是 `ptt`**；`attrch` 落属性；`skch` 只弹提示 |
| 三个重建入口 | `LoadGame`/`sycnTask`/`sycnPlayerItemData`：`itemObj` 必须回**全部持有物**（回空＝清背包）；`finishTaskObj` 要字符串数组、`PlayerFinishTaskObj` 要对象 |
| 派生叠加 | 接任务不写背包、交任务不扣 `SpRequire`；差额只在投射里（同物品取 max） |
| 装备两本账 | `PlayerEquip{uid:[type,itemID,attrs,…]}` + `equipments{槽:uid}`；穿是 `equipWeapon` |
| 战斗 | `ReqSelfBattleInfo` 必须回 `npcID` + `npcArr` **26 格**（`t[23]` 必须是数组，否则战斗静默失败） |
| 开关字段 | `hasOwnProperty` 当开关的字段缺省**不发**；`isCollective` 例外：**有就回声、0 也发**（客户端靠 0 切界面） |
| 拒绝应答 | 只许 `{eRet}` ∪ 白名单（`useItem.itemID`、`washAdditionalArr.attrList`），`narrowReject()` 强制 |
| 异常 | **绝不许变成成功**：`_catchCount++` → `_save=null` → `repushLive()` → 回推导出的 `catchCode`（推不出就不回 eRet） |
| 时间字段 | 被减法消费的 `beginTime` 必须回 `env.now()`；`hyTime/hanyusuiTime`＝寒玉髓 buff 剩余秒数（我们没实现 buff → 0） |
| 物品效果族 | `BZ_ITEMFX{id:[Effect,Data1..3]}`（只收 Type==2）；1 食物 / 2-3 回血回内 / 5 师门秘籍 / 11 秘籍 / 28 称号 已做；13 礼包、15、24、6、8 未做 |
| 活动窗口 | `activityResource` 是抓包静态值 → 按 `now - 抓包 serverTime` 平移（`REBASE_ACTIVITY_WINDOWS`，一行回退） |

---

## 6. 验收

```powershell
node tools\acceptance.js     # 35 项：32 套 test + 冻结 + 拒绝码 + 兑换；K-cap/G3/G5 棘轮
node tools\check_shape_freeze.js    # C1–C13（改形状层前必跑）
```
- 已知红登记按 `file + assertSha8 + msgSha8` 匹配（行号只作信息），`--update` 拒绝实现；cap 取历史最低值。
- 自检 1242 项含"开关字段不许被 fill 补出""货币奖励不许进背包""`eco.ptt`""live 时钟=真实时钟""`shape:*:rejectKeys`"。
- `test\r14-catch-smoke.js`：87 handler × 2 种畸形请求 + catch 回滚用例（R5c）。
- **R5（动作×原因夹具 + 业务哈希）未实现**，`check_reject_codes.js` 每次打印。

---

## 7. 已知缺口（Top 8，完整 21 项见 v3 备份 / contracts）

| # | 缺口 | 一句话 |
|---|---|---|
| 1 | **Effect 11 已学会分支是错的** | `T?ConditionUp:Condition` + 走 `ConsultUI` ⇒ 原版允许对已学会继续升；我们回 `eRet:5` → 书永远升不到 2 级。卡在 `ConsultUI` 不在 `index.js` |
| 2 | 87 动作 `catchCode` | 只覆盖 16 个，其余走"不回 eRet"；`handled` 抽取看不到 `!eRet`/不等号/末尾 else |
| 3 | Effect 13 礼包 | 客户端零本地逻辑（无 case 13/无 default），语义全在服务端；缺礼包表名 |
| 4 | Effect 15 / 3020「嫦娥月饼」 | 客户端只有 `numDeaths==0 → 提示 4374`，名字与语义不符 |
| 5 | `EndMeditation`/`EndTraining` | 请求不带时长 → 结算不能做（R10 Q1） |
| 6 | 成就 / 每日任务 / 七日活动 | 进度靠服务端 `taskData`，客户端不本地算 → 保持 0 |
| 7 | `Map=0` 入口、转世/洗点内容侧 | 规则不在客户端 → 诚实拒绝 / 需用户裁定 |
| 8 | `R5`、`span_gain.js`、C9b | 都未实现，前置关系见 contracts |

---

## 8. 坑（Top 5；12 条完整版见 `docs\HANDOVER-contracts.md` §11）

① **别拿 `ver` 判断"改没改代码"**（含形状包/`built` 时间戳，不稳定）→ 用源文件 md5。
② catch 里**不许默认回 4** → 用推导出的 `catchCode`，推不出就不回 eRet。
③ `_save=null` 只回滚服务端账本 → 还要 `repushLive()` 重推活模型。
④ "扣了没效果"**不许打 REJECT**（它真写了档）→ `CONSUME_UNMODELED` + `meta.consumeStats`。
⑤ 已知红/登记表**不许用行号做键** → `file+assertSha8+msgSha8`；`--update` 拒绝实现。

**探针三铁律**：禁全图 BFS（`Set`+限量）｜超时先清残留命令文件｜探针文件只用 edit/write。
**委派**：工程苦力→`gemini-3.8-flash-low`，文学→`-high`；工单必须带"路径:行号 + 退出码 + 未验证"；交接文档由主审独占。

---

## 9. 回滚

`_backup\<时间戳>-<pre|post>-<改动名>\`（带 `MD5SUMS.txt`）。最近：`2026-10-23-0314-pre-handover-v4`、`0313-post-r17`、
`0311-c4-leftover`、`0301-post-r16`、`0227-post-r15`。
回滚代码 = 拷回源文件 →（动过形状才要 `classify_fields`+`gen_shapes`）→ `build-handlers` → `run.ps1 handlers` → `check_shape_freeze`。
卸载补丁：`adb shell rm -rf /data/data/com.maple.madherogo/files/hotfix`。

---

## 10. 索引

**工具**：`acceptance`（总跑器）｜`check_shape_freeze`｜`check_reject_codes`｜`check_exchange_currency`｜`derive_catch_codes`｜
`gen_shapes`/`classify_fields`｜`gen_task_rewards`｜`gen_item_effects`｜`gen_obtainable`｜`docx2txt`｜`decrypt_bundles`。
**数据**：`tools\cfg\dump\`（442 表 + `item.full.json` 6525 行）｜`tools\facts\`（item-effects / obtainable / reject-codes / effect-branches / lookup-keys）｜`tools\golden\`（基线+审批+已知红+固定时钟）。
**源码三包**：`tools\index.js` / `scripts2.js` / `scripts3.js`（330k 行）。
**SOTA**：`docs\sota\inbox\`（R05–R17）、`outbox\`（`14-R07`…`25-R18`，**下一个 26-R19**）。

---

## 11. 下一轮第一件事

1. **Effect 11 已学会分支**（缺口 #1）：先 dump `level.json`（封顶字段）或在客户端资源里找 `ConsultUI`；拿到就走"升级"路径。
2. **87 动作 catchCode**（缺口 #2）：先扫 71 个动作调用点分三类（内联回调/只发不收/从不发送）。
3. **Effect 13 礼包**：在 442 张表里筛"以 6625/6810/7105/7106/7226 为主键且行内含 itemID 数组"的表。
4. **3020（Effect 15）** 与 **`EndMeditation`/`EndTraining` 取证**（材料：`docs\audit\end-actions-hytime.md`）。
5. **`R5` 夹具 + `tools\span_gain.js`**。

**收工必做**：备份（带 md5）→ 更新本文件 §2 → 核对 `HANDOVER.md`/`core\bz-rpc-server.js` md5 → `acceptance`、`check_shape_freeze`、`build-handlers` 三条都退出码 0。
