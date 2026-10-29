# D3 GEN 限定批 · 第一批报告（2026-10-24）

> 决策依据：DECISIONS-2026-10-24 D3（限定范围启动：仅有录制样本且有守恒规则的动作）。基线：bz-oracle v2.2.2（`audit-v221\incoming-v2.2.2\unpacked\bz-oracle\`，22 步自检已原生全过）。

## 批次定义

| 项 | 值 |
|---|---|
| 入池动作 | `User.buyShopItem`、`User.saleItem`（有录制用例 02/03 + rules.dsl.json 守恒规则，全部 GEN-READY） |
| 生成器 | demo-gen（演示生成器：第 1 轮故意犯老错，第 2 轮按裁判反馈修正——用来验证"裁判反馈→修正"闭环本身） |
| 判定 | nightly 内建：replay + fuzz 闸 + 回归判死 + viaOk |
| 录制 | fixtures/cases 02-buyShopItem-2001x2 / 03-saleItem-2001x2 |

## 结果

| 动作 | 结果 | 尝试次数 | 静态闸 |
|---|---|---:|---|
| User.saleItem | **PASS-RETRY** | 2 | ✔ |
| User.buyShopItem | **PASS-RETRY** | 2 | ✔ |

- 本轮 2/2 通过、0 转人工；产物 `forge/generated/{User.buyShopItem,User.saleItem}.js` 过 G1–G5 静态闸（✔×2）。
- 通过语义：生成 handler 在离线裁判下与录制应答一致、fuzz 无 ACCEPTED_INVALID、回归无判死、接管全部用例。
- 管线验证点：nightly 反馈闭环（attempt 1 老错被抓 → feedback 注入 → attempt 2 修正）在本基线上工作正常。

## 口径声明（随 R22 附送）

1. 本批使用 demo-gen 而非 LLM 生成器——验证的是**裁判与闸门链路**，不是生成智能。LLM 生成器（llm-gen.sh）接入属下一批。
2. 产物在 M1 宇宙内口径；HttpConst3 的 116 个 User.* 动作未入池（扩表后重算，见 D1 第二期）。
3. 离线 PASS ≠ 真机 L2：S4 仍不闭合（与处置验收 §六一致）。

## 与 D4（真机 L2）的关系

本批产物满足推送条件（离线全绿），但 D4 执行依赖 D2 抓包完成后设备恢复在线态。设备当前 adb 桥离线（MuMu adbd 挂起），自动恢复循环运行中（`d2-recovery.sh`，日志 `d2-recovery.log`，最长 2 小时）。

## ⚠️ 补记（2026-10-24 晚，两次修订）

**修订 2（深夜，最终）**：D2 第二轮的三个 errorCode:1 被证实是我方构造请求的 JSON 非法所致（拼接 bug），**"原服拒绝卖穿戴装备"的结论撤回**——fixture 06 的期望（卖穿戴装备成功 eRet:1+eqch[0]）目前与真服行为**不矛盾**（未证实亦未证伪）。本批 PASS 判级的 fixture 基准恢复有效，但按 R22 回执 ⓪.6 的整动作口径，saleItem 仍回 IMPL-UNJUDGED 待 v2.3 重判。M09（售价守恒式）继续开放，关闭路径不变：真服卖出未穿戴装备取 Δcoins。

**修订 1（作废）**：原"fixture 06 与真服矛盾、装备分支判级作废"的表述基于上述无效证据，撤回。

## 证据文件

- nightly 日志：`out/nightly.jsonl`（2 行）
- 产物：`forge/generated/`（2 文件，静态闸 ✔）
- 注册表：`out/registry.nightly.json`（--implemented /dev/null 口径）
