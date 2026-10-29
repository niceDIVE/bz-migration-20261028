# EXECUTION（v2.7.1 三件拍板）

## 轮 29（2026-10-27 21:xx）A 轮第 1 批 C19〔技能皮肤商店〕落地（提速方案首批，7 键全做）

- **取证（三工人全活 + 主审对撞）**：`batch19-facts-20261027\C19-取证与策略.md`。三大发现：
  ①7 键全在 scripts3.js `SkinModel`（82783-83011），无死键；监听 82801-82807 / 发送 82810-82894。
  ②**双商店结构**：type=1 行（22）卖**道具**（shop.item=6658 等，item 表 Type=2）；type=2 行（13）**直售 skillskin id**（item=17/2/23…全在 skillskin 1..39，生成器已构建期校验）。`shopData.ds={行id:已购数}`。
  ③**两个门**：GET_SKILL_SKIN_SHOP 回 eRet==1 → showShop 开 SkinShopUI（82913）；GET_SKILL_SKIN_ACTIVE_SHOP → dispatch GET_SKIN_ACTIVE_DATA → 活动页 1027 切页开 SkinActiveShopUI（scripts2:28556/28963-28964/29214）。
- **默认拍板适用**：#1（price 无币种列 → 元宝）、#2（窗口 2017/2026-08 已过期 → 常开 30 天续期）、#9（刷新 20 元宝/次成本）、#10（皮肤无卖出口 → 不净赚）、#12（数值自定申报）。
- **实现**：`gen_c19_tables.js` → `bz-c19.generated.js`（35 货架/39 皮肤/13 直售行已校验）；7 handler + sk 助手 5 个；LoadGame 补 `skillSkinData{skinData,weapToSkinData}` 回放（index.js:111859）；REJECT_CODES/ALLOW 各 7；todo_shapes +7；双处接线。
- **门禁**：形状 **371 动作 diff 0**（47 项 diff / 7 条 planned 规则；★数字叶子坑：`shopData.ds.1` 叶子是 "1"、`skillSkinWeap.0` 叶子是 "0"，规则必须写数字）｜reject-codes **136/153/231**｜lint **38 发放型 OK 36 白名单 2 待查 0**（WARN rewardUFO signCode）｜acceptance **57/57**（c19-smoke 10 条收编）。
- **真机全链（ver=hcce22f0f，selfCheck 1426，pid 2563 不变）**：货架门（ds 22 行 price 20）→ 买道具行 1（**-5 元宝，6658+1，ds.1=1**）→ 刷新（-20 元宝）→ 活动商店（13 行 endTime 未来）→ **买皮肤 35（免费档，skinData.35=1）** → 重复购 eRet 2。存档核实 `skinShop={bought:{1:1}}`、`skinData={35:1}`、yuanbao -25。
- **存档变动申报**：-25 元宝（买 6658 道具 5 + 刷新 20），得 6658×1 + 皮肤 35。
- A 轮回执攒到 12 批全做完统一交（上游格式）。**本批未单独回执。**

### 轮 28 追加（2026-10-27 21:xx）上游「提速方案」接入：合并轮次 + 防白拿 lint + addItem 核查

- 上游包 `_incoming\下游包-提速方案-解包\`（用户已同意）：**剩下 61 批合 5 轮（A–E）+ F（370 孤立动作）**，每轮只交一份回执；符合《默认拍板》12 条的口径直接视为追认；防白拿交 lint 自动把关。
- **接入（一次性）**：
  1. `tools\lint_freebie.js` + `tools\freebie_allow.json` 已放入 tools\（上游原文件）。
  2. `acceptance.js` 已加第 4 个 checker：`node tools/lint_freebie.js <hotfix-patch/core/bz-rpc-server.js>`（args 支持，lint 默认路径指向仓库根 core，本项目实际在 hotfix-patch/core → 传绝对路径）。**acceptance 56/56 绿**。
  3. **addItem 核查（A 轮回执项）**：客户端**有** send 点 —— index.js:65353-65358 `InventoryModel.addItem` → `sendRequest(ADD_ITEM)`，监听 64912（eRet==2 → getText(448)）→ 按上游规则 **改成 eRet 2 拒绝 + 删除白名单 addItem 行**（现白名单 2 条：passCardAward/useItem）。
- **lint 结果**：发放型 handler **37 个，OK 35，白名单 2，待查 0，exit 0**；**WARN 1 条**：`rewardUFO` 资格判断用 `p.signCode`（防作弊签名，不是档位/身份/胜负——回执写这句）。
- 门禁：build ver=**hb845ce37**（selfCheck 1401）｜形状 **364 动作 diff 0**（addItem 7 项 diff 1 规则覆盖后冻结）｜reject-codes **129/146/221**｜acceptance **56/56**。
- 真机：`addItem {itemID:1,itemNum:1}` → **eRet 2**，家园正常；pid 2563 热重载不变。
- 备份：`_backup\20261027-200031-pre-lint\`（acceptance/freebie_allow/core/reject-codes）。
- **轮次计划**（按名称对齐 relations.md）：A 轮 = 技能皮肤商店(19) / HLEX 兑换(22) / 时装背包商店(29) / 秘籍礼包(40) / 春节常驻礼包(41) / 道具选奖(42) / 骰子地块(44) / 春节兑换(50) / 消费返利(57) / 房屋塔商店(59) / GFUI 礼包(67) / 肉鸽商店(74)，共 12 批；B/C/D/E/F 见上游文档。

## 轮 28（2026-10-27 20:xx）第 16 批 C15〔七日回归〕取证 + 实现 + 真机全链（档 A）

- **取证（W1/W2 全活 + W3 阵亡主审接手 + 主审对撞）**：`batch16-facts-20261027\C15-取证与策略.md`。三大发现：
  ①**12 键全活** —— 预判的"EvName 同名"陷阱实为双用同名（45812-45815 EvName 本地事件 + 60242-60247 HttpConst RPC 定义都有），12/12 键定义齐（`User.` 前缀）；`SEVEN_DAYS_AWARDS` 大写 S（60035）与 returnSevenDaysAwards 是两个键。
  ②**面板门 = GET_RETURN_SEVEN_DAY_DATA** —— 活动面板点 1018 → reqGetReturnSevenDayData → eRet==1 才切页开 ReturnUI（scripts2:28808→28970-28977→map[1018]→29214）；GET_RETURN_GIFT 只刷新礼包页不新开面板。
  ③**UI 契约**（scripts3:63532-63626 ReturnModel + 63300-63994 面板）：sevenDaysArr=状态数组（1 可领/2 已领，长度=已过天数）、oldReturnData={tasks:11×[id,?,state],liveness,livenessDatas}、giftDatas=[{ID,nameID,getGold,money,isBuy,isAward}]、giftAwards=[[id,"1"]]。
- **配置表**（主审自做，W3 阵亡）：Return_SevenDay 7 档 / Return_Daily 11 行 / Return_Award 5 档（20-100）/ Return_store **付费 3 档**（¥25/68/98）/ sevenday（另一个新手七日）/ springsword_*（窗口 2026-08 已过期）；constant360=**14 天期**、436=30。
- **拍板（用户）：档 A** —— 回归 6 键最小闭环；4 键不做挂 ISSUE-15。
- **实现**：`tools\gen_c15_tables.js` → `core\bz-c15.generated.js`（14 天/7 档/11 任务/5 活跃度/3 礼包）；8 handler + rtTable/rtRead/rtEnsure/rtDays/rtSevenArr 助手；REJECT_CODES/ALLOW 各 8；todo_shapes +8；build-handlers 与 sweep 两处都接。
- **口径**：唯一产出=七日奖励（**每天一次、14 天期 7 份封顶**，计时循环有每日上限合规）；任务/活跃度诚实空态（state 0/liveness 0，不伪造）；礼包纯展示（isBuy=0 按钮禁用）+ 领取拒（付费无通道防白拿）。
- **门禁**：形状 **364 动作 diff 0**（65 项 diff / 8 条 planned 规则覆盖）｜reject-codes **OK 128/145/220**｜acceptance **55/55**（c15-smoke 10 条收编）｜c14 11/11、c13 9/9、c12 14/14、c11 14/14、c10 18/18、r14 3/3 回归绿。
- **真机全链（ver=h45035127，selfCheck 1400，pid 2563 不变）**：探针 `probe\c15-return-chain.js` → 门（sevenDaysArr=[1], triggerTime=now）→ **领第 1 天（arr=[2], reward={1:50, 8905:20}）** → 任务 11 个 liveness 0 → 礼包 3 档（isBuy 0/money 25）→ 刷新 giftAwards=[] → **同日重复领 eRet 2**。存档核实 `retAct={trigger,claimed:{1:1}}`、gold +50、bag 8905=20。
- **存档变动申报**：领取回归第 1 天奖励（金条 50 + 8905×20），无其它变动。
- **⚠ 备份缺口**：本批 core 改动前未单独备份（轮 27 备份仍在）→ 下批开工前补 `_backup\20261027-2*`。
- 回执：`_incoming\下游回执-第16批C15-20261027.zip`。

## 轮 27（2026-10-27 18:xx）上游第 14 批验收通过（C13 收口）+ 第 15 批 C14〔斗狗〕取证+实现+真机全链（档 A）

- **上游 `_incoming\下游包-第14批C13验收-解包\`（纯文字页无代码）**：**C13 验收通过**。核账：爪子只有首开赠送一个来源（三档各 3，firstGrantDone 一次性）、每抓扣一爪；买刷新累计限 3 次/100 元宝；池空自动刷新但无爪抓不了 → 整链有上限，刷不出东西。**六项自定口径全部追认**；3 死键跳过 + signCode 只验存在（档 B）追认。**新约束**：以后若给爪子加商店/活动获取途径，须重核"花多少 → 8143 产出 → 8143 换什么"不净赚。第 13 批正式收口；**放行第 15 批**。
- **C14 取证（4 工人全活 + 主审对撞零冲突）**：`batch15-facts-20261027\C14-取证与策略.md`。**★翻案**：交接"HttpConst 7 键全 0"是 grep 模式错（前场搜的是小写线上名）——真实引用是**大写常量名**，**7/7 键全部存活**（12 处 send/listen，index.js:31671/31760/31763/31777/31843/58047/58050/58053/58224/58229/58243/105558）。家族定性：家园狗三件套（FeedDog/lookDogLog/DogBattleResult，HomePlant 偷菜守卫狗）+ 狗战双管理器（DogFightMgr mp 版 ENTER_PVEDOG_FIGHT / DogFightSingMgr 1v1 版 REQ_DOG_PARTNER_*）+ RogueMpFightMgr 复用（ENTER_PVE_ROGUE_FIGHT）。**另两个反直觉事实**：①`startDogPartnerFight` 全客户端 **0 调用方**（DogFightSingMgr 是死键）；②mp 版响应无同键监听者（多人回放引擎家族 = C08 ISSUE-8 同口径），好友家 enterOtherHome 未实现 + stealCrop 档 A 锁 → 狗战路径当前不可达；无 NPC 入口（NpcToFuncType 285 行 switch 0 dog、中文「狗」0）、无专属配置表（452 表 0 命中）。
- **拍板（用户）：档 A** —— 做本家可达 3 件（FeedDog 真扣狗粮/进度/升大狗、lookDogLog 空日志、DogBattleResult 桥接），4 键不做挂 ISSUE-14；建横 getHomeList.dog 0→建模对象 {id,s,t,p,n}。
- **实现**：`tools\gen_c14_tables.js` → `core\bz-c14.generated.js`（狗粮 6285、const128=10000、const129=100、小狗 11193→大狗 11194，全部 cfg dump 驱动可复跑）；3 handler + dogTable/dogRead/dogView 助手；REJECT_CODES/ALLOW 各 3；todo_shapes +3；build-handlers.js 与 check_shape_freeze.js sweep **两处都接**。
- **门禁**：形状 **356 动作 diff 0**（10 项 diff 4 规则覆盖：getHomeList.dog 子树 6 + FeedDog 2 + lookDogLog 1 + DogBattleResult 1）｜reject-codes **OK 120/137/209**｜acceptance **54/54**（c14-smoke 10 新条收编）｜c13 14/14、c12 14/14、c11 14/14、c10 18/18、r14 3/3 回归绿。
- **★顺序教训**：首跑 build 自检被 `shape:FeedDog:eRet` 拦下（实现前 shapes 的 FeedDog 是 eRet:1 空壳，实现后空请求回 2）→ **必须 gen_shapes 之后再 build**（本轮 gen_shapes 在 build 失败后跑，第二轮 build 才过）。
- **真机全链（ver=h8e6fe0e6，selfCheck 1373，pid 2563 不变——本轮 MuMu 重启过，新 pid）**：探针 `probe\c14-dog-chain.js` 走进程内 harness：bzSeedBag 灌狗粮 6285×5 → getHomeList（**dog={id:11193,s:0,t:0,p:0,n:0}**）→ FeedDog {6285,2}（**eRet1 progress 200、狗粮 5→3、ivch 回写 3**）→ lookDogLog（log 空数组）→ DogBattleResult（win=true/endTime=0）。存档落盘核实 `dog={"id":11193,"p":200,"s":0,"t":0}`、`bag 6285=3`。**存档变动申报：测试灌入狗粮 6285×5（维护动作 bzSeedBag，写前备份），消费 2 剩 3**。**未验证**：狗在 UI 的渲染（getHomeList.dog 已由探针证明，属客户端渲染行为，未开家园截图）。
- 备份：`_backup\20261027-181532-pre-c14\`（core/todo_shapes/shapes）+ `_backup\20261027-182525-pre-c14-docs\`（EXECUTION/OPEN-ISSUES）。
- 遗留 → ISSUE-14（OPEN-ISSUES）：4 不做键挂账等好友家批次；喂狗无产出仅消耗；狗战路径锁死。

### 轮 27 追加（2026-10-27 19:xx）上游第 15 批验收**通过** + 一行修落地（第 15 批收口）

- 上游 `_incoming\下游包-第15批C14验收-解包\`（纯文字页无代码）：**C14 验收通过**。核账：喂狗只消耗狗粮无产出、升大狗只改 s.dog.id、DogBattleResult 只重置状态不发奖励 → 整链刷不出东西。**五项自定口径全部追认**；4 个不做键挂 ISSUE-14 追认，狗战与好友家（第 50 批）一起解锁。**新约束**：解锁狗战时补核——DogBattleResult 目前认客户端上报 win，将来若给胜利加奖励必须服务端判定 + 每日上限。
- **一行修（上游指定，已落地）**：FeedDog 的 `s.bag` 守卫原来写在读取之后 → 新档缺 s.bag 先读会抛错（读在写前、不写坏存档）。已挪到 `loadSave()` 下一行（core bz-rpc-server.js FeedDog 顶部），并加 c14-smoke ⑩ 回归用例（新档 delete bag → eRet 2 不抛错、磁盘快照不变）。**上游说不用单独回执，下批一起带上。**
- 门禁复跑：build ver=**h29225786**（selfCheck 1373）、acceptance **54/54**、c14-smoke **11/11**（+⑩）、形状 diff **0**、拒绝码 **120/137/209**、热重载 pid 2563 不变。
- 真机复验：探针 c14-dog-chain 复跑 → **progress 200→400、狗粮 5→3、ivch 3、日志/结算正常**。
- 第 15 批（C14）**正式收口**。下一步：按 relations.md 开第 16 批。

## 轮 26（2026-10-27 11:xx）上游第 13 批验收回执落地（管家奖励防刷）+ 第 14 批 C13〔UFO 夹娃娃〕取证+实现+真机全链

- **上游 C12 有条件通过** + 白拿口：dispatchAward 每 30 分钟可无限领 helper.reward，且领前换管家可领别人的。修法（上游包基于合并版 7C7CD7AC，整文件采用）：dispatch 落档记 `P.dispatchHelper`、领奖按它算、每位管家一次性（`helperRewardArr` 已有 → 发空 `{}` 派遣照常成功）、发过才 push、领完清 dispatchHelper。c12-smoke 上游 14 用例版（+⑧b）。**五项口径全追认**（幂等购买/月卡/30 分钟/callData/档 A+3 并入键+mapId 自愈通道获好评）。
- **C13 取证（4 工人 4/4 全活 + 主审对撞零冲突）**：`batch14-facts-20261027\C13-c13-取证与策略.md`。三大发现：①★3 死键（GET_UFO_CATCHER_TASK/REWARD_UFO_CATCHER_TASK/BUY_UFO_GAME_COIN 全 bundle 零调用点，同 C10 SEED_CROP）；②★数据源不在配置表——**rewardPool 由服务端下发**（{难度id:数量}，客户端 package_difficulty 表只管摆位物理）；③★REWARD_UFO 带**防作弊签名 signCode=md5(2*signId+37)**；活动闸 = active 37"圣诞抓娃娃"（窗口 2026-05-27→06-03 已过期→自定常开）。全批字段有守卫（崩点趋零）。入口 = 夹娃娃机 NPC（NpcFuncType97，index.js:87583）。
- **拍板四项（用户）**：跳过 3 死键｜抓取服务端权威（忽略客户端 packages）｜照扣爪子+活动常开｜signCode 验存在。
- **实现**：gen_c13_tables → bz-c13.generated.js；4 handler（getUFOCatcherData/rewardUFO/useUFOrefresh/buyUFORefreshTimes）+ dl 助手 5 个；REJECT_CODES/ALLOW 各 4；todo_shapes +4。
- **★新坑**：**模板新档 `s.bag` 缺位**——首开赠送走 grantRewardList→bagAdd 时 `s.bag` undefined → `Cannot read properties of undefined (reading '8117')` @ bagAdd:786 → catchNoCode → 排放成 `{}`（diff 每键 1 行的鉴别特征）。修复：dlEnsure 确保 s.bag 存在。**教训：新档上发物品前必须确保 s.bag 存在。** 另：构建期双向比对再抓 core/JSON 漂移（getUFOCatcherData.noTable 漏登记）。
- **门禁**：形状 **356 动作 diff 0**（19 项 diff 4 规则覆盖）｜reject-codes **OK 117/134/202**｜acceptance **53/53**｜c13-smoke 9/9｜c12 14/14、c11 14/14、c10 18/18、r14 3/3 回归绿。
- **真机全链（ver=h3b555bcf，selfCheck 1371，pid 不变）**：getUFOCatcherData（**free=1 赠送、items=7 上机**）→ useUFOrefresh（池重生成、signId+1）→ rewardUFO gear0（**抓中难度 2 → 8143×30、池余 6**）→ buyUFORefreshTimes（**refreshTimes=1/bought=1/-100 元宝**）。存档变动均为正常玩法（消费 100 元宝，得 8143×30 + 爪子 9 把 + 免费刷新 1）。
- **验收**：工人 9 条命令独立复跑 **9/9** + 主审抽样复核一致。
- 备份：`_backup\20261027-113000-pre-c13\`（core/reject-codes/todo_shapes/两 docs/c12-smoke）。
- 回执：`_incoming\下游回执-第14批C13-20261027.zip`。
- 遗留 → ISSUE-13（OPEN-ISSUES）：死键跳过申报 / 档 B（真 signCode md5、packages 校验、任务链）/ 概率曲线 / 爪子来源 / NPC97 可达性。

## 轮 25（2026-10-27 11:xx）上游第 12 批验收回执落地：VIP 白领口修复合并 + 口径全追认 + 回执合一

- **上游有条件通过** + 一个白领口：`receiveAnniversaryPassAward` 的 VIP 档只认请求 `vip=1`，不核对
  `s.annPass.vip` 是否真买过 → 不买 VIP 可领走 22 阶 VIP 奖励（上游在 /tmp 复现实证）。
- **合并**（上游包基于 C11 版 core AB7BE4F9，我们 core 已叠加 C12 → 不能覆盖、按修法手工合并）：
  ①handler 加 notVip 门（claimed 之后、livenessLow 之前：`vip && P.vip!==1 → noteReject notVip，eRet 2 不写档`）；
  ②REJECT_CODES receiveAnniversaryPassAward 加 `notVip: 2`（双向 JSON 同步）；
  ③test\c11-smoke.js 整体采用上游 14 用例版（纯增量 +⑤b 白领回归）。
- **四项自定口径全部追认**（endtime 续期不清已领记录、VIP 300、活跃 10 gold 上限 565、礼包元宝限购）。
- **门禁**：ver=**h1cc3e18f**（selfCheck 1357）｜reject-codes OK **113/129/191**（notVip +1 点）｜diff **0**｜
  acceptance **52/52**｜**c11-smoke 14/14**（上游用例打在合并版 core 上=功能等价实证）｜c12 13/13、c10 18/18、r14 3/3。
- **部署**：pid 22577 不变，真机轻探正常（面板开 / 重复领奖拒绝路径不动档；notVip 负例设备侧因已购 VIP 不可复现，由 smoke ⑤b 覆盖）。
- **回执合一**（上游指令"两件事同一份回执交"）：`_incoming\下游回执-第13批C12-20261027.zip` 重建
  （78 条目，含修复合并版 core + 14 用例 smoke + 增补 §九）：md5 `E3FB3FFEEEC0D89DA90C7DEA7763EBCB`。
  ⚠ 重建时踩 `Copy-Item -Recurse` 目标已存在会**嵌套复制**（78→138 文件）→ 清空重拷修复。
- 备份：`_backup\20261027-104500-pre-c11fix\`（合并前 core/smoke/reject-codes 三件）。

## 轮 24（2026-10-27 10:xx）第 13 批 C12〔管家/帮手〕取证 + 实现 + 真机全链（10 动作，档 A）+ ★真机崩修复

- **取证（4 工人小单 4/4 全活 + 主审独立探针，对撞零冲突）**：`batch13-facts-20261027\C12-c12-取证与策略.md`。
  三大发现：①★`GET_HOUSE_KEEPER`（`User.getHousekeeper`，60393）不在 C12 名单（440 行附录未分批）但 **delegateUI 面板在它 1 分支里 new**（23109-23115）→ 第三次"面板开关不在名单"（同 C10/C11）；②★客户端自带 `testFunc` 夹具（23566-23612）= housekeeper 22 字段权威形状，与 templates.json create 双源互证，**时间戳全毫秒**；③delegateUI 开面板**不自动发 HTTP**（无 C10 homeSpeicalAward 式必崩陷阱）。
  线上名三雷：`BUY_BUTLER_VIP→User.buyMonthlyFee`、`CALL_HELPER_BY_ID→User.callHelperId`、`BUTLER_DISPATCH→User.dispatch`（泛化名）。
- **拍板四项（用户）**：并入 GET_HOUSE_KEEPER｜加 SET_TEMPLATE_DATA+RECEIVE_NOTICE（评价 3 键+奖励领取沉底）｜档 A｜买管家照表元宝价、月卡 300 元宝/30 天。
- **实现**：gen_c12_tables（helper 8 行 + **locateScenes 白名单**）→ bz-c12.generated.js；10 handler（hkRead/hkEnsure/hkDataOf/hkTable/hkOwned 助手）；REJECT_CODES/ALLOW 各 10；todo_shapes +10；**登记/守卫/eco 三条 C11 教训全部提前规避**。
- **★真机崩（修复闭环）**：dispatch 成功（mapId=1008）后 `DelegateMgr.createRoute3` **每帧**抛 `Cannot read property '0' of null`（index.jsc:22681）——管家路线配置只在 helper.locate 的 4 场景。修复：mapId ∈ locateScenes 校验（不合法回 2）+ **坏存量派遣态允许覆盖重派的自愈通道**（award 有 30 分钟时间闸，否则崩无法解除）。真机复验：1008 正确拒 2 → 1147 覆盖成功 → 崩溃循环停（日志 5 秒无 err）。
- **门禁**：形状 **352 动作 diff 0**（98 项 diff 10 规则覆盖；mapId 修复后 dispatch 30 项重冻）｜reject-codes **OK 113/129/190**｜acceptance **52/52**｜c12-smoke 13/13（含非法 mapId 用例）｜c10 18/18、c11 13/13、r14 3/3 回归绿。
- **构建期拦截两连**：双向比对抓 `buyMonthlyFee.badType` core/JSON 码漂移；planned 脚本漏 META → 冻结被拒（C10 冻结前校验按设计工作）。
- **真机全链（ver=he39800b9，selfCheck 1357，pid 不变）**：getHousekeeper（面板数据）→ buyHelper 3（-500 元宝）→ setHelper/callHelperId（helperId=3/followId=3）→ getHelperCallList → dispatch（触发崩 → 修复 → 自愈，崩停）→ dispatchAward（未到拒 3）→ buyMonthlyFee（dueTime=now+30d，-300 元宝）→ setTemplateData/receiveNotice（落档/no-op）。存档变动均为正常玩法（消费 800 元宝）。
- **验收**：工人 9 条命令独立复跑 **9/9** + 主审抽样复核一致。
- 备份：`_backup\20261027-102337-pre-c12\`（69 文件 3,690,579 B，**含 todo_shapes.json**）。
- 工件：`batch13-facts-20261027\`（取证与策略 / 执行记录 / 主审探针 / scoutP1-P3+U / 工单 / probe_c12_flow.js / tmp_add_reject_c12.js / tmp_planned_c12.js / verify-c12-worker.md）。
- 回执：`_incoming\下游回执-第13批C12-20261027.zip`（78 条目，解包自验过）。
- 遗留 → ISSUE-12（OPEN-ISSUES）：评价 3 键+奖励领取沉底 / 档 B 派遣任务系统 / callData 语义 / helper.task 奖励链 / 入口可达性。

## 轮 23（2026-10-27 05:xx）第 12 批 C11〔周年通行证〕取证 + 实现 + 真机全链（7 键全做）

- **接手核验**：pid 22577 / `impl=h90b31552` / 五工件 md5 与交接 §1 逐一相同；`ver` 正常（status 里 `ready` 行残着两小时前旧 hash `hda45aa7d`，以 `ver` 为准）。
- **取证（4 工人小单 4/4 全活 + 主审独立探针对撞）**：`batch12-facts-20261027\C11-c11-取证与策略.md`。三大发现：
  ①★上游"ANN_PASS_BUY_LIVENESS 可能已下线"**被推翻**（入口 `scripts3.js:18448` BuyItemUI29，弹窗点 7438/7763）；
  ②★礼物两键**不自开面板**，走通用商店 `STORE_SHOW_UI {type:11}` → `openBuyGoldEvent` type 11 分支（scripts2.js:8550-8572）**按下标取 11 元数组**，`award` 必须原串（67216 split）、`[8]` 是**已购次数**不是表的 num 列（67563 limitnum-num）；买回包必带 **`giftData`（单数）** 字典（67466 刷新）；
  ③★`anniversary_pass_liveness` 活动窗口 2026-09-29→10-17 **已过期** → 拍板① endtime=now+30 天自定；`endtime` 是**毫秒**（7574 (e-t)/1e3）。
- **拍板四项（用户）**：endtime=now+30 天｜VIP=300 元宝自定价｜买活跃度扣 gold（单价主审定 10/点，上限 565=表 maxLiveness=客户端 7763 同值）｜7 个全做。
- **实现**：`tools\gen_c11_tables.js` → `core\bz-c11.generated.js`（award 22 阶 / task 7 / gift 4+预拼 Type-11 货架 / liveSrc 5 留档 / evnet 5 沉底）；`bz-rpc-server.js` 7 handler + REJECT_CODES 7 条 + REJECT_ALLOW 7 条；`build-handlers.js` 与 `check_shape_freeze.js` sweep **两处都接**。
- **坑（本批新踩）**：
  ① 5 个新键不在 `todo_shapes.json` 登记表 → gen_shapes 根本不扫 → 形状/sweep 全缺席（diff 只有 59 项且缺 5 动作）。**新动作必须登记进 todo_shapes.json**；
  ② r14 冒烟直接 require core，`BZ_C11` 未定义 → `getAnniversaryPassData` 裸引用 `BZ_C11.durationDays` 抛 TypeError → 一律走 `annTable()` 守卫；
  ③ `grantRewardList` 契约：调用方 note 必须带 `eco:{}`（:1059 `note.eco[k]`）——award 里 4003=潜能/1=金条都是货币，漏 eco 就是 `Cannot set properties of undefined (setting 'ptt')`；
  ④ R2a：else 兜底分支的提示**不算专属分支** → `getAnniversaryPassData` 拒绝码必须 tier 2（同 UseSnowBall/FindFriendByID 先例）；
  ⑤ planned-changes 解析 `--diff` 输出时 `Out-File utf8` 带 BOM，首行 `^value` 匹配失败 → 60 项只覆盖 59（剥 `\uFEFF` 修复）。
- **门禁**：`todo_shapes.json` 补 5 键后 gen_shapes 342 动作（+5）；冻结 60 项 diff 全覆盖（7 规则 planned-changes，归档 planned-archive）；**reject-codes OK 动作 103 / 条目 117 / 拒绝点 170**；**acceptance 51/51 绿**（c11-smoke 13 条被自动收编）；c10-smoke 18/18、r14 3/3 回归绿。
- **真机全链（impl=h70337301，selfCheck 1320 全过，pid 22577 不变）**：GET_DATA（面板开、endT=now+30d 落模型）→ GET_GIFT_DATA（type 11 货架）→ buyAnniversaryPass（**vip=1，-300 元宝**）→ buyAnniversaryPassLiveness（**n=10，-100 gold**）→ receiveAnniversaryPassAward 行 2 免费+VIP（**rd=[2] / vrd=[2]**，潜能 +110000）→ buyAnniversaryPassGift 行 1（**-60 元宝，发 gold×60 + 9864×500 + 6658×20**，已购 1/1）→ receiveAnniversaryPassTaskReward（notReached 2 拒绝留痕，不动档）。存档变动均为正常玩法结果（消费 360 元宝 + 100 gold，获得如上）。
- **验收**：工人 1 单（8 条门禁命令独立复跑，gemini-3.8-flash-low）+ 主审抽样复核。
- 备份：`_backup\20261027-091400-pre-c11\`（core 全套 / test / handlers 产物 / build-handlers / check_shape_freeze / golden 三件 / reject-codes / EXECUTION / OPEN-ISSUES，66 文件 3,614,853 B，清单在包内 `_备份清单.txt`）。
- 工件：`batch12-facts-20261027\`（取证与策略 / 主审独立探针记录 / scoutP1-P3+U / scoutV1-V2 / 工单 / probe_c11_flow.js / tmp_planned_c11.js / tmp_add_reject_c11.js / tmp_diff_raw.txt）。
- 遗留 → ISSUE-11（`docs\OPEN-ISSUES.md`）：活跃度来源不结算 / `evnet` 沉底 / 任务进度 dv 不累计 / 表窗口过期口径。

## 轮 22（2026-10-27 03:5x）接手核验 + 第 11 批 C10〔农作物〕取证（工人死一轮、重派后才成）

- **接手核验**（与交接 §1 逐项对上）：pid 22577 / `impl=hefbb1ad4` / `flow=ffaec47c3` / scene=gamescene / `implErr=null`；acceptance **49/49**、reject-codes **动作 84 / 条目 98 / 拒绝点 127**、形状 **diff 0**。
- **工人死亡与收尸**：第一轮 2 个工人（9 键大单 + 444 表大单）**双双开工即死**，仅留下 84 B / 45 B 文件头；唯一残骸 `tmp_q_scan.js`（70 行）由主审直接跑通，表事实全数捞回 → `batch11-facts-20261027\收尸记录-第11批-20261027.md`。
  按用户指令**重派**：拆成 3 单 × 3 键、每单硬上限 80 行、只写亲眼读到的行 → **3/3 全活**（scoutP1/P2/P3），主审独立探针 `tmp_main_listeners.js` 逐行对撞一致；再派 scoutR（面板数据源）/scoutS（作物 id 核对），也全活。
- **C10 取证结论**（`batch11-facts-20261027\C10-c10-取证与策略.md`）：9 键线上名全部定位（★`CROP_CHANGE_STATE`=`User.changeSate` 少个 t）；4 处**裸读崩点**（`crop`/`crops`/`cropMap`/`obtainLands`）；作物实例对象 `m` 契约（`id/s/t/pt/c/eid/et/at/b`）与 0..7 状态机从 `LandUI`(scripts2.js:37636-37810)+`PlantSystemMgr`(index.js:95563-95702) 反推成功。
- **本批最大坑（同 C09 的"同面板必做"）**：`soilArr` 只来自 `GETHOME_LIST`（`User.getHomeList`，**第50批**），而且 **`PlantHomeUI` 这个面板就是它回调里 new 出来的**（index.js:57615）→ 不补 `getHomeList`，8 个动作全部不可达。
- 线上现状：9 键 **零 handler**（5 个 SHAPED 兜底 / 4 个 UNKNOWN），`getHomeList` 的兜底把 `soilArr` 给成对象 `{}`（客户端按数组用）；`core\` 无任何作物存档字段，拒绝码表 0 条。
- 状态：**取证闭合 → 用户拍板四项全按推荐 → 本场已实现并过门禁**（见下条「轮 22 追加」）。
- 工件：`batch11-facts-20261027\`（收尸记录 / C10 取证与策略 / C10 执行记录 / scoutP1-P3 / scoutR / scoutS / `tmp_*.out.*` 探针产物）。
- 备份：`_backup\EXECUTION.md.bak-20261027-batch11`（本轮追加前）、`_backup\20261027-040000-pre-c10\`（core 全套 + patch-live + tools 四件 + OPEN-ISSUES）。

### 轮 22 追加（同日）C10 落地：10 个 handler + 面板真开得起来
- 用户拍板：**并入 `getHomeList`**｜**档 A（本家闭环，偷菜优雅拒）**｜**真实计时 + 加速免费**｜**按状态取产物、事件本批不随机刷**。
- 数据：新生成器 `tools\gen_c10_tables.js` → `core\bz-c10.generated.js`（15 KB：53 作物 × 7 阶段秒数/产物、4 家事件、details 27 值、等级经验 15 行、地块 4、加速 86400s/次）；
  按 C09 教训**同时接进** `build-handlers.js` 与 `check_shape_freeze.js` 的 `sweep()`。
- 实现 10 个：`getHomeList` / `batchSeedCrop` / `changeSate` / `obtainCrop` / `expediteCrop` / `cleanDeadCrop` / `dispossHomeEvent` / `onKeyObtainCrop` / `onKeyDispossHomeEvent` / `stealCrop`（档 A 锁）。
  `SHRINK_OK` += `batchSeedCrop`（播种扣光背包会被守卫回滚成白拿，同 C09 摸奖券那次）；`REJECT_CODES`/`REJECT_ALLOW` 各 += 10。
- 状态机口径：`m.s` 服务端权威、`m.t` 永远播种时刻；阶段判定按 `1-effect` **刻意提前 10%**（否则服务端比客户端慢 → 进度条卡 100% 永不推进）。
- **事故与修复**：批量删 `note.eco` 时脚本 `start=-1` → 全文件误改 4 处（2 处属 `passCardAward`/`BuyFashion`，会让 `note.eco.gold` 抛 TypeError）。
  用"按函数切片逐字对撞备份"定位恢复，11 个非 C10 handler **逐字一致**（有脚本输出）。教训：批量替换必须先断言命中行号。
- 形状：第一轮 42 项 diff → 11 条 planned 规则 + widening 9 + narrowing 24 → `--freeze`；第二轮（`homeSpeicalAward` + 去掉 `bShop`）4 项 → 2 条规则 → 再 freeze。**终态 diff 0**。
- 门禁：build ver=**h69467eef**（selfCheck **1299**）、acceptance **50/50**、c10-smoke **15/15**、reject-codes **94/108/145**、形状 **diff 0**、热重载 pid 22577 不变。
- **真机（最有价值）**：探针 `buildHomeTip()` → 客户端自己发 `getHomeList` → 日志「地块 4 块」+ 模型 `plantHomeUI=yes | soilArr=4` ⇒ **面板真被打开了**（此前 SHAPED 不含 soilArr，面板永远不开）。
  顺手抓到并修掉一个**开面板必崩点**：`homeSpeicalAward` SHAPED 回 `eid:0+rewardArray` → `productHomeEvent(0,…)` 裸读 null 表 `.describe` → TypeError（index.js:95694）。修后复测该 TypeError 消失。
- **未通**：① 真机播种闭环卡在"种子来源"（`getBackShop`/`BuyHomeCrop` 都没做，不在本批）；② 家园背景 `Assert 1606`（`PlantHomeBgUI`，疑 `marryHouseMap[homeFarmId]` 为 undefined，第50批方向）。
  两条都写进 `docs\OPEN-ISSUES.md` **ISSUE-10**（含三选一的种子方案，待用户拍板）。

### 轮 22 追加 2（同日）补家园种子商店 → 真机买→种→催熟→收 **全链打通** + 第 11 批回执已交付
- 用户拍板第三件：**补家园种子商店**（平价 = 表里 `item.Price`：100/1000；不限购）。家园背景 `Assert 1606` 本批不修（记 ISSUE-10）。
- 新增 2 个 handler：`getBackShop`（货架 35 行种子三元组 `[itemId, tag, 单价]`）+ `BuyHomeCrop`
  （**线上名大写 B** —— 第一版写成 `buyHomeCrop`，真机日志 `SHAPED User.BuyHomeCrop` 实证落到兜底，改名后才通）。
  `getHomeList` 的 `bShop` 改回发 **1**（商店按钮前置 `homeShop > 0`，scripts2.js:48589）。
- **真机全链**（走客户端自己的模型方法，日志为证）：`buildHomeTip`（地块 4）→ `reqGetSaleShop`（35 行）→
  `reqBuyHomeCrop(4777,2)`（`花 200 银两，背包 2`）→ `reqMultiPlanting`（`种下 1 块：0←4777 扣种子`）→
  `reqAccelarteCrop×6`（`阶段 4→5（免费加速）`，背包不动）→ `reqCropGainReward`（`C10 收获 item=4808 +1`、`种植经验 80000`）。全程无 TypeError。
- 形状再两轮（106 + 3 项）→ `--freeze`；**终态**：build ver=**h90b31552**（selfCheck **1300**）、acceptance **50/50**、
  c10-smoke **18/18**、reject-codes **96/110/149**、形状 **diff 0**、pid 22577 不变。
- **第 11 批回执已交付**：`_incoming\下游回执-第11批C10-20261027.zip`（649,433 B，md5 `DB59771D…`，73 条目）；
  解包自验 `core\bz-rpc-server.js` md5 == 部署版、解包内 `c10-smoke` 18/18。⚠ 要发的就这一个文件。
- 待上游追认 5 项（平价买卖 / 加速免费 / 种植经验口径 / 阶段判定提前 10% / 4 个跨批次动作提前做），见回执 §八。

## 轮 21（2026-10-27 03:0x）第 10 批 C09〔技巧摸奖〕实现完成（7 做 / 4 锁）

- 取证三份：scoutJ（11 键契约 839 行）+ scoutK（配置表 327 行）+ scoutM（UI 对回包字段 433 行）→ 策略 `batch10-facts-20261027\C9-c09-取证与策略.md`。
- 用户拍板：**两表分工**（`drop_probability` 抽组 → `probability` 抽品质）+ **分解/合成四件锁住**。
- 数据：新增生成器 `tools\gen_c09_tables.js` → `core\bz-c09.generated.js`（18.9 KB：券 9191、单抽 1/十连 10、免费 1/日、46 技能、230 行掉落、230 组×5 品质 → knackId）；接进 `build-handlers.js` 与 `check_shape_freeze.js` 的 sweep。
- 实现 7 个：`getKnackLottery` / `knackLottery` / `getKnackLotteryHistory` / `getSkillGrasp` / `skillGrasp` / `changeSkillKnack` / `rgChangeSkillKnack`；
  锁 4 个：`resolveEquip` / `batchResolveEquip` / `resolveKnack` / `batchResolveKnack`（缺产物表，`eRet 2` + 收窄）。
- **踩到并修掉一个"白拿口子"**：`SHRINK_OK` 写前守卫把"十连扣光券"判成背包缩水 → 整包回滚 → **券没扣、奖照发**。
  冒烟里"背包只有 10 张券"才暴露；修法 `SHRINK_OK` 加 `knackLottery`（合法消耗），注释写明事故形态。
- 门禁：build ver=**hda45aa7d**（selfCheck 1286）、acceptance **49/49**、c09-smoke **11/11**、reject-codes **84/98/127**、
  形状 **diff 0**（C09 动作不在 337 基线，同 C07 口径）、热重载 pid 2655 不变。
- 真机：`getKnackLottery` 实调成功（`券=9191 单抽=1 十连=10 isFree=1 技能池=46`），**存档 md5 前后不变**。
- **可达性仍未通**：摸奖入口 = 商城 type=9 页签（`shop_entrance` 第 9 行 `Graspmenu`），页签列表来自 `User.GetShopAllActive`（我们没实现）→ 界面临时点不进去。scoutN 正在查该动作的应答形状，回来再定补不补。

### 轮 21 追加（同日）摸奖界面真机走通 + 修一个同面板崩点

- scoutN 纠正了我一个判断：**页签不是 `GetPayShowData` 给的**（它把 type 写死 2/8，产不出 9），而是 `User.GetShopAllActive` ∩ 本地 cfg —— **这个动作我们早就实现了**（`bz-rpc-server.js:3815`，回全量行键，含第 9 行）。真正挡住的是两道闸：默认入口 `back:1` 不请求页签；点 type=9 要 `getMyRoleArtLv() >= getConst(435)=100`。
- 经用户同意，用 `bzPatch` 把真档 **skills 1/7/8/9 抬到 100**（原 40/40/40/21）验界面；整档备份 `_backup\savedata-20261027-023103-pre-knackgate\`。**用户决定不回滚**（"不要紧就不管了"）→ 以后看到等级虚高，是这一笔。
- 真机三抽全通：免费 1 次（券不动）+ 付费 2 次（券 2→1→0），`showKnack` 三次分别 `[12331] / [11591] / [11457]`，奖励框"获得…"文字正常；`knackBag` 三条落盘。
- **修两处**：① 扣券没回 `note.ivch` → 观察守卫刷 `OBS 未解释差额`，已补（回绝对值）；② 同面板 `User.getSkillTrickExchangeData` 未实现 → 客户端裸读 `nextRefreshTime` **TypeError**，已补空兑换店（`getSkillTrickExchangeData` / `refreshSkillTrickExchangeData`，零奖励面）。
- 门禁：build ver=**hefbb1ad4**、acceptance **49/49**、c09-smoke 11/11、热重载 pid 22577 不变。
- **回执包已打好**：`_incoming\下游回执-第10批C09-20261027.zip`（627,146 B，63 条目，sha256 `78BBA8B1…6CDF03`）。
  结构与 C08 包一致：`00-转发说明` + `01-回执正本` + `02-manifest` + 根 `bz-rpc-server.js` + `core\`（含新表 `bz-c09.generated.js`）
  + `facts\C1–C7`（取证策略/执行记录/scoutJ/scoutK/scoutM/scoutN/OPEN-ISSUES）+ `test\`（46 个）。
  解包自验：`core\bz-rpc-server.js` md5 `211B2E53…` == 部署版；`node test/c09-smoke.js` **11/11**、`c08-smoke.js` **12/12** 全通。
  ⚠ 要发的就这一个文件。

## 轮 20（2026-10-27 02:0x）第 9 批验收通过 + 四问回话落地 + C09 开工

- 上游 `_incoming\batch9-accept-20261027\`：**C08 验收通过**（"档 A 同意"，点名三处做得好：AttckData 只换三样 / ChallengePVP 走 eRet 3 / npcArr 空退回 310003）。
- 四问裁定：**Q1 选①**（维持现状 + 入口批次时**优先看入口回调有无优雅拒绝分支，有就拒在入口**）｜**Q2 选①**（维持抓包快照 + 可选"限时 2 小时反推 parseEq"，不要等抓包）｜**Q3 不排**（服务端不管血量）｜**Q4 以 drop-table 为准：打赢两次就掉落两次**。
- **Q4 已落地，并查出一个真问题**：那条 `drop:dedup` 不只是口径错，还是**空断言**——`loadSave()` 两次返回同一个对象引用，`after1.pe === after2.pe` 恒真，改成"发两次"的语义也永远不会红。
  现改为每场打完**当下立即取计数**，断言 `n1===1 && n2===2`（`core\bz-handler-impl.js` 的 `drop:noDedup`；`drop:dedup` 不在 required-checks 里，可安全改名）。
  实测 store 里 `1301` 计数 1→2。**教训：自检里比较两次快照必须先做值拷贝。**
- 门禁：build ver=**hb4a80312**（selfCheck 1286）、acceptance **48/48**、热重载 pid 2655 不变、`ver` implErr=null。
- ISSUE-8 补 **8-5 行**（C08 那 4 个多人动作 + 上游裁定的"入口拒掉"前置）；ISSUE-9 状态改**已裁定**并逐条记落地动作。
- C09〔技巧摸奖〕**开工**：派 scoutJ（11 键契约逐行：8 主 + GET_SKILL_GRASP + EQUIP_RESOLVE + SKILL_GRASP）与 scoutK（摸奖配置表：`skill_Trick_Lotterymachine` / `skill_Trick_Drop` / `trick_group` / `lottery*` + `optionalDatas`/`upSkillRateData` 结构 + 扣费/产物/限次）。
  上游给的发奖口规矩（写进本批工单）：**先扣钱再发；奖励 id 对上钱包字段就入账、对不上只显示；同一次抽奖不能重复领**。
- 待办：Q2 的可选"parseEq 反推"限时 2 小时 —— 等一个工人空出来就派（不复用 C09 的两个侦察工人，避免上下文混）。

### 轮 20 追加（同日）Q2 反推**成功**并落地

- scoutL（`batch9-facts-20261027\scoutL-parseeq.md`，1015 行）闭合了实例格式：战斗链用的是 `ItemUtils.parseEq`（index.js:66282-66305，
  别名 index.js:74624），逐位读 `e[0]`=type / type==1 → `e[1]`=数量、`e[2]`=weaponSkinId（否则 `e[1]`=itemID、`e[2]`=attrs）/ `e[3]`=crystalIds / `e[4]`=weaponSkinId；
  `equipments` = `{槽位:uid}`、`equips` = `{uid:数组}`（index.js:74785-74796）。
- **关键结论：我方存档本来就是同一形状** —— `s.playerEquip[uid] = [1, 数量]`、`s.equipments[槽位] = uid`，直接搬，零转换。
- 落地：`buildAttckData` 里 `a.equips = clone(s.playerEquip)` / `a.equipments = clone(s.equipments)`（不再用抓包快照）。
  形状差异 16 项（14 del 槽位 1..7 + 2 add 空对象标记）→ 2 条 planned 规则 → `--freeze` → diff 0。
  ⚠ 踩坑：`leafOfPath` 把 `AttckData.equipments.3` 的字段名算成 **"3"**（不是 "equipments"），规则 field 必须写槽位号——C08 也踩过同一个坑。
- 门禁：build ver=**h050f2e23**（selfCheck 1286）、acceptance **48/48**、c08-smoke **12/12**（新增【③c】断言本档装备真的进了 AttckData）、热重载 pid 2655 不变。
- 可选转正：上游说的"推不出就继续用快照、不用再问" → 现在是**推出了**，所以装备已切到本档；回执需申报这一条。

## 轮 19（2026-10-27 02:5x）第 9 批 C08 实现完成 + ISSUE-8 锁死清单立项

- **回执包已打好**：`_incoming\下游回执-第9批C08-20261027.zip`（580,206 B，59 条目，sha256 `D91C6888…476A668`）。
  结构 = `00-转发说明.txt`（给转发人看的 30 秒版：包里有什么 + 只要上游回 4 句 + 3 步自验）
  + `01-receipt-batch9-c08.txt` + `02-manifest.txt`（指纹/逐文件 md5/怎么验/没带什么）+ 根 `bz-rpc-server.js`
  + **`core\`（本次新加：rpc-server + templates + 三个 generated，凑成完整 core，对面解包即可跑测试）**
  + `facts\C1–C5`（取证策略/执行记录/scoutG/scoutH/ISSUE-8-9）+ `test\`（45 个，含 c08-smoke）。
  解包自验：`core\bz-rpc-server.js` md5 `39750A3C…` == 部署版；解包目录内 `node test/c08-smoke.js` **11/11**、
  `node test/drop-table.js` **8/8** 通过；45 个测试里 **32 个**可独立跑，13 个要 `tools\`（清单在 manifest 里写明）。
  ⚠ 上几包只带 `bz-rpc-server.js`，对面拿到跑不起来（缺 templates/shapes/tasks/shops）——这包已补齐成超集，不再打旧版第二包。
  ⚠ 要发的就这一个文件；回执正本/ISSUE-8/9 都在包里（`01-receipt` 与 `facts\C5`），不要单独发。


- 上游第 8 批验收包（`_incoming\batch8-accept-20261027\`）**通过**；追加一条登记：把「整套玩法被锁」记进 OPEN-ISSUES，入口批次一起解锁、全部批次跑完统一过一遍。
- 锁死清单已立项：`docs\OPEN-ISSUES.md` **ISSUE-8**（8-1 善恶 11 动作 / 8-2 洗练·寄养·性别 / 8-3 妻子养成 / 8-4 青楼），含上游指定的善恶解锁三必做（`s.geSide` / 16 键初值 / `s.geScore` 按表发、不白给）。
- C08 取证：scoutG（九键逐行，930 行）+ scoutH（线上现状：9 个一条 handler 都没有）→ 主审合成 `batch9-facts-20261027\C7-c08-取证与策略.md`。
- **关键判定**（推翻交接单的预期）：C07 那套「全锁 eRet 2」在本批不成立 —— 9 个里 8 个回调**无 else**，eRet≠1 = 卡战斗界面；只有 `USER_PVP` 有优雅退出（eRet 3 → 弹文案 1399 + dispose，index.js:101338-101341）。
- 用户拍板（2026-10-27）：**档 A**（单人 PVE 4 个做满 + PVP 优雅拒 + MPPVE/PVP 保留未实现）+ **attArr 回空**。
- 实现（`core\bz-rpc-server.js`）：`buildAttckData`（AttckData = 抓包模板 `reqSelfBattleInfo` 内层去皮 + 本档 baseValueAy/roleID + 本档 skillMap 叠加）、`buildNpcArr`/`pickBattleNpc`（BZ_NPCARR 3658 只 + 兜底 310003）、`battleSeed`；5 个 handler：enterPVEBattle / beginPVEBattle / enterRoguePVEBattle / beginRoguePVEBattle / ChallengePVP。
- **顺带堵掉一个真崩点**：`generateNpcData` 是裸读（index.js:8093-8137），空 `npcArr` 会在 8118 `t[14][0]` 抛 TypeError → 未知 npcID 必须退回一只真实存在的怪（原 SHAPED 默认 npcID 310003 + 空数组同样会崩）。
- 形状：309 项差异（236 add / 7 del / 6 value，无 chg）→ planned-changes 71 条规则 → `--freeze` 入库 → **diff 0**，C1–C8、C10–C13 全过。
- 闸门：build ver=**h744ad0f4**（selfCheck 1286）、acceptance **48/48**、c08-smoke **11/11**、reject-codes 动作 77 / 条目 91 / 拒绝点 113、热重载 pid 2655 不变。
- 修一处误判：`r18-unreachable` T6 白名单新增 `a.baseValueAy = ay;`（ay 只由 `normalizeBaseValueAy(clone(s.baseValueAy))` 派生，不读请求）——同时把原先"请求 mp/gTime/hgtimes 写进 baseValueAy"三行**删掉**，请求值一律不进属性载体。
- 零发奖口：5 个动作不写存档、不动钱包（c08-smoke ⑩ 逐字节 + 钱包快照断言）。

## 轮 18（2026-10-27 02:1x）C08 取证：九键契约 + 线上现状

- scoutG：9 个键全在 index.js（scripts2/3 **0 命中**），逐键 4 项（定义行/注册点/请求载荷/应答消费回调逐行）。
- scoutH：9 个键**一条 handler 都没有**；6 个落 SHAPED 兜底（AttckData 恒 `{}`、npcID 恒 310003）、3 个落 UNKNOWN；拒绝码表里一个都没有；test 下零覆盖。
- 主审亲验三条：`AttckData` 契约（parsePlayerData 74919-74971 + createPlayerBattleEntity 74766-74914）、`serverHp` 语义（11668-11673 保命血、104532 胜负判）、`attArr` 空数组安全性（98855/104183/104195 全在 length>0 守卫里）。
- 结论：本批真面目是三套架构（服务端权威 1v1 / 真人 PVP / 多人回放），不是"9 个薄 ack"。

## 轮 17（2026-10-27 01:10）会话收尾

- 交接文档写好：`HANDOVER-SESSION-2026-10-27.md`（取代 10-26 版，原件备份 `_backup\`）。
- 第 8 批回执包已交付待转发。本会话累计：v2.7.1 三件拍板 + accept2 两拍板 + accept3 练功计时 + 第 6/7/8 批（C04/C06/C07）全部交付，验收 47/47 绿。
- 下一会话从 HANDOVER-SESSION-2026-10-27.md §0 接手，第一批活 = 第 9 批 C08（等上游回包）。

## 轮 16（2026-10-27 01:00）第 8 批交付

- 回执包：`_incoming\下游回执-第8批C07-20261027.zip`（266,671 B，sha256 EB73CF93…8778E8E），解包验 server md5 921DFDB8… == 部署版 ✓。
- 纠正一处：PowerShell [IO.File] 读改回执时正则误把两行 md5 都替换成 handlers 的——read + edit 工具修正（再次验证：**UTF-8 文本只走 read/write/edit 工具**）。
- 大纲状态：C01-C07 全部交付。下一批 = 第 9 批 C08（9 个，PVE 战斗族，relations.md:63；同面板另见第 4 批的 BATTLE_RESULT 族）。

## 轮 15（2026-10-27 00:40）第 8 批 C07 实现完成

- scoutF 回报（修正版 11 KEY，全部在 index.js:60434-60451）。
- 策略：11 动作全锁 eRet 2 静默（玩法门槛=加入阵营未实现；GoodEvilInfoUI 16 字段 .toString() 直读缺键即崩；helpDoneTask 发贡献无存档槽）。
- 门禁：build ver=he29a670a（selfCheck 1285）、freeze diff 0（善恶不在 337 基线）、acceptance 47/47、c07-smoke 2/2、reject-codes 76/90/113、热重载 pid 不变。
- 真机：4 动作抽样全 eRet 2、coins/contribution 不动。
- 下一步：回执 zip（第 7+8 批合并？不——第 7 批已单独交付；第 8 批回执含练功计时结论一句）→ 第 9 批 C08（9 个，PVE 战斗族）。

## 轮 14（2026-10-27 00:10）C07 侦察返工

- **主审失误**：给 scoutE 的 11 个 KEY 是我凭印象编的（EVIL_EVENT 等），三包 grep 10/11 无定义——真实成员在 relations.md:61（GET_GOOD_AND_EVIL_RETIRE_DATA 等 11 个，HttpConst 集中在 index.js:60433-60451）。scoutE 按工单如实记"未定义"，其范围外线索指出了正确位置。
- 教训：批次成员清单必须先读 relations.md 原文再写工单，不许凭记忆。
- scoutF（更正版 11 KEY）已派。
- 下一步：scoutF 回报 → C07 实现。

## 轮 13（2026-10-26 23:30）C06 验收通过 + 练功计时结算（accept3）

- 上游 batch7-accept：C06 验收通过；补一条（限时 2 小时）：练功/打坐按服务端计时结算，规则四条（Begin 记账 / 时长=now-记账、上限 gTime / 客户端确实读 note 才结算 / 无 Begin 不结算）。
- 取证：EndTraining 回调**不读 note**（120574-120601 逐行）→ 不结算只清账；EndMeditation 读 note.attrch.mpTrained → 修为持久槽 = **baseValueAy[32]**；上限 = getMaxNGBonus() = 内功等级×常量 33（MadNumber 解码 = 10）；无每分钟公式 → 拍板默认 1 点/分钟。
- 实现：BeginTraining/BeginMeditation 记账（s.trainBegin/medBegin = {t,g}）+ persist；EndTraining 清账不结算；EndMeditation 结算修为（分钟数）+ note.attrch.mpTrained 回新值 + 记录即清。
- **真 bug 修复**：env.log 无条件读 s.baseValueAy[32]，空档上 TypeError → catchNoCode 应答丢 eRet（形状冻结 diff 暴露；真档有 baseValueAy 所以真机没炸）。
- 门禁：build ver=h73b8869e、freeze diff 0、acceptance 46/46、c06-smoke **10/10**（+4 条计时结算断言）、reject-codes 65/79/102。
- 真机：Begin → 真实流逝<1 分钟 → 不结算+记录清+二次不重复（定量由冒烟时钟注入覆盖）。
- **坑新增**：PowerShell Get-Content -Raw 读 UTF-8 无 BOM 按 ANSI 解 → 回写双编码写花文件（回执/冒烟各踩一次）——**读改 UTF-8 文本一律用 read/write 工具，禁 Get-Content 中转**；另一坑：node -e 里贴含正则的 JS 引号地狱——改写临时 .js 文件执行。
- 第 8 批 C07〔善恶〕11 动作侦察已派（scoutE，59dcd1a3）。
- 下一步：scoutE 回报 → C07 实现 → 第 7+8 批回执（练功计时结论一句进回执）。

## 轮 12（2026-10-26 23:00）第 7 批交付

- 工人 14 条全量复跑全 0 退出码（c06-smoke 6/6、acceptance 46/46、65/79/102），主审抽样逐字一致。
- 回执包：`_incoming\下游回执-第7批C06-20261026.zip`（266,441 B，sha256 80098740…AAAE0），解包验 server md5 EC14C0C7… == 部署版 ✓，回执正文 UTF-8 抽查无乱码。
- 坑新增：PowerShell Get-Content -Raw 读 UTF-8 无 BOM 文件按 ANSI 解 → 回写即双编码写花（回执文件踩过，已用 write 工具重写修复）；**以后读改 UTF-8 文本一律用 read/write 工具，禁 Get-Content 中转**。
- 大纲状态：C01-C06 全部交付。下一批 = 第 8 批 C07〔善恶〕11 个（relations.md:60）。

## 轮 11（2026-10-26 22:50）第 7 批 C06 实现完成

- scoutD 回报（15 节逐字段）；4 动作前批已有（BeginTraining/BeginMeditation/BeginPlayWooks/EndPlayWooks），补 11 个薄 ack（三个 END_* 无 eRet 判断→字段按消费端给齐：genguTime/hanyusuiTime 0、EndMeditation note 必带——138892 无守护；vigor 恒 0；skillID 回声；serverTime 计时基座）。
- 口径：END_* 请求不带时长 → 只回成功不结算（relations.md 预警采纳）；**本批发钱口 = 0**（真机 before/after 数值一致实证）。
- 形状：4 项差异（serverTime 1 + hanyusuiTime 3）审批后 --freeze；C1-C13 全过。
- 门禁：build ver=h9de8c1d7（selfCheck 1285）、acceptance 46/46、c06-smoke 6/6、热重载 pid 不变。
- 真机：11 动作全过 + 数值零变动。
- 待办：工人验收回报 → 回执 zip。

## 轮 10（2026-10-26 22:10）两拍板全落地

- makeLove：经验进 s.exp（自定 50/次——make.json experience 列实为风味文案 id，全表无数值源，回执申报）+ 每日 5 次上限（s.makeLoveDay/todayKey，超限 eRet 2）；happiness 只显示；hunger/full 不接。c04-smoke 10/10。
- childObj 深挖**成功**（scoutC 52 行读点 + 主审亲验 9 处危险读点）：9 键形状全部有出处（sex/childName/age/fatherLv/foster_point/playArr/baseArr/addArr/bornTime）→ adoptChild 解锁（500 元宝先扣、未婚/已有孩子/不足回 2）、birthChild 接线（闸=fetationTime>0，实际自然锁死）、giveChildName 接线（空名→99）。洗练/寄养/性别/妻子养成/道具/青楼仍锁死。
- 修两个自伤 bug：marryState 在拒绝路径建槽（6 个动作改先窥视后建槽）；c04-smoke 预热缺 ensureLedger（坑表 §4）。
- 门禁：build ver=h3828b816、freeze diff 0、acceptance 45/45、c04-smoke 12/12、reject-codes 65/79/102（giveChildName 99 码 ev 补 sha8）。
- 真机：领养链全过（元宝 50946→50446、childObj 九键、取名小狗蛋、LoadGame 回放、未妊娠 2、再领 2、空名 99、离婚保留孩子）；makeLove 链全过（5 次 +250、第 6 次拒、离婚 exp 保留）。
- 真档状态：未婚 + 孩子小狗蛋（合法数据）+ 元宝 50446。
- 下一步：第 7 批 C06〔打坐练功〕13+2 侦察已派（scoutD）；注意事项 relations.md 预警 END_LIANGONG/END_DAZUO「请求不带时长，只回成功不结算」。

## 轮 9（2026-10-26 21:40）验收通过 + 两拍板落地（makeLove 完成 / childObj 深挖中）

- 上游包 batch6-accept：C04 验收通过；拍板 ① 领养=深挖 childData（限时半天，推出形状→500 元宝解锁 adoptChild+birthChild+giveChildName；推不出→继续锁死不来问）② makeLove=经验进 s.exp + 每日 5 次上限。
- makeLove 落地：⚠ make.json experience 列实测是风味文案 id（1410006-1410010="感觉身体被掏空"等，make-text-probe 实取），**全表无数值型经验** → 数额自定 50/次（与环任务 e=50 同档，回执申报）；happiness 列只进应答显示（77337 hasOwnProperty）；hunger/full 不接（makeLove 应答客户端不读 hunger）。
- 门禁：build ver=hea147e24、freeze diff 0、acceptance 45/45、c04-smoke 10/10（+经验/上限断言）、reject-codes 99 处、热重载 pid 不变。
- 真机：结婚 → 5 次 makeLove exp 200→450（+250 封顶）→ 第 6 次 eRet 2 → 离婚清场 exp 保留。
- 工人3（c852f476）= childData/childObj/childState/fetationTime 全读点穷举（scoutC）进行中。
- 下一步：scoutC 回报 → 主审推 childObj 形状 → 实现/维持锁死 → 第 7 批 C06。

## 轮 8（2026-10-26 21:20）第 6 批交付

- 工人 13 条全量复跑全 0 退出码（c04-smoke 9/9、acceptance 45/45、65/73/98），主审抽样逐字一致。
- 回执包：`_incoming\下游回执-第6批C04-20261026.zip`（264,426 B，sha256 B849049A…），解包验 server md5 D79CDE4E… == 部署版 ✓。
- 回执含：v2.7.1-accept 小改结论（a 不会但做了两组防御记账 / b 会已按天清 / adventureID 恒 0 真 bug）+ C04 口径 + 两处待上游（adoptChild 需 childObj 抓包、make.json 数值语义）。
- 大纲状态：D1-D5（v2.7.1）+ D6（C04）全部完成。下一批 = 第 7 批 C06〔打坐练功〕13 个（relations.md:53）。

## 轮 7（2026-10-26 21:00）第 6 批 C04 实现完成

- 侦察回报：scoutA（21 动作逐字段，scripts3 零命中）+ scoutB（dump 442 表仅 propose/make/bridalline 命中，**三表均无奖励列**）。主审抽样一致。
- 策略三分：状态机 5 动作实现（s.marryObj + LoadGame 回放）；面板 2 动作实现（girlData 空 / getLikeEvent eRet 4）；子系统 13 动作锁死（childObj/wifeUpdateData 形状无证据，造形状=崩点；领养/洗练/青楼原版付费，价格无源）。
- **本批发钱口 = 0**（marryAward 宾客礼金回空，白拿闸实证 coinsDelta=0）。
- 形状：39 项差异走审批三件套（planned 7 规则 + narrowing 21 + widening 1 + attrList 证据），--freeze 入基线。
- 拒绝码：+18 动作登记（动作 65 / 条目 73 / 拒绝点 98）。
- 门禁：build ver=hb6cbc053（selfCheck 1284）、acceptance 45/45、c04-smoke 9/9、热重载 pid 不变。
- 真机：状态机全链 + 锁死抽样 + 白拿闸全过，真档已还原未婚态。
- 待办：工人验收回报后打回执 zip（含 advDone 小改结论）。

## 轮 6（2026-10-26 20:40）第 6 批 C04 开工

- 批次成员（relations.md:44-51，可信度强）：16 主动作 = birthChild/exileChild/beginWedding/makeLove/marryAward/resetChildFoster/adoptChild/addChildFoster/divorceNpc/marryNpc/childWashProperty/giveChildName/upgradeWifeLevel/UserWifeProp(双写)/ChooseGirl/proposeNpc；同面板必做 = GetWhoreData/getLikeEvent；顺手 = chooseSex/optionLikeEvent/Whoring。
- 线上名映射完成（HttpConst 59613..60566 区间，工具 tools\tmp_c04_wires.js）。
- TPL.create.marryObj 已有完整抓包快照（24 键，含 bodyState/childObj/fetationTime/wash* 等）——本批形状骨干。
- 工人A（a37504f5）＝21 动作 reqKeys/应答消费侦察；工人B（c7957f97）＝dump 婚姻子女表全清。产出 batch6-facts-20261026\scoutA/B。
- 注意事项（前批教训）：`muliti/chanllenge 类上游拼写别"纠正"；H 键 = 线上名去 User. 前缀（UserWifeProp 这种双写原样保留）；ev 证据行只认 tools/index.js。
- 下一步：等侦察回报 → 主审判定每动作策略（表接/形状/拒绝）→ 实现。

## 轮 5（2026-10-26 20:20）上游验收通过 + advDone 小改

- 上游包 `_incoming\v2.7.1-accept-20261026\`：v2.7.1 验收通过，两处偏差申报同意；advDone 小改（做第 6 批时顺手改，第 6 批回执写一句结论）。
- **取证揪出真 bug**：客户端 `WMapAdvModel.advCurId` 三处赋值（index.js:143805/143812/143861）全是 0，从不赋真值 → 真实请求 adventureID 恒 0；真正的键是 eventID = gsp_event 行 id（88453-88455 onEnterAdventure；请求侧 143868）。不改则线上永远匹配不到行（少发方向，无白拿风险，但功能死）。
- 实现：BZ_ADVENTURE + `ev`(gsp_event) 列；GetRandomEventAward 按 eventID 反查行；advDone 记账改 `{d:todayKey, w:胜负组{1,2,4}, c:领取组{3,5}}` 两组各每天一次、跨天失效（accept 小改 a/b，全取少发方向）。
- 流水线：build ver=hec3f234b、acceptance 44/44、freeze/reject-codes 过、热重载 pid 不变；v271-smoke 15/15（重写 ② 块：真实请求形状/两组/跨天）。
- 真机（probe\v271-advdone-probe.js）：ev10 分支1 → {4:1}；分支3 → 领取组 c=3；分支4 → 4；未知 eventID → 空；旧格式 {10:1} 条目跨格式安全降级；钱包未动。
- 结论（写进第 6 批回执）：a 不会——单次冒险客户端只发一个分支（各流一次 reqAdvReward 收尾、应答即 end()），两组记账是防御隔离；b 会——gsp_event 109 行固定表随机触发，advDone 已按 todayKey 每天清。
- 下一步：第 6 批 C04 婚姻子女 16 取证（relations.md 顺序）。

## 轮 4（2026-10-26 19:40）回执交付

- 工人2 全量验收 12/12 退出码 0（报告 `_incoming\v2.7.1-20261026\acceptance-worker-report.md`），主审抽样一致（ver/bytes/44/44 逐字吻合）。
- 回执包：`_incoming\下游回执-v2.7.1-20261026.zip`（247,628 B；01-receipt + bz-rpc-server.js + test 全量 + facts C1/C2/C3 + algo stdout/trace），解包验 server md5 19386D48… == 部署版 ✓。
- 三文档状态：大纲 D1-D5 全部完成；D6（第 6 批 C04）未开始——下一轮从 relations.md 的 C04 取证起步。
- 大纲偏差（累计）：ISSUES 并入 docs\OPEN-ISSUES.md（ISSUE-7 新增）；无 git，用备份目录替代提交。

## 轮 3（2026-10-26 19:10）实现完成 + 真机验证

- 实现：gen_shop_tables（BZ_ADVENTURE 109 / BZ_ACHIEVE_COND 2113）；core：CURRENCY_SLOTS+4002、grantCurrency exp 缺省 0、LoadGame [18] 投射、bumpTaskCounter 五口、recomputeAchievements（四类可判）、getAchieveData 重算+落盘、GetRandomEventAward 接线（BZ_ADVENTURE 选列 + s.advDone 防重 + 未知分支不发不记）。
- 拒绝码：GetRandomEventAward {dupClaim:4} 双向登记（core + tools/facts/reject-codes.json），动态 eRet 规避（分支拆字面量）。
- 坑：adventure 列是**扁平对 [id,数]**（非对列表）——首版按对列表写，真机前单测抓住，生成器 flatPair 归一化。
- 流水线：build OK（ver=h5ae2ccb6）、freeze diff 0、**acceptance 44/44 绿**（+v271-smoke）、reject-codes OK 47/51/77、热重载 pid 2655 不变、selfCheck 1264 全过。
- 真机（codec+handle 全链路）：exp 首次入账（eco.exp）、LoadGame [18]=exp=200、circleTotal 计数、getAchieveData pending=26、重复领 4、无假道具入包。
- pending 26 条本地逐条复核：带奖励的（1/5×13、6/2,0×1）全部真达成；其余收集类 rw=0。
- 坑：真机探针三连——handle 的 URL 必须含 bzgf.maple-game.com（否则黑洞）、handle 返回 {status,text,meta}（无 ok）、payload 信封要解一层 `md['User.动作名']`；cmd/probe 通道 eval 在 fireTimeout 异步执行，res 有一拍延迟。
- 下一步：工人2 全量验收 → 回执 zip → 第 6 批 C04。

## 轮 2（2026-10-26 18:20）取证闭合

- 工人1 完成并复核：v2.7.1 trace 实证 26756 判空=否、46175 进重发判定（回执 ③ 已有料）。stdout：actions 484 / unsafe 440 / crash 313 / retry 200（重叠 73）。
- **D1**：经验=客户端 `RoleBaseInfo.exp ← baseValueAy[18]`（index.js:111775 LoadGame、74939 parsePlayerData）；eco 监听器本就认 `exp` 键（core:925 注释）→ 拍板 1 走「找到」分支。
- **D2**：item 1..5 活体探针定名：金条/善恶/筹码/幸福度/幻境之尘；adventure 四列只出现 id 2/3/4（全无钱包落点）→ 除金条外全部只显示。分支码全五档：1 胜(88678)/2 败(88703)/3 领(88635)/4 快胜(88577)/5 快败(88593)；客户端回调只读 rewardArray/npcArr/liveness，不判 eRet（index.js:143814-143840）。
- **D3**：进度对象 `taskData` 来自服务端应答（scripts3.js:2905），达成判定在服务端（checkAchieved=awardIds/receivedIds，3305）。57 类语义经 des 探针定案；可判：收集(3/x+2/3, bag∪skills∪knackBag)、口诀(3/11=skill_Trick)、任务数(6/1,0=告示牌 6/2,0=环)、经验(1/3)、技能等级(1/5)≈1545/2113 行；其余（等级/登录/天机/排行/时装…）锁死。
- 备份补充：test 目录已入 `_backup\20261026-172536-pre-v271\test\`。
- 下一步：gen_shop_tables（BZ_ADVENTURE+BZ_ACHIEVE_COND）→ core 三处实现 → 测试同步。

## 轮 1（2026-10-26 17:25）

- 环境核实：pid 2655 / impl=h9454ce1e / flow=ffaec47c3 / implErr=null，三文件 md5 与交接一致。
- 上游包解包：`_incoming\v2.7.1-20261026\`（00 说明 + README.md + extract_shape.py，条目名 UTF-8 存储被 .NET 误读 GBK，按索引解出，条目 0 名字缺一字节不影响内容）。
- 备份：`_backup\20261026-172536-pre-v271\`（core、patch\live\handlers.js、tools）。
- 三文档建好；工人1 已派（算法 v2.7.1，后台，id 057dd73b-67a6-4b8e-aed5-964ad78ab896）。
- 状态：**取证阶段开始**（D1 exp 字段 / D2 1..5 映射 / D3 成就类型分类）。
- 下一步：grep tools\ 三包找 LoadGame 应答与 exp 字段读点。
