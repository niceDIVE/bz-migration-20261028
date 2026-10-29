(function () {
  // 只读探针：读语言表原文（R06 回执第 1 条要判的东西）
  // 为什么需要它：`tools/cfg/dump/` 的 442 张表里**没有**语言表，所以 item 的 Description
  // 只能到进程内问客户端要（`LangMgr.getText(id)`）。本探针只读、不写任何模型、不做 BFS。
  var out = { ok: 0, how: '', results: {}, errs: [] };

  // 要取的 id：物品名/描述（Effect 1/2/3/11 各 3 件）+ 失败提示码 + 转世提示
  var ids = [
    // Effect==11 秘籍（判"学会X"还是"X等级+1"）
    32608, 37608, 32626, 37626, 32627, 37627,
    // Effect==2 回血
    32010, 37010, 32011, 37011, 32069, 37069,
    // Effect==3 回内
    32007, 37007, 32012, 37012, 32013, 37013,
    // Effect==1 食物（对照，已知 Data1=30 对应"恢复30点饱食度"）
    32003, 37003,
    // useItem 的失败提示码（R06 第 2 条：拒绝码必须落在"有提示"的分支）
    422, 988, 1333, 1388, 6003628, 1161, 1184, 6003686, 6372, 6000320, 979, 980, 968, 967
  ];

  function take(getText, tag) {
    if (typeof getText !== 'function') return false;
    var got = 0;
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      try {
        var s = getText(id);
        if (typeof s === 'string' && s.length) { out.results[id] = s.slice(0, 120); got++; }
        else if (s !== undefined && s !== null) out.results[id] = '[' + typeof s + '] ' + String(s).slice(0, 60);
      } catch (e) { /* 单个失败不算错 */ }
    }
    if (got) { out.how = tag; out.ok = got; return true; }
    return false;
  }

  // 途径 1：LangMgr 模块
  try {
    var lm = window.__require ? window.__require('LangMgr') : null;
    var cands = [lm, lm && lm.LangMgr, lm && lm.default, lm && lm.LangMgr && lm.LangMgr.instance];
    for (var a = 0; a < cands.length; a++) {
      if (!cands[a]) continue;
      if (take(cands[a].getText, 'LangMgr#' + a)) return JSON.stringify(out).slice(0, 4000);
      if (cands[a].getTextById && take(function (x) { return cands[a].getTextById(x); }, 'LangMgr#getTextById' + a)) return JSON.stringify(out).slice(0, 4000);
      // 静态表：直接在对象里找 id → 文本 的映射
      try {
        var keys = Object.keys(cands[a]);
        for (var b = 0; b < keys.length; b++) {
          var v = cands[a][keys[b]];
          if (v && typeof v === 'object' && Object.keys(v).length > 50) {
            if (take(function (x) { return v[x] || (v[String(x)]); }, 'LangMgr.' + keys[b] + '[dict]')) return JSON.stringify(out).slice(0, 4000);
          }
        }
      } catch (e2) {}
    }
  } catch (e) { out.errs.push('LangMgr: ' + e); }

  // 途径 2：全局里找带 getText 的单例（限量，不做 BFS）
  try {
    var names = ['LangMgr', 'LangModel', 'LangUtil', 'TextMgr', 'I18nMgr', 'LocalizeMgr'];
    for (var n = 0; n < names.length; n++) {
      var m = window.__require ? window.__require(names[n]) : null;
      if (!m) continue;
      var alt = [m, m.default, m[names[n]]];
      for (var c = 0; c < alt.length; c++) {
        if (alt[c] && take(alt[c].getText, names[n] + '#' + c)) return JSON.stringify(out).slice(0, 4000);
      }
    }
  } catch (e3) { out.errs.push('global: ' + e3); }

  // 途径 3：CFMgr 里若把语言表当配置表加载（只查表名，不做全量遍历）
  try {
    var cf = window.__require ? window.__require('CFMgr') : null;
    var dic = cf && (cf.CFMgr || cf).dic;
    if (dic) {
      var tnames = Object.keys(dic).filter(function (k) { return /lang|text|word|string/i.test(k); }).slice(0, 8);
      out.langTables = tnames;
      for (var t = 0; t < tnames.length; t++) {
        var tb = dic[tnames[t]];
        if (tb && typeof tb === 'object' && take(function (x) { return tb[x]; }, 'CFMgr.dic.' + tnames[t])) {
          return JSON.stringify(out).slice(0, 4000);
        }
      }
    }
  } catch (e4) { out.errs.push('CFMgr: ' + e4); }

  return JSON.stringify(out).slice(0, 4000);
})()
