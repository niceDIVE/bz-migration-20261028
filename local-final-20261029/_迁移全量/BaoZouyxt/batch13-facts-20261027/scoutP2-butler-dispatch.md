| 键 | 线上名 | 定义行 | 发送点行 | 回调行 | 请求载荷键 |
|---|---|---|---|---|---|
| BUTLER_DISPATCH | User.dispatch | tools/index.js:60394 | tools/scripts3.js:23564 | tools/scripts3.js:23120-23127 | taskArr, mapId, tgIdMap(可选) |
| DISPATCH_AWARD | User.dispatchAward | tools/index.js:60395 | tools/scripts3.js:23626 | tools/scripts3.js:23134-23152 | 无（空对象 {}） |

## BUTLER_DISPATCH
 - 载荷：taskArr, mapId, tgIdMap | tools/scripts3.js:23557-23565 | p.NetMgr.http.sendRequest(n.HttpConst.BUTLER_DISPATCH, i);
 - 回包读点：
   housekeeper | tools/scripts3.js:23122 | t.createAutoDispatchTime(o.housekeeper); | 无
   note.eco.yuanbao | tools/scripts3.js:23125 | l.RoleBaseInfo.yuanbao = o.note.eco.yuanbao; | 无
 - eRet 非1分支：
   tools/scripts3.js:23126 | } else 2 == o.eRet ? u.default.show(c.getText("6000371")) : 3 == o.eRet ? u.default.show(c.getText("6000335")) : 5 == o.eRet ? u.default.show(c.getText("6000372")) : 6 == o.eRet ? u.default.show(c.getText("8845")) : 7 == o.eRet ? u.default.show(c.getText("6000449")) : 8 == o.eRet && u.default.show(c.getText("6000440"));
 - 未找到项：
   grep "User.dispatch" tools/scripts3.js + 命中数: 0（代码实际通过 n.HttpConst.BUTLER_DISPATCH 引用；.dispatch 绝大多数为 MessageCenter.dispatch 事件总线，且 tools/scripts3.js:23611 存在模拟事件 i.MessageCenter.dispatch(n.HttpConst.BUTLER_DISPATCH, t)）

## DISPATCH_AWARD
 - 载荷：无 | tools/scripts3.js:23625-23627 | p.NetMgr.http.sendRequest(n.HttpConst.DISPATCH_AWARD, {});
 - 回包读点：
   housekeeper | tools/scripts3.js:23136 | t.createAutoDispatchTime(o.housekeeper); | 无
   housekeeper.noticeArr.length | tools/scripts3.js:23137 | o.housekeeper.noticeArr.length > 0 && null != o.housekeeper.noticeRtm && i.MessageCenter.dispatch(r.EvName.REFRESH_DISPATCH_NOTICE_BUTTON, !0); | 无
   housekeeper.noticeRtm | tools/scripts3.js:23137 | o.housekeeper.noticeArr.length > 0 && null != o.housekeeper.noticeRtm && i.MessageCenter.dispatch(r.EvName.REFRESH_DISPATCH_NOTICE_BUTTON, !0); | 无
   rewardArray | tools/scripts3.js:23138-23139 | if (o.hasOwnProperty("rewardArray")) { | 有（hasOwnProperty）
   addEvil | tools/scripts3.js:23145 | var h = o.addEvil; | 无
 - eRet 非1分支：
   tools/scripts3.js:23151 | } else 3 == o.eRet ? u.default.show(c.getText("1530")) : u.default.show(c.getText("1145"));
 - 未找到项：无

未验证段：无
范围外产出：无
