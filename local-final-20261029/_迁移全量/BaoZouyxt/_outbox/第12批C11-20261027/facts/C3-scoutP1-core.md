| 键 | 线上名 | 定义行 | 发送点行 | 回调行 | 请求载荷键 |
|---|---|---|---|---|---|
| ANN_PASS_GET_DATA | getAnniversaryPassData | tools/scripts3.js:未找到 | tools/scripts3.js:7894 | tools/scripts3.js:7819 | 无 |
| ANN_PASS_BUY_UP | buyAnniversaryPass | tools/scripts3.js:未找到 | tools/scripts3.js:7897 | tools/scripts3.js:7843 | 无 |
| ANN_PASS_RECEIVE_AWARD | receiveAnniversaryPassAward | tools/scripts3.js:未找到 | tools/scripts3.js:7904 | tools/scripts3.js:7850 | id, vip |
| ANN_PASS_BUY_LIVENESS | buyAnniversaryPassLiveness | tools/scripts3.js:未找到 | tools/scripts3.js:7907 | tools/scripts3.js:7858 | num |

## ANN_PASS_GET_DATA
 - 载荷：无 | tools/scripts3.js:7894 | c.NetMgr.http.sendRequest(a.HttpConst.ANN_PASS_GET_DATA);
 - 回包读点：
   o.eRet | tools/scripts3.js:7820 | if (1 == o.eRet) { | 无
   o.anniversaryPassData | tools/scripts3.js:7821 | var a = o.anniversaryPassData; | 无
   a.n | tools/scripts3.js:7822 | t.liveness = a.n; | 无
   a.vip | tools/scripts3.js:7823 | t.isVip = a.vip; | 无
   a.rd | tools/scripts3.js:7824 | t.receivedRewards = a.rd; | 无
   a.vrd | tools/scripts3.js:7825 | t.receivedVipRewards = a.vrd; | 无
   a.td | tools/scripts3.js:7826 | t.lTaskRates = a.td; | 无
   a.dt | tools/scripts3.js:7827 | t.receivedTasks = a.dt; | 无
   a.dv | tools/scripts3.js:7828 | t.taskRates = a.dv; | 无
   o.endtime | tools/scripts3.js:7829 | t.endT = o.endtime; | 无
 - eRet 非1分支：
   tools/scripts3.js:7837 | } else {
   tools/scripts3.js:7838 | g.LocalStorageMgr.removeItem("anni" + m.RoleBaseInfo.roleID);
   tools/scripts3.js:7839 | n.default.show(p.getText(1093));
   tools/scripts3.js:7840 | i.MessageCenter.dispatch(h.EvName.ANN_OPEN, !1);
 - 未找到项：检索式 `getAnniversaryPassData` 在 `tools/scripts3.js` + 命中数 0

## ANN_PASS_BUY_UP
 - 载荷：无 | tools/scripts3.js:7897 | c.NetMgr.http.sendRequest(a.HttpConst.ANN_PASS_BUY_UP);
 - 回包读点：
   o.eRet | tools/scripts3.js:7844 | if (1 == o.eRet) { | 无
   o.eRet | tools/scripts3.js:7848 | } else 4 == o.eRet && n.default.show(p.getText("8845")); | 无
 - eRet 非1分支：
   tools/scripts3.js:7848 | } else 4 == o.eRet && n.default.show(p.getText("8845"));
 - 未找到项：检索式 `buyAnniversaryPass` 在 `tools/scripts3.js` + 命中数 0

## ANN_PASS_RECEIVE_AWARD
 - 载荷：id, vip | tools/scripts3.js:7904 | c.NetMgr.http.sendRequest(a.HttpConst.ANN_PASS_RECEIVE_AWARD, o);
 - 回包读点：
   o.eRet | tools/scripts3.js:7851 | if (1 == o.eRet) { | 无
   o.vip | tools/scripts3.js:7852 | var s = o.vip > 0 ? t.receivedVipRewards : t.receivedRewards; | 无
   o.id | tools/scripts3.js:7853 | s.includes(o.id) || s.push(o.id); | 无
   o.rewardArray | tools/scripts3.js:7854 | o.rewardArray && !cc.js.isEmptyObject(o.rewardArray) && d.default.addShowRewardUI1(o.rewardArray); | 无
 - eRet 非1分支：未找到
 - 未找到项：检索式 `receiveAnniversaryPassAward` 在 `tools/scripts3.js` + 命中数 0

## ANN_PASS_BUY_LIVENESS
 - 载荷：num | tools/scripts3.js:7907 | c.NetMgr.http.sendRequest(a.HttpConst.ANN_PASS_BUY_LIVENESS, {
 - 回包读点：
   o.eRet | tools/scripts3.js:7859 | if (1 == o.eRet) { | 无
   o.n | tools/scripts3.js:7860 | t.liveness = o.n; | 无
   o.td | tools/scripts3.js:7861 | for (var s in o.td) t.lTaskRates[s] = o.td[s]; | 无
 - eRet 非1分支：
   tools/scripts3.js:7863 | } else 3 == o.eRet && n.default.show(p.getText("7353"));
 - 未找到项：检索式 `buyAnniversaryPassLiveness` 在 `tools/scripts3.js` + 命中数 0

未验证段：无
范围外产出：无
