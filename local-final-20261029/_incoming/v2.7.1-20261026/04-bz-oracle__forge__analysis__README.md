# 动作关联分析（只管排序和归型，不设闸门）

    python forge/analysis/extract_rw.py bz-rpc-server.js bz-handler-impl.js live/flow.js > rw.json
    python forge/analysis/relate.py --rw rw.json --min-edge 0.9

依赖：networkx。文件统一按 utf-8 读写，不用再设 PYTHONUTF8。
产出：
- out/relations.md：按批次排好的簇，每簇标出所属家族、可信度和共享依据
- out/relations.json：每个动作最相关的 6 个邻居

v2 改动（依据第 1 轮回执）：
- extract_rw 支持 `var H = {裸动作名: function}` 这种分派表写法，会自动补上 User. 前缀；同文件里的 helper 内联两层；字面量兜底的分段上限设为 3000 字符
- rw 权重按"有多少动作碰过这个键"做 IDF：写-写算满分，写-读打 0.6 折，读-读不计。bag、coins 这类枢纽键会自动降权
- 成对规则同时检查 KEY 和协议名（SELL_ITEM 对应 User.saleItem）
- 词干归一（ACHIEVEMENT 归到 ACHIEVE，DAYS 归到 DAY）；剔除泛字段 lv/hp/exp/endTime 等和泛词 UPGRADE/LEVEL 等
- 新增 config/relate-families.json，这是唯一需要人改的地方：
  - families：已知属于同一玩法的动作。同家族互相加边；跨家族的弱连接打 0.25 折
  - links：已知的联动。只影响批次先后，不会把两簇并成一簇
  - notes：附在动作旁边的提醒，比如"做不了结算"
- 每簇标可信度。"弱"表示主要靠名字相似，标签不能当成共享契约

v2.2（第 1 批回执后）：
- relate.py 依赖 out/registry.json 和 out/contracts.json，这两个文件都在 bz-oracle v2.3 自带的 out/ 目录里。
  只解压分析包是跑不起来的，得合并进 v2.3 的目录再跑。
- 新增 extract_panel.py：按 cc._RF.push 切出客户端脚本区间，给每个动作标上它所在的面板。
  relate.py --panel panel.json 会把孤立动作挂到同面板的批次下面，作为「顺手做」。
  这一步只做附带，不进图，不影响分簇。动作数超过 panelCap（默认 12）的脚本视为网络层，不算面板。
- 为什么不用"行号挨得近"：我在本地试过，客户端有集中注册块，挨得近的东西会被乱拉到一起，C01 一下子膨胀到 72 个，所以弃用了。

v2.3（第 1 批算法意见后，2026-10-25）：
- **这个包自带 out/registry.json、out/contracts.json、out/rw.final.json，解压后就能跑**，不用再合并进 v2.3 目录。
- 一键顺序（在 bz-oracle 目录下）：

      python forge/analysis/extract_panel.py index.js scripts2.js scripts3.js > out/panel.json
      python forge/analysis/extract_shape.py index.js scripts2.js scripts3.js
      python forge/analysis/table_link.py --dump tools/cfg/dump --server bz-rpc-server.js
      python forge/analysis/relate.py --rw out/rw.final.json --min-edge 0.9 --panel out/panel.json --tables out/table-links.json

  extract_panel、extract_shape 需要客户端三包；table_link 需要 dump 目录。缺了哪个就跳过那一步，relate 照常出结果。
- 问题 1（面板）：extract_panel v2 除了回调注册点，还认两条路：客户端任何地方出现 HttpConst.KEY（发请求的面板），
  以及回调里 dispatch 的事件被谁监听（GET_MARKETLIST → STORE_SHOW_UI → 商店面板）。被 6 个以上动作派发的事件
  （余额变化之类）算枢纽事件，不用来认面板。relate 把孤立动作挂到同面板的批次：拉数据的标「同面板必做」，
  其余标「顺手做」；已经在别批的同面板动作列在「同面板另见」。
- 问题 2、3（字段形状、能否兜底）：新增 extract_shape.py，顺着 dispatch → 监听 → 处理函数找字段的最终用法，
  产出 out/shape-hints.md：不能用 0 兜底的字段（被 for..in、下标、.length 用的），以及不能安全兜底的动作
  （缺字段会崩，或者数据空会重发请求）。纯正则启发式，结论都是【推断】，落点给出了文件和行号，方便复核。
- 问题 4（配置表）：新增 table_link.py，按表名和列名给每个动作猜候选表；再列出服务端看起来还没读过的表
  （表名和 BZ_ 注入常量都对不上的）。只是为了少翻表，具体数额仍以表里的值为准。
- 问题 5（可达性）：relate 给每个动作标可达性：客户端会发请求的标「可达」；只有回调没有发送点的标「客户端不发」；
  候选表全部过期的标「可能已下线」。可达性存疑的动作在各批末尾列出，可以放到最后再做。
- 问题 6（do 名）：新增 out/actions.tsv，列出 KEY、do 名、常量定义行、批次、可达性、面板、候选表。核对时一律以 do 名为准。
- 分错簇（意见 B）：config 新增 5 个家族：侠客令、周年通行证、周年肉鸽、善恶、轮回。
- **pinned**：已经发出去的批次（第 1 批 C01、第 2 批 C05）冻结了成员。改家族配置不会把已发的批次打乱；第 3 批 C02 的 19 个成员也没变。
  加了家族之后，边数从 901 变成 940，孤立动作从 370 变成 362，簇数仍是 76。

## v2.4 小修（2026-10-25）
- relate「同面板必做」只给名字像拉数据的动作（KEY 含 GET/LIST/DATA/CHECK…，或 do 名 get*/load*/*Data/*List/*Info）；v2.3 把不写档也算进去，142/143 全成必做。
- relate 读 json 自动识别 UTF-16/BOM。Windows 下仍建议：`cmd /c "python extract_panel.py ... > out\panel.json"`，PowerShell 的 `>` 会写成 UTF-16。
- extract_shape：跨行 dispatch；`X.prototype.f = function` 方法；`this.xxx = o.field` 在整个脚本区间追用法；字段名够特别时全局按 `.field` 兜底并追一跳别名；`arr[t]` 变量下标算崩；for..in 不算崩；重发请求的调用方跨文件找。
- `--trace User.GetMarketList.market`：把追踪路径打到 stderr，漏报时交回这几行。

## v2.5 小修（2026-10-25）
- 契约 fields 为空（命名处理器没展开 / 内联但 0 读）时，extract_shape 自己展开回调，抽 data 参数的 .字段（标「补抽」）。PASS_CARD_DATA、GET_BIG_GROWUP_DATA 这类之前直接被跳过。
- 全局字段兜底改为按需扫（补抽出来的字段也能走），并多追一跳传参：fn(this.data.X) → 被调函数第 1 个形参怎么用。
- --trace 现在也打「契约字段 / 补抽结果 / 发送点 / 重发判定」，字段为空时不再一行都没有。
- 已知够不到：整包转手（this.data = e 之后在别处读 this.data.X）。这类靠人工登记（approved-widening.json）。

## v2.6 小修（2026-10-25）
- 补抽找处理器定义更稳：funcs 查不到时在本文件按 `.名 = function` / `名: function` / `名(…){` 再找一遍；找不到就打 trace 说明，不再退回"site 下面几行随便哪个 function"（getBigGrowupData 抽出 'prototype' 就是这么来的）。
- 函数体按花括号配平取结尾；字段名过滤 prototype/call/apply/bind/constructor。
- 函数定义识别排除 if/for/while/switch/catch（之前 `if (...) {` 会被当成函数名 "if"）。
- 重发判定：发送行不再要求含 send/req 字样（只排除纯 .on 注册行，且判断时去掉 HttpConst 本身的 "Http"）；判空窗口 4→6 行；调用行本身是条件短路（`1 == t && X.reqXxx()`）也算。
- --trace 增加：补抽展开范围/失败原因、每个发送点所在函数和调用方、每个调用方判空与否。

## v2.7（2026-10-25）重发判定收紧
- v2.6 在真客户端上 actions 235→649、unsafe 625。字段多出来属实（补抽生效，container 113→208），unsafe 几乎全是重发判定误报：裸 else、!this. 在 6 行窗口里到处都有。
- 发送行改成只认真正的发送调用（`.sendRequest(`、send*/request*/post*( 等）。v2.5 其实漏掉了 `NetMgr.http.sendRequest(` 这种写法，所以 v2.5 的数也不是基准。
- 判空只认几种：`.length` 和 0 比较、和 null/undefined 比较、`!x &&`/`!x)`、`Object.keys().length`。窗口 4 行。调用行上的短路只认 `数字 == x &&`、`x == 数字 &&`、`!x &&` 紧挨着调用的写法。
- 补抽字段过滤 eRet。stdout 新增 unsafeByCrash、unsafeByRetry 两项，分开计数。
- 调用方的 trace 全部打出来（之前命中一个就 break，后面的调用方看不到）。

## v2.7.1
- `.length > 0`、`!= 0` 是判非空，不是判空，不再计入（scripts2.js:26756 就是这么被误判的）。现在只认 `== 0`、`<= 0`、`< 1`。
- 同一个发送点的每个调用方都单独记一条重发判定（之前每个发送点只记第一个调用方，所以 46175 被吞掉了）。
- unsafe 是 crash 和 retry 两类的并集，一个动作可以两类都占。所以 unsafeByCrash + unsafeByRetry ≥ unsafe，差值就是两类重叠的数量。
