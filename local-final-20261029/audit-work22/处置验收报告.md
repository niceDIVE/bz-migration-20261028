# 处置验收报告：bz-oracle v2.2（对《中层审计报告 A0–A10》与《处置回执》）

验收人：主审 + W4（差异清点）+ W5（机制落码取证）
日期：2026-10-23　方法：主审在隔离副本逐条跑 v2.2 自检 21 步（bash 受限环境同前轮，以逐条 node 等价替代；第 13/21 步以手动循环/脚本模拟补齐），并用 v2.1 审计的**原始复现武器**重打 v2.2；W5 对回执 18 组机制点做行号化取证；W4 做包间差异清点。

---

## 一、总验收结论

**处置回执的 22 条处置：20 条验收通过（含 4 条"部分/待材料"如实降级），1 条部分通过（A6#1 文档未兑现），1 条引出新缺陷（G1 Windows 路径）。** 六条假 PASS 通道在 v2.2 上全部实测被拦（用我 v2.1 的原始复现用例），回执的四个关键数字（truthy=137、stub 少发 7 字段、v2.2 击杀 120/121、同一变异库在 v2.1 上 100/121）全部精确复现。自检 21 步中 19 步原样通过，第 4/13/21 步因沙箱禁 bash/spawn 以等价方式验证。

## 二、六条假 PASS 通道复验（验收必含原故障重现用例）

用 v2.1 审计时的原始用例文件（非包内转录件）重打 v2.2 裁判：

| 通道 | v2.1 实测 | v2.2 实测 | 原因码 |
|---|---|---|---|
| A2#1 无契约动作 | PASS（仅 WARN） | **FAIL** | L1.NO_CONTRACT 升 FAIL（layers.js:126，config.noContractIs） |
| A2#2a meta.abolish | PASS | **FAIL** | L1.SKCH_LV0（豁免须 config.metaEscapes 授予，layers.js metaEscape） |
| A2#2b meta.fullReload | PASS | **FAIL** | L1.NOTE_MISSING_IVCH/ECO + WARN L1.META_IGNORED（买 ShopItem 无豁免资格） |
| A2#2c meta.l4Allow | PASS | **FAIL** | L4.DIFF（l4Allow 未在 config 登记，被忽略） |
| A2#4 无存档假绝对值 | PASS | 默认 **WARN+单列**（noSaveCases=1）；`--require-save` 下 **FAIL L1.NO_SAVE** | nightly 默认 requireSave |
| A2#5 探针缺位 | PASS（仅 WARN） | **FAIL** | L0.NO_PROBE 升 FAIL（layers.js:63，config.noProbeIs） |
| A2#6 回归不判死 | 放行（regressions=1 只计数） | **HUMAN**（nightly.js:89,94：`与录制应答不一致 saleItem.equip90001：$.eRet, $.note`） | strictRegress 默认开 |
| A2#3 展开器假闭 | 六反例全 closed | CX1/CX3/CX4 判逃逸、CX2 收全字段 {keys,length,map}、CX5 共享处理器 runAst 层联防判逃逸（expand-handlers.js:122-127） | 正则引擎永不判闭合（expand-handlers.js:153） |

对照组（4 个）在 v2.2 上仍按预期 FAIL，无误杀。自检第 18 步把六反例做成常驻断言（原因码逐一校验），第 19 步把生成闸做成常驻断言——守护闭环成立。

## 三、回执数字复核（全部精确命中）

| 回执声称 | 实测 | 证据 |
|---|---|---|
| 真值读字段 137 个 | **137** | contracts.json 全量扫描（W5+主审双口径） |
| 真实 stubs 少发 7 字段（4×rewardArray、2×dataArr、1×recentSeeds） | **7 条差异，字段构成完全一致** | v2.1/v2.2 stubs.json 逐条 diff |
| v2.2 击杀 120/121（23 变异库，M19–M23 全灭，唯一存活 M09） | **120/121** | 主审复跑 mutate（M19–M23 的 why 都标注审计出处） |
| 同一变异库在 v2.1 上 100/121 | **100/121**，存活=M09×1+M19–M22×20，全部落在审计指出的通道 | 主审跨版本驱动（v2.2 变异库×v2.1 裁判） |
| 第 9 步 byVia["stub-unsafe"]===2 | **2** | replay-report.json 实测 |
| 第 20 步 12 条 M4 单点断言（UNMODELED 处置） | **12/12** | test-client-model.js 实测（eco.exp/attrch 非 hunger/gemch→UNMODELED；eqch type==1 更新分支落地） |
| 修复 A2#6 时发现的真实漏判（演示生成器拒卖装备，v2.1 放行→v2.2 转人工） | **成立** | step21 模拟：装备用例回归 `$.eRet, $.note` → HUMAN；v2.1 同场景 attempt2 PASS-RETRY（上轮实测） |

## 四、回执异议与偏离的裁决

1. **A3#1 异议（AttckData）——异议成立，审计方认错**。M2:15809 原文确为 `o.AttckData.getargetType = 1);`——解引用赋值，不是真值检查。我上一轮把 `User.ChallengePVP` 的 `AttckData:{}` 当"真值翻转"例证属于引证错误：该字段的缺席语义是"抛 TypeError（fail-visible）"，发 `{}` 是 fail-silent，**不发**才保持与原行为对齐。开发者"只针对这个例子异议、规则照单采纳"的处置是正确的。规则 S2 本身维持（137 个真值读字段的识别与跳过已实测生效）。
2. **A2#2 机制偏离（不剥 meta，改 config 授予豁免）——接受**。理由核实成立：LoadGame/sycnPlayerItemData 的 fullReload 是合法豁免，回放时剥 meta 会误杀这两个合法用例；改为"豁免只能由 config.metaEscapes 授予"（当前仅登记这两个动作），case 作者/录制/生成器都改不了 config，且 nightly 输入冻结把 config/oracle.config.json 一并锁进 sha256（nightly.js:39）。未登记的 meta 现在产生可见的 `WARN L1.META_IGNORED`。该机制在功能上等价于剥 meta 且不误杀，接受。
3. **A4 偏离（子字段 for-in 仍允许闭合）——接受，附一个条件**。实测 `for (k in o.rewardObj)` → closed=true、fields={rewardObj}。"字段已知、值是字典"的论证成立：L1 只管应答顶层键，子键不在契约对账域。条件：该字段应在契约上标注"任意子键消费"（现以 notes 形式保留），生成器提示里要体现，否则生成器可能只回部分子键。**"顶层 for-in 一律逃逸"已实测覆盖我原反例的全部危险面**，故"notes 非空不得闭合"的粗规则不必采纳。
4. **A7 P0.4 的材料矛盾——裁决见第六节**。

## 五、本轮新发现（v2.2 回归/缺口）

1. **【新缺陷】G1 静态闸在 Windows 上拒绝合法 handler**。gen-gate.js:13 白名单正则只认正斜杠（`\/forge\/lib\/(projector|rules-dsl)$` 或相对路径），而 demo-gen.js:8-10 在 Windows 上产出混合分隔符的 require（`F:\...\forge\lib/rules-dsl`）→ G1 误拒（实测：同一文件，Windows 路径 REJECT / 手工改正斜杠后 PASS）。后果：Windows + Node 直跑时 nightly 的静态闸把合法生成物全判 HUMAN，自检第 21 步的断言（fails 含 `与录制应答不一致`）在 Windows 上必然失败——开发者环境（POSIX 路径形态）测不出。修法（落到文件:函数）：`gen-gate.js gate()` 在 REQ_OK 测试前加 `s = s.replace(/\\/g, '/')`；或 demo-gen 改用 path.posix 拼接。加自检断言：在 Windows 形态路径下 demo-gen 产物必须过闸。
2. **【承诺未兑现】A6#1"要求在受限环境里跑，已写进文档"**。根 README.md、forge/README.md、CHANGELOG-v2.2.md 三处 grep `受限|沙箱|spawn` 全部零命中；唯一出处是回执文档自身。prompt-pack.js:31 把闸门规则写进了 LLM 提示，但那是给生成器的，不能替代给使用者的运行环境约束。修法：forge/README.md 增加运行边界小节（nightly 必须：受限文件权限/无网络/输入冻结生效的环境；列出三类逃逸残余）。
3. **【遗留脆弱点未修】sim-test.js 在禁管道捕获环境下崩溃**。v2.1 审计已指出 `catch(e){ txt=e.stdout }` 不防 undefined（上轮 sim-test.js:101；v2.2 为 ：100），本轮原样复现（TypeError: Cannot read properties of undefined）。不影响结论（我以进程内 judge 等价替代后四场景全过），但既然该文件本轮已改（toast 场景），建议一并修：`catch(e){ code=e.status; txt=e.stdout||'' }`。
4. **【设计注记】L0.TOAST 仍是 WARN**。未登记提示文案不会判 FAIL（layers.js:64 区间）。这是合理设计（toast≠错误），但回执 0.2 说"裁判出 L0.TOAST"，验收时确认其级别为 WARN——与"C4 维持部分成立"一致，不算偏差，记录在案。

## 六、A7 P0.4 裁决（回执请求的设计决定）

**问题**：M4 §5 列 12 个 attrch 已证子键，但 M3 存档字典（实测 grep）只有 hunger（M3:28）、hungerMax（M3:29）、school（M3:37）有存档字段；curhp/curmp/hplmt/hpbase/mpbase/mpTrained/evil/ndeath/seniorSchool/exp 全部没有存档键。

**裁决**：这不是取证缺口，是对账域分类问题。M4 §5 的消费点全是客户端**活值 setter**（`entity.hp.setRemaining` 等，M4:109），服务端（按现有材料）不把这些持久化——它们没有"存档真值"可对账。因此：

1. 把 attrch/eco 子键按 **M3 有无存档字段**二分：
   - **persistent**（有存档字段，进 attrSaveMap/ecoSaveMap 对账）：attrch.hunger、attrch.school；eco 的 coins/ptt/gold/yuanbao/chips（M3 已有）。
   - **derived**（无存档字段，客户端活值）：attrch 的 mpTrained/mpbase/hpbase/curmp/curhp/hplmt/exp/evil/seniorSchool/ndeath；eco.exp。
2. 处置规则：derived 键 **不进** 对账映射（现状的 UNMODELED 即此语义，保留）；L1 对 derived 只做形状/越界检查（ATTRCH_VAL/HUNGER 已有）；handler 要发 derived 键时按 M4 已证消费点语义原样发，由 fuzz+真机 L2 验证，不与存档对账。
3. **判据（按 A7 要求的形式）**："当 attrch/eco 子键的 persistent/derived 二分写进 config（attrSaveMap 只收 persistent），且 client-model 对 derived 报 UNMODELED、L1 对 derived 只做形状检查这三条都有自检断言时，可以开始生成含 attrch/eco.exp 的动作；真机 L2 通过前 S4 不闭合。"
4. 前提失效条件：若真实 bz-rpc-server.js 进包后证实服务端确实把 curhp 等写进了某个存档字段（即 M3 字典不全），则 derived 分类作废、按 persistent 补 M3 并恢复对账。

## 七、逐条验收台账

| 回执条目 | 处置 | 验收 |
|---|---|---|
| 总账-6 通道堵住+第 18 步 | 采纳 | ✔（原始复现武器重打全 FAIL；第 18 步断言原因码逐一校验通过） |
| 总账-变异库 120/121、v2.1 100/121 | — | ✔（双版本实测精确命中） |
| 总账-saleItem 拒卖装备真实漏判 | 采纳 | ✔（step21 模拟：回归判死 HUMAN） |
| A0.1 stub-unsafe | 采纳 | ✔（第 9 步断言 stub-unsafe===2；stub.js:61 运行时标记） |
| A0.2 toast 模拟层 | 采纳 | ✔（TipsUI 解析、文案采集、L0.TOAST 全链路实测；级别 WARN 注记） |
| A0.3 材料改写 | 采纳 | 待下一轮材料（无代码可验） |
| A0.4 HttpConst3 | 待材料 | ✔ 如实降级（L1.NO_CONTRACT=FAIL 已兜住零检查面） |
| A0.5 未改 | — | ✔ 事实如此（本沙箱同证） |
| A1 声称收窄（forge README） | 采纳 | ✔（W5：合成样例:23、必要条件:24、容错:25/89、__unresolved:17/89） |
| A2#1–#6 | 采纳 | ✔（见第二节） |
| A3 S1/S2/S5 | 采纳 | ✔（137/7 实测；payActionRe 单一来源 stub.js:9-18） |
| A3 S3/S4 部分 | 部分 | ✔ 如实（stub-deny.json 机制在、名单空，stub.js:20/31-33） |
| A3#1 异议 | 不同意（个例） | ✔ 异议成立（M2:15809），审计认错 |
| A4 六反例+偏离 | 采纳+偏离 | ✔（偏离裁决见第四节.3） |
| A5 UNMODELED/eqch/12 断言 | 采纳 | ✔（test-client-model 12/12） |
| A6#1 | 部分 | ✘ 代码落地但文档未兑现（第五节.2） |
| A6#2–#7 | 采纳/部分 | ✔（静态闸 7/7 拒+理由正确、严格加载 2/2、titles 白名单、输入冻结、fuzz 闸、viaOk 收紧；#5 残余风险如实） |
| A7 分层 | 同意 | ✔（P0.4 裁决见第六节） |
| A8 第 15/20 步+M19–M23 | 采纳 | ✔（期望值标注审计来源；M4 行号绑定断言） |
| A10 未复现 | — | ✔ 如实（维持【推断】） |
| C15 推送顺序修复 | 采纳 | ✔（loop.sh:22 check 先于 :23 push，设备侧二次 check :29） |

## 八、残余风险（验收后仍开放）

1. A6#5 原样保留：无录制样本又无守恒规则的动作，伪造 saveAfter 仍抓不到（开发者已如实申报）——GEN 批量应优先覆盖有录制/有规则的动作（与 A7 P0 判据一致）。
2. stub-deny 名单为空：S3（后续推送依赖）/S4（回空即崩）两类仍靠人工登记，扩大 GEN 前按 M2 次消费点逐条补。
3. G1 Windows 缺陷修复前，Windows 环境的 nightly 不可用（表现为全 HUMAN）。
4. 沙箱不可 spawn 导致第 13/21 步编排未在本环境原样跑通（以等价模拟验证实质）；开发者在 POSIX 环境的"21 步全过"与本验收不矛盾。

## 九、证据索引

- 主审复跑：`audit-work22/main-scratch/`（隔离副本）、`audit-work22/step6-check.js`、`step18-check.js`、`step21-sim.js`、`cross-mutate.js`、`cx2b.js`
- v2.1 原始复现武器重打 v2.2：`audit-work22/replay-v1/`（10 个用例目录）
- 工人报告：`audit-work22/w5-mech.md`（18 组机制点行号取证）、`audit-work22/w4-diff.md`（包间差异清点）
- 上轮审计与复现：`midaudit-v21/audit-work/审计报告-A0-A10.md`、`midaudit-v21/audit-work/repro/`

## 附录 A：包间差异清点（W4，主审抽样确认）

- **新增 21 个文件（36,961 字节）**：与 CHANGELOG"新增文件"清单逐一吻合（make-audit-neg.js + audit-neg×6 + cx-client.js + gen-evil e1–e7 + gen-domain + gen-gate.js + test-client-model.js + stub-deny.json + docs/回执 + CHANGELOG 自身）；**删除 0 个**；**改动 26 个**（oracle.config.json 1713→2799、selftest.sh 7458→11855、client-model.js 1674→3884 等，全表见 w4-diff.md §1c）；**未动 55 个**（全长 SHA-256 复核 0 个同长不同内容）。
- **r21\ 契约基线未动**：两侧 10/10 文件全长 SHA-256 一致（主审另抽查 M4/M1 两文件独立复验一致）——本轮验收的判级全部建立在同一契约基准上。
- v2.2 包**没有 MANIFEST/校验和文件**（v2.1 有）——建议下一版补上，否则"包内自洽"断言失去机械校验入口。
- node_modules 两侧计数与字节合计相同（305/5,952,904，未逐文件比对）；out\ 侧差异与 loop.sh 推送前核对的新流程吻合（新增 out/pre-push/projector.js）。
- W4 自报执行瑕疵两处（首跑作废、以内联重跑为准）与守恒自检（A 397=71+21+305；B 417=92+20+305）均如实留痕；主审抽样（新增清单↔CHANGELOG 比对、r21 双文件哈希、改动文件字节数↔主审读取记录）全部吻合，报告采信。
