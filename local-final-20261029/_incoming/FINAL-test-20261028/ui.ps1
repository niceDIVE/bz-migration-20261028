param(
  [string]$Act = 'shot',
  [int]$X = 0,
  [int]$Y = 0,
  [string]$Name = 'x'
)
$ErrorActionPreference = 'Continue'
$adb = Join-Path $env:USERPROFILE 'platform-tools\adb.exe'
$S = '127.0.0.1:16416'
$shots = 'F:\BaoZouyxt\_incoming\FINAL-test-20261028\shots'
$dev = '/data/data/com.maple.madherogo/files'

function Shot([string]$n) {
  & $adb -s $S shell "screencap -p /data/local/tmp/t.png" > $null 2>&1
  $p = Join-Path $shots ($n + '.png')
  & $adb -s $S pull /data/local/tmp/t.png $p > $null 2>&1
  $h = (Get-FileHash $p -Algorithm SHA256).Hash
  return "shot=$p sha=$($h.Substring(0,12))"
}
function Scene() {
  return (& $adb -s $S shell "cat $dev/bz_ready.json 2>/dev/null" 2>&1 | Out-String).Trim()
}
function LogTail([int]$n) {
  return (& $adb -s $S shell "tail -$n $dev/bz_log.jsonl 2>/dev/null" 2>&1 | Out-String).Trim()
}
function Wallet() {
  $raw = & $adb -s $S shell "cat $dev/bz_offline_save.json 2>/dev/null" 2>&1 | Out-String
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($raw)
  return $raw.length
}

switch ($Act) {
  'shot'  { Shot $Name }
  'tap'   { & $adb -s $S shell "input tap $X $Y" 2>&1 | Out-Null; Start-Sleep -Milliseconds 1800; Shot $Name }
  'tapx'  { & $adb -s $S shell "input tap $X $Y" 2>&1 | Out-Null; Start-Sleep -Milliseconds 2200; Shot $Name; Scene; LogTail 4 }
  'scene' { Scene }
  'log'   { LogTail 12 }
  'back'  { & $adb -s $S shell "input keyevent 4" 2>&1 | Out-Null; Start-Sleep -Milliseconds 1500; Shot $Name }
  'state' {
    $p = 'F:\BaoZouyxt\_incoming\FINAL-test-20261028\save\' + $Name + '.json'
    & $adb -s $S shell "cp $dev/bz_offline_save.json /data/local/tmp/sv.json" 2>&1 | Out-Null
    & $adb -s $S pull /data/local/tmp/sv.json $p > $null 2>&1
    "state=$p bytes=$((Get-Item $p).Length)"
  }
}
