# MANIFEST —— 第 2 批「取证用」

> 本批 = 客户端反编译 bundle 与取证材料。**开工验收不需要本批**；`gen_shapes` / 深度取证需要。
> 无分卷，单包约 245 MB。全批次总表见第 1 批 `MANIFEST.md`。

## 内容
| 目录 | 说明 | 大小 |
|---|---|---|
| `client-analysis/` | 反编译产物（bundles/jsc/jsb-builtin 等） | 39.2 MB |
| `tools/libcocos2djs.so` | 引擎原生库（jsc 相关取证用） | 97.4 MB |
| `tools/ccreverse/` | 反编译工具链（需 npm install） | 8.6 MB |
| `audit-v23/`、`audit-v22/`、`audit-work22/`、`midaudit-v21/` | 历史审计材料 | 51.6 MB |
| `hotfix-patch/probe/` | 真机探针脚本与截图（历史） | 41.1 MB |

## 注意
- 第 1 批已含 `tools/index.js`、`tools/scripts2.js`、`tools/scripts3.js`、`tools/main.js` 四包（验收/证据审计需要），本批**不重复**提供。
- 本批到位后用于深度取证：`gen_shapes` 可随时重跑（其依赖的 bundle 在第 1 批）。
- 保留设备名 junk 文件已改名：`audit-v23/.../bz-oracle/nul` → `nul_unpacked`（2,980 B 解包残留）。
