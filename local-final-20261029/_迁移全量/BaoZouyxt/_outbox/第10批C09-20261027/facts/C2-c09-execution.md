# C10 · 第 10 批 C09〔技巧摸奖〕执行记录（2026-10-27）

> 策略：`C9-c09-取证与策略.md`｜契约：`scoutJ-c09-reqkeys.md`（839 行）｜表：`scoutK-c09-tables.md`（327 行）｜UI 字段：`scoutM-c09-ui-fields.md`（433 行）。
> 用户拍板：**两表分工抽奖**（先 `drop_probability` 抽组、再 `probability` 抽品质）＋ **分解/合成四件锁住**。

---

## 一、改了什么

| 文件 | 改动 |
|---|---|
| `tools\gen_c09_tables.js` | **新增**：把三张表压成 `hotfix-patch\core\bz-c09.generated.js`（18.9 KB） |
| `hotfix-patch\core\bz-c09.generated.js` | **新增**（生成物）：`BZ_KNACK_LOTTERY = {machine, skills(46), drops(230), knack(230 组×5 品质)}` |
| `hotfix-patch\build-handlers.js` | 把 `bz-c09.generated.js` 拼进产物（在 shops 之后、CATCH_CODES 之前） |
| `tools\check_shape_freeze.js` | sweep 里多 `vm.runInThisContext` 一份 c09 表（否则 sweep 时表是 undefined，摸奖动作的形状会被抽成空壳） |
| `hotfix-patch\core\bz-rpc-server.js` | helper：`knackTables/knackSlot/knackFreeLeft/knackRollOnce/applyChangeKnack`；handler +7；`REJECT_CODES` +7；**`SHRINK_OK` +`knackLottery`**（见 §三） |
| `tools\facts\reject-codes.json` | +7 条（动作 84 / 条目 98 / 拒绝点 127） |
| `hotfix-patch\test\c09-smoke.js` | **新增**，11 条 |

---

## 二、7 个实现 / 4 个锁

| 键 | 处置 |
|---|---|
| `getKnackLottery` | 回全套：`lotteryId / lotteryArr[1] / t / isFree / skillArr(46) / onePrice[9191,1] / tenPrice[9191,10] / trick_item 9191 / eTime / optionalEndTimeMap / order / nextSkillArr` |
| `knackLottery` | 先扣后发：`lotteryType 1`→1 张（有免费额度则免费）、`2`→10 张；券不足 `eRet 5`；抽 `draws` 次写 `knackBag`，回 `showKnack[]` |
| `getKnackLotteryHistory` | `{eRet:1, history:[]}`（记录结构未取证） |
| `getSkillGrasp` | `{eRet:1, skillGrasp: s.skillGrasp}` |
| `skillGrasp` | `{eRet:1, knackBag, skillGraspData}` |
| `changeSkillKnack` / `rgChangeSkillKnack` | 同一份账本（`applyChangeKnack`）：原口诀退回包、新口诀装上、幂等可重装 |
| `resolveEquip` / `batchResolveEquip` / `resolveKnack` / `batchResolveKnack` | **锁** `eRet 2`（缺产物表），应答收窄到只有 `eRet` |

---

## 三、踩到的真坑：`SHRINK_OK` 写前守卫把扣券回滚了 → 白拿

第一版 `knackLottery` 跑冒烟时"十连扣 10 张券"失败，日志是：

```
⚠ 写前守卫拒绝（动作 knackLottery）: 背包从 10 清空 → 内存已回滚到上次落盘快照
knackLottery type=2（扣 10 张 9191，余 0） 抽到 [...] 背包共 10 条
```

即：**券扣了、奖发了，但写前守卫判定"背包被清空 = 缩水"→ 整包回滚 → 券没扣**。
如果只跑 happy path（玩家背包里还有别的道具）根本发现不了；正因为冒烟里"背包只有 10 张券"才暴露。

修法：`var SHRINK_OK = { useItem: 1, saleItem: 1, knackLottery: 1 };` —— 摸奖**花券**本来就允许把背包清空，这是合法消耗不是缩水。
（`SHRINK_OK` 目前没有"棘轮"约束；但加一项要能说清，注释里已写明理由与事故形态。）

---

## 四、闸门

| 项 | 结果 |
|---|---|
| 构建 | ver=**hda45aa7d**，selfCheck **1286** 全过，bytes=1,490,156 |
| 形状 | C09 的 11 个动作**不在 337 基线**（gen_shapes 不收录，同 C07）→ **diff 0，无需审批**；C1–C8、C10–C13 全过 |
| acceptance | **49/49** 绿（+c09-smoke），known-red 0，cap 0 |
| c09-smoke | **11/11** |
| reject-codes | 动作 **84** / 条目 **98** / 拒绝点 **127** |
| 部署 | 热重载 pid 2655 不变；`ver` → `impl=hda45aa7d / flow=ffaec47c3 / implErr=null` |
| 真机 | `getKnackLottery` 实调：`lotteryId=1 券=9191 单抽=1 十连=10 isFree=1 技能池=46`，**存档 md5 前后不变**（e4d18ab8…，只读确认） |

---

## 五、未验证 / 风险

1. **两列权重的分工**（`drop_probability` 抽组 / `probability` 抽品质）客户端 0 读取点，是表结构 + 用户拍板，**回执已申报**。
2. `item_quantity`（5/25/50/125/250）含义未定，本批**不当发奖依据**（只发 1 个 knackId/次）。
3. `history` 元素结构未取证 → 只回空数组。
4. **可达性**：摸奖入口 = 商城 type=9 页签（`shop_entrance` 第 9 行，`shop_pic="Graspmenu"`），页签列表来自 `User.GetShopAllActive`（**我们早就实现了，且回全量行键**）；但点页签有门槛 `getMyRoleArtLv() >= getConst(435)=100`，且商城默认入口（`back:1`）不请求页签列表。真机验证时**临时把技能 1/7/8/9 抬到 100** 才进的去（见 §六.3）。
5. 免费额度只按 `todayKey()` 每天 1 次，跨天重置；没有做"活动期"限制（机台行 1 是常驻池）。

---

## 六、真机验证（2026-10-27，走设备上真实 `H.impl.handle`）

### 6.1 摸奖三抽（界面点出来的，不是探针）

| 次 | 日志 | 存档对账 |
|---|---|---|
| 拉池 | `getKnackLottery lotteryId=1 券=9191 单抽=1 十连=10 isFree=1 技能池=46` | — |
| 第 1 次单抽 | `用掉今日免费额度（剩余 0）`／`type=1（免费）抽到 [12331] 背包共 1 条` | 券仍 2 张（免费不扣）✔ |
| 第 2 次单抽 | `type=1（扣 1 张 9191，余 1）抽到 [11591] 背包共 2 条` | 券 2→1 ✔ |
| 第 3 次单抽 | `type=1（扣 1 张 9191，余 0）抽到 [11457] 背包共 3 条` | 券用光 ✔；**此条之后没有 `OBS 未解释差额`**（`note.ivch` 修复生效） |
| 奖励框 | 用户目视："获得…"后面是正常文字 | `showKnack → TrickRewardUI` 链通 ✔ |

最终存档：`bag.9191` 已无、`knackBag=[12331,11591,11457]`、`knackFree={d:"2026-10-27",n:1}`。

### 6.2 顺带修掉一个真崩点（不在 C09 名单，但同面板）

一进 `skillGrasp` bundle 客户端就请求 `User.getSkillTrickExchangeData`（口诀兑换面板，index.js:60406）——
我们没实现 → UNKNOWN 兜底回 `{eRet:1}` → 客户端 `onGetTrickExchangeData`（scripts3.js:89728）**裸读** `o.nextRefreshTime`：

```
事件回调异常(readystatechange): TypeError: Cannot read property 'nextRefreshTime' of undefined
  t.onGetTrickExchangeData @ scripts3/index.jsc:89728
```

修：补 `getSkillTrickExchangeData` / `refreshSkillTrickExchangeData` 两个 handler，回**空兑换店**
（`{skillTrickExchangeData:{nextRefreshTime:0, exchangeShop:[], remainingNum:0, costPrice:0, skillId:0}}`）——
结构对、列表空、**零奖励面**（444 张 dump 无兑换表；点兑换的 `skillTrickExchangeIndex` 仍不实现，列表空就没有格子可点）。
远程实调验证：`getSkillTrickExchangeData → 空兑换店（无兑换表）`，**无异常**，面板能开。

### 6.3 验证用的临时数据改动（**注意：存档不是原样了**）

摸奖门槛 `getMyRoleArtLv() >= 100`，原档算出来只有 41（skills `1:40, 7:40, 8:40, 9:21`）。
为验界面，经用户同意用维护动作 `bzPatch` 把 **skills 1/7/8/9 抬到 `[100,0,1]`**；改前整档备份在
`_backup\savedata-20261027-023103-pre-knackgate\bz_offline_save.json`（md5 `E4D18AB875AF8F5707A8B8EF9C8E4A3C`），
`bzPatch` 自己另存了一份 `<save>.pre-maint.json`。**用户 2026-10-27 决定不回滚、也不清抽到的东西**（"不要紧就不管了"）。
⚠ 所以现在真档的 skills 是 `1/7/8/9=100` —— 后续排查"等级怎么这么高"时，是这一笔，不是玩家练的。

### 6.4 阈值与入口的事实（供以后复现）

- 门槛：`showTrickLottery`（scripts2.js:8433-8438）要求 `getMyRoleArtLv() >= getConst(435)`；`tbl_constant` ID 435 = **100**。
- `getMyRoleArtLv()`（index.js:120277-120306）= `min(最高技能等级, 基础技能等级 + 悟性/10 + 内功等级/100)` —— **不看 `baseValueAy[33]`（artLevel）**。
- 商城页签：默认入口 `back:1` 只发 `GetPayShowData`（且 type 出口写死 2/8，**产不出 type:9**）；要页签必须 `back≠1` → 发 `GetShopAllActive`。
- 摸奖按钮链：`StoreMenuItem.onClick → onTapEnterShop(9) → showTrickLottery(0) → openBuyGoldEvent("",{type:9,back:0}) → TrickLotteryModel.reqData() → GET_KNACK_LOTTERY`。

