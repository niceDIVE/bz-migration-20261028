# C13〔UFO 夹娃娃〕第 14 批 · 执行记录（2026-10-27）

> 上游文档：`C13-c13-取证与策略.md`、`主审-独立探针记录.md`、`工单-第14批C13-20261027.md`。
> 拍板四项（用户 2026-10-27）：①跳过 3 死键 ②抓取服务端权威 ③照扣爪子+活动常开 ④signCode 验存在。

---

## 一、交付物清单

| 文件 | 性质 | 内容 |
|---|---|---|
| `tools\gen_c13_tables.js` | 新增 | 生成器：package_difficulty 5 行（reward/quality/locCount）+ 口径（买刷新 100 元宝/限 3、爪映射 gear0/1/2→8117/8119/8120、抓中发 8143×reward、池子构成 {1:2,2:2,3:1,4:1,5:1}） |
| `hotfix-patch\core\bz-c13.generated.js` | 产物 | 728 B：BZ_C13 |
| `hotfix-patch\core\bz-rpc-server.js` | 修改（4 处插入） | 助手 `dlTable/dlRead/dlEnsure/dlGenPool/dlPoolCount` + 4 handler + REJECT_CODES 4 + REJECT_ALLOW 4 |
| `hotfix-patch\build-handlers.js` / `tools\check_shape_freeze.js` / `tools\todo_shapes.json` | 修改 | 接入 c13 + 登记 4 活键 |
| `tools\facts\reject-codes.json` | 修改 | +4 条 |
| `tools\golden\emission.json` | 重新冻结 | **356 动作**（352+4）；19 项 diff 由 4 条 planned 规则覆盖 |
| `hotfix-patch\test\c13-smoke.js` | 新增 | 9 条全绿 |

**线上 ver = `h3b555bcf`**（原 h74ca9c12），selfCheck **1371** 全过，pid 22577 不变。

## 二、4 个 handler 要点（档 A；死键 3 个按拍板跳过）

| 键 | 实现 | 回包要点 |
|---|---|---|
| `getUFOCatcherData` | 面板开关；首开赠送三档爪子各 3 + 1 次免费刷新（自定口径申报）；池子空则生成 | `{eRet:1, rewardPool, refreshTimes, freeRefreshTimes, buyRefreshTimes, buyCoinCount, signId, note}` |
| `rewardUFO` | itemId 反查 gear → signCode 验存在 → 池非空 → 背包有爪 → 扣爪 → **服务端权威判中**（池子数量加权随机）→ 发 8143×difficulty[k].reward → 池减 1；**池空自动刷新**（回 autoRefresh:1+新池——客户端 25761 契约） | 拒一律 15（8060；任何非 1 客户端恒 CATCH_DOLL_EVENT null 25767，安全） |
| `useUFOrefresh` | free 优先扣、再 paid；都无 → 6；池重生成 + signId+1（旧 signCode 失效） | 全字段回显 |
| `buyUFORefreshTimes` | 100 元宝/次、累计限 3（buyRefreshTimes 计数，无每日重置——自定申报） | 拒 7（8060）/5（3633） |

## 三、★本批新坑：模板新档 `s.bag` 缺位

- 现象：check_shape_freeze 的 sweep 里 `getUFOCatcherData` 排放成 `{}`（其余 3 键正常）；handler 直调复现
  `TypeError: Cannot read properties of undefined (reading '8117')` @ bagAdd:786 —— **首开赠送走
  grantRewardList→bagAdd 时 `s.bag` 是 undefined**（loadSave 的模板新档路径不保证 bag 存在；带显式 bag:{}
  基座的烟测环境踩不到）。
- 修复：`dlEnsure` 里 `if (!s.bag || typeof s.bag !== 'object') s.bag = {}`。
  **教训：任何要在新档上发物品的 handler，发之前必须确保 s.bag 存在（或走先 ensureLedger 的路径）。**
- 另：catchNoCode（无推导 catchCode）时 dispatch 回**空应答** → 形状排放成 `{}`——这也是"diff 每键只有 1 行"的鉴别特征。

## 四、门禁终值

| 门 | 结果 |
|---|---|
| gen_c13_tables | exit 0（5 难度 reward 30/30/60/150/300） |
| shape diff | **0**（356 动作冻结；19 项 diff 4 规则覆盖） |
| check_reject_codes | **OK 动作 117 / 条目 134 / 拒绝点 202** flow=1 |
| acceptance | **53/53 绿**（c13-smoke 9 条收编） |
| c13-smoke | **9/9** |
| c12 14/14、c11 14/14、c10 18/18、r14 3/3 | 回归全绿 |
| 设备 ver | impl=**h3b555bcf**，selfCheck 1371，pid 22577 不变，implErr=null |

**验收**：工人 9 条命令独立复跑（`verify-c13-worker.md`）+ 主审抽样复核。

## 五、真机全链（probe_c13_flow.js）

| 步 | 动作 | 实测 |
|---|---|---|
| ① | state（前） | 模型全默认（items=null），yuanbao=49,286 |
| ②③ | open → getUFOCatcherData | **free=1（首开赠送）、signId=2、items=7**（客户端 initItems 把池子摆上机器——rewardPool 契约生效） |
| ④ | refresh | free 1→0、signId 2→3、池子重生成 |
| ⑤ | catch gear0 | 服务端判中**难度 2 → 8143×30**、池余 6 |
| ⑥ | buyref | **refreshTimes=1 / bought=1 / -100 元宝** |
| ⑦ | 终态 | 全部落账 |

## 六、回滚

| 对象 | 位置 |
|---|---|
| C13 前全套（core/reject-codes/todo_shapes/两 docs/c12-smoke） | `_backup\20261027-113000-pre-c13\` |
| 形状基线 | `tools\golden\emission.json`（356 动作） |
| planned 留档 | `tools\golden\planned-archive\frozen-*.json`（本轮 4 条规则） |

## 七、未验证 / 移交（→ ISSUE-13）

1. 3 死键（GET_UFO_CATCHER_TASK / REWARD_UFO_CATCHER_TASK / BUY_UFO_GAME_COIN）跳过——零调用点（W3 全 bundle grep）。
2. 档 B：真 signCode md5 校验、客户端 packages 校验、任务链（coinDailyList/coinDailyId）。
3. 抓取判中的概率曲线（现为池子数量加权均匀随机）与原版概率未对证。
4. 爪子的获取途径（现自定：首开赠送各 3 把；商店/活动途径未取证）。
5. NPC 97 的入口可达性与 dollUI 视觉未逐像素看。
6. `refreshTimes` 无每日重置（自定口径）；`buyCoinCount` 当前恒 0（BUY_UFO_GAME_COIN 死键）。
