#!/usr/bin/env bash
# 一键自检 v2.1：裁判（1–4）+ 提效工具（5–17）
set -euo pipefail
cd "$(dirname "$0")/.."
M2=${M2:-../r21/M2-客户端读点索引.md}
M1=${M1:-../r21/M1-动作全集表.tsv}
rm -rf forge/generated out/nightly.jsonl out/replayed
echo "== 1/17 生成契约"; node host/build-contracts.js --m2 "$M2" --m1 "$M1" --overrides config/contract-overrides.json --out out/contracts.json | grep -E '"(contracts|closed|open)"'
echo "== 2/17 干净用例"; node fixtures/make-fixtures.js >/dev/null
node host/judge.js --cases fixtures/cases --tables fixtures/tables --templates fixtures/templates.json --rules fixtures/rules.json --quiet --out out/report.json && echo "PASS"
echo "== 3/17 变异测试"; node host/mutate.js --cases fixtures/cases --tables fixtures/tables --templates fixtures/templates.json --rules fixtures/rules.json --allow-survivors config/known-survivors.json --out out/mutation.json | tail -2
echo "== 4/17 探针端到端"; node device/sim-test.js | tail -1
echo "== 5/17 投射器回测（用例里的 note 能否由存档差分自动推出）"; node forge/tools/test-projector.js
echo "== 6/17 规则 DSL → handler + 守恒式"; node -e '
const {compileAll,toRules}=require("./forge/lib/rules-dsl");const dsl=require("./forge/fixtures/rules.dsl.json");
const H=compileAll(dsl,{item:require("./fixtures/tables/item.json")});const s={coins:1000,bag:{2001:5}};
const r=H["User.buyShopItem"]({mod:"User",do:"buyShopItem",p:{itemID:2001,num:2}},s).resp;
if(JSON.stringify(r)!==JSON.stringify({eRet:1,note:{ivch:{2001:7},eco:{coins:880}}}))throw new Error("DSL 结果不对 "+JSON.stringify(r));
const f=H["User.saleItem"]({mod:"User",do:"saleItem",p:{itemID:2001,num:99}},s).resp;if(f.eRet!==0||s.bag[2001]!==7)throw new Error("失败分支改了存档");
console.log("PASS（与用例 02 逐字一致；失败分支不改存档；导出 "+Object.values(toRules(dsl).actions).flat().length+" 条守恒式）")'
echo "== 7/17 注册表 + 仪表盘 + 材料计数"; node forge/tools/registry.js --m1 "$M1" --contracts out/contracts.json --cases fixtures/cases --report out/report.json --capture config/capture.json --out out/registry.json --md out/dashboard.md --material out/material-counts.md
echo "== 8/17 兜底应答表"; node forge/tools/gen-stubs.js --m1 "$M1" --contracts out/contracts.json --policy heuristic --out out/stubs.json
echo "== 9/17 离线回放（兜底不安全的动作必须被裁判拦下）"
set +e; node forge/replay/replay.js --recordings fixtures/cases --dsl forge/fixtures/rules.dsl.json --tables fixtures/tables --rules fixtures/rules.json --out out/replay-report.json >/dev/null; rc=$?; set -e
node -e 'const r=require("./out/replay-report.json");const f=r.perCase.filter(x=>x.verdict==="FAIL").map(x=>x.action).sort().join(",");
if(f!=="User.LoadGame,User.sycnPlayerItemData")throw new Error("预期只拦 LoadGame/sycnPlayerItemData，实为 "+f);console.log("PASS（"+r.cases+" 个请求，"+JSON.stringify(r.byVia)+"；被拦："+f+"）")'
echo "== 10/17 边界模糊测试（干净实现 PASS，带漏洞实现被抓）"
node forge/replay/fuzz.js --action User.buyShopItem --save fixtures/cases/02-buyShopItem-2001x2.json --dsl forge/fixtures/rules.dsl.json --tables fixtures/tables | head -1
set +e; node forge/replay/fuzz.js --action User.buyShopItem --save fixtures/cases/02-buyShopItem-2001x2.json --dsl forge/fixtures/rules.dsl.json --tables fixtures/tables --generated forge/fixtures/buggy >/tmp/fz.txt; rc=$?; set -e
[ $rc = 1 ] && grep -q ACCEPTED_INVALID /tmp/fz.txt && echo "PASS（漏洞版被抓：$(grep -c ACCEPTED_INVALID /tmp/fz.txt) 处 FUZZ.ACCEPTED_INVALID）" || { cat /tmp/fz.txt; exit 1; }
echo "== 11/17 命名处理器展开器 + 请求参数抽取器（合成客户端）"
node forge/tools/expand-handlers.js --contracts forge/fixtures/client-src/mini-contracts.json --root forge/fixtures/client-src --out out/expanded.demo.json
node -e 'const r=require("./out/expanded.demo.json").actions.ACCEPT_SCHOOL_TASK;const f=Object.keys(r.extraFields).sort().join(",");
if(f!=="autoObj,cdTime,eRet,taskId,taskList"||!r.extraFields.autoObj.switch||!r.closed)throw new Error("展开结果不对 "+f);console.log("PASS（跟进 2 跳；autoObj 识别为开关字段）")'
node forge/tools/extract-req-params.js --src forge/fixtures/client-src/demo-client.js --m1 "$M1" --out out/req-params.demo.json
echo "== 12/17 效果族分类器"; node forge/tools/effect-classifier.js --tables forge/fixtures/tables --source item --out out/effects.demo.json
node -e 'const r=require("./out/effects.demo.json").families;if(r[13].verdict!=="CAPTURE-SUSPECT"||r[11].verdict!=="FK-RESOLVED")throw new Error("分类不对");console.log("PASS（Effect 13 → CAPTURE-SUSPECT，Effect 11 → FK-RESOLVED:skill）")'
echo "== 13/17 夜间生成循环 + 吞吐统计（演示生成器：第 1 轮犯老错，第 2 轮按裁判意见修正）"
node forge/tools/registry.js --m1 "$M1" --contracts out/contracts.json --cases fixtures/cases --implemented /dev/null --out out/registry.nightly.json --md /dev/null >/dev/null
node forge/agent/nightly.js --registry out/registry.nightly.json --recordings fixtures/cases --gen "node forge/agent/demo-gen.js {action} {out} {feedback} {attempt}" --status GEN-READY --tables fixtures/tables --rules fixtures/rules.json --limit 1 | tail -1
node forge/tools/throughput.js --log out/nightly.jsonl | grep -E 'autoPassRate|avgAttempts'
echo "== 14/17 存档体检 + 构建指纹"
node forge/tools/save-lint.js fixtures/cases/03-saleItem-2001x2.json
node -e 'const {lint}=require("./forge/tools/save-lint");const r=lint({bag:{4001:5},skills:{1:[0,0,0]},equipments:{1:9},baseValueAy:[1]});if(r.errors.length!==4)throw new Error("坏档没抓全 "+r.errors.length);console.log("PASS（坏档 4 处全抓到）")'
node forge/tools/fingerprint.js stamp --files forge/lib/projector.js --out out/build-stamp.demo.json >/dev/null
mkdir -p /tmp/fpdev && echo x > /tmp/fpdev/projector.js
if node forge/tools/fingerprint.js check --stamp out/build-stamp.demo.json --device-files /tmp/fpdev >/dev/null; then echo "指纹没拦住"; exit 1; else echo "PASS（设备版本不一致时拒绝继续）"; fi
echo "== 15/17 AST 展开器对抗测试（刁钻样例 + terser 压缩改名后结果一致）"; node forge/tools/test-expander.js | grep ast/
echo "== 16/17 状态机模型测试（fast-check 随机动作序列 + 离线 L2；老错自动缩成最短复现）"
node forge/replay/model-test.js --save fixtures/cases/02-buyShopItem-2001x2.json --actions User.buyShopItem,User.saleItem --dsl forge/fixtures/rules.dsl.json --tables fixtures/tables --seed 7
set +e; node forge/replay/model-test.js --save fixtures/cases/02-buyShopItem-2001x2.json --actions User.buyShopItem,User.saleItem --dsl forge/fixtures/rules.dsl.json --tables fixtures/tables --generated forge/fixtures/buggy2 --seed 7 >/tmp/mt.txt; rc=$?; set -e
[ $rc = 1 ] && grep -q "L2 离线不一致" /tmp/mt.txt && echo "PASS（ivch 发增量的老错被抓，最短复现 $(grep -c '^  [0-9]\.' /tmp/mt.txt) 步）" || { cat /tmp/mt.txt; exit 1; }
echo "== 17/17 HAR 抓包 → 用例/模板"; rm -rf out/captured
node forge/tools/har2cases.js --har forge/fixtures/demo.har --url-re /game --out-cases out/captured --templates out/templates.captured.json
node host/judge.js --cases out/captured --layers L1 --quiet && echo "PASS（抓包用例过 L1）"
rm -rf forge/generated
echo "全部通过"
