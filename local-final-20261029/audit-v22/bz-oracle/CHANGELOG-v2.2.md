# v2.2（2026-10-23）：按中层审计 A0–A10 修订

自检 17 → 21 步，全部通过。变异库 18 → 23 个（新增 M19–M23，对应审计 A2 的假 PASS 通道）：v2.2 击杀 120/121；同一份变异库在 v2.1 上只击杀 100/121。唯一存活的仍是已登记的 M09。

## 裁判（host/）
- `L1.NO_CONTRACT` 从 WARN 升为 **FAIL**（`config.noContractIs`）。【A2#1】
- `case.meta` 里的豁免（abolish / fullReload / l4Allow）**只在 `config.metaEscapes` 登记过才生效**，否则忽略并报 `META_IGNORED`。目前只登记了 LoadGame、sycnPlayerItemData 的 fullReload。【A2#2】
- 无存档用例报 `L1.NO_SAVE`（默认 WARN；`--require-save` 时为 FAIL，nightly 默认开）；summary 单列 `noSaveCases` 和 `noProbeCases`。【A2#4】
- `probe.mode=none` 从 WARN 升为 **FAIL**（`config.noProbeIs`）；离线回放报 `INFO L0.NOT_RUN`，回放报告带 `l0:'not-run'`。【A2#5】
- build-contracts 从 M2 原文识别**真值读**（`if (o.x)`、`o.x &&`、`o.x ?`、`!o.x`、`o.x ||`），在字段上标 `truthy`。真实契约里共识别出 137 个。【A3#1 / A4#6】
- 变异体 M19–M23 覆盖 meta 豁免 ×3、探针缺位、未知动作。【A8#3】

## 工具箱（forge/）
- **AST 展开器**：遍历应答本身的 for-in 记为逃逸；撞内置名的顶层属性读照常记字段；变量键的 `hasOwnProperty` / `in` 记为逃逸；同一处理器注册给多个事件时，相关契约一律不闭合；新增真值读标记。**正则回退引擎永不判闭合。**【A4】
- **兜底**：真值读字段不再填空容器，真实 stubs 因此少发 7 个字段（4 个 `rewardArray`、2 个 `dataArr`、1 个 `recentSeeds`）。付费名单改为只读 `config.payActionRe` 这一处。新增 `config/stub-deny.json`（人工禁兜底名单，现为空）。运行时以 `stub-unsafe` 标出不安全兜底。【A3、A0.1】
- **夜间循环**，默认全开（`--loose` 可关，关了会写进日志）：
  - 静态闸 `lib/gen-gate.js`（G1–G5）；
  - 严格加载：handler 必须由 withProjection 包装，用模块私有 WeakSet 校验，无法伪造；
  - 存档域白名单：改了投射器覆盖不到的域直接判错；
  - 输入冻结：sha256 校验表、规则、契约、DSL、录制和配置；
  - fuzz 闸：参数取自录制样本；
  - 回归判死；
  - generated 必须接管全部用例。【A6、A2#6】
- **客户端模型**：
  - eco.exp、attrch 中除 hunger 外的键、gemch、投射外存档域的变化 → 报 `UNMODELED`，不能判 PASS；
  - eqch 补上 type==1 的更新分支（M4:66）；
  - 新增 12 条 M4 单点断言（`tools/test-client-model.js`）。【A5、A8#16】
- **请求参数抽取**：别名常量按 M1 认领；动态键发送点列入 `__unresolved`，不再静默跳过。【A1-C12】
- **HAR**：请求体也能识别 base64。【A1-C17】
- **探针**：模拟世界补上提示框，新增 toast 场景，验证从采集到 `L0.TOAST` 的整条链路。真实符号仍是 TODO。【A0.2】
- **loop.sh**：推送前先复核"待推文件 == 已裁判版本"。【A1-C15】
- **prompt-pack**：把闸门规则和真值读列写进提示。

## 新增文件
`fixtures/make-audit-neg.js`、`fixtures/audit-neg/`（6 个审计反例）、`forge/fixtures/client-src/cx-client.js`（6 个展开器反例）、`forge/fixtures/gen-evil/`（7 个逃逸样本）、`forge/fixtures/gen-domain/`、`forge/lib/gen-gate.js`、`forge/tools/test-client-model.js`、`config/stub-deny.json`、`docs/中层审计处置回执.md`
