| 键 | 线上名 | 定义行 | 发送点行 | 回调行 | 请求载荷键 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| GET_UFO_CATCHER_DATA | User.getUFOCatcherData | tools/index.js:60251 | tools/scripts3.js:25880 | tools/scripts3.js:25783 | （无载荷） |
| GET_UFO_CATCHER_TASK | User.getUFOCatcherTask | tools/index.js:60249 | tools/scripts3.js:25869 | tools/scripts3.js:25738 | （无载荷） |
| USE_UFO_REFRESH | User.useUFOrefresh | tools/index.js:60253 | tools/scripts3.js:25877 | tools/scripts3.js:25770 | （无载荷） |
| BUY_UFO_REFRESH_TIMES | User.buyUFORefreshTimes | tools/index.js:60252 | tools/scripts3.js:25849 | tools/scripts3.js:25802 | num |
| REWARD_UFO | User.rewardUFO | tools/index.js:60254 | tools/scripts3.js:25862-25866 | tools/scripts3.js:25755 | packages, itemId, signCode |
| REWARD_UFO_CATCHER_TASK | User.rewardUFOCatcherTask | tools/index.js:60250 | tools/scripts3.js:25872-25874 | tools/scripts3.js:25728 | coinDailyId |
| BUY_UFO_GAME_COIN | User.buyUFOGameCoin | tools/index.js:60255 | tools/scripts3.js:25854-25856 | tools/scripts3.js:25748 | num |

## GET_UFO_CATCHER_DATA
 - 载荷：无载荷 | tools/scripts3.js:25880 | `g.NetMgr.http.sendRequest(a.HttpConst.GET_UFO_CATCHER_DATA);`
 - 回包读点：
rewardPool | tools/scripts3.js:25785 | `o.hasOwnProperty("rewardPool") && t.initItems(o.rewardPool);` | 有（hasOwnProperty）
refreshTimes | tools/scripts3.js:25786 | `o.hasOwnProperty("refreshTimes") && (t.refreshTimes = o.refreshTimes);` | 有（hasOwnProperty）
freeRefreshTimes | tools/scripts3.js:25787 | `o.hasOwnProperty("freeRefreshTimes") && (t.freeRefreshTimes = o.freeRefreshTimes);` | 有（hasOwnProperty）
buyRefreshTimes | tools/scripts3.js:25788 | `o.hasOwnProperty("buyRefreshTimes") && (t.buyRefreshTimes = o.buyRefreshTimes);` | 有（hasOwnProperty）
buyCoinCount | tools/scripts3.js:25789 | `o.hasOwnProperty("buyCoinCount") && (t.buyCoinCount = o.buyCoinCount);` | 有（hasOwnProperty）
signId | tools/scripts3.js:25790 | `o.hasOwnProperty("signId") && (t.signId = o.signId);` | 有（hasOwnProperty）
 - eRet 非1分支：tools/scripts3.js:25797-25800 | `if (3 == o.eRet) { l.ActiveModel.outTimeActive(37); h.default.show(i.getText(1093)); }`
 - 未找到项：检索式 无 + 命中数 0

## GET_UFO_CATCHER_TASK
 - 载荷：无载荷 | tools/scripts3.js:25869 | `g.NetMgr.http.sendRequest(a.HttpConst.GET_UFO_CATCHER_TASK);`
 - 回包读点：
rewardLimitDaily | tools/scripts3.js:25740 | `o.hasOwnProperty("rewardLimitDaily") && (t.rewardLimitDaily = o.rewardLimitDaily);` | 有（hasOwnProperty）
coinDailyList | tools/scripts3.js:25741 | `o.hasOwnProperty("coinDailyList") && r.MessageCenter.dispatch(c.EvName.UPDATE_DOLL_TASK, o.coinDailyList);` | 有（hasOwnProperty）
rewardArray | tools/scripts3.js:25742 | `o.hasOwnProperty("rewardArray") && p.default.addShowRewardUI1(o.rewardArray, 0, {});` | 有（hasOwnProperty）
 - eRet 非1分支：tools/scripts3.js:25743-25746 | `} else if (3 == o.eRet) { l.ActiveModel.outTimeActive(37); h.default.show(i.getText(1093)); }`
 - 未找到项：检索式 无 + 命中数 0

## USE_UFO_REFRESH
 - 载荷：无载荷 | tools/scripts3.js:25877 | `g.NetMgr.http.sendRequest(a.HttpConst.USE_UFO_REFRESH);`
 - 回包读点：
rewardPool | tools/scripts3.js:25772 | `o.hasOwnProperty("rewardPool") && t.initItems(o.rewardPool);` | 有（hasOwnProperty）
refreshTimes | tools/scripts3.js:25773 | `o.hasOwnProperty("refreshTimes") && (t.refreshTimes = o.refreshTimes);` | 有（hasOwnProperty）
freeRefreshTimes | tools/scripts3.js:25774 | `o.hasOwnProperty("freeRefreshTimes") && (t.freeRefreshTimes = o.freeRefreshTimes);` | 有（hasOwnProperty）
buyRefreshTimes | tools/scripts3.js:25775 | `o.hasOwnProperty("buyRefreshTimes") && (t.buyRefreshTimes = o.buyRefreshTimes);` | 有（hasOwnProperty）
signId | tools/scripts3.js:25776 | `o.hasOwnProperty("signId") && (t.signId = o.signId);` | 有（hasOwnProperty）
 - eRet 非1分支：tools/scripts3.js:25778-25781 | `} else if (3 == o.eRet) { l.ActiveModel.outTimeActive(37); h.default.show(i.getText(1093)); } else 6 == o.eRet && h.default.show(i.getText(8060));`
 - 未找到项：检索式 无 + 命中数 0

## BUY_UFO_REFRESH_TIMES
 - 载荷：num（常数1） | tools/scripts3.js:25849-25851 | `g.NetMgr.http.sendRequest(a.HttpConst.BUY_UFO_REFRESH_TIMES, {\nnum: 1\n});`
 - 回包读点：
refreshTimes | tools/scripts3.js:25804 | `o.hasOwnProperty("refreshTimes") && (t.refreshTimes = o.refreshTimes);` | 有（hasOwnProperty）
freeRefreshTimes | tools/scripts3.js:25805 | `o.hasOwnProperty("freeRefreshTimes") && (t.freeRefreshTimes = o.freeRefreshTimes);` | 有（hasOwnProperty）
buyRefreshTimes | tools/scripts3.js:25806 | `o.hasOwnProperty("buyRefreshTimes") && (t.buyRefreshTimes = o.buyRefreshTimes);` | 有（hasOwnProperty）
 - eRet 非1分支：tools/scripts3.js:25809-25818 | `if (7 == o.eRet) h.default.show(i.getText(8060)); else if (5 == o.eRet) { var s = i.getText(3633); h.default.show(s); } else if (6 == o.eRet) { s = i.getText(3633); h.default.show(s); } else if (3 == o.eRet) { l.ActiveModel.outTimeActive(37); h.default.show(i.getText(1093)); }`
 - 未找到项：检索式 无 + 命中数 0

## REWARD_UFO
 - 载荷：packages（来自参数t）, itemId（来自分支计算i:8117/8119/8120）, signCode（来自模型字段this.signId计算MD5） | tools/scripts3.js:25862-25866 | `g.NetMgr.http.sendRequest(a.HttpConst.REWARD_UFO, {\npackages: t,\nitemId: i,\nsignCode: n.md5((2 * this.signId + 37).toString())\n});`
 - 回包读点：
signId | tools/scripts3.js:25756 | `o.hasOwnProperty("signId") && (t.signId = o.signId);` | 有（hasOwnProperty）
rewardArray | tools/scripts3.js:25758 | `o.hasOwnProperty("rewardArray") && p.default.addShowRewardUI1(o.rewardArray, 0, {});` | 有（hasOwnProperty）
autoRefresh | tools/scripts3.js:25761 | `if (o.hasOwnProperty("autoRefresh")) {` | 有（hasOwnProperty）
rewardPool | tools/scripts3.js:25762 | `t.initItems(o.rewardPool);` | 无
 - eRet 非1分支：tools/scripts3.js:25765-25768 | `} else { 15 == o.eRet && h.default.show(i.getText(8060)); r.MessageCenter.dispatch(c.EvName.CATCH_DOLL_EVENT, null); }`
 - 未找到项：检索式 无 + 命中数 0

## REWARD_UFO_CATCHER_TASK
 - 载荷：coinDailyId（来自参数t） | tools/scripts3.js:25872-25874 | `g.NetMgr.http.sendRequest(a.HttpConst.REWARD_UFO_CATCHER_TASK, {\ncoinDailyId: t\n});`
 - 回包读点：
rewardLimitDaily | tools/scripts3.js:25730 | `o.hasOwnProperty("rewardLimitDaily") && (t.rewardLimitDaily = o.rewardLimitDaily);` | 有（hasOwnProperty）
coinDailyList | tools/scripts3.js:25731 | `o.hasOwnProperty("coinDailyList") && r.MessageCenter.on(c.EvName.UPDATE_DOLL_TASK, o.coinDailyList);` | 有（hasOwnProperty）
rewardArray | tools/scripts3.js:25732 | `o.hasOwnProperty("rewardArray") && p.default.addShowRewardUI1(o.rewardArray, 0, {});` | 有（hasOwnProperty）
 - eRet 非1分支：tools/scripts3.js:25733-25736 | `} else if (3 == o.eRet) { l.ActiveModel.outTimeActive(37); h.default.show(i.getText(1093)); }`
 - 未找到项：检索式 无 + 命中数 0

## BUY_UFO_GAME_COIN
 - 载荷：num（来自参数t） | tools/scripts3.js:25854-25856 | `g.NetMgr.http.sendRequest(a.HttpConst.BUY_UFO_GAME_COIN, {\nnum: t\n});`
 - 回包读点：
buyCoinCount | tools/scripts3.js:25750 | `o.hasOwnProperty("buyCoinCount") && (t.buyCoinCount = o.buyCoinCount);` | 有（hasOwnProperty）
rewardArray | tools/scripts3.js:25751 | `o.hasOwnProperty("rewardArray") && p.default.addShowRewardUI1(o.rewardArray, 0, {});` | 有（hasOwnProperty）
 - eRet 非1分支：tools/scripts3.js:25749-25752 | 未找到独立非1分支语句（1 == o.eRet 块外直接跟 dispatch 语句，无 else / 非1分支）
 - 未找到项：检索式 `tools/scripts3.js:25748-25754 非1分支` + 命中数 0

未验证段：
- 25810-25895 行内包含 BUY_UFO_REFRESH_TIMES 监听器尾部（25810-25820 行），说明该区不是纯发送区，监听器与发送区存在交叠。
- REWARD_UFO 的 rewardPool 字段在 autoRefresh 守卫下读取，未直接使用 o.hasOwnProperty("rewardPool")。
- cfg/dump 下确无 ufo/catcher 配置文件，相关配置表 package_difficulty（tools/scripts3.js:25826）具体结构未在本次范围内验证。

范围外产出：无
