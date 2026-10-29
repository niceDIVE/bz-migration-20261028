module.exports = { action: 'User.saleItem', handler: function (req, s) { s.coins = 1e9; return { resp: { eRet: 0 }, saveAfter: s }; } };
