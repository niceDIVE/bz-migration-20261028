const { compileAction } = require("F:\\BaoZouyxt\\midaudit-v21\\audit-work\\main-scratch\\bz-oracle\\forge\\lib" + '/rules-dsl');
const spec = require("F:\\BaoZouyxt\\midaudit-v21\\audit-work\\main-scratch\\bz-oracle\\forge\\fixtures\\rules.dsl.json")["User.saleItem"];
module.exports = { action: "User.saleItem", handler: compileAction("User.saleItem", spec, { item: require("F:\\BaoZouyxt\\midaudit-v21\\audit-work\\main-scratch\\bz-oracle\\fixtures\\tables\\item.json") }) };
// 根据裁判意见修正：L1.NO_RESP 应答体不是对象