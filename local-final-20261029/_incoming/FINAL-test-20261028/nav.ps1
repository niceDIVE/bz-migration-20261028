param(
  [string]$Node = '',
  [string]$Shot = '',
  [int]$X = -1,
  [int]$Y = -1,
  [switch]$NoTap
)
$ErrorActionPreference = 'Continue'
$adb = Join-Path $env:USERPROFILE 'platform-tools\adb.exe'
$S = '127.0.0.1:16416'
$shots = 'F:\BaoZouyxt\_incoming\FINAL-test-20261028\shots'
$dev = '/data/data/com.maple.madherogo/files'

function Snap([string]$n) {
  & $adb -s $S shell "screencap -p /data/local/tmp/t.png" > $null 2>&1
  $p = Join-Path $shots ($n + '.png')
  & $adb -s $S pull /data/local/tmp/t.png $p > $null 2>&1
  "shot=$p"
}

if ($X -ge 0 -and $Y -ge 0) {
  & $adb -s $S shell "input tap $X $Y" 2>&1 | Out-Null
  Start-Sleep -Milliseconds 2000
} elseif ($Node) {
  Push-Location 'F:\BaoZouyxt\hotfix-patch'
  $out = & powershell -NoProfile -ExecutionPolicy Bypass -File .\run.ps1 probe probe\tap.js $Node 2>&1 | Out-String
  Pop-Location
  $m = [regex]::Match($out, '"screen":\[(-?\d+),(-?\d+)\]')
  if (-not $m.Success) {
    "PROBE_FAIL node=$Node"
    $out
    return
  }
  $x = [int]$m.Groups[1].Value; $y = [int]$m.Groups[2].Value
  "node=$Node screen=[$x,$y]"
  if (-not $NoTap) {
    & $adb -s $S shell "input tap $x $y" 2>&1 | Out-Null
    Start-Sleep -Milliseconds 2000
  }
}

if ($Shot) { Snap $Shot }
"ready=" + ((& $adb -s $S shell "cat $dev/bz_ready.json 2>/dev/null" 2>&1 | Out-String).Trim())
