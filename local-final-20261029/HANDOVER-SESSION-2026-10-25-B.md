# AGENT 交接：2026-10-25 第二次会话（批次 2 商店货架 + 侠客令 + 第 1 批收尾 + 算法 v2.3）

> **给下一个 Agent 的**，不是给用户的。读完这一篇就能接手，不需要读对话记录。
> 项目根：`F:\BaoZouyxt` ｜ 补丁工程：`F:\BaoZouyxt\hotfix-patch` ｜ 上游包：`F:\BaoZouyxt\_incoming\`
> ⚠ 同日的 `HANDOVER-SESSION-2026-10-25.md`（第一次会话）**已被本文取代**。`HANDOVER.md`、`PROJECT-STATE.md` 更旧，只当历史读。

---

## 0. 三十秒接手

- 游戏跑在 **MuMu 模拟器（实例 -v 1）**，adb `127.0.0.1:16416`，包名 `com.maple.madherogo`。
- 当前线上 **`impl=h6271f048`**，`selfCheck=1251` 全过，验收 **38/38 绿**，冻结 C1–C8/C10–C13 全过，拒绝码 28 个动作 OK。
- 游戏 pid **6188**，scene=gamescene，设备 `handlers.js` md5 `2720308DD38B2F40B13FA55A8252F3A3` **= 本地构建**（已核）。
- 上游现在处在：**第 1 批已交、第 1 批收尾已做完并已打回执包**；**第 2 批（C05 道具使用）未开工**。
- 你现在大概率要做的：**开第 2 批**（先跟用户确认范围，见 §3）。

---

## 1. 当前部署状态（可核，别凭记忆）

| 项 | 值 |
|---|---|
| `impl` / `flow` | **h6271f048** / ffaec47c3（`.\run.ps1 cmd "ver"` 验，别看 `ready.json`——它是加载时写的，热重载后是旧值） |
| selfCheck | 1251 全过，`failed=[]`、`missingRequired=[]` |
| 验收 | 38/38 绿，known-red 0，cap 0 |
| 冻结 | C1–C8、C10–C13 全过（C9b 未实现） |
| 拒绝码 | 动作=28，条目=31，拒绝点=51 |
| 游戏进程 | pid 6188，scene=gamescene |
| 存档 | roleID 16374 / FZhou，saveVersion 4；coins 20,831,609；gold 10,096,699；yuanbao 50,996；**potential 102,499**；growthBigPaid 0；growthClaim `1_2,1_3,1_4,1_5,1_19,1_20,1_21,1_22` |
| 文件 | `core\bz-rpc-server.js` **231,733 B** md5 `9292747DF7E6C945CC0A5004BC6732F2`；`patch\live\handlers.js` **1,122,380 B** md5 `2720308DD38B2F40B13FA55A8252F3A3` |

---

## 2. 本次会话干了什么（按顺序）

### A. 接手核对 + 第一次冒烟
- 核了 §4 全部数字，全部为真；`GetMarketList`/`GetMountsList` 当时**没有 handler**（`[impl] SHAPED`）。
- 用户冒烟报 3 个问题：金条商城点不开、坐骑商店空、客栈菜谱找不到。

### B. 批次 2「商店货架」（我自己起的名字，上游没派）
| 动作 | 实现 | 关键证据 |
|---|---|---|
| `GetMarketList` | `BZ_MALL` 39 行转成**位置数组** `[ID,Type,Name,Description,Data,Price,Num,Limit,0,0,icon]` | 客户端 `scripts2.js:8508-8521` 把 `market` 当行集合遍历、按 `u[0..10]` 取 |
| `GetMountsList` | `BZ_MOUNT` 72 个**纯 id 数组** | `index.js:32137` → `scripts2.js:18485` `getItem(this.data,"mount")` |
| `BuyMount` 改币种 | `coins` → **`gold`**（原来错了） | `scripts2.js:18754` 客户端用 `RoleBaseInfo.gold` 比价 |

### C. 侠客令 / 大侠令（`NewGFUI`，22 阶双轨）
- 数据源：`anniversary_pass_award.json`（`award1`=侠客令 / `award2`=大侠令 / `liveness`=需求等级）。
- 新写 `getGrowupData`、`getBigGrowupData`、`ReceiveAward`、`ReceiveBigAward`、`buyBigGiftTime`（980 元宝解锁）。
- `growObj` 每行 = `[状态, 需求等级, 0, 奖励1..奖励4]`，四格必须都是数组。

### D. 另一个「通行证」面板 `PassCardUI`（与本批无关，顺手做）
- `passCardData` / `passCardAward` / `buyInvitationCard`，数据源 `pass_level`（4 档价目 0/288/600/1000）+ `pass_award`（12 阶 ×4 档）。

### E. 两个货币 bug（都是真 bug）
- 新增 `grantRewardList`：**货币走钱包、物品走背包**（`1`=金条 / `4001`=银两 / `4003`=潜能 / `8888`=元宝）。
- `BuyMarketItem` 原来把 `Data[0]` 一律 `grantItem` → 潜能被塞进背包，已改。

### F. 第 1 批收尾（上游 v2.3 拍板）
- 尾巴 #1：`growthClaim` 键改 `轨道_阶id`，旧数字键自动迁移为 `1_<id>`（幂等）。
- 尾巴 #2：`potential += 10000`、`bag` 删 `4003`（修前快照 `pre-tails-20261025`）。
- 尾巴 #3：`growthBigPaid` 置 0。
- 980 元宝定价维持；侠客令活跃度仍靠维护命令。

### G. 算法 v2.3 跑通并交回
- 四个新工具全跑通：`extract_panel.py` / `extract_shape.py` / `table_link.py` / `relate.py --panel --tables`。
- 交回包：`_incoming\v2.3-20261025\算法v2.3+第1批收尾-回执-20261025.zip`。

---

## 3. 上游进度与下一步

| 批次 | 状态 |
|---|---|
| 第 1 批 C01（商店交易，27 个） | ✅ **27/27 全覆盖**，回执已交 |
| 第 1 批收尾（三条尾巴） | ✅ 已修，回执打包完毕 |
| **第 2 批 C05（道具使用）** | ⬜ **未开工** |

### 第 2 批的真实范围 = 26 个（不是指令里写的 15 个）

指令（`_incoming\v2.3-20261025\t\01-第2批-道具使用.txt`）写 15 个，但 `relations.md` 的 C05 段还列了 **11 个「同面板必做」**，必须一起做：

```
LoginModel : CHECK_ON_HOOK、RECORD_PHONE、USER_GETCHATADDRESS
MasterModel: BUY_NPC_FEEL、CHECK_OUT_SCHOOL、CLEAR_SXHOOL_CD、EXIT_SCHOOL、LEVEAL_SCHOOL
RogueRoleModel: ROGUE_SYNC_WAIT_DATA
SkillModel : SWAP_SKILL_PROGRESS
SnowManModel: GET_SNOW_REWARD、SNOWACTIVE
```

要写的 8 个（行号是客户端 send 处）：`rgUseItem`(scripts3.js:73948)、`UseSnowBall`(index.js:122505)、`UseBatchSnowBall`(122514)、`UseAllBall`(122543)、`useItemAddition`(56234)、`BackToLogin`(70349)、`accountLogOff`(117200)、`quitSchool`(113585)。
只冒烟的 7 个：`Create`、`quicklogin`、`LoadGame`、`useItem`、`joinSchool`、`upgradeSkill`、`ReqSelfBattleInfo`。

### 上游 v2.3 包位置

```
F:\BaoZouyxt\_incoming\v2.3-20261025\
  pkg.zip                    原始包（中文名是 GBK，Windows 解压会炸，见 §5-8）
  t\bz-oracle\               已解出的算法工程（含 out\ 依赖，能直接跑）
  t\00-第1批收尾.txt          已执行完
  t\01-第2批-道具使用.txt      待执行
  t\02-算法v2.3.txt           已执行完
  t\README.txt               顺序：02 → 00 → 01
  04-算法v2.3-跑完结果.txt     已交
  05-第1批收尾-结果.txt        已交
  算法v2.3+第1批收尾-回执-20261025.zip   已交回上游
```

### 每批交回四样（上游口径）

`bz-rpc-server.js` ｜ 冒烟勾选表（通过/点不开/未实测）｜ 卡住的动作（一句话各一条）｜ 名单外顺带做了哪些。
**只有两种情况单独喊**：存档被写坏、能白拿钱或道具。数值差一点不用报。

---

## 4. 家法（照做）

1. 应答外壳 `wrapped(do,payload,{achievement:ach()})`；拒绝 `{eRet:<码>}`，**每个动作按客户端分支取证选码**。
2. 改档必须回 `note`：`note.eco`=新余额绝对值、`note.ivch[id]`=新绝对数、`note.eqch`=装备。
3. 登记即收窄：进了 `REJECT_CODES` 的动作，拒绝应答会被剥到只剩 `eRet`。
4. 发放物品用 `grantItem`，**但货币必须先判 `isCurrencyItem`**（用 `grantRewardList`，见 §5-4）。
5. 形状层顺序不可换：改 handler/形状 → `node tools\gen_shapes.js` → `node build-handlers.js` → `node tools\check_shape_freeze.js`。
6. 冻结要审批：红时 `--diff` 看差异 → 写 `tools/golden/planned-changes.json`（`{id,action,field,expect,ev,allowSigma,why}`）→ 新增路径加 `approved-widening.json` → 收窄加 `approved-narrowing.json`（`escape:"closed"`）→ `--freeze` → 再 `check_shape_freeze`。
7. 数据表一律走 `tools\gen_shop_tables.js` 生成到 `core\bz-shops.generated.js`。
8. 验收 `node tools\acceptance.js` 38 项全绿；`tools\check_reject_codes.js` 必须 OK（新增拒绝点必须登记，棘轮）。

---

## 5. 坑表（本次新增，按踩坑概率排序）★ 最值钱的一节

1. **空数据比没有 handler 更糟**
   `NewGFUI`（侠客令/大侠令）在 `dataArr[1]` 为空时，`changePage` 走 `else 1 == t && reqBigGrowUpData()`（`scripts2.js:46175`）→ **每 14~15ms 重发一次请求、永不收敛**，`lockScreen` 锁死（表现为「什么都点不动」，但 `err=0`）。
   ⚠ 给空 `growObj` **比不给 handler 更糟**。这类面板必须给非空数据。

2. **`getSkillLvData(0)` 返回 null → `.SkillEvaluate` 崩**
   `getSkillLvData(t)` = `getItem(t,"level")`（`index.js:21876`），`level` 表 id 是 **1..999**。
   给 0 → 返回 null → `setSelectBtn`（`scripts2.js:45855`）读 `.SkillEvaluate` 抛异常 → 整个 `show()` 中断 → **整页空白**。
   侠客令看不出来（`payStates=1` 走另一支），大侠令必崩。→ **等级类字段最小给 1。**

3. **`__meta` 会污染整表下发**
   `gen_shop_tables.js` 给每张表挂了可枚举的 `__meta` 统计属性；`for...in` 会把它当数据行。
   实测：`BZ_MALL` 真实 **39 行**，原实现发了 **40 行**（客户端多一张空白商品卡）。
   → 凡整表下发，循环里必须 `if (k === '__meta') continue;`。

4. **货币必须走钱包，不能走背包**
   `CURRENCY_SLOTS`：`1`=金条、`4001`=银两、`4003`=潜能、`8888`=元宝。
   `grantItem` 会把它们塞进 `bag`（客户端只认钱包，潜能变成一件叫「潜能」的道具）。
   → 用 `grantRewardList(s, [[id,cnt],…], note, ra)`。

5. **币种以客户端比价语句为准，别信注释**
   `BuyMount` 我们原来按注释写成扣铜钱，实际 `scripts2.js:18754` 用 `RoleBaseInfo.gold` 比价 → 扣错钱包等于打折。
   搜 `RoleBaseInfo.xxx <` 这类语句最可靠。

6. **日志有 400 条上限**
   `bz_log.jsonl` 满了会滚掉最早的记录。排查要在用户操作后**尽快**拉，否则证据消失（本会话踩过一次，买坐骑的记录被冲掉）。
   拉日志时注意：多行 err 的每行都带 `{"t":...}`，过滤要按 `"kind":"err"` 而不是按行。

7. **`lockScreen` 死锁的恢复手段**
   热重载救不回来（循环是客户端状态驱动的）。只能 `am force-stop` + `monkey -p com.maple.madherogo -c android.intent.category.LAUNCHER 1` 重启。
   重启前先 `cp` 一份存档快照（每次写账都落盘，正常不会丢）。

8. **上游 zip 里是 GBK 文件名**
   `Expand-Archive` 会报「路径中具有非法字符」，`tar -xf` 会报 `Invalid empty pathname`。
   可用办法：`System.IO.Compression.ZipFile` 按**条目索引**抽（`ExtractToFile`），文件名用 ASCII 另存，内容本身是 UTF-8 正常。

9. **PowerShell 的 `>` 重定向写 UTF-16**
   会把 `panel.json` 写成 UTF-16（首字节 `FF FE`），Python `json.load` 报 `invalid start byte`。
   → 用 `Start-Process -RedirectStandardOutput` 或 `cmd /c` 重定向。
   另外 PS 5.1 里 `-f` 表达式里不能写 `if`；`Set-Location` 不影响 `.NET` 静态方法的当前目录（要用绝对路径）。

10. **`ready.json` 的 impl 是旧值**
    它只在加载时写。热重载后要`.\run.ps1 cmd "ver"` 才准。

11. **形状表把这几个字段判错了**（自己心里要有数）
    - `GetMarketList.market` 判成 `number`，实际是**数组的数组**（`scripts2.js:8508` `for..in` + `u[0..10]`）。发 0 → `for..in` 零次 → 货架全空。
    - `getChangeShop.shopObj` 判成开关字段（工程内 `noteBadSwitches` 注释里记着）。
    - 形状表对「经 dispatch 转手一层」的字段是盲区。

12. **`passCardData` ≠ 侠客令**
    侠客令是 `NewGFUI`（`getGrowupData`/`getBigGrowupData`）；`PassCardUI` 是另一个面板（`passCardData`）。
    我一开始搞错对象，白做了一轮。

13. **金条商店 / 元宝商店 = 卖金条/元宝的充值入口**，不是用金条/元宝买东西的店
    `scripts2.js:67604`：`Type` 为 7 或 11 → 走 `StoreModel.buyItem → reqPayPlatform`（**真实支付**）；
    其它 `Type` → 走 `money:[货币类型,数量]` 的游戏币分支（`money[0]==2` 是元宝）。
    原版数据本来就带游戏币价（`gift_permanent.buy_price`、`active_store.ingots_price`）。
    当前整页未实现（`User.GetPayShowData` 没 handler）。

14. **原服游戏服已下线**
    `bzgf.maple-game.com:900`（抓包里 `/server-166/`）从模拟器实测 **HTTP 000**（主机 ping 通 31ms，端口不服务）；
    只有选服接口 `1.15.159.44:9898` 还回 200。
    → **抓包通道永久关闭，后续只能照客户端源码自写**。别再指望抓包。

---

## 6. 待办

1. **第 2 批 C05（26 个）**（最高优先，见 §3）。
   ⚠ 开做前先跟用户确认「15 个还是 26 个」。
   ⚠ 上游另交代：`circle_task.json` 的数值是**混淆过的对象**（`{"_value":[18120],"tag":"cfMon"}`），用之前要先解码，看客户端怎么读 `cfMon`。
2. 三个面板**从未补测**：客栈（`getInnShop`/`getInnRank`/`innBuyShop`）、门派商店（`buySchoolShop`）、时装（`upFashionFaceState`/`fashionEffect`）。入口没找到，不是坏。
3. 金条商店 / 元宝商店：如果要开，得先拿 `ShopArray` 产品表来源（候选 `gift_permanent.json` / `active_store.json`），并把 `Type` 发成非 7/11 以走游戏币分支。
4. 侠客令「活跃度」游戏内来源未接（`anniversary_pass_liveness` 5 条），现在只能 `bzGrantCur passLiveness:+N`。
5. 上游第 3 批是 C02 任务主线（19 个，已有 3 个）。

---

## 7. 回滚

| 对象 | 位置 | 方法 |
|---|---|---|
| 本会话前（批次 2 之前）的 core 四件 + handlers | `_backup\20261025-0145-pre-batch2\` | 拷回 `hotfix-patch\core\` → `node build-handlers.js` → `.\run.ps1 handlers` → `check_shape_freeze --freeze` |
| 存档：冒烟前 | 设备 `.../files/bz_offline_save.json.pre-smoke-20261025`（01:37，1573 B） | 覆盖回 `bz_offline_save.json` 后重启游戏 |
| 存档：重启前 | `...pre-restart-20261025`（03:17，1538 B） | 同上 |
| 存档：**三条尾巴修之前** | `...pre-tails-20261025`（15:39，1939 B，md5 `b414c02264f09c237a7cb204479d6509`） | 同上 —— 想撤销尾巴修复就用这个 |
| 数据表 | `node tools\gen_shop_tables.js` | 幂等 |
| 代码 | 无 git | 见上 |

---

## 8. 文件索引

| 路径 | 内容 |
|---|---|
| `tools\gen_shop_tables.js` | 数据表生成器；现有：BZ_INNSHOP/BZ_SECTSHOP/BZ_MALL/BZ_MOUNT/BZ_TIMELIMITSALE/BZ_FORMULA/BZ_SHOP_ENTRANCE/**BZ_PASS_ROW/BZ_PASS_PRICE/BZ_PASS_ENDTIME/BZ_GF_ROW** |
| `tools\cfg\dump\` | **444 张配置表**（道具、任务、成就、门派、肉鸽、雪球、pass 系列…）；查表先来这 |
| `shop-batch1\上游索要清单-交付包-20261025.zip` | 上一轮给上游的完整交付（19 张表 + 报告） |
| `_incoming\v2.3-20261025\算法v2.3+第1批收尾-回执-20261025.zip` | 本轮给上游的回执（算法产物 + 收尾结果） |
| `_incoming\relate-pack-r3-20261024\bz-oracle\` | 算法工程（**缺 `out\registry.json`+`contracts.json`，跑不起来**；要用 v2.3 包里的那份） |
| `audit-v23\relate-result-r3-20261024\relations.md` | 旧关系图（r3）；新一轮的在 `_incoming\v2.3-20261025\t\bz-oracle\out\relations.md` |
| `hotfix-patch\core\bz-shops.generated.js` | 生成的数据表（当前 69,519 B 起） |

---

## 9. 下次开工第一条命令

```powershell
Set-Location F:\BaoZouyxt\hotfix-patch
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\run.ps1 status                    # 看 pid
.\run.ps1 cmd "ver"                 # 期望 impl=h6271f048 / scene=gamescene / implErr=null
```

**活着** → 跟用户确认第 2 批范围（15 还是 26），然后开工。
**死了 / pid 空** → 按 `HANDOVER-SESSION-2026-10-25.md` §10 的顺序恢复（模拟器用 `启动模拟器-独立.cmd` 脱离进程树起，别用 `control launch` 叫醒已在跑的实例）。

---

## 10. 两个已确认、但可能被后来者改错的事实

1. **大侠令解锁价 = 980 元宝**，是**本工程自定**的，不是原版价（原版走真实充值链取不到价）。常量 `GF_BIG_UNLOCK_PRICE`。
2. **侠客令/大侠令是两轨**：`paystata` 侠客令恒 1（免费轨）、大侠令看 `growthBigPaid`。已领表键是 `轨道_阶id`（`1_`/`2_`），别再改回纯数字。
