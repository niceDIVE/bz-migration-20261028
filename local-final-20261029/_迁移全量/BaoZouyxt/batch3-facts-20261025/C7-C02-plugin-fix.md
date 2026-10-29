# C02 堵口：任务领奖共用账（v2.6 上游 §一）

> 上游包：`F:\BaoZouyxt\_incoming\v2.6-20261025\`（`00-先看这个-v2.6与C02回复.txt` §一）
> 落地：2026-10-25 ｜ 部署 `impl=h63c5d609` ｜ 热重载，pid 6188 未变
> 回滚：`_backup\20261025-222006-pre-c02-plug\`

---

## 1. 上游指出的漏洞（复述，逐条对上代码）

领奖路径只验「在不在 `s.accepted` 里」；接任务既不验领过没有、也不验是不是环任务。因此：

| # | 刷法 | 原实现的位置 |
|---|---|---|
| ① | `acceptCircleTask(X)` → `circleTaskAward(X)` 发奖 → **再** `acceptCircleTask(X)` → 再领 …… 无限 | `acceptCircleTask` 对 taskID **零条件**（只判 `tid > 0`） |
| ② | `rogueAcceptTask` + `getRogueFinishTaskAward` 同样能刷 | `rogueAcceptTask` 同样零条件 |
| ③ | `delegateTask`（也把任意 X 塞进 accepted）+ 任一领奖口 | `delegateTask` 零条件 |
| ④ | 跨口重复：主线 X 用 `getFinishTaskAward` 领过（记 `s.rewarded`），再从环任务口领一遍；`quickFinishTask` 发奖**但不记 rewarded** | `getFinishTaskAward` 只查自己的 `s.rewarded`，别的口不查 |

**为什么原来的冒烟没抓到**（上游原话）：只测了「领完马上再领」——那一步 `accepted` 已经被移除了，所以必然被拒；真正该测的是「领完**再接**再领」。本工程的 `c02-smoke.js` 第一版正是这么写的。

---

## 2. 修法（实现与上游方案的三处偏差，均有据）

上游给的骨架落在本工程要改三点，否则会回归：

### 偏差 1：`isRepeatTask` 不能直接当「环任务」
上游写的判据是 `isRepeatTask(tid)`。但本工程里已经有一个同名函数（`bz-rpc-server.js:771`），
语义是 **`tasknew.Repeat≠0`**，用来决定 `getFinishTaskAward` 写不写 `done`（客户端一致性，`index.js:134524`）。
它和我们投射的环任务（9001..9003，**不在 tasknew 表里**）是两个集合。

- 只用 `isRepeatTask` → 环任务变成一次性（与「环任务按天限次」矛盾）；
- 只用「环任务」 → 真·每日任务被永久锁死（功能回归）。

→ 取**并集** `isRepeatable(id) = isRepeatTask(id) || isCircleTask(id)`。

### 偏差 2：环任务 id 要白名单，不能「不在 BZ_TASKS 就算环任务」
上游写「tid 不在 BZ_TASKS → 回 6」。但环任务本身就不在 BZ_TASKS —— 照字面执行会把环任务全拒掉。
→ 改成 `isKnownCircleId(n)`：必须是投射器**真会发出去**的 id（`circleRows()` 的成员）。

### 偏差 3：`rogueAcceptTask` 的拒绝码必须用 4，不能用 6
客户端 `getRogueTaskCallBack`：
- `4 == eRet`（`index.js:133250-133252`）→ 只查 `tasktime` 表 + `show(getText(1093))`，**不读**回包字段；
- `6 == eRet`（`index.js:133253-133254`）→ `getItem(o.skillId,"skill")` 后直读 `u.Name` → **`skillId` 缺席必抛 TypeError**。
→ 用 4。这条写进了 `REJECT_CODES` 的注释和 `approved-narrowing.json` 的 reason 里，防止后来者"顺手统一成 6"。

### 落地的账本
```js
var CIRCLE_DAILY_MAX = 20;          // 上游："circle_task 表/客户端 cNum 上限，取不到先写 20"
function todayKey()                  // 本地日 yyyy-mm-dd，跨天自动失效
function canClaim(s, id)             // 一次性看 s.rewarded；可重复看 s.circleDay.n < 上限
function markClaim(s, id)            // ⚠ 只 push 不 splice（guardSave:363 禁止 rewarded 数量减少）
function acceptable(s, id)           // 接任务口闸：真任务看 Repeat/rewarded；非真任务必须是我们投射的环任务 id
```

**为什么 `CIRCLE_DAILY_MAX` 取 20 而不是从表里算**：实测两张表都给不出「每日领奖次数」——
`circle_task` 的 21 行是**等级段档位**（`low_limit/limit` 1..1000），
`entrust_open.number` 1..5 是**同时可挂数量**（= `cNum`）。两者都不是领奖次数上限，故用上游给的后备值。

### 接线点（共 7 处）
| 类型 | 动作 | 改动 |
|---|---|---|
| 领奖 | `getFinishTaskAward` | `firstTime` 改由 `canClaim` 决定；成功改调 `markClaim` |
| 领奖 | `circleTaskAward` | 加 `canClaim` 闸（拒 → 4）+ `markClaim` |
| 领奖 | `getCircleTaskAward` | 同上 |
| 领奖 | `getRogueFinishTaskAward` | 同上 |
| 领奖 | `quickFinishTask` | **扣元宝之前**判 `canClaim`（不过 → 2、不扣钱）+ 成功后 `markClaim` |
| 接取 | `acceptCircleTask` | 加 `acceptable` 闸（拒 → 6） |
| 接取 | `rogueAcceptTask` | 加 `acceptable` 闸（拒 → **4**） |
| 接取 | `delegateTask` | 加 `acceptable` 闸（拒 → 4） |

`acceptTask`（主线 GET_TASK）**未改**：它确实也能把 id 塞进 `accepted`，但共用账本已经在所有领奖口拦住，
刷不出东西；且它不在上游点名范围内，按最小改动处理。若要一并收紧，留作后续决策。

---

## 3. 验证

### 3.1 原故障重现（决定性证据：同一攻击序列，修复前 vs 修复后）
用备份里的旧 server 跑「接→领→接→领→接→领」，任务 `100010`（有奖励）：

```
修复前（_backup\20261025-222006-pre-c02-plug）：
  序列: accept=1  award1=1  accept2=1  award2=1  accept3=1  award3=1
  背包: {"3626":3}          ← 同一件奖励发了 3 次（真·无限白拿）
  rewarded: []
修复后（当前）：
  序列: accept=1  award1=1  accept2=6  award2=4  accept3=6  award3=4
  背包: {"3626":1}          ← 只发一次
  rewarded: [100010]
```

### 3.2 设备端（真实加密报文，`H.impl.handle`）
对真实存档跑同一序列（该档里 100010 早已被主线领过 → 第一接就该被拦）：

```
accept1 -> User.acceptCircleTask {"eRet":6}
award1  -> User.circleTaskAward  {"eRet":4}
accept2 -> User.acceptCircleTask {"eRet":6}
award2  -> User.circleTaskAward  {"eRet":4}
存档 md5 攻击前 = 攻击后 = 0F1430544904E094C1D26CAA98851874（1792 B）→ 一个字节没变
```

### 3.3 冒烟（`test/c02-smoke.js` 13 → 19 条，新增 6 条）
新增的 6 条都用**全新存档**跑（不复用前面被改过的档），避免用例互相污染：
- `【堵口·原漏洞】接 → 领 → 再接 → 再领`：第 1 接/第 1 领必须成功（不能把正常路径堵死）；第 2 接必须 6 且存档逐字节不变；硬闯领奖口必须发不出东西
- `【堵口·跨口】主线领过 → 环任务口再领被拒`
- `【堵口·第四口】quickFinishTask 发过奖必须记账 → getFinishTaskAward 不能再发`
- `【堵口·肉鸽口】rogueAcceptTask 接→领 之后不许再接`
- `【堵口·任意 id】delegateTask 不许把"不是任务"的数字塞进 accepted`
- `环任务 id 仍可正常接`（防过度堵口）

> ⚠ 踩坑记录：第一版这条用例假红。原因是 `loadSave()/ensureLedger` 会把存档**规范化**
> （`schoolContribution {}`→`0`、`passCardLevel 0`→`1`、`bloodArr []`→`[0,0,0,0]`），
> 快照取在规范化之前就把"规范化"误判成"handler 改了档"。修法：`freshServer()` 里先预热一次 dispatch。

### 3.4 门禁
- `acceptance` → **项=41 绿=41**
- `check_reject_codes` → OK，动作 39→**41**、条目 43→**45**、拒绝点 64→**71**
- `check_shape_freeze` → 先 diff 6 处 → 写 `planned-changes.json`（6 条，逐项 `allowSigma` + `index.js` 证据）→ 补 `approved-narrowing.json` 4 条（`escape:"closed"`）→ `--freeze` → **diff 0**
- 热重载 `pid 6188 → 6188`，`impl h73e73b9 → h63c5d609`，`selfCheck 1264` 全过，`implErr=null`

---

## 4. 已知留白

1. **`CIRCLE_DAILY_MAX = 20` 是常数不是表值**（理由见 §2）。要精确化得等上游给出环任务每日次数的判据。
2. **环任务仍然发不出奖**（9001..9003 不在 `BZ_TASKS`，本轮明确不接线）。所以 `quickFinishTask` 对它们
   仍走"无奖励表不扣钱"的闸。要接线需先定：补 `BZ_TASKS` 行，还是让领奖口认 `BZ_CIRCLE_TASK`。
3. **`acceptTask` 未收紧**（见 §2 末）。
4. **`s.circleDay` 是新增存档键**。老档首次领奖时按需创建，不需要迁移脚本；
   `guardSave` 只对 `rewarded`/`done` 的数量做单调检查，新键不影响。
5. **真·每日任务（tasknew.Repeat≠0）现在受每日 20 次总上限约束**。若某天真的刷超过 20 个重复任务，
   第 21 次会被拒 —— 本轮按上游「先写 20」执行，若实测顶到上限需要把这个数抬高或拆成"按任务分别计次"。
