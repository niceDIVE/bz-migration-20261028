## 计数（自动生成，勿手改）

> 复算：`node forge/tools/registry.js --m1 F:\BaoZouyxt\audit-work22\main-scratch\r21\M1-动作全集表.tsv --contracts F:\BaoZouyxt\audit-work22\main-scratch\bz-oracle\out\contracts.json --cases F:\BaoZouyxt\audit-work22\main-scratch\bz-oracle\fixtures\cases --report F:\BaoZouyxt\audit-work22\main-scratch\bz-oracle\out\report.json --capture F:\BaoZouyxt\audit-work22\main-scratch\bz-oracle\config\capture.json --out F:\BaoZouyxt\audit-work22\main-scratch\bz-oracle\out\registry.json --md F:\BaoZouyxt\audit-work22\main-scratch\bz-oracle\out\dashboard.md`　M1 ed2a4eee / 契约 072aff31 / 2026-10-23T09:41:38.343Z

| 口径 | 数值 | 定义 |
|---|---:|---|
| HttpConst 条目 | 1125 | M1 全表行数 |
| 客户端会发的请求动作 | 744 | 总数 − PUSH − DEAD |
| 服务端推送（PUSH） | 192 | send=0 且 on=1，或非 Mod.do 形态但有监听 |
| 死条目（DEAD） | 189 | send=0 且 on=0 |
| 另一通道（ALT） | 16 | send=1 但不是 Mod.do 形态 |
| 范围内 | 699 | 请求动作 − OUT − CAPTURE − ALT |
| DONE | 6 | 已实现且裁判全 PASS |
| IMPL-FAIL | 0 | 已实现但裁判有 FAIL |
| IMPL-UNJUDGED | 74 | 已实现、还没有用例 |
| RULE | 0 | 有规则 DSL，可直接编译 |
| GEN-READY | 317 | 契约闭合，可交给生成器 |
| NEEDS-S2 | 282 | 契约未闭合，先跑展开器 |
| NO-CONTRACT | 20 | 客户端会发但没有读点契约 |
| CAPTURE | 0 | 依赖原服独有数据 |
| OUT | 29 | 付费/项目边界外 |
