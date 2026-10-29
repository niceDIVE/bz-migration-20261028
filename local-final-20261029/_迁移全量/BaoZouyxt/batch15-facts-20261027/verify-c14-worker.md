# C14〔斗狗〕批次门禁 独立复跑报告（工人档）

- 工人角色：验收工人（纯体力，只跑列明命令、抄输出、报退出码）
- 工作目录根：F:\BaoZouyxt
- 报告文件：F:\BaoZouyxt\batch15-facts-20261027\verify-c14-worker.md
- 开工时间：2026-10-27（T1 首跑起；18:27:17 为 T2 取时点，18:27:47 为 T7 收尾取时点）
- 环境：Windows / pwsh；所有 node 命令均按工单指定工作目录执行

## 结论表

| 编号 | 命令 | 退出码 | 结果 |
|---|---|---|---|
| T1 | node tools\acceptance.js | 0 | 末行 `ACCEPTANCE OK 项=54 绿=54 已知红=0 cap=0`，与期望一致 |
| T2 | node test\c14-smoke.js | 0 | 末行 `c14-smoke: 全部通过（10 条）`，与期望一致 |
| T3 | node test\c13-smoke.js | 0 | 末行 `c13-smoke: 全部通过（9 条）`，与期望一致 |
| T4-1 | node test\c12-smoke.js | 0 | `c12-smoke: 全部通过（14 条）` |
| T4-2 | node test\c11-smoke.js | 0 | `c11-smoke: 全部通过（14 条）` |
| T4-3 | node test\c10-smoke.js | 0 | `c10-smoke: 全部通过（18 条）` |
| T4-4 | node test\r14-catch-smoke.js | 0 | `[r14-catch-smoke] PASS  3/3` |
| T5 | node tools\check_shape_freeze.js --diff | 0 | `diff 总数 = 0`，与期望一致 |
| T6 | node tools\check_reject_codes.js | 0 | `REJECT-CODES OK 动作=120 条目=137 拒绝点=209 处 flow=1 条`，与期望一致 |
| T7 | Get-FileHash -Algorithm MD5 + Select-String IMPL_VERSION | 首次调用 exit=1（路径不存在）；改按同名文件后取到 | 见 T7 原文；工单给的两条相对路径在 F:\BaoZouyxt 下不存在 |

## 逐条记录

### T1（工作目录 F:\BaoZouyxt）

命令原文：

```
node tools\acceptance.js
```

退出码：0

关键输出（末 3 行）：

```
history 追加：tools/golden/known-red-history.jsonl seq=111 entries=0 entriesHash=da39a3ee5e6b… guardVer=2 prev=da39a3ee5e6b…

ACCEPTANCE OK 项=54 绿=54 已知红=0 cap=0
```

对照期望：最后一行 `ACCEPTANCE OK 项=54 绿=54 已知红=0 cap=0` —— 一致。

（备注抄录，不改判：过程行另有 `impl=cb3945906aa0  guardHash=771b5251002b…`、`PASS K-cap 条目=0 ≤ cap=0`、`PASS G3 无滞留条目`；54 项全部 PASS，无 FAIL/KNOWN-RED 行。）

### T2（工作目录 F:\BaoZouyxt\hotfix-patch）

命令原文：

```
node test\c14-smoke.js
```

退出码：0

关键输出（末 3 行）：

```
  ok   【⑨】拒绝应答收窄：REJECT_ALLOW=[] → 拒绝应答只有 eRet

c14-smoke: 全部通过（10 条）
```

对照期望：`c14-smoke: 全部通过（10 条）` —— 一致（⓪～⑨ 共 10 条 ok 逐条列出）。

### T3（工作目录 F:\BaoZouyxt\hotfix-patch）

命令原文：

```
node test\c13-smoke.js
```

退出码：0

关键输出（末 3 行）：

```
  ok   【⑧】拒绝应答收窄：REJECT_ALLOW=[] → 拒绝应答只有 eRet

c13-smoke: 全部通过（9 条）
```

对照期望：`c13-smoke: 全部通过（9 条）` —— 一致（⓪～⑧ 共 9 条 ok 逐条列出）。

### T4-1（工作目录 F:\BaoZouyxt\hotfix-patch）

命令原文：

```
node test\c12-smoke.js
```

退出码：0

关键输出（末 3 行）：

```
  ok   【⑫】拒绝应答收窄：REJECT_ALLOW=[] → 拒绝应答只有 eRet

c12-smoke: 全部通过（14 条）
```

### T4-2（工作目录 F:\BaoZouyxt\hotfix-patch）

命令原文：

```
node test\c11-smoke.js
```

退出码：0

关键输出（末 3 行）：

```
  ok   【⑪】拒绝应答收窄：REJECT_ALLOW=[] → 拒绝应答只有 eRet

c11-smoke: 全部通过（14 条）
```

### T4-3（工作目录 F:\BaoZouyxt\hotfix-patch）

命令原文：

```
node test\c10-smoke.js
```

退出码：0

关键输出（末 3 行）：

```
  ok   【⑰】买了就能种：商店 → 播种 一条链闭合

c10-smoke: 全部通过（18 条）
```

### T4-4（工作目录 F:\BaoZouyxt\hotfix-patch）

命令原文：

```
node test\r14-catch-smoke.js
```

退出码：0

关键输出（末 3 行）：

```
  ok   S5 未建模效果的 useItem：**用户裁定先不改行为** —— 照扣、但必须留痕（cap 应为 0 的消耗事件表）

[r14-catch-smoke] PASS  3/3
```

### T5（工作目录 F:\BaoZouyxt）

命令原文：

```
node tools\check_shape_freeze.js --diff
```

退出码：0

关键输出（全文仅 1 行，原文照抄）：

```
diff 总数 = 0
```

对照期望：diff 总数 = 0 —— 一致。

### T6（工作目录 F:\BaoZouyxt）

命令原文：

```
node tools\check_reject_codes.js
```

退出码：0

关键输出（末 2 行）：

```
R5 未实现（下一批：动作×原因夹具 + 磁盘/业务双哈希）
REJECT-CODES OK 动作=120 条目=137 拒绝点=209 处 flow=1 条
```

对照期望：`REJECT-CODES OK 动作=120 条目=137 拒绝点=209 处 flow=1 条` —— 一致。

### T7（工作目录 F:\BaoZouyxt，Get-FileHash -Algorithm MD5）

第一次按工单字面相对路径执行（原文照抄，退出码非 0）：

```
Get-FileHash -Algorithm MD5 'core\bz-rpc-server.js','patch\live\handlers.js' | Format-List Path,Algorithm,Hash; Select-String -Path 'patch\live\handlers.js' -Pattern 'IMPL_VERSION'
```

```
[stderr]
Resolve-Path : 找不到路径“F:\BaoZouyxt\core\bz-rpc-server.js”，因为该路径不存在。
所在位置 C:\windows\system32\WindowsPowerShell\v1.0\Modules\Microsoft.PowerShell.Utility\Microsoft.PowerShell.Utility.psm1:
110 字符: 36
+                 $pathsToProcess += Resolve-Path $Path | Foreach-Objec ...
+                                    ~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (F:\BaoZouyxt\core\bz-rpc-server.js:String) [Resolve-Path], ItemNotFound
   Exception
    + FullyQualifiedErrorId : PathNotFound,Microsoft.PowerShell.Commands.ResolvePathCommand

Resolve-Path : 找不到路径“F:\BaoZouyxt\patch\live\handlers.js”，因为该路径不存在。
所在位置 C:\windows\system32\WindowsPowerShell\v1.0\Modules\Microsoft.PowerShell.Utility\Microsoft.PowerShell.Utility.psm1:
110 字符: 36
+                 $pathsToProcess += Resolve-Path $Path | Foreach-Objec ...
+                                    ~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (F:\BaoZouyxt\patch\live\handlers.js:String) [Resolve-Path], ItemNotFoun
   dException
    + FullyQualifiedErrorId : PathNotFound,Microsoft.PowerShell.Commands.ResolvePathCommand

Select-String : 找不到路径“F:\BaoZouyxt\patch\live\handlers.js”，因为该路径不存在。
所在位置 行:1 字符: 306
+ ... #########"; Select-String -Path 'patch\live\handlers.js' -Pattern 'IM ...
+                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (F:\BaoZouyxt\patch\live\handlers.js:String) [Select-String], ItemNotFou
   ndException
    + FullyQualifiedErrorId : PathNotFound,Microsoft.PowerShell.Commands.SelectStringCommand
[exit code: 1]
```

第二次：先只读定位同名文件（Get-ChildItem -Recurse -Filter，只读，无写），确认这两个文件在热修根下：

- `F:\BaoZouyxt\hotfix-patch\core\bz-rpc-server.js`
- `F:\BaoZouyxt\hotfix-patch\patch\live\handlers.js`

命令原文（第二次）：

```
Get-FileHash -Algorithm MD5 'F:\BaoZouyxt\hotfix-patch\core\bz-rpc-server.js','F:\BaoZouyxt\hotfix-patch\patch\live\handlers.js' | ForEach-Object { "$($_.Path)`t$($_.Algorithm)`t$($_.Hash)" }
Select-String -Path 'F:\BaoZouyxt\hotfix-patch\patch\live\handlers.js' -Pattern 'IMPL_VERSION'
```

退出码：无报错（Get-FileHash/Select-String 均成功返回，两次执行结果一致）

md5（原文照抄）：

```
F:\BaoZouyxt\hotfix-patch\core\bz-rpc-server.js	MD5	6EC310A045B812CCB5EBF0E84CD93357
F:\BaoZouyxt\hotfix-patch\patch\live\handlers.js	MD5	AE4128F94D07D40C1CFB285695952919
```

IMPL_VERSION（Select-String 命中行，原文照抄；第 5 行为定义行）：

```
5: var IMPL_VERSION = "h8e6fe0e6";
8324:  * 依赖已在前文定义：__TPL__（模板）、createBzServer（服务器）、IMPL_VERSION（构建注入）、bz（引导 API）
8445:   if (!bz.codec) { failed.push('codec:missing'); return { ok: false, version: IMPL_VERSION, passed: passed, failed: failed, detail: detail, checked: checked }; }
8880:     ok: failed.length === 0, version: IMPL_VERSION, passed: passed, failed: failed, detail: detail,
8890:   return { ok: true, version: IMPL_VERSION, roleID: r.roleID };
8901:   version: IMPL_VERSION,
```

即：`IMPL_VERSION = "h8e6fe0e6"`（定义于第 5 行）。

## 权限与范围自查

- 本次仅写入本报告文件 `F:\BaoZouyxt\batch15-facts-20261027\verify-c14-worker.md`（开工即创建，后续追加）；未写/删/移任何其他文件。
- 未执行 git、未联网、未执行任何数据销毁级命令（无 pm clear 及变体、无 rm -rf、无 factory reset、无清缓存）。
- 执行过的动作全集：T1～T6 的 node 命令、T7 的 Get-FileHash/Select-String，以及为定位 T7 目标文件所必需的只读 `Get-ChildItem -Recurse -Filter`（无写操作）。
- T1 的 acceptance.js 自身会向 `tools/golden/known-red-history.jsonl` 追加一行（seq=111），这是门禁命令的既有行为，不是工人写入。

未验证段：无
范围外产出：无
