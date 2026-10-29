| 键 | 线上名 | 定义行 | 发送点行 | 回调行 | 请求载荷键 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| REWARD_UFO_CATCHER_TASK | User.rewardUFOCatcherTask | tools/index.js:60250 | tools/scripts3.js:25872 | tools/scripts3.js:25728 | coinDailyId |
| GET_UFO_CATCHER_TASK | User.getUFOCatcherTask | tools/index.js:60249 | tools/scripts3.js:25869 | tools/scripts3.js:25738 | 无（无参数） |
| BUY_UFO_GAME_COIN | User.buyUFOGameCoin | tools/index.js:60255 | tools/scripts3.js:25854 | tools/scripts3.js:25748 | num |
| REWARD_UFO | User.rewardUFO | tools/index.js:60254 | tools/scripts3.js:25862 | tools/scripts3.js:25755 | packages, itemId, signCode |
| USE_UFO_REFRESH | User.useUFOrefresh | tools/index.js:60253 | tools/scripts3.js:25877 | tools/scripts3.js:25770 | 无（无参数） |
| GET_UFO_CATCHER_DATA | User.getUFOCatcherData | tools/index.js:60251 | tools/scripts3.js:25880 | tools/scripts3.js:25783 | 无（无参数） |
| BUY_UFO_REFRESH_TIMES | User.buyUFORefreshTimes | tools/index.js:60252 | tools/scripts3.js:25849 | tools/scripts3.js:25802 | num |

## REWARD_UFO_CATCHER_TASK
 - 载荷：coinDailyId | tools/scripts3.js:25872-25874 | `g.NetMgr.http.sendRequest(a.HttpConst.REWARD_UFO_CATCHER_TASK, { coinDailyId: t });`
 - 回包读点：eRet | tools/scripts3.js:25729 | `if (1 == o.eRet) {` | 无
 - 回包读点：rewardLimitDaily | tools/scripts3.js:25730 | `o.hasOwnProperty("rewardLimitDaily") && (t.rewardLimitDaily = o.rewardLimitDaily);` | 有（hasOwnProperty）
 - 回包读点：coinDailyList | tools/scripts3.js:25731 | `o.hasOwnProperty("coinDailyList") && r.MessageCenter.on(c.EvName.UPDATE_DOLL_TASK, o.coinDailyList);` | 有（hasOwnProperty）
 - 回包读点：rewardArray | tools/scripts3.js:25732 | `o.hasOwnProperty("rewardArray") && p.default.addShowRewardUI1(o.rewardArray, 0, {});` | 有（hasOwnProperty）
 - eRet 非1分支：tools/scripts3.js:25733-25735 | `} else if (3 == o.eRet) { l.ActiveModel.outTimeActive(37); h.default.show(i.getText(1093)); }`
 - 未找到项：`grep(25728-25737)` + 0

## GET_UFO_CATCHER_TASK
 - 载荷：无 | tools/scripts3.js:25869 | `g.NetMgr.http.sendRequest(a.HttpConst.GET_UFO_CATCHER_TASK);`
 - 回包读点：eRet | tools/scripts3.js:25739 | `if (1 == o.eRet) {` | 无
 - 回包读点：rewardLimitDaily | tools/scripts3.js:25740 | `o.hasOwnProperty("rewardLimitDaily") && (t.rewardLimitDaily = o.rewardLimitDaily);` | 有（hasOwnProperty）
 - 回包读点：coinDailyList | tools/scripts3.js:25741 | `o.hasOwnProperty("coinDailyList") && r.MessageCenter.dispatch(c.EvName.UPDATE_DOLL_TASK, o.coinDailyList);` | 有（hasOwnProperty）
 - 回包读点：rewardArray | tools/scripts3.js:25742 | `o.hasOwnProperty("rewardArray") && p.default.addShowRewardUI1(o.rewardArray, 0, {});` | 有（hasOwnProperty）
 - eRet 非1分支：tools/scripts3.js:25743-25745 | `} else if (3 == o.eRet) { l.ActiveModel.outTimeActive(37); h.default.show(i.getText(1093)); }`
 - 未找到项：`grep(25738-25747)` + 0

## BUY_UFO_GAME_COIN
 - 载荷：num | tools/scripts3.js:25854-25856 | `g.NetMgr.http.sendRequest(a.HttpConst.BUY_UFO_GAME_COIN, { num: t });`
 - 回包读点：eRet | tools/scripts3.js:25749 | `if (1 == o.eRet) {` | 无
 - 回包读点：buyCoinCount | tools/scripts3.js:25750 | `o.hasOwnProperty("buyCoinCount") && (t.buyCoinCount = o.buyCoinCount);` | 有（hasOwnProperty）
 - 回包读点：rewardArray | tools/scripts3.js:25751 | `o.hasOwnProperty("rewardArray") && p.default.addShowRewardUI1(o.rewardArray, 0, {});` | 有（hasOwnProperty）
 - eRet 非1分支：无
 - 未找到项：`grep(25748-25754, eRet != 1)` + 0

## REWARD_UFO
 - 载荷：packages, itemId, signCode | tools/scripts3.js:25862-25866 | `g.NetMgr.http.sendRequest(a.HttpConst.REWARD_UFO, { packages: t, itemId: i, signCode: n.md5((2 * this.signId + 37).toString()) });`
 - 回包读点：signId | tools/scripts3.js:25756 | `o.hasOwnProperty("signId") && (t.signId = o.signId);` | 有（hasOwnProperty）
 - 回包读点：eRet | tools/scripts3.js:25757 | `if (1 == o.eRet) {` | 无
 - 回包读点：rewardArray | tools/scripts3.js:25758 | `o.hasOwnProperty("rewardArray") && p.default.addShowRewardUI1(o.rewardArray, 0, {});` | 有（hasOwnProperty）
 - 回包读点：autoRefresh | tools/scripts3.js:25761 | `if (o.hasOwnProperty("autoRefresh")) {` | 有（hasOwnProperty）
 - 回包读点：rewardPool | tools/scripts3.js:25762 | `t.initItems(o.rewardPool);` | 无
 - eRet 非1分支：tools/scripts3.js:25765-25768 | `} else { 15 == o.eRet && h.default.show(i.getText(8060)); r.MessageCenter.dispatch(c.EvName.CATCH_DOLL_EVENT, null); }`
 - 未找到项：`grep(25755-25769)` + 0

## USE_UFO_REFRESH
 - 载荷：无 | tools/scripts3.js:25877 | `g.NetMgr.http.sendRequest(a.HttpConst.USE_UFO_REFRESH);`
 - 回包读点：eRet | tools/scripts3.js:25771 | `if (1 == o.eRet) {` | 无
 - 回包读点：rewardPool | tools/scripts3.js:25772 | `o.hasOwnProperty("rewardPool") && t.initItems(o.rewardPool);` | 有（hasOwnProperty）
 - 回包读点：refreshTimes | tools/scripts3.js:25773 | `o.hasOwnProperty("refreshTimes") && (t.refreshTimes = o.refreshTimes);` | 有（hasOwnProperty）
 - 回包读点：freeRefreshTimes | tools/scripts3.js:25774 | `o.hasOwnProperty("freeRefreshTimes") && (t.freeRefreshTimes = o.freeRefreshTimes);` | 有（hasOwnProperty）
 - 回包读点：buyRefreshTimes | tools/scripts3.js:25775 | `o.hasOwnProperty("buyRefreshTimes") && (t.buyRefreshTimes = o.buyRefreshTimes);` | 有（hasOwnProperty）
 - 回包读点：signId | tools/scripts3.js:25776 | `o.hasOwnProperty("signId") && (t.signId = o.signId);` | 有（hasOwnProperty）
 - eRet 非1分支：tools/scripts3.js:25778-25780 | `} else if (3 == o.eRet) { l.ActiveModel.outTimeActive(37); h.default.show(i.getText(1093)); }`
 - eRet 非1分支：tools/scripts3.js:25781 | `} else 6 == o.eRet && h.default.show(i.getText(8060));`
 - 未找到项：`grep(25770-25782)` + 0

## GET_UFO_CATCHER_DATA
 - 载荷：无 | tools/scripts3.js:25880 | `g.NetMgr.http.sendRequest(a.HttpConst.GET_UFO_CATCHER_DATA);`
 - 回包读点：eRet | tools/scripts3.js:25784 | `if (1 == o.eRet) {` | 无
 - 回包读点：rewardPool | tools/scripts3.js:25785 | `o.hasOwnProperty("rewardPool") && t.initItems(o.rewardPool);` | 有（hasOwnProperty）
 - 回包读点：refreshTimes | tools/scripts3.js:25786 | `o.hasOwnProperty("refreshTimes") && (t.refreshTimes = o.refreshTimes);` | 有（hasOwnProperty）
 - 回包读点：freeRefreshTimes | tools/scripts3.js:25787 | `o.hasOwnProperty("freeRefreshTimes") && (t.freeRefreshTimes = o.freeRefreshTimes);` | 有（hasOwnProperty）
 - 回包读点：buyRefreshTimes | tools/scripts3.js:25788 | `o.hasOwnProperty("buyRefreshTimes") && (t.buyRefreshTimes = o.buyRefreshTimes);` | 有（hasOwnProperty）
 - 回包读点：buyCoinCount | tools/scripts3.js:25789 | `o.hasOwnProperty("buyCoinCount") && (t.buyCoinCount = o.buyCoinCount);` | 有（hasOwnProperty）
 - 回包读点：signId | tools/scripts3.js:25790 | `o.hasOwnProperty("signId") && (t.signId = o.signId);` | 有（hasOwnProperty）
 - 回包读点：o (全部回包对象) | tools/scripts3.js:25794 | `i.addComponent("DollUI").setData(o);` | 无
 - eRet 非1分支：tools/scripts3.js:25797-25800 | `if (3 == o.eRet) { l.ActiveModel.outTimeActive(37); h.default.show(i.getText(1093)); }`
 - 未找到项：`grep(25783-25801)` + 0

## BUY_UFO_REFRESH_TIMES
 - 载荷：num | tools/scripts3.js:25849-25851 | `g.NetMgr.http.sendRequest(a.HttpConst.BUY_UFO_REFRESH_TIMES, { num: 1 });`
 - 回包读点：eRet | tools/scripts3.js:25803 | `if (1 == o.eRet) {` | 无
 - 回包读点：refreshTimes | tools/scripts3.js:25804 | `o.hasOwnProperty("refreshTimes") && (t.refreshTimes = o.refreshTimes);` | 有（hasOwnProperty）
 - 回包读点：freeRefreshTimes | tools/scripts3.js:25805 | `o.hasOwnProperty("freeRefreshTimes") && (t.freeRefreshTimes = o.freeRefreshTimes);` | 有（hasOwnProperty）
 - 回包读点：buyRefreshTimes | tools/scripts3.js:25806 | `o.hasOwnProperty("buyRefreshTimes") && (t.buyRefreshTimes = o.buyRefreshTimes);` | 有（hasOwnProperty）
 - eRet 非1分支：tools/scripts3.js:25809 | `if (7 == o.eRet) h.default.show(i.getText(8060));`
 - eRet 非1分支：tools/scripts3.js:25809-25812 | `else if (5 == o.eRet) { var s = i.getText(3633); h.default.show(s); }`
 - eRet 非1分支：tools/scripts3.js:25812-25815 | `else if (6 == o.eRet) { s = i.getText(3633); h.default.show(s); }`
 - eRet 非1分支：tools/scripts3.js:25815-25818 | `else if (3 == o.eRet) { l.ActiveModel.outTimeActive(37); h.default.show(i.getText(1093)); }`
 - 未找到项：`grep(25802-25819)` + 0

未验证段：无
范围外产出：无
