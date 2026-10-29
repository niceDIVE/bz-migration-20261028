(function () {
  try {
    var L = window.XMLHttpRequest;
    if (L.__bzSpy) return "already spied";
    var f = jsb.fileUtils;
    var path = "/data/data/com.maple.madherogo/files/xhr_spy.txt";
    try { f.writeStringToFile("=== spy " + Date.now() + " ===\n", path); } catch (e) {}
    function log(m) {
      try {
        var prev = f.isFileExist(path) ? f.getStringFromFile(path) : "";
        if (prev.length > 8000) prev = prev.slice(-8000);
        f.writeStringToFile(prev + m + "\n", path);
      } catch (e) {}
    }

    function SpyXHR() {
      var x = new L();
      if (x._url === undefined) x._url = "";
      var methods = ["open", "send", "setRequestHeader", "getResponseHeader", "getAllResponseHeaders", "addEventListener", "removeEventListener", "overrideMimeType", "abort"];
      for (var i = 0; i < methods.length; i++) {
        (function (m) {
          var o = x[m];
          if (typeof o !== "function") return;
          x[m] = function () {
            var a = [];
            for (var j = 0; j < arguments.length; j++) { try { a.push(String(arguments[j]).slice(0, 100)); } catch (e) {} }
            log(m + "(" + a.join(" | ") + ")");
            return o.apply(x, arguments);
          };
        })(methods[i]);
      }
      var props = ["readyState", "status", "statusText", "responseText", "response", "responseType", "timeout", "withCredentials"];
      for (var k = 0; k < props.length; k++) {
        (function (p) {
          try {
            var v = x[p];
            Object.defineProperty(x, p, {
              get: function () { log("  get " + p + " -> " + String(v).slice(0, 60)); return v; },
              set: function (nv) { log("  set " + p + " = " + String(nv).slice(0, 60)); v = nv; },
              configurable: true,
            });
          } catch (e) {}
        })(props[k]);
      }
      return x;
    }
    SpyXHR.__bzSpy = true;
    window.XMLHttpRequest = SpyXHR;
    log("spy installed");
    return "spy installed";
  } catch (e) {
    return "ERR " + (e && e.stack ? e.stack : e);
  }
})()
