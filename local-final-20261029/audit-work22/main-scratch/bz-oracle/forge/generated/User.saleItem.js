const { compileAction } = require('F:/BaoZouyxt/audit-work22/main-scratch/bz-oracle/forge/lib/rules-dsl');
const spec = require('F:/BaoZouyxt/audit-work22/main-scratch/bz-oracle/forge/fixtures/rules.dsl.json')['User.saleItem'];
module.exports = { action: 'User.saleItem', handler: compileAction('User.saleItem', spec, { item: require('F:/BaoZouyxt/audit-work22/main-scratch/bz-oracle/fixtures/tables/item.json') }) };
