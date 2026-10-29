# W2 数字取证报告（midaudit-v21）

- 执行角色：只读取证工人（只做读、抄、取、比、统计；不做设计、判断、意见）。
- 唯一写入文件：本报告 `F:\BaoZouyxt\midaudit-v21\audit-work\w2-numbers-report.md`。未创建/修改/删除其他任何文件；未运行任何删除/清理类命令。
- 执行环境：node v24.12.0；PowerShell 5.1.22621.4391。所有 JSON 统计用 `node -e` 单行命令完成，命令原文与退出码随附。
- 工作目录：`F:\BaoZouyxt\midaudit-v21`（下文相对路径均以此为根）。

---

## 0. 文件存在性与大小证据

命令原文：

```powershell
"=== out ==="; Get-ChildItem -LiteralPath "F:\BaoZouyxt\midaudit-v21\bz-oracle\out" | ForEach-Object { "{0}`t{1}" -f $_.Name, $_.Length }; "=== config ==="; Get-ChildItem -LiteralPath "F:\BaoZouyxt\midaudit-v21\bz-oracle\config" | ForEach-Object { "{0}`t{1}" -f $_.Name, $_.Length }; "=== r21 ==="; Get-ChildItem -LiteralPath "F:\BaoZouyxt\midaudit-v21\r21" | ForEach-Object { "{0}`t{1}" -f $_.Name, $_.Length }; "audit-work exists: " + (Test-Path -LiteralPath "F:\BaoZouyxt\midaudit-v21\audit-work")
```

退出码 0。关键输出原文：

```text
=== out ===
captured	1
device-pull	1
build-stamp.demo.json	202
build-stamp.json	320
contracts.json	1071958
dashboard.md	3450
effects.demo.json	1748
effects.json	1748
expanded.demo.json	3021
material-counts.md	1196
mutation.json	4955
nightly.jsonl	169
registry.json	327256
registry.nightly.json	326954
replay-report.json	6218
report.json	4024
req-params.demo.json	1544
stubs.json	37825
templates.captured.json	301
=== config ===
capture.json	213
contract-overrides.json	1680
known-survivors.json	473
oracle.config.json	1713
plan.example.json	643
=== r21 ===
00-INSTRUCTION.txt	1173
29-R21-送评材料-全量.md	27257
h1.txt	22104
h3.txt	2680
M1-动作全集表.md	72802
M1-动作全集表.tsv	54346
M2-客户端读点索引.md	640965
M3-存档字段字典.md	7810
M4-note五子表语义表.md	12074
R21-回执.md	31117
audit-work exists: True
```

各目标文件行数（**以 `-Encoding UTF8` 复测为准**；命令见附录 1）：

```text
r21\M4-note五子表语义表.md  linesUTF8=138 bytes=12074
bz-oracle\out\dashboard.md  linesUTF8=58 bytes=3450
bz-oracle\out\material-counts.md  linesUTF8=21 bytes=1196
bz-oracle\out\report.json  linesUTF8=175 bytes=4024
bz-oracle\out\mutation.json  linesUTF8=210 bytes=4955
bz-oracle\out\replay-report.json  linesUTF8=305 bytes=6218
bz-oracle\config\known-survivors.json  linesUTF8=6 bytes=473
bz-oracle\config\oracle.config.json  linesUTF8=36 bytes=1713
bz-oracle\config\contract-overrides.json  linesUTF8=52 bytes=1680
bz-oracle\config\capture.json  linesUTF8=6 bytes=213
bz-oracle\config\plan.example.json  linesUTF8=11 bytes=643
```

---

## A. bz-oracle\out\contracts.json（1,071,958 字节）

### A-1) 顶层结构（Object.keys）

命令原文：

```powershell
node -e 'const fs=require(`fs`);const j=JSON.parse(fs.readFileSync(`F:/BaoZouyxt/midaudit-v21/bz-oracle/out/contracts.json`,`utf8`));if(Array.isArray(j)){console.log(`TOP=array len=`+j.length);console.log(`SAMPLE[0]=`+JSON.stringify(j[0],null,2));}else{const ks=Object.keys(j);console.log(`TOPKEYS=`+JSON.stringify(ks));for(const k of ks){const v=j[k];let t=Array.isArray(v)?`array[`+v.length+`]`:typeof v;if(typeof v===`object`&&v!==null&&!Array.isArray(v))t+=` keys=`+JSON.stringify(Object.keys(v));if(typeof v===`string`)t+=` len=`+v.length+` head=`+JSON.stringify(v.slice(0,100));console.log(`FIELD `+k+` => `+t);}const ak=ks.find(k=>Array.isArray(j[k])&&j[k].length>0&&typeof j[k][0]===`object`);if(ak!==undefined){console.log(`SAMPLE `+ak+`[0]=`+JSON.stringify(j[ak][0],null,2));}else{console.log(`NO_ARRAY_OF_OBJ BODY=`+JSON.stringify(j,null,2).slice(0,3000));}}' ; "exit=$LASTEXITCODE"
```

退出码 0。关键输出原文（探针同时把 `byAction` 全部键名与 `contracts` 全部键名逐行打出，过长，此处只抄判定所需行；命令原文如上原样保留）：

```text
TOPKEYS=["__meta","byAction","contracts"]
FIELD __meta => object keys=["gen","m2Sha8","m1Sha8","overridesSha8","sites","contracts","closed","open","byNs","withFk"]
FIELD byAction => object keys=[...（User.acceptSchoolTask、User.acceptCircleTask、…… 共数百个动作名→契约名映射，略）]
FIELD contracts => object keys=[...（HttpConst3.LOTTERY_WULIN_TREASURE、ACCEPT_SCHOOL_TASK、……，略）]
```

即顶层三键：`__meta`（元信息对象）、`byAction`（动作名→契约名映射对象）、`contracts`（契约名→条目映射对象）。

### A-2) 契约总条数 + A-3) 样例条目 + A-4) closed 统计

命令原文：

```powershell
node -e 'const fs=require(`fs`);const j=JSON.parse(fs.readFileSync(`F:/BaoZouyxt/midaudit-v21/bz-oracle/out/contracts.json`,`utf8`));const ck=Object.keys(j.contracts);console.log(`contractsCount=`+ck.length);console.log(`META=`+JSON.stringify(j.__meta));const first=ck[0];console.log(`FIRSTKEY=`+first);console.log(`SAMPLE_ENTRY=`+JSON.stringify(j.contracts[first],null,2));const dist={};let cT=0,cF=0,cU=0,stClosed=0;ck.forEach(k=>{const e=j.contracts[k];const s=String(e.status);dist[s]=(dist[s]||0)+1;if(e.closed===true)cT++;else if(e.closed===false)cF++;else cU++;if(e.status===`closed`)stClosed++;});console.log(`statusFieldDist=`+JSON.stringify(dist,null,2));console.log(`closedFieldTrue=`+cT+` closedFieldFalse=`+cF+` closedFieldOther=`+cU+` statusEqualsClosedString=`+stClosed);' ; "exit=$LASTEXITCODE"
```

退出码 0。输出原文：

```text
contractsCount=1028
META={"gen":"2026-10-23T06:52:50.379Z","m2Sha8":"e1940b69","m1Sha8":"ed2a4eee","overridesSha8":"21268b37","sites":1043,"contracts":1028,"closed":502,"open":526,"byNs":{"HttpConst3":126,"HttpConst":902},"withFk":12}
FIRSTKEY=HttpConst3.LOTTERY_WULIN_TREASURE
SAMPLE_ENTRY={
  "id": "HttpConst3.LOTTERY_WULIN_TREASURE",
  "ns": "HttpConst3",
  "key": "LOTTERY_WULIN_TREASURE",
  "action": null,
  "m1": null,
  "sites": [
    {
      "file": "tools/scripts3.js",
      "line": 44883,
      "form": "inline",
      "handler": "()"
    }
  ],
  "fields": {},
  "closed": false,
  "openReasons": [
    "内联但 0 读取 @tools/scripts3.js:44883（可能跨函数读取，见 LoadGame 先例）"
  ]
}
statusFieldDist={
  "undefined": 1028
}
closedFieldTrue=502 closedFieldFalse=526 closedFieldOther=0 statusEqualsClosedString=0
```

**结论（机械判定）**：
- A-2 契约总条数 = **1028**（`Object.keys(j.contracts).length`，与 `__meta.contracts=1028` 一致）。
- A-3 字段名以样例确定：契约条目**没有 `status` 字段**（对全部 1028 条取 `status` 均为 undefined）；"闭合"字段是**布尔字段 `closed`**。
- A-4 **closed=true（闭合）= 502 条；closed=false（非闭合）= 526 条；其他 = 0**。502+526=1028（自洽）。与 `__meta` 自报 `closed:502, open:526` 完全一致。

---

## B. bz-oracle\out\registry.json（327,256 字节）

### B-样例（先确定字段名）

命令原文：

```powershell
node -e 'const fs=require(`fs`);const j=JSON.parse(fs.readFileSync(`F:/BaoZouyxt/midaudit-v21/bz-oracle/out/registry.json`,`utf8`));if(Array.isArray(j)){console.log(`TOP=array len=`+j.length);console.log(`SAMPLE[0]=`+JSON.stringify(j[0],null,2));}else{const ks=Object.keys(j);console.log(`TOPKEYS=`+JSON.stringify(ks));for(const k of ks){const v=j[k];let t=Array.isArray(v)?`array[`+v.length+`]`:typeof v;if(typeof v===`object`&&v!==null&&!Array.isArray(v))t+=` keys=`+JSON.stringify(Object.keys(v));if(typeof v===`string`)t+=` len=`+v.length+` head=`+JSON.stringify(v.slice(0,100));console.log(`FIELD `+k+` => `+t);}const ak=ks.find(k=>Array.isArray(j[k])&&j[k].length>0&&typeof j[k][0]===`object`);if(ak!==undefined){console.log(`SAMPLE `+ak+`[0]=`+JSON.stringify(j[ak][0],null,2));}else{console.log(`NO_ARRAY_OF_OBJ BODY=`+JSON.stringify(j,null,2).slice(0,3000));}}' ; "exit=$LASTEXITCODE"
```

退出码 0。关键输出原文：

```text
TOPKEYS=["__meta","counts","meaning","rows"]
FIELD rows => array[1125]
SAMPLE rows[0]={
  "key": "QUICK_LOGIN",
  "action": "User.quicklogin",
  "status": "IMPL-UNJUDGED",
  "hits": 0,
  "contract": "QUICK_LOGIN",
  "closed": false,
  "m1": {
    "handler": 1,
    "on": 1,
    "send": 1,
    "code": 0
  }
}
```

即状态字段名 = `status`（字符串），另有布尔字段 `closed`。

### B-统计

命令原文：

```powershell
node -e 'const fs=require(`fs`);const j=JSON.parse(fs.readFileSync(`F:/BaoZouyxt/midaudit-v21/bz-oracle/out/registry.json`,`utf8`));console.log(`rowsCount=`+j.rows.length);console.log(`META=`+JSON.stringify(j.__meta,null,2));console.log(`COUNTS_OBJ=`+JSON.stringify(j.counts,null,2));const dist={};let cT=0,cF=0,cU=0;j.rows.forEach(r=>{const s=String(r.status);dist[s]=(dist[s]||0)+1;if(r.closed===true)cT++;else if(r.closed===false)cF++;else cU++;});console.log(`rowsStatusDist=`+JSON.stringify(dist,null,2));console.log(`closedTrue=`+cT+` closedFalse=`+cF+` closedOther=`+cU);[`PUSH`,`DEAD`,`ALT`,`OUT`].forEach(w=>{const n=j.rows.filter(r=>r.status===w).length;console.log(w+`=`+n);});' ; "exit=$LASTEXITCODE"
```

退出码 0。输出原文：

```text
rowsCount=1125
META={
  "gen": "2026-10-23T06:52:50.988Z",
  "m1Sha8": "ed2a4eee",
  "contractsSha8": "8c8c6964",
  "total": 1125,
  "reqTotal": 744,
  "inScope": 699,
  "doneRatio": 0.0086,
  "effects": null
}
COUNTS_OBJ={
  "DONE": 6,
  "IMPL-FAIL": 0,
  "IMPL-UNJUDGED": 74,
  "RULE": 0,
  "GEN-READY": 317,
  "NEEDS-S2": 282,
  "NO-CONTRACT": 20,
  "CAPTURE": 0,
  "OUT": 29,
  "ALT": 16,
  "PUSH": 192,
  "DEAD": 189
}
rowsStatusDist={
  "IMPL-UNJUDGED": 74,
  "DEAD": 189,
  "PUSH": 192,
  "NEEDS-S2": 282,
  "DONE": 6,
  "GEN-READY": 317,
  "OUT": 29,
  "NO-CONTRACT": 20,
  "ALT": 16
}
closedTrue=469 closedFalse=434 closedOther=222
PUSH=192
DEAD=189
ALT=16
OUT=29
```

**结论（机械判定）**：
- B-总条数 = **1125**（`rows.length`，与 `__meta.total=1125` 一致）。
- B-按 `status` 字段取值分布（从 rows 实算，与文件自带 `counts` 对象一致；counts 中另三个取值 IMPL-FAIL=0、RULE=0、CAPTURE=0 在 rows 中无实例）：

| status | 条数 |
|---|---:|
| GEN-READY | 317 |
| NEEDS-S2 | 282 |
| PUSH | 192 |
| DEAD | 189 |
| IMPL-UNJUDGED | 74 |
| OUT | 29 |
| NO-CONTRACT | 20 |
| ALT | 16 |
| DONE | 6 |
| **合计** | **1125** |

- B-四词专查：**PUSH=192、DEAD=189、ALT=16、OUT=29**（与分布表一致）。
- 附加机械事实：rows 上布尔字段 `closed`：true=469、false=434、无该字段=222（469+434+222=1125）。

---

## C. bz-oracle\out\stubs.json（37,825 字节）

命令原文（结构探针）：

```powershell
node -e 'const fs=require(`fs`);const j=JSON.parse(fs.readFileSync(`F:/BaoZouyxt/midaudit-v21/bz-oracle/out/stubs.json`,`utf8`));...（与 A/B 相同的探针模板）...'
```

退出码 0。关键输出原文：

```text
TOPKEYS=["_说明","policy","stubs"]
FIELD _说明 => string len=64 head="兜底应答（STUB）：不写存档、不发 note、开关字段不发；付费回 eRet:4。报告里一律计为 STUB，不计入\"已还原\"。"
FIELD policy => string len=9 head="heuristic"
FIELD stubs => object keys=["User.AnswerFriend","User.FriendRegister","User.ChallengePVP",...]
NO_ARRAY_OF_OBJ BODY={
  "_说明": "兜底应答（STUB）：不写存档、不发 note、开关字段不发；付费回 eRet:4。报告里一律计为 STUB，不计入\"已还原\"。",
  "policy": "heuristic",
  "stubs": {
    "User.AnswerFriend": {
      "eRet": 1
    },
    ...
```

统计命令原文：

```powershell
node -e 'const fs=require(`fs`);const j=JSON.parse(fs.readFileSync(`F:/BaoZouyxt/midaudit-v21/bz-oracle/out/stubs.json`,`utf8`));const ks=Object.keys(j.stubs);console.log(`stubsCount=`+ks.length);const first=ks[0];console.log(`FIRSTKEY=`+first);console.log(`SAMPLE_BODY=`+JSON.stringify(j.stubs[first],null,2));let withE=0;const without=[];const vals={};ks.forEach(k=>{const s=JSON.stringify(j.stubs[k]);if(s.includes(`"eRet"`)){withE++;}else{without.push(k);}const v=j.stubs[k].eRet;if(v!==undefined){vals[String(v)]=(vals[String(v)]||0)+1;}});console.log(`bodiesContaining_eRet=`+withE);console.log(`bodiesNotContaining_eRet=`+without.length+` keys=`+JSON.stringify(without));console.log(`eRetValueDist=`+JSON.stringify(vals,null,2));' ; "exit=$LASTEXITCODE"
```

退出码 0。输出原文：

```text
stubsCount=648
FIRSTKEY=User.AnswerFriend
SAMPLE_BODY={
  "eRet": 1
}
bodiesContaining_eRet=648
bodiesNotContaining_eRet=0 keys=[]
eRetValueDist={
  "1": 619,
  "4": 29
}
```

**结论（机械判定）**：
- C-总条数 = **648**（`Object.keys(j.stubs).length`；stubs 是"动作名→响应体"映射）。
- C-第 1 条完整原文（键序即文件序第一条）：`"User.AnswerFriend": { "eRet": 1 }`。
- C-响应体中含 `"eRet"` 的条数 = **648 / 648（全部）**，不含的 = 0。判定口径：`JSON.stringify(该条响应体).includes('"eRet"')`。
- 附加机械事实：`eRet` 取值分布：`1`×619、`4`×29（619+29=648）。

---

## D. report.json / mutation.json / replay-report.json 全文

均以读取工具逐行抄录（行号为 1-based，与文件实际行一致）。

### D-1. bz-oracle\out\report.json（175 行 / 4,024 字节）

````text
1: {
2:   "verdict": "PASS",
3:   "summary": {
4:     "cases": 11,
5:     "pass": 11,
6:     "fail": 0,
7:     "crossFail": 0,
8:     "byCode": {
9:       "INFO L1.OPEN_CONTRACT": 1,
10:       "INFO L2.SKIPPED": 1
11:     }
12:   },
13:   "inputs": {
14:     "contractsSha8": "8c8c6964",
15:     "m2Sha8": "e1940b69",
16:     "configSha8": "94ce289f",
17:     "casesSha8": "d6cde37d"
18:   },
19:   "perCase": [
20:     {
21:       "id": "upgradeSkill.orig0036",
22:       "action": "User.upgradeSkill",
23:       "file": "fixtures/cases/01-upgradeSkill-orig0036.json",
24:       "verdict": "PASS",
25:       "findings": []
26:     },
27:     {
28:       "id": "buyShopItem.2001x2",
29:       "action": "User.buyShopItem",
30:       "file": "fixtures/cases/02-buyShopItem-2001x2.json",
31:       "verdict": "PASS",
32:       "findings": []
33:     },
34:     {
35:       "id": "saleItem.2001x2",
36:       "action": "User.saleItem",
37:       "file": "fixtures/cases/03-saleItem-2001x2.json",
38:       "verdict": "PASS",
39:       "findings": []
40:     },
41:     {
42:       "id": "useItem.food3001",
43:       "action": "User.useItem",
44:       "file": "fixtures/cases/04-useItem-food.json",
45:       "verdict": "PASS",
46:       "findings": []
47:     },
48:     {
49:       "id": "useItem.formula3101",
50:       "action": "User.useItem",
51:       "file": "fixtures/cases/05-useItem-formula.json",
52:       "verdict": "PASS",
53:       "findings": []
54:     },
55:     {
56:       "id": "saleItem.equip90001",
57:       "action": "User.saleItem",
58:       "file": "fixtures/cases/06-saleItem-equip.json",
59:       "verdict": "PASS",
60:       "findings": []
61:     },
62:     {
63:       "id": "BuyFashion.90002",
64:       "action": "User.BuyFashion",
65:       "file": "fixtures/cases/07-BuyFashion.json",
66:       "verdict": "PASS",
67:       "findings": []
68:     },
69:     {
70:       "id": "LoadGame.base",
71:       "action": "User.LoadGame",
72:       "file": "fixtures/cases/08-LoadGame.json",
73:       "verdict": "PASS",
74:       "findings": []
75:     },
76:     {
77:       "id": "sycnPlayerItemData.base",
78:       "action": "User.sycnPlayerItemData",
79:       "file": "fixtures/cases/09-sycnPlayerItemData.json",
80:       "verdict": "PASS",
81:       "findings": []
82:     },
83:     {
84:       "id": "GetPayAward.blocked",
85:       "action": "User.GetPayAward",
86:       "file": "fixtures/cases/10-pay-GetPayAward.json",
87:       "verdict": "PASS",
88:       "findings": [
89:         {
90:           "layer": "L1",
91:           "level": "INFO",
92:           "code": "L1.OPEN_CONTRACT",
93:           "msg": "契约未闭合：命名处理器 this.onGetProduct @tools/index.js:130733 函数体未展开"
94:         },
95:         {
96:           "layer": "L2",
97:           "level": "INFO",
98:           "code": "L2.SKIPPED",
99:           "msg": "case 未带客户端快照（需设备探针 dual 模式产出）"
100:         }
101:       ]
102:     },
103:     {
104:       "id": "upgradeSkill.ptt",
105:       "action": "User.upgradeSkill",
106:       "file": "fixtures/cases/11-upgradeSkill-ptt.json",
107:       "verdict": "PASS",
108:       "findings": []
109:     }
110:   ],
111:   "cross": [],
112:   "coverage": {
113:     "User.upgradeSkill": {
114:       "switches": 1,
115:       "bothSides": 0,
116:       "onlyAbsent": [
117:         "returnPro"
118:       ]
119:     },
120:     "User.buyShopItem": {
121:       "switches": 1,
122:       "bothSides": 0,
123:       "onlyAbsent": []
124:     },
125:     "User.saleItem": {
126:       "switches": 1,
127:       "bothSides": 0,
128:       "onlyAbsent": []
129:     },
130:     "User.useItem": {
131:       "switches": 22,
132:       "bothSides": 1,
133:       "onlyAbsent": [
134:         "rewardArray",
135:         "getKnackIds",
136:         "partners",
137:         "mpnum",
138:         "taskID",
139:         "mountID",
140:         "titleID",
141:         "bloodEndTime",
142:         "dogid",
143:         "hanyusuiTime",
144:         "genGuDan",
145:         "stealFlag",
146:         "endMonthCardTime",
147:         "avatarInfo",
148:         "itemRealgarMap",
149:         "rewardSkillSkin",
150:         "housekeeper",
151:         "wId",
152:         "weaponSkinId",
153:         "emoId",
154:         "itemSort"
155:       ]
156:     },
157:     "User.BuyFashion": {
158:       "switches": 1,
159:       "bothSides": 0,
160:       "onlyAbsent": [
161:         "titivateObj"
162:       ]
163:     },
164:     "User.LoadGame": {
165:       "switches": 0,
166:       "bothSides": 0,
167:       "onlyAbsent": []
168:     },
169:     "User.sycnPlayerItemData": {
170:       "switches": 0,
171:       "bothSides": 0,
172:       "onlyAbsent": []
173:     }
174:   }
175: }
````

### D-2. bz-oracle\out\mutation.json（210 行 / 4,955 字节）

````text
1: {
2:   "killRate": 0.9886363636363636,
3:   "applicable": 88,
4:   "killed": 87,
5:   "neverApplicable": [],
6:   "results": [
7:     {
8:       "id": "M01.ivch_delta",
9:       "why": "note.ivch 发增量而非绝对值（能反复卖）",
10:       "applicable": 4,
11:       "killed": 4,
12:       "survivors": [],
13:       "killedBy": {
14:         "L1.IVCH_ABS": 4,
15:         "L1.IVCH_VAL": 3
16:       }
17:     },
18:     {
19:       "id": "M02.eco_potential_key",
20:       "why": "潜能键写成 potential（客户端只认 ptt）",
21:       "applicable": 1,
22:       "killed": 1,
23:       "survivors": [],
24:       "killedBy": {
25:         "L1.ECO_KEY": 1,
26:         "L1.NOTE_MISSING_ECO": 1
27:       }
28:     },
29:     {
30:       "id": "M03.skch_lv0",
31:       "why": "下发 lv=0 的 skch（客户端删技能）",
32:       "applicable": 2,
33:       "killed": 2,
34:       "survivors": [],
35:       "killedBy": {
36:         "L1.SKCH_LV0": 2,
37:         "L4.DIFF": 1
38:       }
39:     },
40:     {
41:       "id": "M04.switch_zero",
42:       "why": "开关字段回 0（F1：formulaID:0 → getItem(0) 得 null）",
43:       "applicable": 5,
44:       "killed": 5,
45:       "survivors": [],
46:       "killedBy": {
47:         "L1.SWITCH_FALSY": 5,
48:         "L4.DIFF": 1
49:       }
50:     },
51:     {
52:       "id": "M05.drop_required",
53:       "why": "漏回必回字段（LoadGame 等重建入口）",
54:       "applicable": 2,
55:       "killed": 2,
56:       "survivors": [],
57:       "killedBy": {
58:         "L1.REQUIRED": 2
59:       }
60:     },
61:     {
62:       "id": "M06.finishTaskObj_shape",
63:       "why": "finishTaskObj 回成对象（LoadGame 要字符串数组）",
64:       "applicable": 1,
65:       "killed": 1,
66:       "survivors": [],
67:       "killedBy": {
68:         "L1.SHAPE": 1
69:       }
70:     },
71:     {
72:       "id": "M07.itemObj_empty",
73:       "why": "sycnPlayerItemData 回空 itemObj（客户端清空背包）",
74:       "applicable": 2,
75:       "killed": 2,
76:       "survivors": [],
77:       "killedBy": {
78:         "L1.SHAPE": 2
79:       }
80:     },
81:     {
82:       "id": "M08.drop_note",
83:       "why": "改了存档但没发 note（客户端显示过期）",
84:       "applicable": 8,
85:       "killed": 8,
86:       "survivors": [],
87:       "killedBy": {
88:         "L1.NOTE_MISSING_SKCH": 2,
89:         "L4.DIFF": 1,
90:         "L1.NOTE_MISSING_IVCH": 4,
91:         "L1.NOTE_MISSING_ECO": 5,
92:         "L1.NOTE_MISSING_EQCH": 2
93:       }
94:     },
95:     {
96:       "id": "M09.sell_overpay",
97:       "why": "结算多给 1 个铜币（存档与 note 同步错，只有守恒式能抓）",
98:       "applicable": 3,
99:       "killed": 2,
100:       "survivors": [
101:         "saleItem.equip90001"
102:       ],
103:       "killedBy": {
104:         "L5.RULE": 2
105:       }
106:     },
107:     {
108:       "id": "M10.note_key_typo",
109:       "why": "note 键名拼错（ivch→ivhc，客户端静默丢弃）",
110:       "applicable": 4,
111:       "killed": 4,
112:       "survivors": [],
113:       "killedBy": {
114:         "L1.NOTE_KEY": 4,
115:         "L1.NOTE_MISSING_IVCH": 4
116:       }
117:     },
118:     {
119:       "id": "M11.currency_in_bag",
120:       "why": "货币进背包（4001 铜币写进 bag/ivch）",
121:       "applicable": 10,
122:       "killed": 10,
123:       "survivors": [],
124:       "killedBy": {
125:         "L1.CURRENCY_IN_BAG": 10,
126:         "L2.A_NE_SAVE": 10,
127:         "L2.B_NE_SAVE": 10,
128:         "L4.DIFF": 1,
129:         "L5.CURRENCY_IN_BAG": 10,
130:         "L1.SHAPE": 2
131:       }
132:     },
133:     {
134:       "id": "M12.yuanbao_forge",
135:       "why": "元宝（付费货币）被加",
136:       "applicable": 11,
137:       "killed": 11,
138:       "survivors": [],
139:       "killedBy": {
140:         "L2.A_NE_SAVE": 10,
141:         "L2.B_NE_SAVE": 10,
142:         "L4.DIFF": 1,
143:         "L5.PAID_CURRENCY_UP": 11,
144:         "L5.LOOP_PROFIT": 1,
145:         "L5.PAY_WROTE_SAVE": 1
146:       }
147:     },
148:     {
149:       "id": "M13.eqch_shape",
150:       "why": "eqch 少一层数组（[1,type,num]）",
151:       "applicable": 1,
152:       "killed": 1,
153:       "survivors": [],
154:       "killedBy": {
155:         "L1.EQCH_SHAPE": 1
156:       }
157:     },
158:     {
159:       "id": "M14.client_diverge",
160:       "why": "客户端增量路径状态与全量路径不同（L2 只靠快照能抓）",
161:       "applicable": 10,
162:       "killed": 10,
163:       "survivors": [],
164:       "killedBy": {
165:         "L2.A_NE_B": 10,
166:         "L2.A_NE_SAVE": 10
167:       }
168:     },
169:     {
170:       "id": "M15.swallowed_exception",
171:       "why": "监听器抛异常被 MessageCenter 吞掉（战斗 npcArr[23] 先例）",
172:       "applicable": 11,
173:       "killed": 11,
174:       "survivors": [],
175:       "killedBy": {
176:         "L0.EXCEPTION": 11
177:       }
178:     },
179:     {
180:       "id": "M16.pay_not_blocked",
181:       "why": "付费动作回了 eRet:1",
182:       "applicable": 1,
183:       "killed": 1,
184:       "survivors": [],
185:       "killedBy": {
186:         "L1.PAY_NOT_BLOCKED": 1
187:       }
188:     },
189:     {
190:       "id": "M17.fk_dangling",
191:       "why": "外键指向表里不存在的 id",
192:       "applicable": 1,
193:       "killed": 1,
194:       "survivors": [],
195:       "killedBy": {
196:         "L1.FK": 1
197:       }
198:     },
199:     {
200:       "id": "M18.envelope_no_code",
201:       "why": "游戏服信封缺 code:200（客户端静默丢弃）",
202:       "applicable": 11,
203:       "killed": 11,
204:       "survivors": [],
205:       "killedBy": {
206:         "L1.ENV_CODE": 11
207:       }
208:     }
209:   ]
210: }
````

### D-3. bz-oracle\out\replay-report.json（305 行 / 6,218 字节）

````text
1: {
2:   "verdict": "FAIL",
3:   "cases": 11,
4:   "byVia": {
5:     "stub": 8,
6:     "rule": 3
7:   },
8:   "judge": {
9:     "cases": 11,
10:     "pass": 9,
11:     "fail": 2,
12:     "crossFail": 0,
13:     "byCode": {
14:       "FAIL L1.REQUIRED": 11,
15:       "INFO L1.OPEN_CONTRACT": 1
16:     }
17:   },
18:   "regressions": 9,
19:   "regress": [
20:     {
21:       "id": "upgradeSkill.orig0036",
22:       "action": "User.upgradeSkill",
23:       "via": "stub",
24:       "diffs": [
25:         {
26:           "path": "$.note",
27:           "a": {
28:             "eco": {},
29:             "skch": {
30:               "1262": [
31:                 1,
32:                 0,
33:                 0
34:               ]
35:             }
36:           },
37:           "kind": "missingB"
38:         }
39:       ]
40:     },
41:     {
42:       "id": "useItem.food3001",
43:       "action": "User.useItem",
44:       "via": "stub",
45:       "diffs": [
46:         {
47:           "path": "$.note",
48:           "a": {
49:             "ivch": {
50:               "3001": 4
51:             },
52:             "attrch": {
53:               "hunger": 80
54:             }
55:           },
56:           "kind": "missingB"
57:         }
58:       ]
59:     },
60:     {
61:       "id": "useItem.formula3101",
62:       "action": "User.useItem",
63:       "via": "stub",
64:       "diffs": [
65:         {
66:           "path": "$.formulaID",
67:           "a": 501,
68:           "kind": "missingB"
69:         },
70:         {
71:           "path": "$.note",
72:           "a": {
73:             "ivch": {
74:               "3101": 0
75:             }
76:           },
77:           "kind": "missingB"
78:         }
79:       ]
80:     },
81:     {
82:       "id": "saleItem.equip90001",
83:       "action": "User.saleItem",
84:       "via": "rule",
85:       "diffs": [
86:         {
87:           "path": "$.eRet",
88:           "a": 1,
89:           "b": 0,
90:           "kind": "value"
91:         },
92:         {
93:           "path": "$.note",
94:           "a": {
95:             "eqch": {
96:               "90001": [
97:                 0
98:               ]
99:             },
100:             "eco": {
101:               "coins": 1030
102:             }
103:           },
104:           "kind": "missingB"
105:         }
106:       ]
107:     },
108:     {
109:       "id": "BuyFashion.90002",
110:       "action": "User.BuyFashion",
111:       "via": "stub",
112:       "diffs": [
113:         {
114:           "path": "$.note",
115:           "a": {
116:             "eqch": {
117:               "90002": [
118:                 1,
119:                 [
120:                   7,
121:                   1
122:                 ]
123:               ]
124:             },
125:             "eco": {
126:               "gold": 40
127:             }
128:           },
129:           "kind": "missingB"
130:         }
131:       ]
132:     },
133:     {
134:       "id": "LoadGame.base",
135:       "action": "User.LoadGame",
136:       "via": "stub",
137:       "diffs": [
138:         {
139:           "path": "$.finishTaskObj",
140:           "a": [
141:             "101080,1"
142:           ],
143:           "kind": "missingB"
144:         },
145:         {
146:           "path": "$.acceptTaskArray",
147:           "a": [],
148:           "kind": "missingB"
149:         },
150:         {
151:           "path": "$.acceptTaskOrder",
152:           "a": [],
153:           "kind": "missingB"
154:         },
155:         {
156:           "path": "$.taskLog",
157:           "a": {},
158:           "kind": "missingB"
159:         },
160:         {
161:           "path": "$.itemObj",
162:           "a": {
163:             "2001": 5,
164:             "3001": 5,
165:             "3101": 1
166:           },
167:           "kind": "missingB"
168:         }
169:       ]
170:     },
171:     {
172:       "id": "sycnPlayerItemData.base",
173:       "action": "User.sycnPlayerItemData",
174:       "via": "stub",
175:       "diffs": [
176:         {
177:           "path": "$.itemObj",
178:           "a": {
179:             "2001": 5,
180:             "3001": 5,
181:             "3101": 1
182:           },
183:           "kind": "missingB"
184:         }
185:       ]
186:     },
187:     {
188:       "id": "GetPayAward.blocked",
189:       "action": "User.GetPayAward",
190:       "via": "stub",
191:       "diffs": [
192:         {
193:           "path": "$.reason",
194:           "a": "PAY_BLOCKED",
195:           "kind": "missingB"
196:         }
197:       ]
198:     },
199:     {
200:       "id": "upgradeSkill.ptt",
201:       "action": "User.upgradeSkill",
202:       "via": "stub",
203:       "diffs": [
204:         {
205:           "path": "$.note",
206:           "a": {
207:             "eco": {
208:               "ptt": 200
209:             },
210:             "skch": {
211:               "1112": [
212:                 3,
213:                 0,
214:                 1
215:               ]
216:             }
217:           },
218:           "kind": "missingB"
219:         }
220:       ]
221:     }
222:   ],
223:   "perCase": [
224:     {
225:       "id": "upgradeSkill.orig0036@replay",
226:       "action": "User.upgradeSkill",
227:       "verdict": "PASS",
228:       "fails": []
229:     },
230:     {
231:       "id": "useItem.food3001@replay",
232:       "action": "User.useItem",
233:       "verdict": "PASS",
234:       "fails": []
235:     },
236:     {
237:       "id": "useItem.formula3101@replay",
238:       "action": "User.useItem",
239:       "verdict": "PASS",
240:       "fails": []
241:     },
242:     {
243:       "id": "saleItem.equip90001@replay",
244:       "action": "User.saleItem",
245:       "verdict": "PASS",
246:       "fails": []
247:     },
248:     {
249:       "id": "BuyFashion.90002@replay",
250:       "action": "User.BuyFashion",
251:       "verdict": "PASS",
252:       "fails": []
253:     },
254:     {
255:       "id": "LoadGame.base@replay",
256:       "action": "User.LoadGame",
257:       "verdict": "FAIL",
258:       "fails": [
259:         "L1.REQUIRED 缺必回字段 finishTaskObj",
260:         "L1.REQUIRED 缺必回字段 acceptTaskArray",
261:         "L1.REQUIRED 缺必回字段 acceptTaskOrder",
262:         "L1.REQUIRED 缺必回字段 taskLog",
263:         "L1.REQUIRED 缺必回字段 itemObj",
264:         "L1.REQUIRED 缺必回字段 PlayerEquip",
265:         "L1.REQUIRED 缺必回字段 equipments",
266:         "L1.REQUIRED 缺必回字段 cycleObj",
267:         "L1.REQUIRED 缺必回字段 OnhookObj.serverTime",
268:         "L1.REQUIRED 缺必回字段 baseValueAy"
269:       ]
270:     },
271:     {
272:       "id": "sycnPlayerItemData.base@replay",
273:       "action": "User.sycnPlayerItemData",
274:       "verdict": "FAIL",
275:       "fails": [
276:         "L1.REQUIRED 缺必回字段 itemObj"
277:       ]
278:     },
279:     {
280:       "id": "GetPayAward.blocked@replay",
281:       "action": "User.GetPayAward",
282:       "verdict": "PASS",
283:       "fails": []
284:     },
285:     {
286:       "id": "upgradeSkill.ptt@replay",
287:       "action": "User.upgradeSkill",
288:       "verdict": "PASS",
289:       "fails": []
290:     },
291:     {
292:       "id": "buyShopItem.2001x2@replay",
293:       "action": "User.buyShopItem",
294:       "verdict": "PASS",
295:       "fails": []
296:     },
297:     {
298:       "id": "saleItem.2001x2@replay",
299:       "action": "User.saleItem",
300:       "verdict": "PASS",
301:       "fails": []
302:     }
303:   ],
304:   "totalMs": 1.13
305: }
````

---

## E. dashboard.md / material-counts.md 全文

### E-1. bz-oracle\out\dashboard.md（58 行 / 3,450 字节）

````text
1: # 动作注册表仪表盘
2: 
3: 生成：2026-10-23T06:52:50.988Z　M1 ed2a4eee　契约 8c8c6964
4: 
5: - HttpConst 条目：**1125**；其中客户端真会发请求的：**744**；扣除 OUT/CAPTURE 后在范围内：**699**
6: - 已还原（DONE）占范围内：**0.9%**
7: 
8: | 状态 | 数量 | 含义 |
9: |---|---:|---|
10: | DONE | 6 | 已实现且裁判全 PASS |
11: | IMPL-FAIL | 0 | 已实现但裁判有 FAIL |
12: | IMPL-UNJUDGED | 74 | 已实现、还没有用例 |
13: | RULE | 0 | 有规则 DSL，可直接编译 |
14: | GEN-READY | 317 | 契约闭合，可交给生成器 |
15: | NEEDS-S2 | 282 | 契约未闭合，先跑展开器 |
16: | NO-CONTRACT | 20 | 客户端会发但没有读点契约 |
17: | CAPTURE | 0 | 依赖原服独有数据 |
18: | OUT | 29 | 付费/项目边界外 |
19: | ALT | 16 | 非 Mod.do 形态的发送（弹幕/排行榜等另一通道），多依赖其他玩家【推断】，不计入范围 |
20: | PUSH | 192 | 服务端推送事件，不需要请求 handler |
21: | DEAD | 189 | 客户端不发也不读 |
22: 
23: ## 待办 Top 30（按真实触发次数，其次按状态）
24: 
25: | # | 动作 | 状态 | 触发 | 契约 |
26: |---:|---|---|---:|---|
27: | 1 | `User.quicklogin` | IMPL-UNJUDGED | 0 | QUICK_LOGIN（未闭合） |
28: | 2 | `User.Create` | IMPL-UNJUDGED | 0 | USER_CREATE（未闭合） |
29: | 3 | `User.OnHookBreak` | IMPL-UNJUDGED | 0 | USER_ONHOOK_BREAK（未闭合） |
30: | 4 | `User.FriendList` | IMPL-UNJUDGED | 0 | USER_FRIENDLIST（未闭合） |
31: | 5 | `User.ApplyFriend` | IMPL-UNJUDGED | 0 | USER_APPLAYFRIEND（未闭合） |
32: | 6 | `User.FindFriend` | IMPL-UNJUDGED | 0 | USER_FIND_FRIEND（未闭合） |
33: | 7 | `User.FriendDelete` | IMPL-UNJUDGED | 0 | USER_FRIEND_DELETE（未闭合） |
34: | 8 | `User.rankList` | IMPL-UNJUDGED | 0 | USER_RANKLIST |
35: | 9 | `User.LookOther` | IMPL-UNJUDGED | 0 | USER_LOOKOTHER |
36: | 10 | `User.getCRAInfo` | IMPL-UNJUDGED | 0 | GET_CREATE_INFO |
37: | 11 | `User.OnCheckBreak` | IMPL-UNJUDGED | 0 | CHECK_BREAK（未闭合） |
38: | 12 | `User.GetChatAddress` | IMPL-UNJUDGED | 0 | USER_GETCHATADDRESS（未闭合） |
39: | 13 | `User.BeginPlayWooks` | IMPL-UNJUDGED | 0 | BEGIN_WOOD_TRAINING |
40: | 14 | `User.EndPlayWooks` | IMPL-UNJUDGED | 0 | END_WOOD_TRAINING |
41: | 15 | `User.GetRoldSaveTime` | IMPL-UNJUDGED | 0 | SAVE_GAMETIME（未闭合） |
42: | 16 | `User.BeginFish` | IMPL-UNJUDGED | 0 | START_FISHING |
43: | 17 | `User.EndFish` | IMPL-UNJUDGED | 0 | END_FISHING |
44: | 18 | `User.LookFishAward` | IMPL-UNJUDGED | 0 | CHECK_FISHING_REWARDS |
45: | 19 | `User.ExChangeJetton` | IMPL-UNJUDGED | 0 | EXCHANFE_JETTON（未闭合） |
46: | 20 | `User.GetSchoolReview` | IMPL-UNJUDGED | 0 | GET_SCHOOL_POSTS（未闭合） |
47: | 21 | `User.GetSchoolRankList` | IMPL-UNJUDGED | 0 | GET_SCHOOL_RANK（未闭合） |
48: | 22 | `User.enterWoldBossBattle` | IMPL-UNJUDGED | 0 | FIGHT_WORLD_BOSS |
49: | 23 | `User.QuickBuyItem` | IMPL-UNJUDGED | 0 | QUICK_BUY（未闭合） |
50: | 24 | `User.checkUploadAttackDamge` | IMPL-UNJUDGED | 0 | UPLOAD_WB_DMG |
51: | 25 | `User.WashMedicine` | IMPL-UNJUDGED | 0 | WASH_MEDICINE |
52: | 26 | `User.GetFashionList` | IMPL-UNJUDGED | 0 | GET_FASHION_LIST |
53: | 27 | `User.addItem` | IMPL-UNJUDGED | 0 | ADD_ITEM |
54: | 28 | `User.acceptTask` | IMPL-UNJUDGED | 0 | GET_TASK（未闭合） |
55: | 29 | `User.getFinishTaskAward` | IMPL-UNJUDGED | 0 | FINISH_TASK（未闭合） |
56: | 30 | `User.BeginTraining` | IMPL-UNJUDGED | 0 | BEGIN_LIANGONG |
57: 
58: > 还没有触发数据：开被动录制或兜底 handler 的命中计数后重跑，排序才有意义。
````

### E-2. bz-oracle\out\material-counts.md（21 行 / 1,196 字节）

````text
1: ## 计数（自动生成，勿手改）
2: 
3: > 复算：`node forge/tools/registry.js --m1 ../r21/M1-动作全集表.tsv --contracts out/contracts.json --cases fixtures/cases --report out/report.json --capture config/capture.json --out out/registry.json --md out/dashboard.md`　M1 ed2a4eee / 契约 8c8c6964 / 2026-10-23T06:52:50.988Z
4: 
5: | 口径 | 数值 | 定义 |
6: |---|---:|---|
7: | HttpConst 条目 | 1125 | M1 全表行数 |
8: | 客户端会发的请求动作 | 744 | 总数 − PUSH − DEAD |
9: | 服务端推送（PUSH） | 192 | send=0 且 on=1，或非 Mod.do 形态但有监听 |
10: | 死条目（DEAD） | 189 | send=0 且 on=0 |
11: | 另一通道（ALT） | 16 | send=1 但不是 Mod.do 形态 |
12: | 范围内 | 699 | 请求动作 − OUT − CAPTURE − ALT |
13: | DONE | 6 | 已实现且裁判全 PASS |
14: | IMPL-FAIL | 0 | 已实现但裁判有 FAIL |
15: | IMPL-UNJUDGED | 74 | 已实现、还没有用例 |
16: | RULE | 0 | 有规则 DSL，可直接编译 |
17: | GEN-READY | 317 | 契约闭合，可交给生成器 |
18: | NEEDS-S2 | 282 | 契约未闭合，先跑展开器 |
19: | NO-CONTRACT | 20 | 客户端会发但没有读点契约 |
20: | CAPTURE | 0 | 依赖原服独有数据 |
21: | OUT | 29 | 付费/项目边界外 |
````

---

## F. r21\M4-note五子表语义表.md 全文（138 行 / 12,074 字节，逐行带行号）

````text
1: # M4 `note` 五子表语义表
2: 
3: > 数据源：客户端三包（`tools\index.js` 149,447 行 / `scripts2.js` 81,775 行 / `scripts3.js` 100,428 行）＋ `hotfix-patch\core\bz-rpc-server.js`。
4: > 探针：本目录 `_probe_note.js`、`_probe_note2.js`（可原样重跑）。
5: > 行号均为 1-based。
6: 
7: ---
8: 
9: ## 0. 机制（先看这条，五子表的一切行为都由它决定）
10: 
11: **总闸** `index.js:59325`：
12: 
13: ```js
14: if (g.p) {
15:   var I = g.p;                                        // 59324  I = 协议名，如 "User.upgradeSkill"
16:   if (g[I].note) for (var E in g[I].note) f.MessageCenter.dispatch(E, g[I].note[E]);   // 59325
17:   ...
18:   f.MessageCenter.dispatch(I, b ? g : g[I]);          // 59332  再把整个应答按协议名派发一次
19: }
20: ```
21: 
22: ⇒ **`note` 的每个键名本身就是一个 MessageCenter 事件名**，值就是该事件的 payload。子表不是"数据结构"，是**事件通道**。
23: 
24: **五个键名即五个事件常量**（`index.js:59569-59580`，属 `HttpConst`/`EvName` 同一命名空间）：
25: 
26: ```js
27: 59569: INVENTORY_CHNG: "ivch",
28: 59570: ECONOMY_CHNG:   "eco",
29: 59571: ATTR_CHANGE:    "attrch",
30: 59572: EQ_CHNG:        "eqch",
31: 59580: SKILL_CHANGE:   "skch",
32: ```
33: 
34: 三条直接后果（都可在代码里验证）：
35: 
36: 1. **`note` 里的键一旦拼错，不会报错，只是没人听。** 客户端 `for..in` 无条件 dispatch，没有白名单校验。
37: 2. **子表事件与协议应答事件同名空间**。`HttpConst.INVENTORY_CHNG === "ivch"`，所以 `MessageCenter.on(a.HttpConst.INVENTORY_CHNG, ...)`（64674）既可能是"某协议应答"也可能是"`note.ivch`"——实际两者是同一个监听器。
38: 3. **子表在协议应答之前派发**（59325 早于 59332）。所以监听器看到 `ivch` 时，协议处理函数还没跑。
39: 
40: ---
41: 
42: ## 1. `ivch`（INVENTORY_CHNG）— 背包物品，**绝对值**
43: 
44: | 项 | 内容 |
45: |---|---|
46: | 形态 | `{ "<itemID>": <变更后的绝对数量> }` |
47: | 消费者的赋值方式 | `e.setItem(parseInt(n), o[n])` —— **赋值**，不是累加 |
48: | 主消费点 | `index.js:64674-64677` |
49: | 原文 | `64674: r.MessageCenter.on(a.HttpConst.INVENTORY_CHNG, function(t, o) {`<br>`64675: for (var n in o) i.getItem(n, "lh_temporary") ? b.TowerModel.setItem(n, o[n]) : e.setItem(parseInt(n), o[n]);`<br>`64676: w.TaskModel.taskTrack(w.TaskModel.trackTaskId);`<br>`64677: }, this);` |
50: | 次消费点（当"格子 id"用） | `index.js:64730`（SELL_ITEM）、`64747`（BUY_SHOP_ITEM）——只取**第一个键**当 `itemId` 派发给 `SHOP_BUY_ITEM`，不读值：<br>`64730: ... for (var n in o.note.ivch) i = Number(n); else if (o.note.hasOwnProperty("eqch") ...` |
51: | 次消费点（当奖励显示用） | `index.js:64914-64916`（ADD_ITEM）：`var i = o.note.ivch; v.default.addShowRewardUI1(i, 0);`——直接把整张表当 `{itemID: num}` 奖励列表渲染 |
52: | rogue 模式 | `scripts3.js:73882-73884`：`case "ivch": for (var p in c) t.setItem(parseInt(p), c[p]);`（rogue 分发器走 `HttpConst.ROGUE_CHNG`，其 payload 里再嵌 `ivch`/`eqch`/`eco`/`attrch`，见 `scripts3.js:72040-72053` 的 testFunc 样例） |
53: | 我方写者 | `saleItem`（L2379）、`buyShopItem`（L2421）、`buySpecialShopItem`（L2470）、`BuyAcitivityShop`（L2546）、`exchangeItem`（L2619-2624）、`buyGoodAndEvilShopItem`（L2676）、`rgShopByItem`（L2726）、`QuickBuyItem`（L2755）、`BuyFashion`（L1839）、`useItem`（L2270）、书路径 `upgradeSkill`（L1389） |
54: | 已知坑 | 发增量会污染客户端背包（客户端是赋值）。`bz-rpc-server.js:2347` 注释、`2168` 注释都记了这条。 |
55: 
56: ---
57: 
58: ## 2. `eqch`（EQ_CHNG）— 装备实例账本，两种形态
59: 
60: | 项 | 内容 |
61: |---|---|
62: | 形态 | `{ "<uid>": [0] }` = 删除；`{ "<uid>": [1, [type, num, (weaponSkinId)]] }` = 新增/更新 |
63: | 主消费点 | `index.js:64678-64694` |
64: | 原文 | `64679: for (var i in o) if (0 == o[i][0]) {`<br>`64680:   e.deleteEq(parseInt(i));`<br>`64681:   e.setItemChecked([ parseInt(i) ], 1);`<br>`64682: } else {`<br>`64683:   var n = e.getEquipmentInfo(parseInt(i));`<br>`64684:   if (n && 1 == n.type) {`<br>`64685:     n.num = o[i][1][1];`<br>`64686:     o[i][1].length > 2 && (n.weaponSkinId = o[i][1][2]);`<br>`64687:   } else {`<br>`64688:     var r = e.parseEq(parseInt(i), o[i][1]);`<br>`64689:     e.equipmentDic.hasOwnProperty(i) && ... \|\| e.signNewItems([ i ], 1);`<br>`64690:     e.addEq(r);` |
65: | 取值细节 | 数量在 `o[i][1][1]`（第二层第二个），皮肤在 `o[i][1][2]`；`[0]` 为 0 时**不看后面的内容**，直接删 |
66: | 次消费点 | `index.js:64730/64747`（只取第一个键当 `itemId`）；`64917-64920`（ADD_ITEM：`var r = o.note.eqch, a = {}; for (var s in r) a[s] = r[s][1];` —— 这里把 `r[s][1]` 当数量渲染，**与 64685 的 `o[i][1][1]` 不是同一层**） |
67: | rogue 模式 | `scripts3.js:73886-73896` |
68: | 我方写者 | `BuyFashion`（L1859 `note.eqch[gr.id] = [1, clone(s.playerEquip[gr.id])];`）、`saleItem`（L2341 `eqch[id] = (leftE > 0) ? [1, s.playerEquip[id]] : [0];`）、各商店动作（L2423/2471/2547/2623/2677/2728/2756） |
69: | 已知坑 | `bz-rpc-server.js:1765` 注释：时装（`parseEq` 进来的实例）**必须先 `note.eqch` 塞进客户端装备账本**，否则 `.id` 抛异常。 |
70: 
71: ---
72: 
73: ## 3. `eco`（ECONOMY_CHNG）— 钱包，按子键分派
74: 
75: | 项 | 内容 |
76: |---|---|
77: | 形态 | `{ "<子键>": <绝对值> }` |
78: | 主消费点 | `index.js:64698-64724`，`switch(o)` 逐子键赋值 |
79: | 已证子键 | `coins`→`RoleBaseInfo.coins`（64700-64701）／`ptt`→`RoleBaseInfo.potentials`（64704-64705）／`gold`→`RoleBaseInfo.gold`（64708-64709）／`exp`→`playerInfo.entity.exp` 与 `RoleBaseInfo.exp`（64712-64714）／`chips`→`RoleBaseInfo.chipNum`（64717-64718）／`yuanbao`→`RoleBaseInfo.yuanbao`（64721-64722） |
80: | 附带动效 | 64724 `r.MessageCenter.dispatch(s.EvName.SHOP_BUY_ITEM);` —— 每次 `eco` 都会额外派一次 `SHOP_BUY_ITEM` |
81: | 次消费点 | `scripts3.js:23125`（BUTLER_DISPATCH）：`l.RoleBaseInfo.yuanbao = o.note.eco.yuanbao;` —— **直接取值不判空**，缺 `yuanbao` 会赋 `undefined` |
82: | rogue 模式 | `scripts3.js:73917-73922`：`case "eco": if (c.hasOwnProperty("coins")) { i.RogueRoleInfo.coins = c.coins; ...dispatch(ROGUE_REFRESH_COINS); }`，**rogue 只认 `coins`** |
83: | 我方写者 | `saleItem`（L2379 `eco: { coins: s.coins }`）、`buyShopItem`（L2421）、`buySpecialShopItem`（L2470 `{ gold: s.gold }`）、`BuyAcitivityShop`（L2546）、`exchangeItem`（L2622 `note.eco = ecoGain`）、`QuickBuyItem`（L2755）、`BuyFashion`（L1839）、`upgradeSkill`（L1357/1387/1409/1416/1426 `{ ptt: pot }`） |
84: | 已知坑 | 货币**不进 `ivch`**：客户端取货币只认 `RoleBaseInfo.getItemNum`（`bz-rpc-server.js:2622` 注释）。 |
85: 
86: ---
87: 
88: ## 4. `skch`（SKILL_CHANGE）— 技能三元组，且"0 级"是删除信号
89: 
90: | 项 | 内容 |
91: |---|---|
92: | 形态 | `{ "<skillID>": [lv, upgrdPgr, brlv] }` |
93: | 主消费点 | `index.js:119828-119841` |
94: | 原文 | `119829: for (var o in e) {`<br>`119830:   var n = parseInt(o);`<br>`119831:   if (e[o][0] > 0) {`<br>`119832:     s.SkillTable.setSkill(n, e[o][0]);`<br>`119833:     s.SkillTable.setUpgrdPgr(n, e[o][1]);`<br>`119834:     s.SkillTable.setBrLv(n, e[o][2]);`<br>`119835:   } else 0 == e[o][0] && s.SkillTable.abolishSkill(n);` |
95: | **关键语义** | `e[o][0] == 0` ⇒ **`abolishSkill` 删技能**。所以下发 `lv=0` 不是"没升级"，是"删掉这个技能"。 |
96: | 次消费点（只弹提示、不写模型） | `index.js:64757-64763`（USE_ITEM）：`if (a.note.hasOwnProperty("skch")) { var h = a.note.skch, u = 0; for (var f in h) u = Number(f); if (u > 0) { var d = i.getItem(u, "skill"); c.default.show(n.getText(422).replace(/\[67\]/g, n.getText(d.Name))); } }` —— 只取**第一个键**去弹「恭喜你学会了[67]」，**不读三元组** |
97: | rogue 模式 | `scripts3.js:73899-73910`（`case "skch"`）、`73950-73956`（ROGUE_USE_ITEM 同款弹窗） |
98: | 我方写者 | `upgradeSkill`（L1388 `bookNote.skch[id] = [newLv, 0, newBrlv];`、L1417 `kept.skch[id] = [curLv, keptPgr, keptBrlv];`、L1427 `note.skch[id] = [lv, reqPgr, reqBrlv \|\| 1];`）、`useItem`（L2189 `note.skch[pendingSkill] = [1, 0, 1];`）、`joinSchool`（L1296 空表） |
99: | 已知坑 | `bz-rpc-server.js:1400-1409`：**绝不下发 `lv=0` 的 `skch`**，否则客户端把技能删了（`setSkill` 不过滤 0，L1401 注释）。 |
100: 
101: ---
102: 
103: ## 5. `attrch`（ATTR_CHANGE）— 属性变更，键最多的一张
104: 
105: | 项 | 内容 |
106: |---|---|
107: | 形态 | `{ "<属性名>": <绝对值> }` |
108: | 主消费点 | `index.js:142390-142440+`，`switch(i)` |
109: | 已证子键 | `mpTrained`→`entity.mpTrainedBonus.baseValue`（142392-142395，且被 `SkillUtils.getMaxNGBonus()` 夹住）／`mpbase`→`entity.mp.baseValue`（142398）／`hpbase`→`entity.hp.baseValue`（142402）／`curmp`→`entity.mp.setRemaining`（142406）／`curhp`→`entity.hp.setRemaining`（142410）／`hplmt`→`entity.hp.setLimit`（142414）／`exp`→`entity.exp`（142418）／`evil`→`entity.evilness`（142422）／`school`→`entity.school` + `RoleBaseInfo.school`（142426）／`seniorSchool`→`RoleBaseInfo.goodEvilCamp`（142431）／`ndeath`→`entity.numDeaths` + `RoleBaseInfo.numDeaths`（142435）／`hunger`→（142440 起，`case "hunger"` 直接赋值，客户端不做本地应用） |
110: | 另一处只认单键 | `index.js:64779-64782`（USE_ITEM）：`if (a.note.hasOwnProperty("attrch") && a.note.attrch.hasOwnProperty("mpTrained")) { l.RoleBaseInfo.mpTrained = a.note.attrch.mpTrained; }` |
111: | 第三处只认单键 | `index.js:138892`（END_DAZUO）：`o.note.hasOwnProperty("attrch") && o.note.attrch.hasOwnProperty("mpTrained") && (d.RoleBaseInfo.mpTrained = o.note.attrch.mpTrained);` |
112: | rogue 模式 | `scripts3.js:73924-73926`（`case "attrch": t.chAttr(c);`）、`73968-73970`（`i.RogueRoleInfo.mpTrained = o.note.attrch.mpTrained;`） |
113: | rogue 的另一套子键 | `scripts3.js:72044-72048` 的样例：`attrch: { curhp: 13696, curmp: 7300, hplmt: 13696 }` |
114: | 我方写者 | `useItem`（L2212 `note.attrch = { hunger: newHg };`、L2230 `curhp`、L2240 `curmp`）、`joinSchool`（L1296 空表） |
115: | 已知坑 | `bz-rpc-server.js:44`：`hg` 非法就**不发** `note.attrch`，绝不把脏值写进客户端模型；L2196 说明：非数字/负数/超 `1e7` 一律记日志跳过。 |
116: 
117: ---
118: 
119: ## 6. 汇总表
120: 
121: | 子表 | 事件名 | 键 | 值 | 客户端主消费点 | "绝对值 vs 增量" | 我方是否已发 |
122: |---|---|---|---|---|---|---|
123: | `ivch` | `"ivch"` | `itemID` | 绝对数量 | `index.js:64674` | **绝对值（赋值）** | 是（10 个 handler） |
124: | `eqch` | `"eqch"` | `uid` | `[0]` 或 `[1,[type,num,skin?]]` | `index.js:64678` | 全量覆盖/删除 | 是（9 个 handler） |
125: | `eco` | `"eco"` | `coins/ptt/gold/exp/chips/yuanbao` | 绝对数量 | `index.js:64698` | **绝对值** | 是（8 个 handler） |
126: | `skch` | `"skch"` | `skillID` | `[lv, pgr, brlv]` | `index.js:119828` | 全量覆盖；`lv=0` = **删技能** | 是（`upgradeSkill`/`useItem`） |
127: | `attrch` | `"attrch"` | 属性名（12+ 个已证） | 绝对数量 | `index.js:142390` | **绝对值** | 是（`useItem` 的 hunger/curhp/curmp） |
128: 
129: `note` 本身为空对象 `{}` 时客户端行为：总闸 `for..in` 零次迭代，不派任何事件（`bz-rpc-server.js` 多处 `note: {}` 即走这条）。
130: 
131: ---
132: 
133: ## 7. 未验证 / 未覆盖
134: 
135: 1. `index.js:64698` 与 `142390` 的两个 `switch` 未读到 `}` 结尾，子键清单可能还有未列出的（本轮只读到 64724 / 142440）。
136: 2. `scripts2.js` 内**零命中**五个 token（0 处），但这不等于 scripts2 不消费——它可能通过 `EvName.*` 常量间接引用，本轮未做常量展开。
137: 3. `note` 里除这五个之外还有没有其它键被服务端用过（例如 `autoObj` 是同级而非 note 内），未穷举。
138: 4. `skch` 三元组第三个值 `brlv` 的合法范围（我方向下发了 `brlv: 0`，见 `bz-rpc-server.js:1388`），客户端 `setBrLv` 是否接受 0，未取证。
````

（"子表"小节标题即上文的 `## 1.`~`## 5.`（行 42/58/73/88/103），另有 `## 0.`（行 9）、`## 6. 汇总表`（行 119）、`## 7.`（行 133）。）

---

## G. r21\M1-动作全集表.tsv

命令原文（行数与表头，PowerShell）：

```powershell
$f="F:\BaoZouyxt\midaudit-v21\r21\M1-动作全集表.tsv"; $raw=Get-Content -LiteralPath $f -Raw; $lines=$raw -split "`r?`n"; "rawSplitCount=" + $lines.Count; $gc=(Get-Content -LiteralPath $f).Count; "getContentLineCount=" + $gc; $ne=@($lines | Where-Object { $_.Trim().Length -gt 0 }); "nonEmptyLines=" + $ne.Count; "emptyLines=" + ($lines.Count - $ne.Count); "LINE1=" + $ne[0]; $cols=$ne[0] -split "`t"; "colCount=" + $cols.Count; for($i=0;$i -lt $cols.Count;$i++){ "col[$i]=$($cols[$i])" }
```

退出码 0。输出原文：

```text
rawSplitCount=1127
getContentLineCount=1126
nonEmptyLines=1126
emptyLines=1
LINE1=KEY	VALUE	handler	on	send	code
colCount=6
col[0]=KEY
col[1]=VALUE
col[2]=handler
col[3]=on
col[4]=send
col[5]=code
```

命令原文（基数/样例/分布，node）：

```powershell
node -e 'const fs=require(`fs`);const t=fs.readFileSync(`F:/BaoZouyxt/midaudit-v21/r21/M1-动作全集表.tsv`,`utf8`);const lines=t.split(/\r?\n/);if(lines[lines.length-1]===``){lines.pop();}const ne=lines.filter(l=>l.trim().length>0);console.log(`nonEmptyDataLines(incl header)=`+ne.length);const hdr=ne[0].split(`\t`);const card=hdr.map(()=>new Set());for(let i=1;i<ne.length;i++){const c=ne[i].split(`\t`);hdr.forEach((h,j)=>{card[j].add(c[j]===undefined?``:c[j]);});}hdr.forEach((h,j)=>console.log(`col[`+j+`] `+h+` unique=`+card[j].size));console.log(`ROW2=`+JSON.stringify(ne[1]));console.log(`ROW3=`+JSON.stringify(ne[2]));console.log(`ROW4=`+JSON.stringify(ne[3]));'
```
及（分布）：
```powershell
node -e 'const fs=require(`fs`);const t=fs.readFileSync(`F:/BaoZouyxt/midaudit-v21/r21/M1-动作全集表.tsv`,`utf8`);const lines=t.split(/\r?\n/);if(lines[lines.length-1]===``){lines.pop();}const ne=lines.filter(l=>l.trim().length>0);const hdr=ne[0].split(`\t`);const dist=hdr.map(()=>({}));for(let i=1;i<ne.length;i++){const c=ne[i].split(`\t`);hdr.forEach((h,j)=>{const v=c[j]===undefined?``:c[j];dist[j][v]=(dist[j][v]||0)+1;});}console.log(`dataRowsExclHeader=`+(ne.length-1));hdr.forEach((h,j)=>{const e=dist[j];const n=Object.keys(e).length;if(n<=10){console.log(`col[`+j+`] `+h+` dist=`+JSON.stringify(e));}else{console.log(`col[`+j+`] `+h+` uniqueValues=`+n);}});'
```

两条命令退出码均 0。第二条输出原文：

```text
dataRowsExclHeader=1125
col[0] KEY uniqueValues=1125
col[1] VALUE uniqueValues=1124
col[2] handler dist={"0":1043,"1":82}
col[3] on dist={"0":222,"1":903}
col[4] send dist={"0":381,"1":744}
col[5] code dist={"0":1109,"1":16}
```

第一条 node 命令另输出样例行：

```text
nonEmptyDataLines(incl header)=1126
col[0] KEY unique=1125
col[1] VALUE unique=1124
col[2] handler unique=2
col[3] on unique=2
col[4] send unique=2
col[5] code unique=2
ROW2="QUICK_LOGIN\tUser.quicklogin\t1\t1\t1\t0"
ROW3="USER_LOGIN\tUser.login\t0\t0\t0\t0"
ROW4="USER_CREATE\tUser.Create\t1\t1\t1\t0"
```

**结论（机械判定）**：
- G-总行数：Get-Content 计 **1126 行**（非空 1126、空行 1 = 文件末尾换行产生的空串；`-split` 原始计数 1127 含该空串）。**不含表头的数据行 = 1125**。
- G-表头第一行（TAB 以真实制表符呈现）：`KEY	VALUE	handler	on	send	code`。
- G-"动作类型/类别"字段：**表头 6 列（KEY、VALUE、handler、on、send、code）中不存在名称含"动作/类型/类别"的列**。替代口径：给出全部 6 列取值情况——KEY 唯一值 1125（全行唯一）、VALUE 唯一值 1124（有 1 个重复值）；低基数列分布：handler：0→1043、1→82；on：0→222、1→903；send：0→381、1→744；code：0→1109、1→16（各列 1043+82=222+903=381+744=1109+16=1125，自洽）。

---

## H. r21\M2-客户端读点索引.md（640,965 字节）

命令原文：

```powershell
$f="F:\BaoZouyxt\midaudit-v21\r21\M2-客户端读点索引.md"; "TOTAL=" + (Get-Content -LiteralPath $f -Encoding UTF8).Count; "--- HEADINGS level1/2 (UTF8) ---"; Select-String -LiteralPath $f -Encoding UTF8 -Pattern "^#{1,2}($|[^#])" | ForEach-Object { "{0}: {1}" -f $_.LineNumber, $_.Line }; "--- FIRST 30 LINES (UTF8) ---"; $i=0; Get-Content -LiteralPath $f -Encoding UTF8 -TotalCount 30 | ForEach-Object { $i++; "{0}: {1}" -f $i, $_ }
```

退出码 0。输出原文：

```text
TOTAL=16802
--- HEADINGS level1/2 (UTF8) ---
1: # M2 客户端读点索引
7: ## 统计
--- FIRST 30 LINES (UTF8) ---
1: # M2 客户端读点索引
2: 
3: > 数据源：`tools\index.js`（149,447 行）、`tools\scripts2.js`（81,775 行）、`tools\scripts3.js`（100,428 行）。
4: > 生成器：本目录 `_gen_m2_v2.js`（字符串感知的花括号配对 + 回调第二参数定向抽取），可原样重跑。
5: > 抽取口径：只认 `MessageCenter.on(...)` 注册点；字段只认**回调第二参数**（应答对象）上的读取，方法名与内建属性已排除。
6: 
7: ## 统计
8: 
9: - `MessageCenter.on(` 注册总处数：**2336**
10: - 其中内联函数体 **1816** 处，命名处理器（`this.xxx`）**520** 处，解析失败 **0** 处
11: - 抽到的应答字段读取条目：**1796**
12: - 去重后的动作名（事件名 / `HttpConst` 常量名）：**2216**
13: 
14: > 命名处理器形态（`on(EVT, this.onXxx, this)`）的函数体在另一个方法里，本工具**不内联展开**，该形态只记注册位置与处理器名。
15: 
16: 
17: ### _  [tools/index.js:69784]
18: 
19: - 事件名来源：其它表达式｜注册形态：内联函数｜处理器：`(t)`｜函数体 69793-69795
20: - 未抽到应答字段读取
21: 
22: 
23: ### _.EvName.CLOSE_STORE  [tools/scripts3.js:16466]
24: 
25: - 事件名来源：其它表达式｜注册形态：内联函数｜处理器：`()`｜函数体 16468-16475
26: - 未抽到应答字段读取
27: 
28: 
29: ### _.EvName.SHOP_BUY_ITEM  [tools/scripts3.js:16465]
30: 
```

**结论（机械判定）**：
- H-总行数 = **16802**（UTF8 解码）。
- H-一级/二级标题（正则 `^#{1,2}($|[^#])`，即排除三级 `###`）仅 2 条：行 1 `# M2 客户端读点索引`、行 7 `## 统计`。文件内大量 `###` 为三级标题，按任务口径不在抽取范围。

---

## I. r21\R21-回执.md 与 r21\29-R21-送评材料-全量.md 的标题行

命令原文：

```powershell
$f1="F:\BaoZouyxt\midaudit-v21\r21\R21-回执.md"; $f2="F:\BaoZouyxt\midaudit-v21\r21\29-R21-送评材料-全量.md"; "--- R21-回执.md TOTAL=" + (Get-Content -LiteralPath $f1 -Encoding UTF8).Count; Select-String -LiteralPath $f1 -Encoding UTF8 -Pattern "^#" | ForEach-Object { "{0}: {1}" -f $_.LineNumber, $_.Line }; "--- 29-R21-送评材料-全量.md TOTAL=" + (Get-Content -LiteralPath $f2 -Encoding UTF8).Count; Select-String -LiteralPath $f2 -Encoding UTF8 -Pattern "^#" | ForEach-Object { "{0}: {1}" -f $_.LineNumber, $_.Line }
```

退出码 0。输出原文：

```text
--- R21-回执.md TOTAL=351
1: # R21 回执 · 路线（2026-10-23）
19: ## D1 目标与完成定义
72: ## D2 架构分层
109: ## D3 协议与状态
147: ## D4 验证体系
185: ## D5 工作量与路径
308: ## D6 工作流程
344: ## ② 材料充分性（只列判不了的）
--- 29-R21-送评材料-全量.md TOTAL=384
1: # 送评材料 · 全量（2026-10-23）
10: ## 一、用户诉求（原文）
25: ## 二、项目定义与边界（原文）
33: ## 三、运行环境与注入形态
47: ## 四、分层架构与数据流
76: ## 五、线协议与信封
90: ## 六、动作面（实测构成）
109: ## 七、`note` 五子表（本项目最易错的一层）
136: ## 八、状态与账本模型
166: ## 九、物品与效果族（"全量还原"的主战场）
187: ## 十、验证体系
213: ## 十一、已知缺口（21 项，原文照录）
241: ## 十二、已实现的行为（按系统）
260: ## 十三、材料可信度边界
277: ## 十四、现场三态（设备 / 仓库）
291: ## 十五、与前批已发材料（26 号 R19 / 27 号 R20）的四条差异更正
306: ## 十六、本轮任务（编号，按 `00-INSTRUCTION.txt` 的约束作答）
339: ## 十七、送评方式与输出格式
363: ## 十八、本文不含
369: ## 十九、与 R18 回执的逐条对应（补齐断链）
```

**结论（机械判定）**：R21-回执.md 共 351 行、以 `#` 开头的标题行 8 条；29-R21-送评材料-全量.md 共 384 行、标题行 21 条（均含行号如上，无一、二级之分因文件内只有 `#`/`##`）。

---

## J. bz-oracle\config 五个文件全文

### J-1. config\known-survivors.json（6 行 / 473 字节）

````text
1: {
2:   "_说明": "裁判已知抓不到的变异。每条必须写原因和补法；补上后删掉这一条。mutate.js --allow-survivors 时，存活集合必须与本表完全一致（多一个、少一个都判失败）。",
3:   "survivors": [
4:     {"mutator": "M09.sell_overpay", "case": "saleItem.equip90001", "why": "装备出售价的规则表未取证（哪张表、哪一列）", "fix": "S7：在 rules.json 写出装备出售守恒式后，此条应被击杀"}
5:   ]
6: }
````

### J-2. config\oracle.config.json（36 行 / 1,713 字节）

````text
1: {
2:   "_说明": "裁判配置。标 TODO 的项需按仓库真实值替换；其余取自 R21 材料，括号里是出处。",
3:   "payActionRe": "(?i)(pay|recharge|order|product|wxPay|aliPay|IphonePay|IosChooseProduct|PaymentCallBack|getPaySginData|h5Pay)",
4:   "_payActionRe_TODO": "替换为 bz-rpc-server.js 里真实的 PAY_ACTION_RE（全量 §二）；默认正则只是按 M1 动作名猜的",
5:   "payBlockedERet": 4,
6:   "noteKeys": {
7:     "known": ["ivch", "eqch", "eco", "skch", "attrch", "gemch"],
8:     "_来源": "M4 §0 五键 + M2 scripts3.js:24482 的 note.gemch"
9:   },
10:   "eco": {
11:     "keys": ["coins", "ptt", "gold", "exp", "chips", "yuanbao"],
12:     "saveMap": { "coins": "coins", "ptt": "potential", "gold": "gold", "yuanbao": "yuanbao", "chips": "chip" },
13:     "_来源": "M4 §3 已证子键；saveMap 来自 M3 §1"
14:   },
15:   "attrch": {
16:     "known": ["mpTrained", "mpbase", "hpbase", "curmp", "curhp", "hplmt", "exp", "evil", "school", "seniorSchool", "ndeath", "hunger"],
17:     "unknownIs": "WARN",
18:     "hungerMax": 10000000,
19:     "_来源": "M4 §5；switch 未读到结尾（M4 §7.1），所以未知键只报 WARN"
20:   },
21:   "currencyItemIds": [1, 4001, 4002, 4003, 8888],
22:   "_currency来源": "全量 §七 货币 id → 钱包；货币不得进背包（M4 §3 已知坑）",
23:   "paidCurrencyKeys": ["yuanbao"],
24:   "volatileKeyRe": "([Tt]ime|[Ss]tamp|^now$|^ts$|serverT)",
25:   "idKeyRe": "^(roleID|account|uid|token|sessionId)$",
26:   "snapshotDomains": ["bag", "wallet", "skills", "equips", "attrs"],
27:   "l2": {
28:     "expectedFromSave": {
29:       "bag": "save.bag (去掉 0 值)",
30:       "wallet": "eco.saveMap 映射",
31:       "skills": "save.skills",
32:       "equips": "save.playerEquip"
33:     }
34:   },
35:   "toastAllow": []
36: }
````

### J-3. config\contract-overrides.json（52 行 / 1,680 字节）

````text
1: {
2:   "_说明": "M2 抽不到、但材料有证据的契约补充。每条写来源。S2 跨函数抽取落地后，这里的条目应由抽取器产出，人工条目逐步清零。",
3:   "actions": {
4:     "USER_LOADGAME": {
5:       "action": "User.LoadGame",
6:       "required": [
7:         "finishTaskObj",
8:         "acceptTaskArray",
9:         "acceptTaskOrder",
10:         "taskLog",
11:         "itemObj",
12:         "PlayerEquip",
13:         "equipments",
14:         "cycleObj",
15:         "OnhookObj.serverTime",
16:         "baseValueAy"
17:       ],
18:       "shapes": {
19:         "finishTaskObj": "stringArray:^\\d+,\\d+$",
20:         "baseValueAy": "arrayLen:44",
21:         "itemObj": "fullBag"
22:       },
23:       "closedBy": "全量 §八 必回字段表（跨函数读取，M2 记 0 读取）",
24:       "closed": true,
25:       "_itemObj": "【推断】LoadGame 的 itemObj 也是全量重建，回空等同清空背包；由变异 M07 在 LoadGame 上存活发现"
26:     },
27:     "SYCN_TASK": {
28:       "action": "User.sycnTask",
29:       "shapes": {
30:         "PlayerFinishTaskObj": "objectOf:number"
31:       },
32:       "_来源": "全量 §八：PlayerFinishTaskObj 要对象 {\"101080\":1}；KEY 名以 M1 为准，若不符请改"
33:     },
34:     "SYCNPLAYERITEAMDATA": {
35:       "action": "User.sycnPlayerItemData",
36:       "required": [
37:         "itemObj"
38:       ],
39:       "shapes": {
40:         "itemObj": "fullBag"
41:       },
42:       "_来源": "全量 §八：回空 = 背包清空；itemObj 必须等于全部持有物"
43:     },
44:     "BEGIN_LIANGONG": {
45:       "action": "User.BeginTraining",
46:       "switchZeroAllowed": [
47:         "isCollective"
48:       ],
49:       "_来源": "全量 §八：isCollective 的 0 是语义分支，index.js:120523"
50:     }
51:   }
52: }
````

### J-4. config\capture.json（6 行 / 213 字节）

````text
1: {
2:   "_说明": "人工判定的 CAPTURE / OUT 名单（注册表读取）。每条写依据；效果族分类器给出 CAPTURE-SUSPECT 后再人工确认加入。",
3:   "capture": [],
4:   "out": [],
5:   "_依据": {}
6: }
````

### J-5. config\plan.example.json（11 行 / 643 字节）

````text
1: {
2:   "_说明": "设备端 dual 计划示例。先 backup，最后 restore；restore 后需重启进程或触发 LoadGame 才能让客户端模型同步。req 的参数请按真实物品/技能 id 改。",
3:   "steps": [
4:     {"op": "status"},
5:     {"op": "backup", "tag": "before-oracle"},
6:     {"op": "dual", "req": {"mod": "User", "do": "saleItem", "p": {"itemID": 2001, "num": 1}}},
7:     {"op": "dual", "req": {"mod": "User", "do": "useItem", "p": {"itemID": 3001, "num": 1}}},
8:     {"op": "dual", "req": {"mod": "User", "do": "upgradeSkill", "p": {"NPCID": 1003, "skillID": 1262, "flag": 0}}},
9:     {"op": "restore", "tag": "before-oracle"}
10:   ]
11: }
````

---

## 附录 1：行数统计命令与"编码更正"记录

行数复测命令原文（退出码 0）：

```powershell
foreach($p in @("r21\M4-note五子表语义表.md","bz-oracle\out\dashboard.md","bz-oracle\out\material-counts.md","bz-oracle\out\report.json","bz-oracle\out\mutation.json","bz-oracle\out\replay-report.json","bz-oracle\config\known-survivors.json","bz-oracle\config\oracle.config.json","bz-oracle\config\contract-overrides.json","bz-oracle\config\capture.json","bz-oracle\config\plan.example.json")){ $full=Join-Path "F:\BaoZouyxt\midaudit-v21" $p; "{0}  linesUTF8={1} bytes={2}" -f $p,(Get-Content -LiteralPath $full -Encoding UTF8).Count,(Get-Item -LiteralPath $full).Length }
```

**更正记录**：首轮对 r21 各 md 未指定编码（PS 5.1 默认按 ANSI/GBK 解码 UTF-8 文件），中文字节被成对吞读时会把 0x0A 一并吞掉，导致行数偏小并出现乱码（R21-回执 241→实际 351；29-送评 303→实际 384；M2 15009→实际 16802；M4 119→实际 138）。本报告一律采用 `-Encoding UTF8`（或 node 以 utf8 读取）的复测值；TSV 为纯 ASCII，不受影响。

**命令失败记录（已修复，不影响任何最终数字）**：首轮 3 条 node 探针（contracts/registry/stubs）以 `node -e '...双引号字符串...'` 提交，PowerShell 5.1 向原生命令传参时剥掉了内嵌双引号，node 报 `SyntaxError: missing ) after argument list`，退出码 1（stderr 首行为 `[eval]:1 const fs=require(fs);const j=JSON.parse(fs.readFileSync(F:/BaoZouyxt/midaudit-v21/bz-oracle/out/contracts.json,utf8));...`）。三份报错同型。修复：JS 内一律改用反引号模板字符串（不含任何双引号/单引号）重跑，全部退出码 0。本报告所有数字均来自修复后的命令。

---

## 附录 2：未验证 / 未覆盖清单

1. **G 项"动作类型/类别"字段未按字面存在**：TSV 表头（KEY/VALUE/handler/on/send/code）中没有名称含"动作/类型/类别"的列，故以"每列基数 + 低基数列全分布"替代；KEY/VALUE 两列（高基数名称列，1125/1124 个唯一值）的逐值分布未输出（超出封闭清单需要；如需可用同口径 node 命令补出）。
2. **stubs.json 的 eRet 判定口径**："响应体中含 eRet" 采用 `JSON.stringify(响应体).includes('"eRet"')` 的封闭口径，结果 648/648 全含；未做"eRet 键是否顶层"的区分（第 1 条样例与 eRet 值分布 1×619、4×29 已给出）。
3. **contracts.json 的 `byAction`/`contracts` 键名清单**：探针已用 `Object.keys` 逐个打出（数百项），因过长报告中仅保留 TOPKEYS 行与计数（1028），未逐条抄录全部键名。
4. **M2-客户端读点索引.md（16,802 行）** 按任务只抽取了总行数、一/二级标题、前 30 行；其余 16,770 余行未读取。三级标题（`###`，数量未统计）不在抽取口径内。
5. **R21-回执.md 与 29-R21-送评材料-全量.md** 按任务只抽取标题行；两文件正文未读取。
6. **跨文件一致性只做机械比对**（如 contracts `__meta.closed=502` 与实算 502 一致、registry `counts` 与实算分布一致、TSV send=1 共 744 与 registry `__meta.reqTotal=744` 相同），未做任何语义判断或评价。

---

## 结果速览（各条结论数字 + 证据位置）

| 项 | 结论 | 证据 |
|---|---|---|
| A1 | 顶层键 = `["__meta","byAction","contracts"]` | 本章 A-1 命令+输出 |
| A2 | 契约总数 = 1028 | A-2 `contractsCount=1028` |
| A3 | 闭合字段 = 布尔 `closed`（无 status 字段） | A-2 样例条目原文 |
| A4 | closed=true 502 / false 526 / 其他 0 | A-2 `closedFieldTrue=502 closedFieldFalse=526 closedFieldOther=0` |
| B | registry 总数 1125；PUSH 192、DEAD 189、ALT 16、OUT 29；status 分布见表 | B-统计输出原文 |
| C | stubs 648 条；第 1 条 `User.AnswerFriend: {"eRet":1}`；含 eRet 的 648/648；eRet 值 1×619、4×29 | C-统计输出原文 |
| D | report.json（PASS, 11/11）、mutation.json（killRate 0.9886…，88 变异杀 87）、replay-report.json（FAIL，judge 9/11）全文在本章 D | 全文带行号 |
| E | dashboard.md 58 行、material-counts.md 21 行全文在本章 E | 全文带行号 |
| F | M4 138 行全文逐行抄录（子表小节：行 42/58/73/88/103） | 本章 F |
| G | TSV 数据行 1125（总行 1126）；表头 KEY/VALUE/handler/on/send/code；无"动作类型/类别"列；handler 0:1043/1:82、on 0:222/1:903、send 0:381/1:744、code 0:1109/1:16 | 本章 G 命令+输出 |
| H | M2 总行 16802；一/二级标题仅 2 条（行 1、7）；前 30 行原文在本章 H | 本章 H 命令+输出 |
| I | R21-回执 351 行、标题 8 条；29-送评 384 行、标题 21 条（均带行号） | 本章 I 输出原文 |
| J | 5 个 config 文件全文在本章 J | 全文带行号 |
