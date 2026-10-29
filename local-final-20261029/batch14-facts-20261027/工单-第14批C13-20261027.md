# 第 14 批 C13〔UFO 夹娃娃〕取证工单（2026-10-27，4 单并行）

> 用户指令：开第 14 批取证（选择项即含 4 工人小单方案）。KEY 原文抄自 relations.md:96-97（第 14 批 · C13，7 个，可信度中；无"同面板另见"条目）。

## 零、7 键与线上名（主审已核 index.js；★actions.json 无本批条目，定义是唯一来源）

| 键 | 线上名 | 定义行 |
|---|---|---|
| GET_UFO_CATCHER_DATA | `User.getUFOCatcherData` | 60251 |
| GET_UFO_CATCHER_TASK | `User.getUFOCatcherTask` | 60249 |
| USE_UFO_REFRESH | ★`User.useUFOrefresh` | 60253（**refresh 的 r 小写**） |
| BUY_UFO_REFRESH_TIMES | `User.buyUFORefreshTimes` | 60252 |
| REWARD_UFO | `User.rewardUFO` | 60254 |
| REWARD_UFO_CATCHER_TASK | `User.rewardUFOCatcherTask` | 60250 |
| BUY_UFO_GAME_COIN | `User.buyUFOGameCoin` | 60255 |

主审摸底（工单前 grep 实测）：
- 7 键消费全部集中在 `tools\scripts3.js` 约 25728-25880（前段 25728-25802 疑似监听、后段 25849-25880 疑似发送）。
- shapes.json 7 键**零登记**（全 UNKNOWN）；core 零 handler；`tools\facts\reject-codes.json` 0 条。
- ★**cfg\dump 里没有 ufo/catcher/claw/doll/machine 名字的配置表**——数据源是本批特殊问题（W4 狩猎：文件名 → 内容 grep → tbl_constant）。
- 共享字段：refreshTimes / buyRefreshTimes / freeRefreshTimes（泛化名，注意别系统混淆）。

## 一、四单分工与交付

| 单 | 范围 | 交付文件 |
|---|---|---|
| W1 监听契约 | scripts3.js 25700-25815 | `scoutP1-ufo-listeners.md` |
| W2 发送载荷＋定义核对 | scripts3.js 25810-25895 + index.js 60245-60260 | `scoutP2-ufo-senders.md` |
| W3 面板与字段 | 全文 grep ufo/UFOCatcher/catcher + 三字段消费 | `scoutU-ufo-panel.md` |
| W4 配置表狩猎 | dump 目录文件名 → 内容 grep → tbl_constant | `scoutT-ufo-tables.md` |

## 二、通用约束（每单已写进工单正文）

只读；只能写自己那一个报告文件；边读边落盘；只抄亲眼读到的原文行＋`路径:行号`；≤90 行；结尾必有「未验证段」「范围外产出」；泛化字段（refreshTimes 等）只抄 UFO 上下文相邻命中，混淆写进「未找到项」。

## 三、监控（主审执行，用户既定指令）

每 2-3 分钟查 4 个报告文件字节数；只有标题 / 长时间 0 增长 / 反复重试 → job_kill 整轮、按已完成部分重派缺单。
