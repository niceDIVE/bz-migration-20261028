# v2.2.1（2026-10-23）：按《处置验收报告》修订

| 验收条目 | 修改 | 守护 |
|---|---|---|
| §五.1 Windows 路径下 G1 误拒（新缺陷） | `gen-gate.js` 先把 require 目标里的 `\` 统一成 `/`，再比对白名单 | 第 22 步：Windows 混合分隔符的合法 require 能过闸，非法目标仍被拒 |
| §五.2 A6#1 文档未兑现 | `forge/README.md` 新增「运行边界」一节：隔离账号/容器、只读输入、断网、禁止 `--loose`，并列出三类残余风险；根 README 加了指引 | — |
| §五.3 sim-test 在禁止管道的环境下崩溃 | `catch` 里 `txt = e.stdout \|\| ''`，派生子进程失败时写明原因 | — |
| §四.3 子字段 for-in 的条件 | AST 展开器给字段标 `anyKeys`（覆盖 `for (k in o.x)` 写法）；prompt-pack 提示"字典：任意子键都会被消费，必须完整回出" | 第 15 步新增反例 CX7_SUBFORIN（原码和压缩代码各测一遍） |
| §六 P0.4 裁决 | `config.attrch.persistent = {hunger, school}`、`config.attrch.derived`（10 键）、`config.eco.derived = [exp]`。投射器和客户端模型都改从 config 读取 persistent（单一来源）。L1 对 persistent 新增 `ATTRCH_ABS` 和 `NOTE_MISSING_ATTRCH`，对 derived 只查形状 | 第 22 步分别断言裁决里的三条 |
| 附录 A：缺 MANIFEST | 包内附 `MANIFEST.sha256`（不含 node_modules），可用 `sha256sum -c` 校验 | — |

按裁决的判据：上述三条都已有自检断言，**可以开始生成含 attrch/eco.exp 的动作**；在真机 L2 通过之前，S4 不闭合。如果真实 bz-rpc-server.js 证实某个 derived 键其实有存档字段，就把它移进 persistent，并补上 M3。

注意：joinSchool 这类动作改了 `school` 存档字段后，投射器现在会发出 `note.attrch.school`（M4:109 已证 school → entity.school + RoleBaseInfo.school）。原来服务端 L1296 发的是空表，这是有意为之的行为变化。
