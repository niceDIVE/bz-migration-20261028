# C12〔管家/帮手〕第 13 批 · 取证与策略（2026-10-27）

> KEY 原文抄自 `relations.md:91-94`。侦察：4 工人小单 4/4 全活（`scoutP1/P2/P3/U-*.md`）+ 主审独立探针（`主审-独立探针记录.md` §一-§十）。
> **对撞结论：零冲突**，工人报告全部采信（§十）。

---

## 一、成员与线上名（双源核对；★=拼写反直觉，禁止"纠正"）

| 键 | 线上名 | 定义行 | 发送点 | 回调 | 请求载荷 |
|---|---|---|---|---|---|
| BUY_BUTLER | `User.buyHelper` | 60397 | scripts3.js:23638 | 23162-23168 | `{helperId}` |
| SET_BUTLER | `User.setHelper` | 60396 | 23632 | 23153-23160 | `{helperId}` |
| BUTLER_DISPATCH | ★`User.dispatch` | 60394 | 23564 | 23120-23127 | `{taskArr, mapId, tgIdMap?}` |
| DISPATCH_AWARD | `User.dispatchAward` | 60395 | 23626 | 23134-23152 | `{}` |
| BUY_BUTLER_VIP | ★`User.buyMonthlyFee` | 60398 | 23662 | 23189-23193 | `{type}` |
| GET_HELPER_CALL_LIST | `User.getHelperCallList` | 60563 | 23248 | 23228-23233 | `{}` |
| CALL_HELPER_BY_ID | ★`User.callHelperId` | 60564 | 23251-23253 | 23235-23245 | `{helperId}` |

## 二、★名单外键（面板开关族；全在 relations.md 440 行附录=未分批；零 handler 零形状）

| 键 | 线上名 | 定义行 | 角色 |
|---|---|---|---|
| ★GET_HOUSE_KEEPER | `User.getHousekeeper` | 60393 | **面板开关**：`delegateUI` 在它 1 分支里 new（23109-23115）。**不并入则 7 键全不可达**（同 C10 getHomeList / C11 GET_DATA）。`reqGetHouseKeeper(1)=手动派遣 / (2)=自动派遣`（98544/98574） |
| SET_TEMPLATE_DATA | `User.setTemplateData` | 60399 | 自动派遣模板（面板内"自动派遣"按钮 → 99146） |
| RECEIVE_NOTICE | `User.receiveNotice` | 60402 | **relations.md:35 归第 4 批"同面板顺手做"**；面板通知区触发（99386/99391） |
| GET_EVALUATE_DATA / PUSH_EVALUATE_DATA | `User.getEvaluateData` / `User.pushEvaluateData` | 60400/60401 | 评价弹窗（delegateButlerUI 的"查看/换管家"按钮） |
| RECEIVE_HELPER_REWARD | `User.receiveHelperReward` | 60403 | 管家奖励领取（`{helperId}`；监听 23222-23226，rewardArray 有守卫） |

★与 C10 的差异：**delegateUI 开面板不会顺手自动发任何 HTTP**（99140/99146/99386 全是按钮触发）——homeSpeicalAward 那种"开面板必崩"陷阱这里不存在；名单外键是否做取决于"要不要让面板上的按钮都能点"，属拍板项。

## 三、回调契约（裸读崩点加粗）

| 键 | 成功分支 | 回包必带 | 非 1 分支 |
|---|---|---|---|
| BUTLER_DISPATCH | 1 | **`o.note.eco.yuanbao`（23125 三连裸读）**、`o.housekeeper`（进 createAutoDispatchTime） | 2→6000371、3→6000335、5→6000372、6→8845、7→6000449、8→6000440 |
| DISPATCH_AWARD | 1 | **`o.housekeeper.noticeArr.length` + `noticeRtm`（23137 裸读）**；`rewardArray` 有守卫；`addEvil` 裸读（可省） | 3→1530；**其余一律→1145（else 兜底）** |
| SET_BUTLER | 1 | **`o.housekeeper.helperId`（23156 裸读）** | 2→6000506 |
| BUY_BUTLER | 1 | **`o.housekeeper.helperIdArr`（23164 裸读）** | 4→`openChargeList()`（充值界面语义） |
| BUY_BUTLER_VIP | 1 | **`o.housekeeper.dueTime`（23191 裸读，毫秒）** | 2→6000402；其余→8845 |
| GET_HELPER_CALL_LIST | 1 | 整个回包透传 `ChooseFollowerUI.setData(e)`；**无 else（静默）** | — |
| CALL_HELPER_BY_ID | 1 | `o.housekeeper` 有守卫（23237），读 `o.housekeeper.e`；其余静默 | — |
| GET_HOUSE_KEEPER（名单外） | 1 | `o.housekeeper`（23116 createAutoDispatchTime）+ 整包 `delegateUI.setData(o, dispatchType)` | 无 else（面板不开，静默） |

## 四、★`housekeeper` 对象 = 权威形状（两个独立来源互证）

来源 A：客户端自带测试夹具 `testFunc`（scripts3.js:23566-23612，含 note 四键 ivch/eco/attrch/eqch）。
来源 B：`templates.json` create 应答的 `housekeeper` 段（W4 抄录，**新档初值**：dueTime=null、noticeRtm=null、type=-1、curTime、canNoticeNum=13）。

字段全集（22 项）：`helperId, dueTime(毫秒), task{}, taskArr[[任务id,?]], noticeArr[], noticeIndex, template, dispatchTime(毫秒), dispatchEndTime(毫秒), autoTime, evaluateType, type, taskRtm(毫秒), noticeRtm, taskNum{}, mapId, templateInitTime(毫秒), templateTask{}, matureArr[], helperIdArr[], helperRewardArr[], e, tgd{地图id:{"任务串":[...]}}`
⇒ 所有回调裸读的字段（helperId/helperIdArr/dueTime/noticeArr/noticeRtm）都在其中；**时间戳全部毫秒**（客户端 `getSTimestamp()` 同为毫秒，98550 直接比较）。

## 五、配置表（W4 抄录）

| 表 | 行 | 列 | 要点 |
|---|---|---|---|
| `helper.json` | **8**（id 1-8） | id, name, des, pic, ani, locate, price, size_scene, size_map, speed, saveTime, task, dialogue, reward, act, show, ability | id 1/2 **price=0（免费管家）**、id 3 起 price=500/…（币种未取证）；`locate`="1147,626,618\|…" 四场景站位；`task`=任务表 id（1003001）；`reward`=[9400,1] |
| `helperAct.json` | **90** | id, group, type2, act, talkname, rate, type1, text | 管家动作/台词库（act="work" 等） |

## 六、线上现状（已核）

- 7 键 + 名单外 5 键在 `core\` **零 handler**；`shapes.json` **零登记**（全 UNKNOWN 黑洞，连 SHAPED 兜底都没有）。
- 存档侧：create 应答已带 `housekeeper` 段（templates.json），说明**存档结构模板已存在**，实现时 `ensureLedger` 大概率要补/沿用该段。
- 拒绝码表 0 条。

## 七、策略草案（待拍板后执行）

**可复用**：C10/C11 的全部套路（`wrapped`/`shaped`/`note`/`grantRewardList`/`annTable()` 式守卫/`todo_shapes.json` 登记/拒绝码双向登记）。管家自带 `note.eco.yuanbao` 消费（23125）与 `addEvil` 善恶值（23145），币种与善恶走既有 note 通道。

1. **存档**：沿用 create 的 `s.housekeeper` 段（模板已存在，缺字段按 §四补）。
2. **生成器** `tools\gen_c12_tables.js` → `core\bz-c12.generated.js`：helper 8 行（price/act/task/reward 关键列）+ helperAct 90 行（按需压缩）。
3. **GET_HOUSE_KEEPER**（并入申报）：回 `{eRet:1, housekeeper:{…22 字段全量…}, note?}`；`dispatchType` 只影响客户端渲染，服务端不用管。
4. **SET_BUTLER / CALL_HELPER_BY_ID**：校验 helperId ∈ helper 表（CALL 还要求已买或免费）→ 更新 `housekeeper.helperId` / `e` → 回 `{eRet:1, housekeeper}`。
5. **BUY_BUTLER**：校验未拥有（helperIdArr）→ 扣价（币种待拍板）→ `helperIdArr.push` → 回 `{eRet:1, housekeeper}`；钱不够 → 4（客户端开充值框）。
6. **BUY_BUTLER_VIP**：`{type}` 校验 → `dueTime = now + N 天`（毫秒）→ 回 `{eRet:1, housekeeper}`；2=已有月卡未到期？
7. **GET_HELPER_CALL_LIST**：回 `{eRet:1, callData:{<helperId>:<状态 2/3>}}`（状态语义：2/3 → 文案 6002408/6002409；未买/免费 = 其它值，W3 只抄到渲染没抄到赋值，需补一小段取证）。
8. **BUTLER_DISPATCH**（最复杂）：档 A 建议"接受派遣 → 扣费（如有）→ housekeeper.task/taskArr/dispatchTime/dispatchEndTime/mapId 落档 → 回 `{eRet:1, housekeeper, note:{eco:{yuanbao}}}`"；真实任务结算（tgd/taskNum/matureArr 的成熟与产出）档 B 再做。
9. **DISPATCH_AWARD**：`dispatchEndTime` 未到 → 3（1530）或 2；到了 → 按 helper.task → 任务表奖励（或自定）发 `rewardArray` + `addEvil` → 回 `{eRet:1, housekeeper, rewardArray, addEvil}`。
10. **登记**：7 键 + 并入键全部登记 `todo_shapes.json`；拒绝码双向登记；`check_shape_freeze` sweep 接 `bz-c12.generated.js`。

## 八、待拍板（附主审建议）

1. **GET_HOUSE_KEEPER 是否并入本批**：不并入 → 面板打不开、7 键全不可达。**建议并入**（回执申报"附录键提前做"，同 C10/C11 先例）。
2. **名单外键做哪些**：面板必然触点 = SET_TEMPLATE_DATA（自动派遣按钮）、RECEIVE_NOTICE（通知区，第 4 批"顺手做"）。评价 3 键（GET/PUSH_EVALUATE_DATA）与 RECEIVE_HELPER_REWARD 在二级面板。
   **建议**：本批做 GET_HOUSE_KEEPER + SET_TEMPLATE_DATA + RECEIVE_NOTICE（面板一层按钮全活）；评价 3 键 + RECEIVE_HELPER_REWARD 沉底（二级面板，点了走静默不崩——待真机验）。
3. **档位**：档 A（上表 1-7 + BUTLER_DISPATCH 派遣落档不结算任务产出）｜档 B（真实派遣任务系统：任务生成/tgd/成熟/产出结算，工作量约 +100%）。**建议档 A**。
4. **买管家币种与价格**：`helper.price`（0/0/500/…）币种未取证（买管家在 delegateButlerUI，未读其渲染）。
   **建议**：实现前补 15 分钟取证；若查不到就自定"元宝、照表价"并申报。
5. **月卡（BUY_BUTLER_VIP）价格与时长**：`{type}` 的价目来源未取证。
   **建议**：自定"type 1 = 300 元宝/30 天"之类并申报；或先取证 delegateButlerUI 的价目渲染。

## 九、未验证 / 风险

1. `callData` 状态值的确切语义（2/3 之外还有什么、未买=?）——W3 只抄到渲染分支。
2. `helper.price` 币种、月卡价目——见 §八.4/5。
3. `BUTLER_DISPATCH` 的 `taskArr` 元素结构（[[5,1]] = [任务id, 数量?]）与 `tgd` 的任务串格式——档 B 前需专项取证。
4. `createAutoDispatchTime(o.housekeeper)` 内部逻辑未读（自动派遣计时，档 B 相关）。
5. `DELEGATE_AUTO_CLEAN_UI` / `FORCE_DISPATCH` 等事件链（23124、98539）未追——档 B 相关。
6. 真机可达性：管家按钮在哪个场景 UI、有无前置（等级/任务）未验（与 C08"入口可达性未验"同级）。
7. `dueTime` 过期后客户端行为（98550-98553 会弹 6000449 并清本地 dueTime）——服务端 GET_HOUSE_KEEPER 要正确回过期态，否则按钮永远"过期"。
