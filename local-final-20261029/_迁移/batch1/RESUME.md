# RESUME.md —— BaoZouyxt 离线热修补丁工程（云端恢复开工指南）

> 本工程 = 某手游的**离线热修补丁**（不是客户端源码本身）：补丁核心在 `hotfix-patch/core/`，
> 工具流水线在 `tools/`，客户端反编译 bundle 在 batch2（`tools/index.js` 除外，见下）。
> 云上解压后目录结构应与本包一致；按本文命令自检，指纹对不上 = 环境或文件有缺失，先别开工。

## 0. 环境
- Windows + PowerShell 5.1+、Node.js 18+（实测 v24 可用）。
- **不需要** npm install 即可跑验收（`hotfix-patch/node_modules` 已随包）。
- 仅当使用 `tools/ccreverse`（反编译工具链，batch2）时才需要在该目录 npm install。

## 1. 目录速览（batch1）
```
hotfix-patch\core\        补丁核心（bz-rpc-server.js + generated 表 + templates.json + bz-handler-impl.js）
hotfix-patch\test\        全部测试（c02..c19-smoke 等 50+）
hotfix-patch\patch\       产物目录（live/handlers.js 由 build 生成）
hotfix-patch\hook\        设备端 hook 辅助
tools\                    流水线脚本（gen_*/check_*/acceptance/lint_freebie）+ cfg 配置表 dump + facts + golden
tools\index.js            ★服务端主 bundle（check_reject_codes 用 ev 行号取原文，必须随 batch1）
docs\                     EXECUTION/OPEN-ISSUES/交接/计划等
batch*-facts-*\           各批次取证/执行/工人报告
_incoming\                上游下发包与下游回执包（历史）
_backup\                  历史备份（按时间戳）
runtime-save\             当前真机存档 bz_offline_save.json（含最新 C19 状态）+ pre-maint 备份
root-notes\               根级交接/说明 md（从工程根拷来）
```
batch2 = `client-analysis/`（反编译 bundle）+ `tools/scripts2.js`、`scripts3.js`、`main.js`、`libcocos2djs.so`、`ccreverse/` + 旧审计目录 + `hotfix-patch/probe/`。
batch3 = 其余（`audit-v221` 旧材料、`_outbox`、`$out`、`_卡面`、`gateway`、`shop-batch1`、`v271-facts`）。

## 2. 开工自检（batch1 到位即可跑；指纹必须一致）
```powershell
# ① 验收全量（57 项）
node tools\acceptance.js
#   期望末行：ACCEPTANCE OK 项=57 绿=57 已知红=0 cap=0

# ② 防白拿 lint（新门禁）
node tools\lint_freebie.js hotfix-patch\core\bz-rpc-server.js
#   期望：lint_freebie: 发放型 handler 38 个，OK 36，待查 0（白名单 2）  退出码 0
#   WARN 1 条：rewardUFO 用 p.signCode（防作弊签名，不是档位/身份/胜负）

# ③ 形状冻结
node tools\check_shape_freeze.js --diff
#   期望：diff 总数 = 0

# ④ 拒绝码
node tools\check_reject_codes.js
#   期望：REJECT-CODES OK 动作=136 条目=153 拒绝点=238 处 flow=1 条

# ⑤ 重建产物（改 core 后必跑）
node hotfix-patch\build-handlers.js
#   期望：HANDLERS OK  ver=hcce22f0f  selfCheck=1426  bytes=1639277
#   产物：hotfix-patch\patch\live\handlers.js
```
**指纹汇总**：ver=hcce22f0f / selfCheck=1426 / 形状动作=371 / acceptance 57/57 / lint 38-36-0 / reject 136-153-238。

## 3. 开工约定（重要）
- 只改 `hotfix-patch/core/`，`patch/live/handlers.js` 是 build 产物，禁止手改。
- 新动作必须登记 `tools/todo_shapes.json`，否则 gen_shapes 不扫。
- 生成表改动后：`node tools\gen_cN_tables.js` → `node tools\check_shape_freeze.js --diff` → 写 planned 规则 → `--freeze` → build → acceptance。
- 新批次流程：取证（只读）→ 用户拍板（或按《默认拍板》12 条）→ 实现 → 门禁 → 真机 → 回执。
- 上游提速方案：剩余 61 批合 5 轮（A–E）+ F（370 孤立动作）；每轮一份回执；详见 `docs/EXECUTION.md` 轮 28 追加。
- 危险命令红线：不得执行 pm clear 及变体、rm -rf、factory reset、清缓存类。

## 4. 设备侧（可选）
`hotfix-patch/run.ps1` 提供 `status/cmd/probe/handlers/restart`；需要 adb 连接模拟器（默认 127.0.0.1:16416）。
云端无设备时跳过，仅跑验收/构建即可。

## 5. 缺失说明（相对上游清单）
- 根级 `rw.final`、`package.json`（工程根）在本工程中**不存在**（历史上未生成）。
  `hotfix-patch/package.json` + `package-lock.json` 已随包；分析产物以 `tools/shapes.json`、`tools/facts/`、`tools/golden/` 为准。
- `relations.md` 原件在 `_incoming/v2.7.1-20261026/work/bz-oracle/out/relations.md`（已随 batch1）。
