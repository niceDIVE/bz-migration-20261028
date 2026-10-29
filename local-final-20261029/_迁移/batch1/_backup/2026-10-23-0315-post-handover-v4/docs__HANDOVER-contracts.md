# 契约与坑表（交接文档的展开版）

> 本文件是 `HANDOVER.md` 的**附录**：把"写错会清档/静默失效"的契约、全部已知缺口、以及踩过的坑摊开写。
> 开幕必须读 `HANDOVER.md`（一页上手 + 真值 + 下一轮）；动手改某一块时读这里对应的那一节。
> v3 全文本（404 行）在 `_backup\2026-10-23-0314-pre-handover-v4\HANDOVER.md`。

---

## 1. 线协议与信封

`{mod:"User", do:"<Action>", p:{…}}` → LZString(Base64) → AES-256-CBC → Hex。
Key `120734aa834dea925ca8d2e1bb6811c3` / IV `33daee8409834c00`。
**信封按 URL 决定**（不是按动作）：入口服 `:9898` → `{MsgData}`；账号/游戏服 → `{code:200, MsgData}`
（少了 `code` 客户端**静默丢弃**）。

## 2. `note` 各子表语义（事故出处：20 个卖 1 个被写成 1 个）

客户端把应答 `note` 的**每个键当事件名派发**：

| 键 | 语义 | 写错的后果 |
|---|---|---|
| `ivch` | `{物品id: **新数量（绝对值）**}`，0 = 删除 | 发"变动量" → 数量被覆盖 → **能反复卖** |
| `eqch` | `{uid:[0]}` 删 / `{uid:[1,[type,num]]}` 加 | 形状错 → 装备不落地 |
| `eco` | `{coins,gold,exp,ptt,chips,yuanbao: **新余额**}` | 钱包不变 |
| `attrch` | `{hunger,curhp,curmp,hplmt,hpbase,mpbase,exp,ptt,luck…}`（24 键） | 食物/药品没效果（客户端不本地应用） |
| `skch` | `{技能id:[lv,pgr,brlv]}` | 学技能只有提示、不写模型 |

**`eco` 只认 6 个键**，六个分支**全是赋值不是累加**；**潜能键是 `ptt`**（存档字段却叫 `potential`，发错静默丢弃）。
货币 id → 钱包：`1→gold`、`4001→coins`、`4003→potential/eco.ptt`、`8888→yuanbao`、`4002`=经验（存档无此字段 → `eRet:4`）。
发奖必须走 `grantCurrency()`，**绝不能** `grantItem()`（会写进 `bag`，客户端只读钱包）。

## 3. 三个"重建入口"的格式

| 动作 | 必须回 | 格式陷阱 |
|---|---|---|
| `User.LoadGame` | `finishTaskObj / acceptTaskArray / acceptTaskOrder / taskLog / itemObj / PlayerEquip / equipments / cycleObj / OnhookObj.serverTime / baseValueAy` | `finishTaskObj` 要**字符串数组** `["101080,1"]` |
| `User.sycnTask` | 同上四件套 | `PlayerFinishTaskObj` 要**对象** `{"101080":1}` |
| `User.sycnPlayerItemData` | `itemObj` = **全部持有物** | 回空 = 客户端先清空再重建 = **背包清空** |

**派生叠加（P0）**：接任务**不写**背包、交任务**不扣** `SpRequire`；差额只出现在投射里（同物品取 max）→ 净变化天然为 0。

## 4. 装备 / 战斗

- `PlayerEquip = {uid: [type, itemID, attrs, crystalIds, weaponSkinId]}`（`type==1` 无属性、`uid==itemID`、`num=data[1]`）；
  `equipments = {槽: uid}`。穿装备客户端发的是 **`User.equipWeapon`**（不是 `PutOnEquipment`），卸不带槽位。
  属性全来自 item 表 `Property1..5 / Data1..5`。
- `ReqSelfBattleInfo` 必须回声 `npcID` + `npcArr` **26 格**（`t[23]=HardModel` 必须是数组；否则 `initRivalEntity` 抛 TypeError
  被 MessageCenter 吞掉 → **战斗静默失败**，用户实测过）。结算 `CheckBattleResult` 按 `npc.Drop` 发奖（同 npc 5 秒去重）。

## 5. 开关字段（F1 事故）

客户端用 `hasOwnProperty("X")` 当开关的字段（`formulaID / mountID / taskID / gemId / isCollective / …`）**缺省必须不发**：
`formulaID:0` → `getItem(0,"formula")` 得 null → `Cannot read property 'name' of null`。

- `BeginTraining.isCollective`：**请求里有就原样回声，`0` 也必须发**。`0` 是语义分支（`index.js:120523`
  `if (n.hasOwnProperty("isCollective")) if (0 == n.isCollective) …` → 关门派练功界面 + 开普通练功 UI）。
  请求**永远带它**（`120752/120759`，默认 0）。`noteBadSwitches` 的"开关值不许为 0"对它误报 → `SWITCH_ZERO_OK` 白名单（带 `bundle:line`，只许减）。
- `BeginTraining` 拒绝码只能落在 1/2 之外；回调**还有 3**（`120569`，提示 423「[68]已经达到瓶颈了,需要闭关突破…」，
  且 `120570` 先 `getItem(skillID,"skill")` 再取 `.Name`）→ 文本不符且会崩，仍取 4。
- `BeginMeditation.hyTime` / `BeginTraining.hanyusuiTime` 是**契约**（少发 → `1e3*undefined`=NaN）。

## 6. 拒绝应答契约

**拒绝应答只许带 `{eRet}` ∪ 该动作白名单**（`dispatch` 的 `narrowReject()`，`bz-rpc-server.js:124`），
且只对 `tools\facts\reject-codes.json` 登记的 16 个动作生效：

| 动作 | 白名单 | 为什么 |
|---|---|---|
| `useItem` | `itemID` | 客户端弹提示要用 |
| `washAdditionalArr` | `attrList` | 它的 4 是 **flow**（弹"选洗哪条"），客户端要读 4 段字符串 |
| 其余 14 个 | 无 | 拒绝码分支里一条都不读 |

**为什么必须收窄**：`BeginTraining` 拒绝曾带 `{beginTime:0, skillID:0}`；`beginTime:0` 今天无害，但一旦有人把拒绝码改成 3，
客户端就会拿 `skillID:0` 去 `getItem(0,"skill")` 得 null 再读 `.Name` 崩 —— 那个 0 是我们自己发的。
代价：冻结基线出现「发→不发」，逐字段进 `approved-narrowing.json`（`escape:"closed"` + 客户端行号）+ 7 条 `planned-changes.json` 规则。
自检兜底：`shape:<动作>:rejectKeys`。

## 7. 异常不许变成成功

`dispatch` 的 `catch` 四件事，缺一不可：
1. `_catchCount++`（R5c 探测器）；
2. `_save = null`（丢内存缓存 → 下次 `loadSave()` 从盘上重读）；
3. `repushLive(loadSave())` 把权威值**重推给活客户端**（handler 可能已走过 `RoleBaseInfo` 那条第二出口），**每一段各自 try**（否则 push 抛异常会吞掉应答）；
4. 回**该动作推导出的 `catchCode`**（`tools\derive_catch_codes.js`：∉ success ∪ handled ∪ codes；目前只覆盖 16 个动作），
   推导不出就**不回 eRet** + `⚠ catchNoCode`（回错码会让客户端走进它以为存在的分支）。

## 8. 时间字段

客户端用 `getSTimestamp() - startTimestamp` 算时长；`beginTime` 默认填常量或 0 都会"一进去就完成" → handler 必须回 `env.now()`。
`getSTimestamp()` = `0==sserverT||0==startTime ? Date.now() : sserverT+Date.now()-startTime`（`sserverT=0` 回退本地时钟）。
`hyTime`/`hanyusuiTime` = 寒玉髓 buff(1043) 剩余秒数；我们没有 buff 系统 → 回 0 自洽；**一旦实现买 buff 必须改成剩余秒数**。

## 9. 物品效果族（"还原原版功能"的主线）

数据链：`tools\cfg\dump\item.full.json`（live dump 全量 **6525 行**，字段 `ID/Name/Type/Effect/Data1..5/…`）
→ `tools\facts\item-effects.json`（`{id:{e,d1,d2,d3,t,n}}`，76 个 Effect 码）
→ 构建期注入 `BZ_ITEMFX = {itemID: [Effect, Data1, Data2, Data3]}`（只收 **Type==2**：客户端整段 `switch (e.Effect)` 只在 `2 == e.Type` 时执行，`index.js:64321`）。
另：`tools\facts\effect-branches.json`（76 码 → SEND 25 / GATED 18 / LOCAL 5 / OTHER 5 / NONE 23）。

| Effect | 语义 | 状态 | 依据 |
|---|---|---|---|
| 1 / 2 / 3 | 食物（Data1=饱食度）/ 回血 / 回内 | ✅ | `BZ_ITEMEAT` / `BZ_ITEMFUN` |
| 11 | 秘籍（Data1=技能 id） | ✅（**已学会分支错**，见缺口 #19） | `BZ_ITEMSCH` |
| **5** | **师门秘籍**（Data1=技能 id） | ✅ | `index.js:64342-64347`：`SkillTable.dic.hasOwnProperty(e.Data1)` → 提示 243 拦截；`getItem(e.ID,"master_book")` 判条件/门派 |
| **28** | **称号**（Data1=title id） | ✅ | 名字判据：7027「"烙饼试吃员"称号」/7026「"测试员"称号」；`player_title` 表 2044/2045；应答带 `titleID`（`64812`） |
| 13 | 礼包/宝箱（Data1=自身 id 或另一 item） | ⛔ | 客户端**零本地逻辑**（无 case 13、无 default）→ 语义全在服务端；缺礼包表名 |
| 15 | 美肤/祛疤？（`numDeaths==0` → 提示 4374「没有伤痕,不需要使用美肤露」） | ⛔ | 3020「嫦娥月饼」名字不符，待判 |
| 24 / 6 / 8 | 兔子炸弹等 | ⛔ | 有前置拦截 |

**可达性口径**（`tools\facts\obtainable.json`，全表域 6525）：可获得 2515 / 未建模 6296 / `N=2386`（1785 件只有"整 handler 高估"来源）；
**未建模∧可达 = 3263，其中可获得 715**；**账本里现存∧未建模∧可达 = 2 件**（3020/Effect 15、7027/Effect 28，后者已做）。

**活动窗口平移（时间炸弹）**：`templates.json` 的 `create.activityResource` 是抓包真值（活动 67 结束=2026-10-28），
静态值会让活动几天后全关 → `rebaseActivityWindows()` 按 `delta = now - 抓包 serverTime` 平移（`REBASE_ACTIVITY_WINDOWS`，一行回退）。
live 实测：`{"67":[null,1793301157473]}` = now + 7 天。

## 10. 全部已知缺口（21 项）

| # | 缺口 | 现况 |
|---|---|---|
| 1 | 每日任务链（活动面板完成/领奖） | 18 条 0 进度；动作族未取证 |
| 2 | ~~兑换 118 行货币奖励是假的~~ | **已修**（走钱包 + `note.eco`；验收器 118/118） |
| 3 | 形状表作用域化（47 个冲突字段） | 前置 `tools\span_gain.js` 未写 |
| 4 | 成就进度 | 只有 3%（58/2113）可从存档推导 |
| 5 | 七日活动 `taskObj` | 需创建时间/第几天语义 |
| 6 | 秘籍"学技能"等级规则 | Effect 11 未学会→1 级（假定） |
| 7 | 未建模效果物品 | 用户裁定先不改行为；按家族做（5/28 已做） |
| 8 | `Map=0` 入口不可达 | 边界需用户裁定 |
| 9 | 转世/先天/洗点"内容侧" | 规则不在客户端 → 诚实拒绝 |
| 10 | 江湖/兑换 `rank/reputation` 门槛 | 按 0 降级 |
| 11 | `includes` 异常（登录窗口 3 次） | 不崩、不影响游玩 |
| 12 | 饥饿跨重启 | `LoadGame` 无 hunger 字段 |
| 13 | `Repeat` 奖励上限 | `rewarded` 一次封顶 |
| 14 | ~~`core-test-server.js` 遗留红~~ | **已修**：T5 请求缺 `skillArr` → 无效分支；断言只锁"不写档" |
| 15 | `EndMeditation`/`EndTraining` 无 handler | 请求不带时长 → 结算不能做（R10 Q1） |
| 16 | `hyTime/hanyusuiTime` 依赖"没实现 buff" | 实现买 buff 1043 必须改 |
| 17 | C9b 未实现 / C9a 只是下界 | 371 是下界 |
| 18 | 未建模消耗的计数表 | 已有 `meta.consumeStats`（`CONSUME_UNMODELED`），cap 应为 0 |
| 19 | **Effect 11 已学会分支是错的** | `T?ConditionUp:Condition` + 走 `ConsultUI`（`64383`/`64401-64417`）= 原版允许继续用；我们拒绝 → 书升不到 2 级。卡在 `ConsultUI` 不在 `index.js` |
| 20 | 87 动作 `catchCode` | 只覆盖 16 个；`handled` 抽取看不到 `!eRet`/不等号/末尾 else |
| 21 | `R5`（动作×原因夹具 + 业务哈希） | 口径已定（canon 计数组序、门控两态都测），未实现 |

## 11. 坑表（12 条）

| # | 坑 | 对策 |
|---|---|---|
| ① | 拿 `ver` 判断"这次有没有改代码" | `ver` 含形状包与 `built=` 时间戳 → **不是内容稳定的**；用**源文件 md5**（根因已修：`generatedAt` 用 GEN_NOW + 构建期断言"时间戳只许 GEN_NOW"） |
| ② | catch 里回 `eRet:4` 当默认拒绝码 | 4 在各动作语义不同（支付拦截/弹选择框/解引用 `item.Data2`）；用 `derive_catch_codes.js` 推导，推不出不回 eRet |
| ③ | 以为 `_save=null` 就是回滚干净 | 只回滚服务端账本；还要 `repushLive()` 重推活模型 |
| ④ | 把"扣了没效果"记成 REJECT | 它真扣了、也写了档 → `CONSUME_UNMODELED` + `meta.consumeStats` |
| ⑤ | 用行号做"已知红"的键 | 加一行注释就错位 → `file + assertSha8 + msgSha8`；`--update` 拒绝实现 |
| ⑥ | `BZ_ITEMFX[id][0]` 直接取值 | Type≠2 不在表里 → TypeError；写 `(fx||[])[0]` |
| ⑦ | 把抓包静态时间当"永久有效" | 活动窗口会过期 → 按偏移平移 |
| ⑧ | 用 PowerShell `Set-Content` 改含中文文件 | 会写坏 UTF-8 / 加 BOM）；含中文源码/JSON 只用 edit/write |
| ⑨ | 变异运行会写产物 | `BZ_MUTATE` 必须零写入 + C1b 断言产物 md5 不变 |
| ⑩ | 补了新 handler 就以为完事 | `fillShape` 会用**从别的动作借来的**默认值兜底；新 handler 必须显式给关键字段 |
| ⑪ | Node 的 piped stdio 在本机沙箱下失败 | `child_process` 用 `stdio:'pipe'` 会被拒；改用文件描述符 |
| ⑫ | 残留 `bz_cmd.txt` 每次启动重放 | boot-2 已根治：开机丢弃 + 删不掉就拒绝执行 |

## 12. 验收细节

```powershell
node tools\acceptance.js            # 35 项 = 32 套 test + 冻结 + 拒绝码 + 兑换
node tools\check_shape_freeze.js    # C1–C13
node tools\check_reject_codes.js    # R1/R2 三态/R3/R4/F1-F3/R5b+（R5 每次打印"未实现"）
```

| 规则 | 内容 |
|---|---|
| K1 / K2 / K3 | 已知红按 `file+assertSha8+msgSha8` 匹配；新增红 FAIL / 修好不删登记 FAIL / 同文件第二个红 FAIL |
| K-cap | 条目 ≤ `known-red-cap.json` 的 cap（基线取**历史最低值**）；cap 只许降 |
| G3 | `known-red-history.jsonl` 只追加；同条目连续 ≥3 行仍在 → FAIL |
| G5 | cap 增加时必须 `guardHash` 相同（口径 `guardVer` 变更时打印 SKIP，不冒充 PASS） |
| `--update` | 拒绝实现（只许人工改登记表） |

自检 1242 项覆盖：动作存在 / `eRet` / 字段齐全 / 形状来源 / 任务+物品+装备闭环 / 维护动作不写盘 /
开关字段不许被 fill 补出 / 货币奖励不许进背包 / `eco.ptt` / live 时钟=真实时钟 / `shape:*:rejectKeys`。
`test\r14-catch-smoke.js` = R5c：87 handler × {空请求, 类型全错} + catch 回滚 + 未建模留痕。

**探针三铁律**：禁全图 BFS（`Set` 判重 + 限量）｜超时先清残留命令文件｜探针文件只用 edit/write。
