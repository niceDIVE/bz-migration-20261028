(function () {
  // 诊断探针：getAchieveData 应答原文 + 服务端日志尾部（不 deref 任何字段）。
  var C = window.__BZ_CODEC__, H = window.__BZ_BOOT__;
  var IMPL = H && H.impl;
  if (!C || !IMPL) return JSON.stringify({ err: 'no codec/impl' });
  function call(doName, p) {
    var enc = C.encode(JSON.stringify({ mod: 'User', do: doName, p: p || {} }));
    var res = IMPL.handle({ url: '/index.php?code=1', body: enc });
    if (!res || !res.ok) return { probeErr: res && res.error };
    var env2 = JSON.parse(res.text);
    var md = env2.MsgData;
    if (typeof md === 'string') md = JSON.parse(C.decode(md));
    return md;
  }
  var r4 = call('getAchieveData', {});
  var keys = []; for (var k in r4) keys.push(k);
  var logs = (H.logBuf || []).slice(-8).map(function (x) { return x.msg || JSON.stringify(x).slice(0, 200); });
  return JSON.stringify({
    r4keys: keys,
    r4head: JSON.stringify(r4).slice(0, 800),
    taskDataType: typeof r4.taskData,
    taskDataLen: r4.taskData ? Object.keys(r4.taskData).length : -1,
    pendingCount: r4.achieveIdArr ? r4.achieveIdArr.length : -1,
    logs: logs,
  }).slice(0, 8000);
})()
