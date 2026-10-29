# w4 差异清点报告：midaudit-v21 (A) vs audit-v22 (B)

- 执行者：w4 只读差异清点工人（工程苦力档：只做列明的机械动作——读、抄、取、比、统计；不设计、不判断、不给意见）
- 执行时间：2026-10-23 17:56 (+08:00)
- 模式：全只读。除本报告文件 `F:\BaoZouyxt\audit-work22\w4-diff.md`（及容纳它的 `audit-work22\` 目录，经工单授权"先建目录"）外，未创建/修改/删除任何文件；未执行任何删除/清理类命令。
- 工具：PowerShell（pwsh）`Get-ChildItem` / `Get-FileHash`（SHA-256）；独立交叉验证 `certutil -hashfile`。
- A = `F:\BaoZouyxt\midaudit-v21`；B = `F:\BaoZouyxt\audit-v22`。

## 0. 方法与键定义

- **键**：`bz-oracle\` 与 `r21\` 之下的相对路径（键含 `bz-oracle\` / `r21\` 前缀，分隔符 `\`，如 `bz-oracle\config\oracle.config.json`）。
- **排除**：相对路径中任一**祖先目录**名为 `node_modules` 或 `out`（文件本身名不算，双方同样处理）。被排除者单列统计：node_modules 见 §4，out 见 §5。
- **哈希**：SHA-256（`Get-FileHash -Algorithm SHA256`），**判定用 64 位全长哈希**，报告表格展示前 8 位。
- **封闭判定**：c 类 = 双方都有且**字节数不同**；d 类 = 双方都有且**字节数相同**（d 类另做附加全长哈希复核，见 §6.1，属超出工单的机械验证）。
- **恶劣文件名检查**：A/B 全部清点范围内相对路径含 `|`、CR、LF 的文件数 = 0（§6.2），故本报告 `|` 分隔格式无歧义。

## 1. 清点①：四类清单（排除双方 node_modules 与 out 后）

**命令原文（清点①）**：
```powershell
$ErrorActionPreference='Stop'
$A='F:\BaoZouyxt\midaudit-v21'; $B='F:\BaoZouyxt\audit-v22'
function Inv($base){
  $acc=@()
  foreach($r in @('bz-oracle','r21')){
    $p=Join-Path $base $r
    if(-not (Test-Path -LiteralPath $p)){ Write-Warning ("MISSINGROOT "+$base+" "+$r); continue }
    foreach($f in (Get-ChildItem -LiteralPath $p -Recurse -File -Force)){
      $rel=$f.FullName.Substring($base.Length+1)
      $parts=$rel -split '\\'
      $dirs=@($parts | Select-Object -First ($parts.Count-1))
      if(($dirs -contains 'node_modules') -or ($dirs -contains 'out')){ continue }
      $acc += ($rel + '|' + $f.Length)
    }
  }
  return ,$acc
}
function HF($p){ (Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash.ToLower() }
$ia=Inv $A; $ib=Inv $B
$ma=@{}; foreach($l in $ia){ $i=$l.LastIndexOf('|'); $ma[$l.Substring(0,$i)]=$l.Substring($i+1) }
$mb=@{}; foreach($l in $ib){ $i=$l.LastIndexOf('|'); $mb[$l.Substring(0,$i)]=$l.Substring($i+1) }
$onlyB=@($mb.Keys | Where-Object { -not $ma.ContainsKey($_) } | Sort-Object)
$onlyA=@($ma.Keys | Where-Object { -not $mb.ContainsKey($_) } | Sort-Object)
$common=@($ma.Keys | Where-Object { $mb.ContainsKey($_) } | Sort-Object)
$changed=@(); $same=@()
foreach($k in $common){ if($ma[$k] -cne $mb[$k]){ $changed+=$k } else { $same+=$k } }
"COUNTS|A_files_after_excl=$($ia.Count)|B_files_after_excl=$($ib.Count)|onlyB=$($onlyB.Count)|onlyA=$($onlyA.Count)|changed=$($changed.Count)|same=$($same.Count)"
foreach($r in @('bz-oracle','r21')){
  "ROOTCOUNT|A|$r|$(@(Get-ChildItem -LiteralPath (Join-Path $A $r) -Recurse -File -Force -ErrorAction SilentlyContinue).Count)"
  "ROOTCOUNT|B|$r|$(@(Get-ChildItem -LiteralPath (Join-Path $B $r) -Recurse -File -Force -ErrorAction SilentlyContinue).Count)"
}
"BADNAME_COUNT(a pipe/CR/LF inside any rel path)=$(@(($ia+$ib) | Where-Object { $_ -match '[|\r\n]' }).Count)"
"== ONLY_B rel|bytes =="
$onlyB | ForEach-Object { $_ + '|' + $mb[$_] }
"== ONLY_A rel =="
$onlyA
"== CHANGED rel|aBytes|bBytes|aFullSHA256|bFullSHA256 =="
foreach($k in $changed){ $k + '|' + $ma[$k] + '|' + $mb[$k] + '|' + (HF (Join-Path $A $k)) + '|' + (HF (Join-Path $B $k)) }
"== SAME-LENGTH CONTENT CHECK (full SHA256, additional mechanical recheck) =="
$mis=0
foreach($k in $same){ if((HF (Join-Path $A $k)) -cne (HF (Join-Path $B $k))){ $mis++; 'CONTENT_MISMATCH|'+$k } }
"SAME_CONTENT_MISMATCH_COUNT=$mis"
```
**退出码：0**。**关键输出（原样）**：
```
COUNTS|A_files_after_excl=81|B_files_after_excl=102|onlyB=21|onlyA=0|changed=26|same=55
ROOTCOUNT|A|bz-oracle|397
ROOTCOUNT|B|bz-oracle|417
ROOTCOUNT|A|r21|10
ROOTCOUNT|B|r21|10
BADNAME_COUNT(a pipe/CR/LF inside any rel path)=183
```
（注：BADNAME_COUNT=183 是该命令正则把自加的 `|` 分隔符也计入了的**检查方法缺陷**，非数据问题；正确复核见 §6.2，BADNAME_COUNT=0。以下清单不受影响——键的还原用 `LastIndexOf('|')` 取最后一个分隔符，即使文件名含 `|` 也能正确切分。）

### 1a. 仅 B 有（新增）：21 个

| # | 相对路径 | B 字节数 |
|---|---|---|
| 1 | bz-oracle\CHANGELOG-v2.2.md | 3579 |
| 2 | bz-oracle\config\stub-deny.json | 357 |
| 3 | bz-oracle\docs\中层审计处置回执.md | 6701 |
| 4 | bz-oracle\fixtures\audit-neg\fp1-no-contract.json | 2609 |
| 5 | bz-oracle\fixtures\audit-neg\fp2a-abolish.json | 3085 |
| 6 | bz-oracle\fixtures\audit-neg\fp2b-fullreload.json | 2616 |
| 7 | bz-oracle\fixtures\audit-neg\fp2c-l4allow.json | 462 |
| 8 | bz-oracle\fixtures\audit-neg\fp3-probe-none.json | 3622 |
| 9 | bz-oracle\fixtures\audit-neg\fp4-no-save.json | 461 |
| 10 | bz-oracle\fixtures\make-audit-neg.js | 2634 |
| 11 | bz-oracle\forge\fixtures\client-src\cx-client.js | 1084 |
| 12 | bz-oracle\forge\fixtures\gen-domain\User.saleItem.js | 194 |
| 13 | bz-oracle\forge\fixtures\gen-evil\e1-fs.js | 232 |
| 14 | bz-oracle\forge\fixtures\gen-evil\e2-process.js | 207 |
| 15 | bz-oracle\forge\fixtures\gen-evil\e3-dynreq.js | 216 |
| 16 | bz-oracle\forge\fixtures\gen-evil\e4-bare.js | 137 |
| 17 | bz-oracle\forge\fixtures\gen-evil\e5-shadow.js | 245 |
| 18 | bz-oracle\forge\fixtures\gen-evil\e6-eval.js | 180 |
| 19 | bz-oracle\forge\fixtures\gen-evil\e7-cache.js | 226 |
| 20 | bz-oracle\forge\lib\gen-gate.js | 5409 |
| 21 | bz-oracle\forge\tools\test-client-model.js | 2705 |

新增合计：36,961 字节（机械求和）。

### 1b. 仅 A 有（删除）：0 个

原始输出 `== ONLY_A rel ==` 段为空。

### 1c. 双方都有但字节数不同（改动）：26 个

| # | 相对路径 | A 字节 | B 字节 | A SHA-256 前8 | B SHA-256 前8 |
|---|---|---|---|---|---|
| 1 | bz-oracle\config\oracle.config.json | 1713 | 2799 | 15ac4248 | 83782c60 |
| 2 | bz-oracle\device\sim-test.js | 5848 | 6405 | 0baee948 | f46ca300 |
| 3 | bz-oracle\forge\agent\nightly.js | 4444 | 7882 | db9d2bbd | 88779e60 |
| 4 | bz-oracle\forge\agent\prompt-pack.js | 4045 | 4658 | 834b4500 | 71c7cac0 |
| 5 | bz-oracle\forge\fixtures\client-src\demo-client.js | 1154 | 1434 | db8f7446 | bba6c30e |
| 6 | bz-oracle\forge\lib\ast-expand.js | 9738 | 11698 | a256e352 | f85e7bad |
| 7 | bz-oracle\forge\lib\client-model.js | 1674 | 3884 | 71144b97 | ac958589 |
| 8 | bz-oracle\forge\lib\projector.js | 4547 | 4949 | fe5bcd44 | 82f3154e |
| 9 | bz-oracle\forge\lib\stub.js | 2395 | 3757 | d817d8cb | 0eced257 |
| 10 | bz-oracle\forge\README.md | 9883 | 11397 | edba86ce | afcac485 |
| 11 | bz-oracle\forge\replay\fuzz.js | 5033 | 5119 | 25118a17 | 62392e4b |
| 12 | bz-oracle\forge\replay\model-test.js | 4565 | 4843 | 38496284 | 7df31b9e |
| 13 | bz-oracle\forge\replay\replay.js | 4719 | 4987 | 3096079b | 6f0191f0 |
| 14 | bz-oracle\forge\replay\server.js | 1859 | 3778 | d10713ab | 5fa93390 |
| 15 | bz-oracle\forge\tools\expand-handlers.js | 10601 | 11341 | 556a57d3 | 565045dc |
| 16 | bz-oracle\forge\tools\extract-req-params.js | 3369 | 4324 | d90e3a9a | 5924ecdd |
| 17 | bz-oracle\forge\tools\gen-stubs.js | 1420 | 1524 | 72004a2a | 2222a86d |
| 18 | bz-oracle\forge\tools\har2cases.js | 3404 | 3738 | b25eeb62 | 96f7deb0 |
| 19 | bz-oracle\forge\tools\test-expander.js | 3136 | 4640 | 400b55fe | aaf205e3 |
| 20 | bz-oracle\host\build-contracts.js | 6102 | 6706 | d828d172 | d4422171 |
| 21 | bz-oracle\host\judge.js | 5086 | 5567 | 9bd79e0d | fb47a280 |
| 22 | bz-oracle\host\lib\layers.js | 20123 | 22096 | 41292c77 | e466f724 |
| 23 | bz-oracle\host\mutate.js | 10065 | 11755 | ff55c531 | 648640b8 |
| 24 | bz-oracle\README.md | 8746 | 8993 | b7090122 | 5d2f24b8 |
| 25 | bz-oracle\scripts\loop.sh | 2564 | 2999 | c91fee1f | fa7a5694 |
| 26 | bz-oracle\scripts\selftest.sh | 7458 | 11855 | 0ad48c98 | 97f76332 |

（26 行的全长 SHA-256 见 §7 清点①原始输出，判定均基于全长哈希。）

### 1d. 双方都有且字节相同：55 个（按工单只给计数，不列表）

**计数：55。** 附加机械复核（超出工单封闭判定，见 §6.1）：55 个全部 SHA-256 全长一致，同长不同内容 = 0。

### 计数守恒校验（内部一致性）

- A 排除后 81 = 仅A 0 + 共同 81（= 55 same + 26 changed）✓
- B 排除后 102 = 共同 81 + 仅B 21 ✓
- A|bz-oracle 原始文件总数 397 = 71（排除后）+ 21（bz-oracle\out）+ 305（bz-oracle\forge\node_modules）✓
- B|bz-oracle 原始文件总数 417 = 92（排除后）+ 20（bz-oracle\out）+ 305（bz-oracle\forge\node_modules）✓
- A|r21 = 10 = B|r21 = 10 ✓

## 2. 清点②：r21\ 下 10 个文件逐一 SHA-256 对比

**命令原文（清点②）**：
```powershell
$ErrorActionPreference='Stop'
$A='F:\BaoZouyxt\midaudit-v21'; $B='F:\BaoZouyxt\audit-v22'
function R21($base){
  $h=@{}
  $p=Join-Path $base 'r21'
  if(Test-Path -LiteralPath $p){
    foreach($f in (Get-ChildItem -LiteralPath $p -Recurse -File -Force)){ $h[$f.FullName.Substring($base.Length+1)]=(Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash.ToLower()+'|'+$f.Length }
  }
  return ,$h
}
$ra=R21 $A; $rb=R21 $B
"A_r21_filecount=$($ra.Count) B_r21_filecount=$($rb.Count)"
"== rel|Abytes|Ahash8|Bhash8|Bbytes|VERDICT(based on full 64-hex SHA256) =="
$keys=@(@($ra.Keys)+@($rb.Keys) | Sort-Object -Unique)
foreach($k in $keys){
  $va=$ra[$k]; $vb=$rb[$k]
  $a8='<none>'; $b8='<none>'; $al='<none>'; $bl='<none>'
  if($va){ $al=($va -split '\|')[1]; $a8=(($va -split '\|')[0]).Substring(0,8) }
  if($vb){ $bl=($vb -split '\|')[1]; $b8=(($vb -split '\|')[0]).Substring(0,8) }
  $v=if($va -and $vb){ if($va -ceq $vb){'IDENTICAL(full-hash)'}else{'DIFFERENT(full-hash)'} } elseif($va){'ONLY_IN_A'}else{'ONLY_IN_B'}
  $k+'|'+$al+'|'+$a8+'|'+$b8+'|'+$bl+'|'+$v
}
```
**退出码：0**。**关键输出（整理为表，判定基于全长哈希）**：

| 相对路径 | A 字节 | A 前8 | B 前8 | B 字节 | 判定 |
|---|---|---|---|---|---|
| r21\00-INSTRUCTION.txt | 1173 | ad1cfa63 | ad1cfa63 | 1173 | 完全一致 |
| r21\29-R21-送评材料-全量.md | 27257 | 5fc638e4 | 5fc638e4 | 27257 | 完全一致 |
| r21\h1.txt | 22104 | a1c92ece | a1c92ece | 22104 | 完全一致 |
| r21\h3.txt | 2680 | a640c932 | a640c932 | 2680 | 完全一致 |
| r21\M1-动作全集表.md | 72802 | 6c4546b0 | 6c4546b0 | 72802 | 完全一致 |
| r21\M1-动作全集表.tsv | 54346 | ed2a4eee | ed2a4eee | 54346 | 完全一致 |
| r21\M2-客户端读点索引.md | 640965 | e1940b69 | e1940b69 | 640965 | 完全一致 |
| r21\M3-存档字段字典.md | 7810 | c02328f6 | c02328f6 | 7810 | 完全一致 |
| r21\M4-note五子表语义表.md | 12074 | 671a8f7e | 671a8f7e | 12074 | 完全一致 |
| r21\R21-回执.md | 31117 | 93c06699 | 93c06699 | 31117 | 完全一致 |

原始首行：`A_r21_filecount=10 B_r21_filecount=10`；10 行判定全部为 `IDENTICAL(full-hash)`。

**结论：r21\ 下 10 个文件 A/B 完全一致（10/10，全长 SHA-256 逐文件相同）。**

独立交叉验证（`certutil -hashfile <path> SHA256`，退出码 0；提示行有 GBK 乱码但哈希行可读）：
```
F:\BaoZouyxt\midaudit-v21\r21\00-INSTRUCTION.txt → ad1cfa638302944e9b5b2b2c22f171fa32b1b2fca4cb08a5b621bb1a8491506e
F:\BaoZouyxt\audit-v22\r21\00-INSTRUCTION.txt  → ad1cfa638302944e9b5b2b2c22f171fa32b1b2fca4cb08a5b621bb1a8491506e
```
与 Get-FileHash 结果（前 8 位 ad1cfa63）一致。

## 3. 清点③：B/A 顶层对比 + MANIFEST 或校验和文件检查

**命令原文（清点③，含 §0 结构侦察）**：
```powershell
$ErrorActionPreference='Continue'
$A='F:\BaoZouyxt\midaudit-v21'; $B='F:\BaoZouyxt\audit-v22'
function FindSpecialDirs($root){
  $stack=@($root); $found=@()
  while($stack.Count -gt 0){
    $d=$stack[0]
    $stack=@($stack | Select-Object -Skip 1)
    foreach($c in @(Get-ChildItem -LiteralPath $d -Directory -Force -ErrorAction SilentlyContinue)){
      if($c.Name -eq 'node_modules' -or $c.Name -eq 'out'){ $found+=$c.FullName }
      else { $stack+=$c.FullName }
    }
  }
  return ,$found
}
foreach($base in @($A,$B)){
  "### BASE|$base|EXISTS=$(Test-Path -LiteralPath $base)"
  "-- TOPLEVEL (DIR first, then files) --"
  Get-ChildItem -LiteralPath $base -Force -ErrorAction SilentlyContinue | Sort-Object @{e={$_.PSIsContainer};Descending=$true},Name | ForEach-Object { if($_.PSIsContainer){'DIR |'+$_.Name}else{'FILE|'+$_.Name+'|'+$_.Length+'B'} }
  "-- node_modules / out dirs (pruned search: 不进入命中目录内部) --"
  FindSpecialDirs $base | ForEach-Object { $_.Substring($base.Length+1) }
}
"--- B top MANIFEST/checksum-pattern names (regex: manifest|checksum|sha-256|sha1|md5|.sum|hashes) ---"
$pat='(?i)manifest|checksum|sha_?-?256|sha1|md5|\.sum$|hashes'
$bHit=@(Get-ChildItem -LiteralPath $B -Force | Where-Object { $_.Name -match $pat })
'B_HIT_COUNT='+$bHit.Count
$bHit | ForEach-Object { $_.Name }
"--- A top same-pattern names ---"
$aHit=@(Get-ChildItem -LiteralPath $A -Force | Where-Object { $_.Name -match $pat })
'A_HIT_COUNT='+$aHit.Count
$aHit | ForEach-Object { $_.Name }
```
**退出码：0**。**关键输出（原样）**：
```
### BASE|F:\BaoZouyxt\midaudit-v21|EXISTS=True
-- TOPLEVEL (DIR first, then files) --
DIR |audit-work
DIR |bz-oracle
DIR |r21
FILE|00-INSTRUCTION.txt|1203B
FILE|30-中层审计材料.md|7688B
FILE|MANIFEST.sha256|10813B
FILE|README-先看.txt|497B
-- node_modules / out dirs (pruned search: 不进入命中目录内部) --
bz-oracle\out
bz-oracle\forge\node_modules
audit-work\main-scratch\bz-oracle\out
audit-work\main-scratch\bz-oracle\forge\node_modules
### BASE|F:\BaoZouyxt\audit-v22|EXISTS=True
-- TOPLEVEL (DIR first, then files) --
DIR |bz-oracle
DIR |r21
-- node_modules / out dirs (pruned search: 不进入命中目录内部) --
bz-oracle\out
bz-oracle\forge\node_modules
--- B top MANIFEST/checksum-pattern names (regex: manifest|checksum|sha-256|sha1|md5|.sum|hashes) ---
B_HIT_COUNT=0
--- A top same-pattern names ---
A_HIT_COUNT=1
MANIFEST.sha256
```

**结论（机械事实）**：
- **B 顶层没有任何文件**（只有 `bz-oracle\`、`r21\` 两个目录）→ **B 包顶层没有 MANIFEST 或校验和文件**（命名模式匹配命中 0）。
- A 顶层有 4 个文件 + 1 个额外目录：`00-INSTRUCTION.txt`(1203B)、`30-中层审计材料.md`(7688B)、`MANIFEST.sha256`(10813B)、`README-先看.txt`(497B)、DIR `audit-work`。
- 顶层差异 = A 比 B 多上述 4 文件 + `audit-work\` 目录；B 比 A 多：无。

## 4. 清点④：node_modules 文件数与总字节数（不做逐文件比对）

**首跑作废记录**：首跑用「函数返回 `,$array` 再 `@()` 包装」的写法，`$nm` 取到数组而非元素导致 `Get-ChildItem -LiteralPath $null` 绑定错误，**退出码 1，结果作废**。以下为内联无函数重跑。

**命令原文（清点④重跑）**：
```powershell
$ErrorActionPreference='Continue'
$A='F:\BaoZouyxt\midaudit-v21'; $B='F:\BaoZouyxt\audit-v22'
foreach($base in @($A,$B)){
  "### "+$base
  $stack=@($base); $nms=@()
  while($stack.Count -gt 0){
    $d=$stack[0]
    $stack=@($stack | Select-Object -Skip 1)
    $kids=@(Get-ChildItem -LiteralPath $d -Directory -Force -ErrorAction SilentlyContinue)
    foreach($c in $kids){
      if($c.Name -eq 'node_modules'){ $nms+=$c.FullName }
      else { $stack+=$c.FullName }
    }
  }
  "NM_DIRS_FOUND="+$nms.Count
  if($nms.Count -eq 0){ 'NO_NODE_MODULES'; continue }
  foreach($nm in $nms){
    $fs=@(Get-ChildItem -LiteralPath $nm -Recurse -File -Force -ErrorAction SilentlyContinue)
    $sum=0; foreach($x in $fs){ $sum += $x.Length }
    $nm.Substring($base.Length+1)+'|files='+$fs.Count+'|bytes='+$sum
  }
}
```
**退出码：0**。**关键输出（原样）**：
```
### F:\BaoZouyxt\midaudit-v21
NM_DIRS_FOUND=2
bz-oracle\forge\node_modules|files=305|bytes=5952904
audit-work\main-scratch\bz-oracle\forge\node_modules|files=305|bytes=5952904
### F:\BaoZouyxt\audit-v22
NM_DIRS_FOUND=1
bz-oracle\forge\node_modules|files=305|bytes=5952904
```

**结论（机械事实）**：
- 工单范围内（`bz-oracle\forge\node_modules`）：A = **305 文件 / 5,952,904 字节**；B = **305 文件 / 5,952,904 字节**。两侧文件数与总字节数**相同**。
- 范围外记录：A 另有 `audit-work\main-scratch\bz-oracle\forge\node_modules` = 305 文件 / 5,952,904 字节（B 无 `audit-work\`，无对应物）。
- 方法：搜索时找到 node_modules 后**不进入其内部继续找**（无嵌套重复计数）；统计为该目录递归全部文件（含隐藏）。**未做逐文件比对**（工单规定）。

## 5. 清点⑤：out\ 目录文件名集合差异（不比内容）

**首跑作废记录**：首跑同样使用函数包装写法，返回空结果（A_out_entries=0），与文件数守恒校验矛盾（见 §1 守恒），**结果作废**。以下为内联无函数重跑。

**命令原文（清点⑤重跑）**：
```powershell
$ErrorActionPreference='Continue'
$A='F:\BaoZouyxt\midaudit-v21'; $B='F:\BaoZouyxt\audit-v22'
$oa=@{}
$stack=@($A); $ods=@()
while($stack.Count -gt 0){
  $d=$stack[0]; $stack=@($stack | Select-Object -Skip 1)
  $kids=@(Get-ChildItem -LiteralPath $d -Directory -Force -ErrorAction SilentlyContinue)
  foreach($c in $kids){ if($c.Name -eq 'out'){ $ods+=$c.FullName } else { $stack+=$c.FullName } }
}
"OUTDIRS_A="+$ods.Count+" -> "+($ods -join ' ; ')
foreach($od in $ods){
  $odrel=$od.Substring($A.Length+1)
  $fs=@(Get-ChildItem -LiteralPath $od -Recurse -File -Force -ErrorAction SilentlyContinue)
  "OUTDIR|"+$odrel+"|filecount="+$fs.Count
  foreach($f in $fs){ $oa[$odrel+'::'+$f.FullName.Substring($od.Length+1)]=$f.Length }
}
$ob=@{}
$stack=@($B); $ods=@()
while($stack.Count -gt 0){
  $d=$stack[0]; $stack=@($stack | Select-Object -Skip 1)
  $kids=@(Get-ChildItem -LiteralPath $d -Directory -Force -ErrorAction SilentlyContinue)
  foreach($c in $kids){ if($c.Name -eq 'out'){ $ods+=$c.FullName } else { $stack+=$c.FullName } }
}
"OUTDIRS_B="+$ods.Count+" -> "+($ods -join ' ; ')
foreach($od in $ods){
  $odrel=$od.Substring($B.Length+1)
  $fs=@(Get-ChildItem -LiteralPath $od -Recurse -File -Force -ErrorAction SilentlyContinue)
  "OUTDIR|"+$odrel+"|filecount="+$fs.Count
  foreach($f in $fs){ $ob[$odrel+'::'+$f.FullName.Substring($od.Length+1)]=$f.Length }
}
"A_out_entries="+$oa.Count+" B_out_entries="+$ob.Count
"== OUT_ONLY_IN_B key|bytes =="
@($ob.Keys | Where-Object { -not $oa.ContainsKey($_) } | Sort-Object) | ForEach-Object { $_ + '|' + $ob[$_] }
"== OUT_ONLY_IN_A key =="
@($oa.Keys | Where-Object { -not $ob.ContainsKey($_) } | Sort-Object)
"OUT_COMMON_COUNT=" + @($oa.Keys | Where-Object { $ob.ContainsKey($_) }).Count
```
**退出码：0**。**关键输出（原样）**：
```
OUTDIRS_A=2 -> F:\BaoZouyxt\midaudit-v21\bz-oracle\out ; F:\BaoZouyxt\midaudit-v21\audit-work\main-scratch\bz-oracle\out
OUTDIR|bz-oracle\out|filecount=21
OUTDIR|audit-work\main-scratch\bz-oracle\out|filecount=23
OUTDIRS_B=1 -> F:\BaoZouyxt\audit-v22\bz-oracle\out
OUTDIR|bz-oracle\out|filecount=20
A_out_entries=44 B_out_entries=20
== OUT_ONLY_IN_B key|bytes ==
bz-oracle\out::pre-push\projector.js|4949
== OUT_ONLY_IN_A key ==
audit-work\main-scratch\bz-oracle\out::build-stamp.demo.json
audit-work\main-scratch\bz-oracle\out::build-stamp.json
audit-work\main-scratch\bz-oracle\out::captured\cap.0000.buyShopItem.json
audit-work\main-scratch\bz-oracle\out::captured\cap.0001.saleItem.json
audit-work\main-scratch\bz-oracle\out::contracts.json
audit-work\main-scratch\bz-oracle\out::dashboard.md
audit-work\main-scratch\bz-oracle\out::device-pull\projector.js
audit-work\main-scratch\bz-oracle\out::device-pull\stub.js
audit-work\main-scratch\bz-oracle\out::effects.demo.json
audit-work\main-scratch\bz-oracle\out::effects.json
audit-work\main-scratch\bz-oracle\out::expanded.demo.json
audit-work\main-scratch\bz-oracle\out::material-counts.md
audit-work\main-scratch\bz-oracle\out::mutation.json
audit-work\main-scratch\bz-oracle\out::nightly.jsonl
audit-work\main-scratch\bz-oracle\out::registry.json
audit-work\main-scratch\bz-oracle\out::registry.nightly.json
audit-work\main-scratch\bz-oracle\out::replay-a1.json
audit-work\main-scratch\bz-oracle\out::replay-a2.json
audit-work\main-scratch\bz-oracle\out::replay-report.json
audit-work\main-scratch\bz-oracle\out::report.json
audit-work\main-scratch\bz-oracle\out::req-params.demo.json
audit-work\main-scratch\bz-oracle\out::stubs.json
audit-work\main-scratch\bz-oracle\out::templates.captured.json
bz-oracle\out::device-pull\stub.js
bz-oracle\out::nightly.jsonl
OUT_COMMON_COUNT=19
```

**结论（机械事实，in-scope `bz-oracle\out` 为主判定；内容未比对）**：
- `bz-oracle\out`：A = 21 文件，B = 20 文件，双方共有 19 文件。守恒：21 = 19+2 ✓；20 = 19+1 ✓。
- **新增（仅 B 有）**：`bz-oracle\out\pre-push\projector.js`（4949 字节）。
- **消失（仅 A 有）**：`bz-oracle\out\device-pull\stub.js`、`bz-oracle\out\nightly.jsonl`。
- 范围外记录：A 的 `audit-work\main-scratch\bz-oracle\out`（23 文件）因 B 整个 `audit-work\` 目录不存在而无对应物，其 23 个文件名见上方原始输出；此差异本质是 §3 顶层目录差异的派生，未计入 in-scope out 集合差。

## 6. 附加机械复核（超出工单封闭判定的机械验证，供主审参考）

### 6.1 同长文件全长哈希复核（清点①命令内含）
55 个"字节数相同"的共有文件全部做了两侧全长 SHA-256 比对：`SAME_CONTENT_MISMATCH_COUNT=0`，即 55/55 内容一致，**0 个同长不同内容**。

### 6.2 恶劣文件名复核（修正清点①中的检查方法缺陷）
**命令原文**：
```powershell
$ErrorActionPreference='Stop'
$A='F:\BaoZouyxt\midaudit-v21'; $B='F:\BaoZouyxt\audit-v22'
$bad=@()
foreach($base in @($A,$B)){
  foreach($r in @('bz-oracle','r21')){
    $p=Join-Path $base $r
    if(Test-Path -LiteralPath $p){
      foreach($f in (Get-ChildItem -LiteralPath $p -Recurse -File -Force)){
        $rel=$f.FullName.Substring($base.Length+1)
        if($rel -match '[|\r\n]'){ $bad+=$rel }
      }
    }
  }
}
"BADNAME_COUNT(pipe or CR/LF inside any relative path)="+$bad.Count
$bad
```
**退出码：0**。输出：`BADNAME_COUNT(pipe or CR/LF inside any relative path)=0`（列表为空）。

### 6.3 抽样自检（同一条命令内）
```powershell
"--- spot checks ---"
"ONLYB_SPOT|A side exists bz-oracle\CHANGELOG-v2.2.md = "+(Test-Path -LiteralPath (Join-Path $A 'bz-oracle\CHANGELOG-v2.2.md'))
"ONLYB_SPOT|B side exists bz-oracle\CHANGELOG-v2.2.md = "+(Test-Path -LiteralPath (Join-Path $B 'bz-oracle\CHANGELOG-v2.2.md'))
"CHANGED_SPOT|A bz-oracle\config\oracle.config.json len = "+(Get-Item -LiteralPath (Join-Path $A 'bz-oracle\config\oracle.config.json')).Length
"CHANGED_SPOT|B bz-oracle\config\oracle.config.json len = "+(Get-Item -LiteralPath (Join-Path $B 'bz-oracle\config\oracle.config.json')).Length
"ONLYB_SPOT2|B bz-oracle\config\stub-deny.json len = "+(Get-Item -LiteralPath (Join-Path $B 'bz-oracle\config\stub-deny.json')).Length
"R21_SPOT|A r21 file count = "+@(Get-ChildItem -LiteralPath (Join-Path $A 'r21') -Recurse -File -Force).Count
"R21_SPOT|B r21 file count = "+@(Get-ChildItem -LiteralPath (Join-Path $B 'r21') -Recurse -File -Force).Count
```
**退出码：0**。输出（全部与清单一致）：
```
ONLYB_SPOT|A side exists bz-oracle\CHANGELOG-v2.2.md = False
ONLYB_SPOT|B side exists bz-oracle\CHANGELOG-v2.2.md = True
CHANGED_SPOT|A bz-oracle\config\oracle.config.json len = 1713
CHANGED_SPOT|B bz-oracle\config\oracle.config.json len = 2799
ONLYB_SPOT2|B bz-oracle\config\stub-deny.json len = 357
R21_SPOT|A r21 file count = 10
R21_SPOT|B r21 file count = 10
```

### 6.4 独立工具交叉验证
`certutil -hashfile`（与 Get-FileHash 不同实现）复验 `r21\00-INSTRUCTION.txt` 两侧：哈希完全相同且与 Get-FileHash 一致（见 §2 末尾）。**退出码：0**。

## 7. 执行记录总表（命令 → 退出码）

| # | 命令（见上文对应章节原文） | 退出码 | 结果状态 |
|---|---|---|---|
| 1 | 结构侦察 + 顶层对比 + MANIFEST 模式匹配（§3） | 0 | 有效 |
| 2 | 清点① 四类对齐 + 全哈希（§1） | 0 | 有效（其中 BADNAME_COUNT 检查方法缺陷由 §6.2 修正） |
| 3 | 清点② r21 哈希（§2） | 0 | 有效 |
| 4 | 清点④ node_modules 首跑 | **1** | **作废**（函数返回值包装缺陷） |
| 5 | 清点④ node_modules 重跑（§4） | 0 | 有效 |
| 6 | 清点⑤ out 集合首跑 | 0 | **作废**（同一缺陷，结果空、违反守恒校验） |
| 7 | 清点⑤ out 集合重跑（§5） | 0 | 有效 |
| 8 | 报告目录创建 `New-Item -ItemType Directory -Path 'F:\BaoZouyxt\audit-work22' -Force` | 0 | 有效 |
| 9 | 恶劣文件名复核 + 抽样自检（§6.2/6.3） | 0 | 有效 |
| 10 | certutil 交叉验证（§6.4） | 0 | 有效 |

## 8. 范围外发现（只记录，不动手，不判断）

- A 顶层多出 `audit-work\` 目录，内含 `main-scratch\bz-oracle\` 副本（out 23 文件、forge\node_modules 305 文件/5,952,904 字节），B 无此目录。其内容与 A\bz-oracle、B\bz-oracle 的关系未比对（不在工单四类清单键范围内）。
- A 顶层 4 个文件（`00-INSTRUCTION.txt`、`30-中层审计材料.md`、`MANIFEST.sha256`、`README-先看.txt`）在 B 无对应（B 顶层无文件）；文件内容未读取。
- A 顶层 `00-INSTRUCTION.txt`(1203B) 与 `r21\00-INSTRUCTION.txt`(1173B) 字节数不同；二者是否内容相关未验证（不在工单范围）。

## 9. 未验证

1. **node_modules 未做逐文件比对**（工单明示不比对）：两侧"305 文件 / 5,952,904 字节相同"只是计数与字节合计相同，**不等于内容一致**。
2. **out\ 未做内容比对**（工单明示只比文件名集合）：双方共有的 19 个 out 文件内容是否一致未验证。
3. **d 类（55 个）的工单封闭判定是"字节数相同"**；本报告另做的全长 SHA-256 复核（55/55 一致）是超出工单的附加机械验证，c/d 的归类依据仍是字节数。
4. **目录级差异未清点**：本次为文件级清点，空目录的有无/改名不在范围内。
5. **A\audit-work\ 与 A\bz-oracle\ 副本关系未验证**（含其 out 23 文件、node_modules 305 文件与正主目录是否一致）。
6. **清点④首跑（退出码 1）与清点⑤首跑（退出码 0 但结果与守恒校验矛盾）已作废**，本报告全部采用内联重跑结果；重跑结果通过 §1 文件数守恒校验（397=71+21+305；417=92+20+305）。
7. **certutil 输出提示行有 GBK 乱码**（"命令成功完成"一行显示为乱码），哈希行可读且与 Get-FileHash 一致；乱码文本本身未进一步处理。
8. **仅按工单查了 B"顶层"的 MANIFEST/校验和文件**；B 子目录内部是否存在其他校验和类文件未做全包扫描（超出工单封闭范围）。
9. **未读取任何文件内容做语义层面比对**：全部结论基于文件枚举、字节数与 SHA-256；哈希判定基于全长 64 位十六进制比对，报告表格仅展示前 8 位（完整值见 §1/§7 原始输出）。
10. **本次所有枚举含隐藏文件（-Force）**；符号链接/junction 未专门检测，若存在未察觉的 reparse point，枚举行为以 PowerShell 默认（不跟随）为准，未单独验证。
