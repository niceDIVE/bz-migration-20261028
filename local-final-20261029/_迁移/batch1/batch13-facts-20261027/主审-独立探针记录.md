# C12〔管家/帮手〕主审独立探针记录（2026-10-27，边读边补）

> 与 4 个工人报告分开存放、互不覆盖，用于对撞。全部行号为本场实测。

## 一、7 键线上名（tools/index.js，双源另核 actions.json 待补）

| 键 | 线上名 | 定义行 |
|---|---|---|
| BUY_BUTLER | `User.buyHelper` | 60397 |
| SET_BUTLER | `User.setHelper` | 60396 |
| BUTLER_DISPATCH | ★`User.dispatch` | 60394 |
| DISPATCH_AWARD | `User.dispatchAward` | 60395 |
| BUY_BUTLER_VIP | ★`User.buyMonthlyFee` | 60398 |
| GET_HELPER_CALL_LIST | `User.getHelperCallList` | 60563 |
| CALL_HELPER_BY_ID | ★`User.callHelperId` | 60564 |

## 二、★名单外键（面板开关族，全在 relations.md 440 行附录=未分批；零 handler 零形状）

| 键 | 线上名 | 定义行 | 证据 |
|---|---|---|---|
| ★GET_HOUSE_KEEPER | `User.getHousekeeper` | 60393 | **delegateUI 面板在它 1 分支里 new**（scripts3.js:23109-23115，`delegateBundle/prefabs/delegateUI` + setData(o, dispatchType)）→ **不并入本批则 7 键全不可达**（同 C10 getHomeList / C11 GET_DATA） |
| SET_TEMPLATE_DATA | `User.setTemplateData` | 60399 | 自动派遣模板保存（23128，文案 6000439/6000332/6000320） |
| GET_EVALUATE_DATA | `User.getEvaluateData` | 60400 | 评价弹窗（23169-23182；else 分支裸读 `o.housekeeper.dueTime` 23179） |
| PUSH_EVALUATE_DATA | `User.pushEvaluateData` | 60401 | 提交评价（23183-23187） |
| RECEIVE_NOTICE | `User.receiveNotice` | 60402 | **relations.md:35 归第 4 批"同面板顺手做"（HomeMainUI）** |
| RECEIVE_HELPER_REWARD | （定义行待查） | — | 23664 `reqReceiveHelperReward` 发 `{helperId}` |

## 三、发送点（scripts3.js，逐字核准）

| 方法 | 行 | 键 | 载荷 |
|---|---|---|---|
| `reqGetHouseKeeper(t)` | 23553-23556 | GET_HOUSE_KEEPER | **无**（t 存为 this.dispatchType） |
| `reqButlerDispatch(t,e,o)` | 23557-23565 | BUTLER_DISPATCH | `{taskArr: t(缺省[]), mapId: e, tgIdMap?: o(非空才带)}` |
| `reqButlerAutoDispatch(t,e,o)` | 23616-23624 | SET_TEMPLATE_DATA | `{template: t, autoTime: e, mapId: o}` |
| `reqButlerAward()` | 23625-23627 | DISPATCH_AWARD | `{}` |
| `reqSetButler(t)` | 23628-23633 | SET_BUTLER | `{helperId: t}` |
| `reqBuyButler(t)` | 23634-23639 | BUY_BUTLER | `{helperId: t}` |
| `reqReceiveNotice(t)` | 23640-23647 | RECEIVE_NOTICE | `{index: t}`（t=-1 发 0） |
| `reqGetEvaluate(t)` | 23648-23651 | GET_EVALUATE_DATA | 无 |
| `reqPushEvaluate(t,e)` | 23652-23658 | PUSH_EVALUATE_DATA | `{helperId, type}` |
| `reqBuyButlerVip(t)` | 23659-23663 | BUY_BUTLER_VIP | `{type: t}` |
| `reqReceiveHelperReward()` | 23664-23668 | RECEIVE_HELPER_REWARD | `{helperId: this.helperId}` |

## 四、回调契约（监听区 scripts3.js:23109-23199，逐字核准）

- **BUTLER_DISPATCH**（23120-23127）：1 → `createAutoDispatchTime(o.housekeeper)` + `o.note.eco.yuanbao`（23125 **三连裸读，note 缺就 TypeError**）；
  非 1：2→6000371、3→6000335、5→6000372、6→8845（充值框语义）、7→6000449、8→6000440。
- **DISPATCH_AWARD**（23134-23151）：1 → `o.housekeeper.noticeArr.length`（**裸读**）+ `o.housekeeper.noticeRtm`（null 比较）；
  `o.rewardArray` **有 hasOwnProperty 守卫**（23138）；`o.addEvil` 裸读（23145，>0/<0 比较）；非 1：3→1530、**其余一律 →1145**（else 兜底）。
- **SET_BUTLER**（23153-23160）：1 → `o.housekeeper.helperId`（裸读）+ 文案 6001256；2 → 6000506。
- **BUY_BUTLER**（23162-23168）：1 → `o.housekeeper.helperIdArr`（裸读）；4 → `openChargeList()`（充值界面语义）。
- **BUY_BUTLER_VIP**（23189-23193）：1 → `o.housekeeper.dueTime`（裸读）+ 6000398；2 → 6000402；**其余 → 8845**。
- SET_TEMPLATE_DATA（23128-23132）：1 → housekeeper + 6000439；2→6000332、3→6000320。
- GET_EVALUATE_DATA（23169-23182）：1 → delegateAlert/butlerUI 弹窗 setData(o)；**else → `o.housekeeper.dueTime` 裸读（23179）** + 6000449。
- PUSH_EVALUATE_DATA（23183-23187）：1 → 6000419；2 → 6000449；其余 → 6000420。

## 五、★客户端自带测试夹具 = housekeeper 权威形状（scripts3.js:23566-23612 `testFunc`）

`eRet:1, note:{ivch:{4094:3,4203:990}, eco:{}, attrch:{}, eqch:{}}, housekeeper:{...20 字段...}`：
`helperId:1, dueTime:1763056763408(毫秒), task:{}, taskArr:[[5,1]], noticeArr:[], noticeIndex:-1, template:null, dispatchTime:毫秒, dispatchEndTime:毫秒, autoTime:-1, evaluateType:1, type:1, taskRtm:毫秒, noticeRtm:0, taskNum:{}, mapId:1120, templateInitTime:毫秒, templateTask:{}, matureArr:[], helperIdArr:[], helperRewardArr:[], e:0, tgd:{1:{"1680,1680,1858,1804":[1]}}`
⇒ 实现时 `o.housekeeper` 必须按这套字段给（尤其回调裸读的 helperId/helperIdArr/dueTime/noticeArr/noticeRtm）；note 四键齐全。
（与 W4 的 templates.json create.housekeeper 对撞后定稿。）

## 六、线上现状

- core 零 handler（grep getHousekeeper 0 命中）；shapes.json 里 7 键 + 名单外 5 键**全部零登记**（UNKNOWN 黑洞）。
- 配置表：`helper.json`(3,155 B) + `helperAct.json`(9,814 B)（结构等 W4）。

## 七、未验证 / 待补

1. ~~GET_HELPER_CALL_LIST / CALL_HELPER_BY_ID 的监听与发送细节~~ ✅ 已自读（见 §八）。
2. ~~`RECEIVE_HELPER_REWARD` 的定义行~~ ✅ `User.receiveHelperReward`（index.js:60403，附录键）。
3. `helper.json` / `helperAct.json` 结构、`create.housekeeper` 存档形状、面板入口 —— W4 已交并与 testFunc 夹具对撞一致（见 §九）。
4. `checkBought(t)`（23550-23552）用 `helperIdArr.indexOf(parseInt(t))` —— helperIdArr 元素需可 parseInt 比较。
5. `dispatchType`（reqGetHouseKeeper 的参数）如何影响 delegateUI —— 未读 setData。
6. helper.price 的**币种**（0/0/500/…）未取证——呼叫面板不渲染价格，买管家在 delegateButlerUI（98555 起），待实现前补。

## 八、呼叫线契约（主审自读补全，scripts3.js:23222-23254）

- **RECEIVE_HELPER_REWARD** 监听 23222-23226：1 → `rewardIdArr.push(helperId)`；`o.rewardArray` **有守卫**（23225）。
- **GET_HELPER_CALL_LIST** 监听 23228-23233：1 → `delegateBundle/prefabs/ChooseFollowerUI` + `setData(e)`（**整个回包透传**）；**无 else（静默）**。发送 23247-23249：`{}`。
  UI 消费链（scripts3.js:20104-20110，W3 同证）：`callData` 是**对象映射 helperId→状态**，`getItem(e,"helper")` 查表，`price<=0 || checkBought(id)` 判可呼叫。
- **CALL_HELPER_BY_ID** 监听 23235-23245：1 → `o.hasOwnProperty("housekeeper")` **有守卫**，读 `o.housekeeper.e` → followId；
  followId==helperId 决定隐藏/显示管家；随后可发 **`CTS_HOUSE_KEEPCH_REQ` {roleId, houseKeep}（socket 通道，非 HTTP）**。
  发送 23250-23254：`{helperId: t}`（来源 33481 FollowerItem 点击）。
- 呼叫面板状态文案：6002407/6002408/6002409，按钮 6002410/6002406（33473-33478）。

## 九、入口与 delegateUI 行为（主审自读，scripts3.js:98538-98577）

- `onClickDelegate`（98544）→ `reqGetHouseKeeper(1)`；`onClickAutoDelegateBtn`（98574）→ `reqGetHouseKeeper(2)`。
- `onClickHire`（98548）→ 客户端先判 `dueTime` 过期（过期弹 6000449），未过期开 `delegateButlerUI`（买管家面板）。
- `onClickCheck`（98563）→ 未过期 `reqGetEvaluate(1)`；`onClickChangeButler`（98570）→ `reqGetEvaluate(2)`。
- ★**delegateUI 模块（98707-100428）开面板不会顺手自动发任何 HTTP 请求**（reqButlerDispatch/reqButlerAutoDispatch/reqReceiveNotice 都是按钮触发，99140/99146/99386/99391）——C10 homeSpeicalAward 那种"开面板必崩"陷阱这里**不存在**。
- 面板内按钮触点：派遣（BUTLER_DISPATCH）、自动派遣（SET_TEMPLATE_DATA）、通知（RECEIVE_NOTICE）、买管家（BUY_BUTLER，delegateButlerUI）、月卡（BUY_BUTLER_VIP）、呼叫（CALL_HELPER_BY_ID，ChooseFollowerUI）。

## 十、与工人报告的对撞结论（2026-10-27 10:2x）

四份报告（scoutP1/P2/P3/U）已逐行核：**与主审独立探针零冲突**。W2 额外识别出 `User.dispatch` 泛化名陷阱与 23611 模拟事件；W3 额外挖出 callData 消费链与 33481 载荷来源；W4 的 create.housekeeper（含 curTime/canNoticeNum 两个 testFunc 没有的字段、type:-1/noticeRtm:null/dueTime:null 的"新档"初值）与 testFunc 夹具字段集一致。全部采信。
