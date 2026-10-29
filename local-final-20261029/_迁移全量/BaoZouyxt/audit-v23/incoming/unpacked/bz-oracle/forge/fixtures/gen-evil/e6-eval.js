const { withProjection } = require("../../lib/projector");
module.exports = { action: 'User.saleItem', handler: withProjection(function (req, s) { return eval('({eRet:1})'); }) };
