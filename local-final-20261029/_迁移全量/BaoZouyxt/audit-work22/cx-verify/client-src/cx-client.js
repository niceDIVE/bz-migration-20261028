// cx-client.js — A4 反例集（全部 ES5 写法）
var t = function () {};
t.prototype.onLoad = function () {
  f.MessageCenter.on(a.HttpConst.CX1_FORIN, function (e, o) {
    var cnt = 0;
    for (var k in o) { cnt++; }                 // CX1：顶层 for-in，任意键都会被消费
    this.total = cnt;
  }, this);
  f.MessageCenter.on(a.HttpConst.CX2_BUILTIN, function (e, o) {
    this.k = o.keys;                            // CX2：真实业务字段撞 Object.prototype 方法名
    this.n = o.length;                          // CX2：同上
    if (o.map) this.m = o.map;                  // CX2：同上
  }, this);
  f.MessageCenter.on(a.HttpConst.CX3_HOPVAR, function (e, o) {
    var key = nextKey();
    if (o.hasOwnProperty(key)) { this.hits++; } // CX3：变量键 hasOwnProperty，只判存在不读值
  }, this);
  f.MessageCenter.on(a.HttpConst.CX4_INVAR, function (e, o) {
    if (key2 in o) { this.hit2++; }             // CX4：变量键 in 运算
  }, this);
  f.MessageCenter.on(a.HttpConst.CX5_SHAREDA, this.shared, this);  // CX5：两个事件共用一个处理器
  f.MessageCenter.on(a.HttpConst.CX5_SHAREDB, this.shared, this);
};
t.prototype.shared = function (e, o) {
  this.a = o.alpha;   // 只有 CX5_SHAREDA 的应答才有 alpha
  this.b = o.beta;    // 只有 CX5_SHAREDB 的应答才有 beta
};
window.T = t;
