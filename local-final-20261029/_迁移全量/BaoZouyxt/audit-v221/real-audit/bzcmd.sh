#!/usr/bin/env bash
SER=127.0.0.1:16416
PKG=com.maple.madherogo
cd /f/BaoZouyxt/audit-v221/real-audit
printf '%s' "$1" > bz_cmd_payload.txt
MSYS_NO_PATHCONV=1 adb -s $SER push bz_cmd_payload.txt /data/local/tmp/bz_cmd.txt >/dev/null 2>&1
MSYS_NO_PATHCONV=1 adb -s $SER shell "cp /data/local/tmp/bz_cmd.txt /data/data/$PKG/files/bz_cmd.txt && chmod 644 /data/data/$PKG/files/bz_cmd.txt"
sleep ${2:-3}
MSYS_NO_PATHCONV=1 adb -s $SER shell "cat /data/data/$PKG/files/bz_res.txt 2>/dev/null" | head -40
