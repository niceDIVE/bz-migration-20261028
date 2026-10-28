# C11〔周年通行证〕第 12 批 · 取证与策略（2026-10-27）

> 成员按 `relations.md:84-89` 原文抄录（`_incoming\v2.7.1-20261026\work\bz-oracle\out\relations.md`）。
> 侦察：4 个只读工人 `scoutP1-annpass-core.md`（4 键契约）/ `scoutP2-annpass-gift.md`（gift 2 键+完成任务）/ `scoutP3-annpass-tables.md`（配置表）/ `scoutU-annpass-ui.md`（面板与入口）。
> 主审独立探针：`主审-独立探针记录.md`（15 节，全部带行号）。**两路已对撞**，不一致处见 §九。
> 工单与派活纪律：`工单-第12批C11-20261027.md`。本批 4/4 工人全活（上批大单 0/2、小单 6/6 的规律再次成立）。

---

## 一、成员与线上名（双源一致：`tools\index.js:60587-60595` 与 `tools\actions.json:787-795`）

| 键 | 线上名 | 定义 | 发送点 | 回调 | 请求载荷 |
|---|---|---|---|---|---|
| ANN_PASS_GET_DATA | `User.getAnniversaryPassData` | 60587 | scripts3.js:7894 | scripts3.js:7819-7842 | **无** |
| ANN_PASS_BUY_UP | `User.buyAnniversaryPass` | 60588 | scripts3.js:7897 | 7843-7849 | **无** |
| ANN_PASS_RECEIVE_AWARD | `User.receiveAnniversaryPassAward` | 60589 | scripts3.js:7904 | 7850-7857 | `{id, vip}` |
| ANN_PASS_GET_GIFT_DATA | `User.getAnniversaryPassGift` | 60590 | index.js:131046-131048 | index.js:131050-131056 | `{roleID}` |
| ANN_PASS_BUY_GIFT | `User.buyAnniversaryPassGift` | 60591 | index.js:131058-131060 | index.js:131062-131067 | `{giftId}` |
| ANN_PASS_BUY_LIVENESS | `User.buyAnniversaryPassLiveness` | 60592 | scripts3.js:7907 | 7858-7864 | `{num}` |
| ★ANN_PASS_FINISH_TASK | `User.receiveAnniversaryPassTaskReward` | 60595 | scripts3.js:7920-7922 | 7878-7888 | `{taskId}` |

（定义行均在 `tools\index.js`；`scripts3.js` 里查不到定义名是正常的——工人报告写"未找到"属实，不是漏读。）

第37批、本批**不做**：`ANN_PASS_START_ROGUE`（发送 7912，调用点 8153）、`ANN_PASS_CHOOS_ROGUE`（发送 7915，调用点 8039）。

## 二、七个动作的契约（回包必带 / 裸读崩点）

| 键 | 成功分支 | 回包必带（★ = 裸读，缺则 TypeError） | 非 1 分支 |
|---|---|---|---|
| GET_DATA | `eRet==1` | ★`anniversaryPassData`（含 7 子字段，全裸读）、★`endtime`（**毫秒**） | else → 文案 1093 + `ANN_OPEN false` |
| BUY_UP | `eRet==1` | 只读 `eRet`，**不需要任何数据** | `4` → 文案 8845 |
| RECEIVE_AWARD | `eRet==1` | `vip`（回显请求值）、`id`、`rewardArray`（**有守卫**） | 无（静默） |
| GET_GIFT_DATA | `eRet==1` | ★`giftDatas`（对象→11 元数组，见 §五） | 无（静默） |
| BUY_GIFT | `eRet==1` | ★`rewardArray`（**无守卫**）、整个回包透传给 `REFRESH_GIFT_DATA` | 无（静默） |
| BUY_LIVENESS | `eRet==1` | ★`n`（新活跃度）、★`td`（对象） | `3` → 文案 7353 |
| FINISH_TASK | `eRet==1` | ★`dt`（**数组**，`.length`/`.includes`）、★`rewardArray`（**无守卫**） | 无（静默） |

四个最硬的崩点：`anniversaryPassData`、`endtime`、`dt`（数组）、`rewardArray`（FINISH_TASK / BUY_GIFT 无守卫）。

## 三、`anniversaryPassData` 的字段契约（由**消费者**反推，比回调更硬）

| 子字段 | 落模型 | 消费点 | 类型要求 |
|---|---|---|---|
| `n` | `liveness` | 7407/7415 `>= config.liveness`；7541/7549 解锁判定；7763 上限判定 | 数字 |
| `vip` | `isVip` | 7530 `<= 0` 显隐买按钮；7717 `> 0` | 0 / 1 |
| `rd` | `receivedRewards` | 7407 `.includes(this.data)` | **数组**，元素 = award 行 id |
| `vrd` | `receivedVipRewards` | 7415 `.includes(this.data)` | 同上 |
| `td` | `lTaskRates` | 7754 / 18385（配 `anniversary_pass_liveness` 用） | **对象**：liveness 行 id → 进度 |
| `dt` | `receivedTasks` | 7925/7940 `includes(parseInt(...))` | **数组**，元素 = task 行 id |
| `dv` | `taskRates` | 7939/8121/8152（配 `anniversary_pass_task` 用） | **对象**：task 行 id → 进度 |

模型构造默认值（7806-7815）已把上述数组/对象全部初始化 ⇒ **即使 GET_DATA 没跑过也不会崩**，崩点只在回包载荷本身。

## 四、配置表事实（主审自读 + `scoutP3` 一致）

| 表 | 行 | 列 | 要点 |
|---|---|---|---|
| `anniversary_pass_award` | **22** | id, liveness, name, picture, award1, award2, award3, evnet | **主表**。liveness 阶梯 `0,10,20,…,520,565`（**最大 565**，即买活跃度上限判定值 `_maxNum`）。`award1`=免费档、`award2`=VIP 档，格式 `"物品id,数量"`、多份 `|` 分隔；★`award3`=**关联任务 id**（7385/7936/8114）；`evnet`=数组（全空） |
| `anniversary_pass_task` | 7 | id, type, value, score, des | `score`=`[物品id, 数量]`；`type 6` 的任务完成条件是 `>=4`（7940 原文），其余按 `value` |
| `anniversary_pass_liveness` | 5 | id, type, parameter, liveness, limit, name, begintime, endtime | 活跃度**来源**表。★窗口 `2026-09-29 16:00 → 2026-10-17/18 15:59`，**已经过期**（今天 2026-10-27） |
| `anniversary_pass_gift` | 4 | id, name, picture, description, limit, num, award, price | 礼包货架。price = **60 / 300 / 680 / 980**（980 与 `bz-rpc-server.js:1344` 注释交叉吻合） |
| `anniversary_pass_evnet` | 5 | id, type, require, dialog | 表名拼作 `evnet`（**不是笔误，别改**） |
| `pass_award` / `pass_level` / `pass_liveness` | 12 / 4 / 7 | — | **侠客令**的，不是本批的 |

## 五、★礼物面板 = 通用商店 type 11（本批最容易做错的一处）

`getAnniversaryPassGift` 不自己开面板，而是 `dispatch(STORE_SHOW_UI, {type:11, back:1, data: e.giftDatas})`（index.js:131051-131054），消费者是通用商店大 UI `openBuyGoldEvent`（scripts2.js:8472），**type 11 分支在 scripts2.js:8550-8572**：

| 下标 | 字段 | 来源列 |
|---|---|---|
| [0] ID / [1] Name / [3] des | `id` / `name` / `description` |
| [2] name2 | 表里无 → 0 或 "" |
| [4] limitnum / [5] award / [6] imgname / [7] money / [8] num | `limit` / `award` / `picture` / `price` / `num` |
| [9] | 客户端不读 |
| [10] endTime | 表里无 → 0 |

⇒ **`giftDatas` = 对象（礼包 id → 11 元数组）**，行必须是**数组**不能是对象；形状表现有兜底给的 `giftDatas: []` 是"空货架"（不崩、没内容）。

## 六、数据流与入口（与 C10 同型的"面板开关"）

1. 入口：主界面左上栏 `AnniButton`（scripts2.js:29878-29879）→ `onClickAnniBtn`（30996-31003）→ `reqGetAnnPassData()`（31001）。
2. ★**面板在 GET_DATA 的 1 分支里 new**（scripts3.js:7831 `prefabs.load("activeUI/anniversary/AnniversaryMainUI")`）⇒ **GET_DATA 回不对，其余 6 个动作全不可达**（与 C10 的 `getHomeList` 完全同型）。
3. 面板是**配置表驱动**的：直接读 `anniversary_pass_award`（7521-7525 建 `liveness→行id` 映射、7526/7549 用节点名当面 id），按 `liveness >= 行.liveness` 解锁贴 `_lock` 图。
4. `isVip <= 0` 时显示"升级"按钮（7531-7537，`C==1`）。
5. 倒计时 `update()` 7572-7577：**`endT` 必须是毫秒**（`(e-t)/1e3`；`getSTimestamp()` 返毫秒，旁证 scripts2.js:302/4906）；给 0 则倒计时空白。
6. 买活跃度：`liveness >= 565` 时只弹文案 6016349（7763）；否则弹 `BuyItemUI29`（7438/7763）→ `18435` 价格=`itemNum × getPriceValue()`、**扣 `gold`**（18436）→ `18448` 发请求。
7. 礼包：`GET_GIFT_DATA` → 商店 type 11；`BUY_GIFT` 成功 → `addShowRewardUI1(rewardArray)` + `REFRESH_GIFT_DATA`（131064-131065）。

## 七、线上现状（已核）

- 7 个动作在 `core\` **一个 handler 都没有**（全文查 `nniversaryPass` 只有 2 处，都在形状表）。
- 形状表只有 2 条 SHAPED 兜底：`buyAnniversaryPassGift {eRet:1,rewardArray:{}}`、`getAnniversaryPassGift {eRet:1,giftDatas:[]}`；**其余 7 个 UNKNOWN（黑洞）**。
- `tools\facts\reject-codes.json` 里这批 **0 条**拒绝码。
- 上游"`ANN_PASS_BUY_LIVENESS` 可能已下线"**已被推翻**：入口真实存在（scripts3.js:18448，两个弹出点 7438/7763）。

## 八、策略草案（待拍板后执行）

**可复用模板**：侠客令（`bz-rpc-server.js:2695-2774`，已在线上跑通的"通行证"）——同一套 `wrapped()`/`note.eco`/`ach()`/`persist()` 口径，别新造。

1. **存档**：`s.annPass = {n:0, vip:0, rd:[], vrd:[], dt:[], td:{}, dv:{}, endT:<毫秒>}`（字段对齐 §三）。
2. **生成器** `tools\gen_c11_tables.js` → `core\bz-c11.generated.js`：award 22 行（liveness + 两条 award 串解析成 `{itemid:num}`）、task 7 行、liveness 5 行、gift 4 行、evnet 5 行。⚠ **必须同时接进** `build-handlers.js` 与 `check_shape_freeze.js` 的 `sweep()`（C09/C10 都踩过：少接一处 = 形状被抽成空壳）。
3. **GET_DATA**：`{eRet:1, anniversaryPassData:{n,vip,rd,vrd,td,dt,dv}, endtime:<毫秒>}`；`endtime` 由拍板口径决定（表里窗口已过期）。
4. **BUY_UP**：置 `vip=1` → `{eRet:1}`（够用）；已买过 → `eRet 4`。
5. **RECEIVE_AWARD**：按 `{id, vip}` 取 award 行的 `award1`/`award2` → 解析成 `rewardArray` → 记入 `rd`/`vrd` → 回 `{eRet:1, id, vip, rewardArray}`。条件：`n >= 该行 liveness`、未领过。
6. **GET_GIFT_DATA**：按 `anniversary_pass_gift` 拼 11 元数组 → `{eRet:1, giftDatas:{...}}`。
7. **BUY_GIFT**：校验限购（`limit`）与价格 → 发放 `award` → 回 `{eRet:1, rewardArray}` + `buyCount`。
8. **BUY_LIVENESS**：`n += num`（上限 565）→ 回 `{eRet:1, n, td}`；钱按拍板口径扣。
9. **FINISH_TASK**：校验该 task 的进度达标（`type 6` → `>=4`，其余 `>= value`）→ 发 `score` → `dt` 追加 → 回 `{eRet:1, dt:[...], rewardArray}`。

## 九、待拍板（每项已附主审建议）

1. **`endtime` 口径**：表里窗口 `2026-09-29 → 2026-10-17` **已过期**，直接下发会让倒计时永远是 0/空白。
   → **建议**：自定"开启即 now + 30 天"，存档里落 `endT`，不跟表。替代：固定一个未来时间。
2. **VIP 档价格**：表里**没有价格列**（只有礼包价）。侠客令的先例是"自定离线价（元宝）"，且本工程不接真实付费。
   → **建议**：`buyAnniversaryPass` 自定价（如 300 元宝，或参照侠客令第 2 档 288），扣 `s.yuanbao`。**要不要钱**由你定。
3. **礼包币种与限购**：price 60/300/680/980 疑似元宝；`limit` 1/2/2/? 是限购次数。
   → **建议**：按元宝扣，限购照表 `limit`。
4. **买活跃度的价格与币种**：客户端是 `itemNum × getPriceValue()`、**扣 `gold`**（18436），但 `getPriceValue()` 的公式**没取证到**。
   → **建议**：自定"1 点活跃度 = N gold"（N 待定），并要拍"上限 565 是否照客户端"。
5. **`award3` 关联任务**：award 行带 `award3`（任务 id），未达标时该任务"锁定"（7936/8114）。
   → **建议**：本批**只回数据不实现锁定逻辑**（锁定是纯客户端表现），但 `dt`/`dv` 要给对。
6. **`dv`（任务进度）从哪来**：7 个任务 `type` 各异（1/3/8/6…），进度要么由玩家行为累计，要么本批自定。
   → **建议**：本批**进度只读存档、不主动累计**（与 C10"事件不随机刷"同风格），够面板显示，不伪造玩法。
7. **活跃度来源是否实现**：`anniversary_pass_liveness` 5 条是"打怪/副本/…给多少活跃度"，但窗口已过期。
   → **建议**：本批**不做来源结算**，活跃度只能"买"（`buyAnniversaryPassLiveness`）。
8. **是否并入 `anniversary_pass_evnet`（5 行事件）**：`evnet` 列全空、`require`/`dialog` 结构未取证。
   → **建议**：**沉底**，本批不碰（同 C10 的事件不随机刷）。

## 十、未验证 / 风险

1. `getPriceValue()`（BuyItemUI29）的公式**未取证** —— 影响 §九.4。
2. **VIP 购买的前置条件**（等级/活跃度）在客户端看不到，条件应在服务端 —— 口径待拍板（§九.2）。
3. `anniversary_pass_evnet` 的 `type` 数组语义（`[1,27011,26011]`）与 `require`（`"32,10"`）**未取证**。
4. 面板的"楼"节点名 = award 行 id，**依赖 prefab 里真有 22 个同名节点**（脚本侧无法校验，需真机点开看）。
5. `award3` 任务在 UI 的解锁表现只看到 7384-7385 两行，**未逐行核**。
6. 真机可达性未验：入口是主界面 `AnniButton`，但**周年活动是否在游戏内开启**（活动表/开关）未取证 —— 与 C08"入口可达性未验"同级风险。
7. 工人报告与主审一致（本轮无冲突）；但 `scoutP1` 把"定义行"写成"未找到"，那是**范围所致**（定义在 index.js，工单只让读 scripts3.js），非漏读。
