param([int]$Minutes = 90, [int]$IntervalSec = 5, [string]$Serial = '127.0.0.1:16416')

# watch.ps1 —— 盯 bz_log.jsonl，只打新增的 UNKNOWN / err / 未知请求行
$ErrorActionPreference = 'Continue'
$adb = Join-Path $env:USERPROFILE 'platform-tools\adb.exe'
$log = '/data/data/com.maple.madherogo/files/bz_log.jsonl'
$seen = @{}
$deadline = (Get-Date).AddMinutes($Minutes)
$out = 'F:\BaoZouyxt\hotfix-patch\probe\live_watch.log'

function Adb([string]$cmd) {
  for ($i = 0; $i -lt 3; $i++) {
    $o = (& $adb -s $Serial shell $cmd 2>&1 | Out-String)
    if ($o -notmatch 'device not found|offline') { return $o }
    & $adb connect $Serial 2>&1 | Out-Null
    Start-Sleep -Milliseconds 600
  }
  return ''
}

"=== watch start $(Get-Date -Format 'HH:mm:ss') ===" | Tee-Object -FilePath $out -Append
while ((Get-Date) -lt $deadline) {
  $txt = Adb "tail -n 80 $log"
  if ($txt) {
    foreach ($line in ($txt -split "`n")) {
      if (-not $line.Trim()) { continue }
      if ($line -notmatch 'UNKNOWN|"kind":"err"|"src":"flow"|rpc-fail') { continue }
      $key = $line.Trim()
      if ($seen.ContainsKey($key)) { continue }
      $seen[$key] = 1
      $line.Trim() | Tee-Object -FilePath $out -Append
    }
  }
  Start-Sleep -Seconds $IntervalSec
}
"=== watch end $(Get-Date -Format 'HH:mm:ss') ===" | Tee-Object -FilePath $out -Append
