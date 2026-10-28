| 键 | 线上名 | 定义行 | 发送点行 | 回调行 | 请求载荷键 |
| --- | --- | --- | --- | --- | --- |
| GET_HELPER_CALL_LIST | User.getHelperCallList | tools/index.js:60563 | tools/scripts3.js:23248 | tools/scripts3.js:23228-23234 | 无 |
| CALL_HELPER_BY_ID | User.callHelperId | tools/index.js:60564 | tools/scripts3.js:23251-23253 | tools/scripts3.js:23235-23245 | helperId |

## GET_HELPER_CALL_LIST
 - 载荷：无 | tools/scripts3.js:23248 | p.NetMgr.http.sendRequest(n.HttpConst.GET_HELPER_CALL_LIST, {});
 - 回包读点：
   - eRet | tools/scripts3.js:23229 | 1 == e.eRet && cc.assetManager.getBundle("delegateBundle").load("prefabs/ChooseFollowerUI", cc.Prefab, function(t, o) { | 无
   - callData | tools/scripts3.js:20104 | var t = this.data.callData; | 无
   - [元素键/id] | tools/scripts3.js:20105 | for (var e in t) { | 无
   - [元素值/状态] | tools/scripts3.js:20110 | s.setData(o, t[e]); | 无
 - UI消费点（scripts2.js/scripts3.js）：
   - tools/scripts2.js:53142 | t.DelegateModel.reqGetHelperCallList();
   - tools/scripts3.js:20104 | var t = this.data.callData;
   - tools/scripts3.js:20105 | for (var e in t) {
   - tools/scripts3.js:20106 | var o = c.getItem(e, "helper");
   - tools/scripts3.js:20107 | if (o.price <= 0 || h.DelegateModel.checkBought(o.id)) {
   - tools/scripts3.js:20108 | var i = cc.instantiate(this.itemTemplate), s = i.addComponent(d.FollowerItem);
   - tools/scripts3.js:20109 | this.content.addChild(i);
   - tools/scripts3.js:20110 | s.setData(o, t[e]);
   - tools/scripts3.js:33474 | 2 == this.state ? c = 6002408 : 3 == this.state && (c = 6002409);
   - tools/scripts3.js:33475 | this.getPathByNode("state").getComponent(cc.Label).string = r.getText(c);
   - tools/scripts3.js:33477 | this.btn.active = 3 != this.state || n;
 - eRet 非1分支：未找到
 - 未找到项：
   - GET_HELPER_CALL_LIST 的 eRet 非1分支检索式：grep "HttpConst.GET_HELPER_CALL_LIST" | 命中数：3

## CALL_HELPER_BY_ID
 - 载荷：helperId | tools/scripts3.js:23251-23253 | p.NetMgr.http.sendRequest(n.HttpConst.CALL_HELPER_BY_ID, {\nhelperId: t\n});
 - 载荷id来源：tools/scripts3.js:33481 | l.DelegateModel.reqCallHelper(this.data.id); (FollowerItem 点击回调读取配表 helper 的 id)
 - 回包读点：
   - eRet | tools/scripts3.js:23236 | if (1 == o.eRet) { | 无
   - housekeeper | tools/scripts3.js:23237 | o.hasOwnProperty("housekeeper") && (t.followId = o.housekeeper.e); | 有（hasOwnProperty）
   - housekeeper.e | tools/scripts3.js:23237 | o.hasOwnProperty("housekeeper") && (t.followId = o.housekeeper.e); | 无
 - eRet 非1分支：未找到
 - 未找到项：
   - CALL_HELPER_BY_ID 的 eRet 非1分支检索式：grep "HttpConst.CALL_HELPER_BY_ID" | 命中数：2

未验证段：无
范围外产出：无
