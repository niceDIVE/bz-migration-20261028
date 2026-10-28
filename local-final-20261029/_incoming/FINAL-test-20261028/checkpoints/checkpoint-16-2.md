# P5 ISSUE-16 第二轮检查点 checkpoint-16-2.md（v4.0 终局 P5，不发上游）

- 起点：hf5d89bf7（核心 f4bf2827…，产物 40d2ca24…，形状 382/1130，验收 57/57，F165 796/0）
- 终版：hf5d89bf7，维持不变（产品代码改动 0，核心/产物/形状哈希与起点全部一致）
- 终版核心 SHA256：`f4bf282782b4ee6e691059e97c2e313c3a827581628c6f7d77c5648e3c4eec71`
- 终版产物 SHA256：`40d2ca2447d44f779a424e57020dd8326f56db6c0a5f83ff47e96d99d7a8191c`
- 终版 ver：hf5d89bf7，selfCheck=1514，bytes=1814791
- 顺序：P5 本轮内顺序自定；先复核冻结、做批前快照，再重算清点、取证、试验批、冒烟、往返、六门
- 总账：剩余透传 306 项全部处置（处置率 306/306，无待定项）；新增形状 0 个（见 §1 试验批实证：
  不是未动手，而是 C3 证据关在现行冻结工具下必然 FAIL，硬冻即违规，故维持透传）；
  新增锁仓 0 个；★ 0 项；新 ISSUE 1 项（证据扩展债务，见 §6）；无整批回滚
- 快照：final/rounds/ISSUE16-2/snapshots/pre-16-2/（核心、形状、生成器、targets、产物、golden 全套 + SHA256SUMS.txt）
- 备份：BaoZouyxt/_backup/2026-10-28-221517-issue16-2-pre/（批前核心/形状/生成器/targets/产物）
- 门日志：final/rounds/ISSUE16-2/gates/；清点与证据：final/rounds/ISSUE16-2/work/
- 冒烟：final/rounds/ISSUE16-2/round16-2-smoke.js（411/0）；往返：final/rounds/ISSUE16-2/round16-2-roundtrip.js（4 档全过）
- 交付方式：zip 交付用户（v4.0 补充答复第 1 条；本轮未向仓库推任何东西，未发任何提问清单，未等任何答复）

## §1 本轮完成数与关键结论

| 项 | 数/结论 |
|---|---|
| 处置完成 | 306/306（重算：H 641 − 形状 382 = 306，与起点一致；分类：守卫 98、B58 证据关 58、batch2 读档 2、单码/条件 9、条件分支 34、已实现 8、F165 诚实空态 97） |
| 新增形状 | 0（382/1130 维持）。B58 全部 58 个动作的 handler 成功分支已验（空档+快照双探针 eRet 1，回字段与附录 A 一致），但 sweep 排放叶在 evidence-sha1 中缺证据（58/58 均为 PARTIAL，FULL 0；83 个缺失顶层叶中 16 个在三包中 0 命中，67 个有命中但归属未核实且未入 field-classes.json——field-classes.json 共 356 字段，缺失叶全部不在其中） |
| 试验批实证（未冻结，已还原） | 取 getTreePlanting/getOpenActive/getPraySignActive 3 个动作加 targets，gen 385/1136（符合 +3 动作 +6 字段预期），--diff 恰好 6 条全为 add 且全 sigma 变化；写 planned（3 条，expect 精确，ev 取真实 send 常量行 index.js:60314/59880/59882）+ widening 6 条后校验：C7/C8 全部被规则精确覆盖、C2 通过，但 C3 对 3 个叶逐项 FAIL（no-evidence），C4/C5 为有意改动的设计内失败。结论：planned 规则覆盖不了 C3 证据关；证据只能来自分类器 field-classes.json 的 points，而 --freeze 的 evidence-sha1 正是由它重算——改分类器属于冻结工具改动，不在本轮授权内擅自做。试验后全部文件已还原（shapes.json / 生成表 / targets / planned / widening / lookup-keys 哈希与批前快照一致，gen 回 382/1130，--diff 回 0；全程未跑 --freeze，golden emission/evidence 未动） |
| batch2（LoadGame、ReqSelfBattleInfo） | 三份快照 + 空档全部读档/回数据正常，保持现状并补冒烟断言（BATCH2 每档 19/19）：LoadGame roleID 16374、快照键≥50、钱包字段不为负、无 payData/order 号键、读档后仍可 dispatch；ReqSelfBattleInfo eRet 1、roleID 16374、26 键齐全、零写档；npcArr 为表驱动占位，不冻对手数值 |
| 发放类 | lint 仍全绿（见 §2），无新发放；签到/祈福日限冒烟：首领 eRet 1 且 12589×1、元宝不动，次领 eRet 2 且存档不变；锁仓发放样本 8 键 eRet 2 且存档文本不变 |
| 买卖类 | 本轮无新开买卖/兑换；既有骰子地块对买→卖核账冒烟：买行 1 扣 19 元宝得货 7504×1，卖回得 9 元宝（买价×0.5 下取整）、货扣清、记录清，净额 −10，不净赚；无记录卖回 eRet 2 且存档不变 |
| 锁住列表 | 本轮新增 0（既有守卫 98 个维持，不补形状；锁仓发放样本行为不变） |
| 回滚 | 无。试验批属验证性改动，已按快照还原，不计入整批回滚；无验收回归触发 ISSUE-REG |

## §2 六门终版（日志 final/rounds/ISSUE16-2/gates/，顺序与任务一致）

| 门 | 结果 |
|---|---|
| gen_shapes --stat | PASS，382 动作 / 1130 字段（exit 0，与起点一致，无形状变动） |
| build-handlers | PASS，HANDLERS OK ver=hf5d89bf7 selfCheck=1514 bytes=1814791（exit 0；产物与快照仅 built= 时间戳一行不同，已按 E 轮先例还原回批前快照，终版 SHA 与起点一致；FLOW OK bytes=2747） |
| 形状冻结 --diff | PASS，diff 总数 = 0（exit 0；无基线变动，故无 planned-changes、无 --freeze 调用，不是裸 --freeze） |
| 形状冻结正式校验 | PASS，C1–C8、C10–C13 全部通过（exit 0；C9b 未实现为既有状态） |
| 拒绝码 | PASS，REJECT-CODES OK 动作=268 条目=285 拒绝点=391（exit 0；与起点一致） |
| 验收 | PASS，ACCEPTANCE OK 项=57 绿=57 已知红=0 cap=0（exit 0；53 测试 + 4 检查器，含 lint_freebie；项数未减；按设计追加 history 一行，seq=11，entries=[]，guardHash 不变 c0da379f8f24…） |
| lint_freebie | PASS，发放型 44，OK 42，待查 0，白名单恰好 2（passCardAward、useItem）（exit 0；freebie_allow.json 哈希与批前快照一致，未放宽） |

## §3 冒烟全量

| 冒烟 | 结果 |
|---|---|
| 本轮 round16-2-smoke.js | **411 pass，0 fail**（B58 296、GRANT 12、GRANT-LOCK 16、BUYSELL 11、BATCH2 4 档×19） |
| F165 live | **796 pass，0 fail**（基线不退） |
| C22 live | ALL PASS |
| merged（merge-v3/smoke-merged.js） | 49 pass，0 fail |
| A 轮 smoke-a-live.js | 130 pass，0 fail |
| B 轮 smoke-b-live.js | 225 pass，0 fail |
| C 轮 roundC-smoke.js | 124 pass，0 fail |
| D 轮 roundD-smoke.js | **205 pass，0 fail**（基线不退） |
| E 轮 roundE-smoke.js | **187 pass，0 fail**（基线不退，E 轮斗狗锁等结论未动） |
| SHRINK_OK（rc-v3.2/smoke-shrink.js） | 6 pass，0 fail |
| A/B live（金标版，veronly） | **6 pass，0 fail**（金标已为 hf5d89bf7） |
| c13 扩展（hotfix-patch/test/c13-smoke.js） | exit 0，c14 11 条全部通过 |

注：getKnackLottery 回包的 `order: 0` 是摸奖排序序号（数字），不是支付订单；
本轮冒烟的支付链否定只查 payData 与订单号类字段（orderID/orderNo/orderSn），
并对该动作单列“order 为数字序号”断言，不把数字 order 误判为订单。

## §4 核账（本轮新开买卖/兑换）

- 本轮无新开买卖/兑换（产品代码改动 0）：唯一买→卖核账项为既有骰子地块对的
  回归断言（买 19 → 卖 9，净 −10，卖 = 买×0.5 下取整），无净赚可能。
- 锁仓的发放/领奖键（本轮冒烟样本 8 键）全部 eRet 2 且钱包/背包/存档文本不动，
  扣与产均为 0，故无正净额项；无 payData 链新动作，无 ¥1=10 换算项。
- B58 回包支付链否定：58 个动作回包均无 payData/订单号键（getKnackLottery 的数字 order 除外，见 §3 注）。

## §5 存档往返（round16-2-roundtrip.js，日志 gates/roundtrip.log）

- 0205 / 0232 / 0250 三份快照 + 新建空档，各跑“加载 → 固定种子伪随机抽 50 个已实现动作
  （池含 B58 写档类 12 个全部）→ 存档 → 再加载”：**4 档全部 PASS**（每档 actions ok=50 threw=0 checks 8/8：JSON.parse、
  saveVersion=4、roleID=16374、钱包字段不为负、bag 无负数、再加载 JSON.parse、再加载 saveVersion=4、再加载 roleID=16374）。
- 真实存档未动：SHA 仍 `018d6afdf713863cc9b40eef0181632ad9fa2d55a6cb084c25ded3743722eb47`，
  mtime 仍 2026-10-27；本轮全部测试均用内存/沙箱存档副本，未使用任何维护通道，
  无写坏、无回滚、无重建；known-red.json 仍 `[]`。
- 活树改动面（除门日志与本轮文件外）：仅冻结工具 C9a 既有行为重写的 tools/facts/lookup-keys.json
  （E 轮亦然，已在 §1 试验还原时复核；其余 golden 文件哈希与批前快照全部一致），
  以及验收按设计追加的 known-red-history.jsonl 一行（entries=[]）。

## §6 ★ 清单、ISSUE 清单

- **★ 清单：0 项。** 本轮未新定任何价格/奖励/时长值；无 10 倍口径触发；无表奖励发明（无表项按 R5 维持锁仓/透传）。
- **ISSUE-LINT：无新增。** lint 待查 0，无免费发放新增，无锁仓新增。
- **ISSUE-REG：无。** 无验收回归、无整批回滚触发；基线与终版验收均为 57/57。
- **新 ISSUE-16-2-EV（债务项，交 P6 清理，不向任何人提问）：** B58 58 个动作的形状冻结
  需要一次经 ratified 的分类器证据扩展（为缺失叶在 field-classes.json 补带真实 bundle:line 的
  points，须先过 C1/C1b 变异验收与全门回归），或接受“读档/纯展示类维持透传”为终态。
  本轮已用试验批证明缺口不在 planned 规则层而在证据层；P6 处理时以本 checkpoint §1 与
  work/evidence-scan.json 为准，不重查。附带口径修正：本轮实测 knackLottery 空档+快照探针
  均 eRet 1 回字段，与 ISSUE-16 附录 D 旧口径（空探针 eRet 5）不一，处置表已按实测写。
- **锁仓 98 键维持（不新开 ISSUE）：** 守卫成员明细见附录处置表“守卫”组；其中扁平 5 个与维护 4 个
  的结构性排除理由与第一轮一致。

## §7 最终透传剩余数与处置

- **最终透传剩余数：306（与起点相同；本轮处置完成但形状未增，故剩余数不变）。**
  剩余构成全部属于确认无害的类别：守卫锁仓/结构排除类（98）、读档/纯展示类（B58 58 +
  batch2 读档 2 + 条件分支/eRetOnly/F165 诚实空态等 140）、已实现但无字段可冻/未进证据批类（8），
  无一类是“未核查就放行的发放/买卖”。逐项一句保留原因见附录（work/disposition-306.md 同文）。
- **“目标只剩确认无害的读档/纯展示类”的达成情况：** 剩余 306 中，真正回数据的读档/纯展示类
  （B58 58 + batch2 2 + 展示性条件分支）均已验成功分支；其余为回 eRet:1 无数据、
  单码拒绝、锁仓桩三类无害形态；唯一例外口径是已实现写档 8 个（含摸奖 knackLottery），
  它们的行为由既有门（lint 待查 0、验收 57/57）与本轮冒烟覆盖，不属新开风险。

## §8 补充注记落实情况（final/SUPPLEMENT-NOTE.md，4 条）

1. FINAL 只交 zip，不推仓库：本 checkpoint 写“zip 交付用户”，本轮未向仓库推任何东西。
2. FINAL 终局往返用树内真实存档副本（SHA 018d6afdf…，2026-10-27）：本轮往返按任务要求
   （三份快照 + 空档）做，该副本 SHA 本轮复核未变，供 P7 终局往返用。
3. 计数外键进 FINAL 附录：本轮不涉及 C43 的 3 键、C60 HOUSE_SPECIAL、B 轮面板可选键的计数变动，
   仍按 C 轮附录口径留待 FINAL 附录。
4. 斗狗规则：E 轮已关闭（PVP 永久锁、PVE 取证后永久锁），本轮未重开、未改动；E 轮冒烟 187/0 复核通过。

## 附录：306 透传逐项保留原因（与 work/disposition-306.md 同文）
| 动作 | 组 | 保留原因（一句） |
|---|---|---|
| AddSubtitleReq | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| ApplyFriend | 条件分支 | 空参回 eRet:1 无字段（eRetOnly 形态），拒绝分支字段不作成功形状，维持透传。 |
| BackToLogin | 条件分支 | 空参回 eRet:1 无字段（eRetOnly 形态），拒绝分支字段不作成功形状，维持透传。 |
| BuyAcitivityShop | 条件分支 | 空档+快照均未触发成功分支（空探针 eRet 4），不从拒绝分支 reason 反推成功形状，维持透传。 |
| CRLActivityAward | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| CheckDogPartnerPVEBattleResult | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| CheckName | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| ChooseFixDan | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| ChooseServer | 条件分支 | 空参回 eRet:1 无字段（eRetOnly 形态），拒绝分支字段不作成功形状，维持透传。 |
| ClientGMCommand | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| ClientLog | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| Create | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| FindFriend | 条件分支 | 空参回 eRet:1 无字段（eRetOnly 形态），拒绝分支字段不作成功形状，维持透传。 |
| FindFriendByID | 单码/条件 | 单码拒绝 eRet 0（非 1 非 2），无写档，维持现状。 |
| FriendDelete | 条件分支 | 空参回 eRet:1 无字段（eRetOnly 形态），拒绝分支字段不作成功形状，维持透传。 |
| GetBigMapSpecialEvent | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| GetCastElite | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| GetChatAddress | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| GetNewAdvertisementNum | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| GetSchoolRankList | 条件分支 | 空参回 eRet:1 无字段（eRetOnly 形态），拒绝分支字段不作成功形状，维持透传。 |
| GetServerList | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| GetSpecialShopData | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 curGold/selfData/shopData），但 sweep 排放叶缺 C3 证据（缺：selfData），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| GetvillainAward | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| Impeach | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| Implantation | 条件分支 | 空参回 eRet:1 无字段（eRetOnly 形态），拒绝分支字段不作成功形状，维持透传。 |
| KillSelf | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| LoadGame | batch2读档 | 三份快照+空档读档已验（roleID 16374，快照键≥50，读档后仍可 dispatch），保持现状并补冒烟断言，不补形状（整档快照非回调契约）。 |
| LoginReq | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| LookNewAdvertisement | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| LookOther | 条件分支 | 空参回 eRet:1 无字段（eRetOnly 形态），拒绝分支字段不作成功形状，维持透传。 |
| NewRoguePVPBattleResult | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 delTaskIds/mapData2），但 sweep 排放叶缺 C3 证据（缺：mapData2），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| OpenBox | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| OpenNovice | 条件分支 | 空参回 eRet:1 无字段（eRetOnly 形态），拒绝分支字段不作成功形状，维持透传。 |
| OutPrison | 已实现 | 已实现写档（出狱），空参 eRet 1 无回数字段，成功分支无字段可冻，维持透传。 |
| ReceiveAward | 单码/条件 | 条件分支：空档+快照均 eRet 4 未触发成功分支，不从拒绝分支反推，维持透传。 |
| ReceiveBigAward | 单码/条件 | 条件分支：空档+快照均 eRet 4 未触发成功分支，不从拒绝分支反推，维持透传。 |
| ReceiveGift | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| ReqDogPartnerBattleInfo | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| ReqGiveSupport | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| ReqSelfBattleInfo | batch2读档 | 三份快照+空档回数据已验（eRet 1，roleID 16374，26 键齐全，零写档），保持现状并补冒烟断言；npcArr 为表驱动占位，不冻对手数值。 |
| TellAction | 条件分支 | 空参回 eRet:1 无字段（eRetOnly 形态），拒绝分支字段不作成功形状，维持透传。 |
| UnloadingEuipment | 已实现 | 已实现写档（卸装备）：空参 eRet 1 无回数字段，成功分支无字段可冻，维持透传。 |
| UseDebris | 已实现 | 已实现写档（碎片使用），空参 eRet 1 无回数字段，维持透传。 |
| WinPrison | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| addChildFoster | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| addSpecailTask | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| anserQuestion | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| answerResult | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| applyMaster | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| applyPupil | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| backToSelfServer | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| batchResolveEquip | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| batchResolveKnack | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| beginDragonRollDice | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 started），但 sweep 排放叶缺 C3 证据（缺：started），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| bindingHuaWeiAccount | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| bindingRecuitCode | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| boosRankList | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 rankList），但 sweep 排放叶缺 C3 证据（缺：rankList），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| buildHomeFarm | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| buyAwardsCount | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| buyCopyBookGift | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| buyDiceShop | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| buyEjectGift | 条件分支 | 空档+快照均未触发成功分支（空探针 eRet 2），不从拒绝分支 reason 反推成功形状，维持透传。 |
| buyFormula | 条件分支 | 空档+快照均未触发成功分支（空探针 eRet 2），不从拒绝分支 reason 反推成功形状，维持透传。 |
| buyGiftTime | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| buyGoodAndEvilShopItem | 条件分支 | 空档+快照均未触发成功分支（空探针 eRet 4），不从拒绝分支 reason 反推成功形状，维持透传。 |
| buyOptionalGift | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| buySpecialShopItem | 条件分支 | 空档+快照均未触发成功分支（空探针 eRet 4），不从拒绝分支 reason 反推成功形状，维持透传。 |
| buySpringGiftPermanent | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| buyTargetTaskNum | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| buyTicket | 已实现 | eRetOnly：成功分支仅回 eRet:1（拒绝分支 reason 不作形状），字段增量 0，维持透传。 |
| bzBackfillRewards | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| bzGrantCur | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| bzPatch | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| bzSeedBag | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| cancelApply | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| cancelWulinPk | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| cellArrive | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| changeProperty | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| changeSkillKnack | 单码/条件 | 条件分支：空档+快照均 eRet 2 未触发成功分支，不从拒绝分支反推，维持透传。 |
| changeToTeamServer | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| checkLargeExtra | 条件分支 | 空参回 eRet:1 无字段（eRetOnly 形态），拒绝分支字段不作成功形状，维持透传。 |
| checkSpecial | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 special），但 sweep 排放叶缺 C3 证据（缺：special），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| checkTargetTask | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| checkTiger | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| chooseAnniversaryPassRg | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 choice），但 sweep 排放叶缺 C3 证据（缺：choice），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| chooseDiceBoxItem | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| chooseState | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| chooseSteal | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| clearGeSchoolClothing | 条件分支 | 空参回 eRet:1 无字段（eRetOnly 形态），拒绝分支字段不作成功形状，维持透传。 |
| closeCellEvent | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| confirmApply | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| createRecuitCode | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| cycleLife | 单码/条件 | 单码拒绝 eRet 9（转世规则服务端权威，离线不伪造），维持现状。 |
| diceBattleResult | 单码/条件 | 单码拒绝 eRet 0（骰子玩法未建模，不假装成功），维持现状。 |
| diceBuyPlaceGoods | 条件分支 | 空档+快照均未触发成功分支（空探针 eRet 2），不从拒绝分支 reason 反推成功形状，维持透传。 |
| diceCheckLargeExtra | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| diceExchangeItem | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| diceSellPlaceGoods | 条件分支 | 空档+快照均未触发成功分支（空探针 eRet 2），不从拒绝分支 reason 反推成功形状，维持透传。 |
| enterDogPVEBattle | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| enterMulitiNpcBattle | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| enterRogueMulitiNpcBattle | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| equipInheritSplit | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| equipSkill | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| exchangeGiftCoin | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| exchangeSpringShop | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| flingDice | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| flipCardCell | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| getAchieveData | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 groupPoints/rateIds/achieveIdArr/rd/taskData/srd），但 sweep 排放叶缺 C3 证据（缺：groupPoints.1,groupPoints.2,groupPoints.3,groupPoints.4,groupPoints.5,groupPoints.6 等共26条），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getAchieveMark | 条件分支 | 空参回 eRet:1 无字段（eRetOnly 形态），拒绝分支字段不作成功形状，维持透传。 |
| getActivityCounts | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 dataArr/SevenDaysArr/schoolActivityOpen/schoolArenaOpen），但 sweep 排放叶缺 C3 证据（缺：SevenDaysArr,schoolActivityOpen,schoolArenaOpen），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getActivityRank | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 rank），但 sweep 排放叶缺 C3 证据（缺：rank），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getAdvancedTasksData | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 tasks），但 sweep 排放叶缺 C3 证据（缺：tasks），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getAdvancedTasksTip | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 tip/advancedTasksTip），但 sweep 排放叶缺 C3 证据（缺：tip,advancedTasksTip），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getAlchemyData | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 data/activityData/alchemyGearConfig），但 sweep 排放叶缺 C3 证据（缺：data.price,activityData.freeNum,activityData.gear,alchemyGearConfig.1.GetYuanbao,alchemyGearConfig.1.FormulaTitle,alchemyGearConfig.1.FormulaTxt 等共478条），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getApplyList | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| getBigGrowupData | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 growObj/buyPrice/paystata），但 sweep 排放叶缺 C3 证据（缺：growObj.1[0],growObj.1[1],growObj.1[2],growObj.1[3],growObj.1[4],growObj.1[5] 等共184条），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getCRLActivityData | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 data），但 sweep 排放叶缺 C3 证据（缺：data），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getChatPkAward | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| getCopyBookData | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 copyBook），但 sweep 排放叶缺 C3 证据（缺：copyBook[0].Price,copyBook[0].Reward1[0],copyBook[0].Reward1[1],copyBook[0].Reward2,copyBook[0].Reward3,copyBook[0].Reward4 等共19条），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getDice | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| getDiceExchangeShops | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| getDiceShops | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| getDropAward | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| getEvaluateData | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| getExchangeItemData | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| getFlipCard | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 flipCard），但 sweep 排放叶缺 C3 证据（缺：flipCard），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getFriendPartner | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 notFriendPartnerData/friendPartnerDatas/isUnlock/happinessNum），但 sweep 排放叶缺 C3 证据（缺：friendPartnerDatas,isUnlock,happinessNum），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getGMGiveItemList | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 list），但 sweep 排放叶缺 C3 证据（缺：list），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getGardenShop | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| getGeHelpInfo | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| getGoldConsumedRewardData | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 totalConsumed），但 sweep 排放叶缺 C3 证据（缺：totalConsumed），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getGoodAndEvilData | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| getGoodAndEvilNoteData | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| getGoodAndEvilNpcData | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| getGoodAndEvilRankData | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| getGoodAndEvilRetireData | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| getGoodAndEvilRetireList | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| getGoodAndEvilShopData | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 shop/nextRefreshTime），但 sweep 排放叶缺 C3 证据（缺：shop[0].Name,shop[0].Description,shop[0].Data[0],shop[0].Data[1],shop[0].Price,shop[0].camp 等共225条），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getGoodAndEvilTaskData | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| getGrowupData | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 growObj/buyPrice/paystata），但 sweep 排放叶缺 C3 证据（缺：growObj.1[0],growObj.1[1],growObj.1[2],growObj.1[3],growObj.1[4],growObj.1[5] 等共177条），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getKnackLottery | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 lotteryId/lotteryArr/t/isFree/poolDateId/isRewardState/skillArr/eTime/optionalEndTimeMap/order/onePrice/tenPrice/trick_item/nextSkillArr），但 sweep 排放叶缺 C3 证据（缺：lotteryId,lotteryArr[0],t,isFree,poolDateId,isRewardState 等共14条），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getKnackLotteryHistory | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 history），但 sweep 排放叶缺 C3 证据（缺：history），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getLargeExtra | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| getLevelBonusData | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 bonusObj/endTime），但 sweep 排放叶缺 C3 证据（缺：bonusObj），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getLotteryActiveRewardData | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| getMAActivity | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 maActivity），但 sweep 排放叶缺 C3 证据（缺：maActivity），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getMasterRewardList | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 masterRewardList），但 sweep 排放叶缺 C3 证据（缺：masterRewardList），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getNationalDayCopy | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| getNpcSteal | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| getOpenActive | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 openActive），但 sweep 排放叶缺 C3 证据（缺：openActive），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getPacketDetailInfo | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| getPacketHistory | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| getPacketInfo | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| getPacketRankData | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| getPacketRewardData | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| getPileGameData | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 pileGame），但 sweep 排放叶缺 C3 证据（缺：pileGame），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getPraySignActive | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 claimedToday），但 sweep 排放叶缺 C3 证据（缺：claimedToday），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getPraySignAward | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 rewardArray/claimedDay/note），但 sweep 排放叶缺 C3 证据（缺：rewardArray.12589,claimedDay,note.ivch.12589,note.eco），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getPupilRewardList | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 pupilRewardList），但 sweep 排放叶缺 C3 证据（缺：pupilRewardList），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getRecuit | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 recuit），但 sweep 排放叶缺 C3 证据（缺：recuit），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getRogueData | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| getRogueExchangeGoods | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| getSchoolSupportPrePareCamp | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 prepareCamp），但 sweep 排放叶缺 C3 证据（缺：prepareCamp），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getScratchLotto | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| getSevenTaskAward | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| getShopItem | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 ShopArray），但 sweep 排放叶缺 C3 证据（缺：ShopArray.item,ShopArray.price），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getSignAward | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 rewardArray/claimedDay/note），但 sweep 排放叶缺 C3 证据（缺：rewardArray.12589,claimedDay,note.ivch.12589,note.eco），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getSkillChange | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| getSkillGrasp | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 skillGrasp），但 sweep 排放叶缺 C3 证据（缺：skillGrasp.knackBag,skillGrasp.skillGrasp），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getSkillTrickExchangeData | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 skillTrickExchangeData），但 sweep 排放叶缺 C3 证据（缺：skillTrickExchangeData.exchangeShop,skillTrickExchangeData.remainingNum,skillTrickExchangeData.costPrice），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getSpecialevts | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| getSpringCelebrateData | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 celebrateData），但 sweep 排放叶缺 C3 证据（缺：celebrateData），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getSpringChallengeData | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 challengeData），但 sweep 排放叶缺 C3 证据（缺：challengeData），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getSpringGiftPermanent | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 giftData），但 sweep 排放叶缺 C3 证据（缺：giftData），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getSpringRefiningData | 条件分支 | 空参回 eRet:1 无字段（eRetOnly 形态），拒绝分支字段不作成功形状，维持透传。 |
| getSpringRefiningResource | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| getTreePlanting | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 treePlant），但 sweep 排放叶缺 C3 证据（缺：treePlant），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getjigsawData | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 jigsaw），但 sweep 排放叶缺 C3 证据（缺：jigsaw），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getjigsawTaskData | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 jigsawTask），但 sweep 排放叶缺 C3 证据（缺：jigsawTask），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| getwulinArenaData | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 arenaData/rank），但 sweep 排放叶缺 C3 证据（缺：arenaData,rank），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| goldShopRefresh | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| goodAndEvilBattleResult | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 prestige/contribution），但 sweep 排放叶缺 C3 证据（缺：prestige），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| helpDoneTask | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| hireBagWeight | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| isCanShare | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 canShare），但 sweep 排放叶缺 C3 证据（缺：canShare），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| jionWuLinPkServer | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| joinGoodOrEvil | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| joinSchoolPrePareCamp | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 joined），但 sweep 排放叶缺 C3 证据（缺：joined），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| joinSchoolSupportPrePareCamp | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 support），但 sweep 排放叶缺 C3 证据（缺：support），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| knackLottery | 已实现 | 已实现写档（摸奖）：本轮空档+快照探针均 eRet 1 回字段（与附录 D 旧口径 eRet 5 不一），但未进 B58 证据批，维持透传；抽奖发放由 lint 覆盖（待查 0）。 |
| lastTimeRogueExplore | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| masterOutSchoolReward | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| masterPassMerit | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| masterReward | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| millBuild | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| millEarningsObtain | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| millUpgrade | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| npcRevive | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| onBatchBreakByGold | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| openChatPacketRed | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| openRandomBox | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| plantTree | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 beginTime/day），但 sweep 排放叶缺 C3 证据（缺：day），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| playerCure | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| pupilPassMeritReward | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| pupilReward | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| pushEvaluateData | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| putSpringRefiningItem | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| quicklogin | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| randomLightCell | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| receiveAchieveRateReward | 条件分支 | 空档+快照均未触发成功分支（空探针 eRet 4），不从拒绝分支 reason 反推成功形状，维持透传。 |
| receiveAchieveReward | 条件分支 | 空档+快照均未触发成功分支（空探针 eRet 4），不从拒绝分支 reason 反推成功形状，维持透传。 |
| receiveAchieveSuitReward | 条件分支 | 空档+快照均未触发成功分支（空探针 eRet 4），不从拒绝分支 reason 反推成功形状，维持透传。 |
| receiveAchievementReward | 单码/条件 | 单码拒绝 eRet 4（技巧成就条件未建模，不发奖），维持现状。 |
| receiveBonusAward | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| receiveChatPkAward | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| receiveCopyBookGiftAward | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| receiveGoldConsumedReward | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| receiveHelperReward | 已实现 | eRetOnly：成功分支仅回 eRet:1（拒绝分支 reason 不作形状），字段增量 0，维持透传。 |
| receiveJigsawAward | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| receiveJigsawTaskAward | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| receiveLotteryActiveReward | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| receiveNPCTargetTask | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| receivePacket | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| receivePacketRewardReward | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| receiveTargetTask | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| refreshFlipCard | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| refreshGoodAndEvilNpcData | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| refreshGoodAndEvilTaskData | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| refreshNotice | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| refreshSchoolTask | 条件分支 | 空参回 eRet:1 无字段（eRetOnly 形态），拒绝分支字段不作成功形状，维持透传。 |
| refreshSkillTrickExchangeData | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 exchangeShop/costPrice），但 sweep 排放叶缺 C3 证据（缺：exchangeShop,costPrice），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| registerMaster | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| registerPupil | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| removalHomeFarm | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| removeMartial | 条件分支 | 空参回 eRet:1 无字段（eRetOnly 形态），拒绝分支字段不作成功形状，维持透传。 |
| resolveEquip | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| resolveKnack | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| retrievePartner | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| reviveMulti | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| rewardMAActivity | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| rgChangeSkillKnack | 单码/条件 | 条件分支：空档+快照均 eRet 2 未触发成功分支，不从拒绝分支反推，维持透传。 |
| rgEquipSkill | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| rgEquipUpgrade | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| rgGetHonorData | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| rgGetHonorRed | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| rgGetShopData | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 shop/rank/endTime/reputationLevelId），但 sweep 排放叶缺 C3 证据（缺：shop[0].item,shop[0].costitem,shop[0].cost,shop[0].refresh,shop[0].rank,shop[0].reputation 等共266条），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| rgGetTalentData | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| rgHonorLvReward | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| rgHonorRankData | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| rgHonorRankReward | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| rgHonorWeekReward | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| rgLookOther | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| rgSeasonTop3Data | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| rgShopByItem | 条件分支 | 空档+快照均未触发成功分支（空探针 eRet 4），不从拒绝分支 reason 反推成功形状，维持透传。 |
| rgSycnWaitData | 条件分支 | 空参回 eRet:1 无字段（eRetOnly 形态），拒绝分支字段不作成功形状，维持透传。 |
| rgTalentResetting | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| rgTalentUpLv | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| rgUseItem | 条件分支 | 空档+快照均未触发成功分支（空探针 eRet 2），不从拒绝分支 reason 反推成功形状，维持透传。 |
| robotMoveAction | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| rogueBattleResult | 条件分支 | 空参回 eRet:1 无字段（eRetOnly 形态），拒绝分支字段不作成功形状，维持透传。 |
| rogueBuyGoldStore | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| rogueBuyStore | 条件分支 | 空档+快照均未触发成功分支（空探针 eRet 2），不从拒绝分支 reason 反推成功形状，维持透传。 |
| rogueEnterFloor | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| rogueEventOption | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| rogueExchangeGoods | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| rogueFindFriendByID | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| rogueFloorBuff | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| rogueGatherItems | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| rogueGoldStoreRefresh | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| rogueInitDataOption | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| rogueLeaveHideFloor | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| rogueOutfitting | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| roguePveBattleResult | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 booksObj/mapData2/delTaskIds），但 sweep 排放叶缺 C3 证据（缺：booksObj,mapData2），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| rogueRefreshValuables | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| rogueSellStore | 条件分支 | 空档+快照均未触发成功分支（空探针 eRet 2），不从拒绝分支 reason 反推成功形状，维持透传。 |
| rogueStartTurnRefresh | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| rogueStoreRefresh | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| rogueStoreTrunkEnd | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| rogueTianjieshiSellStore | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| rollDice | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 dice），但 sweep 排放叶缺 C3 证据（缺：dice），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| schoolTaskAward | 条件分支 | 空参回 eRet:1 无字段（eRetOnly 形态），拒绝分支字段不作成功形状，维持透传。 |
| scortResult | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| scrapingLottery | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| sendRedPacket | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| setAdvancedTasksTip | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 tip/advancedTasksTip），但 sweep 排放叶缺 C3 证据（缺：tip,advancedTasksTip），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| setPlayerItemSort | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 itemSort），但 sweep 排放叶缺 C3 证据（缺：itemSort），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| setPlayerSkillSort | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 skillSort），但 sweep 排放叶缺 C3 证据（缺：skillSort），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| skillGrasp | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 knackBag/skillGraspData），但 sweep 排放叶缺 C3 证据（缺：knackBag,skillGraspData），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| skillTrickExchangeIndex | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| specialCycleLife | 单码/条件 | 单码拒绝 eRet 9（同 cycleLife），维持现状。 |
| specifyLightCell | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| startAnniversaryPassRg | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| stealGoods | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| submitJigsawPrePareItem | 条件分支 | 空档+快照均未触发成功分支（空探针 eRet 2），不从拒绝分支 reason 反推成功形状，维持透传。 |
| submitNumMA | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| temporarilyRogue | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| tendingTrees | B58证据关 | handler 成功分支已验（空档+快照 eRet 1，回 tending），但 sweep 排放叶缺 C3 证据（缺：tending），试验批已证 C3 必然 FAIL，故维持透传不硬冻；分类器证据扩展留待 P6 债务项。 |
| treesReceiveReward | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| triggerCandy | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| triggerEvent | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| upPartnerQueue | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| upPushSwitch | F165诚实空态 | F165 通用纯 eRet 体，无客户端字段证据，形状只能是 {eRet:1}，维持透传。 |
| uploadPlayerArenaData | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
| useCard | 已实现 | 已实现写档（用卡），空参 eRet 1 无回数字段，成功分支需带参触发，维持透传。 |
| useTreasure | 已实现 | 已实现写档（用宝），空参 eRet 1 无回数字段，成功分支需带参触发，维持透传。 |
| wuLinAssemblyApplyReq | 守卫 | 锁仓守卫成员（锁仓桩/扁平层/维护通道），一律不补形状，维持透传。 |
