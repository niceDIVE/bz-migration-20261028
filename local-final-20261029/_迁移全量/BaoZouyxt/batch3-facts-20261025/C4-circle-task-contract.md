# C4：环任务/委托任务面板 —— 客户端行契约取证 + §6.1 落地记录

> 取证者：主会话（原派出的 2 个只读工人 27 分钟零产出，已按委派纪律 §9「工人不可用，主审自做」接手；
> 工人任务已 kill）。全部结论来自**逐行读原文**，每条带 `文件:行号`。
> 落地日期：2026-10-25（第四次会话）。对应 `HANDOVER-SESSION-2026-10-25-C.md` §6.1。

---

## 1. 结论速览（这就是 §6.1 缺的那块拼图）

`getCircleTaskList.taskArr` 的每一行，客户端**只**在 `HangTaskRender` 里被读，字段集是：

```
{ id, state, type, lv, award:[…], param:[…], sTime?(可选), caidan?(可选) }
```

**三条硬约束（违反 = 客户端抛 TypeError，不是"显示难看"）**：

| # | 约束 | 违反后果 | 证据 |
|---|---|---|---|
| ① | `state` 必须是 `1..5` 的整数 | `[0,1576,1582,1580,593,791][state]` 取到 `undefined` → `getText(undefined)` | `scripts2.js:28061` |
| ② | `type` 必须是 `entrust_task` 的键（本工程 dump 里 `1..4`） | `o.type` 处抛（`o` 为 undefined） | `scripts2.js:27977-27978` |
| ③ | `lv` 必须是 `entrust_level` 的键（`1..5`）；**`type==1` 时不查 lv** | `c.time` 处抛 | `scripts2.js:27992-27997` |

外加：`type∈{2,3}` 时 `param[0]` 必须是 `npc` 表里存在的 id（`scripts2.js:27979-27980` 直读 `i.NpcName`）；
`type==4` 时 `param[0]` 要的是**地图** id（`scripts2.js:27982-27983`）——而 `circle_task` 只提供
Talk/Fight/Item 三个池、**没有地图池**，故本工程不投 `type 4`。
`type==2` 时 `param[1]` 必须是 `Type=1`（装备）的 item id（`index.js:43554-43557`）。

---

## 2. 渲染链逐段原文

### 2.1 入口：应答 → 面板
`index.js:43487-43496`
```js
i.MessageCenter.on(n.HttpConst.GET_CIRCLE_TASK_LIST, function(e, o) {
  if (1 == o.eRet) {
    t.entrustNum = o.cNum;
    r.default.prefabs.load("comUI/ShopBgUI", cc.Prefab, function(t, e) {
      var i = cc.instantiate(e);
      a.PopUpMgr.addPopUp(i, s.LayerMgr.popUpLayer);
      i.addComponent("HangTaskBg").showHangTaskUI(o.taskArr);   // ← taskArr 直接下传，不做映射
    });
  }
}, this);
```
**要点**：`taskArr` **原样**交给 `showHangTaskUI`，没有 `CHANGE_DELEGATE_TASK` 那种短名→长名映射。
所以 `taskArr` 的行必须是**长名字段**（`state/type/award/param`），不能是 `s/t/aw/c`。

### 2.2 `setNewBaseData`（HANDOVER 要求"必须追清楚"的那个函数）
`scripts2.js:28053-28059`
```js
e.prototype.setNewBaseData = function(t) {
  this.dataObj = t;
  t.hasOwnProperty("sTime") && (this.beginTimeNum = t.sTime);
  this.tMinute = 0;
  this.otherTime = 0;
  this.showBaseInfo(this.dataObj);
};
```
本身只读 `sTime`（可选）。真正的读取都在 `showBaseInfo` / `showTitleText`。

### 2.3 `showBaseInfo` —— state 当数组下标
`scripts2.js:28060-28071`
```js
e.prototype.showBaseInfo = function(t) {
  this.rewardBtnLabel.getComponent(cc.Label).string = h.getText([ 0, 1576, 1582, 1580, 593, 791 ][t.state]);
  if (5 == t.state) {
    this.rewardBtn.getComponent(cc.Button).interactable = !1;
    this.sprite_sprite1.active = !0;
  }
  for (var e = t.lv, o = 0; o < 5; o++) o < e && (this.startAy[o].interactable = !1);
  this.needTimeTxt.active = !0;
  this.showTitleText(t);
  1 == t.state || 2 == t.state ? this.checkBoxBtn.active = !0 : this.checkBoxBtn.active = !1;
  1 == t.type && (this.checkBoxBtn.active = !1);
};
```

### 2.4 `showTitleText` —— 三处配置表直读（★ 崩点全在这）
`scripts2.js:27976-28001`
```js
e.prototype.showTitleText = function(t) {
  var e = "", o = l.getItem(t.type, "entrust_task");            // ← 崩点②
  if (1 == o.type) e = h.getText(o.name); else if (2 == o.type || 3 == o.type) {
    var i = l.getItem(t.param[0], "npc");                        // ← 崩点④
    e = h.getText(o.name) + h.getText(i.NpcName);
  } else {
    var s = l.getItem(t.param[0], "map");                        // ← type==4 才走这条
    e = h.getText(o.name) + h.getText(s.Name);
  }
  this.titleTxt.getComponent(cc.Label).string = e;
  var n = "";
  t.award[0] > 0 && (n = n + h.getText(37) + t.award[0]);         // ← award 必须 ≥2 格
  t.award[1] > 0 && (n = n + "   " + h.getText(1 == o.type ? 35 : 36) + t.award[1]);
  1 == t.caidan ? n = n + "   " + h.getText(506) + "10" : 2 == t.caidan ? n = n + "(" + h.getText(1594) + ")" : 3 == t.caidan && (n = n + "(" + h.getText(1595) + ")");
  this.itemTxt.getComponent(cc.Label).string = n;
  var r = 0;
  if (1 == t.type) {
    var a = l.getItem(1, "entrust_detailed");                     // type==1 用固定时限
    r = parseInt(a.time);
  } else {
    var c = l.getItem(t.lv, "entrust_level");                     // ← 崩点③
    r = parseInt(c.time);
  }
  this.tMinute = r;
  this.needTimeTxt.getComponent(cc.Label).string = Math.ceil(r / 3600) + h.getText(1574);
};
```

### 2.5 `CHANGE_DELEGATE_TASK` 的逆映射（线上短名口径）
`index.js:43515-43531`
```js
i.MessageCenter.on(n.HttpConst.CHANGE_DELEGATE_TASK, function(e, o) {
  if (1 == o.eRet) {
    var n = {};
    for (var r in o.taskObj) {
      var a = o.taskObj[r], s = {};
      s.id = r;         // ← 键是**字符串**
      s.state = a.s;
      s.type  = a.t;
      s.lv    = a.lv;
      s.award = a.aw;
      s.param = a.c;
      s.sTime = a.d;
      n[r] = s;
    }
    t.entrustNum = o.num;
    i.MessageCenter.dispatch(l.EvName.CHANGE_ENTRUST_TASK_EVENT, n);
  } else 4 == o.eRet ? c.default.show(p.getText("jh59")) : 3 == o.eRet && c.default.show(p.getText(1455));
}, this);
```
→ 线上口径 = `taskObj: { "<id>": {s,t,lv,aw,c,d?} }` + `num`。

### 2.6 `getItemId()` 与刷新路径
`scripts2.js:28050-28052`（`return this.dataObj.id`）+ `28310-28311`：
`e[n.getItemId()]` 用 id 当对象键做增量刷新 → **id 必须跨请求稳定**。

### 2.7 `state` 语义（从 `onTapReward` 反推）
`scripts2.js:28015-28031`
```js
if (1 == this.dataObj.state) u.default.show(h.getText(1608));           // 纯客户端提示，不发请求
else if (2 == this.dataObj.state) a.EntrustModel.reqDelegateTask(...);  // 派遣/接取
else if (3 == this.dataObj.state) { … reqQuickFinishTask(...) }         // 进行中 → 可花钱快完
else 4 == this.dataObj.state && a.EntrustModel.reqGetDelegateReward(…);  // 领奖
```
`5` = 已完成（`successReward` 置 5，`scripts2.js:28032-28036`）。

---

## 3. 相关配置表（`tools/cfg/dump/`，全部已存在）

| 表 | 行数 | 内容 |
|---|---|---|
| `circle_task.json` | 21 | `_Money/_Exp/_Potential`（cfMon 混淆）+ `low_limit/limit` + `TalkNpc/FightNpc/Item` 三个池 |
| `entrust_task.json` | 4 | `{id:1..4, type, name, describe}`；`type` 与 `id` 同值 |
| `entrust_level.json` | 5 | `{id:1..5, level, ordinary, senior, time(3600..18000), Potential, exp}` |
| `entrust_detailed.json` | 1 | `{time:7200, price:0.1, frist:1000, add:100}` |
| `entrust_open.json` | 5 | `{id:1..5, number:1..5, limit:20000..100000}` → `cNum` 的合法范围是 1..5 |
| `npc.json` / `map.json` | — | `param[0]` 的查表目标 |
| `item.json` | 3000（截断） | `param[1]` 的查表目标；`circle_task.Item` 12 个 id 实测**全是 `Type=1` 装备** |

## 4. `cfMon` 解码复核（21 行 × 3 列全一致）
`真实值 = _value[0] - offset`（`index.js:73908-73915`）；`offset` 逐行随机、**不可硬编码**。
本次 `node tools/gen_shop_tables.js` 输出：`1→{m:125,e:50,p:50}`、`21→{m:2575,e:1030,p:1030}`；
交叉核验 `_actIntv[0]` 与解码值**无一不符**（生成器里保留了这个告警）。

---

## 5. 本次落地内容

| 文件 | 改动 |
|---|---|
| `tools/gen_shop_tables.js` | 新增 `cfMonDecode()`（带 `_actIntv` 交叉核验告警）+ 生成 `BZ_CIRCLE_TASK`（21 档） |
| `hotfix-patch/core/bz-rpc-server.js` | 新增模块级 `circleTier()/circleRows()/circleTaskObj()`；`getCircleTaskList` 改动态投射；`changeDelegateTask` 改同源投射；`quickFinishTask` 加"无奖励表不扣钱"闸 |
| `hotfix-patch/core/bz-shops.generated.js` | 重新生成（70,505 → 87,579 B） |
| `hotfix-patch/test/circle-task.js` | **新增** 11 条，含原故障重现 + 客户端查表重演 |

### 投射出的三行（档位取 `circle_task` 最低段 `low_limit=1`）
```json
[{"id":9001,"state":2,"type":1,"lv":1,"award":[125,50],"param":[]},
 {"id":9002,"state":2,"type":2,"lv":1,"award":[125,50],"param":[1002,1002]},
 {"id":9003,"state":2,"type":3,"lv":1,"award":[125,50],"param":[1004]}]
```

### 验证证据
- `node test/circle-task.js` → **11/11 PASS**
- `node tools/acceptance.js` → **项=41 绿=41**（新增了本测试文件）
- `node tools/check_reject_codes.js` → OK，拒绝点 64→65（新增 1 处闸）
- `node tools/check_shape_freeze.js` → **diff 0**（形状按字段名比，`taskArr` 早已是声明字段，**无需**登记 planned-changes）
- 热重载：`pid 6188 → 6188`（未重启）、`impl h87a9cb11 → hd73e73b9`、`selfCheck 1262` 全过、`implErr=null`
- **设备端真实报文**：构造 AES+LZString 信封走 `H.impl.handle({url,body})` → `User.getCircleTaskList`
  回 `eRet=1 cNum=3 taskArr.length=3`（729 B、10 ms），解码后与上面三行逐字一致
- 存档：改动前后 **1792 B / md5 `0F1430544904E094C1D26CAA98851874` 完全相同**（未被写坏）

---

## 6. 未验证 / 刻意留白（诚实清单）

1. **`getText(35)` 与 `getText(36)` 的语义分不清**（`award[1]` 到底显示"经验"还是"潜能"）——
   游戏文案表不在 dump 里（`languageList.json` 只有 3 行语言清单，见 HANDOVER §5.3），
   **无法判定**。现状：`award=[_Money,_Exp]`。
2. **`TalkNpc` 与 `FightNpc` 两个池分别对应哪种委托**，同样要靠文案才能定；现状：`type 3` 用 `TalkNpc[0..1]`，
   `FightNpc` 池**已进表但未使用**。
3. **档位选择**：角色等级未建模，恒定取最低段（`low_limit=1`，对任何等级都合法）。
4. **奖励发放未接线**（本轮明确不做）：`9001..9003` 不在 `BZ_TASKS` 里，所以
   `circleTaskAward`/`getCircleTaskAward` 对环任务**发不出奖**；`quickFinishTask` 已加闸**不扣钱**。
   → 要做奖励，得决定：给 `BZ_TASKS` 补 9001..9003 的行，还是让 `circleTaskAward` 认 `BZ_CIRCLE_TASK`。
5. **UI 渲染层仍未肉眼验过**（面板是否真能开、三行是否真显示）——需用户开一次任务面板。
   本轮只证到"数据与契约层正确、端到端应答正确"。
