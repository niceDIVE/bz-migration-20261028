# 复核结果（第 2 轮）

- 复核时间：2026-10-24，复核人：只读复核工人（子代理）。
- 安装位 A = `F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\`；交付位 B = `F:\BaoZouyxt\audit-v23\relate-result-r2-20261024\`。
- 实际路径备注：rw.json、rw.err.txt 位于 A 根目录（`bz-oracle\rw.json`、`bz-oracle\rw.err.txt`），不在 `out\` 下。
- 本目录（relate-verify-r2）外未创建/修改/删除/移动任何文件；未运行 relate.py；未联网；未 git 操作。

## V1 复跑 extract_rw.py

命令原文（stdout/stderr 均重定向到复核目录，未写 A 位）：

```
cmd /c 'chcp 65001>nul && python F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\forge\analysis\extract_rw.py F:\BaoZouyxt\hotfix-patch\core\bz-rpc-server.js F:\BaoZouyxt\hotfix-patch\core\bz-handler-impl.js F:\BaoZouyxt\hotfix-patch\live\flow.js 1>F:\BaoZouyxt\audit-v23\relate-verify-r2\rerun_rw.json 2>F:\BaoZouyxt\audit-v23\relate-verify-r2\rerun_rw.err.txt'
```

退出码：0（`$LASTEXITCODE` = 0）。产物：`relate-verify-r2\rerun_rw.json`（10048 字节）、`relate-verify-r2\rerun_rw.err.txt`（66 字节）。

复跑 stderr 原文（按 GBK 936 解码，整文件）：

```

# 36 个动作抽到存档读写（共扫到 87 个 handler，分派表成员 87）

```

与 A 位 `rw.err.txt`（GBK 解码）逐字相同；与 B 位 `stderr行.txt` 中记录的第 2 轮第 2 步 stderr 行相同。

md5 对照（Get-FileHash -Algorithm MD5，退出码 0）：

| 文件 | md5 |
|---|---|
| A 位 rw.json | `659793600F7E3CB0CDBEB8CFE420C449` |
| 复跑 rerun_rw.json | `9F5BBB6835CB498F874A8201F29711B4` |

**相同：否。**

差异定位（diff 脚本 `relate-verify-r2\diff_rw.py`，退出码 0，全文见 `relate-verify-r2\rw_diff.txt`）：
- 两文件顶层键集完全相同（A 36 键 = 复跑 36 键，互差为空）；via 值全部相同；
- 36 个键中 **10 个键的 reads/writes 不同**，均表现为 `rewarded`/`saveVersion`/`skills` 在 reads 与 writes 之间挪动。涉及键：User.BuyAcitivityShop、User.CheckBattleResult、User.LoadGame、User.QuickBuyItem、User.UnloadingEuipment、User.addItem、User.buyShopItem、User.buySpecialShopItem、User.saleItem、User.useItem。逐键原文见 `rw_diff.txt` 第 125–155 行。
- 换行符差异：A 位含 CRLF 743 处，复跑含 CRLF 735 处；去掉 CR 后内容仍不同。

补充实验一（--depth 对照，命令同上仅加 `--depth=N`，每档退出码均 0）：

| depth | rerun md5 | 匹配 A 位 |
|---|---|---|
| 0 | FAF61709A0C9E55915964C2555E9147C | 否 |
| 1 | 44D59EC638558B663B12EE672D71EEDA | 否 |
| 2（默认，即上表复跑） | 9F5BBB6835CB498F874A8201F29711B4 | 否 |
| 3 | 4A83B1705F41AFDACDC1ECFFAE9911BC | 否 |
| 4 | BE56D056B69CE67887DF78444BE7061B | 否 |

补充实验二（同参数重复运行，退出码均 0）：depth=3 同参数跑两次得 md5 `4A83B1705F41AFDACDC1ECFFAE9911BC` 与 `43DFAD9964380AA1D9BAFD0BC6D6F453`，**同参数两次运行结果也不同**（3/36 键的 reads/writes 摆动，见 `relate-verify-r2\depth3_diff.txt`；三个源文件与 extract_rw.py 本身 md5 前后两次测量一致，源文件未变）。

补充实验三（PYTHONHASHSEED 固定，`relate-verify-r2\seedtest.py` 以 subprocess 受控 env 复跑，rc=0）：

| seed | run | md5 |
|---|---|---|
| 0 | 1 | 1d66351622d47d2640580aaeb62c339c |
| 0 | 2 | 1d66351622d47d2640580aaeb62c339c |
| 1 | 1 | 9a27bf95e6727aba09c29756e6e2bc10 |
| 1 | 2 | 9a27bf95e6727aba09c29756e6e2bc10 |

即：同 seed 两次运行 md5 相同，不同 seed 不同，且 seed 0/1 的输出都不等于 A 位 rw.json 的 md5。

结论一行：stderr 行复现一致；rw.json md5 不一致（`6597…C449` ≠ `9F5B…11B4`），36 键中 10 键 reads/writes 摆动，且当前 extract_rw.py 输出依赖进程 PYTHONHASHSEED、同参数不可逐字节复现。

## V2 计数三对照

数据来源：B 位 relations.md、B 位 relations.json、A 位 out\registry.json（读取脚本 `relate-verify-r2\verify_r2.py`，退出码 0；该脚本首次运行因脚本自身第 146 行 tuple 键报 TypeError 退出码 1，修复后重跑退出码 0，A/B 位文件未被改动）。

relations.md 第 3 行原文：

```
范围内 699 个动作｜边 879｜簇 76｜孤立 370｜成对 21｜有存档读写的动作 31
```

relations.json `__meta` 原文（六个字段）：

```json
{"inScope": 699, "edges": 879, "clusters": 76, "lone": 370, "pairs": 21, "rwActions": 31}
```

实际数组核对：

| 项 | 数 |
|---|---|
| md 中 `## 第` 行数 | 76 |
| clusters 数组长度 | 76 |
| lone 数组长度 | 370 |
| pairs 数组长度 | 21 |
| 各簇 order 长度总和 | 329（各簇 size 字段总和亦 329） |
| 簇成员总数 + lone | 329 + 370 = **699** |
| 拼接列表元素总数 / 去重后 | 699 / 699（重复 0） |

并集对照 registry：

- registry rows 总数：1125。
- status 分布（Counter，按字母序）：`{"ALT": 16, "DEAD": 189, "DONE": 6, "GEN-READY": 317, "IMPL-UNJUDGED": 74, "NEEDS-S2": 282, "NO-CONTRACT": 20, "OUT": 29, "PUSH": 192}`。
- status ∈ {GEN-READY, NEEDS-S2, IMPL-UNJUDGED, DONE, NO-CONTRACT} 的 key 集合大小：**699**（317+282+74+6+20=699）。
- 簇成员+lone 并集大小：699。
- 并集 − registrySCOPE 集合：**0 个**（[]）。
- registrySCOPE 集合 − 并集：**0 个**（[]）。

结论一行：md 第 3 行、`__meta`、实际数组三方数字一致（699/879/76/370/21/31），簇成员+lone=699 且与 registry 五种 status 的 key 集合双向差集均为 0。

## V3 config\relate-families.json

- 合法 JSON：**是**（json.load 成功）。
- familyWeight：**3.0**（另含 crossFamilyDamp 0.25、links 2 条、notes 2 条）。
- families 条目数：**12**。键序：核心账本、任务主线、商店交易、道具使用、打坐练功、婚姻子女、穴位、成就、技巧摸奖、斗狗、龙、战斗结算。

逐 family 统计（正则按 relate.py 第 95 行语义 `rx.search(r["key"])` 对 A 位 out\registry.json 全部 1125 行的 key 匹配，再按 B 位 relations.json clusters 的 order 归簇；「范围外」= 命中但不在 699 并集内，lone=0 全部家族）：

| family | match 命中去重 KEY 数 | {簇: 个数} |
|---|---|---|
| 核心账本 | 5 | {C05: 5} |
| 任务主线 | 17 | {C02: 17} |
| 商店交易 | 12 | {C01: 12} |
| 道具使用 | 6 | {C05: 6} |
| 打坐练功 | 10 | {C06: 10} |
| 婚姻子女 | 16 | {C04: 16} |
| 穴位 | 2 | {C73: 2} |
| 成就 | 7 | {C16: 6}，范围外 1 |
| 技巧摸奖 | 9 | {C09: 7}，范围外 2 |
| 斗狗 | 6 | {C13: 6} |
| 龙 | 4 | {C15: 4} |
| 战斗结算 | 10 | {C03: 7, C13: 1}，范围外 2 |

- 12 个 family 中 11 个命中键各自集中在一个簇；「战斗结算」的命中键落在 C03（7 个）和 C13（1 个）两个簇，另有 2 个命中键不在 699 并集内。
- B 位 relate-families.json 与 A 位 config\relate-families.json md5 相同（见 V6）。

结论一行：config 为合法 JSON，familyWeight=3.0、families 12 条；11/12 个 family 的命中键集中单簇，战斗结算跨 C03/C13（7+1，另 2 键范围外）。

## V4 对照档案 md5

| 文件 | md5 | 与 B 位最终 relations.md 是否不同 |
|---|---|---|
| B relations.md（最终） | `EEE0ED150D7A47CBA06A66BCEED7098D` | — |
| B relations.默认配置-对照.md | `C9D4F60FAE90F76EAE01B84A09E9D117` | **不同** |
| B relations.fam2.0-对照.md | `9571E93552ADAC5EB88451EB4780BD07` | **不同** |

结论一行：两个对照档案的 md5（`C9D4…D117`、`9571…D07`）均与最终 relations.md（`EEE0…098D`）不同。

## V5 A 位 rw.json via 统计

（脚本 `verify_r2.py`，退出码 0）

- 动作总数（rw.json 顶层键数）：**36**。
- via 含 `table:` 的动作数：**36**。
- via 为/含 `literal` 的动作数：**10**。
- via 组合分布：`{"table:H": 26, "literal + table:H": 10}`。

结论一行：36 个动作全部含 `table:`，其中 10 个同时含 `literal`（26 个仅 `table:H`）。

## V6 md5 一致性（A 位 vs B 位，四组逐一）

| 组 | A 位 | B 位 | 是否相同 |
|---|---|---|---|
| rw.json | `659793600F7E3CB0CDBEB8CFE420C449` | `659793600F7E3CB0CDBEB8CFE420C449` | 相同 |
| relations.md | `EEE0ED150D7A47CBA06A66BCEED7098D` | `EEE0ED150D7A47CBA06A66BCEED7098D` | 相同 |
| relations.json | `9D0722602796583B07589DBF717D92DD` | `9D0722602796583B07589DBF717D92DD` | 相同 |
| relate-families.json | `DA7DB9E23418177986C22B07CCA4B62B` | `DA7DB9E23418177986C22B07CCA4B62B` | 相同 |

（A 位 relations.md/relations.json 取自 `A\out\`，relate-families.json 取自 `A\config\`，rw.json 取自 A 根目录。）

结论一行：四组文件 A/B 位 md5 全部一致。

## 未能确认

1. A 位 rw.json 的原始生成命令（是否带 `--depth`、当时的 PYTHONHASHSEED、当时的 extract_rw.py 版本）无任何记录可查，**无法确认 A 位 rw.json 是由当前这份 extract_rw.py 以何种参数生成**；已实测默认参数及 depth 0/1/3/4、seed 0/1 共 7 种组合，无一复现 A 位 md5。
2. B 位两个对照档案（relations.默认配置-对照.md、relations.fam2.0-对照.md）各自的生成参数（「默认配置」与「fam2.0」的具体差异）无记录，本工单仅要求 md5 对照，未做内容比对。
3. `__meta.rwActions=31` 与 rw.json 36 个动作之间的归一/过滤过程（relate.py 第 81–82、96 行按 action 名小写匹配 registry）未逐键追踪，31 这个数本身三处（md 第 3 行、`__meta`）一致，但其与 36 的差值来源未核。

## 范围外发现（只报数，不动手）

1. extract_rw.py（文件头自称 v2，2026-10-24）的输出内容依赖进程 PYTHONHASHSEED：同 seed 两次运行逐字节相同，不同 seed 输出不同（V1 补充实验三的 4 个 md5 为证）。同参数复跑不保证复现历史产物。
2. B 位目录 `relate-result-r2-20261024\` 下还有工单未列出的文件：`relations.默认配置-对照.json`（196849 字节）、`relations.fam2.0-对照.json`（197949 字节）、`stderr行.txt`（143 字节）、`探针\` 目录（含 _probe_*.py 共 8 个脚本）。本复核未读取其内容（stderr行.txt 除外，用于 V1 对照）。
3. A 位 `out\` 下同时存在 relations.md/relations.json，与 B 位同名文件 md5 一致（即 V6 前两行）；A 位另存有 registry.nightly.json（326954 字节）等工单未涉及的产物，未读取。
4. registry.json 的 1125 行中，五种 SCOPE status 之外还有 DEAD 189、PUSH 192、ALT 16、OUT 29（共 426 行）不在 699 范围内（V2 数据，仅报数）。

---

### 附：本目录产物清单（均为本次复核新建，均在 relate-verify-r2\ 内）

| 文件 | 说明 |
|---|---|
| VERIFY.md | 本报告 |
| rerun_rw.json / rerun_rw.err.txt | V1 默认参数复跑的 stdout/stderr |
| rerun_depth{0,1,3,4}_rw.json / .err.txt | V1 补充实验一产物 |
| rerun_depth3_check_rw.json / .err.txt | V1 补充实验二（depth=3 第二次运行） |
| seed{0,1}_run{1,2}_rw.json / .err.txt | V1 补充实验三产物（各 err.txt 均 66 字节，GBK 解码内容同 V1 的 stderr 行） |
| verify_r2.py / counts.txt | V2/V3/V5 + md5 表脚本与输出 |
| diff_rw.py / rw_diff.txt | A 位 rw.json 与复跑件 diff |
| diff_depth3.py / depth3_diff.txt | 两次 depth=3 运行 diff |
| seedtest.py / seedtest.txt | PYTHONHASHSEED 对照实验 |
| probe_meta.py | relations.json 结构探针 |
