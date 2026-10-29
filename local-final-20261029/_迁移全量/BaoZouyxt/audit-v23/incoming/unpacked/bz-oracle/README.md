# bz-oracle：自动裁判（v1.0，2026-10-22）

> v2 新增提效工具箱 `forge/`（投射器、规则 DSL、注册表、兜底、离线回放、模糊测试、展开器、参数抽取、效果族分类、夜间生成循环、吞吐统计、存档体检、构建指纹、一键闭环），说明见 `forge/README.md`。自检从 4 步扩为 17 步（v2.1 新增 AST 展开器、fast-check 模型测试 + 离线 L2、HAR 转用例）。
> **v2.3（2026-10-23）**：按 R22 的真服事实做了两项修订。① 拒绝形态（信封外的裸 `{"errorCode":1}`）现在是裁判、投射器、DSL、回放、HAR 都认的一等形态；② 修正了 fixture 06：已穿戴装备不能卖，原来写的是"卖出成功"。新增 06b（未穿戴装备，售价是合成的）；新增 M24–M28 五个变异体；自检增加到 23 步；击杀 130/131。见 `CHANGELOG-v2.3.md`。
> **v2.2.2（2026-10-23）**：根据 v2.2.1 审计的注记做了两处清理，功能不变：去掉 projector 里恒真的守卫；写明 MANIFEST 的校验位置。
> **校验与自检**：zip 根目录下有 `MANIFEST.sha256`、`bz-oracle/`、`r21/`。在 zip 根目录执行 `sha256sum -c MANIFEST.sha256`，必须在跑自检之前做，因为自检会重新生成 out/ 下的文件。然后执行 `cd bz-oracle && bash scripts/selftest.sh`，它会读取同级目录 `../r21/`。
> **v2.2.1（2026-10-23）**：按处置验收报告补 4 项：Windows 路径过闸、运行边界文档、sim-test 容错、attrch/eco persistent/derived 二分；自检增至 22 步；包内带 MANIFEST.sha256。nightly 的运行环境要求见 `forge/README.md`「运行边界」。
> **v2.2（2026-10-23）**：按中层审计 A0–A10 修订，堵住 6 条假 PASS 通道，自检增至 21 步。变异库从 18 个扩到 23 个，击杀 120/121；同一份变异库在 v2.1 上只击杀 100/121。详见 `CHANGELOG-v2.2.md`。

目标：Agent（或人）每改一处，裁判都给出 PASS/FAIL 和具体原因，不再靠在真机上点、不再靠"不崩"来判断对错。
边界：只在进程内运行、只读写 `hotfix/oracle/`。不改 APK，不联网，不伪造付费。

## 一键自检

```bash
M2=<M2-客户端读点索引.md> M1=<M1-动作全集表.tsv> bash scripts/selftest.sh
```

自检分四步：

1. 生成契约；
2. 11 个干净用例全部 PASS；
3. 18 种变异，击杀 87/88，唯一存活的那 1 个已登记在已知盲区表里；
4. 设备端探针在 node 模拟的客户端里端到端跑通：干净场景 PASS，"ivch 发增量"和"开关字段回 0"两种 bug 都能被抓到。

## 六层分别查什么

| 层 | 查什么 | 输入 | 能证明 | 不能证明 |
|---|---|---|---|---|
| L0 | MessageCenter 吞掉的监听器异常；`cc.error` / `console.error` / `__errorHandler`；未登记的提示文案 | 设备探针 | 客户端没在暗处出错 | 结果对不对 |
| L1 | 契约：`eRet`、信封（含 `code:200`）、必回字段、形状、开关字段不得为假值、外键存在；note 语义（键名、绝对值、`lv≠0`、eqch 形态、货币不进背包）；**投射完备**：存档变化必须体现在 note 里 | case + `contracts.json` + 442 表 | 应答符合客户端读法 | 原服的规则 |
| L2 | 双路径一致：增量路径快照 A、全量重建路径快照 B、存档推导值，三者必须相等 | 设备 dual 模式 | 存档与客户端显示一致 | 存档本身算得对不对 |
| L3 | 开关字段两侧（出现/不出现）是否都被用例覆盖 | 全部 case | 没漏测分支 | — |
| L4 | 与原服抓包逐字段对比（时间、id 类字段先归一） | `core/templates.json` | 与原服一致 | 没有样本的动作 |
| L5 | 付费货币不增、不出现负数、货币不进存档背包、付费动作不写存档、`rules.json` 守恒式、闭环不能刷 | case 的存档前后 | 经济不被破坏 | — |

**L2 的盲区由 L5 补，L1/L2 的盲区由 L4 补。** 存档本身算错时，两条路径会一致地错，L2 发现不了，这类错误由 L5 的守恒式拦截。是否与原服一致，只有 L4 能证明。

## 目录

```
host/build-contracts.js   M2 + M1 + 覆盖表 → out/contracts.json（每个动作：读哪些字段 / 开关 / 外键 / 是否闭合 / 来源行号）
host/judge.js             裁判入口；退出码 0 = PASS，1 = FAIL，2 = 输入错误
host/mutate.js            变异测试（18 种已知错误），检验裁判本身是否可靠
host/device-run.js        通过 adb 给设备探针下命令，并把 case 拉回本地
host/lib/layers.js        六层规则
device/oracle-probe.js    设备端探针（ES5）
device/sim-test.js        在 node 里模拟客户端，端到端测试探针
config/oracle.config.json         裁判配置（取值均注明出自哪份材料）
config/contract-overrides.json    M2 抽不到、但材料里有证据的契约补充
config/known-survivors.json       裁判已知的盲区（目前 1 条）
config/plan.example.json          设备 dual 计划示例
fixtures/                 自检用例、演示用表、模板、守恒式示例
```

## 接到你们仓库里（按顺序）

### 1. 生成契约

```bash
node host/build-contracts.js --m2 <M2.md> --m1 <M1.tsv> --overrides config/contract-overrides.json --out out/contracts.json
```

当前产出：

- 1028 个契约，其中 902 个映射到协议名；
- 已闭合 502 个，未闭合 526 个；
- `HttpConst3` 共 126 个，其中 34 个已闭合。M1 不含这一族，所以这 126 个没有协议名。

未闭合的契约，原因会写在 `openReasons` 里（命名处理器未展开，或内联但 0 读取）。S2 跨函数抽取落地后，换成新的 M2 重跑即可。

### 2. 填设备探针配置

在 `bz-bootstrap.js` 里、业务脚本加载之前加载探针，并在加载前设置 `window.BZ_ORACLE_CONFIG`。材料里没有给出以下符号名，需要你们填：

| 配置项 | 填什么 | 线索 |
|---|---|---|
| `resolve.MessageCenter` | 客户端 MessageCenter 实例 | `index.js:59325` 的 `f.MessageCenter` |
| `resolve.RoleBaseInfo` | 钱包所在模型 | `index.js:64700-64722` |
| `resolve.handlerEntry` | 我方分发函数 `(req) -> 应答体` | `bz-rpc-server.js` 的 `H` 分发入口 |
| `resolve.loadSave` | 我方读存档函数 | `loadSave()`（M3 §4） |
| `resolve.deliver` | 可选：bz-xhr 的投递函数 | 不填时，按 `index.js:59324-59332` 复刻投递逻辑 |
| `resolve.toast` | 提示框模块 | — |
| `snapshot.bag / skills / equips` | 从客户端模型读出纯数据 | `index.js:64675` 的 `setItem`、`119832` 的 `SkillTable`、`64689` 的 `equipmentDic` |

wallet 快照已按 M4 §3 写好（`coins / potentials / gold / yuanbao / chipNum`）。

探针启动后会写 `hotfix/oracle/status.json`，列出哪些符号解析成功、L0 用的是哪种挂法（`wrap-on` 表示后注册的监听器全部被包住；`+scan` 表示已注册的也扫到了）。

### 3. 先验证 L2 能不能打通（建议用"卖出物品"）

```bash
node host/device-run.js --plan config/plan.example.json --out cases/device
node host/judge.js --cases cases/device --tables tools/cfg/dump --templates core/templates.json
```

- 重建入口默认用 `sycnPlayerItemData`，只重建背包（全量 §八：客户端先清空，再按 itemObj 重建）。
- 用 `LoadGame` 重建全部域【推断】可能会触发切场景，所以默认注释掉了。要先单独验证。
- 计划里先 `backup`、最后 `restore`。restore 之后，需要重启进程或触发一次 LoadGame，客户端模型才会同步。

### 4. 被动录制（成本最低、覆盖最广）

`passive: true` 时，正常游玩中经过我方 handler 的每个动作都会自动落一个 case 到 `oracle/cases/live/`（包含异常、提示、存档前后、快照 A）。玩一轮，再整批交给 judge。

### 5. 接入现有验收

在 `acceptance.js` 里加一项：

```bash
node host/judge.js --cases <用例目录> ... --quiet
node host/mutate.js --cases fixtures/cases ... --allow-survivors config/known-survivors.json
```

以两者的退出码作为判定。

## case 格式（探针产出；也可以由 node 里的 handler 跑出来）

```json
{
  "id": "...", "action": "User.saleItem",
  "req": {"mod": "User", "do": "saleItem", "p": {}},
  "resp": {"eRet": 1, "note": {}},
  "envelope": {"error": 0, "p": "User.saleItem", "User.saleItem": {}},
  "transport": "game", "rawTransport": {"code": 200},
  "saveBefore": {}, "saveAfter": {},
  "snapA": {"bag": {}, "wallet": {}}, "snapB": {"bag": {}},
  "exceptions": [], "toasts": [],
  "template": "upgradeSkill_0036",
  "scenario": "buy-sell-2001", "seq": 1,
  "meta": {"fullReload": false, "abolish": false, "l4Allow": []}
}
```

除 `action`、`resp` 外，其余字段都可以缺省；缺哪个，对应的层就自动跳过并给出 INFO。

## 裁判自己的规矩

- **裁判也要考试。** 线上每发现一个新 bug，就在 `mutate.js` 里加一个变异；`known-survivors.json` 只许减少，不许增加。多出一个存活变异，或者已经被击杀的变异还留在表里，都判 FAIL。
- **报告带输入指纹**（契约、M2、配置、用例的 sha8）。同样的输入必须得出同样的结论。
- **不确定的规则只报 WARN，不报 FAIL。** 例如 `attrch` 出现未知键：M4 §7.1 说明那个 switch 没有读到结尾，所以只报 WARN。

## 已知限制（如实说明）

1. 设备端没有在真机上跑过。sim-test 只证明了逻辑正确；符号名要按上面第 2 步填写，并以 `status.json` 为准。
2. L3 目前统计的是"应答字段两侧覆盖"，不是客户端真实的分支命中。要做真实命中，需要对客户端脚本插桩。【推断】可以经热更搜索路径覆盖脚本实现，但未验证。
3. `payActionRe` 默认值是按 M1 里的动作名猜的，要换成仓库里真实的 `PAY_ACTION_RE`。
4. `fixtures/rules.json` 里的价格列含义（卖出用 `Price`、买入用 `BuyPrice`）是演示用的。真实守恒式要按 442 表的列含义写（对应路线 S7）。
5. 被动录制的异常时间窗里，可能混入其他并发动作的异常。判读时请看 `event` 字段。
