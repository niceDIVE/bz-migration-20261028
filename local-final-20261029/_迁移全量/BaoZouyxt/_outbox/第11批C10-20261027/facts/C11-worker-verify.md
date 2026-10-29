# verify-c10-worker 产出报告

## 1. 命令原文：`cd F:\BaoZouyxt; node tools\acceptance.js`
- 退出码：`0`
- 关键输出（最后 4 行）：
```text
PASS G3 无滞留条目（history 行=92，最长连续=0）
PASS G5 未扩容（cap 0 → 0），无需 guardHash 复核
history 追加：tools/golden/known-red-history.jsonl seq=93 entries=0 entriesHash=da39a3ee5e6b… guardVer=2 prev=da39a3ee5e6b…

ACCEPTANCE OK 项=50 绿=50 已知红=0 cap=0
```

## 2. 命令原文：`cd F:\BaoZouyxt; node tools\check_reject_codes.js`
- 退出码：`0`
- 关键输出（最后 4 行）：
```text
信息 R5b+ 扫描 handler=230 拒绝点=145 处（涉及 89 个动作）动态 eRet=0 处
R5c 见 test\r14-catch-smoke.js
R5 未实现（下一批：动作×原因夹具 + 磁盘/业务双哈希）
REJECT-CODES OK 动作=94 条目=108 拒绝点=145 处 flow=1 条
```

## 3. 命令原文：`cd F:\BaoZouyxt; node tools\check_shape_freeze.js`
- 退出码：`0`
- 关键输出（最后 6 行）：
```text
  note  C12 src 合法 850/1071；跨动作继承 **221 项**（尚未强制清零，等 R09 决策），样本：BeginSaveNpc.npcID ← borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.npcID , BeginTraining.skillID ← borrowed-handler:OnCheckBreak , BuyHomeCrop.rewardArray ← borrowed-capture:templates.json:checkBattleResult.User.CheckBattleResult.rewardArray , BuyMarketItem.buyTimes ← borrowed-handler:GetMarketList , BuyMarketItem.userGold ← borrowed-capture:templates.json:quicklogin.userGold
  note  C9a 查表键超集 371 个字段（已落盘 tools/facts/lookup-keys.json）；其中属"跨动作继承"的 44 项在 C9b 通过前**不许清**（B5 批次），样本：BeginSaveNpc.npcID , BeginTraining.skillID , BuyMount.type , ChallengePVP.AttckData , ChallengeRoguePVP.AttckData
  note  C9b 查表键取值合法性：未实现（表名为变量的项标未定）
  note  C13 固定时钟 2 个、全部已登记用途（主时钟 1792612412000 共 60 处）
✅ C1–C8、C10–C13 全部通过（C9b 未实现）
```

## 4. 命令原文：`cd F:\BaoZouyxt\hotfix-patch; node test\c10-smoke.js`
- 退出码：`0`
- 关键输出（全部输出）：
```text
  ok   【⓪】作物表在产物里可见（BZ_PLANT 53 行 / 4 事件 / 加速 86400s）
  ok   【①】10 个线上名都在 H 里
  ok   【②】getHomeList：soilArr 是数组 4 块、每块 s=1、exp 数字、recentSeeds 数组
  ok   【③】播种：扣种子 + 地块挂 m + crops/recentSeeds 齐
  ok   【④】播种把背包播空 → 不许被写前守卫回滚（SHRINK_OK 白拿口子）
  ok   【⑤】种子不足 / 地块已占 → eRet 2 且存档逐字节不变
  ok   【⑥】真实计时：时钟推到成熟后 changeSate 把 m.s 推到 4，m.t 不动
  ok   【⑦】未成熟收获 → eRet 2 且存档不变（绝不走 eRet 3：那支会把 m.s 置 0 画成荒）
  ok   【⑧】成熟收获：发产物 + 种植经验 + 清地 + rewardArray/aExp/exp/note.ivch 齐
  ok   【⑨】一键收获：多块收齐，obtainLands 是数组
  ok   【⑩】催熟免费：连点把作物催到成熟，背包一个字节不动
  ok   【⑪】偷菜（档 A）：eRet 2、应答只有 eRet、存档不变
  ok   【⑫】驱除事件：无事件时 eRet 2 且应答不带 crop（客户端先看 crop 再看 eRet）
  ok   【⑬】一键驱除：cropMap 是对象；无事件时 eRet 1 + 空对象
  ok   【⑭】无枯死模型：cleanDeadCrop 回 eRet 2 且不动档；空地块 changeSate 回 -1

c10-smoke: 全部通过（15 条）
```

## 5. 命令原文：`cd F:\BaoZouyxt\hotfix-patch; node test\c09-smoke.js`
- 退出码：`0`
- 关键输出（最后 3 行）：
```text
  ok   【⑧c】rgChangeSkillKnack（注意上游拼写 SKNACK）走同一份账本
  ok   【⑨】四个锁：eRet 2、应答只有 eRet、存档逐字节不变

c09-smoke: 全部通过（11 条）
```

## 6. 命令原文：`cd F:\BaoZouyxt\hotfix-patch; node test\c08-smoke.js`
- 退出码：`0`
- 关键输出（最后 3 行）：
```text
  ok   【⑨】PVP：eRet 3（客户端弹提示后 dispose），应答收窄到只有 eRet
  ok   【⑩】本批零发奖口：5 个动作跑完，存档逐字节不变 + 钱包/背包不动

c08-smoke: 全部通过（12 条）
```

## 7. 命令原文：`cd F:\BaoZouyxt; node tools\gen_c10_tables.js`
- 幂等检查：
  - 跑前 MD5: `AE9A603FF04D4540B6EEC98B11FF74EA`
  - 跑后 MD5: `AE9A603FF04D4540B6EEC98B11FF74EA`
- 退出码：`0`
- 关键输出（全部输出）：
```text
作物=53 个（4777…10926）
事件=4 行 ["1","2","3","4"]
等级表=15 行 最高经验=2784600
加速：道具 6069，每次 +86400 秒（= 24 小时）
缺成熟产物(out[4])的作物=无
wrote hotfix-patch\core\bz-c10.generated.js  15053 B
```

## 8. 命令原文：`cd F:\BaoZouyxt; 用 PowerShell 算这几个文件的 MD5 与字节数并照抄`
- 文件 MD5 与字节数：
  - `hotfix-patch\core\bz-rpc-server.js`:
    - 字节数：`411972`
    - MD5：`ADE0BA4E252C3F1EED69907421066EC1`
  - `hotfix-patch\core\bz-c10.generated.js`:
    - 字节数：`15053`
    - MD5：`AE9A603FF04D4540B6EEC98B11FF74EA`
  - `hotfix-patch\patch\live\handlers.js`:
    - 字节数：`1536230`
    - MD5：`9B0D0395CF35D5CA4B6379B22EDA95F1`
- 字符串出现次数（Select-String -Pattern 后报 count）：
  - `"batchSeedCrop: 1"`：`1` 次（hotfix-patch\core\bz-rpc-server.js:453）
  - `"homeSpeicalAward: \{ default: 2 \}"`：`1` 次（hotfix-patch\core\bz-rpc-server.js:237）

---

## 未验证段
无（8 条命令已全部按序执行完成）。

## 范围外产出
无。
