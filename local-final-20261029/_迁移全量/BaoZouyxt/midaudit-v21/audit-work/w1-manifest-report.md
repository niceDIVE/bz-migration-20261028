# W1 报告：MANIFEST.sha256 全量 SHA-256 核验

- 工人：只读核验工人 W1（工程苦力档，仅执行工单列明的机械动作）
- 派单来源：session-8098f793-7cc1-41b2-8493-d449122b7fa7
- 核验对象：`F:\BaoZouyxt\midaudit-v21\MANIFEST.sha256`
- 报告生成时间：2026-10-23 16:36:36 +08:00
- 执行环境：DSH `pwsh` 工具实际运行 **Windows PowerShell 5.1 Desktop（5.1.22621.4391）**（元信息命令输出 `pwsh version: 5.1.22621.4391` / `edition: Desktop`）；工作目录 `F:\BaoZouyxt`，所有命令使用绝对路径。
- 写操作声明：本任务仅发生两处写——①创建目录 `F:\BaoZouyxt\midaudit-v21\audit-work\`（`New-Item -ItemType Directory -Force`，工单授权："先创建 audit-work 目录"）；②创建并追加本报告文件。未删除、未修改、未移动任何既有文件；未执行任何删除/清理类命令。
- 退出码判读：本 harness 以 `[exit code: N]` 标记非零退出；本文引用的各次命令调用均无该标记 → **退出码 0**。命令 #1 末行的 `EXITCODE_MARKER $LASTEXITCODE` 输出为空值，因脚本内仅使用 cmdlet、无原生 exe，`$LASTEXITCODE` 未被设置，不能作为退出码证据；以 harness 标记缺失为准。

---

## 第 1 部分：清单条目数与前 3 行

文件：`F:\BaoZouyxt\midaudit-v21\MANIFEST.sha256`

**条目总数：105**（每行 1 条目；与工单预期 105 一致）

证据：
- read 工具逐行读取：`F:\BaoZouyxt\midaudit-v21\MANIFEST.sha256:1-105`，返回 "(End of file - total 105 lines)"。
- 命令 #1 输出：`manifest line count: 105`；解析模式 `^([0-9a-f]{64})\s+(\S+)$` 命中 `parsed ... 105 ok, 0 fail`。

**前 3 行原文**（命令 #2 以 `-Encoding UTF8` 读取，逐字摘录；对应 `MANIFEST.sha256:1-3`）：

```
317a6cb398d604dbd60f3e65f03312cc7a006ab5b14be9c115fc0b9b934a4844  ./00-INSTRUCTION.txt
c1164da3cadecf328125e65aeb895ff4bd34c35035bc76d2156cdb093c628001  ./30-中层审计材料.md
0d5a16d6e79e43b35e13b7d90a8dc37c6556312ea2c9640e1592e88816b2e67c  ./README-先看.txt
```

行格式：`<64位小写hex哈希>␣␣./相对路径`（sha256sum 惯例：两空格分隔，无二进制标志位；全 105 行均符合该模式，0 行解析失败）。

### 路径字段基准目录判定

**结论：相对路径基准 = 清单所在目录 `F:\BaoZouyxt\midaudit-v21`（工作区根），不是 `bz-oracle/`。**

判断依据（命令 #1 原文 + 输出；对全部 105 条路径按两种解释逐一 `Test-Path -PathType Leaf`）：

```
interpretation A (base = F:\BaoZouyxt\midaudit-v21):        96 / 105 entries resolve to an existing file
interpretation B (base = F:\BaoZouyxt\midaudit-v21\bz-oracle): 0 / 105 entries resolve to an existing file
sample checks:
  Test-Path F:\BaoZouyxt\midaudit-v21\00-INSTRUCTION.txt            -> True
  Test-Path F:\BaoZouyxt\midaudit-v21\bz-oracle\00-INSTRUCTION.txt  -> False
  Test-Path F:\BaoZouyxt\midaudit-v21\bz-oracle\bz-oracle\README.md -> False
  Test-Path F:\BaoZouyxt\midaudit-v21\bz-oracle\README.md           -> True
```

- 解释 B 为 0/105（若基准是 bz-oracle/，`./bz-oracle/README.md` 应解析为 `bz-oracle\bz-oracle\README.md`，实测 False），解释 A 绝大多数命中 → 基准为工作区根。
- 解释 A 未直接达到 105/105 的原因**不是基准判错**，而是命令 #1 首轮 `Get-Content` 未显式指定编码：本机为 Windows PowerShell 5.1（元信息命令输出 `edition: Desktop`），对无 BOM 文件默认按 ANSI/GBK 解码，9 个含中文文件名的行被解码成乱码导致 `Test-Path` 失败。命令 #2 改用 `-Encoding UTF8` 后 105/105 全部解析为已存在文件。
- 附带反证：命令 #1 乱码输出中出现 `M1-鍔ㄤ綔鍏ㄩ泦琛?md` 形态的 `?` 字符，Windows 文件名不允许含 `?`，证明那是解码伪影而非磁盘真实文件名。

### 命令 #1 原文（基准目录判定）

```powershell
$root='F:\BaoZouyxt\midaudit-v21'
$aw=Join-Path $root 'audit-work'
"audit-work exists before: $(Test-Path -LiteralPath $aw)"
if(Test-Path -LiteralPath $aw){ "audit-work current contents:"; Get-ChildItem -LiteralPath $aw -Force | ForEach-Object { "  $($_.Name)" } }
New-Item -ItemType Directory -Force -Path $aw | Out-Null
"audit-work created/ensured: $(Test-Path -LiteralPath $aw)"
$lines = Get-Content -LiteralPath (Join-Path $root 'MANIFEST.sha256')
"manifest line count: $($lines.Count)"
$badParse=@(); $relNorm=@()
$i=0
foreach($l in $lines){ $i++
  if($l -match '^([0-9a-f]{64})\s+(\S+)$'){ $relNorm += ($Matches[2] -replace '^\./','') }
  else { $badParse += "L${i}: $l" }
}
"parsed with pattern '^[0-9a-f]{64}\s+\S+$': $(($lines.Count - $badParse.Count)) ok, $($badParse.Count) fail"
$badParse
$fromRoot   = @($relNorm | Where-Object { Test-Path -LiteralPath (Join-Path $root $_) -PathType Leaf }).Count
$fromOracle = @($relNorm | Where-Object { Test-Path -LiteralPath (Join-Path $root ('bz-oracle\' + $_)) -PathType Leaf }).Count
"interpretation A (base = F:\BaoZouyxt\midaudit-v21):        $fromRoot / $($relNorm.Count) entries resolve to an existing file"
"interpretation B (base = F:\BaoZouyxt\midaudit-v21\bz-oracle): $fromOracle / $($relNorm.Count) entries resolve to an existing file"
"sample checks:"
"  Test-Path $root\00-INSTRUCTION.txt            -> $(Test-Path -LiteralPath (Join-Path $root '00-INSTRUCTION.txt') -PathType Leaf)"
"  Test-Path $root\bz-oracle\00-INSTRUCTION.txt  -> $(Test-Path -LiteralPath (Join-Path $root 'bz-oracle\00-INSTRUCTION.txt') -PathType Leaf)"
"  Test-Path $root\bz-oracle\bz-oracle\README.md -> $(Test-Path -LiteralPath (Join-Path $root 'bz-oracle\bz-oracle\README.md') -PathType Leaf)"
"  Test-Path $root\bz-oracle\README.md           -> $(Test-Path -LiteralPath (Join-Path $root 'bz-oracle\README.md') -PathType Leaf)"
"EXITCODE_MARKER $LASTEXITCODE"
```

命令 #1 输出（原样摘录，全部）：

```
audit-work exists before: False
audit-work created/ensured: True
manifest line count: 105
parsed with pattern '^[0-9a-f]{64}\s+\S+$': 105 ok, 0 fail
interpretation A (base = F:\BaoZouyxt\midaudit-v21):        96 / 105 entries resolve to an existing file
interpretation B (base = F:\BaoZouyxt\midaudit-v21\bz-oracle): 0 / 105 entries resolve to an existing file
sample checks:
  Test-Path F:\BaoZouyxt\midaudit-v21\00-INSTRUCTION.txt            -> True
  Test-Path F:\BaoZouyxt\midaudit-v21\bz-oracle\00-INSTRUCTION.txt  -> False
  Test-Path F:\BaoZouyxt\midaudit-v21\bz-oracle\bz-oracle\README.md -> False
  Test-Path F:\BaoZouyxt\midaudit-v21\bz-oracle\README.md           -> True
EXITCODE_MARKER 
```

---

## 第 2 部分：比对结果（105 项 SHA-256）

方法：逐行取 `<hash>` 与 `<rel>`（剥离 `./` 前缀），目标路径 = `F:\BaoZouyxt\midaudit-v21\<rel>`；`Get-FileHash -Algorithm SHA256` 计算后 **大写转小写** 与清单哈希比较（清单哈希本身小写，亦统一小写后比较）；先判存在性，存在才计算哈希。路径存在性与集合比较为 Windows 默认大小写不敏感。

命令 #2 原文（含 `[Console]::OutputEncoding` 设定，用于正确显示中文文件名）：

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$root='F:\BaoZouyxt\midaudit-v21'
$lines = Get-Content -LiteralPath (Join-Path $root 'MANIFEST.sha256') -Encoding UTF8
"re-read with -Encoding UTF8: line count $($lines.Count); first 3 verbatim:"
"  L1: $($lines[0])"
"  L2: $($lines[1])"
"  L3: $($lines[2])"
$ok=0;$mismatch=0;$missing=0;$bad=0
$nonOk=@(); $statusMap=@()
$i=0
foreach($l in $lines){ $i++
  if($l -notmatch '^([0-9a-f]{64})\s+(\S+)$'){ $bad++; $nonOk += "L${i} PARSE_FAIL: $l"; $statusMap += "L${i}:PARSE_FAIL"; continue }
  $exp=$Matches[1].ToLower(); $rel=$Matches[2]; $relN=$rel -replace '^\./',''
  $full=Join-Path $root $relN
  if(-not (Test-Path -LiteralPath $full -PathType Leaf)){ $missing++; $nonOk += "L${i} MISSING: $rel"; $statusMap += "L${i}:MISSING"; continue }
  $h=(Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash.ToLower()
  if($h -eq $exp){ $ok++; $statusMap += "L${i}:OK" }
  else { $mismatch++; $nonOk += "L${i} MISMATCH: $rel  expected=$exp  actual=$h"; $statusMap += "L${i}:MISMATCH" }
}
"counts: total=$($lines.Count) ok=$ok mismatch=$mismatch missing=$missing parse_fail=$bad"
"--- non-OK lines (verbatim output) ---"
$nonOk
"--- per-line status map ---"
"statuses: " + ($statusMap -join ' ')
```

输出关键行（原样摘录）：

```
counts: total=105 ok=105 mismatch=0 missing=0 parse_fail=0
--- non-OK lines (verbatim output) ---
（空——无任何输出行）
```

**计数：**

| 判定 | 数量 |
|---|---|
| 清单条目总数 | 105 |
| 一致（OK） | 105 |
| 不一致（MISMATCH） | **0** |
| 缺失（MISSING） | **0** |
| 解析失败（PARSE_FAIL） | 0 |

**不一致完整列表：无（0 项）。**
**缺失完整列表：无（0 项）。**

逐行状态 map（命令 #2 输出，原样摘录，105 项全量）：

```
statuses: L1:OK L2:OK L3:OK L4:OK L5:OK L6:OK L7:OK L8:OK L9:OK L10:OK L11:OK L12:OK L13:OK L14:OK L15:OK L16:OK L17:OK L18:OK L19:OK L20:OK L21:OK L22:OK L23:OK L24:OK L25:OK L26:OK L27:OK L28:OK L29:OK L30:OK L31:OK L32:OK L33:OK L34:OK L35:OK L36:OK L37:OK L38:OK L39:OK L40:OK L41:OK L42:OK L43:OK L44:OK L45:OK L46:OK L47:OK L48:OK L49:OK L50:OK L51:OK L52:OK L53:OK L54:OK L55:OK L56:OK L57:OK L58:OK L59:OK L60:OK L61:OK L62:OK L63:OK L64:OK L65:OK L66:OK L67:OK L68:OK L69:OK L70:OK L71:OK L72:OK L73:OK L74:OK L75:OK L76:OK L77:OK L78:OK L79:OK L80:OK L81:OK L82:OK L83:OK L84:OK L85:OK L86:OK L87:OK L88:OK L89:OK L90:OK L91:OK L92:OK L93:OK L94:OK L95:OK L96:OK L97:OK L98:OK L99:OK L100:OK L101:OK L102:OK L103:OK L104:OK L105:OK
```

### 首轮编码伪影记录（更正说明，非最终结论）

命令 #1（默认编码）曾输出 9 个 `MISSING`，原样摘录：

```
L2 MISSING: ./30-涓眰瀹¤鏉愭枡.md
L3 MISSING: ./README-鍏堢湅.txt
L97 MISSING: ./r21/29-R21-閫佽瘎鏉愭枡-鍏ㄩ噺.md
L98 MISSING: ./r21/M1-鍔ㄤ綔鍏ㄩ泦琛?md
L99 MISSING: ./r21/M1-鍔ㄤ綔鍏ㄩ泦琛?tsv
L100 MISSING: ./r21/M2-瀹㈡埛绔鐐圭储寮?md
L101 MISSING: ./r21/M3-瀛樻。瀛楁瀛楀吀.md
L102 MISSING: ./r21/M4-note浜斿瓙琛ㄨ涔夎〃.md
L103 MISSING: ./r21/R21-鍥炴墽.md
```

判定：**非真实缺失，为编码伪影**。依据：① 命令 #2 以 `-Encoding UTF8` 重跑后，L2、L3、L97–L103 全部 `OK`（存在且哈希一致，见上方状态 map）；② read 工具以 UTF-8 解码同一文件显示正常中文名（`MANIFEST.sha256:2` 为 `./30-中层审计材料.md`）；③ 乱码形态含 `?`，与 Windows 文件名字符规则矛盾，证明是解码产物。**最终判定以命令 #2（-Encoding UTF8）为准。**

---

## 第 3 部分：磁盘有但清单没有的文件

范围：`F:\BaoZouyxt\midaudit-v21` 之下（递归、含隐藏文件 `-Force`），相对路径形式（正斜杠分隔）。扫描时 `audit-work\` 目录为空（0 个文件），本报告文件在扫描之后才写入，故不在本列表内。

命令 #3 原文：

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$root='F:\BaoZouyxt\midaudit-v21'
$lines = Get-Content -LiteralPath (Join-Path $root 'MANIFEST.sha256') -Encoding UTF8
$set=@{}
foreach($l in $lines){ if($l -match '^([0-9a-f]{64})\s+(\S+)$'){ $set[($Matches[2] -replace '^\./','')] = $true } }
"manifest path set size: $($set.Count)"
$files = @(Get-ChildItem -LiteralPath $root -Recurse -File -Force)
"disk file count (recursive, incl. hidden, under $root): $($files.Count)"
$extras=@(); $dupes=@()
foreach($f in $files){
  $rel = $f.FullName.Substring($root.Length).TrimStart('\') -replace '\\','/'
  if(-not $set.ContainsKey($rel)){ $extras += $rel }
}
"disk files NOT in manifest (case-insensitive compare): $($extras.Count)"
$extras | ForEach-Object { "  EXTRA: $_" }
"audit-work dir file count at scan time: $(@(Get-ChildItem -LiteralPath (Join-Path $root 'audit-work') -Recurse -File -Force -ErrorAction SilentlyContinue).Count)"
```

输出关键行（原样摘录；306 行 `EXTRA:` 全量列表**不经人工转录**，由附录 A 的生成命令从磁盘枚举直接追加到本文件末尾，见附录 A）：

```
manifest path set size: 105
disk file count (recursive, incl. hidden, under F:\BaoZouyxt\midaudit-v21): 411
disk files NOT in manifest (case-insensitive compare): 306
audit-work dir file count at scan time: 0
```

**计数：磁盘共 411 个文件；105 个在清单内；306 个不在清单内。**

构成（扫描 #3 逐项前缀归类 + 附录 A 生成段精确复核）：
- `MANIFEST.sha256` 本身：1 项（清单未列自身条目；`MANIFEST.sha256:1-105` 中无该路径，反向检查输出以 `EXTRA: MANIFEST.sha256` 证实）；
- `bz-oracle/forge/node_modules/` 下的依赖文件：305 项（附录 A 生成段复核：node_modules 前缀恰为 305 项，1+305=306，与扫描 #3 总数吻合）。

**附录 A 生成段交叉核对（生成时间晚于扫描 #3）**：disk files=413（较扫描 #3 的 411 增加 2）；排除本报告文件后 extras=307（较扫描 #3 的 306 多 1）。多出的 1 项为 `audit-work/w3-selftest-report.md` —— 扫描 #3 之后新出现的文件（本报告文件自身被生成命令显式排除，见附录 A 首部）。node_modules 计数两轮一致（305），两轮之间磁盘变化仅限 `audit-work/` 下的两个工人报告文件。

---

## 第 4 部分：未验证

1. **大小写变体**：Windows 路径比较大小写不敏感，本次核验全程大小写不敏感（哈希 hex 统一小写；路径集合用 PowerShell 默认大小写不敏感哈希表）。若磁盘与清单存在"仅大小写不同"的同名文件对，本方法无法发现。**未验证。**
2. **清单哈希语义**：本次仅验证"文件字节内容的标准 SHA-256"。若清单哈希采用其他语义（如对规范化换行后的文本计算），本方法无法仅从清单文件本身证明；但因 105/105 全部匹配，该差异在本仓库实际不存在。此为方法学备注。
3. **符号链接 / junction（reparse point）**：未检查 `midaudit-v21` 下是否存在 reparse point，`Get-ChildItem -Recurse` 对其目标的遍历行为未单独审计。**未验证。**
4. **NTFS 备用数据流（ADS）**：未审计。**未验证。**
5. **两轮枚举间的磁盘状态**：附录 A 生成段实测：较扫描 #3 磁盘新增 2 个文件（`audit-work/w1-manifest-report.md` 本报告、`audit-work/w3-selftest-report.md`），均在 `audit-work/` 下；node_modules 项数两轮一致（305）。"两轮间无其他磁盘差异"的断言仅基于这两次枚举的比对。**除上述比对外未验证。**
6. **`node_modules` 305 项内容**：仅判定"存在于磁盘、不在清单"，未计算其哈希（工单只要求列出，不要求哈希）。此为范围边界说明，非未验证缺陷。

范围外发现：无。本工人未执行工单范围外任何操作。

---

## 附录 A：磁盘有但清单没有的文件（机器生成；扫描 #3 为 306 项，附录生成段实测 307 项，差异说明见第 3 部分交叉核对）

> 本附录由生成命令直接从磁盘枚举追加写入本文件，不经人工转录，保证与磁盘逐字一致。
> 生成命令与扫描 #3 逻辑相同，唯一差异：显式排除本报告文件自身（`audit-work/w1-manifest-report.md`），因其在扫描 #3 之后才创建，不属于扫描 #3 的 306 项。
> 附录首部同时输出：排除本报告后的 extras 总数、其中位于 `bz-oracle/forge/node_modules/` 前缀下的数量、非 node_modules 的 extras 逐项列表，用于与扫描 #3 的 306/411 交叉核对。

（附录正文见本文件末尾的生成段）

---

生成时间：2026-10-23 16:39:12 +08:00（Windows PowerShell 5.1 Desktop；本段由磁盘枚举直接写入，未经人工转录）
交叉核对：disk files=413（扫描#3: 411）；extras（排除本报告文件后）=307（扫描#3: 306）；显式排除的本报告文件：audit-work/w1-manifest-report.md
构成计数：bz-oracle/forge/node_modules/ 前缀下 305 项；非 node_modules 2 项：
- MANIFEST.sha256
- audit-work/w3-selftest-report.md

以下为全量 307 项（枚举顺序 = Get-ChildItem -Recurse -Force 默认顺序，格式与扫描#3输出一致）：
```
  EXTRA: MANIFEST.sha256
  EXTRA: audit-work/w3-selftest-report.md
  EXTRA: bz-oracle/forge/node_modules/.package-lock.json
  EXTRA: bz-oracle/forge/node_modules/.bin/acorn
  EXTRA: bz-oracle/forge/node_modules/.bin/terser
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/LICENSE
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/package.json
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/README.md
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/dist/gen-mapping.mjs
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/dist/gen-mapping.mjs.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/dist/gen-mapping.umd.js
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/dist/gen-mapping.umd.js.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/dist/types/gen-mapping.d.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/dist/types/set-array.d.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/dist/types/sourcemap-segment.d.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/dist/types/types.d.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/src/gen-mapping.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/src/set-array.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/src/sourcemap-segment.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/src/types.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/types/gen-mapping.d.cts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/types/gen-mapping.d.cts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/types/gen-mapping.d.mts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/types/gen-mapping.d.mts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/types/set-array.d.cts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/types/set-array.d.cts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/types/set-array.d.mts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/types/set-array.d.mts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/types/sourcemap-segment.d.cts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/types/sourcemap-segment.d.cts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/types/sourcemap-segment.d.mts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/types/sourcemap-segment.d.mts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/types/types.d.cts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/types/types.d.cts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/types/types.d.mts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/gen-mapping/types/types.d.mts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/resolve-uri/LICENSE
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/resolve-uri/package.json
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/resolve-uri/README.md
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/resolve-uri/dist/resolve-uri.mjs
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/resolve-uri/dist/resolve-uri.mjs.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/resolve-uri/dist/resolve-uri.umd.js
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/resolve-uri/dist/resolve-uri.umd.js.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/resolve-uri/dist/types/resolve-uri.d.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/source-map/LICENSE
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/source-map/package.json
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/source-map/README.md
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/source-map/dist/source-map.mjs
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/source-map/dist/source-map.mjs.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/source-map/dist/source-map.umd.js
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/source-map/dist/source-map.umd.js.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/source-map/src/source-map.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/source-map/types/source-map.d.cts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/source-map/types/source-map.d.cts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/source-map/types/source-map.d.mts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/source-map/types/source-map.d.mts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/LICENSE
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/package.json
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/README.md
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/dist/sourcemap-codec.mjs
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/dist/sourcemap-codec.mjs.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/dist/sourcemap-codec.umd.js
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/dist/sourcemap-codec.umd.js.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/src/range-mappings.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/src/scopes.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/src/sourcemap-codec.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/src/strings.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/src/vlq.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/types/range-mappings.d.cts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/types/range-mappings.d.cts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/types/range-mappings.d.mts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/types/range-mappings.d.mts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/types/scopes.d.cts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/types/scopes.d.cts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/types/scopes.d.mts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/types/scopes.d.mts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/types/sourcemap-codec.d.cts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/types/sourcemap-codec.d.cts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/types/sourcemap-codec.d.mts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/types/sourcemap-codec.d.mts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/types/strings.d.cts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/types/strings.d.cts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/types/strings.d.mts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/types/strings.d.mts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/types/vlq.d.cts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/types/vlq.d.cts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/types/vlq.d.mts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/sourcemap-codec/types/vlq.d.mts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/LICENSE
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/package.json
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/README.md
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/dist/trace-mapping.mjs
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/dist/trace-mapping.mjs.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/dist/trace-mapping.umd.js
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/dist/trace-mapping.umd.js.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/src/binary-search.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/src/by-source.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/src/flatten-map.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/src/resolve.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/src/sort.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/src/sourcemap-segment.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/src/strip-filename.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/src/trace-mapping.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/src/types.ts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/binary-search.d.cts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/binary-search.d.cts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/binary-search.d.mts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/binary-search.d.mts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/by-source.d.cts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/by-source.d.cts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/by-source.d.mts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/by-source.d.mts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/flatten-map.d.cts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/flatten-map.d.cts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/flatten-map.d.mts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/flatten-map.d.mts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/resolve.d.cts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/resolve.d.cts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/resolve.d.mts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/resolve.d.mts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/sort.d.cts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/sort.d.cts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/sort.d.mts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/sort.d.mts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/sourcemap-segment.d.cts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/sourcemap-segment.d.cts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/sourcemap-segment.d.mts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/sourcemap-segment.d.mts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/strip-filename.d.cts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/strip-filename.d.cts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/strip-filename.d.mts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/strip-filename.d.mts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/trace-mapping.d.cts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/trace-mapping.d.cts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/trace-mapping.d.mts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/trace-mapping.d.mts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/types.d.cts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/types.d.cts.map
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/types.d.mts
  EXTRA: bz-oracle/forge/node_modules/@jridgewell/trace-mapping/types/types.d.mts.map
  EXTRA: bz-oracle/forge/node_modules/acorn/CHANGELOG.md
  EXTRA: bz-oracle/forge/node_modules/acorn/LICENSE
  EXTRA: bz-oracle/forge/node_modules/acorn/package.json
  EXTRA: bz-oracle/forge/node_modules/acorn/README.md
  EXTRA: bz-oracle/forge/node_modules/acorn/bin/acorn
  EXTRA: bz-oracle/forge/node_modules/acorn/dist/acorn.d.mts
  EXTRA: bz-oracle/forge/node_modules/acorn/dist/acorn.d.ts
  EXTRA: bz-oracle/forge/node_modules/acorn/dist/acorn.js
  EXTRA: bz-oracle/forge/node_modules/acorn/dist/acorn.mjs
  EXTRA: bz-oracle/forge/node_modules/acorn/dist/bin.js
  EXTRA: bz-oracle/forge/node_modules/acorn-walk/CHANGELOG.md
  EXTRA: bz-oracle/forge/node_modules/acorn-walk/LICENSE
  EXTRA: bz-oracle/forge/node_modules/acorn-walk/package.json
  EXTRA: bz-oracle/forge/node_modules/acorn-walk/README.md
  EXTRA: bz-oracle/forge/node_modules/acorn-walk/dist/walk.d.mts
  EXTRA: bz-oracle/forge/node_modules/acorn-walk/dist/walk.d.ts
  EXTRA: bz-oracle/forge/node_modules/acorn-walk/dist/walk.js
  EXTRA: bz-oracle/forge/node_modules/acorn-walk/dist/walk.mjs
  EXTRA: bz-oracle/forge/node_modules/buffer-from/index.js
  EXTRA: bz-oracle/forge/node_modules/buffer-from/LICENSE
  EXTRA: bz-oracle/forge/node_modules/buffer-from/package.json
  EXTRA: bz-oracle/forge/node_modules/buffer-from/readme.md
  EXTRA: bz-oracle/forge/node_modules/commander/CHANGELOG.md
  EXTRA: bz-oracle/forge/node_modules/commander/index.js
  EXTRA: bz-oracle/forge/node_modules/commander/LICENSE
  EXTRA: bz-oracle/forge/node_modules/commander/package.json
  EXTRA: bz-oracle/forge/node_modules/commander/Readme.md
  EXTRA: bz-oracle/forge/node_modules/commander/typings/index.d.ts
  EXTRA: bz-oracle/forge/node_modules/fast-check/LICENSE
  EXTRA: bz-oracle/forge/node_modules/fast-check/package.json
  EXTRA: bz-oracle/forge/node_modules/fast-check/README.md
  EXTRA: bz-oracle/forge/node_modules/fast-check/lib/fast-check.d.ts
  EXTRA: bz-oracle/forge/node_modules/fast-check/lib/fast-check.js
  EXTRA: bz-oracle/forge/node_modules/fast-check/lib/rolldown-runtime-D7D4PA-g.js
  EXTRA: bz-oracle/forge/node_modules/fast-check/lib/cjs/fast-check.d.ts
  EXTRA: bz-oracle/forge/node_modules/fast-check/lib/cjs/fast-check.js
  EXTRA: bz-oracle/forge/node_modules/fast-check/lib/cjs/package.json
  EXTRA: bz-oracle/forge/node_modules/fast-check/lib/cjs/types57/fast-check.d.ts
  EXTRA: bz-oracle/forge/node_modules/fast-check/lib/types57/fast-check.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/LICENSE
  EXTRA: bz-oracle/forge/node_modules/pure-rand/package.json
  EXTRA: bz-oracle/forge/node_modules/pure-rand/README.md
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/RandomGenerator-DcXj09Ch.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/distribution/uniformBigInt.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/distribution/uniformBigInt.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/distribution/uniformFloat32.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/distribution/uniformFloat32.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/distribution/uniformFloat64.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/distribution/uniformFloat64.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/distribution/uniformInt.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/distribution/uniformInt.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/package.json
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/RandomGenerator-DcXj09Ch.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/distribution/uniformBigInt.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/distribution/uniformBigInt.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/distribution/uniformFloat32.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/distribution/uniformFloat32.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/distribution/uniformFloat64.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/distribution/uniformFloat64.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/distribution/uniformInt.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/distribution/uniformInt.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/generator/congruential32.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/generator/congruential32.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/generator/mersenne.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/generator/mersenne.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/generator/xoroshiro128plus.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/generator/xoroshiro128plus.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/generator/xorshift128plus.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/generator/xorshift128plus.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/types/JumpableRandomGenerator.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/types/JumpableRandomGenerator.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/types/RandomGenerator.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/types/RandomGenerator.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/utils/generateN.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/utils/generateN.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/utils/purify.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/utils/purify.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/utils/skipN.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/esm/utils/skipN.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/generator/congruential32.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/generator/congruential32.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/generator/mersenne.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/generator/mersenne.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/generator/xoroshiro128plus.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/generator/xoroshiro128plus.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/generator/xorshift128plus.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/generator/xorshift128plus.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/types/JumpableRandomGenerator.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/types/JumpableRandomGenerator.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/types/RandomGenerator.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/types/RandomGenerator.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/utils/generateN.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/utils/generateN.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/utils/purify.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/utils/purify.js
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/utils/skipN.d.ts
  EXTRA: bz-oracle/forge/node_modules/pure-rand/lib/utils/skipN.js
  EXTRA: bz-oracle/forge/node_modules/source-map/CHANGELOG.md
  EXTRA: bz-oracle/forge/node_modules/source-map/LICENSE
  EXTRA: bz-oracle/forge/node_modules/source-map/package.json
  EXTRA: bz-oracle/forge/node_modules/source-map/README.md
  EXTRA: bz-oracle/forge/node_modules/source-map/source-map.d.ts
  EXTRA: bz-oracle/forge/node_modules/source-map/source-map.js
  EXTRA: bz-oracle/forge/node_modules/source-map/dist/source-map.debug.js
  EXTRA: bz-oracle/forge/node_modules/source-map/dist/source-map.js
  EXTRA: bz-oracle/forge/node_modules/source-map/dist/source-map.min.js
  EXTRA: bz-oracle/forge/node_modules/source-map/dist/source-map.min.js.map
  EXTRA: bz-oracle/forge/node_modules/source-map/lib/array-set.js
  EXTRA: bz-oracle/forge/node_modules/source-map/lib/base64-vlq.js
  EXTRA: bz-oracle/forge/node_modules/source-map/lib/base64.js
  EXTRA: bz-oracle/forge/node_modules/source-map/lib/binary-search.js
  EXTRA: bz-oracle/forge/node_modules/source-map/lib/mapping-list.js
  EXTRA: bz-oracle/forge/node_modules/source-map/lib/quick-sort.js
  EXTRA: bz-oracle/forge/node_modules/source-map/lib/source-map-consumer.js
  EXTRA: bz-oracle/forge/node_modules/source-map/lib/source-map-generator.js
  EXTRA: bz-oracle/forge/node_modules/source-map/lib/source-node.js
  EXTRA: bz-oracle/forge/node_modules/source-map/lib/util.js
  EXTRA: bz-oracle/forge/node_modules/source-map-support/browser-source-map-support.js
  EXTRA: bz-oracle/forge/node_modules/source-map-support/LICENSE.md
  EXTRA: bz-oracle/forge/node_modules/source-map-support/package.json
  EXTRA: bz-oracle/forge/node_modules/source-map-support/README.md
  EXTRA: bz-oracle/forge/node_modules/source-map-support/register-hook-require.js
  EXTRA: bz-oracle/forge/node_modules/source-map-support/register.js
  EXTRA: bz-oracle/forge/node_modules/source-map-support/source-map-support.js
  EXTRA: bz-oracle/forge/node_modules/terser/CHANGELOG.md
  EXTRA: bz-oracle/forge/node_modules/terser/LICENSE
  EXTRA: bz-oracle/forge/node_modules/terser/main.js
  EXTRA: bz-oracle/forge/node_modules/terser/package.json
  EXTRA: bz-oracle/forge/node_modules/terser/PATRONS.md
  EXTRA: bz-oracle/forge/node_modules/terser/README.md
  EXTRA: bz-oracle/forge/node_modules/terser/bin/package.json
  EXTRA: bz-oracle/forge/node_modules/terser/bin/terser
  EXTRA: bz-oracle/forge/node_modules/terser/bin/uglifyjs
  EXTRA: bz-oracle/forge/node_modules/terser/dist/.gitkeep
  EXTRA: bz-oracle/forge/node_modules/terser/dist/bundle.min.js
  EXTRA: bz-oracle/forge/node_modules/terser/dist/package.json
  EXTRA: bz-oracle/forge/node_modules/terser/lib/ast.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/cli.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/equivalent-to.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/minify.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/mozilla-ast.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/output.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/parse.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/propmangle.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/scope.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/size.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/sourcemap.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/transform.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/unicode.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/compress/common.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/compress/compressor-flags.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/compress/drop-side-effect-free.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/compress/drop-unused.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/compress/evaluate.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/compress/global-defs.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/compress/index.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/compress/inference.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/compress/inline.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/compress/native-objects.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/compress/reduce-vars.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/compress/tighten-body.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/utils/first_in_statement.js
  EXTRA: bz-oracle/forge/node_modules/terser/lib/utils/index.js
  EXTRA: bz-oracle/forge/node_modules/terser/tools/domprops.js
  EXTRA: bz-oracle/forge/node_modules/terser/tools/exit.cjs
  EXTRA: bz-oracle/forge/node_modules/terser/tools/props.html
  EXTRA: bz-oracle/forge/node_modules/terser/tools/terser.d.ts
```
