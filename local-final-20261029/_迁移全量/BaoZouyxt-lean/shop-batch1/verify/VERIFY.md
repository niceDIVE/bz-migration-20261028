# VERIFY.md — 第 1 批「商店交易」只读验收（V1–V6）

- 执行者：只读验收工人（无证据不写，全部命令实跑、输出实贴）
- 日期：2026-10-24
- 产物目录：`F:\BaoZouyxt\shop-batch1\verify\`（本文件 + analyze.js + build-run1.txt + build-run2.txt）
- 环境事实：Windows PowerShell 5.1 + node v24.12.0；全程未发生 spawn EPERM；除 verify 目录外未创建/修改/删除/移动任何文件；未 git、未联网、未动设备。

---

## V1. 复跑验收

命令（cwd=`F:\BaoZouyxt`）：
```
node tools\acceptance.js
```
退出码：**0**

关键输出（末行摘要 + 关键行）：
```
验收开始：项=38（hotfix-patch/test/*.js + 3 个验收器；不跑 build-handlers.js）
登记表：tools/golden/known-red.json 条目=0  cap=0（tools/golden/known-red-cap.json）
（38 行 PASS 全绿：35 个 test/*.js + tools/check_shape_freeze.js / tools/check_reject_codes.js / tools/check_exchange_currency.js，全部 exit=0）
PASS K-cap 条目=0 ≤ cap=0
PASS K-cap 未扩容（历史最低 cap=0 → 本次 0）
PASS G3 无滞留条目（history 行=20，最长连续=0）
PASS G5 未扩容（cap 0 → 0），无需 guardHash 复核
ACCEPTANCE OK 项=38 绿=38 已知红=0 cap=0
```

结论一行：**复跑退出码 0，末行 `ACCEPTANCE OK 项=38 绿=38 已知红=0 cap=0`，与主审所报 38/38 一致。**

## V2. 键位核对

命令（机械抽取脚本，只读）：
```
node F:\BaoZouyxt\shop-batch1\verify\analyze.js
```
退出码：**0**（脚本源码：`shop-batch1\verify\analyze.js`，输出为纯 JSON）

- `var H = {` 位置：`hotfix-patch\core\bz-rpc-server.js:1060`（grep 工具独立确认，全文件唯一 1 处）。
- 顶层条目 **97 个，全部为 `function` 键**（`totalEntries=97, totalFunctionKeys=97, nonFunctionEntries=[]`）。
- 重复键：**无**（`dupKeys=[]`）。
- 10 个新键各**恰好出现 1 次**（occurrences=1），行号经 grep 工具（模式 `^\s*KEY\s*:\s*function`，15 处命中逐一比对）与 read 工具（:2705-2707 抽样）独立复核一致：

| H 键 | 行号 |
|---|---|
| buyFormula | core\bz-rpc-server.js:2706 |
| getInnShop | core\bz-rpc-server.js:2727 |
| getInnRank | core\bz-rpc-server.js:2737 |
| innBuyShop | core\bz-rpc-server.js:2747 |
| buySchoolShop | core\bz-rpc-server.js:2789 |
| BuyMarketItem | core\bz-rpc-server.js:2825 |
| BuyMount | core\bz-rpc-server.js:2875 |
| buyEjectGift | core\bz-rpc-server.js:2911 |
| upFashionFaceState | core\bz-rpc-server.js:2956 |
| fashionEffect | core\bz-rpc-server.js:2969 |

registry（`audit-v23\incoming\unpacked\bz-oracle\out\registry.json`，结构 `rows` 数组）十个 KEY 的 `action` 去掉 `User.` 前缀后与 H 键**逐一相同且 inH=1**：

| registry KEY | registry.json:行号 | action | 去 User. 后 | H 行号 |
|---|---|---|---|---|
| BUY_FORMULA_DATA | registry.json:14014 | User.buyFormula | buyFormula | 2706 |
| GET_INN_SHOP | registry.json:9436 | User.getInnShop | getInnShop | 2727 |
| GET_INN_RANK | registry.json:9422 | User.getInnRank | getInnRank | 2737 |
| INN_BUY_SHOP | registry.json:9450 | User.innBuyShop | innBuyShop | 2747 |
| BUY_SCHOOL_SHOP | registry.json:7938 | User.buySchoolShop | buySchoolShop | 2789 |
| BUY_MARKET_ITEM | registry.json:406 | User.BuyMarketItem | BuyMarketItem | 2825 |
| BUY_MOUNT | registry.json:3346 | User.BuyMount | BuyMount | 2875 |
| REQ_BUY_GIFT | registry.json:11368 | User.buyEjectGift | buyEjectGift | 2911 |
| SET_YP_EFFECT_STATE | registry.json:15750 | User.upFashionFaceState | upFashionFaceState | 2956 |
| FASHION_EFFECT | registry.json:15218 | User.fashionEffect | fashionEffect | 2969 |

结论一行：**var H 共 97 个一级 function 键、无重复；10 个新键各恰 1 次；registry 十个 KEY 去 `User.` 前缀后与 H 键逐一相同。**

## V3. 登记一致性

命令：同 V2 的 `node F:\BaoZouyxt\shop-batch1\verify\analyze.js`（退出码 0）。

- server 侧 `var REJECT_CODES = {` 位于 `hotfix-patch\core\bz-rpc-server.js:98-124`，**23 键**（括注 server 行号）：
  useItem(99) BeginTraining(100) BuyFashion(101) buyShopItem(102) buySpecialShopItem(103) BuyAcitivityShop(104) exchangeItem(105) buyGoodAndEvilShopItem(106) rgShopByItem(107) QuickBuyItem(108) washAdditionalArr(109) isCycleLife(110) cycleLife(111) specialCycleLife(112) WashMedicine(113) FindFriendByID(114) buyFormula(116) innBuyShop(117) buySchoolShop(118) BuyMarketItem(119) BuyMount(120) buyEjectGift(121) upgradeSkill(123)
- `tools\facts\reject-codes.json` 顶层 **23 键**，键清单（JSON 内顺序）：
  useItem, BeginTraining, BuyFashion, buyShopItem, buySpecialShopItem, BuyAcitivityShop, exchangeItem, buyGoodAndEvilShopItem, rgShopByItem, QuickBuyItem, washAdditionalArr, isCycleLife, cycleLife, specialCycleLife, WashMedicine, FindFriendByID, buyFormula, innBuyShop, buySchoolShop, BuyMarketItem, BuyMount, buyEjectGift, upgradeSkill
- **键集合两边相同**（23=23，逐键对应，无多无少）。
- 7 个新动作 default 值两边对照（json 侧字段名为 `defaultCode`）：

| 动作 | server default（bz-rpc-server.js:行号） | json defaultCode | 相同? |
|---|---|---|---|
| buyFormula | 2 (:116) | 2 | 是 |
| innBuyShop | 6 (:117) | 6 | 是 |
| buySchoolShop | 4 (:118) | 4 | 是 |
| BuyMarketItem | 4 (:119) | 4 | 是 |
| BuyMount | 3 (:120) | 3 | 是 |
| buyEjectGift | 2 (:121) | 2 | 是 |
| upgradeSkill | 4 (:123) | 4 | 是 |

命令：
```
node tools\check_reject_codes.js
```
退出码：**0**，最后两行：
```
R5 未实现（下一批：动作×原因夹具 + 磁盘/业务双哈希）
REJECT-CODES OK 动作=23 条目=25 拒绝点=44 处 flow=1 条
```

结论一行：**reject-codes.json 与 server REJECT_CODES 键集合一致（各 23 键）；7 个新动作 default 两边逐一相同（2/6/4/4/3/2/4）；checker 退出码 0 报 OK。**

## V4. 构建确定性

命令（cwd=`F:\BaoZouyxt`，连续跑两次）：
```
node hotfix-patch\build-handlers.js
```
两次退出码均 **0**。关键行：

- 第 1 次：`HANDLERS OK  ver=h393343d8  selfCheck=1248  bytes=1085063  -> patch/live/handlers.js`
- 第 2 次：`HANDLERS OK  ver=h393343d8  selfCheck=1248  bytes=1085063  -> patch/live/handlers.js`

两行**完全相同**（ver=`h393343d8`，selfCheck=`1248`）。两份完整输出留档 `shop-batch1\verify\build-run1.txt` / `build-run2.txt`，SHA256 均为 `2A7D346C87E422E762B1B79670424A2626513DCC76F3793F02F68BDCEF250178`，`identical=True`。

结论一行：**连续两次构建的 HANDLERS OK 行逐字相同（ver=h393343d8，selfCheck=1248），输出日志哈希一致。**

## V5. 16 个「已有」动作存在性抽查

命令：同 V2 的 analyze.js + grep 工具（模式 `^\s*(QuickBuyItem|equipWeapon|washAdditionalArr|sycnPlayerItemData|getGoodAndEvilShopData)\s*:\s*function`，5 处命中）。4 个目标均在 `var H` 找到（满足工单「handler 或形状二选一」，未再查 shapes）：

| registry 映射 | 命中文件:行号 |
|---|---|
| QUICK_BUY(User.QuickBuyItem) → H 键 QuickBuyItem | hotfix-patch\core\bz-rpc-server.js:3030 |
| PUT_ON_EQUIPMENT(User.equipWeapon) → H 键 equipWeapon | hotfix-patch\core\bz-rpc-server.js:3076 |
| WASH_ADDITION(User.washAdditionalArr) → H 键 washAdditionalArr | hotfix-patch\core\bz-rpc-server.js:2021 |
| SYCNPLAYERITEAMDATA(User.sycnPlayerItemData) → H 键 sycnPlayerItemData | hotfix-patch\core\bz-rpc-server.js:2130 |

防重复键：`getGoodAndEvilShopData` 在 `var H` 内**恰好出现 1 次**（occurrences=1；grep 同模式仅 1 处命中：`core\bz-rpc-server.js:2645`；read 工具 :2644-2646 复核）。

结论一行：**4 个抽查键全部在 var H 找到（:3030/:3076/:2021/:2130）；getGoodAndEvilShopData 在 var H 恰 1 次（:2645），无重复键。**

## V6. bundle 抽查

对象：`hotfix-patch\patch\live\handlers.js`（V4 构建后状态，1,085,063 字节，4443 行）。grep 工具命中：

- `'buyFormula'` 首次命中：**行 424**（`var BZ_CATCH_CODES = {...}` 行内；handler 定义体在 :3133 `buyFormula: function (p) {`）
- `'BuyMount'` 首次命中：**行 26**（BZ_SHAPES 形状 JSON 行内 `"BuyMount": {"eRet":1,"sync":0,"type":-1}`；handler 定义体在 :3302 `BuyMount: function (p) {`）
- `'BZ_INNSHOP'` 首次命中：**行 410**（`var BZ_INNSHOP = {"1":{...}...};`客栈货架表，:411 `BZ_INNSHOP.__meta = { shelves: 8 };`）

文件头注释（read 工具 :1-5 原文）：
```
1: /* handlers bundle  ver=h393343d8  built=2026-10-24T12:22:10.865Z
5: var IMPL_VERSION = "h393343d8";
```
→ **ver=`h393343d8`**，与 V4 两次构建报出的 ver 一致。

结论一行：**bundle 内 buyFormula/BuyMount/BZ_INNSHOP 均存在（首中 :424/:26/:410），头注释 ver=h393343d8 与构建输出一致。**

---

## 未能确认 / 存疑（如实记录）

1. **未发生 spawn EPERM**：全程 node 子进程命令均正常执行，无沙箱边界报错。
2. **函数体逻辑未核**：V2/V5 只核键名、次数与行号，10 个新 handler 与 4 个已有 handler 的业务实现未逐行审读（工单未要求）。
3. **reject-codes.json 非 default 字段未对照**：仅按工单核对 default 值；json 侧 success/handled/codes 等数组与 server 侧行为未逐条比对。
4. **gen_shop_tables.js 与 bz-shops.generated.js 未抽查**：工单 6 件事未包含，未复跑生成器、未审该表内容。
5. **一次 PS 5.1 抽查命令输出异常（已用其他工具定讧行号）**：`Get-Content -TotalCount` 按行号取样时输出内容与文件实际行不符（疑似 PS 5.1 对 LF-only、无 BOM UTF-8 文件的读取问题；文件实测 `LF=3432 CRLF=0 loneCR=0`）。行号最终以 grep 工具 + read 工具两个独立来源一致确认为准，未采信该次 Get-Content 输出。
6. **执行顺序**：V1 验收先于 V4 两次构建执行；构建为确定性重复输出（ver 未变 h393343d8），故构建后未再重跑 acceptance。
7. **路径偏差（事实记录，非判断）**：工单所写 `core/bz-shops.generated.js`、`core/bz-shapes.generated.js` 在 `F:\BaoZouyxt\core\` 下不存在（`Get-Item` 报「找不到路径」，退出码 1）；实际存在于 `F:\BaoZouyxt\hotfix-patch\core\` 下。本单 V2/V3/V6 所用路径均为实测存在路径。
