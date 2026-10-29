// 合成样例：模仿压缩后的 cocos 产物形态（仅供自检）
var e = { HttpConst: {} };
t.prototype.onClickBuy = function() { var n = this.num; r.default.sendRequest(a.HttpConst.BUY_SHOP_ITEM, { itemID: this.itemId, num: n, shopType: 1 }); };
t.prototype.onSell = function() { s.default.sendReqWithMask(a.HttpConst.SELL_ITEM, { itemID: this.id, num: 1, tip: "卖出}" }, !0); };
t.prototype.onUp = function(o) { var p = { skillID: o.id }; r.default.sendRequest(a.HttpConst.UPGRADE_SKILL, p); };
t.prototype.onLoad = function() {
  f.MessageCenter.on(a.HttpConst.ACCEPT_SCHOOL_TASK, this.onAcceptSchoolTask, this);
  f.MessageCenter.on(a.HttpConst.SELL_ITEM, this.onSellBack, this);
};
t.prototype.onAcceptSchoolTask = function(t, o) {
  if (1 != o.eRet) return;
  var re = /}{/g; // 正则里的括号不能打乱配对
  this.taskId = o.taskId;
  o.hasOwnProperty("autoObj") && this.applyAuto(o.autoObj);
  this.render(o);
};
t.prototype.render = function(d) { this.list = d.taskList; this.cd = d["cdTime"]; };
t.prototype.applyAuto = function(x) { this.a = x.flag; };
t.prototype.onSellBack = function(t, o) { cc.log("sold " + o.eRet); };
// 中层审计 A1-C12：别名常量发送点（v2.1 会静默跳过）
t.prototype.onSell = function() { var H = a.HttpConst; r.default.sendRequest(H.SELL_ITEM, { itemID: this.itemId, num: 1 }); };
t.prototype.onDyn = function(k) { r.default.sendRequest(this.keyFor(k), {}); };
