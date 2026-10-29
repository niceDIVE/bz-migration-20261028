# 验收工人报告 c06（batch6-facts-20261026）

- 工人：acceptance-worker-c06
- 工作目录：F:\BaoZouyxt（第 2 条 cd 到 F:\BaoZouyxt\hotfix-patch）
- 开工时间：2026-10-26 22:52:15 +08:00
- 执行方式：按工单给定顺序逐条执行，失败不重跑，不改任何文件（本报告文件除外）。

## 执行记录

### 1. `node tools\gen_shop_tables.js`
- 退出码：0
- 关键输出（最后 3 行）：
  ```
  SHOPS OK  bytes=265217  -> F:\BaoZouyxt\hotfix-patch\core\bz-shops.generated.js
    inn=8 sect=13 mall=39 mount=72 tls=8 formula=274 passTiers=12 passLevels=4 passEnd=1790006399000 gfTiers=22 circleTiers=21 adventureRows=109 achCond=2113 proposeNpcs=36 makeTiers=5
    circle_task 解码样本：1→{m:125,e:50,p:50,lo:1,hi:30,talk:19,fight:14,item:12}  21→{m:2575,e:1030,p:1030}
  ```
### 2. `cd hotfix-patch` 然后 `node build-handlers.js`
- 退出码：0
- 关键输出（最后 3 行）：
  ```
  CATCH CODES  65 个动作已推导：BeginTraining=0 BuyAcitivityShop=0 ... washAdditionalArr=0
  HANDLERS OK  ver=h9de8c1d7  selfCheck=1285  bytes=1430971  -> patch/live/handlers.js
  FLOW     OK  bytes=17862  -> patch/live/flow.js
  ```
### 3. `cd F:\BaoZouyxt` 然后 `node tools\check_shape_freeze.js`
- 退出码：0
- 关键输出（最后 5 行）：
  ```
  note  C12 src 合法 851/1071；跨动作继承 **220 项**（尚未强制清零，等 R09 决策），样本：BeginSaveNpc.npcID ← borrowed-capture:templates.json:reqSelfBattleInfo.User.ReqSelfBattleInfo.npcID ...
  note  C9a 查表键超集 371 个字段（已落盘 tools/facts/lookup-keys.json）；其中属"跨动作继承"的 46 项在 C9b 通过前**不许清**（B5 批次），样本：BeginSaveNpc.npcID , BeginTraining.skillID , BuyMount.type ...
  note  C9b 查表键取值合法性：未实现（表名为变量的项标未定）
  note  C13 固定时钟 2 个、全部已登记用途（主时钟 1792612412000 共 52 处）
  ✅ C1–C8、C10–C13 全部通过（C9b 未实现）
  ```
### 4. `node tools\acceptance.js`
- 退出码：0
- 关键输出（最后 5 行）：
  ```
  PASS K-cap 条目=0 ≤ cap=0
  PASS K-cap 未扩容（历史最低 cap=0 → 本次 0）
  PASS G3 无滞留条目（history 行=75，最长连续=0）
  PASS G5 未扩容（cap 0 → 0），无需 guardHash 复核
  history 追加：tools/golden/known-red-history.jsonl seq=76 entries=0 entriesHash=da39a3ee5e6b… guardVer=2 prev=da39a3ee5e6b…
  ACCEPTANCE OK 项=46 绿=46 已知红=0 cap=0
  ```
### 5. `node tools\check_reject_codes.js`
- 退出码：0
- 关键输出（最后 3 行）：
  ```
  R5c 见 test\r14-catch-smoke.js
  R5 未实现（下一批：动作×原因夹具 + 磁盘/业务双哈希）
  REJECT-CODES OK 动作=65 条目=79 拒绝点=102 处 flow=1 条
  ```
### 6. `node hotfix-patch\test\c06-smoke.js`
- 退出码：0
- 关键输出（最后 4 行）：
  ```
  ok   薄 ack 四件：changePlayWooksState / setOnHookWookState / Implantation / removeMartial → 1
  ok   全批无发钱口：11 个动作跑完，存档逐字节不动

  [c06-smoke] 通过 6/6
  C06 SMOKE PASSED
  ```
### 7. `node hotfix-patch\test\c04-smoke.js`
- 退出码：0
- 关键输出（最后 4 行）：
  ```
  ok   【拍板·accept2】领养全链：结婚 → 500 元宝先扣 → childObj 形状 → 取名；元宝不足/已有孩子 → 2
  ok   【拍板·accept2】领养元宝不足（499）→ 2 不写 childObj 不扣钱；birthChild 未妊娠 → 2

  [c04-smoke] 通过 12/12
  C04 SMOKE PASSED
  ```
### 8. `node hotfix-patch\test\v271-smoke.js`
- 退出码：0
- 关键输出（最后 4 行）：
  ```
  ok   【拍板3】锁死类别不虚报：登录天数（354=2/5）、等级、无量天机一律不进 pending
  ok   【拍板3】received 保留：已领的成就重算后不回 pending

  [v271-smoke] 通过 15/15
  V271 SMOKE PASSED
  ```
### 9. `node hotfix-patch\test\achieve-data.js`
- 退出码：0
- 关键输出（最后 4 行）：
  ```
  ok   T5 重算结果落盘，且成就账本幂等
  ok   T6 白拿回归：持有收集品才进 pending（137 = require "0|2601"）

  [achieve] PASS  6/6
  ```
### 10. `node hotfix-patch\test\c16-smoke.js`
- 退出码：0
- 关键输出（最后 4 行）：
  ```
  ok   乱造 id（不在表里）同样被拒，且不动档
  ok   getAchieveMark 回 eRet:1 且不动档（纯查询）
  ok   getAchieveData 仍能开面板（本批没动它，防止连带回归）

  [c16-smoke] 通过 10/10
  C16 SMOKE PASSED
  ```
### 11. `node hotfix-patch\test\circle-task.js`
- 退出码：0
- 关键输出（最后 4 行）：
  ```
  ok   【v2.7】每日上限：CIRCLE_DAILY_MAX 次之后必须拒绝且不再发钱
  ok   【v2.7】quickFinishTask 对环任务正常扣 50 元宝并发表值奖励
  ok   真正无奖励的 id 仍不许扣元宝（保护闸保留）

  [circle-task] 通过 15/15
  CIRCLE-TASK SMOKE PASSED
  ```
### 12. `node hotfix-patch\test\c03-smoke.js`
- 退出码：0
- 关键输出（最后 4 行）：
  ```
  ok   结算类动作即使带伪造的战果参数也不发奖（防再造一个白拿口子）
  ok   肉鸽结算只按 npcID 走服务端掉落表（不存在的 npc 不发奖）
  ok   rogueBattleResult 只认 npcID（v2.7 新接线）：客户端自报的战果数值绝不进钱包

  [c03-smoke] 通过 11/11
  C03 SMOKE PASSED
  ```
### 13. `node hotfix-patch\test\c02-smoke.js`
- 退出码：0
- 关键输出（最后 4 行）：
  ```
  ok   【堵口·任意 id】delegateTask 不许把"不是任务"的数字塞进 accepted
  ok   环任务 id 仍可正常接（堵口不能把环任务本身堵死）

  [c02-smoke] 通过 19/19
  C02 SMOKE PASSED
  ```
### 14. `node hotfix-patch\test\c05-smoke.js`
- 退出码：0
- 关键输出（最后 4 行）：
  ```
  ok   肉鸽背包空后 rgUseItem 回 eRet:4 且不动档

  [c05-smoke] 通过 16/16
  C05 SMOKE PASSED ✅
  ```

## 未验证段：无

## 范围外产出：无
