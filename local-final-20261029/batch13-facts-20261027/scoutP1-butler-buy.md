| 键 | 线上名 | 定义行 | 发送点行 | 回调行 | 请求载荷键 |
|---|---|---|---|---|---|
| BUY_BUTLER | User.buyHelper | tools/index.js:60397 | tools/scripts3.js:23638 | tools/scripts3.js:23162 | helperId |
| SET_BUTLER | User.setHelper | tools/index.js:60396 | tools/scripts3.js:23632 | tools/scripts3.js:23153 | helperId |
| BUY_BUTLER_VIP | User.buyMonthlyFee | tools/index.js:60398 | tools/scripts3.js:23662 | tools/scripts3.js:23189 | type |

## BUY_BUTLER
- 载荷：helperId | tools/scripts3.js:23635-23638 | var e = { helperId: t }; p.NetMgr.http.sendRequest(n.HttpConst.BUY_BUTLER, e);
- 回包读点：
  - eRet | tools/scripts3.js:23163 | if (1 == o.eRet) { | 无
  - housekeeper.helperIdArr | tools/scripts3.js:23164 | t.helperIdArr = o.housekeeper.helperIdArr; | 无
  - eRet | tools/scripts3.js:23167 | } else 4 == o.eRet && C.StoreModel.openChargeList(); | 无
- eRet 非1分支：
  - tools/scripts3.js:23167 | } else 4 == o.eRet && C.StoreModel.openChargeList();
- 未找到项：
  - grep "buyHelper" tools/scripts3.js + 命中数: 0
  - hasOwnProperty 守卫 + 命中数: 0

## SET_BUTLER
- 载荷：helperId | tools/scripts3.js:23629-23632 | var e = { helperId: t }; p.NetMgr.http.sendRequest(n.HttpConst.SET_BUTLER, e);
- 回包读点：
  - eRet | tools/scripts3.js:23154 | if (1 == o.eRet) { | 无
  - housekeeper.helperId | tools/scripts3.js:23156 | t.helperId = o.housekeeper.helperId; | 无
  - eRet | tools/scripts3.js:23160 | } else 2 == o.eRet && u.default.show(c.getText("6000506")); | 无
- eRet 非1分支：
  - tools/scripts3.js:23160 | } else 2 == o.eRet && u.default.show(c.getText("6000506"));
- 未找到项：
  - grep "setHelper" tools/scripts3.js + 命中数: 0
  - hasOwnProperty 守卫 + 命中数: 0

## BUY_BUTLER_VIP
- 载荷：type | tools/scripts3.js:23660-23662 | var e = {}; e.type = t; p.NetMgr.http.sendRequest(n.HttpConst.BUY_BUTLER_VIP, e);
- 回包读点：
  - eRet | tools/scripts3.js:23190 | if (1 == o.eRet) { | 无
  - housekeeper.dueTime | tools/scripts3.js:23191 | t.dueTime = o.housekeeper.dueTime; | 无
  - eRet | tools/scripts3.js:23193 | } else 2 == o.eRet ? u.default.show(c.getText("6000402")) : u.default.show(c.getText("8845")); | 无
- eRet 非1分支：
  - tools/scripts3.js:23193 | } else 2 == o.eRet ? u.default.show(c.getText("6000402")) : u.default.show(c.getText("8845"));
- 未找到项：
  - grep "buyMonthlyFee" tools/scripts3.js + 命中数: 0
  - hasOwnProperty 守卫 + 命中数: 0

未验证段：无
范围外产出：无
