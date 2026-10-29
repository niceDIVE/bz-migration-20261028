# MANIFEST —— 迁移包总表（根目录）

> 云盘 100G，按批上传。单包 ≤2GB，本工程共 **3 批**，无分卷。
> 每批解压后按 RESUME.md 自检；第 1 批跑通即先报上游。

| 批次 | 包名 | 内容 | 大小 | 上传 |
|---|---|---|---|---|
| 1 | `bz-迁移-第1批-能开工.zip` | RESUME.md、MANIFEST.md、hotfix-patch（core/test/patch/hook/脚本/package）、tools（cfg 全部配置表 / facts / golden / index.js+scripts2/3+main 三包 / 流水线脚本）、docs、batch*-facts、_incoming、_backup 全部、runtime-save（当前真机存档）、root-notes | 48.6 MB | [ ] 未传 |
| 2 | `bz-迁移-第2批-取证用.zip` | client-analysis（反编译 bundle）、tools/libcocos2djs.so、tools/ccreverse、旧审计目录（audit-v22/v23、audit-work22、midaudit-v21）、hotfix-patch/probe | 109.4 MB | [ ] 未传 |
| 3 | `bz-迁移-第3批-其余.zip` | audit-v221（旧审计大目录）、_outbox、$out、_卡面、gateway、shop-batch1、v271-facts | 788.9 MB | [ ] 未传 |

## 批间约束
- **无重复文件**：`tools/index.js` + `scripts2/3/main.js` 三包**只在第 1 批**（check_reject_codes / check_shape_freeze 需要取 ev 行原文与证据行）；其余第 2/3 批不重复提供。
- 目录结构原样拼回：三批解压到同一根目录即得到完整工程。
- 第 1 批自包含验收：acceptance / lint / shape / reject 四项无需第 2、3 批。

## 第 1 批验证记录
- [x] 本地解包等效验证：`node tools\acceptance.js` → `ACCEPTANCE OK 项=57 绿=57 已知红=0 cap=0`
- [x] `node tools\lint_freebie.js hotfix-patch\core\bz-rpc-server.js` → `发放型 handler 38 个，OK 36，待查 0（白名单 2）`
- [x] 指纹核对：ver=hcce22f0f / selfCheck=1426 / 形状 371 / reject 136-153-238 / diff 0
- [ ] 第 2 批到位后：`node tools\check_shape_freeze.js --diff` 期望 0（批量 bundle 已在第 1 批，此步可提前做）
