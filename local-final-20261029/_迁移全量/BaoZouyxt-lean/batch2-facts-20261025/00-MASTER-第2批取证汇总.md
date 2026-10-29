# 第 2 批 C05〔道具使用〕取证汇总（27 个动作）

> **只读取证，未改动任何代码、未触碰存档、未向游戏发任何请求。**
> 生成：2026-10-25 18:05（19:00 修正版，见 §0 修正块）｜ 取证口径：**27**（15 主表 + 12 同面板必做）= **12 个已有 + 15 个要写**
> 上游 v2.4 拍板本批范围：**24**（15 主体 + 4 新写 + 5 已有），砍掉 `RECORD_PHONE`/`BUY_NPC_FEEL`/`SWAP_SKILL_PROGRESS`
> 分档取证原始文件：同目录 `W1-snowman.md` / `W2-rogue.md` / `W3-school.md` / `W4-item-login.md` / `W5-skill-smoke.md`
> 客户端源码：`F:\BaoZouyxt\tools\index.js`(147367 行) ｜ `scripts2.js`(81276 行) ｜ `scripts3.js`(99972 行)
> 配置表：`F:\BaoZouyxt\tools\cfg\dump\`（444 张）

---

## 0. 一句话结论

**可以开码了。** 27 个动作的发送处、请求键名、接收处、回包字段全部落到 `file:line`，无一项停在"猜"。
但有 **1 个必须先定策略的硬阻塞**（§3.2 文字表缺失）和 **1 个会让人白写一批 handler 的陷阱**（§3.1 注册名≠线上名）。

> ### ⚠ 2026-10-25 19:00 修正（v2.4 包到手后复验发现）
> 本文件第一版有 **2 行判错**，原因是**我自己**用注册名去 grep handler，正是 §1 那个坑：
> `LEVEAL_SCHOOL` 线上名是 `OutSchool`（**bz-rpc-server.js:2405 已有 handler**），
> `CLEAR_SXHOOL_CD` 线上名是 `clearGeSchoolClothing`（**L2468 已有 handler**）。
> 第一版把这两个标成"❌ 无 / 新写"，错了。已改。
> 因此总数修正为：**27 = 12 个已有 + 15 个要写**（第一版误写 17 个要写）。
> 上游 v2.4 拍的 **24** 口径 = 15 主体 + 4 新写 + 5 已有，与本修正后的账完全吻合。
> 本批不做：`RECORD_PHONE`、`BUY_NPC_FEEL`、`SWAP_SKILL_PROGRESS`。
> 本文件正文表格已按此修正；回滚点 `_backup\20261025-1900-pre-facts-correction\`。

---

## 1. 最关键的一条：注册名 ≠ 线上名

`bz-rpc-server.js:3735` 的 dispatch：

```js
var h = H[action];                    // L3757 附近
env.log('dispatch User.' + action);   // ← 日志把 "User." 前缀加回去，说明 action 是不带前缀的裸名
```

所以 **`H` 表的键 = 客户端线上名去掉 `User.` 前缀，大小写原样保留**，跟注册表里的大写动作名（`LEVEAL_SCHOOL` 之类）**毫无关系**。

已用三个现存 handler 交叉验证这个规律：

| H 的键 | bz-rpc-server.js 行 | 客户端线上名 | 对得上 |
|---|---|---|---|
| `GetChatAddress` | L1387 | `User.GetChatAddress` | ✅ |
| `CheckOutSchool` | L2396 | `User.CheckOutSchool` | ✅ |
| `exitSchool` | L2465 | `User.exitSchool`（小写 e 保留） | ✅ |

**本批要写的 15 个里，有 6 个线上名与注册名完全不同。按注册名注册 = 静默落到 `SHAPED`/`UNKNOWN` 分支，一条都不生效**
（其中 `LEVEAL_SCHOOL`、`CLEAR_SXHOOL_CD`、`SWAP_SKILL_PROGRESS` 服务端已有 handler 或本批不做，真正落在"本批要新写"区间的是 `GET_SNOW_REWARD`、`SNOWACTIVE`、`USE_SNOW_BALL`）：

| 注册名（上游/relations 用的） | 必须用的 H 键 | 客户端行 |
|---|---|---|
| `LEVEAL_SCHOOL` | **`OutSchool`** | index.js:114… → 线上名 `User.OutSchool` (index.js:60059 区) |
| `CLEAR_SXHOOL_CD` | **`clearGeSchoolClothing`** | 同上 |
| `GET_SNOW_REWARD` | **`getSnowAward`** | 同上 |
| `SNOWACTIVE` | **`enterSnow`** | 同上 |
| `SWAP_SKILL_PROGRESS` | **`skillChange`** | 同上 |
| `USE_SNOW_BALL` | `UseSnowBall`（另有假常量 `fakeUseSnowBall`，见 §3.3） | 同上 |

其余 11 个是大小写规律映射（`USE_BATCH_SNOW_BALL`→`UseBatchSnowBall`、`QUIT_SCHOOL`→`quitSchool`、`USE_ITEM_ADDITION`→`useItemAddition` …）。

---

## 2. 27 个动作总表

「现状」= 服务端 `bz-rpc-server.js` 已有 handler 与否（已用 grep 逐一确认）。
「本批」= 冒烟 / 新写。

### 2.1 C05 主表 15 个

| # | 注册名 | H 的键 | 现状 | 本批 | 取证 |
|---|---|---|---|---|---|
| 1 | USER_CREATE | `Create` | ✅ 有 | 冒烟 | W5 |
| 2 | USE_ITEM | `useItem` | ✅ 有 | 冒烟 | W5 |
| 3 | USER_LOADGAME | `LoadGame` | ✅ 有 | 冒烟 | W5 |
| 4 | QUICK_LOGIN | `quicklogin` | ✅ 有 | 冒烟 | W5 |
| 5 | JOIN_SCHOOL | `joinSchool` | ✅ 有 | 冒烟 | W5 |
| 6 | UPGRADE_SKILL_LV | `upgradeSkill` | ✅ 有 | 冒烟 | W5 |
| 7 | REQ_PVE_BATTLE | `ReqSelfBattleInfo` | ✅ 有 | 冒烟 | W5 |
| 8 | ROGUE_USE_ITEM | `rgUseItem` | ❌ 无 | **新写** | W2 |
| 9 | USE_SNOW_BALL | `UseSnowBall` | ❌ 无 | **新写** | W1 |
| 10 | USE_BATCH_SNOW_BALL | `UseBatchSnowBall` | ❌ 无 | **新写** | W1 |
| 11 | USE_ALL_BALL | `UseAllBall` | ❌ 无 | **新写** | W1 |
| 12 | USE_ITEM_ADDITION | `useItemAddition` | ❌ 无 | **新写** | W4 |
| 13 | BACKTOLOGIN | `BackToLogin` | ❌ 无 | **新写** | W4 |
| 14 | ACCOUNT_LOG_OFF | `accountLogOff` | ❌ 无 | **新写** | W4 |
| 15 | QUIT_SCHOOL | `quitSchool` | ❌ 无 | **新写** | W3 |

### 2.2 同面板必做 12 个

| # | 注册名 | H 的键 | 现状 | 本批 | 取证 |
|---|---|---|---|---|---|
| 16 | CHECK_ON_HOOK | `CheckOnHook` | ❌ 无 | **新写** | W4 |
| 17 | RECORD_PHONE | `recordPhone` | ❌ 无 | **新写** | W4 |
| 18 | USER_GETCHATADDRESS | `GetChatAddress` | ✅ 有 (L1387) | 冒烟 | W4 |
| 19 | BUY_NPC_FEEL | `BuyNpcFeel` | ❌ 无 | **新写** | W3 |
| 20 | CHECK_OUT_SCHOOL | `CheckOutSchool` | ✅ 有 (L2396) | 冒烟 | W3 |
| 21 | CLEAR_SXHOOL_CD | `clearGeSchoolClothing` | ✅ 有 (L2468) | 冒烟 | W3 |
| 22 | EXIT_SCHOOL | `exitSchool` | ✅ 有 (L2465) | 冒烟 | W3 |
| 23 | LEVEAL_SCHOOL | `OutSchool` | ✅ 有 (L2405) | 冒烟 | W3 |
| 24 | ROGUE_SYNC_WAIT_DATA | `rgSycnWaitData` | ❌ 无 | **新写** | W2 |
| 25 | SWAP_SKILL_PROGRESS | `skillChange` | ❌ 无 | **新写** | W5 |
| 26 | GET_SNOW_REWARD | `getSnowAward` | ❌ 无 | **新写** | W1 |
| 27 | SNOWACTIVE | `enterSnow` | ❌ 无 | **新写** | W1 |

**合计：新写 15（主体 8 + 同面板 7），冒烟 12（主体 7 + 同面板 5）。**

> 按上游 v2.4 拍板的本批 24：砍掉 `RECORD_PHONE`、`BUY_NPC_FEEL`、`SWAP_SKILL_PROGRESS` 三个不做，
> 剩 **新写 12**（主体 8 + 同面板 4：`CHECK_ON_HOOK`、`ROGUE_SYNC_WAIT_DATA`、`GET_SNOW_REWARD`、`SNOWACTIVE`）
> + **冒烟 12**。被砍的三个若冒烟时卡住面板再顺手补。

---

## 3. 三个坑 + 一个硬阻塞

### 3.1 注册名≠线上名 —— 见 §1，最致命

### 3.2 【硬阻塞】游戏显示文案表不在我们的 dump 里，所有「看文案定规则」的指令无法执行

上游 01 指令第 16 行对 `quitSchool` 的要求是：

> 门派贡献和门派技能要不要一起清，**看客户端退出门派时弹出的提示文案，文案怎么说就怎么做**

实测结论：**拿不到这段文案。** 证据链：

1. 客户端取文案一律走 `getText("NNNN")` 数字键（例：`index.js:113703` `getText(6078)`）。
2. 唯一像文字表的 `dump\languageList.json` 只有 3 行，是语言清单，自己也要 `des:9042/9043/9044` 再转一次，**不含实际字符串**。
3. 全 444 张 dump 表里搜 `"6114"`，只命中 `item.json`（物品 id，无关）。

所以**这条指令在当前产物下无法执行**。建议改判据（择一，需你拍板，见 §7）。

### 3.3 `USE_SNOW_BALL` 有个假常量 `fakeUseSnowBall`

`HttpConst` 里 `USE_SNOW_BALL` 出现了**两次**定义：

```
USE_SNOW_BALL = fakeUseSnowBall     ← 诱饵
USE_SNOW_BALL = User.UseSnowBall    ← 真的
```

按线上名注册时若抄到诱饵那份，雪花球整套（3 个动作）全挂且不报错。**必须用 `User.UseSnowBall`。**

### 3.4 `quitSchool` 的接收回调是空函数，别指望它清东西

```js
index.js:113712:  t.prototype.onQuitSchool = function() {};
index.js:114049:  t.prototype.reqQuitSchool = function() {                          // 发送处
index.js:114050:      s.NetMgr.http.sendRequest(a.HttpConst.QUIT_SCHOOL, {});      // 请求体是 {}
```

即：**客户端收到 quitSchool 回包后什么本地字段都不清**。对比同族两个动作，客户端是会清的：

- `EXIT_SCHOOL` 回调 `exitSchoolCallBack`(index.js:77889)：删 `RoleBaseInfo.masters` 里的 npcIDArr、按 `deleteTask` 删任务；
- `LEVEAL_SCHOOL` 回调 `levealSchoolCallBack`(index.js:77894)：删 masters、`goodEvilCamp/goodEvilPrestige/goodEvilContribution` 归 0（高级门派时）、`checkTaskIsClear()`。

**推论（供你判断，不是我的建议）**：客户端不做本地清理 ⇒ 清不清完全由服务端定，回包不背锅。想保守就是"只清 school、保留贡献与技能"。

### 3.5 三个名字极像、实为不同动作的东西，别混

| 常量 | 线上名 | 是不是本批的 `quitSchool` |
|---|---|---|
| `QUIT_SCHOOL` | `User.quitSchool` | ✅ 是（index.js:114050） |
| `QUIT_SCHOOL_SQUARE` | `User.quitSchoolSquare` | ❌ 另一个动作（index.js:114467） |
| `CTS_QUIT_SCHOOL_CAMPAIGN_REQ` | `QuitSchoolCampaignReq` | ❌ WebSocket 消息，不是 HTTP 动作 |

另外 `EXIT_SCHOOL`（`User.exitSchool`）是"逐出师门"，带确认弹窗 `getText(6114)` + 两个按钮 `332/333`（index.js:77963-77978，已核）；它**不等于** `QUIT_SCHOOL`（退出门派）。上游把一个叫 `EXIT_SCHOOL`、一个叫 `QUIT_SCHOOL` 并列写进 12 个必做里，写码时极易搞反。

---

## 4. 每个新写动作的请求键 / 回包字段（写码直接照抄）

| H 的键 | 请求键（逐字） | 回包字段（逐字） | 客户端 eRet 分支要点 |
|---|---|---|---|
| `UseSnowBall` | `roleID, type` | `eRet, hp` | 1=成功→`setSnowManHp(hp)`；否则弹 1093 |
| `UseBatchSnowBall` | `roleID, type, batchType` | `eRet, hp` | 1=成功；**4=雪球不够**（弹 6126）；总是 `setBeastState(eRet)` |
| `UseAllBall` | `NONE`（`{}`） | `eRet, hp, rewardArray` | 1=成功→`addShowRewardUI1(o.rewardArray,0,{})`；否则 1093 |
| `getSnowAward` | `roleID` | `eRet, rewardArray` | 1=发奖；**4**/3/0/2 各弹不同文案 |
| `enterSnow` | `roleID` | `eRet, hp, boxnum, sTime` | 0/1/2/3 四条分支，见 W1 § |
| `rgUseItem` | `itemID, itemNum` + 条件项 `curHp,maxhpLimit,curMp,maxmpLimit,hpfinalValue,hg` | `eRet, note, rewardArray, getKnackIds, equipObj, **mpnum**, dogid, delItemObj` | 1=成功；2=无操作；4/5/6/8/10/11/13/15 各有文案；15 还带 `delItemObj` |
| `rgSycnWaitData` | `waitTr, curHp, curMp, maxhpLimit, hpfinalValue` | `eRet` | 1=成功→清 `waitPrecious` |
| `quitSchool` | `NONE`（`{}`） | `NONE`（回调空） | 无分支判断 |
| `BuyNpcFeel` | `npcid` | `eRet` | 1=加亲密度 10；2=弹 1100 |
| `clearGeSchoolClothing` | `school` | `eRet` | 1=弹 6001029；**5**=弹 9223 |
| `OutSchool` | `npcID` | `eRet, clearBoxs, npcID, textArr, rewardArray, oldSchool, npcIDArr, isSeniorSchool, CDTime, serverTime, skillId` | 1/5/6/7 四分支 |
| `useItemAddition` | `count` | `eRet, itemAddition` | 1=成功→`itemBreakAdditionNum += itemAddition` |
| `BackToLogin` | `account` | `NONE`（回调空） | 无 |
| `accountLogOff` | `NONE`（`{}`） | `eRet` | 1=成功→`MessageCenter.cleanup()` + `cc.game.restart()` |
| `CheckOnHook` | `NONE`（`{}`） | `eRet, OnhookObj` | 1=成功→存 `idleData` 并进挂机场景 |
| `recordPhone` | `phone` | `eRet` | 1/2/3/4 各弹不同文案 |
| `skillChange` | `roleID, skillA, skillB, skillType` | `eRet, changeCD, serverTime` | 1=成功；**4=缺道具 176**；14/16/17/18 各有 CD 分支 |

已在 §2 标「冒烟」的 10 个，回包字段也全部取证完毕（见 W3/W4/W5），冒烟勾选表直接按那些字段核。

---

## 5. 主审复跑验证记录（工人主张 → 我亲手核过的部分）

按家法「工人的报告是主张不是证据」，凡进入写码决策的列 100% 复跑：

| 复跑项 | 数量 | 结果 |
|---|---|---|
| 新写动作的 `sendSite` 行号 | 25 处 | **25/25 全中**（每行确实是那条 send） |
| 接收注册处行号 | 8 处 | 全中（含 70337/70343/70346/70349/70350/70356/70362 整块逐行核） |
| 请求键名（抽 §4 四类代表各一） | 5 个动作 | 全中：`UseSnowBall`={roleID,type} @122565、`useItemAddition`={count} @56851、`skillChange`={roleID,skillA,skillB,skillType} @119899、`rgSycnWaitData`={waitTr,curHp,curMp,maxhpLimit,hpfinalValue} @74022、`rgUseItem` 条件键 @74102-74108 |
| dispatch 取键规律 | 1 条 | `H[action]` + 日志 `'dispatch User.'+action` 证实键=线上名去前缀（§1） |
| `HttpConst` 线上名字面值 | 17 个 | 全中（`USE_SNOW_BALL` 另发现诱饵值） |
| 5 份报告文件字节数 | 5 份 | 与工人自报**完全一致**（5843/2253/5729/2821/9135） |
| 报告文件编码 | 5 份 | 纯 ASCII、0 个 U+FFFD、0 个中文字符 —— 无乱码 |
| 引用配置表存在性 | 19 张 | 18 中，1 缺（`role_level.json`，且工人**主动报缺**，非隐瞒） |

**抓到 1 条幻觉并已剔除**：W3 把 `getText(6114)` 的内容用拼音注释成「que ding yao tui chu men pai ma」。**它读不到这个字符串**（§3.2），该注释无依据。可核实的部分我保留了（`index.js:77963` 确实用 `getText(6114)` 做 EXIT_SCHOOL 的确认弹窗），文案内容一律标未确认。

---

## 6. 未确认清单

1. **`getText(...)` 全部文案内容** —— 文字表不在 dump 内，任何依赖文案的判断都做不了（影响 `quitSchool` 清不清贡献/技能、以及所有拒绝码选码时的"文案语义"）。
2. `quitSchool` 的**按钮到底在哪** —— `reqQuitSchool`(index.js:114049) 在 index/scripts2/scripts3 三个文件里**找不到任何静态调用方**，只能推断按钮绑在预制体或动态回调里。不阻塞写码（服务端只需认线上名）。
3. `role_level.json` 不存在 —— 等级表实际叫 `level.json`（333,645 B）。W5 报的 `level.json` 是对的，W4 报的 `role_level.json` 是错的。
4. `rgSycnWaitData` 的拼写 —— 客户端原文就是 `rgSycnWaitData`（Sycn 而非 Sync），**照抄错拼**，不要"修正"。

---

## 7. 开码前需要你拍板的两件事

### 7.1 `quitSchool` 清到什么程度（上游的判据不可用）

上游要求看文案定，但文案拿不到。三选一：

- **A（最保守，推荐）**：只清 `school` 字段；门派贡献、门派技能全保留。理由是客户端回调什么都不清，回包不承担清理语义，这样绝不会误删玩家资产。
- **B**：清 `school` + 门派贡献，保留门派技能。
- **C**：全清（等价于回到未入门派）。

### 7.2 范围口径

**已按上游 v2.4 拍板的 24 收敛**（15 主体 + 4 新写 + 5 已有），本文件表格已同步修正。
`RECORD_PHONE`、`BUY_NPC_FEEL`、`SWAP_SKILL_PROGRESS` 本批不做，取证已备好，冒烟时哪个面板卡住就直接捡回来补。
若后续还要扩回 27，`passObj`/`getBigGrowupData` 这两处取证缺口见 `_incoming\v2.4-20261025\06-算法v2.4-回执-20261025.txt` §三/§四。

---

## 8. 顺手记下的两个工具坑（下次别再踩）

1. **`bz-rpc-server.js` 是纯 LF 文件，`Get-Content` 行号会少算**：实测 `Get-Content | Measure-Object -Line` 得 **3168** 行，而 `read` 工具与 `Select-String` 都是 **3882** 行。**引行号一律用 `read` 或 `Select-String`，绝不要用 `Get-Content` 的数组下标**，否则会复现"我说 L3735 是 dispatch，Get-Content 却给空行"这种鬼。
2. **`index.js` 是 147367 行的巨型文件**：取证必须 `Select-String` 定位后只读窗口（`Select-Object -Skip N-9 -First 16`），整文件读入会炸上下文。
