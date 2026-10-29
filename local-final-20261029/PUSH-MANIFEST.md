# PUSH-MANIFEST · local-final-20261029

本快照 = 本机 `F:\BaoZouyxt\`（含 `_backup` / `_incoming` / `_outbox`）+ `F:\BaoZouyxt_backup\`（F 盘根同级）+ 模拟器内 `files/` 运行时副本，
按**本机原相对路径** 1:1 存放，未整理、未改名、未改内容（唯一例外见第 5 节）。

## 1. git 仓库里有什么

- 提交：`6b4ad48`（part 1/2 核心工程+备份+测试物料）、`4d2e4ff`（part 2/2 其余全部目录）、`f18082d`（本文件 + SHA256SUMS-ALL）
- `local-final-20261029/` 下 **23,003** 个文件
- 体积约 1.6 GB（三份镜像树内容相同，git 按内容去重）

## 2. release 里有什么（git 放不下的 15 个文件）

GitHub 硬拒 >100MB 单文件；另有 4 个 Windows 保留名文件。按表还原到相对路径即可补齐整树。

| 资产 | 还原到（相对 local-final-20261029/） | 字节 | SHA256 |
|---|---|---|---|
| big-01-base.apk-audit-v221.apk | audit-v221/real-audit/device-apk/base.apk | 1,066,543,751 | 632d423f89c70a27878c519b92a49a59c678adce532c6ad7dccb13e89bbb1eeb |
| big-02-base.apk-migration-batch3.apk | _迁移/batch3/audit-v221/real-audit/device-apk/base.apk | 1,066,543,751 | 同上（字节相同） |
| big-03-base.apk-migration-full.apk | _迁移全量/BaoZouyxt/audit-v221/real-audit/device-apk/base.apk | 1,066,543,751 | 同上（字节相同） |
| big-04-bz-migration-pkg.7z.001 | _迁移全量/bz-迁移包.7z.001 | 879,885,143 | e3882b2fc8fcb62712fd2086871ca484350114e4d71e629c6c9ca74230a3de6a |
| big-05-bz-migration-full.7z.001 | _迁移全量/bz-migration-full.7z.001 | 879,885,143 | 同上（字节相同） |
| big-06-bz-batch3-rest.zip | _上传包/bz-迁移-第3批-其余.zip | 827,217,140 | d13caa0cd2d72c9617a7bc18031310fb52a9f5e984064fe8d4e3effe8470ceea |
| big-07-bz-batch2-forensics.zip | _上传包/bz-迁移-第2批-取证用.zip | 114,692,817 | 9e8b7c6496332865ff0a36911cdda0db530f95de8c5d6e6137c1244516f103ec |
| big-08-libcocos2djs.so | 四处同哈希，复制四次：tools/libcocos2djs.so、_迁移/batch2/tools/libcocos2djs.so、_迁移全量/BaoZouyxt/tools/libcocos2djs.so、_迁移全量/BaoZouyxt-lean/tools/libcocos2djs.so | 102,158,024 | 94dbc8fcffeada7e94b78d994bd0b86d3d84f2ae987ad9177dba4d3f466f9c73 |
| device-hotfix-runtime.tgz | 解到 device-hotfix/（内含 hotfix/、dump/、bz_*.json/txt） | 547,223,966 | f894821ce276d565cb350ff5434b7e250950740c1d4ae87e5661f0328d6079d7 |
| reserved-nul.zip | 解到目录根（4 个名为 nul 的文件） | 6,596 | 0ad6390c84a621a3cd7c57d73f3cb4eca27e42e70a95f2bfc744d53a63f0eca4 |

`reserved-nul.zip` 内 4 条路径：
`audit-v221/incoming-v2.2.2/unpacked/bz-oracle/nul`、`audit-v23/incoming/unpacked/bz-oracle/nul`、
`_迁移全量/BaoZouyxt/audit-v221/incoming-v2.2.2/unpacked/bz-oracle/nul`、`_迁移全量/BaoZouyxt/audit-v23/incoming/unpacked/bz-oracle/nul`

精确哈希以 `SHA256SUMS-ALL.txt` 为准（覆盖全部 **98,296** 个文件，含上表全部路径）。

## 3. 覆盖核对

- 整树文件 **98,296**
- 进 git **23,001**（另有 40 个 `.git/**` 文件以 `.git__git-disabled/**` 形式入库，见第 5 节）
- 走 release **75,299** = `device-hotfix/hotfix/**` 75,284 + 上表 15 个

## 4. 不推的两类（按派单第九条）

- 任何 `node_modules/`（`package-lock.json` 可还原）
- MuMu 模拟器程序本体（安装目录）

## 5. 已知偏差（仅 1 处）

`_outbox/上游资产包-推送现场/` 本身是一个 git 仓库（含 24.8MB `.git`）。为让它的**内容**能进本仓库（否则 git 只记一个 gitlink，clone 下来是空目录），入库副本把该 `.git` 改名为 `.git__git-disabled`，内容一个字节未动；本机原件仍是 `F:\BaoZouyxt\_outbox\上游资产包-推送现场\.git`。