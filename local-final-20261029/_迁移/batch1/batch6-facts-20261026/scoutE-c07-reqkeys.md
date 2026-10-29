# ScoutE — 第 8 批 C07〔善恶〕动作摘录报告

范围：仅 F:\BaoZouyxt\tools\index.js、F:\BaoZouyxt\tools\scripts2.js、F:\BaoZouyxt\tools\scripts3.js。
方法：grep 定位后 read 小段，逐行摘录原文，不做判断。
检索方式：Select-String（默认大小写不敏感、子串匹配），三文件全量。

---

## EVIL_EVENT → 未定义

1. HttpConst 定义行：未定义。三文件中对 `EVIL_EVENT`（大小写不敏感子串）grep 无任何匹配。
2. 注册点（MessageCenter.on）：未找到（KEY 无定义行，无 `HttpConst.EVIL_EVENT` 前缀可反查）。
3. 请求点（sendRequest/sendReqWithMask）：未找到（同上）。
4. 应答消费回调读取字段：未找到（同上）。

## GOOD_EVENT → 未定义

1. HttpConst 定义行：未定义。三文件中对 `GOOD_EVENT`（大小写不敏感子串）grep 无任何匹配。
2. 注册点：未找到（KEY 无定义行，无前缀可反查）。
3. 请求点：未找到（同上）。
4. 应答消费回调读取字段：未找到（同上）。

## GOOD_AND_EVIL_AWARD → 未定义

1. HttpConst 定义行：未定义。三文件中对 `GOOD_AND_EVIL_AWARD`（大小写不敏感子串）grep 无任何匹配。
2. 注册点：未找到（KEY 无定义行，无前缀可反查）。
3. 请求点：未找到（同上）。
4. 应答消费回调读取字段：未找到（同上）。

## GOOD_AND_EVIL_SHOP → 线上名两条：`GET_GOOD_AND_EVIL_SHOP_DATA: "User.getGoodAndEvilShopData"`、`BUY_GOOD_AND_EVIL_SHOP_ITEM: "User.buyGoodAndEvilShopItem"`

（注：工单 KEY 名 `GOOD_AND_EVIL_SHOP` 本身无单独定义行；三文件中含该子串的 HttpConst 常量仅上述两条，以下按两条分别摘录。）

1. HttpConst 定义行：
   - index.js:60444 `GET_GOOD_AND_EVIL_SHOP_DATA: "User.getGoodAndEvilShopData",`
   - index.js:60445 `BUY_GOOD_AND_EVIL_SHOP_ITEM: "User.buyGoodAndEvilShopItem",`

2. 注册点（MessageCenter.on）：
   - scripts3.js:36358 `p.MessageCenter.on(c.HttpConst.GET_GOOD_AND_EVIL_SHOP_DATA, this.onGetShopData, this);`
   - scripts3.js:36359 `p.MessageCenter.on(c.HttpConst.BUY_GOOD_AND_EVIL_SHOP_ITEM, this.onBuy, this);`

3. 请求点：
   - scripts3.js:36510-36515（参数对象字面量在原文内）：
     ```
     t.prototype.buy = function(t, e) {
         l.NetMgr.http.sendRequest(c.HttpConst.BUY_GOOD_AND_EVIL_SHOP_ITEM, {
             id: t,
             itemNum: e
         });
     };
     ```
   - scripts3.js:36524-36526（无参数）：
     ```
     t.prototype.getShopData = function() {
         l.NetMgr.http.sendRequest(c.HttpConst.GET_GOOD_AND_EVIL_SHOP_DATA);
     };
     ```
   - 请求参数对象字面量字段：BUY 请求为 `{ id: t, itemNum: e }`（scripts3.js:36512-36513）；GET 请求无参数（scripts3.js:36525）。两处均为内联字面量，非外部变量。

4. 应答消费回调读取字段：
   - 回调一 `onBuy`（注册于 scripts3.js:36359），原文 scripts3.js:36516-36523：
     ```
     t.prototype.onBuy = function(t, e) {
         if (1 == e.eRet) {
             this.refreshShopData(e);
             a.RoleBaseInfo.goodEvilContribution = e.contribution;
             m.default.addShowRewardUI1(e.rewardArray);
             p.MessageCenter.dispatch(u.EvName.GOOD_EVIL_REFRESH_SHOP, e.id);
         }
     };
     ```
     读取字段（逐行）：
     - scripts3.js:36517 `e.eRet`
     - scripts3.js:36518 `this.refreshShopData(e)`（内部读取见下）
     - scripts3.js:36519 `e.contribution`
     - scripts3.js:36520 `e.rewardArray`
     - scripts3.js:36521 `e.id`
   - `refreshShopData`（被 onBuy 调用），原文 scripts3.js:36504-36509：
     ```
     t.prototype.refreshShopData = function(t) {
         for (var e = 0; e < this.shopData.length; e++) if (this.shopData[e].id == t.id) {
             this.shopData[e].buyCount = t.buyCount;
             break;
         }
     };
     ```
     读取字段：scripts3.js:36505 `t.id`；scripts3.js:36506 `t.buyCount`。
   - 回调二 `onGetShopData`（注册于 scripts3.js:36358），原文 scripts3.js:36527-36540：
     ```
     t.prototype.onGetShopData = function(t, e) {
         if (1 == e.eRet) {
             this.shopData = e.shop;
             this.shopRefreshTime = e.nextRefreshTime;
             h.default.common.load("ui/ge/ge_store", cc.SpriteAtlas, function(t, e) {
                 e.addRef();
                 h.default.prefabs.load("goodEvil/goodEvilShop/GoodEvilShopUI", cc.Prefab, function(t, o) {
                     var s = cc.instantiate(o);
                     s.getComponent("GoodEvilShopUI").setData(e);
                     i.PopUpMgr.addPopUp(s, d.LayerMgr.popUpLayer);
                 });
             });
         }
     };
     ```
     读取字段（逐行）：
     - scripts3.js:36528 `e.eRet`
     - scripts3.js:36529 `e.shop`
     - scripts3.js:36530 `e.nextRefreshTime`
     - scripts3.js:36535 `s.getComponent("GoodEvilShopUI").setData(e)`（整个应答对象 `e` 原样传入 GoodEvilShopUI.setData）

## GOOD_AND_EVIL_RESULT → 未定义

1. HttpConst 定义行：未定义。三文件中对 `GOOD_AND_EVIL_RESULT`（大小写不敏感子串）grep 无任何匹配。
2. 注册点：未找到（KEY 无定义行，无前缀可反查）。
3. 请求点：未找到（同上）。
4. 应答消费回调读取字段：未找到（同上）。

## EVIL_CHANGE → 未定义

1. HttpConst 定义行：未定义。三文件中对 `EVIL_CHANGE`（大小写不敏感子串）grep 无任何匹配。
2. 注册点：未找到（KEY 无定义行，无前缀可反查）。
3. 请求点：未找到（同上）。
4. 应答消费回调读取字段：未找到（同上）。

## GOOD_CHANGE → 未定义

1. HttpConst 定义行：未定义。三文件中对 `GOOD_CHANGE`（大小写不敏感子串）grep 无任何匹配。
2. 注册点：未找到（KEY 无定义行，无前缀可反查）。
3. 请求点：未找到（同上）。
4. 应答消费回调读取字段：未找到（同上）。

## GOODS_REFRESH → 未定义

1. HttpConst 定义行：未定义。三文件中对 `GOODS_REFRESH` 及 `GoodsRefresh`、`goodsRefresh`（均大小写不敏感）grep 无任何匹配。
2. 注册点：未找到（KEY 无定义行，无前缀可反查）。
3. 请求点：未找到（同上）。
4. 应答消费回调读取字段：未找到（同上）。

## EVIL_BOSS → 未定义

1. HttpConst 定义行：未定义。三文件中对 `EVIL_BOSS` 及 `EvilBoss`（均大小写不敏感）grep 无任何匹配。
2. 注册点：未找到（KEY 无定义行，无前缀可反查）。
3. 请求点：未找到（同上）。
4. 应答消费回调读取字段：未找到（同上）。

## GOOD_MONSTER → 未定义

1. HttpConst 定义行：未定义。三文件中对 `GOOD_MONSTER` 及 `GoodMonster`（均大小写不敏感）grep 无任何匹配。
2. 注册点：未找到（KEY 无定义行，无前缀可反查）。
3. 请求点：未找到（同上）。
4. 应答消费回调读取字段：未找到（同上）。

## DONATE → 未定义

1. HttpConst 定义行：未定义。三文件中对 `DONATE`、`Donate`、`donate`（均大小写不敏感）grep 无任何匹配。
2. 注册点：未找到（KEY 无定义行，无前缀可反查）。
3. 请求点：未找到（同上）。
4. 应答消费回调读取字段：未找到（同上）。

---

## 未能验证

- 工单 11 个 KEY 中 10 个（EVIL_EVENT、GOOD_EVENT、GOOD_AND_EVIL_AWARD、GOOD_AND_EVIL_RESULT、EVIL_CHANGE、GOOD_CHANGE、GOODS_REFRESH、EVIL_BOSS、GOOD_MONSTER、DONATE）在本工单指定的三个文件内均未 grep 到任何定义行或引用，其线上名、注册点、请求点、消费字段均未能验证。
- 工单 KEY 名 `GOOD_AND_EVIL_SHOP` 本身无单独 HttpConst 定义行；以上按含该子串的两条常量（GET_GOOD_AND_EVIL_SHOP_DATA / BUY_GOOD_AND_EVIL_SHOP_ITEM）摘录，两者是否即工单所指动作，未能验证。
- 工单提示字段 `note.attrch`、`note.skch` 在三文件中有匹配位置（index.js:59571、59580、64757-64758、64779-64781、138892；scripts3.js:23575、72044、73899、73924、73950-73951、73968-73970），但这些位置与上述 11 个 KEY 的应答消费回调之间的关联未能验证（未在这些回调原文中读到 attrch/skch）。
- 三个文件之外是否存在这些 KEY 的定义，未在工单范围内，未能验证。

## 范围外产出

- index.js:60433-60451 存在一组善恶相关 HttpConst 定义行（工单 KEY 清单之外，仅记录位置与原文，不分析）：
  - index.js:60433 `JOIN_GOOD_OR_EVIL: "User.joinGoodOrEvil",`
  - index.js:60434 `GET_GOOD_AND_EVIL_TASK_DATA: "User.getGoodAndEvilTaskData",`
  - index.js:60435 `REFRESH_GOOD_AND_EVIL_TASK_DATA: "User.refreshGoodAndEvilTaskData",`
  - index.js:60436 `GET_GOOD_AND_EVIL_NOTE_DATA: "User.getGoodAndEvilNoteData",`
  - index.js:60437 `RECEIVE_TARGET_TASK: "User.receiveTargetTask",`
  - index.js:60438 `GOOD_AND_EVIL_BATTLE_RESULT: "User.goodAndEvilBattleResult",`
  - index.js:60439 `GET_GOOD_AND_EVIL_NPC_DATA: "User.getGoodAndEvilNpcData",`
  - index.js:60440 `REFRESH_GOOD_AND_EVIL_NPC_DATA: "User.refreshGoodAndEvilNpcData",`
  - index.js:60441 `RECEIVE_NPC_TARGET_TASK: "User.receiveNPCTargetTask",`
  - index.js:60442 `BUY_TARGET_TASK_NUM: "User.buyTargetTaskNum",`
  - index.js:60443 `CHECK_TARGET_TASK: "User.checkTargetTask",`
  - index.js:60446 `GET_GOOD_AND_EVIL_RANK_DATA: "User.getGoodAndEvilRankData",`
  - index.js:60447 `HELP_DONE_TASK: "User.helpDoneTask",`
  - index.js:60448 `GET_GE_HELP_INFO: "User.getGeHelpInfo",`
  - index.js:60449 `GET_GOOD_AND_EVIL_DATA: "User.getGoodAndEvilData",`
  - index.js:60450 `GET_GOOD_AND_EVIL_RETIRE_LIST: "User.getGoodAndEvilRetireList",`
  - index.js:60451 `GET_GOOD_AND_EVIL_RETIRE_DATA: "User.getGoodAndEvilRetireData",`
- index.js:111845、111848 存在 `goodAndEvilData` 字段读取（工单 KEY 清单之外，仅记录位置）；scripts3.js:36573-36584（`onNpcFightEnd`，消费 `e.goodAndEvilData.prestige / .contribution / .addScore`）与 scripts3.js:36476-36482（`onGetData`）为上述范围外常量的消费回调位置，仅记录。
- scripts3.js:36346-36365 为该善恶模块完整的 MessageCenter.on 注册块（工单 KEY 清单之外的部分仅记录位置）。
- 范围外产出之外无其他文件改动：本报告仅新建本文件，未改动任何既有文件。
