// 故意有漏洞的手写 handler（自检用）：卖出时手写 note.ivch 发"减少的数量"（增量），而不是剩余绝对值——R21 前反复出现的老错
const T = { item: require('../../../fixtures/tables/item.json') };
module.exports = { action: 'User.saleItem', handler: function (req, s) {
  const p = req.p, it = T.item[p.itemID], have = (s.bag || {})[p.itemID] || 0;
  if (!it || !Number.isInteger(p.num) || p.num <= 0 || have < p.num) return { resp: { eRet: 0 }, saveAfter: s };
  s.bag[p.itemID] = have - p.num; if (!s.bag[p.itemID]) delete s.bag[p.itemID];
  s.coins += it.Price * p.num;
  return { resp: { eRet: 1, note: { ivch: { [p.itemID]: p.num }, eco: { coins: s.coins } } }, saveAfter: s };
} };
