# C11〔周年通行证〕主审独立探针记录（2026-10-27）

> 本文件是**主审自己读出来的证据**，与 4 个工人的 scout 报告分开存放、互不覆盖，用于对撞。
> 工人报告：`scoutP1-annpass-core.md` / `scoutP2-annpass-gift.md` / `scoutP3-annpass-tables.md` / `scoutU-annpass-ui.md`。
> 全部行号均为本场实测，未采信任何转述。

---

## 一、键 → 线上名（双源一致，禁止"纠正"拼写）

两个独立数据源完全一致：`tools\index.js:60587-60595`（HttpConst 定义）与 `tools\actions.json:787-795`（动作登记表）。

| 键 | 线上名 | index.js | actions.json |
|---|---|---|---|
| ANN_PASS_GET_DATA | `User.getAnniversaryPassData` | 60587 | 787 |
| ANN_PASS_BUY_UP | `User.buyAnniversaryPass` | 60588 | 788 |
| ANN_PASS_RECEIVE_AWARD | `User.receiveAnniversaryPassAward` | 60589 | 789 |
| ANN_PASS_GET_GIFT_DATA | `User.getAnniversaryPassGift` | 60590 | 790 |
| ANN_PASS_BUY_GIFT | `User.buyAnniversaryPassGift` | 60591 | 791 |
| ANN_PASS_BUY_LIVENESS | `User.buyAnniversaryPassLiveness` | 60592 | 792 |
| ★ANN_PASS_FINISH_TASK | `User.receiveAnniversaryPassTaskReward` | 60595 | 795 |

第37批（本批不做）：`ANN_PASS_START_ROGUE`→`User.startAnniversaryPassRg`（60593）、`ANN_PASS_CHOOS_ROGUE`→`User.chooseAnniversaryPassRg`（60594）。

## 二、模型层（`AnniversaryModel`，scripts3.js:7798-7933）

构造默认值（7806-7815）：`liveness=0`、`receivedRewards=[]`、`receivedVipRewards=[]`、`receivedTasks=[]`、`taskRates={}`、`lTaskRates={}`、`endT=0`、`isVip=0`、`storeT=[0,0]`。

⇒ **数组/对象全部预初始化**。这一点很关键：即使 `GET_DATA` 从没跑过，`RECEIVE_AWARD` 里的 `.includes()` 也不会 TypeError。**崩点不在模型层，全在回包载荷本身。**

### 2.1 ANN_PASS_GET_DATA（面板开关，同 C10 的 getHomeList）

- 发送点 7893-7895：`sendRequest(ANN_PASS_GET_DATA)`，**无载荷**。
- 回调 7819-7842：
  - `o.eRet` 7820（`1 == o.eRet`，无 hasOwnProperty 守卫）
  - ★**`o.anniversaryPassData` 7821 裸读**，随后 7822-7828 连续裸读其 7 个子字段：
    | 子字段 | 行 | 落到模型 | 语义（由消费者反推，见 §四） |
    |---|---|---|---|
    | `a.n` | 7822 | `liveness` | 活跃度（整数） |
    | `a.vip` | 7823 | `isVip` | 是否买了 VIP 档（0/1） |
    | `a.rd` | 7824 | `receivedRewards` | 已领免费档奖励的 **award 行 id 数组** |
    | `a.vrd` | 7825 | `receivedVipRewards` | 已领 VIP 档奖励的 award 行 id 数组 |
    | `a.td` | 7826 | `lTaskRates` | 活跃度任务进度（对象：任务 id → 当前值） |
    | `a.dt` | 7827 | `receivedTasks` | 已领任务奖励的 **task 行 id 数组** |
    | `a.dv` | 7828 | `taskRates` | 任务进度（对象：task 行 id → 当前值） |
  - `o.endtime` 7829 裸读 → `endT`（**毫秒**，见 §五）
  - 7831 ★**面板在成功回调里 new**：`prefabs.load("activeUI/anniversary/AnniversaryMainUI")` + `addComponent` + `addPopUp`
  - 7836 `LocalStorageMgr.setItem("anni" + roleID, 1)`
  - else 分支 7837-7841：`removeItem` + `getText(1093)` + dispatch `ANN_OPEN false`
- ⇒ **本键回不对，面板根本不打开，其余 6 个动作全不可达**（与 C10 的 `getHomeList` 完全同型）。

### 2.2 ANN_PASS_BUY_UP（升 VIP）

- 发送点 7896-7898：`sendRequest(ANN_PASS_BUY_UP)`，**无载荷**（不传档位，等于"买 VIP"）。
- 回调 7843-7849：`1 == o.eRet` → `isVip=1` + dispatch `ANN_UPGRADE_SUCCESS` + `getText(7297)`；`4 == o.eRet` → `getText("8845")`。
- 除 `eRet` 外**不读任何回包字段** ⇒ 这是本批最松的一个。

### 2.3 ANN_PASS_RECEIVE_AWARD（领奖）

- 发送点 7899-7905，载荷 `{id, vip}`：`id = 参数 t`（award 行 id）、`vip = e ? 1 : 0`（0=免费档，1=VIP 档）。
- 回调 7850-7857：`1 == o.eRet` →
  - `o.vip > 0` 7852 裸读（`undefined > 0` 为 false，**不崩但会走错档**）→ 选 `receivedVipRewards` 还是 `receivedRewards`
  - `o.id` 7853 裸读 → `s.includes(o.id) || s.push(o.id)`
  - `o.rewardArray` 7854 **有守卫**（`o.rewardArray && !cc.js.isEmptyObject(...)`）→ `addShowRewardUI1`
  - 7855 dispatch `ANN_RECEIVE_AWARD`（把整个 `o` 透传给 UI）
- ⇒ 必带 `{eRet:1, vip:<0|1>, id:<award行id>, rewardArray:{物品id:数量}}`。`vip` 必须**回显请求里的值**，否则领完记到另一档。

### 2.4 ANN_PASS_BUY_LIVENESS（买活跃度）

- 发送点 7906-7910，载荷 `{num}`。
- 回调 7858-7864：`1 == o.eRet` → `o.n` 7860 裸读赋 `liveness`；`for (var s in o.td)` 7861 裸读（对象）；dispatch `ANN_LIVENESS_CHANGED`；`3 == o.eRet` → `getText("7353")`。
- ⇒ 必带 `{eRet:1, n:<新活跃度>, td:<进度对象>}`。上游说它"可能已下线"，但**发送点确实存在**（见 W4 的入口核查结论）。

### 2.5 ★ANN_PASS_FINISH_TASK（**不叫 finishTask**）

- 发送点 7919-7923，载荷 `{taskId}`。
- 回调 7878-7888：`1 == o.eRet` →
  - **`o.dt` 7880 裸读两次**：`o.dt.length` 与 `o.dt[n]`，且语义是**数组**（`t.receivedTasks.includes(o.dt[n])`）
  - 7880-7883 找出第一个"新领到"的 id 透传给 UI（`ANN_SCORE_RECEIVE_REWARD`）
  - 7884 `receivedTasks = o.dt`（整体覆盖）
  - ★7886 **`o.rewardArray` 裸读，无守卫** → `addShowRewardUI1(o.rewardArray)`
- ⇒ 必带 `{eRet:1, dt:[task行id...], rewardArray:{...}}`。`dt` 必须是**数组**、`rewardArray` **不能省**（这是本批第二硬的崩点）。

## 三、模型方法（7919-7933 一带，供 W4 对撞）

`reqGetAnnPassData` 7893 / `reqBuyAnnUpgradePass` 7896 / `reqReceiveAnnPassAward` 7899 / `reqBuyAnnPassLiveness` 7906 / `reqStartAnnRogue` 7911 / `reqChooseAnnRogue` 7914 / `reqFinishTask` 7919 / `checkTaskReceived` 7924 / `openUpgradeUI` 7927（`activeUI/anniversary/AnniversaryUpgradeUI`）。

## 四、字段的真实消费者（这才是契约，比回调更硬）

| 字段 | 消费点 | 用法 ⇒ 类型要求 |
|---|---|---|
| `receivedRewards`（rd） | scripts3.js:7407 `receivedRewards.includes(this.data)`；7717 | **数组**，元素 = award 行 id（数字），`this.data` 是行 id |
| `receivedVipRewards`（vrd） | 7415 `.includes(this.data)`；7717 | 同上 |
| `liveness`（n） | 7407/7415 `liveness >= this.config.liveness`；7541/7549 解锁判定；7717 | 数字 |
| `isVip`（vip） | 7530 `g <= 0` 决定买按钮显隐；7415 `isVip <= 0`；7717 `isVip > 0` | 数字，0=未买 |
| `lTaskRates`（td） | 7754 `getTable("anniversary_pass_liveness")` 后按 id 取；18385 | **对象**：liveness 行 id → 进度值 |
| `taskRates`（dv） | 7939 `this.taskRates[s]`；8121；8152 `getItem(e,"anniversary_pass_task")` 后 `taskRates[e]` | **对象**：task 行 id → 进度值 |
| `receivedTasks`（dt） | 7925 `.includes(t)`；7940 `!includes(parseInt(s))` | **数组**，元素 = **parseInt 后的** task 行 id |
| `endT`（endtime） | 7572-7577 `(e - t)/1e3` | **毫秒时间戳** |

任务领取条件原文 7940：`!receivedTasks.includes(parseInt(s)) && !i.includes(parseInt(s)) && (6 == r.type ? c >= 4 : c >= a)` —— `type == 6` 的任务按 4 格算，其余按表里 `a` 值算。

## 五、`endtime` 单位 = 毫秒（已定，别再试秒）

`TimeMgr.getSTimestamp()` 返毫秒，旁证两处：`scripts2.js:302` `Math.floor((t - e)/864e5)` 当"天"用（864e5 = 一天的毫秒）；`scripts2.js:4906` `.001 * (t - this.timestamp)` 转秒。
面板 `scripts3.js:7574` `Math.floor((e - t)/1e3)` 直接当秒用 ⇒ **`endtime` 必须是毫秒**。工程里其它 handler 的 `now` 口径是秒，这里**必须单独 ×1000**，是很容易踩的一个坑。

## 六、面板行为（`AnniversaryMainUI`，scripts3.js:7460-7578）

- 7521-7525 **直接读配置表** `getTable("anniversary_pass_award")`，建立 `liveness → 行id` 映射与 `_maxNum`。
  ⇒ 面板的"楼"是**配置表驱动**的，节点名就是 award 行 id（7526 `parseInt(a[c].name)`、7549 `getItem(t.name, "anniversary_pass_award")`）。
- 7531-7540 左/右两排按钮，节点名 `xxx_<档号>`，**`C == 1` 是"升级"按钮**，`isVip <= 0` 时显示并换皮 `anniversary_pass_upgrade`。
- 7549 逐楼判定 `b < i.liveness` → 贴 `_lock` 图（`b` = `AnniversaryModel.liveness`）。
- 7572-7577 `update()` 每帧算倒计时，`endT > 0` 才显示 ⇒ **`endtime` 给 0 会让倒计时空白**。
- 7579-7585 监听 5 个事件：`ANN_LIVENESS_CHANGED`/`ANN_UPGRADE_SUCCESS`/`ANN_RECEIVE_AWARD`/`ANN_BUILD_CLOSE`/`ANN_SCORE_RECEIVE_REWARD` —— 与 §2 各回调 dispatch 的事件一一对应。

## 七、配置表（主审自读，`tools\cfg\dump\`）

`anniversary_pass_award.json`：**22 行**，列 `id, liveness, name, picture, award1, award2, award3, evnet`。
- `liveness` 阶梯：0,10,20,30,40,50,70,90,110,130,160,190,220,250,285,320,…（每行一个"楼"）
- `award1` = **免费档**奖励，格式 `"物品id,数量"`，多份用 `|` 分隔（如 `"6034,1|4003,200000"`）
- `award2` = **VIP 档**奖励，同格式
- ★`award3` = **关联任务 id**（7385 `getItem(this.config.award3, "anniversary_pass_task")`；7936/8114 按 `award3 > 0 && liveness 未达` 收集锁定任务）
- `evnet` = 数组（当前全空；表名拼作 `evnet`，与 `anniversary_pass_evnet.json` 一致，**不是笔误，别改**）

## 八、线上现状（已核）

- `core\` 里这 7 个动作**一个 handler 都没有**：全文查 `nniversaryPass` 只有 2 处命中，且都在形状表。
- 形状表只有 2 条 SHAPED 兜底：`buyAnniversaryPassGift {eRet:1,rewardArray:{}}`（:106）、`getAnniversaryPassGift {eRet:1,giftDatas:[]}`（:180）；**其余 7 个 UNKNOWN（黑洞）**。
- `tools\facts\reject-codes.json` 里这批动作 **0 条**拒绝码。

## 九、可复用模板：侠客令（通行证的"亲兄弟"，已在线上跑通）

`core\bz-rpc-server.js:2695-2774`（注释 2695-2716 + `passCardData` 2717-2744 + `buyInvitationCard` 2750-2774 + `passCardAward` 2781-`），是**同一套"通行证"结构的已完成实现**：

| 侠客令（已实现） | 周年通行证（本批） |
|---|---|
| `passCardData {}` → `{eRet:1, passCard:{p,n,award}, goldArr, etime, passObj}` | `getAnniversaryPassData {}` → `{eRet:1, anniversaryPassData:{n,vip,rd,vrd,td,dt,dv}, endtime}` |
| `buyInvitationCard {pass_levelID}`，1/4 分支，**必须回显 pass_levelID** | `buyAnniversaryPass {}`，1/4 分支，**不传也不回显档位**（只买 VIP，比它简单） |
| `passCardAward {passID}` → `{awardArr:[pid,状态], rewardArray}` | `receiveAnniversaryPassAward {id,vip}` → `{id, vip, rewardArray}` |
| 档位 4 档（`pass_level` 价目 `[0,288,600,1000]` 元宝） | 只有 2 档（免费 / VIP），价格**表里没有**（`anniversary_pass_gift` 最高档 980 被 1343 行当参照用过） |
| 活跃度 `s.passLiveness`（来源 `pass_liveness` 7 条） | 活跃度 `n`，**还能直接买**（`buyAnniversaryPassLiveness {num}`） |
| — | 额外有"任务"线（`anniversary_pass_task` + `td`/`dv` 两套进度） |

⇒ 落地方向应**优先镜像侠客令的存档字段与回包口径**（`wrapped()`/`note.eco`/`ach()`/`persist()`），而不是新造一套。

## 十、未验证 / 待核

1. **`gift` 两键的契约**（`getAnniversaryPassGift` 的 `giftDatas` 结构、`buyAnniversaryPassGift` 的 `rewardArray`）—— 等 `scoutP2`，主审尚未自读。
2. **`anniversary_pass_liveness` / `anniversary_pass_task` / `anniversary_pass_gift` 三张表的结构** —— 等 `scoutP3`。
3. **VIP 档价格**：`pass_level` 是侠客令的；周年通行证 2 档的价格在客户端哪里取（`anniversary_pass_gift` 980 只是别处的参照），**未取证**。
4. **`isVip` 的购买前置条件**（有没有要求活跃度/等级）——回调里只看 `eRet`，条件应在服务端，口径**待拍板**。
5. **买活跃度的价格与上限**（`pass_liveness` 是侠客令的活跃度来源表，周年这张是否复用）——未取证。
6. **面板入口**（哪个按钮打开 `AnniversaryMainUI`）——等 `scoutU` 的 Q1。
7. `award3` 关联任务在 UI 里的解锁表现（7384-7385 只看到实例化任务节点）——**未逐行核**。

---

## 十一、★礼物面板 = 通用商店 type 11（giftDatas 行契约，主审自读补全）

`getAnniversaryPassGift` 的回调不是自己开面板，而是**复用通用商店大 UI**：

- `index.js:131051-131054`：`1 == e.eRet` → `dispatch(STORE_SHOW_UI, {type: 11, back: 1, data: e.giftDatas})`
- 唯一的消费者是 `scripts2.js:8385` 注册的 `openBuyGoldEvent`（定义 `scripts2.js:8472`，一张巨大的 type 分支表）
- ★**type 11 分支在 `scripts2.js:8550-8572`**，逐字段原文：

```
} else if (11 == n) {
  this.yukaBtn.active = !1;
  this.isStoreContent = !0;
  h = o.data;
  for (var l in h) {
    var u, g = {
      ID: (u = h[l])[0], Name: u[1], name2: u[2], des: u[3],
      limitnum: u[4], award: u[5], imgname: u[6], money: u[7],
      num: u[8], Type: 11, endTime: u[10]
    };
    this.listData.push(g);
  }
```

⇒ **`giftDatas` 必须是"对象：礼包 id → 数组"，每个子项是按下标取的 11 元数组**：

| 下标 | 字段 | 对应 `anniversary_pass_gift` 列 |
|---|---|---|
| [0] | ID | `id` |
| [1] | Name | `name`（文案 id，如 6007159） |
| [2] | name2 | （表里无此列，给 0 或 ""） |
| [3] | des | `description` |
| [4] | limitnum | `limit`（限购次数） |
| [5] | award | `award`（`"1,60|9864,500|6658,20"` 形式） |
| [6] | imgname | `picture`（`"an_gift1"`） |
| [7] | money | `price`（60/300/680/…） |
| [8] | num | `num`（1/14/14） |
| [9] | （客户端不读） | — |
| [10] | endTime | （表里无此列，给 0） |

- 注意 `u[10]` 是**越界容忍型**读法（短数组只是 `undefined`，不崩）；但 `h[l][0]` 若整行不是数组则必然出错 ⇒ **行必须是数组，不能是对象**（形状表兜底给的 `giftDatas: []` 是空数组，等于货架空，不崩但没内容）。
- 对照 **type 7 分支（8532-8546）**：同为 `[ID,Name,name2,des,limitnum,award,imgname,money,num,?,endTime]`，多一个 `coupon: u.length > 11 ? u[11] : 0`。两套几乎一样，说明这是商店货架的通用行格式。

## 十二、`anniversary_pass_gift` 表（4 行，主审已核前三行原文）

列 `id, name, picture, description, limit, num, award, price`；行 1: `limit 1, num 1, award "1,60|9864,500|6658,20", price 60`；行 2: `limit 2, num 14, price 300`；行 3: `limit 2, num 14, price 680`；第 4 行 price = **980**（与 `bz-rpc-server.js:1344` 的 `GF_BIG_UNLOCK_PRICE = 980` 注释"参照 anniversary_pass_gift 最高档 980"**交叉吻合**，可作该表价格的独立旁证）。

⇒ 币种：`bz-rpc-server.js:1340-1343` 把那套价的单位写作"**元宝**"；周年礼包是否同为元宝、要不要走真实充值，**属待拍板**（本工程不接真实付费，侠客令的先例是**自定离线价**）。

## 十三、买活跃度的钱从哪出（主审已核）

- UI 入口：`scripts3.js:7763`（`AnniversaryMainUI.onClickBuyBtn`，**`liveness >= _maxNum` 时只弹文案 6016349，不给买**）；`scripts3.js:7438`（`AnniversaryBuildingUI.onClickBuyBtn` → `addBuyItemUI({}, 29)`）
- 确认弹窗：`scripts3.js:18432 onBuyClick` → `18435` `var e = this.itemNum * this.getPriceValue();` → `18436` **与 `RoleBaseInfo.gold` 比较** → `18448` `reqBuyAnnPassLiveness(t.itemNum)`
⇒ **买活跃度花的是 `gold`（金条/金币），不是元宝**；单价来自 `BuyItemUI29.getPriceValue()`，公式**未取证**（待拍板时一并定）。
- ⚠ 这同时**推翻了上游"`ANN_PASS_BUY_LIVENESS` 可能已下线"的猜测**：入口真实存在（`scripts3.js:18448`），且有两处弹出点。可达性存疑一条可以销掉。

## 十四、面板入口（W4 侦察 + 主审采信）

`scripts2.js:29878` 取 `AnniButton` 节点 → `29879` 绑 `onClickAnniBtn` → `30996-31003`：`STOP_PLAYER` → 动态 require `AnniversaryModel` → `31001` `reqGetAnnPassData()`。
⇒ 入口是主界面左上栏的**周年按钮**，与 C10 的 GradenNpc 不同，**不需要前置任务**（未读到任何等级/任务门禁）。

## 十五、十三条已消化的待核（对 §十 的更新）

§十 第 1/2/5/6 条已由主审自读解决（见 §十一/§十二/§十三/§十四）。**仍待核**：§十 第 3（VIP 价）、第 4（`isVip` 购买前置）、第 7（`award3` 任务节点解锁表现）与 §十三 的 `getPriceValue()` 公式。
