// ===== 第 1 批「商店交易」：最终实现版（2026-10-24，含 getAlchemyData 崩溃修复）=====
// 这是从 hotfix-patch/core/bz-rpc-server.js 的 var H = { 里原样摘出的 handler（已构建、已过验收、已推送到模拟器）。
// 与 02-handlers.js（上游模板）的差异见 交付说明.md。新增 getAlchemyData 真货架（formula 表 type1/2 共 95 条）。
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
      var st = (s.achieve && typeof s.achieve === 'object') ? s.achieve : {};
      // groupPoints 必须**含全部组 id**：checkGroupOpen = `gPoints.hasOwnProperty(组id)`（scripts3.js:3045），
      // 空对象 → getGroupIdArray 返回空 → 面板零条目（2026-10-22 实测"成就空白"）。
      var gp = (st.groupPoints && typeof st.groupPoints === 'object') ? st.groupPoints : {};
      var gids = (typeof BZ_ACHIEVE_GROUPS !== 'undefined' && BZ_ACHIEVE_GROUPS) || [];
      for (var gi = 0; gi < gids.length; gi++) {
        if (!Object.prototype.hasOwnProperty.call(gp, gids[gi])) gp[gids[gi]] = 0;
      }
      return wrapped('getAchieveData', {
        eRet: 1,
        groupPoints: gp,
        rateIds: Array.isArray(st.rateIds) ? st.rateIds : [],
        achieveIdArr: Array.isArray(st.pending) ? st.pending : [],
        rd: Array.isArray(st.received) ? st.received : [],
        taskData: (st.taskData && typeof st.taskData === 'object') ? st.taskData : {},
        srd: (st.suitIds && typeof st.suitIds === 'object') ? st.suitIds : {},
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
          grantItem(s, gid, gn);
          if (itemTypeOf(gid) === 1) payload.note.eqch[gid] = [1, s.playerEquip[gid]];
          else payload.note.ivch[gid] = parseInt(s.bag[gid], 10) || 0;
          env.log('BuyMarketItem ' + id + ' → ' + gid + '×' + gn + '，扣 ' + cost + ' 金条，余 ' + s.gold);
        }
      }
      persist();
      return wrapped('BuyMarketItem', payload, { achievement: ach() });
    },

    /** 坐骑：`User.BuyMount {moutsID, type}`（send index.js:32178-32185；字段名原文就是 moutsID）。
     *  消费端（32141-32173）：应答的 i.type 决定分支（所以必须**回显**请求的 type）——
     *  type!=1 购买分支：1==eRet 成功、3==eRet 弹 getText(1000)；type==1 展示分支：只读 i.sync。
     *  表 mount：price=铜钱价（样例 1001→500）。坐骑账本 s.mounts={id:1}、展示位 s.mountShow
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
      if (!(cost > 0) || !(s.coins >= cost)) {
        env.log('BuyMount ' + mid + ' 拒绝：需 ' + cost + ' 铜钱，只有 ' + s.coins);
        return wrapped('BuyMount', { eRet: 3, note: {} }, { achievement: ach() });   // 3 → 客户端弹 getText(1000)
      }
      s.coins -= cost;
      s.mounts = s.mounts || {};
      s.mounts[String(mid)] = 1;
      s.mountShow = mid;
      persist();
      env.log('BuyMount ' + mid + ' → 扣 ' + cost + ' 铜钱，已拥有 ' + Object.keys(s.mounts).length + ' 匹');
      return wrapped('BuyMount', { eRet: 1, type: type, sync: 0, note: { eco: { coins: s.coins } } }, { achievement: ach() });
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
