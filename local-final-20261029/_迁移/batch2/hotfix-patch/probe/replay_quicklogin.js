(function () {
  var out = [];
  try {
    var hex = jsb.fileUtils.getStringFromFile(jsb.getWritablePath() + "ql_raw.hex");
    if (!hex) return "NO HEX FILE";
    hex = String(hex).replace(/\s+/g, "");
    out.push("raw hex len=" + hex.length);

    // 包一层新 XHR：quicklogin 直接回放真实密文
    var Old = window.XMLHttpRequest;
    if (Old.__bzReplay) return "already wrapped";
    function ReplayXHR() {
      var x = new Old();
      var rawSend = x.send;
      x.send = function (body) {
        var u = x._url || "";
        if (u.indexOf("quicklogin") >= 0) {
          out.push("replay quicklogin");
          var self = x;
          setTimeout(function () {
            if (self._finish) self._finish(200, '{"code":200,"MsgData":"' + hex + '"}');
          }, 0);
          return;
        }
        return rawSend.apply(x, arguments);
      };
      return x;
    }
    ReplayXHR.__bzReplay = true;
    window.XMLHttpRequest = ReplayXHR;
    return out.join("\n") + "\nreplay wrapper installed";
  } catch (e) {
    return "ERR " + (e && e.stack ? e.stack : e);
  }
})()
