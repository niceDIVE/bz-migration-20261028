'use strict';
/**
 * bz-rpc-server.js —— 真协议环回服务器（依据 2026-10-21 实机抓包 54 报文逐动作仿真）
 *
 * 已实测确认的协议规格：
 *   请求  : {"mod":"User","do":"<Action>","p":{...}} → LZString(Base64) → AES-256-CBC(UTF-8 Key) → Hex
 *   响应  : 两种形态——
 *           扁平: quicklogin / Create / GetChatAddress / CheckName（顶层直接 eRet/roleID/...）
 *           包裹: {"error":0,"p":"User.<do>","resultCode":200,"User.<do>":{...},"achievement":{...}}
 *   策略  : "模板回放 + 动态字段"——响应结构用抓包模板原样保真，仅替换 roleID/名字/时间/任务号。
 *
 * 传输无关：dispatch() 只产出业务对象；handleRequest() 负责编解码与信封选择。
 * 因此本文件可同时在进程内（handlers.js）与 Node（L0 测试）里跑。
 *
 * 注：ensureRole() 为 2026-10-21 21:08 外部加入的"首次运行自动造角色"雏形，
 *     当前尚未接入 quicklogin（保持原行为不变），留待持久化步骤启用。
 */

function createBzServer(env) {
  var TPL = env.templates || {};
  var SAVE_KEY = 'bz_server_save_v2';
  var _save = null;
  var _codec = env.codec || null;

  /* ===== 存档版本化（A03 采信：顺序迁移 + 写前校验 + 写后回读 + 语义守卫） =====
   * 设计要点（改动前先读这段）：
   *  1) 迁移步骤全部「可重入」，所以加载时**永远从 v1 跑起**，不靠"形态指纹"猜版本
   *     （我们的存档里 skills 是混形态：既有 [lv,pgr,brlv] 也有裸数字，指纹必误判）。
   *  2) saveVersion 只用来挡住「比当前程序更新的存档」：> LATEST 一律拒绝写回。
   *  3) 任何一步失败就进**只读模式**：游戏照常能玩（内存态），但一个字节都不落盘。
   *  4) 写前跑 validateSave + guardSave（缩水守卫），写完立刻回读比对，不一致就报警。
   *  详见 docs/sota/A03-save-versioning/adopted.md */
  var LATEST_SAVE = 4;
  var _readOnly = false;        // 迁移/校验/解析失败 → 只读，绝不写回
  var _lastGood = null;         // 上一次成功落盘的快照（缩水守卫的基线）
  var _currentAction = null;    // 当前正在处理的动作（守卫的 who 依据）
  // 动作计数（R04 Q4，2026-10-22）：替代会轮转的 bz_log.jsonl。只内存累加，下一次 persist
  // 落进 save.meta.actionStats；沙箱实例（自检/测试）不计数。
  var _actionStats = {};
  /** 饥饿上限（R05 F2）：客户端在 END_PLAY_GAME / CHECK_BREAK / END_DOUBLE_TRAINING 的请求里
   *  带 `hglmt`（index.js:24729 / 56272 / 56707）——那是它按属性算出来的**真上限**。
   *  我们只会从请求里学到它；学不到就不截断（宁可不动，也不编一个上限）。 */
  var _hungerMax = 0;
  /** hg 的合法范围（R05 F2 第 2 条）：非法就干脆不发 note.attrch，绝不把脏值写进客户端模型。 */
  var HG_MAX_SANE = 1e7;

  function hasOwn(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function num(v, d) { return (typeof v === 'number' && !isNaN(v)) ? v : d; }
  function cloneJson(o) { try { return JSON.parse(JSON.stringify(o)); } catch (e) { return null; } }
  function sumBag(bag) { var t = 0, k; for (k in bag) if (hasOwn(bag, k)) t += num(bag[k], 0); return t; }

  /** 动作计数（R04 Q4）：只内存累加，由 persist() 落到 save.meta.actionStats。
   *  沙箱实例（自检/测试用的隔离 server）一律不计数——否则自检会把假计数写进真存档。 */
  function noteAction(action) {
    if (env.sandbox) return;
    _actionStats[action] = (_actionStats[action] || 0) + 1;
  }

  /** 拒绝计数（SOTA R13 §5 / §3 的"cap 为 0 的计数表"）：
   *  静默拒绝（客户端对该码不进门、不弹提示）必须留痕 —— 玩家看到的是"点了没反应"，
   *  而根因通常是**投射分叉**（客户端模型有、账本没有），不是合法拒绝。
   *  只内存累加，由 persist() 落到 `save.meta.rejectStats`；沙箱实例不计数（同 noteAction）。
   *  ⚠ 语义：这张表**没有豁免**——任何 key 第一次出现都算新事件，验收器据此报警（见 tools\check_reject_codes.js）。 */
  var _rejectStats = {};
  function noteReject(action, reason, info) {
    env.log('⚠ REJECT ' + action + ' reason=' + reason + (info ? (' ' + info) : ''));
    if (env.sandbox) return;
    var k = action + ':' + reason;
    _rejectStats[k] = (_rejectStats[k] || 0) + 1;
  }

  /** "扣了但没效果"的消耗事件计数（**不是拒绝**）。
   *  SOTA R15 §1 第 3 条 / 反例 3：这类请求确实扣了物品、也写了档，记成 REJECT 会污染 rejectStats 的口径，
   *  还会和 R5c 的"拒绝不写档"互相矛盾 —— 日后有人写"凡有 REJECT 日志的请求都不许写档"这条强化断言时，
   *  它会红，而修红的动作可能是去改业务写档逻辑（把好事改坏）。
   *  所以单独一张表：`meta.consumeStats`，标签 `⚠ CONSUME_UNMODELED`。 */
  var _consumeStats = {};
  function noteConsume(action, reason, info) {
    env.log('⚠ CONSUME_UNMODELED ' + action + ' reason=' + reason + (info ? (' ' + info) : ''));
    if (env.sandbox) return;
    var k = action + ':' + reason;
    _consumeStats[k] = (_consumeStats[k] || 0) + 1;
  }

  /** handler 抛异常的次数（SOTA R14 §4 的 R5c 探测器）。
   *  为什么需要：`dispatch` 的 catch 会把异常换成"看起来正常"的应答，
   *  测试里没有断言就永远看不见；R5c 用"这个计数器不许增加"来抓"catch 吞异常"。 */
  var _catchCount = 0;
  function catchCount() { return _catchCount; }

  /** 拒绝码登记（**运行时副本**，权威来源 `tools\facts\reject-codes.json`）。
   *  两个用途：
   *    ① handler 抛异常时，catch 要回"这个动作登记的拒绝码"，不能回成功 ACK（SOTA R14 §1 第 6 条）；
   *    ② 拒绝应答的键收窄到 `{eRet} ∪ REJECT_ALLOW[action]`（SOTA R14 §1 第 1 条）。
   *  ⚠ 与 JSON 的漂移由构建期断言兜住（`build-handlers.js` 双向比对：这里有的动作/原因，JSON 里必须也有）。
   *  ⚠ 码要按**原因**分，不按动作分（R14 §1 第 3 条）：同一个 useItem，"秘籍已学会"用 5、
   *    "效果未建模"用 3（3 在客户端 64755-64910 的 if 链里**没有分支** → 静默、不误导）。 */
  var REJECT_CODES = {
    useItem: { default: 5, recipeLearned: 5, effectUnmodeled: 3 },
    BeginTraining: { default: 4, notLearned: 4 },
    BuyFashion: { default: 4 },
    buyShopItem: { default: 4 },
    buySpecialShopItem: { default: 4 },
    BuyAcitivityShop: { default: 4 },
    exchangeItem: { default: 4 },
    buyGoodAndEvilShopItem: { default: 4 },
    rgShopByItem: { default: 4 },
    QuickBuyItem: { default: 4 },
    washAdditionalArr: { default: 4 },   // flow：弹"选洗哪条"（不是拒绝）
    isCycleLife: { default: 2 },
    cycleLife: { default: 9 },
    specialCycleLife: { default: 9 },
    WashMedicine: { default: 0 },
    FindFriendByID: { default: 0 },
    // ── 第 1 批「商店交易」（2026-10-24，证据 shop-batch1/recon/侦察.md）──
    buyFormula: { default: 2 },          // 2 → getText(1014)（scripts3.js:7041）
    innBuyShop: { default: 6 },          // 6 → getText(202201181)（index.js:62593）
    buySchoolShop: { default: 4 },       // 客户端只有 1 分支，4 静默（index.js:113672-113680）
    BuyMarketItem: { default: 4 },       // 4 → getText(6000575)（index.js:131256）
    BuyMount: { default: 3 },            // 3 → getText(1000)（index.js:32162）
    buyEjectGift: { default: 2, giftNotFound: 2, insufficient: 6 },   // 2 → 9142；6 → 8845 充值框（scripts3.js:60901）
    // ── 第 2 批「商店货架 GET + 侠客令」(2026-10-25，证据 shop-batch2 侦察) ──
    // 大侠令解锁：4 → getText(7353)，5 → getText(8845) 充值框（index.js:55259）。
    buyBigGiftTime: { default: 4, insufficient: 5 },
    // 侠客令/大侠令领奖：客户端只有 1==eRet 一个分支（index.js:55274），拒绝静默 → tier 2。
    ReceiveAward: { default: 4 },
    ReceiveBigAward: { default: 4 },
    // 侠客令两个写入动作统一用 4：客户端两条回调的 4==eRet 分支都弹 getText(1093)
    //   （领取 index.js:55883、升档 index.js:55889）。
    passCardAward: { default: 4 },
    buyInvitationCard: { default: 4 },
    // 存量补登（非本批引入）：R20 书路径两处 eRet:4（1375/1380）漏登记，2026-10-23 04:54 改 server 后没重跑验收
    upgradeSkill: { default: 4 },
    // ── 第 2 批「道具使用」C05（2026-10-25）──
    // 这 6 个动作的客户端拒绝分支**都没有专属提示文案**（雪球/盒子/道具不足一律走通用 alert
    // 或干脆无分支）→ 统一按 tier 2 静默码，宁可不提示也不弹错文案（R14 §1 第 3 条按原因分码）。
    // 取证：batch2-facts-20261025/00-MASTER-第2批取证汇总.md §4。
    rgUseItem: { default: 2, badItem: 2, noStock: 4 },   // 2=无操作分支；4=客户端弹 988（道具不足）
    UseSnowBall: { default: 0, noBall: 0 },              // 非 1 一律走 else → getText(1093)
    UseBatchSnowBall: { default: 4, noBall: 4 },         // 4 → getText(6126)「雪球不足」
    UseAllBall: { default: 0, noBall: 0 },               // 非 1 → getText(1093)
    getSnowAward: { default: 4, noBox: 4 },              // 4 → getText(1098)
    useItemAddition: { default: 5, noItem: 5 },          // 客户端只认 1，5 静默（绝不白给加成）
    // ── 第 3 批「任务主线」C02（2026-10-25）──
    // 同样按 tier 2 静默；quickFinishTask 的 2 是**业务分支**（openChargeList），不是拒绝码语义，
    // 但代码里它确实是非 1 的 eRet，仍须登记（R5b+ 扫描口径："出现非 1 就要有出处"）。
    acceptCircleTask: { default: 6, badTask: 6 },        // 6 -> getText(1093)
    circleTaskAward: { default: 4, notAccepted: 4 },     // 4 -> getText(931)
    getCircleTaskAward: { default: 4, notAccepted: 4 },  // 4 -> getText(931)
    getRogueFinishTaskAward: { default: 4, notAccepted: 4 },
    quickFinishTask: { default: 2, notAccepted: 2, insufficient: 2 },  // 2 -> openChargeList（元宝不足去充值）
    // ── v2.6 堵口（2026-10-25）：接任务口原来**没有**任何拒绝分支，新增 ──
    // delegateTask 4 -> 客户端只 cc.log（index.js:43513），不读 sTime
    delegateTask: { default: 4, notAccepted: 4 },
    // rogueAcceptTask 4 -> 客户端只查 tasktime（index.js:133250）；
    // ⚠ 故意不用 6：客户端 6 分支(133253)读 o.skillId 交给 getItem(...).Name，缺席必抛
    rogueAcceptTask: { default: 4, notAccepted: 4 },
    // ── 第 4 批 C03（2026-10-25）──
    // diceBattleResult 故意回 0：骰子/大富翁玩法未建模，客户端 1==eRet 时会读 e.dice
    //   （scripts3.js:51160）交给 setChirstManData，我们造不出该结构 →
    //   回 0 让整段 1==eRet 分支跳过，既不抛错也不假装成功渲染空数据。
    diceBattleResult: { default: 0 },                    // 恒 0（非 1 即跳过）
    // ── 第 5 批 C16〔成就〕（2026-10-25）──
    // 四个领奖口一律回 4：没有成就进度模型，pending/积分/received 恒空 → 条件不成立。
    // 客户端都只在 1==eRet 分支读回包字段，4 会整段跳过（scripts3.js:2919-2965 / 90027）。
    receiveAchieveReward: { default: 4, notDone: 4 },
    receiveAchieveRateReward: { default: 4, notReached: 4 },
    receiveAchieveSuitReward: { default: 4, notReached: 4 },
    receiveAchievementReward: { default: 4, notModeled: 4 },
    // ── v2.7.1（2026-10-26）──
    // GetRandomEventAward 重复领：同一 adventureID 只结算一次（s.advDone 记账，上游拍板 2）。
    //   客户端回调（index.js:143814-143840）不判 eRet、只看有没有 rewardArray → 4 静默结束，无副作用。
    GetRandomEventAward: { dupClaim: 4 },
    // ── 第 6 批 C04〔婚姻子女〕（2026-10-26）──
    // 状态机动作按客户端文案分支给码；子系统未建模的（生育/寄养/洗练/妻子养成/青楼消费）取
    // 各自回调的"条件不满足"分支或静默分支，全部少发方向。取证 batch6-facts-20261026/scoutA。
    proposeNpc: { default: 2, notInTable: 12, alreadyMarried: 11 },   // 12→1166 11→1137（77127）
    marryNpc: { default: 2, alreadyMarried: 3, notProposed: 4 },      // 3→1137 4→1135（77254）
    divorceNpc: { default: 2 },                                       // 2→1139（77264）
    beginWedding: { default: 2 },                                     // 未结婚不放婚礼
    makeLove: { default: 2, dailyMax: 2 },                            // 未结婚 / 每日 5 次上限（防刷经验）
    birthChild: { default: 2, notPregnant: 2 },                       // 未妊娠（fetationTime 恒 0，自然锁死但结构正确）
    chooseSex: { default: 3 },                                        // 3→2131（24692）
    adoptChild: { default: 2, notMarried: 2, hasChild: 2, insufficient: 2 },  // 2→openChargeList（24698）；500 元宝先扣
    giveChildName: { default: 2, noChild: 2, badName: 99 },           // 2→getText(427) 99→getText("480")（24625）
    childWashProperty: { default: 2 },                                // else→openChargeList（24636）
    resetChildFoster: { default: 4 },                                 // 4→getText(4753)（24655）
    addChildFoster: { default: 2 },                                   // 2/3/4→cc.log 静默（scripts2.js:12953）
    upgradeWifeLevel: { default: 2 },                                 // 非 1 静默（145327）
    UserWifeProp: { default: 2 },                                     // 非 1 静默（145334）
    ChooseGirl: { default: 2 },                                       // else→getText(1088)（51143）
    Whoring: { default: 2 },                                          // 非 1 无分支静默（51146）
    getLikeEvent: { noEvent: 4 },                                     // 4→dialog 1810121（51160-51162，客户端自有"无事件"流）
    optionLikeEvent: { default: 2 },                                  // else→getText(1455)（51174）
    // ── 第 8 批 C07〔善恶〕（2026-10-27）：11 动作全锁（未加入阵营；面板 16 字段 .toString() 直读缺键即崩）──
    getGoodAndEvilTaskData: { default: 2 },
    refreshGoodAndEvilTaskData: { default: 2 },
    getGoodAndEvilNoteData: { default: 2 },
    getGoodAndEvilNpcData: { default: 2 },
    refreshGoodAndEvilNpcData: { default: 2 },
    getGoodAndEvilRankData: { default: 2 },
    helpDoneTask: { default: 2 },
    getGeHelpInfo: { default: 2 },
    getGoodAndEvilData: { default: 2 },
    getGoodAndEvilRetireList: { default: 2 },
    getGoodAndEvilRetireData: { default: 2 },
    // ── 第 9 批 C08〔PVE 战斗族〕（2026-10-27）：PVP 拒绝；其余 4 个"不做"的动作**不登记**
    //    （它们保留 SHAPED/UNKNOWN 兜底，不产生拒绝码 —— 登记了就等于承诺一个我们从没发过的码）──
    ChallengePVP: { default: 3 },   // 3→Alert(getText 1399)+dispose（index.js:101338-101341）
    // ── 第 10 批 C09〔技巧摸奖〕（2026-10-27）──
    //   knackLottery 的 5 是**有提示**的分支（`else 5 == e.eRet && Alert.show(getText(1093))`，scripts3.js:90096）；
    //   其余六个都是"非 1 即静默"或干脆无 else，故取 2（少发方向），并靠 REJECT_ALLOW 收窄到只有 eRet。
    knackLottery: { default: 5, insufficient: 5 },
    changeSkillKnack: { default: 2, invalid: 2 },
    rgChangeSkillKnack: { default: 2, invalid: 2 },
    resolveEquip: { default: 2, noProductTable: 2 },
    batchResolveEquip: { default: 2, noProductTable: 2 },
    resolveKnack: { default: 2, noProductTable: 2 },
    batchResolveKnack: { default: 2, noProductTable: 2 },
    // ── 第 11 批 C10〔农作物〕（2026-10-27）：档 A 本家闭环 + getHomeList 并入（用户拍板）──
    //   码的选法一律照回调：**有 else 分支的挑它的分支码，没有 else 的一律 2（少发方向静默）**。
    //   ⚠ `obtainCrop` 刻意不用 3：3 那一支是 `e.soilArr[o.sIdx].m.s = 0`（index.js:57714-57723，
    //     裸读 + 把地改写成荒），未成熟走 3 会直接把界面画坏。
    obtainCrop: { default: 2, noCrop: 2, notMature: 2 },              // 回调只有 1 / 3 两支，3 会毁地 → 用 2（无分支）
    batchSeedCrop: { default: 2, noTable: 2, badLand: 2, occupied: 2, noSeed: 2, empty: 2 },  // 无 else（index.js:57654-57675）
    changeSate: { default: -1, badLand: -1, friendHome: -1 },          // -1 → getText(3320)（index.js:57696）
    expediteCrop: { default: 2, noCrop: 2, done: 2 },                  // 2/3 → getText(1455)（index.js:57845）
    cleanDeadCrop: { default: 2, noCrop: 2, notDead: 2 },              // 无 else（index.js:57811-57824）
    dispossHomeEvent: { default: 2, noCrop: 2, noEvent: 2, friendHome: 2 },   // 2→3268 / 3→3317 / -1→3320（58005）
    onKeyObtainCrop: { default: 2, noTable: 2 },                       // 2→6000449；其余静默（57756）
    onKeyDispossHomeEvent: { default: 2, noTable: 2 },                 // 无 else（57758-57801）
    stealCrop: { default: 2, friendHome: 2 },                          // 2→3317（58031-58041）；档 A 锁好友家
    // 家园特殊事件（第29批动作，本批**必须补**）：`getHomeList` 回调开完面板立刻 reqHomeSpecialEvent()
    //   （index.js:57614 / 57629）→ 走 SHAPED 兜底会回 `{eRet:1,eid:0,rewardArray:{}}` →
    //   客户端 `productHomeEvent(0,…)` 拿 `getItem(0,"home_plant_adventure")` = null 再裸读 `.describe`
    //   → **TypeError**（index.js:95694，真机实证）。非 1 分支客户端只 dispatch REMOVE_SEARCH_HOME_UI（57866）→ 2 静默安全。
    homeSpeicalAward: { default: 2 },
    // ── 家园种子商店（2026-10-27 用户拍板"补商店"）：两个回调都只有 1 分支/无 else → 拒绝一律 2（静默）──
    getBackShop: { default: 2, noTable: 2 },
    BuyHomeCrop: { default: 2, badItem: 2, badNum: 2, insufficient: 2 },
    // ── 第 12 批 C11〔周年通行证〕（2026-10-27，7 个，relations.md:84-89；用户拍板 7 个全做）──
    //   码的选法照回调：有专属非 1 分支的用分支码，没有 else 的一律 2（静默）。
    //   契约证据：batch12-facts-20261027\C11-c11-取证与策略.md §二（工人 4 单 + 主审对撞）。
    getAnniversaryPassData: { default: 2 },                    // 非 1 → 文案 1093 + ANN_OPEN false（scripts3.js:7837-7841，有提示）
    buyAnniversaryPass: { default: 4, alreadyVip: 4, insufficient: 4, noTable: 4 },   // 4 → getText(8845)（scripts3.js:7848）
    receiveAnniversaryPassAward: { default: 2, badRow: 2, claimed: 2, livenessLow: 2, notVip: 2, noTable: 2 },   // 无 else（scripts3.js:7850-7857）；notVip=第12批验收补（白领 VIP 奖励口）
    getAnniversaryPassGift: { default: 2, noTable: 2 },        // 无 else（index.js:131050-131056）
    buyAnniversaryPassGift: { default: 2, badGift: 2, limit: 2, insufficient: 2, noTable: 2 },   // 无 else（index.js:131062-131067）
    buyAnniversaryPassLiveness: { default: 3, badNum: 3, capReached: 3, insufficient: 3, noTable: 3 },   // 3 → getText(7353)（scripts3.js:7863）
    receiveAnniversaryPassTaskReward: { default: 2, badTask: 2, claimed: 2, notReached: 2, noTable: 2 },   // 无 else（scripts3.js:7878-7888）
    // ── 第 13 批 C12〔管家/帮手〕（2026-10-27，用户拍板：7 名单 + 3 面板键并入；档 A）──
    //   码的选法照回调：有专属非 1 分支的用分支码，else 兜底的一律按"兜底文案"那档（不算专属分支 → tier 2）。
    getHousekeeper: { default: 2 },                    // 无 else（scripts3.js:23109-23119）→ 静默 + 面板不开
    buyHelper: { default: 4, badId: 4, insufficient: 4, noTable: 4 },   // 非 1 一律 4 → openChargeList（23167）
    setHelper: { default: 2, notOwned: 2, noTable: 2 },   // 2 → getText(6000506)（23160）
    callHelperId: { default: 2, notOwned: 2, noTable: 2 },   // 无 else（23235-23245）→ 静默
    getHelperCallList: { default: 2, noTable: 2 },   // 无 else（23228-23233）→ 静默
    dispatch: { default: 5, busy: 5, badMap: 2, noTable: 5 },   // 2→6000371 / 3→6000335 / 5→6000372 / 6→8845 / 7→6000449 / 8→6000440（23126）；★badMap=2 真机实证 mapId 不合法会每帧崩
    dispatchAward: { default: 3, notReady: 3, noTable: 3 },   // 3 → 1530；其余一律 →1145 else 兜底（23151）
    buyMonthlyFee: { default: 4, badType: 2, alreadyActive: 2, insufficient: 4, noTable: 4 },   // 2 → 6000402；其余 → 8845（23193）
    setTemplateData: { default: 2, badAutoTime: 2, noTable: 2 },   // 2 → 6000332 / 3 → 6000320（23132）
    receiveNotice: { default: 2 },   // ★非 1 → 客户端 dataDestroy（23220）→ 档 A 恒 1，此码仅 catch 兜底
    // ── 第 14 批 C13〔UFO 夹娃娃〕（2026-10-27，用户拍板：跳过 3 死键，4 活键；抓取服务端权威）──
    //   全批字段有守卫（崩点趋零）；eRet 3 = 活动过期通道（自定常开，保留不用）；REWARD_UFO 任何非 1
    //   → 客户端恒 dispatch CATCH_DOLL_EVENT null（25767）→ 拒绝安全；15 → getText(8060)。
    getUFOCatcherData: { default: 2, noTable: 2 },   // 无 else（25783-25801 两个独立 if）→ 静默
    rewardUFO: { default: 15, badGear: 15, badSign: 15, noClaw: 15, emptyPool: 15, noTable: 15 },   // 15 → 8060；任何非 1 客户端安全
    useUFOrefresh: { default: 6, noTimes: 6, noTable: 6 },   // 6 → 8060（25781）
    buyUFORefreshTimes: { default: 7, capReached: 7, insufficient: 5, noTable: 7 },   // 7→8060 / 5→3633 / 6→3633 / 3→活动过期（25809-25818）
    // ── 第 15 批 C14〔斗狗〕（2026-10-27，档 A：本家喂狗+日志+结算桥接；4 键不做，ISSUE 挂账）──
    //   三处客户端监听都只有 1 分支（index.js:58048-58057 / 58224-58243）→ 非 1 一律静默，取 2。
    lookDogLog: { default: 2, noTable: 2 },
    FeedDog: { default: 2, badItem: 2, badNum: 2, insufficient: 2, full: 2, noTable: 2 },
    DogBattleResult: { default: 2, noTable: 2 },
    // ── 第 16 批 C15〔七日回归〕（2026-10-27，档 A：回归 6 键；新春 3 键+SEVEN_DAYS_AWARDS 不做，ISSUE-15）──
    //   客户端监听都只有 1 == eRet 分支（scripts3.js:63542-63590）→ 非 1 静默，取 2。
    getReturnSevenDayData: { default: 2, noTable: 2 },
    getReturnTaskData: { default: 2, noTable: 2 },
    returnSevenDaysAwards: { default: 2, claimed: 2, notReady: 2, noRow: 2, noTable: 2 },
    receiveReturnDailyTask: { default: 2, notDone: 2 },
    receiveLivenessAward: { default: 2, noLiveness: 2 },
    getReturnGift: { default: 2, noTable: 2 },
    refreshReturnGiftAward: { default: 2, noTable: 2 },
    receiveReturnGiftAward: { default: 2, notBought: 2 },
    // ── 2026-10-27 上游提速方案核查：addItem 客户端有 send 点（index.js:65353-65358）→ 拒绝，防白拿 ──
    addItem: { default: 2, freeGrant: 2 },
    // ── 第 19 批 C19〔技能皮肤商店〕（2026-10-27，A 轮第 1 批）──
    //   客户端监听非 1 分支：商店/买/期=静默；活动买 2→6003145 / 9→提示+重拉（82821）。
    getSkillSkinShop: { default: 2, noTable: 2 },
    refreshSkillSkinShop: { default: 2, insufficient: 2, noTable: 2 },
    buySkillSkinShop: { default: 2, badId: 2, bought: 2, insufficient: 2, noTable: 2 },
    getSkillSkinActiveShop: { default: 2, noTable: 2 },
    buySkillSkinActiveShop: { default: 2, badIds: 2, badId: 2, badSkin: 2, owned: 2, insufficient: 2, noTable: 2 },
    equipSkillSkin: { default: 2, notOwned: 2, noTable: 2 },
    removeSkillSkin: { default: 2, noTable: 2 },
  };
  /** 拒绝应答的字段白名单（eRet 永远允许）。没列的动作 = 不收窄（风险收口：只动登记过的）。 */
  var REJECT_ALLOW = {
    useItem: ['itemID'],
    washAdditionalArr: ['attrList'],   // flow 分支要读 attrList（必须 4 段字符串）
    // ── 第 11 批 C10〔农作物〕（2026-10-27）：拒绝时一律收窄到只有 eRet ──
    //   理由：这几处的成功字段（crop / crops / cropMap / obtainLands）在客户端都是**裸读**，
    //   拒绝时若被 fillShape 补成 `crop:{m:{},b:{}}` 之类，客户端会拿去画一棵作物/一块地
    //   （`dispossHomeEvent` 更是**先看有没有 crop 再看 eRet**，57980）→ 只发 eRet 最安全。
    obtainCrop: [], batchSeedCrop: [], changeSate: [], expediteCrop: [], cleanDeadCrop: [],
    dispossHomeEvent: [], onKeyObtainCrop: [], onKeyDispossHomeEvent: [], stealCrop: [],
    homeSpeicalAward: [],   // 拒绝时必须剥掉 SHAPED 的 eid/rewardArray（否则 productHomeEvent 空表崩）
    getBackShop: [], BuyHomeCrop: [],   // 拒绝时只发 eRet（别把半截 shopArr/rewardArray 递出去）
    // ── 第 12 批 C11〔周年通行证〕：拒绝时一律收窄到只有 eRet ──
    //   理由：anniversaryPassData / endtime / giftDatas / dt / rewardArray 在客户端全是**裸读**，
    //   拒绝时被 fillShape 补成半截结构会走错分支（FINISH_TASK 的 rewardArray 更是无守卫直读，7886）。
    getAnniversaryPassData: [], buyAnniversaryPass: [], receiveAnniversaryPassAward: [],
    getAnniversaryPassGift: [], buyAnniversaryPassGift: [], buyAnniversaryPassLiveness: [],
    receiveAnniversaryPassTaskReward: [],
    // ── 第 13 批 C12〔管家/帮手〕：拒绝时一律收窄到只有 eRet ──
    //   理由：housekeeper 各字段在回调里多处裸读（helperId/helperIdArr/dueTime/noticeArr/noticeRtm/
    //   note.eco.yuanbao），拒绝时被 fillShape 补成半截结构会被客户端拿去用 → 只发 eRet 最安全。
    getHousekeeper: [], buyHelper: [], setHelper: [], callHelperId: [], getHelperCallList: [],
    dispatch: [], dispatchAward: [], buyMonthlyFee: [], setTemplateData: [], receiveNotice: [],
    // ── 第 14 批 C13〔UFO 夹娃娃〕：拒绝时收窄到只有 eRet（守卫虽全，少发方向最安全）──
    getUFOCatcherData: [], rewardUFO: [], useUFOrefresh: [], buyUFORefreshTimes: [],
    // ── 第 15 批 C14〔斗狗〕：拒绝时只发 eRet（log/progress/win 在客户端都是 hasOwnProperty 守卫）──
    lookDogLog: [], FeedDog: [], DogBattleResult: [],
    // ── 第 16 批 C15〔七日回归〕：拒绝时只发 eRet（sevenDaysArr/oldReturnData/giftDatas 都按裸读防护）──
    getReturnSevenDayData: [], getReturnTaskData: [], returnSevenDaysAwards: [],
    receiveReturnDailyTask: [], receiveLivenessAward: [], getReturnGift: [],
    refreshReturnGiftAward: [], receiveReturnGiftAward: [],
    // ── 2026-10-27 addItem 拒绝：只发 eRet（客户端 2 分支 getText(448)）──
    addItem: [],
    // ── 第 19 批 C19〔技能皮肤商店〕：拒绝时只发 eRet ──
    getSkillSkinShop: [], refreshSkillSkinShop: [], buySkillSkinShop: [],
    getSkillSkinActiveShop: [], buySkillSkinActiveShop: [], equipSkillSkin: [], removeSkillSkin: [],
  };
  /** 未建模效果的 useItem 是否"拒绝且不扣"。
   *  **2026-10-23 用户裁定：默认 false**（= 保持"照扣但无效果"，不改玩家现在能用的东西）。
   *  理由：可获性表算出的表内口径 N=248，但客户端**只对消耗品发 useItem**，一刀切会误伤；
   *  更贴"还原原版"的做法是先把 `item.Effect` 列导出来、按效果家族实现（buff / 经验书 / 礼包）。
   *  ⚠ 关掉不等于不管：命中的每一次都会写 `⚠ REJECT useItem reason=effectUnmodeledConsumed` 并计入
   *    `meta.rejectStats`（这就是 R13 §3 要的那张"cap 为 0"的消耗事件表）。
   *  回退/开启：改这一个常量即可（改 true 时走 eRet:3 拒绝且不扣，表里已有该条登记）。 */
  var REJECT_UNMODELED_ITEMS = false;
  function rejectCodeOf(action, reason) {
    var m = REJECT_CODES[action];
    if (!m) return 4;
    if (reason && hasOwn(m, reason)) return m[reason];
    if (hasOwn(m, 'default')) return m['default'];
    for (var k in m) if (hasOwn(m, k)) return m[k];
    return 4;
  }

  /** handler 抛异常时该回哪个码（SOTA R15 §1 第 1 条 + 反例 1）。
   *  **不能一律回 4**：4 在不同动作的回调里语义不同（`ExChangeJetton` 的 4 是支付拦截、`useItem` 的 4 会
   *  解引用 item.Data2 弹"需消耗[1]个[2]"、有的动作 4 是"弹选择框"）。回错码 = 打开空界面或直接崩。
   *  规则：优先用构建期注入的 `BZ_CATCH_CODES[动作]`（由 `tools\facts\reject-codes.json` 的
   *  `catchCode` 字段推导：必须 ∉ success ∪ handled ∪ 本动作所有 flow/capture/intercept 码）；
   *  没有登记的动作 → **不回 eRet**（所有 `X == eRet` 比较都为假 → 客户端安静地不做事），并大声记日志。
   *  不回码比回错码安全：回错码会让客户端走进一条它以为存在的分支。 */
  function catchCodeOf(action) {
    var t = (typeof BZ_CATCH_CODES !== 'undefined') ? BZ_CATCH_CODES : null;
    if (t && hasOwn(t, action)) return t[action];
    return undefined;
  }

  /** 把账本再一次推给活客户端模型（SOTA R15 §1 第 2 条 / 反例 2）。
   *  catch 里 `_save = null` 只回滚了**服务端账本**；如果 handler 在抛异常之前已经通过
   *  `__require('RoleBaseInfo')` 那条第二出口改过客户端活模型（金币/技能/…），客户端会一直显示脏值，
   *  并可能据此继续发请求。所以回滚之后必须把权威值重推一遍（不推 = 客户端继续显示 999999）。 */
  function repushLive(s) {
    if (env.sandbox || !s) return;
    // ⚠ 每一段各自 try（SOTA R16 反例 3）：万一 push 本身抛异常（比如客户端技能表里没有这个 id），
    //   异常会从 catch 里再抛出去 → 调用方拿不到任何应答 → 客户端遮罩一直挡着。
    //   所以这里吞掉、只记日志；catch 分支保证无论如何都返回一个应答。
    try { pushEco(s); } catch (e) { env.log('repushLive pushEco 失败: ' + e); }
    try {
      var sk = s.skills || {};
      for (var id in sk) {
        if (!hasOwn(sk, id)) continue;
        var v = sk[id] || [];
        try { pushSkillToClient(parseInt(id, 10) || 0, v[0] || 1, s.potential, v[1] || 0, v[2] || 1); }
        catch (e2) { env.log('repushLive pushSkill ' + id + ' 失败: ' + e2); }
      }
    } catch (e3) { env.log('repushLive 遍历技能失败: ' + e3); }
  }
  /** 拒绝应答收窄（SOTA R14 §1 第 1 条 + 反例 1）。
   *  实测过的形态：`BeginTraining` 拒绝应答被 fillShape 补成 `{eRet:4, beginTime:0, skillID:0}`。
   *  今天 `beginTime:0` 无害（客户端只在 1/2 分支读它），但只要有天把拒绝码改成 3，
   *  客户端就会拿 `skillID:0` 去 `getItem(0,"skill")` 得 null 然后读 `.Name` 崩 —— 那个 0 是我们自己发的。 */
  function narrowReject(action, res) {
    var inner = res && res['User.' + action];
    if (!inner || typeof inner !== 'object' || Array.isArray(inner)) return res;
    if (inner.eRet === 1 || inner.eRet === undefined || inner.eRet === null) return res;  // 成功应答不动
    if (!hasOwn(REJECT_CODES, action)) return res;                                        // 未登记动作不动
    var allow = ['eRet'].concat(REJECT_ALLOW[action] || []);
    var keys = Object.keys(inner);
    for (var i = 0; i < keys.length; i++) if (allow.indexOf(keys[i]) < 0) delete inner[keys[i]];
    return res;
  }

  /** L4 观察守卫（A04 回执第 4 条，2026-10-22；**R05 回执改口径 2026-10-22 夜**）。
   *  **只记录、不拒绝**（拒绝会让玩家丢操作）；价值是把 §17.2 那类静默事故（20 卖 1 被写成 1）
   *  在日志里当场暴露成 `OBS 未解释差额 <动作>: ...`。
   *
   *  R05 审阅的两条更正（原实现错在这里）：
   *   1) 原来"带非空 rewardArray 的动作整体豁免"。但豁免的恰恰是**重复发奖 / 吞奖**最容易发生的地方，
   *      而 `rewardArray` 本身就是事件声明 → 现在改成：**差额必须等于 rewardArray**（不再豁免）。
   *   2) 原来只比 bag，不看 `playerEquip`（装备类奖励全在那边）→ 现在两边都比。
   *  每键的判据按顺序：
   *    a) `note.ivch[键]`（绝对值）等于账本新值 → 已文档化，放过；
   *    b) 奖励类且 `before + rewardArray[键] === after` → 由奖励清单解释，放过；
   *    c) 其余 → 记一条 `未解释差额`。
   *  这样"扣成本 + 发货"的商店动作不会误报（它们回 `note.ivch` 绝对值），
   *  而"多发了 5 个"或"扣了没记账"一定会留痕。 */
  function snapshotLedger() {
    if (!_save) return null;
    var pe = {};
    var src = _save.playerEquip || {};
    for (var uk in src) if (hasOwn(src, uk)) pe[uk] = Array.isArray(src[uk]) ? (num(src[uk][1], 0)) : num(src[uk], 0);
    return {
      bag: cloneJson(_save.bag) || {},
      playerEquip: pe,
      coins: num(_save.coins, null), gold: num(_save.gold, null),
      yuanbao: num(_save.yuanbao, null), contribution: num(_save.contribution, null),
    };
  }
  function observeLedger(action, before, res) {
    if (env.sandbox || !before || !_save) return;
    if (/^bz/.test(action)) return;                 // 维护动作（写前有备份，且不属于游戏协议）
    var inner = res && res['User.' + action];
    if (!inner || typeof inner !== 'object') return;
    var note = inner.note || {};
    var hasReward = !!(inner.rewardArray && typeof inner.rewardArray === 'object' && Object.keys(inner.rewardArray).length);
    var reward = hasReward ? inner.rewardArray : {};
    var issues = [];
    var pe = {};
    var src = _save.playerEquip || {};
    for (var uk in src) if (hasOwn(src, uk)) pe[uk] = Array.isArray(src[uk]) ? (num(src[uk][1], 0)) : num(src[uk], 0);
    var after = {
      bag: _save.bag || {},
      playerEquip: pe,
      coins: num(_save.coins, null), gold: num(_save.gold, null),
      yuanbao: num(_save.yuanbao, null), contribution: num(_save.contribution, null),
    };
    /** 单个"物品账"（bag 或 playerEquip）的差额解释 */
    function checkItems(label, b, a, eqKind) {
      var k, seen = {};
      for (k in b) seen[k] = 1;
      for (k in a) seen[k] = 1;
      for (k in seen) {
        var bv = num(b[k], 0), av = num(a[k], 0);
        if (bv === av) continue;
        var doc = eqKind
          ? ((note.eqch && hasOwn(note.eqch, k)) ? note.eqch[k] : null)
          : ((note.ivch && hasOwn(note.ivch, k)) ? note.ivch[k] : null);
        // eqch 的形状是 [0]（删除）或 [1,[type,num]]（绝对值），要取出"新数量"
        if (doc !== null) {
          var docVal = null;
          if (eqKind && Array.isArray(doc)) docVal = (doc[0] === 0) ? 0 : (Array.isArray(doc[1]) ? num(doc[1][1], null) : num(doc[1], null));
          else if (!eqKind) docVal = parseInt(doc, 10);
          if (docVal !== null && docVal === av) continue;              // (a) 已文档化
          if (docVal !== null && docVal !== av) {
            issues.push((eqKind ? 'note.eqch.' : 'note.ivch.') + k + '=' + docVal + ' 但账本到 ' + av);
            continue;
          }
        }
        if (hasReward && bv + num(reward[k], 0) === av) continue;       // (b) 奖励清单解释
        issues.push(label + '.' + k + ' ' + bv + '→' + av);             // (c) 未解释
      }
    }
    checkItems('bag', before.bag, after.bag, false);
    checkItems('equip', before.playerEquip || {}, after.playerEquip, true);
    var curs = ['coins', 'gold', 'yuanbao', 'contribution'];
    for (var ci = 0; ci < curs.length; ci++) {
      var ck = curs[ci];
      if (before[ck] === after[ck]) continue;
      if (note.eco && hasOwn(note.eco, ck)) {
        if ((parseInt(note.eco[ck], 10) || 0) !== after[ck]) issues.push('note.eco.' + ck + '=' + note.eco[ck] + ' 但账本到 ' + after[ck]);
        continue;
      }
      if (hasReward && before[ck] + num(reward[ck], 0) === after[ck]) continue;
      issues.push(ck + ' ' + before[ck] + '→' + after[ck]);
    }
    if (issues.length) env.log('OBS 未解释差额 ' + action + ': ' + issues.join('; '));
  }

  /** 顺序迁移：每步必须可重入（跑两遍结果一样），因此永远从 v1 跑起 */
  function migrateSave(raw) {
    var s = cloneJson(raw) || {}, k, v;
    // v1 -> v2：装备实例 / 装备槽位
    if (!hasOwn(s, 'playerEquip')) s.playerEquip = {};
    if (!hasOwn(s, 'equipments')) s.equipments = {};
    // v2 -> v3：技能逐值归一（裸数字 → [等级,进度,突破]；残缺数组补默认）
    var sk = s.skills || {};
    for (k in sk) {
      if (!hasOwn(sk, k)) continue;
      v = sk[k];
      if (typeof v === 'number') sk[k] = [v > 0 ? v : 1, 0, 1];
      else if (Array.isArray(v)) sk[k] = [num(v[0], 1), num(v[1], 0), num(v[2], 1)];
      else sk[k] = [1, 0, 1];
    }
    s.skills = sk;
    // v3 -> v4：已发奖励名单；缺失只补 []，**绝不回填 done**
    //（回填 = 宣称"老档都发过"，会让「完成了但没领」的玩家永久丢奖励；补发由维护动作 bzBackfillRewards 负责）
    if (!hasOwn(s, 'rewarded')) s.rewarded = [];
    s.saveVersion = LATEST_SAVE;
    return s;
  }

  /** 写前/加载后校验：只校验我们真的会用到的字段（不做全量 schema） */
  function validateSave(s) {
    if (!s || typeof s !== 'object') throw new Error('NOT_OBJECT');
    var k, a;
    for (k in s.skills) {
      if (!hasOwn(s.skills, k)) continue;
      a = s.skills[k];
      if (!Array.isArray(a) || a.length !== 3) throw new Error('ABILITY_SHAPE:' + k);
      if (typeof a[0] !== 'number' || isNaN(a[0])) throw new Error('ABILITY_LV:' + k);
    }
    for (k in s.bag) {
      if (!hasOwn(s.bag, k)) continue;
      if (typeof s.bag[k] !== 'number' || s.bag[k] < 0 || isNaN(s.bag[k])) throw new Error('BAG:' + k);
    }
    if (hasOwn(s, 'rewarded') && !Array.isArray(s.rewarded)) throw new Error('REWARDED');
    if (hasOwn(s, 'done') && !Array.isArray(s.done)) throw new Error('DONE');
    return true;
  }

  /** 写前语义守卫：拦"不可逆的缩水"。这两个动作本来就该消耗/卖光背包，豁免。
   *  ⚠ `knackLottery`（2026-10-27 C09 加）：摸奖**花券**，如果玩家背包里只有券，一次十连就会把背包清空 →
   *    被这道守卫判成"缩水"、回滚到上次落盘快照 → **券没扣、奖照发 = 白拿口子**（实测踩到，见 C9 执行记录）。
   *    加豁免等于承认"摸奖扣券后背包可以为空"，这是合法消耗，不是缩水。 */
  var SHRINK_OK = { useItem: 1, saleItem: 1, knackLottery: 1,
    /** ⚠ `batchSeedCrop`（2026-10-27 C10 加）：**播种就是合法消耗种子**。玩家背包里只有种子时，
     *  一次批量播种会把背包清空 → 被这道守卫判成"缩水"、整包回滚 → **种子没扣、地却种上了 = 白拿口子**
     *  （与 C09 `knackLottery` 那次同一个形态，那次是真机踩到才发现的）。
     *  加豁免 = 承认"播完种背包可以为空"，这是合法消耗，不是缩水。 */
    batchSeedCrop: 1 };
  function guardSave(prev, next) {
    if (!prev || !next) return null;
    var k, p, n;
    for (k in prev.skills) {
      if (!hasOwn(prev.skills, k)) continue;
      p = num(prev.skills[k] && prev.skills[k][0], 0);
      n = hasOwn(next.skills, k) ? num(next.skills[k][0], 0) : 0;
      if (n < p) return '技能' + k + '等级下降 ' + p + '→' + n;
    }
    if ((next.done || []).length < (prev.done || []).length) return 'done 数量减少 ' + (prev.done || []).length + '→' + (next.done || []).length;
    if ((next.rewarded || []).length < (prev.rewarded || []).length) return 'rewarded 数量减少 ' + (prev.rewarded || []).length + '→' + (next.rewarded || []).length;
    var pb = sumBag(prev.bag), nb = sumBag(next.bag);
    if (pb > 0 && nb === 0 && !SHRINK_OK[_currentAction || '']) return '背包从 ' + pb + ' 清空';
    return null;
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function ach() { return (TPL.create && clone(TPL.create.achievement)) || { red: false, achieveRateId: 0 }; }
  function wrapped(doName, payload, extra) {
    var r = { error: 0, p: 'User.' + doName, resultCode: 200 };
    r['User.' + doName] = payload;
    if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) r[k] = extra[k];
    return r;
  }
  function ack(doName, extra) { return wrapped(doName, { eRet: 1 }, extra); }

  /** 把"抓包时写死的时间窗口"整体平移到当前时刻（SOTA R17 §1 第 2 条 / 反例 7：时间炸弹）。
   *
   *  背景：`TPL.create.activityResource = {"67":[null,1793177770630]}` 是**抓包真值**，
   *  它的语义是"抓包那一刻 + 7 天"。`serverTime` 我们已经换成 `env.now()`，但活动窗口仍是静态值 ⇒
   *  `2026-10-28 01:56:10 PDT` 之后 `end < now`，客户端会按"活动已结束"隐藏入口、货架消失。
   *  做法：`delta = now - 抓包时刻`，只把 `activityResource` 里的毫秒整体加 delta ——
   *  "活动窗口相对现在还有 7 天"，与抓包那一刻的语义完全一致，且不会越跑越过期。
   *  ⚠ 只动 `activityResource`，不碰快照里别的时间（像 `housekeeper.taskRtm` 不是活动窗口）。
   *  ⚠ 这是**行为变更**（活动从"10-28 后关闭"变成"永远还有 7 天"）→ 常量可一行回退，已列入待用户裁定。 */
  var REBASE_ACTIVITY_WINDOWS = true;
  function rebaseActivityWindows(holder, fromMs, toMs) {
    if (!REBASE_ACTIVITY_WINDOWS) return holder;
    if (!holder || !holder.activityResource) return holder;
    var from = num(fromMs, 0), to = num(toMs, 0);
    var d = to - from;
    if (!(from > 1.6e12) || !(d > 0)) return holder;
    var res = holder.activityResource;
    for (var k in res) {
      if (!hasOwn(res, k)) continue;
      var v = res[k];
      if (Array.isArray(v)) {
        for (var i = 0; i < v.length; i++) if (typeof v[i] === 'number' && v[i] > 1.6e12) v[i] += d;
      } else if (v && typeof v === 'object') {
        for (var t in v) {
          if (!hasOwn(v, t)) continue;
          var w = v[t];
          if (Array.isArray(w)) for (var j = 0; j < w.length; j++) if (typeof w[j] === 'number' && w[j] > 1.6e12) w[j] += d;
          else if (typeof w === 'number' && w > 1.6e12) v[t] = w + d;
        }
      } else if (typeof v === 'number' && v > 1.6e12) res[k] = v + d;
    }
    return holder;
  }

  function loadSave() {    if (_save) return _save;
    var raw = null;
    try { raw = env.readSave(SAVE_KEY); } catch (e) { env.log('存档读取失败: ' + e); _readOnly = true; }
    var parsed = null;
    if (raw) {
      try { parsed = JSON.parse(raw); }
      catch (e2) { env.log('⚠ 存档解析失败（按空档继续、禁止写回）: ' + e2); _readOnly = true; }
    }
    _save = parsed || {};
    // 版本化：迁移 → 校验；任一失败 → 只读模式（内存态照常供游戏使用）
    try {
      var v = +_save.saveVersion;
      if (v > LATEST_SAVE) throw new Error('NEWER_SAVE:' + v);
      _save = migrateSave(_save);
      validateSave(_save);
      _lastGood = cloneJson(_save);
    } catch (e3) {
      env.log('⚠ 存档迁移/校验失败，进入只读模式（一个字节都不会写回）: ' + e3);
      _readOnly = true;
    }
    if (!_save.roleID) _save.roleID = 16374;             // 模板同款；客户端只作标识用
    if (!_save.accepted) _save.accepted = [];
    if (!_save.done) _save.done = [];
    if (!_save.skills) _save.skills = {};
    return _save;
  }
  function persist() {
    if (_readOnly) { env.log('⚠ 只读模式：拒绝写档（动作 ' + (_currentAction || '?') + '）'); return false; }
    var bad = null;
    try { validateSave(_save); }
    catch (e) { bad = '校验失败: ' + e; }
    if (!bad) bad = guardSave(_lastGood, _save);
    if (bad) {
      // 拒绝写入还不够：内存里的坏值会继续被投射成应答（回空背包 → 客户端清空 → 下一次动作把空写实）。
      // 所以必须回滚内存到"上次落盘成功"的快照。见 docs/sota/B01-A04/adopted.md 的 A-3。
      var canRollback = _lastGood != null;
      if (canRollback) _save = cloneJson(_lastGood);
      env.log('⚠ 写前守卫拒绝（动作 ' + (_currentAction || '?') + '）: ' + bad + (canRollback ? ' → 内存已回滚到上次落盘快照' : ' → 无可回滚快照'));
      return false;
    }
    // 动作计数随手落盘（R04 Q4）：guard/validate 都在它之前，所以 meta 不参与缩水守卫与 schema 校验。
    if (!env.sandbox) {
      _save.meta = _save.meta || {};
      _save.meta.actionStats = cloneJson(_actionStats) || {};
      // 拒绝计数（R13 §5）：与 actionStats 同口径、同位置落盘，沙箱不写。
      _save.meta.rejectStats = cloneJson(_rejectStats) || {};
      // "扣了但没效果"的消耗计数（R15 §1 第 3 条）：**不进 rejectStats**，单独一张表。
      _save.meta.consumeStats = cloneJson(_consumeStats) || {};
    }
    // 饥饿上限（R05 F2）：客户端在挂机结算请求里自报 `hglmt`（index.js:24729/56272/56707），
    // 那是它按属性算出来的真上限。只内存记，随下一次业务写入落盘，跟 actionStats 同口径。
    if (_hungerMax > 0) _save.hungerMax = _hungerMax;
    var text;
    try { text = JSON.stringify(_save); } catch (e2) { env.log('存档序列化失败: ' + e2); return false; }
    try { env.writeSave(SAVE_KEY, text); } catch (e3) { env.log('存档写入失败: ' + e3); return false; }
    // 写后回读比对（我们没有 fsync，这层是唯一能发现"写了半截/没落盘"的手段）
    try {
      var back = env.readSave(SAVE_KEY);
      if (back !== text) {
        env.log('⚠ 写后回读不一致（回读 ' + (back == null ? 'null' : String(back).length) + ' B / 写入 ' + text.length + ' B），本档可能不可靠');
        return false;
      }
    } catch (e4) { env.log('写后回读失败: ' + e4); }
    _lastGood = cloneJson(_save);
    return true;
  }

  /** 维护动作写前备份（bzPatch / bzSeedBag / bzBackfillRewards 会直接改档）。
   *  设备端只有一个滚动备份位 `bz_offline_save.json.pre-maint.json`，够回滚到"本次维护之前"。
   *  见 docs/sota/B01-A04/adopted.md 的 A-4。 */
  function backupBeforeMaint(tag) {
    try {
      if (!env.writeAux) return false;
      return !!env.writeAux('pre-maint.json', JSON.stringify(_save));
    } catch (e) { env.log('维护前备份失败: ' + e); return false; }
  }

  /** 把权威的技能等级 / 潜能推回客户端模型（`window.__require` 仅进程内可用）。
   *  ⚠ 自检/隔离实例（env.sandbox）一律跳过：否则每次 reload 都会把内存档算出的假值
   *    （99999-100*n → 99699）推成活客户端的 potentials，并 setSkill(0,·) 造出假技能 0。
   *  失败就算了，绝不影响应答。 */
  function pushSkillToClient(id, lv, pot, pgr, brlv) {
    if (env.sandbox) return;
    try {
      var R = (typeof window !== 'undefined') ? window.__require : null;
      if (typeof R !== 'function') return;
      var B = R('RoleBaseInfo'); B = B && (B.RoleBaseInfo || B);
      if (B) B.potentials = pot;
      var ST = R('SkillTable'); ST = ST && (ST.SkillTable || ST);
      if (!ST) return;
      var n = parseInt(id, 10) || 0;
      if (typeof ST.setSkill === 'function') ST.setSkill(n, lv);
      // 进度/突破等级也要推：否则客户端面板的 (xx%) 会和账本脱节，取消后看着像"进度没了"
      if (typeof pgr === 'number' && typeof ST.setUpgrdPgr === 'function') ST.setUpgrdPgr(n, pgr);
      if (typeof brlv === 'number' && typeof ST.setBrLv === 'function') ST.setBrLv(n, brlv);
    } catch (e) {}
  }

  /** 配置表时间 rebase（2026-10-23，用户裁定"放宽约束"后新增）。
   *
   *  问题：活动/兑换/商城的开关时间是**客户端配置表里的静态值**，抓包快照里
   *    active 27/55、exchange 2200..2212、mall 39 的 endtime 都落在 2026-10-25~10-26，
   *    两天后客户端会把它们判成"已结束"并隐藏入口（`index.js:134336` 用
   *    `getSTimestamp()` 与 `endtime` 比较；`scripts3.js:44214` 用 `active.endtime` 算倒计时）。
   *    这一层以前动不了，因为约束是"只替换网络层"；用户已放宽到"可在进程内改数据层"。
   *
   *  做法：包一层 `ConfigMgr.getItem`，只对**白名单列**里的毫秒值加 delta。
   *  只动"抓包那一刻还活着或即将开始"的行（`v >= 抓包时刻 - 7 天`），
   *    否则 2024 年的历史活动会被一起推到未来 → 活动面板刷出几百个早已结束的活动。
   *
   *  ⚠ 明确不动 `currentServerEndTime` / `serverOpenTime`：R20 反例 8 指出
   *    "开服第 N 天"类功能（七日任务等）按 serverOpenTime 计算，一起平移会让七日活动永远停在第 1 天。
   *  ⚠ 幂等：同一行会被反复读，行上打 `__bzT` 标记，每个值只加一次 delta。
   *  回退：`REBASE_CONFIG_TIMES = false` 一行即回到原行为。 */
  var REBASE_CONFIG_TIMES = true;
  var REBASE_CONFIG_WINDOW_MS = 7 * 86400000;          // 只处理"抓包时刻前 7 天之后"的时间
  var REBASE_CONFIG_COLS = {
    active: ['begintime', 'endtime'],
    exchange: ['endtime'],
    mall: ['shopend'],
  };
  function installConfigTimeRebase() {
    if (!REBASE_CONFIG_TIMES || env.sandbox) return null;
    try {
      var R = (typeof window !== 'undefined') ? window.__require : null;
      if (typeof R !== 'function') return null;
      var cfg = R('CFMgr'); cfg = cfg && (cfg.CFMgr || cfg);
      if (!cfg || typeof cfg.getItem !== 'function' || cfg.__bzTimeRebase) return null;
      var from = num((TPL.create || {}).serverTime, 0);
      var to = env.now();
      var d = to - from;
      if (!(from > 1.6e12) || !(d > 0)) return null;
      var flo = from - REBASE_CONFIG_WINDOW_MS;
      var orig = cfg.getItem;
      var hits = 0;
      cfg.getItem = function (key, table) {
        var row = orig.call(cfg, key, table);
        try {
          var cols = REBASE_CONFIG_COLS[table];
          if (row && cols && !row.__bzT) {
            row.__bzT = 1;
            for (var i = 0; i < cols.length; i++) {
              var v = row[cols[i]];
              if (typeof v === 'number' && v > flo && v < 1.6e13) { row[cols[i]] = v + d; hits++; }
              else if (v && typeof v === 'object') {
                for (var k in v) {
                  if (!v.hasOwnProperty(k)) continue;
                  var w = v[k];
                  if (typeof w === 'number' && w > flo && w < 1.6e13) { v[k] = w + d; hits++; }
                }
              }
            }
          }
        } catch (e) {}
        return row;
      };
      cfg.__bzTimeRebase = { from: from, to: to, delta: d, cols: REBASE_CONFIG_COLS };
      env.log('配置表时间 rebase 已装：delta=' + d + 'ms（抓包 ' + from + ' → 现在 ' + to + '），列='
        + JSON.stringify(REBASE_CONFIG_COLS) + '；currentServerEndTime/serverOpenTime 不动');
      return cfg.__bzTimeRebase;
    } catch (e2) { return null; }
  }

  /** 物品/装备账本：客户端每次收到 User.sycnPlayerItemData 都会先清空自己那份再从应答重建
   *  （index.jsc:24016-24018：`_itemObj = {}` 再按 e.itemObj 逐条 setItem），
   *  所以这里必须回「全部持有物」；回空 {} 等于把玩家背包清空。 */
  function ensureLedger(s) {
    var c = TPL.create || {};
    if (!s.bag || typeof s.bag !== 'object') {
      // 模板里的 itemObj 可能是 {"4001":0,"4003":0} 这种占位，只留 count>0 的
      var seed = c.itemObj || {}, keep = {};
      for (var k in seed) {
        if (!seed.hasOwnProperty(k)) continue;
        if ((parseInt(seed[k], 10) || 0) > 0) keep[k] = seed[k];
      }
      s.bag = keep;
    }
    if (!s.playerEquip || typeof s.playerEquip !== 'object') s.playerEquip = clone(c.PlayerEquip || {});
    if (!s.equipments || typeof s.equipments !== 'object') s.equipments = {};
    // 付费货币也进账本（用户 2026-10-22 裁定：**金条/元宝可以做，但不做任何真实付费渠道**）。
    // 金条 gold 的缺省与 LoadGame 同口径（99999）；元宝 yuanbao 缺省 0，只能靠 bzGrantCur 增。
    if (typeof s.gold !== 'number') s.gold = 99999;
    if (typeof s.yuanbao !== 'number') s.yuanbao = 0;
    // 正邪贡献（2026-10-22 商店批次）：正邪商店的货币（GoodEvilBuyUI 比 goodEvilContribution）。
    // 正邪系统本体未实现 → 缺省 0，来源只有维护动作 bzGrantCur（不做任何付费渠道）。
    if (typeof s.contribution !== 'number') s.contribution = 0;
    // 门派贡献（2026-10-24 第 1 批商店）：门派商店 BUY_SCHOOL_SHOP 的货币，与正邪贡献是两个钱包。
    // 缺省 0，来源只有维护动作 bzGrantCur；schoolTask 批次落地后再接真实来源。
    if (typeof s.schoolContribution !== 'number') s.schoolContribution = 0;
    // 侠客令（通行证，2026-10-25）：档位 / 活跃度 / 已领档位表。
    //  · passCardLevel 1..4，缺省 1 = 免费档（pass_level 第 1 行 price=0）。
    //  · passLiveness 活跃度（客户端 paperNum）：来源是 pass_liveness 那 7 条（大地图宝箱/奇人异士/副本/琅嬛/金条购买），
    //    那些玩法点尚未接线 → 缺省 0，当前只能靠维护动作 bzGrantCur 增。
    //  · passAward {passID: 领取状态}，4 = 已领取（scripts2.js:35101 `if (4 == n) 已领取`）。
    if (typeof s.passCardLevel !== 'number' || s.passCardLevel < 1) s.passCardLevel = 1;
    if (typeof s.passLiveness !== 'number') s.passLiveness = 0;
    if (!s.passAward || typeof s.passAward !== 'object') s.passAward = {};
    // 侠客令 / 大侠令（NewGFUI 双轨，2026-10-25）：已领阶表 + 大侠令是否解锁。
    //  · growthClaim {阶id:1} —— 该阶已领取（下发给客户端时状态位填 2 = 已领取）。
    //  · growthBigPaid 0/1   —— 大侠令（付费轨）是否已用**元宝**解锁（不走任何真实充值）。
    if (!s.growthClaim || typeof s.growthClaim !== 'object') s.growthClaim = {};
    if (typeof s.growthBigPaid !== 'number') s.growthBigPaid = 0;
    // 尾巴#1 修（2026-10-25 上游拍板）：已领表从「两轨共用一张」改成「轨道_阶id」，两轨彻底分开。
    // 旧数据是纯数字键（两轨共用）→ 一律按**侠客令（轨道 1）**迁移，与上游拍板口径一致。幂等，可反复跑。
    var _gcLegacy = [];
    for (var _gcK in s.growthClaim) {
      if (!s.growthClaim.hasOwnProperty(_gcK)) continue;
      if (/^[0-9]+$/.test(_gcK)) _gcLegacy.push(_gcK);
    }
    for (var _gcI = 0; _gcI < _gcLegacy.length; _gcI++) {
      var _gcOld = _gcLegacy[_gcI];
      s.growthClaim['1_' + _gcOld] = s.growthClaim[_gcOld];
      delete s.growthClaim[_gcOld];
    }
    // 洗点（洗附加属性）账本：bloodArr = [力量,身法,根骨,悟性] 的附加；fosterArr = 先天培养附加。
    // 客户端把它们加在基础属性上（index.js:111891-111894：baseValue += cycleData[7][x] + cycleData[8][x]）。
    if (!Array.isArray(s.bloodArr) || s.bloodArr.length !== 4) s.bloodArr = [0, 0, 0, 0];
    if (!Array.isArray(s.fosterArr) || s.fosterArr.length !== 4) s.fosterArr = [0, 0, 0, 0];
    return s;
  }

  /** 背包增减（id → 数量；归零即删除）。客户端 setItem 只认 parseInt(count) > 0 的项 */
  function bagAdd(s, id, n) {
    var iid = parseInt(id, 10);
    var d = parseInt(n, 10);
    if (!(iid > 0) || !d) return 0;
    var cur = parseInt(s.bag[iid], 10) || 0;
    cur += d;
    if (cur < 0) cur = 0;
    if (cur === 0) delete s.bag[iid];
    else s.bag[iid] = cur;
    return cur;
  }

  /** 出售价：item 表的 `Price` 列（由 tools/gen_task_rewards.js 生成为 BZ_ITEMPRICE）。
   *  依据：客户端 InventoryModel.sellItem 自己算的是 `o += parseInt(g.Price) * h[2]`
   *  （index.js:65191-65208），**不是 BuyPrice**（BuyPrice 是商店买价）。 */
  function itemPrice(id) {
    var m = (typeof BZ_ITEMPRICE !== 'undefined') ? BZ_ITEMPRICE : null;
    if (!m) return 0;
    var v = parseInt(m[parseInt(id, 10)], 10);
    return (v > 0) ? v : 0;
  }

  /** 商店买价：item 表的 `BuyPrice` 列（NormalShopUI 货架价 `price: s.BuyPrice`，scripts2.js:46443）。
   *  ⚠ 与 itemPrice（卖价 Price）是**两列**，别混。 */
  function itemBuyPrice(id) {
    var m = (typeof BZ_ITEMBUYPRICE !== 'undefined') ? BZ_ITEMBUYPRICE : null;
    if (!m) return 0;
    var v = parseInt(m[parseInt(id, 10)], 10);
    return (v > 0) ? v : 0;
  }

  /** NPC 金条商店货架（BZ_NPCSHOP，生成自配置表 random_shop / house_shop / lh_shop 里带 npc 的行） */
  function npcShopOf(npc) {
    var m = (typeof BZ_NPCSHOP !== 'undefined') ? BZ_NPCSHOP : null;
    if (!m) return null;
    var v = m[parseInt(npc, 10)];
    return (v && v.i && v.i.length) ? v : null;
  }

  /** 维护动作专用：把货币账本推到活客户端。
   *  普通动作不需要它（应答里的 `note.eco` 会被客户端的 ECONOMY_CHNG 监听器直接写进模型，
   *  index.js:64698-64723），但维护动作是从命令通道打进来的，没有"应答消费端"，必须手动推。 */
  function pushEco(s) {
    if (env.sandbox) return;
    try {
      var R = (typeof window !== 'undefined') ? window.__require : null;
      if (typeof R !== 'function') return;
      var B = R('RoleBaseInfo'); B = B && (B.RoleBaseInfo || B);
      if (!B) return;
      if (typeof s.coins === 'number') B.coins = s.coins;
      if (typeof s.gold === 'number') B.gold = s.gold;
      if (typeof s.yuanbao === 'number') B.yuanbao = s.yuanbao;
      var MC = R('MessageCenter'); MC = MC && (MC.MessageCenter || MC);
      var EV = R('EvName'); EV = EV && (EV.EvName || EV);
      if (MC && typeof MC.dispatch === 'function') MC.dispatch((EV && EV.CHANGE_ROLE_INFO) || 'CHANGE_ROLE_INFO');
    } catch (e) {}
  }

  /** 装备实例 uid → itemID：type==1 时 uid 就是 itemID；type>=2 时 data[1] 才是
   *  （index.js:65117-65136 parseEq 的 type 分支）。必须在删 playerEquip 之前调用。 */
  function equipItemIDOf(s, uid) {
    var inst = (s.playerEquip || {})[uid];
    if (!Array.isArray(inst)) return parseInt(uid, 10) || 0;
    var t = parseInt(inst[0], 10) || 0;
    if (t === 0 || t === 1) return parseInt(uid, 10) || 0;
    return parseInt(inst[1], 10) || 0;
  }

  /** 把权威铜钱推回客户端。HUD 的铜钱 Label 走
   *  `MessageCenter.on(CHANGE_ROLE_INFO, setBaseInfo)` → 读 `RoleBaseInfo.coins`
   *  （scripts2.js:49715 / 49727），而 LoadGame 只在登录时把 baseValueAy[35] 投给它
   *  （index.js:111792）。运行期改钱若不推、不派发事件，玩家卖完东西看不到余额变化。
   *  ⚠ 沙盒实例一律跳过（同 pushSkillToClient 的理由）。 */
  function pushCoins(coins) {
    if (env.sandbox) return;
    if (typeof coins !== 'number') return;
    try {
      var R = (typeof window !== 'undefined') ? window.__require : null;
      if (typeof R !== 'function') return;
      var B = R('RoleBaseInfo'); B = B && (B.RoleBaseInfo || B);
      if (B) B.coins = coins;
      var MC = R('MessageCenter'); MC = MC && (MC.MessageCenter || MC);
      var EV = R('EvName'); EV = EV && (EV.EvName || EV);
      if (MC && typeof MC.dispatch === 'function') {
        MC.dispatch((EV && EV.CHANGE_ROLE_INFO) || 'CHANGE_ROLE_INFO');
      }
    } catch (e) {}
  }

  /** 任务元数据（来自游戏原始配置表 tasknew + drop，见 tools/gen_task_rewards.js）
   *  n = 完成该任务需要携带的物品；r = 完成应发奖励 */
  function taskMeta(id) {
    var t = (typeof BZ_TASKS !== 'undefined') ? BZ_TASKS : null;
    if (!t || id === undefined || id === null) return null;
    return t[String(id)] || null;
  }

  /** 物品类型（1 = 装备）。只覆盖"奖励/任务要求"里出现过的物品，同样来自原始配置表。 */
  function itemTypeOf(id) {
    var t = (typeof BZ_ITEMTYPE !== 'undefined') ? BZ_ITEMTYPE : null;
    if (!t) return 0;
    return parseInt(t[String(id)], 10) || 0;
  }

  /** 饥饿上限（R05 F2 引入；**R06 第 6 条更正优先级**）：
   *   1) 本次请求自带的 `hglmt`（最新鲜 —— 客户端按属性算完立刻带上）
   *   2) 活客户端模型 `hunger.limit/finalValue`（属性涨了它就涨）
   *   3) 账本 `s.hungerMax`（学到的历史值）**只作后备/下限保护**：
   *      一旦它小于活模型值就用活模型值覆盖它，避免过期上限把饱食度截得过低。
   *  都没有 → 0 = **不截断**（不编上限）。 */
  function hungerCapOf(s, reqLmt) {
    var fromReq = parseInt(reqLmt, 10) || 0;
    if (fromReq > 0 && fromReq <= HG_MAX_SANE) return fromReq;
    var live = 0;
    if (typeof env.hungerMax === 'function') {
      try { live = parseInt(env.hungerMax(), 10) || 0; } catch (e) { /* 读不到当没有 */ }
    }
    if (live > HG_MAX_SANE) live = 0;
    var saved = (s && (parseInt(s.hungerMax, 10) || 0)) || 0;
    if (_hungerMax > saved) saved = _hungerMax;
    if (live > 0 && saved > 0) {
      if (saved < live) {                       // 账本过期（属性涨过）→ 用活模型覆盖
        if (s) s.hungerMax = live;
        env.log('hungerMax 账本 ' + saved + ' 小于活模型 ' + live + ' → 用活模型值覆盖（防止过期上限截断）');
        return live;
      }
      return saved;
    }
    if (live > 0) return live;
    return saved > 0 ? saved : 0;
  }

  /** 可重复接取的任务（tasknew.Repeat≠0）。
   *  客户端 `updateTaskData`（index.js:134524）是 `if (0 == t.taskObj.Repeat) { finishTaskObj[o]=e; ... }`
   *  —— 重复任务**不被客户端记为完成**，所以它能被再次接取。我们跟着不写 done、并从 accepted 里移除，
   *  否则这份任务会被永久标成"做过"，与客户端行为分叉。 */
  function isRepeatTask(id) {
    var m = taskMeta(id);
    return !!(m && m.p);
  }

  /* ================= 领奖共用账（v2.6 C02 堵口）=================
   * 上游指出的白拿口子（`_incoming\v2.6-20261025` §一）：领奖路径只验"在不在 s.accepted 里"，
   * 而接任务既不验领过没有、也不验是不是环任务 —— 于是
   *   circleTaskAward(X) 发奖 → acceptCircleTask(X) 再塞回 accepted → 再发 → 无限
   * 且 acceptTask/rogueAcceptTask/delegateTask 都能把**任意** X 塞进 accepted，配任一领奖口即可刷；
   * 跨口还能重复：主线 X 用 getFinishTaskAward 领过（记 s.rewarded），再从 circleTaskAward 领一遍。
   *
   * 修法：**所有发任务奖的口子共用一本账**（s.rewarded 管一次性、s.circleDay 管环任务按天限次），
   * 接任务口也要验（见 acceptable()）。 */

  /** 是不是"环任务/委托任务"——指我们从 circle_task 投射出去的那批 id（它们不在 tasknew 表里，
   *  taskMeta() 为 null）。⚠ 与 isRepeatTask 是**两个不同概念，不许合并**：
   *  isRepeatTask = tasknew.Repeat≠0，它决定 getFinishTaskAward 写不写 done（客户端一致性，动不得）；
   *  本函数只决定领奖账本走"一次性"还是"按天限次"。 */
  function isCircleTask(id) {
    var n = parseInt(id, 10) || 0;
    if (!(n > 0)) return false;
    if (taskMeta(n)) return false;            // 真任务表里有 → 不是我们投射的环任务
    return isKnownCircleId(n);                // 必须是投射器真会发出去的 id，避免"任意 id 都算环任务"
  }
  function isKnownCircleId(n) {
    var rows = circleRows();
    for (var i = 0; i < rows.length; i++) { if (rows[i].id === n) return true; }
    return false;
  }

  /** 环任务每日领奖上限。上游口径：「先用 circle_task 表/客户端 cNum 上限，取不到先写 20」。
   *  实测两张表都给不出"每日领奖次数"：
   *    circle_task 的 21 行是**等级段档位**（low_limit/limit 1..1000）；
   *    entrust_open 的 number 1..5 是**同时可挂数量**（= cNum），不是领奖次数。
   *  ⇒ 按上游给的后备值取 20，留成命名常量便于后续调。 */
  var CIRCLE_DAILY_MAX = 20;

  /** 按天键（本地日）。用 env.now() 的本地日期，纯字符串比较，跨天自动失效。 */
  function todayKey() {
    var d = new Date(env.now());
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  /** "可重复领"的两种来源，**必须都算**：
   *   ① isRepeatTask —— tasknew.Repeat≠0 的每日/重复任务（游戏真实存在的一大类）；
   *   ② isCircleTask —— 我们从 circle_task 投射的环任务（不在 tasknew 里）。
   *  ⚠ 上游给的示例只写了 `isRepeatTask`，但他们的语境里"重复任务"就等于"环任务"；
   *  在本工程里这是**两个不同的集合**。若只按 isRepeatTask 判，环任务会变成一次性；
   *  若只按 isCircleTask 判，真·每日任务会被永久锁死（功能回归）。所以两者取并集。 */
  function isRepeatable(id) {
    return isRepeatTask(id) || isCircleTask(id);
  }

  /** 能不能领：一次性任务看 s.rewarded（永久）；可重复任务看当日计数。 */
  function canClaim(s, id) {
    var tid = parseInt(id, 10) || 0;
    if (!(tid > 0)) return false;
    s.rewarded = s.rewarded || [];
    if (!isRepeatable(tid)) return s.rewarded.indexOf(tid) < 0;
    var d = todayKey();
    if (!s.circleDay || s.circleDay.d !== d) s.circleDay = { d: d, n: 0 };
    return (parseInt(s.circleDay.n, 10) || 0) < CIRCLE_DAILY_MAX;
  }

  /** 记一笔领过。⚠ guardSave 禁止 rewarded **数量减少**（bz-rpc-server.js:363）→ 这里只 push 不 splice。 */
  function markClaim(s, id) {
    var tid = parseInt(id, 10) || 0;
    if (!(tid > 0)) return;
    s.rewarded = s.rewarded || [];
    if (!isRepeatable(tid)) {
      if (s.rewarded.indexOf(tid) < 0) s.rewarded.push(tid);
      return;
    }
    var d = todayKey();
    if (!s.circleDay || s.circleDay.d !== d) s.circleDay = { d: d, n: 0 };
    s.circleDay.n = (parseInt(s.circleDay.n, 10) || 0) + 1;
  }

  /** 能不能接。上游口径：「tid 不在任务表，或非重复任务且已 rewarded → eRet:6、不动档」。
   *  实现上再加一条白名单：非真任务的 id 只认**我们投射出去的环任务 id**，
   *  否则任意数字都能被塞进 accepted（那条路本身不给钱，但会把档弄脏）。 */
  function acceptable(s, id) {
    var tid = parseInt(id, 10) || 0;
    if (!(tid > 0)) return false;
    s.rewarded = s.rewarded || [];
    if (taskMeta(tid)) {
      // 真任务：可重复接取的（tasknew.Repeat≠0）不受限；一次性的领过就不许再接
      if (isRepeatTask(tid)) return true;
      return s.rewarded.indexOf(tid) < 0;
    }
    return isKnownCircleId(tid);
  }

  /** 发放物品：装备进 PlayerEquip（`[1, 数量]`，无随机属性时 uid 就是物品 id），其它进背包。
   *  客户端 parseEq(uid,[1,num]) → {id:uid, type:1, itemID:uid, num} → equipmentDic[uid] */
  function grantItem(s, id, n) {
    var iid = parseInt(id, 10);
    var cnt = parseInt(n, 10) || 0;
    if (!(iid > 0) || cnt <= 0) return;
    if (!s.playerEquip) s.playerEquip = {};
    if (itemTypeOf(iid) === 1) {
      var cur = Array.isArray(s.playerEquip[iid]) ? (parseInt(s.playerEquip[iid][1], 10) || 0) : 0;
      s.playerEquip[iid] = [1, cur + cnt];
    } else {
      bagAdd(s, iid, cnt);
    }
  }

  /** 扣除物品（消耗任务所需 / 卸下装备时用），扣到 0 即删除 */
  function consumeItem(s, id, n) {
    var iid = parseInt(id, 10);
    var cnt = parseInt(n, 10) || 0;
    if (!(iid > 0) || cnt <= 0) return;
    if (!s.playerEquip) s.playerEquip = {};
    if (itemTypeOf(iid) === 1) {
      var cur = Array.isArray(s.playerEquip[iid]) ? (parseInt(s.playerEquip[iid][1], 10) || 0) : 0;
      cur -= cnt;
      if (cur > 0) s.playerEquip[iid] = [1, cur];
      else delete s.playerEquip[iid];
    } else {
      bagAdd(s, iid, -cnt);
    }
  }

  /** 货币 id：客户端 getItemNum 对这几个走特判（1→gold、4001→coins），不是背包物品。
   *  （见 index.jsc:134428 judgeItemRequire 与 §4.7；往 itemObj 里塞它们无效） */
  var CURRENCY_IDS = { 1: 1, 2: 1, 4001: 1, 4002: 1, 4003: 1 };
  function isCurrencyItem(id) { return !!CURRENCY_IDS[parseInt(id, 10) || 0]; }

  /** 货币 id → 钱包落点（2026-10-23 修 §7-2：奖励是货币时**不许**走 grantItem）
   *
   *  三个名字对不上，写错不报错、只静默失效，所以这张表必须写全并留在同一处：
   *    客户端特判 `tools/index.js:106347-106360 getItemNum`：1→gold、4001→coins、4002→exp、
   *               4003→potentials、8888→yuanbao（**从不读 _itemObj**，所以塞背包 = 假物品）
   *    eco 监听器 `tools/index.js:64698-64725 ECONOMY_CHNG`：只认 coins / ptt / gold / exp / chips / yuanbao
   *               —— **潜能是 `ptt`**，而存档字段叫 `potential`；发 `note.eco.potential` 客户端直接丢弃
   *    存档/投射   本文件 LoadGame：gold / coins / potential / yuanbao
   *
   *  `4002(经验)` v2.7.1 起入表（上游拍板 1）：客户端 LoadGame 读的就是
   *  `RoleBaseInfo.exp ← baseValueAy[18]`（index.js:111775，另见 74939 parsePlayerData），
   *  eco 监听器也认 `exp` 键 → 存档新增 `s.exp`（缺省 0，见 grantCurrency），LoadGame 按 [18] 投射。 */
  var CURRENCY_SLOTS = {
    1: { f: 'gold', k: 'gold' },
    4001: { f: 'coins', k: 'coins' },
    4002: { f: 'exp', k: 'exp' },
    4003: { f: 'potential', k: 'ptt' },
    8888: { f: 'yuanbao', k: 'yuanbao' }
  };
  function currencySlot(id) { return CURRENCY_SLOTS[parseInt(id, 10) || 0] || null; }

  /** 发放一组奖励 `[[物品id,数量],…]`，并把回执填进 note / ra。
   *  ⚠ **不能一律用 grantItem**：4003=潜能 / 1=金条 / 4001=银两 / 8888=元宝 都是**货币**，
   *    塞进背包客户端不认（潜能会变成一件叫「潜能」的背包道具，钱包一分不涨）。
   *  货币 → grantCurrency → note.eco；其它 → grantItem → note.ivch/eqch。
   *  ra = {物品id: 数量}，给客户端弹「获得」窗用（rewardArray 的既有口径）。 */
  function grantRewardList(s, list, note, ra) {
    for (var i = 0; i < list.length; i++) {
      var pair = list[i];
      if (!pair || pair.length !== 2) continue;
      var iid = parseInt(pair[0], 10) || 0;
      var ic = parseInt(pair[1], 10) || 0;
      if (!(iid > 0) || !(ic > 0)) continue;
      ra[iid] = (parseInt(ra[iid], 10) || 0) + ic;
      if (isCurrencyItem(iid)) {
        var eco = grantCurrency(s, iid, ic);
        if (eco) { for (var k in eco) if (eco.hasOwnProperty(k)) note.eco[k] = eco[k]; }
        continue;
      }
      grantItem(s, iid, ic);
      if (itemTypeOf(iid) === 1) note.eqch[iid] = [1, s.playerEquip[iid]];
      else note.ivch[iid] = parseInt(s.bag[iid], 10) || 0;
    }
    return ra;
  }

  /** 货币入账：写存档钱包，返回该塞进 `note.eco` 的 `{键: 新余额}`；不是可入账货币返回 null（不改任何东西）。
   *  缺省值沿用各处既有口径：gold / coins / potential 缺省 99999，yuanbao / **exp（v2.7.1）** 缺省 0 ——
   *  经验从 0 起算（拍板 1：新键按需创建、按 baseValueAy[18] 投射），灌 99999 就是伪造进度。 */
  function grantCurrency(s, id, n) {
    var slot = currencySlot(id);
    var cnt = parseInt(n, 10) || 0;
    if (!slot || cnt <= 0) return null;
    if (typeof s[slot.f] !== 'number') s[slot.f] = (slot.f === 'yuanbao' || slot.f === 'exp') ? 0 : 99999;
    s[slot.f] += cnt;
    var eco = {};
    eco[slot.k] = s[slot.f];
    return eco;
  }

  /** 把"派生叠加"推给活着的客户端模型（B，2026-10-22）
   *
   *  为什么需要：`acceptTask` 的应答回调（index.js:133338-133382）只消费
   *  `eRet / triggerBoxs / skillId / CDTime / serverTime`，**不处理任何物品字段**，三包里也没有
   *  "通用物品增量钩子"（通用 dispatch 只有 2 条 INVENTORY_CHNG）。所以局中接下一个"背包里没有的
   *  Type2 任务"时，客户端本地看不到叠加 → `judgeItemRequire` 不过 → NPC 不给"完成"入口，
   *  要等下次 LoadGame / sycnTask 才恢复。
   *
   *  ⚠️ 这是第二条写入路径（R02 回执 §3(c) 明确警告）。护栏：
   *    - `env.sandbox` 一律跳过（自检/隔离实例绝不碰活客户端，回归用例 test/selfcheck-model-push.js）；
   *    - 只用客户端自己的 `InventoryModel.setItem(id, count)`，不手搓 IvItem、不碰 type2Items 的内部结构；
   *    - 失败静默（推不进去也不影响应答）。 */
  /** 推"绝对值"给客户端背包：absMap = {物品id: 客户端应显示的数量} */
  function pushSetItem(absMap) {
    if (env.sandbox) return;
    try {
      var R = (typeof window !== 'undefined') ? window.__require : null;
      if (typeof R !== 'function') return;
      var IM = R('InventoryModel'); IM = IM && (IM.InventoryModel || IM);
      if (!IM || typeof IM.setItem !== 'function') return;
      for (var k in absMap) {
        if (!absMap.hasOwnProperty(k)) continue;
        IM.setItem(parseInt(k, 10), parseInt(absMap[k], 10) || 0);
      }
    } catch (e) {}
  }

  /** 推装备实例：优先用客户端自己的 `InventoryModel.updateEq(id, [type, num])`
   *  —— 它就是 `updateEqData` 回放 `PlayerEquip` 走的那条路（index.js:65117-65136 parseEq：
   *  type==1 时结构是 `{id, type, itemID, num, weaponSkinId}`，字段名是 **num** 不是 numbers）。
   *  没有 `updateEq` 时才退化成 `addEq(手搓结构)`。 */
  function pushAddEq(equips) {
    if (env.sandbox || !equips) return;
    try {
      var R = (typeof window !== 'undefined') ? window.__require : null;
      if (typeof R !== 'function') return;
      var IM = R('InventoryModel'); IM = IM && (IM.InventoryModel || IM);
      if (!IM) return;
      var s = loadSave();
      for (var e in equips) {
        if (!equips.hasOwnProperty(e)) continue;
        var uid = parseInt(e, 10);
        if (!(uid > 0)) continue;
        var inst = (s.playerEquip || {})[uid];
        var num = Array.isArray(inst) ? (parseInt(inst[1], 10) || 1) : 1;
        if (typeof IM.updateEq === 'function') {
          IM.updateEq(uid, [1, num]);
        } else if (typeof IM.addEq === 'function') {
          IM.addEq({ id: uid, type: 1, itemID: uid, num: num, attrs: null, numAttr: 0, crystalIds: null, weaponSkinId: 0 });
        }
      }
    } catch (e) {}
  }

  /** 从客户端模型里删掉一件已不再持有的装备实例（卖掉/用掉之后）。
   *  客户端自己的入口是 `InventoryModel.deleteEq(uid)`（index.js:65087-65098：清 equipmentDic、
   *  equipByItemID、inherit、fash 四本索引）。不调用它 → 装备界面里那件东西还在。
   *  ⚠ 沙盒跳过；失败静默。 */
  function pushDeleteEq(uids) {
    if (env.sandbox || !uids) return;
    try {
      var R = (typeof window !== 'undefined') ? window.__require : null;
      if (typeof R !== 'function') return;
      var IM = R('InventoryModel'); IM = IM && (IM.InventoryModel || IM);
      if (!IM || typeof IM.deleteEq !== 'function') return;
      for (var i = 0; i < uids.length; i++) {
        var uid = parseInt(uids[i], 10);
        if (uid > 0) IM.deleteEq(uid);
      }
    } catch (e) {}
  }

  /** 发奖/掉落的推送入口：`items` = 新增背包物品，`equips` = 新增装备；数量一律取存档里的绝对值。 */
  function pushToClient(items, equips) {
    if (env.sandbox) return;
    var s = loadSave();
    var bag = (s && s.bag) || {};
    var abs = {};
    if (items) {
      for (var k in items) {
        if (!items.hasOwnProperty(k)) continue;
        abs[k] = parseInt(bag[k], 10) || 0;
      }
    }
    if (Object.keys(abs).length) pushSetItem(abs);
    if (equips && Object.keys(equips).length) pushAddEq(equips);
  }

  /** 把"派生叠加"那部分推回客户端（接任务/交任务时用）：推的是**投射后的绝对值**。 */
  function pushItemsToClient(s) {
    var ov = needOverlay(s);
    if (!ov || !Object.keys(ov).length) return;
    var prj = projectItems(s);
    var abs = {};
    for (var k in ov) {
      if (!ov.hasOwnProperty(k)) continue;
      abs[k] = parseInt(prj.bag[k], 10) || 0;
    }
    pushSetItem(abs);
  }

  /** ===== 统一 drop 展开入口（打怪掉落；以后给拆解、开箱复用） =====
   *  数据（`tools/gen_task_rewards.js` 生成）：
   *    BZ_NPCDROP = { npcId: dropId }                     —— npc 表 Drop 列，772/867 个 npc 能解析
   *    BZ_DROP    = { dropId: { 物品id: [数量, 概率] } }   —— 249 张 drop 表，19 条必得 + 450 条概率
   *  规则：概率 >= 100 必得；< 100 掷点。
   *  ⚠ 随机源可注入（`env.random`）：R03 回执 §8 指出 `Math.random()` 会让自检/单测不可复现，
   *    所以这里走 `rnd()`；单测传固定种子就能把概率掉落变成确定性用例。
   *  返回 `{items:{id:count}, equips:{id:count}}`（装备单独分出来，好回填 `equipObj`）。 */
  function rnd() {
    return (typeof env.random === 'function') ? env.random() : Math.random();
  }
  function grantFromDrop(s, dropId) {
    var D = (typeof BZ_DROP !== 'undefined') ? BZ_DROP : null;
    if (!D) return null;
    var row = D[String(dropId)];
    if (!row) return null;
    var got = { items: {}, equips: {} };
    for (var k in row) {
      if (!row.hasOwnProperty(k)) continue;
      var cnt = parseInt(row[k][0], 10) || 0;
      var p = parseInt(row[k][1], 10) || 0;
      if (!(cnt > 0)) continue;
      if (p < 100 && !(rnd() * 100 < p)) continue;
      grantItem(s, k, cnt);
      if (itemTypeOf(k) === 1) got.equips[k] = (got.equips[k] || 0) + cnt;
      else got.items[k] = (got.items[k] || 0) + cnt;
    }
    return got;
  }


  /** 派生叠加（R01 回执 §1「派生叠加」，2026-10-22；本文件 acceptTask 的注释里有完整依据）
   *
   *  只算**显示用**的差额：存档里的背包永远只记合法获得的数量，这里一分钱都不写。
   *  规则：
   *   - 只算进行中（accepted 且不在 done）的任务；
   *   - 同一物品被多个任务要求时取 **max 不累加** —— 本作是"携带型"（见下），多个任务可以共用同一份物品；
   *   - 货币（1/2/4001/4002/4003）跳过：客户端用 gold/coins 特判，背包塞不进去；
   *   - 装备（Type=1）跳过：客户端对装备走 EqUtils.getEquipOrUid 查 PlayerEquip，不查背包数量。
   *  返回 { 物品id: 需要补的差额 }，调用方只拿它去拼应答。 */
  function needOverlay(s) {
    var acc = (s && s.accepted) || [], done = (s && s.done) || [];
    var doneSet = {}, i, k;
    for (i = 0; i < done.length; i++) doneSet[done[i]] = 1;
    var need = {};
    for (i = 0; i < acc.length; i++) {
      var tid = acc[i];
      if (doneSet[tid]) continue;
      var m = taskMeta(tid);
      if (!m || !m.n) continue;
      // 只有 Type 2/12/13 的 SpRequire 是物品：Type3 是怪物 id（judgeFightRequire）、Type1 是装饰。
      // 生成器已按 Type 过滤，这里再兜一层（防旧表 / 防以后有人改生成器）。
      if (m.t !== undefined && m.t !== 2 && m.t !== 12 && m.t !== 13) continue;
      for (k in m.n) {
        if (!m.n.hasOwnProperty(k)) continue;
        var want = parseInt(m.n[k], 10) || 0;
        if (want <= 0) continue;
        if (isCurrencyItem(k)) continue;
        if (itemTypeOf(k) === 1) continue;
        var cur = parseInt(need[k], 10) || 0;
        if (want > cur) need[k] = want;          // 携带型 → max
      }
    }
    var out = {};
    for (k in need) {
      if (!need.hasOwnProperty(k)) continue;
      var have = parseInt((s.bag || {})[k], 10) || 0;
      if (need[k] > have) out[k] = need[k] - have;
    }
    return out;
  }

  /** 背包的客户端投射 = 真实账本 + 显示叠加。只在应答里出现（LoadGame / sycnPlayerItemData）。 */
  function projectItems(s) {
    ensureLedger(s);
    var ov = needOverlay(s);
    var bag = clone(s.bag);
    for (var k in ov) {
      if (!ov.hasOwnProperty(k)) continue;
      bag[k] = (parseInt(bag[k], 10) || 0) + ov[k];
    }
    return { bag: bag, overlay: ov };
  }

  /** 任务账本 → 客户端要的两种形状（同一份数据，两套格式，实测两条消费路径不同）
   *   LoadGame（index.jsc:112029 setSaveAllTaskDatas）
   *     finishTaskObj   = ["101080,1", ...]  客户端自己 split(",") 再 parseInt
   *     acceptTaskArray = [已完成之外的已接任务 ID]
   *     acceptTaskOrder = [已接任务顺序]
   *   sycnTask（index.jsc:133513 sycnTaskCallBack）
   *     PlayerFinishTaskObj = { "101080": 1 }  客户端直接当对象用
   *     acceptTaskMap       = { "100020": 100020 } 客户端 parseInt 取值
   *   两处都必须按账本回放：客户端拿不到就退回本地缓存，本地缓存被清过一次就"全没做过"。
   */
  function taskLedger() {
    var s = loadSave();
    var done = s.done || [], acc = s.accepted || [];
    var doneSet = {}, i;
    for (i = 0; i < done.length; i++) doneSet[done[i]] = 1;
    var finishArr = [], finishObj = {}, acceptArr = [], acceptMap = {}, order = [];
    for (i = 0; i < done.length; i++) {
      finishArr.push(done[i] + ',1');
      finishObj[done[i]] = 1;
    }
    for (i = 0; i < acc.length; i++) {
      var id = acc[i];
      order.push(id);
      if (!doneSet[id]) { acceptArr.push(id); acceptMap[id] = id; }
    }
    return { finishArr: finishArr, finishObj: finishObj, acceptArr: acceptArr, acceptMap: acceptMap, order: order };
  }

  /** 首次运行时用 Create 模板自动造一份完整角色，跳过建角 UI（尚未接入，留待持久化步骤） */
  function ensureRole() {
    var s = loadSave();
    if (s.created && s.baseValueAy) return s;
    var tpl = clone(TPL.create || {});
    var ay = (tpl.baseValueAy || []).slice();
    ay[0] = s.account || '9900012358565';
    ay[1] = s.name || 'FZhou';
    tpl.baseValueAy = ay;
    tpl.roleID = s.roleID || 16374;
    s.created = true;
    s.name = ay[1];
    s.baseValueAy = ay;
    s.roleSnapshot = tpl;
    persist();
    env.log('自动生成角色: ' + ay[1] + ' roleID=' + tpl.roleID);
    return s;
  }

  /** baseValueAy 必须补齐到 48 项：客户端会读 [44]=场景ID [45][46]=出生坐标 [47]=已退门派列表
   *  （依据 index.jsc:74965-74970 与 111801；缺 [47] 会让拜师时 outSchoolAy.length 崩溃） */
  function normalizeBaseValueAy(ay) {
    var tpl = (TPL.create && TPL.create.baseValueAy) || [];
    var out = Array.isArray(ay) ? ay.slice(0, 48) : [];
    for (var i = 0; i < 48; i++) {
      if (out[i] === undefined || out[i] === null) out[i] = (tpl[i] !== undefined ? tpl[i] : 0);
    }
    if (!Array.isArray(out[47])) out[47] = [];
    return out;
  }

  /** 穿装备的共享实现（`PutOnEquipment` 与客户端真名 `equipWeapon` 共用）。
   *  请求实测：`{EquipmentType:5, itemID:2302, hp, hplmt, gTime, mp, ...}`（槽 5 = 武器）。
   *  `itemID` 是**装备实例 uid**；本作 `type==1` 的无属性装备 `uid == itemID`（§4.8）。
   *  槽位 <8 才会被"卸下全部装备"清掉，所以这里只记槽位 + 实例存在。 */
  function applyPutOn(p, actName) {
    p = p || {};
    var s = ensureLedger(loadSave());
    var slot = parseInt(p.EquipmentType, 10) || 0;
    var uid = parseInt(p.itemID, 10) || 0;
    if (slot > 0) {
      if (uid > 0) {
        if (!Array.isArray(s.playerEquip[uid])) s.playerEquip[uid] = [1, 1];
        s.equipments[slot] = uid;
      } else {
        delete s.equipments[slot];
      }
      persist();
      env.log(actName + ' 槽' + slot + ' → ' + uid + ' 当前=' + JSON.stringify(s.equipments));
    } else {
      env.log(actName + ' 忽略无效请求（槽位=' + slot + ' uid=' + uid + '）');
    }
    var res = { eRet: 1, equipments: clone(s.equipments), PlayerEquip: clone(s.playerEquip) };
    return shaped(actName, res) || wrapped(actName, res, { achievement: ach() });
  }

  /** 侠客令 / 大侠令（`NewGFUI` 双轨）的 growObj 构造器。track: 1 = 侠客令(award1) / 2 = 大侠令(award2)。
   *  行形状见 scripts2.js:45854-45880：`[状态, 需求等级, 保留0, 奖励1, 奖励2, 奖励3, 奖励4]`。
   *  ⚠ 四格奖励必须都是**数组**：:45879 `for (n = 0; n < 4 && t[3 + n].length > 0; n++)`
   *    遇到空数组就停、遇到 undefined 直接抛 TypeError，所以不足的格补 []。 */
  /** 大侠令（付费轨）离线解锁价（**元宝**）。
   *  ⚠ 原版真实价格**未取证**：原版解锁链是 GFUI_BUY_GIFT/GFUI_BUY_BIG_GIFT → payData →
   *    reqRechargeMoney（index.js:55279-55289）→ **真实充值**；本工程不接任何真实付费。
   *    所以这个数是本工程自定的离线定价（参照 anniversary_pass_gift 最高档 980），要改就改这一处。 */
  var GF_BIG_UNLOCK_PRICE = 980;

  function growthFundPayload(doName, track) {
    var s = ensureLedger(loadSave());
    var claimed = (s.growthClaim && typeof s.growthClaim === 'object') ? s.growthClaim : {};
    var src = (typeof BZ_GF_ROW !== 'undefined' && BZ_GF_ROW) || {};
    var rows = {};
    var n = 0;
    for (var k in src) {
      if (!src.hasOwnProperty(k) || k === '__meta') continue;
      var g = src[k] || {};
      var list = (track === 1) ? (g.a1 || []) : (g.a2 || []);
      var slot = [];
      slot.push(claimed[track + '_' + k] ? 2 : 1);   // [0] 状态：2=已领取 / 1=可领取（尾巴#1：按键分轨）
      // [1] 需求等级（客户端显示 "Lv"+该值，并用 getSkillLvData 查 level 表拿 SkillEvaluate）。
      // ⚠ 必须 ≥1：level 表 id 是 1..999，给 0 会让 getItem(0,"level") 返回 null，
      //   而 NewGFRender.setSelectBtn（scripts2.js:45855）在"未解锁"分支直接读 e.SkillEvaluate
      //   → `Cannot read property 'SkillEvaluate' of null` → show() 整体中断 → **整页空白**
      //   （大侠令 payStates=0 时必走那一支，所以第一阶 liveness=0 就把整页打空）。
      slot.push(Math.max(1, parseInt(g.lv, 10) || 0));
      slot.push(0);                           // [2] 保留位（当前客户端不读）
      for (var ri = 0; ri < 4; ri++) {        // [3..6] 四格奖励，不足补 []
        var pair = list[ri];
        slot.push((pair && pair.length === 2) ? [parseInt(pair[0], 10) || 0, parseInt(pair[1], 10) || 0] : []);
      }
      rows[k] = slot;
      n++;
    }
    var bigPaid = (parseInt(s.growthBigPaid, 10) || 0) ? 1 : 0;
    return {
      payload: {
        eRet: 1,
        growObj: rows,
        buyPrice: (track === 2) ? GF_BIG_UNLOCK_PRICE : 0,
        paystata: (track === 2) ? bigPaid : 1,
      },
      count: n,
      bigPaid: bigPaid,
    };
  }

  /** 侠客令 / 大侠令领奖的共用实现。track 1 = 侠客令(a1) / 2 = 大侠令(a2)。
   *  闸门：该阶存在 + 未领过 +（大侠令还要求已解锁）。
   *  ⚠ **等级门槛未接**：真实设计里每阶有"需求等级"（data[1] 会显示成 Lv N），
   *    离线环境一律按"未领取即可领"，否则几乎领不到任何一阶。要收紧就在这里拿 g.lv 比玩家武学等级。 */
  function receiveGrowthReward(p, track, logName) {
    p = p || {};
    var s = ensureLedger(loadSave());
    var gid = parseInt(p.Growid, 10) || 0;
    var src = (typeof BZ_GF_ROW !== 'undefined' && BZ_GF_ROW) || {};
    var g = src[String(gid)];
    if (!g || gid <= 0) {
      env.log(logName + ' 拒绝：找不到阶 ' + gid);
      return wrapped(logName, { eRet: 4, note: {} }, { achievement: ach() });
    }
    if (track === 2 && !(parseInt(s.growthBigPaid, 10) || 0)) {
      env.log(logName + ' 拒绝：大侠令未解锁');
      return wrapped(logName, { eRet: 4, note: {} }, { achievement: ach() });
    }
    if (s.growthClaim[track + '_' + gid]) {
      env.log(logName + ' 拒绝：第 ' + gid + ' 阶已领取（轨道 ' + track + '）');
      return wrapped(logName, { eRet: 4, note: {} }, { achievement: ach() });
    }
    var list = (track === 1) ? (g.a1 || []) : (g.a2 || []);
    if (!list.length) env.log(logName + ' 第 ' + gid + ' 阶该轨表内无奖励 → 直接标记已领');
    var note = { ivch: {}, eqch: {}, eco: {} };
    var ra = grantRewardList(s, list, note, {});
    s.growthClaim[track + '_' + gid] = 1;
    persist();
    env.log(logName + ' → 第 ' + gid + ' 阶领取（' + (track === 1 ? '侠客令' : '大侠令') + '），'
      + Object.keys(ra).length + ' 种奖励');
    return wrapped(logName, { eRet: 1, rewardArray: ra, note: note }, { achievement: ach() });
  }

  /* ---- 环任务（委托/挂机任务）行投射器：单一事实来源 ----
   * 行的字段集不是猜的，是逐字从客户端渲染链取的：
   *   scripts2.js:28053-28059 setNewBaseData  → dataObj = row；有 sTime 才设倒计时
   *   scripts2.js:28060-28071 showBaseInfo    → 读 `t.state` 作**下标**取
   *        `[0,1576,1582,1580,593,791][t.state]`；读 `t.lv`（`o < lv` 循环）；读 `t.type`
   *   scripts2.js:27976-28001 showTitleText   → 读 `t.type` → 查 entrust_task；
   *        type∈{2,3} 时 `t.param[0]` 查 npc 取 `.NpcName`；否则 `t.param[0]` 查 map 取 `.Name`；
   *        再读 `t.award[0]` / `t.award[1]`；`1==t.type` 时查 entrust_detailed[1]，否则 `t.lv` 查
   *        entrust_level 取 `.time`；最后读可选的 `t.caidan`
   *   index.js:43515-43531 CHANGE_DELEGATE_TASK 回调把线上短名还原成长名：
   *        `{id, state:a.s, type:a.t, lv:a.lv, award:a.aw, param:a.c, sTime:a.d}`
   *
   *  ⚠ 三条硬约束 —— 违反的后果是**客户端抛 TypeError**，不是"显示难看"：
   *    ① `type` 必须是 entrust_task 的键（本工程 dump 里是 1..4）；否则 `o.type` 处抛
   *    ② `lv` 必须是 entrust_level 的键（1..5）；否则 `c.time` 处抛（type==1 走 entrust_detailed，不查 lv）
   *    ③ type∈{2,3} 时 `param[0]` 必须是 npc 表里存在的 id；type==4 要的是**地图** id，
   *       而 circle_task 只给 Talk/Fight/Item 三个池、没有地图池 → **本工程不投 type 4**
   *  id 用 9001..9003 固定段：BZ_TASKS 最小键是 100010，不会撞；且跨请求稳定
   *  （客户端 `getItemId()` 拿它当刷新映射的键，见 scripts2.js:28310-28311）。 */

  /** 投射 taskArr 行（长名口径）。任何一条不合格就**整批不投**：宁空表不崩客户端。 */
  function circleRows() {
    var r = circleTier();
    if (!r) return [];
    var talk = Array.isArray(r.talk) ? r.talk : [];
    var item = Array.isArray(r.item) ? r.item : [];
    var money = parseInt(r.m, 10) || 0;
    var exp = parseInt(r.e, 10) || 0;
    var rows = [
      // type 1：无 NPC/地图目标（showTitleText 的 `1 == o.type` 分支不碰 param）
      { id: 9001, state: 2, type: 1, lv: 1, award: [money, exp], param: [] },
      // type 2：交一件装备给 NPC —— param[0]=npc，param[1]=装备 id
      //   （index.js:43554-43557 `2 == t.type` 时把 param[1] 当 item 查且要求 `1 == o.Type`；
      //     circle_task.Item 池 12 个 id 实测全是 Type=1 装备，与之一致）
      { id: 9002, state: 2, type: 2, lv: 1, award: [money, exp], param: [talk[0] || 0, item[0] || 0] },
      // type 3：去找某个 NPC（showTitleText 的 `2 == o.type || 3 == o.type` 分支）
      { id: 9003, state: 2, type: 3, lv: 1, award: [money, exp], param: [talk[1] || talk[0] || 0] },
    ];
    for (var i = 0; i < rows.length; i++) {
      var x = rows[i];
      // 约束①②：state 是文本数组下标，type/lv 是配置表键
      if (!(x.state >= 1 && x.state <= 5) || !(x.type >= 1 && x.type <= 4) || !(x.lv >= 1 && x.lv <= 5)) {
        env.log('circleRows 丢弃：state/type/lv 越界 ' + JSON.stringify(x));
        return [];
      }
      // 约束③：param[0] 必须是有效 npc id；type 2 还要有效装备 id
      if (x.type === 2 && !(x.param[0] > 0 && x.param[1] > 0)) {
        env.log('circleRows 丢弃：type=2 缺 npc/装备 id ' + JSON.stringify(x));
        return [];
      }
      if (x.type === 3 && !(x.param[0] > 0)) {
        env.log('circleRows 丢弃：type=3 缺 npc id ' + JSON.stringify(x));
        return [];
      }
    }
    return rows;
  }

  /** 把 taskArr 行折成 CHANGE_DELEGATE_TASK 的线上短名口径 `{id:{s,t,lv,aw,c,d}}`。
   *  客户端会对它做 43518-43528 的逆映射，所以短名必须与长名一一对应，否则"换一批"后列表错位。 */
  function circleTaskObj() {
    var rows = circleRows();
    var obj = {};
    for (var i = 0; i < rows.length; i++) {
      var x = rows[i];
      var o = { s: x.state, t: x.type, lv: x.lv, aw: x.award, c: x.param };
      if (x.hasOwnProperty('sTime')) o.d = x.sTime;
      obj[String(x.id)] = o;
    }
    return obj;
  }

  /** 按 npcID 从**服务端掉落表**结算奖励 —— 与既有 CheckBattleResult 完全同一口径：
   *  客户端只提供 `npcID` 这一个**可校验键**，奖励数额来自 `BZ_NPCDROP[npcID]`，
   *  客户端自报的 award/exp/prestige 之类数值**一律不进钱包**（C02 白拿事故的同类防线）。
   *  返回 grantFromDrop 的结果（{items,equips} 或 null）。 */
  function dropForNpc(npc, tag) {
    var id = parseInt(npc, 10) || 0;
    if (!(id > 0)) return null;
    var s = ensureLedger(loadSave());
    var dropId = (typeof BZ_NPCDROP !== 'undefined') ? BZ_NPCDROP[String(id)] : 0;
    if (!dropId) {
      env.log(tag + ' npc=' + id + ' 无掉落表（npc.Drop 缺失或展开为空）→ 不发奖');
      return null;
    }
    var got = grantFromDrop(s, dropId);
    persist();
    if (got) pushToClient(got.items, got.equips);
    var n = got ? (Object.keys(got.items || {}).length + Object.keys(got.equips || {}).length) : 0;
    env.log(tag + ' npc=' + id + ' drop=' + dropId
      + (n ? ' → ' + JSON.stringify(got) : ' 本次没掷中'));
    return got;
  }

  /** 取投射用的档位**键**。角色等级未建模 → 恒定取最低段（low_limit=1，对任何等级都合法）。
   *  投射（circleRows）与发奖（taskRewardPairs）都必须走这一个函数，否则"看到的档位"和
   *  "发的奖"会不一致。将来把等级接进存档后，只改这里即可，其余代码不动。 */
  function circleTierKey() {
    if (typeof BZ_CIRCLE_TASK === 'undefined' || !BZ_CIRCLE_TASK) return null;
    var keys = [];
    for (var k in BZ_CIRCLE_TASK) {
      if (!hasOwn(BZ_CIRCLE_TASK, k)) continue;
      if (!/^\d+$/.test(k)) continue;          // 跳过 __meta
      keys.push(k);
    }
    if (!keys.length) return null;
    keys.sort(function (a, b) { return Number(a) - Number(b); });
    return keys[0];
  }

  /** 取投射用的档位行。 */
  function circleTier() {
    var k = circleTierKey();
    return k ? (BZ_CIRCLE_TASK[k] || null) : null;
  }

  /** 某条环任务 id 对应的档位键（发奖时用来读"同一段"的表值）。 */
  function circleTierKeyFor(tid) {
    var n = parseInt(tid, 10) || 0;
    if (!isKnownCircleId(n)) return null;
    return circleTierKey();
  }

  /** 任务的奖励对 `[[物品id,数量],…]` —— **所有发奖口的唯一来源**。
   *   ① `BZ_TASKS[id].r`  —— 主线/门派/肉鸽等真任务的 {物品id:数量}
   *   ② `BZ_CIRCLE_TASK`  —— 环任务按**当前档位**给 m 银两 / e 经验 / p 潜能
   *
   *  货币 id 口径（见 CURRENCY_SLOTS 注释）：4001=银两→`s.coins`（与 C01 `buyShopItem` 扣钱
   *  的字段同一个，所以"客户端比价读的字段"自然一致）；4003=潜能→`s.potential`。
   *  4002=经验 v2.7.1 起入账：`CURRENCY_SLOTS` 已含 4002→`s.exp`（上游拍板 1），
   *  grantRewardList/grantCurrency 会把它累进 `s.exp`，LoadGame 按 baseValueAy[18] 投射回客户端。 */
  function taskRewardPairs(tid) {
    var id = parseInt(tid, 10) || 0;
    var out = [];
    if (!(id > 0)) return out;
    var meta = taskMeta(id);
    if (meta && meta.r) {
      for (var k in meta.r) {
        if (!hasOwn(meta.r, k)) continue;
        out.push([parseInt(k, 10) || 0, parseInt(meta.r[k], 10) || 0]);
      }
      return out;
    }
    if (!isCircleTask(id)) return out;
    var tk = circleTierKeyFor(id);
    var row = (tk && typeof BZ_CIRCLE_TASK !== 'undefined') ? BZ_CIRCLE_TASK[tk] : null;
    if (!row) return out;
    var m = parseInt(row.m, 10) || 0;
    var e = parseInt(row.e, 10) || 0;
    var p = parseInt(row.p, 10) || 0;
    if (m > 0) out.push([4001, m]);   // 银两
    if (e > 0) out.push([4002, e]);   // 经验（v2.7.1 起入 s.exp）
    if (p > 0) out.push([4003, p]);   // 潜能
    return out;
  }

  /** 成就账本（补齐 getAchieveData 读的那几个槽，缺了它 .indexOf 会炸）。
   *  槽位沿用 getAchieveData 早已预埋的 s.achieve：{groupPoints, rateIds, pending, received, taskData, suitIds}。 */
  function achState(s) {
    if (!s.achieve || typeof s.achieve !== 'object') s.achieve = {};
    var st = s.achieve;
    if (!Array.isArray(st.pending)) st.pending = [];
    if (!Array.isArray(st.received)) st.received = [];
    if (!Array.isArray(st.rateIds)) st.rateIds = [];
    if (!st.groupPoints || typeof st.groupPoints !== 'object') st.groupPoints = {};
    if (!st.suitIds || typeof st.suitIds !== 'object') st.suitIds = {};
    if (!st.taskData || typeof st.taskData !== 'object') st.taskData = {};
    return st;
  }

  /** 只读地看成就账本 —— **不建槽位、不改存档**。
   *  为什么要有它：闸门不通过时必须"一个字节都不动"，而 achState() 会顺手把 s.achieve 建出来
   *  （内存里就变了，之后任何一次 persist 都会把它写盘）。所以拒绝路径一律用 peek。 */
  function achPeek(s) {
    var st = (s && s.achieve && typeof s.achieve === 'object') ? s.achieve : {};
    return {
      pending: Array.isArray(st.pending) ? st.pending : [],
      received: Array.isArray(st.received) ? st.received : [],
      rateIds: Array.isArray(st.rateIds) ? st.rateIds : [],
      groupPoints: (st.groupPoints && typeof st.groupPoints === 'object') ? st.groupPoints : {},
      suitIds: (st.suitIds && typeof st.suitIds === 'object') ? st.suitIds : {},
    };
  }

  /* ============ v2.7.1 上游拍板三件（exp / adventure / 成就进度）的模块级 helper ============
   *  ⚠ helper 一律放 `var H = {` 之前（坑：对象字面量里写 function 是语法错误，两次踩过）。 */

  /** 任务/环任务完成计数（成就 6/1,0 告示牌、6/2,0 环任务的进度源）。
   *  历史完成数不回填（计数器从部署起算），只会让成就晚开、不会虚报 —— 方向安全。 */
  function bumpTaskCounter(s, tid) {
    var id = parseInt(tid, 10) || 0;
    if (isCircleTask(id)) s.circleTotal = (parseInt(s.circleTotal, 10) || 0) + 1;
    else s.taskDoneCount = (parseInt(s.taskDoneCount, 10) || 0) + 1;
  }

  /** 口诀持有判定（成就 3/11 = skill_Trick 表 id，源 s.skillGrasp）。
   *  LoadGame 侧 `skillGrasp` 由 SkillTable.skillknackmodel.initData 吃（index.js:70503）；
   *  knackBag 元素可能是 id 也可能是对象，两种都认；skillGrasp.skillGrasp 的键也算（已领悟）。 */
  function knackHeld(s, id) {
    var g = s.skillGrasp;
    if (!g || typeof g !== 'object') return false;
    var bag = g.knackBag;
    if (Array.isArray(bag)) {
      for (var i = 0; i < bag.length; i++) {
        var el = bag[i];
        var eid = (el && typeof el === 'object') ? (parseInt(el.id, 10) || 0) : (parseInt(el, 10) || 0);
        if (eid === id) return true;
      }
    }
    var known = g.skillGrasp;
    if (known && typeof known === 'object' && hasOwn(known, String(id))) return true;
    return false;
  }

  /** 已学武学等级（成就 1/5 读书识字类）。s.skills[id] 形如 [lv,0,1] 或裸数字（loadSave 规范化两种都容）。 */
  function skillLevelOf(s, id) {
    var v = s.skills ? s.skills[String(id)] : undefined;
    if (v === undefined) return 0;
    if (Array.isArray(v)) return parseInt(v[0], 10) || 0;
    return parseInt(v, 10) || 0;
  }

  /** 收集/持有判定：id 在 背包(s.bag) / 已学武学(s.skills) / 口诀(s.skillGrasp) 任一处即算持有。
   *  三表 id 空间互不重叠（item.json / skill 表 / skill_Trick），并集不会误判。
   *  覆盖：成就 type 3 全部（武学/时装/坐骑/口诀/宝物/伙伴…）与 type 2/3（全家福）。
   *  表里没有的 id（时装不在存档、宝物未建模）自然判 0 → 锁死，不会虚报。 */
  function achHeldCount(s, ids) {
    var held = 0;
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      if (!id) continue;
      if ((parseInt(s.bag ? s.bag[String(id)] : 0, 10) || 0) > 0) { held++; continue; }
      if (s.skills && hasOwn(s.skills, String(id))) { held++; continue; }
      if (knackHeld(s, id)) held++;
    }
    return held;
  }

  /** 成就进度重算（上游拍板 3）：只评「能直接从存档判断」的条件，其余锁死。
   *  客户端消费端：taskData/groupPoints/achieveIdArr/rd 全来自 getAchieveData 应答
   *  （scripts3.js:2899-2918，2905 `t.tObj = o.taskData`）；达成判定也在服务端
   *  （scripts3.js:3305 checkAchieved = awardIds/receivedIds）→ 进度与达成都不信客户端。
   *  进度键约定（scripts3.js:3055）：`type_type1`（c 键，同条件族共用一个值）与
   *  `type_type1_require`（p 键，逐条进度）。多行不同目标的条件族只写 p 键，
   *  单值条件族写 c 键 —— 客户端先读 c 再落 p，这样两类都能显示进度。
   *
   *  本版可判（≈1545/2113 行）：
   *    ① 收集/持有：type 3 全部 + type 2/3 —— achHeldCount ≥ 目标
   *    ② 已完成任务数：6/1,0（告示牌，s.taskDoneCount）、6/2,0（环任务，s.circleTotal）≥ times
   *    ③ 经验：1/3 —— s.exp ≥ require（"达到过最高经验"用当前值做下界，只紧不松）
   *    ④ 技能等级：1/5（读书识字类）—— s.skills 等级，分支逻辑逐句照抄客户端 3093-3105
   *  其余（有效/综合等级、登录天数、建号天数、无量天机积分/段位、排行榜、时装、房产、
   *  妙手空空、宝物、伙伴结义…）一律不算 —— 宁可锁死也不虚报（红线：客户端传值不能当奖励）。 */
  function recomputeAchievements(s, st) {
    var cond = (typeof BZ_ACHIEVE_COND !== 'undefined') ? BZ_ACHIEVE_COND : null;
    if (!cond) return;
    var exp = (typeof s.exp === 'number') ? s.exp : 0;
    var taskDone = parseInt(s.taskDoneCount, 10) || 0;
    var circleTotal = parseInt(s.circleTotal, 10) || 0;
    st.taskData['1_3'] = exp;              // 同条件族单值：c 键
    st.taskData['6_1,0'] = taskDone;
    st.taskData['6_2,0'] = circleTotal;
    var pending = [];
    for (var key in cond) {
      if (!hasOwn(cond, key)) continue;
      var row = cond[key];
      var id = parseInt(key, 10) || 0;
      if (!(id > 0)) continue;
      var t = row.t, t1 = String(row.t1 || ''), rq = String(row.rq || ''), tm = parseInt(row.tm, 10) || 0;
      var ckey = t + '_' + t1;
      var pkey = ckey + '_' + rq;
      var ok = false, prg = -1;
      if (t === 3 || (t === 2 && t1 === '3')) {
        // ① 收集/持有：require "0|10001,10002" → 列表全持有；"1|…" → 至少 1 个（getPrg 3220 口径）
        var segs = rq.split('|');
        var ids = segs.slice(1).join(',').split(',').map(function (x) { return parseInt(x, 10) || 0; }).filter(function (x) { return x > 0; });
        if (!ids.length) continue;
        var target = (segs[0] === '0') ? ids.length : (parseInt(segs[0], 10) || 0);
        prg = achHeldCount(s, ids);
        ok = prg >= target;
      } else if (t === 1 && t1 === '3') {
        // ③ 经验：require 就是目标值（"江湖经验达到5000"）
        var need = parseInt(rq, 10) || 0;
        prg = exp; ok = exp >= need;
      } else if (t === 1 && t1 === '5') {
        // ④ 技能等级：逐句照抄客户端 getAcheivementPrg1 case 1/5（scripts3.js:3093-3105）
        var segs5 = rq.split('|');
        if (segs5.length <= 2) {
          var C = segs5[1].split(',');
          prg = skillLevelOf(s, C[0]);
          ok = prg >= (parseInt(C[1], 10) || 0);
        } else {
          prg = 0;
          for (var h = 1; h < segs5.length; h++) {
            var C5 = segs5[h].split(',');
            if (skillLevelOf(s, C5[0]) >= (parseInt(C5[1], 10) || 0)) prg++;
          }
          var tgt5 = (segs5[0] === '0') ? segs5.length - 1 : (parseInt(segs5[0], 10) || 0);
          ok = prg >= tgt5;
        }
      } else if (t === 6 && t1 === '1,0') {
        // ② 告示牌任务完成次数：require "0" → 目标取 times（getPrg n<=0 分支）
        prg = taskDone; ok = taskDone >= tm;
      } else if (t === 6 && t1 === '2,0') {
        prg = circleTotal; ok = circleTotal >= tm;
      } else {
        continue;   // 其余类型锁死：不写 taskData、不进 pending
      }
      if (prg > 0) st.taskData[pkey] = prg;      // 逐条进度：p 键（只存非零，防存档膨胀；缺键客户端算 0）
      else if (hasOwn(st.taskData, pkey)) delete st.taskData[pkey];   // 进度回落 → 删键，不留假进度
      if (ok && st.received.indexOf(id) < 0) pending.push(id);
    }
    st.pending = pending;
  }

  /** 婚姻状态槽（第 6 批 C04）。TPL.create.marryObj 是真实抓包快照（24 键），缺槽按它补齐。
   *  只有状态机动作（propose/marry/divorce/makeLove）会写这里；锁定动作一个字节不动。 */
  function marryState(s) {
    if (!s.marryObj || typeof s.marryObj !== 'object') {
      s.marryObj = (TPL.create && TPL.create.marryObj) ? clone(TPL.create.marryObj) : {};
    }
    var m = s.marryObj;
    if (!Array.isArray(m.proposeNpc)) m.proposeNpc = [];
    return m;
  }

  /** childObj 构造（v2.7.1-accept2 拍板：形状由 scoutC 读点穷举推出，限时任务成功）。
   *  每个键都有客户端读点出处（batch6-facts-20261026/scoutC-childdata.md + 主审亲验）：
   *    sex        index.js:101888（prefab 名拼接，数值 0/1）
   *    childName  index.js:24867 `childData.childName.length` —— **必须字符串**，否则 TypeError
   *    age        index.js:24743/24754 算术（gameTime - age）；我方 totalGameTime=0 → 0 即新生儿
   *    fatherLv   index.js:24758 talent 查表入参
   *    foster_point index.js:24640/12948（寄养写点，寄养仍锁）
   *    playArr    index.js:77090 `playArr[t] += e`；scripts2.js:12255 `s=1; s<playArr.length`
   *    baseArr / addArr index.js:77086/77087、scripts2.js:12255/12277
   *    bornTime   index.js:92011 hasOwnProperty（可缺，给 0 无害） */
  function buildChildObj(sex) {
    return {
      sex: (parseInt(sex, 10) === 1) ? 1 : 0,
      childName: '',
      age: 0,
      fatherLv: 0,
      foster_point: 0,
      playArr: [0],
      baseArr: [],
      addArr: [],
      bornTime: 0,
    };
  }

  /** 空经济账本（C06 EndMeditation 用）：五个键贴基线形状；提成 helper 是为了让 handler 体内
   *  只剩应答字面量——gen_shapes 从 handler 字面量重算形状，嵌套字面量会被误当应答（实测踩过）。 */
  function emptyEconomyNote() {
    return { attrch: {}, eco: {}, skch: {}, ivch: {}, eqch: {} };
  }

  /* ============ 第 9 批 C08〔PVE 战斗族〕模块级 helper（2026-10-27）============
   * ⚠ 与既有约定一致：嵌套构造（AttckData / npcArr）放模块级，handler 体内只留应答字面量 ——
   *   gen_shapes 从 handler 字面量重算形状，嵌套字面量会被误当应答（C06 实测踩过）。
   * 取证：batch9-facts-20261027\scoutG-c08-reqkeys.md（九键逐行）＋ C7-c08-取证与策略.md。 */

  /** 解析请求里的整数（`num()` 只认 number，客户端载荷里常是字符串或干脆缺席）。 */
  function asInt(v, d) {
    var n = parseInt(v, 10);
    return isFinite(n) ? n : d;
  }

  /** 我方战斗快照 AttckData（战斗族"开局"动作用）。
   *
   *  契约来源（两条，逐键对得上）：
   *    · `MadUtils.parsePlayerData`（index.js:74919-74971）：把 `baseValueAy[0..50]` 摊成
   *      userAccount/userName/…/hpRemaining/hpLimit/mpRemaining/…/career，**末句 `delete e.baseValueAy`**；
   *    · `MadUtils.createPlayerBattleEntity`（index.js:74766-74914）：随后**无守护**读
   *      `equipments`(74785 for-in) / `equips`(74788) / `skillMap`(74798 for-in) / `WeapToSkill`(74807-74810)
   *      / `gemData`(74784) / `equipTitle`(74886) / `totalGameTime`(74806) / `userName`(74903 decodeURI)，
   *      并把 `e.battleID = t.roleID`(74775) —— 这个 battleID 就是后面 `*_ACTION` 请求里的 `paramID2`。
   *
   *  结构来源：抓包原件 `TPL.reqSelfBattleInfo['User.ReqSelfBattleInfo']` 的内层。探针实测键表 =
   *    eRet, baseValueAy, skillMap, WeapToSkill, equipments, equips, npcArr, npcID, roleID, addAtt,
   *    youngTimes, veinObj, equipTitle, inherit, itemSkill, buffs, weapToSkinData, fashionEffect, wId,
   *    gemData, partnerSkillMap, happinessNum, roleRound, sceneType —— 正好是上面两条要的那套契约。
   *    去皮 `eRet/npcArr/npcID` 后换本档真值：`baseValueAy`（本档）、`roleID`（本档）、
   *    `skillMap`（抓包原件叠本档 `s.skills`：本档升过的等级优先，抓包有而账本没有的保留）。
   *
   *  ⚠ 不换 `equips/equipments/gemData/titivate*`：那些要 `parseEq` 的实例格式，属于"抓包快照装备"，
   *    战斗数值按快照装备算 —— 已在 C7-c08-取证与策略.md §八.3 登记为未验证项。 */
  function buildAttckData(s, opt) {
    opt = opt || {};
    var tpl = (TPL && TPL.reqSelfBattleInfo) ? TPL.reqSelfBattleInfo['User.ReqSelfBattleInfo'] : null;
    var a = tpl ? clone(tpl) : {};
    delete a.eRet;
    delete a.npcArr;
    delete a.npcID;
    // 结构键兜底（createPlayerBattleEntity 是裸读，缺一个就 TypeError）
    if (!a.skillMap || typeof a.skillMap !== 'object') a.skillMap = {};
    if (!a.WeapToSkill || typeof a.WeapToSkill !== 'object') a.WeapToSkill = {};
    if (!a.equipments || typeof a.equipments !== 'object') a.equipments = {};
    if (!a.equips || typeof a.equips !== 'object') a.equips = {};
    if (!a.gemData || typeof a.gemData !== 'object') a.gemData = {};
    if (!hasOwn(a, 'equipTitle')) a.equipTitle = 0;
    // 本档技能等级叠加（与 LoadGame 里 base.skillMap 的拼法同一套）
    if (s && s.skills && typeof s.skills === 'object') {
      for (var sk in s.skills) {
        if (!hasOwn(s.skills, sk)) continue;
        var lv = s.skills[sk];
        a.skillMap[sk] = Array.isArray(lv) ? lv : [Math.max(1, lv | 0), 0, 1];
      }
    }
    var ay = normalizeBaseValueAy((s && s.baseValueAy) ? clone(s.baseValueAy) : null);
    // ⚠ 这里**不**采信请求里的 mp/gTime/hgtimes：baseValueAy 是属性载体（[41]=死亡次数就靠它守），
    //   请求值一律不进（`test\r18-unreachable.js` T6 的白名单也只放"从存档派生"这一种写法）。
    //   肉鸽那三个战场内数值走 `AttckData.rogueHp/rogueHpLimit/rogueMp` 单独键（见下），不碰这个数组。
    a.baseValueAy = ay;
    a.roleID = (s && s.roleID) ? s.roleID : (a.roleID || 0);
    // ── Q2（上游 2026-10-27 拍板：选①维持快照 **+ 可选反推 parseEq**；反推已成功，故接本档装备）──
    // 依据 `batch9-facts-20261027\scoutL-parseeq.md`（读点闭合，无猜测）：
    //   `createPlayerBattleEntity` 里 `for (var o in t.equipments) { var i = t.equipments[o]; var a = t.equips[i];
    //     a ? n = c.parseEq(i, a) : t.tempEquips && … }`（index.js:74785-74795），其中 `c` = `battlesystem/ItemUtils`
    //   （index.js:74624），它的 `parseEq`（index.js:66282-66305）逐位读第二参数：
    //     `e[0]`=type ｜ type==1 → `e[1]`=数量、`e[2]`=weaponSkinId ｜ 否则 `e[1]`=itemID、`e[2]`=attrs（attrs[19] 另有读点）
    //     ｜`e[3]`=crystalIds ｜`e[4]`=weaponSkinId ｜`!e` → `{itemID:uid, num:1}`
    //   我方存档**本来就是同一形状**：`s.playerEquip[uid] = [1, 数量]`（grantItem，本文件 926-937）、`s.equipments[槽位] = uid`
    //   → 直接搬过去即可，不需要任何转换。⚠ 不再用抓包快照（以前打的时候穿的是原账号那套）。
    //   `inherit` 客户端有 `t.inherit &&` 守卫（74791），我们不带，走 else 分支给 0。
    if (s && s.playerEquip && typeof s.playerEquip === 'object') a.equips = clone(s.playerEquip);
    if (s && s.equipments && typeof s.equipments === 'object') a.equipments = clone(s.equipments);
    if (opt.rogueHp !== undefined) a.rogueHp = opt.rogueHp;                 // 74899
    if (opt.rogueHpLimit !== undefined) a.rogueHpLimit = opt.rogueHpLimit;  // 74898
    if (opt.rogueMp !== undefined) a.rogueMp = opt.rogueMp;                 // 74900
    return a;
  }

  /** 敌方 26 项 npcArr：`BZ_NPCARR[npcID]`（3658 只可战斗 npc，来源 tools/cfg/npc_stats.json）。
   *  同一张表已有消费者 `ReqSelfBattleInfo`（本文件那处 `BZ_NPCARR[String(npc)]`），口径一致。 */
  function buildNpcArr(npcID) {
    var id = String(parseInt(npcID, 10) || 0);
    if (typeof BZ_NPCARR === 'undefined' || !BZ_NPCARR) return [];
    var A = BZ_NPCARR[id];
    return A ? clone(A) : [];
  }

  /** 战斗族"查不到这只怪"时的兜底 npcID。
   *  为什么需要：客户端 `generateNpcData(npcArr, npcID)`（index.js:8093-8137）是**裸读**——
   *    `t[14]`→`o.jineng`，紧接着 8118 `u.getItem(o.jineng[0], "skill")`：
   *    只要 npcArr 是空数组，`o.jineng = undefined`，这一句直接 TypeError → 战斗界面崩。
   *    `u.getItem(0, "npc")` 也会在 8097 取 `.NpcName` 时炸（npcID 不在 npc 表里）。
   *  所以宁可回一只**真实存在**的默认怪（310003：形状表默认值，npc_stats 里有 22 项），
   *  也不回 npcID=0 + 空数组。命中兜底会大声记日志，并在回执里申报。 */
  var BATTLE_FALLBACK_NPC = 310003;

  /** 开局用的 (npcID, npcArr)：查表命中就照客户端报的给，否则退回兜底怪。 */
  function pickBattleNpc(rawNpcID, action) {
    var npc = asInt(rawNpcID, 0);
    var arr = buildNpcArr(npc);
    if (npc > 0 && arr.length) return { npcID: npc, npcArr: arr, fallback: false };
    var fb = buildNpcArr(BATTLE_FALLBACK_NPC);
    env.log('⚠ ' + action + ' 请求 npcID=' + rawNpcID + ' 不在 npc_stats 里（或为 0）→ 退回兜底怪 '
      + BATTLE_FALLBACK_NPC + '（' + fb.length + ' 项）。客户端 generateNpcData 对空 npcArr 会 TypeError（index.js:8118）');
    return { npcID: BATTLE_FALLBACK_NPC, npcArr: fb, fallback: true };
  }

  /** 战斗随机种子：每场不同（同种子会让客户端 RNG 每局完全一样）。
   *  ⚠ 只喂客户端本地战斗动画/随机，不参与任何奖励判定。 */
  function battleSeed() {
    var t = env.now() & 0x7fffffff;
    return t || 1;
  }

  /* ============ 第 10 批 C09〔技巧摸奖〕模块级 helper（2026-10-27）============
   * 表：`BZ_KNACK_LOTTERY`（tools\gen_c09_tables.js 生成，18.9 KB：券/价格/品质权重/230 行掉落/230 组口诀）。
   * 口径（用户 2026-10-27 拍板"两表分工"）：先按 `drop_probability` 抽组，再按机器表 `probability` 抽品质。
   * 取证：batch10-facts-20261027\{scoutJ,scoutK,scoutM}；策略见 C9-c09-取证与策略.md。 */

  function knackTables() {
    return (typeof BZ_KNACK_LOTTERY !== 'undefined' && BZ_KNACK_LOTTERY) ? BZ_KNACK_LOTTERY : null;
  }

  /** 口诀存档槽 `s.skillGrasp`（TPL.create 里本来就有这四个键：skillGrasp / knackBag / skillGraspHistory / achievementReward）。
   *  `knackBag` = 抽到但没装上的口诀 id；`skillGrasp[skillId]` = 该技能装了哪几个口诀。
   *  ⚠ 只在"要写"的路径上调（handler 过了闸门之后），拒绝路径不许调 —— 与 marryState 那个坑同一个道理。 */
  function knackSlot(s) {
    if (!s.skillGrasp || typeof s.skillGrasp !== 'object') s.skillGrasp = {};
    var g = s.skillGrasp;
    if (!Array.isArray(g.knackBag)) g.knackBag = [];
    if (!g.skillGrasp || typeof g.skillGrasp !== 'object') g.skillGrasp = {};
    return g;
  }

  /** 今日免费抽奖剩余次数（机台表 `free_day=1`）。跨天未落盘时视为满额。 */
  function knackFreeLeft(s) {
    var D = knackTables();
    var free = D ? (D.machine.freeDay | 0) : 0;
    if (free <= 0) return 0;
    if (!s.knackFree || s.knackFree.d !== todayKey()) return free;
    return Math.max(0, free - (parseInt(s.knackFree.n, 10) | 0));
  }

  /** 一次摸奖：① 按 drop_probability 在 230 行上抽一行（得 drop_group）→
   *  ② 按机台 `probability`（1:640 2:200 3:100 4:40 5:20）抽品质 → ③ 组×品质 = knackId。
   *  ⚠ 这两列客户端**都没有读取点**，分工是"表结构 + 用户拍板"，回执已申报。 */
  function knackRollOnce() {
    var D = knackTables();
    if (!D) return 0;
    var i, acc = 0;
    for (i = 0; i < D.drops.length; i++) acc += D.drops[i][2];
    if (!(acc > 0)) return 0;
    var r = rnd() * acc, row = D.drops[D.drops.length - 1];
    for (i = 0; i < D.drops.length; i++) { r -= D.drops[i][2]; if (r <= 0) { row = D.drops[i]; break; } }
    var w = D.machine.qualityWeight, q, qs = 0;
    for (q in w) if (hasOwn(w, q)) qs += w[q];
    var pick = 1;
    if (qs > 0) {
      var r2 = rnd() * qs;
      for (q in w) { if (!hasOwn(w, q)) continue; r2 -= w[q]; if (r2 <= 0) { pick = parseInt(q, 10); break; } }
    }
    var g = D.knack[String(row[0])];
    if (!g) return 0;
    return g[String(pick)] || g['1'] || 0;
  }

  /** 口诀装配的共享实现（`changeSkillKnack` 与 `rgChangeSkillKnack` 同一套账本）。
   *  客户端回调读 `knackBag`（81081/81105 有守卫）与 `skillGraspData`（**81084 / 74000 无守卫**）→ 两个都得给。 */
  function applyChangeKnack(p, actName) {
    p = p || {};
    var s = ensureLedger(loadSave());
    var g = knackSlot(s);
    var sid = asInt(p.skillId, 0);
    var ids = Array.isArray(p.knackIds) ? p.knackIds : [];
    var old = Array.isArray(g.skillGrasp[String(sid)]) ? g.skillGrasp[String(sid)] : [];
    var want = [];
    for (var i = 0; i < ids.length; i++) {
      var kid = asInt(ids[i], 0);
      // 允许两种来源：背包里有，或**本来就装在这个技能上**（这样"同一批再装一次"是幂等的，不会 2）
      if (kid > 0 && (g.knackBag.indexOf(kid) >= 0 || old.indexOf(kid) >= 0) && want.indexOf(kid) < 0) want.push(kid);
    }
    if (sid <= 0 || !want.length) {
      noteReject(actName, 'invalid', 'skillId=' + p.skillId + ' knackIds=' + JSON.stringify(ids));
      return shaped(actName, { eRet: 2 }) || wrapped(actName, { eRet: 2 }, { achievement: ach() });
    }
    // 该技能原来的口诀先退回背包，再装新的（同一批重复装不会重复入包）
    for (var o = 0; o < old.length; o++) if (g.knackBag.indexOf(old[o]) < 0) g.knackBag.push(old[o]);
    g.skillGrasp[String(sid)] = want;
    for (var w = 0; w < want.length; w++) {
      var at = g.knackBag.indexOf(want[w]);
      if (at >= 0) g.knackBag.splice(at, 1);
    }
    persist();
    var v = { eRet: 1, knackBag: clone(g.knackBag), skillGraspData: clone(g.skillGrasp) };
    env.log(actName + ' skill=' + sid + ' 装 ' + want.join(',') + ' 背包余 ' + g.knackBag.length);
    return shaped(actName, v) || wrapped(actName, v, { achievement: ach() });
  }

  /* ============ 第 11 批 C10〔农作物〕模块级 helper（2026-10-27）============
   * 表：`BZ_PLANT`（tools\gen_c10_tables.js 生成：53 作物 × 阶段秒数/产物/加速、4 家事件、details、等级经验）
   * 口径（用户 2026-10-27 拍板）：真实计时 + 加速免费；收获按状态取产物；事件本批不随机刷。
   * 契约（主审探针 + 三个工人对撞，见 batch11-facts-20261027\C10-c10-取证与策略.md §四）：
   *   · `LandUI`(scripts2.js:37636-37810) 逐字段读 soilArr[i].s / m.id / m.s / m.t / m.pt / m.c / m.eid / m.et / m.at / m.b
   *   · `PlantSystemMgr`(index.js:95563-95702) 自己算进度：阶段秒数表 [0:0,1:seedtime,…,7:hundred]、
   *     bgTime = m.t + 之前各阶段累计 + m.pt、进度 = now - bgTime + m.c×details[2].num
   *   → 服务端只要把 `m.id / m.s / m.t / m.c` 摆对，倒计时与进度条全由客户端画。 */

  function plantTables() {
    return (typeof BZ_PLANT !== 'undefined' && BZ_PLANT) ? BZ_PLANT : null;
  }
  function plantCrop(seedId) {
    var D = plantTables();
    if (!D) return null;
    return D.crops[String(parseInt(seedId, 10) | 0)] || null;
  }
  function plantLandCount() {
    var D = plantTables();
    return (D && D.lands > 0) ? D.lands : 4;      // 客户端 getHomeLands() 缺省 4（index.js:58333-58337）
  }
  /** 写路径专用：建/补齐 `s.plant`。⚠ 拒绝路径一律不调（会把档弄脏，同 marryState/knackSlot 的坑）。 */
  function plantSlot(s) {
    var n = plantLandCount(), i;
    if (!s.plant || typeof s.plant !== 'object') s.plant = {};
    var P = s.plant;
    if (!Array.isArray(P.lands)) P.lands = [];
    while (P.lands.length < n) P.lands.push({ s: 1 });
    if (P.lands.length > n) P.lands.length = n;
    for (i = 0; i < P.lands.length; i++) {
      var L = P.lands[i];
      if (!L || typeof L !== 'object') L = P.lands[i] = { s: 1 };
      if (L.s !== 1) L.s = 1;                    // s=1 = 已开垦（RECLAIM_LAND 未做，本批全部预开垦）
      if (L.m && typeof L.m !== 'object') delete L.m;
    }
    if (typeof P.exp !== 'number' || isNaN(P.exp)) P.exp = 0;
    if (!Array.isArray(P.recentSeeds)) P.recentSeeds = [];
    return P;
  }
  /** 只读路径：不改档（从没种过地就回 null） */
  function plantRead(s) {
    var P = s && s.plant;
    if (!P || typeof P !== 'object' || !Array.isArray(P.lands)) return null;
    return P;
  }
  function plantBoostSec(m) {
    var D = plantTables();
    var per = (D && D.boost && D.boost.seconds) ? D.boost.seconds : 0;
    return per * (parseInt(m && m.c, 10) || 0);
  }
  /** 服务端权威阶段（0 空地 / 1..7）。
   *  ⚠ **折让 10% 是刻意的，不是漏乘**：客户端在 `curHomeScene ∈ crop.speed` 时把阶段时长 ×(1-effect)
   *    （index.js:95586、95682-95684）。服务端不知道当前场景，若按原始时长算就会**比客户端慢** ——
   *    客户端进度条到 100% 发 `changeSate` 却等不到推进，而 `isRefresh` 已置真、本次进面板不会再发
   *    （scripts2.js:37712-37718）→ 作物就永久卡在 100%。按 (1-effect) 判 = 早 10% 成熟，安全侧偏置。 */
  function plantStateAt(m, nowSec) {
    var c = plantCrop(m && m.id);
    if (!c) return 0;
    var el = (nowSec - (parseInt(m.t, 10) || 0)) + plantBoostSec(m);
    if (!(el > 0)) return 1;
    var acc = 0, disc = 1 - (Number(c.effect) || 0);
    if (!(disc > 0.1)) disc = 1;
    for (var st = 1; st <= 7; st++) {
      var need = parseInt(c.st[st - 1], 10) || 0;
      if (!(need > 0)) return st > 1 ? st - 1 : 1;   // 该作物没有这一阶段（表里 hundred 常为 0）→ 停在上一阶段
      acc += need * disc;
      if (el < acc) return st;
    }
    return 7;
  }
  function plantNowSec() { return Math.floor(env.now() / 1000); }
  /** 按 now 刷新该地块作物阶段（写回 m.s），返回新阶段；无作物回 0 */
  function plantRefreshLand(land, nowSec) {
    if (!land || !land.m) return 0;
    var st = plantStateAt(land.m, nowSec);
    land.m.s = st;
    return st;
  }
  /** 该阶段能收的产物 [itemId, num]；收不了回 null */
  function plantHarvestOf(m, st) {
    var c = plantCrop(m && m.id);
    if (!c) return null;
    var o = c.out[String(st)];
    return (o && o[0] > 0 && o[1] > 0) ? o : null;
  }
  function plantSeedHave(s, seedId) {
    return parseInt((s.bag || {})[String(parseInt(seedId, 10) | 0)], 10) || 0;
  }
  /** 家园种子商店货架（BZ_PLANT.shop：`[{id, price}]`，价格取 item.Price，拍板平价） */
  function plantShopRows() {
    var D = plantTables();
    return (D && D.shop && Array.isArray(D.shop.rows)) ? D.shop.rows : [];
  }
  function plantShopPrice(id) {
    var rows = plantShopRows(), iid = parseInt(id, 10) | 0;
    for (var i = 0; i < rows.length; i++) if (rows[i].id === iid) return rows[i].price | 0;
    return 0;
  }
  /** 发产物 + 写 note（观察守卫要求"能解释的差额"：绝对值写进 ivch/eqch，同 C09 摸奖券那条） */
  function plantGive(s, itemId, num, note) {
    var iid = parseInt(itemId, 10) | 0;
    grantItem(s, iid, num);
    if (itemTypeOf(iid) === 1) {
      var pe = s.playerEquip[String(iid)];
      note.eqch[String(iid)] = Array.isArray(pe) ? [1, [1, parseInt(pe[1], 10) || 0]] : [0];
    } else {
      note.ivch[String(iid)] = parseInt((s.bag || {})[String(iid)], 10) || 0;
    }
    env.log('C10 收获 item=' + iid + ' +' + num + ' → 现 '
      + (itemTypeOf(iid) === 1 ? JSON.stringify(s.playerEquip[String(iid)]) : note.ivch[String(iid)]));
  }

  /** ── C11〔周年通行证〕存档助手（helper 必须在 `var H = {` 之前，见 1603 的坑）──
   *  字段契约 = 客户端 AnniversaryModel 构造器（scripts3.js:7806-7815，数组/对象它自己会预初始化，
   *  崩点全在回包载荷：anniversaryPassData / endtime / giftDatas / dt / rewardArray 全裸读）：
   *    n=活跃度  vip=0|1  rd/vrd/dt=行 id 数组（数字）  td/dv=进度对象  endT=毫秒  giftBuys={礼包id:已购数} */
  function annRead(s) {
    return (s && s.annPass && typeof s.annPass === 'object') ? s.annPass : null;
  }
  /** 写路径专用：建/补齐 s.annPass。⚠ 拒绝路径一律不调（会把档弄脏，同 plantSlot / knackSlot 的坑）。 */
  function annEnsure(s) {
    if (!s.annPass || typeof s.annPass !== 'object') s.annPass = {};
    var P = s.annPass;
    if (!Array.isArray(P.rd)) P.rd = [];
    if (!Array.isArray(P.vrd)) P.vrd = [];
    if (!Array.isArray(P.dt)) P.dt = [];
    if (!P.td || typeof P.td !== 'object') P.td = {};
    if (!P.dv || typeof P.dv !== 'object') P.dv = {};
    if (!P.giftBuys || typeof P.giftBuys !== 'object') P.giftBuys = {};
    if (typeof P.n !== 'number') P.n = 0;
    if (typeof P.vip !== 'number') P.vip = 0;
    if (!(parseInt(P.endT, 10) > 0)) P.endT = 0;
    return P;
  }
  /** 下发形状：客户端 7821-7828 对七字段全裸读 → 类型是硬约束（rd/vrd/dt 数组、td/dv 对象）。 */
  function annDataOf(P) {
    return {
      n: parseInt(P.n, 10) || 0,
      vip: parseInt(P.vip, 10) || 0,
      rd: (Array.isArray(P.rd) ? P.rd : []).slice(),
      vrd: (Array.isArray(P.vrd) ? P.vrd : []).slice(),
      dt: (Array.isArray(P.dt) ? P.dt : []).slice(),
      td: clone(P.td || {}),
      dv: clone(P.dv || {}),
    };
  }
  /** C11 表守卫：生成模块没接进来时回 null（动作一律走拒绝，绝不用 undefined 表算账）。 */
  function annTable() {
    return (typeof BZ_C11 !== 'undefined' && BZ_C11 && BZ_C11.award && BZ_C11.gift && BZ_C11.task) ? BZ_C11 : null;
  }

  /** ── C12〔管家/帮手〕存档助手（helper 必须在 `var H = {` 之前，见 1603 的坑）──
   *  字段契约 = 客户端 testFunc 夹具（scripts3.js:23578-23606）与 templates.json create.housekeeper 双源互证：
   *  22 字段全量下发；**时间戳全毫秒**（客户端 getSTimestamp() 同为毫秒，98550 直接比较）；
   *  回调裸读字段：helperId(23156) / helperIdArr(23164) / dueTime(23191,23179) / noticeArr+noticeRtm(23137) /
   *  note.eco.yuanbao(23125，BUTLER_DISPATCH 成功分支必带)。 */
  function hkTable() {
    return (typeof BZ_C12 !== 'undefined' && BZ_C12 && BZ_C12.helper) ? BZ_C12 : null;
  }
  /** 读路径：不写档。 */
  function hkRead(s) {
    return (s && s.housekeeper && typeof s.housekeeper === 'object') ? s.housekeeper : null;
  }
  /** 写路径专用：建/补齐 s.housekeeper（⚠ 拒绝路径一律不调）。undefined 才补默认；null 是合法值（create 模板如此）不许覆盖。 */
  function hkEnsure(s) {
    if (!s.housekeeper || typeof s.housekeeper !== 'object') s.housekeeper = {};
    var P = s.housekeeper;
    var nowMs = env.now();
    var needNum = function (v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; };
    if (P.helperId === undefined) P.helperId = 1;
    if (typeof P.helperId !== 'number') P.helperId = needNum(parseInt(P.helperId, 10), 1);
    if (P.dueTime === undefined) P.dueTime = null;                       // null = 无月卡（客户端 98550 falsy 判过期）
    if (!P.task || typeof P.task !== 'object') P.task = {};
    if (!Array.isArray(P.taskArr)) P.taskArr = [];
    if (!Array.isArray(P.noticeArr)) P.noticeArr = [];
    if (P.noticeIndex === undefined) P.noticeIndex = -1;
    if (P.template === undefined) P.template = null;
    if (P.dispatchTime === undefined) P.dispatchTime = null;
    if (P.dispatchEndTime === undefined) P.dispatchEndTime = null;
    if (P.autoTime === undefined) P.autoTime = -1;
    if (P.evaluateType === undefined) P.evaluateType = 1;
    if (P.type === undefined) P.type = -1;
    if (P.taskRtm === undefined) P.taskRtm = nowMs;
    if (P.noticeRtm === undefined) P.noticeRtm = null;
    if (!P.taskNum || typeof P.taskNum !== 'object') P.taskNum = {};
    if (P.mapId === undefined) P.mapId = 0;
    if (P.templateInitTime === undefined) P.templateInitTime = 0;
    if (!P.templateTask || typeof P.templateTask !== 'object') P.templateTask = {};
    if (!Array.isArray(P.matureArr)) P.matureArr = [];
    if (!Array.isArray(P.helperIdArr)) P.helperIdArr = [];
    if (!Array.isArray(P.helperRewardArr)) P.helperRewardArr = [];
    if (P.e === undefined) P.e = 0;
    if (!P.tgd || typeof P.tgd !== 'object') P.tgd = {};
    if (P.curTime === undefined) P.curTime = nowMs;
    if (P.canNoticeNum === undefined) P.canNoticeNum = 13;
    return P;
  }
  /** 下发：整段深拷贝（客户端 delegateUI.setData(o) 整包消费）。 */
  function hkDataOf(P) { return clone(P); }
  /** 拥有判定：免费管家（price<=0）人人可用；付费的看 helperIdArr（客户端 checkBought 23550 同口径）。 */
  function hkOwned(T, id, P) {
    var row = T.helper[String(id)];
    if (!row) return false;
    if (row.price <= 0) return true;
    return !!(P && Array.isArray(P.helperIdArr) && P.helperIdArr.indexOf(id) >= 0);
  }

  /** ── C13〔UFO 夹娃娃〕存档助手（helper 必须在 `var H = {` 之前，见 1603 的坑）──
   *  字段契约 = 客户端 DollModel 构造器（scripts3.js:25715-25725）+ rewardPool（initItems 25824-25847：
   *  键 = package_difficulty 行 id，值 = 数量）。★本批全部回包字段有 hasOwnProperty 守卫（崩点趋零）。
   *  拍板（2026-10-27）：跳过 3 死键；抓取服务端权威；照扣爪子；活动常开；signCode 验存在。 */
  function dlTable() {
    return (typeof BZ_C13 !== 'undefined' && BZ_C13 && BZ_C13.difficulty && BZ_C13.poolComposition) ? BZ_C13 : null;
  }
  function dlRead(s) {
    return (s && s.doll && typeof s.doll === 'object') ? s.doll : null;
  }
  /** 写路径专用：建/补齐 s.doll（⚠ 拒绝路径一律不调）。★顺带确保 s.bag 存在——首开赠送走
   *  grantRewardList→bagAdd，而模板新档/loadSave 某些路径下 s.bag 可能缺位（真机 sweep 实证
   *  `Cannot read properties of undefined (reading '8117')`，2026-10-27）。 */
  function dlEnsure(s) {
    if (!s.bag || typeof s.bag !== 'object') s.bag = {};
    if (!s.doll || typeof s.doll !== 'object') s.doll = {};
    var P = s.doll;
    if (!P.rewardPool || typeof P.rewardPool !== 'object') P.rewardPool = {};
    if (typeof P.refreshTimes !== 'number') P.refreshTimes = 0;
    if (typeof P.freeRefreshTimes !== 'number') P.freeRefreshTimes = 0;
    if (typeof P.buyRefreshTimes !== 'number') P.buyRefreshTimes = 0;
    if (typeof P.buyCoinCount !== 'number') P.buyCoinCount = 0;
    if (typeof P.signId !== 'number') P.signId = 1;
    return P;
  }
  /** 生成新池子（确定性：POOL_COMPOSITION 克隆——sweep 固定时钟下形状稳定，随机只在抓取判中时用）。 */
  function dlGenPool(T) {
    var pool = {};
    for (var k in T.poolComposition) if (T.poolComposition.hasOwnProperty(k)) pool[k] = T.poolComposition[k];
    return pool;
  }
  /** 池子剩余总数。 */
  function dlPoolCount(pool) {
    var n = 0;
    for (var k in pool) if (pool.hasOwnProperty(k)) n += (parseInt(pool[k], 10) || 0);
    return n;
  }

  /** ── C14〔斗狗〕存档助手（2026-10-27 档 A；helper 必须在 `var H = {` 之前）──
   *  BZ_C14 由 tools/gen_c14_tables.js 生成：feedItem=狗粮 6285、feedPer=const129=100、
   *  feedCap=const128=10000、dogSmall=11193、dogBig=11194（来源 cfg dump，见生成脚本注释）。
   *  存档 `s.dog = {id, p}`（写路径 dogEnsure）；对客户端视图 = {id, s, t, p, n}：
   *    s=0 + t=0 → getDogCurState() 真（0==s && t<now，index.js:58364-58367）= 狗健康可交互；
   *    s=0/t=0 是"无恢复期"态；n=0 为 heal UI 参数占位（不可达路径）。
   *  ★好友家（enterOtherHome）未实现 + stealCrop 档 A 锁 → 狗战路径当前不可达（ISSUE-8 同族挂账）。 */
  function dogTable() {
    return (typeof BZ_C14 !== 'undefined' && BZ_C14 && BZ_C14.feedItem > 0 && BZ_C14.feedCap > 0 && BZ_C14.feedPer > 0) ? BZ_C14 : null;
  }
  function dogRead(s) {
    var d = s && s.dog;
    if (!d || typeof d !== 'object' || !(parseInt(d.id, 10) > 0)) return null;
    return d;
  }
  /** 客户端视图（只读，不改档）。dog:0 的旧语义 = 无狗，BZ_C14 缺失时 getHomeList 回 0。 */
  function dogView(s) {
    var d = dogRead(s);
    if (!d) return 0;
    return { id: parseInt(d.id, 10) || 0, s: 0, t: 0, p: parseInt(d.p, 10) || 0, n: 0 };
  }

  /** ── C15〔七日回归〕存档助手（2026-10-27 档 A；helper 必须在 `var H = {` 之前）──
   *  BZ_C15 由 tools/gen_c15_tables.js 生成：durationDays=const360=14 / 七日奖励 7 档 /
   *  任务 11（Return_Daily）/ 活跃度 5 档（Return_Award）/ 付费礼包 3 档（Return_store）。
   *  存档 `s.retAct = { trigger: ms, claimed: {day:1} }`（写路径 rtEnsure）。
   *  客户端契约（scripts3.js:63559-63626 ReturnModel + 63367-63450 ReturnDayItem）：
   *    sevenDaysArr = 状态数组（长度=已过天数封顶 7；元素 1=可领 2=已领）；triggerTime=回归起点 ms。
   *  ★档 A（用户拍板）：唯一产出 = 七日奖励（每天一次、7 份封顶）；任务/活跃度诚实空态；
   *   礼包纯展示（isBuy=0 → 按钮禁用）→ 防刷天然合规（计时循环有每日上限）。 */
  function rtTable() {
    return (typeof BZ_C15 !== 'undefined' && BZ_C15 && BZ_C15.durationDays > 0 && BZ_C15.sevenDay) ? BZ_C15 : null;
  }
  function rtRead(s) {
    var r = s && s.retAct;
    if (!r || typeof r !== 'object') return null;
    return r;
  }
  /** 写路径专用：建/补齐 s.retAct（⚠ 拒绝路径不调）。 */
  function rtEnsure(s) {
    if (!s.retAct || typeof s.retAct !== 'object') s.retAct = { trigger: env.now(), claimed: {} };
    var R = s.retAct;
    if (typeof R.trigger !== 'number' || R.trigger <= 0) R.trigger = env.now();
    if (!R.claimed || typeof R.claimed !== 'object') R.claimed = {};
    return R;
  }
  /** 已过天数（1..7 封顶） */
  function rtDays(R) {
    var el = Math.floor((env.now() - R.trigger) / 86400000) + 1;
    if (el < 1) el = 1;
    if (el > 7) el = 7;
    return el;
  }
  /** sevenDaysArr：长度=已过天数；元素 1=可领（当天未领）/ 2=已领 */
  function rtSevenArr(R) {
    var d = rtDays(R), arr = [], i, day;
    for (i = 0; i < d; i++) {
      day = i + 1;
      arr.push(R.claimed[day] ? 2 : (day === d ? 1 : 2));
    }
    return arr;
  }

  /** ── C19〔技能皮肤商店〕存档助手（2026-10-27 A 轮第 1 批）──
   *  BZ_C19 由 tools/gen_c19_tables.js 生成：35 货架行 / 39 皮肤 / type=2 直售 13 行（item∈skillskin 已校验）。
   *  存档 `s.skinShop = {bought:{行id:1}, lastRefresh:0}`；皮肤 `s.skinData = {皮肤id:1}`；
   *  装备映射 `s.skinWeap = {skillId: 皮肤id}`。
   *  客户端：scripts3.js SkinModel 82783-83011（shopData.ds={行id:已购数}、price/freeTime）；
   *  LoadGame 回包带 skillSkinData{skinData,weapToSkinData}（index.js:111859）。
   *  口径（默认拍板第 1/2/9/10/12 条）：price 照表按元宝；活动常开（30 天续期）；
   *    每货架行限购 1（模型 maxBuyNum=1）；刷新 20 元宝/次（自定申报）。 */
  function skTable() {
    return (typeof BZ_C19 !== 'undefined' && BZ_C19 && BZ_C19.shop && BZ_C19.skins) ? BZ_C19 : null;
  }
  function skShop(s) {
    if (!s.skinShop || typeof s.skinShop !== 'object') s.skinShop = {};
    var P = s.skinShop;
    if (!P.bought || typeof P.bought !== 'object') P.bought = {};
    if (typeof P.lastRefresh !== 'number') P.lastRefresh = 0;
    return P;
  }
  function skData(s) {
    if (!s.skinData || typeof s.skinData !== 'object') s.skinData = {};
    return s.skinData;
  }
  function skWeap(s) {
    if (!s.skinWeap || typeof s.skinWeap !== 'object') s.skinWeap = {};
    return s.skinWeap;
  }
  /** 货架视图 {行id: 已购数}（按 type 过滤） */
  function skShopDs(T, P, type) {
    var ds = {}, id, r;
    for (id in T.shop) if (T.shop.hasOwnProperty(id)) {
      r = T.shop[id];
      if (r.type !== type) continue;
      ds[id] = P.bought[id] ? 1 : 0;
    }
    return ds;
  }

  var H = {
    /** 入口/分发层 */
    GetServerList: function () {
      // 原样回放真实服务器列表（结构保真；URL 无所谓——XHR 已全部被环回拦截）
      return clone(TPL.getServerList);
    },
    ChooseServer: function () { return ack('ChooseServer'); },
    TellAction: function () { return ack('TellAction', { achievement: ach() }); },

    /** 账号层（扁平结构） */
    quicklogin: function (p) {
      var s = loadSave();
      var r = clone(TPL.quicklogin);
      r.roleID = s.roleID;
      r.account = p.account || r.account;
      r.serverTime = env.now();
      // 有档时告诉客户端「已有角色」→ 客户端转而请求 User.LoadGame（实测确认，见 index.jsc:70502）
      if (s.name && env.hintHasRole !== false) {
        r.userName = s.name;
        r.saveTime = s.createdAt || (r.saveTime || env.now());
        r.loginFlag = 1;
      }
      return r;
    },
    CheckName: function () { return { eRet: 1 }; },

    /** 建角（扁平 + 全量快照模板） */
    Create: function (p) {
      var s = loadSave();
      var r = clone(TPL.create);
      var tplCaptureTime = num(r.serverTime, 0);
      r.serverTime = env.now();
      rebaseActivityWindows(r, tplCaptureTime, r.serverTime);   // 活动窗口平移（R17 时间炸弹）
      if (p.baseValueAy) {
        r.baseValueAy = p.baseValueAy;
        s.name = String(p.baseValueAy[1] || '少侠');
      }
      if (p.userName) s.name = String(p.userName);
      r.roleID = s.roleID;
      s.baseValueAy = normalizeBaseValueAy(r.baseValueAy);
      // ★ SOTA R19 反例 3 / Q3① U2：建角请求里的 `baseValueAy` 是**客户端上报**的数组（本行上一句就整包吃了）。
      //   [41] = 死亡次数（`index.js:70987 t.push(RoleBaseInfo.numDeaths)` 的上传路径同源），
      //   一旦采信，客户端就能把 numDeaths 写进存档 ⇒ 3020（Effect 15）从 unreachable 变可达，
      //   而我们的 3020 处置是"照扣无效果"。死亡次数只能由服务端产生：这里强制归零。
      //   白名单约定（`test\r18-unreachable.js` T5 会扫）：全仓**只允许 Create 这一处**整包接收请求数组，
      //   且接收后必须把 [41] 归零；新增任何整包接收位点一律判红。
      s.baseValueAy[41] = 0;
      // 回包也用同一份（`[41]` 已归零）：否则 Create 应答会把客户端的死亡次数原样带回，
      //   客户端 `70454 I.RoleBaseInfo.numDeaths = e.baseValueAy[41]` 就采信了它（U1 断言要求"带 baseValueAy 的应答必须 [41]===0"）。
      r.baseValueAy = normalizeBaseValueAy(s.baseValueAy);
      if (typeof s.potential !== 'number') s.potential = 99999;
      if (typeof s.coins !== 'number') s.coins = 99999;
      if (!s.skills) s.skills = {};
      s.school = p.school || 0;
      persist();
      return r;
    },

    /** 有档进入：客户端 loadGame(e) 需要完整角色快照 + e.OnhookObj.serverTime
     *  （依据 assets/scripts/index.jsc:70502，已解密） */
    LoadGame: function () {
      var s = loadSave();
      var base = s.roleSnapshot ? clone(s.roleSnapshot) : clone(TPL.create);
      base.roleID = s.roleID || base.roleID;
      if (s.baseValueAy) base.baseValueAy = normalizeBaseValueAy(clone(s.baseValueAy));
      if (s.name && base.baseValueAy) base.baseValueAy[1] = s.name;
      // 资源给足：baseValueAy[34]=潜能 [35]=银两（index.jsc:74955-74956）
      // 资源与技能都从账本回放（这是"回弹"的根治点）
      if (base.baseValueAy) {
        base.baseValueAy[34] = (typeof s.potential === 'number') ? s.potential : 99999;
        base.baseValueAy[35] = (typeof s.coins === 'number') ? s.coins : 99999;
        // v2.7.1 拍板 1：经验投射回 [18]（客户端 index.js:111775 `RoleBaseInfo.exp = t.baseValueAy[18]`）
        base.baseValueAy[18] = (typeof s.exp === 'number') ? s.exp : 0;
      }
      // 第 6 批 C04：婚姻状态回放（propose/marry/divorce 等写的是 s.marryObj，不投射客户端永远看初始态）
      if (s.marryObj && typeof s.marryObj === 'object') base.marryObj = s.marryObj;
      if (s.skills && Object.keys(s.skills).length) {
        var sm = {};
        for (var sk in s.skills) {
          if (!s.skills.hasOwnProperty(sk)) continue;
          var v = s.skills[sk];
          sm[sk] = Array.isArray(v) ? v : [Math.max(1, v | 0), 0, 1];
        }
        base.skillMap = sm;
      }
      // 金条（货币 id 1）：面板 GoldLabel 绑的是 RoleBaseInfo.gold（scripts2.js:49725），
      // 唯一正规来源是 InventoryDB.setGold(curGold)（index.jsc:111905 → 64300 里 `RoleBaseInfo.gold = t`），
      // 而 111905 读的是 OnhookObj.curGold；顶层 curGold 只有 createRole(70457) 读，老档永远走不到。
      // 所以必须写进 OnhookObj，否则 gold 恒为 undefined（面板印 "金条 :  undefined"，getItemNum(1) 也算成 NaN）。
      var goldVal = (typeof s.gold === 'number') ? s.gold : 99999;
      base.curGold = goldVal; base.userGold = goldVal;
      // 元宝：客户端只有 platSuccessCreateInfo 读 userYuanbao(70897)，另可通过 ECONOMY_CHNG 更新(64721)。
      // 老档走不到那条路，所以这里一并给，避免面板显示 undefined。
      var ybVal = (typeof s.yuanbao === 'number') ? s.yuanbao : 0;
      base.userYuanbao = ybVal; base.curYuanbao = ybVal;
      // 关掉新手引导：客户端读 closeGuide 就置 GuideMgr.closeGuideState（index.jsc:107269）
      base.closeGuide = true;
      // 活动面板（2026-10-22）：activityArrFlag → RoleOtherInfo.activeObj（index.js:107227）。
      // [0] 决定七日活动(1001)/每日任务(1002) 哪个 tab 出现（getActiveState 55359-55360）；
      // 离线走每日任务（[0]=0），避免七日活动先去要 taskObj 再回退（多一次往返）。
      base.activityArrFlag = [0, 0];
      var now = env.now();
      // 活动窗口平移（R17 时间炸弹）：快照里的 activityResource 是抓包时刻的值，
      // 先把"抓包时刻"留下来，再把它整体加到 now（必须在覆盖 serverTime 之前取）。
      var snapCapture = num(base.serverTime, 0) > 1.6e12 ? num(base.serverTime, 0) : num(TPL.create.serverTime, 0);
      base.serverTime = now;
      rebaseActivityWindows(base, snapCapture, now);
      if (!base.OnhookObj) base.OnhookObj = {};
      if (!base.OnhookObj.serverTime) base.OnhookObj.serverTime = now;
      base.OnhookObj.curGold = goldVal;
      base.OnhookObj.curJetton = (typeof s.chip === 'number') ? s.chip : 0;
      if (!base.skillMap) base.skillMap = {};
      if (base.cycleLifeRetains === undefined) base.cycleLifeRetains = 0;
      // 洗点/转世数据：客户端 `MarryModel.cycleData` 来自应答的 cycleObj（index.js:77051）。
      // 不给的话 cycleData=[]，洗点按钮 `cycleData[4][e]` 直接 TypeError（scripts2.js:51009）→ 静默失效。
      // 下标语义（全部读点已核对）：[0]转生时间(数字) [1]母体历史(数组) [2]数组(取[0]) [3]{pTims,eTims}
      //   [4]当前附加显示(4元) [5][6]未见读点 [7]fosterArr(4元) [8]bloodArr(4元)
      //   且 index.js:111889-111894 要求 length>=5 且 [7]/[8] 是 4 元数组（加到基础属性上）。
      if (!Array.isArray(base.cycleObj)) {
        var bArr = (Array.isArray(s.bloodArr) && s.bloodArr.length === 4) ? clone(s.bloodArr) : [0, 0, 0, 0];
        var fArr = (Array.isArray(s.fosterArr) && s.fosterArr.length === 4) ? clone(s.fosterArr) : [0, 0, 0, 0];
        base.cycleObj = [0, [], [0], { pTims: 0, eTims: 0 }, clone(bArr), 0, 0, fArr, bArr];
      }
      // 任务账本回放（"重启后任务记忆不丢"的唯一来源，见 taskLedger 注释）
      var tl = taskLedger();
      base.finishTaskObj = tl.finishArr;
      base.acceptTaskArray = tl.acceptArr;
      base.acceptTaskOrder = tl.order;
      if (!Array.isArray(base.taskLog)) base.taskLog = [];
      // 物品/装备账本回放（客户端 LoadGame 后 setSaveAllItems → 只认 count>0 的项）
      // 注意：itemObj 是"派生叠加"（真实背包 + 任务所需差额），存档里永远没有那部分差额
      ensureLedger(s);
      var prj = projectItems(s);
      base.itemObj = prj.bag;
      base.PlayerEquip = clone(s.playerEquip);
      // C19〔技能皮肤商店〕：皮肤/装备映射回放（index.js:111859 `e.hasOwnProperty("skillSkinData")`）
      base.skillSkinData = { skinData: clone(skData(s)), weapToSkinData: clone(skWeap(s)) };
      base.equipments = clone(s.equipments);
      // 称号投射（SOTA R18 §1-2 / 假设 A6 判伪）：客户端读称号的**唯一**入口是 LoadGame 的 `titleObj`
      //   `index.js:111919 n.AchieveModel.setAchieveData(e.hasOwnProperty("titleObj") ? e.titleObj : {})`
      //   ⇒ 不投就必丢：useItem 当场弹了称号（64812），重启后 playerTitle 变回 {}，穿上界面看不到。
      // 值语义（`index.js:625-686` 全读点核对）：
      //   0 或 1 = 永久（`getAchieveEndT` 只把 >1 当到期时间戳；`checkTitleBuff` 里 s=-1 → unlimited）
      //   >1       = 到期 ms（`checkTitleBuff` 用 `value - now` 当剩余时长）
      // 我方账本 `s.titles[id] = 1` 是"永久"标记 ⇒ 投成 **0**（客户端自己的永久约定），
      //   否则 `deleteTitle` 的 `playerTitle[t] > 1` 判据会把永久称号判成"不可删"。
      // 只投纯数字键（`checkTitleBuff` 会拿键去查 player_title 表，非表键会让它 TypeError）。
      // ⚠ 模板 `templates.json → create.titleObj` 自带 `{e:0}`（e = 当前佩戴的称号，客户端 627 行读它），
      //   抓包快照里就有这个键 —— 所以**不能整个替换**，必须在模板对象上补数字键，否则会把 e 抹掉。
      //   安全性核对（SOTA R19 反例 1）：`base` 来自 `clone(roleSnapshot || TPL.create)`，clone 是
      //   JSON 深拷贝（本文件 332 行），所以往 tObj 上写键不会污染内存里缓存的模板。`test\r18-titleobj-projection.js` T5
      //   用"同进程再建一个实例"锁住这一点（旧写法在新进程里跑测不出来，R19 反例 1 点名了）。
      // ⚠ 过期过滤（SOTA R19 反例 2）：`>1` 是到期 ms，已经过去的就别投。否则客户端 `checkTitleBuff`（673 行）
      //   会用 `value - now` 算出负的剩余时长，行为材料未提供；而且"永久拥有"会变成"永远显示已过期"。
      if (s.titles && typeof s.titles === 'object') {
        var tObj = (base.titleObj && typeof base.titleObj === 'object') ? base.titleObj : {};
        var tN = 0, tExpired = 0;
        for (var tk in s.titles) {
          if (!s.titles.hasOwnProperty(tk)) continue;
          if (!/^\d+$/.test(String(tk))) continue;
          var tv = s.titles[tk];
          if (typeof tv === 'number' && tv > 1) {
            if (tv <= now) { tExpired++; continue; }   // 限时称号已过期：不投
            tObj[tk] = tv;
          } else {
            tObj[tk] = 0;                              // 永久：投客户端自己的永久值
          }
          tN++;
        }
        base.titleObj = tObj;
        if (tN || tExpired) {
          env.log('LoadGame → 称号投射 ' + tN + ' 个 titleObj=' + JSON.stringify(tObj)
            + (tExpired ? ('（另有 ' + tExpired + ' 个限时称号已过期，未投射）') : '')
            + '（客户端 index.js:111919）');
        }
      }
      env.log('LoadGame → 快照 ' + (s.name || '?') + ' 任务: 完成=' + tl.finishArr.length + ' 进行中=' + tl.acceptArr.length + ' 物品=' + Object.keys(s.bag).length + ' 种'
        + (Object.keys(prj.overlay).length ? ' 叠加=' + JSON.stringify(prj.overlay) : ''));
      // 2026-10-24：登录时把货币真值走 note.eco 推给客户端（ECONOMY_CHNG 通用监听器 index.js:64721-64722 直写
      // RoleBaseInfo）。没有这条，yuanbao 在登录后恒为 0 —— 客户端只在 createRole(70458) / 月卡结算(54365) /
      // 充值回调(130940) 里读 curYuanbao，老档登录一条都走不到；gold 显示正常是因为 OnhookObj.curGold
      // 在 111905 被读，而 yuanbao 在 OnhookObj 块里**没有读取点**。金条/铜钱顺手带上（幂等，值与快照一致）。
      base.note = base.note && typeof base.note === 'object' ? base.note : {};
      base.note.eco = {
        coins: (typeof s.coins === 'number') ? s.coins : 99999,
        gold: (typeof s.gold === 'number') ? s.gold : 99999,
        yuanbao: (typeof s.yuanbao === 'number') ? s.yuanbao : 0,
      };
      return wrapped('LoadGame', base, { achievement: ach() });
    },
    getCRAInfo: function () { return clone(TPL.getCRAInfo); },
    GetChatAddress: function () { var r = clone(TPL.getChatAddress); r.serverTime = env.now(); return r; },

    /** 接任务：只记账，**绝不动背包**（2026-10-22 改为派生叠加，依据见下）
     *
     *  旧实现按 SpRequire 把差额 `grantItem` 进背包（= R01 说的"先借后还"）。它不能留：
     *  1. 客户端交付任务时**从不扣 SpRequire**：`finishTaskCallBack`（index.jsc:133383-133470）只处理
     *     rewardArray/equipObj/triggerBoxs，没有任何 item 增量；`updateTaskData`（134522-134554）
     *     的 Type 2 分支就是 `case 2: break;`。→ 借款永远没有归还点，借来的物品等于白送。
     *  2. 白送的物品还能被卖掉换成货币 → 凭空增加从"背包"转移到"货币"，背包守恒断言看不出来（R01 §2-e）。
     *  3. 我们就是服务器，C（上交量）由我们定；客户端既不扣，我们就定 C=0（携带型），
     *     于是"归还"这件事根本不存在，也就不需要 loans 账本、不需要跨会话断言。
     *
     *  现在的做法：差额只进应答投射（[needOverlay]），存档里一分不写；真库存永远不会被"借"污染。 */
    acceptTask: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var id = p.taskID;
      if (id && s.accepted.indexOf(id) < 0) s.accepted.push(id);
      persist();
      var meta = taskMeta(id);
      var ov = needOverlay(s);
      if (meta && meta.n) env.log('acceptTask ' + id + ' 记账（背包不动）；本任务所需=' + JSON.stringify(meta.n) + ' 当前叠加=' + JSON.stringify(ov));
      if (Object.keys(ov).length) pushItemsToClient(s);       // 局中可见性（见 pushItemsToClient 注释）
      return wrapped('acceptTask', { eRet: 1, note: {}, taskID: id }, { achievement: ach() });
    },
    /** 交任务：发奖励入账本；**不扣 SpRequire**（C=0，理由见 acceptTask 的注释），同一个任务只发一次 */
    getFinishTaskAward: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var id = p.taskID;
      var repeat = isRepeatTask(id);
      // 重复任务不写 done（客户端也不写，见 isRepeatTask 注释）；普通任务照旧
      if (id && !repeat && s.done.indexOf(id) < 0) s.done.push(id);
      if (id && repeat) {
        var ai = s.accepted.indexOf(id);
        if (ai >= 0) s.accepted.splice(ai, 1);   // 交完即回到"可再接"，否则叠加会永久挂在它身上
      }
      if (!s.rewarded) s.rewarded = [];
      var meta = taskMeta(id);
      var rewardArr = {};
      var rewardItems = {}, rewardEquips = {};
      // v2.6：发不发由**共用账**决定（不再是"rewarded 里有没有"这一条本地规则），
      // 这样别的口子（circleTaskAward 等）领过的任务这里也发不出来，反之亦然。
      var firstTime = canClaim(s, id);
      if (meta && firstTime) {
        if (meta.r) {
          for (var rk in meta.r) {
            if (!meta.r.hasOwnProperty(rk)) continue;
            var cnt = parseInt(meta.r[rk], 10) || 0;
            if (cnt <= 0) continue;
            grantItem(s, rk, cnt);
            rewardArr[rk] = cnt;
            if (itemTypeOf(rk) === 1) rewardEquips[rk] = (rewardEquips[rk] || 0) + cnt;
            else rewardItems[rk] = (rewardItems[rk] || 0) + cnt;
          }
        }
        markClaim(s, id);
        bumpTaskCounter(s, id);   // v2.7.1：告示牌任务完成计数（成就 6/1,0 进度源）
        env.log('getFinishTaskAward ' + id + ' 发奖 ' + JSON.stringify(rewardArr));
      } else if (meta) {
        env.log('getFinishTaskAward ' + id + ' 拒绝重复领（共用账已记过）');
      }
      persist();
      // 发奖后必须推给客户端：客户端回包只弹奖励界面（showReward 不写背包模型），
      // 不推的话玩家要重登才在背包/装备表里看到（2026-10-22 用户实测："掉了却没进包"）
      pushToClient(rewardItems, rewardEquips);
      pushItemsToClient(s);    // 交完任务叠加会缩小 → 用真实库存纠正客户端那份
      var r = clone(TPL.getFinishTaskAward);
      r.p = 'User.getFinishTaskAward';
      var inner = r['User.getFinishTaskAward'] || {};
      inner.taskID = id;
      inner.rewardArray = rewardArr;
      r['User.getFinishTaskAward'] = inner;
      return r;
    },
    OpenNovice: function () { return wrapped('OpenNovice', { eRet: 1 }, { achievement: ach() }); },
    joinSchool: function (p) {
      var s = loadSave(); s.school = p.school || s.school; persist();
      return wrapped('joinSchool', { eRet: 1, note: { attrch: {}, skch: {} }, npcID: p.npcID }, { achievement: ach() });
    },
    /** 技能升级：必须记账，否则客户端"回弹"（客户端不自己保存等级，靠 skillMap 回放）
     *  skillMap 格式 { id: [lv, pgr, brlv] }，见 index.jsc:119994
     *
     *  ⚠️ 2026-10-22 02:35 第二次修正（第一次修正只改了一半，用户实测「无论学几级都只涨一级、取消也涨一级」）：
     *  请求形状（三包已核对，端上抓到的真实参数也一致）：
     *    scripts2.js:13846-13854 LearnSkill → sendUpgradeReq(id, { lv: o.lv + 1, pgr: o.pgr - c, brlv })
     *    scripts2.js:13923-13928 sendUpgradeReq → SkillModel.reqChangeSkillLv(t, e.lv, e.pgr, e.brlv, teacher, type)
     *    index.js:119873-119881         → skillArr = [lv, Math.floor(pgr), brlv]
     *  所以 **skillArr[0] 才是目标等级**，[1] 是剩余进度（客户端已扣过本级消耗），[2] 是突破等级。
     *  旧代码读 [1]（= pgr，实测恒为 0）→ 永远落到 cur+1，这就是"只能学一级"。
     *
     *  语义（本轮定死）：
     *    - 目标 > 当前 → 涨到目标（支持一次跳多级），按级扣潜能（100/级）
     *    - 目标 ≤ 当前 → **视为取消/重复请求：等级与潜能都不动，但进度 pgr/brlv 必须写进账本**
     *      （端上实测 `[5,6,1]` = 等级不变、进度 6 = 面板上的 (80%)；旧实现直接丢弃 → "练到 80% 一取消全丢"）
     *    - pgr / brlv 一律按客户端发来的回显（以前硬写 0/1，导致客户端进度条每次清零）
     *  应答消费端只读 eRet / returnPro（index.jsc:119842-119845），所以权威值靠 pushSkillToClient 推回模型。
     *
     *  ★ SOTA R20 Q4（纠错，2026-10-23）：**应答里不许再带 `returnPro`**。
     *    1) 形状表判它是开关字段：`BZ_SHAPES.__switch.upgradeSkill = {"returnPro":"switch"}`
     *       ⇒ 契约是"要么缺席、要么真值"，发 `0` 就是非法值（自检每次都在报 `upgradeSkill.returnPro=0`）；
     *    2) 客户端读点是 `index.js:119844`：
     *       `e.hasOwnProperty("returnPro") && Alert.show(getText("6003371").replace(/\[1\]/, e.returnPro))`
     *       ⇒ **不是"不读"，是一读就弹窗**。我们每次都发 0，等于每次升级操作都弹一次「返还潜能 0」的提示；
     *    3) 原版抓包 `decrypted\0036/0039_RESP_*upgradeSkill.json.txt` 的应答里**没有这个字段**。
     *  ⇒ 删掉它 = 纠错（应答更贴抓包、去掉一个误弹窗），不是行为决策；返还潜能的真实语义（降级/洗点时才有）未实现，
     *    将来要实现时再按"有值才发"的形态加回，绝不能发 0。
     *
     *  ⚠ `note.eco` 的键必须是 **`ptt`**（潜能），不能写 `potential`（2026-10-23 改，证据链三处）：
     *    1) 客户端 ECO 监听器 `index.js:64698-64725` 的 switch 只认 coins / ptt / gold / exp / chips / yuanbao，
     *       发 `eco.potential` 会被**静默丢弃**（不报错、不提示）；
     *    2) 上面那条应答回调只读 `eRet` 与 `returnPro`，**既不读顶层 `potential`、也不处理 `note`**
     *       —— 所以别指望凭证里那个顶层字段生效；
     *    3) 客户端潜能显示真正靠的是 `pushSkillToClient()` 直接写活模型
     *       （`RoleBaseInfo.potentials = pot`，见本文件 293-299），那条路不受 eco 影响。
     *  ⇒ 键写错**不会**让玩家看到错数（有推送兜着），只是 `note.eco` 变成死字段。
     *    改成 `ptt` 是让这条数据通路在语义上成立（以后哪个版本真去读 eco 也不会踩空）。
     *  ⚠ 顶层 `potential` 保留：现在是"客户端不读"的冗余字段，删不删都不改变行为，留着不制造新变数。
     *    （R20 Q4 要求"改它之前先确认客户端不读"；上句 2) 就是那个 grep 结果，所以它有条件构成纠错，但本批不动它。） */
    upgradeSkill: function (p) {
      var s = loadSave();
      var id = String((p && p.skillID) || 0);
      var cur = s.skills[id];
      var curLv = Array.isArray(cur) ? (cur[0] || 0) : (cur || 0);
      var arr = (p && Array.isArray(p.skillArr)) ? p.skillArr : [];
      var reqLv = arr.length > 0 ? Math.floor(arr[0]) : 0;                       // ★ 目标等级
      var reqPgr = arr.length > 1 ? Math.max(0, Math.floor(arr[1])) : 0;         // 剩余进度
      var reqBrlv = arr.length > 2 ? Math.floor(arr[2]) : 1;                     // 突破等级
      var reqRaw;
      try { reqRaw = JSON.stringify(p); } catch (e) { reqRaw = '?'; }
      if (reqRaw && reqRaw.length > 300) reqRaw = reqRaw.slice(0, 300) + '…';
      var lv = Math.max(curLv, reqLv || 0);        // 只升不降
      var gained = lv - curLv;
      var pot = (typeof s.potential === 'number') ? s.potential : 99999;

      // 无效请求（缺 skillArr 或 skillID 为 0/空）：绝不落账 —— 否则会写出假的 skills["0"]
      // （自检就是拿空参数打这个动作，坑 21 的老坑，别再踩）。
      if (!arr.length || !(parseInt(id, 10) > 0)) {
        env.log('upgradeSkill 忽略无效请求 id=' + id + ' p=' + reqRaw);
        return wrapped('upgradeSkill', { eRet: 1, note: { eco: { ptt: pot }, skch: {} }, potential: pot }, { achievement: ach() });
      }

      // ===== 书路径：flag === 1（ConsultUI 的 studyData 路径，scripts2.js:13994-13999 + 13923-13928）=====
      // 客户端点"学习/升级"时发 {skillID, skillArr, NPCID=书的 itemID, flag=1}。
      // 这一支**不再采信客户端上报的等级**（R20 Q1③：原来 lv=max(curLv, reqLv) 等于让客户端随便报等级），
      // 改为服务端自己算：未学会 → 1 级；已学会 → 当前+1 级；并扣 1 本书。
      // 差异声明（我们自己定的规则，非原版还原）：原版 `flag=1` 的行为没有抓包，
      //   这里按"一本书 = 一次升级"实现，最坏差异是少扣/多扣 1 本书，方向可控。
      var bookFlag = (p && (p.flag === 1 || p.flag === '1')) ? 1 : 0;
      var npcId = String((p && p.NPCID) || 0);
      var bookSkill = (typeof BZ_ITEMSCH !== 'undefined' && BZ_ITEMSCH[npcId]) || 0;
      if (bookFlag && bookSkill > 0) {
        if (String(bookSkill) !== String(id)) {
          env.log('upgradeSkill 书路径拒绝：书 ' + npcId + ' 只教技能 ' + bookSkill + '，请求的是 ' + id);
          return wrapped('upgradeSkill', { eRet: 4, note: { skch: {} } }, { achievement: ach() });
        }
        var bookHave = parseInt(s.bag[npcId], 10) || 0;
        if (bookHave < 1) {
          env.log('upgradeSkill 书路径拒绝：背包没有书 ' + npcId + '（库存 ' + bookHave + '）');
          return wrapped('upgradeSkill', { eRet: 4, note: { skch: {} } }, { achievement: ach() });
        }
        var newLv = curLv > 0 ? curLv + 1 : 1;
        var newBrlv = curLv > 0 ? reqBrlv || 1 : 0;    // 学 1 级时 brlv 写 0（对齐抓包 0036/0039 的 [1,0,0]）
        s.bag[npcId] = bookHave - 1;
        if (s.bag[npcId] <= 0) delete s.bag[npcId];
        s.skills[id] = [newLv, 0, newBrlv];
        persist();
        pushSkillToClient(id, newLv, pot, 0, newBrlv);
        pushItemsToClient(s);
        var bookNote = { eco: { ptt: pot }, skch: {} };
        bookNote.skch[id] = [newLv, 0, newBrlv];
        bookNote.ivch = {}; bookNote.ivch[npcId] = s.bag[npcId] || 0;
        env.log('upgradeSkill 书路径 ' + npcId + '：技能 ' + id + ' ' + curLv + '→' + newLv + '，扣 1 本（余 '
          + (s.bag[npcId] || 0) + '）brlv=' + newBrlv);
        return wrapped('upgradeSkill', { eRet: 1, note: bookNote, potential: pot }, { achievement: ach() });
      }

      if (gained <= 0) {
        // 取消 / 重复请求：等级与潜能不动，但**进度必须存下来**。
        // 端上实测：{"skillArr":[5,6,1]} = 目标=当前、进度 6（面板上的 (80%)）——
        // 旧实现这里直接返回、什么都不写，于是"练到 80% 一点取消，进度全丢，重进回到 0%"。
        //
        // ★ SOTA R18 §1-3 / 反例 3（本轮新增）：**绝不下发 lv=0 的 skch**。
        //   客户端 `index.js:119832 s.SkillTable.setSkill(n, e[o][0])` 不过滤 0，
        //   而 `120070 getSkillItem` 只判 `dic.hasOwnProperty` ⇒ 一旦把某技能写成 `[0,…]`：
        //     · Effect 5 的书在本地被判"已学会"（64343 `dic.hasOwnProperty(Data1)` → 提示 243 拦截）；
        //     · Effect 11 的书拿 `lv=0` 去走 ConditionUp 分支。
        //   这条路径原文可达：未知技能 + 目标等级 ≤0 ⇒ curLv=0、gained=0，旧实现会写 skills[id]=[0,…]。
        //   删除技能只能走 abolish 通道；这里一律不落账、不发 skch。
        if (curLv <= 0) {
          env.log('upgradeSkill ' + id + ' 未知技能且目标 ≤0 → 不落账、不发 skch（防 lv=0 污染 SkillTable；R18 §1-3）p=' + reqRaw);
          return wrapped('upgradeSkill', { eRet: 1, note: { eco: { ptt: pot }, skch: {} }, potential: pot }, { achievement: ach() });
        }
        var keptPgr = Math.max(0, reqPgr);
        var keptBrlv = reqBrlv || 1;
        s.skills[id] = [curLv, keptPgr, keptBrlv];
        persist();
        pushSkillToClient(id, curLv, pot, keptPgr, keptBrlv);
        var kept = { eco: { ptt: pot }, skch: {} };
        kept.skch[id] = [curLv, keptPgr, keptBrlv];   // 客户端 119831-119834：setSkill/setUpgrdPgr/setBrLv
        env.log('upgradeSkill ' + id + ' 等级不变（目标 ' + (reqLv || '-') + ' ≤ 当前 ' + curLv + '）进度已存 pgr=' + keptPgr + ' brlv=' + keptBrlv + ' p=' + reqRaw);
        return wrapped('upgradeSkill', { eRet: 1, note: kept, potential: pot }, { achievement: ach() });
      }

      s.skills[id] = [lv, reqPgr, reqBrlv || 1];
      s.potential = Math.max(0, pot - 100 * gained);
      persist();
      pushSkillToClient(id, lv, s.potential, reqPgr, reqBrlv || 1);
      var note = { eco: { ptt: s.potential }, skch: {} };
      note.skch[id] = [lv, reqPgr, reqBrlv || 1];
      env.log('upgradeSkill ' + id + ' Lv' + curLv + '→' + lv + '（目标 ' + reqLv + '，+' + gained + ' 级）pgr=' + reqPgr + ' brlv=' + (reqBrlv || 1) + ' 潜能=' + s.potential + ' p=' + reqRaw);
      return wrapped('upgradeSkill', { eRet: 1, note: note, potential: s.potential }, { achievement: ach() });
    },

    /** 打坐开始：`User.BeginMeditation {curMp,maxMp,hg,gTime,hgtimes,flag}`（index.js:138936-138938）。
     *
     *  为什么必须有 handler（2026-10-23，SOTA R09）：客户端拿到应答就写
     *    `t.startTimestamp = o.beginTime; t.hyTime = 1e3 * o.hyTime;`
     *    `NonBattleBuffModel.setBufferCostStartTime(o.hyTime, o.beginTime)`（index.js:138882-138885），
     *  然后用 `scripts2.js:47303` `(duration - (getSTimestamp() - startTimestamp))/1e3` 算剩余时间。
     *  没有 handler 时形状默认值曾被填成一个构建时刻/0 → `now - startTimestamp` 天然很大 →
     *  玩家**一进去就打坐完成**。所以这里必须回**请求时刻**。
     *  ⚠ `hyTime`（本次打坐时长，秒）的推导规则在服务端，材料未提供 —— 不编数，先给 0（= 无寒玉髓时长加成），
     *    并发声；这条属于"诚实降级"，不是修好了。 */
    BeginMeditation: function (p) {
      p = p || {};
      var now = env.now();
      // v2.7.1-accept3 打坐计时：Begin 记账（EndMeditation 按 now - t 结算修为，1 点/分钟）。
      var s = loadSave();
      s.medBegin = { t: now, g: parseInt(p.gTime, 10) || 0 };
      persist();
      env.log('BeginMeditation 开始 curMp=' + (p.curMp || 0) + ' maxMp=' + (p.maxMp || 0)
        + ' hg=' + (p.hg || 0) + ' → beginTime=' + now + '（hyTime 规则未知，暂 0）');
      return wrapped('BeginMeditation', {
        eRet: 1,
        beginTime: now,
        hyTime: 0,
      }, { achievement: ach() });
    },
    /** 练功开始：`User.BeginTraining {skillID,hg,gTime,hgtimes,flag,isCollective}`（index.js:120751-120762）。
     *  与打坐同源：回调把 `beginTime` 同时写进 `startTimestamp` 与 **`TimeMgr.sserverT`**
     *  （index.js:120518-120519），后者是客户端服务器时钟的基准。
     *  ⚠ 好消息：`getSTimestamp()` 是 `0 == sserverT || 0 == startTime ? Date.now() : sserverT + Date.now() - startTime`
     *    （index.js:136545-136547）—— 传 0 会**回退本地时钟**，不会把客户端拨到 1970；
     *    但传一个"构建时刻"常量会让 `now - beginTime` 很大 → 一进去就练功完成。所以这里回请求时刻。
     *  ⚠ `hanyusuiTime`（本次练功时长，秒）规则同样在服务端，未取证 → 先 0 并发声。 */
    BeginTraining: function (p) {
      p = p || {};
      var s = loadSave();
      var sid = parseInt(p.skillID, 10) || 0;
      // ⚠ 合法性（SOTA R12 §1 第 2 条，R13 §1 第 2 条复核通过）：不能无条件回声 skillID，更不能兜底成 0 ——
      //   客户端会拿它去查 skill 表（`getItem(0,"skill")` → null → 读 .name 崩，F1 那一族），
      //   而且回声任意 id 等于允许玩家用**没学过的技能**练功。
      //   只接受"账本里已学会"的技能；否则拒绝，**不写 beginTime、不发 skillID**。
      var learned = !!(s && s.skills && s.skills[String(sid)]);
      if (!(sid > 0) || !learned) {
        // 选码：**eRet:4（第 2 档，静默）**，不选 3。理由（逐字，见 docs/sota/inbox/R13-审阅.txt §2）：
        //   ① 回调的成功集 = `1 == n.eRet || 2 == n.eRet`（index.js:120516）→ 4 不进门，绝不写错时间基座；
        //   ② 回调**还有** `else if (3 == n.eRet)` 分支（index.js:120569-120571），
        //      但它是 `var h = getItem(n.skillID, "skill")` 后 `getText(423).replace(/\[68\]/, getText(h.Name))`：
        //      文本 423 =「[68]已经达到瓶颈了,需要闭关突破,方可继续修炼提升」（live 实读）——语义是"练满/需突破"，
        //      不是"未学会"；而且 skillID 一旦不在客户端 item 表里 h 为 null → `.Name` 抛 TypeError。
        //      ⇒ 第 1 档的两个前提（文本对得上、不崩）都不成立，按 R13 的档位规则退回第 2 档。
        //   ③ 静默必须可观测（R13 §5）：warn 级日志 + 计数，计数写进 meta.rejectStats，
        //      由 tools\check_reject_codes.js 与回归 test\r13-reject-codes.js 盯（新增即 FAIL）。
        noteReject('BeginTraining', 'notLearned', 'skill=' + sid + ' ledger=' + JSON.stringify(s && s.skills));
        return wrapped('BeginTraining', { eRet: 4 }, { achievement: ach() });
      }
      var now = env.now();
      // v2.7.1-accept3 练功计时：Begin 记账，End_* 按真实流逝时间结算（见 EndMeditation 注）。
      // gTime = 客户端总游戏时长（秒），作为单次结算时长上限（<=0 视为无上限）。
      s.trainBegin = { t: now, g: parseInt(p.gTime, 10) || 0 };
      persist();
      var payload = {
        eRet: 1,
        beginTime: now,
        skillID: sid,
        // hanyusuiTime 是**契约**不是可选：回调 `e.hyTime = 1e3 * n.hanyusuiTime`（index.js:120521），
        // 少发它客户端会算成 NaN。语义 = 寒玉髓 buff(1043) 剩余秒数（buff.json 1043 / mall.json 商品 2），
        // 我们没实现 buff 系统 → 0 = 当前没有该 buff，自洽（见 HANDOVER §7-3b 的前提）。
        hanyusuiTime: 0,
      };
      // ⚠ `isCollective`：**请求里有就原样回声，0 也照发**（SOTA R13 §1 第 1 条，推翻 R12 的"0 不发"）。
      //   逐字证据（tools\index.js:120523）：
      //     `if (n.hasOwnProperty("isCollective")) if (0 == n.isCollective) if (2 == e.isSchoolLiang) {`
      //     → 关掉门派练功界面（CLOSE_SCHOOL_LIAN_GONG_UI）并 load("comUI/LiangongUI")；
      //       门派界面开着（isSchoolLiang==2）时选**个人**练功，客户端**正是靠这个 0** 才切界面。
      //       R12 把 0 过滤掉 = 丢掉这一整种情形（玩家卡在门派界面，普通练功界面不打开）。
      //   而且请求**永远带这个字段**：`index.js:120751-120759`
      //     `start=function(t,e){ void 0===e && (e=0); … isCollective: e }`
      //     ⇒ "按请求回声存在性"在这条协议上等价于"永远回声"，值域 0/1（另见 115158 / 120597 / 120892）。
      //   0 值合法这一点在 noteBadSwitches 里靠 SWITCH_ZERO_OK 白名单豁免（否则会被误报成"不合法开关值"）。
      if (Object.prototype.hasOwnProperty.call(p, 'isCollective') && p.isCollective !== null && p.isCollective !== undefined) {
        var colV = parseInt(p.isCollective, 10);
        payload.isCollective = isFinite(colV) ? (colV ? 1 : 0) : 0;
      }
      env.log('BeginTraining 开始 skillID=' + sid + ' isCollective=' + (payload.isCollective === undefined ? '(不发)' : payload.isCollective)
        + ' → beginTime=' + now);
      return wrapped('BeginTraining', payload, { achievement: ach() });
    },
    /** 小孩玩耍开始：`User.beginPlayGame`（回调 index.js:24616，函数体 24657-24676）。
     *  回调把 `n.beginTime` 存进 `ChildrenModel.beginTime`（index.js:24663），
     *  消费端 `scripts2.js:13167` / `13178` 拿 `TimeMgr.getSTimestamp() - ChildrenModel.beginTime` 算已玩时长。
     *  没有 handler 时形状默认值（曾为 0）→ 已玩时长天然巨大。必须回**请求时刻**。
     *  其余字段由 `fillShape` 按形状兜底（只补缺不覆盖）。 */
    beginPlayGame: function (p) {
      p = p || {};
      var now = env.now();
      env.log('beginPlayGame 开始 → beginTime=' + now);
      // ⚠ `choose` 的形状默认值是从 getFinishTaskAward 的抓包借来的（C12 src = borrowed-capture），
      //    靠 fillShape 兜底会把"选了什么"填成别的动作的值 → 这里显式给 0（语义未知，不猜）。
      return wrapped('beginPlayGame', { eRet: 1, beginTime: now, choose: 0 }, { achievement: ach() });
    },
    /** 雇佣挂机查询：`User.checkHireOnhook`（回调 index.js:51451-51543）。
     *  回调在 index.js:51516 直接算 `(getSTimestamp() - beginTime) * 0.001` 累进 `timeElapsed`
     *  → 没有 handler 时形状默认值（曾为 0）会让"已挂机时长"巨大。必须回**请求时刻**。 */
    checkHireOnhook: function (p) {
      p = p || {};
      var now = env.now();
      env.log('checkHireOnhook 查询 → beginTime=' + now);
      return wrapped('checkHireOnhook', { eRet: 1, beginTime: now }, { achievement: ach() });
    },
    /** 战斗准备：`User.ReqSelfBattleInfo`     *
     *  以前这里无条件回抓包模板 → 客户端 `prepareForBattle` 用模板里的固定 npcID（index.js:69015-69031），
     *  于是"打谁都一样"。实测客户端**自己会把 npcID 发过来**（`startBattle` 发
     *  `{npcID,isRmd,mp,gTime,hgtimes}`，index.js:69162-69172，常量 `REQ_PVE_BATTLE: "User.ReqSelfBattleInfo"` 59610）。
     *  所以：把 npcID 原样回声，并按 `generateNpcData`（index.js:8093-8134）要求的 26 项顺序塞 `npcArr`，
     *  对手就真的是你点的那只。数据来自 `tools/cfg/npc_stats.json`（3201 只可战斗 npc，≈360 KB）。 */
    ReqSelfBattleInfo: function (p) {
      p = p || {};
      var s = loadSave();
      var npc = parseInt(p.npcID, 10) || 0;
      var r = clone(TPL.reqSelfBattleInfo);
      var inner = r['User.ReqSelfBattleInfo'];
      if (inner) {
        if (s.baseValueAy) inner.baseValueAy = s.baseValueAy;
        if (npc > 0) {
          inner.npcID = npc;
          var A = (typeof BZ_NPCARR !== 'undefined' && BZ_NPCARR) ? BZ_NPCARR[String(npc)] : null;
          if (A && A.length) inner.npcArr = clone(A);
          env.log('ReqSelfBattleInfo npc=' + npc + (A ? '（已带 npcArr）' : '（无该 npc 数值，回模板）'));
        }
      }
      return r;
    },
    /** 战斗结算：按 npc.Drop 发掉落（统一 drop 入口的第一个消费者）。
     *  请求实测带 `{win, npcID}`（REQ 日志）。
     *
     *  2026-10-22 R03 修正两处：
     *   1. **不再做 5 秒去重**。证据：客户端只有一处发送点（index.js:69196，战斗结束事件），
     *      三包里 `retry/resend/onTimeout` 零命中；HTTP 封装的"重发"只挂在 onerror/ontimeout 上，
     *      而进程内 XHR 是**同步返回 200**，错误路径永不触发 → 重复结算不会发生，
     *      自造的时间窗口只会误吞"自动战斗/连打同一只怪"的第二场。
     *   2. **掉落写进应答**。客户端消费端 index.js:89553-89561 会读 `o.rewardArray` / `o.equipObj`
     *      渲染战斗结算界面（没有就显示"无奖励"）→ 不回就等于玩家永远看不到战利品。 */
    CheckBattleResult: function (p) {
      p = p || {};
      var npc = parseInt(p.npcID, 10) || 0;
      var win = (p.win === true) || (parseInt(p.win, 10) === 1);
      var got = null;
      if (npc > 0 && win) {
        var s = ensureLedger(loadSave());
        var dropId = (typeof BZ_NPCDROP !== 'undefined') ? BZ_NPCDROP[String(npc)] : 0;
        if (!dropId) {
          env.log('打怪掉落 npc=' + npc + ' 无掉落表（npc.Drop 缺失或展开为空）');
        } else {
          got = grantFromDrop(s, dropId);
          persist();
          if (got) pushToClient(got.items, got.equips);   // 掉落同样要推，否则只写存档、界面看不到
          if (got && (Object.keys(got.items).length || Object.keys(got.equips).length)) {
            env.log('打怪掉落 npc=' + npc + ' drop=' + dropId + ' → ' + JSON.stringify(got));
          } else {
            env.log('打怪掉落 npc=' + npc + ' drop=' + dropId + ' 本次没掷中');
          }
        }
      }
      var r = clone(TPL.checkBattleResult);
      var inner = r['User.CheckBattleResult'];
      if (inner) {
        inner.win = !!win;
        inner.rewardArray = (got && got.items) ? got.items : {};
        var eq = {};
        if (got && got.equips) {
          for (var ek in got.equips) {
            if (!got.equips.hasOwnProperty(ek)) continue;
            eq[ek] = [1, got.equips[ek]];      // 模板里 equipObj 的形状是 {uid: [type, num]}
          }
        }
        inner.equipObj = eq;
      }
      return r;
    },

    /** 活动面板三件套（2026-10-22，修"点活动就卡死"）
     *
     *  链子（全部有行号）：点「活动」→ `getAllActivity` → 回调 `onGetAllActivity`（index.js:57446-57459）
     *  收尾**无条件**再发一个请求：`activeObj[0] ? reqSevenDayActive() : reqEveryDayActive()`；
     *  · `reqSevenDayActive` → `User.getSevenTaskList`（59622），回调 `sevenTaskCallback`（57387-57405）
     *    第一句就是 `if (e.hasOwnProperty("taskObj"))` —— 我们以前回的形状默认值**没有 taskObj**，
     *    两个分支都不进 → `HomeActiveUI` 既不打开也不关闭 → 那层 modal 留在最上面吃触摸（用户实测"卡死"）。
     *  · `reqEveryDayActive` → `User.getActivityCounts`（59716），回调会 `addComponent("HomeActiveUI").setData(e)`，
     *    而 `HomeActiveUI.setData` 只读 `dataArr`（scripts2:29200-29204）。
     *  所以三处都回"合法且空"的结构即可闭合：面板能开、能关，不再吃触摸。 */
    getAllActivity: function () {
      return wrapped('getAllActivity', {
        eRet: 1,
        activityList: [],        // 活动 id 数组（客户端大量 indexOf/includes，空数组安全）
        activityShows: [0, 0],   // 显式关掉"首充/新手礼包"两个 tab（1003/1004，含付费入口）
        schoolActivityOpen: 0,
        schoolArenaOpen: 0,
      }, { achievement: ach() });
    },
    getSevenTaskList: function () {
      return wrapped('getSevenTaskList', { eRet: 1, taskObj: {} }, { achievement: ach() });
    },
    getActivityCounts: function () {
      // 每日任务列表（2026-10-22）：DailyMissionUI.start 只把 dataArr 当**标量数组**用
      // （scripts2.js:17184-17197：循环 dataArr.length，dataArr[i] 作 numTime），
      // 而配置表 daily_active_tips 有 18 行（id 1..18，isshow>0 的才显示）→ 给 18 个 0 即渲染出 18 条"零进度"任务。
      var dataArr = [];
      for (var di = 0; di < 18; di++) dataArr.push(0);
      return wrapped('getActivityCounts', { eRet: 1, dataArr: dataArr, SevenDaysArr: [], schoolActivityOpen: 0, schoolArenaOpen: 0 }, { achievement: ach() });
    },

    /** 侠客令（通行证面板 `storeUI/PassCardUI`）：`User.passCardData {}`
     *  （send index.js:55965 `reqGetInviteData`；常量 59803 `PASS_CARD_DATA:"User.passCardData"`）。
     *
     *  链子（全部有行号）：
     *    index.js:55867 onGetPassCardData → 1==eRet 读 e.passCard{p,n,award} + e.goldArr → dispatch PASSCARD_DATA_EVENT(e)（55873）
     *    scripts2.js:8778 onShowPassCardData → PassCardUI.setData(e)（8784）
     *    scripts2.js:48287 start() 读 **this.data.etime / this.data.passCard.n / this.data.passObj**
     *      → showInviteActionUI(passObj)（48343）按值遍历塞进 dataArr
     *      → InviteCellRender.setRewardTxtState 读 this.data[0] / loadItems 读 this.data[1]
     *      → **:35118 固定循环 p=0..3**，读 `this.data[2+p][0]` 当奖励物品 id
     *    ⇒ passObj 每行必须是 `[passID, 需要活跃度, award1, award2, award3, award4]`，长度 ≥6，少一格就下标越界。
     *
     *  数据源（真实配置表，tools/cfg/dump/，由 gen_shop_tables.js 生成）：
     *    pass_level    → BZ_PASS_PRICE   四档价目 [0,288,600,1000]（**元宝**，客户端 goldArr）
     *    pass_award    → BZ_PASS_ROW     12 阶 [id, liveness, award1..award4]
     *    pass_liveness → BZ_PASS_ENDTIME 各来源 endtime 最大值（面板倒计时用）
     *
     *  档位语义：passCard.p = 当前档位，InviteCellRender 用 `d = 格号 < p` 决定解锁哪几格
     *  ⇒ 买第 2 档 = award1+award2 两格可用，买第 4 档四格全开（对应 pass_award 的四列设计）。
     *
     *  ⚠ passObj / award 里**不许混进 __meta**：gen_shop_tables 给每张表挂了 __meta 统计属性（可枚举），
     *    整张表原样下发会让客户端多 push 一条垃圾行 → `data[2+p]` 下标越界。这里显式重建干净对象。 */
    passCardData: function () {
      var s = ensureLedger(loadSave());
      var lvl = parseInt(s.passCardLevel, 10) || 1;
      if (lvl < 1) lvl = 1;
      var liveness = parseInt(s.passLiveness, 10) || 0;
      var award = {};
      for (var ak in s.passAward) {
        if (!s.passAward.hasOwnProperty(ak) || ak === '__meta') continue;
        award[ak] = s.passAward[ak];
      }
      var rows = {};
      var src = (typeof BZ_PASS_ROW !== 'undefined' && BZ_PASS_ROW) || {};
      for (var rk in src) {
        if (!src.hasOwnProperty(rk) || rk === '__meta') continue;
        rows[rk] = src[rk];
      }
      var prices = [];
      var pt = (typeof BZ_PASS_PRICE !== 'undefined' && BZ_PASS_PRICE) || [];
      for (var pi = 0; pi < pt.length; pi++) prices.push(pt[pi]);
      env.log('passCardData → 档位 ' + lvl + '，活跃 ' + liveness + '，已领 ' + Object.keys(award).length + ' 阶，下发 ' + Object.keys(rows).length + ' 阶');
      return wrapped('passCardData', {
        eRet: 1,
        passCard: { p: lvl, n: liveness, award: award },
        goldArr: prices,
        etime: (typeof BZ_PASS_ENDTIME !== 'undefined') ? BZ_PASS_ENDTIME : 0,
        passObj: rows,
      }, { achievement: ach() });
    },

    /** 侠客令升档：`User.buyInvitationCard {pass_levelID}`（send index.js:55968 `reqUpGradeCard`）。
     *  消费端 index.js:55885 onBuyInvitationCard：1==eRet 时 `cardState = e.pass_levelID`（必须**回显**）
     *  + dispatch PAY_GOLD_INVITE；4==eRet 弹 getText(1093)。价目 BZ_PASS_PRICE[档位-1]（元宝）。
     *  只许往上买，不能降级；第 1 档价为 0。 */
    buyInvitationCard: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var want = parseInt(p.pass_levelID, 10) || 0;
      var prices = (typeof BZ_PASS_PRICE !== 'undefined' && BZ_PASS_PRICE) || [];
      var cur = parseInt(s.passCardLevel, 10) || 1;
      if (!(want >= 1 && want <= prices.length)) {
        env.log('buyInvitationCard 拒绝：档位 ' + want + ' 不合法（共 ' + prices.length + ' 档）');
        return wrapped('buyInvitationCard', { eRet: 4, note: {} }, { achievement: ach() });
      }
      if (want <= cur) {
        env.log('buyInvitationCard 拒绝：已是第 ' + cur + ' 档，不能买 ' + want);
        return wrapped('buyInvitationCard', { eRet: 4, note: {} }, { achievement: ach() });
      }
      var cost = parseInt(prices[want - 1], 10) || 0;
      if (cost > 0 && !(s.yuanbao >= cost)) {
        env.log('buyInvitationCard 档位 ' + want + ' 拒绝：需 ' + cost + ' 元宝，只有 ' + s.yuanbao);
        return wrapped('buyInvitationCard', { eRet: 4, note: {} }, { achievement: ach() });
      }
      if (cost > 0) s.yuanbao -= cost;
      s.passCardLevel = want;
      persist();
      env.log('buyInvitationCard → 升到第 ' + want + ' 档，扣 ' + cost + ' 元宝，余 ' + s.yuanbao);
      return wrapped('buyInvitationCard', { eRet: 1, pass_levelID: want, note: { eco: { yuanbao: s.yuanbao } } }, { achievement: ach() });
    },

    /** 侠客令领奖：`User.passCardAward {passID}`（send index.js:55972 `reqGetInviteReward`）。
     *  消费端 index.js:55879 onGetPassCardReward：1==eRet 读 `e.awardArr[0]` 当 passID、`awardArr[1]` 当状态写进 award
     *  （4 = 已领取），并把 `e.rewardArray` 交给 addShowRewardUI1 弹获得窗 → **必须回**；
     *  rewardArray 用工程既有口径 `{物品id: 数量}`（同 buyGoodAndEvilShopItem/rgShopByItem）。
     *  领取条件（scripts2.js:35193）：`paperNum >= 该阶 liveness && cardState >= tag`。 */
    passCardAward: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var pid = parseInt(p.passID, 10) || 0;
      var src = (typeof BZ_PASS_ROW !== 'undefined' && BZ_PASS_ROW) || {};
      var row = src[String(pid)];
      if (!row || pid <= 0) {
        env.log('passCardAward 拒绝：找不到阶 ' + pid);
        return wrapped('passCardAward', { eRet: 4, note: {} }, { achievement: ach() });
      }
      var lvl = parseInt(s.passCardLevel, 10) || 1;
      var liveness = parseInt(s.passLiveness, 10) || 0;
      var need = parseInt(row[1], 10) || 0;
      if ((parseInt(s.passAward[String(pid)], 10) || 0) >= 4) {
        env.log('passCardAward 拒绝：第 ' + pid + ' 阶已领取');
        return wrapped('passCardAward', { eRet: 4, note: {} }, { achievement: ach() });
      }
      if (liveness < need) {
        env.log('passCardAward 拒绝：第 ' + pid + ' 阶需活跃 ' + need + '，只有 ' + liveness);
        return wrapped('passCardAward', { eRet: 4, note: {} }, { achievement: ach() });
      }
      var note = { ivch: {}, eqch: {}, eco: {} };
      var ra = {};
      // 只有前 `档位` 格是买到的奖励（格号从 0 起，grid < 档位 才解锁，与客户端 d = p < tag 同口径）
      for (var gi = 0; gi < 4 && gi < lvl; gi++) {
        var pair = row[2 + gi];
        if (!pair || !pair.length) continue;
        var gid = parseInt(pair[0], 10) || 0;
        var gn = parseInt(pair[1], 10) || 0;
        if (!(gid > 0) || !(gn > 0)) continue;
        grantItem(s, gid, gn);
        ra[gid] = (parseInt(ra[gid], 10) || 0) + gn;
        if (itemTypeOf(gid) === 1) note.eqch[gid] = [1, s.playerEquip[gid]];
        else note.ivch[gid] = parseInt(s.bag[gid], 10) || 0;
      }
      s.passAward[String(pid)] = 4;
      persist();
      env.log('passCardAward → 第 ' + pid + ' 阶领取（档位 ' + lvl + '，' + Object.keys(ra).length + ' 种奖励）');
      return wrapped('passCardAward', { eRet: 1, awardArr: [pid, 4], rewardArray: ra, note: note }, { achievement: ach() });
    },

    /** 侠客令（免费轨）：`User.getGrowupData {}`（send index.js:55303 `reqGrowUpData`）。
     *  入口：scripts2.js:8728 openBuyGoldEvent(type 3) → GrowthModel.reqGrowUpData()
     *  回调：index.js:55261 growupDataCallback → dispatch GET_GROUP_DATA_EVENT(e)
     *  展示：scripts2.js:8770 onShowGrowthFundData → NewGFUI.setData(e)（8775）→ setData(:46140) 读 t.growObj / t.buyPrice
     *  ⚠ 必须给非空 growObj，理由见 growthFundPayload 注释与 getBigGrowupData 注释。 */
    getGrowupData: function () {
      var r = growthFundPayload('getGrowupData', 1);
      env.log('getGrowupData → ' + r.count + ' 阶（侠客令 award1），paystata=1');
      return wrapped('getGrowupData', r.payload, { achievement: ach() });
    },

    /** 大侠令（付费轨）：`User.getBigGrowupData {}`（send index.js:55306 `reqBigGrowUpData`）。
     *  回调：index.js:55267 → scripts2.js:46125 onGetBigGroupDataEvent 填 dataArr[1]。
     *  ⚠ **这里是"侠客令界面卡死"的真凶**（scripts2.js:46175）：
     *      `changePage(t)` 只在 `dataArr[t].length > 0` 才落定，否则 `else 1 == t && reqBigGrowUpData()`
     *      → 大侠令 growObj 为空 ⇒ dataArr[1] 空 ⇒ 立刻再请求 ⇒ 每 14~15ms 一次、永不收敛 ⇒ lockScreen 锁死。
     *      实测：给空/不给 handler 时 400 条日志全被 getBigGrowupData 刷满；
     *      所以这个动作**必须给非空 growObj**——空表比没有 handler 更糟。
     *  付费轨 paystata 恒 0（未解锁）：解锁走 GFUI_BUY_GIFT → payData → 真实充值链（index.js:55279-55289
     *  reqRechargeMoney），本工程不接任何真实付费，所以不实现购买。 */
    getBigGrowupData: function () {
      var r = growthFundPayload('getBigGrowupData', 2);
      env.log('getBigGrowupData → ' + r.count + ' 阶（大侠令 award2），paystata=' + r.payload.paystata
        + (r.payload.paystata ? '（已解锁）' : '（未解锁，解锁价 ' + GF_BIG_UNLOCK_PRICE + ' 元宝）'));
      return wrapped('getBigGrowupData', r.payload, { achievement: ach() });
    },

    /** 侠客令领奖：`User.ReceiveAward {Growid}`（send index.js:55318-55323 `reqGrowReward`）。
     *  回调 index.js:55273-55278 receiveAwardCallback：1==eRet → addShowRewardUI1(e.rewardArray, 0)
     *  + dispatch UPDATE_GROUP_DATA_EVENT(this.tag) 刷新面板；**只有 1==eRet 一个分支**，拒绝静默。
     *  Growid = 该阶配置 id（客户端 data[7]：onGetBigGroupDataEvent 把 growObj 的键 push 进数组末尾）。 */
    ReceiveAward: function (p) {
      return receiveGrowthReward(p, 1, 'ReceiveAward');
    },

    /** 大侠令领奖：`User.ReceiveBigAward {Growid}`（send index.js:55324-55328 `reqBigGrowReward`）。
     *  回调同 receiveAwardCallback（index.js:55273）。额外要求：大侠令已用元宝解锁。 */
    ReceiveBigAward: function (p) {
      return receiveGrowthReward(p, 2, 'ReceiveBigAward');
    },

    /** 大侠令解锁（扣**元宝**）：`User.buyBigGiftTime {roleId}`（send index.js:55313-55317 `reqPayBigGrowUp`）。
     *  回调 index.js:55255-55259 onBuyBigGift：1 → getText(7297) 并重取大侠令；4 → 7353；5 → 8845（充值框）。
     *  价 = GF_BIG_UNLOCK_PRICE（本工程自定，原版价格未取证，见该常量注释）。元宝不足回 5。
     *  ⚠ 不接任何真实充值：只扣离线存档里的元宝，元宝充值通道（金条/元宝商店 = ChargeShopUI）本来就没实现。 */
    buyBigGiftTime: function (p) {
      var s = ensureLedger(loadSave());
      if (parseInt(s.growthBigPaid, 10) || 0) {
        env.log('buyBigGiftTime 忽略：大侠令已解锁');
        return wrapped('buyBigGiftTime', { eRet: 1, note: {} }, { achievement: ach() });
      }
      if (!(s.yuanbao >= GF_BIG_UNLOCK_PRICE)) {
        env.log('buyBigGiftTime 拒绝：需 ' + GF_BIG_UNLOCK_PRICE + ' 元宝，只有 ' + s.yuanbao);
        return wrapped('buyBigGiftTime', { eRet: 5, note: {} }, { achievement: ach() });   // 5 → getText(8845)
      }
      s.yuanbao -= GF_BIG_UNLOCK_PRICE;
      s.growthBigPaid = 1;
      persist();
      env.log('buyBigGiftTime → 大侠令解锁，扣 ' + GF_BIG_UNLOCK_PRICE + ' 元宝，余 ' + s.yuanbao);
      return wrapped('buyBigGiftTime', { eRet: 1, note: { eco: { yuanbao: s.yuanbao } } }, { achievement: ach() });
    },

    /** 炼丹（2026-10-24 修正版：之前回 alchemyGearConfig:{} 会让面板 onLoad 直接 TypeError
     *  把场景炸死 —— setGearConfigData（scripts3.js:6702）读 configMap[type].length，
     *  而 configMap 由 alchemyGearConfig 各条的 .type 建成（7012-7016），空对象 = configMap 空 = 崩）。
     *  消费端 onGetAlchemyData（scripts3.js:7005-7026）：
     *    activityData（可选）→ alchemyDataList[1]（七日）；1 != data.state → alchemyDataList[2] = data（普通）；
     *    gearConfigList = e.alchemyGearConfig，按每条的 .type 建 configMap[type] = [键…]
     *    （这些键就是 buyFormula 请求里的 id）。面板 setGearConfigData 读条目的
     *    GetYuanbao / FormulaTitle，showConfigTipUI 读 FormulaTxt，燃炼链读 GoldGear。
     *  这里从 BZ_FORMULA（formula 表）放出 type 1/2 的真配方（58+37=95 条，全部可买、价 = price 元宝）。
     *  客户端模型结构性只有 list[1]/list[2] 两个入口（应答只有 activityData/data 两槽），
     *  所以 type 3-6 的配方行放进来也没人消费，不放。GoldGear 是燃炼档位表（相关动作未实现，占位）。 */
    getAlchemyData: function () {
      var fb = (typeof BZ_FORMULA !== 'undefined' && BZ_FORMULA) || {};
      var gear = {};
      for (var k in fb) {
        if (!hasOwn(fb, k)) continue;
        var f = fb[k];
        if (f.t !== 1 && f.t !== 2) continue;          // 客户端只有 SevenDay(1)/Common(2) 两个槽
        gear[k] = { type: f.t, GetYuanbao: f.p || 10, FormulaTitle: f.n || 0,
                    FormulaTxt: f.n || 0, GoldGear: [[0, 0]] };
      }
      return wrapped('getAlchemyData', {
        eRet: 1,
        data: { state: 0, type: 2, id: 0, price: 10, num: 0 },
        activityData: { state: 0, type: 1, id: 0, endTime: 0, freeNum: 0, gear: 0 },
        alchemyGearConfig: gear,
      }, { achievement: ach() });
    },

    /** 等级奖励（离线版：空列表 + endTime=0）
     *  消费端 scripts3.js:43812-43828 onGetLevelBonusData 读 e.eRet / e.bonusObj / e.endTime；
     *  LevelBonusUI.loadItems（43919-43926）只 `for..in bonusObj`，空对象安全；update() 用 endTime 算倒计时，0 安全。 */
    getLevelBonusData: function () {
      return wrapped('getLevelBonusData', { eRet: 1, bonusObj: {}, endTime: 0 }, { achievement: ach() });
    },

    /** 成就面板数据：`User.getAchieveData {}`（index.js:60581 常量；触发点：主页"成就"按钮 scripts2.js:30988）。
     *  消费端 scripts3.js:2899-2918：1==eRet 时读 groupPoints/rateIds/achieveIdArr/rd/taskData/srd，
     *  然后**无条件**加载 `network/achievement/AFrontUI` 并 setData(o)（2912-2916）；
     *  AFrontUI 无自有 setData（基类只存 this.data），成就列表由客户端用配置表（achieve_group/achieve_list）渲染
     *  → 服务端只给"合法空态"六件套即可开面板（零进度、无可领奖，诚实不造假）。
     *  账本预留 `s.achieve`（{groupPoints,rateIds,pending,received,taskData,suitIds}），将来接真实进度直接读它。 */
    getAchieveData: function () {
      var s = ensureLedger(loadSave());
      // v2.7.1 拍板 3：进度模型落地 —— 账本要真建了（此前拒绝路径才需要"不建槽"），
      // 每次打开面板重算一遍可判条件；pending/组积分/积分档/套装账全部服务端权威。
      var st = achState(s);
      recomputeAchievements(s, st);
      // groupPoints 必须**含全部组 id**：checkGroupOpen = `gPoints.hasOwnProperty(组id)`（scripts3.js:3045），
      // 空对象 → getGroupIdArray 返回空 → 面板零条目（2026-10-22 实测"成就空白"）。
      var gp = st.groupPoints;
      var gids = (typeof BZ_ACHIEVE_GROUPS !== 'undefined' && BZ_ACHIEVE_GROUPS) || [];
      for (var gi = 0; gi < gids.length; gi++) {
        if (!Object.prototype.hasOwnProperty.call(gp, gids[gi])) gp[gids[gi]] = 0;
      }
      persist();
      env.log('getAchieveData 重算：pending=' + st.pending.length + ' taskData键=' + Object.keys(st.taskData).length);
      return wrapped('getAchieveData', {
        eRet: 1,
        groupPoints: gp,
        rateIds: st.rateIds.slice(),
        achieveIdArr: st.pending.slice(),
        rd: st.received.slice(),
        taskData: st.taskData,
        srd: st.suitIds,
      }, { achievement: ach() });
    },

    /** 转世入口状态：`User.isCycleLife {}`（index.js:60571 ← RebirthModel.isCycleLife 101922）。
     *  消费端（101924-101933）：1 → 打开 marrySystem/rollUI（转世选先天 UI）；2/3 → 提示文案。
     *  ⚠ 转世是**服务端权威的整套重置**：cycleLife 成功后客户端 `killRoleClear()` + `reqLoadGameServer()`
     *  整档重放，新一世的等级/技能/先天全由服务端决定，而重置规则**不在客户端源码里**（请求只带
     *  isReserved/branchId/originId/skillArr/skillID/attArr=[hpLimit,mpLimit]，见 101963-101969）。
     *  离线**不伪造**：回 2（条件不足），不打开 rollUI、不做任何重置。见 §19.16。 */
    isCycleLife: function () {
      env.log('isCycleLife → eRet:2（转世重置规则不在客户端，离线不伪造）');
      return wrapped('isCycleLife', { eRet: 2 }, { achievement: ach() });
    },
    /** 转世确认：`User.cycleLife {isReserved,branchId,originId,skillArr,skillID,attArr}`（index.js:59702 ← 101963）。
     *  消费端（101885-101913）：1 → 播剧情 + killRoleClear + reqLoadGameServer；6/7/9 → 提示。
     *  这里回 9（条件不足）：既不触发"重放一个没变的档"，也不伪造新一世。 */
    cycleLife: function () {
      env.log('cycleLife 拒绝：转世重置规则服务端权威，离线不伪造');
      return wrapped('cycleLife', { eRet: 9 }, { achievement: ach() });
    },
    /** 特殊转世：`User.specialCycleLife {originId}`（index.js:60185 ← 101959）——同上，明说不做。
     *  ⚠ R05 Q3 取证更正（2026-10-22 夜）：原来回 `eRet:4`，但客户端 `CYCLE_LIFE` 回调
     *  （index.js:101885-101913）只处理 **1 / 6 / 7 / 9** 四个分支，**2 和 4 落进"静默丢弃"**
     *  （既不提示也不复原）→ 玩家点了"一点反应都没有"。现改成 9（与 cycleLife 一致，
     *  走 `getText("6003686")` 明确提示），拒绝语义不变。 */
    specialCycleLife: function () {
      env.log('specialCycleLife 拒绝：同 cycleLife（eRet:9，客户端只有 1/6/7/9 有提示分支）');
      return wrapped('specialCycleLife', { eRet: 9 }, { achievement: ach() });
    },
    /** 剧情分支选择：`User.storyExperience {branchId}`（index.js:60572 ← 101973）。
     *  消费端（101914-101919）：1 → `RoleBaseInfo.storyId = e.branchId` + CYCLE_END。纯本地字段回显，安全。 */
    storyExperience: function (p) {
      p = p || {};
      return wrapped('storyExperience', { eRet: 1, branchId: parseInt(p.branchId, 10) || 0 }, { achievement: ach() });
    },

    /** 时装商店列表：`User.GetFashionList {type}`（index.js:59562 ← 75620 onGetFashionList）。
     *  应答交给 FashionShopMainUI → FashionShopNewUI.showItem：**必须有 `type` 与 `FashionArr`**，
     *  否则 `curSelectType` 不初始化，点页签 `btns[undefined].getChildByName` 崩（scripts2.js:21830）。
     *
     *  2026-10-22 第二轮（§20）：**按页发货 + 限时页必须带 `FashionTimeMap`**。
     *  - tab1（限时）每条走 `MakeUpModel.getFashionTimeType(ID)`（scripts2.js:21215）→
     *    `getFashionTime(t)[1]`（index.js:75617-75618）；fashionTimeMap 空 → `e[1]` TypeError
     *    → total() 的 Promise reject → **列表一件都不建**（实测：切到「限时」整页空白 + 日志两条 err）。
     *  - tab2（战令）读 `pass.split(",")[1]`（21242-21243）；常驻件 pass="0" → 价格显示 "undefined"（实测）。
     *  - `FashionArr[i] = [物品id, 限时剩余天数]`；`FashionTimeMap = { "起_止": [物品id,...] }`（75607-75611）。 */
    GetFashionList: function (p) {
      p = p || {};
      var tab = parseInt(p.type, 10);
      if (!(tab >= 0)) tab = 0;
      var pages = (typeof BZ_FASHIONPAGES !== 'undefined' && BZ_FASHIONPAGES) || null;
      var now = env.now();
      var arr = [];
      var resp = { eRet: 1, type: tab };
      var list = pages ? pages[tab] : null;
      if (!list) list = [];
      var timeMap = {};
      for (var fi = 0; fi < list.length; fi++) {
        var ent = list[fi];
        if (ent && typeof ent === 'object' && ent.length) {
          var fid = parseInt(ent[0], 10) || 0;
          var on = parseInt(ent[1], 10) || 0;
          var off = parseInt(ent[2], 10) || 0;
          if (!(fid > 0)) continue;
          var period = 0;
          if (on > 0 && off > on) {
            if (now >= on && now <= off) period = Math.max(1, Math.ceil((off - now) / 86400000));
            var key = on + '_' + off;
            if (!timeMap[key]) timeMap[key] = [];
            timeMap[key].push(fid);
          }
          arr.push([fid, period]);
        } else {
          var sid = parseInt(ent, 10) || 0;
          if (sid > 0) arr.push([sid, 0]);
        }
      }
      resp.FashionArr = arr;
      if (tab === 1) resp.FashionTimeMap = timeMap;
      env.log('GetFashionList type=' + tab + ' → ' + arr.length + ' 件'
        + (tab === 1 ? '，时间组 ' + Object.keys(timeMap).length : ''));
      return wrapped('GetFashionList', resp, { achievement: ach() });
    },
    /** 时装购买：`User.BuyFashion {itemObj:{槽:[物品id, 页签, 支付档位]}}`
     *  （index.js:59612 ← 75731 reqBuyFashion；端上实测 `{"itemObj":{"8":[2601,0,0]}}`）。
     *  消费端 75553-75578：
     *    eRet==1 → 逐槽 `InventoryModel.getEquipmentInfo(itemID)`（65161 查 equipmentDic，只认
     *    parseEq 进来的实例）→ **必须先 note.eqch 把时装塞进客户端装备账本**，否则 `.id` 抛
     *    TypeError（2026-10-22 实测 75560 `Cannot read property 'id' of null`，买完什么都不发生）；
     *    之后客户端自己 `RoleBaseInfo.equipments[槽]=id` + putOnEquipment（75568-75569）。
     *  三页三套货币（全部有配置证据）：
     *    页0 常驻 → 金条 × fashionall.price（客户端弹窗原文「确认花费200金条购买时装」，200=price）
     *    页1 限时 → 档位0 金条 × limit 首段；档位1 道具 7298 × limit 次段（scripts2.js:21726-21729）
     *    页2 战令 → 道具 7851 × pass 数量（scripts2.js:21771-21776）
     *  钱不够 / 无价 / 跨页 → `eRet:4`（明确失败，不落账、不推任何 note）。 */
    BuyFashion: function (p) {
      var s = ensureLedger(loadSave());
      var table = (typeof BZ_FASHIONBUY !== 'undefined' && BZ_FASHIONBUY) || {};
      var obj = (p && p.itemObj && typeof p.itemObj === 'object') ? p.itemObj : {};
      var slots = Object.keys(obj);
      if (!slots.length) {
        env.log('BuyFashion 忽略空请求');
        return wrapped('BuyFashion', { eRet: 4 }, { achievement: ach() });
      }
      var wantGold = 0;
      var wantItem = {};
      var grants = [];
      var bad = '';
      for (var si = 0; si < slots.length; si++) {
        var slot = parseInt(slots[si], 10) || 0;
        var ent = obj[slots[si]];
        if (!slot || !ent || typeof ent !== 'object' || !ent.length) { bad = '槽位/请求体无效'; break; }
        var id = parseInt(ent[0], 10) || 0;
        var tab = parseInt(ent[1], 10) || 0;
        var mode = parseInt(ent[2], 10) || 0;
        var info = table[id];
        if (!(id > 0) || !info || info.t !== tab) {
          bad = '无此货或跨页（id=' + id + ' tab=' + tab + '）';
          break;
        }
        if (tab === 0) {
          var g0 = parseInt(info.p, 10) || 0;
          if (!(g0 > 0)) { bad = '无买价（id=' + id + '）'; break; }
          wantGold += g0;
        } else if (tab === 1) {
          // 支付档位来自 FashionShopAlertUI 的四选一（scripts2.js:21034-21036）：
          //   档位 1 = 第一档（金条）、档位 2 = 第二档（券 7298）；档位 0 = 默认（`{8:0,9:0}`，也是金条）
          if (mode === 2) {
            var ci = parseInt(info.ci, 10) || 0;
            var cn = parseInt(info.c, 10) || 0;
            if (!(ci > 0 && cn > 0)) { bad = '无券价（id=' + id + '）'; break; }
            wantItem[ci] = (wantItem[ci] || 0) + cn;
          } else {
            var g1 = parseInt(info.g, 10) || 0;
            if (!(g1 > 0)) { bad = '无金条价（id=' + id + '）'; break; }
            wantGold += g1;
          }
        } else {
          var pi = parseInt(info.pi, 10) || 0;
          var pn = parseInt(info.pn, 10) || 0;
          if (!(pi > 0 && pn > 0)) { bad = '无战令价（id=' + id + '）'; break; }
          wantItem[pi] = (wantItem[pi] || 0) + pn;
        }
        grants.push({ slot: slot, id: id });
      }
      if (!bad) {
        var haveGold = (typeof s.gold === 'number') ? s.gold : 0;
        if (wantGold > haveGold) bad = '金条不足（需 ' + wantGold + ' 有 ' + haveGold + '）';
      }
      if (!bad) {
        var chkIds = Object.keys(wantItem);
        for (var ci2 = 0; ci2 < chkIds.length; ci2++) {
          var need = wantItem[chkIds[ci2]];
          var have = parseInt((s.bag || {})[chkIds[ci2]], 10) || 0;
          if (have < need) { bad = '道具不足（' + chkIds[ci2] + ' 需 ' + need + ' 有 ' + have + '）'; break; }
        }
      }
      if (bad) {
        env.log('BuyFashion 拒绝：' + bad);
        return wrapped('BuyFashion', { eRet: 4 }, { achievement: ach() });
      }
      var note = { ivch: {}, eqch: {}, eco: {} };
      if (wantGold > 0) {
        s.gold = ((typeof s.gold === 'number') ? s.gold : 0) - wantGold;
        note.eco.gold = s.gold;
      }
      var itKeys = Object.keys(wantItem);
      for (var ki = 0; ki < itKeys.length; ki++) {
        var kid = itKeys[ki];
        var left = (parseInt((s.bag || {})[kid], 10) || 0) - wantItem[kid];
        if (left > 0) s.bag[kid] = left; else delete s.bag[kid];
        note.ivch[kid] = left > 0 ? left : 0;   // 绝对值（§17.2：消费端是赋值不是累加）
      }
      for (var gi = 0; gi < grants.length; gi++) {
        var gr = grants[gi];
        // 时装是 item.Type==1（装备类，EquipType 8/9），必须进 `playerEquip` 而不是背包——
        // 客户端 `getEquipmentInfo`（index.js:65161）只查 equipmentDic（= PlayerEquip 解析结果）。
        // 这里**不走 grantItem**：`BZ_ITEMTYPE` 来自 item 表的截断导出，时装 id（2601…）不在里面，
        // 走 grantItem 会被当成普通物品塞进 bag（2026-10-22 测试 T7 当场抓到）。
        var curN = Array.isArray(s.playerEquip[gr.id]) ? (parseInt(s.playerEquip[gr.id][1], 10) || 0) : 0;
        s.playerEquip[gr.id] = [1, curN + 1];
        note.eqch[gr.id] = [1, clone(s.playerEquip[gr.id])];
        s.equipments[gr.slot] = gr.id;
      }
      persist();
      env.log('BuyFashion OK ' + JSON.stringify(grants) + ' 金条-' + wantGold
        + (Object.keys(wantItem).length ? ' 道具-' + JSON.stringify(wantItem) : '') + ' 余额=' + s.gold);
      return wrapped('BuyFashion', { eRet: 1, note: note }, { achievement: ach() });
    },

    /** 伙伴详情：`User.getFriendPartner {}`（scripts3.js:39506 GET_FRIEND_PARTNER）。
     *  消费端 getFriendPartnerCallBack（58454-58466）把 `e.notFriendPartnerData` 直接赋给 lockFriendData；
     *  缺这个键 → lockFriendData=undefined → 伙伴卡片 checkTaskFinishState 每帧崩
     *  （scripts3.js:59334 hasOwnProperty of undefined，2026-10-22 实测刷屏）。 */
    getFriendPartner: function () {
      return wrapped('getFriendPartner', {
        eRet: 1, notFriendPartnerData: {}, friendPartnerDatas: {}, isUnlock: 0, happinessNum: 0,
      }, { achievement: ach() });
    },

    /* ===== 以下形状均来自客户端源码（tools/index.js，已解密），字段逐个对过 ===== */

    /** 挂机/修炼结算：onCheckBreak 读 finish/gTime/hg/hgtimes/roleGold，(可选)itemAddition/skillID/skillLevel/usedTime */
    OnCheckBreak: function () {
      var s = loadSave();
      return wrapped('OnCheckBreak', {
        eRet: 1, finish: 1, gTime: 0, hg: 100, hgtimes: 0,
        roleGold: typeof s.gold === 'number' ? s.gold : 20,
        itemAddition: 0, skillID: 0, skillLevel: 0, usedTime: 0,
      }, { achievement: ach() });
    },

    /** 打坐/挂机 开始-结束：onBreakReqReturn 读 skillID/skillLevel/needTime/operate/serverTime/beginTime/Sponsor/friendName/friendSex/Addition */
    OnHookBreak: function (p) {
      p = p || {};
      var now = env.now();
      return wrapped('OnHookBreak', {
        eRet: 1, operate: 1,
        skillID: p.skillID || 0, skillLevel: p.skillLevel || 0,
        needTime: 0, serverTime: now, beginTime: now,
        Sponsor: '', friendName: '', friendSex: 0, Addition: 0, itemAddition: 0,
      }, { achievement: ach() });
    },

    /** 打怪：callBackKilNpc 读 eRet 与 npcIDArr */
    killNpc: function (p) {
      p = p || {};
      return wrapped('killNpc', {
        eRet: 1,
        npcIDArr: p.npcIDArr || [],
        dropArr: [], extraArr: [], exp: 0,
      }, { achievement: ach() });
    },

    /** 护镖/托管开始：callBackBeginNpc 读 npcID/beginTime/endTime */
    BeginSaveNpc: function (p) {
      p = p || {};
      var now = env.now();
      return wrapped('BeginSaveNpc', {
        eRet: 1, npcID: p.npcID || 0, beginTime: now, endTime: now,
      }, { achievement: ach() });
    },

    /** 护镖/托管结束：callBackEndNpc 读 endTime/sex */
    EndSaveNpc: function () {
      return wrapped('EndSaveNpc', { eRet: 1, endTime: env.now(), sex: 0 }, { achievement: ach() });
    },

    /** 存档时间/充值状态：onSaveTimeEvent 只在 eRet==2 时做事，我们回 1 即空操作 */
    GetRoldSaveTime: function () {
      return wrapped('GetRoldSaveTime', { eRet: 1, flag: 0 }, { achievement: ach() });
    },

    /* ---------- 生活技能：钓鱼 ---------- */

    /** onStartFishing 51557：读 eRet/beginTime/serverTime/advertisementNum/maxTime */
    BeginFish: function (p) {
      p = p || {};
      var now = env.now();
      return wrapped('BeginFish', {
        eRet: 1, beginTime: now, serverTime: now,
        advertisementNum: 0, maxTime: 0, fishpondID: p.fishpondID || 0,
      }, { achievement: ach() });
    },

    /** onEndFishing 51576：读 eRet/serverTime/beginTime/gTime/hg/hgtimes/awardArr/extraArr */
    EndFish: function () {
      var s = loadSave();
      var now = env.now();
      return wrapped('EndFish', {
        eRet: 1, beginTime: now - 60000, serverTime: now,
        gTime: 60, hg: 100, hgtimes: 0,
        awardArr: {}, extraArr: [],
      }, { achievement: ach() });
    },

    /** onCheckFishingRewards 51545：只读 awardArr */
    LookFishAward: function () {
      return wrapped('LookFishAward', { eRet: 1, awardArr: {} }, { achievement: ach() });
    },

    /* ---------- 生活技能：修炼（打坐/练功） ---------- */

    /** 86189：0 != eRet 才算开始；读 beginTime/serverTime/maxTime */
    BeginPlayWooks: function () {
      var now = env.now();
      return wrapped('BeginPlayWooks', {
        eRet: 1, beginTime: now, serverTime: now, maxTime: 0,
      }, { achievement: ach() });
    },

    /** 86202：读 eRet/serverTime/beginTime/gTime/hg/hgtimes/exp/expExtra/potential/potentialExtra/specialAny */
    EndPlayWooks: function () {
      var now = env.now();
      return wrapped('EndPlayWooks', {
        eRet: 1, beginTime: now - 60000, serverTime: now,
        gTime: 60, hg: 100, hgtimes: 0,
        exp: 0, expExtra: 0, potential: 0, potentialExtra: 0, specialAny: 0,
      }, { achievement: ach() });
    },

    /** 77258：读 eRet/npcID/deletePartners */
    closedBook: function (p) {
      p = p || {};
      return wrapped('closedBook', {
        eRet: 1, npcID: p.npcID || 0, deletePartners: [],
      }, { achievement: ach() });
    },

    /** 144100：读 eRet/armStrong/shenFa/bone/understanding/bloodArr/maxWuxin/fosterArr。
     *  ⚠ eRet:1 时客户端会把四项基础属性**整体替换**成应答值（index.js:144101-144108）。
     *    我方没有"洗髓丹/转世"的数据来源，乱给会清空玩家基础属性 → 回非 1/2 的 eRet：
     *    客户端只弹一条提示（getText("910")，index.js:144132），不改任何数值。 */
    WashMedicine: function (p) {
      p = p || {};
      return wrapped('WashMedicine', {
        eRet: 0,
        armStrong: 0, shenFa: 0, bone: 0, understanding: 0,
        bloodArr: [], maxWuxin: 0, fosterArr: [],
      }, { achievement: ach() });
    },

    /** 洗点（洗附加属性）：`User.washAdditionalArr`（index.js:60205）。
     *  消费端状态机（index.js:144049-144076）：
     *    eRet 1 = 成功（bloodArr 4 项 → 力量/身法/根骨/悟性附加；可带 maxWuxin）
     *    eRet 4 = 弹 SetWashUI 选洗哪条：attrList 必须是 **"a,b|c,d|e,f|g,h" 字符串（4 段）**，
     *             客户端 split("|") 后取每段 split(",")[1] 当数值显示（scripts2.js:61720-61724）
     *    eRet 6/7 = 等级不足 / 上一世无附加属性；eRet 3 = 去充值（付费，不做）
     *  无 attrID = 洗全部；`{attrID:1..4}` = 只洗那一条（SetWashUI 的 toggle 序号，scripts2.js:61731）。
     *  离线语义：把对应槽位**清零**（把洗出来的附加洗掉），不发明随机数值。
     *  ⚠ LoadGame 必须同时给 cycleObj，否则按钮在发请求前就 TypeError（见 LoadGame 注释）。 */
    washAdditionalArr: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      if (!Array.isArray(s.bloodArr) || s.bloodArr.length !== 4) s.bloodArr = [0, 0, 0, 0];
      var k = parseInt(p.attrID, 10) || 0;
      if (!(k >= 1 && k <= 4)) {
        var attrList = '41,' + s.bloodArr[0] + '|42,' + s.bloodArr[1] + '|44,' + s.bloodArr[2] + '|43,' + s.bloodArr[3];
        return wrapped('washAdditionalArr', { eRet: 4, attrList: attrList }, { achievement: ach() });
      }
      s.bloodArr[k - 1] = 0;
      persist();
      env.log('washAdditionalArr 槽 ' + k + ' 已清零 → bloodArr=' + JSON.stringify(s.bloodArr));
      return wrapped('washAdditionalArr', { eRet: 1, bloodArr: clone(s.bloodArr), maxWuxin: 0 }, { achievement: ach() });
    },

    /* ---------- 门派 ---------- */

    /** 78022：读 eRet/npcID/serverTime/CDTime/skillId（6 == eRet 表示冷却中） */
    CheckOutSchool: function (p) {
      p = p || {};
      var now = env.now();
      return wrapped('CheckOutSchool', {
        eRet: 1, npcID: p.npcID || 0, serverTime: now, CDTime: now, skillId: 0,
      }, { achievement: ach() });
    },

    /** 77894（17 处字段）：npcIDArr 必须真是数组（客户端取 .length），clearBoxs 交给 MapBoxModel */
    OutSchool: function () {
      var now = env.now();
      return wrapped('OutSchool', {
        eRet: 1, npcID: 0, npcIDArr: [], oldSchool: 0,
        clearBoxs: [], textArr: [], rewardArray: null,
        serverTime: now, CDTime: now, skillId: 0,
      }, { achievement: ach() });
    },

    /** 世界 Boss 进场：读 flag/bossCurHP/bossMaxHP/curAttackNum/randSeed/buyNum/buffNum */
    enterWoldBossBattle: function () {
      return wrapped('enterWoldBossBattle', {
        eRet: 1, flag: 0, bossCurHP: 0, bossMaxHP: 0,
        curAttackNum: 0, randSeed: 0, buyNum: 0, buffNum: 0, AttckData: [],
      }, { achievement: ach() });
    },

    /** 上传伤害：读 killBoss(roleID 比对)/killBossName/bossMaxHP/bossCurHP/CDTime/setAllHpAndMp */
    checkUploadAttackDamge: function () {
      return wrapped('checkUploadAttackDamge', {
        eRet: 1, killBoss: 0, killBossName: '', bossMaxHP: 0, bossCurHP: 0,
        CDTime: 0, maxPotentialLimit: 0, setAllHpAndMp: {},
      }, { achievement: ach() });
    },

    /** 筹码兑换：读 curGold/curJetton/chipTimes/getPotency/getCoins */
    ExChangeJetton: function () {
      var s = loadSave();
      return wrapped('ExChangeJetton', {
        eRet: 1,
        curGold: typeof s.gold === 'number' ? s.gold : 20,
        curJetton: typeof s.chip === 'number' ? s.chip : 0,
        chipTimes: 0, getPotency: 0, getCoins: 0,
      }, { achievement: ach() });
    },

    /* ---------- 社交 / 门派 / 任务同步（形状来自 field_usage.json 取证） ---------- */

    /** 132209：for..in e.friendList，且取 friendList[n].friendId；uIds 存红点 */
    FriendList: function () {
      return wrapped('FriendList', { eRet: 1, uIds: [], friendList: {} }, { achievement: ach() });
    },
    /** 132269：Number(e.eRet)-1 当下标，1 = 成功 */
    ApplyFriend: function () { return wrapped('ApplyFriend', { eRet: 1 }, { achievement: ach() }); },
    FindFriend: function () { return wrapped('FindFriend', { eRet: 1 }, { achievement: ach() }); },
    /** 132204：注意这条是 0 == eRet 才算成功 */
    FindFriendByID: function () { return wrapped('FindFriendByID', { eRet: 0 }, { achievement: ach() }); },
    FriendDelete: function () { return wrapped('FriendDelete', { eRet: 1 }, { achievement: ach() }); },
    /** 101515：只读 eRet 与 CDTime */
    rankList: function () { return wrapped('rankList', { eRet: 1, CDTime: 0 }, { achievement: ach() }); },
    LookOther: function () { return wrapped('LookOther', { eRet: 1 }, { achievement: ach() }); },
    GetSchoolRankList: function () { return wrapped('GetSchoolRankList', { eRet: 1 }, { achievement: ach() }); },
    /** 门派评价：读 eRet/type/reviewList/maxPage（type 要与请求回显一致） */
    GetSchoolReview: function (p) {
      p = p || {};
      return wrapped('GetSchoolReview', {
        eRet: 1, type: p.type || 0, reviewList: [], maxPage: 0,
      }, { achievement: ach() });
    },
    /** 退出师门：客户端取 e.npcIDArr.length，必须是数组 */
    exitSchool: function () {
      return wrapped('exitSchool', { eRet: 1, npcIDArr: [] }, { achievement: ach() });
    },
    clearGeSchoolClothing: function () { return wrapped('clearGeSchoolClothing', { eRet: 1 }, { achievement: ach() }); },
    /** 任务同步：整份替换客户端缓存。**绝不能回空**——
     *  客户端拿到 {} 会当成"一个任务都没做过"，并把 "{}" 写回本地缓存（index.jsc:133515-133519），
     *  之后已做过的任务会被 NPC 重新派一遍。这里按账本回放两个集合。 */
    sycnTask: function () {
      var tl = taskLedger();
      env.log('sycnTask 回放 完成=' + tl.finishArr.length + ' 进行中=' + tl.acceptArr.length);
      return wrapped('sycnTask', {
        eRet: 1,
        PlayerFinishTaskObj: tl.finishObj,
        acceptTaskMap: tl.acceptMap,
        acceptTaskOrder: tl.order,
        PlayerTaskLog: [],
        taskLog: [],
      }, { achievement: ach() });
    },

    /** 物品同步：整份替换客户端背包（客户端先 `_itemObj = {}` 再按 itemObj 重建）→ 必须回全部持有物，
     *  且同样走派生叠加投射（否则"重登后任务又交不掉"） */
    sycnPlayerItemData: function () {
      var s = ensureLedger(loadSave());
      var prj = projectItems(s);
      return wrapped('sycnPlayerItemData', {
        eRet: 1,
        itemObj: prj.bag,
        PlayerEquip: clone(s.playerEquip),
      }, { achievement: ach() });
    },
    /** 使用物品：请求 {itemID,itemNum}；应答必须带 note 的五个子表（index.jsc:64757 起直接读 note.skch）
     *  叠加出来的物品不在存档里 → 截断到真实库存（否则会把不存在的东西"用掉"再写负数） */
    useItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var n = Math.abs(parseInt(p.itemNum, 10) || 1);
      var have = parseInt(s.bag[p.itemID], 10) || 0;
      var use = Math.min(n, have);
      var schSkill = (typeof BZ_ITEMSCH !== 'undefined' && BZ_ITEMSCH[p.itemID]) || 0;
      // Effect 5 = 师门秘籍（与 ITEMSCH/Effect 11 同族）：客户端 `index.js:64342-64347`
      //   `case 5: if (SkillTable.dic.hasOwnProperty(e.Data1)) { show(getText("243")); return !0; }
      //    var _ = getItem(e.ID, "master_book"); … 条件/Menpai 判定 …`
      //   ⇒ Data1 就是**技能 id**（不是查表命中率推出来的，是这一行直接读的）。
      //   已学会时客户端自己就弹 243 并本地拦截、不会发请求；条件不满足同理。
      //   所以走到我们这里的 Effect 5 请求 = "条件已满足、尚未学会" → 复用 ITEMSCH 的"学会 1 级"逻辑。
      var fx = (typeof BZ_ITEMFX !== 'undefined' && BZ_ITEMFX[p.itemID]) || null;
      // ⚠ 写法必须是 `(fx || [])[0]`：Type≠2 的物品不在 BZ_ITEMFX 里（构建期只收 Type==2），
      //   而 :65333 的发送点不受 Type 守卫约束（守卫只包住 :64321 的 switch）——
      //   所以 Type≠2 但客户端仍发 USE_ITEM 的物品会走到这里，直接取 `fx[0]` 会抛 TypeError（SOTA R17 反例 1）。
      if (!schSkill && ((fx || [])[0] === 5) && fx[1] > 0) schSkill = fx[1];
      var knownSkill = schSkill > 0 ? ((s.skills && s.skills[String(schSkill)]) || null) : null;
      // ===== R06 第 1/2 条：秘籍（Effect==11，Data1=技能 id）不再白吃 =====
      // 证据链（全部实测/读表，见 HANDOVER §23）：
      //   - 客户端**没有**"已学会就不许用"的拦截：Effect 11 落到 `65535 else` → `useItemFunc` 直接发请求；
      //   - `note.skch` 消费端只弹「恭喜你学会了[67]！」（lang 422，探针实读）、不写模型（64754-64763）
      //     → 学技能**只能服务端写档**；
      //   - 秘籍描述（lang 37608「记载着炼神分心术的秘籍」/ 37626「基础的调整呼吸功法…」）
      //     **既没说"学会"也没说"+1 级"** → 原版对"已学会"的行为无法从描述判定（R06 的判别法在这一项上无解）。
      // 因此按"绝不造成不可逆损失"处理（R06 第 2 条）：
      //   a) 技能**不存在** → 记 1 级（秘籍唯一合理的起点；技能表无起始等级列，见 skill.json 1112 行）
      //      + 写档 + `note.skch` → 客户端弹「恭喜你学会了X」；此项**假定**记录在案，可一键回退。
      //   b) 技能**已存在** → `eRet:5`（客户端 `5==eRet` 走 getText(1333)「你已经学会此配方了」，唯一"已学会"提示分支）
      //      **不扣物品** —— 这正是 3626 那次损失的形态，从此不会再发生。
      if (schSkill > 0 && use > 0 && knownSkill) {
        env.log('useItem 秘籍 ' + p.itemID + ' 拒绝：技能 ' + schSkill + ' 已在账本（'
          + JSON.stringify(knownSkill) + '），**不扣物品**（eRet:5）');
        return wrapped('useItem', { eRet: 5, itemID: p.itemID }, { achievement: ach() });
      }
      // ⚠ 顺序（SOTA R12 §1 第 5 条）：**先算效果、再扣物品、最后一次 persist**。
      //   原来先 `bagAdd` + `persist()` 再分发效果 → 效果分支里任何一次异常都会让物品"扣了但没生效"，而且已经写盘。
      //   `note.ivch` 是绝对值、必须在扣减之后才填，所以连同扣减一起后移。
      // 同一族错（2026-10-22 实测发现）：note.ivch 的值是**绝对值**（index.js:64674 直接 setItem(n,o[n])）。
      // 以前 useItem 只回形状默认的空 note → 用完界面数量不变，还能反复"用"。
      var note = { skch: {}, ivch: {}, eqch: {} };
      // ⚠ SOTA R13 §1 第 3 条：效果阶段**只算增量、绝不写 s**。
      //   原来这里直接 `s.skills[String(schSkill)] = [1, 0, 1]`、下面直接 `s.hunger = newHg`，
      //   而 `loadSave()` 回的是 `_save` 内存本体（215-216 有缓存）→ 效果分支任意一次抛异常都会
      //   "内存改了一半、盘上没写、应答又被 dispatch:2605 的 catch 换成成功 ACK" → 三方不一致。
      //   现在副作用先攒进 pending*，到"扣减 + 落盘"那一段一次性应用（那段只有赋值，不会抛）。
      var pendingSkill = null;
      var pendingHunger = null;
      // Effect 28 = **称号**（SOTA R17 §3 第 1 步"看名字"就定了）：
      //   物品 7027 的名字 lang=2102250 =「"烙饼试吃员"称号」、7026 =「"测试员"称号」，
      //   Data1 = 2044/2045 命中 `player_title` 表（该表 410 行、id 到 2388）。
      //   客户端对 28 **没有本地分支**（switch 无 case 28、无 default）→ 只发 USE_ITEM；
      //   成功回调读 `titleID`（index.js:64812）：
      //     `AchieveModel.getAchieveData().hasOwnProperty(a.titleID) ? show(3187) : AchieveModel.showTitleReward([a.titleID])`
      //   ⇒ 应答带 `titleID` 就是"获得称号"的契约。
      var giveTitleId = (use > 0 && (fx || [])[0] === 28 && fx[1] > 0) ? fx[1] : 0;
      // ===== 秘籍：技能不存在 → 学会 1 级（上面 a 分支） =====
      if (schSkill > 0 && use > 0 && !knownSkill) {
        pendingSkill = String(schSkill);
        note.skch[pendingSkill] = [1, 0, 1];
        env.log('useItem 秘籍 ' + p.itemID + ' → 学会技能 ' + schSkill + ' 等级 1（假定：秘籍=入门口诀，无起始等级列）');
      }
      // 食物饱食度（2026-10-22 实测"吃完不加饱食度"）：客户端请求带 `hg`（当前剩余，index.js:65302），
      // 应答 `note.attrch.hunger` = 新值才会落地（142440-142441 `case "hunger"` 直接赋值；客户端不做本地应用）。
      //
      // R05 F2 两条更正（原实现直接 `hg + eat*use` 就发，等于无条件相信客户端上报值）：
      //   ① **非法 hg 不发 attrch**：非数字 / 负数 / 超 1e7 一律记日志并跳过，绝不写脏值进模型。
      //   ② **上限截断**：R06 第 6 条更正了优先级（原来的账本优先会用到过期上限）：
      //      本次请求自带的 `hglmt`（最新鲜）→ 活客户端模型 `hunger.limit`（属性变了它就变）
      //      → 账本 `s.hungerMax`（只作**下限保护**：若它小于活模型值，用活模型值覆盖它）。
      var eat = (typeof BZ_ITEMEAT !== 'undefined' && BZ_ITEMEAT[p.itemID]) || 0;
      var hgRaw = p.hg;
      var hgHas = (hgRaw !== undefined && hgRaw !== null && String(hgRaw) !== '');
      var curHg = hgHas ? Number(hgRaw) : NaN;
      var hgOk = hgHas && isFinite(curHg) && curHg >= 0 && curHg <= HG_MAX_SANE;
      if (eat > 0 && hgHas && !hgOk) {
        env.log('useItem ' + p.itemID + ' 忽略非法 hg=' + hgRaw + '（不发 attrch）');
      } else if (eat > 0 && hgOk) {
        var gain = eat * use;
        var raw = Math.floor(curHg) + gain;
        var cap = hungerCapOf(s, p.hglmt);
        var newHg = (cap > 0 && raw > cap) ? cap : raw;
        note.attrch = { hunger: newHg };
        pendingHunger = newHg;
        env.log('useItem ' + p.itemID + ' 饱食度 ' + Math.floor(curHg) + ' + ' + gain + ' → ' + newHg
          + (cap > 0 ? ('（上限 ' + cap + '）') : '（上限未知，不截断）'));
      }
      // ===== 药品：Effect==2 回血 / Effect==3 回内（R06 Q3 + 语言表实读，见 HANDOVER §23）=====
      // 证据：item 表 Data1 就是数值（例：老白干 Effect=3/Data1=50 ↔ lang 37007「可恢复50点内力」；
      //   小块豆沙月饼 Effect=2/Data1=1000 ↔ lang 37010「恢复1000点生命值」）；请求里带
      //   `curHp/maxhpLimit`（65278-65279）与 `curMp/maxmpLimit`（65280-65282），上限**现成**；
      //   落地键是 `attrch.curhp / attrch.curmp`（142406-142412）。
      var effKind = (typeof BZ_ITEMFUN !== 'undefined' && BZ_ITEMFUN[p.itemID]) || null;
      if (effKind) {
        var amt = (parseInt(effKind.a, 10) || 0) * use;
        if (amt > 0 && effKind.k === 'hp') {
          var hpCur = parseFloat(p.curHp), hpMax = parseFloat(p.maxhpLimit);
          if (isFinite(hpCur) && hpCur >= 0 && isFinite(hpMax) && hpMax > 0) {
            var newHp = Math.min(Math.floor(hpCur) + amt, Math.floor(hpMax));
            note.attrch = note.attrch || {};
            note.attrch.curhp = newHp;
            env.log('useItem ' + p.itemID + ' 生命 ' + Math.floor(hpCur) + ' + ' + amt + ' → ' + newHp + '（上限 ' + Math.floor(hpMax) + '）');
          } else {
            env.log('useItem ' + p.itemID + ' 回血类但请求缺 curHp/maxhpLimit（' + p.curHp + '/' + p.maxhpLimit + '），不发 attrch');
          }
        } else if (amt > 0 && effKind.k === 'mp') {
          var mpCur = parseFloat(p.curMp), mpMax = parseFloat(p.maxmpLimit);
          if (isFinite(mpCur) && mpCur >= 0 && isFinite(mpMax) && mpMax > 0) {
            var newMp = Math.min(Math.floor(mpCur) + amt, Math.floor(mpMax));
            note.attrch = note.attrch || {};
            note.attrch.curmp = newMp;
            env.log('useItem ' + p.itemID + ' 内力 ' + Math.floor(mpCur) + ' + ' + amt + ' → ' + newMp + '（上限 ' + Math.floor(mpMax) + '）');
          } else {
            env.log('useItem ' + p.itemID + ' 回内类但请求缺 curMp/maxmpLimit（' + p.curMp + '/' + p.maxmpLimit + '），不发 attrch');
          }
        }
      }
      // ===== 未建模效果（SOTA R14 §1 第 3 条 / Q1 的 (b′)，**用户裁定先不改行为**）=====
      //  现状：item 表 522 条里只有 21 条被 ITEMEAT/ITEMFUN/ITEMSCH 覆盖；其余物品走"扣掉 → 三个分支都不命中
      //  → 什么都不发"⇒ 玩家点了，物品没了，效果没有。这是**正在发生的损失**，但一刀切拒绝会误伤
      //  （客户端只对消耗品发 useItem，可获性表 248 是表内高估口径）。用户裁定：先保持行为不变，
      //  下轮导出 item.Effect 后按家族实现。所以这里**只留痕、不改行为**：
      //    · 每一次"扣了但没效果"都写 REJECT 日志并计入 meta.rejectStats（cap 应为 0 的消耗事件表）；
      //    · 常量 REJECT_UNMODELED_ITEMS 改成 true 就切到"拒绝且不扣"（码 3，表里已登记）。
      var unmodeledEffect = use > 0 && !(eat > 0) && !effKind && !(schSkill > 0);
      if (unmodeledEffect) {
        if (REJECT_UNMODELED_ITEMS) {
          noteReject('useItem', 'effectUnmodeled', 'itemID=' + p.itemID + ' x' + use + '（不扣）');
          return wrapped('useItem', { eRet: 3, itemID: p.itemID }, { achievement: ach() });
        }
        noteConsume('useItem', 'effectUnmodeled', 'itemID=' + p.itemID + ' x' + use + '（照扣、无效果；待按 Effect 家族实现）');
      }
      // ===== 一次性应用副作用 + 扣减 + 落盘（效果全部算完才走到这里，见上面的顺序说明）=====
      //  这一段只有赋值与 bagAdd（内部无 throw），所以"要么全生效、要么一个字节都不动"。
      if (pendingSkill) s.skills[pendingSkill] = [1, 0, 1];
      if (pendingHunger !== null) s.hunger = pendingHunger;
      if (giveTitleId) { s.titles = s.titles || {}; s.titles[String(giveTitleId)] = 1; }
      var left = bagAdd(s, p.itemID, -use);
      if (use < n) env.log('useItem ' + p.itemID + ' 截断：请求 x' + n + '，真实库存只有 ' + have + '（叠加量不可消耗）');
      if (use > 0) note.ivch[p.itemID] = parseInt(s.bag[p.itemID], 10) || 0;
      persist();
      env.log('useItem ' + p.itemID + ' x' + use + ' → 余 ' + left);
      var res = shaped('useItem', { itemID: p.itemID, note: note }) || ack('useItem', { note: note, achievement: ach() });
      // ⚠ 形状表把一批"分支选择器"字段也补上了（formulaID/taskID/mountID/gemId/...），
      //   而客户端是用 `hasOwnProperty` 判断"这批道具该不该走那条分支"的：
      //   formulaID=0 → `getItem(0,"formula")` 得 null → `n.getText(y.name)` 抛 TypeError
      //   （实测日志：useItem 之后 `Cannot read property 'name' of null @ index.js:64796`）。
      //   → 这些字段默认**一律不发**，只有对应效果真的实现时才显式塞进去。
      var inner = res && res['User.useItem'];
      if (inner) {
        // 完整清单（2026-10-22 复核 index.js:64754-64888 全部开关，23 项）：比首版多出
        // titleID/genGuDan/stealFlag/avatarInfo/itemRealgarMap/rewardSkillSkin/housekeeper/
        // weaponSkinId/emoId/rewardArray/getKnackIds/partners/mpnum。
        // 注意：光靠这里删没用——dispatch 的 fillShape 会把形状表里的字段补回来；
        // 真修复在 tools/gen_shapes.js 的 SHAPE_OMIT（形状表源头不再产出这些字段）。
        var BRANCH_ONLY = ['formulaID', 'mountID', 'titleID', 'bloodEndTime', 'dogid', 'hanyusuiTime', 'genGuDan', 'stealFlag',
          'endMonthCardTime', 'avatarInfo', 'itemRealgarMap', 'rewardSkillSkin', 'housekeeper', 'wId', 'wArr', 'weaponSkinId',
          'emoId', 'taskID', 'rewardArray', 'getKnackIds', 'partners', 'mpnum', 'gemId'];
        for (var bi = 0; bi < BRANCH_ONLY.length; bi++) delete inner[BRANCH_ONLY[bi]];
      }
      // Effect 28 = 称号：**必须放在 BRANCH_ONLY 删除之后**（'titleID' 就在那份清单里，
      // 上面那段是把"形状表补出来的分支选择器"清掉；这里是我们主动发的那一个）。
      if (giveTitleId && inner) {
        inner.titleID = giveTitleId;
        env.log('useItem ' + p.itemID + ' → 获得称号 ' + giveTitleId + '（应答 titleID，客户端 index.js:64812 走 showTitleReward）');
      }
      return res;
    },
    /** 出售：请求 `{saleArr:[[type,id,count], ...]}`（客户端真实形状，index.js:65191-65208；
     *  type 1=物品、2=装备实例 uid）。旧实现只认 `{itemID,num}`/裸 id → 玩家卖东西服务端什么都没做（实测）。
     *  仍然只结算真实库存：叠加量不可变卖（截断 + 日志）。
     *  2026-10-22（R04 第 0 位）：**结算铜钱**。客户端公式 o += parseInt(item.Price) * count
     *  （index.js:65207），但这笔 o 只用于 15e8 上限检查、客户端不本地加钱；应答消费端
     *  （index.js:64726-64742）只读 eRet / note.ivch / note.eqch，一个铜钱字段都不读
     *  → 必须服务端记账 + 主动推 RoleBaseInfo.coins，否则"卖东西=白扔"（不可逆的数据损失）。 */
    saleItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var arr = p.saleArr || [];
      var sold = [];
      var coins = 0, pricedN = 0, unpriced = [], ivch = {}, eqch = {};
      for (var i = 0; i < arr.length; i++) {
        var e = arr[i], id = 0, cnt = 1, equip = false;
        if (Array.isArray(e)) {
          equip = parseInt(e[0], 10) === 2;
          id = parseInt(e[1], 10) || 0;
          cnt = Math.abs(parseInt(e[2], 10) || 1);
        } else if (e && typeof e === 'object') {
          id = parseInt(e.itemID || e.id, 10) || 0;
          cnt = Math.abs(parseInt(e.num || e.itemNum || 1, 10) || 1);
        } else {
          id = parseInt(e, 10) || 0;
        }
        if (!(id > 0)) continue;
        // 计价要用的 itemID 必须在删账之前取（type>=2 的实例 uid≠itemID）
        var priceItemID = equip ? equipItemIDOf(s, id) : id;
        if (equip) {
          var inst = s.playerEquip[id];
          var haveE = Array.isArray(inst) ? (parseInt(inst[1], 10) || 0) : 0;
          if (cnt > haveE) { env.log('saleItem 装备 ' + id + ' 截断：请求 x' + cnt + '，真实持有 ' + haveE); cnt = haveE; }
          if (cnt > 0) {
            var leftE = haveE - cnt;
            if (leftE > 0) s.playerEquip[id] = [1, leftE];
            else {
              delete s.playerEquip[id];
              for (var slot in s.equipments) {
                if (s.equipments.hasOwnProperty(slot) && parseInt(s.equipments[slot], 10) === id) delete s.equipments[slot];
              }
            }
            // eqch 的格式由客户端监听器定死（index.js:64678-64694）：
            //   o[uid][0] == 0 → deleteEq(uid)；否则 o[uid][1] 交给 parseEq（type==1 时取 [1] 当 num）
            eqch[id] = (leftE > 0) ? [1, s.playerEquip[id]] : [0];
          }
        } else {
          var have = parseInt(s.bag[id], 10) || 0;
          if (cnt > have) { env.log('saleItem ' + id + ' 截断：请求 x' + cnt + '，真实库存只有 ' + have); cnt = have; }
          bagAdd(s, id, -cnt);
          // ivch 的语义是「物品id → **绝对值**」（index.js:64674-64676 直接 setItem(n, o[n])），
          // 不是"变了多少"。发增量会把 20 个卖 1 个改成 1 个（玩家实测），而且界面还有货→能反复卖。
          if (cnt > 0) ivch[id] = parseInt(s.bag[id], 10) || 0;
        }
        if (cnt > 0) {
          var unit = itemPrice(priceItemID);
          if (unit > 0) { coins += unit * cnt; pricedN++; }
          else unpriced.push(priceItemID);      // 表里 Price=0 的东西：不结算、只记日志
        }
        sold.push((equip ? 'eq' : '') + id + 'x' + cnt);
      }
      if (coins > 0) {
        // 初值口径：与 LoadGame 的缺省一致（loadSave 的 s.coins / baseValueAy[35] 都用 99999），
        // 否则首次卖出会从"面板显示 99999"跳到"余额 = 本次售价"
        if (typeof s.coins !== 'number') s.coins = 99999;
        s.coins += coins;
      }
      persist();
      env.log('saleItem ' + sold.join(',')
        + (coins > 0 ? ('  +' + coins + '铜钱（' + pricedN + ' 项计价）→ 余 ' + s.coins) : '  无铜钱结算')
        + (unpriced.length ? ('  零价物品:' + unpriced.join(',')) : ''));
      pushCoins(s.coins);
      // ⚠ 全部投射都走应答里的 note，不要再自己 setItem/deleteEq：客户端对 note 的处理
      //   = `for (var E in note) dispatch(E, note[E])`（index.js:59325），而 ivch/eqch/eco 三个
      //   事件各有官方监听器（INVENTORY_CHNG 64674 / EQ_CHNG 64678 / ECONOMY_CHNG 64698），
      //   会把**绝对值**写进模型并刷新 UI。之前多发一份增量 → 数量被覆盖（20 卖 1 变 1）。
      // note.ivch / note.eqch 的**键**是客户端刷新被卖格子的依据（index.js:64730）。
      // 而且客户端的通用拆包会把 note 的**每个键当事件名派发**：`for (var E in g[I].note) dispatch(E, ...)`
      // （index.js:59325），而 `HttpConst.INVENTORY_CHNG = "ivch"`（59569）、`EQ_CHNG = "eqch"`（59572）
      // → 回这两个键本身就触发了"背包/装备变了"的广播，不需要另外造事件。
      // ⚠ note 必须落在 `User.saleItem` 里（消费端读 o.note.ivch），不能挂在信封顶层 ——
      //   `ack(name, extra)` 的 extra 是加到信封根上的（achievement 才走那条），所以这里不用 ack。
      var note = { ivch: ivch, eqch: eqch, eco: { coins: s.coins } };
      var payload = { eRet: 1, note: note };
      return shaped('saleItem', payload) || wrapped('saleItem', payload, { achievement: ach() });
    },
    /** 买店货：请求 `{itemID,itemNum}`（客户端真名，index.js:65257-65262 `InventoryModel.buyItem`）。
     *  **这是一次真正的交易**（2026-10-22 修，玩家实测"买 1011 个糖葫芦一分没扣"）：
     *   - 单价 = item 表 `BuyPrice`：客户端建货架时就是 `price: s.BuyPrice`（scripts2.js:46443/46452），
     *     付款前本地只做 `o = price*counts` 与 `RoleBaseInfo.coins` 的比较（scripts2.js:46521）；
     *   - 应答消费端（index.js:64743-64753）只读 `eRet` 与 `note.ivch/eqch`，**不读任何货币字段**
     *     → 扣钱与投放都必须服务端做，并主动推 RoleBaseInfo.coins；
     *   - 物品按 `grantItem` 分流（Type=1 进 playerEquip，其余进 bag），再按**绝对值**推回客户端，
     *     否则买完背包界面不刷新（`onBuySuccess` 只重读 `RoleBaseInfo.getItemNum`，scripts2.js:46535）；
     *   - 钱不够 → `eRet:4`（客户端消费端对 4 会弹提示，index.js:64752）。 */
    buyShopItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var itemID = parseInt(p.itemID, 10) || 0;
      var n = Math.abs(parseInt(p.itemNum, 10) || 1);
      if (!(itemID > 0) || n <= 0) {
        env.log('buyShopItem 忽略无效请求 ' + JSON.stringify(p));
        return wrapped('buyShopItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      var unit = itemBuyPrice(itemID);
      if (!(unit > 0)) {
        // 表里 BuyPrice=0 的物品不进任何货架；真收到请求就拒绝，不白送
        env.log('buyShopItem ' + itemID + ' 无买价（BuyPrice=0），拒绝');
        return wrapped('buyShopItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      var cost = unit * n;
      if (typeof s.coins !== 'number') s.coins = 99999;   // 与 LoadGame 缺省同口径
      if (cost > s.coins) {
        env.log('buyShopItem ' + itemID + ' x' + n + ' 拒绝：需 ' + cost + '，只有 ' + s.coins);
        return wrapped('buyShopItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      s.coins -= cost;
      grantItem(s, itemID, n);
      persist();
      env.log('buyShopItem ' + itemID + ' x' + n + '  单价 ' + unit + '，扣 ' + cost + ' 铜钱 → 余 ' + s.coins);
      // 投射全部走 note（客户端 note 的每个键都会 dispatch 成事件，各自有官方监听器）：
      //   ivch = {物品id: **买完后的绝对数量**}（64674 直接 setItem(n, o[n])，不是增量）
      //   eqch = {uid: [1, [type,num,...]]}（64678-64690，0 开头表示删除）
      //   eco  = {coins: 新余额}（64700 直接赋值 RoleBaseInfo.coins，并顺带派发 SHOP_BUY_ITEM 刷新）
      var note = { ivch: {}, eqch: {}, eco: { coins: s.coins } };
      if (itemTypeOf(itemID) === 1) {
        note.eqch[itemID] = [1, s.playerEquip[itemID]];
      } else {
        note.ivch[itemID] = parseInt(s.bag[itemID], 10) || 0;
      }
      var payload = { eRet: 1, itemID: itemID, note: note };
      return shaped('buyShopItem', payload) || wrapped('buyShopItem', payload, { achievement: ach() });
    },
    /** NPC 金条商店的货架：`User.getShopItem {npcid}`（index.js:59606 ← SpecialGoodsModel:123380）。
     *  客户端拿到应答后走 `NormalShopUI.resListSuccess`，它第一句就是
     *  `if (e.hasOwnProperty("ShopArray"))`（scripts2.js:46462），缺这一段整段不执行 → 商店开出空白。
     *  货架数据来自配置表（BZ_NPCSHOP，random_shop / house_shop / lh_shop 里带 npc 的行）。 */
    getShopItem: function (p) {
      p = p || {};
      var npc = parseInt(p.npcid, 10) || 0;
      var sh = npcShopOf(npc);
      var items = sh ? sh.i : [], prices = sh ? sh.p : [];
      env.log('getShopItem npc=' + npc + ' → ' + items.length + ' 件货');
      return wrapped('getShopItem', { eRet: 1, ShopArray: { item: items, price: prices } }, { achievement: ach() });
    },
    /** 金条购买：`User.buySpecialShopItem {npcid,itemID,itemNum}`（index.js:59607 ← 123386）。
     *  付款货币是**金条**：NormalShopUI.onBuyBtn 的 npcId>0 分支比的是 `RoleBaseInfo.gold`（scripts2.js:46521）。
     *  扣款项走应答里的 `note.eco.gold`（客户端 ECONOMY_CHNG 直接赋值，index.js:64708）。
     *  ⚠ 金条是**我方维护的离线账**，不存在任何真实付费渠道（用户 2026-10-22 裁定）。 */
    buySpecialShopItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var npc = parseInt(p.npcid, 10) || 0;
      var itemID = parseInt(p.itemID, 10) || 0;
      var n = Math.abs(parseInt(p.itemNum, 10) || 1);
      if (!(itemID > 0) || n <= 0) return wrapped('buySpecialShopItem', { eRet: 4, note: {} }, { achievement: ach() });
      var sh = npcShopOf(npc);
      var idx = sh ? sh.i.indexOf(itemID) : -1;
      if (idx < 0) {
        env.log('buySpecialShopItem npc=' + npc + ' item=' + itemID + ' 不在货架上，拒绝');
        return wrapped('buySpecialShopItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      var unit = parseInt(sh.p[idx], 10) || 0;
      var cost = unit * n;
      if (typeof s.gold !== 'number') s.gold = 99999;
      if (!(unit > 0) || cost > s.gold) {
        env.log('buySpecialShopItem npc=' + npc + ' item=' + itemID + ' x' + n + ' 拒绝：需 ' + cost + ' 金条，只有 ' + s.gold);
        return wrapped('buySpecialShopItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      s.gold -= cost;
      grantItem(s, itemID, n);
      persist();
      env.log('buySpecialShopItem npc=' + npc + ' item=' + itemID + ' x' + n + '  单价 ' + unit + ' 金条，扣 ' + cost + ' → 余 ' + s.gold);
      var note = { ivch: {}, eqch: {}, eco: { gold: s.gold } };
      if (itemTypeOf(itemID) === 1) note.eqch[itemID] = [1, s.playerEquip[itemID]];
      else note.ivch[itemID] = parseInt(s.bag[itemID], 10) || 0;
      var payload = { eRet: 1, itemID: itemID, note: note };
      return shaped('buySpecialShopItem', payload) || wrapped('buySpecialShopItem', payload, { achievement: ach() });
    },
    /** 流言/随机商店的货架：`User.GetSpecialShopData {npcID}`（index.js:59618 ← 1641，NPC Type 33/35）。
     *  消费端 specialShopCallBack（index.js:1467-1483）只判 `hasOwnProperty("shopData")`，缺了整段不开；
     *  随后 SaleShopQiUI.setShowData（scripts2.js:55231-55238）把 `e.shopData` 当**以物品 id 为键的对象**，
     *  按 `payment==2 && parseInt(page)==页号+1` 筛页（55272-55286），条目读 payment/page/limit/isserver/endtime/ID。
     *  `curGold` 被 showSaleShopUI 用来同步金条显示（scripts2.js:55064-55066）。 */
    GetSpecialShopData: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var npc = parseInt(p.npcID, 10) || 0;
      var sh = npcShopOf(npc);
      var shopData = {};
      if (sh && sh.i) {
        for (var si = 0; si < sh.i.length; si++) {
          var sid = sh.i[si];
          var meta = (sh.m && sh.m[sid]) || {};
          shopData[sid] = {
            ID: sid,
            itemId: sid,
            payment: parseInt(meta.pay, 10) || 0,
            page: parseInt(meta.pg, 10) || 0,
            isserver: parseInt(meta.is, 10) || 0,
            endtime: parseInt(meta.et, 10) || 0,
            limit: parseInt(sh.l[si], 10) || 0,
            price: parseInt(sh.p[si], 10) || 0,
          };
        }
      }
      env.log('GetSpecialShopData npc=' + npc + ' → ' + Object.keys(shopData).length + ' 件货');
      return wrapped('GetSpecialShopData', {
        eRet: 1,
        curGold: typeof s.gold === 'number' ? s.gold : 99999,
        selfData: {},
        shopData: shopData,
      }, { achievement: ach() });
    },
    /** 流言商店购买：`User.BuyAcitivityShop {itemID,itemNum}`（客户端原文拼写，index.js:59619 ← 1635）。
     *  消费端 activeShppCallBack（index.js:1484-1511）：1==eRet 时读 e.itemID/e.itemNum 并派发 SALE_RANDOM_SHOP。
     *  货币是**金条**：BuyItemUI6.onBuyClick 比的是 RoleBaseInfo.gold（scripts2.js:7441），
     *  扣款走 note.eco.gold（绝对值，index.js:64708 直接赋值）。 */
    BuyAcitivityShop: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var itemID = parseInt(p.itemID, 10) || 0;
      var n = Math.abs(parseInt(p.itemNum, 10) || 1);
      if (!(itemID > 0) || n <= 0) return wrapped('BuyAcitivityShop', { eRet: 4, note: {} }, { achievement: ach() });
      var shelves = (typeof BZ_NPCSHOP !== 'undefined') ? BZ_NPCSHOP : null;
      var hit = null;
      if (shelves) {
        for (var npk in shelves) {
          if (!shelves.hasOwnProperty(npk)) continue;
          var bx = shelves[npk];
          var idx = (bx && bx.i) ? bx.i.indexOf(itemID) : -1;
          if (idx >= 0) { hit = { box: bx, idx: idx }; break; }
        }
      }
      if (!hit) {
        env.log('BuyAcitivityShop item=' + itemID + ' 不在任何货架，拒绝');
        return wrapped('BuyAcitivityShop', { eRet: 4, note: {} }, { achievement: ach() });
      }
      var unit = parseInt(hit.box.p[hit.idx], 10) || 0;
      var cost = unit * n;
      if (typeof s.gold !== 'number') s.gold = 99999;
      if (!(unit > 0) || cost > s.gold) {
        env.log('BuyAcitivityShop item=' + itemID + ' x' + n + ' 拒绝：需 ' + cost + ' 金条，只有 ' + s.gold);
        return wrapped('BuyAcitivityShop', { eRet: 4, note: {} }, { achievement: ach() });
      }
      s.gold -= cost;
      grantItem(s, itemID, n);
      persist();
      env.log('BuyAcitivityShop item=' + itemID + ' x' + n + '  单价 ' + unit + ' 金条，扣 ' + cost + ' → 余 ' + s.gold);
      var note = { ivch: {}, eqch: {}, eco: { gold: s.gold } };
      if (itemTypeOf(itemID) === 1) note.eqch[itemID] = [1, s.playerEquip[itemID]];
      else note.ivch[itemID] = parseInt(s.bag[itemID], 10) || 0;
      var payload = { eRet: 1, itemID: itemID, itemNum: n, note: note };
      return shaped('BuyAcitivityShop', payload) || wrapped('BuyAcitivityShop', payload, { achievement: ach() });
    },
    /** 兑换商店货架：`User.getChangeShop {npcid}`（index.js:59695 ← 47101）。
     *  消费端 ExchangeModel（index.js:47076-47078）：1==eRet 时 dispatch EXCHANGE_SHOP_DATA(e.shopObj)；
     *  ExchangeShowUI 把 shopObj 当"数组的数组"渲染（行结构见 BZ_EXCHANGE 注释）。 */
    getChangeShop: function (p) {
      p = p || {};
      var npc = parseInt(p.npcid, 10) || 0;
      var rows = (typeof BZ_EXCHANGE !== 'undefined' && BZ_EXCHANGE[npc]) || [];
      env.log('getChangeShop npc=' + npc + ' → ' + rows.length + ' 行');
      return wrapped('getChangeShop', { eRet: 1, shopObj: rows }, { achievement: ach() });
    },
    /** 兑换购买：`User.exchangeItem {itemID,itemNum,npcid}`（index.js:59698 ← 47112）。
     *  请求里的 itemID 是**兑换行 id**（ExchangeBuyUI.startBuyReqCallBack 传 objectItem[0]），
     *  成本在 BZ_EXCHANGE 行[4]（"物品id,数量|..."，按份数乘）。成功后客户端用回显的
     *  itemID(真物品 id)/itemNum 刷新拥有数（index.js:47090-47096）。 */
    exchangeItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var npc = parseInt(p.npcid, 10) || 0;
      var rowId = parseInt(p.itemID, 10) || 0;
      var n = Math.abs(parseInt(p.itemNum, 10) || 1);
      var rows = (typeof BZ_EXCHANGE !== 'undefined' && BZ_EXCHANGE[npc]) || [];
      var row = null;
      for (var ri = 0; ri < rows.length; ri++) {
        if (parseInt(rows[ri][0], 10) === rowId) { row = rows[ri]; break; }
      }
      if (!row || n <= 0) {
        env.log('exchangeItem 找不到兑换行 npc=' + npc + ' id=' + rowId);
        return wrapped('exchangeItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      var itemID = parseInt(row[2], 10) || 0;
      var per = Math.max(parseInt(row[3], 10) || 1, 1);
      var costStr = String(row[4] || '');
      var need = [];
      var segs = costStr.split('|');
      for (var cj = 0; cj < segs.length; cj++) {
        var kv = segs[cj].split(',');
        var cid = parseInt(kv[0], 10) || 0;
        var cc = parseInt(kv[1], 10) || 0;
        if (cid > 0 && cc > 0) need.push({ id: cid, count: cc * n });
      }
      if (!need.length) {
        env.log('exchangeItem 行 ' + rowId + ' 成本串为空，拒绝');
        return wrapped('exchangeItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      // 奖励能不能落地**先判**：货币但落不了账 → 直接拒，不许先把成本扣掉再发不出去。
      // （表里 118 行货币奖励都命中 CURRENCY_SLOTS：潜能 111 / 银两 6 / 金条 1；
      //   这里的拒绝分支只为 `2` 与 `4002(经验)` 兜底，当前内容零命中。）
      var walletReward = isCurrencyItem(itemID);
      if (walletReward && !currencySlot(itemID)) {
        env.log('exchangeItem 行 ' + rowId + ' 奖励 id ' + itemID
          + ' 客户端算货币但没有可持久化的钱包字段 → 拒绝，未扣成本');
        return wrapped('exchangeItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      for (var ck = 0; ck < need.length; ck++) {
        var have = parseInt(s.bag[need[ck].id], 10) || 0;
        if (have < need[ck].count) {
          env.log('exchangeItem 成本不足: 需要 ' + need[ck].id + '×' + need[ck].count + '，只有 ' + have);
          return wrapped('exchangeItem', { eRet: 4, note: {} }, { achievement: ach() });
        }
      }
      for (ck = 0; ck < need.length; ck++) bagAdd(s, need[ck].id, -need[ck].count);
      var grant = per * n;
      // 奖励是货币 → 写钱包 + note.eco（客户端 ECONOMY_CHNG 直接赋 RoleBaseInfo，index.js:64698-64725）
      // 不是货币 → 照旧 grantItem（物品进 bag、装备进 PlayerEquip，再按绝对值投射）
      var ecoGain = walletReward ? grantCurrency(s, itemID, grant) : null;
      if (!walletReward) grantItem(s, itemID, grant);
      persist();
      var note = { ivch: {}, eqch: {} };
      for (ck = 0; ck < need.length; ck++) note.ivch[need[ck].id] = parseInt(s.bag[need[ck].id], 10) || 0;
      if (walletReward) {
        note.eco = ecoGain;          // 货币**不进** ivch：客户端取货币只认 RoleBaseInfo.getItemNum
      } else if (itemTypeOf(itemID) === 1) note.eqch[itemID] = [1, s.playerEquip[itemID]];
      else note.ivch[itemID] = parseInt(s.bag[itemID], 10) || 0;
      env.log('exchangeItem npc=' + npc + ' 行 ' + rowId + ' → ' + itemID + '×' + grant
        + (walletReward ? '（货币 → 钱包 ' + JSON.stringify(ecoGain) + '）' : ''));
      return wrapped('exchangeItem', { eRet: 1, itemID: itemID, itemNum: grant, note: note }, { achievement: ach() });
    },
    /** 正邪商店货架：`User.getGoodAndEvilShopData`（index.js:60444 常量；发送点 scripts3.js:36525）。
     *  消费端 onGetShopData（scripts3.js:36527-36540）：e.shop → GoodEvilModel.shopData，
     *  元素客户端读 id/Name/Price/rankopen/rankNum/buyCount/Data/Description（37581-37614、34950-34959）。
     *  声望门槛在**客户端**算：getMyPrestigeLv() 读 goodEvilPrestige（未定义 → 恒 1，rankopen=1 的可买）。 */
    getGoodAndEvilShopData: function () {
      var rows = (typeof BZ_GESHOP !== 'undefined' && BZ_GESHOP) || [];
      var shop = [];
      for (var gi = 0; gi < rows.length; gi++) {
        var gr = rows[gi];
        shop.push({
          id: gr.id, Name: gr.Name, Description: gr.Description, Data: gr.Data,
          Price: gr.Price, camp: gr.camp, rankopen: gr.rankopen,
          rankNum: (gr.rankNums && gr.rankNums[0]) || 0,
          buyCount: 0,
        });
      }
      env.log('getGoodAndEvilShopData → ' + shop.length + ' 件');
      return wrapped('getGoodAndEvilShopData', { eRet: 1, shop: shop, nextRefreshTime: 0 }, { achievement: ach() });
    },
    /** 正邪商店购买：`User.buyGoodAndEvilShopItem {id,itemNum}`（scripts3.js:36511 ← 36510）。
     *  货币 = **正邪贡献**（GoodEvilBuyUI.onClickBtnBuy 比 goodEvilContribution，34964）；
     *  应答读 eRet/contribution/rewardArray/id/buyCount（onBuy 36516-36523、refreshShopData 36504-36509）。 */
    buyGoodAndEvilShopItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var id = parseInt(p.id, 10) || 0;
      var n = Math.abs(parseInt(p.itemNum, 10) || 1);
      var rows = (typeof BZ_GESHOP !== 'undefined' && BZ_GESHOP) || [];
      var row = null;
      for (var gi = 0; gi < rows.length; gi++) { if (rows[gi].id === id) { row = rows[gi]; break; } }
      if (!row || n <= 0) {
        env.log('buyGoodAndEvilShopItem 找不到货 id=' + id);
        return wrapped('buyGoodAndEvilShopItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      var unit = parseInt(row.Price, 10) || 0;
      var cost = unit * n;
      if (typeof s.contribution !== 'number') s.contribution = 0;
      if (!(unit > 0) || cost > s.contribution) {
        env.log('buyGoodAndEvilShopItem ' + id + ' x' + n + ' 拒绝：需 ' + cost + ' 贡献，只有 ' + s.contribution);
        return wrapped('buyGoodAndEvilShopItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      s.contribution -= cost;
      var gid = parseInt(row.Data[0], 10) || 0;
      var grant = Math.max(parseInt(row.Data[1], 10) || 1, 1) * n;
      grantItem(s, gid, grant);
      persist();
      env.log('buyGoodAndEvilShopItem ' + id + ' x' + n + ' → ' + gid + '×' + grant + '，贡献余 ' + s.contribution);
      var note = { ivch: {}, eqch: {} };
      if (itemTypeOf(gid) === 1) note.eqch[gid] = [1, s.playerEquip[gid]];
      else note.ivch[gid] = parseInt(s.bag[gid], 10) || 0;
      var ra = {}; ra[gid] = grant;
      return wrapped('buyGoodAndEvilShopItem', { eRet: 1, contribution: s.contribution, rewardArray: ra, id: row.id, buyCount: n, note: note }, { achievement: ach() });
    },

    /** 商城入口货架：`User.GetShopAllActive {…}`（2026-10-24：此前走 SHAPED 兜底，应答缺 shopActiveList
     *  → 客户端 onGetShopAllActive（index.js:131276）把 undefined 派给 STORE_ACTIVE_LIST_UI，
     *  addShopAction/shopDatasList（scripts2.js:8952/8973/8987）读 .length 崩 → 商城整页空白"没啦"）。
     *  消费端 shopDatasList（8951-8968）：拿 shop_entrance 表的**行键**与 shopActiveList 求交集，
     *  交集里的才渲染（storeDatas[0] 还是"普通商店"固定位）。所以回全量行键 = 菜单全开。
     *  shopActiveData / activeEndTime 都有 hasOwnProperty 守卫（131274/131275）→ 不回。
     *  各商店内部的货架是后续批次的事；这一跳只负责"菜单不再空、不再崩"。 */
    GetShopAllActive: function () {
      var rows = (typeof BZ_SHOP_ENTRANCE !== 'undefined' && BZ_SHOP_ENTRANCE) || {};
      var list = [];
      for (var k in rows) { if (rows.hasOwnProperty(k) && k !== '__meta') list.push(parseInt(k, 10)); }
      env.log('GetShopAllActive → ' + list.length + ' 个商城入口');
      return wrapped('GetShopAllActive', { eRet: 1, shopActiveList: list }, { achievement: ach() });
    },
    /* ===== 第 1 批「商店交易」（2026-10-24，关联分析 C01 批次，证据：shop-batch1\recon\侦察.md） =====
     * 拒绝码取各动作客户端有提示分支的值；没有提示分支的按家法回 eRet:4。
     * 所有购买先查价、钱不够一分不动（守住上游修过的"钱不够白拿"坑），成功才 persist()。
     * 改动存档的应答带 note.eco（新余额绝对值，客户端 ECONOMY_CHNG 监听器 index.js:64698-64723 直写模型），
     * 发放物品用 grantItem + note.ivch/eqch（buyShopItem 同款）。 */

    /** 配方购买（炼丹开炉）：`User.buyFormula {id, type}`（send scripts3.js:7072-7078）。
     *  消费端 onBuyFormulaData（scripts3.js:7027-7042）：1==eRet 读
     *  e.data.{type,state,id,freeNum,endTime,gear} 驱动炼丹状态机；2==eRet 弹 getText(1014)。
     *  计价：客户端自己比 yuanbao >= GetYuanbao（scripts3.js:6902）；我们 getAlchemyData（1639-1645）
     *  不发 GetYuanbao，客户端兜底价 alchemyPrice=10（6987）→ 这里同价收 10 元宝。
     *  燃炼时长取 formula 表 time 列（BZ_FORMULA，找不到行就 1 小时），存 s.alchemy 账本。 */
    buyFormula: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var frow = (typeof BZ_FORMULA !== 'undefined' && BZ_FORMULA) ? BZ_FORMULA[String(p.id)] : null;
      // 价 = formula 表 price 列（面板格子显示的就是它，GetYuanbao = price），找不到行直接拒（不扣钱）
      var cost = (frow && frow.p > 0) ? frow.p : 0;
      if (!(cost > 0) || !(s.yuanbao >= cost)) {
        env.log('buyFormula id=' + p.id + ' 拒绝：需 ' + cost + ' 元宝，只有 ' + s.yuanbao);
        return wrapped('buyFormula', { eRet: 2, note: {} }, { achievement: ach() });   // 2 → 客户端弹 getText(1014)
      }
      var secs = (frow && frow.tm > 0) ? frow.tm : 3600;
      var endTime = env.now() + secs * 1000;
      s.yuanbao -= cost;
      s.alchemy = { type: parseInt(p.type, 10) || 0, id: p.id, endTime: endTime };
      persist();
      env.log('buyFormula id=' + p.id + ' type=' + p.type + ' → 扣 ' + cost + ' 元宝，炼 ' + secs + ' 秒');
      return wrapped('buyFormula', { eRet: 1, data: { state: 1, type: parseInt(p.type, 10) || 0, id: p.id, freeNum: 0, endTime: endTime, gear: p.id }, note: { eco: { yuanbao: s.yuanbao } } }, { achievement: ach() });
    },

    /** 客栈货架：`User.getInnShop {}`（send index.js:62568-62570）。
     *  消费端 onShowInnShop（62595-62601）：1==eRet 读 e.innSimShopDatas 开 InnShop 面板。
     *  货架 = sim_shopconfig 全行原样（id/type/name/des/food_bag/cookbook/price/sell_limit）。 */
    getInnShop: function () {
      var rows = (typeof BZ_INNSHOP !== 'undefined' && BZ_INNSHOP) || {};
      var out = [];
      for (var k in rows) { if (rows.hasOwnProperty(k) && k !== '__meta') out.push(rows[k]); }
      env.log('getInnShop → ' + out.length + ' 个货架');
      return wrapped('getInnShop', { eRet: 1, innSimShopDatas: out }, { achievement: ach() });
    },

    /** 客栈排行：`User.getInnRank {}`（send index.js:62565-62567）。
     *  消费端 onShowInnRank（62602-62608）：1==eRet 读 e.innRankList 开 HotRank。离线无榜 → 空列表。 */
    getInnRank: function () {
      return wrapped('getInnRank', { eRet: 1, innRankList: [] }, { achievement: ach() });
    },

    /** 客栈购买：`User.innBuyShop {shopId, shopCount}`（send index.js:62571-62576）。
     *  消费端 onShopBuyItem（62577-62594）：1==eRet 读 e.foodBag（{食物id:绝对数}）、
     *  e.cookBook（菜谱 id 数组，绝对清单）、e.innSimShopData；6==eRet 弹 getText(202201181)。
     *  货架行：food_bag = "食物id,数量|…"，cookbook = 0 或菜谱 id；价 = price（铜钱）× shopCount。
     *  账本 s.inn = {foodBag:{id:绝对数}, cookBook:[…]}（新顶层键；validateSave/guardSave 放行，
     *  侦察 C3）。⚠ 钱不够先拒绝、一分不动。 */
    innBuyShop: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var shopId = String(p.shopId != null ? p.shopId : '');
      var cnt = Math.max(parseInt(p.shopCount, 10) || 1, 1);
      var rows = (typeof BZ_INNSHOP !== 'undefined' && BZ_INNSHOP) || {};
      var row = rows[shopId];
      if (!row) {
        env.log('innBuyShop 找不到货架 shopId=' + shopId);
        return wrapped('innBuyShop', { eRet: 6, note: {} }, { achievement: ach() });   // 6 → 客户端有提示分支
      }
      var cost = (parseInt(row.price, 10) || 0) * cnt;
      if (!(cost > 0) || !(s.coins >= cost)) {
        env.log('innBuyShop ' + shopId + ' x' + cnt + ' 拒绝：需 ' + cost + ' 铜钱，只有 ' + s.coins);
        return wrapped('innBuyShop', { eRet: 6, note: {} }, { achievement: ach() });
      }
      s.coins -= cost;
      s.inn = s.inn || {};
      if (!s.inn.foodBag || typeof s.inn.foodBag !== 'object') s.inn.foodBag = {};
      if (!Array.isArray(s.inn.cookBook)) s.inn.cookBook = [];
      if (typeof row.food_bag === 'string' && row.food_bag !== '0' && row.food_bag.length) {
        var parts = row.food_bag.split('|');
        for (var i = 0; i < parts.length; i++) {
          var mm = parts[i].split(',');
          var fid = String(parseInt(mm[0], 10) || 0);
          var fc = parseInt(mm[1], 10) || 0;
          if (!(parseInt(fid, 10) > 0) || !(fc > 0)) continue;
          s.inn.foodBag[fid] = (parseInt(s.inn.foodBag[fid], 10) || 0) + fc * cnt;
        }
      }
      var cb = parseInt(row.cookbook, 10) || 0;
      if (cb > 0 && s.inn.cookBook.indexOf(cb) < 0) s.inn.cookBook.push(cb);
      persist();
      env.log('innBuyShop ' + shopId + ' x' + cnt + ' → 扣 ' + cost + ' 铜钱，foodBag ' + Object.keys(s.inn.foodBag).length + ' 种，cookBook ' + s.inn.cookBook.length + ' 个');
      return wrapped('innBuyShop', { eRet: 1, foodBag: s.inn.foodBag, cookBook: s.inn.cookBook, innSimShopData: row, note: { eco: { coins: s.coins } } }, { achievement: ach() });
    },

    /** 门派商店购买：`User.buySchoolShop {schoolId, goodsId, count}`（send index.js:114021-114028）。
     *  消费端 onBuySchoolShop（113672-113680）：1==eRet 读 e.updateSchoolContribution[schoolId]
     *  （扣完的**绝对余量**）、e.rewardArray；e.equipObj 形状表标 switch，可缺省不回。
     *  表 sect_shop：item=物品id，price=门派贡献价。货币 = s.schoolContribution（ensureLedger 缺省 0，
     *  与正邪贡献 s.contribution 是两个钱包），来源只有维护动作 bzGrantCur。 */
    buySchoolShop: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var gid = parseInt(p.goodsId, 10) || 0;
      var schoolId = parseInt(p.schoolId, 10) || 0;
      var n = Math.max(parseInt(p.count, 10) || 1, 1);
      var rows = (typeof BZ_SECTSHOP !== 'undefined' && BZ_SECTSHOP) || {};
      var row = rows[String(gid)];
      if (!row || !(parseInt(row.item, 10) > 0)) {
        env.log('buySchoolShop 找不到货 goodsId=' + gid);
        return wrapped('buySchoolShop', { eRet: 4, note: {} }, { achievement: ach() });
      }
      var item = parseInt(row.item, 10);
      var cost = (parseInt(row.price, 10) || 0) * n;
      if (typeof s.schoolContribution !== 'number') s.schoolContribution = 0;
      if (!(cost > 0) || !(s.schoolContribution >= cost)) {
        env.log('buySchoolShop ' + gid + ' x' + n + ' 拒绝：需 ' + cost + ' 门派贡献，只有 ' + s.schoolContribution);
        return wrapped('buySchoolShop', { eRet: 4, note: {} }, { achievement: ach() });
      }
      s.schoolContribution -= cost;
      grantItem(s, item, n);
      persist();
      env.log('buySchoolShop ' + gid + ' x' + n + ' → ' + item + '×' + n + '，门派贡献余 ' + s.schoolContribution);
      var note = { ivch: {}, eqch: {} };
      if (itemTypeOf(item) === 1) note.eqch[item] = [1, s.playerEquip[item]];
      else note.ivch[item] = parseInt(s.bag[item], 10) || 0;
      var ra = {}; ra[item] = n;
      var upd = {}; upd[schoolId] = s.schoolContribution;
      return wrapped('buySchoolShop', { eRet: 1, updateSchoolContribution: upd, rewardArray: ra, id: row.ID, buyCount: n, note: note }, { achievement: ach() });
    },

    /** 金条商城货架：`User.GetMarketList {}`（send index.js:130969，参数空对象）。
     *  回调 index.js:130760-130773：1==eRet 时 dispatch STORE_SHOW_UI{type:1, market, back}，
     *  再读 serverTime / nextRefreshTime / buyTimes（buyTimes 用 hasOwnProperty 守卫）。
     *  消费端 scripts2.js:8507-8524（openBuyGoldEvent，type 1）：**把 market 当行集合遍历**
     *  `for (var l in a) { var u = a[l]; ... }`，每行按位置取：
     *    [0]=ID [1]=Type [2]=Name [3]=Description [4]=Data [5]=price
     *    [6]=num [7]=limitType [8]=buyCount [10]=icon（**[9] 没人读**，留占位否则 icon 错位）
     *  ⚠ 形状表把 market 记成 `number:0` —— 这是"经事件派发/转手一层后失明"的同一类误判
     *    （noteBadSwitches 的注释里记着 getChangeShop.shopObj 栽在同一个坑）。
     *    兜底给 0 ⇒ `for..in 数字` 零次迭代 ⇒ listData 空 ⇒ **金条商城点不开**（实测 SHAPED 441B）。
     *  表 BZ_MALL 是**对象行**（ID/Type/Name/Description/Price/Num/Limit/icon/Data），这里转置成位置数组；
     *  真扣款与发货仍由 BuyMarketItem 的 Price/Data 决定（本 handler 只供货架，不碰账本）。 */
    GetMarketList: function () {
      var s = ensureLedger(loadSave());
      var rows = [];
      var tbl = (typeof BZ_MALL !== 'undefined' && BZ_MALL) || {};
      for (var k in tbl) {
        if (!tbl.hasOwnProperty(k)) continue;
        // ⚠ 各表都挂了 __meta 统计属性（gen_shop_tables.js 加的，可枚举），不是数据行。
        //   不跳过就会多出一行全长 undefined 的空白商品（实测：BZ_MALL 真实 39 行，原实现发了 40 行）。
        if (k === '__meta') continue;
        var m = tbl[k];
        rows.push([
          m.ID, m.Type, m.Name, m.Description,
          Array.isArray(m.Data) ? m.Data : [],
          m.Price, m.Num, m.Limit,
          0, 0, m.icon,
        ]);
      }
      env.log('GetMarketList → ' + rows.length + ' 行（BZ_MALL 转置为位置数组）');
      return wrapped('GetMarketList', {
        eRet: 1,
        market: rows,
        buyTimes: parseInt(s.marketBuyTimes, 10) || 0,
        nextRefreshTime: 0,
        serverTime: 0,
      }, { achievement: ach() });
    },

    /** 元宝商城（离线直购）：`User.BuyMarketItem {roleID, ID, itemNum}`（send index.js:131202-131211）。
     *  消费端 onPaySuccess（131233-131258）：读 e.userGold（**扣完的金条绝对值**，131234 直写
     *  RoleBaseInfo.gold）、e.buyTimes；1==eRet 按 mall 表 Type 本地发放；4==eRet 弹 getText(6000575)。
     *  表 mall：Price=金条价，Data=[物品id,数量]；Type 1=物品 / 2=寒玉髓 buff（Data[1]=秒，
     *  样例 1043→86400）/ 3=传送（客户端自置 teleport=1）。⚠ 不走任何真支付，只扣存档金条。 */
    BuyMarketItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var id = parseInt(p.ID, 10) || 0;
      var n = Math.max(parseInt(p.itemNum, 10) || 1, 1);
      var rows = (typeof BZ_MALL !== 'undefined' && BZ_MALL) || {};
      var row = rows[String(id)];
      if (!row) {
        env.log('BuyMarketItem 找不到商品 ID=' + id);
        // 拒绝应答只带 eRet：登记后 narrowReject 会剥掉 fillShape 补的 userGold/buyTimes/note ——
        // 客户端 131234 在判 eRet 前无条件读 userGold，剥掉才能保证拒绝不改写客户端金条显示。
        return wrapped('BuyMarketItem', { eRet: 4 }, { achievement: ach() });
      }
      var cost = (parseInt(row.Price, 10) || 0) * n;
      if (!(cost > 0) || !(s.gold >= cost)) {
        env.log('BuyMarketItem ' + id + ' x' + n + ' 拒绝：需 ' + cost + ' 金条，只有 ' + s.gold);
        return wrapped('BuyMarketItem', { eRet: 4 }, { achievement: ach() });
      }
      s.gold -= cost;
      s.marketBuyTimes = (parseInt(s.marketBuyTimes, 10) || 0) + n;
      var type = parseInt(row.Type, 10) || 0;
      var data = Array.isArray(row.Data) ? row.Data : [];
      var payload = { eRet: 1, userGold: s.gold, buyTimes: s.marketBuyTimes, note: { ivch: {}, eqch: {}, eco: { gold: s.gold } } };
      if (type === 2) {
        // 寒玉髓 buff：客户端 setBufferTotalTime(e.hanyusuiTime)，秒数 = Data[1]（样例 86400）
        payload.hanyusuiTime = parseInt(data[1], 10) || 0;
        env.log('BuyMarketItem ' + id + ' → 寒玉髓 ' + payload.hanyusuiTime + ' 秒，扣 ' + cost + ' 金条');
      } else if (type === 3) {
        env.log('BuyMarketItem ' + id + ' → 传送（客户端自置 teleport=1），扣 ' + cost + ' 金条');
      } else {
        var gid = parseInt(data[0], 10) || 0;
        var gn = (parseInt(data[1], 10) || 1) * n;
        if (!(gid > 0)) {
          env.log('BuyMarketItem ' + id + ' Data 无物品，只扣钱不发货（表数据异常，报警不改账）');
        } else {
          // ⚠ 用 grantRewardList 而不是 grantItem：Data[0] 可能是**货币**（如 4003=潜能、1=金条），
          //   grantItem 会把货币塞进背包（客户端只认钱包，潜能就成了一个叫「潜能」的背包道具）。
          grantRewardList(s, [[gid, gn]], payload.note, {});
          env.log('BuyMarketItem ' + id + ' → ' + gid + '×' + gn
            + (isCurrencyItem(gid) ? '（货币入钱包）' : '') + '，扣 ' + cost + ' 金条，余 ' + s.gold);
        }
      }
      persist();
      return wrapped('BuyMarketItem', payload, { achievement: ach() });
    },

    /** 坐骑商店货架：`User.GetMountsList {}`（send index.js:32176 DriverModel.reqDriverList；
     *  另一入口 scripts2.js:14897 NPC 对话选项 1532）。
     *  回调 index.js:32123-32140：1==eRet 时 `DriverShopBg.setData(e.MountsArr, 0)`（32137）
     *  → scripts2.js:18377 DriverShopUI.setData(arr, 0) → :18776 用 **arr.length** 建列表
     *  → :18794 每格 setData(arr[e], …) → :18485 `getItem(this.data, "mount")`
     *  即 **this.data 就是坐骑 id**。所以 MountsArr 是**纯 id 数组**，不带对象、不带价格
     *  （价格/替代表/升级价全由客户端自己的 mount 配置按 id 查，见 :18490-18497、:18534-18540）。
     *  ⚠ 形状表这条的 conf 是 "name"（按名字猜的 MountsArr），实测字段名**确实是 MountsArr**，
     *    但类型必须是 id 数组；发 []（兜底 377B）⇒ 商店空列表。
     *  只列 id、不列价：与 BuyMount 一致（它按 BZ_MOUNT[id].price 扣**金条**，见下）。 */
    GetMountsList: function () {
      var ids = [];
      var tbl = (typeof BZ_MOUNT !== 'undefined' && BZ_MOUNT) || {};
      for (var k in tbl) {
        if (!tbl.hasOwnProperty(k)) continue;
        var id = parseInt(k, 10) || 0;
        if (id > 0) ids.push(id);
      }
      env.log('GetMountsList → ' + ids.length + ' 只（BZ_MOUNT id 数组）');
      return wrapped('GetMountsList', { eRet: 1, MountsArr: ids }, { achievement: ach() });
    },

    /** 坐骑：`User.BuyMount {moutsID, type}`（send index.js:32178-32185；字段名原文就是 moutsID）。
     *  消费端（32141-32173）：应答的 i.type 决定分支（所以必须**回显**请求的 type）——
     *  type!=1 购买分支：1==eRet 成功、3==eRet 弹 getText(1000)；type==1 展示分支：只读 i.sync。
     *  ⚠ **币种是金条（gold），不是铜钱** —— 2026-10-25 修正，原实现扣 coins 是错账。
     *    铁证 scripts2.js:18754：确认购买时客户端自己先比价
     *      `0 == t && (p.RoleBaseInfo.gold < parseInt(s) ? f.StoreModel.openChargeList() : d.DriverModel.reqBuyMount(...))`
     *    —— 拿 RoleBaseInfo.gold（金条）跟价格比，不够就弹充值框 ⇒ mount.price 是金条价。
     *    实测反证（用户操作留证）：买 1004/1012/1024 = 3000+1000+3000 = 7000，
     *    原实现扣掉 7000 铜钱（coins 20840409→20833409）、金条一分未动。
     *  表 mount：price=金条价。坐骑账本 s.mounts={id:1}、展示位 s.mountShow
     *  （新顶层键；服务端原本没有任何 mount 键，侦察 A7-6）。 */
    BuyMount: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var mid = parseInt(p.moutsID, 10) || 0;
      var type = parseInt(p.type, 10) || 0;
      if (!(mid > 0)) {
        env.log('BuyMount 忽略无效请求 ' + JSON.stringify(p));
        return wrapped('BuyMount', { eRet: 3, note: {} }, { achievement: ach() });
      }
      if (type === 1) {
        s.mountShow = mid;
        persist();
        env.log('BuyMount 展示位 → ' + mid + '（sync=1）');
        return wrapped('BuyMount', { eRet: 1, type: 1, sync: 1 }, { achievement: ach() });
      }
      var rows = (typeof BZ_MOUNT !== 'undefined' && BZ_MOUNT) || {};
      var row = rows[String(mid)];
      var cost = row ? (parseInt(row.price, 10) || 0) : 0;
      if (!(cost > 0) || !(s.gold >= cost)) {
        env.log('BuyMount ' + mid + ' 拒绝：需 ' + cost + ' 金条，只有 ' + s.gold);
        return wrapped('BuyMount', { eRet: 3, note: {} }, { achievement: ach() });   // 3 → 客户端弹 getText(1000)
      }
      s.gold -= cost;
      s.mounts = s.mounts || {};
      s.mounts[String(mid)] = 1;
      s.mountShow = mid;
      persist();
      env.log('BuyMount ' + mid + ' → 扣 ' + cost + ' 金条，余 ' + s.gold + '，已拥有 ' + Object.keys(s.mounts).length + ' 匹');
      return wrapped('BuyMount', { eRet: 1, type: type, sync: 0, note: { eco: { gold: s.gold } } }, { achievement: ach() });
    },

    /** 弹出礼包购买：`User.buyEjectGift {roleID, giftId, giftGear}`（send scripts3.js:60931-60939）。
     *  消费端 buyGiftActive（60892-60910）：1==eRet 读 e.rewardArray、e.giftMap；
     *  2==eRet 弹 getText("9142")；6==eRet 弹充值对话框（getText(8845)）。
     *  表 time_limit_sale：price1/2/3=[原价,元宝价]（档位=giftGear），treasure1/2/3="物品id,数量|…"。
     *  ⚠ 触发数据 ejectGiftDatas 来自 REQ_POP_GIFT 推送（我们暂不推）→ 这条多在主动触发时用到。 */
    buyEjectGift: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var gid = String(p.giftId != null ? p.giftId : '');
      var gear = parseInt(p.giftGear, 10) || 1;
      if (!(gear >= 1 && gear <= 3)) gear = 1;
      var rows = (typeof BZ_TIMELIMITSALE !== 'undefined' && BZ_TIMELIMITSALE) || {};
      var row = rows[gid];
      if (!row) {
        env.log('buyEjectGift 找不到礼包 giftId=' + gid);
        return wrapped('buyEjectGift', { eRet: 2, note: {} }, { achievement: ach() });
      }
      var price = row['price' + gear];
      var cost = Array.isArray(price) ? (parseInt(price[1], 10) || 0) : (parseInt(price, 10) || 0);
      if (!(cost > 0) || !(s.yuanbao >= cost)) {
        env.log('buyEjectGift ' + gid + ' 档' + gear + ' 拒绝：需 ' + cost + ' 元宝，只有 ' + s.yuanbao);
        return wrapped('buyEjectGift', { eRet: 6, note: {} }, { achievement: ach() });   // 6 → 充值对话框
      }
      s.yuanbao -= cost;
      var tre = row['treasure' + gear];
      var note = { ivch: {}, eqch: {}, eco: { yuanbao: s.yuanbao } };
      var ra = {};
      if (typeof tre === 'string' && tre.length) {
        var parts = tre.split('|');
        for (var i = 0; i < parts.length; i++) {
          var mm = parts[i].split(',');
          var iid = parseInt(mm[0], 10) || 0;
          var ic = parseInt(mm[1], 10) || 0;
          if (!(iid > 0) || !(ic > 0)) continue;
          grantItem(s, iid, ic);
          if (itemTypeOf(iid) === 1) note.eqch[iid] = [1, s.playerEquip[iid]];
          else note.ivch[iid] = parseInt(s.bag[iid], 10) || 0;
          ra[iid] = ic;
        }
      }
      persist();
      env.log('buyEjectGift ' + gid + ' 档' + gear + ' → 扣 ' + cost + ' 元宝，' + Object.keys(ra).length + ' 种奖励');
      return wrapped('buyEjectGift', { eRet: 1, rewardArray: ra, giftMap: {}, note: note }, { achievement: ach() });
    },

    /** 时装外观开关：`User.upFashionFaceState {state}`（send index.js:75794-75797；state=0/1，
     *  调用点 scripts2.js:21900-21901 / 22504-22505 的 Toggle 取反）。
     *  消费端（75599-75605）：1==eRet 后 hasOwnProperty("titivateObj") 才 read —— 我们没有
     *  装扮账本，**不回 titivateObj**（形状表标 keyset 的开关字段不许补），客户端拿本地状态刷新。
     *  账本 s.ypEffectState 记当前开关，供以后接真实装扮系统。 */
    upFashionFaceState: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var st = (p.state !== undefined) ? (parseInt(p.state, 10) || 0) : 0;
      s.ypEffectState = st ? 1 : 0;
      persist();
      env.log('upFashionFaceState → ' + s.ypEffectState);
      return wrapped('upFashionFaceState', { eRet: 1 }, { achievement: ach() });
    },

    /** 时装特效：`User.fashionEffect {id}`（send index.js:75782-75787；调用点 scripts2.js:22481，0=关）。
     *  消费端 onFashionEffect（81479-81484 / 97888-97894）：1==eRet 读 e.fashionEffect
     *  （fashion.active = 0 != 值）。形状表标 switch → 显式回，值存 s.fashionEffect。 */
    fashionEffect: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var v = (p.id !== undefined) ? (parseInt(p.id, 10) || 0) : 0;
      s.fashionEffect = v;
      persist();
      env.log('fashionEffect → ' + v);
      return wrapped('fashionEffect', { eRet: 1, fashionEffect: v }, { achievement: ach() });
    },
    /** 江湖商店货架：`User.rgGetShopData`（index.js:60515；发送 scripts3.js:71221）。
     *  消费端 onGetShopData（71231-71240）：e.shop → RogueModel.shopData，另读 rank/endTime/reputationLevelId；
     *  元素读 id/costitem/cost/item/refresh/reputation/closetime/num/buyCount（75284-75363）。 */
    rgGetShopData: function () {
      var rows = (typeof BZ_ROGUESHOP !== 'undefined' && BZ_ROGUESHOP) || [];
      var shop = [];
      for (var ri = 0; ri < rows.length; ri++) {
        var rr = rows[ri];
        shop.push({
          id: rr.id, item: rr.item, costitem: rr.costitem, cost: rr.cost, num: rr.num,
          refresh: rr.refresh, rank: rr.rank, reputation: rr.reputation,
          closetime: rr.closetime, buyCount: 0,
        });
      }
      env.log('rgGetShopData → ' + shop.length + ' 件');
      return wrapped('rgGetShopData', { eRet: 1, shop: shop, rank: 0, endTime: 0, reputationLevelId: 0 }, { achievement: ach() });
    },
    /** 江湖商店购买：`User.rgShopByItem {id,itemNum}`（scripts3.js:71193 ← 71192）。
     *  货币是**实物**：costitem × cost（RogueBuyUI.onClickBtnBuy 比 havePriceNum=getItemNum(costId)，64795/75351）；
     *  应答读 eRet/rewardArray/id/buyCount（onShopBuy 71207-71219、setShopData 71198-71206）。 */
    rgShopByItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var id = parseInt(p.id, 10) || 0;
      var n = Math.abs(parseInt(p.itemNum, 10) || 1);
      var rows = (typeof BZ_ROGUESHOP !== 'undefined' && BZ_ROGUESHOP) || [];
      var row = null;
      for (var ri = 0; ri < rows.length; ri++) { if (rows[ri].id === id) { row = rows[ri]; break; } }
      if (!row || n <= 0) {
        env.log('rgShopByItem 找不到货 id=' + id);
        return wrapped('rgShopByItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      var unit = Math.max(parseInt(row.cost, 10) || 0, 0);
      var need = unit * n;
      var have = parseInt(s.bag[row.costitem], 10) || 0;
      if (!(need > 0) || have < need) {
        env.log('rgShopByItem ' + id + ' x' + n + ' 拒绝：需 ' + row.costitem + '×' + need + '，只有 ' + have);
        return wrapped('rgShopByItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      bagAdd(s, row.costitem, -need);
      var grant = n;
      grantItem(s, row.item, grant);
      persist();
      env.log('rgShopByItem ' + id + ' x' + n + ' → ' + row.item + '×' + grant + '，扣 ' + row.costitem + '×' + need);
      var note = { ivch: {}, eqch: {} };
      note.ivch[row.costitem] = parseInt(s.bag[row.costitem], 10) || 0;
      if (itemTypeOf(row.item) === 1) note.eqch[row.item] = [1, s.playerEquip[row.item]];
      else note.ivch[row.item] = parseInt(s.bag[row.item], 10) || 0;
      var ra = {}; ra[row.item] = grant;
      return wrapped('rgShopByItem', { eRet: 1, id: row.id, buyCount: n, rewardArray: ra, note: note }, { achievement: ach() });
    },
    /** 快速购买（货币直购）：客户端三包里**没有发送点**（只有常量），保留但按买价结算，避免变白送。 */
    QuickBuyItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var itemID = parseInt(p.itemID, 10) || 0;
      var n = Math.abs(parseInt(p.itemNum, 10) || 1);
      if (!(itemID > 0) || n <= 0) return wrapped('QuickBuyItem', { eRet: 4, note: {} }, { achievement: ach() });
      var unit = itemBuyPrice(itemID);
      if (!(unit > 0)) {
        env.log('QuickBuyItem ' + itemID + ' 无买价，拒绝');
        return wrapped('QuickBuyItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      var cost = unit * n;
      if (typeof s.coins !== 'number') s.coins = 99999;
      if (cost > s.coins) {
        env.log('QuickBuyItem ' + itemID + ' x' + n + ' 拒绝：需 ' + cost + '，只有 ' + s.coins);
        return wrapped('QuickBuyItem', { eRet: 4, note: {} }, { achievement: ach() });
      }
      s.coins -= cost;
      grantItem(s, itemID, n);
      persist();
      env.log('QuickBuyItem ' + itemID + ' x' + n + '  单价 ' + unit + '，扣 ' + cost + ' → 余 ' + s.coins);
      var note2 = { ivch: {}, eqch: {}, eco: { coins: s.coins } };
      if (itemTypeOf(itemID) === 1) note2.eqch[itemID] = [1, s.playerEquip[itemID]];
      else note2.ivch[itemID] = parseInt(s.bag[itemID], 10) || 0;
      var payload2 = { eRet: 1, itemID: itemID, itemNum: n, note: note2 };
      return shaped('QuickBuyItem', payload2) || wrapped('QuickBuyItem', payload2, { achievement: ach() });
    },
    /** 直接给物品（原为服务端推送/维护口；★2026-10-27 上游提速方案核查：
     *  客户端**有** send 点 —— index.js:65353-65358 `InventoryModel.addItem` → `sendRequest(ADD_ITEM)`，
     *  监听 64912（eRet==2 → getText(448)）→ 按上游规则改为 **eRet 2 拒绝**（防白拿），白名单行删除。 */
    addItem: function (p) {
      p = p || {};
      noteReject('addItem', 'freeGrant', 'itemID=' + (p.itemID || p.id) + ' 客户端有 send 点 → 拒绝（防白拿）');
      return wrapped('addItem', { eRet: 2 }, { achievement: ach() });
    },
    /** 穿装备（记账）：客户端在发请求**之前**就把自己那份换好了（index.js:65370 附近），服务器只负责记账。
     *  不记账的话重进游戏时 `PlayerEquip` / `equipments` 会回放成旧的 → 装备白穿。
     *
     *  ⚠ 动作名坑（2026-10-22 修）：客户端真正发的是 **`User.equipWeapon`**
     *  （index.js:59592 `PUT_ON_EQUIPMENT: "User.equipWeapon"`），不是 `User.PutOnEquipment`。
     *  以前只实现后者 → 玩家每次穿装备都落到 UNKNOWN、根本没有记账（丢过一把 2302）。
     *  现在两个名字都指向同一段逻辑；应答消费端只认 `eRet==1`（index.js:65015-65020）。 */
    PutOnEquipment: function (p) { return applyPutOn(p, 'PutOnEquipment'); },
    equipWeapon: function (p) { return applyPutOn(p, 'equipWeapon'); },
    /** 卸下全部装备：请求只有 {hp,hplmt,mp}（不带槽位），客户端成功后自己清空 <8 的槽。
     *  index.jsc:92801-92804 */
    UnloadingEuipment: function () {
      var s = ensureLedger(loadSave());
      var cleared = [];
      for (var k in s.equipments) {
        if (!s.equipments.hasOwnProperty(k)) continue;
        if ((parseInt(k, 10) || 0) < 8) { delete s.equipments[k]; cleared.push(k); }
      }
      persist();
      env.log('UnloadingEuipment 清空槽 ' + cleared.join(',') + ' 当前=' + JSON.stringify(s.equipments));
      return shaped('UnloadingEuipment', { equipments: clone(s.equipments) }) || ack('UnloadingEuipment', { achievement: ach() });
    },
    /** 维护用（游戏协议里没有这个动作，只能从命令通道打进来）：把客户端当前持有物灌进账本 */
    bzSeedBag: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      backupBeforeMaint('bzSeedBag');
      var bag = p.itemObj || {};
      var n = 0;
      for (var k in bag) {
        if (!bag.hasOwnProperty(k)) continue;
        var v = parseInt(bag[k], 10) || 0;
        if (v > 0) { s.bag[k] = v; n++; }
      }
      if (p.playerEquip && typeof p.playerEquip === 'object') s.playerEquip = clone(p.playerEquip);
      persist();
      env.log('bzSeedBag 灌入 ' + n + ' 种物品；装备 ' + Object.keys(s.playerEquip).length + ' 件');
      return wrapped('bzSeedBag', { eRet: 1, items: n, bag: clone(s.bag) }, { achievement: ach() });
    },
    /** 维护用：把已完成任务里"当时没发出去"的奖励补发一次（奖励表接上之前完成的那些）。
     *  只认游戏原始配置表里的奖励，不凭空造；已在 rewarded 里的跳过，所以可重复调用。 */
    bzBackfillRewards: function () {
      var s = ensureLedger(loadSave());
      backupBeforeMaint('bzBackfillRewards');
      if (!s.rewarded) s.rewarded = [];
      var granted = [];
      var done = s.done || [];
      for (var i = 0; i < done.length; i++) {
        var id = done[i];
        if (s.rewarded.indexOf(id) >= 0) continue;
        var meta = taskMeta(id);
        if (!meta || !meta.r) { s.rewarded.push(id); continue; }
        var got = {};
        for (var rk in meta.r) {
          if (!meta.r.hasOwnProperty(rk)) continue;
          var cnt = parseInt(meta.r[rk], 10) || 0;
          if (cnt <= 0) continue;
          grantItem(s, rk, cnt);
          got[rk] = cnt;
        }
        s.rewarded.push(id);
        granted.push({ task: id, items: got });
      }
      persist();
      env.log('bzBackfillRewards 补发 ' + granted.length + ' 个任务');
      return wrapped('bzBackfillRewards', { eRet: 1, granted: granted, bag: clone(s.bag) }, { achievement: ach() });
    },
    /** 维护用：定点修补存档（{set:{potential:99999}, del:{skills:["0"]}}）。只从命令通道打进来，
     *  游戏协议里没有这个动作。用于误写后的修复，不参与任何玩法。 */
    /** 维护用（游戏协议里没有，只能从命令通道打）：增减**货币**账本。
     *  用户 2026-10-22 裁定：金条/元宝可以做（有些道具与武学只能拿付费货币买，玩家要能体验），
     *  但**不做任何真实付费渠道** —— 所以这里只动我方离线账，不涉及任何订单/支付回调。
     *  p = { gold:+N, yuanbao:+N, coins:+N }（负数=扣，下限 0）。 */
    bzGrantCur: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      backupBeforeMaint('bzGrantCur');
      var applied = [];
      var fields = { gold: 1, yuanbao: 1, coins: 1, contribution: 1, schoolContribution: 1, passLiveness: 1, passCardLevel: 1 };
      for (var k in fields) {
        if (!p.hasOwnProperty(k)) continue;
        var d = parseInt(p[k], 10) || 0;
        if (!d) continue;
        if (typeof s[k] !== 'number') {
          s[k] = (k === 'passCardLevel') ? 1
            : ((k === 'yuanbao' || k === 'contribution' || k === 'schoolContribution' || k === 'passLiveness') ? 0 : 99999);
        }
        s[k] = Math.max(0, s[k] + d);
        applied.push(k + ' ' + (d > 0 ? '+' : '') + d + ' → ' + s[k]);
      }
      // 侠客令档位夹在 1..档位数（pass_level 四档）之间：越界会让客户端 `cardState < goldAy.length` 之类判断失真
      if (typeof s.passCardLevel === 'number') {
        var maxLvl = ((typeof BZ_PASS_PRICE !== 'undefined' && BZ_PASS_PRICE) || []).length || 4;
        if (s.passCardLevel < 1) s.passCardLevel = 1;
        if (s.passCardLevel > maxLvl) s.passCardLevel = maxLvl;
      }
      persist();
      env.log('bzGrantCur ' + applied.join('; '));
      pushEco(s);
      return wrapped('bzGrantCur', { eRet: 1, applied: applied, gold: s.gold, yuanbao: s.yuanbao, coins: s.coins, contribution: s.contribution, schoolContribution: s.schoolContribution, passLiveness: s.passLiveness, passCardLevel: s.passCardLevel }, { achievement: ach() });
    },
    bzPatch: function (p) {
      p = p || {};
      var s = loadSave();
      backupBeforeMaint('bzPatch');
      var sets = p.set || {}, dels = p.del || {};
      var done = [];
      for (var k in sets) {
        if (!sets.hasOwnProperty(k)) continue;
        s[k] = sets[k];
        done.push('set ' + k);
      }
      for (var dk in dels) {
        if (!dels.hasOwnProperty(dk)) continue;
        var arr = dels[dk];
        if (!s[dk] || typeof s[dk] !== 'object') continue;
        for (var i = 0; i < arr.length; i++) { delete s[dk][arr[i]]; done.push('del ' + dk + '[' + arr[i] + ']'); }
      }
      // delTop：删**顶层**键（2026-10-22 补 —— `set` 只写顶层，写错一次就会在存档里留下垃圾键，
      // 例如把 `{set:{"3003":20}}` 当成改背包，结果 `bag.3003` 没变、顶层多出 "3003"。当时无手段清掉它）
      var delTop = p.delTop || [];
      for (var ti = 0; ti < delTop.length; ti++) {
        var tk = String(delTop[ti]);
        if (tk === 'roleID' || tk === 'saveVersion' || tk === 'bag' || tk === 'playerEquip' || tk === 'equipments') continue;  // 禁止删结构键
        if (hasOwn(s, tk)) { delete s[tk]; done.push('delTop ' + tk); }
      }
      var wrote = persist();
      env.log('bzPatch ' + done.join('; ') + (wrote ? '' : '  ← 写档被守卫拒绝（见上一行原因），仅内存生效'));
      return wrapped('bzPatch', { eRet: 1, applied: done }, { achievement: ach() });
    },

    /* ============ 第 2 批 C05〔道具使用〕12 个新 handler ============
     * H 的键 = 客户端线上名去掉 "User." 前缀（dispatch 用 `H[action]`，日志 `'dispatch User.'+action`）。
     * **注册名（LEVEAL_SCHOOL 之类）与线上名不是一回事**，照注册名注册会静默落进 SHAPED/UNKNOWN。
     * 取证：batch2-facts-20261025/00-MASTER-第2批取证汇总.md §1 §3 §4。
     * 本批不做：RECORD_PHONE、BUY_NPC_FEEL、SWAP_SKILL_PROGRESS（上游 v2.4 拍板）。
     * ⚠ 凡遍历 BZ_* 表必须显式跳过 '__meta'（生成器挂的可枚举统计属性），否则它会被当成数据行。 */

    /** 肉鸽用道具：扣肉鸽背包 s.rogueBag（**与 s.bag 分开** —— 混用会撞 guardSave 的"背包清空"守门，
     *  SHRINK_OK 只豁免 useItem/saleItem）。回 note + mpnum（上游要求回当前内力）。 */
    rgUseItem: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      s.rogueBag = s.rogueBag || {};
      var iid = parseInt(p.itemID, 10) || 0;
      if (!(iid > 0)) {
        noteReject('rgUseItem', 'badItem', 'itemID=' + p.itemID);
        return wrapped('rgUseItem', { eRet: 2 }, { achievement: ach() });
      }
      var have = parseInt(s.rogueBag[iid], 10) || 0;
      if (have < 1) {
        noteReject('rgUseItem', 'noStock', 'itemID=' + iid + ' 肉鸽库存 0');
        return wrapped('rgUseItem', { eRet: 4 }, { achievement: ach() });
      }
      var n = Math.abs(parseInt(p.itemNum, 10) || 1);
      var use = Math.min(n, have);
      s.rogueBag[iid] = have - use;
      if (s.rogueBag[iid] <= 0) delete s.rogueBag[iid];
      var mp = parseInt(p.curMp, 10);
      if (!isFinite(mp) || mp < 0) mp = parseInt(s.mp, 10) || 0;
      persist();
      env.log('rgUseItem ' + iid + ' x' + use + ' → 肉鸽余 ' + (s.rogueBag[iid] || 0)
        + ' mpnum=' + mp + '（rogue_item.buff 效果未建模，只扣道具）');
      return wrapped('rgUseItem', {
        eRet: 1, note: { eco: {}, skch: {}, ivch: {}, eqch: {} }, mpnum: mp, rewardArray: {},
      }, { achievement: ach() });
    },

    /** 肉鸽等待奖励同步：只回成功（客户端 1==eRet 就清 waitPrecious）。 */
    rgSycnWaitData: function () {
      return wrapped('rgSycnWaitData', { eRet: 1 }, { achievement: ach() });
    },

    /** 进雪球面板拉数据：回 hp / boxnum / sTime，eRet:1 = 正常进入。 */
    enterSnow: function () {
      var s = ensureLedger(loadSave());
      var lv = parseInt(s.snowLevel, 10) || 1;
      var row = (typeof BZ_SNOWMAN !== 'undefined' && BZ_SNOWMAN[String(lv)]) || null;
      if (!(parseInt(s.snowHp, 10) > 0)) s.snowHp = row ? row.hp : 1000;
      s.snowBall = parseInt(s.snowBall, 10) || 0;
      s.snowBox = parseInt(s.snowBox, 10) || 0;
      persist();
      env.log('enterSnow lv=' + lv + ' hp=' + s.snowHp + ' boxnum=' + s.snowBox + ' ball=' + s.snowBall);
      var vo = { eRet: 1, hp: s.snowHp, boxnum: s.snowBox, sTime: env.now() };
      return shaped('enterSnow', vo) || wrapped('enterSnow', vo, { achievement: ach() });
    },

    /** 扔一个雪球：扣 1，雪人 hp 涨固定值。不够回 eRet:0（非 1 一律走客户端 else 弹 1093）。 */
    UseSnowBall: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var have = parseInt(s.snowBall, 10) || 0;
      var hp = parseInt(s.snowHp, 10) || 0;
      if (have < 1) {
        noteReject('UseSnowBall', 'noBall', '雪球库存 0');
        var v0 = { eRet: 0, hp: hp };
        return shaped('UseSnowBall', v0) || wrapped('UseSnowBall', v0, { achievement: ach() });
      }
      s.snowBall = have - 1;
      s.snowHp = hp + 100;
      persist();
      env.log('UseSnowBall type=' + p.type + ' → 雪球余 ' + s.snowBall + ' hp=' + s.snowHp);
      var v1 = { eRet: 1, hp: s.snowHp };
      return shaped('UseSnowBall', v1) || wrapped('UseSnowBall', v1, { achievement: ach() });
    },

    /** 批量扔：batchType = 一次扔几个。不够回 eRet:4 —— 客户端 4 → getText(6126)「雪球不足」。 */
    UseBatchSnowBall: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var want = Math.abs(parseInt(p.batchType, 10) || 1);
      var have = parseInt(s.snowBall, 10) || 0;
      var hp = parseInt(s.snowHp, 10) || 0;
      if (have < want) {
        noteReject('UseBatchSnowBall', 'noBall', '需 ' + want + '，有 ' + have);
        var b0 = { eRet: 4, hp: hp };
        return shaped('UseBatchSnowBall', b0) || wrapped('UseBatchSnowBall', b0, { achievement: ach() });
      }
      s.snowBall = have - want;
      s.snowHp = hp + 100 * want;
      persist();
      env.log('UseBatchSnowBall x' + want + ' → 雪球余 ' + s.snowBall + ' hp=' + s.snowHp);
      var b1 = { eRet: 1, hp: s.snowHp };
      return shaped('UseBatchSnowBall', b1) || wrapped('UseBatchSnowBall', b1, { achievement: ach() });
    },

    /** 摔炮：把剩的雪球一次扔完，按 square_ball 档位发奖。奖励走 grantRewardList（货币进钱包）。 */
    UseAllBall: function () {
      var s = ensureLedger(loadSave());
      var have = parseInt(s.snowBall, 10) || 0;
      var hp = parseInt(s.snowHp, 10) || 0;
      if (have < 1) {
        noteReject('UseAllBall', 'noBall', '雪球库存 0');
        var a0 = { eRet: 0, hp: hp, rewardArray: {} };
        return shaped('UseAllBall', a0) || wrapped('UseAllBall', a0, { achievement: ach() });
      }
      var note = { eco: {}, skch: {}, ivch: {}, eqch: {} };
      var ra = {};
      var tier = 1;
      if (typeof BZ_SQUARE_BALL !== 'undefined') {
        for (var bk in BZ_SQUARE_BALL) {
          if (!hasOwn(BZ_SQUARE_BALL, bk) || bk === '__meta') continue;
          var t = BZ_SQUARE_BALL[bk] || {};
          if ((t.lv || 0) <= have && (t.lv || 0) >= tier) tier = t.lv;
        }
      }
      var tierRow = (typeof BZ_SQUARE_BALL !== 'undefined' && BZ_SQUARE_BALL[String(tier)]) || null;
      if (tierRow && tierRow.ri > 0 && tierRow.rn > 0) {
        grantRewardList(s, [[tierRow.ri, tierRow.rn]], note, ra);
        env.log('UseAllBall 档位 ' + tier + ' → 物品 ' + tierRow.ri + ' x' + tierRow.rn);
      }
      s.snowBall = 0;
      s.snowHp = hp + 100 * have;
      persist();
      env.log('UseAllBall 用掉 ' + have + ' 个雪球 → hp=' + s.snowHp);
      var a1 = { eRet: 1, hp: s.snowHp, rewardArray: ra, note: note };
      return shaped('UseAllBall', a1) || wrapped('UseAllBall', a1, { achievement: ach() });
    },

    /** 领雪球盒子奖励：消耗 1 个盒子，按当前雪人等级的 consolationprize 发安慰奖。
     *  该串是货币对（4001 银两 / 4003 潜能）→ **必须 grantRewardList**，用 grantItem 会把潜能塞进背包
     *  变成一件叫「潜能」的道具（第 1 批已验证过的坑）。 */
    getSnowAward: function () {
      var s = ensureLedger(loadSave());
      var boxes = parseInt(s.snowBox, 10) || 0;
      var note = { eco: {}, skch: {}, ivch: {}, eqch: {} };
      var ra = {};
      if (boxes < 1) {
        noteReject('getSnowAward', 'noBox', '盒子 0');
        var g0 = { eRet: 4, rewardArray: {} };
        return shaped('getSnowAward', g0) || wrapped('getSnowAward', g0, { achievement: ach() });
      }
      var lv = parseInt(s.snowLevel, 10) || 1;
      var row = (typeof BZ_SNOWMAN !== 'undefined' && BZ_SNOWMAN[String(lv)]) || null;
      if (row && row.cons && row.cons.length) {
        grantRewardList(s, row.cons, note, ra);
        env.log('getSnowAward 等级 ' + lv + ' → ' + JSON.stringify(row.cons));
      } else {
        env.log('getSnowAward 等级 ' + lv + ' 无 consolationprize，只回空奖');
      }
      s.snowBox = boxes - 1;
      persist();
      env.log('getSnowAward → 盒子余 ' + s.snowBox);
      var g1 = { eRet: 1, rewardArray: ra, note: note };
      return shaped('getSnowAward', g1) || wrapped('getSnowAward', g1, { achievement: ach() });
    },

    /** 道具附加效果：客户端 reqAddBreakRate(count) → 回 itemAddition 才会加到 itemBreakAdditionNum。
     *  ⚠ 用哪个道具只有 skillChange 的 Const 176 这一条旁证，属**假定**（见 06 回执 §四 同源问题）。
     *    库存不足回 eRet:5（客户端不处理 = 静默无效果），**绝不"不扣东西直接给加成"**（那等于白送）。 */
    useItemAddition: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var want = Math.abs(parseInt(p.count, 10) || 1);
      /* 道具 id = 7602。证据：两个独立调用点都写死同一个字面量
       *   index.js:121375  `itemId: 7602`（SkillUpgradeModel.showAddBreakRateUI）
       *   scripts2.js:4805 `itemId: 7602`（onUpLv）
       * 该值最终流到 AddBreakRateUI 的 this.data.itemId → this.itemId（scripts2.js:599），
       * 再由 RoleBaseInfo.getItemNum(this.itemId) 判断"背包里还有几个"（scripts2.js:600）。
       * ⚠ item.json 是截断导出（6525 行只留 3000 行），表里查不到 7602 不代表不存在。 */
      var AID = 7602;
      var have = parseInt(s.bag[AID], 10) || 0;
      if (have < 1) {
        noteReject('useItemAddition', 'noItem', '物品 ' + AID + ' 库存 ' + have);
        return wrapped('useItemAddition', { eRet: 5 }, { achievement: ach() });
      }
      var use = Math.min(want, have);
      /* 单位是**百分点**不是个数：客户端 `itemBreakAdditionNum += e.itemAddition`（index.js:56857），
       * 而 scripts2.js:602 用它时是 `itemBreakAdditionNum / 10` → 每件 = 10；
       * 面板文案 `10 * this.useItemNum + "%"`（scripts2.js:607）、上限 `(100-curRate)/10` 也一致。 */
      var gain = use * 10;
      var note = { eco: {}, skch: {}, ivch: {}, eqch: {} };
      var left = bagAdd(s, AID, -use);
      note.ivch[AID] = parseInt(s.bag[AID], 10) || 0;
      persist();
      env.log('useItemAddition 扣 ' + AID + ' x' + use + ' → 余 ' + left
        + '，回 itemAddition=' + gain + '（百分点；每件 10）');
      var uo = { eRet: 1, itemAddition: gain, note: note };
      return shaped('useItemAddition', uo) || wrapped('useItemAddition', uo, { achievement: ach() });
    },

    /** 回登录界面：只回成功，不动存档。 */
    BackToLogin: function () {
      return wrapped('BackToLogin', { eRet: 1 }, { achievement: ach() });
    },

    /** 注销账号：只回成功。**绝不删存档、绝不清字段** —— 离线版删了就找不回来。 */
    accountLogOff: function () {
      env.log('accountLogOff → 只回成功，存档原样保留（cleanup/restart 由客户端自己做）');
      var o0 = { eRet: 1 };
      return shaped('accountLogOff', o0) || wrapped('accountLogOff', o0, { achievement: ach() });
    },

    /** 退出门派：**只清 s.school**。
     *  ⚠ 上游要求按"客户端退出门派的提示文案"决定清不清门派贡献/技能，但游戏文字表不在我们 dump 里
     *  （languageList.json 只有 3 行语言清单，不含实际字符串）→ 那段文案**取不到**（见 06 回执 §三）。
     *  而客户端 onQuitSchool 是空函数（index.js:113712），收到回包不清任何本地字段。
     *  ⇒ 按"绝不误删玩家资产"处理：只清 school，contribution / schoolContribution / 门派技能全保留。 */
    quitSchool: function () {
      var s = ensureLedger(loadSave());
      var old = parseInt(s.school, 10) || 0;
      s.school = 0;
      persist();
      env.log('quitSchool 门派 ' + old + ' → 0；contribution 与门派技能按保守策略**保留**');
      var q0 = { eRet: 1, npcList: [], openSchoolFirstTryBgUI: 0 };
      return shaped('quitSchool', q0) || wrapped('quitSchool', q0, { achievement: ach() });
    },

    /** 挂机状态查询：客户端 1==eRet 时把 OnhookObj 存进 idleData 并进挂机场景。 */
    CheckOnHook: function () {
      var c0 = { eRet: 1, OnhookObj: {} };
      return shaped('CheckOnHook', c0) || wrapped('CheckOnHook', c0, { achievement: ach() });
    },

    /* ============ 第 3 批 C02〔任务主线〕16 个新 handler ============
     * H 的键 = 线上名去掉 "User." 前缀。**注册名与线上名大面积错位**，照注册名写必错：
     *   GET_TASK->acceptTask / FINISH_TASK->getFinishTaskAward / SYCN_TASK->sycnTask（这 3 个已有 handler）
     * 取证：batch3-facts-20261025/C1-actions.md（19 个动作的 wireName/sendSite/reqKeys/recvFields）。
     * 存档模型（C2 取证）：任务只存 **s.accepted / s.done 两个 id 数组**；
     *   taskLog / finishTaskObj / acceptTaskArray / acceptTaskOrder **在存档里不存在**，是应答时动态投射的。
     * 奖励表：BZ_TASKS[id] = {t: 类型, r: {物品id: 数量}}，货币 id 由 grantRewardList 自动进钱包。
     * ⚠ 一律"先验在 s.accepted 里，才许发奖并移入 s.done"——防重复领（重复领=白拿钱）。 */

    /** 环任务列表：客户端 1==eRet 时用 cNum + taskArr 打开挂机任务面板。
     *  2026-10-25 补欠账 §6.1：taskArr 原来读存 `s.circleTaskArr`（存档里**根本没有这个键** → 恒空），
     *  现在改成由 `BZ_CIRCLE_TASK`（circle_task 表，cfMon 解码后 21 档）+ 静态委托定义**动态投射**。
     *  这样做的好处：不动存档结构、无需迁移、与既有"任务列表在应答时投射"的口径一致
     *  （C02 取证已确认 taskLog/finishTaskObj 等都是投射而非存档）。 */
    getCircleTaskList: function () {
      var rows = circleRows();
      var v = { eRet: 1, cNum: rows.length, taskArr: rows };
      env.log('getCircleTaskList cNum=' + v.cNum + ' taskArr=' + v.taskArr.length
        + (rows.length ? ' 首行=' + JSON.stringify(rows[0]) : '（BZ_CIRCLE_TASK 不可用/不合格 → 空表）'));
      return shaped('getCircleTaskList', v) || wrapped('getCircleTaskList', v, { achievement: ach() });
    },

    /** 门派任务列表：客户端**不判 eRet**，直接解析字段并刷新面板（字段缺了会渲染崩）。 */
    getSchoolTask: function () {
      var s = ensureLedger(loadSave());
      var v = {
        schoolTask: s.schoolTask || [],
        weekQuickCompleteTaskTimes: parseInt(s.weekQuickCompleteTaskTimes, 10) || 0,
        affiliationSchool: parseInt(s.affiliationSchool, 10) || 0,
        xyTodaySchoolId: parseInt(s.xyTodaySchoolId, 10) || 0,
        currentServerTime: env.now(),
      };
      return shaped('getSchoolTask', v) || wrapped('getSchoolTask', v, { achievement: ach() });
    },

    /** 隐藏任务：客户端 1==eRet 时按 hideType 设 hTaskArr 或 clearHideTask。 */
    hideTask: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var arr = Array.isArray(p.tIDArr) ? p.tIDArr : [];
      s.hTaskArr = arr.slice();
      persist();
      env.log('hideTask type=' + p.type + ' 隐藏 ' + arr.length + ' 条');
      var v = { eRet: 1 };
      return shaped('hideTask', v) || wrapped('hideTask', v, { achievement: ach() });
    },

    /** 接环任务：入 s.accepted（幂等）。
     *  v2.6：加 `acceptable()` 闸 —— 原来对 taskID **不设任何条件**，任意 X 都能塞进 accepted，
     *  配任一领奖口就是无限白拿（上游 §一 点名的第一条）。 */
    acceptCircleTask: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var tid = parseInt(p.taskID, 10) || 0;
      if (!(tid > 0) || !acceptable(s, tid)) {
        noteReject('acceptCircleTask', 'badTask', 'taskID=' + p.taskID + ' acceptable=false');
        return wrapped('acceptCircleTask', { eRet: 6 }, { achievement: ach() });   // 6 -> getText(1093)
      }
      s.accepted = s.accepted || [];
      if (s.accepted.indexOf(tid) < 0) s.accepted.push(tid);
      persist();
      env.log('acceptCircleTask ' + tid + ' flag=' + p.flag + '（accepted 现有 ' + s.accepted.length + '）');
      var v = { eRet: 1, taskID: tid, retData: {} };
      return shaped('acceptCircleTask', v) || wrapped('acceptCircleTask', v, { achievement: ach() });
    },

    /** 环任务领奖：先验在 accepted、再验**共用领奖账**，才发奖并移入 done。
     *  v2.6：只验 accepted 是白拿的根 —— 接一次领一次，领完再接又回到"在 accepted 里"。 */
    circleTaskAward: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var tid = parseInt(p.taskID, 10) || 0;
      s.accepted = s.accepted || [];
      s.done = s.done || [];
      if (s.accepted.indexOf(tid) < 0) {
        noteReject('circleTaskAward', 'notAccepted', 'taskID=' + tid);
        return wrapped('circleTaskAward', { eRet: 4 }, { achievement: ach() });   // 4 -> getText(931)
      }
      if (!canClaim(s, tid)) {
        noteReject('circleTaskAward', 'notAccepted', 'alreadyClaimed taskID=' + tid);
        env.log('circleTaskAward ' + tid + ' 拒绝：共用领奖账已记过（一次性任务永久 / 环任务按天）');
        return wrapped('circleTaskAward', { eRet: 4 }, { achievement: ach() });
      }
      var note = { eco: {}, skch: {}, ivch: {}, eqch: {} };
      var ra = {};
      // 奖励对统一由 taskRewardPairs 给（真任务走 BZ_TASKS.r，环任务走 BZ_CIRCLE_TASK 当前档位）
      var list = taskRewardPairs(tid);
      if (list.length) grantRewardList(s, list, note, ra);
      markClaim(s, tid);
      bumpTaskCounter(s, tid);   // v2.7.1：环/任务完成计数（isCircleTask 分流 circleTotal / taskDoneCount）
      s.accepted.splice(s.accepted.indexOf(tid), 1);
      if (s.done.indexOf(tid) < 0) s.done.push(tid);
      persist();
      env.log('circleTaskAward ' + tid + ' 发 ' + JSON.stringify(list) + '（已记领奖账）');
      var v = { eRet: 1, rewardObj: ra, note: note };
      return shaped('circleTaskAward', v) || wrapped('circleTaskAward', v, { achievement: ach() });
    },

    /** 领环任务奖励（另一入口，客户端 eRet 分支最全：4=931 5=932 9=1093 10=4320 12=8156）。 */
    getCircleTaskAward: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var tid = parseInt(p.taskID, 10) || 0;
      s.accepted = s.accepted || [];
      s.done = s.done || [];
      if (s.accepted.indexOf(tid) < 0) {
        noteReject('getCircleTaskAward', 'notAccepted', 'taskID=' + tid);
        return wrapped('getCircleTaskAward', { eRet: 4 }, { achievement: ach() });
      }
      if (!canClaim(s, tid)) {
        noteReject('getCircleTaskAward', 'notAccepted', 'alreadyClaimed taskID=' + tid);
        env.log('getCircleTaskAward ' + tid + ' 拒绝：共用领奖账已记过');
        return wrapped('getCircleTaskAward', { eRet: 4 }, { achievement: ach() });
      }
      var note = { eco: {}, skch: {}, ivch: {}, eqch: {} };
      var ra = {};
      // 奖励对统一由 taskRewardPairs 给（真任务走 BZ_TASKS.r，环任务走 BZ_CIRCLE_TASK 当前档位）
      var list = taskRewardPairs(tid);
      if (list.length) grantRewardList(s, list, note, ra);
      markClaim(s, tid);
      bumpTaskCounter(s, tid);   // v2.7.1：环/任务完成计数
      s.accepted.splice(s.accepted.indexOf(tid), 1);
      if (s.done.indexOf(tid) < 0) s.done.push(tid);
      persist();
      env.log('getCircleTaskAward ' + tid + ' 发 ' + JSON.stringify(list) + '（已记领奖账）');
      var v = { eRet: 1, rewardArray: ra, equipObj: {}, taskID: tid, note: note };
      return shaped('getCircleTaskAward', v) || wrapped('getCircleTaskAward', v, { achievement: ach() });
    },

    /** 接门派任务：客户端读 dateFinishTimes + acceptSchoolTask。 */
    acceptSchoolTask: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var v = { eRet: 1, dateFinishTimes: parseInt(s.dateFinishTimes, 10) || 0, acceptSchoolTask: {} };
      return shaped('acceptSchoolTask', v) || wrapped('acceptSchoolTask', v, { achievement: ach() });
    },

    /** 一键完成门派任务：按 index 记一次完成次数，回奖励。 */
    onekeyCompleteSchoolTask: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      s.weekQuickCompleteTaskTimes = (parseInt(s.weekQuickCompleteTaskTimes, 10) || 0) + 1;
      persist();
      env.log('onekeyCompleteSchoolTask school=' + p.schoolId + ' index=' + p.index);
      var v = {
        eRet: 1, schoolTask: s.schoolTask || [],
        weekQuickCompleteTaskTimes: s.weekQuickCompleteTaskTimes, rewardArray: {}, equipObj: {},
      };
      return shaped('onekeyCompleteSchoolTask', v) || wrapped('onekeyCompleteSchoolTask', v, { achievement: ach() });
    },

    /** 门派任务完成：记次数并回奖励位。 */
    schoolTaskComplete: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      env.log('schoolTaskComplete school=' + p.schoolId + ' index=' + p.index + ' itemId=' + p.itemId);
      var v = { eRet: 1, schoolTask: s.schoolTask || [], rewardArray: {}, equipObj: {} };
      return shaped('schoolTaskComplete', v) || wrapped('schoolTaskComplete', v, { achievement: ach() });
    },

    /** 刷新门派任务：客户端回调**只 cc.log**，不读任何字段、不判 eRet。 */
    refreshSchoolTask: function (p) {
      p = p || {};
      env.log('refreshSchoolTask school=' + p.schoolId + '（客户端只打日志，不读应答）');
      var v = { eRet: 1 };
      return shaped('refreshSchoolTask', v) || wrapped('refreshSchoolTask', v, { achievement: ach() });
    },

    /** 门派任务领奖：客户端回调**只 cc.log**，不读字段。不发奖也不扣，避免变成第二个发放入口。 */
    schoolTaskAward: function (p) {
      p = p || {};
      env.log('schoolTaskAward school=' + p.schoolId + ' index=' + p.index + '（客户端只打日志；此处不发奖防重复入口）');
      var v = { eRet: 1 };
      return shaped('schoolTaskAward', v) || wrapped('schoolTaskAward', v, { achievement: ach() });
    },

    /** 委托任务换一批：客户端读 taskObj + num。 */
    changeDelegateTask: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      env.log('changeDelegateTask type=' + p.type + ' tIDArr=' + JSON.stringify(p.tIDArr || []).slice(0, 80));
      // "换一批"与 getCircleTaskList 必须同源，否则换完列表和面板对不上。
      // `num` 也改成投射行数：存档里同样没有 s.delegateNum（与 circleTaskArr 一样从未初始化）。
      var obj = circleTaskObj();
      var cnt = 0;
      for (var ck in obj) { if (hasOwn(obj, ck)) cnt++; }
      var v = { eRet: 1, taskObj: obj, num: cnt };
      return shaped('changeDelegateTask', v) || wrapped('changeDelegateTask', v, { achievement: ach() });
    },

    /** 委托任务：客户端 1==eRet 时 dispatch START_ENTRUST_TASK_EVENT，读 sTime。
     *  v2.6：它也会把 taskID 塞进 accepted → 同样要过 `acceptable()`（上游 §一 点名的第三条刷法）。 */
    delegateTask: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var tid = parseInt(p.taskID, 10) || 0;
      if (!(tid > 0) || !acceptable(s, tid)) {
        noteReject('delegateTask', 'notAccepted', 'taskID=' + p.taskID + ' acceptable=false');
        return wrapped('delegateTask', { eRet: 4 }, { achievement: ach() });   // 4 -> log(服务器获取锁定装备数据出错)
      }
      s.accepted = s.accepted || [];
      if (tid > 0 && s.accepted.indexOf(tid) < 0) { s.accepted.push(tid); persist(); }
      env.log('delegateTask ' + tid + ' equipID=' + p.equipID);
      var v = { eRet: 1, sTime: env.now() };
      return shaped('delegateTask', v) || wrapped('delegateTask', v, { achievement: ach() });
    },

    /** 快速完成任务：**用元宝买**（离线版没有真实支付通道，改扣游戏内货币）。
     *  客户端分支语义正好对齐：1 -> dispatch(QUICK_FINISH_TASK_EVENT) 真完成；
     *  2 -> openChargeList 弹充值框 —— 所以"元宝不够"回 2 是**正确语义**，不是拒绝。
     *  ⚠ 顺序：先验任务在 accepted（防"没接过也能买"），再扣钱，最后才发奖 + 移入 done。
     *  ⚠ 应答只回 {eRet} 一个字段：客户端 1 分支不读别的，多下发反而要再走一轮形状审批。 */
    quickFinishTask: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var tid = parseInt(p.taskID, 10) || 0;
      s.accepted = s.accepted || [];
      s.done = s.done || [];
      var PRICE = 50;   // 元宝单价：本工程自定（原版价在真实支付链里，取不到；同 980 大侠令的做法）
      if (!(tid > 0) || s.accepted.indexOf(tid) < 0) {
        noteReject('quickFinishTask', 'notAccepted', 'taskID=' + tid);
        return wrapped('quickFinishTask', { eRet: 2 }, { achievement: ach() });
      }
      // ⚠ 防"扣钱不给奖"：**任何**确实没有奖励条目的 id 都不许扣元宝。
      //   v2.7 起环任务（9001..9003）已经有奖励了（走 BZ_CIRCLE_TASK 当前档位），
      //   所以这里从"只看在不在 BZ_TASKS"改成"看 taskRewardPairs 有没有货" ——
      //   这样环任务正常收 50 元宝，而真正无奖励的 id 仍然一个子儿都不收。
      if (!taskRewardPairs(tid).length) {
        noteReject('quickFinishTask', 'notAccepted', 'noRewardRow tid=' + tid);
        env.log('quickFinishTask 拒绝：' + tid + ' 没有任何奖励条目（BZ_TASKS / BZ_CIRCLE_TASK 都查不到）→ 不扣元宝');
        return wrapped('quickFinishTask', { eRet: 4 }, { achievement: ach() });
      }
      // v2.6：**扣元宝之前**先过共用领奖账 —— 不然就是"花 50 元宝买一次被拒的领奖"。
      //   上游原话：「quickFinishTask 在扣元宝之前判 canClaim，不过就回 2 且不扣钱」。
      if (!canClaim(s, tid)) {
        noteReject('quickFinishTask', 'notAccepted', 'alreadyClaimed taskID=' + tid);
        env.log('quickFinishTask ' + tid + ' 拒绝：共用领奖账已记过 → 不扣元宝');
        return wrapped('quickFinishTask', { eRet: 2 }, { achievement: ach() });
      }
      var have = parseInt(s.yuanbao, 10) || 0;
      if (have < PRICE) {
        noteReject('quickFinishTask', 'insufficient', '需 ' + PRICE + ' 元宝，有 ' + have);
        return wrapped('quickFinishTask', { eRet: 2 }, { achievement: ach() });   // 2 -> openChargeList
      }
      var note = { eco: {}, skch: {}, ivch: {}, eqch: {} };
      var ra = {};
      s.yuanbao = have - PRICE;
      note.eco.yuanbao = s.yuanbao;
      // 奖励对统一由 taskRewardPairs 给（真任务走 BZ_TASKS.r，环任务走 BZ_CIRCLE_TASK 当前档位）
      var list = taskRewardPairs(tid);
      if (list.length) grantRewardList(s, list, note, ra);
      markClaim(s, tid);          // ← 这条必须记，否则之后走 getFinishTaskAward 还能再发一次（上游点名的第四个口）
      bumpTaskCounter(s, tid);   // v2.7.1：快速完成也计入任务数
      s.accepted.splice(s.accepted.indexOf(tid), 1);
      if (s.done.indexOf(tid) < 0) s.done.push(tid);
      persist();
      env.log('quickFinishTask ' + tid + ' 花 ' + PRICE + ' 元宝 → 余 ' + s.yuanbao
        + '，发 ' + JSON.stringify(list) + '（rewardArray ' + JSON.stringify(ra) + '）');
      var v = { eRet: 1 };
      return shaped('quickFinishTask', v) || wrapped('quickFinishTask', v, { achievement: ach() });
    },

    /** 肉鸽接任务：同 acceptTask，入 s.accepted。
     *  v2.6：同 acceptCircleTask 补 `acceptable()` 闸（上游 §一 点名的第二条刷法）。 */
    rogueAcceptTask: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var tid = parseInt(p.taskID, 10) || 0;
      if (!(tid > 0) || !acceptable(s, tid)) {
        noteReject('rogueAcceptTask', 'notAccepted', 'taskID=' + p.taskID + ' acceptable=false');
        return wrapped('rogueAcceptTask', { eRet: 4 }, { achievement: ach() });   // 4 -> 931（客户端有 4 分支）
      }
      s.accepted = s.accepted || [];
      if (s.accepted.indexOf(tid) < 0) s.accepted.push(tid);
      persist();
      env.log('rogueAcceptTask ' + tid + ' delOrder=' + p.delOrder);
      var v = { eRet: 1, skillId: 0, CDTime: 0, serverTime: env.now() };
      return shaped('rogueAcceptTask', v) || wrapped('rogueAcceptTask', v, { achievement: ach() });
    },

    /** 肉鸽领任务奖励：先验 accepted、再验共用领奖账，才发奖并移入 done。 */
    getRogueFinishTaskAward: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var tid = parseInt(p.taskID, 10) || 0;
      s.accepted = s.accepted || [];
      s.done = s.done || [];
      if (s.accepted.indexOf(tid) < 0) {
        noteReject('getRogueFinishTaskAward', 'notAccepted', 'taskID=' + tid);
        return wrapped('getRogueFinishTaskAward', { eRet: 4 }, { achievement: ach() });
      }
      if (!canClaim(s, tid)) {
        noteReject('getRogueFinishTaskAward', 'notAccepted', 'alreadyClaimed taskID=' + tid);
        env.log('getRogueFinishTaskAward ' + tid + ' 拒绝：共用领奖账已记过');
        return wrapped('getRogueFinishTaskAward', { eRet: 4 }, { achievement: ach() });
      }
      var note = { eco: {}, skch: {}, ivch: {}, eqch: {} };
      var ra = {};
      // 奖励对统一由 taskRewardPairs 给（真任务走 BZ_TASKS.r，环任务走 BZ_CIRCLE_TASK 当前档位）
      var list = taskRewardPairs(tid);
      if (list.length) grantRewardList(s, list, note, ra);
      markClaim(s, tid);
      bumpTaskCounter(s, tid);   // v2.7.1：肉鸽任务完成计数
      s.accepted.splice(s.accepted.indexOf(tid), 1);
      if (s.done.indexOf(tid) < 0) s.done.push(tid);
      persist();
      env.log('getRogueFinishTaskAward ' + tid + ' 发 ' + JSON.stringify(list) + '（已记领奖账）');
      var v = { eRet: 1, rewardArray: ra, equipObj: {}, note: note };
      return shaped('getRogueFinishTaskAward', v) || wrapped('getRogueFinishTaskAward', v, { achievement: ach() });
    },

    /* ============ 第 4 批 C03〔战斗结算〕新 handler ============
     * ⚠ 线上名 ↔ 注册名 大面积错位（HANDOVER §5.1 的老坑），照注册名注册会静默落进 UNKNOWN：
     *   BATTLE_END_REWARD            → CheckBattleResult           （**已有**，本批不动）
     *   SERVER_NPC_BATTLE_END        → TowerBattleResult
     *   USER_PVP_OVER                → NewPVPBattleResult
     *   REQ_WM_ADV_RWD               → GetRandomEventAward
     *   ROGUE_PVP_BATTLE_END         → NewRoguePVPBattleResult
     *   SERVER_ROGUE_NPC_BATTLE_END  → rogueBattleResult
     *   REQ_MP_RESULT                → mulitiNpcBattleResult
     *   TOWER_RANDOM_EVENT           → chanllengeTower（注意上游就拼错了 chanllenge，别改）
     *   其余一一对应。
     * 映射表：tools/actions.json（注册名 → User.<线上名>）。
     *
     * 字段契约（谁会被客户端读、缺了崩不崩）：batch4-facts-20261025/C1-shape-hints-c03.md，
     *   来源是上游 v2.6 extract_shape.py 自己产出的 out/shape-hints.json（649 actions），不是手抄。
     * ⚠ 这些动作普遍带 retryOnEmpty（空数据会触发客户端重发），所以应答**绝不许空**：
     *   至少要带 eRet，带字段的必须按 kind 给对类型，否则就是 14~15ms 重发死锁
     *   （同 getBigGrowupData 的事故形态，HANDOVER §2C）。
     *
     * 本段的发放政策：**只有 6 个纯查询/无奖励语义的动作先落地**。
     *   带奖励的 12 个（TowerBattleResult / NewRoguePVPBattleResult / diceBattleResult /
     *   goodAndEvilBattleResult / roguePveBattleResult / chanllengeTower / activateTowerEvent /
     *   mulitiNpcBattleResult / GetRandomEventAward / choosePandaEvent 等）**故意留空**：
     *   它们是结算发奖口，客户端提交的数值一律不可信；在没有服务端奖励表 + 可校验键之前落地，
     *   就是再造一个 C02 那种白拿口子。等 C3-reqkeys 取证回来再按"服务端表 + 键"口径写。 */

    /** 爬塔数据查询。GET_NEW_SWEEP_EVENT，shape-hints 0 字段 → 只需非空应答。 */
    GetNewSweepTowerData: function () {
      var v = { eRet: 1 };
      return shaped('GetNewSweepTowerData', v) || wrapped('GetNewSweepTowerData', v, { achievement: ach() });
    },

    /** 进入爬塔界面取数据。ENTER_GET_CLIMBLING_EVENT，`towerArray` 客户端直读（crashOnMissing）。
     *  本工程没有爬塔层数表 → 只能回空数组（非 null/undefined，避免 .length 崩）；
     *  zeroIsWrong 说明空数组语义上"不对"，但没有数据源，属于已知留白。 */
    GetClimbingTowerData: function () {
      var v = { eRet: 1, towerArray: [] };
      return shaped('GetClimbingTowerData', v) || wrapped('GetClimbingTowerData', v, { achievement: ach() });
    },

    /** 看秘密熊猫事件。LOOK_SECRET_PANDA_EVENT，`secret` 客户端直读（crashOnMissing）。
     *  kind = array|object|array|string，但可见消费点 `scripts2.js:75376`
     *  `for (var o = 0; o < t.data.secret.length; o++) e += t.data.secret[o]`
     *  是**当下标数组用**的 → 给 `[]`（给 `{}` 虽然也不崩，但 `.length` 是 undefined，类型不对）。
     *  zeroIsWrong=true 说明空数组语义上"没内容"，但我们没有秘密事件数据源 → 已知留白。 */
    lookSecretEvent: function () {
      var v = { eRet: 1, secret: [] };
      return shaped('lookSecretEvent', v) || wrapped('lookSecretEvent', v, { achievement: ach() });
    },

    /** 新扫荡。NEW_TOWER_SWEEP_EVENT，0 字段。纯状态动作，不发奖。 */
    newSweepTower: function () {
      var v = { eRet: 1 };
      return shaped('newSweepTower', v) || wrapped('newSweepTower', v, { achievement: ach() });
    },

    /** 按层关闭新扫荡。CLOSE_NEW_SWEEP_EVENT，0 字段。 */
    closeNewSweepTowerByLv: function () {
      var v = { eRet: 1 };
      return shaped('closeNewSweepTowerByLv', v) || wrapped('closeNewSweepTowerByLv', v, { achievement: ach() });
    },

    /** 选秘密事件。SELECT_SECRET_PANDA_EVENT，0 字段。 */
    chooseSecretEvent: function () {
      var v = { eRet: 1 };
      return shaped('chooseSecretEvent', v) || wrapped('chooseSecretEvent', v, { achievement: ach() });
    },

    /** 肉鸽多人 PVP NPC 战斗结算（SERVER_ROGUE_NPC_BATTLE_END）。
     *  reqKeys 取证：`index.js:105597-105602` `var e = { npcID: t.npcID, win: t.data[0] }` —— **有 npcID**。
     *  ✅ v2.7 按上游口径接 `BZ_NPCDROP[npcID]`（与 CheckBattleResult 同一套：只认这个可校验键，
     *  客户端自报的战果数值一律不进钱包）。 */
    rogueBattleResult: function (p) {
      p = p || {};
      var npc = parseInt(p.npcID, 10) || 0;
      var win = (p.win === true) || (parseInt(p.win, 10) === 1);
      var got = dropForNpc(win ? npc : 0, 'rogueBattleResult');
      var v = { eRet: 1 };
      return shaped('rogueBattleResult', v) || wrapped('rogueBattleResult', v, { achievement: ach() });
    },

    /** PVP 战斗结束。USER_PVP_OVER，0 字段。同上：只回成功，不发奖。 */
    NewPVPBattleResult: function () {
      var v = { eRet: 1 };
      return shaped('NewPVPBattleResult', v) || wrapped('NewPVPBattleResult', v, { achievement: ach() });
    },

    /* ---- 以下 10 个：reqKeys 已取证（batch4-facts-20261025/C3-reqkeys.md）----
     * 类型全部按**客户端真实消费点**定，不是猜的：
     *   awardObj     index.js:67705 `o.awardObj.hasOwnProperty("5")` → 对象
     *   rewardArray  index.js:67707 `for (var n in o.rewardArray)`   → 对象
     *   gemId        scripts3.js:24429 `e.gemId[0]`                  → 数组（下标读）
     *   npcArr       index.js:143820 `i.npcArr.length > 0`           → 数组
     *   delTaskIds   index.js:133311 `for (e=0; e<t.length; e++)`    → 数组
     *   booksObj     scripts3.js:70689 `for (var e in t.booksObj)`   → 对象
     *   prestige/contribution  scripts3.js:35349 `t.prestige.toString()` → **必须是数字**
     *     （undefined.toString() 会抛；zeroIsWrong=false，所以 0 合法）
     *   mapData2 / equipObj / eventID / equipments（container）      → 对象
     */

    /** 爬塔 NPC 战斗结算（SERVER_NPC_BATTLE_END）。reqKeys: win, gTime, hg, hgtimes, 可选 lv(楼层)。
     *  ⚠ **不发奖**：只有楼层号 `lv`，没有 npcID，本工程也没有「楼层→奖励」表；
     *  照客户端战果发奖就是白拿。等上游给表再接线。 */
    TowerBattleResult: function (p) {
      p = p || {};
      var v = { eRet: 1, awardObj: [], rewardArray: {}, gemId: [] };
      env.log('TowerBattleResult 结算 lv=' + p.lv + ' win=' + p.win + '（无楼层奖励表 → 不发奖）');
      return shaped('TowerBattleResult', v) || wrapped('TowerBattleResult', v, { achievement: ach() });
    },

    /** 肉鸽 PVP 结算（ROGUE_PVP_BATTLE_END）。reqKeys: {npcID, win, pass, actionArr}。
     *  ✅ 可安全发奖：有服务端可校验键 `npcID`，奖励取自 `BZ_NPCDROP[npcID]`，
     *  与既有 CheckBattleResult **完全同一口径**（客户端数值一律不进钱包）。 */
    NewRoguePVPBattleResult: function (p) {
      p = p || {};
      var npc = parseInt(p.npcID, 10) || 0;
      var win = (p.win === true) || (parseInt(p.win, 10) === 1);
      var got = dropForNpc(win ? npc : 0, 'NewRoguePVPBattleResult');
      var v = { eRet: 1, delTaskIds: [], mapData2: {} };
      return shaped('NewRoguePVPBattleResult', v) || wrapped('NewRoguePVPBattleResult', v, { achievement: ach() });
    },

    /** 肉鸽 PVE 结算（ROGUE_PVE_BATTLE_RESULT）。reqKeys: {npcID, win, pass, actionArr}。
     *  ✅ 同 NewRoguePVPBattleResult：npcID 可校验 → 走 BZ_NPCDROP。 */
    roguePveBattleResult: function (p) {
      p = p || {};
      var npc = parseInt(p.npcID, 10) || 0;
      var win = (p.win === true) || (parseInt(p.win, 10) === 1);
      var got = dropForNpc(win ? npc : 0, 'roguePveBattleResult');
      var v = { eRet: 1, booksObj: {}, mapData2: {}, delTaskIds: [] };
      return shaped('roguePveBattleResult', v) || wrapped('roguePveBattleResult', v, { achievement: ach() });
    },

    /** 善恶/正邪 PK 结算（GOOD_AND_EVIL_BATTLE_RESULT）。
     *  客户端 `t.prestige.toString()` / `t.contribution.toString()` 直读 → 必须是数字。
     *  ⚠ 不发奖（声望/贡献的发放口径要上游定，且请求里没有可校验键）。 */
    goodAndEvilBattleResult: function () {
      var v = { eRet: 1, prestige: 0, contribution: 0 };
      return shaped('goodAndEvilBattleResult', v) || wrapped('goodAndEvilBattleResult', v, { achievement: ach() });
    },

    /* ============ 第 9 批 C08〔PVE 战斗族〕（2026-10-27）============
     * 全批取证：batch9-facts-20261027\scoutG-c08-reqkeys.md（九键逐行）＋ C7-c08-取证与策略.md。
     * 本批只落"单人 PVE 两族"，依据用户 2026-10-27 拍板①档 A / 拍板②`attArr` 回空：
     *   · 做 4 个：enterPVEBattle + beginPVEBattle（琅嬛）、enterRoguePVEBattle + beginRoguePVEBattle（肉鸽）；
     *   · 拒绝 1 个：ChallengePVP（USER_PVP）→ eRet 3（本批 9 个里唯一有优雅退出的分支）；
     *   · 不做 4 个：ChallengeRoguePVP、beginMultiPVEBattle、beginRogueMultiPVEBattle、startMultiPVEBattle
     *     —— 前一个要真人对手、后三个要服务端多人回放引擎（应答是整场战斗数据，`playWithData` 照着演）；
     *     它们的 `eRet≠1` 分支是**空的**（index.js:104102 / 110871 / 110877 / 105259 无 else）→ 卡界面，
     *     所以**保留现状**（SHAPED/UNKNOWN 兜底），与入口批次一并处置，见 docs\OPEN-ISSUES.md ISSUE-8。
     *
     * 通用口径：
     *   ① `attArr` 一律回空数组 —— 客户端所有读点都在 `o.attArr.length > 0` 守卫里
     *      （index.js:98855 / 104183 / 104195），空则两侧 `serverHp=0 / serverHpLimt=1`；
     *      而 `serverHp` 只是"服务端保命血"（实体本地血打完时把它拉回来，index.js:11668-11673），
     *      ⇒ 空数组 = 不保命、不覆盖本地血量，战斗由客户端本地模拟自然打完，不崩不卡。
     *   ② 本批**没有任何发奖口**：4 个动作都不写存档、不动钱包、不碰 CURRENCY_SLOTS，
     *      也没有 `todayKey()` 限次（战斗奖励仍由已实现的结算族按 npcID 逐条对账）。 */

    /** 琅嬛 1v1 开局（REQ_LANGHUAN_COMBAT = `User.enterPVEBattle`）。
     *  请求 `{lv?, npcID, mp, gTime, hgtimes}`（index.js:67548-67559，两个分支只差 lv）。
     *  回调 index.js:98832-98851 逐句要：`o.attArr`→syncData、`o.gold`→reviveCost、
     *    `o.AttckData`→parsePlayerData+createPlayerBattleEntity、`o.npcArr/o.npcID`→generateNpcData、
     *    `o.randSeed`→initBattleSystem。
     *  ⚠ 以前这里落 SHAPED 兜底：AttckData 恒 `{}`、npcID 恒 310003（形状表默认值）→
     *    玩家实体是空壳、对手永远是同一只。现在按本档真值 + 客户端报的 npcID 给。
     *  ⚠ `gold` 置 0：客户端拿它当"复活价"（`t.reviveCost = o.gold`，index.js:98835），
     *    而复活动作（LANGH_REVIVE）本工程没做 —— 留着形状默认 99999 会显示一个假的复活价。 */
    enterPVEBattle: function (p) {
      p = p || {};
      var s = loadSave();
      var np = pickBattleNpc(p.npcID, 'enterPVEBattle');
      var v = {
        eRet: 1,
        AttckData: buildAttckData(s),
        attArr: [],
        gold: 0,
        npcArr: np.npcArr,
        npcID: np.npcID,
        randSeed: battleSeed(),
      };
      env.log('enterPVEBattle 琅嬛开局 npcID=' + np.npcID + ' npcArr=' + np.npcArr.length + ' 项'
        + (np.fallback ? '（兜底）' : '')
        + '（AttckData 已换本档 baseValueAy roleID=' + ((s && s.roleID) || 0) + '；attArr 空 = 本地模拟）');
      return shaped('enterPVEBattle', v) || wrapped('enterPVEBattle', v, { achievement: ach() });
    },

    /** 琅嬛战斗动作（PVE_ACTION = `User.beginPVEBattle`）。
     *  请求 `{action, paramID, paramID1, paramID2}`（index.js:98943-98948；paramID2 = `bs.entityA.battleID`）。
     *  回调 index.js:98852-98904：先按 attArr 定 serverHp，再 `switch(o.action)` 决定播什么
     *    —— 1 武学(`castSkill`) / 2 用药 / 3 调息 / 6 换人 / 13 空 / 0 逃跑（98878-98901）。
     *  ⚠ **`action` 必须原样回声**：这个回调没有 else 分支，回声错了那一招就永远播不出来（软锁）。
     *  ⚠ `paramID2` 回声 → 客户端 `o.paramID2 && (i = o.paramID2)`(98877) 拿它当施法者 battleID，
     *    而 entityA.battleID 正是 AttckData.roleID（index.js:74775）—— 两边必须一致，不然 HP 对不上号。 */
    beginPVEBattle: function (p) {
      p = p || {};
      var v = {
        eRet: 1,
        action: asInt(p.action, 0),
        attArr: [],
        paramID: asInt(p.paramID, 0),
        paramID1: asInt(p.paramID1, 0),
        paramID2: asInt(p.paramID2, 0),
      };
      return shaped('beginPVEBattle', v) || wrapped('beginPVEBattle', v, { achievement: ach() });
    },

    /** 肉鸽 1v1 开局（REQ_ROGUE_PVE_COMBAT = `User.enterRoguePVEBattle`）。
     *  请求 `{npcID, hp, hplimit, mp}`（发送点 index.js:104252；hp/mp 在 104248-104250 追加）。
     *  回调 index.js:104129-104191：`o.attArr`→syncData、`o.AttckData`→parsePlayerData、
     *    `o.npcArr/o.npcID`→generateNpcData、`o.randSeed`、可选 `o.exchangeNpcArr` /
     *    `AttckData.floorBuff` / `AttckData.eliteBuffs`（都有 hasOwnProperty 守卫，缺了不崩）。
     *  肉鸽的血跨层携带：客户端把当前 hp/hplimit/mp 报上来 → 投进 AttckData 的
     *    `rogueHp/rogueHpLimit/rogueMp`（createPlayerBattleEntity 用它们覆盖 hp/mp，index.js:74898-74900）。 */
    enterRoguePVEBattle: function (p) {
      p = p || {};
      var s = loadSave();
      var np = pickBattleNpc(p.npcID, 'enterRoguePVEBattle');
      var v = {
        eRet: 1,
        AttckData: buildAttckData(s, {
          rogueHp: asInt(p.hp, undefined),
          rogueHpLimit: asInt(p.hplimit, undefined),
          rogueMp: asInt(p.mp, undefined),
        }),
        attArr: [],
        exchangeNpcArr: [],
        npcArr: np.npcArr,
        npcID: np.npcID,
        randSeed: battleSeed(),
      };
      env.log('enterRoguePVEBattle 肉鸽开局 npcID=' + np.npcID + ' npcArr=' + np.npcArr.length + ' 项'
        + (np.fallback ? '（兜底）' : '')
        + ' 报血 hp=' + asInt(p.hp, -1) + '/' + asInt(p.hplimit, -1) + ' mp=' + asInt(p.mp, -1));
      return shaped('enterRoguePVEBattle', v) || wrapped('enterRoguePVEBattle', v, { achievement: ach() });
    },

    /** 肉鸽战斗动作（ROGUE_PVE_ACTION = `User.beginRoguePVEBattle`）。
     *  请求 `{action, paramID, paramID1, paramID2}`（index.js:104460-104465）。
     *  回调 index.js:104192-104239：`o.attArr`→serverHp + `switch(o.action)`（104208-104238），同琅嬛口径。 */
    beginRoguePVEBattle: function (p) {
      p = p || {};
      var v = {
        eRet: 1,
        action: asInt(p.action, 0),
        attArr: [],
        paramID: asInt(p.paramID, 0),
        paramID1: asInt(p.paramID1, 0),
        paramID2: asInt(p.paramID2, 0),
      };
      return shaped('beginRoguePVEBattle', v) || wrapped('beginRoguePVEBattle', v, { achievement: ach() });
    },

    /** 真人 PK（USER_PVP = `User.ChallengePVP`）。
     *  请求 `{otherRoleID, mp, gTime, hgtimes, flag?}`（index.js:101348-101355）——**必须有另一个真人对手**。
     *  离线服没有真人：伪造 `EnemyData` 就是替玩家造一个对手（用户 2026-10-27 拍板否决档 B）→ 拒绝。
     *  为什么敢用 3：这是本批 9 个动作里**唯一有优雅退出**的回调分支 ——
     *    `else if (3 === o.eRet) { Alert.show(getText(1399)); e.dispose(); }`（index.js:101338-101341），
     *    其余码走 `else e.dispose()`（静默关闭）。文案 1399 是**客户端自带**字符串（原服的"不可挑战"类提示），
     *    我们不造文案；⚠ 该文案原文离线不可读，已在取证文档登记为未验证。 */
    ChallengePVP: function (p) {
      p = p || {};
      noteReject('ChallengePVP', 'noHumanOpponent', 'otherRoleID=' + (p && p.otherRoleID) + ' 离线服无真人对手');
      env.log('ChallengePVP 拒绝：离线服无真人对手 otherRoleID=' + (p && p.otherRoleID) + '（eRet 3 → 客户端弹提示后 dispose）');
      return shaped('ChallengePVP', { eRet: 3 }) || wrapped('ChallengePVP', { eRet: 3 }, { achievement: ach() });
    },

    /* ============ 第 10 批 C09〔技巧摸奖〕（2026-10-27）============
     * 成员：relations.md:68-73 —— 8 主 + `GET_SKILL_GRASP`（同面板必做）+ `EQUIP_RESOLVE`/`SKILL_GRASP`（顺手）。
     * 上游口径（第 9 批验收包）：**先扣钱再发；奖励 id 对上钱包字段就入账、对不上只显示；同一次抽奖不能重复领。**
     * 本批：**实现 7 个**（摸奖 3 + 口诀 4）／**锁 4 个**（分解两件 + 口诀合成两件，缺产物表，用户拍板锁住）。
     * 取证：batch10-facts-20261027\{scoutJ-c09-reqkeys, scoutK-c09-tables, scoutM-c09-ui-fields}。 */

    /** 摸奖奖池（GET_KNACK_LOTTERY = `User.getKnackLottery`）。请求 `{}` 或 `{lotteryId}`（scripts3.js:90047）。
     *  ⚠ 客户端对回包是**裸读**，价格还必须由服务端下发（它不读机台表的 one_shot/ten_shot）：
     *      · `tenPrice[1]` —— `refresh()` 在 onLoad 就调，`showGetTen` 无条件走 → **缺了界面一打开就 TypeError**（90573）
     *      · `onePrice[1]`（90404/90565）、`trick_item`（90194→90328/90384/90454）、
     *        `skillArr`（90401/90459/90597）、`lotteryArr`（90366）、`t`（90583 `.toString()`）、`eTime`（90616）
     *  ⚠ 只暴露常驻池 `lotteryId=1`：机台表行 2/3 是限时池，窗口 1790697600000→1792339199000（≈9-28→10-18）**已过期**。 */
    getKnackLottery: function (p) {
      p = p || {};
      var D = knackTables();
      var s = loadSave();
      var mainId = D ? D.machine.id : 1;
      var id = asInt(p.lotteryId, 0) || mainId;
      var v = {
        eRet: 1,
        lotteryId: id,
        lotteryArr: D ? clone(D.machine.pools) : [],
        t: 0,                       // 剩余次数：本工程按券收费，`t` 只喂显示文案（90583）
        isFree: (id === mainId && knackFreeLeft(s) > 0) ? 1 : 0,
        poolDateId: 0,
        isRewardState: 0,
        skillArr: D ? clone(D.skills) : [],
        eTime: {},
        optionalEndTimeMap: {},
        order: 0,
        onePrice: D ? [D.machine.ticket, D.machine.one] : [],
        tenPrice: D ? [D.machine.ticket, D.machine.ten] : [],
        trick_item: D ? D.machine.ticket : 0,
        nextSkillArr: [],
      };
      env.log('getKnackLottery lotteryId=' + id + ' 券=' + v.trick_item + ' 单抽=' + v.onePrice[1]
        + ' 十连=' + v.tenPrice[1] + ' isFree=' + v.isFree + ' 技能池=' + v.skillArr.length);
      return shaped('getKnackLottery', v) || wrapped('getKnackLottery', v, { achievement: ach() });
    },

    /** 抽奖（KNACK_LOTTERY = `User.knackLottery`）。请求 `{lotteryId, lotteryType, skillId}`（90078-90082）。
     *  `lotteryType`：**1=单抽、2=十连**（十连不是"一次抽 10 个"，是按 ten_shot 扣 10 张券后连抽 10 次）。
     *  ⚠ 回包必须带 `showKnack` **数组**：`TrickRewardUI.setData` 存它、`start()` 立刻 `.length`（91297/91303），
     *    逐项只读 `.knackId`（91461/91476/91489）→ 缺了就是"抽完弹不出结算框"。
     *  防重：请求没有 nonce，靠**先扣后发**——重复请求会再扣一次券（重复≠白拿）；扣券/发放/落盘在同一个 persist 里。 */
    knackLottery: function (p) {
      p = p || {};
      var D = knackTables();
      var s = ensureLedger(loadSave());
      if (!D) {
        env.log('knackLottery 表缺失（BZ_KNACK_LOTTERY undefined）→ 拒绝');
        return shaped('knackLottery', { eRet: 5 }) || wrapped('knackLottery', { eRet: 5 }, { achievement: ach() });
      }
      var type = asInt(p.lotteryType, 1);
      var draws = (type === 2) ? 10 : 1;
      var cost = (type === 2) ? D.machine.ten : D.machine.one;
      var ticket = D.machine.ticket;
      var free = (type === 1) ? knackFreeLeft(s) : 0;
      var have = parseInt((s.bag || {})[String(ticket)], 10) || 0;
      if (!free && have < cost) {
        noteReject('knackLottery', 'insufficient', '需要 ' + cost + ' 张 ' + ticket + '，只有 ' + have);
        env.log('knackLottery 券不足：需要 ' + cost + ' 张 ' + ticket + '，只有 ' + have + '（eRet 5 → 客户端弹文案 1093）');
        return shaped('knackLottery', { eRet: 5 }) || wrapped('knackLottery', { eRet: 5 }, { achievement: ach() });
      }
      if (free) {
        s.knackFree = { d: todayKey(), n: (parseInt((s.knackFree && s.knackFree.n), 10) | 0) + 1 };
        env.log('knackLottery 用掉今日免费额度（剩余 ' + knackFreeLeft(s) + '）');
      } else {
        consumeItem(s, ticket, cost);
      }
      var g = knackSlot(s);
      var got = [];
      for (var i = 0; i < draws; i++) {
        var kid = knackRollOnce();
        if (!kid) continue;
        if (g.knackBag.indexOf(kid) < 0) g.knackBag.push(kid);
        got.push(kid);
      }
      persist();
      var show = [];
      for (var j = 0; j < got.length; j++) show.push({ knackId: got[j] });
      // ⚠ 观察守卫要"能解释的差额"：扣了券就必须在 `note.ivch` 里回**扣完之后的绝对值**，
      //   否则每次付券抽奖都会刷一条 `OBS 未解释差额 knackLottery: bag.9191 N→M`（真机实测踩到）。
      var note = { ivch: {}, eqch: {}, eco: {} };
      if (!free) note.ivch[ticket] = parseInt((s.bag || {})[String(ticket)], 10) || 0;
      var v = {
        eRet: 1,
        t: 0,
        isFree: knackFreeLeft(s) > 0 ? 1 : 0,
        isRewardState: 0,
        skillId: asInt(p.skillId, 0),
        showKnack: show,
        note: note,
      };
      env.log('knackLottery type=' + type + (free ? '（免费）' : '（扣 ' + cost + ' 张 ' + ticket
        + '，余 ' + (parseInt((s.bag || {})[String(ticket)], 10) || 0) + '）')
        + ' 抽到 [' + got.join(',') + '] 背包共 ' + g.knackBag.length + ' 条');
      return shaped('knackLottery', v) || wrapped('knackLottery', v, { achievement: ach() });
    },

    /** 摸奖记录（GET_KNACK_LOTTERY_HISTORY = `User.getKnackLotteryHistory`，无参）。
     *  回调只读 `e.history`（90039），UI 只遍历 → 回空数组安全（记录结构未取证，见策略文档 §七.3）。 */
    getKnackLotteryHistory: function () {
      var v = { eRet: 1, history: [] };
      return shaped('getKnackLotteryHistory', v) || wrapped('getKnackLotteryHistory', v, { achievement: ach() });
    },

    /** 口诀面板（GET_SKILL_GRASP = `User.getSkillGrasp`，第二参 `null`）。
     *  回调读 `e.skillGrasp`（81077 有守卫）→ 交给 `initData(t)`，里面读 `t.knackBag` / `t.skillGrasp`（81042-81043）。 */
    getSkillGrasp: function () {
      var s = loadSave();
      var g = knackSlot(s);
      var v = { eRet: 1, skillGrasp: clone(g) };
      return shaped('getSkillGrasp', v) || wrapped('getSkillGrasp', v, { achievement: ach() });
    },

    /** 口诀背包/装配查询（SKILL_GRASP = `User.skillGrasp`，请求 `{skillId}`）。
     *  回调读 `e.knackBag`（81105 有守卫）、`e.skillGraspData`（81106 有守卫）。 */
    skillGrasp: function () {
      var s = loadSave();
      var g = knackSlot(s);
      var v = { eRet: 1, knackBag: clone(g.knackBag), skillGraspData: clone(g.skillGrasp) };
      return shaped('skillGrasp', v) || wrapped('skillGrasp', v, { achievement: ach() });
    },

    /** 给技能装口诀（CHANGE_SKILL_KNACK = `User.changeSkillKnack`，请求 `{skillId, knackIds}`，81173）。
     *  ⚠ 回调 81084 对 `skillGraspData` 是**无守卫**读（同包 81082 却有守卫）→ 必须给对象。 */
    changeSkillKnack: function (p) {
      return applyChangeKnack(p, 'changeSkillKnack');
    },

    /** 肉鸽里装口诀（ROGUE_CHANGE_SKNACK = `User.rgChangeSkillKnack`，注意上游原文拼写 **SKNACK**，别"纠正"）。
     *  同形请求（74047）；回调 74000 `cc.js.isEmptyObject(e.skillGraspData) || changeKnack(...)` 同样无守卫。 */
    rgChangeSkillKnack: function (p) {
      return applyChangeKnack(p, 'rgChangeSkillKnack');
    },

    /** ── 以下 4 个：**缺产物表 → 锁**（用户 2026-10-27 拍板）──
     *  `EQUIP_RESOLVE` / `EQUIP_BATCH_RESOLVE`：装备分解。客户端回调只做一件事——把 `rewardArray` 弹成
     *    "获得奖励"框（64926 / 64934，**无守卫**），产物完全由服务端算。
     *  为什么给不出产物：444 张 dump 里没有分解表；`tbl_item.decomposition` 只有档位 1/2/3（460 件 Type=1 装备有），
     *    `decompose` 列全 0，也没有 `*resolve*` / `*compose*` 表。上游"奖励 id 对不上钱包就只显示"这条挡不住
     *    "根本没有 id 可给"——给空奖励等于把装备吞了，所以锁。
     *  `RESOLVE_KNACK` / `BATCH_RESOLVE_KNACK`：口诀合成/分解，同一理由（没有"几换几"的表）一并锁，回执申报。
     *  回 eRet 2（各回调的非 1 分支：RESOLVE/BATCH_RESOLVE 有 `hasOwnProperty("rewardArray")` 守卫、不会崩）。 */
    resolveEquip: function (p) {
      noteReject('resolveEquip', 'noProductTable', 'itemID=' + (p && p.itemID));
      return shaped('resolveEquip', { eRet: 2 }) || wrapped('resolveEquip', { eRet: 2 }, { achievement: ach() });
    },
    batchResolveEquip: function (p) {
      noteReject('batchResolveEquip', 'noProductTable', 'itemIDs=' + JSON.stringify((p && p.itemIDs) || []));
      return shaped('batchResolveEquip', { eRet: 2 }) || wrapped('batchResolveEquip', { eRet: 2 }, { achievement: ach() });
    },
    resolveKnack: function (p) {
      noteReject('resolveKnack', 'noProductTable', 'knack=' + JSON.stringify((p && p.knack) || []));
      return shaped('resolveKnack', { eRet: 2 }) || wrapped('resolveKnack', { eRet: 2 }, { achievement: ach() });
    },
    batchResolveKnack: function (p) {
      noteReject('batchResolveKnack', 'noProductTable', 'knackData=' + JSON.stringify((p && p.knackData) || []).slice(0, 120));
      return shaped('batchResolveKnack', { eRet: 2 }) || wrapped('batchResolveKnack', { eRet: 2 }, { achievement: ach() });
    },

    /** 口诀兑换面板（GET_SKILL_TRICK_EXCHANGE_DATA = `User.getSkillTrickExchangeData`，index.js:60406）。
     *  ⚠ **不在 C09 名单里，但它是摸奖同面板的兄弟动作**：一进 `skillGrasp` 那个 bundle，客户端就顺带请求它。
     *  真机实测（2026-10-27）：不实现 → 走 UNKNOWN 兜底 → 回了 `{eRet:1}` 没有 `skillTrickExchangeData` →
     *  客户端 `onGetTrickExchangeData`（scripts3.js:89728）裸读 `o.nextRefreshTime` 直接 **TypeError**
     *  （日志 `Cannot read property 'nextRefreshTime' of undefined`）。所以必须给对象，字段全是裸读：
     *  `nextRefreshTime / exchangeShop / remainingNum / costPrice / skillId`（89728-89732）。
     *  本工程**没有兑换表**（444 张 dump 无 `*trick_exchange*`）→ 回"空兑换店"：结构对、列表空、零奖励面。
     *  点兑换的那一步（`skillTrickExchangeIndex`，60408）仍不实现 —— 列表空就没有可点的格子。 */
    getSkillTrickExchangeData: function () {
      var v = {
        eRet: 1,
        skillTrickExchangeData: {
          nextRefreshTime: 0,
          exchangeShop: [],
          remainingNum: 0,
          costPrice: 0,
          skillId: 0,
        },
      };
      env.log('getSkillTrickExchangeData → 空兑换店（无兑换表）');
      return shaped('getSkillTrickExchangeData', v) || wrapped('getSkillTrickExchangeData', v, { achievement: ach() });
    },

    /** 刷新口诀兑换店（REFRESH_SKILL_TRICK_EXCHANGE_DATA，index.js:60407）。
     *  回调读 `e.exchangeShop` / `e.costPrice`（89744/89747，都为属性读、不抛），但会 `remainingNum -= 1`
     *  → 不给字段会变成 NaN。回空列表 + 0 价，让按钮按下去是"刷新了一下，还是空的"。 */
    refreshSkillTrickExchangeData: function () {
      var v = { eRet: 1, exchangeShop: [], costPrice: 0 };
      return shaped('refreshSkillTrickExchangeData', v) || wrapped('refreshSkillTrickExchangeData', v, { achievement: ach() });
    },

    /** 塔层随机事件（TOWER_RANDOM_EVENT）。reqKeys: {lv}。
     *  `npcArr` 客户端 `i.npcArr.length > 0` 判空 → 必须是数组。不发奖（无事件表）。 */
    chanllengeTower: function (p) {
      p = p || {};
      var v = { eRet: 1, npcArr: [], eventID: {}, equipments: {} };
      env.log('chanllengeTower 进入塔层 lv=' + p.lv + '（无事件表 → npcArr 空）');
      return shaped('chanllengeTower', v) || wrapped('chanllengeTower', v, { achievement: ach() });
    },

    /** 激活塔层事件（ACTIVE_TOWER_EVENT）。reqKeys: {eventID}。不发奖。 */
    activateTowerEvent: function (p) {
      p = p || {};
      var v = { eRet: 1, npcArr: [], eventID: {} };
      env.log('activateTowerEvent eventID=' + p.eventID + '（无事件表 → 不回 NPC）');
      return shaped('activateTowerEvent', v) || wrapped('activateTowerEvent', v, { achievement: ach() });
    },

    /** 选熊猫事件（TOWER_CHOOSE_PANDA_EVENT）。reqKeys: {idx, lv}。
     *  形状表已有默认（batch_sweep_data / rewardArray 空对象）。不发奖。 */
    choosePandaEvent: function (p) {
      p = p || {};
      var v = { eRet: 1, batch_sweep_data: {}, rewardArray: {} };
      env.log('choosePandaEvent idx=' + p.idx + ' lv=' + p.lv);
      return shaped('choosePandaEvent', v) || wrapped('choosePandaEvent', v, { achievement: ach() });
    },

    /** 多人 NPC 战斗结算（REQ_MP_RESULT）。reqKeys: 对象含 {speed, hgtimes, …}。
     *  ⚠ 请求对象里**没有**可校验的 npcID（未确认），故不发奖。 */
    mulitiNpcBattleResult: function () {
      var v = { eRet: 1, equipObj: {}, gemId: [] };
      return shaped('mulitiNpcBattleResult', v) || wrapped('mulitiNpcBattleResult', v, { achievement: ach() });
    },

    /** 随机事件领奖（REQ_WM_ADV_RWD）。reqKeys: **{adventureID, award, eventID}**。
     *  v2.7.1 拍板 2 接线：奖励唯一来源 = 服务端表 BZ_ADVENTURE（adventure.json，109 行）。
     *  客户端证据链：
     *    - 分支码（award 形参 e）只当**分支**用：1=战斗胜利结算（index.js:88678 successFuncCallBack）、
     *      2=战斗失败（88703 failFuncCallBack）、3=领取（88635 reqAwards ← 镖牌结束 29269）、
     *      4=快胜结算（88577 quickVitorFinish）、5=快败结算（88593 quickFailFinish）。
     *      ⚠ 上游只给了 1/2/3/5 的列映射；4 是客户端实证存在的"快胜"分支 → 走胜利列 awardwin
     *      （语义同 1），上游验收已同意。
     *    - **adventureID 恒为 0**：WMapAdvModel.advCurId 三处赋值（143805/143812/143861）全是 0，
     *      从不赋真值 → 真正的键是 **eventID** = gsp_event 表行 id
     *      （88453-88455 onEnterAdventure；请求侧 143868）。服务端先按 adventureID 直查、
     *      查不到按 gsp_event 反查（v2.7.1-accept 小改，实测不改就永远匹配不到任何行）。
     *    - 回调消费端只读 rewardArray / npcArr / liveness（index.js:143816-143835），**不判 eRet**。
     *  1..5 物品映射（拍板 2 通用规则，活体探针定名）：
     *    1=金条→s.gold（CURRENCY_SLOTS 既有）；2=善恶、3=筹码、4=幸福度、5=幻境之尘
     *    —— 都没有钱包字段 → **只在奖励窗显示，不入账、不塞背包**。
     *    实测 adventure 四列里只出现 2/3/4 三种 id（1/5 及真实道具一次都没出现）。
     *  防重复领（accept 小改，两组记账 + 按天清空，都取"少发"方向）：
     *    胜负组 {1,2,4} 与领取组 {3,5} 各每天一次（单次冒险客户端实际只发一个分支，两组是防御隔离）；
     *    s.advDone[rowKey] = {d: todayKey, w: 分支, c: 分支}，跨天即失效（事件会重复刷新）。
     *  负数量条目（如 award2=[4,-1]）是惩罚/代价，跳过不发也不扣（扣玩家没有的东西=造假）。 */
    GetRandomEventAward: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var aid = String(p.adventureID === undefined ? '' : p.adventureID);
      var ev = parseInt(p.eventID, 10) || 0;
      var branch = parseInt(p.award, 10) || 0;
      var row = (typeof BZ_ADVENTURE !== 'undefined' && aid) ? BZ_ADVENTURE[aid] : null;
      var rowKey = aid;
      if (!row && ev) {
        // adventureID 查不到（真实客户端恒为 0，见函数头注）→ 按 gsp_event 反查
        for (var rk0 in BZ_ADVENTURE) {
          if (!hasOwn(BZ_ADVENTURE, rk0)) continue;
          var rrow = BZ_ADVENTURE[rk0];
          if (Array.isArray(rrow.ev) && rrow.ev.indexOf(ev) >= 0) { row = rrow; rowKey = rk0; break; }
        }
      }
      var today = todayKey();
      var done = (s.advDone && typeof s.advDone === 'object') ? s.advDone : {};
      var entry = hasOwn(done, rowKey) ? done[rowKey] : null;
      if (entry && entry.d !== today) entry = null;   // 跨天自动失效（accept 小改 b：事件会重复刷新）
      var isWinGroup = (branch === 1 || branch === 2 || branch === 4);
      var slot = isWinGroup ? 'w' : (branch === 3 || branch === 5 ? 'c' : null);
      if (row && entry && slot && entry[slot]) {
        noteReject('GetRandomEventAward', 'dupClaim', 'rowKey=' + rowKey + ' 组=' + slot + ' 首次分支=' + entry[slot]);
        env.log('GetRandomEventAward 拒绝：rowKey=' + rowKey + ' 组 ' + slot + ' 今日已领（分支 ' + entry[slot] + '）→ 回 4');
        var vr = { eRet: 4, rewardArray: {}, npcArr: [], liveness: 0 };
        return shaped('GetRandomEventAward', vr) || wrapped('GetRandomEventAward', vr, { achievement: ach() });
      }
      // 分支 → 列：1/4→awardwin、2→awardfalse、3→award、5→award2；**未知分支一律不发**
      //（c03 冒烟锁着"award=999999 一分不发"，列选择绝不能有兜底，否则客户端塞什么都能撞出货）
      var col = null;
      if (row) {
        if (branch === 1 || branch === 4) col = row.win;
        else if (branch === 2) col = row.fl;
        else if (branch === 3) col = row.a;
        else if (branch === 5) col = row.a2;
      }
      var note = { eco: {}, skch: {}, ivch: {}, eqch: {} };
      var ra = {};
      if (row && col && col.length) {
        for (var i = 0; i < col.length; i++) {
          var pair = col[i];
          if (!pair || pair.length !== 2) continue;
          var iid = parseInt(pair[0], 10) || 0;
          var ic = parseInt(pair[1], 10) || 0;
          if (!(iid > 0) || !(ic > 0)) continue;   // 负数/零：惩罚条目，跳过
          ra[iid] = (parseInt(ra[iid], 10) || 0) + ic;
          if (currencySlot(iid)) {
            var eco = grantCurrency(s, iid, ic);
            if (eco) { for (var k in eco) if (eco.hasOwnProperty(k)) note.eco[k] = eco[k]; }
          }
          // 非货币（1..5 占位资源等）→ 只进 ra（奖励窗显示），不 grantItem、不进钱包
        }
      }
      if (row && col) {
        // 已判定分支的结算就记账（哪怕该列是空的）；未知分支 col=null：没做判定 → 不记账。
        // 两组各记一次（accept 小改 a），条目带 todayKey，跨天即失效（accept 小改 b）。
        if (!s.advDone || typeof s.advDone !== 'object') s.advDone = {};
        if (!entry) entry = { d: today, w: 0, c: 0 };
        entry[slot || 'w'] = branch;
        s.advDone[rowKey] = entry;
        persist();
      }
      env.log('GetRandomEventAward adventureID=' + aid + ' eventID=' + ev + ' branch=' + branch
        + ' → ' + (row ? ('rowKey=' + rowKey + ' 列 ' + JSON.stringify(col) + '，发 ' + JSON.stringify(ra)) : '表内无此 adventureID/eventID（不发不记账）'));
      var v = { eRet: 1, rewardArray: {}, npcArr: [], liveness: 0 };
      for (var rk in ra) if (ra.hasOwnProperty(rk)) v.rewardArray[rk] = ra[rk];
      return shaped('GetRandomEventAward', v) || wrapped('GetRandomEventAward', v, { achievement: ach() });
    },

    /** 骰子战斗结算（DICE_BATTLE_RESULT）。reqKeys: {gTime, speed, hgtimes}（走 sendReqWithMask）。
     *  ⚠ 这个动作**既不在** v2.6 的 shape-hints（649 actions）**也不在** BZ_SHAPES 形状表里。
     *  客户端回调 scripts3.js:51158 在 `1 == eRet` 时读 `e.dice`（交给 setChirstManData）
     *  并 `this.setCandyData(e)` / `this.updateNpcsDatas(e)` —— 这些数据结构我们造不出来。
     *  ⇒ **回非 1 的 eRet**，让客户端整段跳过：既不会读缺失字段（无 TypeError），
     *   也不会假装成功去渲染一屏空数据。这不是"死功能"，是"本工程未实现该玩法"的诚实应答。 */
    diceBattleResult: function () {
      env.log('diceBattleResult 回 eRet=0：该玩法（骰子/大富翁）未建模，不假装成功以免客户端读 e.dice 抛错');
      var v = { eRet: 0 };
      return shaped('diceBattleResult', v) || wrapped('diceBattleResult', v, { achievement: ach() });
    },

    /* ============ 第 5 批 C16〔成就〕5 个新 handler ============
     * 线上名对照（tools/actions.json，19 个批次里这一族 6 个动作）：
     *   GET_ACHIEVE_DATA            → getAchieveData          （**已有**，本批不动）
     *   GET_ACHIEVE_MARK            → getAchieveMark          {markId}
     *   RECEIVE_ACHIEVE_REWARD      → receiveAchieveReward    {achieveId?, type?}
     *   RECEIVE_ACHIEVE_RATE_REWARD → receiveAchieveRateReward {rateId}
     *   RECEIVE_ACHIEVE_SUIT_REWARD → receiveAchieveSuitReward {suitId, index}
     *   RECEIVE_ACHIEVEMENT_REWARD  → receiveAchievementReward {skillId}
     * reqKeys 取证：scripts3.js:3007-3029 与 90022-90025。
     * 应答字段取证：scripts3.js:2919-2965（三个领取回调）+ 90027-90030。
     *
     * 存档账本沿用 getAchieveData 早已预埋的槽位 `s.achieve`：
     *   {groupPoints, rateIds, pending, received, taskData, suitIds}
     *
     * ⚠⚠ 本批唯一关键判断：**发奖闸门 = `s.achieve.pending`**。
     *   achieve_list 有 2113 条、**57 种 type/type1 条件**、`require` 编码各不相同
     *   （"0|1000" / "10" / "1|1003,310006" / "-61" …），本工程**没有成就进度模型**，
     *   无法验证玩家是否真的达成。而其中 **421 条带实物奖励**、53 档积分奖、240 套奖
     *   —— 凭客户端一句话就发 = 一次能白领 714 份奖励，正是 C02 那种口子。
     *   ⇒ pending 里没有的 id 一律拒绝（eRet 4）。pending 现在恒为空 → **一件不发**。
     *   等进度模型落地后，只要往 pending 写 id（以及给 groupPoints 填初值），
     *   下面这套就开始自动工作，**不用改一行**。 */

    /** 成就标记查询（GET_ACHIEVE_MARK）。{markId}；v2.7 shape-hints 里没有这条，
     *  客户端回调也未见对回包字段的解引用 → 回最小合法体即可，不动存档。 */
    getAchieveMark: function (p) {
      p = p || {};
      var mid = parseInt(p.markId, 10) || 0;
      var known = (typeof BZ_ACHIEVE_MARK !== 'undefined') && BZ_ACHIEVE_MARK[String(mid)];
      env.log('getAchieveMark markId=' + mid + (known ? '（表内有）' : '（表内无此 id）'));
      var v = { eRet: 1 };
      return shaped('getAchieveMark', v) || wrapped('getAchieveMark', v, { achievement: ach() });
    },

    /** 领单条成就奖励。闸：id 必须在 s.achieve.pending（= 已达成待领）。 */
    receiveAchieveReward: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var pv = achPeek(s);
      var tid = parseInt(p.achieveId, 10) || 0;
      if (!(tid > 0) || pv.pending.indexOf(tid) < 0) {
        noteReject('receiveAchieveReward', 'notDone', 'achieveId=' + p.achieveId + ' pending=' + pv.pending.length);
        env.log('receiveAchieveReward 拒绝：' + p.achieveId + ' 不在 pending（无进度模型 → 不放行）');
        return wrapped('receiveAchieveReward', { eRet: 4 }, { achievement: ach() });
      }
      var st = achState(s);   // 闸门通过才建槽位，拒绝路径一个字节不动
      var rw = (typeof BZ_ACHIEVE_RW !== 'undefined' && BZ_ACHIEVE_RW[String(tid)]) || [];
      var meta = (typeof BZ_ACHIEVE_META !== 'undefined' && BZ_ACHIEVE_META[String(tid)]) || null;
      var note = { eco: {}, skch: {}, ivch: {}, eqch: {} };
      var ra = {};
      if (rw.length) {
        var pairs = [];
        for (var i = 0; i < rw.length; i++) pairs.push([parseInt(rw[i][0], 10) || 0, parseInt(rw[i][1], 10) || 0]);
        grantRewardList(s, pairs, note, ra);
      }
      var pi = st.pending.indexOf(tid);
      if (pi >= 0) st.pending.splice(pi, 1);
      if (st.received.indexOf(tid) < 0) st.received.push(tid);
      if (meta) {
        var gk = String(meta[0]);
        st.groupPoints[gk] = (parseInt(st.groupPoints[gk], 10) || 0) + (parseInt(meta[1], 10) || 0);
      }
      persist();
      env.log('receiveAchieveReward ' + tid + ' 发 ' + JSON.stringify(pairs || []) + ' 组积分=' + JSON.stringify(st.groupPoints));
      var v = {
        eRet: 1, achieveIdArr: st.received.slice(), groupPoints: st.groupPoints,
        rewardArray: ra, equipObj: {}, note: note, mr: [],
      };
      return shaped('receiveAchieveReward', v) || wrapped('receiveAchieveReward', v, { achievement: ach() });
    },

    /** 领成就积分档位奖励。闸：该组积分 ≥ 表内 points，且未领过。 */
    receiveAchieveRateReward: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var pv = achPeek(s);
      var rid = parseInt(p.rateId, 10) || 0;
      var row = (typeof BZ_ACHIEVE_RATE !== 'undefined') ? BZ_ACHIEVE_RATE[String(rid)] : null;
      var have = row ? (parseInt(pv.groupPoints[String(row.g)], 10) || 0) : 0;
      if (!row || pv.rateIds.indexOf(rid) >= 0 || have < row.p) {
        noteReject('receiveAchieveRateReward', 'notReached', 'rateId=' + p.rateId + ' have=' + have + ' need=' + (row ? row.p : '?'));
        env.log('receiveAchieveRateReward 拒绝：rateId=' + p.rateId + ' 组积分 ' + have + ' / 需要 ' + (row ? row.p : '?'));
        return wrapped('receiveAchieveRateReward', { eRet: 4 }, { achievement: ach() });
      }
      var st = achState(s);
      var note = { eco: {}, skch: {}, ivch: {}, eqch: {} };
      var ra = {};
      var pairs = [];
      for (var i = 0; i < row.r.length; i++) pairs.push([parseInt(row.r[i][0], 10) || 0, parseInt(row.r[i][1], 10) || 0]);
      if (pairs.length) grantRewardList(s, pairs, note, ra);
      st.rateIds.push(rid);
      persist();
      env.log('receiveAchieveRateReward ' + rid + ' 发 ' + JSON.stringify(pairs));
      var v = { eRet: 1, rateIds: st.rateIds.slice(), rewardArray: ra, equipObj: {}, note: note };
      return shaped('receiveAchieveRateReward', v) || wrapped('receiveAchieveRateReward', v, { achievement: ach() });
    },

    /** 领成就套装奖励。闸：该套装要求的成就 id **全部**已在 received 里。 */
    receiveAchieveSuitReward: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var pv = achPeek(s);
      var sid = parseInt(p.suitId, 10) || 0;
      var idx = parseInt(p.index, 10) || 0;
      var row = (typeof BZ_ACHIEVE_SUIT !== 'undefined') ? BZ_ACHIEVE_SUIT[String(sid)] : null;
      var lack = -1;
      if (row) for (var i = 0; i < row.ach.length; i++) {
        if (pv.received.indexOf(row.ach[i]) < 0) { lack = row.ach[i]; break; }
      }
      var key = String(sid);
      var got = Array.isArray(pv.suitIds[key]) ? pv.suitIds[key] : null;
      if (!row || lack >= 0 || (got && got.indexOf(idx) >= 0)) {
        noteReject('receiveAchieveSuitReward', 'notReached', 'suitId=' + p.suitId + ' lack=' + lack);
        env.log('receiveAchieveSuitReward 拒绝：suitId=' + p.suitId + ' 缺成就 ' + (lack >= 0 ? lack : '（无表或该档已领）'));
        return wrapped('receiveAchieveSuitReward', { eRet: 4 }, { achievement: ach() });
      }
      var st = achState(s);
      // 档位奖励：index 为档位（achieve_suit.reward 里的 `档位|…`）
      var tier = row.t[String(idx)] || [];
      var note = { eco: {}, skch: {}, ivch: {}, eqch: {} };
      var ra = {};
      var pairs = [];
      for (var j = 0; j < tier.length; j++) pairs.push([parseInt(tier[j][0], 10) || 0, parseInt(tier[j][1], 10) || 0]);
      if (pairs.length) grantRewardList(s, pairs, note, ra);
      if (!Array.isArray(st.suitIds[key])) st.suitIds[key] = [];
      st.suitIds[key].push(idx);
      persist();
      env.log('receiveAchieveSuitReward suit=' + sid + ' 档=' + idx + ' 发 ' + JSON.stringify(pairs));
      var v = { eRet: 1, srd: st.suitIds, rewardArray: ra, equipObj: {}, note: note };
      return shaped('receiveAchieveSuitReward', v) || wrapped('receiveAchieveSuitReward', v, { achievement: ach() });
    },

    /** 技巧成就奖励（RECEIVE_ACHIEVEMENT_REWARD）。{skillId}
     *  客户端 90027-90030 读 `achievementReward` + `rewardArray`。
     *  ⚠ 这条的达成条件我们同样没有建模（属技巧/摸奖族），一律拒绝，不发奖。 */
    receiveAchievementReward: function (p) {
      p = p || {};
      noteReject('receiveAchievementReward', 'notModeled', 'skillId=' + (p && p.skillId));
      env.log('receiveAchievementReward 拒绝：skillId=' + (p && p.skillId) + ' 技巧成就条件未建模 → 不发奖');
      return wrapped('receiveAchievementReward', { eRet: 4 }, { achievement: ach() });
    },

    /* ============ 第 6 批 C04〔婚姻子女〕（2026-10-26）============
     * 成员 16 + 同面板 5，线上名/请求/应答取证：batch6-facts-20261026/scoutA-reqkeys.md（21 节逐字段）。
     * 表：propose.json（36 NPC，无奖励列）/ make.json（5 档，无奖励列）→ BZ_PROPOSE / BZ_MAKE。
     * 本批**没有任何发钱口**： scoutB 逐列核对三张命中表均无 award/reward/price 列；
     *   唯一读 rewardArray 的 marryAward（宾客礼金）回空（少发方向，宾客仍入婚礼流程）。
     * 策略三分：
     *   【状态机·实现】proposeNpc / marryNpc / divorceNpc / beginWedding / makeLove —— 全部走
     *     s.marryObj（TPL 抓包快照 24 键做骨架），LoadGame 回放；
     *   【面板·实现】GetWhoreData 回空 girlData（面板能开、零数据）、getLikeEvent 走客户端自有"无事件"流(eRet 4)；
     *   【子系统】领养/出生/取名已接（v2.7.1-accept2：childObj 形状由 scoutC 读点穷举推出，
     *     领养 500 元宝先扣、元宝不足回 2）；洗练/寄养/性别/妻子养成/道具/青楼消费仍锁死 ——
     *     按各回调的"条件不满足"分支或静默分支给码，一个字节不改存档（REJECT_CODES 已逐动作登记）。
     *  锁死依据：wifeUpdateData/属性模型形状无证据（造形状 = 假数据 = 客户端崩点）；洗练/青楼
     *  在原版是付费/消耗功能，价格无源，按「少发」锁死。 */

    /** 提亲（PROPOSE_NPC）。{npcID}。消费端 index.js:77123-77127：
     *  1 → proposeNpcInfo[npcID]=true；2/10/11/12 → 1133/1141/1137/1166 文案。 */
    proposeNpc: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var cur = (s.marryObj && typeof s.marryObj === 'object') ? s.marryObj : null;
      var id = parseInt(p.npcID, 10) || 0;
      if (cur && cur.marryNpc) {
        noteReject('proposeNpc', 'alreadyMarried', 'npcID=' + id + ' 已婚 ' + cur.marryNpc);
        return wrapped('proposeNpc', { eRet: 11, npcID: id }, { achievement: ach() });   // 11 → getText(1137) 已婚
      }
      if (!(id > 0) || !(typeof BZ_PROPOSE !== 'undefined' && BZ_PROPOSE[String(id)])) {
        noteReject('proposeNpc', 'notInTable', 'npcID=' + id);
        return wrapped('proposeNpc', { eRet: 12, npcID: id }, { achievement: ach() });   // 12 → getText(1166)
      }
      var m = marryState(s);
      if (m.proposeNpc.indexOf(id) < 0) m.proposeNpc.push(id);
      persist();
      env.log('proposeNpc ' + id + ' 提亲记账（proposeNpc=' + m.proposeNpc.length + '）');
      return wrapped('proposeNpc', { eRet: 1, npcID: id }, { achievement: ach() });
    },

    /** 结婚（MARRY_NPC_EVENT）。{npcID, flag}。消费端 index.js:77236-77254：
     *  1 → 须有 npcID（npcMarryState/npc 表查询）；3 → 1137 已婚；4 → 1135。 */
    marryNpc: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var cur = (s.marryObj && typeof s.marryObj === 'object') ? s.marryObj : null;
      var id = parseInt(p.npcID, 10) || 0;
      if (cur && cur.marryNpc) {
        noteReject('marryNpc', 'alreadyMarried', '已有配偶 ' + cur.marryNpc);
        return wrapped('marryNpc', { eRet: 3, npcID: id }, { achievement: ach() });      // 3 → getText(1137)
      }
      if (!(id > 0) || !cur || cur.proposeNpc.indexOf(id) < 0) {
        noteReject('marryNpc', 'notProposed', 'npcID=' + id + ' 未提亲');
        return wrapped('marryNpc', { eRet: 4, npcID: id }, { achievement: ach() });      // 4 → getText(1135)
      }
      var m = marryState(s);
      m.marryNpc = id;
      m.marryTime = Math.floor(env.now() / 1000);
      persist();
      env.log('marryNpc ' + id + ' 结婚记账（flag=' + p.flag + '）');
      return wrapped('marryNpc', { eRet: 1, npcID: id }, { achievement: ach() });
    },

    /** 离婚（DIVORCENPC）。{}。消费端 index.js:77257-77264：1 → npcID + 清 wife 数据；
     *  2 → 1139（未婚）。清场范围：婚姻字段回模板初值（childObj 保留——孩子无辜）。 */
    divorceNpc: function () {
      var s = ensureLedger(loadSave());
      var cur = (s.marryObj && typeof s.marryObj === 'object') ? s.marryObj : null;
      if (!cur || !cur.marryNpc) {
        noteReject('divorceNpc', 'default', '未婚');
        return wrapped('divorceNpc', { eRet: 2 }, { achievement: ach() });               // 2 → getText(1139)
      }
      var m = marryState(s);
      var old = m.marryNpc;
      var tpl = (TPL.create && TPL.create.marryObj) || {};
      m.marryNpc = 0; m.marryTime = 0; m.receiveNpc = 0; m.weddType = 0;
      m.bodyState = tpl.bodyState || 0; m.happinessNum = tpl.happinessNum || 0;
      m.fetationTime = tpl.fetationTime || 0; m.childState = (tpl.childState === undefined ? -1 : tpl.childState);
      m.proposeNpc = [];
      persist();
      env.log('divorceNpc 离婚 ' + old + '（婚姻字段回初值，childObj 保留）');
      return wrapped('divorceNpc', { eRet: 1, npcID: old }, { achievement: ach() });
    },

    /** 婚礼开始（BEGIN_WEDDING）。{}。消费端 index.js:77272-77273 只认 eRet 1。未婚不办。 */
    beginWedding: function () {
      var s = ensureLedger(loadSave());
      var cur = (s.marryObj && typeof s.marryObj === 'object') ? s.marryObj : null;
      if (!cur || !cur.marryNpc) {
        noteReject('beginWedding', 'default', '未婚');
        return wrapped('beginWedding', { eRet: 2 }, { achievement: ach() });
      }
      var m = marryState(s);
      persist();
      env.log('beginWedding 婚礼开始（配偶 ' + m.marryNpc + '）');
      return wrapped('beginWedding', { eRet: 1 }, { achievement: ach() });
    },

    /** 宾客礼金（MARRY_AWARD）。{guestID}。消费端 index.js:77266-77270 读 rewardArray/equipObj。
     *  🚫 三张命中表都没有宾客礼金表 → 回 eRet 1 + **空奖励**：宾客照常入册（77268 只 push guestID）、
     *  一个子儿不发（少发方向，宁缺勿假）。 */
    marryAward: function (p) {
      p = p || {};
      var gid = parseInt(p.guestID, 10) || 0;
      env.log('marryAward guestID=' + gid + ' → ack，礼金无服务端表，回空（少发）');
      return wrapped('marryAward', { eRet: 1, guestID: gid, rewardArray: {}, equipObj: {} }, { achievement: ach() });
    },

    /** 同床（MAKE_LOVE）。{choose}。消费端 index.js:77278-77337：1 → 正常；
     *  5 → 妊娠（fetationTime，未建模不走）；可选 makeID/happiness。
     *  makeID 只用于客户端显示 make.json 档位动画/文案（77308 hasOwnProperty）→ 显示型，安全。
     *  v2.7.1-accept2 拍板：经验进 s.exp、每天限 5 次。⚠ make.json 的 experience 列实测是
     *  **风味文案 id**（1410006-1410010 = "感觉身体被掏空"等，活体探针 make-text-probe 实取），
     *  全表无数值型经验 → 数额取本工程自定口径 50/次（与环任务 e=50 同档），5/天封顶 250，
     *  已在回执申报。happiness 列只进应答显示（77337 hasOwnProperty），不持久化；
     *  hunger/full 列不接（makeLove 应答客户端不读 hunger，77278-77337 无此字段）。 */
    makeLove: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      var cur = (s.marryObj && typeof s.marryObj === 'object') ? s.marryObj : null;
      var choose = parseInt(p.choose, 10) || 0;
      if (!cur || !cur.marryNpc) {
        noteReject('makeLove', 'default', '未婚');
        return wrapped('makeLove', { eRet: 2 }, { achievement: ach() });
      }
      if (!(typeof BZ_MAKE !== 'undefined' && BZ_MAKE[String(choose)])) {
        noteReject('makeLove', 'default', 'choose=' + choose + ' 不在 make 表');
        return wrapped('makeLove', { eRet: 2 }, { achievement: ach() });
      }
      var m = marryState(s);
      var today = todayKey();
      if (!s.makeLoveDay || s.makeLoveDay.d !== today) s.makeLoveDay = { d: today, n: 0 };
      var MAKE_LOVE_DAILY_MAX = 5;
      if ((parseInt(s.makeLoveDay.n, 10) || 0) >= MAKE_LOVE_DAILY_MAX) {
        noteReject('makeLove', 'dailyMax', '今日已 ' + s.makeLoveDay.n + ' 次（上限 ' + MAKE_LOVE_DAILY_MAX + '）');
        env.log('makeLove 拒绝：每日 ' + MAKE_LOVE_DAILY_MAX + ' 次上限（防刷经验）');
        return wrapped('makeLove', { eRet: 2 }, { achievement: ach() });
      }
      s.makeLoveDay.n = (parseInt(s.makeLoveDay.n, 10) || 0) + 1;
      var EXP_PER_MAKE = 50;   // 本工程自定口径（make.json experience 列是风味文案 id，无数值源）
      var note = { eco: {}, skch: {}, ivch: {}, eqch: {} };
      var eco = grantCurrency(s, 4002, EXP_PER_MAKE);
      if (eco) { for (var ek in eco) if (eco.hasOwnProperty(ek)) note.eco[ek] = eco[ek]; }
      var row = (typeof BZ_MAKE !== 'undefined') ? BZ_MAKE[String(choose)] : null;
      var happiness = row ? row.happiness : undefined;   // 只显示（77337 hasOwnProperty），不持久化
      persist();
      env.log('makeLove choose=' + choose + ' 今日第 ' + s.makeLoveDay.n + ' 次 → 经验 +' + EXP_PER_MAKE
        + '（s.exp=' + s.exp + '）happiness=' + JSON.stringify(happiness) + '（仅显示）');
      var v = { eRet: 1, makeID: choose, note: note };
      if (typeof happiness === 'number') v.happiness = happiness;
      return wrapped('makeLove', v, { achievement: ach() });
    },

    /** 出生（BIRTHCHILD）。{}。消费端 index.js:77352-77355 读 childObj。
     *  v2.7.1-accept2：childObj 形状已推出 → 接线。闸 = 妊娠（fetationTime > 0，makeLove 的
     *  妊娠分支未建模 → 实际恒不满足，自然锁死但结构正确）；未妊娠 eRet 2 静默。 */
    birthChild: function () {
      var s = ensureLedger(loadSave());
      // ⚠ 拒绝路径不许建槽：先窥视 s.marryObj（不经过 marryState），过了闸才建。
      var cur = (s.marryObj && typeof s.marryObj === 'object') ? s.marryObj : null;
      if (!cur || !(parseInt(cur.fetationTime, 10) > 0)) {
        noteReject('birthChild', 'notPregnant', 'fetationTime=' + ((cur && cur.fetationTime) || 0) + '（未妊娠）');
        return wrapped('birthChild', { eRet: 2 }, { achievement: ach() });
      }
      var m = marryState(s);
      m.childObj = buildChildObj(Math.random() < 0.5 ? 1 : 0);
      m.fetationTime = 0;
      persist();
      env.log('birthChild 出生（sex=' + m.childObj.sex + '，fetationTime 清零）');
      return wrapped('birthChild', { eRet: 1, childObj: m.childObj }, { achievement: ach() });
    },

    /** 选性别（CHOOSE_SEX）。{sex}。消费端 index.js:24688-24692。仍锁 3（性别选择属生育流，
     *  领养用 adoptChildSex 自带性别，此口无消费场景）。 */
    chooseSex: function (p) {
      noteReject('chooseSex', 'default', 'sex=' + (p && p.sex) + ' 生育流未建模');
      return wrapped('chooseSex', { eRet: 3 }, { achievement: ach() });                   // 3 → getText(2131)
    },

    /** 领养（ADOPTCHILD）。{adoptChildSex}。消费端 index.js:24694-24698：1 → childObj；
     *  else → openChargeList。v2.7.1-accept2 拍板：childObj 形状已推出（见 buildChildObj 注），
     *  解锁，价格 500 元宝（用户裁定"价格定 500"），**先扣钱再写 childObj**（防"扣钱不给货"反向：
     *  元宝不够必须先拒），不足/未婚/已有孩子 → eRet 2（客户端走充值框）。 */
    adoptChild: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      // ⚠ 拒绝路径不许建槽：先窥视，过了全部闸才 marryState。
      var cur = (s.marryObj && typeof s.marryObj === 'object') ? s.marryObj : null;
      var ADOPT_PRICE = 500;   // 元宝单价：用户裁定 2026-10-26「价格定 500」
      if (!cur || !cur.marryNpc) {
        noteReject('adoptChild', 'notMarried', '未婚不能领养');
        return wrapped('adoptChild', { eRet: 2 }, { achievement: ach() });
      }
      if (cur.childObj && typeof cur.childObj === 'object' && cur.childObj.childName !== undefined) {
        noteReject('adoptChild', 'hasChild', '已有孩子（childName=' + JSON.stringify(cur.childObj.childName) + '）');
        return wrapped('adoptChild', { eRet: 2 }, { achievement: ach() });
      }
      var have = parseInt(s.yuanbao, 10) || 0;
      if (have < ADOPT_PRICE) {
        noteReject('adoptChild', 'insufficient', '需 ' + ADOPT_PRICE + ' 元宝，有 ' + have);
        return wrapped('adoptChild', { eRet: 2 }, { achievement: ach() });   // 2 → openChargeList（元宝不足去充值）
      }
      var m = marryState(s);
      s.yuanbao = have - ADOPT_PRICE;
      m.childObj = buildChildObj(p.adoptChildSex);
      persist();
      env.log('adoptChild 领养成功（sex=' + m.childObj.sex + '）扣 ' + ADOPT_PRICE + ' 元宝 → 余 ' + s.yuanbao);
      return wrapped('adoptChild', { eRet: 1, childObj: m.childObj }, { achievement: ach() });
    },

    /** 取名（GIVE_CHILD_NAME）。{childName}。消费端 index.js:24621-24625：1 → childName；
     *  99 → getText("480")（非法名）。childObj 形状已推出 → 接线：必须有孩子、名字非空。 */
    giveChildName: function (p) {
      p = p || {};
      var s = ensureLedger(loadSave());
      // ⚠ 拒绝路径不许建槽：先窥视，过了全部闸才 marryState。
      var cur = (s.marryObj && typeof s.marryObj === 'object') ? s.marryObj : null;
      var name = String(p.childName === undefined ? '' : p.childName).trim();
      if (!cur || !cur.childObj || typeof cur.childObj !== 'object' || cur.childObj.childName === undefined) {
        noteReject('giveChildName', 'noChild', '无孩子');
        return wrapped('giveChildName', { eRet: 2 }, { achievement: ach() });
      }
      if (!name.length || name.length > 12) {
        noteReject('giveChildName', 'badName', 'childName=' + JSON.stringify(p.childName));
        return wrapped('giveChildName', { eRet: 99 }, { achievement: ach() });   // 99 → getText("480")
      }
      var m = marryState(s);
      m.childObj.childName = name;
      persist();
      env.log('giveChildName 取名 ' + JSON.stringify(name));
      return wrapped('giveChildName', { eRet: 1, childName: name }, { achievement: ach() });
    },

    /** 洗孩子属性（CHILD_WASH_EVENT）。{attrID?}。消费端 index.js:24627-24636：
     *  1 → baseArr/attArr（假数据源，不做）；4 → attrList 开洗练 UI（空列表假 UI，不做）；
     *  else → openChargeList。锁 eRet 2。 */
    childWashProperty: function (p) {
      noteReject('childWashProperty', 'default', 'attrID=' + (p && p.attrID) + ' 属性模型未建模');
      return wrapped('childWashProperty', { eRet: 2 }, { achievement: ach() });
    },

    /** 重置寄养（RESET_CHILD_FOSTER）。{roleID}。消费端 index.js:24638-24655：
     *  1 → foster_point/playArr；3 → 535；4 → 4753。寄养模型未建模 → eRet 4（有专属文案）。 */
    resetChildFoster: function (p) {
      noteReject('resetChildFoster', 'default', 'roleID=' + (p && p.roleID) + ' 寄养模型未建模');
      return wrapped('resetChildFoster', { eRet: 4 }, { achievement: ach() });            // 4 → getText(4753)
    },

    /** 寄养互动（ADD_CHILD_FOSTER）。{type}。消费端 scripts2.js:12946-12953（ev 用 index.js:60043）：
     *  1 → foster_point/playArr；2/3/4 → cc.log 静默。锁 eRet 2。 */
    addChildFoster: function (p) {
      noteReject('addChildFoster', 'default', 'type=' + (p && p.type) + ' 寄养模型未建模');
      return wrapped('addChildFoster', { eRet: 2 }, { achievement: ach() });
    },

    /** 妻子升级（UPGRADE_WIFE_LEVEL）。{lv, exp, pot}。消费端 index.js:145326-145331 读 lv/exp。
     *  🚫 客户端传 lv/exp/pot 全不可信（红线：客户端传值不能当奖励），且妻子等级无存档槽 → 锁 eRet 2。 */
    upgradeWifeLevel: function (p) {
      noteReject('upgradeWifeLevel', 'default', 'lv=' + (p && p.lv) + ' 妻子等级无存档槽');
      return wrapped('upgradeWifeLevel', { eRet: 2 }, { achievement: ach() });
    },

    /** 用妻子道具（USE_WIFE_PROP）。{propnum}。消费端 index.js:145333-145346 读 lv/exp。
     *  道具消耗换妻子经验——经验无存档槽，用了就白吃 → 锁 eRet 2（不扣道具）。 */
    UserWifeProp: function (p) {
      noteReject('UserWifeProp', 'default', 'propnum=' + (p && p.propnum) + ' 妻子经验无存档槽');
      return wrapped('UserWifeProp', { eRet: 2 }, { achievement: ach() });
    },

    /** 青楼面板数据（WHORING_GIRL_EVENT）。{roleID}。消费端 index.js:51112-51123：
     *  1 → girlData（{npcID: 到期时间}）。回空 girlData → 面板能开、零数据（同面板必做）。 */
    GetWhoreData: function () {
      env.log('GetWhoreData → 面板数据（girlData 空：青楼未建模）');
      return wrapped('GetWhoreData', { eRet: 1, girlData: {} }, { achievement: ach() });
    },

    /** 邀请姑娘（CHOOSE_GIRL_EVENT）。{npcID}。消费端 index.js:51125-51143：1 → npcID/eTime。
     *  价格无源 → 锁 eRet 2（else → getText(1088)）。 */
    ChooseGirl: function (p) {
      noteReject('ChooseGirl', 'default', 'npcID=' + (p && p.npcID) + ' 价格无源');
      return wrapped('ChooseGirl', { eRet: 2 }, { achievement: ach() });
    },

    /** 逛青楼（WHORING_EVENT）。{npcID, flag, hglmt}。消费端 index.js:51145-51153：1 → makeID。
     *  消耗无源 → 锁 eRet 2（非 1 无分支静默）。 */
    Whoring: function (p) {
      noteReject('Whoring', 'default', 'npcID=' + (p && p.npcID) + ' 消耗无源');
      return wrapped('Whoring', { eRet: 2 }, { achievement: ach() });
    },

    /** 邀请事件拉取（INVITE_NPC_GETLIKE）。{}。消费端 index.js:51155-51163：
     *  1 → eventId 查 like_event 表；**4 → 客户端自有"无事件"流（dialog 1810121）**。
     *  like_event 表在 dump 里但我们没有邀请模型 → 走 4 = 客户端设计的干净空态。 */
    getLikeEvent: function () {
      env.log('getLikeEvent → eRet 4（客户端自有"无事件"空态，不伪造 like_event）');
      return wrapped('getLikeEvent', { eRet: 4 }, { achievement: ach() });
    },

    /** 邀请选项（INVITE_NPC_OPTION）。{isDelItem}。消费端 index.js:51165-51174：1 → npcId/feel；
     *  else → 1455 文案。无事件流（上面恒 4）→ 这条到不了，仍按拒绝码登记锁死。 */
    optionLikeEvent: function (p) {
      noteReject('optionLikeEvent', 'default', 'isDelItem=' + (p && p.isDelItem) + ' 无事件模型');
      return wrapped('optionLikeEvent', { eRet: 2 }, { achievement: ach() });
    },

    /* ============ 第 7 批 C06〔打坐练功〕（2026-10-26）============
     * 15 动作里 4 个已有（BeginTraining/BeginMeditation/BeginPlayWooks/EndPlayWooks，见上/前批），
     * 本批补 11 个。取证：batch6-facts-20261026/scoutD-c06-reqkeys.md（15 节逐字段）。
     * 共同口径（relations.md 预警 + 上游验收惯例）：END_* 请求**不带时长** → 只回成功、不结算
     *   （练功收益、内功修为、体力消耗全部不建模，宁少勿假）。
     * 三个 END_* 回调**没有 eRet 判断**（120574/138888/138903 直接读字段），所以字段必须按消费端
     *   形状给齐：genguTime/hanyusuiTime 给 0（无根骨丹/寒玉髓 buff）；END_DAZUO 还必须带
     *   note（138892 `o.note.hasOwnProperty` 无守护，缺了直接 TypeError）。
     * vigor（体力）无存档槽 → 恒 0（诚实空态）；skillID 按"客户端自己选的 id 回声"处理
     *   （无奖励，无白拿面；getSkillLevel 在客户端本地表上查它自己报的 id）。 */

    /** 练功结束（END_LIANGONG）。{hglmt, speed, auto}。消费端 index.js:120574-120601
     *  无 eRet 判断，读 genguTime/hanyusuiTime（buff 时长秒）+ 整包透传 FishingModel；
     *  isSchoolAward/isCollective/skillArr/skillid 均 hasOwnProperty 守护 → 不结算就不发。 */
    EndTraining: function () {
      var s = loadSave();
      // v2.7.1-accept3：清 Begin 记录。⚠ 不结算——客户端 EndTraining 回调（120574-120601）
      // **不读 note.skch**（逐行核对），按拍板规则"客户端不读就不结算"。
      var rec = (s.trainBegin && typeof s.trainBegin === 'object') ? s.trainBegin : null;
      if (rec) { delete s.trainBegin; persist(); }
      env.log('EndTraining → eRet 1（不结算：客户端不读 note.skch；Begin 记录' + (rec ? '已清' : '无') + '）');
      return wrapped('EndTraining', { eRet: 1, genguTime: 0, hanyusuiTime: 0 }, { achievement: ach() });
    },

    /** 打坐结束（END_DAZUO）。{skillID, hglmt, speed}。消费端 index.js:138888-138895
     *  无 eRet 判断；⚠ 138892 `o.note.hasOwnProperty("attrch")` **无守护** → note 必须存在，
     *  attrch.mpTrained = 结算后的修为（客户端写回 RoleBaseInfo.mpTrained 并按
     *  min(内功等级×10, 修为) 折算 MP 加成，上限常量 33 = 10，MadNumber 解码）。
     *  v2.7.1-accept3：修为按真实流逝时间结算，1 点/分钟（客户端无显示公式，上游拍板默认值），
     *  时长上限 = Begin 时的 gTime（秒），结算即清记录，一次 Begin 只结一次。 */
    EndMeditation: function () {
      var s = loadSave();
      var now = env.now();
      var rec = (s.medBegin && typeof s.medBegin === 'object') ? s.medBegin : null;
      var note = emptyEconomyNote();
      var settled = 0;
      if (rec) {
        delete s.medBegin;
        var durMs = Math.max(0, now - (parseInt(rec.t, 10) || 0));
        var capMs = (parseInt(rec.g, 10) > 0) ? parseInt(rec.g, 10) * 1000 : Infinity;
        var minutes = Math.floor(Math.min(durMs, capMs) / 60000);
        if (minutes > 0) {
          if (typeof s.baseValueAy[32] !== 'number') s.baseValueAy[32] = 0;
          s.baseValueAy[32] += minutes;   // 1 点修为/分钟（持久槽 = baseValueAy[32]，客户端 111789 同源）
          note.attrch.mpTrained = s.baseValueAy[32];
          settled = minutes;
        }
        persist();
      }
      var mpNow = (s.baseValueAy && typeof s.baseValueAy[32] === 'number') ? s.baseValueAy[32] : 0;   // 空档无 baseValueAy，不能直读（真踩：TypeError 丢 eRet）
      env.log('EndMeditation → eRet 1（修为 +' + settled + '，mpTrained=' + mpNow
        + '；Begin 记录' + (rec ? '已清' : '无——不结算') + '）');
      return wrapped('EndMeditation', { eRet: 1, genguTime: 0, hanyusuiTime: 0, note: note }, { achievement: ach() });
    },

    /** 回蓝结束（END_RECOVER_MP）。{curMp, mplmt, bTime, flag}。消费端 index.js:138903-138908
     *  无 eRet 判断，读 genguTime/hanyusuiTime。 */
    EndRecoverMP: function () {
      env.log('EndRecoverMP → eRet 1（不结算）');
      return wrapped('EndRecoverMP', { eRet: 1, genguTime: 0, hanyusuiTime: 0 }, { achievement: ach() });
    },

    /** 体力查询（GET_VIGOR）。{}。消费端 index.js:138909-138911 把 e.vigor 派发给 REFRESH_VIGORS。
     *  vigor 无存档槽 → 恒 0（诚实空态）。 */
    getVigor: function () {
      return wrapped('getVigor', { eRet: 1, vigor: 0 }, { achievement: ach() });
    },

    /** 体力转打坐（VIGOR_DAZUO）。{skillID, maxMp, speed, flag}。消费端 index.js:138912-138915
     *  只派发 e.vigor。体力消耗不建模 → vigor 0。 */
    useVigorMeditation: function () {
      return wrapped('useVigorMeditation', { eRet: 1, vigor: 0 }, { achievement: ach() });
    },

    /** 体力转技能等级（VIGOR_UPGSKILL）。{skillID, flag}。消费端 index.js:120602-120605：
     *  派发 e.vigor + `getSkillLevel(e.skillID)` 拼文案 —— skillID 必须回声（客户端本地表查询）。
     *  体力消耗不建模 → vigor 0、不升等级（客户端显示当前等级，无奖励面）。 */
    useVigorUpGradeSkill: function (p) {
      p = p || {};
      return wrapped('useVigorUpGradeSkill', { eRet: 1, vigor: 0, skillID: parseInt(p.skillID, 10) || 0 }, { achievement: ach() });
    },

    /** 回蓝开始（BEGIN_RECOVER_MP）。{}。消费端 index.js:138896-138902：1 → serverTime 写
     *  recoverStartTS（回蓝计时基座）。 */
    BeginRecoverMP: function () {
      var now = env.now();
      env.log('BeginRecoverMP → serverTime=' + now);
      return wrapped('BeginRecoverMP', { eRet: 1, serverTime: now }, { achievement: ach() });
    },

    /** 木桩暂停（PAUSE_WOOD_TRAINING）。{}。消费端 index.js:86182：仅 isPracticing && 1==eRet
     *  有本地状态操作，否则无动作。 */
    changePlayWooksState: function () {
      return wrapped('changePlayWooksState', { eRet: 1 }, { achievement: ach() });
    },

    /** 挂机木桩开关（SET_ONHOOK_WOOK_STATE）。{}。消费端 index.js:56867-56870：1 → 本地翻转。 */
    setOnHookWookState: function () {
      return wrapped('setOnHookWookState', { eRet: 1 }, { achievement: ach() });
    },

    /** 进修队列加入（IMPLANTATION）。{MartialID}。消费端 index.js:120635-120640：1 → 本地
     *  skillQueue.push；6 → 4239；else → 3954。队列是客户端本地模型 → ack。 */
    Implantation: function (p) {
      p = p || {};
      env.log('Implantation MartialID=' + (p.MartialID) + ' → ack（队列客户端本地）');
      return wrapped('Implantation', { eRet: 1 }, { achievement: ach() });
    },

    /** 进修队列移除（REMOVE_MARTIAL）。{MartialID}。消费端 index.js:120641-120647：1 → 本地 splice。 */
    removeMartial: function (p) {
      p = p || {};
      return wrapped('removeMartial', { eRet: 1 }, { achievement: ach() });
    },

    /* ============ 第 8 批 C07〔善恶〕（2026-10-27）============
     * 11 动作全部锁死（eRet 2 静默）。取证：batch6-facts-20261026/scoutF-c07-reqkeys.md（11 节逐字段）。
     * 锁死依据：
     *   ① 玩法门槛 = 加入阵营（JOIN_GOOD_OR_EVIL，index.js:60433，不在本批且未实现）——未入阵营时
     *      原服对这些拉取本就拒绝；
     *   ② GoodEvilInfoUI 对 goodAndEvilData 的 16 个字段全部 `.toString()` 直读
     *      （scripts3.js:35795-35861：prestige/historyMaxScore/curScore/todayScore/rankNum/
     *       totalContribution/avContribution/curContribution/taskNum/maxTaskNum/totalTaskNum/
     *       totalReceiveNum/successRate/joinTime/joinDays）——缺键 = TypeError，造半截成功 = 崩点；
     *   ③ HELP_DONE_TASK 会发 prestige/contribution/addScore（36462-36468）——善恶贡献无存档槽，
     *      白给 = 伪造进度。
     * 回调分支核实：10 个动作非 1 无 else（静默）；helpDoneTask 非 1 非 6 也静默（36471）。
     * 全部 eRet 2 → REJECT_CODES / reject-codes.json 已逐动作登记（ev = index.js 定义行）。 */

    getGoodAndEvilTaskData: function () {
      noteReject('getGoodAndEvilTaskData', 'default', '善恶玩法未加入阵营');
      return wrapped('getGoodAndEvilTaskData', { eRet: 2 }, { achievement: ach() });
    },
    refreshGoodAndEvilTaskData: function () {
      noteReject('refreshGoodAndEvilTaskData', 'default', '善恶玩法未加入阵营');
      return wrapped('refreshGoodAndEvilTaskData', { eRet: 2 }, { achievement: ach() });
    },
    getGoodAndEvilNoteData: function () {
      noteReject('getGoodAndEvilNoteData', 'default', '善恶玩法未加入阵营');
      return wrapped('getGoodAndEvilNoteData', { eRet: 2 }, { achievement: ach() });
    },
    getGoodAndEvilNpcData: function () {
      noteReject('getGoodAndEvilNpcData', 'default', '善恶玩法未加入阵营');
      return wrapped('getGoodAndEvilNpcData', { eRet: 2 }, { achievement: ach() });
    },
    refreshGoodAndEvilNpcData: function () {
      noteReject('refreshGoodAndEvilNpcData', 'default', '善恶玩法未加入阵营');
      return wrapped('refreshGoodAndEvilNpcData', { eRet: 2 }, { achievement: ach() });
    },
    getGoodAndEvilRankData: function (p) {
      noteReject('getGoodAndEvilRankData', 'default', 'type=' + (p && p.type) + ' 善恶玩法未加入阵营');
      return wrapped('getGoodAndEvilRankData', { eRet: 2 }, { achievement: ach() });
    },
    helpDoneTask: function (p) {
      noteReject('helpDoneTask', 'default', 'type=' + (p && p.type) + ' 善恶贡献无存档槽，白给=伪造进度');
      return wrapped('helpDoneTask', { eRet: 2 }, { achievement: ach() });
    },
    getGeHelpInfo: function () {
      noteReject('getGeHelpInfo', 'default', '善恶玩法未加入阵营');
      return wrapped('getGeHelpInfo', { eRet: 2 }, { achievement: ach() });
    },
    getGoodAndEvilData: function () {
      noteReject('getGoodAndEvilData', 'default', '善恶玩法未加入阵营');
      return wrapped('getGoodAndEvilData', { eRet: 2 }, { achievement: ach() });
    },
    getGoodAndEvilRetireList: function (p) {
      noteReject('getGoodAndEvilRetireList', 'default', 'itemId=' + (p && p.itemId) + ' 善恶玩法未加入阵营');
      return wrapped('getGoodAndEvilRetireList', { eRet: 2 }, { achievement: ach() });
    },
    getGoodAndEvilRetireData: function (p) {
      noteReject('getGoodAndEvilRetireData', 'default', 'time=' + (p && p.time) + ' 善恶玩法未加入阵营');
      return wrapped('getGoodAndEvilRetireData', { eRet: 2 }, { achievement: ach() });
    },

    /* ============ 第 11 批 C10〔农作物〕（2026-10-27）============
     * 成员：relations.md:77-82 —— 8 个 + `BATCH_SEED_CROP`（同面板顺手做）。
     * ＋ `getHomeList`（**第50批动作，本批必做**）：`PlantHomeUI` 就是它回调里 new 出来的
     *   （index.js:57615 `prefabs.load("cultivationUI/PlantHomeUI")`），不回 `soilArr` 面板打不开、
     *   8 个动作全部不可达 —— 用户 2026-10-27 拍板并入，回执申报。
     * 档 A（用户拍板）：本家闭环；`stealCrop`（偷好友菜）优雅拒 eRet 2，等第29/50批的
     *   `enterOtherHome`(`User.getFriendHomeList`) 做完再放开。
     * 计时：真实时长 + **加速免费**（`expediteCrop` 不扣道具 6069，回执申报）。
     * 事件：本批不随机刷（`m.eid` 恒 0）；`dispossHomeEvent` 两件做成"有事件就清、没事件回 2"。
     * ⚠ 四处裸读崩点（缺即 TypeError）：`crop`（changeSate/expedite/disposs/steal）、
     *   `crops`（batchSeedCrop）、`cropMap`（onKeyDisposs）、`obtainLands`（onKeyObtain）、
     *   `recentSeeds`（batchSeedCrop 裸赋）。 */

    /** 家园数据（GETHOME_LIST = `User.getHomeList`）。
     *  ⚠ `soilArr` 必须是**数组**：客户端 `e.soilArr = i.soilArr` 之后按 `.length` 用（57600-57602、
     *    58333-58344）；SHAPED 兜底给的是对象 `{}` → 走兜底时面板是"空/坏"的。
     *  ⚠ `exp` 在 `soilArr` 守卫内**裸读**（57594），必须是数字，否则 plantExp 变 NaN。 */
    getHomeList: function () {
      var s = loadSave();
      var pre = plantRead(s);
      var P = plantSlot(s);
      var dirty = !pre || pre.lands.length !== P.lands.length;
      var nowSec = plantNowSec();
      var arr = [], planted = 0, i;
      for (i = 0; i < P.lands.length; i++) {
        var L = P.lands[i];
        if (L && L.m) {
          var oldSt = parseInt(L.m.s, 10) || 0;
          var st = plantRefreshLand(L, nowSec);
          if (st !== oldSt) dirty = true;
          planted++;
          arr.push({ s: 1, m: clone(L.m) });
        } else {
          arr.push({ s: 1 });
        }
      }
      // C14〔斗狗〕：狗建模（本家喂狗链的入口）。好友家未实现 + stealCrop 档 A 锁 → 狗战路径保持锁死。
      var dog = 0;
      var DT = dogTable();
      if (DT) {
        if (!dogRead(s)) { s.dog = { id: DT.dogSmall, p: 0 }; dirty = true; }
        dog = dogView(s);
      }
      if (dirty) persist();
      var v = {
        eRet: 1,
        soilArr: arr,
        exp: parseInt(P.exp, 10) || 0,
        recentSeeds: clone(P.recentSeeds),
        dog: dog,        // 看门狗（C14 建模；BZ_C14 缺失时回 0 = 无狗）
        // ⚠ `bShop` **必须发正数**：商店入口前置是 `HomePlantModel.homeShop > 0 && reqGetSaleShop()`
        //   （scripts2.js:48589），而 `homeShop` 只从这里的 `bShop` 来（index.js:57597）。
        //   形状表把它归成"开关"（hasOwnProperty 语义）→ 正好"非 0 才合法"，与入口条件一致。
        bShop: 1,
      };
      env.log('getHomeList → 地块 ' + arr.length + ' 块（已种 ' + planted + '）种植经验 ' + v.exp
        + ' recentSeeds=' + v.recentSeeds.length);
      return shaped('getHomeList', v) || wrapped('getHomeList', v, { achievement: ach() });
    },

    /** 批量播种（BATCH_SEED_CROP = `User.batchSeedCrop`）。请求 `{seedCrops:{地块号:种子id}}`（58111/58121）。
     *  ⚠ 回包 `crops` 裸读（`for (var n in o.crops)`，57657）、`recentSeeds` 裸赋（57672）→ 两个都必须给。
     *  先校验后扣：任何一块不合法就整单 eRet 2，不动档（避免"扣了一半种子"）。
     *  ⚠ 播种扣种子 → 已在 `SHRINK_OK` 里豁免，否则背包被播空会被守卫回滚成白拿。 */
    batchSeedCrop: function (p) {
      p = p || {};
      var D = plantTables();
      if (!D) {
        noteReject('batchSeedCrop', 'noTable', 'BZ_PLANT 缺失');
        return wrapped('batchSeedCrop', { eRet: 2 }, { achievement: ach() });
      }
      var s = loadSave();
      // ⚠ 拒绝路径**不许建槽**（marryState / knackSlot 那条老坑）：先拿只读视图校验，
      //   全部通过之后才 plantSlot() 建/补 s.plant。否则"种子不足"这种拒绝也会把 plant 结构写进内存档，
      //   下一次随便哪个动作 persist 就落盘了 —— 等于拒绝动作偷偷改了档。
      var pre = plantRead(s);
      var landN = pre ? pre.lands.length : plantLandCount();
      var req = p.seedCrops || {};
      var nowSec = plantNowSec();
      var plan = [], need = {}, k, idx, seed, land, crop;
      for (k in req) {
        if (!hasOwn(req, k)) continue;
        idx = asInt(k, -1);
        seed = asInt(req[k], 0);
        land = (idx >= 0 && idx < landN) ? (pre ? pre.lands[idx] : { s: 1 }) : null;
        crop = plantCrop(seed);
        if (!land || !crop) {
          noteReject('batchSeedCrop', 'badLand', 'idx=' + k + ' seed=' + seed + '（地块或种子不在表里）');
          return wrapped('batchSeedCrop', { eRet: 2 }, { achievement: ach() });
        }
        if (land.m) {
          noteReject('batchSeedCrop', 'occupied', '地块 ' + idx + ' 已有作物 id=' + land.m.id);
          return wrapped('batchSeedCrop', { eRet: 2 }, { achievement: ach() });
        }
        need[seed] = (parseInt(need[seed], 10) || 0) + (crop.n > 0 ? crop.n : 1);
        plan.push({ idx: idx, seed: seed, crop: crop });
      }
      if (!plan.length) {
        noteReject('batchSeedCrop', 'empty', 'seedCrops 为空');
        return wrapped('batchSeedCrop', { eRet: 2 }, { achievement: ach() });
      }
      for (k in need) {
        if (!hasOwn(need, k)) continue;
        if (plantSeedHave(s, k) < need[k]) {
          noteReject('batchSeedCrop', 'noSeed', '种子 ' + k + ' 需 ' + need[k] + ' 只有 ' + plantSeedHave(s, k));
          return wrapped('batchSeedCrop', { eRet: 2 }, { achievement: ach() });
        }
      }
      var P = plantSlot(s);            // 到这里才建槽（校验全部通过）
      var crops = {}, note = { ivch: {}, eqch: {} }, i;
      for (i = 0; i < plan.length; i++) {
        var it = plan[i];
        var m = { id: it.seed, s: 1, t: nowSec, c: 0, pt: 0, eid: 0 };   // 阶段 1 = 刚种下；eid 0 = 无事件（本批不刷）
        P.lands[it.idx] = { s: 1, m: m };
        crops[String(it.idx)] = { m: clone(m) };
      }
      for (k in need) {
        if (!hasOwn(need, k)) continue;
        consumeItem(s, k, need[k]);
        note.ivch[k] = plantSeedHave(s, k);
        var sid = asInt(k, 0);
        var at = P.recentSeeds.indexOf(sid);
        if (at >= 0) P.recentSeeds.splice(at, 1);
        P.recentSeeds.unshift(sid);
      }
      if (P.recentSeeds.length > 6) P.recentSeeds.length = 6;
      persist();
      var v = { eRet: 1, crops: crops, recentSeeds: clone(P.recentSeeds), note: note };
      env.log('batchSeedCrop 种下 ' + plan.length + ' 块：'
        + plan.map(function (x) { return x.idx + '←' + x.seed; }).join(' ')
        + ' 扣种子 ' + JSON.stringify(need));
      return shaped('batchSeedCrop', v) || wrapped('batchSeedCrop', v, { achievement: ach() });
    },

    /** 地块状态刷新（CROP_CHANGE_STATE = `User.changeSate`，**注意上游拼写少个 t**）。
     *  客户端每秒 `updateCropState`、倒计时到点自动发（scripts2.js:37642-37651）。
     *  ⚠ 回包 `crop` 裸读（`o.crop.hasOwnProperty("m")`，57683）→ 必须有对象。 */
    changeSate: function (p) {
      p = p || {};
      var s = loadSave();
      var P = plantRead(s);
      var idx = asInt(p.sIdx, -1);
      var land = (P && idx >= 0 && idx < P.lands.length) ? P.lands[idx] : null;
      if (asInt(p.fid, 0) > 0) {
        noteReject('changeSate', 'friendHome', 'sIdx=' + idx + ' fid=' + p.fid + '（好友家第50批未做）');
        return wrapped('changeSate', { eRet: -1 }, { achievement: ach() });   // -1 → getText(3320)
      }
      if (!land || !land.m) {
        noteReject('changeSate', 'badLand', 'sIdx=' + idx + ' 无作物');
        return wrapped('changeSate', { eRet: -1 }, { achievement: ach() });
      }
      var nowSec = plantNowSec();
      var oldSt = parseInt(land.m.s, 10) || 0;
      var st = plantRefreshLand(land, nowSec);
      if (st !== oldSt) {
        persist();
        env.log('changeSate 地块 ' + idx + ' 阶段 ' + oldSt + '→' + st + '（作物 ' + land.m.id + '）');
      }
      var v = { eRet: 1, sIdx: idx, crop: { m: clone(land.m) } };
      return shaped('changeSate', v) || wrapped('changeSate', v, { achievement: ach() });
    },

    /** 收获（OBTAINCROP = `User.obtainCrop`）。请求 `{sIdx}`（58159）。
     *  ⚠ 回调 1 分支裸读 `soilArr[o.sIdx]`；3 分支还裸读 `soilArr[o.sIdx].m.s` 并**把 m.s 置 0**
     *    （57714-57723）→ 未成熟**绝不能**回 3（会把地画成荒），回 2（该回调没有 2 分支 = 静默）。
     *  产物按状态取：4→matureitem、5→tenitem、6→fiftyitem、7→hundreditem（表怎么写就怎么发）。 */
    /** ── 第 12 批 C11〔周年通行证〕7 个（2026-10-27，用户拍板 7 个全做）──
     *  可复用模板=侠客令（passCardData/buyInvitationCard/passCardAward，本文件上部）。
     *  ★PAY_ACTION_RE 拦截核对：7 个名字都不含 Pay/pay/Order/Recharge/IAP/Jetton（6813），不会被打支付拦截。 */

    /** 面板开关（ANN_PASS_GET_DATA = `User.getAnniversaryPassData`，send scripts3.js:7894 无载荷）。
     *  ★AnniversaryMainUI 在它的 1 分支里 new（scripts3.js:7831）→ 本键回不对，其余 6 个全不可达。
     *  anniversaryPassData 七字段全裸读（7821-7828）、endtime 裸读（7829，**毫秒**，7574 (e-t)/1e3）。
     *  拍板①：endtime = 开启时 now + durationDays 天（表窗口 2026-09-29→10-17 已过期，照表发倒计时恒空白）。 */
    getAnniversaryPassData: function (p) {
      var s = loadSave();
      var nowMs = env.now();
      var P = annEnsure(s);   // GET_DATA 本身就是"开启"动作：建档 + 计时是本键的合法写入
      if (!(parseInt(P.endT, 10) > nowMs)) {
        var Td = annTable();   // ⚠ r14 冒烟直接 require core，BZ_C11 可能未定义 → 必须走守卫（构建期已踩一次）
        P.endT = nowMs + (((Td && parseInt(Td.durationDays, 10)) || 30)) * 86400000;
        persist();
        env.log('annPass 开启/续期：截止 ms=' + P.endT);
      }
      var d = annDataOf(P);
      var v = { eRet: 1, anniversaryPassData: d, endtime: parseInt(P.endT, 10) || 0 };
      env.log('getAnniversaryPassData → n=' + d.n + ' vip=' + d.vip + ' rd=' + d.rd.length + ' vrd=' + d.vrd.length + ' dt=' + d.dt.length);
      return shaped('getAnniversaryPassData', v) || wrapped('getAnniversaryPassData', v, { achievement: ach() });
    },

    /** 升 VIP（ANN_PASS_BUY_UP = `User.buyAnniversaryPass`，send scripts3.js:7897 **无载荷**）。
     *  回调只认 1（7844）/4（7848 → getText(8845)）。拍板②：300 元宝自定离线价（表里没有价格列），
     *  同侠客令 buyInvitationCard 的"自定离线价"先例（本工程不接真实付费）。 */
    buyAnniversaryPass: function (p) {
      var s = loadSave();
      var T = annTable();
      if (!T) { noteReject('buyAnniversaryPass', 'noTable', 'BZ_C11 缺失'); return wrapped('buyAnniversaryPass', { eRet: 4 }, { achievement: ach() }); }
      var P = annRead(s);
      if (P && parseInt(P.vip, 10) === 1) { noteReject('buyAnniversaryPass', 'alreadyVip', '已是 VIP 档'); return wrapped('buyAnniversaryPass', { eRet: 4 }, { achievement: ach() }); }
      var cost = parseInt(T.vipPrice, 10) || 0;
      var wallet = parseInt(s.yuanbao, 10) || 0;
      if (wallet < cost) { noteReject('buyAnniversaryPass', 'insufficient', '需 ' + cost + ' 元宝，有 ' + wallet); return wrapped('buyAnniversaryPass', { eRet: 4 }, { achievement: ach() }); }
      s.yuanbao = wallet - cost;
      P = annEnsure(s);
      P.vip = 1;
      persist();
      env.log('buyAnniversaryPass → VIP=1，扣 ' + cost + ' 元宝，余 ' + s.yuanbao);
      var v = { eRet: 1, note: { eco: { yuanbao: s.yuanbao } } };
      return shaped('buyAnniversaryPass', v) || wrapped('buyAnniversaryPass', v, { achievement: ach() });
    },

    /** 领奖（ANN_PASS_RECEIVE_AWARD = `User.receiveAnniversaryPassAward`，载荷 {id, vip}，scripts3.js:7899-7905）。
     *  回包 vip/id 裸读（7852-7853）→ **必须回显请求值**（vip 错档会把"已领"记进另一条数组）；
     *  rewardArray 有守卫（7854）但仍给。rd/vrd = "已领行 id" 数组（7407/7415 includes → push 数字）。 */
    receiveAnniversaryPassAward: function (p) {
      var s = loadSave();
      var T = annTable();
      var id = asInt(p.id, 0);
      var vip = asInt(p.vip, 0) ? 1 : 0;
      var row = T ? T.award[String(id)] : null;
      if (!T) { noteReject('receiveAnniversaryPassAward', 'noTable', 'BZ_C11 缺失'); return wrapped('receiveAnniversaryPassAward', { eRet: 2 }, { achievement: ach() }); }
      if (!row) { noteReject('receiveAnniversaryPassAward', 'badRow', 'award 行 ' + id + ' 不在表'); return wrapped('receiveAnniversaryPassAward', { eRet: 2 }, { achievement: ach() }); }
      var P = annRead(s);
      var list = P ? (vip ? P.vrd : P.rd) : null;
      if (list && list.indexOf(id) >= 0) { noteReject('receiveAnniversaryPassAward', 'claimed', '行 ' + id + ' 档 ' + vip + ' 已领过'); return wrapped('receiveAnniversaryPassAward', { eRet: 2 }, { achievement: ach() }); }
      // 第12批验收补（上游 2026-10-27）：VIP 档必须真买过 VIP（P.vip==1），否则凭请求 vip=1 就能白领 VIP 奖励
      if (vip && !(P && parseInt(P.vip, 10) === 1)) { noteReject('receiveAnniversaryPassAward', 'notVip', '行 ' + id + ' 请求 VIP 档但未购 VIP'); return wrapped('receiveAnniversaryPassAward', { eRet: 2 }, { achievement: ach() }); }
      var cur = (P && parseInt(P.n, 10)) || 0;
      if (cur < row.liveness) { noteReject('receiveAnniversaryPassAward', 'livenessLow', '行 ' + id + ' 需活跃 ' + row.liveness + '，有 ' + cur); return wrapped('receiveAnniversaryPassAward', { eRet: 2 }, { achievement: ach() }); }
      var note = { ivch: {}, eqch: {}, eco: {} };   // ⚠ grantRewardList 会写 note.eco[k]（1059）——award 里 4003=潜能/1=金条都是货币，漏 eco 就是 TypeError
      var ra = {};
      grantRewardList(s, vip ? row.vip : row.free, note, ra);
      P = annEnsure(s);
      if (vip) P.vrd.push(id); else P.rd.push(id);
      persist();
      var v = { eRet: 1, id: id, vip: vip, rewardArray: ra, note: note };
      env.log('receiveAnniversaryPassAward 行 ' + id + ' 档 ' + (vip ? 'VIP' : '免费') + ' → ' + JSON.stringify(ra));
      return shaped('receiveAnniversaryPassAward', v) || wrapped('receiveAnniversaryPassAward', v, { achievement: ach() });
    },

    /** 礼包货架（ANN_PASS_GET_GIFT_DATA = `User.getAnniversaryPassGift`，载荷 {roleID}，index.js:131046-131048）。
     *  ★本键不自开面板：dispatch(STORE_SHOW_UI,{type:11,data:e.giftDatas})（131051-131054）→ 通用商店
     *  openBuyGoldEvent 的 type 11 分支**按下标**取 11 元数组（scripts2.js:8550-8572）。
     *  行格式：[0]ID [1]Name [3]des [4]limitnum [5]award(**原串**，67216 split('|')/split(',')) [6]imgname
     *  [7]money(数字) [8]**已购次数**（67563 用 limitnum-num 显示剩余；scoutV2 Q3）[10]endTime。 */
    getAnniversaryPassGift: function (p) {
      var s = loadSave();
      var T = annTable();
      if (!T) { noteReject('getAnniversaryPassGift', 'noTable', 'BZ_C11 缺失'); return wrapped('getAnniversaryPassGift', { eRet: 2 }, { achievement: ach() }); }
      var P = annRead(s) || {};
      var rows = {};
      for (var k in T.giftRows) {
        if (!T.giftRows.hasOwnProperty(k)) continue;
        var r = T.giftRows[k].slice();
        r[8] = (P.giftBuys && parseInt(P.giftBuys[k], 10)) || 0;
        rows[k] = r;
      }
      var v = { eRet: 1, giftDatas: rows };
      env.log('getAnniversaryPassGift → ' + Object.keys(rows).length + ' 个礼包');
      return shaped('getAnniversaryPassGift', v) || wrapped('getAnniversaryPassGift', v, { achievement: ach() });
    },

    /** 买礼包（ANN_PASS_BUY_GIFT = `User.buyAnniversaryPassGift`，载荷 {giftId}，index.js:131058-131060）。
     *  回包 rewardArray **裸读无守卫**（131064）→ 必给；整包透传给 REFRESH_GIFT_DATA（131065），
     *  客户端 StoreItem.refreshGiftData 读 **e.giftData（单数！）** 字典 {giftId: 新已购数} 刷新剩余
     *  （scripts2.js:67466）→ 必带。拍板③：元宝扣款、限购照表 limit。 */
    buyAnniversaryPassGift: function (p) {
      var s = loadSave();
      var T = annTable();
      var gid = asInt(p.giftId, 0);
      var g = T ? T.gift[String(gid)] : null;
      if (!T) { noteReject('buyAnniversaryPassGift', 'noTable', 'BZ_C11 缺失'); return wrapped('buyAnniversaryPassGift', { eRet: 2 }, { achievement: ach() }); }
      if (!g) { noteReject('buyAnniversaryPassGift', 'badGift', '礼包 ' + gid + ' 不在表'); return wrapped('buyAnniversaryPassGift', { eRet: 2 }, { achievement: ach() }); }
      var P = annRead(s) || {};
      var buys = (P.giftBuys && parseInt(P.giftBuys[String(gid)], 10)) || 0;
      if (buys >= g.limit) { noteReject('buyAnniversaryPassGift', 'limit', '礼包 ' + gid + ' 已购 ' + buys + '/' + g.limit); return wrapped('buyAnniversaryPassGift', { eRet: 2 }, { achievement: ach() }); }
      var wallet = parseInt(s.yuanbao, 10) || 0;
      if (wallet < g.price) { noteReject('buyAnniversaryPassGift', 'insufficient', '需 ' + g.price + ' 元宝，有 ' + wallet); return wrapped('buyAnniversaryPassGift', { eRet: 2 }, { achievement: ach() }); }
      var note = { ivch: {}, eqch: {}, eco: {} };
      var ra = {};
      grantRewardList(s, g.award, note, ra);
      s.yuanbao = wallet - g.price;
      note.eco.yuanbao = s.yuanbao;
      P = annEnsure(s);
      P.giftBuys[String(gid)] = buys + 1;
      persist();
      var gd = {}; gd[String(gid)] = buys + 1;
      var v = { eRet: 1, giftId: gid, rewardArray: ra, giftData: gd, note: note };
      env.log('buyAnniversaryPassGift ' + gid + ' → ' + JSON.stringify(ra) + '，扣 ' + g.price + ' 元宝，已购 ' + (buys + 1) + '/' + g.limit);
      return shaped('buyAnniversaryPassGift', v) || wrapped('buyAnniversaryPassGift', v, { achievement: ach() });
    },

    /** 买活跃度（ANN_PASS_BUY_LIVENESS = `User.buyAnniversaryPassLiveness`，载荷 {num}，scripts3.js:7906-7910）。
     *  回包 n/td 裸读（7860-7861）；3 → getText(7353)（7863）。★上游"可能已下线"已被推翻：
     *  入口真实存在（scripts3.js:18448 BuyItemUI29，弹窗点 7438/7763）。
     *  拍板③：扣 **gold**（客户端 18436 比对 RoleBaseInfo.gold），单价 livePricePerPoint（自定 10 gold/点），
     *  上限 = 表 maxLiveness（565，客户端 7763 同值拒开弹窗）；超上限部分钳掉不整单拒。 */
    buyAnniversaryPassLiveness: function (p) {
      var s = loadSave();
      var T = annTable();
      if (!T) { noteReject('buyAnniversaryPassLiveness', 'noTable', 'BZ_C11 缺失'); return wrapped('buyAnniversaryPassLiveness', { eRet: 3 }, { achievement: ach() }); }
      var num = asInt(p.num, 0);
      if (!(num > 0) || num > 999) { noteReject('buyAnniversaryPassLiveness', 'badNum', 'num=' + p.num); return wrapped('buyAnniversaryPassLiveness', { eRet: 3 }, { achievement: ach() }); }
      var cap = parseInt(T.maxLiveness, 10) || 0;
      if (!(cap > 0)) { noteReject('buyAnniversaryPassLiveness', 'noTable', 'maxLiveness=0'); return wrapped('buyAnniversaryPassLiveness', { eRet: 3 }, { achievement: ach() }); }
      var P = annRead(s);
      var cur = (P && parseInt(P.n, 10)) || 0;
      if (cur >= cap) { noteReject('buyAnniversaryPassLiveness', 'capReached', '活跃 ' + cur + ' 已到上限 ' + cap); return wrapped('buyAnniversaryPassLiveness', { eRet: 3 }, { achievement: ach() }); }
      if (cur + num > cap) num = cap - cur;
      var cost = num * (parseInt(T.livePricePerPoint, 10) || 0);
      var wallet = parseInt(s.gold, 10) || 0;
      if (wallet < cost) { noteReject('buyAnniversaryPassLiveness', 'insufficient', '需 ' + cost + ' gold，有 ' + wallet); return wrapped('buyAnniversaryPassLiveness', { eRet: 3 }, { achievement: ach() }); }
      P = annEnsure(s);
      P.n = cur + num;
      s.gold = wallet - cost;
      persist();
      var v = { eRet: 1, n: P.n, td: clone(P.td || {}), note: { eco: { gold: s.gold } } };
      env.log('buyAnniversaryPassLiveness +' + num + '（' + cur + '→' + P.n + '/' + cap + '），扣 ' + cost + ' gold，余 ' + s.gold);
      return shaped('buyAnniversaryPassLiveness', v) || wrapped('buyAnniversaryPassLiveness', v, { achievement: ach() });
    },

    /** 完成任务领奖（ANN_PASS_FINISH_TASK = ★`User.receiveAnniversaryPassTaskReward`，载荷 {taskId}，scripts3.js:7919-7923）。
     *  回包 dt 必须是**数组**（7880 .length/.includes 直读）且**整体覆盖** receivedTasks（7884）；
     *  rewardArray **裸读无守卫**（7886）→ 必给。拍板④：进度 dv 只读存档不主动累计 → 本批 dv 恒空，
     *  该动作正常流程恒"未达标"拒绝（结构正确、玩法暂不产生，同 C10 cleanDeadCrop 的处理）。 */
    receiveAnniversaryPassTaskReward: function (p) {
      var s = loadSave();
      var T = annTable();
      var tid = asInt(p.taskId, 0);
      var t = T ? T.task[String(tid)] : null;
      if (!T) { noteReject('receiveAnniversaryPassTaskReward', 'noTable', 'BZ_C11 缺失'); return wrapped('receiveAnniversaryPassTaskReward', { eRet: 2 }, { achievement: ach() }); }
      if (!t) { noteReject('receiveAnniversaryPassTaskReward', 'badTask', '任务 ' + tid + ' 不在表'); return wrapped('receiveAnniversaryPassTaskReward', { eRet: 2 }, { achievement: ach() }); }
      var P = annRead(s) || {};
      var dt = Array.isArray(P.dt) ? P.dt : [];
      if (dt.indexOf(tid) >= 0) { noteReject('receiveAnniversaryPassTaskReward', 'claimed', '任务 ' + tid + ' 已领'); return wrapped('receiveAnniversaryPassTaskReward', { eRet: 2 }, { achievement: ach() }); }
      var prog = (P.dv && parseInt(P.dv[String(tid)], 10)) || 0;
      var need = (t.type === 6) ? 4 : t.value;   // 客户端 7940 同口径：type 6 的任务按 4 格算
      if (prog < need) { noteReject('receiveAnniversaryPassTaskReward', 'notReached', '任务 ' + tid + ' 进度 ' + prog + '/' + need + '（本批不累计进度）'); return wrapped('receiveAnniversaryPassTaskReward', { eRet: 2 }, { achievement: ach() }); }
      var note = { ivch: {}, eqch: {}, eco: {} };   // ⚠ 同上：task.score 可能是货币（4003 潜能等）
      var ra = {};
      grantRewardList(s, [t.score], note, ra);
      P = annEnsure(s);
      P.dt.push(tid);
      persist();
      var v = { eRet: 1, dt: P.dt.slice(), rewardArray: ra, note: note };
      env.log('receiveAnniversaryPassTaskReward 任务 ' + tid + ' → ' + JSON.stringify(ra));
      return shaped('receiveAnniversaryPassTaskReward', v) || wrapped('receiveAnniversaryPassTaskReward', v, { achievement: ach() });
    },

    /** ── 第 13 批 C12〔管家/帮手〕10 个（2026-10-27，用户拍板：7 名单 + GET_HOUSE_KEEPER/SET_TEMPLATE_DATA/RECEIVE_NOTICE 并入；档 A）──
     *  ★PAY_ACTION_RE 核对：10 个名字都不含 Pay/pay/Order/Recharge/IAP/Jetton（6813）。
     *  ★receiveNotice 非 1 → 客户端 t.dataDestroy()（23220）→ 本键尽量不拒。 */

    /** 面板开关（GET_HOUSE_KEEPER = `User.getHousekeeper`，send scripts3.js:23555 无载荷；并入申报见回执）。
     *  delegateUI 在 1 分支里 new（23109-23115）；housekeeper 整段深拷贝下发（22 字段，§hkEnsure）。 */
    getHousekeeper: function (p) {
      var s = loadSave();
      var P = hkEnsure(s);
      P.curTime = env.now();
      persist();
      var v = { eRet: 1, housekeeper: hkDataOf(P) };
      env.log('getHousekeeper → helperId=' + P.helperId + ' 拥有=' + P.helperIdArr.length + ' dueTime=' + P.dueTime);
      return shaped('getHousekeeper', v) || wrapped('getHousekeeper', v, { achievement: ach() });
    },

    /** 买管家（BUY_BUTLER = `User.buyHelper`，send 23634-23638 `{helperId}`）。
     *  回调裸读 `o.housekeeper.helperIdArr`（23164）；非 1 一律 4 → 客户端 openChargeList（23167）。
     *  拍板④：helper.price 照表按元宝扣（0/0/500/1000/99999999×3/2000）；已拥有 → 幂等成功不重复扣。 */
    buyHelper: function (p) {
      var s = loadSave();
      var T = hkTable();
      var id = asInt(p.helperId, 0);
      var row = T ? T.helper[String(id)] : null;
      if (!T) { noteReject('buyHelper', 'noTable', 'BZ_C12 缺失'); return wrapped('buyHelper', { eRet: 4 }, { achievement: ach() }); }
      if (!row) { noteReject('buyHelper', 'badId', '管家 ' + id + ' 不在表'); return wrapped('buyHelper', { eRet: 4 }, { achievement: ach() }); }
      var P = hkRead(s);
      var owned = !!(P && Array.isArray(P.helperIdArr) && P.helperIdArr.indexOf(id) >= 0);
      if (owned) { env.log('buyHelper ' + id + ' 已拥有 → 幂等成功'); }
      else {
        var cost = parseInt(row.price, 10) || 0;
        var wallet = parseInt(s.yuanbao, 10) || 0;
        if (wallet < cost) { noteReject('buyHelper', 'insufficient', '需 ' + cost + ' 元宝，有 ' + wallet); return wrapped('buyHelper', { eRet: 4 }, { achievement: ach() }); }
        var note = { ivch: {}, eqch: {}, eco: {} };
        s.yuanbao = wallet - cost;
        note.eco.yuanbao = s.yuanbao;
        P = hkEnsure(s);
        P.helperIdArr.push(id);
        persist();
        env.log('buyHelper ' + id + ' → 扣 ' + cost + ' 元宝，拥有 ' + JSON.stringify(P.helperIdArr));
        var v2 = { eRet: 1, housekeeper: hkDataOf(P), note: note };
        return shaped('buyHelper', v2) || wrapped('buyHelper', v2, { achievement: ach() });
      }
      var v = { eRet: 1, housekeeper: hkDataOf(hkEnsure(s)) };
      return shaped('buyHelper', v) || wrapped('buyHelper', v, { achievement: ach() });
    },

    /** 设置管家（SET_BUTLER = `User.setHelper`，send 23628-23633 `{helperId}`）。
     *  回调裸读 `o.housekeeper.helperId`（23156）；2 → getText(6000506)。须已拥有（含免费）。 */
    setHelper: function (p) {
      var s = loadSave();
      var T = hkTable();
      var id = asInt(p.helperId, 0);
      if (!T) { noteReject('setHelper', 'noTable', 'BZ_C12 缺失'); return wrapped('setHelper', { eRet: 2 }, { achievement: ach() }); }
      var P = hkRead(s);
      if (!hkOwned(T, id, P)) { noteReject('setHelper', 'notOwned', '管家 ' + id + ' 未拥有'); return wrapped('setHelper', { eRet: 2 }, { achievement: ach() }); }
      P = hkEnsure(s);
      P.helperId = id;
      persist();
      var v = { eRet: 1, housekeeper: hkDataOf(P) };
      env.log('setHelper → helperId=' + id);
      return shaped('setHelper', v) || wrapped('setHelper', v, { achievement: ach() });
    },

    /** 呼叫管家（CALL_HELPER_BY_ID = ★`User.callHelperId`，send 23250-23254 `{helperId}`）。
     *  回调 housekeeper **有守卫**（23237），读 `o.housekeeper.e` → followId；无 else（静默）。
     *  随后客户端可能走 socket `CTS_HOUSE_KEEPCH_REQ`（23240，非 HTTP，不归我们管）。 */
    callHelperId: function (p) {
      var s = loadSave();
      var T = hkTable();
      var id = asInt(p.helperId, 0);
      if (!T) { noteReject('callHelperId', 'noTable', 'BZ_C12 缺失'); return wrapped('callHelperId', { eRet: 2 }, { achievement: ach() }); }
      var P = hkRead(s);
      if (!hkOwned(T, id, P)) { noteReject('callHelperId', 'notOwned', '管家 ' + id + ' 未拥有'); return wrapped('callHelperId', { eRet: 2 }, { achievement: ach() }); }
      P = hkEnsure(s);
      P.e = id;
      persist();
      var v = { eRet: 1, housekeeper: hkDataOf(P) };
      env.log('callHelperId → 跟随 e=' + id);
      return shaped('callHelperId', v) || wrapped('callHelperId', v, { achievement: ach() });
    },

    /** 呼叫列表（GET_HELPER_CALL_LIST = `User.getHelperCallList`，send 23247-23249 `{}`）。
     *  回调整包透传 ChooseFollowerUI.setData(e)（23228-23233），UI 读 `this.data.callData`
     *  （scripts3.js:20104-20110：对象映射 helperId→状态，`getItem(e,"helper")` 查表、`price<=0||checkBought` 自过滤）。
     *  状态语义（自定口径）：3 = 当前跟随（6002409），1 = 可呼叫（6002407）。 */
    getHelperCallList: function (p) {
      var s = loadSave();
      var T = hkTable();
      if (!T) { noteReject('getHelperCallList', 'noTable', 'BZ_C12 缺失'); return wrapped('getHelperCallList', { eRet: 2 }, { achievement: ach() }); }
      var P = hkRead(s) || {};
      var callData = {};
      for (var k in T.helper) {
        if (!T.helper.hasOwnProperty(k)) continue;
        callData[k] = (parseInt(P.helperId, 10) === parseInt(k, 10)) ? 3 : 1;
      }
      var v = { eRet: 1, callData: callData };
      env.log('getHelperCallList → ' + Object.keys(callData).length + ' 项');
      return shaped('getHelperCallList', v) || wrapped('getHelperCallList', v, { achievement: ach() });
    },

    /** 派遣（BUTLER_DISPATCH = ★`User.dispatch`，send 23557-23565 `{taskArr, mapId, tgIdMap?}`）。
     *  ★成功分支裸读 `o.note.eco.yuanbao`（23125）→ note 必须四键齐全且带 eco.yuanbao（免费派遣也回显余额）。
     *  非分支：2→6000371、3→6000335、5→6000372、6→8845、7→6000449、8→6000440。
     *  档 A（拍板③）：派遣落档不结算任务产出；时长自定 30 分钟（dispatchEndTime = now + 30min）；派遣中再派 → 5。
     *  ★mapId 必须 ∈ locateScenes（真机实证 2026-10-27：1008 不在 helper.locate → 客户端 createRoute3
     *    查不到路线 → `Cannot read property '0' of null` **每帧崩**，index.jsc:22681）→ 不合法回 2。
     *  ★自愈通道：存量派遣态的 mapId 不合法时允许覆盖重派（否则该崩无法解除——award 有 30 分钟时间闸）。 */
    dispatch: function (p) {
      var s = loadSave();
      var T = hkTable();
      if (!T) { noteReject('dispatch', 'noTable', 'BZ_C12 缺失'); return wrapped('dispatch', { eRet: 5 }, { achievement: ach() }); }
      var scenes = (Array.isArray(T.locateScenes) && T.locateScenes.length) ? T.locateScenes : [1147, 1119, 1120, 1118];
      var P = hkRead(s) || {};
      var nowMs = env.now();
      var mapId = asInt(p.mapId, 0);
      if (scenes.indexOf(mapId) < 0) { noteReject('dispatch', 'badMap', 'mapId=' + mapId + ' 不在管家场景 ' + JSON.stringify(scenes)); return wrapped('dispatch', { eRet: 2 }, { achievement: ach() }); }
      var busy = parseInt(P.dispatchEndTime, 10) > nowMs;
      var storedMapOk = busy && scenes.indexOf(parseInt(P.mapId, 10) || 0) >= 0;
      if (busy && storedMapOk) { noteReject('dispatch', 'busy', '派遣中至 ' + P.dispatchEndTime); return wrapped('dispatch', { eRet: 5 }, { achievement: ach() }); }
      if (busy) env.log('dispatch 自愈：存量派遣态 mapId=' + P.mapId + ' 不合法 → 允许覆盖重派');
      var taskArr = Array.isArray(p.taskArr) ? p.taskArr : [];
      var endMs = nowMs + (parseInt(T.dispatchMinutes, 10) || 30) * 60000;
      P = hkEnsure(s);
      P.taskArr = taskArr;
      P.task = {};
      P.mapId = mapId;
      P.dispatchTime = nowMs;
      P.dispatchEndTime = endMs;
      P.dispatchHelper = parseInt(P.helperId, 10) || 0;   // 第13批验收补：记下派出去的是哪位管家，领奖按它算
      P.taskRtm = nowMs;
      persist();
      var v = { eRet: 1, housekeeper: hkDataOf(P), note: { ivch: {}, eqch: {}, attrch: {}, eco: { yuanbao: parseInt(s.yuanbao, 10) || 0 } } };
      env.log('dispatch → taskArr=' + JSON.stringify(taskArr) + ' mapId=' + mapId + ' 至 ' + endMs + '（档 A 不结算产出）');
      return shaped('dispatch', v) || wrapped('dispatch', v, { achievement: ach() });
    },

    /** 领派遣奖（DISPATCH_AWARD = `User.dispatchAward`，send 23625-23627 `{}`）。
     *  回调裸读 `o.housekeeper.noticeArr.length/noticeRtm`（23137）；`rewardArray` 有守卫；`addEvil` 裸读（23145）。
     *  非 1：3 → 1530；**其余一律 →1145（else 兜底）**。拍板④档 A：奖励 = 被派管家 helper.reward 照表；
     *  未到 dispatchEndTime → 3；领完清派遣态（再领 → 3，天然防重）。 */
    dispatchAward: function (p) {
      var s = loadSave();
      var T = hkTable();
      if (!T) { noteReject('dispatchAward', 'noTable', 'BZ_C12 缺失'); return wrapped('dispatchAward', { eRet: 3 }, { achievement: ach() }); }
      var P = hkRead(s) || {};
      var nowMs = env.now();
      var endMs = parseInt(P.dispatchEndTime, 10) || 0;
      if (!(endMs > 0)) { noteReject('dispatchAward', 'notReady', '无进行中的派遣'); return wrapped('dispatchAward', { eRet: 3 }, { achievement: ach() }); }
      if (nowMs < endMs) { noteReject('dispatchAward', 'notReady', '派遣未完成（至 ' + endMs + '）'); return wrapped('dispatchAward', { eRet: 3 }, { achievement: ach() }); }
      // 第13批验收补：helper.reward 是每位管家的一次性奖励（helperRewardArr 记账）。
      //   原写法每 30 分钟派一次就发一次 → 无成本无限刷 9400/9717/10269。改为每位管家只发一次，之后派遣照常成功、rewardArray 为空。
      //   且按派遣时的管家算（dispatchHelper），防"派 1 号、领前换 8 号"。
      var hid = parseInt(P.dispatchHelper != null ? P.dispatchHelper : P.helperId, 10) || 0;
      var helperRow = T.helper[String(hid)];
      var gotBefore = Array.isArray(P.helperRewardArr) && P.helperRewardArr.indexOf(hid) >= 0;
      var list = gotBefore ? [] : ((helperRow && helperRow.reward) || []);
      var note = { ivch: {}, eqch: {}, eco: {} };   // ⚠ grantRewardList 契约：必须带 eco（C11 坑 3）
      var ra = {};
      grantRewardList(s, list, note, ra);
      P = hkEnsure(s);
      P.taskArr = [];
      P.task = {};
      P.dispatchTime = null;
      P.dispatchEndTime = null;
      if (!gotBefore && list.length) P.helperRewardArr.push(hid);
      P.dispatchHelper = null;
      persist();
      var v = { eRet: 1, housekeeper: hkDataOf(P), rewardArray: ra, addEvil: 0, note: note };
      env.log('dispatchAward → ' + JSON.stringify(ra) + '（helper ' + hid + (gotBefore ? ' 已领过一次性奖励' : ' reward 照表') + '）');
      return shaped('dispatchAward', v) || wrapped('dispatchAward', v, { achievement: ach() });
    },

    /** 月卡（BUY_BUTLER_VIP = ★`User.buyMonthlyFee`，send 23659-23663 `{type}`）。
     *  回调裸读 `o.housekeeper.dueTime`（23191，毫秒）；2 → 6000402；**其余 → 8845**。
     *  拍板②：自定 300 元宝 / 30 天，只认 type=1；已开通未到期 → 2；元宝不足 → 4（走 8845 兜底）；
     *  续购 = 从现有 dueTime 顺延（dueTime > now 时）。 */
    buyMonthlyFee: function (p) {
      var s = loadSave();
      var T = hkTable();
      var type = asInt(p.type, 0);
      if (!T) { noteReject('buyMonthlyFee', 'noTable', 'BZ_C12 缺失'); return wrapped('buyMonthlyFee', { eRet: 4 }, { achievement: ach() }); }
      if (type !== parseInt(T.vipType, 10)) { noteReject('buyMonthlyFee', 'badType', 'type=' + type); return wrapped('buyMonthlyFee', { eRet: 2 }, { achievement: ach() }); }
      var P = hkRead(s) || {};
      var nowMs = env.now();
      var curDue = parseInt(P.dueTime, 10) || 0;
      if (curDue > nowMs) { noteReject('buyMonthlyFee', 'alreadyActive', '月卡至 ' + curDue); return wrapped('buyMonthlyFee', { eRet: 2 }, { achievement: ach() }); }
      var cost = parseInt(T.vipPrice, 10) || 0;
      var wallet = parseInt(s.yuanbao, 10) || 0;
      if (wallet < cost) { noteReject('buyMonthlyFee', 'insufficient', '需 ' + cost + ' 元宝，有 ' + wallet); return wrapped('buyMonthlyFee', { eRet: 4 }, { achievement: ach() }); }
      s.yuanbao = wallet - cost;
      P = hkEnsure(s);
      P.dueTime = nowMs + (parseInt(T.vipDays, 10) || 30) * 86400000;
      persist();
      var v = { eRet: 1, housekeeper: hkDataOf(P), note: { eco: { yuanbao: s.yuanbao } } };
      env.log('buyMonthlyFee → dueTime=' + P.dueTime + '，扣 ' + cost + ' 元宝');
      return shaped('buyMonthlyFee', v) || wrapped('buyMonthlyFee', v, { achievement: ach() });
    },

    /** 自动派遣模板（SET_TEMPLATE_DATA = `User.setTemplateData`，send 23616-23624 `{template, autoTime, mapId}`）。
     *  回调 1 → housekeeper + 6000439；2 → 6000332；3 → 6000320。档 A：存 template/autoTime/mapId +
     *  templateInitTime，不实现自动派遣执行。 */
    setTemplateData: function (p) {
      var s = loadSave();
      var T = hkTable();
      if (!T) { noteReject('setTemplateData', 'noTable', 'BZ_C12 缺失'); return wrapped('setTemplateData', { eRet: 2 }, { achievement: ach() }); }
      var autoTime = asInt(p.autoTime, -1);
      if (!(autoTime >= 0)) { noteReject('setTemplateData', 'badAutoTime', 'autoTime=' + p.autoTime); return wrapped('setTemplateData', { eRet: 2 }, { achievement: ach() }); }
      var P = hkEnsure(s);
      P.template = Array.isArray(p.template) ? clone(p.template) : (p.template || null);
      P.autoTime = autoTime;
      P.mapId = asInt(p.mapId, 0);
      P.templateInitTime = env.now();
      persist();
      var v = { eRet: 1, housekeeper: hkDataOf(P) };
      env.log('setTemplateData → autoTime=' + autoTime + ' mapId=' + P.mapId + ' template=' + JSON.stringify(P.template).slice(0, 80));
      return shaped('setTemplateData', v) || wrapped('setTemplateData', v, { achievement: ach() });
    },

    /** 通知（RECEIVE_NOTICE = `User.receiveNotice`，send 23640-23647 `{index}`；relations.md:35 归第 4 批顺手做，并入申报）。
     *  回调裸读 `o.eventType`（23198/23215/23257）→ 必带；1 分支还会 load hearsayUI（空通知列表 = 空弹窗）。
     *  ★非 1 → 客户端 `t.dataDestroy()`（23220）→ 档 A 无通知内容，恒 1（no-op 成功）。 */
    receiveNotice: function (p) {
      var s = loadSave();
      var P = hkEnsure(s);
      P.noticeRtm = env.now();
      persist();
      var v = { eRet: 1, housekeeper: hkDataOf(P), eventType: 0 };
      env.log('receiveNotice index=' + asInt(p.index, 0) + ' → 无通知内容（档 A no-op）');
      return shaped('receiveNotice', v) || wrapped('receiveNotice', v, { achievement: ach() });
    },

    /** ── 第 14 批 C13〔UFO 夹娃娃〕4 个（2026-10-27，用户拍板：跳过 3 死键；抓取服务端权威；照扣爪子；
     *  活动常开；signCode 验存在）。★PAY_ACTION_RE 核对：4 个名字不含 Pay/pay/Order/Recharge/IAP/Jetton。 */

    /** 面板开关（GET_UFO_CATCHER_DATA = `User.getUFOCatcherData`，send scripts3.js:25880 无载荷）。
     *  dollUI 在 1 分支里 new（25791-25795）。首开赠送：三档爪子各 3 把 + 1 次免费刷新（自定口径，申报）。
     *  池子空且无刷新次数时也照回（客户端展示空机，买/刷后可玩）。 */
    getUFOCatcherData: function (p) {
      var s = loadSave();
      var T = dlTable();
      if (!T) { noteReject('getUFOCatcherData', 'noTable', 'BZ_C13 缺失'); return wrapped('getUFOCatcherData', { eRet: 2 }, { achievement: ach() }); }
      var P = dlEnsure(s);
      var note = { ivch: {}, eqch: {}, eco: {} };
      if (P.firstGrantDone !== 1) {
        var gift = [];
        for (var g in T.clawByGear) if (T.clawByGear.hasOwnProperty(g)) gift.push([T.clawByGear[g], 3]);
        grantRewardList(s, gift, note, {});
        P.freeRefreshTimes = (parseInt(T.freeRefreshOnFirst, 10) || 0);
        P.firstGrantDone = 1;
        env.log('getUFOCatcherData 首开赠送：爪 ' + JSON.stringify(gift) + ' + 免费刷新 ' + P.freeRefreshTimes);
      }
      if (dlPoolCount(P.rewardPool) <= 0) { P.rewardPool = dlGenPool(T); P.signId += 1; }
      persist();
      var v = { eRet: 1, rewardPool: clone(P.rewardPool), refreshTimes: P.refreshTimes, freeRefreshTimes: P.freeRefreshTimes,
        buyRefreshTimes: P.buyRefreshTimes, buyCoinCount: P.buyCoinCount, signId: P.signId, note: note };
      return shaped('getUFOCatcherData', v) || wrapped('getUFOCatcherData', v, { achievement: ach() });
    },

    /** 抓取（REWARD_UFO = `User.rewardUFO`，send 25858-25867 `{packages, itemId, signCode}`）。
     * itemId = 爪子道具（gear 0/1/2 → 8117/8119/8120）；signCode = 客户端 md5(2*signId+37)。
     *  回包：rewardArray 有守卫；autoRefresh 存在 → 客户端 initItems(回包 rewardPool) 重摆；
     *  ★任何非 1 → 客户端恒 dispatch CATCH_DOLL_EVENT null（25767），15 → 8060 —— 拒绝安全。
     *  拍板②：**服务端权威判中**（忽略 packages，按池子数量加权随机）；拍板③：照扣爪子；
     *  拍板⑤：抓中难度 k → 发 8143 × difficulty[k].reward（照表 30/30/60/150/300）；池子抓空自动刷新。 */
    rewardUFO: function (p) {
      var s = loadSave();
      var T = dlTable();
      if (!T) { noteReject('rewardUFO', 'noTable', 'BZ_C13 缺失'); return wrapped('rewardUFO', { eRet: 15 }, { achievement: ach() }); }
      var itemId = asInt(p.itemId, 0);
      var gear = null;
      for (var g in T.clawByGear) if (T.clawByGear.hasOwnProperty(g) && T.clawByGear[g] === itemId) gear = parseInt(g, 10);
      if (gear === null) { noteReject('rewardUFO', 'badGear', 'itemId=' + itemId + ' 不是爪子'); return wrapped('rewardUFO', { eRet: 15 }, { achievement: ach() }); }
      if (typeof p.signCode !== 'string' || p.signCode.length === 0) { noteReject('rewardUFO', 'badSign', 'signCode 缺失'); return wrapped('rewardUFO', { eRet: 15 }, { achievement: ach() }); }
      var P = dlRead(s) || {};
      if (dlPoolCount(P.rewardPool) <= 0) { noteReject('rewardUFO', 'emptyPool', '池子为空'); return wrapped('rewardUFO', { eRet: 15 }, { achievement: ach() }); }
      var claw = T.clawByGear[String(gear)];
      var have = parseInt(s.bag[claw], 10) || 0;
      if (!(have > 0)) { noteReject('rewardUFO', 'noClaw', '爪 ' + claw + ' ×0'); return wrapped('rewardUFO', { eRet: 15 }, { achievement: ach() }); }
      // —— 校验全过 → 消耗与结算 ——
      var note = { ivch: {}, eqch: {}, eco: {} };
      s.bag[claw] = have - 1;
      note.ivch[String(claw)] = have - 1;
      P = dlEnsure(s);
      // 服务端权威判中：按池子数量加权随机取难度 k
      var total = dlPoolCount(P.rewardPool);
      var roll = Math.floor(Math.random() * total);
      var pickK = null;
      for (var k in P.rewardPool) {
        if (!P.rewardPool.hasOwnProperty(k)) continue;
        roll -= (parseInt(P.rewardPool[k], 10) || 0);
        if (roll < 0) { pickK = k; break; }
      }
      if (pickK === null) pickK = k;
      var row = T.difficulty[String(pickK)] || {};
      var coinCount = parseInt(row.reward, 10) || 0;
      var ra = {};
      if (coinCount > 0) grantRewardList(s, [[T.coinItem, coinCount]], note, ra);
      P.rewardPool[pickK] = (parseInt(P.rewardPool[pickK], 10) || 0) - 1;
      if ((parseInt(P.rewardPool[pickK], 10) || 0) <= 0) delete P.rewardPool[pickK];
      var poolLeft = dlPoolCount(P.rewardPool);
      persist();
      var v;
      if (poolLeft <= 0) {
        P.rewardPool = dlGenPool(T);
        persist();
        v = { eRet: 1, rewardArray: ra, autoRefresh: 1, rewardPool: clone(P.rewardPool), note: note };
        env.log('rewardUFO 抓中难度 ' + pickK + ' → ' + JSON.stringify(ra) + '；池子抓空自动刷新');
      } else {
        v = { eRet: 1, rewardArray: ra, note: note };
        env.log('rewardUFO 抓中难度 ' + pickK + ' → ' + JSON.stringify(ra) + '；池余 ' + poolLeft);
      }
      return shaped('rewardUFO', v) || wrapped('rewardUFO', v, { achievement: ach() });
    },

    /** 刷新（USE_UFO_REFRESH = ★`User.useUFOrefresh`，send 25876-25878 无载荷）。
     *  免费次数优先、再扣已购次数；都无 → 6（getText 8060，25781）；3 → 活动过期通道（常开口径不用）。
     *  刷新 = 重生成池子 + signId+1（旧 signCode 立即失效——防作弊语义）。 */
    useUFOrefresh: function (p) {
      var s = loadSave();
      var T = dlTable();
      if (!T) { noteReject('useUFOrefresh', 'noTable', 'BZ_C13 缺失'); return wrapped('useUFOrefresh', { eRet: 6 }, { achievement: ach() }); }
      var P = dlRead(s) || {};
      var free = parseInt(P.freeRefreshTimes, 10) || 0;
      var paid = parseInt(P.refreshTimes, 10) || 0;
      if (!(free + paid > 0)) { noteReject('useUFOrefresh', 'noTimes', '无可用刷新次数'); return wrapped('useUFOrefresh', { eRet: 6 }, { achievement: ach() }); }
      P = dlEnsure(s);
      if (free > 0) P.freeRefreshTimes = free - 1; else P.refreshTimes = paid - 1;
      P.rewardPool = dlGenPool(T);
      P.signId += 1;
      persist();
      var v = { eRet: 1, rewardPool: clone(P.rewardPool), refreshTimes: P.refreshTimes, freeRefreshTimes: P.freeRefreshTimes,
        buyRefreshTimes: P.buyRefreshTimes, signId: P.signId };
      env.log('useUFOrefresh → 池子重生成，剩 free=' + P.freeRefreshTimes + ' paid=' + P.refreshTimes + ' signId=' + P.signId);
      return shaped('useUFOrefresh', v) || wrapped('useUFOrefresh', v, { achievement: ach() });
    },

    /** 买刷新次数（BUY_UFO_REFRESH_TIMES = `User.buyUFORefreshTimes`，send 25848-25852 `{num:1}` 恒 1）。
     *  回包三次数全守卫；7 → 8060、5/6 → 3633、3 → 活动过期。
     *  拍板⑥：100 元宝/次、累计限购 3 次（buyRefreshTimes 计数，无每日重置——自定口径申报）。 */
    buyUFORefreshTimes: function (p) {
      var s = loadSave();
      var T = dlTable();
      if (!T) { noteReject('buyUFORefreshTimes', 'noTable', 'BZ_C13 缺失'); return wrapped('buyUFORefreshTimes', { eRet: 7 }, { achievement: ach() }); }
      var P = dlRead(s) || {};
      var bought = parseInt(P.buyRefreshTimes, 10) || 0;
      if (bought >= (parseInt(T.buyRefreshDailyCap, 10) || 3)) { noteReject('buyUFORefreshTimes', 'capReached', '已购 ' + bought + ' 次'); return wrapped('buyUFORefreshTimes', { eRet: 7 }, { achievement: ach() }); }
      var cost = parseInt(T.buyRefreshPrice, 10) || 0;
      var wallet = parseInt(s.yuanbao, 10) || 0;
      if (wallet < cost) { noteReject('buyUFORefreshTimes', 'insufficient', '需 ' + cost + ' 元宝，有 ' + wallet); return wrapped('buyUFORefreshTimes', { eRet: 5 }, { achievement: ach() }); }
      s.yuanbao = wallet - cost;
      P = dlEnsure(s);
      P.refreshTimes = (parseInt(P.refreshTimes, 10) || 0) + 1;
      P.buyRefreshTimes = bought + 1;
      persist();
      var v = { eRet: 1, refreshTimes: P.refreshTimes, freeRefreshTimes: P.freeRefreshTimes, buyRefreshTimes: P.buyRefreshTimes,
        note: { eco: { yuanbao: s.yuanbao } } };
      env.log('buyUFORefreshTimes → 已购 ' + P.buyRefreshTimes + '/' + T.buyRefreshDailyCap + '，扣 ' + cost + ' 元宝');
      return shaped('buyUFORefreshTimes', v) || wrapped('buyUFORefreshTimes', v, { achievement: ach() });
    },

    /* ============ 第 15 批 C14〔斗狗〕（2026-10-27）============
     * 档 A（用户 2026-10-27 拍板）：本家喂狗 + 狗日志 + 狗战结算桥接；4 键不做。
     * 取证：batch15-facts-20261027\C14-取证与策略.md（W1-W4 + 主审对撞；7 键 send/listen 全部定位）。
     * 不做 4 键（ISSUE 挂账）：
     *   · enterDogPVEBattle / enterRogueMulitiNpcBattle —— 多人回放引擎家族（响应由 SPMpBtMgr/
     *     RogueMpFightMgr 的通用键消费，服务端要生成整场战斗数据；ENTER_PVEDOG_FIGHT 甚至没有
     *     同键监听者），C08 ISSUE-8 同口径，保留 UNKNOWN 兜底；好友家未实现 → 当前不可达。
     *   · ReqDogPartnerBattleInfo / CheckDogPartnerPVEBattleResult —— startDogPartnerFight 全客户端
     *     0 调用方（仅定义 index.js:13139），客户端死键。
     * 建横：getHomeList.dog 从 0 改为 {id,s,t,p,n}（狗活了喂狗链才可达）。
     * 防刷：喂狗**真扣狗粮 6285**（道具成本天然合规，无奖励产出）；progress 封顶 const128=10000。 */

    /** 狗日志（LOOK_DOG_LOG = ★`User.lookDogLog`，send `{type}`，index.js:58224-58226）。
     *  监听 58047：`1 == eRet && e.hasOwnProperty("log") && dispatch(HOME_LOG_EVENT, e.log)`；
     *  scripts2.js:29389 HomeLogUI.onShowLogListData → `_itemDataList.length`，**必须是数组**；
     *  缺 log 键则不 dispatch、列表不刷新 → 空数组 = 空日志，安全。 */
    lookDogLog: function (p) {
      var s = loadSave();
      var T = dogTable();
      if (!T) { noteReject('lookDogLog', 'noTable', 'BZ_C14 缺失'); return wrapped('lookDogLog', { eRet: 2 }, { achievement: ach() }); }
      var d = dogRead(s) || {};
      var v = { eRet: 1, log: [] };
      env.log('lookDogLog → 空日志（type=' + ((p && p.type) || 0) + '，狗 id=' + (d.id || 0) + '）');
      return shaped('lookDogLog', v) || wrapped('lookDogLog', v, { achievement: ach() });
    },

    /** 喂狗（FEED_DOG = `User.FeedDog`，send `{propID, propnum}`，index.js:58228-58233）。
     *  客户端：scripts2.js:6350 BuyItemUI16 → reqFeedDog(itemId, num)；6356-6360 上限 = (const128-p)/const129；
     *  监听 58053：`1 == eRet → o.progress → dogData.p、o.bigDog → dogData.id` → dispatch FEED_DOG_EVENT。
     *  服务端：只认狗粮 6285、真扣、p += 100×num 封顶 10000；喂满 → 升大狗 11194（回 bigDog）。
     *  ⚠ note.ivch 回**绝对值**（index.js:64914-64915 用它同步背包），否则喂完 UI 数量不更新。 */
    FeedDog: function (p) {
      var s = loadSave();
      // ⚠ 上游验收小修（2026-10-27）：s.bag 守卫必须在任何 s.bag[...] 读取之前——
      //   新档缺 s.bag 时先读会抛错（读在写前、不会写坏存档，但会走 catchNoCode 空排放）。
      if (!s.bag || typeof s.bag !== 'object') s.bag = {};
      var T = dogTable();
      if (!T) { noteReject('FeedDog', 'noTable', 'BZ_C14 缺失'); return wrapped('FeedDog', { eRet: 2 }, { achievement: ach() }); }
      var itemId = asInt(p.propID, 0);
      var num = asInt(p.propnum, 0);
      if (itemId !== (parseInt(T.feedItem, 10) || 0)) { noteReject('FeedDog', 'badItem', 'propID=' + itemId + ' 不是狗粮 ' + T.feedItem); return wrapped('FeedDog', { eRet: 2 }, { achievement: ach() }); }
      if (!(num > 0)) { noteReject('FeedDog', 'badNum', 'propnum=' + num); return wrapped('FeedDog', { eRet: 2 }, { achievement: ach() }); }
      var have = parseInt(s.bag[itemId], 10) || 0;
      if (have < num) { noteReject('FeedDog', 'insufficient', '狗粮 ' + have + ' < ' + num); return wrapped('FeedDog', { eRet: 2 }, { achievement: ach() }); }
      var d = dogRead(s);
      var cap = parseInt(T.feedCap, 10) || 0;
      var per = parseInt(T.feedPer, 10) || 0;
      var pOld = d ? (parseInt(d.p, 10) || 0) : 0;
      if (pOld >= cap) { noteReject('FeedDog', 'full', '狗已喂满 ' + pOld + '/' + cap); return wrapped('FeedDog', { eRet: 2 }, { achievement: ach() }); }
      if (!d) { s.dog = { id: T.dogSmall, p: 0 }; d = s.dog; }
      var left = have - num;
      if (left > 0) s.bag[itemId] = left; else delete s.bag[itemId];
      var pNew = Math.min(cap, pOld + num * per);
      d.p = pNew;
      var note = { ivch: {} };
      note.ivch[String(itemId)] = left;
      var v = { eRet: 1, progress: pNew, note: note };
      if (pNew >= cap && (parseInt(d.id, 10) || 0) !== (parseInt(T.dogBig, 10) || 0)) {
        d.id = T.dogBig;
        v.bigDog = T.dogBig;
      }
      persist();
      env.log('FeedDog → 喂 ' + num + ' 份（狗粮 ' + itemId + '），progress ' + pOld + '→' + pNew + (v.bigDog ? '，升大狗 ' + v.bigDog : ''));
      return shaped('FeedDog', v) || wrapped('FeedDog', v, { achievement: ach() });
    },

    /** 狗战结算（DOG_BATTLE_RESULT = ★`User.DogBattleResult`，send 58234-58243：
     *  `{fID, dogID, gTime, hg, hgtimes, win}`，仅 startDogFight().then 里可达 → 当前**不可达**
     *  （好友家未实现、stealCrop 档 A 锁）。桥接：认客户端报的 win，狗状态回健康（s=0,t=0）；
     *  客户端监听 58050：`1 == eRet && o.win → setDogCurState(0, o.endTime)`。 */
    DogBattleResult: function (p) {
      var s = loadSave();
      var T = dogTable();
      if (!T) { noteReject('DogBattleResult', 'noTable', 'BZ_C14 缺失'); return wrapped('DogBattleResult', { eRet: 2 }, { achievement: ach() }); }
      var d = dogRead(s);
      var win = !!(p && p.win);
      if (d) {
        d.s = 0;
        d.t = 0;
        persist();
      }
      var v = { eRet: 1, win: win, endTime: 0 };
      env.log('DogBattleResult 桥接 → win=' + win + '（狗 id=' + ((d && d.id) || 0) + '）');
      return shaped('DogBattleResult', v) || wrapped('DogBattleResult', v, { achievement: ach() });
    },

    /* ============ 第 16 批 C15〔七日回归〕（2026-10-27）============
     * 档 A（用户 2026-10-27 拍板）：回归 6 键最小闭环。
     * 契约：scripts3.js:63532-63626 ReturnModel（on 63542/63551/63554/63559/63568/63575/63581/63587，
     *   send 63595/63598/63603/63606/63609/63612/63615/63620）；
     *   面板：活动面板 1018 → reqGetReturnSevenDayData → eRet==1 → ReturnUI（scripts2:28808/28970/29214）。
     * 不做 3 键（ISSUE-15）：SEVEN_DAYS_AWARDS（sevendays 另一套签到）、GET_SPRING_SEVEN_DAY_DATA /
     *   SPRING_SEVEN_DAYS_AWARDS / RECEIVE_SPRING_ACC_REWARD（新春窗口 2026-08 已过期）。
     * 防刷：唯一产出=七日奖励（每天一次、7 份封顶，计时循环有每日上限）；任务/活跃度诚实空态；礼包纯展示。 */

    /** 七日数据 + 面板门（GET_RETURN_SEVEN_DAY_DATA = `User.getReturnSevenDayData`，send 63606 {}）。
     *  监听 63559：`1 == eRet → sevenDayData=o.sevenDaysArr、triggerTime=o.triggerTime、dispatch`。
     *  门：活动面板点 1018 → reqGetReturnSevenDayData → eRet==1 才切页开 ReturnUI（scripts2:28970-28977）。 */
    getReturnSevenDayData: function (p) {
      var s = loadSave();
      var T = rtTable();
      if (!T) { noteReject('getReturnSevenDayData', 'noTable', 'BZ_C15 缺失'); return wrapped('getReturnSevenDayData', { eRet: 2 }, { achievement: ach() }); }
      var R = rtEnsure(s);
      var v = { eRet: 1, sevenDaysArr: rtSevenArr(R), triggerTime: R.trigger };
      persist();
      env.log('getReturnSevenDayData 回归期起点 ' + R.trigger + ' 已过 ' + rtSevenArr(R).length + ' 天');
      return shaped('getReturnSevenDayData', v) || wrapped('getReturnSevenDayData', v, { achievement: ach() });
    },

    /** 领取当日七日奖励（RETURN_SEVEN_DAYS_AWARDS = `User.returnSevenDaysAwards`，send 63612 {}）。
     *  监听 63575：`1 == eRet → sevenDaysArr=o.sevenDaysArr、dispatch(RETURN_SEVEN_DAYS_AWARDS, rewardArray)`。
     *  ReturnDayItem 63431-63434：id == sevenDaysArr.length && 末位==1 才可点。
     *  ⚠ 防刷：每天一次（claimed[day] 记账）；14 天期 7 份封顶；重复领 → eRet 2 静默。 */
    returnSevenDaysAwards: function (p) {
      var s = loadSave();
      var T = rtTable();
      if (!T) { noteReject('returnSevenDaysAwards', 'noTable', 'BZ_C15 缺失'); return wrapped('returnSevenDaysAwards', { eRet: 2 }, { achievement: ach() }); }
      var R = rtRead(s);
      if (!R) { noteReject('returnSevenDaysAwards', 'notReady', '未开回归面板（未触发 triggerTime）'); return wrapped('returnSevenDaysAwards', { eRet: 2 }, { achievement: ach() }); }
      var day = rtDays(R);
      if (R.claimed[day]) { noteReject('returnSevenDaysAwards', 'claimed', '第 ' + day + ' 天已领'); return wrapped('returnSevenDaysAwards', { eRet: 2 }, { achievement: ach() }); }
      var items = T.sevenDay[String(day)] || [];
      if (!items.length) { noteReject('returnSevenDaysAwards', 'noRow', 'Return_SevenDay 缺第 ' + day + ' 天'); return wrapped('returnSevenDaysAwards', { eRet: 2 }, { achievement: ach() }); }
      var note = { ivch: {}, eqch: {}, eco: {} };
      var ra = {};
      grantRewardList(s, items, note, ra);
      R.claimed[day] = 1;
      persist();
      var v = { eRet: 1, sevenDaysArr: rtSevenArr(R), rewardArray: ra };
      env.log('returnSevenDaysAwards → 第 ' + day + ' 天领取 ' + JSON.stringify(items));
      return shaped('returnSevenDaysAwards', v) || wrapped('returnSevenDaysAwards', v, { achievement: ach() });
    },

    /** 回归任务数据（GET_RETURN_TASK_DATA = `User.getReturnTaskData`，send 63609 {}）。
     *  监听 63568：`1 == eRet → taskData=o.oldReturnData、triggerTime=o.triggerTime`。
     *  ★档 A：任务完成口径离线无埋点 → 全部诚实 state 0（展示不可领）；liveness=0、livenessDatas=[]。 */
    getReturnTaskData: function (p) {
      var s = loadSave();
      var T = rtTable();
      if (!T) { noteReject('getReturnTaskData', 'noTable', 'BZ_C15 缺失'); return wrapped('getReturnTaskData', { eRet: 2 }, { achievement: ach() }); }
      var R = rtEnsure(s);
      var tasks = [], i;
      for (i = 0; i < T.tasks.length; i++) tasks.push([T.tasks[i].id, 0, 0]);
      var v = {
        eRet: 1,
        oldReturnData: { tasks: tasks, liveness: 0, livenessDatas: [] },
        triggerTime: R.trigger,
      };
      persist();
      env.log('getReturnTaskData → ' + tasks.length + ' 个任务（档 A 诚实 0 状态）liveness=0');
      return shaped('getReturnTaskData', v) || wrapped('getReturnTaskData', v, { achievement: ach() });
    },

    /** 领回归任务奖（RECEIVE_RETURN_DAILY_TASK = `User.receiveReturnDailyTask`，send 63615 {id}）。
     *  监听 63581：只有 1 == eRet 分支（否则静默）→ 拒绝一律 2。★档 A：任务恒未完成，拒绝（不伪造进度）。 */
    receiveReturnDailyTask: function (p) {
      noteReject('receiveReturnDailyTask', 'notDone', 'id=' + (p && p.id) + ' 任务未完成（档 A 任务口径恒 0）');
      return wrapped('receiveReturnDailyTask', { eRet: 2 }, { achievement: ach() });
    },

    /** 领活跃度奖（RECEIVE_LIVENESS_AWARD = `User.receiveLivenessAward`，send 63620 {id}）。
     *  监听 63587：只有 1 == eRet 分支 → 拒绝一律 2。★档 A：liveness 恒 0，领取拒绝。 */
    receiveLivenessAward: function (p) {
      noteReject('receiveLivenessAward', 'noLiveness', 'id=' + (p && p.id) + ' liveness=0（档 A）');
      return wrapped('receiveLivenessAward', { eRet: 2 }, { achievement: ach() });
    },

    /** 回归礼包拉取（GET_RETURN_GIFT = `User.getReturnGift`，send 63595 {}）。
     *  监听 63542：`1 == eRet → chargeData=o.giftDatas；每个 isAward==1 自动领`。
     *  ★档 A：纯展示 —— isBuy=0（按钮禁用）/ isAward=0（不自动领），防付费白拿。 */
    getReturnGift: function (p) {
      var T = rtTable();
      if (!T) { noteReject('getReturnGift', 'noTable', 'BZ_C15 缺失'); return wrapped('getReturnGift', { eRet: 2 }, { achievement: ach() }); }
      var arr = [], i;
      for (i = 0; i < T.gifts.length; i++) {
        arr.push({ ID: T.gifts[i].id, nameID: T.gifts[i].name, getGold: 0, money: T.gifts[i].price, isBuy: 0, isAward: 0 });
      }
      var v = { eRet: 1, giftDatas: arr };
      env.log('getReturnGift → ' + arr.length + ' 档礼包（纯展示 isBuy=0）');
      return shaped('getReturnGift', v) || wrapped('getReturnGift', v, { achievement: ach() });
    },

    /** 礼包刷新（REFRESH_RETURN_GIFT_AWARD = `User.refreshReturnGiftAward`，send 63603 {}）。
     *  监听 63554：`1 == eRet → giftAwards.forEach([1]=="1" → 自动领)`；档 A 恒回空数组。 */
    refreshReturnGiftAward: function () {
      var T = rtTable();
      if (!T) { noteReject('refreshReturnGiftAward', 'noTable', 'BZ_C15 缺失'); return wrapped('refreshReturnGiftAward', { eRet: 2 }, { achievement: ach() }); }
      var v = { eRet: 1, giftAwards: [] };
      env.log('refreshReturnGiftAward → 空（档 A 纯展示）');
      return shaped('refreshReturnGiftAward', v) || wrapped('refreshReturnGiftAward', v, { achievement: ach() });
    },

    /** 领礼包（RECEIVE_RETURN_GIFT_AWARD = `User.receiveReturnGiftAward`，send 63598 {giftId}）。
     *  监听 63551：只有 1 分支。★档 A：未购买 → 拒绝 2（付费礼包防白拿）。 */
    receiveReturnGiftAward: function (p) {
      noteReject('receiveReturnGiftAward', 'notBought', 'giftId=' + (p && p.giftId) + ' 未购买（离线无支付通道）');
      return wrapped('receiveReturnGiftAward', { eRet: 2 }, { achievement: ach() });
    },

    /* ============ 第 19 批 C19〔技能皮肤商店〕（2026-10-27，A 轮第 1 批）============
     * 7 键全活（scripts3.js SkinModel 82783-83011，订阅 82801-82807 / 发送 82810-82894）。
     * 门：GET_SKILL_SKIN_SHOP → onGetShopData 1 → showShop() 开 SkinShopUI（82913）；
     *    GET_SKILL_SKIN_ACTIVE_SHOP → GET_SKIN_ACTIVE_DATA → 活动页 1027 → SkinActiveShopUI。
     * 存档：s.skinShop.bought{} / s.skinData{} / s.skinWeap{}；LoadGame 回放 skillSkinData。
     * 口径（默认拍板第 1/2/9/10/12 条）：price 照表按元宝；活动常开 30 天续期；每行限购 1；
     *   刷新 20 元宝/次（自定申报）；type=1 卖道具（发 item），type=2 直售 skillskin（发皮肤）。 */

    /** 皮肤商店货架（GET_SKILL_SKIN_SHOP = `User.getSkillSkinShop`，send 82894 无参）。 */
    getSkillSkinShop: function () {
      var s = loadSave();
      var T = skTable();
      if (!T) { noteReject('getSkillSkinShop', 'noTable', 'BZ_C19 缺失'); return wrapped('getSkillSkinShop', { eRet: 2 }, { achievement: ach() }); }
      var P = skShop(s);
      var v = { eRet: 1, shopData: { ds: skShopDs(T, P, 1), price: T.refreshPrice, freeTime: 0 } };
      persist();
      env.log('getSkillSkinShop → 货架 ' + Object.keys(v.shopData.ds).length + ' 行（type=1）');
      return shaped('getSkillSkinShop', v) || wrapped('getSkillSkinShop', v, { achievement: ach() });
    },

    /** 刷新货架（REFRESH_SKILL_SKIN_SHOP = `User.refreshSkillSkinShop`，send 82883 无参）。
     *  ★防刷（默认拍板第 9 条）：刷新有成本 —— 20 元宝/次（自定申报）。 */
    refreshSkillSkinShop: function () {
      var s = loadSave();
      var T = skTable();
      if (!T) { noteReject('refreshSkillSkinShop', 'noTable', 'BZ_C19 缺失'); return wrapped('refreshSkillSkinShop', { eRet: 2 }, { achievement: ach() }); }
      var P = skShop(s);
      var cost = T.refreshPrice;
      var wallet = parseInt(s.yuanbao, 10) || 0;
      if (wallet < cost) { noteReject('refreshSkillSkinShop', 'insufficient', '需 ' + cost + ' 元宝，有 ' + wallet); return wrapped('refreshSkillSkinShop', { eRet: 2 }, { achievement: ach() }); }
      s.yuanbao = wallet - cost;
      P.lastRefresh = env.now();
      persist();
      var v = { eRet: 1, shopData: { ds: skShopDs(T, P, 1), price: T.refreshPrice, freeTime: 0 }, note: { eco: { yuanbao: s.yuanbao } } };
      env.log('refreshSkillSkinShop → 扣 ' + cost + ' 元宝，货架刷新');
      return shaped('refreshSkillSkinShop', v) || wrapped('refreshSkillSkinShop', v, { achievement: ach() });
    },

    /** 买道具（BUY_SKILL_SKIN_SHOP = `User.buySkillSkinShop`，send 82861 {id}）。
     *  ★防刷：type=1 行照表 price 扣元宝；每行限购 1（模型 maxBuyNum=1）；发的是货架 item。
     *  ⚠ 不发 rewardSkillSkin：客户端按 skillskin id 取 name（82867），type=1 发道具 id 会 null.name。 */
    buySkillSkinShop: function (p) {
      var s = loadSave();
      var T = skTable();
      if (!T) { noteReject('buySkillSkinShop', 'noTable', 'BZ_C19 缺失'); return wrapped('buySkillSkinShop', { eRet: 2 }, { achievement: ach() }); }
      var id = String(asInt(p.id, 0));
      var row = T.shop[id];
      if (!row || row.type !== 1) { noteReject('buySkillSkinShop', 'badId', 'id=' + id + ' 非 type=1 货架'); return wrapped('buySkillSkinShop', { eRet: 2 }, { achievement: ach() }); }
      var P = skShop(s);
      if (P.bought[id]) { noteReject('buySkillSkinShop', 'bought', 'id=' + id + ' 已购'); return wrapped('buySkillSkinShop', { eRet: 2 }, { achievement: ach() }); }
      var cost = row.price;
      var wallet = parseInt(s.yuanbao, 10) || 0;
      if (wallet < cost) { noteReject('buySkillSkinShop', 'insufficient', '需 ' + cost + ' 元宝，有 ' + wallet); return wrapped('buySkillSkinShop', { eRet: 2 }, { achievement: ach() }); }
      s.yuanbao = wallet - cost;
      if (!s.bag || typeof s.bag !== 'object') s.bag = {};
      bagAdd(s, row.item, 1);
      P.bought[id] = 1;
      persist();
      var ra = {};
      ra[row.item] = 1;
      var note = { eco: { yuanbao: s.yuanbao }, ivch: {} };
      note.ivch[String(row.item)] = parseInt(s.bag[row.item], 10) || 0;
      var v = { eRet: 1, shopData: { ds: skShopDs(T, P, 1) }, rewardArray: ra, note: note };
      env.log('buySkillSkinShop → 行 ' + id + ' 扣 ' + cost + ' 元宝，发道具 ' + row.item);
      return shaped('buySkillSkinShop', v) || wrapped('buySkillSkinShop', v, { achievement: ach() });
    },

    /** 活动皮肤商店（GET_SKILL_SKIN_ACTIVE_SHOP = `User.getSkillSkinActiveShop`，send 82827 无参）。
     *  常开（默认拍板第 2 条）：endTime = now + 30 天续期；shopDatas = type=2 行 id。 */
    getSkillSkinActiveShop: function () {
      var s = loadSave();
      var T = skTable();
      if (!T) { noteReject('getSkillSkinActiveShop', 'noTable', 'BZ_C19 缺失'); return wrapped('getSkillSkinActiveShop', { eRet: 2 }, { achievement: ach() }); }
      var ids = [], id, r;
      for (id in T.shop) if (T.shop.hasOwnProperty(id)) {
        r = T.shop[id];
        if (r.type === 2) ids.push(parseInt(id, 10));
      }
      ids.sort(function (a, b) { return a - b; });
      var v = { eRet: 1, endTime: env.now() + (parseInt(T.activeDays, 10) || 30) * 86400000, shopDatas: ids, isSelect: 0 };
      env.log('getSkillSkinActiveShop → 活动货架 ' + ids.length + ' 行');
      return shaped('getSkillSkinActiveShop', v) || wrapped('getSkillSkinActiveShop', v, { achievement: ach() });
    },

    /** 买活动皮肤（BUY_SKILL_SKIN_ACTIVE_SHOP = `User.buySkillSkinActiveShop`，send 82810 {ids:[...]}）。
     *  ★防刷：type=2 行照表 price 扣元宝；已拥有 → 2；余额不足 → 2（客户端 6003145 提示）。 */
    buySkillSkinActiveShop: function (p) {
      var s = loadSave();
      var T = skTable();
      if (!T) { noteReject('buySkillSkinActiveShop', 'noTable', 'BZ_C19 缺失'); return wrapped('buySkillSkinActiveShop', { eRet: 2 }, { achievement: ach() }); }
      var ids = (p && Array.isArray(p.ids)) ? p.ids : [];
      if (!ids.length) { noteReject('buySkillSkinActiveShop', 'badIds', 'ids 空'); return wrapped('buySkillSkinActiveShop', { eRet: 2 }, { achievement: ach() }); }
      var SD = skData(s);
      var note = { ivch: {}, eqch: {}, eco: {} };
      var rew = {}, i, row, skinId, cost, wallet;
      for (i = 0; i < ids.length; i++) {
        row = T.shop[String(asInt(ids[i], 0))];
        if (!row || row.type !== 2) { noteReject('buySkillSkinActiveShop', 'badId', 'id=' + ids[i] + ' 非 type=2 货架'); return wrapped('buySkillSkinActiveShop', { eRet: 2 }, { achievement: ach() }); }
        skinId = row.item;
        if (!T.skins[String(skinId)]) { noteReject('buySkillSkinActiveShop', 'badSkin', 'item=' + skinId + ' 非 skillskin'); return wrapped('buySkillSkinActiveShop', { eRet: 2 }, { achievement: ach() }); }
        if (SD[skinId]) { noteReject('buySkillSkinActiveShop', 'owned', 'skin ' + skinId + ' 已拥有'); return wrapped('buySkillSkinActiveShop', { eRet: 2 }, { achievement: ach() }); }
        cost = row.price;
        wallet = parseInt(s.yuanbao, 10) || 0;
        if (wallet < cost) { noteReject('buySkillSkinActiveShop', 'insufficient', '需 ' + cost + ' 元宝，有 ' + wallet); return wrapped('buySkillSkinActiveShop', { eRet: 2 }, { achievement: ach() }); }
        s.yuanbao = wallet - cost;
        SD[skinId] = 1;
        rew[skinId] = 1;
      }
      note.eco.yuanbao = s.yuanbao;
      persist();
      var v = { eRet: 1, rewardSkillSkin: rew, isSelect: 0, note: note };
      env.log('buySkillSkinActiveShop → 买 ' + JSON.stringify(rew) + '，余 ' + s.yuanbao + ' 元宝');
      return shaped('buySkillSkinActiveShop', v) || wrapped('buySkillSkinActiveShop', v, { achievement: ach() });
    },

    /** 装皮肤（EQUIP_SKILL_SKIN = `User.equipSkillSkin`，send 82849 {skillId, id}）。
     *  校验：皮肤必须已拥有（s.skinData）——不信请求参数（默认拍板第 8 条）。 */
    equipSkillSkin: function (p) {
      var s = loadSave();
      var T = skTable();
      if (!T) { noteReject('equipSkillSkin', 'noTable', 'BZ_C19 缺失'); return wrapped('equipSkillSkin', { eRet: 2 }, { achievement: ach() }); }
      var skillId = asInt(p.skillId, 0);
      var id = asInt(p.id, 0);
      var SD = skData(s);
      if (!id || !SD[id]) { noteReject('equipSkillSkin', 'notOwned', 'skin ' + id + ' 未拥有'); return wrapped('equipSkillSkin', { eRet: 2 }, { achievement: ach() }); }
      var W = skWeap(s);
      W[skillId] = id;
      persist();
      var m = {};
      m[skillId] = id;
      var v = { eRet: 1, skillSkinWeap: m };
      env.log('equipSkillSkin → skill ' + skillId + ' ← skin ' + id);
      return shaped('equipSkillSkin', v) || wrapped('equipSkillSkin', v, { achievement: ach() });
    },

    /** 卸皮肤（REMOVE_SKILL_SKIN = `User.removeSkillSkin`，send 82838 {skillId}）。
     *  监听 82842：{skillSkinWeap:{槽:0}} → 删 weapToSkinData 项。 */
    removeSkillSkin: function (p) {
      var s = loadSave();
      var T = skTable();
      if (!T) { noteReject('removeSkillSkin', 'noTable', 'BZ_C19 缺失'); return wrapped('removeSkillSkin', { eRet: 2 }, { achievement: ach() }); }
      var skillId = asInt(p.skillId, 0);
      var W = skWeap(s);
      if (W[skillId]) delete W[skillId];
      persist();
      var m = {};
      m[skillId] = 0;
      var v = { eRet: 1, skillSkinWeap: m };
      env.log('removeSkillSkin → skill ' + skillId + ' 卸下');
      return shaped('removeSkillSkin', v) || wrapped('removeSkillSkin', v, { achievement: ach() });
    },

    obtainCrop: function (p) {
      p = p || {};
      var s = loadSave();
      var P = plantRead(s);
      var idx = asInt(p.sIdx, -1);
      var land = (P && idx >= 0 && idx < P.lands.length) ? P.lands[idx] : null;
      if (!land || !land.m) {
        noteReject('obtainCrop', 'noCrop', 'sIdx=' + idx + ' 无作物');
        return wrapped('obtainCrop', { eRet: 2 }, { achievement: ach() });
      }
      var nowSec = plantNowSec();
      var st = plantRefreshLand(land, nowSec);
      var out = plantHarvestOf(land.m, st);
      var crop = plantCrop(land.m.id);
      if (!out) {
        noteReject('obtainCrop', 'notMature', 'sIdx=' + idx + ' 阶段 ' + st + ' 无可收产物');
        return wrapped('obtainCrop', { eRet: 2 }, { achievement: ach() });
      }
      var note = { ivch: {}, eqch: {} };
      plantGive(s, out[0], out[1], note);
      P.exp = (parseInt(P.exp, 10) || 0) + (parseInt(crop.exp, 10) || 0);
      delete land.m;
      land.s = 1;
      persist();
      var rewardArray = {};
      rewardArray[String(out[0])] = out[1];
      var v = {
        eRet: 1,
        sIdx: idx,
        exp: P.exp,               // 种植累计经验（客户端写 plantSeedData.plantExp）
        aExp: parseInt(crop.exp, 10) || 0,   // 本次获得（客户端塞 reward[7]）
        rewardArray: rewardArray,
        note: note,
      };
      env.log('obtainCrop 地块 ' + idx + ' 阶段 ' + st + ' 收 ' + out[0] + '×' + out[1]
        + ' 种植经验 ' + v.exp + '（+' + v.aExp + '）');
      return shaped('obtainCrop', v) || wrapped('obtainCrop', v, { achievement: ach() });
    },

    /** 催熟（EXPEDITE_CROP = `User.expediteCrop`）。请求 `{sIdx, num}`（客户端恒 `num:1`，58144）。
     *  ⚠ 回包 `crop` 裸读（57832）。每次 +`details[2].num` 秒（= 86400 = 24 小时，表值）。
     *  **加速免费**（用户 2026-10-27 拍板）：道具 6069 只记不扣，回执申报。 */
    expediteCrop: function (p) {
      p = p || {};
      var s = loadSave();
      var P = plantRead(s);
      var idx = asInt(p.sIdx, -1);
      var land = (P && idx >= 0 && idx < P.lands.length) ? P.lands[idx] : null;
      if (!land || !land.m) {
        noteReject('expediteCrop', 'noCrop', 'sIdx=' + idx + ' 无作物');
        return wrapped('expediteCrop', { eRet: 2 }, { achievement: ach() });   // 2 → getText(1455)
      }
      var num = asInt(p.num, 1);
      if (!(num > 0)) num = 1;
      if (num > 999) num = 999;
      var m = land.m;
      var oldSt = parseInt(m.s, 10) || 0;
      m.c = Math.min(10000, (parseInt(m.c, 10) || 0) + num);
      var st = plantRefreshLand(land, plantNowSec());
      persist();
      var v = { eRet: 1, sIdx: idx, crop: { m: clone(m) } };
      env.log('expediteCrop 地块 ' + idx + ' ×' + num + '（累计 m.c=' + m.c + ' = +'
        + plantBoostSec(m) + 's）阶段 ' + oldSt + '→' + st + '（免费加速）');
      return shaped('expediteCrop', v) || wrapped('expediteCrop', v, { achievement: ach() });
    },

    /** 清枯死（CLEAN_DEAD_CROP = `User.cleanDeadCrop`）。请求 `{sIdx}`（58139）。
     *  回调只有 1 分支、无 else（57811-57824）→ 拒绝一律 2（静默）。
     *  ⚠ 本批**没有枯死模型**（事件不刷、无枯萎计时）：只有"作物 id 不在表里"（坏数据）或
     *    `m.dead===1` 才算枯死。正常流程下这个动作恒 eRet 2 —— 属"结构正确、玩法暂不产生该状态"。 */
    cleanDeadCrop: function (p) {
      p = p || {};
      var s = loadSave();
      var P = plantRead(s);
      var idx = asInt(p.sIdx, -1);
      var land = (P && idx >= 0 && idx < P.lands.length) ? P.lands[idx] : null;
      if (!land || !land.m) {
        noteReject('cleanDeadCrop', 'noCrop', 'sIdx=' + idx + ' 无作物');
        return wrapped('cleanDeadCrop', { eRet: 2 }, { achievement: ach() });
      }
      plantRefreshLand(land, plantNowSec());
      var dead = !plantCrop(land.m.id) || land.m.dead === 1;
      if (!dead) {
        noteReject('cleanDeadCrop', 'notDead', 'sIdx=' + idx + ' 作物 id=' + land.m.id + ' 健在');
        return wrapped('cleanDeadCrop', { eRet: 2 }, { achievement: ach() });
      }
      delete land.m;
      land.s = 1;
      persist();
      env.log('cleanDeadCrop 地块 ' + idx + ' 已清（作物 id 无效或标了 dead）');
      return wrapped('cleanDeadCrop', { eRet: 1, sIdx: idx }, { achievement: ach() });
    },

    /** 驱除家事件（DISPOSS_HOME_EVENT = `User.dispossHomeEvent`）。请求 `{idx}` ＋（好友家时）`{fid}`。
     *  ⚠ 客户端**先看有没有 `crop` 再看 eRet**（57980）→ 成功必须带 `crop`，拒绝绝不能带。 */
    dispossHomeEvent: function (p) {
      p = p || {};
      var s = loadSave();
      var P = plantRead(s);
      var idx = asInt(p.idx, -1);
      if (asInt(p.fid, 0) > 0) {
        noteReject('dispossHomeEvent', 'friendHome', 'idx=' + idx + ' fid=' + p.fid + '（好友家第50批未做）');
        return wrapped('dispossHomeEvent', { eRet: 2 }, { achievement: ach() });
      }
      var land = (P && idx >= 0 && idx < P.lands.length) ? P.lands[idx] : null;
      if (!land || !land.m) {
        noteReject('dispossHomeEvent', 'noCrop', 'idx=' + idx + ' 无作物');
        return wrapped('dispossHomeEvent', { eRet: 2 }, { achievement: ach() });   // 2 → getText(3268)
      }
      var m = land.m;
      if (!(parseInt(m.eid, 10) > 0)) {
        noteReject('dispossHomeEvent', 'noEvent', 'idx=' + idx + ' 作物无事件（本批不刷事件）');
        return wrapped('dispossHomeEvent', { eRet: 2 }, { achievement: ach() });
      }
      var eid = parseInt(m.eid, 10) || 0;
      m.eid = 0;
      delete m.et;
      plantRefreshLand(land, plantNowSec());
      persist();
      var v = { eRet: 1, idx: idx, crop: { m: clone(land.m) }, exp: 0, flag: 0, rewardArray: {} };
      env.log('dispossHomeEvent 地块 ' + idx + ' 清事件 eid=' + eid);
      return shaped('dispossHomeEvent', v) || wrapped('dispossHomeEvent', v, { achievement: ach() });
    },

    /** 一键收获（ONE_KEY_OBTAIN_CROP = `User.onKeyObtainCrop`）。请求 `{matureArr}`（58174-58178）。
     *  ⚠ **`obtainLands` 裸读 `.length` 且逐项当地块号**（57735-57747）→ 缺了直接 TypeError。
     *  空数组是合法结果：客户端弹 69193（"没有可收的"）后 return（57735-57738）。 */
    onKeyObtainCrop: function () {
      var D = plantTables();
      if (!D) {
        noteReject('onKeyObtainCrop', 'noTable', 'BZ_PLANT 缺失');
        return wrapped('onKeyObtainCrop', { eRet: 2 }, { achievement: ach() });
      }
      var s = loadSave();
      var P = plantRead(s);
      var nowSec = plantNowSec();
      var lands = [], rewardArray = {}, aExp = 0, note = { ivch: {}, eqch: {} }, i;
      if (P) {
        for (i = 0; i < P.lands.length; i++) {
          var L = P.lands[i];
          if (!L || !L.m) continue;
          var st = plantRefreshLand(L, nowSec);
          var out = plantHarvestOf(L.m, st);
          if (!out) continue;
          plantGive(s, out[0], out[1], note);
          var crop = plantCrop(L.m.id);
          aExp += (parseInt(crop && crop.exp, 10) || 0);
          rewardArray[String(out[0])] = (parseInt(rewardArray[String(out[0])], 10) || 0) + out[1];
          lands.push(i);
          delete L.m;
          L.s = 1;
        }
      }
      if (lands.length) {
        P.exp = (parseInt(P.exp, 10) || 0) + aExp;
        persist();
      }
      var v = {
        eRet: 1,
        obtainLands: lands,
        matureArr: clone(lands),      // 客户端写 DelegateModel.matureArr（57728-57732，有守卫）
        exp: P ? (parseInt(P.exp, 10) || 0) : 0,
        aExp: aExp,
        rewardArray: rewardArray,
        note: note,
      };
      env.log('onKeyObtainCrop 收 ' + lands.length + ' 块 [' + lands.join(',') + ']'
        + ' 种植经验 +' + aExp + ' → ' + v.exp);
      return shaped('onKeyObtainCrop', v) || wrapped('onKeyObtainCrop', v, { achievement: ach() });
    },

    /** 一键驱除事件（ONE_KEY_DISPOSS_HOME_EVENT = `User.onKeyDispossHomeEvent`，无参，58181）。
     *  ⚠ **`cropMap` 裸读**（57760）→ 必须给对象；空对象是合法结果（客户端弹 6000404 后 return）。 */
    onKeyDispossHomeEvent: function () {
      var s = loadSave();
      var P = plantRead(s);
      var cropMap = {}, n = 0, i;
      if (P) {
        for (i = 0; i < P.lands.length; i++) {
          var L = P.lands[i];
          if (!L || !L.m) continue;
          if (parseInt(L.m.eid, 10) > 0) {
            L.m.eid = 0;
            delete L.m.et;
            n++;
          }
          plantRefreshLand(L, plantNowSec());
          cropMap[String(i)] = { m: clone(L.m) };
        }
        if (n) persist();
      }
      var v = { eRet: 1, cropMap: cropMap, exp: 0, aExp: 0, rewardArray: {}, flag: 0 };
      env.log('onKeyDispossHomeEvent 地块 ' + Object.keys(cropMap).length + ' 块，清事件 ' + n + ' 个');
      return shaped('onKeyDispossHomeEvent', v) || wrapped('onKeyDispossHomeEvent', v, { achievement: ach() });
    },

    /** 偷好友菜（STEAL_CROP_EVENT = `User.stealCrop`）。请求 `{fid, idx}`（58218）。
     *  **档 A 锁**：好友家数据来自 `enterOtherHome`(`User.getFriendHomeList`，第50批，未实现)，
     *  没有好友家的 soilArr 就没有"可偷的菜"可判定 → 一律 eRet 2（客户端 3317 文案，58031-58041）。
     *  等第29/50批（OTHER_PLAYER_HOME / ENTER_OTHER_HOME）落地后在这里放开并补冷却。 */
    stealCrop: function (p) {
      p = p || {};
      noteReject('stealCrop', 'friendHome', 'fid=' + (p && p.fid) + ' idx=' + (p && p.idx)
        + ' 好友家未建模（第50批 enterOtherHome 未做）');
      return wrapped('stealCrop', { eRet: 2 }, { achievement: ach() });
    },

    /** 家园特殊事件奖励（HOME_SPECIAL_AWARD = `User.homeSpeicalAward`，**上游拼写 Speical**）。
     *  ⚠ 本批**必须补**（第29批动作，但它在 C10 的关键路径上）：
     *    `getHomeList` 回调开完面板立刻 `reqHomeSpecialEvent()`（index.js:57614 / 57629）→ 无 handler 时
     *    走 SHAPED 兜底回 `{eRet:1,eid:0,rewardArray:{}}` → 客户端 `productHomeEvent(0, …)` 里
     *    `getItem(0,"home_plant_adventure")` = null 再裸读 `.describe` → **真机 TypeError**
     *    （index.js:95694，2026-10-27 实测：开面板必崩一条）。
     *  家园事件玩法本批不做：非 1 分支客户端只 dispatch REMOVE_SEARCH_HOME_UI（57866），2 静默安全。 */
    homeSpeicalAward: function () {
      noteReject('homeSpeicalAward', 'default', '家园特殊事件未建模（第29批），回 2 避免 productHomeEvent 空表崩溃');
      return wrapped('homeSpeicalAward', { eRet: 2 }, { achievement: ach() });
    },

    /** 家园种子商店货架（GET_BACK_SHOP = `User.getBackShop`，无参，58150）。
     *  入口前置：`HomePlantModel.homeShop > 0 && reqGetSaleShop()`（scripts2.js:48589）→
     *    `homeShop` 来自 `getHomeList` 的 `bShop`（index.js:57597）→ 所以 getHomeList 那边必须发**正数**（本批发 1）。
     *  契约（`scoutT-homeshop.md`）：`shopArr[i]` 是三元组 `[itemId, 类别tag, 单价]`
     *    （scripts2.js:31545 按 [1] 分类、31337 打印 [2]、31343-31344 传 itemId/price）；
     *    不给 `shopArr` 客户端直接弹 getText(3325)（57856）。
     *  口径（用户 2026-10-27 拍板）：**平价**（买价 = 表里 `item.Price`）、**不限购** → 不发 `limit`。 */
    getBackShop: function () {
      var rows = plantShopRows();
      if (!rows.length) {
        noteReject('getBackShop', 'noTable', 'BZ_PLANT.shop 缺失');
        return wrapped('getBackShop', { eRet: 2 }, { achievement: ach() });
      }
      var arr = [], i;
      for (i = 0; i < rows.length; i++) arr.push([rows[i].id, 1, rows[i].price]);
      var v = { eRet: 1, shopArr: arr };
      env.log('getBackShop → 货架 ' + arr.length + ' 行（种子，平价，不限购）');
      return shaped('getBackShop', v) || wrapped('getBackShop', v, { achievement: ach() });
    },

    /** 买种子（BUY_HOME_CROP = `User.BuyHomeCrop`，请求 `{itemID, itemNum}`，58153-58156）。
     *  回调只认 `1 == eRet`（57858-57863）：读 `rewardArray`（`isNullObj` 守卫）弹奖励框、读 `limit`（可缺），
     *    然后 `dispatch(CROP_SALE_SHOP)`（监听器只读 `HomePlantModel.shopSaleLimit`，31505）。**无 else 分支** → 拒绝一律 2。
     *  口径（拍板）：平价扣**银两**；扣钱/发货/落盘在同一个 persist 里（不留半截）。 */
    BuyHomeCrop: function (p) {
      p = p || {};
      var s = loadSave();
      var id = asInt(p.itemID, 0);
      var num = asInt(p.itemNum, 0);
      var price = plantShopPrice(id);
      if (!(price > 0)) {
        noteReject('BuyHomeCrop', 'badItem', 'itemID=' + p.itemID + ' 不在货架（表里没有该种子的 item 行或价格）');
        return wrapped('BuyHomeCrop', { eRet: 2 }, { achievement: ach() });
      }
      if (!(num > 0) || num > 99) {
        noteReject('BuyHomeCrop', 'badNum', 'itemNum=' + p.itemNum);
        return wrapped('BuyHomeCrop', { eRet: 2 }, { achievement: ach() });
      }
      var cost = price * num;
      var coins = parseInt(s.coins, 10) || 0;
      if (coins < cost) {
        noteReject('BuyHomeCrop', 'insufficient', '需 ' + cost + ' 银两，只有 ' + coins);
        return wrapped('BuyHomeCrop', { eRet: 2 }, { achievement: ach() });
      }
      s.coins = coins - cost;
      grantItem(s, id, num);
      persist();
      var rewardArray = {};
      rewardArray[String(id)] = num;
      var note = { ivch: {}, eqch: {}, eco: { coins: s.coins } };
      note.ivch[String(id)] = plantSeedHave(s, id);
      var v = { eRet: 1, rewardArray: rewardArray, note: note };
      env.log('BuyHomeCrop item=' + id + ' ×' + num + ' 花 ' + cost + ' 银两（余 ' + s.coins + '，背包 '
        + note.ivch[String(id)] + '）');
      return shaped('BuyHomeCrop', v) || wrapped('BuyHomeCrop', v, { achievement: ach() });
    },
  };

  /** 账本联动字段：这些答案必须来自玩家自己的存档，不能抄抓包里的旧数字
   *  （抓包快照里 userGold=20，照抄会让客户端以为玩家只有 20 两，买东西弹"银两不足"） */
  var LEDGER_FIELDS = { userGold: 'gold', curGold: 'gold', potential: 'potential' };

  /** 查形状表（tools/gen_shapes.js 生成，按客户端源码里真正会读的字段给形状）
   *  返回 null 表示这张表里没有这个动作 → 继续走通用 ACK */
  function shaped(doName, over) {
    var tbl = (typeof BZ_SHAPES !== 'undefined') ? BZ_SHAPES : null;
    if (!tbl || !tbl[doName]) return null;
    var payload = clone(tbl[doName]);
    var s = loadSave();
    for (var k in LEDGER_FIELDS) {
      if (!LEDGER_FIELDS.hasOwnProperty(k)) continue;
      if (!payload.hasOwnProperty(k)) continue;
      var v = s[LEDGER_FIELDS[k]];
      // 账本没记过这个字段时，必须与 LoadGame 里给客户端的值保持一致（都按"资源给足"处理），
      // 否则会出现「进游戏显示 99999、买东西却说只有 20」的矛盾
      payload[k] = (typeof v === 'number') ? v : 99999;
    }
    if (over) for (var o in over) if (over.hasOwnProperty(o)) payload[o] = over[o];
    return wrapped(doName, payload, { achievement: ach() });
  }

  /** 允许"0 是合法值"的开关字段白名单（SOTA R13 §1 第 1 条）。
   *
   *  `noteBadSwitches` 的通用规则是"开关字段缺席或值合法（非 0/''/false/[]）"，因为绝大多数开关
   *  用的是 `hasOwnProperty` + 真值判断。但 `BeginTraining.isCollective` 恰好相反：
   *  `index.js:120523` 写的是 `if (n.hasOwnProperty("isCollective")) if (0 == n.isCollective) …`
   *  ——**0 本身就是一个语义分支**（关门派练功界面 / 开普通练功 UI），不是"未填"。
   *  所以在这里逐字段豁免，否则每次个人练功都会刷一条假的"开关字段值不合法"。
   *
   *  ⚠ 棘轮：这张表只许减不许增；新增项必须带 `bundle:line` 证据，且要在
   *  `tools\check_reject_codes.js` 的 SWITCH_ZERO 段与回归 `test\r13-reject-codes.js` 里各有一条断言。 */
  var SWITCH_ZERO_OK = {
    BeginTraining: { isCollective: 'index.js:120523' },
  };

  /** R06 第 5 条：开关字段"要么缺席，要么值合法"。**只记录、不删** —— 理由见 HANDOVER §23：
   *  分类器对"经过事件派发 / 再转手一层"的字段仍是盲区（`getChangeShop.shopObj` 被判成开关，
   *  而客户端其实按 key 遍历它），一刀切删掉会让客户端读不到 → 比"发了个 0"更糟。
   *  真正的不合法实例改在各自 handler 里修（`test/r06-medicine-scholar.js` 里有断言兜着）。 */
  function noteBadSwitches(action, res) {
    var tbl = (typeof BZ_SHAPES !== 'undefined') ? BZ_SHAPES : null;
    if (!tbl || !tbl.__switch || !tbl.__switch[action] || !res) return res;
    var inner = res['User.' + action];
    if (!inner || typeof inner !== 'object' || Array.isArray(inner)) return res;
    var zeroOk = SWITCH_ZERO_OK[action] || null;
    var sw = tbl.__switch[action];
    for (var k in sw) {
      if (!sw.hasOwnProperty(k) || sw[k] !== 'switch') continue;
      if (!Object.prototype.hasOwnProperty.call(inner, k)) continue;
      if (zeroOk && zeroOk[k] && inner[k] === 0) continue;   // 0 是合法语义值（见 SWITCH_ZERO_OK）
      var v = inner[k];
      var legal = (v !== null && v !== undefined && v !== 0 && v !== '' && v !== false)
        && !(Object.prototype.toString.call(v) === '[object Array]' && v.length === 0);
      if (!legal) env.log('⚠ 开关字段值不合法（客户端会走错分支）' + action + '.' + k + '=' + JSON.stringify(v));
    }
    return res;
  }

  /** 给手写 handler 的应答"补齐"形状表里的字段（只补缺，不覆盖 handler 自己算的值）
   *  理由：handler 是人写的，容易漏掉客户端其实会读的字段；形状表是照客户端源码抽出来的，
   *  两处一旦不一致，客户端就在读取处抛异常。这里让形状表当"最低契约"。
   *
   *  R05 Q1：**必须能说清每个字段是谁给的**。原来"形状字段必须在应答里"这条自检形同虚设——
   *  它检查的其实是 fillShape 自己的产出（先 handler 后 fillShape），永远为绿（F1 就是这么被掩盖的）。
   *  现在这里把"这次 dispatch 里被 fill 补出来的字段"记进 `_lastFill`，自检据此断言
   *  「补出来的字段不许是开关字段」——provenance 断言，不再自己验自己。 */
  var _lastFill = { action: null, keys: [] };
  function fillShape(action, res) {
    _lastFill = { action: action, keys: [] };
    var tbl = (typeof BZ_SHAPES !== 'undefined') ? BZ_SHAPES : null;
    if (!tbl || !tbl[action] || !res) return res;
    var inner = res['User.' + action];
    if (!inner || typeof inner !== 'object' || Array.isArray(inner)) return res;
    for (var k in tbl[action]) {
      if (!tbl[action].hasOwnProperty(k) || k === '__meta') continue;
      if (!Object.prototype.hasOwnProperty.call(inner, k)) {
        inner[k] = clone(tbl[action][k]);
        _lastFill.keys.push(k);
      }
    }
    return res;
  }

  /** 支付类动作：项目边界上明确不实现（不分发、不伪造任何付费/订单）。
   *  这里必须让客户端看到"失败"，绝不能回 eRet:1 装成充值成功。 */
  var PAY_ACTION_RE = /(Pay|pay|Order|Recharge|IAP|Jetton)/;

  /** 取证用：这几个动作的**请求参数**必须记下来（B01 任务进度建模的全部前提）。
   *  背景：客户端不上报击杀计数，我们只能从"开战/结算"请求里推断，所以要先看清参数长什么样。
   *  见 docs/sota/B01-A04/adopted.md 的下一步 1。 */
  var LOG_REQ_RE = /^(ReqSelfBattleInfo|CheckBattleResult|acceptTask|getFinishTaskAward|killNpc|collect|obtainCrop)$/;

  function dispatch(mod, action, p) {
    p = p || {};
    noteAction(action);
    _currentAction = action;      // 写前语义守卫要知道是谁在改档
    // 饥饿上限学习（R05 F2）：挂机结算族请求会带 `hglmt`（客户端按属性算的真上限，
    // index.js:24729 END_PLAY_GAME / 56272 CHECK_BREAK / 56707 END_DOUBLE_TRAINING）。
    // 只记内存，下一次 persist 落进 save.hungerMax。
    if (p.hglmt !== undefined && p.hglmt !== null) {
      var hm = parseInt(p.hglmt, 10) || 0;
      if (hm > 0 && hm <= HG_MAX_SANE && hm !== _hungerMax) {
        _hungerMax = hm;
        env.log('hungerMax 学到 ' + hm + '（来自 ' + action + ' 的 hglmt）');
      }
    }
    if (LOG_REQ_RE.test(action)) {
      var reqp;
      try { reqp = JSON.stringify(p); } catch (e0) { reqp = '?'; }
      if (reqp && reqp.length > 400) reqp = reqp.slice(0, 400) + '…';
      env.log('REQ ' + action + ' p=' + reqp);
    }
    if (PAY_ACTION_RE.test(action)) {
      // 一次也不放行：不记账、不发货币、不产生订单
      env.log('PAY_BLOCKED ' + mod + '.' + action + ' p=' + JSON.stringify(p).slice(0, 120));
      var blocked = shaped(action) || wrapped(action, { eRet: 4, note: {} }, { achievement: ach() });
      var bi = blocked['User.' + action];
      if (bi && typeof bi === 'object') bi.eRet = 4;   // 4 = 客户端"不可用/失败"分支
      return blocked;
    }
    var h = H[action];
    env.log('dispatch User.' + action);
    if (h) {
      var before = snapshotLedger();
      try {
        var r = noteBadSwitches(action, h(p));
        r = fillShape(action, r);
        r = narrowReject(action, r);              // 拒绝应答收窄（R14 §1 第 1 条）
        try { observeLedger(action, before, r); } catch (e0) {}   // 守卫绝不污染应答
        return r;
      }
      catch (e) {
        // SOTA R14 §1 第 6 条 + R15 §1 第 1/2 条：**异常绝不能变成"成功"，也不能回错码**。
        //   ① 计数（R5c 的探测器）；② 丢掉内存缓存 → 下一次 loadSave() 从盘上重读；
        //   ③ 把权威账本**重推给活客户端**（handler 可能已经走过 RoleBaseInfo 那条第二出口）；
        //   ④ 回该动作**推导出的 catchCode**（推导不出就不回 eRet，绝不默认 4）。
        _catchCount++;
        env.log('处理异常 ' + action + ': ' + e);
        _save = null;
        noteReject(action, 'handlerThrew', String(e).slice(0, 160));
        var reloaded = null;
        try { reloaded = loadSave(); } catch (e2) { reloaded = null; }
        repushLive(reloaded);
        var errCode = catchCodeOf(action);
        if (errCode === undefined) {
          env.log('⚠ catchNoCode ' + action + '（该动作没有登记 catchCode → 不回 eRet，避免让客户端走进错误分支）');
          // ⚠ fillShape 会把形状默认值补进来（含 `eRet:1`）→ 那样又变成"看起来成功"，
          //   所以补完之后必须**显式删掉 eRet**（不能让 fillShape 把我们的决定改回去）。
          var noCode = fillShape(action, wrapped(action, {}, { achievement: ach() }));
          var noCodeInner = noCode['User.' + action];
          if (noCodeInner && typeof noCodeInner === 'object') delete noCodeInner.eRet;
          return noCode;
        }
        return narrowReject(action, fillShape(action, wrapped(action, { eRet: errCode }, { achievement: ach() })));
      }
    }
    // 未手写 handler 的动作：先查形状表，照客户端真会读的字段回（不再只回一句 ACK）
    var sp = shaped(action);
    if (sp) {
      env.log('SHAPED User.' + action + ' p=' + JSON.stringify(p).slice(0, 160));
      return sp;
    }
    // 形状表里也没有：通用成功 ACK（与实测响应同构），保证客户端不卡
    // 但必须大声记录——这条日志就是动作覆盖率待办清单的来源
    env.log('UNKNOWN ' + mod + '.' + action + ' p=' + JSON.stringify(p).slice(0, 240));
    return ack(action, { achievement: ach() });
  }

  /** 信封判定（实测定稿）：入口服 :9898 回 {"MsgData":..}；账号/游戏服回 {"code":200,"MsgData":..}
   *  少了 code 客户端会静默丢弃 —— 因此这里按 URL 而非按动作决定。 */
  function wantsCode(url) {
    var u = String(url || '');
    return u.indexOf('bzgf') >= 0 || u.indexOf('800-server') >= 0 || u.indexOf('900-server') >= 0;
  }

  /** 传输层入口：hex 报文 + URL → { ok, text, action, envelope, ... } */
  function handleRequest(rawBody, url) {
    if (!_codec) return { ok: false, error: 'no-codec', text: '' };
    var plain;
    try {
      plain = _codec.decode(String(rawBody == null ? '' : rawBody).trim());
    } catch (e) {
      env.log('报文解密失败: ' + String(e).slice(0, 80));
      return { ok: false, error: 'decode', text: '' };
    }
    var rpc;
    try { rpc = JSON.parse(plain); } catch (e) { return { ok: false, error: 'json', text: '' }; }
    if (!rpc || !rpc.mod || !rpc.do) return { ok: false, error: 'not-rpc', text: '' };

    var result = dispatch(rpc.mod, rpc.do, rpc.p || {});
    var payload = JSON.stringify(result);
    var withCode = wantsCode(url);
    var envelope = { MsgData: _codec.encode(payload) };
    if (withCode) envelope.code = 200;
    return {
      ok: true,
      action: rpc.mod + '.' + rpc.do,
      envelope: withCode ? 'code' : 'plain',
      payloadBytes: payload.length,
      text: JSON.stringify(envelope),
    };
  }

  /** 清档（保留同一 roleID 语义由调用方决定） */
  function reset() {
    _save = null;
    _readOnly = false;
    _lastGood = null;
    try { env.writeSave(SAVE_KEY, '{}'); } catch (e) {}
    var s = loadSave(); persist();
    return { ok: true, roleID: s.roleID };
  }

  return {
    dispatch: dispatch,
    handleRequest: handleRequest,
    reset: reset,
    loadSave: loadSave,
    ensureRole: ensureRole,
    _internal: {
      handlers: H, SAVE_KEY: SAVE_KEY, wantsCode: wantsCode,
      LATEST_SAVE: LATEST_SAVE, migrateSave: migrateSave, validateSave: validateSave,
      guardSave: guardSave, isReadOnly: function () { return _readOnly; },
      // L4 观察守卫（仅供测试注入：正常游戏流程里由 dispatch 自动调用）
      observeLedger: observeLedger, snapshotLedger: snapshotLedger,
      // R05 Q1 来源断言：最近一次 fillShape 补出来的字段（自检用，别在业务里用）
      lastFill: function () { return { action: _lastFill.action, keys: _lastFill.keys.slice() }; },
      // R14 §4 的 R5c 探测器：handler 抛异常次数（只许在"故意撞异常"的测试里增加）
      catchCount: catchCount,
      // 拒绝码表（构建期与 tools\facts\reject-codes.json 双向比对用）
      rejectCodes: REJECT_CODES, rejectAllow: REJECT_ALLOW,
      rejectStats: function () { return cloneJson(_rejectStats) || {}; },
      consumeStats: function () { return cloneJson(_consumeStats) || {}; },
      catchCodeOf: catchCodeOf,
      rejectUnmodeledItems: REJECT_UNMODELED_ITEMS,
    },
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { createBzServer: createBzServer };
