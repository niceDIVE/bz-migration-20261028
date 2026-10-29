# 第 13 批 C12〔管家/帮手〕取证工单（2026-10-27，4 单并行）

> 用户指令（本场）：「派工但要让他做多少落盘多少，定期检查工人是否存活」。
> KEY 原文抄自 `_incoming\v2.7.1-20261026\work\bz-oracle\out\relations.md:91-94`（第 13 批 · C12，7 个，可信度中）。

## 零、7 键与线上名（主审已双源核对，工人不许"纠正"）

| 键 | 线上名 | 定义行 | 备注 |
|---|---|---|---|
| BUY_BUTLER | `User.buyHelper` | index.js:60397 | |
| SET_BUTLER | `User.setHelper` | index.js:60396 | |
| BUTLER_DISPATCH | ★`User.dispatch` | index.js:60394 | **泛化名**，与 MessageCenter.dispatch 严格区分 |
| DISPATCH_AWARD | `User.dispatchAward` | index.js:60395 | |
| BUY_BUTLER_VIP | ★`User.buyMonthlyFee` | index.js:60398 | **完全不叫 buyButlerVip** |
| GET_HELPER_CALL_LIST | `User.getHelperCallList` | index.js:60563 | |
| CALL_HELPER_BY_ID | ★`User.callHelperId` | index.js:60564 | **不是 callHelperById** |

主审摸底（工单前 grep 实测）：
- 7 键消费点全部集中在 `tools\scripts3.js` 约 23120-23662 区（购买线 23162/23189/23638/23662、派遣线 23120/23564/23611、呼叫线 23228/23235/23248/23251）；`scripts2.js:53142` 是 getHelperCallList 的 UI 消费点。
- **shapes.json 里 7 键零登记（全 UNKNOWN 黑洞）**，core 零 handler。
- 配置表只有两张：`tools\cfg\dump\helper.json`（3,155 B）+ `helperAct.json`（9,814 B）。
- `templates.json` 的 create 应答带 `housekeeper` 段（共享 field:housekeeper）——存档形状的锚点。

## 一、四单分工与交付

| 单 | 范围 | 键 | 交付文件 |
|---|---|---|---|
| W1 购买线 | scripts3.js 23140-23200 + 23555-23670 | BUY_BUTLER / SET_BUTLER / BUY_BUTLER_VIP | `scoutP1-butler-buy.md` |
| W2 派遣线 | scripts3.js 23100-23145 + 23555-23640 | BUTLER_DISPATCH / DISPATCH_AWARD | `scoutP2-butler-dispatch.md` |
| W3 呼叫线 | scripts3.js 23220-23270 + scripts2.js 53120-53180 | GET_HELPER_CALL_LIST / CALL_HELPER_BY_ID | `scoutP3-butler-call.md` |
| W4 表+存档+入口 | helper.json / helperAct.json / templates.json create.housekeeper / 面板入口 | — | `scoutU-butler-tables.md` |

## 二、通用约束（每单已写进工单正文）

只读；只能写自己那一个报告文件；边读边落盘（读完一键立刻追加）；只抄亲眼读到的原文行＋`路径:行号`；≤90 行；结尾必有「未验证段」「范围外产出」；开放式动词一律不做。

## 三、监控（主审执行，用户指令）

- 每 2-3 分钟查一次 4 个报告文件的字节数；**只有标题 / 长时间 0 增长 / 反复重试** → `job_kill` 整轮，按已完成部分重派缺单。
- 判活标准：报告里出现**带行号的原文引用**才算活着（同 C11 scoutQ 45 B 那次的教训）。
