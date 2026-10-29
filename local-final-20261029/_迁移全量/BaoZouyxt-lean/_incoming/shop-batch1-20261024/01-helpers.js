// ===== 第 1 批「商店交易」原型模板：公共 helper =====
// 贴在 bz-rpc-server.js 里 `var H = {` 前面，和 loadSave / clone / TPL / ack 放在一起即可。
// 只需要对齐一处：SAVE_FN 改成你们实际的写档函数名（比如 saveSave / writeSave / persist）。
var SAVE_FN = function (s) { return saveSave(s); };   // ← 唯一需要对齐的一行

// 表查找：T('item', id) → 那一行；表名按 442 表的 json 文件名来
function T(table, id) { var t = (typeof TABLES !== 'undefined' && TABLES[table]) || {}; return t[id] || t[String(id)] || null; }

// 背包增减。bag 的形状照搬 H.buyShopItem 里的写法（如果你们的 bag 是数组，就把这两个函数换成那套写法）
function bagGet(s, id) { return (s.bag && s.bag[id]) || 0; }
function bagAdd(s, id, n) { s.bag = s.bag || {}; var v = (s.bag[id] || 0) + n; if (v > 0) s.bag[id] = v; else delete s.bag[id]; }

// 原型 A：花钱买东西。cost = [[钱包键, 数额]...]，gain = [[道具id, 数量]...]
// 钱不够就回 eRet:0，存档不动；够就先扣钱再发货，然后写档，返回 eRet:1
// apply(s)：扣钱成功后才执行的额外写档（解锁、坐骑之类），保证钱不够时什么都不给
function protoBuy(name, s, cost, gain, extra, apply) {
  for (var i = 0; i < cost.length; i++) if ((s[cost[i][0]] || 0) < cost[i][1]) return ack(name, { eRet: 0 });
  for (i = 0; i < cost.length; i++) s[cost[i][0]] -= cost[i][1];
  for (i = 0; i < gain.length; i++) bagAdd(s, gain[i][0], gain[i][1]);
  if (apply) extra = Object.assign(extra || {}, apply(s) || {});
  SAVE_FN(s);
  return ack(name, Object.assign({ eRet: 1 }, extra || {}));
}

// 原型 B：拉商店/榜单数据（只读）。优先用抓包模板 TPL[name]，没有就回一个空壳
function protoData(name, body) {
  var r = (typeof TPL !== 'undefined' && TPL[name]) ? clone(TPL[name]) : {};
  return Object.assign(r, { eRet: 1 }, body || {});
}

// 原型 C：只改一个状态位（开关、外观），写档后回成功
function protoFlag(name, s, path, val, extra) {
  var o = s; for (var i = 0; i < path.length - 1; i++) o = o[path[i]] = o[path[i]] || {};
  o[path[path.length - 1]] = val;
  SAVE_FN(s);
  return ack(name, Object.assign({ eRet: 1 }, extra || {}));
}
