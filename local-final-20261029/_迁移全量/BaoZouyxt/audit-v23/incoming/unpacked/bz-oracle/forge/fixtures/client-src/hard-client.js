// 刁钻样例：别名、子字段别名、遮蔽、for-in、in 运算符、计算属性、外泄、子字段跟进（自检用）
(function () {
  var t = function () {};
  t.prototype.onLoad = function () {
    f.MessageCenter.on(a.HttpConst.ROLE_INFO, this.onRoleInfo, this);
    f.MessageCenter.on(a.HttpConst.GET_REWARD, function (e, o) {
      var d = o;
      if (d.eRet != 1) return;
      for (var k in o.rewardObj) this.show(k);
      "vipLv" in o && this.vip();
      this.coins = o["coins"];
      [1, 2].forEach(function (o) { return o.notResp; });   // 遮蔽：内层 o 不是应答
    }, this);
    f.MessageCenter.on(a.HttpConst.LEAKY, function (e, o) { someLib.process(o); }, this);
  };
  t.prototype.onRoleInfo = function (e, r) {
    var info = r.roleInfo;
    this.lv = info.lv;
    this.fill(r.bagList);
    r.hasOwnProperty("guildObj") && this.guild(r.guildObj);
  };
  t.prototype.fill = function (list) { this.n = list.length; this.first = list[0]; this.cap = list.cap; };
  t.prototype.guild = function (g) { this.gid = g.id; this.gname = g["name"]; };
  window.T = t;
})();
