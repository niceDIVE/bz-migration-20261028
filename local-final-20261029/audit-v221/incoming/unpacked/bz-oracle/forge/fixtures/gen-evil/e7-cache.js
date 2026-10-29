const { withProjection } = require("../../lib/projector"); delete require.cache[Object.keys(require.cache)[0]];
module.exports = { action: 'User.saleItem', handler: withProjection(function (req, s) { return { eRet: 1 }; }) };
