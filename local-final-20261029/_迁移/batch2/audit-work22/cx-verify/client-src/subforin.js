// 子字段 for-in 反例（ES5）
var t = function () {};
t.prototype.onLoad = function () {
  f.MessageCenter.on(a.HttpConst.SUBFORIN, function (e, o) {
    var n = 0;
    for (var k in o.rewardObj) { n += o.rewardObj[k]; }   // 子字段 for-in：rewardObj 内任意键被消费
    this.total = n;
  }, this);
};
window.T = t;
