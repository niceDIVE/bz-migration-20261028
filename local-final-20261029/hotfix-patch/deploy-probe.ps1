# 部署探针补丁到设备并采集日志
# 用法: powershell -File deploy-probe.ps1 [-Serial T9Y0221708013594] [-Port 16416]
#   真机传 -Serial；模拟器传 -Port（二选一）
param(
  [string]$Serial = '',
  [int]$Port = 16416
)

$adb = "$env:USERPROFILE\platform-tools\adb.exe"
if (-not (Test-Path $adb)) { $adb = 'adb' }
$PKG = 'com.maple.madherogo'
$patch = 'F:\BaoZouyxt\hotfix-patch\patch\jsb-adapter\jsb-engine.js'
if ($Serial) { $ser = $Serial } else { $ser = "127.0.0.1:$Port" }

function ADB { & $adb -s $ser @args }

"== 1. 连接设备 =="
if (-not $Serial) { & $adb connect $ser | Out-String }
(ADB devices | Out-String) -split "`n" | Where-Object { $_ -match [regex]::Escape($ser) } | ForEach-Object { "在线: $_" }

"== 2. 游戏包确认 =="
ADB shell pm path $PKG

"== 3. root 能力探测 =="
$su = ADB shell which su 2>$null
"which su -> $su"
ADB root 2>&1 | Out-String   # 部分模拟器支持 adb root 提权
$id = ADB shell id 2>&1
"id: $id"

"== 4. 定位可写路径 =="
# Cocos jsb getWritablePath() 通常为 /data/data/<pkg>/files（root 可写）
# 备选：/sdcard/Android/data/<pkg>/files（Android 11+ 受限）
$wt = ADB shell "su -c 'ls -d /data/data/$PKG/files' 2>/dev/null"
"内部可写目录: $wt"

"== 5. 推送补丁 =="
& $adb push $patch /data/local/tmp/bz-engine.js
if ($su) {
  ADB shell su -c "mkdir -p /data/data/$PKG/files/hotfix/jsb-adapter"
  ADB shell su -c "cp /data/local/tmp/bz-engine.js /data/data/$PKG/files/hotfix/jsb-adapter/jsb-engine.js"
  $uid = ADB shell "su -c 'stat -c %u /data/data/$PKG'"
  ADB shell su -c "chown -R ${uid}:${uid} /data/data/$PKG/files/hotfix"
  ADB shell su -c "chmod -R 771 /data/data/$PKG/files/hotfix"
  ADB shell su -c "ls -la /data/data/$PKG/files/hotfix/jsb-adapter/"
} else {
  "!! 无 root：改推 sdcard 路径（需实测 getWritablePath 是否指向 sdcard）"
  ADB shell "mkdir -p /sdcard/Android/data/$PKG/files/hotfix/jsb-adapter"
  & $adb push $patch "/sdcard/Android/data/$PKG/files/hotfix/jsb-adapter/jsb-engine.js"
}

"== 6. 清 logcat 并启动游戏 =="
ADB logcat -c
ADB shell monkey -p $PKG -c android.intent.category.LAUNCHER 1 | Out-Null
"游戏已拉起，等待 25 秒采集..."
Start-Sleep -Seconds 25

"== 7. 采集 BZ-OFFLINE 探针日志 =="
$logFile = 'F:\BaoZouyxt\hotfix-patch\probe-capture.log'
ADB logcat -d > $env:TEMP\bz-full-logcat.txt
Select-String -Path "$env:TEMP\bz-full-logcat.txt" -Pattern 'BZ-OFFLINE|Cocos2dxJSBHelper|cocos2d' |
  Select-Object -Last 80 | ForEach-Object { $_.Line } | Tee-Object -FilePath $logFile
"完整日志: $env:TEMP\bz-full-logcat.txt"
"探针摘录: $logFile"
