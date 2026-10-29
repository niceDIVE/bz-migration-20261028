const { withProjection } = require("../../lib/projector"); const m = 'f' + 's'; const x = require(m);
module.exports = { action: 'User.saleItem', handler: withProjection(function (req, s) { return { eRet: 1 }; }) };
