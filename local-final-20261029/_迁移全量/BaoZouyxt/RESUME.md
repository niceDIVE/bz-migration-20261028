# RESUME.md —— BaoZouyxt 离线热修补丁工程（云端恢复开工指南）

> 本工程 = 某手游的**离线热修补丁**（不是客户端源码本身）：补丁核心在 `hotfix-patch/core/`，
> 工具流水线在 `tools/`，客户端反编译 bundle 在 `tools/index.js`、`scripts2.js`、`scripts3.js`、`main.js` 与 `client-analysis/`。
> 解压后目录结构应与本包一致；按本文命令自检，指纹对不上 = 环境或文件缺失，先别开工。

## 0. 环境与依赖
- Windows + PowerShell 5.1+、Node.js 18+（实测 v24 可用）。
- **node_modules 未随包**（按上游指令）。开工前先装依赖：
  ```powershell
  cd hotfix-patch
  npm install        # package.json + package-lock.json 已随包；实测仅需 lz-string 等 4 个包
  cd ..
  ```
  不装的话 `test/l0-envelope.js`、`selfcheck-model-push.js`、`selfcheck-nosave.js` 三项会因缺 `lz-string` 失败（其余 54 项不依赖）。
- `tools/ccreverse`（反编译工具链）如需使用，另行 `cd tools/ccreverse; npm install`。

## 1. 目录速览
```
hotfix-patch\core\        补丁核心（bz-rpc-server.js + generated 表 + templates.json + bz-handler-impl.js）
hotfix-patch\test\        全部测试（c02..c19-smoke 等 50+）
hotfix-patch\patch\       产物目录（live/handlers.js 由 build 生成）
hotfix-patch\live\        live 层（flow.js 等，token 已脱敏为 <REDACTED-TOKEN>）
tools\                    流水线（gen_*/check_*/acceptance/lint_freebie）+ cfg 全部配置表 + facts + golden
tools\index.js 等四包    客户端 bundle（证据行/形状审计用）
client-analysis\          反编译产物（bundles/jsc 等）
docs\                     EXECUTION / OPEN-ISSUES / 交接 / 计划
batch*-facts-*\           各批次取证/执行/工人报告
_incoming\                上游下发包与下游回执
_backup\                  历史备份（按时间戳；里面的 flow.js 副本 token 同样已脱敏）
runtime-save\             当前真机存档 bz_offline_save.json + pre-maint 备份
```

## 2. 开工自检（装完依赖后跑；指纹必须一致）
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
```
**指纹汇总**：ver=hcce22f0f / selfCheck=1426 / 形状动作=371 / acceptance 57/57 / lint 38-36-0 / reject 136-153-238。

## 3. 开工约定（重要）
- 只改 `hotfix-patch/core/`；`patch/live/handlers.js` 是 build 产物，禁止手改。
- 新动作必须登记 `tools/todo_shapes.json`；改生成表后：gen → `check_shape_freeze --diff` → planned 规则 → `--freeze` → build → acceptance。
- 新批次流程：取证（只读）→ 用户拍板 /《默认拍板》12 条 → 实现 → 门禁 → 真机 → 回执。
- 上游提速方案：剩余 61 批合 5 轮（A–E）+ F（370 孤立动作）；每轮一份回执（见 `docs/EXECUTION.md` 轮 28 追加）。
- 危险命令红线：不得执行 pm clear 及变体、rm -rf、factory reset、清缓存类。

## 4. 设备侧（可选）
`hotfix-patch/run.ps1`：status / cmd / probe / handlers / restart；需要 adb（默认 127.0.0.1:16416）。云端无设备时跳过。

## 5. 脱敏与缺失说明
- 原 `LoginMgr.token` 登录串（azVwcmM…）已从包内 15 个文件（flow.js 及其备份副本、force_login.js）替换为 `<REDACTED-TOKEN>`。
  离线运行不依赖该 token 的具体值（客户端只做"已登录"判定），若上游需要原值请单独索取。
- 根级 `rw.final`、工程根 `package.json` 在本工程中不存在（历史未生成）；`hotfix-patch/package.json` + lock 已随包；分析产物以 `tools/shapes.json`、`tools/facts/`、`tools/golden/` 为准。
- `relations.md` 原件在 `_incoming/v2.7.1-20261026/work/bz-oracle/out/relations.md`。
