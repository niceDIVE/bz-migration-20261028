# scoutB 表摘录报告（工单：marry/wed/propose/bridal/child/wife/girl/whore/sex/foster/love/make）

数据源：F:\BaoZouyxt\tools\cfg\dump\（444 个 .json，其中 1 个为 _index.json，443 个为表文件）
方法：PowerShell `Get-ChildItem -Filter *.json` + `$_.Name.ToLower().Contains(关键词)` 列文件名命中（大小写不敏感）；node（stdin 传脚本，只读 `fs.readFileSync` + `JSON.parse`）逐表实读。
只摘录，不判断。

## 一、文件名命中清单

node 命令要点：`fs.readdirSync(dump目录)` 过滤 .json，对每个文件名 `toLowerCase()` 后做 12 个关键词子串匹配。

| 文件名 | 命中关键词 |
|---|---|
| bridalline.json | bridal |
| make.json | make |
| propose.json | wed 无命中；marry、propose、bridal、child、wife、girl、whore、sex、foster、love、make 命中情况见下行 |

更正上表（按 12 个关键词逐一对 3 个文件名核对）：

| 文件名 | 命中关键词（逐词核对结果） |
|---|---|
| bridalline.json | bridal（其余 11 词不含） |
| make.json | make（其余 11 词不含） |
| propose.json | propose（其余 11 词不含；"wed" 是 "wedding" 类词根，propose.json 文件名不含 wed） |

12 个关键词的文件名命中统计（Get-ChildItem 原始输出）：

```
marry: 0   wed: 0   propose: 1   bridal: 1   child: 0   wife: 0
girl: 0    whore: 0 sex: 0       foster: 0   love: 0   make: 1
命中文件：bridalline.json, make.json, propose.json
（命令：Get-ChildItem 'F:\BaoZouyxt\tools\cfg\dump' -File -Filter '*.json' | Where-Object { $n=$_.Name.ToLower(); ($kw | Where-Object { $n.Contains($_) }).Count -gt 0 } ；退出码 0）
```

### _index.json 检索结果

node 命令要点：`fs.readFileSync('_index.json')` 取原始文本，逐关键词 `new RegExp('"name":"[^"]*KEY[^"]*"', 'gi')` 匹配。

- `_index.json` 顶层字段：`ok, dicCount, tables, totalBytes, truncated, index`；`index` 共 442 条，每条字段仅 `name, rows, bytes, truncated`。
- `_index.json` 全文无 `desc / comment / note` 字段（计数均为 0；`"title"` 仅出现 1 次且是表名 `{"name":"title","rows":14,...}`）。
- 故「描述含关键词」在 `_index.json` 中无描述字段可查，未能验证；改为对 `_index.json` 中全部 442 个表名做关键词匹配，结果与文件名命中一致：
  - `"name":"bridalline"`（bridal）、`"name":"propose"`（propose）、`"name":"make"`（make）
  - 其余 9 个关键词在 442 个表名中命中 0 条。

### 目录与索引数量核对（机械核对，确认关键词扫描无遗漏对象）

node 命令要点：`fs.readdirSync` 表文件数 vs `JSON.parse(_index.json).index.length`，双向求差集。

- 表文件：443 个；`_index.json` 条目：442 条。
- 有文件无索引：item.full.json（1 个）。
- 有索引无文件：无。
- item.full.json 文件名不含 12 个关键词，不进逐表摘录；仅记录位置（见「范围外产出」）。

## 二、逐表摘录

node 命令要点（三表同一段脚本）：`JSON.parse(fs.readFileSync('F:/BaoZouyxt/tools/cfg/dump/<表名>.json','utf8'))`；取顶层 `name/rows/cols/data`；`data` 为单元素数组时取 `data[0]` 为行字典，行键=`Object.keys(data[0])`；奖励/货币列=列名匹配 `/award|reward|money|gold|coin|item|price/i` 取前 3 行原值；id 相符列=把每格值 `String()` 后比对集合 {1,2,3,4,5,4001,4002,4003,8888}，数组值逐元素展开计数。

### ## 表名（rows=9）  文件名: bridalline.json

- cols: ["Menpai","Road","Guest","Robber"]
- 行键样例: ["1","2","3","4","5"]（共 9 个键）
- 首行: {"Menpai":1,"Road":"455,2270|525,1780|525,1290|875,1360|1365,1500|1645,1500|1925,1360","Guest":"1365,1500,2|525,1290,3","Robber":"525,1780|875,1360|1645,1500"}
- 第二行(键 2): {"Menpai":2,"Road":"1365,1500|1575,1010|1925,310|1435,240|3185,310|2765,310|3185,940|2765,1360","Guest":"1925,310,4|3185,310,7","Robber":"1575,1010|1435,240|2765,310"}
- 奖励/货币类列样例: 无列名命中（关键词 award/reward/money/gold/coin/item/price）
- 与物品id/货币id取值(1..5,4001,4002,4003,8888)相符的列:
    - Menpai -> 1(出现1行), 2(出现1行), 3(出现1行), 4(出现1行), 5(出现1行)

### ## 表名（rows=5）  文件名: make.json

- cols: ["id","down","up","picture","describe","hunger","full","feeling","experience","judge","happiness","picture_lover","describe_lover","experience_lover","judge_lover"]
- 行键样例: ["1","2","3","4","5"]（共 5 个键）
- 首行: {"id":1,"down":0,"up":5,"picture":"piaoji1","describe":1410001,"hunger":10000,"full":10,"feeling":-4,"experience":1410006,"judge":1410011,"happiness":-2,"picture_lover":"fuqi1","describe_lover":[1430031,1430034],"experience_lover":[1430037,1430040],"judge_lover":[1430043,1430046]}
- 第二行(键 2): {"id":2,"down":5,"up":8,"picture":"piaoji1","describe":1410002,"hunger":5000,"full":5,"feeling":-2,"experience":1410007,"judge":1410012,"happiness":0,"picture_lover":"fuqi1","describe_lover":[1430031,1430034],"experience_lover":[1430037,1430040],"judge_lover":[1430043,1430046]}
- 奖励/货币类列样例: 无列名命中（关键词 award/reward/money/gold/coin/item/price）
- 与物品id/货币id取值(1..5,4001,4002,4003,8888)相符的列（出现行数按 String 值相等的格计）:
    - id -> 1(出现1行), 2(出现1行), 3(出现1行), 4(出现1行), 5(出现1行)
    - down -> 5(出现1行)
    - up -> 5(出现1行)
    - full -> 5(出现1行)
    - feeling -> 1(出现1行), 2(出现1行), 4(出现1行)
    - happiness -> 5(出现1行)

### ## 表名（rows=36）  文件名: propose.json

- cols: ["Npcid","Pre_Taskid","Require","Description","Menpai","require1","dialog1","require2","dialog2","non_require_dialog","sexsuccess","gengu","relative","beforeborn","afterborn","married_model","married_name","physique","sexsuccess1","sexsuccess2","sexsuccess3","sexsuccess4","hair","shop","chuangong","chat","buy","notbuy","NPC_message","NPC_info"]
- 行键样例: ["1007","1011","1017","1019","1037"]（共 36 个键）
- 首行(键 1007): {"Npcid":1007,"Pre_Taskid":400850,"Require":"1,4008,1","Description":470110,"Menpai":9,"require1":"0","dialog1":209,"require2":"0","dialog2":210,"non_require_dialog":[470111,470112,470113,470114],"sexsuccess":10,"gengu":10,"relative":[],"beforeborn":1800013,"afterborn":1800014,"married_model":1007,"married_name":20007,"physique":0,"sexsuccess1":10,"sexsuccess2":30,"sexsuccess3":40,"sexsuccess4":50,"hair":0,"shop":1810012,"chuangong":1810006,"chat":[3917,3918,3919,3920,3921,3922,3923],"buy":1810036,"notbuy":1810060,"NPC_message":4852,"NPC_info":7250}
- 第二行(键 1011): {"Npcid":1011,"Pre_Taskid":400970,"Require":"1,4052,1","Description":470120,"Menpai":9,"require1":"0","dialog1":209,"require2":"0","dialog2":210,"non_require_dialog":[470121,470122,470123,470124],"sexsuccess":20,"gengu":18,"relative":[],"beforeborn":1800009,"afterborn":1800010,"married_model":1011,"married_name":20011,"physique":1,"sexsuccess1":20,"sexsuccess2":30,"sexsuccess3":40,"sexsuccess4":50,"hair":0,"shop":1810010,"chuangong":1810006,"chat":[3917,3918,3919,3920,3921,3922,3923],"buy":1810034,"notbuy":1810058,"NPC_message":4850,"NPC_info":7248}
- 奖励/货币类列样例: 无列名命中（关键词 award/reward/money/gold/coin/item/price）
- 与物品id/货币id取值(1..5,4001,4002,4003,8888)相符的列（出现行数按 String 值相等的格计）:
    - Menpai -> 1(出现2行), 3(出现2行), 4(出现2行), 5(出现2行)
    - physique -> 1(出现11行)
    - hair -> 1(出现16行)

## 未能验证

1. 「_index.json 里描述含上述关键词的表」：`_index.json` 的 index 条目只有 `name, rows, bytes, truncated` 四个字段，全文无 desc/comment/note 描述字段，工单该项没有可检索的描述文本，未能验证。已做的替代动作：对 442 个表名原文做了 12 关键词匹配（结果见「一」）。
2. 表文件顶层除 `name, rows, cols, data` 外是否还有其它字段：三张命中表顶层键实测均为 `["name","rows","cols","data"]`（node `Object.keys` 输出），未见其它字段；此结论仅覆盖这 3 张表，未抽验其余 440 张。
3. `dicCount=454` 与 `index` 442 条、目录表文件 443 个之间的差值构成：仅核对了文件↔索引的双向差集（差集=item.full.json），dicCount 454 指什么未能确认。

## 范围外产出

- 位置记录（不动手、不分析）：`F:\BaoZouyxt\tools\cfg\dump\item.full.json` 是唯一有文件但不在 `_index.json` 索引里的表文件。
- 范围外产出：无（其余无）
