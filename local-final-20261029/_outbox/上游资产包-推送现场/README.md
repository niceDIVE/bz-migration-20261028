# BaoZouyxt 离线热修补丁迁移包 v1（2026-10-28）

## 资产
- `bz-migration-full.7z.001` — 全量分卷包，**1 卷**，879,885,143 B（839.1 MiB）
  SHA256: `E3882B2FC8FCB62712FD2086871CA484350114E4D71E629C6C9CA74230A3DE6A`
- `MANIFEST.md` — 顶层目录清单 / 解包后大小 / 自检记录 / 上传勾选
- `SHA256SUMS.txt` — 哈希台账
- `RECEIVER-INSTRUCTIONS.md` — 接收方指令（解包、装环境、自检、读知识、工作约定）

## 解包与自检
```powershell
7z x bz-migration-full.7z.001        # 得到 BaoZouyxt\
cd BaoZouyxt\hotfix-patch && npm install && cd ..
node tools\acceptance.js                                        # 57/57
node tools\lint_freebie.js hotfix-patch\core\bz-rpc-server.js   # 38/36/0
node tools\check_shape_freeze.js --diff                         # 0
node tools\check_reject_codes.js                                # 136/153/238
node hotfix-patch\build-handlers.js                             # ver=hcce22f0f / selfCheck=1426
```

## 注意
- 本仓库为 **private**：直接给链接需对方是 collaborator；若要免登录下载请把仓库设为 public（或让对方用有权限的账号）。
- 包内 node_modules 未包含；解包后先 `npm install`（3 个依赖）。
- 包内已脱敏：登录 token 替换为 `<REDACTED-TOKEN>`。
