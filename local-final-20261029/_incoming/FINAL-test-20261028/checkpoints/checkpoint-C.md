# C 轮检查点 checkpoint-C.md（v4.0 终局 P2，不发上游）

- 起点：hf5d89bf7（核心 f4bf2827…，产物 40d2ca24…，形状 382/1130，验收 57/57，F165 796/0）
- 终版：hf5d89bf7，维持不变（无产品代码改动）
- 终版核心 SHA256：`f4bf282782b4ee6e691059e97c2e313c3a827581628c6f7d77c5648e3c4eec71`
- 终版产物 SHA256：`40d2ca2447d44f779a424e57020dd8326f56db6c0a5f83ff47e96d99d7a8191c`
- 终版 ver：hf5d89bf7，selfCheck=1514，bytes=1814791
- 顺序：27、31、33、35、36、38、51、53、56、63、68、71、73、75（轮内顺序自定）
- 总账：35 键 = 成功 18、锁仓/拒绝 17（eRet 2 计 15、eRet 9 计 2）、产品代码改动 0
- 清点：final/rounds/C/work/inventory-C.md；冒烟：final/rounds/C/roundC-smoke.js；
  往返：final/rounds/C/roundC-roundtrip.js；门日志：final/rounds/C/gates/
- 快照：final/rounds/C/snapshots/pre-c/（核心、产物、跑器、形状、存档，SHA 在同目录 SHA256SUMS.txt）
- 交付方式：zip 交付用户（v4.0 补充答复第 1 条取代“待推送”写法；本轮不向仓库推任何东西）

## §1 每批一行

| 批 | 结果一行 |
|---|---|
| C27 轮回 | 拒绝 5（cycleLife/specialCycleLife eRet 9、isCycleLife/BuyHouseShop/getSpecialAward eRet 2），存档不动，无新代码。冒烟 15/0。 |
| C31 创建/重置 | 成功 1（getCreateRoleActivity 读 createTime）+ 模板原值 1（getCRAInfo 实测 eRet 2）+ 锁仓 1（resetRole 破坏性 eRet 2），无新代码。冒烟 8/0。 |
| C33 技巧兑换 | 成功 2（空兑换店 + 空店刷新）+ 锁仓 1（skillTrickExchangeIndex 无表 eRet 2），无新代码。冒烟 12/0。 |
| C35 突破队列 | 锁仓 2（addBreakQueue、removeBreakQueue eRet 2，维持裁定），无新代码。冒烟 6/0。 |
| C36 装备锁定 | 成功 2（addEquipLock、delEquipLock 存档标志写，无 id 拒绝），无新代码。冒烟 7/0。 |
| C38 批量突破 | 锁仓 2（beginHookBreakList、onBatchBreakByGold eRet 2；R7 单次版本身锁仓，无物可循环），无新代码。冒烟 6/0。 |
| C51 装备升级 | 锁仓 2（EquipSuitsUpgrade、equipUpgrade eRet 2，维持裁定），无新代码。冒烟 6/0。 |
| C53 高级任务提示 | 成功 3（get/setAdvancedTasksTip 存档写、getAdvancedTasksData 诚实空），无新代码。冒烟 9/0。 |
| C56 自定义 AI | 成功 2（get/setChatPkAiSet 存档 customAI 读/写），无新代码。冒烟 9/0。 |
| C63 绝技 | 成功 2（getMultiPVESkill、getTeamSkill 诚实空 dataArr []，不造多人数据），无新代码。冒烟 6/0。 |
| C68 金币突破 | 成功 1（getHookBreakList 读 breakQueue）+ 锁仓 2（goldBreakAllSkill、goldBreakCurrentSkill eRet 2，维持裁定），无新代码。冒烟 9/0。 |
| C71 装备仓库 | 成功 2（PushEquip、PopEquip 仓库移动，容量 50，已装备/未持有/未入库拒绝），无新代码。冒烟 17/0。 |
| C73 穴位 | 锁仓 2（restVein、upgradeVein eRet 2，缺成本列维持锁），无新代码。冒烟 6/0。 |
| C75 排序 | 成功 2（setPlayerItemSort、setPlayerSkillSort 存档写，无参默认 0），无新代码。冒烟 8/0。 |

## §2 六门终版（日志 final/rounds/C/gates/）

| 门 | 结果 |
|---|---|
| gen_shapes --stat | PASS，382 动作 / 1130 字段（exit 0，与起点一致，无形状变动） |
| build-handlers | PASS，HANDLERS OK ver=hf5d89bf7 selfCheck=1514 bytes=1814791（exit 0；产物仅 built= 时间戳一行不同，已还原回 pre-C 快照，终版 SHA 与起点一致） |
| 形状冻结 --diff | PASS，diff 总数 = 0（exit 0；无基线变动，故无 planned-changes、无 --freeze 调用，不是裸 --freeze） |
| 拒绝码 | PASS，REJECT-CODES OK 动作=268 条目=285 拒绝点=391（exit 0；证据组 136/153、运行时组 132/132，与起点一致） |
| 验收 | PASS，ACCEPTANCE OK 项=57 绿=57 已知红=0 cap=0（exit 0；53 测试 + 4 检查器，含 lint_freebie） |
| lint_freebie | PASS，发放型 44，OK 42，待查 0，白名单恰好 2（passCardAward、useItem）（exit 0；freebie_allow.json 未动） |

## §3 冒烟全量

| 冒烟 | 结果 |
|---|---|
| C 轮 roundC-smoke.js（35 键） | **124 pass，0 fail**（C27 15、C31 8、C33 12、C35 6、C36 7、C38 6、C51 6、C53 9、C56 9、C63 6、C68 9、C71 17、C73 6、C75 8） |
| F165 live | **796 pass，0 fail**（基线不退） |
| C22 live | ALL PASS |
| merged（merge-v3/smoke-merged.js） | 49 pass，0 fail |
| A 轮 smoke-a-live.js | 130 pass，0 fail |
| B 轮 smoke-b-live.js | 225 pass，0 fail |
| SHRINK_OK（rc-v3.2/smoke-shrink.js） | 6 pass，0 fail |
| A/B live（金标版，veronly） | **6 pass，0 fail**（原版 1 处金标旧值 ha991283b 属预期，金标版已为 hf5d89bf7） |
| c13 扩展（hotfix-patch/test/c13-smoke.js，输出 c14 11 条） | exit 0，全部通过 |

## §4 核账（本轮新开买卖/兑换）

- 本轮无新开买卖/兑换：35 键中唯一交换类是已实现的 C71 仓库移动（非买卖），
  断言 push→pop 往返净 0（背包 5→3→5、仓库 0→2→0）、总量守恒 5、钱包全程不动、无复制。
- 锁仓的购买/升级/领奖键（BuyHouseShop、getSpecialAward、skillTrickExchangeIndex、
  goldBreak*、equipUpgrade*、upgradeVein/restVein）全部 eRet 2 且钱包/背包不动，
  扣与产均为 0，故无正净额项；无 payData 链动作，无 ¥1=10 换算项。

## §5 存档往返（roundC-roundtrip.js，日志 gates/roundtrip-final.log）

- 0205 / 0232 / 0250 三份快照 + 新建空档，各跑“加载 → 50 个已实现动作 → 存档 → 再加载”：
  **4 档全部 PASS**（每档 actions ok=50 threw=0 checks 8/8：JSON.parse、saveVersion=4、
  roleID=16374、钱包字段不为负、bag 无负数、再加载成功）。
- 真实存档未动：SHA 仍 `018d6afdf713863cc9b40eef0181632ad9fa2d55a6cb084c25ded3743722eb47`，
  与 pre-C 快照一致；本轮全部测试均用内存/沙箱存档副本，未使用任何维护通道，
  无写坏、无回滚、无重建；known-red.json 仍 `[]`（验收运行按设计追加 history 一行，entries=0）。

## §6 ★ 清单、ISSUE 清单、未决项

- **★ 清单：0 项。** 本轮未新定任何价格/奖励/时长值；无 10 倍口径触发。
- **ISSUE-LINT：无。** lint 待查 0，无免费发放新增，无锁仓新增。
- **ISSUE-REG：无。** 无验收回归、无整批回滚触发；基线与终版验收均为 57/57。
- **锁仓 17 键的缺证据清单（维持锁仓，不开新 ISSUE）：**
  cycleLife/specialCycleLife（服务端权威重置规则不在客户端）、isCycleLife（同上）、
  BuyHouseShop（房价未映射）、getSpecialAward（转世特别奖励表缺）、resetRole（破坏性重置无安全规则）、
  skillTrickExchangeIndex（口诀兑换表/下标未映射）、addBreakQueue/removeBreakQueue（单价与队列 schema 未证）、
  beginHookBreakList（挂机突破花费/日上限未证）、onBatchBreakByGold（单次金币突破本身锁仓）、
  EquipSuitsUpgrade/equipUpgrade（升级花费映射未证）、goldBreakAllSkill/goldBreakCurrentSkill（单技能金价未证）、
  restVein/upgradeVein（穴位成本列缺、退还规则未映射）。
- **分类轮出入（活树为准，已记入清点）：** C71 分类轮称锁、活树已实现；C31 getCRAInfo
  分类轮称只读、活树实测 eRet 2 模板原值；C27 IS_CYCLE_LIFE 分类轮称只读、活树实测 eRet 2。

## §7 附录线索（计数外键，不进 C 轮 35 键计数，不进 76 批计数；供 FINAL 附录用）

- C53 面板可选：RECEIVE_ADVANCED_TASK、RECEIVE_ADVANCED_TASK_REWARD
  （分类轮递延：无奖励表，实施时须先锁；本轮未动、未核活树 handler）。
- C71 面板可选：UPGRADE_BED、UPGRADE_STORAGE（分类轮递延；本轮未动）。
- C73 面板可选：ROGUE_EQUIP_WEAPON、CHANGE_NAME、EQUIP_TITLE
  （分类轮递延，不属 C73 order+must；本轮未动）。
- 沿用 v4.0 补充答复：C43 的 3 键、C60 HOUSE_SPECIAL、B 轮面板可选键同样进 FINAL 附录，
  每键一行（状态 + 原因），不进 76 批计数。

## §8 后续轮注意（v4.0 补充答复，供 P3–P7 沿用）

- FINAL 只交 zip，不推仓库；各轮 checkpoint 与 FINAL 回执写“zip 交付用户”，不再写“待推送”。
- FINAL 终局往返用树内真实存档副本（SHA 018d6afdf…，2026-10-27），不等待新存档；
  C 轮往返仍按原要求（三份快照 + 空档）做，不受此条影响（本轮已按原要求完成）。
- 斗狗（与 C 轮无关，P4 E 轮注意）：PVP 永久锁；PVE（enterDogPVEBattle 一类）只在客户端
  配置表里自带 NPC 狗数据时才做，按 R1 取证 15 分钟，对手属性只读表、己方狗读存档、
  胜负本机算、奖励有表按表发、无表产出 0、每天上限 10 次、标★，找不到 NPC 表就永久锁，不造对手数据。
- 下一轮：P3 D 轮（17、24、25、37、54、58 永久锁、61、62、64、65、67），路线与规则不变。
