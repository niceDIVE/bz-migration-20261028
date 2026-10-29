# 原版服务端 `upgradeSkill` 的真实请求 / 应答（仓库里一直就有）

> 出处：`hotfix-patch/decrypted/0035,0036,0037,0039_*upgradeSkill.json.txt`（`hotfix-patch/captures/bz_capture/` 同内容）。
> 抓包时刻：`nonce` 里的 1792573065628 / 1792573070377（= 2026-10-21T08:57:45Z / 08:57:50Z），与 `templates.json` 的抓包 serverTime 同一会话。
> 本次由 R19 Q4① 的命令（grep `NPCID` / `flag`）捞出来 —— 之前几轮都以为"没有原版应答抓包"。

## 请求（两次，都是 NPC 请教路径，不是书）

```
0035 REQ  p = {"skillID":1262, "skillArr":[1,0,1], "NPCID":1003, "flag":0, ...}
0037 REQ  p = {"skillID":1112, "skillArr":[1,0,1], "NPCID":1003, "flag":0, ...}
```

## 应答（原版服务端）

```
0036 RESP {"error":0,"p":"User.upgradeSkill","User.upgradeSkill":{"eRet":1,"note":{"eco":{},"skch":{"1262":[1,0,0]}}},"achievement":{"red":true,"achieveRateId":0,"nIds":[102]}}
0039 RESP {"error":0,"p":"User.upgradeSkill","User.upgradeSkill":{"eRet":1,"note":{"eco":{},"skch":{"1112":[1,0,0]}}},"achievement":{"red":true,"achieveRateId":0,"nIds":[117]}}
```

## 与我方实现（`core/bz-rpc-server.js` upgradeSkill，1213 起 + 1240 起）的差异

| 字段 | 原版抓包 | 我方现状 | 影响 |
|---|---|---|---|
| `note.skch[id]` | `[1, 0, 0]` —— 第 3 位（brlv）= **0** | `[lv, pgr, brlv \|\| 1]` → 写 **1** | 客户端 `setBrLv` 走的值不同；材料未提供 brlv 语义 |
| `note.eco` | `{}`（空对象） | `{ ptt: <潜能> }` | 客户端"不读 eco"这条 R11 已定；属于多余字段 |
| 顶层 `potential` | **没有** | 有 | 多余 |
| `returnPro` | **没有** | 有，且值 = 0 | ⚠ 自检已报"开关字段值不合法 `upgradeSkill.returnPro=0`"：`returnPro` 在形状表里是 switch 字段，**缺省不发**才对；抓包也没有它 |
| `achievement` | `{red:true, achieveRateId:0, nIds:[102]}` | `clone(TPL.create.achievement)` | 原版带 `nIds`（成就 id 数组）；我方模板里是什么待核 |

## 对 R19 Q1 的直接影响

1. **"服务端自己算，不采信 skillArr"这条有抓包支撑**：客户端发 `[1,0,1]`，原版回 `[1,0,0]` —— 服务端确实没有原样回传客户端上报的 brlv。
2. 但**这不是 `flag:1`（书）的抓包**：`NPCID=1003` 是 NPC、`flag=0` 是请教路径。所以 R19 Q1② 那套"书 → upgradeSkill{flag:1}"的规则仍然是【推断】，不是原版还原。
3. `returnPro` 的非法开关值是**独立于我方 Effect 11 设计的问题**，可单独修（删掉这个字段），不需要等 Effect 11 的裁定。
