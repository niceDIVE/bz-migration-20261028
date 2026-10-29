# 经济变动与 RoleBaseInfo 赋值/累加取证报告

## 任务 1：tools/index.js 64698-64725 行 switch 逐字摘录与分析

### 1.1 tools/index.js:64698-64725 逐字原文

```javascript
r.MessageCenter.on(a.HttpConst.ECONOMY_CHNG, function(t, e) {
for (var o in e) switch (o) {
case "coins":
l.RoleBaseInfo.coins = e[o];
break;

case "ptt":
l.RoleBaseInfo.potentials = e[o];
break;

case "gold":
l.RoleBaseInfo.gold = e[o];
break;

case "exp":
k.playerInfo.entity.exp = e[o];
l.RoleBaseInfo.exp = e[o];
break;

case "chips":
l.RoleBaseInfo.chipNum = e[o];
break;

case "yuanbao":
l.RoleBaseInfo.yuanbao = e[o];
}
r.MessageCenter.dispatch(s.EvName.SHOP_BUY_ITEM);
}, this);
```

### 1.2 每个 case 的赋值/累加判定表

| case 名 | 目标字段 | 运算符 | 行号 | 判定类型 |
| :--- | :--- | :--- | :--- | :--- |
| `case "coins":` | `l.RoleBaseInfo.coins` | `=` | tools/index.js:64701 | 赋值 |
| `case "ptt":` | `l.RoleBaseInfo.potentials` | `=` | tools/index.js:64705 | 赋值 |
| `case "gold":` | `l.RoleBaseInfo.gold` | `=` | tools/index.js:64709 | 赋值 |
| `case "exp":` | `k.playerInfo.entity.exp`<br>`l.RoleBaseInfo.exp` | `=`<br>`=` | tools/index.js:64713<br>tools/index.js:64714 | 赋值<br>赋值 |
| `case "chips":` | `l.RoleBaseInfo.chipNum` | `=` | tools/index.js:64718 | 赋值 |
| `case "yuanbao":` | `l.RoleBaseInfo.yuanbao` | `=` | tools/index.js:64722 | 赋值 |

---

## 任务 2：三包中 RoleBaseInfo 字段累加/自增扫描

检索范围：`tools/index.js`、`tools/scripts2.js`、`tools/scripts3.js`。

### 2.1 模式：`RoleBaseInfo.potentials\s*\+=`
命中数：4 处。
- `tools/index.js:23994`: `l.RoleBaseInfo.potentials += n;`
- `tools/index.js:54267`: `e.hasOwnProperty("getPotency") && (c.RoleBaseInfo.potentials += e.getPotency);`
- `tools/index.js:86213`: `l.RoleBaseInfo.potentials += this.potGot;`
- `tools/index.js:86224`: `l.RoleBaseInfo.potentials += n[a].number;`

### 2.2 模式：`RoleBaseInfo.coins\s*\+=`
命中数：3 处。
- `tools/index.js:23997`: `l.RoleBaseInfo.coins += r;`
- `tools/index.js:54268`: `e.hasOwnProperty("getCoins") && (c.RoleBaseInfo.coins += e.getCoins);`
- `tools/index.js:86232`: `l.RoleBaseInfo.coins += n[a].number;`

### 2.3 模式：`RoleBaseInfo.gold\s*\+=`
命中数：1 处。
- `tools/index.js:24006`: `l.RoleBaseInfo.gold += h;`

### 2.4 模式：`RoleBaseInfo.yuanbao\s*\+=`
命中数：0 处。

### 2.5 模式：`RoleBaseInfo.chipNum\s*\+=`
命中数：0 处。

---

## 任务 3：别名形态累加排查

检索范围：`tools/index.js`、`tools/scripts2.js`、`tools/scripts3.js` 中所有包含 `potentials` 且包含 `+=` 的语句。

### 3.1 检索结果汇总
全三包中 `potentials` 出现且带 `+=` 运算符的命中共有 5 处，全部位于 `tools/index.js`：
1. `tools/index.js:23994`: `l.RoleBaseInfo.potentials += n;`（直接引用，非别名）
2. `tools/index.js:54267`: `e.hasOwnProperty("getPotency") && (c.RoleBaseInfo.potentials += e.getPotency);`（直接引用，非别名）
3. `tools/index.js:86213`: `l.RoleBaseInfo.potentials += this.potGot;`（直接引用，非别名）
4. `tools/index.js:86224`: `l.RoleBaseInfo.potentials += n[a].number;`（直接引用，非别名）
5. `tools/index.js:106302`: `} else o.exp += e; else this.potentials += e; else this.coins += e; else this.gold += e;`

### 3.2 别名形态核查
针对 `tools/index.js:106302` 的 `this.potentials += e;`，核查其上下文定义（`tools/index.js:106274-106277`）：
该类为物品/背包相关模型实例方法（`e.prototype.setItem`），其 `this.potentials` 在初始化时设为 `this.potentials = 0`，并非 `RoleBaseInfo` 的对象别名引用。

结论：三包中形如 `var X = RoleBaseInfo; X.potentials +=` 的别名累加写法命中数为 0 处。
