# 报告 · 给 Muse（2026-10-28）

对着《给下游的收集清单 · Muse 接手需要的文件（2026-10-27）》交的货。**八节全对上**，真缺的只有 2 个文件级缺口。

## 1. 东西在哪

| 项 | 值 |
|---|---|
| 仓库 | `niceDIVE/bz-migration-20261028`（public） |
| 目录 | `incoming/muse-needs-20261027/` |
| 提交 | 分支 `main`（提交信息 `incoming/muse-needs-20261027: Muse collection package`）；tag `muse-needs-20261027` = 首版打包点，**内容以 `main` 最新为准** |
| 浏览 | https://github.com/niceDIVE/bz-migration-20261028/tree/muse-needs-20261027/incoming/muse-needs-20261027 |
| 直下 zip | https://github.com/niceDIVE/bz-migration-20261028/raw/main/incoming/muse-needs-20261027/muse-needs-20261027.zip |
| 包 | `muse-needs-20261027.zip`（1,238,327 B，37 个文件） |
| zip sha256 | `c61ba841c0b2fca72133d3e55d8c87126fb4ff7ca0e171481babe06f61bd8446` |
| 本报告 sha256 | 见同目录 `SHA256SUMS.txt`（每次改动会更新） |
| 大包（旧的，别重下） | Release `v1-20261028` |

**匿名可达性实测（不带 token、走外网）**：raw 文件 `200`；zip 下载 `200` 且 `size=1238327`（与本地一致）；tag 页面 `200`。仓库 public，直接下就行。

拿到 zip 后：解包 → 先读 `README.md`（八节对照）→ 再读 `变更说明.md`（落点表：哪个文件放哪、哪些是新增/替换/原样）→ 按 `.md` 里的落点表覆盖。

## 2. 包里有什么

```
muse-needs-20261027\
  00-转发说明.txt   README.md   变更说明.md   SHA256SUMS.txt(36 行)   RESUME.md
  docs\  01-依赖与自检说明   02-批次回执-C01-C15-C19   03-待做批次清单
         04-交接与护栏确认   05-批号冲突裁决
  files\core\       15 个核心/生成物 + build-handlers.js + build.js
  files\patch-live\ handlers.js（1,639,277 B，ver=hcce22f0f）
  files\补齐\       index.jsc（581,088 B）、轮询.md（2,435 B）
  files\修正\       package.json（已补 name/scripts）、package-lock.json
  files\hotfix-patch\ README.md、install.md（原样）
  testdata\         bz_offline_save.example.json（脱敏）、sanitize-save.js、测试用例.md
```

## 3. 清单八节 → 状态

| 节 | 结论 |
|---|---|
| 一 缺失文件 | `index.jsc` 581,088 B、`轮询.md` 2,435 B，**与清单字节数一致**，已备好 |
| 二 修正 | `package.json` **真缺 name/scripts**（已补，依赖仍 3 个不动）；`RESUME.md` **原仓库根本没有**（已新写）；README/install/lock **本来就是对的** |
| 三 核心确认 | 15 个文件 + 产物；`bz-rpc-server.js` md5 `0AF170DE…`、`handlers.js` md5 `05263957…`，**与交接文档一致** |
| 四 依赖自检 | Node v24.12.0；3 依赖用途；四门禁实测：acceptance **57/57**、lint **38/36/0/2**、形状 **371 动作 diff 0**、拒绝码 **136/153/238**（口径已写清）；build 预期 `ver=hcce22f0f / selfCheck=1426 / 1,639,277 B`（沙箱复跑通过） |
| 五 批次 | C01–C15/C19 逐批一句话回执；待做 12 批逐批（玩法/handler/线上名/核账/付费标注）；已完结批次 16 条 |
| 六 存档用例 | 脱敏示例存档（`roleID/name/baseValueAy/childName` 已换）+ 脱敏脚本 + C19 全链用例 |
| 七 护栏 | 四项边界原文（归属/用途/分发/不能动）+ 本次逐项自查 + 扫描结果（凭证 0 命中，含 2 处需知情的偏差） |
| 八 清单外 | `SHA256SUMS.txt` 36 行（自校验 0 bad）+ `变更说明.md` |

## 4. 必须知道的三个坑

1. **批号有两套**（最容易撞车）：`HLEX 兑换` 在旧版 relations 是**第22批**，在 v2.7.1 是**第23批**；`万圣宝藏楼层` 在 v2.7.1 才是**第22批 C22**。已落地批次全按 v2.7.1 编号。完整对照见 `docs\05-批号冲突裁决.md`，**一切以 `_incoming\v2.7.1-20261026\work\bz-oracle\out\relations.md` 为准**。
2. **`roleID: 16374` 硬编码 3 处**（`core\templates.json`、`core\bz-rpc-server.js:617`、`:1368`）。它是本机存档的标识符、不是凭证（低危）；但 `ver` 是内容哈希，**改它会让 `hcce22f0f` 变掉**，交接文档/回执的指纹都要重报。建议不动。
3. **`docs\03` 里 GFUI 那两行的状态还没订正**（已知）：`GFUI_BUY_BIG_GIFT → buyBigGiftTime` **其实早已实现**（`core:1423` `GF_BIG_UNLOCK_PRICE = 980` 元宝，`core:3187-3194` 扣元宝解锁 `paystata`），不是"待做"；真正没实现的是 `GFUI_BUY_GIFT → buyGiftTime`。接手时按代码为准，别按那两行。

## 5. 本次改了两处（都有备份，可还原）

| 文件 | 改什么 | 备份 |
|---|---|---|
| `hotfix-patch\package.json` | 102 → 440 B，补 `name` + `scripts`（命令都是仓库里现成的），依赖一条没动 | `_backup\20261028-042000-pre-muse-needs\package.json` |
| `RESUME.md`（仓库根） | 新建：工程结构 / 三条命令 / 三条铁律 / 批号口径 | 新文件，无备份需要 |

其余全是**原样拷贝**，没有重建产物、没有改 `core`、没有改 README/install。

## 6. 没做的（说清楚，别误会）

- **没有**把 800 MB 大包重发（这包只有 1.2 MB）。
- **没有**重建 `patch\live\handlers.js`（`built=2026-10-27T12:06:50.067Z` 原样）。
- **没有**连设备、没跑热载与真机 probe（需要模拟器在线）。
- **没有**逐批取证（每批的配置表/价格表/兑换核账细节）——`docs\03` 里标了"待该批取证"。
- `tools\golden\known-red-history.jsonl` 因跑验收**多了一行 `seq=119`**（设计如此，cap=0、空红名单）；要还原删最后一行。
