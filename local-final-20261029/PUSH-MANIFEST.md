# PUSH-MANIFEST · local-final-20261029

本快照 = 本机 `F:\BaoZouyxt\`（含 `_backup/_incoming/_outbox`）+ `F:\BaoZouyxt_backup\`（F 盘根同级）+ 模拟器内 `files/` 运行时副本，
按**本机原相对路径** 1:1 存放，未整理、未改名、未改内容（例外见文末"已知偏差"）。

## 1. git 仓库里有什么

- 提交：`6b4ad48`（part 1/2，核心工程 + 备份 + 测试物料）、`4d2e4ff`（part 2/2，其余全部目录）
- 文件数：**23,012**（含本文件与 `SHA256SUMS-ALL.txt`）
- 体积：约 1.6 GB（含 3 份镜像树，git 已按内容去重）

## 2. release 里有什么（git 放不下的）

GitHub 硬拒 >100MB 单文件，加上两个 Windows 特殊情形，以下 **10 个资产**走 release，按表还原回相对路径即可补齐整树：

| 资产名 | 还原到（相对 local-final-20261029/） | 字节 | SHA256 |
|---|---|---|---|
| big-01-base.apk-audit-v221.apk | audit-v221/real-audit/device-apk/base.apk | 1,066,543,751 | 632d423f89c7…（见下） |
| big-02-base.apk-migration-batch3.apk | _迁移/batch3/audit-v221/real-audit/device-apk/base.apk | 1,066,543,751 | 同上（三份 base.apk 同哈希） |
| big-03-base.apk-migration-full.apk | _迁移全量/BaoZouyxt/audit-v221/real-audit/device-apk/base.apk | 1,066,543,751 | 同上 |
| big-04-bz-migration-pkg.7z.001 | _迁移全量/bz-迁移包.7z.001 | 879,885,143 | e3882b2fc8fc… |
| big-05-bz-migration-full.7z.001 | _迁移全量/bz-migration-full.7z.001 | 879,885,143 | 同 big-04 |
| big-06-bz-batch3-rest.zip | _上传包/bz-迁移-第3批-其余.zip | 827,217,140 | d13caa0cd2d7… |
| big-07-bz-batch2-forensics.zip | _上传包/bz-迁移-第2批-取证用.zip | 114,692,817 | 9e8b7c649633… |
| big-08-libcocos2djs.so | tools/libcocos2djs.so | 102,158,024 | 94dbc8fcffea… |
| device-hotfix-runtime.tgz | 解到 device-hotfix/（内含 hotfix/、dump/、bz_*.json/txt） | 547,223,966 | 见 release 页 |
| reserved-nul.zip | 解到目录根（4 个名为 `nul` 的文件） | 6,596 | 0AD6390C84A6… |

精确哈希以 `SHA256SUMS-ALL.txt` 为准（该文件覆盖**全部** 98,296 个文件，含上表这些）。

## 3. 完整性核对

```
# 在 local-final-20261029/ 下
sha256sum -c SHA256SUMS-ALL.txt --quiet     # Linux/macOS
# 缺谁报谁；全绿即整树一致
```

## 4. 不推的两类（按派单第九条）

- 任何 `node_modules/`（`package-lock.json` 可还原）
- MuMu 模拟器程序本体（安装目录）

## 5. 已知偏差（仅 1 处，已最小化）

`_outbox/上游资产包-推送现场/` 本身是一个 git 仓库（含 24.8MB `.git`）。为了让它的**内容**能进本仓库（否则 git 只会记一个 gitlink，clone 下来是空的），入库副本里把该 `.git` 目录改名为 `.git__git-disabled`，内容一个字节未动；本机原件仍是 `F:\BaoZouyxt\_outbox\上游资产包-推送现场\.git`。