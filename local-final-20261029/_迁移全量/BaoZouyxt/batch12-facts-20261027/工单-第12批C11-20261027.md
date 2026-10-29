# 第 12 批 C11〔周年通行证〕取证工单（2026-10-27，4 单并行）

> 用户指令（本场）：「同意派工人，但要让他们**干多少落盘多少**，定期去检查是否在重试，如果是，则**杀掉检查进度重新派**」。
> 上一批教训（`batch11-facts-20261027\收尸记录-第11批-20261027.md`）：**大单 0/2 活，小单 6/6 活**。故一律小单、每单硬上限 90 行、只许抄亲眼读到的原文行。
> KEY 清单原文抄自 `_incoming\v2.7.1-20261026\work\bz-oracle\out\relations.md:84-89`（抄录时未做任何"纠正"）。

## 零、本批 7 键与线上名（主审已核，工人不许再改）

| 键 | 线上名 | 定义行 |
|---|---|---|
| ANN_PASS_GET_DATA | `User.getAnniversaryPassData` | tools/index.js:60587 |
| ANN_PASS_BUY_UP | `User.buyAnniversaryPass` | tools/index.js:60588 |
| ANN_PASS_RECEIVE_AWARD | `User.receiveAnniversaryPassAward` | tools/index.js:60589 |
| ANN_PASS_GET_GIFT_DATA | `User.getAnniversaryPassGift` | tools/index.js:60590 |
| ANN_PASS_BUY_GIFT | `User.buyAnniversaryPassGift` | tools/index.js:60591 |
| ANN_PASS_BUY_LIVENESS | `User.buyAnniversaryPassLiveness` | tools/index.js:60592 |
| ANN_PASS_FINISH_TASK | ★`User.receiveAnniversaryPassTaskReward`（**不叫 finishTask**） | tools/index.js:60595 |

第37批另两个（本批**不做**，只在 W4 里顺手记一行发送点）：`ANN_PASS_START_ROGUE→User.startAnniversaryPassRg`（60593）、`ANN_PASS_CHOOS_ROGUE→User.chooseAnniversaryPassRg`（60594）。

## 一、四单分工与交付

| 单 | 范围 | 键 | 交付文件 |
|---|---|---|---|
| W1 核心契约 | `tools\scripts3.js` 行 7800-7940 | GET_DATA / BUY_UP / RECEIVE_AWARD / BUY_LIVENESS | `scoutP1-annpass-core.md` |
| W2 gift＋任务 | `tools\index.js` 行 130600-131120（＋`scripts3.js:7878-7892`） | GET_GIFT_DATA / BUY_GIFT / FINISH_TASK | `scoutP2-annpass-gift.md` |
| W3 配置表 | `tools\cfg\dump\anniversary_pass_*.json` 等 9 张 | — | `scoutP3-annpass-tables.md` |
| W4 面板与可达性 | `tools\scripts3.js` / `tools\scripts2.js` 全文 grep `anniversary` | 全部（只做定位） | `scoutU-annpass-ui.md` |

## 二、通用约束（每单都带进工单正文）

1. **只读**：只能新建/追加自己那一个报告文件；禁止修改、覆盖、删除任何既有文件；禁止 git；禁止碰模拟器/重新部署；禁止 `pm clear` 及一切清理删除命令。
2. 只许抄**亲眼读到的原文行**，每条结论后必须带 `路径:行号`。
3. 禁止概括、推测、"类似地"、补全未读内容。没读到就写「未找到」＋检索式。
4. **边读边落盘**：先建文件写标题，每读完一个键立刻追加，不许攒到最后一次写（死掉时还能看出卡在哪一步）。
5. 每单报告硬上限 **90 行**；结尾必须有「未验证段」与「范围外产出」两段。
6. 开放式动词（分析/建议/你觉得）一律不做——判断归主审。

## 三、监控（主审执行）

- 每约 2-3 分钟查一次两个报告文件的字节数与行数；**只涨不写正文 / 长时间 0 增长 / 反复重试** → `job_kill` 整轮，按已完成部分重派缺的那几单。
- 判活标准：报告文件里出现**带行号的原文引用**才算活着；只有标题的按死单处理（同 `scoutQ-c10-tables.md` 45 B 那次）。
