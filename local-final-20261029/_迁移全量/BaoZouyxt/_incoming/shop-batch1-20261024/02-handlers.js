// ===== 第 1 批「商店交易」：缺服务端 handler 的 11 个动作 =====
// 逐条贴进 `var H = { ... }`，键名就是裸动作名。
// p.xxx 参数名一律是【推断】，以客户端发送处为准：每条上面标了客户端读应答的行号，往上翻几行就能看到 send 的参数。
// 价格列都写成 TODO_COL，按 442 表里对应的列名改掉；改不出来就先写死一个数，能玩就行。

    /** BUY_FORMULA_DATA  客户端读应答：scripts3.js:6998（读 eRet、data） */
    buyFormula: function (p) {
      var s = loadSave(), row = T('formula', p.id);                 // TODO 表名/参数名
      if (!row) return ack('buyFormula', { eRet: 0 });
      return protoBuy('buyFormula', s, [['coins', row.TODO_COL || 0]], [[row.ItemID || p.id, 1]], { data: { id: p.id } });  // 客户端读了 data，先回最小形状
    },

    /** GET_INN_SHOP  客户端读应答：index.js:62250（读 eRet、unlockDish） */
    getInnShop: function () {
      var s = loadSave();
      return protoData('getInnShop', { unlockDish: (s.inn && s.inn.unlockDish) || [] });
    },

    /** GET_INN_RANK  同一个回调（index.js:62250），回空榜即可 */
    getInnRank: function () {
      var s = loadSave();
      return protoData('getInnRank', { unlockDish: (s.inn && s.inn.unlockDish) || [], rankList: [] });
    },

    /** INN_BUY_SHOP  同一个回调（index.js:62250）；买到的菜谱进 unlockDish */
    innBuyShop: function (p) {
      var s = loadSave(), row = T('innShop', p.id);                 // TODO 表名/参数名
      if (!row) return ack('innBuyShop', { eRet: 0 });
      return protoBuy('innBuyShop', s, [['coins', row.TODO_COL || 0]], [], {}, function (s) {
        s.inn = s.inn || {}; s.inn.unlockDish = s.inn.unlockDish || [];
        if (s.inn.unlockDish.indexOf(p.id) < 0) s.inn.unlockDish.push(p.id);
        return { unlockDish: s.inn.unlockDish };
      });
    },

    /** GET_GOOD_AND_EVIL_SHOP_DATA  客户端回调 this.onGetShopData（scripts3.js:36358）；先回模板或空壳 */
    getGoodAndEvilShopData: function () {
      return protoData('getGoodAndEvilShopData', {});
    },

    /** BUY_SCHOOL_SHOP  客户端回调 this.onBuySchoolShop（index.js:113581）；用门派贡献买 */
    buySchoolShop: function (p) {
      var s = loadSave(), row = T('schoolShop', p.id);              // TODO
      if (!row) return ack('buySchoolShop', { eRet: 0 });
      var n = p.num || 1;
      return protoBuy('buySchoolShop', s, [['contribution', (row.TODO_COL || 0) * n]], [[row.ItemID || p.id, n]]);
    },

    /** BUY_MARKET_ITEM  客户端回调 this.onPaySuccess（index.js:130734）；离线版扣存档里的元宝，不走真支付 */
    BuyMarketItem: function (p) {
      var s = loadSave(), row = T('market', p.id);                  // TODO
      if (!row) return ack('BuyMarketItem', { eRet: 0 });
      return protoBuy('BuyMarketItem', s, [['yuanbao', row.TODO_COL || 0]], [[row.ItemID || p.id, 1]]);
    },

    /** BUY_MOUNT  客户端读应答：index.js:32142–32170（读 type、eRet、sync） */
    BuyMount: function (p) {
      var s = loadSave(), row = T('mount', p.id);                   // TODO
      if (!row) return ack('BuyMount', { eRet: 0 });
      return protoBuy('BuyMount', s, [['coins', row.TODO_COL || 0]], [], { type: p.type, sync: 1 }, function (s) {
        s.mounts = s.mounts || {}; s.mounts[p.id] = 1;               // TODO 坐骑存在哪个存档键，照 LoadGame 的回包改
      });
    },

    /** REQ_BUY_GIFT  弹出礼包（scripts3.js:60858，客户端在别的函数里读应答） */
    buyEjectGift: function (p) {
      var s = loadSave(), row = T('ejectGift', p.id);               // TODO
      if (!row) return ack('buyEjectGift', { eRet: 0 });
      var gain = (row.Items || []).map(function (x) { return [x[0], x[1]]; });  // TODO 奖励列形状
      return protoBuy('buyEjectGift', s, [['yuanbao', row.TODO_COL || 0]], gain);
    },

    /** SET_YP_EFFECT_STATE  客户端读应答：index.js:75600（读 eRet、titivateObj；titivateObj 是开关字段，必须回真实状态） */
    upFashionFaceState: function (p) {
      var s = loadSave();
      var r = protoFlag('upFashionFaceState', s, ['titivateObj', String(p.id)], p.state);   // TODO 参数名
      r.titivateObj = s.titivateObj;
      return r;
    },

    /** FASHION_EFFECT  三处调用都不读应答（index.js:81184 / 97556、scripts2.js:22158），回成功就行 */
    fashionEffect: function () { return ack('fashionEffect', { eRet: 1 }); },
