# M4 `note` 五子表语义表

> 数据源：客户端三包（`tools\index.js` 149,447 行 / `scripts2.js` 81,775 行 / `scripts3.js` 100,428 行）＋ `hotfix-patch\core\bz-rpc-server.js`。
> 探针：本目录 `_probe_note.js`、`_probe_note2.js`（可原样重跑）。
> 行号均为 1-based。

---

## 0. 机制（先看这条，五子表的一切行为都由它决定）

**总闸** `index.js:59325`：

```js
if (g.p) {
  var I = g.p;                                        // 59324  I = 协议名，如 "User.upgradeSkill"
  if (g[I].note) for (var E in g[I].note) f.MessageCenter.dispatch(E, g[I].note[E]);   // 59325
  ...
  f.MessageCenter.dispatch(I, b ? g : g[I]);          // 59332  再把整个应答按协议名派发一次
}
```

⇒ **`note` 的每个键名本身就是一个 MessageCenter 事件名**，值就是该事件的 payload。子表不是"数据结构"，是**事件通道**。

**五个键名即五个事件常量**（`index.js:59569-59580`，属 `HttpConst`/`EvName` 同一命名空间）：

```js
59569: INVENTORY_CHNG: "ivch",
59570: ECONOMY_CHNG:   "eco",
59571: ATTR_CHANGE:    "attrch",
59572: EQ_CHNG:        "eqch",
59580: SKILL_CHANGE:   "skch",
```

三条直接后果（都可在代码里验证）：

1. **`note` 里的键一旦拼错，不会报错，只是没人听。** 客户端 `for..in` 无条件 dispatch，没有白名单校验。
2. **子表事件与协议应答事件同名空间**。`HttpConst.INVENTORY_CHNG === "ivch"`，所以 `MessageCenter.on(a.HttpConst.INVENTORY_CHNG, ...)`（64674）既可能是"某协议应答"也可能是"`note.ivch`"——实际两者是同一个监听器。
3. **子表在协议应答之前派发**（59325 早于 59332）。所以监听器看到 `ivch` 时，协议处理函数还没跑。

---

## 1. `ivch`（INVENTORY_CHNG）— 背包物品，**绝对值**

| 项 | 内容 |
|---|---|
| 形态 | `{ "<itemID>": <变更后的绝对数量> }` |
| 消费者的赋值方式 | `e.setItem(parseInt(n), o[n])` —— **赋值**，不是累加 |
| 主消费点 | `index.js:64674-64677` |
| 原文 | `64674: r.MessageCenter.on(a.HttpConst.INVENTORY_CHNG, function(t, o) {`<br>`64675: for (var n in o) i.getItem(n, "lh_temporary") ? b.TowerModel.setItem(n, o[n]) : e.setItem(parseInt(n), o[n]);`<br>`64676: w.TaskModel.taskTrack(w.TaskModel.trackTaskId);`<br>`64677: }, this);` |
| 次消费点（当"格子 id"用） | `index.js:64730`（SELL_ITEM）、`64747`（BUY_SHOP_ITEM）——只取**第一个键**当 `itemId` 派发给 `SHOP_BUY_ITEM`，不读值：<br>`64730: ... for (var n in o.note.ivch) i = Number(n); else if (o.note.hasOwnProperty("eqch") ...` |
| 次消费点（当奖励显示用） | `index.js:64914-64916`（ADD_ITEM）：`var i = o.note.ivch; v.default.addShowRewardUI1(i, 0);`——直接把整张表当 `{itemID: num}` 奖励列表渲染 |
| rogue 模式 | `scripts3.js:73882-73884`：`case "ivch": for (var p in c) t.setItem(parseInt(p), c[p]);`（rogue 分发器走 `HttpConst.ROGUE_CHNG`，其 payload 里再嵌 `ivch`/`eqch`/`eco`/`attrch`，见 `scripts3.js:72040-72053` 的 testFunc 样例） |
| 我方写者 | `saleItem`（L2379）、`buyShopItem`（L2421）、`buySpecialShopItem`（L2470）、`BuyAcitivityShop`（L2546）、`exchangeItem`（L2619-2624）、`buyGoodAndEvilShopItem`（L2676）、`rgShopByItem`（L2726）、`QuickBuyItem`（L2755）、`BuyFashion`（L1839）、`useItem`（L2270）、书路径 `upgradeSkill`（L1389） |
| 已知坑 | 发增量会污染客户端背包（客户端是赋值）。`bz-rpc-server.js:2347` 注释、`2168` 注释都记了这条。 |

---

## 2. `eqch`（EQ_CHNG）— 装备实例账本，两种形态

| 项 | 内容 |
|---|---|
| 形态 | `{ "<uid>": [0] }` = 删除；`{ "<uid>": [1, [type, num, (weaponSkinId)]] }` = 新增/更新 |
| 主消费点 | `index.js:64678-64694` |
| 原文 | `64679: for (var i in o) if (0 == o[i][0]) {`<br>`64680:   e.deleteEq(parseInt(i));`<br>`64681:   e.setItemChecked([ parseInt(i) ], 1);`<br>`64682: } else {`<br>`64683:   var n = e.getEquipmentInfo(parseInt(i));`<br>`64684:   if (n && 1 == n.type) {`<br>`64685:     n.num = o[i][1][1];`<br>`64686:     o[i][1].length > 2 && (n.weaponSkinId = o[i][1][2]);`<br>`64687:   } else {`<br>`64688:     var r = e.parseEq(parseInt(i), o[i][1]);`<br>`64689:     e.equipmentDic.hasOwnProperty(i) && ... \|\| e.signNewItems([ i ], 1);`<br>`64690:     e.addEq(r);` |
| 取值细节 | 数量在 `o[i][1][1]`（第二层第二个），皮肤在 `o[i][1][2]`；`[0]` 为 0 时**不看后面的内容**，直接删 |
| 次消费点 | `index.js:64730/64747`（只取第一个键当 `itemId`）；`64917-64920`（ADD_ITEM：`var r = o.note.eqch, a = {}; for (var s in r) a[s] = r[s][1];` —— 这里把 `r[s][1]` 当数量渲染，**与 64685 的 `o[i][1][1]` 不是同一层**） |
| rogue 模式 | `scripts3.js:73886-73896` |
| 我方写者 | `BuyFashion`（L1859 `note.eqch[gr.id] = [1, clone(s.playerEquip[gr.id])];`）、`saleItem`（L2341 `eqch[id] = (leftE > 0) ? [1, s.playerEquip[id]] : [0];`）、各商店动作（L2423/2471/2547/2623/2677/2728/2756） |
| 已知坑 | `bz-rpc-server.js:1765` 注释：时装（`parseEq` 进来的实例）**必须先 `note.eqch` 塞进客户端装备账本**，否则 `.id` 抛异常。 |

---

## 3. `eco`（ECONOMY_CHNG）— 钱包，按子键分派

| 项 | 内容 |
|---|---|
| 形态 | `{ "<子键>": <绝对值> }` |
| 主消费点 | `index.js:64698-64724`，`switch(o)` 逐子键赋值 |
| 已证子键 | `coins`→`RoleBaseInfo.coins`（64700-64701）／`ptt`→`RoleBaseInfo.potentials`（64704-64705）／`gold`→`RoleBaseInfo.gold`（64708-64709）／`exp`→`playerInfo.entity.exp` 与 `RoleBaseInfo.exp`（64712-64714）／`chips`→`RoleBaseInfo.chipNum`（64717-64718）／`yuanbao`→`RoleBaseInfo.yuanbao`（64721-64722） |
| 附带动效 | 64724 `r.MessageCenter.dispatch(s.EvName.SHOP_BUY_ITEM);` —— 每次 `eco` 都会额外派一次 `SHOP_BUY_ITEM` |
| 次消费点 | `scripts3.js:23125`（BUTLER_DISPATCH）：`l.RoleBaseInfo.yuanbao = o.note.eco.yuanbao;` —— **直接取值不判空**，缺 `yuanbao` 会赋 `undefined` |
| rogue 模式 | `scripts3.js:73917-73922`：`case "eco": if (c.hasOwnProperty("coins")) { i.RogueRoleInfo.coins = c.coins; ...dispatch(ROGUE_REFRESH_COINS); }`，**rogue 只认 `coins`** |
| 我方写者 | `saleItem`（L2379 `eco: { coins: s.coins }`）、`buyShopItem`（L2421）、`buySpecialShopItem`（L2470 `{ gold: s.gold }`）、`BuyAcitivityShop`（L2546）、`exchangeItem`（L2622 `note.eco = ecoGain`）、`QuickBuyItem`（L2755）、`BuyFashion`（L1839）、`upgradeSkill`（L1357/1387/1409/1416/1426 `{ ptt: pot }`） |
| 已知坑 | 货币**不进 `ivch`**：客户端取货币只认 `RoleBaseInfo.getItemNum`（`bz-rpc-server.js:2622` 注释）。 |

---

## 4. `skch`（SKILL_CHANGE）— 技能三元组，且"0 级"是删除信号

| 项 | 内容 |
|---|---|
| 形态 | `{ "<skillID>": [lv, upgrdPgr, brlv] }` |
| 主消费点 | `index.js:119828-119841` |
| 原文 | `119829: for (var o in e) {`<br>`119830:   var n = parseInt(o);`<br>`119831:   if (e[o][0] > 0) {`<br>`119832:     s.SkillTable.setSkill(n, e[o][0]);`<br>`119833:     s.SkillTable.setUpgrdPgr(n, e[o][1]);`<br>`119834:     s.SkillTable.setBrLv(n, e[o][2]);`<br>`119835:   } else 0 == e[o][0] && s.SkillTable.abolishSkill(n);` |
| **关键语义** | `e[o][0] == 0` ⇒ **`abolishSkill` 删技能**。所以下发 `lv=0` 不是"没升级"，是"删掉这个技能"。 |
| 次消费点（只弹提示、不写模型） | `index.js:64757-64763`（USE_ITEM）：`if (a.note.hasOwnProperty("skch")) { var h = a.note.skch, u = 0; for (var f in h) u = Number(f); if (u > 0) { var d = i.getItem(u, "skill"); c.default.show(n.getText(422).replace(/\[67\]/g, n.getText(d.Name))); } }` —— 只取**第一个键**去弹「恭喜你学会了[67]」，**不读三元组** |
| rogue 模式 | `scripts3.js:73899-73910`（`case "skch"`）、`73950-73956`（ROGUE_USE_ITEM 同款弹窗） |
| 我方写者 | `upgradeSkill`（L1388 `bookNote.skch[id] = [newLv, 0, newBrlv];`、L1417 `kept.skch[id] = [curLv, keptPgr, keptBrlv];`、L1427 `note.skch[id] = [lv, reqPgr, reqBrlv \|\| 1];`）、`useItem`（L2189 `note.skch[pendingSkill] = [1, 0, 1];`）、`joinSchool`（L1296 空表） |
| 已知坑 | `bz-rpc-server.js:1400-1409`：**绝不下发 `lv=0` 的 `skch`**，否则客户端把技能删了（`setSkill` 不过滤 0，L1401 注释）。 |

---

## 5. `attrch`（ATTR_CHANGE）— 属性变更，键最多的一张

| 项 | 内容 |
|---|---|
| 形态 | `{ "<属性名>": <绝对值> }` |
| 主消费点 | `index.js:142390-142440+`，`switch(i)` |
| 已证子键 | `mpTrained`→`entity.mpTrainedBonus.baseValue`（142392-142395，且被 `SkillUtils.getMaxNGBonus()` 夹住）／`mpbase`→`entity.mp.baseValue`（142398）／`hpbase`→`entity.hp.baseValue`（142402）／`curmp`→`entity.mp.setRemaining`（142406）／`curhp`→`entity.hp.setRemaining`（142410）／`hplmt`→`entity.hp.setLimit`（142414）／`exp`→`entity.exp`（142418）／`evil`→`entity.evilness`（142422）／`school`→`entity.school` + `RoleBaseInfo.school`（142426）／`seniorSchool`→`RoleBaseInfo.goodEvilCamp`（142431）／`ndeath`→`entity.numDeaths` + `RoleBaseInfo.numDeaths`（142435）／`hunger`→（142440 起，`case "hunger"` 直接赋值，客户端不做本地应用） |
| 另一处只认单键 | `index.js:64779-64782`（USE_ITEM）：`if (a.note.hasOwnProperty("attrch") && a.note.attrch.hasOwnProperty("mpTrained")) { l.RoleBaseInfo.mpTrained = a.note.attrch.mpTrained; }` |
| 第三处只认单键 | `index.js:138892`（END_DAZUO）：`o.note.hasOwnProperty("attrch") && o.note.attrch.hasOwnProperty("mpTrained") && (d.RoleBaseInfo.mpTrained = o.note.attrch.mpTrained);` |
| rogue 模式 | `scripts3.js:73924-73926`（`case "attrch": t.chAttr(c);`）、`73968-73970`（`i.RogueRoleInfo.mpTrained = o.note.attrch.mpTrained;`） |
| rogue 的另一套子键 | `scripts3.js:72044-72048` 的样例：`attrch: { curhp: 13696, curmp: 7300, hplmt: 13696 }` |
| 我方写者 | `useItem`（L2212 `note.attrch = { hunger: newHg };`、L2230 `curhp`、L2240 `curmp`）、`joinSchool`（L1296 空表） |
| 已知坑 | `bz-rpc-server.js:44`：`hg` 非法就**不发** `note.attrch`，绝不把脏值写进客户端模型；L2196 说明：非数字/负数/超 `1e7` 一律记日志跳过。 |

---

## 6. 汇总表

| 子表 | 事件名 | 键 | 值 | 客户端主消费点 | "绝对值 vs 增量" | 我方是否已发 |
|---|---|---|---|---|---|---|
| `ivch` | `"ivch"` | `itemID` | 绝对数量 | `index.js:64674` | **绝对值（赋值）** | 是（10 个 handler） |
| `eqch` | `"eqch"` | `uid` | `[0]` 或 `[1,[type,num,skin?]]` | `index.js:64678` | 全量覆盖/删除 | 是（9 个 handler） |
| `eco` | `"eco"` | `coins/ptt/gold/exp/chips/yuanbao` | 绝对数量 | `index.js:64698` | **绝对值** | 是（8 个 handler） |
| `skch` | `"skch"` | `skillID` | `[lv, pgr, brlv]` | `index.js:119828` | 全量覆盖；`lv=0` = **删技能** | 是（`upgradeSkill`/`useItem`） |
| `attrch` | `"attrch"` | 属性名（12+ 个已证） | 绝对数量 | `index.js:142390` | **绝对值** | 是（`useItem` 的 hunger/curhp/curmp） |

`note` 本身为空对象 `{}` 时客户端行为：总闸 `for..in` 零次迭代，不派任何事件（`bz-rpc-server.js` 多处 `note: {}` 即走这条）。

---

## 7. 未验证 / 未覆盖

1. `index.js:64698` 与 `142390` 的两个 `switch` 未读到 `}` 结尾，子键清单可能还有未列出的（本轮只读到 64724 / 142440）。
2. `scripts2.js` 内**零命中**五个 token（0 处），但这不等于 scripts2 不消费——它可能通过 `EvName.*` 常量间接引用，本轮未做常量展开。
3. `note` 里除这五个之外还有没有其它键被服务端用过（例如 `autoObj` 是同级而非 note 内），未穷举。
4. `skch` 三元组第三个值 `brlv` 的合法范围（我方向下发了 `brlv: 0`，见 `bz-rpc-server.js:1388`），客户端 `setBrLv` 是否接受 0，未取证。
