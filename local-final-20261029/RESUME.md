# RESUME.md —— 工程结构与交接入口（BaoZouyxt / 暴走英雄坛 离线本地补丁）

> 本文件是**给接手者**的入口文档，不是玩法说明。最后核对：2026-10-28。
> 项目根：`F:\BaoZouyxt`｜补丁工程：`F:\BaoZouyxt\hotfix-patch`｜上游包：`F:\BaoZouyxt\_incoming\`
> 当前线上指纹：`impl=hcce22f0f` / `flow=ffaec47c3` / selfCheck `1426` / 形状 371 动作 diff 0 / acceptance 57/57 / lint 38-36-0-2 / 拒绝码 136-153-238。

---

## 1. 这是什么

在客户端自己的可写目录放一个 **jsb 层本地补丁**，在**游戏进程内部**拦截并应答它自己的 RPC；
数值只改本机存档。**不分发 APK、不架服务器、不伪造任何付费**（边界原文见 `docs\HANDOVER-full-history-20261022.md:30-43`）。

## 2. 目录结构（只列用得上的）

```
F:\BaoZouyxt\
├─ hotfix-patch\                  ★ 补丁工程（唯一需要构建的东西）
│  ├─ core\
│  │  ├─ bz-rpc-core.js             RPC 仿真 + 本地存档 + 账本（纯 JS，可单测）
│  │  ├─ bz-rpc-server.js           ★业务：var H = { 各动作 handler }（约 499KB，手写，唯一权威）
│  │  ├─ bz-handler-impl.js         ★契约适配：handle()/selfCheck()/version
│  │  ├─ templates.json             信封模板
│  │  ├─ bz-cNN.generated.js        各批的表（由 tools\gen_cNN_tables.js 生成，勿手改）
│  │  ├─ bz-shops.generated.js      商店/价目表（tools\gen_shop_tables.js）
│  │  └─ bz-tasks.generated.js      任务奖励/需求表（tools\gen_task_rewards.js）
│  ├─ build-handlers.js            ★构建：core + 模板 + 契约 → patch\live\handlers.js
│  ├─ build.js                     旧构建（jsb-engine 探针版，历史保留）
│  ├─ patch\live\handlers.js       ★产物（1.6MB，**不许手改**，由 build-handlers.js 生成）
│  ├─ patch\live\flow.js           产物（流程/弹窗补丁）
│  ├─ run.ps1                      设备操作：status / handlers / cmd / probe
│  ├─ test\                        单测与冒烟（cNN-smoke.js、acceptance 收集的用例）
│  └─ node_modules\                aes-js / js-md5 / lz-string（不入包，装见下）
├─ tools\                        审计与事实表工具（不在设备上跑）
│  ├─ acceptance.js                验收总入口（57 项）
│  ├─ check_shape_freeze.js        形状冻结校验（--diff / --freeze）
│  ├─ check_reject_codes.js        拒绝码统计
│  ├─ lint_freebie.js              防白拿 lint（+ freebie_allow.json 白名单）
│  ├─ gen_shapes.js                重新生成形状（**改动作后必须先跑**）
│  ├─ gen_*\  tables.js            各批表生成器
│  ├─ facts\                       事实表（reject-codes.json 等，脚本维护）
│  ├─ golden\                      形状冻结基线 + planned 规则
│  └─ cfg\                         客户端配置表 dump（价格/任务/物品原始表）
├─ docs\
│  ├─ EXECUTION.md                 轮次记录（每轮做了什么、门禁数字、真机链）★先读
│  ├─ OPEN-ISSUES.md               挂账 ISSUE-7/8/9/10/11/12/13/14/15
│  ├─ 说明-支付系统疑虑回应-20261028.md  支付疑虑逐条回应（可直接转上游）
│  └─ HANDOVER-full-history-*.md   更早的完整历史
├─ batchNN-facts-YYYYMMDD\         各批取证（取证与策略文档在这里）
├─ _incoming\                      上游发来的包（含 relations.md 权威版：v2.7.1 那份）
├─ _outbox\                        我方交付包（每个 zip 一个目录，含 00-转发说明.txt）
├─ _backup\                        写前备份（时间戳目录，只增不删）
└─ HANDOVER-SESSION-*.md           逐场交接（最新一篇优先）
```

## 3. 三条命令就能动起来

```powershell
cd F:\BaoZouyxt\hotfix-patch
npm install                 # 只 3 个依赖；有 package-lock.json，npm ci 亦可
.\run.ps1 status            # pid / ready / 最近日志
.\run.ps1 cmd "ver"         # 期望 impl=hcce22f0f flow=ffaec47c3
```

改完代码的标准门禁（顺序不能换）：

```powershell
cd F:\BaoZouyxt
node tools\gen_shapes.js                      # 改过动作就必须先跑，否则 build 自检拦下
node hotfix-patch\build-handlers.js           # 期望 HANDLERS OK ver=… selfCheck=1426
node tools\check_shape_freeze.js --diff       # 期望 diff 总数 = 0（有差异先写 planned 规则）
node tools\check_reject_codes.js              # 期望 动作=136 条目=153 拒绝点=238
node tools\acceptance.js                      # 期望 ACCEPTANCE OK 项=57 绿=57 已知红=0
node tools\lint_freebie.js hotfix-patch\core\bz-rpc-server.js   # 期望 38/36/0（白名单 2）
cd hotfix-patch; .\run.ps1 handlers           # 推产物热载，pid 必须不变
```

## 4. 三条铁律

1. `patch\live\handlers.js` 是**产物**，只由 `build-handlers.js` 生成，手改会在下次构建被覆盖。
2. 改动作后**先 `gen_shapes.js` 再 `build-handlers.js`**；形状/拒绝码/白名单三处要同步登记。
3. 任何"写"操作前先备份到 `_backup\<时间戳>-<原因>\`（对既有文件的编辑、设备存档尤其）。

## 5. 当前状态与下一步

- 已落地：C01–C15、C19（A 轮第 1 批）。
- 当前批：A 轮第 2 批 = **relations v2.7.1 第22批 C22〔万圣宝藏楼层〕**（4 主键 + 2 必做 + 2 顺手）。
- 待做 11 批清单与真实付费标注：`_outbox\muse-needs-20261027\docs\03-待做批次清单.md`。
- **批号口径**：一律以 `_incoming\v2.7.1-20261026\work\bz-oracle\out\relations.md` 为准；
  旧版 relations（`audit-v23\...\relations.md`）与提速方案用的是另一套编号，两者差 0–2 批。
  对照表见 `_outbox\muse-needs-20261027\docs\05-批号冲突裁决.md`。

## 6. 参考资料优先级

1. `docs\EXECUTION.md`（最近做的、门禁数字、踩过的坑）
2. `HANDOVER-SESSION-2026-10-28.md`（最新一张全景交接）
3. `docs\OPEN-ISSUES.md`（哪些键锁着、为什么锁）
4. `_incoming\下游包-提速方案-解包\`（默认拍板 12 条 + 轮次分组，每批必读）
