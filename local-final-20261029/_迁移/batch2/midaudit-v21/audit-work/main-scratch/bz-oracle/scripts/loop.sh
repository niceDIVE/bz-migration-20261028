#!/usr/bin/env bash
# 一键闭环：构建 → 打指纹 → 推送 → 热重载 → 核对设备版本 → 离线回放裁判 →（可选）设备 dual 裁判
# 所有设备相关路径由环境变量给出（材料未提供真实路径）：
#   BUILD_CMD        构建命令（例：node build.js）
#   ARTIFACTS        逗号分隔的产物路径（例：hotfix-patch/core/bz-rpc-server.js,hotfix-patch/handlers.js）
#   DEVICE_DIR       设备上产物所在目录（例：/sdcard/Android/data/<pkg>/files/hotfix）
#   READY_FILE       设备上 bz_ready.json 路径（可选）
#   RELOAD_CMD       热重载命令（例：adb shell am broadcast -a <action>；可选）
#   RECORDINGS       回放用的 case 目录（默认 fixtures/cases）
#   ADB              adb 可执行文件（默认 adb）；DRY_RUN=1 时只打印设备命令
set -euo pipefail
cd "$(dirname "$0")/.."
ADB=${ADB:-adb}; RECORDINGS=${RECORDINGS:-fixtures/cases}
run() { if [ "${DRY_RUN:-0}" = 1 ]; then echo "  [dry] $*"; else "$@"; fi; }
t0=$(date +%s)
echo "== 1 构建";      [ -n "${BUILD_CMD:-}" ] && eval "$BUILD_CMD" || echo "  （未设 BUILD_CMD，跳过）"
echo "== 2 指纹";      node forge/tools/fingerprint.js stamp --files "$ARTIFACTS" --out out/build-stamp.json
echo "== 3 离线回放";  node forge/replay/replay.js --recordings "$RECORDINGS" ${ACTION:+--action $ACTION} ${GENERATED:+--generated $GENERATED} ${DSL:+--dsl $DSL} ${TABLES:+--tables $TABLES} ${RULES:+--rules $RULES} --out out/replay-report.json || { echo "离线裁判 FAIL，不推设备"; exit 1; }
echo "== 4 推送";      IFS=, read -ra AR <<< "$ARTIFACTS"; for f in "${AR[@]}"; do run "$ADB" push "$f" "$DEVICE_DIR/"; done
echo "== 5 热重载";    [ -n "${RELOAD_CMD:-}" ] && run bash -c "$RELOAD_CMD" || echo "  （未设 RELOAD_CMD，跳过）"
echo "== 6 核对版本";  rm -rf out/device-pull && mkdir -p out/device-pull
for f in "${AR[@]}"; do run "$ADB" pull "$DEVICE_DIR/$(basename "$f")" out/device-pull/ >/dev/null; done
[ -n "${READY_FILE:-}" ] && run "$ADB" pull "$READY_FILE" out/device-pull/bz_ready.json >/dev/null || true
if [ "${DRY_RUN:-0}" = 1 ]; then for f in "${AR[@]}"; do cp "$f" out/device-pull/; done; fi
node forge/tools/fingerprint.js check --stamp out/build-stamp.json --device-files out/device-pull ${READY_FILE:+--ready out/device-pull/bz_ready.json}
echo "== 7 设备裁判";  if [ -n "${PLAN:-}" ]; then node host/device-run.js --plan "$PLAN"; else echo "  （未设 PLAN，跳过 dual 模式）"; fi
echo "闭环完成，用时 $(( $(date +%s) - t0 )) 秒"
