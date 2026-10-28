# P6 欠账清理检查点 checkpoint-P6.md（v4.0 终局 P6，不发上游）

- 起点：hf5d89bf7（核心 f4bf2827…，产物 40d2ca24…，形状 382/1130，验收 57/57，F165 796/0）
- 终版：hf5d89bf7，维持不变（产品代码改动 0，核心/产物/形状哈希与起点全部一致）
- 终版核心 SHA256：`f4bf282782b4ee6e691059e97c2e313c3a827581628c6f7d77c5648e3c4eec71`
- 终版产物 SHA256：`40d2ca2447d44f779a424e57020dd8326f56db6c0a5f83ff47e96d99d7a8191c`
- 终版 ver：hf5d89bf7，selfCheck=1514，bytes=1814791
- 顺序：先复核冻结、做批前快照与备份，再逐 ISSUE 查活树原始定义与现状、探针验证、冒烟、往返、六门
- 总账：ISSUE 9 项（8/10/11/12/13/14/15/17、16-2-EV）+ B 轮锁仓 9 键复核，全部已关闭，无待定项；
  本轮新增锁仓 0 个（所有锁仓均为活树既有状态，只做确认断言，未新加 handler）；
  ★ 0 项；ISSUE-LINT 0；ISSUE-REG 0；无整批回滚；无新挂 ISSUE
- 快照：final/rounds/P6/snapshots/pre-p6/（核心、产物 + SHA256SUMS.txt）
- 备份：BaoZouyxt/_backup/2026-10-28-222425-pre-p6/（批前核心/产物）
- 冒烟：final/rounds/P6/roundP6-smoke.js（228/0）；往返：final/rounds/P6/roundP6-roundtrip.js（4 档全过）
- 门日志：final/rounds/P6/gates/；探针：final/rounds/P6/work/probe-p6.js、probe2-p6.js（临时验证，不进交付）
- 交付方式：zip 交付用户（v4.0 补充答复第 1 条；本轮未向仓库推任何东西，未发任何提问清单，未等任何答复）

## §1 本轮完成数与关键结论

| 项 | 数/结论 |
|---|---|
| 产品代码改动 | 0。全部 ISSUE 项的活树现状只有两类：已实现（冒烟验证成功路径）或已锁仓（冒烟验证拒绝码 + 存档不变）；无一类需要新 handler，故无 ver 变更。build 产物仅 built= 时间戳一行变化，已按 C/D/E/P5 先例还原回批前快照，终版 SHA 与起点一致 |
| ISSUE 关闭 | 9/9 + B 轮锁仓 9 键复核关闭（见 §6 总表），无待定 |
| 新做掉的项 | 0 个新 handler；“做掉”体现在已实现路径的本轮验证（C11 通行证买活跃/领奖/播种任务奖、C12 单派遣闭环、C13 UFO 全序列、C15 回归七日首领、I10 本家事件），均有断言 |
| 锁仓确认 | 既有锁仓全部复核：拒绝码与存档不变断言均通过（ISSUE-8 29 键、ISSUE-10 3 键、ISSUE-14 4 键、B9 9 键等，见冒烟分组） |
| 证据关（EV） | B58 仍 58/58 PARTIAL、FULL 0（证据扫描复核），field-classes 仍 356 字段；按任务书口径不改冻结工具、不硬冻，结局为永久关闭（B58 保持透传），其透传保留原因并入 FINAL 透传表，不写成待定 |
| 回滚 | 无。无验收回归触发 ISSUE-REG；lint 初跑因默认路径错误（tools/../core/bz-rpc-server.js 不存在）exit 1，属调用方式问题非回归，改按验收第 4 检查器同款显式路径（hotfix-patch/core/bz-rpc-server.js）重跑后 exit 0，全绿 |

## §2 六门终版（日志 final/rounds/P6/gates/，顺序与任务一致）

| 门 | 结果 |
|---|---|
| gen_shapes --stat | PASS，382 动作 / 1130 字段（exit 0，与起点一致，无形状变动） |
| build-handlers | PASS，HANDLERS OK ver=hf5d89bf7 selfCheck=1514 bytes=1814791（exit 0；产物时间戳行已还原，终版 SHA 与起点一致；FLOW OK bytes=2747） |
| 形状冻结 --diff | PASS，diff 总数 = 0（exit 0；无基线变动，故无 planned-changes、无 --freeze 调用，不是裸 --freeze） |
| 形状冻结正式校验 | PASS，C1–C8、C10–C13 全部通过（exit 0；C9b 未实现为既有状态） |
| 拒绝码 | PASS，REJECT-CODES OK 动作=268 条目=285 拒绝点=391（exit 0；与起点一致） |
| 验收 | PASS，ACCEPTANCE OK 项=57 绿=57 已知红=0 cap=0（exit 0；53 测试 + 4 检查器，含 lint_freebie；项数未减；按设计追加 history 一行，seq=12，entries=[]） |
| lint_freebie | PASS，发放型 44，OK 42，待查 0，白名单恰好 2（passCardAward、useItem）（exit 0；freebie_allow.json 未动；显式核心路径调用，见 §1 说明） |

## §3 冒烟全量

| 冒烟 | 结果 |
|---|---|
| 本轮 roundP6-smoke.js | **228 pass，0 fail**（I8-C07 33、I8-CHILD 33、I8-RES 12、I8-OK 2、I10 11、I11 18、I12 17、I13 22、I14 12、I15 20、I15-DEAD 8、B9 27、I17 10、EV 3） |
| F165 live | **796 pass，0 fail**（基线不退） |
| C22 live | ALL PASS |
| merged（merge-v3/smoke-merged.js） | 49 pass，0 fail |
| A 轮 smoke-a-live.js | 130 pass，0 fail |
| B 轮 smoke-b-live.js | 225 pass，0 fail |
| C 轮 roundC-smoke.js | 124 pass，0 fail |
| D 轮 roundD-smoke.js | **205 pass，0 fail**（基线不退） |
| E 轮 roundE-smoke.js | **187 pass，0 fail**（基线不退，E 轮斗狗锁等结论未动） |
| P5 round16-2-smoke.js | **411 pass，0 fail**（基线不退） |
| SHRINK_OK（rc-v3.2/smoke-shrink.js） | 6 pass，0 fail |
| A/B live（金标版，veronly） | **6 pass，0 fail**（金标已为 hf5d89bf7） |
| c13 扩展（hotfix-patch/test/c13-smoke.js） | exit 0，c14 11 条全部通过 |

## §4 核账（本轮新开买卖/兑换）

- 本轮无新开买卖/兑换（产品代码改动 0），故无新增“买→卖/换→换回”核账项。
- 本轮冒烟中涉及的既有经济动作均无净赚路径：
  - C11 买活跃度：3 点扣 gold 30（10 gold/点，照表 livePricePerPoint），活跃度无卖出/换回路径；
  - C11 任务奖（播种验证）：任务 1 发 4003×100000（照表 score），无买入、无卖出；
  - C12 派遣领奖：1 号管家表奖励 []，taskArr [101,102] 无额外产出，净额 0；
  - UFO：买刷新扣元宝 100 得刷新次数 1（无转卖物）；抓取扣爪 1 得池内奖（池子 7→6，奖池一致），无买→卖循环；
  - 全部锁仓键扣与产均为 0，无正净额项；无 payData 链新动作，无 ¥1=10 换算项。

## §5 存档往返（roundP6-roundtrip.js，日志 gates/roundtrip.log）

- 0205 / 0232 / 0250 三份快照 + 新建空档，各跑“加载 → 固定种子伪随机抽 50 个已实现动作
  （池含 P6 已验只读键：getAnniversaryPassData、getHousekeeper、GetSchoolReview、getReturnSevenDayData、
  getReturnTaskData、getReturnGift、getUFOCatcherData）→ 存档 → 再加载”：**4 档全部 PASS**
  （每档 actions ok=50 threw=0 checks 8/8：JSON.parse、saveVersion=4、roleID=16374、钱包字段不为负、
  bag 无负数、再加载 JSON.parse、再加载 saveVersion=4、再加载 roleID=16374）。
- 真实存档未动：树内真实存档副本 SHA 仍 `018d6afdf713863cc9b40eef0181632ad9fa2d55a6cb084c25ded3743722eb47`
  （final/snapshots/pre-final/bz_offline_save.json 复核一致）；本轮全部测试均用内存/沙箱存档副本，
  未使用任何维护通道，无写坏、无回滚、无重建；known-red.json 仍 `[]`。

## §6 ★ 清单、ISSUE 总表

- **★ 清单：0 项。** 本轮未新定任何价格/奖励/时长值；无 10 倍口径触发；探针与冒烟中出现的数值
  （活跃 10 gold/点、刷新 100 元宝、派遣 30 分钟、首开池 7、首开赠爪 3）均为活树既有表/既有代码值，
  非本轮新定，只作验证断言。
- **ISSUE-LINT：无新增。** lint 待查 0，无免费发放新增，无锁仓新增。
- **ISSUE-REG：无。** 无验收回归、无整批回滚触发；基线与终版验收均为 57/57。
- **新挂 ISSUE：无。** 旧冒烟全绿，无新问题产生。

| ISSUE | 结局 | 一句原因 |
|---|---|---|
| ISSUE-8（因果/精炼/养育/性别、妻子培养、青楼、装备分解/心法合成） | 已关闭（永久锁） | 善恶 C07 11 键、洗练/寄养/妻子/青楼/好感 11 键、分解/合成 4 键活树均已锁（eRet 2，寄养重置 4、选性别 3、好感查询 4 为既有文案码），模型/产物表缺失，强行解锁即编造数据；已实现对照（善恶商店/结算）验证未回归；“因果”在树内无独立 handler（karma/因果 0 命中），由 C07 善恶锁覆盖 |
| ISSUE-10（好友家园、偷菜） | 已关闭（永久锁） | getFriendHomeList、stealCrop 均 eRet 2 且存档不变，他人家园数据不在本地存档；本家事件 2 键已实现验证、好友态变更 changeSate 回 -1 拒绝 |
| ISSUE-11（活动来源、任务 dv、周年语义、真机视觉） | 已关闭（永久锁） | 通行证已实现路径全验（买活跃 10 gold/点、0 门槛档、播种 dv 任务奖、重领拒绝）；剩余债务无法本机闭合：玩法事件活跃度来源无埋点累计（dv 只读存档不累计）、真机视觉无真机可验，改以冒烟断言为准，不再追 |
| ISSUE-12（管家评价、真实派遣任务链、UI 可达性） | 已关闭（永久锁） | 门派评价诚实空（reviewList []）与单派遣闭环全验（合法场景 30 分钟、忙回 5、提前回 3、到期领奖=表奖励、taskArr 无额外产出）；剩余债务无法本机闭合：多任务链结算无表（档 A 不结算产出）、UI 可达性属客户端侧不在离线核心范围，不再追 |
| ISSUE-13（UFO signCode 真校验、奖池一致性、游戏币任务链、商店/活动获取路线） | 已关闭（永久锁） | UFO 全序列已验（首开池 7、抓取扣爪 1 池 7→6、空 sign 15、刷新池重建 7 且 signId+1、买刷新扣元宝 100）；剩余债务无法本机闭合：signCode 真校验需服务端密钥（现仅验存在）、游戏币任务链与爪子商店/活动获取路线在树内无表（爪子仅首开赠送可验），不再追 |
| ISSUE-14（斗狗/多人战斗 4 键） | 已关闭（永久锁） | E 轮结论复核无改动：PVP、多人回放、PVE、伙伴 2 键全部 eRet 2 且存档不变（PVE NPC 表缺失结论沿用 E 轮取证，不重开） |
| ISSUE-15（C15 其他七日签到集、春节活动键、真实任务完成条件） | 已关闭（永久锁） | 回归七日已实现路径全验（首领成功、同日再领拒绝、任务全诚实 0 状态、礼包纯展示）；另一套七日签到与新春 3 键在 facts 中 handlers 均为空（无监听者、无 handler、无发奖路径），真实任务完成条件离线无埋点（任务恒未完成拒绝），不再追 |
| ISSUE-17（todo_shapes 重建版、known-red 置换、bz-bootstrap 真身、约 400 张 dump 表置换） | 已关闭（永久锁/不再追） | 门禁读到的项均正常：todo_shapes 60 条（gen 读取）、bz-bootstrap 真身在 hook（编解码实码，build.js 引用）、known-red [] 且验收 cap=0；门禁不读的项（cap/history 文件内容互换、约 400 张 dump 表名实互换）经核六门脚本均不读 cfg/dump，改动将危及 guardHash，故不碰文件、不再追；最终交付包需用户补交文件清单：无 |
| ISSUE-16-2-EV（B58 形状冻结证据扩展） | 已关闭（永久关闭） | B58 仍 58/58 PARTIAL、FULL 0，缺失叶不在 field-classes 356 字段中，证据层本身缺失；按任务书口径不改冻结工具、不硬冻，B58 保持透传，其保留原因并入 FINAL 透传表，不写成待定 |
| B 轮锁仓 9 键（ISSUE-B-TABLE 口径复核） | 已关闭（永久锁） | hireNpcOnhook、getLargeExtra、diceCheckLargeExtra、sweepCopy、putSpringRefiningItem、doubleTraining、endDoubleTraining、randomLightCell、specifyLightCell 全部复核仍 eRet 2 且存档不变，缺证据清单与 B 回执 §6 一致，不另立 ISSUE |

## §7 补充注记落实情况（final/SUPPLEMENT-NOTE.md，4 条）

1. FINAL 只交 zip，不推仓库：本 checkpoint 写“zip 交付用户”，本轮未向仓库推任何东西。
2. FINAL 终局往返用树内真实存档副本（SHA 018d6afdf…，2026-10-27）：本轮往返按任务要求
   （三份快照 + 空档）做，该副本 SHA 本轮复核未变，供 P7 终局往返用。
3. 计数外键进 FINAL 附录：本轮不涉及 C43 的 3 键、C60 HOUSE_SPECIAL、B 轮面板可选键的计数变动，
   仍按 C 轮附录口径留待 FINAL 附录；ISSUE-15 的 4 个无监听者键与 B58 透传保留原因同样供 FINAL 附录引用。
4. 斗狗规则：E 轮已关闭（PVP 永久锁、PVE 取证后永久锁），本轮复核未重开、未改动；E 轮冒烟 187/0 复核通过。

## §8 活树改动面

- 除门日志与本轮文件外：仅冻结工具 C9a 既有行为重写的 tools/facts/lookup-keys.json
  （E 轮与 P5 亦然）与验收按设计追加的 known-red-history.jsonl 一行（seq=12，entries=[]）；
  其余文件哈希与批前快照一致；freebie_allow.json 未动；known-red.json 仍 `[]`。
