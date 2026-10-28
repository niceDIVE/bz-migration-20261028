# FINAL 定版档案（本地唯一安装源）

定版日期：2026-10-29（Muse 结案报告）
本地整理：2026-10-30（下游 Agent，按结案报告第三节第 1 项）

## 唯一定版包

| 文件 | 字节 | SHA256 |
|---|---|---|
| `下游交付-FINAL-v2.zip`（**唯一安装源**） | 460012 | `8C775B0715E08616B17146A61F40C3862111EC8BCEBDB4D21C4831CB471810CC` |

包内关键产物（与实机已装状态一致）：
- `products/handlers.js` 1814791B / `40D2CA2447D44F779A424E57020DD8326F56DB6C0A5F83FF47E96D99D7A8191C`，版本 `hf5d89bf7`
- `products/flow.js` 17862B / `BC8B98BE0653656CCA897F26468A7FEFF1B66B6165EC1681924065E33FE02039`（真 flow，含 `onTick`）
- 更正说明：`CORRECTION-flow-v2.md`

## ⛔ 禁止安装（仅留档）

| 文件 | 字节 | SHA256 |
|---|---|---|
| `下游交付-FINAL-v1-flow错版-禁止安装-仅留档.zip` | 449924 | `E649637D3586475B3BF45DB9E9A9E4E7DBBFE47D07434F1022DE5260C54A3927` |

原因：v1 包里的 `products/flow.js`（2747B / `B7CD1C13…`）不是流程层实现，全文无 `onTick`，是 `LangMgr` 文案导出数据。装上并冷启动必现
`流程层载入失败: Error: flow 契约不符（缺 onTick）`，游戏停在选服界面。
**这份包只能作为历史留档，任何人不得拿它当安装源。**

## 实机现状（2026-10-30 复核）

- `F:\BaoZouyxt\hotfix-patch\patch\live\handlers.js` 1814791B / `40D2CA24…`
- `F:\BaoZouyxt\hotfix-patch\patch\live\flow.js` 17862B / `BC8B98BE…`
- `bz_ready.json`：`impl=hf5d89bf7`、`flow=ffaec47c3`、`scene=gamescene`

## 回滚点

- `F:\BaoZouyxt_backup\20261028-pre-FINAL\live\`（第一轮装前：handlers 1639277 / `243BD435…`，flow 17862 / `BC8B98BE…`）
- `F:\BaoZouyxt_backup\20261029-pre-FINAL-R2\live\`（第二轮装前，同上哈希；另有一份原始位置 `F:\BaoZouyxt\_backup\20261029-pre-FINAL-R2\live\`）

## 其他留档位置

- 测试物料（两轮回报、截图、存档快照）：`F:\BaoZouyxt\_incoming\FINAL-test-20261028\`
- 真 flow 回传副本：`F:\BaoZouyxt\_outbox\flow-R2-20261029\flow.js`（17862B / `BC8B98BE…`）
