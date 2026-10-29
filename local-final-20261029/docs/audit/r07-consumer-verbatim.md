# r07-consumer-verbatim

## 任务 A：User.upgradeSkill 客户端应答消费端

### ① 文件与行号
`tools/index.js:119842-119845`

### ② 逐字原文
```javascript
i.MessageCenter.on(n.HttpConst.UPGRADE_SKILL_LV, function(t, e) {
i.MessageCenter.dispatch(a.EvName.SYNC_UPGRADE_RES, e.eRet);
e.hasOwnProperty("returnPro") && u.default.show(p.getText("6003371").replace(/\[1\]/, e.returnPro));
}, this);
```

### ③ 是否读取应答顶层的 potential 字段并写进本地模型
未读到

### ④ 是否处理 note.eco
not found

---

## 任务 B：User.exchangeItem 客户端应答消费端

### ① 文件与行号
`tools/index.js:47090-47097`

### ② 逐字原文
```javascript
i.MessageCenter.on(n.HttpConst.EXCHANGE_ITEM, function(t, e) {
if (1 == e.eRet) {
i.MessageCenter.dispatch(r.EvName.EXCHANGE_ITEM_SHOP);
i.MessageCenter.dispatch(r.EvName.EXCHANGE_UPDATE_SHOP, e.itemID);
var o = h.getItem(e.itemID, "item");
c.default.show(p.getText(123) + p.getText(o.Name) + "x" + e.itemNum);
}
}, this);
```

### ③ eRet 判断分支与是否处理 eRet == 4
只认 `1` 这 1 个值。
具体分支逐字原文：
```javascript
if (1 == e.eRet) {
i.MessageCenter.dispatch(r.EvName.EXCHANGE_ITEM_SHOP);
i.MessageCenter.dispatch(r.EvName.EXCHANGE_UPDATE_SHOP, e.itemID);
var o = h.getItem(e.itemID, "item");
c.default.show(p.getText(123) + p.getText(o.Name) + "x" + e.itemNum);
}
```
是否处理 `eRet == 4`：没有处理。

### ④ 失败提示逻辑与提示文本行
not found（在 `tools/index.js:47090-47097` 回调内无任何失败/else 分支提示逻辑）。

---

## 任务 C：scripts2.js 与 scripts3.js 检索结果

### 1. `tools/scripts2.js`
- `upgradeSkill`: not found
- `exchangeItem`: not found

### 2. `tools/scripts3.js`
- `tools/scripts3.js:50764`: 注册大富翁活动道具兑换事件回调 `f.MessageCenter.on(s.HttpConst.EXCHANGE_ITEM_EVENT, this.exchangeItemEventCallBack, this);`
- `tools/scripts3.js:51101-51109`: 大富翁活动道具兑换应答回调函数 `e.prototype.exchangeItemEventCallBack`
```javascript
e.prototype.exchangeItemEventCallBack = function(t, e) {
if (1 == e.eRet) {
f.MessageCenter.dispatch(u.EvName.DICE_MONEY_EVENT);
f.MessageCenter.dispatch(u.EvName.EXCHANGE_ITEM_SHOP);
f.MessageCenter.dispatch(u.EvName.HALLOWEEN_EXCHANGE_SHOP_EVENT);
var o = n.getItem(e.itemId, "item");
i.default.show(r.getText(123) + r.getText(o.Name) + "x" + e.itemNum);
} else 7 == e.eRet && i.default.show(r.getText(1455));
};
```
- `tools/scripts3.js:73614-73642`: 本地数据模型 `SkillTable` 内部更新角色技能数据的同名成员方法 `t.prototype.upgradeSkill`（非网络请求回调）
```javascript
t.prototype.upgradeSkill = function(t) {
if (this.entity) {
var e = t, o = s.getItem(e.id, "skill");
if (o.Type == r.NEIGONG && 2 == o.Type1) {
var i = Math.min(f.RogueUtils.getMaxNGBonus(), this.mpTrained);
this.entity.mpTrainedBonus.baseValue = i;
}
...... (中间省略 16 行)
for (var h = 0; h < p.length; ++h) {
var d = new c();
d.id = p[h];
l.addSpellGroup(d);
}
this.entity.isSkillEquipped(a) && (l.enabled = !0);
}
}
M.MessageCenter.dispatch(C.EvName.CHANGE_ROLE_INFO);
}
};
```
