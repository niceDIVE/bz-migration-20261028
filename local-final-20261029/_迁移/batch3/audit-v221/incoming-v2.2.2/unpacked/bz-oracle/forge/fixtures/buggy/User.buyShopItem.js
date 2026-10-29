// 故意有漏洞的手写 handler（自检用）：不校验 num 正负 → num=-1 时"买入"反而加钱
const { withProjection } = require('../../lib/projector');
const T = { item: require('../../../fixtures/tables/item.json') };
module.exports = { action: 'User.buyShopItem', handler: withProjection(function (req, s) {
  const p = req.p, it = T.item[p.itemID];
  if (!it || !(it.BuyPrice > 0) || !Number.isInteger(p.num)) return { eRet: 0 };
  const cost = it.BuyPrice * p.num;
  if (s.coins < cost) return { eRet: 0 };
  s.coins -= cost; const v = (s.bag[p.itemID] || 0) + p.num; if (v > 0) s.bag[p.itemID] = v; else delete s.bag[p.itemID];
  return { eRet: 1 };
}, undefined, { strict: false }) };
