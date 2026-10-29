const { withProjection } = require("../../lib/projector");
module.exports = { action: 'User.saleItem', handler: withProjection(function (req, s) { s.titles = { 9: 1 }; return { eRet: 1 }; }) };
