# 接收方指令（BaoZouyxt 离线热修补丁工程 · 自行搭建环境并接手）

你收到的是一个**离线热修补丁工程**的全量迁移包（不是客户端源码本身）。按下面顺序做，自检指纹一致后再开工。

## 一、收到的文件
- `bz-迁移包.7z.001`（1 卷，879,885,143 B，SHA256 `E3882B2FC8FCB62712FD2086871CA484350114E4D71E629C6C9CA74230A3DE6A`）
- `MANIFEST.md`（目录清单/自检记录）
- `SHA256SUMS.txt`（哈希台账）

## 二、解包
```powershell
7z x bz-迁移包.7z.001        # 得到 BaoZouyxt\
cd BaoZouyxt
```

## 三、环境
- Windows + PowerShell、Node.js 18+（实测 v24）。
- **node_modules 未随包**：`cd hotfix-patch; npm install`（3 个依赖，约 8 秒），回根目录。
- 若要用 `tools/ccreverse`（反编译链），另行 `cd tools/ccreverse; npm install`。

## 四、自检（必须与指纹一致；不一致就停下排查，别开工）
```powershell
node tools\acceptance.js                                        # ACCEPTANCE OK 项=57 绿=57
node tools\lint_freebie.js hotfix-patch\core\bz-rpc-server.js   # 发放型 38、OK 36、待查 0
node tools\check_shape_freeze.js --diff                         # diff 总数 = 0
node tools\check_reject_codes.js                                # 136/153/238
node hotfix-patch\build-handlers.js                             # ver=hcce22f0f / selfCheck=1426
```

## 五、读知识（按这个顺序，别跳）
1. `RESUME.md` —— 工程结构、命令、约定（本文件的超集）
2. `docs/EXECUTION.md` —— 最新轮次（轮 27/28/29）与**上游提速方案**（5 轮 A–E + F；默认拍板 12 条）
3. `docs/OPEN-ISSUES.md` —— 挂账清单（ISSUE-8/10/11/12/13/14/15）
4. `batch19-facts-20261027/C19-取证与策略.md` —— 当前批（A 轮第 1 批）取证与口径
5. `HANDOVER-SESSION-2026-10-27-G.md` —— 场次交接总纲（历史）
6. `_incoming/` —— 上游下发包与下游回执（含验收意见原文）
7. `tools/facts/` + `tools/golden/` —— 契约事实、拒绝码表、形状冻结基线

## 六、工作约定
- 只改 `hotfix-patch/core/`；`hotfix-patch/patch/live/handlers.js` 是 `node build-handlers.js` 的**产物，禁止手改**。
- 新动作必须登记 `tools/todo_shapes.json`，否则 gen_shapes 不扫。
- 改生成表/形状的流程：`node tools\gen_*_tables.js` → `check_shape_freeze --diff` → 写 `planned-changes.json` 规则 → `--freeze` → build → acceptance。
- 符合《默认拍板》12 条的口径**直接执行**（回执列一句用了哪条）；只有四种情况停下来问：
  存档写坏 / 能白拿钱或道具 / lint 过不了且不是误报 / 超出默认拍板的新口径。
- 红线：不得执行 `pm clear` 及变体、`rm -rf`、factory reset、清缓存类命令。
- 回执格式（每轮一份）：ver/selfCheck/形状动作数/acceptance/lint 全文 → 每批一行（做了/跳过/锁住/用了第几条/自定数值）→ 核账（买卖兑换类）→ 白名单新增与 WARN 逐条一句 → 存档变动申报。

## 七、当前进度
- 已完成：第 1–16 批（C01–C15），A 轮第 1 批（C19 技能皮肤商店）已落地并真机验证。
- 进行中：A 轮剩 11 批（HLEX 兑换 / 时装背包商店 / 秘籍礼包 / 春节常驻礼包 / 道具选奖 / 骰子地块 / 春节兑换 / 消费返利 / 房屋塔商店 / GFUI 礼包 / 肉鸽商店），做完 A 轮统一交一份回执。
- 线上 impl=`hcce22f0f`，selfCheck=1426，形状 371 动作，reject 136/153/238。
