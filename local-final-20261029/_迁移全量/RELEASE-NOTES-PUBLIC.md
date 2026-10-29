# BaoZouyxt 离线热修补丁迁移包 v1（2026-10-28）

仓库已设为 **public**：下面的链接无需登录即可访问。

## 资产
- `bz-migration-full.7z.001` — 全量分卷包，**1 卷**，879,885,143 B（839.1 MiB）
  SHA256: `E3882B2FC8FCB62712FD2086871CA484350114E4D71E629C6C9CA74230A3DE6A`
- `MANIFEST.md` / `SHA256SUMS.txt` / `RECEIVER-INSTRUCTIONS.md` / `UPLOAD-GUIDE.md`

## 解包与自检
```powershell
7z x bz-migration-full.7z.001
cd BaoZouyxt\hotfix-patch && npm install && cd ..
node tools\acceptance.js                                        # 57/57
node tools\lint_freebie.js hotfix-patch\core\bz-rpc-server.js   # 38/36/0
node tools\check_shape_freeze.js --diff                         # 0
node tools\check_reject_codes.js                                # 136/153/238
node hotfix-patch\build-handlers.js                             # ver=hcce22f0f / selfCheck=1426
```

## 备注
- node_modules 未随包；解包后先 `npm install`（3 个依赖）。
- 包内登录 token 已脱敏为 `<REDACTED-TOKEN>`。
