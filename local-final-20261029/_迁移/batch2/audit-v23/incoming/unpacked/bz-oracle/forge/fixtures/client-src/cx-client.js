// 审计反例集（中层审计 A4，2026-10-23）：每一条都曾被 v2.1 误判闭合或多收字段
(function () {
  var t = function () {};
  t.prototype.onLoad = function () {
    f.MessageCenter.on(a.HttpConst.CX1_FORIN, function (e, o) { var cnt = 0; for (var k in o) { cnt++; } this.cnt = cnt; }, this);
    f.MessageCenter.on(a.HttpConst.CX2_BUILTIN, function (e, o) { this.k = o.keys; this.n = o.length; if (o.map) this.m = 1; }, this);
    f.MessageCenter.on(a.HttpConst.CX3_HOPVAR, function (e, o) { var key = nextKey(); if (o.hasOwnProperty(key)) { this.hits++; } }, this);
    f.MessageCenter.on(a.HttpConst.CX4_INVAR, function (e, o) { var key2 = nextKey(); if (key2 in o) { this.hit2++; } }, this);
    f.MessageCenter.on(a.HttpConst.CX5_SHAREDA, this.shared, this);
    f.MessageCenter.on(a.HttpConst.CX5_SHAREDB, this.shared, this);
    f.MessageCenter.on(a.HttpConst.CX7_SUBFORIN, function (e, o) { for (var k in o.rewardObj) this.show(k, o.rewardObj[k]); }, this);
    f.MessageCenter.on(a.HttpConst.CX6_TRUTHY, function (e, o) { if (o.rewardObj) this.show(); this.v = o.vipLv; }, this);
  };
  t.prototype.shared = function (e, o) { this.a = o.alpha; this.b = o.beta; };
  window.T = t;
})();
