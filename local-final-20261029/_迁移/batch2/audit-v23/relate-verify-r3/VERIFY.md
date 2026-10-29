# 复核结果（第 3 轮）

- 复核日期：2026-10-24；复核目录：`F:\BaoZouyxt\audit-v23\relate-verify-r3\`（本次唯一写入位置）
- 环境：Windows PowerShell 5.1 包裹 cmd；python 3.13.2；networkx 3.5（`python -c "import networkx; print(networkx.__version__)"` → `3.5`，退出码 0）
- A 位 = `F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\`；B 位 = `F:\BaoZouyxt\audit-v23\relate-result-r3-20261024\`
- 除本复核目录外未创建/修改/删除/移动任何文件；未写 A 位与 B 位；未联网、未 git、未 pip install。

## V1 extract 复现性

命令原文（seed=3；seed=4 同式，仅换 seed 值与输出文件名）：

```
cmd /c 'chcp 65001>nul && set "PYTHONHASHSEED=3" && set "PYTHONIOENCODING=utf-8" && python "F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\forge\analysis\extract_rw.py" "F:\BaoZouyxt\hotfix-patch\core\bz-rpc-server.js" "F:\BaoZouyxt\hotfix-patch\core\bz-handler-impl.js" "F:\BaoZouyxt\hotfix-patch\live\flow.js" 1>"F:\BaoZouyxt\audit-v23\relate-verify-r3\v1\rw_seed3.stdout.json" 2>"F:\BaoZouyxt\audit-v23\relate-verify-r3\v1\rw_seed3.stderr.txt"'
```

退出码：seed=3 → `$LASTEXITCODE=0`；seed=4 → `$LASTEXITCODE=0`。

md5（`Get-FileHash -Algorithm MD5`）：

| 文件 | md5 | 大小 |
|---|---|---|
| 复核 `v1\rw_seed3.stdout.json` | `bbe434dcdb19baad97cff48f0850f0f8` | 10235 B |
| 复核 `v1\rw_seed4.stdout.json` | `bbe434dcdb19baad97cff48f0850f0f8` | 10235 B |
| A 位 `rw.s1.json` | `bbe434dcdb19baad97cff48f0850f0f8` | 10235 B |

- 两份复核输出 md5 相同：是；等于 A 位 `rw.s1.json` md5：是。

stderr 行原文（两份文件均为 UTF-8 字节，逐字节相同；按 UTF-8 解码后各为 1 行内容）：

```
# 36 个动作抽到存档读写（共扫到 87 个 handler，分派表成员 87）
```

（文件首行为空行，其后即上行，末尾换行。）

结论一行：seed=3 与 seed=4 的 extract 产物逐字节一致，且与 A 位 `rw.s1.json` 一致；stderr 两份原文一致。

## V2 relate 复现性

前置：将 A 位 `out\registry.json`（md5 `0af64c46c87b6e3dc1f3e15684cc89f6`）与 `out\contracts.json`（md5 `a9199702d6c64fd7c87225fc42203a15`）复制到复核目录 `scratch3\`、`scratch4\`；复制件 md5 与原件逐一相同（同表所列 6 个 md5 全部一致）。config 未传 `--config`，`relate.py` 内 ROOT 推导（脚本上两级）落在 A 位 `config\relate-families.json`（只读引用）。

命令原文（seed=3；seed=4 同式，仅换 seed 值、scratch 目录与输出文件名）：

```
cmd /c 'chcp 65001>nul && set "PYTHONHASHSEED=3" && set "PYTHONIOENCODING=utf-8" && python "F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\forge\analysis\relate.py" --rw "F:\BaoZouyxt\audit-v23\incoming\unpacked\bz-oracle\rw.s1.json" --out "F:\BaoZouyxt\audit-v23\relate-verify-r3\scratch3" --min-edge 0.9 1>"F:\BaoZouyxt\audit-v23\relate-verify-r3\v1\relate_seed3.stdout.txt" 2>"F:\BaoZouyxt\audit-v23\relate-verify-r3\v1\relate_seed3.stderr.txt"'
```

退出码：seed=3 → `$LASTEXITCODE=0`；seed=4 → `$LASTEXITCODE=0`。stderr 两个文件均为 0 B。

stdout 原文（两份相同）：

```
{"inScope": 700, "edges": 901, "clusters": 76, "lone": 370, "pairs": 21, "rwActions": 32}
```

md5：

| 文件 | md5 | 大小 |
|---|---|---|
| 复核 `scratch3\relations.md` | `c15b29e4cbdc0aa7c3c7157a3a404c1f` | 23719 B |
| 复核 `scratch4\relations.md` | `c15b29e4cbdc0aa7c3c7157a3a404c1f` | 23719 B |
| A 位 `out\relations.md` | `c15b29e4cbdc0aa7c3c7157a3a404c1f` | 23719 B |
| 复核 `scratch3\relations.json` | `36386b7858b4ffa83b02eae9e5ee77ef` | 199794 B |
| 复核 `scratch4\relations.json` | `36386b7858b4ffa83b02eae9e5ee77ef` | 199794 B |
| A 位 `out\relations.json` | `36386b7858b4ffa83b02eae9e5ee77ef` | 199794 B |

结论一行：两次 relations.md md5 相同，且与 A 位 `out\relations.md` 相同（relations.json 亦逐字节一致）。

## V3 计数三对照

取数命令：`cmd /c 'chcp 65001>nul && set "PYTHONIOENCODING=utf-8" && python "F:\BaoZouyxt\audit-v23\relate-verify-r3\verify_r3.py" 1>…\v1\verify_r3.out.txt 2>…\v1\verify_r3.err.txt'`（脚本见复核目录 `verify_r3.py`，只读输入），退出码 0。

1. A 位 `out\relations.md` 第 3 行原文：
   ```
   范围内 700 个动作｜边 901｜簇 76｜孤立 370｜成对 21｜有存档读写的动作 32
   ```
2. `relations.json` `__meta` 原文：
   ```json
   {"inScope": 700, "edges": 901, "clusters": 76, "lone": 370, "pairs": 21, "rwActions": 32,
    "families": {"任务主线": 17, "核心账本": 5, "婚姻子女": 16, "技巧摸奖": 7, "战斗结算": 7, "龙": 4,
                 "打坐练功": 10, "商店交易": 12, "斗狗": 6, "成就": 6, "穴位": 2, "道具使用": 6},
    "weights": {"rw": 4.0, "family": 3.0, "pair": 3.0, "field": 1.0, "fk": 1.5, "token": 0.6, "link": 0.5},
    "version": "relate v2.1", "included": ["SYCNPLAYERITEAMDATA"],
    "note": "只用于归型和排序，不是闸门；拿不准的关联标为「可能相关」【推断】"}
   ```
3. 实际数组：
   - `relations.md` 中 `## 第` 行数 = **76**（首行 `## 第1批 · C01〔商店交易〕（27 个，可信度强）…`，末行 `## 第76批 · C76（2 个，可信度弱（主要靠名字相似））…`）
   - `len(clusters)` = **76**，`len(lone)` = **370**
   - 簇成员总数 = Σ size = **330**；330 + 370 = **700** ✓
   - 簇成员 ∪ lone 去重后 = 700，簇/lone 重复键数 = 0
   - 与 `registry`（`out\registry.json`）中 `status ∈ {GEN-READY, NEEDS-S2, IMPL-UNJUDGED, DONE, NO-CONTRACT}` 的 key 集合（**699** 个）∪ `config` 的 includeKeys（**1** 个）= 并集 **700**：
     - 并集 − 实际 = **0** 个（空）
     - 实际 − 并集 = **0** 个（空）
   - 附带计数：registry 总行数 = 1125；status 分布 = `{"ALT": 16, "DEAD": 189, "DONE": 6, "GEN-READY": 317, "IMPL-UNJUDGED": 74, "NEEDS-S2": 282, "NO-CONTRACT": 20, "OUT": 29, "PUSH": 192}`；includeKeys − scope_keys = 1 个：`SYCNPLAYERITEAMDATA`
   - 簇 id 批次序列：batch = 1..76 连续（True）；id 顺序为 `C01, C05, C02, C03, C16, C04, C06, …, C76`（第 2 批是 C05，第 5 批是 C16，非按 id 升序）

结论一行：md 第 3 行、`__meta`、实际数组三处数字一致（700/901/76/370/21/32），成员并集与「registry 范围状态 ∪ includeKeys」双向差集均为 0。

## V4 config\relate-families.json 与 includeKeys 处理代码

命令：同 V3 的 `verify_r3.py`（退出码 0）+ 单独一次 python -c 查「战斗结算」先命中归属（见下）。

1. 合法 JSON：是（`json.load` 成功）。顶层键 = `['_说明', 'crossFamilyDamp', 'families', 'familyWeight', 'includeKeys', 'links', 'notes']`；`familyWeight = 3.0`，`crossFamilyDamp = 0.25`，`links` 条数 = 2，`notes` 条数 = 3。
2. `includeKeys` 内容：`["SYCNPLAYERITEAMDATA"]`
3. `families` 条目数 = **12**，名称（按配置序）：核心账本、任务主线、商店交易、道具使用、打坐练功、婚姻子女、穴位、成就、技巧摸奖、斗狗、龙、战斗结算。
4. 逐 family「match 命中的 KEY 落在哪些簇」分布（按 regex 对并集 U 独立命中统计；`{簇: 个数}`）：

   | family | match 正则 | 命中总数 | 簇分布 |
   |---|---|---|---|
   | 核心账本 | `^(QUICK_LOGIN\|USER_LOADGAME\|USER_CREATE\|BACKTOLOGIN\|ACCOUNT_LOG_OFF)$` | 5 | {C05: 5} |
   | 任务主线 | `^(?!ROGUE_)(GET_TASK\|…\|CIRCLE_TASK_TASK)$\|SCHOOL_TASK` | 17 | {C02: 17} |
   | 商店交易 | `^(SELL_ITEM\|BUY_SHOP_ITEM\|…\|BUY_GOOD_AND_EVIL_SHOP_ITEM)$` | 12 | {C01: 12} |
   | 道具使用 | `^(USE_ITEM\|ROGUE_USE_ITEM\|…\|USE_ALL_BALL)$` | 6 | {C05: 6} |
   | 打坐练功 | `DAZUO\|LIANGONG\|RECOVER_MP\|WOOD_TRAINING` | 10 | {C06: 10} |
   | 婚姻子女 | `WIFE\|MARRY\|WEDD\|CHILD\|DIVORCE\|CHOOSE_GIRL\|PROPOSE\|MAKE_LOVE` | 16 | {C04: 16} |
   | 穴位 | `ACUPOINT` | 2 | {C73: 2} |
   | 成就 | `ACHIEV` | 6 | {C16: 6} |
   | 技巧摸奖 | `KNACK` | 7 | {C09: 7} |
   | 斗狗 | `DOG` | 6 | {C13: 6} |
   | 龙 | `DRAGON` | 4 | {C15: 4} |
   | 战斗结算 | `BATTLE_END\|BATTLE_RESULT\|NPC_BATTLE_END` | 8 | {C03: 7, C13: 1} |

   数出一处差异的事实记录：「战斗结算」regex 独立命中 8 个 KEY，而 `__meta.families["战斗结算"] = 7`。逐 KEY 查 first-match 归属（relate.py 取配置序中第一个命中的 family）：
   ```
   战斗结算 regex 独立命中: ['BATTLE_END_REWARD', 'DICE_BATTLE_RESULT', 'DOG_BATTLE_RESULT',
   'GOOD_AND_EVIL_BATTLE_RESULT', 'ROGUE_PVE_BATTLE_RESULT', 'ROGUE_PVP_BATTLE_END',
   'SERVER_NPC_BATTLE_END', 'SERVER_ROGUE_NPC_BATTLE_END']
   DOG_BATTLE_RESULT →first-match: 斗狗
   ```
   即 8 个中 `DOG_BATTLE_RESULT` 被「斗狗」（配置序在前）先命中而归入斗狗（C13），故 `__meta` 计 7；其余 7 个落在 C03。

5. `relate.py` 中 includeKeys 处理代码（路径 `forge\analysis\relate.py`）：

   `relate.py:79`（config 装载）：
   ```python
    cfg = jload(a.config) if os.path.exists(a.config) else {}
   ```
   `relate.py:87`：
   ```python
    extra = set(cfg.get("includeKeys", []))
   ```
   `relate.py:89-90`（范围过滤：status 在 SCOPE 之外时，仅当 key 在 includeKeys 才保留）：
   ```python
    for r in reg:
        if r["status"] not in SCOPE and r["key"] not in extra: continue
   ```
   `relate.py:230`（写进 `__meta.included`）：
   ```python
            "weights": W, "version": "relate v2.1", "included": sorted(extra & set(keys)),
   ```

结论一行：config 为合法 JSON，includeKeys 仅 1 个 key，12 个 family 的命中簇分布如上表；includeKeys 的处理链为 relate.py:87 → :89-90 → :230。

## V5 SYCNPLAYERITEAMDATA

命令：同 V3 的 `verify_r3.py`（退出码 0）。三样数据：

1. 所在簇：**C01**，簇 family 标签 = **「商店交易」**（C01：size=27、batch=1、confidence=「强」；它在簇内 order 序列的第 11 位）
2. `relations.json` 的 `notes` 里有它：**有**，原值：
   ```
   三大重建入口之一，应答为空会清空背包；客户端从不主动发（registry 记为 PUSH），但服务端有 handler
   ```
3. registry 里它的 status 原值：**`"PUSH"`**（`contract` 字段 = `"SYCNPLAYERITEAMDATA"`；该 status 不在 SCOPE 五状态内，仅因 includeKeys 进入分析，`__meta.included = ["SYCNPLAYERITEAMDATA"]`）

结论一行：C01（商店交易）、notes 有原文一条、registry status 原值为 PUSH。

## V6 md5 一致性（A 位 vs B 位）

命令原文（`Get-FileHash -Algorithm MD5`，对下表文件逐一执行；完整清单脚本见会话记录）：

| 文件 | A 位 md5 | B 位 md5 | 是否一致 |
|---|---|---|---|
| `rw.s1.json` | `bbe434dcdb19baad97cff48f0850f0f8` | `bbe434dcdb19baad97cff48f0850f0f8` | 一致 |
| `relations.md` | `c15b29e4cbdc0aa7c3c7157a3a404c1f` | `c15b29e4cbdc0aa7c3c7157a3a404c1f` | 一致 |
| `relations.json` | `36386b7858b4ffa83b02eae9e5ee77ef` | `36386b7858b4ffa83b02eae9e5ee77ef` | 一致 |

（B 位 `relations.md` = `relate-result-r3-20261024\relations.md`，23719 B；A 位 = `out\relations.md`。B 位 `四个md5.txt` 内记录的 rw.s1.json / rw.s2.json / relations.md md5 与本次实测值一致。）

结论一行：三个文件 A、B 两位 md5 逐一相同。

## 未能确认

1. 任务清单所列 A 位文件 `rw.s1.err.txt` 在 A 位根目录**未找到**（`Get-ChildItem` 实测 A 位根目录仅有 `CHANGELOG-*.md` ×4、`README.md`、`nul`、`rw.err.txt`、`rw.json`、`rw.s1.json`、`rw.s2.json`）；B 位 `探针\rw.s1.err.txt` 存在但 A 位无对应文件，故「A 位 rw.s1.err.txt」一项无数可报。
2. 原始第 3 轮运行（2026-10-24 17:00）当时的进程环境变量无法回溯确认；本次仅能确认按 seed=3/seed=4 复跑产物与 A 位产物逐字节一致。

## 范围外发现（只报数，不动手）

1. A 位根目录 `rw.err.txt`（66 B）的字节序列为 **GBK 编码**（前 80 字节：`0D 0A 23 20 33 36 20 B8 F6 B6 AF D7 F7 B3 E9 B5 BD B4 E6 B5 B5 B6 C1 D0 B4 A3 A8 B9 B2 C9 A8 B5 BD 20 38 37 20 B8 F6 20 68 61 6E 64 6C 65 72 A3 AC B7 D6 C5 C9 B1 ED B3 C9 D4 B1 20 38 37 A3 A9 0D 0A`）；按 GBK 解码文本与本次两次复核运行 stderr（UTF-8 字节）文本相同（「# 36 个动作抽到存档读写（共扫到 87 个 handler，分派表成员 87）」）。
2. A 位 `rw.s2.json` 与 `rw.s1.json` 的 md5 相同（均为 `bbe434dcdb19baad97cff48f0850f0f8`）。
3. A 位根目录存在名为 `nul` 的文件（2980 B，2026-10-24 5:14:24）。
4. B 位除三个比对文件外，另含 `04-意见.txt`、`运行凭证.md`、`四个md5.txt`、`stderr行.txt`、`探针\`（6 个文件），本次未逐一核对内容（`四个md5.txt` 中记录值与实测一致除外）。
5. `relate.py` 代码内默认 `W["family"] = 2.0`（relate.py:40），而 `__meta.weights.family = 3.0`；A 位 `config\relate-families.json` 的 `familyWeight = 3.0`，与 meta 值一致。
