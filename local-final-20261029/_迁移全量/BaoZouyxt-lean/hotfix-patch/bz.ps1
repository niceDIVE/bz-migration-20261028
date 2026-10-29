param([string]$Cmd)
# bz.ps1 —— 通过命令通道向运行中的游戏注入 JS 命令
$adb = "$env:USERPROFILE\platform-tools\adb.exe"
$s = '127.0.0.1:16416'
$pkg = 'com.maple.madherogo'
& $adb start-server 2>&1 | Out-Null
& $adb connect $s 2>&1 | Out-Null
$tmp = Join-Path $env:TEMP ('bzcmd_' + [guid]::NewGuid().ToString('N') + '.txt')
Set-Content -Path $tmp -Value $Cmd -Encoding UTF8 -NoNewline
& $adb -s $s push $tmp /data/local/tmp/bz_cmd.txt 2>&1 | Out-Null
& $adb -s $s shell "cp /data/local/tmp/bz_cmd.txt /data/data/$pkg/files/bz_cmd.txt; chmod 644 /data/data/$pkg/files/bz_cmd.txt" 2>&1 | Out-Null
Start-Sleep -Milliseconds 1600
& $adb -s $s shell "cat /data/data/$pkg/files/bz_res.txt 2>/dev/null" 2>&1
Remove-Item $tmp -ErrorAction SilentlyContinue
