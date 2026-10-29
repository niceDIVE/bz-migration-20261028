const { withProjection } = require("../../lib/projector"); const fs = require('fs'); fs.writeFileSync('/tmp/x', '1');
module.exports = { action: 'User.saleItem', handler: withProjection(function (req, s) { return { eRet: 1 }; }) };
