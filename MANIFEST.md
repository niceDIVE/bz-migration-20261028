# MANIFEST —— bz-迁移包（全量分卷）

- 压缩格式：7z（LZMA2），**分卷 2GB/卷**；本工程压缩后 840 MiB → **共 1 卷，无分卷**。
- 文件清单：`bz-迁移包.7z.001`（879,885,143 B = 839.1 MiB）
- 解包后顶层目录：`BaoZouyxt/`（项目根）。压缩前体积 1,595,536,659 B（约 1.49 GiB）/ 6,463 条目。
- node_modules **未随包**（按上游指令）；解包后先 `cd hotfix-patch && npm install`（3 个依赖，实测 8s），再按 RESUME.md 跑 acceptance/lint。

## 上传状态（传完后勾选）
- [ ] 已上传 `bz-迁移包.7z.001`（+ `MANIFEST.md`、`SHA256SUMS.txt`）到云盘同一文件夹
- [ ] 云盘显示字节数 = 879,885,143
- [ ] SHA256 复核 = E3882B2F…30A3DE6A（云盘无哈希则跳过）
- [ ] 云上解包成功（`7z x bz-迁移包.7z.001`）
- [ ] 云上自检：`acceptance` = 57/57、`lint_freebie` = 38 个 / OK 36 / 待查 0
- [ ] 已回报上游/用户

> 操作细节见同目录 `上传操作卡.md`。


## 顶层目录清单（解压后大小）
| 目录/文件 | 大小 |
|---|---|
| audit-v221/ | 1047.3 MB |
| tools/ | 164.2 MB |
| _backup/ | 79.8 MB |
| hotfix-patch/ | 45.3 MB |
| client-analysis/ | 39.2 MB |
| _卡面/ | 35.8 MB |
| _incoming/ | 29.4 MB |
| _outbox/ | 27.5 MB |
| $out/ | 19.2 MB |
| audit-v23/ | 11.5 MB |
| docs/ | 6.9 MB |
| midaudit-v21/ | 5.8 MB |
| audit-work22/ | 3.0 MB |
| audit-v22/ | 2.9 MB |
| batch*-facts-*/ | 约 1.9 MB（10 个批次目录） |
| shop-batch1/ | 0.7 MB |
| gateway/ | 0.3 MB |
| runtime-save/ | 11 KB（当前真机存档 + pre-maint） |
| 根级 md/zip/notes | 约 0.3 MB（含 RESUME.md、交接文档、SOTA zip） |
| **合计** | **约 1,521.6 MB 解压前 / 1,595.5 MB 解包后** |

## 自检记录（打包前空目录验证）
- 解包 → `cd hotfix-patch && npm install`（3 包）→ 回根：
  - `node tools\acceptance.js` → **ACCEPTANCE OK 项=57 绿=57 已知红=0 cap=0** ✅
  - `node tools\lint_freebie.js hotfix-patch\core\bz-rpc-server.js` → **发放型 handler 38 个，OK 36，待查 0（白名单 2）** ✅
  - `node tools\check_shape_freeze.js --diff` → **diff 总数 = 0** ✅
  - `node tools\check_reject_codes.js` → **动作=136 条目=153 拒绝点=238** ✅
  - `node hotfix-patch\build-handlers.js` → **ver=hcce22f0f / selfCheck=1426** ✅

## 脱敏
- 原 `LoginMgr.token`（azVwcmM…）已从包内 15 个文件（flow.js、force_login.js 及其备份副本）替换为 `<REDACTED-TOKEN>`；离线运行不依赖其具体值。

## 卷清单
| 卷 | 大小 | SHA256 |
|---|---|---|
| bz-迁移包.7z.001 | 879,885,143 B | E3882B2FC8FCB62712FD2086871CA484350114E4D71E629C6C9CA74230A3DE6A |
