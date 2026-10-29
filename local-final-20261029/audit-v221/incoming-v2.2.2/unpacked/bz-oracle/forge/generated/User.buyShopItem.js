const { compileAction } = require("F:\\BaoZouyxt\\audit-v221\\incoming-v2.2.2\\unpacked\\bz-oracle\\forge\\lib" + '/rules-dsl');
const spec = require("F:\\BaoZouyxt\\audit-v221\\incoming-v2.2.2\\unpacked\\bz-oracle\\forge\\fixtures\\rules.dsl.json")["User.buyShopItem"];
module.exports = { action: "User.buyShopItem", handler: compileAction("User.buyShopItem", spec, { item: require("F:\\BaoZouyxt\\audit-v221\\incoming-v2.2.2\\unpacked\\bz-oracle\\fixtures\\tables\\item.json") }) };
// 根据裁判意见修正：L1.NO_RESP 应答体不是对象