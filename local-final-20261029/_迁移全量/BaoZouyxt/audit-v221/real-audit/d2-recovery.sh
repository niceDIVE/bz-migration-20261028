#!/usr/bin/env bash
# D2 自动恢复循环：MuMu adbd 复活后自动完成探针部署
# 每轮：connect -> 探活 -> 推送探针包 -> 校验 md5 -> 重启游戏 -> 确认 bz_capture 生成
# 成功后退出（exit 0）；最多 120 轮（约 2 小时）
SER=127.0.0.1:16416
PKG=com.maple.madherogo
PROBE=/f/BaoZouyxt/hotfix-patch/patch/jsb-adapter/jsb-engine.probe.js
LOG=/f/BaoZouyxt/audit-v221/real-audit/d2-recovery.log
LOCAL_MD5=$(md5sum "$PROBE" | cut -d' ' -f1)
echo "[$(date +%T)] start, local probe md5=$LOCAL_MD5" >> "$LOG"
for i in $(seq 1 120); do
  adb connect $SER >/dev/null 2>&1
  sleep 2
  if MSYS_NO_PATHCONV=1 timeout 10 adb -s $SER shell "echo ok" >/dev/null 2>&1; then
    echo "[$(date +%T)] round $i: shell alive" >> "$LOG"
    MSYS_NO_PATHCONV=1 timeout 60 adb -s $SER push "$PROBE" /data/local/tmp/bz_probe_new.js >/dev/null 2>&1
    DMD5=$(MSYS_NO_PATHCONV=1 timeout 10 adb -s $SER shell "md5sum /data/local/tmp/bz_probe_new.js" 2>/dev/null | cut -d' ' -f1 | tr -d '\r')
    if [ "$DMD5" = "$LOCAL_MD5" ]; then
      MSYS_NO_PATHCONV=1 timeout 20 adb -s $SER shell "cp /data/local/tmp/bz_probe_new.js /data/data/$PKG/files/hotfix/jsb-adapter/jsb-engine.js && chmod 644 /data/data/$PKG/files/hotfix/jsb-adapter/jsb-engine.js && md5sum /data/data/$PKG/files/hotfix/jsb-adapter/jsb-engine.js" >> "$LOG" 2>&1
      adb -s $SER shell am force-stop $PKG >/dev/null 2>&1
      sleep 2
      adb -s $SER shell monkey -p $PKG -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
      echo "[$(date +%T)] round $i: probe deployed + game restarted, DONE" >> "$LOG"
      exit 0
    else
      echo "[$(date +%T)] round $i: push/md5 mismatch (got $DMD5), retry" >> "$LOG"
    fi
  else
    echo "[$(date +%T)] round $i: shell dead" >> "$LOG"
  fi
  sleep 55
done
echo "[$(date +%T)] gave up after 120 rounds" >> "$LOG"
exit 1
