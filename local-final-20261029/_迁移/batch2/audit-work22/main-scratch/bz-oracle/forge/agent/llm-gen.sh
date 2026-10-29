#!/usr/bin/env bash
# nightly 的真实生成器包装：组上下文包 → 调你的 LLM 命令 → 抽出代码块写成 handler 文件。
# 用法（nightly）：--gen "bash forge/agent/llm-gen.sh {action} {out} {feedback} {attempt}"
# 需要环境变量 LLM_CMD：从 stdin 读提示、向 stdout 写回答的命令（材料未指定用哪个模型/CLI，按你们环境填）。
set -euo pipefail
ACTION=$1; OUT=$2; FB=$3; ATTEMPT=$4
cd "$(dirname "$0")/../.."
: "${LLM_CMD:?需要设置 LLM_CMD}"
P=$(mktemp)
node forge/agent/prompt-pack.js --action "$ACTION" --contracts out/contracts.json \
  ${REQ_PARAMS:+--req-params $REQ_PARAMS} --registry out/registry.json --feedback "$FB" \
  ${DSL:+--dsl $DSL} ${RECORDINGS:+--recordings $RECORDINGS} --out "$P"
eval "$LLM_CMD" < "$P" | awk '/^```(js|javascript)?$/{f=!f;next} f' > "$OUT.tmp"
sed "s#<forge>#$(pwd)/forge#g" "$OUT.tmp" > "$OUT" && rm -f "$OUT.tmp" "$P"
[ -s "$OUT" ] || { echo "LLM 没有返回代码块" >&2; exit 1; }
