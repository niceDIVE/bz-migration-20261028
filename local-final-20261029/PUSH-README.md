# local-final-20261029 推送说明

本目录是 2026-10-29 本机整树快照，按「本机原相对路径」1:1 存放：
`local-final-20261029\X` 对应本机 `F:\BaoZouyxt\X`；
`local-final-20261029\BaoZouyxt_backup\X` 对应本机 `F:\BaoZouyxt_backup\X`（F 盘根下同级目录）；
`local-final-20261029\device-hotfix\X` 对应模拟器内 `/data/data/com.maple.madherogo/files/X`（adb 拉取）。

## 分发了三个地方（按体积切分，内容不删不改）

1) **git 仓库（本目录）**：除下列三类外的全部文件。
2) **release 资产**：见 `PUSH-MANIFEST.md` 的 release 段。
   - 8 个 >100MB 单文件（GitHub 硬拒，按字节原样上传）
   - `device-hotfix/hotfix/**`（1.1GB，75,284 个文件，打了 tgz）
   - 4 个 Windows 保留名文件（名为 `nul`，git/Windows 无法按路径存放，打了 zip）
3) **SHA256SUMS-ALL.txt**（本目录根）：本次快照**全部**文件的相对路径 + SHA256，含上面 release 里的那些，逐行可核。

## 完整性核对方法

```
# 克隆后在 local-final-20261029/ 下执行（Linux/macOS）
sha256sum -c SHA256SUMS-ALL.txt --quiet      # 缺谁报谁
```
release 里的文件先按 `PUSH-MANIFEST.md` 放回对应相对路径，再跑上面这条即可全绿。

## 不推的两类（按派单第九条）

- 任何 `node_modules/`（`npm install` 依 `package-lock.json` 还原；`tools/`、`hotfix-patch/` 下的都在本机被剔除）
- 模拟器程序本体（MuMu 安装目录），未包含