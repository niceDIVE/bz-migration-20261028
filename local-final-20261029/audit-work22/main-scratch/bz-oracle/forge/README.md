# bz-forge：提效工具箱（v2.2，2026-10-23，已按中层审计修订）

和裁判（bz-oracle）放在同一个包里，自检命令也是同一条：`bash scripts/selftest.sh`，共 21 步，其中第 5–17 步测本工具箱，第 18–21 步是中层审计（2026-10-23）发现的假 PASS 通道的回归测试。改了什么见根目录 `CHANGELOG-v2.2.md`。依赖已放在 `forge/node_modules`，离线可用；如需重装，在 `forge/` 下运行 `npm install`。
边界与裁判相同：只在本地或进程内运行；不改 APK、不联网、不伪造付费。

## 工具一览

| # | 工具 | 入口 | 一次做好之后省下什么 | 自检里证明了什么 |
|---|---|---|---|---|
| 1 | 账本投射器 | `lib/projector.js` | handler 只改存档，note 自动生成。发增量、键名写错、漏发、货币进背包、lv=0 这几类错误从此写不出来 | 8 个用例的 note 全部能由存档差分推出，逐字一致 |
| 2 | 规则 DSL | `lib/rules-dsl.js` | 买卖/兑换/消耗类动作写一条声明，同时得到 handler 和 L5 守恒式 | 编译结果与用例 02 逐字一致；失败分支不改存档 |
| 3 | 动作注册表 + 仪表盘 + 材料计数 | `tools/registry.js` | 所有计数只有这一个来源，每个数字都附复算命令；待办按真实触发次数排序 | 1125 条全部分类 |
| 4 | 兜底应答表 | `lib/stub.js`、`tools/gen-stubs.js` | 未实现的动作不再卡死界面；命中次数直接作为优先级 | 648 条 STUB；有必回字段的动作被标为不可兜底，运行时以 `stub-unsafe` 标出；真值读字段（`if (o.x)`）不填空容器（v2.2 起，真实契约里 137 个这样的字段） |
| 5 | 离线回放台 | `replay/replay.js`、`replay/server.js` | 录下的真实请求在 node 里重跑，交给裁判判定，并与录制时的应答做回归比对，不用碰真机 | 11 个请求 1–2 ms 跑完；不能兜底的 LoadGame 被拦下 |
| 6 | 边界模糊测试 | `replay/fuzz.js` | 没有录制样本也能抓刷钱、负数、接受非法参数这类漏洞 | 干净实现 PASS；漏洞版在 num=0/-1 被抓到 |
| 7 | 命名处理器展开器（S2） | `tools/expand-handlers.js` | 自动把未闭合的契约展开到函数体（跟进 ≤3 跳、识别开关字段），产出 overrides 文件。v2.2 起正则回退引擎只补字段、永不判闭合 | 合成客户端上跟进 2 跳，5 个字段全部抽出 |
| 8 | 请求参数抽取器 | `tools/extract-req-params.js` | 抽出客户端每个动作发送的 `p` 字段，这是生成 handler 的另一半输入 | 字面量与"一跳变量"两种写法都能抽到；v2.2 起别名常量（`var H = a.HttpConst; H.X`）按 M1 认领，动态键发送点单列在 `__unresolved` 里 |
| 9 | 效果族分类器（S6） | `tools/effect-classifier.js` | 自动判断 Effect 族属于 GEN 还是 CAPTURE，不用再一族一族人工去查 | Effect 13 → CAPTURE-SUSPECT |
| 10 | 夜间生成循环 | `agent/nightly.js` | 机器跑"生成 → 回放裁判 → 带裁判意见重试 → 仍失败转人工"，人只看剩下的部分 | 演示生成器第 1 轮犯老错，第 2 轮按裁判意见改对。v2.2 起默认开启：静态闸、严格加载（WeakSet 校验）、存档域白名单、输入冻结、fuzz 闸、回归判死、generated 必须接管全部用例 |
| 11 | 上下文包 + LLM 包装 | `agent/prompt-pack.js`、`agent/llm-gen.sh` | 每个动作需要的事实（契约、行号、参数、铁律、裁判意见）自动拼成一份提示 | — |
| 12 | 吞吐统计 | `tools/throughput.js` | 一次通过率、平均尝试次数、每小时产出、剩余人工量都由实测得出，替代 c 单位估算 | — |
| 13 | 存档体检 | `tools/save-lint.js` | 按 M3/M4 的不变式检查存档，坏档几毫秒内定位 | 构造的坏档里 4 处错误全部抓到 |
| 15 | AST 展开器（v2.1，默认引擎） | `lib/ast-expand.js`（acorn） | 能处理作用域遮蔽、别名链、子字段别名、for-in、`in` 运算符、计算属性、数组下标。原码与 terser 压缩改名后的产物，抽取结果一致 | 刁钻样例加上审计给出的 6 个反例（顶层 for-in、撞内置名、变量键 hasOwnProperty / in、共享处理器、真值读），在原码和压缩产物上都全对。**仅在合成样例上验证过**，真包闭合率未测 |
| 16 | 状态机模型测试 | `replay/model-test.js`（fast-check）、`lib/client-model.js` | 随机生成动作序列，每一步都做**离线 L2**（按 M4 语义把 note 应用到客户端模型，结果必须等于存档）+ L1/L5 + 存档体检；发现问题后自动缩成最短复现步骤 | 300 条序列 PASS；"ivch 发增量"的老错被缩到 1 步复现。v2.2 起模型覆盖不了的语义（eco.exp、attrch 中除 hunger 外的键、gemch、投射外存档域）报 UNMODELED，不能判 PASS。**离线 L2 只是必要条件，不能替代真机 L2** |
| 17 | HAR 抓包转用例/模板 | `tools/har2cases.js` | mitmproxy、Charles 和浏览器导出的 HAR 直接转成 case 和 L4 模板。原服还能连时，这就是 CAPTURE 内容的取证通道 | 在自产 demo.har 上能容错三种形态：JSON、表单、base64（v2.2 起请求体的 base64 也能识别）。真实线格式材料未提供 |
| 18 | 生成代码静态闸 | `lib/gen-gate.js` | LLM 产出的 handler 在 require 之前先过 AST 静态检查（G1–G5） | 7 个逃逸样本全部拒绝 |
| 19 | 客户端模型单点断言 | `tools/test-client-model.js` | 每条断言对应 M4 的一行语义，M4 改了测试就会失败 | 12 条 |
| 14 | 构建指纹 + 一键闭环（S0） | `tools/fingerprint.js`、`scripts/loop.sh` | 一条命令走完 构建 → 指纹 → 离线裁判 → 推送 → 核对设备版本；版本对不上就拒绝继续测 | 设备版本不一致时被拦下；v2.2 起推送前先复核待推文件与已裁判版本一致 |

## 首次接入（按顺序，前 4 步不用碰设备）

```bash
# 1) 展开未闭合契约（需要客户端三包），再重建契约。人工 overrides 放在后面，优先级更高
node forge/tools/expand-handlers.js --contracts out/contracts.json --root <客户端根目录> --out out/expanded-overrides.json
node host/build-contracts.js --m2 M2.md --m1 M1.tsv --overrides out/expanded-overrides.json,config/contract-overrides.json --out out/contracts.json

# 2) 抽请求参数
node forge/tools/extract-req-params.js --src <根>/tools/index.js,<根>/tools/scripts2.js,<根>/tools/scripts3.js --m1 M1.tsv --out out/req-params.json

# 3) 给效果族分类（需要 442 张表导出成 json，放在同一个目录）
node forge/tools/effect-classifier.js --tables <表目录> --source item --out out/effects.json

# 4) 注册表 + 兜底表
node forge/tools/registry.js --m1 M1.tsv --contracts out/contracts.json --implemented <仓库>/hotfix-patch/core/bz-rpc-server.js --capture config/capture.json --out out/registry.json --md out/dashboard.md --material out/material-counts.md
node forge/tools/gen-stubs.js --m1 M1.tsv --contracts out/contracts.json --implemented <同上> --out out/stubs.json

# 5) 接回放台：把 replay/adapters/bz-rpc-server.template.js 里的 TODO 按仓库实际填好，然后
node forge/replay/replay.js --recordings <设备录下的 case 目录> --adapter forge/replay/adapters/bz-rpc-server.template.js --server <仓库>/hotfix-patch/core/bz-rpc-server.js

# 6) 夜间循环（设置 LLM_CMD；先用 --limit 10 跑一轮，拿到真实吞吐）
LLM_CMD="<你的 LLM CLI>" REQ_PARAMS=out/req-params.json RECORDINGS=<case目录> \
node forge/agent/nightly.js --registry out/registry.json --recordings <case目录> --gen "bash forge/agent/llm-gen.sh {action} {out} {feedback} {attempt}" --limit 10
node forge/tools/throughput.js --log out/nightly.jsonl --remaining <GEN-READY 数>
```

## 注册表实算（M1 ed2a4eee，契约未展开前）

1125 条 HttpConst 按下表分类。"范围内"的 699 条才是要做的量：PUSH、DEAD、ALT、OUT 共 426 条从一开始就不用写 handler。

| 状态 | 数量 | 含义 |
|---|---:|---|
| DONE | 6 | 已实现，且有用例全 PASS |
| IMPL-UNJUDGED | 74 | 已实现，还没有用例 |
| GEN-READY | 317 | 契约已闭合，可直接交给生成器 |
| NEEDS-S2 | 282 | 契约未闭合，先跑展开器 |
| NO-CONTRACT | 20 | 客户端会发，但没有读点契约 |
| OUT | 29 | 付费 |
| ALT | 16 | 弹幕/排行榜等另一通道 |
| PUSH | 192 | 服务端推送，不需要请求 handler |
| DEAD | 189 | 客户端既不发也不读 |

## 社区调研：可直接借用的轮子（2026-10-22 检索）

| 项目 | 用途 | 怎么接进来 | 实测情况 |
|---|---|---|---|
| wakaru（github.com/pionxzh/wakaru，npm `@wakaru/cli`） | JS 反编译与拆包。npm 页面写明支持 "Browserify (including Cocos Creator 2.x)" | 先用 `npx @wakaru/cli index.js --unpack -o out/` 把三包拆成模块，再交给 AST 展开器；行号会变，契约要用拆包后的产物重建 | 【未实测】手上没有真实三包 |
| webcrack（github.com/j4k0xb/webcrack） | 反混淆、unminify、拆 webpack/browserify 包，并提供插件 API | 三包若带 obfuscator.io 式混淆，先过一遍 webcrack | npm 可装（2.16.0）；【未实测】 |
| jstangle（github.com/vigolium/jstangle） | 从打包产物里挖 API 请求形状 | 可与 `extract-req-params.js` 交叉核对 | 【未实测】 |
| fast-check（fast-check.dev） | 属性测试和模型测试，失败后自动缩小反例 | 已接入，即第 16 项 | 已实测 |
| acorn | JS 解析器 | 已接入，即第 15 项 | 已实测 |
| Polly.JS（github.com/Netflix/pollyjs） | HTTP 录制、回放、打桩 | 若要在浏览器版里录制，可替代自写的 XHR 钩子 | 未接入 |
| mitmproxy、HTTP Toolkit 等代理 | 抓包，可导出 HAR | 导出的 HAR 交给第 17 项 | — |
| RevivalSide（github.com/MadlyMoe/RevivalSide） | 另一款游戏的本地复活服务端，结构为"监听器 + packet-handlers + 抓包工具 + 从客户端加载数据表" | 架构可参照，代码不能复用（引擎和协议都不同） | — |

没找到针对这款游戏的现成私服或协议库。所以契约和规则仍然得从客户端里抽，社区能借的是通用工具。

## 已知局限（照实写）

- 展开器默认走 AST；正则版只作为解析失败时的兜底，v2.2 起它永不判闭合。参数抽取器目前仍是正则加括号配对的容错扫描，不是完整解析器，抽不出来的发送点列在 `__unresolved` 里。遇到压缩产物里的特殊写法（`arguments`、整体外泄、深度超限）时，该契约保持未闭合，并在 `_open` 里写明原因，不会误判为闭合。
- 效果族分类器的命中率只能说明值域重合，不能证明语义。PARAM-ONLY 和 FK-RESOLVED 仍需读客户端的使用点确认【推断】。
- 回放台接真实 `bz-rpc-server.js` 的适配器只是模板：材料没有给出它的导出方式和 env 接口。
- 兜底的 heuristic 策略按字段名猜类型【推断】，默认用 minimal。兜底动作在报告里一律计为 STUB，不算"已还原"。
- 夜间循环只处理有录制样本的动作；没有样本的动作先用 `fuzz.js` 跑通，再靠被动录制补上样本。
- 吞吐外推的前提是样本与剩余动作同分布。样本少于 30 个时，不要据此定周期。
