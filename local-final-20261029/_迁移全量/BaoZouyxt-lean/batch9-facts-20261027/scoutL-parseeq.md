# scoutL — parseEq 读点逐行摘录（只摘录，不推断）

取证对象：`F:\BaoZouyxt\tools\index.js`（4,512,911 B / 149,447 行）、`tools\scripts2.js`、`tools\scripts3.js`。
方法：先 `grep parseEq`（index.js 28 命中；scripts2.js 8 命中；scripts3.js 17 命中），再对每个命中用 read 工具带 offset/limit 取原文。文中所有行号均来自 read 工具输出的行号。

grep 全量命中（index.js，28 条，含定义）：

```
15066, 24317, 24326, 24370, 24373, 43747, 64688, 65075, 65077, 65082, 65117, 65485,
66282, 74789, 103832, 106820, 106833, 106858, 106975, 106993, 107822, 107829, 107833,
111879, 113187, 113191, 113195, 137704
```

其中 `43747` / `65117` / `66282` 是定义（`65075` 是 `parseEqData` 定义），其余 24 处是调用。

---

# 1 parseEq 定义

## 1.1 主定义：`InventoryModel.prototype.parseEq`（tools/index.js:65117）

模块头（InventoryModel 模块，tools/index.js:64635-64642）：

```
64635: InventoryModel: [ function(t, e, o) {
64636: "use strict";
64637: cc._RF.push(e, "055eamtISdFDZorrB9mYBKN", "InventoryModel");
64638: Object.defineProperty(o, "__esModule", {
64639: value: !0
64640: });
64641: o.InventoryModel = void 0;
64642: var i = t("../gameconfigs/CFMgr"), n = t("../gameconfigs/LangMgr"), r = t("../core/events/MessageCenter"), a = t("../net/HttpConst"), s = t("../utils/EvName"), l = t("./vos/RoleBaseInfo"), ...（长行，中段以 … 省略）... f = t("./vos/EqItem"), d = t("./InventoryDB"), ... H = function() {
```

实例化（tools/index.js:65886）：`o.InventoryModel = new H();`

函数体（tools/index.js:65117-65136，逐行原文）：

```
65117: e.prototype.parseEq = function(t, e) {
65118: var o = new f.EqItem();
65119: o.id = t;
65120: o.type = e[0];
65121: if (1 == o.type) {
65122: o.itemID = o.id;
65123: o.num = e[1];
65124: e[2] && (o.weaponSkinId = e[2]);
65125: } else {
65126: o.itemID = e[1];
65127: o.num = 1;
65128: o.attrs = e[2];
65129: var i = 0;
65130: for (var n in o.attrs) ++i;
65131: o.numAttr = i;
65132: e[3] && (o.crystalIds = e[3]);
65133: e[4] && (o.weaponSkinId = e[4]);
65134: }
65135: return o;
65136: };
```

签名：`parseEq(t, e)`，`t` 是 uid（直接赋给 `o.id`，**此处不 parseInt**），`e` 是"装备实例"数组（`e[0]` … `e[4]`）。

返回值构造类型 `EqItem`（tools/index.js:43634-43650 + num 访问器 43652-43659）：

```
43642: function t() {
43643: this.id = 0;
43644: this.type = 0;
43645: this.itemID = 0;
43646: this.attrs = null;
43647: this.numAttr = 0;
43648: this.crystalIds = null;
43649: this.weaponSkinId = 0;
43650: this._num = new i("eqn");
43651: }
43652: Object.defineProperty(t.prototype, "num", {
43653: get: function() {
43654: return this._num.value;
43655: },
43656: set: function(t) {
43657: t = parseInt(t);
43658: this._num.value = t;
43659: },
```

即 `num` 是 setter，写入时 `parseInt`。

同模块内的两个包装（tools/index.js:65075-65086）：

```
65075: e.prototype.parseEqData = function(t) {
65076: for (var e in t) {
65077: var o = t[e], i = this.parseEq(parseInt(e), o);
65078: this.addEq(i);
65079: }
65080: };
65081: e.prototype.updateEq = function(t, e) {
65082: var o = this.parseEq(t, e);
65083: this.equipmentDic.hasOwnProperty(t) || this.signNewItems([ t ], 1);
65084: this.deleteEq(t);
65085: this.addEq(o);
65086: };
```

`parseEqData(t)` 的入参形态：`{uid: 装备实例数组}`，键 `parseInt` 后作为第一参数。

## 1.2 `ItemUtils.parseEq`（tools/index.js:66282）——战斗实体这条路用的是这一份

模块头（tools/index.js:66212-66215）：`cc._RF.push(e, "e03c54sk+FM9IDfzUR3RW9s", "ItemUtils");` / `var o = t("./ConfigMgr"), i = {`。
模块导出（tools/index.js:66378）：`e.exports = i;`

函数体（tools/index.js:66282-66305，逐行原文）：

```
66282: parseEq: function(t, e) {
66283: if (!e) return {
66284: itemID: t,
66285: num: 1
66286: };
66287: var o = {};
66288: o.id = parseInt(t);
66289: o.type = e[0];
66290: if (1 == o.type) {
66291: o.itemID = o.id;
66292: o.num = e[1];
66293: e[2] && (o.weaponSkinId = e[2]);
66294: } else {
66295: o.itemID = e[1];
66296: o.num = 1;
66297: o.attrs = e[2];
66298: var i = 0;
66299: for (var n in o.attrs) ++i;
66300: o.numAttr = i;
66301: o.crystalIds = e[3] ? e[3] : null;
66302: e[4] && (o.weaponSkinId = e[4]);
66303: }
66304: return o;
66305: },
```

与 1.1 的差异（原文对比即可见）：① `if (!e)` 兜底返回；② `o.id = parseInt(t)`；③ `o.crystalIds = e[3] ? e[3] : null`（无条件赋值）；④ 返回普通对象而非 `EqItem`。

## 1.3 `EqUtils.prototype.parseEq`（tools/index.js:43747）

模块头（tools/index.js:43670-43677）：`EqUtils: [ function(t, e, o) {` … `var i = t("../models/InventoryModel"), ... h = function() {`。
模块导出（tools/index.js:44411）：`o.EqUtils = new h();`

函数体（tools/index.js:43747-43763，逐行原文）：

```
43747: t.prototype.parseEq = function(t, e) {
43748: var o = {};
43749: o.id = parseInt(t);
43750: o.type = e[0];
43751: if (1 == o.type) {
43752: o.itemID = o.id;
43753: o.num = e[1];
43754: } else {
43755: o.itemID = e[1];
43756: o.num = 1;
43757: o.attrs = e[2];
43758: var i = 0;
43759: for (var n in o.attrs) ++i;
43760: o.numAttr = i;
43761: }
43762: return o;
43763: };
```

只读 `e[0] / e[1] / e[2]`，无 `[3] / [4]`。
**grep 事实**：`parseEq` 的 28 条 index.js 命中里，没有任何一条是 `EqUtils.parseEq(` 形式的调用（`EqUtils` 只被调用 `equipChangeNormalEq`、`getEquipOrUid`、`isDemonedEquip`、`equipNum` 等）。

## 1.4 另外两处同构定义（不在 index.js 主链，但读同一形状）

`RogueRoleInfo.prototype.parseEq`（tools\scripts3.js:73482-73498）：

```
73482: t.prototype.parseEq = function(t, e) {
73483: var o = new m.EqItem();
73484: o.id = t;
73485: o.type = e[0];
73486: if (1 == o.type) {
73487: o.itemID = o.id;
73488: o.num = e[1];
73489: } else {
73490: o.itemID = e[1];
73491: o.num = 1;
73492: o.attrs = e[2];
73493: var i = 0;
73494: for (var s in o.attrs) ++i;
73495: o.numAttr = i;
73496: }
73497: return o;
73498: };
```

`parseStorageEq`（仓库，tools/index.js:77104-77122，非 parseEq 名称但同一读法）：

```
77104: e.prototype.parseStorageEq = function(t, e) {
77105: var o = new l.EqItem();
77106: o.id = parseInt(t);
77107: o.type = e[0];
77108: if (1 == o.type) {
77109: o.itemID = o.id;
77110: o.num = e[1];
77111: } else {
77112: o.itemID = e[1];
77113: o.num = 1;
77114: o.attrs = e[2];
77115: var i = 0;
77116: for (var n in o.attrs) ++i;
77117: o.numAttr = i;
77118: e[3] && (o.crystalIds = e[3]);
77119: e[4] && (o.weaponSkinId = e[4]);
77120: }
77121: return o;
77122: };
```

---

# 2 全部调用点

调用点来源分两类：**A = 从服务端下发数据（`t.equips[...]`）取值**；**B = 从本地 `InventoryModel` / `PlayerEquip` / `equipmentDic` 取值**。

| # | 调用行 | 所在函数 | 第二参数来源 | 类别 |
|---|---|---|---|---|
| 1 | tools/index.js:15066 | `o.prototype.setRewards`（15055） | `o[l]`，`o = t.equips`（15056） | A |
| 2 | tools/index.js:24317 | `e.prototype.start`（24309） | `t.equips[o]`，`o = t.equipments[e]`（24315） | A |
| 3 | tools/index.js:24326 | `e.prototype.start`（24309） | `t.equips[o]`，`o = t.equipments[e]`（24315） | A |
| 4 | tools/index.js:24370 | `e.prototype.onShowInfo`（24366） | `this.equipmentData[e]`，`equipmentData = t.equips`（24351） | A |
| 5 | tools/index.js:24373 | `e.prototype.onShowInfo`（24366） | `this.equipmentData[this.equipIdAy[r].id]`（24371） | A |
| 6 | tools/index.js:64688 | `e.prototype.init` 的 `EQ_CHNG` 回调（64672/64678） | `o[i][1]`（服务端增量推送，非 equips） | A |
| 7 | tools/index.js:65077 | `e.prototype.parseEqData`（65075） | `t[e]`（`PlayerEquip`） | B |
| 8 | tools/index.js:65082 | `e.prototype.updateEq`（65081） | 调用方传入（index.js 内 updateEq 调用点：111811 `t.equips[e]`） | B |
| 9 | tools/index.js:65485 | `e.prototype.killRewardEq`（65484） | 调用方传入（本次未定位） | B |
| 10 | tools/index.js:74789 | `createPlayerBattleEntity`（74766，MadUtils 模块 74593） | `t.equips[i]` / `t.tempEquips[i]`，`i = t.equipments[o]`（74785-74789） | A |
| 11 | tools/index.js:103832 | `e.prototype.addEquip`（103831） | `this.rewardEquip[o]`（103819） | A |
| 12 | tools/index.js:106820 | `RoleInfoUI.SetBaseInfo`（106769） | `t.equips[w]`，`w = t.equipments[1]`（106818） | A |
| 13 | tools/index.js:106833 | `RoleInfoUI.SetBaseInfo`（106769） | `t.equips[t.equipments[q]]`（106832） | A |
| 14 | tools/index.js:106858 | `RoleInfoUI.SetBaseInfo`（106769） | `t.equips[z]`，`z = t.equipments[J]`（106856） | A |
| 15 | tools/index.js:106975 | `RoleInfoUI.getRealAgeNum`（106968） | `r[l]`，`r = t.equips`，`l = n[s]`（106969/106973） | A |
| 16 | tools/index.js:106993 | `RoleInfoUI.checkRealAgeState`（106986） | `r[l]`（106987/106991） | A |
| 17 | tools/index.js:107822 | `RoleOtherInfo.getOtherInfoData`（107818） | `n[p]`，`n = t.equips`，`p = i[1]`（107820-107821） | A |
| 18 | tools/index.js:107829 | `RoleOtherInfo.getOtherInfoData`（107818） | `n[f]`，`f = i[8]`（107827-107828） | A |
| 19 | tools/index.js:107833 | `RoleOtherInfo.getOtherInfoData`（107818） | `n[d]`，`d = i[9]`（107831-107832） | A |
| 20 | tools/index.js:111879 | `SaveDataMgr.updatePlayerData`（111820） | `e.PlayerEquip`（111879） | B |
| 21 | tools/index.js:113187 | `addChiefDiscipleNpc`（113171） | `r[h]`，`r = t.equips`，`h = n[1]`（113184-113186） | A |
| 22 | tools/index.js:113191 | `addChiefDiscipleNpc`（113171） | `r[f]`，`f = n[8]`（113189-113190） | A |
| 23 | tools/index.js:113195 | `addChiefDiscipleNpc`（113171） | `r[m]`，`m = n[9]`（113193-113194） | A |
| 24 | tools/index.js:137704 | `TOWER_LEAVE_EVENT` 回调（137698） | `o.PlayerEquip`（137704） | B |

## 2.A 从服务端玩家数据 `t.equips[...]` 取值（第二参数 = 待构造物）

### tools/index.js:15066 — `setRewards`（奖励面板，`t.equips` 是奖励装备表）

```
15055: o.prototype.setRewards = function(t) {
15056: var e = t.rewards, o = t.equips, i = t.materias;
...
15065: if (o) for (var l in o) {
15066: var c = h.InventoryModel.parseEq(parseInt(l), o[l]), p = E.EqUtils.equipChangeNormalEq(l, c), u = a.getItem(c.itemID, "item"), f = s.getText(u.Name);
15067: f += h.InventoryModel.getEqQuality(c.numAttr);
...
15071: S.string = s.getText(f) + " x" + c.num;
```

### tools/index.js:24317 / 24326 / 24351 / 24370 / 24373 — `CheckRoleEquipUI`（看别人装备 UI）

`setData`（24349-24360）：

```
24349: e.prototype.setData = function(t) {
24350: this.obj = t;
24351: this.equipmentData = t.equips;
24352: if (t.gemData) {
...
24359: this.inhertEquip = t.ohterInfo.inherit ? t.ohterInfo.inherit : {};
24360: };
```

`start`（24309-24338）：

```
24313: var t = this.obj;
24314: if (t.equipments) for (var e in t.equipments) {
24315: var o = t.equipments[e];
24316: if (parseInt(e) < 8 && o > 0) {
24317: var i = a.InventoryModel.parseEq(o, t.equips[o]);
24318: if (l.getItem(i.itemID, "item")) {
24319: var n = {
24320: id: o,
24321: name: c.PackageModel.showEquipName(i, t.ohterInfo.inherit)
24322: };
...
24325: } else if (parseInt(e) >= 8 && o > 0) {
24326: var r = a.InventoryModel.parseEq(o, t.equips[o]);
```

`onShowInfo`（24366-24412）：

```
24369: if (t < 7) {
24370: for (var e = this.equipIdAy[t].id, o = this.equipmentData[e], i = a.InventoryModel.parseEq(e, o), n = p.EqUtils.equipChangeNormalEq(e, i), r = 0; r < this.equipIdAy.length; r++) {
24371: var s = this.equipmentData[this.equipIdAy[r].id];
24372: if (null != s) {
24373: var c = a.InventoryModel.parseEq(this.equipIdAy[r].id, s), u = p.EqUtils.equipChangeNormalEq(this.equipIdAy[r].id, c);
24406: this.setItemEquipDes(p.EqUtils.getOtherEqDes(n, this.inhertEquip, this.effectTypeNum, this.materias));
```

### tools/index.js:64688 — `InventoryModel.init` 的 `EQ_CHNG` 增量推送

```
64678: r.MessageCenter.on(a.HttpConst.EQ_CHNG, function(t, o) {
64679: for (var i in o) if (0 == o[i][0]) {
64680: e.deleteEq(parseInt(i));
64681: e.setItemChecked([ parseInt(i) ], 1);
64682: } else {
64683: var n = e.getEquipmentInfo(parseInt(i));
64684: if (n && 1 == n.type) {
64685: n.num = o[i][1][1];
64686: o[i][1].length > 2 && (n.weaponSkinId = o[i][1][2]);
64687: } else {
64688: var r = e.parseEq(parseInt(i), o[i][1]);
64689: e.equipmentDic.hasOwnProperty(i) && r.itemID == e.equipmentDic[i].itemID || e.signNewItems([ i ], 1);
64690: e.addEq(r);
```

（此处第二参数是 `o[i][1]`，即推送体是 `{uid: [_, 装备实例数组, ...]}` 形状；`[1]` 取到数组后交给 parseEq。）

### tools/index.js:74789 — `createPlayerBattleEntity`（AttckData 那条，详见 §4）

```
74766: createPlayerBattleEntity: function(t) {
...
74785: for (var o in t.equipments) {
74786: var i = t.equipments[o];
74787: if (i) {
74788: var n = null, a = t.equips[i];
74789: a ? n = c.parseEq(i, a) : t.tempEquips && t.tempEquips[i] && (n = c.parseEq(i, t.tempEquips[i]));
74790: if (n) {
74791: var l = t.inherit && t.inherit.hasOwnProperty(i) ? t.inherit[i][0] : 0;
74792: e.putOnEquipment(new s(n, l), parseInt(o));
74793: n.hasOwnProperty("weaponSkinId") && n.weaponSkinId && (e.weaponskinId = n.weaponSkinId);
74794: }
74795: }
74796: }
```

该模块（MadUtils，74593）的导入（tools/index.js:74624）：

```
74624: var r = t("../battlesystem/attributesystem/FinalBonus"), a = t("../battlesystem/attributesystem/RawBonus"), s = t("../battlesystem/Equipment"), l = t("../battlesystem/EquipmentType"), c = t("../battlesystem/ItemUtils"), p = t("../battlesystem/skillsystem/spells/SpellGroup"), h = t("../battlesystem/PlayerBattleEntity"), ...
```

→ 这里的 `c.parseEq` 是 **ItemUtils.parseEq**（§1.2），不是 InventoryModel.parseEq。

### tools/index.js:103832 — `addEquip`

```
103831: e.prototype.addEquip = function(t, e) {
103832: var o = c.InventoryModel.parseEq(t, e), i = h.EqUtils.equipChangeNormalEq(t, o);
103833: this._itemName.push([ p.PackageModel.getEquipOrItemName(i), p.PackageModel.getItemLabelColor(i) ]);
103834: this._numArray.push(o.num);
103835: };
```

调用方（tools/index.js:103819）：`for (var o in this.rewardEquip) this.addEquip(o, this.rewardEquip[o]);`

### tools/index.js:106820 / 106833 / 106858 — `RoleInfoUI.SetBaseInfo`

```
106769: o.prototype.SetBaseInfo = function(t) {
...
106817: var w = 0;
106818: t.hasOwnProperty("equipments") && t.equipments && (w = t.equipments.hasOwnProperty(c.WEAPON) ? t.equipments[c.WEAPON] : 0);
106819: var L = 0;
106820: w && (L = m.InventoryModel.parseEq(w, t.equips[w]).itemID);
```

```
106830: if (t.hasOwnProperty("WeapToSkill") && t.WeapToSkill) {
106831: for (var G in t.WeapToSkill) {
106832: if (t.hasOwnProperty("equipments") && t.equipments) for (var q in t.equipments) if (null != t.equipments[q] && 0 != t.equipments[q]) {
106833: var V = m.InventoryModel.parseEq(t.equipments[q], t.equips[t.equipments[q]]).itemID;
```

```
106855: if (t.hasOwnProperty("equipments") && t.equipments) for (var J in t.equipments) {
106856: var z = t.equipments[J];
106857: if (z) {
106858: var X, Z = m.InventoryModel.parseEq(z, t.equips[z]);
106859: (X = h.getItem(Z.itemID, "item")) && (Q += y.PackageModel.showEquipName(Z, t.ohterInfo.inherit) + "  ");
```

`t` 绑定：`setData(t, e)` 里 `this.roleInfo = t`（tools/index.js:106706-106708），`SetBaseInfo(this.roleInfo)`（106712）。

### tools/index.js:106975 / 106993 — 直接读 `[2][19]`（不经 parseEq 的二级读）

`getRealAgeNum`（106968-106985）：

```
106968: o.prototype.getRealAgeNum = function(t, e, o) {
106969: var i = e - o, n = t.equipments, r = t.equips, a = 0;
106970: if (t.skillMap.hasOwnProperty(1124)) {
106971: a = t.skillMap[1124][0];
106972: for (var s in n) if (n[s]) {
106973: var l = n[s];
106974: if (r.hasOwnProperty(l) && 2 == r[l][0] && r[l][2].hasOwnProperty(19) && 1124 == r[l][2][19][0]) {
106975: var c = O.parseEq(l, r[l]), p = r[l][2][19];
106976: a += O.getFluctdBonusVByType(19, p[1], c.itemID, c.numAttr);
106977: }
106978: }
```

`checkRealAgeState`（106986-107002）：

```
106986: o.prototype.checkRealAgeState = function(t, e, o) {
106987: var i = e - o, n = t.equipments, r = t.equips, a = 0;
106988: if (t.skillMap.hasOwnProperty(1124)) {
106989: a = t.skillMap[1124][0];
106990: for (var s in n) if (n[s]) {
106991: var l = n[s];
106992: if (r.hasOwnProperty(l) && 2 == r[l][0] && r[l][2].hasOwnProperty(19) && 1124 == r[l][2][19][0]) {
106993: var c = O.parseEq(l, r[l]), p = r[l][2][19];
106994: a += O.getFluctdBonusVByType(19, p[1], c.itemID, c.numAttr);
106995: }
106996: }
```

（`O = t("../../battlesystem/ItemUtils")`，见 tools/index.js:106591 → 仍是 ItemUtils.parseEq。）

### tools/index.js:107822 / 107829 / 107833 — `RoleOtherInfo.getOtherInfoData`

```
107818: e.prototype.getOtherInfoData = function(t) {
107819: if (t.hasOwnProperty("ohterInfo")) {
107820: var e = t.ohterInfo, o = l.calAppearance(e.baseGengu, e.numDeaths, e.appearBase), i = t.equipments, n = t.equips, a = 0, s = 0, c = 0;
107821: if (i.hasOwnProperty(1) && i[1]) {
107822: var p = i[1], h = u.InventoryModel.parseEq(p, n[p]);
107823: a = h.itemID;
107824: t.ohterInfo.inherit && t.ohterInfo.inherit.hasOwnProperty(p) && (a = t.ohterInfo.inherit[p]);
107825: h && h.hasOwnProperty("weaponSkinId") && h.weaponSkinId && (t.weaponskinId = h.weaponSkinId);
107826: }
107827: if (i.hasOwnProperty(8) && i[8]) {
107828: var f = i[8];
107829: c = u.InventoryModel.parseEq(f, n[f]).itemID;
107830: }
107831: if (i.hasOwnProperty(9) && i[9]) {
107832: var d = i[9];
107833: s = u.InventoryModel.parseEq(d, n[d]).itemID;
107834: }
```

（`getOtherInfoDataWithName` 107867-107868 只是 `var e = this.getOtherInfoData(t);` 的包装。）

### tools/index.js:113187 / 113191 / 113195 — `addChiefDiscipleNpc`

```
113171: e.prototype.addChiefDiscipleNpc = function() {
...
113177: var t = u.ChiefDiscipleModel.chiefDiscpleRole;
113178: if (t.hasOwnProperty("ohterInfo")) {
113179: var e = t.ohterInfo;
...
113184: var o = a.getChiefDiscipleData(C.GSceneMgr.curSceneID), i = l.calAppearance(e.baseGengu, e.numDeaths, e.appearBase), n = t.equipments, r = t.equips, s = 0, c = 0, p = 0;
113185: if (n.hasOwnProperty(1) && n[1]) {
113186: var h = n[1];
113187: s = d.InventoryModel.parseEq(h, r[h]).itemID;
113188: }
113189: if (n.hasOwnProperty(8) && n[8]) {
113190: var f = n[8];
113191: p = d.InventoryModel.parseEq(f, r[f]).itemID;
113192: }
113193: if (n.hasOwnProperty(9) && n[9]) {
113194: var m = n[9];
113195: c = d.InventoryModel.parseEq(m, r[m]).itemID;
113196: }
```

## 2.B 从本地 `InventoryModel` / `PlayerEquip` 取值

### tools/index.js:111879 — `SaveDataMgr.updatePlayerData`

```
111820: e.prototype.updatePlayerData = function(e) {
111821: this.resetModel();
111822: this.resetRoleAllData();
...
111825: this.updateEquipments(e);
...
111879: e.hasOwnProperty("PlayerEquip") && c.InventoryModel.parseEqData(e.PlayerEquip);
111880: var i;
111881: i = e.hasOwnProperty("gemData") ? e.gemData : {};
111882: c.InventoryModel.parseCrystalData(i, !0);
```

`updateEquipments`（111807-111809）：

```
111807: e.prototype.updateEquipments = function(t) {
111808: t.hasOwnProperty("equipments") && t.equipments && (v.RoleBaseInfo.equipments = t.equipments);
111809: };
```

`updatePlayerData` 的调用点：tools/index.js:70480、tools/index.js:70509（登录/进游戏响应体）。

另有 `updateEqData`（111810-111813，无 index.js 调用点）：

```
111810: e.prototype.updateEqData = function(t) {
111811: for (var e in t.equips) c.InventoryModel.updateEq(parseInt(e), t.equips[e]);
111812: t.inherit && s.InhertEquipModel.setInhertEquip(t.inherit);
111813: };
```

### tools/index.js:137704 — `TOWER_LEAVE_EVENT` 回调

```
137698: l.MessageCenter.on(c.HttpConst.TOWER_LEAVE_EVENT, function(e, o) {
137699: if (1 == o.eRet) {
137700: t.sweepState = !1;
137701: m.InventoryModel.equipmentDic = {};
137702: m.InventoryModel.equipByItemID = {};
137703: C.SaveDataMgr.updateEquipments(o);
137704: o.hasOwnProperty("PlayerEquip") && m.InventoryModel.parseEqData(o.PlayerEquip);
137705: for (var i in d.RoleBaseInfo.equipments) {
```

### tools/index.js:65077 / 65082 / 65485 — InventoryModel 内部（源码见 §1.1 / §3）

`updateEq` 的调用点（服务端推送/本地变更）：tools/index.js:111811、tools/index.js:137703 同族；另 `d.InventoryModel.updateEq(parseInt(e), t.equips[e])`（111811）为同一函数。

`killRewardEq`（65484-65488）：

```
65484: e.prototype.killRewardEq = function(t, e) {
65485: var o = this.parseEq(t, e);
65486: this.killDeleteEq(t);
65487: this.addEq(o);
65488: };
```

---

# 3 equipmentDic / getEquipOrUid

## 3.1 `equipmentDic` / `equipByItemID` 的声明与索引

声明（tools/index.js:64646-64647，另在构造函数尾部重复声明 64666-64667）：

```
64646: this.equipmentDic = {};
64647: this.equipByItemID = {};
```

写入 / 建索引（`addEq`，tools/index.js:65099-65108）：

```
65099: e.prototype.addEq = function(t) {
65100: this.equipmentDic[t.id] = t;
65101: if (2 == t.type) {
65102: this.equipByItemID.hasOwnProperty(t.itemID) || (this.equipByItemID[t.itemID] = []);
65103: this.equipByItemID[t.itemID].push(t);
65104: } else {
65105: var e = i.getItem(t.id, "item");
65106: !e || 8 != e.EquipType && 9 != e.EquipType || (this.fashEquipMap[t.id] = e);
65107: }
65108: };
```

删除 / 反索引（`deleteEq`，tools/index.js:65087-65098）：

```
65087: e.prototype.deleteEq = function(t) {
65088: if (this.equipmentDic.hasOwnProperty(t)) {
65089: var e = this.equipmentDic[t];
65090: if (this.equipByItemID.hasOwnProperty(e.itemID)) {
65091: var o = this.equipByItemID[e.itemID], i = o.indexOf(e);
65092: i >= 0 && o.splice(i, 1);
65093: }
65094: delete this.equipmentDic[t];
65095: }
65096: y.InhertEquipModel.allInhertEquips.hasOwnProperty(t) && delete y.InhertEquipModel.allInhertEquips[t];
65097: this.fashEquipMap.hasOwnProperty(t) && delete this.fashEquipMap[t];
65098: };
```

索引键 = `t.id`（即 parseEq 的第一个参数 uid）；`type == 2` 的还按 `itemID` 建 `equipByItemID[itemID] = [实例, ...]`。

清空（tools/index.js:137701-137702、65878-65879）：

```
137701: m.InventoryModel.equipmentDic = {};
137702: m.InventoryModel.equipByItemID = {};
```

```
65878: this.equipmentDic = {};
65879: this.equipByItemID = {};
```

## 3.2 读点（实例怎么被消费）

`getEquipmentInfo`（tools/index.js:65161-65165）：

```
65161: e.prototype.getEquipmentInfo = function(t) {
65162: if (this.equipmentDic.hasOwnProperty(t)) return this.equipmentDic[t];
65163: var e = b.TowerModel.getTowerEquips();
65164: return e.hasOwnProperty(t) ? e[t] : null;
65165: };
```

`getSpecEqArrByItemID`（tools/index.js:65166-65168）：

```
65166: e.prototype.getSpecEqArrByItemID = function(t) {
65167: return this.equipByItemID.hasOwnProperty(t) ? this.equipByItemID[t] : null;
65168: };
```

`equipmentDic` 直接读点（grep 全量，44 条中含 equipmentDic 的）：

```
24119: var A = f.InventoryModel.equipmentDic[C.id];            → 24120: switch (n.getItem(A.itemID, "item").WeaponType)
43556: var r = g.InventoryModel.equipmentDic;                  → 43557: if (r.hasOwnProperty(t.param[1]) && r[t.param[1]].num > 0)
61568: var t = [], e = p.InventoryModel.equipmentDic;
61576: ... r = [], a = p.InventoryModel.equipmentDic;           → 61579: (遍历 l.uID / l.numAttr)
92905: var r = c.InventoryModel.equipmentDic, a = d.TowerModel.getTowerEquipMap();
92916: var e = c.InventoryModel.equipmentDic, o = d.TowerModel.getTowerEquipMap(), i = c.InventoryModel.getEquipmentInfo(t);
134160: ... f.InventoryModel.equipmentDic[r.id].itemID == parseInt(t[2]) ...
64689: e.equipmentDic.hasOwnProperty(i) && r.itemID == e.equipmentDic[i].itemID
65083 / 65089 / 65090 / 65094
65100 / 65102 / 65103
65162 / 65191 / 65378 / 65393 / 65479-65496 / 65858
65479: if (this.equipmentDic.hasOwnProperty(e)) {
65480: this.equipmentDic[e].itemID = t[1];
65481: this.equipmentDic[e].attrs = t[2];
```

最后三行是 `updateEquipItem`（tools/index.js:65478-65483）——**直接**把 `t[1]`/`t[2]` 写进 `equipmentDic` 实例：

```
65478: e.prototype.updateEquipItem = function(t, e) {
65479: if (this.equipmentDic.hasOwnProperty(e)) {
65480: this.equipmentDic[e].itemID = t[1];
65481: this.equipmentDic[e].attrs = t[2];
65482: }
65483: };
```

其调用点（tools/index.js:142024-142025、142062-142063）：

```
142023: if (e.hasOwnProperty("playerEquip")) {
142024: var o = Object.getOwnPropertyNames(e.playerEquip);
142025: p.InventoryModel.updateEquipItem(e.playerEquip[o[0]], parseInt(o[0]));
```

## 3.3 `getEquipOrUid`（tools/index.js:44279-44302，属于 EqUtils 模块）

```
44279: t.prototype.getEquipOrUid = function(t) {
44280: var e = 0, o = i.InventoryModel.equipmentDic;
44281: if (o.hasOwnProperty(t)) {
44282: var r = n.getItem(t, "item"), a = p.playerInfo.entity.getEquipment(r.EquipType);
44283: if (a && a.id == t) {
44284: if (o[t].num > 1) return t;
44285: } else if (o[t].num > 0) return t;
44286: }
44287: var s = i.InventoryModel.getSpecEqArrByItemID(t);
44288: if (null == s) return e;
44289: for (var l = 0; l < s.length; l++) if (s[l].itemID == t) {
44290: var c = n.getItem(t, "item"), h = p.playerInfo.entity.getEquipment(c.EquipType);
44291: if (h) {
44292: if (h.id != s[l].id && 1 == s[l].numAttr) {
44293: e = s[l].id;
44294: break;
44295: }
44296: } else if (1 == s[l].numAttr) {
44297: e = s[l].id;
44298: break;
44299: }
44300: }
44301: return e;
44302: };
```

读的实例字段：`o[t].num`（44284/44285）、`s[l].itemID`（44289）、`s[l].id`（44292/44293）、`s[l].numAttr`（44292/44296）。
调用点：

```
133674: e.ItemID = M.EqUtils.getEquipOrUid(t);
133684: e.ItemID = M.EqUtils.getEquipOrUid(o[0]);
134432: ... 0 == m.EqUtils.getEquipOrUid(i[0]) && (e = !1) ...
```

## 3.4 实例字段被消费处（Equipment 构造与 arm）

`EquipmentBase`（tools/index.js:44626-44640）：

```
44626: var n = function() {
44627: function t(t) {
44628: this._id = t.id;
44629: this._data = t;
44630: }
...
44635: key: "id",
44636: get: function() {
44637: return this._id;
```

`Equipment.getDisplayID`（tools/index.js:44692-44694）：

```
44692: i.getDisplayID = function() {
44693: return this.parentID ? this.parentID : this.data.itemID;
44694: };
```

`Equipment.arm`（tools/index.js:44737-44765 摘要，读 `_data.itemID / _data.attrs / _data.numAttr / _data.crystalIds`）：

```
44737: i.arm = function(t) {
44738: for (var e = r.getItem(this._data.itemID, "item"), o = r.getItem(this.getDisplayID(), "item"), i = 1; i <= 5; ++i) {
...
44748: var c = this._data.attrs;
44749: for (var p in c) {
44750: var h = parseInt(p), u = c[p];
44751: switch (h) {
44752: case 19:
44753: t.skillLvBonusDic.hasOwnProperty(u[0]) || (t.skillLvBonusDic[u[0]] = 0);
44754: var f = a.getFluctdBonusVByType(h, u[1], this._data.itemID, this._data.numAttr);
44755: t.skillLvBonusDic[u[0]] += f;
...
44763: var d = new s(a.getFluctdBonusVByType(h, u, this._data.itemID, this._data.numAttr));
44718: if (this._data.crystalIds) {
44721: if (Object.keys(t.crystalDic).length > 0) for (var i = 0; i < this._data.crystalIds.length; i++) {
44722: var n = this._data.crystalIds[i];
```

（即 `attrs` 的键 19 → 值 `u` 按 `[u[0], u[1]]` 读；其余键 → 值当数字读。`crystalIds` 按数组读 `length` / `[i]`。）

---

# 4 别人装备那条链

## 4.1 战斗实体：`MadUtils.createPlayerBattleEntity(t)`

模块头（tools/index.js:74593）：`cc._RF.push(e, "e53dcfUGHxBHbBNSB1Drr4U", "MadUtils");`
导入（tools/index.js:74624，关键别名 `c = t("../battlesystem/ItemUtils")`、`s = t("../battlesystem/Equipment")`、`l = t("../battlesystem/EquipmentType")`、`h = t("../battlesystem/PlayerBattleEntity")`）。
导出（tools/index.js:74625）：`e.exports = {`（`parsePlayerData` / `createPlayerBattleEntity` 都在这个对象上）。

```
74766: createPlayerBattleEntity: function(t) {
74767: var e = new h();
74768: t.hasOwnProperty("fuben") && (e.fuben = t.fuben);
74769: t.hasOwnProperty("tower") && (e.tower = t.tower);
...
74775: e.battleID = t.roleID;
...
74784: e.crystalDic = c.parseCrystalData(t.gemData);
74785: for (var o in t.equipments) {
74786: var i = t.equipments[o];
74787: if (i) {
74788: var n = null, a = t.equips[i];
74789: a ? n = c.parseEq(i, a) : t.tempEquips && t.tempEquips[i] && (n = c.parseEq(i, t.tempEquips[i]));
74790: if (n) {
74791: var l = t.inherit && t.inherit.hasOwnProperty(i) ? t.inherit[i][0] : 0;
74792: e.putOnEquipment(new s(n, l), parseInt(o));
74793: n.hasOwnProperty("weaponSkinId") && n.weaponSkinId && (e.weaponskinId = n.weaponSkinId);
74794: }
74795: }
74796: }
```

`parsePlayerData(t)`（tools/index.js:74919-74972）**只处理 `baseValueAy`**，不动 equips：

```
74919: parsePlayerData: function(t) {
74920: var e = t;
74921: t.userAccount = e.baseValueAy[0];
74922: t.userName = e.baseValueAy[1];
...
74968: t.outSchool = e.baseValueAy[47];
74969: t.degreeLv = e.baseValueAy[49] ? e.baseValueAy[49] : 0;
74970: t.career = e.baseValueAy[50] ? e.baseValueAy[50] : 0;
74971: delete e.baseValueAy;
74972: },
```

`AttckData` → `createPlayerBattleEntity` 的调用点（grep `createPlayerBattleEntity` 全量 21 条中的代表）：

```
18040: i.parsePlayerData(o.AttckData);
18041: var a = i.createPlayerBattleEntity(o.AttckData);
18042: i.parsePlayerData(o.EnemyData);
18043: var s = i.createPlayerBattleEntity(o.EnemyData);
```

```
98845: l.parsePlayerData(o.AttckData);
98846: var s = l.createPlayerBattleEntity(o.AttckData), h = t.generateNpcData(o.npcArr, o.npcID), u = new p();
```

```
100375: i.parsePlayerData(t.EnemyData);
100376: i.parsePlayerData(t.AttckData);
101329: h.parsePlayerData(o.EnemyData);
101330: h.parsePlayerData(o.AttckData);
101331: var i = h.createPlayerBattleEntity(o.AttckData), n = h.createPlayerBattleEntity(o.EnemyData);
104103: c.parsePlayerData(o.EnemyData);
104104: c.parsePlayerData(o.AttckData);
104112: var n = c.createPlayerBattleEntity(o.AttckData), r = c.createPlayerBattleEntity(o.EnemyData);
104132: c.parsePlayerData(o.AttckData);
104141: var r = c.createPlayerBattleEntity(o.AttckData), a = new u();
```

其余调用点：tools/index.js:18059、19659、31788、69021、100388、100391、100393、100438、146160、146162、146462、146464、146512、146514。

## 4.2 服务端 `roleInfo` → `RoleInfoUI`

入口（tools/index.js:113594-113597）：

```
113594: r.MessageCenter.on(a.HttpConst.GET_SCHOOL_MASTER, this.onLookRoleInfo, this);
113595: r.MessageCenter.on(a.HttpConst.GET_SCHOOL_PUPIL, this.onLookRoleInfo, this);
113596: r.MessageCenter.on(a.HttpConst.GET_APPLY_INFO, this.onLookRoleInfo, this);
113597: r.MessageCenter.on(a.HttpConst.GET_SCHOOL_ROLE_INFO, this.onLookRoleInfo, this);
```

```
113935: t.prototype.onLookRoleInfo = function(t, e) {
...
113937: 1 == e.eRet ? E.default.prefabs.load("comUI/RoleInfoUI", cc.Prefab, function(t, o) {
113938: var i = cc.instantiate(o);
113939: _.PopUpMgr.addPopUp(i, S.LayerMgr.popUpLayer, 1, !0);
113940: var n = i.addComponent("ShowRoleInfoUI");
113941: e.hasOwnProperty("masterInfo") ? n.setBtns(e.masterInfo, 0) : e.hasOwnProperty("pupilInfo") ? n.setBtns(e.pupilInfo, 1) : e.hasOwnProperty("roleInfo") && (e.hasOwnProperty("ownIsMaster") ? n.setBtns(e.roleInfo, 3) : n.setBtns(e.roleInfo, 2));
```

`RoleInfoUI.setData` / `SetBaseInfo`（tools/index.js:106706-106719）：

```
106706: o.prototype.setData = function(t, e) {
106707: void 0 === e && (e = []);
106708: this.roleInfo = t;
106709: v.RoleOtherInfo.showMountObj = this.roleInfo.mountsObj;
106710: v.RoleOtherInfo.isSyncMount = 1 == this.roleInfo.sycnType;
106711: this.bodyType = this.roleInfo.bodyType;
106712: this.SetBaseInfo(this.roleInfo);
```

`onCheckDetail` → `CheckRoleEquipUI.setData(t.roleInfo)`（tools/index.js:106914-106919）：

```
106914: o.prototype.onCheckDetail = function() {
106915: var t = this;
106916: d.default.prefabs.load("network/CheckRoleEquipUI", cc.Prefab, function(e, o) {
106917: var i = cc.instantiate(o);
106918: i.getComponent("CheckRoleEquipUI").setData(t.roleInfo);
```

其余把服务端 roleInfo 灌进 `RoleInfoUI` 的入口（grep `RoleInfoUI`）：tools/index.js:80081、101523、113937、132606、132613。

## 4.3 `RoleOtherInfo.getOtherInfoData(t)`

见 §2.A tools/index.js:107818-107834（读 `t.equipments[1]/[8]/[9]` → `t.equips[uid]` → `parseEq(...).itemID`）。
调用点：tools/index.js:107868（`getOtherInfoDataWithName`）、tools/index.js:74342（头像 UI）。

## 4.4 首席弟子（服务端下发的另一玩家数据）

`chiefDiscpleRole` → tools/index.js:113171-113196（原文见 §2.A）。数据来源：`u.ChiefDiscipleModel.chiefDiscpleRole`（113177）。

## 4.5 scripts2 / scripts3 中的同类链（同一读法）

`tools\scripts2.js:53664-53702`（角色卡 `getRoleBaseValue`，`this.roleInfo` = 别人数据）：

```
53677: var e = this.roleInfo.equipments, o = this.roleInfo.equips;
53678: this.sexState = this.roleInfo.ohterInfo.sex;
53679: if (e.hasOwnProperty(3) && e[3]) {
53680: var i = e[3];
53681: this.roleHeadValue = l.InventoryModel.parseEq(i, o[i]).itemID;
53682: this.roleInfo.ohterInfo.inherit && this.roleInfo.ohterInfo.inherit.hasOwnProperty(i) && (this.roleHeadValue = this.roleInfo.ohterInfo.inherit[i]);
53683: }
53684: if (e.hasOwnProperty(2) && e[2]) {
53685: var s = e[2];
53686: this.roleCoatId = l.InventoryModel.parseEq(s, o[s]).itemID;
...
53689: if (e.hasOwnProperty(1) && e[1]) {
53690: var n = e[1], r = l.InventoryModel.parseEq(n, o[n]);
53691: this.roleEquipId = r.itemID;
53692: this.roleInfo.ohterInfo.inherit && this.roleInfo.ohterInfo.inherit.hasOwnProperty(n) && (this.roleEquipId = this.roleInfo.ohterInfo.inherit[n]);
53693: r.hasOwnProperty("weaponSkinId") && r.weaponSkinId > 0 && (this.weaponskinId = r.weaponSkinId);
53694: }
53695: if (e.hasOwnProperty(8) && e[8]) {
53696: var g = e[8];
53697: this.roleWig = l.InventoryModel.parseEq(g, o[g]).itemID;
53698: }
53699: if (e.hasOwnProperty(9) && e[9]) {
53700: var m = e[9];
53701: this.roleFashion = l.InventoryModel.parseEq(m, o[m]).itemID;
53702: }
```

`tools\scripts2.js:56573-56585`（师徒/门派 竞技场头像）：

```
56573: var o = e.ohterInfo, i = c.calAppearance(o.baseGengu, o.numDeaths, o.appearBase), s = e.equipments, n = e.equips, r = 0, l = 0, p = 0;
56574: if (s.hasOwnProperty(1) && s[1]) {
56575: var h = s[1];
56576: r = m.InventoryModel.parseEq(h, n[h]).itemID;
56577: }
56578: if (s.hasOwnProperty(8) && s[8]) {
56579: var d = s[8];
56580: p = m.InventoryModel.parseEq(d, n[d]).itemID;
56581: }
56582: if (s.hasOwnProperty(9) && s[9]) {
56583: var u = s[9];
56584: l = m.InventoryModel.parseEq(u, n[u]).itemID;
56585: }
```

`tools\scripts3.js:38220-38231`（`getPlayerSkills`）：

```
38220: t.prototype.getPlayerSkills = function(t) {
38221: var e = [ "", "", "" ];
38222: if (t.hasOwnProperty("WeapToSkill") && t.WeapToSkill) {
38223: for (var o in t.WeapToSkill) {
38224: if (t.hasOwnProperty("equipments") && t.equipments) for (var i in t.equipments) if (null != t.equipments[i] && 0 != t.equipments[i]) {
38225: var s = h.InventoryModel.parseEq(t.equipments[i], t.equips[t.equipments[i]]).itemID, n = a.getItem(s, "item");
```

---

# 5 字段清单（下标 → 读点 → 用途）

第二参数（各定义里都叫 `e`，值来自 `equips[uid]`）的全部读点。

| 下标/键 | 读点（文件:行号） | 写入的属性 | 下游再读点 |
|---|---|---|---|
| `e[0]` | tools/index.js:65120、tools/index.js:66289、tools/index.js:43750、tools/index.js:77107、tools\scripts3.js:73485 | `o.type` | 65121 / 66290 / 43751 三分支判 `1 == o.type`；106974、106992 `2 == r[l][0]`；65101 `2 == t.type` 决定 `equipByItemID` 索引 |
| `e[1]`（type==1 时） | tools/index.js:65123、66292、43753、77110、scripts3:73488 | `o.num`（经 EqItem.num setter，43652-43659 parseInt） | 15071 `" x" + c.num`；103834 `_numArray.push(o.num)`；43557 `r[...].num > 0`；44284/44285 `o[t].num > 1` |
| `e[1]`（type!=1 时） | tools/index.js:65126、66295、43755、77112 | `o.itemID` | 106820/106833/113187 等 `.itemID`；65102 `equipByItemID[t.itemID]`；44693 `this.data.itemID`；44738 `getItem(this._data.itemID)` |
| `e[2]`（type==1 时） | tools/index.js:65124、66293 | `o.weaponSkinId`（仅 truthy 才赋值） | 74793 `n.weaponSkinId`；53693 `r.weaponSkinId > 0`；107825 `h.weaponSkinId`；64686 同字段的 `[2]` 写法 |
| `e[2]`（type!=1 时） | tools/index.js:65128、66297、43757、77114 | `o.attrs` | 65130 键枚举；43786 `n.infoAy = e.attrs`；44748 `var c = this._data.attrs`；65481 `equipmentDic[e].attrs = t[2]` |
| `attrs` 的键集合（`for in`） | tools/index.js:65130-65131、66299-66300、43759-43760、77116-77117 | `o.numAttr` = 键个数 | 15067 `getEqQuality(c.numAttr)`；43787 `n.numAttr = e.numAttr`；44292/44296 `1 == s[l].numAttr`；61579 `l.numAttr > 0` |
| `attrs[19]` 的第一层键 | tools/index.js:106974、106992（`r[l][2].hasOwnProperty(19)`） | —（判定是否含 19 号属性） | 同上两行 |
| `attrs[19][0]` | tools/index.js:106974、106992（`1124 == r[l][2][19][0]`） | —（与 1124 比较） | 106975-106976 只在命中时继续 |
| `attrs[19][1]` | tools/index.js:106976、106994（`p[1]`，`p = r[l][2][19]`） | 传给 `O.getFluctdBonusVByType(19, p[1], c.itemID, c.numAttr)` | 106976 / 106994 累加 `a` |
| `attrs[19][0]` / `[19][1]`（战斗侧等价读法） | tools/index.js:44752-44755（`u[0]` / `u[1]`，`u = c[p]`，`h == 19`） | `t.skillLvBonusDic[u[0]] += f` | 44754 `getFluctdBonusVByType(h, u[1], ...)` |
| 其它 `attrs[键]` 的值 | tools/index.js:44763（`u` 直接当数字） | `new s(getFluctdBonusVByType(h, u, ...))` | 同上 |
| `e[3]`（type!=1 时） | tools/index.js:65132（`e[3] &&`）、tools/index.js:66301（`e[3] ? e[3] : null`）、77118 | `o.crystalIds` | 44718 `if (this._data.crystalIds)`；44721-44722 `crystalIds.length` / `crystalIds[i]`；92820/92870、137613、138332、142535 复制该字段；44357 `return !!t.crystalIds` |
| `e[4]`（type!=1 时） | tools/index.js:65133、66302、77119 | `o.weaponSkinId`（仅 truthy） | 同 `e[2]`（type==1）下游 |
| `e` 整体为假值 | tools/index.js:66283-66286（仅 ItemUtils） | 直接 `return { itemID: t, num: 1 }` | 无（提前返回） |
| 第一参数 `t`（uid） | 65119（`o.id = t`）、66288（`o.id = parseInt(t)`）、43749、77106 | `o.id` | 65100 `equipmentDic[t.id]`；44628 `this._id = t.id`；44293 `e = s[l].id` |
| `equips` 容器的键（不是第二参数内部） | 15066（`for (var l in o) parseEq(parseInt(l), o[l])`）、24317（`parseEq(o, t.equips[o])`，`o = t.equipments[e]`）、74789（`parseEq(i, t.equips[i])`，`i = t.equipments[o]`）、111811（`updateEq(parseInt(e), t.equips[e])`） | 键 = uid，值 = 上表的数组 | — |
| `t.equipments` 的键 | 24316（`parseInt(e) < 8` 分流）、24325（`parseInt(e) >= 8`）、106818（`t.equipments[c.WEAPON]`，`WEAPON: 1` 见 44654）、107821/107827/107831（键 1/8/9）、113185/113189/113193（键 1/8/9）、74792（`parseInt(o)` 作 putOnEquipment 槽位）、111679-111687（本地初始键 1..7）、44650-44663（`WEAPON:1 … FASION:9`） | 值 = uid | — |

补充两处"同一形状但不经 parseEq"的读点（同族证据，非调用点）：

```
65480: this.equipmentDic[e].itemID = t[1];
65481: this.equipmentDic[e].attrs = t[2];
```
（来源 `e.playerEquip[uid]`，见 142025；与 `e[1]`/`e[2]` 同位。）

`attrs`/`numAttr` 写入链（parseEq → equipChangeNormalEq，tools/index.js:43773-43788）：

```
43773: t.prototype.equipChangeNormalEq = function(t, e) {
43774: var i = e.type, n = {
43775: uID: t,
43776: type: i,
43777: numbers: 0,
43778: itemId: e.itemID,
43779: infoAy: null,
43780: numAttr: 0,
...
43785: if (2 == i) {
43786: n.infoAy = e.attrs;
43787: n.numAttr = e.numAttr;
43788: }
```

---

# 未能验证

1. **`t.equipments` 的键全集**：只看到读点里的 1、8、9（107821/107827/107831、113185/113189/113193）与 `<8` / `>=8` 分流（24316/24325），以及本地初始化 1..7（111679-111687）、`EquipmentType` 1..9（44650-44663）。没有找到对"服务端 equipments 允许哪些键"的完整枚举或校验代码。
2. **`e[3]` 的元素类型**：只见数组式读法（`length`、`[i]`、`> 0`，44721-44723、65826-65828），未见写端构造 `crystalIds` 数组的代码（写端未在本次范围内定位）。
3. **`attrs` 的键值全集**：只逐行确认了键 `19`（→ `[skillId, value]`，106974/44752）与"其它键的值为数字"（44763）；其余键的含义未逐一定位。
4. **`tempEquips`**：仅见读取点（74789 `t.tempEquips && t.tempEquips[i]`），未见其生产/赋值代码。
5. **`EqUtils.parseEq`（43747）是否有运行时调用**：grep 的 28 条 index.js 命中里没有 `EqUtils.parseEq(` 形式；`scripts2/3` 里也只有定义处（scripts3:73482 是 RogueRoleInfo 自己的）。是否通过字符串/动态方式调用未验证。
6. **`parseEqData` 的 `PlayerEquip` 生产端**：只见消费（111879、137704），未见服务端字段构造。

# 范围外发现

1. `tools\scripts3.js:73482-73498` 存在第四份 `parseEq`（`RogueRoleInfo.prototype.parseEq`，`new m.EqItem()`，只读 `[0]/[1]/[2]`）；同模块 `parseEqData`（73501）与 `getEquipmentInfo`（73506）/`getSpecEqArrByItemID`（73509）是 `equipmentDic` 的另一份实现。
2. `tools/index.js:77104-77122` 的 `parseStorageEq`（仓库 `setStorageData`，77092-77102）读同一形状 `[0..4]`；其数据来自 `t.equip` / `t.item`（77095-77100），不是 `equips`。
3. `equips` 这个名字在客户端还被另一类 payload 使用（奖励表，与玩家装备不同源）：42907-42908、55182-55183、89340、89557-89559（`i.equips = o.equipObj`），并分别送进 `setRewards` → 15066 的 parseEq。`scripts3.js:71528/74388` 的 `equipObj` / `equips` 走 `RogueRoleInfo.parseEqData`（73501），是另一套。
4. `tools/index.js:65190-65207` `sellItem` 里 `h[0] == 2`、`h[1]` 当 `equipmentDic` 键的请求数组，形状与 parseEq 第二参数不同源（请求侧三元组）。
5. `createPlayerBattleEntity` 第二参数读的是 **ItemUtils.parseEq**（别名 `c = t("../battlesystem/ItemUtils")`，74624）。24 处调用中走 ItemUtils.parseEq 的是 74789、106975、106993（3 处），其余 21 处都是 `InventoryModel.parseEq`；两者差异见 §1.1 / §1.2 原文。
6. `tools/index.js:106591` 的 `O = t("../../battlesystem/ItemUtils")` 与 `m = t("../../models/InventoryModel")` 在同一个 RoleInfoUI 模块内并存：同一函数族里 106820/106833/106858 用 InventoryModel、106975/106993 用 ItemUtils。

---

事实性结论：字段清单**已闭合**（`InventoryModel.parseEq` 65117-65136 的第二参数读点为 `e[0]`、`e[1]`、`e[2]`、`e[3]`、`e[4]` 与 `attrs` 键集合；`ItemUtils.parseEq` 66282-66305 同构且多一个假值兜底；二级读点 `attrs[19][0]`/`attrs[19][1]` 见 106974-106996；未发现这五个下标之外的越界读点）。
