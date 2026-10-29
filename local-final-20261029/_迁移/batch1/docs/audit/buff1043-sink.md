# buff 1043 取证与分流审计报告

## 任务 1：bz-rpc-server.js 中含 Shop 的 Handler 清单及读取的 BZ_* 表
- hotfix-patch/core/bz-rpc-server.js:1957 `buyShopItem`：读取 `BZ_ITEMBUYPRICE` (通过 `itemBuyPrice` hotfix-patch/core/bz-rpc-server.js:366)、`BZ_ITEMTYPE` (通过 `grantItem`/`itemTypeOf` hotfix-patch/core/bz-rpc-server.js:440, 1987)
- hotfix-patch/core/bz-rpc-server.js:1999 `getShopItem`：读取 `BZ_NPCSHOP` (通过 `npcShopOf` hotfix-patch/core/bz-rpc-server.js:374, 2002)
- hotfix-patch/core/bz-rpc-server.js:2011 `buySpecialShopItem`：读取 `BZ_NPCSHOP` (通过 `npcShopOf` hotfix-patch/core/bz-rpc-server.js:374, 2018)、`BZ_ITEMTYPE` (通过 `grantItem`/`itemTypeOf` hotfix-patch/core/bz-rpc-server.js:440, 2038)
- hotfix-patch/core/bz-rpc-server.js:2046 `GetSpecialShopData`：读取 `BZ_NPCSHOP` (通过 `npcShopOf` hotfix-patch/core/bz-rpc-server.js:374, 2050)
- hotfix-patch/core/bz-rpc-server.js:2080 `BuyAcitivityShop`：未读取任何 `BZ_*` 表（直接返回 `{ eRet: 1, note: {} }`，hotfix-patch/core/bz-rpc-server.js:2086）
- hotfix-patch/core/bz-rpc-server.js:2120 `getChangeShop`：读取 `BZ_EXCHANGE` (hotfix-patch/core/bz-rpc-server.js:2123)
- hotfix-patch/core/bz-rpc-server.js:2198 `getGoodAndEvilShopData`：读取 `BZ_GESHOP` (hotfix-patch/core/bz-rpc-server.js:2203)
- hotfix-patch/core/bz-rpc-server.js:2216 `buyGoodAndEvilShopItem`：读取 `BZ_GESHOP` (hotfix-patch/core/bz-rpc-server.js:2220)、`BZ_ITEMTYPE` (通过 `grantItem`/`itemTypeOf` hotfix-patch/core/bz-rpc-server.js:440, 2240)
- hotfix-patch/core/bz-rpc-server.js:2250 `rgGetShopData`：读取 `BZ_ROGUESHOP` (hotfix-patch/core/bz-rpc-server.js:2255)
- hotfix-patch/core/bz-rpc-server.js:2267 `rgShopByItem`：读取 `BZ_ROGUESHOP` (hotfix-patch/core/bz-rpc-server.js:2271)、`BZ_ITEMTYPE` (通过 `grantItem`/`itemTypeOf` hotfix-patch/core/bz-rpc-server.js:440, 2296)

## 任务 2：商品 2 是否出现在发出的货架中
- hotfix-patch/core/bz-tasks.generated.js 里搜 `1043`：命中 19 次，首行行号为 hotfix-patch/core/bz-tasks.generated.js:19。
- 货架表检查：
  - `BZ_NPCSHOP`：键或值等于 2 的条目命中 0 次。
  - `BZ_GESHOP`：键或值等于 2 的条目命中 1 次，样本为 hotfix-patch/core/bz-tasks.generated.js:21 `{"id":2,"Name":32325,"Description":37325,"Data":[3325,1],"Price":1600,"camp":1,"rankopen":1,"rankNums":[0,0,0,0,0]}`（发放物品为 3325，非商品 2 / buff 1043）。
  - `BZ_ROGUESHOP`：键或值等于 2 的条目命中 1 次，样本为 hotfix-patch/core/bz-tasks.generated.js:23 `{"id":2,"item":9630,"costitem":9673,"cost":50,"num":2,"refresh":2,"rank":0,"reputation":0,"closetime":0}`（商品为 9630，非商品 2 / buff 1043）。
- 结论：商城商品 2（tools/cfg/dump/mall.json:2 `{"ID":2,"Type":2,"Data":[1043,86400]}`) 不在任何一张我们发出的货架里（我们未实现商城 mall 货架导出与 RPC handler）。

## 任务 3：buyShopItem 等发放分流源码逐字摘录与分支判定
hotfix-patch/core/bz-rpc-server.js:489-495：
```javascript
    if (itemTypeOf(iid) === 1) {
      var cur = Array.isArray(s.playerEquip[iid]) ? (parseInt(s.playerEquip[iid][1], 10) || 0) : 0;
      s.playerEquip[iid] = [1, cur + cnt];
    } else {
      bagAdd(s, iid, cnt);
    }
```
hotfix-patch/core/bz-rpc-server.js:1987-1991：
```javascript
      if (itemTypeOf(itemID) === 1) {
        note.eqch[itemID] = [1, s.playerEquip[itemID]];
      } else {
        note.ivch[itemID] = parseInt(s.bag[itemID], 10) || 0;
      }
```
- 分支判定与结论：若 itemID 在 `BZ_ITEMTYPE` 里查不到，`itemTypeOf(itemID)` 返回 0（hotfix-patch/core/bz-rpc-server.js:442），会走 `else` 分支落入背包 `bagAdd(s, iid, cnt)` 并生成 `note.ivch`；不会静默什么都不发，而是当作普通道具塞进背包。

## 任务 4：useItem Effect 分流与 Effect 23 物品检索
hotfix-patch/core/bz-rpc-server.js:1819-1826：
```javascript
      if (fun) {
        var k = String(fun.k || '');
        var a = parseInt(fun.a, 10) || 0;
        if ((k === 'hp' || k === 'mp') && a > 0) {
          note.skch = { k: k, v: a * use };
          env.log('useItem ' + p.itemID + ' 恢复 ' + k + ' +' + (a * use));
        }
      }
```
- useItem 认识的 Effect 码：不识别任何 Effect 码（只读 `BZ_ITEMFUN` 中的 k/a 字段，即仅支持 hp 与 mp 恢复）。
- tools/cfg/dump/item.json 中 `Effect` 等于 23 的物品（共 3 条，无中文文本表仅保留 Name 标识）：
  1. tools/cfg/dump/item.json ID: 3316, Name: 32316
  2. tools/cfg/dump/item.json ID: 4567, Name: 33567
  3. tools/cfg/dump/item.json ID: 6623, Name: 2101846
