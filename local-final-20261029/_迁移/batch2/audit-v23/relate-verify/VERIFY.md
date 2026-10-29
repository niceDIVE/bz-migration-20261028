# 复核结果

只读复核，未作判断、未给建议。复核对象与落点：
- 安装位：`F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\`（rw.json、out\registry.json、forge\analysis\{README.md,extract_rw.py,relate.py}、out\relations.md、rw.err.txt）
- 副本位：`F:\BaoZouyxt\audit-v23\relate-result-20261024\`（rw.json、relations.json、relations.md）
- 包位：`F:\BaoZouyxt\_incoming\relate-pack-20261024\bz-oracle\forge\analysis\`
- 源码：`F:\BaoZouyxt\hotfix-patch\core\bz-rpc-server.js`

环境：`python --version` → `Python 3.13.2`（退出码 0）。所有 python 调用均为
`cmd /c 'chcp 65001>nul && set "PYTHONUTF8=1" && python <脚本>'`，退出码用 `$LASTEXITCODE` 取。
脚本全部写在新目录 `F:\BaoZouyxt\audit-v23\relate-verify\`；未跑 relate.py；未 pip install；除该目录外未创建/修改/删除/移动任何文件。

---

## V1 rw.json 动作条数 + stderr 原文

**命令 1（原样）：**
```
cmd /c 'chcp 65001>nul && set "PYTHONUTF8=1" && python F:\BaoZouyxt\audit-v23\relate-verify\v1_rw.py'
```
**退出码：0**

关键输出原文：
```
file: F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\rw.json
  bytes: 881 md5: 221af07f04eb061a2e63467a3a088617
  top-level action count: 5
  keys: ['User.getFinishTaskAward', 'User.ReqSelfBattleInfo', 'User.CheckBattleResult', 'User.useItem', 'User.equipWeapon']
file: F:\BaoZouyxt\audit-v23\relate-result-20261024\rw.json
  bytes: 881 md5: 221af07f04eb061a2e63467a3a088617
  top-level action count: 5
rw.err.txt bytes: 35
rw.err.txt repr: b'\r\n# 5 \xe4\xb8\xaa\xe5\x8a\xa8\xe4\xbd\x9c\xe6\x8a\xbd\xe5\x88\xb0\xe5\xad\x98\xe6\xa1\xa3\xe8\xaf\xbb\xe5\x86\x99\r\n'
rw.err.txt text (decoded):
# 5 个动作抽到存档读写
```
stderr 那一行原文（`F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\rw.err.txt:2`，共 35 字节，前导 `\r\n` 来自 `extract_rw.py:26` 的 `print(f"\n# ...")`，行尾 `\r\n`）：

```
# 5 个动作抽到存档读写
```

**命令 2（复算，把 extract_rw.py 的 stdout/stderr 重定向到 relate-verify 目录，输入文件 md5 与 `运行凭证.md:38-42` 登记值一致）：**
```
cmd /c 'chcp 65001>nul && set "PYTHONUTF8=1" && python F:\BaoZouyxt\audit-v23\relate-verify\v1b_repro.py'
```
**退出码：0**

关键输出原文：
```
input 5953037bae2cd0b7a4462d44fd8413e9  184077 B  F:\BaoZouyxt\hotfix-patch\core\bz-rpc-server.js
input 75372dcc40f593aff2db099573aac5d0  35579 B  F:\BaoZouyxt\hotfix-patch\core\bz-handler-impl.js
input 290a6905f88a005e83a26e8a5c140fb1  17862 B  F:\BaoZouyxt\hotfix-patch\live\flow.js
exit code: 0
stderr bytes: 35 repr: b'\r\n# 5 \xe4\xb8\xaa\xe5\x8a\xa8\xe4\xbd\x9c\xe6\x8a\xbd\xe5\x88\xb0\xe5\xad\x98\xe6\xa1\xa3\xe8\xaf\xbb\xe5\x86\x99\r\n'
repro rw.json md5: 221af07f04eb061a2e63467a3a088617 881 B
same as artifact rw.json: True
```

**结论：rw.json 动作条数 = 5（两份副本 881 B、md5 均为 `221af07f04eb061a2e63467a3a088617`，逐字节相同）；stderr 那行原文为 `# 5 个动作抽到存档读写`，复算所得 stderr 与之逐字节相同。**

---

## V2 relations.md 的 "## 第" 行数 + relations.json 计数

**命令：**
```
cmd /c 'chcp 65001>nul && set "PYTHONUTF8=1" && python F:\BaoZouyxt\audit-v23\relate-verify\v2_md_json.py'
```
**退出码：0**

关键输出原文：
```
relations.md total lines: 233
lines starting with "## 第": 75
first: ## 第1批 · C02（9 个）  共享：rw:bag、token:BATTLE、field:equipObj、field:gemId
last : ## 第75批 · C75（2 个）  共享：field:num、token:DMG
clusters array len: 75
lone array len: 467
__meta.inScope = 699
__meta.edges = 242
__meta.clusters = 75
__meta.lone = 467
__meta.pairs = 14
__meta.rwUsed = True
top-level keys: ['__meta', 'clusters', 'lone', 'pairs', 'neighbors']
cluster size sum: 232
cluster order len sum: 232
lone[0]: 'ACCEPTCIRCLETASK'
```

补充取数（`v2b_extra.py`，退出码 0）：
```
md: '## 第' count=75  first=line7  last=line229
md: other '## ' headings: [(232, '## 孤立动作（467 个，直接套模板批量生成）')]
```

独立交叉核对（PowerShell，纯 cmdlet 无 `$LASTEXITCODE`，工具未报非零）：
```
$md='F:\BaoZouyxt\audit-v23\relate-result-20261024\relations.md'
$c=(Select-String -Path $md -Pattern '^## 第' -Encoding UTF8).Count
"md '^## 第' count = $c"
```
输出：`md '^## 第' count = 75`

**结论：`"## 第"` 开头行 75 行（relations.md:7 … relations.md:229）；clusters 数组 75、lone 数组 467；`__meta` 的 inScope=699、edges=242、clusters=75、lone=467，与数组实际长度及 232+467=699 逐一相符。**

---

## V3 并集检查（簇 order ∪ lone  vs  registry 在册键集）

**命令：**
```
cmd /c 'chcp 65001>nul && set "PYTHONUTF8=1" && python F:\BaoZouyxt\audit-v23\relate-verify\v3_union.py'
```
**退出码：0**

关键输出原文：
```
registry rows total: 1125
status counter: {'IMPL-UNJUDGED': 74, 'DEAD': 189, 'PUSH': 192, 'NEEDS-S2': 282, 'DONE': 6, 'GEN-READY': 317, 'OUT': 29, 'NO-CONTRACT': 20, 'ALT': 16}
A = |簇order ∪ lone| = 699  (order 232 + lone 467, raw 699)
B = |registry keys with status in SCOPE| = 699
A == B ? True
A-B count: 0 sample: []
B-A count: 0 sample: []
order dupes: 0
lone dupes: 0
overlap order∩lone: 0 []
```
（registry 侧 SCOPE 五个状态计数：GEN-READY 317 + NEEDS-S2 282 + IMPL-UNJUDGED 74 + DONE 6 + NO-CONTRACT 20 = 699。）

**结论：前者集合 699 个、后者集合 699 个、两者相等（A-B 差集 0 个，B-A 差集 0 个，簇 order 与 lone 无重复、无交叠）。**

---

## V4 bz-rpc-server.js 的 `var H = {` 一级 function 键数

**命令 1（配平扫描）：**
```
cmd /c 'chcp 65001>nul && set "PYTHONUTF8=1" && python F:\BaoZouyxt\audit-v23\relate-verify\v4_hkeys.py'
```
**退出码：0**

关键输出原文：
```
file: F:\BaoZouyxt\hotfix-patch\core\bz-rpc-server.js
chars: 148377
find("var H = {"): 43853  line: 1048
opening brace index: 43861  line: 1048
matching '}' index: 138038  line: 2893  span chars: 94178
body lines: 1845
depth-1 function keys: 87
regex matches rejected by depth/code check: 0
first 5 keys: ['GetServerList', 'ChooseServer', 'TellAction', 'quicklogin', 'CheckName']
first 5 keys with line: [('GetServerList', 1050), ('ChooseServer', 1054), ('TellAction', 1055), ('quicklogin', 1058), ('CheckName', 1072)]
last 3 keys with line: [('bzBackfillRewards', 2813), ('bzGrantCur', 2845), ('bzPatch', 2864)]
```

**命令 2（独立核对：按行正则数 1050–2892 行，PowerShell，退出码见下）：**
```
$f='F:\BaoZouyxt\hotfix-patch\core\bz-rpc-server.js'
$L=Get-Content $f -Encoding UTF8
$seg=$L[1049..2891]
$m=$seg | Where-Object { $_ -match '^ {2,6}[A-Za-z_$][\w$]*\s*:\s*(async\s+)?function' }
"H-table line-regex keys (lines 1050..2892) = $($m.Count)"
$m | Select-Object -First 5
"PS exit code = $LASTEXITCODE"
```
输出原文：
```
H-table line-regex keys (lines 1050..2892) = 87
    GetServerList: function () {
    ChooseServer: function () { return ack('ChooseServer'); },
    TellAction: function () { return ack('TellAction', { achievement: ach() }); },
    quicklogin: function (p) {
    CheckName: function () { return { eRet: 1 }; },
PS exit code = 
```
（`$LASTEXITCODE` 为空：该命令未调用外部程序；工具未报非零退出。表体闭括号在 `bz-rpc-server.js:2893` 的 `};`，见 `bz-rpc-server.js:1048-2893`。）

**结论：一级 function 键 87 个（配平扫描与独立行正则均得 87）；前 5 个键名依次为 GetServerList、ChooseServer、TellAction、quicklogin、CheckName（bz-rpc-server.js:1050/1054/1055/1058/1072）。**

---

## V5 PROTO 正则命中数 + User.CheckBattleResult 段长

**命令：**
```
cmd /c 'chcp 65001>nul && set "PYTHONUTF8=1" && python F:\BaoZouyxt\audit-v23\relate-verify\v5_proto.py'
```
**退出码：0**

关键输出原文：
```
file: F:\BaoZouyxt\hotfix-patch\core\bz-rpc-server.js
chars: 148377  lines: 3137
PROTO hits: 8
  [1] User.getFinishTaskAward          start=  55666 (line  1286) end=  55691  seg_len=    22  is_last=False
  [2] User.getFinishTaskAward          start=  55713 (line  1287) end=  55738  seg_len=    79  is_last=False
  [3] User.getFinishTaskAward          start=  55817 (line  1290) end=  55842  seg_len= 14250  is_last=False
  [4] User.ReqSelfBattleInfo           start=  70092 (line  1535) end=  70116  seg_len=   366  is_last=False
  [5] User.ReqSelfBattleInfo           start=  70482 (line  1543) end=  70506  seg_len=  1888  is_last=False
  [6] User.CheckBattleResult           start=  72394 (line  1587) end=  72418  seg_len= 33976  is_last=False
  [7] User.useItem                     start= 106394 (line  2278) end= 106408  seg_len= 26385  is_last=False
  [8] User.equipWeapon                 start= 132793 (line  2776) end= 132811  seg_len= 15566  is_last=True
distinct actions: 5 ['User.CheckBattleResult', 'User.ReqSelfBattleInfo', 'User.equipWeapon', 'User.getFinishTaskAward', 'User.useItem']
  count User.CheckBattleResult           = 1
  count User.ReqSelfBattleInfo           = 2
  count User.equipWeapon                 = 1
  count User.getFinishTaskAward          = 3
  count User.useItem                     = 1
User.CheckBattleResult: hit #6, m.end()=72418, next hit start=106394, seg_len=33976
```

**结论：PROTO 正则（extract_rw.py:12）+ 分段规则（extract_rw.py:20）在 bz-rpc-server.js 上命中 8 处、5 个动作名；`User.CheckBattleResult` 那一处（第 6 处命中，bz-rpc-server.js:1587）段长 33976 字符。**

数字对照（只报数）：`运行凭证.md:62` 列的 6 个数 `14250 / 366 / 1888 / 33976 / 26385 / 15566` 全部出现在本次 8 段结果里，位次与顺序一致；本次另有第 1、2 段 `22`、`79`（同为 `User.getFinishTaskAward` 的前两处命中），该行未列。

---

## V6 md5 三组比对

**命令：**
```
cmd /c 'chcp 65001>nul && set "PYTHONUTF8=1" && python F:\BaoZouyxt\audit-v23\relate-verify\v6_md5.py'
```
**退出码：0**

关键输出原文：
```
=== a) F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\forge\analysis ===
dir listing: ['README.md', 'extract_rw.py', 'relate.py']
=== b) F:\BaoZouyxt\_incoming\relate-pack-20261024\bz-oracle\forge\analysis ===
dir listing: ['README.md', 'extract_rw.py', 'relate.py']

-- per-file --
a README.md      3eb72b5735a334fdd110726fc1b9bf5d       850 B  F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\forge\analysis\README.md
b README.md      3eb72b5735a334fdd110726fc1b9bf5d       850 B  F:\BaoZouyxt\_incoming\relate-pack-20261024\bz-oracle\forge\analysis\README.md
   -> README.md identical: True

a extract_rw.py  8ae6d84e5d133676219146786d3e0fb9      1627 B  F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\forge\analysis\extract_rw.py
b extract_rw.py  8ae6d84e5d133676219146786d3e0fb9      1627 B  F:\BaoZouyxt\_incoming\relate-pack-20261024\bz-oracle\forge\analysis\extract_rw.py
   -> extract_rw.py identical: True

a relate.py      08c01e8085452864e05095b2a40a4426      8748 B  F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\forge\analysis\relate.py
b relate.py      08c01e8085452864e05095b2a40a4426      8748 B  F:\BaoZouyxt\_incoming\relate-pack-20261024\bz-oracle\forge\analysis\relate.py
   -> relate.py identical: True

-- c) relations.md --
a ccfd15e72147aa9a912f92947993ce65     20644 B  F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\out\relations.md
b ccfd15e72147aa9a912f92947993ce65     20644 B  F:\BaoZouyxt\audit-v23\relate-result-20261024\relations.md
   -> identical: True
```

**结论：a) `...\bz-oracle\forge\analysis\` 与 b) `...\relate-pack-20261024\bz-oracle\forge\analysis\` 的三个同名文件 md5 逐一相同（README.md `3eb72b57…bf5d`、extract_rw.py `8ae6d84e…0fb9`、relate.py `08c01e80…4426`）；c) `...\bz-oracle\out\relations.md` 与 `...\relate-result-20261024\relations.md` 的 md5 相同（`ccfd15e72147aa9a912f92947993ce65`，均 20644 B）。三组均一致。**

---

## 未能确认

1. `rw.err.txt` 的生成方式：内容（35 B，`b'\r\n# 5 …\r\n'`）与本机复算的 stderr 逐字节相同，但无法确认该文件是从那次运行原样重定向保存，还是事后按同样内容写入；无命令历史可查（`F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\rw.err.txt`，全文件仅此 35 字节）。
2. 未重跑 `relate.py`（任务禁止），因此 `relations.json` / `relations.md` 能否由当前 `registry.json` + `contracts.json` + 当前 `rw.json` + 当前 `relate.py` 逐字节复现，未验证。
3. `registry.json` 只读了 `rows[].key` 与 `rows[].status` 两个字段；`contracts.json` 未读（不在 6 项清单内）。
4. 未逐簇比对 `relations.md` 的「共享：」行与 `relations.json` 各簇 `label` 是否一致（不在 6 项清单内）。

## 范围外发现

1. 包内 `out\relations.md` = 20375 B、md5 `1f99d56e4ff51cbe1ee9fa6f8e20b9a1`；包内 `out\relations.json` = 103714 B、md5 `875008a985eef226f7aa93cf7a10dd15`，其 `__meta` = `{"inScope": 699, "edges": 237, "clusters": 74, "lone": 469, "pairs": 14, "rwUsed": false, "weights": {"rw": 4.0, "pair": 3.0, "field": 1.0, "fk": 1.5, "token": 0.6}, ...}`；安装位 `out\relations.md` 与 `out\relations.json` 分别为 20644 B / 111711 B（路径见 V6；`运行凭证.md:27` 记「没有拷包里的 out\relations.*」）。
2. `F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\out\relations.json`（111711 B，md5 `7768c0de6ee6735ff7237582ccf6f20f`）与 `F:\BaoZouyxt\audit-v23\relate-result-20261024\relations.json` md5 相同（V6 只要求比对 relations.md）。
3. `relate-result-20261024` 目录另有 `rw.v2.json（附录，非本包口径）.json` 3324 B、`N.txt` 110 B、`05-意见.txt` 4496 B、`运行凭证.md` 6931 B；`audit-v23\relate-extra\` 有 `out\relations.json` 120021 B 等一套第二口径产物。均未纳入本次 6 项。
4. `relations.md` 里除 75 个「## 第N批」外，还有 1 个二级标题 `## 孤立动作（467 个，直接套模板批量生成）`（relations.md:232）；若统计口径是「所有 `## ` 行」则为 76 行。

## 本次新建文件（全部在允许目录内，未触碰其它路径）

`F:\BaoZouyxt\audit-v23\relate-verify\`：`v1_rw.py`、`v1b_repro.py`、`v1_repro_rw.json`、`v1_repro_stderr.txt`、`v2_md_json.py`、`v2b_extra.py`、`v3_union.py`、`v4_hkeys.py`、`v5_proto.py`、`v6_md5.py`、`VERIFY.md`。
