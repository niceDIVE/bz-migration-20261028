#!/usr/bin/env bash
# 一键自检 v2.2：裁判（1–4）+ 提效工具（5–17）+ 中层审计回归（18–21，2026-10-23）
set -euo pipefail
cd "$(dirname "$0")/.."
M2=${M2:-../r21/M2-客户端读点索引.md}
M1=${M1:-../r21/M1-动作全集表.tsv}
rm -rf forge/generated out/nightly.jsonl out/replayed
echo "== 1/21 生成契约"; node host/build-contracts.js --m2 "$M2" --m1 "$M1" --overrides config/contract-overrides.json --out out/contracts.json | grep -E '"(contracts|closed|open)"'
echo "== 2/21 干净用例"; node fixtures/make-fixtures.js >/dev/null
node host/judge.js --cases fixtures/cases --tables fixtures/tables --templates fixtures/templates.json --rules fixtures/rules.json --quiet --out out/report.json && echo "PASS"
echo "== 3/21 变异测试"; node host/mutate.js --cases fixtures/cases --tables fixtures/tables --templates fixtures/templates.json --rules fixtures/rules.json --allow-survivors config/known-survivors.json --out out/mutation.json | tail -2
echo "== 4/21 探针端到端"; node device/sim-test.js | tail -1
echo "== 5/21 投射器回测（用例里的 note 能否由存档差分自动推出）"; node forge/tools/test-projector.js
echo "== 6/21 规则 DSL → handler + 守恒式"; node -e '
const {compileAll,toRules}=require("./forge/lib/rules-dsl");const dsl=require("./forge/fixtures/rules.dsl.json");
const H=compileAll(dsl,{item:require("./fixtures/tables/item.json")});const s={coins:1000,bag:{2001:5}};
const r=H["User.buyShopItem"]({mod:"User",do:"buyShopItem",p:{itemID:2001,num:2}},s).resp;
if(JSON.stringify(r)!==JSON.stringify({eRet:1,note:{ivch:{2001:7},eco:{coins:880}}}))throw new Error("DSL 结果不对 "+JSON.stringify(r));
const f=H["User.saleItem"]({mod:"User",do:"saleItem",p:{itemID:2001,num:99}},s).resp;if(f.eRet!==0||s.bag[2001]!==7)throw new Error("失败分支改了存档");
console.log("PASS（与用例 02 逐字一致；失败分支不改存档；导出 "+Object.values(toRules(dsl).actions).flat().length+" 条守恒式）")'
echo "== 7/21 注册表 + 仪表盘 + 材料计数"; node forge/tools/registry.js --m1 "$M1" --contracts out/contracts.json --cases fixtures/cases --report out/report.json --capture config/capture.json --out out/registry.json --md out/dashboard.md --material out/material-counts.md
echo "== 8/21 兜底应答表"; node forge/tools/gen-stubs.js --m1 "$M1" --contracts out/contracts.json --policy heuristic --out out/stubs.json
echo "== 9/21 离线回放（兜底不安全的动作必须被裁判拦下）"
set +e; node forge/replay/replay.js --recordings fixtures/cases --dsl forge/fixtures/rules.dsl.json --tables fixtures/tables --rules fixtures/rules.json --out out/replay-report.json >/dev/null; rc=$?; set -e
node -e 'const r=require("./out/replay-report.json");const f=r.perCase.filter(x=>x.verdict==="FAIL").map(x=>x.action).sort().join(",");
if(f!=="User.LoadGame,User.sycnPlayerItemData"||r.byVia["stub-unsafe"]!==2)throw new Error("预期只拦 LoadGame/sycnPlayerItemData，实为 "+f);console.log("PASS（"+r.cases+" 个请求，"+JSON.stringify(r.byVia)+"；被拦："+f+"）")'
echo "== 10/21 边界模糊测试（干净实现 PASS，带漏洞实现被抓）"
node forge/replay/fuzz.js --action User.buyShopItem --save fixtures/cases/02-buyShopItem-2001x2.json --dsl forge/fixtures/rules.dsl.json --tables fixtures/tables | head -1
set +e; node forge/replay/fuzz.js --action User.buyShopItem --save fixtures/cases/02-buyShopItem-2001x2.json --dsl forge/fixtures/rules.dsl.json --tables fixtures/tables --generated forge/fixtures/buggy >/tmp/fz.txt; rc=$?; set -e
[ $rc = 1 ] && grep -q ACCEPTED_INVALID /tmp/fz.txt && echo "PASS（漏洞版被抓：$(grep -c ACCEPTED_INVALID /tmp/fz.txt) 处 FUZZ.ACCEPTED_INVALID）" || { cat /tmp/fz.txt; exit 1; }
echo "== 11/21 命名处理器展开器 + 请求参数抽取器（合成客户端）"
node forge/tools/expand-handlers.js --contracts forge/fixtures/client-src/mini-contracts.json --root forge/fixtures/client-src --out out/expanded.demo.json
node -e 'const r=require("./out/expanded.demo.json").actions.ACCEPT_SCHOOL_TASK;const f=Object.keys(r.extraFields).sort().join(",");
if(f!=="autoObj,cdTime,eRet,taskId,taskList"||!r.extraFields.autoObj.switch||!r.closed)throw new Error("展开结果不对 "+f);console.log("PASS（跟进 2 跳；autoObj 识别为开关字段）")'
node forge/tools/extract-req-params.js --src forge/fixtures/client-src/demo-client.js --m1 "$M1" --out out/req-params.demo.json
node -e 'const r=require("./out/req-params.demo.json");if(!r.SELL_ITEM||!r.SELL_ITEM.viaAlias||r.__unresolved.length!==1)throw new Error("别名常量/未解析发送点没处理");console.log("PASS（别名常量发送点认领 1 处；动态键发送点单列 1 处，不再静默跳过）")'
echo "== 12/21 效果族分类器"; node forge/tools/effect-classifier.js --tables forge/fixtures/tables --source item --out out/effects.demo.json
node -e 'const r=require("./out/effects.demo.json").families;if(r[13].verdict!=="CAPTURE-SUSPECT"||r[11].verdict!=="FK-RESOLVED")throw new Error("分类不对");console.log("PASS（Effect 13 → CAPTURE-SUSPECT，Effect 11 → FK-RESOLVED:skill）")'
echo "== 13/21 夜间生成循环 + 吞吐统计（演示生成器：第 1 轮犯老错，第 2 轮按裁判意见修正）"
node forge/tools/registry.js --m1 "$M1" --contracts out/contracts.json --cases fixtures/cases --implemented /dev/null --out out/registry.nightly.json --md /dev/null >/dev/null
rm -rf /tmp/bzo-rec && mkdir -p /tmp/bzo-rec && cp fixtures/cases/02-*.json fixtures/cases/03-*.json /tmp/bzo-rec/
node forge/agent/nightly.js --registry out/registry.nightly.json --recordings /tmp/bzo-rec --gen "node forge/agent/demo-gen.js {action} {out} {feedback} {attempt}" --status GEN-READY --tables fixtures/tables --rules fixtures/rules.json --limit 1 | tail -1
node forge/tools/throughput.js --log out/nightly.jsonl | grep -E 'autoPassRate|avgAttempts'
echo "== 14/21 存档体检 + 构建指纹"
node forge/tools/save-lint.js fixtures/cases/03-saleItem-2001x2.json
node -e 'const {lint}=require("./forge/tools/save-lint");const r=lint({bag:{4001:5},skills:{1:[0,0,0]},equipments:{1:9},baseValueAy:[1]});if(r.errors.length!==4)throw new Error("坏档没抓全 "+r.errors.length);console.log("PASS（坏档 4 处全抓到）")'
node forge/tools/fingerprint.js stamp --files forge/lib/projector.js --out out/build-stamp.demo.json >/dev/null
mkdir -p /tmp/fpdev && echo x > /tmp/fpdev/projector.js
if node forge/tools/fingerprint.js check --stamp out/build-stamp.demo.json --device-files /tmp/fpdev >/dev/null; then echo "指纹没拦住"; exit 1; else echo "PASS（设备版本不一致时拒绝继续）"; fi
echo "== 15/21 AST 展开器对抗测试（刁钻样例 + 审计 6 反例 + terser 压缩改名后结果一致；正则引擎永不判闭合）"; node forge/tools/test-expander.js | grep -E '^✔ (ast/|regex：)'
echo "== 16/21 状态机模型测试（fast-check 随机动作序列 + 离线 L2；老错自动缩成最短复现）"
node forge/replay/model-test.js --save fixtures/cases/02-buyShopItem-2001x2.json --actions User.buyShopItem,User.saleItem --dsl forge/fixtures/rules.dsl.json --tables fixtures/tables --seed 7
set +e; node forge/replay/model-test.js --save fixtures/cases/02-buyShopItem-2001x2.json --actions User.buyShopItem,User.saleItem --dsl forge/fixtures/rules.dsl.json --tables fixtures/tables --generated forge/fixtures/buggy2 --seed 7 >/tmp/mt.txt; rc=$?; set -e
[ $rc = 1 ] && grep -q "L2 离线不一致" /tmp/mt.txt && echo "PASS（ivch 发增量的老错被抓，最短复现 $(grep -c '^  [0-9]\.' /tmp/mt.txt) 步）" || { cat /tmp/mt.txt; exit 1; }
echo "== 17/21 HAR 抓包 → 用例/模板"; rm -rf out/captured
node forge/tools/har2cases.js --har forge/fixtures/demo.har --url-re /game --out-cases out/captured --templates out/templates.captured.json
node host/judge.js --cases out/captured --layers L1 --quiet && echo "PASS（抓包用例过 L1）"
echo "== 18/21 审计假 PASS 反例库（A2：无契约 / meta 豁免 ×3 / 探针缺位 / 无存档，必须逐条 FAIL 且原因对）"
node fixtures/make-audit-neg.js
node -e '
const {loadCtx,loadCases,judgeCases}=require("./host/judge");const T={tables:"fixtures/tables",templates:"fixtures/templates.json",rules:"fixtures/rules.json"};
const ctx=loadCtx(T,process.cwd());const cs=loadCases("fixtures/audit-neg");
const want={"audit.fp1.no-contract":"FAIL L1.NO_CONTRACT","audit.fp2a.abolish":"FAIL L1.SKCH_LV0","audit.fp2b.fullreload":"FAIL L1.NOTE_MISSING_IVCH","audit.fp2c.l4allow":"FAIL L4.DIFF","audit.fp3.probe-none":"FAIL L0.NO_PROBE","audit.fp4.no-save":"FAIL L1.NO_SAVE"};
const r=judgeCases(cs,ctx,{requireSave:true});const bad=[];
for(const c of r.perCase){const codes=c.findings.map(x=>x.level+" "+x.code);if(c.verdict!=="FAIL"||!codes.includes(want[c.id]))bad.push(c.id+" → "+c.verdict+" "+codes.join(","));}
const r2=judgeCases(cs.filter(c=>c.id==="audit.fp4.no-save"),ctx,{});if(!r2.perCase[0].findings.some(x=>x.code==="L1.NO_SAVE"&&x.level==="WARN")||r2.summary.noSaveCases!==1)bad.push("fp4 不带 --require-save 时没有单列");
const ok=judgeCases(loadCases("fixtures/cases"),ctx,{});if(ok.verdict!=="PASS")bad.push("干净用例被误杀");
if(bad.length)throw new Error(bad.join("\n"));console.log("PASS（"+cs.length+" 个审计反例全部 FAIL 且原因对；干净用例仍 PASS；LoadGame/sycn 的 fullReload 由 config.metaEscapes 授予）")'
echo "== 19/21 生成代码闸（A6：静态闸 7 个逃逸样本全拒；冒充 withProjection 被 WeakSet 拦；改投射外存档域被拦）"
set +e; node forge/lib/gen-gate.js forge/fixtures/gen-evil/*.js >/tmp/gate.txt; set -e
[ "$(grep -c '^✘' /tmp/gate.txt)" = "$(ls forge/fixtures/gen-evil/*.js | wc -l)" ] || { cat /tmp/gate.txt; echo "静态闸漏拒"; exit 1; }
node -e '
const {loadGenerated,createForgeServer}=require("./forge/replay/server");const fs=require("fs"),os=require("os");
const d=fs.mkdtempSync(os.tmpdir()+"/ev");fs.copyFileSync("forge/fixtures/gen-evil/e5-shadow.js",d+"/a.js");fs.copyFileSync("forge/fixtures/gen-evil/e4-bare.js",d+"/b.js");
const H=loadGenerated(d,{strict:true});if(Object.keys(H).length||H.__rejected.length!==2)throw new Error("严格加载没拦住 "+JSON.stringify(H.__rejected));
const srv=createForgeServer({contracts:require("./out/contracts.json"),generatedDir:"forge/fixtures/gen-domain",strictGenerated:true});srv.setSave({coins:1,bag:{2001:3},titles:{}});
let caught=false;try{srv.dispatch({mod:"User",do:"saleItem",p:{itemID:2001,num:1}})}catch(e){caught=/titles/.test(e.message)}if(!caught)throw new Error("存档域白名单没拦住");
console.log("PASS（静态闸拒 "+fs.readdirSync("forge/fixtures/gen-evil").length+"/"+fs.readdirSync("forge/fixtures/gen-evil").length+"；严格加载拒 2/2；titles 域改动被拦）")'
echo "== 20/21 客户端模型 M4 单点断言（A5：eco.exp / attrch 非 hunger / gemch → UNMODELED；eqch 更新分支）"; node forge/tools/test-client-model.js | tail -1
echo "== 21/21 夜间循环回归判死（A2#6：生成的 saleItem 拒卖装备，与录制不一致 → 必须转人工）"
rm -rf forge/generated out/nightly.jsonl
node forge/agent/nightly.js --registry out/registry.nightly.json --recordings fixtures/cases --gen "node forge/agent/demo-gen.js {action} {out} {feedback} {attempt}" --status GEN-READY --tables fixtures/tables --rules fixtures/rules.json --limit 1 >/tmp/n21.txt
node -e 'const l=require("fs").readFileSync("out/nightly.jsonl","utf8").trim().split("\n").map(JSON.parse)[0];
if(l.outcome!=="HUMAN"||!l.fails.some(f=>/与录制应答不一致 saleItem\.equip90001/.test(f)))throw new Error("回归没判死 "+JSON.stringify(l));console.log("PASS（v2.1 会放行的 saleItem 被判转人工："+l.fails[0]+"）")'
rm -rf forge/generated out/nightly.jsonl
echo "全部通过"
