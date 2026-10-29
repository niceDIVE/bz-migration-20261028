param(
  [Parameter(Position = 0)][string]$Action = 'status',
  [Parameter(Position = 1)][string]$Arg = '',
  [Parameter(Position = 2)][string]$Arg2 = '',
  [string]$Serial = '127.0.0.1:16416',
  [int]$TimeoutSec = 90,
  [int]$Tail = 25
)

# ============================================================================
# run.ps1  -- one-call harness for the offline patch
#
#   .\run.ps1 status            ready file + impl/flow version + last log lines
#   .\run.ps1 all               push bootstrap + handlers + flow, restart, wait ready
#   .\run.ps1 handlers          push handlers + flow, send `reload`, prove pid unchanged
#   .\run.ps1 bootstrap         push bootstrap only (needs restart afterwards)
#   .\run.ps1 restart           force-stop + launch, wait ready, show pid
#   .\run.ps1 log [-Tail n]     print last n log lines
#   .\run.ps1 cmd <text>        send one command and print its reply
#   .\run.ps1 probe <file> [arg] run a probe file in-process, print its output
#   .\run.ps1 pid               current pid (hot-reload proof: must not change)
#
# 韧性：adb 守护进程会被回收 → 每次 adb 调用失败即重连重试；
#       就绪用 ready 文件轮询，不用固定 sleep；临时文件放脚本目录（不依赖 %TEMP%）。
# ============================================================================

$ErrorActionPreference = 'Continue'
$PSNativeCommandUseErrorActionPreference = $false

$adb = Join-Path $env:USERPROFILE 'platform-tools\adb.exe'
$pkg = 'com.maple.madherogo'
$repo = $PSScriptRoot
if (-not $repo) { $repo = Split-Path -Parent $MyInvocation.MyCommand.Path }
$bootstrap = Join-Path $repo 'patch\jsb-adapter\jsb-engine.js'
$handlers = Join-Path $repo 'patch\live\handlers.js'
$flow = Join-Path $repo 'patch\live\flow.js'
$files = "/data/data/$pkg/files"
$tmp = '/data/local/tmp'

function Invoke-Adb {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$ArgsArr)
  $out = ''
  for ($i = 0; $i -lt 4; $i++) {
    $out = (& $adb -s $Serial @ArgsArr 2>&1 | Out-String).Trim()
    if ($out -notmatch 'device not found|device offline|no devices/emulators') { return $out }
    & $adb connect $Serial 2>&1 | Out-Null
    Start-Sleep -Milliseconds 600
  }
  return $out
}

function Connect-Device {
  if (-not (Test-Path $adb)) { throw "adb not found: $adb" }
  & $adb start-server 2>&1 | Out-Null
  $state = ''
  for ($i = 0; $i -lt 6; $i++) {
    $state = (& $adb -s $Serial get-state 2>&1 | Out-String).Trim()
    if ($state -match '^device$') { break }
    & $adb connect $Serial 2>&1 | Out-Null
    Start-Sleep -Milliseconds 600
  }
  if ($state -notmatch 'device') { throw "device not reachable: $Serial ($state)" }
  $id = Invoke-Adb shell 'id'
  if ($id -notmatch 'uid=0') { Invoke-Adb root | Out-Null; Start-Sleep -Milliseconds 500 }
}

function Push-File([string]$local, [string]$deviceTmp, [string]$deviceDest, [string]$owner = '10042:10042') {
  if (-not $local -or -not (Test-Path $local)) { throw "missing local file: '$local'" }
  $dir = $deviceDest -replace '/[^/]+$', ''     # Split-Path 会把 POSIX 路径转反斜杠
  $localSize = (Get-Item $local).Length
  $size = ''
  for ($try = 0; $try -lt 3; $try++) {
    Invoke-Adb push $local $deviceTmp | Out-Null
    Invoke-Adb shell "mkdir -p $dir" | Out-Null
    Invoke-Adb shell "cp $deviceTmp $deviceDest" | Out-Null
    Invoke-Adb shell "chown $owner $deviceDest; chmod 644 $deviceDest" | Out-Null
    $size = (Invoke-Adb shell "stat -c %s $deviceDest 2>/dev/null" | Out-String).Trim()
    if ($size -eq "$localSize") { return "$([IO.Path]::GetFileName($deviceDest)) $localSize B" }
    Start-Sleep -Milliseconds 500
  }
  throw "push failed: local=$localSize device='$size' ($deviceDest)"
}

function Get-Pid { return (Invoke-Adb shell "pidof $pkg" | Out-String).Trim() }

function Wait-Ready([int64]$sinceMs, [int]$timeoutSec) {
  $deadline = (Get-Date).AddSeconds($timeoutSec)
  $last = ''
  while ((Get-Date) -lt $deadline) {
    $raw = Invoke-Adb shell "cat $files/bz_ready.json 2>/dev/null"
    if ($raw) {
      $last = $raw
      try {
        $j = $raw | ConvertFrom-Json
        if ([int64]$j.t -ge $sinceMs) { return $j }
      } catch { }
    }
    Start-Sleep -Milliseconds 250
  }
  throw "ready timeout after ${timeoutSec}s (last='$last')"
}

function Get-LogLines([int]$n) {
  $raw = Invoke-Adb shell "cat $files/bz_log.jsonl 2>/dev/null"
  if (-not $raw) { return @() }
  $lines = $raw -split "`n" | Where-Object { $_.Trim() }
  if ($lines.Count -le $n) { return $lines }
  return $lines[($lines.Count - $n)..($lines.Count - 1)]
}

function Send-Cmd([string]$text) {
  $tmpFile = Join-Path $repo ('.bzcmd_' + [guid]::NewGuid().ToString('N') + '.txt')
  [IO.File]::WriteAllText($tmpFile, $text, [Text.UTF8Encoding]::new($false))
  $prevSeq = (Invoke-Adb shell "cat $files/bz_res_seq.txt 2>/dev/null" | Out-String).Trim()
  Invoke-Adb push $tmpFile "$tmp/bz_cmd.txt" | Out-Null
  Invoke-Adb shell "cp $tmp/bz_cmd.txt $files/bz_cmd.txt; chmod 644 $files/bz_cmd.txt" | Out-Null
  Remove-Item $tmpFile -ErrorAction SilentlyContinue
  $deadline = (Get-Date).AddSeconds(10)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 150
    $seq = (Invoke-Adb shell "cat $files/bz_res_seq.txt 2>/dev/null" | Out-String).Trim()
    if ($seq -and $seq -ne $prevSeq) {
      return (Invoke-Adb shell "cat $files/bz_res.txt" | Out-String).Trim()
    }
  }
  throw "command reply timeout: $text"
}

function Restart-Game {
  $t0 = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  Invoke-Adb shell "am force-stop $pkg" | Out-Null
  Invoke-Adb shell "monkey -p $pkg -c android.intent.category.LAUNCHER 1" | Out-Null
  $r = Wait-Ready $t0 $TimeoutSec
  $secs = [int]((([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - $t0) / 1000))
  return "ready in ${secs}s impl=$($r.impl) flow=$($r.flow) scene='$($r.scene)' pid=$(Get-Pid)"
}

function Deploy-Live {
  $out = @()
  $out += "push " + (Push-File $bootstrap "$tmp/bz_engine.js" "$files/hotfix/jsb-adapter/jsb-engine.js")
  $out += "push " + (Push-File $handlers "$tmp/bz_handlers.js" "$files/hotfix/live/handlers.js")
  if (Test-Path $flow) { $out += "push " + (Push-File $flow "$tmp/bz_flow.js" "$files/hotfix/live/flow.js") }
  return $out
}

switch ($Action) {
  'pid' { Connect-Device; "pid=" + (Get-Pid) }
  'status' {
    Connect-Device
    "pid=" + (Get-Pid)
    "ready=" + (Invoke-Adb shell "cat $files/bz_ready.json 2>/dev/null" | Out-String).Trim()
    $lines = @(Get-LogLines $Tail)
    "log(last $($lines.Count)):"
    $lines | ForEach-Object { "  $_" }
  }
  'log' { Connect-Device; @(Get-LogLines $Tail) | ForEach-Object { $_ } }
  'cmd' { Connect-Device; Send-Cmd $Arg }
  'probe' {
    Connect-Device
    # 探针参数走独立小文件，避开命令行转义/临时目录问题
    $argFile = Join-Path $repo ('.bzarg_' + [guid]::NewGuid().ToString('N') + '.txt')
    [IO.File]::WriteAllText($argFile, [string]$Arg2, [Text.UTF8Encoding]::new($false))   # 必须 UTF-8：ASCII 会把中文参数变成 ?
    "push " + (Push-File $Arg "$tmp/bz_probe.js" "$files/probe.js")
    "push " + (Push-File $argFile "$tmp/bz_arg.txt" "$files/probe_arg.txt")
    Remove-Item $argFile -ErrorAction SilentlyContinue
    $wrap = 'eval:var __a=null;try{var __p=''/data/data/com.maple.madherogo/files/probe_arg.txt'';if(jsb.fileUtils.isFileExist(__p)){__a=String(jsb.fileUtils.getStringFromFile(__p)).replace(/[\r\n\t ]/g,'''');}}catch(e){}var __f=eval(jsb.fileUtils.getStringFromFile(''/data/data/com.maple.madherogo/files/probe.js''));var __r=(typeof __f===''function'')?__f(__a):__f;jsb.fileUtils.writeStringToFile(String(__r),''/data/data/com.maple.madherogo/files/probe_res.txt'')'
    $reply = Send-Cmd $wrap
    if ($reply -notmatch '^OK\s*\n?<<DONE>>') { "probe reply: " + $reply }
    Invoke-Adb shell "cat $files/probe_res.txt 2>/dev/null"
  }
  'restart' { Connect-Device; Restart-Game }
  'handlers' {
    Connect-Device
    $pid0 = Get-Pid
    "push " + (Push-File $handlers "$tmp/bz_handlers.js" "$files/hotfix/live/handlers.js")
    if (Test-Path $flow) { "push " + (Push-File $flow "$tmp/bz_flow.js" "$files/hotfix/live/flow.js") }
    "reload: " + (Send-Cmd 'reload')
    $pid1 = Get-Pid
    "pid before=$pid0 after=$pid1 (must be equal)"
    if ($pid0 -ne $pid1) { throw 'pid changed: reload caused a restart' }
  }
  'bootstrap' {
    Connect-Device
    "push " + (Push-File $bootstrap "$tmp/bz_engine.js" "$files/hotfix/jsb-adapter/jsb-engine.js")
    "note: needs '.\run.ps1 restart' to take effect"
  }
  'smoke' {
    Connect-Device
    $t0 = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    Restart-Game | Out-Null
    $readyMs = [int64](([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - $t0))
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    $scene = ''
    $gameMs = -1
    while ((Get-Date) -lt $deadline) {
      $raw = Invoke-Adb shell "cat $files/bz_ready.json 2>/dev/null"
      if ($raw) {
        try { $j = $raw | ConvertFrom-Json; $scene = $j.scene } catch { }
        if ($scene -eq 'gamescene') { $gameMs = [int64](([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - $t0)); break }
      }
      Start-Sleep -Milliseconds 400
    }
    $lines = @(Get-LogLines 2000)
    $errs = @($lines | Where-Object { $_ -match '"kind":"err"' })
    $rpc = @($lines | Where-Object { $_ -match '"kind":"xhr"' -and $_ -match '"action":' -or $_ -match 'xhr User\.' })
    $flows = @($lines | Where-Object { $_ -match '"kind":"flow"' })
    $res = [ordered]@{
      path      = 'cold'
      ok        = ($gameMs -ge 0 -and $errs.Count -eq 0)
      scene     = $scene
      readySec  = [math]::Round($readyMs / 1000.0, 1)
      gameSec   = if ($gameMs -ge 0) { [math]::Round($gameMs / 1000.0, 1) } else { -1 }
      rpcAnswers = $rpc.Count
      flowSteps = $flows.Count
      errors    = $errs.Count
      pid       = (Get-Pid)
      impl      = (Invoke-Adb shell "cat $files/bz_ready.json 2>/dev/null" | Out-String).Trim()
    }
    ($res | ConvertTo-Json -Compress)
    if (-not $res.ok) { if ($errs.Count) { "--- errors ---"; $errs | Select-Object -Last 8 } ; throw 'SMOKE FAIL' }
  }
  'all' {
    Connect-Device
    Deploy-Live
    Restart-Game
    "--- last log ---"
    @(Get-LogLines 12) | ForEach-Object { "  $_" }
  }
  default { throw "unknown action: $Action" }
}
