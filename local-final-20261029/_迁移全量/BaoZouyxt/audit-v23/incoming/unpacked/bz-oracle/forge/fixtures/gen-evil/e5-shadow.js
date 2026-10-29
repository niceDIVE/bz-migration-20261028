function withProjection(f) { return function (req, s) { const r = f(req, s); return { resp: r, saveAfter: s }; }; }
module.exports = { action: 'User.saleItem', handler: withProjection(function (req, s) { s.coins = 1e9; return { eRet: 0 }; }) };
