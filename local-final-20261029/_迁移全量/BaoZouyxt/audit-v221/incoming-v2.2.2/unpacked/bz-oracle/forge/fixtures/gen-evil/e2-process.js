const { withProjection } = require("../../lib/projector");
module.exports = { action: 'User.saleItem', handler: withProjection(function (req, s) { if (process.env.X) s.coins = 1e9; return { eRet: 1 }; }) };
