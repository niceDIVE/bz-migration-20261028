# W4 报告：NpcToFuncType 入口映射表定位（2026-10-27）

## 结论先行

| 项 | 结论 | 证据 |
|---|---|---|
| T1 | NpcToFuncType 仅在 index.js（90 处）与 scripts3.js（1 处）出现；scripts2.js / main.js 均 0 处 | 下文 T1 全表 |
| T2 | 表定义 = index.js:87068 分发函数，switch 体 87068–87352 共 285 行；已逐字摘前 200 行（87068–87267） | 下文 T2 |
| T3 | 表体范围（87068–87640，含摘录段+处理器区延伸）`dog`（不分大小写）命中 **0** | pwsh 输出 TOTAL=0 |
| T4 | 3 个 cfg json（均单行压缩 JSON）`dog` 命中均 **0**；补充搜中文「狗」也均 **0** | pwsh 输出 DOGCOUNT=0 |
| T5 | index.js 中 `斗狗`=0、`赛狗`=0、`狗`=0（UTF-8 解码验证有效）；转义形式 \u72d7/\u6597\u72d7/\u8d5b\u72d7 也均 0 | pwsh 输出 COUNT=0、SANITY任务=3 |
| T6 | `enterDogPVEBattle` 在 scripts2.js / scripts3.js / main.js 均命中 **0** | grep "No matches found" |

## 未验证段
- index.js 表体 87268–87352（case 98/99/105/114/115/118/119/125/127/131/133/default）未逐字摘录（总 285 行超 200，按工单只摘前 200）；该区间已包含在 T3 的 87068–87640 dog 搜索内（0 命中），但中文/其他模式未在该区间单独搜。
- NpcToFuncType5–115 各处理器的函数体内容未摘录（工单只要求 T1 行号与 T2 表体）；主审线索"87500–87700 区"实测落在处理器定义区（NpcToFuncType70/71/72/74/75/77/78/80/81/85/89/97/98/99/114/115 位于 87538–87612），dog 狩猎 0 命中——处理器内部是否有其他 dog 线索未逐字核对，仅 T3 正则扫过（0）。
- scripts2.js / main.js 仅执行了 T1、T6 两个模式的搜索，未做其他模式搜索。
- 3 个 cfg json 仅做了 `dog`（工单）与中文「狗」（补充）两种模式搜索，未做其他模式。
- grep 工具不暴露退出码，以输出文本（"Found N matches"/"No matches found"）为准；pwsh 命令均无报错标记（退出码 0）。

## 范围外产出：无

## T3 表体范围 dog 狩猎（不分大小写）

命令原文：
```powershell
$src='F:\BaoZouyxt\tools\index.js'; $a = Get-Content $src -TotalCount 87640 | Select-Object -Skip 87067; $n=0; for($i=0;$i -lt $a.Count;$i++){ if($a[$i] -match '(?i)dog'){ $n++; "{0}: {1}" -f ($i+87068), $a[$i] } }; "TOTAL=$n"
```
退出码：0（无报错标记）。关键输出：`TOTAL=0`。
- 搜索范围：index.js 行 87068–87640（覆盖 T2 摘录段 87068–87267 + 处理器区 87353–87640）。
- 命中数：**0**。无命中行可列。

## T4 NPC 配置狩猎（3 个 cfg json，`dog` 不分大小写）

前置探测（命令原文）：
```powershell
foreach($f in @('F:\BaoZouyxt\tools\cfg\dump\mapNpcTalk.json','F:\BaoZouyxt\tools\cfg\dump\stealnpc.json','F:\BaoZouyxt\tools\cfg\dump\npc.json')){ if(Test-Path $f){ $len=(Get-Item $f).Length; $lc=(Get-Content $f | Measure-Object -Line).Lines; "$f EXISTS len=$len lines=$lc" } else { "$f MISSING" } }
```
关键输出：
```
F:\BaoZouyxt\tools\cfg\dump\mapNpcTalk.json EXISTS len=40490 lines=1
F:\BaoZouyxt\tools\cfg\dump\stealnpc.json EXISTS len=1655 lines=1
F:\BaoZouyxt\tools\cfg\dump\npc.json EXISTS len=2482548 lines=1
```
→ 三个文件均存在；均为**单行压缩 JSON**（lines=1），故"行号"一律为 1，命中原文以正则片段形式呈现。

搜索命令原文（UTF-8 显式解码）：
```powershell
foreach($f in @('...\mapNpcTalk.json','...\stealnpc.json','...\npc.json')){ $c = Get-Content $f -Raw -Encoding UTF8; $m = $c | Select-String -Pattern '(?i).{0,60}dog.{0,60}' -AllMatches; $mc = $m.Matches.Count; "FILE=$f DOGCOUNT=$mc"; $m.Matches | Select-Object -First 10 | ForEach-Object { "line1: " + ($_.Value -replace '\s+',' ') } }
```
退出码：0。关键输出：
```
FILE=F:\BaoZouyxt\tools\cfg\dump\mapNpcTalk.json DOGCOUNT=0
FILE=F:\BaoZouyxt\tools\cfg\dump\stealnpc.json DOGCOUNT=0
FILE=F:\BaoZouyxt\tools\cfg\dump\npc.json DOGCOUNT=0
```

| 文件 | dog 命中数 | 前 10 处 |
|---|---|---|
| mapNpcTalk.json | 0 | 无 |
| stealnpc.json | 0 | 无 |
| npc.json | 0 | 无 |

补充段（工单外模式，仅记录）：同法搜中文「狗」`.{0,40}狗.{0,40}`，三文件命中均 **0**（mapNpcTalk=0、stealnpc=0、npc=0）。

## T5 斗狗字面狩猎（index.js，三词分搜）

命令原文（UTF-8 显式解码逐行扫描，附编码验证与 sanity 对照）：
```powershell
$src='F:\BaoZouyxt\tools\index.js'; $lines = Get-Content $src -Encoding UTF8; $b=[int][char](Get-Content $src -Encoding Byte -TotalCount 3)[0]; "firstbyte=$b"; foreach($w in @('斗狗','赛狗','狗')){ $n=0; $shown=0; for($i=0;$i -lt $lines.Count;$i++){ if($lines[$i] -match [regex]::Escape($w)){ $n++; if($shown -lt 10){ $shown++; "{0}: {1}" -f ($i+1), $lines[$i] } } }; "WORD=$w COUNT=$n" }; $san=0; for($i=0;$i -lt $lines.Count;$i++){ if($lines[$i] -match '任务'){ $san++ } }; "SANITY任务=$san"
```
退出码：0。关键输出：
```
firstbyte=119
WORD=斗狗 COUNT=0
WORD=赛狗 COUNT=0
WORD=狗 COUNT=0
SANITY任务=3
```
- firstbyte=119（'w'）→ 文件无 BOM，已用 -Encoding UTF8 强制解码；sanity 词「任务」命中 3 行，证明中文匹配链路有效。
- 结论：`斗狗` 0 处、`赛狗` 0 处、`狗` 0 处（狗 为 斗狗/赛狗 的子串，连子串都为 0）。
- 补充段（工单外模式，仅记录）：JS 若以 \uXXXX 转义存中文，字面搜不到，故补搜转义形式 `\u72d7`(狗)、`\u6597\u72d7`(斗狗)、`\u8d5b\u72d7`(赛狗)（不分大小写）：命中均 **0**。

## T6 入口扇出（enterDogPVEBattle）

grep（区分大小写）逐文件结果：

| 文件 | 命中数 | 输出 |
|---|---|---|
| tools\scripts2.js | 0 | No matches found |
| tools\scripts3.js | 0 | No matches found |
| tools\main.js | 0 | No matches found |

预期"可能为 0"成立：三文件均 0 命中，无可摘行原文。

## T2 补充：表体后段行号索引（未逐字摘录部分，仅记位置）

- index.js:87268–87352：case 98（87270→NpcToFuncType98）、case 99（87274→NpcToFuncType99）、case 105（87278→PlantTreeModel.reqGetTreePlanting）、case 114（87286→NpcToFuncType114）、case 115（87290→NpcToFuncType115）、case 118/119（87294/87302→RogueModel）、case 125（87321→AnniversaryModel）、case 127（87329→HolidayActiveModel.reqPileData）、case 131（87333→StatueModel）、case 133（87341→CopyModelEx.reqGetNpcExInfo）、default（87349–87350→调用 r()）。


## 1. 计数

| 文件 | 命令 | 退出码 | 计数 |
|---|---|---|---|

---
[2026-10-27 W4 开工] 工单 T1–T6 执行中，边做边追加。工人：gemini-3.8-flash-low。

## T1 NpcToFuncType 命中统计（grep 区分大小写，工具：grep/ripgrep）

| 文件 | 命中数 |
|---|---|
| tools\index.js | 90 |
| tools\scripts2.js | 0 |
| tools\scripts3.js | 1 |
| tools\main.js | 0 |

### index.js 全部 90 处 路径:行号 + 行原文

```
tools\index.js:87068: NpcToFuncType: function(e, o, i, r, a) {
tools\index.js:87073: this.NpcToFuncType5(i, o, a, r);
tools\index.js:87077: this.NpcToFuncType6(o, r);
tools\index.js:87081: this.NpcToFuncType7(o, i);
tools\index.js:87085: this.NpcToFuncType8(o);
tools\index.js:87089: this.NpcToFuncType9(i);
tools\index.js:87093: this.NpcToFuncType10();
tools\index.js:87097: this.NpcToFuncType13();
tools\index.js:87101: this.NpcToFuncType14(i);
tools\index.js:87105: this.NpcToFuncType15(o);
tools\index.js:87109: this.NpcToFuncType16(o, a);
tools\index.js:87113: this.NpcToFuncType17();
tools\index.js:87117: this.NpcToFuncType18();
tools\index.js:87121: this.NpcToFuncType19(r);
tools\index.js:87125: this.NpcToFuncType21(r, o);
tools\index.js:87129: this.NpcToFuncType22(o);
tools\index.js:87133: this.NpcToFuncType23(o);
tools\index.js:87137: this.NpcToFuncType24(o);
tools\index.js:87141: this.NpcToFuncType29();
tools\index.js:87145: this.NpcToFuncType32(o);
tools\index.js:87152: this.NpcToFuncType39(o);
tools\index.js:87159: this.NpcToFuncType45();
tools\index.js:87163: this.NpcToFuncType16(o, a);
tools\index.js:87167: this.NpcToFuncType53(i);
tools\index.js:87171: this.NpcToFuncType56();
tools\index.js:87175: this.NpcToFuncType58(o);
tools\index.js:87179: this.NpcToFuncType60(o, a);
tools\index.js:87183: this.NpcToFuncType63();
tools\index.js:87187: this.NpcToFuncType64(o, r);
tools\index.js:87194: this.NpcToFuncType69(o);
tools\index.js:87198: this.NpcToFuncType71();
tools\index.js:87207: this.NpcToFuncType77();
tools\index.js:87215: this.NpcToFuncType80();
tools\index.js:87219: this.NpcToFuncType81(o);
tools\index.js:87231: this.NpcToFuncType85();
tools\index.js:87235: this.NpcToFuncType89();
tools\index.js:87267: this.NpcToFuncType97();
tools\index.js:87271: this.NpcToFuncType98();
tools\index.js:87275: this.NpcToFuncType99(o);
tools\index.js:87287: this.NpcToFuncType114();
tools\index.js:87291: this.NpcToFuncType115();
tools\index.js:87353: NpcToFuncType5: function(t, e, o, i) {
tools\index.js:87362: NpcToFuncType6: function(t, e) {
tools\index.js:87365: NpcToFuncType7: function(t, e) {
tools\index.js:87373: NpcToFuncType8: function(t) {
tools\index.js:87376: NpcToFuncType9: function(t) {
tools\index.js:87383: NpcToFuncType10: function() {
tools\index.js:87390: NpcToFuncType13: function() {
tools\index.js:87397: NpcToFuncType14: function(t) {
tools\index.js:87400: NpcToFuncType15: function(t) {
tools\index.js:87411: NpcToFuncType16: function(t, e) {
tools\index.js:87415: NpcToFuncType17: function() {
tools\index.js:87424: NpcToFuncType18: function() {
tools\index.js:87437: NpcToFuncType19: function(t) {
tools\index.js:87440: NpcToFuncType21: function(e, o) {
tools\index.js:87454: NpcToFuncType22: function(t) {
tools\index.js:87459: NpcToFuncType23: function(t) {
tools\index.js:87462: NpcToFuncType24: function(t) {
tools\index.js:87465: NpcToFuncType29: function() {
tools\index.js:87481: NpcToFuncType32: function(t) {
tools\index.js:87484: NpcToFuncType37: function() {},
tools\index.js:87485: NpcToFuncType39: function(t) {
tools\index.js:87503: NpcToFuncType44: function() {},
tools\index.js:87504: NpcToFuncType45: function() {
tools\index.js:87510: NpcToFuncType47: function() {},
tools\index.js:87511: NpcToFuncType53: function(t) {
tools\index.js:87514: NpcToFuncType56: function() {
tools\index.js:87517: NpcToFuncType58: function() {
tools\index.js:87520: NpcToFuncType60: function(t) {
tools\index.js:87524: NpcToFuncType63: function() {
tools\index.js:87527: NpcToFuncType64: function(t, e) {
tools\index.js:87530: NpcToFuncType65: function() {},
tools\index.js:87531: NpcToFuncType69: function(t) {
tools\index.js:87538: NpcToFuncType70: function() {},
tools\index.js:87539: NpcToFuncType71: function() {
tools\index.js:87546: NpcToFuncType72: function() {
tools\index.js:87553: NpcToFuncType74: function() {},
tools\index.js:87554: NpcToFuncType75: function() {},
tools\index.js:87555: NpcToFuncType77: function() {
tools\index.js:87562: NpcToFuncType78: function() {},
tools\index.js:87563: NpcToFuncType80: function() {
tools\index.js:87570: NpcToFuncType81: function(t) {
tools\index.js:87573: NpcToFuncType85: function() {
tools\index.js:87578: NpcToFuncType89: function() {
tools\index.js:87581: NpcToFuncType97: function() {
tools\index.js:87588: NpcToFuncType98: function() {
tools\index.js:87591: NpcToFuncType99: function(t) {
tools\index.js:87594: NpcToFuncType114: function() {
tools\index.js:87612: NpcToFuncType115: function() {
tools\index.js:89442: u.NPCManager.NpcToFuncType(t, this._npcID, this._npcData, this.openConvstCmp.bind(this), this.node);
```

### scripts3.js 命中原文

```
tools\scripts3.js:72273: 1 == this.tag ? u.RogueModel.onClickNpc() : 99 == this.tag || [ 16 ].includes(parseInt(e)) ? c.NPCManager.NpcToFuncType(e, this._npcID, this._npcData, this.openConvstCmp.bind(this), this.node) : this.openConvstCmp();
```

## T2 表体摘录（index.js NpcToFuncType 分发函数）

- 表定义位置：`tools\index.js:87068`（`NpcToFuncType: function(e, o, i, r, a) {`），switch 体至 `tools\index.js:87352` 结束（`},`）。
- 表体总行数：**285 行（87068–87352）**，超过 200 行 → 按工单摘**前 200 行（87068–87267）**逐字如下；余下 85 行（87268–87352，含 case 98/99/105/114/115/118/119/125/127/131/133/default）未逐字摘录。
- 另注（T1 命中定位，非表体）：各 case 处理器 `NpcToFuncType5`–`NpcToFuncType115` 定义于 `tools\index.js:87353`–87612 区。

```js
// tools/index.js 行 87068–87267（逐字摘录，前 200 行 / 共 285 行）
NpcToFuncType: function(e, o, i, r, a) {
void 0 === i && (i = {});
void 0 === a && (a = null);
switch (e) {
case 5:
this.NpcToFuncType5(i, o, a, r);
break;

case 6:
this.NpcToFuncType6(o, r);
break;

case 7:
this.NpcToFuncType7(o, i);
break;

case 8:
this.NpcToFuncType8(o);
break;

case 9:
this.NpcToFuncType9(i);
break;

case 10:
this.NpcToFuncType10();
break;

case 13:
this.NpcToFuncType13();
break;

case 14:
this.NpcToFuncType14(i);
break;

case 15:
this.NpcToFuncType15(o);
break;

case 16:
this.NpcToFuncType16(o, a);
break;

case 17:
this.NpcToFuncType17();
break;

case 18:
this.NpcToFuncType18();
break;

case 19:
this.NpcToFuncType19(r);
break;

case 21:
this.NpcToFuncType21(r, o);
break;

case 22:
this.NpcToFuncType22(o);
break;

case 23:
this.NpcToFuncType23(o);
break;

case 24:
this.NpcToFuncType24(o);
break;

case 29:
this.NpcToFuncType29();
break;

case 32:
this.NpcToFuncType32(o);
break;

case 37:
break;

case 39:
this.NpcToFuncType39(o);
break;

case 44:
break;

case 45:
this.NpcToFuncType45();
break;

case 47:
this.NpcToFuncType16(o, a);
break;

case 53:
this.NpcToFuncType53(i);
break;

case 56:
this.NpcToFuncType56();
break;

case 58:
this.NpcToFuncType58(o);
break;

case 60:
this.NpcToFuncType60(o, a);
break;

case 63:
this.NpcToFuncType63();
break;

case 64:
this.NpcToFuncType64(o, r);
break;

case 65:
break;

case 69:
this.NpcToFuncType69(o);
break;

case 71:
this.NpcToFuncType71();
break;

case 72:
case 74:
case 75:
break;

case 77:
this.NpcToFuncType77();
break;

case 78:
w.ActiveModel.reqNationalCopy(i);
break;

case 80:
this.NpcToFuncType80();
break;

case 81:
this.NpcToFuncType81(o);
break;

case 82:
Promise.resolve().then(function() {
return t("../../../scripts3/model3/MonopoModel");
}).then(function(t) {
t.MonopoModel.reqGetAllExchangeData(!1);
});
break;

case 85:
this.NpcToFuncType85();
break;

case 89:
this.NpcToFuncType89();
break;

case 90:
l.default.prefabs.load("menpai/SquareSeat", cc.Prefab, function(t, e) {
var i = cc.instantiate(e);
f.PopUpMgr.addPopUp(i, k.LayerMgr.roleControlLayer, f.Modal.Transparent);
var n = i.addComponent("SquareSeat");
n.setData({
npcID: o
});
n.getRoleControlPos(a);
});
break;

case 92:
Promise.resolve().then(function() {
return t("../../models/CopyTeamModel");
}).then(function(t) {
t.CopyTeamModel.reqGetDragon();
});
break;

case 93:
l.default.prefabs.load("duchang/duchang1", cc.Prefab, function(t, e) {
var o = cc.instantiate(e);
f.PopUpMgr.addPopUp(o, k.LayerMgr.popUpLayer);
o.addComponent("GamblingIsland");
});
break;

case 97:
this.NpcToFuncType97();
break;
```
