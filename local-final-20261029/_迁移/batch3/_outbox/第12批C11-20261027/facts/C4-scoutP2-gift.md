| 键 | 线上名 | 定义行 | 发送点行 | 回调行 | 请求载荷键 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| ANN_PASS_GET_GIFT_DATA | getAnniversaryPassGift | tools/index.js:60590 | tools/index.js:131046-131048 | tools/index.js:131050-131056 | roleID |
| ANN_PASS_BUY_GIFT | buyAnniversaryPassGift | tools/index.js:60591 | tools/index.js:131058-131060 | tools/index.js:131062-131067 | giftId |
| ANN_PASS_FINISH_TASK | receiveAnniversaryPassTaskReward | tools/index.js:60595 | tools/scripts3.js:7920-7922 | tools/scripts3.js:7878-7888 | taskId |

## ANN_PASS_GET_GIFT_DATA
 - 载荷：roleID | tools/index.js:131046-131048 | `g.NetMgr.http.sendRequest(p.HttpConst.ANN_PASS_GET_GIFT_DATA, {\nroleID: v.RoleBaseInfo.roleID\n});`
 - 回包读点：eRet | tools/index.js:131051 | `1 == e.eRet && l.MessageCenter.dispatch(h.EvName.STORE_SHOW_UI, {` | 无
 - 回包读点：giftDatas | tools/index.js:131054 | `data: e.giftDatas` | 无
 - eRet 非1分支：未找到
 - 未找到项：`tools/index.js` 范围 131050-131056 内 eRet 非1分支检索 + 0 命中

## ANN_PASS_BUY_GIFT
 - 载荷：giftId | tools/index.js:131058-131060 | `g.NetMgr.http.sendReqWithMask(p.HttpConst.ANN_PASS_BUY_GIFT, {\ngiftId: t\n});`
 - 回包读点：eRet | tools/index.js:131063 | `if (1 == e.eRet) {` | 无
 - 回包读点：rewardArray | tools/index.js:131064 | `T.default.addShowRewardUI1(e.rewardArray, 0, {});` | 无
 - 回包读点：e（完整回包对象） | tools/index.js:131065 | `l.MessageCenter.dispatch(h.EvName.REFRESH_GIFT_DATA, e);` | 无
 - eRet 非1分支：未找到
 - 未找到项：`tools/index.js` 范围 131062-131067 内 eRet 非1分支检索 + 0 命中

## ANN_PASS_FINISH_TASK
 - 载荷：taskId | tools/scripts3.js:7920-7922 | `c.NetMgr.http.sendRequest(a.HttpConst.ANN_PASS_FINISH_TASK, {\ntaskId: t\n});`
 - 回包读点：eRet | tools/scripts3.js:7879 | `if (1 == o.eRet) {` | 无
 - 回包读点：dt.length | tools/scripts3.js:7880 | `for (var s = void 0, n = 0; n < o.dt.length; n++) if (!t.receivedTasks.includes(o.dt[n])) {` | 无
 - 回包读点：dt[n] | tools/scripts3.js:7880-7881 | `s = o.dt[n];` | 无
 - 回包读点：dt | tools/scripts3.js:7884 | `t.receivedTasks = o.dt;` | 无
 - 回包读点：rewardArray | tools/scripts3.js:7886 | `d.default.addShowRewardUI1(o.rewardArray);` | 无
 - eRet 非1分支：未找到
 - 未找到项：`tools/scripts3.js` 范围 7878-7888 内 eRet 非1分支检索 + 0 命中

未验证段：无
范围外产出：无
